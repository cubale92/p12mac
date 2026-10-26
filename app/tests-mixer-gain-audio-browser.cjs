'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.P12_CHROMIUM,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const probe=`window.p12AudioGainProbe=async(db,voices)=>{
    ctx=new OfflineAudioContext(2,48000,48000);state.masterVolume=Math.pow(10,db/20)*100;fxState.sslComp.on=false;state.masterInserts=makeDefaultInsertSlots();
    const output=buildProcessingGraph();output.connect(ctx.destination);
    for(let n=0;n<voices;n++){const oscillator=ctx.createOscillator(),gain=ctx.createGain();oscillator.frequency.value=1000;gain.gain.value=.01;oscillator.connect(gain);gain.connect(hifiHeadroom);oscillator.start(0);}
    const audio=await ctx.startRendering(),data=audio.getChannelData(0);let sum=0;
    for(let i=4800;i<data.length;i++)sum+=data[i]*data[i];return Math.sqrt(sum/(data.length-4800));
  };`;
  await page.setContent(fs.readFileSync('P-12.html','utf8').replace('  setInterval(p12SyncPadControls,60);','  setInterval(p12SyncPadControls,60);'+probe),{waitUntil:'domcontentloaded'});
  const values=[];for(const [db,voices] of [[0,1],[6,1],[12,1],[-30,1],[0,8]])values.push(await page.evaluate(([db,n])=>window.p12AudioGainProbe(db,n),[db,voices]));
  // Chromium's final compressor adds a small fixed makeup gain below its knee.
  assert(values[0]>.0064&&values[0]<.0078,'unity audio without hidden attenuation');
  for(const [i,ratio] of [[1,Math.pow(10,6/20)],[2,Math.pow(10,12/20)],[3,Math.pow(10,-30/20)]])assert(Math.abs(values[i]/values[0]-ratio)<ratio*.001,'measured gain '+i);
  assert(values[4]/values[0]>7.5&&values[4]/values[0]<8.1,'eight voices retain their mix level; final protection may reduce peaks');
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('PASS actual browser output RMS: unity, +6 dB, +12 dB, -30 dB, eight-voice sum without automatic attenuation');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});
