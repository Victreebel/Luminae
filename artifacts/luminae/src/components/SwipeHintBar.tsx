import { motion, AnimatePresence } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'luminae_swipe_hint_seen';

interface SwipeHintBarProps {
  /**
   * MotionValue (0 = fully open, 1 = peek position) returned by
   * useSwipeToDismiss. When provided, a "swipe up to expand" chevron
   * fades in while the sheet is in the peek state and fades out once
   * the sheet is dragged fully open or dismissed.
   */
  peekProgress?: MotionValue<number>;
}

/**
 * One-time animated hint shown on the drag-handle bar the first time any
 * bottom-sheet opens.  Persisted in localStorage so it never repeats.
 *
 * When `peekProgress` is supplied the component also shows a persistent
 * "swipe up to expand" chevron that is visible only while the sheet is in
 * the peek (half-open) state.
 *
 * Drop this component inside any handle-bar div, below the pill indicator.
 */
export function SwipeHintBar({ peekProgress }: SwipeHintBarProps) {
  const [dismissVisible, setDismissVisible] = useState(false);
  const [isPeeking, setIsPeeking] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    localStorage.setItem(STORAGE_KEY, '1');
    setDismissVisible(true);
    const t = setTimeout(() => setDismissVisible(false), 2800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!peekProgress) return;
    // Initialize from the current value so the indicator is correct even if
    // the motion value is already at 1 when this effect first runs (e.g. the
    // component mounts after the sheet has already snapped to peek).
    setIsPeeking(peekProgress.get() > 0.5);
    const unsub = peekProgress.on('change', (v) => {
      setIsPeeking(v > 0.5);
    });
    return unsub;
  }, [peekProgress]);

  return (
    <>
      <AnimatePresence>
        {dismissVisible && (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.4 } }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-1 text-xs text-muted-foreground select-none pointer-events-none"
            aria-hidden="true"
          >
            <motion.span
              animate={{ y: [0, 4, 0] }}
              transition={{ repeat: 3, duration: 0.55, ease: 'easeInOut', delay: 0.3 }}
            >
              <ChevronDown className="h-3 w-3" />
            </motion.span>
            <span>swipe down to close</span>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPeeking && (
          <motion.div
            key="peek-hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.25 } }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-1 text-xs text-muted-foreground select-none pointer-events-none"
            aria-hidden="true"
          >
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: Infinity, duration: 1.1, ease: 'easeInOut', delay: 0.2 }}
            >
              <ChevronUp className="h-3 w-3" />
            </motion.span>
            <span>swipe up to expand</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
