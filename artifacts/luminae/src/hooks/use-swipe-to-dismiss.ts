import { useDragControls, animate, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo, Transition } from 'framer-motion';
import type React from 'react';

// ─── Centralized dismiss constants ────────────────────────────────────────────
/** Fraction of panel height the drag must exceed before a slow downward drag dismisses. */
const DISMISS_THRESHOLD = 0.3;

/**
 * Downward flick velocity (px/s) that dismisses the sheet regardless of how
 * far it has been dragged. Intentionally lower than the old 500 px/s so quick
 * handle flicks dismiss instantly without waiting for a large offset.
 */
const VELOCITY_THRESHOLD = 250;

/**
 * Fraction of panel width a horizontal drag must exceed before a slow
 * horizontal drag dismisses (independent of the vertical threshold).
 */
const HORIZONTAL_DISMISS_THRESHOLD = 0.4;

/**
 * Horizontal flick velocity (px/s) that dismisses the sheet regardless of
 * how far it has been dragged sideways. Set higher than the vertical threshold
 * because lateral flicks on a bottom sheet are a stronger intentional signal.
 */
const HORIZONTAL_VELOCITY_THRESHOLD = 400;

/**
 * Elastic resistance factor for upward over-drag (past the panel's resting
 * position). Higher values feel more rubbery; lower values feel stiffer.
 * framer-motion multiplies the over-drag distance by this fraction.
 */
const RUBBERBAND_ELASTIC = 0.15;

/**
 * Elastic resistance for leftward / rightward over-drag. Slightly softer than
 * the vertical rubberband so horizontal flicks feel light and effortless.
 */
const HORIZONTAL_ELASTIC = 0.2;
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Spring for snap-back after an aborted drag. Higher stiffness and slightly
 * less damping than the open/close entry animation produces a satisfying
 * elastic bounce while still settling quickly.
 */
const SNAP_BACK_SPRING: Transition = {
  type: 'spring',
  damping: 22,
  stiffness: 380,
};

/**
 * Returns framer-motion drag props for a bottom-sheet panel, pointer-down
 * props for the drag handle bar, optional props for any scrollable content
 * area inside the sheet, and live motion values for visual drag feedback.
 *
 * Usage:
 *   const { dragProps, handleBarProps, scrollableAreaProps, backdropOpacity, sheetScale } =
 *     useSwipeToDismiss(panelRef, onClose);
 *
 *   // Outer wrapper (backdrop container):
 *   <motion.div ...>
 *     <motion.div style={{ opacity: backdropOpacity }} className="absolute inset-0 bg-black/60 ..." />
 *     <motion.div {...dragProps} style={{ scale: sheetScale }} ref={panelRef} …>
 *       <div {...handleBarProps} className="flex justify-center pt-3 pb-1">
 *         <div className="w-10 h-1 rounded-full bg-border" />
 *       </div>
 *       <div {...scrollableAreaProps} className="overflow-y-auto …">
 *         …scrollable content…
 *       </div>
 *     </motion.div>
 *   </motion.div>
 *
 * Drag start sources:
 *  1. Handle bar — always starts a drag immediately (existing behaviour).
 *  2. Scrollable content area (via scrollableAreaProps) — vertical drag starts
 *     only when the content is scrolled to the very top (scrollTop === 0) AND
 *     the user's first meaningful movement is downward. Horizontal drags on
 *     the scroll area are intercepted at any scroll position. While neither
 *     condition is met the gesture is left entirely to the browser.
 *
 * Dismiss triggers (vertical):
 *  - Downward offset > DISMISS_THRESHOLD × panelHeight, OR
 *  - Downward velocity > VELOCITY_THRESHOLD px/s (quick flick detection).
 *
 * Dismiss triggers (horizontal):
 *  - |Horizontal offset| > HORIZONTAL_DISMISS_THRESHOLD × panelWidth, OR
 *  - |Horizontal velocity| > HORIZONTAL_VELOCITY_THRESHOLD px/s.
 *
 * Snap-back:
 *  - Sub-threshold releases spring back with SNAP_BACK_SPRING (bouncy).
 *  - Upward over-drag past the resting position (y < 0) is rubberbanded via
 *    framer-motion's dragElastic so the sheet feels physically anchored.
 *  - Aborted horizontal drags spring back on the x-axis the same way and
 *    do not interfere with the vertical snap-back.
 *
 * Live visual feedback (motion values, never trigger re-renders):
 *   - `backdropOpacity` — dims the backdrop as the user drags toward threshold (1 → 0.45)
 *   - `sheetScale`      — slightly shrinks the panel during a partial drag (1 → 0.97)
 * Both values animate back to their resting state on a sub-threshold release
 * using the same spring as the panel snap-back.
 *
 * @param springConfig - Optional spring overrides for the snap-back animation.
 *   Defaults to SNAP_BACK_SPRING { damping: 22, stiffness: 380 }.
 */
export function useSwipeToDismiss(
  panelRef: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
  threshold = DISMISS_THRESHOLD,
  springConfig?: Transition,
) {
  const dragControls = useDragControls();

  const spring: Transition = { ...SNAP_BACK_SPRING, ...springConfig };

  // 0 = at rest / fully open, 1 = drag has reached the dismiss threshold
  const dragProgress = useMotionValue(0);

  // Backdrop dims as progress increases (fully opaque → nearly transparent)
  const backdropOpacity = useTransform(dragProgress, [0, 1], [1, 0.45]);

  // Sheet scales down very subtly so the drag feels live and physical
  const sheetScale = useTransform(dragProgress, [0, 1], [1, 0.97]);

  const handleDragStart = () => {
    // Ensure feedback values always start from rest at the beginning of each
    // gesture — guards against stale state after a previous dismiss.
    dragProgress.set(0);
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    const panel = panelRef.current;
    const rect = panel ? panel.getBoundingClientRect() : { height: 600, width: 400 };

    // Drive progress from whichever axis is closer to its dismiss threshold.
    const verticalProgress = Math.min(1, Math.max(0, info.offset.y / (rect.height * threshold)));
    const horizontalProgress = Math.min(
      1,
      Math.abs(info.offset.x) / (rect.width * HORIZONTAL_DISMISS_THRESHOLD),
    );
    dragProgress.set(Math.max(verticalProgress, horizontalProgress));
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const panel = panelRef.current;
    const rect = panel ? panel.getBoundingClientRect() : { height: 600, width: 400 };

    const verticalDismiss =
      info.offset.y > rect.height * threshold || info.velocity.y > VELOCITY_THRESHOLD;
    const horizontalDismiss =
      Math.abs(info.offset.x) > rect.width * HORIZONTAL_DISMISS_THRESHOLD ||
      Math.abs(info.velocity.x) > HORIZONTAL_VELOCITY_THRESHOLD;

    if (verticalDismiss || horizontalDismiss) {
      // Reset feedback immediately before dismiss so the next open starts clean.
      dragProgress.set(0);
      onDismiss();
    } else if (panel) {
      // Sub-threshold: spring the panel back on both axes.
      void animate(panel, { y: 0, x: 0 }, spring);
      void animate(dragProgress, 0, spring);
    }
  };

  const dragProps = {
    // Allow both axes so horizontal flicks can also dismiss the sheet.
    drag: true as const,
    dragControls,
    dragListener: false as const,
    // Constraints anchor the panel at rest; elastic factors control resistance.
    // Vertical: rubberband upward, free downward (dismissed manually above).
    // Horizontal: symmetric elastic resistance on both sides.
    dragConstraints: { top: 0, bottom: 0, left: 0, right: 0 },
    dragElastic: {
      top: RUBBERBAND_ELASTIC,
      bottom: 0,
      left: HORIZONTAL_ELASTIC,
      right: HORIZONTAL_ELASTIC,
    },
    onDragStart: handleDragStart,
    onDrag: handleDrag,
    onDragEnd: handleDragEnd,
  };

  const handleBarProps = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      dragControls.start(e);
    },
    style: { touchAction: 'none', cursor: 'grab' } as React.CSSProperties,
  };

  /**
   * Spread these props on any `overflow-y-auto` container inside the sheet.
   *
   * Behaviour:
   * - Primarily horizontal movements are intercepted at any scroll position
   *   and handed off to the sheet drag controller (horizontal dismiss path).
   * - While the scroll area is NOT at the top (scrollTop > 0) and the gesture
   *   is not primarily horizontal, all pointer events fall through to the
   *   browser for normal scrolling.
   * - When the scroll area IS at the top, we watch the first pointer movement:
   *     • Downward (positive dy, not primarily horizontal) → hand off to the
   *       sheet drag controller.
   *     • Upward (negative dy) → let the browser scroll the content.
   * - `overscrollBehavior: 'contain'` prevents momentum from the scroll area
   *   ever bleeding into the parent sheet when a fast upward fling reaches the
   *   top of the content.
   */
  const scrollableAreaProps = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      const el = e.currentTarget;
      const nativeEvent = e.nativeEvent as PointerEvent;
      const startY = e.clientY;
      const startX = e.clientX;
      let settled = false;

      const onMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== nativeEvent.pointerId) return;
        if (settled) return;

        const dy = moveEvent.clientY - startY;
        const dx = moveEvent.clientX - startX;

        // Dead zone: ignore tiny movements that don't indicate clear intent.
        if (Math.abs(dy) < 6 && Math.abs(dx) < 6) return;

        settled = true;
        cleanup();

        const isPrimarilyHorizontal = Math.abs(dx) > Math.abs(dy);

        if (isPrimarilyHorizontal) {
          // Horizontal flick — activate sheet drag regardless of scroll position.
          dragControls.start(moveEvent as unknown as React.PointerEvent);
        } else if (dy > 0 && el.scrollTop === 0) {
          // Downward swipe from the top — activate the sheet drag.
          // Pass the *current* moveEvent (not the original pointerdown) so
          // framer-motion anchors the drag origin to where the finger is right
          // now. Using nativeEvent here would cause a visible jump because the
          // pointer has already travelled ≥6 px (the dead zone) since touchdown.
          dragControls.start(moveEvent as unknown as React.PointerEvent);
        }
        // Upward swipe or downward-when-not-at-top — let the browser handle.
      };

      const cleanup = () => {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
      };

      const onUp = () => {
        settled = true;
        cleanup();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp, { once: true });
      window.addEventListener('pointercancel', onUp, { once: true });
    },
    style: {
      touchAction: 'pan-y',
      overscrollBehavior: 'contain',
    } as React.CSSProperties,
  };

  return { dragProps, handleBarProps, scrollableAreaProps, backdropOpacity, sheetScale };
}
