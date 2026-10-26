P-12 WINDOWS -- SEQUENCER + PIANO ROLL MOUSE EDITING (2026-10-05)

This is full Windows BUILD SOURCE, not a precompiled installer.
Run BUILD_P12_WINDOWS_EXE.cmd on Windows to create the installer.
The already-working native VST instrument routing and the existing
fallback for EBUSY installer builds remain from the prior ZIP.

SEQUENCER STEP GRID ON MAIN SCREEN:
  Left click: place/cycle a step (OFF / ON / ACCENT) when not selected.
  Ctrl+left click: toggle an existing point's selection.
  Ctrl+hold and drag: add a rectangular group of points to selection.
  Shift+left click: select range/rectangle from last anchor.
  Left drag across unselected cells: select points inside rectangle.
  Drag a selected point: move the selected group as one.
  Ctrl+A: select all visible/current-bank/current-track points.
  Ctrl+C / Ctrl+X / Ctrl+V: copy / cut / paste relative to the last
    clicked selection anchor. Ctrl+click an EMPTY cell to set paste target.
  Ctrl+D: duplicate selected group immediately after its last tick.
  Delete / Backspace: delete all selected points.
  These edits support main-page step accents and current track/bank.

PIANO ROLL:
  Left click: create/remove a note (only when not already selected).
  Ctrl+left click: toggle a note's selection.
  Ctrl+hold and drag: add rectangle of notes to selection.
  Shift+click: select rectangular note range from last anchor.
  Left drag over unselected cells: marquee select notes.
  Drag from selected note: move all selected notes together.
  Ctrl+A / Ctrl+C / Ctrl+X / Ctrl+V / Ctrl+D / Delete as above.
  Ctrl+click an EMPTY cell to set the paste destination before Ctrl+V.
  Piano Roll intentionally refuses paste/move overlaps or out-of-range
  moves to avoid silently deleting an existing note.

SP-1200 TIMING:
  24 ticks per quarter note is the authoritative grid.
  Time Correct input subdivisions: Off=1 tick, 1/4=24, 1/4T=16,
  1/8=12, 1/8T=8, 1/16=6, 1/16T=4, 1/32=3, 1/32T=2.
  Changing Time Correct rebuilds visible *input positions*, not stored
  note times; exact existing off-grid triplet and import ticks remain.
  Selecting and moving notes is deliberate editing. Stored times do NOT
  auto-requantize on Time Correct changes.
  Imported Rossum events remain native until explicitly edited; edits
  seed the full native segment into tick-exact editable events so unrelated
  events are not dropped by a partial selection, copy, or move.

SCOPE / LIMITATIONS:
  Selections are session-only (not stored in .p12); switching pattern,
  track, bank, or project clears the main sequencer selection.
  Ctrl+C/V is an internal editor clipboard, not an operating-system WAV
  or text clipboard. The Piano Roll stores 16 steps of MIDI arrangement.
  Mixer 32 was deliberately NOT changed (separate GO pending).
  Hardware .sp12 samples/codec and native VST audio path were not changed.
  Browser in-memory mouse tests, JS syntax, native sampler tests, export
  logic unit checks, and ZIP integrity were checked in Linux; native JUCE
  host with Windows VST3s and actual Rossum SP-1200 are NOT tested here.
