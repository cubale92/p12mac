from pathlib import Path
from playwright.sync_api import sync_playwright
p=Path(__file__).parent/'piano-detached.html'
source=p.read_text(encoding='utf8')
shim='''<script>
window.__actions=[];window.electronAPI={onPianoState:cb=>{window.__sync=cb},sendPianoAction:(m)=>window.__actions.push(m)};
</script>'''
source=source.replace('</head>',shim+'</head>',1)
with sync_playwright() as runner:
 b=runner.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--disable-gpu'])
 page=b.new_page(viewport={'width':1250,'height':850});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content(source,wait_until='domcontentloaded',timeout=60000)
 page.wait_for_function('typeof window.__sync === "function"')
 assert page.locator('#countIn').input_value()=='follow'
 page.locator('#countIn').select_option('3')
 assert page.evaluate('window.__actions.at(-1).type')=='countIn'
 assert page.evaluate('window.__actions.at(-1).bars')=='3'
 page.evaluate('''() => window.__sync({notes:[],automation:[],length:16,pattern:1,step:0,countInBars:2,
 tc:'1/16',editGrid:'1/16',selected:[],route:'standalone',slot:'1',channel:1,
 liveNotes:[],activeNotes:[],recording:true,playing:false,undoDepth:0,redoDepth:0})''')
 assert page.locator('#countIn').input_value()=='2'
 page.locator('#recplay').click()
 assert page.evaluate('window.__actions.at(-1).type')=='recPlay'
 assert not errors,errors
 print('PASS detached Piano Roll count-in controls and REC+PLAY use the main transport; no renderer errors')
 b.close()
