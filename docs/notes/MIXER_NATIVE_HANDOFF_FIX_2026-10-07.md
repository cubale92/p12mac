# Mixer-32 + Native Audio handoff fix — 2026-10-07

Based on the Windows logs and the 1920x1080 Mixer-32 screenshot.

## Mixer-32
- Removed the old 1500px width cap: Mixer-32 now opens at 98vw and 95vh.
- Mixer panel can be resized within the main P-12 window.
- Pad/Track/Master channel strips widened from 138px to 178px.
- Insert dropdowns/actions enlarged for readable VST/effect names and easier mouse/touch use.
- Existing internal XY scrolling and 60–250% zoom remain.
- Main application window restore is clamped to a connected display/work area.

## Native Audio ON/OFF
- Backend switching is now an explicit transport boundary.
- If playback is running, P-12 stops one authoritative transport, clears voices/MIDI, switches backend, then restarts from step 1 with no count-in.
- Native Transport is stopped/reset and All Notes Off is sent before disabling native mode.
- Native sampler stop requests are serviced by the audio callback even while native rendering is OFF, so queued future events and voices cannot survive an ON/OFF handoff.
- Native sampler late/rejected diagnostics reset for each new native session.

## Release gate
- Electron smoke marker lookup corrected from LOCALAPPDATA to APPDATA/Roaming, matching Electron userData.
- Added source guard `tests-mixer-audio-handoff-source.cjs`.

## Explicitly unchanged
- Rossum `.sp12/.s12` Extract/export path.
- deterministic mono -> Blackman/sinc 26,040 Hz -> DC removal -> true 12-bit encoder.
- eSPi-style playback character remains playback-only.
