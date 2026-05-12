import { useDragControls, animate, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo, Transition } from 'framer-motion';
import type React from 'react';

// ─── Centralized dismiss constants ────────────────────────────────────────────
/** Fraction of panel height the drag must exceed before a slow drag dismisses. */
const DISMISS_THRESHOLD = 0.3;

/**
 * Downward flick velocity (px/s) that dismisses the sheet regardless of how
 * far it has been dragged. Intentionally lower than the old 500 px/s so quick
 * handle flicks dismiss instantly without waiting for a large offset.
 */
const VELOCITY_THRESHOLD = 250;

/**
 * Elastic resistance factor for upward over-drag (past the panel's resting
 * position). Higher values feel more rubbery; lower values feel stiffer.
 * framer-motion multiplies the over-drag distance by this fraction.
 */
const RUBBERBAND_ELASTIC = 0.15;
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
 *  2. Scrollable content area (via scrollableAreaProps) — drag starts only
 *     when the content is scrolled to the very top (scrollTop === 0) AND the
 *     user's first meaningful movement is downward. While the content is not
 *     at the top the gesture is left entirely to the browser for normal scroll.
 *
 * Dismiss triggers:
 *  - Downward offset > DISMISS_THRESHOLD × panelHeight, OR
 *  - Downward velocity > VELOCITY_THRESHOLD px/s (quick flick detection).
 *
 * Snap-back:
 *  - Sub-threshold releases spring back with SNAP_BACK_SPRING (bouncy).
 *  - Upward over-drag past the resting position (y < 0) is rubberbanded via
 *    framer-motion's dragElastic so the sheet feels physically anchored.
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
    const panelHeight = panel ? panel.getBoundingClientRect().height : 600;
    // Only drive feedback progress for downward drag (positive offset).
    // Upward over-drag feedback is handled by the rubberband elastic itself.
    const progress = Math.min(1, Math.max(0, info.offset.y / (panelHeight * threshold)));
    dragProgress.set(progress);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const panel = panelRef.current;
    const panelHeight = panel ? panel.getBoundingClientRect().height : 600;
    if (info.offset.y > panelHeight * threshold || info.velocity.y > VELOCITY_THRESHOLD) {
      // Reset feedback immediately before dismiss so the next open starts clean.
      // The sheet subtree unmounts via AnimatePresence but the hook instance
      // stays alive for the lifetime of the parent, so an explicit reset is required.
      dragProgress.set(0);
      onDismiss();
    } else if (panel) {
      // Sub-threshold: spring the panel back with a satisfying elastic bounce
      void animate(panel, { y: 0 }, spring);
      void animate(dragProgress, 0, spring);
    }
  };

  const dragProps = {
    drag: 'y' as const,
    dragControls,
    dragListener: false as const,
    // top: 0 creates the constraint boundary that RUBBERBAND_ELASTIC acts against
    // when the user drags upward past the panel's resting position.
    // bottom: 0 keeps framer-motion from auto-constraining downward movement so
    // the sheet follows the pointer 1:1 before we decide to dismiss or snap back.
    dragConstraints: { top: 0, bottom: 0 },
    dragElastic: { top: RUBBERBAND_ELASTIC, bottom: 0 },
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
   * - While the scroll area is NOT at the top (scrollTop > 0), all pointer
   *   events fall through to the browser for normal scrolling.
   * - When the scroll area IS at the top, we watch the first pointer movement:
   *     • Downward (positive dy) → hand off to the sheet drag controller.
   *     • Upward (negative dy) → let the browser scroll the content.
   * - `overscrollBehavior: 'contain'` prevents momentum from the scroll area
   *   ever bleeding into the parent sheet when a fast upward fling reaches the
   *   top of the content.
   */
  const scrollableAreaProps = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      const el = e.currentTarget;

      // Content is not at the top — let the browser handle scrolling normally.
      if (el.scrollTop > 0) return;

      const nativeEvent = e.nativeEvent as PointerEvent;
      const startY = e.clientY;
      let settled = false;

      const onMove = (moveEvent: PointerEvent) => {
        if (moveEvent.pointerId !== nativeEvent.pointerId) return;
        if (settled) return;

        const dy = moveEvent.clientY - startY;

        // Dead zone: ignore tiny movements that don't indicate clear intent.
        if (Math.abs(dy) < 6) return;

        settled = true;
        cleanup();

        if (dy > 0) {
          // Downward swipe from the top — activate the sheet drag.
          // Pass the *current* moveEvent (not the original pointerdown) so
          // framer-motion anchors the drag origin to where the finger is right
          // now. Using nativeEvent here would cause a visible jump because the
          // pointer has already travelled ≥6 px (the dead zone) since touchdown.
          dragControls.start(moveEvent as unknown as React.PointerEvent);
        }
        // Upward swipe — do nothing; browser scrolls normally.
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
