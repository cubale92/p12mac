P-12 Playlist + VST Piano Roll STAGE 2 (Windows source package)

PLAYLIST / SONG
- Every Playlist clip has a SEQUENCE 01–100 selector. Selecting a different
  sequence resets that clip's previous trim range to prevent stale trims.
- SONG's + SEQ has an explicit ADD SEQUENCE selector (01–100).
- Playlist and SONG use the same state.chain; song and .sp12 serialization
  continue to use the existing Rossum exporter.
- No sample encoder, original Rossum event decoder, or native audio DSP was
  altered in this stage.

VST PIANO ROLL — FIRST WORKING EDITOR
- PIANO ROLL on the main toolbar opens a MIDI note grid (C3 through B4).
- Click cells to add/remove notes. Set note length in steps, select a root,
  choose major/minor/diminished/augmented/7th/9th chords and add chord.
- PREVIEW VST sends MIDI note on/off to a loaded standalone instrument VST
  host slot (choose VST HOST / CHORDS SLOT) or a loaded Mixer Track insert.
- MIDI note arrangement persists in the Project.p12 file.
- Render to Pad is intentionally DISABLED in this stage. The current native
  host has no tested VST instrument recording/render pipeline that produces
  an independent pad audio sample. Implementing a dummy render could silently
  break real SP-1200 exports, which is unacceptable. A VST chord is NOT yet
  exportable to Rossum through the Piano Roll.
- Full multi-bar MIDI clip timeline, MIDI note drag-resize, MIDI recording,
  and native instrument-output capture remain in development.

INSTALL
Extract this complete package to a FRESH directory.
Run BUILD_P12_WINDOWS_EXE.cmd. The existing EBUSY resource-edit fallback
is retained. Windows build/live VST audio has NOT been tested in this Linux
runtime; please test on the real Windows hardware.
