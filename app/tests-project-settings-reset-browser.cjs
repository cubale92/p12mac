'use strict';const fs=require('node:fs'),assert=require('node:assert/strict');const {chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({executablePath:process.env.P12_CHROMIUM,headless:true,args:['--no-sandbox','--autoplay-policy=no-user-gesture-required']});try{
 const page=await browser.newPage({viewport:{width:1600,height:980}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const probe=`window.projectSettingsProbe={state,get fxState(){return fxState;},load:loadProject,save:saveProject};`;
 await page.setContent(fs.readFileSync('P-12.html','utf8').replace('  setInterval(p12SyncPadControls,60);','  setInterval(p12SyncPadControls,60);'+probe));
 await page.locator('#mixerWinBtn').click();await page.waitForFunction(()=>document.querySelectorAll('#mixerwinStrips .mpcstrip').length===33&&document.querySelectorAll('#mixerwinTrackStrips .mpcstrip').length===9);
 const result=await page.evaluate(async()=>{
  const api=window.projectSettingsProbe,t=api.state;window.retired=[];
  window.electronAPI={nativeAudioCommand:async()=>({ok:false}),setMixerInsertVST:async x=>{window.retired.push(x);return {ok:true};},setVSTState:async()=>({ok:true})};
  t.inserts.A_kick[0]={type:'vst3:C:/Fake.vst3',on:true,params:{}};t.trackInserts[3][0]={type:'vst3:C:/Other.vst3',on:false,params:{}};t.vstTrack0.slots[0]={type:'vst3:C:/Zero.vst3',on:true,params:{}};t.masterInserts[0]={type:'filter_lp',on:true,params:{cutoff:1}};
  t.trackVol[3]=13;t.vol.A_kick=.02;t.masterVolume=25;t.submixes[0].level=37;t.levels8Tune=true;
  for(const [id,value]of [['driveKnobHolder',95],['bitDepthKnobHolder',4],['sslMakeupKnobHolder',20]])document.getElementById(id).querySelector('.knob').p12SetValue(value);
  document.getElementById('sslCompToggle').click();
  await api.load(new File([JSON.stringify({formatVersion:1,patterns:{}})],'Old.p12'));
  await new Promise(r=>setTimeout(r,250));
  const clean={pad:t.vol.A_kick,track:t.trackVol[3],master:t.masterVolume,sub:t.submixes[0].level,track0:t.vstTrack0.vol,padFx:t.inserts.A_kick[0].type,masterFx:t.masterInserts[0].type,trackFx:t.trackInserts[3][0].type,zeroFx:t.vstTrack0.slots[0].type,bits:api.fxState.bitDepth,comp:api.fxState.sslComp.on,makeup:api.fxState.sslComp.makeup,drive:document.getElementById('driveVal').textContent,levelTune:document.getElementById('lvlTuneToggle').classList.contains('active'),masterUi:document.querySelector('.mpcstrip-master [data-db-fader]').value};
  await api.load(new File([JSON.stringify({formatVersion:1,patterns:{},masterVolume:150,projectFx:{bitDepth:10,drive:31,sslComp:{on:true,makeup:3}},submixes:Array.from({length:8},(_,i)=>({track:i,level:i===0?398:100}))})],'Custom.p12'));
  let blob;const create=URL.createObjectURL;URL.createObjectURL=b=>{blob=b;return create(b);};await api.save();URL.createObjectURL=create;const saved=JSON.parse(await blob.text());
  return {clean,retired:window.retired.map(x=>[x.target,String(x.id),x.type]),loaded:{master:t.masterVolume,bits:api.fxState.bitDepth,drive:document.getElementById('driveVal').textContent,comp:api.fxState.sslComp.on,sub:t.submixes[0].level},saved:saved.projectFx};
 });
 assert.deepEqual(result.clean,{pad:.9,track:100,master:100,sub:100,track0:100,padFx:'off',masterFx:'off',trackFx:'off',zeroFx:'off',bits:12,comp:false,makeup:0,drive:'20',levelTune:false,masterUi:'0'});
 for(const target of [['pad','A_kick','off'],['track','3','off'],['track','8','off']])assert(result.retired.some(x=>JSON.stringify(x)===JSON.stringify(target)));
 assert.deepEqual(result.loaded,{master:150,bits:10,drive:'31',comp:true,sub:398});assert.equal(result.saved.drive,31);assert.equal(result.saved.sslComp.makeup,3);assert.equal(errors.length,0,errors.join('\n'));
 console.log('PASS project replacement: retire previous pad/Track 4/Track 0 VST slots, clear old settings, refresh open mixer, restore/save global FX and +12 dB sub levels');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1);});
