'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('P-12.html','utf8');
const span=(a,b)=>html.slice(html.indexOf(a),html.indexOf(b,html.indexOf(a)));
const template=html.match(/const SP12_BUILTIN_TEMPLATE_B64\s*=\s*['"]([^'"]+)['"]/)[1];
const ctx=vm.createContext({console,Uint8Array,DataView,SP12_BUILTIN_TEMPLATE_B64:template,base64ToArrayBuffer:s=>Uint8Array.from(Buffer.from(s,'base64')).buffer,SP12_NAME_OFFSET:0x9114,SP12_NAME_BYTES:6,SP12_AUDIO_OFFSET:0x94e2,SP12_AUDIO_BYTES:0xc0000,SP12_FILE_SIZE:824546,SP12_DIR_OFFSET:0x9260,SP12_DIR_RECORD_BYTES:10,SP12_PAGE_SAMPLES:65536,SP12_RAM_SAMPLES:524288,SP12_PAGE_USED_OFFSETS:[0x9258,0x925a,0x9254,0x9256,0x9110,0x9112,0x925c,0x925e],SP1200_HFE_SECTOR_BYTES:3584,SP1200_HFE_BASE_B64:fs.readFileSync('SP1200_HFE_BASE.hfe').toString('base64'),SP1200_HFE_RAW_BASE_B64:fs.readFileSync('SP1200_HFE_BASE.raw').toString('base64'),SP12_DISK_BANKS:['D','C','B','A'],VOICES:Array.from({length:8},(_,i)=>({id:String(i+1)})),fullId:(b,v)=>b+'_'+v});
vm.runInContext(span('  function sp12PadId(','  function sp12SoundNumberForFid(')+span('  function sp12NameRecordIndex(','  function sanitizeSP12Name(')+span('  function parseSP12SoundDirectory(','  function decodeSP12Sound(')+span('  function sp1200BitReverse8(','  function planSP1200Vintage4Pages(')+span('  function p12DecodeHfeSectors(','  const p12HfeOriginalPlacedBuilder='),ctx);
const D=(process.env.P12_HFE_REFERENCE_DIR||'/workspace/scratch/dab1b0493eea/upload').replace(/[/\\]$/,'')+'/';
const original=fs.readFileSync(D+'SP1200_OS12(3).hfe'),saved=fs.readFileSync(D+'SP1200_OS12.sp12'),converted=Buffer.from(ctx.p12HfeToStateImage(original));
assert.deepEqual(converted.subarray(0x10,0x94e2),saved.subarray(0x10,0x94e2),'physical reference sequence + sound metadata');
const word=(bytes,n)=>{const off=0x94e2+Math.floor(n/2)*3;return bytes[off+n%2]*16+((bytes[off+2]>>(n%2*4))&15);};
for(const sound of ctx.parseSP12SoundDirectory(saved.buffer.slice(saved.byteOffset,saved.byteOffset+saved.length)))for(let n=0;n<sound.length;n++)assert.equal(word(converted,sound.page*65536+sound.start+n),word(saved,sound.page*65536+sound.start+n));
// Supplied failing HFE is readable, but it contains the template beat/routing.
const bad=Buffer.from(ctx.p12HfeToStateImage(fs.readFileSync(D+'KKOY.hfe'))),source=fs.readFileSync(D+'FORESTKKO.sp12');assert.notDeepEqual(bad.subarray(0x10,0x280),source.subarray(0x10,0x280));
const fixed=Buffer.from(ctx.sp1200BuildHfeFromSP12(new Uint8Array(source))),back=Buffer.from(ctx.p12HfeToStateImage(fixed));
assert.deepEqual(back.subarray(0x10,0x9110),source.subarray(0x10,0x9110),'FORESTKKO exact sequences/songs/mixes');
let count=0,total=0;const hardware=[0,1,6,7];
for(const s of ctx.parseSP12SoundDirectory(source.buffer.slice(source.byteOffset,source.byteOffset+source.length))){
 const off=0x9260+s.soundNumber*10;assert.equal(back[off+2],source[off+2],'live output/mode/level byte');assert.equal(back.readUInt16LE(off+4),s.start);assert.equal(back.readUInt16LE(off+6),source.readUInt16LE(off+6));
 for(let n=0;n<s.length;n++)assert.equal(word(back,hardware[s.page]*65536+s.start+n),word(source,s.page*65536+s.start+n));count++;total+=s.length;
}
assert.equal(count,7);assert.equal(total,143392);
const truncated=fixed.subarray(0,10000);assert.throws(()=>ctx.p12HfeToStateImage(truncated),/Truncated/);
const broken=Buffer.from(fixed);broken[ctx.sp1200HfeTrackFileOffset(new Uint8Array(broken),12,0,176)]^=8;assert.throws(()=>ctx.p12HfeToStateImage(broken),/FM data|CRC/);
if(process.argv[2])fs.writeFileSync(process.argv[2],fixed);
console.log('PASS HFE import / FORESTKKO repair: original hardware pair, exact sequences/songs/mixes, seven pads / '+total+' exact 12-bit samples, routing, CRCs, malformed-file rejection');
