import { useDragControls, animate, useMotionValue, useTransform } from 'framer-motion';
import type { AnimationPlaybackControlsWithThen, PanInfo, Transition } from 'framer-motion';
import type React from 'react';
import { useRef, useEffect, useCallback } from 'react';

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

/** Props returned by {@link useSwipeToDismiss.makeScrollableAreaProps} for one scrollable region. */
export interface ScrollableAreaProps {
  ref: React.RefCallback<HTMLDivElement>;
  onPointerDown: (e: React.PointerEvent<HTMLElement>) => void;
  style: React.CSSProperties;
}

/**
 * Returns framer-motion drag props for a bottom-sheet panel, pointer-down
 * props for the drag handle bar, props for one or more scrollable content
 * areas inside the sheet, and live motion values for visual drag feedback.
 *
 * Usage (single scrollable area — same as before):
 *   const { dragProps, handleBarProps, scrollableAreaProps, backdropOpacity, sheetScale } =
 *     useSwipeToDismiss(panelRef, onClose);
 *
 *   <div {...scrollableAreaProps} className="overflow-y-auto …">…</div>
 *
 * Usage (multiple scrollable areas):
 *   const { dragProps, handleBarProps, makeScrollableAreaProps, backdropOpacity, sheetScale } =
 *     useSwipeToDismiss(panelRef, onClose);
 *
 *   // Call once per scrollable region at the top level of the component (no hooks rules issues —
 *   // makeScrollableAreaProps is a plain function, not a hook).
 *   const listScrollProps   = makeScrollableAreaProps();
 *   const headerScrollProps = makeScrollableAreaProps();
 *
 *   <div {...headerScrollProps} className="overflow-y-auto sticky-header-area">…</div>
 *   <div {...listScrollProps}   className="overflow-y-auto flex-1">…</div>
 *
 * All scroll positions registered through either `scrollableAreaProps` or
 * `makeScrollableAreaProps()` are preserved across peek ↔ open transitions.
 *
 * Drag start sources:
 *  1. Handle bar — always starts a drag immediately (existing behaviour).
 *  2. Any registered scrollable area — vertical drag starts only when the
 *     content is scrolled to the very top (scrollTop === 0) AND the user's
 *     first meaningful movement is downward. Horizontal drags are intercepted
 *     at any scroll position. While neither condition is met the gesture is
 *     left entirely to the browser.
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

  /**
   * All scrollable elements registered with this hook instance.
   * Elements are added/removed via the callback refs returned by
   * makeScrollableAreaProps (and by scrollableAreaProps, which is backed by the
   * same factory). Scroll positions of every element in this set are saved and
   * restored on peek ↔ open transitions so no visible jump occurs regardless of
   * which area the user had previously scrolled.
   */
  const scrollableElements = useRef<Set<HTMLElement>>(new Set());

  /**
   * Runs a peek→open animation while preserving the scroll position of every
   * registered scrollable area. The current scrollTop of each element is
   * captured synchronously, the spring animation is awaited, and then each
   * scrollTop is written back. Without this, some browsers reset the scroll
   * position of partially-offscreen elements when they re-enter the fully-
   * visible viewport during the snap.
   */
  const animateToOpenPreservingScroll = (panelAnimation: AnimationPlaybackControlsWithThen) => {
    const saved = new Map<HTMLElement, number>();
    scrollableElements.current.forEach(el => {
      if (el.scrollTop > 0) saved.set(el, el.scrollTop);
    });
    void panelAnimation.then(() => {
      saved.forEach((scrollTop, el) => {
        el.scrollTop = scrollTop;
      });
    });
  };

  /**
   * Runs an open→peek animation while preserving the scrollable area's scroll
   * position. Some browsers may reset the scroll of a partially-offscreen
   * element as it moves out of the fully-visible viewport during the peek snap.
   * Capturing scrollTop before the animation and writing it back once the
   * spring settles prevents any visible jump on entry into the peek state.
   */
  const animateToPeekPreservingScroll = (panelAnimation: AnimationPlaybackControlsWithThen) => {
    const savedScroll = scrollableRef.current?.scrollTop ?? 0;
    void panelAnimation.then(() => {
      if (scrollableRef.current && savedScroll > 0) {
        scrollableRef.current.scrollTop = savedScroll;
      }
    });
  };

  // 0 = at rest / fully open, 1 = drag has reached the dismiss threshold.
  // In peek mode the base starts at 0.5 so feedback is continuous across states.
  const dragProgress = useMotionValue(0);

  // 0 = sheet is fully open (or no peek), 1 = sheet is in the peek position.
  // Animated to 1 when snapping to peek and back to 0 on open/dismiss so
  // consumers can drive a "swipe up to expand" indicator without re-renders.
  // Declared before the isOpen effect so the effect closure captures it safely.
  const peekProgress = useMotionValue(0);

  // Reset to 'open' whenever the sheet opens or closes so that sheets dismissed
  // via non-drag paths (backdrop tap, close button, external state toggle) never
  // carry stale 'peek' state or a stale peekProgress value into the next open
  // cycle.  Resetting on both transitions (false→true and true→false) keeps
  // peekProgress at 0 regardless of which path closed the sheet last time.
  useEffect(() => {
    sheetState.current = 'open';
    peekProgress.set(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

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
        // Scroll position is saved and restored after the spring settles so a
        // browser that resets scroll on partial-offscreen entry does not produce
        // a visible jump when the sheet enters the peek state.
        sheetState.current = 'peek';
        animateToPeekPreservingScroll(animate(panel!, { y: getPeekOffset(), x: 0 }, spring));
        void animate(dragProgress, 0.5, spring);
        void animate(peekProgress, 1, spring);
      } else if (panel) {
        // Sub-threshold: spring back to fully open on both axes.
        void animate(panel, { y: 0, x: 0 }, spring);
        void animate(dragProgress, 0, spring);
        void animate(peekProgress, 0, spring);
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
        peekProgress.set(0);
        sheetState.current = 'open';
        onDismiss();
      } else if (info.offset.y < -PEEK_OPEN_OFFSET) {
        // Upward drag from peek → snap back to fully open.
        // Scroll positions of all registered areas are saved and restored after
        // the spring settles so content that was scrolled before peeking does
        // not jump back to top.
        sheetState.current = 'open';
        animateToOpenPreservingScroll(animate(panel!, { y: 0, x: 0 }, spring));
        void animate(dragProgress, 0, spring);
        void animate(peekProgress, 0, spring);
      } else if (panel) {
        // Small drag in any direction → snap back to peek.
        void animate(panel, { y: getPeekOffset(), x: 0 }, spring);
        void animate(dragProgress, 0.5, spring);
        void animate(peekProgress, 1, spring);
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
   * Creates props for one `overflow-y-auto` region inside the sheet.
   *
   * Each call registers an independent scrollable element whose scroll position
   * is preserved across peek ↔ open transitions alongside all other registered
   * areas. Call once per scrollable region at the top level of your component
   * (it is a plain factory function, not a hook):
   *
   *   const listProps   = makeScrollableAreaProps();
   *   const headerProps = makeScrollableAreaProps();
   *
   * Then spread each result onto the corresponding DOM element:
   *
   *   <div {...headerProps} className="overflow-y-auto …">…</div>
   *   <div {...listProps}   className="overflow-y-auto …">…</div>
   *
   * Behaviour of each registered area:
   * - Primarily horizontal movements are intercepted at any scroll position and
   *   handed off to the sheet drag controller (horizontal dismiss path).
   * - While the area is NOT at the top (scrollTop > 0) and the gesture is not
   *   primarily horizontal, all pointer events fall through for normal scrolling.
   * - When the area IS at the top, a downward swipe hands off to the sheet drag
   *   controller; an upward swipe lets the browser scroll the content.
   * - `overscrollBehavior: 'contain'` prevents momentum from bleeding into the
   *   parent sheet on a fast upward fling that reaches the top of the content.
   *
   * Note: the callback ref returned in the props object registers the element
   * into the shared `scrollableElements` set on mount and removes it on unmount.
   * React will call the callback with `null` and then with the element if the
   * props object is recreated between renders — the registration logic handles
   * this correctly (remove-then-add leaves the set state unchanged).
   */
  const makeScrollableAreaProps = useCallback((): ScrollableAreaProps => {
    let registeredEl: HTMLElement | null = null;

    const callbackRef: React.RefCallback<HTMLDivElement> = (el) => {
      if (registeredEl) {
        scrollableElements.current.delete(registeredEl);
      }
      registeredEl = el;
      if (el) {
        scrollableElements.current.add(el);
      }
    };

    const onPointerDown = (e: React.PointerEvent<HTMLElement>) => {
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
    };

    return {
      ref: callbackRef,
      onPointerDown,
      style: {
        touchAction: 'pan-y',
        overscrollBehavior: 'contain',
      } as React.CSSProperties,
    };
  // dragControls is stable for the lifetime of the hook; scrollableElements is a ref.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragControls]);

  /**
   * Props for the primary scrollable content area inside the sheet.
   *
   * This is a convenience alias — identical to calling `makeScrollableAreaProps()`
   * once. For sheets with a single `overflow-y-auto` region, spread these props
   * directly. For sheets with multiple scrollable regions, prefer calling
   * `makeScrollableAreaProps()` once per region instead.
   *
   * Spread on any `overflow-y-auto` container inside the sheet:
   *
   *   <div {...scrollableAreaProps} className="overflow-y-auto …">
   *     …scrollable content…
   *   </div>
   */
  const scrollableAreaProps = makeScrollableAreaProps();

  /**
   * Programmatically snap the sheet to its peek position.
   * Scroll position of the scrollable content area is preserved across the
   * transition so a browser that resets scroll on partial-offscreen entry
   * does not produce a visible jump when the sheet enters the peek state.
   * No-op if `peekHeight` was not provided to the hook.
   */
  const snapToPeek = () => {
    const panel = panelRef.current;
    if (!panel || peekHeight === undefined) return;
    sheetState.current = 'peek';
    animateToPeekPreservingScroll(animate(panel, { y: getPeekOffset(), x: 0 }, spring));
    void animate(dragProgress, 0.5, spring);
    void animate(peekProgress, 1, spring);
  };

  /**
   * Programmatically snap the sheet back to the fully open position.
   * Scroll positions of all registered scrollable areas are preserved across
   * the transition.
   */
  const snapToOpen = () => {
    const panel = panelRef.current;
    if (!panel) return;
    sheetState.current = 'open';
    animateToOpenPreservingScroll(animate(panel, { y: 0, x: 0 }, spring));
    void animate(dragProgress, 0, spring);
    void animate(peekProgress, 0, spring);
  };

  return {
    dragProps,
    handleBarProps,
    /**
     * Props for the primary scrollable area. Convenience alias for
     * `makeScrollableAreaProps()` — identical in behaviour. Provided for
     * backward compatibility; prefer `makeScrollableAreaProps()` when the sheet
     * contains more than one scrollable region.
     */
    scrollableAreaProps,
    /**
     * Factory that creates props for an additional `overflow-y-auto` region.
     * Call once per extra scrollable region at the top level of the component.
     * All areas registered through this factory have their scroll positions
     * preserved alongside the primary `scrollableAreaProps` area.
     */
    makeScrollableAreaProps,
    backdropOpacity,
    sheetScale,
    snapToPeek,
    snapToOpen,
    /** Current sheet state ref — 'open' or 'peek'. Read via .current. */
    sheetState,
    /**
     * MotionValue that goes from 0 (fully open) to 1 (peek position).
     * Animate-driven — safe to use in `motion.div` style props without
     * triggering React re-renders. Use to drive a "swipe up to expand" hint.
     */
    peekProgress,
  };
}
