import asyncio, sys
sys.path.insert(0, 'tests')
import e2e_guest as G
from playwright.async_api import async_playwright
async def main():
  async with async_playwright() as pw:
    b = await pw.chromium.launch(executable_path='/usr/bin/google-chrome'); errs=[]
    ctx = await G.ctx_of(b); p = await G.opn(ctx, errs)
    vis = lambda sel: p.evaluate(f"!document.querySelector('{sel}').classList.contains('hidden')")
    print('welcome shown', await vis('#welcome'))
    await p.mouse.click(5, 5); await p.wait_for_timeout(300); await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    print('welcome still after outside+esc', await vis('#welcome'))
    await p.click('#btnStart'); await p.wait_for_timeout(1200)
    print('chooser', await p.evaluate("!!document.querySelector('.mode-pick')"), 'no X', not await p.evaluate("!!document.querySelector('.modal-back [data-close]')"))
    await p.mouse.click(5, 5); await p.wait_for_timeout(300); await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    print('chooser still', await p.evaluate("!!document.querySelector('.mode-pick')"))
    await p.screenshot(path='/tmp/c36.png')
    await p.click('.mode-pick [data-pick=guest]'); await p.wait_for_timeout(300)
    print('chooser closed', not await p.evaluate("!!document.querySelector('.mode-pick')"))
    await p.evaluate("showGreet(true)"); await p.wait_for_timeout(500)
    await p.mouse.click(5, 5); await p.wait_for_timeout(300); await p.keyboard.press('Escape'); await p.wait_for_timeout(300)
    print('greet still', await vis('#greetPop'), 'no X', not await p.evaluate("!!document.querySelector('.gr-x')"))
    await p.screenshot(path='/tmp/g36.png')
    await p.click('#greetPop [data-gr=ask]'); await p.wait_for_timeout(500)
    print('greet closed by ask', not await vis('#greetPop'))
    await p.evaluate("showGreet(true)"); await p.wait_for_timeout(300); await p.click('#greetPop .btn.primary[data-gr=close]'); await p.wait_for_timeout(300)
    print('greet closed by teach', not await vis('#greetPop'))
    print('errs', errs); await b.close()
asyncio.run(main())
