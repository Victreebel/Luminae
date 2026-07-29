import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Easing } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getLuminaryVisuals, getLuminaryImageAssets, RadiantLivingEntityComposite } from '@/lib/luminaryAssets';
import { gameAudio } from '@/lib/audio';
import { LUMINARY_ANIMATION_CONFIG } from '@/lib/luminaryAnimationConfig';
import {
  LUMINARY_EFFECT_MAP,
  TargetBadge,
  ConsequenceSnap,
} from '@/components/LuminaryEffectOverlay';
import {
  LuminaryEffectAnnouncement,
  LuminaryEffectSkipControl,
} from '@/components/LuminaryEffectChrome';
import type { AnimationProcedureStep } from '@/lib/animationProcedure';
import {
  createLuminaryEffectSequence,
  type LuminaryEffectPhaseId,
  type LuminaryEffectSequenceController,
} from '@/lib/luminaryEffectSequence';
import { getLuminaryAnnouncementCopy } from '@/lib/luminaryEffectAnnouncements';
import { useIsMobile } from '@/hooks/use-mobile';

// ─── Types ────────────────────────────────────────────────────────────────────

// anticipate → reveal → hold → pan_out → resolve → done
type Phase = 'anticipate' | 'reveal' | 'hold' | 'pan_out' | 'resolve' | 'done';

// Internal beat sequence that fires during the hold phase.
// beat 1: target — target claim badge appears
// beat 2: snap   — consequence flash fires once then fades
type EffectBeat = 'idle' | 'target' | 'snap' | 'done';

interface LuminaryActivationCinematicProps {
  luminaryId: string;
  effectType: 'summon' | 'end_of_turn' | 'start_of_turn';
  luminaryName: string;
  /** Concise mechanics copy shown while the source reveal holds. */
  effectDescription?: string;
  /** Concise mechanics copy shown when the live consequence resolves. */
  resolutionDescription?: string;
  triggeringPlayerName?: string;
  /** One-based position of this effect in the currently visible activation queue. */
  queuePosition?: number;
  /** Total effects currently waiting to resolve. */
  queueTotal?: number;
  /** Optional resolved animation procedure — drives the ProcedureStrip. */
  procedure?: AnimationProcedureStep[];
  /**
   * Fires once the source reveal clears and the live board becomes visible.
   * Callers use this boundary to start target/result animations in sync with
   * the procedure timeline instead of letting them run behind the reveal.
   */
  onResolutionStart?: () => void;
  /**
   * When true (abridgedAnims setting), use the compact reduced-motion overlay
   * instead of the full source-and-resolution sequence. System
   * prefers-reduced-motion independently triggers this path.
   */
  reducedMotion?: boolean;
  /**
   * Called when the cinematic ends (normally or via skip).
   * `skipped` is true when the player held-to-skip or the reduced-motion timer
   * completed early — callers should bypass any exit animations in that case.
   */
  onComplete: (skipped?: boolean) => void;
}

// ─── Procedure timeline ───────────────────────────────────────────────────────
// Compact ordered steps shown while the live board resolves the effect.

interface StepInfo { icon: string; label: string; color: string; }

function stepInfo(step: AnimationProcedureStep): StepInfo | null {
  switch (step.type) {
    case 'luminaryPulse': return null;
    case 'targetClaim': {
      const count = step.targetIds.length > 1 ? ` ${step.targetIds.length}` : '';
      if (step.keyword === 'burn')
        return { icon: '⬡', label: `TARGET${count}`, color: '#fca5a5' };
      if (step.keyword === 'condemned')
        return { icon: '⬡', label: `TARGET${count}`, color: '#fca5a5' };
      return { icon: '⬡', label: `TARGET${count}`, color: '#e2e8f0' };
    }
    case 'keywordEvent':
      if (step.keyword === 'burn')
        return {
          icon: '🔥',
          label: `BURN${step.targetIds.length > 1 ? ` ${step.targetIds.length}` : ''}`,
          color: '#ef4444',
        };
      return { icon: '◎', label: step.keyword.toUpperCase(), color: '#6366f1' };
    case 'keywordEvents': {
      const first = step.events[0];
      if (!first) return null;
      const targetCount = new Set(step.events.flatMap(event => event.targetIds)).size;
      const count = targetCount > 1 ? ` ${targetCount}` : '';
      if (first.keyword === 'burn')
        return { icon: '🔥', label: `BURN${count}`, color: '#ef4444' };
      return { icon: '◎', label: first.keyword.toUpperCase(), color: '#6366f1' };
    }
    case 'residue': {
      const m: Record<string, StepInfo> = {
        condemned: { icon: '⚑', label: 'CONDEMNED', color: '#ef4444' },
        forgotten: { icon: '◎', label: 'FORGOTTEN',  color: '#6366f1' },
        nullified: { icon: '✕', label: 'NULLIFIED',  color: '#94a3b8' },
        seeded:    { icon: '⁕', label: 'SEEDED',     color: '#22c55e' },
      };
      const base = m[step.keyword] ?? { icon: '◎', label: step.keyword.toUpperCase(), color: '#94a3b8' };
      const count = step.targetIds.length > 1 ? ` ${step.targetIds.length}` : '';
      return { ...base, label: `${base.label}${count}` };
    }
    case 'forgeRefill':  return { icon: '↺', label: 'REFILL FORGE', color: '#94a3b8' };
    case 'archiveReturn': {
      const count = step.cardIds.length > 1 ? ` ${step.cardIds.length}` : '';
      return { icon: '↶', label: `RETURN${count}`, color: '#60a5fa' };
    }
    case 'eminenceChange': {
      const sign = step.amount >= 0 ? '+' : '';
      const color = step.amount >= 0 ? '#fbbf24' : '#ef4444';
      const scope = step.playerIds.length > 1 ? ' ALL' : '';
      return { icon: '◆', label: `${sign}${step.amount} EMINENCE${scope}`, color };
    }
    case 'victoryRequirementChange': {
      const sign = step.amount >= 0 ? '+' : '';
      return { icon: '◇', label: `VICTORY ${sign}${step.amount}`, color: '#a78bfa' };
    }
    case 'affinityReturn': {
      const scope = step.playerIds.length > 1 ? ' ALL' : '';
      return { icon: '◇', label: `RETURN AFFINITY${scope}`, color: '#60a5fa' };
    }
    case 'deckScry':      return { icon: '◉', label: 'SCRY ARCHIVES', color: '#a78bfa' };
    case 'pendingAction': return { icon: '✦', label: 'ASSIMILATE READY', color: '#fb923c' };
    case 'reveal': {
      const tierLabel = step.tier ? `T${step.tier}` : '';
      const scope = step.cardIds.length > 1 ? ` ${step.cardIds.length}` : '';
      return { icon: '◉', label: `REVEAL${scope} ${tierLabel}`.trim(), color: '#fbbf24' };
    }
    default:              return null;
  }
}

export function getVisibleProcedureSteps(procedure: AnimationProcedureStep[]): StepInfo[] {
  return procedure.flatMap(step => {
    const info = stepInfo(step);
    return info ? [info] : [];
  });
}

function ProcedureTimeline({
  procedure,
  active,
  reducedMotion,
}: {
  procedure: AnimationProcedureStep[];
  active: boolean;
  reducedMotion: boolean;
}) {
  const visible = getVisibleProcedureSteps(procedure);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
    if (!active || reducedMotion || visible.length < 2) return;
    const timers = visible.slice(1).map((_, index) => (
      setTimeout(() => setActiveIndex(index + 1), (index + 1) * RESOLUTION_STEP_MS)
    ));
    return () => timers.forEach(clearTimeout);
  }, [active, reducedMotion, visible.length]);

  if (visible.length === 0) return null;
  return (
    <motion.div
      className="flex items-center gap-1.5 flex-wrap justify-center"
      role="list"
      aria-label="Luminary effect resolution"
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.38, ease: 'easeOut' }}
    >
      {visible.map((info, i) => {
        const isActive = reducedMotion || i === activeIndex;
        const isComplete = !reducedMotion && i < activeIndex;
        return (
          <React.Fragment key={i}>
            {i > 0 && (
              <span
                aria-hidden="true"
                style={{
                  color: i <= activeIndex ? `${info.color}aa` : 'rgba(255,255,255,0.2)',
                  fontSize: 10,
                  transition: 'color 180ms ease',
                }}
              >
                →
              </span>
            )}
            <motion.div
              role="listitem"
              aria-current={isActive && !reducedMotion ? 'step' : undefined}
              animate={{
                opacity: isActive ? 1 : isComplete ? 0.72 : 0.34,
                scale: isActive ? 1 : 0.96,
              }}
              transition={{ duration: 0.18, ease: 'easeOut' }}
              style={{
                padding: '4px 8px',
                borderRadius: 6,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: info.color,
                background: isActive ? `${info.color}24` : 'rgba(5,8,16,0.82)',
                border: `1px solid ${info.color}${isActive ? '88' : '38'}`,
                boxShadow: isActive ? `0 0 18px ${info.color}32` : 'none',
              }}
            >
              <span aria-hidden="true">{isComplete ? '✓' : info.icon}</span> {info.label}
            </motion.div>
          </React.Fragment>
        );
      })}
    </motion.div>
  );
}

function VictoryRequirementCue({
  procedure,
  active,
  reducedMotion,
}: {
  procedure: AnimationProcedureStep[];
  active: boolean;
  reducedMotion: boolean;
}) {
  const changeIndex = procedure.findIndex(step => (
    step.type === 'victoryRequirementChange' ||
    (step.type === 'residue' && step.victoryRequirementChange !== undefined)
  ));
  const change = changeIndex >= 0 ? procedure[changeIndex] : undefined;
  const changeAmount = change?.type === 'victoryRequirementChange'
    ? change.amount
    : change?.type === 'residue'
      ? change.victoryRequirementChange ?? 0
      : 0;
  // A combined residue step owns the threshold cue, so time the banner against
  // the branding step rather than inventing a second visible activation.
  const visibleIndex = changeIndex >= 0
    ? getVisibleProcedureSteps(procedure.slice(0, changeIndex + 1)).length - 1
    : -1;
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(false);
    if (!active || !change) return;
    if (reducedMotion) {
      setVisible(true);
      return;
    }
    const showTimer = setTimeout(
      () => setVisible(true),
      Math.max(0, visibleIndex) * RESOLUTION_STEP_MS,
    );
    const hideTimer = setTimeout(
      () => setVisible(false),
      Math.max(0, visibleIndex) * RESOLUTION_STEP_MS + 1550,
    );
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [active, changeAmount, reducedMotion, visibleIndex]);

  if (!change || !visible) return null;
  const sign = changeAmount >= 0 ? '+' : '';
  return (
    <motion.div
      data-testid="victory-requirement-change"
      role="status"
      aria-live="assertive"
      className="absolute inset-x-0 top-[18%] z-[3] flex justify-center px-4 pointer-events-none"
      initial={{ opacity: 0, scale: 0.88, y: -10 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [0.88, 1, 1.02, 1], y: [-10, 0, 0, -4] }}
      transition={{ duration: 1.5, times: [0, 0.16, 0.74, 1], ease: 'easeOut' }}
    >
      <div
        className="flex items-center gap-3 rounded-xl border px-4 py-2.5 text-center"
        style={{
          borderColor: 'rgba(196,181,253,0.68)',
          background: 'linear-gradient(180deg, rgba(91,33,182,0.42), rgba(12,8,31,0.94))',
          boxShadow: '0 0 32px rgba(167,139,250,0.3), inset 0 1px rgba(255,255,255,0.12)',
        }}
      >
        <span className="text-2xl text-violet-200" aria-hidden="true">◇</span>
        <span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.18em] text-violet-200">
            Victory requirement raised
          </span>
          <span className="mt-0.5 block text-sm font-bold text-white">
            {sign}{changeAmount} to win
          </span>
        </span>
      </div>
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
// Reduced-motion variant — readable compact hold based on procedure length
//
// 0ms  Compact overlay appears immediately (no entity, no board zoom)
//      Shows the procedure timeline + Luminary name + effect label.
//      Single click/tap dismisses. Auto-completes after the compact hold.

const ANTICIPATE_MS = 150;   // 0.00–0.15s
export const REVEAL_MS     = 400;   // 0.15–0.55s  — fast fade-in
export const HOLD_MS       = 550;   // 0.55–1.10s
export const PAN_OUT_MS    = 860;   // 1.10–1.96s  — lingering fade-out
// Total: 1960ms

// Reduced-motion / abridged: compact overlay duration
const REDUCED_HOLD_MS = 380;

/** Readable hold for each causal step after the source cinematic clears. */
export const RESOLUTION_STEP_MS = 500;
export const RESOLUTION_SETTLE_MS = 400;
export const MIN_RESOLUTION_MS = 1100;
/** Normal Burn visuals include target badges, BurnFlash, and Forge refill. */
export const BURN_RESOLUTION_MIN_MS = 2520;

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

// ─── Effect-type labels ───────────────────────────────────────────────────────

const EFFECT_TYPE_LABELS: Record<string, string> = {
  summon:        'ARRIVAL EFFECT',
  end_of_turn:   'END OF TURN EFFECT',
  start_of_turn: 'START OF TURN EFFECT',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function LuminaryActivationCinematic({
  luminaryId,
  effectType,
  luminaryName,
  effectDescription,
  resolutionDescription,
  triggeringPlayerName,
  queuePosition = 1,
  queueTotal = 1,
  procedure,
  onResolutionStart,
  reducedMotion: reducedMotionProp,
  onComplete,
}: LuminaryActivationCinematicProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Respect system prefers-reduced-motion OR the caller's abridgedAnims flag.
  const systemPrefersReduced = useReducedMotion();
  const isReduced = reducedMotionProp || !!systemPrefersReduced;
  const isDesktopShell =
    typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');

  const isMobile = useIsMobile();
  const entityY = isMobile ? ENTITY_Y_MOBILE : ENTITY_Y_DESKTOP;
  const entityYInitial = isMobile ? ENTITY_Y_MOBILE[0] : ENTITY_Y_DESKTOP[0];
  const useLowCostRuntimeComposite = (isDesktopShell || isMobile) && !isReduced;

  const resolutionStartedRef = useRef(false);
  const onResolutionStartRef = useRef(onResolutionStart);
  onResolutionStartRef.current = onResolutionStart;
  const sequenceRef = useRef<LuminaryEffectSequenceController | null>(null);

  const [phase, setPhase] = useState<Phase>('anticipate');
  const [effectBeat, setEffectBeat] = useState<EffectBeat>('idle');
  const [directorPhase, setDirectorPhase] =
    useState<LuminaryEffectPhaseId>('announce');

  const vis = getLuminaryVisuals(luminaryId);
  const { primaryColor, EntityArt, entityBlendMode } = vis;
  const { entityCutout, panelArt, cinematicArt } = getLuminaryImageAssets(luminaryId);

  // Best available image for the current render path. Desktop/mobile use the
  // bounded cinematic texture; board panels and detail views still use source art.
  const imageUrl = useLowCostRuntimeComposite
    ? (cinematicArt ?? entityCutout ?? panelArt)
    : (entityCutout ?? panelArt);

  const label = EFFECT_TYPE_LABELS[effectType] ?? 'EFFECT';
  const effectDef = LUMINARY_EFFECT_MAP[luminaryId] ?? null;
  const effectName = LUMINARY_ANIMATION_CONFIG[luminaryId]?.effectName ?? luminaryName;
  const sourceAnnouncementCopy = getLuminaryAnnouncementCopy(
    luminaryId,
    'source',
    { effectName, effectDescription },
    effectType,
  );
  const resolutionAnnouncementCopy = getLuminaryAnnouncementCopy(
    luminaryId,
    'resolution',
    {
      effectName,
      effectDescription: resolutionDescription ?? effectDescription,
    },
    effectType,
  );
  const visibleProcedureSteps = getVisibleProcedureSteps(procedure ?? []);
  const hasBurnProcedure = (procedure ?? []).some(step => (
    (step.type === 'keywordEvent' && step.keyword === 'burn') ||
    (step.type === 'keywordEvents' && step.events.some(event => event.keyword === 'burn'))
  ));
  const resolutionDurationMs = Math.max(
    MIN_RESOLUTION_MS,
    hasBurnProcedure ? BURN_RESOLUTION_MIN_MS : 0,
    visibleProcedureSteps.length * RESOLUTION_STEP_MS + RESOLUTION_SETTLE_MS,
  );
  const reducedHoldMs = Math.max(
    REDUCED_HOLD_MS,
    600 + visibleProcedureSteps.length * 180,
  );
  const queueLabel = queueTotal > 1
    ? `${label} · ${queuePosition} OF ${queueTotal}`
    : label;
  const startResolutionOnce = () => {
    if (resolutionStartedRef.current) return;
    resolutionStartedRef.current = true;
    onResolutionStartRef.current?.();
  };

  // Every generic effect now uses the same causal phase contract as the named
  // directors. The source reveal remains bespoke, but queue advancement and
  // skipping are owned by the shared exactly-once sequence controller.
  useEffect(() => {
    const targetHoldMs = Math.max(0, resolutionDurationMs - 340);
    const phases = isReduced
      ? [
          {
            id: 'announce' as const,
            durationMs: reducedHoldMs,
            reducedDurationMs: reducedHoldMs,
            run: () => {
              setPhase('hold');
              setEffectBeat('idle');
            },
          },
          {
            id: 'frame' as const,
            run: startResolutionOnce,
          },
          {
            id: 'target' as const,
            run: () => {
              setPhase('resolve');
              setEffectBeat(effectDef ? 'target' : 'idle');
            },
          },
          {
            id: 'resolve' as const,
            run: () => setEffectBeat(effectDef ? 'snap' : 'idle'),
          },
          {
            id: 'reveal' as const,
            run: () => setEffectBeat('done'),
          },
          { id: 'aftermath' as const },
        ]
      : [
          {
            id: 'announce' as const,
            run: async ({ wait }: { wait: (durationMs: number) => Promise<void> }) => {
              setPhase('anticipate');
              setEffectBeat('idle');
              await wait(ANTICIPATE_MS);
              setPhase('reveal');
              await wait(REVEAL_MS);
              setPhase('hold');
              await wait(HOLD_MS);
            },
          },
          {
            id: 'frame' as const,
            run: async ({ wait }: { wait: (durationMs: number) => Promise<void> }) => {
              setPhase('pan_out');
              await wait(PAN_OUT_MS);
              startResolutionOnce();
            },
          },
          {
            id: 'target' as const,
            durationMs: targetHoldMs,
            run: () => {
              setPhase('resolve');
              setEffectBeat(effectDef ? 'target' : 'idle');
            },
          },
          {
            id: 'resolve' as const,
            durationMs: 250,
            run: () => setEffectBeat(effectDef ? 'snap' : 'idle'),
          },
          {
            id: 'reveal' as const,
            durationMs: 90,
            run: () => setEffectBeat('done'),
          },
          { id: 'aftermath' as const },
        ];

    if (!isReduced) {
      const activationFade = {
        fadeInMs:       ANTICIPATE_MS,
        fadeOutStartMs: ANTICIPATE_MS + REVEAL_MS + HOLD_MS,
        fadeOutMs:      Math.round(PAN_OUT_MS * 0.65),
      };
      gameAudio.playActivationSting(effectType, primaryColor, activationFade);
    }

    const sequence = createLuminaryEffectSequence({
      phases,
      reducedMotion: isReduced,
      onPhaseChange: setDirectorPhase,
      onSkip: () => {
        startResolutionOnce();
        gameAudio.stopActivationSting();
        setPhase('done');
      },
      onComplete: (skipped) => {
        gameAudio.stopActivationSting();
        setPhase('done');
        onCompleteRef.current(skipped);
      },
    });
    sequenceRef.current = sequence;
    sequence.start();

    return () => {
      sequence.cancel();
      if (sequenceRef.current === sequence) sequenceRef.current = null;
      gameAudio.stopActivationSting();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSkip = () => sequenceRef.current?.skip();

  // ── Derived state ─────────────────────────────────────────────────────────

  // Beat visibility flags (shared between full and reduced render paths)
  const hasProcedureSteps = (procedure ?? []).some(s => s.type !== 'luminaryPulse');
  const targetVisible =
    phase === 'resolve' &&
    (effectDef !== null || hasProcedureSteps) &&
    (effectBeat === 'target' || effectBeat === 'snap');
  const snapVisible   = effectDef !== null && effectBeat === 'snap';
  if (phase === 'done') return null;

  // ── Reduced-motion render ─────────────────────────────────────────────────
  // Compact overlay: dim + effect label + procedure timeline/badge + name.
  // No entity, no board zoom, no slow phases. Single click/tap to dismiss early.
  if (isReduced) {
    const reducedContent = (
      <div
        data-testid="luminary-activation-cinematic"
        data-luminary-id={luminaryId}
        data-effect-type={effectType}
        data-effect-phase={directorPhase}
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
            {queueLabel}
          </div>

          <LuminaryEffectAnnouncement
            effectName={effectName}
            luminaryName={luminaryName}
            description={resolutionAnnouncementCopy}
            triggeringPlayerName={triggeringPlayerName}
            primaryColor={primaryColor}
            secondaryColor={primaryColor}
            compact
          />

          {/* Procedure strip — always visible immediately in reduced mode */}
          {procedure && hasProcedureSteps ? (
            <ProcedureTimeline procedure={procedure} active={false} reducedMotion />
          ) : effectDef ? (
            <TargetBadge
              tone={effectDef.tone}
              target={effectDef.target}
              isLingering={effectDef.isLingering}
            />
          ) : null}
          <VictoryRequirementCue
            procedure={procedure ?? []}
            active
            reducedMotion
          />
        </div>

        <LuminaryEffectSkipControl
          color={primaryColor}
          onSkip={handleSkip}
          reducedMotion
        />
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

  const showResolution = phase === 'resolve';
  const showSkipHint =
    phase === 'reveal' ||
    phase === 'hold' ||
    phase === 'pan_out' ||
    phase === 'resolve';

  const content = (
    <div
      data-testid="luminary-activation-cinematic"
      data-luminary-id={luminaryId}
      data-effect-type={effectType}
      data-effect-phase={directorPhase}
      className="fixed inset-0"
      style={{ zIndex: 8900, pointerEvents: 'auto', userSelect: 'none' }}
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
          data-testid="luminary-activation-entity"
          className={`absolute inset-0 flex items-center justify-center${useLowCostRuntimeComposite ? '' : ' lum-entity-reveal'}`}
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
          {/* Colored glow bloom. Keep this filter-free: animating a viewport-sized
              blur stalls the Luminary reveal on slower GPUs. */}
          {!isMobile && !useLowCostRuntimeComposite && (
            <div
              className={luminaryId === 'lum_radiant' ? 'lum-aura-bloom' : undefined}
              style={{
                position: 'absolute',
                inset: '-20%',
                background: `radial-gradient(ellipse at center, ${primaryColor}22 0%, ${primaryColor}12 34%, transparent 68%)`,
                pointerEvents: 'none',
              }}
            />
          )}

          {/* lum_radiant: living three-layer animated composite on roomy browsers;
              desktop/mobile use the bounded texture to avoid multi-layer jank. */}
          {luminaryId === 'lum_radiant' && !useLowCostRuntimeComposite ? (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <RadiantLivingEntityComposite size="78vmin" />
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              decoding="async"
              fetchPriority="high"
              style={{
                ...(luminaryId === 'lum_compass'
                  ? { width: '100vw', height: 'auto', maxHeight: '100vh' }
                  : { height: useLowCostRuntimeComposite ? '82vh' : '92vh', width: 'auto', maxWidth: useLowCostRuntimeComposite ? '82vw' : '92vw' }),
                objectFit: 'contain',
                display: 'block',
                position: 'relative',
                zIndex: 1,
                filter: useLowCostRuntimeComposite
                  ? 'none'
                  : isMobile
                  ? `drop-shadow(0 0 32px ${primaryColor}88)`
                  : `drop-shadow(0 0 52px ${primaryColor}72) drop-shadow(0 0 100px ${primaryColor}38)`,
                ...(!useLowCostRuntimeComposite && entityBlendMode ? { mixBlendMode: entityBlendMode as React.CSSProperties['mixBlendMode'] } : {}),
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
                filter: useLowCostRuntimeComposite
                  ? 'none'
                  : isMobile
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
              {queueLabel}
            </div>

            <LuminaryEffectAnnouncement
              effectName={effectName}
              luminaryName={luminaryName}
              description={sourceAnnouncementCopy}
              triggeringPlayerName={triggeringPlayerName}
              primaryColor={primaryColor}
              secondaryColor={primaryColor}
              compact
            />

          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Board-visible resolution ──────────────────────────────────────────
           The entity and full-screen dim have cleared before this mounts.
           One procedural step is emphasized at a time so players can connect
           the named source to its target and final board consequence. */}
      <AnimatePresence>
        {showResolution && (
          <motion.div
            key="resolution"
            role="status"
            aria-live="polite"
            className="absolute inset-x-2 bottom-3 mx-auto"
            style={{
              width: 'min(680px, calc(100vw - 1rem))',
              pointerEvents: 'none',
              zIndex: 2,
            }}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            <div
              style={{
                display: 'grid',
                gap: 8,
                padding: '10px 12px',
                border: `1px solid ${primaryColor}66`,
                borderRadius: 6,
                background:
                  `linear-gradient(180deg, ${primaryColor}16, transparent 42%), rgba(4, 6, 13, 0.96)`,
                boxShadow:
                  `0 12px 28px rgba(0,0,0,0.72), 0 0 22px ${primaryColor}24, inset 0 1px rgba(255,255,255,0.05)`,
              }}
            >
              <div className="flex min-w-0 items-center justify-between gap-3">
                <div className="min-w-0">
                  <div
                    className="truncate text-[10px] font-bold uppercase"
                    style={{ color: primaryColor, letterSpacing: '0.14em' }}
                  >
                    {effectName}
                  </div>
                  <div className="truncate text-[10px] text-white/62">
                    {luminaryName}
                    {triggeringPlayerName ? ` · ${triggeringPlayerName}` : ''}
                  </div>
                  {resolutionAnnouncementCopy && (
                    <div className="mt-1 line-clamp-2 text-[10px] leading-snug text-white/70">
                      {resolutionAnnouncementCopy}
                    </div>
                  )}
                </div>
                <div
                  className="shrink-0 text-[9px] font-bold uppercase text-white/48"
                  style={{ letterSpacing: '0.12em' }}
                >
                  {queueLabel}
                </div>
              </div>

              {procedure && hasProcedureSteps ? (
                <ProcedureTimeline
                  procedure={procedure}
                  active
                  reducedMotion={false}
                />
              ) : targetVisible && effectDef ? (
                <TargetBadge
                  tone={effectDef.tone}
                  target={effectDef.target}
                  isLingering={effectDef.isLingering}
                />
              ) : null}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResolution && procedure && (
          <VictoryRequirementCue
            procedure={procedure}
            active={showResolution}
            reducedMotion={false}
          />
        )}
      </AnimatePresence>

      {/* ── Beat 5: Consequence snap flash ──────────────────────────────────── */}
      <AnimatePresence>
        {snapVisible && effectDef && (
          <ConsequenceSnap key="snap" tone={effectDef.tone} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSkipHint && (
          <motion.div
            key="skip-hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.4, delay: 0.1 } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
          >
            <LuminaryEffectSkipControl
              color={primaryColor}
              onSkip={handleSkip}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(content, document.body);
}
