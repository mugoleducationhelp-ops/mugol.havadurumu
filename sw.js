// Service Worker - Premium Hava Durumu Bildirimi
console.log('[SW] Service Worker dosyası yüklendi');

const NOTIFICATION_TAG = 'weather-premium';

self.addEventListener('install', (event) => {
    console.log('[SW] Install event - Service Worker yükleniyor');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW] Activate event - Service Worker aktif hale geliyor');
    event.waitUntil(self.clients.claim());
});

// Ana sayfadan mesaj geldiğinde
self.addEventListener('message', async (event) => {
    console.log('[SW] Mesaj alındı:', event.data);
    
    if (event.data && event.data.type === 'SHOW_WEATHER_NOTIFICATION') {
        console.log('[SW] Hava durumu bildirimi gösteriliyor');
        await showWeatherNotification(event.data.data);
    } else if (event.data && event.data.type === 'STOP_NOTIFICATION') {
        console.log('[SW] Bildirim durduruluyor');
        const notifications = await self.registration.getNotifications({ tag: NOTIFICATION_TAG });
        notifications.forEach(notification => notification.close());
    }
});

// Hava durumu bildirimini göster - Premium tasarım
async function showWeatherNotification(data) {
    console.log('[SW] showWeatherNotification çağrıldı, data:', data);
    
    const { city, temp, desc, icon, humidity, wind, pressure, hourly, daily, feelsLike } = data;
    
    // Başlık - Şehir adı
    const title = `${city}`;
    
    // Ana durum bilgisi - Büyük ve belirgin
    const mainStatus = `${icon} ${temp}°\n\nMevcut: ${desc}`;
    
    // Saatlik tahmin - Detaylı (7 saat)
    let hourlyForecast = '\n\n';
    if (hourly && hourly.length > 0) {
        const hourlyItems = hourly.slice(0, 7).map(h => 
            `${h.time}\n${h.icon}\n${h.temp}°`
        );
        hourlyForecast += hourlyItems.join('    ');
    }
    
    // Alt bilgiler - Detaylı
    let detailInfo = '\n\n';
    detailInfo += `━━━━━━━━━━━━━━━━━━━━━━\n`;
    detailInfo += `Max/Min: ${daily && daily.length > 0 ? `${daily[0].max}°/${daily[0].min}°` : '-'}\n`;
    detailInfo += `${icon} Kar/Yağmur: ${hourly && hourly.length > 0 ? hourly[0].precip || '0' : '0'} mm/d\n`;
    
    const bodyText = mainStatus + hourlyForecast + detailInfo;
    
    // Logo ve ikon için SVG
    const logoIcon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2318181b;stop-opacity:1'/%3E%3Cstop offset='100%25' style='stop-color:%232d2d30;stop-opacity:1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='300' rx='60' fill='url(%23bg)'/%3E%3Ccircle cx='80' cy='80' r='40' fill='%233b82f6' opacity='0.6'/%3E%3Ccircle cx='220' cy='220' r='35' fill='%2360a5fa' opacity='0.5'/%3E%3Ctext x='150' y='140' font-size='40' font-weight='700' text-anchor='middle' fill='%23ffffff'%3EMuGöl%3C/text%3E%3Ctext x='150' y='180' font-size='28' text-anchor='middle' fill='%2393c5fd'%3EHava%3C/text%3E%3Ctext x='150' y='240' font-size='80' text-anchor='middle' fill='white'%3E${icon}%3C/text%3E%3C/svg%3E`;
    
    // Bildirim seçenekleri
    const options = {
        body: bodyText,
        icon: logoIcon,
        badge: logoIcon,
        tag: NOTIFICATION_TAG,
        requireInteraction: true,
        silent: true,
        renotify: true,
        vibrate: [200, 100, 200],
        data: {
            city: city,
            temp: temp,
            timestamp: Date.now()
        },
        actions: [
            {
                action: 'details',
                title: '📱 Detay'
            },
            {
                action: 'refresh',
                title: '🔄 Yenile'
            }
        ]
    };

    try {
        console.log('[SW] Eski bildirimler kapatılıyor');
        const notifications = await self.registration.getNotifications({ tag: NOTIFICATION_TAG });
        notifications.forEach(notification => notification.close());
        
        console.log('[SW] Yeni bildirim gösteriliyor:', title);
        await self.registration.showNotification(title, options);
        console.log('[SW] ✅ Bildirim başarıyla gösterildi');
    } catch (error) {
        console.error('[SW] ❌ Bildirim hatası:', error);
    }
}

// Bildirim aksiyonlarına tıklandığında
self.addEventListener('notificationclick', async (event) => {
    console.log('[SW] Bildirime tıklandı, aksiyon:', event.action);
    
    const action = event.action;
    
    if (action === 'refresh') {
        console.log('[SW] Yenile butonuna tıklandı');
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                if (clientList.length > 0) {
                    clientList[0].postMessage({ type: 'REFRESH_WEATHER' });
                    return clientList[0].focus();
                }
                return clients.openWindow('./');
            })
        );
        return;
    }
    
    if (action === 'details') {
        console.log('[SW] Detaylar butonuna tıklandı');
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                if (clientList.length > 0) {
                    return clientList[0].focus();
                }
                return clients.openWindow('./');
            })
        );
        return;
    }
    
    // Varsayılan: Sayfayı aç
    console.log('[SW] Varsayılan aksiyon: Sayfa odaklama');
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            if (clientList.length > 0) {
                return clientList[0].focus();
            }
            return clients.openWindow('./');
        })
    );
});

// Bildirim kapatılmaya çalışıldığında - TEKRAR AÇ!
self.addEventListener('notificationclose', async (event) => {
    console.log('[SW] ⚠️ Bildirim kapatılmaya çalışıldı - tekrar açılıyor!');
    
    event.waitUntil(
        (async () => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
            if (clientList.length > 0) {
                clientList[0].postMessage({ type: 'REOPEN_NOTIFICATION' });
            }
        })()
    );
});

console.log('[SW] ✅ Service Worker başarıyla yüklendi ve hazır');
