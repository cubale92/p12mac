/* Shared by the desktop-served phone controller and Android P-12. */
(function(root){
 'use strict';
 class P12WirelessClient{
  constructor({WebSocketClass=root.WebSocket,onMidi=()=>{},onState=()=>{},onDisconnect=()=>{}}={}){Object.assign(this,{WebSocketClass,onMidi,onState,onDisconnect});this.seq=0;this.last=0;this.connected=false;this.store=root.localStorage;this.retry=0;}
  connect(address,code,name='P-12 phone'){
   this.disconnect(false);const u=new URL(address.includes('://')?address:'http://'+address);
   if(!['http:','https:','ws:','wss:'].includes(u.protocol))throw Error('Use a local PC address');
   u.protocol=['https:','wss:'].includes(u.protocol)?'wss:':'ws:';u.pathname='/midi';u.search='';u.hash='';
   const ws=this.ws=new this.WebSocketClass(u.href);this.seq=0;this.last=0;this.onState('Connecting…');
   ws.onopen=()=>ws.send(JSON.stringify(this.target?{type:'hello',deviceId:this.identity(),name,token:this.target.token,automatic:!!this.automatic}:{type:'pair',code:String(code).trim(),name}));
   ws.onmessage=e=>{if(this.ws!==ws)return;let p;try{p=JSON.parse(e.data);}catch{return;}
    if(p.type==='waiting'){this.onState('Waiting for approval on '+p.name);return;}
    if(p.type==='denied'||p.type==='pair-required'){this.reconnect=false;this.onState(p.type==='denied'?'Connection declined on PC':'Select the device to pair again');return;}
    if(p.type==='paired'){this.connected=true;this.retry=0;if(this.target){this.target.id=p.hostId||this.target.id;this.target.name=p.name||this.target.name;if(p.token)this.target.token=p.token;this.save(this.target);}this.onState('Connected'+(p.name?' · '+p.name:''));return;}
    if(p.type==='pong'){this.latency=Math.max(0,Date.now()-p.at);this.onState('Connected · round trip '+this.latency+' ms');return;}
    if(this.connected&&p.type==='midi'&&Number.isSafeInteger(p.seq)&&p.seq>this.last&&Array.isArray(p.data)&&p.data.length<=3){this.last=p.seq;this.onMidi(p.data);}
   };
   ws.onerror=()=>{if(this.ws===ws)this.onState('Connection failed: check Wi-Fi, address and PC firewall');};
   ws.onclose=e=>{if(this.ws!==ws)return;this.connected=false;clearInterval(this.ping);this.onDisconnect();this.onState(e.code===1008?'Pairing required: select the device again':'Disconnected');if(e.code===1008)this.reconnect=false;if(this.reconnect&&this.target){clearTimeout(this.retryTimer);this.retryTimer=setTimeout(()=>this.connectDevice(this.target,true),Math.min(15000,1000*2**this.retry++));}};
   this.ping=setInterval(()=>{if(this.connected&&this.ws===ws&&ws.readyState===1)ws.send(JSON.stringify({type:'ping',at:Date.now()}));},3000);
  }
  identity(){let id;try{id=this.store?.getItem('p12-midi-device-id');if(!id){id=root.crypto?.randomUUID?.()||('p12-'+Date.now()+'-'+Math.random().toString(36).slice(2));this.store?.setItem('p12-midi-device-id',id);}}catch{}return id||'p12-temporary-device';}
  save(peer){try{this.store?.setItem('p12-midi-remembered',JSON.stringify(peer));}catch{}}
  remembered(){try{return JSON.parse(this.store?.getItem('p12-midi-remembered')||'null');}catch{return null;}}
  connectDevice(peer,automatic=false){const saved=this.remembered();this.target={...peer,token:peer.token||(saved?.id===peer.id?saved.token:undefined)};this.automatic=automatic;this.reconnect=true;this.connect(peer.address,'','P-12 phone');}
  discovered(peer){if(this.target?.id===peer.id)this.target.address=peer.address;const saved=this.remembered();if(saved?.id===peer.id){this.save({...saved,address:peer.address,name:peer.name});if(this.reconnect&&!this.connected&&(!this.ws||this.ws.readyState>1))this.connectDevice({...saved,...peer},true);}}
  forget(){this.disconnect();this.target=null;try{this.store?.removeItem('p12-midi-remembered');}catch{}this.onState('Pairing forgotten');}
  send(data){if(!this.connected||this.ws?.readyState!==1||this.ws.bufferedAmount>32768)return false;this.ws.send(JSON.stringify({type:'midi',seq:++this.seq,data:Array.from(data)}));return true;}
  disconnect(manual=true){clearTimeout(this.retryTimer);if(manual){this.reconnect=false;this.target=null;}clearInterval(this.ping);const ws=this.ws;this.ws=null;this.connected=false;if(ws){ws.onclose=null;ws.onerror=null;ws.onmessage=null;try{ws.close();}catch{}this.onDisconnect();}this.onState('Disconnected');}
 }
 root.P12WirelessClient=P12WirelessClient;if(typeof module!=='undefined')module.exports={P12WirelessClient};
})(typeof window!=='undefined'?window:globalThis);
