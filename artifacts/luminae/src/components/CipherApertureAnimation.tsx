import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ARRIVAL_LABEL_LINGER_MS,
  CIPHER_MODE_TOTAL_MS,
  type CipherApertureMode,
} from "../pages/game-constants";

// Encrypt presentation.
//
// The Artifact remains the visual subject throughout:
//  1. release  — the source reacts immediately and releases the card
//  2. conceal  — white circuits branch inward and continuously draw the cipher
//  3. lock     — the completed seal absorbs the card and takes on its affinity
//  4. transfer — the compressed cipher travels to its owner's encrypted pile
//  5. arrive   — the destination absorbs it and confirms receipt

export interface CipherApertureProps {
  animKey: number;
  mode: CipherApertureMode;
  sourceRect: { x: number; y: number; w: number; h: number };
  affinityHex: string;
  cardName: string;
  cardFace: React.ReactNode;
  destPos?: { x: number; y: number };
  gotSingularity?: boolean;
  ownerName?: string;
  onComplete?: () => void;
  /** Keeps the release local to the source instead of staging at viewport center. */
  skipForefront?: boolean;
  /** Lets tutorial and cinematic shells place the effect above their own chrome. */
  overlayZIndex?: number;
}

type Phase = "release" | "conceal" | "lock" | "transfer" | "arrive";

const PHASE_ORDER: Phase[] = [
  "release",
  "conceal",
  "lock",
  "transfer",
  "arrive",
];

export const PHASE_DUR: Record<CipherApertureMode, Record<Phase, number>> = {
  game: { release: 160, conceal: 760, lock: 320, transfer: 500, arrive: 260 },
  tutorial: {
    release: 180,
    conceal: 820,
    lock: 360,
    transfer: 560,
    arrive: 300,
  },
};

(Object.keys(PHASE_DUR) as CipherApertureMode[]).forEach((mode) => {
  const sum = Object.values(PHASE_DUR[mode]).reduce(
    (total, duration) => total + duration,
    0,
  );
  const expected = CIPHER_MODE_TOTAL_MS[mode];
  if (sum !== expected) {
    throw new Error(
      `[CipherApertureAnimation] PHASE_DUR.${mode} sum (${sum} ms) does not match ` +
        `CIPHER_MODE_TOTAL_MS[${mode}] (${expected} ms).`,
    );
  }
});

const clamp = (min: number, value: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function CipherApertureAnimation({
  animKey,
  mode,
  sourceRect,
  affinityHex,
  cardName,
  cardFace,
  destPos,
  gotSingularity,
  ownerName,
  onComplete,
  skipForefront,
  overlayZIndex = 70,
}: CipherApertureProps) {
  const [phase, setPhase] = useState<Phase>("release");
  const [arrivalLabelFading, setArrivalLabelFading] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const dur = PHASE_DUR[mode];

  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const sourceCenter = {
    x: sourceRect.x + sourceRect.w / 2,
    y: sourceRect.y + sourceRect.h / 2,
  };
  const sourceAspect = sourceRect.w / Math.max(1, sourceRect.h);
  const sourceIsCard =
    sourceAspect >= 0.5 && sourceAspect <= 0.86 && sourceRect.w >= 54;

  const normalizedWidth = clamp(
    76,
    sourceRect.h * 0.68,
    Math.min(116, viewportW * 0.28),
  );
  const plateW = sourceIsCard ? sourceRect.w : normalizedWidth;
  const plateH = sourceIsCard ? sourceRect.h : plateW / 0.7;
  const plateLeft = sourceCenter.x - plateW / 2;
  const plateTop = sourceCenter.y - plateH / 2;
  const sourceScale = sourceIsCard
    ? 1
    : clamp(0.2, Math.min(sourceRect.w / plateW, sourceRect.h / plateH), 0.48);

  const dest = destPos ?? { x: viewportW / 2, y: viewportH * 0.9 };
  const travelX = dest.x - sourceCenter.x;
  const travelY = dest.y - sourceCenter.y;
  const travelApexY = Math.min(-22, travelY * 0.42 - 24);
  const destinationScale = clamp(0.2, 38 / Math.max(plateW, 1), 0.36);
  const phaseIndex = PHASE_ORDER.indexOf(phase);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setPhase("release");
    setArrivalLabelFading(false);

    let elapsed = dur.release;
    timersRef.current.push(setTimeout(() => setPhase("conceal"), elapsed));
    elapsed += dur.conceal;
    timersRef.current.push(setTimeout(() => setPhase("lock"), elapsed));
    elapsed += dur.lock;
    timersRef.current.push(setTimeout(() => setPhase("transfer"), elapsed));
    elapsed += dur.transfer;
    timersRef.current.push(setTimeout(() => setPhase("arrive"), elapsed));
    elapsed += dur.arrive;
    timersRef.current.push(setTimeout(() => onComplete?.(), elapsed));
    timersRef.current.push(
      setTimeout(
        () => setArrivalLabelFading(true),
        elapsed + ARRIVAL_LABEL_LINGER_MS,
      ),
    );

    return () => timersRef.current.forEach(clearTimeout);
  }, [animKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const at = (candidate: Phase) => phase === candidate;
  const drawingCipher = phaseIndex >= PHASE_ORDER.indexOf("conceal");
  const cipherLocked = phaseIndex >= PHASE_ORDER.indexOf("lock");

  const plateMotion = at("transfer")
    ? {
        x: [0, travelX * 0.46, travelX],
        y: [skipForefront ? -4 : -8, travelApexY, travelY],
        scale: [1.02, 0.72, destinationScale],
        rotateZ: [0, -2, 4],
        opacity: 1,
      }
    : at("arrive")
      ? {
          x: travelX,
          y: travelY,
          scale: [destinationScale, destinationScale * 0.42],
          rotateZ: 4,
          opacity: [1, 0],
        }
      : {
          x: 0,
          y: at("release") ? -4 : -7,
          scale: at("release") ? (sourceIsCard ? 1.025 : 1) : 1.035,
          rotateZ: 0,
          opacity: 1,
        };

  const plateTransition = at("transfer")
    ? {
        duration: dur.transfer / 1000,
        times: [0, 0.44, 1],
        ease: [0.4, 0, 0.2, 1] as const,
      }
    : at("arrive")
      ? {
          duration: dur.arrive / 1000,
          ease: [0.22, 1, 0.36, 1] as const,
        }
      : {
          duration:
            (at("release")
              ? dur.release
              : at("conceal")
                ? dur.conceal
                : dur.lock) / 1000,
          ease: [0.22, 1, 0.36, 1] as const,
        };

  return (
    <div
      data-testid="cipher-aperture-animation"
      className="pointer-events-none fixed inset-0"
      style={{ zIndex: overlayZIndex }}
    >
      <motion.div
        className="absolute inset-0 bg-black"
        initial={{ opacity: 0 }}
        animate={{
          opacity: at("release") ? 0.12 : at("arrive") ? 0 : 0.3,
        }}
        transition={{ duration: 0.16 }}
      />

      {at("transfer") && (
        <TransferTrace
          affinityHex={affinityHex}
          source={sourceCenter}
          destination={dest}
          durationMs={dur.transfer}
        />
      )}

      <motion.div
        data-testid="cipher-aperture-plate"
        style={{
          position: "fixed",
          left: plateLeft,
          top: plateTop,
          width: plateW,
          height: plateH,
          transformOrigin: "50% 50%",
          perspective: 900,
        }}
        initial={{ x: 0, y: 0, scale: sourceScale, opacity: 0.5, rotateZ: 0 }}
        animate={plateMotion}
        transition={plateTransition}
      >
        <div className="relative h-full w-full overflow-visible">
        <motion.div
            className="absolute inset-0 origin-center overflow-hidden rounded-[8px]"
            initial={{
              scaleX: 1,
              scaleY: 1,
              opacity: 1,
              filter: "brightness(1)",
            }}
          animate={{
              scaleX: cipherLocked ? (at("lock") ? [1, 0.88, 0.07] : 0.07) : 1,
              scaleY: cipherLocked ? (at("lock") ? [1, 0.3, 0.07] : 0.07) : 1,
              opacity: cipherLocked ? (at("lock") ? [1, 0.82, 0] : 0) : 1,
              filter: cipherLocked
                ? at("lock")
                  ? ["brightness(1)", "brightness(1.45)", "brightness(2.25)"]
                  : "brightness(2.25)"
                : "brightness(1)",
              boxShadow: cipherLocked
                ? `0 0 0 1px ${affinityHex}cc, 0 0 24px ${affinityHex}70`
                : "0 0 0 1px rgba(230,240,255,0.28), 0 10px 24px rgba(0,0,0,0.55)",
          }}
          transition={{
              scaleX: {
                duration: cipherLocked ? dur.lock / 1000 : 0.16,
                times: cipherLocked ? [0, 0.58, 1] : undefined,
                ease: [0.4, 0, 0.2, 1],
              },
              scaleY: {
                duration: cipherLocked ? dur.lock / 1000 : 0.16,
                times: cipherLocked ? [0, 0.58, 1] : undefined,
                ease: [0.4, 0, 0.2, 1],
              },
              opacity: {
                duration: cipherLocked ? dur.lock / 1000 : 0.16,
                times: cipherLocked ? [0, 0.68, 1] : undefined,
              },
              filter: { duration: cipherLocked ? dur.lock / 1000 : 0.16 },
              boxShadow: { duration: 0.18 },
          }}
        >
            <div
              className="absolute inset-0"
              style={{
                "--card-w": `${plateW}px`,
                "--card-h": `${plateH}px`,
              } as React.CSSProperties}
            >
              {cardFace}
            </div>

            <motion.div
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: drawingCipher ? 0.24 : 0 }}
              transition={{ duration: 0.18 }}
              style={{
                background:
                  "radial-gradient(circle at 50% 48%, transparent 10%, rgba(1,5,14,0.34) 72%, rgba(1,3,10,0.58) 100%)",
              }}
            />
        </motion.div>

          {drawingCipher && (
            <CipherCircuitConvergence
            affinityHex={affinityHex}
            id={animKey}
              locked={cipherLocked}
              drawDurationMs={dur.conceal}
              lockDurationMs={dur.lock}
          />
      )}
        </div>
        </motion.div>

      {at("arrive") && (
        <DestinationReceipt
          affinityHex={affinityHex}
          destination={dest}
          durationMs={dur.arrive}
        />
      )}

      {at("arrive") && (
        <motion.div
          style={{
            position: "fixed",
            left: dest.x,
            top: dest.y - 48,
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
          }}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: arrivalLabelFading ? 0 : 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          <span
            className="animation-readable-pill animation-readable-pill--cool text-[9px] font-semibold tracking-wide"
            style={{ color: "rgba(224,244,255,0.96)" }}
          >
            <span className="text-white/90">
              {cardName || "Concealed Artifact"}
            </span>
            <span style={{ color: affinityHex, margin: "0 5px" }}>·</span>
            <span>
              {ownerName ? `${ownerName}'s encrypted pile` : "Encrypted pile"}
            </span>
            {gotSingularity && (
              <span style={{ color: "#fbbf24", marginLeft: 6 }}>
                +1 Singularity
          </span>
      )}
          </span>
        </motion.div>
      )}
    </div>
  );
}

function TransferTrace({
  affinityHex,
  source,
  destination,
  durationMs,
}: {
  affinityHex: string;
  source: { x: number; y: number };
  destination: { x: number; y: number };
  durationMs: number;
}) {
  const controlX = source.x + (destination.x - source.x) * 0.5;
  const controlY = Math.min(source.y, destination.y) - 52;
  const path = `M ${source.x} ${source.y} Q ${controlX} ${controlY} ${destination.x} ${destination.y}`;

  return (
    <svg className="fixed inset-0 h-full w-full overflow-visible">
      <defs>
        <filter
          id="cipher-transfer-glow"
          x="-30%"
          y="-30%"
          width="160%"
          height="160%"
        >
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
          <motion.path
        d={path}
        fill="none"
        stroke={affinityHex}
        strokeWidth="1.5"
        strokeLinecap="round"
        filter="url(#cipher-transfer-glow)"
            initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0.75, 0] }}
            transition={{
          pathLength: { duration: durationMs / 1000, ease: "easeInOut" },
          opacity: { duration: durationMs / 1000, times: [0, 0.24, 1] },
            }}
          />
    </svg>
  );
}

const CIPHER_WHITE = "rgba(244,249,255,0.98)";
const CIPHER_TRANSFORM = "translate(48 70) scale(0.62) translate(-48 -48)";

const CIRCUIT_PATHS = [
  { d: "M0 70 H10 V53 H22 V49.23 H35.91", delayFactor: 0 },
  { d: "M0 70 H23.82", delayFactor: 0.035 },
  { d: "M0 70 H10 V87 H22 V90.77 H35.91", delayFactor: 0.07 },
  { d: "M96 70 H86 V53 H74 V49.23 H60.09", delayFactor: 0.015 },
  { d: "M96 70 H72.18", delayFactor: 0.05 },
  { d: "M96 70 H86 V87 H74 V90.77 H60.09", delayFactor: 0.085 },
  { d: "M18 0 V18 H29 V38 H34 V47 L35.91 49.23", delayFactor: 0.02 },
  { d: "M48 0 V24 H42 V43 L48 54.5", delayFactor: 0.06 },
  { d: "M78 0 V18 H67 V38 H62 V47 L60.09 49.23", delayFactor: 0.04 },
  { d: "M18 140 V122 H29 V102 H34 V93 L35.91 90.77", delayFactor: 0.03 },
  { d: "M48 140 V116 H42 V97 L48 85.5", delayFactor: 0.075 },
  { d: "M78 140 V122 H67 V102 H62 V93 L60.09 90.77", delayFactor: 0.055 },
] as const;

const CIPHER_JUNCTIONS = [
  [87, 48],
  [67.5, 81.5],
  [28.5, 81.5],
  [9, 48],
  [28.5, 14.5],
  [67.5, 14.5],
  [48, 23],
  [48, 73],
] as const;

const CIPHER_SEAL_PATHS = [
  {
    d: "M87 48 L67.5 81.5",
    delayFactor: 0.56,
    durationFactor: 0.24,
    width: 1.8,
    opacity: 0.98,
  },
  {
    d: "M67.5 81.5 H28.5",
    delayFactor: 0.56,
    durationFactor: 0.24,
    width: 1.8,
    opacity: 0.98,
  },
  {
    d: "M28.5 81.5 L9 48",
    delayFactor: 0.56,
    durationFactor: 0.24,
    width: 1.8,
    opacity: 0.98,
  },
  {
    d: "M9 48 L28.5 14.5",
    delayFactor: 0.56,
    durationFactor: 0.24,
    width: 1.8,
    opacity: 0.98,
  },
  {
    d: "M28.5 14.5 H67.5",
    delayFactor: 0.56,
    durationFactor: 0.24,
    width: 1.8,
    opacity: 0.98,
  },
  {
    d: "M67.5 14.5 L87 48",
    delayFactor: 0.56,
    durationFactor: 0.24,
    width: 1.8,
    opacity: 0.98,
  },
  {
    d: "M82 48 L64.5 78 H31.5 L14 48 L31.5 18 H64.5 Z",
    delayFactor: 0.62,
    durationFactor: 0.23,
    width: 0.75,
    opacity: 0.5,
  },
  {
    d: "M48 23 L25 34.5 V61.5 L48 73",
    delayFactor: 0.64,
    durationFactor: 0.22,
    width: 1.1,
    opacity: 0.76,
  },
  {
    d: "M48 73 L71 61.5 V34.5 L48 23",
    delayFactor: 0.64,
    durationFactor: 0.22,
    width: 1.1,
    opacity: 0.76,
  },
  {
    d: "M48 32.44 L63.56 48 L48 63.56",
    delayFactor: 0.72,
    durationFactor: 0.17,
    width: 1.45,
    opacity: 0.94,
  },
  {
    d: "M48 63.56 L32.44 48 L48 32.44",
    delayFactor: 0.72,
    durationFactor: 0.17,
    width: 1.45,
    opacity: 0.94,
  },
  {
    d: "M20 28 L76 68",
    delayFactor: 0.73,
    durationFactor: 0.17,
    width: 0.7,
    opacity: 0.45,
  },
  {
    d: "M20 68 L76 28",
    delayFactor: 0.73,
    durationFactor: 0.17,
    width: 0.7,
    opacity: 0.45,
  },
] as const;

function CipherCircuitConvergence({
  affinityHex,
  id,
  locked,
  drawDurationMs,
  lockDurationMs,
}: {
  affinityHex: string;
  id: number;
  locked: boolean;
  drawDurationMs: number;
  lockDurationMs: number;
}) {
  const whiteGlowId = `cipher-white-glow-${id}`;
  const affinityGlowId = `cipher-affinity-glow-${id}`;
  const drawSeconds = drawDurationMs / 1000;
  const lockSeconds = lockDurationMs / 1000;
  const junctionAt = drawSeconds * 0.56;

  return (
    <svg
      data-testid="cipher-circuit-convergence"
      viewBox="0 0 96 140"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full overflow-visible"
      shapeRendering="geometricPrecision"
      aria-hidden="true"
    >
      <defs>
        <filter id={whiteGlowId} x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="1.15" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter
          id={affinityGlowId}
          x="-80%"
          y="-80%"
          width="260%"
          height="260%"
        >
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {CIRCUIT_PATHS.map((path, index) => {
        const delay = drawSeconds * path.delayFactor;
        const duration = Math.max(0.2, junctionAt - delay);
        return (
          <React.Fragment key={`circuit-${index}`}>
      <motion.path
              d={path.d}
              pathLength={1}
        fill="none"
              stroke="rgba(232,244,255,0.9)"
              strokeWidth="1.15"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              filter={`url(#${whiteGlowId})`}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: locked ? 0 : [0, 1, 0.72] }}
              transition={{
                pathLength: { delay, duration, ease: "easeInOut" },
                opacity: locked
                  ? { duration: 0.12 }
                  : { delay, duration, times: [0, 0.22, 1] },
              }}
      />
        <motion.path
              d={path.d}
              pathLength={1}
          fill="none"
              stroke={CIPHER_WHITE}
              strokeWidth="2.1"
          strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="0.12 0.88"
              vectorEffect="non-scaling-stroke"
              filter={`url(#${whiteGlowId})`}
              initial={{ strokeDashoffset: 1, opacity: 0 }}
          animate={{
                strokeDashoffset: 0,
                opacity: locked ? 0 : [0, 1, 1, 0],
          }}
          transition={{
                strokeDashoffset: { delay, duration, ease: "easeInOut" },
                opacity: locked
                  ? { duration: 0.1 }
                  : { delay, duration, times: [0, 0.14, 0.82, 1] },
          }}
        />
          </React.Fragment>
        );
      })}

      <g transform={CIPHER_TRANSFORM}>
        {CIPHER_JUNCTIONS.map(([x, y], index) => (
        <motion.circle
            key={`junction-${index}`}
            cx={x}
            cy={y}
            r="2.8"
            fill={CIPHER_WHITE}
            filter={`url(#${whiteGlowId})`}
            initial={{ opacity: 0, scale: 0.45 }}
            animate={{
              opacity: locked ? 0 : [0, 0, 1, 0.56],
              scale: locked ? 0.6 : [0.45, 0.45, 1.28, 0.74],
          }}
            transition={
              locked
                ? { duration: 0.12 }
                : {
                    delay: Math.max(0, junctionAt - drawSeconds * 0.08),
                    duration: drawSeconds * 0.18,
                    times: [0, 0.34, 0.62, 1],
                  }
            }
            style={{ transformOrigin: `${x}px ${y}px` }}
        />
      ))}

        <motion.polygon
          points="87,48 67.5,81.5 28.5,81.5 9,48 28.5,14.5 67.5,14.5"
          fill={affinityHex}
          filter={`url(#${affinityGlowId})`}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: locked ? 0.16 : 0, scale: locked ? 1 : 0.9 }}
          transition={{ duration: lockSeconds, ease: "easeInOut" }}
          style={{ transformOrigin: "48px 48px" }}
      />

        {CIPHER_SEAL_PATHS.map((path, index) => {
          const delay = drawSeconds * path.delayFactor;
          const duration = drawSeconds * path.durationFactor;
          const glow = locked ? affinityGlowId : whiteGlowId;
          return (
            <React.Fragment key={`seal-${index}`}>
      <motion.path
                d={path.d}
                pathLength={1}
        fill="none"
                stroke={CIPHER_WHITE}
                strokeWidth={path.width}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                filter={`url(#${glow})`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{
                  pathLength: 1,
                  opacity: path.opacity,
                  stroke: locked ? affinityHex : CIPHER_WHITE,
        }}
        transition={{
                  pathLength: { delay, duration, ease: "easeInOut" },
                  opacity: { delay, duration: Math.min(0.12, duration) },
                  stroke: { duration: lockSeconds, ease: "easeInOut" },
        }}
      />
              <motion.path
                d={path.d}
                pathLength={1}
                fill="none"
                stroke={CIPHER_WHITE}
                strokeWidth={path.width + 1}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="0.09 0.91"
                vectorEffect="non-scaling-stroke"
                filter={`url(#${whiteGlowId})`}
                initial={{ strokeDashoffset: 1, opacity: 0 }}
                animate={{
                  strokeDashoffset: 0,
                  opacity: locked ? 0 : [0, 1, 1, 0],
        }}
        transition={{
                  strokeDashoffset: { delay, duration, ease: "easeInOut" },
                  opacity: locked
                    ? { duration: 0.1 }
                    : { delay, duration, times: [0, 0.12, 0.8, 1] },
        }}
      />
            </React.Fragment>
          );
        })}

        <motion.polygon
          points="48,32.44 63.56,48 48,63.56 32.44,48"
          fill={affinityHex}
          filter={`url(#${affinityGlowId})`}
          initial={{ opacity: 0, scale: 0.72 }}
          animate={{ opacity: locked ? 0.56 : 0, scale: locked ? 1 : 0.72 }}
          transition={{ duration: lockSeconds, ease: [0.22, 1, 0.36, 1] }}
          style={{ transformOrigin: "48px 48px" }}
      />
        <motion.circle
          cx="48"
          cy="48"
          fill={CIPHER_WHITE}
          filter={`url(#${affinityGlowId})`}
          initial={{ r: 1, opacity: 0 }}
          animate={{
            r: locked ? [1, 17, 4] : 1,
            opacity: locked ? [0, 0.62, 0.16] : 0,
        }}
        transition={{
            duration: lockSeconds,
            times: [0, 0.56, 1],
            ease: "easeOut",
        }}
      />
      </g>
    </svg>
  );
}

function DestinationReceipt({
  affinityHex,
  destination,
  durationMs,
}: {
  affinityHex: string;
  destination: { x: number; y: number };
  durationMs: number;
}) {
  return (
    <>
      <motion.div
        style={{
          position: "fixed",
          left: destination.x - 34,
          top: destination.y - 34,
          width: 68,
          height: 68,
          borderRadius: "50%",
          border: `1.5px solid ${affinityHex}`,
          boxShadow: `0 0 18px 4px ${affinityHex}55`,
        }}
        initial={{ scale: 0.35, opacity: 0.95 }}
        animate={{ scale: 2.5, opacity: 0 }}
        transition={{ duration: durationMs / 1000, ease: "easeOut" }}
      />
      <motion.div
        style={{
          position: "fixed",
          left: destination.x - 6,
          top: destination.y - 6,
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "white",
          boxShadow: `0 0 18px 7px ${affinityHex}`,
        }}
        initial={{ scale: 0.2, opacity: 0 }}
        animate={{ scale: [0.2, 1.4, 0.5], opacity: [0, 1, 0] }}
        transition={{ duration: durationMs / 1000, times: [0, 0.34, 1] }}
      />
    </>
  );
}

export { CipherSigil } from "@/components/CipherSigil";
