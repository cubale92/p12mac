const fs=require('fs'),crypto=require('crypto');
const html=fs.readFileSync('P-12.html','utf8');
const marker='const SP12_SAMPLE_RATE = 26040;';
const i=html.indexOf(marker);
if(i<0)throw new Error('SP12 export marker missing');
const hash=crypto.createHash('sha256').update(html.slice(i)).digest('hex');
const expected='cedfe2d3d96ab14e65f9203a0ae677bf635edc29023cea1f41ef7711a8518ed5';
if(hash!==expected)throw new Error(`Rossum export suffix changed: ${hash}`);
for(const required of [
  'Fold to mono explicitly, deterministic Blackman/sinc resample, remove',
  'p12Sinc(d * cutoff) * p12BlackmanWindow(ad)',
  'mean /= outLen',
  'SP12_SAMPLE_RATE = 26040'
]) if(!html.includes(required)) throw new Error('Missing export invariant: '+required);
if(!html.includes("spCharacter:state.engine[fid]!=='hifi'"))throw new Error('Native playback character flag missing');
const exportSuffix=html.slice(i);
if(exportSuffix.includes('spCharacter:'))throw new Error('Playback character leaked into SP12 export section');
console.log('PASS: SP playback character is isolated from byte-identical Rossum export source');
