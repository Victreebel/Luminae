import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { ArtifactCard } from '@workspace/api-client-react';
import { AffinityEmblem } from '@/components/AffinityEmblem';
import { AFFINITY_META, type AffinityKey } from '@/lib/affinityMeta';
import { LuminaryEffectSkipControl } from '@/components/LuminaryEffectChrome';
import {
  createLuminaryEffectSequence,
  type LuminaryEffectPhaseId,
  type LuminaryEffectSequenceController,
} from '@/lib/luminaryEffectSequence';
import {
  luminaryPacedDuration,
  type LuminaryPlaybackMode,
} from '@/lib/luminaryPresentationPacing';
import { gameAudio } from '@/lib/audio';
import { playLuminaryEffectPhaseSound } from '@/lib/luminaryEffectSound';
import { ArtifactCardView } from '@/pages/game-card';
import { CARD_ART } from '@/pages/game-constants';

type Tier = 1 | 2 | 3;

interface ViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface AssimilationGeometry {
  source: ViewportRect;
  target: ViewportRect;
}

export interface AssimilationVisualSlot {
  cardId: string;
  card: ArtifactCard | null;
  tier: Tier;
  slotKey: string;
  fallbackRect?: ViewportRect;
  destinationSelector: string;
}

export interface AssimilationDirectorActions {
  takeOverSlot: (slotKey: string) => void;
  revealReplacement: (slotKey: string, tier: Tier, immediate: boolean) => void;
  playAffinityAbsorb: (affinity: AffinityKey) => void;
}

interface FinalHungerAssimilationDirectorProps {
  slot: AssimilationVisualSlot | null;
  affinity: AffinityKey;
  triggeringPlayerName?: string;
  reducedMotion?: boolean;
  playbackMode?: LuminaryPlaybackMode;
  timelinePlaybackRate?: number;
  queuePosition?: number;
  queueTotal?: number;
  actions: AssimilationDirectorActions;
  onComplete: (skipped: boolean) => void;
}

const STANDARD_RESOLVE_MS = 4_100;
const REDUCED_RESOLVE_MS = 520;
const PARTICLE_COLUMNS = 7;
const PARTICLE_ROWS = 9;
const DISSOLVE_END = 0.34;
const TRANSIT_START = 0.24;
const ABSORB_AT = 0.87;

function toViewportRect(rect: DOMRect): ViewportRect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

function firstVisibleRect(selectors: string): ViewportRect | null {
  for (const selector of selectors.split(',').map(value => value.trim()).filter(Boolean)) {
    const elements = document.querySelectorAll<HTMLElement>(selector);
    for (const element of elements) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) return toViewportRect(rect);
    }
  }
  return null;
}

function fallbackSource(): ViewportRect {
  const width = Math.min(132, window.innerWidth * 0.28);
  const height = width * 1.42;
  return {
    left: window.innerWidth / 2 - width / 2,
    top: window.innerHeight / 2 - height / 2,
    width,
    height,
  };
}

function fallbackTarget(): ViewportRect {
  return {
    left: window.innerWidth / 2 - 46,
    top: window.innerHeight - 74,
    width: 92,
    height: 52,
  };
}

export function FinalHungerAssimilationDirector({
  slot,
  affinity,
  reducedMotion = false,
  playbackMode = 'standard',
  timelinePlaybackRate = 1,
  actions,
  onComplete,
}: FinalHungerAssimilationDirectorProps) {
  const [geometry, setGeometry] = useState<AssimilationGeometry | null>(null);
  const [directorPhase, setDirectorPhase] = useState<LuminaryEffectPhaseId>('announce');
  const [resolving, setResolving] = useState(false);
  const [absorbed, setAbsorbed] = useState(false);
  const sequenceRef = useRef<LuminaryEffectSequenceController | null>(null);
  const onCompleteRef = useRef(onComplete);
  const actionsRef = useRef(actions);
  const tookOverRef = useRef(false);
  const revealedRef = useRef(false);

  onCompleteRef.current = onComplete;
  actionsRef.current = actions;

  const meta = AFFINITY_META[affinity];
  const primaryColor = meta?.glowHex ?? '#bbf7d0';
  const resolveMs = reducedMotion
    ? REDUCED_RESOLVE_MS
    : luminaryPacedDuration(STANDARD_RESOLVE_MS, playbackMode, timelinePlaybackRate);
  const resolveSeconds = resolveMs / 1000;
  const dissolveSeconds = resolveSeconds * DISSOLVE_END;
  const transitStartSeconds = resolveSeconds * TRANSIT_START;
  const absorbAtSeconds = resolveSeconds * ABSORB_AT;
  const takeOver = useCallback(() => {
    if (!slot || tookOverRef.current) return;
    tookOverRef.current = true;
    actionsRef.current.takeOverSlot(slot.slotKey);
  }, [slot]);

  const reveal = useCallback((immediate: boolean) => {
    if (!slot || revealedRef.current) return;
    takeOver();
    revealedRef.current = true;
    actionsRef.current.revealReplacement(slot.slotKey, slot.tier, immediate);
  }, [slot, takeOver]);

  useEffect(() => {
    let transitTimer: ReturnType<typeof setTimeout> | null = null;
    let absorbTimer: ReturnType<typeof setTimeout> | null = null;
    const sequence = createLuminaryEffectSequence({
      reducedMotion,
      phases: [
        {
          id: 'announce',
          durationMs: reducedMotion
            ? 0
            : luminaryPacedDuration(80, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 0,
        },
        {
          id: 'frame',
          durationMs: luminaryPacedDuration(180, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 60,
          run: () => {
            const source = slot
              ? firstVisibleRect(`[data-card-id="${slot.cardId}"]`) ?? slot.fallbackRect ?? fallbackSource()
              : fallbackSource();
            const target = slot
              ? firstVisibleRect(slot.destinationSelector) ?? fallbackTarget()
              : firstVisibleRect('[data-civilization-drop-target], [data-nav-hand]') ?? fallbackTarget();
            setGeometry({ source, target });
          },
        },
        {
          id: 'target',
          durationMs: luminaryPacedDuration(360, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 100,
          run: takeOver,
        },
        {
          id: 'resolve',
          durationMs: resolveMs,
          reducedDurationMs: REDUCED_RESOLVE_MS,
          run: () => {
            setResolving(true);
            gameAudio.playAssimilationDissolve(Math.round(resolveMs * DISSOLVE_END));
            const transitDelay = Math.max(80, Math.round(resolveMs * TRANSIT_START));
            const impactDelay = Math.max(120, Math.round(resolveMs * ABSORB_AT));
            transitTimer = setTimeout(() => {
              gameAudio.playAssimilationTransit(
                Math.max(240, impactDelay - transitDelay),
              );
            }, transitDelay);
            absorbTimer = setTimeout(() => {
              setAbsorbed(true);
              actionsRef.current.playAffinityAbsorb(affinity);
            }, impactDelay);
          },
        },
        {
          id: 'reveal',
          durationMs: reducedMotion
            ? 160
            : luminaryPacedDuration(1_620, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 160,
          run: () => reveal(reducedMotion),
        },
        {
          id: 'aftermath',
          durationMs: luminaryPacedDuration(220, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 80,
        },
      ],
      onPhaseChange: nextPhase => {
        setDirectorPhase(nextPhase);
        playLuminaryEffectPhaseSound('lum_hunger', nextPhase, primaryColor);
      },
      onSkip: () => {
        gameAudio.stopActivationSting();
        if (transitTimer) clearTimeout(transitTimer);
        if (absorbTimer) clearTimeout(absorbTimer);
        reveal(true);
      },
      onComplete: skipped => {
        if (!revealedRef.current) reveal(true);
        onCompleteRef.current(skipped);
      },
      onError: () => reveal(true),
    });
    sequenceRef.current = sequence;
    sequence.start();

    return () => {
      if (transitTimer) clearTimeout(transitTimer);
      if (absorbTimer) clearTimeout(absorbTimer);
      sequence.cancel();
      if (sequenceRef.current === sequence) sequenceRef.current = null;
      gameAudio.stopActivationSting();
    };
  }, [affinity, playbackMode, primaryColor, reducedMotion, resolveMs, reveal, slot, takeOver, timelinePlaybackRate]);

  const particles = useMemo(() => {
    const rows = reducedMotion ? 2 : PARTICLE_ROWS;
    const columns = reducedMotion ? 4 : PARTICLE_COLUMNS;
    return Array.from({ length: rows * columns }, (_, index) => ({
      index,
      row: Math.floor(index / columns),
      column: index % columns,
      rows,
      columns,
      driftX: ((index * 37) % 17) - 8,
      driftY: ((index * 29) % 13) - 6,
      spin: ((index * 47) % 91) - 45,
      arc: 20 + ((index * 31) % 34),
    }));
  }, [reducedMotion]);

  const source = geometry?.source;
  const target = geometry?.target;
  const targetCenter = target
    ? { x: target.left + target.width / 2, y: target.top + target.height / 2 }
    : null;
  const sourceCenter = source
    ? { x: source.left + source.width / 2, y: source.top + source.height * 0.78 }
    : null;
  const streamPath = sourceCenter && targetCenter
    ? (() => {
        const controlX = (sourceCenter.x + targetCenter.x) / 2;
        const controlY = Math.min(sourceCenter.y, targetCenter.y)
          - Math.max(54, Math.abs(targetCenter.x - sourceCenter.x) * 0.12);
        return `M ${sourceCenter.x} ${sourceCenter.y} Q ${controlX} ${controlY} ${targetCenter.x} ${targetCenter.y}`;
      })()
    : null;
  const artifactArt = slot?.card ? CARD_ART[slot.card.id] : undefined;

  return (
    <div
      className="fixed inset-0 z-[9040] overflow-hidden"
      data-testid="final-hunger-assimilation-director"
      data-effect-phase={directorPhase}
      role="status"
      aria-label={`Final Hunger Assimilates an Artifact into permanent ${meta?.name ?? affinity} Affinity`}
    >
      {source && slot?.card && (
        <motion.div
          className="pointer-events-none fixed overflow-hidden rounded-xl"
          style={{
            left: source.left,
            top: source.top,
            width: source.width,
            height: source.height,
            zIndex: 9044,
            '--card-w': `${source.width}px`,
            '--card-h': `${source.height}px`,
            filter: `drop-shadow(0 0 14px ${primaryColor}88)`,
          } as CSSProperties}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={resolving
            ? {
                opacity: [1, 1, 0.18, 0, 0],
                scale: [1.025, 1.035, 1.005, 0.985, 0.985],
              }
            : {
                opacity: directorPhase !== 'announce' ? 1 : 0,
                scale: directorPhase !== 'announce' ? 1.025 : 0.96,
              }}
          transition={resolving
            ? {
                opacity: {
                  duration: resolveSeconds,
                  times: [0, TRANSIT_START * 0.82, DISSOLVE_END * 0.94, DISSOLVE_END, 1],
                  ease: [0.35, 0, 0.35, 1],
                },
                scale: {
                  duration: resolveSeconds,
                  times: [0, TRANSIT_START * 0.7, DISSOLVE_END * 0.84, DISSOLVE_END, 1],
                  ease: [0.35, 0, 0.35, 1],
                },
              }
            : { duration: reducedMotion ? 0.08 : 0.28 }}
        >
          <ArtifactCardView card={slot.card} tier={slot.tier} />
          <motion.div
            className="absolute inset-0"
            animate={{
              boxShadow: resolving
                ? [`inset 0 0 12px ${primaryColor}55`, `inset 0 0 32px ${primaryColor}bb`]
                : `inset 0 0 12px ${primaryColor}55`,
            }}
            transition={{ duration: resolveMs / 1000 }}
          />
        </motion.div>
      )}

      {source && resolving && (
        <motion.div
          data-testid="assimilation-disassembly-front"
          className="pointer-events-none fixed"
          style={{
            left: source.left,
            top: source.top,
            width: source.width,
            height: source.height,
            zIndex: 9047,
            border: `1px solid ${primaryColor}99`,
            backgroundImage: `
              linear-gradient(to right, ${primaryColor}66 1px, transparent 1px),
              linear-gradient(to bottom, ${primaryColor}66 1px, transparent 1px)
            `,
            backgroundSize: `${source.width / PARTICLE_COLUMNS}px ${source.height / PARTICLE_ROWS}px`,
            boxShadow: `inset 0 0 16px ${primaryColor}66, 0 0 10px ${primaryColor}55`,
            mixBlendMode: 'screen',
          }}
          initial={{ opacity: 0, scale: 0.985 }}
          animate={{
            opacity: [0, 0.35, 0.82, 0],
            scale: [0.985, 1, 1.018, 1.04],
          }}
          transition={{
            duration: Math.max(0.18, dissolveSeconds),
            ease: [0.32, 0, 0.3, 1],
            opacity: { times: [0, 0.22, 0.7, 1] },
            scale: { times: [0, 0.3, 0.72, 1] },
          }}
        />
      )}

      {streamPath && resolving && (
        <svg
          className="pointer-events-none fixed inset-0 h-full w-full"
          style={{ zIndex: 9045 }}
          aria-hidden="true"
        >
          <motion.path
            data-testid="assimilation-particle-stream"
            d={streamPath}
            fill="none"
            stroke={primaryColor}
            strokeWidth="5"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: [0, 1, 1], opacity: [0, 0.08, 0.14, 0] }}
            transition={{
              pathLength: {
                delay: transitStartSeconds,
                duration: Math.max(0.24, absorbAtSeconds - transitStartSeconds),
                ease: [0.22, 0.72, 0.18, 1],
              },
              opacity: {
                delay: transitStartSeconds,
                duration: Math.max(0.4, resolveSeconds - transitStartSeconds),
                times: [0, 0.14, 0.72, 1],
              },
            }}
          />
        </svg>
      )}

      {source && targetCenter && resolving && particles.map((particle) => {
        const cellWidth = source.width / particle.columns;
        const cellHeight = source.height / particle.rows;
        const fragmentSize = reducedMotion
          ? 4
          : Math.max(3, Math.min(8, Math.min(cellWidth, cellHeight) * 0.52 + (particle.index % 3) * 0.5));
        const sampleLeft = cellWidth * (particle.column + 0.5) - fragmentSize / 2;
        const sampleTop = cellHeight * (particle.row + 0.5) - fragmentSize / 2;
        const x = source.left + sampleLeft;
        const y = source.top + sampleTop;
        const dx = targetCenter.x - (x + fragmentSize / 2);
        const dy = targetCenter.y - (y + fragmentSize / 2);
        const delay = reducedMotion ? 0.04 : transitStartSeconds;
        const travelDuration = Math.max(
          reducedMotion ? 0.24 : 0.72,
          absorbAtSeconds - delay,
        );
        return (
          <motion.span
            key={`assimilation-particle-${particle.index}`}
            data-testid="assimilation-fragment"
            className="pointer-events-none fixed"
            style={{
              left: x,
              top: y,
              width: fragmentSize,
              height: fragmentSize,
              zIndex: 9048,
              borderRadius: 1,
              border: particle.index % 7 === 0
                ? '1px solid rgba(255,255,255,0.78)'
                : `1px solid ${primaryColor}88`,
              backgroundColor: particle.index % 7 === 0 ? '#fff' : primaryColor,
              backgroundImage: artifactArt ? `url(${artifactArt})` : undefined,
              backgroundPosition: artifactArt ? `${-sampleLeft}px ${-sampleTop}px` : undefined,
              backgroundRepeat: 'no-repeat',
              backgroundSize: artifactArt ? `${source.width}px ${source.height}px` : undefined,
              boxShadow: particle.index % 9 === 0 ? `0 0 5px ${primaryColor}` : undefined,
              willChange: 'transform, opacity',
            }}
            initial={{ opacity: 0, scale: 0.72, x: 0, y: 0, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0.92, 0],
              scale: [0.72, 1, 0.86, 0.5, 0.04],
              x: [
                0,
                particle.driftX,
                dx * 0.56 + particle.driftX * 0.42,
                dx * 0.86 + particle.driftX * 0.16,
                dx,
              ],
              y: [
                0,
                particle.driftY,
                dy * 0.5 - particle.arc,
                dy * 0.84 - particle.arc * 0.24,
                dy,
              ],
              rotate: [0, particle.spin * 0.12, particle.spin * 0.56, particle.spin, particle.spin * 1.08],
            }}
            transition={{
              delay,
              duration: travelDuration,
              times: [0, 0.08, 0.36, 0.78, 1],
              ease: [0.22, 0.72, 0.18, 1],
            }}
          />
        );
      })}

      {target && targetCenter && resolving && (
        <>
          <motion.div
            data-testid="assimilation-target-receiver"
            className="pointer-events-none fixed rounded-[18px] border"
            style={{
              left: targetCenter.x,
              top: targetCenter.y,
              translateX: '-50%',
              translateY: '-50%',
              zIndex: 9046,
              borderColor: primaryColor,
              background: `radial-gradient(circle, ${primaryColor}38, transparent 70%)`,
              boxShadow: `0 0 28px ${primaryColor}88, inset 0 0 22px ${primaryColor}42`,
            }}
            initial={{ width: 18, height: 18, opacity: 0, scale: 0.6 }}
            animate={{
              width: [18, Math.max(58, target.width * 0.66), Math.max(72, target.width * 0.82), 18],
              height: [18, Math.max(40, target.height * 0.72), Math.max(52, target.height * 0.9), 18],
              opacity: [0, 0.3, 0.76, 0],
              scale: [0.6, 0.92, 1.08, 0.18],
            }}
            transition={{
              delay: transitStartSeconds,
              duration: Math.max(0.42, resolveSeconds - transitStartSeconds),
              times: [0, 0.48, 0.78, 1],
              ease: 'easeOut',
            }}
          />
          {absorbed && [0, 1].map((ring) => (
            <motion.span
              key={`assimilation-impact-ring-${ring}`}
              className="pointer-events-none fixed rounded-full border"
              style={{
                left: targetCenter.x - 22,
                top: targetCenter.y - 22,
                width: 44,
                height: 44,
                zIndex: 9048,
                borderColor: ring === 0 ? '#fff' : primaryColor,
                boxShadow: ring === 0 ? undefined : `0 0 14px ${primaryColor}88`,
              }}
              initial={{ opacity: 0.9, scale: 0.28 }}
              animate={{ opacity: [0.9, 0.55, 0], scale: [0.28, 1.05, 1.72] }}
              transition={{
                duration: reducedMotion ? 0.24 : 0.7,
                delay: ring * 0.08,
                ease: 'easeOut',
              }}
            />
          ))}
          <motion.div
            className="pointer-events-none fixed grid place-items-center"
            style={{
              left: targetCenter.x - 22,
              top: targetCenter.y - 22,
              width: 44,
              height: 44,
              zIndex: 9049,
              filter: `drop-shadow(0 0 12px ${primaryColor})`,
            }}
            initial={{ opacity: 0, scale: 0.25, rotate: -16 }}
            animate={absorbed
              ? {
                  opacity: [0, 1, 1, 0],
                  scale: [0.25, 1.34, 0.92, 0.05],
                  rotate: [-16, 0, 0, 18],
                }
              : { opacity: 0, scale: 0.25, rotate: -16 }}
            transition={{ duration: reducedMotion ? 0.28 : 0.74, ease: 'easeOut' }}
          >
            <AffinityEmblem color={affinity} size={38} />
            <span
              className="absolute -bottom-1 rounded-full border px-1.5 py-0.5 text-[10px] font-black text-white"
              style={{ borderColor: primaryColor, background: 'rgba(3,6,12,0.9)' }}
            >
              +1
            </span>
          </motion.div>
        </>
      )}

      <LuminaryEffectSkipControl
        color={primaryColor}
        reducedMotion={reducedMotion}
        onAdvance={() => sequenceRef.current?.advance()}
        onSkip={() => sequenceRef.current?.skip()}
      />
    </div>
  );
}
