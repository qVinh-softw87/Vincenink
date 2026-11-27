// Cấu hình công khai cho trình duyệt (không có khoá bí mật nào ở đây).
// Đặt trong Vercel → Settings → Environment Variables:
//   SUPABASE_URL, SUPABASE_ANON_KEY, VAPID_PUBLIC_KEY
module.exports = function handler(req, res) {
  res.setHeader('Cache-Control', 'public, max-age=300');
  const url = process.env.SUPABASE_URL || '', anon = process.env.SUPABASE_ANON_KEY || '', vapid = process.env.VAPID_PUBLIC_KEY || '';
  res.status(200).json({
    supabaseUrl: url, supabaseAnonKey: anon, vapidPublicKey: vapid,
    cloud: !!(url && anon),
    push: !!(url && anon && vapid && process.env.VAPID_PRIVATE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
  });
};
