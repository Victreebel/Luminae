import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { getLuminaryVisuals, getLuminaryImageAssets, RadiantLivingEntityComposite } from '@/lib/luminaryAssets';
import { gameAudio } from '@/lib/audio';
import {
  LUMINARY_EFFECT_MAP,
  AuraExpansion,
  TargetBadge,
  ConsequenceSnap,
} from '@/components/LuminaryEffectOverlay';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'zoom_out' | 'reveal' | 'hold' | 'pan_out' | 'done';

// Internal beat sequence that fires during the hold phase.
// beat 3: sigil  — affinity rings appear
// beat 4: target — target claim badge appears
// beat 5: snap   — consequence flash fires once then fades
type EffectBeat = 'idle' | 'sigil' | 'target' | 'snap' | 'done';

interface LuminaryActivationCinematicProps {
  luminaryId: string;
  effectType: 'summon' | 'end_of_turn' | 'start_of_turn';
  luminaryName: string;
  triggeringPlayerName?: string;
  onComplete: () => void;
}

// ─── Timing ───────────────────────────────────────────────────────────────────

const ZOOM_OUT_MS  = 720;   // board scales down, dim fades in
const REVEAL_MS    = 680;   // entity fades + scales in from above
const HOLD_MS      = 1900;  // linger at full opacity
const PAN_OUT_MS   = 980;   // entity drifts + fades, board restores

// Effect beats fire within the hold phase (must all complete before HOLD_MS)
const BEAT_SIGIL_MS  = 0;    // relative to hold start
const BEAT_TARGET_MS = 360;
const BEAT_SNAP_MS   = 760;
const BEAT_DONE_MS   = 1160;

// CSS scale applied to [data-game-board] during the cinematic
const BOARD_SCALE = 0.50;

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
  triggeringPlayerName,
  onComplete,
}: LuminaryActivationCinematicProps) {
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const [phase, setPhase] = useState<Phase>('zoom_out');
  const [effectBeat, setEffectBeat] = useState<EffectBeat>('idle');

  const vis = getLuminaryVisuals(luminaryId);
  const { primaryColor, EntityArt } = vis;
  const { entityCutout, panelArt } = getLuminaryImageAssets(luminaryId);

  // Best available image: transparent entity cutout > panel art > EntityArt component
  const imageUrl = entityCutout ?? panelArt;

  const label = EFFECT_TYPE_LABELS[effectType] ?? 'EFFECT';
  const effectDef = LUMINARY_EFFECT_MAP[luminaryId] ?? null;

  // ── Phase timer chain ─────────────────────────────────────────────────────
  useEffect(() => {
    gameAudio.playActivationSting(effectType, primaryColor);

    const totalMs = ZOOM_OUT_MS + REVEAL_MS + HOLD_MS + PAN_OUT_MS;

    const t1 = setTimeout(() => setPhase('reveal'),  ZOOM_OUT_MS);
    const t2 = setTimeout(() => setPhase('hold'),    ZOOM_OUT_MS + REVEAL_MS);
    const t3 = setTimeout(() => setPhase('pan_out'), ZOOM_OUT_MS + REVEAL_MS + HOLD_MS);
    const t4 = setTimeout(() => {
      setPhase('done');
      onCompleteRef.current();
    }, totalMs);

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Effect beat chain (within hold phase) ─────────────────────────────────
  // Beats 3-5 fire sequentially during HOLD_MS.  They are skipped if there is
  // no effect descriptor for this Luminary (e.g. passive effects).
  useEffect(() => {
    if (phase !== 'hold' || !effectDef) {
      setEffectBeat('idle');
      return;
    }
    setEffectBeat('sigil');
    const timers: ReturnType<typeof setTimeout>[] = [];
    if (BEAT_TARGET_MS > BEAT_SIGIL_MS) {
      timers.push(setTimeout(() => setEffectBeat('target'), BEAT_TARGET_MS - BEAT_SIGIL_MS));
    }
    timers.push(setTimeout(() => setEffectBeat('snap'),   BEAT_SNAP_MS   - BEAT_SIGIL_MS));
    timers.push(setTimeout(() => setEffectBeat('done'),   BEAT_DONE_MS   - BEAT_SIGIL_MS));
    return () => timers.forEach(clearTimeout);
  }, [phase, effectDef]);

  // ── Board DOM zoom-out ────────────────────────────────────────────────────
  useEffect(() => {
    const board = document.querySelector('[data-game-board]') as HTMLElement | null;
    if (!board) return;

    if (phase === 'zoom_out') {
      board.scrollTop = 0;
      board.style.transition      = `transform ${ZOOM_OUT_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`;
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
  const showEntity = phase === 'reveal' || phase === 'hold' || phase === 'pan_out';
  const showText   = phase === 'reveal' || phase === 'hold';
  const isPanOut   = phase === 'pan_out';

  const entityOpacity  = isPanOut ? 0 : 1;
  const entityScale    = isPanOut ? 0.78 : 1.0;
  const entityY        = isPanOut ? '6vh' : '0';

  const overlayOpacity =
    phase === 'zoom_out' ? 0.60 :
    phase === 'reveal'   ? 0.72 :
    phase === 'hold'     ? 0.75 :
    0;

  // Beat visibility flags
  const sigilVisible  = effectDef !== null && (effectBeat === 'sigil' || effectBeat === 'target' || effectBeat === 'snap');
  const targetVisible = effectDef !== null && (effectBeat === 'target' || effectBeat === 'snap');
  const snapVisible   = effectDef !== null && effectBeat === 'snap';

  if (phase === 'done') return null;

  const content = (
    <div
      className="fixed inset-0"
      style={{ zIndex: 8900, pointerEvents: 'none' }}
    >
      {/* ── Beat 1: Dark board dim ──────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: overlayOpacity }}
        transition={{
          duration: isPanOut ? PAN_OUT_MS / 1000 * 0.65 : ZOOM_OUT_MS / 1000,
          ease: 'easeInOut',
        }}
        style={{ background: 'rgba(4,2,16,1)', pointerEvents: 'none' }}
      />

      {/* ── Beat 3: Aura expansion ──────────────────────────────────────────
           Rendered BEFORE the entity in DOM order so it paints behind it.   */}
      {showEntity && effectDef && (
        <AuraExpansion
          affinities={effectDef.affinities}
          primaryColor={primaryColor}
          visible={sigilVisible}
        />
      )}

      {/* ── Beat 2: Luminary entity ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showEntity && (
          <motion.div
            key="entity"
            className="absolute inset-0 flex items-center justify-center"
            style={{ pointerEvents: 'none' }}
            initial={{ opacity: 0, scale: 1.22, y: '-3vh' }}
            animate={{
              opacity: entityOpacity,
              scale:   entityScale,
              y:       entityY,
              transition: isPanOut
                ? { duration: PAN_OUT_MS / 1000, ease: [0.4, 0, 1, 1] as [number,number,number,number] }
                : { duration: REVEAL_MS / 1000, ease: [0.22, 1, 0.36, 1] as [number,number,number,number] },
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
      </AnimatePresence>

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

            {/* Beat 4 — Target claim badge (appears 360ms into hold) */}
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
    </div>
  );

  return createPortal(content, document.body);
}
