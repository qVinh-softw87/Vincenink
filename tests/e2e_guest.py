# Kiểm thử chế độ khách (chưa đăng nhập): dữ liệu chỉ sống trong phiên.
# Chạy: python3 -m http.server 8765 &  rồi  python3 tests/e2e_guest.py
import asyncio, sys
sys.path.insert(0, 'tests')
import e2e_account as E
from playwright.async_api import async_playwright

URL = 'http://localhost:8765/index.html'
ADD = """(async()=>{ const st={id:'%s',name:'%s',color:'#c66',created:Date.now(),createdAt:Date.now()}; await DB.put('students',st); S.students.push(st);
  E.items.push({type:'path',pts:[[0,0],[9,9]],color:'#000',size:2}); scheduleSave(true); await doSave(); })()"""

async def ctx_of(b):
    ctx = await b.new_context(viewport={'width': 1280, 'height': 900})
    await ctx.route('**/api/config', lambda r: r.fulfill(json={"cloud": True, "push": True, "supabaseUrl": "https://mock.supabase.co", "supabaseAnonKey": "sb_publishable_mock", "vapidPublicKey": "x"}))
    for pat in ['**/api/assistant', '**/api/geo', '**/api.open-meteo.com/**', '**/api.bigdatacloud.net/**']: await ctx.route(pat, lambda r: r.fulfill(status=500, body=''))
    await ctx.route('https://mock.supabase.co/**', E.supabase)
    return ctx

async def opn(ctx, errs):
    p = await ctx.new_page(); p.on('pageerror', lambda e: errs.append(str(e)))
    await p.goto(URL); await p.wait_for_timeout(1500); return p

async def names(p): return await p.evaluate("S.students.map(s=>s.name)")

async def main():
    n = 0; errs = []
    def ok(name): nonlocal n; n += 1; print('✓', name)
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')

        # 1) Khách mới hoàn toàn
        ctx = await ctx_of(b); p = await opn(ctx, errs)
        assert await p.evaluate("Guest.legacyAt()") == 0; ok('Khách mới: không có dữ liệu cũ cần giữ')
        await p.evaluate(ADD % ('g1', 'Lớp khách'))
        await p.reload(); await p.wait_for_timeout(1500)
        assert await names(p) == ['Lớp khách']; ok('Tải lại trang (F5) → dữ liệu khách vẫn còn')
        p2 = await opn(ctx, errs)
        assert await names(p2) == ['Lớp khách']; ok('Mở thêm tab khi tab cũ còn mở → không xoá')
        await p2.close(); await p.close()
        p = await opn(ctx, errs)
        assert await names(p) == [] and await p.evaluate("(async()=>(await DB.all('boardData')).filter(d=>d.items.length).length)()") == 0; ok('Đóng hết tab rồi mở lại → dữ liệu khách đã bị xoá (cả bảng vẽ)')
        await p.evaluate("showWelcome(false); showGreet(false)"); await p.wait_for_timeout(1000)
        txt = await p.evaluate("document.querySelector('.mode-pick')?.innerText || ''")
        assert 'Đăng nhập' in txt and 'khách' in txt and 'mất toàn bộ dữ liệu' in txt; ok('Sau giới thiệu: chọn Đăng nhập hoặc Khách, ghi rõ khách sẽ mất dữ liệu khi đóng')
        assert await p.evaluate("(()=>{ const e=new Event('beforeunload',{cancelable:true}); window.dispatchEvent(e); return e.defaultPrevented })()"); ok('Khách bấm đóng trang → trình duyệt hỏi lại (có thể mất dữ liệu)')
        await p.evaluate("document.querySelectorAll('.modal-back').forEach(x=>x.remove())")
        await p.mouse.move(600, 300); await p.mouse.move(600, 0); await p.evaluate("document.dispatchEvent(new MouseEvent('mouseout',{clientY:0,relatedTarget:null}))"); await p.wait_for_timeout(300)
        t2 = await p.evaluate("document.querySelector('.exit-warn')?.innerText || ''")
        assert 'Thoát bây giờ là mất dữ liệu' in t2 and 'Đăng nhập / Đăng ký để lưu' in t2; ok('Khách đưa chuột lên nút đóng tab → hiện cảnh báo "Thoát bây giờ là mất dữ liệu — Đăng nhập/Đăng ký để lưu"')
        await p.click('.exit-warn .pa-yes'); await p.wait_for_timeout(300)
        assert await p.evaluate("!!document.querySelector('#acctModal')"); ok('Bấm "Đăng nhập / Đăng ký để lưu" → mở cửa sổ tài khoản')
        await ctx.close()

        # 2) Trình duyệt đã có dữ liệu từ trước (legacy) → giữ dữ liệu cũ
        ctx = await ctx_of(b); p = await opn(ctx, errs)
        await p.evaluate("localStorage.removeItem('vincenink.mode.v'); localStorage.removeItem('vincenink.legacyAt')")
        await p.evaluate(ADD % ('old1', 'Lớp cũ')); await p.close()
        p = await opn(ctx, errs)
        assert await p.evaluate("Guest.legacyAt()") > 0 and await names(p) == ['Lớp cũ']; ok('Dữ liệu có từ trước bản này → được giữ lại')
        await p.evaluate("new Promise(r=>setTimeout(r,20))"); await p.evaluate(ADD % ('new1', 'Lớp mới'))
        await p.close(); p = await opn(ctx, errs)
        assert await names(p) == ['Lớp cũ']; ok('Chỉ những gì tạo mới khi chưa đăng nhập mới bị xoá')
        await ctx.close()

        # 3) Đã đăng nhập → không bao giờ xoá, trình duyệt nhớ phiên
        ctx = await ctx_of(b); p = await opn(ctx, errs)
        E.USERS['m@t.vn'] = {'id': '22222222-2222-2222-2222-222222222222', 'password': 'matkhau1', 'confirmed': True}
        await E.login(p, 'm@t.vn', 'matkhau1'); await p.wait_for_timeout(2500)
        await p.evaluate("document.querySelectorAll('.modal-back').forEach(x=>x.remove())")
        await p.evaluate(ADD % ('m1', 'Lớp thành viên')); await p.close()
        p = await opn(ctx, errs); await p.wait_for_timeout(1500)
        assert await p.evaluate("!!Cloud.user") and 'Lớp thành viên' in await names(p); ok('Đã đăng nhập: đóng rồi mở lại → vẫn đăng nhập, dữ liệu còn nguyên')
        assert not await p.evaluate("(()=>{ const e=new Event('beforeunload',{cancelable:true}); window.dispatchEvent(e); return e.defaultPrevented })()") and not await p.evaluate("!!document.querySelector('.mode-pick')") and await p.evaluate("document.querySelector('#backupNudge').classList.contains('hidden')"); ok('Đã đăng nhập: không còn nhắc sao lưu')
        await ctx.close()

        assert not errs, errs; ok('Không có lỗi JavaScript')
        await b.close()
    print(f'\n{n} kiểm thử chế độ khách đều đạt')

if __name__ == '__main__':
    asyncio.run(main())
