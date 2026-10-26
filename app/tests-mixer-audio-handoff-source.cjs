const fs=require('fs');
const assert=require('assert');
const html=fs.readFileSync('P-12.html','utf8');
const host=fs.readFileSync('native-host/src/main.cpp','utf8');
const sampler=fs.readFileSync('native-host/src/P12NativeSampler.h','utf8');
const main=fs.readFileSync('main.js','utf8');
const gate=fs.readFileSync('FINAL_RELEASE_GATE.cmd','utf8');
assert(html.includes('.mixerwin-panel{width:98vw'), 'Mixer-32 must use nearly full window width');
assert(html.includes('flex:0 0 178px; width:178px'), 'Mixer strips must use the enlarged channel width');
assert(html.includes("font-size:11px;padding:6px 5px;min-height:31px"), 'Insert selectors must be large enough to operate');
assert(html.includes("if(state.playing||state.counting){\n        stopPlayback();"), 'Backend switch must stop the authoritative transport first');
assert((html.match(/nativeAudioCommand\('allNotesOff'/g)||[]).length>=2, 'Backend switch must panic native VST/MIDI state');
assert(html.includes('await requestStart(resumeChain,null,0);'), 'Playing backend switch must restart through one transport');
assert(sampler.includes('void serviceStopRequest() noexcept'), 'Sampler must drain stale events while native mode is off');
assert(sampler.includes('void resetDiagnostics() noexcept'), 'Sampler diagnostics must reset per native session');
assert(host.includes('nativeSampler.serviceStopRequest();'), 'Audio callback must service native stop requests while native mode is off');
assert(main.includes('screen.getDisplayMatching'), 'Persisted application bounds must be clamped to a connected display');
assert(gate.includes('%APPDATA%\\p12-desktop\\P12_ELECTRON.log'), 'Smoke marker must use Electron Roaming userData path');

assert(html.includes('function openMixerPopout()'), 'Mixer-32 must open as a real second window');
assert(html.includes('width=1800,height=1000,resizable=yes,scrollbars=yes'), 'Mixer-32 popout must be large and resizable');
assert(html.includes("querySelectorAll('button:not([type])').forEach(b=>b.type='button')"), 'Mixer popout must prevent accidental submit/navigation');
assert(html.includes('if(state.playing||state.counting){p12RecoveryDeferred=true;return;}'), 'Recovery serialization must never run during playback/count-in');
assert(html.includes('NATIVE_SCHEDULE_AHEAD=0.95'), 'Native sequencer needs extended renderer-stall coverage');
assert(html.includes('p12NativeScheduleHorizon()'), 'Native schedule horizon must be loop-aware');

console.log('PASS mixer sizing / second window / insert usability / realtime recovery / native audio handoff guards');
