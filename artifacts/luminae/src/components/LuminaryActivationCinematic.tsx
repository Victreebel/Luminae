import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Easing } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getLuminaryVisuals, getLuminaryImageAssets, RadiantLivingEntityComposite } from '@/lib/luminaryAssets';
import { gameAudio } from '@/lib/audio';
import {
  LUMINARY_EFFECT_MAP,
  TargetBadge,
  ConsequenceSnap,
} from '@/components/LuminaryEffectOverlay';
import type { AnimationProcedureStep } from '@/lib/animationProcedure';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Types ────────────────────────────────────────────────────────────────────

// anticipate → reveal → hold → pan_out → done
type Phase = 'anticipate' | 'reveal' | 'hold' | 'pan_out' | 'done';

// Internal beat sequence that fires during the hold phase.
// beat 1: target — target claim badge appears
// beat 2: snap   — consequence flash fires once then fades
type EffectBeat = 'idle' | 'target' | 'snap' | 'done';

interface LuminaryActivationCinematicProps {
  luminaryId: string;
  effectType: 'summon' | 'end_of_turn' | 'start_of_turn';
  luminaryName: string;
  triggeringPlayerName?: string;
  /** Optional resolved animation procedure — drives the ProcedureStrip. */
  procedure?: AnimationProcedureStep[];
  /**
   * When true (abridgedAnims setting), use the compact 380ms reduced-motion
   * overlay instead of the full 1860ms cinematic. System prefers-reduced-motion
   * is checked independently inside the component and also triggers this path.
   */
  reducedMotion?: boolean;
  /**
   * Called when the cinematic ends (normally or via skip).
   * `skipped` is true when the player held-to-skip or the reduced-motion timer
   * completed early — callers should bypass any exit animations in that case.
   */
  onComplete: (skipped?: boolean) => void;
}

// ─── ProcedureStrip ───────────────────────────────────────────────────────────
// Compact ordered strip of step pills, shown during the HOLD phase when a
// resolved procedure is available.  Replaces the generic TargetBadge.

interface StepInfo { icon: string; label: string; color: string; }

function stepInfo(step: AnimationProcedureStep): StepInfo | null {
  switch (step.type) {
    case 'luminaryPulse': return null;
    case 'targetClaim': {
      // Keyword-bearing claims signal pre-targeting (warn before the keyword fires).
      // Keyword-free claims signal the actual resolution beat (lock-in, copy, etc.).
      // This distinction makes "TARGET → BURN → CLAIM" legible in Phoenix Paradox,
      // Iron Harbinger, Red Moth (burn pre-tint vs. survivor lock-in) and Ember
      // Sovereign (condemned mark vs. later burn sequence).
      if (step.keyword === 'burn')
        return { icon: '⬡', label: 'TARGET', color: '#fca5a5' };
      if (step.keyword === 'condemned')
        return { icon: '⬡', label: 'MARK',   color: '#fca5a5' };
      return { icon: '⬡', label: 'CLAIM', color: '#e2e8f0' };
    }
    case 'keywordEvent':
      if (step.keyword === 'burn')
        return { icon: '🔥', label: 'BURN', color: '#ef4444' };
      return { icon: '◎', label: step.keyword.toUpperCase(), color: '#6366f1' };
    case 'keywordEvents': {
      const first = step.events[0];
      if (!first) return null;
      if (first.keyword === 'burn')
        return { icon: '🔥', label: 'BURN', color: '#ef4444' };
      return { icon: '◎', label: first.keyword.toUpperCase(), color: '#6366f1' };
    }
    case 'residue': {
      const m: Record<string, StepInfo> = {
        condemned: { icon: '⚑', label: 'CONDEMNED', color: '#ef4444' },
        forgotten: { icon: '◎', label: 'FORGOTTEN',  color: '#6366f1' },
        nullified: { icon: '✕', label: 'NULLIFIED',  color: '#94a3b8' },
        seeded:    { icon: '⁕', label: 'SEEDED',     color: '#22c55e' },
      };
      return m[step.keyword] ?? { icon: '◎', label: step.keyword.toUpperCase(), color: '#94a3b8' };
    }
    case 'marketRedraw':  return { icon: '↺', label: 'REFRESH',    color: '#94a3b8' };
    case 'scoreChange': {
      const sign = step.amount >= 0 ? '+' : '';
      const color = step.amount >= 0 ? '#fbbf24' : '#ef4444';
      // "ALL" suffix when more than one player is affected — makes global effects legible.
      const scope = step.playerIds.length > 1 ? ' ALL' : '';
      return { icon: '◆', label: `${sign}${step.amount} EMN${scope}`, color };
    }
    case 'crystalReturn': {
      // Mirror the scoreChange "ALL" scope indicator — Pale Merchant targets all players.
      const scope = step.playerIds.length > 1 ? ' ALL' : '';
      return { icon: '◇', label: `RETURN${scope}`, color: '#60a5fa' };
    }
    case 'deckScry':      return { icon: '◉', label: 'SCRY',       color: '#a78bfa' };
    case 'pendingAction': return { icon: '✦', label: 'ASSIMILATE', color: '#fb923c' };
    case 'reveal': {
      const tierLabel = step.tier ? `T${step.tier}` : '';
      const scope = step.cardIds.length > 1 ? ` ${step.cardIds.length}` : '';
      return { icon: '◉', label: `REVEAL${scope} ${tierLabel}`.trim(), color: '#fbbf24' };
    }
    default:              return null;
  }
}

function ProcedureStrip({ procedure }: { procedure: AnimationProcedureStep[] }) {
  const visible = procedure.filter(s => s.type !== 'luminaryPulse');
  if (visible.length === 0) return null;
  return (
    <motion.div
      className="flex items-center gap-1 flex-wrap justify-center"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.38, ease: 'easeOut' }}
    >
      {visible.map((step, i) => {
        const info = stepInfo(step);
        if (!info) return null;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <span style={{ color: 'rgba(255,255,255,0.22)', fontSize: 8 }}>→</span>
            )}
            <div
              style={{
                padding: '2px 7px',
                borderRadius: 99,
                fontSize: 8,
                fontWeight: 700,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                color: info.color,
                background: `${info.color}18`,
                border: `1px solid ${info.color}38`,
                backdropFilter: 'blur(4px)',
              }}
            >
              {info.icon} {info.label}
            </div>
          </React.Fragment>
        );
      })}
    </motion.div>
  );
}

// ─── Timing ───────────────────────────────────────────────────────────────────
//
// Full variant — Total: 1860ms
//
// 0.00s–0.15s  ANTICIPATE  board dims, anticipation pulse — no entity yet
// 0.15s–0.75s  REVEAL      entity grows + fades in gradually (opacity 0→1, scale 0.85→1.0)
// 0.75s–1.30s  HOLD        peak bloom + effect beats fire (opacity 1.0, short linger)
// 1.30s–1.98s  PAN_OUT     dissolve outward (opacity 1.0→0.75→0, scale →1.12)
//
// Reduced-motion variant — Total: 380ms
//
// 0ms  Compact overlay appears immediately (no entity, no board zoom)
//      Shows ProcedureStrip + Luminary name + effect label.
//      Single click dismisses. Auto-completes at 380ms.

const ANTICIPATE_MS = 150;   // 0.00–0.15s
export const REVEAL_MS     = 400;   // 0.15–0.55s  — fast fade-in
export const HOLD_MS       = 550;   // 0.55–1.10s
export const PAN_OUT_MS    = 860;   // 1.10–1.96s  — lingering fade-out
// Total: 1960ms

// Reduced-motion / abridged: compact overlay duration
const REDUCED_HOLD_MS = 380;

// Hold-to-skip duration in ms (full-motion mode only)
const HOLD_TO_SKIP_MS = 350;

// ── Entity keyframe animation ─────────────────────────────────────────────────
// The entity runs a single continuous framer-motion keyframe sequence from mount
// (at ANTICIPATE_MS) through the end of PAN_OUT.  No phase-driven transitions.
//
// Duration: REVEAL_MS + HOLD_MS + PAN_OUT_MS = 1810ms
//
// Opacity spec:     0% → 35% → 75% → 100% → 100% → 0%
// Scale spec:    0.82 → 0.88 → 0.94 → 1.00 → 1.00 → 1.12
//
// Fast fade-in: entity reaches 100% in ~400ms.
// Lingering fade-out: 860ms.
// Normalized [0,1]: 0.000  0.072  0.135  0.180  0.224  1.000
//
// Timing budget — do not regress:
//   ENTITY_DUR_MS = REVEAL_MS + HOLD_MS + PAN_OUT_MS = 400 + 550 + 860 = 1810ms
//   HOLD phase starts at REVEAL_MS = 400ms into entity animation.
//   BEAT_TARGET_MS = 150ms fires 150ms after hold start:
//     beat_ms = REVEAL_MS + BEAT_TARGET_MS = 400 + 150 = 550ms (t_norm ≈ 0.304)
//   The settle keyframe (Y=0vh, index 4) must complete ≥100ms before that beat:
//     settle_ms ≤ beat_ms − 100 = 550 − 100 = 450ms  →  t_norm ≤ 0.249
//   Current settle: t=0.248 → settleMs = 0.248 × 1810 = ~449ms  buffer = 101ms ✓
//   Never push index[4] above t=0.249; doing so breaks this 100ms guard.
//   Overshoot (index 3) at t=0.200 (362ms), settle at t=0.248 (449ms):
//     spring-back window = 449 − 362 = ~87ms → visible arch-back motion.
//   The intermediate keyframes (index[1]=0.088, index[2]=0.175) give the entity
//   enough time in the shadowy descent phase that the dip reads clearly.

const ENTITY_DUR_S = (REVEAL_MS + HOLD_MS + PAN_OUT_MS) / 1000; // 1.81

// Steeper fade-in: entity materialises quickly from nothing.
const ENTITY_OPACITY = [0,    0.35, 0.75, 1.0,  1.0,  0   ];
const ENTITY_SCALE   = [0.82, 0.88, 0.94, 1.00, 1.00, 1.12];
export const ENTITY_TIMES   = [0, 0.088, 0.175, 0.200, 0.248, 1];

// Desktop: wide descent + overshoot — entity falls from 30vh above, overshoots
// 10vh below center, then springs back to rest at 0vh before pan-out.
// Overshoot is 10vh so the downward dip and spring-back arch are clearly visible.
const ENTITY_Y_DESKTOP = ['-30vh', '-18vh', '-8vh', '10vh', '0vh', '3vh'];
// Mobile: reduced travel and softer overshoot for smaller screens.
const ENTITY_Y_MOBILE  = ['-15vh', '-9vh',  '-4vh', '5vh',  '0vh', '3vh'];

// Per-property easing for the Y channel: easeIn on the fall segments so the
// entity accelerates into the overshoot, then easeOut on the spring-back segment.
// The final pan-out segment keeps easeInOut.
const ENTITY_Y_EASE: Easing[] = ['easeIn', 'easeIn', 'easeOut', 'easeOut', 'easeInOut'];

// ── Silhouette veil filter ─────────────────────────────────────────────────────
// Crisp dark silhouette: brightness/saturation only — no blur so the entity reads
// as a recognisable shadowy figure moving through space, not a misty dissolve.
// Filter values are now owned by the CSS keyframe `lum-entity-reveal` in index.css
// (replaced framer-motion filter animation to keep GPU filter changes off the JS
// thread). The percentages in that keyframe MUST stay in sync with ENTITY_TIMES.
// Index[3] and index[4] must match ENTITY_TIMES[3]/[4] — keep all three in sync.
export const ENTITY_FILTER_TIMES = [0, 0.088, 0.175, 0.200, 0.248, 1];

// ── Effect beats (within HOLD_MS = 550ms window) ──────────────────────────────
// All offsets are absolute from hold-phase start.  All must complete before HOLD_MS expires.
export const BEAT_TARGET_MS = 150;
export const BEAT_SNAP_MS   = 300;
export const BEAT_DONE_MS   = 460;

// CSS scale applied to [data-game-board] during the cinematic.
// 0.62 keeps the board legible so players can identify target cards.
const BOARD_SCALE = 0.62;

// ─── Effect-type labels ───────────────────────────────────────────────────────

const EFFECT_TYPE_LABELS: Record<string, string> = {
  summon:        'ARRIVAL EFFECT',
  end_of_turn:   'END OF TURN EFFECT',
  start_of_turn: 'START OF TURN EFFECT',
};

// ─── Skip progress ring ───────────────────────────────────────────────────────

const RING_RADIUS = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface SkipRingProps {
  progress: number; // 0–1
  color: string;
}

function SkipRing({ progress, color }: SkipRingProps) {
  const offset = RING_CIRCUMFERENCE * (1 - progress);
  return (
    <svg
      width={40}
      height={40}
      viewBox="0 0 40 40"
      style={{ display: 'block', transform: 'rotate(-90deg)' }}
    >
      {/* Track */}
      <circle
        cx={20}
        cy={20}
        r={RING_RADIUS}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={2.5}
      />
      {/* Fill arc */}
      <circle
        cx={20}
        cy={20}
        r={RING_RADIUS}
        fill="none"
        stroke={progress > 0 ? color : 'rgba(255,255,255,0.35)'}
        strokeWidth={2.5}
        strokeDasharray={RING_CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 30ms linear, stroke 150ms ease' }}
      />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LuminaryActivationCinematic({
  luminaryId,
  effectType,
  luminaryName,
  triggeringPlayerName,
  procedure,
  reducedMotion: reducedMotionProp,
  onComplete,
}: LuminaryActivationCinematicProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Respect system prefers-reduced-motion OR the caller's abridgedAnims flag.
  const systemPrefersReduced = useReducedMotion();
  const isReduced = reducedMotionProp || !!systemPrefersReduced;

  const isMobile = useIsMobile();
  const entityY = isMobile ? ENTITY_Y_MOBILE : ENTITY_Y_DESKTOP;
  const entityYInitial = isMobile ? ENTITY_Y_MOBILE[0] : ENTITY_Y_DESKTOP[0];

  // Shared completed flag — readable by both the timer chain cleanup and the
  // skip handler.  Using a ref avoids stale-closure issues.
  const completedRef = useRef(false);

  // Timer handles held in refs so the skip handler can cancel them without
  // needing access to the useEffect closure.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [phase, setPhase] = useState<Phase>('anticipate');
  const [effectBeat, setEffectBeat] = useState<EffectBeat>('idle');

  // ── Hold-to-skip state (full-motion mode only) ─────────────────────────────
  const [holdProgress, setHoldProgress] = useState(0); // 0–1
  const holdStartRef = useRef<number | null>(null);
  const holdRafRef   = useRef<number | null>(null);

  const vis = getLuminaryVisuals(luminaryId);
  const { primaryColor, EntityArt, entityBlendMode } = vis;
  const { entityCutout, panelArt } = getLuminaryImageAssets(luminaryId);

  // Best available image: transparent entity cutout > panel art > EntityArt component
  const imageUrl = entityCutout ?? panelArt;

  const label = EFFECT_TYPE_LABELS[effectType] ?? 'EFFECT';
  const effectDef = LUMINARY_EFFECT_MAP[luminaryId] ?? null;

  // ── Skip handler — called when hold completes ──────────────────────────────
  const handleSkip = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    gameAudio.stopActivationSting();
    setPhase('done');
    // Pass skipped=true so callers can bypass exit animations immediately.
    onCompleteRef.current(true);
  };

  // ── Hold gesture handlers ──────────────────────────────────────────────────

  const cancelHold = () => {
    holdStartRef.current = null;
    if (holdRafRef.current !== null) {
      cancelAnimationFrame(holdRafRef.current);
      holdRafRef.current = null;
    }
    setHoldProgress(0);
  };

  const startHold = (e: React.PointerEvent) => {
    // Only respond to primary button / touch
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Guard against re-entrant pointerdowns (multitouch, browser edge cases)
    if (holdStartRef.current !== null) return;
    e.preventDefault();
    holdStartRef.current = performance.now();

    // Capture the pointer so all subsequent pointer events (move, up, cancel)
    // are delivered to this element even if the cursor leaves the overlay.
    e.currentTarget.setPointerCapture(e.pointerId);

    const tick = () => {
      if (holdStartRef.current === null) return;
      const elapsed  = performance.now() - holdStartRef.current;
      const progress = Math.min(elapsed / HOLD_TO_SKIP_MS, 1);
      setHoldProgress(progress);
      if (progress >= 1) {
        cancelHold();
        handleSkip();
      } else {
        holdRafRef.current = requestAnimationFrame(tick);
      }
    };
    holdRafRef.current = requestAnimationFrame(tick);
  };

  // Cleanup hold RAF on unmount
  useEffect(() => () => {
    if (holdRafRef.current !== null) cancelAnimationFrame(holdRafRef.current);
  }, []);

  // ── Scroll lock — acquired on mount, released on unmount ──────────────────
  // Prevents the player from scrolling the board or the Luminary portal row
  // during the ~2 s cinematic (summon / end_of_turn / start_of_turn for all
  // non-ember Luminaries). Mirrors the lockBoardScroll/unlockBoardScroll
  // pattern used by CinderMandateBurnDirector and CinderMandateBrandingDirector.
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const boardEl = document.querySelector<HTMLElement>('[data-game-board]');
    if (boardEl) boardEl.style.overflowY = 'hidden';
    const lumRow = document.querySelector<HTMLElement>('[data-luminary-scroll]');
    if (lumRow) lumRow.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
      if (boardEl) boardEl.style.overflowY = '';
      if (lumRow) lumRow.style.overflow = '';
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase timer chain ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isReduced) {
      // Reduced-motion path: skip straight to 'hold' (show text/procedure strip
      // immediately) then auto-complete after REDUCED_HOLD_MS.
      // No audio, no entity, no board zoom.
      setPhase('hold');
      const t1 = setTimeout(() => {
        completedRef.current = true;
        setPhase('done');
        // Reduced-motion auto-complete is a fast-forward path — no exit animations.
        onCompleteRef.current(true);
      }, REDUCED_HOLD_MS);
      timersRef.current = [t1];
    } else {
      // Full-motion path: 1860ms phase chain.
      // Fade-in matches the overlay ANTICIPATE ramp; fade-out matches PAN_OUT.
      gameAudio.playActivationSting(effectType, primaryColor, {
        fadeInMs:       ANTICIPATE_MS,
        fadeOutStartMs: ANTICIPATE_MS + REVEAL_MS + HOLD_MS,
        fadeOutMs:      Math.round(PAN_OUT_MS * 0.65),
      });

      const t1 = setTimeout(() => setPhase('reveal'),  ANTICIPATE_MS);
      const t2 = setTimeout(() => setPhase('hold'),    ANTICIPATE_MS + REVEAL_MS);
      const t3 = setTimeout(() => setPhase('pan_out'), ANTICIPATE_MS + REVEAL_MS + HOLD_MS);
      const t4 = setTimeout(() => {
        completedRef.current = true;
        setPhase('done');
        onCompleteRef.current();
      }, ANTICIPATE_MS + REVEAL_MS + HOLD_MS + PAN_OUT_MS);

      timersRef.current = [t1, t2, t3, t4];
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      // If unmounted before the final timer fired, drain immediately so the
      // animation state machine never stalls.
      if (!completedRef.current) {
        completedRef.current = true;
        onCompleteRef.current();
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect beat chain (within hold phase) ─────────────────────────────────
  // Beats fire sequentially during HOLD_MS.  Skipped when no effectDef.
  useEffect(() => {
    if (phase !== 'hold' || !effectDef) {
      setEffectBeat('idle');
      return;
    }
    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => setEffectBeat('target'), BEAT_TARGET_MS));
    timers.push(setTimeout(() => setEffectBeat('snap'),   BEAT_SNAP_MS));
    timers.push(setTimeout(() => setEffectBeat('done'),   BEAT_DONE_MS));
    return () => timers.forEach(clearTimeout);
  }, [phase, effectDef]);

  // ── Board DOM zoom-out (full-motion only) ────────────────────────────────
  // Reduced-motion path skips the zoom entirely so the board stays at rest.
  useEffect(() => {
    if (isReduced) return;

    const board = document.querySelector('[data-game-board]') as HTMLElement | null;
    if (!board) return;

    if (phase === 'anticipate') {
      board.scrollTop = 0;
      board.style.transition      = `transform ${ANTICIPATE_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      board.style.transformOrigin = '50% 50%';
      board.style.transform       = `scale(${BOARD_SCALE})`;
    } else if (phase === 'reveal' || phase === 'hold') {
      board.style.transition = '';
      board.style.transform  = `scale(${BOARD_SCALE})`;
    } else if (phase === 'pan_out' || phase === 'done') {
      board.style.transition      = `transform ${PAN_OUT_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
      board.style.transformOrigin = '50% 50%';
      board.style.transform       = '';
    }

    return () => {
      board.style.transform       = '';
      board.style.transition      = '';
      board.style.transformOrigin = '';
    };
  }, [phase, isReduced]);

  // ── Derived state ─────────────────────────────────────────────────────────

  // Beat visibility flags (shared between full and reduced render paths)
  const hasProcedureSteps = (procedure ?? []).some(s => s.type !== 'luminaryPulse');
  const targetVisible = (effectDef !== null || hasProcedureSteps) && (effectBeat === 'target' || effectBeat === 'snap');
  const snapVisible   = effectDef !== null && effectBeat === 'snap';

  if (phase === 'done') return null;

  // ── Reduced-motion render ─────────────────────────────────────────────────
  // Compact 380ms overlay: dim + effect label + ProcedureStrip/badge + name.
  // No entity, no board zoom, no slow phases. Single click to dismiss early.
  if (isReduced) {
    const reducedContent = (
      <div
        className="fixed inset-0"
        style={{ zIndex: 8900, pointerEvents: 'auto', cursor: 'pointer', userSelect: 'none' }}
        onClick={handleSkip}
      >
        {/* Dim overlay — appears instantly, no transition */}
        <div
          className="absolute inset-0"
          style={{ background: 'rgba(4,2,16,0.72)', pointerEvents: 'none' }}
        />

        {/* Colored accent bar at top — quick visual anchor keyed to this Luminary */}
        <div
          className="absolute top-0 inset-x-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}88, transparent)`, pointerEvents: 'none' }}
        />

        {/* Compact info block — centered, no entry animation */}
        <div
          className="absolute inset-x-0 flex flex-col items-center gap-2 px-4"
          style={{ top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', zIndex: 1 }}
        >
          {/* Effect-type label pill */}
          <div
            className="px-3 py-0.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase"
            style={{
              background: `${primaryColor}22`,
              border: `1px solid ${primaryColor}55`,
              color: primaryColor,
            }}
          >
            {label}
          </div>

          {/* Procedure strip — always visible immediately in reduced mode */}
          {procedure && hasProcedureSteps ? (
            <ProcedureStrip procedure={procedure} />
          ) : effectDef ? (
            <TargetBadge
              tone={effectDef.tone}
              target={effectDef.target}
              isLingering={effectDef.isLingering}
            />
          ) : null}

          {/* Luminary name */}
          <div
            className="text-xl font-bold tracking-wide text-center"
            style={{
              color: '#ffffff',
              textShadow: `0 0 18px ${primaryColor}aa, 0 2px 6px rgba(0,0,0,0.8)`,
              maxWidth: 320,
            }}
          >
            {luminaryName}
          </div>

          {triggeringPlayerName && (
            <div
              className="text-xs tracking-wider"
              style={{ color: `${primaryColor}cc` }}
            >
              {triggeringPlayerName}
            </div>
          )}
        </div>

        {/* Tap-to-dismiss hint */}
        <div
          className="absolute bottom-4 right-4 flex items-center select-none"
          style={{ pointerEvents: 'none' }}
        >
          <span
            className="text-[10px] tracking-[0.14em] uppercase"
            style={{ color: 'rgba(255,255,255,0.32)' }}
          >
            tap to dismiss
          </span>
        </div>
      </div>
    );
    return createPortal(reducedContent, document.body);
  }

  // ── Full-motion render ─────────────────────────────────────────────────────
  // Entity mounts on 'reveal' and stays mounted through 'pan_out'.
  // Its keyframe animation handles the full opacity/scale lifecycle — no
  // external phase-driven animate targets needed.
  const showEntity = phase === 'reveal' || phase === 'hold' || phase === 'pan_out';
  // Text appears during reveal + hold, exits cleanly before pan_out fades out.
  const showText   = phase === 'reveal' || phase === 'hold';
  const isPanOut   = phase === 'pan_out';

  // Dark overlay dims the board.  Fades in quickly during anticipate, held
  // through reveal+hold, then fades out during pan_out.
  const overlayOpacity =
    phase === 'anticipate' ? 0.68 :
    phase === 'reveal'     ? 0.75 :
    phase === 'hold'       ? 0.78 :
    0; // pan_out + done

  const showSkipHint = phase === 'reveal' || phase === 'hold' || phase === 'pan_out';

  const content = (
    <div
      className="fixed inset-0"
      style={{ zIndex: 8900, pointerEvents: 'auto', cursor: 'pointer', userSelect: 'none' }}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
    >
      {/* ── Board dim overlay ────────────────────────────────────────────────
           Fades in over ANTICIPATE_MS, fades out over PAN_OUT_MS.          */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: overlayOpacity }}
        transition={{
          duration: isPanOut ? PAN_OUT_MS / 1000 * 0.65 : (REVEAL_MS / 1000) * 0.4,
          ease: 'easeInOut',
        }}
        style={{ background: 'rgba(4,2,16,1)', pointerEvents: 'none' }}
      />

      {/* ── Luminary entity ──────────────────────────────────────────────────
           Single continuous keyframe sequence from mount.  Opacity/scale
           follow the spec curve exactly — no per-phase animate overrides.
           Entity mounts at ANTICIPATE_MS (0.15s), runs 1.95s total.       */}
      {showEntity && (
        <motion.div
          key="entity"
          className="absolute inset-0 flex items-center justify-center lum-entity-reveal"
          style={{ pointerEvents: 'none' }}
          initial={{ opacity: 0, scale: 0.88, y: entityYInitial }}
          animate={{
            opacity: ENTITY_OPACITY,
            scale:   ENTITY_SCALE,
            y:       entityY,
          }}
          transition={{
            duration: ENTITY_DUR_S,
            times:    ENTITY_TIMES,
            ease:     'easeInOut',
            y: {
              duration: ENTITY_DUR_S,
              times:    ENTITY_TIMES,
              ease:     ENTITY_Y_EASE,
            },
          }}
        >
          {/* Colored glow bloom — suppressed on mobile (blur(60px) on a viewport-sized
              div is expensive; skip it on low-powered devices).                       */}
          {!isMobile && (
            <div
              className={luminaryId === 'lum_radiant' ? 'lum-aura-bloom' : undefined}
              style={{
                position: 'absolute',
                inset: '-20%',
                background: `radial-gradient(ellipse at center, ${primaryColor}25 0%, transparent 60%)`,
                filter: 'blur(60px)',
                pointerEvents: 'none',
              }}
            />
          )}

          {/* lum_radiant: living three-layer animated composite instead of static PNG */}
          {luminaryId === 'lum_radiant' ? (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <RadiantLivingEntityComposite size="78vmin" />
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              style={{
                ...(luminaryId === 'lum_compass'
                  ? { width: '100vw', height: 'auto', maxHeight: '100vh' }
                  : { height: '92vh', width: 'auto', maxWidth: '92vw' }),
                objectFit: 'contain',
                display: 'block',
                position: 'relative',
                zIndex: 1,
                filter: isMobile
                  ? `drop-shadow(0 0 32px ${primaryColor}88)`
                  : `drop-shadow(0 0 52px ${primaryColor}72) drop-shadow(0 0 100px ${primaryColor}38)`,
                ...(entityBlendMode ? { mixBlendMode: entityBlendMode as React.CSSProperties['mixBlendMode'] } : {}),
              }}
            />
          ) : (
            <div
              style={{
                width: '72vmin',
                height: '72vmin',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                zIndex: 1,
                filter: isMobile
                  ? `drop-shadow(0 0 32px ${primaryColor}aa)`
                  : `drop-shadow(0 0 52px ${primaryColor}88)`,
              }}
            >
              <EntityArt
                size={Math.round(Math.min(
                  typeof window !== 'undefined' ? window.innerWidth  : 400,
                  typeof window !== 'undefined' ? window.innerHeight : 667,
                ) * 0.68)}
              />
            </div>
          )}
        </motion.div>
      )}

      {/* ── Beat 4 + text: Effect label, target badge, Luminary name ────────── */}
      <AnimatePresence>
        {showText && (
          <motion.div
            key="text"
            className="absolute bottom-14 inset-x-0 flex flex-col items-center gap-2 px-4"
            style={{ pointerEvents: 'none', zIndex: 1 }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.24, ease: 'easeOut' as const } }}
            exit={{ opacity: 0, transition: { duration: 0.35 } }}
          >
            {/* Effect-type label pill */}
            <div
              className="px-3 py-0.5 rounded-full text-[10px] font-bold tracking-[0.18em] uppercase"
              style={{
                background: `${primaryColor}22`,
                border: `1px solid ${primaryColor}55`,
                color: primaryColor,
              }}
            >
              {label}
            </div>

            {/* Beat 4 — Procedure strip (or legacy target badge when no procedure) */}
            <AnimatePresence>
              {targetVisible && procedure && hasProcedureSteps ? (
                <ProcedureStrip key="proc-strip" procedure={procedure} />
              ) : targetVisible && effectDef ? (
                <TargetBadge
                  key="target-badge"
                  tone={effectDef.tone}
                  target={effectDef.target}
                  isLingering={effectDef.isLingering}
                />
              ) : null}
            </AnimatePresence>

            {/* Luminary name */}
            <div
              className="text-2xl font-bold tracking-wide text-center"
              style={{
                color: '#ffffff',
                textShadow: `0 0 24px ${primaryColor}cc, 0 2px 8px rgba(0,0,0,0.8)`,
                maxWidth: 320,
              }}
            >
              {luminaryName}
            </div>

            {triggeringPlayerName && (
              <div
                className="text-xs tracking-wider"
                style={{ color: `${primaryColor}cc` }}
              >
                {triggeringPlayerName}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Beat 5: Consequence snap flash ──────────────────────────────────── */}
      <AnimatePresence>
        {snapVisible && effectDef && (
          <ConsequenceSnap key="snap" tone={effectDef.tone} />
        )}
      </AnimatePresence>

      {/* ── Hold-to-skip hint ─────────────────────────────────────────────────
           Appears after ANTICIPATE_MS. Shows a progress ring that fills as
           the player holds. Releasing early resets the ring to zero.       */}
      <AnimatePresence>
        {showSkipHint && (
          <motion.div
            key="skip-hint"
            className="absolute bottom-4 right-4 flex items-center gap-2 select-none"
            style={{ pointerEvents: 'none' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.4, delay: 0.1 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <span
              className="text-[10px] tracking-[0.14em] uppercase"
              style={{ color: holdProgress > 0 ? 'rgba(255,255,255,0.70)' : 'rgba(255,255,255,0.35)', transition: 'color 150ms ease' }}
            >
              hold to skip
            </span>
            <SkipRing progress={holdProgress} color={primaryColor} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(content, document.body);
}
