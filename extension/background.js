// Vincenink – Nhắc lịch dạy (service worker)
// Lịch được trang Vincenink chuẩn bị sẵn cho ~5 tuần tới; tiện ích đặt báo thức (chrome.alarms)
// và hiện thông báo kể cả khi không mở trang, miễn là Chrome đang chạy.

const DEF = { enabled: true, lead: [60], morning: true, morningAt: '09:00', evening: true, eveningAt: '21:00', empty: true };
const pad = n => String(n).padStart(2, '0');
const dstr = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const at = (date, hm) => { const [y, m, d] = date.split('-').map(Number), [h, mi] = hm.split(':').map(Number); return new Date(y, m - 1, d, h, mi).getTime(); };
const vi = st => (st.lang || 'vi') !== 'en';

async function state() {
  const s = await chrome.storage.local.get(['data', 'url', 'fired']);
  const data = s.data || { lessons: [], settings: {} };
  return { data, set: { ...DEF, ...(data.settings || {}) }, url: s.url || 'https://vincenink.vercel.app/', fired: s.fired || {} };
}
async function markFired(id) {
  const { fired } = await chrome.storage.local.get('fired'); const f = fired || {};
  if (f[id]) return false;
  f[id] = Date.now();
  const cut = Date.now() - 3 * 864e5; for (const k in f) if (f[k] < cut) delete f[k];
  await chrome.storage.local.set({ fired: f }); return true;
}
const lessonsOn = (data, date) => (data.lessons || []).filter(l => l.date === date && !l.off).sort((a, b) => a.start.localeCompare(b.start));
const line = l => `${l.start}–${l.end} · ${l.who}${l.subject ? ' (' + l.subject + ')' : ''}`;

async function notify(id, title, message, extra = {}) {
  if (!(await markFired(id))) return;
  await chrome.notifications.create(id, { type: 'basic', iconUrl: 'icons/icon-128.png', title, message, priority: 2, ...extra });
}

/* Đặt lại toàn bộ báo thức cho 2 ngày tới */
async function reschedule() {
  await chrome.alarms.clearAll();
  const { data, set } = await state();
  chrome.alarms.create('tick', { periodInMinutes: 60 });
  if (!set.enabled || data.serverPush) return; // đã có thông báo qua tài khoản → tránh báo trùng
  const now = Date.now(), today = new Date();
  for (let i = 0; i < 2; i++) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + i), ds = dstr(d);
    if (set.morning) { const t = at(ds, set.morningAt); if (t > now) chrome.alarms.create(`sum|${ds}`, { when: t }); }
    if (set.evening) { const t = at(ds, set.eveningAt); if (t > now) chrome.alarms.create(`eve|${ds}`, { when: t }); }
    for (const l of lessonsOn(data, ds)) for (const lead of set.lead) {
      const t = at(ds, l.start) - lead * 6e4;
      if (t > now) chrome.alarms.create(`les|${l.id}|${lead}`, { when: t });
    }
  }
  await catchUp();
}

/* Khi Chrome vừa mở / máy vừa thức dậy: bù những nhắc nhở hợp lý đã lỡ */
async function catchUp() {
  const { data, set } = await state(); if (!set.enabled || data.serverPush) return;
  const now = Date.now(), ds = dstr(new Date());
  const list = lessonsOn(data, ds);
  // Tóm tắt buổi sáng: nếu đã qua giờ tóm tắt mà chưa hiện, và hôm nay còn tiết chưa dạy
  if (set.morning && now >= at(ds, set.morningAt) && list.some(l => at(ds, l.end) > now)) await summary(ds, data);
  // Tiết sắp bắt đầu trong khoảng nhắc
  const maxLead = Math.max(...set.lead, 0);
  for (const l of list) {
    const start = at(ds, l.start);
    if (start > now && start - now <= maxLead * 6e4) await lessonSoon(l, set.lead.filter(x => start - now <= x * 6e4).sort((a, b) => a - b)[0] || maxLead, data);
  }
}

async function summary(ds, data) {
  const all = lessonsOn(data, ds), list = all.filter(l => at(ds, l.end) > Date.now()), V = vi(data), set = { ...DEF, ...(data.settings || {}) };
  if (!all.length && set.empty && (data.lessons || []).some(l => !l.off)) return notify(`sum|${ds}`, V ? '☀️ Hôm nay cậu không có buổi dạy nào' : '☀️ No lessons today', V ? 'Một ngày trống lịch — nghỉ ngơi, nạp năng lượng thật đầy nhé!' : 'A free day — rest up and recharge!');
  if (!list.length) return;
  await notify(`sum|${ds}`, V ? `☀️ Hôm nay cậu có ${list.length} buổi dạy` : `☀️ ${list.length} lesson${list.length > 1 ? 's' : ''} today`,
    list.slice(0, 4).map(line).join('\n') + (list.length > 4 ? (V ? `\n… và ${list.length - 4} buổi nữa` : `\n… and ${list.length - 4} more`) : ''));
}
async function evening(ds, data) {
  const d = new Date(); const tmr = dstr(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1));
  const list = lessonsOn(data, tmr), V = vi(data), set = { ...DEF, ...(data.settings || {}) };
  if (!list.length && set.empty && (data.lessons || []).some(l => !l.off)) return notify(`eve|${ds}`, V ? '🌙 Ngày mai cậu được nghỉ' : '🌙 No lessons tomorrow', V ? 'Không có buổi dạy nào. Tối nay cứ thong thả, ngủ ngon nha!' : 'Nothing scheduled. Take it easy tonight and sleep well!');
  if (!list.length) return;
  await notify(`eve|${ds}`, V ? `🌙 Ngày mai cậu có ${list.length} buổi` : `🌙 ${list.length} lesson${list.length > 1 ? 's' : ''} tomorrow`,
    (V ? `Buổi đầu ${list[0].start} với ${list[0].who}. Soạn bài xong thì ngủ sớm nha.` : `First at ${list[0].start} with ${list[0].who}. Get some rest tonight.`));
}
async function lessonSoon(l, lead, data) {
  const V = vi(data), mins = Math.max(1, Math.round((at(l.date, l.start) - Date.now()) / 6e4));
  await notify(`les|${l.id}|${lead}`, V ? `⏰ ${mins} phút nữa: ${l.who}` : `⏰ In ${mins} min: ${l.who}`,
    `${l.start}–${l.end}${l.subject ? ' · ' + l.subject : ''}${l.note ? '\n' + l.note : ''}`,
    { requireInteraction: lead <= 5, buttons: [{ title: V ? 'Mở Vincenink' : 'Open Vincenink' }] });
}

chrome.alarms.onAlarm.addListener(async a => {
  if (a.name === 'tick') return reschedule();
  const { data, set } = await state(); if (!set.enabled || data.serverPush) return;
  const [kind, x, lead] = a.name.split('|');
  if (kind === 'sum') return summary(x, data);
  if (kind === 'eve') return evening(x, data);
  if (kind === 'les') { const l = (data.lessons || []).find(l => l.id === x && !l.off); if (l && at(l.date, l.start) > Date.now()) return lessonSoon(l, +lead, data); }
});

async function openApp() {
  const { url } = await state();
  const tabs = await chrome.tabs.query({});
  const tab = tabs.find(t => t.url && t.url.startsWith(url));
  if (tab) { await chrome.tabs.update(tab.id, { active: true }); await chrome.windows.update(tab.windowId, { focused: true }); }
  else await chrome.tabs.create({ url });
}
chrome.notifications.onClicked.addListener(id => { chrome.notifications.clear(id); openApp(); });
chrome.notifications.onButtonClicked.addListener(id => { chrome.notifications.clear(id); openApp(); });

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  (async () => {
    if (msg.type === 'sync' && msg.data) { await chrome.storage.local.set({ data: msg.data, url: msg.url, syncedAt: Date.now() }); await reschedule(); }
    if (msg.type === 'test') {
      const { data } = await state(), V = vi(data);
      await chrome.notifications.create('test|' + Date.now(), { type: 'basic', iconUrl: 'icons/icon-128.png', title: V ? '🐶 Vincenink đã sẵn sàng' : '🐶 Vincenink is ready', message: V ? 'Thông báo nhắc lịch sẽ hiện như thế này, kể cả khi cậu không mở trang.' : 'Reminders will look like this, even when the page is closed.', priority: 2 });
    }
    if (msg.type === 'status') { const s = await chrome.storage.local.get(['data', 'syncedAt']); reply({ syncedAt: s.syncedAt || 0, count: (s.data && s.data.lessons || []).length, settings: s.data && s.data.settings }); return; }
    reply({ ok: true });
  })();
  return true;
});
chrome.runtime.onStartup.addListener(reschedule);
chrome.runtime.onInstalled.addListener(reschedule);
