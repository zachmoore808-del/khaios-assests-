// PWA removed — this worker now unregisters itself and clears old caches.
self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){
  e.waitUntil((async function(){
    try{ var keys = await caches.keys(); await Promise.all(keys.map(function(k){ return caches.delete(k); })); }catch(err){}
    try{ await self.registration.unregister(); }catch(err){}
    try{ var cs = await self.clients.matchAll(); cs.forEach(function(c){ try{ c.navigate(c.url); }catch(e){} }); }catch(err){}
  })());
});
self.addEventListener('fetch', function(){ /* no caching */ });
