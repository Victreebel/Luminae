import { useMemo, useState } from "react";
import type {
  AffinityCounts,
  ArtifactCard,
  BlueprintDefinition,
  GamePlayerState,
  GameState,
} from "@workspace/api-client-react";
import { DEFAULT_VICTORY_REQUIREMENT } from "@workspace/game-types";
import {
  ARTIFACT_DEFINITION_BY_ID,
  BLUEPRINT_DEFINITIONS,
  type ArtifactId,
} from "@workspace/game-types";
import { HandTab, type HandTabScope } from "@/pages/game-tabs";
import { EMPTY_CIVILIZATION_PROFILE } from "@/lib/civilizationProfile";

type CovenantState = "intact" | "broken";
type MotionState = "full" | "reduced";

const FOUNDRY_COMPONENT_NAMES: Record<string, string> = {
  t1r07: "Entropy Pyre Baffle",
  t1s02: "Mantlelift Driver Coil",
  t1o05: "Blackglass Forge Die",
};

const ORDINARY_ENCRYPTED_NAMES: Record<string, string> = {
  t1e01: "Replication Spore",
  t1s01: "Echo Splinter",
  t1p01: "Correction Seed",
};

const foundrySource = BLUEPRINT_DEFINITIONS.bp_mantle_to_orbit_foundry;
const FOUNDRY_PUBLIC_DEFINITION: BlueprintDefinition = {
  ...foundrySource,
  components: foundrySource.components.map((component) => ({ ...component })),
  presentation: { ...foundrySource.presentation },
  civilization: {
    ...foundrySource.civilization,
    triggerWindows: [...foundrySource.civilization.triggerWindows],
    pressureTags: [...foundrySource.civilization.pressureTags],
    providedCapabilityIds: [...foundrySource.civilization.providedCapabilityIds],
    interactingCapabilityIds: [...foundrySource.civilization.interactingCapabilityIds],
  },
};

function emptyAffinities(): AffinityCounts {
  return {
    flare: 0,
    continuum: 0,
    verdance: 0,
    abyss: 0,
    radiance: 0,
    singularity: 0,
  };
}

function artifactCard(id: ArtifactId, name: string): ArtifactCard {
  return {
    ...ARTIFACT_DEFINITION_BY_ID[id],
    name,
    flavor: "",
  } as ArtifactCard;
}

function initialQueryValue<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  const value = new URLSearchParams(window.location.search).get(key);
  return allowed.includes(value as T) ? value as T : fallback;
}

function replaceQuery(covenant: CovenantState, motion: MotionState) {
  const url = new URL(window.location.href);
  url.searchParams.set("covenant", covenant);
  url.searchParams.set("motion", motion);
  window.history.replaceState(null, "", url);
}

export default function DevFoundryStorage() {
  const [covenant, setCovenant] = useState<CovenantState>(() =>
    initialQueryValue("covenant", ["intact", "broken"] as const, "intact"),
  );
  const [motion, setMotion] = useState<MotionState>(() =>
    initialQueryValue("motion", ["full", "reduced"] as const, "full"),
  );
  const [remainingFoundryIds, setRemainingFoundryIds] = useState<string[]>(() =>
    BLUEPRINT_DEFINITIONS.bp_mantle_to_orbit_foundry.components.map((component) => component.artifactId),
  );

  const { scope } = useMemo(() => {
    const ordinaryCards = Object.entries(ORDINARY_ENCRYPTED_NAMES).map(([id, name]) =>
      artifactCard(id as ArtifactId, name),
    );
    const foundryCards = remainingFoundryIds.map((id) =>
      artifactCard(id as ArtifactId, FOUNDRY_COMPONENT_NAMES[id] ?? id),
    );
    const localPlayer: GamePlayerState = {
      playerId: "architect",
      playerName: "Architect",
      avatarId: null,
      isAi: false,
      aiDifficulty: null,
      affinities: emptyAffinities(),
      bonuses: emptyAffinities(),
      eminence: 6,
      reservedArtifacts: [...ordinaryCards, ...foundryCards],
      forgedArtifactIds: [],
      discountedForgeIds: [],
      forgedArtifacts: [],
      isConnected: true,
      claimedLuminaryIds: [],
      plannedAction: null,
      plannedActionCancelReason: null,
      civName: "The Ascendant Compact",
      blueprintPrivateStates: [{
        blueprintId: "bp_mantle_to_orbit_foundry",
        slotIndex: 0,
        matchedComponentIds: BLUEPRINT_DEFINITIONS.bp_mantle_to_orbit_foundry.components.map(
          (component) => component.artifactId,
        ),
        manifested: true,
        foundryStoredArtifactIds: remainingFoundryIds,
      }],
      manifestedBlueprintDevices: [{
        blueprintId: "bp_mantle_to_orbit_foundry",
        definition: FOUNDRY_PUBLIC_DEFINITION,
        ownerPlayerId: "architect",
        slotIndex: 0,
        state: covenant === "broken" ? "recovering" : "spent",
        presentationVariant: "armored",
        foundryUsesRemaining: 0,
      }],
    };
    const state: GameState = {
      roomId: "dev-foundry-storage",
      status: "playing",
      scenarioId: null,
      finishReason: null,
      lumiiThresholdApproach: null,
      traceScenario: null,
      recurrenceScenario: null,
      triangulationScenario: null,
      startedAt: 1,
      openingTurnOrder: null,
      canReplaySameBoard: false,
      currentPlayerIndex: 0,
      roundNumber: 4,
      turnCount: 18,
      victoryRequirement: DEFAULT_VICTORY_REQUIREMENT,
      cinematicMode: "standard",
      affinityWell: emptyAffinities(),
      forgeTier1: [],
      forgeTier2: [],
      forgeTier3: [],
      deckCounts: { tier1: 0, tier2: 0, tier3: 0 },
      luminaries: [],
      luminaryAffinities: [],
      players: [localPlayer],
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
      pendingCivilizationEventCards: [],
      civilizationEventDeck: {
        definitionIds: ["event_stellar_containment_cascade"],
        nextIndex: 0,
        firedWindows: [],
        completedEventIds: [],
      },
      scenarioProtocols: [],
      pendingScenarioProtocolEvents: [],
      pendingTurnTransition: null,
    };
    const noOp = () => undefined;
    const scopeValue: HandTabScope = {
      activationGateActive: false,
      activationQueue: [],
      brandDelayMap: new Map(),
      cardDetailDiscovered: true,
      civEditValue: localPlayer.civName ?? "",
      civLabel: localPlayer.civName ?? "Civilization",
      civilizationDeploymentSites: [],
      civilizationProfile: EMPTY_CIVILIZATION_PROFILE,
      computeCosts: (card) => card.cost,
      costMode: "needed_now",
      expandedLumEffects: new Set(),
      forgedView: "cards",
      hintsEnabled: false,
      handleCancelPlan: noOp,
      handleCardTap: noOp,
      handleFoundryRecovery: (artifactId) => {
        if (covenant === "broken") {
          setRemainingFoundryIds((current) => current.filter((id) => id !== artifactId));
        }
      },
      isEditingCivName: false,
      isMyTurn: true,
      kardashevPalette: { primary: "#e8ad58", secondary: "#7d3f1a", accent: "#ffe0a3" },
      kardashevProgressFraction: 0.65,
      kardashevTier: 1,
      me: localPlayer,
      myReservedCount: ordinaryCards.length,
      newlyMarkedCardIds: new Set(),
      openForgedCardSheet: noOp,
      recentCivilizationSiteIds: [],
      acknowledgeRecentCivilizationSites: noOp,
      pendingGameOver: false,
      plannedCardId: null,
      plannedCardLabel: "",
      safePlayers: [localPlayer],
      selectedCard: null,
      session: { playerId: "architect" },
      setCivEditValue: noOp,
      setCivLabel: noOp,
      setExpandedLumEffects: noOp,
      setForgedView: noOp,
      setIsEditingCivName: noOp,
      setShowActiveLuminaries: noOp,
      setShowForgedArtifacts: noOp,
      setTracedSourceLumId: noOp,
      showActiveLuminaries: false,
      showCinematic: false,
      showForgedArtifacts: false,
      showWinOverlay: false,
      state,
      strikeAuraMap: new Map(),
      suppressedMarkerIds: new Set(),
      victoryRequirement: DEFAULT_VICTORY_REQUIREMENT,
    };
    return { scope: scopeValue };
  }, [covenant, remainingFoundryIds]);

  const chooseCovenant = (next: CovenantState) => {
    setCovenant(next);
    setRemainingFoundryIds(
      BLUEPRINT_DEFINITIONS.bp_mantle_to_orbit_foundry.components.map((component) => component.artifactId),
    );
    replaceQuery(next, motion);
  };

  const chooseMotion = (next: MotionState) => {
    setMotion(next);
    replaceQuery(covenant, next);
  };

  return (
    <main
      data-foundry-storage-preview="true"
      data-covenant={covenant}
      data-motion={motion}
      className="min-h-[100dvh] bg-[#030509] px-3 py-4 text-white sm:px-6 sm:py-8"
    >
      <style>{`
        [data-foundry-storage-preview] [data-game-hand-tab] > * { display: none; }
        [data-foundry-storage-preview] [data-game-hand-tab] > [data-blueprint-game-panel],
        [data-foundry-storage-preview] [data-game-hand-tab] > [data-encrypted-artifacts-group],
        [data-foundry-storage-preview] [data-game-hand-tab] > [data-foundry-components-group] { display: block; }
      `}</style>

      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-4 border-b border-white/10 pb-4">
          <p className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-200/55">
            Development preview
          </p>
          <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-serif text-2xl font-semibold text-white">Foundry Cipher Storage</h1>
              <p className="mt-1 max-w-xl text-xs leading-relaxed text-white/55">
                Three ordinary Encrypted slots remain independent from the three archived Foundry components.
              </p>
            </div>
            <nav className="flex flex-wrap gap-1.5" aria-label="Foundry aftermath preview controls">
              {(["intact", "broken"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  data-active={covenant === value}
                  className="h-8 border border-white/12 bg-white/[0.04] px-2.5 text-[9px] font-black uppercase text-white/60 data-[active=true]:border-amber-200/45 data-[active=true]:bg-amber-300/12 data-[active=true]:text-amber-100"
                  onClick={() => chooseCovenant(value)}
                >
                  {value} Covenant
                </button>
              ))}
              {(["full", "reduced"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  data-active={motion === value}
                  className="h-8 border border-white/12 bg-white/[0.04] px-2.5 text-[9px] font-black uppercase text-white/60 data-[active=true]:border-cyan-200/35 data-[active=true]:text-cyan-100"
                  onClick={() => chooseMotion(value)}
                >
                  {value} motion
                </button>
              ))}
            </nav>
          </div>
        </header>

        <section className="overflow-hidden border border-amber-200/15 bg-[#080b10] shadow-[0_24px_80px_rgba(0,0,0,0.48)]">
          <HandTab scope={scope} />
        </section>
      </div>
    </main>
  );
}
