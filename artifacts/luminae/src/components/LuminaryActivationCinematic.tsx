import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getLuminaryVisuals, getLuminaryImageAssets, RadiantLivingEntityComposite } from '@/lib/luminaryAssets';
import { gameAudio } from '@/lib/audio';
import {
  LUMINARY_EFFECT_MAP,
  TargetBadge,
  ConsequenceSnap,
} from '@/components/LuminaryEffectOverlay';

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
  onComplete: () => void;
}

// ─── Timing ───────────────────────────────────────────────────────────────────
//
// Total: 2100ms
//
// 0.00s–0.15s  ANTICIPATE  board dims, anticipation pulse — no entity yet
// 0.15s–0.70s  REVEAL      entity grows + fades in (opacity 0→1, scale 0.88→1.0)
// 0.70s–1.25s  HOLD        peak bloom + effect beats fire (opacity 1.0, short linger)
// 1.25s–2.10s  PAN_OUT     dissolve outward (opacity 1.0→0.75→0, scale →1.12)

const ANTICIPATE_MS = 150;   // 0.00–0.15s
const REVEAL_MS     = 550;   // 0.15–0.70s
const HOLD_MS       = 550;   // 0.70–1.25s
const PAN_OUT_MS    = 850;   // 1.25–2.10s
// Total: 2100ms

// Hold-to-skip duration in ms
const HOLD_TO_SKIP_MS = 350;

// ── Entity keyframe animation ─────────────────────────────────────────────────
// The entity runs a single continuous framer-motion keyframe sequence from mount
// (at ANTICIPATE_MS) through the end of PAN_OUT.  No phase-driven transitions.
//
// Duration: REVEAL_MS + HOLD_MS + PAN_OUT_MS = 1950ms
//
// Opacity spec:    0% → 70% → 100% → 100% → 75% → 0%
// Scale spec:   0.88 → 0.93 → 1.00 → 1.00 → 1.04 → 1.12
//
// Absolute times:  0.15s  0.35s  0.70s  1.05s  1.25s  2.10s
// Entity-relative: 0ms    200ms  550ms  900ms  1100ms 1950ms
// Normalized [0,1]: 0.000  0.103  0.282  0.462  0.564  1.000

const ENTITY_DUR_S = (REVEAL_MS + HOLD_MS + PAN_OUT_MS) / 1000; // 1.95

// Bump times[1] opacity to 0.90 so the silhouette reads as a solid dark shape
// rather than a translucent ghost — the filter below keeps it near-black anyway.
const ENTITY_OPACITY = [0,    0.90, 1.0,  1.0,  0.75, 0   ];
const ENTITY_SCALE   = [0.88, 0.93, 1.00, 1.00, 1.04, 1.12];
const ENTITY_Y       = ['-2vh', '-1vh', '0vh', '0vh', '0.5vh', '3vh'];
const ENTITY_TIMES   = [0, 0.103, 0.282, 0.462, 0.564, 1];

// ── Silhouette veil filter ─────────────────────────────────────────────────────
// Entity appears as a dark, blurry, desaturated silhouette during the REVEAL
// build-up.  At the audio "boom" (HOLD start, ~700ms absolute), the filter
// snaps to overbright + crisp in a single near-instantaneous keyframe jump
// (0.279 → 0.285 = ~11ms), then settles to normal colour for the HOLD phase.
//
// Uses its own 7-keyframe times array so the snap window is independent of the
// 6-keyframe opacity/scale/y curve.
const ENTITY_FILTER_TIMES = [0, 0.103, 0.279, 0.285, 0.462, 0.564, 1];
const ENTITY_FILTER = [
  'brightness(0.05) saturate(0) blur(5px)',    // 0      — pure dark silhouette
  'brightness(0.07) saturate(0) blur(5px)',    // 0.103  — still shadowed
  'brightness(0.07) saturate(0) blur(5px)',    // 0.279  — just before boom
  'brightness(1.50) saturate(1.15) blur(0px)', // 0.285  — BOOM: overbright snap
  'brightness(1.0)  saturate(1.0)  blur(0px)', // 0.462  — settle to natural colour
  'brightness(0.75) saturate(1.0)  blur(0px)', // 0.564  — begin fade-out
  'brightness(0)    saturate(1.0)  blur(0px)', // 1      — gone
];

// ── Effect beats (within HOLD_MS = 550ms window) ──────────────────────────────
// All offsets are absolute from hold-phase start.  All must complete before HOLD_MS expires.
const BEAT_TARGET_MS = 150;
const BEAT_SNAP_MS   = 300;
const BEAT_DONE_MS   = 460;

// CSS scale applied to [data-game-board] during the cinematic
const BOARD_SCALE = 0.50;

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
  onComplete,
}: LuminaryActivationCinematicProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Shared completed flag — readable by both the timer chain cleanup and the
  // skip handler.  Using a ref avoids stale-closure issues.
  const completedRef = useRef(false);

  // Timer handles held in refs so the skip handler can cancel them without
  // needing access to the useEffect closure.
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [phase, setPhase] = useState<Phase>('anticipate');
  const [effectBeat, setEffectBeat] = useState<EffectBeat>('idle');

  // ── Hold-to-skip state ─────────────────────────────────────────────────────
  const [holdProgress, setHoldProgress] = useState(0); // 0–1
  const holdStartRef = useRef<number | null>(null);
  const holdRafRef   = useRef<number | null>(null);

  const vis = getLuminaryVisuals(luminaryId);
  const { primaryColor, EntityArt } = vis;
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
    setPhase('done');
    onCompleteRef.current();
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

  // ── Phase timer chain ─────────────────────────────────────────────────────
  useEffect(() => {
    gameAudio.playActivationSting(effectType, primaryColor);

    const t1 = setTimeout(() => setPhase('reveal'),  ANTICIPATE_MS);
    const t2 = setTimeout(() => setPhase('hold'),    ANTICIPATE_MS + REVEAL_MS);
    const t3 = setTimeout(() => setPhase('pan_out'), ANTICIPATE_MS + REVEAL_MS + HOLD_MS);
    const t4 = setTimeout(() => {
      completedRef.current = true;
      setPhase('done');
      onCompleteRef.current();
    }, ANTICIPATE_MS + REVEAL_MS + HOLD_MS + PAN_OUT_MS);

    timersRef.current = [t1, t2, t3, t4];

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      // If unmounted before t4 fired, drain the event queue immediately so
      // the animation state machine never stalls.
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

  // ── Board DOM zoom-out ────────────────────────────────────────────────────
  useEffect(() => {
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
  }, [phase]);

  // ── Derived state ─────────────────────────────────────────────────────────
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

  // Beat visibility flags
  const targetVisible = effectDef !== null && (effectBeat === 'target' || effectBeat === 'snap');
  const snapVisible   = effectDef !== null && effectBeat === 'snap';

  const showSkipHint = phase === 'reveal' || phase === 'hold' || phase === 'pan_out';

  if (phase === 'done') return null;

  const content = (
    <div
      className="fixed inset-0"
      style={{ zIndex: 8900, pointerEvents: 'auto', cursor: 'pointer', userSelect: 'none' }}
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onPointerCancel={cancelHold}
    >
      {/* ── Board dim overlay ────────────────────────────────────────────────
           Fades in over ANTICIPATE_MS, fades out over PAN_OUT_MS.          */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: overlayOpacity }}
        transition={{
          duration: isPanOut ? PAN_OUT_MS / 1000 * 0.65 : ANTICIPATE_MS / 1000,
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
          className="absolute inset-0 flex items-center justify-center"
          style={{ pointerEvents: 'none' }}
          initial={{ opacity: 0, scale: 0.88, y: '-2vh', filter: ENTITY_FILTER[0] }}
          animate={{
            opacity: ENTITY_OPACITY,
            scale:   ENTITY_SCALE,
            y:       ENTITY_Y,
            filter:  ENTITY_FILTER,
          }}
          transition={{
            duration: ENTITY_DUR_S,
            times:    ENTITY_TIMES,
            ease:     'easeInOut',
            filter: {
              duration: ENTITY_DUR_S,
              times:    ENTITY_FILTER_TIMES,
              ease:     'linear',
            },
          }}
        >
          {/* Colored glow bloom behind the entity — animated for lum_radiant */}
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
                height: '92vh',
                width: 'auto',
                maxWidth: '92vw',
                objectFit: 'contain',
                display: 'block',
                position: 'relative',
                zIndex: 1,
                filter: `drop-shadow(0 0 52px ${primaryColor}72) drop-shadow(0 0 100px ${primaryColor}38)`,
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
                filter: `drop-shadow(0 0 52px ${primaryColor}88)`,
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: 0.45, delay: 0.28, ease: 'easeOut' as const } }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
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

            {/* Beat 4 — Target claim badge (appears BEAT_TARGET_MS into hold) */}
            <AnimatePresence>
              {targetVisible && effectDef && (
                <TargetBadge
                  key="target-badge"
                  tone={effectDef.tone}
                  target={effectDef.target}
                  isLingering={effectDef.isLingering}
                />
              )}
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
