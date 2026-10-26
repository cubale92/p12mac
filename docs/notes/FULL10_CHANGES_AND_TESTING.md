# P-12 FULL10 — independent Piano Roll / mouse editing (source beta)

Based strictly on `P-12_WINDOWS_KORDBOT_PIANO_FULL9_BETA_2026-10-05`.

## Implemented in this source package

- Detached Piano Roll is a **standalone Electron window** instead of a parent-tied child. Closing it does not reopen the old modal.
- Piano keyboard at the left can send Note On on press and Note Off on release while sequencer is **stopped**, using the selected VST route/slot and original native MIDI bridge. It highlights held keys; the snapshot also marks incoming Kordbot MIDI, VST preview and transport notes.
- Click-drag in empty piano grid to draw a note of snapped duration. Drag existing MIDI note to move; Alt-drag to duplicate; drag the note's right edge to resize, right-click to remove. Keep box selection via Ctrl-drag. Exact note data is committed by P-12 main renderer (not by detached child).
- Selection-based note velocity slider; Copy, Paste, Delete, Undo, Redo, Record, Time Correct. Editable VST target/slot from main P-12.
- Distinct horizontal (timeline) and vertical (pitch-key) zoom, Fit, Ctrl+wheel and Alt+wheel. Visible keyboard range C2–C7 (MIDI 36–96), with notes outside this range retained but not visible. Zoom affects only the detached window.
- Main sequencer: drag any occupied event to move even if not already selected, Alt-drag to copy, and right-click to remove. Embedded piano mouse handling aligned for drag-on-unselected-note.
- Kept the existing SP12/HFE/native engine, project and sampling files untouched beyond editor/IPC changes; no Ardour GPL code was copied.

## Known limitations / unverified

- This is an **updated source/build ZIP, not a precompiled installer**. A Windows JUCE VST host and installed VST instrument/audio output are required for audible notes. Hardware Windows runtime, precise MIDI timing, plugin compatibility and Rossum roundtrips were **not** tested in this Linux environment.
- This is a useful subset of Ardour/FL Studio editing, **not complete feature parity**: controller/automation lanes, full velocity graph editing, external MIDI audition per-channel, expression editing, advanced keyboard shortcuts, unlimited pitch scrolling and full multi-note resize still need engineering and Windows testing.
- Existing note overlap validation can reject edits, preventing destructive overwrites. Duration and pitch are quantized according to the selected Time Correct.

## Build

Use the supplied Windows build scripts and prerequisites. Execute `node tests-nine-point-source.cjs` and `node tests-full10-source.cjs` prior to building. Validate with a VST instrument loaded in the chosen track/pad/master slot: stop transport and click C4, release C4 (no stuck sound), draw and resize a note, drag an unselected drum step, save/reload a .p12, then test SP12/HFE on known hardware.
