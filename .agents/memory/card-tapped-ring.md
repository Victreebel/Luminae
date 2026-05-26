---
name: Card tapped ring — no outline
description: Why ArtifactCardView uses inset box-shadow instead of CSS outline for the tapped selection ring
---

## The rule
Never use `outline-color: transparent` with a CSS `transition` on a component that mounts during an animation (e.g. a card flip). Use `inset box-shadow` with explicit `rgba(0,0,0,0)` values instead.

**Why:** CSS `outline-color` has an initial value of `currentColor`, not `transparent`. On a dark theme with white text, `currentColor` is white. When the element first mounts with `transition: 'outline-color 150ms ease'` and the style `outlineColor: 'transparent'`, the browser runs a white→transparent transition for 150ms — producing a visible white border flash. This is especially noticeable when the card mounts mid-flip-animation.

**How to apply:** In `ArtifactCardView` (and any compact chip outer container), the tapped/untapped indicator uses `boxShadow` only:
- Tapped: `inset 0 0 0 2px COLOR, outer-glow, shadow-xl-values`
- Untapped: `inset 0 0 0 1px rgba(0,0,0,0.3), shadow-xl-values`
- `shadow-xl` Tailwind class is removed; its values (`0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)`) are inlined in `boxShadow` so the inline style doesn't accidentally override them.
- `ring-1 ring-black/30` Tailwind class is also removed; replaced by the inset box-shadow.
