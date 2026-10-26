P-12 NATIVE ENGINE — FIRST INTEGRATED BETA (October 4, 2026)
============================================================

This is an experimental, opt-in Windows native-audio engine. The existing
Web Audio P-12 remains the DEFAULT to protect existing projects.

CHANGES
- PCM samples are uploaded ONCE at native-mode activation, then played from
  memory by the JUCE device callback. No per-buffer Base64 or Electron IPC.
- Separate 32 pad and eight track routes; loaded VST3 pad -> track -> master
  chains now run inside the same JUCE audio callback. The master receives a
  continuous stream, including silence between notes, for Ozone analysis.
- JUCE host supplies VST playhead BPM, playback state, sample position and
  4/4 signature from P-12 transport.
- Monophonic retriggers, stop/choke, timestamp offsets, pitch-rate changes,
  trim start/end, stereo Hermite interpolation and a short de-click fade.
- C++ event queue is SPSC, with atomically staged immutable sample buffers;
  no per-audio-block PCM IPC, Base64, logging or JUCE string construction.
- Native callback processing counters and callback-deadline diagnostic data.
- Updated installer-script auto tests for the standalone sampler core.

BUILD (Windows 10/11 with Visual Studio C++ build tools, CMake, Git, Node.js):
1. Extract ZIP into a new, short-path folder.
2. Close any running P-12 and run BUILD_P12_WINDOWS_EXE.cmd.
3. The script recompiles p12-vst-host.exe, executes tests, builds the NSIS
   installer in dist-installer and a portable exe in dist-portable.
4. Install fresh build. Launch P-12, import a normal WAV sample, set a VST3 on
   PAD, TRACK 1, and Ozone on MASTER as needed. Verify each is loaded.
5. Use the small bottom-left NATIVE AUDIO switch to opt in. The next launch
   starts with native audio OFF. Hit PLAY and check Ozone meters / assistant.
6. Watch 'slow callbacks' and 'worst ... ms' beside the switch for deadlines.

LIMITATIONS / IMPORTANT
- This is NOT a completed DAW-quality engine replacement. It needs real
  Windows hardware and Ozone tests. JUCE/Windows binaries are NOT compiled
  inside this ZIP; the .cmd script builds them on Windows.
- Native mode currently covers sampled pads and PAD/TRACK/MASTER VST effects;
  P-12's browser-built filter, EQ, submix FX, sends, CHORDS sample voice,
  recording/master capture, and detailed sampler envelope parity are NOT
  migrated. Some GUI FX/settings will differ in the native beta.
- No real latency compensation for lookahead VSTs, no ASIO selection UI yet,
  and no confirmed 64/128-frame reliable performance. Device choice is the
  native-host device. Third-party plugins may still cause callback xruns.
- Offline WAV/SP12/HFE export stays in original browser/exporter path. No
  .sp12 sample-byte, Rossum BF/AT, sequencer format or HFE exporter code was
  modified. Export path is intentionally independent of native playback.
- Native mode supports loaded samples up to 60 seconds per pad and retains
  sample generations until host restart (512 MB safety budget). During mode
  switch, stop playback first. Some loaded samples may need a few seconds to
  stage; missing samples will prevent switching to native.
- Transport and event delivery are IPC control messages (NOT per-buffer PCM)
  and scheduled with browser-derived timing. Clock synchronization and
  sample-accurate sequencer migration are still required for production.

ROLLBACK: Switch NATIVE AUDIO OFF, or simply relaunch P-12. Your existing P-12
projects and exports use the original stable paths.
