import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Easing } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getLuminaryVisuals, getLuminaryImageAssets, RadiantLivingEntityComposite } from '@/lib/luminaryAssets';
import { gameAudio } from '@/lib/audio';
import { LUMINARY_ANIMATION_CONFIG } from '@/lib/luminaryAnimationConfig';
import {
  LUMINARY_EFFECT_MAP,
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
import { playLuminaryEffectPhaseSound } from '@/lib/luminaryEffectSound';
import {
  luminaryPacedDuration,
  type LuminaryPlaybackMode,
} from '@/lib/luminaryPresentationPacing';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  REDUCED_VICTORY_THRESHOLD_PRESENTATION_MS,
  VICTORY_THRESHOLD_PRESENTATION_MS,
  VictoryRequirementChangeOverlay,
} from '@/components/VictoryRequirementChangeOverlay';

// ─── Types ────────────────────────────────────────────────────────────────────

// anticipate → reveal → hold → pan_out → resolve → done
type Phase = 'anticipate' | 'reveal' | 'hold' | 'pan_out' | 'resolve' | 'done';

// Internal beat sequence that fires during the hold phase.
// beat 1: target — target claim badge appears
// beat 2: snap   — consequence flash fires once then fades
type EffectBeat = 'idle' | 'target' | 'snap' | 'done';

interface LuminaryActivationCinematicProps {
  luminaryId: string;
  effectType: 'summon' | 'action' | 'end_of_turn' | 'start_of_turn';
  luminaryName: string;
  triggeringPlayerName?: string;
  /** One-based position of this effect in the currently visible activation queue. */
  queuePosition?: number;
  /** Total effects currently waiting to resolve. */
  queueTotal?: number;
  /** Optional resolved animation procedure — drives the ProcedureStrip. */
  procedure?: AnimationProcedureStep[];
  /** Authoritative shared victory threshold before this activation. */
  victoryRequirementBefore?: number;
  /** Authoritative shared victory threshold after this activation. */
  victoryRequirementAfter?: number;
  /**
   * Fires once the source reveal clears and the live board becomes visible.
   * Callers use this boundary to start target/result animations in sync with
   * the procedure timeline instead of letting them run behind the reveal.
   */
  onResolutionStart?: () => void;
  /** Reframe the board during release; resolution waits for this to settle. */
  prepareResolution?: () => Promise<void>;
  /**
   * When true (abridgedAnims setting), use the compact reduced-motion overlay
   * instead of the full source-and-resolution sequence. System
   * prefers-reduced-motion independently triggers this path.
   */
  reducedMotion?: boolean;
  /**
   * Speeds up the logical phase clock without selecting the reduced-motion
   * presentation. The Sequence Lab uses this for Fast/Instant playback so the
   * same activation beats remain visible at a shorter duration.
   */
  timelinePlaybackRate?: number;
  /** Use only the source reveal; a named director owns the live consequence. */
  sourceOnly?: boolean;
  playbackMode?: LuminaryPlaybackMode;
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
      return { icon: '◇', label: `VICTORY REQUIREMENT ${sign}${step.amount}`, color: '#a78bfa' };
    }
    case 'affinityReturn': {
      const scope = step.playerIds.length > 1 ? ' ALL' : '';
      const amount = step.amount ? ` ${step.amount}` : '';
      return { icon: '◇', label: `RETURN${amount} AFFINITY${scope}`, color: '#60a5fa' };
    }
    case 'affinityGain': {
      const affinity = step.affinityType?.toUpperCase() ?? 'AFFINITY';
      return { icon: '✦', label: `+${step.amount} ${affinity}`, color: '#4ade80' };
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

function VictoryRequirementCue({
  procedure,
  active,
  reducedMotion,
  luminaryId,
  requirementBefore,
  requirementAfter,
  stepDurationMs = RESOLUTION_STEP_MS,
}: {
  procedure: AnimationProcedureStep[];
  active: boolean;
  reducedMotion: boolean;
  luminaryId: string;
  requirementBefore?: number;
  requirementAfter?: number;
  stepDurationMs?: number;
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
    if (!active || changeIndex < 0) return;
    if (reducedMotion) {
      setVisible(true);
      return;
    }
    const showTimer = setTimeout(
      () => setVisible(true),
      Math.max(0, visibleIndex) * stepDurationMs,
    );
    return () => clearTimeout(showTimer);
  }, [active, changeIndex, reducedMotion, stepDurationMs, visibleIndex]);

  if (!change || !visible) return null;
  return (
    <VictoryRequirementChangeOverlay
      amount={changeAmount}
      requirementBefore={requirementBefore}
      requirementAfter={requirementAfter}
      variant={luminaryId === 'lum_void' ? 'oblivion' : 'standard'}
      reducedMotion={reducedMotion}
      onComplete={() => setVisible(false)}
    />
  );
}

// ─── Timing ───────────────────────────────────────────────────────────────────
//
// Full variant — Total: 1960ms
//
// 0.00s–0.15s  ANTICIPATE  board dims and the activation sting begins
// 0.15s–0.55s  REVEAL      the Luminary resolves from silhouette
// 0.55s–1.10s  HOLD        effect identity registers without explanatory prose
// 1.10s–1.96s  PAN_OUT     source dissolves while the board camera reframes
//
// Reduced-motion variant — an opacity-only identity beat lasting at least the
// reveal and hold phases. It preserves effect identity without board travel.

export const ANTICIPATE_MS = 150;
export const REVEAL_MS = 400;
export const HOLD_MS = 550;
export const PAN_OUT_MS = 860;
// Total: 1960ms

// Reduced motion removes the large travel reveal, not the causal beat itself.
// Keep enough time for the source art to register before the effect director
// takes over, even when the Sequence Lab is accelerating the wider timeline.
const REDUCED_MIN_PRESENTATION_MS = 680;

/** Visual hold for each causal step after the source cinematic clears. */
export const RESOLUTION_STEP_MS = 500;
export const RESOLUTION_SETTLE_MS = 400;
export const MIN_RESOLUTION_MS = 1100;
const CONSEQUENCE_TARGET_MIN_MS = 500;
const CONSEQUENCE_RESOLVE_MS = 650;
const CONSEQUENCE_SETTLE_MS = 300;
const CONSEQUENCE_AFTERMATH_MS = 450;
/** Normal Burn visuals include target badges, BurnFlash, and Forge refill. */
export const BURN_RESOLUTION_MIN_MS = 2520;

// ── Entity keyframe animation ─────────────────────────────────────────────────
// The entity runs a single continuous framer-motion keyframe sequence from mount
// (at ANTICIPATE_MS) through the end of PAN_OUT.  No phase-driven transitions.
//
// Duration: REVEAL_MS + HOLD_MS + PAN_OUT_MS = 1810ms
//
// Opacity spec:     0% → 35% → 75% → 100% → 100% → 100% → 0%
// Scale spec:    0.82 → 0.88 → 0.94 → 1.00 → 1.00 → 1.00 → 1.08
//
// The entity reaches full visibility quickly, settles, holds, and then uses the
// long release window to reveal the camera's prepared consequence framing.
//
// Timing budget — do not regress:
//   ENTITY_DUR_MS = 400 + 550 + 860 = 1810ms
//   Overshoot at t=0.20 and settle at t=0.248 preserve an 87ms spring-back.
//   Full visibility holds through t=0.525, where PAN_OUT begins.

// Steeper fade-in: entity materialises quickly from nothing.
const ENTITY_OPACITY = [0,    0.35, 0.75, 1.0,  1.0,  1.0,  0   ];
const ENTITY_SCALE   = [0.82, 0.88, 0.94, 1.00, 1.00, 1.00, 1.12];
export const ENTITY_TIMES = [0, 0.088, 0.175, 0.20, 0.248, 0.525, 1];

// Desktop: wide descent + overshoot — entity falls from 30vh above, overshoots
// 10vh below center, then springs back to rest at 0vh before pan-out.
// Overshoot is 10vh so the downward dip and spring-back arch are clearly visible.
const ENTITY_Y_DESKTOP = ['-30vh', '-18vh', '-8vh', '10vh', '0vh', '0vh', '3vh'];
// Mobile: reduced travel and softer overshoot for smaller screens.
const ENTITY_Y_MOBILE  = ['-15vh', '-9vh',  '-4vh', '5vh',  '0vh', '0vh', '3vh'];

// Per-property easing for the Y channel: easeIn on the fall segments so the
// entity accelerates into the overshoot, then easeOut on the spring-back segment.
// The final pan-out segment keeps easeInOut.
const ENTITY_Y_EASE: Easing[] = ['easeIn', 'easeIn', 'easeOut', 'easeOut', 'linear', 'easeInOut'];

// ── Silhouette veil filter ─────────────────────────────────────────────────────
// Crisp dark silhouette: brightness/saturation only — no blur so the entity reads
// as a recognisable shadowy figure moving through space, not a misty dissolve.
// Filter values are now owned by the CSS keyframe `lum-entity-reveal` in index.css
// (replaced framer-motion filter animation to keep GPU filter changes off the JS
// thread). The percentages in that keyframe MUST stay in sync with ENTITY_TIMES.
// Index[3] and index[4] must match ENTITY_TIMES[3]/[4] — keep all three in sync.
export const ENTITY_FILTER_TIMES = [0, 0.088, 0.175, 0.20, 0.248, 0.525, 1];

// ── Effect beats (within HOLD_MS = 650ms window) ──────────────────────────────
// All offsets are absolute from hold-phase start.  All must complete before HOLD_MS expires.
export const BEAT_TARGET_MS = 150;
export const BEAT_SNAP_MS = 300;
export const BEAT_DONE_MS = 460;

// ─── Effect-type labels ───────────────────────────────────────────────────────

const EFFECT_TYPE_LABELS: Record<string, string> = {
  summon:        'ARRIVAL EFFECT',
  action:        'ASSIMILATION',
  end_of_turn:   'END OF TURN EFFECT',
  start_of_turn: 'START OF TURN EFFECT',
};

// ─── Component ────────────────────────────────────────────────────────────────

export function LuminaryActivationCinematic({
  luminaryId,
  effectType,
  luminaryName,
  triggeringPlayerName,
  queuePosition = 1,
  queueTotal = 1,
  procedure,
  victoryRequirementBefore,
  victoryRequirementAfter,
  onResolutionStart,
  prepareResolution,
  reducedMotion: reducedMotionProp,
  timelinePlaybackRate: timelinePlaybackRateProp = 1,
  sourceOnly = false,
  playbackMode = 'standard',
  onComplete,
}: LuminaryActivationCinematicProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Respect system prefers-reduced-motion OR the caller's abridgedAnims flag.
  const systemPrefersReduced = useReducedMotion();
  const isReduced = reducedMotionProp || !!systemPrefersReduced;
  const timelinePlaybackRate = Number.isFinite(timelinePlaybackRateProp)
    ? Math.max(1, timelinePlaybackRateProp)
    : 1;
  const atTimelineRate = (durationMs: number) => luminaryPacedDuration(
    durationMs,
    playbackMode,
    timelinePlaybackRate,
  );
  const isMobile = useIsMobile();
  const isDesktopShell =
    typeof navigator !== 'undefined' && navigator.userAgent.includes('Electron');
  const useLowCostRuntimeComposite = (isDesktopShell || isMobile) && !isReduced;
  const entityY = isMobile ? ENTITY_Y_MOBILE : ENTITY_Y_DESKTOP;
  const entityYInitial = isMobile ? ENTITY_Y_MOBILE[0] : ENTITY_Y_DESKTOP[0];

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
  const {
    entityCutout,
    entityRuntime,
    panelArt,
    panelRuntime,
    cinematicArt,
  } = getLuminaryImageAssets(luminaryId);

  // Cinematics use bounded textures on every web surface. Source-resolution
  // art remains available to inspection/detail views where it is static.
  const imageUrl = luminaryId === 'lum_hunger'
    ? entityRuntime ?? entityCutout ?? cinematicArt ?? panelRuntime ?? panelArt
    : cinematicArt ?? entityRuntime ?? entityCutout ?? panelRuntime ?? panelArt;

  const label = EFFECT_TYPE_LABELS[effectType] ?? 'EFFECT';
  const effectDef = LUMINARY_EFFECT_MAP[luminaryId] ?? null;
  const effectName = LUMINARY_ANIMATION_CONFIG[luminaryId]?.effectName ?? luminaryName;
  const visibleProcedureSteps = getVisibleProcedureSteps(procedure ?? []);
  const sourceHoldMs = atTimelineRate(HOLD_MS);
  const resolutionStepMs = atTimelineRate(RESOLUTION_STEP_MS);
  const victoryRequirementChangeIndex = (procedure ?? []).findIndex(step => (
    step.type === 'victoryRequirementChange' ||
    (step.type === 'residue' && step.victoryRequirementChange !== undefined)
  ));
  const victoryRequirementVisibleIndex = victoryRequirementChangeIndex >= 0
    ? getVisibleProcedureSteps(
        (procedure ?? []).slice(0, victoryRequirementChangeIndex + 1),
      ).length - 1
    : -1;
  const victoryRequirementPresentationMs = isReduced
    ? REDUCED_VICTORY_THRESHOLD_PRESENTATION_MS
    : VICTORY_THRESHOLD_PRESENTATION_MS;
  const hasBurnProcedure = (procedure ?? []).some(step => (
    (step.type === 'keywordEvent' && step.keyword === 'burn') ||
    (step.type === 'keywordEvents' && step.events.some(event => event.keyword === 'burn'))
  ));
  const resolutionDurationMs = Math.max(
    atTimelineRate(MIN_RESOLUTION_MS),
    hasBurnProcedure ? atTimelineRate(BURN_RESOLUTION_MIN_MS) : 0,
    visibleProcedureSteps.length * resolutionStepMs +
      atTimelineRate(RESOLUTION_SETTLE_MS),
    victoryRequirementVisibleIndex >= 0
      ? Math.max(0, victoryRequirementVisibleIndex) * resolutionStepMs +
        victoryRequirementPresentationMs
      : 0,
  );
  const reducedPresentationDurationMs = Math.max(
    atTimelineRate(REDUCED_MIN_PRESENTATION_MS),
    atTimelineRate(REVEAL_MS + HOLD_MS),
  );
  const entityDurationS = (
    atTimelineRate(REVEAL_MS) + sourceHoldMs + atTimelineRate(PAN_OUT_MS)
  ) / 1000;
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
    let resolutionPreparation: Promise<void> | null = null;
    const ensureResolutionPrepared = () => {
      if (!resolutionPreparation) {
        resolutionPreparation = (prepareResolution?.() ?? Promise.resolve())
          .catch(() => undefined);
      }
      return resolutionPreparation;
    };
    const consequenceTailMs = atTimelineRate(
      CONSEQUENCE_RESOLVE_MS +
      CONSEQUENCE_SETTLE_MS +
      CONSEQUENCE_AFTERMATH_MS,
    );
    const targetHoldMs = Math.max(
      atTimelineRate(CONSEQUENCE_TARGET_MIN_MS),
      resolutionDurationMs - consequenceTailMs,
    );
    const phases = isReduced
      ? [
          {
            id: 'announce' as const,
            durationMs: reducedPresentationDurationMs,
            reducedDurationMs: reducedPresentationDurationMs,
            run: () => {
              setPhase('hold');
              setEffectBeat('idle');
            },
          },
          {
            id: 'frame' as const,
            run: async () => {
              await ensureResolutionPrepared();
              startResolutionOnce();
            },
          },
          ...(!sourceOnly ? [
            {
              id: 'target' as const,
              durationMs: targetHoldMs,
              reducedDurationMs: targetHoldMs,
              run: () => {
                setPhase('resolve');
                setEffectBeat(effectDef ? 'target' : 'idle');
              },
            },
            {
              id: 'resolve' as const,
              durationMs: atTimelineRate(CONSEQUENCE_RESOLVE_MS),
              reducedDurationMs: atTimelineRate(CONSEQUENCE_RESOLVE_MS),
              run: () => setEffectBeat(effectDef ? 'snap' : 'idle'),
            },
            {
              id: 'reveal' as const,
              durationMs: atTimelineRate(CONSEQUENCE_SETTLE_MS),
              reducedDurationMs: atTimelineRate(120),
              run: () => setEffectBeat('done'),
            },
          ] : []),
          {
            id: 'aftermath' as const,
            durationMs: sourceOnly ? 0 : atTimelineRate(CONSEQUENCE_AFTERMATH_MS),
            reducedDurationMs: sourceOnly ? 0 : atTimelineRate(CONSEQUENCE_AFTERMATH_MS),
          },
        ]
      : [
          {
            id: 'announce' as const,
            run: async ({ wait }: { wait: (durationMs: number) => Promise<void> }) => {
              setPhase('anticipate');
              setEffectBeat('idle');
              await wait(atTimelineRate(ANTICIPATE_MS));
              setPhase('reveal');
              await wait(atTimelineRate(REVEAL_MS));
              setPhase('hold');
              await wait(sourceHoldMs);
            },
          },
          {
            id: 'frame' as const,
            run: async ({ wait }: { wait: (durationMs: number) => Promise<void> }) => {
              setPhase('pan_out');
              await Promise.all([
                wait(atTimelineRate(PAN_OUT_MS)),
                ensureResolutionPrepared(),
              ]);
              startResolutionOnce();
            },
          },
          ...(!sourceOnly ? [
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
              durationMs: atTimelineRate(CONSEQUENCE_RESOLVE_MS),
              run: () => setEffectBeat(effectDef ? 'snap' : 'idle'),
            },
            {
              id: 'reveal' as const,
              durationMs: atTimelineRate(CONSEQUENCE_SETTLE_MS),
              run: () => setEffectBeat('done'),
            },
          ] : []),
          {
            id: 'aftermath' as const,
            durationMs: sourceOnly ? 0 : atTimelineRate(CONSEQUENCE_AFTERMATH_MS),
          },
        ];

    const activationFade = isReduced
      ? {
          fadeInMs: atTimelineRate(120),
          fadeOutStartMs: Math.max(
            atTimelineRate(360),
            reducedPresentationDurationMs - atTimelineRate(320),
          ),
          fadeOutMs: atTimelineRate(260),
        }
      : {
        fadeInMs:       atTimelineRate(ANTICIPATE_MS),
        fadeOutStartMs:
          atTimelineRate(ANTICIPATE_MS + REVEAL_MS) + sourceHoldMs,
        fadeOutMs:      atTimelineRate(PAN_OUT_MS),
      };
    gameAudio.playActivationSting(effectType, primaryColor, activationFade);

    const sequence = createLuminaryEffectSequence({
      phases,
      reducedMotion: isReduced,
      onPhaseChange: nextPhase => {
        setDirectorPhase(nextPhase);
        if (!sourceOnly) {
          playLuminaryEffectPhaseSound(luminaryId, nextPhase, primaryColor);
        }
      },
      onSkip: () => {
        gameAudio.stopActivationSting();
        setPhase('done');
      },
      onComplete: (skipped) => {
        gameAudio.stopActivationSting();
        setPhase('done');
        void ensureResolutionPrepared().then(() => {
          startResolutionOnce();
          onCompleteRef.current(skipped);
        });
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

  const handleAdvance = () => sequenceRef.current?.advance();
  const handleSkip = () => sequenceRef.current?.skip();

  // ── Derived state ─────────────────────────────────────────────────────────

  // Beat visibility flags (shared between full and reduced render paths)
  const snapVisible   = effectDef !== null && effectBeat === 'snap';
  if (phase === 'done') return null;

  // ── Reduced-motion render ─────────────────────────────────────────────────
  // Compact overlay: a brief source pulse, effect label, procedure timeline,
  // and name. It omits board zoom and slow travel but never erases activation.
  if (isReduced) {
    const showingSource = directorPhase === 'announce' || sourceOnly;
    const reducedContent = (
      <div
        data-testid="luminary-activation-cinematic"
        data-luminary-id={luminaryId}
        data-effect-type={effectType}
        data-effect-phase={directorPhase}
        data-presentation-mode="compact"
        data-playback-mode={playbackMode}
        data-timeline-playback-rate={timelinePlaybackRate}
        className="fixed inset-0"
        style={{ zIndex: 8900, pointerEvents: 'auto', cursor: 'pointer', userSelect: 'none' }}
        onClick={handleAdvance}
      >
        {showingSource && (
          <div
            className="absolute inset-0"
            style={{ background: 'rgba(4,2,16,0.66)', pointerEvents: 'none' }}
          />
        )}

        {/* Colored accent bar at top — quick visual anchor keyed to this Luminary */}
        <div
          className="absolute top-0 inset-x-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, transparent, ${primaryColor}88, transparent)`, pointerEvents: 'none' }}
        />

        {showingSource && <motion.div
          data-testid="luminary-activation-entity"
          className="absolute inset-0 flex items-center justify-center"
          initial={{ opacity: 0.16, scale: 0.97 }}
          animate={{
            opacity: [0.16, 0.88, 0.78, 0.18],
            scale: [0.97, 1, 1.015, 1.04],
          }}
          transition={{
            duration: reducedPresentationDurationMs / 1000,
            times: [0, 0.18, 0.76, 1],
            ease: 'easeInOut',
          }}
          style={{ pointerEvents: 'none' }}
          aria-hidden="true"
        >
          <div
            className="absolute h-[48vmin] w-[48vmin] rounded-full"
            style={{
              background: `radial-gradient(circle, ${primaryColor}32 0%, ${primaryColor}14 42%, transparent 72%)`,
              boxShadow: `0 0 54px ${primaryColor}24`,
            }}
          />
          <motion.div
            className="absolute h-[42vmin] w-[42vmin] rounded-full border"
            initial={{ opacity: 0.25, scale: 0.78 }}
            animate={{ opacity: [0.25, 0.72, 0], scale: [0.78, 1, 1.16] }}
            transition={{
              duration: reducedPresentationDurationMs / 1000,
              times: [0, 0.28, 1],
              ease: 'easeOut',
            }}
            style={{
              borderColor: `${primaryColor}88`,
              boxShadow: `inset 0 0 26px ${primaryColor}24, 0 0 30px ${primaryColor}30`,
            }}
          />
          {luminaryId === 'lum_radiant' ? (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <RadiantLivingEntityComposite size="58vmin" runtime animate={false} />
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt=""
              draggable={false}
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              style={{
                position: 'relative',
                zIndex: 1,
                width: 'min(68vw, 430px)',
                height: 'min(70vh, 560px)',
                objectFit: 'contain',
                filter: `drop-shadow(0 0 30px ${primaryColor}88)`,
              }}
            />
          ) : (
            <EntityArt size={220} />
          )}
        </motion.div>}

        {/* Keep the announcement below the source rather than covering the art. */}
        {showingSource && <div
          className="absolute inset-x-0 flex flex-col items-center gap-2 px-4"
          style={{ bottom: 'max(3.5rem, env(safe-area-inset-bottom))', pointerEvents: 'none', zIndex: 1 }}
        >
          <LuminaryEffectAnnouncement
            effectName={effectName}
            luminaryName={luminaryName}
            description={undefined}
            triggeringPlayerName={triggeringPlayerName}
            queueLabel={queueLabel}
            primaryColor={primaryColor}
            secondaryColor={primaryColor}
            compact
          />

        </div>}

        {!sourceOnly && !showingSource && (
          <VictoryRequirementCue
            procedure={procedure ?? []}
            active
            reducedMotion
            luminaryId={luminaryId}
            requirementBefore={victoryRequirementBefore}
            requirementAfter={victoryRequirementAfter}
            stepDurationMs={resolutionStepMs}
          />
        )}

        <LuminaryEffectSkipControl
          color={primaryColor}
          onAdvance={handleAdvance}
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

  const showResolution = !sourceOnly && phase === 'resolve';
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
      data-presentation-mode="full"
      data-playback-mode={playbackMode}
      data-timeline-playback-rate={timelinePlaybackRate}
      className="fixed inset-0"
      style={{ zIndex: 8900, pointerEvents: 'auto', userSelect: 'none' }}
    >
      {/* ── Board dim overlay ────────────────────────────────────────────────
           Fades in over ANTICIPATE_MS, fades out over PAN_OUT_MS.          */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: overlayOpacity }}
        transition={{
          duration: isPanOut
            ? atTimelineRate(PAN_OUT_MS) / 1000 * 0.65
            : (atTimelineRate(REVEAL_MS) / 1000) * 0.4,
          ease: 'easeInOut',
        }}
        style={{ background: 'rgba(4,2,16,1)', pointerEvents: 'none' }}
      />

      {/* ── Luminary entity ──────────────────────────────────────────────────
           Single continuous keyframe sequence from mount.  Opacity/scale
           follow the spec curve exactly — no per-phase animate overrides.
           Entity mounts after the 90ms anticipation and clears in under a second. */}
      {showEntity && (
        <motion.div
          key="entity"
          data-testid="luminary-activation-entity"
          className={`absolute inset-0 flex items-center justify-center${useLowCostRuntimeComposite ? '' : ' lum-entity-reveal'}`}
          style={{ pointerEvents: 'none', animationDuration: `${entityDurationS}s` }}
          initial={{ opacity: 0, scale: 0.88, y: entityYInitial }}
          animate={{
            opacity: ENTITY_OPACITY,
            scale:   ENTITY_SCALE,
            y:       entityY,
          }}
          transition={{
            duration: entityDurationS,
            times:    ENTITY_TIMES,
            ease:     'easeInOut',
            y: {
              duration: entityDurationS,
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

          {/* Concordance always uses alpha-bearing layers. Low-cost devices use
              smaller runtime layers without persistent ambient animation. */}
          {luminaryId === 'lum_radiant' ? (
            <div style={{ position: 'relative', zIndex: 1 }}>
              <RadiantLivingEntityComposite
                size={useLowCostRuntimeComposite ? '72vmin' : '78vmin'}
                runtime={useLowCostRuntimeComposite}
                animate={!useLowCostRuntimeComposite}
              />
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
            animate={{ opacity: 1, y: 0, transition: { duration: 0.2, delay: 0.05, ease: 'easeOut' as const } }}
            exit={{ opacity: 0, transition: { duration: 0.18 } }}
          >
            <LuminaryEffectAnnouncement
              effectName={effectName}
              luminaryName={luminaryName}
              description={undefined}
              triggeringPlayerName={triggeringPlayerName}
              queueLabel={queueLabel}
              primaryColor={primaryColor}
              secondaryColor={primaryColor}
              compact
            />

          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showResolution && procedure && (
          <VictoryRequirementCue
            procedure={procedure}
            active={showResolution}
            reducedMotion={false}
            luminaryId={luminaryId}
            requirementBefore={victoryRequirementBefore}
            requirementAfter={victoryRequirementAfter}
            stepDurationMs={resolutionStepMs}
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
              onAdvance={handleAdvance}
              onSkip={handleSkip}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  return createPortal(content, document.body);
}
