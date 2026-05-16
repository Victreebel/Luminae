import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

const TOTAL = 3.1;       // seconds — animation timeline duration
const COMPLETE_DELAY = 3.16; // tiny buffer so final white frame is visible before routing

const AFFINITY = [
  { color: "#f87171", rgba: "rgba(248,113,113,0.9)" },  // ruby  / Flare
  { color: "#60a5fa", rgba: "rgba(96,165,250,0.9)" },   // sapphire / Radiance
  { color: "#4ade80", rgba: "rgba(74,222,128,0.9)" },   // emerald / Verdance
  { color: "#c084fc", rgba: "rgba(192,132,252,0.9)" },  // onyx / Abyss
  { color: "#e2e8f0", rgba: "rgba(226,232,240,0.9)" },  // pearl / Continuum
];

function buildVortexGradient(): string {
  const n = AFFINITY.length;
  const parts: string[] = [];
  for (let i = 0; i < n; i++) {
    const base = (i / n) * 360;
    const peak = base + (360 / n) * 0.26;
    const end = base + (360 / n) * 0.5;
    parts.push(
      `transparent ${base.toFixed(1)}deg`,
      `${AFFINITY[i].rgba} ${peak.toFixed(1)}deg`,
      `transparent ${end.toFixed(1)}deg`,
    );
  }
  return `conic-gradient(from 0deg at 50% 50%, ${parts.join(", ")})`;
}

function spiralKeyframes(startAngle: number, startRadius: number, turns: number, steps = 9) {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const r = startRadius * (1 - t * t * t);
    const θ = startAngle + turns * 2 * Math.PI * t;
    xs.push(Math.cos(θ) * r);
    ys.push(Math.sin(θ) * r);
  }
  return { xs, ys };
}

interface Particle {
  id: number;
  xs: number[];
  ys: number[];
  colorIndex: number;
  delay: number;
  duration: number;
}

function buildParticles(count: number, maxRadius: number): Particle[] {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i / count) * 2 * Math.PI + (i % 3) * 0.21;
    const radius = maxRadius * (0.75 + (i % 4) * 0.08);
    const turns = 1.4 + (i % 3) * 0.4;
    const delay = (i / count) * 0.32;
    const duration = 2.45 - delay * 0.5;
    const { xs, ys } = spiralKeyframes(angle, radius, turns);
    return { id: i, xs, ys, colorIndex: i % AFFINITY.length, delay, duration };
  });
}

const VORTEX_GRADIENT = buildVortexGradient();
const PARTICLES = buildParticles(15, 520);

interface Props {
  onComplete: () => void;
}

export function ThresholdCinematic({ onComplete }: Props) {
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    const t = setTimeout(onComplete, COMPLETE_DELAY * 1000);
    return () => clearTimeout(t);
  }, [onComplete]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{ pointerEvents: "all" }}
    >
      {/* Dark backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.96 }}
        transition={{ duration: 0.38, ease: "easeOut" }}
        style={{ position: "absolute", inset: 0, background: "#000", willChange: "opacity" }}
      />

      {/* Vortex spiral — zooms in and accelerates rotation (fall-forward effect) */}
      <motion.div
        initial={{ rotate: 0, scale: 1, opacity: 0 }}
        animate={{
          rotate: [0, 85, 260, 720],
          scale: [1, 1.8, 6.5, 30],
          opacity: [0, 0.88, 0.95, 1],
        }}
        transition={{
          duration: TOTAL - 0.08,
          ease: "easeIn",
          times: [0, 0.18, 0.52, 1],
        }}
        style={{
          position: "absolute",
          width: "160vmax",
          height: "160vmax",
          background: VORTEX_GRADIENT,
          willChange: "transform, opacity",
          pointerEvents: "none",
        }}
      />

      {/* Radial depth mask — dark center fades out as vortex zooms in */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.78, 0] }}
        transition={{
          duration: TOTAL - 0.08,
          times: [0, 0.14, 1],
          ease: "easeIn",
        }}
        style={{
          position: "absolute",
          width: "160vmax",
          height: "160vmax",
          background: "radial-gradient(circle, rgba(0,0,0,0.9) 0%, transparent 50%)",
          willChange: "opacity",
          pointerEvents: "none",
        }}
      />

      {/* Spiral particles — travel from screen edge inward along accelerating arc */}
      {PARTICLES.map(({ id, xs, ys, colorIndex, delay, duration }) => (
        <motion.div
          key={id}
          initial={{ x: xs[0], y: ys[0], opacity: 0, scale: 0 }}
          animate={{
            x: xs,
            y: ys,
            opacity: [0, 1, 1, 0],
            scale: [0, 1.3, 1, 0],
          }}
          transition={{
            duration,
            delay,
            ease: "easeIn",
            opacity: { times: [0, 0.07, 0.82, 1] },
            scale: { times: [0, 0.07, 0.82, 1] },
          }}
          style={{
            position: "absolute",
            width: 9,
            height: 9,
            borderRadius: "50%",
            background: AFFINITY[colorIndex].color,
            boxShadow: `0 0 9px ${AFFINITY[colorIndex].color}, 0 0 20px ${AFFINITY[colorIndex].rgba}`,
            marginLeft: -4,
            marginTop: -4,
            willChange: "transform, opacity",
            pointerEvents: "none",
          }}
        />
      ))}

      {/* Center singularity — grows from a point into a blinding glow */}
      <motion.div
        initial={{ scale: prefersReducedMotion ? 1 : 0, opacity: 0 }}
        animate={
          prefersReducedMotion
            ? { opacity: [0, 0, 1] }
            : {
                scale: [0, 0.25, 1, 8],
                opacity: [0, 0.45, 0.88, 1],
              }
        }
        transition={
          prefersReducedMotion
            ? { duration: TOTAL, ease: "linear", times: [0, 0.72, 1] }
            : { duration: TOTAL, ease: "easeIn", times: [0, 0.38, 0.72, 1] }
        }
        style={{
          position: "absolute",
          width: "80vmin",
          height: "80vmin",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(255,238,170,0.95) 16%, rgba(245,200,66,0.65) 38%, transparent 52%)",
          filter: "blur(40px)",
          willChange: "transform, opacity",
          pointerEvents: "none",
        }}
      />

      {/* Whiteout — held at 0 until the singularity fully fills the frame, then snaps to 1 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1] }}
        transition={{
          duration: TOTAL,
          ease: "linear",
          times: [0, 0.96, 1],
        }}
        style={{
          position: "absolute",
          inset: 0,
          background: "#fff",
          willChange: "opacity",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
