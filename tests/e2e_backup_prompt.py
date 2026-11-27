import asyncio, sys
sys.path.insert(0, 'tests')
import e2e_account as E
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as pw:
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome')
    # người mới: giới thiệu trước
    ctx = await b.new_context(viewport={'width':1280,'height':900})
    await ctx.route('**/api/config', lambda r: r.fulfill(json={"cloud": True, "push": True, "supabaseUrl": "https://mock.supabase.co", "supabaseAnonKey": "sb_publishable_mock", "vapidPublicKey": "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U"}))
    for pat in ['**/api/assistant','**/api/geo','**/api.open-meteo.com/**','**/api.bigdatacloud.net/**']: await ctx.route(pat, lambda r: r.fulfill(status=500, body=''))
    await ctx.route('https://mock.supabase.co/**', E.supabase)
    p = await ctx.new_page(); errs=[]; p.on('pageerror', lambda e: errs.append(str(e)))
    await p.goto('http://localhost:8765/index.html'); await p.wait_for_timeout(2000)
    print('1 intro shown first:', await p.evaluate("!document.querySelector('#welcome').classList.contains('hidden')"), 'no backup modal yet:', not await p.evaluate("!!document.querySelector('.backup-pop')"))
    await p.evaluate("showWelcome(false)"); await p.wait_for_timeout(900)
    print('2 backup prompt after intro:', await p.evaluate("!!document.querySelector('.backup-pop')"))
    await p.screenshot(path='/tmp/backup.png')
    await p.evaluate("[...document.querySelectorAll('.modal .btn')].find(x=>/Để sau/.test(x.textContent)).click()"); await p.wait_for_timeout(300)
    print('3 sidebar nudge visible:', await p.evaluate("!document.querySelector('#backupNudge').classList.contains('hidden')"))
    await p.screenshot(path='/tmp/nudge.png', clip={'x':0,'y':700,'width':240,'height':200})
    # đăng nhập → nudge ẩn, menu có Đăng xuất
    E.USERS['x@t.vn']={'id':'11111111-1111-1111-1111-111111111111','password':'matkhau1','confirmed':True}
    await E.login(p,'x@t.vn','matkhau1'); await p.wait_for_timeout(2500)
    await p.evaluate("document.querySelectorAll('.modal-back').forEach(x=>x.remove())")
    print('4 nudge hidden after login:', await p.evaluate("document.querySelector('#backupNudge').classList.contains('hidden')"))
    await p.click('#topProfile'); await p.wait_for_timeout(300)
    print('5 menu has Đăng xuất:', 'Đăng xuất' in await p.evaluate("document.querySelector('.pop-menu, .menu, #popMenu')?.innerText || document.body.innerText"))
    await p.evaluate("[...document.querySelectorAll('button, .mi, li')].find(x=>x.textContent.trim()==='Đăng xuất')?.click()"); await p.wait_for_timeout(300)
    await p.evaluate("document.querySelector('.modal .btn.danger').click()"); await p.wait_for_timeout(1200)
    print('6 signed out:', not await p.evaluate("!!Cloud.user"), 'nudge back:', await p.evaluate("!document.querySelector('#backupNudge').classList.contains('hidden')"))
    # quay lại lần sau: lời chào trước, rồi nhắc sao lưu
    await p.reload(); await p.wait_for_timeout(2200)
    g = await p.evaluate("!document.querySelector('#greetPop').classList.contains('hidden') || !document.querySelector('#welcome').classList.contains('hidden')")
    await p.evaluate("showGreet(false); showWelcome(false)"); await p.wait_for_timeout(900)
    print('7 returning: popup first', g, '→ backup prompt after:', await p.evaluate("!!document.querySelector('.backup-pop')"))
    print('errs', errs); await b.close()
asyncio.run(main())
