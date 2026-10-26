/* P12 Retro — SP-style 8-fader panel (Mix / Pan / Tune AT / Tune BF).
 *
 * An original hardware-console view on top of P-12's existing per-pad state.
 * Everything goes through window.p12SpMixApi (defined inside P-12.html), so the
 * faders move the same values as Mixer-32 and the native engine picks them up
 * through the usual pad-control sync. Tune BF remains export-baked and Tune AT
 * remains post-sample — this panel only edits the values.
 */
(() => {
  'use strict';
  if (window.__p12SpMixerLoaded) return;
  window.__p12SpMixerLoaded = true;

  const MODES = [
    { id: 'mix',  label: 'MIX',     min: 0,   max: 1,  step: 0.01, def: 0.9 },
    { id: 'pan',  label: 'PAN',     min: -1,  max: 1,  step: 0.01, def: 0 },
    { id: 'tune', label: 'TUNE AT', min: -24, max: 24, step: 1,    def: 0 },
    { id: 'bf',   label: 'TUNE BF', min: -48, max: 48, step: 1,    def: 0 },
  ];
  const STORE_KEY = 'p12-sp-mixer-ui';

  const css = `
  #p12SpToggle{position:fixed;right:14px;bottom:14px;z-index:99990;font:600 12px/1 Oswald,'Space Mono',sans-serif;
    letter-spacing:.12em;padding:10px 14px;border-radius:6px;border:1px solid #1d2430;cursor:pointer;
    background:linear-gradient(#e9e6dc,#cfcabc);color:#1d2430;box-shadow:0 3px 0 #8f8a7c,0 6px 14px rgba(0,0,0,.35)}
  .p12sp-docked.on{outline:2px solid #2f8fe0}
  #p12SpToggle:active{transform:translateY(2px);box-shadow:0 1px 0 #8f8a7c}
  #p12SpPanel{--panel:#545e6e;--panel-hi:#6a7586;--rule:#2f8fe0;--ink:#e8ecf2;--dim:#aab3c0;--lcd:#7fc7a6;--lcd-ink:#10261d;
    position:fixed;right:14px;bottom:62px;z-index:99991;width:min(760px,calc(100vw - 28px));max-height:calc(100vh - 80px);
    overflow:auto;display:none;color:var(--ink);font:500 12px/1.25 Oswald,'Space Mono',sans-serif;
    background:linear-gradient(180deg,var(--panel-hi),var(--panel) 18%,var(--panel));border:1px solid #1b2028;border-radius:10px;
    box-shadow:0 18px 50px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.12)}
  #p12SpPanel.open{display:block}
  #p12SpPanel .hd{display:flex;align-items:baseline;gap:14px;padding:10px 16px 8px;border-bottom:2px solid var(--rule)}
  #p12SpPanel .hd b{font-size:22px;letter-spacing:.02em}
  #p12SpPanel .hd span{letter-spacing:.42em;font-size:10px;color:var(--dim)}
  #p12SpPanel .row{display:flex;gap:16px;padding:12px 16px;align-items:stretch;flex-wrap:wrap}
  #p12SpPanel .lcd{flex:1 1 260px;min-height:58px;border-radius:4px;padding:8px 12px;background:var(--lcd);color:var(--lcd-ink);
    font:700 17px/1.25 'Space Mono',monospace;box-shadow:inset 0 0 0 5px #222a33,inset 0 0 18px rgba(0,0,0,.35);white-space:pre}
  #p12SpPanel .grp{display:flex;flex-direction:column;gap:6px}
  #p12SpPanel .grp h4{margin:0;font:600 13px Oswald,sans-serif;border-bottom:2px solid var(--rule);padding-bottom:2px}
  #p12SpPanel .opts{display:flex;gap:6px;flex-wrap:wrap}
  .p12sp-key{min-width:46px;height:34px;padding:0 8px;border-radius:4px;border:1px solid #20262f;cursor:pointer;
    font:600 11px Oswald,sans-serif;letter-spacing:.06em;color:#1d2430;background:linear-gradient(#f1eee6,#d4cfc2);
    box-shadow:0 2px 0 #8f8a7c;position:relative}
  .p12sp-key:active{transform:translateY(1px);box-shadow:0 1px 0 #8f8a7c}
  .p12sp-key.on::after{content:'';position:absolute;top:4px;right:5px;width:6px;height:6px;border-radius:50%;
    background:#ff3b30;box-shadow:0 0 6px #ff3b30}
  #p12SpPanel .faders{display:grid;grid-template-columns:repeat(8,1fr);gap:8px;padding:6px 16px 4px;
    background:repeating-linear-gradient(180deg,transparent 0 17px,rgba(255,255,255,.07) 17px 18px)}
  .p12sp-ch{display:flex;flex-direction:column;align-items:center;gap:6px;min-width:0}
  .p12sp-track{position:relative;height:210px;width:100%;touch-action:none;cursor:ns-resize}
  .p12sp-slot{position:absolute;left:50%;top:6px;bottom:6px;width:8px;margin-left:-4px;border-radius:4px;background:#14181e;
    box-shadow:inset 0 1px 2px #000;overflow:hidden}
  .p12sp-slot i{position:absolute;left:1px;right:1px;bottom:0;height:0;border-radius:3px;opacity:.85;
    background:linear-gradient(0deg,#3ddc84 0 65%,#ffd23f 65% 85%,#ff4d4d 85%);transition:height 60ms linear}
  .p12sp-cap{position:absolute;left:50%;width:min(54px,90%);height:30px;margin-left:calc(min(54px,90%) / -2);border-radius:4px;
    background:linear-gradient(#3b4048,#121417 45%,#24282e);box-shadow:0 4px 8px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.18)}
  .p12sp-cap::after{content:'';position:absolute;left:8%;right:8%;top:50%;height:2px;margin-top:-1px;background:#f4f4f4}
  .p12sp-pad{width:100%;height:46px;border-radius:5px;border:1px solid #0d0f12;cursor:pointer;color:#e8ecf2;
    font:600 11px Oswald,sans-serif;background:linear-gradient(#3a3f47,#1b1e22);box-shadow:0 3px 0 #08090b;overflow:hidden;
    text-overflow:ellipsis;padding:0 4px}
  .p12sp-pad.empty{color:#7d8592}
  .p12sp-pad:active,.p12sp-pad.flash{background:linear-gradient(#59606b,#30353c)}
  .p12sp-num{font:500 11px Oswald,sans-serif;color:var(--dim)}
  .p12sp-drive{display:flex;align-items:center;gap:6px;font:600 11px Oswald,sans-serif;letter-spacing:.06em}
  .p12sp-drive input{width:110px;accent-color:#ff3b30}
  .p12sp-drive input:disabled{opacity:.35}
  .p12sp-scale{height:34px;border-radius:4px;background:#f1eee6;color:#1d2430;border:1px solid #20262f;font:600 11px Oswald,sans-serif}
  #p12SpPanel .ft{display:flex;gap:10px;align-items:center;padding:8px 16px 12px;color:var(--dim);font-size:11px}
  #p12SpPanel .hd b{white-space:nowrap}
  .p12sp-drive input{-webkit-appearance:auto;appearance:auto;background:transparent!important;border:0!important;height:auto!important;padding:0!important;box-shadow:none!important}
  @media (max-width:560px){.p12sp-track{height:150px}#p12SpPanel .faders{gap:4px;padding:6px 8px}#p12SpPanel .hd span{display:none}}
  @media (max-height:480px){
    #p12SpPanel{bottom:8px;max-height:calc(100vh - 16px)}
    #p12SpPanel .hd{padding:6px 12px 4px}#p12SpPanel .hd b{font-size:17px}
    #p12SpPanel .row{padding:6px 12px;gap:10px}#p12SpPanel .lcd{min-height:0;font-size:13px;padding:5px 9px}
    .p12sp-key{height:28px;min-width:38px}#p12SpPanel .grp h4{font-size:11px}
    .p12sp-track{height:118px}.p12sp-cap{height:24px}.p12sp-pad{height:30px}.p12sp-num,#p12SpPanel .ft{display:none}
  }
  `;

  function el(tag, cls, text) { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
  function load() { try { return JSON.parse(localStorage.getItem(STORE_KEY) || '{}'); } catch (_e) { return {}; } }
  function save(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch (_e) {} }

  function start() {
    const api = window.p12SpMixApi;
    if (!api) { setTimeout(start, 250); return; }

    const style = el('style'); style.textContent = css; document.head.appendChild(style);
    const ui = Object.assign({ mode: 'mix', open: false, engine: 'knock', drive: 0, filters: false }, load());
    // v2: KNOCK re-voiced against eSPi (A/B measured) -> clean DRIVE 0 default.
    if (ui.v !== 2) { ui.v = 2; ui.drive = 0; ui.filters = false; save(ui); }
    let selected = 0;
    // Web Audio KNOCK (Android, browser path, WAV extract) reads this directly.
    const applyWebEngine = () => { window.p12KnockWeb = { on: ui.engine === 'knock', drive: ui.drive, filters: !!ui.filters }; };
    applyWebEngine();

    const toggle = el('button', '', 'SP FADERS'); toggle.id = 'p12SpToggle';
    toggle.title = 'Open the SP-style 8-fader panel (Mix / Pan / Tune AT / Tune BF)';
    const panel = el('div'); panel.id = 'p12SpPanel';
    panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'SP faders');

    const hd = el('div', 'hd');
    hd.append(el('b', '', 'P12 Retro'), el('span', '', '12 BIT SAMPLING · SP FADERS'));
    const waveBtn = el('button', 'p12sp-key', 'WAVE'); waveBtn.title = 'Open the wave editor for the selected pad'; waveBtn.style.marginLeft = 'auto';
    waveBtn.addEventListener('click', () => window.p12WaveEditor && window.p12WaveEditor.open(idFor(selected)));
    const closeBtn = el('button', 'p12sp-key', 'CLOSE'); hd.append(waveBtn, closeBtn);

    const top = el('div', 'row');
    const lcd = el('div', 'lcd');
    const modeGrp = el('div', 'grp'); modeGrp.appendChild(el('h4', '', 'Fader Mode'));
    const modeOpts = el('div', 'opts'); modeGrp.appendChild(modeOpts);
    const bankGrp = el('div', 'grp'); bankGrp.appendChild(el('h4', '', 'Bank'));
    const bankOpts = el('div', 'opts'); bankGrp.appendChild(bankOpts);
    const engGrp = el('div', 'grp'); engGrp.appendChild(el('h4', '', 'Engine'));
    const engOpts = el('div', 'opts'); engGrp.appendChild(engOpts);
    const engBtns = [['classic', 'CLASSIC'], ['knock', 'KNOCK']].map(([id, label]) => {
      const b = el('button', 'p12sp-key', label);
      b.title = id === 'knock'
        ? 'KNOCK: SP-style 26.04 kHz / 12-bit voice, voiced against eSPi (unity level, smooth playback). DRIVE pushes a hot input stage; FILTERS adds the SP OUT channel filters.'
        : 'CLASSIC: the original P-12 SP character';
      b.addEventListener('click', () => { ui.engine = id; save(ui); applyWebEngine(); pushEngine(true); render(); });
      engOpts.appendChild(b); return [id, b];
    });
    const driveWrap = el('label', 'p12sp-drive'); driveWrap.append(el('span', '', 'DRIVE'));
    const drive = el('input'); drive.type = 'range'; drive.min = '0'; drive.max = '100'; drive.step = '1';
    drive.title = 'KNOCK input drive (0 = clean, eSPi-matched; 100 = hot / clipped)';
    drive.addEventListener('input', () => { ui.drive = Number(drive.value) / 100; save(ui); applyWebEngine(); pushEngine(true); render(); });
    driveWrap.appendChild(drive); engOpts.appendChild(driveWrap);
    const filtBtn = el('button', 'p12sp-key', 'FILTERS');
    filtBtn.title = 'SP OUT filters (hardware channels): OUT 1-2 smooth 4-pole, OUT 3-6 2-pole, OUT 7-8 raw. Off = eSPi-style open top end.';
    filtBtn.addEventListener('click', () => { ui.filters = !ui.filters; save(ui); applyWebEngine(); pushEngine(true); render(); });
    engOpts.appendChild(filtBtn);
    const multiGrp = el('div', 'grp'); multiGrp.appendChild(el('h4', '', 'Multi'));
    const multiOpts = el('div', 'opts'); multiGrp.appendChild(multiOpts);
    const SCALES = { major: [-7, -5, -3, -2, 0, 2, 4, 5], minor: [-7, -5, -4, -2, 0, 2, 3, 5], chromatic: [-4, -3, -2, -1, 0, 1, 2, 3], octaves: [-8, -5, -2, 0, 2, 4, 5, 7] };
    const scaleSel = el('select', 'p12sp-scale'); Object.keys(SCALES).forEach(k => { const o = el('option', '', k.toUpperCase()); o.value = k; scaleSel.appendChild(o); });
    scaleSel.value = ui.scale || 'major'; scaleSel.addEventListener('change', () => { ui.scale = scaleSel.value; save(ui); });
    const multiBtn = el('button', 'p12sp-key', 'MULTI PITCH');
    multiBtn.title = 'SP-1200 Multi-Pitch: copy the selected pad (trim + reverse) to all 8 pads of this bank, each tuned to a step of the scale';
    multiBtn.addEventListener('click', () => {
      const src = idFor(selected), w = api.wave;
      if (!w || !w.buffer(src)) { lcdNote = 'LOAD A SAMPLE FIRST'; render(); return; }
      if (w.multiPitch(src, api.bank(), SCALES[scaleSel.value] || SCALES.major)) { ui.mode = 'tune'; save(ui); lcdNote = 'MULTI ' + scaleSel.value.toUpperCase(); }
      render();
    });
    multiOpts.append(multiBtn, scaleSel);
    top.append(lcd, modeGrp, bankGrp, engGrp, multiGrp);
    let lcdNote = '', lcdNoteAt = 0;

    let lastEngine = '', lastEngineAt = 0;
    async function pushEngine(force) {
      const b = window.p12Electron || window.electronAPI;
      if (!b || !b.nativeAudioCommand || !api.nativeActive()) { lastEngine = ''; return; }
      const payload = { mode: ui.engine, drive: ui.drive, filters: !!ui.filters, outputs: api.outputs() };
      const key = JSON.stringify(payload), now = Date.now();
      // Re-send every few seconds too: the desktop app's native host can restart.
      if (!force && key === lastEngine && now - lastEngineAt < 3000) return;
      lastEngine = key; lastEngineAt = now;
      try { await b.nativeAudioCommand('nativeCharacter', payload); } catch (_e) { lastEngine = ''; }
    }
    setInterval(() => pushEngine(false), 500);

    const modeBtns = MODES.map(m => {
      const b = el('button', 'p12sp-key', m.label);
      b.addEventListener('click', () => { ui.mode = m.id; save(ui); render(); });
      modeOpts.appendChild(b); return b;
    });
    const bankBtns = api.banks.map(b => {
      const k = el('button', 'p12sp-key', b);
      k.addEventListener('click', () => { api.setBank(b); render(); });
      bankOpts.appendChild(k); return k;
    });

    const faders = el('div', 'faders');
    const chans = [];
    for (let i = 0; i < 8; i++) {
      const ch = el('div', 'p12sp-ch');
      const track = el('div', 'p12sp-track'); track.tabIndex = 0;
      const slot = el('div', 'p12sp-slot'), bar = el('i'), cap = el('div', 'p12sp-cap');
      slot.appendChild(bar); track.append(slot, cap);
      const pad = el('button', 'p12sp-pad'); const num = el('div', 'p12sp-num', String(i + 1));
      ch.append(track, pad, num); faders.appendChild(ch);
      const c = { i, track, cap, pad, bar, peak: 0 };
      chans.push(c);
      wireFader(c);
      pad.addEventListener('pointerdown', () => {
        selected = i; const fid = idFor(i);
        if (ui.mode === 'bf') api.auditionTuneBefore(fid); else api.hit(fid);
        pad.classList.add('flash'); setTimeout(() => pad.classList.remove('flash'), 120); render();
      });
    }

    const ft = el('div', 'ft');
    ft.textContent = 'Drag or scroll a fader · double-click resets · Tune BF is baked on .sp12 export, Tune AT is post-sample.';
    panel.append(hd, top, faders, ft);
    // Live in P-12's bottom dock (VST HOST · CHORDS · SYSTEM) when present.
    const dock = document.getElementById('p12VstChordDock');
    const sibling = dock && dock.querySelector('button');
    if (sibling) { toggle.className = sibling.className; toggle.removeAttribute('id'); toggle.classList.add('p12sp-docked'); dock.insertBefore(toggle, dock.firstChild); }
    else document.body.appendChild(toggle);
    document.body.appendChild(panel);

    function mode() { return MODES.find(m => m.id === ui.mode) || MODES[0]; }
    function idFor(i) { return api.idsForBank(api.bank())[i]; }
    function readValue(fid) {
      const s = api.get(fid);
      return ui.mode === 'mix' ? s.vol : ui.mode === 'pan' ? s.pan : ui.mode === 'tune' ? s.tune : s.tuneBefore;
    }
    function writeValue(fid, v) {
      if (ui.mode === 'mix') api.setVol(fid, v);
      else if (ui.mode === 'pan') api.setPan(fid, v);
      else if (ui.mode === 'tune') api.setTune(fid, v);
      else api.setTuneBefore(fid, v);
    }
    function fmt(v) {
      if (ui.mode === 'mix') return Math.round(v * 100) + '';
      if (ui.mode === 'pan') return Math.abs(v) < 0.02 ? 'C' : (v < 0 ? 'L' : 'R') + Math.round(Math.abs(v) * 100);
      return (v > 0 ? '+' : '') + Math.round(v);
    }
    function frac(v) { const m = mode(); return (v - m.min) / (m.max - m.min); }

    function wireFader(c) {
      let dragging = false;
      const setFromY = y => {
        const r = c.track.getBoundingClientRect(), m = mode();
        const f = 1 - Math.min(1, Math.max(0, (y - r.top - 21) / Math.max(1, r.height - 42)));
        let v = m.min + f * (m.max - m.min); v = Math.round(v / m.step) * m.step;
        selected = c.i; writeValue(idFor(c.i), v); render();
      };
      c.track.addEventListener('pointerdown', e => { dragging = true; c.track.setPointerCapture(e.pointerId); setFromY(e.clientY); });
      c.track.addEventListener('pointermove', e => { if (dragging) setFromY(e.clientY); });
      c.track.addEventListener('pointerup', () => { dragging = false; });
      c.track.addEventListener('pointercancel', () => { dragging = false; });
      c.track.addEventListener('dblclick', () => { selected = c.i; writeValue(idFor(c.i), mode().def); render(); });
      c.track.addEventListener('wheel', e => {
        e.preventDefault(); const m = mode(), fid = idFor(c.i);
        const stepMul = m.step < 1 ? 2 : 1;
        selected = c.i; writeValue(fid, Math.min(m.max, Math.max(m.min, readValue(fid) - Math.sign(e.deltaY) * m.step * stepMul))); render();
      }, { passive: false });
      c.track.addEventListener('keydown', e => {
        const m = mode(), fid = idFor(c.i), d = e.key === 'ArrowUp' ? 1 : e.key === 'ArrowDown' ? -1 : 0;
        if (!d) return; e.preventDefault(); selected = c.i;
        writeValue(fid, Math.min(m.max, Math.max(m.min, readValue(fid) + d * m.step))); render();
      });
    }

    function render() {
      if (!panel.classList.contains('open')) return;
      const bank = api.bank(), m = mode();
      modeBtns.forEach((b, i) => b.classList.toggle('on', MODES[i].id === ui.mode));
      bankBtns.forEach((b, i) => b.classList.toggle('on', api.banks[i] === bank));
      engBtns.forEach(([id, b]) => b.classList.toggle('on', ui.engine === id));
      drive.value = String(Math.round(ui.drive * 100)); drive.disabled = ui.engine !== 'knock';
      filtBtn.classList.toggle('on', !!ui.filters); filtBtn.disabled = ui.engine !== 'knock';
      chans.forEach(c => {
        const fid = idFor(c.i), s = api.get(fid), v = readValue(fid);
        const r = c.track.clientHeight - 42;
        c.cap.style.top = (6 + (1 - frac(v)) * Math.max(0, r - 12)) + 'px';
        c.track.title = `${api.voices[c.i]} · ${m.label} ${fmt(v)}`;
        const sname = s.loaded && api.wave ? api.wave.name(fid).replace(/\.(wav|aiff?|mp3|flac|ogg)$/i, '') : '';
        c.pad.textContent = sname || (api.voices[c.i] + (s.loaded ? '' : ' ·'));
        c.pad.title = `${bank}${c.i + 1} · ${api.voices[c.i]}${sname ? ' — ' + sname : ''}`;
        c.pad.classList.toggle('empty', !s.loaded);
        c.track.setAttribute('aria-label', `Pad ${bank}${c.i + 1} ${m.label}`);
      });
      const fid = idFor(selected), v = readValue(fid);
      const tempo = api.tempo().toFixed(2).padStart(6, ' ');
      if (lcdNote && !lcdNoteAt) lcdNoteAt = Date.now();
      if (lcdNote && Date.now() - lcdNoteAt > 2500) { lcdNote = ''; lcdNoteAt = 0; }
      const bars = '▁▂▃▄▅▆▇█', mm = mode();
      const graph = chans.map(c => bars[Math.max(0, Math.min(7, Math.round(frac(readValue(idFor(c.i))) * 7)))]).join('');
      if (ui.mode === 'tune' || ui.mode === 'bf' || lcdNote) {
        lcd.textContent = `${(lcdNote || m.label).padEnd(14, ' ').slice(0, 14)} ${bank}${selected + 1} ${fmt(v).padStart(3, ' ')}\n${graph}  ${api.voices[selected].slice(0, 7).padEnd(7, ' ')} ${ui.engine === 'knock' ? 'KNOCK' : 'CLSC'}`;
        return;
      }
      lcd.textContent = `${m.label.padEnd(8, ' ')} ${bank}${selected + 1} ${fmt(v).padStart(4, ' ')}\n` +
                        `${api.voices[selected].slice(0, 8).padEnd(8, ' ')} ♩=${tempo} ${ui.engine === 'knock' ? 'KNOCK' : 'CLSC'}`;
    }

    // Native peak meters (only when the native engine is active).
    async function pollMeters() {
      const b = window.p12Electron || window.electronAPI;
      if (panel.classList.contains('open') && api.nativeActive() && b && b.nativeAudioCommand) {
        try {
          const r = await b.nativeAudioCommand('nativeMeters', {});
          const peaks = (r && r.padPeaks) || [];
          chans.forEach(c => {
            const p = Number(peaks[api.get(idFor(c.i)).nativeIndex] || 0);
            c.peak = Math.max(p, c.peak * 0.82);
            c.bar.style.height = Math.min(100, Math.sqrt(c.peak) * 100) + '%';
          });
        } catch (_e) {}
      } else chans.forEach(c => { c.peak *= 0.8; c.bar.style.height = Math.min(100, Math.sqrt(c.peak) * 100) + '%'; });
      setTimeout(pollMeters, 70);
    }

    function setOpen(open) { ui.open = !!open; save(ui); panel.classList.toggle('open', ui.open); toggle.classList.toggle('on', ui.open); render(); }
    toggle.addEventListener('click', () => setOpen(!panel.classList.contains('open')));
    closeBtn.addEventListener('click', () => setOpen(false));
    setOpen(ui.open);
    setInterval(render, 250);
    pollMeters();
    window.p12SpMixer = { open: () => setOpen(true), close: () => setOpen(false) };
  }

  // Mixer-32: PADS B / PADS C jump buttons next to P-12's PADS A / PADS D.
  // The detached Mixer-32 window gets the same ids (mixer-detached.html).
  function addMixerBankJumps() {
    const a = document.getElementById('mixerGoPads');
    if (!a) { setTimeout(addMixerBankJumps, 500); return; }
    if (document.getElementById('mixerGoPadsB')) return;
    let after = a;
    for (const bank of ['B', 'C']) {
      const b = document.createElement('button');
      b.className = a.className; b.type = 'button'; b.id = 'mixerGoPads' + bank;
      b.textContent = 'PADS ' + bank; b.title = 'Jump to pad bank ' + bank;
      b.addEventListener('click', () => {
        const strips = document.getElementById('mixerwinStrips'); if (!strips) return;
        const row = strips.parentElement, first = strips.querySelector('.mpcstrip[data-fid^="' + bank + '_"]');
        const master = strips.querySelector('.mpcstrip-master');
        const ws = row.closest('.mixerwin-scroll'); if (ws) ws.scrollTop = 0;
        if (first) row.scrollLeft = Math.max(0, first.offsetLeft - (master ? master.offsetWidth : 0));
      });
      after.insertAdjacentElement('afterend', b); after = b;
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { start(); addMixerBankJumps(); });
  else { start(); addMixerBankJumps(); }
})();
