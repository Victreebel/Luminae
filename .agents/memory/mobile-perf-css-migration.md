---
name: Mobile perf — framer-motion CSS migration
description: Pattern for converting repeat:Infinity JS animation loops to CSS keyframes; what was converted, what remains, and SVG-specific gotchas.
---

## The rule
`repeat: Infinity` framer-motion loops run JS interpolation on every RAF tick. On mobile, even 5–10 simultaneous loops can cause main-thread lag. Prefer CSS `@keyframes` + class for any sustained or frequently-firing loop.

**Why:** Each `motion.*` element with `repeat: Infinity` occupies a JS animation slot that calls framer-motion's interpolator at 60fps. 5 simultaneous portal components × 7 loops each = 35 JS calls/frame at 60fps just for idle state.

**How to apply:** Write a `@keyframes` block in `index.css`, add a class with `animation: name duration easing infinite` + `animation-fill-mode: backwards` (for delayed starts), then replace `motion.div/circle/line` with the plain element + `className`. Use inline `animationDuration`/`animationDelay` style props to vary timing per instance without extra classes.

## What was converted (both sessions)

**Portal idle (game-luminary.tsx / LuminaryClaimedPortal):**
- 7 loops per portal instance → CSS: `lum-portal-ring-cw/ccw`, `lum-portal-aura-pulse`, `lum-portal-mote-center`, `lum-portal-drift`, `lum-portal-gem-float`, `lum-portal-badge-pulse`

**Summon cutscene (luminaryAssets.tsx / LuminarySummonCutscene):**
- PaleEntity seesaw → `lum-pale-seesaw` (CSS alternate direction)
- 6 first-crack light-leak motes → `lum-cs-mote` + `lum-cs-pool`
- 8 second-crack motes/pools/rays → same classes; energy rays drop scaleY (CSS SVG compat)
- Breathing hover (2 loops) → `lum-cs-hover`
- Entity glow `filter` animation → removed, replaced with static midpoint filter value

**Total eliminated: ~78 JS loops**

## SVG-specific gotchas

- `motion.circle`/`motion.line` → plain `<circle>`/`<line>` with `className` works fine for CSS `opacity` animation.
- `scaleY` + custom `transformOrigin` on SVG `<line>` is awkward in CSS (SVG user-space coordinates); drop scaleY and animate opacity only when converting rays.
- CSS `animation-fill-mode: backwards` prevents a 1-frame flash at full opacity before the animation start keyframe (opacity: 0) takes effect.
- SVG presentation attribute `opacity="0"` can also be used as an alternative initial state; CSS animations override presentation attributes.
- `animationDuration`/`animationDelay` inline style props override the shorthand `animation:` duration/delay from the class — clean way to vary per-instance timing.

## Remaining JS loops (7 total — acceptable)

- `TideEyeOverlay` (2 loops, lines ~291/298): iris glow halo + drift; only renders when Tide Luminary is on screen.
- Establish-phase glow (1 loop, 0.28s duration): fires for ~1–2s during `isEstablish` summon phase; complex multi-property (opacity, x, y, rotate) with MotionValues.
- Vessel shake (4 loops): fires only during `isPressure`/`hasCracks` summon phases (brief).
- `game-luminary.tsx:414`: summon-button pulse; only when `canAffordLuminary`.
- `AffinityWell.tsx` (3 loops): conditional on `forgeDed > 0 || pending > 0`.
