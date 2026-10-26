const fs=require('fs'),assert=require('assert');
const h=fs.readFileSync('P-12.html','utf8'),m=fs.readFileSync('main.js','utf8'),p=fs.readFileSync('preload.js','utf8'),c=fs.readFileSync('native-host/src/main.cpp','utf8');
for(const s of ['p12ValidateProjectData','p12RecoverySnapshot','p12GlobalPanic','p12AudioWatchdog','p12PerformanceSnapshot','p12ReleaseSelfTest','P12_VIEW_STORE'])assert(h.includes(s),s);
for(const s of ["p12:safe-save-text","p12:recovery-write","p12:window-state","p12:vst-quarantine-status"])assert(m.includes(s),s);
for(const s of ['safeSaveText','writeRecovery','windowState','getVSTQuarantine'])assert(p.includes(s),s);
for(const s of ['nativeCostlyKind','nativeCostlyIndex','nativeCostlySlot'])assert(c.includes(s),s);
console.log('PASS safety/recovery/integrity/watchdog/persistence/self-test source guards');
