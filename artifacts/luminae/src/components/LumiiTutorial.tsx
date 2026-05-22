import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion, type EasingDefinition } from "framer-motion";
import { useLocation } from "wouter";
import { X, ArrowRight, ChevronDown, ChevronLeft, ChevronUp } from "lucide-react";
import type { GameState } from "@workspace/api-client-react";
import { clearSession } from "@/lib/session";
import type { GemKey } from "@/lib/gemMeta";
import { renderKeywords } from "@/lib/tutorialKeywords";

// ─── Viewport height hook ────────────────────────────────────────────────────

function useViewportH(): number {
  const [h, setH] = useState(() => (typeof window !== "undefined" ? window.innerHeight : 844));
  useEffect(() => {
    const fn = () => setH(window.innerHeight);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return h;
}

// ─── Lumii Constellation Wisp ─────────────────────────────────────────────────

// Affinity node colors: Flare, Continuum, Verdance, Abyss, Radiance, Singularity
const WISP_COLORS = ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#e2e8f0", "#fbbf24"] as const;

// Zone-tinted palettes — each row is the 6 node colors subtly shifted toward the zone's affinity theme.
// "none" restores the default full-spectrum WISP_COLORS palette.
// Pulse ring accent colors per tutorial zone (idle and excited variants)
const ZONE_PULSE_COLOR: Record<"harvest" | "market" | "filters" | "luminaries" | "none", { idle: string; excited: string }> = {
  none:       { idle: "rgba(168,85,247,0.7)", excited: "#fbbf24" },
  harvest:    { idle: "#f97316",              excited: "#fbbf24" },
  luminaries: { idle: "#c084fc",              excited: "#d4b8f5" },
  market:     { idle: "#fbbf24",              excited: "#fbbf24" },
  filters:    { idle: "#fbbf24",              excited: "#fbbf24" },
};

const ZONE_PALETTE: Record<"harvest" | "market" | "filters" | "luminaries" | "none", readonly string[]> = {
  none:       ["#f97316", "#3b82f6", "#22c55e", "#a855f7", "#e2e8f0", "#fbbf24"],
  // harvest → Flare/Continuum warmth: orange stays, blue brightens, others warm toward amber
  harvest:    ["#f97316", "#60a5fa", "#86c874", "#cb7c40", "#fde8b0", "#f5a332"],
  // luminaries → Abyss/Radiance: purple/silver stay, others shift toward deep rose/indigo/teal/lavender
  luminaries: ["#d97b9a", "#818cf8", "#6fc4b0", "#a855f7", "#e2e8f0", "#d4b8f5"],
  // market / filters → Singularity gold dominant: all nodes tinted toward warm amber-gold
  market:     ["#f5a832", "#90b8e8", "#98c87a", "#c48cd4", "#f0e4c0", "#fbbf24"],
  filters:    ["#f5a832", "#90b8e8", "#98c87a", "#c48cd4", "#f0e4c0", "#fbbf24"],
};

// Named constellation shapes — 6 [x,y] node offsets from center (0,0)
// Coordinates fit within ±26 so all nodes stay within the 72×72 bounding box
type WispShape = [number, number][];

const WISP_SHAPES: Record<string, WispShape> = {
  // Organic scatter — Lumii at rest
  idle:    [[ 0,-20],[ 17, -8],[13, 14],[-6, 21],[-19,  6],[-15,-14]],
  // Loose diamond — primary speaking pose
  speakA:  [[ 0,-23],[ 18, -4],[12, 17],[ 0,  8],[-12, 17],[-18, -4]],
  // Tilted arc — secondary speaking pose
  speakB:  [[-14,-17],[  0,-23],[14,-17],[20,  3],[  0, 19],[-20,  3]],
  // Wide star — excited/action state
  excited: [[ 0,-25],[ 22, -8],[16, 20],[ 0, 10],[-16, 20],[-22, -8]],
  // Celebration burst — nodes sprung far outward, snaps back after 0.5s
  burst:   [[ 0,-38],[34,-13],[25, 31],[-10, 38],[-32, 10],[-26,-24]],
};

// Connections: outer ring (0-1-2-3-4-5-0) + one diagonal (0-3) = 7 edges
const WISP_EDGES: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,0],[0,3]
];

// Shape morph cycle when Lumii is active
const MORPH_CYCLE = ["speakA", "idle", "speakB", "idle"] as const;

// ─── Ember / spark particles ──────────────────────────────────────────────────
// Six affinity colors cycling across 12 embers
const EMBER_PALETTE = ["#f87171","#60a5fa","#4ade80","#c084fc","#f8fafc","#fbbf24"] as const;
interface EmberDef { angle: number; r0: number; r1: number; sz: number; col: string; delay: number; dur: number; }
const EMBERS: EmberDef[] = [
  { angle:  14, r0: 22, r1: 46, sz: 3.4, col: EMBER_PALETTE[0], delay: 0.0, dur: 2.1 },
  { angle:  48, r0: 25, r1: 52, sz: 2.8, col: EMBER_PALETTE[1], delay: 0.6, dur: 1.9 },
  { angle:  92, r0: 20, r1: 44, sz: 4.0, col: EMBER_PALETTE[2], delay: 1.3, dur: 2.4 },
  { angle: 145, r0: 24, r1: 49, sz: 3.2, col: EMBER_PALETTE[3], delay: 0.3, dur: 2.0 },
  { angle: 188, r0: 21, r1: 47, sz: 3.6, col: EMBER_PALETTE[5], delay: 2.1, dur: 1.8 },
  { angle: 234, r0: 26, r1: 54, sz: 3.0, col: EMBER_PALETTE[4], delay: 0.9, dur: 2.6 },
  { angle: 278, r0: 22, r1: 47, sz: 3.8, col: EMBER_PALETTE[1], delay: 1.7, dur: 2.2 },
  { angle: 320, r0: 24, r1: 51, sz: 3.2, col: EMBER_PALETTE[0], delay: 0.5, dur: 1.9 },
  { angle:  65, r0: 23, r1: 49, sz: 3.0, col: EMBER_PALETTE[5], delay: 2.8, dur: 2.3 },
  { angle: 165, r0: 20, r1: 45, sz: 4.0, col: EMBER_PALETTE[2], delay: 1.4, dur: 2.0 },
  { angle: 260, r0: 25, r1: 53, sz: 3.2, col: EMBER_PALETTE[3], delay: 3.2, dur: 2.5 },
  { angle: 340, r0: 21, r1: 46, sz: 3.4, col: EMBER_PALETTE[4], delay: 0.8, dur: 1.7 },
];

// Returns the constellation node closest to the given tether direction
function getNearestNode(shape: WispShape, direction: "down" | "up" | "left"): { x: number; y: number } {
  const [x, y] =
    direction === "down" ? shape.reduce((b, n) => (n[1] > b[1] ? n : b)) :
    direction === "up"   ? shape.reduce((b, n) => (n[1] < b[1] ? n : b)) :
    /* left */             shape.reduce((b, n) => (n[0] < b[0] ? n : b));
  return { x, y };
}

// Generate randomised scatter positions for the coalesce entrance animation.
// Each node flies in from a position at ~50-68px radius from center.
function makeScatterPositions(): [number, number][] {
  return WISP_COLORS.map((_, i) => {
    const baseAngle = (i / WISP_COLORS.length) * Math.PI * 2;
    const angle = baseAngle + (Math.random() * 0.9 - 0.45);
    const radius = 50 + Math.random() * 18;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });
}

let _wispInstanceCount = 0;

// Burst palette per action type — harvest=amber, reserve=teal, forge=indigo
const BURST_COLOR_BY_ACTION: Record<string, string> = {
  take_three_crystals: "#f97316",
  take_two_crystals:   "#f97316",
  reserve_card:        "#34d399",
  purchase_card:       "#818cf8",
  purchase_reserved:   "#818cf8",
};

// Burst intensity presets per named game event type.
// Values >= 1.35 trigger the wide-ring shockwave (ring 2).
const BURST_INTENSITY: Record<string, number> = {
  luminary_claimed:   1.5,
  eminence_milestone: 1.6,
  card_forged:        1.15,
};
const BURST_INTENSITY_DEFAULT = 1.15;

// Maps action type → the affinity key whose palette should drive the burst.
// Harvest → Flare (energy collection), reserve → Verdance (growth/holding),
// forge → Continuum (crystallizing permanence).
const BURST_GEM_KEY_BY_ACTION: Partial<Record<string, GemKey>> = {
  take_three_crystals: "ruby",
  take_two_crystals:   "ruby",
  reserve_card:        "emerald",
  purchase_card:       "sapphire",
  purchase_reserved:   "sapphire",
};

// Per-affinity particle color palettes.
// ring1: 6 colors used for the close-scatter ring (replaces the single-color tint).
// ring2: 5 colors used for the wide shockwave ring (replaces the hardcoded indigo/cyan).
const AFFINITY_BURST_PALETTE: Record<GemKey, { ring1: readonly string[]; ring2: readonly string[] }> = {
  pearl:    {
    ring1: ["#F2F5FF", "#E8EEFF", "#A8B8E8", "#D8E4FF", "#FFFFFF", "#C8D4F4"],
    ring2: ["#A8B8E8", "#D8E4FF", "#7090D8", "#F2F5FF", "#B0C4F0"],
  },
  ruby:     {
    ring1: ["#FF5A3C", "#FF8A6A", "#FFB347", "#FF4500", "#FF7043", "#FFCC80"],
    ring2: ["#FF5A3C", "#FF8A6A", "#FFB347", "#FF6B35", "#FF4500"],
  },
  sapphire: {
    ring1: ["#3D6BFF", "#7090FF", "#4F8EFF", "#A0B8FF", "#2952CC", "#93A4FF"],
    ring2: ["#3D6BFF", "#7090FF", "#A0B8FF", "#2952CC", "#C5D0FF"],
  },
  emerald:  {
    ring1: ["#2ECC71", "#5BE197", "#27AE60", "#7CFC00", "#00C853", "#A8F0C0"],
    ring2: ["#2ECC71", "#5BE197", "#27AE60", "#00C853", "#A8F0C0"],
  },
  onyx:     {
    ring1: ["#7B1FA2", "#B14FD8", "#9C27B0", "#CE93D8", "#4A0072", "#E040FB"],
    ring2: ["#7B1FA2", "#B14FD8", "#CE93D8", "#E040FB", "#9C27B0"],
  },
  flux:     {
    ring1: ["#FFC43D", "#FFE08A", "#FFD700", "#FFAB40", "#FFF176", "#FFB300"],
    ring2: ["#FFC43D", "#FFE08A", "#FFD700", "#FFAB40", "#FFF9C4"],
  },
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function LumiiOrb({
  size = 72,
  excited = false,
  speaking = false,
  burst = false,
  burstColor = "#fbbf24",
  tetheredDirection,
  onNearestNode,
  highlightZone,
  beatKey,
}: {
  size?: number;
  excited?: boolean;
  speaking?: boolean;
  burst?: boolean;
  burstColor?: string;
  tetheredDirection?: "down" | "up" | "left";
  onNearestNode?: (offset: { x: number; y: number }) => void;
  highlightZone?: "harvest" | "market" | "filters" | "luminaries" | null;
  beatKey?: string | number;
}) {
  // Stable unique ID for SVG filter defs — safe across StrictMode double-invoke
  const instanceRef = useRef<number | null>(null);
  if (instanceRef.current === null) instanceRef.current = ++_wispInstanceCount;
  const filterId = `lumii-wisp-${instanceRef.current}`;

  const onNearestNodeRef = useRef(onNearestNode);
  onNearestNodeRef.current = onNearestNode;

  const prefersReducedMotion = useReducedMotion();

  // Entrance animation state —————————————————————————————————————————————
  // `entering` = true during the ~700ms coalesce window after mount/beat change.
  // `entranceKey` increments each time we want to remount the node/line group so
  // framer-motion re-runs `initial → animate` with the new scatter positions.
  const [entering, setEntering] = useState(!prefersReducedMotion);
  const [entranceKey, setEntranceKey] = useState(0);
  const scatterRef = useRef<[number, number][]>(makeScatterPositions());
  const prevBeatKeyRef = useRef<string | number | undefined>(beatKey);
  const enterTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On first mount — play the entrance once then settle
  useEffect(() => {
    if (!prefersReducedMotion) {
      enterTimerRef.current = setTimeout(() => setEntering(false), 750);
    }
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the beat changes — regenerate scatter positions and replay entrance
  useEffect(() => {
    if (beatKey === prevBeatKeyRef.current) return;
    prevBeatKeyRef.current = beatKey;
    scatterRef.current = makeScatterPositions();
    if (!prefersReducedMotion) {
      setEntering(true);
      setEntranceKey((k) => k + 1);
    }
    if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    enterTimerRef.current = setTimeout(() => setEntering(false), 750);
    return () => {
      if (enterTimerRef.current) clearTimeout(enterTimerRef.current);
    };
  }, [beatKey, prefersReducedMotion]);

  const [morphIdx, setMorphIdx] = useState(0);

  // Morph only when speaking or excited; rest in idle when silent
  const shouldMorph = excited || speaking;
  useEffect(() => {
    if (!shouldMorph) {
      setMorphIdx(0);
      return;
    }
    const ms = excited ? 640 : 1900;
    const id = setInterval(() => setMorphIdx((i) => (i + 1) % MORPH_CYCLE.length), ms);
    return () => clearInterval(id);
  }, [shouldMorph, excited]);

  const shapeKey = burst
    ? "burst"
    : !shouldMorph
    ? "idle"
    : excited
    ? (morphIdx % 2 === 0 ? "excited" : "speakA")
    : MORPH_CYCLE[morphIdx];

  // Notify parent of the nearest-node offset whenever shape or tether direction changes
  useEffect(() => {
    if (!tetheredDirection || !onNearestNodeRef.current) return;
    const currentShape = WISP_SHAPES[shapeKey] ?? WISP_SHAPES.idle;
    onNearestNodeRef.current(getNearestNode(currentShape, tetheredDirection));
  }, [shapeKey, tetheredDirection]);
  const shape = WISP_SHAPES[shapeKey];
  // burst: snap out fast (0.16s), snap back naturally when burst turns false (~0.32s spring)
  const morphDur = burst ? 0.16 : excited ? 0.42 : 1.05;
  const nodeR = burst ? 5.0 : excited ? 4.2 : 3.4;
  const lineWidth = burst ? 1.8 : excited ? 1.4 : 0.9;
  const blurSd = burst ? 5.0 : excited ? 3.8 : 2.6;
  const zoneKey = highlightZone ?? "none";
  const pulseStroke = burst ? burstColor : excited ? ZONE_PULSE_COLOR[zoneKey].excited : ZONE_PULSE_COLOR[zoneKey].idle;
  const pulseStrokeW = burst ? 2.2 : excited ? 1.6 : 1.0;

  // Per-node idle drift: small asymmetric X/Y offsets + periods to avoid uniformity
  const IDLE_DRIFT_X = [ 1.8, -2.2,  1.4, -1.6,  2.0, -1.2];
  const IDLE_DRIFT_Y = [-2.0,  1.6, -1.8,  2.2, -1.4,  1.8];
  const IDLE_PERIODS = [3.2, 3.8, 4.1, 3.5, 4.4, 3.0];

  // Derive per-node colors from the active zone palette (smooth color transition handled by framer-motion)
  const nodeColors = ZONE_PALETTE[highlightZone ?? "none"];

  return (
    <svg width={size} height={size} viewBox="-36 -36 72 72" style={{ overflow: "visible" }}>
      <defs>
        {/* Glow filter — blurs then merges over original for a soft halo */}
        <filter id={filterId} x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur in="SourceGraphic" stdDeviation={blurSd} result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer presence pulse ring */}
      <motion.circle
        cx={0} cy={0}
        animate={{
          r: burst ? [20, 50, 20] : excited ? [14, 30, 14] : [11, 22, 11],
          opacity: burst ? [0.75, 0, 0.75] : excited ? [0.55, 0, 0.55] : [0.22, 0, 0.22],
          stroke: pulseStroke,
        }}
        transition={{
          r:       { duration: burst ? 0.5 : excited ? 0.88 : 2.5, repeat: Infinity, ease: "easeOut" },
          opacity: { duration: burst ? 0.5 : excited ? 0.88 : 2.5, repeat: Infinity, ease: "easeOut" },
          stroke:  { duration: 0.3, ease: "easeInOut" },
        }}
        fill="none"
        strokeWidth={pulseStrokeW}
      />

      {/* Second pulse ring — excited or burst, offset phase */}
      {(excited || burst) && (
        <motion.circle
          cx={0} cy={0}
          animate={{
            r: burst ? [28, 58, 28] : [18, 34, 18],
            opacity: burst ? [0.55, 0, 0.55] : [0.38, 0, 0.38],
          }}
          transition={{ duration: burst ? 0.5 : 1.3, repeat: Infinity, ease: "easeOut", delay: burst ? 0.08 : 0.44 }}
          fill="none"
          stroke={burst ? burstColor : "#f97316"}
          strokeWidth={burst ? 1.4 : 0.8}
        />
      )}

      {/* Burst flash ring — one-shot radial flash on celebration */}
      <AnimatePresence>
        {burst && (
          <motion.circle
            key="burst-flash"
            cx={0} cy={0}
            initial={{ r: 8, opacity: 0.9, strokeWidth: 3 }}
            animate={{ r: 52, opacity: 0, strokeWidth: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            fill="none"
            stroke={burstColor}
          />
        )}
      </AnimatePresence>

      {/* Connection lines — animate endpoints + soft opacity pulse + zone color tint.
          During entrance, lines start transparent and fade in after nodes settle (~0.68s delay).
          Each line remounts (via key) whenever entranceKey changes so `initial` re-fires. */}
      {WISP_EDGES.map(([a, b], i) => {
        const loOpacity = burst ? 0.6 : excited ? 0.45 : !shouldMorph ? 0.18 : 0.22;
        const hiOpacity = burst ? 0.9 : excited ? 0.72 : !shouldMorph ? 0.42 : 0.52;
        const pulsePeriod = burst ? 0.5 : excited ? 0.9 + i * 0.08 : 2.8 + i * 0.35;
        // Lines fade in after nodes coalesce — first line starts after most nodes
        // have settled (~0.68s), last line after all nodes are in formation (~1.04s)
        const opacityDelay = entering
          ? 0.68 + i * 0.06
          : burst ? 0 : i * (excited ? 0.1 : 0.28);
        const posTrans = burst
          ? { duration: morphDur, ease: "easeOut" as const }
          : { duration: morphDur, ease: "easeInOut" as const };
        return (
          <motion.line
            key={`l-${i}-${entranceKey}`}
            initial={entering ? { strokeOpacity: 0 } : false}
            animate={{
              x1: shape[a][0], y1: shape[a][1],
              x2: shape[b][0], y2: shape[b][1],
              strokeOpacity: [loOpacity, hiOpacity, loOpacity],
              stroke: burst ? burstColor : nodeColors[a],
            }}
            transition={{
              x1: posTrans,
              y1: posTrans,
              x2: posTrans,
              y2: posTrans,
              strokeOpacity: {
                duration: pulsePeriod,
                repeat: Infinity,
                ease: "easeInOut",
                delay: opacityDelay,
              },
              stroke: { duration: burst ? 0.12 : 1.2, ease: "easeInOut" },
            }}
            strokeWidth={lineWidth}
            filter={`url(#${filterId})`}
            strokeLinecap="round"
          />
        );
      })}

      {/* Nodes — morph position (+ idle drift) + independent twinkle opacity + zone color tint.
          During entrance, each node flies in from its scatter position with a
          staggered delay so they coalesce one by one into formation.
          Each node remounts (via key) whenever entranceKey changes. */}
      {WISP_COLORS.map((_color, i) => {
        const baseX = shape[i][0];
        const baseY = shape[i][1];
        const animX = !shouldMorph && !burst
          ? [baseX, baseX + IDLE_DRIFT_X[i], baseX, baseX - IDLE_DRIFT_X[i] * 0.5, baseX]
          : baseX;
        const animY = !shouldMorph && !burst
          ? [baseY, baseY + IDLE_DRIFT_Y[i], baseY, baseY - IDLE_DRIFT_Y[i] * 0.6, baseY]
          : baseY;
        const xTrans = entering
          ? { duration: 0.55, ease: "easeOut" as const, delay: i * 0.065 }
          : burst
          ? { duration: morphDur, ease: "easeOut" as const }
          : !shouldMorph
          ? { duration: IDLE_PERIODS[i], repeat: Infinity, ease: "easeInOut" as const }
          : { duration: morphDur, ease: "easeInOut" as const };
        const yTrans = entering
          ? { duration: 0.55, ease: "easeOut" as const, delay: i * 0.065 }
          : burst
          ? { duration: morphDur, ease: "easeOut" as const }
          : !shouldMorph
          ? { duration: IDLE_PERIODS[i] * 1.1, repeat: Infinity, ease: "easeInOut" as const, delay: IDLE_PERIODS[i] * 0.15 }
          : { duration: morphDur, ease: "easeInOut" as const };
        const scatter = scatterRef.current[i];
        return (
          <motion.circle
            key={`n-${i}-${entranceKey}`}
            cx={0} cy={0}
            r={nodeR}
            filter={`url(#${filterId})`}
            initial={entering ? { x: scatter[0], y: scatter[1], opacity: 0 } : false}
            animate={{
              x: animX,
              y: animY,
              opacity: burst ? [0.95, 1, 0.95] : excited ? [0.82, 1, 0.82] : [0.6, 1, 0.6],
              fill: burst ? burstColor : nodeColors[i],
            }}
            transition={{
              x: xTrans,
              y: yTrans,
              opacity: entering
                ? { duration: 0.3, delay: i * 0.065 }
                : burst
                ? { duration: 0.25, repeat: Infinity, ease: "easeInOut" }
                : {
                    duration: excited ? 0.65 + i * 0.1 : 2.0 + i * 0.28,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * (excited ? 0.07 : 0.2),
                  },
              fill: { duration: burst ? 0.12 : 1.2, ease: "easeInOut" },
            }}
          />
        );
      })}

      {/* Star-point spikes on each node — small 4-point cross for that "star" look.
          Spikes share the same entrance key so they remount with their nodes. */}
      {WISP_COLORS.map((_color, i) => {
        const baseX = shape[i][0];
        const baseY = shape[i][1];
        const animX = !shouldMorph && !burst
          ? [baseX, baseX + IDLE_DRIFT_X[i], baseX, baseX - IDLE_DRIFT_X[i] * 0.5, baseX]
          : baseX;
        const animY = !shouldMorph && !burst
          ? [baseY, baseY + IDLE_DRIFT_Y[i], baseY, baseY - IDLE_DRIFT_Y[i] * 0.6, baseY]
          : baseY;
        const xTrans = entering
          ? { duration: 0.55, ease: "easeOut" as const, delay: i * 0.065 }
          : burst
          ? { duration: morphDur, ease: "easeOut" as const }
          : !shouldMorph
          ? { duration: IDLE_PERIODS[i], repeat: Infinity, ease: "easeInOut" as const }
          : { duration: morphDur, ease: "easeInOut" as const };
        const yTrans = entering
          ? { duration: 0.55, ease: "easeOut" as const, delay: i * 0.065 }
          : burst
          ? { duration: morphDur, ease: "easeOut" as const }
          : !shouldMorph
          ? { duration: IDLE_PERIODS[i] * 1.1, repeat: Infinity, ease: "easeInOut" as const, delay: IDLE_PERIODS[i] * 0.15 }
          : { duration: morphDur, ease: "easeInOut" as const };
        const scatter = scatterRef.current[i];
        return (
        <motion.g
          key={`spike-${i}-${entranceKey}`}
          initial={entering ? { x: scatter[0], y: scatter[1], opacity: 0, scale: 0 } : false}
          animate={{
            x: animX,
            y: animY,
            opacity: burst ? [0.9, 1, 0.9] : excited ? [0.7, 1, 0.7] : [0.3, 0.7, 0.3],
            scale: burst ? [1.2, 1.6, 1.2] : excited ? [0.8, 1.2, 0.8] : [0.6, 1, 0.6],
            color: burst ? burstColor : nodeColors[i],
          }}
          transition={{
            x: xTrans,
            y: yTrans,
            opacity: entering
              ? { duration: 0.3, delay: i * 0.065 + 0.1 }
              : burst
              ? { duration: 0.22, repeat: Infinity, ease: "easeInOut" }
              : {
                  duration: excited ? 0.55 + i * 0.1 : 1.8 + i * 0.25,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * (excited ? 0.06 : 0.18) + 0.3,
                },
            scale: entering
              ? { duration: 0.4, ease: "easeOut", delay: i * 0.065 + 0.1 }
              : burst
              ? { duration: 0.22, repeat: Infinity, ease: "easeInOut" }
              : {
                  duration: excited ? 0.55 + i * 0.1 : 1.8 + i * 0.25,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * (excited ? 0.06 : 0.18) + 0.3,
                },
            color: { duration: burst ? 0.12 : 1.2, ease: "easeInOut" },
          }}
        >
          {/* Vertical spike */}
          <line
            x1={0} y1={-(nodeR + 3)}
            x2={0} y2={nodeR + 3}
            stroke="currentColor"
            strokeWidth={0.7}
            strokeOpacity={0.9}
            strokeLinecap="round"
          />
          {/* Horizontal spike */}
          <line
            x1={-(nodeR + 3)} y1={0}
            x2={nodeR + 3} y2={0}
            stroke="currentColor"
            strokeWidth={0.7}
            strokeOpacity={0.9}
            strokeLinecap="round"
          />
        </motion.g>
        )
      })}

      {/* Multicolored ember / spark particles — drift outward from constellation and fade */}
      {!entering && EMBERS.map((e, i) => {
        const rad = (e.angle * Math.PI) / 180;
        const x0 = e.r0 * Math.cos(rad);
        const y0 = e.r0 * Math.sin(rad);
        const x1 = e.r1 * Math.cos(rad);
        const y1 = e.r1 * Math.sin(rad);
        return (
          <motion.g
            key={`ember-${i}`}
            style={{ filter: `drop-shadow(0 0 3px ${e.col})` }}
            initial={{ x: x0, y: y0, opacity: 0, scale: 0.6 }}
            animate={{
              x: [x0, x1, x1],
              y: [y0, y1, y1],
              opacity: [0, 0.88, 0],
              scale: [0.6, 1.0, 0.2],
            }}
            transition={{
              duration: e.dur,
              delay: e.delay,
              repeat: Infinity,
              repeatDelay: 0.5 + (i % 3) * 0.3,
              times: [0, 0.55, 1],
              ease: "easeOut",
            }}
          >
            <circle r={e.sz} fill={e.col} />
          </motion.g>
        );
      })}

    </svg>
  );
}

// ─── Tether Beam ──────────────────────────────────────────────────────────────

function TetherBeam({
  direction,
  attention = "listening",
  nodeOffset = { x: 0, y: 0 },
}: {
  direction: "down" | "left" | "up";
  attention?: LumiiAttentionState;
  nodeOffset?: { x: number; y: number };
}) {
  const isVert = direction === "down" || direction === "up";
  const isDown = direction === "down";
  const isAction = attention === "action";
  const LENGTH = 58;
  const CROSS = 18;
  const gradDir = isVert ? (isDown ? "to bottom" : "to top") : "to left";
  const dotKeyframe = isVert
    ? (isDown ? [2, LENGTH - 10, 2] : [LENGTH - 10, 2, LENGTH - 10])
    : [LENGTH - 10, 2, LENGTH - 10];
  const DOT_COLORS = isAction
    ? (["#fbbf24", "#f97316", "#fbbf24"] as const)
    : (["#a855f7", "#fbbf24", "#3b82f6"] as const);
  const dotDuration = isAction ? 0.85 : 1.55;
  const glowSize = isAction ? 10 : 7;
  const tipColor = isAction ? "#fbbf24" : "#a855f7";

  // Shift the beam's cross-axis so it visually originates from the nearest node
  const crossShift = isVert ? nodeOffset.x : nodeOffset.y;

  return (
    <div
      style={{
        width: isVert ? CROSS : LENGTH,
        height: isVert ? LENGTH : CROSS,
        position: "relative",
        flexShrink: 0,
        transform: isVert
          ? `translateX(${crossShift}px)`
          : `translateY(${crossShift}px)`,
      }}
    >
      {/* Gradient glow arm */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: isAction
            ? `linear-gradient(${gradDir}, rgba(251,191,36,0.65), rgba(249,115,22,0.32), transparent)`
            : `linear-gradient(${gradDir}, rgba(168,85,247,0.55), rgba(59,130,246,0.28), transparent)`,
          borderRadius: 10,
          filter: "blur(4px)",
        }}
      />
      {/* Sharper centre line */}
      <div
        style={{
          position: "absolute",
          ...(isVert
            ? { top: 0, bottom: 0, left: "50%", width: 1, transform: "translateX(-50%)" }
            : { left: 0, right: 0, top: "50%", height: 1, transform: "translateY(-50%)" }),
          background: isAction
            ? `linear-gradient(${gradDir}, rgba(251,191,36,0.6), transparent)`
            : `linear-gradient(${gradDir}, rgba(168,85,247,0.45), transparent)`,
        }}
      />
      {/* Travelling dots */}
      {DOT_COLORS.map((color, i) => (
        <motion.div
          key={i}
          animate={isVert ? { y: dotKeyframe } : { x: dotKeyframe }}
          transition={{ duration: dotDuration, repeat: Infinity, delay: i * 0.28, ease: "easeInOut" }}
          style={{
            position: "absolute",
            width: isAction ? 6 : 5,
            height: isAction ? 6 : 5,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 ${glowSize}px ${color}`,
            ...(isVert
              ? { left: "50%", top: 0, transform: "translateX(-50%)" }
              : { top: "50%", left: 0, transform: "translateY(-50%)" }),
          }}
        />
      ))}
      {/* Pulsing tip indicator — action beats only */}
      {isAction && (
        <motion.div
          animate={{ scale: [0.7, 1.5, 0.7], opacity: [0.9, 0, 0.9] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeOut" }}
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: tipColor,
            ...(isVert && isDown ? { bottom: 0, left: "50%", transform: "translateX(-50%)" }
              : isVert ? { top: 0, left: "50%", transform: "translateX(-50%)" }
              : { top: "50%", left: 0, transform: "translateY(-50%)" }),
          }}
        />
      )}
    </div>
  );
}

// ─── Attention Arrow ──────────────────────────────────────────────────────────

function AttentionArrow({
  direction,
  attention,
}: {
  direction: "down" | "left" | "up";
  attention: LumiiAttentionState;
}) {
  const isAction = attention === "action";
  const color = isAction ? "#fbbf24" : "#a855f7";
  const dur = isAction ? 0.65 : 1.3;
  const bounce =
    direction === "down" ? { y: [0, 7, 0] } :
    direction === "up"   ? { y: [0, -7, 0] } :
    { x: [0, -7, 0] };

  const Icon =
    direction === "down" ? ChevronDown :
    direction === "up"   ? ChevronUp   :
    ChevronLeft;

  return (
    <motion.div
      animate={{ ...bounce, opacity: isAction ? [0.8, 1, 0.8] : [0.5, 0.85, 0.5] }}
      transition={{ duration: dur, repeat: Infinity, ease: "easeInOut" }}
      style={{ color, lineHeight: 0, flexShrink: 0 }}
    >
      <Icon style={{ width: 18, height: 18 }} />
    </motion.div>
  );
}

// ─── Speech Bubble ────────────────────────────────────────────────────────────

interface BubbleProps {
  text: string;
  isActionBeat: boolean;
  isLastLine: boolean;
  isFfBeat: boolean;
  phase: 1 | 2;
  objective?: string;
  onClick: () => void;
}

function LumiiBubble({ text, isActionBeat, isLastLine, isFfBeat, phase, objective, onClick }: BubbleProps) {
  const showNext = !isActionBeat || !isLastLine;
  const actionPrompt = isLastLine && isActionBeat ? "Go ahead — do it!" : null;

  return (
    <motion.button
      type="button"
      key={text}
      initial={{ opacity: 0, scale: 0.88, y: 6 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -4 }}
      transition={{ type: "spring", stiffness: 340, damping: 24 }}
      onClick={onClick}
      className="pointer-events-auto text-left max-w-[240px] rounded-2xl border border-white/20 shadow-xl focus:outline-none"
      style={{
        background: phase === 2 ? "rgba(20, 12, 36, 0.97)" : "rgba(10, 16, 36, 0.97)",
        backdropFilter: "blur(14px)",
        padding: "12px 14px 10px",
      }}
    >
      {/* Source label */}
      <div className="flex items-center gap-2 mb-2">
        <div
          style={{
            width: 14,
            height: 2,
            borderRadius: 1,
            background: "linear-gradient(90deg, #f97316, #22c55e, #3b82f6, #a855f7, #e2e8f0)",
            opacity: 0.7,
            flexShrink: 0,
          }}
        />
        <span
          className="text-[9px] font-bold uppercase"
          style={{ letterSpacing: "0.17em", color: "rgba(255,255,255,0.5)" }}
        >
          LUMII · AFFINITY ECHO
        </span>
        {phase === 2 && (
          <span
            className="ml-auto text-[8px] font-semibold uppercase tracking-wider"
            style={{
              color: "rgba(52,211,153,0.65)",
              border: "1px solid rgba(52,211,153,0.2)",
              borderRadius: 3,
              padding: "1px 5px",
            }}
          >
            ASCENSION
          </span>
        )}
      </div>

      {/* Dialogue text */}
      <p className="text-[13px] text-white/92 leading-relaxed mb-2.5">{renderKeywords(text)}</p>

      {/* Objective label — shown on last line of beats that carry an objective */}
      {objective && isLastLine && (
        <div
          className="flex items-center gap-1.5 mb-2 px-2 py-1 rounded-lg"
          style={{ background: "rgba(168,85,247,0.1)", border: "1px solid rgba(168,85,247,0.2)" }}
        >
          <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#a855f7", flexShrink: 0 }} />
          <span
            className="text-[9px] uppercase font-semibold"
            style={{ letterSpacing: "0.12em", color: "rgba(168,85,247,0.85)" }}
          >
            {objective}
          </span>
        </div>
      )}

      {/* Footer action */}
      {actionPrompt ? (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-300/80 font-semibold">
          <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          {actionPrompt}
        </div>
      ) : isFfBeat && isLastLine ? (
        <div className="flex items-center justify-end gap-1 text-[11px] text-violet-300/80 font-semibold">
          Fast-forward ⏩
        </div>
      ) : showNext ? (
        <div className="flex items-center justify-end gap-1 text-[11px] text-white/40">
          <span>Tap to continue</span>
          <ArrowRight className="h-3 w-3" />
        </div>
      ) : null}
    </motion.button>
  );
}

// ─── Beat Script ──────────────────────────────────────────────────────────────

type BeatPosition = "center" | "harvest" | "market" | "filters" | "luminaries";
type BeatAdvance =
  | { type: "click" }
  | { type: "action"; actions: string[] }
  | { type: "fast_forward" };

interface Beat {
  position: BeatPosition;
  lines: string[];
  advance: BeatAdvance;
  highlightZone?: "harvest" | "market" | "filters" | "luminaries";
  objective?: string;
  phase: 1 | 2;
}

const BEATS: Beat[] = [
  // 0 — Introduction
  {
    position: "center",
    phase: 1,
    lines: [
      "Psst! Over here! ✨ I'm Lumii — a living mote of cosmic energy, and I'm here to guide your civilization through Luminae.",
      "You are shaping a civilization across the fabric of the cosmos — driving it toward 15 Eminence before your opponent reaches theirs.",
      "Three forces carry you there: affinity currents flowing through the cosmos, relic technologies forged into your civilization, and Luminaries — ancient archetypes waiting to be called forth. Let me show you.",
    ],
    advance: { type: "click" },
  },
  // 1 — Affinity Well intro
  {
    position: "harvest",
    phase: 1,
    highlightZone: "harvest",
    lines: [
      "This flowing band is the Affinity Well — the raw cosmic substrate your civilization draws from each turn.",
      "Each current is a distinct mode of existence: Flare 🔴, Continuum 🔵, Verdance 🟢, Abyss 🟣, Radiance ⚪ — each a survival philosophy that shapes the cosmos.",
      "That shimmering gold current? That's Singularity — the convergence point where all affinities meet. Each turn, you Harness currents from the Well.",
    ],
    advance: { type: "click" },
  },
  // 2 — First harvest (wait for action)
  {
    position: "harvest",
    phase: 1,
    highlightZone: "harvest",
    objective: "Objective: gather affinity",
    lines: [
      "Your turn! Tap 3 different affinity currents from the Well to draw them into your civilization, then tap Harness to claim them.",
    ],
    advance: { type: "action", actions: ["take_three_crystals", "take_two_crystals"] },
  },
  // 3 — Second harvest
  {
    position: "harvest",
    phase: 1,
    highlightZone: "harvest",
    objective: "Objective: gather affinity",
    lines: [
      "Your civilization deepens its reach. Do it again — draw 3 different currents, or 2 of the same if there are 4 or more of that current available in the Well.",
    ],
    advance: { type: "action", actions: ["take_three_crystals", "take_two_crystals"] },
  },
  // 4 — Market intro + cost explanation
  {
    position: "market",
    phase: 1,
    highlightZone: "market",
    lines: [
      "These are Artifact cards — relic technologies in three tiers. Each shows an affinity cost: the currents needed to Forge it into your civilization.",
      "When all cost pips appear green, you can afford that Artifact right now. Orange means you're short — the exact gap is shown so you always know how close you are.",
      "Every Artifact you Forge builds permanent affinity depth. That depth automatically discounts future Artifacts of the same type — so each Forge makes the next one cheaper.",
    ],
    advance: { type: "click" },
  },
  // 5 — Filter controls
  {
    position: "filters",
    phase: 1,
    highlightZone: "filters",
    lines: [
      "Above the market, three filters control how costs are displayed: Full, Discounted, and Needed.",
      "Discounted applies your built affinity depth as automatic discounts. Forge two Flare Artifacts and every Flare cost here drops by 2. This is your real cost after civilization depth.",
      "Needed strips away any cost already covered by your depth — only what you still lack appears. Switch to Needed to instantly spot which Artifacts are within reach this turn.",
    ],
    advance: { type: "click" },
  },
  // 6 — Reserve instruction (wait for action)
  {
    position: "market",
    phase: 1,
    highlightZone: "market",
    objective: "Objective: encrypt an Artifact",
    lines: [
      "Tap any Artifact to examine it. You can Forge it into your civilization now, or Encrypt it — securing it and receiving a Singularity current as the cosmos rewards your foresight.",
      "Encrypt one now. Tap any Artifact in the market and hit Encrypt.",
    ],
    advance: { type: "action", actions: ["reserve_card"] },
  },
  // 7 — Post-reserve + bonus explanation
  {
    position: "market",
    phase: 1,
    lines: [
      "Good. That Artifact is secured — no other civilization can claim it. It waits in your Hand panel until your affinity currents are sufficient to Forge it.",
      "You also received one Singularity current — the gold affinity. Singularity acts as a wildcard: it substitutes for any affinity when Forging, stretching whatever you hold.",
      "Every Artifact you Forge adds a permanent bonus to that affinity. These bonuses appear in your Hand panel and automatically reduce all future costs of that type, every turn.",
    ],
    advance: { type: "click" },
  },
  // 8 — Forge instruction (wait for action)
  {
    position: "market",
    phase: 1,
    highlightZone: "market",
    objective: "Objective: forge an Artifact",
    lines: [
      "Now Forge. Tap any Artifact with green costs — those are within reach right now. Hit Forge Artifact to claim it permanently.",
      "Try switching to Discounted view to see your depth discounts at work, or Needed to see only what you're still short on. Both help you find a good target fast.",
    ],
    advance: { type: "action", actions: ["purchase_card"] },
  },
  // 9 — Luminaries + Eminence intro
  {
    position: "luminaries",
    phase: 1,
    highlightZone: "luminaries",
    lines: [
      "Look up — those are the Luminaries. Each one stirs when your civilization expresses enough affinity depth of its required types. When it answers, you receive Eminence and a living bonus.",
      "Eminence is your civilization's ascension score. Check your Hand panel for your current total — it's shown prominently at the top. Reach 15 Eminence first and you win.",
      "Single-affinity Luminaries bring 2 Eminence; dual bring 3; triple bring 4. Stack multiple Luminaries and compound your ascension — they are the turning points of legend.",
    ],
    advance: { type: "click" },
  },
  // 10 — Fast-forward trigger
  {
    position: "center",
    phase: 1,
    lines: [
      "I'm going to skip us ahead — several turns of development, so you can witness what a civilization on the edge of legend actually looks like. ⏩",
    ],
    advance: { type: "fast_forward" },
  },
  // 11 — Endgame intro (Phase 2)
  {
    position: "center",
    phase: 2,
    lines: [
      "Here. Several turns forward. Your civilization has taken the Verdance path — life becoming infrastructure, growth woven into every component.",
      "You carry 5 Verdance depth and 13 Eminence. One more Verdance Artifact will call forth the Verdant Oracle — the archetype of life that has made itself eternal.",
      "The Verdant Oracle brings 2 Eminence. 13 + 2 = 15. That is the threshold where a civilization crosses from survival into legend. You are one move away.",
    ],
    advance: { type: "click" },
  },
  // 12 — Endgame forge instruction (wait for action)
  {
    position: "market",
    phase: 2,
    highlightZone: "market",
    objective: "Objective: forge your encrypted Artifact",
    lines: [
      "You have a Verdance Artifact encrypted — it costs Abyss and Radiance currents, and your civilization holds both.",
      "Tap the Hand panel, find your encrypted card, and Forge it. The Verdant Oracle is waiting — and 15 Eminence is one step away.",
    ],
    advance: { type: "action", actions: ["purchase_reserved"] },
  },
  // 13 — Completion celebration
  {
    position: "center",
    phase: 2,
    lines: [
      "🌿 The Verdant Oracle answers. Your civilization, rooted deeply enough in the living path, has called it forth — and crossed into legend.",
      "Every civilization is different. Different affinities, different relic technologies, different Luminaries, different paths to 15 Eminence.",
      "Now you know the shape of ascension. Go build yours. ✨",
    ],
    advance: { type: "click" },
  },
];

export const LUMII_BEAT_COUNT = BEATS.length;

export const LUMII_BEAT_GATES: Record<number, string[]> = {
  0:  [],
  1:  [],
  2:  ["take_three_crystals", "take_two_crystals"],
  3:  ["take_three_crystals", "take_two_crystals"],
  4:  [],
  5:  [],
  6:  ["reserve_card"],
  7:  [],
  8:  ["purchase_card"],
  9:  [],
  10: ["tutorial_fast_forward"],
  11: [],
  12: ["purchase_reserved"],
  13: [],
};

export const LUMII_ZONE_HIGHLIGHTS: Partial<Record<number, "harvest" | "market" | "filters" | "luminaries">> = {
  1:  "harvest",
  2:  "harvest",
  3:  "harvest",
  4:  "market",
  5:  "filters",
  6:  "market",
  7:  "market",
  8:  "market",
  9:  "luminaries",
  12: "market",
};

// ─── Tutorial attention states ────────────────────────────────────────────────

export type LumiiAttentionState = "listening" | "look_here" | "action";

export const LUMII_ATTENTION: Record<number, LumiiAttentionState> = {
  0:  "listening",
  1:  "look_here",
  2:  "action",
  3:  "action",
  4:  "look_here",
  5:  "look_here",
  6:  "action",
  7:  "look_here",
  8:  "action",
  9:  "look_here",
  10: "listening",
  11: "listening",
  12: "action",
  13: "listening",
};

// ─── Nudge messages ───────────────────────────────────────────────────────────

const NUDGE_MESSAGES: Partial<Record<number, string>> = {
  2:  "Tap affinity currents in the Well below to select them, then tap Harness.",
  3:  "Draw more currents from the Affinity Well, then tap Harness.",
  5:  "Tap Discounted or Needed above the market to try the filters, then tap Lumii to continue.",
  6:  "Tap any Artifact card in the market, then tap Encrypt to hold it.",
  8:  "Tap an Artifact with green costs and hit Forge Artifact.",
  12: "Open your Hand panel, find your encrypted card, and tap Forge Artifact.",
};

// ─── Position helpers ─────────────────────────────────────────────────────────

type LayoutVariant = "above" | "below" | "left" | "right";

interface PositionStyle {
  fixed: React.CSSProperties;
  layout: LayoutVariant;
  tether?: "down" | "left" | "up";
  /**
   * When true the fixed container spans left:0 right:0 (full viewport width)
   * and uses display:flex + justifyContent:center to anchor the orb.
   * This is more reliable than left:50vw + translateX(-50%) across mobile
   * webviews, PWAs and safe-area environments because it uses the browser's
   * own layout engine rather than CSS vw units, which can disagree with the
   * actual rendered viewport width on some mobile platforms.
   */
  centered?: boolean;
}

function getPositionStyle(pos: BeatPosition, vpH: number): PositionStyle {
  switch (pos) {
    case "harvest":
      return { fixed: { bottom: 168, left: 14 }, layout: "above", tether: "down" };
    case "market":
    case "filters":
      return {
        fixed: { top: Math.round(vpH * 0.44) - 36, right: 14 },
        layout: "left",
        tether: "left",
      };
    case "luminaries":
      // left:0 right:0 spans the full rendered viewport; flex+justifyContent:center
      // anchors the orb at true viewport centre on every platform.
      return {
        fixed: { top: 90, left: 0, right: 0 },
        layout: "below",
        tether: "down",
        centered: true,
      };
    case "center":
    default:
      return {
        fixed: { top: Math.round(vpH * 0.5) - 88, left: 0, right: 0 },
        layout: "below",
        centered: true,
      };
  }
}

// ─── Lumii Layout ─────────────────────────────────────────────────────────────

function LumiiLayout({
  layout,
  orb,
  bubble,
  tether,
  arrow,
}: {
  layout: LayoutVariant;
  orb: React.ReactNode;
  bubble: React.ReactNode;
  tether?: React.ReactNode;
  arrow?: React.ReactNode;
}) {
  if (layout === "above") {
    // bubble → orb → tether → arrow (visual top→bottom, orb hovers above target)
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {bubble}
        {orb}
        {tether}
        {arrow}
      </div>
    );
  }
  if (layout === "below") {
    // orb → tether → arrow → bubble (visual top→bottom, orb above everything)
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
        {orb}
        {tether}
        {arrow}
        {bubble}
      </div>
    );
  }
  if (layout === "left") {
    // [bubble] [arrow] [tether] [orb] left→right, orb nearest the target element on the right
    return (
      <div style={{ display: "flex", flexDirection: "row-reverse", alignItems: "center", gap: 8 }}>
        {orb}
        {tether}
        {arrow}
        {bubble}
      </div>
    );
  }
  // right layout: orb on left, bubble extends right
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 8 }}>
      {orb}
      {tether}
      {arrow}
      {bubble}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  state: GameState | null | undefined;
  sessionPlayerId: string;
  tutorialStep: number;
  setTutorialStep: (step: number) => void;
  executeAction: (payload: Record<string, unknown>) => Promise<void>;
  nudgeTick?: number;
  burstIntensity?: number;
  burstDuration?: number;
  burstEase?: EasingDefinition;
}

export function LumiiTutorial({
  state,
  sessionPlayerId,
  tutorialStep,
  setTutorialStep,
  executeAction,
  nudgeTick = 0,
  burstIntensity = 1.15,
  burstDuration = 0.35,
  burstEase = [0.34, 1.56, 0.64, 1] as EasingDefinition,
}: Props) {
  const [, setLocation] = useLocation();
  const vpH = useViewportH();
  const [lineIdx, setLineIdx] = useState(0);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [nudgeText, setNudgeText] = useState<string | null>(null);
  // Celebration burst state — briefly true after each successful action beat
  const [burstActive, setBurstActive] = useState(false);
  // Color used during the current burst — varies by action type for normal beats,
  // and uses the Luminary's summonColor for the first-Luminary claim milestone.
  const [burstColor, setBurstColor] = useState<string>("#fbbf24");
  // Intensity for the current burst — sourced from BURST_INTENSITY map so callers
  // reference named event types instead of raw literals.
  const [currentBurstIntensity, setCurrentBurstIntensity] = useState<number>(burstIntensity);
  // Affinity key for the current burst — drives per-affinity particle palettes when set.
  const [burstGemKey, setBurstGemKey] = useState<GemKey | null>(null);
  // Nearest constellation node for tether origin alignment
  const [tetherNodeOffset, setTetherNodeOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const prevLogLenRef = useRef(0);
  // Initialized from the current player's claimed count so resumed tutorial sessions
  // don't treat a pre-existing claim as a new one.
  const prevClaimedLumCountRef = useRef(
    state?.players?.find((p) => p.playerId === sessionPlayerId)?.claimedLuminaryIds?.length ?? 0
  );
  // Track lumens so a forge action that grants Eminence can fire the eminence_milestone preset.
  const prevLumensRef = useRef(
    state?.players?.find((p) => p.playerId === sessionPlayerId)?.lumens ?? 0
  );
  const ffTriggeredRef = useRef(false);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const beat = BEATS[tutorialStep] ?? null;
  const currentAttention = LUMII_ATTENTION[tutorialStep] ?? "listening";

  // Cleanup burst timer on unmount
  useEffect(() => {
    return () => {
      if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    };
  }, []);

  // Register the tutorial panel height CSS var so the board content pads itself
  useEffect(() => {
    document.documentElement.style.setProperty("--tutorial-panel-height", "0px");
    return () => {
      document.documentElement.style.removeProperty("--tutorial-panel-height");
    };
  }, []);

  // Reset to first line on beat change
  useEffect(() => {
    setLineIdx(0);
  }, [tutorialStep]);

  // Show nudge when a blocked action fires from game.tsx
  useEffect(() => {
    if (nudgeTick === 0) return;
    const msg = NUDGE_MESSAGES[tutorialStep];
    if (!msg) return;
    setNudgeText(msg);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => setNudgeText(null), 3200);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudgeTick]);

  const advanceBeat = useCallback(() => {
    const next = tutorialStep + 1;
    if (next >= BEATS.length) {
      setShowCompletion(true);
    } else {
      setTutorialStep(next);
    }
  }, [tutorialStep, setTutorialStep]);

  // Trigger a brief celebration burst on Lumii then advance after it plays.
  // opts.duration: how long the burst lasts (default 500ms; use 700ms for Luminary claims).
  // opts.color: flash palette color (default gold #fbbf24; use Luminary summonColor for claims).
  // opts.intensity: scale peak from BURST_INTENSITY map (default BURST_INTENSITY_DEFAULT).
  //   Values >= 1.35 also fire the wide-ring shockwave (ring 2).
  // opts.gemKey: affinity key that drives the per-affinity particle palettes (both rings).
  const triggerCelebrationBurst = useCallback((onComplete: () => void, opts?: { duration?: number; color?: string; intensity?: number; gemKey?: GemKey }) => {
    if (burstTimerRef.current) clearTimeout(burstTimerRef.current);
    setBurstColor(opts?.color ?? "#fbbf24");
    setCurrentBurstIntensity(opts?.intensity ?? BURST_INTENSITY_DEFAULT);
    setBurstGemKey(opts?.gemKey ?? null);
    setBurstActive(true);
    burstTimerRef.current = setTimeout(() => {
      setBurstActive(false);
      onComplete();
    }, opts?.duration ?? 500);
  }, []);

  const handleClick = useCallback(() => {
    if (!beat || showCompletion || isFastForwarding) return;
    if (lineIdx < beat.lines.length - 1) {
      setLineIdx((l) => l + 1);
      return;
    }
    if (beat.advance.type === "click") {
      advanceBeat();
    } else if (beat.advance.type === "fast_forward") {
      triggerFastForward();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, lineIdx, advanceBeat, showCompletion, isFastForwarding]);

  // Detect when the required action completes — trigger celebration burst then advance.
  // If the action resulted in a Luminary claim, use a longer burst (700ms) in the
  // Luminary's own summon color so the moment feels appropriately epic.
  useEffect(() => {
    if (!beat || beat.advance.type !== "action") return;
    if (!state?.actionLog?.length) return;
    const logLen = state.actionLog.length;
    if (logLen <= prevLogLenRef.current) return;
    prevLogLenRef.current = logLen;
    const lastAction = state.lastAction as { type?: string; playerId?: string } | null;
    if (!lastAction?.type || lastAction.playerId !== sessionPlayerId) return;
    if (beat.advance.actions.includes(lastAction.type)) {
      const myPlayer = state.players?.find((p) => p.playerId === sessionPlayerId);
      const currentClaimedCount = myPlayer?.claimedLuminaryIds?.length ?? 0;
      const prevCount = prevClaimedLumCountRef.current;
      prevClaimedLumCountRef.current = currentClaimedCount;
      if (prevCount === 0 && currentClaimedCount === 1) {
        // First Luminary claimed — use its summon color, a longer epic burst, and elevated
        // intensity. No single gemKey applies; summonColor drives the palette for this moment.
        const newLumId = myPlayer?.claimedLuminaryIds?.[0];
        const lumData = (state.luminaries ?? []).find((l) => l.id === newLumId);
        const color = (lumData as { summonColor?: string } | undefined)?.summonColor ?? "#fbbf24";
        triggerCelebrationBurst(advanceBeat, {
          duration: 700,
          color,
          intensity: BURST_INTENSITY.luminary_claimed,
        });
      } else {
        // Standard action beat — use per-action palette color, affinity key, and intensity.
        // Forge actions that also grant Eminence (lumens increased) get the elevated
        // eminence_milestone preset (1.6, ring 2); plain forges get card_forged (1.15).
        const isForgingAction = lastAction.type === "purchase_card" || lastAction.type === "purchase_reserved";
        const currentLumens = myPlayer?.lumens ?? 0;
        const prevLumens = prevLumensRef.current;
        prevLumensRef.current = currentLumens;
        const earnedEminence = isForgingAction && currentLumens > prevLumens;
        triggerCelebrationBurst(advanceBeat, {
          color: BURST_COLOR_BY_ACTION[lastAction.type] ?? "#fbbf24",
          gemKey: BURST_GEM_KEY_BY_ACTION[lastAction.type],
          intensity: earnedEminence
            ? BURST_INTENSITY.eminence_milestone
            : isForgingAction
              ? BURST_INTENSITY.card_forged
              : BURST_INTENSITY_DEFAULT,
        });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.actionLog?.length, beat, sessionPlayerId, advanceBeat, triggerCelebrationBurst]);

  const triggerFastForward = useCallback(async () => {
    if (ffTriggeredRef.current) return;
    ffTriggeredRef.current = true;
    setIsFastForwarding(true);
    try {
      await executeAction({ type: "tutorial_fast_forward" });
    } catch {
      ffTriggeredRef.current = false;
      setIsFastForwarding(false);
    }
  }, [executeAction]);

  useEffect(() => {
    if (!isFastForwarding) return undefined;
    const myPlayer = state?.players?.find((p) => p.playerId === sessionPlayerId);
    if ((myPlayer?.lumens ?? 0) >= 13) {
      const timer = setTimeout(() => {
        setIsFastForwarding(false);
        ffTriggeredRef.current = false;
        advanceBeat();
      }, 1400);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isFastForwarding, state, sessionPlayerId, advanceBeat]);

  useEffect(() => {
    if (state?.status === "finished" && tutorialStep >= 11 && tutorialStep < BEATS.length - 1) {
      const timer = setTimeout(() => {
        if (tutorialStep < BEATS.length - 1) {
          setTutorialStep(BEATS.length - 1);
        }
      }, 2500);
      return () => clearTimeout(timer);
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.status]);

  const handleSkip = () => {
    setShowSkipConfirm(false);
    localStorage.setItem("luminae_tutorial_seen", "1");
    setTutorialStep(-1);
    clearSession();
    setLocation("/");
  };

  const handleFinish = () => {
    localStorage.setItem("luminae_tutorial_seen", "1");
    setTutorialStep(-1);
    clearSession();
    setLocation("/");
  };

  if (tutorialStep < 0) return null;

  const isLastLine = !beat || lineIdx >= beat.lines.length - 1;
  const isActionBeat = beat?.advance.type === "action";
  const isFfBeat = beat?.advance.type === "fast_forward";
  const currentPhase: 1 | 2 = beat?.phase ?? 1;
  const posStyle = beat ? getPositionStyle(beat.position, vpH) : getPositionStyle("center", vpH);
  const tetherEl = posStyle.tether ? (
    <TetherBeam direction={posStyle.tether} attention={currentAttention} nodeOffset={tetherNodeOffset} />
  ) : undefined;
  const arrowEl = posStyle.tether ? (
    <AttentionArrow direction={posStyle.tether} attention={currentAttention} />
  ) : undefined;

  // Dim overlay opacity varies by attention state:
  // listening = Lumii is speaking, player just reads → stronger dim
  // look_here = pointing at a zone, player can see it → mild dim
  // action     = player needs to interact → no dim
  const dimOpacity =
    showCompletion || isFastForwarding ? 0 :
    currentAttention === "listening"  ? 0.38 :
    currentAttention === "look_here"  ? 0.22 :
    0;

  return (
    <>
      {/* ── Background dim — fades in/out based on attention state ── */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 485, background: "black" }}
        animate={{ opacity: dimOpacity }}
        transition={{ duration: 0.6 }}
      />

      {/* ── Fast-forward blackout overlay ── */}
      <AnimatePresence>
        {isFastForwarding && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.7 }}
            className="fixed inset-0 z-[9000] bg-black flex flex-col items-center justify-center gap-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            >
              <LumiiOrb size={80} excited highlightZone={null} />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="text-center"
            >
              <div className="text-lg font-serif font-semibold text-white/90 mb-1">
                Advancing through time...
              </div>
              <div className="text-sm text-white/50">Several turns of civilization are passing</div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Skip confirm modal ── */}
      <AnimatePresence>
        {showSkipConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/75 px-5"
          >
            <motion.div
              initial={{ scale: 0.9, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 12 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/98 p-6 shadow-2xl"
            >
              <h2 className="text-lg font-bold mb-2">Leave the ascension path?</h2>
              <p className="text-sm text-muted-foreground mb-5">
                You'll return to the home screen. You can begin your civilization's journey from there at any time.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowSkipConfirm(false)}
                  className="flex-1 h-11 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold hover:bg-white/10 transition-colors"
                >
                  Keep learning
                </button>
                <button
                  type="button"
                  onClick={handleSkip}
                  className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
                >
                  Skip tutorial
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Completion screen ── */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[8000] flex items-center justify-center bg-black/82 px-5"
          >
            <motion.div
              initial={{ scale: 0.88, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/98 p-6 shadow-2xl text-center"
            >
              <motion.div
                className="flex justify-center mb-4"
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <LumiiOrb size={68} excited highlightZone={null} />
              </motion.div>
              <h2 className="text-xl font-bold font-serif mb-1">Your civilization is ready.</h2>
              <p className="text-sm text-muted-foreground mb-4">
                You've seen the full arc of ascension in Luminae.
              </p>
              <ul className="text-left text-sm space-y-2 mb-5">
                {[
                  "Harnessing affinity currents from the Affinity Well",
                  "Encrypting Artifacts — securing them and earning Singularity",
                  "Forging relic technologies to build permanent affinity depth",
                  "Using Discounted and Needed filters to find affordable Artifacts",
                  "Calling forth Luminaries by expressing a deep affinity path",
                  "Reaching 15 Eminence — crossing from survival into legend",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-emerald-400 shrink-0 mt-0.5">✓</span>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={handleFinish}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-colors"
              >
                Begin your civilization →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── All fixed overlays portaled to document.body so that no ancestor
            Framer Motion transform (rotate, scale, etc.) in the game component
            tree can act as a containing block and shift position: fixed elements ── */}
      {createPortal(
        <>
          {/* Lumii orb + speech bubble */}
          <AnimatePresence>
            {beat && !showCompletion && !isFastForwarding && (
              <motion.div
                key="lumii"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="fixed z-[500] pointer-events-none"
                style={{
                  ...posStyle.fixed,
                  // When centered, span the full rendered viewport width and use
                  // the browser's flex layout to anchor the orb at true centre.
                  // This is more reliable than left:50vw + translateX(-50%) across
                  // mobile webviews, PWAs, and safe-area environments.
                  ...(posStyle.centered ? { display: "flex", justifyContent: "center" } : {}),
                  transition: "top 0.35s ease, bottom 0.35s ease, left 0.35s ease, right 0.35s ease",
                }}
              >
                <motion.div
                  initial={{ scale: 0.82 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.82 }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                  <LumiiLayout
                    layout={posStyle.layout}
                    tether={tetherEl}
                    arrow={arrowEl}
                    orb={
                      <div style={{ position: "relative", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                        <AnimatePresence>
                          {burstActive && (
                            <motion.div
                              key="lumii-burst-glow"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: [0, 0.6, 0], scale: 1.6 }}
                              exit={{ opacity: 0, scale: 1.6 }}
                              transition={{ duration: 0.5, ease: "easeOut" }}
                              style={{
                                position: "absolute",
                                width: 140,
                                height: 140,
                                borderRadius: "50%",
                                background: `radial-gradient(circle, ${hexToRgba(burstColor, 0.7)} 0%, ${hexToRgba(burstColor, 0.35)} 45%, ${hexToRgba(burstColor, 0)} 75%)`,
                                pointerEvents: "none",
                                zIndex: 0,
                              }}
                            />
                          )}
                        </AnimatePresence>
                        {/* ── Burst particle scatter — ring 1 ── */}
                        <AnimatePresence>
                          {burstActive && (
                            <>
                              {([0, 60, 120, 180, 240, 300] as const).map((deg, i) => {
                                const rad = (deg * Math.PI) / 180;
                                const tx = Math.round(Math.cos(rad) * 52 * currentBurstIntensity);
                                const ty = Math.round(Math.sin(rad) * 52 * currentBurstIntensity);
                                const ring1Palette = burstGemKey
                                  ? AFFINITY_BURST_PALETTE[burstGemKey].ring1
                                  : (() => {
                                      const hex = burstColor.replace("#", "");
                                      const br = parseInt(hex.substring(0, 2), 16);
                                      const bg = parseInt(hex.substring(2, 4), 16);
                                      const bb = parseInt(hex.substring(4, 6), 16);
                                      const tint = (t: number) =>
                                        `rgb(${Math.round(br + (255 - br) * t)},${Math.round(bg + (255 - bg) * t)},${Math.round(bb + (255 - bb) * t)})`;
                                      return [tint(0), tint(0.3), tint(0.55), tint(0.15), tint(0.7), tint(0.45)];
                                    })();
                                const color = ring1Palette[i % ring1Palette.length];
                                return (
                                  <React.Fragment key={`burst-particle-${deg}`}>
                                    {currentBurstIntensity >= 1.2 && (
                                      <motion.div
                                        initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
                                        animate={{ opacity: [0, 0.4, 0], scale: [1, 1.3, 0.35], x: [0, tx, tx], y: [0, ty, ty] }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.5, ease: "easeOut", times: [0, 0.4, 1] }}
                                        style={{
                                          position: "absolute",
                                          width: 18,
                                          height: 18,
                                          borderRadius: "50%",
                                          background: color,
                                          filter: "blur(4px)",
                                          pointerEvents: "none",
                                          zIndex: 1,
                                        }}
                                      />
                                    )}
                                    <motion.div
                                      initial={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                                      animate={{ opacity: 0, x: tx, y: ty, scale: 0.35 }}
                                      exit={{ opacity: 0, scale: 0 }}
                                      transition={{ duration: 0.5, ease: "easeOut" }}
                                      style={{
                                        position: "absolute",
                                        width: 7,
                                        height: 7,
                                        borderRadius: "50%",
                                        background: color,
                                        pointerEvents: "none",
                                        zIndex: 2,
                                      }}
                                    />
                                  </React.Fragment>
                                );
                              })}
                            </>
                          )}
                        </AnimatePresence>
                        {/* ── Burst particle scatter — ring 2 (wide shockwave, high-intensity only) ── */}
                        <AnimatePresence>
                          {burstActive && currentBurstIntensity >= 1.35 && (
                            <>
                              {([36, 108, 180, 252, 324] as const).map((deg, i) => {
                                const rad = (deg * Math.PI) / 180;
                                const radius = (88 + (i % 2) * 8) * currentBurstIntensity;
                                const tx = Math.round(Math.cos(rad) * radius);
                                const ty = Math.round(Math.sin(rad) * radius);
                                const ring2Palette = burstGemKey
                                  ? AFFINITY_BURST_PALETTE[burstGemKey].ring2
                                  : (["#f0abfc", "#67e8f9", "#fde68a", "#a5f3fc", "#d8b4fe"] as const);
                                const color = ring2Palette[i % ring2Palette.length];
                                const delay = 0.12 + i * 0.006;
                                return (
                                  <React.Fragment key={`burst-particle-wide-${deg}`}>
                                    {currentBurstIntensity >= 1.2 && (
                                      <motion.div
                                        initial={{ opacity: 0, x: 0, y: 0, scale: 1 }}
                                        animate={{ opacity: [0, 0.4, 0], scale: [1, 1.3, 0.25], x: [0, tx, tx], y: [0, ty, ty] }}
                                        exit={{ opacity: 0 }}
                                        transition={{ duration: 0.55, ease: "easeOut", delay, times: [0, 0.4, 1] }}
                                        style={{
                                          position: "absolute",
                                          width: 16,
                                          height: 16,
                                          borderRadius: "50%",
                                          background: color,
                                          filter: "blur(4px)",
                                          pointerEvents: "none",
                                          zIndex: 1,
                                        }}
                                      />
                                    )}
                                    <motion.div
                                      initial={{ opacity: 0.9, x: 0, y: 0, scale: 1 }}
                                      animate={{ opacity: 0, x: tx, y: ty, scale: 0.25 }}
                                      exit={{ opacity: 0, scale: 0 }}
                                      transition={{ duration: 0.55, ease: "easeOut", delay }}
                                      style={{
                                        position: "absolute",
                                        width: 5,
                                        height: 5,
                                        borderRadius: "50%",
                                        background: color,
                                        pointerEvents: "none",
                                        zIndex: 2,
                                      }}
                                    />
                                  </React.Fragment>
                                );
                              })}
                            </>
                          )}
                        </AnimatePresence>
                        <motion.div
                          style={{ position: "relative", zIndex: 1 }}
                          animate={{
                            y: currentAttention === "action" ? [0, -13, 0] : [0, -8, 0],
                            scale: burstActive ? [1, currentBurstIntensity, 1] : 1,
                          }}
                          transition={{
                            y: {
                              duration: currentAttention === "action" ? 1.8 : 2.8,
                              repeat: Infinity,
                              ease: "easeInOut",
                            },
                            scale: burstActive
                              ? { duration: burstDuration, ease: burstEase }
                              : { duration: 0.2 },
                          }}
                        >
                          <LumiiOrb
                            size={72}
                            speaking
                            excited={
                              burstActive ||
                              currentAttention === "action" ||
                              (currentPhase === 2 && tutorialStep === BEATS.length - 1)
                            }
                            burst={burstActive}
                            burstColor={burstColor}
                            tetheredDirection={posStyle.tether}
                            onNearestNode={setTetherNodeOffset}
                            highlightZone={LUMII_ZONE_HIGHLIGHTS[tutorialStep] ?? null}
                            beatKey={beat?.position}
                          />
                        </motion.div>
                      </div>
                    }
                    bubble={
                      <div className="relative">
                        <AnimatePresence mode="wait">
                          <LumiiBubble
                            key={`${tutorialStep}-${lineIdx}`}
                            text={beat.lines[lineIdx] ?? beat.lines[0] ?? ""}
                            isActionBeat={isActionBeat}
                            isLastLine={isLastLine}
                            isFfBeat={isFfBeat}
                            phase={currentPhase}
                            objective={beat.objective}
                            onClick={handleClick}
                          />
                        </AnimatePresence>
                        {/* Nudge — brief explanation when a disallowed action is attempted */}
                        <AnimatePresence>
                          {nudgeText && (
                            <motion.div
                              key="nudge"
                              initial={{ opacity: 0, y: 6, scale: 0.95 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: -4, scale: 0.95 }}
                              transition={{ duration: 0.22 }}
                              className="absolute inset-x-0 pointer-events-none"
                              style={{ top: "calc(100% + 6px)" }}
                            >
                              <div
                                className="rounded-xl px-3 py-2 text-[11px] leading-snug"
                                style={{
                                  background: "rgba(168,85,247,0.18)",
                                  border: "1px solid rgba(168,85,247,0.38)",
                                  backdropFilter: "blur(8px)",
                                  color: "rgba(255,255,255,0.82)",
                                }}
                              >
                                <span style={{ color: "#a855f7", fontWeight: 700, marginRight: 5 }}>✦</span>
                                {nudgeText}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    }
                  />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Skip button */}
          {!showCompletion && !isFastForwarding && beat && (
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed top-3 right-3 z-[501] flex items-center gap-1 text-[11px] text-white/40 hover:text-white/70 transition-colors rounded-lg px-2 py-1.5 hover:bg-white/5 pointer-events-auto"
              onClick={() => setShowSkipConfirm(true)}
            >
              <X className="h-3 w-3" />
              Skip tutorial
            </motion.button>
          )}

          {/* Phase 2 scene label */}
          <AnimatePresence>
            {currentPhase === 2 && !showCompletion && !isFastForwarding && tutorialStep >= 11 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="fixed top-3 left-1/2 -translate-x-1/2 z-[500] pointer-events-none"
              >
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold backdrop-blur-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Civilization on the Edge of Legend
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>,
        document.body
      )}
    </>
  );
}
