# FULL13 – generic MIDI chord preview & CC direction

- Added `Invert incoming CC knobs` checkbox to MIDI settings (saved in localStorage, off by default). Incoming absolute CC data is inverted to 127−value when enabled; notes, pitch bend and pressure remain untouched. For relative encoders, reconfigure the device to absolute CC rather than use value inversion.
- Corrected live note visualization in the separate Piano Roll: channel-qualified held note keys are decoded to MIDI note numbers, and live notes include channel and velocity data.
- Displays all sounding MIDI note names / channel, plus common recognized chord names, while transport is stopped.
- When >=2 MIDI notes form a chord gesture, shows **Add chord / Discard** in the independent Piano Roll, without recording or starting Play. No changes are made on Discard. Click on the timeline ruler to set the insertion cursor; insertion records notes with their captured velocities, channels and approximate durations to the current pattern, applying normal Undo support.
- Maintains existing JUCE/VST host and native project/SP-1200 export paths unchanged.

## Caveats
- Real Windows controller/VST behavior not verified here. MIDI input requires Web MIDI permission and the enabled controller. The checkbox inverts **absolute** CC data; relative encoder protocols use different interpretation and must be configured accordingly.
- Capture is deliberate (release all keys to display prompt), with a short settle period. No capture while playing or recording. Chord recognition is descriptive; all actual MIDI notes remain intact.
