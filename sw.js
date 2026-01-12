const CACHE_NAME = 'mugol-v1';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

// 1. Kurulum: Dosyaları önbelleğe al
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// 2. Aktifleştirme: Eski önbellekleri temizle
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// 3. Fetch: İnternet yoksa önbellekten sun
self.addEventListener('fetch', (event) => {
    // API isteklerini her zaman internetten çek, diğerlerini cache'den
    if (event.request.url.includes('api.openweathermap.org')) {
        event.respondWith(fetch(event.request));
    } else {
        event.respondWith(
            caches.match(event.request).then((response) => {
                return response || fetch(event.request);
            })
        );
    }
});

// 4. BİLDİRİM YÖNETİMİ VE TASARIMI
// Ana sayfadan gelen 'NOTIFICATION_TRIGGER' mesajını dinler
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SHOW_WEATHER_NOTIFICATION') {
        const { city, temp, desc, iconChar } = event.data.payload;
        
        // Hava durumuna göre ikon URL'si belirle (Örnek ikonlar)
        let iconUrl = 'https://cdn-icons-png.flaticon.com/512/869/869869.png'; // Güneşli
        if (desc.includes('Bulut')) iconUrl = 'https://cdn-icons-png.flaticon.com/512/1163/1163661.png';
        if (desc.includes('Yağmur')) iconUrl = 'https://cdn-icons-png.flaticon.com/512/1163/1163657.png';
        if (desc.includes('Kar')) iconUrl = 'https://cdn-icons-png.flaticon.com/512/642/642000.png';
        if (desc.includes('Fırtına')) iconUrl = 'https://cdn-icons-png.flaticon.com/512/1146/1146860.png';

        const options = {
            body: `Sıcaklık: ${temp}°C\nDurum: ${desc}\nNem ve Rüzgar normal seviyede.`,
            icon: iconUrl, // Bildirim yanında çıkan büyük resim
            badge: 'https://cdn-icons-png.flaticon.com/512/71/71281.png', // Android üst barındaki küçük ikon
            vibrate: [100, 50, 100], // Titreşim deseni
            tag: 'weather-update', // Üst üste binmemesi için etiket (tek bildirim güncellenir)
            renotify: true, // Tag aynı olsa bile tekrar titret/ses çal
            data: {
                url: './index.html'
            },
            actions: [
                { action: 'refresh', title: '🔄 Yenile' },
                { action: 'open', title: '📱 Uygulamayı Aç' }
            ],
            dir: 'ltr',
            lang: 'tr-TR',
            requireInteraction: true // Kullanıcı kapatana kadar ekranda kalır
        };

        self.registration.showNotification(`${iconChar} ${city} Hava Durumu`, options);
    }
});

// Bildirime tıklanma olayı
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'refresh') {
        // Arka planda yenileme mantığı buraya eklenebilir
        console.log("Bildirimden yenileme istendi.");
    } else {
        // Uygulamayı aç
        event.waitUntil(
            clients.matchAll({ type: 'window' }).then((clientList) => {
                for (const client of clientList) {
                    if (client.url.includes('index.html') && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('./index.html');
                }
            })
        );
    }
});