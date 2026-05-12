import { useDragControls } from 'framer-motion';
import type { PanInfo } from 'framer-motion';
import type React from 'react';

/**
 * Returns framer-motion drag props for a bottom-sheet panel and pointer-down
 * props for the drag handle bar.
 *
 * Usage:
 *   const { dragProps, handleBarProps } = useSwipeToDismiss(panelRef, onClose);
 *
 *   <motion.div {...dragProps} ref={panelRef} …>
 *     <div {...handleBarProps} className="flex justify-center pt-3 pb-1">
 *       <div className="w-10 h-1 rounded-full bg-border" />
 *     </div>
 *     …scrollable content…
 *   </motion.div>
 *
 * Dragging starts only when the user touches/clicks the handle bar, so
 * scrollable content inside the panel is never captured by the drag listener.
 * Releasing with a downward offset > `threshold * panelHeight` or a fast flick
 * (velocity.y > 500 px/s) triggers `onDismiss`.
 */
export function useSwipeToDismiss(
  panelRef: React.RefObject<HTMLElement | null>,
  onDismiss: () => void,
  threshold = 0.3,
) {
  const dragControls = useDragControls();

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    const panel = panelRef.current;
    const panelHeight = panel ? panel.getBoundingClientRect().height : 600;
    if (info.offset.y > panelHeight * threshold || info.velocity.y > 500) {
      onDismiss();
    }
  };

  const dragProps = {
    drag: 'y' as const,
    dragControls,
    dragListener: false as const,
    dragConstraints: { top: 0, bottom: 0 },
    dragElastic: { top: 0, bottom: 0.5 },
    onDragEnd: handleDragEnd,
  };

  const handleBarProps = {
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      dragControls.start(e);
    },
    style: { touchAction: 'none', cursor: 'grab' } as React.CSSProperties,
  };

  return { dragProps, handleBarProps };
}
