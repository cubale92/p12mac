'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.P12_CHROMIUM,headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--no-sandbox','--autoplay-policy=no-user-gesture-required']});
try{
 const main=await browser.newPage(),mixer=await browser.newPage();const errors=[];main.on('pageerror',e=>errors.push(e.message));mixer.on('pageerror',e=>errors.push(e.message));let snapshot;const actions=[];
 await main.exposeFunction('emitSnapshot',async s=>{snapshot=s;await mixer.evaluate(s=>window.receive?.(s),s);});
 await mixer.exposeFunction('emitAction',async a=>{actions.push(a);await main.evaluate(a=>window.act?.(a),a);});
 const mock=`<script>window.commands=[];window.assignments=[];window.electronAPI={isElectron:true,openMixerWindow:async()=>({ok:true}),sendMixerState:s=>window.emitSnapshot(s),sendMixerMeters:()=>{},nativeAudioStop:()=>{},onMixerAction:cb=>window.act=cb,nativeAudioCommand:async(c,p)=>{window.commands.push({c,p});return {ok:true,nativeEngine:true,sampleRate:48000,sequencePlaying:false,sequencePosition:0};},setMixerInsertVST:async a=>{window.assignments.push(a);return {ok:true};}};</script>`;
 const probe=`window.actionProbe={state:()=>({playing:state.playing,counting:state.counting,pad:state.inserts[ALL_IDS[0]],track:state.trackInserts[3]}),sendSnapshot:p12SendMixerSnapshot,prepare:async()=>{await initAudio();await ctx.resume();nativeAudioEnabled=true;window.__p12NativeAudioActive=true;},start:()=>restartPlay(false),stop:stopPlayback,holdAudio:()=>{window.releaseAudio=null;initAudio=()=>new Promise(r=>window.releaseAudio=r);},savedVst:()=>syncVstInsertToHost('track',3,0,{type:vstInsertTypeFromPath('C:/Plugins/Unscanned.vst3','VST3'),on:true,params:{path:'C:/Plugins/Unscanned.vst3',name:'Unscanned'}})};`;
 await mixer.setContent(fs.readFileSync('mixer-detached.html','utf8').replace('</head>',`<script>window.electronAPI={onMixerState:cb=>window.receive=cb,onMixerMeters:()=>{},sendMixerAction:a=>window.emitAction(a)};</script></head>`));
 await main.setContent(fs.readFileSync('P-12.html','utf8').replace('</head>',mock+'</head>').replace('  setInterval(p12SyncPadControls,60);','  setInterval(p12SyncPadControls,60);'+probe));
 await main.locator('#mixerWinBtn').click();await main.evaluate(()=>window.actionProbe.prepare());
 await mixer.waitForSelector('#mixer32StartBtn');
 // Force a pending refresh between pointerdown/up. The click must reach the owner.
 await mixer.locator('#mixer32StartBtn').hover();await mixer.mouse.down();
 await main.evaluate(()=>window.actionProbe.sendSnapshot());
 await mixer.mouse.up();
 await main.waitForFunction(()=>window.actionProbe.state().playing);
 for(let i=0;i<4;i++)await mixer.locator('#mixer32StartBtn').click();
 await mixer.waitForTimeout(250);
 assert.equal(await main.evaluate(()=>window.commands.filter(x=>x.c==='nativeTransport'&&x.p.playing).length),1);
 assert.equal(await main.evaluate(()=>window.commands.filter(x=>x.c==='nativeSequence').length),1);
 // Pad and Track 4 inserts changed in the real detached window must reach native.
 await mixer.locator('.mpcstrip[data-native-kind="pad"][data-native-index="0"] .mpc-insert-row .mpc-insert-select').first().selectOption('mod_autowah');
 await main.waitForFunction(()=>window.actionProbe.state().pad[0].type==='mod_autowah');
 await mixer.waitForTimeout(250);
 await mixer.locator('.mpcstrip[data-native-kind="track"][data-native-index="3"] .mpc-insert-row .mpc-insert-select').first().selectOption('mod_tremolo');

 await main.waitForFunction(()=>window.actionProbe.state().track[0].type==='mod_tremolo');
 await main.waitForFunction(()=>window.commands.some(x=>x.c==='nativeBuiltinSync'&&x.p.routes.some(r=>r.kind==='track'&&r.index===3&&r.slots[0].type==='mod_tremolo')));
 assert(await main.evaluate(()=>window.commands.some(x=>x.c==='nativeBuiltinSync'&&x.p.routes.some(r=>r.kind==='pad'&&r.index===0&&r.slots[0].type==='mod_autowah'))));
 assert.equal(await main.evaluate(()=>window.commands.filter(x=>x.c==='nativeSequence').length),1,'inserts must not restage transport plan');
 await mixer.locator('#mixer32StopBtn').click();await main.waitForFunction(()=>!window.actionProbe.state().playing);
 await main.evaluate(()=>window.actionProbe.savedVst());assert.equal(await main.evaluate(()=>window.assignments.at(-1).path),'C:/Plugins/Unscanned.vst3');
 // Stop cancels Play while async audio init is still pending.
 await main.evaluate(()=>{window.actionProbe.holdAudio();window.actionProbe.start();});
 await main.waitForFunction(()=>!!window.releaseAudio);await main.evaluate(()=>{window.actionProbe.stop();window.releaseAudio();});
 await main.waitForTimeout(100);assert.equal(await main.evaluate(()=>window.actionProbe.state().playing),false);
 assert.equal(await main.evaluate(()=>window.commands.filter(x=>x.c==='nativeTransport'&&x.p.playing).length),1);
 assert.deepEqual(errors,[]);
 console.log('PASS detached snapshot during pointerup: click retained; duplicate Play coalesced; pad/Track 4 selections sync native without plan restart; unscanned VST path retained; Stop cancels pending audio init');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
