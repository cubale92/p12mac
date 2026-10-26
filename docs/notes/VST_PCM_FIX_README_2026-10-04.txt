P-12 Windows: EXPERIMENTAL VST3 AUDIO PATH (2026-10-04)

WHY OZONE AND TRACK 1 INSERTS DID NOTHING
The P-12 WebAudio insert graph silently ignored vst3/vst2 insert types, while
its JUCE host rendered plugin audio from zero-filled buffers to a separate
Windows output device. GUI loading alone never supplied P-12 audio to them.

WHAT THIS SOURCE PATCH DOES
- Sends stereo PCM from P-12 to its native JUCE host via bounded IPC blocks.
- Runs existing VST3 effect instances on that audio and returns processed PCM.
- Wires the master, sequencer track and pad paths into the new PCM bridge.
- Live pad playing also reaches its selected or assigned track inserts.
- Native insert plugins no longer run again on silent device callback buffers.
- Emits first-block console peaks and the count of active VST effects.
- Fails safe to dry playback when the native host is unavailable.
- Retains the earlier SP1200, audio import, sequencer and numeric changes.

LIMITATIONS: EXPERIMENTAL - NOT A TESTED RELEASE
- ScriptProcessor + renderer/IPC processing may introduce audible latency,
  jitter or gaps; not ready for low-latency monitoring or serious mastering.
- Track processing occurs for individual sequenced voices, not a fully summed
  pre-insert track bus. Plugin slots are run after built-in inserts rather
  than in exact displayed mixed-effect order.
- The offline exporter does NOT use the VST host.
- Subchannel third-party inserts are not yet exposed.
- This environment could not compile or run JUCE on Windows, install Ozone,
  or verify the signal path under realtime load.
- No compiled Windows EXE is included here. This is the full source/build ZIP.

HOW TO BUILD
1. Install Visual Studio 2022 with Desktop development with C++, CMake,
   Git and Node/npm on Windows.
2. Extract ZIP, run BUILD_P12_WINDOWS_EXE.cmd.
   It now requires building the patched native VST3 host first, rather than
   silently producing an installer without VST audio support.
3. Load Ozone as a Mixer 32 Master INSERT (not VST HOST instrument slot).
   For Track 1, select its insert slot; start the sequence to send that track
   audio. Watch Electron logs for 'P-12 VST PCM bridge active' diagnostics.
4. Do not overwrite your known-good earlier build without an audio test.

Please report inputPeak / outputPeak / processedPlugins from diagnostics and
whether sound returns on bypass, plus any stutters or excessive latency.
