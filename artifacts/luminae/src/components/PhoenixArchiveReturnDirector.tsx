import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { CARD_ART } from "@/pages/game-constants";
import {
  LuminaryEffectAnnouncement,
  LuminaryEffectSkipControl,
} from "./LuminaryEffectChrome";
import {
  createLuminaryEffectSequence,
  type LuminaryEffectPhaseId,
  type LuminaryEffectSequenceController,
} from "@/lib/luminaryEffectSequence";
import {
  archivePulseDelayForIndexes,
  PHOENIX_ARCHIVE_FLIGHT_MS,
  PHOENIX_ARCHIVE_STAGGER_MS,
} from "./phoenixArchiveReturnTiming";

type Tier = 1 | 2 | 3;

interface Point {
  x: number;
  y: number;
}

interface ReturnFlight {
  cardId: string;
  tier: Tier;
  from: Point;
  to: Point;
  index: number;
}

interface PhoenixArchiveReturnDirectorProps {
  cardIds: string[];
  reducedMotion?: boolean;
  triggeringPlayerName?: string;
  queuePosition?: number;
  queueTotal?: number;
  onComplete: (skipped: boolean) => void;
}

const CARD_WIDTH = 50;
const CARD_HEIGHT = 68;

function tierFromCardId(cardId: string): Tier {
  if (cardId.startsWith("t3")) return 3;
  if (cardId.startsWith("t2")) return 2;
  return 1;
}

function centerOf(rect: DOMRect): Point {
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height / 2,
  };
}

function fallbackArchivePoint(tier: Tier): Point {
  const x = window.innerWidth * (tier === 1 ? 0.25 : tier === 2 ? 0.5 : 0.75);
  return { x, y: Math.max(96, window.innerHeight * 0.24) };
}

export function PhoenixArchiveReturnDirector({
  cardIds,
  reducedMotion = false,
  triggeringPlayerName,
  queuePosition = 1,
  queueTotal = 1,
  onComplete,
}: PhoenixArchiveReturnDirectorProps) {
  const [flights, setFlights] = useState<ReturnFlight[]>([]);
  const [ready, setReady] = useState(false);
  const [directorPhase, setDirectorPhase] =
    useState<LuminaryEffectPhaseId>("announce");
  const sequenceRef = useRef<LuminaryEffectSequenceController | null>(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const tierCounts = useMemo(() => {
    const counts: Record<Tier, number> = { 1: 0, 2: 0, 3: 0 };
    cardIds.forEach((cardId) => {
      counts[tierFromCardId(cardId)]++;
    });
    return counts;
  }, [cardIds]);

  useEffect(() => {
    let preparedFlights: ReturnFlight[] = [];
    const flightDurationMs = Math.max(
      950,
      PHOENIX_ARCHIVE_FLIGHT_MS +
        Math.max(0, cardIds.length - 1) * PHOENIX_ARCHIVE_STAGGER_MS +
        280,
    );

    const sequence = createLuminaryEffectSequence({
      reducedMotion,
      phases: [
        {
          id: "announce",
          durationMs: 900,
          reducedDurationMs: 160,
          run: () => setReady(true),
        },
        {
          id: "frame",
          durationMs: 180,
          reducedDurationMs: 0,
          run: () => {
            const sourceElement = document.querySelector<HTMLElement>(
              "[data-burn-pile-chip-anchor]",
            );
            const source = sourceElement
              ? centerOf(sourceElement.getBoundingClientRect())
              : {
                  x: window.innerWidth / 2,
                  y: Math.max(72, window.innerHeight * 0.14),
                };

            const archivePoints = new Map<Tier, Point>();
            for (const tier of [1, 2, 3] as const) {
              const archive = document.querySelector<HTMLElement>(
                `[data-deck-tier="${tier}"]`,
              );
              archivePoints.set(
                tier,
                archive
                  ? centerOf(archive.getBoundingClientRect())
                  : fallbackArchivePoint(tier),
              );
            }

            preparedFlights = cardIds.map((cardId, index) => ({
              cardId,
              tier: tierFromCardId(cardId),
              from: source,
              to:
                archivePoints.get(tierFromCardId(cardId)) ??
                fallbackArchivePoint(tierFromCardId(cardId)),
              index,
            }));
          },
        },
        {
          id: "target",
          durationMs: 180,
          reducedDurationMs: 0,
        },
        {
          id: "resolve",
          durationMs: flightDurationMs,
          reducedDurationMs: 320,
          run: () => setFlights(preparedFlights),
        },
        {
          id: "reveal",
        },
        {
          id: "aftermath",
          durationMs: 280,
          reducedDurationMs: 80,
        },
      ],
      onPhaseChange: setDirectorPhase,
      onSkip: () => {
        setFlights([]);
      },
      onComplete: skipped => onCompleteRef.current(skipped),
    });
    sequenceRef.current = sequence;
    sequence.start();

    return () => {
      sequence.cancel();
      if (sequenceRef.current === sequence) sequenceRef.current = null;
    };
  }, [cardIds, reducedMotion]);
  const queueLabel = queueTotal > 1
    ? `START OF TURN EFFECT · ${queuePosition} OF ${queueTotal}`
    : "START OF TURN EFFECT";

  return (
    <div
      className="fixed inset-0 z-[1120] overflow-hidden"
      data-testid="phoenix-archive-return-director"
      data-effect-phase={directorPhase}
      role="status"
      aria-label={`Phoenix Paradox is returning ${cardIds.length} Burned Artifact${cardIds.length === 1 ? "" : "s"} to the Archives`}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0.08 : 0.18 }}
        style={{
          background:
            "radial-gradient(circle at 50% 28%, rgba(42,68,128,0.22), rgba(10,4,16,0.48) 52%, rgba(2,3,8,0.68))",
          backdropFilter: "blur(1.5px)",
        }}
      />

      <motion.div
        className="absolute left-1/2 top-[8%] -translate-x-1/2 text-center pointer-events-none"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: ready ? 1 : 0, y: 0 }}
        transition={{ duration: reducedMotion ? 0.1 : 0.28 }}
      >
        <LuminaryEffectAnnouncement
          effectName="Eternal Recurrence"
          luminaryName="Phoenix Paradox"
          description={`${cardIds.length} burned Artifact${cardIds.length === 1 ? "" : "s"} return to the Archives.`}
          triggeringPlayerName={triggeringPlayerName}
          queueLabel={queueLabel}
          primaryColor="#fda4af"
          secondaryColor="#93c5fd"
          compact
        />
      </motion.div>

      {flights.map((flight) => {
        const fan = ((flight.index % 7) - 3) * 6;
        const delay = reducedMotion
          ? 0
          : (flight.index * PHOENIX_ARCHIVE_STAGGER_MS) / 1000;
        const midpointX =
          flight.from.x + (flight.to.x - flight.from.x) * 0.48 + fan;
        const midpointY =
          Math.min(flight.from.y, flight.to.y) - 64 - (flight.index % 3) * 10;
        return (
          <motion.div
            key={`${flight.cardId}-${flight.index}`}
            className="fixed overflow-hidden pointer-events-none"
            initial={{
              x: flight.from.x - CARD_WIDTH / 2 + fan * 0.25,
              y: flight.from.y - CARD_HEIGHT / 2,
              opacity: 0,
              scale: 0.58,
              rotateZ: fan * 0.45,
              rotateY: 0,
            }}
            animate={
              reducedMotion
                ? {
                    x: flight.to.x - CARD_WIDTH / 2,
                    y: flight.to.y - CARD_HEIGHT / 2,
                    opacity: [0, 1, 0],
                    scale: [0.72, 0.82, 0.32],
                  }
                : {
                    x: [
                      flight.from.x - CARD_WIDTH / 2 + fan * 0.25,
                      midpointX - CARD_WIDTH / 2,
                      flight.to.x - CARD_WIDTH / 2,
                    ],
                    y: [
                      flight.from.y - CARD_HEIGHT / 2,
                      midpointY - CARD_HEIGHT / 2,
                      flight.to.y - CARD_HEIGHT / 2,
                    ],
                    opacity: [0, 1, 1, 0],
                    scale: [0.58, 1, 0.92, 0.24],
                    rotateZ: [fan * 0.45, fan * -0.22, 0],
                    rotateY: [0, 32, 88],
                    filter: [
                      "brightness(0.75) saturate(0.75)",
                      "brightness(1.2) saturate(1.05)",
                      "brightness(1.65) saturate(0.8)",
                    ],
                  }
            }
            transition={{
              duration: reducedMotion ? 0.32 : PHOENIX_ARCHIVE_FLIGHT_MS / 1000,
              delay,
              ease: [0.22, 0.72, 0.18, 1],
            }}
            style={{
              width: CARD_WIDTH,
              height: CARD_HEIGHT,
              zIndex: 1130 + flight.index,
              border: "1px solid rgba(191,219,254,0.78)",
              borderRadius: 4,
              background: "#050914",
              boxShadow:
                "0 0 14px rgba(61,107,255,0.7), 0 0 8px rgba(244,63,94,0.45)",
              transformStyle: "preserve-3d",
            }}
          >
            {CARD_ART[flight.cardId] ? (
              <img
                src={CARD_ART[flight.cardId]}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <div className="h-full w-full grid place-items-center text-[9px] text-blue-100/70">
                T{flight.tier}
              </div>
            )}
            <span
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(135deg, rgba(244,63,94,0.12), transparent 42%, rgba(61,107,255,0.28))",
                boxShadow: "inset 0 0 10px rgba(191,219,254,0.3)",
              }}
            />
          </motion.div>
        );
      })}

      {([1, 2, 3] as const).map((tier) => {
        const count = tierCounts[tier];
        if (!count) return null;
        const tierFlights = flights.filter((flight) => flight.tier === tier);
        const pulseDelay = archivePulseDelayForIndexes(
          tierFlights.map((flight) => flight.index),
          reducedMotion,
        );
        if (pulseDelay === null) return null;
        const archive = tierFlights[0]?.to ?? fallbackArchivePoint(tier);
        return (
          <motion.div
            key={`archive-pulse-${tier}`}
            className="fixed grid place-items-center rounded-full pointer-events-none"
            initial={{
              x: archive.x - 24,
              y: archive.y - 24,
              width: 48,
              height: 48,
              opacity: 0,
              scale: 0.5,
            }}
            animate={{ opacity: [0, 0.85, 0], scale: [0.5, 1.6, 1.9] }}
            transition={{
              delay: pulseDelay,
              duration: reducedMotion ? 0.18 : 0.42,
              ease: "easeOut",
            }}
            style={{
              border: "1px solid rgba(147,197,253,0.78)",
              color: "#dbeafe",
              background:
                "radial-gradient(circle, rgba(244,63,94,0.28), rgba(61,107,255,0.18) 52%, transparent 72%)",
              boxShadow: "0 0 22px rgba(61,107,255,0.8)",
              zIndex: 1140,
            }}
          >
            <span className="text-[10px] font-bold">+{count}</span>
          </motion.div>
        );
      })}

      <LuminaryEffectSkipControl
        color="#fda4af"
        reducedMotion={reducedMotion}
        onSkip={() => sequenceRef.current?.skip()}
        label="Skip Eternal Recurrence phase"
      />
    </div>
  );
}
