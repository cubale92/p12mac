'use strict';
const assert=require('node:assert/strict'),{once}=require('node:events'),{WirelessMidi,midiBytes}=require('./p12-wireless-midi.cjs'),{WebSocket}=require('./vendor/ws');
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function connect(host,code){const ws=new WebSocket(`ws://127.0.0.1:${host.port}/midi`);await once(ws,'open');ws.send(JSON.stringify({type:'pair',code,name:'Test phone'}));return ws;}
(async()=>{
 for(const d of [[0x90,60,100],[0x80,60,0],[0xc0,5],[0xd0,50],[0xf8],[0xfa]])assert.deepEqual(midiBytes(d),d);
 for(const d of [[],[60,100],[0x90,200,2],[0x90,60],[0xf0,0,0],[0xf8,1],[0x90,60,NaN]])assert.equal(midiBytes(d),null);
 const host=new WirelessMidi({port:0,host:'127.0.0.1'});const packets=[];host.on('midi',p=>packets.push(p));
 try{
  await host.start();const code=host.code;assert.equal((await host.start()).code,code);
  for(const bad of ['000000','１２３４５６']){const ws=await connect(host,bad);assert.equal((await once(ws,'close'))[0],1008);}
  const ws=await connect(host,code);assert.equal(JSON.parse((await once(ws,'message'))[0]).type,'paired');
  ws.send(JSON.stringify({type:'midi',seq:1,data:[0x90,60,100]}));ws.send(JSON.stringify({type:'midi',seq:1,data:[0x90,60,100]}));ws.send(JSON.stringify({type:'midi',seq:2,data:[0x80,60,0]}));await delay(25);assert.equal(packets.length,2);assert.deepEqual(packets[0].data,[0x90,60,100]);
  const returned=once(ws,'message');assert(host.broadcast([0x90,42,80]));assert.deepEqual(JSON.parse((await returned)[0]).data,[0x90,42,80]);assert.equal(host.broadcast([0xf0,1,2]),false);
  const reply=await fetch(`http://127.0.0.1:${host.port}/`);assert.equal(reply.status,200);assert((await reply.text()).includes('Phone MIDI'));assert.equal((await fetch(`http://127.0.0.1:${host.port}/P-12.html`)).status,404);
  const disconnected=once(host,'disconnect');ws.close();await disconnected;assert.equal(host.state().peers.length,0);
  const malformed=await connect(host,code);await once(malformed,'message');malformed.send('null');assert.equal((await once(malformed,'close'))[0],1008);
  await host.stop();assert(!host.state().running);console.log('PASS WebSocket auth, Unicode/null malformed packets, duplicate rejection, bidirectional notes, disconnect, HTTP whitelist, stop');
 }finally{await host.stop();}
})().catch(e=>{console.error(e);process.exitCode=1});
