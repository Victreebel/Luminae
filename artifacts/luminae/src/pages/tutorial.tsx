import { useEffect, useState } from "react";
import { useEscapeToClose } from "@/hooks/use-escape-to-close";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { consumePendingStartBeat } from "@/lib/tutorialStartBeat";
import { loadTutorialProgress, loadTutorialProgressId, clearTutorialProgress, hasTutorialBeenCompleted } from "@/lib/tutorialProgress";
import { TutorialDirector } from "@/components/tutorial/TutorialDirector";
import { TutorialStartModal } from "@/components/tutorial/TutorialStartModal";
import { TUTORIAL_BEATS, resolveTutorialBeatIndex } from "@/lib/tutorialData";
import { useAccount } from "@/contexts/AccountContext";
import { AccountLoadingScreen } from "@/components/AccountLoadingScreen";
import { beginTutorialTelemetry, trackFirstPartyEvent } from "@/lib/firstPartyTelemetry";

type Phase = "prompt" | "playing";

export default function Tutorial() {
  const [, navigate] = useLocation();
  const { isLoading } = useAccount();
  const tutorialCompleted = hasTutorialBeenCompleted();

  // Consume any programmatically-set beat (e.g. from a deep-link or dev tool).
  // This runs once per mount; if set it skips the resume prompt entirely.
  const pendingBeat = consumePendingStartBeat();

  // Dev-only: ?beat=N URL param for instant beat verification via screenshots.
  // Stripped entirely in production by the import.meta.env.DEV guard.
  const urlBeat = import.meta.env.DEV
    ? (() => {
        const raw = new URLSearchParams(window.location.search).get("beat");
        if (raw === null) return null;
        const n = Number(raw);
        return Number.isFinite(n) && n >= 0 ? n : null;
      })()
    : null;

  const savedBeat = (() => {
    const rawIdx = loadTutorialProgress();
    if (rawIdx === null) return null;
    const savedId = loadTutorialProgressId();
    const migratedIndex = resolveTutorialBeatIndex(savedId);
    if (migratedIndex != null) return migratedIndex;
    return rawIdx;
  })();
  const hasMidProgress =
    savedBeat !== null &&
    savedBeat > 0 &&
    savedBeat < TUTORIAL_BEATS.length - 1;

  // If a beat was programmatically queued, go straight to playing.
  // If there's mid-tutorial progress, show the resume prompt first.
  // Otherwise, start playing from beat 0 immediately.
  const effectivePending = urlBeat ?? (pendingBeat != null ? pendingBeat : null);
  const [phase, setPhase] = useState<Phase>(
    effectivePending != null || (!hasMidProgress && !tutorialCompleted) ? "playing" : "prompt"
  );
  const [startBeat, setStartBeat] = useState<number | undefined>(
    effectivePending ?? undefined
  );

  useEffect(() => {
    beginTutorialTelemetry();
    trackFirstPartyEvent(
      { eventName: hasMidProgress ? "tutorial_resumed" : "tutorial_started" },
      `tutorial-entry:${hasMidProgress ? "resume" : "start"}`,
    );
  }, [hasMidProgress]);

  function handleChoice(choice: "begin" | "resume" | "start-over" | "cancel") {
    if (choice === "resume") {
      trackFirstPartyEvent({ eventName: "tutorial_resumed", outcome: "resume" });
      setStartBeat(savedBeat!);
      setPhase("playing");
    } else if (choice === "start-over") {
      trackFirstPartyEvent({ eventName: "tutorial_restarted", outcome: "start_over" });
      clearTutorialProgress();
      setStartBeat(0);   // explicit 0 bypasses the hasTutorialSeen() → shatter fallback
      setPhase("playing");
    } else if (choice === "begin") {
      setStartBeat(0);   // same: always start from beat 0 for a fresh run
      setPhase("playing");
    } else {
      navigate("/");
    }
  }

  function handleChapterSelect(beat: number) {
    clearTutorialProgress();
    setStartBeat(beat);
    setPhase("playing");
  }

  function handleReplay() {
    setStartBeat(undefined);
    setPhase("prompt");
  }

  useEscapeToClose([
    { isOpen: phase === "prompt", onClose: () => handleChoice("cancel") },
  ]);

  if (isLoading) return <AccountLoadingScreen />;

  if (phase === "prompt") {
    return (
      <TutorialStartModal
        hasProgress={hasMidProgress}
        savedBeat={savedBeat ?? undefined}
        totalBeats={TUTORIAL_BEATS.length}
        completed={tutorialCompleted}
        onChoice={handleChoice}
        onSelectChapter={handleChapterSelect}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0}}
      animate={{ opacity: 1}}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ height: "100%", display: "contents" }}
    >
      <TutorialDirector startBeat={startBeat} onReplay={handleReplay} />
    </motion.div>
  );
}
