# P-12 Windows KordBot / Piano Roll FULL11 BETA — 2026-10-05

FULL11 builds on FULL10 without replacing the established sampler, sequencer, mixer, Rossum `.sp12`/HFE export, or native VST host architecture.

## Added / improved

- Detached Piano Roll now covers the complete MIDI note range 0–127 with vertical scrolling.
- Live VST key audition remains available while the transport is stopped, with sounding-key highlighting.
- MIDI channel selector (1–16); new and recorded Piano Roll notes retain their channel.
- FL/Ardour-style mouse editing pass: click empty space to draw, rubber-band selection by dragging empty space, move selection, Alt-drag copy, right-click delete, and left/right edge resize.
- Multi-selected notes can be resized together.
- Horizontal and vertical Piano Roll zoom retained and works across the full note range.
- Velocity controller lane with drag editing; selected notes can be velocity-edited together.
- Modulation (CC1), pitch bend, and channel-pressure lanes. Controller points are stored per pattern and sent through the native VST MIDI path during playback; drawing a controller point also auditions the value immediately.
- Native host now accepts MIDI channel pressure in addition to its existing Note On/Off, CC, and pitch-bend support.
- Keyboard editing: arrow-key note nudging, Shift for fine time nudging, Ctrl/Cmd+Shift+Up/Down octave transpose, Ctrl/Cmd+D duplicate, Ctrl/Cmd+Q quantize, plus copy/cut/paste/delete/undo/redo.
- Main sequencer mouse behavior tightened: dragging a hit moves it/its selection instead of entering box selection, Ctrl/Cmd-click toggles selection, Alt-drag copies, empty drag box-selects, right-click deletes, and arrow keys nudge selected events.

## Verification performed here

- JavaScript syntax checks pass for `P-12.html`, `piano-detached.html`, and existing JS sources.
- Existing `tests-nine-point-source.cjs` passes.
- Existing `tests-full10-source.cjs` passes.
- New `tests-full11-source.cjs` passes.
- Source package retains Rossum `.sp12`/HFE and native VST host code.

## Still requires Windows runtime testing

This environment cannot run the Windows JUCE/VST host or your actual KordBot/VST plug-ins. Verify on the target Windows machine: VST audition latency, CC/pitch-bend/channel-pressure response for each plug-in, external MIDI recording, controller playback timing, GUI pointer feel at extreme zoom levels, and installer compilation.

FULL11 moves P-12 much closer to a DAW-style MIDI editor, but it is not a claim of complete feature-for-feature FL Studio or Ardour parity. Ardour was used as an interaction/architecture reference; GPL source was not copied into P-12.
