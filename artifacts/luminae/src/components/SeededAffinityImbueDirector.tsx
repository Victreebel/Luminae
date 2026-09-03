import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AffinityEmblem } from './AffinityEmblem';
import { AvatarSeedSymbol } from './AvatarSeedSymbol';
import { LuminaryEffectSkipControl } from './LuminaryEffectChrome';
import { AFFINITY_META, type AffinityKey } from '@/lib/affinityMeta';
import { gameAudio } from '@/lib/audio';
import {
  createLuminaryEffectSequence,
  type LuminaryEffectPhaseId,
  type LuminaryEffectSequenceController,
} from '@/lib/luminaryEffectSequence';
import {
  luminaryPacedDuration,
  type LuminaryPlaybackMode,
} from '@/lib/luminaryPresentationPacing';
import { playLuminaryEffectPhaseSound } from '@/lib/luminaryEffectSound';

interface ViewportRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface ImbuementGeometry {
  source: ViewportRect;
  destination: ViewportRect;
}

interface SeededAffinityImbueDirectorProps {
  targetCardIds: string[];
  targetSlotIds: string[];
  affinity: AffinityKey;
  alliedPlayerId: string;
  alliedPlayerName?: string;
  reducedMotion?: boolean;
  playbackMode?: LuminaryPlaybackMode;
  timelinePlaybackRate?: number;
  queuePosition?: number;
  queueTotal?: number;
  onComplete: (skipped: boolean) => void;
}

function firstVisibleRect(selectors: string): ViewportRect | null {
  for (const selector of selectors.split(',').map((value) => value.trim()).filter(Boolean)) {
    for (const element of document.querySelectorAll<HTMLElement>(selector)) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      }
    }
  }
  return null;
}

function fallbackSource(): ViewportRect {
  return { left: window.innerWidth / 2 - 36, top: window.innerHeight * 0.38, width: 72, height: 96 };
}

function fallbackDestination(): ViewportRect {
  return { left: window.innerWidth / 2 - 48, top: 34, width: 96, height: 48 };
}

export function SeededAffinityImbueDirector({
  targetCardIds,
  targetSlotIds,
  affinity,
  alliedPlayerId,
  alliedPlayerName,
  reducedMotion = false,
  playbackMode = 'standard',
  timelinePlaybackRate = 1,
  onComplete,
}: SeededAffinityImbueDirectorProps) {
  const [phase, setPhase] = useState<LuminaryEffectPhaseId>('announce');
  const [resolving, setResolving] = useState(false);
  const [landed, setLanded] = useState(false);
  const [geometry, setGeometry] = useState<ImbuementGeometry | null>(null);
  const sequenceRef = useRef<LuminaryEffectSequenceController | null>(null);
  const onCompleteRef = useRef(onComplete);
  const impactTimerRef = useRef<number | null>(null);
  onCompleteRef.current = onComplete;

  const meta = AFFINITY_META[affinity];
  const primary = meta.glowHex;
  const secondary = meta.hex;
  const description = `${alliedPlayerName ?? 'The allied player'} gains +1 permanent ${meta.name}.`;
  const announceMs = reducedMotion
    ? 0
    : luminaryPacedDuration(80, playbackMode, timelinePlaybackRate);
  const resolveMs = reducedMotion
    ? 520
    : luminaryPacedDuration(1_850, playbackMode, timelinePlaybackRate);
  const sourceSelector = useMemo(() => {
    const slotSelectors = targetSlotIds.map((id) => `[data-slot-key="${CSS.escape(id)}"]`);
    const cardSelectors = targetCardIds.map((id) => `[data-card-id="${CSS.escape(id)}"]`);
    return [...slotSelectors, ...cardSelectors, '.board-forge'].join(', ');
  }, [targetCardIds, targetSlotIds]);

  useEffect(() => {
    const sequence = createLuminaryEffectSequence({
      reducedMotion,
      phases: [
        {
          id: 'announce',
          durationMs: announceMs,
          reducedDurationMs: 0,
        },
        {
          id: 'frame',
          durationMs: luminaryPacedDuration(240, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 80,
          run: () => {
            const source = firstVisibleRect(sourceSelector) ?? fallbackSource();
            const escapedPlayerId = CSS.escape(alliedPlayerId);
            const destination = firstVisibleRect(
              `[data-player-affinity-source="${escapedPlayerId}"], ` +
              `[data-opponent-chip="${escapedPlayerId}"], ` +
              '[data-civilization-drop-target], [data-nav-hand]',
            ) ?? fallbackDestination();
            setGeometry({ source, destination });
          },
        },
        {
          id: 'target',
          durationMs: luminaryPacedDuration(460, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 110,
        },
        {
          id: 'resolve',
          durationMs: resolveMs,
          reducedDurationMs: 520,
          run: () => {
            setResolving(true);
            impactTimerRef.current = window.setTimeout(() => {
              setLanded(true);
              gameAudio.playBonusSound(affinity);
            }, Math.max(180, Math.round(resolveMs * 0.78)));
          },
        },
        {
          id: 'reveal',
          durationMs: luminaryPacedDuration(650, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 180,
        },
        {
          id: 'aftermath',
          durationMs: luminaryPacedDuration(240, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 80,
        },
      ],
      onPhaseChange: nextPhase => {
        setPhase(nextPhase);
        playLuminaryEffectPhaseSound('lum_seed', nextPhase, primary);
      },
      onSkip: () => {
        gameAudio.stopActivationSting();
        if (impactTimerRef.current !== null) window.clearTimeout(impactTimerRef.current);
        setLanded(true);
      },
      onComplete: (skipped) => onCompleteRef.current(skipped),
    });
    sequenceRef.current = sequence;
    sequence.start();
    return () => {
      if (impactTimerRef.current !== null) window.clearTimeout(impactTimerRef.current);
      sequence.cancel();
      if (sequenceRef.current === sequence) sequenceRef.current = null;
      gameAudio.stopActivationSting();
    };
  }, [affinity, alliedPlayerId, announceMs, playbackMode, primary, reducedMotion, resolveMs, sourceSelector, timelinePlaybackRate]);

  const source = geometry?.source;
  const destination = geometry?.destination;
  const sourceCenter = source
    ? { x: source.left + source.width / 2, y: source.top + source.height / 2 }
    : null;
  const destinationCenter = destination
    ? { x: destination.left + destination.width / 2, y: destination.top + destination.height / 2 }
    : null;
  const dx = sourceCenter && destinationCenter ? destinationCenter.x - sourceCenter.x : 0;
  const dy = sourceCenter && destinationCenter ? destinationCenter.y - sourceCenter.y : 0;

  return (
    <div
      className="fixed inset-0 z-[9040] overflow-hidden"
      data-testid="seeded-affinity-imbue-director"
      data-effect-phase={phase}
      role="status"
      aria-label={description}
    >
      {source && (
        <motion.div
          className="pointer-events-none fixed rounded-xl"
          style={{
            left: source.left - 4,
            top: source.top - 4,
            width: source.width + 8,
            height: source.height + 8,
            border: `1px solid ${primary}`,
            boxShadow: `0 0 18px ${primary}88, inset 0 0 18px ${secondary}44`,
          }}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{
            opacity: phase !== 'announce' && !landed ? [0.15, 0.88, 0.45] : 0,
            scale: [0.94, 1.03, 1],
          }}
          transition={{ duration: reducedMotion ? 0.35 : 1.15, repeat: resolving && !landed ? 1 : 0 }}
        />
      )}

      {sourceCenter && destinationCenter && resolving && (
        <motion.div
          className="pointer-events-none fixed"
          style={{
            left: sourceCenter.x - 25,
            top: sourceCenter.y - 25,
            width: 50,
            height: 50,
            filter: `drop-shadow(0 0 12px ${primary})`,
          }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.72 }}
          animate={{
            opacity: [0, 1, 1, 1, 0],
            x: [0, dx * 0.22, dx * 0.66, dx],
            y: [0, dy * 0.18 - 70, dy * 0.62 - 44, dy],
            scale: [0.72, 1.08, 0.92, 0.7, 0.45],
          }}
          transition={{ duration: resolveMs / 1_000, times: [0, 0.18, 0.58, 0.82, 1], ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div className="absolute inset-0" animate={{ opacity: [1, 1, 0] }} transition={{ duration: resolveMs / 1_000, times: [0, 0.34, 0.62] }}>
            <AvatarSeedSymbol size={50} />
          </motion.div>
          <motion.div className="absolute inset-[3px]" animate={{ opacity: [0, 0, 1, 1] }} transition={{ duration: resolveMs / 1_000, times: [0, 0.3, 0.55, 1] }}>
            <AffinityEmblem color={affinity} size={44} />
          </motion.div>
        </motion.div>
      )}

      {destinationCenter && landed && (
        <motion.div
          className="pointer-events-none fixed grid place-items-center rounded-full"
          style={{
            left: destinationCenter.x - 42,
            top: destinationCenter.y - 42,
            width: 84,
            height: 84,
            border: `2px solid ${primary}`,
            boxShadow: `0 0 28px ${primary}, inset 0 0 24px ${secondary}66`,
          }}
          initial={{ opacity: 0, scale: 0.35 }}
          animate={{ opacity: [0, 1, 0.9, 0], scale: [0.35, 1.18, 0.92, 1.4] }}
          transition={{ duration: reducedMotion ? 0.38 : 0.9 }}
        >
          <AffinityEmblem color={affinity} size={46} />
        </motion.div>
      )}

      {landed && (
        <motion.div
          className="pointer-events-none fixed left-1/2 top-[69%] -translate-x-1/2 text-center"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-[11px] font-black uppercase tracking-[0.2em]" style={{ color: primary }}>
            +1 Permanent {meta.name}
          </div>
        </motion.div>
      )}

      <LuminaryEffectSkipControl
        color={primary}
        onAdvance={() => sequenceRef.current?.advance()}
        onSkip={() => sequenceRef.current?.skip()}
        reducedMotion={reducedMotion}
      />
    </div>
  );
}
