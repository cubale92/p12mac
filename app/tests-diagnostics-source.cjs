'use strict';
const fs=require('fs');
const vm=require('vm');
function need(ok,msg){if(!ok){console.error('FAIL',msg);process.exit(1)}console.log('PASS',msg)}
const main=fs.readFileSync('main.js','utf8');
const preload=fs.readFileSync('preload.js','utf8');
const html=fs.readFileSync('P-12.html','utf8');
need(main.includes('P12_DIAGNOSTICS.log'),'central diagnostics file');
need(main.includes("p12Diag('AUDIO','native-status'") || main.includes("p12Diag('AUDIO', 'native-status'"),'native audio snapshots');
need(main.includes("ipcMain.on('p12:diagnostic'"),'renderer diagnostic IPC');
need(main.includes('P12_DIAGNOSTIC_MAX_BYTES'),'diagnostic rotation/bounds');
need(main.includes("p12Diag('NATIVE_HOST','request'") && main.includes("p12Diag('NATIVE_HOST','response'"),'native host request/response timing');
need(preload.includes('writeDiagnostic')&&preload.includes('getDiagnosticPath'),'diagnostic bridge exposed');
need(html.includes("p12DiagSend('PROJECT','save-start'")&&html.includes("p12DiagSend('PROJECT','load-start'"),'project save/load diagnostics');
need(html.includes("p12DiagSend('ROSSUM','sp12-export-start'")&&html.includes("p12DiagSend('ROSSUM','hfe-export-start'"),'SP12/HFE export diagnostics');
need(html.includes("p12DiagSend('ROSSUM','sp12-import-ok'")&&html.includes("p12DiagSend('ROSSUM','donor-load-start'"),'SP12 import/donor diagnostics');
need(html.includes("p12DiagSend('UI','click'")&&html.includes("p12DiagSend('UI','change'"),'UI action diagnostics');
need(html.includes("p12DiagSend('RENDERER','runtime-error'")&&html.includes("p12DiagSend('RENDERER','unhandled-rejection'"),'renderer error diagnostics');
need(html.includes("p12DiagSend('AUDIO','counter-increase'"),'audio spike counter diagnostics');
// Compile every inline JS block as existing integrated test does.
const blocks=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>x.trim());
for(let i=0;i<blocks.length;i++)new vm.Script(blocks[i],{filename:`P-12.inline.${i}.js`});
need(true,`${blocks.length} inline script blocks compile`);
