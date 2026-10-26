(function(){
 'use strict';
 window.P12WirelessUI={attach(hooks){
  const $=id=>document.getElementById(id),api=window.electronAPI;
  const desktop=typeof api?.wirelessCommand==='function';
  const panel=document.createElement('details');panel.id='p12WirelessPanel';panel.className='card';panel.style.cssText='padding:12px;margin:8px 0;max-width:100%;box-sizing:border-box';
  panel.innerHTML='<summary style="cursor:pointer">Wireless MIDI · Wi-Fi / Bluetooth</summary><div style="display:flex;gap:8px;flex-wrap:wrap;margin:10px 0">'+
   (desktop?'<button class="btn small" id="p12WifiStart">Make discoverable</button><button class="btn small ghost" id="p12WifiStop">Stop Wi-Fi</button><span id="p12WifiName"></span><details><summary>Advanced</summary><span id="p12WifiAddress"></span></details><div id="p12WifiRequests"></div>':'<button class="btn small" id="p12WifiSearch">Search nearby P-12</button><div id="p12WifiDevices"></div><button class="btn small ghost" id="p12WifiForget">Forget pairing</button><details><summary>Advanced · manual connection</summary><input id="p12WifiHost" placeholder="PC address, e.g. 192.168.1.10:17812" aria-label="PC address" style="width:260px;max-width:95%"><input id="p12WifiCode" inputmode="numeric" maxlength="6" placeholder="PC code" aria-label="Pairing code" style="width:90px"><button class="btn small" id="p12WifiConnect">Connect Wi-Fi</button></details><button class="btn small ghost" id="p12WifiStop">Disconnect</button>')+
   '</div><div style="display:flex;gap:10px;flex-wrap:wrap"><label><input id="p12WirelessIn" type="checkbox" checked> Receive notes</label><label><input id="p12WirelessOut" type="checkbox" checked> Send pad notes</label><label><input id="p12WirelessRxTransport" type="checkbox"> Receive Start/Stop</label><label><input id="p12WirelessTxTransport" type="checkbox"> Send Start/Stop</label><label>Send channel <select id="p12WirelessChannel"></select></label></div><p id="p12WirelessStatus" role="status">Wireless MIDI off</p><div style="display:flex;gap:8px;flex-wrap:wrap">'+
   (desktop?'<label>Bluetooth / OS MIDI in <select id="p12BleIn"><option value="">None</option></select></label><label>Out <select id="p12BleOut"><option value="">None</option></select></label><button class="btn small" id="p12BleRefresh">Refresh MIDI</button><button class="btn small" id="p12BleApply">Connect ports</button><button class="btn small ghost" id="p12BlePair">Pair Bluetooth</button>':'<button class="btn small" id="p12BleStart">Enable Bluetooth MIDI</button><button class="btn small ghost" id="p12BleStop">Stop Bluetooth</button>')+
   '</div><p id="p12BleStatus" role="status"></p><small>Local network MIDI only. Audio stays on this device. Clock is monitored, not used to reschedule the internal engine. Transport receive is opt-in.</small>';
  ($('midiStatus')?.parentElement||document.body).appendChild(panel);
  // Android 1.0.9 moves desktop containers into phone views at DOM ready.
  // Place the connection panel beside mobile settings after that move.
  const mobilePlacement=()=>{if(window.P12Android)$('p12MobileSettings')?.after(panel);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mobilePlacement,{once:true});else mobilePlacement();
  for(let ch=0;ch<16;ch++)$('p12WirelessChannel').add(new Option(ch+1,ch));$('p12WirelessChannel').value=hooks.channel();$('p12WirelessChannel').onchange=()=>hooks.setChannel(Number($('p12WirelessChannel').value));
  const gates=new Set();
  let receiveQueue=Promise.resolve(),polling=false,pollCount=0,pollTimer,clock=[],lastClockSource='',lastClockStatus=0;
  const state=s=>{$('p12WirelessStatus').textContent=s;};
  function receive(data,source){
   if(!Array.isArray(data)||!data.length)return;
   if(data[0]===0xf8){if(lastClockSource!==source){clock=[];lastClockSource=source;}const now=performance.now();clock.push(now);if(clock.length>49)clock.shift();if(clock.length>=25){const bpm=60000*(clock.length-1)/((now-clock[0])*24);if(bpm>=20&&bpm<=400&&now-lastClockStatus>=500){lastClockStatus=now;state('MIDI clock received · approximately '+bpm.toFixed(1)+' BPM');}}return;}
   if([0xfa,0xfb,0xfc].includes(data[0])){if($('p12WirelessRxTransport').checked)Promise.resolve(hooks.transport(data[0])).catch(e=>state(e.message));return;}
   if(!$('p12WirelessIn').checked)return;
   receiveQueue=receiveQueue.then(()=>hooks.input(data,source)).catch(e=>state('MIDI: '+e.message));
  }
  function disconnect(source){receiveQueue=receiveQueue.then(()=>hooks.disconnect(source)).catch(()=>{});}
  function hostState(s){
   $('p12WifiName').textContent=s.running?s.name:'';
   const requests=$('p12WifiRequests');requests.replaceChildren();
   for(const p of s.pending||[]){const row=document.createElement('div');row.textContent=p.name+' wants to connect ';for(const allowed of [true,false]){const b=document.createElement('button');b.textContent=allowed?'Approve':'Decline';b.onclick=()=>api.wirelessCommand({action:'approve',id:p.id,allowed});row.append(b);}requests.append(row);}
   for(const p of s.trusted||[]){const row=document.createElement('div');row.textContent=p.name+' · remembered ';const b=document.createElement('button');b.textContent='Forget';b.onclick=()=>api.wirelessCommand({action:'forget',id:p.id});row.append(b);requests.append(row);}
   if(s.discoveryWarning)state(s.discoveryWarning);
if(s.message)state(s.message);else{state(s.running?'Wi-Fi MIDI ready · '+s.peers.length+' connected':'Wireless MIDI off');$('p12WifiAddress').textContent=s.running?(s.addresses.join(' · ')+' · Pairing code: '+s.code):'';}}
  let client;
  if(desktop){
   api.onWirelessMidi(p=>{if(p.disconnected)disconnect('wifi:'+p.peerId);else receive(p.data,'wifi:'+p.peerId);});api.onWirelessState(hostState);
   $('p12WifiStart').onclick=async()=>{await hooks.prepare();const s=await api.wirelessCommand({action:'start'});if(s.ok===false)state(s.message);else hostState(s);};
   $('p12WifiStop').onclick=async()=>hostState(await api.wirelessCommand({action:'stop'}));
   $('p12BleRefresh').onclick=async()=>{
    const r=await api.wirelessCommand({action:'midiDevices'});if(!r.ok){$('p12BleStatus').textContent=r.message||'Build the new native host first';return;}
    for(const [id,list,selected]of [['p12BleIn',r.inputs,r.input],['p12BleOut',r.outputs,r.output]]){const sel=$(id);sel.replaceChildren(new Option('None',''));for(const d of list)sel.add(new Option(d.name,d.id));sel.value=selected||'';}
    $('p12BleStatus').textContent='Bluetooth MIDI appears here after pairing in the operating system.';
   };
   $('p12BleApply').onclick=async()=>{
    await hooks.prepare();result.panic();clearInterval(pollTimer);disconnect('bluetooth:input');
    const r=await api.wirelessCommand({action:'midiConnect',payload:{input:$('p12BleIn').value,output:$('p12BleOut').value}});
    $('p12BleStatus').textContent=r.ok?'MIDI ports connected':r.message||'MIDI port unavailable';
    if(r.ok&&r.input)pollTimer=setInterval(async()=>{if(polling)return;polling=true;try{const p=await api.wirelessCommand({action:'midiPoll'});for(const m of p.messages||[])receive(m,'bluetooth:input');
     if(++pollCount%200===0){const devices=await api.wirelessCommand({action:'midiDevices'});if(devices.ok&&!devices.inputs.some(d=>d.id===r.input)){
      clearInterval(pollTimer);disconnect('bluetooth:input');$('p12BleStatus').textContent='Bluetooth / OS MIDI input disconnected; Refresh to reconnect';
      await api.wirelessCommand({action:'midiConnect',payload:{input:'',output:devices.outputs.some(d=>d.id===r.output)?r.output:''}});
     }}if(p.dropped)$('p12BleStatus').textContent='MIDI input queue overflow: '+p.dropped+' messages';}catch(e){$('p12BleStatus').textContent=e.message;}finally{polling=false;}},10);
   };
   $('p12BlePair').onclick=async()=>{const r=await api.wirelessCommand({action:'midiPair'});$('p12BleStatus').textContent=r.message||'Pair the MIDI device, then Refresh';};
  }else{
   client=new P12WirelessClient({onMidi:d=>receive(d,'wifi:desktop'),onState:state,onDisconnect:()=>disconnect('wifi:desktop')});
   $('p12WifiConnect').onclick=async()=>{try{await hooks.prepare();client.disconnect();client.connect($('p12WifiHost').value,$('p12WifiCode').value,'P-12 Android');}catch(e){state(e.message);}};
   $('p12WifiStop').onclick=()=>client.disconnect();
   $('p12WifiForget').onclick=()=>client.forget();
   const devices=new Map();
   function showDevice(d){if(!d||!d.id||!/^http:\/\/[0-9.]+:[0-9]+$/.test(d.address))return;devices.set(d.id,d);client.discovered(d);const list=$('p12WifiDevices');list.replaceChildren();for(const peer of devices.values()){const b=document.createElement('button');b.className='btn small';b.textContent=peer.name;b.onclick=async()=>{await hooks.prepare();client.connectDevice(peer);};list.append(b);}}
   function search(){if(!window.P12MidiNative?.searchNearby){state('Nearby search requires the Android P-12 app. Use Advanced in a browser.');return;}devices.clear();$('p12WifiDevices').replaceChildren();state('Searching nearby P-12 devices…');window.P12MidiNative.searchNearby();}
   $('p12WifiSearch').onclick=search;
   const remembered=client.remembered();if(remembered?.token){client.connectDevice(remembered,true);search();}
   setInterval(()=>{if(client.reconnect&&!client.connected)window.P12MidiNative?.searchNearby?.();},15000);
   $('p12BleStart').onclick=async()=>{await hooks.prepare();if(!window.P12MidiNative){$('p12BleStatus').textContent='Bluetooth MIDI requires the P-12 Wireless Android app';return;}window.P12MidiNative.startBle();};
   $('p12BleStop').onclick=()=>window.P12MidiNative?.stopBle();
   window.P12MidiNativeEvent=p=>{if(p.device)showDevice(p.device);if(p.discoveryStatus&&!client.connected)state(p.discoveryStatus);if(p.data)receive(p.data,'bluetooth:desktop');if(p.disconnected)disconnect('bluetooth:desktop');if(p.status)$('p12BleStatus').textContent=p.status;};
  }
  function send(data){if(desktop)api.wirelessSend(data);else{client?.send(data);window.P12MidiNative?.send(JSON.stringify(data));}}
  const result={pad(fid,velocity){if(!$('p12WirelessOut').checked)return;const note=hooks.note(fid);if(note==null)return;const ch=hooks.channel()&15;send([0x90|ch,note,Math.max(1,Math.min(127,Math.round(velocity??100)))]);const gate=setTimeout(()=>{gates.delete(gate);send([0x80|ch,note,0]);},80);gates.add(gate);},transport(byte){if($('p12WirelessTxTransport').checked)send([byte]);},panic(){for(const timer of gates)clearTimeout(timer);gates.clear();for(let ch=0;ch<16;ch++){send([0xb0|ch,64,0]);send([0xb0|ch,123,0]);}},receive};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)result.panic();});
  window.addEventListener('pagehide',()=>{result.panic();client?.disconnect();clearInterval(pollTimer);window.P12MidiNative?.stopBle();});
  return result;
 }};
})();
