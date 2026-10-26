# FULL15 reliability continuation (source-level candidate)

Preserves the FULL15 interface design, original JUCE/VST3 audio host, and SP-1200 audio/project codecs.

Changes since the Windows-confirmed FULL15 five-point source baseline:

- MIDI CC64 sustain-state cleanup and stuck-note recovery after MIDI panic/device disconnect
- Source-aware multi-MIDI-input note ownership: disconnecting one controller preserves another controller's notes
- Shared CC64 pedal ownership: a release from one controller does not cancel another controller's sustained notes
- LIVE CHORD display reflects pedal-held notes and clears when the final pedal is released/disconnected
- Main/detached Piano Roll REC+PLAY: selectable Follow main / Off / 1–4 bar count-in using the single authoritative transport
- Transport restart retires existing Piano Roll note scheduling and stops the previous native and MIDI transports
- Recording overdub preserves existing MIDI notes and merges same-note/same-tick repetitions to prevent duplicate triggering; clustered chord notes share one Undo action
- Project save uses a consistent MIDI/pattern snapshot before asynchronous VST-state collection
- Detached Piano Roll idle snapshot polling avoids redundant large JSON serialization while retaining direct edit updates
- Recording diagnostics now summarize MIDI notes, merged overdubs, automation events and elapsed time rather than logging every incoming note
- Loading a new `.p12` project disarms recording, cancels active count-ins, and clears stale notes/pedals before replacing the project
- Transport restarts stop the preceding native/MIDI transport generation to avoid overlaps during REC+PLAY count-ins
- Added regression checks for simultaneous MIDI inputs, sustain cleanup, recording undo grouping, count-in timing, and saving during playback
- When switching Piano Roll VST target/slot, active Note Off and CC64 sustain-off messages go to the **previous** VST instead of leaving stuck voices in it; scheduled piano note playback is safely retired without resetting the main sequencer.
- Fixed a cross-IIFE diagnostics scoping bug: the main FULL15 renderer now safely defines its own bridge for project/recording/route logs instead of referring to the SYSTEM diagnostics' private variable.

Verification performed here:
- `node tests-full15-integrated.cjs`
- `node tests-piano-recording-edge.cjs`
- `node tests-midi-input-recovery.cjs`
- `node tests-save-playback-snapshot.cjs`
- `node tests-piano-countin-source.cjs`
- `python tests-route-change-browser.py`
- `python tests-multi-input-browser.py`
- `python tests-detached-countin-browser.py`
- `python tests-midi-recovery-browser.py` (confirmed in one run; Chromium tests can be slow/intermittent)
- `python tests-detached-countin-browser.py`
- `python tests-route-change-browser.py`
- `python tests-multi-input-browser.py`

The approved native-host and Electron bootstrap/package files are unchanged from the preceding five-point archive (byte-for-byte checks). No Windows runtime compilation or physical Rossum test was performed for this source iteration. Treat this as a test candidate, not a validated release.

Additional targeted browser regression: `tests-route-change-browser.py` verifies switching the VST target and slot releases held notes and CC64 to the previous VST, and recording start/stop diagnostics produce no renderer scope errors.
