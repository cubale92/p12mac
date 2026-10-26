'use strict';
// Distribution/build preflight: verifies the actual files that Electron will package.
const fs=require('node:fs');const assert=require('node:assert/strict');
const vm=require('node:vm');const cp=require('node:child_process');
const html=fs.readFileSync('P-12.html','utf8');
const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
const main=fs.readFileSync('main.js','utf8');
const tests={
 'FULL15 faceplate': ['id="lcdMain"','id="mixerWinBackdrop"','id="p12PianoTarget"','id="saveProjectBtn"'].every(x=>html.includes(x)),
 'native audio IPC + VST host': main.includes('p12-vst-host')&&fs.existsSync('native-host/src/main.cpp')&&fs.existsSync('preload.js'),
 'Mixer 32 master and all pads/tracks': html.includes('mixerwinStrips')&&html.includes('mixerwinTrackStrips')&&html.includes('mixerGoMaster'),
 'Mixer interior XY scrolling and zoom': html.includes('mixerwin-row-scroll')&&html.includes('mixerWorkspaceZoom')&&html.includes('e.stopPropagation()'),
 'Project.p12 and legacy project import': (html.includes("a.download = 'Project.p12'")||html.includes("defaultName:'Project.p12'"))&&html.includes('accept=".p12,.p12proj,.json,.sp12'),
 'SP12/HFE and original timing': html.includes('SP12_FILE_SIZE = 824546')&&html.includes('SP1200_HFE_BASE_B64')&&html.includes('TIME_CORRECT_CYCLE'),
 'offline zip exports': html.includes('vendor/jszip.min.js')&&fs.existsSync('vendor/jszip.min.js')&&pkg.build.files.includes('vendor/jszip.min.js')&&pkg.build.files.includes('vendor/LICENSE-JSZIP-MIT.txt'),
 'original installer icon present':fs.existsSync('build/icon.ico')&&fs.existsSync('build/icon.png'),
 'electron resource packaging': pkg.build.files.includes('P-12.html')&&pkg.build.extraResources.some(x=>x.from==='native'),
 'writable packaged startup logs': main.includes("app.getPath('userData')"),
 'original VST3 native build source':fs.existsSync('native-host/CMakeLists.txt')&&fs.existsSync('BUILD_P12_VST_HOST.ps1'),
};
for(const [name,pass] of Object.entries(tests)){console.log((pass?'PASS':'FAIL')+' '+name);assert(pass,name);}
const scripts=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(x=>x.trim());
for(const [i,source]of scripts.entries())new vm.Script(source,{filename:'P-12-inline-'+i});
console.log('PASS '+scripts.length+' inline script blocks compile');
for(const file of ['main.js','preload.js','transport-controller.cjs','recovery-worker.cjs','piano-detached.html','mixer-detached.html']){
 if(file.endsWith('.html')){
  const code=fs.readFileSync(file,'utf8');
  for(const [i,m]of [...code.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries())
   if(m[1].trim())new vm.Script(m[1],{filename:'piano-script-'+i});
 }else new vm.Script(fs.readFileSync(file,'utf8'),{filename:file});
}
for(const f of ['tests-full10-source.cjs','tests-full11-source.cjs','tests-full13-source.cjs','tests-full14-source.cjs','tests-full15-source.cjs','tests-nine-point-source.cjs','tests-workflow-ui-source.cjs','tests-piano-recording-edge.cjs','tests-midi-input-recovery.cjs','tests-save-playback-snapshot.cjs','tests-piano-countin-source.cjs','tests-diagnostics-source.cjs','tests-native-host-realtime-source.cjs','tests-final-release-source.cjs','tests-safety-layer-source.cjs','tests-transport-controller.cjs','tests-wireless-midi.cjs','tests-live-timing-diagnostics.cjs','tests-manual-save-only.cjs','tests-native-plan-compiler.cjs','tests-mixer-window-ipc.cjs','tests-playlist-window-ipc.cjs','tests-recovery-worker.cjs','tests-rossum-encoder-unchanged.cjs','tests-hfe-hardware-layout.cjs','tests-native-pad-controls.cjs','tests-native-insert-catalog.cjs']){
 cp.execFileSync(process.execPath,[f],{stdio:'pipe',timeout:20000});console.log('PASS '+f);
}
console.log('FULL15 INTEGRATED PREFLIGHT PASSED');
