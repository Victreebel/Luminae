import {
  forwardRef,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ArtifactCard, GamePlayerState, GameState } from "@workspace/api-client-react";
import {
  DEFAULT_VICTORY_REQUIREMENT,
  type LumiiThresholdApproach,
  type LumiiThresholdDialogueChoiceId,
  type LumiiThresholdDialogueResolution,
} from "@workspace/game-types";
import {
  AlertTriangle,
  ArrowRight,
  DoorOpen,
  Loader2,
  LockKeyhole,
  RotateCcw,
} from "lucide-react";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";
import { CipherSigil } from "@/components/CipherSigil";
import { LumiiOrb, type LumiiAppearance } from "@/components/LumiiTutorial";
import { TransmissionFault } from "@/components/TransmissionFault";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { gameAudio } from "@/lib/audio";
import {
  outOfGameAudio,
  type LumiiThresholdScoreMood,
} from "@/lib/outOfGameAudio";
import {
  LUMII_APPROACH_CHOICES,
  LUMII_OUTCOME_DIALOGUE,
  LUMII_ROUTE_COMMENTARY,
  LUMII_THRESHOLD_DIALOGUE,
  resolveLumiiDialogueNodeId,
  type LumiiDialogueChoice,
  type LumiiDialogueNodeId,
} from "./lumiiVaultNarrative";
import "@/components/archive/AccountArchive.css";
import "./LumiiVaultEncounter.css";

const LumiiVaultRewardReveal = lazy(async () => {
  const module = await import("./LumiiVaultRewardReveal");
  return { default: module.LumiiVaultRewardReveal };
});

export const LUMII_CLEARANCE_SCENARIO_ID = "blueprint_clearance_lumii";
const EMPTY_DIALOGUE_PATH: readonly LumiiThresholdDialogueChoiceId[] = [];
const LUMII_SENTENCE_REVEAL_BASE_MS = 980;
const LUMII_SENTENCE_REVEAL_CHAR_MS = 24;
const LUMII_SENTENCE_REVEAL_MAX_MS = 2_150;

export type VaultThresholdState = "sealed" | "arrested" | "hostile" | "open";
export type VaultCipherState = "active" | "surging" | "collapsing" | "inert" | "hidden";

export type LumiiEncounterPhase =
  | "sealed"
  | "expanding"
  | "cipher-surge"
  | "cipher-collapse"
  | "cipher-inert"
  | "opening"
  | "approach"
  | "dialogue"
  | "threshold-choice"
  | "remembered"
  | "hostile"
  | "briefing"
  | "launching"
  | "board-entry"
  | "leaving"
  | "closing"
  | "withdrawn"
  | "defeat"
  | "victory"
  | "victory-response"
  | "open"
  | "reward";

export type LumiiEncounterAttempt = "first" | "remembered";
export type LumiiEncounterOutcome = "entry" | "withdrawn" | "defeat" | "victory" | "reward";

export type VaultSourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type VaultThresholdProps = {
  state?: VaultThresholdState;
  interactive?: boolean;
  ariaLabel?: string;
  sealLabel?: string;
  cipherState?: VaultCipherState;
  onActivate?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

export const VaultThreshold = forwardRef<HTMLButtonElement, VaultThresholdProps>(
  function VaultThreshold(
    {
      state = "sealed",
      interactive = false,
      ariaLabel = "Sealed cosmic technology vault",
      sealLabel = "TOP SECRET",
      cipherState = state === "open" ? "hidden" : "active",
      onActivate,
      className = "",
    },
    ref,
  ) {
    const open = state === "open";
    const showCipher = cipherState !== "hidden";
    return (
      <button
        ref={ref}
        type="button"
        className={`account-vault__machine vault-threshold ${className}`.trim()}
        data-vault-state={state}
        data-cipher-state={cipherState}
        data-interactive={interactive || undefined}
        aria-label={ariaLabel}
        disabled={!interactive}
        onClick={onActivate}
      >
        <span className="account-vault__interior" aria-hidden="true" />
        <span className="account-vault__stars" aria-hidden="true" />
        <span className="account-vault__orbit account-vault__orbit--outer" aria-hidden="true" />
        <span className="account-vault__orbit account-vault__orbit--middle" aria-hidden="true" />
        <span className="account-vault__orbit account-vault__orbit--inner" aria-hidden="true" />
        <span className="account-vault__clamps" aria-hidden="true">
          <i /><i /><i /><i />
        </span>
        <span className="account-vault__door" aria-hidden="true">
          <span className="account-vault__door-half account-vault__door-half--left" />
          <span className="account-vault__door-half account-vault__door-half--right" />
          <span className="account-vault__scan" />
        </span>
        {showCipher && (
          <>
            <span className="account-vault__cipher-conduits" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => <i key={index} />)}
            </span>
            {(["left", "right"] as const).map((side, index) => (
              <span
                key={`energized-${side}`}
                className={`account-vault__cipher-sigil vault-threshold__cipher-half vault-threshold__cipher-half--${side} vault-threshold__cipher-half--energized`}
                aria-hidden="true"
              >
                <CipherSigil affinityHex="#f3fbff" id={9701 + index * 2} />
              </span>
            ))}
            {(["left", "right"] as const).map((side, index) => (
              <span
                key={`inert-${side}`}
                className={`account-vault__cipher-sigil vault-threshold__cipher-half vault-threshold__cipher-half--${side} vault-threshold__cipher-half--inert`}
                aria-hidden="true"
              >
                <CipherSigil affinityHex="#56606a" id={9711 + index * 2} />
              </span>
            ))}
          </>
        )}
        {open ? (
          <span className="account-vault__breach" aria-hidden="true">
            <i />
            <i />
            <i />
            <span>{sealLabel}</span>
          </span>
        ) : (
          <span className="account-vault__seal" aria-hidden="true">
            <LockKeyhole />
            <span>{sealLabel}</span>
          </span>
        )}
        {interactive && <span className="vault-threshold__focus" aria-hidden="true" />}
      </button>
    );
  },
);

function initialPhase(outcome: LumiiEncounterOutcome): LumiiEncounterPhase {
  if (outcome === "withdrawn") return "withdrawn";
  if (outcome === "defeat") return "defeat";
  if (outcome === "victory") return "victory";
  if (outcome === "reward") return "reward";
  return "expanding";
}

function thresholdStateForPhase(phase: LumiiEncounterPhase): VaultThresholdState {
  if (phase === "open" || phase === "reward") return "open";
  if (
    phase === "hostile" ||
    phase === "briefing" ||
    phase === "launching" ||
    phase === "board-entry" ||
    phase === "defeat"
  ) return "hostile";
  if (
    phase === "opening" ||
    phase === "approach" ||
    phase === "dialogue" ||
    phase === "threshold-choice" ||
    phase === "remembered" ||
    phase === "victory" ||
    phase === "victory-response"
  ) return "arrested";
  return "sealed";
}

function cipherStateForPhase(
  phase: LumiiEncounterPhase,
  cipherDeactivated: boolean,
): VaultCipherState {
  if (phase === "open" || phase === "reward") return "hidden";
  if (phase === "cipher-surge") return "surging";
  if (phase === "cipher-collapse") return "collapsing";
  if (cipherDeactivated || !["sealed", "expanding", "cipher-surge"].includes(phase)) return "inert";
  return "active";
}

function lumiiAppearanceForPhase(
  phase: LumiiEncounterPhase,
  covenantBroken: boolean,
): LumiiAppearance {
  if (phase === "victory" || phase === "victory-response" || phase === "open") return "yielding";
  if (
    covenantBroken ||
    phase === "hostile" ||
    phase === "briefing" ||
    phase === "launching" ||
    phase === "board-entry" ||
    phase === "defeat" ||
    phase === "withdrawn"
  ) return "hostile";
  return "spectrum";
}

function phaseHasLumii(phase: LumiiEncounterPhase): boolean {
  return ![
    "sealed",
    "expanding",
    "cipher-surge",
    "cipher-collapse",
    "cipher-inert",
    "closing",
    "reward",
  ].includes(phase);
}

function phaseHasFirewall(phase: LumiiEncounterPhase): boolean {
  return [
    "opening",
    "approach",
    "dialogue",
    "threshold-choice",
    "remembered",
    "hostile",
    "briefing",
    "launching",
    "board-entry",
    "withdrawn",
    "defeat",
    "victory",
    "victory-response",
  ].includes(phase);
}

function thresholdScoreMoodForPhase(
  phase: LumiiEncounterPhase,
  covenantBroken: boolean,
): LumiiThresholdScoreMood | null {
  if (["expanding", "sealed"].includes(phase)) return "awe";
  if (["cipher-surge", "cipher-collapse", "cipher-inert", "opening"].includes(phase)) return "cipher";
  if (["approach", "dialogue", "threshold-choice", "remembered"].includes(phase)) {
    return covenantBroken ? "hostile" : "guardian";
  }
  if (["hostile", "briefing", "defeat", "withdrawn"].includes(phase)) return "hostile";
  if (["launching", "board-entry"].includes(phase)) return "forecast";
  if (["victory", "victory-response"].includes(phase)) return "yielding";
  if (["open", "reward"].includes(phase)) return "release";
  if (["leaving", "closing"].includes(phase)) return "leaving";
  return null;
}

function splitLumiiSentences(lines: string | readonly string[]): string[] {
  const source: readonly string[] = Array.isArray(lines) ? lines : [lines];
  const sentences = source.flatMap((line) => {
    const matches = line.match(/[^.!?]+(?:[.!?]+|$)/g) ?? [line];
    return matches.map((sentence) => sentence.trim()).filter(Boolean);
  });
  return sentences.length > 0 ? sentences : [""];
}

function LumiiSentenceReveal({
  lines,
  reducedMotion,
  onComplete,
}: {
  lines: string | readonly string[];
  reducedMotion: boolean;
  onComplete?: () => void;
}) {
  const sentences = splitLumiiSentences(lines);
  const sentenceKey = sentences.join("\n");
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const completedKeyRef = useRef<string | null>(null);
  const activeSentence = sentences[Math.min(sentenceIndex, sentences.length - 1)] ?? "";

  useEffect(() => {
    setSentenceIndex(0);
    completedKeyRef.current = null;
  }, [sentenceKey]);

  useEffect(() => {
    const readMs = reducedMotion
      ? 160
      : Math.min(
        LUMII_SENTENCE_REVEAL_MAX_MS,
        LUMII_SENTENCE_REVEAL_BASE_MS + activeSentence.length * LUMII_SENTENCE_REVEAL_CHAR_MS,
      );
    if (sentenceIndex >= sentences.length - 1) {
      if (!onComplete || completedKeyRef.current === sentenceKey) return undefined;
      const timer = window.setTimeout(() => {
        if (completedKeyRef.current === sentenceKey) return;
        completedKeyRef.current = sentenceKey;
        onComplete();
      }, readMs);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => {
      setSentenceIndex((value) => Math.min(value + 1, sentences.length - 1));
    }, readMs);
    return () => window.clearTimeout(timer);
  }, [activeSentence.length, onComplete, reducedMotion, sentenceIndex, sentenceKey, sentences.length]);

  return (
    <blockquote
      className="lumii-vault-encounter__sentence-reveal"
      data-sentence-index={sentenceIndex + 1}
      data-sentence-count={sentences.length}
    >
      {reducedMotion ? (
        <em>{activeSentence}</em>
      ) : (
        <motion.em
          key={`${sentenceKey}-${sentenceIndex}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
        >
          {activeSentence}
        </motion.em>
      )}
    </blockquote>
  );
}

type LumiiVaultEncounterProps = {
  sourceRect?: VaultSourceRect | null;
  attempt?: LumiiEncounterAttempt;
  outcome?: LumiiEncounterOutcome;
  controlledPhase?: LumiiEncounterPhase;
  muted?: boolean;
  forceReducedMotion?: boolean;
  previewViewport?: "desktop" | "mobile";
  cipherDeactivated?: boolean;
  covenantBroken?: boolean;
  thresholdApproach?: LumiiThresholdApproach | null;
  dialoguePath?: readonly LumiiThresholdDialogueChoiceId[];
  dialogueResolution?: LumiiThresholdDialogueResolution | null;
  onLeave?: () => void;
  onDeactivateCipher?: () => Promise<void> | void;
  onChooseApproach?: (approach: LumiiThresholdApproach) => Promise<void> | void;
  onRecordDialoguePath?: (path: LumiiThresholdDialogueChoiceId[]) => Promise<void> | void;
  onResolveDialogue?: () => Promise<void> | void;
  onBeginChallenge?: () => Promise<void> | void;
  onChallengeReady?: () => void;
  onChallengeAgain?: () => Promise<void> | void;
  onEnterVault?: () => Promise<void> | void;
  onPhaseChange?: (phase: LumiiEncounterPhase) => void;
};

export function LumiiVaultEncounter({
  sourceRect = null,
  attempt = "first",
  outcome = "entry",
  controlledPhase,
  muted = false,
  forceReducedMotion = false,
  previewViewport,
  cipherDeactivated = false,
  covenantBroken = false,
  thresholdApproach = null,
  dialoguePath = EMPTY_DIALOGUE_PATH,
  dialogueResolution = null,
  onLeave = () => undefined,
  onDeactivateCipher,
  onChooseApproach,
  onRecordDialoguePath,
  onResolveDialogue,
  onBeginChallenge,
  onChallengeReady,
  onChallengeAgain,
  onEnterVault,
  onPhaseChange,
}: LumiiVaultEncounterProps) {
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = forceReducedMotion || systemReducedMotion === true;
  const [phase, setPhase] = useState<LumiiEncounterPhase>(() => initialPhase(outcome));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedApproach, setSelectedApproach] = useState<LumiiThresholdApproach | null>(thresholdApproach);
  const [selectedDialoguePath, setSelectedDialoguePath] = useState<LumiiThresholdDialogueChoiceId[]>(
    () => [...dialoguePath],
  );
  const [dialogueNodeId, setDialogueNodeId] = useState<LumiiDialogueNodeId>(() => thresholdApproach
    ? resolveLumiiDialogueNodeId(thresholdApproach, dialoguePath)
    : "root");
  const [inquiryFaultComplete, setInquiryFaultComplete] = useState(false);
  const [inquiryRootRepliesComplete, setInquiryRootRepliesComplete] = useState(false);
  const [cipherAttemptKey, setCipherAttemptKey] = useState(0);
  const visiblePhase = controlledPhase ?? phase;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const challengeReadyRef = useRef(false);
  const cipherDeactivatedRef = useRef(cipherDeactivated);
  const thresholdApproachRef = useRef(thresholdApproach);
  const dialogueResolutionRef = useRef(dialogueResolution);
  const onDeactivateCipherRef = useRef(onDeactivateCipher);
  const inputGuardUntilRef = useRef(Date.now() + 320);
  const audiblePhaseRef = useRef<LumiiEncounterPhase | null>(null);
  const canLeave = ["approach", "dialogue", "threshold-choice", "remembered"].includes(visiblePhase);
  const transitionTo = useCallback((nextPhase: LumiiEncounterPhase) => {
    if (controlledPhase && onPhaseChange) onPhaseChange(nextPhase);
    else setPhase(nextPhase);
  }, [controlledPhase, onPhaseChange]);

  useEffect(() => {
    cipherDeactivatedRef.current = cipherDeactivated;
    thresholdApproachRef.current = thresholdApproach;
    dialogueResolutionRef.current = dialogueResolution;
    onDeactivateCipherRef.current = onDeactivateCipher;
    if (thresholdApproach) {
      setSelectedApproach(thresholdApproach);
      setSelectedDialoguePath([...dialoguePath]);
      setDialogueNodeId(resolveLumiiDialogueNodeId(thresholdApproach, dialoguePath));
    }
  }, [cipherDeactivated, dialoguePath, dialogueResolution, onDeactivateCipher, thresholdApproach]);

  useEffect(() => {
    if (dialogueNodeId !== "root" || (selectedApproach ?? thresholdApproach) !== "inquiry") return;
    setInquiryFaultComplete(false);
    setInquiryRootRepliesComplete(false);
  }, [dialogueNodeId, selectedApproach, thresholdApproach]);

  const requestLeave = useCallback(async () => {
    if (!canLeave || pending) return;
    const shouldRememberDialogue = dialogueResolutionRef.current === null &&
      (visiblePhase === "dialogue" || visiblePhase === "threshold-choice") &&
      (selectedApproach ?? thresholdApproach) !== null;
    const shouldPersistLeave = onResolveDialogue !== undefined;
    setError(null);
    if (shouldPersistLeave) setPending(true);
    try {
      if (shouldPersistLeave) await onResolveDialogue();
      dialogueResolutionRef.current = shouldRememberDialogue ? "left" : dialogueResolutionRef.current;
      transitionTo("leaving");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The threshold could not preserve your response.");
    } finally {
      if (shouldPersistLeave) setPending(false);
    }
  }, [canLeave, onResolveDialogue, pending, selectedApproach, thresholdApproach, transitionTo, visiblePhase]);

  useFocusTrap(dialogRef, previewViewport === undefined, () => { void requestLeave(); });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    inputGuardUntilRef.current = Date.now() + (reducedMotion ? 80 : 280);
  }, [reducedMotion, visiblePhase]);

  useEffect(() => {
    if (muted || audiblePhaseRef.current === visiblePhase) return;
    audiblePhaseRef.current = visiblePhase;
    switch (visiblePhase) {
      case "expanding":
        outOfGameAudio.playLumiiCinematic("threshold-expand");
        break;
      case "cipher-surge":
        outOfGameAudio.playLumiiCinematic("cipher-surge");
        break;
      case "cipher-collapse":
        outOfGameAudio.playLumiiCinematic("cipher-collapse");
        break;
      case "opening":
        outOfGameAudio.play("vault");
        break;
      case "approach":
        outOfGameAudio.playLumiiSignal("guardian");
        break;
      case "remembered":
        outOfGameAudio.playLumiiSignal(covenantBroken ? "hostile" : "guardian");
        break;
      case "hostile":
      case "defeat":
        outOfGameAudio.playLumiiSignal("hostile");
        break;
      case "briefing":
        outOfGameAudio.playLumiiCinematic("covenant-break");
        break;
      case "launching":
        outOfGameAudio.playLumiiCinematic("board-entry");
        break;
      case "leaving":
        outOfGameAudio.play("close");
        break;
      case "victory":
        outOfGameAudio.playLumiiSignal("yielding");
        break;
      case "open":
        outOfGameAudio.playLumiiCinematic("vault-release");
        break;
      case "reward":
        outOfGameAudio.playLumiiCinematic("reward-reveal");
        break;
      default:
        break;
    }
  }, [covenantBroken, muted, visiblePhase]);

  useEffect(() => {
    if (muted) {
      outOfGameAudio.stopLumiiThresholdScore(0.18);
      return undefined;
    }
    const mood = thresholdScoreMoodForPhase(visiblePhase, covenantBroken);
    if (!mood) {
      outOfGameAudio.stopLumiiThresholdScore(0.45);
      return undefined;
    }
    outOfGameAudio.startLumiiThresholdScore(mood);
    if (["board-entry", "closing", "withdrawn", "defeat"].includes(visiblePhase)) {
      const timer = window.setTimeout(
        () => outOfGameAudio.stopLumiiThresholdScore(visiblePhase === "board-entry" ? 0.85 : 0.55),
        reducedMotion ? 160 : visiblePhase === "board-entry" ? 650 : 900,
      );
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [covenantBroken, muted, reducedMotion, visiblePhase]);

  useEffect(() => () => {
    outOfGameAudio.stopLumiiThresholdScore(0.35);
  }, []);

  useEffect(() => {
    if (controlledPhase || outcome !== "entry") return;
    if (phase === "expanding") {
      const timer = window.setTimeout(
        () => setPhase(cipherDeactivatedRef.current ? "opening" : "cipher-surge"),
        reducedMotion ? 120 : 650,
      );
      return () => window.clearTimeout(timer);
    }
    if (phase === "cipher-surge") {
      let cancelled = false;
      setPending(true);
      setError(null);
      const minimum = new Promise<void>((resolve) => {
        window.setTimeout(resolve, reducedMotion ? 100 : 600);
      });
      void Promise.all([minimum, Promise.resolve(onDeactivateCipherRef.current?.())])
        .then(() => {
          if (cancelled) return;
          setPending(false);
          setPhase("cipher-collapse");
        })
        .catch((caught) => {
          if (cancelled) return;
          setPending(false);
          setError(caught instanceof Error ? caught.message : "The Supreme Cipher did not respond.");
        });
      return () => {
        cancelled = true;
      };
    }
    if (phase === "cipher-collapse") {
      const timer = window.setTimeout(() => setPhase("cipher-inert"), reducedMotion ? 70 : 240);
      return () => window.clearTimeout(timer);
    }
    if (phase === "cipher-inert") {
      const timer = window.setTimeout(() => setPhase("opening"), reducedMotion ? 50 : 120);
      return () => window.clearTimeout(timer);
    }
    if (phase === "opening") {
      const timer = window.setTimeout(
        () => setPhase(
          attempt === "remembered" || dialogueResolutionRef.current !== null
            ? "remembered"
            : thresholdApproachRef.current ? "dialogue" : "approach",
        ),
        reducedMotion ? 160 : 900,
      );
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [attempt, cipherAttemptKey, controlledPhase, muted, outcome, phase, reducedMotion]);

  useEffect(() => {
    if (controlledPhase || outcome !== "victory") return;
    if (phase === "open") {
      const timer = window.setTimeout(() => setPhase("reward"), reducedMotion ? 220 : 1_400);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [controlledPhase, outcome, phase, reducedMotion]);

  useEffect(() => {
    if (controlledPhase) return;
    const next = phase === "hostile"
      ? { phase: "briefing" as const, delay: reducedMotion ? 180 : 2_400 }
      : phase === "briefing"
        ? { phase: "launching" as const, delay: reducedMotion ? 220 : 2_000 }
        : phase === "launching"
          ? { phase: "board-entry" as const, delay: reducedMotion ? 100 : 700 }
          : null;
    if (!next) return;
    const timer = window.setTimeout(() => setPhase(next.phase), next.delay);
    return () => window.clearTimeout(timer);
  }, [controlledPhase, phase, reducedMotion]);

  useEffect(() => {
    if (controlledPhase || phase !== "board-entry" || !challengeReadyRef.current) return;
    const timer = window.setTimeout(() => onChallengeReady?.(), reducedMotion ? 120 : 700);
    return () => window.clearTimeout(timer);
  }, [controlledPhase, onChallengeReady, phase, reducedMotion]);

  useEffect(() => {
    if (controlledPhase) return;
    if (phase === "leaving") {
      const timer = window.setTimeout(() => setPhase("closing"), reducedMotion ? 120 : 650);
      return () => window.clearTimeout(timer);
    }
    if (phase !== "closing") return;
    const timer = window.setTimeout(onLeave, reducedMotion ? 120 : 850);
    return () => window.clearTimeout(timer);
  }, [controlledPhase, onLeave, phase, reducedMotion]);

  const chooseApproach = useCallback(async (approach: LumiiThresholdApproach) => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await onChooseApproach?.(approach);
      setSelectedApproach(approach);
      setSelectedDialoguePath([]);
      setDialogueNodeId("root");
      transitionTo("dialogue");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The threshold did not record your approach.");
    } finally {
      setPending(false);
    }
  }, [onChooseApproach, pending, transitionTo]);

  const recordDialogueChoice = useCallback((choice: LumiiDialogueChoice) => {
    if (pending) return;
    const previousPath = selectedDialoguePath;
    const previousNodeId = dialogueNodeId;
    const nextPath = [...previousPath, choice.id];
    if (!muted) outOfGameAudio.play("navigate");
    setSelectedDialoguePath(nextPath);
    setDialogueNodeId(choice.next);
    if (!onRecordDialoguePath) return;
    setPending(true);
    setError(null);
    void Promise.resolve(onRecordDialoguePath(nextPath))
      .catch((caught) => {
        setSelectedDialoguePath(previousPath);
        setDialogueNodeId(previousNodeId);
        setError(caught instanceof Error ? caught.message : "Lumii did not retain that response.");
      })
      .finally(() => setPending(false));
  }, [dialogueNodeId, muted, onRecordDialoguePath, pending, selectedDialoguePath]);

  const continueOpening = useCallback(async () => {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      await onBeginChallenge?.();
      challengeReadyRef.current = true;
      transitionTo("hostile");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The defense forecast could not begin.");
    } finally {
      setPending(false);
    }
  }, [onBeginChallenge, pending, transitionTo]);

  const advanceStaticPhase = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if ((controlledPhase && !onPhaseChange) || pending || Date.now() < inputGuardUntilRef.current) return;
    if ((event.target as HTMLElement).closest("button, a, input, select, textarea")) return;
    if (visiblePhase === "expanding") transitionTo(cipherDeactivated ? "opening" : "cipher-surge");
    else if (visiblePhase === "cipher-collapse") transitionTo("cipher-inert");
    else if (visiblePhase === "cipher-inert") transitionTo("opening");
    else if (visiblePhase === "opening") {
      transitionTo(
        attempt === "remembered" || dialogueResolution !== null
          ? "remembered"
          : thresholdApproach ? "dialogue" : "approach",
      );
    } else if (visiblePhase === "hostile") transitionTo("briefing");
    else if (visiblePhase === "briefing") transitionTo("launching");
    else if (visiblePhase === "launching") transitionTo("board-entry");
    else if (visiblePhase === "leaving") transitionTo("closing");
    else if (visiblePhase === "open") transitionTo("reward");
  }, [attempt, cipherDeactivated, controlledPhase, dialogueResolution, onPhaseChange, pending, thresholdApproach, transitionTo, visiblePhase]);

  const frameInitial = sourceRect && !reducedMotion
    ? {
        top: sourceRect.y,
        left: sourceRect.x,
        width: sourceRect.width,
        height: sourceRect.height,
        borderRadius: "50%",
        opacity: 1,
      }
    : { top: 0, left: 0, width: "100vw", height: "100dvh", borderRadius: 0, opacity: 0 };
  const previewTarget = previewViewport === "mobile"
    ? {
        top: 68,
        left: "calc(50vw - min(195px, calc(50vw - 10px)))",
        width: "min(390px, calc(100vw - 20px))",
        height: "calc(100dvh - 80px)",
        borderRadius: 6,
        opacity: 1,
      }
    : previewViewport === "desktop"
      ? {
          top: 68,
          left: 12,
          width: "calc(100vw - 24px)",
          height: "calc(100dvh - 80px)",
          borderRadius: 6,
          opacity: 1,
        }
      : null;
  const frameTarget = previewTarget ?? (visiblePhase === "closing" && sourceRect && !reducedMotion
    ? {
        top: sourceRect.y,
        left: sourceRect.x,
        width: sourceRect.width,
        height: sourceRect.height,
        borderRadius: "50%",
        opacity: 1,
      }
    : { top: 0, left: 0, width: "100vw", height: "100dvh", borderRadius: 0, opacity: 1 });

  const appearance = lumiiAppearanceForPhase(visiblePhase, covenantBroken);
  const thresholdState = thresholdStateForPhase(visiblePhase);
  const cipherState = cipherStateForPhase(visiblePhase, cipherDeactivated);
  const hostile = appearance === "hostile";
  const route = selectedApproach ?? thresholdApproach ?? "inquiry";
  const dialogueNode = LUMII_THRESHOLD_DIALOGUE[route][dialogueNodeId];
  const isInquiryRoot = visiblePhase === "dialogue" && route === "inquiry" && dialogueNodeId === "root";
  const outcomeDialogue = LUMII_OUTCOME_DIALOGUE[route];
  const routeEscalationLabel =
    route === "kinship"
      ? "Then I will open it for both of us."
      : route === "dominion"
        ? "Then stop me."
        : "Then I need to see what you cannot say.";

  const runChallengeAgain = async () => {
    if (!onChallengeAgain || pending) return;
    setPending(true);
    try {
      await onChallengeAgain();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The confrontation could not be restored.");
      setPending(false);
    }
  };

  const enterVault = async () => {
    if (pending) return;
    setPending(true);
    try {
      await onEnterVault?.();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The Vault record could not be acknowledged.");
      setPending(false);
    }
  };

  return (
    <motion.div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Lumii Vault encounter"
      className="lumii-vault-encounter"
      data-phase={visiblePhase}
      data-hostile={hostile || undefined}
      data-route={route}
      data-dialogue-resolution={dialogueResolution ?? undefined}
      data-preview-viewport={previewViewport}
      onClick={advanceStaticPhase}
      initial={frameInitial}
      animate={frameTarget}
      transition={{
        duration: reducedMotion ? 0.15 : visiblePhase === "closing" ? 0.85 : 0.65,
        ease: [0.2, 0.72, 0.18, 1],
      }}
      style={{ backgroundImage: `linear-gradient(rgba(2,4,9,.48), rgba(2,4,9,.88)), url(${backgroundCosmos})` }}
    >
      <div className="lumii-vault-encounter__shade" aria-hidden="true" />
      <header className="lumii-vault-encounter__header">
        <span>{visiblePhase === "reward" ? "OUTER VAULT ACCESS" : "LUMII // DIRECT INTERRUPTION"}</span>
        <strong>{visiblePhase === "reward" ? "Blueprint Vault" : "The Threshold"}</strong>
      </header>

      <div className="lumii-vault-encounter__stage">
        <VaultThreshold
          state={thresholdState}
          cipherState={cipherState}
          sealLabel={thresholdState === "open" ? "REDACTION LIFTED" : hostile ? "CONTESTED" : cipherState === "inert" ? "THRESHOLD ARRESTED" : "TOP SECRET"}
          className="lumii-vault-encounter__threshold"
        />

        <AnimatePresence>
          {phaseHasLumii(visiblePhase) && (
            <div key={`lumii-${appearance}`} className="lumii-vault-encounter__lumii-anchor">
              <motion.div
                className="lumii-vault-encounter__lumii"
                initial={{ opacity: 0, scale: 0.68 }}
                animate={{ opacity: visiblePhase === "open" ? 0.46 : 1, scale: visiblePhase === "victory" ? 0.92 : 1 }}
                exit={{ opacity: 0, scale: 0.75 }}
                transition={{ duration: reducedMotion ? 0.15 : 0.75, ease: "easeOut" }}
              >
                <LumiiOrb
                  size={210}
                  speaking={["approach", "dialogue", "remembered", "hostile", "withdrawn", "defeat", "victory", "victory-response", "open"].includes(visiblePhase)}
                  excited={hostile}
                  whiteGlow={!hostile}
                  coreGlow={hostile ? "red" : "white"}
                  appearance={appearance}
                  beatKey={visiblePhase}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {phaseHasFirewall(visiblePhase) && (
          <div className="lumii-vault-encounter__firewall-anchor" aria-hidden="true">
            <motion.div
              className="lumii-vault-encounter__firewall"
              data-hostile={hostile || undefined}
              initial={{ opacity: 0, scale: 0.72 }}
              animate={{
                opacity: visiblePhase === "board-entry" ? 0.12 : 1,
                scale: visiblePhase === "board-entry" ? 0.24 : 1,
              }}
              transition={{ duration: reducedMotion ? 0.15 : 0.75, ease: "easeOut" }}
            >
              {Array.from({ length: 6 }, (_, index) => <i key={index} style={{ "--firewall-index": index } as CSSProperties} />)}
            </motion.div>
          </div>
        )}
      </div>

      <div className="lumii-vault-encounter__copy" aria-live="polite">
        {visiblePhase === "cipher-surge" && error && (
          <div>
            <p className="lumii-vault-encounter__error">{error}</p>
            <div className="lumii-vault-encounter__choices single">
              <button type="button" onClick={() => { setError(null); setCipherAttemptKey((value) => value + 1); }}>
                <RotateCcw aria-hidden="true" /> Try again
              </button>
            </div>
          </div>
        )}

        {visiblePhase === "approach" && (
          <motion.div key="approach" initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }}>
            <span>LUMII</span>
            <LumiiSentenceReveal lines="Architect. Please wait." reducedMotion={reducedMotion} />
            {error && <p className="lumii-vault-encounter__error">{error}</p>}
            <div className="lumii-vault-encounter__choices is-routes">
              {(Object.entries(LUMII_APPROACH_CHOICES) as Array<[LumiiThresholdApproach, string]>).map(([approach, label]) => (
                <button key={approach} type="button" onClick={() => void chooseApproach(approach)} disabled={pending}>
                  <span>{label}</span><ArrowRight aria-hidden="true" />
                </button>
              ))}
              <button type="button" className="is-secondary" onClick={() => void requestLeave()} disabled={pending}>
                <DoorOpen aria-hidden="true" /><span>Leave it sealed</span>
              </button>
            </div>
          </motion.div>
        )}

        {visiblePhase === "dialogue" && dialogueNode && (
          <motion.div key={`${route}-${dialogueNodeId}`} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }}>
            <span>LUMII</span>
            <LumiiSentenceReveal
              lines={isInquiryRoot
                ? inquiryFaultComplete ? dialogueNode.replies.slice(1) : dialogueNode.replies.slice(0, 1)
                : dialogueNode.replies}
              reducedMotion={reducedMotion}
              onComplete={isInquiryRoot && inquiryFaultComplete
                ? () => setInquiryRootRepliesComplete(true)
                : undefined}
            />
            {error && <p className="lumii-vault-encounter__error">{error}</p>}
            {(!isInquiryRoot || inquiryRootRepliesComplete) && <div className={`lumii-vault-encounter__choices ${dialogueNode.choices?.length === 1 ? "single-plus-leave" : ""}`}>
              {dialogueNode.choices?.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => recordDialogueChoice(choice)}
                  disabled={pending}
                >
                  <span>{choice.label}</span><ArrowRight aria-hidden="true" />
                </button>
              ))}
              {dialogueNode.complete && (
                <button type="button" onClick={() => void continueOpening()} disabled={pending}>
                  <span>{dialogueNode.escalationLabel ?? routeEscalationLabel}</span><ArrowRight aria-hidden="true" />
                </button>
              )}
              <button type="button" className="is-secondary" onClick={() => void requestLeave()} disabled={pending}>
                <DoorOpen aria-hidden="true" /><span>Leave it sealed</span>
              </button>
            </div>}
          </motion.div>
        )}

        {isInquiryRoot && !inquiryFaultComplete && (
          <TransmissionFault
            variant="vault"
            muted={muted}
            delayMs={reducedMotion ? 180 : 620}
            reducedMotion={reducedMotion}
            onComplete={() => setInquiryFaultComplete(true)}
          />
        )}

        {visiblePhase === "threshold-choice" && (
          <div>
            <div className="lumii-vault-encounter__choices">
              <button type="button" onClick={() => void continueOpening()} disabled={pending}>{routeEscalationLabel} <ArrowRight aria-hidden="true" /></button>
              <button type="button" className="is-secondary" onClick={() => void requestLeave()} disabled={pending}><DoorOpen aria-hidden="true" /> Leave it sealed</button>
            </div>
          </div>
        )}

        {visiblePhase === "remembered" && (
          <motion.div key={`remembered-${covenantBroken}`} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }}>
            <span>LUMII</span>
            <LumiiSentenceReveal
              lines={covenantBroken ? "You know what follows." : "I hoped you would not return."}
              reducedMotion={reducedMotion}
            />
            {error && <p className="lumii-vault-encounter__error">{error}</p>}
            <div className="lumii-vault-encounter__choices">
              <button type="button" onClick={() => void continueOpening()} disabled={pending}>Proceed <ArrowRight aria-hidden="true" /></button>
              <button type="button" className="is-secondary" onClick={() => void requestLeave()} disabled={pending}><DoorOpen aria-hidden="true" /> Withdraw</button>
            </div>
          </motion.div>
        )}

        {visiblePhase === "hostile" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span>LUMII</span>
            <LumiiSentenceReveal lines="Then I must know what stopping you would require." reducedMotion={reducedMotion} />
          </motion.div>
        )}

        {(visiblePhase === "briefing" || visiblePhase === "launching" || visiblePhase === "board-entry") && (
          <motion.div className="lumii-vault-encounter__briefing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <span><AlertTriangle aria-hidden="true" /> COVENANT BROKEN</span>
            <b>DEFENSE FORECAST</b>
            <strong>TIER I COLLATERAL ANNIHILATION IS POSSIBLE.</strong>
            <small>This rupture will be remembered.</small>
            {pending && <Loader2 className="lumii-vault-encounter__spinner" aria-label="Opening confrontation" />}
          </motion.div>
        )}

        {visiblePhase === "withdrawn" && (
          <div>
            <span>LUMII</span>
            <LumiiSentenceReveal lines="Then let the threshold stand." reducedMotion={reducedMotion} />
            <div className="lumii-vault-encounter__choices single">
              <button type="button" onClick={onLeave}><DoorOpen aria-hidden="true" /> Return to Vault</button>
            </div>
          </div>
        )}

        {visiblePhase === "defeat" && (
          <div>
            <span>LUMII</span>
            <LumiiSentenceReveal lines="Now I know. I can stop you." reducedMotion={reducedMotion} />
            {error && <p className="lumii-vault-encounter__error">{error}</p>}
            <div className={`lumii-vault-encounter__choices ${onChallengeAgain ? "" : "single"}`}>
              {onChallengeAgain && (
                <button type="button" onClick={() => void runChallengeAgain()} disabled={pending}>
                  {pending ? <Loader2 className="lumii-vault-encounter__spinner" /> : <RotateCcw aria-hidden="true" />}
                  Challenge again
                </button>
              )}
              <button type="button" className="is-secondary" onClick={onLeave} disabled={pending}>
                <DoorOpen aria-hidden="true" /> Return to Vault
              </button>
            </div>
          </div>
        )}

        {visiblePhase === "leaving" && (
          <div>
            <span>LUMII</span>
            <LumiiSentenceReveal lines="Thank you." reducedMotion={reducedMotion} />
          </div>
        )}

        {visiblePhase === "victory" && (
          <div>
            <span>LUMII</span>
            <LumiiSentenceReveal lines="I have seen enough." reducedMotion={reducedMotion} />
            <div className="lumii-vault-encounter__choices single">
              <button type="button" onClick={() => transitionTo("victory-response")}>{outcomeDialogue.question}<ArrowRight aria-hidden="true" /></button>
            </div>
          </div>
        )}

        {visiblePhase === "victory-response" && (
          <div>
            <span>LUMII</span>
            <LumiiSentenceReveal lines={outcomeDialogue.answer} reducedMotion={reducedMotion} />
            <div className="lumii-vault-encounter__choices single">
              <button type="button" onClick={() => transitionTo("open")}>Continue<ArrowRight aria-hidden="true" /></button>
            </div>
          </div>
        )}

        {visiblePhase === "open" && (
          <div>
            <span>LUMII</span>
            <LumiiSentenceReveal lines="I will release the doors." reducedMotion={reducedMotion} />
          </div>
        )}

        {visiblePhase === "reward" && (
          <div className="lumii-vault-encounter__reward">
            <div className="lumii-vault-encounter__reward-dialogue">
              <p><span>ARCHITECT</span> This is what you were guarding?</p>
              <div className="lumii-vault-encounter__reward-lumii">
                <span>LUMII</span>
                <LumiiSentenceReveal
                  lines="It is dangerous. But what frightened me has not yet taken shape."
                  reducedMotion={reducedMotion}
                />
              </div>
            </div>
            <Suspense fallback={<Loader2 className="lumii-vault-encounter__spinner" />}>
              <LumiiVaultRewardReveal
                pending={pending}
                error={error}
                onEnterVault={() => void enterVault()}
              />
            </Suspense>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export type LumiiCommentaryCandidate = {
  key: string;
  text: string;
  priority: number;
  durationMs: number;
};

function eventIds(value: Array<{ eventId: string }> | undefined): Set<string> {
  return new Set((value ?? []).map((event) => event.eventId));
}

function playerById(state: GameState, playerId: string | undefined): GamePlayerState | undefined {
  return playerId ? state.players.find((player) => player.playerId === playerId) : undefined;
}

function forgeCardForAction(state: GameState, action: Record<string, unknown>): ArtifactCard | undefined {
  const actor = playerById(state, typeof action.playerId === "string" ? action.playerId : undefined);
  const cardId = typeof action.cardId === "string" ? action.cardId : undefined;
  return actor?.forgedArtifacts?.find((card) => card.id === cardId);
}

export function selectLumiiCommentary(
  previous: GameState | null,
  current: GameState,
  localPlayerId: string,
): LumiiCommentaryCandidate | null {
  if (!previous || previous.startedAt !== current.startedAt) return null;
  const local = playerById(current, localPlayerId);
  const lumii = current.players.find((player) => player.isAi && player.playerName === "Lumii")
    ?? current.players.find((player) => player.isAi);
  const previousLocal = playerById(previous, localPlayerId);
  const previousLumii = lumii ? playerById(previous, lumii.playerId) : undefined;
  if (!local || !lumii || !previousLocal || !previousLumii) return null;
  const route = current.lumiiThresholdApproach ?? "inquiry";
  const routeCopy = LUMII_ROUTE_COMMENTARY[route];

  const target = Math.max(1, current.victoryRequirement ?? DEFAULT_VICTORY_REQUIREMENT);
  for (const threshold of [target - 1, target - 3]) {
    if (local.eminence >= threshold && previousLocal.eminence < threshold) {
      return {
        key: `near-victory:player:${threshold}`,
        text: threshold === target - 1 ? routeCopy["player-final"] : routeCopy["player-near"],
        priority: threshold === target - 1 ? 100 : 92,
        durationMs: 6_200,
      };
    }
    if (lumii.eminence >= threshold && previousLumii.eminence < threshold) {
      return {
        key: `near-victory:lumii:${threshold}`,
        text: threshold === target - 1 ? routeCopy["lumii-final"] : routeCopy["lumii-near"],
        priority: threshold === target - 1 ? 98 : 90,
        durationMs: 5_400,
      };
    }
  }

  const previousProtocolEffects = eventIds(
    previous.pendingScenarioProtocolEvents?.filter((event) => event.kind === "effect"),
  );
  const previousDetonations = eventIds(previous.pendingBlueprintDetonationEvents);
  const detonation = current.pendingScenarioProtocolEvents?.find(
    (event) => event.kind === "effect" && !previousProtocolEffects.has(event.eventId),
  ) ?? current.pendingBlueprintDetonationEvents?.find(
    (event) => !previousDetonations.has(event.eventId),
  );
  if (detonation) {
    return {
      key: `protocol-effect:${detonation.eventId}`,
      text: routeCopy["protocol-effect"],
      priority: 86,
      durationMs: 5_600,
    };
  }

  const previousProtocolManifestations = eventIds(
    previous.pendingScenarioProtocolEvents?.filter((event) => event.kind === "manifestation"),
  );
  const previousManifestations = eventIds(previous.pendingBlueprintManifestationEvents);
  const manifestation = current.pendingScenarioProtocolEvents?.find(
    (event) => event.kind === "manifestation" && !previousProtocolManifestations.has(event.eventId),
  ) ?? current.pendingBlueprintManifestationEvents?.find(
    (event) => !previousManifestations.has(event.eventId),
  );
  if (manifestation) {
    return {
      key: `protocol-manifestation:${manifestation.eventId}`,
      text: routeCopy["protocol-manifestation"],
      priority: 78,
      durationMs: 6_400,
    };
  }

  const previousSummons = eventIds(previous.pendingSummonEvents);
  const summon = current.pendingSummonEvents?.find((event) => !previousSummons.has(event.eventId));
  if (summon) {
    return {
      key: `luminary:${summon.eventId}`,
      text: summon.claimedByPlayerId === localPlayerId
        ? routeCopy["player-luminary"]
        : routeCopy["lumii-luminary"],
      priority: 70,
      durationMs: 5_800,
    };
  }

  const previousLeader = previousLocal.eminence === previousLumii.eminence
    ? "tie"
    : previousLocal.eminence > previousLumii.eminence ? "player" : "lumii";
  const currentLeader = local.eminence === lumii.eminence
    ? "tie"
    : local.eminence > lumii.eminence ? "player" : "lumii";
  const margin = Math.abs(local.eminence - lumii.eminence);
  if (currentLeader !== previousLeader && currentLeader !== "tie" && margin >= 2) {
    return {
      key: `lead:${current.version}:${currentLeader}`,
      text: currentLeader === "player"
        ? "You are advancing. That does not make the threshold safer."
        : "You may still withdraw.",
      priority: 58,
      durationMs: 5_600,
    };
  }

  const action = current.lastAction;
  if (action && (action.type === "forge_artifact" || action.type === "forge_reserved_artifact")) {
    const card = forgeCardForAction(current, action);
    if (card && (card.tier === 3 || card.eminence >= 3)) {
      const actorId = typeof action.playerId === "string" ? action.playerId : "unknown";
      return {
        key: `major-forge:${current.version}:${actorId}:${card.id}`,
        text: actorId === localPlayerId
          ? "You build quickly. Consequence does not wait for understanding."
          : "Containment requires more than warning.",
        priority: 50,
        durationMs: 6_000,
      };
    }
  }

  return null;
}

function useLumiiCommentary(
  state: GameState,
  localPlayerId: string,
  suppressed: boolean,
): LumiiCommentaryCandidate | null {
  const previousRef = useRef<GameState | null>(null);
  const seenRef = useRef(new Set<string>());
  const lastShownAtRef = useRef(0);
  const pendingRef = useRef<LumiiCommentaryCandidate | null>(null);
  const clearTimerRef = useRef<number | null>(null);
  const releaseTimerRef = useRef<number | null>(null);
  const [message, setMessage] = useState<LumiiCommentaryCandidate | null>(null);

  const show = useCallback((candidate: LumiiCommentaryCandidate) => {
    lastShownAtRef.current = Date.now();
    pendingRef.current = null;
    setMessage(candidate);
    gameAudio.playLumiiSignal("hostile");
    if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(() => setMessage(null), candidate.durationMs);
  }, []);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = state;
    const candidate = selectLumiiCommentary(previous, state, localPlayerId);
    if (!candidate || seenRef.current.has(candidate.key)) return;
    seenRef.current.add(candidate.key);
    if (suppressed || message || Date.now() - lastShownAtRef.current < 8_000) {
      if (!pendingRef.current || pendingRef.current.priority < candidate.priority) {
        pendingRef.current = candidate;
      }
      return;
    }
    show(candidate);
  }, [localPlayerId, message, show, state, suppressed]);

  useEffect(() => {
    if (suppressed || message || !pendingRef.current) return;
    const waitMs = Math.max(0, 8_000 - (Date.now() - lastShownAtRef.current));
    if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = window.setTimeout(() => {
      if (pendingRef.current) show(pendingRef.current);
    }, waitMs);
    return () => {
      if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
    };
  }, [message, show, suppressed]);

  useEffect(() => () => {
    if (clearTimerRef.current !== null) window.clearTimeout(clearTimerRef.current);
    if (releaseTimerRef.current !== null) window.clearTimeout(releaseTimerRef.current);
  }, []);

  return message;
}

type LumiiEncounterHudProps = {
  state: GameState;
  localPlayerId: string;
  suppressed?: boolean;
  withdrawPending?: boolean;
  previewMessage?: string | null;
  onWithdraw?: () => void;
  placement?: "floating" | "docked";
};

export function LumiiEncounterHud({
  state,
  localPlayerId,
  suppressed = false,
  withdrawPending = false,
  previewMessage = null,
  onWithdraw,
  placement = "floating",
}: LumiiEncounterHudProps) {
  const commentary = useLumiiCommentary(state, localPlayerId, suppressed);
  const local = playerById(state, localPlayerId);
  const lumii = state.players.find((player) => player.isAi && player.playerName === "Lumii")
    ?? state.players.find((player) => player.isAi);
  const target = Math.max(1, state.victoryRequirement ?? DEFAULT_VICTORY_REQUIREMENT);
  const pressure = Math.min(1, Math.max(local?.eminence ?? 0, lumii?.eminence ?? 0) / target);
  const visibleMessage = previewMessage ?? commentary?.text ?? null;

  return (
    <aside
      className={`lumii-encounter-hud ${placement === "docked" ? "is-docked" : ""}`}
      aria-label="Lumii encounter status"
      data-placement={placement}
    >
      <div className="lumii-encounter-hud__bar">
        <span className="lumii-encounter-hud__orb" aria-hidden="true">
          <LumiiOrb size={80} speaking={visibleMessage !== null} coreGlow="red" appearance="hostile" />
        </span>
        <div className="lumii-encounter-hud__identity">
          <small>Defense Forecast</small>
          <strong>Lumii</strong>
        </div>
        <div className="lumii-encounter-hud__pressure">
          <span className="lumii-encounter-hud__pressure-label">Forecast Pressure</span>
          <div
            role="meter"
            aria-label="Forecast Pressure"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(pressure * 100)}
          >
            <i style={{ transform: `scaleX(${pressure})` }} />
          </div>
        </div>
        {onWithdraw && (
          <button
            type="button"
            onClick={onWithdraw}
            disabled={withdrawPending}
            aria-label="Withdraw to Vault"
            title="Withdraw to Vault"
          >
            {withdrawPending ? <Loader2 className="lumii-vault-encounter__spinner" /> : <DoorOpen aria-hidden="true" />}
          </button>
        )}
      </div>
      <AnimatePresence>
        {visibleMessage && !suppressed && (
          <motion.blockquote
            key={visibleMessage}
            className="lumii-encounter-hud__message"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
          >
            {visibleMessage}
          </motion.blockquote>
        )}
      </AnimatePresence>
    </aside>
  );
}
