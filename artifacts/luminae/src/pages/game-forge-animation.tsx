/**
 * ForgeAnimation — local player stamp-and-fly sequence.
 * OpponentForgeAnimation — full-view opponent forge, structurally identical to
 *   ForgeAnimation; only the arc destination differs (chip pill vs Civ tab).
 *
 * Both follow the same four steps:
 *   Step 1  (0–180ms)   : Card lifts to viewport centre.
 *   Step 2  (180–440ms) : Affinity streams flow from wells into card.
 *   Step 3  (440–800ms) : Stamp SVG descends, slams card, explodes into sparks.
 *                         Tattooed impression (−10°, inside card) is left behind.
 *   Step 4  (800–1150ms): Card + tattoo arc to destination and shrink away.
 *                         ForgeAnimation → Civilization tab (destPos).
 *                         OpponentForgeAnimation → opponent avatar pill (chipCenter).
 *
 * StampSVG and resolveAccent are shared by both.
 */

import { motion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { ArtifactCard } from '@workspace/api-client-react';
import { ArtifactCardView, EminenceSigil } from './game-card';
import { AFFINITY_META, type AffinityKey } from '@/lib/affinityMeta';
import { gameAudio } from '@/lib/audio';
import {
  BrandStampSVG,
  STAMP_VIEWBOX_HEIGHT,
  STAMP_VIEWBOX_WIDTH,
} from './game-brand-stamp';

// ── Timing (seconds) — ForgeAnimation ────────────────────────────────────────
const LIFT_END    = 0.18;
const STREAMS_END = 0.44;
const STAMP_HIT   = 0.60;
const STAMP_HOLD  = 0.80;
const ARC_END     = 1.15;
const EMINENCE_SEAL_APPEAR = 0.66;
const EMINENCE_SEAL_LAUNCH = 0.94;
const EMINENCE_SEAL_LAND   = 1.52;
const EMINENCE_SEAL_END    = 1.88;

// OpponentForgeAnimation shares all timing constants with ForgeAnimation — no separate OP_* needed.

/** Phase durations derived from the timing constants above, in milliseconds.
 *  Exported so the dev sandbox can display them without duplicating magic numbers. */
export const FORGE_PHASE_MS = {
  lift:    Math.round(LIFT_END * 1000),
  streams: Math.round((STREAMS_END - LIFT_END) * 1000),
  stamp:   Math.round((STAMP_HIT  - STREAMS_END) * 1000),
  hold:    Math.round((STAMP_HOLD - STAMP_HIT)   * 1000),
  arc:     Math.round((ARC_END    - STAMP_HOLD)  * 1000),
  total:   Math.round(ARC_END * 1000),
} as const;

// ── Viewport-relative sizing ─────────────────────────────────────────────────
function vmin(f: number) {
  return Math.min(window.innerWidth, window.innerHeight) * f;
}

// ── Arc-path helper (quadratic bezier) ───────────────────────────────────────
function arcPath(fx: number, fy: number, tx: number, ty: number, sign = 1): string {
  const dx = tx - fx, dy = ty - fy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return `M ${fx},${fy}`;
  const mx = (fx + tx) / 2, my = (fy + ty) / 2;
  return `M ${fx},${fy} Q ${mx + (-dy / len) * len * 0.42 * sign},${my + (dx / len) * len * 0.42 * sign} ${tx},${ty}`;
}

type ViewportRect = { x: number; y: number; w: number; h: number };

const PLAYER_EMINENCE_SIGIL_SELECTOR = '[data-eminence-sigil="player"]';
const PLAYER_EMINENCE_PANEL_SELECTOR = '[data-eminence-panel="player"]';

function readViewportRect(selector?: string | null): ViewportRect | null {
  if (!selector || typeof document === 'undefined') return null;
  const selectors = selector.split(',').map(part => part.trim()).filter(Boolean);
  for (const item of selectors) {
    const el = document.querySelector<HTMLElement>(item);
    const r = el?.getBoundingClientRect();
    if (r && r.width > 0 && r.height > 0) return { x: r.left, y: r.top, w: r.width, h: r.height };
  }
  return null;
}

function readEminenceTargetRect(selector?: string | null): ViewportRect | null {
  const target = readViewportRect(selector ?? PLAYER_EMINENCE_SIGIL_SELECTOR);
  if (target) return target;
  if (!selector || selector === PLAYER_EMINENCE_SIGIL_SELECTOR) return readViewportRect(PLAYER_EMINENCE_PANEL_SELECTOR);
  return null;
}

function artifactCardMetaMetrics() {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const height = typeof window !== 'undefined' ? window.innerHeight : 800;
  if (width <= 940 && height <= 520 && width > height) return { pad: 4, size: 24 };
  if (width <= 680) return { pad: 5, size: 28 };
  if (width >= 960) return { pad: 8, size: 36 };
  return { pad: 6, size: 30 };
}

function cardEminenceMarkerCenter({
  x,
  y,
  w,
  h,
  contentScale = 1,
  visualScale = 1,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  contentScale?: number;
  visualScale?: number;
}) {
  const { pad, size } = artifactCardMetaMetrics();
  const localX = (pad + size / 2) * contentScale;
  const localY = (pad + size / 2) * contentScale;
  return {
    x: x + w / 2 + (localX - w / 2) * visualScale,
    y: y + h / 2 + (localY - h / 2) * visualScale,
  };
}

type EminenceSealTiming = 'full' | 'fast';

function getEminenceSealTiming(timing: EminenceSealTiming) {
  return timing === 'fast'
    ? { appear: 0.08, launch: 0.20, land: 0.48, end: 0.78 }
    : {
        appear: EMINENCE_SEAL_APPEAR,
        launch: EMINENCE_SEAL_LAUNCH,
        land: EMINENCE_SEAL_LAND,
        end: EMINENCE_SEAL_END,
      };
}

// ── Hex color helpers ─────────────────────────────────────────────────────────
function darkenHex(hex: string, factor: number): string {
  const h = hex.replace('#', '');
  const r = Math.round(parseInt(h.slice(0, 2), 16) * factor).toString(16).padStart(2, '0');
  const g = Math.round(parseInt(h.slice(2, 4), 16) * factor).toString(16).padStart(2, '0');
  const b = Math.round(parseInt(h.slice(4, 6), 16) * factor).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`;
}

// ── Accent triple ─────────────────────────────────────────────────────────────
const AMBER_ACCENT = '#CC7C08';
const AMBER_GLOW   = '#FFD080';
const AMBER_DARK   = '#A06010';

function resolveAccent(bonusAffinity?: string | null): {
  accent: string; accentGlow: string; accentDark: string;
} {
  if (!bonusAffinity || bonusAffinity === 'singularity') {
    return { accent: AMBER_ACCENT, accentGlow: AMBER_GLOW, accentDark: AMBER_DARK };
  }
  const meta = AFFINITY_META[bonusAffinity as AffinityKey];
  if (!meta) {
    return { accent: AMBER_ACCENT, accentGlow: AMBER_GLOW, accentDark: AMBER_DARK };
  }
  return {
    accent:     meta.hex,
    accentGlow: meta.glowHex,
    accentDark: darkenHex(meta.hex, 0.60),
  };
}

function ForgottenForgeApparition({ compact = false }: { compact?: boolean }) {
  return (
    <motion.div
      className="pointer-events-none absolute inset-0 grid place-items-center rounded-[7px]"
      style={{
        zIndex: 36,
        background: 'radial-gradient(ellipse 74% 58% at 50% 46%, rgba(17, 24, 39, 0.58), rgba(30, 27, 75, 0.24) 54%, transparent 78%)',
        boxShadow: 'inset 0 0 24px rgba(129, 140, 248, 0.18)',
        overflow: 'hidden',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 0.72, 0.42, 0] }}
      transition={{
        delay: compact ? 0.04 : 0.28,
        duration: compact ? 0.54 : 0.82,
        times: [0, 0.26, 0.68, 1],
        ease: 'easeInOut',
      }}
    >
      <motion.span
        style={{
          color: 'rgba(228, 233, 255, 0.92)',
          fontFamily: 'var(--app-font-serif)',
          fontSize: compact ? '1.05rem' : 'clamp(1.7rem, 7.6vw, 3.2rem)',
          fontWeight: 800,
          letterSpacing: compact ? '0.08em' : '0.16em',
          lineHeight: 1,
          textShadow: [
            '0 1px 2px rgba(0, 0, 0, 1)',
            '0 0 10px rgba(129, 140, 248, 0.84)',
            '0 0 22px rgba(59, 130, 246, 0.42)',
          ].join(', '),
        }}
        initial={{ opacity: 0, scale: 0.86, y: compact ? 1 : 4 }}
        animate={{ opacity: [0, 1, 0.72, 0], scale: [0.86, 1.04, 1.01, 1.10], y: [compact ? 1 : 4, 0, 0, compact ? -2 : -6] }}
        transition={{
          delay: compact ? 0.04 : 0.28,
          duration: compact ? 0.54 : 0.82,
          times: [0, 0.24, 0.68, 1],
          ease: 'easeInOut',
        }}
      >
        ???
      </motion.span>
    </motion.div>
  );
}

// ── StampSVG ──────────────────────────────────────────────────────────────────
function StampSVG({
  width, height,
  accent, accentGlow, accentDark,
}: {
  width: number; height: number;
  accent: string; accentGlow: string; accentDark: string;
}) {
  return (
    <BrandStampSVG
      width={width}
      height={height}
      accent={accent}
      accentGlow={accentGlow}
      accentDark={accentDark}
    />
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StreamData { color: AffinityKey; d: string; }

export interface ForgeAnimationProps {
  animKey: number;
  card: ArtifactCard;
  tier: number;
  startRect: { x: number; y: number; w: number; h: number };
  destPos?: { x: number; y: number };
  destinationKind?: 'civilization' | 'tab';
  spentColors: AffinityKey[];
  eminence: number;
  gotSingularity: boolean;
  playerName?: string;
  eminenceTotal?: number;
  eminenceTarget?: number;
  eminenceTargetSelector?: string | null;
  onEminenceImpact?: (amount: number) => void;
  onForgeStamped?: () => void;
  /** In compact Forge view, skip the lift-to-center step and stamp the card in place. */
  isCompact?: boolean;
  isForgottenForge?: boolean;
}

export interface OpponentForgeAnimationProps {
  animKey: number;
  card: ArtifactCard;
  tier: number;
  startRect: { x: number; y: number; w: number; h: number };
  chipCenter: { x: number; y: number };
  ownerName?: string;
  eminence?: number;
  eminenceTotal?: number;
  eminenceTarget?: number;
  /** Affinity colors spent by the opponent. Falls back to card.bonusAffinity if omitted. */
  spentColors?: AffinityKey[];
  eminenceTargetSelector?: string | null;
  onEminenceImpact?: (amount: number) => void;
  onForgeStamped?: () => void;
  /** When true, skip the lift-to-centre; stamp lands directly on the chip. */
  isCompact?: boolean;
  isForgottenForge?: boolean;
}

// ── ForgeAnimation (local player) ─────────────────────────────────────────────

export function ForgeAnimation({
  animKey,
  card,
  tier,
  startRect,
  destPos,
  destinationKind,
  spentColors,
  eminence,
  eminenceTotal,
  eminenceTarget,
  eminenceTargetSelector,
  onEminenceImpact,
  onForgeStamped,
  playerName,
  isCompact,
  isForgottenForge = false,
}: ForgeAnimationProps) {
  const { x: sx, y: sy, w, h } = startRect;
  const { accent, accentGlow, accentDark } = resolveAccent(card.bonusAffinity);

  // Full card dimensions from CSS variables (clamp-based, must read at runtime).
  const fullCardW = isCompact
    ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w')) || 112)
    : w;
  const fullCardH = isCompact
    ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-h')) || 160)
    : h;
  // Scale factor to shrink ArtifactCardView (always --card-w × --card-h) to chip size.
  const chipScale = isCompact ? w / fullCardW : 1;

  // In compact view skip the lift-to-centre; stamp descends directly onto the chip.
  const cx = isCompact ? sx : (window.innerWidth  / 2 - w / 2);
  const cy = isCompact ? sy : (window.innerHeight / 2 - h / 2 - 24);
  const midX = cx + w / 2;
  const midY = cy + h / 2;

  const finalX = destPos?.x ?? midX;
  const finalY = destPos?.y ?? midY;
  const dX = finalX - w / 2;
  const dY = finalY - h / 2;

  const tattooW    = Math.max(55, Math.round(w * 0.75));
  const tattooH    = Math.round(tattooW * STAMP_VIEWBOX_HEIGHT / STAMP_VIEWBOX_WIDTH);
  const tattooLeft = (w - tattooW) / 2;
  const tattooTop  = h / 2 - tattooH / 2;

  const stampW    = Math.max(70, Math.round(w * 1.28 * 0.78));
  const stampH    = Math.round(stampW * STAMP_VIEWBOX_HEIGHT / STAMP_VIEWBOX_WIDTH);
  const stampLeft = midX - stampW / 2;
  const stampTop  = midY - stampH / 2;
  const sealSize  = Math.max(34, Math.min(56, w * 0.36));
  const sealStart = cardEminenceMarkerCenter({
    x: cx,
    y: cy,
    w,
    h,
    contentScale: isCompact ? chipScale : 1,
    visualScale: isCompact ? 1 : 1.28,
  });

  const SK = Math.round(w * 0.07);

  const T    = ARC_END;
  const t1   = LIFT_END    / T;
  const t2   = STAMP_HIT   / T;
  const t3   = (STAMP_HIT + 0.040) / T;
  const t4   = (STAMP_HIT + 0.080) / T;
  const t5   = (STAMP_HIT + 0.120) / T;
  const t6   = STAMP_HOLD  / T;
  const t_se = STREAMS_END / T;

  const cardTimes = [0, t1, t2, t3, t4, t5, t6, 1.0];
  const dsTimes   = [0, t_se, t2, t3, t5];

  useEffect(() => {
    gameAudio.playForgeAnimation();
    gameAudio.playAffinityPayment(spentColors);
    if (!isForgottenForge) return;
    const id = setTimeout(() => gameAudio.playForgottenForge(), (isCompact ? 60 : 280));
    return () => clearTimeout(id);
  }, [animKey, isCompact, isForgottenForge, spentColors]);

  const [stamped, setStamped] = useState(false);
  const onForgeStampedRef = useRef(onForgeStamped);
  useEffect(() => {
    onForgeStampedRef.current = onForgeStamped;
  }, [onForgeStamped]);
  useEffect(() => {
    const id = setTimeout(() => {
      setStamped(true);
      onForgeStampedRef.current?.();
    }, STAMP_HIT * 1000);
    return () => clearTimeout(id);
  }, [animKey]);

  const [eminenceSeparated, setEminenceSeparated] = useState(false);
  useEffect(() => {
    setEminenceSeparated(false);
    if (eminence <= 0) return;
    const id = setTimeout(() => setEminenceSeparated(true), EMINENCE_SEAL_APPEAR * 1000);
    return () => clearTimeout(id);
  }, [animKey, eminence]);

  const subDur  = ARC_END - STAMP_HIT;
  const tSpring = 0.040 / subDur;
  const tHold   = (STAMP_HOLD - STAMP_HIT) / subDur;

  const [streams, setStreams] = useState<StreamData[]>([]);
  useEffect(() => {
    const seen = new Set<AffinityKey>();
    const result: StreamData[] = [];
    let sign = 1;
    for (const color of spentColors) {
      if (seen.has(color) || color === 'singularity') continue;
      seen.add(color);
      const el = document.querySelector(`[data-affinity-well="${color}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        result.push({ color, d: arcPath(r.left + r.width / 2, r.top + r.height / 2, midX, midY, sign) });
        sign *= -1;
      }
    }
    setStreams(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- capture stream origins once per animation instance
  }, []);

  const accentA0  = accent  + '00';
  const accentAA  = accent  + 'AA';
  const accentA66 = accent  + '66';
  const accentG88 = accentGlow + '88';
  const accent88  = accent  + '88';

  return (
    <motion.div
      key={animKey}
      className="pointer-events-none fixed inset-0 z-50"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.20, delay: ARC_END }}
    >
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: isCompact ? [0, 0.35, 0.35, 0] : [0, 0.65, 0.65, 0] }}
        transition={{ duration: ARC_END, times: [0, t1, t6, 1.0] }}
      />

      <motion.div
        style={{ position: 'fixed', left: 0, top: 0, width: w, height: h }}
        animate={{
          x:       [sx,   cx,    cx+SK, cx-SK, cx+SK/2, cx-SK/3, cx,   dX  ],
          y:       [sy,   cy,    cy,    cy,    cy,      cy,      cy,   dY  ],
          // In compact view: no scale-up (card stays at chip size, stamp descends to it).
          scale:   isCompact
            ? [1,   1,     1,     1,     1,       1,      1,    0.06]
            : [1,  1.28,  1.28,  1.28,  1.28,   1.28,   1.28, 0.06],
          opacity: [1,    1,     1,     1,     1,       1,      1,    0   ],
        }}
        transition={{ duration: ARC_END, times: cardTimes, ease: 'easeInOut' }}
      >
        {/* In compact mode: clip to chip size then scale ArtifactCardView down to match.
            ArtifactCardView always self-sizes to var(--card-w) × var(--card-h);
            without this wrapper it overflows the 56×80 chip container. */}
        {isCompact ? (
          <div style={{ width: w, height: h, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: fullCardW,
              height: fullCardH,
              transform: `scale(${chipScale})`,
              transformOrigin: 'top left',
            }}>
              <ArtifactCardView card={card} tier={tier} hideEminence={eminenceSeparated} />
            </div>
          </div>
        ) : (
          <ArtifactCardView card={card} tier={tier} hideEminence={eminenceSeparated} />
        )}

        <motion.div
          className="absolute inset-0 rounded-[6px]"
          animate={{
            boxShadow: [
              `0 0   0px  0px ${accentA0}`,
              `0 0  32px 14px ${accentAA}`,
              `0 0  20px  8px ${accentA66}`,
              `0 0   0px  0px ${accentA0}`,
            ],
          }}
          transition={{ duration: ARC_END, times: [0, t1, t6, 1.0] }}
        />

        <motion.div
          className="absolute inset-0 rounded-[6px]"
          style={{ background: 'rgba(0,0,0,1)' }}
          animate={{ opacity: [0, 0, 0.55, 0.55, 0] }}
          transition={{ duration: ARC_END, times: [0, t2, t3, t6, 1.0] }}
        />

        {isForgottenForge && <ForgottenForgeApparition compact={isCompact} />}

        {stamped && (
          <motion.div
            style={{
              position: 'absolute',
              left: tattooLeft,
              top: tattooTop,
              width: tattooW,
              height: tattooH,
              transformOrigin: 'center center',
            }}
            initial={{ opacity: 1, scaleY: 0.82, scaleX: 1.08, rotate: -10 }}
            animate={{
              opacity: [1,    1,     1,    0   ],
              scaleY:  [0.82, 1.0,   1.0,  0.06],
              scaleX:  [1.08, 1.0,   1.0,  0.06],
              rotate:  [-10,  -10,   -10,  -10 ],
            }}
            transition={{ duration: subDur, times: [0, tSpring, tHold, 1.0] }}
          >
            <StampSVG
              width={tattooW} height={tattooH}
              accent={accent} accentGlow={accentGlow} accentDark={accentDark}
            />
          </motion.div>
        )}
      </motion.div>

      {streams.length > 0 && (
        <svg
          className="pointer-events-none fixed inset-0"
          style={{ width: '100vw', height: '100vh', overflow: 'visible' }}
        >
          <defs>
            {streams.map(({ color }) => (
              <filter key={color} id={`sfx-${color}`} x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="7" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
            <filter id="sfx-wipe" x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="9" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {streams.map(({ color, d }, idx) => {
            const m    = AFFINITY_META[color];
            const del  = LIFT_END + idx * 0.04;
            const dur  = STREAMS_END - LIFT_END + 0.12;
            // Wipe head travels independently: short bright segment races source→target.
            const WIPE = 0.17;
            // pathLength of the wipe segment (12% of path); offset animates 0→0.88 so
            // the segment ends exactly at the target (0.88 + 0.12 = 1.0).
            return (
              <g key={color}>
                {/* Outer glow bloom — fast draw */}
                <motion.path
                  d={d} stroke={m.hex} strokeWidth={14} strokeLinecap="round" fill="none"
                  filter={`url(#sfx-${color})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.85, 0.75, 0] }}
                  transition={{ delay: del, duration: dur, times: [0, 0.12, 0.70, 1] }}
                />
                {/* Bright core — fast draw */}
                <motion.path
                  d={d} stroke={m.glowHex ?? m.hex} strokeWidth={6} strokeLinecap="round" fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 0.85, 0] }}
                  transition={{ delay: del + 0.01, duration: dur * 0.92, times: [0, 0.10, 0.68, 1] }}
                />
                {/* White hot center — fast draw */}
                <motion.path
                  d={d} stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 0.9, 0] }}
                  transition={{ delay: del + 0.02, duration: dur * 0.86, times: [0, 0.09, 0.65, 1] }}
                />
                {/* Wipe head — glowing leading segment, sweeps source→target fast */}
                <motion.path
                  d={d} stroke={m.glowHex ?? m.hex} strokeWidth={20} strokeLinecap="round" fill="none"
                  filter="url(#sfx-wipe)"
                  initial={{ pathLength: 0.12, pathOffset: 0, opacity: 0 }}
                  animate={{ pathLength: 0.12, pathOffset: [0, 0.88], opacity: [0, 1, 0.85, 0] }}
                  transition={{ delay: del, duration: WIPE, ease: 'easeIn', times: [0, 0.06, 0.82, 1] }}
                />
                {/* Wipe head — white inner streak */}
                <motion.path
                  d={d} stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" fill="none"
                  initial={{ pathLength: 0.10, pathOffset: 0, opacity: 0 }}
                  animate={{ pathLength: 0.10, pathOffset: [0, 0.90], opacity: [0, 1, 0.80, 0] }}
                  transition={{ delay: del + 0.01, duration: WIPE * 0.88, ease: 'easeIn', times: [0, 0.05, 0.80, 1] }}
                />
              </g>
            );
          })}
        </svg>
      )}

      <motion.div
        initial={{ opacity: 0 }}
        style={{
          position: 'fixed',
          left: stampLeft,
          top: stampTop,
          width: stampW,
          height: stampH,
          transformOrigin: 'center center',
        }}
        animate={{
          y:       [-h * 2.5, -h * 2.5,  0,    0,    0   ],
          opacity: [0,         1,         1,    0.55, 0   ],
          scaleY:  [1,         1,         0.70, 0.70, 0.70],
          scaleX:  [1,         1,         1.12, 1.12, 1.12],
          rotate:  [-10,       -10,       -10,  -10,  -10 ],
        }}
        transition={{ duration: ARC_END, times: dsTimes, ease: 'easeInOut' }}
      >
        <StampSVG
          width={stampW} height={stampH}
          accent={accent} accentGlow={accentGlow} accentDark={accentDark}
        />
      </motion.div>

      <motion.div
        className="pointer-events-none fixed rounded-full"
        style={{
          left: midX, top: midY, translateX: '-50%', translateY: '-50%',
          background: `radial-gradient(circle, ${accentGlow}FF 0%, ${accent}99 38%, transparent 68%)`,
        }}
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{
          width:   [0, 0, vmin(0.50), 0],
          height:  [0, 0, vmin(0.50), 0],
          opacity: [0, 0, 1,           0],
        }}
        transition={{
          duration: STAMP_HOLD,
          times: [0, STAMP_HIT / STAMP_HOLD - 0.01, STAMP_HIT / STAMP_HOLD + 0.04, 1.0],
        }}
      />

      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const rad  = (deg * Math.PI) / 180;
        const dist = vmin(0.20 + (deg % 60 === 0 ? 0.04 : 0));
        const sz   = Math.max(6, vmin(0.016));
        const bright = deg % 90 === 0;
        return (
          <motion.div
            key={deg}
            className="pointer-events-none fixed rounded-full"
            style={{
              left: midX - sz / 2, top: midY - sz / 2,
              width: sz, height: sz,
              background: bright ? accentGlow : accent,
              boxShadow: `0 0 ${sz * 0.9}px ${sz * 0.4}px ${bright ? accentG88 : accent88}`,
            }}
            initial={{ x: 0, y: 0, scale: 1.4, opacity: 1 }}
            animate={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, scale: 0, opacity: 0 }}
            transition={{ delay: STAMP_HIT, duration: 0.32, ease: 'easeOut' }}
          />
        );
      })}

      {destPos && [0, 0.10, 0.20].map((extra) => (
        <motion.div
          key={extra}
          className="pointer-events-none fixed rounded-full border-[3px]"
          style={{
            left: destPos.x, top: destPos.y,
            translateX: '-50%', translateY: '-50%',
            borderColor: accentGlow,
          }}
          initial={{ width: 10, height: 10, opacity: 1 }}
          animate={{ width: 100, height: 100, opacity: 0 }}
          transition={{ delay: ARC_END - 0.12 + extra, duration: 0.55, ease: 'easeOut' }}
        />
      ))}

      {destPos && destinationKind === 'civilization' && (
        <motion.div
          className="pointer-events-none fixed rounded-[28px] border"
          style={{
            left: destPos.x,
            top: destPos.y,
            translateX: '-50%',
            translateY: '-50%',
            borderColor: accentGlow,
            boxShadow: `0 0 34px 8px ${accent88}, inset 0 0 38px 4px ${accentG88}`,
          }}
          initial={{ width: 22, height: 22, opacity: 0.95, scale: 0.65 }}
          animate={{ width: 210, height: 128, opacity: 0, scale: 1 }}
          transition={{ delay: ARC_END - 0.06, duration: 0.78, ease: 'easeOut' }}
        />
      )}

      {eminence > 0 && (
        <EminenceSealFlight
          animKey={animKey}
          amount={eminence}
          eminenceAfter={eminenceTotal}
          eminenceTarget={eminenceTarget}
          start={sealStart}
          size={sealSize}
          fallbackDest={destPos}
          targetSelector={eminenceTargetSelector}
          onImpact={onEminenceImpact}
        />
      )}

      {playerName && (
        <motion.div
          className="pointer-events-none fixed"
          style={{
            left: stampLeft + stampW / 2,
            top:  stampTop - 30,
            translateX: '-50%',
          }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: [0, 0, 1, 1, 0], y: [4, 4, 0, 0, -4] }}
          transition={{ duration: ARC_END, times: [0, t1, t_se, t6, 1.0] }}
        >
          <span
            className="animation-readable-pill animation-readable-pill--cool text-[9px] font-semibold tracking-wide whitespace-nowrap"
            style={{
              color: 'rgba(218,244,255,0.96)',
            }}
          >
            {playerName}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

function EminenceSealFlight({
  animKey,
  amount,
  eminenceAfter,
  eminenceTarget = 15,
  start,
  size,
  fallbackDest,
  targetSelector = PLAYER_EMINENCE_SIGIL_SELECTOR,
  timing = 'full',
  onImpact,
}: {
  animKey: number;
  amount: number;
  eminenceAfter?: number;
  eminenceTarget?: number;
  start: { x: number; y: number };
  size: number;
  fallbackDest?: { x: number; y: number };
  targetSelector?: string | null;
  timing?: EminenceSealTiming;
  onImpact?: (amount: number) => void;
}) {
  const sealTiming = getEminenceSealTiming(timing);
  const [target, setTarget] = useState<ViewportRect | null>(() => readEminenceTargetRect(targetSelector));

  useEffect(() => {
    const raf = requestAnimationFrame(() => setTarget(readEminenceTargetRect(targetSelector)));
    gameAudio.playEminenceSeal(amount, eminenceAfter, eminenceTarget);
    const impactTimer = setTimeout(() => onImpact?.(amount), sealTiming.land * 1000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(impactTimer);
    };
  }, [animKey, amount, eminenceAfter, eminenceTarget, onImpact, targetSelector, sealTiming.land]);

  const targetX = target ? target.x + target.w / 2 : (fallbackDest?.x ?? window.innerWidth - 80);
  const targetY = target ? target.y + target.h / 2 : (fallbackDest?.y ?? 80);
  const dx = targetX - start.x;
  const dy = targetY - start.y;
  const arcLift = Math.min(120, Math.max(42, Math.abs(dx) * 0.08 + Math.abs(dy) * 0.05));
  const targetScale = target ? Math.max(0.24, Math.min(0.78, Math.max(target.w, target.h) / size)) : 0.5;
  const total = sealTiming.end;
  const appear = sealTiming.appear / total;
  const launch = sealTiming.launch / total;
  const preLand = Math.max(launch, (sealTiming.land - 0.12) / total);
  const land = sealTiming.land / total;
  const displayEminence = Math.max(amount, Math.min(eminenceTarget, eminenceAfter ?? amount));

  return (
    <>
      <motion.div
        className="pointer-events-none fixed select-none"
        style={{
          left: start.x - size / 2,
          top: start.y - size / 2,
          width: size,
          height: size,
          zIndex: 9070,
          transformStyle: 'preserve-3d',
          perspective: 800,
          filter: 'drop-shadow(0 0 9px rgba(255, 218, 118, 0.42)) drop-shadow(0 2px 8px rgba(0, 0, 0, 0.82))',
        }}
        initial={{ opacity: 0, scale: 0.38, rotateY: -92, rotateZ: -9, x: 0, y: 0 }}
        animate={{
          opacity: [0, 0, 1, 1, 1, 0],
          scale: [0.38, 0.38, 1.18, Math.max(targetScale * 1.22, 0.44), targetScale, 0.08],
          rotateY: [-92, -92, 0, 560, 720, 720],
          rotateZ: [-9, -9, 0, 7, 0, 0],
          x: [0, 0, 0, dx * 0.88, dx, dx],
          y: [0, 0, -arcLift, dy - Math.max(8, size * 0.18), dy, dy],
        }}
        transition={{
          duration: total,
          times: [0, appear, launch, preLand, land, 1],
          ease: ['easeOut', 'easeOut', 'easeInOut', 'easeOut'],
        }}
      >
        <div className="relative grid h-full w-full place-items-center">
          <EminenceSigil size={size} value={displayEminence} />
          <motion.span
            className="animation-readable-pill absolute -bottom-1 px-1.5 py-0.5 font-serif text-[10px] font-black leading-none text-[#fff4c5]"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: [0, 0, 1, 1, 0], y: [4, 4, 0, 0, -4] }}
            transition={{ duration: total * 0.92, times: [0, appear, launch, 0.84, 1] }}
          >
            +{amount}
          </motion.span>
        </div>
      </motion.div>

      <motion.div
        className="pointer-events-none fixed rounded-full border-2 border-[#f4cf78]"
        style={{
          left: targetX,
          top: targetY,
          translateX: '-50%',
          translateY: '-50%',
          zIndex: 9069,
          boxShadow: '0 0 0 1px rgba(255,255,255,0.16), inset 0 0 18px rgba(255, 232, 160, 0.18)',
        }}
        initial={{ width: 18, height: 18, opacity: 0 }}
        animate={{ width: [18, 58, 28, 138], height: [18, 58, 28, 138], opacity: [0, 1, 0.9, 0] }}
        transition={{ delay: sealTiming.land, duration: timing === 'fast' ? 0.34 : 0.52, ease: 'easeOut' }}
      />
    </>
  );
}

// ── AbridgedForgeAnimation ────────────────────────────────────────────────────
// Fast path: card shrinks directly from startRect to destPos — no stamp, no streams.
// Used when the player has enabled "Abridged animations" in the header menu.

export interface AbridgedForgeAnimationProps {
  animKey: number;
  card: ArtifactCard;
  cardFace?: ReactNode;
  tier: number;
  startRect: { x: number; y: number; w: number; h: number };
  /** Center of the destination pill (hand tab or opponent chip). */
  destPos?: { x: number; y: number };
  destinationKind?: 'civilization' | 'tab';
  ownerName?: string;
  spentColors?: AffinityKey[];
  eminence?: number;
  eminenceTotal?: number;
  eminenceTarget?: number;
  eminenceTargetSelector?: string | null;
  onEminenceImpact?: (amount: number) => void;
  /** Called when the card finishes shrinking into the destination. */
  onComplete?: () => void;
  onForgeStamped?: () => void;
  isForgottenForge?: boolean;
}

export function AbridgedForgeAnimation({
  animKey, card, cardFace, tier, startRect, destPos, destinationKind, ownerName, spentColors, eminence = 0, eminenceTotal, eminenceTarget, eminenceTargetSelector, onEminenceImpact, onComplete, onForgeStamped, isForgottenForge = false,
}: AbridgedForgeAnimationProps) {
  const { x: sx, y: sy, w, h } = startRect;
  const dx = destPos ? destPos.x - sx - w / 2 : 0;
  const dy = destPos ? destPos.y - sy - h / 2 : 0;

  useEffect(() => {
    if (spentColors?.length) gameAudio.playAffinityPayment(spentColors);
    if (!isForgottenForge) return;
    const id = setTimeout(() => gameAudio.playForgottenForge(), 40);
    return () => clearTimeout(id);
  }, [animKey, isForgottenForge, spentColors]);

  const onForgeStampedRef = useRef(onForgeStamped);
  useEffect(() => {
    onForgeStampedRef.current = onForgeStamped;
  }, [onForgeStamped]);
  useEffect(() => {
    const id = setTimeout(() => onForgeStampedRef.current?.(), 180);
    return () => clearTimeout(id);
  }, [animKey]);

  return (
    <motion.div
      key={animKey}
      className="pointer-events-none fixed z-[52]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.08, delay: 0.62 }}
    >
      <motion.div
        style={{ position: 'fixed', left: sx, top: sy, width: w, height: h }}
        initial={{ scale: 1, opacity: 1, x: 0, y: 0 }}
        animate={{
          scale: 0.12,
          opacity: [1, 1, 0],
          x: dx,
          y: dy,
        }}
        transition={{
          duration: 0.62,
          ease: [0.4, 0, 1, 1],
          opacity: { duration: 0.62, times: [0, 0.78, 1], ease: 'linear' },
          scale: { duration: 0.62, ease: [0.4, 0, 1, 1] },
        }}
        onAnimationComplete={() => onComplete?.()}
      >
        {cardFace ?? <ArtifactCardView card={card} tier={tier} hideEminence={eminence > 0} />}
        {isForgottenForge && <ForgottenForgeApparition compact />}
      </motion.div>

      {destPos && destinationKind === 'civilization' && (
        <motion.div
          className="pointer-events-none fixed rounded-[22px] border"
          style={{
            left: destPos.x,
            top: destPos.y,
            translateX: '-50%',
            translateY: '-50%',
            borderColor: resolveAccent(card.bonusAffinity).accentGlow,
          }}
          initial={{ width: 12, height: 12, opacity: 0.75 }}
          animate={{ width: 132, height: 84, opacity: 0 }}
          transition={{ delay: 0.26, duration: 0.44, ease: 'easeOut' }}
        />
      )}

      {ownerName && (
        <motion.div
          className="pointer-events-none fixed"
          style={{ left: sx + w / 2, top: sy - 26, translateX: '-50%' }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: [0, 1, 1, 1, 0], y: [4, 0, 0, 0, -4] }}
          transition={{ duration: 0.7, times: [0, 0.1, 0.72, 0.88, 1.0] }}
        >
          <span
            className="animation-readable-pill animation-readable-pill--cool text-[9px] font-semibold tracking-wide whitespace-nowrap"
            style={{
              color: 'rgba(218,244,255,0.96)',
            }}
          >
            {ownerName}
          </span>
        </motion.div>
      )}
      {eminence > 0 && (
        <EminenceSealFlight
          animKey={animKey}
          amount={eminence}
          eminenceAfter={eminenceTotal}
          eminenceTarget={eminenceTarget}
          start={cardEminenceMarkerCenter({ x: sx, y: sy, w, h })}
          size={Math.max(30, Math.min(46, w * 0.55))}
          fallbackDest={destPos}
          targetSelector={eminenceTargetSelector}
          timing="fast"
          onImpact={onEminenceImpact}
        />
      )}
    </motion.div>
  );
}

// ── OpponentForgeAnimation ────────────────────────────────────────────────────
// Full-view (non-abridged) opponent forge.  Structurally identical to
// ForgeAnimation — same four steps, same timing constants.  Only the arc
// destination differs: chipCenter (opponent avatar pill) instead of destPos.

export function OpponentForgeAnimation({
  animKey, card, tier, startRect, chipCenter, ownerName, eminence: eminenceProp, eminenceTotal, eminenceTarget, spentColors: spentColorsProp, eminenceTargetSelector, onEminenceImpact, onForgeStamped, isCompact, isForgottenForge = false,
}: OpponentForgeAnimationProps) {
  const { x: sx, y: sy, w, h } = startRect;
  const { accent, accentGlow, accentDark } = resolveAccent(card.bonusAffinity);

  // Full card dimensions from CSS variables (clamp-based, must read at runtime).
  const fullCardW = isCompact
    ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-w')) || 112)
    : w;
  const fullCardH = isCompact
    ? (parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--card-h')) || 160)
    : h;
  const chipScale = isCompact ? w / fullCardW : 1;

  // In compact view skip the lift-to-centre; stamp descends directly onto the chip.
  const cx   = isCompact ? sx : (window.innerWidth  / 2 - w / 2);
  const cy   = isCompact ? sy : (window.innerHeight / 2 - h / 2 - 24);
  const midX = cx + w / 2;
  const midY = cy + h / 2;

  // Arc destination: opponent chip pill
  const dX = chipCenter.x - w / 2;
  const dY = chipCenter.y - h / 2;

  const tattooW    = Math.max(55, Math.round(w * 0.75));
  const tattooH    = Math.round(tattooW * STAMP_VIEWBOX_HEIGHT / STAMP_VIEWBOX_WIDTH);
  const tattooLeft = (w - tattooW) / 2;
  const tattooTop  = h / 2 - tattooH / 2;

  const stampW    = Math.max(70, Math.round(w * 1.28 * 0.78));
  const stampH    = Math.round(stampW * STAMP_VIEWBOX_HEIGHT / STAMP_VIEWBOX_WIDTH);
  const stampLeft = midX - stampW / 2;
  const stampTop  = midY - stampH / 2;

  const SK = Math.round(w * 0.07);

  const T    = ARC_END;
  const t1   = LIFT_END    / T;
  const t2   = STAMP_HIT   / T;
  const t3   = (STAMP_HIT + 0.040) / T;
  const t4   = (STAMP_HIT + 0.080) / T;
  const t5   = (STAMP_HIT + 0.120) / T;
  const t6   = STAMP_HOLD  / T;
  const t_se = STREAMS_END / T;

  const cardTimes = [0, t1, t2, t3, t4, t5, t6, 1.0];
  const dsTimes   = [0, t_se, t2, t3, t5];

  useEffect(() => {
    gameAudio.playForgeAnimation();
    gameAudio.playAffinityPayment(
      spentColorsProp && spentColorsProp.length > 0
        ? spentColorsProp
        : card.bonusAffinity
          ? [card.bonusAffinity as AffinityKey]
          : [],
    );
    if (!isForgottenForge) return;
    const id = setTimeout(() => gameAudio.playForgottenForge(), (isCompact ? 60 : 280));
    return () => clearTimeout(id);
  }, [animKey, card.bonusAffinity, isCompact, isForgottenForge, spentColorsProp]);

  const [stamped, setStamped] = useState(false);
  const onForgeStampedRef = useRef(onForgeStamped);
  useEffect(() => {
    onForgeStampedRef.current = onForgeStamped;
  }, [onForgeStamped]);
  useEffect(() => {
    const id = setTimeout(() => {
      setStamped(true);
      onForgeStampedRef.current?.();
    }, STAMP_HIT * 1000);
    return () => clearTimeout(id);
  }, [animKey]);

  const subDur  = ARC_END - STAMP_HIT;
  const tSpring = 0.040 / subDur;
  const tHold   = (STAMP_HOLD - STAMP_HIT) / subDur;

  // spentColors: use prop if provided, else fall back to card's bonusAffinity
  const effectiveSpent: AffinityKey[] =
    spentColorsProp && spentColorsProp.length > 0
      ? spentColorsProp
      : card.bonusAffinity
        ? [card.bonusAffinity as AffinityKey]
        : [];

  // Streams originate from the opponent's chip/avatar, not the local affinity wells.
  const streams: StreamData[] = (() => {
    const seen = new Set<AffinityKey>();
    const result: StreamData[] = [];
    let sign = 1;
    for (const color of effectiveSpent) {
      if (seen.has(color)) continue;
      seen.add(color);
      result.push({ color, d: arcPath(chipCenter.x, chipCenter.y, midX, midY, sign) });
      sign *= -1;
    }
    return result;
  })();

  const eminence = eminenceProp ?? card.eminence ?? 0;
  const [eminenceSeparated, setEminenceSeparated] = useState(false);
  useEffect(() => {
    setEminenceSeparated(false);
    if (eminence <= 0) return;
    const id = setTimeout(() => setEminenceSeparated(true), EMINENCE_SEAL_APPEAR * 1000);
    return () => clearTimeout(id);
  }, [animKey, eminence]);

  const accentA0  = accent  + '00';
  const accentAA  = accent  + 'AA';
  const accentA66 = accent  + '66';
  const accentG88 = accentGlow + '88';
  const accent88  = accent  + '88';

  return (
    <motion.div
      key={animKey}
      className="pointer-events-none fixed inset-0 z-[52]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.20, delay: ARC_END }}
    >
      {/* ── Background dim ──────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: isCompact ? [0, 0.35, 0.35, 0] : [0, 0.65, 0.65, 0] }}
        transition={{ duration: ARC_END, times: [0, t1, t6, 1.0] }}
      />

      {/* ── Card: lifts from slot to viewport centre, then arcs to chip ─── */}
      <motion.div
        style={{ position: 'fixed', left: 0, top: 0, width: w, height: h }}
        animate={{
          x:       [sx,   cx,    cx+SK, cx-SK, cx+SK/2, cx-SK/3, cx,   dX  ],
          y:       [sy,   cy,    cy,    cy,    cy,      cy,      cy,   dY  ],
          scale:   isCompact
            ? [1,   1,     1,     1,     1,       1,      1,    0.06]
            : [1,  1.28,  1.28,  1.28,  1.28,   1.28,   1.28, 0.06],
          opacity: [1,    1,     1,     1,     1,       1,      1,    0   ],
        }}
        transition={{ duration: ARC_END, times: cardTimes, ease: 'easeInOut' }}
      >
        {isCompact ? (
          <div style={{ width: w, height: h, overflow: 'hidden', position: 'relative' }}>
            <div style={{
              width: fullCardW,
              height: fullCardH,
              transform: `scale(${chipScale})`,
              transformOrigin: 'top left',
            }}>
              <ArtifactCardView card={card} tier={tier} hideEminence={eminenceSeparated} />
            </div>
          </div>
        ) : (
          <ArtifactCardView card={card} tier={tier} hideEminence={eminenceSeparated} />
        )}

        {/* Affinity aura glow */}
        <motion.div
          className="absolute inset-0 rounded-[6px]"
          animate={{
            boxShadow: [
              `0 0   0px  0px ${accentA0}`,
              `0 0  32px 14px ${accentAA}`,
              `0 0  20px  8px ${accentA66}`,
              `0 0   0px  0px ${accentA0}`,
            ],
          }}
          transition={{ duration: ARC_END, times: [0, t1, t6, 1.0] }}
        />

        {/* Dark vignette on stamp impact */}
        <motion.div
          className="absolute inset-0 rounded-[6px]"
          style={{ background: 'rgba(0,0,0,1)' }}
          animate={{ opacity: [0, 0, 0.55, 0.55, 0] }}
          transition={{ duration: ARC_END, times: [0, t2, t3, t6, 1.0] }}
        />

        {isForgottenForge && <ForgottenForgeApparition compact={isCompact} />}

        {/* Tattoo — position:absolute inside card div (same as ForgeAnimation) */}
        {stamped && (
          <motion.div
            style={{
              position: 'absolute',
              left: tattooLeft,
              top: tattooTop,
              width: tattooW,
              height: tattooH,
              transformOrigin: 'center center',
            }}
            initial={{ opacity: 1, scaleY: 0.82, scaleX: 1.08, rotate: -10 }}
            animate={{
              opacity: [1,    1,     1,    0   ],
              scaleY:  [0.82, 1.0,   1.0,  0.06],
              scaleX:  [1.08, 1.0,   1.0,  0.06],
              rotate:  [-10,  -10,   -10,  -10 ],
            }}
            transition={{ duration: subDur, times: [0, tSpring, tHold, 1.0] }}
          >
            <StampSVG
              width={tattooW} height={tattooH}
              accent={accent} accentGlow={accentGlow} accentDark={accentDark}
            />
          </motion.div>
        )}
      </motion.div>

      {/* ── Affinity streams ─────────────────────────────────────────────── */}
      {streams.length > 0 && (
        <svg
          className="pointer-events-none fixed inset-0"
          style={{ width: '100vw', height: '100vh', overflow: 'visible' }}
        >
          <defs>
            {streams.map(({ color }) => (
              <filter key={color} id={`opsfx-${animKey}-${color}`} x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="7" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
            <filter id={`opsfx-wipe-${animKey}`} x="-120%" y="-120%" width="340%" height="340%">
              <feGaussianBlur stdDeviation="9" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {streams.map(({ color, d }, idx) => {
            const m    = AFFINITY_META[color];
            const del  = LIFT_END + idx * 0.04;
            const dur  = STREAMS_END - LIFT_END + 0.12;
            const WIPE = 0.17;
            return (
              <g key={color}>
                {/* Outer glow bloom — fast draw */}
                <motion.path
                  d={d} stroke={m.hex} strokeWidth={14} strokeLinecap="round" fill="none"
                  filter={`url(#opsfx-${animKey}-${color})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.85, 0.75, 0] }}
                  transition={{ delay: del, duration: dur, times: [0, 0.12, 0.70, 1] }}
                />
                {/* Bright core — fast draw */}
                <motion.path
                  d={d} stroke={m.glowHex ?? m.hex} strokeWidth={6} strokeLinecap="round" fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 0.85, 0] }}
                  transition={{ delay: del + 0.01, duration: dur * 0.92, times: [0, 0.10, 0.68, 1] }}
                />
                {/* White hot center — fast draw */}
                <motion.path
                  d={d} stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 0.9, 0] }}
                  transition={{ delay: del + 0.02, duration: dur * 0.86, times: [0, 0.09, 0.65, 1] }}
                />
                {/* Wipe head — glowing leading segment, sweeps source→target fast */}
                <motion.path
                  d={d} stroke={m.glowHex ?? m.hex} strokeWidth={20} strokeLinecap="round" fill="none"
                  filter={`url(#opsfx-wipe-${animKey})`}
                  initial={{ pathLength: 0.12, pathOffset: 0, opacity: 0 }}
                  animate={{ pathLength: 0.12, pathOffset: [0, 0.88], opacity: [0, 1, 0.85, 0] }}
                  transition={{ delay: del, duration: WIPE, ease: 'easeIn', times: [0, 0.06, 0.82, 1] }}
                />
                {/* Wipe head — white inner streak */}
                <motion.path
                  d={d} stroke="#FFFFFF" strokeWidth={7} strokeLinecap="round" fill="none"
                  initial={{ pathLength: 0.10, pathOffset: 0, opacity: 0 }}
                  animate={{ pathLength: 0.10, pathOffset: [0, 0.90], opacity: [0, 1, 0.80, 0] }}
                  transition={{ delay: del + 0.01, duration: WIPE * 0.88, ease: 'easeIn', times: [0, 0.05, 0.80, 1] }}
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* ── Descending stamp ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        style={{
          position: 'fixed',
          left: stampLeft,
          top: stampTop,
          width: stampW,
          height: stampH,
          transformOrigin: 'center center',
        }}
        animate={{
          y:       [-h * 2.5, -h * 2.5,  0,    0,    0   ],
          opacity: [0,         1,         1,    0.55, 0   ],
          scaleY:  [1,         1,         0.70, 0.70, 0.70],
          scaleX:  [1,         1,         1.12, 1.12, 1.12],
          rotate:  [-10,       -10,       -10,  -10,  -10 ],
        }}
        transition={{ duration: ARC_END, times: dsTimes, ease: 'easeInOut' }}
      >
        <StampSVG
          width={stampW} height={stampH}
          accent={accent} accentGlow={accentGlow} accentDark={accentDark}
        />
      </motion.div>

      {/* ── Impact flash at viewport centre ──────────────────────────────── */}
      <motion.div
        className="pointer-events-none fixed rounded-full"
        style={{
          left: midX, top: midY, translateX: '-50%', translateY: '-50%',
          background: `radial-gradient(circle, ${accentGlow}FF 0%, ${accent}99 38%, transparent 68%)`,
        }}
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{
          width:   [0, 0, vmin(0.50), 0],
          height:  [0, 0, vmin(0.50), 0],
          opacity: [0, 0, 1,           0],
        }}
        transition={{
          duration: STAMP_HOLD,
          times: [0, STAMP_HIT / STAMP_HOLD - 0.01, STAMP_HIT / STAMP_HOLD + 0.04, 1.0],
        }}
      />

      {/* ── Impact sparks at viewport centre ─────────────────────────────── */}
      {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg) => {
        const rad  = (deg * Math.PI) / 180;
        const dist = vmin(0.20 + (deg % 60 === 0 ? 0.04 : 0));
        const sz   = Math.max(6, vmin(0.016));
        const bright = deg % 90 === 0;
        return (
          <motion.div
            key={deg}
            className="pointer-events-none fixed rounded-full"
            style={{
              left: midX - sz / 2, top: midY - sz / 2,
              width: sz, height: sz,
              background: bright ? accentGlow : accent,
              boxShadow: `0 0 ${sz * 0.9}px ${sz * 0.4}px ${bright ? accentG88 : accent88}`,
            }}
            initial={{ x: 0, y: 0, scale: 1.4, opacity: 1 }}
            animate={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, scale: 0, opacity: 0 }}
            transition={{ delay: STAMP_HIT, duration: 0.32, ease: 'easeOut' }}
          />
        );
      })}

      {/* ── Arrival rings at chip ─────────────────────────────────────────── */}
      {[0, 0.10, 0.20].map((extra) => (
        <motion.div
          key={extra}
          className="pointer-events-none fixed rounded-full border-[3px]"
          style={{
            left: chipCenter.x, top: chipCenter.y,
            translateX: '-50%', translateY: '-50%',
            borderColor: accentGlow,
          }}
          initial={{ width: 10, height: 10, opacity: 1 }}
          animate={{ width: 100, height: 100, opacity: 0 }}
          transition={{ delay: ARC_END - 0.12 + extra, duration: 0.55, ease: 'easeOut' }}
        />
      ))}

      {eminence > 0 && (
        <EminenceSealFlight
          animKey={animKey}
          amount={eminence}
          eminenceAfter={eminenceTotal}
          eminenceTarget={eminenceTarget}
          start={cardEminenceMarkerCenter({
            x: cx,
            y: cy,
            w,
            h,
            contentScale: isCompact ? chipScale : 1,
            visualScale: isCompact ? 1 : 1.28,
          })}
          size={Math.max(34, Math.min(56, w * 0.36))}
          fallbackDest={chipCenter}
          targetSelector={eminenceTargetSelector}
          onImpact={onEminenceImpact}
        />
      )}

      {/* ── Owner name label ─────────────────────────────────────────────── */}
      {ownerName && (
        <motion.div
          className="pointer-events-none fixed"
          style={{
            left: stampLeft + stampW / 2,
            top:  stampTop - 30,
            translateX: '-50%',
          }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: [0, 0, 1, 1, 0], y: [4, 4, 0, 0, -4] }}
          transition={{ duration: ARC_END, times: [0, t1, t_se, t6, 1.0] }}
        >
          <span
            className="animation-readable-pill animation-readable-pill--cool text-[9px] font-semibold tracking-wide whitespace-nowrap"
            style={{
              color: 'rgba(218,244,255,0.96)',
            }}
          >
            {ownerName}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
