import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useIsMobile } from "@/hooks/use-mobile";

/** Total animation duration in seconds (used for all framer-motion transitions). */
export const TOTAL_S = 2.7;
/** Delay in seconds before onComplete fires — must be ≥ TOTAL_S so the animation finishes first. */
export const COMPLETE_DELAY_S = 2.75;
/**
 * Normalized time [0, 1] at which the final black-cap layer begins its snap
 * to full opacity. The layer uses times: [0, BLACK_CAP_SNAP_T, 1]; the snap
 * must occur late in the animation (≥85%) so the portal zoom is visible, but
 * before the last frame so the cut to black is not deferred to exactly t=1.
 */
export const BLACK_CAP_SNAP_T = 0.91;

interface Props {
  onComplete: () => void;
}

export function ThresholdCinematic({ onComplete }: Props) {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const containerRef = useRef<HTMLElement | null>(null);

  useFocusTrap(containerRef, true, onComplete, { handleEscape: false });

  useEffect(() => {
    const t = setTimeout(onComplete, COMPLETE_DELAY_S * 1000);
    return () => clearTimeout(t);
  }, [onComplete]);

  if (prefersReducedMotion) {
    return (
      <div
        ref={(el) => { containerRef.current = el; }}
        role="dialog"
        aria-modal="true"
        aria-label="Loading cinematic"
        className="fixed inset-0 z-[200]"
        style={{ background: "#04020f", outline: "none" }}
        tabIndex={0}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
          style={{ position: "absolute", inset: 0, background: "#04020f" }}
        />
      </div>
    );
  }

  return (
    <div
      ref={(el) => { containerRef.current = el; }}
      role="dialog"
      aria-modal="true"
      aria-label="Loading cinematic"
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-hidden"
      style={{ background: "#04020f", outline: "none" }}
      tabIndex={0}
    >
      {/* Blur-frost over home — quickly desaturates and smears the home content */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(4,2,15,0.88)",
          backdropFilter: isMobile ? undefined : "blur(18px)",
          WebkitBackdropFilter: isMobile ? undefined : "blur(18px)",
        }}
      />

      {/* Portal disc — deep void conic spiral, spins and zooms in */}
      <motion.div
        initial={{ rotate: 0, scale: 0.5, opacity: 0 }}
        animate={{
          rotate: [0, 180, 520],
          scale: [0.5, 1.1, 26],
          opacity: [0, 0.95, 1],
        }}
        transition={{ duration: TOTAL_S, ease: "easeIn", times: [0, 0.42, 1] }}
        style={{
          position: "absolute",
          width: "130vmax",
          height: "130vmax",
          background: `conic-gradient(from 0deg at 50% 50%,
            #04020f   0deg,
            #0c051e  40deg,
            #1a0a50  80deg,
            #0c051e 130deg,
            #04020f 180deg,
            #0c051e 220deg,
            #1a0a50 260deg,
            #0c051e 310deg,
            #04020f 360deg)`,
          willChange: "transform, opacity",
          pointerEvents: "none",
        }}
      />

      {/* Portal rim — a soft luminous ring that collapses as we zoom through */}
      <motion.div
        initial={{ scale: 0.35, opacity: 0 }}
        animate={{ scale: [0.35, 0.9, 4], opacity: [0, 0.65, 0] }}
        transition={{ duration: TOTAL_S, ease: "easeIn", times: [0, 0.36, 1] }}
        style={{
          position: "absolute",
          width: "68vmin",
          height: "68vmin",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, transparent 52%, rgba(90,45,180,0.6) 66%, rgba(50,20,110,0.28) 80%, transparent 92%)",
          filter: isMobile ? undefined : "blur(7px)",
          willChange: "transform, opacity",
          pointerEvents: "none",
        }}
      />

      {/* Center void — deepens as we fall in */}
      <motion.div
        initial={{ scale: 0.08, opacity: 0 }}
        animate={{ scale: [0.08, 0.55, 6], opacity: [0, 0.7, 1] }}
        transition={{ duration: TOTAL_S, ease: "easeIn", times: [0, 0.38, 1] }}
        style={{
          position: "absolute",
          width: "58vmin",
          height: "58vmin",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, #04020f 38%, rgba(8,3,24,0.9) 62%, transparent 80%)",
          filter: isMobile ? undefined : "blur(22px)",
          willChange: "transform, opacity",
          pointerEvents: "none",
        }}
      />

      {/* Final black cap — snaps at the end so tutorial reveals from dark */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 1] }}
        transition={{ duration: TOTAL_S, ease: "linear", times: [0, BLACK_CAP_SNAP_T, 1] }}
        style={{
          position: "absolute",
          inset: 0,
          background: "#04020f",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}
