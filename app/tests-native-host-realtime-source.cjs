const fs=require('fs');
const src=fs.readFileSync('native-host/src/main.cpp','utf8');
const html=fs.readFileSync('P-12.html','utf8');
const main=fs.readFileSync('main.js','utf8');
function ok(name,cond){if(!cond){console.error('FAIL',name);process.exit(1)} console.log('PASS',name)}
ok('standalone VST accepts short callbacks', src.includes('inst.scratch.getNumSamples() < numSamples') && src.includes('AudioBuffer<float> pluginBlock'));
ok('standalone VST no exact callback-size drop', !src.includes('inst.scratch.getNumSamples() != numSamples'));
ok('standalone mono VST mirrors right channel', src.includes('pluginOutputs == 1 && numOutputChannels > 1'));
ok('oversize callback telemetry exposed by host', src.includes('"oversizePluginCallbacks"') && src.includes('nativeOversizePluginCallbacks'));
ok('oversize callback telemetry shown/logged by renderer', html.includes('oversizePluginCallbacks:stats.oversizePluginCallbacks||0') && html.includes('oversize VST cb'));
ok('central diagnostics tracks oversize callbacks', main.includes("'oversizePluginCallbacks'"));

const sampler=fs.readFileSync('native-host/src/P12NativeSampler.h','utf8');
ok('SP character preserves full -5 octave clock range', sampler.includes('spClock/32.0,spClock*32.0'));
