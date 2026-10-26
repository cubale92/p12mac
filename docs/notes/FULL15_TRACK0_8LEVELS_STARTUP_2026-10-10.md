P-12 FULL15 — Track 0 / independent 8 Levels / startup diagnostics

BUILD: extract into a fresh folder and run BUILD_FULL15_ORIGINAL_GUI.cmd.
Rebuild both the JUCE host and Electron; the new Track 0 bus requires this native
host version. The builder now keeps the console open after early errors and
writes P12_FULL15_BUILD.log. This complete source/build ZIP contains no prebuilt
Windows application.

Track 0 is a new mixer/native bus (internal bus 8). Existing Tracks 1–8 retain
internal buses 0–7. The sequencer remains eight tracks. Existing project arrays
remain length eight and the added bus saves separately as vstTrack0.
- Its strip appears before Track 1, with four inserts and its own level/pan/mute.
- Choose TRACK 0 · VST in a pad's SUB ROUTE selector for a direct route.
- Choose Track 0 as a subchannel's To track destination.
- Piano Roll VST Target includes Mixer Track 0 · VST, slots 1–4.
- Track 0 VST assignments/plugin state and pad/sub routing save in Project.p12.
- Native bus level/pan/mute work after the VST chain, including VST instruments.
- Solo on Track 0 is explicit; its default does not mute any beat bus.

8 Levels:
- +VEL changes only velocity mapping; +FILTER changes only filter mapping;
  +TUNE changes only pitch mapping. No button automatically changes another flag.
- Each button applies immediately to an active group and can be turned off
  independently. Multiple mappings combine only when you explicitly enable them.
- Turning a parameter off restores its pre-distribution value where the original
  snapshot is available. Turning 8 LEVELS off restores the existing bank snapshots.
- All buttons' flags save separately in Project.p12.
- Native gain/pan/filter/crush/reverb and now Tune sync as small deduplicated scalar
  snapshots. Tune changes held native samples without restarting transport.

Mixer scrolling and pinned Master retain the prior verified fix. The original
faceplate/artwork and encoder remain intact. Missing Windows icon files were
restored from the HTML's exact embedded original P-12 artwork.

If an app closes: run P12_DIAGNOSE_START.cmd and send P12_STARTUP_REPORT.zip.
If the builder fails: send P12_FULL15_BUILD.log.
FINAL_RELEASE_GATE.cmd deliberately closes its smoke-test window after 750ms;
START_P12.cmd launches the application normally. The reported immediate-close
cause remains unconfirmed without the Windows logs.

Validation:
- Real Chromium: main controls, separate Track 0 strip, pad/sub/Piano routing,
  unchanged beat arrays, Project.p12 round trip, independent 8 Levels buttons.
- Real Chromium: 1700x980 / 900x650 / 700x450, Master pinning, scroll bounds,
  both axes, wheel/Shift+wheel, zoom, navigation and snapshot preservation.
- FULL15 integrated preflight, transport/recovery tests, encoder checksum.
- Compiled native sampler/scheduled/sequence-clock/SP character tests, plus
  live pad controls, isolated additional Track 0 bus, held-sample Tune changes,
  filter/crusher/reverb and zero callback allocations.
- Windows JUCE/Electron build, Ozone runtime and Rossum hardware sound tests
  are not available in this Linux environment.

Rossum export: protected encoder source checksum remains unchanged. Mono
fold-down → deterministic Blackman/sinc 26,040 Hz → tiny DC removal → true 12-bit
quantization. These changes do not alter that encoder.
