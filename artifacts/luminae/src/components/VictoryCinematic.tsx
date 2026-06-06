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

// Phase timing constants (ms from mount)
const PHASE_1_MS = 800;   // board-reveal → darkening
const PHASE_2_MS = 1200;  // darkening → civ-in
const PHASE_3_MS = 2000;  // civ-in → accolades
const CONTINUE_BTN_MS = 4500;

// Text reveal delays (seconds from mount, for framer-motion `delay`)
const TITLE_DELAY    = 2.0;
const CIV_DELAY      = 2.4;
const STATS_DELAY    = 2.8;
const ACCOLADE_DELAY = 3.2;

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

  // 0 = board-reveal, 1 = darkening, 2 = civ-in, 3 = accolades
  const [phase, setPhase] = useState(0);

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

  // Phase progression chain + continue button timer
  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), PHASE_1_MS);
    const t2 = setTimeout(() => setPhase(2), PHASE_2_MS);
    const t3 = setTimeout(() => setPhase(3), PHASE_3_MS);
    const tc = setTimeout(() => setShowContinue(true), CONTINUE_BTN_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(tc);
    };
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
    //
    // Phase 0: starts at opacity 0.08, scale 1.05 so the board shows through
    // and appears to zoom out. Phase 1: eases to full opacity and scale 1.
    <motion.div
      initial={{ opacity: 0.08, scale: 1.05 }}
      animate={
        phase >= 1
          ? { opacity: 1, scale: 1 }
          : { opacity: 0.08, scale: 1.05 }
      }
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7, ease: 'easeOut' }}
      className="fixed inset-0 z-[200] flex flex-col items-center justify-end overflow-hidden cursor-pointer"
      onClick={handleDismiss}
      role="presentation"
    >
      {/* Dark veil — fades in at phase 1 to obscure the board before the scene reveals */}
      <motion.div
        className="absolute inset-0 bg-black pointer-events-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase >= 1 ? 0.88 : 0 }}
        transition={{ duration: 0.7, ease: 'easeIn' }}
      />

      {/* KardashevScene — fades in at phase 2 on top of the dark veil */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.04 }}
        animate={
          phase >= 2
            ? { opacity: 1, scale: 1 }
            : { opacity: 0, scale: 1.04 }
        }
        transition={{ duration: 1.4, ease: 'easeOut' }}
      >
        <KardashevScene
          tier={tier}
          palette={palette}
          className="relative w-full h-full overflow-hidden bg-black"
        />
      </motion.div>

      {/* Dark gradient at top so title text is readable over the scene */}
      <div
        className="absolute inset-x-0 top-0 pointer-events-none"
        style={{ height: '45%', background: 'linear-gradient(to bottom, rgba(0,0,0,0.82) 0%, transparent 100%)' }}
      />

      {/* Dark gradient at bottom so stat / button text is readable */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        style={{ height: '55%', background: 'linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%)' }}
      />

      {/* Affinity color bloom — subtle center tint */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 55% 35% at 50% 50%, ${palette.primary}18 0%, transparent 70%)`,
        }}
      />

      {/* ── Title — anchored near top; delayed to ~2.0 s ── */}
      <motion.div
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: TITLE_DELAY, duration: 0.55, ease: 'easeOut' }}
        className="absolute top-8 left-0 right-0 text-center pointer-events-none select-none px-6"
      >
        <h2
          className="text-5xl font-serif font-bold tracking-tight"
          style={{ color: titleColor, textShadow: titleGlow ?? `0 2px 24px rgba(0,0,0,0.8)` }}
        >
          {titleText}
        </h2>
        {!isLocalWinner && !isSpectator && (
          <p className="mt-1 text-sm text-muted-foreground/80">
            {winnerName}&rsquo;s civilization prevails
          </p>
        )}
      </motion.div>

      {/* ── Civilization name + tier — delayed to ~2.4 s ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: CIV_DELAY, duration: 0.45 }}
        className="absolute bottom-[clamp(156px,28%,220px)] left-0 right-0 text-center space-y-1 pointer-events-none select-none"
      >
        <div
          className="text-2xl font-semibold tracking-wide"
          style={{ color: palette.primary, textShadow: `0 0 30px ${palette.primary}66` }}
        >
          {civName}
        </div>
        <div className="text-xs font-mono tracking-widest uppercase text-white/40">
          {TIER_LABELS[tier]}
        </div>
      </motion.div>

      {/* Dialog container — focus trap anchor; does NOT stop click propagation
          so that clicks on content areas also reach the outer onClick handler. */}
      <motion.div
        ref={(el) => { containerRef.current = el; }}
        role="dialog"
        aria-modal="true"
        aria-label={titleText}
        className="relative z-10 flex flex-col items-center w-full max-w-lg px-6 gap-4 pb-safe mb-8"
      >

        {/* Stat lines — delayed to ~2.8 s */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: STATS_DELAY, duration: 0.4 }}
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

        {/* Accolades — first badge at ~3.2 s, per-badge stagger preserved */}
        {accolades.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: ACCOLADE_DELAY, duration: 0.4 }}
            className="flex flex-wrap items-center justify-center gap-2 pointer-events-none select-none"
          >
            {accolades.map((acc, i) => (
              <motion.span
                key={acc.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: ACCOLADE_DELAY + i * 0.1, type: 'spring', stiffness: 260, damping: 20 }}
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

        {/* Continue prompt — appears after 4.5 s; also the first focusable element
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
