import { useCallback, useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { CardBackTier1, CardBackTier2, CardBackTier3 } from "@/components/ArtifactCardBack";
import { ArchiveManifestationTrace } from "@/pages/game-causal-motion";
import type { ReplacementDealMotion } from "@/pages/game-replacement-motion";
import { artifactFrameUsesArtCrop } from "@/lib/artifactFramePresentation";

export const REPLACEMENT_DEAL_DURATION_MS = 1_500;
export const REDUCED_REPLACEMENT_DEAL_DURATION_MS = 420;
const COMPLETION_FALLBACK_BUFFER_MS = 120;

interface ForgeReplacementDealAnimationProps extends Omit<ReplacementDealMotion, "animX" | "animY"> {
  animKey: string | number;
  cardId: string;
  tier: number;
  cardFace: ReactNode;
  cardOverlay?: ReactNode;
  onComplete: () => void;
  overlayZIndex?: number;
  animX: number[];
  animY: number[];
}

export function ForgeReplacementDealAnimation({
  animKey,
  cardId,
  tier,
  cardFace,
  cardOverlay,
  onComplete,
  overlayZIndex = 9050,
  deckRect,
  slotRect,
  animX,
  animY,
  animRotateY,
  animScale,
}: ForgeReplacementDealAnimationProps) {
  const reduceMotion = Boolean(useReducedMotion());
  const durationMs = reduceMotion
    ? REDUCED_REPLACEMENT_DEAL_DURATION_MS
    : REPLACEMENT_DEAL_DURATION_MS;
  const duration = durationMs / 1_000;
  const completionCalledRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const usesCompactFrame = artifactFrameUsesArtCrop(slotRect.w, slotRect.h);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const finish = useCallback(() => {
    if (completionCalledRef.current) return;
    completionCalledRef.current = true;
    onCompleteRef.current();
  }, []);

  useEffect(() => {
    completionCalledRef.current = false;
    // A parent scene update can interrupt Framer's completion event. Never
    // leave a viewport-fixed deal card mounted after its authored duration.
    const timer = window.setTimeout(
      finish,
      durationMs + COMPLETION_FALLBACK_BUFFER_MS,
    );
    return () => window.clearTimeout(timer);
  }, [animKey, durationMs, finish]);

  return (
    <>
      <ArchiveManifestationTrace
        key={`archive-trace-${animKey}`}
        manifestation={{ cardId, tier, deckRect, slotRect }}
      />
      <div
        data-testid="forge-replacement-deal-animation"
        style={{ position: "fixed", inset: 0, zIndex: overlayZIndex, pointerEvents: "none", perspective: "1200px" }}
      >
        <motion.div
          key={animKey}
          style={{
            position: "absolute",
            left: deckRect.x,
            top: deckRect.y,
            width: deckRect.w,
            height: deckRect.h,
            transformStyle: "preserve-3d",
          }}
          initial={{ x: 0, y: 0, rotateY: 0, scale: 1 }}
          animate={reduceMotion
            ? { x: animX[2], y: animY[2], rotateY: 180, scale: 1, opacity: [0, 1] }
            : { x: animX, y: animY, rotateY: animRotateY, scale: animScale }}
          transition={reduceMotion
            ? { duration, ease: "easeOut" }
            : {
                duration,
                x: { ease: "easeInOut", times: [0, 0.4, 1] },
                y: { ease: "easeInOut", times: [0, 0.35, 1] },
                rotateY: { ease: "easeInOut", times: [0, 0.5, 1] },
                scale: { ease: "easeInOut", times: [0, 0.35, 1] },
              }}
          onAnimationComplete={finish}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              overflow: "hidden",
              borderRadius: 12,
            }}
          >
            <div className="relative h-full w-full rounded-xl border border-[#c4a85a]/30 bg-[#030509]">
              {tier === 1 && <CardBackTier1 />}
              {tier === 2 && <CardBackTier2 />}
              {tier === 3 && <CardBackTier3 />}
            </div>
          </div>
          <div
            style={{
              position: "absolute",
              inset: 0,
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              overflow: "hidden",
              borderRadius: 12,
            }}
          >
            <div
              data-testid="forge-replacement-deal-face"
              data-frame-presentation={usesCompactFrame ? "compact" : "full-card"}
              className={usesCompactFrame
                ? "forge-foundry-mold board-forge-compact-chip relative h-full w-full overflow-hidden rounded-xl"
                : "relative h-full w-full overflow-hidden rounded-xl"}
              style={{
                "--card-w": `${slotRect.w}px`,
                "--card-h": `${slotRect.h}px`,
                "--forge-chip-w": `${slotRect.w}px`,
                "--forge-chip-h": `${slotRect.h}px`,
              } as CSSProperties}
            >
              {cardFace}
              {cardOverlay}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
