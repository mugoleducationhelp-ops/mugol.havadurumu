// Service Worker - MuGöl Hava Durumu (Weawow Style)
console.log('[SW] Başlatıldı');

const TAG = 'mugol-weather';

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

// Bildirim göster - Weawow tarzı
async function showNotification(data) {
    console.log('[SW] Gösteriliyor:', data.city);
    
    const { city, temp, desc, icon, hourly, daily, humidity, wind, precip, maxTemp, minTemp } = data;
    
    // Başlık - Weawow tarzı: sadece ısı
    const title = `${temp}°`;
    
    // MuGöl Hava Durumu başlığı
    let body = `MuGöl Hava Durumu\n\n`;
    
    // Şehir ve ana bilgiler
    body += `${city}\n\n`;
    
    // Ana durum satırı - ikon, sıcaklık ve max/min hizalı
    body += `${icon}  ${temp}°`;
    body += `                                         🌡️ ${maxTemp}°/${minTemp}°\n`;
    
    // Yağış bilgisi - sağa hizalı
    body += `                                                              ${icon} ${precip}mm/d\n\n`;
    
    // Mevcut durum
    body += `Mevcut: ${desc}\n\n`;
    
    // Saatlik tahmin - 5 saat, Weawow formatı
    if (hourly?.length > 0) {
        const hours = hourly.slice(0, 5);
        
        // Saatler satırı
        body += hours.map(h => {
            const t = h.time.padStart(5, ' ');
            return t + '    ';
        }).join('');
        body += '\n';
        
        // İkonlar satırı
        body += hours.map(h => {
            return h.icon + '      ';
        }).join('');
        body += '\n';
        
        // Sıcaklıklar satırı
        body += hours.map(h => {
            const temp = (h.temp + '°').padStart(4, ' ');
            return temp + '     ';
        }).join('');
        body += '\n';
        
        // Yağış miktarları satırı
        body += hours.map(h => {
            const p = parseFloat(h.precip || '0');
            const precipStr = (p.toFixed(1) + 'mm').padStart(6, ' ');
            return precipStr + '   ';
        }).join('');
        body += '\n';
    }
    
    const now = new Date().toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    // MuGöl Logo SVG - Profesyonel
    const logoSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 512 512'%3E%3Cdefs%3E%3ClinearGradient id='bg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' style='stop-color:%233b82f6'/%3E%3Cstop offset='100%25' style='stop-color:%232563eb'/%3E%3C/linearGradient%3E%3CradialGradient id='glow' cx='50%25' cy='50%25' r='50%25'%3E%3Cstop offset='0%25' style='stop-color:%23ffffff;stop-opacity:0.3'/%3E%3Cstop offset='100%25' style='stop-color:%23ffffff;stop-opacity:0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='512' height='512' rx='120' fill='url(%23bg)'/%3E%3Cellipse cx='256' cy='256' rx='200' ry='200' fill='url(%23glow)'/%3E%3Ccircle cx='150' cy='150' r='60' fill='%23ffffff' opacity='0.15'/%3E%3Ccircle cx='380' cy='360' r='50' fill='%23ffffff' opacity='0.1'/%3E%3Ctext x='256' y='200' font-family='Arial,sans-serif' font-size='85' font-weight='bold' text-anchor='middle' fill='%23ffffff' letter-spacing='2'%3EMuGöl%3C/text%3E%3Ctext x='256' y='265' font-family='Arial,sans-serif' font-size='52' font-weight='500' text-anchor='middle' fill='%23dbeafe' letter-spacing='1'%3EHava%3C/text%3E%3Ctext x='256' y='410' font-size='130' text-anchor='middle' filter='drop-shadow(0 4px 8px rgba(0,0,0,0.3))'%3E${icon}%3C/text%3E%3C/svg%3E`;
    
    // Küçük badge ikonu
    const badgeSvg = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' rx='20' fill='%233b82f6'/%3E%3Ctext x='50' y='72' font-size='65' text-anchor='middle'%3E${icon}%3C/text%3E%3C/svg%3E`;
    
    try {
        // Eski bildirimleri kapat
        const old = await self.registration.getNotifications({ tag: TAG });
        old.forEach(n => n.close());
        
        // Yeni bildirim
        await self.registration.showNotification(title, {
            body: body,
            icon: logoSvg,
            badge: badgeSvg,
            tag: TAG,
            requireInteraction: true,
            silent: true,
            renotify: true,
            timestamp: Date.now(),
            data: { city, temp, time: now },
            actions: [
                { action: 'refresh', title: '🔄 Yenile' },
                { action: 'settings', title: '⚙️ Ayarlar' }
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
