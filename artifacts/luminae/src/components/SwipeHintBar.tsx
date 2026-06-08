import { motion, AnimatePresence } from 'framer-motion';
import type { MotionValue } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { markHintSeen } from '@/lib/cinematicPrefs';

const STORAGE_KEY = 'luminae_swipe_hint_seen';

/** How long the "swipe up to expand" nudge stays visible after the sheet snaps to peek (ms). */
const PEEK_HINT_DURATION = 2000;

interface SwipeHintBarProps {
  /**
   * MotionValue (0 = fully open, 1 = peek position) returned by
   * useSwipeToDismiss. When provided, a "swipe up to expand" chevron
   * fades in on the handle bar whenever the sheet enters peek state, then
   * auto-fades after ~2 s so it is not distracting during repeated use.
   */
  peekProgress?: MotionValue<number>;
}

/**
 * One-time animated hint shown on the drag-handle bar the first time any
 * bottom-sheet opens.  Persisted in localStorage so it never repeats.
 *
 * When `peekProgress` is supplied the component also shows a brief
 * "swipe up to expand" nudge that fades in each time the sheet snaps to
 * the peek state and auto-fades after ~2 s.
 *
 * Drop this component inside any handle-bar div, below the pill indicator.
 */
export function SwipeHintBar({ peekProgress }: SwipeHintBarProps) {
  const [dismissVisible, setDismissVisible] = useState(false);
  const [peekHintVisible, setPeekHintVisible] = useState(false);
  const peekTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    markHintSeen(STORAGE_KEY);
    setDismissVisible(true);
    const t = setTimeout(() => setDismissVisible(false), 2800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!peekProgress) return;

    // Track prior peeking state so we only trigger the hint on the
    // transition into peek, not on every peekProgress update while already
    // in peek (which would repeatedly reset the auto-fade timer during spring
    // settlement or live drag updates).
    let wasPeeking = peekProgress.get() > 0.5;

    const showHintBriefly = () => {
      setPeekHintVisible(true);
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
      peekTimerRef.current = setTimeout(() => {
        setPeekHintVisible(false);
      }, PEEK_HINT_DURATION);
    };

    const handleChange = (v: number) => {
      const nowPeeking = v > 0.5;
      if (nowPeeking && !wasPeeking) {
        // Crossed into peek — start the timed nudge.
        showHintBriefly();
      } else if (!nowPeeking && wasPeeking) {
        // Left peek (re-opened or dismissed) — hide immediately.
        if (peekTimerRef.current) {
          clearTimeout(peekTimerRef.current);
          peekTimerRef.current = null;
        }
        setPeekHintVisible(false);
      }
      wasPeeking = nowPeeking;
    };

    // Initialise: if the sheet is already peeking when this effect first runs,
    // show the hint straight away.
    if (wasPeeking) showHintBriefly();

    const unsub = peekProgress.on('change', handleChange);
    return () => {
      unsub();
      if (peekTimerRef.current) clearTimeout(peekTimerRef.current);
    };
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
        {peekHintVisible && (
          <motion.div
            key="peek-hint"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4, transition: { duration: 0.35 } }}
            transition={{ duration: 0.3 }}
            className="flex items-center gap-1 text-xs text-muted-foreground select-none pointer-events-none"
            aria-hidden="true"
          >
            <motion.span
              animate={{ y: [0, -4, 0] }}
              transition={{ repeat: 3, duration: 1.1, ease: 'easeInOut', delay: 0.2 }}
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
