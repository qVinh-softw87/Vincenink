// Chạy trong trang Vincenink: đọc lịch mà trang đã chuẩn bị sẵn và gửi cho tiện ích.
(() => {
  if (!document.querySelector('meta[name="application-name"][content="Vincenink"]')) return;
  const KEY = 'vincenink.reminders';
  document.documentElement.dataset.vinExt = chrome.runtime.getManifest().version;
  const push = () => {
    let data = null; try { data = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { /* */ }
    if (data) chrome.runtime.sendMessage({ type: 'sync', data, url: location.origin + location.pathname }).catch(() => {});
  };
  push();
  window.addEventListener('vincenink:reminders', push);
  window.addEventListener('vincenink:test', () => chrome.runtime.sendMessage({ type: 'test' }).catch(() => {}));
  window.dispatchEvent(new CustomEvent('vincenink:ext', { detail: chrome.runtime.getManifest().version }));
})();
