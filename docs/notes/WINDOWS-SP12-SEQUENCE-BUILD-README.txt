P-12 WINDOWS SP12 SEQUENCE FOUNDATION BUILD
===========================================

This is the Windows/Electron branch, not Android.

Included in this build:
- Current P-12 Windows interface and Electron shell
- Mixer-32 / CHORDS / Piano Roll / Sequencer
- VST2/VST3 scanning and native-host bridge
- AIR/inMusic duplicate/preferred-copy handling
- Rossum .sp12 audio export
- P-12 Tune + Speed-Warp baked into Rossum sample audio
- Rossum 2.5-second validation based on the actual tuned/exported duration
- Clean PLOKnoseq donor as the built-in hardware-safe template
- Rossum sequence-memory analyzer / sequence-foundation work

IMPORTANT:
The Rossum event writer is not yet enabled because pad/timing bit fields are still being mapped.
This build prevents stale PLOK sequence data from leaking into new exports and exposes the sequence-memory diagnostics.

BUILD A NEW WINDOWS EXE
-----------------------
1. Extract this ZIP to a normal folder, e.g. C:\P12-Windows-New
2. Keep your existing native host at C:\P12\native\p12-vst-host.exe
   OR copy it into this package's native\ folder.
3. Double-click BUILD_P12_WINDOWS_EXE.cmd
4. Wait for SUCCESS.

Outputs:
- dist-installer\P-12-1.1.1-x64.exe  (installer)
- dist-portable\P-12-1.1.1-x64.exe   (portable build)

The first npm install/build can take several minutes.


2026-10-01 v1.1.1: Rossum Chop now uses the pitch/tune/Warp-baked waveform and commits neutral-tune slices to prevent double pitching.
