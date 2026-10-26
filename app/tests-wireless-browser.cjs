'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright'),{WirelessMidi}=require('./p12-wireless-midi.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.P12_CHROMIUM,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 const host=new WirelessMidi({port:0,host:'127.0.0.1'});const errors=[];
 try{
  const desktop=await browser.newPage({viewport:{width:1700,height:980}});desktop.on('pageerror',e=>errors.push(e.message));
  await desktop.exposeFunction('testWirelessCommand',async p=>p.action==='start'?{ok:true,...await host.start()}:p.action==='stop'?(await host.stop(),{ok:true,...host.state()}):{ok:true,...host.state()});
  const fromDesktop=[];await desktop.exposeFunction('testWirelessSend',d=>{fromDesktop.push(d);host.broadcast(d);});
  await desktop.addInitScript(()=>{window.electronAPI={isElectron:true,wirelessCommand:p=>window.testWirelessCommand(p),wirelessSend:d=>window.testWirelessSend(d),onWirelessMidi:f=>window.testReceive=f,onWirelessState:f=>window.testState=f};});
  host.on('midi',p=>desktop.evaluate(p=>window.testReceive(p),p).catch(()=>{}));host.on('disconnect',p=>desktop.evaluate(p=>window.testReceive({...p,disconnected:true}),p).catch(()=>{}));
  await desktop.route('http://p12.test/**',async route=>{
   const name=new URL(route.request().url()).pathname.slice(1);if(!['P-12.html','p12-wireless-client.js','p12-wireless-ui.js','vendor/jszip.min.js'].includes(name))return route.fulfill({status:404,body:''});
   let body=fs.readFileSync(name,'utf8');if(name==='P-12.html')body=body.replace('  let p12WirelessRemoteTransport=false',`  window.wirelessProbe={hits:[],setup:async()=>{await initAudio();await ctx.resume();trigger=(fid,t,v)=>window.wirelessProbe.hits.push({fid,velocity:v});},record:on=>{state.liveRecordOn=on;state.playing=on;},recorded:()=>currentPatternObj().tracksData[0].steps.A_kick.some(Boolean),releaseProbe:()=>{pianoDeviceHeld.set('wifi:fake',new Set(['1:60']));},held:()=>pianoDeviceHeld.has('wifi:fake'),send:()=>sendMidiNoteOut('A_kick',90),playing:()=>state.playing};\n  let p12WirelessRemoteTransport=false`);
   return route.fulfill({contentType:name.endsWith('.html')?'text/html':'text/javascript',body});
  });
  await desktop.goto('http://p12.test/P-12.html');await desktop.evaluate(()=>window.wirelessProbe.setup());
  await desktop.locator('#p12WirelessPanel > summary').click();await desktop.locator('#p12WifiStart').click();await desktop.waitForFunction(()=>document.getElementById('p12WifiAddress').textContent.includes('Pairing code'));
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const phone=await context.newPage();phone.on('pageerror',e=>errors.push(e.message));await phone.goto(`http://127.0.0.1:${host.port}/`);await phone.locator('details summary').tap();await phone.locator('#code').fill(host.code);await phone.locator('#connect').tap();await phone.waitForFunction(()=>document.getElementById('status').textContent==='Connected');
  await desktop.evaluate(()=>window.wirelessProbe.record(true));await phone.locator('#pads button').first().tap();await desktop.waitForFunction(()=>window.wirelessProbe.hits.length===1);assert.equal(await desktop.evaluate(()=>window.wirelessProbe.hits[0].fid),'A_kick');assert(await desktop.evaluate(()=>window.wirelessProbe.recorded()));await desktop.evaluate(()=>window.wirelessProbe.record(false));
  await desktop.evaluate(()=>window.wirelessProbe.send());await desktop.waitForFunction(()=>true);assert.deepEqual(fromDesktop[0],[0x90,60,90]);await new Promise(r=>setTimeout(r,100));assert(fromDesktop.some(x=>x[0]===0x80));
  // Receive transport OFF: phone Play cannot start the desktop.
  await phone.locator('#transport').check();await phone.locator('#play').tap();await new Promise(r=>setTimeout(r,50));assert.equal(await desktop.evaluate(()=>window.wirelessProbe.playing()),false);
  await desktop.evaluate(()=>window.wirelessProbe.releaseProbe());await desktop.evaluate(()=>window.testReceive({peerId:'fake',disconnected:true}));await desktop.waitForFunction(()=>!window.wirelessProbe.held());
  await phone.locator('#disconnect').tap();await new Promise(r=>setTimeout(r,50));assert.equal(host.state().peers.length,0);
  assert.deepEqual(errors,[]);console.log('PASS actual desktop + touch-phone WebSocket notes, Rossum pad map, live sequence recording, outgoing note pair, transport opt-in, source-specific disconnect cleanup; no page errors');
 }finally{await host.stop();await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
