/* P12 Retro — Sample Library sidebar.
 *
 * Browse sample folders, search, star favourites, preview, then load onto a pad
 * (double-click, LOAD → PAD, or drag onto a P-12 pad / SP FADERS pad). Loading
 * goes through P-12's own loadSampleFile(), exactly like the pad file picker.
 *
 * Folder access:
 *  - Chromium with the File System Access API (desktop app, Windows plug-in,
 *    Chrome/Edge): folders are remembered (IndexedDB) and rescanned next time.
 *  - Otherwise: pick a folder (or files on Android) for this session.
 */
(() => {
  'use strict';
  if (window.__p12LibraryLoaded) return;
  window.__p12LibraryLoaded = true;

  const AUDIO = /\.(wav|wave|aif|aiff|mp3|flac|ogg|m4a)$/i;
  const MAX_FILES = 20000, MAX_ROWS = 400;
  const FAV_KEY = 'p12-library-favs', UI_KEY = 'p12-library-ui';
  const canPickDir = typeof window.showDirectoryPicker === 'function';

  const css = `
  #p12Lib{--panel:#545e6e;--panel-hi:#6a7586;--rule:#2f8fe0;--ink:#e8ecf2;--dim:#aab3c0;
    position:fixed;left:0;top:0;bottom:0;z-index:99989;width:320px;max-width:100vw;display:none;flex-direction:column;
    color:var(--ink);font:500 12px/1.3 Oswald,'Space Mono',sans-serif;
    background:linear-gradient(90deg,var(--panel-hi),var(--panel) 30%);border-right:1px solid #1b2028;box-shadow:12px 0 40px rgba(0,0,0,.45)}
  #p12Lib.open{display:flex}
  #p12Lib .hd{display:flex;align-items:center;gap:8px;padding:10px 12px 8px;border-bottom:2px solid var(--rule)}
  #p12Lib .hd b{font-size:20px;margin-right:auto}
  #p12Lib .tools{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px}
  #p12Lib .tools .p12sp-key{min-width:0;height:30px;padding:0 9px}
  #p12Lib input[type=search]{flex:1 1 100%;height:32px;border-radius:4px;border:1px solid #20262f;background:#0f2219;color:#c8ffd9;
    font:700 13px 'Space Mono',monospace;padding:0 10px}
  #p12Lib select{height:30px;border-radius:4px;background:#f1eee6;color:#1d2430;border:1px solid #20262f;font:600 11px Oswald,sans-serif;max-width:100%}
  #p12Lib .status{padding:2px 12px 6px;color:var(--dim);font-size:11px;min-height:15px}
  #p12Lib .list{flex:1;overflow:auto;border-top:1px solid rgba(0,0,0,.35);background:rgba(10,14,18,.35)}
  #p12Lib .row{display:grid;grid-template-columns:22px 1fr auto;gap:6px;align-items:center;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,.05);cursor:pointer;user-select:none}
  #p12Lib .row:hover{background:rgba(255,255,255,.06)}
  #p12Lib .row.sel{background:rgba(47,143,224,.35)}
  #p12Lib .row .nm{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600}
  #p12Lib .row .fd{grid-column:2/4;color:var(--dim);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-top:-3px}
  #p12Lib .row .du{color:#9fd8b8;font:700 10px 'Space Mono',monospace}
  #p12Lib .star{background:none;border:0;color:#6b7686;font-size:15px;cursor:pointer;padding:0;line-height:1}
  #p12Lib .star.on{color:#ffd23f}
  #p12Lib .ft{display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding:8px 12px 12px;border-top:2px solid var(--rule)}
  #p12Lib .ft .tgt{font:700 12px 'Space Mono',monospace;color:#c8ffd9;margin-right:auto}
  #p12Lib .empty{padding:24px 16px;color:var(--dim);line-height:1.6}
  .p12lib-drop{outline:3px solid #ffd23f!important;outline-offset:-3px}
  /* Wide screens: push P-12 aside instead of covering pads. */
  @media (min-width:900px){html.p12lib-open body{padding-left:320px!important;box-sizing:border-box}}
  @media (max-width:560px){#p12Lib{width:100vw}}
  `;

  const el = (t, c, x) => { const n = document.createElement(t); if (c) n.className = c; if (x != null) n.textContent = x; return n; };
  const key = (label, title) => { const b = el('button', 'p12sp-key', label); if (title) b.title = title; return b; };
  const loadJSON = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || '') ?? d; } catch (_e) { return d; } };
  const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (_e) {} };

  // ---- IndexedDB for remembered folder handles ----------------------------
  const idb = {
    open() { return new Promise((res, rej) => { const r = indexedDB.open('p12-library', 1); r.onupgradeneeded = () => r.result.createObjectStore('folders'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }); },
    async all() { try { const db = await this.open(); return await new Promise(res => { const out = []; const c = db.transaction('folders').objectStore('folders').openCursor(); c.onsuccess = () => { const cur = c.result; if (cur) { out.push({ id: cur.key, handle: cur.value }); cur.continue(); } else res(out); }; c.onerror = () => res(out); }); } catch (_e) { return []; } },
    async put(id, h) { try { const db = await this.open(); db.transaction('folders', 'readwrite').objectStore('folders').put(h, id); } catch (_e) {} },
    async del(id) { try { const db = await this.open(); db.transaction('folders', 'readwrite').objectStore('folders').delete(id); } catch (_e) {} }
  };

  function start() {
    const api = window.p12SpMixApi;
    if (!api || !api.wave || !api.wave.loadFile) { setTimeout(start, 250); return; }
    const W = api.wave;
    const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

    const ui = Object.assign({ open: false, favOnly: false, folder: '*', autoPreview: true }, loadJSON(UI_KEY, {}));
    const favs = new Set(loadJSON(FAV_KEY, []));
    let folders = [];            // {id, name, handle|null, files:[entry]}
    let entries = [];            // {name, path, folder, getFile()}
    let view = [], selIdx = -1, target = api.idsForBank(api.bank())[0];

    // ---------- DOM ----------
    const root = el('div'); root.id = 'p12Lib'; root.setAttribute('role', 'complementary'); root.setAttribute('aria-label', 'Sample library');
    const hd = el('div', 'hd'); const closeBtn = key('CLOSE'); hd.append(el('b', '', 'Library'), closeBtn);
    const tools = el('div', 'tools');
    const addBtn = key(canPickDir ? 'ADD FOLDER' : 'PICK FOLDER', canPickDir ? 'Add a sample folder (remembered)' : 'Pick a sample folder for this session');
    const filesBtn = key('ADD FILES', 'Add individual audio files for this session');
    const rescanBtn = key('RESCAN', 'Rescan remembered folders');
    const favBtn = key('★ ONLY', 'Show favourites only');
    const autoBtn = key('AUTO ▶', 'Preview on select');
    const search = el('input'); search.type = 'search'; search.placeholder = 'Search samples…'; search.setAttribute('aria-label', 'Search samples');
    const folderSel = el('select'); folderSel.title = 'Folder';
    tools.append(addBtn, filesBtn, rescanBtn, favBtn, autoBtn, search, folderSel);
    const status = el('div', 'status');
    const list = el('div', 'list'); list.tabIndex = 0;
    const ft = el('div', 'ft');
    const tgt = el('span', 'tgt'); const prevBtn = key('▶ PREVIEW'), stopBtn = key('■'), loadBtn = key('LOAD → PAD', 'Load the selected sample onto the target pad');
    ft.append(tgt, prevBtn, stopBtn, loadBtn);
    root.append(hd, tools, status, list, ft);
    document.body.appendChild(root);

    const dirInput = el('input'); dirInput.type = 'file'; dirInput.multiple = true; dirInput.setAttribute('webkitdirectory', ''); dirInput.style.display = 'none';
    const fileInput = el('input'); fileInput.type = 'file'; fileInput.multiple = true; fileInput.accept = 'audio/*,.wav,.aif,.aiff,.mp3,.flac,.ogg,.m4a'; fileInput.style.display = 'none';
    document.body.append(dirInput, fileInput);

    const dock = document.getElementById('p12VstChordDock');
    const proto = dock && dock.querySelector('button');
    const opener = el('button', proto ? proto.className : 'p12sp-key', 'LIBRARY');
    opener.title = 'Open the sample library';
    if (dock) dock.insertBefore(opener, dock.firstChild); else { opener.style.cssText = 'position:fixed;left:12px;bottom:12px;z-index:99988'; document.body.appendChild(opener); }

    // ---------- scanning ----------
    async function scanHandle(dir, prefix, out) {
      for await (const [name, h] of dir.entries()) {
        if (out.length >= MAX_FILES) return;
        if (name.startsWith('.')) continue;
        if (h.kind === 'directory') await scanHandle(h, prefix + name + '/', out);
        else if (AUDIO.test(name)) out.push({ name, rel: prefix + name, getFile: () => h.getFile() });
      }
    }
    async function loadFolder(f) {
      f.files = [];
      if (f.handle) {
        let perm = 'granted';
        try { perm = await f.handle.queryPermission({ mode: 'read' }); } catch (_e) {}
        if (perm !== 'granted') { f.needsPermission = true; return; }
        f.needsPermission = false;
        try { await scanHandle(f.handle, '', f.files); } catch (e) { f.error = String(e && e.message || e); }
      }
    }
    function rebuildEntries() {
      entries = [];
      for (const f of folders) for (const x of f.files) entries.push({ name: x.name, path: f.name + '/' + x.rel, folder: f.name, rel: x.rel, getFile: x.getFile, dur: x.dur });
      entries.sort((a, b) => a.path.localeCompare(b.path, undefined, { numeric: true, sensitivity: 'base' }));
      folderSel.innerHTML = '';
      [['*', `All folders (${entries.length})`], ...folders.map(f => [f.id, `${f.name}${f.needsPermission ? ' (reconnect)' : ''} (${f.files.length})`])].forEach(([v, t]) => {
        const o = el('option', '', t); o.value = v; if (v === ui.folder) o.selected = true; folderSel.appendChild(o);
      });
      if (![...folderSel.options].some(o => o.value === ui.folder)) ui.folder = '*';
      filter();
    }
    async function restore() {
      if (!canPickDir) return;
      const saved = await idb.all();
      folders = saved.map(({ id, handle }) => ({ id, name: handle.name, handle, files: [] }));
      status.textContent = folders.length ? 'Scanning…' : '';
      for (const f of folders) await loadFolder(f);
      rebuildEntries();
    }
    async function addFolder() {
      if (canPickDir) {
        let h; try { h = await window.showDirectoryPicker({ id: 'p12-library', mode: 'read' }); } catch (_e) { return; }
        for (const f of folders) if (f.handle && await f.handle.isSameEntry?.(h)) { status.textContent = 'Folder already in the library.'; return; }
        const id = 'f' + Date.now();
        const f = { id, name: h.name, handle: h, files: [] };
        folders.push(f); await idb.put(id, h);
        status.textContent = 'Scanning ' + h.name + '…'; await loadFolder(f); rebuildEntries();
      } else dirInput.click();
    }
    function addFileList(fileList, folderName) {
      const files = [...fileList].filter(x => AUDIO.test(x.name)).slice(0, MAX_FILES);
      if (!files.length) { status.textContent = 'No audio files found.'; return; }
      const id = 's' + Date.now();
      folders.push({ id, name: folderName, handle: null, files: files.map(x => ({ name: x.name, rel: x.webkitRelativePath ? x.webkitRelativePath.split('/').slice(1).join('/') : x.name, getFile: async () => x })) });
      rebuildEntries();
    }
    dirInput.addEventListener('change', () => { const fl = dirInput.files; const top = fl[0] && fl[0].webkitRelativePath ? fl[0].webkitRelativePath.split('/')[0] : 'Folder'; addFileList(fl, top + ' (session)'); dirInput.value = ''; });
    fileInput.addEventListener('change', () => { addFileList(fileInput.files, 'Files (session)'); fileInput.value = ''; });

    // ---------- filtering & rendering ----------
    function filter() {
      const q = search.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      view = entries.filter(e => (ui.folder === '*' || folders.find(f => f.id === ui.folder)?.name === e.folder) &&
        (!ui.favOnly || favs.has(e.path)) && q.every(w => e.path.toLowerCase().includes(w)));
      selIdx = Math.min(selIdx, view.length - 1);
      render();
    }
    function render() {
      list.innerHTML = '';
      const needs = folders.filter(f => f.needsPermission);
      if (needs.length) {
        const r = el('div', 'empty'); const b = key('RECONNECT FOLDERS', 'Allow access to your remembered folders again');
        r.append(el('div', '', `${needs.length} remembered folder(s) need permission again.`), b);
        b.onclick = async () => { for (const f of needs) { try { if (await f.handle.requestPermission({ mode: 'read' }) === 'granted') await loadFolder(f); } catch (_e) {} } rebuildEntries(); };
        list.appendChild(r);
      }
      if (!entries.length && !needs.length) {
        list.appendChild(el('div', 'empty', canPickDir
          ? 'Add a sample folder to start. It is remembered next time you open P-12.'
          : 'Pick a sample folder (or add files) to browse them here.'));
      }
      view.slice(0, MAX_ROWS).forEach((e, i) => {
        const row = el('div', 'row' + (i === selIdx ? ' sel' : '')); row.draggable = true; row.dataset.i = String(i);
        const star = el('button', 'star' + (favs.has(e.path) ? ' on' : ''), '★'); star.title = 'Favourite';
        star.onclick = ev => { ev.stopPropagation(); favs.has(e.path) ? favs.delete(e.path) : favs.add(e.path); saveJSON(FAV_KEY, [...favs]); if (ui.favOnly) filter(); else star.classList.toggle('on', favs.has(e.path)); };
        const nm = el('div', 'nm', e.name.replace(AUDIO, '')); nm.title = e.path;
        const du = el('div', 'du', e.dur ? fmtDur(e.dur) : '');
        const fd = el('div', 'fd', e.folder + '/' + e.rel.split('/').slice(0, -1).join('/'));
        row.append(star, nm, du, fd);
        row.onclick = () => select(i, ui.autoPreview);
        row.ondblclick = () => loadInto(target, i);
        row.addEventListener('dragstart', ev => { ev.dataTransfer.setData('text/p12-lib', String(i)); ev.dataTransfer.effectAllowed = 'copy'; });
        list.appendChild(row);
      });
      const shown = Math.min(view.length, MAX_ROWS);
      status.textContent = entries.length ? `${view.length} sample${view.length === 1 ? '' : 's'}${view.length > shown ? ` (showing ${shown} — refine the search)` : ''}` : status.textContent;
      favBtn.classList.toggle('on', ui.favOnly); autoBtn.classList.toggle('on', ui.autoPreview);
      paintTarget();
    }
    const fmtDur = s => s >= 1 ? s.toFixed(2) + 's' : Math.round(s * 1000) + 'ms';
    function paintTarget() {
      const bank = target.split('_')[0], i = api.idsForBank(bank).indexOf(target);
      tgt.textContent = `→ ${bank}${i + 1} ${api.voices[i] || ''}`;
      tgt.title = 'Target pad (click a pad in P-12 or SP FADERS to change it)';
    }
    function select(i, preview) {
      selIdx = i;
      list.querySelectorAll('.row').forEach(r => r.classList.toggle('sel', Number(r.dataset.i) === i));
      list.querySelector('.row.sel')?.scrollIntoView({ block: 'nearest' });
      if (preview) play(i);
    }

    // ---------- preview ----------
    const cache = new Map(); let src = null;
    async function decode(i) {
      const e = view[i]; if (!e) return null;
      if (cache.has(e.path)) return cache.get(e.path);
      const c = await W.ensureAudio(); const file = await e.getFile();
      const buf = await c.decodeAudioData(await file.arrayBuffer());
      cache.set(e.path, buf); if (cache.size > 40) cache.delete(cache.keys().next().value);
      e.dur = buf.duration; const row = list.querySelector(`.row[data-i="${i}"] .du`); if (row) row.textContent = fmtDur(buf.duration);
      return buf;
    }
    function stop() { try { src && src.stop(); } catch (_e) {} src = null; }
    async function play(i) {
      try {
        const buf = await decode(i); if (!buf) return;
        const c = await W.ensureAudio(); if (c.state === 'suspended') await c.resume();
        stop(); src = c.createBufferSource(); src.buffer = buf;
        const g = c.createGain(); g.gain.value = 0.8; src.connect(g); g.connect(c.destination); src.start();
      } catch (e) { status.textContent = 'Preview failed: ' + (e && e.message || e); }
    }

    // ---------- loading ----------
    async function loadInto(fid, i) {
      const e = view[i]; if (!e || !fid) return;
      try {
        const file = await e.getFile();
        await W.loadFile(fid, file);
        const bank = fid.split('_')[0], n = api.idsForBank(bank).indexOf(fid);
        status.textContent = `Loaded ${e.name} → ${bank}${n + 1}`;
        flash(fid);
      } catch (err) { status.textContent = 'Load failed: ' + (err && err.message || err); }
    }
    function flash(fid) { const p = document.getElementById('pad-' + fid); if (p) { p.classList.add('p12lib-drop'); setTimeout(() => p.classList.remove('p12lib-drop'), 400); } }

    // Target pad follows the pad you touch in P-12 or SP FADERS.
    function fidFromElement(t) {
      const pad = t && t.closest && t.closest('[id^="pad-"]');
      if (pad && /^pad-[A-D]_/.test(pad.id)) return pad.id.slice(4);
      const sp = t && t.closest && t.closest('.p12sp-pad');
      if (sp) { const idx = [...sp.parentElement.parentElement.children].indexOf(sp.parentElement); if (idx >= 0) return api.idsForBank(api.bank())[idx]; }
      return null;
    }
    document.addEventListener('pointerdown', ev => { const f = fidFromElement(ev.target); if (f) { target = f; paintTarget(); } }, true);
    // Drag rows onto pads.
    let over = null;
    document.addEventListener('dragover', ev => {
      if (!ev.dataTransfer || ![...ev.dataTransfer.types].includes('text/p12-lib')) return;
      const f = fidFromElement(ev.target); const host = ev.target.closest && (ev.target.closest('[id^="pad-"]') || ev.target.closest('.p12sp-pad'));
      if (over && over !== host) over.classList.remove('p12lib-drop');
      if (f && host) { ev.preventDefault(); ev.dataTransfer.dropEffect = 'copy'; host.classList.add('p12lib-drop'); over = host; }
    }, true);
    document.addEventListener('drop', ev => {
      if (!ev.dataTransfer || ![...ev.dataTransfer.types].includes('text/p12-lib')) return;
      ev.preventDefault(); ev.stopPropagation();
      if (over) over.classList.remove('p12lib-drop'); over = null;
      const f = fidFromElement(ev.target); if (f) { target = f; paintTarget(); loadInto(f, Number(ev.dataTransfer.getData('text/p12-lib'))); }
    }, true);
    document.addEventListener('dragend', () => { if (over) over.classList.remove('p12lib-drop'); over = null; }, true);

    // ---------- wiring ----------
    addBtn.onclick = addFolder;
    filesBtn.onclick = () => fileInput.click();
    rescanBtn.onclick = async () => { status.textContent = 'Rescanning…'; for (const f of folders) if (f.handle) await loadFolder(f); rebuildEntries(); };
    favBtn.onclick = () => { ui.favOnly = !ui.favOnly; saveJSON(UI_KEY, ui); filter(); };
    autoBtn.onclick = () => { ui.autoPreview = !ui.autoPreview; saveJSON(UI_KEY, ui); render(); };
    folderSel.onchange = () => { ui.folder = folderSel.value; saveJSON(UI_KEY, ui); filter(); };
    let t = 0; search.addEventListener('input', () => { clearTimeout(t); t = setTimeout(filter, 120); });
    prevBtn.onclick = () => selIdx >= 0 && play(selIdx);
    stopBtn.onclick = stop;
    loadBtn.onclick = () => selIdx >= 0 && loadInto(target, selIdx);
    list.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); const n = Math.max(0, Math.min(Math.min(view.length, MAX_ROWS) - 1, selIdx + (ev.key === 'ArrowDown' ? 1 : -1))); select(n, ui.autoPreview); }
      else if (ev.key === 'Enter' && selIdx >= 0) { ev.preventDefault(); loadInto(target, selIdx); }
      else if (ev.key === ' ' && selIdx >= 0) { ev.preventDefault(); play(selIdx); }
    });
    function setOpen(o) { ui.open = !!o; saveJSON(UI_KEY, ui); root.classList.toggle('open', ui.open); document.documentElement.classList.toggle('p12lib-open', ui.open); opener.classList.toggle('on', ui.open); if (ui.open) render(); window.dispatchEvent(new Event('resize')); }
    opener.onclick = () => setOpen(!root.classList.contains('open'));
    closeBtn.onclick = () => setOpen(false);
    setOpen(ui.open);
    restore().then(() => { if (!folders.length) render(); });
    window.p12Library = { open: () => setOpen(true), close: () => setOpen(false), addFiles: (files, name) => addFileList(files, name || 'Files (session)') };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
