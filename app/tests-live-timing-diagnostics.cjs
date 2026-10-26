const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('P-12.html','utf8'),main=fs.readFileSync('main.js','utf8');
const timing=html.slice(html.indexOf('  function p12NativeEventTiming('),html.indexOf('  function chokePad(',html.indexOf('  function p12NativeEventTiming(')));
const c={ctx:{currentTime:10},nativeSampleRate:48000,performance:{timeOrigin:100000,now:()=>1000}};vm.createContext(c);vm.runInContext(timing,c);
let t=vm.runInContext('p12NativeEventTiming(9.5)',c);assert.equal(t.targetEpochMs,0);assert.equal(t.delayFrames,0);assert.equal(t.submittedEpochMs,101000);
t=vm.runInContext('p12NativeEventTiming(10)',c);assert.equal(t.targetEpochMs,0);
t=vm.runInContext('p12NativeEventTiming(10.1)',c);assert.equal(t.targetEpochMs,101100);assert.equal(t.delayFrames,4800);
let now=100000,records=[];const d={Date:{now:()=>now},p12DiagnosticLastStatus:null,p12DiagnosticLastStatusAt:0,p12Diag:(...a)=>records.push(a)};vm.createContext(d);
vm.runInContext(main.slice(main.indexOf('function p12DiagNativeStatus('),main.indexOf('// ---------- P-12 safety/recovery',main.indexOf('function p12DiagNativeStatus('))),d);
d.s={ok:true,worstCallbackMs:12.859,worstOverrunMs:2.859,slowCallbacks:1};vm.runInContext('p12DiagNativeStatus(s)',d);assert.equal(records.length,1);
for(let i=0;i<600;i++){now+=50;vm.runInContext('p12DiagNativeStatus(s)',d);}assert.equal(records.length,2,'lifetime peak must not flood every meter poll');
now+=1000;d.s.slowCallbacks++;vm.runInContext('p12DiagNativeStatus(s)',d);assert.equal(records.length,3,'new overrun remains logged');
console.log('PASS immediate/future timing and diagnostic flood regression');
// Actual Electron editor IPC handler: duplicate clicks share one in-flight host call.
(async()=>{
 let handler,requests=0,resolve;
 const e={ipcMain:{handle:(channel,fn)=>handler=fn},requestNative:()=>{requests++;return new Promise(r=>resolve=r)},Map,JSON};vm.createContext(e);
 const start=main.indexOf('const p12EditorRequests=new Map();'),end=main.indexOf('\n});',start)+4;
 vm.runInContext(main.slice(start,end),e);
 const packet={target:'master',id:0,slot:1,path:'Ozone 12.vst3'};
 const a=handler(null,packet),b=handler(null,packet);assert.equal(requests,1);
 resolve({ok:true});await Promise.all([a,b]);const c=handler(null,packet);assert.equal(requests,2);resolve({ok:true});await c;
 console.log('PASS duplicate editor clicks coalesced; editor can reopen after completion');
})().catch(e=>{console.error(e);process.exitCode=1});
