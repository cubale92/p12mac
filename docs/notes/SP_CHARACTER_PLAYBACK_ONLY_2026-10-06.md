# P-12 playback-only SP/eSPi-style character DSP

This change is intentionally split into two independent signal paths.

## Native P-12 playback (changed)

CLASSIC pad playback in the JUCE native sampler now uses an independently implemented SP-inspired character path:

- virtual variable-rate SP DAC clock based on 26,040 Hz
- pitch-dependent sample clock / alias behaviour
- 12-bit monitor quantisation
- zero-order hold between virtual DAC updates
- two-pole reconstruction smoothing around the SP audible band
- mild level-dependent deterministic saturation
- no injected random hiss/noise
- stereo routing, pad -> track -> master, VST3 inserts, timing and choke behaviour preserved

HI-FI pad mode retains the existing clean cubic native resampler.

This DSP is applied only while P-12 is playing samples through the native audio engine. It never rewrites the stored source sample.

## Rossum `.sp12/.s12` Extract/export (NOT changed)

The proven Rossum-safe export source is byte-for-byte unchanged from the prior playable FULL15 baseline.

Protected source suffix SHA-256 (starting at `const SP12_SAMPLE_RATE = 26040;`):

`cedfe2d3d96ab14e65f9203a0ae677bf635edc29023cea1f41ef7711a8518ed5`

The export remains the existing deterministic path, including explicit mono handling, deterministic Blackman/sinc resampling at 26,040 Hz, tiny DC removal, and true 12-bit Rossum packing. The playback character flag is not referenced by the export section.

No WebAudio resampler was introduced into the final SP-1200 conversion.

## Regression gates

- `p12-native-tests`
- `p12-scheduled-tests`
- `p12-sp-character-tests`
- `tests-sp-character-export-isolation.cjs`
- existing FULL15 integrated/source/workflow/diagnostics tests

The Windows host builder now runs the new SP-character native regression before replacing the existing host executable.
