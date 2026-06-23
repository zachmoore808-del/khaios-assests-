var CACHE='khaios-v1';
var SHELL=['./','./index.html','./manifest.json','./icon.svg'];
self.addEventListener('install',function(e){self.skipWaiting();e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(SHELL).catch(function(){});}));});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(keys){return Promise.all(keys.map(function(k){if(k!==CACHE)return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('fetch',function(e){
  var req=e.request;
  if(req.method!=='GET')return;
  var url=new URL(req.url);
  if(url.origin!==self.location.origin)return;
  if(req.mode==='navigate'||(req.headers.get('accept')||'').indexOf('text/html')>-1){
    e.respondWith(fetch(req).then(function(res){var copy=res.clone();caches.open(CACHE).then(function(c){c.put('./index.html',copy);});return res;}).catch(function(){return caches.match('./index.html').then(function(r){return r||caches.match('./');});}));
    return;
  }
  e.respondWith(caches.match(req).then(function(cached){return cached||fetch(req).then(function(res){var copy=res.clone();caches.open(CACHE).then(function(c){c.put(req,copy);});return res;}).catch(function(){return cached;});}));
});
