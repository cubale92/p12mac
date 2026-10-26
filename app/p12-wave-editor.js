/* P12 Retro — Wave Editor.
 *
 * Sample-accurate start/end on the buffer that actually plays (reverse/warp
 * aware), zoom + scroll, zero-crossing snap, audition, and destructive tools
 * (normalize, fade in/out, crop, reverse) with undo. Uses window.p12SpMixApi.wave
 * so every edit goes through P-12's own pad-loading path: native staging,
 * reverse buffers and recovery autosave behave exactly as when loading a sample.
 */
(() => {
  'use strict';
  if (window.__p12WaveLoaded) return;
  window.__p12WaveLoaded = true;

  const css = `
  #p12Wave{--panel:#545e6e;--panel-hi:#6a7586;--rule:#2f8fe0;--ink:#e8ecf2;--dim:#aab3c0;--lcd:#0f2219;--wave:#7fe0a8;--sel:#c8ffd9;
    position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);z-index:99992;width:min(1100px,calc(100vw - 20px));
    max-height:calc(100vh - 20px);overflow:auto;display:none;color:var(--ink);font:500 12px/1.25 Oswald,'Space Mono',sans-serif;
    background:linear-gradient(180deg,var(--panel-hi),var(--panel) 14%,var(--panel));border:1px solid #1b2028;border-radius:10px;
    box-shadow:0 18px 60px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.12)}
  #p12Wave.open{display:block}
  #p12Wave .hd{display:flex;align-items:baseline;gap:14px;padding:10px 16px 8px;border-bottom:2px solid var(--rule)}
  #p12Wave .hd b{font-size:22px;white-space:nowrap}
  #p12Wave .hd span{letter-spacing:.42em;font-size:10px;color:var(--dim)}
  #p12Wave .hd .sp{margin-left:auto}
  #p12Wave .bar{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;padding:10px 16px}
  #p12Wave .grp{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
  #p12Wave .grp>em{font-style:normal;font-weight:600;font-size:11px;letter-spacing:.08em;color:var(--dim);margin-right:2px}
  #p12Wave .lcdwrap{margin:0 16px;border-radius:5px;padding:6px;background:#222a33;box-shadow:inset 0 0 0 1px #000}
  #p12Wave canvas{display:block;width:100%;background:var(--lcd);border-radius:3px;touch-action:none}
  #p12Wave .main{height:260px;cursor:crosshair}
  #p12Wave .over{height:40px;margin-top:6px;cursor:grab}
  #p12Wave .info{display:flex;flex-wrap:wrap;gap:6px 18px;padding:8px 16px 12px;font:700 12px 'Space Mono',monospace;color:#cfe9da}
  #p12Wave .info i{font-style:normal;color:var(--dim);font-family:Oswald,sans-serif;font-weight:600;margin-right:4px}
  #p12Wave .note{padding:0 16px 12px;color:#ffd27a;font-size:11px;min-height:14px}
  #p12Wave select{height:32px;border-radius:4px;background:#f1eee6;color:#1d2430;border:1px solid #20262f;font:600 12px Oswald,sans-serif}
  #p12Wave .p12sp-key[disabled]{opacity:.4;cursor:not-allowed}
  @media (max-height:520px){#p12Wave .main{height:150px}#p12Wave .over{height:26px}#p12Wave .hd span{display:none}}
  @media (max-width:560px){#p12Wave .main{height:200px}#p12Wave .hd span{display:none}}
  `;

  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const key = (label, title) => { const b = el('button', 'p12sp-key', label); if (title) b.title = title; return b; };

  function start() {
    const api = window.p12SpMixApi;
    if (!api || !api.wave) { setTimeout(start, 250); return; }
    const W = api.wave;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    let fid = api.idsForBank(api.bank())[0];
    let view = { a: 0, b: 1 };          // visible window as fraction of the buffer
    let snap = true;
    const undo = [];                    // [{fid, buf(forward), trim}]
    let peaksCache = null;

    // ---------- DOM ----------
    const root = el('div'); root.id = 'p12Wave'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', 'Wave editor');
    const hd = el('div', 'hd'); hd.append(el('b', '', 'Wave Editor'), el('span', '', 'SAMPLE · TRIM · EDIT'));
    const closeBtn = key('CLOSE'); closeBtn.classList.add('sp'); hd.append(closeBtn);

    const bar = el('div', 'bar');
    const gPad = el('div', 'grp'); gPad.append(el('em', '', 'PAD'));
    const padSel = el('select'); padSel.title = 'Pad to edit';
    gPad.append(padSel);
    const gView = el('div', 'grp'); gView.append(el('em', '', 'VIEW'));
    const bFit = key('FIT', 'Show the whole sample'), bZoomSel = key('ZOOM SEL', 'Zoom to the trimmed region'),
          bIn = key('+', 'Zoom in'), bOut = key('−', 'Zoom out'), bSnap = key('SNAP 0X', 'Snap start/end to zero crossings');
    gView.append(bFit, bZoomSel, bIn, bOut, bSnap);
    const gPlay = el('div', 'grp'); gPlay.append(el('em', '', 'PLAY'));
    const bPlay = key('▶ PAD', 'Audition the pad (plays the trimmed region)');
    gPlay.append(bPlay);
    const gEdit = el('div', 'grp'); gEdit.append(el('em', '', 'EDIT'));
    const bRev = key('REVERSE', 'Toggle pad reverse (non-destructive)'),
          bNorm = key('NORMALIZE', 'Raise the whole sample to 0 dBFS peak'),
          bFin = key('FADE IN', 'Fade in at the trim start (10 ms, or 25% of a shorter region)'),
          bFout = key('FADE OUT', 'Fade out the end of the trimmed region'),
          bCrop = key('CROP', 'Keep only the trimmed region (frees sample memory / SP12 time)'),
          bUndo = key('UNDO', 'Undo the last destructive edit');
    gEdit.append(bRev, bNorm, bFin, bFout, bCrop, bUndo);
    bar.append(gPad, gView, gPlay, gEdit);

    const lcd = el('div', 'lcdwrap');
    const main = el('canvas', 'main'), over = el('canvas', 'over');
    lcd.append(main, over);
    const info = el('div', 'info');
    const note = el('div', 'note');
    root.append(hd, bar, lcd, info, note);
    document.body.appendChild(root);

    // Open buttons: P-12 dock + SP FADERS header.
    const dock = document.getElementById('p12VstChordDock');
    const proto = dock && dock.querySelector('button');
    const opener = el('button', proto ? proto.className : 'p12sp-key', 'WAVE EDIT');
    opener.title = 'Open the wave editor';
    if (dock) dock.insertBefore(opener, dock.firstChild);
    opener.addEventListener('click', () => open());

    function fillPads() {
      padSel.innerHTML = '';
      api.banks.forEach(b => api.idsForBank(b).forEach((id, i) => {
        const o = el('option', '', `${b}${i + 1} · ${api.voices[i]}${W.name(id) ? ' — ' + W.name(id) : ''}`);
        o.value = id; if (id === fid) o.selected = true; padSel.appendChild(o);
      }));
    }
    padSel.addEventListener('change', () => { fid = padSel.value; view = { a: 0, b: 1 }; peaksCache = null; draw(); });

    // ---------- drawing ----------
    function sizeCanvas(c) {
      const r = c.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.max(10, Math.round(r.width * dpr)), h = Math.max(10, Math.round(r.height * dpr));
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
      return { w, h, dpr };
    }
    function peaks(buf, a, b, cols) {
      const n = buf.length, ch = Math.min(2, buf.numberOfChannels);
      const d0 = buf.getChannelData(0), d1 = ch > 1 ? buf.getChannelData(1) : d0;
      const s0 = Math.floor(a * n), s1 = Math.max(s0 + 1, Math.ceil(b * n));
      const out = new Float32Array(cols * 2), per = (s1 - s0) / cols;
      for (let x = 0; x < cols; x++) {
        let mn = 1, mx = -1;
        const i0 = s0 + Math.floor(x * per), i1 = Math.min(n, Math.max(i0 + 1, s0 + Math.floor((x + 1) * per)));
        const step = Math.max(1, Math.floor((i1 - i0) / 256));
        for (let i = i0; i < i1; i += step) { const v = (d0[i] + d1[i]) * 0.5; if (v < mn) mn = v; if (v > mx) mx = v; }
        out[x * 2] = mn; out[x * 2 + 1] = mx;
      }
      return out;
    }
    function drawWave(c, a, b, buf, trim, overview) {
      const { w, h, dpr } = sizeCanvas(c), g = c.getContext('2d');
      g.clearRect(0, 0, w, h);
      g.fillStyle = '#0f2219'; g.fillRect(0, 0, w, h);
      if (!buf) {
        g.fillStyle = '#4f8f6c'; g.font = `${14 * dpr}px 'Space Mono',monospace`; g.textAlign = 'center';
        g.fillText('EMPTY PAD — load a sample on this pad first', w / 2, h / 2); return;
      }
      // grid
      g.strokeStyle = 'rgba(127,224,168,.10)'; g.lineWidth = 1;
      for (let i = 1; i < 8; i++) { const x = Math.round(i * w / 8) + .5; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      g.beginPath(); g.moveTo(0, h / 2 + .5); g.lineTo(w, h / 2 + .5); g.stroke();
      const pk = (!overview && peaksCache && peaksCache.key === `${fid}|${a}|${b}|${w}|${buf.length}`) ? peaksCache.data : peaks(buf, a, b, w);
      if (!overview) peaksCache = { key: `${fid}|${a}|${b}|${w}|${buf.length}`, data: pk };
      const tx = f => (f - a) / (b - a) * w;
      const x0 = tx(trim.start), x1 = tx(trim.end);
      // outside-trim shade
      g.fillStyle = 'rgba(0,0,0,.45)';
      if (x0 > 0) g.fillRect(0, 0, Math.min(w, x0), h);
      if (x1 < w) g.fillRect(Math.max(0, x1), 0, w - Math.max(0, x1), h);
      for (let x = 0; x < w; x++) {
        const inside = x >= x0 && x <= x1;
        g.fillStyle = inside ? '#7fe0a8' : '#3c6b52';
        const y0 = (1 - (pk[x * 2 + 1] + 1) / 2) * h, y1 = (1 - (pk[x * 2] + 1) / 2) * h;
        g.fillRect(x, y0, 1, Math.max(1, y1 - y0));
      }
      // markers
      const mark = (x, label) => {
        if (x < -2 || x > w + 2) return;
        g.fillStyle = '#ffd23f'; g.fillRect(Math.round(x) - dpr, 0, 2 * dpr, h);
        if (!overview) { g.beginPath(); const y = 0; const s = 9 * dpr;
          if (label === 'S') { g.moveTo(x, y); g.lineTo(x + s, y); g.lineTo(x, y + s); } else { g.moveTo(x, y); g.lineTo(x - s, y); g.lineTo(x, y + s); }
          g.fill(); }
      };
      mark(x0, 'S'); mark(x1, 'E');
      if (overview) { // visible window box
        g.strokeStyle = '#c8ffd9'; g.lineWidth = 1.5 * dpr;
        g.strokeRect(tx(view.a) + 1, 1, Math.max(3, tx(view.b) - tx(view.a)) - 2, h - 2);
      }
    }
    function fmtTime(frames, rate) { const ms = frames / rate * 1000; return ms >= 1000 ? (ms / 1000).toFixed(3) + ' s' : ms.toFixed(1) + ' ms'; }
    function draw() {
      if (!root.classList.contains('open')) return;
      const buf = W.buffer(fid), trim = W.trim(fid);
      drawWave(main, view.a, view.b, buf, trim, false);
      drawWave(over, 0, 1, buf, trim, true);
      const n = buf ? buf.length : 0, r = buf ? buf.sampleRate : 44100;
      const s0 = Math.round(trim.start * n), s1 = Math.round(trim.end * n);
      info.innerHTML = buf
        ? `<span><i>START</i>${s0} · ${fmtTime(s0, r)}</span><span><i>END</i>${s1} · ${fmtTime(s1, r)}</span>` +
          `<span><i>LENGTH</i>${fmtTime(s1 - s0, r)}</span><span><i>RATE</i>${r} Hz</span><span><i>CH</i>${buf.numberOfChannels}</span>` +
          `<span><i>ZOOM</i>${(1 / (view.b - view.a)).toFixed(1)}×</span>${W.reverse(fid) ? '<span><i>REV</i>ON</span>' : ''}`
        : '';
      const warped = W.warped(fid);
      [bNorm, bFin, bFout, bCrop].forEach(b => b.disabled = !buf || warped);
      bRev.disabled = !buf; bPlay.disabled = !buf; bUndo.disabled = !undo.some(u => u.fid === fid);
      bRev.classList.toggle('on', W.reverse(fid)); bSnap.classList.toggle('on', snap);
      note.textContent = warped ? 'This pad uses WARP (preserve pitch): destructive edits are disabled. Trim still works.' : '';
    }

    // ---------- interaction ----------
    function fracAt(c, clientX, a, b) { const r = c.getBoundingClientRect(); return a + Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * (b - a); }
    function snapZero(f, buf) {
      if (!snap || !buf) return f;
      const n = buf.length, d = buf.getChannelData(0), i = Math.round(f * n), R = Math.min(2048, Math.floor(buf.sampleRate * 0.01));
      for (let k = 0; k <= R; k++) {
        for (const j of [i - k, i + k]) if (j > 0 && j < n && ((d[j - 1] <= 0 && d[j] > 0) || (d[j - 1] >= 0 && d[j] < 0))) return j / n;
      }
      return f;
    }
    let drag = null;
    main.addEventListener('pointerdown', e => {
      const buf = W.buffer(fid); if (!buf) return;
      main.setPointerCapture(e.pointerId);
      const f = fracAt(main, e.clientX, view.a, view.b), t = W.trim(fid);
      const r = main.getBoundingClientRect(), px = (view.b - view.a) / r.width * 10; // 10px grab radius
      if (Math.abs(f - t.start) <= px) drag = 'start';
      else if (Math.abs(f - t.end) <= px) drag = 'end';
      else drag = Math.abs(f - t.start) < Math.abs(f - t.end) ? 'start' : 'end';
      move(e);
    });
    function move(e) {
      if (!drag) return;
      const buf = W.buffer(fid), t = W.trim(fid), minLen = 32 / buf.length;
      let f = snapZero(fracAt(main, e.clientX, view.a, view.b), buf);
      if (drag === 'start') W.setTrim(fid, Math.min(f, t.end - minLen), t.end);
      else W.setTrim(fid, t.start, Math.max(f, t.start + minLen));
      draw();
    }
    main.addEventListener('pointermove', move);
    const endDrag = () => { if (drag) { drag = null; } };
    main.addEventListener('pointerup', endDrag); main.addEventListener('pointercancel', endDrag);
    main.addEventListener('wheel', e => {
      e.preventDefault();
      const f = fracAt(main, e.clientX, view.a, view.b);
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) { pan((e.deltaX || e.deltaY) / 600 * (view.b - view.a)); return; }
      zoom(e.deltaY < 0 ? 0.8 : 1.25, f);
    }, { passive: false });
    let overDrag = false;
    over.addEventListener('pointerdown', e => { overDrag = true; over.setPointerCapture(e.pointerId); centerAt(fracAt(over, e.clientX, 0, 1)); });
    over.addEventListener('pointermove', e => { if (overDrag) centerAt(fracAt(over, e.clientX, 0, 1)); });
    over.addEventListener('pointerup', () => { overDrag = false; });
    function clampView(a, b) { const w = Math.min(1, Math.max(b - a, 64 / Math.max(64, (W.buffer(fid) || { length: 64 }).length))); a = Math.max(0, Math.min(1 - w, a)); view = { a, b: a + w }; draw(); }
    function zoom(k, around) { const w = (view.b - view.a) * k; clampView(around - (around - view.a) * k, around - (around - view.a) * k + w); }
    function pan(d) { clampView(view.a + d, view.b + d); }
    function centerAt(f) { const w = view.b - view.a; clampView(f - w / 2, f + w / 2); }

    bFit.onclick = () => clampView(0, 1);
    bZoomSel.onclick = () => { const t = W.trim(fid), pad = (t.end - t.start) * 0.05; clampView(t.start - pad, t.end + pad); };
    bIn.onclick = () => zoom(0.5, (view.a + view.b) / 2);
    bOut.onclick = () => zoom(2, (view.a + view.b) / 2);
    bSnap.onclick = () => { snap = !snap; draw(); };
    bPlay.onclick = () => W.hit(fid);
    bRev.onclick = () => { W.toggleReverse(fid); peaksCache = null; draw(); };

    // ---------- destructive edits (on the forward buffer) ----------
    function forwardCopy() {
      const play = W.buffer(fid); if (!play) return null;
      const rev = W.reverse(fid);
      const out = W.createBuffer(play.numberOfChannels, play.length, play.sampleRate);
      for (let c = 0; c < play.numberOfChannels; c++) {
        const s = play.getChannelData(c), d = out.getChannelData(c);
        if (rev) for (let i = 0; i < s.length; i++) d[i] = s[s.length - 1 - i]; else d.set(s);
      }
      return { buf: out, rev };
    }
    // Map a play-direction trim to forward-buffer sample indexes.
    function regionForward(len, rev) {
      const t = W.trim(fid); let a = Math.round(t.start * len), b = Math.round(t.end * len);
      if (rev) [a, b] = [len - b, len - a];
      return [Math.max(0, a), Math.min(len, b)];
    }
    async function commit(edit, keepTrim, label) {
      await W.ensureAudio();
      const fw = forwardCopy(); if (!fw) return;
      undo.push({ fid, buf: forwardCopy().buf, trim: W.trim(fid) }); if (undo.length > 20) undo.shift();
      const result = edit(fw.buf, fw.rev) || fw.buf;
      W.replace(fid, result, keepTrim);
      peaksCache = null; note.textContent = label; draw();
    }
    bNorm.onclick = () => commit(buf => {
      let pk = 0; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) pk = Math.max(pk, Math.abs(d[i])); }
      if (pk > 1e-6) { const g = 0.999 / pk; for (let c = 0; c < buf.numberOfChannels; c++) { const d = buf.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] *= g; } }
    }, true, 'Normalized to 0 dBFS.');
    function fade(isIn) {
      return (buf, rev) => {
        const [a, b] = regionForward(buf.length, rev), len = b - a;
        const n = Math.max(1, Math.min(Math.round(buf.sampleRate * 0.010), Math.round(len * 0.25)));
        // In forward-buffer terms a play-direction fade-in sits at the END when reversed.
        const atStart = rev ? !isIn : isIn;
        for (let c = 0; c < buf.numberOfChannels; c++) {
          const d = buf.getChannelData(c);
          for (let k = 0; k < n; k++) {
            const g = Math.sin((k / n) * Math.PI / 2) ** 2;
            if (atStart) d[a + k] *= g; else d[b - 1 - k] *= g;
          }
        }
      };
    }
    bFin.onclick = () => commit(fade(true), true, 'Fade in applied at trim start.');
    bFout.onclick = () => commit(fade(false), true, 'Fade out applied at trim end.');
    bCrop.onclick = () => commit((buf, rev) => {
      const [a, b] = regionForward(buf.length, rev);
      const out = W.createBuffer(buf.numberOfChannels, Math.max(32, b - a), buf.sampleRate);
      for (let c = 0; c < buf.numberOfChannels; c++) out.getChannelData(c).set(buf.getChannelData(c).subarray(a, Math.max(a + 32, b)));
      return out;
    }, false, 'Cropped to the trimmed region.').then(() => clampView(0, 1));
    bUndo.onclick = async () => {
      for (let i = undo.length - 1; i >= 0; i--) if (undo[i].fid === fid) {
        const u = undo.splice(i, 1)[0];
        W.replace(fid, u.buf, false); W.setTrim(fid, u.trim.start, u.trim.end);
        peaksCache = null; note.textContent = 'Undone.'; draw(); return;
      }
    };

    // ---------- open/close ----------
    async function open(target) {
      await W.ensureAudio().catch(() => {});
      if (target) fid = target;
      fillPads(); root.classList.add('open'); requestAnimationFrame(draw);
    }
    closeBtn.onclick = () => root.classList.remove('open');
    window.addEventListener('resize', () => { peaksCache = null; draw(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('open')) root.classList.remove('open'); });
    setInterval(() => { if (root.classList.contains('open')) draw(); }, 500); // reflect trims made elsewhere
    window.p12WaveEditor = { open, close: () => root.classList.remove('open') };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
