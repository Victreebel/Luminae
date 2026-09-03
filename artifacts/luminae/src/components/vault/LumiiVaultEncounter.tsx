import {
  forwardRef,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type {
  ArtifactCard,
  GamePlayerState,
  GameState,
} from "@workspace/api-client-react";
import type {
  LumiiThresholdApproach,
  LumiiThresholdDialogueChoiceId,
  LumiiThresholdDialogueResolution,
} from "@workspace/game-types";
import {
  AlertTriangle,
  ArrowRight,
  DoorOpen,
  Loader2,
  LockKeyhole,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";
import { CipherSigil } from "@/components/CipherSigil";
import { LumiiOrb, type LumiiAppearance } from "@/components/LumiiTutorial";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import { useViewportSize } from "@/hooks/use-viewport-size";
import { gameAudio } from "@/lib/audio";
import {
  LUMII_AFFINITY_NODE_COUNT,
  LUMII_NATURAL_AFFINITIES,
  LUMII_NODE_COLORS,
} from "@/lib/lumiiIdentity";
import {
  outOfGameAudio,
  type LumiiThresholdScoreMood,
} from "@/lib/outOfGameAudio";
import {
  LUMII_APPROACH_CHOICES,
  LUMII_OUTCOME_DIALOGUE,
  LUMII_ROUTE_COMBAT_TRANSITION,
  LUMII_ROUTE_COMMENTARY,
  resolveLumiiDialogueNode,
  type LumiiDialogueAside,
  type LumiiDialogueChoice,
} from "./lumiiVaultNarrative";
import "@/components/archive/AccountArchive.css";
import "./LumiiVaultEncounter.css";

const AntimatterBlueprintCard = lazy(async () => {
  const module =
    await import("@/components/blueprints/AntimatterBlueprintCard");
  return { default: module.AntimatterBlueprintCard };
});

export const LUMII_CLEARANCE_SCENARIO_ID = "blueprint_clearance_lumii";
export const LUMII_THRESHOLD_TIMING = {
  cipherSurge: 600,
  cipherCollapse: 360,
  cipherInertHold: 180,
  cipherDismiss: 520,
  architectAuthorityCharge: 1_400,
  architectFracture: 2_600,
  architectRuptureHold: 450,
  architectRuptureRelease: 1_100,
  doorsOpen: 3_200,
  firewallDeploy: 520,
} as const;
const EMPTY_DIALOGUE_PATH: readonly LumiiThresholdDialogueChoiceId[] = [];

const ARCHITECT_CIPHER_SHARDS = [
  { x: "-34%", y: "-22%", releaseX: "-38%", releaseY: "88%", rotate: "-13deg" },
  { x: "-8%", y: "-34%", releaseX: "-14%", releaseY: "72%", rotate: "8deg" },
  { x: "28%", y: "-25%", releaseX: "35%", releaseY: "96%", rotate: "17deg" },
  { x: "38%", y: "-4%", releaseX: "45%", releaseY: "84%", rotate: "23deg" },
  { x: "30%", y: "24%", releaseX: "38%", releaseY: "116%", rotate: "31deg" },
  { x: "7%", y: "34%", releaseX: "10%", releaseY: "128%", rotate: "-8deg" },
  { x: "-26%", y: "28%", releaseX: "-33%", releaseY: "112%", rotate: "-24deg" },
  { x: "-40%", y: "4%", releaseX: "-47%", releaseY: "92%", rotate: "-18deg" },
  { x: "14%", y: "-11%", releaseX: "18%", releaseY: "76%", rotate: "27deg" },
  { x: "-12%", y: "15%", releaseX: "-17%", releaseY: "105%", rotate: "-32deg" },
] as const;

const ARCHITECT_CIPHER_CRACKS = [
  { x: 49, y: 49, angle: -100, length: 34, delay: 0 },
  { x: 48, y: 48, angle: 82, length: 40, delay: 120 },
  { x: 46, y: 40, angle: -154, length: 26, delay: 260 },
  { x: 45, y: 34, angle: -38, length: 28, delay: 370 },
  { x: 47, y: 52, angle: 163, length: 30, delay: 180 },
  { x: 52, y: 61, angle: 27, length: 32, delay: 330 },
  { x: 52, y: 71, angle: 145, length: 26, delay: 450 },
  { x: 54, y: 51, angle: -11, length: 32, delay: 230 },
  { x: 67, y: 57, angle: 58, length: 18, delay: 520 },
] as const;

export type VaultThresholdState = "sealed" | "arrested" | "hostile" | "open";
export type VaultCipherState =
  | "active"
  | "surging"
  | "collapsing"
  | "inert"
  | "dismissing"
  | "restoring"
  | "hidden";
export type CipherDismissalMode = "temporary" | "permanent";

export type LumiiEncounterPhase =
  | "sealed"
  | "expanding"
  | "cipher-surge"
  | "cipher-collapse"
  | "cipher-inert"
  | "cipher-dismiss"
  | "opening"
  | "approach"
  | "dialogue"
  | "threshold-choice"
  | "decision"
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
export type LumiiEncounterOutcome =
  | "entry"
  | "withdrawn"
  | "defeat"
  | "victory"
  | "reward";

export type VaultSourceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type ThresholdMotionOrigin = {
  x: number;
  y: number;
  scale: number;
};

const CENTERED_THRESHOLD_ORIGIN: ThresholdMotionOrigin = {
  x: 0,
  y: 0,
  scale: 0.94,
};

type VaultThresholdProps = {
  state?: VaultThresholdState;
  interactive?: boolean;
  ariaLabel?: string;
  sealLabel?: string;
  cipherState?: VaultCipherState;
  cipherDismissalMode?: CipherDismissalMode;
  onActivate?: (event: MouseEvent<HTMLButtonElement>) => void;
  className?: string;
};

export const VaultThreshold = forwardRef<
  HTMLButtonElement,
  VaultThresholdProps
>(function VaultThreshold(
  {
    state = "sealed",
    interactive = false,
    ariaLabel = "Sealed cosmic technology vault",
    sealLabel = "TOP SECRET",
    cipherState = state === "open" ? "hidden" : "active",
    cipherDismissalMode = "permanent",
    onActivate,
    className = "",
  },
  ref,
) {
  const open = state === "open";
  return (
    <button
      ref={ref}
      type="button"
      className={`account-vault__machine vault-threshold ${className}`.trim()}
      data-vault-state={state}
      data-cipher-state={cipherState}
      data-cipher-dismissal={cipherDismissalMode}
      data-interactive={interactive || undefined}
      aria-label={ariaLabel}
      disabled={!interactive}
      onClick={onActivate}
    >
      <span className="account-vault__interior" aria-hidden="true" />
      <span className="account-vault__stars" aria-hidden="true" />
      <span
        className="account-vault__orbit account-vault__orbit--outer"
        aria-hidden="true"
      />
      <span
        className="account-vault__orbit account-vault__orbit--middle"
        aria-hidden="true"
      />
      <span
        className="account-vault__orbit account-vault__orbit--inner"
        aria-hidden="true"
      />
      <span className="account-vault__clamps" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="account-vault__door" aria-hidden="true">
        <span className="account-vault__door-half account-vault__door-half--left" />
        <span className="account-vault__door-half account-vault__door-half--right" />
        <span className="account-vault__scan" />
      </span>
      <span className="account-vault__cipher-conduits" aria-hidden="true">
        {Array.from({ length: 6 }, (_, index) => (
          <i key={index} />
        ))}
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
      <span
        className="account-vault__cipher-sigil vault-threshold__cipher-whole vault-threshold__cipher-whole--energized"
        aria-hidden="true"
      >
        <CipherSigil affinityHex="#f3fbff" id={9721} />
      </span>
      <span
        className="account-vault__cipher-sigil vault-threshold__cipher-whole vault-threshold__cipher-whole--inert"
        aria-hidden="true"
      >
        <CipherSigil affinityHex="#46525a" id={9722} />
      </span>
      {(["left", "right"] as const).map((side, index) => (
        <span
          key={`inert-${side}`}
          className={`account-vault__cipher-sigil vault-threshold__cipher-half vault-threshold__cipher-half--${side} vault-threshold__cipher-half--inert`}
          aria-hidden="true"
        >
          <CipherSigil affinityHex="#56606a" id={9711 + index * 2} />
        </span>
      ))}
      {cipherDismissalMode === "permanent" && (
        <span className="vault-threshold__architect-rupture" aria-hidden="true">
          {ARCHITECT_CIPHER_CRACKS.map((crack, index) => (
            <i
              key={index}
              style={
                {
                  "--rupture-angle": `${crack.angle}deg`,
                  "--rupture-x": `${crack.x}%`,
                  "--rupture-y": `${crack.y}%`,
                  "--rupture-length": `${crack.length}%`,
                  "--rupture-delay": `${crack.delay}ms`,
                } as CSSProperties
              }
            />
          ))}
        </span>
      )}
      {cipherDismissalMode === "permanent" &&
        (cipherState === "collapsing" ||
          cipherState === "inert" ||
          cipherState === "dismissing") && (
          <span
            className="vault-threshold__architect-shards"
            aria-hidden="true"
          >
            {ARCHITECT_CIPHER_SHARDS.map((shard, index) => (
              <span
                key={index}
                className="vault-threshold__architect-shard"
                style={
                  {
                    "--shard-x": shard.x,
                    "--shard-y": shard.y,
                    "--shard-release-x": shard.releaseX,
                    "--shard-release-y": shard.releaseY,
                    "--shard-rotate": shard.rotate,
                  } as CSSProperties
                }
              >
                <CipherSigil affinityHex="#f3fbff" id={9740 + index} />
              </span>
            ))}
          </span>
        )}
      {open ? (
        <span className="account-vault__reveal" aria-hidden="true">
          <Sparkles />
          <span>{sealLabel}</span>
        </span>
      ) : (
        <span className="account-vault__seal" aria-hidden="true">
          <LockKeyhole />
          <span>{sealLabel}</span>
        </span>
      )}
      {interactive && (
        <span className="vault-threshold__focus" aria-hidden="true" />
      )}
    </button>
  );
});

function initialPhase(outcome: LumiiEncounterOutcome): LumiiEncounterPhase {
  if (outcome === "withdrawn") return "withdrawn";
  if (outcome === "defeat") return "defeat";
  if (outcome === "victory") return "victory";
  if (outcome === "reward") return "reward";
  return "expanding";
}

function thresholdStateForPhase(
  phase: LumiiEncounterPhase,
): VaultThresholdState {
  if (phase === "open" || phase === "reward") return "open";
  if (
    phase === "hostile" ||
    phase === "briefing" ||
    phase === "launching" ||
    phase === "board-entry" ||
    phase === "defeat"
  )
    return "hostile";
  if (
    phase === "opening" ||
    phase === "approach" ||
    phase === "dialogue" ||
    phase === "threshold-choice" ||
    phase === "decision" ||
    phase === "remembered" ||
    phase === "victory" ||
    phase === "victory-response"
  )
    return "arrested";
  return "sealed";
}

function cipherStateForPhase(
  phase: LumiiEncounterPhase,
  cipherDeactivated: boolean,
  cipherDismissalMode: CipherDismissalMode,
): VaultCipherState {
  if (phase === "cipher-surge") return "surging";
  if (phase === "cipher-collapse") return "collapsing";
  if (phase === "cipher-dismiss") return "dismissing";
  if (phase === "cipher-inert") {
    return "inert";
  }
  if (phase === "closing" && cipherDismissalMode === "temporary") {
    return "restoring";
  }
  if (cipherDeactivated && ["sealed", "expanding"].includes(phase)) {
    return cipherDismissalMode === "permanent" ? "hidden" : "inert";
  }
  if (!["sealed", "expanding"].includes(phase)) return "hidden";
  return "active";
}

function lumiiAppearanceForPhase(
  phase: LumiiEncounterPhase,
  covenantBroken: boolean,
): LumiiAppearance {
  if (phase === "decision") return "spectrum";
  if (phase === "victory" || phase === "victory-response" || phase === "open")
    return "yielding";
  if (
    covenantBroken ||
    phase === "hostile" ||
    phase === "briefing" ||
    phase === "launching" ||
    phase === "board-entry" ||
    phase === "defeat" ||
    phase === "withdrawn"
  )
    return "hostile";
  return "spectrum";
}

function phaseHasLumii(phase: LumiiEncounterPhase): boolean {
  return ![
    "sealed",
    "expanding",
    "cipher-surge",
    "cipher-collapse",
    "cipher-inert",
    "cipher-dismiss",
    "opening",
    "closing",
    "reward",
  ].includes(phase);
}

function phaseHasFirewall(phase: LumiiEncounterPhase): boolean {
  return [
    "approach",
    "dialogue",
    "threshold-choice",
    "decision",
    "remembered",
    "hostile",
    "briefing",
    "launching",
    "board-entry",
    "leaving",
    "withdrawn",
    "defeat",
    "victory",
    "victory-response",
  ].includes(phase);
}

function phaseKeepsThresholdCameraPushed(phase: LumiiEncounterPhase): boolean {
  return [
    "opening",
    "approach",
    "dialogue",
    "threshold-choice",
    "decision",
    "remembered",
    "hostile",
    "briefing",
    "launching",
    "board-entry",
    "leaving",
  ].includes(phase);
}

function inputGuardMsForPhase(
  phase: LumiiEncounterPhase,
  reducedMotion: boolean,
): number {
  if (reducedMotion) return 80;
  if (phase === "expanding") return 540;
  if (phase === "cipher-dismiss") return 500;
  if (phase === "opening" || phase === "leaving") return 820;
  return 280;
}

function thresholdScoreMoodForPhase(
  phase: LumiiEncounterPhase,
  doorsHalted: boolean,
): LumiiThresholdScoreMood | null {
  if (phase === "opening") return doorsHalted ? null : "cipher";
  if (
    [
      "approach",
      "dialogue",
      "threshold-choice",
      "decision",
      "remembered",
    ].includes(phase)
  )
    return null;
  if (["hostile", "briefing", "defeat", "withdrawn"].includes(phase))
    return "hostile";
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
  children,
  initiallyRevealed = false,
  onResponseReadyChange,
}: {
  lines: string | readonly string[];
  reducedMotion: boolean;
  children?: ReactNode;
  initiallyRevealed?: boolean;
  onResponseReadyChange?: (isReady: boolean) => void;
}) {
  const sentences = splitLumiiSentences(lines);
  const sentenceKey = sentences.join("\n");
  const [sentenceIndex, setSentenceIndex] = useState(
    initiallyRevealed ? Math.max(0, sentences.length - 1) : 0,
  );
  const [responsesRevealed, setResponsesRevealed] = useState(initiallyRevealed);
  const activeSentence =
    sentences[Math.min(sentenceIndex, sentences.length - 1)] ?? "";
  const isFinalSentence = sentenceIndex >= sentences.length - 1;
  const waitsForResponse =
    children !== undefined || onResponseReadyChange !== undefined;
  const canAdvance =
    !isFinalSentence || (waitsForResponse && !responsesRevealed);

  useLayoutEffect(() => {
    setSentenceIndex(initiallyRevealed ? Math.max(0, sentences.length - 1) : 0);
    setResponsesRevealed(initiallyRevealed);
    onResponseReadyChange?.(initiallyRevealed);
  }, [initiallyRevealed, onResponseReadyChange, sentenceKey, sentences.length]);

  useEffect(() => {
    onResponseReadyChange?.(responsesRevealed);
  }, [onResponseReadyChange, responsesRevealed]);

  const advanceSentence = () => {
    if (!isFinalSentence) {
      setSentenceIndex((value) => Math.min(value + 1, sentences.length - 1));
      return;
    }
    if (waitsForResponse) setResponsesRevealed(true);
  };

  return (
    <>
      <blockquote
        className="lumii-vault-encounter__sentence-reveal"
        data-sentence-index={sentenceIndex + 1}
        data-sentence-count={sentences.length}
        data-can-advance={canAdvance || undefined}
        data-response-ready={responsesRevealed || undefined}
        role={canAdvance ? "button" : undefined}
        tabIndex={canAdvance ? 0 : undefined}
        aria-label={canAdvance ? "Continue Lumii dialogue" : undefined}
        onClick={(event) => {
          if (!canAdvance) return;
          event.stopPropagation();
          advanceSentence();
        }}
        onKeyDown={(event) => {
          if (!canAdvance || (event.key !== "Enter" && event.key !== " "))
            return;
          event.preventDefault();
          event.stopPropagation();
          advanceSentence();
        }}
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
        {canAdvance && (
          <span
            className="lumii-vault-encounter__sentence-advance"
            aria-hidden="true"
          >
            <ArrowRight />
          </span>
        )}
      </blockquote>
      {responsesRevealed && children && (
        <motion.div
          className="lumii-vault-encounter__sentence-final"
          initial={reducedMotion ? false : { opacity: 0, y: 7 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
        >
          {children}
        </motion.div>
      )}
    </>
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
  cipherDismissalMode?: CipherDismissalMode;
  covenantBroken?: boolean;
  thresholdApproach?: LumiiThresholdApproach | null;
  dialoguePath?: readonly LumiiThresholdDialogueChoiceId[];
  dialogueResolution?: LumiiThresholdDialogueResolution | null;
  onLeave?: () => void;
  onDeactivateCipher?: () => Promise<void> | void;
  onChooseApproach?: (approach: LumiiThresholdApproach) => Promise<void> | void;
  onRecordDialoguePath?: (
    path: LumiiThresholdDialogueChoiceId[],
  ) =>
    | Promise<readonly LumiiThresholdDialogueChoiceId[] | void>
    | readonly LumiiThresholdDialogueChoiceId[]
    | void;
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
  cipherDismissalMode = "permanent",
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
  const viewportSize = useViewportSize();
  const systemReducedMotion = useReducedMotion();
  const reducedMotion = forceReducedMotion || systemReducedMotion === true;
  const [phase, setPhase] = useState<LumiiEncounterPhase>(() =>
    initialPhase(outcome),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [selectedApproach, setSelectedApproach] =
    useState<LumiiThresholdApproach | null>(thresholdApproach);
  const [selectedDialoguePath, setSelectedDialoguePath] = useState<
    LumiiThresholdDialogueChoiceId[]
  >(() => [...dialoguePath]);
  const [activeDialogueAside, setActiveDialogueAside] =
    useState<LumiiDialogueAside | null>(null);
  const [usedDialogueAsideIds, setUsedDialogueAsideIds] = useState<string[]>(
    [],
  );
  const [failedDialogueChoice, setFailedDialogueChoice] =
    useState<LumiiDialogueChoice | null>(null);
  const [combatTransition, setCombatTransition] = useState<string[] | null>(
    null,
  );
  const [cipherAttemptKey, setCipherAttemptKey] = useState(0);
  const [doorsHalted, setDoorsHalted] = useState(false);
  const [firewallReady, setFirewallReady] = useState(false);
  const [openReleaseReady, setOpenReleaseReady] = useState(false);
  const [rewardTerminalReady, setRewardTerminalReady] = useState(false);
  const [rewardOptionsRevealed, setRewardOptionsRevealed] = useState(false);
  const visiblePhase = controlledPhase ?? phase;
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const thresholdMeasureRef = useRef<HTMLDivElement | null>(null);
  const thresholdVisualRef = useRef<HTMLButtonElement | null>(null);
  const challengeReadyRef = useRef(false);
  const cipherDeactivatedRef = useRef(cipherDeactivated);
  const thresholdApproachRef = useRef(thresholdApproach);
  const dialogueResolutionRef = useRef(dialogueResolution);
  const onDeactivateCipherRef = useRef(onDeactivateCipher);
  const inputGuardUntilRef = useRef(Date.now() + 320);
  const audiblePhaseRef = useRef<LumiiEncounterPhase | null>(null);
  const [thresholdMotionOrigin, setThresholdMotionOrigin] =
    useState<ThresholdMotionOrigin | null>(() =>
      sourceRect && !reducedMotion ? null : CENTERED_THRESHOLD_ORIGIN,
    );
  const [thresholdOverlayCenter, setThresholdOverlayCenter] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const canLeave = [
    "approach",
    "dialogue",
    "threshold-choice",
    "remembered",
  ].includes(visiblePhase);
  const rewardTerminalUnlocked = reducedMotion || rewardTerminalReady;
  const transitionTo = useCallback(
    (nextPhase: LumiiEncounterPhase) => {
      if (controlledPhase && onPhaseChange) onPhaseChange(nextPhase);
      else setPhase(nextPhase);
    },
    [controlledPhase, onPhaseChange],
  );

  const continuePastThresholdWarning = useCallback(() => {
    transitionTo(
      attempt === "remembered" || dialogueResolutionRef.current !== null
        ? "remembered"
        : thresholdApproachRef.current
          ? "dialogue"
          : "approach",
    );
  }, [attempt, transitionTo]);

  useEffect(() => {
    cipherDeactivatedRef.current = cipherDeactivated;
    thresholdApproachRef.current = thresholdApproach;
    dialogueResolutionRef.current = dialogueResolution;
    onDeactivateCipherRef.current = onDeactivateCipher;
    if (thresholdApproach) {
      setSelectedApproach(thresholdApproach);
      setSelectedDialoguePath([...dialoguePath]);
      setActiveDialogueAside(null);
    }
  }, [
    cipherDeactivated,
    dialoguePath,
    dialogueResolution,
    onDeactivateCipher,
    thresholdApproach,
  ]);

  const requestLeave = useCallback(async () => {
    if (!canLeave || pending) return;
    const shouldRememberDialogue =
      dialogueResolutionRef.current === null &&
      (visiblePhase === "dialogue" || visiblePhase === "threshold-choice") &&
      (selectedApproach ?? thresholdApproach) !== null;
    const shouldPersistLeave = onResolveDialogue !== undefined;
    setError(null);
    if (shouldPersistLeave) setPending(true);
    try {
      if (shouldPersistLeave) await onResolveDialogue();
      dialogueResolutionRef.current = shouldRememberDialogue
        ? "left"
        : dialogueResolutionRef.current;
      transitionTo("leaving");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The threshold could not preserve your response.",
      );
    } finally {
      if (shouldPersistLeave) setPending(false);
    }
  }, [
    canLeave,
    onResolveDialogue,
    pending,
    selectedApproach,
    thresholdApproach,
    transitionTo,
    visiblePhase,
  ]);

  useFocusTrap(dialogRef, previewViewport === undefined, () => {
    void requestLeave();
  });

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    outOfGameAudio.stopOutOfMatchAmbient(0.18, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      outOfGameAudio.resumeOutOfMatchAmbient();
    };
  }, []);

  useEffect(() => {
    inputGuardUntilRef.current =
      Date.now() + inputGuardMsForPhase(visiblePhase, reducedMotion);
  }, [reducedMotion, visiblePhase]);

  useLayoutEffect(() => {
    if (!sourceRect || reducedMotion) {
      setThresholdMotionOrigin(CENTERED_THRESHOLD_ORIGIN);
      return;
    }
    const targetRect = thresholdMeasureRef.current?.getBoundingClientRect();
    if (!targetRect || targetRect.width <= 0 || targetRect.height <= 0) return;
    const sourceCenterX = sourceRect.x + sourceRect.width / 2;
    const sourceCenterY = sourceRect.y + sourceRect.height / 2;
    const targetCenterX = targetRect.left + targetRect.width / 2;
    const targetCenterY = targetRect.top + targetRect.height / 2;
    setThresholdMotionOrigin({
      x: sourceCenterX - targetCenterX,
      y: sourceCenterY - targetCenterY,
      scale: Math.max(0.12, Math.min(1, sourceRect.width / targetRect.width)),
    });
  }, [reducedMotion, sourceRect]);

  useLayoutEffect(() => {
    const stageRect = stageRef.current?.getBoundingClientRect();
    const thresholdRect = thresholdVisualRef.current?.getBoundingClientRect();
    if (!stageRect || !thresholdRect) return;
    setThresholdOverlayCenter({
      x: thresholdRect.left - stageRect.left + thresholdRect.width / 2,
      y: thresholdRect.top - stageRect.top + thresholdRect.height / 2,
    });
  }, [
    previewViewport,
    thresholdMotionOrigin,
    viewportSize.height,
    viewportSize.width,
    visiblePhase,
  ]);

  useEffect(() => {
    if (muted || audiblePhaseRef.current === visiblePhase) return;
    audiblePhaseRef.current = visiblePhase;
    switch (visiblePhase) {
      case "expanding":
        outOfGameAudio.playLumiiCinematic("threshold-expand");
        break;
      case "cipher-surge":
        outOfGameAudio.playLumiiCinematic(
          cipherDismissalMode === "permanent"
            ? "architect-cipher-pressure"
            : "cipher-surge",
        );
        break;
      case "cipher-collapse":
        outOfGameAudio.playLumiiCinematic(
          cipherDismissalMode === "permanent"
            ? "architect-cipher-fracture"
            : "cipher-collapse",
        );
        break;
      case "cipher-dismiss":
        outOfGameAudio.playLumiiCinematic(
          cipherDismissalMode === "permanent"
            ? "architect-cipher-release"
            : "cipher-dismiss",
        );
        break;
      case "opening":
        outOfGameAudio.playLumiiCinematic("vault-doors-open");
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
  }, [cipherDismissalMode, covenantBroken, muted, visiblePhase]);

  useEffect(() => {
    if (visiblePhase !== "opening") {
      setDoorsHalted(false);
      return undefined;
    }
    setDoorsHalted(false);
    const timer = window.setTimeout(
      () => {
        setDoorsHalted(true);
        if (!muted) {
          outOfGameAudio.stopLumiiThresholdScore(0.08);
          outOfGameAudio.playLumiiCinematic("vault-doors-halt");
        }
      },
      reducedMotion ? 160 : LUMII_THRESHOLD_TIMING.doorsOpen,
    );
    return () => window.clearTimeout(timer);
  }, [muted, reducedMotion, visiblePhase]);

  useEffect(() => {
    if (visiblePhase !== "approach") {
      setFirewallReady(false);
      return undefined;
    }
    setFirewallReady(false);
    const timer = window.setTimeout(
      () => setFirewallReady(true),
      reducedMotion ? 1 : LUMII_THRESHOLD_TIMING.firewallDeploy,
    );
    return () => window.clearTimeout(timer);
  }, [reducedMotion, visiblePhase]);

  useEffect(() => {
    if (visiblePhase !== "open") {
      setOpenReleaseReady(false);
      return undefined;
    }

    if (reducedMotion) {
      setOpenReleaseReady(true);
      return undefined;
    }

    setOpenReleaseReady(false);
    const timer = window.setTimeout(
      () => setOpenReleaseReady(true),
      LUMII_THRESHOLD_TIMING.doorsOpen + 120,
    );
    return () => window.clearTimeout(timer);
  }, [reducedMotion, visiblePhase]);

  useEffect(() => {
    if (muted) {
      outOfGameAudio.stopLumiiThresholdScore(0.18);
      return undefined;
    }
    const mood = thresholdScoreMoodForPhase(visiblePhase, doorsHalted);
    if (!mood) {
      outOfGameAudio.stopLumiiThresholdScore(
        visiblePhase === "opening" && doorsHalted ? 0.08 : 0.45,
      );
      return undefined;
    }
    outOfGameAudio.startLumiiThresholdScore(mood);
    if (
      ["board-entry", "closing", "withdrawn", "defeat"].includes(visiblePhase)
    ) {
      const timer = window.setTimeout(
        () =>
          outOfGameAudio.stopLumiiThresholdScore(
            visiblePhase === "board-entry" ? 0.85 : 0.55,
          ),
        reducedMotion ? 160 : visiblePhase === "board-entry" ? 650 : 900,
      );
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [doorsHalted, muted, reducedMotion, visiblePhase]);

  useEffect(
    () => () => {
      outOfGameAudio.stopLumiiThresholdScore(0.35);
    },
    [],
  );

  useEffect(() => {
    if (controlledPhase || outcome !== "entry") return;
    if (phase === "expanding") {
      const timer = window.setTimeout(
        () =>
          setPhase(
            cipherDeactivatedRef.current && cipherDismissalMode === "permanent"
              ? "opening"
              : cipherDeactivatedRef.current
                ? "cipher-dismiss"
                : "cipher-surge",
          ),
        reducedMotion ? 120 : 650,
      );
      return () => window.clearTimeout(timer);
    }
    if (phase === "cipher-surge") {
      let cancelled = false;
      setPending(true);
      setError(null);
      const minimum = new Promise<void>((resolve) => {
        window.setTimeout(
          resolve,
          reducedMotion
            ? 100
            : cipherDismissalMode === "permanent"
              ? LUMII_THRESHOLD_TIMING.architectAuthorityCharge
              : LUMII_THRESHOLD_TIMING.cipherSurge,
        );
      });
      void Promise.all([
        minimum,
        Promise.resolve(onDeactivateCipherRef.current?.()),
      ])
        .then(() => {
          if (cancelled) return;
          setPending(false);
          setPhase("cipher-collapse");
        })
        .catch((caught) => {
          if (cancelled) return;
          setPending(false);
          setError(
            caught instanceof Error
              ? caught.message
              : "The Supreme Cipher did not respond.",
          );
        });
      return () => {
        cancelled = true;
      };
    }
    if (phase === "cipher-collapse") {
      const timer = window.setTimeout(
        () => setPhase("cipher-inert"),
        reducedMotion
          ? 70
          : cipherDismissalMode === "permanent"
            ? LUMII_THRESHOLD_TIMING.architectFracture
            : LUMII_THRESHOLD_TIMING.cipherCollapse,
      );
      return () => window.clearTimeout(timer);
    }
    if (phase === "cipher-inert") {
      const timer = window.setTimeout(
        () => setPhase("cipher-dismiss"),
        reducedMotion
          ? 60
          : cipherDismissalMode === "permanent"
            ? LUMII_THRESHOLD_TIMING.architectRuptureHold
            : LUMII_THRESHOLD_TIMING.cipherInertHold,
      );
      return () => window.clearTimeout(timer);
    }
    if (phase === "cipher-dismiss") {
      const timer = window.setTimeout(
        () => setPhase("opening"),
        reducedMotion
          ? 100
          : cipherDismissalMode === "permanent"
            ? LUMII_THRESHOLD_TIMING.architectRuptureRelease
            : LUMII_THRESHOLD_TIMING.cipherDismiss,
      );
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [
    attempt,
    cipherAttemptKey,
    cipherDismissalMode,
    controlledPhase,
    muted,
    outcome,
    phase,
    reducedMotion,
  ]);

  useEffect(() => {
    if (controlledPhase || outcome !== "victory") return;
    if (phase === "open") {
      const timer = window.setTimeout(
        () => setPhase("reward"),
        reducedMotion ? 260 : LUMII_THRESHOLD_TIMING.doorsOpen + 280,
      );
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [controlledPhase, outcome, phase, reducedMotion]);

  useEffect(() => {
    if (visiblePhase !== "reward") {
      setRewardTerminalReady(false);
      setRewardOptionsRevealed(false);
      return undefined;
    }

    setRewardOptionsRevealed(false);
    if (reducedMotion) {
      setRewardTerminalReady(true);
      return undefined;
    }

    setRewardTerminalReady(false);
    const timer = window.setTimeout(() => setRewardTerminalReady(true), 1_650);
    return () => window.clearTimeout(timer);
  }, [reducedMotion, visiblePhase]);

  useEffect(() => {
    if (controlledPhase) return;
    const next =
      phase === "hostile"
        ? { phase: "briefing" as const, delay: reducedMotion ? 180 : 550 }
        : phase === "briefing"
          ? { phase: "launching" as const, delay: reducedMotion ? 220 : 2_000 }
          : phase === "launching"
            ? {
                phase: "board-entry" as const,
                delay: reducedMotion ? 100 : 700,
              }
            : null;
    if (!next) return;
    const timer = window.setTimeout(() => setPhase(next.phase), next.delay);
    return () => window.clearTimeout(timer);
  }, [controlledPhase, phase, reducedMotion]);

  useEffect(() => {
    if (
      controlledPhase ||
      phase !== "board-entry" ||
      !challengeReadyRef.current
    )
      return;
    const timer = window.setTimeout(
      () => onChallengeReady?.(),
      reducedMotion ? 120 : 700,
    );
    return () => window.clearTimeout(timer);
  }, [controlledPhase, onChallengeReady, phase, reducedMotion]);

  useEffect(() => {
    if (controlledPhase) return;
    if (phase === "leaving") {
      const timer = window.setTimeout(
        () => setPhase("closing"),
        reducedMotion ? 120 : 900,
      );
      return () => window.clearTimeout(timer);
    }
    if (phase !== "closing") return;
    const timer = window.setTimeout(onLeave, reducedMotion ? 120 : 850);
    return () => window.clearTimeout(timer);
  }, [controlledPhase, onLeave, phase, reducedMotion]);

  const chooseApproach = useCallback(
    async (approach: LumiiThresholdApproach) => {
      if (pending) return;
      setPending(true);
      setError(null);
      try {
        await onChooseApproach?.(approach);
        setSelectedApproach(approach);
        setSelectedDialoguePath([]);
        setActiveDialogueAside(null);
        setUsedDialogueAsideIds([]);
        setFailedDialogueChoice(null);
        transitionTo("dialogue");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "The threshold did not record your approach.",
        );
      } finally {
        setPending(false);
      }
    },
    [onChooseApproach, pending, transitionTo],
  );

  const recordDialogueChoice = useCallback(
    async (choice: LumiiDialogueChoice) => {
      if (pending) return;
      setActiveDialogueAside(null);
      const nextPath = [...selectedDialoguePath, choice.id];
      if (!onRecordDialoguePath) {
        setSelectedDialoguePath(nextPath);
        if (!muted) outOfGameAudio.play("navigate");
        return;
      }
      setPending(true);
      setError(null);
      setFailedDialogueChoice(null);
      try {
        const authoritativePath = await onRecordDialoguePath(nextPath);
        setSelectedDialoguePath(
          authoritativePath ? [...authoritativePath] : nextPath,
        );
        if (!muted) outOfGameAudio.play("navigate");
      } catch (caught) {
        setFailedDialogueChoice(choice);
        setError(
          caught instanceof Error
            ? caught.message
            : "Response not saved. Your place is preserved. Try again.",
        );
      } finally {
        setPending(false);
      }
    },
    [muted, onRecordDialoguePath, pending, selectedDialoguePath],
  );

  const playDialogueAside = useCallback(
    (aside: LumiiDialogueAside) => {
      if (pending) return;
      setUsedDialogueAsideIds((current) =>
        current.includes(aside.id) ? current : [...current, aside.id],
      );
      setActiveDialogueAside(aside);
      if (!muted) outOfGameAudio.play("navigate");
    },
    [muted, pending],
  );

  const continueOpening = useCallback(
    async (transitionLines?: readonly string[]) => {
      if (pending) return;
      setPending(true);
      setError(null);
      try {
        await onBeginChallenge?.();
        challengeReadyRef.current = true;
        setCombatTransition(transitionLines ? [...transitionLines] : null);
        transitionTo(transitionLines?.length ? "decision" : "hostile");
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "The defense forecast could not begin.",
        );
      } finally {
        setPending(false);
      }
    },
    [onBeginChallenge, pending, transitionTo],
  );

  const completeCombatDecision = useCallback(
    (ready: boolean) => {
      if (ready) transitionTo("hostile");
    },
    [transitionTo],
  );

  const advanceStaticPhase = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (
        (controlledPhase && !onPhaseChange) ||
        pending ||
        Date.now() < inputGuardUntilRef.current
      )
        return;
      if (
        (event.target as HTMLElement).closest(
          "button, a, input, select, textarea",
        )
      )
        return;
      if (visiblePhase === "expanding") {
        transitionTo(
          cipherDeactivated && cipherDismissalMode === "permanent"
            ? "opening"
            : cipherDeactivated
              ? "cipher-dismiss"
              : "cipher-surge",
        );
      } else if (visiblePhase === "cipher-collapse")
        transitionTo("cipher-inert");
      else if (visiblePhase === "cipher-inert") transitionTo("cipher-dismiss");
      else if (visiblePhase === "cipher-dismiss") transitionTo("opening");
      else if (visiblePhase === "opening" && doorsHalted)
        continuePastThresholdWarning();
      else if (visiblePhase === "hostile") transitionTo("launching");
      else if (visiblePhase === "briefing") transitionTo("launching");
      else if (visiblePhase === "launching") transitionTo("board-entry");
      else if (visiblePhase === "leaving") transitionTo("closing");
      else if (visiblePhase === "open" && openReleaseReady)
        transitionTo("reward");
    },
    [
      cipherDeactivated,
      cipherDismissalMode,
      continuePastThresholdWarning,
      controlledPhase,
      doorsHalted,
      onPhaseChange,
      openReleaseReady,
      pending,
      transitionTo,
      visiblePhase,
    ],
  );

  const previewFrameTop = viewportSize.width <= 880 ? 104 : 68;
  const previewFrameHeight = `calc(100dvh - ${previewFrameTop + 12}px)`;
  const previewTarget =
    previewViewport === "mobile"
      ? {
          top: previewFrameTop,
          left: "calc(50vw - min(195px, calc(50vw - 10px)))",
          width: "min(390px, calc(100vw - 20px))",
          height: previewFrameHeight,
          borderRadius: 6,
          opacity: 1,
        }
      : previewViewport === "desktop"
        ? {
            top: previewFrameTop,
            left: 12,
            width: "calc(100vw - 24px)",
            height: previewFrameHeight,
            borderRadius: 6,
            opacity: 1,
          }
        : null;
  const frameBounds = previewTarget ?? {
    top: 0,
    left: 0,
    width: "100vw",
    height: "100dvh",
    borderRadius: 0,
  };
  const frameInitial = { ...frameBounds, opacity: 0 };
  const frameTarget = {
    ...frameBounds,
    opacity: thresholdMotionOrigin ? 1 : 0,
  };

  const appearance = lumiiAppearanceForPhase(visiblePhase, covenantBroken);
  const thresholdState = thresholdStateForPhase(visiblePhase);
  const cipherState = cipherStateForPhase(
    visiblePhase,
    cipherDeactivated,
    cipherDismissalMode,
  );
  const thresholdCameraMotion =
    visiblePhase === "opening"
      ? doorsHalted
        ? "halted"
        : "advancing"
      : phaseKeepsThresholdCameraPushed(visiblePhase)
        ? "settled"
        : undefined;
  const hostile = appearance === "hostile";
  const lumiiArrivalOffset = Math.min(
    previewViewport === "mobile" ? 180 : 280,
    viewportSize.width * 0.24,
  );
  const route = selectedApproach ?? thresholdApproach ?? "inquiry";
  const activeCombatTransition =
    combatTransition ?? LUMII_ROUTE_COMBAT_TRANSITION[route];
  const dialogueNode = resolveLumiiDialogueNode(route, selectedDialoguePath);
  const dialogueAsides = (dialogueNode.asides ?? []).filter(
    (aside) => !usedDialogueAsideIds.includes(aside.id),
  );
  const dialogueAsideWasUsed = (dialogueNode.asides ?? []).some((aside) =>
    usedDialogueAsideIds.includes(aside.id),
  );
  const outcomeDialogue = LUMII_OUTCOME_DIALOGUE[route];
  const routeEscalationLabel =
    route === "kinship"
      ? "I need to know what frightened you."
      : route === "dominion"
        ? "Then stop me."
        : "I need to see it for myself.";

  const runChallengeAgain = async () => {
    if (!onChallengeAgain || pending) return;
    setPending(true);
    try {
      await onChallengeAgain();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The confrontation could not be restored.",
      );
      setPending(false);
    }
  };

  const enterVault = async () => {
    if (pending) return;
    setPending(true);
    try {
      await onEnterVault?.();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The Vault record could not be acknowledged.",
      );
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
      data-cipher-dismissal={cipherDismissalMode}
      data-doors-halted={doorsHalted || undefined}
      data-firewall-ready={firewallReady || undefined}
      data-threshold-camera={thresholdCameraMotion}
      data-preview-viewport={previewViewport}
      data-reduced-motion={reducedMotion || undefined}
      onClick={advanceStaticPhase}
      initial={frameInitial}
      animate={frameTarget}
      transition={{
        duration: reducedMotion ? 0.1 : 0.28,
        ease: [0.2, 0.72, 0.18, 1],
      }}
      style={
        {
          "--lumii-door-open-duration": `${reducedMotion ? 1 : LUMII_THRESHOLD_TIMING.doorsOpen}ms`,
          backgroundImage: `linear-gradient(rgba(2,4,9,.48), rgba(2,4,9,.88)), url(${backgroundCosmos})`,
        } as CSSProperties
      }
    >
      <div className="lumii-vault-encounter__shade" aria-hidden="true" />
      <header className="lumii-vault-encounter__header">
        <span>
          {visiblePhase === "reward"
            ? "OUTER VAULT ACCESS"
            : "LUMII // DIRECT INTERRUPTION"}
        </span>
        <strong>
          {visiblePhase === "reward" ? "Blueprint Vault" : "The Threshold"}
        </strong>
      </header>

      <div ref={stageRef} className="lumii-vault-encounter__stage">
        {thresholdMotionOrigin ? (
          <motion.div
            ref={thresholdMeasureRef}
            className="lumii-vault-encounter__threshold-motion"
            data-returning={visiblePhase === "closing" || undefined}
            initial={
              visiblePhase === "expanding"
                ? { ...thresholdMotionOrigin, opacity: 1 }
                : { x: 0, y: 0, scale: 0.96, opacity: 0 }
            }
            animate={
              visiblePhase === "closing"
                ? { ...thresholdMotionOrigin, opacity: 1 }
                : { x: 0, y: 0, scale: 1, opacity: 1 }
            }
            transition={{
              duration: reducedMotion
                ? 0.12
                : visiblePhase === "closing"
                  ? 0.85
                  : 0.65,
              ease: [0.2, 0.72, 0.18, 1],
            }}
          >
            <VaultThreshold
              ref={thresholdVisualRef}
              state={thresholdState}
              cipherState={cipherState}
              cipherDismissalMode={cipherDismissalMode}
              sealLabel={
                thresholdState === "open"
                  ? "REDACTION LIFTED"
                  : hostile
                    ? "CONTESTED"
                    : cipherState === "inert"
                      ? "THRESHOLD ARRESTED"
                      : "TOP SECRET"
              }
              className="lumii-vault-encounter__threshold"
            />
          </motion.div>
        ) : (
          <div
            ref={thresholdMeasureRef}
            className="lumii-vault-encounter__threshold-motion is-measuring"
            aria-hidden="true"
          >
            <VaultThreshold
              ref={thresholdVisualRef}
              state={thresholdState}
              cipherState={cipherState}
              cipherDismissalMode={cipherDismissalMode}
              sealLabel="TOP SECRET"
              className="lumii-vault-encounter__threshold"
            />
          </div>
        )}

        <AnimatePresence>
          {phaseHasLumii(visiblePhase) && (
            <div
              key="lumii-presence"
              className="lumii-vault-encounter__lumii-anchor"
              data-testid="lumii-vault-presence"
              style={
                thresholdOverlayCenter
                  ? {
                      left: thresholdOverlayCenter.x,
                      top: thresholdOverlayCenter.y,
                    }
                  : undefined
              }
            >
              <motion.div
                className="lumii-vault-encounter__lumii"
                data-arriving={
                  ["approach", "dialogue", "remembered"].includes(
                    visiblePhase,
                  ) || undefined
                }
                data-combative-shift={visiblePhase === "hostile" || undefined}
                data-retreating={visiblePhase === "leaving" || undefined}
                initial={
                  ["approach", "dialogue", "remembered"].includes(visiblePhase)
                    ? { opacity: 0, x: lumiiArrivalOffset, scale: 0.92 }
                    : { opacity: 0, x: 0, scale: 0.68 }
                }
                animate={{
                  opacity:
                    visiblePhase === "leaving"
                      ? 0
                      : visiblePhase === "open"
                        ? 0.46
                        : 1,
                  x: 0,
                  scale:
                    visiblePhase === "leaving"
                      ? 0.62
                      : visiblePhase === "victory"
                        ? 0.92
                        : 1,
                }}
                exit={{ opacity: 0, scale: 0.75 }}
                transition={{
                  duration: reducedMotion
                    ? 0.15
                    : visiblePhase === "leaving"
                      ? 0.58
                      : ["approach", "dialogue", "remembered"].includes(
                            visiblePhase,
                          )
                        ? 1.05
                        : 0.7,
                  delay: reducedMotion
                    ? 0
                    : visiblePhase === "approach"
                      ? 0.54
                      : 0,
                  ease: [0.18, 0.76, 0.2, 1],
                }}
              >
                <span
                  className="lumii-vault-encounter__combative-flare"
                  aria-hidden="true"
                />
                <div className="lumii-vault-encounter__lumii-float">
                  <LumiiOrb
                    size={210}
                    speaking={[
                      "dialogue",
                      "remembered",
                      "hostile",
                      "withdrawn",
                      "defeat",
                      "victory",
                      "victory-response",
                      "open",
                    ].includes(visiblePhase)}
                    still={visiblePhase === "decision"}
                    excited={hostile}
                    whiteGlow={!hostile}
                    coreGlow={hostile ? "red" : "white"}
                    appearance={appearance}
                    beatKey={visiblePhase}
                  />
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {phaseHasFirewall(visiblePhase) && (
          <div
            className="lumii-vault-encounter__firewall-anchor"
            aria-hidden="true"
            style={
              thresholdOverlayCenter
                ? {
                    left: thresholdOverlayCenter.x,
                    top: thresholdOverlayCenter.y,
                  }
                : undefined
            }
          >
            <div className="lumii-vault-encounter__firewall-camera">
              <motion.div
                className="lumii-vault-encounter__firewall"
                data-phase={visiblePhase}
                data-hostile={hostile || undefined}
                data-retreating={visiblePhase === "leaving" || undefined}
                data-testid="lumii-vault-firewall"
                data-node-count={LUMII_AFFINITY_NODE_COUNT}
                initial={{ opacity: 0, scale: 1 }}
                animate={{
                  opacity:
                    visiblePhase === "leaving"
                      ? 0
                      : visiblePhase === "board-entry"
                        ? 0.12
                        : 1,
                  scale:
                    visiblePhase === "leaving"
                      ? 0.28
                      : visiblePhase === "board-entry"
                        ? 0.24
                        : 1,
                }}
                transition={{
                  duration: reducedMotion
                    ? 0.15
                    : visiblePhase === "leaving"
                      ? 0.58
                      : 0.35,
                  ease: "easeOut",
                }}
              >
                {Array.from(
                  { length: LUMII_AFFINITY_NODE_COUNT },
                  (_, index) => (
                    <i
                      key={index}
                      style={
                        {
                          "--firewall-angle": `${index * (360 / LUMII_AFFINITY_NODE_COUNT)}deg`,
                          "--firewall-deploy-delay": `${35 + index * 40}ms`,
                          "--firewall-idle-delay": `${index * -410}ms`,
                          "--firewall-node-color":
                            LUMII_NODE_COLORS[LUMII_NATURAL_AFFINITIES[index]!],
                        } as CSSProperties
                      }
                    />
                  ),
                )}
              </motion.div>
            </div>
          </div>
        )}
      </div>

      <div className="lumii-vault-encounter__copy" aria-live="polite">
        {visiblePhase === "cipher-surge" && error && (
          <div>
            <p className="lumii-vault-encounter__error">{error}</p>
            <div className="lumii-vault-encounter__choices single">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setCipherAttemptKey((value) => value + 1);
                }}
              >
                <RotateCcw aria-hidden="true" /> Try again
              </button>
            </div>
          </div>
        )}

        {visiblePhase === "opening" && doorsHalted && (
          <motion.div
            key="threshold-warning"
            initial={{ opacity: 0, y: 9 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span>LUMII</span>
            <LumiiSentenceReveal
              lines="Architect, please wait."
              reducedMotion={reducedMotion}
            />
            <AnimatePresence>
              {doorsHalted && (
                <motion.button
                  type="button"
                  className="lumii-vault-encounter__cinematic-advance"
                  aria-label="Continue to Lumii"
                  initial={{ opacity: 0, scale: 0.84 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={continuePastThresholdWarning}
                >
                  <ArrowRight aria-hidden="true" />
                </motion.button>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {visiblePhase === "approach" && (
          <motion.div
            key="approach"
            initial={{ opacity: 0, y: 9 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: reducedMotion ? 0 : 1.28 }}
          >
            <span>LUMII</span>
            {error && <p className="lumii-vault-encounter__error">{error}</p>}
            <div className="lumii-vault-encounter__choices is-routes">
              {(
                Object.entries(LUMII_APPROACH_CHOICES) as Array<
                  [LumiiThresholdApproach, string]
                >
              ).map(([approach, label]) => (
                <button
                  key={approach}
                  type="button"
                  onClick={() => void chooseApproach(approach)}
                  disabled={pending}
                >
                  <span>{label}</span>
                  <ArrowRight aria-hidden="true" />
                </button>
              ))}
              <button
                type="button"
                className="is-secondary"
                onClick={() => void requestLeave()}
                disabled={pending}
              >
                <DoorOpen aria-hidden="true" />
                <span>Leave the Vault</span>
              </button>
            </div>
          </motion.div>
        )}

        {visiblePhase === "dialogue" && (
          <motion.div
            key={`${route}-${selectedDialoguePath.join(".") || "root"}-${activeDialogueAside?.id ?? "main"}`}
            initial={{ opacity: 0, y: 9 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span>LUMII</span>
            <LumiiSentenceReveal
              lines={activeDialogueAside?.replies ?? dialogueNode.replies}
              reducedMotion={reducedMotion}
              initiallyRevealed={!activeDialogueAside && dialogueAsideWasUsed}
            >
              {activeDialogueAside ? (
                <div className="lumii-vault-encounter__choices single">
                  <button
                    type="button"
                    onClick={() => setActiveDialogueAside(null)}
                  >
                    <span>Continue</span>
                    <ArrowRight aria-hidden="true" />
                  </button>
                </div>
              ) : (
                <div
                  className={`lumii-vault-encounter__choices ${dialogueNode.choices?.length === 1 ? "single-plus-leave" : ""}`}
                >
                  {dialogueNode.choices?.map((choice) => (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => void recordDialogueChoice(choice)}
                      disabled={pending}
                    >
                      <span>{choice.label}</span>
                      <ArrowRight aria-hidden="true" />
                    </button>
                  ))}
                  {dialogueNode.complete && (
                    <button
                      type="button"
                      className="is-commitment"
                      onClick={() =>
                        void continueOpening(dialogueNode.combatTransition)
                      }
                      disabled={pending}
                    >
                      <span className="lumii-vault-encounter__commitment-copy">
                        <span>
                          {dialogueNode.escalationLabel ?? routeEscalationLabel}
                        </span>
                        <small>
                          <AlertTriangle aria-hidden="true" />
                          Commits to opposing Lumii · opening the Vault
                        </small>
                      </span>
                      <ArrowRight aria-hidden="true" />
                    </button>
                  )}
                  {dialogueNode.optionalChoices?.map((choice) => (
                    <button
                      key={`optional-${choice.id}`}
                      type="button"
                      className="is-secondary"
                      onClick={() => void recordDialogueChoice(choice)}
                      disabled={pending}
                    >
                      <span>{choice.label}</span>
                      <ArrowRight aria-hidden="true" />
                    </button>
                  ))}
                  {dialogueAsides.map((aside) => (
                    <button
                      key={`aside-${aside.id}`}
                      type="button"
                      className="is-secondary"
                      onClick={() => playDialogueAside(aside)}
                      disabled={pending}
                    >
                      <span>{aside.label}</span>
                      <ArrowRight aria-hidden="true" />
                    </button>
                  ))}
                  {failedDialogueChoice && (
                    <button
                      type="button"
                      className="is-secondary"
                      onClick={() =>
                        void recordDialogueChoice(failedDialogueChoice)
                      }
                      disabled={pending}
                    >
                      <RotateCcw aria-hidden="true" />
                      <span>Retry response</span>
                    </button>
                  )}
                  <button
                    type="button"
                    className="is-secondary"
                    onClick={() => void requestLeave()}
                    disabled={pending}
                  >
                    <DoorOpen aria-hidden="true" />
                    <span>Leave the Vault</span>
                  </button>
                </div>
              )}
            </LumiiSentenceReveal>
            {error && <p className="lumii-vault-encounter__error">{error}</p>}
          </motion.div>
        )}

        {visiblePhase === "threshold-choice" && (
          <div>
            <div className="lumii-vault-encounter__choices">
              <button
                type="button"
                className="is-commitment"
                onClick={() => void continueOpening()}
                disabled={pending}
              >
                <span className="lumii-vault-encounter__commitment-copy">
                  <span>{routeEscalationLabel}</span>
                  <small>
                    <AlertTriangle aria-hidden="true" />
                    Commits to opposing Lumii · opening the Vault
                  </small>
                </span>
                <ArrowRight aria-hidden="true" />
              </button>
              <button
                type="button"
                className="is-secondary"
                onClick={() => void requestLeave()}
                disabled={pending}
              >
                <DoorOpen aria-hidden="true" /> Leave the Vault
              </button>
            </div>
          </div>
        )}

        {visiblePhase === "remembered" && (
          <motion.div
            key={`remembered-${covenantBroken}`}
            initial={{ opacity: 0, y: 9 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span>LUMII</span>
            <LumiiSentenceReveal
              lines={
                covenantBroken
                  ? "You know what follows."
                  : "I hoped you would not return."
              }
              reducedMotion={reducedMotion}
            >
              <div className="lumii-vault-encounter__choices">
                <button
                  type="button"
                  className="is-commitment"
                  onClick={() => void continueOpening()}
                  disabled={pending}
                >
                  <span className="lumii-vault-encounter__commitment-copy">
                    <span>Proceed</span>
                    <small>
                      <AlertTriangle aria-hidden="true" />
                      Commits to opposing Lumii · opening the Vault
                    </small>
                  </span>
                  <ArrowRight aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="is-secondary"
                  onClick={() => void requestLeave()}
                  disabled={pending}
                >
                  <DoorOpen aria-hidden="true" /> Withdraw
                </button>
              </div>
            </LumiiSentenceReveal>
            {error && <p className="lumii-vault-encounter__error">{error}</p>}
          </motion.div>
        )}

        {visiblePhase === "decision" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <span>LUMII</span>
            <LumiiSentenceReveal
              lines={activeCombatTransition}
              reducedMotion={reducedMotion}
              onResponseReadyChange={completeCombatDecision}
            />
          </motion.div>
        )}

        {(visiblePhase === "hostile" ||
          visiblePhase === "briefing" ||
          visiblePhase === "launching" ||
          visiblePhase === "board-entry") && (
          <motion.div
            className="lumii-vault-encounter__briefing"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <span>
              <AlertTriangle aria-hidden="true" /> COVENANT BROKEN
            </span>
            <b>DEFENSE FORECAST</b>
            <strong>TIER I COLLATERAL ANNIHILATION IS POSSIBLE.</strong>
            <small>This rupture will be remembered.</small>
            {pending && (
              <Loader2
                className="lumii-vault-encounter__spinner"
                aria-label="Opening confrontation"
              />
            )}
          </motion.div>
        )}

        {visiblePhase === "withdrawn" && (
          <div>
            <span>LUMII</span>
            <LumiiSentenceReveal
              lines="Then let the threshold stand."
              reducedMotion={reducedMotion}
            >
              <div className="lumii-vault-encounter__choices single">
                <button type="button" onClick={onLeave}>
                  <DoorOpen aria-hidden="true" /> Return to Vault
                </button>
              </div>
            </LumiiSentenceReveal>
          </div>
        )}

        {visiblePhase === "defeat" && (
          <div>
            <span>LUMII</span>
            <LumiiSentenceReveal
              lines="Now I know. I can stop you."
              reducedMotion={reducedMotion}
            >
              <div
                className={`lumii-vault-encounter__choices ${onChallengeAgain ? "" : "single"}`}
              >
                {onChallengeAgain && (
                  <button
                    type="button"
                    onClick={() => void runChallengeAgain()}
                    disabled={pending}
                  >
                    {pending ? (
                      <Loader2 className="lumii-vault-encounter__spinner" />
                    ) : (
                      <RotateCcw aria-hidden="true" />
                    )}
                    Challenge again
                  </button>
                )}
                <button
                  type="button"
                  className="is-secondary"
                  onClick={onLeave}
                  disabled={pending}
                >
                  <DoorOpen aria-hidden="true" /> Return to Vault
                </button>
              </div>
            </LumiiSentenceReveal>
            {error && <p className="lumii-vault-encounter__error">{error}</p>}
          </div>
        )}

        {visiblePhase === "leaving" && (
          <div>
            <span>LUMII</span>
            <LumiiSentenceReveal
              lines="Thank you."
              reducedMotion={reducedMotion}
            />
          </div>
        )}

        {visiblePhase === "victory" && (
          <div>
            <span>LUMII</span>
            <LumiiSentenceReveal
              lines="I have seen enough."
              reducedMotion={reducedMotion}
            >
              <div className="lumii-vault-encounter__choices single">
                <button
                  type="button"
                  onClick={() => transitionTo("victory-response")}
                >
                  {outcomeDialogue.question}
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </LumiiSentenceReveal>
          </div>
        )}

        {visiblePhase === "victory-response" && (
          <div>
            <span>LUMII</span>
            <LumiiSentenceReveal
              lines={outcomeDialogue.answer}
              reducedMotion={reducedMotion}
            >
              <div className="lumii-vault-encounter__choices single">
                <button type="button" onClick={() => transitionTo("open")}>
                  Continue
                  <ArrowRight aria-hidden="true" />
                </button>
              </div>
            </LumiiSentenceReveal>
          </div>
        )}

        {visiblePhase === "open" && (
          <div>
            <span>LUMII</span>
            <LumiiSentenceReveal
              lines="I will release the doors."
              reducedMotion={reducedMotion}
            />
          </div>
        )}

        {visiblePhase === "reward" && (
          <div className="lumii-vault-encounter__reward">
            <motion.div
              className="lumii-vault-encounter__reward-terminal"
              data-testid="lumii-vault-terminal"
              data-unlocked={rewardTerminalUnlocked || undefined}
              initial={reducedMotion ? false : { opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.52, ease: [0.18, 0.76, 0.2, 1] }}
            >
              <div className="lumii-vault-encounter__terminal-header">
                <span>VAULT TERMINAL</span>
                <b>OUTER VAULT ACCESS</b>
              </div>
              <div className="lumii-vault-encounter__terminal-grid" aria-hidden="true" />
              <motion.div
                className="lumii-vault-encounter__terminal-unlock"
                aria-hidden="true"
                initial={reducedMotion ? false : { opacity: 0, scaleX: 0.08 }}
                animate={
                  rewardTerminalUnlocked
                    ? { opacity: 0, scaleX: 1 }
                    : { opacity: [0, 1, 0.7], scaleX: [0.08, 0.74, 1] }
                }
                transition={{
                  duration: reducedMotion ? 0 : 1.45,
                  ease: "easeInOut",
                }}
              />
              <motion.div
                className="lumii-vault-encounter__terminal-record"
                initial={reducedMotion ? false : { opacity: 0, y: 14 }}
                animate={
                  rewardTerminalUnlocked
                    ? { opacity: 1, y: 0 }
                    : { opacity: 0.34, y: 8 }
                }
                transition={{ duration: 0.46, ease: "easeOut" }}
              >
                <span>BLUEPRINT // 01 RECOVERED</span>
                <div className="lumii-vault-encounter__terminal-card-bay">
                  <Suspense
                    fallback={
                      <Loader2 className="lumii-vault-encounter__spinner" />
                    }
                  >
                    <AntimatterBlueprintCard
                      state="manifested"
                      presentation="card"
                      matchedSockets={4}
                      covenantBroken
                    />
                  </Suspense>
                </div>
              </motion.div>
            </motion.div>
            <AnimatePresence>
              {rewardTerminalUnlocked && (
                <motion.div
                  className="lumii-vault-encounter__reward-dialogue"
                  initial={reducedMotion ? false : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <p>
                    <span>ARCHITECT</span> This is what you were guarding?
                  </p>
                  <div className="lumii-vault-encounter__reward-lumii">
                    <span>LUMII</span>
                    <LumiiSentenceReveal
                      lines="It is dangerous. But what frightened me has not yet taken shape."
                      reducedMotion={reducedMotion}
                      onResponseReadyChange={setRewardOptionsRevealed}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {error && <p className="lumii-vault-encounter__error">{error}</p>}
            {rewardOptionsRevealed && (
              <motion.button
                type="button"
                initial={reducedMotion ? false : { opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => void enterVault()}
                disabled={pending}
              >
                {pending ? (
                  <Loader2 className="lumii-vault-encounter__spinner" />
                ) : (
                  <Sparkles aria-hidden="true" />
                )}
                Enter Vault
              </motion.button>
            )}
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

function playerById(
  state: GameState,
  playerId: string | undefined,
): GamePlayerState | undefined {
  return playerId
    ? state.players.find((player) => player.playerId === playerId)
    : undefined;
}

function forgeCardForAction(
  state: GameState,
  action: Record<string, unknown>,
): ArtifactCard | undefined {
  const actor = playerById(
    state,
    typeof action.playerId === "string" ? action.playerId : undefined,
  );
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
  const lumii =
    current.players.find(
      (player) => player.isAi && player.playerName === "Lumii",
    ) ?? current.players.find((player) => player.isAi);
  const previousLocal = playerById(previous, localPlayerId);
  const previousLumii = lumii
    ? playerById(previous, lumii.playerId)
    : undefined;
  if (!local || !lumii || !previousLocal || !previousLumii) return null;
  const route = current.lumiiThresholdApproach ?? "inquiry";
  const routeCopy = LUMII_ROUTE_COMMENTARY[route];

  const target = Math.max(1, current.victoryRequirement ?? 15);
  for (const threshold of [target - 1, target - 3]) {
    if (local.eminence >= threshold && previousLocal.eminence < threshold) {
      return {
        key: `near-victory:player:${threshold}`,
        text:
          threshold === target - 1
            ? routeCopy["player-final"]
            : routeCopy["player-near"],
        priority: threshold === target - 1 ? 100 : 92,
        durationMs: 6_200,
      };
    }
    if (lumii.eminence >= threshold && previousLumii.eminence < threshold) {
      return {
        key: `near-victory:lumii:${threshold}`,
        text:
          threshold === target - 1
            ? routeCopy["lumii-final"]
            : routeCopy["lumii-near"],
        priority: threshold === target - 1 ? 98 : 90,
        durationMs: 5_400,
      };
    }
  }

  const previousProtocolEffects = eventIds(
    previous.pendingScenarioProtocolEvents?.filter(
      (event) => event.kind === "effect",
    ),
  );
  const previousDetonations = eventIds(
    previous.pendingBlueprintDetonationEvents,
  );
  const detonation =
    current.pendingScenarioProtocolEvents?.find(
      (event) =>
        event.kind === "effect" && !previousProtocolEffects.has(event.eventId),
    ) ??
    current.pendingBlueprintDetonationEvents?.find(
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
    previous.pendingScenarioProtocolEvents?.filter(
      (event) => event.kind === "manifestation",
    ),
  );
  const previousManifestations = eventIds(
    previous.pendingBlueprintManifestationEvents,
  );
  const manifestation =
    current.pendingScenarioProtocolEvents?.find(
      (event) =>
        event.kind === "manifestation" &&
        !previousProtocolManifestations.has(event.eventId),
    ) ??
    current.pendingBlueprintManifestationEvents?.find(
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
  const summon = current.pendingSummonEvents?.find(
    (event) => !previousSummons.has(event.eventId),
  );
  if (summon) {
    return {
      key: `luminary:${summon.eventId}`,
      text:
        summon.claimedByPlayerId === localPlayerId
          ? routeCopy["player-luminary"]
          : routeCopy["lumii-luminary"],
      priority: 70,
      durationMs: 5_800,
    };
  }

  const previousLeader =
    previousLocal.eminence === previousLumii.eminence
      ? "tie"
      : previousLocal.eminence > previousLumii.eminence
        ? "player"
        : "lumii";
  const currentLeader =
    local.eminence === lumii.eminence
      ? "tie"
      : local.eminence > lumii.eminence
        ? "player"
        : "lumii";
  const margin = Math.abs(local.eminence - lumii.eminence);
  if (
    currentLeader !== previousLeader &&
    currentLeader !== "tie" &&
    margin >= 2
  ) {
    return {
      key: `lead:${current.version}:${currentLeader}`,
      text:
        currentLeader === "player"
          ? "You are advancing. That does not make the threshold safer."
          : "You may still withdraw.",
      priority: 58,
      durationMs: 5_600,
    };
  }

  const action = current.lastAction;
  if (
    action &&
    (action.type === "forge_artifact" ||
      action.type === "forge_reserved_artifact")
  ) {
    const card = forgeCardForAction(current, action);
    if (card && (card.tier === 3 || card.eminence >= 3)) {
      const actorId =
        typeof action.playerId === "string" ? action.playerId : "unknown";
      return {
        key: `major-forge:${current.version}:${actorId}:${card.id}`,
        text:
          actorId === localPlayerId
            ? "That was not an encouraging sound."
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
    if (clearTimerRef.current !== null)
      window.clearTimeout(clearTimerRef.current);
    clearTimerRef.current = window.setTimeout(
      () => setMessage(null),
      candidate.durationMs,
    );
  }, []);

  useEffect(() => {
    const previous = previousRef.current;
    previousRef.current = state;
    const candidate = selectLumiiCommentary(previous, state, localPlayerId);
    if (!candidate || seenRef.current.has(candidate.key)) return;
    seenRef.current.add(candidate.key);
    if (suppressed || message || Date.now() - lastShownAtRef.current < 8_000) {
      if (
        !pendingRef.current ||
        pendingRef.current.priority < candidate.priority
      ) {
        pendingRef.current = candidate;
      }
      return;
    }
    show(candidate);
  }, [localPlayerId, message, show, state, suppressed]);

  useEffect(() => {
    if (suppressed || message || !pendingRef.current) return;
    const waitMs = Math.max(0, 8_000 - (Date.now() - lastShownAtRef.current));
    if (releaseTimerRef.current !== null)
      window.clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = window.setTimeout(() => {
      if (pendingRef.current) show(pendingRef.current);
    }, waitMs);
    return () => {
      if (releaseTimerRef.current !== null)
        window.clearTimeout(releaseTimerRef.current);
    };
  }, [message, show, suppressed]);

  useEffect(
    () => () => {
      if (clearTimerRef.current !== null)
        window.clearTimeout(clearTimerRef.current);
      if (releaseTimerRef.current !== null)
        window.clearTimeout(releaseTimerRef.current);
    },
    [],
  );

  return message;
}

type LumiiEncounterHudProps = {
  state: GameState;
  localPlayerId: string;
  suppressed?: boolean;
  withdrawPending?: boolean;
  previewMessage?: string | null;
  absorbPulseKey?: number | null;
  onWithdraw?: () => void;
  menuAction?: ReactNode;
  placement?: "floating" | "docked";
};

export function LumiiEncounterHud({
  state,
  localPlayerId,
  suppressed = false,
  withdrawPending = false,
  previewMessage = null,
  absorbPulseKey = null,
  onWithdraw,
  menuAction,
  placement = "floating",
}: LumiiEncounterHudProps) {
  const commentary = useLumiiCommentary(state, localPlayerId, suppressed);
  const local = playerById(state, localPlayerId);
  const lumii =
    state.players.find(
      (player) => player.isAi && player.playerName === "Lumii",
    ) ?? state.players.find((player) => player.isAi);
  const target = Math.max(1, state.victoryRequirement ?? 15);
  const localScore = local?.eminence ?? 0;
  const lumiiScore = lumii?.eminence ?? 0;
  const pressure = Math.min(1, Math.max(localScore, lumiiScore) / target);
  const visibleMessage = previewMessage ?? commentary?.text ?? null;
  const currentPlayer = state.players[state.currentPlayerIndex] ?? null;
  const isLumiiTurn = Boolean(
    lumii && currentPlayer?.playerId === lumii.playerId,
  );
  const isLocalTurn = currentPlayer?.playerId === localPlayerId;
  const absorbingArtifact = absorbPulseKey !== null;
  const turnStatus = isLumiiTurn
    ? "Lumii calculating"
    : isLocalTurn
      ? null
      : currentPlayer
        ? `${currentPlayer.playerName}'s turn`
        : null;

  return (
    <aside
      className={`lumii-encounter-hud ${placement === "docked" ? "is-docked" : ""}`}
      aria-label="Lumii encounter status"
      data-placement={placement}
      data-lumii-turn={isLumiiTurn ? "true" : undefined}
      data-lumii-absorbing={absorbingArtifact ? "true" : undefined}
    >
      <div className="lumii-encounter-hud__bar">
        <div className="lumii-encounter-hud__identity">
          <span
            className="lumii-encounter-hud__entity"
            data-testid="lumii-encounter-hud-entity"
            data-lumii-hud-entity="true"
            aria-hidden="true"
          >
            <LumiiOrb
              size={52}
              speaking={visibleMessage !== null || isLumiiTurn}
              excited={absorbingArtifact}
              burst={absorbingArtifact}
              burstColor="#ff3858"
              coreGlow="red"
              appearance="hostile"
            />
          </span>
          <span className="lumii-encounter-hud__identity-copy">
            <small>Defense Forecast</small>
            <strong
              className="lumii-encounter-hud__name-pill"
              data-lumii-hud-name-pill="true"
            >
              Lumii
            </strong>
          </span>
        </div>
        <div className="lumii-encounter-hud__pressure">
          <span className="lumii-encounter-hud__pressure-row">
            <span className="lumii-encounter-hud__pressure-copy">
              <span className="lumii-encounter-hud__pressure-label">
                Forecast Pressure
              </span>
              <span className="lumii-encounter-hud__score">
                You {localScore} · Lumii {lumiiScore}
              </span>
            </span>
            {turnStatus && (
              <span
                className="lumii-encounter-hud__turn-status"
                data-turn={isLumiiTurn ? "lumii" : "other"}
              >
                {turnStatus}
              </span>
            )}
          </span>
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
        {(onWithdraw || menuAction) && (
          <div className="lumii-encounter-hud__actions">
            {onWithdraw && (
              <button
                type="button"
                onClick={onWithdraw}
                disabled={withdrawPending}
                aria-label="Withdraw to Vault"
                title="Withdraw to Vault"
              >
                {withdrawPending ? (
                  <Loader2 className="lumii-vault-encounter__spinner" />
                ) : (
                  <DoorOpen aria-hidden="true" />
                )}
              </button>
            )}
            {menuAction}
          </div>
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
