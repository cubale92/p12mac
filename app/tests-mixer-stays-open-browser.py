#!/usr/bin/env python3
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parent
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
    page=browser.new_page(viewport={'width':1600,'height':1000})
    errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
    html=(ROOT/'P-12.html').read_text(encoding='utf8')
    page.set_content(html,wait_until='domcontentloaded',timeout=60000)
    page.locator('#mixerWinBtn').click()
    page.wait_for_timeout(300)
    assert page.locator('#mixerWinBackdrop').evaluate("e=>getComputedStyle(e).display")=='flex'
    # Touch/click inside the first pad strip must not close mixer.
    first=page.locator('#mixerwinStrips .mpcstrip').nth(1)
    assert first.count()==1
    first.click(position={'x':20,'y':30})
    assert page.locator('#mixerWinBackdrop').evaluate("e=>getComputedStyle(e).display")=='flex'
    # Pointer gesture on a mini knob/control area.
    knob=page.locator('#mixerwinStrips .mpcstrip').nth(1).locator('.mini-knob').first
    if knob.count():
        box=knob.bounding_box();
        page.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2)
        page.mouse.down(); page.mouse.move(box['x']+box['width']/2,box['y']-20); page.mouse.up()
        assert page.locator('#mixerWinBackdrop').evaluate("e=>getComputedStyle(e).display")=='flex'
    # Wheel/scroll should not dismiss.
    row=page.locator('#mixerwinStrips').evaluate_handle('e=>e.parentElement')
    page.locator('#mixerwinStrips').hover(); page.mouse.wheel(300,300)
    assert page.locator('#mixerWinBackdrop').evaluate("e=>getComputedStyle(e).display")=='flex'
    # Clicking the dark backdrop itself also no longer closes it.
    page.locator('#mixerWinBackdrop').click(position={'x':2,'y':2},force=True)
    assert page.locator('#mixerWinBackdrop').evaluate("e=>getComputedStyle(e).display")=='flex'
    # Explicit close still works.
    page.locator('#mixerWinCloseBtn').click()
    assert page.locator('#mixerWinBackdrop').evaluate("e=>getComputedStyle(e).display")=='none'
    assert not errors,errors
    print('PASS Mixer-32 stays open during click/drag/scroll; explicit Close works')
    browser.close()
