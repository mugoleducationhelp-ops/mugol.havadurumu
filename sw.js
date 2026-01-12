const CACHE_NAME = 'mugol-weather-v2'; // Versiyon numarası
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './logo.png', // Sizin logonuzun önbelleğe alınması şart
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

// 1. KURULUM (INSTALL): Dosyaları önbelleğe al
self.addEventListener('install', (event) => {
    console.log('[Service Worker] Kuruluyor...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Dosyalar önbelleğe alınıyor');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

// 2. AKTİVASYON (ACTIVATE): Eski önbellekleri temizle
self.addEventListener('activate', (event) => {
    console.log('[Service Worker] Aktif ediliyor...');
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('[Service Worker] Eski önbellek silindi:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});

// 3. VERİ ÇEKME (FETCH): İnternet yoksa önbellekten göster
self.addEventListener('fetch', (event) => {
    // API isteklerini önbelleğe alma (hava durumu hep güncel olmalı)
    if (event.request.url.includes('api.openweathermap.org') || event.request.url.includes('nominatim')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            // Önbellekte varsa döndür, yoksa internetten çek
            return response || fetch(event.request).catch(() => {
                // İnternet de yoksa ve resim isteniyorsa (opsiyonel fallback eklenebilir)
                // Şimdilik sadece ana dosyaları döndürüyoruz.
            });
        })
    );
});

// 4. BİLDİRİM YÖNETİMİ (MESSAGE): index.html'den gelen veriyi işle
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_WEATHER_NOTIFICATION') {
        const { city, temp, desc, iconChar } = event.data.payload;

        // Bildirim Ayarları
        const options = {
            body: `${temp}°C - ${desc}\nUygulamayı açmak için dokunun.`,
            icon: './logo.png', // GÜNCELLEME: Sizin yüklediğiniz logo
            badge: './logo.png', // Android durum çubuğu için (küçük ikon)
            vibrate: [100, 50, 100], // Titreşim deseni
            tag: 'weather-notification', // Aynı bildirimi üst üste yığmamak için
            renotify: true, // Tag aynı olsa bile tekrar titret/ses çıkar
            data: {
                url: './index.html' // Tıklanınca açılacak sayfa
            }
        };

        event.waitUntil(
            self.registration.showNotification(`${iconChar} ${city}`, options)
        );
    }
});

// 5. BİLDİRİME TIKLAMA
self.addEventListener('notificationclick', (event) => {
    event.notification.close(); // Bildirimi kapat

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Eğer uygulama zaten açıksa ona odaklan
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            // Kapalıysa yeni pencere aç
            return clients.openWindow('./index.html');
        })
    );
});