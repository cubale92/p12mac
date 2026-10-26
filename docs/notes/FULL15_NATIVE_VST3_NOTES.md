# P-12 FULL15 native mixer / VST3 source beta

This is source intended for **standalone Windows Electron + JUCE**. It is NOT a rebuilt, tested Windows executable. The UI is still Electron/HTML and the sequence scheduler remains partly JavaScript: a full JUCE sequencer/UI migration is **not** complete.

## Changes since FULL14
- Mixer 32 can be detached into a separate Electron window, moving the live DOM rather than creating a second competing audio engine. Browser fallback remains the in-page mixer.
- Native JUCE callback gains first-pass built-in DSP for filter, EQ, compressor, harmonic, delay and reverb slots on pad, track and master routes. This is **not full parity** with every browser effect (e.g. modulation and vintage/12-bit types aren't all implemented); check audio critically.
- JUCE VST3 loading is independent of the **LEGACY VST** comparison button.
- Insert power OFF bypasses DSP while preserving the actual plugin instance and allowing its editor to open. New inactive plugins now instantiate and retain their state.
- Assigning an enabled VST attempts to start JUCE native output when required; restored projects containing VSTs also attempt native output.
- Distinguishes discovery errors from plugin-instantiation errors and reports likely dependency/installation problems.

## Observed user log, not a runtime claim
- `C:\Program Files\Common Files\VST3\KORG\TRITON.vst3` was discovered but `TRITON` failed instance creation with `Unable to load VST-3 plug-in file`.
- TRITON Extreme and some other VST3s successfully instantiate.
- `Arturia\Emulator II V.vst3` returned `No loadable VST3 plug-in type...`.
- Native driver retained 480 frames despite requests for 512/1024: an audio device/driver limitation, not a successful buffer-size switch.
- MIDI/audio counts show some plugins running; they do not prove every plugin is functional.

**TRITON compatibility remains unverified.** A VST3 loader cannot guarantee success if a third-party DLL is missing, blocked, wrongly installed, incompatible, or requires vendor activation/runtime dependencies. Test the updated Windows host, check KORG Software Pass/activation and plugin architecture, compare with another JUCE VST3 host and capture the new host log for a precise diagnosis.

## Regression tests
Run `node tests-nine-point-source.cjs`, and tests FULL10, FULL11, FULL13, FULL14. Building the native host requires Windows/MSVC/CMake and JUCE 9.0.2. Do not use this ZIP as a ready-made installer; its native changes require recompiling `p12-vst-host.exe`.

## Not yet complete
- Windows VST3 loading, GUI and audio engine runtime testing (especially KORG TRITON).
- All built-in effect algorithms matching existing Web Audio (currently a bounded native first pass).
- Native sample-accurate sequencer scheduling and entirely native GUI.
