P-12 Windows Native Timing / Ozone Investigation — 2026-10-04
==============================================================
SOURCE PACKAGE (not a precompiled Windows installer)

What was fixed:
- Native sample retriggers no longer stop the previous hit when a future note
  enters the event queue. Choking now occurs at the intended audio sample.
- Future pad stops (including linked-bank/Rossum output group chokes) now
  carry a scheduled offset, preventing 400 ms lookahead from pre-muting notes.
- Stop/retrigger offsets persist across audio blocks and are processed in order.
- Browser-to-native events include an absolute target time. The host converts
  them to block-relative frame offsets at the DEVICE audio callback, not at
  the earlier JavaScript send time, so IPC waiting does not add the old delay
  twice. Late events are counted rather than silently shifted into the future.
- Only voices on the current pad/track are scanned per audio frame.
- Variable-size device callbacks use exactly sized non-owning VST buffers,
  rather than bypassing the insert when numSamples differs from prepare size.
- Ozone/master VST processing duration is measured separately from the full
  callback; costly VST blocks and late native events are now visible.
- Fallback callbacks also count toward worst callback time/slow callback stats.
- Restores existing 400 ms lookahead, optimized playhead drawing, original
  P-12 icon, native engine and previous SP12 fixes from supplied ZIP.
- Both alternate HTML copies and ACTUAL Electron P-12.html were updated.

Compile: extract to a NEW directory, then BUILD_P12_WINDOWS_EXE.cmd.
Use the Windows installer in dist-installer only if the build succeeds.
The uncompiled portable source is NOT the installer .exe.

Test: first no VST, then Ozone on Master, NATIVE AUDIO enabled in both tests.
Play the same pattern for one minute. Read the native status text:
  lock misses / dry / slow callbacks / callback peak / buffer / JS late
  Ozone DSP peak / costly VST blocks / rejected voices / late native.
A DSP peak larger than the current device buffer budget (ms), or increasing
late native events, indicates further work. Keep a previous working build.

Known limits:
- VST3 real-time performance must be tested on Windows with actual Ozone.
- The event generator still uses JavaScript timing, although native callback
  placement now handles IPC delivery latency. Full native event generation
  and robust low-latency plugin isolation are future architectural work.
- Time-based editor stalls, plugin processing overruns, and audio driver
  issues cannot be resolved by rescheduling notes alone.
- No changes were made to SP-1200 conversion, HFE exports, or project files.
