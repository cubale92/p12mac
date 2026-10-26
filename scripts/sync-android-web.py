#!/usr/bin/env python3
"""Sync the P12 Retro web additions from app/ into the Android app.

Copies the shared JS panels and re-applies the P12 Retro block + script tags to
android/app/src/main/assets/P-12.html, then refreshes the matching entries in
android/ANDROID_SOURCE_PATCHES.json so tests/full15-integrity.cjs keeps proving
that everything else is FULL15 + recorded Android patches.
Run from the repo root:  python3 scripts/sync-android-web.py
"""
import json, shutil, pathlib, subprocess
ROOT = pathlib.Path(__file__).resolve().parent.parent
MARK = '  // P-12 v1.0 Tune BF/Tune AT + sequencer pitch/triplet/high-tempo fix'
KSTART = '  // ---------------- P12 Retro: KNOCK engine (Web Audio path) ----------------'
CALL_OLD = "    const classicNode = attachCrusher(preEngineNode, effectiveBits, effectiveRate, chainNodes);"
CALL_NEW = "    const classicNode = window.p12KnockWeb?.on ? p12KnockChain(preEngineNode, fid, isNativeSP12Rate, chainNodes) : attachCrusher(preEngineNode, effectiveBits, effectiveRate, chainNodes);"
JS = ['p12-sp-mixer.js', 'p12-wave-editor.js', 'p12-library.js']
TAG_OLD = '<script src="vendor/jszip.min.js"'
TAG_NEW = ''.join(f'<script src="{j}" defer></script>\n' for j in JS) + TAG_OLD

desk = (ROOT / 'app/P-12.html').read_text(encoding='utf-8')
block = desk[desk.index(KSTART):desk.index(MARK)]
assets = ROOT / 'android/app/src/main/assets'
html_p = assets / 'P-12.html'
a = html_p.read_text(encoding='utf-8')
if KSTART in a:                                   # replace previous block
    a = a[:a.index(KSTART)] + a[a.index(MARK):]
a = a.replace(MARK, block + MARK, 1)
if CALL_OLD in a: a = a.replace(CALL_OLD, CALL_NEW, 1)
# normalise the script tags to exactly TAG_NEW
i = a.index(TAG_OLD); j = a.rfind('<script src="p12-sp-mixer.js"', 0, i)
a = a[:j if j != -1 and i - j < 600 else i] + TAG_NEW + a[i + len(TAG_OLD):]
html_p.write_text(a, encoding='utf-8')
for j in JS: shutil.copy2(ROOT / 'app' / j, assets / j)

pj = ROOT / 'android/ANDROID_SOURCE_PATCHES.json'
patches = [p for p in json.loads(pj.read_text()) if p['original'] not in (MARK, CALL_OLD, TAG_OLD)]
patches += [{'original': MARK, 'android': block + MARK},
            {'original': CALL_OLD, 'android': CALL_NEW},
            {'original': TAG_OLD, 'android': TAG_NEW}]
pj.write_text(json.dumps(patches, indent=2) + '\n')
print('synced', ', '.join(JS), 'and', len(block), 'chars of P12 Retro block')
subprocess.run(['node', str(ROOT / 'scripts/sync-android-live-input.cjs')], check=True)
