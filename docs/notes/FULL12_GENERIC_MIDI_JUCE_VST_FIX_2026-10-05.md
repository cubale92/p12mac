# P-12 FULL12 Generic MIDI / JUCE-VST fix

This pass removes KordBot-specific assumptions from the Piano Roll instrument path. KordBot can still be used, but only as a normal MIDI controller.

Changes:
- Incoming MIDI channels are converted correctly from status-byte channels 0-15 to JUCE MIDI channels 1-16.
- Live external Note On/Off is forwarded to the selected VST even with transport stopped.
- CC, pitch bend, channel pressure, and polyphonic aftertouch are forwarded live to the selected VST.
- CC/pitch-bend/channel-pressure can be recorded into the existing Piano Roll automation data while MIDI recording + transport are active.
- JUCE native host now accepts polyphonic aftertouch (`polypressure`) in addition to note, CC, pitch bend, and channel pressure messages.
- KordBot-specific status/error wording was replaced by generic MIDI-controller wording.
- SP-1200 pad MIDI mapping remains separate and unchanged.

Runtime note: Windows JUCE/VST execution cannot be validated in this Linux build environment, so plugin-specific live behavior must still be tested on the target Windows system.
