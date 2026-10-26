P-12 Windows native scheduling + branding repair

- Restores original supplied maskable P-12 icon as build/icon.ico and build/icon.png.
- Includes icon in Electron installer and unpacked app.
- Native-only lookahead extends to 400 ms; WebAudio remains 120 ms.
- Scheduler checks at 15 ms rather than 25 ms.
- Step display only changes previous/new playhead cells, not all cells.
- Native diagnostics now expose buffer size, sample rate and JS scheduler lateness.

LIMITATIONS: This is a timing mitigation, not a native replacement for the JavaScript sequencer. Ozone/host Windows playback unverified. Switching patterns is scheduled ahead and may update the display slightly early. Save your project and keep a known-good copy before testing.
