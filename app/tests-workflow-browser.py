#!/usr/bin/env python3
"""Optional real Chromium smoke test (requires Python playwright + Chromium).
No Electron, native audio device, or hardware playback is used here.
"""
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent

def main():
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,
     args=['--no-sandbox','--disable-gpu'])
  page=browser.new_page(viewport={'width':1600,'height':1000})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content((ROOT/'P-12.html').read_text(encoding='utf8'),wait_until='domcontentloaded',timeout=60000)
  page.locator('#p12PianoMainBtn').click()
  grid='#p12PianoGrid [data-piano-note]'
  assert page.locator(grid).count()==576
  page.locator('#p12PianoGrid [data-piano-note="60"][data-piano-tick="6"]').click()
  before=page.locator('#p12PianoGrid [data-piano-note="60"][data-note-key]').evaluate_all(
       '(els)=>els.map(e=>e.dataset.noteKey)')
  assert before==['60:1'],before
  page.locator('#p12PianoTC').select_option('1/8')
  assert page.locator(grid).count()==576
  assert page.locator('#p12PianoEditGrid').input_value()=='1/16'
  assert page.locator('#p12PianoGrid [data-piano-note="60"][data-note-key]').count()==1
  page.locator('#p12PianoEditGrid').select_option('1/32')
  assert page.locator('#p12PianoTC').input_value()=='1/8'
  assert page.locator(grid).count()==1152
  assert page.locator('#p12PianoGrid [data-piano-note="60"][data-note-key]').count()==2
  page.locator('#p12PianoGrid [data-piano-note="62"][data-piano-tick="3"]').click()
  drawn=page.locator('#p12PianoGrid [data-piano-note="62"][data-note-key]').evaluate_all(
       '(els)=>els.map(e=>e.dataset.noteKey)')
  assert drawn==['62:0.5'],drawn
  assert not errors,errors
  print('PASS Chromium main Piano: one-cell draw, TC independent, no note re-timing, 1/32 grid')
  page.close()

  detached=(ROOT/'piano-detached.html').read_text(encoding='utf8')
  mock='''<script>window.__pianoActions=[];window.electronAPI={
    onPianoState(cb){window.__receiveState=cb},
    sendPianoAction(x){window.__pianoActions.push(x)}
  };</script>'''
  detached=detached.replace("<script>\n'use strict';",mock+"<script>\n'use strict';",1)
  page=browser.new_page(viewport={'width':1500,'height':960})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.set_content(detached,wait_until='domcontentloaded',timeout=30000)
  page.evaluate('''() => window.__receiveState({
    tc:'1/8',editGrid:'1/16',notes:[],automation:[],selected:[],length:16,pattern:1,
    route:'track:0',routes:[{value:'track:0',label:'Track 1'}],slot:'1',channel:1,
    recording:false,playing:false,step:0,activeNotes:[],liveNotes:[],status:'Ready'
  })''')
  assert page.locator('#tc').input_value()=='1/8'
  assert page.locator('#editGrid').input_value()=='1/16'
  page.locator('#editGrid').select_option('1/32')
  assert page.locator('#tc').input_value()=='1/8'
  page.evaluate('''() => {
    const c=document.querySelector('#canvas');const r=c.getBoundingClientRect();
    const e={bubbles:true,clientX:r.left+22,clientY:r.top+8,button:0};
    c.dispatchEvent(new PointerEvent('pointerdown',e));
    window.dispatchEvent(new PointerEvent('pointerup',e));
  }''')
  acts=page.evaluate('window.__pianoActions')
  assert any(a.get('type')=='editGrid' and a.get('editGrid')=='1/32' for a in acts),acts
  creates=[a for a in acts if a.get('type')=='create']
  assert len(creates)==1,acts
  assert creates[0]['length']==0.5,creates
  assert creates[0]['editGrid']=='1/32',creates
  page.locator('#recplay').click()
  assert page.evaluate('window.__pianoActions.at(-1).type')=='recPlay'
  assert not errors,errors
  print('PASS Chromium detached Piano: independent grid, 1/32 note duration, REC+PLAY event')
  browser.close()

if __name__=='__main__':main()
