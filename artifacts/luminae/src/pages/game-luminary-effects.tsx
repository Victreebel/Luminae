import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';

// ── CardMarkerBadge ──────────────────────────────────────────────────────────
// Small overlay badge rendered in the top-left corner of a market card slot.
// Appears with a pop animation when first added.
//
// Forgotten   — blue-black memory glitch (erased Eminence glow)
// Condemned   — red-black decree seal
// Nullified   — black-blue-white domain marker
// Avatar Seed — blue-green seed sigil

type MarkerType = 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed';

const MARKER_META: Record<
  MarkerType,
  { label: string; bg: string; border: string; text: string; icon: string }
> = {
  forgotten: {
    label: 'Forgotten',
    bg:     'rgba(10,6,30,0.93)',
    border: '#3b2b8c',
    text:   '#9988ee',
    icon:   '◎',
  },
  condemned: {
    label: 'Condemned',
    bg:     'rgba(36,4,4,0.95)',
    border: '#8b1c1c',
    text:   '#e05050',
    icon:   '⚑',
  },
  nullified: {
    label: 'Nullified',
    bg:     'rgba(4,8,22,0.95)',
    border: '#1c3b6e',
    text:   '#6080c0',
    icon:   '⊘',
  },
  avatar_seed: {
    label: 'Seeded',
    bg:     'rgba(4,18,12,0.95)',
    border: '#1a5c3a',
    text:   '#4cc88a',
    icon:   '⁕',
  },
};

export function CardMarkerBadge({
  type,
  isNew = false,
}: {
  type: MarkerType;
  isNew?: boolean;
}) {
  const meta = MARKER_META[type];
  return (
    <motion.div
      className="absolute top-1 left-1 z-30 pointer-events-none"
      initial={isNew ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      transition={
        isNew
          ? { type: 'spring', stiffness: 420, damping: 22, delay: 0.06 }
          : {}
      }
      title={meta.label}
    >
      <div
        className="flex items-center justify-center rounded-full text-[9px] font-bold leading-none"
        style={{
          width: 16,
          height: 16,
          background: meta.bg,
          border: `1px solid ${meta.border}`,
          color: meta.text,
          boxShadow: `0 0 6px ${meta.border}88`,
        }}
      >
        {meta.icon}
      </div>
    </motion.div>
  );
}

// ── ArmedSigil ───────────────────────────────────────────────────────────────
// Pulsing "armed" indicator overlaid on a Luminary portal.
// Shown when the Luminary has a delayed effect pending resolution.
// Mount/unmount via AnimatePresence — fades out when the effect fires.

export function ArmedSigil({
  color = '#d4af37',
  isVisible,
}: {
  color?: string;
  isVisible: boolean;
}) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="absolute pointer-events-none z-20"
          style={{ bottom: 6, right: 4 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Outer pulse ring */}
          <motion.div
            className="absolute rounded-full"
            style={{
              inset: -4,
              border: `1px solid ${color}`,
              opacity: 0.5,
            }}
            animate={{
              scale:   [1, 1.6, 1],
              opacity: [0.5, 0, 0.5],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          {/* Inner sigil dot */}
          <div
            className="relative flex items-center justify-center rounded-full text-[9px] font-black leading-none select-none"
            style={{
              width: 16,
              height: 16,
              background: `radial-gradient(circle, ${color}22 0%, ${color}08 100%)`,
              border: `1px solid ${color}bb`,
              color: color,
              boxShadow: `0 0 7px ${color}88, inset 0 0 4px ${color}33`,
            }}
          >
            ⧖
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── BurnFlash ────────────────────────────────────────────────────────────────
// Brief amber/fire flash on a market slot when a burn effect replaces a card.
// Renders as a document.body portal to escape overflow containers.
// Self-destructs after animation completes.

export function BurnFlash({
  slotRect,
  onDone,
}: {
  slotRect: DOMRect;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 900);
    return () => clearTimeout(t);
  }, []);

  const cx = slotRect.left + slotRect.width / 2;
  const cy = slotRect.top + slotRect.height / 2;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9995 }}>
      {/* Radial ember flare at slot centre */}
      <motion.div
        style={{
          position: 'absolute',
          left: cx - slotRect.width * 0.65,
          top: cy - slotRect.height * 0.65,
          width:  slotRect.width  * 1.3,
          height: slotRect.height * 1.3,
          borderRadius: 12,
          background:
            'radial-gradient(ellipse at center, #ff9a2aee 0%, #ff5500cc 30%, #cc220088 60%, transparent 80%)',
          filter: 'blur(2.5px)',
        }}
        initial={{ scale: 0.15, opacity: 0 }}
        animate={{ scale: [0.15, 1.05, 1.25], opacity: [0, 0.88, 0] }}
        transition={{ duration: 0.75, ease: 'easeOut', times: [0, 0.22, 1] }}
      />
      {/* Char ring */}
      <motion.div
        style={{
          position: 'absolute',
          left: slotRect.left - 4,
          top:  slotRect.top  - 4,
          width:  slotRect.width  + 8,
          height: slotRect.height + 8,
          borderRadius: 14,
          border: '1.5px solid #ff7a2acc',
          boxShadow: '0 0 12px 4px #ff7a2a55',
        }}
        initial={{ opacity: 0, scale: 0.88 }}
        animate={{ opacity: [0, 0.9, 0], scale: [0.88, 1.04, 1.0] }}
        transition={{ duration: 0.7, ease: 'easeOut', times: [0, 0.16, 1] }}
      />
      {/* Rising smoke wisps */}
      {([0, 1, 2, 3] as const).map(i => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: slotRect.left + slotRect.width * (0.18 + i * 0.22),
            top:  slotRect.top  + slotRect.height * 0.35,
            width:  4 + i,
            height: 4 + i,
            borderRadius: '50%',
            background: i % 2 === 0 ? '#ffaa5566' : '#ff660055',
            filter: 'blur(2px)',
          }}
          initial={{ y: 0, opacity: 0.8, scale: 1 }}
          animate={{ y: -28 - i * 9, opacity: 0, scale: 0 }}
          transition={{ duration: 0.55, delay: 0.08 + i * 0.06, ease: 'easeOut' }}
        />
      ))}
    </div>,
    document.body,
  );
}

// ── DelayedEffectFloat ────────────────────────────────────────────────────────
// Floating "+N◆" that rises from a Luminary portal when a delayed effect fires
// (Mandala, Bloom, Orchard, Seed).
// Renders as a document.body portal.  Self-destructs after animation completes.

export function DelayedEffectFloat({
  amount,
  color,
  originRect,
  onDone,
}: {
  amount: number;
  color: string;
  originRect: DOMRect;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 1700);
    return () => clearTimeout(t);
  }, []);

  const startX = originRect.left + originRect.width  / 2;
  const startY = originRect.top  + originRect.height / 2;

  return createPortal(
    <motion.div
      style={{
        position: 'fixed',
        left:        startX,
        top:         startY,
        translateX: '-50%',
        translateY: '-50%',
        pointerEvents: 'none',
        zIndex: 9998,
      }}
      initial={{ y: 0, opacity: 0, scale: 0.5 }}
      animate={{ y: -80, opacity: [0, 1, 1, 0], scale: [0.5, 1.15, 1.05, 0.8] }}
      transition={{ duration: 1.5, ease: 'easeOut', times: [0, 0.1, 0.65, 1] }}
    >
      <span
        style={{
          fontFamily: 'Georgia, serif',
          fontWeight: 900,
          fontSize: 22,
          lineHeight: 1,
          color: color,
          textShadow: `0 0 20px ${color}cc, 0 0 8px ${color}88`,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          whiteSpace: 'nowrap',
        }}
      >
        +{amount}◆
      </span>
    </motion.div>,
    document.body,
  );
}

// ── BoardDimOverlay ───────────────────────────────────────────────────────────
// Full-screen dark fade for Void Warden Oblivion.
// Key-driven so each new dim event re-mounts the animation.

export function BoardDimOverlay({ dimKey }: { dimKey: number }) {
  return (
    <AnimatePresence mode="wait">
      {dimKey > 0 && (
        <motion.div
          key={dimKey}
          className="pointer-events-none fixed inset-0"
          style={{
            zIndex: 68,
            background:
              'radial-gradient(ellipse at center, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.88) 55%, rgba(0,0,0,0.98) 100%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 1, 0] }}
          transition={{
            duration: 3.2,
            times: [0, 0.18, 0.72, 1],
            ease: 'easeInOut',
          }}
        />
      )}
    </AnimatePresence>
  );
}
