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
 *
 * IMPORTANT: Burst-effect sizes are viewport-relative (vmin), NOT card-pixel-relative.
 * The card is ~130px wide; sizing rays/sparks off that made them invisible.
 */

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { ArtifactCard } from '@workspace/api-client-react';
import { ArtifactCardView } from './game-card';
import { GEM_META, type GemKey } from '@/lib/gemMeta';
import { Sparkles } from 'lucide-react';

// ── Timing (seconds) ────────────────────────────────────────────────────────
const LIFT_END    = 0.15;
const STREAMS_END = 0.40;
// PEAK_END = 0.65 s — baked into delay offsets, not a named constant
const STAMP_HIT   = 0.77;
const STAMP_END   = 0.95;
const SEAL_END    = 1.15;
const ARC_END     = 1.40;

// ── Viewport-relative sizes (computed once at render) ────────────────────────
// Using Math.min(innerWidth, innerHeight) as "vmin" so the burst fills small viewports.
function vmin(fraction: number): number {
  return Math.min(window.innerWidth, window.innerHeight) * fraction;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Quadratic bezier SVG path that curves perpendicular to the travel direction. */
function arcPath(fx: number, fy: number, tx: number, ty: number, sign = 1): string {
  const dx = tx - fx, dy = ty - fy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return `M ${fx},${fy}`;
  const mx = (fx + tx) / 2, my = (fy + ty) / 2;
  const cpX = mx + (-dy / len) * len * 0.42 * sign;
  const cpY = my + ( dx / len) * len * 0.42 * sign;
  return `M ${fx},${fy} Q ${cpX},${cpY} ${tx},${ty}`;
}

/** 8-pointed starburst polygon points in a sz×sz viewBox. */
function starPoints(sz: number): string {
  const c = sz / 2;
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

  // Card lifts to viewport centre
  const cx = window.innerWidth  / 2 - w / 2;
  const cy = window.innerHeight / 2 - h / 2 - 24;
  const midX = cx + w / 2;   // horizontal centre of the card
  const midY = cy + h / 2;   // vertical centre of the card

  // ── Viewport-relative effect sizes ─────────────────────────────────────────
  const RAY_LEN    = vmin(0.46);          // ~230px on a 500px-tall phone
  const RAY_W      = Math.max(4, vmin(0.008));
  const FLASH_MAX  = vmin(0.72);          // big enough to engulf card
  const SPARK_DIST = vmin(0.28);
  const SPARK_SZ   = Math.max(10, vmin(0.020));
  const SEAL       = Math.max(100, Math.round(vmin(0.18)));  // medallion diameter
  const HAMMER_SZ  = Math.max(80, Math.round(vmin(0.14)));
  const STAMP_FONT = Math.max(52, Math.round(w * 0.50));

  // ── Seal positions ────────────────────────────────────────────────────────
  const sealX = midX - SEAL / 2;
  const sealY = midY - SEAL / 2;

  // Seal arc destination
  const finalX = destPos?.x ?? midX;
  const finalY = destPos?.y ?? midY;
  const arcMidX = (midX + finalX) / 2 - SEAL / 2;
  const arcMidY = Math.min(midY, finalY) - vmin(0.14);
  const dArcX   = arcMidX - sealX;
  const dArcY   = arcMidY - sealY;
  const dFinalX = finalX - SEAL / 2 - sealX;
  const dFinalY = finalY - SEAL / 2 - sealY;

  // ── Card keyframe timings ─────────────────────────────────────────────────
  const CARD_DUR = SEAL_END;  // card exists for phases 1–5
  const cardT = [0, LIFT_END / CARD_DUR, 0.14, 0.670, 0.696, 0.722, 0.748, 0.774, 1.0];
  // Shake offsets — scaled to card width so they feel proportional
  const SK = Math.round(w * 0.07);

  // ── Measure affinity-well positions on mount ──────────────────────────────
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

  // ── Ray angles (12 evenly spaced) ────────────────────────────────────────
  const RAYS = Array.from({ length: 12 }, (_, i) => i * 30);

  // ── Impact sparks (8 directions) ─────────────────────────────────────────
  const SPARKS = [0, 45, 90, 135, 180, 225, 270, 315];

  return (
    <motion.div
      key={animKey}
      className="pointer-events-none fixed inset-0 z-50"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, delay: ARC_END }}
    >
      {/* ── Dark backdrop ──────────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.68, 0.68, 0] }}
        transition={{ duration: ARC_END, times: [0, LIFT_END / ARC_END, SEAL_END / ARC_END, 1] }}
      />

      {/* ══ PHASES 1–5: Lifted card (lift → hold → shake → vanish) ═════════ */}
      <motion.div
        style={{ position: 'fixed', left: 0, top: 0, width: w, height: h }}
        animate={{
          x:       [sx,   cx,   cx,   cx+SK, cx-SK, cx+SK*0.5, cx-SK*0.3, cx, cx],
          y:       [sy,   cy,   cy,   cy,    cy,    cy,         cy,        cy, cy],
          scale:   [1,  1.28, 1.28, 1.28, 1.28,  1.28,       1.28,     1.28,  0],
          opacity: [1,    1,    1,    1,    1,     1,          1,         1,    0],
        }}
        transition={{ duration: CARD_DUR, times: cardT, ease: 'easeOut' }}
      >
        <ArtifactCardView card={card} tier={tier} />

        {/* Solar aura — peaks to bright white-gold at step 3 */}
        <motion.div
          className="absolute inset-0 rounded-[6px]"
          animate={{
            boxShadow: [
              '0 0   0px   0px #FBB83800',
              '0 0  28px  12px #FBB83866',
              '0 0  56px  22px #FBB838AA',
              '0 0  96px  40px #FFF4C2FF',
              '0 0  44px  18px #FF901070',
              '0 0   0px   0px #FBB83800',
            ],
          }}
          transition={{ duration: CARD_DUR, times: [0, 0.130, 0.348, 0.565, 0.826, 1.0] }}
        />

        {/* FORGED stamp overlay */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center rounded-[6px] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ duration: CARD_DUR, times: [0, 0.620, 0.696, 0.826, 1.0] }}
        >
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.50)' }} />
          <motion.span
            className="relative select-none"
            style={{
              fontSize: STAMP_FONT,
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontWeight: 900,
              letterSpacing: '0.04em',
              color: '#FF8C20',
              WebkitTextStroke: `${Math.max(2, Math.round(STAMP_FONT / 22))}px #FF4800`,
              textShadow: '0 0 32px #FF8000EE, 0 4px 0 #6A2800',
              transform: 'rotate(-9deg)',
              lineHeight: 1,
            }}
            initial={{ scale: 3.5, opacity: 0 }}
            animate={{ scale: [3.5, 3.5, 1, 1], opacity: [0, 0, 1, 0] }}
            transition={{ duration: CARD_DUR, times: [0, 0.620, 0.700, 1.0] }}
          >
            FORGED
          </motion.span>
        </motion.div>
      </motion.div>

      {/* ══ PHASE 2: Curved affinity streams (SVG) ═══════════════════════════ */}
      {streams.length > 0 && (
        <svg
          className="pointer-events-none fixed inset-0"
          style={{ width: '100vw', height: '100vh', overflow: 'visible' }}
        >
          <defs>
            {streams.map(({ color }) => (
              <filter key={color} id={`sfx-${color}`} x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur stdDeviation="8" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            ))}
          </defs>
          {streams.map(({ color, d }, idx) => {
            const m = GEM_META[color];
            const delay = LIFT_END + idx * 0.04;
            const dur   = STREAMS_END - LIFT_END + 0.14;
            return (
              <g key={color}>
                {/* Outer glow trail */}
                <motion.path
                  d={d}
                  stroke={m.hex}
                  strokeWidth={14}
                  strokeLinecap="round"
                  fill="none"
                  filter={`url(#sfx-${color})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.85, 0.75, 0] }}
                  transition={{ delay, duration: dur, times: [0, 0.40, 0.70, 1] }}
                />
                {/* Mid glow */}
                <motion.path
                  d={d}
                  stroke={m.glowHex ?? m.hex}
                  strokeWidth={6}
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 0.85, 0] }}
                  transition={{ delay: delay + 0.01, duration: dur * 0.92, times: [0, 0.38, 0.68, 1] }}
                />
                {/* Bright white core */}
                <motion.path
                  d={d}
                  stroke="#FFFFFF"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 0.9, 0] }}
                  transition={{ delay: delay + 0.02, duration: dur * 0.86, times: [0, 0.36, 0.65, 1] }}
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* ══ PHASE 3: Outward rays ═════════════════════════════════════════════ */}
      {RAYS.map((deg) => (
        <motion.div
          key={deg}
          style={{
            position: 'fixed',
            left:  midX - RAY_W / 2,
            top:   midY - RAY_LEN,
            width: RAY_W,
            height: RAY_LEN,
            background: `linear-gradient(to bottom,
              rgba(255,230,80,0) 0%,
              rgba(255,230,80,0.75) 50%,
              rgba(255,255,210,1) 100%)`,
            transformOrigin: `${RAY_W / 2}px ${RAY_LEN}px`,
            rotate: `${deg}deg`,
          }}
          initial={{ scaleY: 0, opacity: 0 }}
          animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }}
          transition={{ delay: STREAMS_END, duration: 0.40, times: [0, 0.36, 1] }}
        />
      ))}

      {/* Peak white-gold flash ring */}
      <motion.div
        className="pointer-events-none fixed rounded-full"
        style={{
          left: midX, top: midY,
          translateX: '-50%', translateY: '-50%',
          background: 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,245,160,0.8) 30%, rgba(255,200,60,0.4) 58%, transparent 72%)',
        }}
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{
          width:   [0, FLASH_MAX * 0.55, FLASH_MAX, 0],
          height:  [0, FLASH_MAX * 0.55, FLASH_MAX, 0],
          opacity: [0, 0.95,             0.25,       0],
        }}
        transition={{ delay: STREAMS_END, duration: 0.36, times: [0, 0.24, 0.72, 1] }}
      />

      {/* ══ PHASE 4: Hammer descends ══════════════════════════════════════════ */}
      <motion.div
        className="pointer-events-none fixed"
        style={{ left: midX, top: cy + h * 0.1, translateX: '-50%', translateY: '-100%' }}
        animate={{
          y:       [-HAMMER_SZ * 2.2, -HAMMER_SZ * 2.2, HAMMER_SZ * 0.2, HAMMER_SZ * 0.2],
          opacity: [0,                 1,                 1,                0               ],
          scale:   [1.6,               1.6,               1.0,              1.0             ],
        }}
        transition={{
          duration: STAMP_END,
          times:    [0, 0.684, 0.811, 1.0],
          ease:     ['linear', 'linear', [0.15, 0, 0.45, 1]],
        }}
      >
        <svg viewBox="0 0 64 64" width={HAMMER_SZ} height={HAMMER_SZ}>
          <defs>
            <filter id="hglow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g filter="url(#hglow)">
            <rect x="6"  y="5"  width="52" height="24" rx="6" fill="#B87028" stroke="#FFD060" strokeWidth="2.5" />
            <rect x="10" y="8"  width="20" height="9"  rx="3" fill="#FFE090" opacity="0.65" />
            <rect x="27" y="27" width="10" height="32" rx="4" fill="#7A4E2A" stroke="#B07840" strokeWidth="1.5" />
            <rect x="30" y="30" width="4"  height="20" rx="2" fill="#C09060" opacity="0.50" />
          </g>
        </svg>
      </motion.div>

      {/* Impact flash — viewport-relative */}
      <motion.div
        className="pointer-events-none fixed rounded-full"
        style={{
          left: midX, top: midY,
          translateX: '-50%', translateY: '-50%',
          background: 'radial-gradient(circle, rgba(255,210,80,1) 0%, rgba(255,130,0,0.65) 38%, transparent 68%)',
        }}
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{
          width:   [0, 0, vmin(0.55), 0],
          height:  [0, 0, vmin(0.55), 0],
          opacity: [0, 0, 1,          0],
        }}
        transition={{ duration: STAMP_END, times: [0, 0.795, 0.840, 1.0] }}
      />

      {/* Impact sparks — fly out at STAMP_HIT */}
      {SPARKS.map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <motion.div
            key={deg}
            className="pointer-events-none fixed rounded-full"
            style={{
              left: midX - SPARK_SZ / 2,
              top:  midY - SPARK_SZ / 2,
              width: SPARK_SZ, height: SPARK_SZ,
              background: deg % 90 === 0 ? '#FFE860' : '#FF8820',
              boxShadow: `0 0 ${SPARK_SZ * 0.8}px ${SPARK_SZ * 0.4}px ${deg % 90 === 0 ? '#FFD02088' : '#FF601088'}`,
            }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{
              x:       Math.cos(rad) * SPARK_DIST,
              y:       Math.sin(rad) * SPARK_DIST,
              scale:   [1, 1, 0.15],
              opacity: [1, 0.9, 0],
            }}
            transition={{ delay: STAMP_HIT, duration: 0.32, ease: 'easeOut', times: [0, 0.3, 1] }}
          />
        );
      })}

      {/* ══ PHASE 5: Golden medallion seal forms ══════════════════════════════ */}
      <motion.div
        className="pointer-events-none fixed"
        style={{ left: sealX, top: sealY, width: SEAL, height: SEAL }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 0, 1.25, 1, 1, 0], opacity: [0, 0, 1, 1, 1, 0] }}
        transition={{ duration: ARC_END - STAMP_END, delay: STAMP_END, times: [0, 0.08, 0.28, 0.46, 0.74, 1.0] }}
      >
        <svg width={SEAL} height={SEAL} viewBox={`0 0 ${SEAL} ${SEAL}`} style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="sg1" cx="38%" cy="30%">
              <stop offset="0%"   stopColor="#FFE888" />
              <stop offset="50%"  stopColor="#D48818" />
              <stop offset="100%" stopColor="#7A4200" />
            </radialGradient>
            <radialGradient id="sg2" cx="38%" cy="30%">
              <stop offset="0%"   stopColor="#FFF8D0" />
              <stop offset="55%"  stopColor="#FFB830" />
              <stop offset="100%" stopColor="#9A5400" />
            </radialGradient>
            <filter id="sglw" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <g filter="url(#sglw)">
            <polygon points={starPoints(SEAL)} fill="url(#sg1)" stroke="#FFD060" strokeWidth="1.5" />
            <circle cx={SEAL/2} cy={SEAL/2} r={SEAL * 0.3} fill="url(#sg2)" stroke="#FFE060" strokeWidth="2" />
            {/* Hammer icon on centre disc */}
            {(() => {
              const c = SEAL / 2, s = SEAL * 0.12;
              return (
                <g>
                  <rect x={c-s*1.1} y={c-s*1.2} width={s*2.2} height={s} rx={s*0.25} fill="#7A3800" stroke="#FFD060" strokeWidth={s*0.1} />
                  <rect x={c-s*0.25} y={c-s*0.25} width={s*0.5} height={s*1.4} rx={s*0.18} fill="#5A2800" stroke="#A06030" strokeWidth={s*0.08} />
                  <rect x={c-s*0.85} y={c-s*0.95} width={s*0.85} height={s*0.48} rx={s*0.12} fill="#FFE090" opacity="0.5" />
                </g>
              );
            })()}
          </g>
        </svg>
        {/* Pulsing glow ring around seal */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: [
              '0 0 22px  8px #FFA83099',
              '0 0 48px 20px #FFD04077',
              '0 0 22px  8px #FFA83099',
            ],
          }}
          transition={{ duration: 0.42, repeat: Infinity, repeatType: 'mirror' }}
        />
      </motion.div>

      {/* ══ PHASE 6: Seal arcs to destination ════════════════════════════════ */}
      <motion.div
        className="pointer-events-none fixed"
        style={{ left: sealX, top: sealY, width: SEAL, height: SEAL }}
        initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
        animate={{
          x:       [0,      dArcX,  dFinalX],
          y:       [0,      dArcY,  dFinalY],
          scale:   [1,      0.80,   0.14   ],
          opacity: [1,      1,      0      ],
        }}
        transition={{ delay: SEAL_END, duration: ARC_END - SEAL_END, times: [0, 0.48, 1], ease: 'easeIn' }}
      >
        <svg width={SEAL} height={SEAL} viewBox={`0 0 ${SEAL} ${SEAL}`} style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="sg3" cx="38%" cy="30%">
              <stop offset="0%"   stopColor="#FFE888" />
              <stop offset="50%"  stopColor="#D48818" />
              <stop offset="100%" stopColor="#7A4200" />
            </radialGradient>
          </defs>
          <polygon points={starPoints(SEAL)} fill="url(#sg3)" stroke="#FFD060" strokeWidth="1.5" />
          <circle cx={SEAL/2} cy={SEAL/2} r={SEAL * 0.3} fill="#FFB830" stroke="#FFE060" strokeWidth="2" />
        </svg>
      </motion.div>

      {/* Absorption pulse rings at destination */}
      {destPos && [0, 0.09, 0.18].map((extra) => (
        <motion.div
          key={extra}
          className="pointer-events-none fixed rounded-full border-[3px] border-amber-300"
          style={{
            left: destPos.x, top: destPos.y,
            translateX: '-50%', translateY: '-50%',
          }}
          initial={{ width: 10, height: 10, opacity: 1 }}
          animate={{ width: 120, height: 120, opacity: 0 }}
          transition={{ delay: ARC_END - 0.14 + extra, duration: 0.60, ease: 'easeOut' }}
        />
      ))}

      {/* ══ Eminence floater ══════════════════════════════════════════════════ */}
      {lumens > 0 && (
        <motion.div
          className="pointer-events-none fixed flex items-center gap-2 font-bold select-none"
          style={{
            left: midX + w * 0.60,
            top:  midY - h * 0.20,
            color: '#FFF0A0',
            fontSize: Math.max(20, Math.round(vmin(0.042))),
            textShadow: '0 0 20px #FFD040BB, 0 2px 0 #7A5000',
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0], y: [0, 0, 0, -28, -48] }}
          transition={{ duration: ARC_END, times: [0, 0.26, 0.42, 0.84, 1] }}
        >
          <Sparkles className="h-5 w-5" />
          +{lumens}
        </motion.div>
      )}
    </motion.div>
  );
}
