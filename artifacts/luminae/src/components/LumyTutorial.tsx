import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { X, ArrowRight } from "lucide-react";
import type { GameState } from "@workspace/api-client-react";
import { clearSession } from "@/lib/session";

// ─── Lumy Orb ────────────────────────────────────────────────────────────────

function LumyOrb({ size = 72, excited = false }: { size?: number; excited?: boolean }) {
  const blur = Math.round(size * 0.45);
  const innerBlur = Math.max(2, Math.round(size * 0.06));
  const mask = "radial-gradient(circle, rgba(0,0,0,0.95) 22%, rgba(0,0,0,0.45) 52%, transparent 74%)";
  const innerMask = "radial-gradient(circle, rgba(0,0,0,0.9) 18%, rgba(0,0,0,0.35) 50%, transparent 70%)";
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      {/* Outer prismatic halo — large blurred cloud, high contrast */}
      <motion.div
        animate={{
          scale: excited ? [1, 1.38, 1.12, 1.38, 1] : [1, 1.18, 1],
          opacity: excited ? [0.7, 1, 0.78, 1, 0.7] : [0.52, 0.84, 0.52],
        }}
        transition={{ duration: excited ? 1.6 : 3.8, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: "-62%",
          borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, #f97316aa, #3b82f6aa, #22c55eaa, #a855f7aa, #e2e8f066, #fbbf24aa, #f97316aa)",
          filter: `blur(${blur}px)`,
        }}
      />
      {/* Secondary tighter halo ring — brighter inner prismatic band */}
      <motion.div
        animate={{ opacity: excited ? [0.5, 0.88, 0.5] : [0.28, 0.58, 0.28] }}
        transition={{ duration: excited ? 1.2 : 3.0, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: "-28%",
          borderRadius: "50%",
          background:
            "conic-gradient(from 180deg, #fbbf24cc, #a855f7cc, #3b82f6cc, #22c55ecc, #f97316cc, #fbbf24cc)",
          filter: `blur(${Math.round(size * 0.18)}px)`,
        }}
      />
      {/* Primary affinity current — rotating, edge-faded to transparent */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: excited ? 4.5 : 11, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, #f97316cc, #fbbf2499, #22c55ecc, #3b82f6cc, #a855f7cc, #e2e8f055, #f97316cc)",
          maskImage: mask,
          WebkitMaskImage: mask,
        }}
      />
      {/* Counter-rotating inner current — crossing flow layer */}
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: excited ? 7 : 17, repeat: Infinity, ease: "linear" }}
        style={{
          position: "absolute",
          inset: "13%",
          borderRadius: "50%",
          background:
            "conic-gradient(from 120deg, #3b82f6bb, #a855f7bb, #22c55ebb, #e2e8f040, #f97316bb, #3b82f6bb)",
          maskImage: innerMask,
          WebkitMaskImage: innerMask,
        }}
      />
      {/* Singularity core shimmer — slow irregular gold/white pulse */}
      <motion.div
        animate={{ opacity: [0, 0.85, 0.15, 0.72, 0], scale: [0.18, 0.55, 0.28, 0.5, 0.18] }}
        transition={{ duration: 5.8, repeat: Infinity, ease: "easeInOut", repeatDelay: 2.2 }}
        style={{
          position: "absolute",
          inset: "24%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(255,255,255,0.95) 0%, #fbbf24cc 42%, transparent 80%)",
          filter: `blur(${innerBlur}px)`,
        }}
      />
      {/* Presence pulse ring — expands and fades, no face */}
      <motion.div
        animate={{
          scale: excited ? [0.82, 1.45, 0.82] : [0.88, 1.24, 0.88],
          opacity: excited ? [0.65, 0, 0.65] : [0.35, 0, 0.35],
        }}
        transition={{ duration: excited ? 1.0 : 2.5, repeat: Infinity, ease: "easeOut" }}
        style={{
          position: "absolute",
          inset: "-7%",
          borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.22)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

// ─── Tether Beam ──────────────────────────────────────────────────────────────

function TetherBeam({ direction }: { direction: "down" | "left" | "up" }) {
  const isVert = direction === "down" || direction === "up";
  const isDown = direction === "down";
  const LENGTH = 58;
  const CROSS = 18;
  const gradDir = isVert ? (isDown ? "to bottom" : "to top") : "to left";
  // Dots travel from the orb toward the highlighted zone
  const dotKeyframe = isVert
    ? (isDown ? [2, LENGTH - 10, 2] : [LENGTH - 10, 2, LENGTH - 10])
    : [LENGTH - 10, 2, LENGTH - 10];
  const DOT_COLORS = ["#a855f7", "#fbbf24", "#3b82f6"] as const;

  return (
    <div
      style={{
        width: isVert ? CROSS : LENGTH,
        height: isVert ? LENGTH : CROSS,
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* Gradient glow arm */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(${gradDir}, rgba(168,85,247,0.55), rgba(59,130,246,0.28), transparent)`,
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
          background: `linear-gradient(${gradDir}, rgba(168,85,247,0.45), transparent)`,
        }}
      />
      {/* Travelling dots */}
      {DOT_COLORS.map((color, i) => (
        <motion.div
          key={i}
          animate={isVert ? { y: dotKeyframe } : { x: dotKeyframe }}
          transition={{ duration: 1.55, repeat: Infinity, delay: i * 0.38, ease: "easeInOut" }}
          style={{
            position: "absolute",
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 7px ${color}`,
            ...(isVert
              ? { left: "50%", top: 0, transform: "translateX(-50%)" }
              : { top: "50%", left: 0, transform: "translateY(-50%)" }),
          }}
        />
      ))}
    </div>
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

function LumyBubble({ text, isActionBeat, isLastLine, isFfBeat, phase, objective, onClick }: BubbleProps) {
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
        background: phase === 2 ? "rgba(20, 12, 36, 0.96)" : "rgba(10, 16, 36, 0.96)",
        backdropFilter: "blur(12px)",
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
          LUMY · AFFINITY ECHO
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
      <p className="text-[13px] text-white/92 leading-relaxed mb-2.5">{text}</p>

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
      "Psst! Over here! ✨ I'm Lumy — a living mote of cosmic energy, and I'm here to guide your civilization through Luminae.",
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
  // 4 — Market intro
  {
    position: "market",
    phase: 1,
    highlightZone: "market",
    lines: [
      "These are the relic technologies your civilization can incorporate — Artifact cards in three tiers, from foundational components to civilization-defining works.",
      "Each Artifact permanently bonds an affinity to your civilization's infrastructure. The most significant ones carry Eminence — the measure of your civilization's ascension.",
      "When your civilization expresses an affinity path with enough depth, a Luminary archetype stirs and answers. That is when things become legendary.",
    ],
    advance: { type: "click" },
  },
  // 5 — Filter controls (new beat)
  {
    position: "filters",
    phase: 1,
    highlightZone: "filters",
    objective: "Objective: use the filters",
    lines: [
      "See those three labels above the market — Printed, Discounted, and Needed?",
      "Discounted shows costs after your permanent affinity depth: the Artifacts your civilization is already closer to shaping.",
      "Needed shows only what you still lack right now. It's the fastest way to see which Artifacts are within reach this turn.",
    ],
    advance: { type: "click" },
  },
  // 6 — Reserve instruction (wait for action)
  {
    position: "market",
    phase: 1,
    highlightZone: "market",
    objective: "Objective: reserve an Artifact",
    lines: [
      "Tap any Artifact to examine it. You can Forge it into your civilization now, or Reserve it — securing it and receiving a Singularity current as the cosmos rewards your foresight.",
      "Reserve one now. Tap any Artifact in the market and hit Reserve.",
    ],
    advance: { type: "action", actions: ["reserve_card"] },
  },
  // 7 — Post-reserve
  {
    position: "market",
    phase: 1,
    lines: [
      "Good. That Artifact is held within your civilization — no other civilization can claim it.",
      "It waits until your affinity currents are sufficient to Forge it. You also received a Singularity current — the cosmos rewards decisive action.",
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
      "Now Forge. Artifacts with green costs are within your civilization's current reach. Tap one and hit Forge Artifact.",
      "Every Forged Artifact becomes permanent infrastructure — it deepens your affinity in that path, making future relic technologies of that kind easier to incorporate.",
    ],
    advance: { type: "action", actions: ["purchase_card"] },
  },
  // 9 — Luminaries intro
  {
    position: "luminaries",
    phase: 1,
    highlightZone: "luminaries",
    lines: [
      "Look up. Those are the Luminaries — cosmic archetypes that exist beyond ordinary civilization, each one a survival philosophy made manifest.",
      "When your civilization expresses an affinity path with enough depth, the corresponding Luminary stirs and emerges — and your civilization receives a surge of Eminence.",
      "A Luminary of one affinity brings 2 Eminence; dual-affinity brings 3; triple-affinity, 4. They are the turning points of ascension. Let me show you one.",
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
    objective: "Objective: forge your reserved Artifact",
    lines: [
      "You have a Verdance Artifact reserved — it costs Abyss and Radiance currents, and your civilization holds both.",
      "Open your Reserved cards (tap the card icon button, or find it in your hand) and Forge it. The Verdant Oracle is waiting.",
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

export const LUMY_BEAT_COUNT = BEATS.length;

export const LUMY_BEAT_GATES: Record<number, string[]> = {
  0: [],
  1: [],
  2: ["take_three_crystals", "take_two_crystals"],
  3: ["take_three_crystals", "take_two_crystals"],
  4: [],
  5: [],
  6: ["reserve_card"],
  7: [],
  8: ["purchase_card"],
  9: [],
  10: ["tutorial_fast_forward"],
  11: [],
  12: ["purchase_reserved"],
  13: [],
};

export const LUMY_ZONE_HIGHLIGHTS: Partial<Record<number, "harvest" | "market" | "filters" | "luminaries">> = {
  1: "harvest",
  2: "harvest",
  3: "harvest",
  4: "market",
  5: "filters",
  6: "market",
  7: "market",
  8: "market",
  9: "luminaries",
  12: "market",
};

// ─── Tutorial attention states ────────────────────────────────────────────────

export type LumiiAttentionState = "listening" | "look_here" | "action";

/** Per-beat attention state. Used by game.tsx to modulate highlight intensity
 *  and by the tutorial component to drive the dim overlay and orb excitement. */
export const LUMY_ATTENTION: Record<number, LumiiAttentionState> = {
  0: "listening",   // intro — Lumii explains the cosmos
  1: "look_here",   // affinity well intro — showing the well
  2: "action",      // first harvest — waiting for player action
  3: "action",      // second harvest — waiting for player action
  4: "look_here",   // market intro — showing the market
  5: "look_here",   // filters — click to continue
  6: "action",      // reserve — waiting for player action
  7: "look_here",   // post-reserve explanation
  8: "action",      // forge — waiting for player action
  9: "look_here",   // luminaries intro — showing luminaries + eminence
  10: "listening",  // fast-forward transition
  11: "listening",  // endgame intro
  12: "action",     // endgame forge — waiting for player action
  13: "listening",  // completion celebration
};

// ─── Nudge messages — shown when a blocked action is attempted ────────────────

const NUDGE_MESSAGES: Partial<Record<number, string>> = {
  2: "Select affinity currents from the Affinity Well below, then tap Harness.",
  3: "Draw more currents from the Affinity Well, then tap Harness.",
  5: "Explore the Discounted and Needed filters above the market, then tap to continue.",
  6: "Tap any Artifact card in the market, then tap Reserve to hold it.",
  8: "Tap an affordable Artifact (green costs shown) and hit Forge Artifact.",
  12: "Find your reserved card in your hand and tap Forge Artifact.",
};

// ─── Position helpers ─────────────────────────────────────────────────────────

type LayoutVariant = "above" | "below" | "left" | "right";

interface PositionStyle {
  fixed: React.CSSProperties;
  layout: LayoutVariant;
  tether?: "down" | "left" | "up";
}

function getPositionStyle(pos: BeatPosition): PositionStyle {
  switch (pos) {
    case "harvest":
      return { fixed: { bottom: 156, left: 14 }, layout: "above", tether: "down" };
    case "market":
    case "filters":
      return { fixed: { top: "44%", right: 12, transform: "translateY(-50%)" }, layout: "left", tether: "left" };
    case "luminaries":
      // Position below the luminary panel header — tether flows up toward the cards
      return { fixed: { top: 88, left: "50%", transform: "translateX(-50%)" }, layout: "below", tether: "down" };
    case "center":
    default:
      return { fixed: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" }, layout: "below" };
  }
}

// Slide-in offset when a new beat enters — gives the illusion of Lumii travelling
// from the previous position to the current one.
const POSITION_VECTOR: Record<BeatPosition, [number, number]> = {
  center:    [0,   14],
  harvest:   [-22, 18],
  market:    [22,  0],
  filters:   [22,  0],
  luminaries:[0,  -18],
};

function getEntryOffset(from: BeatPosition): { x: number; y: number } {
  const [x, y] = POSITION_VECTOR[from] ?? [0, 14];
  return { x, y };
}

function LumyLayout({
  layout,
  orb,
  bubble,
  tether,
}: {
  layout: LayoutVariant;
  orb: React.ReactNode;
  bubble: React.ReactNode;
  tether?: React.ReactNode;
}) {
  if (layout === "above") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {bubble}
        {orb}
        {tether}
      </div>
    );
  }
  if (layout === "below") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {orb}
        {tether}
        {bubble}
      </div>
    );
  }
  if (layout === "left") {
    return (
      <div style={{ display: "flex", flexDirection: "row-reverse", alignItems: "flex-start", gap: 10 }}>
        {orb}
        {tether}
        {bubble}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
      {orb}
      {tether}
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
}

export function LumyTutorial({
  state,
  sessionPlayerId,
  tutorialStep,
  setTutorialStep,
  executeAction,
  nudgeTick = 0,
}: Props) {
  const [, setLocation] = useLocation();
  const [lineIdx, setLineIdx] = useState(0);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [nudgeText, setNudgeText] = useState<string | null>(null);
  const prevLogLenRef = useRef(0);
  const ffTriggeredRef = useRef(false);
  const lumyPanelRef = useRef<HTMLDivElement | null>(null);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the previous beat's position so the next beat can slide in from that direction
  const prevPositionRef = useRef<BeatPosition>("center");

  const beat = BEATS[tutorialStep] ?? null;
  const currentAttention = LUMY_ATTENTION[tutorialStep] ?? "listening";

  useEffect(() => {
    document.documentElement.style.setProperty("--tutorial-panel-height", "0px");
    return () => {
      document.documentElement.style.removeProperty("--tutorial-panel-height");
    };
  }, []);

  useEffect(() => {
    setLineIdx(0);
  }, [tutorialStep]);

  // Show nudge when a blocked action is signalled from game.tsx
  useEffect(() => {
    if (nudgeTick === 0) return;
    const msg = NUDGE_MESSAGES[tutorialStep];
    if (!msg) return;
    setNudgeText(msg);
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => setNudgeText(null), 2800);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nudgeTick]);

  // Record the departing beat's position AFTER it has rendered, so the incoming
  // beat can use it to compute its directional slide-in offset.
  useEffect(() => {
    prevPositionRef.current = beat?.position ?? "center";
  }, [beat?.position]);

  const advanceBeat = useCallback(() => {
    const next = tutorialStep + 1;
    if (next >= BEATS.length) {
      setShowCompletion(true);
    } else {
      setTutorialStep(next);
    }
  }, [tutorialStep, setTutorialStep]);

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

  useEffect(() => {
    if (!beat || beat.advance.type !== "action") return;
    if (!state?.actionLog?.length) return;
    const logLen = state.actionLog.length;
    if (logLen <= prevLogLenRef.current) return;
    prevLogLenRef.current = logLen;
    const lastAction = state.lastAction as { type?: string; playerId?: string } | null;
    if (!lastAction?.type || lastAction.playerId !== sessionPlayerId) return;
    if (beat.advance.actions.includes(lastAction.type)) {
      advanceBeat();
    }
  }, [state?.actionLog?.length, beat, sessionPlayerId, advanceBeat]);

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
  const posStyle = beat ? getPositionStyle(beat.position) : getPositionStyle("center");
  const tetherEl = posStyle.tether ? <TetherBeam direction={posStyle.tether} /> : undefined;
  const entryOffset = getEntryOffset(prevPositionRef.current);

  return (
    <>
      {/* ── Listening-state background dim — independent of beat lifecycle ── */}
      <motion.div
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 485, background: "black" }}
        animate={{ opacity: !showCompletion && !isFastForwarding && currentAttention === "listening" ? 0.34 : 0 }}
        transition={{ duration: 0.55 }}
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
              <LumyOrb size={80} excited />
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
                <LumyOrb size={68} excited />
              </motion.div>
              <h2 className="text-xl font-bold font-serif mb-1">Your civilization is ready.</h2>
              <p className="text-sm text-muted-foreground mb-4">
                You've seen the full arc of ascension in Luminae.
              </p>
              <ul className="text-left text-sm space-y-2 mb-5">
                {[
                  "Harnessing affinity currents from the Affinity Well",
                  "Reserving Artifacts to hold them for your civilization",
                  "Forging relic technologies as permanent infrastructure",
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

      {/* ── Lumy orb + speech bubble ── */}
      <AnimatePresence mode="wait">
        {beat && !showCompletion && !isFastForwarding && (
          <motion.div
            key={`beat-${tutorialStep}`}
            ref={lumyPanelRef}
            initial={{ opacity: 0, x: entryOffset.x, y: entryOffset.y, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.88 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed z-[500] pointer-events-none"
            style={posStyle.fixed}
          >
            <LumyLayout
              layout={posStyle.layout}
              tether={tetherEl}
              orb={
                <motion.div
                  animate={{ y: [0, -9, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <LumyOrb size={72} excited={currentAttention === "action" || (currentPhase === 2 && tutorialStep === BEATS.length - 1)} />
                </motion.div>
              }
              bubble={
                <div className="relative">
                  <AnimatePresence mode="wait">
                    <LumyBubble
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
                        transition={{ duration: 0.2 }}
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
        )}
      </AnimatePresence>

      {/* ── Skip button ── */}
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

      {/* ── Phase 2 scene label ── */}
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
    </>
  );
}
