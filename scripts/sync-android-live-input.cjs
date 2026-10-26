'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const write=(p,s)=>fs.writeFileSync(path.join(root,p),s);
const desktop=read('app/P-12.html'),asset='android/app/src/main/assets/';
let html=read(asset+'P-12.html');
const patches=JSON.parse(read('android/ANDROID_SOURCE_PATCHES.json'));
function section(s,a,b){const i=s.indexOf(a),j=s.indexOf(b,i);assert(i>=0&&j>i,a);return s.slice(i,j);}
function replaceOnce(old,next){assert.equal(html.split(old).length,2,old.slice(0,80));html=html.replace(old,next);}
function patch(old,next){
 const existing=patches.find(p=>p.original===old);
 if(existing){replaceOnce(existing.android,next);existing.android=next;}
 else {replaceOnce(old,next);patches.push({original:old,android:next});}
}
const mark='  // P-12 v1.0 Tune BF/Tune AT + sequencer pitch/triplet/high-tempo fix';
patch(mark,section(desktop,'  // ---------------- P12 Retro: KNOCK engine (Web Audio path) ----------------',mark)+mark);
const recoveryStart='  let p12RecoveryBusy=false,p12RecoveryDirtyTimer=null,p12RecoveryDeferred=false;';
const recoveryEnd='  // Electron-only atomic download interception.';
const previousRecovery=patches.find(p=>p.original.startsWith(recoveryStart));
patch(previousRecovery?previousRecovery.original:section(html,recoveryStart,recoveryEnd),section(desktop,'  // Manual project saving only.',recoveryEnd));
patch("    if(typeof p12RecoveryDeferred!=='undefined'&&p12RecoveryDeferred)\n      setTimeout(()=>p12WriteRecovery('transport-stop'),2000);",'    // No automatic recovery save when transport stops.');
patch("    if(typeof p12RecoveryDirtyTimer!=='undefined'){clearTimeout(p12RecoveryDirtyTimer);p12RecoveryDirtyTimer=null;}",'    // Manual saving has no recovery timer to cancel.');
patch('createKnob({min:-7, max:7, value:state.tune[fid]','createKnob({min:-24, max:24, value:state.tune[fid]');
patch("appendMixerMiniParam(strip, 'Tune AT', -8, 7,","appendMixerMiniParam(strip, 'Tune AT', -24, 24,");
const oldJitter="  setInterval(()=>{const now=performance.now(),drift=Math.max(0,now-jitterLast-1000);jitterMax=Math.max(jitterMax,drift);jitterLast=now;const el=byId('diagJitter');if(el)el.textContent='UI '+drift.toFixed(1)+'ms / peak '+jitterMax.toFixed(1)+'ms (not audio underruns)';},1000);\n";
patch(oldJitter,section(desktop,'  let jitterWindowWasHidden=document.hidden;','  function dlog('));
write(asset+'P-12.html',html);
write(asset+'p12-sp-mixer.js',read('app/p12-sp-mixer.js'));
write('android/ANDROID_SOURCE_PATCHES.json',JSON.stringify(patches,null,2)+'\n');
console.log('Synced Android manual saving, Tune AT range and stall diagnostics; original-source patch history preserved');
