# KNOCK voiced against eSPi — A/B measurement (2026-10-23)

**Material:** `A2-Kick_1.wav` and `A4-Snare_1.wav`, both exported from eSPi at 26,041 Hz (16-bit stereo), plus a phone screen recording of eSPi playing them. eSPi was set to 12-bit and 26,041 Hz (SP-1200). The recording's AAC audio cuts off at about 12.7 kHz, so everything below was measured under 12 kHz.

## What eSPi does on playback
- Level: unity. The output peak equals the sample peak (kick 0.552 vs 0.557, snare 0.547 vs 0.565).
- Frequency response: flat within ±1 dB to 11.5 kHz.
- No clipping and no output filtering on these pads. The crest factor is unchanged.
- Reconstruction: smooth (cubic or band-limited). A hard sample-and-hold matched clearly worse (snare −18 dB vs −28 dB).
- 12-bit quantisation can't be measured through the recording, because it sits far below the AAC codec noise.

## P12 Retro, same two WAVs, residual vs eSPi (first 120 ms, under 12 kHz)
| Engine | Kick | Snare #3 | Snare #4 | Level vs eSPi |
|---|---|---|---|---|
| CLASSIC (old default) | −28.0 dB | −16.7 dB | −16.6 dB | −2.5 to −3.0 dB |
| KNOCK v1 (stair-step hold + filters) | −28 dB | −13 to −18 dB | | −2.9 dB |
| **KNOCK v2, DRIVE 0** | **−29.1 dB** | **−27.2 dB** | **−25.4 dB** | **+0.1 dB** |

An ideal band-limited resampler of the source also scores about −28 dB against the recording. That is the measurement floor set by the AAC codec, so below 12.7 kHz KNOCK v2 can't be told apart from eSPi in this test.

## Changes in KNOCK v2
- Cubic (Catmull-Rom) reconstruction from the 26.04 kHz SP clock, replacing the stair-step hold.
- Unity level at centre pan (linear law) instead of P-12's equal-power −3 dB.
- DRIVE defaults to 0 and is transparent there. The clipper knee only drops in as DRIVE goes up.
- The SP OUT channel filters are opt-in (the **FILTERS** button); eSPi doesn't apply them.
- Web Audio KNOCK follows the same recipe: 26.04 kHz storage band, 12-bit, unity, optional filters.

Scripts used: `docs/ab/` notes only. The analysis was done with NumPy/SciPy and `knockrender` (a P12NativeSampler harness).
