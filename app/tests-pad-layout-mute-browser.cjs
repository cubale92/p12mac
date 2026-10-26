'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.P12_CHROMIUM,headless:true,args:['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--no-sandbox','--autoplay-policy=no-user-gesture-required']});
try{
 const main=await browser.newPage({viewport:{width:1536,height:960}}),mixer=await browser.newPage();const errors=[];main.on('pageerror',e=>errors.push(e.message));mixer.on('pageerror',e=>errors.push(e.message));let snapshot;const actions=[];
 await main.exposeFunction('emitSnapshot',async s=>{snapshot=s;await mixer.evaluate(s=>window.receive?.(s),s);});
 await mixer.exposeFunction('emitAction',async a=>{actions.push(a);await main.evaluate(a=>window.act?.(a),a);});
 const mock=`<script>window.commands=[];window.assignments=[];window.electronAPI={isElectron:true,openMixerWindow:async()=>({ok:true}),sendMixerState:s=>window.emitSnapshot(s),sendMixerMeters:()=>{},nativeAudioStop:()=>{},onMixerAction:cb=>window.act=cb,nativeAudioCommand:async(c,p)=>{window.commands.push({c,p});return {ok:true,nativeEngine:true,sampleRate:48000,sequencePlaying:false,sequencePosition:0};},setMixerInsertVST:async a=>{window.assignments.push(a);return {ok:true};}};</script>`;
 const probe=`window.actionProbe={state:()=>({playing:state.playing,counting:state.counting,pad:state.inserts[ALL_IDS[0]],track:state.trackInserts[3]}),sendSnapshot:p12SendMixerSnapshot,start:()=>restartPlay(false),stop:stopPlayback,ssl:()=>fxState.sslComp,prepare:async()=>{await initAudio();await ctx.resume();nativeAudioReady.add(ALL_IDS[0]);state.patterns[1].tracksData[0].steps[ALL_IDS[0]][0]=1;nativeAudioEnabled=true;window.__p12NativeAudioActive=true;},start:()=>restartPlay(false),stop:stopPlayback,holdAudio:()=>{window.releaseAudio=null;initAudio=()=>new Promise(r=>window.releaseAudio=r);},savedVst:()=>syncVstInsertToHost('track',3,0,{type:vstInsertTypeFromPath('C:/Plugins/Unscanned.vst3','VST3'),on:true,params:{path:'C:/Plugins/Unscanned.vst3',name:'Unscanned'}})};`;
 await mixer.setContent(fs.readFileSync('mixer-detached.html','utf8').replace('</head>',`<script>window.electronAPI={onMixerState:cb=>window.receive=cb,onMixerMeters:()=>{},sendMixerAction:a=>window.emitAction(a)};</script></head>`));
 await main.setContent(fs.readFileSync('P-12.html','utf8').replace('</head>',mock+'</head>').replace('  setInterval(p12SyncPadControls,60);','  setInterval(p12SyncPadControls,60);'+probe));
 await main.locator('#mixerWinBtn').click();await main.evaluate(()=>window.actionProbe.prepare());
 await mixer.waitForSelector('#mixer32StartBtn');
 const geometry=await main.evaluate(()=>{const b=s=>document.querySelector(s).getBoundingClientRect().toJSON();return {pads:b('.pads-panel'),ssl:b('#sslBusPanel'),row:b('.pads-row'),children:[...document.querySelectorAll('.pads-row .pad')].map(e=>e.getBoundingClientRect().toJSON())};});
 assert.equal(geometry.children.length,8);assert(geometry.ssl.top>=geometry.pads.bottom,'SSL below pads');
 for(const pad of geometry.children){assert(pad.left>=geometry.row.left&&pad.right<=geometry.row.right+1,'all eight pads visible');assert(pad.width>=160);}
 for(let i=0;i<3;i++){
  const songPosition=await main.evaluate(()=>{const r=document.querySelector('#reverbPanel'),s=document.querySelector('#songPanel'),rb=r.getBoundingClientRect(),sb=s.getBoundingClientRect();return {next:r.nextElementSibling===s,top:sb.top,bottom:rb.bottom,left:sb.left,reverbLeft:rb.left,parent:s.parentElement.className};});
  assert(songPosition.next&&songPosition.top>=songPosition.bottom&&Math.abs(songPosition.left-songPosition.reverbLeft)<1,'Song directly below Reverb in both layouts');
  assert.equal(songPosition.parent,'p12-lower-fx');
  await main.locator('#layoutToggleBtn').click();
 }
 await main.locator('#layoutToggleBtn').click();
 const pm=mixer.locator('.mpcstrip[data-native-kind="pad"][data-native-index="0"] .mbtn');
 const tm=mixer.locator('.mpcstrip[data-native-kind="track"][data-native-index="3"] .mbtn');
 await main.locator('#padMuteBtn').click();const padToggle=main.locator('#padMuteGrid [data-fid="A_kick"]');
 await padToggle.click();await mixer.waitForFunction(()=>document.querySelector('.mpcstrip[data-native-kind="pad"][data-native-index="0"] .mbtn').classList.contains('active'));
 await main.waitForFunction(()=>window.commands.filter(x=>x.c==='nativePadControlsSync').at(-1)?.p.pads[0].gain===0);
 await padToggle.click();await mixer.waitForFunction(()=>!document.querySelector('.mpcstrip[data-native-kind="pad"][data-native-index="0"] .mbtn').classList.contains('active'));
 await main.waitForFunction(()=>window.commands.filter(x=>x.c==='nativePadControlsSync').at(-1)?.p.pads[0].gain>0);
 await pm.click();await main.waitForFunction(()=>document.querySelector('#padMuteGrid [data-fid="A_kick"]').classList.contains('muted'));
 await pm.click();await main.waitForFunction(()=>!document.querySelector('#padMuteGrid [data-fid="A_kick"]').classList.contains('muted'));
 await main.keyboard.press('Escape');await main.locator('#trackMuteBtn').click();const trackToggle=main.locator('#trackMuteGrid [data-track-idx="3"]');
 await trackToggle.click();await mixer.waitForFunction(()=>document.querySelector('.mpcstrip[data-native-kind="track"][data-native-index="3"] .mbtn').classList.contains('active'));
 await main.waitForFunction(()=>window.commands.filter(x=>x.c==='nativePadControlsSync').at(-1)?.p.tracks[3].gain===0);
 await trackToggle.click();await mixer.waitForFunction(()=>!document.querySelector('.mpcstrip[data-native-kind="track"][data-native-index="3"] .mbtn').classList.contains('active'));
 await tm.click();await main.waitForFunction(()=>document.querySelector('#trackMuteGrid [data-track-idx="3"]').classList.contains('muted'));
 await tm.click();await main.waitForFunction(()=>!document.querySelector('#trackMuteGrid [data-track-idx="3"]').classList.contains('muted'));
 await main.keyboard.press('Escape');
 await main.locator('#sslCompToggle').click();await main.locator('#sslThreshKnobHolder .knob').evaluate(e=>e.p12SetValue(-24));
 await main.waitForFunction(()=>window.commands.filter(x=>x.c==='nativePadControlsSync').at(-1)?.p.master.sslComp.threshold===-24);
 assert.equal(await main.evaluate(()=>window.commands.filter(x=>x.c==='nativePadControlsSync').at(-1).p.master.sslComp.on),true);
 await main.evaluate(()=>window.actionProbe.start());await main.waitForFunction(()=>window.actionProbe.state().playing);
 const sequenceCount=await main.evaluate(()=>window.commands.filter(x=>x.c==='nativeSequence').length);
 await main.locator('#padMuteBtn').click();await padToggle.click();await main.waitForFunction(()=>window.commands.filter(x=>x.c==='nativePadControlsSync').at(-1)?.p.pads[0].gain===0);
 await pm.click();await main.waitForFunction(()=>window.commands.filter(x=>x.c==='nativePadControlsSync').at(-1)?.p.pads[0].gain>0);
 assert.equal(await main.evaluate(()=>window.commands.filter(x=>x.c==='nativeSequence').length),sequenceCount,'mute/unmute must not rebuild the playback plan');
 assert(await main.evaluate(()=>window.commands.filter(x=>x.c==='nativeSequence').at(-1).p.events.some(e=>e.pad===0&&!e.stop)),'retained native note');
 await main.evaluate(()=>window.actionProbe.stop());await main.keyboard.press('Escape');await main.screenshot({path:'/workspace/scratch/dab1b0493eea/work/p12-pad-layout.png',fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS all eight enlarged pads visible at 1536px; SSL below pads; pad and Track 4 mute synchronized bidirectionally with detached Mixer32; native mute/unmute gain updated during playback with no plan rebuild; SSL toggle/threshold reach native master');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
