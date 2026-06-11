import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { X, ChevronRight, BookOpen } from "lucide-react";
import type { GameState } from "@workspace/api-client-react";
import { clearSession } from "@/lib/session";
import { useFocusTrap } from "@/hooks/use-focus-trap";

interface TutorialStep {
  id: number;
  title: string;
  instruction: string;
  actionHint: string;
  zone: "harvest" | "market" | "hand" | "luminaries" | null;
  permittedActionTypes: string[];
  requiresConfirm: boolean;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 0,
    title: "Step 1 of 5 — Harvest Affinities",
    instruction:
      "Affinities are the core currency of Luminae. On your turn, tap 3 different affinity crystals in the bank below, then tap Harness to collect them.",
    actionHint: "Tap 3 different gem icons, then tap Harness",
    zone: "harvest",
    permittedActionTypes: ["take_three_crystals"],
    requiresConfirm: false,
  },
  {
    id: 1,
    title: "Step 2 of 5 — Harvest Again",
    instruction:
      "You can also harvest 2 of the same affinity if there are 4 or more in the bank. Try harvesting again — 2 of the same or 3 different.",
    actionHint: "Tap crystals to build your harvest, then tap Harness",
    zone: "harvest",
    permittedActionTypes: ["take_two_crystals", "take_three_crystals"],
    requiresConfirm: false,
  },
  {
    id: 2,
    title: "Step 3 of 5 — Encrypt a Card",
    instruction:
      "Tap any Artifact card in the market, then tap Encrypt. Encrypting holds the card so no one else can take it, and gives you 1 Singularity (wild) crystal.",
    actionHint: "Tap a market card, then tap Encrypt for later",
    zone: "market",
    permittedActionTypes: ["reserve_card"],
    requiresConfirm: false,
  },
  {
    id: 3,
    title: "Step 4 of 5 — Forge an Artifact",
    instruction:
      "Forging a card spends your affinities to permanently claim it. Forged cards give you a permanent discount on future purchases. Tap an affordable card (costs shown in green) and tap Forge.",
    actionHint: "Tap an affordable card, then tap Forge Artifact",
    zone: "market",
    permittedActionTypes: ["purchase_card", "purchase_reserved"],
    requiresConfirm: false,
  },
  {
    id: 4,
    title: "Step 5 of 5 — Meet the Luminaries",
    instruction:
      "The top row shows Luminaries — cosmic patrons granting bonus Eminence. Each shows the artifact bonuses required to claim them. The first player whose collection meets those requirements wins the patron automatically. Race to 15 Eminence to win!",
    actionHint: "Read the above, then tap Got it to begin playing",
    zone: "luminaries",
    permittedActionTypes: [],
    requiresConfirm: true,
  },
];

export const TUTORIAL_STEP_COUNT = TUTORIAL_STEPS.length;

interface Props {
  state: GameState | null | undefined;
  sessionPlayerId: string;
  tutorialStep: number;
  setTutorialStep: (step: number) => void;
}

export function TutorialOverlay({
  state,
  sessionPlayerId,
  tutorialStep,
  setTutorialStep,
}: Props) {
  const [, setLocation] = useLocation();
  const [showCompletion, setShowCompletion] = useState(false);
  const [showSkipConfirm, setShowSkipConfirm] = useState(false);
  const prevLogLenRef = useRef(0);
  const innerPanelRef = useRef<HTMLDivElement | null>(null);
  const skipConfirmRef = useRef<HTMLElement | null>(null);
  const completionRef = useRef<HTMLElement | null>(null);

  const step = TUTORIAL_STEPS[tutorialStep] ?? null;

  const panelVisible = tutorialStep >= 0 && tutorialStep < TUTORIAL_STEPS.length && !!step && !showCompletion;

  // Keep --tutorial-panel-height CSS variable in sync with the rendered panel height.
  // This lets layout-aware siblings (card sheet, board scroll area) add bottom clearance
  // so the tutorial panel never obscures actionable buttons.
  useEffect(() => {
    const el = innerPanelRef.current;
    if (!el || !panelVisible) {
      document.documentElement.style.removeProperty('--tutorial-panel-height');
      return;
    }
    const update = () => {
      const cardHeight = el.offsetHeight;
      // mb-3 (12 px) bottom margin + safe-area-inset-bottom
      document.documentElement.style.setProperty(
        '--tutorial-panel-height',
        `calc(${cardHeight + 12}px + env(safe-area-inset-bottom, 0px))`,
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      document.documentElement.style.removeProperty('--tutorial-panel-height');
    };
  }, [panelVisible]);

  // Detect step completion by watching action log
  useEffect(() => {
    if (tutorialStep < 0 || tutorialStep >= 4) return;
    if (!state?.actionLog?.length) return;

    const logLen = state.actionLog.length;
    if (logLen <= prevLogLenRef.current) return;
    prevLogLenRef.current = logLen;

    const lastEntry = state.actionLog[logLen - 1];
    if (!lastEntry) return;
    // Filter out any entry not authored by the session player (e.g. AI claim_luminary)
    if (lastEntry.playerId !== sessionPlayerId) return;

    // Also guard on lastAction.playerId so that if state.lastAction reflects an AI
    // action (e.g. claim_luminary from an AI-claimed Luminary that arrived in the
    // same state snapshot), we do not mistakenly use it to advance a tutorial step.
    const lastAction = state.lastAction;
    if (!lastAction || lastAction['playerId'] !== sessionPlayerId) return;

    const lastActionType = lastAction['type'] as string | undefined;
    const currentStep = TUTORIAL_STEPS[tutorialStep];
    if (!currentStep) return;

    if (lastActionType && currentStep.permittedActionTypes.includes(lastActionType)) {
      const nextStep = tutorialStep + 1;
      if (nextStep >= TUTORIAL_STEPS.length) {
        setShowCompletion(true);
        setTutorialStep(TUTORIAL_STEPS.length);
      } else {
        setTutorialStep(nextStep);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.actionLog?.length, tutorialStep, sessionPlayerId, setTutorialStep]);

  // Auto-advance when game ends mid-tutorial
  useEffect(() => {
    if (state?.status === "finished" && tutorialStep >= 0 && tutorialStep < TUTORIAL_STEPS.length) {
      setShowCompletion(true);
      setTutorialStep(TUTORIAL_STEPS.length);
    }
  }, [state?.status, tutorialStep, setTutorialStep]);

  const handleSkip = () => {
    setShowSkipConfirm(false);
    localStorage.setItem("luminae_tutorial_seen", "1");
    setTutorialStep(-1);
    clearSession();
    setLocation("/");
  };

  const handleGotIt = () => {
    setShowCompletion(true);
    setTutorialStep(TUTORIAL_STEPS.length);
  };

  const handleFinish = () => {
    localStorage.setItem("luminae_tutorial_seen", "1");
    setTutorialStep(-1);
    clearSession();
    setLocation("/");
  };

  // Focus traps — placed after callback definitions so they are valid references.
  // Escape on skip-confirm = dismiss (keep learning); Escape on completion = finish.
  useFocusTrap(skipConfirmRef, showSkipConfirm, () => setShowSkipConfirm(false));
  useFocusTrap(completionRef, showCompletion, handleFinish);

  if (tutorialStep < 0) return null;

  const isActive = tutorialStep >= 0 && tutorialStep < TUTORIAL_STEPS.length;
  const stepNumber = tutorialStep + 1;
  const progressPct = Math.min(100, (tutorialStep / TUTORIAL_STEPS.length) * 100);

  return (
    <>
      {/* Skip confirm modal */}
      <AnimatePresence>
        {showSkipConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 px-5"
          >
            <motion.div
              ref={(el) => { skipConfirmRef.current = el; }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="skip-confirm-title"
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/98 p-6 shadow-2xl"
            >
              <h2 id="skip-confirm-title" className="text-lg font-bold mb-2">Skip the tutorial?</h2>
              <p className="text-sm text-muted-foreground mb-5">
                You'll be taken back to the home screen. You can always start a normal game from there.
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

      {/* Completion overlay */}
      <AnimatePresence>
        {showCompletion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 px-5"
          >
            <motion.div
              ref={(el) => { completionRef.current = el; }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="completion-title"
              initial={{ scale: 0.88, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
              className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-950/98 p-6 shadow-2xl text-center"
            >
              <div className="text-4xl mb-3">🎉</div>
              <h2 id="completion-title" className="text-xl font-bold font-serif mb-2">You're ready!</h2>
              <p className="text-sm text-muted-foreground mb-5">
                You've learned the core mechanics of Luminae:
              </p>
              <ul className="text-left text-sm space-y-2 mb-6">
                {[
                  "Harvesting affinities (3 different or 2 of the same)",
                  "Encrypting cards to hold them for later",
                  "Forging Artifacts for permanent bonuses",
                  "Claiming Luminaries by meeting their requirements",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-primary shrink-0 mt-0.5">✓</span>
                    <span className="text-muted-foreground">{item}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground mb-5">
                You can re-enable in-game hints any time from the{" "}
                <span className="font-semibold text-foreground">How to Play</span>{" "}
                sheet inside a game.
              </p>
              <button
                type="button"
                onClick={handleFinish}
                className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold text-base hover:bg-primary/90 transition-colors"
              >
                Start a real game →
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step instruction panel — fixed at bottom */}
      <AnimatePresence mode="wait">
        {isActive && step && !showCompletion && (
          <motion.div
            key={tutorialStep}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 340, damping: 26 }}
            className="fixed left-0 right-0 z-[200]"
            style={{ bottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            <div ref={innerPanelRef} className="mx-3 mb-3 rounded-2xl border border-white/10 bg-slate-950/96 shadow-2xl shadow-black/60 overflow-hidden backdrop-blur-md">
              {/* Progress bar */}
              <div className="h-0.5 bg-white/5">
                <motion.div
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>

              <div className="px-4 pt-3 pb-4">
                {/* Header row */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-bold text-primary">{stepNumber}</span>
                    </div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-primary/80">
                      {step.title.split(" — ")[1] ?? step.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSkipConfirm(true)}
                    className="shrink-0 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-lg hover:bg-white/5"
                  >
                    <X className="h-3 w-3" />
                    Skip
                  </button>
                </div>

                {/* Instruction */}
                <p className="text-sm text-white/90 leading-relaxed mb-3">
                  {step.instruction}
                </p>

                {/* Action hint pill */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                    <BookOpen className="h-3 w-3 text-primary/70 shrink-0" />
                    <span className="text-[11px] text-white/60">{step.actionHint}</span>
                  </div>
                  {step.requiresConfirm && (
                    <button
                      type="button"
                      onClick={handleGotIt}
                      className="shrink-0 flex items-center gap-1.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl px-4 py-1.5 hover:bg-primary/90 transition-colors"
                    >
                      Got it
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
