/**
 * ForgeAnimation — stamp-and-fly sequence.
 *
 * Step 1  (0–180ms)   : Card lifts to viewport centre.
 * Step 2  (180–440ms) : Affinity streams flow from wells into card.
 * Step 3  (440–800ms) : Hammer descends and stamps FORGED; card shakes.
 * Step 4  (800–1150ms): Stamped card + stamp SVG arc to destination.
 *
 * Total: ~1.15 s
 *
 * The FORGED stamp is a SEPARATE fixed element (not a card child) so it is
 * never clipped by the card's own overflow-hidden. It animates in sync with
 * the card using the same x/y/scale keyframes.
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

// ── Stamp SVG ─────────────────────────────────────────────────────────────────
// All geometry is in a fixed 220×104 viewBox.
// Rendered at stampW×stampH with preserveAspectRatio="xMidYMid meet".
const VBOX_W = 220;
const VBOX_H = 104;

function StampSVG({ width, height }: { width: number; height: number }) {
  const cx = VBOX_W / 2;   // 110
  const hammerY = 34;       // vertical centre of crossed hammers
  const textY   = 86;       // baseline of FORGED text

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${VBOX_W} ${VBOX_H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ overflow: 'visible' }}
    >
      <defs>
        {/* Warm amber glow applied to most elements */}
        <filter id="stGlow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        {/* Stronger glow for text */}
        <filter id="stTextGlow" x="-20%" y="-40%" width="140%" height="180%">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* ── Dark fill so stamp is readable over any card art ── */}
      <rect x="5" y="5" width={VBOX_W - 10} height={VBOX_H - 10} rx="5" fill="rgba(0,0,0,0.60)" />

      {/* ── Outer border (thick amber) ── */}
      <rect
        x="5" y="5" width={VBOX_W - 10} height={VBOX_H - 10} rx="5"
        fill="none" stroke="#D4880A" strokeWidth="4"
        filter="url(#stGlow)"
      />
      {/* Inner border (thin accent line) */}
      <rect
        x="10" y="10" width={VBOX_W - 20} height={VBOX_H - 20} rx="3"
        fill="none" stroke="#D4880A" strokeWidth="1" opacity="0.45"
      />

      {/* ── Horizontal separator between icon and text ── */}
      <line x1="22" y1="52" x2={VBOX_W - 22} y2="52"
            stroke="#D4880A" strokeWidth="1.4" opacity="0.55" />

      {/* ── Crossed hammers ── */}
      {/* Each hammer: head rectangle + handle rectangle, rotated ±45° around (cx, hammerY) */}
      <g filter="url(#stGlow)">
        {/* Hammer 1 — rotated -45° */}
        <g transform={`translate(${cx},${hammerY}) rotate(-45)`}>
          {/* Head */}
          <rect x="-13" y="-26" width="26" height="14" rx="3" fill="#D4880A" />
          {/* Head highlight */}
          <rect x="-10" y="-23" width="10" height="6" rx="1.5" fill="#FFD080" opacity="0.4" />
          {/* Handle */}
          <rect x="-4"  y="-12" width="8"  height="28" rx="2.5" fill="#B86808" />
          {/* Handle highlight */}
          <rect x="-2"  y="-10" width="2.5" height="16" rx="1" fill="#FFD080" opacity="0.30" />
        </g>
        {/* Hammer 2 — rotated +45° */}
        <g transform={`translate(${cx},${hammerY}) rotate(45)`}>
          <rect x="-13" y="-26" width="26" height="14" rx="3" fill="#D4880A" />
          <rect x="-10" y="-23" width="10" height="6" rx="1.5" fill="#FFD080" opacity="0.4" />
          <rect x="-4"  y="-12" width="8"  height="28" rx="2.5" fill="#B86808" />
          <rect x="-2"  y="-10" width="2.5" height="16" rx="1" fill="#FFD080" opacity="0.30" />
        </g>
      </g>

      {/* ── FORGED text — Cinzel Decorative, amber, glowing ── */}
      <text
        x={cx}
        y={textY}
        fontFamily='"Cinzel Decorative", "Cinzel", Georgia, serif'
        fontWeight="900"
        fontSize="30"
        fill="#D4880A"
        textAnchor="middle"
        letterSpacing="4"
        filter="url(#stTextGlow)"
      >
        FORGED
      </text>
      {/* Subtle second pass for brightness */}
      <text
        x={cx}
        y={textY}
        fontFamily='"Cinzel Decorative", "Cinzel", Georgia, serif'
        fontWeight="900"
        fontSize="30"
        fill="#FFB030"
        fillOpacity="0.35"
        textAnchor="middle"
        letterSpacing="4"
      >
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
  const midX = cx + w / 2;   // card visual centre X
  const midY = cy + h / 2;   // card visual centre Y

  // Destination
  const finalX = destPos?.x ?? midX;
  const finalY = destPos?.y ?? midY;
  const dX = finalX - w / 2;
  const dY = finalY - h / 2;

  // Stamp dimensions — must fit WITHIN the card's visual area.
  // Card is lifted to scale 1.28, so its visual width = w * 1.28.
  // Use 82% of that so the stamp sits clearly inside the card borders.
  const stampW = Math.max(80, Math.round(w * 1.28 * 0.82));
  const stampH = Math.round(stampW * (VBOX_H / VBOX_W));  // maintain aspect
  const stampLeft = midX - stampW / 2;
  const stampTop  = midY - stampH / 2;

  // During the arc, the stamp's centre must follow finalX,finalY
  const stampDX = finalX - midX;
  const stampDY = finalY - midY;

  // Shake amplitude
  const SK = Math.round(w * 0.07);

  // Normalised time fractions
  const T  = ARC_END;
  const t1 = LIFT_END  / T;
  const t2 = STAMP_HIT / T;
  const t3 = (STAMP_HIT + 0.040) / T;
  const t4 = (STAMP_HIT + 0.080) / T;
  const t5 = (STAMP_HIT + 0.120) / T;
  const t6 = STAMP_HOLD / T;

  const cardTimes  = [0, t1, t2, t3, t4, t5, t6, 1.0];
  const stampTimes = [0, t2, t3, t6, 1.0];

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

  const HAMMER_SZ = Math.max(76, Math.round(vmin(0.13)));

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

      {/* ══ CARD — lifts, shakes, then flies to destination ════════════════ */}
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

        {/* Warm gold aura around card */}
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

        {/* Dark vignette on the card at stamp moment (behind stamp SVG) */}
        <motion.div
          className="absolute inset-0 rounded-[6px]"
          animate={{ opacity: [0, 0, 0.50, 0.50, 0] }}
          transition={{ duration: ARC_END, times: [0, t2, t3, t6, 1.0] }}
          style={{ background: 'rgba(0,0,0,1)' }}
        />
      </motion.div>

      {/* ══ FORGED STAMP SVG — separate fixed element, never clipped ══════════
          Positioned at the card's visual centre, follows the same arc.       */}
      <motion.div
        style={{
          position: 'fixed',
          left: stampLeft,
          top: stampTop,
          width: stampW,
          height: stampH,
          transformOrigin: 'center center',
        }}
        animate={{
          opacity: [0,    0,    1,    1,    0   ],
          scaleY:  [1,    1,  0.88,   1,  0.06 ],
          scaleX:  [1,    1,    1,    1,  0.06 ],
          x:       [0,    0,    0,    0,  stampDX],
          y:       [-12, -12,   0,    0,  stampDY],
        }}
        transition={{ duration: ARC_END, times: stampTimes }}
      >
        <StampSVG width={stampW} height={stampH} />
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

      {/* ══ Hammer descends ═════════════════════════════════════════════════ */}
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
          times:    [0, STREAMS_END / STAMP_HOLD, STAMP_HIT / STAMP_HOLD, 1.0],
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

      {/* Impact flash */}
      <motion.div
        className="pointer-events-none fixed rounded-full"
        style={{
          left: midX, top: midY, translateX: '-50%', translateY: '-50%',
          background: 'radial-gradient(circle, rgba(255,210,80,1) 0%, rgba(255,130,0,0.6) 38%, transparent 68%)',
        }}
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{ width: [0, 0, vmin(0.50), 0], height: [0, 0, vmin(0.50), 0], opacity: [0, 0, 1, 0] }}
        transition={{
          duration: STAMP_HOLD,
          times: [0, STAMP_HIT / STAMP_HOLD - 0.01, STAMP_HIT / STAMP_HOLD + 0.04, 1.0],
        }}
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
