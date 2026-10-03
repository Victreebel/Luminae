import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { useReducedMotion } from "framer-motion";
import type { ReplacementDealMotion } from "@/pages/game-replacement-motion";
import { artifactFrameUsesArtCrop } from "@/lib/artifactFramePresentation";
import { AFFINITY_KEYS, AFFINITY_META, type AffinityKey } from "@/lib/affinityMeta";
import { gameAudio } from "@/lib/audio";
import {
  FORGE_REFILL_DURATION_MS as REPLACEMENT_DEAL_DURATION_MS,
  FORGE_REFILL_REDUCED_DURATION_MS as REDUCED_REPLACEMENT_DEAL_DURATION_MS,
  FORGE_REFILL_COMPLETION_BUFFER_MS,
  getForgeRefillRevealMs,
} from "@/lib/forgeRefillTiming";
import { ForgeMoltenSurface } from "./ForgeMoltenSurface";
import "./ForgeMoltenRefill.css";

export { REPLACEMENT_DEAL_DURATION_MS, REDUCED_REPLACEMENT_DEAL_DURATION_MS };

interface ForgeReplacementDealAnimationProps extends Partial<Omit<ReplacementDealMotion, "animX" | "animY">> {
  slotRect: ReplacementDealMotion["slotRect"];
  animX?: number[];
  animY?: number[];
  animKey: string | number;
  cardId: string;
  tier: number;
  bonusAffinity?: string | null;
  cost?: Partial<Record<AffinityKey, number>>;
  cardFace: ReactNode;
  cardOverlay?: ReactNode;
  /** The Artifact becomes visible in the liquid; release its Archive unit here. */
  onReveal?: () => void;
  onComplete: () => void;
  overlayZIndex?: number;
  delayMs?: number;
  placement?: "viewport" | "inline";
  /** Render inside the live mold so scrolling, clipping and camera transforms are inherited. */
  targetSlotKey?: string;
  playSound?: boolean;
  compact?: boolean;
  /** The development preview can slow the same effect without duplicating it. */
  playbackRate?: number;
  reducedMotion?: boolean;
}

/** The same cool metal lip remains on the live Forge slot after the melt clears. */
export function ForgeTabletSurface() {
  return <span className="forge-tablet-surface" aria-hidden="true" />;
}

/** A recessed floor and four sloped walls, shared by empty slots and refills. */
export function ForgeMoldCavity() {
  const id = useId().replace(/:/g, "");
  return (
    <>
      <span className="forge-mold-cavity" aria-hidden="true">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <linearGradient id={`${id}-wall`} x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="#687881" />
              <stop offset=".22" stopColor="#323e48" />
              <stop offset="1" stopColor="#070c13" />
            </linearGradient>
            <linearGradient id={`${id}-floor`} x1="0" y1="0" x2=".7" y2="1">
              <stop stopColor="#020508" />
              <stop offset=".5" stopColor="#0b141c" />
              <stop offset="1" stopColor="#1d2b34" />
            </linearGradient>
          </defs>
          <path d="M0 0 H100 L90 16 H10Z" fill="#060a10" />
          <path d="M0 0 L10 16 V91 L0 100Z" fill={`url(#${id}-wall)`} />
          <path d="M100 0 L90 16 V91 L100 100Z" fill="#111a23" />
          <path d="M0 100 L10 91 H90 L100 100Z" fill="#53646d" />
          <path d="M10 16 H90 V91 H10Z" fill={`url(#${id}-floor)`} stroke="#344650" strokeWidth=".45" />
          <path d="M10 16 V91 H90 M90 16 V91" fill="none" stroke="#7e9199" strokeOpacity=".28" strokeWidth=".5" />
          <path d="M10 16 H90" stroke="#000" strokeOpacity=".8" strokeWidth="3" />
          <path d="M15 86 H85 M15 83 H85" stroke="#738996" strokeOpacity=".09" strokeWidth=".5" />
        </svg>
      </span>
      <span className="forge-mold-rim" aria-hidden="true" />
    </>
  );
}

export function ForgeReplacementDealAnimation({
  animKey,
  cardId,
  tier,
  bonusAffinity,
  cost,
  cardFace,
  cardOverlay,
  onReveal,
  onComplete,
  overlayZIndex = 9050,
  slotRect,
  delayMs = 0,
  placement = "viewport",
  targetSlotKey,
  playSound = true,
  compact,
  playbackRate = 1,
  reducedMotion,
}: ForgeReplacementDealAnimationProps) {
  const systemReducedMotion = useReducedMotion();
  const reduceMotion = Boolean(reducedMotion || systemReducedMotion);
  const baseDurationMs = reduceMotion
    ? REDUCED_REPLACEMENT_DEAL_DURATION_MS
    : REPLACEMENT_DEAL_DURATION_MS;
  const durationMs = Math.round(baseDurationMs / Math.max(.1, playbackRate));
  const completionCalledRef = useRef(false);
  const revealCalledRef = useRef(false);
  const onRevealRef = useRef(onReveal);
  const onCompleteRef = useRef(onComplete);
  const soundRef = useRef<ReturnType<typeof gameAudio.startForgeRefill> | null>(null);
  const [slotTarget, setSlotTarget] = useState<HTMLElement | null>(null);
  const [slotSize, setSlotSize] = useState({ w: slotRect.w, h: slotRect.h });
  const width = targetSlotKey ? slotSize.w : slotRect.w;
  const height = targetSlotKey ? slotSize.h : slotRect.h;
  // A live slot's client box already excludes its border. Match the final
  // card's 3px inset so the plate does not grow when the effect hands it back.
  const cavityInset = targetSlotKey ? 3 : 4;
  const surfaceWidth = Math.max(1, width - cavityInset * 2);
  const surfaceHeight = Math.max(1, height - cavityInset * 2);
  const usesCompactFrame = compact ?? artifactFrameUsesArtCrop(width, height);
  const primaryKey = AFFINITY_KEYS.find(key => key === bonusAffinity);
  const primary = primaryKey ? AFFINITY_META[primaryKey] : undefined;
  const secondaryKey = AFFINITY_KEYS
    .filter(key => key !== primaryKey && (cost?.[key] ?? 0) > 0)
    .sort((a, b) => (cost?.[b] ?? 0) - (cost?.[a] ?? 0))[0];
  const secondary = secondaryKey ? AFFINITY_META[secondaryKey] : undefined;

  useLayoutEffect(() => {
    if (!targetSlotKey) return;
    let observed: HTMLElement | null = null;
    const measure = () => {
      if (!observed) return;
      // Local dimensions keep the canvas sharp without baking a camera scale
      // into it. The portal inherits the slot's actual position and transform.
      const w = observed.clientWidth;
      const h = observed.clientHeight;
      if (w > 0 && h > 0) setSlotSize(previous => previous.w === w && previous.h === h ? previous : { w, h });
    };
    const resizeObserver = new ResizeObserver(measure);
    const attach = () => {
      const next = document.querySelector<HTMLElement>(`[data-slot-key="${targetSlotKey}"]`);
      if (next === observed) return next;
      if (observed) resizeObserver.unobserve(observed);
      observed = next;
      setSlotTarget(next);
      if (next) {
        resizeObserver.observe(next);
        measure();
      }
      return next;
    };
    const initialTarget = attach();
    // A replacement or density toggle may replace the slot DOM node itself.
    const mutationObserver = new MutationObserver(attach);
    mutationObserver.observe(initialTarget?.parentElement ?? document.body, { childList: true });
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [targetSlotKey, compact]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onRevealRef.current = onReveal;
  }, [onComplete, onReveal]);

  const reveal = useCallback(() => {
    if (revealCalledRef.current) return;
    revealCalledRef.current = true;
    soundRef.current?.reveal();
    onRevealRef.current?.();
  }, []);

  const finish = useCallback(() => {
    if (completionCalledRef.current) return;
    reveal();
    completionCalledRef.current = true;
    soundRef.current?.complete();
    onCompleteRef.current();
  }, [reveal]);

  useEffect(() => {
    const sound = playSound ? gameAudio.startForgeRefill({ durationMs, delayMs: Math.max(0, delayMs) }) : null;
    soundRef.current = sound;
    return () => {
      sound?.cancel();
      soundRef.current = null;
    };
  }, [animKey, delayMs, durationMs, playSound]);

  useEffect(() => {
    completionCalledRef.current = false;
    revealCalledRef.current = false;
    const revealTimer = window.setTimeout(reveal, Math.max(0, delayMs) + getForgeRefillRevealMs(durationMs, reduceMotion));
    // CSS completion may be interrupted by scene changes/background tabs.
    // Include the stagger so a waiting mold is never revealed prematurely.
    const timer = window.setTimeout(finish, Math.max(0, delayMs) + durationMs + FORGE_REFILL_COMPLETION_BUFFER_MS);
    return () => {
      window.clearTimeout(revealTimer);
      window.clearTimeout(timer);
    };
  }, [animKey, delayMs, durationMs, reduceMotion, reveal, finish]);

  const animation = (
    <div
      key={animKey}
      data-testid="forge-replacement-deal-animation"
      data-card-id={cardId}
      data-tier={tier}
      data-motion={reduceMotion ? "reduced" : "full"}
      data-placement={targetSlotKey ? "slot" : placement}
      className="forge-molten-refill"
      aria-hidden="true"
      style={{
        position: targetSlotKey ? "absolute" : placement === "inline" ? "relative" : "fixed",
        left: targetSlotKey ? 0 : placement === "inline" ? undefined : slotRect.x,
        top: targetSlotKey ? 0 : placement === "inline" ? undefined : slotRect.y,
        width: targetSlotKey ? "100%" : width,
        height: targetSlotKey ? "100%" : height,
        zIndex: overlayZIndex,
        "--forge-cavity-inset": `${cavityInset}px`,
        "--forge-refill-duration": `${durationMs}ms`,
        "--forge-refill-delay": `${Math.max(0, delayMs)}ms`,
        "--forge-melt-primary": primary?.hex ?? "#a8bbc7",
        "--forge-melt-secondary": secondary?.hex ?? "#dca364",
        "--forge-melt-glow": primary?.glowHex ?? "#e6edf1",
        "--forge-affinity": primary?.hex ?? "#a8bbc7",
        "--card-w": `${surfaceWidth}px`,
        "--card-h": `${surfaceHeight}px`,
        "--forge-chip-w": `${surfaceWidth}px`,
        "--forge-chip-h": `${surfaceHeight}px`,
      } as CSSProperties}
      onAnimationEnd={event => {
        if (event.target === event.currentTarget && event.animationName === "forge-refill-lifecycle") finish();
      }}
    >
      <ForgeMoldCavity />
      <div
        data-testid="forge-replacement-deal-face"
        data-frame-presentation={usesCompactFrame ? "compact" : "full-card"}
        className={`forge-molten-refill__face ${usesCompactFrame ? "board-forge-compact-chip" : ""}`}
      >
        {cardFace}
        {cardOverlay}
        <ForgeTabletSurface />
      </div>
      {!reduceMotion && (
        <>
          <div className="forge-molten-refill__liquid">
            <ForgeMoltenSurface
              seed={`${cardId}:${animKey}`}
              durationMs={durationMs} delayMs={Math.max(0, delayMs)}
              primary={primary?.hex ?? "#a8bbc7"} secondary={secondary?.hex ?? "#dca364"}
              width={surfaceWidth} height={surfaceHeight}
            />
            <span className="forge-molten-refill__fallback" />
          </div>
          <span className="forge-molten-refill__heat" />
        </>
      )}
    </div>
  );
  // A disappearing slot must not leave a floating effect at its old location.
  return targetSlotKey ? (slotTarget ? createPortal(animation, slotTarget) : null) : animation;
}
