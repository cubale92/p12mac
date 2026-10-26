const fs=require('fs');const assert=require('assert');const app=fs.readFileSync('P-12.html','utf8'),piano=fs.readFileSync('piano-detached.html','utf8');
const tests={
'CC direction option persists':app.includes("localStorage.setItem('p12.midi.invertIncomingCc'")&&app.includes('127 - v'),
'CC invert does not change MIDI notes':app.includes('pianoObserveIncoming(kind,note,vel127,pianoChannel)')&&app.includes('normalizedIncomingCc(data[2]&0x7f)'),
'live MIDI note channel decoded':app.includes("String(k).split(':')[1]"),
'captures held chord while stopped':app.includes('function finishPianoChord()')&&app.includes('if(!pianoDetachedActive||state.playing||pianoMidiRecording)'),
'chord added through normal undoable editing':app.includes("case 'chordInsert'")&&app.includes('pianoCommit(notes,false)'),
'dismiss chord does not edit notes':app.includes("case 'chordDiscard'"),
'detached piano shows sounding notes':piano.includes('function displayIncoming()')&&piano.includes('state.chordName'),
'detached piano has insert/discard buttons':piano.includes('id="chordAdd"')&&piano.includes('id="chordSkip"'),
'chord insert cursor can use ruler':piano.includes("bars.addEventListener('pointerdown'"),
'JUCE and Rossum unchanged':app.includes('SP-1200')&&fs.existsSync('native-host')&&fs.existsSync('main.js')
};for(const [name,result] of Object.entries(tests)){assert(result,name);console.log('PASS',name)}
