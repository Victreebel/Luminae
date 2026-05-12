import { useDragControls, animate, useMotionValue, useTransform } from 'framer-motion';
import type { PanInfo, Transition } from 'framer-motion';
import type React from 'react';

const DEFAULT_SPRING: Transition = {
  type: 'spring',
  damping: 28,
  stiffness: 300,
};

/**
 * Returns framer-motion drag props for a bottom-sheet panel and pointer-down
 * props for the drag handle bar.
 *
 * Usage:
 *   const { dragProps, handleBarProps, backdropOpacity, sheetScale } = useSwipeToDismiss(panelRef, onClose);
 *
 *   // Outer wrapper (backdrop container):
 *   <motion.div ...>
 *     <motion.div style={{ opacity: backdropOpacity }} className="absolute inset-0 bg-black/60 ..." />
 *     <motion.div {...dragProps} style={{ scale: sheetScale }} ref={panelRef} …>
 *       <div {...handleBarProps} className="flex justify-center pt-3 pb-1">
 *         <div className="w-10 h-1 rounded-full bg-border" />
 *       </div>
 *       …scrollable content…
 *     </motion.div>
 *   </motion.div>
 *
 * Dragging starts only when the user touches/clicks the handle bar, so
 * scrollable content inside the panel is never captured by the drag listener.
 * Releasing with a downward offset > `threshold * panelHeight` or a fast flick
 * (velocity.y > 500 px/s) triggers `onDismiss`. Aborted drags spring back
 * smoothly using the same spring config as the entry animation, using
 * framer-motion's imperative animate so AnimatePresence entry/exit are
 * unaffected.
 *
 * Live visual feedback (motion values, never trigger re-renders):
 *   - `backdropOpacity` — dims the backdrop as the user drags toward threshold (1 → 0.45)
 *   - `sheetScale`      — slightly shrinks the panel during a partial drag (1 → 0.97)
 * Both values animate back to their resting state on a sub-threshold release
 * using the same spring as the panel snap-back.
 *
 * @param springConfig - Optional spring overrides for the snap-back animation.
 *   Defaults to { damping: 28, stiffness: 300 }, matching the open/close spring.
 */
export function useSwipeToDismiss(
  panelRef: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
  threshold = 0.3,
  springConfig?: Transition,
) {
  const dragControls = useDragControls();

  const spring: Transition = { ...DEFAULT_SPRING, ...springConfig };

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
    // Clamp to [0, 1] so we don't over-dim the backdrop past the threshold
    const progress = Math.min(1, Math.max(0, info.offset.y / (panelHeight * threshold)));
    dragProgress.set(progress);
  };

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const panel = panelRef.current;
    const panelHeight = panel ? panel.getBoundingClientRect().height : 600;
    if (info.offset.y > panelHeight * threshold || info.velocity.y > 500) {
      // Reset feedback immediately before dismiss so the next open starts clean.
      // The sheet subtree unmounts via AnimatePresence but the hook instance
      // stays alive for the lifetime of the parent, so an explicit reset is required.
      dragProgress.set(0);
      onDismiss();
    } else if (panel) {
      // Sub-threshold: spring the panel back and animate the feedback values together
      void animate(panel, { y: 0 }, spring);
      void animate(dragProgress, 0, spring);
    }
  };

  const dragProps = {
    drag: 'y' as const,
    dragControls,
    dragListener: false as const,
    dragConstraints: { top: 0, bottom: 0 },
    dragElastic: { top: 0, bottom: 0 },
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

  return { dragProps, handleBarProps, backdropOpacity, sheetScale };
}
