---
name: Brand-strike double-sound — backward TQ state guard
description: spellbound.wav plays twice when TQ polling delivers a newer state (cards burned) before processUpdate drains older queue entries (cards still marked), causing a false-positive marker re-detection.
---

## The bug

The animation-detection `useEffect([state])` at the top of `game.tsx` uses `prevStateForAnimRef` to diff consecutive states and detect newly-marked market cards (brand strikes). When TQ polling delivers a **newer** state snapshot (e.g. v145, where condemned cards are already burned and `marketMarkers = {}`) before the queue drain has processed older WS entries (e.g. v141, `marketMarkers = { cardA, cardB }`), the following sequence occurs:

1. WS busy path delivers v141 → `setQueryData(v141)` eagerly. Effect fires: prev=v140 (no markers) → v141 (has M1) → **deferred push** to `deferredBrandStrikesRef`. `prevStateForAnimRef = v141`.
2. TQ polls, delivers v145 (cards burned, markers gone) → Effect fires: prev=v141 (M1) → v145 ({}) → `newlyMarked=[]`, nothing pushed. `prevStateForAnimRef = v145`.
3. Queue drain runs `processUpdate(v141)` → `setQueryData(v141)` → state goes **backwards** to v141. Effect fires: prev=v145 ({}) → v141 ({cardA, cardB}) → M1 "detected again" → **second deferred push**.
4. `resolveArrival` drains `deferredBrandStrikesRef` = [M1, M1] → `fireStrikeSet` calls `playBrandStrike()` twice → double sound.

## The fix

At the very top of the animation-detection `useEffect([state])` (before advancing `prevStateForAnimRef`), skip if state.version is strictly less than the already-seen version:

```typescript
if (prev) {
  // eslint-disable-next-line no-restricted-syntax -- TQ-widened type
  const stateVerRaw = (state as unknown as { version?: number }).version;
  // eslint-disable-next-line no-restricted-syntax -- TQ-widened type
  const prevVerRaw = (prev as unknown as { version?: number }).version;
  if (typeof stateVerRaw === 'number' && typeof prevVerRaw === 'number' && stateVerRaw < prevVerRaw) {
    return; // backward transition — skip, do NOT advance prevStateForAnimRef
  }
}
```

Do NOT advance `prevStateForAnimRef` on the skip, so when processUpdate eventually drains up to v145 and `setQueryData(v145)` fires, the diff from the already-seen v145 is correctly empty.

**Why:** backward state transitions can ONLY happen when processUpdate drains older queue entries after TQ polling already advanced the cache. No legitimate animation should ever fire on a backward transition.

**How to apply:** This guard lives in the `useEffect` that uses `prevStateForAnimRef` (NOT in `processUpdateRef.current`, which uses `prevStateRef`). If the double-sound resurfaces, look for any path that calls `setQueryData` with a version older than `prevStateForAnimRef.current.version`.
