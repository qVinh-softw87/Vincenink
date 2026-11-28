/* Vincenink service worker — chỉ để nhận thông báo đẩy (Web Push). Không cache trang. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) { d = { title: 'Vincenink', body: e.data ? e.data.text() : '' }; }
  e.waitUntil((async () => {
    await self.registration.showNotification(d.title || 'Vincenink', {
      body: d.body || '', tag: d.tag, renotify: !!d.tag, requireInteraction: !!d.requireInteraction,
      icon: 'assets/icon-192.png', badge: 'assets/favicon-48.png', data: { url: d.url || './' },
    });
    // Báo cho trang đang mở biết là trình duyệt ĐÃ nhận được (để chẩn đoán khi bấm "Gửi thử")
    (await self.clients.matchAll({ type: 'window', includeUncontrolled: true })).forEach(c => c.postMessage({ type: 'vincenink-push', tag: d.tag || '' }));
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || './', self.registration.scope).href;
  e.waitUntil((async () => {
    const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const hit = list.find(c => c.url.startsWith(self.registration.scope));
    if (hit) { await hit.focus(); return; }
    await self.clients.openWindow(target);
  })());
});
