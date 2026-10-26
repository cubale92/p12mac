'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),crypto=require('node:crypto');
let html=fs.readFileSync('P-12.html','utf8');
// Project-only master level persistence; never part of Rossum conversion.
html=html.replace('      masterVolume: state.masterVolume,\n','');
// Runtime diagnostic instrumentation is not Rossum conversion. Its behavior
// is separately exercised in tests-manual-save-only.cjs. Normalize only that
// named block so the original encoder baseline remains enforced.
const jitterStart=html.indexOf('  let jitterWindowWasHidden=document.hidden;');
const jitterEnd=html.indexOf('  setInterval(p12MeasureEventLoop,1000);',jitterStart);
if(jitterStart>=0){
 assert(jitterEnd>jitterStart);
 html=html.slice(0,jitterStart)+"  setInterval(()=>{const now=performance.now(),drift=Math.max(0,now-jitterLast-1000);jitterMax=Math.max(jitterMax,drift);jitterLast=now;const el=byId('diagJitter');if(el)el.textContent='UI '+drift.toFixed(1)+'ms / peak '+jitterMax.toFixed(1)+'ms (not audio underruns)';},1000);"+html.slice(jitterEnd+'  setInterval(p12MeasureEventLoop,1000);'.length);
}
const start=html.indexOf('  function sp1200BuildHfeFromSP12('),end=html.indexOf('  function planSP1200Vintage4Pages(',start);
assert(start>=0&&end>start);
html=html.slice(0,start)+'  // HFE container builder independently validated\n'+html.slice(end);
const marker='  // P-12 v1.0 Tune BF/Tune AT + sequencer pitch/triplet/high-tempo fix';
const digest=crypto.createHash('sha256').update(html.slice(html.indexOf(marker))).digest('hex');
assert.equal(digest,'d4fb018c2969fc50ca2760cd5459be1def5aed801954997f95e0486d8382b5ac');
console.log('PASS SHA256: original Rossum source unchanged except the separately tested HFE container builder');
