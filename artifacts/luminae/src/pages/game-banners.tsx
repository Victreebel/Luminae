import { useEffect, type RefObject } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, X } from 'lucide-react';

export function ConnectionLostBanner({ onDismiss }: { onDismiss: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
      role="status"
      aria-live="polite"
      className="fixed top-0 left-0 right-0 z-[500] flex items-center justify-between gap-3 px-4 py-2.5"
      style={{
        background: 'rgba(15, 6, 30, 0.97)',
        borderBottom: '1px solid rgba(139, 92, 246, 0.35)',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.6)',
        paddingTop: 'calc(0.625rem + env(safe-area-inset-top, 0px))',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin text-violet-400" aria-hidden="true" />
        <span className="text-xs font-semibold text-violet-200 truncate">
          Connection lost — reconnecting…
        </span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss connection warning"
        className="shrink-0 text-violet-400/70 hover:text-violet-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 rounded"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

export function ReturnResultsBanner({
  bannerRef,
  onReturn,
}: {
  bannerRef: RefObject<HTMLButtonElement | null>;
  onReturn: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onReturn();
      }
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [onReturn]);

  return (
    <motion.button
      ref={bannerRef}
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.25 }}
      onClick={onReturn}
      role="button"
      aria-label="Return to results"
      className="fixed top-3 left-1/2 -translate-x-1/2 z-[300] flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold text-foreground/80 border border-white/15 bg-black/85 hover:bg-black/90 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30 shadow-lg"
    >
      <span>←</span>
      Results
    </motion.button>
  );
}
