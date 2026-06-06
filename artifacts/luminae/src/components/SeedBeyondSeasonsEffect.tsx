import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Palette ───────────────────────────────────────────────────────────────────

const SEED_GREEN  = '#4ade80';
const SEED_TEAL   = '#38bdf8';

// Per-tier accent color (matches tier header colors in the UI)
const TIER_ACCENT: Record<number, string> = {
  1: '#38bdf8', // sky-blue   — Tier 1
  2: '#818cf8', // indigo     — Tier 2
  3: '#fbbf24', // amber      — Tier 3
};

// ─── Timing ───────────────────────────────────────────────────────────────────

// Each tier starts this many ms after the previous one
const TIER_STAGGER_MS = 680;

// Per-tier timeline (relative to tier start)
const T_EMERGE  =   0;   // cards slide up from deck
const T_REVEAL  = 220;   // crossfade back→face
const T_BEAM    = 460;   // energy beam fires
const T_SEAL    = 640;   // SEEDED badge pops in
const T_RECEDE  = 980;   // cards fold back into deck

// Overall: last tier starts at STAGGER*2, ends at STAGGER*2 + T_RECEDE + hold
export const SEED_EFFECT_TOTAL_MS = TIER_STAGGER_MS * 2 + T_RECEDE + 600;
// = 680*2 + 980 + 600 = 2940 ms

// ─── Types ────────────────────────────────────────────────────────────────────

type TierPhase = 'idle' | 'emerge' | 'reveal' | 'beam' | 'seal' | 'recede' | 'done';

interface DeckRect { x: number; y: number; w: number; h: number }

interface TierState {
  phase: TierPhase;
  rect: DeckRect | null;
}

// ─── CardSlot ─────────────────────────────────────────────────────────────────
// One of the two card silhouettes that emerges from the deck.

function CardSlot({
  x, y, w, h,
  tier,
  phase,
  delay,
}: {
  x: number; y: number; w: number; h: number;
  tier: 1 | 2 | 3;
  phase: TierPhase;
  delay: number; // stagger between the two cards in a tier
}) {
  const accent = TIER_ACCENT[tier];
  const isVisible = phase === 'emerge' || phase === 'reveal' || phase === 'beam' || phase === 'seal';
  const showFace  = phase === 'reveal' || phase === 'beam' || phase === 'seal';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key={`card-${tier}-${delay}`}
          style={{
            position: 'fixed',
            left:  x,
            top:   y,
            width: w,
            height: h,
            borderRadius: 5,
            overflow: 'hidden',
            border: `1.5px solid ${showFace ? accent : accent + '55'}`,
            boxShadow: showFace
              ? `0 0 16px ${accent}66, 0 0 6px ${accent}44, inset 0 0 12px ${accent}22`
              : `0 0 4px ${accent}28`,
            background: showFace
              ? `radial-gradient(ellipse at 50% 40%, ${accent}44 0%, ${accent}18 55%, #060612 100%)`
              : `linear-gradient(165deg, #0d0d22 0%, #1a1a30 100%)`,
          }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10, transition: { duration: 0.25 } }}
          transition={{ duration: 0.22, delay: delay / 1000, ease: 'easeOut' }}
        >
          {/* Card face: faceted seed crystal icon */}
          {showFace && (
            <motion.div
              style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.18 }}
            >
              <svg
                viewBox="0 0 32 40"
                width={w * 0.52}
                height={h * 0.52}
                fill="none"
                style={{ filter: `drop-shadow(0 0 4px ${accent})` }}
              >
                {/* Faceted seed crystal */}
                <polygon points="16,2 28,12 24,32 8,32 4,12" fill={accent} opacity="0.25" />
                <polygon points="16,2 28,12 16,20" fill={accent} opacity="0.45" />
                <polygon points="16,2 4,12 16,20" fill={accent} opacity="0.30" />
                <polygon points="28,12 24,32 16,20" fill={accent} opacity="0.35" />
                <polygon points="4,12 8,32 16,20" fill={accent} opacity="0.40" />
                <polygon points="8,32 24,32 16,20" fill={accent} opacity="0.50" />
                {/* Inner glow dot */}
                <circle cx="16" cy="20" r="2.5" fill={accent} opacity="0.8" />
                {/* Sprout lines */}
                <line x1="16" y1="32" x2="16" y2="38" stroke={SEED_GREEN} strokeWidth="1.5" />
                <line x1="16" y1="35" x2="12" y2="32" stroke={SEED_GREEN} strokeWidth="1" />
                <line x1="16" y1="35" x2="20" y2="32" stroke={SEED_GREEN} strokeWidth="1" />
              </svg>
            </motion.div>
          )}

          {/* Back: subtle grid lines */}
          {!showFace && (
            <svg
              viewBox="0 0 32 40"
              width="100%" height="100%"
              style={{ opacity: 0.18, position: 'absolute', inset: 0 }}
            >
              <line x1="8"  y1="0"  x2="8"  y2="40" stroke={accent} strokeWidth="0.5" />
              <line x1="16" y1="0"  x2="16" y2="40" stroke={accent} strokeWidth="0.5" />
              <line x1="24" y1="0"  x2="24" y2="40" stroke={accent} strokeWidth="0.5" />
              <line x1="0"  y1="10" x2="32" y2="10" stroke={accent} strokeWidth="0.5" />
              <line x1="0"  y1="20" x2="32" y2="20" stroke={accent} strokeWidth="0.5" />
              <line x1="0"  y1="30" x2="32" y2="30" stroke={accent} strokeWidth="0.5" />
            </svg>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── EnergyBeam ───────────────────────────────────────────────────────────────
// Vertical beam of seed energy raining down into the deck.

function EnergyBeam({ cx, deckTop, deckH }: { cx: number; deckTop: number; deckH: number }) {
  const beamH = 160;
  return (
    <AnimatePresence>
      <motion.div
        key="beam"
        style={{
          position: 'fixed',
          left:  cx - 4,
          top:   deckTop - beamH + 10,
          width: 8,
          height: beamH + deckH * 0.6,
          background: `linear-gradient(to bottom,
            transparent 0%,
            ${SEED_TEAL}88 25%,
            ${SEED_GREEN}ee 60%,
            ${SEED_GREEN}ff 80%,
            transparent 100%)`,
          borderRadius: 4,
          filter: `blur(1.5px)`,
          transformOrigin: 'top center',
        }}
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        exit={{ opacity: 0, scaleY: 0, transition: { duration: 0.2 } }}
        transition={{ duration: 0.28, ease: 'easeOut' }}
      />
    </AnimatePresence>
  );
}

// ─── ImpactSpark ──────────────────────────────────────────────────────────────

function ImpactSpark({ cx, y }: { cx: number; y: number }) {
  return (
    <motion.div
      style={{
        position: 'fixed',
        left: cx - 18,
        top:  y - 18,
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${SEED_GREEN}ff 0%, ${SEED_TEAL}88 50%, transparent 80%)`,
        filter: 'blur(4px)',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{
        scale:   [0, 1.8, 1.0, 0],
        opacity: [0, 1.0, 0.7, 0],
      }}
      transition={{ duration: 0.45, times: [0, 0.25, 0.65, 1], ease: 'easeOut' }}
    />
  );
}

// ─── SeededBadge ──────────────────────────────────────────────────────────────

function SeededBadge({ cx, cy }: { cx: number; cy: number }) {
  return (
    <motion.div
      style={{
        position: 'fixed',
        left: cx - 32,
        top:  cy - 13,
        width: 64,
        height: 26,
        borderRadius: 13,
        background: 'rgba(4,12,8,0.90)',
        border: `1.5px solid ${SEED_GREEN}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        boxShadow: `0 0 12px ${SEED_GREEN}66, 0 0 4px ${SEED_GREEN}44`,
        zIndex: 1,
      }}
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.7, transition: { duration: 0.2 } }}
      transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {/* Tiny sprout SVG */}
      <svg viewBox="0 0 12 14" width={10} height={12} fill="none">
        <path d="M6 13V7" stroke={SEED_GREEN} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M6 7C6 7 3 5 3 2a3 3 0 0 1 3 0" fill={SEED_GREEN} opacity="0.9" />
        <path d="M6 7C6 7 9 5 9 2a3 3 0 0 0-3 0" fill={SEED_GREEN} opacity="0.6" />
      </svg>
      <span style={{
        fontSize: 7,
        fontWeight: 800,
        letterSpacing: '0.14em',
        color: SEED_GREEN,
        textTransform: 'uppercase' as const,
        fontFamily: 'sans-serif',
        lineHeight: 1,
      }}>
        SEEDED
      </span>
    </motion.div>
  );
}

// ─── SeedBeyondSeasonsEffect ──────────────────────────────────────────────────

export function SeedBeyondSeasonsEffect({ onComplete }: { onComplete: () => void }) {
  const [tiers, setTiers] = useState<Record<1 | 2 | 3, TierState>>({
    1: { phase: 'idle', rect: null },
    2: { phase: 'idle', rect: null },
    3: { phase: 'idle', rect: null },
  });

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    // Measure deck tile screen positions (board is already scaled to 0.5 — getBoundingClientRect
    // returns the scaled visual position, so we can use it directly).
    const rects: Record<number, DeckRect | null> = { 1: null, 2: null, 3: null };
    for (const t of [1, 2, 3]) {
      const el = document.querySelector(`[data-deck-tier="${t}"]`) as HTMLElement | null;
      if (el) {
        const r = el.getBoundingClientRect();
        rects[t] = { x: r.left, y: r.top, w: r.width, h: r.height };
      }
    }

    const timers: ReturnType<typeof setTimeout>[] = [];

    const scheduleTier = (tier: 1 | 2 | 3, startOffset: number) => {
      const rect = rects[tier];
      const advance = (phase: TierPhase, relativeMs: number) => {
        timers.push(setTimeout(() => {
          setTiers(prev => ({
            ...prev,
            [tier]: { phase, rect },
          }));
        }, startOffset + relativeMs));
      };
      advance('emerge', T_EMERGE);
      advance('reveal', T_REVEAL);
      advance('beam',   T_BEAM);
      advance('seal',   T_SEAL);
      advance('recede', T_RECEDE);
    };

    scheduleTier(1, 0);
    scheduleTier(2, TIER_STAGGER_MS);
    scheduleTier(3, TIER_STAGGER_MS * 2);

    timers.push(setTimeout(() => onCompleteRef.current(), SEED_EFFECT_TOTAL_MS));

    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 8920 }}>
      {([1, 2, 3] as const).map(tier => {
        const { phase, rect } = tiers[tier];
        if (phase === 'idle' || phase === 'recede' || !rect) return null;

        const { x, y, w, h } = rect;
        const accent = TIER_ACCENT[tier];
        const cardW = Math.max(w * 0.78, 38);
        const cardH = Math.max(h * 0.90, 54);
        const cx    = x + w / 2;
        const topY  = y - cardH * 0.25; // emerge upward from deck

        const showBeam  = phase === 'beam' || phase === 'seal';
        const showSeal  = phase === 'seal';

        return (
          <React.Fragment key={tier}>
            {/* ── Two cards fan out from the deck ── */}
            <CardSlot
              x={cx - cardW * 1.1}
              y={topY}
              w={cardW} h={cardH}
              tier={tier} phase={phase} delay={0}
            />
            <CardSlot
              x={cx + cardW * 0.1}
              y={topY}
              w={cardW} h={cardH}
              tier={tier} phase={phase} delay={130}
            />

            {/* ── Energy beam raining into deck ── */}
            {showBeam && (
              <EnergyBeam cx={cx} deckTop={y} deckH={h} />
            )}

            {/* ── Impact spark where beam hits deck ── */}
            <AnimatePresence>
              {phase === 'beam' && (
                <ImpactSpark key={`spark-${tier}`} cx={cx} y={y + h * 0.5} />
              )}
            </AnimatePresence>

            {/* ── Colored ring pulse at deck tile ── */}
            <AnimatePresence>
              {showBeam && (
                <motion.div
                  key={`ring-${tier}`}
                  style={{
                    position: 'fixed',
                    left:   cx - w * 0.8,
                    top:    y - h * 0.15,
                    width:  w * 1.6,
                    height: h * 1.3,
                    borderRadius: 8,
                    border: `2px solid ${accent}`,
                    boxShadow: `0 0 18px ${accent}66`,
                  }}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: [0, 0.7, 0] }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                />
              )}
            </AnimatePresence>

            {/* ── SEEDED badges on each card ── */}
            <AnimatePresence>
              {showSeal && (
                <>
                  <SeededBadge key={`seal1-${tier}`} cx={cx - cardW * 0.55} cy={topY + cardH / 2} />
                  <SeededBadge key={`seal2-${tier}`} cx={cx + cardW * 0.60} cy={topY + cardH / 2} />
                </>
              )}
            </AnimatePresence>
          </React.Fragment>
        );
      })}
    </div>
  );
}
