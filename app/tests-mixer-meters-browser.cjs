'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{
const browser=await chromium.launch({executablePath:process.env.P12_CHROMIUM,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
try{
 const main=await browser.newPage();
 await main.addInitScript(()=>{});
 const mock=`<script>window.meterPackets=[];window.meterCommands=[];window.electronAPI={isElectron:true,openMixerWindow:async()=>({ok:true}),sendMixerState:()=>{},sendMixerMeters:p=>window.meterPackets.push(p),onMixerAction:()=>{},nativeAudioCommand:async(c)=>{window.meterCommands.push(c);return {ok:true,nativeEngine:true,masterSpectrum:[30,80,180,240,100,40,10,0,0,0,0,0],padSpectra:[[20,80,220,100,20,0,0,0,0,0,0,0]],trackSpectra:[[],[],[],[20,80,220,100,20,0,0,0,0,0,0,0]],outputPeak:.5,padPeaks:[.5],trackPeaks:[0,0,0,.5]};}};</script>`;
 const probe=`window.meterProbe={start:async()=>{await initAudio();await ctx.resume();const o=ctx.createOscillator(),g=ctx.createGain();g.gain.value=.25;o.connect(g);g.connect(padMonitorGain[ALL_IDS[0]]);g.connect(trackMonitorGain[3]);g.connect(masterGain);o.start();},native:on=>{window.__p12NativeAudioActive=on;p12NativeMeterStats=null;}};`;
 await main.setContent(fs.readFileSync('P-12.html','utf8').replace('</head>',mock+'</head>').replace('  setInterval(p12SyncPadControls,60);','  setInterval(p12SyncPadControls,60);'+probe));
 await main.locator('#mixerWinBtn').click();await main.evaluate(()=>window.meterProbe.start());
 await main.waitForFunction(()=>window.meterPackets.some(p=>['pad','track','master'].every(kind=>p.meters.some(m=>m.kind===kind&&parseFloat(m.height)<50))));
 assert(await main.evaluate(()=>window.meterPackets.length)>2);
 const fixture=await main.evaluate(()=>({html:document.querySelector('#mixerWinBackdrop').outerHTML,styles:[...document.querySelectorAll('style')].map(x=>x.textContent).join('\n')}));
 const page=await browser.newPage();await page.setContent(fs.readFileSync('mixer-detached.html','utf8').replace('</head>',`<script>window.electronAPI={onMixerState:cb=>window.snapshot=cb,onMixerMeters:cb=>window.meters=cb,sendMixerAction:()=>{}};</script></head>`));await page.evaluate(s=>window.snapshot(s),fixture);
 const packet=await main.evaluate(()=>window.meterPackets.at(-1));await page.evaluate(p=>window.meters(p),packet);
 assert(parseFloat(await page.locator('.mpcstrip-master .cover').evaluate(e=>e.style.height))<50);
 const visiblePixels=()=>page.locator('.mpcstrip-master .mpc-spectrum').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).filter((v,i)=>i%4===3&&v>0).length);
 const webPacket=await main.evaluate(()=>window.meterPackets.find(p=>p.meters.some(m=>m.kind==='master'&&m.spectrum?.some(v=>v>0))));assert(webPacket,'WebAudio frequency bins');await page.evaluate(p=>window.meters(p),webPacket);assert(await visiblePixels()>0);
 await main.evaluate(()=>{window.meterPackets=[];window.meterProbe.native(true);});
 await main.waitForFunction(()=>window.meterPackets.some(p=>p.meters.some(m=>m.kind==='track'&&m.index===3&&m.title.includes('native')&&parseFloat(m.height)<20)));
 assert(await main.evaluate(()=>window.meterCommands.includes('nativeMeters')));
 await main.waitForFunction(()=>window.meterPackets.some(p=>p.meters.some(m=>m.kind==='master'&&m.spectrum?.[3]===240)));const nativePacket=await main.evaluate(()=>window.meterPackets.find(p=>p.meters.some(m=>m.kind==='master'&&m.spectrum?.[3]===240)));await page.evaluate(p=>window.meters(p),nativePacket);assert(await visiblePixels()>0);
 await page.evaluate(()=>window.meters({meters:[{kind:'master',index:0,height:'100%',title:'silence',spectrum:Array(12).fill(0)}]}));assert.equal(await visiblePixels(),0);
 await main.evaluate(()=>{window.meterPackets=[];window.meterProbe.native(false);});
 await main.waitForFunction(()=>window.meterPackets.some(p=>p.meters.some(m=>m.kind==='master'&&!m.title.includes('native')&&parseFloat(m.height)<50)));
 console.log('PASS real WebAudio oscillator: pad/Track 4/master meters, detached level and real frequency-bin IPC / canvas pixels / silence clearing, native peak feed, switch back to WebAudio without rebuild');
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
