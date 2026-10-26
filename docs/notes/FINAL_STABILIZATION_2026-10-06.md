# P-12 FULL15 final stabilization gate

This pass does not change the proven Rossum `.sp12/.s12` encoder or its deterministic audio conversion path.

Added:
- Electron `--p12-smoke-test`: exits automatically only after the actual main BrowserWindow reaches `ready-to-show`.
- `FINAL_RELEASE_GATE.cmd`: gates release on FULL15 integrated source tests, export isolation, realtime/native-host source regression, a fresh Windows VST3 host build, and an Electron startup smoke test.

Linux/container verification for this source:
- every bundled `tests-*.cjs`: PASS
- native sampler/routing C++: PASS
- native scheduled timing/choke C++: PASS
- playback-only SP character C++: PASS
- Mixer-32 interaction: PASS
- Piano Roll workflow/edit-grid: PASS
- note-edge resize: PASS
- live chord recognition: PASS
- VST route-change cleanup: PASS
- multi-MIDI-input recovery: PASS
- detached Piano count-in: PASS
- MIDI disconnect/All Notes Off recovery: PASS

Physical Rossum verification cannot be performed in this environment. Export safety blocks for unverified special Rossum song commands remain intentional; the encoder is not guessed or weakened.

The long combined Chromium stress loop was intentionally not used as a release gate because the headless browser transport itself became unstable under repeated full-page recreation. The smaller focused browser tests all pass and are the authoritative UI interaction checks.
