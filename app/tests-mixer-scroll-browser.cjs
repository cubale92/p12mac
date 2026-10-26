'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.P12_CHROMIUM||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const main=await browser.newPage({viewport:{width:1600,height:980}}),errors=[];
  main.on('pageerror',e=>errors.push(e.message));
  await main.setContent(fs.readFileSync('P-12.html','utf8').replace('  setInterval(p12SyncPadControls,60);','  setInterval(p12SyncPadControls,60);window.p12TestPadControls={read:()=>JSON.parse(p12PadControlsSnapshot()),state,packet:p12NativePacket,distribute:distributeLevels,save:saveProject,load:loadProject};'),{waitUntil:'domcontentloaded'});
  const settings=await main.evaluate(()=>{const strip=document.querySelector('.mixer-strip');for(const [label,value] of [['Level',42],['Pan',65],['Cutoff',30],['Reso',70],['Reverb',55],['Crush',60]]){const unit=[...strip.querySelectorAll('.knob-unit')].find(x=>x.previousElementSibling?.textContent===label);unit.querySelector('.knob').p12SetValue(value);}strip.querySelector('.filterTypeBtn').click();strip.querySelector('.engineBtn').click();return window.p12TestPadControls.read().pads[0];});
  assert.equal(settings.gain,.42);assert.equal(settings.pan,.65);assert.equal(settings.filter,'lp');assert.equal(settings.reverb,.55);assert.equal(settings.crush,.6);assert.equal(settings.spCharacter,false);assert(settings.q>10&&settings.frequency<1000);
  console.log('PASS original main-page pad controls: Level, Filter, Cutoff, Reso, Pan, Reverb, Crush, Classic/Hi-Fi reach native parameter state');
  await main.locator('#mixerWinBtn').click();
  await main.waitForFunction(()=>document.querySelectorAll('#mixerwinStrips .mpcstrip').length===33&&document.querySelectorAll('#mixerwinTrackStrips .mpcstrip').length===9);
  // Additional VST bus retains beat track identities and array serialization.
  assert.equal(await main.locator('#mixerwinTrackStrips .mpcstrip[data-native-index="8"] .mpc-channel-id').innerText(),'TRACK 0 · VST');
  const padRoute=main.locator('#mixerwinStrips .mpcstrip[data-fid="A_kick"] .mpc-send-row select').first();
  await padRoute.selectOption('track0');
  assert.equal(await main.evaluate(()=>window.p12TestPadControls.packet('A_kick',1,0).track),8);
  await padRoute.selectOption('0');await main.locator('#mixerwinSubmixes .p12-submix-card').first().locator('select').first().selectOption('8');
  assert.equal(await main.evaluate(()=>window.p12TestPadControls.packet('A_kick',1,0).track),8);
  assert.equal(await main.evaluate(()=>window.p12TestPadControls.read().pads[0].track),8);
  assert.equal(await main.locator('#p12PianoTarget option[value="track:8"]').count(),1);
  const isolation=await main.evaluate(()=>{const t=window.p12TestPadControls.state;const old=t.trackInserts[0][0].type;t.trackInserts[8][0]={type:'filter_lp',on:true,params:{cutoff:17}};t.trackVol[8]=77;return {beat:t.trackInserts[0][0].type,old,length:t.trackInserts.length,serialized:JSON.parse(JSON.stringify(t.trackInserts)).length,zero:t.vstTrack0.slots[0].type};});
  assert.equal(isolation.beat,isolation.old);assert.equal(isolation.length,8);assert.equal(isolation.serialized,8);assert.equal(isolation.zero,'filter_lp');
  const roundtrip=await main.evaluate(async()=>{
   const api=window.p12TestPadControls,t=api.state,create=URL.createObjectURL;let blob;t.masterVolume=77;
   URL.createObjectURL=b=>{blob=b;return create(b);};await api.save();URL.createObjectURL=create;
   const text=await blob.text(),data=JSON.parse(text);
   t.masterVolume=100;t.vstTrack0.vol=100;t.vstTrack0.slots[0].type='off';t.submixes[0].track=0;
   await api.load(new File([text],'Project.p12',{type:'application/json'}));
   return {master:t.masterVolume,savedLength:data.trackInserts.length,gain:t.vstTrack0.vol,slot:t.vstTrack0.slots[0].type,sub:t.submixes[0].track,packet:api.packet('A_kick',1,0).track};
  });assert.deepEqual(roundtrip,{master:77,savedLength:8,gain:77,slot:'filter_lp',sub:8,packet:8});
  console.log('PASS actual original UI: Track 0 separate strip, pad/sub/Piano routes, untouched beat arrays, Project.p12 round trip');
  const levels=await main.evaluate(()=>{
   const api=window.p12TestPadControls,t=api.state,first='A_kick';t.currentBank='A';t.samples[first]=new AudioBuffer({numberOfChannels:1,length:4800,sampleRate:48000});
   const originalCutoff=t.filterCutoff[first],originalTune=t.tune[first];
   document.querySelector('#lvlVelToggle').click();api.distribute(first);
   const initial={vel:t.levels8Vel,filter:t.levels8Filter,tune:t.levels8Tune,level:t.velLevel[first],cutoff:t.filterCutoff[first]};
   document.querySelector('#lvlTuneToggle').click();const tuned={vel:t.levels8Vel,filter:t.levels8Filter,tune:t.levels8Tune,level:t.velLevel[first],pitch:t.tune[first]};
   document.querySelector('#lvlTuneToggle').click();const restoreTune=t.tune[first]===originalTune&&t.velLevel[first]===1;
   document.querySelector('#lvlFilterToggle').click();const filtered={vel:t.levels8Vel,filter:t.levels8Filter,tune:t.levels8Tune,level:t.velLevel[first],cutoff:t.filterCutoff[first]};
   document.querySelector('#lvlVelToggle').click();const velocityOff=t.velLevel[first]===null&&t.filterCutoff[first]===15&&t.levels8Filter;
   document.querySelector('#lvlFilterToggle').click();const restored=t.filterCutoff[first]===originalCutoff&&!t.levels8Vel&&!t.levels8Filter&&!t.levels8Tune;
   document.querySelector('#velBtn').click();return {initial,tuned,filtered,restoreTune,velocityOff,restored,originalCutoff};
  });
  assert.deepEqual(levels.initial,{vel:true,filter:false,tune:false,level:1,cutoff:levels.originalCutoff});
  assert.deepEqual(levels.tuned,{vel:true,filter:false,tune:true,level:1,pitch:-12});
  assert.deepEqual(levels.filtered,{vel:true,filter:true,tune:false,level:1,cutoff:15});
  assert(levels.restoreTune&&levels.velocityOff&&levels.restored);
  await main.waitForFunction(()=>document.querySelectorAll('#mixerwinStrips .mpcstrip').length===33&&document.querySelectorAll('#mixerwinTrackStrips .mpcstrip').length===9);
  console.log('PASS actual original 8 Levels buttons: independent flags and parameters, live enable/disable, prior settings restored');
  const faders=await main.evaluate(()=>{
   const api=window.p12TestPadControls,inputs=[...document.querySelectorAll('[data-db-fader]')];
   const set=(input,db)=>{input.value=db;input.dispatchEvent(new Event('input',{bubbles:true}));};
   const pad=document.querySelector('.mpcstrip[data-native-kind="pad"] .mpc-fader-input');
   set(pad,6);const plus6=api.read().pads[0].gain;
   set(pad,12);const plus12=api.read().pads[0].gain;
   set(pad,-30);const minus30=api.read().pads[0].gain;
   set(pad,-61);const mute=api.read().pads[0].gain;
   set(pad,0);const unity=api.read().pads[0].gain;
   const master=document.querySelector('.mpcstrip-master .mpc-fader-input');set(master,6);const masterGain=api.read().master.gain;set(master,0);
   const track=document.querySelector('.mpcstrip[data-native-kind="track"][data-native-index="8"] .mpc-fader-input');set(track,12);const track0=api.read().tracks[8].gain;set(track,0);
   const sub=document.querySelector('.p12-submix-card [data-db-fader]');set(sub,-30);const subPercent=api.state.submixes[0].level;set(sub,0);
   return {count:inputs.length,ranges:inputs.every(x=>x.min==='-61'&&x.max==='12'&&x.step==='0.1'),plus6,plus12,minus30,mute,unity,masterGain,track0,subPercent};
  });
  assert.equal(faders.count,50);assert(faders.ranges);assert.equal(faders.mute,0);assert.equal(faders.unity,1);
  assert(Math.abs(faders.plus6-Math.pow(10,6/20))<1e-8);assert(Math.abs(faders.plus12-Math.pow(10,12/20))<1e-8);assert(Math.abs(faders.minus30-Math.pow(10,-30/20))<1e-8);
  assert(Math.abs(faders.masterGain-Math.pow(10,6/20))<1e-8);assert(Math.abs(faders.track0-Math.pow(10,12/20))<1e-8);assert(Math.abs(faders.subPercent/100-Math.pow(10,-30/20))<1e-8);
  console.log('PASS all 50 original mixer faders: true dB gain, mute/unity/+6/+12, master and Track 0 native scalars, subchannel level');
  const fixture=await main.evaluate(()=>({html:document.querySelector('#mixerWinBackdrop').outerHTML,styles:[...document.querySelectorAll('style')].map(x=>x.textContent).join('\n')}));
  assert.equal(errors.length,0,errors.join('\n'));
  const source=fs.readFileSync(process.env.P12_MIXER_TEST_FILE||'mixer-detached.html','utf8');
  const mock=`<script>window.electronAPI={onMixerState:cb=>window.snapshot=cb,sendMixerAction:()=>{},nativeAudioCommand:async()=>({ok:true,nativeEngine:false})};</script>`;
  const page=await browser.newPage({viewport:{width:1700,height:980}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.setContent(source.replace('</head>',mock+'</head>'),{waitUntil:'domcontentloaded'});
  await page.evaluate(s=>window.snapshot(s),fixture);
  const detachedFader=await page.evaluate(()=>{
   const input=document.querySelector('.mpcstrip-master [data-db-fader]');input.value=6;input.dispatchEvent(new Event('input',{bubbles:true}));
   const gainLabel=input.closest('.mpcstrip').querySelector('.mpc-fader-readout').textContent;
   input.dispatchEvent(new MouseEvent('dblclick',{bubbles:true}));return {gainLabel,reset:Number(input.value),resetLabel:input.closest('.mpcstrip').querySelector('.mpc-fader-readout').textContent};
  });assert.deepEqual(detachedFader,{gainLabel:'+6.0 dB',reset:0,resetLabel:'0.0 dB'});
  async function inspect(){return page.evaluate(()=>{
   const workspace=document.querySelector('.mixerwin-scroll'),row=document.querySelector('#mixerwinStrips').parentElement,master=document.querySelector('.mpcstrip-master');
   const bounds=el=>{const r=el.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}};
   return {viewport:{width:innerWidth,height:innerHeight},root:bounds(document.querySelector('#root')),workspace:bounds(workspace),row:bounds(row),master:bounds(master),overflow:{x:row.scrollWidth-row.clientWidth,y:row.scrollHeight-row.clientHeight}};
  });}
  for(const size of [{width:1700,height:980},{width:900,height:650},{width:700,height:450}]){
   await page.setViewportSize(size);await page.waitForTimeout(80);await page.locator('#mixerGoMaster').click();
   let g=await inspect();assert(g.workspace.bottom<=size.height,JSON.stringify(g));assert(g.row.bottom<=g.workspace.bottom+1,JSON.stringify(g));assert(g.master.width>180);assert(g.master.top<size.height&&g.master.left>=g.row.left-1);assert(g.overflow.x>4000);assert(g.overflow.y>0);
   // Ordinary vertical wheel moves the row. Shift+wheel moves it horizontally.
   await page.locator('.mpcstrip-master .mpc-channel-id').hover();await page.waitForTimeout(300);await page.mouse.wheel(0,240);
   await page.waitForFunction(()=>document.querySelector('#mixerwinStrips').parentElement.scrollTop>0,null,{timeout:2000});
   await page.locator('#mixerGoMaster').click();
   await page.locator('#mixerwinStrips').evaluate(e=>{e.parentElement.scrollLeft=1000;});
   g=await inspect();assert(Math.abs(g.master.left-g.row.left)<3,'Master stays pinned during horizontal scroll');
   const before=await page.locator('#mixerwinStrips').evaluate(e=>e.parentElement.scrollLeft);
   await page.locator('.mpcstrip-master').dispatchEvent('wheel',{deltaY:200,shiftKey:true});
   assert(await page.locator('#mixerwinStrips').evaluate(e=>e.parentElement.scrollLeft)>before);
   await page.locator('#mixerwinStrips').evaluate(e=>{e.parentElement.scrollTop=170;});
   const position=await page.locator('#mixerwinStrips').evaluate(e=>[e.parentElement.scrollLeft,e.parentElement.scrollTop]);
   await page.evaluate(s=>window.snapshot(s),fixture);
   assert.deepEqual(await page.locator('#mixerwinStrips').evaluate(e=>[e.parentElement.scrollLeft,e.parentElement.scrollTop]),position);
   await page.locator('#mixerGoMaster').click();assert.deepEqual(await page.locator('#mixerwinStrips').evaluate(e=>[e.parentElement.scrollLeft,e.parentElement.scrollTop]),[0,0]);
   await page.locator('#mixerGoTracks').click();assert(await page.locator('.mixerwin-scroll').evaluate(e=>e.scrollTop)>0);
   await page.locator('#mixerGoMaster').click();
   for(let i=0;i<5;i++)await page.locator('#mixerZoomIn').click();await page.waitForTimeout(50);
   g=await inspect();assert(g.row.bottom<=g.workspace.bottom+1);assert(Math.abs(g.master.left-g.row.left)<3);
   await page.locator('#mixerZoomReset').click();
   console.log('PASS actual Chromium '+size.width+'x'+size.height+': visible Master, pinned Master, contained scrollbars, wheel, horizontal scroll, resize, snapshots, navigation and zoom');
  }
  assert.equal(errors.length,0,errors.join('\n'));
  if(process.env.P12_SCROLL_SCREENSHOT)await page.screenshot({path:process.env.P12_SCROLL_SCREENSHOT});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
