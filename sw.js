const CACHE = 'kasa-foyu-v4';
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

// Supabase (canlı veri) isteklerine HİÇ dokunmuyoruz.
// Önceki sürümde ağ hatası yakalanıp Supabase'e sahte bir "başarılı" cevap
// ({offline:true}) döndürülüyordu. Supabase kütüphanesi bunu gerçek veri sanıp
// beklenmedik formatta işlemeye çalışınca ilgili işlem sessizce takılı kalıyor —
// ekranın rastgele "kitlenmesi" büyük ihtimalle buradan kaynaklanıyordu.
// Şimdi isteği olduğu gibi tarayıcıya bırakıyoruz; gerçek bir ağ hatası olursa
// uygulama zaten kendi try/catch'i ile düzgün bir hata mesajı gösteriyor.
self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  if (url.includes('supabase.co')) return; // dokunma, tarayıcı kendi halletsin

  // Uygulama dosyaları (index.html, manifest, ikonlar): önce ağdan dene ki
  // güncelleme hemen gelsin — ama yavaş/kesik bağlantıda sonsuza kadar
  // beklemesin diye kısa bir zaman aşımıyla önbelleğe düş.
  e.respondWith(
    Promise.race([
      fetch(e.request).then((res) => {
        const resClone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, resClone));
        return res;
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000))
    ]).catch(() => caches.match(e.request))
  );
});
