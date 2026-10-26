P-12 v1.0 FINAL RELEASE
========================

P-12 DESKTOP / ELECTRON — NATIVE VST HOST SOURCE INCLUDED
=========================================================

THIS PACKAGE NOW INCLUDES
- The latest debugged P-12 HTML with Mixer-32, VST2/VST3 scanning, track names,
  long sequencer lengths, CHORDS pad/VST routing, SP12 tools and the P-12 icon.
- Real recursive VST2/VST3 disk scanning in Electron.
- Format-aware Mixer-32 plug-in assignments on Pads, Tracks and Master.
- A native-host source project under native-host/.
- Correlated Electron <-> native-host JSON RPC instead of fire-and-forget load calls.
- Native plug-in editor open/close commands.
- VST instrument MIDI rendering through the native host.
- Mixer VST plug-in state capture/restoration in P-12 project JSON when the host is available.
- Correct electron-builder packaging for native/p12-vst-host.exe as an unpacked extra resource.

FIRST: BUILD THE NATIVE VST3 HOST ON WINDOWS
1. Install Visual Studio 2022 with "Desktop development with C++".
2. Install CMake 3.24+ and Git.
3. Double-click/run: build-native-host.bat
4. The script builds native-host and copies the result to:
     native\p12-vst-host.exe

Then test P-12:
  npm install
  npm start

Build the Windows installer:
  npm run dist:win

The NSIS installer will include the compiled host at:
  resources\native\p12-vst-host.exe

VST3
- Enabled by default in the native-host source.
- The build fetches JUCE 9.0.2 through CMake.

VST2 / LEGACY
- The scanner still discovers Windows DLL candidates.
- Native VST2 hosting is OFF by default because JUCE/Steinberg no longer
  distribute the old VST2 SDK.
- If you already have a legally obtained VST2 SDK and the rights appropriate
  for your distribution, see native-host\README.md for the optional build flag.

IMPORTANT AUDIO BOUNDARY
- After you compile p12-vst-host.exe, VST instruments can receive CHORDS/
  sequencer MIDI, render audio through the native audio device, and open their
  manufacturer GUI.
- P-12's sampler and built-in Mixer-32 audio are still Chromium Web Audio.
  Therefore a native VST compressor/reverb/EQ insert does not yet receive the
  internal P-12 PCM signal. The correct real-time bridge design is documented
  in native-host\AUDIO-BRIDGE-NEXT.md. It intentionally uses shared-memory /
  AudioWorklet architecture rather than trying to stream PCM over JSON IPC.

NATIVE COMMANDS IMPLEMENTED
  ping / status
  loadVST3
  loadVST2 (optional compile path)
  setMixerInsertVST
  openEditor
  closeEditor
  midi
  allNotesOff
  getPluginState
  setPluginState

See NATIVE-VST-HOST-WORK-2026-09-20.txt for the exact change log.

2026-09-20 GUI/AUDIO/CHORDS PATCH
- Rebuild native/p12-vst-host.exe with BUILD_P12_VST_HOST.cmd after extracting this package.
- SYSTEM -> REFRESH OUTPUTS -> choose Native VST Output -> USE OUTPUT -> TEST NATIVE AUDIO.
- CHORDS -> CHORDS VST -> choose Slot 1-4 -> ADD / CHANGE VST -> choose plug-in -> LOAD / OPEN.
- See GUI-AUDIO-CHORDS-FIX-2026-09-20.txt.

2026-10-02 — native Rossum .sp12 sequencer codec correction
-----------------------------------------------------------
P-12 v1.0 now decodes the Rossum segment timing stream at the correct 24 PPQN
native resolution (6 native ticks per 16th step) and preserves the timing-only
phase-wrap markers used by real hardware files. The supplied Rossum corpus was
round-tripped segment-by-segment and all native segment bytes regenerated exactly.
See SP12-NATIVE-SEQUENCER-ROUNDTRIP-P12-v1.0.txt.
