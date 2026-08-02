import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AffinityEmblem } from './AffinityEmblem';
import {
  LuminaryEffectAnnouncement,
  LuminaryEffectSkipControl,
} from './LuminaryEffectChrome';
import { AFFINITY_META, type AffinityKey } from '@/lib/affinityMeta';
import { gameAudio } from '@/lib/audio';
import {
  createLuminaryEffectSequence,
  type LuminaryEffectPhaseId,
  type LuminaryEffectSequenceController,
} from '@/lib/luminaryEffectSequence';
import {
  boundedLuminaryStagger,
  luminaryPacedDuration,
  luminaryReadDuration,
  type LuminaryPlaybackMode,
} from '@/lib/luminaryPresentationPacing';

interface RectTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PaleMerchantAffinityReturn {
  playerId: string;
  playerName?: string;
  affinity: AffinityKey;
  amount: number;
}

interface ReturnGeometry extends PaleMerchantAffinityReturn {
  key: string;
  source: RectTarget;
  destination: RectTarget;
}

interface PaleMerchantReturnDirectorProps {
  returns: PaleMerchantAffinityReturn[];
  triggeringPlayerName?: string;
  reducedMotion?: boolean;
  playbackMode?: LuminaryPlaybackMode;
  timelinePlaybackRate?: number;
  queuePosition?: number;
  queueTotal?: number;
  onComplete: (skipped: boolean) => void;
}

const TOKEN_SIZE = 44;
const REDUCED_FLIGHT_MS = 480;

function fallbackRect(x: number, y: number, width = 56, height = 40): RectTarget {
  return { x, y, width, height };
}

function visibleRect(selector: string, fallback: RectTarget): RectTarget {
  const element = Array.from(document.querySelectorAll(selector)).find((candidate) => {
    const rect = candidate.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  });
  if (!element) return fallback;
  const rect = element.getBoundingClientRect();
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
}

function centerOf(rect: RectTarget) {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

function clampRectToViewport(rect: RectTarget, padding = 10): RectTarget {
  const width = Math.min(rect.width, Math.max(1, window.innerWidth - padding * 2));
  const height = Math.min(rect.height, Math.max(1, window.innerHeight - padding * 2));
  return {
    x: Math.min(Math.max(rect.x, padding), window.innerWidth - width - padding),
    y: Math.min(Math.max(rect.y, padding), window.innerHeight - height - padding),
    width,
    height,
  };
}

function returnKey(result: Pick<PaleMerchantAffinityReturn, 'playerId' | 'affinity'>) {
  return `${result.playerId}:${result.affinity}`;
}

export function PaleMerchantReturnDirector({
  returns,
  triggeringPlayerName,
  reducedMotion = false,
  playbackMode = 'standard',
  timelinePlaybackRate = 1,
  queuePosition = 1,
  queueTotal = 1,
  onComplete,
}: PaleMerchantReturnDirectorProps) {
  const normalizedReturns = useMemo(() => returns
    .filter((result) => result.amount > 0)
    .map((result) => ({ ...result, amount: Math.min(2, result.amount) })), [returns]);
  const [ready, setReady] = useState(false);
  const [phase, setPhase] = useState<LuminaryEffectPhaseId>('announce');
  const [geometry, setGeometry] = useState<ReturnGeometry[]>([]);
  const [tokensVisible, setTokensVisible] = useState(false);
  const [landedKeys, setLandedKeys] = useState<Set<string>>(() => new Set());
  const sequenceRef = useRef<LuminaryEffectSequenceController | null>(null);
  const soundTimersRef = useRef<number[]>([]);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const description = normalizedReturns.length > 0
    ? 'Each player returns two of every Affinity held at half or more of its starting supply.'
    : 'No holdings reach half of their starting supply.';
  const announcementMs = luminaryReadDuration(
    description,
    playbackMode,
    timelinePlaybackRate,
  );
  const flightMs = luminaryPacedDuration(1250, playbackMode, timelinePlaybackRate);
  const resultStaggerMs = boundedLuminaryStagger(
    normalizedReturns.length,
    190,
    playbackMode,
    timelinePlaybackRate,
  );
  const lastLaunchMs = Math.max(0, normalizedReturns.length - 1) * resultStaggerMs;
  const reducedResultStaggerMs = normalizedReturns.length <= 1
    ? 0
    : Math.min(90, Math.floor(240 / (normalizedReturns.length - 1)));
  const reducedLastLaunchMs = Math.max(0, normalizedReturns.length - 1) * reducedResultStaggerMs;

  useEffect(() => {
    const clearSoundTimers = () => {
      soundTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      soundTimersRef.current = [];
    };
    const sequence = createLuminaryEffectSequence({
      reducedMotion,
      phases: [
        {
          id: 'announce',
          durationMs: announcementMs,
          reducedDurationMs: Math.max(1_200, Math.round(announcementMs * 0.65)),
          run: () => setReady(true),
        },
        {
          id: 'frame',
          durationMs: luminaryPacedDuration(260, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 120,
          run: () => {
            const nextGeometry = normalizedReturns.map((result, index) => {
              const escapedPlayerId = CSS.escape(result.playerId);
              const source = clampRectToViewport(visibleRect(
                `[data-player-affinity-source="${escapedPlayerId}"], [data-opponent-chip="${escapedPlayerId}"]`,
                visibleRect(
                  `[data-affinity-held-source="${result.affinity}"]`,
                  fallbackRect(window.innerWidth / 2 - 28, 62 + index * 8),
                ),
              ));
              const destination = clampRectToViewport(visibleRect(
                `[data-shared-affinity-well] [data-affinity-symbol="${result.affinity}"]`,
                fallbackRect(window.innerWidth / 2 - 28, window.innerHeight * 0.78),
              ));
              return { ...result, key: returnKey(result), source, destination };
            });
            setGeometry(nextGeometry);
          },
        },
        {
          id: 'target',
          durationMs: normalizedReturns.length > 0
            ? luminaryPacedDuration(760, playbackMode, timelinePlaybackRate)
            : luminaryPacedDuration(320, playbackMode, timelinePlaybackRate),
          reducedDurationMs: normalizedReturns.length > 0 ? 560 : 180,
        },
        {
          id: 'resolve',
          durationMs: normalizedReturns.length > 0
            ? lastLaunchMs + flightMs + luminaryPacedDuration(240, playbackMode, timelinePlaybackRate)
            : 0,
          reducedDurationMs: normalizedReturns.length > 0
            ? reducedLastLaunchMs + REDUCED_FLIGHT_MS + 180
            : 0,
          run: () => {
            if (normalizedReturns.length === 0) return;
            setTokensVisible(true);
            clearSoundTimers();
            normalizedReturns.forEach((result, index) => {
              const launchDelay = reducedMotion
                ? index * reducedResultStaggerMs
                : index * resultStaggerMs;
              const activeFlightMs = reducedMotion ? REDUCED_FLIGHT_MS : flightMs;
              const landDelay = launchDelay + Math.max(240, activeFlightMs - 80);
              soundTimersRef.current.push(window.setTimeout(() => {
                gameAudio.playAffinityPayment(
                  Array.from({ length: result.amount }, () => result.affinity),
                );
              }, launchDelay));
              soundTimersRef.current.push(window.setTimeout(() => {
                gameAudio.playHarnessLand(result.affinity);
                setLandedKeys((current) => new Set(current).add(returnKey(result)));
              }, landDelay));
            });
          },
        },
        {
          id: 'aftermath',
          durationMs: luminaryPacedDuration(560, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 300,
        },
      ],
      onPhaseChange: setPhase,
      onSkip: () => {
        clearSoundTimers();
        setTokensVisible(false);
        setLandedKeys(new Set(normalizedReturns.map(returnKey)));
      },
      onComplete: (skipped) => onCompleteRef.current(skipped),
    });
    sequenceRef.current = sequence;
    sequence.start();
    return () => {
      sequence.cancel();
      clearSoundTimers();
      if (sequenceRef.current === sequence) sequenceRef.current = null;
    };
  }, [
    announcementMs,
    description,
    flightMs,
    lastLaunchMs,
    normalizedReturns,
    playbackMode,
    reducedLastLaunchMs,
    reducedMotion,
    reducedResultStaggerMs,
    resultStaggerMs,
    timelinePlaybackRate,
  ]);

  const queueLabel = queueTotal > 1
    ? `ARRIVAL EFFECT · ${queuePosition} OF ${queueTotal}`
    : 'ARRIVAL EFFECT';
  const flightSeconds = reducedMotion ? REDUCED_FLIGHT_MS / 1000 : flightMs / 1000;
  const playerTargets = Array.from(new Map(
    geometry.map((entry) => [entry.playerId, {
      playerId: entry.playerId,
      playerName: entry.playerName,
      source: entry.source,
      returns: geometry.filter((candidate) => candidate.playerId === entry.playerId),
    }]),
  ).values());
  const channelTargets = Array.from(new Map(
    geometry.map((entry) => [entry.affinity, entry]),
  ).values());

  return (
    <div
      className="fixed inset-0 z-[1120] overflow-hidden pointer-events-none"
      data-testid="pale-merchant-return-director"
      data-effect-phase={phase}
      data-return-count={normalizedReturns.length}
      data-reduced-motion={String(reducedMotion)}
      data-timeline-playback-rate={timelinePlaybackRate}
      role="status"
      aria-label={`Pale Merchant returns Affinity from ${playerTargets.length} qualifying player${playerTargets.length === 1 ? '' : 's'}`}
    >
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 0.52 : 0 }}
        transition={{ duration: reducedMotion ? 0.08 : 0.22 }}
      />

      <motion.div
        className="absolute left-1/2 top-[8%] -translate-x-1/2 text-center"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: ready ? 1 : 0, y: 0 }}
        transition={{ duration: reducedMotion ? 0.08 : 0.24 }}
      >
        <LuminaryEffectAnnouncement
          effectName="Balance Due"
          luminaryName="The Pale Merchant"
          description={description}
          triggeringPlayerName={triggeringPlayerName}
          queueLabel={queueLabel}
          primaryColor="#cbd5e1"
          secondaryColor={geometry[0] ? AFFINITY_META[geometry[0].affinity].hex : '#94a3b8'}
          compact
        />
      </motion.div>

      {(phase === 'target' || phase === 'resolve') && playerTargets.map((target) => {
        const firstColor = AFFINITY_META[target.returns[0]!.affinity].hex;
        const placeLabelAbove = target.source.y > window.innerHeight * 0.35;
        return (
          <motion.div
            key={target.playerId}
            className="fixed rounded-xl border-2"
            data-balance-due-player={target.playerId}
            style={{
              left: target.source.x - 8,
              top: target.source.y - 8,
              width: target.source.width + 16,
              height: target.source.height + 16,
              borderColor: `${firstColor}dd`,
              boxShadow: `0 0 22px ${firstColor}88, inset 0 0 16px ${firstColor}28`,
            }}
            initial={{ opacity: 0, scale: 0.86 }}
            animate={{ opacity: [0, 1, 0.72], scale: [0.86, 1.06, 1] }}
            transition={{ duration: reducedMotion ? 0.14 : 0.5 }}
          >
            <div
              className={`absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-black/90 px-2 py-1 text-[9px] font-bold text-white whitespace-nowrap ${
                placeLabelAbove ? 'bottom-full mb-1' : 'top-full mt-1'
              }`}
            >
              <span>{target.playerName ?? 'Player'}</span>
              {target.returns.map((result) => (
                <span key={result.key} className="flex items-center gap-0.5" style={{ color: AFFINITY_META[result.affinity].hex }}>
                  <AffinityEmblem color={result.affinity} size={12} />
                  −{result.amount}
                </span>
              ))}
            </div>
          </motion.div>
        );
      })}

      {(phase === 'target' || phase === 'resolve') && channelTargets.map((target) => {
        const meta = AFFINITY_META[target.affinity];
        const landed = landedKeys.has(target.key);
        return (
          <motion.div
            key={target.affinity}
            className="fixed rounded-full border-2"
            data-balance-due-channel={target.affinity}
            style={{
              left: target.destination.x - 8,
              top: target.destination.y - 8,
              width: target.destination.width + 16,
              height: target.destination.height + 16,
              borderColor: `${meta.hex}cc`,
              boxShadow: `0 0 24px ${meta.glowHex}`,
            }}
            initial={{ opacity: 0, scale: 0.76 }}
            animate={landed
              ? { opacity: [0.5, 1, 0.28], scale: [1, 1.45, 1.12] }
              : { opacity: [0, 0.9, 0.55], scale: [0.76, 1.12, 1] }}
            transition={{ duration: landed ? (reducedMotion ? 0.18 : 0.56) : (reducedMotion ? 0.14 : 0.48) }}
          >
            <span
              className="absolute -right-2 -top-2 rounded-full border bg-black/90 px-1.5 py-0.5 text-[9px] font-black"
              style={{ color: meta.hex, borderColor: `${meta.hex}99` }}
            >
              ×2
            </span>
          </motion.div>
        );
      })}

      {tokensVisible && geometry.flatMap((result, resultIndex) => {
        const meta = AFFINITY_META[result.affinity];
        const source = centerOf(result.source);
        const destination = centerOf(result.destination);
        const midX = source.x + (destination.x - source.x) * 0.52;
        const midY = Math.min(source.y, destination.y) - Math.min(110, window.innerHeight * 0.12);
        const launchDelaySeconds = reducedMotion
          ? (resultIndex * reducedResultStaggerMs) / 1000
          : (resultIndex * resultStaggerMs) / 1000;
        return Array.from({ length: result.amount }, (_, tokenIndex) => {
          const spread = tokenIndex === 0 ? -18 : 18;
          return (
            <motion.div
              key={`${result.key}:${tokenIndex}`}
              className="fixed grid place-items-center rounded-full"
              data-balance-due-token={result.key}
              style={{
                width: TOKEN_SIZE,
                height: TOKEN_SIZE,
                zIndex: 1130 + resultIndex * 2 + tokenIndex,
                background: 'rgba(3,5,14,0.94)',
                border: `1px solid ${meta.hex}cc`,
                boxShadow: `0 0 18px ${meta.glowHex}, inset 0 0 12px ${meta.hex}38`,
              }}
              initial={{
                x: source.x - TOKEN_SIZE / 2 + spread,
                y: source.y - TOKEN_SIZE / 2,
                opacity: 0,
                scale: 0.55,
              }}
              animate={{
                x: [
                  source.x - TOKEN_SIZE / 2 + spread,
                  midX - TOKEN_SIZE / 2 + spread * 0.4,
                  destination.x - TOKEN_SIZE / 2 + spread * 0.18,
                ],
                y: [
                  source.y - TOKEN_SIZE / 2,
                  midY - TOKEN_SIZE / 2 - tokenIndex * 12,
                  destination.y - TOKEN_SIZE / 2,
                ],
                opacity: [0, 1, 1, 0],
                scale: [0.55, 1, 0.9, 0.3],
                rotate: [tokenIndex === 0 ? -16 : 16, 0, tokenIndex === 0 ? 20 : -20],
              }}
              transition={{
                duration: flightSeconds,
                delay: launchDelaySeconds + tokenIndex * (reducedMotion ? 0.05 : 0.1),
                ease: [0.2, 0.72, 0.18, 1],
              }}
            >
              <AffinityEmblem color={result.affinity} size={30} />
            </motion.div>
          );
        });
      })}

      <div className="pointer-events-auto">
        <LuminaryEffectSkipControl
          color="#cbd5e1"
          onAdvance={() => sequenceRef.current?.advance()}
          onSkip={() => sequenceRef.current?.skip()}
          reducedMotion={reducedMotion}
        />
      </div>
    </div>
  );
}
