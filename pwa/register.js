/* Install UX is optional. The questionnaire remains operational without PWA APIs. */
(() => {
 'use strict';
 if (!('serviceWorker' in navigator) || !window.isSecureContext) return;
 const standalone=() => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
 const isiOS=/(iPhone|iPad|iPod)/i.test(navigator.userAgent) ||
   (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1);
 let deferred=null,rail=null;
 const makeRail=() => {
  if(standalone()||rail) return;
  rail=document.createElement('aside');
  rail.className='pwa-install-rail';rail.setAttribute('aria-label','Install THRESHOLD');
  rail.innerHTML='<div class="pwa-install-caption"><strong>THRESHOLD ON YOUR DEVICE</strong><span id="pwaInstallHelp"></span></div>' +
   '<button id="pwaInstallAction" type="button">INSTALL APP ↗</button>' +
   '<button id="pwaInstallDismiss" type="button" aria-label="Hide install help">✕</button>';
  const footer=document.querySelector('.site-footer');
  (footer||document.body).after(rail);
  const message=rail.querySelector('#pwaInstallHelp');
  message.textContent=isiOS ?
   'Safari: Share → Add to Home Screen → Open as Web App. Reopen after the first visit to use it offline.' :
   'Use your browser’s install option for a Home Screen shortcut with offline access.';
  rail.querySelector('#pwaInstallAction').addEventListener('click',async()=>{
   if(!deferred){message.textContent=isiOS?
    'Tap Share in Safari, select Add to Home Screen, enable Open as Web App, then tap Add.' :
    'In the browser menu choose Install App or Add to Home Screen.';return;}
   const prompt=deferred;deferred=null;
   try{await prompt.prompt();await prompt.userChoice;}catch(_error){}
  });
  rail.querySelector('#pwaInstallDismiss').addEventListener('click',()=>{rail.remove();rail=null;try{sessionStorage.setItem('threshold.install.dismissed','1')}catch(_error){}});
 };
 window.addEventListener('beforeinstallprompt',event=>{
  event.preventDefault();deferred=event;makeRail();
 });
 window.addEventListener('appinstalled',()=>{deferred=null;rail?.remove();rail=null});
 window.addEventListener('load',async()=>{
  if(!standalone()&&isiOS){let dismissed=false;try{dismissed=sessionStorage.getItem('threshold.install.dismissed')==='1'}catch(_error){}
   if(!dismissed)makeRail();}
  const hadController=!!navigator.serviceWorker.controller;
  try{
   const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'});
   // Detect updates but never reload while somebody is answering.
   if(hadController){
    let noticeShown=false;
    navigator.serviceWorker.addEventListener('controllerchange',()=>{
     if(noticeShown)return;noticeShown=true;
     const foot=document.querySelector('.site-footer');
     const notice=document.createElement('p');notice.className='pwa-update-note';
     notice.textContent='THRESHOLD updated. Export a backup if needed, then reopen the app to use the newest version.';
     (foot||document.body).after(notice);
    });
   }
   void registration.update().catch(()=>{});
  }catch(_error){/* HTTPS access still works as a normal webpage. */}
 });
})();
