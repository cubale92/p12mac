'use strict';
// Exercises the actual production MIDI record functions in a lightweight VM.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('P-12.html','utf8');
function snippet(from,to){const i=html.indexOf(from),j=html.indexOf(to,i+1);assert(i>=0&&j>i,'Production function not found');return html.slice(i,j);}
const impl=snippet('  let pianoUndoOnsetGroup=null;', '  const pianoTcSelect')+snippet('  function pianoFinishHeldNotes(','  function pianoRecordAutomationIncoming(')+
  snippet('  function pianoStopMidiRecording(){','  pianoRecBtn.onclick=');
const context=vm.createContext({console});
vm.runInContext(`
let ctx={currentTime:2},tick=90;const performance={now:()=>ctx.currentTime*1000};
const pianoBackdrop={style:{display:'none'}},window={electronAPI:{writeDiagnostic:(v)=>logs.push(v)}};
const TIME_CORRECT_TICKS={'1/16':6,'1/8':12,'1/16T':4};
const state={timeCorrect:'1/16',playing:true,currentPattern:1,patterns:{1:{bpm:120,length:16,pianoRollNotes:[]},2:{bpm:120,length:16,pianoRollNotes:[]}}};
const pianoHeld=new Map(),pianoRecBtn={textContent:'',classList:{remove(){}}};
let pianoMidiRecording=true;let undo=0;const logs=[],undoStack=[];
let pianoRecordStats={startedAt:100,notes:0,merged:0,automation:0};
const p12DiagSend=()=>{};
const pushUndo=()=>{undo++;undoStack.push({});};
const currentPatternObj=()=>state.patterns[state.currentPattern];
const pianoLiveTick=()=>tick;
const pianoRenderGrid=()=>{};
const pianoPaintNoteRow=()=>{};
${impl}
globalThis.t={ctx,state,pianoHeld,logs,record:pianoRecordIncoming,
 stop:pianoStopMidiRecording,finish:pianoFinishHeldNotes, setTick:(v)=>{tick=v},
 restart:()=>{pianoMidiRecording=true},recording:()=>pianoMidiRecording,undoCount:()=>undo};
`,context,{timeout:10000});
const t=context.t,events=()=>t.state.patterns[1].pianoRollNotes;
const near=(x,y)=>assert(Math.abs(x-y)<1e-6,`${x} != ${y}`);
// C major held over a pattern wrap. At 120 BPM: 12 ticks = 250 ms.
for(const note of [60,64,67])t.record('noteon',note,100,1);
assert.equal(t.undoCount(),1,'One undo action for a recorded chord');
t.ctx.currentTime+=0.25;
for(const note of [60,64,67])t.record('noteoff',note,0,1);
assert.equal(t.pianoHeld.size,0);
assert.equal(events().length,6,'Three notes plus three wrap continuations');
for(const note of [60,64,67]){
 const pair=events().filter(x=>x.note===note).sort((a,b)=>a.tick-b.tick);
 assert.deepEqual(Array.from(pair,n=>n.tick),[0,90]);near(pair[0].length,1);near(pair[1].length,1);
}
console.log('PASS chord overdub: one undo action, precise loop boundary, three recorded notes');
// Held note while switching pattern must remain entirely in original pattern.
t.setTick(24);t.ctx.currentTime+=0.5;t.record('noteon',72,93,1);
t.ctx.currentTime+=0.125;t.finish('pattern-change');
assert.equal(t.pianoHeld.size,0);assert(t.recording());
assert.equal(t.state.patterns[2].pianoRollNotes.length,0);
const old=events().find(n=>n.note===72);near(old.length,1);
t.state.currentPattern=2;
t.setTick(36);t.record('noteon',74,101,1);
t.ctx.currentTime+=0.125;t.record('noteoff',74,0,1);
assert.equal(t.state.patterns[2].pianoRollNotes.length,1);
assert.equal(t.state.patterns[2].pianoRollNotes[0].tick,36);
assert.equal(events().filter(n=>n.note===74).length,0);
console.log('PASS pattern switch closes old held note, recording remains armed for new pattern');
// Stop held note, then late note-off must not write a duplicate.
t.setTick(72);t.record('noteon',76,115,1);
t.ctx.currentTime+=0.125;t.stop();
assert(!t.recording());assert.equal(t.pianoHeld.size,0);
const before=t.state.patterns[2].pianoRollNotes.length;t.record('noteoff',76,0,1);
assert.equal(t.state.patterns[2].pianoRollNotes.length,before);
console.log('PASS stop with held note flushes once; late Note Off ignored');
// A normal short note records the actual 24 PPQN duration, not draw length.
t.restart();t.setTick(12);t.record('noteon',79,100,1);
t.ctx.currentTime+=0.0625;t.record('noteoff',79,0,1);
near(t.state.patterns[2].pianoRollNotes.find(n=>n.note===79).length,0.5);
console.log('PASS recorded note duration uses audio clock at 24 PPQN');
// An overdub at exactly the same grid tick must keep the old pitch/velocity
// and original longer duration, without adding a duplicate note-on event.
const priorNotes=t.state.patterns[2].pianoRollNotes;
t.setTick(12);const present={note:81,start:2,tick:12,length:3,channel:1,velocity:88};
priorNotes.push(present);const lengthBefore=priorNotes.length;
t.ctx.currentTime+=0.5;t.record('noteon',81,110,1);t.ctx.currentTime+=0.0625;t.record('noteoff',81,0,1);
assert.equal(priorNotes.length,lengthBefore);
assert.equal(present.length,3);assert.equal(present.velocity,88);
console.log('PASS MIDI overdub does not double-trigger or shorten existing note at same tick');
// Diagnostics must batch on stop/switch rather than every note off.
assert(t.logs.every(e=>e.event==='held-notes-finalized'&&['pattern-change','record-stop'].includes(e.details.reason)));
assert(t.logs.length<=2);
console.log('PASS no per-MIDI-event diagnostic flooding');
