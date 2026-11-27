// Kiểm thử phân quyền (RLS + GRANT) của supabase/setup.sql trên Postgres thật (PGlite, chạy trong Node).
// Mô phỏng dự án Supabase mới: có các vai trò anon / authenticated / service_role, KHÔNG có quyền mặc định.
// Chạy: node tests/rls.test.mjs   (cần: npm i @electric-sql/pglite)
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'fs';
import assert from 'assert';

const A = '00000000-0000-0000-0000-00000000000a', B = '00000000-0000-0000-0000-00000000000b';
const setup = readFileSync(new URL('../supabase/setup.sql', import.meta.url), 'utf8').split('-- 5) Hẹn giờ')[0]; // bỏ pg_cron/pg_net
const fix = readFileSync(new URL('../supabase/fix-01-grants.sql', import.meta.url), 'utf8');

async function fresh(withGrants) {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    create schema auth; create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid $$;
    grant usage on schema auth to anon, authenticated, service_role; grant execute on function auth.uid() to anon, authenticated, service_role;
    grant usage on schema public to anon, authenticated, service_role;
    insert into auth.users values ('${A}'), ('${B}');`);
  let sql = setup;
  if (!withGrants) sql = sql.split('-- 4b)')[0]; // setup.sql cũ (chưa có GRANT)
  await db.exec(sql.replace(/notify pgrst[^;]*;/g, ''));
  return db;
}
const as = async (db, role, sub, q, params) => {
  await db.exec(`reset role; select set_config('request.jwt.claims', '${sub ? JSON.stringify({ sub }) : ''}', false); set role ${role};`);
  try { return await db.query(q, params); } finally { await db.exec('reset role;'); }
};
const denied = async p => { try { await p; return false; } catch (e) { return /permission denied|row-level security/i.test(e.message) ? e.message : (() => { throw e; })(); } };

let n = 0; const t = async (name, f) => { await f(); n++; console.log('✓', name); };

const old = await fresh(false);
await t('setup.sql CŨ (không GRANT) trên dự án mới → người dùng bị "permission denied" (lỗi đã tìm thấy)', async () => {
  assert.ok(await denied(as(old, 'authenticated', A, `insert into public.user_state (user_id) values ($1)`, [A])));
});
await t('chạy fix-01-grants.sql trên dự án cũ → hết lỗi', async () => {
  await old.exec(fix.replace(/notify pgrst[^;]*;/g, ''));
  await as(old, 'authenticated', A, `insert into public.user_state (user_id) values ($1)`, [A]);
});

const db = await fresh(true);
await t('A ghi & đọc được trạng thái của chính mình', async () => {
  await as(db, 'authenticated', A, `insert into public.user_state (user_id, profile) values ($1, '{"name":"A"}')`, [A]);
  await as(db, 'authenticated', B, `insert into public.user_state (user_id, profile) values ($1, '{"name":"B"}')`, [B]);
  const r = await as(db, 'authenticated', A, `select user_id, profile->>'name' n from public.user_state`);
  assert.deepStrictEqual(r.rows, [{ user_id: A, n: 'A' }]);
});
await t('A KHÔNG đọc / sửa / xoá được dữ liệu của B', async () => {
  const up = await as(db, 'authenticated', A, `update public.user_state set profile='{"name":"hack"}' where user_id=$1`, [B]);
  assert.strictEqual(up.affectedRows, 0);
  const del = await as(db, 'authenticated', A, `delete from public.user_state where user_id=$1`, [B]);
  assert.strictEqual(del.affectedRows, 0);
  const r = await as(db, 'service_role', null, `select profile->>'name' n from public.user_state where user_id=$1`, [B]);
  assert.strictEqual(r.rows[0].n, 'B');
});
await t('A KHÔNG chèn được dòng mang user_id của B (with check)', async () => {
  assert.ok(await denied(as(db, 'authenticated', A, `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1,'e-b','p','a')`, [B])));
});
await t('đăng ký nhận thông báo: A thêm của mình được, chỉ thấy của mình', async () => {
  await as(db, 'authenticated', A, `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1,'e-a','p','a')`, [A]);
  await as(db, 'service_role', null, `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1,'e-b2','p','a')`, [B]);
  const r = await as(db, 'authenticated', A, `select endpoint from public.push_subscriptions`);
  assert.deepStrictEqual(r.rows.map(x => x.endpoint), ['e-a']);
});
await t('upsert theo endpoint (như supabase-js onConflict) hoạt động với người dùng thường', async () => {
  await as(db, 'authenticated', A, `insert into public.push_subscriptions (user_id, endpoint, p256dh, auth) values ($1,'e-a','p2','a2') on conflict (endpoint) do update set p256dh=excluded.p256dh, auth=excluded.auth`, [A]);
});
await t('boards: mỗi tài khoản chỉ thấy/sửa bảng vẽ của mình', async () => {
  await as(db, 'authenticated', A, `insert into public.boards (user_id, id, meta, data) values ($1,'b1','{"title":"A1"}','{"items":[]}')`, [A]);
  await as(db, 'authenticated', B, `insert into public.boards (user_id, id, meta, data) values ($1,'b1','{"title":"B1"}','{"items":[]}')`, [B]);
  const r = await as(db, 'authenticated', A, `select meta->>'title' t from public.boards`);
  assert.deepStrictEqual(r.rows.map(x => x.t), ['A1']);
  assert.ok(await denied(as(db, 'authenticated', A, `insert into public.boards (user_id, id) values ($1,'x')`, [B])));
  const up = await as(db, 'authenticated', A, `update public.boards set meta='{"title":"hack"}' where user_id=$1`, [B]);
  assert.strictEqual(up.affectedRows || 0, 0);
  assert.ok(await denied(as(db, 'anon', null, `select * from public.boards`)));
});
await t('push_log: người dùng không đọc/ghi được; máy chủ ghi được và chống trùng', async () => {
  assert.ok(await denied(as(db, 'authenticated', A, `select * from public.push_log`)));
  const a = await as(db, 'service_role', null, `insert into public.push_log (user_id, key) values ($1,'les|x|15') on conflict do nothing returning key`, [A]);
  const b = await as(db, 'service_role', null, `insert into public.push_log (user_id, key) values ($1,'les|x|15') on conflict do nothing returning key`, [A]);
  assert.strictEqual(a.rows.length, 1); assert.strictEqual(b.rows.length, 0);
});
await t('khách chưa đăng nhập (anon) không truy cập được bảng nào', async () => {
  for (const tb of ['user_state', 'push_subscriptions', 'push_log']) assert.ok(await denied(as(db, 'anon', null, `select * from public.${tb}`)));
});
await t('máy chủ (service_role) đọc được lịch của mọi người để gửi nhắc', async () => {
  const r = await as(db, 'service_role', null, `select count(*)::int c from public.user_state`); assert.strictEqual(r.rows[0].c, 2);
});
await t('xoá tài khoản → dữ liệu tự xoá theo (on delete cascade)', async () => {
  await db.exec(`delete from auth.users where id='${B}'`);
  const r = await as(db, 'service_role', null, `select (select count(*) from public.user_state where user_id=$1)::int s, (select count(*) from public.push_subscriptions where user_id=$1)::int p`, [B]);
  assert.deepStrictEqual(r.rows[0], { s: 0, p: 0 });
});
console.log(`\n${n} kiểm thử phân quyền đều đạt`);
