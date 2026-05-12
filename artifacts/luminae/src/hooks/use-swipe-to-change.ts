import { useRef, useCallback } from 'react';

const SWIPE_THRESHOLD_PX = 60;
const VERTICAL_RATIO_MAX = 0.7;

/**
 * Returns touch event props for a scrollable container that should also
 * respond to horizontal swipe gestures.
 *
 * Horizontal swipes that are clearly more horizontal than vertical (ratio check)
 * and exceed the distance threshold call `onNext` (swipe left) or `onPrev`
 * (swipe right). Vertical scrolling is never blocked.
 *
 * Usage:
 *   const { tabSwipeProps } = useSwipeToChange(onNext, onPrev);
 *   <div {...tabSwipeProps}>…</div>
 */
export function useSwipeToChange(onNext: () => void, onPrev: () => void) {
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    const t = e.touches[0];
    startRef.current = { x: t.clientX, y: t.clientY };
  }, []);

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!startRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - startRef.current.x;
      const dy = t.clientY - startRef.current.y;
      startRef.current = null;

      if (Math.abs(dx) < SWIPE_THRESHOLD_PX) return;
      if (Math.abs(dy) > Math.abs(dx) * VERTICAL_RATIO_MAX) return;

      if (dx < 0) onNext();
      else onPrev();
    },
    [onNext, onPrev],
  );

  const tabSwipeProps = { onTouchStart, onTouchEnd };
  return { tabSwipeProps };
}
