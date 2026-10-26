'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.P12_CHROMIUM,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});
 try{
  const page=await browser.newPage({viewport:{width:1700,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const probe=`window.padHitProbe={prepare:async()=>{await initAudio();await ctx.resume();window.padHits=0;window.padInitializations=0;trigger=()=>{window.padHits++;};sendMidiNoteOut=()=>{};initAudio=async()=>{window.padInitializations++;};state.samples.A_kick=new AudioBuffer({length:4800,sampleRate:48000,numberOfChannels:1});state.sampleNames.A_kick='Test sample';rebuildPadsRow();},press:(selector,button=0)=>{const el=document.querySelector(selector);el.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,pointerId:1,button}));return window.padHits;}};`;
  await page.setContent(fs.readFileSync('P-12.html','utf8').replace('  function rebuildPadsRow(){',probe+'\n  function rebuildPadsRow(){'));
  await page.evaluate(()=>window.padHitProbe.prepare());
  const pad=page.locator('#pad-A_kick');const box=await pad.boundingBox();assert(box.width>=160&&box.height>=230);
  const zones=await pad.evaluate(e=>{const center=e.querySelector('.plabel').getBoundingClientRect(),tools=e.querySelector('.bottomrow').getBoundingClientRect(),trim=e.querySelector('.trimrow').getBoundingClientRect();return {centerBottom:center.bottom,toolsTop:tools.top,trimTop:trim.top};});assert(zones.centerBottom<zones.trimTop&&zones.centerBottom<zones.toolsTop);
  for(let i=1;i<=20;i++)assert.equal(await page.evaluate(()=>window.padHitProbe.press('#pad-A_kick .plabel')),i,'hit must dispatch synchronously');
  assert.equal(await page.evaluate(()=>window.padInitializations),0);
  for(const selector of ['.loadbtn','.removebtn','.revbtn','.slicebtn','.stembtn','.warpbtn','.bottomrow','.trimrow','.trimStart','.trimEnd'])assert.equal(await page.evaluate(s=>window.padHitProbe.press('#pad-A_kick '+s),selector),20);
  assert.equal(await page.evaluate(()=>window.padHitProbe.press('#pad-A_kick .plabel',2)),20);
  await page.setViewportSize({width:900,height:650});const small=await pad.boundingBox();assert(small.width>=160&&small.height>=230);assert.equal(await page.locator('.pads-row .pad').count(),8);
  assert.deepEqual(errors,[]);console.log('PASS enlarged pad geometry: clear strike zone and edge tools; 20 synchronous ready-audio hits; no initialization on repeated hits; tools/sliders/right-click never trigger pads; eight pads retained on smaller window');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
