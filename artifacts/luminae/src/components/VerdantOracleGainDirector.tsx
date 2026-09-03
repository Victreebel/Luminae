import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { AffinityEmblem } from './AffinityEmblem';
import { LuminaryEffectSkipControl } from './LuminaryEffectChrome';
import { AFFINITY_META } from '@/lib/affinityMeta';
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

interface TransferGeometry {
  source: ViewportRect;
  destination: ViewportRect;
}

interface VerdantOracleGainDirectorProps {
  playerId: string;
  playerName?: string;
  amount: number;
  reducedMotion?: boolean;
  playbackMode?: LuminaryPlaybackMode;
  timelinePlaybackRate?: number;
  queuePosition?: number;
  queueTotal?: number;
  onResolutionStart?: () => void;
  onComplete: (skipped: boolean) => void;
}

const TOKEN_SIZE = 48;
const VERDANCE = AFFINITY_META.verdance;

function firstVisibleRect(selector: string): ViewportRect | null {
  for (const element of document.querySelectorAll<HTMLElement>(selector)) {
    const rect = element.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    }
  }
  return null;
}

function center(rect: ViewportRect) {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function fallbackSource(): ViewportRect {
  return {
    left: window.innerWidth / 2 - 28,
    top: window.innerHeight * 0.72,
    width: 56,
    height: 56,
  };
}

function fallbackDestination(): ViewportRect {
  return {
    left: window.innerWidth / 2 - 64,
    top: 38,
    width: 128,
    height: 44,
  };
}

export function VerdantOracleGainDirector({
  playerId,
  playerName,
  amount,
  reducedMotion = false,
  playbackMode = 'standard',
  timelinePlaybackRate = 1,
  onResolutionStart,
  onComplete,
}: VerdantOracleGainDirectorProps) {
  const normalizedAmount = amount > 0 ? 1 : 0;
  const [phase, setPhase] = useState<LuminaryEffectPhaseId>('announce');
  const [resolving, setResolving] = useState(false);
  const [landed, setLanded] = useState(false);
  const [geometry, setGeometry] = useState<TransferGeometry | null>(null);
  const sequenceRef = useRef<LuminaryEffectSequenceController | null>(null);
  const impactTimerRef = useRef<number | null>(null);
  const onCompleteRef = useRef(onComplete);
  const onResolutionStartRef = useRef(onResolutionStart);

  onCompleteRef.current = onComplete;
  onResolutionStartRef.current = onResolutionStart;

  const recipient = playerName ?? 'The allied player';
  const description = normalizedAmount > 0
    ? `${recipient} gains 1 Verdance from the Affinity Well.`
    : `${recipient} cannot gain another Verdance token.`;
  const announcementMs = reducedMotion
    ? 0
    : luminaryPacedDuration(80, playbackMode, timelinePlaybackRate);
  const targetMs = reducedMotion
    ? 240
    : luminaryPacedDuration(520, playbackMode, timelinePlaybackRate);
  const flightMs = reducedMotion
    ? 520
    : Math.max(950, luminaryPacedDuration(1_180, playbackMode, timelinePlaybackRate));
  const resultMs = reducedMotion
    ? 260
    : luminaryPacedDuration(560, playbackMode, timelinePlaybackRate);
  useEffect(() => {
    const clearImpactTimer = () => {
      if (impactTimerRef.current !== null) {
        window.clearTimeout(impactTimerRef.current);
        impactTimerRef.current = null;
      }
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
          durationMs: reducedMotion ? 80 : luminaryPacedDuration(180, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 80,
          run: () => {
            const escapedPlayerId = CSS.escape(playerId);
            setGeometry({
              source: firstVisibleRect(
                '[data-shared-affinity-well] [data-affinity-symbol="verdance"]',
              ) ?? fallbackSource(),
              destination: firstVisibleRect(
                `[data-player-affinity-source="${escapedPlayerId}"], ` +
                `[data-opponent-chip="${escapedPlayerId}"]`,
              ) ?? fallbackDestination(),
            });
            onResolutionStartRef.current?.();
          },
        },
        {
          id: 'target',
          durationMs: targetMs,
          reducedDurationMs: 240,
        },
        {
          id: 'resolve',
          durationMs: normalizedAmount > 0 ? flightMs : 320,
          reducedDurationMs: normalizedAmount > 0 ? 520 : 180,
          run: () => {
            if (normalizedAmount === 0) {
              setLanded(true);
              return;
            }
            setResolving(true);
            gameAudio.playEarlyBloomGrowth(flightMs);
            clearImpactTimer();
            impactTimerRef.current = window.setTimeout(() => {
              setLanded(true);
              gameAudio.playHarnessLand('verdance');
            }, Math.max(220, Math.round(flightMs * 0.76)));
          },
        },
        {
          id: 'reveal',
          durationMs: resultMs,
          reducedDurationMs: 260,
        },
        {
          id: 'aftermath',
          durationMs: reducedMotion ? 80 : luminaryPacedDuration(180, playbackMode, timelinePlaybackRate),
          reducedDurationMs: 80,
        },
      ],
      onPhaseChange: nextPhase => {
        setPhase(nextPhase);
        if (normalizedAmount > 0 || nextPhase === 'target') {
          playLuminaryEffectPhaseSound('lum_verdant', nextPhase, VERDANCE.glowHex);
        }
      },
      onSkip: () => {
        gameAudio.stopActivationSting();
        clearImpactTimer();
        setLanded(normalizedAmount > 0);
      },
      onComplete: (skipped) => onCompleteRef.current(skipped),
    });

    sequenceRef.current = sequence;
    sequence.start();
    return () => {
      clearImpactTimer();
      sequence.cancel();
      if (sequenceRef.current === sequence) sequenceRef.current = null;
      gameAudio.stopActivationSting();
    };
  }, [
    announcementMs,
    flightMs,
    normalizedAmount,
    playbackMode,
    playerId,
    reducedMotion,
    resultMs,
    targetMs,
    timelinePlaybackRate,
  ]);

  const sourceCenter = geometry ? center(geometry.source) : null;
  const destinationCenter = geometry ? center(geometry.destination) : null;
  const dx = sourceCenter && destinationCenter ? destinationCenter.x - sourceCenter.x : 0;
  const dy = sourceCenter && destinationCenter ? destinationCenter.y - sourceCenter.y : 0;
  const showTargets = phase === 'target' || phase === 'resolve' || phase === 'reveal';

  return (
    <div
      className="fixed inset-0 z-[9040] overflow-hidden pointer-events-none"
      data-testid="verdant-oracle-gain-director"
      data-effect-phase={phase}
      data-affinity-amount={normalizedAmount}
      role="status"
      aria-label={description}
    >
      {geometry && showTargets && (
        <>
          <motion.div
            className="fixed rounded-full border-2"
            data-early-bloom-source="verdance"
            style={{
              left: geometry.source.left - 8,
              top: geometry.source.top - 8,
              width: geometry.source.width + 16,
              height: geometry.source.height + 16,
              borderColor: `${VERDANCE.hex}dd`,
              boxShadow: `0 0 24px ${VERDANCE.glowHex}`,
            }}
            initial={{ opacity: 0, scale: 0.76 }}
            animate={{ opacity: landed ? 0.25 : [0, 1, 0.62], scale: [0.76, 1.14, 1] }}
            transition={{ duration: reducedMotion ? 0.18 : 0.48 }}
          >
            <span
              className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap rounded-full border bg-black/90 px-2 py-0.5 text-[9px] font-black uppercase"
              style={{ color: VERDANCE.hex, borderColor: `${VERDANCE.hex}88` }}
            >
              Affinity Well -1
            </span>
          </motion.div>

          <motion.div
            className="fixed rounded-xl border-2"
            data-early-bloom-recipient={playerId}
            style={{
              left: geometry.destination.left - 8,
              top: geometry.destination.top - 8,
              width: geometry.destination.width + 16,
              height: geometry.destination.height + 16,
              borderColor: `${VERDANCE.hex}dd`,
              boxShadow: landed
                ? `0 0 34px ${VERDANCE.glowHex}, inset 0 0 20px ${VERDANCE.hex}44`
                : `0 0 18px ${VERDANCE.glowHex}`,
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={landed
              ? { opacity: [0.7, 1, 0.72], scale: [1, 1.12, 1] }
              : { opacity: [0, 0.9, 0.58], scale: [0.9, 1.04, 1] }}
            transition={{ duration: landed ? (reducedMotion ? 0.2 : 0.52) : (reducedMotion ? 0.18 : 0.48) }}
          >
            <span
              className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-full border bg-black/90 px-2 py-0.5 text-[9px] font-black uppercase"
              style={{ color: VERDANCE.hex, borderColor: `${VERDANCE.hex}88` }}
            >
              {recipient}{normalizedAmount > 0 ? ' +1' : ''}
            </span>
          </motion.div>
        </>
      )}

      {sourceCenter && destinationCenter && resolving && normalizedAmount > 0 && (
        <motion.div
          className="fixed grid place-items-center rounded-full border"
          data-early-bloom-token="verdance"
          style={{
            left: sourceCenter.x - TOKEN_SIZE / 2,
            top: sourceCenter.y - TOKEN_SIZE / 2,
            width: TOKEN_SIZE,
            height: TOKEN_SIZE,
            background: 'rgba(2,12,8,0.96)',
            borderColor: `${VERDANCE.hex}dd`,
            boxShadow: `0 0 22px ${VERDANCE.glowHex}, inset 0 0 14px ${VERDANCE.hex}38`,
          }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.58 }}
          animate={{
            opacity: [0, 1, 1, 1, 0],
            x: [0, dx * 0.24, dx * 0.68, dx],
            y: [0, dy * 0.18 - 72, dy * 0.62 - 38, dy],
            scale: [0.58, 1.08, 0.96, 0.72, 0.35],
          }}
          transition={{
            duration: flightMs / 1_000,
            times: [0, 0.18, 0.58, 0.82, 1],
            ease: [0.2, 0.72, 0.18, 1],
          }}
        >
          <AffinityEmblem color="verdance" size={34} />
        </motion.div>
      )}

      {destinationCenter && landed && normalizedAmount > 0 && (
        <motion.div
          className="fixed grid place-items-center rounded-full border-2"
          data-early-bloom-impact="verdance"
          style={{
            left: destinationCenter.x - 38,
            top: destinationCenter.y - 38,
            width: 76,
            height: 76,
            borderColor: VERDANCE.hex,
            boxShadow: `0 0 30px ${VERDANCE.glowHex}, inset 0 0 22px ${VERDANCE.hex}55`,
          }}
          initial={{ opacity: 0, scale: 0.35 }}
          animate={{ opacity: [0, 1, 0.85, 0], scale: [0.35, 1.2, 0.92, 1.42] }}
          transition={{ duration: reducedMotion ? 0.38 : 0.82 }}
        >
          <AffinityEmblem color="verdance" size={40} />
        </motion.div>
      )}

      <div className="pointer-events-auto">
        <LuminaryEffectSkipControl
          color={VERDANCE.hex}
          onAdvance={() => sequenceRef.current?.advance()}
          onSkip={() => sequenceRef.current?.skip()}
          reducedMotion={reducedMotion}
        />
      </div>
    </div>
  );
}
