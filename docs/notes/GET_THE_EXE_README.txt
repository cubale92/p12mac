P-12: HOW TO GET native\p12-vst-host.exe
========================================

IMPORTANT: the EXE cannot exist until the C++ native host has been compiled for Windows.

FASTEST LOCAL WINDOWS METHOD
----------------------------
1. Extract this ZIP completely.
2. Right-click PowerShell -> Run as Administrator.
3. Run:
      Set-ExecutionPolicy -Scope Process Bypass
      .\INSTALL_BUILD_TOOLS.ps1
4. Close/reopen the terminal after installs complete (or reboot if requested).
5. Run:
      .\CHECK_BUILD_TOOLS.ps1
6. Double-click:
      BUILD_P12_VST_HOST.cmd
7. On success the file is created here:
      native\p12-vst-host.exe

CLOUD METHOD (NO LOCAL VISUAL STUDIO)
-------------------------------------
This package also contains:
  .github\workflows\build-p12-vst-host.yml

Put the extracted project in a GitHub repository, push it, open the Actions tab,
run "Build P-12 VST Host EXE", then download the artifact named:
  p12-vst-host-windows-x64

The artifact contains:
  p12-vst-host.exe

Copy it to:
  native\p12-vst-host.exe

WHAT THIS EXE CURRENTLY DOES
----------------------------
- Hosts VST3 instruments.
- Receives P-12 sequencer/CHORDS MIDI.
- Opens native plugin editor windows.
- Supports plugin state save/restore.
- Supports Mixer-32 keyed plugin instances.

VST2 is not included in the default binary because compiling VST2 requires a
legacy VST2 SDK that JUCE does not distribute.

Mixer-32 VST effect DSP on P-12 sampler audio still requires the PCM bridge
stage described in native-host\AUDIO-BRIDGE-NEXT.md.
