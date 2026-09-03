import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AffinityEmblem } from './AffinityEmblem';
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
import { buildPaleMerchantOrbitSlots } from '@/lib/paleMerchantOrbit';

interface RectTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Point {
  x: number;
  y: number;
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

export interface PaleMerchantReturnGroup {
  playerId: string;
  playerName?: string;
  returns: PaleMerchantAffinityReturn[];
  highlightStartMs: number;
  gatherStartMs: number;
  gatherEndMs: number;
}

interface PaleMerchantReturnSchedule {
  groups: PaleMerchantReturnGroup[];
  gatherDelayByKey: Record<string, number>;
  releaseDelayByKey: Record<string, number>;
  allGatheredAtMs: number;
  releaseStartMs: number;
  totalDurationMs: number;
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

function sampleQuadraticPath(start: Point, control: Point, end: Point, count: number): Point[] {
  return Array.from({ length: Math.max(2, count) }, (_, index) => {
    const t = index / Math.max(1, count - 1);
    const inverse = 1 - t;
    return {
      x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
      y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
    };
  });
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

export function buildPaleMerchantReturnSchedule(
  returns: PaleMerchantAffinityReturn[],
  pacing: {
    pullLeadMs: number;
    playerStaggerMs: number;
    affinityStaggerMs: number;
    gatherFlightMs: number;
    orbitHoldMs: number;
    releaseStaggerMs: number;
    returnFlightMs: number;
    landingHoldMs: number;
  },
): PaleMerchantReturnSchedule {
  const grouped = new Map<string, PaleMerchantAffinityReturn[]>();
  for (const result of returns) {
    const current = grouped.get(result.playerId) ?? [];
    current.push(result);
    grouped.set(result.playerId, current);
  }

  const gatherDelayByKey: Record<string, number> = {};
  const groups = Array.from(grouped.entries()).map(([playerId, playerReturns], playerIndex) => {
    const highlightStartMs = playerIndex * pacing.playerStaggerMs;
    const gatherStartMs = pacing.pullLeadMs + highlightStartMs;
    playerReturns.forEach((result, index) => {
      gatherDelayByKey[returnKey(result)] = gatherStartMs + index * pacing.affinityStaggerMs;
    });
    const lastGatherMs = gatherStartMs
      + Math.max(0, playerReturns.length - 1) * pacing.affinityStaggerMs;
    return {
      playerId,
      playerName: playerReturns[0]?.playerName,
      returns: playerReturns,
      highlightStartMs,
      gatherStartMs,
      gatherEndMs: lastGatherMs + pacing.gatherFlightMs,
    };
  });

  const allGatheredAtMs = groups.reduce(
    (latest, group) => Math.max(latest, group.gatherEndMs),
    0,
  );
  const releaseStartMs = allGatheredAtMs + pacing.orbitHoldMs;
  const affinityOrder = Array.from(new Set(returns.map(result => result.affinity)));
  const releaseDelayByKey: Record<string, number> = {};
  returns.forEach((result) => {
    const affinityIndex = Math.max(0, affinityOrder.indexOf(result.affinity));
    releaseDelayByKey[returnKey(result)] = releaseStartMs
      + affinityIndex * pacing.releaseStaggerMs;
  });
  const lastReleaseMs = Math.max(releaseStartMs, ...Object.values(releaseDelayByKey));

  return {
    groups,
    gatherDelayByKey,
    releaseDelayByKey,
    allGatheredAtMs,
    releaseStartMs,
    totalDurationMs: returns.length === 0
      ? 0
      : lastReleaseMs + pacing.returnFlightMs + pacing.landingHoldMs,
  };
}

export function PaleMerchantReturnDirector({
  returns,
  reducedMotion = false,
  playbackMode = 'standard',
  timelinePlaybackRate = 1,
  onComplete,
}: PaleMerchantReturnDirectorProps) {
  const normalizedReturns = useMemo(() => returns
    .filter((result) => result.amount > 0)
    .map((result) => ({ ...result, amount: Math.min(2, result.amount) })), [returns]);
  const [phase, setPhase] = useState<LuminaryEffectPhaseId>('announce');
  const [geometry, setGeometry] = useState<ReturnGeometry[]>([]);
  const [tokensVisible, setTokensVisible] = useState(false);
  const [landedKeys, setLandedKeys] = useState<Set<string>>(() => new Set());
  const [activePlayerIds, setActivePlayerIds] = useState<Set<string>>(() => new Set());
  const [paidPlayerIds, setPaidPlayerIds] = useState<Set<string>>(() => new Set());
  const [orbitReady, setOrbitReady] = useState(false);
  const [releaseStarted, setReleaseStarted] = useState(false);
  const sequenceRef = useRef<LuminaryEffectSequenceController | null>(null);
  const soundTimersRef = useRef<number[]>([]);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const announcementMs = reducedMotion
    ? 0
    : luminaryPacedDuration(80, playbackMode, timelinePlaybackRate);
  const pullLeadMs = reducedMotion
    ? 100
    : Math.max(320, luminaryPacedDuration(460, playbackMode, timelinePlaybackRate));
  const playerStaggerMs = reducedMotion
    ? 70
    : Math.max(130, luminaryPacedDuration(190, playbackMode, timelinePlaybackRate));
  const affinityStaggerMs = reducedMotion
    ? 45
    : Math.max(80, luminaryPacedDuration(110, playbackMode, timelinePlaybackRate));
  const gatherFlightMs = reducedMotion
    ? 360
    : Math.max(700, luminaryPacedDuration(900, playbackMode, timelinePlaybackRate));
  const orbitHoldMs = reducedMotion
    ? 280
    : Math.max(760, luminaryPacedDuration(1_050, playbackMode, timelinePlaybackRate));
  const releaseStaggerMs = reducedMotion
    ? 45
    : Math.max(90, luminaryPacedDuration(130, playbackMode, timelinePlaybackRate));
  const returnFlightMs = reducedMotion
    ? 380
    : Math.max(720, luminaryPacedDuration(920, playbackMode, timelinePlaybackRate));
  const landingHoldMs = reducedMotion
    ? 180
    : Math.max(340, luminaryPacedDuration(460, playbackMode, timelinePlaybackRate));
  const returnSchedule = useMemo(() => buildPaleMerchantReturnSchedule(
    normalizedReturns,
    {
      pullLeadMs,
      playerStaggerMs,
      affinityStaggerMs,
      gatherFlightMs,
      orbitHoldMs,
      releaseStaggerMs,
      returnFlightMs,
      landingHoldMs,
    },
  ), [
    affinityStaggerMs,
    gatherFlightMs,
    landingHoldMs,
    normalizedReturns,
    orbitHoldMs,
    playerStaggerMs,
    pullLeadMs,
    releaseStaggerMs,
    returnFlightMs,
  ]);

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
          reducedDurationMs: 0,
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
            ? Math.max(800, luminaryPacedDuration(900, playbackMode, timelinePlaybackRate))
            : luminaryPacedDuration(320, playbackMode, timelinePlaybackRate),
          reducedDurationMs: normalizedReturns.length > 0 ? 560 : 180,
        },
        {
          id: 'resolve',
          durationMs: returnSchedule.totalDurationMs,
          reducedDurationMs: returnSchedule.totalDurationMs,
          run: () => {
            if (normalizedReturns.length === 0) return;
            setTokensVisible(true);
            clearSoundTimers();
            setActivePlayerIds(new Set());
            setPaidPlayerIds(new Set());
            setOrbitReady(false);
            setReleaseStarted(false);
            returnSchedule.groups.forEach((group) => {
              soundTimersRef.current.push(window.setTimeout(() => {
                setActivePlayerIds(current => new Set(current).add(group.playerId));
              }, group.highlightStartMs));
              soundTimersRef.current.push(window.setTimeout(() => {
                setActivePlayerIds((current) => {
                  const next = new Set(current);
                  next.delete(group.playerId);
                  return next;
                });
                setPaidPlayerIds(current => new Set(current).add(group.playerId));
              }, group.gatherEndMs));
            });
            normalizedReturns.forEach((result) => {
              const gatherDelay = returnSchedule.gatherDelayByKey[returnKey(result)] ?? 0;
              const releaseDelay = returnSchedule.releaseDelayByKey[returnKey(result)]
                ?? returnSchedule.releaseStartMs;
              const landDelay = releaseDelay + Math.max(220, returnFlightMs - 70);
              soundTimersRef.current.push(window.setTimeout(() => {
                gameAudio.playAffinityPayment(
                  Array.from({ length: result.amount }, () => result.affinity),
                );
              }, gatherDelay));
              soundTimersRef.current.push(window.setTimeout(() => {
                gameAudio.playHarnessLand(result.affinity);
                setLandedKeys((current) => new Set(current).add(returnKey(result)));
              }, landDelay));
            });
            soundTimersRef.current.push(window.setTimeout(() => {
              setOrbitReady(true);
              gameAudio.playBalanceDueGather();
            }, returnSchedule.allGatheredAtMs));
            soundTimersRef.current.push(window.setTimeout(() => {
              setReleaseStarted(true);
              gameAudio.playBalanceDueRelease();
            }, returnSchedule.releaseStartMs));
          },
        },
        {
          id: 'aftermath',
          durationMs: luminaryPacedDuration(560, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 300,
          run: () => setActivePlayerIds(new Set()),
        },
      ],
      onPhaseChange: nextPhase => {
        setPhase(nextPhase);
        playLuminaryEffectPhaseSound('lum_pale', nextPhase, '#cbd5e1');
      },
      onSkip: () => {
        gameAudio.stopActivationSting();
        clearSoundTimers();
        setTokensVisible(false);
        setActivePlayerIds(new Set());
        setPaidPlayerIds(new Set(normalizedReturns.map(result => result.playerId)));
        setOrbitReady(false);
        setReleaseStarted(true);
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
      gameAudio.stopActivationSting();
    };
  }, [
    announcementMs,
    gatherFlightMs,
    normalizedReturns,
    playbackMode,
    reducedMotion,
    returnFlightMs,
    returnSchedule,
    timelinePlaybackRate,
  ]);

  const playerTargets = Array.from(new Map(
    geometry.map((entry) => [entry.playerId, {
      playerId: entry.playerId,
      playerName: entry.playerName,
      source: entry.source,
      returns: geometry.filter((candidate) => candidate.playerId === entry.playerId),
    }]),
  ).values());
  const channelTargets = Array.from(geometry.reduce((targets, entry) => {
    const current = targets.get(entry.affinity);
    targets.set(entry.affinity, current
      ? { ...current, amount: current.amount + entry.amount }
      : { ...entry });
    return targets;
  }, new Map<AffinityKey, ReturnGeometry>()).values());
  const displayedPlayerTargets = phase === 'target' || phase === 'resolve'
    ? playerTargets
    : [];
  const displayedChannelTargets = phase === 'resolve' && releaseStarted
    ? channelTargets
    : [];
  const totalTokenCount = geometry.reduce((total, entry) => total + entry.amount, 0);
  const tokenSize = totalTokenCount > 18 ? 28 : totalTokenCount > 10 ? 34 : 40;
  const orbitCenter = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const baseOrbitRadius = Math.min(82, Math.max(50, window.innerWidth * 0.085));
  const orbitSlots = buildPaleMerchantOrbitSlots(totalTokenCount, tokenSize, baseOrbitRadius);
  const orbitRadii = Array.from(new Set(orbitSlots.map(slot => slot.radius)));
  return (
    <div
      className="fixed inset-0 z-[1120] overflow-hidden pointer-events-none"
      data-testid="pale-merchant-return-director"
      data-effect-phase={phase}
      data-return-count={normalizedReturns.length}
      data-player-wave-count={returnSchedule.groups.length}
      data-active-players={[...activePlayerIds].join(',')}
      data-orbit-ready={String(orbitReady)}
      data-release-started={String(releaseStarted)}
      data-reduced-motion={String(reducedMotion)}
      data-timeline-playback-rate={timelinePlaybackRate}
      role="status"
      aria-label={`Pale Merchant returns Affinity from ${playerTargets.length} qualifying player${playerTargets.length === 1 ? '' : 's'}`}
    >
      {displayedPlayerTargets.map((target) => {
        const firstColor = AFFINITY_META[target.returns[0]!.affinity].hex;
        const placeLabelAbove = target.source.y > window.innerHeight * 0.35;
        const active = activePlayerIds.has(target.playerId);
        const paid = paidPlayerIds.has(target.playerId);
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
            animate={active
              ? { opacity: [0.72, 1, 0.88], scale: [1, 1.1, 1.04] }
              : paid
                ? { opacity: 0.4, scale: 0.98 }
                : { opacity: [0, 0.9, 0.72], scale: [0.86, 1.04, 1] }}
            transition={{ duration: reducedMotion ? 0.14 : active ? 0.62 : 0.5 }}
          >
            <div
              className={`absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-black/90 px-2 py-1 text-[9px] font-bold text-white whitespace-nowrap ${
                placeLabelAbove ? 'bottom-full mb-1' : 'top-full mt-1'
              }`}
            >
              <span>{target.playerName ?? 'Player'}</span>
              {phase === 'target' ? (
                <span className="text-white/70">
                  {target.returns.length} {target.returns.length === 1 ? 'Affinity' : 'Affinities'} due
                </span>
              ) : target.returns.map((result) => (
                  <span key={result.key} className="flex items-center gap-0.5" style={{ color: AFFINITY_META[result.affinity].hex }}>
                    <AffinityEmblem color={result.affinity} size={12} />
                    −{result.amount}
                  </span>
                ))}
            </div>
          </motion.div>
        );
      })}

      {displayedChannelTargets.map((target) => {
        const meta = AFFINITY_META[target.affinity];
        const matchingReturns = geometry.filter(entry => entry.affinity === target.affinity);
        const landed = matchingReturns.every(entry => landedKeys.has(entry.key));
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
              +{target.amount}
            </span>
          </motion.div>
        );
      })}

      {tokensVisible && orbitRadii.map((radius, ringIndex) => (
        <motion.div
          key={`balance-due-orbit-${ringIndex}`}
          data-testid={ringIndex === 0 ? 'balance-due-orbit' : undefined}
          data-balance-due-orbit-guide={ringIndex}
          className="fixed rounded-full border border-dashed"
          style={{
            left: orbitCenter.x - radius - 12,
            top: orbitCenter.y - radius - 12,
            width: (radius + 12) * 2,
            height: (radius + 12) * 2,
            zIndex: 1125,
            borderColor: `rgba(226,232,240,${Math.max(0.2, 0.38 - ringIndex * 0.07)})`,
            boxShadow: ringIndex === 0
              ? '0 0 30px rgba(203,213,225,0.16), inset 0 0 24px rgba(255,255,255,0.06)'
              : '0 0 18px rgba(203,213,225,0.08)',
          }}
          initial={{ opacity: 0, scale: 0.7, rotate: -18 - ringIndex * 8 }}
          animate={releaseStarted
            ? { opacity: [0.62, 0], scale: [1, 0.3], rotate: 220 + ringIndex * 34 }
            : orbitReady
              ? { opacity: [0.42, 0.72, 0.54], scale: [0.96, 1.04, 1], rotate: 150 + ringIndex * 28 }
              : { opacity: [0, 0.46], scale: [0.7, 0.96], rotate: 72 + ringIndex * 18 }}
          transition={{ duration: reducedMotion ? 0.24 : releaseStarted ? 0.62 : 1.18, ease: 'easeInOut' }}
        >
          {ringIndex === 0 && (
            <span
              className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                background: 'rgba(248,250,252,0.9)',
                boxShadow: '0 0 16px rgba(226,232,240,0.85)',
              }}
            />
          )}
        </motion.div>
      ))}

      {tokensVisible && geometry.flatMap((result, resultIndex) => {
        const meta = AFFINITY_META[result.affinity];
        const source = centerOf(result.source);
        const destination = centerOf(result.destination);
        const priorTokenCount = geometry
          .slice(0, resultIndex)
          .reduce((total, entry) => total + entry.amount, 0);
        const gatherDelayMs = returnSchedule.gatherDelayByKey[result.key] ?? 0;
        const releaseDelayMs = returnSchedule.releaseDelayByKey[result.key]
          ?? returnSchedule.releaseStartMs;
        return Array.from({ length: result.amount }, (_, tokenIndex) => {
          const ordinal = priorTokenCount + tokenIndex;
          const orbitSlot = orbitSlots[ordinal]!;
          const { ringIndex, radius: orbitRadius, angle: orbitAngle } = orbitSlot;
          const direction = ringIndex % 2 === 0 ? 1 : -1;
          const orbitPoint = {
            x: orbitCenter.x + Math.cos(orbitAngle) * orbitRadius - tokenSize / 2,
            y: orbitCenter.y + Math.sin(orbitAngle) * orbitRadius - tokenSize / 2,
          };
          const animationMs = Math.max(
            gatherFlightMs + returnFlightMs,
            releaseDelayMs + returnFlightMs - gatherDelayMs,
          );
          const gatherFraction = Math.min(0.72, gatherFlightMs / animationMs);
          const releaseFraction = Math.max(
            gatherFraction,
            Math.min(0.9, (releaseDelayMs - gatherDelayMs) / animationMs),
          );

          const playerTokensBefore = geometry
            .slice(0, resultIndex)
            .filter(entry => entry.playerId === result.playerId)
            .reduce((total, entry) => total + entry.amount, 0) + tokenIndex;
          const playerTokenCount = geometry
            .filter(entry => entry.playerId === result.playerId)
            .reduce((total, entry) => total + entry.amount, 0);
          const sourceAngle = -Math.PI / 2
            + (playerTokensBefore / Math.max(1, playerTokenCount)) * Math.PI * 2;
          const sourceRadius = playerTokenCount > 1
            ? (tokenSize + 4) / (2 * Math.sin(Math.PI / playerTokenCount))
            : 0;
          const sourcePoint = {
            x: source.x + Math.cos(sourceAngle) * sourceRadius - tokenSize / 2,
            y: source.y + Math.sin(sourceAngle) * sourceRadius - tokenSize / 2,
          };

          const affinityTokensBefore = geometry
            .slice(0, resultIndex)
            .filter(entry => entry.affinity === result.affinity)
            .reduce((total, entry) => total + entry.amount, 0) + tokenIndex;
          const affinityTokenCount = geometry
            .filter(entry => entry.affinity === result.affinity)
            .reduce((total, entry) => total + entry.amount, 0);
          const destinationLane = affinityTokensBefore - (affinityTokenCount - 1) / 2;
          const destinationPoint = {
            x: destination.x - tokenSize / 2 + destinationLane * 2,
            y: destination.y - tokenSize / 2,
          };

          const gatherDx = orbitPoint.x - sourcePoint.x;
          const gatherDy = orbitPoint.y - sourcePoint.y;
          const gatherDistance = Math.max(1, Math.hypot(gatherDx, gatherDy));
          const gatherBend = direction * (18 + (ordinal % 3) * 5);
          const gatherControl = {
            x: sourcePoint.x + gatherDx * 0.52 - (gatherDy / gatherDistance) * gatherBend,
            y: sourcePoint.y + gatherDy * 0.52 + (gatherDx / gatherDistance) * gatherBend,
          };

          const releaseDx = destinationPoint.x - orbitPoint.x;
          const releaseDy = destinationPoint.y - orbitPoint.y;
          const releaseDistance = Math.max(1, Math.hypot(releaseDx, releaseDy));
          const releaseBend = direction * 16
            + destinationLane * Math.min(20, releaseDistance * 0.06);
          const releaseControl = {
            x: orbitPoint.x + releaseDx * 0.5 - (releaseDy / releaseDistance) * releaseBend,
            y: orbitPoint.y + releaseDy * 0.5 + (releaseDx / releaseDistance) * releaseBend,
          };

          const sampleCount = reducedMotion ? 4 : 10;
          const gatherPath = sampleQuadraticPath(sourcePoint, gatherControl, orbitPoint, sampleCount);
          const releasePath = sampleQuadraticPath(orbitPoint, releaseControl, destinationPoint, sampleCount);
          const points = [
            ...gatherPath,
            orbitPoint,
            ...releasePath.slice(1),
          ];
          const times = [
            ...gatherPath.map((_, index) => (
              gatherFraction * (index / Math.max(1, gatherPath.length - 1))
            )),
            releaseFraction,
            ...releasePath.slice(1).map((_, index) => (
              releaseFraction
              + (1 - releaseFraction) * ((index + 1) / Math.max(1, releasePath.length - 1))
            )),
          ];
          const xValues = points.map(point => point.x);
          const yValues = points.map(point => point.y);
          const opacity = xValues.map((_, index) => (
            index === 0 || index === xValues.length - 1 ? 0 : 1
          ));
          const scale = xValues.map((_, index) => (
            index === 0 ? 0.52 : index === xValues.length - 1 ? 0.18 : 1
          ));
          const initialRotation = direction * ((ordinal % 3) * 8 - 8);
          const rotateValues = times.map(time => initialRotation + direction * time * 480);
          return (
            <motion.div
              key={`${result.key}:${tokenIndex}`}
              className="fixed grid place-items-center rounded-full"
              data-balance-due-token={result.key}
              data-balance-due-orbit-ring={ringIndex}
              style={{
                width: tokenSize,
                height: tokenSize,
                zIndex: 1130 + resultIndex * 2 + tokenIndex,
                background: 'rgba(3,5,14,0.94)',
                border: `1px solid ${meta.hex}cc`,
                boxShadow: `0 0 18px ${meta.glowHex}, inset 0 0 12px ${meta.hex}38`,
              }}
              initial={{
                x: xValues[0],
                y: yValues[0],
                opacity: 0,
                scale: 0.52,
                rotate: rotateValues[0],
              }}
              animate={{
                x: xValues,
                y: yValues,
                opacity,
                scale,
                rotate: rotateValues,
              }}
              transition={{
                duration: animationMs / 1000,
                delay: gatherDelayMs / 1000,
                times,
                ease: 'linear',
              }}
            >
              <AffinityEmblem color={result.affinity} size={Math.max(20, tokenSize - 10)} />
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
          docked
        />
      </div>
    </div>
  );
}
