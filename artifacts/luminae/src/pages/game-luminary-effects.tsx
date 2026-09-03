import React from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useRef } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { CARD_ART } from './game-constants';
import { BrandStampSVG } from './game-brand-stamp';
import { useRuntimePerformanceState } from '@/lib/runtimePerformance';

export type MarkerType = 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed' | 'burned';
export type PersistentMarkerType = Exclude<MarkerType, 'burned'>;

export const MARKER_META: Record<
  MarkerType,
  { label: string; bg: string; border: string; text: string; meaning: string; duration: string }
> = {
  forgotten: {
    label:    'Forgotten',
    bg:       'rgba(10,6,30,0.93)',
    border:   '#3b2b8c',
    text:     '#9988ee',
    meaning:  'If forged while marked, this Artifact awards 0 Eminence and cannot be used for blueprints. Encrypt is unavailable while Forgotten Hour is active.',
    duration: 'Lasts only until the source player\'s next end of turn.',
  },
  condemned: {
    label:    'Condemned',
    bg:       'rgba(60,4,4,0.95)',
    border:   '#c82828',
    text:     '#ff6060',
    meaning:  'This Artifact will burn instead of remaining in the Forge.',
    duration: 'Resolves at the end of Ember Sovereign\'s next turn.',
  },
  nullified: {
    label:    'Nullified',
    bg:       'rgba(4,8,22,0.95)',
    border:   '#1c3b6e',
    text:     '#6080c0',
    meaning:  'This Artifact awards 0 Eminence, cannot be used for Blueprints, and cannot be Encrypted. The first Nullified Artifact forged this game ignores these penalties if forged by the allied player.',
    duration: 'Persists while this Artifact remains marked.',
  },
  avatar_seed: {
    label:    'Seeded',
    bg:       'rgba(4,18,12,0.95)',
    border:   '#1a5c3a',
    text:     '#4cc88a',
    meaning:  'If an opponent forges this Artifact, the allied player gains its matching permanent Affinity bonus.',
    duration: 'Persists with the Artifact until it is forged or leaves play.',
  },
  burned: {
    label:    'Burned',
    bg:       'rgba(48,12,0,0.96)',
    border:   '#cc4400',
    text:     '#ff7040',
    meaning:  '',
    duration: '',
  },
};

// Persistent-marker → source Luminary mapping (1:1). Drives the originating
// Luminary pulse and strike color framing.
export const MARKER_SOURCE: Record<MarkerType, { lumId: string; lumName: string } | null> = {
  forgotten:   { lumId: 'lum_compass', lumName: '???' },
  condemned:   { lumId: 'lum_ember',   lumName: 'Ember Sovereign' },
  nullified:   { lumId: 'lum_null',    lumName: 'Null Sovereign' },
  avatar_seed: { lumId: 'lum_seed',    lumName: 'The Seed Beyond Seasons' },
  burned:      null,
};

export function BlueprintRedaction({
  revealed,
  className = '',
}: {
  revealed: boolean;
  className?: string;
}) {
  if (revealed) return <span className={className}>blueprints</span>;

  return (
    <span
      className={`inline-block h-[0.72em] w-[4.8em] align-[-0.1em] rounded-sm bg-black/95 shadow-[0_0_8px_rgba(129,140,248,0.26)] ${className}`}
      role="img"
      aria-label="redacted term"
      title="Unknown term"
    />
  );
}

export function ForgottenHourDescription({
  revealBlueprintText,
  className = '',
}: {
  revealBlueprintText: boolean;
  className?: string;
}) {
  return (
    <p className={className}>
      On arrival, raises the shared victory requirement by 1 and marks all currently face-up Forge Artifacts as Forgotten.
      {' '}Forgotten marks last only until the source player's next end of turn; this Luminary's ally may still Encrypt, but other players cannot. After the marks expire, 12 owner-turn cycles pass; then Forgotten Hour returns at the source player's end of turn. Artifacts forged while Forgotten award 0 Eminence and cannot be used for{' '}
      <BlueprintRedaction revealed={revealBlueprintText} />.
    </p>
  );
}

// Per-marker-type visual config for the ArrivalBrandStrike beam animation.
// No blur is used anywhere — all sharpness is achieved via gradients + borders.
const BRAND_META: Record<MarkerType, {
  beamColor: string;      // main beam shaft color
  beamSecondary: string;  // beam origin (top) — cosmic space color
  flashColor: string;     // impact flash / border color
  brandColor: string;     // large brand icon text color
}> = {
  forgotten: {
    beamColor:     '#818cf8',
    beamSecondary: '#1e1b4b',
    flashColor:    '#c4b5fd',
    brandColor:    '#9988ee',
  },
  condemned: {
    beamColor:     '#ff5a3c',  // ember orange — lum_ember summonColor
    beamSecondary: '#1a0030',  // deep black-violet — lum_ember secondary darkness
    flashColor:    '#d4af37',  // sovereign gold — imperial impact flash
    brandColor:    '#e05050',  // ember red — keep
  },
  nullified: {
    beamColor:     '#94a3b8',
    beamSecondary: '#0f172a',
    flashColor:    '#e2e8f0',
    brandColor:    '#7090b8',
  },
  avatar_seed: {
    beamColor:     '#4ade80',
    beamSecondary: '#064e3b',
    flashColor:    '#86efac',
    brandColor:    '#4cc88a',
  },
  burned: {
    beamColor:     '#f97316',
    beamSecondary: '#7c2d12',
    flashColor:    '#fcd34d',
    brandColor:    '#ff7040',
  },
};

function BrandTattooWordmark({
  type,
  compact = false,
  primaryColor,
  secondaryColor,
}: {
  type: MarkerType;
  compact?: boolean;
  primaryColor?: string;
  secondaryColor?: string;
}) {
  const bm = BRAND_META[type];
  const mm = MARKER_META[type];
  const primary = primaryColor ?? bm.flashColor;
  const secondary = secondaryColor ?? bm.beamColor;

  return (
    <div
      data-brand-keyword={type}
      data-brand-label={mm.label}
      data-brand-treatment="forged-tattoo"
      data-compact={compact ? 'true' : 'false'}
      className="relative flex w-full items-center justify-center"
      style={{
        aspectRatio: '2.2 / 1',
        filter: `drop-shadow(0 0 ${compact ? 3 : 5}px ${secondary}88)`,
      }}
    >
      <BrandStampSVG
        width="100%"
        height="100%"
        accent={primary}
        accentGlow={secondary}
        accentDark={mm.bg}
        label={mm.label}
        showForgeCrest={false}
      />
    </div>
  );
}

// Lead time (ms) for the source-Luminary arrival pulse that precedes the brand
// beams. The caller bakes this into each strike's delay when a source is present
// so the beams begin only after the source has visibly "fired".
export const SOURCE_PULSE_LEAD_MS = 300;

// ── ArrivalBrandStrike ────────────────────────────────────────────────────────
// Portal-rendered overlay that fires when a Luminary arrival brands cards with
// persistent markers. For each affected card shows:
//   1. A lightning beam descending from above the viewport
//   2. A crisp impact flash on the card border
//   3. A keyword stamp crossing the card face, then handing off to
//      the persistent card-bound brand in CardKeywordOverlay
// No blur effects used anywhere — sharpness via gradients and borders only.

export interface BrandStrikeTarget {
  rect: { x: number; y: number; w: number; h: number };
  type: MarkerType;
  delay: number; // ms stagger offset
}

export function ArrivalBrandStrike({
  strikes,
  source,
  onFirstImpact,
  onDone,
}: {
  strikes: BrandStrikeTarget[];
  /**
   * Optional source-Luminary framing: the originating portal's viewport rect and
   * its summon colors. When present (and not reduced-motion), an expanding pulse
   * fires from the portal before the beams, and the keyword stamp is tinted
   * with the Luminary's colors instead of the marker's default palette.
   */
  source?: { rect: { x: number; y: number; w: number; h: number }; primary: string; secondary: string };
  /** Fires exactly once when the first strike reaches its target card. */
  onFirstImpact?: () => void;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const onFirstImpactRef = useRef(onFirstImpact);
  onFirstImpactRef.current = onFirstImpact;
  const reducedMotion = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  ).current;
  useEffect(() => {
    const maxDelay = strikes.length > 0 ? Math.max(...strikes.map(s => s.delay)) : 0;
    const firstDelay = strikes.length > 0 ? Math.min(...strikes.map(s => s.delay)) : 0;
    // Aura crackles from beam-impact (+420ms) for 1000ms. Wait until it fully fades
    // before calling onDone so the camera does not restore while the aura is still
    // visible.
    //   maxDelay + 420 (beam impact) + 1000 (aura duration) = +1420
    const totalMs = reducedMotion ? 350 : maxDelay + 1420;
    const impactMs = reducedMotion ? firstDelay : firstDelay + 420;
    const impactTimer = setTimeout(() => onFirstImpactRef.current?.(), impactMs);
    const doneTimer = setTimeout(() => onDoneRef.current(), totalMs);
    return () => {
      clearTimeout(impactTimer);
      clearTimeout(doneTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (reducedMotion) {
    // Reduced-motion: quick crisp border flash per card, no beam
    return createPortal(
      <div
        data-testid="arrival-brand-strike"
        style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 75 }}
      >
        {strikes.map((s, i) => {
          const bm = BRAND_META[s.type];
          return (
            <React.Fragment key={i}>
              <motion.div
                style={{
                  position: 'fixed',
                  left: s.rect.x, top: s.rect.y,
                  width: s.rect.w, height: s.rect.h,
                  border: `2px solid ${bm.flashColor}`,
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.28, delay: s.delay / 1000, ease: 'easeOut' }}
              />
              {/* Keyword brand — reduced motion: appears instantly then fades */}
              <motion.div
                style={{
                  position: 'fixed',
                  left: s.rect.x + s.rect.w / 2,
                  top:  s.rect.y + s.rect.h / 2,
                  translateX: '-50%',
                  translateY: '-50%',
                  width: s.rect.w * 0.92,
                  minHeight: Math.max(16, s.rect.h * 0.16),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: Math.max(7, Math.min(13, Math.round(s.rect.w * 0.11))),
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0] }}
                transition={{ duration: 0.28, delay: s.delay / 1000 + 0.04, ease: 'easeOut' }}
              >
                <BrandTattooWordmark
                  type={s.type}
                  compact={s.rect.w < 90}
                  primaryColor={source?.primary}
                  secondaryColor={source?.secondary}
                />
              </motion.div>
            </React.Fragment>
          );
        })}
      </div>,
      document.body,
    );
  }

  return createPortal(
    <div
      data-testid="arrival-brand-strike"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 75 }}
    >
      {/* ── Source-Luminary arrival pulse (expanding only — no shrink-in) ── */}
      {source && (() => {
        const cx = source.rect.x + source.rect.w / 2;
        const cy = source.rect.y + source.rect.h / 2;
        const base = Math.max(source.rect.w, source.rect.h);
        const pulseDur = (SOURCE_PULSE_LEAD_MS + 260) / 1000;
        return (
          <React.Fragment key="source-pulse">
            {/* Central flare core — radial gradient, no blur */}
            <motion.div
              style={{
                position: 'fixed',
                left: cx, top: cy,
                width: base * 0.9, height: base * 0.9,
                translateX: '-50%', translateY: '-50%',
                borderRadius: '9999px',
                background: `radial-gradient(circle, ${source.primary}cc 0%, ${source.secondary}66 45%, transparent 72%)`,
                pointerEvents: 'none',
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.15, 0.95], opacity: [0, 0.9, 0] }}
              transition={{ duration: pulseDur * 0.75, ease: 'easeOut' }}
            />
            {/* Expanding ring — primary color */}
            <motion.div
              style={{
                position: 'fixed',
                left: cx, top: cy,
                width: base, height: base,
                translateX: '-50%', translateY: '-50%',
                borderRadius: '9999px',
                border: `3px solid ${source.primary}`,
                boxShadow: `0 0 16px 2px ${source.primary}aa, inset 0 0 12px 1px ${source.secondary}88`,
                pointerEvents: 'none',
              }}
              initial={{ scale: 0.25, opacity: 0 }}
              animate={{ scale: [0.25, 1.0, 2.4], opacity: [0, 0.95, 0] }}
              transition={{ duration: pulseDur, times: [0, 0.4, 1], ease: 'easeOut' }}
            />
            {/* Expanding ring — secondary color, slight lag for depth */}
            <motion.div
              style={{
                position: 'fixed',
                left: cx, top: cy,
                width: base, height: base,
                translateX: '-50%', translateY: '-50%',
                borderRadius: '9999px',
                border: `2px solid ${source.secondary}`,
                pointerEvents: 'none',
              }}
              initial={{ scale: 0.25, opacity: 0 }}
              animate={{ scale: [0.25, 1.3, 2.8], opacity: [0, 0.7, 0] }}
              transition={{ duration: pulseDur, delay: 0.08, times: [0, 0.4, 1], ease: 'easeOut' }}
            />
          </React.Fragment>
        );
      })()}
      {strikes.map((s, i) => {
        const bm = BRAND_META[s.type];
        const d = s.delay / 1000; // seconds for framer-motion
        const cardCx = s.rect.x + s.rect.w / 2;
        const beamTip = s.rect.y + s.rect.h * 0.55;

        return (
          <React.Fragment key={i}>
            {/* ── Lightning beam: cosmic space above → card center ── */}
            {/* Beam tip reaches card at exactly 420ms (= 0.70 × 600ms), matching  */}
            {/* the absolute amplitude peak in Spellbound.wav.                     */}
            <motion.div
              style={{
                position: 'fixed',
                left: cardCx - 2,
                top: 0,
                width: 4,
                height: beamTip,
                background: `linear-gradient(to bottom, transparent 0%, ${bm.beamSecondary} 15%, ${bm.beamColor} 65%, ${bm.flashColor} 100%)`,
                transformOrigin: 'top center',
              }}
              initial={{ scaleY: 0, opacity: 0 }}
              animate={{ scaleY: [0, 1, 1, 0], opacity: [0, 1, 0.85, 0] }}
              transition={{ duration: 0.60, delay: d, times: [0, 0.70, 0.88, 1], ease: 'easeIn' }}
            />
            {/* Thin side halo lines for the beam — no blur, just crisp lines */}
            {[-3, 3].map(offset => (
              <motion.div
                key={offset}
                style={{
                  position: 'fixed',
                  left: cardCx + offset - 0.5,
                  top: 0,
                  width: 1,
                  height: beamTip * 0.7,
                  background: `linear-gradient(to bottom, transparent 0%, ${bm.beamColor}55 50%, transparent 100%)`,
                  transformOrigin: 'top center',
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: [0, 1, 0], opacity: [0, 0.6, 0] }}
                transition={{ duration: 0.58, delay: d + 0.02, ease: 'easeIn' }}
              />
            ))}
            {/* ── Impact flash on card border — fires when beam tip lands (420ms) ── */}
            <motion.div
              style={{
                position: 'fixed',
                left: s.rect.x - 1, top: s.rect.y - 1,
                width: s.rect.w + 2, height: s.rect.h + 2,
                border: `2px solid ${bm.flashColor}`,
                boxShadow: `inset 0 0 10px 2px ${bm.beamColor}44`,
              }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 0.22, delay: d + 0.41, ease: 'easeOut' }}
            />
            {/* ── Glow halo — pulsing behind the keyword brand ── */}
            <motion.div
              style={{
                position: 'fixed',
                left: s.rect.x + s.rect.w / 2,
                top: s.rect.y + s.rect.h / 2,
                translateX: '-50%',
                translateY: '-50%',
                width: s.rect.w * 0.6,
                height: s.rect.w * 0.6,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${(source?.primary ?? bm.brandColor)}22 0%, transparent 70%)`,
                pointerEvents: 'none',
              }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{
                opacity: [0, 0.65, 0.65, 0.65, 0.65, 0],
                scale: [0.5, 1.3, 1.1, 1.3, 1.1, 0],
              }}
              transition={{
                duration: 1.35,
                delay: d + 0.41,
                times: [0, 0.18, 0.30, 0.48, 0.62, 1],
                ease: 'easeOut',
              }}
            />
            {/* ── Keyword brand — stamps in at the audio peak (420ms) ── */}
            <motion.div
              style={{
                position: 'fixed',
                left: s.rect.x + s.rect.w / 2,
                top:  s.rect.y + s.rect.h / 2,
                translateX: '-50%',
                translateY: '-50%',
                width: s.rect.w * 0.92,
                minHeight: Math.max(16, s.rect.h * 0.16),
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: Math.max(7, Math.min(13, Math.round(s.rect.w * 0.11))),
                userSelect: 'none',
                pointerEvents: 'none',
              }}
              initial={{ scaleX: 0, scaleY: 0.86, opacity: 0 }}
              animate={{
                scaleX:  [0,    1.08, 1,    1.04, 1,    1,    0.92],
                scaleY:  [0.86, 1.05, 1,    1.03, 1,    1,    0.96],
                opacity: [0,    1,    1,    1,    1,    1,    0],
              }}
              transition={{
                duration: 1.35,
                delay: d + 0.41,
                times:   [0, 0.18, 0.30, 0.48, 0.62, 0.82, 1],
                ease: 'easeOut',
              }}
            >
              <BrandTattooWordmark
                type={s.type}
                compact={s.rect.w < 90}
                primaryColor={source?.primary}
                secondaryColor={source?.secondary}
              />
            </motion.div>
          </React.Fragment>
        );
      })}
    </div>,
    document.body,
  );
}

// ── BrandStrikeAura ───────────────────────────────────────────────────────────
// Lingering electric aura rendered inside a Forge slot after a brand
// strike lands. Flickers like residual discharge energy, then the persistent
// CardKeywordOverlay keeps the keyword brand alive until the card leaves.
// `delay` is the ms elapsed from when fireBrandStrikes was called until the
// beam hit this card (= lead + i*90 + 420ms — the Spellbound.wav impact peak).
export function BrandStrikeAura({
  type,
  delay,
}: {
  type: MarkerType;
  delay: number;
}) {
  const bm = BRAND_META[type];
  const d = delay / 1000;
  return (
    <>
      {/* Electric border arc — impact flash then crackle-linger then dissipate.
          Compressed to ~0.7s to fit the 1000ms post-strike window. */}
      <motion.div
        style={{
          position: 'absolute',
          inset: -1,
          border: `1.5px solid ${bm.flashColor}`,
          boxShadow: `0 0 8px 2px ${bm.beamColor}99, 0 0 3px 1px ${bm.flashColor}88, inset 0 0 5px 1px ${bm.beamColor}33`,
          pointerEvents: 'none',
          zIndex: 8,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.30, 0.75, 0.12, 0.50, 0.05, 0.22, 0] }}
        transition={{
          duration: 0.7,
          delay: d,
          times: [0, 0.05, 0.18, 0.30, 0.45, 0.58, 0.68, 0.80, 1.0],
          ease: 'linear',
        }}
      />
      {/* Ambient energy glow — softer inner radial that decays with the arc */}
      <motion.div
        style={{
          position: 'absolute',
          inset: 3,
          background: `radial-gradient(ellipse at center, ${bm.beamColor}22 0%, transparent 75%)`,
          pointerEvents: 'none',
          zIndex: 7,
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.85, 0.18, 0.62, 0.05, 0.35, 0] }}
        transition={{
          duration: 0.6,
          delay: d + 0.02,
          times: [0, 0.05, 0.18, 0.32, 0.52, 0.72, 1.0],
          ease: 'linear',
        }}
      />

      {/* ── Condemned-specific: impact flash + electric arc paths ──────────── */}
      {/* Fires at beam-landing (delay d). One-shot, no repeat, no blur.       */}
      {type === 'condemned' && (
        <>
          {/* Sharp center radial burst at the moment of impact */}
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(ellipse at 50% 48%, rgba(255,220,130,0.58) 0%, rgba(255,90,50,0.32) 38%, transparent 68%)',
              pointerEvents: 'none',
              zIndex: 10,
              borderRadius: 'inherit',
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 0.38, delay: d, times: [0, 0.13, 1.0], ease: 'easeOut' }}
          />

          {/* Discharge rays from impact center — 5 spokes at irregular angles.
              Each ray starts at the card center and travels outward with 2–3
              large irregular jags (not even zigzag — amplitude varies per segment
              so the path reads as branching electricity, not a graph line).
              Dual-stroke per ray: wide amber halo (outer glow) rendered first,
              then narrow white-yellow core on top — creates the "glowing wire"
              look without any blur filter.
              pathLength snaps on in 0.10s (near-instant flash), then opacity
              fades over 0.75–0.80s.  All one-shot — no repeat, no OOM risk. */}
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 11,
              overflow: 'visible',
            }}
          >
            {/* ── Ray 1: upper-right ─────────────────────────────── */}
            <motion.path d="M 50,46 L 62,28 L 68,14 L 76,3"
              pathLength={1} stroke="rgba(255,155,28,0.60)" strokeWidth={3.5}
              fill="none" strokeLinecap="round" strokeLinejoin="miter"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.80, 0.52, 0] }}
              transition={{
                pathLength: { duration: 0.10, delay: d, ease: 'easeOut' },
                opacity: { duration: 0.78, delay: d, times: [0, 0.02, 0.55, 1.0], ease: 'linear' },
              }}
            />
            <motion.path d="M 50,46 L 62,28 L 68,14 L 76,3"
              pathLength={1} stroke="rgba(255,248,168,0.96)" strokeWidth={1.3}
              fill="none" strokeLinecap="round" strokeLinejoin="miter"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 1, 0.68, 0] }}
              transition={{
                pathLength: { duration: 0.10, delay: d, ease: 'easeOut' },
                opacity: { duration: 0.80, delay: d, times: [0, 0.02, 0.55, 1.0], ease: 'linear' },
              }}
            />

            {/* ── Ray 2: lower-left ──────────────────────────────── */}
            <motion.path d="M 50,46 L 36,62 L 24,76 L 14,90"
              pathLength={1} stroke="rgba(255,125,18,0.55)" strokeWidth={3.0}
              fill="none" strokeLinecap="round" strokeLinejoin="miter"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.75, 0.48, 0] }}
              transition={{
                pathLength: { duration: 0.10, delay: d, ease: 'easeOut' },
                opacity: { duration: 0.75, delay: d, times: [0, 0.02, 0.55, 1.0], ease: 'linear' },
              }}
            />
            <motion.path d="M 50,46 L 36,62 L 24,76 L 14,90"
              pathLength={1} stroke="rgba(255,220,98,0.92)" strokeWidth={1.2}
              fill="none" strokeLinecap="round" strokeLinejoin="miter"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.96, 0.62, 0] }}
              transition={{
                pathLength: { duration: 0.10, delay: d, ease: 'easeOut' },
                opacity: { duration: 0.78, delay: d, times: [0, 0.02, 0.55, 1.0], ease: 'linear' },
              }}
            />

            {/* ── Ray 3: upper-left (stagger +30 ms) ────────────── */}
            <motion.path d="M 50,46 L 36,30 L 28,15 L 18,4"
              pathLength={1} stroke="rgba(255,155,28,0.52)" strokeWidth={2.5}
              fill="none" strokeLinecap="round" strokeLinejoin="miter"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.72, 0.44, 0] }}
              transition={{
                pathLength: { duration: 0.10, delay: d + 0.03, ease: 'easeOut' },
                opacity: { duration: 0.72, delay: d + 0.03, times: [0, 0.02, 0.55, 1.0], ease: 'linear' },
              }}
            />
            <motion.path d="M 50,46 L 36,30 L 28,15 L 18,4"
              pathLength={1} stroke="rgba(255,248,168,0.92)" strokeWidth={1.1}
              fill="none" strokeLinecap="round" strokeLinejoin="miter"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.96, 0.62, 0] }}
              transition={{
                pathLength: { duration: 0.10, delay: d + 0.03, ease: 'easeOut' },
                opacity: { duration: 0.74, delay: d + 0.03, times: [0, 0.02, 0.55, 1.0], ease: 'linear' },
              }}
            />

            {/* ── Ray 4: lower-right (stagger +30 ms) ───────────── */}
            <motion.path d="M 50,46 L 66,60 L 76,72 L 88,90"
              pathLength={1} stroke="rgba(255,118,18,0.50)" strokeWidth={2.5}
              fill="none" strokeLinecap="round" strokeLinejoin="miter"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.70, 0.42, 0] }}
              transition={{
                pathLength: { duration: 0.10, delay: d + 0.03, ease: 'easeOut' },
                opacity: { duration: 0.70, delay: d + 0.03, times: [0, 0.02, 0.55, 1.0], ease: 'linear' },
              }}
            />
            <motion.path d="M 50,46 L 66,60 L 76,72 L 88,90"
              pathLength={1} stroke="rgba(255,215,88,0.90)" strokeWidth={1.0}
              fill="none" strokeLinecap="round" strokeLinejoin="miter"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.92, 0.58, 0] }}
              transition={{
                pathLength: { duration: 0.10, delay: d + 0.03, ease: 'easeOut' },
                opacity: { duration: 0.72, delay: d + 0.03, times: [0, 0.02, 0.55, 1.0], ease: 'linear' },
              }}
            />

            {/* ── Ray 5: rightward (stagger +55 ms) ─────────────── */}
            <motion.path d="M 50,46 L 68,42 L 84,46 L 96,44"
              pathLength={1} stroke="rgba(255,138,22,0.46)" strokeWidth={2.0}
              fill="none" strokeLinecap="round" strokeLinejoin="miter"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.65, 0.38, 0] }}
              transition={{
                pathLength: { duration: 0.10, delay: d + 0.05, ease: 'easeOut' },
                opacity: { duration: 0.65, delay: d + 0.05, times: [0, 0.02, 0.55, 1.0], ease: 'linear' },
              }}
            />
            <motion.path d="M 50,46 L 68,42 L 84,46 L 96,44"
              pathLength={1} stroke="rgba(255,245,152,0.86)" strokeWidth={0.9}
              fill="none" strokeLinecap="round" strokeLinejoin="miter"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: [0, 0.88, 0.52, 0] }}
              transition={{
                pathLength: { duration: 0.10, delay: d + 0.05, ease: 'easeOut' },
                opacity: { duration: 0.68, delay: d + 0.05, times: [0, 0.02, 0.55, 1.0], ease: 'linear' },
              }}
            />
          </svg>
        </>
      )}
    </>
  );
}

// ── CardKeywordOverlay ────────────────────────────────────────────────────────
// Card-level aura plus a centered keyword band rendered inside the card. The
// keyword remains visible in both compact and full Forge presentations.
//
// Condemned  — ember-red pulsing vignette at card edges; implies burning imminence.
// Forgotten  — blue-black haze + CSS backdrop desaturation; Eminence muted visually.
// Nullified  — cold grey full-card desaturation overlay; void/silent, no animation.
// Seeded     — soft green edge shimmer; implies a future claim.

function HeldBrandKeyword({
  type,
  brandDelay,
  compact = false,
  stackIndex = 0,
  stackCount = 1,
}: {
  type: PersistentMarkerType;
  brandDelay?: number;
  compact?: boolean;
  stackIndex?: number;
  stackCount?: number;
}) {
  const bm = BRAND_META[type];
  const mm = MARKER_META[type];
  const delayS = brandDelay === undefined ? 0 : Math.max(0, brandDelay - 150) / 1000;
  const pulseDuration = 3.6;
  const restingGlow = `drop-shadow(0 0 ${compact ? 1 : 2}px ${bm.beamColor}55)`;
  const peakGlow = [
    `drop-shadow(0 0 ${compact ? 5 : 9}px ${bm.flashColor}ff)`,
    `drop-shadow(0 0 ${compact ? 9 : 16}px ${bm.beamColor}cc)`,
  ].join(' ');
  const reducedMotion = useRef(
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  ).current;
  const runtime = useRuntimePerformanceState();
  const freezePersistentBrand = reducedMotion || runtime.mobile || !runtime.visible;
  const stackOffset =
    (stackIndex - (stackCount - 1) / 2) * (compact ? 10 : 18);

  return (
    <motion.div
      className="persistent-brand-keyword absolute inset-0 z-[15] flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.18, delay: delayS, ease: 'easeOut' }}
      role="img"
      aria-label={`${mm.label} brand`}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          transform: `translateY(${stackOffset}px)`,
        }}
      >
        <motion.div
          className="absolute"
          style={{
            width: compact ? '98%' : '94%',
            height: compact ? 18 : 25,
            background: `radial-gradient(ellipse, ${bm.flashColor}4f 0%, ${bm.beamColor}26 48%, transparent 76%)`,
          }}
          animate={
            freezePersistentBrand
              ? { opacity: 0.34, scale: 1 }
              : { opacity: [0.16, 0.64, 0.16], scaleX: [0.98, 1.04, 0.98] }
          }
          transition={
            freezePersistentBrand
              ? { duration: 0.18, delay: delayS, ease: 'easeOut' }
              : {
                  duration: pulseDuration,
                  delay: delayS,
                  times: [0, 0.5, 1],
                  repeat: Infinity,
                  repeatType: 'loop',
                  ease: 'easeInOut',
                }
          }
        />
        <motion.div
          className="relative flex items-center justify-center"
          style={{
            width: compact ? '98%' : '96%',
            rotate: stackCount > 1 ? -8 + stackIndex * 5 : -10,
            filter: restingGlow,
          }}
          animate={
            freezePersistentBrand
              ? { opacity: 0.88, scaleX: 1, filter: restingGlow }
              : {
                  opacity: [0.68, 1, 0.68],
                  scaleX: 1,
                  filter: [restingGlow, peakGlow, restingGlow],
                }
          }
          transition={
            freezePersistentBrand
              ? { duration: 0.18, delay: delayS, ease: 'easeOut' }
              : {
                  duration: pulseDuration,
                  delay: delayS,
                  times: [0, 0.5, 1],
                  repeat: Infinity,
                  repeatType: 'loop',
                  ease: 'easeInOut',
                }
          }
        >
          <BrandTattooWordmark type={type} compact={compact} />
        </motion.div>
      </div>
    </motion.div>
  );
}

export function CardKeywordOverlay({
  type,
  brandDelay,
  compact = false,
  stackIndex = 0,
  stackCount = 1,
  showSurfaceTreatment = true,
}: {
  type: PersistentMarkerType;
  brandDelay?: number;
  compact?: boolean;
  stackIndex?: number;
  stackCount?: number;
  showSurfaceTreatment?: boolean;
}) {
  if (type === 'condemned') {
    return (
      <>
        {showSurfaceTreatment && (
          <div
            className="absolute inset-0 z-10 pointer-events-none rounded-xl overflow-hidden"
            style={{
              background:
                'radial-gradient(ellipse at 50% 50%, transparent 48%, rgba(148,12,0,0.24) 100%)',
              boxShadow: 'inset 0 0 0 1.5px rgba(200,38,0,0.38)',
            }}
          />
        )}
        <HeldBrandKeyword type={type} brandDelay={brandDelay} compact={compact} stackIndex={stackIndex} stackCount={stackCount} />
      </>
    );
  }
  if (type === 'forgotten') {
    // Edge-biased tint (darker top/bottom, clear centre) so card art + cost remain
    // readable while Eminence area is visibly muted.
    return (
      <>
        {showSurfaceTreatment && (
          <div
            className="absolute inset-0 z-10 pointer-events-none rounded-xl overflow-hidden"
            style={{
              background: 'linear-gradient(to bottom, rgba(8,4,28,0.32) 0%, rgba(8,4,28,0.10) 28%, rgba(8,4,28,0.10) 70%, rgba(8,4,28,0.34) 100%)',
            }}
          />
        )}
        <HeldBrandKeyword type={type} brandDelay={brandDelay} compact={compact} stackIndex={stackIndex} stackCount={stackCount} />
      </>
    );
  }
  if (type === 'nullified') {
    // Full desaturation — void/silent state.  brightness(0.82) keeps card readable.
    return (
      <>
        {showSurfaceTreatment && (
          <div
            className="absolute inset-0 z-10 pointer-events-none rounded-xl overflow-hidden"
            style={{
              background: 'rgba(8,10,22,0.18)',
            }}
          />
        )}
        <HeldBrandKeyword type={type} brandDelay={brandDelay} compact={compact} stackIndex={stackIndex} stackCount={stackCount} />
      </>
    );
  }
  if (type === 'avatar_seed') {
    return (
      <>
        {showSurfaceTreatment && (
          <div
            className="kw-overlay-seeded absolute inset-0 z-10 pointer-events-none rounded-xl overflow-hidden"
            style={{
              background:
                'linear-gradient(to bottom, transparent 45%, rgba(26,92,58,0.28) 100%)',
              boxShadow: 'inset 0 0 0 1px rgba(44,140,80,0.38)',
            }}
          />
        )}
        <HeldBrandKeyword type={type} brandDelay={brandDelay} compact={compact} stackIndex={stackIndex} stackCount={stackCount} />
      </>
    );
  }
  return null;
}

export function ArtifactBrandDetails({
  types,
  className = '',
}: {
  types: readonly PersistentMarkerType[];
  className?: string;
}) {
  const uniqueTypes = types.filter((type, index) => types.indexOf(type) === index);
  if (uniqueTypes.length === 0) return null;

  return (
    <section
      data-testid="artifact-active-brands"
      className={`border-y border-white/10 bg-black/20 px-3 py-2.5 ${className}`}
      aria-label="Active Artifact brands"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/62">
          Active {uniqueTypes.length === 1 ? 'brand' : 'brands'}
        </span>
        <span className="text-[9px] tabular-nums text-white/38">
          {uniqueTypes.length}
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {uniqueTypes.map(type => {
          const meta = MARKER_META[type];
          const source = MARKER_SOURCE[type];
          return (
            <div
              key={type}
              className="grid min-w-0 grid-cols-[3px_minmax(0,1fr)] gap-2"
            >
              <span
                aria-hidden="true"
                className="h-full min-h-8 rounded-full"
                style={{
                  background: meta.text,
                  boxShadow: `0 0 8px ${meta.text}66`,
                }}
              />
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <span
                    className="text-[10px] font-black uppercase tracking-[0.11em]"
                    style={{ color: meta.text }}
                  >
                    {meta.label}
                  </span>
                  {source && (
                    <span className="text-[8px] uppercase tracking-[0.1em] text-white/34">
                      {source.lumName}
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-[10px] leading-snug text-white/72">
                  {meta.meaning}
                </p>
                <p className="mt-0.5 text-[9px] leading-snug text-white/42">
                  {meta.duration}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
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
          {/* Outer pulse ring — CSS replaces repeat:Infinity framer-motion loop */}
          <div
            className="absolute rounded-full armed-sigil-ring"
            style={{
              inset: -4,
              border: `1px solid ${color}`,
            }}
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
// top-left corner. Appears immediately when a burn is detected, holds long
// enough to read, then fades as the BurnFlash ramps up.
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
      initial={{ scale: 0.78, opacity: 0, y: 3 }}
      animate={{ scale: [0.78, 1.08, 1, 1, 0.94], opacity: [0, 1, 1, 1, 0], y: [3, 0, 0, -2, -9] }}
      transition={{ duration: 0.86, times: [0, 0.14, 0.58, 0.78, 1], ease: 'easeOut' }}
      onAnimationComplete={onDone}
      title={meta.label}
    >
      <motion.div
        className="animation-readable-pill text-[9px] font-black uppercase leading-none"
        style={{
          minHeight: 20,
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
        <span>{meta.label}</span>
      </motion.div>
    </motion.div>,
    document.body,
  );
}

// ── BurnFlash ─────────────────────────────────────────────────────────────────
// Reusable Burn keyword animation. Plays over the affected Forge slot and
// self-destructs after completion.  Renders as a document.body portal to
// escape overflow containers.
//
// ── CANONICAL BURN ANIMATION RULES (do not regress) ──────────────────────────
//
// Visual principle: the burn MUST stay crisp and readable throughout.
//   • The card burns progressively from bottom to top — the unburned upper
//     portion remains fully readable until the flame line reaches it.
//   • No blur effects of any kind: no motion blur, no Gaussian blur,
//     no smeared card image, no blurry dissolve, no hazy fade masking the card.
//   • Do not hide the card with blur, smoke layers, or overbright wash effects.
//
// Forbidden CSS/style properties inside BurnFlash (and any burn-adjacent layer):
//   filter: blur(...)
//   backdropFilter: blur(...)
//   WebkitFilter: blur(...)
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

// Burn timing constants (seconds) — synced to Burn.mp3 audible duration (~2.0 s).
export const BURN_START_S = 0.30;  // when the flame front begins rising
export const BURN_DUR_S   = 1.40;  // upward travel duration (300 → 1700 ms)

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

// Top-edge sparks — fire when the flame reaches the top of the card (~1700 ms).
const TOP_SPARKS = [
  { dx: -55, dy: -42, delay: 1.68 },
  { dx:  52, dy: -48, delay: 1.69 },
  { dx: -28, dy: -62, delay: 1.70 },
  { dx:  30, dy: -58, delay: 1.71 },
  { dx:   2, dy: -68, delay: 1.70 },
  { dx: -68, dy: -22, delay: 1.72 },
  { dx:  66, dy: -18, delay: 1.72 },
] as const;

// Ash arc fragments — scatter from the top of the consumed card (~1750 ms).
const ASH_ARCS = [
  { dx: -58, dy: -72, delay: 1.75, size: 5 },
  { dx:  62, dy: -68, delay: 1.77, size: 6 },
  { dx: -78, dy: -18, delay: 1.79, size: 4 },
  { dx:  74, dy:  -8, delay: 1.76, size: 5 },
  { dx: -42, dy: -82, delay: 1.81, size: 4 },
  { dx:  48, dy: -88, delay: 1.78, size: 6 },
  { dx: -22, dy: -98, delay: 1.80, size: 3 },
  { dx:  28, dy: -92, delay: 1.76, size: 4 },
] as const;

// Flame tongues — vertical flickering flame columns riding the flame edge.
const FLAME_TONGUES = [
  { xFrac: 0.15, h: 24, w: 10, delay: 0.30, dur: 0.28, rise: -18 },
  { xFrac: 0.35, h: 32, w: 12, delay: 0.36, dur: 0.32, rise: -26 },
  { xFrac: 0.55, h: 28, w: 11, delay: 0.32, dur: 0.30, rise: -22 },
  { xFrac: 0.75, h: 22, w:  9, delay: 0.38, dur: 0.26, rise: -16 },
  { xFrac: 0.50, h: 36, w: 14, delay: 0.42, dur: 0.34, rise: -30 },
  { xFrac: 0.25, h: 20, w:  8, delay: 0.46, dur: 0.24, rise: -14 },
  { xFrac: 0.65, h: 26, w: 10, delay: 0.50, dur: 0.28, rise: -20 },
  { xFrac: 0.85, h: 18, w:  8, delay: 0.54, dur: 0.22, rise: -12 },
] as const;

// Smoke wisps — rising grey clouds after the burn clears.
const SMOKE_WISPS = [
  { xFrac: 0.20, yFrac: 0.95, w: 28, h: 18, dur: 0.55, delay: 1.40, rise: -50, drift:  8 },
  { xFrac: 0.45, yFrac: 0.90, w: 34, h: 22, dur: 0.50, delay: 1.45, rise: -60, drift: -6 },
  { xFrac: 0.70, yFrac: 0.92, w: 26, h: 16, dur: 0.45, delay: 1.50, rise: -45, drift: 10 },
  { xFrac: 0.55, yFrac: 0.85, w: 30, h: 20, dur: 0.40, delay: 1.55, rise: -55, drift: -4 },
  { xFrac: 0.35, yFrac: 0.88, w: 22, h: 14, dur: 0.35, delay: 1.60, rise: -40, drift:  6 },
] as const;

// ── BurnFlash — CSS keyframe migration ───────────────────────────────────────
// All motion.div elements replaced with plain divs + CSS keyframe animations
// (see index.css @keyframes burn-*). CSS animations run on the compositor
// thread and are immune to React re-renders from WebSocket state updates,
// which previously interrupted the burn sequence mid-flight on mobile.
//
// React.memo + custom comparator prevents BurnFlash from re-rendering when
// game.tsx re-renders (onDone is a new arrow fn each render but is kept
// current via a sync-effect ref, so no re-render is needed for it to update).
//
// Mobile suppressions:
//   • Flame tongues (8 blending divs, 7-stop animation) — omitted.
//   • Smoke wisps (5 animated radial-gradient divs) — omitted.
export const BurnFlash = React.memo(function BurnFlash({
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
  useEffect(() => { onDoneRef.current = onDone; });
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 2000);
    return () => clearTimeout(t);
  }, []);

  const isMobile = useIsMobile();
  const cx   = slotRect.left + slotRect.width  / 2;
  const topY = slotRect.top;
  const ashDur  = `${(BURN_DUR_S + 0.45).toFixed(2)}s`;
  const edgeDur = `${(BURN_DUR_S + 0.04).toFixed(2)}s`;
  const edgeDel = `${(BURN_START_S - 0.02).toFixed(2)}s`;

  return createPortal(
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9995 }}>

      {/* ── Phase 1: Target claim — ember outline ring ── */}
      <div style={{
        position: 'absolute',
        left: slotRect.left - 3,
        top:  slotRect.top  - 3,
        width:  slotRect.width  + 6,
        height: slotRect.height + 6,
        borderRadius: 14,
        border: '2px solid #ff6820',
        boxShadow: '0 0 10px 3px #ff6820aa, inset 0 0 16px 2px #ff330044',
        animation: 'burn-target-ring 0.50s ease-out both',
      }} />

      {/* ── Phase 2: Bottom ignition — sharp ember glow at the bottom edge ── */}
      <div style={{
        position: 'absolute',
        left: slotRect.left + 4,
        top:  slotRect.bottom - 10,
        width:  slotRect.width - 8,
        height: 14,
        borderRadius: 4,
        background: 'linear-gradient(to top, #ff2200ee 0%, #ff8800cc 55%, #ffcc44aa 100%)',
        boxShadow: '0 0 14px 6px #ff550088',
        animation: 'burn-ignition 0.40s 0.20s ease-out both',
      }} />

      {/* ── Phase 3: Ash overlay — grows from bottom to top via scaleY ──
           transformOrigin 'bottom center' keeps the bottom edge anchored at
           slotRect.bottom while the top edge rises toward slotRect.top.
           This covers the burned-away portion; the card below is still
           visible above the flame line until the overlay reaches it.        ── */}
      <div style={{
        position: 'absolute',
        left: slotRect.left,
        top:  slotRect.top,
        width:  slotRect.width,
        height: slotRect.height,
        borderRadius: 12,
        background: 'linear-gradient(to top, #0a0400 0%, #180800 40%, #261000 75%, #341500 100%)',
        transformOrigin: 'bottom center',
        animation: `burn-ash-overlay ${ashDur} ${BURN_START_S}s both`,
      }} />

      {/* ── Phase 3: Flame edge line — rides at the top of the rising ash ──
           --burn-slot-h carries the card height so the keyframe can start
           the line at the bottom without a JS-driven translateY.            ── */}
      <div style={{
        position: 'absolute',
        left: slotRect.left - 2,
        top:  slotRect.top - 5,
        width:  slotRect.width + 4,
        height: 12,
        borderRadius: 3,
        background: 'linear-gradient(to top, #ff2200 0%, #ff8800 50%, #ffee44 100%)',
        boxShadow: '0 0 10px 5px #ff660099, 0 0 3px 2px #ffbb44cc',
        ['--burn-slot-h' as string]: `${slotRect.height}px`,
        animation: `burn-flame-edge ${edgeDur} ${edgeDel} linear both`,
      } as React.CSSProperties} />

      {/* ── Phase 3b: Flame tongues — suppressed on mobile (8 blending layers) ── */}
      {!isMobile && FLAME_TONGUES.map((f, i) => (
        <div
          key={`flame-${i}`}
          style={{
            position: 'absolute',
            left: slotRect.left + slotRect.width * f.xFrac - f.w / 2,
            top:  slotRect.bottom - f.h,
            width: f.w,
            height: f.h,
            borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%',
            background: 'linear-gradient(to top, rgba(255,34,0,0.85) 0%, rgba(255,136,0,0.6) 45%, rgba(255,238,68,0.25) 75%, transparent 100%)',
            transformOrigin: 'bottom center',
            mixBlendMode: 'screen',
            pointerEvents: 'none',
            ['--tongue-rise' as string]: `${f.rise}px`,
            animation: `burn-flame-tongue ${f.dur}s ${f.delay}s ease-in-out both`,
          } as React.CSSProperties}
        />
      ))}

      {/* ── Phase 3: Cinders — spawn at the flame front position and rise ── */}
      {CINDERS.map((c, i) => {
        const delay = BURN_START_S + (1 - c.yFrac) * BURN_DUR_S;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: slotRect.left + slotRect.width  * c.xFrac - c.size / 2,
              top:  slotRect.top  + slotRect.height * c.yFrac - c.size / 2,
              width:  c.size,
              height: c.size,
              borderRadius: i % 3 === 0 ? '50%' : 2,
              background: i % 2 === 0 ? '#ffaa44' : '#ff6622',
              ['--cinder-dx' as string]: `${c.dxPx}px`,
              ['--cinder-dy' as string]: `${-22 - (i % 3) * 8}px`,
              animation: `burn-cinder 0.36s ${delay.toFixed(2)}s ease-out both`,
            } as React.CSSProperties}
          />
        );
      })}

      {/* ── Phase 4: Top-edge spark burst — fires as the last of the card burns ── */}
      {TOP_SPARKS.map((s, i) => (
        <div
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
            ['--p-dx' as string]: `${s.dx}px`,
            ['--p-dy' as string]: `${s.dy}px`,
            animation: `burn-particle 0.32s ${s.delay}s cubic-bezier(0.2,0.6,0.4,0.9) both`,
          } as React.CSSProperties}
        />
      ))}

      {/* ── Phase 5: Ash arc fragments scatter from the top of the consumed card ── */}
      {ASH_ARCS.map((f, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: cx - f.size / 2,
            top:  topY,
            width:  f.size,
            height: f.size,
            borderRadius: i % 2 === 0 ? '50%' : 2,
            background: i % 3 === 0 ? '#cc5500' : i % 3 === 1 ? '#ff8833' : '#6a5a4a',
            ['--p-dx' as string]: `${f.dx}px`,
            ['--p-dy' as string]: `${f.dy}px`,
            animation: `burn-particle 0.40s ${f.delay}s cubic-bezier(0.25,0.46,0.45,0.94) both`,
          } as React.CSSProperties}
        />
      ))}

      {/* ── Phase 6: Smoke wisps — suppressed on mobile ── */}
      {!isMobile && SMOKE_WISPS.map((s, i) => (
        <div
          key={`smoke-${i}`}
          style={{
            position: 'absolute',
            left: slotRect.left + slotRect.width * s.xFrac - s.w / 2,
            top:  slotRect.top  + slotRect.height * s.yFrac,
            width: s.w,
            height: s.h,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse at 50% 50%, rgba(80,80,80,0.35) 0%, rgba(60,60,60,0.20) 50%, transparent 80%)',
            transformOrigin: 'center bottom',
            pointerEvents: 'none',
            ['--smoke-drift' as string]: `${s.drift}px`,
            ['--smoke-rise' as string]: `${s.rise}px`,
            animation: `burn-smoke-wisp ${s.dur}s ${s.delay}s ease-out both`,
          } as React.CSSProperties}
        />
      ))}

      {/* ── Phase 7: Scorch residue — brief dark char on the empty slot ── */}
      <div style={{
        position: 'absolute',
        left: slotRect.left,
        top:  slotRect.top,
        width:  slotRect.width,
        height: slotRect.height,
        borderRadius: 12,
        background: 'radial-gradient(ellipse at 50% 65%, rgba(50,15,0,0.50) 0%, rgba(18,5,0,0.30) 55%, transparent 82%)',
        border: '1px solid rgba(90,28,0,0.26)',
        animation: 'burn-scorch 0.40s 1.60s ease-out both',
      }} />
    </div>,
    document.body,
  );
}, (prev, next) =>
  // Skip re-render if slot geometry and luminary source haven't changed.
  // onDone updates are captured by the sync-effect above — no re-render needed.
  prev.slotRect === next.slotRect && prev.sourceLuminaryId === next.sourceLuminaryId,
);

// ── DelayedEffectFloat ────────────────────────────────────────────────────────
// Floating "+N◆" that rises from a Luminary portal when a delayed effect fires
// (Mandala, Bloom, Orchard, Seed).
// Renders as a document.body portal.  Self-destructs after animation completes.

export function DelayedEffectFloat({
  amount,
  color,
  label = 'Eminence',
  originRect,
  onDone,
}: {
  amount: number;
  color: string;
  label?: string;
  originRect: DOMRect;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), 2350);
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
      animate={{ y: -92, opacity: [0, 1, 1, 0], scale: [0.5, 1.15, 1.05, 0.86] }}
      transition={{ duration: 2.05, ease: 'easeOut', times: [0, 0.1, 0.78, 1] }}
    >
      <span
        className="animation-readable-pill font-serif flex-col"
        style={{
          fontWeight: 900,
          fontSize: 22,
          lineHeight: 1,
          color: color,
          borderColor: `${color}aa`,
          boxShadow: `0 0 0 1px rgba(0,0,0,0.76), 0 8px 18px rgba(0,0,0,0.58), 0 0 24px ${color}66`,
          textShadow: `0 1px 2px rgba(0,0,0,1), 0 0 18px ${color}cc, 0 0 8px ${color}88`,
          whiteSpace: 'nowrap',
        }}
      >
        <span>+{amount}</span>
        <span
          style={{
            marginTop: 3,
            fontFamily: 'var(--app-font-sans)',
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.82)',
          }}
        >
          {label}
        </span>
      </span>
    </motion.div>,
    document.body,
  );
}

// ── LuminaryEminenceBurst ────────────────────────────────────────────────────
// Epic Eminence-impact flourish after a Luminary arrival resolves: power blooms
// from the claimed portal, travels to the claimant's Eminence readout, and lands
// with a ceremonial seal.

type BurstRect = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;

export function LuminaryEminenceBurst({
  amount,
  color,
  secondaryColor,
  luminaryName,
  playerName,
  originRect,
  targetRect,
  reducedMotion = false,
  onDone,
}: {
  amount: number;
  color: string;
  secondaryColor?: string;
  luminaryName: string;
  playerName: string;
  originRect?: BurstRect | null;
  targetRect?: BurstRect | null;
  reducedMotion?: boolean;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);
  const gradientIdRef = useRef(`lum-eminence-burst-${Math.floor(Math.random() * 1_000_000)}`);

  useEffect(() => {
    const t = setTimeout(() => onDoneRef.current(), reducedMotion ? 980 : 2200);
    return () => clearTimeout(t);
  }, [reducedMotion]);

  if (typeof document === 'undefined' || typeof window === 'undefined' || amount <= 0) return null;

  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const source = originRect
    ? { x: originRect.left + originRect.width / 2, y: originRect.top + originRect.height / 2 }
    : { x: vw / 2, y: vh * 0.34 };
  const target = targetRect
    ? { x: targetRect.left + targetRect.width / 2, y: targetRect.top + targetRect.height / 2 }
    : { x: vw / 2, y: Math.min(vh - 96, vh * 0.78) };
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const controlA = { x: source.x + dx * 0.25, y: source.y + dy * 0.08 - 120 };
  const controlB = { x: source.x + dx * 0.72, y: source.y + dy * 0.92 - 80 };
  const mid = {
    x: source.x + dx * 0.5,
    y: Math.max(72, Math.min(vh - 128, source.y + dy * 0.42 - 58)),
  };
  const glow = secondaryColor ?? color;
  const burstSize = reducedMotion ? 130 : 210;

  return createPortal(
    <motion.div
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: 9997, isolation: 'isolate' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: reducedMotion ? 0.9 : 2.05, times: [0, 0.08, 0.78, 1], ease: 'easeOut' }}
    >
      <motion.div
        className="absolute rounded-full"
        style={{
          left: source.x,
          top: source.y,
          width: burstSize,
          height: burstSize,
          translateX: '-50%',
          translateY: '-50%',
          background: `radial-gradient(circle, rgba(255,255,255,0.88) 0 4%, ${glow}aa 10%, ${color}55 30%, transparent 70%)`,
          boxShadow: `0 0 48px ${glow}99, 0 0 110px ${color}44`,
        }}
        initial={{ scale: 0.15, opacity: 0 }}
        animate={reducedMotion ? { scale: [0.35, 1.1, 0.92], opacity: [0, 0.8, 0] } : { scale: [0.15, 1.28, 0.9], opacity: [0, 1, 0] }}
        transition={{ duration: reducedMotion ? 0.8 : 1.35, ease: [0.16, 1, 0.3, 1] }}
      />

      {!reducedMotion && (
        <svg className="absolute inset-0 w-full h-full overflow-visible">
          <defs>
            <linearGradient id={gradientIdRef.current} x1={source.x} y1={source.y} x2={target.x} y2={target.y} gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#fff7cf" />
              <stop offset="0.42" stopColor={glow} />
              <stop offset="1" stopColor={color} />
            </linearGradient>
          </defs>
          {[-18, -10, 0, 11, 19].map((offset, index) => {
            const jitterPath = `M ${source.x + offset * 0.2} ${source.y + offset} C ${controlA.x - offset * 1.5} ${controlA.y + offset * 0.7}, ${controlB.x + offset * 1.2} ${controlB.y - offset * 0.6}, ${target.x + offset * 0.12} ${target.y + offset * 0.25}`;
            return (
              <motion.path
                key={offset}
                d={jitterPath}
                fill="none"
                stroke={index === 2 ? `url(#${gradientIdRef.current})` : glow}
                strokeWidth={index === 2 ? 4.2 : 1.6}
                strokeLinecap="round"
                pathLength={1}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: [0, 1, 1], opacity: [0, index === 2 ? 0.95 : 0.46, 0] }}
                transition={{ duration: 1.16, delay: 0.18 + index * 0.045, times: [0, 0.68, 1], ease: 'easeInOut' }}
                style={{ filter: `drop-shadow(0 0 ${index === 2 ? 16 : 8}px ${glow})` }}
              />
            );
          })}
        </svg>
      )}

      {!reducedMotion && [0, 1, 2, 3, 4].map((i) => {
        const drift = (i - 2) * 14;
        const lift = i % 2 === 0 ? -64 : -112;
        return (
          <motion.div
            key={`head-${i}`}
            className="absolute rounded-full"
            style={{
              left: source.x,
              top: source.y,
              width: i === 2 ? 11 : 7,
              height: i === 2 ? 11 : 7,
              translateX: '-50%',
              translateY: '-50%',
              background: i === 2 ? '#fff7d6' : glow,
              boxShadow: `0 0 14px 5px ${glow}, 0 0 26px 8px ${color}77`,
            }}
            initial={{ opacity: 0, scale: 0.35, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0.35, 1.35, 1.08, 0.35],
              x: [0, dx * 0.34 + drift, dx * 0.74 - drift * 0.35, dx],
              y: [0, dy * 0.18 + lift, dy * 0.72 + lift * 0.35, dy],
            }}
            transition={{
              duration: 1.12,
              delay: 0.22 + i * 0.075,
              times: [0, 0.2, 0.78, 1],
              ease: 'easeInOut',
            }}
          />
        );
      })}

      <motion.div
        className="absolute flex flex-col items-center text-center"
        style={{
          left: mid.x,
          top: mid.y,
          translateX: '-50%',
          translateY: '-50%',
          minWidth: 180,
          maxWidth: 300,
        }}
        initial={{ opacity: 0, scale: 0.58, y: 18 }}
        animate={{ opacity: [0, 1, 1, 0], scale: [0.58, 1.1, 1, 0.82], y: [18, -4, -12, -26] }}
        transition={{ duration: reducedMotion ? 0.9 : 1.65, delay: reducedMotion ? 0.08 : 0.32, times: [0, 0.18, 0.76, 1], ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="animation-readable-pill relative flex-col px-5 py-3"
          style={{
            borderRadius: 10,
            border: `1px solid ${glow}aa`,
            background: `radial-gradient(circle at 50% 0%, ${glow}38, transparent 62%), rgba(7, 6, 13, 0.96)`,
            boxShadow: `0 0 0 1px rgba(0,0,0,0.82), 0 10px 26px rgba(0,0,0,0.64), 0 0 38px ${glow}7a, inset 0 0 32px ${color}1f`,
          }}
        >
          <motion.div
            className="absolute inset-0"
            style={{
              borderRadius: 10,
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)`,
              mixBlendMode: 'screen',
            }}
            initial={{ x: '-115%', opacity: 0 }}
            animate={{ x: ['-115%', '115%'], opacity: [0, 0.78, 0] }}
            transition={{ duration: reducedMotion ? 0.55 : 0.9, delay: reducedMotion ? 0.12 : 0.45, ease: 'easeOut' }}
          />
          <div
            className="animation-readable-text"
            style={{
              color: '#fff4c5',
              fontFamily: 'Georgia, serif',
              fontWeight: 900,
              fontSize: 'clamp(1.9rem, 7vw, 3.9rem)',
              letterSpacing: '0.02em',
              lineHeight: 0.92,
              textShadow: `0 2px 2px rgba(0,0,0,1), 0 0 28px ${glow}, 0 0 14px rgba(0,0,0,0.92)`,
            }}
          >
            +{amount}
          </div>
          <div
            className="animation-readable-text"
            style={{
              color: '#fff7d6',
              fontSize: 11,
              fontWeight: 900,
              letterSpacing: '0.18em',
              lineHeight: 1,
              marginTop: 5,
              textTransform: 'uppercase',
              textShadow: `0 1px 2px rgba(0,0,0,1), 0 0 12px ${glow}`,
            }}
          >
            Eminence
          </div>
          <div
            style={{
              color: 'rgba(255,255,255,0.82)',
              fontSize: 10,
              fontWeight: 700,
              marginTop: 7,
              textShadow: '0 1px 2px rgba(0,0,0,1)',
              maxWidth: 240,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {playerName} drew {luminaryName}
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute rounded-full"
        style={{
          left: target.x,
          top: target.y,
          width: 86,
          height: 86,
          translateX: '-50%',
          translateY: '-50%',
          border: `2px solid ${glow}`,
          boxShadow: `0 0 28px ${glow}, inset 0 0 24px ${color}66`,
        }}
        initial={{ scale: 0.25, opacity: 0 }}
        animate={{ scale: [0.25, 1.4, 2.15], opacity: [0, 1, 0] }}
        transition={{ duration: reducedMotion ? 0.7 : 0.95, delay: reducedMotion ? 0.26 : 1.18, ease: 'easeOut' }}
      />
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
// A small charred Artifact fragment that flies from the burned Forge slot
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

// ── ArchiveReturnParticle ────────────────────────────────────────────────────
// Eternal Recurrence keeps the full Artifact identity visible as it travels
// from a burned Forge slot into the matching Archive.

export function ArchiveReturnParticle({
  cardId,
  from,
  to,
  onDone,
}: {
  cardId: string;
  from: DOMRect;
  to: DOMRect;
  onDone: () => void;
}) {
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    const timer = setTimeout(() => onDoneRef.current(), 980);
    return () => clearTimeout(timer);
  }, []);

  const x0 = from.left + from.width / 2;
  const y0 = from.top + from.height / 2;
  const x1 = to.left + to.width / 2;
  const y1 = to.top + to.height / 2;
  const mx = (x0 + x1) / 2;
  const my = Math.min(y0, y1) - 64;

  return createPortal(
    <motion.div
      style={{
        position: 'fixed',
        left: x0 - 18,
        top: y0 - 25,
        width: 36,
        height: 50,
        overflow: 'hidden',
        borderRadius: 3,
        border: '1px solid rgba(191,219,254,0.85)',
        background: '#050914',
        boxShadow: '0 0 15px rgba(61,107,255,0.72), 0 0 8px rgba(244,63,94,0.5)',
        pointerEvents: 'none',
        zIndex: 9995,
        transformStyle: 'preserve-3d',
      }}
      animate={{
        left: [x0 - 18, mx - 18, x1 - 18],
        top: [y0 - 25, my - 25, y1 - 25],
        rotateY: [0, 35, 88],
        rotateZ: [0, -9, 0],
        scale: [0.82, 1, 0.25],
        opacity: [0.95, 1, 0],
        filter: [
          'brightness(0.78) saturate(0.72)',
          'brightness(1.22) saturate(1.08)',
          'brightness(1.7) saturate(0.75)',
        ],
      }}
      transition={{ duration: 0.82, ease: [0.22, 0.72, 0.18, 1] }}
    >
      {CARD_ART[cardId] && (
        <img src={CARD_ART[cardId]} alt="" className="h-full w-full object-cover" draggable={false} />
      )}
      <span
        className="absolute inset-0"
        style={{ background: 'linear-gradient(135deg, rgba(244,63,94,0.16), transparent 44%, rgba(61,107,255,0.34))' }}
      />
    </motion.div>,
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

// ── ArrivalEffectOverlay ──────────────────────────────────────────────────────
// Per-Luminary full-viewport overlay that fires when that Luminary arrives.
// Layered above the board but below any modal.
// Each lumId maps to a distinct visual treatment.

export function ArrivalEffectOverlay({
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
  if (lumId === 'lum_void') return createPortal(<VoidWardenFx />, document.body);
  if (lumId === 'lum_hunger') return createPortal(<FirstHungerFx />, document.body);
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

// Forgotten Hour — digital scan-line glitch across the Forge
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
              ? 'linear-gradient(90deg, transparent 0%, #1e40afcc 20%, #93c5fdee 50%, #1e40afcc 80%, transparent 100%)'
              : 'linear-gradient(90deg, transparent 0%, #2563ebcc 25%, #bfdbfddd 50%, #2563ebcc 75%, transparent 100%)',
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

// Tide Architect — left-to-right revelation wave across all three Archives.
// Continuum/Continuum palette: deep blue, ice-blue, cool cyan.
// A vertical sweep bar travels left to right across the Forge; as it passes each
// column a brief flip-shimmer panel lights up, suggesting Archive tops becoming
// visible to the allied player. Prismatic glints fire at each reveal point.
// Total duration: ~2.0 s.
const SCRY_COLS = 8 as const; // 4 Tier-III + 4 Tier-II columns
function TideScryFx() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 69 }}>

      {/* Ambient Continuum glow across the Forge band. */}
      <motion.div
        style={{
          position: 'fixed',
          top: '30%', left: '50%',
          translateX: '-50%', translateY: '-50%',
          width: '85vw', height: '28vh',
          borderRadius: '50%',
          background:
            'radial-gradient(ellipse, #1e3a8a55 0%, #1d4ed866 30%, #0ea5e933 58%, transparent 78%)',
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

      {/* Trailing Continuum edge line briefly outlines the Forge. */}
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

// Void Warden — dark implosion collapse, all light draining inward
function VoidWardenFx() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 69 }}>
      {/* Central void implosion glow */}
      <motion.div
        style={{
          position: 'fixed',
          top: '40%', left: '50%',
          translateX: '-50%', translateY: '-50%',
          width: '50vw', height: '50vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #2e1065 0%, #4c1d95 25%, #0a0a14 60%, transparent 78%)',
          pointerEvents: 'none',
          zIndex: 69,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.2, 0.6, 0], opacity: [0, 0.85, 0.7, 0] }}
        transition={{ duration: 2.0, times: [0, 0.22, 0.55, 1], ease: 'easeInOut' }}
      />
      {/* Collapse ring — dark violet border that snaps inward */}
      <motion.div
        style={{
          position: 'fixed',
          top: '40%', left: '50%',
          translateX: '-50%', translateY: '-50%',
          borderRadius: '50%',
          border: '2px solid #6b21a8',
          boxShadow: '0 0 20px 6px #4c1d9544',
          pointerEvents: 'none',
          zIndex: 69,
        }}
        initial={{ width: '60vw', height: '60vw', opacity: 0.9 }}
        animate={{ width: '10vw', height: '10vw', opacity: 0 }}
        transition={{ duration: 1.6, ease: 'easeIn' }}
      />
      {/* 4 corner drains — dark particles being pulled toward center */}
      {[
        { x: '10%', y: '10%' },
        { x: '90%', y: '10%' },
        { x: '10%', y: '90%' },
        { x: '90%', y: '90%' },
      ].map((pos, i) => (
        <motion.div
          key={i}
          style={{
            position: 'fixed',
            left: pos.x, top: pos.y,
            width: 6, height: 6,
            borderRadius: '50%',
            background: '#a855f7',
            boxShadow: '0 0 8px 3px #7e22ce66',
            pointerEvents: 'none',
            zIndex: 70,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            x: ['0vw', `${(50 - parseInt(pos.x)) * 0.8}vw`],
            y: ['0vh', `${(40 - parseInt(pos.y)) * 0.8}vh`],
            opacity: [0, 0.8, 0],
            scale: [0, 1.2, 0.3],
          }}
          transition={{ duration: 1.4, delay: i * 0.08, ease: 'easeInOut' }}
        />
      ))}
    </div>
  );
}

// Final Hunger — golden maw / consumption vortex, card being devoured
function FirstHungerFx() {
  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 69 }}>
      {/* Warm amber core glow — the "maw" */}
      <motion.div
        style={{
          position: 'fixed',
          top: '45%', left: '50%',
          translateX: '-50%', translateY: '-50%',
          width: '30vw', height: '30vw',
          borderRadius: '50%',
          background: 'radial-gradient(circle, #fbbf2488 0%, #f59e0b55 35%, #92400e22 60%, transparent 75%)',
          pointerEvents: 'none',
          zIndex: 69,
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.1, 0.9, 0], opacity: [0, 0.85, 0.6, 0] }}
        transition={{ duration: 1.8, times: [0, 0.2, 0.55, 1], ease: 'easeOut' }}
      />
      {/* Swirling teeth-like arcs */}
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          style={{
            position: 'fixed',
            top: '45%', left: '50%',
            translateX: '-50%', translateY: '-50%',
            width: 80 + i * 60,
            height: 80 + i * 60,
            borderRadius: '50%',
            border: '2px solid #fbbf24',
            borderBottomColor: 'transparent',
            borderLeftColor: 'transparent',
            pointerEvents: 'none',
            zIndex: 69,
          }}
          initial={{ opacity: 0, rotate: i * 40 }}
          animate={{ opacity: [0, 0.75, 0.5, 0], rotate: [i * 40, i * 40 + 180] }}
          transition={{ duration: 1.6, delay: i * 0.12, ease: 'easeOut' }}
        />
      ))}
      {/* Particle embers being sucked inward */}
      {Array.from({ length: 8 }).map((_, i) => {
        const angle = (i / 8) * Math.PI * 2;
        const startR = 35;
        const endR = 4;
        return (
          <motion.div
            key={i}
            style={{
              position: 'fixed',
              top: '45%', left: '50%',
              width: 3,
              height: 3,
              borderRadius: '50%',
              background: '#fbbf24',
              boxShadow: '0 0 6px 2px #f59e0b66',
              pointerEvents: 'none',
              zIndex: 70,
            }}
            initial={{
              x: Math.cos(angle) * startR + 'vw',
              y: Math.sin(angle) * startR + 'vh',
              opacity: 0,
            }}
            animate={{
              x: Math.cos(angle) * endR + 'vw',
              y: Math.sin(angle) * endR + 'vh',
              opacity: [0, 0.9, 0],
            }}
            transition={{ duration: 1.3, delay: i * 0.06, ease: 'easeIn' }}
          />
        );
      })}
    </div>
  );
}
