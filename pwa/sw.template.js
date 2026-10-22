/* THRESHOLD: app shell only. Never cache form answers, blobs, exports or arbitrary requests. */
'use strict';
const CACHE_PREFIX = 'threshold-shell-';
const CACHE_NAME = CACHE_PREFIX + '__SHELL_VERSION__';
const scope = self.registration.scope;
const paths = ['','index.html','THRESHOLD.html','manifest.webmanifest','pwa.js','pwa.css',
  'icons/icon-192.png','icons/icon-512.png','icons/apple-touch-icon.png'];
const urls = paths.map(path => new URL(path,scope).href);
const allowed = new Set(urls.map(href => new URL(href).pathname));
self.addEventListener('install', event => {
 event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(urls))
   .then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
 event.waitUntil((async () => {
  const names = await caches.keys();
  await Promise.all(names.filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
    .map(name => caches.delete(name)));
  await self.clients.claim();
 })());
});
self.addEventListener('fetch', event => {
 const req = event.request, url = new URL(req.url);
 if(req.method !== 'GET' || url.origin !== self.location.origin || !allowed.has(url.pathname)) return;
 if(req.mode === 'navigate'){
  event.respondWith((async () => {
   try {
    const response=await fetch(req);if(response.ok)return response;
   }catch(_error){/* offline: use known-good app shell */}
   const cache=await caches.open(CACHE_NAME);
   const fallback=url.pathname.endsWith('/THRESHOLD.html')?'THRESHOLD.html':'index.html';
   return (await cache.match(new URL(fallback,scope).href)) ||
     new Response('THRESHOLD is not cached yet. Reconnect once to install it.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
  })());
  return;
 }
 // Immutable publication assets: do not cache unknown URLs or user data.
 event.respondWith((async () => {
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(new URL(url.pathname,self.location.origin).href);
  return cached || fetch(req);
 })());
});
