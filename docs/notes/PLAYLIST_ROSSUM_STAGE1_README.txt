P-12 SONG / PLAYLIST — PHASE 1 (TEST BUILD) 2026-10-04
===================================================
Based on P-12 Windows Native Desktop Migration Stage 1.

USAGE:
- Click PLAYLIST — ARRANGEMENT in the top controls.
- Use SONG's existing +SEQ to add the selected sequencer pattern.
- Playlist and SONG both edit the same chain; drag clips to rearrange them.
- Set FROM BAR (1-based) and BARS (duration) to trim a clip in the song.
- SONG playback honours those clip start/end boundaries.
- P-12 project save/load stores the clip ranges alongside the song chain.

ROSSUM EXPORT:
- The existing Rossum 24-PPQN sequence/song encoding is retained.
- Unedited imported Rossum songs retain their original commands.
- Trimmed sequences are exported as real additional Rossum segments, with
  events shifted accurately and a hardware-encoded trimmed segment duration.
- The 100-segment limit and shared segment/song memory limits are enforced.
- If editing a song with special Rossum commands would lose those commands,
  .sp12 export is refused instead of silently replacing them.
- Trimming an untouched imported Rossum pattern containing new micro-event
  overdubs is blocked until the exact merge semantics are verified.
- No changes to sample audio conversion, BF/AT handling, or native audio engine.

VERIFIED IN THIS ENVIRONMENT:
- JAVASCRIPT: all embedded scripts and Electron main.js pass node --check.
- NATIVE: sampler and scheduled retrigger unit tests pass on Linux.
- ROSSUM: JACKIE2.sp12 and JACKIELPF(2).sp12 native segments decode; trimmed
  segment round-trip has exact event ticks and preserves packed sample bytes.
- Editable P-12 grid's A-bank kick/snare remain correctly assigned after trim.
- Archive integrity check passes.

NOT YET COMPLETE:
- Track-only and individual pad-loop clips with hardware-equivalent conversion.
- Dedicated detached Mixer 32 window for a second monitor and GUI redesign.
- VST instrument piano roll, chord preview, and render-to-hardware-pad workflow.
- Full Windows Electron, JUCE/VST runtime and physical Rossum device validation.
- macOS Apple Silicon package.

BACKUP your current working version. This is a source TEST BUILD and does not
claim that the new arrangement workflow has been validated on physical hardware.
Build Windows EXE using BUILD_P12_WINDOWS_EXE.cmd in a fresh folder.
