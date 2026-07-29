import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArtifactCardView } from './game-card';

// --- Compact Forge ghost: fire-and-forget portal that escapes overflow containers ---
// Accepts the chip's pre-measured DOMRect so it doesn't need to touch the DOM itself.
// Self-destructs after the animation finishes via onDone — it is NOT tied to flippingCards,
// so the pre-cleanup that clears flippingCards on the next action cannot kill it early.
export function CompactCardGhost({
  cardViewProps,
  chipRect,
  onDone,
}: {
  cardViewProps: React.ComponentProps<typeof ArtifactCardView>;
  chipRect: DOMRect;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    // delay(0.5s) + duration(5s) + buffer(300ms) — fires once on mount; key ensures remount per ghost
    const t = setTimeout(() => onDoneRef.current(), 5800);
    return () => clearTimeout(t);
  }, []);

  return createPortal(
    <motion.div
      className="pointer-events-none rounded-xl overflow-hidden"
      style={{
        position: 'fixed',
        top: chipRect.top - 170,
        left: chipRect.left,
        width: 'var(--card-w)',
        height: 'var(--card-h)',
        transformOrigin: 'top left',
        zIndex: 9999,
      }}
      initial={{ scale: 1, y: 0, opacity: 1 }}
      animate={{ scale: 0.47, y: 170, opacity: 0 }}
      transition={{ duration: 5, delay: 0.5, ease: 'linear' }}
    >
      <ArtifactCardView {...cardViewProps} />
    </motion.div>,
    document.body,
  );
}
