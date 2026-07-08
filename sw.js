// Service worker — offline-capable, but always tries the network first for the app shell
// so pushed updates reach users immediately (fixes "deployed but nothing changed").
const CACHE = 'ledger-capture-v16';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).catch(()=>{}));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  const isShell = e.request.mode === 'navigate' || e.request.url.endsWith('/index.html');
  if (isShell) {
    // network-first: fresh app when online, cached copy when offline
    e.respondWith(
      fetch(e.request).then(r => {
        const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return r;
      }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
  } else {
    // cache-first for static assets (fonts, icons)
    e.respondWith(
      caches.match(e.request).then(r => r || fetch(e.request).catch(()=>caches.match('./index.html')))
    );
  }
});
