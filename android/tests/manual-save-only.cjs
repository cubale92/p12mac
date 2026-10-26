'use strict';
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const html=fs.readFileSync(path.join(root,'android/app/src/main/assets/P-12.html'),'utf8');
const desktop=fs.readFileSync(path.join(root,'app/P-12.html'),'utf8');
assert(!html.includes('p12WriteRecovery('));
assert(!html.includes('p12RecoveryDirtyTimer'));
assert(!html.includes('saveSessionIfDirty'));
assert(html.includes('async function saveProject(){'));
assert(html.includes("a.download = 'Project.p12'"));
assert(html.includes('createKnob({min:-24, max:24, value:state.tune[fid]'));
const block=s=>s.slice(s.indexOf('  let jitterWindowWasHidden=document.hidden;'),s.indexOf('  function dlog('));
assert.equal(block(html),block(desktop),'Same stall diagnostics on Android');
assert.equal(fs.readFileSync(path.join(root,'android/app/src/main/assets/p12-sp-mixer.js'),'utf8'),fs.readFileSync(path.join(root,'app/p12-sp-mixer.js'),'utf8'));
for(const [i,m] of [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].entries())if(m[1].trim())new vm.Script(m[1],{filename:'android-inline-'+i});
console.log('PASS Android manual save, no recovery triggers, Tune AT range, shared diagnostics and script syntax');
// A valid PNG header alone is insufficient: truncated IDAT data previously
// survived packaging but failed to decode in the launcher.
const zlib=require('node:zlib');
const res=path.join(root,'android/app/src/main/res');
let icons=0;
function checkIcons(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
 const p=path.join(dir,entry.name);if(entry.isDirectory()){checkIcons(p);continue;}
 if(!p.endsWith('.png'))continue;
 const b=fs.readFileSync(p);assert.equal(b.subarray(0,8).toString('hex'),'89504e470d0a1a0a',p);
 let pos=8,end=false,data=[];
 while(pos<b.length){assert(pos+12<=b.length,p);const n=b.readUInt32BE(pos),type=b.toString('ascii',pos+4,pos+8);assert(pos+12+n<=b.length,'Truncated PNG '+p);if(type==='IDAT')data.push(b.subarray(pos+8,pos+8+n));pos+=12+n;if(type==='IEND'){end=true;break;}}
 assert(end&&data.length,p);assert(zlib.inflateSync(Buffer.concat(data)).length>0,p);icons++;
}}
checkIcons(res);assert.equal(icons,11);console.log('PASS all Android PNG icon streams are complete and decompress');
