'use strict';
const http=require('node:http'),os=require('node:os'),crypto=require('node:crypto'),fs=require('node:fs'),path=require('node:path');
const {EventEmitter}=require('node:events');
const {DeviceDiscovery}=require('./p12-device-discovery.cjs');
const {WebSocketServer,WebSocket}=require('./vendor/ws');
function midiBytes(v){
 if(!Array.isArray(v)||v.length<1||v.length>3||v.some(x=>!Number.isInteger(x)||x<0||x>255))return null;
 const s=v[0];if(s<0x80)return null;
 const n=s<0xf0?((s&0xe0)===0xc0?2:3):[0xf8,0xfa,0xfb,0xfc].includes(s)?1:0;
 return n===v.length&&v.slice(1).every(x=>x<128)?v:null;
}
class WirelessMidi extends EventEmitter{
 constructor({port=17812,host='0.0.0.0',root=__dirname,trustFile=null,name=null,discovery=true,discoveryPort=17813}={}){super();this.trustFile=trustFile;this.deviceId=crypto.randomUUID();this.name=name||('P-12 · '+os.hostname());this.trusted={};this.discoveryEnabled=discovery;this.discoveryPort=discoveryPort;this.pending=new Map();this.discovery=new DeviceDiscovery({port:discoveryPort,host});this.port=port;this.host=host;this.root=root;this.peers=new Map();this.seq=0;this.stopping=false;this.failures=new Map();}
 state(){let addresses=[];try{addresses=Object.values(os.networkInterfaces()).flat().filter(x=>x&&x.family==='IPv4'&&!x.internal).map(x=>`http://${x.address}:${this.port}`);}catch{}if(!addresses.length)addresses=[`http://127.0.0.1:${this.port}`];return {running:!!this.server,port:this.port,code:this.server?this.code:'',addresses,deviceId:this.deviceId,name:this.name,pending:[...this.pending].map(([id,p])=>({id,name:p.name})),trusted:Object.entries(this.trusted).map(([id,p])=>({id,name:p.name})),discoveryWarning:this.discoveryWarning||'',peers:[...this.peers].filter(([,v])=>v.paired).map(([id,v])=>({id,name:v.name,deviceId:v.deviceId||''}))};}
 async start(){
  if(this.server)return this.state();
  await this.loadTrust();this.stopping=false;this.code=crypto.randomInt(100000,1000000).toString();
  const server=http.createServer((req,res)=>{
   if(req.method!=='GET'){res.writeHead(405).end();return;}
   const pathname=new URL(req.url,'http://p12.local').pathname;
   if(pathname==='/device-info'){res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'}).end(JSON.stringify({id:this.deviceId,name:this.name,port:this.port}));return;}
   const files={'/':'wireless-phone.html','/p12-wireless-client.js':'p12-wireless-client.js'};
   const file=files[pathname];if(!file){res.writeHead(404).end();return;}
   res.writeHead(200,{'Content-Type':file.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws:; frame-ancestors 'none'; base-uri 'none'"});
   fs.createReadStream(path.join(this.root,file)).pipe(res);
  });
  const wss=new WebSocketServer({noServer:true,maxPayload:2048,perMessageDeflate:false});
  server.on('upgrade',(req,socket,head)=>{
   const remote=socket.remoteAddress,fail=this.failures.get(remote);
   if(new URL(req.url,'http://p12.local').pathname!=='/midi'||this.peers.size>=4||(fail&&fail.count>=5&&Date.now()-fail.at<60000))return socket.destroy();
   wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws,req));
  });
  wss.on('connection',(ws,req)=>{
   const id=crypto.randomUUID(),peer={ws,paired:false,name:'Phone',last:0,window:Date.now(),count:0};this.peers.set(id,peer);
   const authTimeout=setTimeout(()=>ws.close(1008,'Pairing timed out'),60000);
   peer.approve=(deviceId,name)=>{peer.paired=true;peer.deviceId=deviceId;peer.name=name;clearTimeout(authTimeout);this.pending.delete(id);this.emit('state',this.state());};
   ws.on('error',()=>{});
   ws.on('message',buf=>{
    if(Date.now()-peer.window>=1000){peer.window=Date.now();peer.count=0;}
    if(++peer.count>500)return ws.close(1008,'MIDI rate limit');
    let p;try{p=JSON.parse(buf.toString());}catch{return ws.close(1008,'Invalid packet');}if(!p||typeof p!=='object')return ws.close(1008,'Invalid packet');
    if(!peer.paired){
     if(p.type==='hello'){
      if(peer.requested)return;peer.requested=true;
      const deviceId=String(p.deviceId||''),name=String(p.name||'P-12 phone').slice(0,48);
      if(!/^[a-zA-Z0-9-]{8,80}$/.test(deviceId))return ws.close(1008,'Invalid device ID');
      const saved=this.trusted[deviceId];
      if(saved&&typeof p.token==='string'&&p.token.length<=128&&this.hash(p.token)===saved.hash){
       peer.approve(deviceId,name);this.send(ws,{type:'paired',id,hostId:this.deviceId,name:this.name,remembered:true});return;
      }
      if(p.automatic){this.send(ws,{type:'pair-required',message:'Select this device again to request approval'});return ws.close(1008,'Pairing required');}
      this.pending.set(id,{peer,deviceId,name});this.send(ws,{type:'waiting',name:this.name});this.emit('state',this.state());return;
     }
     const token=String(p.code||'');
     if(p.type!=='pair'||!/^\d{6}$/.test(token)||!crypto.timingSafeEqual(Buffer.from(token),Buffer.from(this.code))){
      const key=req.socket.remoteAddress,old=this.failures.get(key);this.failures.set(key,{count:(old?.count||0)+1,at:Date.now()});return ws.close(1008,'Wrong pairing code');
     }
     peer.approve('',String(p.name||'Phone').slice(0,32));this.send(ws,{type:'paired',id});this.emit('state',this.state());return;
    }
    if(p.type==='ping'){this.send(ws,{type:'pong',at:p.at});return;}
    const data=midiBytes(p.data);
    if(p.type!=='midi'||!data||!Number.isSafeInteger(p.seq)||p.seq<=peer.last)return;
    peer.last=p.seq;this.emit('midi',{peerId:id,data});
   });
   ws.on('close',()=>{clearTimeout(authTimeout);this.pending.delete(id);this.peers.delete(id);this.emit('state',this.state());if(peer.paired){this.emit('disconnect',{peerId:id});this.emit('state',this.state());}});
  });
  this.server=server;this.wss=wss;
  try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(this.port,this.host,()=>{server.removeListener('error',reject);resolve();});});this.port=server.address().port;}
  catch(e){this.server=null;wss.close();server.close();throw e;}
  server.on('error',e=>this.emit('fault',e.message));
  if(this.discoveryEnabled)try{await this.discovery.start({id:this.deviceId,name:this.name,port:this.port});}catch(e){this.discovery.stop();this.discoveryWarning='Discovery unavailable: '+e.message;}
  this.emit('state',this.state());return this.state();
 }
 hash(token){return crypto.createHash('sha256').update(token).digest('hex');}
 async loadTrust(){
  if(this.loaded)return;this.loaded=true;
  if(this.trustFile)try{const p=JSON.parse(await fs.promises.readFile(this.trustFile,'utf8'));if(typeof p.id==='string'&&p.id.length<80&&p.trusted&&typeof p.trusted==='object'&&!Array.isArray(p.trusted)){this.deviceId=p.id;this.trusted=p.trusted;}}catch{}
  await this.saveTrust();
 }
 async saveTrust(){
  if(!this.trustFile)return;const data=JSON.stringify({id:this.deviceId,trusted:this.trusted});
  // Serialize small explicit pairing preferences, independently of project recovery.
  this.saving=(this.saving||Promise.resolve()).catch(()=>{}).then(async()=>{await fs.promises.mkdir(path.dirname(this.trustFile),{recursive:true});const temp=this.trustFile+'.tmp';await fs.promises.writeFile(temp,data,{mode:0o600});await fs.promises.rename(temp,this.trustFile);});return this.saving;
 }
 async approve(id,allowed){
  const request=this.pending.get(id);if(!request)return false;this.pending.delete(id);
  const {peer,deviceId,name}=request;
  if(!allowed){this.send(peer.ws,{type:'denied'});peer.ws.close(1008,'Connection declined');this.emit('state',this.state());return true;}
  const token=crypto.randomBytes(32).toString('hex');this.trusted[deviceId]={name,hash:this.hash(token)};
  await this.saveTrust();if(peer.ws.readyState!==WebSocket.OPEN){this.emit('state',this.state());return false;}
  peer.approve(deviceId,name);this.send(peer.ws,{type:'paired',id,hostId:this.deviceId,name:this.name,token});return true;
 }
 async forget(deviceId){
  delete this.trusted[deviceId];await this.saveTrust();for(const p of this.peers.values())if(p.deviceId===deviceId)p.ws.close(1008,'Pairing removed');this.emit('state',this.state());
 }
 send(ws,p){if(ws.readyState!==WebSocket.OPEN)return;if(ws.bufferedAmount>32768){ws.close(1013,'Slow MIDI connection');return;}ws.send(JSON.stringify(p));}
 broadcast(data){const checked=midiBytes(data);if(!checked)return false;const p={type:'midi',seq:++this.seq,data:checked};for(const v of this.peers.values())if(v.paired)this.send(v.ws,p);return true;}
 async stop(){this.discovery.stop();this.pending.clear();if(!this.server)return;const server=this.server;this.server=null;for(const v of this.peers.values())v.ws.terminate();this.wss.close();await new Promise(resolve=>server.close(resolve));this.code='';this.emit('state',this.state());}
}
module.exports={WirelessMidi,midiBytes};
