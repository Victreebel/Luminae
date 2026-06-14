---
name: Brand strike drain-queue gate
description: fireBrandStrikes never sets animationEndTimeRef; must extend drain gate explicitly for Phase 2 (activation + strikes).
---

**Rule:** `fireBrandStrikes` never sets `animationEndTimeRef`. Brand strikes are therefore invisible to the `remaining > 50` branch of `drainQueueFnRef` unless `setAnimEndTime` is called explicitly *before* the first fire.

**Why (root bugs):**
1. The activation `onComplete` had `activationQueue.length === 1` guard. If the AI's `start_of_turn` burn event arrived *during* the summon cinematic, the queue had length ≥ 2 when `onComplete` fired — guard failed, `fire` never called, strikes never showed.
2. `setAnimEndTime` was called inside `fireStrikeSet` (inside `setTimeout(fire, 400)`). In the 0–400ms settle window, the drain queue could open and flush condemned-card state, burning cards before beams landed.
3. **Camera race:** `viewOrchestrator.restore()` in `onComplete` starts a smooth scroll (~1500 ms back). 400 ms later `fire()` → `viewOrchestrator.prepare()` → `fireBrandStrikes()` captures card rects via `getBoundingClientRect()` while the board is mid-smooth-scroll. Rects are from the wrong viewport position; beams land in empty space or `r.width === 0` (no beams).

**How to apply — canonical pattern for deferred post-activation strikes:**

1. **Phase 2 (resolveArrival):** Pre-compute `totalStrikesMs` using the same formula as the stagger loop. Store in `postActivationStrikesTotalMsRef.current`. Set `postActivationStrikesFirerRef.current = () => fireStrikeSet(strikes)`.

2. **`onComplete`:** Check only `postActivationStrikesFirerRef.current !== null` (no queue-length check). Call `setAnimEndTime(settleMs + totalMs)` SYNCHRONOUSLY before `setTimeout(fire, settleMs)`. Clear both refs. This extends `animationEndTimeRef` before the settle window starts. Call `viewOrchestrator.restore({ immediate: skipped || !!postActivationStrikesFirerRef.current })` — the `|| !!ref` part makes the restore INSTANT when strikes are pending so there is no in-progress scroll when `prepare()` captures rects 400 ms later.

3. **Drain gate:** `arrivalActive = arrivalQueue.length > 0 || activationQueue.length > 0`. No `postActivationStrikesFirerRef` in the gate — `animationEndTimeRef` (set in onComplete) covers the strike window via `remaining > 50`.

4. **`fireStrikeSet`:** Still calls `setAnimEndTime(totalMs)` internally as a refining call (exact duration once strikes actually start). This is secondary to the onComplete call.

The chain: `arrivalQueue` → `activationQueue` → `animationEndTimeRef` (set synchronously, covers settle + strikes).
