---
name: Brand strike drain-queue gate
description: fireBrandStrikes never sets animationEndTimeRef; must extend drain gate explicitly for Phase 2 (activation + strikes).
---

**Rule:** `fireBrandStrikes` never sets `animationEndTimeRef`. Brand strikes are therefore invisible to the `remaining > 50` branch of `drainQueueFnRef` unless `setAnimEndTime` is called explicitly before firing them.

**Why:** The drain queue's only arrival-phase gate was `arrivalActive = arrivalQueue.length > 0`. That drops to 0 as soon as the server acknowledges `resolve_summon` — which happens before Phase 2 animations (activation cinematic + brand strikes) have even started. New turn state was flooding the board while beams were mid-flight.

**How to apply:** Any animation sequence that fires _after_ the arrival queue clears must do two things:

1. **Extend the `arrivalActive` check** in `drainQueueFnRef.current` to cover the new phases. Current guard:
   ```typescript
   const arrivalActive =
     arrivalQueue.length > 0 ||          // arrival cutscene
     activationQueue.length > 0 ||       // activation cinematic
     postActivationStrikesFirerRef.current !== null; // strikes pending
   ```

2. **Call `setAnimEndTime(totalMs)` at the start of `fireStrikeSet`** (pre-computed from the same cycle-duration formula used to stagger timeouts) so the `remaining > 50` gate covers the period after the firer ref is cleared but before the last beam/aura finishes.

The three gates chain serially: `arrivalQueue` → `activationQueue` → `postActivationStrikesFirerRef` → `animationEndTimeRef`. All four must be clear before any new state lands.
