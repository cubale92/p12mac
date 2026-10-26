'use strict';
const dgram=require('node:dgram');
// Small P-12 LAN discovery service. Only announces a name, stable ID and MIDI
// port. MIDI admission still requires local approval or a remembered credential.
class DeviceDiscovery{
 constructor({port=17813,host='0.0.0.0',socketFactory=()=>dgram.createSocket({type:'udp4',reuseAddr:true})}={}){Object.assign(this,{port,host,socketFactory});}
 async start(device){if(this.socket)return;const s=this.socket=this.socketFactory();
  s.on('message',(buffer,remote)=>{if(buffer.length>512)return;let q;try{q=JSON.parse(buffer);}catch{return;}
   if(q?.type!=='p12-discover-v1'||!/^[a-zA-Z0-9-]{8,64}$/.test(q.nonce||''))return;
   const response=Buffer.from(JSON.stringify({type:'p12-device-v1',nonce:q.nonce,...device}));s.send(response,remote.port,remote.address,()=>{});
  });
  await new Promise((resolve,reject)=>{s.once('error',reject);s.bind(this.port,this.host,()=>{s.removeListener('error',reject);resolve();});});this.port=s.address().port;
  s.on('error',()=>{});
 }
 stop(){if(this.socket){try{this.socket.close();}catch{}this.socket=null;}}
}
module.exports={DeviceDiscovery};
