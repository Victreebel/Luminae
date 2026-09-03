import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { gameAudio } from '@/lib/audio';
import { EminenceSigil } from '@/pages/game-card';

export type VictoryRequirementChangeVariant = 'standard' | 'oblivion';

export const VICTORY_THRESHOLD_PRESENTATION_MS = 2_650;
export const REDUCED_VICTORY_THRESHOLD_PRESENTATION_MS = 1_050;

interface VictoryRequirementChangeOverlayProps {
  amount: number;
  requirementBefore?: number;
  requirementAfter?: number;
  variant?: VictoryRequirementChangeVariant;
  reducedMotion?: boolean;
  onComplete?: () => void;
}

export function VictoryRequirementChangeOverlay({
  amount,
  requirementBefore,
  requirementAfter,
  variant = 'standard',
  reducedMotion = false,
  onComplete,
}: VictoryRequirementChangeOverlayProps) {
  const before = requirementBefore ?? (
    requirementAfter !== undefined ? requirementAfter - amount : undefined
  );
  const after = requirementAfter ?? (
    before !== undefined ? before + amount : undefined
  );
  const [displayRequirement, setDisplayRequirement] = useState(before ?? after);
  const startedAudioRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const durationMs = reducedMotion
    ? REDUCED_VICTORY_THRESHOLD_PRESENTATION_MS
    : VICTORY_THRESHOLD_PRESENTATION_MS;
  const countValues = useMemo(() => {
    if (before === undefined || after === undefined || before === after) return [];
    const direction = after > before ? 1 : -1;
    return Array.from(
      { length: Math.abs(after - before) },
      (_, index) => before + direction * (index + 1),
    );
  }, [after, before]);

  useEffect(() => {
    setDisplayRequirement(before ?? after);

    if (!startedAudioRef.current) {
      startedAudioRef.current = true;
      if (variant === 'oblivion') {
        gameAudio.playOblivionThresholdShift(amount);
      } else {
        gameAudio.playVictoryRequirementShift(amount);
      }
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const countStartMs = reducedMotion ? 260 : 760;
    const countWindowMs = reducedMotion ? 260 : 940;
    countValues.forEach((value, index) => {
      const progress = (index + 1) / countValues.length;
      timers.push(setTimeout(
        () => setDisplayRequirement(value),
        countStartMs + progress * countWindowMs,
      ));
    });
    timers.push(setTimeout(() => onCompleteRef.current?.(), durationMs));

    return () => timers.forEach(clearTimeout);
  }, [after, amount, before, countValues, durationMs, reducedMotion, variant]);

  if (typeof document === 'undefined') return null;

  const isOblivion = variant === 'oblivion';
  const signedAmount = `${amount >= 0 ? '+' : ''}${amount}`;
  const ariaLabel = after !== undefined && before !== undefined
    ? `Victory requirement increased from ${before} to ${after}`
    : `Victory requirement changed by ${signedAmount}`;

  return createPortal(
    <motion.div
      data-testid="victory-requirement-change"
      data-variant={variant}
      data-requirement-before={before}
      data-requirement-after={after}
      role="status"
      aria-live="assertive"
      aria-label={ariaLabel}
      className="fixed inset-0 z-[9600] grid place-items-center overflow-hidden pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reducedMotion ? 0.08 : 0.18 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: isOblivion
            ? 'radial-gradient(circle at center, rgba(20,8,38,0.3) 0%, rgba(2,1,8,0.82) 68%, rgba(0,0,0,0.9) 100%)'
            : 'radial-gradient(circle at center, rgba(72,47,15,0.32) 0%, rgba(3,4,12,0.74) 72%, rgba(0,0,0,0.82) 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isOblivion ? [0, 0.9, 0.76] : [0, 0.82, 0.68] }}
        transition={{ duration: reducedMotion ? 0.2 : 0.72, ease: 'easeOut' }}
      />

      {isOblivion && !reducedMotion && (
        <div
          data-testid="oblivion-void-pulse"
          className="absolute inset-0 grid place-items-center"
          aria-hidden="true"
        >
          {[0, 1, 2].map((ring) => (
            <motion.div
              key={ring}
              className="absolute aspect-square w-[min(44vw,28rem)] rounded-full border"
              style={{
                borderColor: ring === 0
                  ? 'rgba(216,180,254,0.72)'
                  : 'rgba(126,68,184,0.48)',
                background: ring === 0
                  ? 'radial-gradient(circle, rgba(0,0,0,0.94) 0 34%, rgba(37,13,62,0.7) 58%, transparent 72%)'
                  : 'transparent',
                boxShadow: ring === 0
                  ? 'inset 0 0 0 1px rgba(255,255,255,0.08)'
                  : 'none',
              }}
              initial={{ scale: 0.12, opacity: 0 }}
              animate={{
                scale: [0.12, 0.3, 2.5 + ring * 0.42],
                opacity: [0, 0.82 - ring * 0.14, 0],
              }}
              transition={{
                duration: 2.05,
                delay: ring * 0.14,
                times: [0, 0.18, 1],
                ease: [0.16, 0.78, 0.28, 1],
              }}
            />
          ))}
        </div>
      )}

      <motion.div
        className="relative z-[2] flex flex-col items-center text-center"
        initial={{ opacity: 0, scale: reducedMotion ? 0.96 : 0.68, y: 12 }}
        animate={isOblivion && !reducedMotion ? {
          opacity: [0, 1, 1, 0.96],
          scale: [0.68, 1.08, 0.98, 1],
          x: [0, -2, 2, 0],
          y: [12, 0, -1, 0],
        } : {
          opacity: [0, 1, 1],
          scale: [0.92, 1.04, 1],
          y: [8, 0, 0],
        }}
        transition={{
          duration: reducedMotion ? 0.28 : 1.15,
          times: isOblivion && !reducedMotion ? [0, 0.44, 0.72, 1] : [0, 0.58, 1],
          ease: 'easeOut',
        }}
      >
        <motion.div
          data-testid="victory-threshold-sigil"
          className="relative grid place-items-center"
        >
          <motion.span
            className="absolute h-[72%] w-[72%] rounded-full"
            style={{
              background: isOblivion
                ? 'radial-gradient(circle, rgba(216,180,254,0.42), rgba(109,40,217,0.13) 48%, transparent 72%)'
                : 'radial-gradient(circle, rgba(253,224,71,0.34), rgba(180,83,9,0.1) 52%, transparent 74%)',
            }}
            animate={reducedMotion ? { opacity: 0.58 } : {
              opacity: [0.18, 0.84, 0.38],
              scale: [0.68, 1.26, 0.96],
            }}
            transition={{ duration: 1.65, times: [0, 0.46, 1], ease: 'easeOut' }}
            aria-hidden="true"
          />
          <EminenceSigil
            size={reducedMotion ? 104 : 136}
            value={Math.max(1, displayRequirement ?? 1)}
            target={Math.max(1, displayRequirement ?? 1)}
          />
        </motion.div>

        <p
          className="mt-3 text-[0.68rem] font-bold uppercase text-amber-100/80"
          style={{ letterSpacing: '0.16em' }}
        >
          Victory requirement
        </p>
        <motion.div
          key={displayRequirement ?? signedAmount}
          className="mt-1 flex items-baseline justify-center gap-3 text-amber-50"
          initial={{ opacity: 0.48, scale: 0.86, y: 5 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0.08 : 0.18, ease: 'easeOut' }}
        >
          <span
            data-testid="victory-requirement-value"
            className="font-serif text-6xl font-semibold tabular-nums sm:text-7xl"
            style={{
              textShadow: isOblivion
                ? '0 0 22px rgba(196,181,253,0.62)'
                : '0 0 18px rgba(251,191,36,0.45)',
            }}
          >
            {displayRequirement ?? signedAmount}
          </span>
        </motion.div>
        <p
          className="mt-1 text-xs font-semibold uppercase"
          style={{
            color: isOblivion ? '#c4b5fd' : '#f6d98c',
            letterSpacing: '0.12em',
          }}
        >
          {isOblivion ? `Oblivion ${signedAmount}` : `${signedAmount} to win`}
        </p>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
