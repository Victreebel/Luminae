/**
 * ForgeAnimation — simplified stamp-and-fly sequence.
 *
 * Step 1  (0–180ms)   : Card lifts to viewport centre.
 * Step 2  (180–440ms) : Affinity streams flow from wells into card.
 * Step 3  (440–800ms) : Hammer descends and stamps FORGED on card; card shakes.
 * Step 4  (800–1150ms): Stamped card arcs to destination and shrinks away.
 *
 * Total: ~1.15 s
 */

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { ArtifactCard } from '@workspace/api-client-react';
import { ArtifactCardView } from './game-card';
import { GEM_META, type GemKey } from '@/lib/gemMeta';
import { Sparkles } from 'lucide-react';

// ── Timing (seconds) ────────────────────────────────────────────────────────
const LIFT_END    = 0.18;   // card arrives at centre
const STREAMS_END = 0.44;   // affinity streams done
const STAMP_HIT   = 0.60;   // hammer makes contact
const STAMP_HOLD  = 0.80;   // hammer leaves, card settled
const ARC_END     = 1.15;   // card arrives at destination

// ── Viewport-relative sizing ─────────────────────────────────────────────────
function vmin(f: number) {
  return Math.min(window.innerWidth, window.innerHeight) * f;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function arcPath(fx: number, fy: number, tx: number, ty: number, sign = 1): string {
  const dx = tx - fx, dy = ty - fy;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return `M ${fx},${fy}`;
  const mx = (fx + tx) / 2, my = (fy + ty) / 2;
  return `M ${fx},${fy} Q ${mx + (-dy / len) * len * 0.42 * sign},${my + (dx / len) * len * 0.42 * sign} ${tx},${ty}`;
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

  // Destination (hand tab centre, or fallback to card centre)
  const finalX = destPos?.x ?? midX;
  const finalY = destPos?.y ?? midY;
  // Final card top-left in the motion-div's coordinate space
  const dX = finalX - w / 2;
  const dY = finalY - h / 2;

  // Shake amplitude
  const SK = Math.round(w * 0.07);

  // All card keyframes happen over ARC_END (the card is the thing that flies)
  const T  = ARC_END;
  const t1 = LIFT_END    / T;   // 0.157 — arrives at centre
  const t2 = STAMP_HIT   / T;   // 0.522 — impact: shake +
  const t3 = (STAMP_HIT + 0.040) / T;  // shake -
  const t4 = (STAMP_HIT + 0.080) / T;  // shake +/2
  const t5 = (STAMP_HIT + 0.120) / T;  // shake -/3
  const t6 = STAMP_HOLD  / T;   // 0.696 — settled
  // t7 = 1.0 — at destination

  const cardTimes = [0, t1, t2, t3, t4, t5, t6, 1.0];

  // FORGED stamp: appears at STAMP_HIT, stays until card vanishes
  const stampTimes = [0, t2, t3, 1.0];

  // Measure affinity-well positions on first render
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

  const HAMMER_SZ  = Math.max(76, Math.round(vmin(0.13)));
  const STAMP_FONT = Math.max(52, Math.round(w * 0.50));

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
        transition={{
          duration: ARC_END,
          times: [0, LIFT_END / ARC_END, STAMP_HOLD / ARC_END, 1],
        }}
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

        {/* Warm gold aura — builds on lift, fades at stamp */}
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

        {/* FORGED stamp — stamps down at impact, rides card to destination */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center rounded-[6px] overflow-hidden"
          animate={{ opacity: [0, 0, 1, 1], scale: [1, 1, 1, 1] }}
          transition={{ duration: ARC_END, times: stampTimes }}
        >
          {/* Dark vignette underneath so text pops on any card art */}
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.45)' }} />
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
            initial={{ scale: 3.8, opacity: 0 }}
            animate={{ scale: [3.8, 3.8, 1, 1], opacity: [0, 0, 1, 1] }}
            transition={{ duration: ARC_END, times: stampTimes }}
          >
            FORGED
          </motion.span>
        </motion.div>
      </motion.div>

      {/* ══ PHASE 2: Affinity streams ════════════════════════════════════════ */}
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

      {/* ══ PHASE 3: Hammer descends ════════════════════════════════════════ */}
      <motion.div
        className="pointer-events-none fixed"
        style={{ left: midX, top: cy + h * 0.1, translateX: '-50%', translateY: '-100%' }}
        animate={{
          y:       [-HAMMER_SZ * 2.0, -HAMMER_SZ * 2.0, HAMMER_SZ * 0.15, HAMMER_SZ * 0.15],
          opacity: [0,                 1,                 1,                 0                ],
          scale:   [1.5,               1.5,               1.0,               1.0              ],
        }}
        transition={{
          duration: STAMP_HOLD,
          times:    [0, (STREAMS_END / STAMP_HOLD), (STAMP_HIT / STAMP_HOLD), 1.0],
          ease:     ['linear', 'linear', [0.1, 0, 0.4, 1]],
        }}
      >
        <svg viewBox="0 0 64 64" width={HAMMER_SZ} height={HAMMER_SZ}>
          <defs>
            <filter id="hglow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="5" result="b" />
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

      {/* Impact flash at stamp moment */}
      <motion.div
        className="pointer-events-none fixed rounded-full"
        style={{
          left: midX, top: midY,
          translateX: '-50%', translateY: '-50%',
          background: 'radial-gradient(circle, rgba(255,210,80,1) 0%, rgba(255,130,0,0.6) 38%, transparent 68%)',
        }}
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{ width: [0, 0, vmin(0.50), 0], height: [0, 0, vmin(0.50), 0], opacity: [0, 0, 1, 0] }}
        transition={{ duration: STAMP_HOLD, times: [0, STAMP_HIT / STAMP_HOLD - 0.01, STAMP_HIT / STAMP_HOLD + 0.04, 1.0] }}
      />

      {/* Impact sparks */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
        const rad  = (deg * Math.PI) / 180;
        const dist = vmin(0.22);
        const sz   = Math.max(8, vmin(0.018));
        return (
          <motion.div
            key={deg}
            className="pointer-events-none fixed rounded-full"
            style={{
              left: midX - sz / 2, top: midY - sz / 2,
              width: sz, height: sz,
              background: deg % 90 === 0 ? '#FFE860' : '#FF8820',
              boxShadow: `0 0 ${sz * 0.8}px ${sz * 0.35}px ${deg % 90 === 0 ? '#FFD02088' : '#FF601088'}`,
            }}
            initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            animate={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, scale: [1, 1, 0.1], opacity: [1, 0.9, 0] }}
            transition={{ delay: STAMP_HIT, duration: 0.30, ease: 'easeOut', times: [0, 0.28, 1] }}
          />
        );
      })}

      {/* Pulse ring at destination on arrival */}
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
