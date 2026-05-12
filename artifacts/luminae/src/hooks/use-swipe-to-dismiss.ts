import { useDragControls, animate, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo, Transition } from 'framer-motion';
import type React from 'react';
import { useRef, useEffect } from 'react';

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

/**
 * Minimum absolute pixel offset (from the peek position) required to trigger
 * dismissal on a slow drag from the peek state.
 */
const PEEK_DISMISS_OFFSET = 40;

/**
 * Minimum absolute pixel offset (upward, from the peek position) required to
 * snap the sheet back to fully open when the user drags upward from peek.
 */
const PEEK_OPEN_OFFSET = 40;
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

export interface SwipeToDismissOptions {
  /** Fraction of panel height the drag must exceed before a slow drag dismisses (default 0.3). */
  threshold?: number;
  /** Spring overrides for snap-back/snap-to-peek animations. */
  springConfig?: Transition;
  /**
   * When provided, enables a half-open "peek" intermediate state.
   *
   * `peekHeight` is the fraction of the panel height that remains visible when
   * the sheet is in the peek position (e.g. `0.4` means 40 % of the sheet is
   * visible above the bottom edge). Valid range: 0 < peekHeight < 1.
   *
   * State machine:
   *   open  ──slow-vertical-drag-past-threshold──► peek
   *   open  ──fast-flick (vertical or horizontal)──► dismissed
   *   peek  ──downward-drag / horizontal-flick────► dismissed
   *   peek  ──upward-drag──────────────────────────► open
   */
  peekHeight?: number;
  /**
   * Whether the sheet is currently open/visible. Pass the same boolean that
   * controls the sheet's AnimatePresence mount. When this transitions from
   * `false` to `true` the internal state is reset to `'open'` so that sheets
   * closed via non-drag paths (backdrop tap, close button, programmatic state
   * toggle) always start fresh the next time they open.
   */
  isOpen?: boolean;
}

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
 * Peek state (opt-in via options.peekHeight):
 *  - A slow vertical drag past the dismiss threshold snaps to the peek position
 *    instead of dismissing. Fast vertical flicks and all horizontal dismisses
 *    still dismiss directly from open, bypassing peek.
 *  - From the peek state, any downward drag ≥ PEEK_DISMISS_OFFSET px, a fast
 *    vertical flick, or a horizontal dismiss gesture dismisses the sheet fully.
 *  - From the peek state, an upward drag ≥ PEEK_OPEN_OFFSET px snaps back to
 *    fully open.
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
 * @param options - Optional configuration: threshold, springConfig, peekHeight, isOpen.
 */
export function useSwipeToDismiss(
  panelRef: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
  options: SwipeToDismissOptions = {},
) {
  const {
    threshold = DISMISS_THRESHOLD,
    springConfig,
    peekHeight,
    isOpen,
  } = options;

  const dragControls = useDragControls();
  const spring: Transition = { ...SNAP_BACK_SPRING, ...springConfig };

  // Tracks whether the sheet is currently in the peek position.
  // Using a ref avoids stale-closure issues inside drag event handlers.
  const sheetState = useRef<'open' | 'peek'>('open');

  // Reset to 'open' whenever the sheet becomes visible again so that sheets
  // closed via non-drag paths (backdrop tap, close button, external state
  // toggle) never carry stale 'peek' state into the next open cycle.
  useEffect(() => {
    if (isOpen) {
      sheetState.current = 'open';
    }
  }, [isOpen]);

  // 0 = at rest / fully open, 1 = drag has reached the dismiss threshold.
  // In peek mode the base starts at 0.5 so feedback is continuous across states.
  const dragProgress = useMotionValue(0);

  // Backdrop dims as progress increases (fully opaque → nearly transparent)
  const backdropOpacity = useTransform(dragProgress, [0, 1], [1, 0.45]);

  // Sheet scales down very subtly so the drag feels live and physical
  const sheetScale = useTransform(dragProgress, [0, 1], [1, 0.97]);

  /** Pixel Y offset for the peek position (panel dragged down, only peekHeight fraction visible). */
  const getPeekOffset = () => {
    const panel = panelRef.current;
    if (!panel || !peekHeight) return 0;
    return panel.getBoundingClientRect().height * (1 - peekHeight);
  };

  const handleDragStart = () => {
    // Start feedback from the appropriate baseline depending on current state.
    dragProgress.set(sheetState.current === 'peek' ? 0.5 : 0);
  };

  const handleDrag = (_: unknown, info: PanInfo) => {
    const panel = panelRef.current;
    const rect = panel ? panel.getBoundingClientRect() : { height: 600, width: 400 };

    // Horizontal progress is always computed — a horizontal flick should
    // show feedback regardless of peek state.
    const horizontalProgress = Math.min(
      1,
      Math.abs(info.offset.x) / (rect.width * HORIZONTAL_DISMISS_THRESHOLD),
    );

    if (sheetState.current === 'open') {
      const verticalProgress = Math.min(1, Math.max(0, info.offset.y / (rect.height * threshold)));
      dragProgress.set(Math.max(verticalProgress, horizontalProgress));
    } else {
      // Already at peek: downward drag increases feedback from the 0.5 baseline;
      // upward drag decreases it toward 0 (approaching fully open).
      const verticalProgress = Math.min(
        1,
        Math.max(0, 0.5 + info.offset.y / (rect.height * threshold)),
      );
      dragProgress.set(Math.max(verticalProgress, horizontalProgress));
    }
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const panel = panelRef.current;
    const rect = panel ? panel.getBoundingClientRect() : { height: 600, width: 400 };

    const horizontalDismiss =
      Math.abs(info.offset.x) > rect.width * HORIZONTAL_DISMISS_THRESHOLD ||
      Math.abs(info.velocity.x) > HORIZONTAL_VELOCITY_THRESHOLD;

    if (sheetState.current === 'open') {
      const fastVerticalFlick = info.velocity.y > VELOCITY_THRESHOLD;
      const slowVerticalPastThreshold = info.offset.y > rect.height * threshold;

      if (fastVerticalFlick || horizontalDismiss) {
        // Fast flick (either axis) dismisses directly — peek is bypassed.
        dragProgress.set(0);
        onDismiss();
      } else if (peekHeight !== undefined && slowVerticalPastThreshold) {
        // Slow vertical drag past threshold with peek enabled → snap to peek.
        sheetState.current = 'peek';
        void animate(panel!, { y: getPeekOffset(), x: 0 }, spring);
        void animate(dragProgress, 0.5, spring);
      } else if (panel) {
        // Sub-threshold: spring back to fully open on both axes.
        void animate(panel, { y: 0, x: 0 }, spring);
        void animate(dragProgress, 0, spring);
      }
    } else {
      // From peek state — horizontal dismiss also works here.
      if (
        info.offset.y > PEEK_DISMISS_OFFSET ||
        info.velocity.y > VELOCITY_THRESHOLD ||
        horizontalDismiss
      ) {
        // Downward drag, fast flick, or horizontal gesture → dismiss fully.
        dragProgress.set(0);
        sheetState.current = 'open';
        onDismiss();
      } else if (info.offset.y < -PEEK_OPEN_OFFSET) {
        // Upward drag from peek → snap back to fully open.
        sheetState.current = 'open';
        void animate(panel!, { y: 0, x: 0 }, spring);
        void animate(dragProgress, 0, spring);
      } else if (panel) {
        // Small drag in any direction → snap back to peek.
        void animate(panel, { y: getPeekOffset(), x: 0 }, spring);
        void animate(dragProgress, 0.5, spring);
      }
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

  /**
   * Programmatically snap the sheet to its peek position.
   * No-op if `peekHeight` was not provided to the hook.
   */
  const snapToPeek = () => {
    const panel = panelRef.current;
    if (!panel || peekHeight === undefined) return;
    sheetState.current = 'peek';
    void animate(panel, { y: getPeekOffset(), x: 0 }, spring);
    void animate(dragProgress, 0.5, spring);
  };

  /**
   * Programmatically snap the sheet back to the fully open position.
   */
  const snapToOpen = () => {
    const panel = panelRef.current;
    if (!panel) return;
    sheetState.current = 'open';
    void animate(panel, { y: 0, x: 0 }, spring);
    void animate(dragProgress, 0, spring);
  };

  return {
    dragProps,
    handleBarProps,
    scrollableAreaProps,
    backdropOpacity,
    sheetScale,
    snapToPeek,
    snapToOpen,
    /** Current sheet state ref — 'open' or 'peek'. Read via .current. */
    sheetState,
  };
}
