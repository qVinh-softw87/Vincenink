const pad = n => String(n).padStart(2, '0');
chrome.runtime.sendMessage({ type: 'status' }, r => {
  const el = document.getElementById('st');
  if (!r || !r.syncedAt) { el.innerHTML = 'Chưa có lịch. Hãy mở trang Vincenink một lần để tiện ích nhận lịch dạy.'; return; }
  const d = new Date(r.syncedAt), s = r.settings || {};
  el.innerHTML = `<b>${s.enabled === false ? 'Đang tắt nhắc lịch' : 'Đang nhắc lịch ✓'}</b><div class="muted">${r.count} buổi trong 5 tuần tới · cập nhật ${pad(d.getHours())}:${pad(d.getMinutes())} ${pad(d.getDate())}/${pad(d.getMonth() + 1)}</div>`;
});
document.getElementById('test').onclick = () => chrome.runtime.sendMessage({ type: 'test' });
document.getElementById('open').onclick = async () => { const { url } = await chrome.storage.local.get('url'); chrome.tabs.create({ url: url || 'https://vincenink.vercel.app/' }); window.close(); };
