-- Vincenink — bản vá 02 (v34): thêm bảng `boards` để sao lưu bảng vẽ khi đã đăng nhập.
-- Chạy 1 lần trong Supabase → SQL Editor → New query → dán toàn bộ → Run. Chạy lại nhiều lần cũng an toàn.
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

-- Kiểm tra nhanh (mong đợi: authenticated = true, anon = false, rls = true)
select has_table_privilege('authenticated', 'public.boards', 'insert') as authenticated,
       has_table_privilege('anon', 'public.boards', 'select') as anon,
       (select relrowsecurity from pg_class where oid = 'public.boards'::regclass) as rls;
