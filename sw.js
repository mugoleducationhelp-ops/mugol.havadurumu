// Service Worker - Kalıcı Bildirim
console.log('[SW] Başlatıldı');

const TAG = 'weather-live';

self.addEventListener('install', (e) => {
    console.log('[SW] Install');
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    console.log('[SW] Activate');
    e.waitUntil(self.clients.claim());
});

// Mesaj dinle
self.addEventListener('message', async (e) => {
    console.log('[SW] Mesaj:', e.data?.type);
    
    if (e.data?.type === 'SHOW') {
        await showNotification(e.data.data);
    } else if (e.data?.type === 'CLOSE') {
        const all = await self.registration.getNotifications({ tag: TAG });
        all.forEach(n => n.close());
    }
});

// Bildirim göster
async function showNotification(data) {
    console.log('[SW] Gösteriliyor:', data.city);
    
    const { city, temp, desc, icon, hourly, daily } = data;
    
    // Başlık
    const title = `${icon} ${city} - ${temp}°`;
    
    // İçerik
    let body = `${desc}\n\n`;
    
    // Saatlik
    if (hourly?.length > 0) {
        body += '━━ Saatlik ━━\n';
        hourly.slice(0, 5).forEach(h => {
            body += `${h.time} ${h.icon} ${h.temp}°  `;
        });
        body += '\n\n';
    }
    
    // Günlük
    if (daily?.length > 0) {
        body += '━━ 5 Gün ━━\n';
        daily.slice(0, 5).forEach(d => {
            body += `${d.date}: ${d.icon} ${d.max}°/${d.min}°\n`;
        });
    }
    
    const now = new Date().toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    try {
        // Eski bildirimleri kapat
        const old = await self.registration.getNotifications({ tag: TAG });
        old.forEach(n => n.close());
        
        // Yeni bildirim
        await self.registration.showNotification(title, {
            body: body,
            icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"%3E%3Crect fill="%233b82f6" width="100" height="100" rx="20"/%3E%3Ctext x="50" y="70" font-size="60" text-anchor="middle" fill="white"%3E' + icon + '%3C/text%3E%3C/svg%3E',
            tag: TAG,
            requireInteraction: true,
            silent: true,
            renotify: true,
            data: { city, temp, time: now },
            actions: [
                { action: 'refresh', title: '🔄 Yenile' },
                { action: 'open', title: '📱 Aç' }
            ]
        });
        
        console.log('[SW] ✅ Gösterildi -', now);
    } catch (err) {
        console.error('[SW] Hata:', err);
    }
}

// Tıklama
self.addEventListener('notificationclick', async (e) => {
    console.log('[SW] Tıklandı:', e.action);
    
    e.notification.close();
    
    if (e.action === 'refresh') {
        e.waitUntil(
            clients.matchAll({ type: 'window' }).then(list => {
                if (list[0]) {
                    list[0].postMessage({ type: 'REFRESH' });
                    list[0].focus();
                }
            })
        );
    } else {
        e.waitUntil(
            clients.matchAll({ type: 'window' }).then(list => {
                if (list[0]) {
                    return list[0].focus();
                }
                return clients.openWindow('./');
            })
        );
    }
});

console.log('[SW] ✅ Hazır');
