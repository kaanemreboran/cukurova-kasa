const CACHE = 'kasa-foyu-v2';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
  );
  self.clients.claim();
});

// Supabase: her zaman ağdan (canlı veri).
// Uygulama dosyaları (index.html, manifest, ikonlar): önce AĞDAN dene, güncelleme
// gelsin diye — sadece internet yoksa önbellekten göster (offline yedek).
self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  if (url.includes('supabase.co')) {
    e.respondWith(fetch(e.request).catch(() => new Response(JSON.stringify({ offline: true }), { headers: { 'Content-Type': 'application/json' } })));
    return;
  }
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, resClone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
