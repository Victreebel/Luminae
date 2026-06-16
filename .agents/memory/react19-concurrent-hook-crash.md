---
name: React 19 concurrent mode — "Invalid hook call" on update render
description: Pattern where useState + setTimeout-driven re-render causes useEffect to throw "Invalid hook call" on the second render in React 19 concurrent mode.
---

## The rule
When a React 19 function component uses `useState` and those state setters are called from a `setTimeout` inside `useEffect`, a batched update re-render can arrive with `ReactCurrentDispatcher.current` reset to `ContextOnlyDispatcher` partway through the hook list. Every hook call after the reset point throws "Invalid hook call" — even though earlier hooks in the same render pass just fine.

**Diagnostic signature:**
- All hooks 1–N pass fine (logged in order).
- Crash on hook N+1 ("Invalid hook call") at the same millisecond as the N logs.
- Gap between first render and crashing render = the setTimeout delay (e.g. `BEAT_HOLD_MS` = 820 ms).
- Error is attributed to the component, not the caller.

**Why:**
React 19 concurrent mode can abort and retry a render mid-flight. `resetHooksAfterThrow()` sets the dispatcher to `ContextOnlyDispatcher`. If the retry render has hooks that all initialize before the reset fires again but the timing of a concurrent-mode interruption lands between hook N and N+1 of the retry, the remaining hooks throw. This is triggered specifically by batched state updates from `setTimeout` callbacks (outside React's batching context before React 18's automatic batching window closes).

**How to apply:**
Any component that:
1. Uses `useState` with values driven by `setTimeout` inside `useEffect`, AND
2. Lives in a large 500KB+ file that Babel deoptimises (warning: "code generator deoptimised")

…is at risk. The Babel deoptimisation is a confounding factor that changes JSX transform output and makes concurrent-mode scheduling less predictable.

**Fix:**
Eliminate `useState` from the component entirely. Replace state/effect chains with a single mount `useEffect(() => { ... }, [])` that runs the entire sequence imperatively via `setTimeout` chains. Use framer-motion's standalone `animate(element, keyframes)` function (no hook) for visual transitions that previously required state to show/hide elements.

**Hook budget after fix:**
- Before: `useState×2, useRef×2, useEffect×3` = 7 hooks, triggers re-renders
- After: `useRef×3, useEffect×1` = 4 hooks, zero re-renders from within the component

**Confirmed fix:** `CinderMandateBrandingDirector.tsx` — imperative rewrite with `animate()` from framer-motion eliminated the crash completely.
