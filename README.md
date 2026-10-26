# P12 Retro

## GitLab builds

This repository supports GitLab CI/CD. Open **Build → Pipelines** for tests, Android APKs and Windows installers. The macOS installer job is available but disabled until a Mac runner is accessible. Version tags publish the enabled builds to GitLab Releases. See [GitLab setup, signing and downloads](docs/GITLAB_CI.md).

The GitHub Actions instructions below apply when this source is hosted on GitHub.

P12 Retro is a hybrid. It takes the full **P-12** sampler/sequencer and packages it like a hardware-style plug-in: **VST3 + Standalone** (AU on macOS), with a Windows installer (.exe) and a macOS installer (.pkg).

| Part | Where | What it is |
|---|---|---|
| P-12 desktop app | `app/` | The complete P-12 FULL15: Electron UI (`P-12.html`), Mixer-32, Tune BF / Tune AT, CHORDS → pad render, FL/MPC-style playlist + piano roll, `.sp12`/HFE export, Rossum MIDI bridge, wireless MIDI. |
| Native engine | `app/native-host/` | JUCE engine: native sampler, mixer, built-in inserts, VST3 hosting. Builds `p12-vst-host.exe` for the desktop app. |
| **Plug-in** | `plugin/` | **P12 Retro VST3/Standalone.** The same `P-12.html` runs in a WebView and the same native engine renders audio into your DAW. |
| SP fader panel | `app/p12-sp-mixer.js` | Hardware-style 8-fader panel with **Mix / Pan / Tune AT / Tune BF** modes and Bank A–D. It drives the same per-pad state as Mixer-32. Open it with **SP FADERS** in the bottom dock. |
| **KNOCK engine** | `app/native-host/src/P12NativeSampler.h` | New SP-1200-style playback mode next to CLASSIC. Samples are held at the 26.04 kHz clock with no interpolation, there's a DRIVE input clipper and 12-bit truncation, and an output stage per SP OUT: 1–2 four-pole (smoothest), 3–6 two-pole, 7–8 raw. Choose CLASSIC / KNOCK and set DRIVE in the SP FADERS panel. It is playback only; `.sp12`/HFE export is untouched. |
| **Wave Editor** | `app/p12-wave-editor.js` | Sample-accurate start/end on the sound that actually plays (reverse/warp aware), zoom/scroll, zero-crossing snap, audition, NORMALIZE / FADE IN / FADE OUT / CROP / REVERSE with UNDO. Open it with **WAVE EDIT** in the dock or **WAVE** in SP FADERS. |
| **Multi-Pitch** | SP FADERS → MULTI | SP-1200-style: copies the selected pad (trim + reverse) to all 8 pads of the bank, each tuned to a step of MAJOR / MINOR / CHROMATIC / OCTAVES. The LCD shows the fader staircase. |
| **Library** | `app/p12-library.js` | Sample browser sidebar (**LIBRARY** in the dock): add folders, search, ★ favourites, folder filter, click to preview (AUTO ▶), then double-click, **LOAD → PAD** or drag onto a pad. The target pad follows the pad you touch. In the desktop app and on Windows the folders are remembered; in browsers without folder access you pick a folder for that session; on Android use **ADD FILES**. |
| Installers | `installer/` | `P12Retro.iss` (Windows `.exe`) and `mac/` (macOS `.pkg`) |

## Build the Windows installer

The easiest route is to push to GitHub: **Actions → Build P12 Retro** produces `p12-retro-<version>-setup.exe`. Pushing a tag such as `v1.0.0` also attaches it to a GitHub Release.

To build locally on Windows (needs Visual Studio 2022 C++, CMake 3.24+, Git, Node.js 20+ and Inno Setup 6), double-click `BUILD_P12_RETRO_WINDOWS.cmd`. The result lands in `installer\Output\`.

The installer offers three components:
- **VST3** → `C:\Program Files\Common Files\VST3\P12 Retro.vst3`
- **Standalone** → `C:\Program Files\P12 Retro\P12 Retro.exe`
- **P-12 Desktop** → `C:\Program Files\P12 Retro\Desktop\` (Electron app + native host)

If the Microsoft Edge WebView2 Runtime is missing, the installer installs it too.

## macOS

GitHub Actions builds `P12-Retro-<version>-mac.pkg` for Apple Silicon Macs. It installs:
- **VST3** → `/Library/Audio/Plug-Ins/VST3`
- **AU** (for Logic and GarageBand) → `/Library/Audio/Plug-Ins/Components`
- **Standalone** → `/Applications/P12 Retro.app`
- **P-12 Desktop** → `/Applications/P-12 Desktop.app`. This is your Mac Silicon P-12 (detached windows, arm64 native VST3 host) merged into the shared `app/`. Its build runs the native tests and a real VST3 load test.

To build locally, run `scripts/build-mac.sh 1.0.0` (needs Xcode tools and CMake).

The package is unsigned until you add `MAC_APP_SIGN_ID` / `MAC_INSTALLER_SIGN_ID` repo secrets (an Apple Developer ID). Until then, right-click → Open the installer the first time.

## Android

`android/` is your P-12 Android 1.0.9 app (phone layout, Web Audio engine) with the P12 Retro additions:
- **SP FADERS** panel (Mix / Pan / Tune AT / Tune BF). On the phone it sits with the VST HOST / CHORDS / SYSTEM buttons in settings.
- **KNOCK** in a Web Audio version: drive, 12-bit truncation, 26.04 kHz hold with no anti-alias filter, and SP OUT filters.

After editing the web features in `app/`, run `python3 scripts/sync-android-web.py`. Every change to `P-12.html` is recorded in `ANDROID_SOURCE_PATCHES.json`, and `tests/full15-integrity.cjs` verifies it.

GitHub Actions builds the APK. Android can't load VST3s, so there's no VST hosting on Android.

**Signing:** the original 1.0.9 key is missing (see `android/READ-ME-SIGNING-KEY-MISSING.txt`), so builds can't update an installed 1.0.9 in place. Export your Project.p12 files, uninstall 1.0.9, then install the new APK. To make every future build update cleanly, create one permanent keystore once and add it as repo secrets:
`P12_KEYSTORE_BASE64`, `P12_KEYSTORE_PASSWORD`, `P12_KEY_ALIAS`, `P12_KEY_PASSWORD`.

## How the plug-in behaves in a DAW

- **Audio** goes through the native engine on the plug-in's output. The Native Audio backend switches on automatically.
- **DAW MIDI** appears in P-12 as the MIDI input **"P12 Retro (DAW)"**, so the SP-1200 note layout, the piano roll and CHORDS all respond to your MPC/DAW notes. Turn MIDI on in P-12 once.
- **DAW SYNC** chip in the bottom dock: when it's on, host Play starts P-12 from step 1 at the host tempo, and host Stop stops it.
- **Saving:** the P-12 session (samples, patterns, mixer, Tune BF/AT) is stored inside the DAW project. It's restored when the project or the plug-in window reopens, using P-12's own *RECOVER AUTOSAVE*. Edits are captured a few seconds after you stop editing.
- **Playlist, piano roll and Mixer-32** open inside the plug-in window. Detached windows and wireless MIDI are desktop-app features.

### Known limits (beta)

- Render in **real time**. The engine schedules against the wall clock, so offline / faster-than-real-time bounce will drift.
- Anything P-12 still plays through Web Audio does not reach the DAW track. That covers the CHORDS sample voice, some browser-only effects and previews (see `docs/notes/README_NATIVE_ENGINE_BETA.txt`). Pads, Mixer-32 routing and hosted VST3 inserts/instruments go through the engine.
- The Windows plug-in has not been run on real hardware yet. Please test in your DAW and send `%APPDATA%\P12 Retro\P12_RETRO_DIAGNOSTICS.log` if anything misbehaves.

## Tests

```bash
cd app && node tests-full15-integrated.cjs && node tests-rossum-encoder-unchanged.cjs
```

The Rossum hash test guarantees the Tune BF / Tune AT and `.sp12` export code is byte-identical to FULL15.

Five tests were already failing in the FULL15 zip. Four of them need files from another machine or a local Chromium (`tests-hfe-import`, `tests-hfe-workflow-browser`, `tests-mixer-scroll-browser`, `tests-sp-character-export-isolation`). The fifth, `tests-mixer-audio-handoff-source`, has an outdated check.

Change history for every FULL build is in `docs/notes/`.
