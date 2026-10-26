# P-12 FULL15 — sequencer stall + Mixer-32 second-window fix

Changes:
- Mixer-32 restored as a real second resizable window (1800x1000 default).
- Prevent accidental submit/navigation/reload from Mixer controls.
- Mixer remains one authoritative live DOM/state owner; closing window restores it safely.
- Recovery/autosave serialization is deferred while sequencer/count-in is active.
- Edit recovery debounce increased and periodic recovery reduced to idle-only 180s.
- Deferred recovery writes once transport is stopped.
- Native schedule-ahead increased to 950ms with a loop-aware cap.
- JS scheduler late counters reset per transport generation.
- Rossum SP12/S12 export encoder unchanged.

Rationale:
Diagnostics showed native callback/VST DSP under 1ms but renderer stalls up to 742ms and lateNativeEvents climbing rapidly. The problem is renderer scheduling, not VST processing.
