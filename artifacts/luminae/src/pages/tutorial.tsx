import { useState } from "react";
import { useLocation } from "wouter";
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
      setStartBeat(undefined);
      setPhase("playing");
    } else if (choice === "begin") {
      setStartBeat(undefined);
      setPhase("playing");
    } else {
      navigate("/");
    }
  }

  if (phase === "prompt") {
    return <TutorialStartModal hasProgress={hasMidProgress} onChoice={handleChoice} />;
  }

  return <TutorialDirector startBeat={startBeat} />;
}
