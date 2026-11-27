// Gửi thông báo nhắc lịch (Web Push). Supabase pg_cron gọi endpoint này mỗi phút.
// Biến môi trường (Vercel): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY,
//                          VAPID_SUBJECT (vd: mailto:ban@email.com), CRON_SECRET
const webpush = require('web-push');
const { env, admin, vapid } = require('./_supa');

const DEF = { enabled: true, lead: [15], morning: true, morningAt: '07:00', evening: true, eveningAt: '21:00' };
const WINDOW = 3 * 60e3; // chấp nhận trễ tối đa 3 phút (phòng khi cron lỡ một nhịp)

const sb = admin;
/* Giờ địa phương (theo múi giờ IANA) → mốc thời gian tuyệt đối */
function tzOffset(ms, tz) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(new Date(ms)).map(x => [x.type, x.value]));
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - ms;
}
function at(date, hm, tz) {
  const [y, m, d] = date.split('-').map(Number), [h, mi] = hm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, h, mi);
  return guess - tzOffset(guess - tzOffset(guess, tz), tz);
}
function localDate(ms, tz, addDays = 0) {
  const s = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(ms));
  if (!addDays) return s;
  const [y, m, d] = s.split('-').map(Number), t = new Date(Date.UTC(y, m - 1, d + addDays));
  return t.toISOString().slice(0, 10);
}
const line = l => `${l.start}–${l.end} · ${l.who}${l.subject ? ' (' + l.subject + ')' : ''}`;

/* Tính các thông báo đến hạn trong cửa sổ (now - WINDOW, now] */
function dueFor(state, now) {
  const r = state.reminders || {}, set = { ...DEF, ...(r.settings || {}) }, tz = r.tz || 'Asia/Ho_Chi_Minh', vi = (r.lang || 'vi') !== 'en';
  if (!set.enabled) return [];
  const lessons = (r.lessons || []).filter(l => !l.off), out = [];
  const inWin = t => t <= now && t > now - WINDOW;
  const today = localDate(now, tz), tmr = localDate(now, tz, 1);
  const on = ds => lessons.filter(l => l.date === ds).sort((a, b) => a.start.localeCompare(b.start));
  for (const l of lessons) for (const lead of set.lead || []) {
    const start = at(l.date, l.start, tz), t = start - lead * 60e3;
    if (inWin(t)) out.push({ key: `les|${l.id}|${lead}`, title: vi ? `⏰ ${lead} phút nữa: ${l.who}` : `⏰ In ${lead} min: ${l.who}`, body: `${l.start}–${l.end}${l.subject ? ' · ' + l.subject : ''}${l.note ? '\n' + l.note : ''}`, requireInteraction: lead <= 5 });
  }
  if (set.morning && inWin(at(today, set.morningAt, tz))) {
    const list = on(today);
    if (list.length) out.push({ key: `sum|${today}`, title: vi ? `☀️ Hôm nay cậu có ${list.length} buổi dạy` : `☀️ ${list.length} lesson${list.length > 1 ? 's' : ''} today`, body: list.slice(0, 4).map(line).join('\n') + (list.length > 4 ? (vi ? `\n… và ${list.length - 4} buổi nữa` : `\n… and ${list.length - 4} more`) : '') });
  }
  if (set.evening && inWin(at(today, set.eveningAt, tz))) {
    const list = on(tmr);
    if (list.length) out.push({ key: `eve|${today}`, title: vi ? `🌙 Ngày mai cậu có ${list.length} buổi` : `🌙 ${list.length} lesson${list.length > 1 ? 's' : ''} tomorrow`, body: vi ? `Buổi đầu ${list[0].start} với ${list[0].who}. Soạn bài xong thì ngủ sớm nha.` : `First at ${list[0].start} with ${list[0].who}. Get some rest tonight.` });
  }
  return out;
}

module.exports = async function handler(req, res) {
  const secret = env('CRON_SECRET');
  const got = String(req.headers['x-cron-secret'] || String(req.headers.authorization || '').replace(/^Bearer\s+/i, '')).trim();
  if (!secret || got !== secret) return res.status(401).json({ error: 'unauthorized' });
  const need = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'].filter(k => !env(k));
  if (need.length) return res.status(500).json({ error: 'missing_env', need });
  try { vapid(webpush); } catch (e) { return res.status(500).json({ error: 'bad_vapid', message: e.message }); }

  const now = Date.now();
  const subsR = await sb('push_subscriptions?select=id,user_id,endpoint,p256dh,auth');
  if (!subsR.ok) return res.status(500).json({ error: 'subs', status: subsR.status, detail: (await subsR.text()).slice(0, 300) });
  const subs = await subsR.json();
  if (!subs.length) return res.status(200).json({ ok: true, users: 0, sent: 0 });
  const ids = [...new Set(subs.map(s => s.user_id))];
  const stR = await sb(`user_state?select=user_id,reminders&user_id=in.(${ids.join(',')})`);
  if (!stR.ok) return res.status(500).json({ error: 'state', status: stR.status, detail: (await stR.text()).slice(0, 300) });
  const states = await stR.json();
  let sent = 0, removed = 0; const errors = [];
  for (const st of states) {
    for (const n of dueFor(st, now)) {
      // ghi nhật ký trước để không bao giờ gửi trùng
      const lr = await sb('push_log?on_conflict=user_id,key', { method: 'POST', headers: { Prefer: 'resolution=ignore-duplicates,return=representation' }, body: JSON.stringify({ user_id: st.user_id, key: n.key }) });
      if (!lr.ok) { errors.push(`log ${lr.status}`); continue; }
      const rows = await lr.json();
      if (!rows.length) continue;
      const payload = JSON.stringify({ title: n.title, body: n.body, tag: n.key, requireInteraction: !!n.requireInteraction, url: '/' });
      for (const s of subs.filter(x => x.user_id === st.user_id)) {
        try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 600, urgency: 'high' }); sent++; }
        catch (e) { if (e.statusCode === 404 || e.statusCode === 410) { await sb(`push_subscriptions?id=eq.${s.id}`, { method: 'DELETE' }); removed++; } else errors.push(`push ${e.statusCode || e.message}`); }
      }
    }
  }
  if (new Date(now).getUTCMinutes() === 0) await sb(`push_log?sent_at=lt.${new Date(now - 4 * 864e5).toISOString()}`, { method: 'DELETE' });
  res.status(200).json({ ok: true, users: states.length, subs: subs.length, sent, removed, errors: errors.slice(0, 5) });
};
module.exports.dueFor = dueFor; module.exports.at = at;
