---
name: Mobile perf — framer-motion CSS migration
description: Pattern for converting repeat:Infinity JS animation loops to CSS keyframes; SVG pathLength elimination on mobile; what was converted, what remains.
---

## The rule
`repeat: Infinity` framer-motion loops run JS interpolation on every RAF tick. On mobile, even 5–10 simultaneous loops can cause main-thread lag. Prefer CSS `@keyframes` + class for any sustained or frequently-firing loop.

**Why:** Each `motion.*` element with `repeat: Infinity` occupies a JS animation slot that calls framer-motion's interpolator at 60fps. 5 simultaneous portal components × 7 loops each = 35 JS calls/frame at 60fps just for idle state.

**How to apply:** Write a `@keyframes` block in `index.css`, add a class with `animation: name duration easing infinite` + `animation-fill-mode: backwards` (for delayed starts), then replace `motion.div/circle/line` with the plain element + `className`. Use inline `animationDuration`/`animationDelay` style props to vary timing per instance without extra classes.

## CSS custom properties for color-dependent glow animations
When the glow color varies per Luminary instance (e.g. vessel glow), pass values as CSS custom properties set inline on the element:
```css
@keyframes lum-vessel-glow {
  0%, 100% { box-shadow: var(--lum-glow-dim); }
  50%       { box-shadow: var(--lum-glow-bright); }
}
.lum-vessel-glow {
  animation: lum-vessel-glow var(--lum-glow-dur, 0.80s) ease-in-out infinite;
}
```
Then in JSX: `style={{ '--lum-glow-dim': '...', '--lum-glow-bright': '...', '--lum-glow-dur': '0.75s' } as React.CSSProperties}`

## What was converted (all sessions)

**Portal idle (game-luminary.tsx / LuminaryClaimedPortal):**
- 7 loops per portal instance → CSS: `lum-portal-ring-cw/ccw`, `lum-portal-aura-pulse`, `lum-portal-mote-center`, `lum-portal-drift`, `lum-portal-gem-float`, `lum-portal-badge-pulse`

**Summon cutscene (luminaryAssets.tsx / LuminarySummonCutscene):**
- PaleEntity seesaw → `lum-pale-seesaw` (CSS alternate direction)
- 6 first-crack light-leak motes → `lum-cs-mote` + `lum-cs-pool`
- 8 second-crack motes/pools/rays → same classes; energy rays drop scaleY (CSS SVG compat)
- Breathing hover (2 loops) → `lum-cs-hover`
- Entity glow `filter` animation → removed, replaced with static midpoint filter value
- Vessel shake (4 loops during crack phases) → `lum-vessel-shake-0` through `lum-vessel-shake-5`
- **Vessel glow pulse (boxShadow repeat:Infinity during all crack phases)** → `lum-vessel-glow` CSS class + CSS custom props for per-Luminary color

**Total eliminated: ~80 JS loops**

## SVG pathLength mobile optimization — COMPLETE (crack SVG overlay)

`motion.path` with `pathLength` requires `getTotalLength()` DOM calls + JS interpolation per frame. With 24 paths simultaneous during the crack phases (plus blur filters), this was the primary mobile lag source.

**Critical insight:** `#cgb` (`feGaussianBlur stdDeviation="1.5"`) is ALSO a blur filter — not just a color filter. All L1 white-snap paths were still compositing through a blur on mobile even after L2/L3 were removed.

**Final mobile state (0 pathLength, 0 blur from crack sequence):**

| Layer | Desktop | Mobile |
|---|---|---|
| L1 white snap | `pathLength` + `filter="url(#cgb)"` | opacity flash, no filter |
| L2 chasing glow | `pathLength` + `filter="url(#cgw)"` | **skipped** |
| L3 residual wound | `pathLength` + `filter="url(#cgw)"` | **skipped** |
| L4 tinted seam | `pathLength`, no filter | opacity flash |
| Fine detail branches | `pathLength` + `filter="url(#cgb)"` | **skipped** |
| isCracking burst circles | `scale` + `filter="url(#cgw)"` | **skipped** |

**Pattern for L1/L4 opacity flash on mobile:**
```jsx
<motion.path
  d={...}
  stroke="white" strokeWidth="1.5" fill="none"
  filter={isMobile ? undefined : "url(#cgb)"}
  initial={isMobile ? { opacity: 0 } : { pathLength: 0, opacity: 0 }}
  animate={isMobile ? { opacity: [0, 1.0, 0.95] } : { pathLength: 1, opacity: [0, 1.0, 0.95] }}
  transition={{ duration: 0.10, ease: 'easeOut' }}
/>
```
Key: `pathLength` must be absent from BOTH `initial` AND `animate` on mobile — framer-motion activates `getTotalLength()` if `pathLength` appears in either.

## SVG-specific gotchas

- `motion.circle`/`motion.line` → plain `<circle>`/`<line>` with `className` works fine for CSS `opacity` animation.
- `scaleY` + custom `transformOrigin` on SVG `<line>` is awkward in CSS (SVG user-space coordinates); drop scaleY and animate opacity only when converting rays.
- CSS `animation-fill-mode: backwards` prevents a 1-frame flash at full opacity before the animation start keyframe (opacity: 0) takes effect.
- SVG presentation attribute `opacity="0"` can also be used as an alternative initial state; CSS animations override presentation attributes.
- `animationDuration`/`animationDelay` inline style props override the shorthand `animation:` duration/delay from the class — clean way to vary per-instance timing.

## Remaining JS loops (5 total — acceptable)

- `TideEyeOverlay` (2 loops, iris glow halo + drift): only renders when Tide Luminary is on screen.
- Establish-phase glow (1 loop, 0.28s duration): fires for ~1–2s during `isEstablish` summon phase; complex multi-property (opacity, x, y, rotate) with MotionValues.
- `game-luminary.tsx`: summon-button pulse; only when `canAffordLuminary`.
- `AffinityWell.tsx` (3 loops): conditional on `forgeDed > 0 || pending > 0`.
