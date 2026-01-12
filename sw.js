// Service Worker - Kalıcı Etkileşimli Hava Durumu Bildirimi
console.log('[SW] Service Worker dosyası yüklendi');

const NOTIFICATION_TAG = 'weather-premium';
let autoRefreshInterval = null;

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
        
        // Otomatik yenileme başlat (5 dakikada bir)
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
        }
        
        autoRefreshInterval = setInterval(async () => {
            console.log('[SW] ⏰ Otomatik yenileme zamanı');
            const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
            if (clients.length > 0) {
                clients[0].postMessage({ type: 'AUTO_REFRESH_NOTIFICATION' });
            }
        }, 5 * 60 * 1000); // 5 dakika
        
    } else if (event.data && event.data.type === 'STOP_NOTIFICATION') {
        console.log('[SW] Bildirim durduruluyor');
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
        const notifications = await self.registration.getNotifications({ tag: NOTIFICATION_TAG });
        notifications.forEach(notification => notification.close());
    }
});

// Hava durumu bildirimini göster - Premium tasarım
async function showWeatherNotification(data) {
    console.log('[SW] showWeatherNotification çağrıldı, data:', data);
    
    const { city, temp, desc, icon, humidity, wind, pressure, hourly, daily, feelsLike } = data;
    
    // Başlık - Şehir adı
    const title = `${icon} ${city} - ${temp}°`;
    
    // Ana durum bilgisi
    const mainStatus = `${desc}`;
    
    // Hissedilen sıcaklık
    let feelsInfo = '';
    if (feelsLike) {
        const diff = feelsLike - temp;
        if (Math.abs(diff) >= 2) {
            feelsInfo = `\nHissedilen: ${feelsLike}°`;
        }
    }
    
    // Saatlik tahmin - Kompakt (5 saat)
    let hourlyForecast = '\n\n━━━━━ Saatlik Tahmin ━━━━━\n';
    if (hourly && hourly.length > 0) {
        const hourlyItems = hourly.slice(0, 5).map(h => 
            `${h.time} ${h.icon} ${h.temp}°`
        );
        hourlyForecast += hourlyItems.join('  |  ');
    }
    
    // Günlük tahmin - Kompakt
    let dailyForecast = '\n\n━━━━━ 5 Günlük Tahmin ━━━━━\n';
    if (daily && daily.length > 0) {
        const dailyItems = daily.slice(0, 5).map(d => 
            `${d.date}: ${d.icon} ${d.max}°/${d.min}°`
        );
        dailyForecast += dailyItems.join('\n');
    }
    
    // Detay bilgiler
    let detailInfo = '\n\n━━━━━━━━━━━━━━━━━━━━\n';
    detailInfo += `💧 Nem: ${humidity}%  |  💨 Rüzgar: ${wind} km/s`;
    if (pressure) {
        detailInfo += `\n🌡️ Basınç: ${pressure} hPa`;
    }
    
    const bodyText = mainStatus + feelsInfo + hourlyForecast + dailyForecast + detailInfo;
    
    // Logo ve ikon için SVG
    const logoIcon = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%2318181b;stop-opacity:1'/%3E%3Cstop offset='100%25' style='stop-color:%232d2d30;stop-opacity:1'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='300' rx='60' fill='url(%23bg)'/%3E%3Ccircle cx='80' cy='80' r='40' fill='%233b82f6' opacity='0.6'/%3E%3Ccircle cx='220' cy='220' r='35' fill='%2360a5fa' opacity='0.5'/%3E%3Ctext x='150' y='140' font-size='40' font-weight='700' text-anchor='middle' fill='%23ffffff'%3EMuGöl%3C/text%3E%3Ctext x='150' y='180' font-size='28' text-anchor='middle' fill='%2393c5fd'%3EHava%3C/text%3E%3Ctext x='150' y='240' font-size='80' text-anchor='middle' fill='white'%3E${icon}%3C/text%3E%3C/svg%3E`;
    
    // Şu anki zaman bilgisi
    const now = new Date();
    const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    
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
        timestamp: Date.now(),
        data: {
            city: city,
            temp: temp,
            updateTime: timeStr,
            lastUpdate: Date.now()
        },
        actions: [
            {
                action: 'refresh',
                title: '🔄 Yenile'
            },
            {
                action: 'details',
                title: '📱 Detay Gör'
            },
            {
                action: 'close',
                title: '❌ Kapat'
            }
        ]
    };

    try {
        console.log('[SW] Eski bildirimler kapatılıyor');
        const notifications = await self.registration.getNotifications({ tag: NOTIFICATION_TAG });
        notifications.forEach(notification => notification.close());
        
        console.log('[SW] Yeni bildirim gösteriliyor:', title);
        await self.registration.showNotification(title, options);
        console.log('[SW] ✅ Bildirim başarıyla gösterildi - Güncelleme: ' + timeStr);
    } catch (error) {
        console.error('[SW] ❌ Bildirim hatası:', error);
    }
}

// Bildirim aksiyonlarına tıklandığında
self.addEventListener('notificationclick', async (event) => {
    console.log('[SW] Bildirime tıklandı, aksiyon:', event.action);
    
    const action = event.action;
    
    // YENİLE butonu - Hemen güncelle
    if (action === 'refresh') {
        console.log('[SW] 🔄 Yenile butonuna tıklandı - Güncelleniyor...');
        event.waitUntil(
            (async () => {
                const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
                if (clientList.length > 0) {
                    // Ana sayfaya yenileme mesajı gönder
                    clientList[0].postMessage({ type: 'REFRESH_WEATHER' });
                    
                    // Bildirimi geçici olarak güncelle
                    const notifications = await self.registration.getNotifications({ tag: NOTIFICATION_TAG });
                    if (notifications.length > 0) {
                        const currentData = notifications[0].data;
                        await self.registration.showNotification(
                            `🔄 Güncelleniyor... ${currentData.city}`,
                            {
                                body: 'Yeni hava durumu bilgileri alınıyor...',
                                icon: notifications[0].icon,
                                badge: notifications[0].badge,
                                tag: NOTIFICATION_TAG,
                                requireInteraction: true,
                                silent: true
                            }
                        );
                    }
                } else {
                    // Pencere kapalıysa aç
                    await clients.openWindow('./');
                }
            })()
        );
        return;
    }
    
    // DETAY GÖR butonu
    if (action === 'details') {
        console.log('[SW] 📱 Detaylar butonuna tıklandı');
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
    
    // KAPAT butonu
    if (action === 'close') {
        console.log('[SW] ❌ Kapat butonuna tıklandı');
        event.notification.close();
        
        // Otomatik yenilemeyi durdur
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
        
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
                if (clientList.length > 0) {
                    clientList[0].postMessage({ type: 'NOTIFICATION_CLOSED' });
                }
            })
        );
        return;
    }
    
    // Varsayılan: Sayfayı aç veya odakla
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
    console.log('[SW] ⚠️ Bildirim kapatılmaya çalışıldı');
    
    // Eğer "close" aksiyonu değilse, tekrar aç
    if (event.action !== 'close') {
        console.log('[SW] 🔄 Bildirim otomatik olarak yeniden açılıyor...');
        
        event.waitUntil(
            (async () => {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const clientList = await clients.matchAll({ type: 'window', includeUncontrolled: true });
                if (clientList.length > 0) {
                    clientList[0].postMessage({ type: 'REOPEN_NOTIFICATION' });
                }
            })()
        );
    } else {
        console.log('[SW] ✅ Kullanıcı bildirimi kapattı');
    }
});

console.log('[SW] ✅ Service Worker başarıyla yüklendi ve hazır');
