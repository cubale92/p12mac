'use strict';
// Optional integration check against locally installed plugins; no vendor files are copied.
// node scripts/test-vst-load.cjs <host-exe> <plugin-path> [more-plugin-paths...]
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const [hostPath,...plugins]=process.argv.slice(2);
async function check(pluginPath){
  const host=spawn(hostPath,['--json-lines'],{stdio:['pipe','pipe','inherit']});
  try {
    const reply=await new Promise((resolve,reject)=>{
      let buffer='';
      const timer=setTimeout(()=>reject(new Error('Plugin load timed out: '+pluginPath)),60000);
      const finish=(fn,value)=>{clearTimeout(timer);fn(value);};
      host.on('error',error=>finish(reject,error));
      host.on('exit',code=>finish(reject,new Error('Host exited: '+code)));
      host.stdout.on('data',chunk=>{
        buffer+=chunk;let end;
        while((end=buffer.indexOf('\n'))>=0){
          const line=buffer.slice(0,end);buffer=buffer.slice(end+1);
          let value;try{value=JSON.parse(line);}catch{continue;}
          if(value.replyTo==='load-test')finish(resolve,value);
        }
      });
      host.stdin.write(JSON.stringify({id:'load-test',command:'setMixerInsertVST',payload:{
        target:'track',id:0,slot:1,path:pluginPath,format:'VST3',enabled:true
      }})+'\n');
    });
    assert.equal(reply.ok,true,reply.message);
    assert.equal(reply.path,pluginPath,'Keep the saved route path unchanged');
    console.log('PASS load: '+reply.name+' ('+pluginPath+')');
  } finally { host.stdin.end();host.kill(); }
}
(async()=>{
  assert(hostPath&&plugins.length,'Provide a host executable and at least one installed plugin path');
  for(const plugin of plugins)await check(plugin);
})().catch(error=>{console.error(error);process.exitCode=1;});
