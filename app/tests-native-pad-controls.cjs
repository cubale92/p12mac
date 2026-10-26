'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('P-12.html','utf8');
const state={playing:true,trackAssignedPad:['A_kick'],trackVol:Array(9).fill(100),trackMute:Array(9).fill(false),trackSolo:Array(9).fill(false),vstTrack0:{vol:100,pan:0,mute:false},tune:{},mute:{},solo:{},vol:{A_kick:.8},pan:{},engine:{},filterType:{},filterCutoff:{},filterRes:{},reverbSend:{},padCrush:{}};
const calls=[];let pending;
const context={state,fxState:{sslComp:{on:false,threshold:-10,ratio:4,attack:10,release:300,makeup:0,mix:100}},ALL_IDS:['A_kick'],P12_VST_TRACK0:8,NUM_TRACKS:8,submixForPad:()=>null,nativeAudioEnabled:true,console,filterFreqFor:()=>14000,filterQFor:()=>.3,filterResoCompensation:()=>1,setInterval(){},nativeBridge:()=>({nativeAudioCommand:async(command,payload)=>{calls.push({command,payload});if(pending)await pending;return {ok:true};}})};
vm.createContext(context);vm.runInContext(html.slice(html.indexOf("  let p12PadControlsLast="),html.indexOf('  async function p12SyncBuiltins(){')),context);
(async()=>{
 await context.p12SyncPadControls();await context.p12SyncPadControls();assert.equal(calls.length,1);assert.equal(calls[0].payload.pads[0].gain,.8);
 Object.assign(state.filterType,{A_kick:'lp'});state.pan.A_kick=.5;state.reverbSend.A_kick=75;state.padCrush.A_kick=40;state.engine.A_kick='hifi';
 await context.p12SyncPadControls();assert.equal(calls.length,2);const p=calls[1].payload.pads[0];assert.equal(p.filter,'lp');assert.equal(p.pan,.5);assert.equal(p.reverb,.75);assert.equal(p.crush,.4);assert.equal(p.spCharacter,false);
 let release;pending=new Promise(r=>release=r);state.vol.A_kick=.4;const inFlight=context.p12SyncPadControls();await context.p12SyncPadControls();assert.equal(calls.length,3);state.vol.A_kick=.2;release();await inFlight;pending=null;await context.p12SyncPadControls();assert.equal(calls.length,4);assert.equal(calls[3].payload.pads[0].gain,.2);
 state.mute.A_kick=true;await context.p12SyncPadControls();assert.equal(calls.at(-1).payload.pads[0].gain,0);
 state.mute.A_kick=false;context.fxState.sslComp.on=true;context.fxState.sslComp.threshold=-24;await context.p12SyncPadControls();assert.equal(calls.at(-1).payload.master.sslComp.threshold,-24);assert.equal(calls.at(-1).payload.master.sslComp.on,true);
 assert(calls.every(x=>x.command==='nativePadControlsSync'));assert.equal(state.playing,true);
 const edited=html.slice(html.indexOf('  function p12NativePlanEdited('),html.indexOf("  document.addEventListener('click',e=>{if(e.target.closest('.chokeGroupBtn"));
 let edits=0;Object.assign(context,{p12SequenceCapture:null,clearTimeout(){},setTimeout(){edits++;},p12PlanEditTimer:null});vm.runInContext(edited,context);
 const knob={matches:()=>false,closest:selector=>selector==='.mixer-strip,.mpcstrip[data-native-kind="pad"]'?{}:selector==='.knob-unit'?{previousElementSibling:{textContent:'Cutoff'}}:null};context.p12NativePlanEdited({target:knob});assert.equal(edits,0);
 state.trackVol[0]=Math.pow(10,12/20)*100;state.masterVolume=200;await context.p12SyncPadControls();assert(Math.abs(calls.at(-1).payload.tracks[0].gain-Math.pow(10,12/20))<1e-9);assert.equal(calls.at(-1).payload.master.gain,2);
 state.trackMute[0]=true;await context.p12SyncPadControls();assert.equal(calls.at(-1).payload.tracks[0].gain,0);
 context.p12NativePlanEdited({target:{matches:()=>true,closest:()=>null}});assert.equal(edits,0);
 // Live browser buses retain unity when eight voices overlap.
 const headroom=html.slice(html.indexOf('  function updateEngineHeadroom(){'),html.indexOf('  let sslComp,'));
 const gains=[];Object.assign(context,{ctx:{currentTime:1},OfflineAudioContext:class{},driveHeadroom:{gain:{setTargetAtTime:v=>gains.push(v)}},hifiHeadroom:{gain:{setTargetAtTime:v=>gains.push(v)}},activeClassicVoices:8,activeHifiVoices:8});
 vm.runInContext(headroom,context);context.updateEngineHeadroom();assert.deepEqual(gains,[1,1]);
 console.log('PASS native pad-control bridge: actual UI state, duplicate coalescing, in-flight edits, sustained mute, no transport calls or knob-triggered plan rebuild');
})().catch(e=>{console.error(e);process.exit(1);});
