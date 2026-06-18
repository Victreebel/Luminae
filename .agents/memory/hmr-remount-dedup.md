---
name: HMR remount dedup — import.meta.hot.data
description: Vite Fast Refresh re-evaluates game.tsx on every HMR WS reconnect, resetting useRef dedup guards; fix with import.meta.hot.data.
---

## The rule
Any dedup Set that must survive Vite HMR hot-module-replacement should be seeded from `import.meta.hot.data` rather than `useRef(new Set())`.

**Why:** Vite React Fast Refresh re-evaluates the module source on every HMR cycle (triggered every ~25–30 s by the Replit proxy force-closing the HMR WebSocket). `useRef(new Set())` re-runs on mount, giving a fresh empty Set each time the component remounts after HMR. `import.meta.hot.data` is the one object Vite preserves across evaluations, so a Set stored there survives reconnects.

**Observed failure (enqueueSummon refresh bug):**
- Game WS reconnect or HMR reconnect → React Fast Refresh remounts GameBoard
- `handledArrivalEventIdsRef.current` = new empty Set (ref reset)
- `checkedInitialArrivalRef.current` = false (ref reset)
- Initial-load effect fires → `enqueueSummon` called for still-pending `lum_ember-v44`
- Dedup check (`has(eventId)`) returns false → "queueing" log → duplicate cutscene
- Pattern: each duplicate fires 2–6 s after a `[vite] connected.` log

**How to detect:** Cross-correlate `enqueueSummon: queueing` timestamps against `[vite] connecting...` / `[vite] connected.` in browser console. Duplicates appear 2–6 s after each HMR reconnect.

**How to apply:**
```typescript
// Module level (outside component):
if (import.meta.hot) {
  (import.meta.hot.data as Record<string, unknown>).handledArrivalEventIds ??= new Set<string>();
}
const _handledArrivalEventIds: Set<string> =
  ((import.meta.hot?.data as Record<string, unknown> | undefined)
    ?.handledArrivalEventIds as Set<string> | undefined)
  ?? new Set<string>();

// Inside component:
const handledArrivalEventIdsRef = useRef(_handledArrivalEventIds);

// At ALL reset sites — use .clear() not = new Set() to preserve the reference:
handledArrivalEventIdsRef.current.clear(); // ← correct
// handledArrivalEventIdsRef.current = new Set(); // ← WRONG — detaches from hot.data
```

**Production:** `import.meta.hot` is undefined in production builds; the fallback `?? new Set<string>()` gives a plain module-level Set, which is correct (HMR never runs in production).
