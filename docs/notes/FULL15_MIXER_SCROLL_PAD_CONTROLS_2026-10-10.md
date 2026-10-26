P-12 FULL15 — Mixer scroll / Master / native pad controls fix (October 10)

Build this extracted folder using BUILD_FULL15_ORIGINAL_GUI.cmd. It rebuilds
both Electron and the JUCE host. Do not reuse an older native host binary.
This ZIP contains the complete source/build package; no Windows EXE is included.

Preserved: original FULL15 faceplate/control layout, separate resizable Electron
Mixer-32 window, native callback-owned sequencer, transport request coalescing,
stopped/idle recovery writes, and October 7 Ozone resource staging fixes.

Mixer-32:
- Definite window/root/panel height and zero inherited main-page body padding.
- Flex layout accounts for wrapped headers; vertical/horizontal scrollbars remain
  inside the window. Pad/track rows also scroll vertically for tall controls.
- Master pinned at the left of the pad row. Master button restores the top/left.
- Wheel, Shift+wheel, trackpad horizontal movement, zoom, resizing and snapshot
  refresh preserve navigation. Larger 200px strips and readable insert selectors.

Main-page pad controls and Mixer-32 use the same project state:
- Native pad Level and Pan update sustained sample voices without retriggering.
- OFF/LP/HP, Cutoff, Resonance, Reverb and Crush now reach native pad DSP.
- Native Reverb uses a damped stereo comb-network send and keeps its tail when
  the sample ends. It is playback-only; its sound need not match WebAudio's IR.
- Classic/Hi-Fi switches the native playback path on an existing sample voice.
- Choke changes update future native pattern events; they do not restart Play.
- Scalar controls are deduplicated and synchronized at most once per 60ms while
  edited; no repeated unchanged updates. No sample/recovery buffers accompany them.
- Pad scalar edits do not recompile/restart the native event plan.
- Unchanged insert slots are no longer reconfigured/reset on another slot's edit.
- Main-page knob metadata stays current for detached snapshots; WebAudio filter
  toggles also work on sustained sounds.

Validation completed on Linux:
- Real Chromium: original main-page control callbacks and native parameter state;
  detached mixer at 1700x980, 900x650, 700x450, Master pinning, row/workspace bounds,
  vertical wheel, horizontal/Shift+wheel, snapshot preservation, navigation, zoom.
- FULL15 integrated source/JS/IPC/recovery/transport/encoder preflight.
- Compiled C++ audio tests: live Level/Pan/Mute/Engine, filter bypass/LP/HP,
  resonance, crusher, persistent reverb tails, zero callback allocations.
- Existing native sampler, scheduled triggers/stops, SP character and native
  sequence clock tests pass (including five seconds with no renderer scheduling).
- Rossum protected exporter source checksum unchanged. Its mono fold-down,
  deterministic Blackman/sinc 26,040 Hz, tiny DC removal and true 12-bit encoder
  are untouched. SP character and added effects remain playback-only.

Windows JUCE/Electron executable build, Ozone editor runtime and physical Rossum
hardware listening were not available here. Windows builder now also runs the
new pad-control audio test with assertions enabled in Release.
