// The Wine Reference service worker: lets the site be installed as an app and keeps pages already
// visited working offline. Pages are fetched fresh when online (network first), so updates appear at once.
const CACHE = 'wr-v1';
const CORE = ['./', 'index.html', 'manifest.webmanifest', 'assets/icon-192.png', 'assets/icon-512.png', 'assets/pages.css'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
  if (r.mode === 'navigate' || r.destination === 'document') {
    e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); return res; })
      .catch(() => caches.match(r).then(m => m || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(r).then(m => {
    const net = fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(CACHE).then(c => c.put(r, cp)); } return res; }).catch(() => m);
    return m || net;
  }));
});
