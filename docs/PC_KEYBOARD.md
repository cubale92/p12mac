# PC keyboard in Windows VST instrument windows

The focused instrument uses FL Studio's standard Layout Piano mapping, checked
against the installed FL Studio 2026 System/Config/Typing to piano/Layout Piano.scr.
Physical key positions are used so QWERTZ/AZERTY layouts retain the piano shape.

- Lower white keys: Z X C V B N M , . / (MIDI 48 through 64).
- Lower black keys: S D G H J L ;.
- Upper white keys: Q W E R T Y U I O P [ ] (MIDI 60 through 79).
- Upper black keys: 2 3 5 6 7 9 0 =.
- Ctrl+T toggles piano/text mode in the focused instrument window.
- Alt+numeric-keypad 2 through 6 selects the base octave; default 4.

This is FL's standard piano layout, not its optional scales/chord layouts.
Keys marked FREE/LOCK in FL's layout do not emit notes. P12 does not reproduce
FL Studio's transport/window commands. Click back into P12 for its unchanged
Q/W/E/R bank and 1-8 pad shortcuts. Notes release on focus loss and window close.

Standard Windows edit fields and JUCE text editors suspend musical typing.
For custom vendor search widgets, use Ctrl+T for text entry. Effects do not
receive musical typing. MIDI-controller input is unchanged.

Tests cover all 37 mapped positions, chords, repeat suppression, focus/mode
release, octave changes while holding a note, and overlapping duplicate pitches.
