# P-12 native VST host

This folder is the source project for `native/p12-vst-host.exe`.

## What this host implements

- JSON-lines IPC over stdin/stdout, matching the Electron P-12 bridge.
- VST3 loading through JUCE.
- Optional legacy VST2 hosting when built with a legally obtained VST2 SDK.
- Four standalone VST host slots used by the P-12 VST window.
- Mixer-32 plug-in instances keyed by Pad / Track / Master + insert slot.
- MIDI Note On/Off/CC/pitch-bend routing from CHORDS and the sequencer.
- Native manufacturer/editor windows (`openEditor` / `closeEditor`).
- Plug-in state get/set commands used by P-12 project save/load for Mixer-32 VST insert state.
- A native low-latency audio callback that renders hosted VST instruments to the default output device.
- Correlated JSON replies so Electron can report real plug-in load errors instead of only saying a command was queued.


## 0.3.0 insert/editor reliability fixes

- Mixer VST replacement is transactional on the renderer side: the visible insert is changed only after the native host confirms the replacement loaded.
- `openEditor` validates the requested plug-in path against the plug-in actually loaded in that native slot, preventing an old editor from being shown under a new name.
- Manufacturer GUI and forced JUCE generic parameter GUI are both supported. The generic editor is a fallback for plug-ins whose custom editor is incompatible with the host.
- CHORDS and Mixer VST browser targets are cleared when switching/closing contexts so a stale Mixer assignment cannot steal a later CHORDS load (or vice versa).

## Important current audio-routing boundary

The executable can render **VST instruments** from MIDI immediately after it is built. However, P-12's existing sampler/mixer audio still lives in Chromium Web Audio. A VST effect loaded on a Mixer-32 insert therefore does **not yet receive P-12's internal pad/track PCM audio**. Completing effect inserts requires the second bridge stage described in `AUDIO-BRIDGE-NEXT.md` (shared-memory/native-addon or equivalent real-time PCM bridge). This source does not pretend that JSON/IPC audio is suitable for real-time DSP.

## Windows VST3 build

Requirements:

- Visual Studio 2022 with Desktop development with C++
- CMake 3.24+
- Git (CMake fetches JUCE 9.0.2)

From a Windows terminal in this folder:

```bat
cmake --preset win64-vst3
cmake --build --preset win64-vst3-release
```

The binary will be at:

`build\win64-vst3\bin\p12-vst-host.exe`

Copy it to:

`..\native\p12-vst-host.exe`

Or use the root-level `build-native-host.bat` helper.

## Optional VST2 build

VST2 is not enabled by default. JUCE does not distribute the old VST2 SDK. Only enable this if you already have a legally obtained VST2 SDK and any permissions you need for your intended distribution.

Example:

```bat
cmake -S . -B build\win64-vst2vst3 -G "Visual Studio 17 2022" -A x64 ^
  -DP12_ENABLE_VST2=ON ^
  -DP12_VST2_SDK_PATH="C:\path\to\your\vst2sdk"
cmake --build build\win64-vst2vst3 --config Release --target p12-vst-host
```

## Licensing note

This project uses JUCE. Check the JUCE licence that applies to your use/distribution. Closed-source commercial distribution generally needs an appropriate JUCE commercial licence; AGPL use has different source-disclosure obligations. VST2 has separate legacy SDK/licensing constraints.

### One-click Windows VST2 + VST3 builder

From the P-12 Electron project root, run `BUILD_P12_VST_HOST.cmd`. The script asks for the VST2 SDK root if it is not configured, validates `pluginterfaces/vst2.x/aeffect.h`, configures with `P12_ENABLE_VST2=ON`, builds the x64 Release host, copies it to `native/p12-vst-host.exe`, and verifies that the executable reports both `vst2=true` and `vst3=true`.
