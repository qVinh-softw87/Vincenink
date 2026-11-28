# Luồng vào web gọn (v45): giới thiệu có sẵn Đăng nhập/Khách, lời chào 1 lần/ngày, không còn "tự xoá sau 7 ngày".
# Chạy: python3 -m http.server 8765 &  rồi  python3 tests/e2e_onboarding.py
import asyncio, sys, uuid
sys.path.insert(0, 'tests')
import e2e_account as E, e2e_guest as G
from playwright.async_api import async_playwright

vis = lambda p, sel: p.evaluate(f"!document.querySelector('{sel}').classList.contains('hidden')")

async def main():
    n = 0; errs = []
    def ok(s): nonlocal n; n += 1; print('✓', s)
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        ctx = await G.ctx_of(b); p = await G.opn(ctx, errs); await p.wait_for_timeout(800)

        assert await vis(p, '#welcome') and not await vis(p, '#greetPop'); ok('Người mới: chỉ trang giới thiệu, không có lời chào chồng lên')
        assert await p.evaluate("Loc.geoState()") != 'granted' and not await p.evaluate("ls.get('vincenink.gpsOK','')"); ok('Chưa hỏi quyền vị trí ngay khi vừa vào')
        assert await vis(p, '#btnStartLogin') and 'khách' in await p.evaluate("document.querySelector('#btnStart').innerText"); ok('Giới thiệu có 2 nút: Đăng nhập/Đăng ký và Dùng thử (khách)')
        await p.mouse.click(5, 5); await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
        assert await vis(p, '#welcome'); ok('Bấm ra ngoài / Esc không tắt trang giới thiệu')

        await p.click('#btnStartLogin'); await p.wait_for_timeout(500)
        assert await p.evaluate("!!document.querySelector('#acctModal')") and not await vis(p, '#welcome'); ok('Bấm Đăng nhập → mở thẳng cửa sổ tài khoản (không qua cửa sổ chọn nào khác)')
        await p.mouse.click(5, 5); await p.wait_for_timeout(300)
        assert not await p.evaluate("!!document.querySelector('#acctModal')"); await p.wait_for_timeout(6500)
        assert await p.evaluate("!!document.querySelector('#acctModal')"); ok('Lỡ bấm ra ngoài → 6 giây sau mở lại cửa sổ đăng nhập 1 lần')

        E.USERS['o@t.vn'] = {'id': str(uuid.uuid4()), 'password': 'matkhau1', 'confirmed': True}
        await p.fill('#acctModal [name=email]', 'o@t.vn'); await p.fill('#acctModal [name=pw]', 'matkhau1')
        await p.click('#acctModal form .btn.primary'); await p.wait_for_timeout(4000)
        assert await p.evaluate("!!Cloud.user") and not await vis(p, '#greetPop') and not await vis(p, '#welcome'); ok('Đăng nhập xong → vào thẳng bảng, không hiện lại lời chào')

        await p.evaluate("ls.set('vincenink.greetDay','2000-01-01'); Guest.leaving=true"); await p.reload(); await p.wait_for_timeout(2000)
        assert await vis(p, '#greetPop'); ok('Ngày mới → lời chào hiện 1 lần')
        await p.click('#greetPop .btn.primary[data-gr=close]'); await p.evaluate("Guest.leaving=true"); await p.reload(); await p.wait_for_timeout(2000)
        assert not await vis(p, '#greetPop') and not await vis(p, '#welcome'); ok('Tải lại trong ngày → không hiện lời chào nữa')

        await p.evaluate("document.querySelectorAll('.modal-back').forEach(x=>x.remove())")
        html = await p.evaluate("document.querySelector('#panel')?.innerHTML || document.body.innerHTML")
        assert 'còn ' not in await p.evaluate("[...document.querySelectorAll('.board-card .bk')].map(x=>x.textContent).join('')"); ok('Không còn nhãn "còn N ngày" (bỏ tự xoá sau 7 ngày)')
        await p.evaluate("remindersModal()"); await p.wait_for_timeout(300)
        t = await p.evaluate("document.querySelector('#remModal').innerText")
        assert '.zip' not in t and 'tiện ích' not in t.lower(); ok('Nhắc lịch: không còn tiện ích Chrome / file .zip')
        await p.evaluate("document.querySelectorAll('.modal-back').forEach(x=>x.remove())")
        await ctx.close()

        # Khách: cảnh báo khi đưa chuột lên nút đóng tab chỉ 1 lần mỗi phiên
        ctx = await G.ctx_of(b); p = await G.opn(ctx, errs); await p.click('#btnStart'); await p.wait_for_timeout(1000)
        fire = "document.dispatchEvent(new MouseEvent('mouseout',{clientY:0,relatedTarget:null}))"
        await p.evaluate(fire); await p.wait_for_timeout(200)
        assert await p.evaluate("!!document.querySelector('.exit-warn')"); await p.click('.exit-warn .pa-later'); await p.wait_for_timeout(200)
        await p.evaluate("exitWarnAt=0"); await p.evaluate(fire); await p.wait_for_timeout(200)
        assert not await p.evaluate("!!document.querySelector('.exit-warn')"); ok('Cảnh báo thoát của khách chỉ hiện 1 lần mỗi phiên')
        # Khách: nhắc nhẹ khi vừa tạo lớp đầu tiên / vẽ ~10 phút — mỗi phiên 1 lần, không chặn thao tác
        await p.evaluate("document.querySelectorAll('.modal-back').forEach(x=>x.remove()); studentModal(null)"); await p.wait_for_timeout(300)
        await p.fill('.modal [name=name]', 'Lớp 6A'); await p.click('.modal .btn.primary'); await p.wait_for_timeout(1500)
        t = await p.evaluate("document.querySelector('.g-nudge')?.innerText || ''")
        assert 'lớp đầu tiên' in t and 'Đăng nhập để lưu' in t and not await p.evaluate("!!document.querySelector('.modal-back')"); ok('Khách tạo lớp đầu tiên → nhắc nhẹ ở góc "đăng nhập để giữ lại", không chặn thao tác')
        await p.click('.g-nudge .gn-go'); await p.wait_for_timeout(400)
        assert await p.evaluate("!!document.querySelector('#acctModal')"); ok('Bấm "Đăng nhập để lưu" trong lời nhắc → mở cửa sổ đăng nhập')
        await p.evaluate("document.querySelectorAll('.modal-back').forEach(x=>x.remove()); sessionStorage.setItem('vincenink.drawAt', String(Date.now()-11*6e4)); guestDrawTick()"); await p.wait_for_timeout(300)
        assert not await p.evaluate("!!document.querySelector('.g-nudge')"); ok('Đã nhắc trong phiên rồi → vẽ 10 phút không nhắc lại')
        await ctx.close()

        assert not errs, errs; ok('Không có lỗi JavaScript')
        await b.close()
    print(f'\n{n} kiểm thử luồng vào web đều đạt')

if __name__ == '__main__':
    asyncio.run(main())
