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
import { useEffect, useState } from 'react';
import type { ArtifactCard } from '@workspace/api-client-react';
import { ArtifactCardView } from './game-card';
import { GEM_META, type GemKey } from '@/lib/gemMeta';
import { gameAudio } from '@/lib/audio';
import { Sparkles } from 'lucide-react';

// ── Timing (seconds) — ForgeAnimation ────────────────────────────────────────
const LIFT_END    = 0.18;
const STREAMS_END = 0.44;
const STAMP_HIT   = 0.60;
const STAMP_HOLD  = 0.80;
const ARC_END     = 1.15;

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

function resolveAccent(bonusColor?: string | null): {
  accent: string; accentGlow: string; accentDark: string;
} {
  if (!bonusColor || bonusColor === 'flux') {
    return { accent: AMBER_ACCENT, accentGlow: AMBER_GLOW, accentDark: AMBER_DARK };
  }
  const meta = GEM_META[bonusColor as GemKey];
  if (!meta) {
    return { accent: AMBER_ACCENT, accentGlow: AMBER_GLOW, accentDark: AMBER_DARK };
  }
  return {
    accent:     meta.hex,
    accentGlow: meta.glowHex,
    accentDark: darkenHex(meta.hex, 0.60),
  };
}

// ── StampSVG ──────────────────────────────────────────────────────────────────
const VBOX_W = 220;
const VBOX_H = 100;

function StampSVG({
  width, height,
  accent, accentGlow, accentDark,
}: {
  width: number; height: number;
  accent: string; accentGlow: string; accentDark: string;
}) {
  const cx = VBOX_W / 2;
  const hammerY = 32;
  const textY   = 83;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VBOX_W} ${VBOX_H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible', display: 'block' }}
    >
      <defs>
        <filter id="stGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="stTextGlow" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="4.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      <rect x="4" y="4" width={VBOX_W - 8} height={VBOX_H - 8} rx="4" fill="rgba(0,0,0,0.62)" />
      <rect x="4" y="4" width={VBOX_W - 8} height={VBOX_H - 8} rx="4"
            fill="none" stroke={accent} strokeWidth="4.5" filter="url(#stGlow)" />
      <rect x="9" y="9" width={VBOX_W - 18} height={VBOX_H - 18} rx="2.5"
            fill="none" stroke={accent} strokeWidth="1.2" opacity="0.45" />
      <line x1="20" y1="50" x2={VBOX_W - 20} y2="50"
            stroke={accent} strokeWidth="1.5" opacity="0.5" />

      <g filter="url(#stGlow)">
        <g transform={`translate(${cx},${hammerY}) rotate(-45)`}>
          <rect x="-14" y="-26" width="28" height="15" rx="3" fill={accent} />
          <rect x="-11" y="-22" width="10" height="7"  rx="1.5" fill={accentGlow} opacity="0.38" />
          <rect x="-4.5" y="-11" width="9" height="29" rx="2.5" fill={accentDark} />
          <rect x="-2"   y="-9"  width="3" height="18" rx="1"   fill={accentGlow} opacity="0.28" />
        </g>
        <g transform={`translate(${cx},${hammerY}) rotate(45)`}>
          <rect x="-14" y="-26" width="28" height="15" rx="3" fill={accent} />
          <rect x="-11" y="-22" width="10" height="7"  rx="1.5" fill={accentGlow} opacity="0.38" />
          <rect x="-4.5" y="-11" width="9" height="29" rx="2.5" fill={accentDark} />
          <rect x="-2"   y="-9"  width="3" height="18" rx="1"   fill={accentGlow} opacity="0.28" />
        </g>
      </g>

      <text x={cx} y={textY}
            fontFamily='"Cinzel Decorative", "Cinzel", Georgia, serif'
            fontWeight="900" fontSize="30" fill={accent}
            textAnchor="middle" letterSpacing="5"
            filter="url(#stTextGlow)">
        FORGED
      </text>
      <text x={cx} y={textY}
            fontFamily='"Cinzel Decorative", "Cinzel", Georgia, serif'
            fontWeight="900" fontSize="30" fill={accentGlow} fillOpacity="0.40"
            textAnchor="middle" letterSpacing="5">
        FORGED
      </text>
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StreamData { color: GemKey; d: string; }

export interface ForgeAnimationProps {
  animKey: number;
  card: ArtifactCard;
  tier: number;
  startRect: { x: number; y: number; w: number; h: number };
  destPos?: { x: number; y: number };
  spentColors: GemKey[];
  lumens: number;
  gotFlux: boolean;
  playerName?: string;
  /** When true (compact market view) skip the lift-to-centre step; stamp descends directly onto the card at its current position. */
  isCompact?: boolean;
}

export interface OpponentForgeAnimationProps {
  animKey: number;
  card: ArtifactCard;
  tier: number;
  startRect: { x: number; y: number; w: number; h: number };
  chipCenter: { x: number; y: number };
  ownerName?: string;
  /** Affinity colors spent by the opponent. Falls back to card.bonusColor if omitted. */
  spentColors?: GemKey[];
  /** When true, skip the lift-to-centre; stamp lands directly on the chip. */
  isCompact?: boolean;
}

// ── ForgeAnimation (local player) ─────────────────────────────────────────────

export function ForgeAnimation({
  animKey,
  card,
  tier,
  startRect,
  destPos,
  spentColors,
  lumens,
  playerName,
  isCompact,
}: ForgeAnimationProps) {
  const { x: sx, y: sy, w, h } = startRect;
  const { accent, accentGlow, accentDark } = resolveAccent(card.bonusColor);

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
  const tattooH    = Math.round(tattooW * VBOX_H / VBOX_W);
  const tattooLeft = (w - tattooW) / 2;
  const tattooTop  = h / 2 - tattooH / 2;

  const stampW    = Math.max(70, Math.round(w * 1.28 * 0.78));
  const stampH    = Math.round(stampW * VBOX_H / VBOX_W);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [stamped, setStamped] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setStamped(true), STAMP_HIT * 1000);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subDur  = ARC_END - STAMP_HIT;
  const tSpring = 0.040 / subDur;
  const tHold   = (STAMP_HOLD - STAMP_HIT) / subDur;

  const [streams, setStreams] = useState<StreamData[]>([]);
  useEffect(() => {
    const seen = new Set<GemKey>();
    const result: StreamData[] = [];
    let sign = 1;
    for (const color of spentColors) {
      if (seen.has(color) || color === 'flux') continue;
      seen.add(color);
      const el = document.querySelector(`[data-affinity-well="${color}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        result.push({ color, d: arcPath(r.left + r.width / 2, r.top + r.height / 2, midX, midY, sign) });
        sign *= -1;
      }
    }
    setStreams(result);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <ArtifactCardView card={card} tier={tier} />
            </div>
          </div>
        ) : (
          <ArtifactCardView card={card} tier={tier} />
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
            const m    = GEM_META[color];
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

      {lumens > 0 && (
        <motion.div
          className="pointer-events-none fixed flex items-center gap-2 font-bold select-none"
          style={{
            left: midX + w * 0.58,
            top:  midY - h * 0.20,
            color: accentGlow,
            fontSize: Math.max(20, Math.round(vmin(0.040))),
            textShadow: `0 0 20px ${accent}BB, 0 2px 0 ${accentDark}`,
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0], y: [0, 0, 0, -28, -48] }}
          transition={{ duration: ARC_END, times: [0, 0.24, 0.40, 0.84, 1] }}
        >
          <Sparkles className="h-5 w-5" />
          +{lumens}
        </motion.div>
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
            className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wide whitespace-nowrap"
            style={{
              color: 'rgba(200,238,255,0.90)',
              background: 'rgba(20,40,80,0.72)',
              border: '1px solid rgba(120,200,255,0.25)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {playerName}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── AbridgedForgeAnimation ────────────────────────────────────────────────────
// Fast path: card shrinks directly from startRect to destPos — no stamp, no streams.
// Used when the player has enabled "Abridged animations" in the header menu.

export interface AbridgedForgeAnimationProps {
  animKey: number;
  card: ArtifactCard;
  tier: number;
  startRect: { x: number; y: number; w: number; h: number };
  /** Center of the destination pill (hand tab or opponent chip). */
  destPos?: { x: number; y: number };
  ownerName?: string;
  /** Called when the card finishes shrinking into the destination. */
  onComplete?: () => void;
}

export function AbridgedForgeAnimation({
  animKey, card, tier, startRect, destPos, ownerName, onComplete,
}: AbridgedForgeAnimationProps) {
  const { x: sx, y: sy, w, h } = startRect;
  const dx = destPos ? destPos.x - sx - w / 2 : 0;
  const dy = destPos ? destPos.y - sy - h / 2 : 0;

  return (
    <motion.div
      key={animKey}
      className="pointer-events-none fixed z-[52]"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.08, delay: 0.38 }}
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
          duration: 0.38,
          ease: [0.4, 0, 1, 1],
          opacity: { duration: 0.38, times: [0, 0.70, 1], ease: 'linear' },
          scale: { duration: 0.38, ease: [0.4, 0, 1, 1] },
        }}
        onAnimationComplete={() => onComplete?.()}
      >
        <ArtifactCardView card={card} tier={tier} />
      </motion.div>

      {ownerName && (
        <motion.div
          className="pointer-events-none fixed"
          style={{ left: sx + w / 2, top: sy - 26, translateX: '-50%' }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: [0, 1, 1, 0], y: [4, 0, 0, -4] }}
          transition={{ duration: 0.38, times: [0, 0.12, 0.65, 1.0] }}
        >
          <span
            className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wide whitespace-nowrap"
            style={{
              color: 'rgba(200,238,255,0.90)',
              background: 'rgba(20,40,80,0.72)',
              border: '1px solid rgba(120,200,255,0.25)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {ownerName}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

// ── OpponentForgeAnimation ────────────────────────────────────────────────────
// Full-view (non-abridged) opponent forge.  Structurally identical to
// ForgeAnimation — same four steps, same timing constants.  Only the arc
// destination differs: chipCenter (opponent avatar pill) instead of destPos.

export function OpponentForgeAnimation({
  animKey, card, tier, startRect, chipCenter, ownerName, spentColors: spentColorsProp, isCompact,
}: OpponentForgeAnimationProps) {
  const { x: sx, y: sy, w, h } = startRect;
  const { accent, accentGlow, accentDark } = resolveAccent(card.bonusColor);

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
  const tattooH    = Math.round(tattooW * VBOX_H / VBOX_W);
  const tattooLeft = (w - tattooW) / 2;
  const tattooTop  = h / 2 - tattooH / 2;

  const stampW    = Math.max(70, Math.round(w * 1.28 * 0.78));
  const stampH    = Math.round(stampW * VBOX_H / VBOX_W);
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [stamped, setStamped] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setStamped(true), STAMP_HIT * 1000);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subDur  = ARC_END - STAMP_HIT;
  const tSpring = 0.040 / subDur;
  const tHold   = (STAMP_HOLD - STAMP_HIT) / subDur;

  // spentColors: use prop if provided, else fall back to card's bonusColor
  const effectiveSpent: GemKey[] =
    spentColorsProp && spentColorsProp.length > 0
      ? spentColorsProp
      : card.bonusColor
        ? [card.bonusColor as GemKey]
        : [];

  // Streams originate from the opponent's chip/avatar, not the local affinity wells.
  const streams: StreamData[] = (() => {
    const seen = new Set<GemKey>();
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

  const lumens = card.lumens ?? 0;

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
              <ArtifactCardView card={card} tier={tier} />
            </div>
          </div>
        ) : (
          <ArtifactCardView card={card} tier={tier} />
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
            const m    = GEM_META[color];
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

      {/* ── Eminence counter ─────────────────────────────────────────────── */}
      {lumens > 0 && (
        <motion.div
          className="pointer-events-none fixed flex items-center gap-2 font-bold select-none"
          style={{
            left: midX + w * 0.58,
            top:  midY - h * 0.20,
            color: accentGlow,
            fontSize: Math.max(20, Math.round(vmin(0.040))),
            textShadow: `0 0 20px ${accent}BB, 0 2px 0 ${accentDark}`,
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0], y: [0, 0, 0, -28, -48] }}
          transition={{ duration: ARC_END, times: [0, 0.24, 0.40, 0.84, 1] }}
        >
          <Sparkles className="h-5 w-5" />
          +{lumens}
        </motion.div>
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
            className="px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wide whitespace-nowrap"
            style={{
              color: 'rgba(200,238,255,0.90)',
              background: 'rgba(20,40,80,0.72)',
              border: '1px solid rgba(120,200,255,0.25)',
              backdropFilter: 'blur(4px)',
            }}
          >
            {ownerName}
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}
