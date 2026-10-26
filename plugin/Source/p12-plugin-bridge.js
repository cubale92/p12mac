/* P12 Retro plug-in bridge.
 *
 * Injected at document start into the plug-in's WebView. It provides the same
 * window.p12Electron / window.electronAPI surface that P-12's Electron preload
 * exposes, but routes every call to the JUCE plug-in (native function "p12").
 * The P-12 HTML itself is unchanged: whatever it can do in Electron it does
 * here, with audio rendered by the shared native engine inside the DAW.
 *
 * Deliberately NOT provided: openMixerWindow / openPlaylistWindow /
 * openPianoWindow. P-12 then uses its built-in in-page Mixer-32, playlist
 * (FL/MPC-style song window) and piano roll inside the plug-in window.
 */
(() => {
  'use strict';
  if (window.p12Electron) return;

  // Native audio is the only audible path inside a DAW: never start in the
  // browser (Web Audio) backend, even if an old preference says so.
  try { localStorage.setItem('p12-desktop-audio-backend', 'native'); } catch (_e) {}

  let nextId = 1;
  const pending = new Map();
  let wired = false;
  const hostListeners = new Set();

  function backend() { return window.__JUCE__ && window.__JUCE__.backend; }

  function wire() {
    if (wired) return true;
    const b = backend();
    if (!b) return false;
    b.addEventListener('__juce__complete', payload => {
      const entry = pending.get(payload && payload.promiseId);
      if (!entry) return;
      pending.delete(payload.promiseId);
      entry(payload.result);
    });
    b.addEventListener('p12Host', msg => hostListeners.forEach(fn => { try { fn(msg); } catch (e) { console.warn(e); } }));
    wired = true;
    return true;
  }

  function call(channel, payload) {
    return new Promise(resolve => {
      const attempt = tries => {
        if (!wire()) {
          if (tries > 200) { resolve({ ok: false, message: 'P12 Retro native bridge unavailable' }); return; }
          setTimeout(() => attempt(tries + 1), 25);
          return;
        }
        const id = nextId++;
        pending.set(id, raw => {
          if (typeof raw === 'string') { try { resolve(JSON.parse(raw)); return; } catch (_e) {} }
          resolve(raw);
        });
        backend().emitEvent('__juce__invoke', { name: 'p12', params: [channel, JSON.stringify(payload === undefined ? null : payload)], resultId: id });
      };
      attempt(0);
    });
  }
  const send = (channel, payload) => { call(channel, payload); };
  const noop = () => {};
  const unsub = () => noop;

  const api = {
    isElectron: false,
    isPlugin: true,
    bridgeVersion: 'p12-retro-plugin-1',
    platform: (navigator.userAgent.includes('Windows') ? 'win32' : navigator.userAgent.includes('Mac') ? 'darwin' : 'linux'),

    // Bluetooth / OS MIDI (in, out, pair) runs on the plug-in's native engine.
    // Wi-Fi MIDI to phones needs the desktop app's local network server.
    wirelessCommand: packet => {
      const a = packet && packet.action;
      if (['midiDevices', 'midiConnect', 'midiPoll', 'midiPair'].includes(a)) return call('p12:wireless-command', packet);
      if (a === 'state') return Promise.resolve({ ok: true, running: false, pending: [], trusted: [], message: 'Wi-Fi MIDI runs in the P-12 Desktop app. Bluetooth / OS MIDI works here.' });
      return Promise.resolve({ ok: false, message: 'Wi-Fi MIDI runs in the P-12 Desktop app. Bluetooth / OS MIDI below works here.' });
    },
    wirelessSend: data => send('p12:wireless-send', { data }), onWirelessMidi: unsub, onWirelessState: unsub,

    pickFolder: () => call('p12:pick-vst-folder', {}),
    selectVSTFolder: () => call('p12:pick-vst-folder', {}),
    chooseDirectory: () => call('p12:pick-vst-folder', {}),
    scanVSTFolders: folders => call('p12:scan-vst-folders', { folders }),
    scanVST3: folders => call('p12:scan-vst-folders', { folders }),
    scanVST2: folders => call('p12:scan-vst-folders', { folders }),
    scanVST: folders => call('p12:scan-vst-folders', { folders }),
    scanPlugins: folders => call('p12:scan-vst-folders', { folders }),
    getDefaultVSTFolders: () => call('p12:default-vst-folders', {}),
    getVSTHostStatus: () => call('p12:vst-host-status', {}),
    loadVST3: route => call('p12:vst-load', Object.assign({}, route || {}, { format: 'VST3' })),
    loadVST2: route => call('p12:vst-load', Object.assign({}, route || {}, { format: 'VST2' })),
    loadVST: route => call('p12:vst-load', route),
    loadPlugin: route => call('p12:vst-load', route),
    openPlugin: route => call('p12:vst-load', route),
    unloadVST: route => call('p12:vst-unload', route),
    setMixerInsertVST: a => call('p12:vst-insert', a),
    loadVSTInsert: a => call('p12:vst-insert', a),
    setVSTInsert: a => call('p12:vst-insert', a),
    hostVSTInsert: a => call('p12:vst-insert', a),
    processVSTPCM: packet => call('p12:vst-pcm', packet),
    nativeAudioCommand: (command, payload) => call('p12:native-engine', { command, payload }),
    nativeAudioTrigger: packet => send('p12:native-trigger', packet),
    nativeAudioStop: packet => send('p12:native-stop', packet),

    // Detached windows are Electron-only; P-12 falls back to its in-page versions.
    closeMixerWindow: () => Promise.resolve({ ok: true }),
    sendMixerMeters: noop, onMixerMeters: noop, sendMixerState: noop, sendMixerAction: noop, onMixerState: noop, onMixerAction: noop,
    sendPlaylistState: noop, sendPlaylistAction: noop, onPlaylistState: noop, onPlaylistAction: noop,
    sendPianoState: noop, sendPianoAction: noop, onPianoAction: noop, onPianoState: noop,

    writeAudioDebug: packet => send('p12:audio-debug', packet),
    getAudioDebugPath: () => call('p12:diagnostic-path', {}),
    writeDiagnostic: packet => send('p12:diagnostic', packet),
    getDiagnosticPath: () => call('p12:diagnostic-path', {}),
    safeSaveText: payload => call('p12:safe-save-text', payload),
    safeSaveBytes: payload => call('p12:safe-save-bytes', Object.assign({}, payload, { bytes: undefined, bytesBase64: toBase64(payload && payload.bytes) })),
    writeRecovery: payload => call('p12:recovery-write', payload),
    readRecovery: () => call('p12:recovery-read', {}),
    clearRecovery: () => call('p12:recovery-clear', {}),
    windowState: () => Promise.resolve({ ok: false, message: 'Window size is managed by the DAW.' }),
    writePerformanceSnapshot: payload => call('p12:diagnostic', { category: 'PERF', event: 'snapshot', details: payload }),
    getVSTQuarantine: () => Promise.resolve({ ok: true, paths: [] }),
    clearVSTQuarantine: () => Promise.resolve({ ok: true }),
    openVSTEditor: a => call('p12:vst-editor', a),
    showVSTEditor: a => call('p12:vst-editor', a),
    openPluginEditor: a => call('p12:vst-editor', a),
    showPluginEditor: a => call('p12:vst-editor', a),
    closeVSTEditor: a => call('p12:vst-editor-close', a),
    getVSTState: a => call('p12:vst-state-get', a),
    setVSTState: a => call('p12:vst-state-set', a),
    listVSTAudioOutputs: () => call('p12:vst-audio-list', {}),
    setVSTAudioOutput: (name, type) => call('p12:vst-audio-set', { name, type }),
    testVSTAudio: () => call('p12:vst-audio-test', {}),
    allVSTNotesOff: () => send('p12:vst-all-notes-off', {}),
    sendMidi: m => send('p12:vst-midi', m),
    sendChordMidi: m => send('p12:vst-midi', m),
    sendPianoRollMidi: m => send('p12:vst-midi', m),
    sendSequencerMidi: m => send('p12:vst-midi', m),
    sendVSTMidi: m => send('p12:vst-midi', m),

    onHost: fn => { hostListeners.add(fn); return () => hostListeners.delete(fn); }
  };

  function toBase64(bytes) {
    if (!bytes) return '';
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes.buffer ? bytes.buffer : bytes);
    let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  }

  const frozen = Object.freeze(api);
  Object.defineProperty(window, 'p12Electron', { value: frozen, configurable: false });
  Object.defineProperty(window, 'electronAPI', { value: frozen, configurable: false });

  // ---------------------------------------------------------------------------
  // DAW MIDI -> P-12 MIDI input. The plug-in forwards host MIDI as "midi" host
  // events; they appear as an extra Web MIDI input named "P12 Retro (DAW)", so
  // P-12's own MIDI mapping (SP-1200 note layout, piano roll, chords) applies.
  const dawInput = {
    id: 'p12-retro-daw', name: 'P12 Retro (DAW)', manufacturer: 'P-12', type: 'input',
    state: 'connected', connection: 'open', onmidimessage: null, _l: new Set(),
    addEventListener(t, fn) { if (t === 'midimessage') this._l.add(fn); },
    removeEventListener(t, fn) { if (t === 'midimessage') this._l.delete(fn); },
    open() { return Promise.resolve(this); }, close() { return Promise.resolve(this); }
  };
  function deliverMidi(bytes) {
    const data = new Uint8Array(bytes);
    const ev = { data, currentTarget: dawInput, target: dawInput, timeStamp: performance.now() };
    if (typeof dawInput.onmidimessage === 'function') dawInput.onmidimessage(ev);
    dawInput._l.forEach(fn => fn(ev));
  }
  const realRequest = navigator.requestMIDIAccess ? navigator.requestMIDIAccess.bind(navigator) : null;
  navigator.requestMIDIAccess = async function (opts) {
    let real = null;
    if (realRequest) { try { real = await realRequest(opts); } catch (_e) { real = null; } }
    const inputs = new Map(real ? real.inputs : []);
    inputs.set(dawInput.id, dawInput);
    const access = {
      inputs, outputs: real ? real.outputs : new Map(), sysexEnabled: !!(real && real.sysexEnabled),
      get onstatechange() { return real ? real.onstatechange : null; },
      set onstatechange(fn) { if (real) real.onstatechange = fn; },
      addEventListener: (...a) => real && real.addEventListener(...a),
      removeEventListener: (...a) => real && real.removeEventListener(...a)
    };
    return access;
  };

  // ---------------------------------------------------------------------------
  // DAW transport follow: host Play -> P-12 Play (from step 1, host tempo),
  // host Stop -> P-12 Stop. Toggle with the "DAW SYNC" chip.
  let follow = true;
  try { follow = localStorage.getItem('p12-retro-daw-follow') !== 'off'; } catch (_e) {}
  let hostPlaying = false, lastBpm = 0;
  function setTempo(bpm) {
    const input = document.getElementById('tempoInput');
    if (!input || !(bpm > 0) || Math.abs(bpm - lastBpm) < 0.05) return;
    lastBpm = bpm;
    input.value = (Math.round(bpm * 10) / 10).toFixed(1);
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }
  function onTransport(msg) {
    if (!follow) return;
    if (msg.bpm) setTempo(Number(msg.bpm));
    if (msg.playing && !hostPlaying) document.getElementById('playBtn')?.click();
    if (!msg.playing && hostPlaying) document.getElementById('stopBtn')?.click();
    hostPlaying = !!msg.playing;
  }
  hostListeners.add(msg => {
    if (!msg) return;
    if (msg.type === 'midi' && Array.isArray(msg.events)) msg.events.forEach(deliverMidi);
    else if (msg.type === 'transport') onTransport(msg);
    else if (msg.type === 'restoreSession') restoreSession();
  });

  function restoreSession(tries = 0) {
    const btn = document.getElementById('diagRecoverBtn');
    if (btn) { btn.click(); return; }
    if (tries < 80) setTimeout(() => restoreSession(tries + 1), 250);
  }

  function addChip() {
    const dock = document.getElementById('p12VstChordDock');
    const proto = dock && dock.querySelector('button');
    const chip = document.createElement('button');
    if (proto) chip.className = proto.className;
    const paint = () => { chip.textContent = follow ? 'DAW SYNC: ON' : 'DAW SYNC: OFF'; chip.style.outline = follow ? '2px solid #3ddc84' : ''; };
    chip.title = 'Follow the DAW transport: host Play starts P-12 from step 1 at the host tempo, host Stop stops it.';
    chip.onclick = () => { follow = !follow; try { localStorage.setItem('p12-retro-daw-follow', follow ? 'on' : 'off'); } catch (_e) {} paint(); };
    paint();
    if (dock) dock.insertBefore(chip, dock.firstChild);
    else { chip.style.cssText += ';position:fixed;left:12px;top:12px;z-index:99999'; document.body.appendChild(chip); }
  }

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(addChip, 600);
    // Tell the plug-in the page is live; it replies with transport state and,
    // when the DAW project holds a saved P-12 session, a restoreSession event.
    call('p12:page-ready', {});
    // No automatic session snapshots: use P12's manual Project save.
  });
})();
