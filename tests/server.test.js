// Kiểm thử các hàm máy chủ với fetch & web-push giả lập.  Chạy: node tests/server.test.js
const assert = require('assert');
const path = require('path');
const webpush = require('web-push');
const sent = []; let failEndpoint = null;
webpush.sendNotification = async (s, p) => { if (s.endpoint === failEndpoint) { const e = new Error('gone'); e.statusCode = 410; throw e; } sent.push({ ep: s.endpoint, ...JSON.parse(p) }); };
const keys = webpush.generateVAPIDKeys();
Object.assign(process.env, {
  SUPABASE_URL: 'https://proj.supabase.co/\n', SUPABASE_ANON_KEY: 'sb_publishable_abc', SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_xyz\n',
  VAPID_PUBLIC_KEY: keys.publicKey + '\n', VAPID_PRIVATE_KEY: ' ' + keys.privateKey + '\n', VAPID_SUBJECT: 'mailto:a@b.c', CRON_SECRET: 'cron-123\n',
});
const api = f => require(path.join(__dirname, '..', 'api', f));
const cron = api('push-cron.js'), test = api('push-test.js'), diag = api('diag.js'), config = api('config.js');

const tz = 'Asia/Ho_Chi_Minh';
const fmt = (x, o) => new Intl.DateTimeFormat(o.l, { timeZone: tz, ...o.f }).format(x);
const ymd = x => fmt(x, { l: 'en-CA', f: { year: 'numeric', month: '2-digit', day: '2-digit' } });
const hm = x => fmt(x, { l: 'en-GB', f: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } });

let db, calls;
function reset(lessonInMin = 14.6) {
  const d = new Date(Date.now() + lessonInMin * 60e3);
  db = {
    subs: [{ id: 1, user_id: 'A', endpoint: 'ep-A', p256dh: 'p', auth: 'a' }, { id: 2, user_id: 'B', endpoint: 'ep-B', p256dh: 'p', auth: 'a' }],
    states: [
      { user_id: 'A', reminders: { tz, lang: 'vi', settings: { lead: [15] }, lessons: [{ id: 'L1', date: ymd(d), start: hm(d), end: '23:59', who: 'Lớp 9A', subject: 'Toán' }] } },
      { user_id: 'B', reminders: { tz: 'Europe/London', lang: 'en', settings: { lead: [15] }, lessons: [] } },
    ],
    log: new Set(),
  };
  calls = []; sent.length = 0;
}
global.fetch = async (url, o = {}) => {
  calls.push({ url, headers: o.headers || {} });
  const r = (b, s = 200, h = {}) => ({ ok: s < 300, status: s, json: async () => b, text: async () => JSON.stringify(b), headers: { get: k => h[k.toLowerCase()] } });
  if (url.includes('/auth/v1/user')) return (o.headers.Authorization === 'Bearer jwt-A') ? r({ id: 'A' }) : r({ msg: 'bad' }, 401);
  if (url.includes('push_subscriptions?select=id,user_id')) return r(db.subs);
  if (url.includes('push_subscriptions?select=id,endpoint')) { const u = /user_id=eq\.(\w+)/.exec(url)[1]; return r(db.subs.filter(s => s.user_id === u)); }
  if (url.includes('push_subscriptions?id=eq.')) { const id = +/id=eq\.(\d+)/.exec(url)[1]; db.subs = db.subs.filter(s => s.id !== id); return r([]); }
  if (url.includes('user_state?select=user_id,reminders')) return r(db.states);
  if (url.includes('push_log?on_conflict')) { const b = JSON.parse(o.body), k = b.user_id + '|' + b.key; if (db.log.has(k)) return r([]); db.log.add(k); return r([b], 201); }
  if (url.includes('?select=*&limit=1')) return r([], 200, { 'content-range': '0-0/3' });
  return r([]);
};
const call = (fn, req) => new Promise(res => { const o = { code: 200, h: {}, setHeader(k, v) { this.h[k] = v; }, status(c) { this.code = c; return this; }, json(b) { res({ code: this.code, body: b }); } }; fn({ headers: {}, query: {}, method: 'POST', ...req }, o); });

(async () => {
  let ok = 0; const t = async (name, f) => { await f(); ok++; console.log('✓', name); };

  await t('config: trim env, không lộ khoá bí mật', async () => {
    const { body } = await call(config, {});
    assert.strictEqual(body.vapidPublicKey, keys.publicKey); assert.strictEqual(body.supabaseUrl, 'https://proj.supabase.co');
    assert.ok(body.cloud && body.push); assert.ok(!JSON.stringify(body).includes('sb_secret')); assert.ok(!JSON.stringify(body).includes(keys.privateKey));
  });
  await t('cron: sai / thiếu CRON_SECRET → 401', async () => {
    reset(); assert.strictEqual((await call(cron, { headers: { 'x-cron-secret': 'nope' } })).code, 401);
    assert.strictEqual((await call(cron, {})).code, 401); assert.strictEqual(sent.length, 0);
  });
  await t('cron: gửi nhắc trước 15 phút đúng người, đúng múi giờ', async () => {
    reset(14.6); const { code, body } = await call(cron, { headers: { 'x-cron-secret': 'cron-123' } });
    assert.strictEqual(code, 200, JSON.stringify(body)); assert.strictEqual(body.sent, 1);
    assert.strictEqual(sent[0].ep, 'ep-A'); assert.match(sent[0].title, /15 phút nữa: Lớp 9A/);
  });
  await t('cron: khoá sb_secret chỉ gửi qua header apikey, không có Authorization Bearer', async () => {
    const rest = calls.filter(c => c.url.includes('/rest/v1/'));
    assert.ok(rest.length > 0); rest.forEach(c => { assert.strictEqual(c.headers.apikey, 'sb_secret_xyz'); assert.ok(!('Authorization' in c.headers)); });
  });
  await t('cron: chạy lại cùng phút → không gửi trùng (push_log)', async () => {
    const { body } = await call(cron, { headers: { 'x-cron-secret': 'cron-123' } }); assert.strictEqual(body.sent, 0); assert.strictEqual(sent.length, 1);
  });
  await t('cron: còn 20 phút → chưa gửi; còn 11 phút (đã quá hạn hơn 3 phút) → không gửi muộn', async () => {
    reset(20); assert.strictEqual((await call(cron, { headers: { 'x-cron-secret': 'cron-123' } })).body.sent, 0);
    reset(11); assert.strictEqual((await call(cron, { headers: { 'x-cron-secret': 'cron-123' } })).body.sent, 0);
  });
  await t('cron: đăng ký hết hạn (410) → tự xoá', async () => {
    reset(14.6); failEndpoint = 'ep-A'; const { body } = await call(cron, { headers: { 'x-cron-secret': 'cron-123' } });
    failEndpoint = null; assert.strictEqual(body.removed, 1); assert.ok(!db.subs.find(s => s.endpoint === 'ep-A'));
  });
  await t('múi giờ: 18:00 Hà Nội = 11:00 UTC (cả tên Asia/Saigon); London giờ hè', async () => {
    assert.strictEqual(new Date(cron.at('2026-11-27', '18:00', 'Asia/Ho_Chi_Minh')).toISOString(), '2026-11-27T11:00:00.000Z');
    assert.strictEqual(new Date(cron.at('2026-07-01', '09:00', 'Europe/London')).toISOString(), '2026-07-01T08:00:00.000Z');
    assert.strictEqual(new Date(cron.at('2026-11-27', '18:00', 'Asia/Saigon')).toISOString(), '2026-11-27T11:00:00.000Z'); // Chrome báo 'Asia/Saigon'
  });
  await t('lịch mặc định: 9:00 báo hôm nay, 21:00 báo ngày mai, trước buổi 1 tiếng, có cả ngày trống', async () => {
    const tz = 'Asia/Ho_Chi_Minh', L = (date, start) => ({ id: date + start, date, start, end: '23:00', who: 'Lớp 9A' });
    const st = lessons => ({ reminders: { tz, lang: 'vi', lessons } });
    const at = (d, h) => cron.at(d, h, tz) + 30e3;
    // 28/11 có buổi 15:00, 29/11 trống, 30/11 có buổi
    const ls = [L('2026-11-28', '15:00'), L('2026-11-30', '10:00')];
    let n = cron.dueFor(st(ls), at('2026-11-28', '09:00'));
    assert.ok(n.length === 1 && n[0].key === 'sum|2026-11-28' && /có 1 buổi/.test(n[0].title));
    n = cron.dueFor(st(ls), at('2026-11-28', '07:00')); assert.strictEqual(n.length, 0);
    n = cron.dueFor(st(ls), at('2026-11-28', '14:00'));
    assert.ok(n.length === 1 && /60 phút nữa/.test(n[0].title));
    n = cron.dueFor(st(ls), at('2026-11-28', '21:00'));
    assert.ok(n.length === 1 && n[0].key === 'eve|2026-11-28' && /Ngày mai cậu được nghỉ/.test(n[0].title));
    n = cron.dueFor(st(ls), at('2026-11-29', '09:00'));
    assert.ok(n.length === 1 && /không có buổi dạy nào/.test(n[0].title));
    n = cron.dueFor(st(ls), at('2026-11-29', '21:00'));
    assert.ok(n.length === 1 && /Ngày mai cậu có 1 buổi/.test(n[0].title));
    // tắt "báo ngày trống" → im lặng; chưa có lịch nào → không làm phiền
    assert.strictEqual(cron.dueFor({ reminders: { tz, lessons: ls, settings: { empty: false } } }, at('2026-11-29', '09:00')).length, 0);
    assert.strictEqual(cron.dueFor(st([]), at('2026-11-29', '09:00')).length, 0);
  });
  await t('push-test: không có/ sai JWT → 401', async () => {
    reset(); assert.strictEqual((await call(test, {})).code, 401); assert.strictEqual((await call(test, { headers: { authorization: 'Bearer jwt-B' } })).code, 401);
  });
  await t('push-test: chỉ gửi tới thiết bị của chính người dùng', async () => {
    reset(); const { code, body } = await call(test, { headers: { authorization: 'Bearer jwt-A' }, body: { lang: 'vi' } });
    assert.strictEqual(code, 200, JSON.stringify(body)); assert.deepStrictEqual(sent.map(s => s.ep), ['ep-A']);
    const authCall = calls.find(c => c.url.includes('/auth/v1/user')); assert.strictEqual(authCall.headers.apikey, 'sb_publishable_abc');
  });
  await t('push-test: giới hạn tần suất', async () => { assert.strictEqual((await call(test, { headers: { authorization: 'Bearer jwt-A' } })).code, 429); });
  await t('diag: cần khoá, báo env/VAPID/bảng', async () => {
    assert.strictEqual((await call(diag, { method: 'GET', query: { key: 'x' } })).code, 401);
    const { body } = await call(diag, { method: 'GET', query: { key: 'cron-123' } });
    assert.strictEqual(body.vapid, 'ok'); assert.ok(body.ok, JSON.stringify(body)); assert.match(body.env.VAPID_PUBLIC_KEY, /thừa/);
    assert.ok(!JSON.stringify(body).includes('sb_secret_xyz'));
  });
  console.log(`\n${ok} kiểm thử máy chủ đều đạt`);
})().catch(e => { console.error('✗', e); process.exit(1); });
