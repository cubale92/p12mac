'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('P-12.html','utf8'),start=html.indexOf('  const INSERT_DEFS = {'),end=html.indexOf('\n  };',start)+5;
const catalog=vm.runInNewContext(html.slice(start,end)+';Object.keys(INSERT_DEFS)');
const nativeTests=fs.readFileSync('native-host/tests-inserts.cpp','utf8');
for(const type of catalog)assert(nativeTests.includes('"'+type+'"'),'Native audio test missing '+type);
assert.equal(catalog.length,48);
assert(fs.readFileSync('BUILD_P12_VST_HOST.ps1','utf8').includes('--target p12-insert-tests'));
console.log('PASS every original GUI insert choice has a native audio regression; Windows build requires insert DSP tests');
