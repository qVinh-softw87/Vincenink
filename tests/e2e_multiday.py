# Ghi lịch cố định nhiều thứ một lượt, mỗi thứ giờ riêng. Chạy: python3 -m http.server 8765 & ; python3 tests/e2e_multiday.py
import asyncio, sys
sys.path.insert(0, 'tests')
import e2e_guest as G
from playwright.async_api import async_playwright

async def main():
    n = 0; errs = []
    def ok(s): nonlocal n; n += 1; print('✓', s)
    async with async_playwright() as pw:
        b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
        ctx = await G.ctx_of(b); p = await G.opn(ctx, errs); await p.click('#btnStart'); await p.wait_for_timeout(600)
        await p.evaluate("(async()=>{ const st={id:'c1',name:'Lớp 9A',color:'#c66',created:Date.now()}; await DB.put('students',st); S.students.push(st); S.studentId='c1'; renderSidebar(); })()")
        await p.evaluate("document.querySelectorAll('.modal-back,.g-nudge').forEach(x=>x.remove()); sessionModal('c1', null, null)"); await p.wait_for_timeout(300)
        assert await p.evaluate("document.querySelector('[name=dow]').type") == 'checkbox'; ok('Ô chọn thứ cho phép chọn nhiều thứ')
        for d in ['1', '3', '5']:   # T3, T5, T7 (0 = T2)
            if not await p.evaluate(f"document.querySelector('[name=dow][value=\"{d}\"]').checked"): await p.click(f'.dp:has(input[value="{d}"])')
        for d in ['0', '2', '4', '6']:
            if await p.evaluate(f"document.querySelector('[name=dow][value=\"{d}\"]').checked"): await p.click(f'.dp:has(input[value="{d}"])')
        await p.wait_for_timeout(200)
        rows = await p.evaluate("[...document.querySelectorAll('.mt-row')].map(r=>r.dataset.d)")
        assert rows == ['1', '3', '5']; ok('Chọn T3, T5, T7 → hiện 3 dòng giờ riêng cho từng thứ, đúng thứ tự')
        await p.evaluate("setTimeField(document.querySelector('.sess-form'), 'start-3', '07:00'); setTimeField(document.querySelector('.sess-form'), 'end-3', '08:30')")
        await p.evaluate("setTimeField(document.querySelector('.sess-form'), 'start-5', '20:00')")
        await p.click('[data-dur="120"]'); await p.wait_for_timeout(100)
        await p.fill('.sess-form [name=subject]', 'Toán')
        await p.click('.modal .btn.primary'); await p.wait_for_timeout(500)
        fx = await p.evaluate("sched('c1').fixed.map(f=>[f.dow,f.start,f.end,f.subject]).sort()")
        assert fx == [[1, '18:00', '20:00', 'Toán'], [3, '07:00', '09:00', 'Toán'], [5, '20:00', '22:00', 'Toán']], fx; ok('Bấm Lưu 1 lần → ghi đủ 3 buổi cố định, mỗi thứ đúng giờ của nó')
        assert not await p.evaluate("!!document.querySelector('.sess-form')"); ok('Lưu xong đóng cửa sổ, lịch tuần hiện đủ')
        await p.evaluate("sessionModal('c1', null, null)"); await p.wait_for_timeout(300)
        await p.evaluate("document.querySelectorAll('[name=dow]:checked').forEach(x=>x.click())"); await p.wait_for_timeout(100)
        await p.click('.modal .btn.primary'); await p.wait_for_timeout(300)
        assert await p.evaluate("!!document.querySelector('.sess-form')"); ok('Không chọn thứ nào → báo lỗi, không đóng')
        await p.evaluate("document.querySelectorAll('.modal-back').forEach(x=>x.remove()); sessionModal('c1', {kind:'fixed', ref: sched('c1').fixed[0]})"); await p.wait_for_timeout(300)
        assert await p.evaluate("document.querySelector('[name=dow]').type") == 'radio' and await p.evaluate("document.querySelector('.f-multi').classList.contains('hidden')"); ok('Sửa 1 lịch cố định vẫn là chọn 1 thứ như cũ')
        assert not errs, errs; ok('Không có lỗi JavaScript')
        await b.close()
    print(f'\n{n} kiểm thử ghi lịch nhiều thứ đều đạt')

if __name__ == '__main__':
    asyncio.run(main())
