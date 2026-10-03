import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Orbit } from 'lucide-react';
import { KardashevScene } from '@/components/KardashevScene';
import { useFocusTrap } from '@/hooks/use-focus-trap';
import type { KardashevTier, AffinityPalette } from '@/lib/kardashev';
import type { Accolade } from '@/lib/accolades';
import type { CivilizationProfile } from '@/lib/civilizationProfile';

export interface VictoryCinematicProps {
  winnerName: string;
  isLocalWinner: boolean;
  isSpectator: boolean;
  civName: string;
  tier: KardashevTier;
  palette: AffinityPalette;
  civilizationProfile?: CivilizationProfile;
  eminence: number;
  cardsForged: number;
  legacyWinnerName?: string | null;
  isLocalLegacyWinner?: boolean;
  isAbsoluteVictory?: boolean;
  legacyCompletedCriteria?: number;
  legacyRequiredCriteria?: number;
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
export const PHASE_1_MS = 800;   // board-reveal → darkening
export const PHASE_2_MS = 1200;  // darkening → civ-in
export const PHASE_3_MS = 2000;  // civ-in → accolades
export const CONTINUE_BTN_MS = 4500;

// Text reveal delays (seconds from mount, for framer-motion `delay`)
export const TITLE_DELAY    = 2.0;
export const CIV_DELAY      = 2.4;
export const STATS_DELAY    = 2.8;
export const ACCOLADE_DELAY = 3.2;

export function VictoryCinematic({
  winnerName,
  isLocalWinner,
  isSpectator,
  civName,
  tier,
  palette,
  civilizationProfile,
  eminence,
  cardsForged,
  legacyWinnerName = null,
  isLocalLegacyWinner = false,
  isAbsoluteVictory = false,
  legacyCompletedCriteria = 0,
  legacyRequiredCriteria = 4,
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

  const titleText = isAbsoluteVictory
    ? isLocalWinner
      ? 'Absolute Victory'
      : isSpectator
        ? `${winnerName}: Absolute Victory`
        : 'Defeat'
    : isLocalWinner
      ? 'Victory'
      : isLocalLegacyWinner
        ? 'Legacy Victory'
        : isSpectator
          ? `${winnerName} Wins`
          : 'Defeat';

  const titleColor = isAbsoluteVictory && isLocalWinner
    ? '#fff1b8'
    : isLocalLegacyWinner && !isLocalWinner
      ? '#d9f8ff'
      : isLocalWinner
        ? palette.primary
    : isSpectator
      ? palette.primary
      : 'hsl(var(--muted-foreground))';

  const titleGlow = isAbsoluteVictory && isLocalWinner
    ? '0 0 28px rgba(255,239,176,0.9), 0 0 70px rgba(129,230,255,0.44)'
    : isLocalLegacyWinner && !isLocalWinner
      ? '0 0 34px rgba(145,232,255,0.65)'
      : isLocalWinner
        ? `0 0 40px ${palette.primary}88, 0 0 80px ${palette.primary}44`
    : undefined;

  return (
    // Outer overlay — clicking anywhere dismisses the cinematic. Keep this layer
    // static: animating opacity/scale on the full-screen parent forces the entire
    // game view and overlay stack through one expensive compositor transition.
	    <motion.div
	      data-testid="victory-cinematic"
	      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
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

      {/* KardashevScene — the pre-results civilization beat should remain alive,
          but at a capped budget so it does not fight the final results overlay. */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={
          phase >= 2
            ? { opacity: 1 }
            : { opacity: 0 }
        }
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <KardashevScene
          tier={tier}
          palette={palette}
          profile={civilizationProfile}
          className="relative w-full h-full overflow-hidden bg-black"
          fps={30}
          maxDpr={1.25}
          allowMobileMotion
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
          background: isAbsoluteVictory
            ? `radial-gradient(ellipse 55% 35% at 50% 50%, rgba(255,231,151,0.18) 0%, ${palette.primary}14 42%, transparent 72%)`
            : `radial-gradient(ellipse 55% 35% at 50% 50%, ${palette.primary}18 0%, transparent 70%)`,
        }}
      />

      {isAbsoluteVictory && (
        <motion.div
          className="pointer-events-none absolute left-1/2 top-1/2 aspect-square w-[min(72vw,72vh)] -translate-x-1/2 -translate-y-1/2 rounded-full border border-amber-100/20"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.65, 0.32], scale: 1 }}
          transition={{ delay: 1.65, duration: 1.5, ease: 'easeOut' }}
          aria-hidden="true"
        />
      )}

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
            {winnerName} claimed the Eminence Victory
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
	        data-testid="victory-cinematic-card"
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
              {eminence}
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
          {isAbsoluteVictory && (
            <>
              <span className="h-8 w-px rounded-full bg-white/10" />
              <span className="flex flex-col items-center gap-0.5">
                <span className="text-2xl font-bold tabular-nums text-cyan-50">
                  {legacyCompletedCriteria}
                  <span className="text-sm text-cyan-100/45">/{legacyRequiredCriteria}</span>
                </span>
                <span className="text-[10px] uppercase tracking-widest text-cyan-100/55">
                  Legacy
                </span>
              </span>
            </>
          )}
        </motion.div>

        {legacyWinnerName && !isAbsoluteVictory && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 3.05, duration: 0.4 }}
            className="flex w-full max-w-sm items-center gap-3 border border-cyan-100/20 bg-cyan-200/[0.055] px-3 py-2.5 text-left pointer-events-none select-none"
            aria-label={`Legacy Victory: ${legacyWinnerName}`}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center border border-cyan-100/25 text-cyan-100">
              <Orbit className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-cyan-100/55">
                Legacy Victory
              </span>
              <strong className="block truncate text-sm text-cyan-50">{legacyWinnerName}</strong>
            </span>
            <span className="ml-auto shrink-0 font-serif text-lg text-cyan-50/80">
              {legacyCompletedCriteria}
              <span className="text-xs text-cyan-100/35">/{legacyRequiredCriteria} conditions</span>
            </span>
          </motion.div>
        )}

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

        {/* Continue prompt — appears after 4.5 s */}
        <AnimatePresence>
          {showContinue && (
            <motion.div
              key="action-btns"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="mt-1 flex items-center gap-3"
            >
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  handleDismiss();
                }}
                className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-bold text-white border border-white/25 bg-white/14 shadow-[0_0_24px_rgba(255,255,255,0.16)] hover:bg-white/20 hover:border-white/35 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/45"
              >
                Continue
                <span className="text-white/75">→</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Hint text before continue button */}
        {!showContinue && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            className="text-[11px] text-muted-foreground pointer-events-none select-none"
          >
            click/tap anywhere to continue
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
