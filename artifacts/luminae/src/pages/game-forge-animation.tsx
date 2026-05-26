/**
 * ForgeAnimation — 6-step forge card animation sequence.
 *
 * Step 1  (0–150ms)  : Card lifts from market slot → screen centre, solar aura builds.
 * Step 2  (150–380ms): Coloured energy streams flow from Affinity Wells into the card.
 * Step 3  (380–580ms): Peak flash — gold-white light erupts.
 * Step 4  (580–850ms): Hammer sigil descends; "FORGED" stamps onto the card; card shakes.
 * Step 5  (850–1050ms): Card compresses → golden medallion seal forms.
 * Step 6  (1050–1250ms): Seal arcs to the owner (Hand tab); destination absorbs it.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { ArtifactCard } from '@workspace/api-client-react';
import { ArtifactCardView } from './game-card';
import { GEM_META, type GemKey } from '@/lib/gemMeta';
import { Sparkles } from 'lucide-react';

// ── Timing constants (seconds) ──────────────────────────────────────────────
const P1_END   = 0.15;
const P2_END   = 0.38;
const P3_END   = 0.58;
const P4_STAMP = 0.70;
const P4_END   = 0.85;
const P5_END   = 1.05;
const P6_END   = 1.25;

interface StreamData {
  color: GemKey;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

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

export function ForgeAnimation({
  animKey,
  card,
  tier,
  startRect,
  destPos,
  spentColors,
  lumens,
}: ForgeAnimationProps) {
  const w  = startRect.w;
  const h  = startRect.h;
  const sx = startRect.x;
  const sy = startRect.y;

  // Centre of the screen where the card lands.
  const cx = window.innerWidth  / 2 - w / 2;
  const cy = window.innerHeight / 2 - h / 2 - 20;

  // Centre pixel of the card when held at screen centre.
  const cardMidX = cx + w / 2;
  const cardMidY = cy + h / 2;

  // Seal size = ~55 % of card width, clamped.
  const SEAL = Math.round(Math.min(w * 0.55, 72));

  // Final destination for the seal (centre of hand-tab or screen centre).
  const finalX = destPos?.x ?? cardMidX;
  const finalY = destPos?.y ?? cardMidY;

  // ── Affinity stream positions (measured after mount) ──────────────────────
  const [streams, setStreams] = useState<StreamData[]>([]);
  useEffect(() => {
    const measured: StreamData[] = [];
    const seen = new Set<GemKey>();
    for (const color of spentColors) {
      if (seen.has(color) || color === 'flux') continue;
      seen.add(color);
      const el = document.querySelector(`[data-affinity-well="${color}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        measured.push({
          color,
          fromX: r.left + r.width  / 2,
          fromY: r.top  + r.height / 2,
          toX: cardMidX,
          toY: cardMidY,
        });
      }
    }
    setStreams(measured);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Card keyframes (phases 1–5, duration = P5_END) ───────────────────────
  // We bake the shake into x during phase 4 so it stays inside a single motion element.
  const CARD_DUR = P5_END; // 1.05s
  const t = (s: number) => s / CARD_DUR;

  const cardX = [sx,  cx,  cx,  cx+7, cx-7, cx+5, cx-3, cx];
  const cardY = [sy,  cy,  cy,  cy,   cy,   cy,   cy,   cy];
  const cardS = [1, 1.15, 1.15, 1.15, 1.15, 1.15, 1.15, 0];
  const cardO = [1,    1,    1,    1,    1,    1,    1,   0];
  const cardT = [0, t(P1_END), t(P1_END + 0.01), t(P4_END - 0.27), t(P4_END - 0.22), t(P4_END - 0.17), t(P4_END - 0.12), 1.0];

  // ── Seal arc arc ──────────────────────────────────────────────────────────
  const SEAL_DUR = P6_END - P5_END; // 0.20s
  const arcMidX  = (cardMidX + finalX) / 2 - SEAL / 2;
  const arcMidY  = Math.min(cardMidY, finalY) - 80;

  return (
    <motion.div
      key={animKey}
      className="pointer-events-none fixed inset-0 z-50"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, delay: P6_END }}
    >
      {/* Dark backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/55"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 1, 0] }}
        transition={{ duration: P6_END, times: [0, 0.1, 0.85, 1] }}
      />

      {/* ── Phase 1–4+5: card travelling + holding + stamping + compressing ── */}
      <motion.div
        style={{ position: 'fixed', left: 0, top: 0, width: w, height: h }}
        animate={{ x: cardX, y: cardY, scale: cardS, opacity: cardO }}
        transition={{ duration: CARD_DUR, times: cardT, ease: 'easeOut' }}
      >
        <ArtifactCardView card={card} tier={tier} />

        {/* Golden solar aura — grows through phase 3, fades in phase 4 */}
        <motion.div
          className="absolute inset-0 rounded-[6px]"
          animate={{
            boxShadow: [
              '0 0  0px  0px #FBB83800',
              '0 0 24px  8px #FBB83860',
              '0 0 44px 16px #FFF4C2A0',
              '0 0 60px 22px #FFF4C2FF',
              '0 0 30px 10px #FBB83860',
              '0 0  0px  0px #FBB83800',
            ],
          }}
          transition={{
            duration: CARD_DUR,
            times: [0, t(P1_END), t(P2_END), t(P3_END), t(P4_END), 1],
          }}
        />

        {/* FORGED stamp — scales in from large → 1 at P4_STAMP */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center rounded-[6px] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0] }}
          transition={{ duration: CARD_DUR, times: [0, t(P4_STAMP - 0.01), t(P4_STAMP + 0.04), t(P4_END), 1] }}
        >
          <motion.div
            className="absolute inset-0"
            style={{ background: 'rgba(0,0,0,0.35)' }}
          />
          <motion.span
            className="relative font-black tracking-widest select-none"
            style={{
              fontSize: Math.round(w * 0.24),
              color: '#FF9030',
              textShadow: '0 0 18px #FF7000CC, 0 2px 0 #7A3000',
              transform: 'rotate(-8deg)',
              fontFamily: 'Georgia, "Times New Roman", serif',
              WebkitTextStroke: '1px #FF6000',
              letterSpacing: '0.04em',
            }}
            initial={{ scale: 3.5, opacity: 0 }}
            animate={{ scale: [3.5, 3.5, 1, 1], opacity: [0, 0, 1, 0] }}
            transition={{ duration: CARD_DUR, times: [0, t(P4_STAMP - 0.02), t(P4_STAMP + 0.06), 1] }}
          >
            FORGED
          </motion.span>
        </motion.div>
      </motion.div>

      {/* ── Phase 3: White-gold peak flash ring ───────────────────────────── */}
      <motion.div
        className="pointer-events-none fixed rounded-full"
        style={{
          left: cardMidX,
          top:  cardMidY,
          translateX: '-50%',
          translateY: '-50%',
          background: 'radial-gradient(circle, #FFFFFFD0 0%, #FFF4C280 40%, transparent 70%)',
        }}
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{
          width:   [0, 0, w * 2.2, w * 3.0, 0],
          height:  [0, 0, w * 2.2, w * 3.0, 0],
          opacity: [0, 0, 0.85, 0.3, 0],
        }}
        transition={{ duration: P3_END + 0.05, times: [0, 0.62, 0.80, 0.92, 1] }}
      />

      {/* ── Phase 2: Affinity energy streams (SVG) ───────────────────────── */}
      {streams.length > 0 && (
        <svg
          className="pointer-events-none fixed inset-0"
          style={{ width: '100vw', height: '100vh', overflow: 'visible' }}
        >
          <defs>
            {streams.map(({ color }) => {
              const meta = GEM_META[color];
              return (
                <filter key={`glow-${color}`} id={`stream-glow-${color}`} x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                  <feColorMatrix type="matrix" values={`1 0 0 0 ${parseInt(meta.glowHex.slice(1,3),16)/255} 0 1 0 0 ${parseInt(meta.glowHex.slice(3,5),16)/255} 0 0 1 0 ${parseInt(meta.glowHex.slice(5,7),16)/255} 0 0 0 1 0`} />
                </filter>
              );
            })}
          </defs>
          {streams.map(({ color, fromX, fromY, toX, toY }) => {
            const meta = GEM_META[color];
            const dur = P2_END - P2_END * 0 + 0.15; // stream draw + brief hold + fade
            return (
              <g key={color}>
                {/* Core stream line */}
                <motion.path
                  d={`M ${fromX},${fromY} L ${toX},${toY}`}
                  stroke={meta.glowHex}
                  strokeWidth={3}
                  strokeLinecap="round"
                  fill="none"
                  filter={`url(#stream-glow-${color})`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1, 0], opacity: [0, 0.95, 0.9, 0] }}
                  transition={{
                    delay: P2_END - (P2_END - P1_END),
                    duration: dur,
                    times: [0, 0.45, 0.72, 1],
                  }}
                />
                {/* Bright highlight streak alongside */}
                <motion.path
                  d={`M ${fromX},${fromY} L ${toX},${toY}`}
                  stroke="#FFFFFF"
                  strokeWidth={1.2}
                  strokeLinecap="round"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 0.6, 1, 0], opacity: [0, 0.7, 0.4, 0] }}
                  transition={{
                    delay: P2_END - (P2_END - P1_END) + 0.02,
                    duration: dur * 0.85,
                    times: [0, 0.3, 0.6, 1],
                  }}
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* ── Phase 4: Hammer sigil descending ─────────────────────────────── */}
      <motion.div
        className="pointer-events-none fixed flex items-center justify-center"
        style={{ left: cardMidX, top: cy - 10, translateX: '-50%', translateY: '-100%' }}
        initial={{ y: -50, opacity: 0, scale: 1.4 }}
        animate={{
          y:       [-50, -50, h * 0.28, h * 0.28],
          opacity: [0,    0,   1,        0       ],
          scale:   [1.4, 1.4, 1,        1       ],
        }}
        transition={{
          duration: P4_END,
          times: [0, P4_END * 0.68, P4_END * 0.88, 1],
          ease: [[0.3, 0, 0.6, 1], 'linear', 'linear'],
        }}
      >
        <svg viewBox="0 0 56 56" width={52} height={52}>
          <defs>
            <filter id="hammer-glow-filter">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <g filter="url(#hammer-glow-filter)">
            {/* Hammer head */}
            <rect x="10" y="6" width="36" height="20" rx="4" fill="#B87028" stroke="#FFD060" strokeWidth="1.5" />
            {/* Hammer head face shine */}
            <rect x="12" y="8"  width="13" height="7"  rx="2" fill="#FFE090" opacity="0.55" />
            {/* Hammer handle */}
            <rect x="24" y="24" width="8"  height="26" rx="3" fill="#7A4E2A" stroke="#B07840" strokeWidth="1" />
            {/* Handle highlight */}
            <rect x="25" y="26" width="3"  height="16" rx="1.5" fill="#C09060" opacity="0.4" />
          </g>
        </svg>
      </motion.div>

      {/* Impact spark burst at P4_STAMP */}
      <motion.div
        className="pointer-events-none fixed"
        style={{ left: cardMidX, top: cardMidY, translateX: '-50%', translateY: '-50%' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1, 0] }}
        transition={{ duration: P4_END, times: [0, P4_STAMP / P4_END - 0.02, P4_STAMP / P4_END + 0.04, 1] }}
      >
        {/* Radial sparks */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => (
          <motion.div
            key={deg}
            className="absolute rounded-full"
            style={{
              width: 3,
              height: 3,
              background: deg % 90 === 0 ? '#FFE070' : '#FF9030',
              left: '50%',
              top: '50%',
              transformOrigin: '50% 50%',
              rotate: `${deg}deg`,
            }}
            initial={{ x: 0, y: 0, opacity: 1 }}
            animate={{ x: Math.cos((deg * Math.PI) / 180) * 36, y: Math.sin((deg * Math.PI) / 180) * 36, opacity: 0 }}
            transition={{ delay: P4_STAMP, duration: 0.22, ease: 'easeOut' }}
          />
        ))}
      </motion.div>

      {/* ── Phase 5: Golden seal forms (replaces card) ─────────────────────── */}
      <AnimatePresence>
        <motion.div
          key="seal"
          className="pointer-events-none fixed flex items-center justify-center rounded-full"
          style={{
            left: cardMidX - SEAL / 2,
            top:  cardMidY - SEAL / 2,
            width:  SEAL,
            height: SEAL,
            background: 'radial-gradient(circle at 38% 32%, #FFE888 0%, #D4881A 55%, #7A4400 100%)',
            border: '2px solid #FFD060',
            boxShadow: '0 0 28px 8px #FFA83080, inset 0 0 12px #FFE07040',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 0, 1.1, 1, 1, 0.15], opacity: [0, 0, 1, 1, 1, 0] }}
          transition={{
            duration: P6_END - P4_END, // 0.40s, delay P4_END; t=0.5 = P5_END boundary
            delay: P4_END,
            times: [0, 0.38, 0.50, 0.62, 0.78, 1.0],
          }}
        >
          {/* Hammer on seal */}
          <svg viewBox="0 0 30 30" width={SEAL * 0.5} height={SEAL * 0.5}>
            <rect x="5"  y="3" width="20" height="11" rx="2.5" fill="#7A3800" stroke="#FFD060" strokeWidth="1.2" />
            <rect x="13" y="13" width="4" height="14"  rx="1.5"  fill="#5A2800" stroke="#B06030" strokeWidth="0.8" />
            <rect x="6"  y="4" width="8"  height="5"   rx="1.5" fill="#FFE090" opacity="0.45" />
          </svg>
        </motion.div>
      </AnimatePresence>

      {/* ── Phase 6: Seal arc flight ──────────────────────────────────────── */}
      <motion.div
        className="pointer-events-none fixed rounded-full"
        style={{
          left: cardMidX - SEAL / 2,
          top:  cardMidY - SEAL / 2,
          width:  SEAL,
          height: SEAL,
          background: 'radial-gradient(circle at 38% 32%, #FFE888 0%, #D4881A 55%, #7A4400 100%)',
          border: '2px solid #FFD060',
          boxShadow: '0 0 24px 6px #FFA83080',
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          x: [0, arcMidX - (cardMidX - SEAL / 2), finalX - SEAL / 2 - (cardMidX - SEAL / 2)],
          y: [0, arcMidY - (cardMidY - SEAL / 2), finalY - SEAL / 2 - (cardMidY - SEAL / 2)],
          scale: [1, 0.85, 0.25],
          opacity: [1, 1, 0],
        }}
        transition={{ delay: P5_END, duration: SEAL_DUR, times: [0, 0.5, 1], ease: 'easeIn' }}
      />

      {/* ── Absorption pulse rings at destPos (fires ~at P6_END) ─────────── */}
      {destPos && (
        <motion.div
          className="pointer-events-none fixed"
          style={{ left: destPos.x, top: destPos.y, translateX: '-50%', translateY: '-50%' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 0] }}
          transition={{ duration: P6_END + 0.1, times: [0, 0.88, 0.94, 1] }}
        >
          <motion.div
            className="absolute rounded-full border-2 border-amber-300"
            style={{ left: '50%', top: '50%', translateX: '-50%', translateY: '-50%' }}
            initial={{ width: 10, height: 10, opacity: 1 }}
            animate={{ width: 80, height: 80, opacity: 0 }}
            transition={{ delay: P6_END - 0.15, duration: 0.55, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute rounded-full border border-amber-400/70"
            style={{ left: '50%', top: '50%', translateX: '-50%', translateY: '-50%' }}
            initial={{ width: 6, height: 6, opacity: 0.9 }}
            animate={{ width: 50, height: 50, opacity: 0 }}
            transition={{ delay: P6_END - 0.10, duration: 0.45, ease: 'easeOut' }}
          />
          <motion.div
            className="absolute rounded-full bg-amber-200"
            style={{ left: '50%', top: '50%', translateX: '-50%', translateY: '-50%' }}
            initial={{ width: 8, height: 8, opacity: 0.9 }}
            animate={{ width: 0, height: 0, opacity: 0 }}
            transition={{ delay: P6_END - 0.15, duration: 0.28, ease: 'easeIn' }}
          />
        </motion.div>
      )}

      {/* ── Eminence floater (if card awards lumens) ──────────────────────── */}
      {lumens > 0 && (
        <motion.div
          className="pointer-events-none fixed flex items-center gap-1.5 font-bold"
          style={{
            left: cardMidX + w * 0.6,
            top:  cardMidY - h * 0.2,
            color: '#FFF0A0',
            fontSize: 16,
            textShadow: '0 0 12px #FFD04099',
          }}
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: [0, 0, 1, 1, 0], y: [0, 0, 0, -24, -36] }}
          transition={{ duration: P6_END, times: [0, 0.42, 0.54, 0.85, 1] }}
        >
          <Sparkles className="h-4 w-4" />
          +{lumens}
        </motion.div>
      )}
    </motion.div>
  );
}
