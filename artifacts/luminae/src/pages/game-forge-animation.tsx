/**
 * ForgeAnimation — 6-step forge card animation sequence.
 *
 * Step 1  (0–150ms)   : Card Lifts & Forge Awakens — lifts to centre, solar aura builds.
 * Step 2  (150–400ms) : Affinity Cost Burns In — curved coloured streams flow from wells.
 * Step 3  (400–650ms) : Forge Manifestation Peak — gold-white radial burst, outward rays.
 * Step 4  (650–950ms) : Hammer Stamp — hammer descends, FORGED stamps on card, card shakes.
 * Step 5  (950–1150ms): Compression Into Seal — card compresses into golden medallion.
 * Step 6  (1150–1400ms): Arc to Owner & Absorb — seal arcs to dest, destination pulses.
 *
 * Total: ~1.4 s   Visual language: solar gold, white-hot, affinity colours, antique brass.
 */

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { ArtifactCard } from '@workspace/api-client-react';
import { ArtifactCardView } from './game-card';
import { GEM_META, type GemKey } from '@/lib/gemMeta';
import { Sparkles } from 'lucide-react';

// ── Timing (seconds) ────────────────────────────────────────────────────────
const LIFT_END    = 0.15;   // card arrives at centre
const STREAMS_END = 0.40;   // affinity streams done
// PEAK_END = 0.65 s (baked into delay offsets below, not a named constant)
const STAMP_HIT   = 0.77;   // hammer impact
const STAMP_END   = 0.95;   // stamp phase ends
const SEAL_END    = 1.15;   // card compressed → seal visible
const ARC_END     = 1.40;   // seal lands at destination

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Quadratic bezier SVG path that curves perpendicular to the travel direction. */
function arcPath(fx: number, fy: number, tx: number, ty: number, curveSign = 1): string {
  const dx = tx - fx, dy = ty - fy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return `M ${fx},${fy}`;
  const mx = (fx + tx) / 2, my = (fy + ty) / 2;
  const cpX = mx + (-dy / len) * len * 0.38 * curveSign;
  const cpY = my + ( dx / len) * len * 0.38 * curveSign;
  return `M ${fx},${fy} Q ${cpX},${cpY} ${tx},${ty}`;
}

/** 8-pointed starburst polygon points in a size×size viewBox. */
function starPoints(size: number): string {
  const c = size / 2;
  return Array.from({ length: 16 }, (_, i) => {
    const r = i % 2 === 0 ? c * 0.92 : c * 0.42;
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    return `${(c + r * Math.cos(a)).toFixed(2)},${(c + r * Math.sin(a)).toFixed(2)}`;
  }).join(' ');
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
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ForgeAnimation({
  animKey,
  card,
  tier,
  startRect,
  destPos,
  spentColors,
  lumens,
}: ForgeAnimationProps) {
  const { x: sx, y: sy, w, h } = startRect;

  // Card centre position on screen
  const cx = window.innerWidth  / 2 - w / 2;
  const cy = window.innerHeight / 2 - h / 2 - 20;
  const cardMidX = cx + w / 2;
  const cardMidY = cy + h / 2;

  // Seal diameter ≈ 60 % of card width
  const SEAL = Math.round(Math.min(w * 0.6, 80));

  // Arc destination (centre of hand tab, or card centre as fallback)
  const finalX = destPos?.x ?? cardMidX;
  const finalY = destPos?.y ?? cardMidY;
  // Arc midpoint curves upward between card and destination
  const arcMidX = (cardMidX + finalX) / 2 - SEAL / 2;
  const arcMidY = Math.min(cardMidY, finalY) - 90;

  // ── Measure affinity-well DOM positions after first render ──────────────────
  const [streams, setStreams] = useState<StreamData[]>([]);
  useEffect(() => {
    const seen = new Set<GemKey>();
    const measured: StreamData[] = [];
    let sign = 1;
    for (const color of spentColors) {
      if (seen.has(color) || color === 'flux') continue;
      seen.add(color);
      const el = document.querySelector(`[data-affinity-well="${color}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        measured.push({
          color,
          d: arcPath(r.left + r.width / 2, r.top + r.height / 2, cardMidX, cardMidY, sign),
        });
        sign *= -1; // alternate curve direction for variety
      }
    }
    setStreams(measured);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Card keyframes: lift → hold → shake → compress away ──────────────────
  // 9 keyframes over SEAL_END (1.15 s)
  const CARD_DUR = SEAL_END;
  const cardT = [0, LIFT_END/CARD_DUR, 0.140, 0.670, 0.696, 0.722, 0.748, 0.774, 1.0];

  // ── Seal-arc displacement offsets (relative to seal's initial fixed position)
  const sealStartX = cardMidX - SEAL / 2;
  const sealStartY = cardMidY - SEAL / 2;
  const dArcX = arcMidX - sealStartX;
  const dArcY = arcMidY - sealStartY;
  const dFinalX = finalX - SEAL / 2 - sealStartX;
  const dFinalY = finalY - SEAL / 2 - sealStartY;

  // ── Rays: 12 lines radiating from card centre (appear at STREAMS_END) ──────
  const RAY_LEN = w * 0.82;
  const RAYS = Array.from({ length: 12 }, (_, i) => i * 30);

  // ── Impact sparks: 8 dots that fly outward at STAMP_HIT ──────────────────
  const SPARK_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
  const SPARK_DIST = w * 0.65;

  return (
    <motion.div
      key={animKey}
      className="pointer-events-none fixed inset-0 z-50"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, delay: ARC_END }}
    >
      {/* ── Dark backdrop ─────────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.52, 0.52, 0] }}
        transition={{ duration: ARC_END, times: [0, LIFT_END / ARC_END, SEAL_END / ARC_END, 1] }}
      />

      {/* ══ PHASE 1–4+5: Card element (lift → hold → shake → vanish) ═══════ */}
      <motion.div
        style={{ position: 'fixed', left: 0, top: 0, width: w, height: h }}
        animate={{
          x:       [sx,  cx,  cx,  cx+8, cx-7, cx+4, cx-2, cx,  cx ],
          y:       [sy,  cy,  cy,  cy,   cy,   cy,   cy,   cy,  cy ],
          scale:   [1, 1.18, 1.18, 1.18, 1.18, 1.18, 1.18, 1.18, 0 ],
          opacity: [1,  1,    1,    1,    1,    1,    1,    1,   0 ],
        }}
        transition={{ duration: CARD_DUR, times: cardT, ease: 'easeOut' }}
      >
        <ArtifactCardView card={card} tier={tier} />

        {/* Solar aura glow around the card */}
        <motion.div
          className="absolute inset-0 rounded-[6px]"
          animate={{
            boxShadow: [
              '0 0  0px  0px #FBB83800',
              '0 0 20px  8px #FBB83855',
              '0 0 36px 14px #FBB83888',
              '0 0 60px 24px #FFF4C2FF',
              '0 0 28px 10px #FF901060',
              '0 0  0px  0px #FBB83800',
            ],
          }}
          transition={{ duration: CARD_DUR, times: [0, 0.130, 0.348, 0.565, 0.826, 1.0] }}
        />

        {/* FORGED stamp overlay — stamps down at STAMP_HIT */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center rounded-[6px] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ duration: CARD_DUR, times: [0, 0.620, 0.696, 0.826, 1.0] }}
        >
          {/* Dark vignette so text pops */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.42)' }} />
          <motion.span
            className="relative select-none"
            style={{
              fontSize: Math.round(w * 0.38),
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontWeight: 900,
              letterSpacing: '0.04em',
              color: '#FF8020',
              WebkitTextStroke: '2px #FF5000',
              textShadow: '0 0 24px #FF8000CC, 0 3px 0 #6A2800',
              transform: 'rotate(-9deg)',
              lineHeight: 1,
            }}
            initial={{ scale: 3.2, opacity: 0 }}
            animate={{ scale: [3.2, 3.2, 1, 1], opacity: [0, 0, 1, 0] }}
            transition={{ duration: CARD_DUR, times: [0, 0.620, 0.700, 1.0] }}
          >
            FORGED
          </motion.span>
        </motion.div>
      </motion.div>

      {/* ══ PHASE 2: Curved affinity energy streams (SVG) ════════════════════ */}
      {streams.length > 0 && (
        <svg
          className="pointer-events-none fixed inset-0"
          style={{ width: '100vw', height: '100vh', overflow: 'visible' }}
        >
          <defs>
            {streams.map(({ color }) => {
              return (
                <filter key={color} id={`sfx-${color}`} x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="4" result="b" />
                  <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              );
            })}
          </defs>
          {streams.map(({ color, d }, idx) => {
            const m = GEM_META[color];
            const streamDelay = LIFT_END + idx * 0.04;
            const streamDur   = STREAMS_END - LIFT_END + 0.12;
            return (
              <g key={color}>
                {/* Wide glow trail */}
                <motion.path
                  d={d}
                  stroke={m.hex}
                  strokeWidth={6}
                  strokeLinecap="round"
                  fill="none"
                  filter={`url(#sfx-${color})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.7, 0.65, 0] }}
                  transition={{ delay: streamDelay, duration: streamDur, times: [0, 0.42, 0.72, 1] }}
                />
                {/* Bright core line */}
                <motion.path
                  d={d}
                  stroke="#FFFFFF"
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.9, 0.7, 0] }}
                  transition={{ delay: streamDelay + 0.02, duration: streamDur * 0.88, times: [0, 0.38, 0.68, 1] }}
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* ══ PHASE 3: Radial burst — outward rays from card centre ════════════ */}
      {RAYS.map((deg) => (
        <motion.div
          key={deg}
          style={{
            position: 'fixed',
            left: cardMidX - 1.5,
            top:  cardMidY - RAY_LEN,
            width: 3,
            height: RAY_LEN,
            background: 'linear-gradient(to bottom, rgba(255,220,80,0) 0%, rgba(255,220,80,0.8) 55%, rgba(255,248,200,1) 100%)',
            transformOrigin: 'center 100%',
            rotate: `${deg}deg`,
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: [0, 1, 0], opacity: [0, 0.95, 0] }}
          transition={{ delay: STREAMS_END, duration: 0.42, times: [0, 0.38, 1] }}
        />
      ))}

      {/* Peak flash ring — expands out from card centre */}
      <motion.div
        className="pointer-events-none fixed rounded-full"
        style={{
          left: cardMidX,
          top:  cardMidY,
          translateX: '-50%',
          translateY: '-50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(255,240,160,0.7) 35%, transparent 68%)',
        }}
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{
          width:   [0, w * 1.8, w * 3.2, 0],
          height:  [0, w * 1.8, w * 3.2, 0],
          opacity: [0, 0.85,    0.15,     0],
        }}
        transition={{ delay: STREAMS_END, duration: 0.38, times: [0, 0.28, 0.75, 1] }}
      />

      {/* ══ PHASE 4: Hammer sigil descends onto card ════════════════════════ */}
      <motion.div
        className="pointer-events-none fixed"
        style={{ left: cardMidX, top: cy + h * 0.15, translateX: '-50%', translateY: '-100%' }}
        animate={{
          y:       [-h * 0.9, -h * 0.9, h * 0.18, h * 0.18],
          opacity: [0,         1,         1,         0        ],
          scale:   [1.4,       1.4,       1.0,       1.0      ],
        }}
        transition={{
          duration: STAMP_END,
          times:    [0, 0.684, 0.811, 1.0],
          ease:     ['linear', 'linear', [0.2, 0, 0.5, 1]],
        }}
      >
        <svg viewBox="0 0 64 64" width={60} height={60}>
          <defs>
            <filter id="hglow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g filter="url(#hglow)">
            {/* Hammer head */}
            <rect x="8"  y="6"  width="48" height="22" rx="5" fill="#B87028" stroke="#FFD060" strokeWidth="2" />
            {/* Head highlight */}
            <rect x="11" y="9"  width="18" height="8"  rx="3" fill="#FFE090" opacity="0.6" />
            {/* Handle */}
            <rect x="28" y="26" width="9"  height="32" rx="4" fill="#7A4E2A" stroke="#B07840" strokeWidth="1.2" />
            {/* Handle highlight */}
            <rect x="30" y="28" width="3.5" height="20" rx="1.5" fill="#C09060" opacity="0.45" />
          </g>
        </svg>
      </motion.div>

      {/* Impact flash at stamp hit */}
      <motion.div
        className="pointer-events-none fixed rounded-full"
        style={{
          left: cardMidX, top: cardMidY,
          translateX: '-50%', translateY: '-50%',
          background: 'radial-gradient(circle, rgba(255,200,80,0.95) 0%, rgba(255,120,0,0.5) 40%, transparent 70%)',
        }}
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{
          width:   [0, 0, w * 1.4, 0],
          height:  [0, 0, w * 1.4, 0],
          opacity: [0, 0, 0.9,     0],
        }}
        transition={{ duration: STAMP_END, times: [0, 0.800, 0.840, 1.0] }}
      />

      {/* Impact sparks — fly outward at STAMP_HIT */}
      {SPARK_ANGLES.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <motion.div
            key={deg}
            className="pointer-events-none fixed rounded-full"
            style={{
              left: cardMidX - 3, top: cardMidY - 3,
              width: 6, height: 6,
              background: deg % 90 === 0 ? '#FFE870' : '#FF9030',
            }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x: Math.cos(rad) * SPARK_DIST,
              y: Math.sin(rad) * SPARK_DIST,
              scale: [1, 0.2],
              opacity: [1, 0],
            }}
            transition={{ delay: STAMP_HIT, duration: 0.28, ease: 'easeOut' }}
          />
        );
      })}

      {/* ══ PHASE 5: Golden compass/medallion seal forms ══════════════════════ */}
      <motion.div
        className="pointer-events-none fixed"
        style={{ left: sealStartX, top: sealStartY, width: SEAL, height: SEAL }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 0, 1.2, 1, 1, 0], opacity: [0, 0, 1, 1, 1, 0] }}
        transition={{ duration: ARC_END - STAMP_END, delay: STAMP_END, times: [0, 0.08, 0.30, 0.50, 0.76, 1.0] }}
      >
        <svg width={SEAL} height={SEAL} viewBox={`0 0 ${SEAL} ${SEAL}`} style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="sgOuter" cx="38%" cy="32%">
              <stop offset="0%"   stopColor="#FFE888" />
              <stop offset="50%"  stopColor="#D4881A" />
              <stop offset="100%" stopColor="#7A4400" />
            </radialGradient>
            <radialGradient id="sgInner" cx="38%" cy="32%">
              <stop offset="0%"   stopColor="#FFF8D0" />
              <stop offset="60%"  stopColor="#FFB830" />
              <stop offset="100%" stopColor="#A05800" />
            </radialGradient>
            <filter id="sglow" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g filter="url(#sglow)">
            {/* 8-pointed star body */}
            <polygon points={starPoints(SEAL)} fill="url(#sgOuter)" stroke="#FFD060" strokeWidth="1" />
            {/* Central disc */}
            <circle cx={SEAL/2} cy={SEAL/2} r={SEAL * 0.3} fill="url(#sgInner)" stroke="#FFD060" strokeWidth="1.5" />
            {/* Mini hammer icon on disc */}
            {(() => {
              const c = SEAL / 2;
              return (
                <g>
                  <rect x={c-9} y={c-10} width={18} height={9}  rx="2" fill="#7A3800" stroke="#FFD060" strokeWidth="0.8" />
                  <rect x={c-2} y={c-2}  width={4}  height={12} rx="1.5" fill="#5A2800" stroke="#A06030" strokeWidth="0.6" />
                  <rect x={c-7} y={c-8}  width={7}  height={4}  rx="1"   fill="#FFE090" opacity="0.5" />
                </g>
              );
            })()}
          </g>
        </svg>
        {/* Seal glow ring */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ boxShadow: ['0 0 18px 6px #FFA83099', '0 0 32px 12px #FFD04066', '0 0 18px 6px #FFA83099'] }}
          transition={{ duration: 0.45, repeat: Infinity, repeatType: 'mirror' }}
        />
      </motion.div>

      {/* ══ PHASE 6: Seal arc flight to destination ═══════════════════════════ */}
      <motion.div
        className="pointer-events-none fixed"
        style={{ left: sealStartX, top: sealStartY, width: SEAL, height: SEAL }}
        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
        animate={{
          x: [0, dArcX, dFinalX],
          y: [0, dArcY, dFinalY],
          scale:   [1,  0.85, 0.18],
          opacity: [1,  1,    0   ],
        }}
        transition={{ delay: SEAL_END, duration: ARC_END - SEAL_END, times: [0, 0.5, 1], ease: 'easeIn' }}
      >
        <svg width={SEAL} height={SEAL} viewBox={`0 0 ${SEAL} ${SEAL}`} style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="sgOuter2" cx="38%" cy="32%">
              <stop offset="0%"   stopColor="#FFE888" />
              <stop offset="50%"  stopColor="#D4881A" />
              <stop offset="100%" stopColor="#7A4400" />
            </radialGradient>
          </defs>
          <polygon points={starPoints(SEAL)} fill="url(#sgOuter2)" stroke="#FFD060" strokeWidth="1" />
          <circle cx={SEAL/2} cy={SEAL/2} r={SEAL * 0.3} fill="#FFB830" stroke="#FFD060" strokeWidth="1.5" />
        </svg>
      </motion.div>

      {/* ── Absorption pulse rings at destination ────────────────────────── */}
      {destPos && [0, 0.08, 0.16].map((extraDelay) => (
        <motion.div
          key={extraDelay}
          className="pointer-events-none fixed rounded-full border-2 border-amber-300"
          style={{
            left: destPos.x, top: destPos.y,
            translateX: '-50%', translateY: '-50%',
          }}
          initial={{ width: 8, height: 8, opacity: 0.9 }}
          animate={{ width: 88, height: 88, opacity: 0 }}
          transition={{ delay: ARC_END - 0.15 + extraDelay, duration: 0.55, ease: 'easeOut' }}
        />
      ))}

      {/* ══ Eminence floater (if card awards lumens) ══════════════════════════ */}
      {lumens > 0 && (
        <motion.div
          className="pointer-events-none fixed flex items-center gap-1.5 font-bold select-none"
          style={{
            left: cardMidX + w * 0.58,
            top:  cardMidY - h * 0.18,
            color: '#FFF0A0',
            fontSize: 17,
            textShadow: '0 0 14px #FFD04099',
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0], y: [0, 0, 0, -22, -38] }}
          transition={{ duration: ARC_END, times: [0, 0.28, 0.44, 0.85, 1] }}
        >
          <Sparkles className="h-4 w-4" />
          +{lumens}
        </motion.div>
      )}
    </motion.div>
  );
}
