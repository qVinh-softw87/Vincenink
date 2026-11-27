// Cấu hình công khai cho trình duyệt (không có khoá bí mật nào ở đây).
// Đặt trong Vercel → Settings → Environment Variables:
//   SUPABASE_URL, SUPABASE_ANON_KEY, VAPID_PUBLIC_KEY
const { env } = require('./_supa');
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  const url = env('SUPABASE_URL').replace(/\/+$/, ''), anon = env('SUPABASE_ANON_KEY'), vapid = env('VAPID_PUBLIC_KEY');
  res.status(200).json({
    supabaseUrl: url, supabaseAnonKey: anon, vapidPublicKey: vapid,
    cloud: !!(url && anon),
    push: !!(url && anon && vapid && env('VAPID_PRIVATE_KEY') && env('SUPABASE_SERVICE_ROLE_KEY')),
  });
};
