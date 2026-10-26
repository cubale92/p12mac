# P-12 FULL15 Safety / Recovery Pass — 2026-10-07

Implemented around the existing FULL15 GUI/native audio engine. The protected Rossum SP-1200 export source remains byte-identical and is still guarded by tests-sp-character-export-isolation.cjs.

1. Rolling crash recovery: P12_RECOVERY.p12 plus three rotated backups in Electron userData. Recovery captures sequencer, mixer, Piano Roll, VST routing/settings and Rossum metadata. Normal Project.p12 saves remain the authoritative sample-inclusive project format.
2. Project integrity gate: validates project structure, pad/sample IDs, pattern/bank ranges, insert arrays and Rossum mix metadata before replacing the live project.
3. Session plugin quarantine: after three native load/insert failures or timeouts, the same plug-in path is blocked for the rest of the session until quarantine is cleared in SYSTEM.
4. Audio watchdog: logs callback overruns, graph-lock misses, costly VST blocks and oversize callbacks. Optional SYSTEM auto-bypass can bypass the exact costly track/master insert identified by native DSP telemetry. Default is OFF.
5. Global panic: releases internal pad voices, Piano Roll held notes, sustain state, external MIDI/VST voices and native host notes together.
6. View-state persistence: remembers Mixer-32 zoom/scroll positions, Sequencer zoom/scroll, Piano Roll edit grid/zoom and main window size.
7. Safer save/export: Electron downloads for Project.p12, .sp12/.s12, HFE, ZIP and WAV are routed through temp-write + fsync + atomic replacement. The renderer still generates the exact same export bytes.
8. SP-1200 regression guard: FINAL_RELEASE_GATE.cmd runs tests-sp-character-export-isolation.cjs; any source change from the protected SP export marker onward fails the gate.
9. Performance Snapshot: SYSTEM gets a button that writes sample rate, buffer size, device, callback/VST peaks, underruns/lock misses and lateness counters to P12_DIAGNOSTICS.log.
10. Release Self-Test: SYSTEM gets a non-destructive check of project serialization/integrity, Mixer-32, Piano Roll, Sequencer, native VST host, SP12 exporter presence and HFE exporter presence.

Physical Rossum sound verification remains deliberately separate and is not faked by this software test pass.
