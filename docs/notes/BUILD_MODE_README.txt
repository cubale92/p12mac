P-12 NATIVE VST HOST BUILD MODES
================================

Recommended right now:
  Double-click BUILD_P12_VST3_ONLY.cmd

This rebuilds the latest host with the GUI/audio/CHORDS fixes and does NOT
require a VST2 SDK.

Optional legacy VST2 support:
  Double-click BUILD_P12_VST2_VST3.cmd

That mode requires your own legally obtained legacy VST2 SDK with:
  pluginterfaces\vst2.x\aeffect.h

Interactive builder:
  BUILD_P12_VST_HOST.cmd

It asks:
  1 = VST3 only
  2 = VST2 + VST3

After SUCCESS, the executable is copied to:
  native\p12-vst-host.exe

Then run:
  npm start

In P-12:
  SYSTEM -> REFRESH OUTPUTS -> choose output -> USE OUTPUT
  SYSTEM -> TEST NATIVE AUDIO

Then test a VST3 instrument in CHORDS:
  CHORDS -> CHORDS VST -> Slot 1 -> ADD / CHANGE VST -> LOAD / OPEN
