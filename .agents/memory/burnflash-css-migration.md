---
name: BurnFlash CSS keyframe migration
description: Why BurnFlash's animate= prop objects interrupt mid-flight animations, and how React.memo + CSS keyframes fix it.
---

## The problem
BurnFlash had 40 framer-motion `motion.div` elements with inline `animate` prop objects:
```tsx
<motion.div animate={{ scaleY: [0, 1, 1], opacity: [1, 1, 0] }} transition={...} />
```
These are recreated as **new object literals** on every render. When game.tsx re-renders (from WebSocket state updates that arrive during the ~2s burn sequence), framer-motion receives new prop references, compares them, and may interrupt/restart mid-flight animations — making the entire burn sequence invisible on mobile.

Secondary problem: the JS thread reconciling 9785-line game.tsx (133 motion elements) during the burn starved requestAnimationFrame, dropping animation frames entirely.

## The fix
1. Replace all 40 `motion.div` elements with plain `div` elements using CSS `animation` shorthand.
2. Add `React.memo` with a custom comparator that skips re-renders when only `onDone` changes (new arrow fn on every game.tsx render). Keep `onDone` current via a sync-effect ref.
3. Suppress flame tongues (8 blending divs) and smoke wisps (5 blurred divs) on mobile.

## CSS custom properties pattern for dynamic offsets
CSS keyframes can't reference JS variables, but inline custom properties work:
```tsx
<div style={{
  ['--burn-slot-h' as string]: `${slotRect.height}px`,
  animation: `burn-flame-edge ${dur}s ${delay}s linear both`,
} as React.CSSProperties} />
```
```css
@keyframes burn-flame-edge {
  0%  { transform: translateY(var(--burn-slot-h)); opacity: 0; }
  96% { transform: translateY(0); opacity: 1; }
  100%{ transform: translateY(-3px); opacity: 0; }
}
```

## Per-stop easing in CSS keyframes
framer-motion `ease: ['linear', 'easeOut']` maps to `animation-timing-function` inside keyframe rules:
```css
@keyframes burn-ash-overlay {
  0%    { transform: scaleY(0); opacity: 1; animation-timing-function: linear; }
  75.7% { transform: scaleY(1); opacity: 1; animation-timing-function: ease-out; }
  100%  { transform: scaleY(1); opacity: 0; }
}
```

**Why:** Once CSS animations start, they run on the compositor thread and are completely immune to React re-renders. No amount of WebSocket-driven setState calls can interrupt them.

**How to apply:** Any framer-motion component inside a large re-rendering parent that has multi-stop animations with inline `animate` objects is a candidate for this migration pattern. The signal is: "animation starts but disappears mid-flight when state updates occur."
