---
name: Start-of-turn burn payload snapshot
description: When a start-of-turn effect clears server state (marketMarkers) before broadcasting, the client animation has no targets unless the engine snapshots the IDs and includes them in the activation event.
---

## Rule
Any `applyStartOfTurnEffects` (or equivalent) that burns/clears markers must capture the target card IDs **before** the burn loop runs and pass them into `pushActivationEvent` as `targetCardIds`.

**Why:** `burnCard` removes the entry from `marketMarkers` synchronously. By the time the WS broadcast arrives at the client, `state.marketMarkers` is already empty for those cards, so `resolveEmber` (or any analogous resolver) finds nothing to animate.

**How to apply:**
1. Before the burn loop: `const targetIds = Object.keys(state.marketMarkers).filter(id => ...condition...);`
2. After the loop: `pushActivationEvent(state, lumId, effectType, targetIds);`
3. In the event interface: `targetCardIds?: string[]`
4. In the client resolver: use `payloadIds ?? markedIds` — fall back to live markers only for dev-test paths where state hasn't been mutated yet.
