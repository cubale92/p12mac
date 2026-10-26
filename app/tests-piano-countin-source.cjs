'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('P-12.html','utf8');
const start=html.indexOf('  async function requestStart('),end=html.indexOf('  async function restartPlay(',start);
assert(start>=0&&end>start);
const impl=html.slice(start,end);
const clicks=[],callbacks=[],began=[],bus=[];
const context=vm.createContext({
 console,p12NativeStartBusy:false,p12RecoveryBusy:false,p12StartRequestBusy:false,p12NativeStartEpoch:0,
 state:{chain:[],countInOn:false,counting:false},ctx:{state:'running',currentTime:10},
 initAudio:async()=>{},stepDuration:()=>0.125,playMetronomeClick:(time,strong)=>clicks.push([time,strong]),
 setClickBusEnabled:on=>bus.push(on),beginPlayback:async(chain,time)=>began.push([chain,time]),
 setTimeout:(cb,delay)=>{callbacks.push([cb,delay]);return callbacks.length},
 document:{getElementById:()=>({textContent:''})},countInTimers:[]
});
vm.runInContext(impl+'\nglobalThis.testRequestStart=requestStart;',context);
(async()=>{
 const run=context.testRequestStart;
 await run(false,null,8);
 assert.equal(clicks.length,8,'two bars have 8 quarter-note clicks');
 assert.deepEqual(clicks.filter(x=>x[1]).map(x=>x[0]),[10.05,12.05]);
 assert.equal(callbacks.length,9);assert.equal(began.length,0);
 assert.equal(context.state.counting,true);
 const last=callbacks.pop();last[0]();
 assert.equal(context.state.counting,false);
 assert.equal(began.length,1);
 assert(Math.abs(began[0][1]-14.05)<1e-8);
 console.log('PASS 2-bar count-in uses 8 clicks, with accents on bar boundaries, before playback begins');
 clicks.length=callbacks.length=began.length=0;context.state.countInOn=true;context.state.counting=false;
 await run(false,null,0);assert.equal(clicks.length,0);assert.equal(began.length,1);
 console.log('PASS Piano Roll Off bypasses global count-in without mutating global setting');
 clicks.length=callbacks.length=began.length=0;context.state.countInOn=true;
 await run(false);assert.equal(clicks.length,4);assert.equal(began.length,0);
 console.log('PASS main transport still retains original one-bar global count-in');
 clicks.length=callbacks.length=began.length=0;context.state.counting=false;
 await run(false,null,16);assert.equal(clicks.length,16);assert.equal(clicks.filter(x=>x[1]).length,4);
 console.log('PASS 4-bar count-in uses exactly 16 quarter-note clicks');
})().catch(e=>{console.error(e);process.exitCode=1});
