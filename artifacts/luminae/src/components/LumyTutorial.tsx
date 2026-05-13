import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { X, ArrowRight, Sparkles } from "lucide-react";
import type { GameState } from "@workspace/api-client-react";
import { clearSession } from "@/lib/session";

// ─── Lumy Orb ────────────────────────────────────────────────────────────────

function LumyOrb({ size = 72, excited = false }: { size?: number; excited?: boolean }) {
  return (
    <div style={{ width: size, height: size, position: "relative" }}>
      {/* Rotating colour aura */}
      <motion.div
        animate={{ scale: excited ? [1, 1.18, 1.05] : [1, 1.12, 1], opacity: [0.45, 0.8, 0.45] }}
        transition={{ duration: excited ? 1.6 : 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          position: "absolute",
          inset: "-38%",
          borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, #f97316, #3b82f6, #22c55e, #a855f7, #e2e8f0, #fbbf24, #f97316)",
          filter: "blur(18px)",
          opacity: 0.55,
        }}
      />
      {/* Main orb body — slowly rotating conic gradient */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: excited ? 3.5 : 7, repeat: Infinity, ease: "linear" }}
        style={{
          width: "100%",
          height: "100%",
          borderRadius: "50%",
          background:
            "conic-gradient(from 0deg, #f97316 0deg, #fbbf24 60deg, #22c55e 120deg, #3b82f6 180deg, #a855f7 240deg, #e2e8f0 300deg, #f97316 360deg)",
        }}
      />
      {/* Inner frosted shine — static, gives depth */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "12%",
          width: "44%",
          height: "38%",
          borderRadius: "50%",
          background:
            "radial-gradient(circle at 38% 38%, rgba(255,255,255,0.88) 0%, rgba(255,255,255,0) 100%)",
          pointerEvents: "none",
        }}
      />
      {/* Eyes */}
      <div
        style={{
          position: "absolute",
          top: "40%",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          gap: Math.round(size * 0.12),
          alignItems: "center",
        }}
      >
        <motion.div
          animate={excited ? { scaleY: [1, 0.15, 1] } : { scaleY: 1 }}
          transition={{ duration: 0.18, repeat: excited ? Infinity : 0, repeatDelay: 1.4 }}
          style={{
            width: Math.max(5, Math.round(size * 0.1)),
            height: Math.max(7, Math.round(size * 0.13)),
            borderRadius: "50%",
            background: "rgba(0,0,0,0.75)",
          }}
        />
        <motion.div
          animate={excited ? { scaleY: [1, 0.15, 1] } : { scaleY: 1 }}
          transition={{ duration: 0.18, repeat: excited ? Infinity : 0, repeatDelay: 1.4, delay: 0.04 }}
          style={{
            width: Math.max(5, Math.round(size * 0.1)),
            height: Math.max(7, Math.round(size * 0.13)),
            borderRadius: "50%",
            background: "rgba(0,0,0,0.75)",
          }}
        />
      </div>
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
  onClick: () => void;
}

function LumyBubble({ text, isActionBeat, isLastLine, isFfBeat, phase, onClick }: BubbleProps) {
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
        background:
          phase === 2
            ? "rgba(20, 12, 36, 0.96)"
            : "rgba(10, 16, 36, 0.96)",
        backdropFilter: "blur(12px)",
        padding: "12px 14px 10px",
      }}
    >
      {/* Name badge */}
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="h-3 w-3 text-amber-300/80" />
        <span
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{
            background: "linear-gradient(90deg, #f97316, #fbbf24, #22c55e, #3b82f6, #a855f7)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Lumy
        </span>
        {phase === 2 && (
          <span className="ml-1 text-[9px] font-semibold uppercase tracking-wider text-emerald-400/80 border border-emerald-500/30 rounded-full px-1.5 py-0.5">
            Endgame
          </span>
        )}
      </div>

      {/* Dialogue text */}
      <p className="text-[13px] text-white/92 leading-relaxed mb-2.5">{text}</p>

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

type BeatPosition = "center" | "harvest" | "market" | "luminaries";
type BeatAdvance =
  | { type: "click" }
  | { type: "action"; actions: string[] }
  | { type: "fast_forward" };

interface Beat {
  position: BeatPosition;
  lines: string[];
  advance: BeatAdvance;
  highlightZone?: "market" | "luminaries";
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
    lines: [
      "Your turn! Tap 3 different affinity currents from the Well to draw them into your civilization, then tap Harness to claim them.",
    ],
    advance: { type: "action", actions: ["take_three_crystals", "take_two_crystals"] },
  },
  // 3 — Second harvest
  {
    position: "harvest",
    phase: 1,
    lines: [
      "Your civilization deepens its reach. Do it again — draw 3 different currents, or 2 of the same if there are 4 or more of that current available in the Well.",
    ],
    advance: { type: "action", actions: ["take_three_crystals", "take_two_crystals"] },
  },
  // 4 — Market intro
  {
    position: "market",
    phase: 1,
    lines: [
      "These are the relic technologies your civilization can incorporate — Artifact cards in three tiers, from foundational components to civilization-defining works.",
      "Each Artifact permanently bonds an affinity to your civilization's infrastructure. The most significant ones carry Eminence — the measure of your civilization's ascension.",
      "When your civilization expresses an affinity path with enough depth, a Luminary archetype stirs and answers. That is when things become legendary.",
    ],
    advance: { type: "click" },
    highlightZone: "market",
  },
  // 5 — Reserve instruction (wait for action)
  {
    position: "market",
    phase: 1,
    lines: [
      "Tap any Artifact to examine it. You can Forge it into your civilization now, or Reserve it — securing it and receiving a Singularity current as the cosmos rewards your foresight.",
      "Reserve one now. Tap any Artifact in the market and hit Reserve.",
    ],
    advance: { type: "action", actions: ["reserve_card"] },
    highlightZone: "market",
  },
  // 6 — Post-reserve
  {
    position: "market",
    phase: 1,
    lines: [
      "Good. That Artifact is held within your civilization — no other civilization can claim it.",
      "It waits until your affinity currents are sufficient to Forge it. You also received a Singularity current — the cosmos rewards decisive action.",
    ],
    advance: { type: "click" },
  },
  // 7 — Forge instruction (wait for action)
  {
    position: "market",
    phase: 1,
    lines: [
      "Now Forge. Artifacts with green costs are within your civilization's current reach. Tap one and hit Forge Artifact.",
      "Every Forged Artifact becomes permanent infrastructure — it deepens your affinity in that path, making future relic technologies of that kind easier to incorporate.",
    ],
    advance: { type: "action", actions: ["purchase_card"] },
    highlightZone: "market",
  },
  // 8 — Luminaries intro
  {
    position: "luminaries",
    phase: 1,
    lines: [
      "Look up. Those are the Luminaries — cosmic archetypes that exist beyond ordinary civilization, each one a survival philosophy made manifest.",
      "When your civilization expresses an affinity path with enough depth, the corresponding Luminary stirs and emerges — and your civilization receives a surge of Eminence.",
      "A Luminary of one affinity brings 2 Eminence; dual-affinity brings 3; triple-affinity, 4. They are the turning points of ascension. Let me show you one.",
    ],
    advance: { type: "click" },
    highlightZone: "luminaries",
  },
  // 9 — Fast-forward trigger
  {
    position: "center",
    phase: 1,
    lines: [
      "I'm going to skip us ahead — several turns of development, so you can witness what a civilization on the edge of legend actually looks like. ⏩",
    ],
    advance: { type: "fast_forward" },
  },
  // 10 — Endgame intro (Phase 2)
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
  // 11 — Endgame forge instruction (wait for action)
  {
    position: "market",
    phase: 2,
    lines: [
      "You have a Verdance Artifact reserved — it costs Abyss and Radiance currents, and your civilization holds both.",
      "Open your Reserved cards (tap the card icon button, or find it in your hand) and Forge it. The Verdant Oracle is waiting.",
    ],
    advance: { type: "action", actions: ["purchase_reserved"] },
  },
  // 12 — Completion celebration
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

// Maps each beat index to the action types allowed by the tutorial gate in game.tsx.
// Exported so game.tsx can use it directly.
export const LUMY_BEAT_GATES: Record<number, string[]> = {
  0: [],
  1: [],
  2: ["take_three_crystals", "take_two_crystals"],
  3: ["take_three_crystals", "take_two_crystals"],
  4: [],
  5: ["reserve_card"],
  6: [],
  7: ["purchase_card"],
  8: [],
  9: ["tutorial_fast_forward"],
  10: [],
  11: ["purchase_reserved"],
  12: [],
};

// ─── Position helpers ─────────────────────────────────────────────────────────

type LayoutVariant = "above" | "below" | "left" | "right";

interface PositionStyle {
  fixed: React.CSSProperties;
  layout: LayoutVariant;
}

function getPositionStyle(pos: BeatPosition): PositionStyle {
  switch (pos) {
    case "harvest":
      return {
        fixed: { bottom: 156, left: 14 },
        layout: "above",
      };
    case "market":
      return {
        fixed: { top: "44%", right: 12, transform: "translateY(-50%)" },
        layout: "left",
      };
    case "luminaries":
      return {
        fixed: { top: 112, left: "50%", transform: "translateX(-50%)" },
        layout: "below",
      };
    case "center":
    default:
      return {
        fixed: { top: "50%", left: "50%", transform: "translate(-50%, -50%)" },
        layout: "below",
      };
  }
}

function LumyLayout({
  layout,
  orb,
  bubble,
}: {
  layout: LayoutVariant;
  orb: React.ReactNode;
  bubble: React.ReactNode;
}) {
  if (layout === "above") {
    return (
      <div className="flex flex-col-reverse items-center gap-2">
        {orb}
        {bubble}
      </div>
    );
  }
  if (layout === "below") {
    return (
      <div className="flex flex-col items-center gap-2">
        {orb}
        {bubble}
      </div>
    );
  }
  if (layout === "left") {
    return (
      <div className="flex flex-row-reverse items-start gap-2.5">
        {orb}
        {bubble}
      </div>
    );
  }
  // right
  return (
    <div className="flex flex-row items-start gap-2.5">
      {orb}
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
}

export function LumyTutorial({
  state,
  sessionPlayerId,
  tutorialStep,
  setTutorialStep,
  executeAction,
}: Props) {
  const [, setLocation] = useLocation();
  const [lineIdx, setLineIdx] = useState(0);
  const [isFastForwarding, setIsFastForwarding] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const prevLogLenRef = useRef(0);
  const ffTriggeredRef = useRef(false);
  const lumyPanelRef = useRef<HTMLDivElement | null>(null);

  const beat = BEATS[tutorialStep] ?? null;

  // Zero out the panel-height CSS variable so board content doesn't add
  // unnecessary padding (Lumy floats freely rather than using a fixed panel).
  useEffect(() => {
    document.documentElement.style.setProperty("--tutorial-panel-height", "0px");
    return () => {
      document.documentElement.style.removeProperty("--tutorial-panel-height");
    };
  }, []);

  // Reset line index whenever the beat changes
  useEffect(() => {
    setLineIdx(0);
  }, [tutorialStep]);

  // ── Advance helpers ──
  const advanceBeat = useCallback(() => {
    const next = tutorialStep + 1;
    if (next >= BEATS.length) {
      setShowCompletion(true);
    } else {
      setTutorialStep(next);
    }
  }, [tutorialStep, setTutorialStep]);

  // ── Click / tap handler ──
  const handleClick = useCallback(() => {
    if (!beat || showCompletion || isFastForwarding) return;

    if (lineIdx < beat.lines.length - 1) {
      // More lines remain in this beat
      setLineIdx((l) => l + 1);
      return;
    }

    // On last line: advance based on beat type
    if (beat.advance.type === "click") {
      advanceBeat();
    } else if (beat.advance.type === "fast_forward") {
      triggerFastForward();
    }
    // "action" beats: clicking does nothing — player must complete the action
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beat, lineIdx, advanceBeat, showCompletion, isFastForwarding]);

  // ── Watch actionLog for action-beat completion ──
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

  // ── Fast-forward trigger ──
  const triggerFastForward = useCallback(async () => {
    if (ffTriggeredRef.current) return;
    ffTriggeredRef.current = true;
    setIsFastForwarding(true);
    try {
      await executeAction({ type: "tutorial_fast_forward" });
    } catch {
      // If the action fails, unblock
      ffTriggeredRef.current = false;
      setIsFastForwarding(false);
    }
  }, [executeAction]);

  // ── Watch for fast-forward state to arrive (lumens jumps to 13) ──
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

  // ── Auto-advance to completion when game finishes (win) during endgame ──
  useEffect(() => {
    if (state?.status === "finished" && tutorialStep >= 10 && tutorialStep < BEATS.length - 1) {
      // Let beat 11→12 advance naturally via actionLog, but if game ends first, jump to completion
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

  // ── Skip handlers ──
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

  return (
    <>
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
            {/* Lumy spins in the center while time passes */}
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
              {/* Lumy celebration */}
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed z-[500] pointer-events-none"
            style={posStyle.fixed}
          >
            <LumyLayout
              layout={posStyle.layout}
              orb={
                <motion.div
                  animate={{ y: [0, -9, 0] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                >
                  <LumyOrb size={72} excited={currentPhase === 2 && tutorialStep === BEATS.length - 1} />
                </motion.div>
              }
              bubble={
                <AnimatePresence mode="wait">
                  <LumyBubble
                    key={`${tutorialStep}-${lineIdx}`}
                    text={beat.lines[lineIdx] ?? beat.lines[0] ?? ""}
                    isActionBeat={isActionBeat}
                    isLastLine={isLastLine}
                    isFfBeat={isFfBeat}
                    phase={currentPhase}
                    onClick={handleClick}
                  />
                </AnimatePresence>
              }
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Skip button (always visible during active tutorial) ── */}
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
        {currentPhase === 2 && !showCompletion && !isFastForwarding && tutorialStep >= 10 && (
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
