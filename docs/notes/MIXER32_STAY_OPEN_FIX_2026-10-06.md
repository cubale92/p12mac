# Mixer-32 stay-open fix

Fixed the Mixer-32 interaction regression where touching/clicking/dragging inside the mixer could make it disappear and return to the main P-12 view.

Changes:
- Mixer-32 now stays in the authoritative main P-12 renderer by default.
- It no longer auto-detaches into a child Electron window when opened.
- Added an explicit DETACH button for users who intentionally want a separate Mixer-32 window.
- Clicking/touching the backdrop no longer closes Mixer-32.
- Only the Close button or Escape dismisses Mixer-32.
- Internal pad/subchannel/track scrolling and 60–250% mixer zoom are preserved.
- Touch scrolling is enabled on each mixer row.

Regression test:
- tests-mixer-stays-open-browser.py opens Mixer-32 and verifies click, pointer drag, wheel/scroll and backdrop interaction all keep the mixer open; explicit Close still works.

No native-host DSP, VST3 host, Rossum codec, sample conversion or approved sound-engine source was changed by this fix.

Final playable hardening: Mixer-32 detach/popout code was removed completely. The mixer is inline-only to eliminate the child-window lifecycle that could hide it during interaction.
