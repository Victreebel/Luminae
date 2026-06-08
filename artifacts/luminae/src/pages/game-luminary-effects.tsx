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

// ── BurnFlash ─────────────────────────────────────────────────────────────────
// Reusable 5-phase Burn keyword animation.  Plays over the affected market slot
// and self-destructs after completion.  Renders as a document.body portal to
// escape overflow containers.
//
// Phase 1 (  0–150 ms): Target claim — ember outline ring + inset glow.
// Phase 2 (150–420 ms): Heat fracture — crack lines radiate from card centre.
// Phase 3 (400–750 ms): Burn release — ash fragments scatter + central flare.
// Phase 4 (700–850 ms): Burn pile confirmation — handled by state update (🔥 chip).
// Phase 5 (800–1180ms): Scorched residue — char rectangle fades out.
//
// Callable as { type: 'keywordEvent', keyword: 'burn', targetIds: [...] } inside
// any AnimationProcedure (see lib/animationProcedure.ts).

// Ash fragment vectors — precomputed, stable across renders.
const ASH_FRAGMENTS = [
  { dx: -58, dy: -72, delay: 0.39, size: 5 },
  { dx:  62, dy: -68, delay: 0.41, size: 6 },
  { dx: -78, dy: -18, delay: 0.43, size: 4 },
  { dx:  74, dy:  -8, delay: 0.37, size: 5 },
  { dx: -42, dy:  62, delay: 0.45, size: 4 },
  { dx:  48, dy:  68, delay: 0.42, size: 6 },
  { dx: -22, dy: -88, delay: 0.40, size: 3 },
  { dx:  28, dy: -82, delay: 0.44, size: 4 },
] as const;

// Crack line descriptors — angle in degrees, half-length as a fraction of the
// shorter slot dimension.
const CRACK_LINES = [
  { angle: -38, frac: 0.46 },
  { angle:  22, frac: 0.39 },
  { angle: 148, frac: 0.43 },
  { angle: 202, frac: 0.36 },
  { angle:  82, frac: 0.31 },
] as const;

export function BurnFlash({
  slotRect,
  onDone,
  sourceLuminaryId: _sourceLuminaryId,
}: {
  slotRect: DOMRect;
  onDone: () => void;
  /** Which Luminary triggered this burn — reserved for future per-Luminary theming. */
  sourceLuminaryId?: string;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 1200);
    return () => clearTimeout(t);
  }, []);

  const cx = slotRect.left + slotRect.width  / 2;
  const cy = slotRect.top  + slotRect.height / 2;
  const shortSide = Math.min(slotRect.width, slotRect.height);

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9995 }}>

      {/* ── Phase 1: Target claim — ember outline ring ── */}
      <motion.div
        style={{
          position: 'absolute',
          left: slotRect.left - 3,
          top:  slotRect.top  - 3,
          width:  slotRect.width  + 6,
          height: slotRect.height + 6,
          borderRadius: 14,
          border: '2px solid #ff6820',
          boxShadow: '0 0 10px 3px #ff6820aa, inset 0 0 16px 2px #ff330044',
        }}
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: [0, 1, 0.85, 0], scale: [0.92, 1.0, 1.0, 1.02] }}
        transition={{ duration: 0.42, ease: 'easeOut', times: [0, 0.18, 0.6, 1] }}
      />

      {/* ── Phase 2: Heat fracture — crack lines radiating from centre ── */}
      {CRACK_LINES.map((crack, i) => {
        const halfLen = crack.frac * shortSide;
        return (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              left: cx - halfLen,
              top:  cy,
              width:  halfLen * 2,
              height: 1.5,
              background: 'linear-gradient(90deg, transparent 0%, #ff8833cc 40%, #ffcc7788 70%, transparent 100%)',
              transformOrigin: '50% 50%',
              transform: `rotate(${crack.angle}deg)`,
            }}
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: [0, 1, 1, 0.3], opacity: [0, 0.9, 0.7, 0] }}
            transition={{ duration: 0.55, delay: 0.13 + i * 0.028, ease: 'easeOut', times: [0, 0.25, 0.6, 1] }}
          />
        );
      })}

      {/* ── Phase 3a: Central ember flare ── */}
      <motion.div
        style={{
          position: 'absolute',
          left: cx - slotRect.width  * 0.6,
          top:  cy - slotRect.height * 0.6,
          width:  slotRect.width  * 1.2,
          height: slotRect.height * 1.2,
          borderRadius: 12,
          background: 'radial-gradient(ellipse at center, #ff9a2aee 0%, #ff5500cc 28%, #cc220088 55%, transparent 78%)',
          filter: 'blur(2.5px)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.1, 1.35], opacity: [0, 0.92, 0] }}
        transition={{ duration: 0.62, delay: 0.24, ease: 'easeOut', times: [0, 0.2, 1] }}
      />

      {/* ── Phase 3b: Ash fragments scatter outward ── */}
      {ASH_FRAGMENTS.map((f, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: cx - f.size / 2,
            top:  cy - f.size / 2,
            width:  f.size,
            height: f.size,
            borderRadius: i % 2 === 0 ? '50%' : 2,
            background: i % 3 === 0 ? '#ff8833' : i % 3 === 1 ? '#ffaa55' : '#8a7a6a',
          }}
          initial={{ x: 0, y: 0, opacity: 0.9, scale: 1 }}
          animate={{ x: f.dx, y: f.dy, opacity: 0, scale: 0.15 }}
          transition={{ duration: 0.44, delay: f.delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      ))}

      {/* ── Phase 3c: Rising smoke wisps ── */}
      {([0, 1, 2, 3] as const).map(i => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: slotRect.left + slotRect.width  * (0.18 + i * 0.21),
            top:  slotRect.top  + slotRect.height * 0.38,
            width:  4 + i,
            height: 4 + i,
            borderRadius: '50%',
            background: i % 2 === 0 ? '#ffaa5555' : '#ff660044',
            filter: 'blur(2px)',
          }}
          initial={{ y: 0, opacity: 0.75, scale: 1 }}
          animate={{ y: -30 - i * 10, opacity: 0, scale: 0 }}
          transition={{ duration: 0.52, delay: 0.32 + i * 0.06, ease: 'easeOut' }}
        />
      ))}

      {/* ── Phase 5: Scorched residue — char overlay fades out after fragments clear ── */}
      <motion.div
        style={{
          position: 'absolute',
          left: slotRect.left,
          top:  slotRect.top,
          width:  slotRect.width,
          height: slotRect.height,
          borderRadius: 12,
          background: 'radial-gradient(ellipse at center, rgba(55,18,0,0.48) 0%, rgba(28,8,0,0.28) 55%, transparent 82%)',
          border: '1px solid rgba(110,40,0,0.32)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.88, 0.65, 0] }}
        transition={{ duration: 0.52, delay: 0.75, ease: 'easeOut', times: [0, 0.1, 0.45, 1] }}
      />
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

// ── BloomSeedParticle ─────────────────────────────────────────────────────────
// A small ash-seed that flies from a burn slot toward the Catalyst Bloom portal
// whenever a burn effect occurs while Bloom is claimed.
// Renders as a body portal.  Self-destructs after flight completes.

export function BloomSeedParticle({
  from,
  to,
  onDone,
}: {
  from: DOMRect;
  to: DOMRect;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 1100);
    return () => clearTimeout(t);
  }, []);

  const x0 = from.left + from.width  / 2;
  const y0 = from.top  + from.height / 2;
  const x1 = to.left  + to.width    / 2;
  const y1 = to.top   + to.height   / 2;

  // Arc midpoint — curve upward relative to direct line
  const mx = (x0 + x1) / 2;
  const my = Math.min(y0, y1) - 60;

  // Approximate the arc with 3 keyframe stops (0%, 50%, 100%)
  const kx = [x0, mx, x1];
  const ky = [y0, my, y1];

  return createPortal(
    <>
      {/* Trail dots */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          style={{
            position: 'fixed',
            left: kx[i] - 3,
            top:  ky[i] - 3,
            width: 6 - i,
            height: 6 - i,
            borderRadius: '50%',
            background: '#4ade80',
            filter: 'blur(1px)',
            pointerEvents: 'none',
            zIndex: 9993,
          }}
          initial={{ opacity: 0.6, scale: 1 }}
          animate={{ opacity: 0, scale: 0 }}
          transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
        />
      ))}
      {/* Main seed */}
      <motion.div
        style={{
          position: 'fixed',
          left: x0 - 5,
          top:  y0 - 5,
          width: 10,
          height: 10,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #bbf7d0 0%, #4ade80 60%, #16a34a 100%)',
          boxShadow: '0 0 8px 3px #4ade8088',
          pointerEvents: 'none',
          zIndex: 9994,
        }}
        animate={{
          left: [x0 - 5, mx - 5, x1 - 5],
          top:  [y0 - 5, my - 5, y1 - 5],
          scale: [1, 1.2, 0.4],
          opacity: [0.9, 0.9, 0],
        }}
        transition={{ duration: 0.95, ease: 'easeInOut', times: [0, 0.45, 1] }}
      />
    </>,
    document.body,
  );
}

// ── OrchardCopyPulse ─────────────────────────────────────────────────────────
// Mirrored-copy sigil that radiates outward from The Glass Orchard portal
// when the Perfect Replication trigger fires.
// Key-driven — increment key to re-trigger.

export function OrchardCopyPulse({
  originRect,
  pulseKey,
}: {
  originRect: DOMRect | null;
  pulseKey: number;
}) {
  if (!originRect || pulseKey === 0) return null;
  const cx = originRect.left + originRect.width  / 2;
  const cy = originRect.top  + originRect.height / 2;

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        key={pulseKey}
        style={{
          position: 'fixed',
          left: cx,
          top:  cy,
          translateX: '-50%',
          translateY: '-50%',
          pointerEvents: 'none',
          zIndex: 9997,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0] }}
        transition={{ duration: 1.4, times: [0, 0.15, 1] }}
      >
        {/* Two rings expanding */}
        {[0, 1].map(i => (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              top: '50%', left: '50%',
              translateX: '-50%',
              translateY: '-50%',
              borderRadius: '50%',
              border: '1.5px solid #86efac',
              boxShadow: '0 0 12px 4px #4ade8044',
            }}
            initial={{ width: 10, height: 10, opacity: 0.9 }}
            animate={{ width: 80 + i * 40, height: 80 + i * 40, opacity: 0 }}
            transition={{ duration: 1.1, delay: i * 0.2, ease: 'easeOut' }}
          />
        ))}
        {/* Copy sigil glyph */}
        <motion.div
          style={{
            position: 'absolute',
            top: '50%', left: '50%',
            translateX: '-50%',
            translateY: '-50%',
            fontFamily: 'Georgia, serif',
            fontWeight: 900,
            fontSize: 28,
            color: '#86efac',
            textShadow: '0 0 16px #4ade80cc',
            userSelect: 'none',
          }}
          initial={{ scale: 0.3, rotate: -15 }}
          animate={{ scale: [0.3, 1.2, 1], rotate: [-15, 5, 0], opacity: [0, 1, 0] }}
          transition={{ duration: 1.3, times: [0, 0.2, 1] }}
        >
          ⿰
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}

// ── SummonMarketOverlay ───────────────────────────────────────────────────────
// Per-Luminary full-viewport overlay that fires when that Luminary is summoned.
// Layered above the board but below any modal.
// Each lumId maps to a distinct visual treatment.

export function SummonMarketOverlay({
  lumId,
  onDone,
}: {
  lumId: string;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  const duration = lumId === 'lum_moth' ? 2400
    : lumId === 'lum_null' ? 3000
    : lumId === 'lum_compass' ? 2200
    : 2000;

  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), duration + 200);
    return () => clearTimeout(t);
  }, [duration]);

  if (lumId === 'lum_moth') return createPortal(<RedMothFlareFx />, document.body);
  if (lumId === 'lum_forge') return createPortal(<IronHarbingerFx />, document.body);
  if (lumId === 'lum_null') return createPortal(<NullDomainFx />, document.body);
  if (lumId === 'lum_ember') return createPortal(<EmberDecreeFx />, document.body);
  if (lumId === 'lum_compass') return createPortal(<ForgottenHourFx />, document.body);
  if (lumId === 'lum_verdant') return createPortal(<VerdantBloomFx />, document.body);
  if (lumId === 'lum_pale') return createPortal(<PaleMerchantFx />, document.body);
  return null;
}

// ─── Sub-effects (internal, not exported) ────────────────────────────────────

// Red Moth — two crimson wings sweeping inward from the sides
function RedMothFlareFx() {
  const wing = (side: 'left' | 'right') => {
    const offscreen = side === 'left' ? '-100%' : '100%';
    const retreat   = side === 'left' ?  '-40%' :  '40%';
    return (
      <motion.div
        style={{
          position: 'fixed',
          top: '30%',
          [side]: 0,
          width: '55vw',
          height: '40vh',
          pointerEvents: 'none',
          zIndex: 69,
          background: side === 'left'
            ? 'radial-gradient(ellipse at right center, #dc262688 0%, #991b1b55 40%, transparent 75%)'
            : 'radial-gradient(ellipse at left center, #dc262688 0%, #991b1b55 40%, transparent 75%)',
          filter: 'blur(6px)',
        }}
        initial={{ x: offscreen, opacity: 0 }}
        animate={{ x: [offscreen, '0%', retreat], opacity: [0, 0.85, 0] }}
        transition={{ duration: 2.0, times: [0, 0.3, 1], ease: 'easeInOut' }}
      />
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 69 }}>
      {wing('left')}
      {wing('right')}
      {/* Centre flash when wings meet */}
      <motion.div
        style={{
          position: 'fixed',
          top: '45%', left: '50%',
          translateX: '-50%', translateY: '-50%',
          width: '30vw', height: '20vh',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, #fca5a588 0%, transparent 70%)',
          filter: 'blur(8px)',
          pointerEvents: 'none',
          zIndex: 69,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.5, 0], opacity: [0, 0.7, 0] }}
        transition={{ duration: 0.8, delay: 0.55, ease: 'easeOut' }}
      />
    </div>
  );
}

// Iron Harbinger — amber impact shockwave
function IronHarbingerFx() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 69 }}>
      {/* Shockwave rings */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          style={{
            position: 'fixed',
            top: '40%', left: '50%',
            translateX: '-50%', translateY: '-50%',
            borderRadius: '50%',
            border: '2px solid #f97316',
            boxShadow: '0 0 20px 6px #f9731655',
            pointerEvents: 'none',
            zIndex: 69,
          }}
          initial={{ width: 20, height: 20, opacity: 0.9 }}
          animate={{ width: `${60 + i * 35}vw`, height: `${60 + i * 35}vw`, opacity: 0 }}
          transition={{ duration: 1.4, delay: i * 0.18, ease: 'easeOut' }}
        />
      ))}
      {/* Impact flash */}
      <motion.div
        style={{
          position: 'fixed',
          top: '35%', left: '50%',
          translateX: '-50%', translateY: '-50%',
          width: '40vw', height: '25vh',
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, #fde68acc 0%, #f97316aa 35%, transparent 70%)',
          filter: 'blur(10px)',
          pointerEvents: 'none',
          zIndex: 69,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.4, 0], opacity: [0, 0.9, 0] }}
        transition={{ duration: 1.0, ease: 'easeOut', times: [0, 0.18, 1] }}
      />
    </div>
  );
}

// Null Sovereign — black-blue-white domain curtain descending over Tier III
function NullDomainFx() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 69 }}>
      {/* Domain curtain */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.96) 0%, rgba(15,15,40,0.88) 55%, rgba(40,40,80,0.65) 80%, transparent 100%)',
          pointerEvents: 'none',
          zIndex: 69,
          transformOrigin: 'top center',
        }}
        initial={{ height: 0, opacity: 0.9 }}
        animate={{ height: ['0vh', '65vh', '65vh', '0vh'], opacity: [0.9, 0.88, 0.88, 0] }}
        transition={{ duration: 2.8, times: [0, 0.25, 0.75, 1], ease: 'easeInOut' }}
      />
      {/* Blue-white edge shimmer */}
      <motion.div
        style={{
          position: 'fixed',
          left: 0, right: 0,
          height: 2,
          background: 'linear-gradient(90deg, transparent 0%, #93c5fd 30%, #ffffff 50%, #93c5fd 70%, transparent 100%)',
          boxShadow: '0 0 16px 6px #93c5fd88',
          pointerEvents: 'none',
          zIndex: 70,
        }}
        initial={{ top: '0vh', opacity: 0 }}
        animate={{ top: ['0vh', '65vh', '65vh', '0vh'], opacity: [0, 0.9, 0.9, 0] }}
        transition={{ duration: 2.8, times: [0, 0.25, 0.75, 1], ease: 'easeInOut' }}
      />
    </div>
  );
}

// Ember Sovereign — decree seal expanding then dissolving
function EmberDecreeFx() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 69 }}>
      {/* Seal glow */}
      <motion.div
        style={{
          position: 'fixed',
          top: '42%', left: '50%',
          translateX: '-50%', translateY: '-50%',
          width: '45vw', height: '45vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #fde68aaa 0%, #f97316cc 30%, #dc2626aa 55%, transparent 75%)',
          filter: 'blur(8px)',
          pointerEvents: 'none',
          zIndex: 69,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1, 1.15, 0], opacity: [0, 0.85, 0.7, 0] }}
        transition={{ duration: 1.8, times: [0, 0.2, 0.55, 1], ease: 'easeOut' }}
      />
      {/* Outer decree ring */}
      <motion.div
        style={{
          position: 'fixed',
          top: '42%', left: '50%',
          translateX: '-50%', translateY: '-50%',
          borderRadius: '50%',
          border: '1.5px solid #fcd34d',
          boxShadow: '0 0 14px 4px #f9731688',
          pointerEvents: 'none',
          zIndex: 69,
        }}
        initial={{ width: 40, height: 40, opacity: 0.9, rotate: 0 }}
        animate={{ width: '40vw', height: '40vw', opacity: 0, rotate: 120 }}
        transition={{ duration: 1.6, ease: 'easeOut' }}
      />
    </div>
  );
}

// Forgotten Hour — digital scan-line glitch across the market
function ForgottenHourFx() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 69 }}>
      {/* Scan sweeps */}
      {[0, 1, 2, 3].map(i => (
        <motion.div
          key={i}
          style={{
            position: 'fixed',
            left: 0, right: 0,
            height: 2 + i,
            background: i % 2 === 0
              ? 'linear-gradient(90deg, transparent 0%, #818cf8cc 20%, #c4b5fdee 50%, #818cf8cc 80%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, #60a5facc 25%, #93c5fddd 50%, #60a5facc 75%, transparent 100%)',
            filter: 'blur(0.5px)',
            pointerEvents: 'none',
            zIndex: 69,
          }}
          initial={{ top: `${15 + i * 12}%`, opacity: 0, scaleX: 0 }}
          animate={{ top: `${15 + i * 12}%`, opacity: [0, 0.8, 0.8, 0], scaleX: [0, 1, 1, 0] }}
          transition={{
            duration: 1.8,
            delay: i * 0.09,
            times: [0, 0.18, 0.72, 1],
            ease: 'easeInOut',
          }}
        />
      ))}
      {/* RGB channel desync flash */}
      <motion.div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'repeating-linear-gradient(0deg, rgba(65,50,120,0.18) 0px, rgba(65,50,120,0.18) 1px, transparent 1px, transparent 3px)',
          pointerEvents: 'none',
          zIndex: 69,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.7, 0.7, 0] }}
        transition={{ duration: 2.0, times: [0, 0.12, 0.8, 1] }}
      />
    </div>
  );
}

// Verdant Oracle — subtle green early-bloom pulse
function VerdantBloomFx() {
  return createPortal(
    <motion.div
      style={{
        position: 'fixed',
        bottom: '20%', left: '10%',
        width: '35vw', height: '35vw',
        borderRadius: '50%',
        background: 'radial-gradient(circle, #4ade8066 0%, #16a34a44 40%, transparent 70%)',
        filter: 'blur(12px)',
        pointerEvents: 'none',
        zIndex: 69,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1.3, 1, 0], opacity: [0, 0.65, 0.5, 0] }}
      transition={{ duration: 1.8, times: [0, 0.2, 0.6, 1], ease: 'easeOut' }}
    />,
    document.body,
  );
}

// Pale Merchant — contract seal that opens/unfurls
function PaleMerchantFx() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 69 }}>
      {/* Contract seal glow */}
      <motion.div
        style={{
          position: 'fixed',
          top: '40%', left: '50%',
          translateX: '-50%', translateY: '-50%',
          width: '38vw', height: '38vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #f1f5f988 0%, #cbd5e1aa 35%, transparent 70%)',
          filter: 'blur(8px)',
          pointerEvents: 'none',
          zIndex: 69,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.1, 0.9, 0], opacity: [0, 0.8, 0.6, 0] }}
        transition={{ duration: 2.0, times: [0, 0.18, 0.6, 1], ease: 'easeInOut' }}
      />
      {/* Balance scales icon — two horizontal bars */}
      {[-1, 1].map(side => (
        <motion.div
          key={side}
          style={{
            position: 'fixed',
            top: '40%', left: '50%',
            translateX: `${side * 12}vw`,
            translateY: '-50%',
            width: '8vw', height: 2,
            background: '#e2e8f0cc',
            boxShadow: '0 0 6px 2px #cbd5e188',
            pointerEvents: 'none',
            zIndex: 69,
          }}
          initial={{ scaleX: 0, opacity: 0 }}
          animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 0.9, 0.7, 0] }}
          transition={{ duration: 1.8, times: [0, 0.2, 0.7, 1], ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}
