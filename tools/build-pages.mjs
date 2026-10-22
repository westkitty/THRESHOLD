import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, 'dist');
const source = readFileSync(join(root, 'THRESHOLD.html'), 'utf8');
const manifest = readFileSync(join(root, 'pwa/manifest.webmanifest'), 'utf8');
const bootstrap = readFileSync(join(root, 'pwa/register.js'), 'utf8');
const pwaCss = readFileSync(join(root, 'pwa/install.css'), 'utf8');
const worker = readFileSync(join(root, 'pwa/sw.template.js'), 'utf8');
if (!source.includes('const QUESTIONS=') || !source.includes('const TOPICS=') || !source.includes('</head>') || !source.includes('</body>')) {
  throw Error('Unexpected THRESHOLD source; refusing to publish a partial app.');
}
if (existsSync(out)) rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'icons'), { recursive: true });
const pwaHead = [
  '<link rel="manifest" href="./manifest.webmanifest">',
  '<link rel="stylesheet" href="./pwa.css">',
  '<link rel="icon" type="image/png" sizes="192x192" href="./icons/icon-192.png">',
  '<link rel="apple-touch-icon" sizes="180x180" href="./icons/apple-touch-icon.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
  '<meta name="apple-mobile-web-app-title" content="THRESHOLD">',
  '<meta name="format-detection" content="telephone=no">'
].join('\n');
const withHead = source.replace('</head>', pwaHead + '\n</head>');
const closingBody = withHead.lastIndexOf('</body>');
if(closingBody < 0) throw Error('Missing document body close');
const index = withHead.slice(0,closingBody) +
  '<script src="./pwa.js" defer></script>\n' + withHead.slice(closingBody);
writeFileSync(join(out, 'index.html'), index, 'utf8');
copyFileSync(join(root, 'THRESHOLD.html'), join(out, 'THRESHOLD.html'));
writeFileSync(join(out, 'manifest.webmanifest'), manifest, 'utf8');
writeFileSync(join(out, 'pwa.js'), bootstrap, 'utf8');
writeFileSync(join(out, 'pwa.css'), pwaCss, 'utf8');
writeFileSync(join(out, '.nojekyll'), '', 'utf8');

// Reproducible dependency-free PNG icons: original black/crimson THRESHOLD monogram.
function crc32(data) {
 let c = 0xffffffff;
 for (const b of data) { c ^= b; for (let j=0;j<8;j++) c=(c&1)?0xedb88320^(c>>>1):c>>>1; }
 return (c^0xffffffff)>>>0;
}
function chunk(type, payload) {
 const label=Buffer.from(type),size=Buffer.alloc(4),checksum=Buffer.alloc(4);
 size.writeUInt32BE(payload.length);checksum.writeUInt32BE(crc32(Buffer.concat([label,payload])));
 return Buffer.concat([size,label,payload,checksum]);
}
function icon(size) {
 const raw=Buffer.alloc((size*4+1)*size);
 for(let y=0;y<size;y++){
  const off=y*(size*4+1);raw[off]=0;
  for(let x=0;x<size;x++){
   const nx=(x+.5)/size,ny=(y+.5)/size,dx=nx-.5,dy=ny-.5;
   const glow=Math.max(0,1-Math.hypot(dx,dy)/.78);
   const rim=(nx>.105&&nx<.895&&ny>.105&&ny<.895)
     &&(nx<.125||nx>.875||ny<.125||ny>.875);
   const top=(nx>.27&&nx<.73&&ny>.29&&ny<.41);
   const stalk=(nx>.437&&nx<.563&&ny>.34&&ny<.76);
   const cut=(ny>.69&&ny<.76&&nx>.437&&nx<.48);
   const glyph=(top||stalk)&&!cut;
   const i=off+1+x*4;
   if(glyph){raw[i]=249;raw[i+1]=24;raw[i+2]=67;}
   else if(rim){raw[i]=99;raw[i+1]=26;raw[i+2]=51;}
   else{raw[i]=Math.round(9+16*glow);raw[i+1]=Math.round(5+6*glow);raw[i+2]=Math.round(10+11*glow);}
   raw[i+3]=255;
  }
 }
 const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(size,0);ihdr.writeUInt32BE(size,4);ihdr[8]=8;ihdr[9]=6;
 return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(raw,{level:9})),chunk('IEND',Buffer.alloc(0))]);
}
for (const [filename,size] of [['icon-192.png',192],['icon-512.png',512],['apple-touch-icon.png',180]]) {
 writeFileSync(join(out,'icons',filename),icon(size));
}
const version=createHash('sha256').update(source).update(manifest).update(bootstrap).update(pwaCss).update(worker).digest('hex').slice(0,16);
writeFileSync(join(out,'sw.js'),worker.replaceAll('__SHELL_VERSION__',version),'utf8');
console.log('PAGES_BUILD_OK version='+version+' source_bytes='+Buffer.byteLength(source)+' files=10');
