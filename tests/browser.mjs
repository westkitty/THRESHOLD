import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdtempSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),port=Number(process.env.THRESHOLD_PORT||9347),delay=ms=>new Promise(r=>setTimeout(r,ms));
const browser=process.env.CHROME_BIN||['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/chromium','/usr/bin/google-chrome'].find(existsSync);
if(!browser){console.error('Chrome/Chromium not found. Set CHROME_BIN to a browser executable.');process.exit(2)}
const tempProfile=mkdtempSync(join(tmpdir(),'threshold-cdp-'));
const chrome=spawn(browser,['--headless=new','--no-first-run','--disable-background-networking','--remote-allow-origins=*','--remote-debugging-port='+port,'--user-data-dir='+tempProfile,pathToFileURL(join(root,'THRESHOLD.html')).href],{stdio:'ignore'});
let ws,seq=0;const pending=new Map(),errs=[],net=[];
function check(name,good){if(!good)throw Error('FAIL: '+name);console.log('PASS '+name)}
function send(method,params={}){return new Promise((resolve,reject)=>{const id=++seq;pending.set(id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));setTimeout(()=>{if(pending.has(id)){pending.delete(id);reject(Error('CDP timeout '+method))}},15000)})}
async function js(expression){const d=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true,userGesture:true});if(d.exceptionDetails)throw Error('JS exception '+d.exceptionDetails.text);return d.result.value}
async function click(selector){return js('(()=>{const x=document.querySelector('+JSON.stringify(selector)+');if(!x)return false;x.click();return true})()')}
async function screenshot(name){const r=await send('Page.captureScreenshot',{format:'jpeg',quality:56,captureBeyondViewport:false});writeFileSync('/tmp/'+name+'.jpg',Buffer.from(r.data,'base64'))}
async function main(){
 let pages=[];
 for(let i=0;i<50;i++){try{pages=await (await fetch('http://127.0.0.1:'+port+'/json')).json();if(pages.some(x=>x.type==='page'))break}catch{}await delay(200)}
 const page=pages.find(x=>x.type==='page');if(!page)throw Error('CDP page unavailable');
 ws=new WebSocket(page.webSocketDebuggerUrl);
 ws.onmessage=event=>{const d=JSON.parse(event.data);if(d.id){const p=pending.get(d.id);if(p){pending.delete(d.id);d.error?p.reject(Error(d.error.message)):p.resolve(d.result)}}if(d.method==='Runtime.exceptionThrown')errs.push(d.params.exceptionDetails.text);if(d.method==='Network.requestWillBeSent')net.push(d.params.request.url)};
 await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j});
 await send('Runtime.enable');await send('Page.enable');await send('Network.enable');await delay(350);
 check('local HTML loads',await js('location.protocol==="file:"&&document.readyState==="complete"'));
 check('25 questions, 50 topics',await js('QUESTIONS.length===25&&TOPICS.length===50'));
 check('first round entry',await click('[data-action="start"]')&&await click('[data-action="enter-round"]')&&await js('state.current===1'));
 await js('(()=>{const t=document.querySelector("#answerText");t.value="First line\\nSecond & <line>";t.dispatchEvent(new Event("input",{bubbles:true}));const r=document.querySelector("[data-scale-key=BEFORE]");r.value=8;r.dispatchEvent(new Event("input",{bubbles:true}));return true})()');
 check('text and scale stored',await js('state.answers[1].text==="First line\\nSecond & <line>"&&state.answers[1].values.BEFORE===8'));
 await click('[data-action=next]');await click('[data-action=back]');
 check('back/next preserves state',await js('state.current===1&&document.querySelector("#answerText").value==="First line\\nSecond & <line>"'));
 const source=readFileSync(root+'/PROMPT.md','utf8').split('---- BEGIN ORIGINAL USER BRIEF ----')[1].split('---- END ORIGINAL USER BRIEF ----')[0];
 const expected=[...source.matchAll(/^([0-9]{1,2})\) (.*)$/gm)].map(m=>m[2]);
 check('source has 25 questions',expected.length===25);
 for(let i=1;i<=25;i++){
  const x=await js('(()=>{state.view="question";state.current='+i+';render();return {text:document.querySelector("#activeQuestion").textContent,field:!!document.querySelector("#answerText"),control:!!document.querySelector(".instrument")}})()');
  check('question '+i+' exact and usable',x.text===expected[i-1]&&x.field&&x.control);
 }
 check('50 cards with classifications',await js('document.querySelectorAll(".limit-card").length===50&&document.querySelector(".topic-status").options.length===8'));
 await js('(()=>{let x=document.querySelector("[data-topic-status=L01]");x.value="HARD LIMIT";x.dispatchEvent(new Event("change",{bubbles:true}));x=document.querySelector("[data-topic-note=L01]");x.value="Note line\\nsecond line";x.dispatchEvent(new Event("input",{bubbles:true}));return true})()');
 check('limit classification and notes persist',await js('state.limits.L01.status==="HARD LIMIT"&&state.limits.L01.note.includes("second line")'));
 await js('(()=>{let x=document.querySelector("#limitSearch");x.value="captivity";x.dispatchEvent(new Event("input",{bubbles:true}));return true})()');
 check('search filters topics',await js('document.querySelectorAll(".limit-card").length===1'));
 await js('(()=>{let x=document.querySelector("#limitSearch");x.value="";x.dispatchEvent(new Event("input",{bubbles:true}));x=document.querySelector("#newLimit");x.value="My private addition";document.querySelector("[data-action=add-custom]").click();return true})()');
 check('custom topic added',await js('state.custom.length===1&&document.querySelectorAll(".limit-card").length===51'));
 await js('(()=>{document.querySelector("[data-action=edit-custom]").click();document.querySelector("[id^=editName-]").value="My renamed addition";document.querySelector("[data-action=save-custom]").click();return true})()');
 check('custom topic can be renamed',await js('state.custom[0].name==="My renamed addition"'));
 await js('(()=>{let s=document.querySelector("#limitFilter");s.value="HARD LIMIT";s.dispatchEvent(new Event("change",{bubbles:true}));return true})()');
 check('classification filter works',await js('document.querySelectorAll(".limit-card").length===1'));
 await js('(()=>{let s=document.querySelector("#limitFilter");s.value="ALL";s.dispatchEvent(new Event("change",{bubbles:true}));return true})()');
 await js('(()=>{document.querySelector("#newLimit").value="Temporary topic";document.querySelector("[data-action=add-custom]").click();window.confirm=()=>true;const all=document.querySelectorAll("[data-action=remove-custom]");all[all.length-1].click();return true})()');
 check('custom topic deletion works',await js('state.custom.length===1&&state.custom[0].name==="My renamed addition"'));
 check('full TXT and JSON data export',await js('exportText().includes("First line\\nSecond & <line>")&&exportText().includes("My renamed addition")&&exportText().includes("HARD LIMIT")&&exportObject().rounds.reduce((n,r)=>n+r.questions.length,0)===25&&exportObject().limits.predefined.length===50'));
 await click('[data-action=next]');
 check('review contains 25 questions and 51 limits',await js('state.view==="review"&&document.querySelectorAll(".review-item").length===25&&document.querySelectorAll(".review-limit-row").length===51'));
 check('export preview includes multiline text',await js('document.querySelector("#exportPreview").value.includes("First line\\nSecond & <line>")'));
 await js('(()=>{window.__downloads=[];HTMLAnchorElement.prototype.click=function(){window.__downloads.push(this.download)};return true})()');
 await click('[data-action=download-txt]');await click('[data-action=download-json]');
 check('TXT and JSON download controls work',await js('window.__downloads.includes("THRESHOLD_responses.txt")&&window.__downloads.includes("THRESHOLD_responses.json")'));
 await click('[data-action=copy]');await delay(250);
 check('copy action provides result or manual fallback',await js('document.querySelector("#copyDialog").open||document.querySelector("#toast").textContent.includes("COPIED")'));
 if(await js('document.querySelector("#copyDialog").open'))await click('[data-action=close-copy]');
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
 await js('state.view="intro";render()');await delay(180);await screenshot('threshold-desktop-cover');
 await js('state.view="question";state.current=9;render()');await delay(180);await screenshot('threshold-desktop-question');
 await js('state.view="review";render()');await delay(180);await screenshot('threshold-desktop');
 await send('Emulation.setDeviceMetricsOverride',{width:360,height:780,deviceScaleFactor:2,mobile:true});await delay(200);
 check('360px review without overflow',await js('document.documentElement.scrollWidth<=visualViewport.width+2'));
 await screenshot('threshold-mobile-review');
 await click('[data-action=back]');
 check('360px limits without overflow',await js('state.current===25&&document.documentElement.scrollWidth<=visualViewport.width+2'));
 console.log('MOBILE-LAYOUT',JSON.stringify(await js('(()=>{const ss=[".question-body",".q-heading",".instrument",".workbench",".rail",".limit-toolbar",".limit-stats"].map(s=>{let e=document.querySelector(s),b=e?.getBoundingClientRect();return {selector:s,x:b?.x,right:b?.right,width:b?.width,scroll:e?.scrollWidth,client:e?.clientWidth,font:e?getComputedStyle(e).fontSize:null}});return {inner:innerWidth,visual:visualViewport.width,screen:document.documentElement.scrollWidth,rects:ss}})()')));
 await screenshot('threshold-mobile-limits');
 await js('(()=>{const e=document.querySelector("#limitScroll");window.scrollTo(0,scrollY+e.getBoundingClientRect().top-110);e.scrollTop=120;return true})()');
 await delay(150);await screenshot('threshold-mobile-limits-cards');
 await send('Emulation.setDeviceMetricsOverride',{width:320,height:760,deviceScaleFactor:2,mobile:true});await delay(200);
 check('320px limits without overflow',await js('document.documentElement.scrollWidth<=visualViewport.width+2'));
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 check('reduced motion works',await js('matchMedia("(prefers-reduced-motion: reduce)").matches&&parseFloat(getComputedStyle(document.querySelector(".stage-enter")).animationDuration)<0.01'));
 await js('state.view="intro";render()');
 check('320px cover without overflow',await js('document.documentElement.scrollWidth<=visualViewport.width+2'));
 await screenshot('threshold-mobile-cover');
 await js('state.view="question";state.current=1;render()');
 await click('#saveToggle');
 check('opt-in storage enabled',await js('state.autosave===true&&!!localStorage.getItem("threshold.session.1")'));
 await send('Page.reload',{ignoreCache:true});await delay(550);
 check('opt-in autosave survives reload',await js('state.answers[1].text==="First line\\nSecond & <line>"&&state.autosave===true'));
 await js('window.__portable=JSON.stringify(exportObject());state.answers={};state.limits={};state.custom=[];state.view="intro";render()');
 await click('[data-action=session-open]');
 await screenshot('threshold-session-index');
 check('session index opens with all 25 shortcuts',await js('document.querySelector("#sessionDialog").open&&document.querySelectorAll(".session-jump").length===25'));
 await click('[data-action=import-open]');
 check('session index opens local restore',await js('document.querySelector("#importDialog").open&&!document.querySelector("#sessionDialog").open'));
 await js('(()=>{const f=new File(["{bad json"],"bad.json",{type:"application/json"});const d=new DataTransfer();d.items.add(f);const el=document.querySelector("#importFile");el.files=d.files;el.dispatchEvent(new Event("change",{bubbles:true}));return true})()');
 await delay(120);
 check('invalid JSON does not overwrite answers',await js('document.querySelector("#importApply").disabled&&Object.keys(state.answers).length===0'));
 await js('(()=>{const d=JSON.parse(window.__portable);d.rounds[0].questions[0].question="Modified";const f=new File([JSON.stringify(d)],"tampered.json",{type:"application/json"});const dt=new DataTransfer();dt.items.add(f);const el=document.querySelector("#importFile");el.files=dt.files;el.dispatchEvent(new Event("change",{bubbles:true}));return true})()');
 await delay(120);
 check('altered original question rejected',await js('document.querySelector("#importApply").disabled&&document.querySelector("#importMessage").textContent.includes("question 1")'));
 check('legacy category-free custom topics import',await js('(()=>{const d=JSON.parse(window.__portable);delete d.limits.custom[0].category;return !!validatePortableJSON(d).custom.length})()'));
 check('new exports include a custom category',await js('exportObject().limits.custom.every(c=>c.category==="CUSTOM")'));
 await js('(()=>{const f=new File([window.__portable],"valid.json",{type:"application/json"});const d=new DataTransfer();d.items.add(f);const el=document.querySelector("#importFile");el.files=d.files;el.dispatchEvent(new Event("change",{bubbles:true}));return true})()');
 await delay(150);
 await screenshot('threshold-import-dialog');
 check('valid JSON preview prepared',await js('!document.querySelector("#importApply").disabled&&document.querySelector("#importDetails").textContent.includes("50 PRESET LIMITS")'));
 await click('[data-action=import-apply]');
 check('session content restored',await js('state.answers[1].text==="First line\\nSecond & <line>"&&state.limits.L01.status==="HARD LIMIT"&&state.custom[0].name==="My renamed addition"&&state.view==="intro"'));
 await click('[data-action=session-open]');
 await click('[data-action=session-jump][data-q="17"]');
 check('session jump goes directly to question',await js('state.view==="question"&&state.current===17&&!document.querySelector("#sessionDialog").open'));
 await js('state.view="review";render()');
 await click('[data-action=review-filter][data-filter="OPEN"]');
 await screenshot('threshold-review-filter');
 check('open-only review filter',await js('[...document.querySelectorAll("[data-review-item]")].filter(x=>!x.hidden).length===23'));
 await click('[data-action=review-first-open]');
 check('review jump finds next unanswered question',await js('state.view==="question"&&state.current===2'));
 await click('[data-action=session-open]');
 await send('Emulation.setDeviceMetricsOverride',{width:320,height:760,deviceScaleFactor:2,mobile:true});await delay(160);
 await screenshot('threshold-mobile-session');
 check('session panel fits a narrow mobile viewport',await js('document.documentElement.scrollWidth<=visualViewport.width+2&&document.querySelector("#sessionDialog").getBoundingClientRect().width<=visualViewport.width+2'));
 await click('[data-action=session-close]');

 await js('(()=>{state.view="question";state.current=2;render();const t=document.querySelector("#answerText");t.value="<img src=x onerror=window.__injected=true>";t.dispatchEvent(new Event("input",{bubbles:true}));navigate(3);navigate(2);return true})()');
 check('typed HTML remains inert text',await js('!window.__injected&&document.querySelector("#answerText").value.startsWith("<img")'));
 await js('state.view="review";render()');await click('[data-action=reset-open]');await click('[data-action=confirm-reset]');
 check('clear all removes answers and limits',await js('state.view==="intro"&&Object.keys(state.answers).length===0&&Object.keys(state.limits).length===0&&state.custom.length===0'));
 check('zero unhandled browser errors',errs.length===0);
 check('no external requests',net.every(x=>x.startsWith('file:')||x.startsWith('data:')));
 console.log('ALL CHECKS PASSED / screens: /tmp/threshold-{desktop,mobile-review,mobile-limits,mobile-cover}.jpg');
}
try{await main()}catch(e){console.error(e.stack||String(e));process.exitCode=1}
finally{if(ws)ws.close();chrome.kill('SIGTERM')}
