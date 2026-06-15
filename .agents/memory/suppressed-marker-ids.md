---
name: suppressedMarkerIds — hide markers until animation fires
description: Pattern for hiding condemned/forgotten marker overlays during an arrival cutscene, revealing them only when the brand-strike animation plays.
---

## Rule
When a new batch of market markers arrives with a Luminary activation event, suppress their UI immediately and reveal them only when `fireBrandStrikes` actually fires (or on every early-exit code path).

**Why:** Without suppression, the condemned/forgotten overlay badges appear the moment the new game state arrives — which is during the arrival cutscene, several seconds before the Ember strike animation plays. This spoils the reveal.

**How to apply:**
- State: `const [suppressedMarkerIds, setSuppressedMarkerIds] = useState<Set<string>>(new Set());`
- Stale-sweep effect: when `state?.marketMarkers` changes, remove any suppressed IDs that are no longer present (burned/purchased cards).
- Suppress point: in the brand-strike detection block, on new markers arriving, add all new IDs to the suppressed set.
- Unsuppress points — **must cover every code path** where `fireBrandStrikes` is called or bailed out:
  1. Camera-orchestrated path, `!strikeId` early return (no DOM targets).
  2. Camera-orchestrated path, `strikeId` truthy (animation playing).
  3. Non-camera `else` path (instant / no-orchestration).
- Render guard: `state?.marketMarkers?.[c.id] && !suppressedMarkerIds.has(c.id) && (...)` at every marker render site.
- Skip suppression when `instant=true` (reduced-motion / abridged) — final state shown immediately.

**Pitfall:** A prior attempt suppressed markers globally and never unsuppressed when cards burned before Phase 2. That was fixed by Bug 2 (payload IDs) — the animation now always has valid targets, so suppression → reveal is safe.
