// Service Worker - Hava Durumu Bildirimi
console.log('[SW] Service Worker dosyası yüklendi');

const NOTIFICATION_TAG = 'weather-persistent';

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
    } else if (event.data && event.data.type === 'CLOSE_NOTIFICATION') {
        console.log('[SW] Bildirim kapatılıyor');
        const notifications = await self.registration.getNotifications({ tag: NOTIFICATION_TAG });
        notifications.forEach(notification => notification.close());
    }
});

// Hava durumu bildirimini göster
async function showWeatherNotification(data) {
    console.log('[SW] showWeatherNotification çağrıldı, data:', data);
    
    const { city, temp, desc, icon, humidity, wind, hourly, daily } = data;
    
    // Saatlik tahmin özeti (sonraki 3 saat)
    let hourlyText = '';
    if (hourly && hourly.length > 0) {
        hourlyText = '\n\n📊 Saatlik:\n';
        hourly.slice(0, 3).forEach(h => {
            hourlyText += `${h.time}: ${h.icon} ${h.temp}°C  `;
        });
    }
    
    // Günlük tahmin özeti (bugün ve yarın)
    let dailyText = '';
    if (daily && daily.length > 0) {
        dailyText = '\n\n📅 Günlük:\n';
        daily.slice(0, 2).forEach(d => {
            dailyText += `${d.date}: ${d.icon} ${d.max}°/${d.min}°C\n`;
        });
    }
    
    const bodyText = `🌡️ ${temp}°C - ${desc}\n💧 Nem: ${humidity}% | 💨 ${wind} km/s${hourlyText}${dailyText}`;
    
    const options = {
        body: bodyText,
        icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect width="100" height="100" rx="20" fill="%233b82f6"/%3E%3Ctext x="50" y="70" font-size="60" text-anchor="middle" fill="white"%3E' + icon + '%3C/text%3E%3C/svg%3E',
        tag: NOTIFICATION_TAG,
        requireInteraction: true,
        silent: true,
        renotify: true,
        data: {
            city: city,
            temp: temp,
            timestamp: Date.now()
        },
        actions: [
            {
                action: 'hourly',
                title: '📊 Saatlik'
            },
            {
                action: 'daily',
                title: '📅 Günlük'
            },
            {
                action: 'refresh',
                title: '🔄 Yenile'
            },
            {
                action: 'close',
                title: '✖️ Kapat'
            }
        ]
    };

    try {
        console.log('[SW] Eski bildirimler kapatılıyor');
        const notifications = await self.registration.getNotifications({ tag: NOTIFICATION_TAG });
        notifications.forEach(notification => notification.close());
        
        console.log('[SW] Yeni bildirim gösteriliyor:', `${icon} ${city}`);
        await self.registration.showNotification(`${icon} ${city}`, options);
        console.log('[SW] ✅ Bildirim başarıyla gösterildi');
    } catch (error) {
        console.error('[SW] ❌ Bildirim hatası:', error);
    }
}

// Bildirim aksiyonlarına tıklandığında
self.addEventListener('notificationclick', async (event) => {
    console.log('[SW] Bildirime tıklandı, aksiyon:', event.action);
    event.notification.close();
    
    const action = event.action;
    
    if (action === 'close') {
        console.log('[SW] Kapat butonuna tıklandı');
        return;
    }
    
    if (action === 'refresh') {
        console.log('[SW] Yenile butonuna tıklandı');
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                if (clientList.length > 0) {
                    clientList[0].postMessage({ type: 'REFRESH_WEATHER' });
                    return clientList[0].focus();
                }
                return clients.openWindow('/');
            })
        );
        return;
    }
    
    if (action === 'hourly' || action === 'daily') {
        console.log('[SW] Tahmin butonuna tıklandı:', action);
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                if (clientList.length > 0) {
                    clientList[0].postMessage({ type: 'SCROLL_TO', section: action });
                    return clientList[0].focus();
                }
                return clients.openWindow('/');
            })
        );
        return;
    }
    
    // Varsayılan: Sayfayı aç/odakla
    console.log('[SW] Varsayılan aksiyon: Sayfa odaklama');
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            if (clientList.length > 0) {
                return clientList[0].focus();
            }
            return clients.openWindow('/');
        })
    );
});

// Bildirim kapatıldığında
self.addEventListener('notificationclose', (event) => {
    console.log('[SW] Bildirim kullanıcı tarafından kapatıldı');
});

console.log('[SW] ✅ Service Worker başarıyla yüklendi ve hazır');
