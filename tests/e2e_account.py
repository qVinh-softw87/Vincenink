# Kiểm thử trình duyệt (Playwright) cho tài khoản + đồng bộ + thông báo, với Supabase GIẢ LẬP có RLS theo token.
# Chạy: python3 -m http.server 8765 (trong thư mục dự án) rồi: python3 tests/e2e_account.py
import asyncio, json, time, uuid, sys
from playwright.async_api import async_playwright

USERS = {}      # email -> {id, password, confirmed}
TOKENS = {}     # token -> user id
STATE = {}      # user id -> row
SUBS = {}       # endpoint -> row
BOARDS = {}     # (user id, board id) -> row
LOG = {'denied': False, 'pushtest_auth': []}

def user_obj(uid, email): return {"id": uid, "aud": "authenticated", "role": "authenticated", "email": email, "app_metadata": {"provider": "email"}, "user_metadata": {}, "created_at": "2026-11-01T00:00:00Z"}
def session(uid, email):
    tok = 'tok-' + uuid.uuid4().hex; TOKENS[tok] = uid
    return {"access_token": tok, "token_type": "bearer", "expires_in": 3600, "expires_at": int(time.time()) + 3600, "refresh_token": 'r-' + tok, "user": user_obj(uid, email)}

async def supabase(route):
    req = route.request; u = req.url; m = req.method
    auth = req.headers.get('authorization', ''); uid = TOKENS.get(auth.replace('Bearer ', ''))
    if '/auth/v1/signup' in u:
        b = json.loads(req.post_data); USERS[b['email']] = {'id': str(uuid.uuid4()), 'password': b['password'], 'confirmed': False}
        return await route.fulfill(json=user_obj(USERS[b['email']]['id'], b['email']))
    if '/auth/v1/token' in u:
        b = json.loads(req.post_data); us = USERS.get(b.get('email'))
        if not us or us['password'] != b.get('password'): return await route.fulfill(status=400, json={"error": "invalid_grant", "error_description": "Invalid login credentials", "msg": "Invalid login credentials", "code": "invalid_credentials"})
        if not us['confirmed']: return await route.fulfill(status=400, json={"msg": "Email not confirmed", "code": "email_not_confirmed"})
        return await route.fulfill(json=session(us['id'], b['email']))
    if '/auth/v1/settings' in u: return await route.fulfill(json={"external": {"email": True, "google": LOG.get('google', False)}})
    if '/auth/v1/resend' in u: LOG['resend'] = LOG.get('resend', 0) + 1; return await route.fulfill(json={})
    if '/auth/v1/logout' in u: return await route.fulfill(status=204, body='')
    if '/auth/v1/user' in u:
        if not uid: return await route.fulfill(status=401, json={})
        email = next(e for e, x in USERS.items() if x['id'] == uid); return await route.fulfill(json=user_obj(uid, email))
    if '/rest/v1/' in u:
        if LOG['denied']: return await route.fulfill(status=401, json={"code": "42501", "message": "permission denied for table user_state"})
        if not uid: return await route.fulfill(status=401, json={"code": "42501", "message": "permission denied"})
        if '/rest/v1/user_state' in u:
            if m == 'GET':   # RLS: chỉ thấy dòng của chính mình
                row = STATE.get(uid)
                return await route.fulfill(status=200 if row else 406, json=row if row else {"code": "PGRST116"}, headers={'content-type': 'application/vnd.pgrst.object+json'}) if 'vnd.pgrst.object' in req.headers.get('accept', '') else await route.fulfill(json=[row] if row else [])
            b = json.loads(req.post_data); b = b[0] if isinstance(b, list) else b
            if b['user_id'] != uid: return await route.fulfill(status=403, json={"code": "42501", "message": "new row violates row-level security policy"})
            STATE[uid] = b; return await route.fulfill(status=201, body='')
        if '/rest/v1/boards' in u and LOG.get('noboards'): return await route.fulfill(status=404, json={"code": "PGRST205", "message": "Could not find the table 'public.boards' in the schema cache"})
        if '/rest/v1/boards' in u:
            from urllib.parse import urlparse, parse_qs
            qs = parse_qs(urlparse(u).query)
            if m == 'GET':
                rows = [r for (o, _), r in BOARDS.items() if o == uid]
                if 'id' in qs: rows = [r for r in rows if 'eq.' + r['id'] == qs['id'][0]]
                cols = qs.get('select', ['*'])[0].split(',')
                rows = [r if cols == ['*'] else {c: r.get(c) for c in cols} for r in rows]
                if 'vnd.pgrst.object' in req.headers.get('accept', ''):
                    return await route.fulfill(json=rows[0], headers={'content-type': 'application/vnd.pgrst.object+json'}) if rows else await route.fulfill(status=406, json={"code": "PGRST116"})
                return await route.fulfill(json=rows)
            b = json.loads(req.post_data); b = b[0] if isinstance(b, list) else b
            if b['user_id'] != uid: return await route.fulfill(status=403, json={"code": "42501", "message": "new row violates row-level security policy"})
            BOARDS[(uid, b['id'])] = b; return await route.fulfill(status=201, body='')
        if '/rest/v1/push_subscriptions' in u:
            if m == 'DELETE':
                for ep in [e for e, r in SUBS.items() if r['user_id'] == uid]: SUBS.pop(ep)
                return await route.fulfill(status=204, body='')
            b = json.loads(req.post_data); b = b[0] if isinstance(b, list) else b
            if b['user_id'] != uid: return await route.fulfill(status=403, json={"code": "42501"})
            SUBS[b['endpoint']] = b; return await route.fulfill(status=201, body='')
    await route.fulfill(status=404, json={})

FAKE_PUSH = """
  Object.defineProperty(Notification, 'permission', { get: () => 'granted' });
  Notification.requestPermission = async () => 'granted';
  const fakeSub = { endpoint: 'https://fcm.googleapis.com/fcm/send/' + (localStorage.getItem('vincenink.device') || 'dev'), toJSON() { return { endpoint: this.endpoint, keys: { p256dh: 'BP' , auth: 'AU' } }; }, unsubscribe: async () => { window.__unsub = true; return true; } };
  let has = false;
  const pm = { getSubscription: async () => has ? fakeSub : null, subscribe: async () => { has = true; return fakeSub; } };
  const reg = { pushManager: pm, scope: location.origin + '/' };
  Object.defineProperty(navigator, 'serviceWorker', { value: { register: async () => reg, ready: Promise.resolve(reg), getRegistration: async () => reg } });
  window.PushManager = function () {};
"""

async def page(b, name):
    ctx = await b.new_context(viewport={'width': 1280, 'height': 900}, timezone_id='Asia/Ho_Chi_Minh')
    await ctx.route('**/api/config', lambda r: r.fulfill(json={"cloud": True, "push": True, "supabaseUrl": "https://mock.supabase.co", "supabaseAnonKey": "sb_publishable_mock", "vapidPublicKey": "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"}))
    await ctx.route('**/api/assistant', lambda r: r.fulfill(json={"ok": True, "configured": False}))
    async def pt(r): LOG['pushtest_auth'].append(r.request.headers.get('authorization', '')); await r.fulfill(json={"ok": True, "sent": 1})
    await ctx.route('**/api/push-test', pt)
    for pat in ['**/api/geo', '**/api.open-meteo.com/**', '**/api.bigdatacloud.net/**']: await ctx.route(pat, lambda r: r.fulfill(status=500, body=''))
    await ctx.route('https://mock.supabase.co/**', supabase)
    p = await ctx.new_page(); p.errs = []
    p.on('pageerror', lambda e: p.errs.append(str(e)))
    await p.add_init_script("localStorage.setItem('vincenink.visited','1');" + FAKE_PUSH)
    await p.goto('http://localhost:8765/index.html'); await p.wait_for_timeout(1800)
    await p.evaluate("showGreet(false); document.querySelector('#welcome')?.classList.add('hidden')")
    return ctx, p

async def open_acct(p):
    await p.evaluate("document.querySelectorAll('.modal-back').forEach(x=>x.remove()); accountModal()"); await p.wait_for_timeout(300)
async def login(p, email, pw, tab='in'):
    await open_acct(p)
    if tab == 'up': await p.click('#acctModal [data-tab=up]')
    await p.fill('#acctModal [name=email]', email); await p.fill('#acctModal [name=pw]', pw)
    if tab == 'up': await p.fill('#acctModal [name=pw2]', pw)
    await p.click('#acctModal form .btn.primary'); await p.wait_for_timeout(2500)
msg = lambda p: p.evaluate("document.querySelector('#acctModal .acct-msg')?.textContent || ''")

async def main():
    n = 0
    def ok(name): nonlocal n; n += 1; print('✓', name)
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        ctx1, p = await page(b, 'may1')
        await p.evaluate("""(async()=>{ const st={id:'c1',name:'Lớp 9A',color:'#c66',fee:250000,feePaid:{'2026-11':true},created:Date.now()}; await DB.put('students',st); S.students.push(st);
          const sc=sched('c1'); sc.fixed.push({id:'f1',dow:3,start:'18:00',end:'19:30',subject:'Toán'}); await saveSched('c1'); renderSidebar(); })()""")

        await open_acct(p)
        assert not await p.evaluate("!!document.querySelector('#acctModal [data-a=google]')"); ok('Google chưa bật trên Supabase → ẩn nút Google (không còn lỗi "provider is not enabled")')
        LOG['google'] = True; await p.evaluate("fetch(Cloud.cfg.supabaseUrl+'/auth/v1/settings').then(r=>r.json()).then(j=>{Cloud.providers=j.external})"); await p.wait_for_timeout(300); await open_acct(p)
        assert await p.evaluate("!!document.querySelector('#acctModal [data-a=google]')"); ok('Google đã bật → hiện nút "Tiếp tục với Google"')
        await login(p, 'a@test.vn', 'matkhau123', 'up')
        body = await p.evaluate("document.querySelector('.mail-pop')?.innerText || ''")
        assert 'Kiểm tra hộp thư' in body and 'a@test.vn' in body; ok('Đăng ký email → hiện cửa sổ "Kiểm tra hộp thư của bạn" kèm email')
        await p.click('.mail-pop [data-m=resend]'); await p.wait_for_timeout(500)
        assert LOG.get('resend') == 1 and 'Đã gửi lại' in await p.evaluate("document.querySelector('.mail-pop .mp-msg').textContent"); ok('Nút "Gửi lại email" hoạt động (giới hạn 60 giây)')
        await p.screenshot(path='/tmp/mailpop.png')
        await login(p, 'a@test.vn', 'matkhau123')
        assert 'chưa được xác nhận' in await p.evaluate("document.querySelector('.mail-pop')?.innerText || ''"); ok('Đăng nhập khi chưa xác nhận → hiện cửa sổ "Email chưa được xác nhận" + gửi lại')
        USERS['a@test.vn']['confirmed'] = True
        await login(p, 'a@test.vn', 'sai-mat-khau')
        assert 'chưa đúng' in (await msg(p)); ok('Sai mật khẩu → báo "Email hoặc mật khẩu chưa đúng"')
        await login(p, 'a@test.vn', 'matkhau123'); await p.wait_for_timeout(3500)
        assert 'Xác nhận email thành công' in await p.evaluate("document.body.innerText"); ok('Xác nhận xong, đăng nhập lần đầu → hiện cửa sổ chúc mừng')
        A = USERS['a@test.vn']['id']; row = STATE.get(A)
        assert row and [c['name'] for c in row['classes'] if not c.get('deleted')] == ['Lớp 9A'] and 'c1' in row['schedule']; ok('Đăng nhập → đẩy lớp + lịch lên user_state của A')
        c1 = next(c for c in row['classes'] if c['id'] == 'c1')
        assert c1['fee'] == 250000 and c1['feePaid'] == {'2026-11': True} and 'files' not in json.dumps(row); ok('Đăng nhập → sao lưu cả học phí của lớp (tài liệu thì không)')
        await p.evaluate("(async()=>{ E.items.push({type:'image',x:0,y:0,w:200,h:200,src:'data:image/png;base64,'+'A'.repeat(10)}, {type:'path',pts:[[0,0],[5,5]],color:'#000',size:2}); scheduleSave(true); await doSave(); })()"); await p.wait_for_timeout(5500)
        bid = await p.evaluate("S.boardId"); brow = BOARDS.get((A, bid))
        assert brow and len(brow['data']['items']) == 2 and brow['meta']['title'] and not brow['deleted']; ok('Vẽ lên bảng → tự sao lưu bảng vẽ lên bảng `boards` của A')
        assert not await p.evaluate("document.querySelector('.board-card .bk')") ; ok('Đã đăng nhập → không còn nhãn "tự xoá sau N ngày"')
        assert row['reminders']['tz'] in ('Asia/Ho_Chi_Minh', 'Asia/Saigon') and len(row['reminders']['lessons']) > 0; ok('Gửi kèm múi giờ + danh sách buổi học 5 tuần tới cho máy chủ')

        await p.evaluate("S.settings.profile={...profile(), name:'Nguyễn Vĩnh', school:'THCS A'}; saveSettings(); Cloud.queue(true)"); await p.wait_for_timeout(1200)
        assert STATE[A]['profile']['name'] == 'Nguyễn Vĩnh'; ok('Sửa hồ sơ → tự đồng bộ')

        await open_acct(p)
        if await p.evaluate("!!document.querySelector('#acctModal [data-a=pushon]')"): await p.click('#acctModal [data-a=pushon]'); await p.wait_for_timeout(1500)
        assert any(s['user_id'] == A for s in SUBS.values()) and await p.evaluate("Cloud.pushOn"); ok('Bật thông báo (đã cho phép từ trước thì tự đăng ký) → lưu push_subscriptions của A')
        assert json.loads(await p.evaluate("localStorage.getItem('vincenink.reminders')"))['serverPush'] is True; ok('Đã bật thông báo máy chủ → tiện ích/trang tự im để không báo trùng')
        await open_acct(p); await p.click('#acctModal [data-a=pushtest]'); await p.wait_for_timeout(800)
        assert LOG['pushtest_auth'] and LOG['pushtest_auth'][-1].startswith('Bearer tok-'); ok('Gửi thử: gọi /api/push-test bằng JWT phiên đăng nhập (không dùng khoá bí mật)')

        await open_acct(p); await p.click('#acctModal [data-a=out]'); await p.wait_for_timeout(300)
        await p.click('.modal .btn.danger'); await p.wait_for_timeout(1500)
        assert not await p.evaluate("!!Cloud.user") and await p.evaluate("S.students.length") == 1 and not any(s['user_id'] == A for s in SUBS.values()); ok('Đăng xuất → còn dữ liệu tới khi đóng trang, máy này ngừng nhận thông báo')

        ctx2, q = await page(b, 'may2')
        await login(q, 'a@test.vn', 'matkhau123'); await q.wait_for_timeout(3000)
        names = await q.evaluate("S.students.map(s=>s.name)"); fixed = await q.evaluate("(sched('c1').fixed||[]).length")
        assert names == ['Lớp 9A'] and fixed == 1 and await q.evaluate("profile().name") == 'Nguyễn Vĩnh'; ok('Máy khác đăng nhập lại → có đủ hồ sơ, lớp, lịch')
        assert await q.evaluate("studentById('c1').fee") == 250000 and await q.evaluate("studentById('c1').feePaid['2026-11']"); ok('Máy khác nhận đủ học phí + tháng đã thu')
        assert await q.evaluate(f"(async()=>{{ const d = await DB.get('boardData', '{bid}'); return !!S.boards.find(x=>x.id==='{bid}') && d.items.length }})()") == 2; ok('Máy khác tải về đủ bảng vẽ')
        await q.evaluate(f"(async()=>{{ await DB.del('boards','{bid}'); await DB.del('boardData','{bid}'); Cloud.markBoardDeleted('{bid}'); }})()"); await q.wait_for_timeout(5000)
        assert BOARDS[(A, bid)]['deleted'] is True; ok('Xoá bảng ở máy 2 → máy chủ ghi dấu đã xoá')

        await q.evaluate("sched('c1').sessions.push({id:'s9',date:todayStr(),start:'20:00',end:'21:00',subject:'Ôn thi'}); saveSched('c1'); Cloud.queue(true)"); await q.wait_for_timeout(1500)
        await p.evaluate("Cloud"); await login(p, 'a@test.vn', 'matkhau123'); await p.wait_for_timeout(3000)
        assert await p.evaluate("sched('c1').sessions.some(x=>x.id==='s9')"); ok('Sửa lịch ở máy 2 → máy 1 nhận được khi đăng nhập lại')

        USERS['b@test.vn'] = {'id': str(uuid.uuid4()), 'password': 'matkhau456', 'confirmed': True}; B = USERS['b@test.vn']['id']
        await open_acct(p); await p.click('#acctModal [data-a=out]'); await p.wait_for_timeout(300); await p.click('.modal .btn.danger'); await p.wait_for_timeout(1200)
        await login(p, 'b@test.vn', 'matkhau456'); await p.wait_for_timeout(800)
        assert 'tài khoản khác' in await p.evaluate("document.body.innerText"); ok('Đổi sang tài khoản B trên cùng máy → hỏi trước khi gộp dữ liệu')
        await p.evaluate("[...document.querySelectorAll('.modal .btn')].find(x=>/Huỷ|Cancel/.test(x.textContent)).click()"); await p.wait_for_timeout(1500)
        assert B not in STATE and not await p.evaluate("!!Cloud.user"); ok('Chọn Huỷ → đăng xuất, KHÔNG đẩy dữ liệu của A vào tài khoản B')

        ctx3, r = await page(b, 'may3')
        await login(r, 'b@test.vn', 'matkhau456'); await r.wait_for_timeout(2500)
        assert await r.evaluate("S.students.length") == 0 and STATE.get(B) and STATE[B]['classes'] == []; ok('Tài khoản B (máy mới) không thấy lớp/lịch của A — RLS chỉ trả dòng của B')

        LOG['denied'] = True
        await r.evaluate("Cloud.lastHash=''; Cloud.queue(true)"); await r.wait_for_timeout(1200); await open_acct(r)
        t_err = await r.evaluate("document.querySelector('#acctModal .acct-err')?.textContent || ''")
        assert 'fix-01-grants' in t_err; ok('Máy chủ thiếu quyền bảng → hiện hướng dẫn chạy fix-01-grants.sql')
        LOG['denied'] = False
        LOG['noboards'] = True
        await r.evaluate("Cloud.syncedAt=0; Cloud.pull()"); await r.wait_for_timeout(1500); await open_acct(r)
        t_err = await r.evaluate("document.querySelector('#acctModal .acct-err')?.textContent || ''")
        await r.evaluate("S.settings.profile={...profile(), name:'B2'}; saveSettings(); Cloud.lastHash=''; Cloud.queue(true)"); await r.wait_for_timeout(1200)
        assert 'fix-02-boards' in t_err and STATE[B]['profile'].get('name') == 'B2'; ok('Chưa chạy fix-02-boards.sql → báo hướng dẫn, lịch/hồ sơ vẫn đồng bộ bình thường')
        LOG['noboards'] = False

        errs = p.errs + q.errs + r.errs
        assert not errs, errs; ok('Không có lỗi JavaScript')
        await b.close()
    print(f'\n{n} kiểm thử trình duyệt đều đạt')

if __name__ == '__main__':
    asyncio.run(main())
