P-12 WINDOWS — NINE-POINT PIANO ROLL / KORDBOT / NATIVE AUDIO BETA
2026-10-05 — complete source package (NOT a prebuilt Windows .exe)

BUILD: run BUILD_P12_WINDOWS_EXE.cmd on Windows. The known Electron Builder
EBUSY resource fallback is retained. JUCE Windows host must be compiled in
its normal supported environment before native VSTs can function.

PIANO ROLL: Open PIANO ROLL from the main page. Select a native VST instrument
as target, and the MIDI device Kordbot should be connected. Choose a SP-1200
24-PPQN Time Correct division in the editor. MIDI REC is different from PAD
RECORD and WAV RECORD. Press REC MIDI, press PLAY, then play the Kordbot.
Incoming note-on/note-off create/edit exact-tick MIDI note lengths and
velocities in the current P-12 sequence. Stop transport to end recording.
Changing TC affects NEW notes only. Notes are saved in .p12, not .sp12.

DETACH: click DETACH to move Piano Roll to a separate monitor. The detached
window is editor-only and the main Electron renderer keeps audio and MIDI
ownership. Closing it restores the main Piano Roll editor.

MOUSE: Ctrl-click toggle; Ctrl + left button hold + drag rectangle-select;
Shift-click range; drag selected notes to move; Ctrl+Alt-drag selected notes
to copy; Ctrl+A/C/X/V/D and Delete / Ctrl+Z/Y as available. Both grids support
selection/editing, preserving Rossum original 24-PPQN timing of unedited notes.

MIXER 32 MIDI IN: Per-pad MIDI IN OFF, 1-16, OMNI. New pads default OFF to
avoid external MIDI triggering. Set appropriate channel explicitly for sample
pads to respond. External Kordbot notes sent to the selected Piano Roll VST
do not automatically activate drum pads. The main global MIDI switch remains
separate; Kordbot instrument monitoring is enabled when Piano Roll is open,
detached or MIDI REC armed.

PLAYBACK: Piano Roll now follows the main sequence's actual position/length
instead of repeating each 16 steps. .sp12 hardware-note encoding and sample
conversion are not changed; editable VST MIDI notes are kept in .p12.

AUDIO DROPOUTS: This beta reduces unnecessary high-frequency native status
polling and repetitive host disk logging, and differentiates late sample
starts from late stops. These are targeted mitigations/diagnostics. They do
NOT establish that all 1-3-step dropouts are resolved. Record a fresh session
of P12_AUDIO_DEBUG.log on Windows after testing for confirmation. Do not
change authentic Rossum swing or globally quantize imported events.

TESTED IN LINUX: JS syntax and native sampler unit tests; package integrity.
NOT TESTED HERE: Windows Electron installer runtime, Windows JUCE/VST3 host
compilation, commercial VST3/Kordbot hardware, GUI mouse behavior on Windows,
actual driver dropout elimination, physical SP-1200 round-trip.
