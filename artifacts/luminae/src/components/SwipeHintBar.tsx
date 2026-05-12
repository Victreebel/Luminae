import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'luminae_swipe_hint_seen';

/**
 * One-time animated hint shown on the drag-handle bar the first time any
 * bottom-sheet opens.  Persisted in localStorage so it never repeats.
 *
 * Drop this component inside any handle-bar div, below the pill indicator.
 */
export function SwipeHintBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(true);
    const t = setTimeout(() => setVisible(false), 2800);
    return () => clearTimeout(t);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
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
  );
}
