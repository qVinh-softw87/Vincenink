import asyncio, sys
sys.path.insert(0, 'tests')
import e2e_guest as G
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as pw:
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome'); errs=[]
    ctx = await G.ctx_of(b); p = await G.opn(ctx, errs)
    await p.evaluate("showWelcome(false); showGreet(false)"); await p.wait_for_timeout(900)
    await p.evaluate("document.querySelectorAll('.modal-back').forEach(x=>x.remove()); remindersModal()"); await p.wait_for_timeout(400)
    await p.click('[data-tp=eveningAt]'); await p.wait_for_timeout(300)
    await p.click('.tp-pop [data-h="20"]'); await p.wait_for_timeout(200)
    await p.screenshot(path='/tmp/tp.png')
    await p.click('.tp-pop [data-m="30"]'); await p.wait_for_timeout(300)
    print(await p.evaluate("Reminders.settings().eveningAt"), await p.evaluate("document.querySelector('[data-tp=eveningAt]').innerText"), await p.evaluate("!!document.querySelector('.modal-back')"))
    await p.click('[data-tp=morningAt]'); await p.wait_for_timeout(300); print('open', await p.evaluate("!!document.querySelector('.tp-pop')")); await p.mouse.click(5,5); await p.wait_for_timeout(200)
    print('closed outside', not await p.evaluate("!!document.querySelector('.tp-pop')"), errs); await b.close()
asyncio.run(main())
