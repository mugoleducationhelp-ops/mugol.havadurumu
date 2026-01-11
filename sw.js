// Service Worker - Gelişmiş Kalıcı Bildirim
const CACHE_NAME = 'mugol-hava-v1';
const NOTIFICATION_TAG = 'weather-persistent';

self.addEventListener('install', (event) => {
    console.log('Service Worker yüklendi');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Service Worker aktif');
    event.waitUntil(self.clients.claim());
});

// Ana sayfadan mesaj geldiğinde
self.addEventListener('message', async (event) => {
    if (event.data && event.data.type === 'SHOW_WEATHER_NOTIFICATION') {
        await showWeatherNotification(event.data.data);
    } else if (event.data && event.data.type === 'CLOSE_NOTIFICATION') {
        const notifications = await self.registration.getNotifications({ tag: NOTIFICATION_TAG });
        notifications.forEach(notification => notification.close());
    }
});

// Hava durumu bildirimini göster
async function showWeatherNotification(data) {
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
    
    const options = {
        body: `🌡️ ${temp}°C - ${desc}\n💧 Nem: ${humidity}% | 💨 ${wind} km/s${hourlyText}${dailyText}`,
        icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="20" fill="%233b82f6"/><text x="50" y="70" font-size="60" text-anchor="middle" fill="white">' + encodeURIComponent(icon) + '</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%233b82f6"/><text x="50" y="70" font-size="50" text-anchor="middle" fill="white">' + encodeURIComponent(icon) + '</text></svg>',
        tag: NOTIFICATION_TAG,
        requireInteraction: true,
        silent: true,
        renotify: true,
        vibrate: [200, 100, 200],
        data: {
            city: city,
            temp: temp,
            timestamp: Date.now(),
            url: '/'
        },
        actions: [
            {
                action: 'hourly',
                title: '📊 Saatlik',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text x="12" y="18" font-size="16" text-anchor="middle">📊</text></svg>'
            },
            {
                action: 'daily',
                title: '📅 Günlük',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text x="12" y="18" font-size="16" text-anchor="middle">📅</text></svg>'
            },
            {
                action: 'refresh',
                title: '🔄 Yenile',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text x="12" y="18" font-size="16" text-anchor="middle">🔄</text></svg>'
            },
            {
                action: 'close',
                title: '✖️ Kapat',
                icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><text x="12" y="18" font-size="16" text-anchor="middle">✖️</text></svg>'
            }
        ]
    };

    try {
        // Önceki bildirimi kapat
        const notifications = await self.registration.getNotifications({ tag: NOTIFICATION_TAG });
        notifications.forEach(notification => notification.close());
        
        // Yeni bildirimi göster
        await self.registration.showNotification(`${icon} ${city}`, options);
        console.log('Gelişmiş bildirim gösterildi');
    } catch (error) {
        console.error('Bildirim hatası:', error);
    }
}

// Bildirim aksiyonlarına tıklandığında
self.addEventListener('notificationclick', async (event) => {
    event.notification.close();
    
    const action = event.action;
    
    if (action === 'close') {
        // Sadece kapat
        console.log('Bildirim kapatıldı');
        return;
    }
    
    if (action === 'refresh') {
        // Yenileme isteği gönder
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                clientList.forEach(client => {
                    client.postMessage({ type: 'REFRESH_WEATHER' });
                });
                
                if (clientList.length === 0) {
                    return clients.openWindow('/');
                } else {
                    return clientList[0].focus();
                }
            })
        );
        return;
    }
    
    if (action === 'hourly' || action === 'daily') {
        // Sayfayı aç ve ilgili bölüme kaydır
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                clientList.forEach(client => {
                    client.postMessage({ 
                        type: 'SCROLL_TO', 
                        section: action 
                    });
                });
                
                if (clientList.length === 0) {
                    return clients.openWindow('/');
                } else {
                    return clientList[0].focus();
                }
            })
        );
        return;
    }
    
    // Varsayılan: Sayfayı aç/odakla
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            const client = clientList.find(c => c.url.includes(event.notification.data.url) && 'focus' in c);
            
            if (client) {
                return client.focus();
            }
            
            if (clients.openWindow) {
                return clients.openWindow(event.notification.data.url);
            }
        })
    );
});

// Bildirim kapatıldığında
self.addEventListener('notificationclose', (event) => {
    console.log('Bildirim kullanıcı tarafından kapatıldı');
});

// Fetch olayları (önbellekleme için)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
