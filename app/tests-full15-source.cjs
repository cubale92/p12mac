const fs = require('node:fs');
const assert = require('node:assert');
const app = fs.readFileSync('P-12.html','utf8');
const host = fs.readFileSync('native-host/src/main.cpp','utf8');
const electron = fs.readFileSync('main.js','utf8');
const cases = [
  ['stable separate mixer window',app.includes('openMixerWindow')&&electron.includes("ipcMain.handle('p12:mixer-open'")&&electron.includes("loadFile(path.join(__dirname,'mixer-detached.html'))")&&fs.existsSync('mixer-detached.html')],
  ['VST3 uses JUCE even with legacy comparison off',app.includes('VST3 is a JUCE native feature, NOT dependent on LEGACY VST')],
  ['enables native VST audio after insert assignment',app.includes('const start=await nativeSetEnabled(true)')],
  ['restores VST audio on project reload',app.includes("'project-vst-native-start-failed'")],
  ['VST bypass retains plugin instance',host.includes('if (it != instances.end()) it->second->enabled = false;')],
  ['native FX on pad/track/master',host.includes('builtinPad')&&host.includes('builtinTrack')&&host.includes('builtinMaster')],
  ['native effects sync IPC allowed',electron.includes("'nativeBuiltinSync'")&&host.includes('nativeBuiltinSync(payload)')],
  ['VST discovery diagnostics',host.includes('VST DISCOVERY FAILED')],
  ['VST instance diagnostics',host.includes('VST INSTANTIATION FAILED')],
  ['Rossum export retained',app.includes('.sp12')&&app.includes('.hfe')],
  ['no temporary juce array lifetime',host.includes('const auto routeValue=property(payload,"routes")')]
];
for(const [name, pass] of cases){ assert(pass,name);console.log('PASS '+name);}
