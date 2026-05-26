import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { ArtifactCardView } from './game-card';

// --- Compact market ghost: fire-and-forget portal that escapes all overflow containers ---
// Accepts the chip's pre-measured DOMRect so it doesn't need to touch the DOM itself.
// Self-destructs after the animation finishes via onDone — it is NOT tied to flippingCards,
// so the pre-cleanup that clears flippingCards on the next action cannot kill it early.
export function CompactCardGhost({
  cardViewProps,
  chipRect,
  onDone,
}: {
  cardViewProps: React.ComponentProps<typeof ArtifactCardView>;
  chipRect: DOMRect;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    // delay(0.5s) + duration(5s) + buffer(300ms) — fires once on mount; key ensures remount per ghost
    const t = setTimeout(() => onDoneRef.current(), 5800);
    return () => clearTimeout(t);
  }, []);

  return createPortal(
    <motion.div
      className="pointer-events-none rounded-xl overflow-hidden"
      style={{
        position: 'fixed',
        top: chipRect.top - 170,
        left: chipRect.left,
        width: 'var(--card-w)',
        height: 'var(--card-h)',
        transformOrigin: 'top left',
        zIndex: 9999,
      }}
      initial={{ scale: 1, y: 0, opacity: 1 }}
      animate={{ scale: 0.47, y: 170, opacity: 0 }}
      transition={{ duration: 5, delay: 0.5, ease: 'linear' }}
    >
      <ArtifactCardView {...cardViewProps} />
    </motion.div>,
    document.body,
  );
}

// --- Chip absorb ripple: portal burst that fires as the ghost card descends into the chip ---
// Instant bleach flash → pill bounce glow → 5 expanding rings → central nova → 10 sparks.
const ABSORB_PARTICLE_ANGLES = [0, 36, 72, 108, 144, 180, 216, 252, 288, 324];

export function ChipAbsorbRipple({
  chipRect, color, onDone,
}: {
  chipRect: DOMRect; color: string; onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    // Fires once on mount; key in parent guarantees remount per event.
    const t = setTimeout(() => onDoneRef.current(), 1800);
    return () => clearTimeout(t);
  }, []);

  const cw = chipRect.width;
  const ch = chipRect.height;
  const cx = chipRect.left + cw / 2;
  const cy = chipRect.top + ch / 2;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9997 }}>

      {/* ── Immediate bleach flash: bright radial burst centered on chip ── */}
      <motion.div
        style={{
          position: 'absolute',
          top: chipRect.top - ch * 0.6,
          left: chipRect.left - cw * 0.6,
          width: cw * 2.2,
          height: ch * 2.2,
          borderRadius: 14,
          background: `radial-gradient(ellipse at center, ${color}ff 0%, ${color}99 25%, ${color}44 55%, transparent 75%)`,
          filter: 'blur(3px)',
        }}
        initial={{ scale: 0.3, opacity: 0 }}
        animate={{ scale: [0.3, 1.1, 0.1], opacity: [0, 1, 0] }}
        transition={{ duration: 0.5, ease: 'easeOut', times: [0, 0.28, 1] }}
      />

      {/* ── Pill bounce overlay: glowing clone of the chip that slams and snaps ── */}
      <motion.div
        style={{
          position: 'absolute',
          top: chipRect.top,
          left: chipRect.left,
          width: cw,
          height: ch,
          borderRadius: 8,
          background: `radial-gradient(ellipse at center, ${color}77 0%, transparent 70%)`,
          boxShadow: `0 0 48px 20px ${color}, 0 0 90px 32px ${color}55, inset 0 0 24px 10px ${color}dd`,
        }}
        initial={{ scale: 0.75, opacity: 0 }}
        animate={{
          scale:   [0.75, 2.0, 0.82, 1.6, 0.94, 1.0],
          opacity: [0,    1.0, 0.92, 0.75, 0.35, 0  ],
        }}
        transition={{ duration: 1.25, ease: 'easeOut', times: [0, 0.14, 0.32, 0.52, 0.76, 1.0] }}
      />

      {/* ── Pill-shaped rings expanding from chip center ── */}
      <div style={{ position: 'absolute', top: cy, left: cx, width: 0, height: 0 }}>
        {[0, 90, 185, 290, 410].map((delayMs, i) => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              width: cw,
              height: ch,
              borderRadius: 9,
              border: `${4 - i * 0.55}px solid ${color}`,
              boxShadow: `0 0 18px 6px ${color}, 0 0 36px 10px ${color}66`,
              x: -(cw / 2),
              y: -(ch / 2),
            }}
            initial={{ scale: 0.25, opacity: 1 }}
            animate={{ scale: 5.5, opacity: 0 }}
            transition={{ duration: 1.05, delay: delayMs / 1000, ease: 'easeOut' }}
          />
        ))}

        {/* Central nova burst */}
        <motion.div
          style={{
            position: 'absolute',
            width: 44, height: 44,
            borderRadius: '50%',
            background: color,
            x: -22, y: -22,
            filter: 'blur(14px)',
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 12, opacity: 0 }}
          transition={{ duration: 0.65, ease: 'easeOut' }}
        />

        {/* Radial spark particles — evenly spaced full circle */}
        {ABSORB_PARTICLE_ANGLES.map((angleDeg, i) => {
          const rad = (angleDeg * Math.PI) / 180;
          const dist = 65 + (i % 3) * 22;
          const tx = Math.cos(rad) * dist;
          const ty = Math.sin(rad) * dist;
          const sz = i % 2 === 0 ? 7 : 4;
          return (
            <motion.div
              key={i}
              style={{
                position: 'absolute',
                width: sz, height: sz,
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 8px 4px ${color}`,
                x: -(sz / 2), y: -(sz / 2),
              }}
              initial={{ x: -(sz / 2), y: -(sz / 2), opacity: 1, scale: 1.3 }}
              animate={{ x: tx - sz / 2, y: ty - sz / 2, opacity: 0, scale: 0 }}
              transition={{ duration: 0.8, delay: 0.025 * i, ease: 'easeOut' }}
            />
          );
        })}
      </div>
    </div>,
    document.body,
  );
}
