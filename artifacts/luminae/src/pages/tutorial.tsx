import { useEffect, useState, type ReactNode } from "react";
import { useEscapeToClose } from "@/hooks/use-escape-to-close";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { consumePendingStartBeat } from "@/lib/tutorialStartBeat";
import {
  clearTutorialProgress,
  hasPendingTutorialCompletion,
  hasTutorialBeenCompleted,
  loadAuthenticatedTutorialInvestigationProgress,
  loadTutorialProgress,
  loadTutorialProgressId,
} from "@/lib/tutorialProgress";
import { TutorialDirector } from "@/components/tutorial/TutorialDirector";
import { TutorialStartModal } from "@/components/tutorial/TutorialStartModal";
import { LoginRegisterForm } from "@/components/LoginRegisterForm";
import { TUTORIAL_BEATS, BEAT_INDEX } from "@/lib/tutorialData";
import { useAccount } from "@/contexts/AccountContext";
import { AccountLoadingScreen } from "@/components/AccountLoadingScreen";
import type { TutorialInvestigationProgress } from "@workspace/game-types";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";

type Phase = "prompt" | "playing";

export function resolveTutorialPreviewBeat(
  params: URLSearchParams,
  isDevelopment: boolean,
): number | null {
  if (!isDevelopment) return null;

  const beatId = params.get("beatId");
  if (beatId) {
    const beatIndex = BEAT_INDEX[beatId];
    if (beatIndex != null) return beatIndex;
  }

  const rawBeat = params.get("beat");
  if (rawBeat === null) return null;
  const numericBeat = Number(rawBeat);
  return Number.isFinite(numericBeat) && numericBeat >= 0 ? numericBeat : null;
}

function TutorialPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 overflow-y-auto bg-[#050811] text-white">
      <div className="absolute inset-0 opacity-25" style={{ background: `url(${backgroundCosmos}) center/cover` }} />
      <div className="relative mx-auto flex min-h-full w-full max-w-lg flex-col justify-center px-5 py-12">
        {children}
      </div>
    </div>
  );
}

function CompletedFirstContact({
  authenticated,
  progress,
}: {
  authenticated: boolean;
  progress: TutorialInvestigationProgress | null;
}) {
  const [, navigate] = useLocation();
  if (!authenticated) {
    return (
      <TutorialPageShell>
        <div className="mb-6 text-center">
          <div className="text-[10px] font-bold uppercase text-emerald-200/70">First Contact Complete</div>
          <h1 className="mt-2 font-serif text-2xl">Keep what you discovered</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Establish an Artifact Record to save First Contact and claim 10 Lume.
          </p>
        </div>
        <LoginRegisterForm defaultMode="register" onSuccess={() => undefined} />
        <button type="button" onClick={() => navigate("/")} className="mt-5 min-h-11 text-sm text-white/55 hover:text-white">
          Return Home
        </button>
      </TutorialPageShell>
    );
  }

  return (
    <TutorialPageShell>
      <div className="text-center">
        <div className="text-[10px] font-bold uppercase text-emerald-200/70">First Contact Complete</div>
        <h1 className="mt-2 font-serif text-2xl">
          {progress ? "This encounter is part of your record" : "This encounter is waiting to sync"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          {progress
            ? "First Contact can be completed once per Architect account."
            : "Reconnect to claim its Lume."}
        </p>
      </div>
      <div className="mt-7 flex flex-col gap-3">
        <button type="button" onClick={() => navigate("/")} className="min-h-11 text-sm text-white/55 hover:text-white">
          Return Home
        </button>
      </div>
    </TutorialPageShell>
  );
}

function TutorialAccessError({ onRetry }: { onRetry: () => void }) {
  const [, navigate] = useLocation();
  return (
    <TutorialPageShell>
      <div className="text-center">
        <div className="text-[10px] font-bold uppercase text-rose-200/70">Record Unavailable</div>
        <h1 className="mt-2 font-serif text-2xl">First Contact could not be verified</h1>
        <p className="mt-3 text-sm leading-relaxed text-white/60">
          Reconnect before entering so your one completed encounter remains intact.
        </p>
      </div>
      <div className="mt-7 flex flex-col gap-3">
        <button type="button" onClick={onRetry} className="min-h-12 rounded-md bg-amber-400 px-5 text-sm font-semibold text-slate-950 hover:bg-amber-300">
          Try Again
        </button>
        <button type="button" onClick={() => navigate("/")} className="min-h-11 text-sm text-white/55 hover:text-white">
          Return Home
        </button>
      </div>
    </TutorialPageShell>
  );
}

export default function Tutorial() {
  const [, navigate] = useLocation();
  const { account, token, isLoading } = useAccount();
  const accountId = account?.id ?? null;
  const params = new URLSearchParams(window.location.search);
  const devPreview = import.meta.env.DEV && params.get("tutorialDebug") === "1";
  const [pendingBeat] = useState(() => consumePendingStartBeat());
  const [accountProgress, setAccountProgress] = useState<TutorialInvestigationProgress | null | undefined>(undefined);
  const [accessError, setAccessError] = useState(false);
  const [accessAttempt, setAccessAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (!accountId || !token || devPreview) {
      setAccountProgress(null);
      setAccessError(false);
      return () => { active = false; };
    }
    setAccountProgress(undefined);
    setAccessError(false);
    void loadAuthenticatedTutorialInvestigationProgress(token)
      .then((loaded) => {
        if (active) setAccountProgress(loaded);
      })
      .catch(() => {
        if (active) setAccessError(true);
      });
    return () => { active = false; };
  }, [accountId, token, devPreview, accessAttempt]);

  // Stable beat IDs keep QA deep links valid when authored scenes are inserted.
  // The numeric form remains available for direct index inspection.
  const urlBeat = resolveTutorialPreviewBeat(params, import.meta.env.DEV);

  const savedBeat = (() => {
    const rawIdx = loadTutorialProgress((id) => BEAT_INDEX[id]);
    if (rawIdx === null) return null;
    const savedId = loadTutorialProgressId();
    if (savedId) {
      const currentIdx = BEAT_INDEX[savedId];
      if (currentIdx != null) return currentIdx;
    }
    return rawIdx;
  })();
  const hasMidProgress = savedBeat !== null && savedBeat > 0 && savedBeat < TUTORIAL_BEATS.length - 1;
  const effectivePending = urlBeat ?? (pendingBeat != null ? pendingBeat : null);
  const [phase, setPhase] = useState<Phase>(
    effectivePending != null || !hasMidProgress ? "playing" : "prompt",
  );
  const [startBeat, setStartBeat] = useState<number | undefined>(effectivePending ?? undefined);

  function handleChoice(choice: "begin" | "resume" | "start-over" | "cancel") {
    if (choice === "resume") {
      setStartBeat(savedBeat!);
      setPhase("playing");
    } else if (choice === "start-over") {
      clearTutorialProgress();
      setStartBeat(0);
      setPhase("playing");
    } else if (choice === "begin") {
      setStartBeat(0);
      setPhase("playing");
    } else {
      navigate("/");
    }
  }

  useEscapeToClose([
    { isOpen: phase === "prompt", onClose: () => handleChoice("cancel") },
  ]);

  if (isLoading || (account && !devPreview && accountProgress === undefined && !accessError)) {
    return <AccountLoadingScreen />;
  }
  if (account && !devPreview && accessError) {
    return <TutorialAccessError onRetry={() => setAccessAttempt((attempt) => attempt + 1)} />;
  }

  if (!devPreview) {
    if (account && (accountProgress?.completed || hasPendingTutorialCompletion())) {
      return <CompletedFirstContact authenticated progress={accountProgress?.completed ? accountProgress : null} />;
    }
    if (!account && hasTutorialBeenCompleted()) {
      return <CompletedFirstContact authenticated={false} progress={null} />;
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      style={{ height: "100%", display: "contents" }}
    >
      <TutorialDirector startBeat={startBeat} />
    </motion.div>
  );
}
