---
name: Opponent forge fallback — no FALLBACK_FLIP_ANIM_MS
description: The opponent card-purchase fallback path (deck/slot not in DOM) must not set FALLBACK_FLIP_ANIM_MS (5800 ms) — just reveal the slot.
---

## The rule
In `game.tsx`, inside the `!isLocalPurch` (opponent forge) branch, when
`deckR && slotR` are NOT found (DOM elements missing because player is on a
non-board tab), **do not call `setAnimEndTime(FALLBACK_FLIP_ANIM_MS)`**.

Instead, just `gameAudio.playCardDraw()` and `setHiddenSlots(new Set())`.

The initial forge lock set at the top of the opponent branch (3000 ms or
ABRIDGED_FORGE_LOCK_MS) already provides sufficient sequencing without the
5.8-second extension.

## Why
`FALLBACK_FLIP_ANIM_MS = 5800 ms` is for the **local player's** in-place
card-flip animation (their card flips face-up when the deal can't animate).
For opponents the player is not watching, a 5.8-second lock on the animation
queue is catastrophic — it blocks all subsequent AI state updates for that
duration. When the server AI delay is shorter than 5800 ms (it is), states
pile up and the queue is frozen.

## How to apply
- `FALLBACK_FLIP_ANIM_MS` is correct at lines 2045 and 2139 (local-player forge
  and local-player cipher/deck fallbacks). Do NOT change those.
- Only line ~1957 (opponent forge fallback) should be kept without the 5800 ms lock.
- If the opponent forge branch is restructured, verify the fallback path does not
  call `setAnimEndTime(FALLBACK_FLIP_ANIM_MS)`.
