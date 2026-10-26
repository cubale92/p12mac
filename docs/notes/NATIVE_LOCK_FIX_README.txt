P-12 native callback lock-miss repair (experimental)

When the native audio callback cannot acquire the plugin graph lock, it now renders active sampler voices through a dry fallback for that buffer rather than outputting silence and dropping the note timing. Plugin processing is temporarily bypassed only for that buffer. A dryFallbackBlocks counter is added to nativeStatus, and the existing lock miss counter remains. The 250 ms editor refocus no longer holds the DSP graph lock during window operations.

Trade-off: during any lock miss, the pad/track/master VST3 effects are bypassed. This can still cause an audible change, especially with lookahead/long-tail processing. A fully lock-free immutable DSP graph and plugin latency compensation remain necessary for true DAW-quality continuity.

Diagnostics: monitor changes in audioLockMisses, dryFallbackBlocks, slowCallbacks and worstCallbackMs over 60 seconds of steady playback without opening plugin windows. At 48kHz a 512-frame budget is 10.67ms; at 256 frames it is 5.33ms. Peaks near/above the buffer budget require larger buffers or plugin DSP optimization.

Not validated with live Windows/Ozone hardware. Keep your working installation as a backup.
