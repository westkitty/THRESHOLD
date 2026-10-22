import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const dir=join(root,'dist');
const read=(path)=>readFileSync(join(dir,path),'utf8');
const source=readFileSync(join(root,'THRESHOLD.html'),'utf8');
const index=read('index.html'),canonical=read('THRESHOLD.html');
assert.equal(canonical,source,'Offline source must remain a bit-for-bit complete copy');
const embedded=html=>html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(embedded(source),'Canonical app script missing');
assert.ok(embedded(index)===embedded(source),'Pages must not change the questionnaire engine');
assert.match(index,/<link rel="manifest" href="\.\/manifest\.webmanifest">/);
assert.match(index,/<meta name="apple-mobile-web-app-capable" content="yes">/);
assert.match(index,/<link rel="apple-touch-icon"/);
assert.match(index,/<script src="\.\/pwa\.js" defer><\/script>/);
for(const original of ['const QUESTIONS=','const TOPICS=','function buildStandaloneDossier()','function exportBrief()','async function sealSession(','data-action="reset-backup"']){
 assert.ok(index.includes(original),'Protected feature missing: '+original);
}
const manifest=JSON.parse(read('manifest.webmanifest'));
assert.equal(manifest.display,'standalone');
assert.equal(manifest.start_url,'./');
assert.equal(manifest.scope,'./');
assert.equal(manifest.id,'./');
assert.equal(manifest.icons.length,2);
for (const [file,size] of [['icons/icon-192.png',192],['icons/icon-512.png',512],['icons/apple-touch-icon.png',180]]){
 const b=readFileSync(join(dir,file));
 assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a','PNG signature');
 assert.equal(b.readUInt32BE(16),size,file+' width');
 assert.equal(b.readUInt32BE(20),size,file+' height');
}
assert.ok(existsSync(join(dir,'.nojekyll')));
const expected=['.nojekyll','THRESHOLD.html','index.html','manifest.webmanifest','pwa.css','pwa.js','sw.js','icons'];
assert.deepEqual(readdirSync(dir).sort(),expected.sort(),'Only blank application assets may be published');
const script=read('sw.js');
assert.doesNotMatch(script,/__SHELL_VERSION__/);
assert.match(script,/const CACHE_NAME = CACHE_PREFIX \+ '[a-f0-9]{16}'/);
assert.doesNotMatch(script,/localStorage|indexedDB|sessionStorage|POST\W|response.*answers/i,'SW cannot persist answers');
assert.match(read('pwa.js'),/beforeinstallprompt/);
assert.match(read('pwa.js'),/controllerchange/);
assert.doesNotMatch(read('pwa.js'),/location\.reload\s*\(/,'Update must not destroy unsaved session');

const scope='https://westkitty.github.io/THRESHOLD/';
const handlers=new Map(), stores=new Map();
let network=true,claimed=0;
const offlineText=new Map();
for (const path of ['','index.html','THRESHOLD.html','manifest.webmanifest','pwa.js','pwa.css','icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png']) {
 offlineText.set(new URL(path,scope).href,path==='index.html'||path===''?'INDEX_READY':'ASSET_'+path);
}
const cacheFactory=name=>({
 async addAll(urls){
  if(!network)throw Error('Network unavailable during install');
  for(const url of urls){if(!offlineText.has(url))throw Error('Unexpected URL cached: '+url);stores.get(name).set(url,new Response(offlineText.get(url)))}
 },
 async match(url){return stores.get(name).get(url)?.clone()||null}
});
const caches={
 async open(name){if(!stores.has(name))stores.set(name,new Map());return cacheFactory(name)},
 async keys(){return [...stores.keys()]},
 async delete(name){return stores.delete(name)}
};
const self={
 registration:{scope},
 location:{origin:new URL(scope).origin},
 clients:{async claim(){claimed++}},
 async skipWaiting(){return true},
 addEventListener(name,fn){handlers.set(name,fn)}
};
runInNewContext(script,{self,caches,fetch:async(req)=>{
 if(!network)throw Error('offline');
 const url=typeof req==='string'?req:req.url;
 return new Response(offlineText.get(url)||'ONLINE');
},URL,Response,Promise});
async function dispatchLifecycle(type){
 let task;handlers.get(type)({waitUntil(promise){task=promise}});
 await task;
}
await dispatchLifecycle('install');
assert.equal(stores.size,1,'Install should create one shell cache');
const only=stores.values().next().value;
assert.equal(only.size,9,'Cache contains only nine non-response URLs');
stores.set('threshold-shell-deprecated',new Map([['old','stale']]));
stores.set('another-project',new Map([['other','preserved']]));
await dispatchLifecycle('activate');
assert.equal(claimed,1);
assert.ok(!stores.has('threshold-shell-deprecated'),'Only old THRESHOLD cache removed');
assert.ok(stores.has('another-project'),'Other origin-shared caches remain untouched');
async function fetchThrough(url,mode='navigate',method='GET'){
 let task;
 handlers.get('fetch')({request:{url,mode,method},respondWith(promise){task=promise}});
 return task ? await task : undefined;
}
network=false;
assert.equal(await (await fetchThrough(scope)).text(),'INDEX_READY','Offline root navigation');
assert.equal(await (await fetchThrough(scope+'index.html')).text(),'INDEX_READY','Offline index');
assert.equal(await (await fetchThrough(scope+'THRESHOLD.html')).text(),'ASSET_THRESHOLD.html'.replace('THRESHOLD','THRESHOLD'),'Offline standalone');
assert.ok(await fetchThrough(scope+'manifest.webmanifest','same-origin'),'Manifest available offline');
assert.equal(await fetchThrough(scope+'not-a-shell-file.json','same-origin'),undefined,'Never cache arbitrary files');
assert.equal(await fetchThrough(scope+'record.json','same-origin','POST'),undefined,'Never intercept response upload');
assert.equal(await fetchThrough('https://example.com/data','navigate'),undefined,'Never intercept other origins');
network=true;
assert.equal(await (await fetchThrough(scope)).text(),'INDEX_READY','Online navigation uses network when available');
console.log('PWA_PASS: exact app-engine parity, nine whitelisted assets, icons, install metadata, offline navigation, update lifecycle, no response caching');
