// Trang chẩn đoán cho chủ trang: /api/diag?key=<CRON_SECRET>
// Kiểm tra biến môi trường, khoá VAPID và quyền đọc 3 bảng bằng khoá bí mật. Không bao giờ in khoá ra.
const webpush = require('web-push');
const { env, isJwt, admin, vapid } = require('./_supa');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const secret = env('CRON_SECRET'), got = String((req.query && req.query.key) || req.headers['x-cron-secret'] || '').trim();
  if (!secret || got !== secret) return res.status(401).json({ error: 'unauthorized' });
  const out = { env: {}, vapid: null, tables: {}, time: new Date().toISOString() };
  for (const k of ['SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'CRON_SECRET']) {
    const raw = process.env[k] || '', v = env(k);
    out.env[k] = !raw ? 'missing' : (raw !== raw.trim() ? 'ok (có khoảng trắng/xuống dòng thừa — đã tự bỏ)' : 'ok');
    if (k === 'SUPABASE_SERVICE_ROLE_KEY' && v) out.env[k] += isJwt(v) ? ' · legacy JWT' : (v.startsWith('sb_secret_') ? ' · sb_secret' : ' · ⚠ không giống khoá bí mật');
    if (k === 'SUPABASE_ANON_KEY' && v) out.env[k] += v.startsWith('sb_secret_') ? ' · ⚠ ĐANG DÙNG KHOÁ BÍ MẬT Ở FRONTEND — đổi ngay!' : '';
  }
  try { vapid(webpush); out.vapid = 'ok'; } catch (e) { out.vapid = 'lỗi: ' + e.message; }
  for (const t of ['user_state', 'push_subscriptions', 'push_log', 'boards']) {
    try {
      const r = await admin(`${t}?select=*&limit=1`, { headers: { Prefer: 'count=exact' } });
      out.tables[t] = r.ok ? `ok · ${(r.headers.get('content-range') || '').split('/')[1] || '?'} dòng` : `lỗi ${r.status}: ${(await r.text()).slice(0, 160)}`;
    } catch (e) { out.tables[t] = 'lỗi: ' + e.message; }
  }
  out.ok = out.vapid === 'ok' && Object.values(out.tables).every(x => x.startsWith('ok')) && !Object.values(out.env).some(x => x.startsWith('missing'));
  res.status(200).json(out);
};
