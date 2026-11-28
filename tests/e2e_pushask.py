# Đăng nhập xong → hỏi "Bạn có muốn nhận thông báo?" → đồng ý là bật (không cần tiện ích .zip).
import asyncio, sys, uuid
sys.path.insert(0, 'tests')
import e2e_account as E
from playwright.async_api import async_playwright

DEFAULT_PERM = E.FAKE_PUSH.replace("'granted'", "(window.__perm || 'default')") + """
Notification.requestPermission = async () => { window.__perm = 'granted'; return 'granted'; };
"""

async def main():
    n = 0
    def ok(s): nonlocal n; n += 1; print('✓', s)
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        orig = E.FAKE_PUSH; E.FAKE_PUSH = DEFAULT_PERM
        ctx, p = await E.page(b, 'ask'); E.FAKE_PUSH = orig
        assert await p.evaluate("Notification.permission") == 'default'
        await p.evaluate("document.querySelectorAll('.modal-back').forEach(x=>x.remove()); remindersModal()"); await p.wait_for_timeout(300)
        txt = await p.evaluate("document.querySelector('#remModal').innerText")
        assert 'Đăng nhập để nhận thông báo' in txt and '.zip' not in txt and 'chrome://extensions' not in txt; ok('Nhắc lịch: không còn hướng dẫn tải .zip; khách được mời đăng nhập')
        E.USERS['n@t.vn'] = {'id': str(uuid.uuid4()), 'password': 'matkhau1', 'confirmed': True}; U = E.USERS['n@t.vn']['id']
        await E.login(p, 'n@t.vn', 'matkhau1'); await p.wait_for_timeout(3000)
        await p.evaluate("showGreet(false); showWelcome(false)"); await p.wait_for_timeout(2500)
        assert 'Bạn có muốn nhận thông báo lịch dạy không?' in await p.evaluate("document.body.innerText"); ok('Đăng nhập xong → hỏi "Bạn có muốn nhận thông báo lịch dạy không?"')
        await p.click('.modal .btn.primary >> text=Có, bật thông báo'); await p.wait_for_timeout(1500)
        assert await p.evaluate("Cloud.pushOn") and any(s['user_id'] == U for s in E.SUBS.values()); ok('Bấm "Có" → cho phép → đã đăng ký nhận thông báo trên máy chủ')
        await p.evaluate("remindersModal()"); await p.wait_for_timeout(300)
        assert 'Thông báo đang bật trên máy này' in await p.evaluate("document.querySelector('#remModal').innerText"); ok('Nhắc lịch hiện "Thông báo đang bật trên máy này" + nút gửi thử')
        await p.evaluate("Guest.leaving=true"); await p.reload(); await p.wait_for_timeout(2500); await p.evaluate("showGreet(false); showWelcome(false)"); await p.wait_for_timeout(2000)
        assert 'Bạn có muốn nhận thông báo' not in await p.evaluate("document.body.innerText"); ok('Đã bật rồi → không hỏi lại')
        assert not p.errs, p.errs; ok('Không có lỗi JavaScript')
        await b.close()
    print(f'\n{n} kiểm thử hỏi bật thông báo đều đạt')

if __name__ == '__main__':
    asyncio.run(main())
