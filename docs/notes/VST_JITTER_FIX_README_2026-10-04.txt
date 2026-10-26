P-12 VST timing patch (experimental)

- PCM responses are assigned to their originating blocks; late replies are discarded instead of producing delayed playback.
- Outputs use a fixed two-block latency with matched dry fallback on underruns (not phase-aligned with plugin-internal lookahead).
- Per-block host request disk logging removed.
- VST PCM HEALTH telemetry logs misses, processed blocks and worst IPC round-trip once per 15 seconds.

IMPORTANT: The ScriptProcessor -> renderer -> Electron IPC -> JUCE route is not true realtime. This patch is a mitigation, not a full low-latency audio engine. At 48 kHz, 2 x 2048 frames = about 85ms fixed bridge latency, plus plugin latency. Real production quality needs native real-time streaming, explicit plugin latency compensation and AudioWorklet. Native build and Ozone listening tests have NOT been run in this environment.

Close P-12 and rebuild via BUILD_P12_WINDOWS_EXE.cmd, then observe VST PCM HEALTH and SYSTEM jitter.
