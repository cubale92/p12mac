from pathlib import Path
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 page=b.new_page(viewport={'width':1500,'height':920});err=[];page.on('pageerror',lambda e:err.append(str(e)))
 page.set_content((Path(__file__).resolve().parent / 'P-12.html').read_text(),wait_until='domcontentloaded',timeout=60000)
 page.locator('#p12PianoMainBtn').click()
 c=page.locator('#p12PianoGrid [data-piano-note="60"][data-piano-tick="6"]');c.click()
 h=c.locator('.p12-piano-resize');print('handle count',h.count())
 h.scroll_into_view_if_needed();hb=h.bounding_box();end=page.locator('#p12PianoGrid [data-piano-note="60"][data-piano-tick="12"]');eb=end.bounding_box()
 print('rects',hb,eb)
 page.mouse.move(hb['x']+hb['width']/2,hb['y']+hb['height']/2)
 page.mouse.down();page.mouse.move(eb['x']+eb['width']/2,eb['y']+eb['height']/2,steps=5);page.mouse.up()
 hits=page.locator('#p12PianoGrid [data-piano-note="60"][data-note-key]').evaluate_all('(els)=>els.map(e=>e.dataset.pianoTick)')
 print('resized ticks',hits,'errors',err)
 assert hits==['6','12']
 print('PASS main Piano Roll mouse edge drag extends one cell to two')
 b.close()
