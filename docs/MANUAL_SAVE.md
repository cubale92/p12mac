# Manual saving and live-input stalls

Automatic recovery snapshots are disabled in the desktop, standalone and VST3 editions. Pad clicks, edits, transport stops and the former four-second plugin timer no longer serialize recovery snapshots. Existing recovery files are preserved and can still be loaded explicitly.

Use P12's Save Project command to save a `.p12` project, including samples and captured VST states. The DAW's saved plugin state no longer receives periodic recovery snapshots; save the P12 project explicitly before closing it.

The UI event-loop meter keeps its actual lifetime peak. New stalls of 100 ms or more produce `UI event-loop-stall` diagnostics containing delay, peak and window visibility context. Background scheduling delays are recorded rather than hidden or presented as audio underruns.

Removing automatic snapshots eliminates that source of main-thread serialization. It does not prove that every stall has been eliminated: exports, manual saves and other operations can still take time. Live pad responsiveness must be verified in the installed build using the affected project.
