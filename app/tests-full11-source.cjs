const fs=require('fs');
const main=fs.readFileSync('P-12.html','utf8');
const det=fs.readFileSync('piano-detached.html','utf8');
const cpp=fs.readFileSync('native-host/src/main.cpp','utf8');
const checks=[
 ['full MIDI 0-127 roll', /low=0,high=127/.test(det)],
 ['velocity lane', /value="velocity"/.test(det)&&/velocitySelected/.test(main)],
 ['CC1 lane', /Modulation CC1/.test(det)&&/automationSet/.test(main)],
 ['pitch bend lane', /Pitch Bend/.test(det)&&/type==='pitchbend'/.test(main)],
 ['channel pressure lane/native', /Channel Pressure/.test(det)&&/channelPressureChange/.test(cpp)],
 ['MIDI channels 1-16', /for\(let i=1;i<=16;i\+\+\)/.test(det)&&/pianoMidiChannel/.test(main)],
 ['automation saved per pattern', /pianoAutomation: Array\.isArray\(p\.pianoAutomation\)/.test(main)&&/fresh\.pianoAutomation/.test(main)],
 ['automation transport playback', /currentPatternObj\(\)\.pianoAutomation/.test(main)&&/pianoMidiMessage\(\{type:'cc'/.test(main)],
 ['both note edges', /edge left/.test(det)&&/edge right/.test(det)&&/resizeStartSelected/.test(main)],
 ['multi-note resize', /resizeSelected/.test(det)&&/case 'resizeSelected'/.test(main)],
 ['DAW shortcuts', /send\('quantize'\)/.test(det)&&/send\('duplicate'\)/.test(det)],
 ['sequencer arrow nudge', /\['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'\]/.test(main)&&/seqMove/.test(main)],
 ['Rossum exporter retained', /SP12_AUDIO_OFFSET/.test(main)&&/rossumNative/.test(main)],
 ['detached Electron retained', /openPianoWindow/.test(main)&&fs.existsSync('main.js')]
];
let bad=0;for(const [n,ok] of checks){console.log((ok?'PASS':'FAIL'),n);if(!ok)bad++;}process.exitCode=bad?1:0;
