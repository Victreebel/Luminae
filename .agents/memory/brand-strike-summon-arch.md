---
name: Brand strike summon — immediate badge, deferred beam
description: Architecture for condemned/forgotten/nullified badges during Luminary summon arrivals; why suppression was wrong and what the correct pattern is.
---

## The rule
When `arrivalPending` is true (a Luminary arrival cutscene owns the view), call `setNewlyMarkedCardIds` **immediately** so condemned/forgotten/nullified badges appear during the 12s cutscene. Only the beam (`ArrivalBrandStrike`) is deferred to Phase 2 via `deferredBrandStrikesRef`.

**Why:** The suppression approach (`setSuppressedMarkerIds`) had a silent failure mode: start-of-turn Cinder Mandate burns condemned cards before `resolveArrival` fires. When Phase 2 finally ran, the card DOM elements were gone (width=0), so `fireBrandStrikes` returned null and both the beam and the badge were dropped. Players never saw any indication that cards were condemned.

**How to apply:**
- In the marker diff block (`// ── Newly applied market markers`), `arrivalPending` branch: call `setNewlyMarkedCardIds(prev => new Set([...prev, ...newlyMarked]))`.
- Do NOT call `setSuppressedMarkerIds` — that state is now removed entirely.
- `deferredBrandStrikesRef.current.push(...)` still defers the beam; Phase 2 fires it best-effort.
- If the cards are gone by Phase 2, `fireBrandStrikes` returns null and `viewOrchestrator.restore()` is called immediately (graceful skip).
- `effectType === 'summon'` activation events (e.g., Cinder Mandate's board-effect closure) should NOT be skipped — they flow to `activationQueue` and play as `LuminaryActivationCinematic` after Phase 2. Do not add a `continue` guard for summon events.

## What was removed
- `const [suppressedMarkerIds, setSuppressedMarkerIds] = useState<Set<string>>(new Set())` — deleted
- Phase 2 `setSuppressedMarkerIds` lift call — deleted
- 5 render-site `!suppressedMarkerIds.has(c.id)` guards — simplified to `state?.marketMarkers?.[c.id] &&`
