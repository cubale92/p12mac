#!/usr/bin/env python3
"""Real-browser multi-controller, sustain and count-in UI regression tests."""
from pathlib import Path
from playwright.sync_api import sync_playwright
html=(Path(__file__).parent/'P-12.html').read_text(encoding='utf8')
mock='''<script>
window.__ports={};for(const id of ['a','b'])window.__ports[id]={id,name:id,type:'input',state:'connected',onmidimessage:null};
window.__midiAccess={inputs:new Map(Object.values(window.__ports).map(i=>[i.id,i])),outputs:new Map(),onstatechange:null};
Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:async()=>window.__midiAccess});
window.__sent=[];
window.electronAPI={sendPianoRollMidi:m=>window.__sent.push(m),writeDiagnostic:m=>{window.__diag=(window.__diag||[]).concat([m])}};
window.__fire=(id,bytes)=>{const p=window.__ports[id];p.onmidimessage({data:new Uint8Array(bytes),timeStamp:performance.now(),currentTarget:p})};
</script>'''
html=html.replace('<head>','<head>'+mock,1)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 page=browser.new_page(viewport={'width':1600,'height':980})
 errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(html,wait_until='domcontentloaded',timeout=60000)
 page.locator('#p12PianoMainBtn').click()
 page.wait_for_function("typeof window.__ports.a.onmidimessage === 'function' && typeof window.__ports.b.onmidimessage === 'function'",timeout=15000)
 def fire(port,data): page.evaluate('([id,data])=>window.__fire(id,data)',[port,data])
 def noteoff_count(note): return page.evaluate('note=>window.__sent.filter(m=>m.type===\'noteoff\'&&m.note===note).length',note)
 fire('a',[0x90,60,100]);fire('b',[0x90,60,100]);
 page.wait_for_function("document.querySelector('#p12PianoLiveChord').textContent.includes('C4')")
 assert page.evaluate("window.__sent.filter(m=>m.type==='noteon'&&m.note===60).length")==1
 fire('a',[0x80,60,0]);assert noteoff_count(60)==0,'One controller release must not stop the other keyboard'
 fire('b',[0x80,60,0]);assert noteoff_count(60)==1
 print('PASS two independent keyboard sources share a pitch safely')
 fire('a',[0x90,64,100]);fire('b',[0x90,67,100]);fire('a',[0xB0,64,127])
 before=noteoff_count(67)
 page.evaluate('''() => {window.__ports.a.state='disconnected';window.__midiAccess.inputs.delete('a');window.__midiAccess.onstatechange({port:window.__ports.a})}''')
 assert noteoff_count(64)==1
 assert noteoff_count(67)==before
 assert page.evaluate("window.__sent.some(m=>m.type==='cc'&&m.controller===64&&m.velocity===0)")
 assert 'G4' in page.locator('#p12PianoLiveChord').inner_text()
 fire('b',[0x80,67,0]);assert noteoff_count(67)==before+1
 assert page.locator('#p12PianoLiveChord').inner_text()=='LIVE: —'
 print('PASS only disconnected port notes and sustain are released')
 # A note with key released but sustain pedal still down must not remain
 # in the LIVE CHORD display when its controller disconnects.
 page.evaluate('''() => {window.__ports.a.state='connected';window.__midiAccess.inputs.set('a',window.__ports.a);window.__midiAccess.onstatechange({port:window.__ports.a})}''')
 fire('a',[0xB0,64,127]);fire('a',[0x90,72,100]);fire('a',[0x80,72,0]);
 assert 'C5' in page.locator('#p12PianoLiveChord').inner_text()
 page.evaluate('''() => {window.__ports.a.state='disconnected';window.__midiAccess.inputs.delete('a');window.__midiAccess.onstatechange({port:window.__ports.a})}''')
 assert page.locator('#p12PianoLiveChord').inner_text()=='LIVE: —','CC64 sustain-only disconnect should clear the chord'
 print('PASS sustain-only disconnect releases played chord indication')
 count=page.locator('#p12PianoCountIn');assert count.input_value()=='follow';count.select_option('3')
 assert count.input_value()=='3'
 assert not errors,errors
 print('PASS embedded recording count-in selection and no renderer exceptions')
 browser.close()
