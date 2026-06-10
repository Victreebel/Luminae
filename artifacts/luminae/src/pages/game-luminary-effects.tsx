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
// Burned      — transient fire-orange burn label (~300 ms, fades as BurnFlash ramps up)

type MarkerType = 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed' | 'burned';

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
  burned: {
    label: 'Burned',
    bg:     'rgba(48,12,0,0.96)',
    border: '#cc4400',
    text:   '#ff7040',
    icon:   '✕',
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
  const animClass =
    type === 'condemned'  ? 'kw-condemned'  :
    type === 'forgotten'  ? 'kw-forgotten'  :
    type === 'avatar_seed'? 'kw-seeded'     : '';
  return (
    <motion.div
      className="absolute top-1 left-1 z-30 pointer-events-none"
      initial={isNew ? { scale: 0, opacity: 0 } : false}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.5, opacity: 0, transition: { duration: 0.28, ease: 'easeOut' } }}
      transition={
        isNew
          ? { type: 'spring', stiffness: 420, damping: 22, delay: 0.06 }
          : {}
      }
      title={meta.label}
    >
      <div
        className={`flex items-center justify-center rounded-full text-[9px] font-bold leading-none${animClass ? ` ${animClass}` : ''}`}
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

// ── CardKeywordOverlay ────────────────────────────────────────────────────────
// Thin card-level aura/haze overlay rendered inside the same relative container
// as the card.  Communicates the keyword state visually across the entire card
// face — not just the corner badge.
//
// Condemned  — ember-red pulsing vignette at card edges; implies burning imminence.
// Forgotten  — blue-black haze + CSS backdrop desaturation; Eminence muted visually.
// Nullified  — cold grey full-card desaturation overlay; void/silent, no animation.
// Seeded     — soft green edge shimmer; implies a future claim.

export function CardKeywordOverlay({
  type,
}: {
  type: 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed';
}) {
  if (type === 'condemned') {
    return (
      <div
        className="kw-overlay-condemned absolute inset-0 z-10 pointer-events-none rounded-xl overflow-hidden"
        style={{
          background:
            'linear-gradient(to bottom, rgba(120,18,0,0.28) 0%, transparent 32%, transparent 62%, rgba(140,22,0,0.36) 100%)',
          boxShadow: 'inset 0 0 0 1.5px rgba(180,38,0,0.55)',
        }}
      />
    );
  }
  if (type === 'forgotten') {
    // Edge-biased tint (darker top/bottom, clear centre) so card art + cost remain
    // readable while Eminence area is visibly muted.
    return (
      <div
        className="absolute inset-0 z-10 pointer-events-none rounded-xl overflow-hidden"
        style={{
          background: 'linear-gradient(to bottom, rgba(8,4,28,0.32) 0%, rgba(8,4,28,0.10) 28%, rgba(8,4,28,0.10) 70%, rgba(8,4,28,0.34) 100%)',
          backdropFilter: 'saturate(0.50) brightness(0.88)',
          WebkitBackdropFilter: 'saturate(0.50) brightness(0.88)',
        }}
      />
    );
  }
  if (type === 'nullified') {
    // Full desaturation — void/silent state.  brightness(0.82) keeps card readable.
    return (
      <div
        className="absolute inset-0 z-10 pointer-events-none rounded-xl overflow-hidden"
        style={{
          background: 'rgba(8,10,22,0.18)',
          backdropFilter: 'saturate(0) brightness(0.82) contrast(0.90)',
          WebkitBackdropFilter: 'saturate(0) brightness(0.82) contrast(0.90)',
        }}
      />
    );
  }
  if (type === 'avatar_seed') {
    return (
      <div
        className="kw-overlay-seeded absolute inset-0 z-10 pointer-events-none rounded-xl overflow-hidden"
        style={{
          background:
            'linear-gradient(to bottom, transparent 45%, rgba(26,92,58,0.28) 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(44,140,80,0.38)',
        }}
      />
    );
  }
  return null;
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

// ── BurnBadgeOverlay ──────────────────────────────────────────────────────────
// Short-lived "Burned" badge rendered as a document.body portal at the slot's
// top-left corner.  Appears immediately when a burn is detected, holds for
// ~200 ms, then fades out just as the BurnFlash ramps up.
//
// Portal-based (position: fixed) so it is visible even after the burned card
// has been replaced in the render tree.  Calls onDone when the animation ends.

export function BurnBadgeOverlay({
  slotRect,
  onDone,
}: {
  slotRect: DOMRect;
  onDone: () => void;
}) {
  const meta = MARKER_META['burned'];
  return createPortal(
    <motion.div
      style={{
        position: 'fixed',
        top: slotRect.top + 4,
        left: slotRect.left + 4,
        zIndex: 9994,
        pointerEvents: 'none',
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [0, 1, 1, 0.5], opacity: [0, 1, 1, 0] }}
      transition={{ duration: 0.32, times: [0, 0.18, 0.72, 1], ease: 'easeOut' }}
      onAnimationComplete={onDone}
      title={meta.label}
    >
      <motion.div
        className="flex items-center justify-center rounded-full text-[9px] font-bold leading-none"
        style={{
          width: 16,
          height: 16,
          background: meta.bg,
          border: `1px solid ${meta.border}`,
          color: meta.text,
        }}
        animate={{
          boxShadow: [
            '0 0 5px 1px #cc440066',
            '0 0 14px 5px #ff6820cc, 0 0 6px 2px #ff8833aa, inset 0 0 5px #ff440099',
            '0 0 7px 2px #dd550088',
            '0 0 16px 6px #ff7830ee, 0 0 8px 3px #ffaa44cc, inset 0 0 6px #ff5500bb',
            '0 0 5px 1px #cc440066',
          ],
        }}
        transition={{ duration: 0.3, times: [0, 0.22, 0.48, 0.74, 1], ease: 'easeInOut' }}
      >
        {meta.icon}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

// ── BurnFlash ─────────────────────────────────────────────────────────────────
// Reusable Burn keyword animation.  Plays over the affected market slot and
// self-destructs after completion.  Renders as a document.body portal to
// escape overflow containers.
//
// ── CANONICAL BURN ANIMATION RULES (do not regress) ──────────────────────────
//
// Visual principle: the burn MUST stay crisp and readable throughout.
//   • The card burns progressively from bottom to top — the unburned upper
//     portion remains fully readable until the flame line reaches it.
//   • No blur effects of any kind — no motion blur, no Gaussian blur (filter:blur()),
//     no smeared card image, no blurry dissolve, no hazy fade masking the card.
//   • Do not hide the card with blur, smoke layers, or overbright wash effects.
//
// Forbidden CSS/style properties inside BurnFlash (and any burn-adjacent layer):
//   filter: blur(...)   backdropFilter: blur(...)   WebkitFilter: blur(...)
//
// ── PHASE SEQUENCE ────────────────────────────────────────────────────────────
//
// Phase 1 (  0–150 ms): Target claim — crisp ember outline ring snaps onto card.
// Phase 2 (140–300 ms): Bottom ignition — sharp ember glow ignites at the
//                        bottom edge of the card.
// Phase 3 (200–700 ms): Upward burn — ash overlay grows bottom→top via scaleY
//                        (transformOrigin: bottom center); a sharp flame edge
//                        line travels upward in sync; cinder sparks spawn at
//                        the flame front and rise away.  The card remains fully
//                        readable above the flame line until consumed.
// Phase 4 (680–870 ms): Top-edge spark burst — crisp sparks radiate from the
//                        top of the card as the last visible portion burns.
// Phase 5 (750–1050ms): Ash arc fragments scatter from the consumed card top.
// Phase 6 (handled by state): Burn Pile count increments (🔥 chip).
// Phase 7 (870–1150ms): Scorch residue fades — brief dark char overlay on the
//                        empty slot, then the slot redraws normally.
//
// Callable as { type: 'keywordEvent', keyword: 'burn', targetIds: [...] } inside
// any AnimationProcedure (see lib/animationProcedure.ts).
//
// Multi-card burns: stagger individual BurnFlash calls 80–120 ms apart in the
// procedure; all cards still visibly register with the Burn Pile.

// Burn timing constants (seconds) — synced to Burn.mp3 (~5.6 s).
const BURN_START_S = 1.00;  // when the flame front begins rising
const BURN_DUR_S   = 4.00;  // upward travel duration (1000 → 5000 ms)

// Cinder sparks — spawn at the flame front as it passes their Y position.
// xFrac: 0=left edge, 1=right edge of slot.
// yFrac: 0=top, 1=bottom of slot.  delay = BURN_START_S + (1-yFrac)*BURN_DUR_S.
// dxPx: slight horizontal drift (px) for visual variety.
const CINDERS = [
  { xFrac: 0.12, yFrac: 0.90, dxPx:  -8, size: 3 },
  { xFrac: 0.48, yFrac: 0.80, dxPx:   5, size: 4 },
  { xFrac: 0.78, yFrac: 0.70, dxPx:  -4, size: 3 },
  { xFrac: 0.30, yFrac: 0.60, dxPx:   9, size: 4 },
  { xFrac: 0.68, yFrac: 0.50, dxPx:  -6, size: 3 },
  { xFrac: 0.20, yFrac: 0.38, dxPx:   7, size: 4 },
  { xFrac: 0.82, yFrac: 0.28, dxPx:  -5, size: 3 },
  { xFrac: 0.45, yFrac: 0.18, dxPx:   4, size: 4 },
  { xFrac: 0.15, yFrac: 0.08, dxPx:  -9, size: 3 },
  { xFrac: 0.60, yFrac: 0.02, dxPx:   6, size: 3 },
] as const;

// Top-edge sparks — fire when the flame reaches the top of the card (~5000 ms).
const TOP_SPARKS = [
  { dx: -55, dy: -42, delay: 4.98 },
  { dx:  52, dy: -48, delay: 4.99 },
  { dx: -28, dy: -62, delay: 5.00 },
  { dx:  30, dy: -58, delay: 5.01 },
  { dx:   2, dy: -68, delay: 5.00 },
  { dx: -68, dy: -22, delay: 5.02 },
  { dx:  66, dy: -18, delay: 5.02 },
] as const;

// Ash arc fragments — scatter from the top of the consumed card (~5050 ms).
const ASH_ARCS = [
  { dx: -58, dy: -72, delay: 5.05, size: 5 },
  { dx:  62, dy: -68, delay: 5.07, size: 6 },
  { dx: -78, dy: -18, delay: 5.09, size: 4 },
  { dx:  74, dy:  -8, delay: 5.06, size: 5 },
  { dx: -42, dy: -82, delay: 5.11, size: 4 },
  { dx:  48, dy: -88, delay: 5.08, size: 6 },
  { dx: -22, dy: -98, delay: 5.10, size: 3 },
  { dx:  28, dy: -92, delay: 5.06, size: 4 },
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
    const t = setTimeout(() => onDoneRef.current(), 5600);
    return () => clearTimeout(t);
  }, []);

  const cx   = slotRect.left + slotRect.width  / 2;
  const topY = slotRect.top;

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
        transition={{ duration: 0.80, ease: 'easeOut', times: [0, 0.18, 0.6, 1] }}
      />

      {/* ── Phase 2: Bottom ignition — sharp ember glow at the bottom edge ── */}
      <motion.div
        style={{
          position: 'absolute',
          left: slotRect.left + 4,
          top:  slotRect.bottom - 10,
          width:  slotRect.width - 8,
          height: 14,
          borderRadius: 4,
          background: 'linear-gradient(to top, #ff2200ee 0%, #ff8800cc 55%, #ffcc44aa 100%)',
          boxShadow: '0 0 14px 6px #ff550088',
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: [0, 1, 1, 0.5], opacity: [0, 1, 0.9, 0] }}
        transition={{ duration: 0.80, delay: 0.60, ease: 'easeOut', times: [0, 0.22, 0.72, 1] }}
      />

      {/* ── Phase 3: Ash overlay — grows from bottom to top via scaleY ──
           transformOrigin 'bottom center' keeps the bottom edge anchored at
           slotRect.bottom while the top edge rises toward slotRect.top.
           This covers the burned-away portion; the card below is still
           visible above the flame line until the overlay reaches it.        ── */}
      <motion.div
        style={{
          position: 'absolute',
          left: slotRect.left,
          top:  slotRect.top,
          width:  slotRect.width,
          height: slotRect.height,
          borderRadius: 12,
          background: 'linear-gradient(to top, #0a0400 0%, #180800 40%, #261000 75%, #341500 100%)',
          transformOrigin: 'bottom center',
        }}
        initial={{ scaleY: 0 }}
        animate={{ scaleY: [0, 1, 1], opacity: [1, 1, 0] }}
        transition={{ duration: BURN_DUR_S + 0.45, delay: BURN_START_S, ease: ['linear', 'easeOut'], times: [0, BURN_DUR_S / (BURN_DUR_S + 0.45), 1] }}
      />

      {/* ── Phase 3: Flame edge line — rides at the top of the rising ash ──
           Positioned at top:slotRect.top, y animates from +slotRect.height
           (bottom of card) to 0 (top of card), matching the ash overlay.    ── */}
      <motion.div
        style={{
          position: 'absolute',
          left: slotRect.left - 2,
          top:  slotRect.top - 5,
          width:  slotRect.width + 4,
          height: 12,
          borderRadius: 3,
          background: 'linear-gradient(to top, #ff2200 0%, #ff8800 50%, #ffee44 100%)',
          boxShadow: '0 0 10px 5px #ff660099, 0 0 3px 2px #ffbb44cc',
        }}
        initial={{ y: slotRect.height, opacity: 0 }}
        animate={{ y: [slotRect.height, slotRect.height, 0, -3], opacity: [0, 1, 1, 0] }}
        transition={{ duration: BURN_DUR_S + 0.04, delay: BURN_START_S - 0.02, ease: 'linear', times: [0, 0.04, 0.96, 1] }}
      />

      {/* ── Phase 3: Cinders — spawn at the flame front position and rise ── */}
      {CINDERS.map((c, i) => {
        const delay = BURN_START_S + (1 - c.yFrac) * BURN_DUR_S;
        return (
          <motion.div
            key={i}
            style={{
              position: 'absolute',
              left: slotRect.left + slotRect.width  * c.xFrac - c.size / 2,
              top:  slotRect.top  + slotRect.height * c.yFrac - c.size / 2,
              width:  c.size,
              height: c.size,
              borderRadius: i % 3 === 0 ? '50%' : 2,
              background: i % 2 === 0 ? '#ffaa44' : '#ff6622',
            }}
            initial={{ y: 0, x: 0, opacity: 0, scale: 1 }}
            animate={{ y: -22 - (i % 3) * 8, x: c.dxPx, opacity: [0, 1, 0], scale: [1, 1.4, 0] }}
            transition={{ duration: 0.36, delay, ease: 'easeOut', times: [0, 0.2, 1] }}
          />
        );
      })}

      {/* ── Phase 4: Top-edge spark burst — fires as the last of the card burns ── */}
      {TOP_SPARKS.map((s, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: cx - 3,
            top:  topY + 4,
            width:  6,
            height: 6,
            borderRadius: '50%',
            background: i % 2 === 0 ? '#ffcc44' : '#ff8822',
            boxShadow: '0 0 4px 2px #ff660066',
          }}
          initial={{ x: 0, y: 0, opacity: 0.95, scale: 1 }}
          animate={{ x: s.dx, y: s.dy, opacity: 0, scale: 0.2 }}
          transition={{ duration: 0.32, delay: s.delay, ease: [0.2, 0.6, 0.4, 0.9] }}
        />
      ))}

      {/* ── Phase 5: Ash arc fragments scatter from the top of the consumed card ── */}
      {ASH_ARCS.map((f, i) => (
        <motion.div
          key={i}
          style={{
            position: 'absolute',
            left: cx - f.size / 2,
            top:  topY,
            width:  f.size,
            height: f.size,
            borderRadius: i % 2 === 0 ? '50%' : 2,
            background: i % 3 === 0 ? '#cc5500' : i % 3 === 1 ? '#ff8833' : '#6a5a4a',
          }}
          initial={{ x: 0, y: 0, opacity: 0.88, scale: 1 }}
          animate={{ x: f.dx, y: f.dy, opacity: 0, scale: 0.15 }}
          transition={{ duration: 0.40, delay: f.delay, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
      ))}

      {/* ── Phase 7: Scorch residue — brief dark char on the empty slot ── */}
      <motion.div
        style={{
          position: 'absolute',
          left: slotRect.left,
          top:  slotRect.top,
          width:  slotRect.width,
          height: slotRect.height,
          borderRadius: 12,
          background: 'radial-gradient(ellipse at 50% 65%, rgba(50,15,0,0.50) 0%, rgba(18,5,0,0.30) 55%, transparent 82%)',
          border: '1px solid rgba(90,28,0,0.26)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.88, 0.65, 0] }}
        transition={{ duration: 1.20, delay: 4.80, ease: 'easeOut', times: [0, 0.08, 0.45, 1] }}
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

// ── BurnPileParticle ──────────────────────────────────────────────────────────
// A small charred-card fragment that flies in an arc from the burned market slot
// toward the burn pile chip after BurnFlash completes.
// Portal-based (fixed position) so it escapes overflow containers.
// Self-destructs after ~0.85 s. Non-blocking — game proceeds during flight.

export function BurnPileParticle({
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
    const t = setTimeout(() => onDoneRef.current(), 950);
    return () => clearTimeout(t);
  }, []);

  const x0 = from.left + from.width  / 2;
  const y0 = from.top  + from.height / 2;
  const x1 = to.left  + to.width    / 2;
  const y1 = to.top   + to.height   / 2;

  // Arc apex — curve upward (or away from the direct line) for a natural lob
  const mx = (x0 + x1) / 2 + (y0 - y1) * 0.18;
  const my = Math.min(y0, y1) - 55;

  return createPortal(
    <>
      {/* Trailing ember glow — fades behind the fragment */}
      <motion.div
        style={{
          position: 'fixed',
          left: x0 - 4,
          top:  y0 - 4,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #ff8833cc 0%, #ff440055 60%, transparent 100%)',
          filter: 'blur(2px)',
          pointerEvents: 'none',
          zIndex: 9993,
        }}
        animate={{
          left: [x0 - 4, mx - 4, x1 - 4],
          top:  [y0 - 4, my - 4, y1 - 4],
          scale: [1.2, 0.8, 0.2],
          opacity: [0.7, 0.4, 0],
        }}
        transition={{ duration: 0.78, ease: 'easeInOut', times: [0, 0.45, 1] }}
      />
      {/* Charred card fragment — tiny dark rectangle with ember border */}
      <motion.div
        style={{
          position: 'fixed',
          left: x0 - 5,
          top:  y0 - 6,
          width: 10,
          height: 13,
          borderRadius: 2,
          background: 'linear-gradient(160deg, #3d1500 0%, #1a0800 100%)',
          border: '1px solid #ff5500bb',
          boxShadow: '0 0 5px 2px #ff440055',
          pointerEvents: 'none',
          zIndex: 9994,
        }}
        animate={{
          left: [x0 - 5, mx - 5, x1 - 5],
          top:  [y0 - 6, my - 6, y1 - 6],
          rotate: [0, 38, 75],
          scale:  [1, 0.85, 0.4],
          opacity: [0.95, 0.88, 0],
        }}
        transition={{ duration: 0.78, ease: 'easeInOut', times: [0, 0.45, 1] }}
      />
    </>,
    document.body,
  );
}

// ── BurnChipLandingSpark ──────────────────────────────────────────────────────
// 3–4 tiny orange/amber sparks that explode outward from the burn-pile chip
// center at the moment the BurnPileParticle fragment arrives (~1480 ms total).
// Portal-based (fixed position) so it escapes overflow containers.
// Self-destructs after ~250 ms.

const SPARK_COUNT = 4;

export function BurnChipLandingSpark({
  chipRect,
  angleSeed = 0,
  onDone,
}: {
  chipRect: DOMRect;
  angleSeed?: number;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 260);
    return () => clearTimeout(t);
  }, []);

  const cx = chipRect.left + chipRect.width  / 2;
  const cy = chipRect.top  + chipRect.height / 2;

  // Pre-compute scatter vectors; angleSeed rotates the whole burst so each
  // landing looks unique without changing overall visual weight.
  const sparks = Array.from({ length: SPARK_COUNT }, (_, i) => {
    const angle = (i / SPARK_COUNT) * Math.PI * 2 + (i % 2 === 0 ? 0.3 : -0.3) + angleSeed;
    const dist  = 13 + (i % 2) * 6; // 13 or 19 px
    return {
      dx: Math.cos(angle) * dist,
      dy: Math.sin(angle) * dist,
      size: i % 2 === 0 ? 3 : 2.5,
    };
  });

  return createPortal(
    <>
      {sparks.map((s, i) => (
        <motion.div
          key={i}
          style={{
            position: 'fixed',
            left: cx - s.size / 2,
            top:  cy - s.size / 2,
            width:  s.size,
            height: s.size,
            borderRadius: '50%',
            background: i % 2 === 0
              ? 'radial-gradient(circle, #ffcc44 0%, #ff7700 80%)'
              : 'radial-gradient(circle, #ffffff 0%, #ff9900 60%, transparent 100%)',
            boxShadow: '0 0 4px 1px #ff660088',
            pointerEvents: 'none',
            zIndex: 9995,
          }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: s.dx,
            y: s.dy,
            opacity: 0,
            scale: 0.2,
          }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      ))}
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
  if (lumId === 'lum_tide') return createPortal(<TideScryFx />, document.body);
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

// Tide Architect — left-to-right card-flip scry wave over Tier III then Tier II
// Continuum/Sapphire palette: deep blue, ice-blue, cool cyan.
// A vertical sweep bar travels L→R across the market zone; as it passes each
// column a brief flip-shimmer panel lights up, suggesting card faces being
// revealed.  Prismatic glints fire at each reveal point.
// Total duration: ~2.0 s.
const SCRY_COLS = 8 as const; // 4 Tier-III + 4 Tier-II columns
function TideScryFx() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 69 }}>

      {/* Ambient sapphire glow — broad ellipse across the market band */}
      <motion.div
        style={{
          position: 'fixed',
          top: '30%', left: '50%',
          translateX: '-50%', translateY: '-50%',
          width: '85vw', height: '28vh',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse, #1e3a8a55 0%, #1d4ed866 30%, #0ea5e933 58%, transparent 78%)',
          filter: 'blur(18px)',
          pointerEvents: 'none',
          zIndex: 69,
        }}
        initial={{ scale: 0.55, opacity: 0 }}
        animate={{ scale: [0.55, 1.08, 0.96, 0.7], opacity: [0, 0.72, 0.55, 0] }}
        transition={{ duration: 2.0, times: [0, 0.18, 0.62, 1], ease: 'easeOut' }}
      />

      {/* Vertical sweep bar — the "scry cursor" moving left to right */}
      <motion.div
        style={{
          position: 'fixed',
          top: '10%',
          bottom: '42%',
          width: 3,
          background:
            'linear-gradient(180deg, transparent 0%, #38bdf8cc 18%, #e0f2feee 50%, #38bdf8cc 82%, transparent 100%)',
          boxShadow: '0 0 18px 7px #38bdf866, 0 0 5px 2px #bae6fdcc',
          filter: 'blur(0.5px)',
          pointerEvents: 'none',
          zIndex: 71,
        }}
        initial={{ left: '4%', opacity: 0 }}
        animate={{ left: ['4%', '96%', '96%'], opacity: [0, 0.92, 0] }}
        transition={{ duration: 1.55, times: [0, 0.85, 1], ease: 'easeInOut' }}
      />

      {/* Card-flip shimmer panels — one per column, staggered L→R */}
      {Array.from({ length: SCRY_COLS }).map((_, i) => {
        const xPct = 5 + i * 11.5;
        const delay = 0.06 + i * 0.155;
        const isOdd = i % 2 === 1;
        return (
          <motion.div
            key={i}
            style={{
              position: 'fixed',
              top: '11%',
              bottom: '43%',
              left: `${xPct}%`,
              width: '9vw',
              borderRadius: 8,
              background: isOdd
                ? 'linear-gradient(90deg, transparent 0%, #1e40af1a 28%, #60a5fa55 50%, #1e40af1a 72%, transparent 100%)'
                : 'linear-gradient(90deg, transparent 0%, #0c4a6e22 28%, #38bdf866 50%, #0c4a6e22 72%, transparent 100%)',
              boxShadow: isOdd
                ? 'inset 0 0 0 1px #38bdf822'
                : 'inset 0 0 0 1px #7dd3fc22',
              pointerEvents: 'none',
              zIndex: 69,
            }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: [0, 0.88, 0.7, 0], scaleX: [0, 1, 1, 0] }}
            transition={{
              duration: 0.52,
              delay,
              times: [0, 0.22, 0.6, 1],
              ease: 'easeOut',
            }}
          />
        );
      })}

      {/* Prismatic glint dots — fire at the reveal point of each column */}
      {Array.from({ length: SCRY_COLS }).map((_, i) => {
        const xPct = 9 + i * 11.5;
        const yPct = 13 + (i % 3) * 7;
        const delay = 0.12 + i * 0.155;
        const color =
          i % 3 === 0 ? '#e0f2fe' : i % 3 === 1 ? '#7dd3fc' : '#38bdf8';
        const glow =
          i % 3 === 0 ? '#bae6fd99' : '#38bdf866';
        return (
          <motion.div
            key={`g${i}`}
            style={{
              position: 'fixed',
              top: `${yPct}%`,
              left: `${xPct}%`,
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: color,
              boxShadow: `0 0 8px 4px ${glow}`,
              pointerEvents: 'none',
              zIndex: 71,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: [0, 1, 0], scale: [0, 1.6, 0] }}
            transition={{ duration: 0.38, delay, ease: 'easeOut' }}
          />
        );
      })}

      {/* Trailing sapphire edge line — briefly outlines the market zone */}
      <motion.div
        style={{
          position: 'fixed',
          top: '10%',
          left: '4%', right: '4%',
          height: 1.5,
          background:
            'linear-gradient(90deg, transparent 0%, #38bdf8aa 20%, #7dd3fccc 50%, #38bdf8aa 80%, transparent 100%)',
          boxShadow: '0 0 8px 3px #38bdf855',
          pointerEvents: 'none',
          zIndex: 70,
        }}
        initial={{ scaleX: 0, opacity: 0 }}
        animate={{ scaleX: [0, 1, 1, 0], opacity: [0, 0.75, 0.55, 0] }}
        transition={{ duration: 1.9, times: [0, 0.1, 0.82, 1], ease: 'easeInOut' }}
      />
    </div>
  );
}
