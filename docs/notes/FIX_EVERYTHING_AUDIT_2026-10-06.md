# P-12 FULL15 consolidated fix/audit — 2026-10-06

This candidate is based on the playable inline-Mixer FULL15 + playback-only SP/eSPi-style native DSP.

Additional fixes in this consolidation:

- Standalone VST3 processing no longer drops shorter-than-configured Windows/ASIO/WASAPI callbacks. The real callback frame count is processed through a non-owning JUCE buffer view without reallocating on the audio thread.
- Oversized standalone VST callbacks are rejected safely and counted as `oversizePluginCallbacks` instead of failing silently.
- Mono standalone VST3 output is mirrored to both left/right output channels instead of sounding left-only.
- `oversizePluginCallbacks` is exposed by the native host, included in the central diagnostic log, and shown in the Native Audio health line.
- Playback-only SP character preserves the full allowed -5 octave clock range; the former 1 kHz minimum virtual clock could slightly detune the lowest extreme pitch.
- Added `tests-native-host-realtime-source.cjs`; the normal FULL15 integrated preflight now runs it, so these fixes are release-gated.

Unchanged intentionally:

- FULL15 visual design and inline stable Mixer-32 behavior.
- Approved native routing architecture and VST3 insert model.
- Rossum `.sp12/.s12` Extract/export source from `const SP12_SAMPLE_RATE = 26040;` onward.
- Export invariant remains mono fold-down -> deterministic Blackman/sinc 26,040 Hz -> tiny DC removal -> true 12-bit packing.
- No WebAudio resampler is used for final SP export.

Regression status in this environment:

- all bundled `tests-*.cjs`: PASS
- native sampler/routing test: PASS
- scheduled timing/choke test: PASS
- SP playback-character isolation test: PASS
- Mixer-32 stay-open Chromium interaction: PASS
- route-change Chromium test previously PASS on this source family; a final combined run hit the test-environment timeout after Mixer passed, not an assertion failure.
- Rossum export suffix hash guard: PASS (`cedfe2d3d96ab14e65f9203a0ae677bf635edc29023cea1f41ef7711a8518ed5`)

The Windows builder still must compile the updated C++ host on the user's Windows system before this exact binary can be considered Windows-runtime validated.
