import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { consumePendingStartBeat } from "@/lib/tutorialStartBeat";
import { loadTutorialProgress, clearTutorialProgress } from "@/lib/tutorialProgress";
import { TutorialDirector } from "@/components/tutorial/TutorialDirector";
import { TutorialStartModal } from "@/components/tutorial/TutorialStartModal";
import { TUTORIAL_BEATS } from "@/lib/tutorialData";

type Phase = "prompt" | "playing";

export default function Tutorial() {
  const [, navigate] = useLocation();

  // Consume any programmatically-set beat (e.g. from a deep-link or dev tool).
  // This runs once per mount; if set it skips the resume prompt entirely.
  const pendingBeat = consumePendingStartBeat();

  const savedBeat = loadTutorialProgress();
  const hasMidProgress =
    savedBeat !== null &&
    savedBeat > 0 &&
    savedBeat < TUTORIAL_BEATS.length - 1;

  // If a beat was programmatically queued, go straight to playing.
  // If there's mid-tutorial progress, show the resume prompt first.
  // Otherwise, start playing from beat 0 immediately.
  const [phase, setPhase] = useState<Phase>(
    pendingBeat != null || !hasMidProgress ? "playing" : "prompt"
  );
  const [startBeat, setStartBeat] = useState<number | undefined>(
    pendingBeat ?? undefined
  );

  function handleChoice(choice: "begin" | "resume" | "start-over" | "cancel") {
    if (choice === "resume") {
      setStartBeat(savedBeat!);
      setPhase("playing");
    } else if (choice === "start-over") {
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

  if (phase === "prompt") {
    return (
      <TutorialStartModal
        hasProgress={hasMidProgress}
        savedBeat={savedBeat ?? undefined}
        totalBeats={TUTORIAL_BEATS.length}
        onChoice={handleChoice}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, filter: "blur(14px)" }}
      animate={{ opacity: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ height: "100%", display: "contents" }}
    >
      <TutorialDirector startBeat={startBeat} />
    </motion.div>
  );
}
