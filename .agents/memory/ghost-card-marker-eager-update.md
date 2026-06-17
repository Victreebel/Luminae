---
name: Ghost card marker — eager setQueryData wipes marketMarkers
description: When a condemned card is purchased mid-brand-strike, the WS queue path calls setQueryData immediately (wiping state.marketMarkers for that card) while deferring processUpdate. Ghost card path in the market render had no badge/overlay/aura rendering, so the condemned badge never showed.
---

## The rule
Ghost card branches in the market render loop (`burstGhostCards[slotKey]`) must include `CardKeywordOverlay`, `CardMarkerBadge`, and `BrandStrikeAura` — same as the normal card paths.

**Why:** The WS handler queue path calls `queryClient.setQueryData(newState)` eagerly (to keep affordability current) but defers `processUpdateRef.current(newState)` until the animation gate clears. For a card purchased while a brand strike is animating, the eager update moves the card out of `state.marketMarkers` before `fireBrandStrikes` fires. The ghost card then renders bare (no badge), even though the beam hits it correctly.

**How to apply:** Use `strikeAuraMap` as the marker type fallback when `state.marketMarkers[ghostCard.id]` is undefined:
```tsx
const ghostMarkerType =
  state?.marketMarkers?.[ghostCard.id]?.type ??
  strikeAuraMap.get(ghostCard.id)?.type ??
  null;
```
`strikeAuraMap` is populated in `fireBrandStrikes` from the v51 `markers` argument (captured before the eager update) and auto-clears with the aura animation TTL.
