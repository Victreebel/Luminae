import { useEffect, useMemo, useState } from "react";
import type { GameState } from "@workspace/api-client-react";
import {
  DEFAULT_VICTORY_REQUIREMENT,
  type LumiiThresholdApproach,
} from "@workspace/game-types";
import { Monitor, Play, RotateCcw, Smartphone, Square, Volume2, VolumeX, Waves } from "lucide-react";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";
import { ScenarioProtocolPresentationOverlay } from "@/components/blueprints/ScenarioProtocolPresentationOverlay";
import {
  LumiiEncounterHud,
  LumiiVaultEncounter,
  type LumiiEncounterAttempt,
  type LumiiEncounterPhase,
  type VaultSourceRect,
} from "@/components/vault/LumiiVaultEncounter";
import { LUMII_ROUTE_COMMENTARY } from "@/components/vault/lumiiVaultNarrative";
import { gameAudio } from "@/lib/audio";
import { outOfGameAudio } from "@/lib/outOfGameAudio";

type PreviewOnlyPhase =
  | "hud"
  | "commentary"
  | "protocol-manifestation"
  | "protocol-effect"
  | "peaceful-retry"
  | "hostile-retry";
type PreviewPhase = LumiiEncounterPhase | PreviewOnlyPhase;
type CipherPreviewState = "active" | "inert";
type CovenantPreviewState = "intact" | "broken";

const PHASES: Array<{ id: PreviewPhase; label: string }> = [
  { id: "sealed", label: "Sealed" },
  { id: "expanding", label: "Expand" },
  { id: "cipher-surge", label: "Cipher surge" },
  { id: "cipher-collapse", label: "Cipher collapse" },
  { id: "cipher-inert", label: "Cipher inert" },
  { id: "opening", label: "Doors 35%" },
  { id: "approach", label: "Approach" },
  { id: "dialogue", label: "Dialogue" },
  { id: "threshold-choice", label: "Final choice" },
  { id: "leaving", label: "Early leave" },
  { id: "peaceful-retry", label: "Peaceful retry" },
  { id: "hostile-retry", label: "Broken retry" },
  { id: "hostile", label: "Hostility" },
  { id: "briefing", label: "Covenant" },
  { id: "launching", label: "Forecast" },
  { id: "board-entry", label: "Board entry" },
  { id: "hud", label: "HUD" },
  { id: "commentary", label: "Commentary" },
  { id: "protocol-manifestation", label: "Protocol appears" },
  { id: "protocol-effect", label: "Protocol effect" },
  { id: "withdrawn", label: "Withdrawal" },
  { id: "defeat", label: "Defeat" },
  { id: "victory", label: "Victory" },
  { id: "victory-response", label: "Yield response" },
  { id: "open", label: "Full opening" },
  { id: "reward", label: "Reward" },
];

const ROUTES: LumiiThresholdApproach[] = ["kinship", "inquiry", "dominion"];

function initialParam<T extends string>(name: string, fallback: T, allowed: readonly T[]): T {
  const value = new URLSearchParams(window.location.search).get(name) as T | null;
  return value && allowed.includes(value) ? value : fallback;
}

function makePreviewState(
  route: LumiiThresholdApproach,
  protocolPhase: "manifestation" | "effect" | null,
): GameState {
  const protocolEvent = protocolPhase ? {
    eventId: `preview-protocol-${protocolPhase}`,
    protocolId: "sealed_protocol_01" as const,
    ownerPlayerId: "lumii",
    slotIndex: 0,
    kind: protocolPhase,
    publicEffect: "The first opposing Forge or Encrypt may annihilate its target and up to two Tier I Artifacts.",
    ...(protocolPhase === "effect" ? {
      triggeringPlayerId: "architect",
      targetCardId: "preview-target",
      trigger: "forged" as const,
      hostileEffect: "annihilation" as const,
      targetArtifact: {
        id: "preview-target",
        name: "Causal Spark Coil",
        tier: 1 as const,
        bonusAffinity: "radiance" as const,
        eminence: 1,
        cost: { flare: 0, continuum: 1, verdance: 0, abyss: 0, radiance: 1, singularity: 0 },
        flavor: "A public Artifact consequence.",
      },
      collateralCardIds: ["preview-collateral-a", "preview-collateral-b"],
    } : {}),
    createdAt: 1,
  } : null;

  return {
    roomId: "lumii-preview-room",
    status: "playing",
    scenarioId: "blueprint_clearance_lumii",
    traceScenario: null,
    recurrenceScenario: null,
    triangulationScenario: null,
    finishReason: null,
    lumiiThresholdApproach: route,
    startedAt: 1,
    openingTurnOrder: null,
    canReplaySameBoard: true,
    currentPlayerIndex: 0,
    roundNumber: 8,
    turnCount: 15,
    victoryRequirement: DEFAULT_VICTORY_REQUIREMENT,
    cinematicMode: "epic",
    affinityWell: { flare: 3, continuum: 4, verdance: 2, abyss: 3, radiance: 4, singularity: 1 },
    forgeTier1: [],
    forgeTier2: [],
    forgeTier3: [],
    deckCounts: { tier1: 22, tier2: 17, tier3: 10 },
    luminaries: [],
    luminaryAffinities: [],
    players: [
      {
        playerId: "architect",
        playerName: "Architect",
        civName: "The Unsealed",
        avatarId: null,
        isAi: false,
        aiDifficulty: null,
        affinities: { flare: 2, continuum: 2, verdance: 1, abyss: 1, radiance: 2, singularity: 0 },
        bonuses: { flare: 1, continuum: 0, verdance: 1, abyss: 0, radiance: 0, singularity: 0 },
        eminence: 12,
        reservedArtifacts: [],
        forgedArtifactIds: [],
        assimilatedArtifactIds: [],
        discountedForgeIds: [],
        forgedArtifacts: [],
        isConnected: true,
        claimedLuminaryIds: [],
        plannedAction: null,
        plannedActionCancelReason: null,
        blueprintPrivateStates: [],
        manifestedBlueprintDevices: [],
      },
      {
        playerId: "lumii",
        playerName: "Lumii",
        civName: null,
        avatarId: null,
        isAi: true,
        aiDifficulty: "hard",
        affinities: { flare: 2, continuum: 2, verdance: 2, abyss: 2, radiance: 2, singularity: 0 },
        bonuses: { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0 },
        eminence: 10,
        reservedArtifacts: [],
        forgedArtifactIds: [],
        assimilatedArtifactIds: [],
        discountedForgeIds: [],
        forgedArtifacts: [],
        isConnected: true,
        claimedLuminaryIds: [],
        plannedAction: null,
        plannedActionCancelReason: null,
        blueprintPrivateStates: [],
        manifestedBlueprintDevices: [],
      },
    ],
    winnerId: null,
    winTriggerLuminaryId: null,
    lastAction: null,
    actionLog: [],
    turnTimerSeconds: null,
    turnDeadline: null,
    version: 1,
    pendingSummonEvents: [],
    pendingLuminaryActivationEvents: [],
    pendingBlueprintManifestationEvents: [],
    pendingBlueprintDetonationEvents: [],
    scenarioProtocols: [{
      protocolId: "sealed_protocol_01",
      ownerPlayerId: "lumii",
      slotIndex: 0,
      state: "armed",
      publicEffect: "The first opposing Forge or Encrypt may annihilate its target and up to two Tier I Artifacts.",
    }],
    pendingScenarioProtocolEvents: protocolEvent ? [protocolEvent] : [],
    pendingTurnTransition: null,
    brokenCovenantDeclared: true,
  };
}

function productionPhase(phase: PreviewPhase): LumiiEncounterPhase | null {
  if (["hud", "commentary", "protocol-manifestation", "protocol-effect"].includes(phase)) return null;
  if (phase === "peaceful-retry" || phase === "hostile-retry") return "remembered";
  return phase as LumiiEncounterPhase;
}

export default function DevLumiiVaultEncounter() {
  const phaseIds = useMemo(() => PHASES.map((item) => item.id), []);
  const [phase, setPhase] = useState<PreviewPhase>(() => initialParam("phase", "approach", phaseIds));
  const [route, setRoute] = useState<LumiiThresholdApproach>(() => initialParam("route", "inquiry", ROUTES));
  const [attempt, setAttempt] = useState<LumiiEncounterAttempt>(() => initialParam("attempt", "first", ["first", "remembered"]));
  const [cipher, setCipher] = useState<CipherPreviewState>(() => initialParam("cipher", "active", ["active", "inert"]));
  const [covenant, setCovenant] = useState<CovenantPreviewState>(() => initialParam("covenant", "intact", ["intact", "broken"]));
  const [viewport, setViewport] = useState<"desktop" | "mobile">(() => initialParam("viewport", "desktop", ["desktop", "mobile"]));
  const [muted, setMuted] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("audio") === "muted" || params.get("muted") === "1";
  });
  const [reducedMotion, setReducedMotion] = useState(() => initialParam("motion", "full", ["full", "reduced"]) === "reduced");
  const [sequenceMode, setSequenceMode] = useState(() => initialParam("mode", "inspect", ["inspect", "sequence"]) === "sequence");
  const [replayKey, setReplayKey] = useState(0);
  const [sequenceKey, setSequenceKey] = useState(0);
  const protocolPhase = phase === "protocol-manifestation"
    ? "manifestation"
    : phase === "protocol-effect" ? "effect" : null;
  const state = useMemo(() => makePreviewState(route, protocolPhase), [protocolPhase, route]);
  const encounterPhase = productionPhase(phase);
  const boardOnly = encounterPhase === null;
  const effectiveCovenant = phase === "hostile-retry" ? true : phase === "peaceful-retry" ? false : covenant === "broken";
  const effectiveAttempt = phase === "peaceful-retry" || phase === "hostile-retry" ? "remembered" : attempt;
  const previewSourceRect = useMemo<VaultSourceRect>(() => {
    const compactToolbar = window.innerWidth <= 880;
    const frameTop = compactToolbar ? 104 : 68;
    const frameLeft = viewport === "mobile"
      ? Math.max(10, (window.innerWidth - Math.min(390, window.innerWidth - 20)) / 2)
      : 12;
    const frameWidth = viewport === "mobile"
      ? Math.min(390, window.innerWidth - 20)
      : window.innerWidth - 24;
    const frameHeight = Math.max(320, window.innerHeight - frameTop - 12);
    const size = Math.min(viewport === "mobile" ? 108 : 150, frameHeight * 0.24);
    return {
      x: frameLeft + frameWidth / 2 - size / 2,
      y: frameTop + frameHeight / 2 - size / 2,
      width: size,
      height: size,
    };
  }, [viewport]);

  const startSequence = () => {
    if (attempt === "first") {
      setCipher("active");
      setCovenant("intact");
    } else {
      setCipher("inert");
    }
    setPhase("expanding");
    setSequenceKey((value) => value + 1);
    setSequenceMode(true);
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.delete("muted");
    params.set("phase", phase);
    params.set("route", route);
    params.set("attempt", attempt);
    params.set("cipher", cipher);
    params.set("covenant", covenant);
    params.set("viewport", viewport);
    params.set("audio", muted ? "muted" : "on");
    params.set("motion", reducedMotion ? "reduced" : "full");
    params.set("mode", sequenceMode ? "sequence" : "inspect");
    window.history.replaceState(null, "", `${window.location.pathname}?${params.toString()}`);
  }, [attempt, cipher, covenant, muted, phase, reducedMotion, route, sequenceMode, viewport]);

  useEffect(() => {
    gameAudio.setMuted(muted);
    outOfGameAudio.setMuted(muted);
  }, [muted]);

  return (
    <main className="dev-lumii-encounter" style={{ backgroundImage: `url(${backgroundCosmos})` }}>
      <nav className="dev-lumii-encounter__controls" aria-label="Lumii encounter preview controls">
        <div className="dev-lumii-encounter__phase-tabs">
          {PHASES.map((item) => (
            <button key={item.id} type="button" data-active={!sequenceMode && phase === item.id} onClick={() => { setSequenceMode(false); setPhase(item.id); }}>
              {item.label}
            </button>
          ))}
        </div>
        <div className="dev-lumii-encounter__tools">
          {ROUTES.map((item) => <button key={item} type="button" data-active={route === item} onClick={() => setRoute(item)}>{item}</button>)}
          <button type="button" data-active={cipher === "inert"} onClick={() => setCipher((value) => value === "active" ? "inert" : "active")}>Cipher {cipher}</button>
          <button type="button" data-active={covenant === "broken"} onClick={() => setCovenant((value) => value === "intact" ? "broken" : "intact")}>Covenant {covenant}</button>
          <button type="button" data-active={attempt === "remembered"} onClick={() => setAttempt((value) => value === "first" ? "remembered" : "first")}>{attempt}</button>
          <button
            type="button"
            aria-label={sequenceMode ? "Stop full encounter" : "Play full encounter"}
            title={sequenceMode ? "Stop full encounter" : "Play full encounter"}
            data-active={sequenceMode}
            onClick={() => sequenceMode ? setSequenceMode(false) : startSequence()}
          >
            {sequenceMode ? <Square /> : <Play />}
          </button>
          <button type="button" aria-label="Desktop preview" data-active={viewport === "desktop"} onClick={() => setViewport("desktop")}><Monitor /></button>
          <button type="button" aria-label="Mobile preview" data-active={viewport === "mobile"} onClick={() => setViewport("mobile")}><Smartphone /></button>
          <button type="button" aria-label={muted ? "Enable audio" : "Mute audio"} data-active={muted} onClick={() => setMuted((value) => !value)}>{muted ? <VolumeX /> : <Volume2 />}</button>
          <button type="button" aria-label="Toggle reduced motion" data-active={reducedMotion} onClick={() => setReducedMotion((value) => !value)}><Waves /></button>
          <button
            type="button"
            aria-label={sequenceMode ? "Restart full encounter" : "Replay phase"}
            title={sequenceMode ? "Restart full encounter" : "Replay phase"}
            onClick={() => sequenceMode ? setSequenceKey((value) => value + 1) : setReplayKey((value) => value + 1)}
          >
            <RotateCcw />
          </button>
        </div>
      </nav>

      {sequenceMode ? (
        <LumiiVaultEncounter
          key={`sequence-${sequenceKey}-${attempt}-${viewport}-${reducedMotion}`}
          sourceRect={previewSourceRect}
          attempt={attempt}
          cipherDeactivated={attempt === "remembered" || cipher === "inert"}
          covenantBroken={covenant === "broken"}
          thresholdApproach={attempt === "remembered" ? route : null}
          muted={muted}
          forceReducedMotion={reducedMotion}
          previewViewport={viewport}
          onLeave={() => { setSequenceMode(false); setCipher("inert"); setPhase("sealed"); }}
          onDeactivateCipher={() => setCipher("inert")}
          onChooseApproach={(approach) => setRoute(approach)}
          onBeginChallenge={() => setCovenant("broken")}
          onChallengeReady={() => { setSequenceMode(false); setPhase("hud"); }}
        />
      ) : boardOnly ? (
        <section className="dev-lumii-encounter__board" data-viewport={viewport}>
          <div className="dev-lumii-encounter__forge" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
          </div>
          <div className="dev-lumii-encounter__well" aria-hidden="true" />
          <LumiiEncounterHud
            state={state}
            localPlayerId="architect"
            previewMessage={phase === "commentary" ? LUMII_ROUTE_COMMENTARY[route]["player-near"] : null}
            onWithdraw={() => setPhase("withdrawn")}
          />
          {protocolPhase && state.pendingScenarioProtocolEvents[0] && (
            <ScenarioProtocolPresentationOverlay
              key={`${protocolPhase}-${replayKey}`}
              event={state.pendingScenarioProtocolEvents[0]}
              reducedMotion={reducedMotion}
              onComplete={() => setPhase("hud")}
            />
          )}
        </section>
      ) : (
        <LumiiVaultEncounter
          key={`${phase}-${route}-${effectiveAttempt}-${cipher}-${effectiveCovenant}-${viewport}-${replayKey}`}
          controlledPhase={encounterPhase}
          attempt={effectiveAttempt}
          cipherDeactivated={cipher === "inert"}
          covenantBroken={effectiveCovenant}
          thresholdApproach={route}
          muted={muted}
          forceReducedMotion={reducedMotion}
          previewViewport={viewport}
          onLeave={() => { setCipher("inert"); setPhase("sealed"); }}
          onDeactivateCipher={() => setCipher("inert")}
          onChooseApproach={(approach) => setRoute(approach)}
          onBeginChallenge={() => setCovenant("broken")}
          onChallengeReady={() => setPhase("hud")}
          onChallengeAgain={() => setPhase("hostile-retry")}
          onEnterVault={() => setPhase("sealed")}
          onPhaseChange={(nextPhase) => setPhase(nextPhase)}
        />
      )}
    </main>
  );
}
