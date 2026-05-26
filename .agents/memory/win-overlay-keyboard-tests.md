---
name: Win overlay keyboard tests
description: Lessons from adding keyboard nav tests for the win overlay dialog in dialog-keyboard-mobile.spec.ts
---

## Rules

**Surrender is turn-gated.** `applyAction` in `gameEngine.ts` rejects `surrender` with "Not your turn" unless `state.currentPlayerIndex === playerIdx`. Always wait for `[data-deck-tier]:not([disabled])` to be enabled before submitting surrender via the REST API.

**Do not use the `getFocusables` helper for the win overlay.** The helper calls `dialog.locator(selector).count()` where `dialog` is a Playwright filter-locator chain. When framer-motion briefly resets the entry animation after a React reconciliation cycle, the filtered locator collapses to 0 elements — even though the dialog is visibly present — causing `count()` to return 0 and the test to fail.

**Use direct `page.locator(...)` selectors instead.** For dialogs with known, named buttons (e.g. "Play Again", "Back to Home"), address them with `page.locator('[role="dialog"][aria-modal="true"] button', { hasText: /text/i })` and use `page.evaluate(() => dlg.contains(document.activeElement))` to assert focus containment.

**Why:** The `.filter({ has: ... })` locator chain re-evaluates lazily. During the 0.9 s framer-motion entry animation the inner `motion.div` oscillates through `opacity: 0 → 1`. If a React re-render remounts the motion.div mid-animation, the locator chain resolves to 0 for that instant — right when `getFocusables` evaluates it.

**How to apply:** Any dialog opened via an animated `motion.div` with an explicit `initial={{ opacity: 0 }}` and a delay ≥ 0.5 s should use direct named-element locators rather than `getFocusables` for Tab/arrow key assertions.
