'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const h=fs.readFileSync('P-12.html','utf8');
const take=(start,end)=>h.slice(h.indexOf(start),h.indexOf(end,h.indexOf(start)));
const ids=['A_kick','A_snare'];
const make=()=>({bpm:96,length:16,microEvents:[],tracksData:[{steps:{A_kick:Array(16).fill(0),A_snare:Array(16).fill(0)}}],pianoRollNotes:[]});
const state={currentPattern:1,patterns:{1:make(),2:make()},pianoRollNotes:[],chain:[],chainPos:0,vol:{A_kick:.9},tune:{},trackVol:[100],trackPan:[0],trackMute:[false],trackSolo:[false],trackAssignedPad:['A_kick'],solo:{},mute:{},pan:{},sampleTrim:{},sp12OutputChannel:{},sp12PadMode:{},engine:{},rossumSelectedMix:0};
const context={state,ALL_IDS:ids,NUM_TRACKS:1,P12_VST_TRACK0:8,nativeAudioReady:new Set(ids),ctx:{currentTime:0},nativeSampleRate:48000,window:{},performance:{timeOrigin:0,now:()=>0},SP12_TICKS_PER_P12_STEP:6,SP12_SEQ_PPQN:24,SP12_SWING_VALUES:[50,54,58,63,67,71],console,setTimeout,clearTimeout,document:{addEventListener(){},getElementById(){return {checked:false}}},
 currentPatternObj:()=>state.patterns[state.currentPattern],submixForPad:()=>null,warpSpeedRatioFor:()=>1,stepDuration:()=>60/state.patterns[state.currentPattern].bpm/4,
 rossumSwingTicks:()=>0,sp12EventLevelScale:()=>1,sp12EventPitchSemitones:x=>(x&15)<8?(x&15):(x&15)-16,
 vstTargetsForSequencerHit:()=>[],sp1200MidiNoteForFid:()=>36,schedulePadVisual(){},schedulePlayheadVisual(){},pianoTransportStep(){},nativeAudioEnabled:true,playMetronomeClick(){throw Error('Compiler played click')},p12MarkRecoveryDirty(){},p12SafetyBridge:null};
vm.createContext(context);
const compiler=take('  let p12SequenceCapture=null','  // ---------------- Sequencer engine');
vm.runInContext(compiler,context);
vm.runInContext(take('  function trigger(fid,','  // Everything that needs'),context);
vm.runInContext(take('  function scheduleSequencerMidiHit(','  function sendMidiClockPulse'),context);
vm.runInContext(take('  function scheduleStep(idx,','  // Converts a 0-based step'),context);
state.patterns[1].tracksData[0].steps.A_kick[0]=1;
let plan=vm.runInContext('p12CompileNativePlan(false)',context);assert.equal(plan.events.length,1);assert.equal(plan.events[0].seconds,0);assert.equal(plan.events[0].velocity,1);assert.equal(plan.events[0].livePadControls,true);
state.chokeGroup={A_kick:1,A_snare:1};plan=vm.runInContext('p12CompileNativePlan(false)',context);assert.equal(plan.events.length,2);assert.equal(plan.events[0].stop,true);assert.equal(plan.events[0].pad,1);assert.equal(plan.events[0].seconds,plan.events[1].seconds);state.chokeGroup={};
// Triplet micro-event owns its rounded visible proxy: exactly one hit at tick16.
state.patterns[1]=make();state.patterns[1].microEvents=[{fid:'A_kick',trackIdx:0,tick:16,stepVal:1}];state.patterns[1].tracksData[0].steps.A_kick[3]=1;
plan=vm.runInContext('p12CompileNativePlan(false)',context);assert.equal(plan.events.length,1);assert(Math.abs(plan.events[0].seconds-16*60/96/24)<1e-9);
state.patterns[1]=make();Object.assign(state.patterns[1],{rossumNative:true,rossumNativeDirty:false,rossumLengthTicks:96,rossumHeader:[0x40],rossumEvents:[{fid:'A_kick',tick:12,extra:0x0f}]});
plan=vm.runInContext('p12CompileNativePlan(false)',context);assert.equal(plan.events.length,1);assert(Math.abs(plan.events[0].seconds-16*60/96/24)<1e-9);assert(Math.abs(plan.events[0].ratio-Math.pow(2,-1/12))<1e-9);
state.trackMute[0]=true;plan=vm.runInContext('p12CompileNativePlan(false)',context);assert.equal(plan.events[0].velocity,1);state.trackMute[0]=false;
// Mixer gains never change compiled note velocity or restart the plan.
state.trackVol[0]=398.107;plan=vm.runInContext('p12CompileNativePlan(false)',context);assert.equal(plan.events[0].velocity,1);state.trackVol[0]=100;
state.patterns[1]=make();state.patterns[1].tracksData[0].steps.A_kick[0]=1;state.patterns[2].bpm=120;state.patterns[2].tracksData[0].steps.A_snare[0]=1;state.chain=[1,2];context.songClipRange=i=>({startStep:0,endStep:16});
plan=vm.runInContext('p12CompileNativePlan(true)',context);assert.equal(plan.events.length,2);assert.equal(plan.duration,4.5);assert.equal(plan.events[1].seconds,2.5);assert.equal(state.currentPattern,1);
// Muting before compiling must retain grid, micro and Rossum events for live unmute.
state.chain=[];state.patterns[1]=make();state.patterns[1].tracksData[0].steps.A_kick[0]=1;state.mute.A_kick=true;state.trackMute[0]=true;
plan=vm.runInContext('p12CompileNativePlan(false)',context);assert.equal(plan.events.filter(e=>!e.stop).length,1);assert.equal(plan.events.find(e=>!e.stop).sourcePad,0);
state.patterns[1].tracksData[0].steps.A_kick[0]=0;state.patterns[1].microEvents=[{fid:'A_kick',trackIdx:0,tick:16,stepVal:1}];plan=vm.runInContext('p12CompileNativePlan(false)',context);assert.equal(plan.events.filter(e=>!e.stop).length,1);
Object.assign(state.patterns[1],{rossumNative:true,rossumNativeDirty:false,rossumLengthTicks:96,rossumHeader:[0x40],rossumEvents:[{fid:'A_kick',tick:12,extra:0x0f}]});state.patterns[1].microEvents=[];plan=vm.runInContext('p12CompileNativePlan(false)',context);assert.equal(plan.events.filter(e=>!e.stop).length,1);
console.log('PASS actual renderer compiler: grid, exact triplets, no proxy doubling, Rossum swing/pitch, mixer-independent note velocity, mixed-BPM song, state restoration');
