-- =====================================================================
-- Vincenink · Supabase setup (chạy 1 lần trong Supabase → SQL Editor)
-- Lưu: lịch học + hồ sơ + danh sách lớp (để nhắc lịch), đăng ký nhận thông báo.
-- Học phí, bảng vẽ, tài liệu KHÔNG được lưu ở đây — vẫn nằm trên máy người dùng.
-- =====================================================================

-- 1) Trạng thái đồng bộ của mỗi tài khoản (1 dòng / người dùng)
create table if not exists public.user_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  profile    jsonb not null default '{}'::jsonb,   -- tên, vai trò, trường, avatar (nhỏ)…
  classes    jsonb not null default '[]'::jsonb,   -- [{id,name,color,grade}]
  schedule   jsonb not null default '{}'::jsonb,   -- { classId: {fixed, sessions, overrides, skips, weekNotes} }
  reminders  jsonb not null default '{}'::jsonb,   -- { settings, lessons (5 tuần tới), lang, tz }
  updated_at timestamptz not null default now(),
  device     text
);

-- 2) Nơi trình duyệt nhận thông báo (mỗi máy / trình duyệt một dòng)
create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  ua         text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user on public.push_subscriptions(user_id);

-- 3) Nhật ký đã gửi (chống gửi trùng) — chỉ máy chủ dùng
create table if not exists public.push_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  key     text not null,
  sent_at timestamptz not null default now(),
  primary key (user_id, key)
);

-- 4) Bảo mật theo dòng: mỗi người chỉ đọc/ghi dữ liệu của chính mình
alter table public.user_state         enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.push_log           enable row level security;  -- không có policy → chỉ service role

drop policy if exists "own state" on public.user_state;
create policy "own state" on public.user_state
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own subs" on public.push_subscriptions;
create policy "own subs" on public.push_subscriptions
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4b) Quyền Data API (dự án tạo từ 30/05/2026 không còn tự cấp quyền cho bảng mới)
grant select, insert, update, delete on public.user_state         to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant usage, select on sequence public.push_subscriptions_id_seq  to authenticated;
revoke all on public.user_state, public.push_subscriptions, public.push_log from anon;
revoke all on public.push_log from authenticated;
grant select, insert, update, delete on public.user_state, public.push_subscriptions, public.push_log to service_role;
grant usage, select on sequence public.push_subscriptions_id_seq to service_role;
notify pgrst, 'reload schema';

-- 4c) Bảng vẽ (sao lưu khi đã đăng nhập) — mỗi bảng một dòng, chỉ chủ tài khoản đọc/ghi được
create table if not exists public.boards (
  user_id    uuid not null references auth.users(id) on delete cascade,
  id         text not null,
  meta       jsonb not null default '{}'::jsonb,
  data       jsonb,
  deleted    boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
alter table public.boards enable row level security;
drop policy if exists "own boards" on public.boards;
create policy "own boards" on public.boards
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
revoke all on public.boards from anon;
grant select, insert, update, delete on public.boards to authenticated, service_role;
notify pgrst, 'reload schema';

-- 5) Hẹn giờ: mỗi phút gọi Vercel để gửi nhắc lịch
--    ĐỔI 2 giá trị bên dưới: địa chỉ web của bạn và CRON_SECRET (giống biến trên Vercel)
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('vincenink-push') where exists (select 1 from cron.job where jobname = 'vincenink-push');
select cron.schedule(
  'vincenink-push',
  '* * * * *',
  $$
  select net.http_post(
    url     := 'https://vincenink.vercel.app/api/push-cron',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', 'DOI-THANH-CRON-SECRET-CUA-BAN'),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
  $$
);

-- Xem lịch sử chạy:  select * from cron.job_run_details order by start_time desc limit 20;
-- Tắt hẹn giờ:       select cron.unschedule('vincenink-push');
