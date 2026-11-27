// Gửi thử 1 thông báo tới mọi trình duyệt đã bật thông báo của CHÍNH người đang đăng nhập.
// Xác thực bằng JWT phiên đăng nhập (Authorization: Bearer <access_token>) — không cần khoá bí mật ở trình duyệt.
const webpush = require('web-push');
const { env, admin, userFromJwt, vapid } = require('./_supa');
const last = new Map(); // giới hạn: 1 lần / 15 giây / người

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'method' });
  if (!env('SUPABASE_URL') || !env('SUPABASE_ANON_KEY') || !env('SUPABASE_SERVICE_ROLE_KEY') || !env('VAPID_PUBLIC_KEY') || !env('VAPID_PRIVATE_KEY')) return res.status(500).json({ error: 'missing_env' });
  const jwt = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  const user = await userFromJwt(jwt).catch(() => null);
  if (!user) return res.status(401).json({ error: 'unauthorized' });
  const t = last.get(user.id) || 0;
  if (Date.now() - t < 15e3) return res.status(429).json({ error: 'rate_limited' });
  last.set(user.id, Date.now());
  try { vapid(webpush); } catch (e) { return res.status(500).json({ error: 'bad_vapid', message: e.message }); }
  const r = await admin(`push_subscriptions?select=id,endpoint,p256dh,auth&user_id=eq.${user.id}`);
  if (!r.ok) return res.status(500).json({ error: 'subs', status: r.status, detail: (await r.text()).slice(0, 300) });
  const subs = await r.json();
  if (!subs.length) return res.status(404).json({ error: 'no_subscription' });
  const lang = (req.body && req.body.lang) === 'en' ? 'en' : 'vi';
  const payload = JSON.stringify({
    title: lang === 'vi' ? '🐶 Vincenink: thông báo thử' : '🐶 Vincenink: test notification',
    body: lang === 'vi' ? 'Máy chủ đã gửi được nhắc lịch tới trình duyệt này. Mọi thứ đã sẵn sàng!' : 'The server can reach this browser. You’re all set!',
    tag: 'test', url: '/',
  });
  let sent = 0, removed = 0; const errors = [];
  for (const s of subs) {
    try { await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 120, urgency: 'high' }); sent++; }
    catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { await admin(`push_subscriptions?id=eq.${s.id}`, { method: 'DELETE' }); removed++; }
      else errors.push(String(e.statusCode || e.message));
    }
  }
  res.status(sent ? 200 : 502).json({ ok: sent > 0, sent, removed, errors });
};
