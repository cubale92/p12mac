from pathlib import Path
from playwright.sync_api import sync_playwright
base=(Path(__file__).resolve().parent / 'P-12.html').read_text()
mock='''<script>window.__midiInput={name:'Mock MIDI',id:'mock',onmidimessage:null};Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:async()=>({inputs:new Map([['mock',window.__midiInput]]),outputs:new Map(),onstatechange:null})});</script>'''
html=base.replace('<head>','<head>'+mock,1)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 page=b.new_page(viewport={'width':1550,'height':950});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded',timeout=60000)
 page.locator('#p12PianoMainBtn').click();page.wait_for_timeout(450)
 print('MIDI handler',page.evaluate('typeof window.__midiInput.onmidimessage'))
 for n in [60,64,67]:
  page.evaluate('(n)=>window.__midiInput.onmidimessage({data:new Uint8Array([0x90,n,100]),timeStamp:performance.now()})',n)
 page.wait_for_timeout(250)
 txt=page.locator('#p12PianoLiveChord').inner_text()
 print('CHORD',txt,'errors',errors[:4])
 assert 'C4' in txt and 'E4' in txt and 'G4' in txt and 'Chord' not in txt and txt.startswith('LIVE: C')
 print('PASS LIVE C chord recognition from simulated Web MIDI notes')
 b.close()
