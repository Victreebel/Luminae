---
name: useIsMobile — touch + width guard
description: Why useIsMobile must require both narrow viewport AND touch support, not width alone.
---

## The rule
`useIsMobile()` must check **both** `window.innerWidth < 768` **and** `hasTouchSupport()` (i.e. `'ontouchstart' in window || navigator.maxTouchPoints > 0`). Width alone is not sufficient.

**Why:** Replit's preview pane is an iframe embedded in the desktop browser. On a desktop machine the iframe viewport is often narrower than 768 px, so a width-only check returns `true` on desktop. Every `isMobile ? stripped : full` blur/filter guard in `LuminarySummonCutscene` (outer bloom 12 px, inner halo 8 px, flash-core 4 px, flash-haze 8 px, entity filter sweep) was being stripped during desktop preview, making the cutscene look degraded.

**How to apply:** Any future edits to `artifacts/luminae/src/hooks/use-mobile.tsx` must preserve the `hasTouchSupport()` conjunction. The fix landed in that file — do not revert it to width-only.

**Symptom:** User reports "animations look worse / blurs are gone" on desktop — immediately suspect `isMobile` returning true in the narrow Replit iframe.
