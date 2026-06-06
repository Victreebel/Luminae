import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KardashevScene } from '@/components/KardashevScene';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import type { KardashevTier, AffinityPalette } from '@/lib/kardashev';
import type { Accolade } from '@/lib/accolades';

export interface VictoryCinematicProps {
  winnerName: string;
  isLocalWinner: boolean;
  isSpectator: boolean;
  civName: string;
  tier: KardashevTier;
  palette: AffinityPalette;
  lumens: number;
  cardsForged: number;
  accolades: Accolade[];
  onDismiss: () => void;
}

const TIER_LABELS: Record<KardashevTier, string> = {
  0: 'Type 0 — Terrestrial',
  1: 'Type I — Planetary',
  2: 'Type II — Stellar',
  3: 'Type III — Galactic',
};

export function VictoryCinematic({
  winnerName,
  isLocalWinner,
  isSpectator,
  civName,
  tier,
  palette,
  lumens,
  cardsForged,
  accolades,
  onDismiss,
}: VictoryCinematicProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const [showContinue, setShowContinue] = useState(false);
  const dismissedRef = useRef(false);

  // useFocusTrap handles: Tab cycling, Escape → onDismiss.
  // handleEscape: false because we add our own document listener below that
  // handles Escape together with Enter/Space in one place.
  useFocusTrap(containerRef, true, onDismiss, { handleEscape: false });

  const handleDismiss = () => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDismiss();
  };

  // Document-level listener for Enter / Space / Escape so the cinematic can be
  // dismissed by keyboard at any time — even before the Continue button appears
  // (when there is no focusable element inside the trap for React onKeyDown).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleDismiss();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const tid = setTimeout(() => setShowContinue(true), 2500);
    return () => clearTimeout(tid);
  }, []);

  const titleText = isLocalWinner
    ? 'Victory'
    : isSpectator
      ? `${winnerName} Wins`
      : 'Defeat';

  const titleColor = isLocalWinner
    ? palette.primary
    : isSpectator
      ? palette.primary
      : 'hsl(var(--muted-foreground))';

  const titleGlow = isLocalWinner
    ? `0 0 40px ${palette.primary}88, 0 0 80px ${palette.primary}44`
    : undefined;

  return (
    // Outer overlay — clicking anywhere (including through the dialog content)
    // dismisses the cinematic. stopPropagation is intentionally omitted so
    // clicks on the scene, text, and accolade badges all bubble up here.
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.55 }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden cursor-pointer"
      style={{ background: 'radial-gradient(ellipse at 50% 40%, #06040f 0%, #000000 100%)' }}
      onClick={handleDismiss}
      role="presentation"
    >
      {/* Vignette edges */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 85% 70% at 50% 45%, transparent 30%, rgba(0,0,0,0.75) 100%)`,
        }}
      />

      {/* Affinity color bloom behind scene */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 40% at 50% 42%, ${palette.primary}1a 0%, transparent 65%)`,
        }}
      />

      {/* Dialog container — focus trap anchor; does NOT stop click propagation
          so that clicks on content areas also reach the outer onClick handler. */}
      <motion.div
        ref={(el) => { containerRef.current = el; }}
        role="dialog"
        aria-modal="true"
        aria-label={titleText}
        className="relative z-10 flex flex-col items-center w-full max-w-lg px-6 gap-5"
      >
        {/* Title card */}
        <motion.div
          initial={{ opacity: 0, y: -18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="text-center pointer-events-none select-none"
        >
          <h2
            className="text-5xl font-serif font-bold tracking-tight"
            style={{ color: titleColor, textShadow: titleGlow }}
          >
            {titleText}
          </h2>
          {!isLocalWinner && !isSpectator && (
            <p className="mt-1 text-sm text-muted-foreground">
              {winnerName}&rsquo;s civilization prevails
            </p>
          )}
        </motion.div>

        {/* KardashevScene — winner's observatory */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
          className="w-full rounded-2xl overflow-hidden"
          style={{
            boxShadow: `0 0 0 1px ${palette.primary}33, 0 8px 48px ${palette.primary}22`,
          }}
        >
          <div style={{ height: 'clamp(180px, 30vh, 280px)' }}>
            <KardashevScene tier={tier} palette={palette} />
          </div>
        </motion.div>

        {/* Civilization name + tier */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.45 }}
          className="text-center space-y-1 pointer-events-none select-none"
        >
          <div
            className="text-xl font-semibold tracking-wide"
            style={{ color: palette.primary }}
          >
            {civName}
          </div>
          <div className="text-xs font-mono tracking-widest uppercase text-muted-foreground/60">
            {TIER_LABELS[tier]}
          </div>
        </motion.div>

        {/* Stat lines */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.4 }}
          className="flex items-center gap-5 text-sm pointer-events-none select-none"
        >
          <span className="flex flex-col items-center gap-0.5">
            <span
              className="text-2xl font-bold tabular-nums"
              style={{ color: palette.primary }}
            >
              {lumens}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
              Eminence
            </span>
          </span>
          <span className="w-px h-8 bg-white/10 rounded-full" />
          <span className="flex flex-col items-center gap-0.5">
            <span className="text-2xl font-bold tabular-nums text-foreground/70">
              {cardsForged}
            </span>
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60">
              Forged
            </span>
          </span>
        </motion.div>

        {/* Accolades */}
        {accolades.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.75, duration: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-2 pointer-events-none select-none"
          >
            {accolades.map((acc, i) => (
              <motion.span
                key={acc.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.8 + i * 0.1, type: 'spring', stiffness: 260, damping: 20 }}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium"
                style={{
                  background: `${palette.primary}18`,
                  border: `1px solid ${palette.primary}33`,
                  color: palette.accent,
                }}
              >
                <span>{acc.icon}</span>
                <span>{acc.label}</span>
              </motion.span>
            ))}
          </motion.div>
        )}

        {/* Continue prompt — appears after 2.5 s; also the first focusable element
            the focus trap will find (Enter/Space also works via the document listener). */}
        <AnimatePresence>
          {showContinue && (
            <motion.button
              key="continue-btn"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              onClick={handleDismiss}
              className="mt-1 flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold text-foreground/70 border border-white/10 bg-white/5 hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              Continue
              <span className="text-muted-foreground/50">→</span>
            </motion.button>
          )}
        </AnimatePresence>

        {/* Hint text before continue button */}
        {!showContinue && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            className="text-[11px] text-muted-foreground pointer-events-none select-none"
          >
            tap anywhere to continue
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
