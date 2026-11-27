-- =====================================================================
-- Vincenink · kiểm tra cấu hình trên Supabase thật (chỉ ĐỌC, không thay đổi gì)
-- Supabase → SQL Editor → dán và Run từng khối, đối chiếu cột "mong đợi".
-- =====================================================================

-- 1) Quyền trên bảng (mong đợi: authenticated = true ở 2 bảng đầu, anon = false hết, push_log chỉ service_role)
select t.tbl,
  has_table_privilege('authenticated', 'public.'||t.tbl, 'select') as authenticated_select,
  has_table_privilege('authenticated', 'public.'||t.tbl, 'insert') as authenticated_insert,
  has_table_privilege('anon',          'public.'||t.tbl, 'select') as anon_select,
  has_table_privilege('service_role',  'public.'||t.tbl, 'insert') as service_role_insert
from (values ('user_state'), ('push_subscriptions'), ('push_log')) t(tbl);

-- 2) RLS đang bật + policy (mong đợi: rls = true ở cả 3 bảng; 2 policy "own state", "own subs")
select c.relname as tbl, c.relrowsecurity as rls,
  (select string_agg(polname, ', ') from pg_policy p where p.polrelid = c.oid) as policies
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in ('user_state', 'push_subscriptions', 'push_log');

-- 3) Cron đang chạy (mong đợi: active = true, schedule = * * * * *)
select jobid, jobname, schedule, active from cron.job where jobname = 'vincenink-push';

-- 4) 5 lần chạy gần nhất của cron (mong đợi: status = succeeded)
select status, return_message, start_time from cron.job_run_details
where jobid = (select jobid from cron.job where jobname = 'vincenink-push')
order by start_time desc limit 5;

-- 5) Vercel trả lời cron thế nào (mong đợi: status_code = 200 và content có "ok":true)
--    401 = CRON_SECRET trong cron khác biến CRON_SECRET trên Vercel
--    500 "subs"/"state" = máy chủ không đọc được bảng → chạy fix-01-grants.sql / kiểm tra khoá bí mật
select status_code, left(content::text, 300) as content, created
from net._http_response order by created desc limit 5;

-- 6) Số tài khoản đã đồng bộ và số trình duyệt đã bật thông báo
select (select count(*) from public.user_state) as accounts_synced,
       (select count(*) from public.push_subscriptions) as devices_subscribed,
       (select count(*) from public.push_log where sent_at > now() - interval '1 day') as pushes_last_24h;
