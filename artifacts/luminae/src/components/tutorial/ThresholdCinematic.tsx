import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type Phase = "enter" | "iris" | "motes" | "flash" | "exit";

const MOTES = [
  { color: "#f87171", glow: "rgba(248,113,113,0.55)", name: "ruby" },
  { color: "#60a5fa", glow: "rgba(96,165,250,0.55)", name: "sapphire" },
  { color: "#4ade80", glow: "rgba(74,222,128,0.55)", name: "emerald" },
  { color: "#c084fc", glow: "rgba(192,132,252,0.55)", name: "onyx" },
  { color: "#e2e8f0", glow: "rgba(226,232,240,0.55)", name: "pearl" },
];

const ORBIT_RADIUS = 96;

function moteXY(index: number, angleOffset = 0) {
  const angle = ((index / MOTES.length) * 2 * Math.PI) + angleOffset;
  return {
    x: Math.cos(angle) * ORBIT_RADIUS,
    y: Math.sin(angle) * ORBIT_RADIUS,
  };
}

interface MoteDotProps {
  color: string;
  glow: string;
  index: number;
  converging: boolean;
}

function MoteDot({ color, glow, index, converging }: MoteDotProps) {
  const start = moteXY(index);
  const orbit = moteXY(index, 0.42);

  return (
    <motion.div
      initial={{ x: start.x, y: start.y, opacity: 0, scale: 0 }}
      animate={
        converging
          ? { x: 0, y: 0, opacity: 0, scale: 0 }
          : {
              x: [start.x, orbit.x, start.x],
              y: [start.y, orbit.y, start.y],
              opacity: 0.92,
              scale: 1,
            }
      }
      transition={
        converging
          ? { duration: 0.28, ease: "easeIn" }
          : {
              duration: 0.55,
              ease: "easeOut",
              x: { duration: 1.3, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
              y: { duration: 1.3, ease: "easeInOut", repeat: Infinity, repeatType: "mirror" },
              opacity: { duration: 0.45 },
              scale: { duration: 0.45 },
            }
      }
      style={{
        position: "absolute",
        width: 10,
        height: 10,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 0 10px ${color}, 0 0 22px ${glow}`,
        marginLeft: -5,
        marginTop: -5,
        pointerEvents: "none",
      }}
    />
  );
}

interface Props {
  onComplete: () => void;
}

export function ThresholdCinematic({ onComplete }: Props) {
  const [phase, setPhase] = useState<Phase>("enter");

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase("iris"), 300),
      setTimeout(() => setPhase("motes"), 1100),
      setTimeout(() => setPhase("flash"), 2400),
      setTimeout(() => setPhase("exit"), 2700),
      setTimeout(onComplete, 3250),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onComplete]);

  const showIris = phase === "iris" || phase === "motes";
  const showMotes = phase === "motes" || phase === "flash" || phase === "exit";
  const converging = phase === "flash" || phase === "exit";
  const showFlash = phase === "flash" || phase === "exit";
  const isExit = phase === "exit";

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{ pointerEvents: "all" }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ background: "#000" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: isExit ? 1 : 0.93 }}
        transition={{ duration: isExit ? 0.55 : 0.3 }}
      />

      <div className="relative flex items-center justify-center" style={{ width: 320, height: 320 }}>
        <AnimatePresence>
          {showIris && (
            <motion.div
              key="iris-ring"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.78, ease: [0.16, 1, 0.3, 1] }}
              style={{
                position: "absolute",
                width: 192,
                height: 192,
                borderRadius: "50%",
                border: "2.5px solid #f5c842",
                boxShadow:
                  "0 0 28px rgba(245,200,66,0.7), 0 0 64px rgba(224,160,32,0.35), inset 0 0 24px rgba(245,200,66,0.18)",
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showIris && (
            <motion.div
              key="iris-glow"
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{ opacity: 0.35, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.78 }}
              style={{
                position: "absolute",
                width: 170,
                height: 170,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(245,200,66,0.55) 0%, rgba(245,200,66,0.08) 60%, transparent 100%)",
              }}
            />
          )}
        </AnimatePresence>

        {showMotes &&
          MOTES.map((mote, i) => (
            <MoteDot
              key={mote.name}
              color={mote.color}
              glow={mote.glow}
              index={i}
              converging={converging}
            />
          ))}

        <AnimatePresence>
          {showFlash && (
            <motion.div
              key="flash"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: [0, 1, 0.55], scale: [0.4, 1.6, 2.2] }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.32, times: [0, 0.28, 1], ease: "easeOut" }}
              style={{
                position: "absolute",
                width: 220,
                height: 220,
                borderRadius: "50%",
                background:
                  "radial-gradient(circle, rgba(255,255,255,0.97) 0%, rgba(245,200,66,0.65) 28%, transparent 68%)",
                pointerEvents: "none",
              }}
            />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showFlash && (
            <motion.div
              key="star-points"
              initial={{ opacity: 0, scale: 0.3, rotate: 0 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.3, 1.1, 1.4], rotate: 15 }}
              transition={{ duration: 0.32, times: [0, 0.3, 1], ease: "easeOut" }}
              style={{
                position: "absolute",
                width: 200,
                height: 200,
                pointerEvents: "none",
              }}
            >
              <svg viewBox="-100 -100 200 200" width="200" height="200">
                {[0, 45, 90, 135].map((angle) => (
                  <line
                    key={angle}
                    x1="0"
                    y1="-88"
                    x2="0"
                    y2="88"
                    stroke="rgba(255,255,255,0.9)"
                    strokeWidth="1.5"
                    transform={`rotate(${angle})`}
                  />
                ))}
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
