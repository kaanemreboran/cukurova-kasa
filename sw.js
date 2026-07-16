const CACHE = 'kasa-foyu-v5';
const SHELL = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './cukurova-logo.png'];

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

// SADECE kendi site dosyalarımıza (aynı origin, GET istekleri) karışıyoruz.
// Supabase, Chart.js, Supabase-JS gibi TÜM dış/CDN istekleri service worker'a
// hiç uğramadan doğrudan tarayıcıya bırakılıyor. Önceki sürümde bu istekleri
// de yönetmeye çalışmak — özellikle önbellek boşken (site verisi temizlendiğinde
// veya ilk kurulumda) — sayfayı tamamen kilitleyen hatalara yol açıyordu.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  let url;
  try { url = new URL(req.url); } catch(err) { return; }

  const isSameOrigin = url.origin === self.location.origin;
  if (req.method !== 'GET' || !isSameOrigin) return; // dokunma, tarayıcı kendi halletsin

  e.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE).then((c) => c.put(req, resClone));
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const fallback = await caches.match('./index.html');
        if (fallback) return fallback;
        return Response.error(); // asla undefined döndürme — tarayıcı çöker
      })
  );
});
