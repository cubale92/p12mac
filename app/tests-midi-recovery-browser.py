#!/usr/bin/env python3
"""Full FULL15 Chromium simulated-MIDI release test (no hardware/audio claims)."""
from pathlib import Path
from playwright.sync_api import sync_playwright
html=(Path(__file__).resolve().parent/'P-12.html').read_text(encoding='utf8')
mock='''<script>
window.__midiInput={name:'Mock MIDI',id:'mock',type:'input',state:'connected',onmidimessage:null};
window.__midiAccess={inputs:new Map([['mock',window.__midiInput]]),outputs:new Map(),onstatechange:null};
Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:async()=>window.__midiAccess});
window.__midiOut=[];
window.electronAPI={sendPianoRollMidi(m){window.__midiOut.push(m)},writeDiagnostic(m){window.__diag=(window.__diag||[]).concat([m])}};
</script>'''
html=html.replace('<head>','<head>'+mock,1)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 page=b.new_page(viewport={'width':1550,'height':950});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded',timeout=60000)
 page.locator('#p12PianoMainBtn').click()
 page.wait_for_function('typeof window.__midiInput.onmidimessage==="function"',timeout=12000)
 def midi(msg):
  page.evaluate('(bytes)=>window.__midiInput.onmidimessage({data:new Uint8Array(bytes),timeStamp:performance.now()})',msg)
 for n in [60,64,67]:midi([0x90,n,100])
 page.wait_for_function("document.querySelector('#p12PianoLiveChord').textContent.includes('C4 E4 G4')",timeout=8000)
 assert 'C4 E4 G4' in page.locator('#p12PianoLiveChord').inner_text()
 midi([0xB0,123,0])
 page.wait_for_function("document.querySelector('#p12PianoLiveChord').textContent==='LIVE: —'",timeout=8000)
 assert page.evaluate("window.__midiOut.filter(m=>m.type==='noteoff').length") >= 3
 print('PASS real-browser MIDI CC123 clears live chord and emits Note Off')
 midi([0x90,72,100]);page.wait_for_function("document.querySelector('#p12PianoLiveChord').textContent.includes('C5')")
 page.evaluate('''() => {window.__midiInput.state='disconnected';window.__midiAccess.onstatechange({port:window.__midiInput})}''')
 page.wait_for_function("document.querySelector('#p12PianoLiveChord').textContent==='LIVE: —'",timeout=8000)
 old=page.evaluate("window.__midiOut.filter(m=>m.type==='noteoff'&&m.note===72).length")
 page.evaluate('''() => window.__midiAccess.onstatechange({port:window.__midiInput})''')
 assert page.evaluate("window.__midiOut.filter(m=>m.type==='noteoff'&&m.note===72).length")==old
 assert not errors,errors
 print('PASS real-browser MIDI disconnect clears chord and is idempotent; no page errors')
 b.close()
