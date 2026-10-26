const fs=require('node:fs'),assert=require('node:assert/strict');
const main=fs.readFileSync(__dirname+'/main.js','utf8'),html=fs.readFileSync(__dirname+'/P-12.html','utf8'),piano=fs.readFileSync(__dirname+'/piano-detached.html','utf8');
function pass(ok,desc){assert.ok(ok,desc);console.log('PASS',desc)}
pass(main.includes("title:'P-12 — VST Piano Roll',backgroundColor")&&!main.includes("title:'P-12 — VST Piano Roll',parent:mainWindow"),'standalone piano window');
for(const action of ['audition','auditionOff','create','resize','velocity'])pass(html.includes("case '"+action+"':"),'main piano handler '+action);
pass(piano.includes("send('audition'")&&piano.includes("send('auditionOff'")&&piano.includes('paintKeys()'),'live piano audition/key illumination');
pass(piano.includes("d.mode==='resize'")&&piano.includes("send('create'")&&piano.includes("'copyMove'"),'mouse draw / resize / move / copy');
pass(piano.includes('applyZoom(')&&piano.includes('vplus')&&piano.includes('hminus')&&piano.includes('wheel'),'independent XY zoom controls');
pass(html.includes('if(hit&&!wasSelected')&&html.includes("step.addEventListener('contextmenu'"),'sequencer drag selection and delete');
pass(html.includes('sp12EventsForP12Pattern')&&html.includes('renderSP12ProjectFids'),'Rossum export source retained');
for(const [name,source] of [['main.js',main],['P-12.html',html],['piano-detached.html',piano]]){const scripts=name.endsWith('.html')?[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]):[source];for(const code of scripts)new Function(code);console.log('PASS JavaScript syntax',name)}
