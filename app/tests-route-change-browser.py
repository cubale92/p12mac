#!/usr/bin/env python3
"""Browser regression: changing a piano VST target/slot retires old held voices."""
from pathlib import Path
from playwright.sync_api import sync_playwright
html=(Path(__file__).parent/'P-12.html').read_text(encoding='utf8')
mock='''<script>
window.__port={id:'route-test',name:'test',type:'input',state:'connected',onmidimessage:null};
window.__midiAccess={inputs:new Map([['route-test',window.__port]]),outputs:new Map(),onstatechange:null};
Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:async()=>window.__midiAccess});
window.__sent=[];
window.electronAPI={sendPianoRollMidi:m=>window.__sent.push(m),writeDiagnostic:()=>{}};
window.__fire=data=>window.__port.onmidimessage({data:new Uint8Array(data),currentTarget:window.__port,timeStamp:performance.now()});
</script>'''
html=html.replace('<head>','<head>'+mock,1)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 page=b.new_page(viewport={'width':1600,'height':950});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded',timeout=60000)
 page.locator('#p12PianoMainBtn').click()
 page.wait_for_function("typeof window.__port.onmidimessage==='function'",timeout=10000)
 page.evaluate('window.__fire([0xB0,64,127]);window.__fire([0x90,60,100])')
 assert 'C4' in page.locator('#p12PianoLiveChord').inner_text()
 page.locator('#p12PianoTarget').select_option('track:1')
 sent=page.evaluate('window.__sent')
 assert any(v.get('type')=='noteoff' and v.get('note')==60 and v.get('slot')==1 and v.get('target',None) is None for v in sent),sent[-10:]
 assert any(v.get('type')=='cc' and v.get('controller')==64 and v.get('velocity')==0 and v.get('target',None) is None for v in sent)
 assert page.locator('#p12PianoLiveChord').inner_text()=='LIVE: —'

 print('PASS route switch sends noteoff + sustain release to OLD instrument before target change')
 page.evaluate('window.__fire([0x90,64,88])')
 assert page.evaluate('window.__sent.at(-1).target')=='track'
 page.locator('#p12PianoSlot').select_option('2')
 sent=page.evaluate('window.__sent')
 assert any(v.get('type')=='noteoff' and v.get('note')==64 and v.get('slot')==1 and v.get('target')=='track' and v.get('id')==1 for v in sent)
 print('PASS slot switch retires old VST slot, not the replacement slot')
 page.locator('#p12PianoRecord').click()
 assert page.locator('#p12PianoRecord').inner_text().strip().endswith('ON')
 page.locator('#p12PianoRecord').click()
 assert page.locator('#p12PianoRecord').inner_text().strip().endswith('OFF')
 print('PASS MIDI record diagnostics run in the main renderer without scope errors')
 assert not errors,errors
 b.close()
