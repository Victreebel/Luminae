import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { gameAudio } from "@/lib/audio";
import { recordTelemetry } from "@/lib/telemetry";

export type TransmissionFaultVariant = "boundary" | "vault";

const VAULT_FRAGMENTS = ["BA······", "··SILI··", "·····ISK"] as const;
const INTERFERENCE_BANDS = [
  { top: 13, height: 5, shift: 6 },
  { top: 31, height: 2, shift: -9 },
  { top: 54, height: 7, shift: 11 },
  { top: 76, height: 3, shift: -7 },
] as const;

function StaticNoiseField({ reduceMotion }: { reduceMotion: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let context: CanvasRenderingContext2D | null = null;
    try {
      context = canvas.getContext("2d");
    } catch {
      return;
    }
    if (!context) return;

    const frame = context.createImageData(canvas.width, canvas.height);
    for (let offset = 0; offset < frame.data.length; offset += 4) {
      const value = Math.floor(Math.random() * 256);
      frame.data[offset] = value;
      frame.data[offset + 1] = value;
      frame.data[offset + 2] = value;
      frame.data[offset + 3] = 110 + Math.floor(Math.random() * 146);
    }
    context.putImageData(frame, 0, 0);
  }, []);

  return (
    <motion.canvas
      ref={canvasRef}
      width={240}
      height={160}
      data-testid="transmission-static-field"
      className="absolute -inset-[8%] h-[116%] w-[116%]"
      animate={reduceMotion ? undefined : {
        x: [0, -15, 9, -6, 13, 0],
        y: [0, 8, -12, 5, -7, 0],
        opacity: [0.56, 0.78, 0.6, 0.82, 0.58, 0.74],
      }}
      transition={{ duration: 0.13, repeat: Infinity, ease: "linear" }}
      style={{
        imageRendering: "pixelated",
        filter: reduceMotion ? "contrast(1.35)" : "contrast(2.45)",
        mixBlendMode: "screen",
        opacity: reduceMotion ? 0.3 : undefined,
      }}
    />
  );
}

export function TransmissionFault({
  variant,
  muted,
  delayMs = 0,
  reducedMotion: reducedMotionOverride,
  onComplete,
}: {
  variant: TransmissionFaultVariant;
  muted: boolean;
  delayMs?: number;
  reducedMotion?: boolean;
  onComplete: () => void;
}) {
  const systemReducedMotion = useReducedMotion();
  const reduceMotion = reducedMotionOverride ?? systemReducedMotion === true;
  const completedRef = useRef(false);
  const [fragmentIndex, setFragmentIndex] = useState(0);
  const [started, setStarted] = useState(delayMs <= 0);
  const durationMs = reduceMotion
    ? variant === "boundary" ? 420 : 900
    : variant === "boundary" ? 1_050 : 1_650;

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (started) return undefined;
    const timer = window.setTimeout(() => setStarted(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [delayMs, started]);

  useEffect(() => {
    if (!started) return undefined;
    recordTelemetry("transmission_fault_presented", { variant });
    if (!muted) gameAudio.playTutorialCue("transmission-fault");
    const completionFallback = window.setTimeout(finish, durationMs + 180);
    if (variant !== "vault") return () => window.clearTimeout(completionFallback);

    const intervalMs = reduceMotion ? 260 : 430;
    const fragmentTimers = VAULT_FRAGMENTS.slice(1).map((_, index) =>
      window.setTimeout(() => setFragmentIndex(index + 1), intervalMs * (index + 1)),
    );
    return () => {
      window.clearTimeout(completionFallback);
      fragmentTimers.forEach(window.clearTimeout);
    };
  }, [durationMs, finish, muted, reduceMotion, started, variant]);

  const label = variant === "vault" ? VAULT_FRAGMENTS[fragmentIndex] : null;

  if (!started) return null;

  return (
    <motion.div
      data-testid={`transmission-fault-${variant}`}
      aria-hidden="true"
      className="fixed inset-0 z-[190] overflow-hidden pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: reduceMotion ? [0, 0.78, 0.78, 0] : [0, 0.9, 0.84, 0] }}
      transition={{ duration: durationMs / 1_000, times: [0, 0.12, 0.78, 1], ease: "easeInOut" }}
      onAnimationComplete={finish}
      style={{
        background: variant === "vault"
          ? "rgba(5, 0, 12, 0.58)"
          : "rgba(1, 3, 7, 0.48)",
        backdropFilter: reduceMotion
          ? "grayscale(0.82) contrast(1.18)"
          : "grayscale(1) contrast(1.48) brightness(0.86)",
      }}
    >
      <StaticNoiseField reduceMotion={reduceMotion} />
      <div
        data-testid="transmission-scanlines"
        className="absolute inset-0"
        style={{
          background: "repeating-linear-gradient(180deg, rgba(255,255,255,0.055) 0 1px, rgba(0,0,0,0.34) 1px 3px, transparent 3px 5px)",
          mixBlendMode: "overlay",
          opacity: reduceMotion ? 0.28 : 0.62,
        }}
      />
      {!reduceMotion && INTERFERENCE_BANDS.map(({ top, height, shift }, index) => (
        <motion.div
          key={top}
          className="absolute -left-[12%] -right-[12%] overflow-hidden border-y border-white/10"
          style={{
            top: `${top}%`,
            height: `${height}%`,
            background: "repeating-linear-gradient(90deg, rgba(255,255,255,0.72) 0 2px, rgba(5,8,13,0.82) 2px 5px, rgba(255,255,255,0.28) 5px 8px)",
            mixBlendMode: "screen",
            backdropFilter: "contrast(2.4) brightness(1.35)",
          }}
          animate={{
            x: [0, `${shift}%`, `${shift * -0.45}%`, 0],
            opacity: index % 2 === 0 ? [0.45, 0.9, 0.55, 0.72] : [0.68, 0.4, 0.86, 0.58],
          }}
          transition={{ duration: 0.22 + index * 0.025, repeat: Infinity, ease: "linear" }}
        />
      ))}
      {label && <div className="absolute inset-0 flex items-center justify-center px-6">
        <motion.span
          key={label}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 0.86, y: 0 }}
          className="relative z-10 bg-black/45 px-2 py-1 font-mono text-xs font-semibold text-white/90"
          style={{ letterSpacing: 0, textShadow: "0 0 8px rgba(255,255,255,0.55)" }}
        >
          {label}
        </motion.span>
      </div>}
    </motion.div>
  );
}
