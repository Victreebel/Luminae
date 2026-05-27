/**
 * ForgeAnimation — stamp-and-fly sequence.
 *
 * Step 1  (0–180ms)   : Card lifts to viewport centre.
 * Step 2  (180–440ms) : Affinity streams flow from wells into card.
 * Step 3  (440–800ms) : Stamp SVG descends, slams card, explodes into sparks.
 *                       Tattooed impression (−10°, inside card) is left behind.
 * Step 4  (800–1150ms): Card + tattoo arc to destination and shrink away.
 *
 * Total: ~1.15 s
 *
 * Tattoo is a CHILD of the card motion.div (no overflow-hidden on card motion.div)
 * so it inherits scale/translate automatically and is always within the card.
 *
 * Descending stamp is a separate fixed element — it drops, squishes, then fades
 * to 0 opacity (the "explosion"), after which only the tattoo remains.
 */

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { ArtifactCard } from '@workspace/api-client-react';
import { ArtifactCardView } from './game-card';
import { GEM_META, type GemKey } from '@/lib/gemMeta';
import { Sparkles } from 'lucide-react';

// ── Timing (seconds) ────────────────────────────────────────────────────────
const LIFT_END    = 0.18;
const STREAMS_END = 0.44;
const STAMP_HIT   = 0.60;
const STAMP_HOLD  = 0.80;
const ARC_END     = 1.15;

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

// ── StampSVG ──────────────────────────────────────────────────────────────────
// Rectangular border + crossed hammers + FORGED, all amber/gold.
// Reused for both the descending stamp and the card tattoo.
const VBOX_W = 220;
const VBOX_H = 100;

function StampSVG({ width, height }: { width: number; height: number }) {
  const cx = VBOX_W / 2;   // 110
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

      {/* Dark fill */}
      <rect x="4" y="4" width={VBOX_W - 8} height={VBOX_H - 8} rx="4" fill="rgba(0,0,0,0.62)" />

      {/* Outer border */}
      <rect x="4" y="4" width={VBOX_W - 8} height={VBOX_H - 8} rx="4"
            fill="none" stroke="#CC7C08" strokeWidth="4.5" filter="url(#stGlow)" />
      {/* Inner accent line */}
      <rect x="9" y="9" width={VBOX_W - 18} height={VBOX_H - 18} rx="2.5"
            fill="none" stroke="#CC7C08" strokeWidth="1.2" opacity="0.45" />

      {/* Horizontal separator */}
      <line x1="20" y1="50" x2={VBOX_W - 20} y2="50"
            stroke="#CC7C08" strokeWidth="1.5" opacity="0.5" />

      {/* Crossed hammers — each hammer = head rect + handle rect, rotated ±45° */}
      <g filter="url(#stGlow)">
        {/* Hammer 1: −45° */}
        <g transform={`translate(${cx},${hammerY}) rotate(-45)`}>
          <rect x="-14" y="-26" width="28" height="15" rx="3" fill="#CC7C08" />
          <rect x="-11" y="-22" width="10" height="7"  rx="1.5" fill="#FFD080" opacity="0.38" />
          <rect x="-4.5" y="-11" width="9" height="29" rx="2.5" fill="#A06010" />
          <rect x="-2"   y="-9"  width="3" height="18" rx="1"   fill="#FFD080" opacity="0.28" />
        </g>
        {/* Hammer 2: +45° */}
        <g transform={`translate(${cx},${hammerY}) rotate(45)`}>
          <rect x="-14" y="-26" width="28" height="15" rx="3" fill="#CC7C08" />
          <rect x="-11" y="-22" width="10" height="7"  rx="1.5" fill="#FFD080" opacity="0.38" />
          <rect x="-4.5" y="-11" width="9" height="29" rx="2.5" fill="#A06010" />
          <rect x="-2"   y="-9"  width="3" height="18" rx="1"   fill="#FFD080" opacity="0.28" />
        </g>
      </g>

      {/* FORGED — amber base pass */}
      <text x={cx} y={textY}
            fontFamily='"Cinzel Decorative", "Cinzel", Georgia, serif'
            fontWeight="900" fontSize="30" fill="#CC7C08"
            textAnchor="middle" letterSpacing="5"
            filter="url(#stTextGlow)">
        FORGED
      </text>
      {/* FORGED — bright overlay */}
      <text x={cx} y={textY}
            fontFamily='"Cinzel Decorative", "Cinzel", Georgia, serif'
            fontWeight="900" fontSize="30" fill="#FFB030" fillOpacity="0.40"
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
  const midX = cx + w / 2;
  const midY = cy + h / 2;

  // Destination
  const finalX = destPos?.x ?? midX;
  const finalY = destPos?.y ?? midY;
  const dX = finalX - w / 2;
  const dY = finalY - h / 2;

  // ── Tattoo dimensions (inside card motion.div — inherits card scale) ──────
  // Must fit within card's actual pixel dimensions (w × h).
  // At -10° the bounding box grows; size conservatively at 75% of card width.
  const tattooW    = Math.max(55, Math.round(w * 0.75));
  const tattooH    = Math.round(tattooW * VBOX_H / VBOX_W);
  const tattooLeft = (w - tattooW) / 2;
  const tattooTop  = h / 2 - tattooH / 2;

  // ── Descending stamp dimensions (separate fixed element) ──────────────────
  // Sized to 78% of the card's VISUAL width at 1.28× scale.
  // Visual width = w * 1.28; 78% of that = w * 0.998 ≈ w.
  const stampW    = Math.max(70, Math.round(w * 1.28 * 0.78));
  const stampH    = Math.round(stampW * VBOX_H / VBOX_W);
  const stampLeft = midX - stampW / 2;
  const stampTop  = midY - stampH / 2;

  // Shake amplitude
  const SK = Math.round(w * 0.07);

  // Normalised time fractions (all relative to ARC_END)
  const T    = ARC_END;
  const t1   = LIFT_END    / T;               // 0.157 — lifted to centre
  const t2   = STAMP_HIT   / T;               // 0.522 — impact
  const t3   = (STAMP_HIT + 0.040) / T;       // 0.557 — post-squish
  const t4   = (STAMP_HIT + 0.080) / T;       // 0.591 — shake 1
  const t5   = (STAMP_HIT + 0.120) / T;       // 0.626 — stamp gone
  const t6   = STAMP_HOLD  / T;               // 0.696 — card settled
  const t_se = STREAMS_END / T;               // 0.383 — stamp starts descending

  const cardTimes  = [0, t1, t2, t3, t4, t5, t6, 1.0];
  // Descending stamp: appears at t_se, hits at t2, squishes, then gone at t5
  const dsTimes    = [0, t_se, t2, t3, t5];
  // Gate: tattoo is not rendered at all until the stamp physically hits.
  // Using a timer instead of framer-motion initial/animate because framer-motion
  // can flash the element for one frame before the animation clock engages.
  const [stamped, setStamped] = useState(false);
  useEffect(() => {
    const id = setTimeout(() => setStamped(true), STAMP_HIT * 1000);
    return () => clearTimeout(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Tattoo sub-animation timing (relative to its own mount, which is at STAMP_HIT)
  const subDur    = ARC_END - STAMP_HIT;          // 0.55 s remaining
  const tSpring   = 0.040 / subDur;               // ~0.073 — squish releases
  const tHold     = (STAMP_HOLD - STAMP_HIT) / subDur; // ~0.364 — card settles
  // tEnd = 1.0 — card+tattoo have finished flying

  // Measure affinity-well positions on mount
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

  return (
    <motion.div
      key={animKey}
      className="pointer-events-none fixed inset-0 z-50"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.20, delay: ARC_END }}
    >
      {/* ── Dark backdrop ──────────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.65, 0.65, 0] }}
        transition={{ duration: ARC_END, times: [0, t1, t6, 1.0] }}
      />

      {/* ══ THE CARD — lifts, shakes, then flies to destination ════════════ */}
      <motion.div
        style={{ position: 'fixed', left: 0, top: 0, width: w, height: h }}
        animate={{
          x:       [sx,   cx,    cx+SK, cx-SK, cx+SK/2, cx-SK/3, cx,   dX  ],
          y:       [sy,   cy,    cy,    cy,    cy,      cy,      cy,   dY  ],
          scale:   [1,  1.28,  1.28,  1.28,  1.28,   1.28,   1.28, 0.06],
          opacity: [1,    1,     1,     1,     1,       1,      1,    0   ],
        }}
        transition={{ duration: ARC_END, times: cardTimes, ease: 'easeInOut' }}
      >
        <ArtifactCardView card={card} tier={tier} />

        {/* Warm gold aura */}
        <motion.div
          className="absolute inset-0 rounded-[6px]"
          animate={{
            boxShadow: [
              '0 0   0px  0px #FBB83800',
              '0 0  32px 14px #FBB838AA',
              '0 0  20px  8px #FF901066',
              '0 0   0px  0px #FBB83800',
            ],
          }}
          transition={{ duration: ARC_END, times: [0, t1, t6, 1.0] }}
        />

        {/* Dark vignette during impact so tattoo pops over card art */}
        <motion.div
          className="absolute inset-0 rounded-[6px]"
          style={{ background: 'rgba(0,0,0,1)' }}
          animate={{ opacity: [0, 0, 0.55, 0.55, 0] }}
          transition={{ duration: ARC_END, times: [0, t2, t3, t6, 1.0] }}
        />

        {/* ── TATTOOED IMPRESSION ─────────────────────────────────────────── */}
        {/* Conditionally rendered only after STAMP_HIT ms — guarantees it    */}
        {/* is never in the DOM (let alone visible) before the stamp hits.    */}
        {/* Sibling to ArtifactCardView → not clipped by its overflow-hidden. */}
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
            <StampSVG width={tattooW} height={tattooH} />
          </motion.div>
        )}
      </motion.div>

      {/* ══ PHASE 2: Affinity energy streams ════════════════════════════════ */}
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
          </defs>
          {streams.map(({ color, d }, idx) => {
            const m   = GEM_META[color];
            const del = LIFT_END + idx * 0.04;
            const dur = STREAMS_END - LIFT_END + 0.12;
            return (
              <g key={color}>
                <motion.path
                  d={d} stroke={m.hex} strokeWidth={14} strokeLinecap="round" fill="none"
                  filter={`url(#sfx-${color})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.85, 0.75, 0] }}
                  transition={{ delay: del, duration: dur, times: [0, 0.40, 0.70, 1] }}
                />
                <motion.path
                  d={d} stroke={m.glowHex ?? m.hex} strokeWidth={6} strokeLinecap="round" fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 0.85, 0] }}
                  transition={{ delay: del + 0.01, duration: dur * 0.92, times: [0, 0.38, 0.68, 1] }}
                />
                <motion.path
                  d={d} stroke="#FFFFFF" strokeWidth={2.5} strokeLinecap="round" fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 1, 0.9, 0] }}
                  transition={{ delay: del + 0.02, duration: dur * 0.86, times: [0, 0.36, 0.65, 1] }}
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* ══ PHASE 3: DESCENDING STAMP — drops from above, hits card, explodes ═
          This IS the stamp (not a generic hammer). It descends over the card,
          squishes on impact, then fades to 0 — leaving only the tattoo behind. */}
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
          // Before t_se: invisible above card. At t_se: visible, starts dropping.
          // At t2: impact (squish). At t3: still squished. At t5: exploded, gone.
          y:       [-h * 2.5, -h * 2.5,  0,    0,    0   ],
          opacity: [0,         1,         1,    0.55, 0   ],
          scaleY:  [1,         1,         0.70, 0.70, 0.70],
          scaleX:  [1,         1,         1.12, 1.12, 1.12],
          rotate:  [-10,       -10,       -10,  -10,  -10 ],
        }}
        transition={{ duration: ARC_END, times: dsTimes, ease: 'easeInOut' }}
      >
        <StampSVG width={stampW} height={stampH} />
      </motion.div>

      {/* Impact flash */}
      <motion.div
        className="pointer-events-none fixed rounded-full"
        style={{
          left: midX, top: midY, translateX: '-50%', translateY: '-50%',
          background: 'radial-gradient(circle, rgba(255,210,80,1) 0%, rgba(255,130,0,0.6) 38%, transparent 68%)',
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

      {/* Impact sparks — radial burst from stamp hit point */}
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
              background: bright ? '#FFE860' : '#FF8820',
              boxShadow: `0 0 ${sz * 0.9}px ${sz * 0.4}px ${bright ? '#FFD02088' : '#FF601088'}`,
            }}
            initial={{ x: 0, y: 0, scale: 1.4, opacity: 1 }}
            animate={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, scale: 0, opacity: 0 }}
            transition={{ delay: STAMP_HIT, duration: 0.32, ease: 'easeOut' }}
          />
        );
      })}

      {/* Pulse rings at destination on arrival */}
      {destPos && [0, 0.10, 0.20].map((extra) => (
        <motion.div
          key={extra}
          className="pointer-events-none fixed rounded-full border-[3px] border-amber-300"
          style={{ left: destPos.x, top: destPos.y, translateX: '-50%', translateY: '-50%' }}
          initial={{ width: 10, height: 10, opacity: 1 }}
          animate={{ width: 100, height: 100, opacity: 0 }}
          transition={{ delay: ARC_END - 0.12 + extra, duration: 0.55, ease: 'easeOut' }}
        />
      ))}

      {/* Eminence floater */}
      {lumens > 0 && (
        <motion.div
          className="pointer-events-none fixed flex items-center gap-2 font-bold select-none"
          style={{
            left: midX + w * 0.58,
            top:  midY - h * 0.20,
            color: '#FFF0A0',
            fontSize: Math.max(20, Math.round(vmin(0.040))),
            textShadow: '0 0 20px #FFD040BB, 0 2px 0 #7A5000',
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0], y: [0, 0, 0, -28, -48] }}
          transition={{ duration: ARC_END, times: [0, 0.24, 0.40, 0.84, 1] }}
        >
          <Sparkles className="h-5 w-5" />
          +{lumens}
        </motion.div>
      )}
    </motion.div>
  );
}
