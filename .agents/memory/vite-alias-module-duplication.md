---
name: Vite alias vs relative import — module duplication
description: Importing the same file via @/pages/ alias in a component when game.tsx already imports it via relative path creates two module instances in Vite dev mode, breaking React Fast Refresh and causing "Invalid hook call".
---

## Rule

Never import from `@/pages/` files inside `@/components/` files when the page file is also imported by a page (`game.tsx` or similar) using a relative path. If you need a constant or utility from a page-level file, either inline it locally or move it to a `@/lib/` file.

**Why:** Vite 5 dev-mode uses the resolved module URL as the module graph key. `@/pages/foo` and `./foo` (from the page file itself) resolve via different code paths and can produce different URL keys. When this happens, Vite creates **two module instances** of the same file. Each instance registers its React Fast Refresh signatures independently. With Babel's deoptimised code-gen pass on large files (>500KB), this double-registration corrupts the React hook dispatcher for any component that first mounts after the duplicate registration — manifesting as "Invalid hook call" even though all hooks are unconditional and top-level.

**How to apply:** When debugging "Invalid hook call" in a component where:
- All hooks are top-level and unconditional ✓
- Only one React instance exists (dedupe set) ✓
- No StrictMode double-invoke ✓
- No circular deps ✓

Check whether the component imports from `@/pages/` — especially any file that is ALSO imported by a page-level file (game.tsx, etc.) via a relative path. If yes, inline the value or move it to `@/lib/`.

**Confirmed fix:** `CinderMandateBrandingDirector.tsx` was the only component importing `SOURCE_PULSE_LEAD_MS` from `@/pages/game-luminary-effects`. Inlining `const SOURCE_PULSE_LEAD_MS = 300` and removing the alias import resolved the crash.
