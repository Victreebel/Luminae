---
name: pendingLuminaryChoice turn suspension
description: How the interactive multi-Luminary claim gate interacts with advanceTurn and the action handler tail code.
---

## The Rule

When `pendingLuminaryChoice` is set by `checkLuminaries` (≥2 Luminaries qualify simultaneously at cascade depth 0), the turn must **not advance** until the player resolves the choice via `choose_luminary_order`.

## How to Apply

**Tail code guard (gameEngine.ts):**
```js
if (state.phase !== "finished" && !state.pendingLuminaryChoice) {
  advanceTurn(state);
}
// Same guard on the auto-exec planned-action block below
if (!_isAutoExec && state.phase !== "finished" && !state.pendingLuminaryChoice) { ... }
```

**choose_luminary_order handler:**
- Clears `state.pendingLuminaryChoice = null` before calling `applyLuminaryBatch`.
- Uses `break` (not `return { success: true }`) so execution falls through to the tail code.
- The tail code then stamps `lastAction`, bumps `version`, and calls `advanceTurn` (gate is already cleared).

**Why:**
If `choose_luminary_order` returned early it would bypass `advanceTurn`. If it stamped version manually and returned, the purchase action that triggered the pause would have already advanced the turn — leaving the resolving action in the wrong player slot. `break` + tail-code-guard is the only correct pattern.

## Test Implication

Cascade tests that use two Luminaries in `activeLuminaries` must ensure the trigger card does NOT grant a bonus that would push the player into qualifying both simultaneously at depth 0 (which would set `pendingLuminaryChoice` instead of auto-applying). Use a non-matching-bonus card as the trigger to keep the cascade on the depth-1 path.
