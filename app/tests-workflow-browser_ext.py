from pathlib import Path
from playwright.sync_api import sync_playwright
html=(Path(__file__).resolve().parent / 'P-12.html').read_text()
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':1600,'height':1000})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)[:180]))
 page.set_content(html,wait_until='domcontentloaded',timeout=60000)
 seqval=page.locator('#seqZoomVal').inner_text()
 seq=page.locator('.tracks-scroll').first
 seq.scroll_into_view_if_needed()
 rect=seq.bounding_box();page.mouse.move(rect['x']+min(190,rect['width']/2),rect['y']+80)
 page.keyboard.down('Control');page.mouse.wheel(0,-120);page.keyboard.up('Control');page.wait_for_timeout(250)
 print('SEQ ZOOM',seqval,'->',page.locator('#seqZoomVal').inner_text())
 try:
  page.locator('#mixerWinBtn').click(timeout=8000)
  page.wait_for_timeout(600)
  print('MIXER DISPLAY',page.locator('#mixerWinBackdrop').evaluate('(el)=>getComputedStyle(el).display'))
  print('MIXER PAD/TRACK COUNTS',page.locator('#mixerwinStrips > *').count(),page.locator('#mixerwinTrackStrips > *').count(),page.locator('#mixerwinSubmixes > *').count())
  label=page.locator('#mixerZoomLabel').inner_text();page.locator('#mixerZoomIn').click();print('MIXER ZOOM',label,'->',page.locator('#mixerZoomLabel').inner_text())
  page.locator('#mixerGoEnd').click();row=page.locator('#mixerwinStrips').locator('xpath=..');print('MIXER END SCROLLLEFT',row.evaluate('(el)=>el.scrollLeft'))
  page.locator('#mixerGoMaster').click();print('MIXER MASTER SCROLLLEFT',row.evaluate('(el)=>el.scrollLeft'))
  page.locator('#mixerGoTracks').click();print('MIXER TRACKS SCROLLTOP',page.locator('.mixerwin-scroll').evaluate('(el)=>el.scrollTop'))
 except Exception as e:print('MIXER exception',str(e)[:400])
 print('errors',errors[:7]);b.close()
