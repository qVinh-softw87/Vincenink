// Tiện ích dùng chung cho các hàm máy chủ (Vercel không coi tệp bắt đầu bằng "_" là endpoint).
// - env(): đọc biến môi trường, bỏ khoảng trắng / xuống dòng / dấu nháy thừa khi dán.
// - sbHeaders(): khoá mới sb_publishable_/sb_secret_ KHÔNG phải JWT → chỉ gửi qua header `apikey`.
const env = k => String(process.env[k] || '').trim().replace(/^["']|["']$/g, '').trim();
const isJwt = k => /^eyJ[\w-]+\.[\w-]+\.[\w-]+$/.test(k);
function sbHeaders(key, userJwt) {
  const h = { apikey: key, 'Content-Type': 'application/json' };
  if (userJwt) h.Authorization = `Bearer ${userJwt}`;
  else if (isJwt(key)) h.Authorization = `Bearer ${key}`; // khoá legacy service_role (JWT)
  return h;
}
const base = () => env('SUPABASE_URL').replace(/\/+$/, '');
/* Gọi PostgREST bằng khoá bí mật (bỏ qua RLS) — chỉ dùng phía máy chủ */
function admin(path, opts = {}) {
  return fetch(`${base()}/rest/v1/${path}`, { ...opts, headers: { ...sbHeaders(env('SUPABASE_SERVICE_ROLE_KEY')), ...(opts.headers || {}) } });
}
/* Xác minh JWT của người dùng bằng Supabase Auth → trả về user hoặc null */
async function userFromJwt(jwt) {
  if (!jwt) return null;
  const r = await fetch(`${base()}/auth/v1/user`, { headers: sbHeaders(env('SUPABASE_ANON_KEY'), jwt) });
  if (!r.ok) return null;
  const u = await r.json();
  return u && u.id ? u : null;
}
function vapid(webpush) {
  webpush.setVapidDetails(env('VAPID_SUBJECT') || 'mailto:hello@vincenink.app', env('VAPID_PUBLIC_KEY'), env('VAPID_PRIVATE_KEY'));
}
module.exports = { env, isJwt, sbHeaders, admin, userFromJwt, vapid, base };
