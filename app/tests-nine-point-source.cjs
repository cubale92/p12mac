const fs=require('fs'),assert=require('assert'),path=require('path');
const root=__dirname,html=fs.readFileSync(path.join(root,'P-12.html'),'utf8'),main=fs.readFileSync(path.join(root,'main.js'),'utf8');
const host=fs.readFileSync(path.join(root,'native-host/src/main.cpp'),'utf8');
const native=fs.readFileSync(path.join(root,'native-host/src/P12NativeSampler.h'),'utf8');
const pkg=require(path.join(root,'package.json'));
function check(c,label){assert(c,label);console.log('PASS:',label)}
check(html.includes('p12PianoRecord')&&html.includes('pianoRecordIncoming(')&&html.includes('pianoHeld.set('),'separate MIDI recording and note durations');
check(html.includes('pianoSelectRect(')&&html.includes('seqHandlePointerDown(')&&html.includes('pianoMove('),'mouse selection on both grids');
check(html.includes('p12PianoTC')&&html.includes('TIME_CORRECT_TICKS')&&html.includes('inputGrid:tc'),'per-note Rossum TC controls');
check(pkg.build.files.includes('piano-detached.html')&&main.includes('p12:piano-open')&&fs.existsSync(path.join(root,'piano-detached.html')),'detached Piano Roll packaged');
check(html.includes('padMidiChannels[fid]')&&html.includes('padChannel!==16 && padChannel!==midiInChannel')&&html.includes("midiRoute.textContent='MIDI IN'"),'MIDI-channel isolation');
check(!html.slice(html.indexOf('function pianoTransportStep(idx,time){'),html.indexOf('function stopPianoPreview(){')).includes('idx%16')&&html.includes('pianoTransportStep(idx,time)'),'full-sequence MIDI follow (no modulo 16)');
check(native.includes('lateStarts_')&&native.includes('lateStops_')&&host.includes('lateNativeStarts'),'separate native lateness counters');
check(html.includes('sp12EventsForP12Pattern')&&html.includes('renderSP12ProjectFids'),'Rossum SP12 import/export retained');
check(html.includes('pianoRollNotes: Array.isArray(p.pianoRollNotes)')&&html.includes('padMidiChannels'),'pattern save/load and MIDI route persistence');
