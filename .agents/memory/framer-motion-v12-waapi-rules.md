---
name: framer-motion v12 WAAPI rules
description: Critical rules for keyframe animations in framer-motion v12, where WAAPI is used for transforms — unit consistency, initial prop, and exit prop requirements.
---

# framer-motion v12 WAAPI rules

## Rule 1: Use consistent units in keyframe arrays

**Rule:** Never mix unitless `'0'` with unit strings like `'vh'` or `'px'` in the same keyframe array.

**Why:** framer-motion v12 passes keyframe arrays to the browser's Web Animations API (WAAPI). WAAPI may fail to interpolate between `translateY(-2vh)` and `translateY(0)` on some paths — the `0` without a unit causes ambiguity in the WAAPI keyframe normalization step.

**How to apply:** Use `'0vh'`, `'0px'`, `'0%'` etc. instead of bare `'0'` whenever other values in the same array carry a unit suffix.

```tsx
// WRONG
const Y = ['-2vh', '-1vh', '0', '0.5vh'];

// CORRECT
const Y = ['-2vh', '-1vh', '0vh', '0.5vh'];
```

---

## Rule 2: Always set `initial` on motion elements with keyframe animate arrays

**Rule:** When `animate` is a keyframe array (e.g. `opacity: [0, 1, 0]`), always provide `initial` matching the first keyframe values.

**Why:** Without `initial`, framer-motion v12 starts the element at its current CSS values (usually the browser default: `opacity:1`, `scale:1`, `y:0`), then has to jump to the first keyframe. This causes a 1-frame flash at CSS defaults on mount and can cause WAAPI to compute the wrong interpolation start point, leading to an incorrect animation on rapid remounts.

**How to apply:**
```tsx
<motion.div
  initial={{ opacity: 0, scale: 0.88, y: '-2vh' }}  // matches first keyframe
  animate={{
    opacity: [0, 0.70, 1.0, 0],
    scale:   [0.88, 0.93, 1.00, 1.12],
    y:       ['-2vh', '-1vh', '0vh', '3vh'],
  }}
  transition={{ duration: 1.95, times: [0, 0.1, 0.28, 1] }}
/>
```

---

## Rule 3: Always add `exit` when AnimatePresence may remove the element before its enter animation completes

**Rule:** If there is any chance the element will be unmounted while its enter animation is still in flight, add an `exit` prop.

**Why:** When AnimatePresence removes a child with no `exit` prop, it immediately removes it from the DOM. The in-flight WAAPI animation is cancelled. In some WAAPI implementations, cancelled animations snap back to the element's `initial` value for one frame before DOM removal — visible as a brief flash or glitch. With an `exit` prop, AnimatePresence keeps the element alive through the exit transition.

**How to apply:**
```tsx
// ConsequenceSnap visible for only 160ms, but animation peaks at 182ms
<ConsequenceSnap
  exit={{ opacity: 0, scale: 1.15, transition: { duration: 0.30, ease: 'easeOut' } }}
/>
```

---

## Rule 4: `// @refresh reset` for mixed-export files

Files that export both React components and plain objects/constants cannot use Vite's component-level Fast Refresh. Add `// @refresh reset` at the top of such files to tell Vite to do a controlled full module reset instead of attempting (and failing) a component-level fast refresh. The "incompatible exports" warning will still appear in the Vite log — this is by design.
