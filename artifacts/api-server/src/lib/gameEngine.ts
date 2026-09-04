// ─── Luminae Game Engine ────────────────────────────────────────────────────
// Original tabletop engine-building game built around Affinities, Artifacts,
// the Forge, Eminence, and Luminaries.

import { z } from "zod";
import {
  AFFINITY_KEYS,
  ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID,
  ARTIFACT_CATALOG,
  BLUEPRINT_DEFINITIONS,
  CIVILIZATION_ARTIFACT_IMPLEMENTATION_STATES,
  CIVILIZATION_HISTORICAL_QUALITY_DIMENSIONS,
  CIVILIZATION_MATURITY_LEVELS,
  CIVILIZATION_PRESSURE_TAGS,
  CIVILIZATION_REACH_CONDITIONS,
  CIVILIZATION_RESOLUTION_FORMS,
  CIVILIZATION_STABILITY_BANDS,
  CIVILIZATION_STABILITY_IMPACT_MAGNITUDES,
  CIVILIZATION_STATE_VERSION,
  DEFAULT_VICTORY_REQUIREMENT,
  MIN_VICTORY_REQUIREMENT,
  compareVictoryStandings,
  foundryStoredArtifactIds,
  ordinaryEncryptedCount,
  applyCivilizationResolution,
  buildCivilizationResolutionSnapshot,
  createInitialCivilizationState,
  deriveCivilizationAffinityIdentity,
  reconcileCivilizationDerivedState,
  resolveCivilizationEvent,
  RECURRENCE_CHRONICLE_ID,
  RECURRENCE_CUSTODY_DUE_AFTER_CORE_ACTIONS,
  RECURRENCE_DEFINITION_VERSION,
  RECURRENCE_OUTCOME_IDS,
  RECURRENCE_PREPAREDNESS_CAPABILITY_IDS,
  RECURRENCE_SCENARIO_ID,
  isRecurrenceCustodyMethod,
  recurrenceOutcomeId,
  TRACE_CHRONICLE_ID,
  TRACE_DEFINITION_VERSION,
  TRACE_GUIDANCE_DUE_AFTER_CORE_ACTIONS,
  TRACE_PREPAREDNESS_CAPABILITY_IDS,
  TRACE_SCENARIO_ID,
  isTraceGuidanceMethod,
  traceOutcomeId,
  TRIANGULATION_ALIGNMENT_DUE_AFTER_CORE_ACTIONS,
  TRIANGULATION_CHRONICLE_ID,
  TRIANGULATION_DEFINITION_VERSION,
  TRIANGULATION_OUTCOME_IDS,
  TRIANGULATION_PREPAREDNESS_CAPABILITY_IDS,
  TRIANGULATION_SCENARIO_ID,
  isTriangulationCoordinationArchitecture,
  isTriangulationReferenceCivilization,
  triangulationOutcomeId,
  upsertCivilizationEntity,
  KNOWN_AURA_STYLES,
  LUMINARY_IDS,
  STANDARD_AFFINITY_KEYS,
} from '@workspace/game-types';
import type {
  AffinityCounts,
  AffinityKey,
  AuraStyle,
  BlueprintDetonationEvent,
  BlueprintArtifactSnapshot,
  BlueprintClaimAction,
  BlueprintId,
  BlueprintManifestationEvent,
  BlueprintPresentationVariant,
  BlueprintPrivateState,
  CivilizationArtifactChangeSource,
  CivilizationArtifactImplementationState,
  CivilizationArtifactLifecycleState,
  CivilizationAdversityEvidence,
  CivilizationCondition,
  CivilizationEntity,
  CivilizationEventHistoryEntry,
  CivilizationHistoryEvidence,
  CivilizationOutcomeSignal,
  CivilizationScaleEvidence,
  CivilizationStabilityContributor,
  CivilizationState,
  CivilizationWorld,
  LuminaryId,
  LuminaryArrivalSoundVariant,
  LumiiThresholdApproach,
  ManifestedDevicePublicState,
  StandardAffinityKey,
  ArtifactDefinition,
  ChronicleRunKind,
  RecurrenceCustodyMethod,
  RecurrenceScenarioState,
  TraceGuidanceMethod,
  TraceScenarioState,
  TriangulationCoordinationArchitecture,
  TriangulationReferenceCivilization,
  TriangulationScenarioState,
} from '@workspace/game-types';
import { getCardLore } from "./cardLore";
import { GUIDED_LUMII_AVATAR_ID } from "./avatarAssignment";
import {
  resolveAntimatterCivilizationPolicy,
  resolveBlueprintCivilizationEventPolicy,
  type BlueprintCivilizationEventKind,
} from "./civilizationBlueprintIntegration";

export interface LuminaryAffinity {
  luminaryId: string;
  ownerId: string;
  activeAffinity: StandardAffinityKey;
  eligibleAffinities: StandardAffinityKey[];
  summonedAtTurnCount: number;
}

interface PendingSummonEvent {
  eventId: string;
  luminaryId: string;
  claimedByPlayerId: string;
  /** Public, match-snapshotted arrival cue selected by the claiming player. */
  arrivalSound?: LuminaryArrivalSoundVariant;
  /** Unix ms timestamp when this event was created.  Used by the TTL guard in
   *  applyAction to auto-expire events whose originating client disconnected
   *  before sending resolve_summon.  Optional for backward compat with saves
   *  created before this field was added (those events are never auto-expired). */
  createdAt?: number;
}

interface ForgottenHourCycleState {
  /** turnCount when Forgotten Hour last applied markers. */
  lastAppliedTurnCount: number;
  /** Owner end turns remaining before Forgotten Hour returns; null while markers are active. */
  cooldownOwnerTurnsRemaining: number | null;
}

interface PhoenixRecurrenceState {
  ownerId: string;
  summonedAtTurnCount: number;
  /** One-time recovery of the Burn Pile at the beginning of the owner's next turn. */
  recoveryPending: boolean;
}

export interface LuminaryAffinityReturn {
  playerId: string;
  affinityType: AffinityKey;
  affinityAmount: number;
}

/** Emitted each time a Luminary's mechanical effect fires (arrival, action,
 *  end-of-turn hook, start-of-turn hook). Clients consume it to trigger
 *  the 4-second activation cinematic overlay, then send
 *  resolve_luminary_activation to pop it from the queue. */
export interface PendingLuminaryActivationEvent {
  eventId: string;
  luminaryId: string;
  /** Which hook fired this event. */
  effectType: "summon" | "action" | "end_of_turn" | "start_of_turn";
  /** Player ID who owns the Luminary (for display / color choice). */
  triggeringPlayerId: string;
  createdAt?: number;
  /**
   * Artifact IDs targeted by this activation, captured at event-push time.
   * Used by the client to drive animations after the server has already
   * modified state (e.g. Cinder Mandate end_of_turn burn clears
   * artifactMarkers before the client animation runs).
   */
  targetCardIds?: string[];
  /** Forge mold coordinates targeted by this activation, encoded as `tier-slotIndex`. */
  targetSlotIds?: string[];
  /** Legacy single-return payload retained for queued games created before Balance Due became global. */
  affinityType?: StandardAffinityKey;
  /** Legacy single-return amount retained for queued games created before Balance Due became global. */
  affinityAmount?: number;
  /** Authoritative player/Affinity pairs returned by a global activation such as Balance Due. */
  affinityReturns?: LuminaryAffinityReturn[];
  /** Victory threshold immediately before this activation changed it. */
  victoryRequirementBefore?: number;
  /** Victory threshold immediately after this activation changed it. */
  victoryRequirementAfter?: number;
  /** Signed threshold delta presented by this activation. */
  victoryRequirementChange?: number;
}

const ERR_ARTIFACT_NOT_IN_FORGE = "Artifact is no longer in The Forge";
const ERR_CANNOT_ENCRYPT_DURING_FORGOTTEN_HOUR = "Cannot encrypt during The Forgotten Hour";
const ERR_CANNOT_ENCRYPT_NULLIFIED = "Nullified Artifacts cannot be Encrypted";

export type ArtifactMarkerType = 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed';

export interface ArtifactBrand {
  type: ArtifactMarkerType;
  /** Player ID of the Luminary owner who placed the marker. */
  ownerId: string;
  /** turnCount when the marker was applied (used for timing checks). */
  summonedAtTurnCount: number;
}

export interface ArtifactMarker extends ArtifactBrand {
  /**
   * Canonical cumulative brand collection. Top-level fields mirror the newest
   * brand so older clients and persisted games remain readable.
   */
  brands?: ArtifactBrand[];
}

export function getArtifactBrands(marker?: ArtifactMarker | null): ArtifactBrand[] {
  if (!marker) return [];
  if (Array.isArray(marker.brands) && marker.brands.length > 0) {
    return marker.brands.filter((brand): brand is ArtifactBrand => (
      !!brand &&
      typeof brand.type === "string" &&
      typeof brand.ownerId === "string" &&
      typeof brand.summonedAtTurnCount === "number"
    ));
  }
  return [{
    type: marker.type,
    ownerId: marker.ownerId,
    summonedAtTurnCount: marker.summonedAtTurnCount,
  }];
}

function buildArtifactMarker(brands: ArtifactBrand[]): ArtifactMarker | null {
  if (brands.length === 0) return null;
  const newest = brands[brands.length - 1];
  return { ...newest, brands };
}

export function markerHasBrand(
  marker: ArtifactMarker | null | undefined,
  type: ArtifactMarkerType,
  ownerId?: string,
): boolean {
  return getArtifactBrands(marker).some(
    (brand) => brand.type === type && (ownerId === undefined || brand.ownerId === ownerId),
  );
}

export function addArtifactBrand(
  state: Pick<GameStateData, "artifactMarkers">,
  artifactId: string,
  brand: ArtifactBrand,
): boolean {
  if (!state.artifactMarkers) state.artifactMarkers = {};
  const existing = getArtifactBrands(state.artifactMarkers[artifactId]);
  const duplicateIndex = existing.findIndex(
    (entry) => entry.type === brand.type && entry.ownerId === brand.ownerId,
  );
  if (duplicateIndex >= 0) {
    existing[duplicateIndex] = brand;
    state.artifactMarkers[artifactId] = buildArtifactMarker(existing)!;
    return false;
  }
  state.artifactMarkers[artifactId] = buildArtifactMarker([...existing, brand])!;
  return true;
}

function removeArtifactBrands(
  state: Pick<GameStateData, "artifactMarkers">,
  artifactId: string,
  predicate: (brand: ArtifactBrand) => boolean,
): number {
  const marker = state.artifactMarkers?.[artifactId];
  if (!marker) return 0;
  const current = getArtifactBrands(marker);
  const remaining = current.filter((brand) => !predicate(brand));
  const removed = current.length - remaining.length;
  if (removed === 0) return 0;
  const next = buildArtifactMarker(remaining);
  if (next) {
    state.artifactMarkers![artifactId] = next;
  } else {
    delete state.artifactMarkers![artifactId];
  }
  return removed;
}

export interface AvatarSeedState {
  ownerId: string;
  summonedAtTurnCount: number;
  /** Permanent seeded Forge molds, encoded as `tier-slotIndex`. */
  moldSlots: string[];
}

export type ArtifactCard = ArtifactDefinition;

export {
  KNOWN_AURA_STYLES,
  LUMINARY_IDS,
  STANDARD_AFFINITY_KEYS,
  type AffinityCounts,
  type AffinityKey,
  type AuraStyle,
  type LuminaryId,
  type StandardAffinityKey,
};

export interface LuminaryDef {
  id: LuminaryId;
  name: string;
  domain: string;
  eminence: number;
  /** When set, this Luminary raises the shared victory requirement. */
  oblivion?: number;
  requirements: AffinityCounts;
  flavor: string;
  summonColor: string;
  summonSecondaryColor: string;
  auraStyle: AuraStyle;
  /** Display name for this Luminary's special effect (v0.8+). */
  effectName?: string;
  /** Plain-English description of this Luminary's special effect for players (v0.8+). */
  effectDescription?: string;
}

export interface InitialBoardSnapshot {
  forgeTier1: string[];
  forgeTier2: string[];
  forgeTier3: string[];
  deckTier1: string[];
  deckTier2: string[];
  deckTier3: string[];
  activeLuminaries: string[];
  firstPlayerId?: string | null;
}

interface InitializeGameOptions {
  replayBoard?: InitialBoardSnapshot | null;
  blueprintSetups?: Record<string, {
    blueprintIds: BlueprintId[];
    presentationVariants?: Partial<Record<BlueprintId, BlueprintPresentationVariant>>;
  }>;
}

export interface PlayerGameState {
  playerId: string;
  playerName: string;
  /** Account cosmetic snapshotted when this match was created. */
  luminaryArrivalSound: LuminaryArrivalSoundVariant;
  /** Custom civilization name set by the player. Falls back to "{playerName}'s Civilization" on the client when absent. */
  civName?: string;
  affinities: AffinityCounts;
  bonuses: AffinityCounts;
  eminence: number;
  reservedArtifactIds: string[];
  /** Reserved Artifact IDs drawn blind from an Archive. Never exposed to non-owners. */
  privateReservedArtifactIds?: string[];
  forgedArtifactIds: string[];
  /** Lifetime-in-this-match Forge actions by Artifact ID, including Artifacts later removed. */
  artifactForgeCounts?: Record<string, number>;
  /** Backend-owned Artifact mastery and implementation history for this match. */
  civilization: CivilizationState;
  /**
   * Historical record of Artifacts consumed by Final Hunger. Assimilated
   * Artifacts are no longer operational and cannot satisfy Blueprint recipes,
   * forged-Artifact effects, or victory tie-breaks.
   */
  assimilatedArtifactIds?: string[];
  /** Artifact IDs forged at zero Affinity cost (fully covered by bonuses). */
  discountedForgeIds: string[];
  /** Per-card bonus snapshot captured at forge time. Key = card ID. Added in bonus-snapshot feature. */
  forgedArtifactBonusSnapshots?: Record<string, AffinityCounts>;
  /** Card IDs whose active brands prevent future Blueprint use after forging. */
  blueprintBlockedCardIds?: string[];
  /** Owner-only Blueprint assembly and secret-device information. */
  blueprintPrivateStates?: BlueprintPrivateState[];
  blueprintPresentationVariants?: Partial<Record<BlueprintId, BlueprintPresentationVariant>>;
  /** Public devices manifested by this civilization. */
  manifestedBlueprintDevices?: ManifestedDevicePublicState[];
  /** True until Tide Architect's ally uses their one Archive-top Forge. */
  tideArchiveForgeAvailable?: boolean;
  luminaries: string[];
  /** Luminary alliances formed in this match, keyed by Luminary ID. */
  luminaryAllianceCounts?: Record<string, number>;
  isConnected: boolean;
  plannedAction: ActionPayload | null;
  plannedActionCancelReason: string | null;
}

interface ActionLogEntry {
  playerId: string;
  playerName: string;
  summary: string;
  turn: number;
}

/** A single Artifact removed from the Forge by a Luminary burn effect. */
export interface BurnEvent {
  /** Stable within a game session; correlates animation, log, and UI consumers. */
  eventId: string;
  cardId: string;
  /** Card name resolved at burn time via getCardLore — stored so consumers never need a second lookup. */
  artifactName: string;
  tier: 1 | 2 | 3;
  sourceType: 'luminary' | 'action' | 'system';
  sourceLuminaryId: string;
  /** Display name of the Luminary that caused the burn. */
  sourceName?: string;
  /** Player who owns the Luminary that triggered the burn. */
  ownerPlayerId?: string;
  /** Player whose action caused the burn. */
  triggeredByPlayerId?: string;
  /** Final destination after the Burn resolves. */
  destination: "burn_pile" | "archive";
  turn: number;
}

export type PendingTurnTransitionStage =
  | "after_action"
  | "after_end_effects"
  | "after_start_effects";

/**
 * Durable turn-resolution cursor. A turn may only leave a stage after every
 * Luminary arrival and activation event produced by that stage is acknowledged.
 */
export interface PendingTurnTransition {
  stage: PendingTurnTransitionStage;
  endingPlayerId: string;
  nextPlayerIndex?: number;
}

interface DevLuminarySequenceStage {
  playerId: string;
  luminaryIds: string[];
  includeNextTurnEffects?: boolean;
  /** Compatibility with development snapshots captured before the unified control. */
  includeEndOfTurnEffects?: boolean;
  includeStartOfTurnEffects?: boolean;
  /** Last production-like phase released into the presentation queue. */
  phase?: "arrivals" | "end_of_turn" | "start_of_turn";
}

export interface GameStateData {
  /** Unix timestamp (ms) when this game instance was initialized. */
  startedAt?: number;
  /** Opening Forge/deck/Luminary layout, used when players replay the same board. */
  initialBoard?: InitialBoardSnapshot;
  /** First-player selection for this game instance; persists so clients can animate it once. */
  openingTurnOrder?: {
    id: string;
    startedAt: number;
    firstPlayerId: string;
    playerIds: string[];
  } | null;
  currentPlayerIndex: number;
  roundNumber: number;
  turnCount: number;
  phase: "playing" | "last_round" | "finished";
  finishReason?: "win" | "surrender" | "withdrawal";
  victoryRequirement?: number;
  cinematicMode?: "standard" | "epic";
  affinityWell: AffinityCounts;
  forgeTier1: string[];
  forgeTier2: string[];
  forgeTier3: string[];
  deckTier1: string[];
  deckTier2: string[];
  deckTier3: string[];
  activeLuminaries: string[];
  luminaryAffinities: LuminaryAffinity[];
  players: PlayerGameState[];
  winnerId: string | null;
  winTriggerLuminaryId: string | null;
  /**
   * Invariant: every code path that increments `version` MUST also stamp
   * `lastAction` with `{ type: <action-type>, playerId, ...relevant-payload }`
   * before returning.  This prevents stale real-action types (e.g. a previous
   * `forge_artifact`) from leaking into the next broadcast and triggering
   * animation re-fires on non-turn mutations such as `resolve_summon`.
   * Non-turn cases stamp their own type explicitly;
   * turn actions are covered by the single assignment at the bottom of
   * `applyAction` that runs after the switch falls through.
   */
  lastAction: Record<string, unknown> | null;
  actionLog: ActionLogEntry[];
  turnTimerSeconds: number | null;
  turnDeadline: number | null;
  version: number;
  pendingSummonEvents: PendingSummonEvent[];
  /** Activation events queued for the short (~4s) per-effect cinematic overlay. */
  pendingLuminaryActivationEvents: PendingLuminaryActivationEvent[];
  pendingBlueprintManifestationEvents: BlueprintManifestationEvent[];
  pendingBlueprintDetonationEvents: BlueprintDetonationEvent[];
  /** Staged turn handoff held until all Luminary resolutions are presented. */
  pendingTurnTransition?: PendingTurnTransition | null;
  /** DEV-only delayed-effect cursor advanced after all arrival effects finish. */
  devLuminarySequenceStage?: DevLuminarySequenceStage;
  /** DEV-only sequence lease held until every staged presentation is acknowledged. */
  devLuminarySequenceActive?: boolean;
  /** Card markers: Forgotten / Condemned / Nullified / Avatar Seed (v0.8+). */
  artifactMarkers?: Record<string, ArtifactMarker>;
  /** The first Nullified Artifact forged this game and whether its allied-player exemption applied. */
  nullifiedFirstForge?: {
    cardId: string;
    playerId: string;
    exempt: boolean;
  } | null;
  /** Owner-relative repeat timing for ??? / The Forgotten Hour. */
  forgottenHourCycle?: Record<string, ForgottenHourCycleState>;
  /** Delayed one-time recovery state for Phoenix Paradox / Eternal Recurrence. */
  phoenixRecurrence?: PhoenixRecurrenceState;
  /** State for Seed Beyond Seasons Avatar Seeds (v0.8+). */
  avatarSeedState?: AvatarSeedState;
  /** Count of distinct burn effects since end of Catalyst Bloom owner's last turn (v0.8+). */
  catalystBloomBurnCount?: number;
  /** True once Concordance Mandala's 8-Radiance Perfect Coherence milestone has fired. */
  concordanceMandalaTriggered?: boolean;
  /** True once Concordance Mandala's 10-Radiance Perfect Coherence milestone has fired. */
  concordanceMandalaFinalTriggered?: boolean;
  /** True once Glass Orchard's Perfect Replication has fired (one per game, v0.8+). */
  glassOrchardTriggered?: boolean;
  /** Campaign-only state that reveals Antimatter's Covenant rider once declared. */
  brokenCovenantDeclared?: boolean;
  /** Approach chosen at the Lumii Vault threshold. Immutable for this encounter. */
  lumiiThresholdApproach?: LumiiThresholdApproach;
  /** Server-owned state for The Trace Chronicle. */
  traceScenario?: TraceScenarioState;
  /** Server-owned state for The Recurrence Chronicle. */
  recurrenceScenario?: RecurrenceScenarioState;
  /** Server-owned state for The Triangulation Chronicle. */
  triangulationScenario?: TriangulationScenarioState;
  /** PlayerId holding Final Hunger's one-use Assimilation action until it is consumed. */
  firstHungerAvailable?: string | null;
  /** @deprecated Legacy save/client field. Always normalized and projected as null. */
  voidSealOwnerId?: string | null;
  /**
   * Set when a player simultaneously qualifies for multiple Luminaries at depth-0 of
   * checkLuminaries.  The player must choose claim order before any other turn action
   * is permitted.  Cleared immediately once choose_luminary_order resolves.
   */
  pendingLuminaryChoice?: {
    playerId: string;
    candidates: string[];
    createdAt: number;
  } | null;
  /** Ordered list of Artifact IDs currently removed from play by Burn effects. */
  burnPile: string[];
  /** Per-card burn event log — one entry per card burned, carries tier and source Luminary. */
  burnEvents: BurnEvent[];
  /**
   * Gameplay tombstone index for every card removed by Annihilation. This is
   * not Civilization lifecycle authority: prospective Forge targets and lost
   * owned implementations are distinguished in each player's Civilization state.
   */
  annihilatedArtifactIds: string[];
  /**
   * Set to true when the current player has consumed their one core action this
   * turn (Forge, reserve, Harness, assimilate). Prevents a second core
   * action from landing even when the turn has not yet advanced (e.g. while
   * pendingLuminaryChoice suspends the turn transition). Reset only when the
   * complete resolution pipeline releases the incoming player.
   */
  coreActionUsed?: boolean;
}

const ACTION_LOG_MAX = 100;
const AFFINITY_LABEL: Record<StandardAffinityKey, string> = {
  flare: "Flare",
  continuum: "Continuum",
  verdance: "Verdance",
  abyss: "Abyss",
  radiance: "Radiance",
};

function pushLog(state: GameStateData, entry: ActionLogEntry): void {
  if (!state.actionLog) state.actionLog = [];
  state.actionLog.push(entry);
  if (state.actionLog.length > ACTION_LOG_MAX) {
    state.actionLog.splice(0, state.actionLog.length - ACTION_LOG_MAX);
  }
}

// ─── Card Catalog ────────────────────────────────────────────────────────────

const CARD_CATALOG: readonly ArtifactCard[] = ARTIFACT_CATALOG;

export const LUMINARIES: LuminaryDef[] = [
  // ── Mono-color Luminaries ───────────────────────────────────────────────────
  {
    id: "lum_moth",
    name: "Red Moth",
    domain: "Rupture",
    eminence: 2,
    requirements: { flare: 6, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0 },
    flavor: "Where it passes, the universe is divided into before and after.",
    summonColor: "#ef4444",
    summonSecondaryColor: "#7f1d1d",
    auraStyle: "fire",
    effectName: "Rupture of the Still",
    effectDescription: "On arrival, burn every face-up Tier III Artifact with a Flare cost below 5, then immediately refill each vacated Forge position.",
  },
  {
    id: "lum_tide",
    name: "The Tide Architect",
    domain: "Tides",
    eminence: 2,
    requirements: { flare: 0, continuum: 6, verdance: 0, abyss: 0, radiance: 0, singularity: 0 },
    flavor: "Possibility collapses to its bias.",
    summonColor: "#60a5fa",
    summonSecondaryColor: "#e2e8f0",
    auraStyle: "tide",
    effectName: "The Observer Effect",
    effectDescription: "The allied player may view the top Artifact of each Archive. Once, the allied player may Forge an Artifact on the top of an Archive.",
  },
  {
    id: "lum_verdant",
    name: "The Verdant Oracle",
    domain: "Verdance",
    eminence: 1,
    requirements: { flare: 0, continuum: 0, verdance: 5, abyss: 0, radiance: 0, singularity: 0 },
    flavor: "It answers only after the question has taken root.",
    summonColor: "#4ade80",
    summonSecondaryColor: "#166534",
    auraStyle: "verdant",
    effectName: "Early Bloom",
    effectDescription: "On arrival, gain 1 Verdance token from the Affinity Well.",
  },
  {
    id: "lum_void",
    name: "The Void Warden",
    domain: "Void",
    eminence: 2,
    oblivion: 8,
    requirements: { flare: 0, continuum: 0, verdance: 0, abyss: 6, radiance: 0, singularity: 0 },
    flavor: "In the space between stars, something watches without eyes.",
    summonColor: "#4c1d95",
    summonSecondaryColor: "#0a0a14",
    auraStyle: "void",
    effectName: "Oblivion",
    effectDescription: "On arrival, raise the shared victory requirement by 8.",
  },
  {
    id: "lum_radiant",
    name: "Concordance Mandala",
    domain: "Coherence",
    eminence: 4,
    requirements: { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 6, singularity: 0 },
    flavor: "Truth is not revealed. It is aligned.",
    summonColor: "#fef9c3",
    summonSecondaryColor: "#2ecc71",
    auraStyle: "radiant",
    effectName: "Perfect Coherence",
    effectDescription: "Once, when you end your turn with at least 8 Radiance Artifacts, gain +2 Eminence. Once, when you end your turn with at least 10 Radiance Artifacts, gain +2 Eminence.",
  },
  // ── Dual-color Luminaries ────────────────────────────────────────────────────
  {
    id: "lum_astral",
    name: "Phoenix Paradox",
    domain: "Recurrence",
    eminence: 4,
    requirements: { flare: 4, continuum: 4, verdance: 0, abyss: 0, radiance: 0, singularity: 0 },
    flavor: "Every ending becomes fuel. Every return comes back less innocent.",
    summonColor: "#f43f5e",
    summonSecondaryColor: "#3d6bff",
    auraStyle: "astral",
    effectName: "Eternal Recurrence",
    effectDescription: "While Phoenix Paradox is manifested, future Burned Artifacts return to the bottom of their corresponding Archives instead of remaining in the Burn Pile. At the beginning of your next turn, return every Artifact already in the Burn Pile to the bottom of its corresponding Archive, then refill any empty Forge positions.",
  },
  {
    id: "lum_bloom",
    name: "Catalyst Bloom",
    domain: "Aftergrowth",
    eminence: 4,
    requirements: { flare: 4, continuum: 0, verdance: 4, abyss: 0, radiance: 0, singularity: 0 },
    flavor: "It waits for the nova to wound the world, then flowers in the scar.",
    summonColor: "#86efac",
    summonSecondaryColor: "#7f1d1d",
    auraStyle: "bloom",
    effectName: "Aftergrowth",
    effectDescription: "At the end of each of your turns, you gain +1 Eminence for every burn effect that occurred since your last turn (from any source).",
  },
  {
    id: "lum_forge",
    name: "The Iron Harbinger",
    domain: "Ruin",
    eminence: 3,
    requirements: { flare: 4, continuum: 0, verdance: 0, abyss: 4, radiance: 0, singularity: 0 },
    flavor: "The hammer falls only after the future has already broken.",
    summonColor: "#f97316",
    summonSecondaryColor: "#1c1917",
    auraStyle: "storm",
    effectName: "Impact Extinction",
    effectDescription: "On arrival, return every face-up Forge Artifact to its corresponding Archive, randomize each Archive, then refill every Forge row.",
  },
  {
    id: "lum_compass",
    name: "???",
    domain: "Erasure",
    eminence: 1,
    requirements: { flare: 0, continuum: 4, verdance: 0, abyss: 4, radiance: 0, singularity: 0 },
    flavor: "Everyone remembers something happened, but no one recalls what was lost.",
    summonColor: "#2563eb",
    summonSecondaryColor: "#0a0a14",
    auraStyle: "distorted",
    effectName: "The Forgotten Hour",
    effectDescription: "On arrival, raise the shared victory requirement by 1 and mark every face-up Forge Artifact as Forgotten. Until the ally's next end of turn, only the ally may Encrypt. Artifacts forged while Forgotten award 0 Eminence and cannot be used for Blueprints. After the marks expire, wait 12 of the ally's turns, then mark the face-up Forge Artifacts as Forgotten again without raising the victory requirement.",
  },
  {
    id: "lum_seed",
    name: "The Seed Beyond Seasons",
    domain: "Propagation",
    eminence: 3,
    requirements: { flare: 0, continuum: 4, verdance: 4, abyss: 0, radiance: 0, singularity: 0 },
    flavor: "It leaves its avatars where tomorrow has already begun to remember.",
    summonColor: "#38bdf8",
    summonSecondaryColor: "#4ade80",
    auraStyle: "compass",
    effectName: "Avatar Seeds",
    effectDescription: "On arrival, permanently mark one random mold in each tier with an Avatar Seed. At the end of every turn, each unseeded Artifact occupying one of those molds becomes Seeded. When an opponent forges a Seeded Artifact, you gain 1 permanent Affinity matching that Artifact's bonus Affinity.",
  },
  {
    id: "lum_orchard",
    name: "The Glass Orchard",
    domain: "Replication",
    eminence: 3,
    requirements: { flare: 0, continuum: 0, verdance: 4, abyss: 0, radiance: 4, singularity: 0 },
    flavor: "It learned to copy itself perfectly, and called the absence of error peace.",
    summonColor: "#4ade80",
    summonSecondaryColor: "#fef9c3",
    auraStyle: "verdant",
    effectName: "Perfect Replication",
    effectDescription: "Once per game, when you first forge an Artifact whose cost includes Verdance or Radiance, gain a second permanent bonus Affinity matching that Artifact.",
  },
  {
    id: "lum_pale",
    name: "The Pale Merchant",
    domain: "Balance",
    eminence: 3,
    requirements: { flare: 0, continuum: 0, verdance: 0, abyss: 4, radiance: 4, singularity: 0 },
    flavor: "Every bargain reveals one truth and buries another.",
    summonColor: "#cbd5e1",
    summonSecondaryColor: "#0a0a14",
    auraStyle: "pale",
    effectName: "Balance Due",
    effectDescription: "On arrival, each player returns 2 tokens of every Affinity, including Singularity, that they hold at half or more of its starting supply (rounded up).",
  },
  // ── Triple-color Luminaries (2–4 Eminence) ──────────────────────────────────
  {
    id: "lum_ember",
    name: "The Ember Sovereign",
    domain: "Flame",
    eminence: 4,
    requirements: { flare: 3, continuum: 0, verdance: 0, abyss: 3, radiance: 3, singularity: 0 },
    flavor: "What cannot survive the fire is granted the mercy of disappearance.",
    summonColor: "#ff5a3c",
    summonSecondaryColor: "#7b1fa2",
    auraStyle: "fire",
    effectName: "Cinder Mandate",
    effectDescription: "On arrival, mark each face-up Forge Artifact as Condemned unless its cost includes at least 3 of Flare, Abyss, or Radiance. At the end of your next turn, burn each remaining Condemned Artifact and refill its Forge position.",
  },
  {
    id: "lum_hunger",
    name: "The Final Hunger",
    domain: "Assimilation",
    eminence: 2,
    requirements: { flare: 3, continuum: 0, verdance: 3, abyss: 0, radiance: 3, singularity: 0 },
    flavor: "Its first act is consumption. Its second is perfect repetition.",
    summonColor: "#fbbf24",
    summonSecondaryColor: "#4ade80",
    auraStyle: "oracle",
    effectName: "Assimilation",
    effectDescription: "Once after arrival, you may replace your Forge action with Assimilation. Assimilate any face-up Artifact for free: gain its permanent bonus Affinity and no Eminence. It counts as owned only for Blueprints.",
  },
  {
    id: "lum_null",
    name: "The Null Sovereign",
    domain: "Transcendence",
    eminence: 0,
    requirements: { flare: 0, continuum: 4, verdance: 0, abyss: 4, radiance: 4, singularity: 0 },
    flavor: "Past the last observable star, entire futures fall silent without being destroyed.",
    summonColor: "#ffffff",
    summonSecondaryColor: "#0a0a14",
    auraStyle: "null",
    effectName: "Black Domain",
    effectDescription: "On arrival, mark all face-up Tier III Artifacts that do not require all three of Continuum, Abyss, and Radiance as Nullified. Nullified Artifacts award 0 Eminence, cannot be used for Blueprints, and cannot be Encrypted. If the first Nullified Artifact forged this game is forged by the allied player, it is unaffected by Nullified.",
  },
  // ── Deferred / Inactive Luminaries (not in active arrival pool) ────────────
  {
    id: "lum_oracle",
    name: "The Cosmic Oracle",
    domain: "Prophecy",
    eminence: 4,
    requirements: { flare: 3, continuum: 3, verdance: 3, abyss: 0, radiance: 0, singularity: 0 },
    flavor: "She sees what will be, and what might have been, and cannot tell the difference.",
    summonColor: "#fbbf24",
    summonSecondaryColor: "#ef4444",
    auraStyle: "oracle",
  },
  // ── New v0.9 Luminaries ───────────────────────────────────────────────────
  {
    id: "lum_scholar",
    name: "The Celestial Scholar",
    domain: "Erasure",
    eminence: 3,
    requirements: { flare: 0, continuum: 4, verdance: 0, abyss: 0, radiance: 4, singularity: 0 },
    flavor: "It does not forget. It simply removes the possibility that anything was ever known.",
    summonColor: "#818cf8",
    summonSecondaryColor: "#e0e7ff",
    auraStyle: "distorted",
    effectName: "Selective Amnesia",
    effectDescription: "On arrival, manifests two Artifacts from the Archive and chooses one to immediately add to your collection (the other is discarded).",
  },
];

export const CARD_MAP = new Map<string, ArtifactCard>(
  CARD_CATALOG.map((c) => [c.id, c]),
);
export const LUMINARY_MAP = new Map<string, LuminaryDef>(
  LUMINARIES.map((l) => [l.id, l]),
);

// ─── Kardashev tier helpers ──────────────────────────────────────────────────

/**
 * Compute the player's Kardashev tier from their forged Artifact IDs and the
 * set of Artifact IDs forged entirely through permanent Affinity bonuses.
 * Logic mirrors getKardashevTier in the frontend kardashev.ts.
 */
function computeKardashevTier(
  forgedArtifactIds: ReadonlyArray<string>,
  discountedForgeIds: ReadonlyArray<string>,
): 0 | 1 | 2 | 3 {
  if (forgedArtifactIds.length === 0) return 0;

  const discountedSet = new Set(discountedForgeIds);
  const cards: Array<{ id: string; tier: number }> = [];
  for (const id of forgedArtifactIds) {
    const c = CARD_MAP.get(id);
    if (c) cards.push({ id, tier: c.tier });
  }

  const tier1 = cards.filter((c) => c.tier === 1);
  const tier2 = cards.filter((c) => c.tier === 2);
  const tier3 = cards.filter((c) => c.tier === 3);

  if (tier3.some((c) => discountedSet.has(c.id))) return 3;
  if (tier3.length > 0 || tier2.some((c) => discountedSet.has(c.id))) return 2;
  if (tier2.length > 0 || tier1.some((c) => discountedSet.has(c.id))) return 1;
  return 0;
}

function kardashevTierLabel(tier: 1 | 2 | 3): string {
  if (tier === 1) return "Kardashev Type I";
  if (tier === 2) return "Kardashev Type II";
  return "Kardashev Type III";
}

/**
 * Check whether the player's Kardashev tier advanced after a forge action and,
 * if so, push a milestone entry to the action log.
 *
 * @param oldTier Tier computed before the Artifact was added.
 * @param isDiscount Whether the Artifact was forged with zero Affinities spent.
 * @param cardTier Tier of the forged Artifact (1, 2, or 3).
 */
function checkKardashevAdvance(
  state: GameStateData,
  player: PlayerGameState,
  oldTier: 0 | 1 | 2 | 3,
  isDiscount: boolean,
  cardTier: number,
): void {
  const newTier = computeKardashevTier(
    player.forgedArtifactIds,
    player.discountedForgeIds,
  );
  const civilization = normalizeCivilizationState(player);
  civilization.scale = {
    ...civilization.scale,
    literalKardashevType: newTier,
    literalKardashevEvidence: "recorded",
  };
  player.civilization = civilization;
  if (newTier <= oldTier) return;

  const reason = isDiscount
    ? `Tier ${cardTier} Artifact forged entirely on bonuses`
    : `Tier ${cardTier} Artifact forged`;

  pushLog(state, {
    playerId: player.playerId,
    playerName: player.playerName,
    summary: `reached ${kardashevTierLabel(newTier as 1 | 2 | 3)} (${reason})`,
    turn: state.roundNumber,
  });
}

// Luminaries in the active arrival pool for v0.8.
// lum_oracle (Cosmic Oracle) is deferred per the v0.8 spec.
// lum_moth, lum_seed, lum_orchard, lum_hunger are new active Luminaries;
// they use procedural SVG art until illustrated assets are finalised.
const ILLUSTRATED_IDS = new Set([
  "lum_forge", "lum_ember", "lum_verdant",
  "lum_null",
  "lum_astral", "lum_bloom", "lum_compass",
  "lum_pale", "lum_radiant", "lum_tide", "lum_void",
  // v0.8 additions (procedural art until panels/entities are approved):
  "lum_moth", "lum_seed", "lum_orchard", "lum_hunger",
  // v0.9 additions (lum_scholar deferred — not in active rotation):
]);
const AVAILABLE_LUMINARIES = LUMINARIES.filter((l) =>
  ILLUSTRATED_IDS.has(l.id),
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function zeroAffinities(): AffinityCounts {
  return { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0 };
}

function incrementUsageCount(
  counts: Record<string, number> | undefined,
  id: string,
): Record<string, number> {
  const next = counts ?? {};
  next[id] = (next[id] ?? 0) + 1;
  return next;
}

function usageCountsFromIds(ids: unknown): Record<string, number> {
  const counts: Record<string, number> = {};
  if (!Array.isArray(ids)) return counts;
  for (const id of ids) {
    if (typeof id === "string") counts[id] = (counts[id] ?? 0) + 1;
  }
  return counts;
}

function emptyCivilizationState(): CivilizationState {
  return createInitialCivilizationState();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCivilizationImplementationState(
  value: unknown,
): value is CivilizationArtifactImplementationState {
  return CIVILIZATION_ARTIFACT_IMPLEMENTATION_STATES.includes(
    value as CivilizationArtifactImplementationState,
  );
}

function normalizeCivilizationChangeSource(
  value: unknown,
): CivilizationArtifactChangeSource | null {
  if (!isRecord(value)) return null;
  const sourceType = value.sourceType;
  if (
    sourceType !== "artifact" &&
    sourceType !== "blueprint" &&
    sourceType !== "chronicle" &&
    sourceType !== "scenario" &&
    sourceType !== "system"
  ) return null;
  return {
    sourceType,
    sourceId: typeof value.sourceId === "string" ? value.sourceId : null,
  };
}

function normalizeHistoryEvidence(value: unknown): CivilizationHistoryEvidence {
  return value === "recorded" ? "recorded" : "legacy_inferred";
}

function normalizeScaleEvidence(value: unknown): CivilizationScaleEvidence | null {
  if (!isRecord(value)) return null;
  const source = normalizeCivilizationChangeSource(value);
  if (!source) return null;
  return {
    ...source,
    turnCount:
      typeof value.turnCount === "number" && value.turnCount >= 0
        ? Math.floor(value.turnCount)
        : null,
    historyEvidence: normalizeHistoryEvidence(value.historyEvidence),
  };
}

function normalizeEntityReference(
  value: unknown,
): CivilizationCondition["target"] | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  if (
    value.kind !== "world" &&
    value.kind !== "artifact_implementation" &&
    value.kind !== "network" &&
    value.kind !== "installation" &&
    value.kind !== "project"
  ) return null;
  return { kind: value.kind, id: value.id };
}

function normalizeCivilizationWorlds(
  rawWorlds: unknown,
  rawHomeworldId: unknown,
  currentShape: boolean,
): { homeworldId: string; worlds: Record<string, CivilizationWorld> } {
  const worlds: Record<string, CivilizationWorld> = {};
  if (isRecord(rawWorlds)) {
    for (const [id, candidate] of Object.entries(rawWorlds)) {
      if (!isRecord(candidate) || id.length === 0) continue;
      worlds[id] = {
        id,
        role: candidate.role === "settled_world" ? "settled_world" : "homeworld",
        name: typeof candidate.name === "string" ? candidate.name : null,
        state: candidate.state === "annihilated" ? "annihilated" : "active",
        establishedTurnCount:
          typeof candidate.establishedTurnCount === "number" && candidate.establishedTurnCount >= 0
            ? Math.floor(candidate.establishedTurnCount)
            : null,
        stateChangedTurnCount:
          typeof candidate.stateChangedTurnCount === "number" && candidate.stateChangedTurnCount >= 0
            ? Math.floor(candidate.stateChangedTurnCount)
            : null,
        conditionIds: Array.isArray(candidate.conditionIds)
          ? candidate.conditionIds.filter((id): id is string => typeof id === "string")
          : [],
        historyEvidence: normalizeHistoryEvidence(candidate.historyEvidence),
      };
    }
  }

  let homeworldId = typeof rawHomeworldId === "string" && rawHomeworldId.length > 0
    ? rawHomeworldId
    : Object.values(worlds).find((world) => world.role === "homeworld")?.id ?? "world:home";
  if (!worlds[homeworldId]) {
    worlds[homeworldId] = {
      id: homeworldId,
      role: "homeworld",
      name: null,
      state: "active",
      establishedTurnCount: currentShape ? 0 : null,
      stateChangedTurnCount: currentShape ? 0 : null,
      conditionIds: [],
      historyEvidence: currentShape ? "recorded" : "legacy_inferred",
    };
  } else {
    worlds[homeworldId] = { ...worlds[homeworldId], role: "homeworld" };
  }
  for (const [id, world] of Object.entries(worlds)) {
    if (id !== homeworldId && world.role === "homeworld") {
      worlds[id] = { ...world, role: "settled_world" };
    }
  }
  return { homeworldId, worlds };
}

function normalizeCivilizationEntities(value: unknown): Record<string, CivilizationEntity> {
  const entities: Record<string, CivilizationEntity> = {};
  if (!isRecord(value)) return entities;
  for (const [id, candidate] of Object.entries(value)) {
    if (!isRecord(candidate) || id.length === 0) continue;
    if (
      candidate.kind !== "network" &&
      candidate.kind !== "installation" &&
      candidate.kind !== "project"
    ) continue;
    entities[id] = {
      id,
      kind: candidate.kind,
      state:
        candidate.state === "annihilated"
          ? "annihilated"
          : candidate.state === "disabled"
            ? "disabled"
            : "operational",
      worldId: typeof candidate.worldId === "string" ? candidate.worldId : null,
      sourceId: typeof candidate.sourceId === "string" ? candidate.sourceId : null,
      establishedTurnCount:
        typeof candidate.establishedTurnCount === "number" && candidate.establishedTurnCount >= 0
          ? Math.floor(candidate.establishedTurnCount)
          : null,
      stateChangedTurnCount:
        typeof candidate.stateChangedTurnCount === "number" && candidate.stateChangedTurnCount >= 0
          ? Math.floor(candidate.stateChangedTurnCount)
          : null,
      conditionIds: Array.isArray(candidate.conditionIds)
        ? candidate.conditionIds.filter((conditionId): conditionId is string => typeof conditionId === "string")
        : [],
      historyEvidence: normalizeHistoryEvidence(candidate.historyEvidence),
    };
  }
  return entities;
}

function normalizeCivilizationConditions(value: unknown): Record<string, CivilizationCondition> {
  const conditions: Record<string, CivilizationCondition> = {};
  if (!isRecord(value)) return conditions;
  for (const [id, candidate] of Object.entries(value)) {
    if (!isRecord(candidate) || id.length === 0 || typeof candidate.type !== "string") continue;
    const target = normalizeEntityReference(candidate.target);
    const source = normalizeCivilizationChangeSource(candidate.source);
    if (!target || !source) continue;
    const coreType =
      candidate.coreType === "damaged" ||
      candidate.coreType === "isolated" ||
      candidate.coreType === "quarantined" ||
      candidate.coreType === "disrupted"
        ? candidate.coreType
        : null;
    conditions[id] = {
      id,
      type: candidate.type as CivilizationCondition["type"],
      coreType,
      target,
      source,
      appliedTurnCount:
        typeof candidate.appliedTurnCount === "number" && candidate.appliedTurnCount >= 0
          ? Math.floor(candidate.appliedTurnCount)
          : null,
      resolvedTurnCount:
        typeof candidate.resolvedTurnCount === "number" && candidate.resolvedTurnCount >= 0
          ? Math.floor(candidate.resolvedTurnCount)
          : null,
      historyEvidence: normalizeHistoryEvidence(candidate.historyEvidence),
    };
  }
  return conditions;
}

function normalizeStabilityContributors(value: unknown): CivilizationStabilityContributor[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): CivilizationStabilityContributor[] => {
    if (
      !isRecord(candidate) ||
      typeof candidate.id !== "string" ||
      (candidate.direction !== "support" && candidate.direction !== "pressure") ||
      typeof candidate.magnitude !== "number" ||
      candidate.magnitude < 0 ||
      typeof candidate.label !== "string"
    ) return [];
    const source = normalizeCivilizationChangeSource(candidate.source);
    if (!source) return [];
    const target = candidate.target === null ? null : normalizeEntityReference(candidate.target);
    if (candidate.target !== null && !target) return [];
    return [{
      id: candidate.id,
      direction: candidate.direction,
      magnitude: candidate.magnitude,
      label: candidate.label,
      source,
      target,
      appliedTurnCount:
        typeof candidate.appliedTurnCount === "number" && candidate.appliedTurnCount >= 0
          ? Math.floor(candidate.appliedTurnCount)
          : null,
      resolvedTurnCount:
        typeof candidate.resolvedTurnCount === "number" && candidate.resolvedTurnCount >= 0
          ? Math.floor(candidate.resolvedTurnCount)
          : null,
      historyEvidence: normalizeHistoryEvidence(candidate.historyEvidence),
    }];
  });
}

function normalizeCivilizationEvents(value: unknown): CivilizationEventHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate): CivilizationEventHistoryEntry[] => {
    if (
      !isRecord(candidate) ||
      typeof candidate.eventId !== "string" ||
      !CIVILIZATION_RESOLUTION_FORMS.includes(
        candidate.form as (typeof CIVILIZATION_RESOLUTION_FORMS)[number],
      ) ||
      typeof candidate.selectedTrajectoryId !== "string" ||
      (candidate.outcome !== "success" && candidate.outcome !== "failure") ||
      typeof candidate.summary !== "string"
    ) return [];
    const source = normalizeCivilizationChangeSource(candidate.source);
    if (!source) return [];
    const pressureTags = Array.isArray(candidate.pressureTags)
      ? candidate.pressureTags.filter((tag): tag is CivilizationEventHistoryEntry["pressureTags"][number] =>
          CIVILIZATION_PRESSURE_TAGS.includes(
            tag as (typeof CIVILIZATION_PRESSURE_TAGS)[number],
          ),
        )
      : [];
    const history = isRecord(candidate.history)
      ? Object.fromEntries(
          Object.entries(candidate.history)
            .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
        )
      : {};
    const outcomeSignals = Array.isArray(candidate.outcomeSignals)
      ? candidate.outcomeSignals.flatMap((signal): CivilizationOutcomeSignal[] => {
          if (
            !isRecord(signal) ||
            typeof signal.signalId !== "string" ||
            !CIVILIZATION_HISTORICAL_QUALITY_DIMENSIONS.includes(
              signal.dimension as (typeof CIVILIZATION_HISTORICAL_QUALITY_DIMENSIONS)[number],
            ) ||
            (signal.direction !== "support" && signal.direction !== "pressure") ||
            typeof signal.magnitude !== "string" ||
            !(signal.magnitude in CIVILIZATION_STABILITY_IMPACT_MAGNITUDES) ||
            typeof signal.label !== "string"
          ) return [];
          return [{
            signalId: signal.signalId,
            dimension: signal.dimension as CivilizationOutcomeSignal["dimension"],
            direction: signal.direction,
            magnitude: signal.magnitude as CivilizationOutcomeSignal["magnitude"],
            label: signal.label,
          }];
        })
      : [];
    const adversity: CivilizationAdversityEvidence | null = isRecord(candidate.adversity) &&
      typeof candidate.adversity.evidenceId === "string" &&
      typeof candidate.adversity.magnitude === "string" &&
      candidate.adversity.magnitude in CIVILIZATION_STABILITY_IMPACT_MAGNITUDES &&
      typeof candidate.adversity.label === "string" &&
      typeof candidate.adversity.recoveryEligible === "boolean"
      ? {
          evidenceId: candidate.adversity.evidenceId,
          magnitude: candidate.adversity.magnitude as CivilizationAdversityEvidence["magnitude"],
          label: candidate.adversity.label,
          recoveryEligible: candidate.adversity.recoveryEligible,
        }
      : null;
    return [{
      eventId: candidate.eventId,
      source,
      turnCount:
        typeof candidate.turnCount === "number" && candidate.turnCount >= 0
          ? Math.floor(candidate.turnCount)
          : null,
      form: candidate.form as CivilizationEventHistoryEntry["form"],
      pressureTags,
      selectedTrajectoryId: candidate.selectedTrajectoryId,
      outcome: candidate.outcome,
      summary: candidate.summary,
      history,
      outcomeSignals,
      adversity,
      historyEvidence: normalizeHistoryEvidence(candidate.historyEvidence),
    }];
  }).slice(-64);
}

function normalizeCivilizationState(player: {
  civilization?: unknown;
  forgedArtifactIds?: unknown;
  artifactForgeCounts?: unknown;
  discountedForgeIds?: unknown;
  manifestedBlueprintDevices?: unknown;
  civilizationTurnCount?: unknown;
}): CivilizationState {
  const activeCounts = usageCountsFromIds(player.forgedArtifactIds);
  const forgeCounts = isRecord(player.artifactForgeCounts)
    ? Object.fromEntries(
        Object.entries(player.artifactForgeCounts)
          .filter(([id, count]) => id.length > 0 && typeof count === "number" && count > 0)
          .map(([id, count]) => [id, Math.floor(count as number)]),
      )
    : {};
  const rawCivilization = isRecord(player.civilization) ? player.civilization : {};
  const rawArtifacts = isRecord(rawCivilization.artifacts) ? rawCivilization.artifacts : {};
  const artifactIds = new Set([
    ...Object.keys(rawArtifacts),
    ...Object.keys(forgeCounts),
    ...Object.keys(activeCounts),
  ]);
  const artifacts: Record<string, CivilizationArtifactLifecycleState> = {};

  for (const artifactId of artifactIds) {
    const raw = isRecord(rawArtifacts[artifactId]) ? rawArtifacts[artifactId] : {};
    const recordedCount =
      typeof raw.masteryCount === "number" && raw.masteryCount > 0
        ? Math.floor(raw.masteryCount)
        : 0;
    const masteryCount = Math.max(
      1,
      recordedCount,
      forgeCounts[artifactId] ?? 0,
      activeCounts[artifactId] ?? 0,
    );
    const hasActiveImplementation = (activeCounts[artifactId] ?? 0) > 0;
    let implementationState = isCivilizationImplementationState(raw.implementationState)
      ? raw.implementationState
      : null;
    let stateChangedTurnCount =
      typeof raw.implementationStateChangedTurnCount === "number" &&
      raw.implementationStateChangedTurnCount >= 0
        ? Math.floor(raw.implementationStateChangedTurnCount)
        : null;
    let changeSource = normalizeCivilizationChangeSource(raw.implementationChangeSource);
    let historyEvidence = raw.historyEvidence === "recorded"
      ? "recorded" as const
      : "legacy_inferred" as const;

    if (hasActiveImplementation) {
      implementationState = "operational";
      if (!isRecord(rawArtifacts[artifactId])) {
        stateChangedTurnCount = null;
        historyEvidence = "legacy_inferred";
      }
    } else if (implementationState === "operational") {
      // The active tableau is authoritative for current operation. A legacy
      // mismatch cannot be truthfully upgraded to Damage or Annihilation.
      implementationState = null;
      stateChangedTurnCount = null;
      changeSource = null;
      historyEvidence = "legacy_inferred";
    }

    artifacts[artifactId] = {
      artifactId,
      firstMasteredTurnCount:
        typeof raw.firstMasteredTurnCount === "number" && raw.firstMasteredTurnCount >= 0
          ? Math.floor(raw.firstMasteredTurnCount)
          : null,
      masteryCount,
      implementationState,
      implementationStateChangedTurnCount: stateChangedTurnCount,
      implementationChangeSource: changeSource,
      historyEvidence,
    };
  }

  const currentShape = rawCivilization.version === CIVILIZATION_STATE_VERSION;
  const { homeworldId, worlds } = normalizeCivilizationWorlds(
    rawCivilization.worlds,
    rawCivilization.homeworldId,
    currentShape,
  );
  const rawScale = isRecord(rawCivilization.scale) ? rawCivilization.scale : {};
  const historicalMaturity = CIVILIZATION_MATURITY_LEVELS.includes(
    rawScale.historicalMaturity as (typeof CIVILIZATION_MATURITY_LEVELS)[number],
  )
    ? rawScale.historicalMaturity as (typeof CIVILIZATION_MATURITY_LEVELS)[number]
    : "planetary";
  const currentReach = rawScale.currentReach === "unknown" || CIVILIZATION_MATURITY_LEVELS.includes(
    rawScale.currentReach as (typeof CIVILIZATION_MATURITY_LEVELS)[number],
  )
    ? rawScale.currentReach as CivilizationState["scale"]["currentReach"]
    : currentShape
      ? "planetary"
      : "unknown";
  const currentReachCondition = CIVILIZATION_REACH_CONDITIONS.includes(
    rawScale.currentReachCondition as (typeof CIVILIZATION_REACH_CONDITIONS)[number],
  )
    ? rawScale.currentReachCondition as (typeof CIVILIZATION_REACH_CONDITIONS)[number]
    : currentShape
      ? "intact"
      : "unknown";
  const computedLiteralKardashevType = computeKardashevTier(
    Array.isArray(player.forgedArtifactIds)
      ? player.forgedArtifactIds.filter((id): id is string => typeof id === "string")
      : [],
    Array.isArray(player.discountedForgeIds)
      ? player.discountedForgeIds.filter((id): id is string => typeof id === "string")
      : [],
  );
  const literalKardashevType =
    rawScale.literalKardashevType === 0 ||
    rawScale.literalKardashevType === 1 ||
    rawScale.literalKardashevType === 2 ||
    rawScale.literalKardashevType === 3
      ? rawScale.literalKardashevType
      : computedLiteralKardashevType;
  const rawStability = isRecord(rawCivilization.stability) ? rawCivilization.stability : {};
  const stabilityBand = CIVILIZATION_STABILITY_BANDS.includes(
    rawStability.band as (typeof CIVILIZATION_STABILITY_BANDS)[number],
  )
    ? rawStability.band as (typeof CIVILIZATION_STABILITY_BANDS)[number]
    : "stable";

  const normalized: CivilizationState = {
    version: CIVILIZATION_STATE_VERSION,
    artifacts,
    affinityIdentity: deriveCivilizationAffinityIdentity(artifacts),
    scale: {
      historicalMaturity,
      historicalMaturityEvidence: Array.isArray(rawScale.historicalMaturityEvidence)
        ? rawScale.historicalMaturityEvidence
            .map(normalizeScaleEvidence)
            .filter((entry): entry is CivilizationScaleEvidence => entry !== null)
        : [],
      currentReach,
      currentReachCondition,
      currentReachEvidence: Array.isArray(rawScale.currentReachEvidence)
        ? rawScale.currentReachEvidence
            .map(normalizeScaleEvidence)
            .filter((entry): entry is CivilizationScaleEvidence => entry !== null)
        : [],
      literalKardashevType,
      literalKardashevEvidence: currentShape
        ? normalizeHistoryEvidence(rawScale.literalKardashevEvidence)
        : "legacy_inferred",
    },
    homeworldId,
    worlds,
    entities: normalizeCivilizationEntities(rawCivilization.entities),
    conditions: normalizeCivilizationConditions(rawCivilization.conditions),
    stability: {
      band: stabilityBand,
      score: typeof rawStability.score === "number" ? rawStability.score : null,
      calibrationId:
        typeof rawStability.calibrationId === "string" ? rawStability.calibrationId : null,
      contributors: normalizeStabilityContributors(rawStability.contributors),
      calculatedTurnCount:
        typeof rawStability.calculatedTurnCount === "number" && rawStability.calculatedTurnCount >= 0
          ? Math.floor(rawStability.calculatedTurnCount)
          : currentShape
            ? 0
            : null,
      historyEvidence: currentShape
        ? normalizeHistoryEvidence(rawStability.historyEvidence)
        : "legacy_inferred",
    },
    events: normalizeCivilizationEvents(rawCivilization.events),
  };
  const manifestedDevices = Array.isArray(player.manifestedBlueprintDevices)
    ? player.manifestedBlueprintDevices.filter((device) =>
        isRecord(device) &&
        typeof device.blueprintId === "string" &&
        device.blueprintId in BLUEPRINT_DEFINITIONS &&
        typeof device.state === "string",
      ) as ManifestedDevicePublicState[]
    : [];
  return reconcileCivilizationDerivedState(
    normalized,
    manifestedDevices,
    typeof player.civilizationTurnCount === "number" && player.civilizationTurnCount >= 0
      ? Math.floor(player.civilizationTurnCount)
      : normalized.stability.calculatedTurnCount,
  );
}

function refreshPlayerCivilization(player: PlayerGameState, turnCount: number): void {
  player.civilization = normalizeCivilizationState({
    ...player,
    civilizationTurnCount: turnCount,
  });
}

function recordBlueprintCivilizationEvent(
  state: GameStateData,
  player: PlayerGameState,
  blueprintId: BlueprintId,
  kind: BlueprintCivilizationEventKind,
  eventId: string,
  summary: string,
  historyValue?: string,
): void {
  player.civilization = normalizeCivilizationState({
    ...player,
    civilizationTurnCount: state.turnCount,
  });
  player.civilization = resolveBlueprintCivilizationEventPolicy({
    eventId,
    civilization: player.civilization,
    blueprintId,
    kind,
    turnCount: state.turnCount,
    summary,
    historyValue,
  }).civilization;
}

function recordArtifactImplementation(
  player: PlayerGameState,
  artifactId: string,
  turnCount: number,
  options: { countForgeAction?: boolean } = {},
): void {
  const priorRaw = isRecord(player.civilization?.artifacts?.[artifactId])
    ? player.civilization.artifacts[artifactId]
    : null;
  const countForgeAction = options.countForgeAction !== false;
  if (countForgeAction) {
    player.artifactForgeCounts = incrementUsageCount(player.artifactForgeCounts, artifactId);
  }
  const civilization = normalizeCivilizationState(player);
  const prior = civilization.artifacts[artifactId];
  const masteryCount = countForgeAction
    ? Math.max(prior?.masteryCount ?? 0, player.artifactForgeCounts?.[artifactId] ?? 1)
    : Math.max(1, (priorRaw?.masteryCount as number | undefined ?? 0) + 1);
  const hasUnrecordedPriorHistory =
    priorRaw === null && countForgeAction && masteryCount > 1;

  civilization.artifacts[artifactId] = {
    artifactId,
    firstMasteredTurnCount: priorRaw
      ? prior?.firstMasteredTurnCount ?? null
      : hasUnrecordedPriorHistory
        ? null
        : turnCount,
    masteryCount,
    implementationState: "operational",
    implementationStateChangedTurnCount: turnCount,
    implementationChangeSource: null,
    historyEvidence: priorRaw
      ? prior?.historyEvidence ?? "legacy_inferred"
      : hasUnrecordedPriorHistory
        ? "legacy_inferred"
        : "recorded",
  };
  player.civilization = reconcileCivilizationDerivedState(
    civilization,
    player.manifestedBlueprintDevices ?? [],
    turnCount,
  );
}

function setArtifactImplementationArchived(
  player: PlayerGameState,
  artifactId: string,
  turnCount: number,
): void {
  const civilization = normalizeCivilizationState(player);
  const prior = civilization.artifacts[artifactId];
  if (!prior) return;
  civilization.artifacts[artifactId] = {
    ...prior,
    implementationState: "archived",
    implementationStateChangedTurnCount: turnCount,
    implementationChangeSource: {
      sourceType: "blueprint",
      sourceId: "bp_mantle_to_orbit_foundry",
    },
  };
  player.civilization = reconcileCivilizationDerivedState(
    civilization,
    player.manifestedBlueprintDevices ?? [],
    turnCount,
  );
}

function removeFoundryComponentsFromOperation(
  state: GameStateData,
  player: PlayerGameState,
  privateState: BlueprintPrivateState,
): string[] {
  const componentIds = BLUEPRINT_DEFINITIONS.bp_mantle_to_orbit_foundry.components
    .map((component) => component.artifactId);
  const movedIds: string[] = [];

  for (const artifactId of componentIds) {
    const forgedIndex = player.forgedArtifactIds.indexOf(artifactId);
    const assimilatedIndex = (player.assimilatedArtifactIds ?? []).indexOf(artifactId);
    if (forgedIndex === -1 && assimilatedIndex === -1) continue;
    const card = CARD_MAP.get(artifactId);
    if (forgedIndex !== -1) player.forgedArtifactIds.splice(forgedIndex, 1);
    if (assimilatedIndex !== -1) player.assimilatedArtifactIds!.splice(assimilatedIndex, 1);
    if (card) {
      player.bonuses[card.bonusAffinity] = Math.max(
        0,
        player.bonuses[card.bonusAffinity] - 1,
      );
    }
    player.discountedForgeIds = player.discountedForgeIds.filter((id) => id !== artifactId);
    player.blueprintBlockedCardIds = (player.blueprintBlockedCardIds ?? [])
      .filter((id) => id !== artifactId);
    if (player.forgedArtifactBonusSnapshots) {
      delete player.forgedArtifactBonusSnapshots[artifactId];
    }
    if (state.artifactMarkers) delete state.artifactMarkers[artifactId];
    setArtifactImplementationArchived(player, artifactId, state.turnCount);
    movedIds.push(artifactId);
  }

  privateState.foundryStoredArtifactIds = [...movedIds];
  delete privateState.foundryRecoveryArtifactIds;
  for (const artifactId of movedIds) {
    if (!player.reservedArtifactIds.includes(artifactId)) {
      player.reservedArtifactIds.push(artifactId);
    }
    if (player.privateReservedArtifactIds) {
      player.privateReservedArtifactIds = player.privateReservedArtifactIds
        .filter((id) => id !== artifactId);
    }
  }
  return movedIds;
}

function removeArtifactFromFoundryStorage(
  privateState: BlueprintPrivateState,
  artifactId: string,
): void {
  privateState.foundryStoredArtifactIds = (privateState.foundryStoredArtifactIds ?? [])
    .filter((id) => id !== artifactId);
  if (privateState.foundryRecoveryArtifactIds) {
    privateState.foundryRecoveryArtifactIds = privateState.foundryRecoveryArtifactIds
      .filter((id) => id !== artifactId);
  }
}

function completeFoundryClaim(
  state: GameStateData,
  player: PlayerGameState,
  action: ActionPayload,
): void {
  if (!action.blueprintAction) return;
  const foundry = getManifestedDevice(player, "bp_mantle_to_orbit_foundry");
  const privateState = findPrivateBlueprintState(player, "bp_mantle_to_orbit_foundry");
  if (!foundry || !privateState) return;

  if (action.blueprintAction === "foundry_recovery") {
    removeArtifactFromFoundryStorage(privateState, action.cardId!);
    if ((privateState.foundryStoredArtifactIds?.length ?? 0) === 0) {
      foundry.state = "ready";
      foundry.foundryUsesRemaining = 0;
    }
    recordBlueprintCivilizationEvent(
      state,
      player,
      "bp_mantle_to_orbit_foundry",
      "foundry_recovery",
      `bp-foundry-recovery-v${state.version}-${Date.now()}-${action.cardId}`,
      "Mantle-to-Orbit Foundry recovered an archived component into operation",
      action.cardId,
    );
    refreshPlayerCivilization(player, state.turnCount);
    return;
  }

  if (action.blueprintAction === "foundry_sustainable") {
    foundry.foundryUsesRemaining = Math.max(0, foundryUsesRemaining(foundry) - 1);
    delete foundry.foundryTier2Ready;
    delete foundry.foundryTier3Ready;
    recordBlueprintCivilizationEvent(
      state,
      player,
      "bp_mantle_to_orbit_foundry",
      "foundry_sustainable",
      `bp-foundry-sustainable-v${state.version}-${Date.now()}-${action.cardId}`,
      "Mantle-to-Orbit Foundry completed a sustainable orbital fabrication",
      action.cardId,
    );
    return;
  }

  foundry.foundryUsesRemaining = 0;
  delete foundry.foundryTier2Ready;
  delete foundry.foundryTier3Ready;
  const recoverable = state.brokenCovenantDeclared === true;
  const movedIds = removeFoundryComponentsFromOperation(
    state,
    player,
    privateState,
  );
  foundry.state = recoverable && movedIds.length > 0 ? "recovering" : "spent";
  recordBlueprintCivilizationEvent(
    state,
    player,
    "bp_mantle_to_orbit_foundry",
    "foundry_overdrive",
    `bp-foundry-overdrive-v${state.version}-${Date.now()}-${action.cardId}`,
    recoverable
      ? `Foundry Overdrive sealed ${movedIds.length} component(s) in Cipher storage for recovery`
      : `Foundry Overdrive sealed ${movedIds.length} component implementation(s) in Cipher storage`,
    movedIds.join(","),
  );
  refreshPlayerCivilization(player, state.turnCount);
  pushLog(state, {
    playerId: player.playerId,
    playerName: player.playerName,
    summary: recoverable
      ? `Mantle-to-Orbit Foundry Overdrive sealed ${movedIds.length} component(s) for free recovery`
      : `Mantle-to-Orbit Foundry Overdrive sealed ${movedIds.length} component(s) in Cipher storage`,
    turn: state.roundNumber,
  });
}

function affinityWellForPlayerCount(count: number): AffinityCounts {
  const n = count === 2 ? 4 : count === 3 ? 5 : 7;
  return { flare: n, continuum: n, verdance: n, abyss: n, radiance: n, singularity: 5 };
}

function cloneInitialBoardSnapshot(board: InitialBoardSnapshot): InitialBoardSnapshot {
  return {
    forgeTier1: [...board.forgeTier1],
    forgeTier2: [...board.forgeTier2],
    forgeTier3: [...board.forgeTier3],
    deckTier1: [...board.deckTier1],
    deckTier2: [...board.deckTier2],
    deckTier3: [...board.deckTier3],
    activeLuminaries: [...board.activeLuminaries],
    firstPlayerId: board.firstPlayerId ?? null,
  };
}

function makeInitialBoardSnapshot(state: Pick<GameStateData,
  | "forgeTier1"
  | "forgeTier2"
  | "forgeTier3"
  | "deckTier1"
  | "deckTier2"
  | "deckTier3"
  | "activeLuminaries"
>, firstPlayerId: string | null): InitialBoardSnapshot {
  return {
    forgeTier1: [...state.forgeTier1],
    forgeTier2: [...state.forgeTier2],
    forgeTier3: [...state.forgeTier3],
    deckTier1: [...state.deckTier1],
    deckTier2: [...state.deckTier2],
    deckTier3: [...state.deckTier3],
    activeLuminaries: [...state.activeLuminaries],
    firstPlayerId,
  };
}

export function getReplayBoardSnapshot(state: GameStateData): InitialBoardSnapshot {
  if (state.initialBoard) {
    return cloneInitialBoardSnapshot(state.initialBoard);
  }

  return makeInitialBoardSnapshot(
    {
      forgeTier1: state.forgeTier1,
      forgeTier2: state.forgeTier2,
      forgeTier3: state.forgeTier3,
      deckTier1: state.deckTier1,
      deckTier2: state.deckTier2,
      deckTier3: state.deckTier3,
      activeLuminaries: state.activeLuminaries,
    },
    state.openingTurnOrder?.firstPlayerId ?? null,
  );
}

// ─── Game Initialization ─────────────────────────────────────────────────────

export function initializeGame(
  players: {
    id: string;
    name: string;
    luminaryArrivalSound?: LuminaryArrivalSoundVariant;
  }[],
  playerCount: number,
  victoryRequirement: number = DEFAULT_VICTORY_REQUIREMENT,
  cinematicMode: "standard" | "epic" = "standard",
  options: InitializeGameOptions = {},
): GameStateData {
  const replayBoard = options.replayBoard
    ? cloneInitialBoardSnapshot(options.replayBoard)
    : null;

  let forgeTier1: string[];
  let forgeTier2: string[];
  let forgeTier3: string[];
  let deckTier1: string[];
  let deckTier2: string[];
  let deckTier3: string[];
  let activeLuminaries: string[];

  if (replayBoard) {
    forgeTier1 = [...replayBoard.forgeTier1];
    forgeTier2 = [...replayBoard.forgeTier2];
    forgeTier3 = [...replayBoard.forgeTier3];
    deckTier1 = [...replayBoard.deckTier1];
    deckTier2 = [...replayBoard.deckTier2];
    deckTier3 = [...replayBoard.deckTier3];
    activeLuminaries = [...replayBoard.activeLuminaries];
  } else {
    const tier1Ids = shuffle(
      CARD_CATALOG.filter((c) => c.tier === 1).map((c) => c.id),
    );
    const tier2Ids = shuffle(
      CARD_CATALOG.filter((c) => c.tier === 2).map((c) => c.id),
    );
    const tier3Ids = shuffle(
      CARD_CATALOG.filter((c) => c.tier === 3).map((c) => c.id),
    );

    // Luminaries: pick playerCount+1 from illustrated pool only
    const lumCount = Math.min(playerCount + 1, AVAILABLE_LUMINARIES.length);
    activeLuminaries = shuffle(AVAILABLE_LUMINARIES.map((l) => l.id)).slice(
      0,
      lumCount,
    );

    forgeTier1 = tier1Ids.slice(0, 4);
    deckTier1 = tier1Ids.slice(4);
    forgeTier2 = tier2Ids.slice(0, 4);
    deckTier2 = tier2Ids.slice(4);
    forgeTier3 = tier3Ids.slice(0, 4);
    deckTier3 = tier3Ids.slice(4);
  }

  const playerStates: PlayerGameState[] = players.map((p) => {
    const blueprintSetup = options.blueprintSetups?.[p.id];
    return {
      playerId: p.id,
      playerName: p.name,
      luminaryArrivalSound: p.luminaryArrivalSound ?? "standard",
      affinities: zeroAffinities(),
      bonuses: zeroAffinities(),
      eminence: 0,
      reservedArtifactIds: [],
      privateReservedArtifactIds: [],
      forgedArtifactIds: [],
      artifactForgeCounts: {},
      civilization: emptyCivilizationState(),
      assimilatedArtifactIds: [],
      discountedForgeIds: [],
      blueprintBlockedCardIds: [],
      blueprintPrivateStates: (blueprintSetup?.blueprintIds ?? []).map(
        (blueprintId, slotIndex): BlueprintPrivateState => ({
          blueprintId,
          slotIndex,
          matchedComponentIds: [],
          manifested: false,
          secretTargetCardId: null,
          safePreManifestActionPlayerIds: [],
          ...(blueprintId === "bp_mantle_to_orbit_foundry"
            ? { foundryStoredArtifactIds: [] }
            : {}),
        }),
      ),
      blueprintPresentationVariants: blueprintSetup?.presentationVariants ?? {},
      manifestedBlueprintDevices: [],
      tideArchiveForgeAvailable: false,
      luminaries: [],
      luminaryAllianceCounts: {},
      isConnected: true,
      plannedAction: null,
      plannedActionCancelReason: null,
    };
  });

  const startedAt = Date.now();
  const replayFirstPlayerIndex = replayBoard?.firstPlayerId
    ? playerStates.findIndex((player) => player.playerId === replayBoard.firstPlayerId)
    : -1;
  const startingPlayerIndex = replayFirstPlayerIndex >= 0
    ? replayFirstPlayerIndex
    : Math.floor(Math.random() * playerStates.length);
  const startingPlayer = playerStates[startingPlayerIndex];

  return {
    startedAt,
    initialBoard: makeInitialBoardSnapshot(
      {
        forgeTier1: forgeTier1,
        forgeTier2: forgeTier2,
        forgeTier3: forgeTier3,
        deckTier1,
        deckTier2,
        deckTier3,
        activeLuminaries,
      },
      startingPlayer.playerId,
    ),
    openingTurnOrder: {
      id: `${startedAt}:${startingPlayer.playerId}`,
      startedAt,
      firstPlayerId: startingPlayer.playerId,
      playerIds: playerStates.map((player) => player.playerId),
    },
    currentPlayerIndex: startingPlayerIndex,
    roundNumber: 1,
    turnCount: 0,
    phase: "playing",
    victoryRequirement: Math.max(MIN_VICTORY_REQUIREMENT, Math.floor(victoryRequirement)),
    cinematicMode: cinematicMode === "epic" ? "epic" : "standard",
    affinityWell: affinityWellForPlayerCount(playerCount),
    forgeTier1: forgeTier1,
    forgeTier2: forgeTier2,
    forgeTier3: forgeTier3,
    deckTier1,
    deckTier2,
    deckTier3,
    activeLuminaries,
    luminaryAffinities: [],
    pendingSummonEvents: [],
    pendingLuminaryActivationEvents: [],
    pendingBlueprintManifestationEvents: [],
    pendingBlueprintDetonationEvents: [],
    pendingTurnTransition: null,
    nullifiedFirstForge: null,
    forgottenHourCycle: {},
    phoenixRecurrence: undefined,
    brokenCovenantDeclared: false,
    voidSealOwnerId: null,
    players: playerStates,
    winnerId: null,
    winTriggerLuminaryId: null,
    lastAction: null,
    actionLog: [
      {
        playerId: startingPlayer.playerId,
        playerName: startingPlayer.playerName,
        summary: `goes first (chosen at random)`,
        turn: 0,
      },
    ],
    turnTimerSeconds: null,
    turnDeadline: null,
    version: 1,
    burnPile: [],
    burnEvents: [],
    annihilatedArtifactIds: [],
    coreActionUsed: false,
  };
}

const TRACE_VEY_ROUTING_NETWORK_ID = 'chronicle_trace:vey_routing_network';
const TRACE_KEELBORN_ROUTING_NETWORK_ID = 'chronicle_trace:keelborn_routing_network';
const TRACE_OPENING_PREPAREDNESS_ARTIFACT_IDS = ['t1p03', 't1s04', 't1s06'] as const;

function traceRoutingNetwork(id: string): CivilizationEntity {
  return {
    id,
    kind: 'network',
    state: 'operational',
    worldId: null,
    sourceId: TRACE_CHRONICLE_ID,
    establishedTurnCount: 0,
    stateChangedTurnCount: 0,
    conditionIds: [],
    historyEvidence: 'recorded',
  };
}

function promoteTraceOpeningArtifacts(state: GameStateData): void {
  TRACE_OPENING_PREPAREDNESS_ARTIFACT_IDS.forEach((artifactId, targetIndex) => {
    const currentIndex = state.forgeTier1.indexOf(artifactId);
    if (currentIndex >= 0) {
      const displaced = state.forgeTier1[targetIndex];
      state.forgeTier1[targetIndex] = artifactId;
      if (currentIndex !== targetIndex && displaced) state.forgeTier1[currentIndex] = displaced;
      return;
    }
    const archiveIndex = state.deckTier1.indexOf(artifactId);
    if (archiveIndex < 0) return;
    const displaced = state.forgeTier1[targetIndex];
    state.deckTier1.splice(archiveIndex, 1);
    state.forgeTier1[targetIndex] = artifactId;
    if (displaced) state.deckTier1.splice(archiveIndex, 0, displaced);
  });
}

/** Apply the authored, server-owned setup for The Trace. */
export function configureTraceScenario(
  state: GameStateData,
  architectPlayerId: string,
  autonomousPlayerId: string,
  runKind: ChronicleRunKind,
): void {
  const architectIndex = state.players.findIndex((player) => player.playerId === architectPlayerId);
  const architect = state.players[architectIndex];
  const autonomous = state.players.find((player) => player.playerId === autonomousPlayerId);
  if (!architect || !autonomous) throw new Error('The Trace requires both authored participants');

  architect.civName = 'Cantons of Vey';
  autonomous.civName = 'Keelborn Convoy';
  architect.blueprintPrivateStates = [];
  architect.manifestedBlueprintDevices = [];
  autonomous.blueprintPrivateStates = [];
  autonomous.manifestedBlueprintDevices = [];
  architect.civilization = upsertCivilizationEntity(
    architect.civilization,
    traceRoutingNetwork(TRACE_VEY_ROUTING_NETWORK_ID),
  );
  autonomous.civilization = upsertCivilizationEntity(
    autonomous.civilization,
    traceRoutingNetwork(TRACE_KEELBORN_ROUTING_NETWORK_ID),
  );

  state.traceScenario = {
    chronicleId: TRACE_CHRONICLE_ID,
    scenarioId: TRACE_SCENARIO_ID,
    definitionVersion: TRACE_DEFINITION_VERSION,
    runKind,
    architectPlayerId,
    autonomousPlayerId,
    phase: 'playing',
    architectCoreActionCount: 0,
    guidanceDueAfterCoreActions: TRACE_GUIDANCE_DUE_AFTER_CORE_ACTIONS,
    guidanceMethod: null,
    guidanceResolvedAtTurnCount: null,
    preparednessObjectiveMet: false,
    preparednessArtifactId: null,
    outcomeId: null,
  };

  promoteTraceOpeningArtifacts(state);
  state.currentPlayerIndex = architectIndex;
  const startedAt = state.startedAt ?? Date.now();
  state.openingTurnOrder = {
    id: `${startedAt}:${architectPlayerId}`,
    startedAt,
    firstPlayerId: architectPlayerId,
    playerIds: state.players.map((player) => player.playerId),
  };
  if (state.initialBoard) {
    state.initialBoard = {
      ...state.initialBoard,
      forgeTier1: [...state.forgeTier1],
      deckTier1: [...state.deckTier1],
      firstPlayerId: architectPlayerId,
    };
  }
  state.actionLog = [{
    playerId: architectPlayerId,
    playerName: architect.playerName,
    summary: 'enters the Crownfall forecast first',
    turn: 0,
  }];
}

function traceConditionType(
  method: TraceGuidanceMethod,
  perspective: 'vey' | 'keelborn',
): CivilizationCondition['type'] {
  if (perspective === 'vey') {
    if (method === 'expose_all_routes') return 'chronicle:trace_open_deliberation';
    if (method === 'withhold_alternatives') return 'chronicle:trace_curated_brief';
    return 'chronicle:trace_helm_lock';
  }
  if (method === 'expose_all_routes') return 'chronicle:trace_shared_forecast';
  if (method === 'withhold_alternatives') return 'chronicle:trace_withheld_routes';
  return 'chronicle:trace_external_helm_lock';
}

function applyTraceGuidanceCondition(
  player: PlayerGameState,
  method: TraceGuidanceMethod,
  perspective: 'vey' | 'keelborn',
  turnCount: number,
): void {
  const networkId = perspective === 'vey'
    ? TRACE_VEY_ROUTING_NETWORK_ID
    : TRACE_KEELBORN_ROUTING_NETWORK_ID;
  const conditionType = traceConditionType(method, perspective);
  const eventId = `trace-guidance:${perspective}:${method}`;
  const condition: CivilizationCondition = {
    id: `${eventId}:condition`,
    type: conditionType,
    coreType: null,
    target: { kind: 'network', id: networkId },
    source: { sourceType: 'chronicle', sourceId: TRACE_CHRONICLE_ID },
    appliedTurnCount: turnCount,
    resolvedTurnCount: null,
    historyEvidence: 'recorded',
  };
  const resolution = resolveCivilizationEvent({
    eventId,
    source: { sourceType: 'chronicle', sourceId: TRACE_CHRONICLE_ID },
    form: 'contextual',
    timing: 'trigger_window',
    pressureTags: ['coordination', 'exposure'],
    snapshot: buildCivilizationResolutionSnapshot(player.civilization),
    trajectories: [{
      id: method,
      label: conditionType,
      requirements: [],
      uncertainty: null,
      successConsequences: [
        { type: 'apply_condition', condition },
        { type: 'record_history', key: 'chronicle.trace.v1:guidance_method', value: method },
      ],
      failureConsequences: [],
    }],
    selectedTrajectoryId: method,
  });
  player.civilization = applyCivilizationResolution(
    player.civilization,
    resolution,
    turnCount,
    perspective === 'vey'
      ? 'The Architect altered which Crownfall route became legible.'
      : 'The Keelborn received the Architect-mediated Crownfall forecast.',
  ).state;
}

function resolveTraceGuidance(
  state: GameStateData,
  playerId: string,
  method: TraceGuidanceMethod,
): { success: boolean; error?: string; changed?: boolean } {
  const trace = state.traceScenario;
  if (!trace) return { success: false, error: 'No Chronicle guidance is pending' };
  if (trace.architectPlayerId !== playerId) {
    return { success: false, error: 'Only the Architect may guide Crownfall' };
  }
  if (trace.guidanceMethod !== null) {
    return trace.guidanceMethod === method
      ? { success: true, changed: false }
      : { success: false, error: 'Crownfall guidance has already been recorded' };
  }
  if (trace.phase !== 'awaiting_guidance') {
    return { success: false, error: 'The Crownfall decision window is not open' };
  }

  const architect = state.players.find((player) => player.playerId === trace.architectPlayerId);
  const autonomous = state.players.find((player) => player.playerId === trace.autonomousPlayerId);
  if (!architect || !autonomous) return { success: false, error: 'Chronicle participants are unavailable' };

  applyTraceGuidanceCondition(architect, method, 'vey', state.turnCount);
  applyTraceGuidanceCondition(autonomous, method, 'keelborn', state.turnCount);
  trace.guidanceMethod = method;
  trace.guidanceResolvedAtTurnCount = state.turnCount;
  trace.phase = 'guidance_resolved';
  return { success: true, changed: true };
}

function traceGuidanceIsDue(state: GameStateData): boolean {
  const trace = state.traceScenario;
  return !!trace &&
    trace.guidanceMethod === null &&
    trace.phase !== 'finished' &&
    trace.architectCoreActionCount >= trace.guidanceDueAfterCoreActions;
}

function updateTraceProgressAfterAction(
  state: GameStateData,
  player: PlayerGameState,
  action: ActionPayload,
): void {
  const trace = state.traceScenario;
  if (!trace || trace.phase === 'finished' || player.playerId !== trace.architectPlayerId) return;
  if (CORE_ACTIONS.has(action.type)) trace.architectCoreActionCount += 1;
  if (
    !trace.preparednessObjectiveMet &&
    (action.type === 'forge_artifact' || action.type === 'forge_reserved_artifact') &&
    action.cardId &&
    player.forgedArtifactIds.includes(action.cardId)
  ) {
    const capabilityIds = ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID[
      action.cardId as keyof typeof ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID
    ] ?? [];
    if (capabilityIds.some((id) => (TRACE_PREPAREDNESS_CAPABILITY_IDS as readonly string[]).includes(id))) {
      trace.preparednessObjectiveMet = true;
      trace.preparednessArtifactId = action.cardId;
    }
  }
}

function applyTraceClosureHistory(
  state: GameStateData,
  outcomeId: NonNullable<TraceScenarioState['outcomeId']>,
): void {
  const trace = state.traceScenario;
  if (!trace) return;
  for (const player of state.players) {
    const perspective = player.playerId === trace.architectPlayerId ? 'vey' : 'keelborn';
    const eventId = `trace-closure:${perspective}:${outcomeId}`;
    const resolution = resolveCivilizationEvent({
      eventId,
      source: { sourceType: 'chronicle', sourceId: TRACE_CHRONICLE_ID },
      form: 'automatic',
      timing: 'trigger_window',
      pressureTags: ['disruption', 'coordination'],
      snapshot: buildCivilizationResolutionSnapshot(player.civilization),
      trajectories: [{
        id: outcomeId,
        label: 'Crownfall historical closure',
        requirements: [],
        uncertainty: null,
        successConsequences: [{
          type: 'record_history',
          key: 'chronicle.trace.v1:crownfall_outcome',
          value: outcomeId,
        }],
        failureConsequences: [],
      }],
    });
    player.civilization = applyCivilizationResolution(
      player.civilization,
      resolution,
      state.turnCount,
      'Crownfall closed with both civilizations still present in the record.',
    ).state;
  }
}

function finalizeTraceScenarioOutcome(state: GameStateData): void {
  const trace = state.traceScenario;
  if (!trace || trace.phase === 'finished' || trace.guidanceMethod === null) return;
  const result = state.winnerId === trace.architectPlayerId ? 'victory' : 'defeat';
  const outcomeId = traceOutcomeId(trace.guidanceMethod, result);
  applyTraceClosureHistory(state, outcomeId);
  trace.outcomeId = outcomeId;
  trace.phase = 'finished';
}

const RECURRENCE_MERIDIAN_INDEX_ID = 'chronicle_recurrence:meridian_deep_index';
const RECURRENCE_ORU_INDEX_ID = 'chronicle_recurrence:oru_deep_index';
const RECURRENCE_OPENING_PREPAREDNESS_ARTIFACT_IDS = ['t1p03', 't1o03', 't1s06'] as const;

function recurrenceArchiveEntity(id: string): CivilizationEntity {
  return {
    id,
    kind: 'network',
    state: 'operational',
    worldId: null,
    sourceId: RECURRENCE_CHRONICLE_ID,
    establishedTurnCount: 0,
    stateChangedTurnCount: 0,
    conditionIds: [],
    historyEvidence: 'recorded',
  };
}

function promoteRecurrenceOpeningArtifacts(state: GameStateData): void {
  RECURRENCE_OPENING_PREPAREDNESS_ARTIFACT_IDS.forEach((artifactId, targetIndex) => {
    const currentIndex = state.forgeTier1.indexOf(artifactId);
    if (currentIndex >= 0) {
      const displaced = state.forgeTier1[targetIndex];
      state.forgeTier1[targetIndex] = artifactId;
      if (currentIndex !== targetIndex && displaced) state.forgeTier1[currentIndex] = displaced;
      return;
    }
    const archiveIndex = state.deckTier1.indexOf(artifactId);
    if (archiveIndex < 0) return;
    const displaced = state.forgeTier1[targetIndex];
    state.deckTier1.splice(archiveIndex, 1);
    state.forgeTier1[targetIndex] = artifactId;
    if (displaced) state.deckTier1.splice(archiveIndex, 0, displaced);
  });
}

/** Apply the authored, server-owned setup for The Recurrence. */
export function configureRecurrenceScenario(
  state: GameStateData,
  architectPlayerId: string,
  autonomousPlayerId: string,
  runKind: ChronicleRunKind,
): void {
  const architectIndex = state.players.findIndex((player) => player.playerId === architectPlayerId);
  const architect = state.players[architectIndex];
  const autonomous = state.players.find((player) => player.playerId === autonomousPlayerId);
  if (!architect || !autonomous) throw new Error('The Recurrence requires both authored participants');

  architect.civName = 'Meridian Houses of Eido';
  autonomous.civName = 'Oru Current';
  architect.blueprintPrivateStates = [];
  architect.manifestedBlueprintDevices = [];
  autonomous.blueprintPrivateStates = [];
  autonomous.manifestedBlueprintDevices = [];
  architect.civilization = upsertCivilizationEntity(
    architect.civilization,
    recurrenceArchiveEntity(RECURRENCE_MERIDIAN_INDEX_ID),
  );
  autonomous.civilization = upsertCivilizationEntity(
    autonomous.civilization,
    recurrenceArchiveEntity(RECURRENCE_ORU_INDEX_ID),
  );

  state.recurrenceScenario = {
    chronicleId: RECURRENCE_CHRONICLE_ID,
    scenarioId: RECURRENCE_SCENARIO_ID,
    definitionVersion: RECURRENCE_DEFINITION_VERSION,
    runKind,
    architectPlayerId,
    autonomousPlayerId,
    phase: 'playing',
    architectCoreActionCount: 0,
    custodyDueAfterCoreActions: RECURRENCE_CUSTODY_DUE_AFTER_CORE_ACTIONS,
    custodyMethod: null,
    custodyResolvedAtTurnCount: null,
    preparednessObjectiveMet: false,
    preparednessArtifactId: null,
    outcomeId: null,
  };

  promoteRecurrenceOpeningArtifacts(state);
  state.currentPlayerIndex = architectIndex;
  const startedAt = state.startedAt ?? Date.now();
  state.openingTurnOrder = {
    id: `${startedAt}:${architectPlayerId}`,
    startedAt,
    firstPlayerId: architectPlayerId,
    playerIds: state.players.map((player) => player.playerId),
  };
  if (state.initialBoard) {
    state.initialBoard = {
      ...state.initialBoard,
      forgeTier1: [...state.forgeTier1],
      deckTier1: [...state.deckTier1],
      firstPlayerId: architectPlayerId,
    };
  }
  state.actionLog = [{
    playerId: architectPlayerId,
    playerName: architect.playerName,
    summary: 'enters the White Return record first',
    turn: 0,
  }];
}

function recurrenceConditionType(
  method: RecurrenceCustodyMethod,
  perspective: 'meridian' | 'oru',
): CivilizationCondition['type'] {
  if (perspective === 'meridian') {
    if (method === 'publish_complete_index') return 'chronicle:recurrence_open_index';
    if (method === 'seal_operational_grammar') return 'chronicle:recurrence_warning_custody';
    return 'chronicle:recurrence_meridian_reader';
  }
  if (method === 'publish_complete_index') return 'chronicle:recurrence_public_grammar';
  if (method === 'seal_operational_grammar') return 'chronicle:recurrence_command_boundary';
  return 'chronicle:recurrence_oru_reader';
}

function applyRecurrenceCustodyCondition(
  player: PlayerGameState,
  method: RecurrenceCustodyMethod,
  perspective: 'meridian' | 'oru',
  turnCount: number,
): void {
  const entityId = perspective === 'meridian' ? RECURRENCE_MERIDIAN_INDEX_ID : RECURRENCE_ORU_INDEX_ID;
  const conditionType = recurrenceConditionType(method, perspective);
  const eventId = `recurrence-custody:${perspective}:${method}`;
  const condition: CivilizationCondition = {
    id: `${eventId}:condition`,
    type: conditionType,
    coreType: null,
    target: { kind: 'network', id: entityId },
    source: { sourceType: 'chronicle', sourceId: RECURRENCE_CHRONICLE_ID },
    appliedTurnCount: turnCount,
    resolvedTurnCount: null,
    historyEvidence: 'recorded',
  };
  const resolution = resolveCivilizationEvent({
    eventId,
    source: { sourceType: 'chronicle', sourceId: RECURRENCE_CHRONICLE_ID },
    form: 'contextual',
    timing: 'trigger_window',
    pressureTags: ['exposure', 'transformation'],
    snapshot: buildCivilizationResolutionSnapshot(player.civilization),
    trajectories: [{
      id: method,
      label: conditionType,
      requirements: [],
      uncertainty: null,
      successConsequences: [
        { type: 'apply_condition', condition },
        { type: 'record_history', key: 'chronicle.recurrence.v1:custody_method', value: method },
      ],
      failureConsequences: [],
    }],
    selectedTrajectoryId: method,
  });
  player.civilization = applyCivilizationResolution(
    player.civilization,
    resolution,
    turnCount,
    perspective === 'meridian'
      ? 'The Architect altered who could hold and act on the Deep Index.'
      : 'The Oru received a custody relation shaped by the Architect.',
  ).state;
}

function resolveRecurrenceCustody(
  state: GameStateData,
  playerId: string,
  method: RecurrenceCustodyMethod,
): { success: boolean; error?: string; changed?: boolean } {
  const recurrence = state.recurrenceScenario;
  if (!recurrence) return { success: false, error: 'No Chronicle custody decision is pending' };
  if (recurrence.architectPlayerId !== playerId) {
    return { success: false, error: 'Only the Architect may decide custody of the Deep Index' };
  }
  if (recurrence.custodyMethod !== null) {
    return recurrence.custodyMethod === method
      ? { success: true, changed: false }
      : { success: false, error: 'Deep Index custody has already been recorded' };
  }
  if (recurrence.phase !== 'awaiting_custody') {
    return { success: false, error: 'The Deep Index custody window is not open' };
  }

  const architect = state.players.find((player) => player.playerId === recurrence.architectPlayerId);
  const autonomous = state.players.find((player) => player.playerId === recurrence.autonomousPlayerId);
  if (!architect || !autonomous) return { success: false, error: 'Chronicle participants are unavailable' };

  applyRecurrenceCustodyCondition(architect, method, 'meridian', state.turnCount);
  applyRecurrenceCustodyCondition(autonomous, method, 'oru', state.turnCount);
  recurrence.custodyMethod = method;
  recurrence.custodyResolvedAtTurnCount = state.turnCount;
  recurrence.phase = 'custody_resolved';
  return { success: true, changed: true };
}

function recurrenceCustodyIsDue(state: GameStateData): boolean {
  const recurrence = state.recurrenceScenario;
  return !!recurrence && recurrence.custodyMethod === null && recurrence.phase !== 'finished' &&
    recurrence.architectCoreActionCount >= recurrence.custodyDueAfterCoreActions;
}

function updateRecurrenceProgressAfterAction(
  state: GameStateData,
  player: PlayerGameState,
  action: ActionPayload,
): void {
  const recurrence = state.recurrenceScenario;
  if (!recurrence || recurrence.phase === 'finished' || player.playerId !== recurrence.architectPlayerId) return;
  if (CORE_ACTIONS.has(action.type)) recurrence.architectCoreActionCount += 1;
  if (
    !recurrence.preparednessObjectiveMet &&
    (action.type === 'forge_artifact' || action.type === 'forge_reserved_artifact') &&
    action.cardId && player.forgedArtifactIds.includes(action.cardId)
  ) {
    const capabilityIds = ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID[
      action.cardId as keyof typeof ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID
    ] ?? [];
    if (capabilityIds.some((id) => (RECURRENCE_PREPAREDNESS_CAPABILITY_IDS as readonly string[]).includes(id))) {
      recurrence.preparednessObjectiveMet = true;
      recurrence.preparednessArtifactId = action.cardId;
    }
  }
}

function applyRecurrenceClosureHistory(
  state: GameStateData,
  outcomeId: NonNullable<RecurrenceScenarioState['outcomeId']>,
): void {
  const recurrence = state.recurrenceScenario;
  if (!recurrence) return;
  for (const player of state.players) {
    const perspective = player.playerId === recurrence.architectPlayerId ? 'meridian' : 'oru';
    const eventId = `recurrence-closure:${perspective}:${outcomeId}`;
    const resolution = resolveCivilizationEvent({
      eventId,
      source: { sourceType: 'chronicle', sourceId: RECURRENCE_CHRONICLE_ID },
      form: 'automatic',
      timing: 'trigger_window',
      pressureTags: ['exposure', 'transformation'],
      snapshot: buildCivilizationResolutionSnapshot(player.civilization),
      trajectories: [{
        id: outcomeId,
        label: 'White Return historical closure',
        requirements: [], uncertainty: null,
        successConsequences: [{
          type: 'record_history', key: 'chronicle.recurrence.v1:white_return_outcome', value: outcomeId,
        }],
        failureConsequences: [],
      }],
    });
    player.civilization = applyCivilizationResolution(
      player.civilization,
      resolution,
      state.turnCount,
      'The White Return closed with both civilizations separately preserved in the record.',
    ).state;
  }
}

function finalizeRecurrenceScenarioOutcome(state: GameStateData): void {
  const recurrence = state.recurrenceScenario;
  if (!recurrence || recurrence.phase === 'finished' || recurrence.custodyMethod === null) return;
  const result = state.winnerId === recurrence.architectPlayerId ? 'victory' : 'defeat';
  const outcomeId = recurrenceOutcomeId(recurrence.custodyMethod, result);
  applyRecurrenceClosureHistory(state, outcomeId);
  recurrence.outcomeId = outcomeId;
  recurrence.phase = 'finished';
}

const TRIANGULATION_DEME_BEARING_ID = 'ent_deme_inertial_spine';
const TRIANGULATION_MYRIA_BEARING_ID = 'ent_myria_living_forecast';
const TRIANGULATION_VESPER_BEARING_ID = 'ent_vesper_phase_array';
const TRIANGULATION_LATTICE_ID = 'ent_three_bearing_lattice';
const TRIANGULATION_OPENING_PREPAREDNESS_ARTIFACT_IDS = ['t1p03', 't1o06', 't1r08'] as const;

function triangulationNetworkEntity(id: string): CivilizationEntity {
  return {
    id,
    kind: 'network',
    state: 'operational',
    worldId: null,
    sourceId: TRIANGULATION_CHRONICLE_ID,
    establishedTurnCount: 0,
    stateChangedTurnCount: 0,
    conditionIds: [],
    historyEvidence: 'recorded',
  };
}

function promoteTriangulationOpeningArtifacts(state: GameStateData): void {
  TRIANGULATION_OPENING_PREPAREDNESS_ARTIFACT_IDS.forEach((artifactId, targetIndex) => {
    const currentIndex = state.forgeTier1.indexOf(artifactId);
    if (currentIndex >= 0) {
      const displaced = state.forgeTier1[targetIndex];
      state.forgeTier1[targetIndex] = artifactId;
      if (currentIndex !== targetIndex && displaced) state.forgeTier1[currentIndex] = displaced;
      return;
    }
    const archiveIndex = state.deckTier1.indexOf(artifactId);
    if (archiveIndex < 0) return;
    const displaced = state.forgeTier1[targetIndex];
    state.deckTier1.splice(archiveIndex, 1);
    state.forgeTier1[targetIndex] = artifactId;
    if (displaced) state.deckTier1.splice(archiveIndex, 0, displaced);
  });
}

/** Apply the authored, three-seat setup for The Triangulation. */
export function configureTriangulationScenario(
  state: GameStateData,
  architectPlayerId: string,
  myriaPlayerId: string,
  vesperPlayerId: string,
  runKind: ChronicleRunKind,
  priorMemoryLines: readonly string[] = [],
): void {
  const architectIndex = state.players.findIndex((player) => player.playerId === architectPlayerId);
  const architect = state.players[architectIndex];
  const myria = state.players.find((player) => player.playerId === myriaPlayerId);
  const vesper = state.players.find((player) => player.playerId === vesperPlayerId);
  if (!architect || !myria || !vesper) {
    throw new Error('The Triangulation requires Deme, Myria, and Vesper');
  }

  const participants = [
    { player: architect, civName: 'Deme Assemblies', bearingId: TRIANGULATION_DEME_BEARING_ID },
    { player: myria, civName: 'Myriad Groves', bearingId: TRIANGULATION_MYRIA_BEARING_ID },
    { player: vesper, civName: 'Vesper Choir', bearingId: TRIANGULATION_VESPER_BEARING_ID },
  ];
  for (const participant of participants) {
    participant.player.civName = participant.civName;
    participant.player.blueprintPrivateStates = [];
    participant.player.manifestedBlueprintDevices = [];
    participant.player.civilization = upsertCivilizationEntity(
      participant.player.civilization,
      triangulationNetworkEntity(participant.bearingId),
    );
    participant.player.civilization = upsertCivilizationEntity(
      participant.player.civilization,
      triangulationNetworkEntity(TRIANGULATION_LATTICE_ID),
    );
  }

  state.triangulationScenario = {
    chronicleId: TRIANGULATION_CHRONICLE_ID,
    scenarioId: TRIANGULATION_SCENARIO_ID,
    definitionVersion: TRIANGULATION_DEFINITION_VERSION,
    runKind,
    architectPlayerId,
    myriaPlayerId,
    vesperPlayerId,
    phase: 'playing',
    architectCoreActions: 0,
    alignmentDueAfterActions: TRIANGULATION_ALIGNMENT_DUE_AFTER_CORE_ACTIONS,
    coordinationArchitecture: null,
    choiceResolvedAtTurn: null,
    preparednessMet: false,
    preparednessCapabilityId: null,
    preparednessArtifactId: null,
    priorMemoryLines: [...priorMemoryLines].slice(0, 2),
    referenceCivilization: null,
    outcomeId: null,
  };

  promoteTriangulationOpeningArtifacts(state);
  state.currentPlayerIndex = architectIndex;
  const startedAt = state.startedAt ?? Date.now();
  state.openingTurnOrder = {
    id: `${startedAt}:${architectPlayerId}`,
    startedAt,
    firstPlayerId: architectPlayerId,
    playerIds: state.players.map((player) => player.playerId),
  };
  if (state.initialBoard) {
    state.initialBoard = {
      ...state.initialBoard,
      forgeTier1: [...state.forgeTier1],
      deckTier1: [...state.deckTier1],
      firstPlayerId: architectPlayerId,
    };
  }
  state.actionLog = [{
    playerId: architectPlayerId,
    playerName: architect.playerName,
    summary: 'enters the Blind Transit record first',
    turn: 0,
  }];
}

function triangulationPerspective(
  scenario: TriangulationScenarioState,
  playerId: string,
): TriangulationReferenceCivilization {
  if (playerId === scenario.myriaPlayerId) return 'myria';
  if (playerId === scenario.vesperPlayerId) return 'vesper';
  return 'deme';
}

function triangulationBearingId(perspective: TriangulationReferenceCivilization): string {
  if (perspective === 'myria') return TRIANGULATION_MYRIA_BEARING_ID;
  if (perspective === 'vesper') return TRIANGULATION_VESPER_BEARING_ID;
  return TRIANGULATION_DEME_BEARING_ID;
}

function triangulationConditionTypes(
  architecture: TriangulationCoordinationArchitecture,
  perspective: TriangulationReferenceCivilization,
): { participant: CivilizationCondition['type']; lattice: CivilizationCondition['type'] } {
  if (architecture === 'preserve_independent_frames') {
    return {
      participant: `chronicle:triangulation_${perspective}_bearing`,
      lattice: 'chronicle:triangulation_parallax_compact',
    };
  }
  if (architecture === 'establish_unowned_measure') {
    return {
      participant: `chronicle:triangulation_${perspective}_translated`,
      lattice: 'chronicle:triangulation_common_measure',
    };
  }
  return {
    participant: `chronicle:triangulation_${perspective}_constituent`,
    lattice: 'chronicle:triangulation_fourth_vector',
  };
}

function applyTriangulationAlignmentCondition(
  player: PlayerGameState,
  architecture: TriangulationCoordinationArchitecture,
  perspective: TriangulationReferenceCivilization,
  turnCount: number,
): void {
  const types = triangulationConditionTypes(architecture, perspective);
  const eventId = `triangulation-alignment:${perspective}:${architecture}`;
  const conditions: CivilizationCondition[] = [
    {
      id: `${eventId}:participant`,
      type: types.participant,
      coreType: null,
      target: { kind: 'network', id: triangulationBearingId(perspective) },
      source: { sourceType: 'chronicle', sourceId: TRIANGULATION_CHRONICLE_ID },
      appliedTurnCount: turnCount,
      resolvedTurnCount: null,
      historyEvidence: 'recorded',
    },
    {
      id: `${eventId}:lattice`,
      type: types.lattice,
      coreType: null,
      target: { kind: 'network', id: TRIANGULATION_LATTICE_ID },
      source: { sourceType: 'chronicle', sourceId: TRIANGULATION_CHRONICLE_ID },
      appliedTurnCount: turnCount,
      resolvedTurnCount: null,
      historyEvidence: 'recorded',
    },
  ];
  const resolution = resolveCivilizationEvent({
    eventId,
    source: { sourceType: 'chronicle', sourceId: TRIANGULATION_CHRONICLE_ID },
    form: 'contextual',
    timing: 'trigger_window',
    pressureTags: ['coordination', 'transformation', 'exposure'],
    snapshot: buildCivilizationResolutionSnapshot(player.civilization),
    trajectories: [{
      id: architecture,
      label: types.lattice,
      requirements: [],
      uncertainty: null,
      successConsequences: [
        ...conditions.map((condition) => ({ type: 'apply_condition' as const, condition })),
        { type: 'record_history', key: 'chronicle.triangulation.v1:coordination_architecture', value: architecture },
      ],
      failureConsequences: [],
    }],
    selectedTrajectoryId: architecture,
  });
  player.civilization = applyCivilizationResolution(
    player.civilization,
    resolution,
    turnCount,
    'The Three-Bearing Lattice received a coordination architecture without erasing its witnesses.',
  ).state;
}

function resolveTriangulationAlignment(
  state: GameStateData,
  playerId: string,
  architecture: TriangulationCoordinationArchitecture,
): { success: boolean; error?: string; changed?: boolean } {
  const scenario = state.triangulationScenario;
  if (!scenario) return { success: false, error: 'No Alignment is pending' };
  if (scenario.architectPlayerId !== playerId) {
    return { success: false, error: 'Only the Architect may establish the Alignment' };
  }
  if (scenario.coordinationArchitecture !== null) {
    return scenario.coordinationArchitecture === architecture
      ? { success: true, changed: false }
      : { success: false, error: 'The Alignment architecture has already been recorded' };
  }
  if (scenario.phase !== 'awaiting_alignment') {
    return { success: false, error: 'The Alignment window is not open' };
  }

  for (const participant of state.players) {
    applyTriangulationAlignmentCondition(
      participant,
      architecture,
      triangulationPerspective(scenario, participant.playerId),
      state.turnCount,
    );
  }
  scenario.coordinationArchitecture = architecture;
  scenario.choiceResolvedAtTurn = state.turnCount;
  scenario.phase = 'alignment_resolved';
  return { success: true, changed: true };
}

function triangulationAlignmentIsDue(state: GameStateData): boolean {
  const scenario = state.triangulationScenario;
  return !!scenario && scenario.coordinationArchitecture === null && scenario.phase !== 'finished' &&
    scenario.architectCoreActions >= scenario.alignmentDueAfterActions;
}

function updateTriangulationProgressAfterAction(
  state: GameStateData,
  player: PlayerGameState,
  action: ActionPayload,
): void {
  const scenario = state.triangulationScenario;
  if (!scenario || scenario.phase === 'finished' || player.playerId !== scenario.architectPlayerId) return;
  if (CORE_ACTIONS.has(action.type)) scenario.architectCoreActions += 1;
  if (
    !scenario.preparednessMet &&
    (action.type === 'forge_artifact' || action.type === 'forge_reserved_artifact') &&
    action.cardId && player.forgedArtifactIds.includes(action.cardId)
  ) {
    const capabilities = ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID[
      action.cardId as keyof typeof ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID
    ] ?? [];
    const capability = capabilities.find((id) =>
      (TRIANGULATION_PREPAREDNESS_CAPABILITY_IDS as readonly string[]).includes(id),
    );
    if (capability) {
      scenario.preparednessMet = true;
      scenario.preparednessCapabilityId = capability;
      scenario.preparednessArtifactId = action.cardId;
    }
  }
}

function applyTriangulationClosureHistory(
  state: GameStateData,
  outcomeId: NonNullable<TriangulationScenarioState['outcomeId']>,
): void {
  const scenario = state.triangulationScenario;
  if (!scenario) return;
  for (const player of state.players) {
    const perspective = triangulationPerspective(scenario, player.playerId);
    const eventId = `triangulation-closure:${perspective}:${outcomeId}`;
    const resolution = resolveCivilizationEvent({
      eventId,
      source: { sourceType: 'chronicle', sourceId: TRIANGULATION_CHRONICLE_ID },
      form: 'automatic',
      timing: 'trigger_window',
      pressureTags: ['coordination', 'transformation', 'exposure'],
      snapshot: buildCivilizationResolutionSnapshot(player.civilization),
      trajectories: [{
        id: outcomeId,
        label: 'Blind Transit historical closure',
        requirements: [],
        uncertainty: null,
        successConsequences: [{
          type: 'record_history',
          key: 'chronicle.triangulation.v1:blind_transit_outcome',
          value: outcomeId,
        }],
        failureConsequences: [],
      }],
      selectedTrajectoryId: outcomeId,
    });
    player.civilization = applyCivilizationResolution(
      player.civilization,
      resolution,
      state.turnCount,
      'Blind Transit closed with Deme, Myria, and Vesper preserved as historical participants.',
    ).state;
  }
}

function finalizeTriangulationScenarioOutcome(state: GameStateData): void {
  const scenario = state.triangulationScenario;
  if (!scenario || scenario.phase === 'finished' || scenario.coordinationArchitecture === null) return;
  let reference: TriangulationReferenceCivilization;
  if (state.winnerId === scenario.myriaPlayerId) reference = 'myria';
  else if (state.winnerId === scenario.vesperPlayerId) reference = 'vesper';
  else reference = 'deme';
  const outcomeId = triangulationOutcomeId(scenario.coordinationArchitecture, reference);
  applyTriangulationClosureHistory(state, outcomeId);
  scenario.referenceCivilization = reference;
  scenario.outcomeId = outcomeId;
  scenario.phase = 'finished';
}

/** Actions that consume the player's one core action per turn. */
const CORE_ACTIONS = new Set([
  "forge_artifact",
  "forge_reserved_artifact",
  "reserve_artifact",
  "harness_three_affinities",
  "harness_two_affinities",
  "assimilate",
]);

// ─── Action Types ─────────────────────────────────────────────────────────────

/** Canonical action discriminants shared by the API and game clients. */
type ActionType =
  | "harness_three_affinities"
  | "harness_two_affinities"
  | "reserve_artifact"
  | "forge_artifact"
  | "forge_reserved_artifact"
  | "assimilate"
  | "pass"
  | "surrender"
  | "toggle_luminary_affinity"
  | "resolve_summon"
  | "resolve_luminary_activation"
  | "resolve_blueprint_manifestation"
  | "resolve_blueprint_detonation"
  | "plan_action"
  | "execute_plan"
  | "cancel_plan"
  | "tutorial_fast_forward"
  | "set_civ_name"
  | "choose_luminary_order"
  | "resolve_chronicle_choice";

export interface ActionPayload {
  type: ActionType;
  affinities?: Partial<AffinityCounts>;
  /** Used by same-Affinity Harness actions and legacy Luminary Affinity payloads. */
  affinity?: StandardAffinityKey;
  returnAffinities?: Partial<AffinityCounts>;
  cardId?: string;
  tier?: 1 | 2 | 3;
  /** Explicit Project claim path; absent means an ordinary Forge. */
  blueprintAction?: BlueprintClaimAction;
  luminaryId?: string;
  eventId?: string;
  plannedActionData?: ActionPayload;
  civName?: string;
  /** Ordered list of luminaryIds for choose_luminary_order action. */
  orderedIds?: string[];
  /** The Trace guidance method selected by the Architect. */
  traceGuidanceMethod?: TraceGuidanceMethod;
  /** The Recurrence custody method selected by the Architect. */
  recurrenceCustodyMethod?: RecurrenceCustodyMethod;
  /** The Triangulation coordination architecture selected by the Architect. */
  triangulationCoordinationArchitecture?: TriangulationCoordinationArchitecture;
  /** @deprecated Retained for wire compatibility; Void Seal no longer has an effect. */
  voidSealAffinity?: StandardAffinityKey;
}

// ─── Luminary Affinity Helpers ────────────────────────────────────────────────

function randomActiveAffinity(
  eligible: StandardAffinityKey[],
): StandardAffinityKey {
  if (eligible.length === 0) return "flare";
  const index = Math.min(
    eligible.length - 1,
    Math.floor(Math.random() * eligible.length),
  );
  return eligible[index];
}

/**
 * Returns the player's effective bonus counts, including any +1 bonuses from
 * Living Luminary Affinities that have become active (i.e. were claimed on a
 * prior turn). Used in place of player.bonuses wherever permanent Artifact bonuses
 * are normally counted: effectiveCost, canAfford, checkLuminaries.
 */
/**
 * Merge forged-Artifact bonuses with the "Fixed Bond" Living Affinity bonus for
 * every Luminary the player has claimed.
 *
 * Fixed Bond — universal v0.8 rule:
 *   Starting the turn AFTER a Luminary is summoned, the owner gains +1 to the
 *   Luminary's active Affinity in every Artifact Forge cost calculation.
 *   For mono-color Luminaries (Verdant Oracle, Void Warden, Concordance Mandala)
 *   there is exactly one eligible affinity. For dual/triple Luminaries, one
 *   required affinity is chosen uniformly at random when the Luminary arrives.
 *   That choice cannot normally be changed by the owner.
 *   This mechanism is identical for ALL 15 Luminaries — there is no separate
 *   "Fixed Bond" flag.
 */
export function effectiveAffinityBonuses(
  state: GameStateData,
  player: PlayerGameState,
): AffinityCounts {
  const result = { ...player.bonuses };
  for (const la of state.luminaryAffinities ?? []) {
    if (la.ownerId !== player.playerId) continue;
    // Bonus activates starting the turn AFTER summoning.
    if (state.turnCount <= la.summonedAtTurnCount) continue;
    result[la.activeAffinity]++;
  }
  return result;
}

// ─── Effective Cost with Bonuses ──────────────────────────────────────────────

function effectiveCost(
  card: ArtifactCard,
  player: PlayerGameState,
  bonusOverride?: AffinityCounts,
): AffinityCounts {
  const bonuses = bonusOverride ?? player.bonuses;
  const result = zeroAffinities();
  for (const color of STANDARD_AFFINITY_KEYS) {
    result[color] = Math.max(0, card.cost[color] - bonuses[color]);
  }
  return result;
}

function getManifestedDevice(
  player: PlayerGameState,
  blueprintId: BlueprintId,
): ManifestedDevicePublicState | undefined {
  return player.manifestedBlueprintDevices?.find(
    (device) => device.blueprintId === blueprintId,
  );
}

function foundryUsesRemaining(device: ManifestedDevicePublicState): number {
  if (typeof device.foundryUsesRemaining === "number") {
    return Math.max(0, Math.min(2, Math.floor(device.foundryUsesRemaining)));
  }
  if (device.state === "spent" || device.state === "recovering") return 0;
  const legacyUses = Number(device.foundryTier2Ready === true) +
    Number(device.foundryTier3Ready === true);
  return legacyUses > 0 ? legacyUses : 2;
}

function applyFoundryForgeCost(
  card: ArtifactCard,
  baseCost: AffinityCounts,
): AffinityCounts {
  const result = { ...baseCost };
  for (const affinity of STANDARD_AFFINITY_KEYS) {
    if (card.cost[affinity] > 0 && result[affinity] > 0) {
      result[affinity]--;
    }
  }
  return result;
}

function validateFoundryClaim(
  player: PlayerGameState,
  action: ActionPayload,
  card: ArtifactCard,
): string | null {
  if (!action.blueprintAction) return null;
  const foundry = getManifestedDevice(player, "bp_mantle_to_orbit_foundry");
  const privateState = findPrivateBlueprintState(player, "bp_mantle_to_orbit_foundry");
  if (!foundry || !privateState?.manifested) return "Mantle-to-Orbit Foundry is not active";

  if (action.blueprintAction === "foundry_recovery") {
    if (foundry.state !== "recovering") return "Foundry recovery is not active";
    if (!foundryStoredArtifactIds(player).includes(card.id)) {
      return "Artifact is not in the Foundry recovery group";
    }
    if (!player.reservedArtifactIds.includes(card.id)) {
      return "Foundry component is not in Cipher storage";
    }
    return card.tier === 1 ? null : "Only Tier I Foundry components can be recovered";
  }

  if (foundry.state !== "ready") return "Mantle-to-Orbit Foundry is not active";
  if (card.tier !== 2) return "Foundry Forge can claim only face-up Tier II Artifacts";
  const usesRemaining = foundryUsesRemaining(foundry);
  if (action.blueprintAction === "foundry_sustainable" && usesRemaining <= 0) {
    return "Foundry sustainable uses are exhausted; Overdrive is required";
  }
  if (action.blueprintAction === "foundry_overdrive" && usesRemaining > 0) {
    return "Foundry Overdrive is available only after both sustainable uses";
  }
  return null;
}

function blueprintVariant(
  player: PlayerGameState,
  blueprintId: BlueprintId,
): BlueprintPresentationVariant {
  return player.blueprintPresentationVariants?.[blueprintId] ?? "armored";
}

function eligibleBlueprintArtifactIds(player: PlayerGameState): Set<string> {
  const blocked = new Set(player.blueprintBlockedCardIds ?? []);
  return new Set(
    [...(player.forgedArtifactIds ?? [])]
      .filter((artifactId) => !blocked.has(artifactId)),
  );
}

function findPrivateBlueprintState(
  player: PlayerGameState,
  blueprintId: BlueprintId,
): BlueprintPrivateState | undefined {
  return player.blueprintPrivateStates?.find(
    (blueprint) => blueprint.blueprintId === blueprintId,
  );
}

function randomFaceUpTierTwo(state: GameStateData): string | null {
  if (state.forgeTier2.length === 0) return null;
  return state.forgeTier2[Math.floor(Math.random() * state.forgeTier2.length)] ?? null;
}

function retargetUnavailableAntimatterCharges(state: GameStateData): void {
  for (const owner of state.players) {
    const privateState = findPrivateBlueprintState(owner, "bp_antimatter_detonator");
    const device = getManifestedDevice(owner, "bp_antimatter_detonator");
    if (!privateState?.manifested || device?.state !== "armed") continue;
    if ((privateState.safePreManifestActionPlayerIds?.length ?? 0) > 0) {
      privateState.secretTargetCardId = null;
      continue;
    }
    if (
      privateState.secretTargetCardId &&
      state.forgeTier2.includes(privateState.secretTargetCardId)
    ) {
      continue;
    }
    privateState.secretTargetCardId = randomFaceUpTierTwo(state);
  }
}

function settlePreManifestAction(state: GameStateData, playerId: string): void {
  for (const owner of state.players) {
    for (const privateState of owner.blueprintPrivateStates ?? []) {
      if (!privateState.safePreManifestActionPlayerIds?.includes(playerId)) continue;
      privateState.safePreManifestActionPlayerIds =
        privateState.safePreManifestActionPlayerIds.filter((id) => id !== playerId);
    }
  }
  retargetUnavailableAntimatterCharges(state);
}

function checkBlueprintManifestations(state: GameStateData, player: PlayerGameState): void {
  const eligibleArtifacts = eligibleBlueprintArtifactIds(player);
  const privateStates = [...(player.blueprintPrivateStates ?? [])]
    .sort((left, right) => left.slotIndex - right.slotIndex);

  for (const privateState of privateStates) {
    const definition = BLUEPRINT_DEFINITIONS[privateState.blueprintId];
    if (!definition) continue;
    privateState.matchedComponentIds = definition.components
      .map((component) => component.artifactId)
      .filter((artifactId) => eligibleArtifacts.has(artifactId));
    if (privateState.manifested) continue;
    if (privateState.matchedComponentIds.length !== definition.components.length) continue;

    privateState.manifested = true;
    const presentationVariant = blueprintVariant(player, privateState.blueprintId);
    const device: ManifestedDevicePublicState = {
      blueprintId: privateState.blueprintId,
      ownerPlayerId: player.playerId,
      slotIndex: privateState.slotIndex,
      state: definition.initialDeviceState,
      presentationVariant,
      ...(privateState.blueprintId === "bp_mantle_to_orbit_foundry"
        ? { foundryUsesRemaining: 2 }
        : {}),
      ...(privateState.blueprintId === "bp_ascension_registry"
        ? { ascensionDeferrals: 0 }
        : {}),
    };
    if (!player.manifestedBlueprintDevices) player.manifestedBlueprintDevices = [];
    player.manifestedBlueprintDevices.push(device);

    if (privateState.blueprintId === "bp_antimatter_detonator") {
      privateState.safePreManifestActionPlayerIds = state.players
        .filter((candidate) => candidate.plannedAction !== null)
        .map((candidate) => candidate.playerId);
      privateState.secretTargetCardId = privateState.safePreManifestActionPlayerIds.length > 0
        ? null
        : randomFaceUpTierTwo(state);
    } else if (
      privateState.blueprintId === "bp_mantle_to_orbit_foundry" ||
      privateState.blueprintId === "bp_worldshield_covenant"
    ) {
      player.eminence += 1;
    }

    const event: BlueprintManifestationEvent = {
      eventId: `${privateState.blueprintId}-manifest-v${state.version}-${Date.now()}-${privateState.slotIndex}`,
      blueprintId: privateState.blueprintId,
      ownerPlayerId: player.playerId,
      slotIndex: privateState.slotIndex,
      presentationVariant,
      createdAt: Date.now(),
    };
    state.pendingBlueprintManifestationEvents.push(event);
    pushLog(state, {
      playerId: player.playerId,
      playerName: player.playerName,
      summary: `${definition.name} manifested`,
      turn: state.roundNumber,
    });
    recordBlueprintCivilizationEvent(
      state,
      player,
      privateState.blueprintId,
      "manifestation",
      event.eventId,
      `${definition.name} manifested as ${definition.civilization.projectForm}`,
    );
  }
  refreshPlayerCivilization(player, state.turnCount);
}

function hasLegalTierTwoClaimAtTurnStart(
  state: GameStateData,
  player: PlayerGameState,
): boolean {
  const bonuses = effectiveAffinityBonuses(state, player);
  const foundry = getManifestedDevice(player, "bp_mantle_to_orbit_foundry");
  const canUseFoundry = foundry?.state === "ready";

  for (const artifactId of state.forgeTier2) {
    const card = CARD_MAP.get(artifactId);
    if (!card) continue;
    const ordinaryCost = effectiveCost(card, player, bonuses);
    if (canAfford(ordinaryCost, player.affinities)) return true;
    if (
      canUseFoundry &&
      canAfford(applyFoundryForgeCost(card, ordinaryCost), player.affinities)
    ) {
      return true;
    }
  }

  if (
    player.tideArchiveForgeAvailable &&
    state.deckTier2[0]
  ) {
    const topCard = CARD_MAP.get(state.deckTier2[0]);
    if (topCard && canAfford(effectiveCost(topCard, player, bonuses), player.affinities)) {
      return true;
    }
  }

  if (
    ordinaryEncryptedCount(player) < 3 &&
    !isForgottenHourBlockingPlayer(state, player.playerId)
  ) {
    if (state.deckTier2.length > 0) return true;
    if (state.forgeTier2.some(
      (artifactId) => !markerHasBrand(state.artifactMarkers?.[artifactId], "nullified"),
    )) {
      return true;
    }
  }

  return false;
}

function beginAscensionRegistryObservation(
  state: GameStateData,
  observedPlayer: PlayerGameState,
): void {
  const hasLegalClaim = hasLegalTierTwoClaimAtTurnStart(state, observedPlayer);
  for (const owner of state.players) {
    const device = getManifestedDevice(owner, "bp_ascension_registry");
    const privateState = findPrivateBlueprintState(owner, "bp_ascension_registry");
    if (!device || !privateState || owner.playerId === observedPlayer.playerId) continue;
    privateState.ascensionObservedPlayerId = null;
    privateState.ascensionObservedTurnCount = null;
    if (device.state !== "ready" || !hasLegalClaim) continue;
    privateState.ascensionObservedPlayerId = observedPlayer.playerId;
    privateState.ascensionObservedTurnCount = state.turnCount;
  }
}

function clearAscensionRegistryDeferrals(
  state: GameStateData,
  claimantPlayerId: string,
): void {
  for (const owner of state.players) {
    const device = getManifestedDevice(owner, "bp_ascension_registry");
    const privateState = findPrivateBlueprintState(owner, "bp_ascension_registry");
    if (!device || !privateState) continue;
    if ((device.ascensionDeferrals ?? 0) > 0) {
      device.ascensionDeferrals = 0;
      pushLog(state, {
        playerId: owner.playerId,
        playerName: owner.playerName,
        summary: "Ascension Registry cleared its Deferral record after a legal Tier II claim",
        turn: state.roundNumber,
      });
    }
    if (privateState.ascensionObservedPlayerId === claimantPlayerId) {
      privateState.ascensionObservedPlayerId = null;
      privateState.ascensionObservedTurnCount = null;
    }
  }
}

function settleAscensionRegistryObservation(
  state: GameStateData,
  observedPlayer: PlayerGameState,
): void {
  for (const owner of state.players) {
    const device = getManifestedDevice(owner, "bp_ascension_registry");
    const privateState = findPrivateBlueprintState(owner, "bp_ascension_registry");
    if (!device || !privateState || device.state !== "ready") continue;
    const observedThisTurn =
      privateState.ascensionObservedPlayerId === observedPlayer.playerId &&
      privateState.ascensionObservedTurnCount === state.turnCount;
    privateState.ascensionObservedPlayerId = null;
    privateState.ascensionObservedTurnCount = null;
    if (!observedThisTurn || privateState.ascensionLastDeferralRound === state.roundNumber) {
      continue;
    }

    privateState.ascensionLastDeferralRound = state.roundNumber;
    device.ascensionDeferrals = Math.min(2, (device.ascensionDeferrals ?? 0) + 1);
    pushLog(state, {
      playerId: owner.playerId,
      playerName: owner.playerName,
      summary: `Ascension Registry recorded Deferral ${device.ascensionDeferrals}/2`,
      turn: state.roundNumber,
    });
    if (device.ascensionDeferrals < 2) continue;

    owner.eminence += 2;
    if (state.brokenCovenantDeclared) {
      device.ascensionDeferrals = 0;
    } else {
      device.state = "spent";
    }
    recordBlueprintCivilizationEvent(
      state,
      owner,
      "bp_ascension_registry",
      "ascension_judgment",
      `bp-ascension-judgment-v${state.version}-${Date.now()}-${observedPlayer.playerId}`,
      "Ascension Registry completed a two-Deferral public judgment",
      state.brokenCovenantDeclared ? "record_cleared" : "registry_spent",
    );
    refreshPlayerCivilization(owner, state.turnCount);
    pushLog(state, {
      playerId: owner.playerId,
      playerName: owner.playerName,
      summary: state.brokenCovenantDeclared
        ? "Ascension Registry judged two Deferrals: +2 Eminence; record cleared"
        : "Ascension Registry judged two Deferrals: +2 Eminence; Registry spent",
      turn: state.roundNumber,
    });
  }
}

function removeAnnihilatedOwnedTierOneArtifact(
  state: GameStateData,
  player: PlayerGameState,
  artifactId: string,
): void {
  const index = player.forgedArtifactIds.indexOf(artifactId);
  if (index === -1) return;
  const card = CARD_MAP.get(artifactId);
  player.forgedArtifactIds.splice(index, 1);
  if (card) {
    player.bonuses[card.bonusAffinity] = Math.max(0, player.bonuses[card.bonusAffinity] - 1);
  }
  if (player.forgedArtifactBonusSnapshots) delete player.forgedArtifactBonusSnapshots[artifactId];
  if (state.artifactMarkers) delete state.artifactMarkers[artifactId];
  if (!state.annihilatedArtifactIds.includes(artifactId)) {
    state.annihilatedArtifactIds.push(artifactId);
  }
}

type AntimatterClaimResult = "none" | "intercepted" | "detonated";

function snapshotBlueprintArtifact(cardId: string): BlueprintArtifactSnapshot | undefined {
  const card = CARD_MAP.get(cardId);
  if (!card) return undefined;
  const lore = getCardLore(cardId);
  return {
    id: card.id,
    name: lore.name,
    tier: card.tier,
    bonusAffinity: card.bonusAffinity,
    eminence: card.eminence,
    cost: { ...card.cost },
    flavor: lore.flavor,
  };
}

function resolveAntimatterClaim(
  state: GameStateData,
  claimant: PlayerGameState,
  targetCardId: string,
  submittedBeforeManifestation: boolean,
  trigger: "forged" | "encrypted",
): AntimatterClaimResult {
  const candidates = state.players
    .flatMap((owner, ownerIndex) => {
      const privateState = findPrivateBlueprintState(owner, "bp_antimatter_detonator");
      const device = getManifestedDevice(owner, "bp_antimatter_detonator");
      return privateState?.secretTargetCardId === targetCardId && device?.state === "armed"
        ? [{ owner, ownerIndex, privateState, device }]
        : [];
    })
    .sort((left, right) =>
      left.ownerIndex - right.ownerIndex || left.device.slotIndex - right.device.slotIndex,
    );
  const candidate = candidates[0];
  if (!candidate) return "none";
  if (
    submittedBeforeManifestation &&
    candidate.privateState.safePreManifestActionPlayerIds?.includes(claimant.playerId)
  ) {
    return "none";
  }

  const worldshield = getManifestedDevice(claimant, "bp_worldshield_covenant");
  claimant.civilization = normalizeCivilizationState(claimant);
  const worldshieldVigilant = worldshield?.state === "vigilant";
  const hostileClaim = claimant.playerId !== candidate.owner.playerId;
  const collateralCandidates = state.brokenCovenantDeclared && !(hostileClaim && worldshieldVigilant)
    ? shuffle(
        claimant.forgedArtifactIds.filter((artifactId) => CARD_MAP.get(artifactId)?.tier === 1),
      ).slice(0, 2)
    : [];
  const pendingEventId = hostileClaim && worldshieldVigilant
    ? `bp-antimatter-intercept-v${state.version}-${Date.now()}`
    : `bp-antimatter-detonate-v${state.version}-${Date.now()}`;
  const civilizationResolution = resolveAntimatterCivilizationPolicy({
    eventId: pendingEventId,
    civilization: claimant.civilization,
    targetArtifactId: targetCardId,
    collateralArtifactIds: collateralCandidates,
    turnCount: state.turnCount,
    hostileClaim,
    worldshieldVigilant,
    brokenCovenant: state.brokenCovenantDeclared === true,
  });
  claimant.civilization = civilizationResolution.civilization;

  if (civilizationResolution.outcome === "intercepted" && worldshield) {
    candidate.device.state = "spent";
    candidate.privateState.secretTargetCardId = null;
    if (!state.brokenCovenantDeclared) worldshield.state = "spent";
    state.pendingBlueprintDetonationEvents.push({
      eventId: pendingEventId,
      blueprintId: "bp_antimatter_detonator",
      ownerPlayerId: candidate.owner.playerId,
      triggeringPlayerId: claimant.playerId,
      targetCardId,
      trigger,
      hostileEffect: "annihilation",
      targetArtifact: snapshotBlueprintArtifact(targetCardId),
      interceptedByBlueprintId: "bp_worldshield_covenant",
      presentationVariant: candidate.device.presentationVariant,
      createdAt: Date.now(),
    });
    pushLog(state, {
      playerId: claimant.playerId,
      playerName: claimant.playerName,
      summary: "Worldshield Covenant intercepted an Antimatter charge",
      turn: state.roundNumber,
    });
    refreshPlayerCivilization(candidate.owner, state.turnCount);
    if (claimant.playerId !== candidate.owner.playerId) {
      refreshPlayerCivilization(claimant, state.turnCount);
    }
    return "intercepted";
  }

  candidate.device.state = "spent";
  candidate.privateState.secretTargetCardId = null;
  if (!state.annihilatedArtifactIds.includes(targetCardId)) {
    state.annihilatedArtifactIds.push(targetCardId);
  }
  if (state.artifactMarkers) delete state.artifactMarkers[targetCardId];

  const collateralCardIds: string[] = [];
  const collateralArtifacts: BlueprintArtifactSnapshot[] = [];
  for (const artifactId of civilizationResolution.collateralArtifactIds) {
    const snapshot = snapshotBlueprintArtifact(artifactId);
    if (snapshot) collateralArtifacts.push(snapshot);
    removeAnnihilatedOwnedTierOneArtifact(state, claimant, artifactId);
    collateralCardIds.push(artifactId);
  }
  if (collateralCardIds.length > 0) {
    checkBlueprintManifestations(state, claimant);
  }

  const forgeRow = state.forgeTier2;
  refillForgeSlot(state, forgeRow, state.deckTier2, targetCardId);
  candidate.owner.eminence += 2;
  state.pendingBlueprintDetonationEvents.push({
    eventId: pendingEventId,
    blueprintId: "bp_antimatter_detonator",
    ownerPlayerId: candidate.owner.playerId,
    triggeringPlayerId: claimant.playerId,
    targetCardId,
    trigger,
    targetArtifact: snapshotBlueprintArtifact(targetCardId),
    collateralCardIds,
    collateralArtifacts,
    presentationVariant: candidate.device.presentationVariant,
    createdAt: Date.now(),
  });
  pushLog(state, {
    playerId: candidate.owner.playerId,
    playerName: candidate.owner.playerName,
    summary: `Antimatter Detonator Annihilated ${getCardLore(targetCardId).name}: +2 Eminence`,
    turn: state.roundNumber,
  });
  refreshPlayerCivilization(candidate.owner, state.turnCount);
  if (claimant.playerId !== candidate.owner.playerId) {
    refreshPlayerCivilization(claimant, state.turnCount);
  }
  retargetUnavailableAntimatterCharges(state);
  return "detonated";
}

function canAfford(
  cost: AffinityCounts,
  playerAffinities: AffinityCounts,
): boolean {
  let singularityNeeded = 0;
  for (const color of STANDARD_AFFINITY_KEYS) {
    const deficit = Math.max(0, cost[color] - playerAffinities[color]);
    singularityNeeded += deficit;
  }
  return singularityNeeded <= playerAffinities.singularity;
}

// ─── Apply Forge Cost ─────────────────────────────────────────────────────────

function payForgeCost(
  card: ArtifactCard,
  player: PlayerGameState,
  bank: AffinityCounts,
  bonusOverride?: AffinityCounts,
  costOverride?: AffinityCounts,
): void {
  const needed = costOverride ?? effectiveCost(card, player, bonusOverride);
  let singularityUsed = 0;
  for (const color of STANDARD_AFFINITY_KEYS) {
    const fromAffinities = Math.min(needed[color], player.affinities[color]);
    player.affinities[color] -= fromAffinities;
    bank[color] += fromAffinities;
    const deficit = needed[color] - fromAffinities;
    singularityUsed += deficit;
  }
  player.affinities.singularity -= singularityUsed;
  bank.singularity += singularityUsed;
}

// ─── Luminary Check ───────────────────────────────────────────────────────────

/**
 * ── Simultaneous-Claim Sequencing Contract ──────────────────────────────────
 *
 * When a single game action qualifies a player for multiple Luminaries at once,
 * the following canonical order is enforced to eliminate all ambiguities around
 * mid-batch mutations, win attribution, and Oblivion ordering:
 *
 *  (1) COLLECT   — Scan activeLuminaries and gather all newly qualifying IDs
 *                  into `toSummon[]`.  No state mutations occur in this phase.
 *
 *  (2) COMMIT    — For each ID in `toSummon` (declaration order):
 *                    • Register the claim (player.luminaries, luminaryAffinities).
 *                    • Award Eminence and push the summon event to
 *                      pendingSummonEvents.  Oblivion Luminaries are queued for
 *                      the post-effects pass instead of applying immediately.
 *                    • Track Eminence awards so win attribution can be evaluated
 *                      after Oblivion has moved the shared victory requirement.
 *
 *  (3) EFFECTS   — Call applySummonEffect for each Luminary in
 *                  `toSummon` order.  Every effect fires against the same
 *                  fully-committed Eminence state, but effects that mutate the
 *                  Forge (burns, scries) see the Forge as left by any preceding
 *                  effect in the same batch — this is intentional and canonical.
 *
 *  (4) OBLIVION  — Raise the shared victory requirement in a dedicated
 *                  post-effects pass, then attribute wins against the final line.
 *
 *  (5) CASCADE   — Re-enter checkLuminaries once at cascadeDepth=1 to catch any
 *                  new claims unlocked by summon effects (e.g. an Affinity bonus
 *                  that pushes a player over a threshold).  A depth-1 pass does
 *                  NOT recurse further.  If a depth-1 pass detects new eligible
 *                  claims, a warning is logged (deeper cascades are unsupported).
 *
 * pendingSummonEvents is ordered to match the (2)+(5) claim sequence so the
 * frontend cutscene always plays in the same order as the server-side effects.
 * ────────────────────────────────────────────────────────────────────────────
 */
/**
 * applyLuminaryBatch — phases 2-5 of the simultaneous-claim sequencing contract.
 *
 * Runs the COMMIT → EFFECTS → OBLIVION → CASCADE phases in the exact order
 * specified by `orderedIds`.  Called from:
 *   • checkLuminaries (single-candidate fast path, and cascade depth-1 auto-apply)
 *   • choose_luminary_order action handler (player-chosen order)
 *
 * cascadeDepth=0 triggers a depth-1 re-entry; cascadeDepth=1 stops recursion.
 */
function applyLuminaryBatch(
  state: GameStateData,
  player: PlayerGameState,
  orderedIds: string[],
  cascadeDepth: number,
): void {
  // Ensure the events array exists before the COMMIT phase appends to it.
  if (!Array.isArray(state.pendingSummonEvents)) {
    state.pendingSummonEvents = [];
  }

  // ── (2) COMMIT ─────────────────────────────────────────────────────────────
  // All Eminence grants and win-trigger attribution happen here, atomically,
  // before any applySummonEffect call mutates the Forge or Affinity Well.
  const oblivionLumIds: string[] = [];
  const eminenceAwards: Array<{ lumId: string; before: number; after: number }> = [];
  for (const lumId of orderedIds) {
    const lum = LUMINARY_MAP.get(lumId)!;

    // Register the claim.
    player.luminaries.push(lumId);
    player.luminaryAllianceCounts = incrementUsageCount(player.luminaryAllianceCounts, lumId);
    const eligible = STANDARD_AFFINITY_KEYS.filter((c) => lum.requirements[c] > 0);
    const activeAffinity = randomActiveAffinity(eligible);
    // Remove any stale entry for the same lum+player before inserting the fresh
    // one.  Duplicate entries can arise if a dev-rewind clears player.luminaries
    // without clearing state.luminaryAffinities; the stale entry would have an
    // old summonedAtTurnCount that satisfies the burn condition immediately.
    state.luminaryAffinities = state.luminaryAffinities.filter(
      (x) => !(x.luminaryId === lumId && x.ownerId === player.playerId),
    );
    state.luminaryAffinities.push({
      luminaryId: lumId,
      ownerId: player.playerId,
      activeAffinity,
      eligibleAffinities: eligible,
      summonedAtTurnCount: state.turnCount,
    });

    if (lum.oblivion) {
      oblivionLumIds.push(lumId);
    }

    const eminenceBeforeSummon = player.eminence;
    if (lum.eminence > 0) {
      player.eminence += lum.eminence;
      eminenceAwards.push({
        lumId,
        before: eminenceBeforeSummon,
        after: player.eminence,
      });
      pushLog(state, {
        playerId: player.playerId,
        playerName: player.playerName,
        summary: `Drew the favor of ${lum.name} (+${lum.eminence} Eminence)`,
        turn: state.roundNumber,
      });
    } else {
      pushLog(state, {
        playerId: player.playerId,
        playerName: player.playerName,
        summary: `Drew the attention of ${lum.name}`,
        turn: state.roundNumber,
      });
    }

    // Push summon event in orderedIds order so the frontend cutscene sequence
    // matches the server-side effect sequence.  eventId uses the current
    // version (before the post-action increment) to produce a stable unique
    // key.  The idempotency guard prevents double-push if somehow called twice.
    const eventId = `${lumId}-v${state.version}`;
    if (!state.pendingSummonEvents.some((e) => e.eventId === eventId)) {
      state.pendingSummonEvents.push({
        eventId,
        luminaryId: lumId,
        claimedByPlayerId: player.playerId,
        arrivalSound: player.luminaryArrivalSound ?? "standard",
        createdAt: Date.now(),
      });
    }
  }

  // ── (3) EFFECTS ────────────────────────────────────────────────────────────
  // Run applySummonEffect for each Luminary in orderedIds order.
  // Effects see the fully-committed Eminence totals from phase (2).
  // Because the player chose this order, each successive effect already benefits
  // from all earlier Luminaries' passive bonuses being active.
  for (const lumId of orderedIds) {
    applySummonEffect(state, player, lumId, state.turnCount);
  }

  // ── (4) OBLIVION POST-PASS ─────────────────────────────────────────────────
  // Apply Oblivion after all other effects so the win line moves only after the
  // full summon/effect sequence has resolved.
  for (const lumId of oblivionLumIds) {
    const lum = LUMINARY_MAP.get(lumId)!;
    const victoryRequirementBefore = getVictoryRequirement(state);
    state.victoryRequirement = victoryRequirementBefore + lum.oblivion!;
    const victoryRequirementAfter = getVictoryRequirement(state);
    if (lumId === "lum_void") {
      pushActivationEvent(state, lumId, "summon", player.playerId, undefined, {
        victoryRequirementBefore,
        victoryRequirementAfter,
        victoryRequirementChange: lum.oblivion!,
      });
    }
    pushLog(state, {
      playerId: player.playerId,
      playerName: player.playerName,
      summary: `${lum.name} invoked Oblivion (+${lum.oblivion} victory requirement; ${getVictoryRequirement(state)} to win)`,
      turn: state.roundNumber,
    });
  }

  const victoryRequirement = getVictoryRequirement(state);
  if (state.phase === "playing" && !state.winTriggerLuminaryId) {
    const winningAward = eminenceAwards.find(
      (award) => award.before < victoryRequirement && award.after >= victoryRequirement,
    );
    if (winningAward) {
      state.winTriggerLuminaryId = winningAward.lumId;
    }
  }

  // ── (5) CASCADE RE-ENTRY ───────────────────────────────────────────────────
  // One re-entry pass at depth 1 to catch claims unlocked by summon effects.
  // Depth-1 passes do not recurse further to prevent infinite loops.
  if (cascadeDepth === 0) {
    checkLuminaries(state, player, 1);
  }
  // Depth-1: no further cascade.  If multiple new candidates exist, they are
  // auto-applied in scan order (no interactive choice at depth-1 — this path
  // is rare and the extra UX step is not worth the complexity).
}

function checkLuminaries(
  state: GameStateData,
  player: PlayerGameState,
  cascadeDepth = 0,
): void {
  // ── (1) COLLECT ────────────────────────────────────────────────────────────
  // Compute bonuses once for the entire collection scan.
  const liveBonuses = effectiveAffinityBonuses(state, player);
  const toSummon: string[] = [];
  for (const lumId of state.activeLuminaries) {
    if (player.luminaries.includes(lumId)) continue;
    if (isLuminaryAlreadyClaimed(state, lumId)) continue;
    const lum = LUMINARY_MAP.get(lumId);
    if (!lum) continue;
    const qualifies = STANDARD_AFFINITY_KEYS.every(
      (c) => liveBonuses[c] >= lum.requirements[c],
    );
    if (qualifies) toSummon.push(lumId);
  }

  if (toSummon.length === 0) return;

  // ── INTERACTIVE GATE (depth-0 only) ────────────────────────────────────────
  // When multiple Luminaries qualify simultaneously and it's the first pass,
  // pause and ask the player to choose the claim order.  The order matters
  // because each Luminary's passive effect activates immediately after claim,
  // so the second claim benefits from the first's bonus.
  //
  // The choose_luminary_order action handler clears pendingLuminaryChoice and
  // calls applyLuminaryBatch in the player-specified order.
  if (toSummon.length > 1 && cascadeDepth === 0) {
    state.pendingLuminaryChoice = {
      playerId: player.playerId,
      candidates: toSummon,
      createdAt: Date.now(),
    };
    return;
  }

  // Single candidate, or depth-1 cascade auto-apply: proceed directly.
  applyLuminaryBatch(state, player, toSummon, cascadeDepth);
}

function isLuminaryAlreadyClaimed(state: GameStateData, luminaryId: string): boolean {
  return state.players.some((p) => p.luminaries.includes(luminaryId));
}

// ─── Refill Forge Slot ────────────────────────────────────────────────────────

/**
 * Remove an Artifact from the Forge and refill its slot from the deck.
 * Handles marker cleanup on the removed Artifact. Avatar Seeds belong to mold
 * positions, so replacement Artifacts remain unseeded until the end of a turn.
 * Returns the ID of the card that now occupies the slot, or null if the slot
 * was collapsed (deck empty).
 */
function refillForgeSlot(
  state: GameStateData,
  forgeRow: string[],
  deck: string[],
  removedId: string,
): string | null {
  const idx = forgeRow.indexOf(removedId);
  if (idx === -1) return null;

  // Remove any marker on the leaving card.
  if (state.artifactMarkers) delete state.artifactMarkers[removedId];

  if (deck.length > 0) {
    const newId = deck.shift()!;
    forgeRow[idx] = newId;
    retargetUnavailableAntimatterCharges(state);
    return newId;
  } else {
    forgeRow.splice(idx, 1);
    retargetUnavailableAntimatterCharges(state);
    return null;
  }
}

// ─── v0.8 Burn / Scry Helpers ─────────────────────────────────────────────────

/** Sum of all Affinity costs on an Artifact (used for lowest-cost comparisons). */
function markerSuppressesForgeValue(
  marker?: ArtifactMarker | null,
  ignoreNullified = false,
): boolean {
  return getArtifactBrands(marker).some(
    (brand) => brand.type === "forgotten" ||
      brand.type === "condemned" ||
      (brand.type === "nullified" && !ignoreNullified),
  );
}

function isForgottenHourBlockingPlayer(state: GameStateData, playerId: string): boolean {
  const activeOwnerIds = new Set<string>();
  for (const [ownerId, cycle] of Object.entries(state.forgottenHourCycle ?? {})) {
    if (cycle?.cooldownOwnerTurnsRemaining === null) activeOwnerIds.add(ownerId);
  }
  for (const marker of Object.values(state.artifactMarkers ?? {})) {
    for (const brand of getArtifactBrands(marker)) {
      if (brand.type === "forgotten") activeOwnerIds.add(brand.ownerId);
    }
  }
  return activeOwnerIds.size > 0 && !activeOwnerIds.has(playerId);
}

function resolveNullifiedForge(
  state: GameStateData,
  playerId: string,
  cardId: string,
  marker?: ArtifactMarker | null,
): boolean {
  const nullifiedOwners = getArtifactBrands(marker)
    .filter((brand) => brand.type === "nullified")
    .map((brand) => brand.ownerId);
  if (nullifiedOwners.length === 0 || state.nullifiedFirstForge) return false;

  const exempt = nullifiedOwners.includes(playerId);
  state.nullifiedFirstForge = { cardId, playerId, exempt };
  return exempt;
}

function markBlueprintBlockedByBrand(
  player: PlayerGameState,
  cardId: string,
  marker?: ArtifactMarker | null,
  nullifiedExempt = false,
): void {
  const blocked = markerHasBrand(marker, "forgotten") ||
    (markerHasBrand(marker, "nullified") && !nullifiedExempt);
  if (!blocked) return;
  if (!Array.isArray(player.blueprintBlockedCardIds)) player.blueprintBlockedCardIds = [];
  if (!player.blueprintBlockedCardIds.includes(cardId)) {
    player.blueprintBlockedCardIds.push(cardId);
  }
}

/**
 * Increment the Catalyst Bloom burn-effect counter if lum_bloom has been claimed.
 * A single call counts as ONE burn effect, regardless of how many individual
 * cards were burned in that effect.
 */
function incrementBloomCount(state: GameStateData): void {
  const bloomClaimed = state.players.some((p) => p.luminaries.includes("lum_bloom"));
  if (bloomClaimed) {
    state.catalystBloomBurnCount = (state.catalystBloomBurnCount ?? 0) + 1;
  }
}

function isProtectedPlannedClaimLegal(
  state: GameStateData,
  player: PlayerGameState,
  cardId: string,
): boolean {
  const action = player.plannedAction;
  if (!action || action.cardId !== cardId) return false;
  const card = CARD_MAP.get(cardId);
  if (!card || !getForgeRowForTier(state, card.tier).includes(cardId)) return false;

  if (action.type === "forge_artifact") {
    const bonuses = effectiveAffinityBonuses(state, player);
    return canAfford(effectiveCost(card, player, bonuses), player.affinities);
  }
  if (action.type !== "reserve_artifact") return false;
  if (isForgottenHourBlockingPlayer(state, player.playerId)) return false;
  if (ordinaryEncryptedCount(player) >= 3) return false;
  if (markerHasBrand(state.artifactMarkers?.[cardId], "nullified")) return false;

  const held = AFFINITY_KEYS.reduce(
    (total, affinity) => total + (player.affinities[affinity] ?? 0),
    0,
  );
  if (state.affinityWell.singularity <= 0 || held < 10) return true;
  const returns = action.returnAffinities ?? {};
  const returned = AFFINITY_KEYS.reduce(
    (total, affinity) => total + Math.max(0, returns[affinity] ?? 0),
    0,
  );
  return returned >= 1 && AFFINITY_KEYS.every(
    (affinity) => (returns[affinity] ?? 0) <= (player.affinities[affinity] ?? 0),
  );
}

function interceptHostilePlannedClaim(
  state: GameStateData,
  cardId: string,
  sourcePlayerId: string | undefined,
  hostileEffect: NonNullable<BlueprintDetonationEvent["hostileEffect"]>,
): boolean {
  const protectedPlayer = state.players.find((candidate) => {
    if (candidate.playerId === sourcePlayerId) return false;
    const worldshield = getManifestedDevice(candidate, "bp_worldshield_covenant");
    return worldshield?.state === "vigilant" &&
      isProtectedPlannedClaimLegal(state, candidate, cardId);
  });
  if (!protectedPlayer) return false;

  const worldshield = getManifestedDevice(protectedPlayer, "bp_worldshield_covenant");
  if (!worldshield) return false;
  const eventId = `bp-worldshield-${hostileEffect}-v${state.version}-${Date.now()}-${cardId}`;
  if (!state.brokenCovenantDeclared) worldshield.state = "spent";
  recordBlueprintCivilizationEvent(
    state,
    protectedPlayer,
    "bp_worldshield_covenant",
    "worldshield_interception",
    eventId,
    `Worldshield Covenant preserved a legal claim from hostile ${hostileEffect.replace("_", " ")}`,
    cardId,
  );
  refreshPlayerCivilization(protectedPlayer, state.turnCount);
  state.pendingBlueprintDetonationEvents.push({
    eventId,
    blueprintId: "bp_worldshield_covenant",
    ownerPlayerId: protectedPlayer.playerId,
    triggeringPlayerId: sourcePlayerId ?? "system",
    targetCardId: cardId,
    hostileEffect,
    targetArtifact: snapshotBlueprintArtifact(cardId),
    interceptedByBlueprintId: "bp_worldshield_covenant",
    presentationVariant: "armored",
    createdAt: Date.now(),
  });
  pushLog(state, {
    playerId: protectedPlayer.playerId,
    playerName: protectedPlayer.playerName,
    summary: `Worldshield Covenant prevented a hostile ${hostileEffect.replace("_", " ")} against ${getCardLore(cardId).name}`,
    turn: state.roundNumber,
  });
  return true;
}

/**
 * Shared "burn" primitive — the single authoritative path for all Luminary burn effects.
 *
 * Emits one `BurnEvent`, routes the card to the Burn Pile or corresponding
 * Archive according to Eternal Recurrence, increments the Catalyst Bloom
 * accumulator, optionally pushes a per-card log, then refills the Forge slot.
 *
 * Pass `suppressLog = true` when the caller will push its own aggregate log
 * entry instead of per-card entries.
 *
 * Callers are responsible for pushing their own effect-level summary log and
 * any activation events AFTER calling burnCard (or the burn loop helpers).
 */
function burnCard(
  state: GameStateData,
  cardId: string,
  tier: 1 | 2 | 3,
  sourceLuminaryId: string,
  suppressLog = false,
  opts?: { triggeredByPlayerId?: string },
): boolean {
  if (!Array.isArray(state.burnPile)) state.burnPile = [];
  if (!Array.isArray(state.burnEvents)) state.burnEvents = [];
  const burntLore = getCardLore(cardId);
  const lum = LUMINARIES.find((l) => l.id === sourceLuminaryId);
  const owner = state.players.find((p) => p.luminaries.includes(sourceLuminaryId));
  if (interceptHostilePlannedClaim(state, cardId, owner?.playerId, "burn")) {
    return false;
  }

  const recurrenceActive = state.players.some((p) => p.luminaries.includes("lum_astral"));
  const destination: BurnEvent["destination"] = recurrenceActive ? "archive" : "burn_pile";
  if (recurrenceActive) {
    const archive = getDeckForTier(state, tier);
    if (!archive.includes(cardId)) archive.push(cardId);
  } else if (!state.burnPile.includes(cardId)) {
    state.burnPile.push(cardId);
  }

  state.burnEvents.push({
    eventId: `burn-${state.turnCount}-${state.burnEvents.length}-${cardId}`,
    cardId,
    artifactName: burntLore.name,
    tier,
    sourceType: 'luminary',
    sourceLuminaryId,
    sourceName: lum?.name,
    ownerPlayerId: owner?.playerId,
    triggeredByPlayerId: opts?.triggeredByPlayerId,
    destination,
    turn: state.turnCount,
  });

  // Increment Catalyst Bloom accumulator — each individual card burn counts.
  incrementBloomCount(state);

  if (!suppressLog) {
    // Push a per-card burn log entry attributed to the Luminary owner.
    const destinationText = recurrenceActive
      ? `returned to the bottom of the Tier ${tier} Archive`
      : "moved to the Burn Pile";
    const summary = lum
      ? `${lum.name} Burned ${burntLore.name}. ${burntLore.name} ${destinationText}.`
      : `${burntLore.name} was Burned and ${destinationText}.`;
    pushLog(state, {
      playerId: owner?.playerId ?? "",
      playerName: owner?.playerName ?? "",
      summary,
      turn: state.roundNumber,
    });
  }

  refillForgeSlot(state, getForgeRowForTier(state, tier), getDeckForTier(state, tier), cardId);
  return true;
}

// ─── v0.8 On-Summon Effect Helpers ────────────────────────────────────────────

function applySummonEffect_forgottenHour(
  state: GameStateData,
  player: PlayerGameState,
  appliedAtTurnCount: number,
  options: { isRepeat?: boolean } = {},
): string[] {
  if (!state.forgottenHourCycle) state.forgottenHourCycle = {};
  state.forgottenHourCycle[player.playerId] = {
    lastAppliedTurnCount: appliedAtTurnCount,
    cooldownOwnerTurnsRemaining: null,
  };

  const markedIds: string[] = [];
  for (const tier of [1, 2, 3] as const) {
    for (const id of getForgeRowForTier(state, tier)) {
      if (addArtifactBrand(state, id, {
        type: "forgotten",
        ownerId: player.playerId,
        summonedAtTurnCount: appliedAtTurnCount,
      })) {
        markedIds.push(id);
      }
    }
  }
  const prefix = options.isRepeat
    ? "??? — The Forgotten Hour returns"
    : "??? — The Forgotten Hour";
  if (!options.isRepeat) {
    state.victoryRequirement = getVictoryRequirement(state) + 1;
  }
  if (markedIds.length > 0 || !options.isRepeat) {
    const victoryText = !options.isRepeat
      ? `; victory requirement +1 (${getVictoryRequirement(state)} to win)`
      : "";
    pushLog(state, {
      playerId: player.playerId, playerName: player.playerName,
      summary: `${prefix}: ${markedIds.length} Artifact(s) marked Forgotten (0 Eminence and no blueprint use if forged while marked)${victoryText}`,
      turn: state.roundNumber,
    });
  }
  return markedIds;
}

function applySummonEffect_avatarSeeds(
  state: GameStateData,
  player: PlayerGameState,
  summonedAtTurnCount: number,
): string[] {
  const moldSlots: string[] = [];
  for (const tier of [1, 2, 3] as const) {
    const forgeRow = getForgeRowForTier(state, tier);
    if (forgeRow.length === 0) continue;
    const slotIndex = Math.floor(Math.random() * forgeRow.length);
    moldSlots.push(`${tier}-${slotIndex}`);
  }
  state.avatarSeedState = {
    ownerId: player.playerId,
    summonedAtTurnCount,
    moldSlots,
  };
  pushLog(state, {
    playerId: player.playerId, playerName: player.playerName,
    summary: `Seed Beyond Seasons — Avatar Seeds: ${moldSlots.length} permanent Forge mold(s) marked`,
    turn: state.roundNumber,
  });
  return moldSlots;
}

function applySummonEffect_balanceDue(
  state: GameStateData,
  owner: PlayerGameState,
): LuminaryAffinityReturn[] {
  const startingSupply = affinityWellForPlayerCount(state.players.length);
  const returns: LuminaryAffinityReturn[] = [];

  for (const player of state.players) {
    const playerReturns: LuminaryAffinityReturn[] = [];
    for (const affinity of AFFINITY_KEYS) {
      const threshold = Math.ceil(startingSupply[affinity] / 2);
      if ((player.affinities[affinity] ?? 0) < threshold) continue;

      player.affinities[affinity] -= 2;
      state.affinityWell[affinity] += 2;
      const result = { playerId: player.playerId, affinityType: affinity, affinityAmount: 2 };
      returns.push(result);
      playerReturns.push(result);
    }

    if (playerReturns.length > 0) {
      const returned = playerReturns
        .map(({ affinityType, affinityAmount }) => `${affinityAmount} ${affinityType}`)
        .join(", ");
      pushLog(state, {
        playerId: player.playerId,
        playerName: player.playerName,
        summary: `The Pale Merchant — Balance Due: returned ${returned} Affinity to the Well`,
        turn: state.roundNumber,
      });
    }
  }

  if (returns.length === 0) {
    pushLog(state, {
      playerId: owner.playerId,
      playerName: owner.playerName,
      summary: "The Pale Merchant — Balance Due: no player held half of an Affinity's starting supply",
      turn: state.roundNumber,
    });
  }
  return returns;
}

function applySummonEffect_cinderMandate(
  state: GameStateData,
  player: PlayerGameState,
  summonedAtTurnCount: number,
): string[] {
  const condemnedIds: string[] = [];
  for (const tier of [1, 2, 3] as const) {
    for (const id of getForgeRowForTier(state, tier)) {
      const card = CARD_MAP.get(id);
      if (!card) continue;
      // A card survives Cinder Mandate if its forge cost includes 3+ of at least one of:
      //   Flare (flare), Abyss (abyss), or Radiance (radiance).
      // Otherwise, it is marked Condemned.
      const hasFlare = (card.cost.flare ?? 0) >= 3;
      const hasAbyss = (card.cost.abyss ?? 0) >= 3;
      const hasRadiance = (card.cost.radiance ?? 0) >= 3;
      if (!hasFlare && !hasAbyss && !hasRadiance) {
        if (addArtifactBrand(state, id, {
          type: "condemned",
          ownerId: player.playerId,
          summonedAtTurnCount,
        })) {
          condemnedIds.push(id);
        }
      }
    }
  }
  if (condemnedIds.length > 0) {
    pushLog(state, {
      playerId: player.playerId, playerName: player.playerName,
      summary: `Ember Sovereign — Cinder Mandate: ${condemnedIds.length} Artifact(s) marked Condemned (burns at end of next turn)`,
      turn: state.roundNumber,
    });
  }
  return condemnedIds;
}

function applySummonEffect_blackDomain(
  state: GameStateData,
  player: PlayerGameState,
  summonedAtTurnCount: number,
): string[] {
  const nullifiedIds: string[] = [];
  // Only Tier III per spec.
  for (const id of state.forgeTier3) {
    const card = CARD_MAP.get(id);
    if (!card) continue;
    // Nullified if it lacks any one of Null Sovereign's three domains.
    if (
      (card.cost.continuum ?? 0) === 0 ||
      (card.cost.abyss ?? 0) === 0 ||
      (card.cost.radiance ?? 0) === 0
    ) {
      if (interceptHostilePlannedClaim(state, id, player.playerId, "nullification")) {
        continue;
      }
      if (addArtifactBrand(state, id, {
        type: "nullified",
        ownerId: player.playerId,
        summonedAtTurnCount,
      })) {
        nullifiedIds.push(id);
      }
    }
  }
  if (nullifiedIds.length > 0) {
    pushLog(state, {
      playerId: player.playerId, playerName: player.playerName,
      summary: `Null Sovereign — Black Domain: ${nullifiedIds.length} Tier III Artifact(s) marked Nullified`,
      turn: state.roundNumber,
    });
  }
  return nullifiedIds;
}

/**
 * Dispatch the on-summon effect for the given Luminary (v0.8).
 * Called from checkLuminaries immediately after the eminence award.
 */
/** Push a Luminary activation event so all clients can play the ~4s cinematic. */
function pushActivationEvent(
  state: GameStateData,
  luminaryId: string,
  effectType: PendingLuminaryActivationEvent["effectType"],
  triggeringPlayerId: string,
  targetCardIds?: string[],
  eventDetails?: Pick<
    PendingLuminaryActivationEvent,
    | "affinityType"
    | "affinityAmount"
    | "affinityReturns"
    | "targetSlotIds"
    | "victoryRequirementBefore"
    | "victoryRequirementAfter"
    | "victoryRequirementChange"
  >,
): void {
  if (!Array.isArray(state.pendingLuminaryActivationEvents)) {
    state.pendingLuminaryActivationEvents = [];
  }
  state.pendingLuminaryActivationEvents.push({
    eventId: `${luminaryId}-${effectType}-v${state.version}-${Date.now()}-${state.pendingLuminaryActivationEvents.length}`,
    luminaryId,
    effectType,
    triggeringPlayerId,
    createdAt: Date.now(),
    ...(targetCardIds && targetCardIds.length > 0 ? { targetCardIds } : {}),
    ...eventDetails,
  });
}

function applyAvatarSeedImbuement(
  state: GameStateData,
  card: ArtifactCard,
  marker: ArtifactMarker | null | undefined,
  forgingPlayerId: string,
  targetSlotId?: string,
): PlayerGameState | null {
  const seedBrand = getArtifactBrands(marker).find((brand) => brand.type === "avatar_seed");
  if (!seedBrand || seedBrand.ownerId === forgingPlayerId) return null;

  const alliedPlayer = state.players.find((candidate) => candidate.playerId === seedBrand.ownerId);
  if (!alliedPlayer) return null;

  alliedPlayer.bonuses[card.bonusAffinity] =
    (alliedPlayer.bonuses[card.bonusAffinity] ?? 0) + 1;
  pushLog(state, {
    playerId: alliedPlayer.playerId,
    playerName: alliedPlayer.playerName,
    summary: `Seed Beyond Seasons — Avatar Imbuement: ${AFFINITY_LABEL[card.bonusAffinity]} permanent Affinity gained from a Seeded Artifact`,
    turn: state.roundNumber,
  });
  pushActivationEvent(
    state,
    "lum_seed",
    "action",
    alliedPlayer.playerId,
    [card.id],
    {
      affinityType: card.bonusAffinity,
      affinityAmount: 1,
      ...(targetSlotId ? { targetSlotIds: [targetSlotId] } : {}),
    },
  );
  return alliedPlayer;
}

function applySummonEffect(
  state: GameStateData,
  player: PlayerGameState,
  lumId: string,
  summonedAtTurnCount: number,
): void {
  switch (lumId) {
    case "lum_moth": {
      // Evaluate only the Tier III row present on arrival. Replacement draws
      // are outside this snapshot and must not be burned recursively.
      const targets = [...state.forgeTier3].filter((cardId) => {
        const card = CARD_MAP.get(cardId);
        return card != null && (card.cost.flare ?? 0) < 5;
      });
      const burnedTargets: string[] = [];
      for (const cardId of targets) {
        if (state.forgeTier3.includes(cardId)) {
          if (burnCard(state, cardId, 3, "lum_moth", true)) {
            burnedTargets.push(cardId);
          }
        }
      }
      if (burnedTargets.length > 0) {
        pushLog(state, {
          playerId: player.playerId, playerName: player.playerName,
          summary: `Red Moth — Rupture of the Still: burned ${burnedTargets.length} Tier III Artifact${burnedTargets.length === 1 ? "" : "s"} costing 4 or less Flare`,
          turn: state.roundNumber,
        });
      }
      pushActivationEvent(state, lumId, "summon", player.playerId, burnedTargets);
      break;
    }
    case "lum_tide": {
      // The Observer Effect grants private, persistent Archive-top visibility
      // and one normal-cost Forge directly from an Archive. No arrival choice.
      player.tideArchiveForgeAvailable = true;
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Tide Architect — The Observer Effect: Archive tops revealed; one Archive Forge available`,
        turn: state.roundNumber,
      });
      pushActivationEvent(state, lumId, "summon", player.playerId);
      break;
    }
    case "lum_verdant": {
      // Early Bloom is automatic and must never interrupt arrival resolution
      // with a hand-limit choice. If the owner cannot hold another token, the
      // presentation still fires with an authoritative zero-gain payload.
      const heldAffinityCount = AFFINITY_KEYS.reduce(
        (total, affinity) => total + (player.affinities[affinity] ?? 0),
        0,
      );
      const affinityAmount = state.affinityWell.verdance > 0 && heldAffinityCount < 10
        ? 1
        : 0;
      if (affinityAmount > 0) {
        state.affinityWell.verdance -= affinityAmount;
        player.affinities.verdance += affinityAmount;
        pushLog(state, {
          playerId: player.playerId,
          playerName: player.playerName,
          summary: `Verdant Oracle — Early Bloom: gained ${affinityAmount} Verdance from the Affinity Well`,
          turn: state.roundNumber,
        });
      } else {
        const reason = state.affinityWell.verdance <= 0
          ? "no Verdance remained in the Affinity Well"
          : "the 10-token Affinity limit was already reached";
        pushLog(state, {
          playerId: player.playerId,
          playerName: player.playerName,
          summary: `Verdant Oracle — Early Bloom: no token gained (${reason})`,
          turn: state.roundNumber,
        });
      }
      pushActivationEvent(state, lumId, "summon", player.playerId, undefined, {
        affinityType: "verdance",
        affinityAmount,
      });
      break;
    }
    case "lum_forge": {
      // Impact Extinction: collapse the entire Forge back into the Archives,
      // randomize each complete tier pool, then manifest four new Artifacts per row.
      // This is explicitly not a Burn: it emits no BurnEvent and never touches
      // the Burn Pile, Phoenix recurrence, or burn-dependent payouts.
      const returnedIds = resetForgeThroughArchives(state, player.playerId);
      pushLog(state, {
        playerId: player.playerId,
        playerName: player.playerName,
        summary: `The Iron Harbinger — Impact Extinction: returned ${returnedIds.length} Forge Artifacts to their Archives, randomized the Archives, and refilled The Forge`,
        turn: state.roundNumber,
      });
      pushActivationEvent(state, lumId, "summon", player.playerId, returnedIds);
      break;
    }
    case "lum_astral": {
      // Eternal Recurrence activates immediately for future Burns. Artifacts
      // already in the Burn Pile wait until the beginning of the owner's next turn.
      state.phoenixRecurrence = {
        ownerId: player.playerId,
        summonedAtTurnCount,
        recoveryPending: true,
      };
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Phoenix Paradox — Eternal Recurrence manifested; existing Burned Artifacts will return at the beginning of ${player.playerName}'s next turn`,
        turn: state.roundNumber,
      });
      break;
    }
    case "lum_compass": {
      // The Forgotten Hour: mark all face-up Forge cards as Forgotten.
      const victoryRequirementBefore = getVictoryRequirement(state);
      const forgottenIds = applySummonEffect_forgottenHour(state, player, summonedAtTurnCount);
      const victoryRequirementAfter = getVictoryRequirement(state);
      pushActivationEvent(state, lumId, "summon", player.playerId, forgottenIds, {
        victoryRequirementBefore,
        victoryRequirementAfter,
        victoryRequirementChange: victoryRequirementAfter - victoryRequirementBefore,
      });
      break;
    }
    case "lum_seed": {
      const moldSlots = applySummonEffect_avatarSeeds(state, player, summonedAtTurnCount);
      pushActivationEvent(state, lumId, "summon", player.playerId, undefined, { targetSlotIds: moldSlots });
      break;
    }
    case "lum_pale": {
      // Balance Due: every player at or above half of an Affinity's
      // starting supply returns exactly two tokens of each qualifying type.
      const affinityReturns = applySummonEffect_balanceDue(state, player);
      pushActivationEvent(state, lumId, "summon", player.playerId, undefined, {
        affinityReturns,
      });
      break;
    }
    case "lum_ember": {
      // Cinder Mandate: mark face-up cards without Flare/Abyss/Radiance as Condemned.
      // Capture the condemned IDs at mark-time and include them in the event payload so
      // the client animation still has the full target list after the server burn loop
      // has cleared artifactMarkers.
      const condemnedIds = applySummonEffect_cinderMandate(state, player, summonedAtTurnCount);
      pushActivationEvent(state, lumId, "summon", player.playerId, condemnedIds);
      break;
    }
    case "lum_null": {
      // Black Domain: mark face-up T3 cards that do not require all three domains.
      const nullifiedIds = applySummonEffect_blackDomain(state, player, summonedAtTurnCount);
      pushActivationEvent(state, lumId, "summon", player.playerId, nullifiedIds);
      break;
    }
    case "lum_hunger": {
      // The one-use action is granted silently. Its activation presentation is
      // queued only when the owner actually uses Assimilation.
      state.firstHungerAvailable = player.playerId;
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Final Hunger — Assimilation is available once`,
        turn: state.roundNumber,
      });
      break;
    }
    case "lum_scholar": {
      // Selective Amnesia: draw up to 2 cards from the top of any deck.
      const drawn: { id: string; tier: 1 | 2 | 3 }[] = [];
      for (const tier of [1, 2, 3] as const) {
        const deck = getDeckForTier(state, tier);
        while (deck.length > 0 && drawn.length < 2) {
          drawn.push({ id: deck.shift()!, tier });
        }
      }
      if (drawn.length > 0) {
        const chosen = drawn[0];
        const card = CARD_MAP.get(chosen.id);
        if (card) {
          player.forgedArtifactIds.push(chosen.id);
          recordArtifactImplementation(player, chosen.id, state.turnCount, {
            countForgeAction: false,
          });
          player.bonuses[card.bonusAffinity]++;
          player.eminence += card.eminence;
          player.discountedForgeIds.push(chosen.id);
        }
        pushLog(state, {
          playerId: player.playerId, playerName: player.playerName,
          summary: `Celestial Scholar — Selective Amnesia: drew ${drawn.length} Artifact(s), added ${chosen.id} to collection`,
          turn: state.roundNumber,
        });
        pushActivationEvent(state, lumId, "summon", player.playerId);
      }
      break;
    }
    // Passive / delayed effects — nothing on summon:
    // lum_void: Oblivion threshold change is handled after this call.
    // lum_radiant (Concordance Mandala): delayed end-of-turn check.
    // lum_bloom (Catalyst Bloom): delayed end-of-turn check.
    // lum_orchard (Glass Orchard): first-forge trigger handled in forge_artifact.
    default:
      break;
  }
}

// ─── v0.8 End-of-Turn / Start-of-Turn Hooks ───────────────────────────────────

/**
 * Apply delayed effects for the player whose turn is about to end.
 * Runs after every arrival and summon-effect presentation produced by the core
 * action, but before turnCount advances to the incoming turn.
 */
function applyEndOfTurnEffects(state: GameStateData, player: PlayerGameState): void {
  // ── Concordance Mandala: one +2 payout at 8 and another at 10 Radiance Artifacts ──
  if (player.luminaries.includes("lum_radiant")) {
    const radianceArtifacts = player.forgedArtifactIds.filter(
      (id) => CARD_MAP.get(id)?.bonusAffinity === "radiance",
    ).length;

    if (radianceArtifacts >= 8 && !state.concordanceMandalaTriggered) {
      player.eminence += 2;
      state.concordanceMandalaTriggered = true;
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Concordance Mandala — Perfect Coherence: 8 Radiance Artifacts → +2 Eminence`,
        turn: state.roundNumber,
      });
      pushActivationEvent(state, "lum_radiant", "end_of_turn", player.playerId);
    }

    if (radianceArtifacts >= 10 && !state.concordanceMandalaFinalTriggered) {
      player.eminence += 2;
      state.concordanceMandalaFinalTriggered = true;
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Concordance Mandala — Perfect Coherence: 10 Radiance Artifacts → +2 Eminence`,
        turn: state.roundNumber,
      });
      pushActivationEvent(state, "lum_radiant", "end_of_turn", player.playerId);
    }
  }

  // ── Catalyst Bloom (lum_bloom): +1 Eminence per burn effect since last turn ──
  if (player.luminaries.includes("lum_bloom")) {
    const burnEffects = state.catalystBloomBurnCount ?? 0;
    if (burnEffects > 0) {
      player.eminence += burnEffects;
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Catalyst Bloom — Aftergrowth: +${burnEffects} Eminence (${burnEffects} burn effect(s))`,
        turn: state.roundNumber,
      });
      pushActivationEvent(state, "lum_bloom", "end_of_turn", player.playerId);
    }
    state.catalystBloomBurnCount = 0; // Reset for next period.
  }

  // ── Forgotten Hour (lum_compass): clear, wait 12 owner turns, then repeat ──
  const forgottenLa = state.luminaryAffinities.find(
    (x) => x.luminaryId === "lum_compass" && x.ownerId === player.playerId,
  );
  if (forgottenLa) {
    if (!state.forgottenHourCycle) state.forgottenHourCycle = {};
    const forgottenCycle = state.forgottenHourCycle[player.playerId] ?? {
      lastAppliedTurnCount: forgottenLa.summonedAtTurnCount,
      cooldownOwnerTurnsRemaining: null,
    };
    state.forgottenHourCycle[player.playerId] = forgottenCycle;

    if (forgottenCycle.cooldownOwnerTurnsRemaining === null) {
      if (state.turnCount > forgottenCycle.lastAppliedTurnCount) {
        let clearedCount = 0;
        if (state.artifactMarkers) {
          for (const id of Object.keys(state.artifactMarkers)) {
            clearedCount += removeArtifactBrands(
              state,
              id,
              (brand) => brand.type === "forgotten" && brand.ownerId === player.playerId,
            );
          }
        }
        forgottenCycle.cooldownOwnerTurnsRemaining = 12;
        if (clearedCount > 0) {
          pushLog(state, {
            playerId: player.playerId, playerName: player.playerName,
            summary: `Forgotten Hour — markers expired: ${clearedCount} Forgotten Artifact(s) cleared`,
            turn: state.roundNumber,
          });
        }
      }
    } else if (forgottenCycle.cooldownOwnerTurnsRemaining > 0) {
      forgottenCycle.cooldownOwnerTurnsRemaining--;
      if (forgottenCycle.cooldownOwnerTurnsRemaining === 0) {
        const forgottenIds = applySummonEffect_forgottenHour(state, player, state.turnCount, {
          isRepeat: true,
        });
        if (forgottenIds.length > 0) {
          pushActivationEvent(state, "lum_compass", "end_of_turn", player.playerId, forgottenIds);
        }
      }
    }
  }

  // ── Ember Sovereign (lum_ember): burn remaining Condemned cards at end of claimer's next turn ──
  const emberLa = state.luminaryAffinities.find(
    (x) => x.luminaryId === "lum_ember" && x.ownerId === player.playerId,
  );
  if (
    emberLa &&
    state.turnCount > emberLa.summonedAtTurnCount &&
    state.artifactMarkers
  ) {
    const condemned = Object.entries(state.artifactMarkers).filter(
      ([, marker]) => markerHasBrand(marker, "condemned", player.playerId),
    );
    if (condemned.length > 0) {
      // Capture IDs before the burn loop clears them from artifactMarkers.
      // The client animation procedure needs these IDs to drive the burn
      // cinematic even after state.artifactMarkers has been cleared by burnCard.
      const burnedCardIds: string[] = [];
      let burnCount = 0;
      for (const [cardId] of condemned) {
        for (const tier of [1, 2, 3] as const) {
          const forgeRow = getForgeRowForTier(state, tier);
          if (forgeRow.includes(cardId)) {
            if (burnCard(state, cardId, tier, "lum_ember")) {
              burnedCardIds.push(cardId);
              burnCount++;
            }
            break;
          }
        }
        // Marker already removed by burnCard → refillForgeSlot.
      }
      if (burnCount > 0) {
        pushLog(state, {
          playerId: player.playerId, playerName: player.playerName,
          summary: `Ember Sovereign — Cinder Mandate: burned ${burnCount} Condemned Artifact(s)`,
          turn: state.roundNumber,
        });
        pushActivationEvent(state, "lum_ember", "end_of_turn", player.playerId, burnedCardIds);
      }
    }
  }

  // ── Seed Beyond Seasons: occupied Avatar Seed molds brand unseeded Artifacts ──
  const avatarSeeds = state.avatarSeedState;
  if (avatarSeeds) {
    const newlySeededIds: string[] = [];
    for (const slotKey of avatarSeeds.moldSlots) {
      const [tierText, slotText] = slotKey.split("-");
      const tier = Number(tierText);
      const slotIndex = Number(slotText);
      if (![1, 2, 3].includes(tier) || !Number.isInteger(slotIndex)) continue;
      const artifactId = getForgeRowForTier(state, tier as 1 | 2 | 3)[slotIndex];
      if (!artifactId || markerHasBrand(state.artifactMarkers?.[artifactId], "avatar_seed")) continue;
      if (addArtifactBrand(state, artifactId, {
        type: "avatar_seed",
        ownerId: avatarSeeds.ownerId,
        summonedAtTurnCount: avatarSeeds.summonedAtTurnCount,
      })) {
        newlySeededIds.push(artifactId);
      }
    }
    if (newlySeededIds.length > 0) {
      const owner = state.players.find((candidate) => candidate.playerId === avatarSeeds.ownerId);
      pushLog(state, {
        playerId: avatarSeeds.ownerId,
        playerName: owner?.playerName ?? "Unknown",
        summary: `Seed Beyond Seasons — Avatar Seeds: ${newlySeededIds.length} Artifact(s) became Seeded`,
        turn: state.roundNumber,
      });
      pushActivationEvent(state, "lum_seed", "end_of_turn", avatarSeeds.ownerId, newlySeededIds);
    }
  }
}

/**
 * Apply start-of-turn effects for the player whose turn is about to begin.
 * turnCount has advanced, but currentPlayerIndex still identifies the outgoing
 * player until every resulting presentation has been acknowledged.
 */
function applyStartOfTurnEffects(state: GameStateData, player: PlayerGameState): void {
  // ── Assimilation (Final Hunger): lingering one-shot — persists until used, never auto-cleared ──

  // ── Phoenix Paradox: return the pre-manifestation Burn Pile once ──
  const recurrence = state.phoenixRecurrence;
  if (
    recurrence?.recoveryPending &&
    recurrence.ownerId === player.playerId &&
    state.turnCount > recurrence.summonedAtTurnCount
  ) {
    const returnedIds = [...state.burnPile];
    for (const cardId of returnedIds) {
      const card = CARD_MAP.get(cardId);
      if (!card) continue;
      const archive = getDeckForTier(state, card.tier);
      if (!archive.includes(cardId)) archive.push(cardId);
    }
    state.burnPile = state.burnPile.filter((cardId) => !returnedIds.includes(cardId));

    let refilled = 0;
    for (const tier of [1, 2, 3] as const) {
      const forgeRow = getForgeRowForTier(state, tier);
      const archive = getDeckForTier(state, tier);
      while (forgeRow.length < 4 && archive.length > 0) {
        forgeRow.push(archive.shift()!);
        refilled++;
      }
    }

    recurrence.recoveryPending = false;
    if (returnedIds.length > 0) {
      pushLog(state, {
        playerId: player.playerId,
        playerName: player.playerName,
        summary: `Phoenix Paradox — Eternal Recurrence: returned ${returnedIds.length} Burned Artifact(s) to their Archives${refilled > 0 ? ` and refilled ${refilled} Forge position(s)` : ""}`,
        turn: state.roundNumber,
      });
      pushActivationEvent(state, "lum_astral", "start_of_turn", player.playerId, returnedIds);
    }
  }

  beginAscensionRegistryObservation(state, player);
}

export interface DevLuminarySequenceOptions {
  luminaryIds: string[];
  includeNextTurnEffects?: boolean;
  /** Compatibility with callers using the former implementation-facing controls. */
  includeEndOfTurnEffects?: boolean;
  includeStartOfTurnEffects?: boolean;
}

export interface DevLuminarySequenceResult {
  success: boolean;
  error?: string;
  summonEventIds?: string[];
  activationEventIds?: string[];
}

function removeArtifactsFromSharedZones(state: GameStateData, artifactIds: Set<string>): void {
  state.forgeTier1 = state.forgeTier1.filter((id) => !artifactIds.has(id));
  state.forgeTier2 = state.forgeTier2.filter((id) => !artifactIds.has(id));
  state.forgeTier3 = state.forgeTier3.filter((id) => !artifactIds.has(id));
  state.deckTier1 = state.deckTier1.filter((id) => !artifactIds.has(id));
  state.deckTier2 = state.deckTier2.filter((id) => !artifactIds.has(id));
  state.deckTier3 = state.deckTier3.filter((id) => !artifactIds.has(id));
  state.burnPile = state.burnPile.filter((id) => !artifactIds.has(id));
  for (const otherPlayer of state.players) {
    otherPlayer.reservedArtifactIds = otherPlayer.reservedArtifactIds.filter((id) => !artifactIds.has(id));
    otherPlayer.privateReservedArtifactIds =
      otherPlayer.privateReservedArtifactIds?.filter((id) => !artifactIds.has(id));
    otherPlayer.forgedArtifactIds = otherPlayer.forgedArtifactIds.filter((id) => !artifactIds.has(id));
    otherPlayer.assimilatedArtifactIds = (otherPlayer.assimilatedArtifactIds ?? [])
      .filter((id) => !artifactIds.has(id));
    otherPlayer.discountedForgeIds = otherPlayer.discountedForgeIds.filter((id) => !artifactIds.has(id));
    otherPlayer.civilization = normalizeCivilizationState(otherPlayer);
  }
}

function refillDevForgeRows(state: GameStateData): void {
  for (const tier of [1, 2, 3] as const) {
    const forge = getForgeRowForTier(state, tier);
    const archive = getDeckForTier(state, tier);
    while (forge.length < 4 && archive.length > 0) {
      forge.push(archive.shift()!);
    }
  }
}

function clearDevLuminaryResidue(
  state: GameStateData,
  playerId: string,
  selectedIds: Set<string>,
): void {
  if (selectedIds.has("lum_radiant")) {
    state.concordanceMandalaTriggered = false;
    state.concordanceMandalaFinalTriggered = false;
  }
  if (selectedIds.has("lum_orchard")) state.glassOrchardTriggered = false;
  if (selectedIds.has("lum_astral")) state.phoenixRecurrence = undefined;
  if (selectedIds.has("lum_seed")) state.avatarSeedState = undefined;
  if (selectedIds.has("lum_tide")) {
    const player = state.players.find((candidate) => candidate.playerId === playerId);
    if (player) player.tideArchiveForgeAvailable = false;
  }
  if (selectedIds.has("lum_hunger") && state.firstHungerAvailable === playerId) {
    state.firstHungerAvailable = null;
  }
  if (selectedIds.has("lum_void") && state.voidSealOwnerId === playerId) {
    state.voidSealOwnerId = null;
  }
  if (selectedIds.has("lum_compass") && state.forgottenHourCycle) {
    delete state.forgottenHourCycle[playerId];
  }

  const markerTypes = new Set<ArtifactMarkerType>();
  if (selectedIds.has("lum_compass")) markerTypes.add("forgotten");
  if (selectedIds.has("lum_ember")) markerTypes.add("condemned");
  if (selectedIds.has("lum_null")) markerTypes.add("nullified");
  if (selectedIds.has("lum_seed")) markerTypes.add("avatar_seed");
  if (markerTypes.size === 0 || !state.artifactMarkers) return;

  for (const artifactId of Object.keys(state.artifactMarkers)) {
    removeArtifactBrands(
      state,
      artifactId,
      (brand) => brand.ownerId === playerId && markerTypes.has(brand.type),
    );
  }
}

function primeDevEndOfTurnEffects(
  state: GameStateData,
  player: PlayerGameState,
  selectedIds: Set<string>,
): void {
  for (const affinity of state.luminaryAffinities) {
    if (affinity.ownerId === player.playerId && selectedIds.has(affinity.luminaryId)) {
      affinity.summonedAtTurnCount = state.turnCount - 1;
    }
  }

  if (selectedIds.has("lum_radiant")) {
    const radianceIds = CARD_CATALOG
      .filter((card) => card.bonusAffinity === "radiance")
      .slice(0, 8)
      .map((card) => card.id);
    const radianceSet = new Set(radianceIds);
    removeArtifactsFromSharedZones(state, radianceSet);
    player.forgedArtifactIds.push(...radianceIds);
    player.forgedArtifactIds = [...new Set(player.forgedArtifactIds)];
    for (const artifactId of radianceIds) {
      recordArtifactImplementation(player, artifactId, state.turnCount, {
        countForgeAction: false,
      });
    }
    player.bonuses.radiance = Math.max(player.bonuses.radiance, radianceIds.length);
    refillDevForgeRows(state);
    state.concordanceMandalaTriggered = false;
    state.concordanceMandalaFinalTriggered = false;
  }

  if (selectedIds.has("lum_bloom")) {
    state.catalystBloomBurnCount = Math.max(2, state.catalystBloomBurnCount ?? 0);
  }

  if (selectedIds.has("lum_seed") && state.avatarSeedState?.ownerId === player.playerId) {
    state.avatarSeedState.summonedAtTurnCount = state.turnCount - 1;
  }

}

function primeDevStartOfTurnEffects(
  state: GameStateData,
  player: PlayerGameState,
  selectedIds: Set<string>,
): void {
  if (!selectedIds.has("lum_astral")) return;
  const recurrence = state.phoenixRecurrence;
  if (!recurrence || recurrence.ownerId !== player.playerId) return;

  recurrence.summonedAtTurnCount = state.turnCount - 1;
  recurrence.recoveryPending = true;
  if (state.burnPile.length === 0) {
    const seededBurnIds = [
      state.deckTier1.shift(),
      state.deckTier2.shift(),
      state.deckTier3.shift(),
    ].filter((id): id is string => !!id);
    state.burnPile.push(...seededBurnIds);
  }
}

function hasPendingLuminaryPresentation(state: GameStateData): boolean {
  return (
    (state.pendingSummonEvents?.length ?? 0) > 0 ||
    (state.pendingLuminaryActivationEvents?.length ?? 0) > 0 ||
    (state.pendingBlueprintManifestationEvents?.length ?? 0) > 0 ||
    (state.pendingBlueprintDetonationEvents?.length ?? 0) > 0
  );
}

function completeDevLuminarySequenceIfIdle(state: GameStateData): void {
  if (
    state.devLuminarySequenceActive &&
    !state.devLuminarySequenceStage &&
    !hasPendingLuminaryPresentation(state)
  ) {
    state.devLuminarySequenceActive = false;
  }
}

function advanceDevLuminarySequenceStage(state: GameStateData): void {
  const stage = state.devLuminarySequenceStage;
  if (!stage) {
    completeDevLuminarySequenceIfIdle(state);
    return;
  }
  if (hasPendingLuminaryPresentation(state)) return;

  const player = state.players.find(
    (candidate) => candidate.playerId === stage.playerId,
  );
  if (!player) {
    delete state.devLuminarySequenceStage;
    completeDevLuminarySequenceIfIdle(state);
    return;
  }

  const selectedIds = new Set(stage.luminaryIds);
  const includeNextTurnEffects = stage.includeNextTurnEffects ?? !!(
    stage.includeEndOfTurnEffects || stage.includeStartOfTurnEffects
  );
  while (state.devLuminarySequenceStage && !hasPendingLuminaryPresentation(state)) {
    const phase = stage.phase ?? "arrivals";
    if (phase === "arrivals") {
      stage.phase = "end_of_turn";
      if (includeNextTurnEffects) {
        primeDevEndOfTurnEffects(state, player, selectedIds);
        applyEndOfTurnEffects(state, player);
      }
      continue;
    }
    if (phase === "end_of_turn") {
      stage.phase = "start_of_turn";
      if (includeNextTurnEffects) {
        primeDevStartOfTurnEffects(state, player, selectedIds);
        applyStartOfTurnEffects(state, player);
      }
      continue;
    }
    delete state.devLuminarySequenceStage;
  }
  completeDevLuminarySequenceIfIdle(state);
}

/**
 * DEV-ONLY integration harness for testing the production Luminary presentation
 * lane. It commits selected Luminaries through the canonical batch resolver,
 * then advances delayed hooks only after every arrival effect is acknowledged.
 * This preserves the production target lifecycle: arrival brands remain on the
 * Forge long enough to receive their presentation before later effects consume
 * or replace those Artifacts.
 */
export function runDevLuminarySequence(
  state: GameStateData,
  playerId: string,
  options: DevLuminarySequenceOptions,
): DevLuminarySequenceResult {
  if (process.env.NODE_ENV === "production") {
    return { success: false, error: "Developer Luminary sequences are disabled in production" };
  }
  if (state.phase !== "playing") {
    return { success: false, error: "Game must be in progress" };
  }
  if (
    state.pendingSummonEvents.length > 0 ||
    state.pendingLuminaryActivationEvents.length > 0 ||
    state.pendingTurnTransition ||
    state.pendingLuminaryChoice ||
    state.devLuminarySequenceActive
  ) {
    return { success: false, error: "Wait for the current Luminary sequence to finish" };
  }

  const player = state.players.find((candidate) => candidate.playerId === playerId);
  if (!player) return { success: false, error: "Player not found" };

  const orderedIds = [...new Set(options.luminaryIds)];
  if (orderedIds.length === 0) {
    return { success: false, error: "Select at least one Luminary" };
  }
  const unknownId = orderedIds.find((id) => !LUMINARY_MAP.has(id));
  if (unknownId) {
    return { success: false, error: `Unknown Luminary: ${unknownId}` };
  }

  const selectedIds = new Set(orderedIds);
  for (const gamePlayer of state.players) {
    gamePlayer.luminaries = gamePlayer.luminaries.filter((id) => !selectedIds.has(id));
  }
  state.luminaryAffinities = state.luminaryAffinities.filter(
    (entry) => !selectedIds.has(entry.luminaryId),
  );
  state.activeLuminaries = [
    ...orderedIds,
    ...state.activeLuminaries.filter((id) => !selectedIds.has(id)),
  ];
  clearDevLuminaryResidue(state, player.playerId, selectedIds);

  const summonStart = state.pendingSummonEvents.length;
  const activationStart = state.pendingLuminaryActivationEvents.length;
  state.devLuminarySequenceActive = true;

  // Keep Balance Due observable in the sequence lab even when the captured
  // baseline has no qualifying holdings. The real game never receives this staging.
  if (orderedIds.includes("lum_pale")) {
    const startingSupply = affinityWellForPlayerCount(state.players.length);
    const stagedAffinities: readonly StandardAffinityKey[] = [
      "flare",
      "continuum",
      "verdance",
      "abyss",
      "radiance",
    ];
    state.players.forEach((gamePlayer, index) => {
      const affinity = stagedAffinities[index % stagedAffinities.length]!;
      const threshold = Math.ceil(startingSupply[affinity] / 2);
      const needed = Math.max(0, threshold - (gamePlayer.affinities[affinity] ?? 0));
      gamePlayer.affinities[affinity] += needed;
      state.affinityWell[affinity] = Math.max(0, state.affinityWell[affinity] - needed);
    });
  }

  applyLuminaryBatch(state, player, orderedIds, 1);

  const includeNextTurnEffects = options.includeNextTurnEffects ?? !!(
    options.includeEndOfTurnEffects || options.includeStartOfTurnEffects
  );
  if (includeNextTurnEffects) {
    state.devLuminarySequenceStage = {
      playerId: player.playerId,
      luminaryIds: orderedIds,
      includeNextTurnEffects: true,
      phase: "arrivals",
    };
  } else {
    delete state.devLuminarySequenceStage;
  }
  completeDevLuminarySequenceIfIdle(state);

  state.version += 1;
  state.lastAction = {
    type: "dev_luminary_sequence",
    playerId,
    luminaryIds: orderedIds,
    includeNextTurnEffects,
  };

  return {
    success: true,
    summonEventIds: state.pendingSummonEvents.slice(summonStart).map((event) => event.eventId),
    activationEventIds: state.pendingLuminaryActivationEvents
      .slice(activationStart)
      .map((event) => event.eventId),
  };
}

// ─── Win Condition ────────────────────────────────────────────────────────────

function getVictoryRequirement(state: GameStateData): number {
  // A missing requirement identifies a pre-setting legacy save, whose original
  // rules target was 15. New games always receive the explicit default of 20.
  return Math.max(
    MIN_VICTORY_REQUIREMENT,
    state.victoryRequirement ?? MIN_VICTORY_REQUIREMENT,
  );
}

function checkWin(state: GameStateData): boolean {
  const victoryRequirement = getVictoryRequirement(state);
  return state.players.some((p) => p.eminence >= victoryRequirement);
}

function forgeAndArchivesAreEmpty(state: GameStateData): boolean {
  return (
    state.forgeTier1.length === 0 &&
    state.forgeTier2.length === 0 &&
    state.forgeTier3.length === 0 &&
    state.deckTier1.length === 0 &&
    state.deckTier2.length === 0 &&
    state.deckTier3.length === 0
  );
}

function selectWinnerId(players: ReadonlyArray<PlayerGameState>): string | null {
  let winner = players[0];
  if (!winner) return null;

  for (const contender of players.slice(1)) {
    const comparison = compareVictoryStandings(
      {
        eminence: contender.eminence,
        reservedArtifactCount: ordinaryEncryptedCount(contender),
        forgedArtifacts: contender.forgedArtifactIds
          .map((id) => CARD_MAP.get(id))
          .filter((card): card is ArtifactCard => !!card),
      },
      {
        eminence: winner.eminence,
        reservedArtifactCount: ordinaryEncryptedCount(winner),
        forgedArtifacts: winner.forgedArtifactIds
          .map((id) => CARD_MAP.get(id))
          .filter((card): card is ArtifactCard => !!card),
      },
    );
    if (comparison < 0) winner = contender;
  }

  return winner.playerId;
}

function assignWinner(state: GameStateData, players = state.players): void {
  state.winnerId = selectWinnerId(players);

  if (state.winTriggerLuminaryId) {
    const winnerState = state.players.find(
      (player) => player.playerId === state.winnerId,
    );
    if (!winnerState?.luminaries.includes(state.winTriggerLuminaryId)) {
      state.winTriggerLuminaryId = null;
    }
  }
}

function plannedActionAlreadyResolvedForPlayer(
  player: PlayerGameState,
  action: ActionPayload,
): boolean {
  if (!action.cardId) return false;

  const isCardClaimAction =
    action.type === "forge_artifact" ||
    action.type === "forge_reserved_artifact" ||
    action.type === "reserve_artifact" ||
    action.type === "assimilate";

  if (!isCardClaimAction) return false;

  if (player.forgedArtifactIds.includes(action.cardId)) {
    return true;
  }

  if (player.reservedArtifactIds.includes(action.cardId)) {
    return true;
  }

  if ((player.assimilatedArtifactIds ?? []).includes(action.cardId)) {
    return true;
  }

  return false;
}

function shouldSilentlyDropResolvedPlan(
  player: PlayerGameState,
  action: ActionPayload,
  error?: string,
): boolean {
  return error === ERR_ARTIFACT_NOT_IN_FORGE && plannedActionAlreadyResolvedForPlayer(player, action);
}

function recordFailedPlannedAction(
  state: GameStateData,
  player: PlayerGameState,
  action: ActionPayload,
  reason: string,
): void {
  if (shouldSilentlyDropResolvedPlan(player, action, reason)) {
    player.plannedActionCancelReason = null;
    return;
  }

  player.plannedActionCancelReason = reason;
  pushLog(state, {
    playerId: player.playerId,
    playerName: player.playerName,
    summary: `pending action cleared — ${reason}`,
    turn: state.roundNumber,
  });
  state.lastAction = {
    type: "planned_action_cancelled",
    playerId: player.playerId,
    reason,
  };
  state.version++;
}

// ─── Staged Turn Resolution ───────────────────────────────────────────────────

function hasPendingLuminaryEvents(state: GameStateData): boolean {
  return (
    (state.pendingSummonEvents?.length ?? 0) > 0 ||
    (state.pendingLuminaryActivationEvents?.length ?? 0) > 0 ||
    (state.pendingBlueprintManifestationEvents?.length ?? 0) > 0 ||
    (state.pendingBlueprintDetonationEvents?.length ?? 0) > 0
  );
}

function finishGameIfNeeded(
  state: GameStateData,
  nextPlayerIndex: number,
): void {
  if (forgeAndArchivesAreEmpty(state)) {
    state.phase = "finished";
    state.finishReason = "win";
    assignWinner(state);
    finalizeTraceScenarioOutcome(state);
    finalizeRecurrenceScenarioOutcome(state);
    finalizeTriangulationScenarioOutcome(state);
    return;
  }

  if (state.phase === "playing" && checkWin(state)) {
    state.phase = "last_round";
  }

  if (state.phase !== "last_round" || nextPlayerIndex !== 0) return;

  state.phase = "finished";
  state.finishReason = "win";
  assignWinner(state);
  finalizeTraceScenarioOutcome(state);
  finalizeRecurrenceScenarioOutcome(state);
  finalizeTriangulationScenarioOutcome(state);
}

/**
 * Continue the authoritative resolution pipeline until either a Luminary event
 * requires presentation or the incoming turn can be released.
 */
function continuePendingTurnTransition(state: GameStateData): void {
  let safety = 0;
  while (
    state.pendingTurnTransition &&
    !state.pendingLuminaryChoice &&
    state.traceScenario?.phase !== 'awaiting_guidance' &&
    state.recurrenceScenario?.phase !== 'awaiting_custody' &&
    state.triangulationScenario?.phase !== 'awaiting_alignment' &&
    !hasPendingLuminaryEvents(state) &&
    safety++ < 4
  ) {
    const transition = state.pendingTurnTransition;

    if (transition.stage === "after_action") {
      // End-of-turn effects are deliberately later than all summon effects
      // produced by the player's core action.
      transition.stage = "after_end_effects";
      const endingPlayer = state.players.find(
        (player) => player.playerId === transition.endingPlayerId,
      );
      if (endingPlayer) {
        settleAscensionRegistryObservation(state, endingPlayer);
        applyEndOfTurnEffects(state, endingPlayer);
      }
      continue;
    }

    if (transition.stage === "after_end_effects") {
      const playerCount = state.players.length;
      if (playerCount === 0) {
        state.pendingTurnTransition = null;
        state.coreActionUsed = false;
        return;
      }

      const endingPlayerIndex = state.players.findIndex(
        (player) => player.playerId === transition.endingPlayerId,
      );
      const nextPlayerIndex =
        ((endingPlayerIndex >= 0 ? endingPlayerIndex : state.currentPlayerIndex) + 1) %
        playerCount;

      const unresolvedTrace = state.traceScenario?.guidanceMethod === null &&
        state.traceScenario.phase !== 'finished';
      const terminalTraceWindow = unresolvedTrace && (
        forgeAndArchivesAreEmpty(state) ||
        ((state.phase === 'last_round' || checkWin(state)) && nextPlayerIndex === 0)
      );
      if (traceGuidanceIsDue(state) || terminalTraceWindow) {
        state.traceScenario!.phase = 'awaiting_guidance';
        state.lastAction = {
          type: 'chronicle_guidance_ready',
          playerId: state.traceScenario!.architectPlayerId,
        };
        return;
      }

      const unresolvedRecurrence = state.recurrenceScenario?.custodyMethod === null &&
        state.recurrenceScenario.phase !== 'finished';
      const terminalRecurrenceWindow = unresolvedRecurrence && (
        forgeAndArchivesAreEmpty(state) ||
        ((state.phase === 'last_round' || checkWin(state)) && nextPlayerIndex === 0)
      );
      if (recurrenceCustodyIsDue(state) || terminalRecurrenceWindow) {
        state.recurrenceScenario!.phase = 'awaiting_custody';
        state.lastAction = {
          type: 'chronicle_custody_ready',
          playerId: state.recurrenceScenario!.architectPlayerId,
        };
        return;
      }

      const unresolvedTriangulation = state.triangulationScenario?.coordinationArchitecture === null &&
        state.triangulationScenario.phase !== 'finished';
      const terminalTriangulationWindow = unresolvedTriangulation && (
        forgeAndArchivesAreEmpty(state) ||
        ((state.phase === 'last_round' || checkWin(state)) && nextPlayerIndex === 0)
      );
      if (triangulationAlignmentIsDue(state) || terminalTriangulationWindow) {
        state.triangulationScenario!.phase = 'awaiting_alignment';
        state.lastAction = {
          type: 'chronicle_alignment_ready',
          playerId: state.triangulationScenario!.architectPlayerId,
        };
        return;
      }

      state.turnCount = (state.turnCount ?? 0) + 1;

      finishGameIfNeeded(state, nextPlayerIndex);
      if (state.phase === "finished") {
        state.pendingTurnTransition = null;
        state.coreActionUsed = false;
        return;
      }

      if (nextPlayerIndex === 0) state.roundNumber++;
      transition.stage = "after_start_effects";
      transition.nextPlayerIndex = nextPlayerIndex;

      // Apply the incoming player's start effects while the outgoing player
      // remains authoritative. The index changes only after their presentation
      // has been acknowledged, so no client or AI can observe an actionable
      // incoming turn early.
      const startingPlayer = state.players[nextPlayerIndex];
      if (startingPlayer) applyStartOfTurnEffects(state, startingPlayer);
      continue;
    }

    const nextPlayerIndex = transition.nextPlayerIndex;
    if (
      typeof nextPlayerIndex === "number" &&
      nextPlayerIndex >= 0 &&
      nextPlayerIndex < state.players.length
    ) {
      state.currentPlayerIndex = nextPlayerIndex;
    }
    state.coreActionUsed = false;
    state.pendingTurnTransition = null;
  }
}

function beginTurnTransition(state: GameStateData): void {
  if (state.phase === "finished") return;
  if (!state.pendingTurnTransition) {
    const endingPlayer = state.players[state.currentPlayerIndex];
    if (!endingPlayer) return;
    state.pendingTurnTransition = {
      stage: "after_action",
      endingPlayerId: endingPlayer.playerId,
    };
  }
  continuePendingTurnTransition(state);
}

// ─── Plan Validation Helper ───────────────────────────────────────────────────

/**
 * Validates whether `action` would be legal if it were `playerId`'s turn,
 * without mutating the real state.  Uses a deep-clone dry-run so all
 * existing action-validation logic is reused automatically.
 */
function validatePlannedAction(
  state: GameStateData,
  playerId: string,
  action: ActionPayload,
): { ok: boolean; error?: string } {
  const clone: GameStateData = JSON.parse(JSON.stringify(state));
  const idx = clone.players.findIndex((p) => p.playerId === playerId);
  if (idx === -1) return { ok: false, error: "Player not found" };
  // Planning is the sole gameplay exception to presentation gates. Validate
  // against the post-presentation state without consuming real events.
  clone.pendingSummonEvents = [];
  clone.pendingLuminaryActivationEvents = [];
  clone.pendingBlueprintManifestationEvents = [];
  clone.pendingBlueprintDetonationEvents = [];
  clone.pendingLuminaryChoice = null;
  continuePendingTurnTransition(clone);
  clone.pendingSummonEvents = [];
  clone.pendingLuminaryActivationEvents = [];
  clone.pendingBlueprintManifestationEvents = [];
  clone.pendingBlueprintDetonationEvents = [];
  clone.pendingTurnTransition = null;
  clone.currentPlayerIndex = idx;
  clone.coreActionUsed = false;
  // _isAutoExec=true prevents the recursive planned-action check inside applyAction
  const result = applyAction(clone, playerId, action, true);
  return result.success ? { ok: true } : { ok: false, error: result.error };
}

// ─── Main Action Handler ──────────────────────────────────────────────────────

export function applyAction(
  state: GameStateData,
  playerId: string,
  action: ActionPayload,
  _isAutoExec = false,
): { success: boolean; error?: string } {
  const playerIdx = state.players.findIndex((p) => p.playerId === playerId);
  if (playerIdx === -1) return { success: false, error: "Player not found" };
  if (state.phase === "finished")
    return { success: false, error: "Game is over" };

  if (
    state.traceScenario?.phase === 'awaiting_guidance' &&
    action.type !== 'resolve_chronicle_choice'
  ) {
    return { success: false, error: 'Resolve the Crownfall guidance window before acting' };
  }
  if (
    state.recurrenceScenario?.phase === 'awaiting_custody' &&
    action.type !== 'resolve_chronicle_choice'
  ) {
    return { success: false, error: 'Resolve custody of the Deep Index before acting' };
  }
  if (
    state.triangulationScenario?.phase === 'awaiting_alignment' &&
    action.type !== 'resolve_chronicle_choice'
  ) {
    return { success: false, error: 'Resolve the Alignment before acting' };
  }

  // Auto-expire stale pending summon events.  If a client disconnects before
  // sending resolve_summon, the event would otherwise gate planned-action
  // execution indefinitely.  TTL = 90 s (much longer than any cutscene; the
  // longest cutscene is ~12 s).  Events created before this field was added
  // (createdAt undefined) are left alone for backward compat.
  if (Array.isArray(state.pendingSummonEvents) && state.pendingSummonEvents.length > 0) {
    const SUMMON_TTL_MS = 90_000;
    const now = Date.now();
    const pendingBeforeExpiry = state.pendingSummonEvents.length;
    state.pendingSummonEvents = state.pendingSummonEvents.filter(
      (e) => !e.createdAt || now - e.createdAt < SUMMON_TTL_MS,
    );
    if (state.pendingSummonEvents.length !== pendingBeforeExpiry) {
      continuePendingTurnTransition(state);
    }
  }

  // Auto-expire stale pendingLuminaryChoice.  If the client never responds,
  // auto-apply candidates in eligibility-scan order after 120 s.
  if (state.pendingLuminaryChoice) {
    const CHOICE_TTL_MS = 120_000;
    if (Date.now() - state.pendingLuminaryChoice.createdAt > CHOICE_TTL_MS) {
      const expired = state.pendingLuminaryChoice;
      state.pendingLuminaryChoice = null;
      const expiredPlayerIdx = state.players.findIndex(
        (p) => p.playerId === expired.playerId,
      );
      if (expiredPlayerIdx !== -1) {
        applyLuminaryBatch(
          state,
          state.players[expiredPlayerIdx],
          expired.candidates,
          0,
        );
      }
    }
  }

  // pendingLuminaryChoice gate — ordering is part of the Luminary resolution
  // pipeline. Planning remains provisional and is the only gameplay exception.
  if (
    state.pendingLuminaryChoice &&
    state.pendingLuminaryChoice.playerId === playerId &&
    action.type !== "choose_luminary_order" &&
    action.type !== "plan_action" &&
    action.type !== "cancel_plan"
  ) {
    return {
      success: false,
      error: "Choose your Luminary claim order before taking another action",
    };
  }

  // A Luminary sequence is an authoritative resolution phase, not a visual
  // suggestion. No normal game mutation may interleave with it. Planning is
  // provisional; ordering and acknowledgements are themselves resolution work.
  const luminaryResolutionActive =
    !!state.pendingTurnTransition ||
    !!state.pendingLuminaryChoice ||
    hasPendingLuminaryEvents(state);
  const allowedDuringLuminaryResolution =
    action.type === "resolve_summon" ||
    action.type === "resolve_luminary_activation" ||
    action.type === "resolve_blueprint_manifestation" ||
    action.type === "resolve_blueprint_detonation" ||
    action.type === "choose_luminary_order" ||
    action.type === "resolve_chronicle_choice" ||
    action.type === "plan_action" ||
    action.type === "cancel_plan" ||
    action.type === "tutorial_fast_forward";
  if (luminaryResolutionActive && !allowedDuringLuminaryResolution) {
    return {
      success: false,
      error: "Complete the Luminary resolution sequence before acting",
    };
  }

  // Resolution acknowledgements and provisional planning are not turn-gated.
  // choose_luminary_order validates ownership and turn position in its handler.
  const isTurnGated =
    action.type !== "toggle_luminary_affinity" &&
    action.type !== "resolve_summon" &&
    action.type !== "resolve_luminary_activation" &&
    action.type !== "resolve_blueprint_manifestation" &&
    action.type !== "resolve_blueprint_detonation" &&
    action.type !== "plan_action" &&
    action.type !== "cancel_plan" &&
    action.type !== "tutorial_fast_forward" &&
    action.type !== "set_civ_name" &&
    action.type !== "choose_luminary_order" &&
    action.type !== "resolve_chronicle_choice";
  if (isTurnGated && state.currentPlayerIndex !== playerIdx) {
    return { success: false, error: "Not your turn" };
  }

  // Guard: only one core action is allowed per turn. This remains active while
  // the staged transition is resolving, preventing a second action from landing.
  if (isTurnGated && state.coreActionUsed && CORE_ACTIONS.has(action.type)) {
    return { success: false, error: "You already used your core action this turn." };
  }

  const player = state.players[playerIdx];
  let actionSummaryOverride: string | null = null;

  if (action.blueprintAction && action.type !== "forge_artifact") {
    return { success: false, error: "Blueprint claim action requires a face-up Forge action" };
  }

  switch (action.type) {
    case "toggle_luminary_affinity": {
      return {
        success: false,
        error: "Active affinity is fixed when the Luminary arrives",
      };
    }
    case "set_civ_name": {
      const raw = action.civName ?? "";
      const trimmed = raw.trim().slice(0, 48);
      // Idempotency guard: if the name is unchanged, return success without
      // touching state.version or broadcasting.  This prevents every WS
      // reconnect from firing a spurious version bump that re-runs processUpdate
      // on all clients (visible refresh, duplicate summon queuing, etc.).
      const newName = trimmed || undefined;
      if (player.civName === newName) return { success: true };
      player.civName = newName;
      state.lastAction = { type: "set_civ_name", playerId };
      state.version++;
      return { success: true };
    }
    case "harness_three_affinities": {
      const selected = action.affinities ?? {};
      const colors = STANDARD_AFFINITY_KEYS.filter((c) => (selected[c] ?? 0) > 0);
      if (colors.length < 1 || colors.length > 3)
        return { success: false, error: "Must select 1–3 different affinities" };
      if (new Set(colors).size !== colors.length)
        return { success: false, error: "Must be different affinities" };
      for (const c of colors) {
        if ((selected[c] ?? 0) !== 1)
          return { success: false, error: "Harness exactly 1 of each affinity" };
        if (state.affinityWell[c] < 1)
          return { success: false, error: `No ${AFFINITY_LABEL[c]} available` };
      }
      const totalHeld = STANDARD_AFFINITY_KEYS.reduce((s, c) => s + player.affinities[c], 0) + player.affinities.singularity;
      const postTakeTotal = totalHeld + colors.length;
      for (const c of colors) {
        player.affinities[c]++;
        state.affinityWell[c]--;
      }
      if (postTakeTotal > 10) {
        const excessCount = postTakeTotal - 10;
        const returnMap = action.returnAffinities ?? {};
        const returnColorsWithSingularity = (Object.keys(returnMap) as AffinityKey[]).filter((c) => (returnMap[c] ?? 0) > 0);
        // Validate: all return counts must be non-negative integers
        for (const c of returnColorsWithSingularity) {
          const count = returnMap[c] ?? 0;
          if (!Number.isInteger(count) || count < 0) {
            for (const col of colors) { player.affinities[col]--; state.affinityWell[col]++; }
            return { success: false, error: "Return counts must be non-negative integers" };
          }
        }
        const totalReturned = returnColorsWithSingularity.reduce((s, c) => s + (returnMap[c] ?? 0), 0);
        if (totalReturned < excessCount) {
          for (const c of colors) { player.affinities[c]--; state.affinityWell[c]++; }
          return { success: false, error: `Must return ${excessCount} Affinity to stay within the 10-Affinity limit` };
        }
        for (const c of returnColorsWithSingularity) {
          const count = returnMap[c] ?? 0;
          if ((player.affinities[c] ?? 0) < count) {
            for (const col of colors) { player.affinities[col]--; state.affinityWell[col]++; }
            return { success: false, error: `Cannot return ${AFFINITY_LABEL[c as StandardAffinityKey] ?? "Singularity"} you do not hold` };
          }
        }
        for (const c of returnColorsWithSingularity) {
          const count = returnMap[c] ?? 0;
          player.affinities[c] -= count;
          state.affinityWell[c] += count;
        }
      }
      checkLuminaries(state, player);
      break;
    }

    case "harness_two_affinities": {
      const color = action.affinity;
      if (!color || !STANDARD_AFFINITY_KEYS.includes(color))
        return { success: false, error: "Invalid affinity" };
      if (state.affinityWell[color] < 4)
        return { success: false, error: "Need at least 4 in the well to harness 2" };
      const totalHeld = STANDARD_AFFINITY_KEYS.reduce((s, c) => s + player.affinities[c], 0) + player.affinities.singularity;
      const postTakeTotal = totalHeld + 2;
      player.affinities[color] += 2;
      state.affinityWell[color] -= 2;
      if (postTakeTotal > 10) {
        const excessCount = postTakeTotal - 10;
        const returnMap = action.returnAffinities ?? {};
        const returnColorsWithSingularity = (Object.keys(returnMap) as AffinityKey[]).filter((c) => (returnMap[c] ?? 0) > 0);
        // Validate: all return counts must be non-negative integers
        for (const c of returnColorsWithSingularity) {
          const count = returnMap[c] ?? 0;
          if (!Number.isInteger(count) || count < 0) {
            player.affinities[color] -= 2; state.affinityWell[color] += 2;
            return { success: false, error: "Return counts must be non-negative integers" };
          }
        }
        const totalReturned = returnColorsWithSingularity.reduce((s, c) => s + (returnMap[c] ?? 0), 0);
        if (totalReturned < excessCount) {
          player.affinities[color] -= 2; state.affinityWell[color] += 2;
          return { success: false, error: `Must return ${excessCount} Affinity to stay within the 10-Affinity limit` };
        }
        for (const c of returnColorsWithSingularity) {
          const count = returnMap[c] ?? 0;
          if ((player.affinities[c] ?? 0) < count) {
            player.affinities[color] -= 2; state.affinityWell[color] += 2;
            return { success: false, error: `Cannot return ${AFFINITY_LABEL[c as StandardAffinityKey] ?? "Singularity"} you do not hold` };
          }
        }
        for (const c of returnColorsWithSingularity) {
          const count = returnMap[c] ?? 0;
          player.affinities[c] -= count;
          state.affinityWell[c] += count;
        }
      }
      checkLuminaries(state, player);
      break;
    }

    case "reserve_artifact": {
      if (isForgottenHourBlockingPlayer(state, playerId))
        return { success: false, error: ERR_CANNOT_ENCRYPT_DURING_FORGOTTEN_HOUR };
      if (ordinaryEncryptedCount(player) >= 3)
        return { success: false, error: "Cannot reserve more than 3 Artifacts" };
      if (!action.cardId && !action.tier)
        return { success: false, error: "cardId or tier required" };

      if (action.cardId && (state.burnPile ?? []).includes(action.cardId))
        return { success: false, error: "Artifact has been burned" };

      // ── Hand-limit pre-check (must happen before any state mutation) ──────────
      // Reserving awards 1 Singularity from the Well. If the player already holds
      // 10 Affinities and the Singularity supply is non-empty, that would make 11.
      // In that case, require a returnAffinities payload specifying exactly 1
      // Affinity to return. Validate before touching any state.
      const _totalHeldBeforeSingularity =
        STANDARD_AFFINITY_KEYS.reduce((s, c) => s + player.affinities[c], 0) + player.affinities.singularity;
      const _singularityWouldOverflow = state.affinityWell.singularity > 0 && _totalHeldBeforeSingularity >= 10;
      if (_singularityWouldOverflow) {
        const _returnMap = action.returnAffinities ?? {};
        const _returnColorsWF = (Object.keys(_returnMap) as AffinityKey[]).filter(
          (c) => (_returnMap[c] ?? 0) > 0,
        );
        const _totalReturned = _returnColorsWF.reduce((s, c) => s + (_returnMap[c] ?? 0), 0);
        if (_totalReturned < 1) {
          return { success: false, error: "Return one Affinity to reserve this Artifact (limit 10)" };
        }
        for (const c of _returnColorsWF) {
          if ((player.affinities[c] ?? 0) < (_returnMap[c] ?? 0)) {
            return {
              success: false,
              error: `Cannot return ${AFFINITY_LABEL[c as StandardAffinityKey] ?? "Singularity"} you do not hold`,
            };
          }
        }
      }

      // Award a Singularity Affinity after applying any validated return.
      const _awardSingularity = () => {
        if (state.affinityWell.singularity <= 0) return;
        if (_singularityWouldOverflow) {
          const returnMap = action.returnAffinities!;
          for (const c of (Object.keys(returnMap) as AffinityKey[]).filter(
            (k) => (returnMap[k] ?? 0) > 0,
          )) {
            player.affinities[c] -= returnMap[c]!;
            state.affinityWell[c] += returnMap[c]!;
          }
        }
        player.affinities.singularity++;
        state.affinityWell.singularity--;
      };

      // Blind reserve from deck (no cardId; tier specified)
      if (!action.cardId) {
        const tier = action.tier as 1 | 2 | 3;
        if (![1, 2, 3].includes(tier))
          return { success: false, error: "Invalid tier" };
        const deck = getDeckForTier(state, tier);
        if (deck.length === 0)
          return { success: false, error: "Archive is empty" };
        if (tier === 2) clearAscensionRegistryDeferrals(state, playerId);
        const blindId = deck.shift()!;
        player.reservedArtifactIds.push(blindId);
        if (!player.privateReservedArtifactIds) player.privateReservedArtifactIds = [];
        player.privateReservedArtifactIds.push(blindId);
        _awardSingularity();
        break;
      }

      const card = CARD_MAP.get(action.cardId);
      if (!card) return { success: false, error: "Artifact not found" };

      const forgeRow = getForgeRowForTier(state, card.tier as 1 | 2 | 3);
      if (!forgeRow.includes(action.cardId))
        return { success: false, error: ERR_ARTIFACT_NOT_IN_FORGE };
      if (markerHasBrand(state.artifactMarkers?.[action.cardId], "nullified")) {
        return { success: false, error: ERR_CANNOT_ENCRYPT_NULLIFIED };
      }

      if (card.tier === 2) clearAscensionRegistryDeferrals(state, playerId);

      const antimatterResult = resolveAntimatterClaim(
        state,
        player,
        action.cardId,
        _isAutoExec,
        "encrypted",
      );
      if (antimatterResult === "detonated") {
        actionSummaryOverride = `triggered an Antimatter charge while Encrypting ${getCardLore(action.cardId).name}; action consumed`;
        break;
      }

      // Reserve from the Forge. Save the marker before the slot is refilled so
      // it follows the Artifact into the reserved pile.
      const reserveMarker = (state.artifactMarkers ?? {})[action.cardId];
      player.reservedArtifactIds.push(action.cardId);
      refillForgeSlot(state, forgeRow, getDeckForTier(state, card.tier as 1 | 2 | 3), action.cardId);
      if (reserveMarker) {
        const retainedMarker = buildArtifactMarker(getArtifactBrands(reserveMarker));
        if (retainedMarker) {
          if (!state.artifactMarkers) state.artifactMarkers = {};
          state.artifactMarkers[action.cardId] = retainedMarker;
        }
      }
      _awardSingularity();
      break;
    }

    case "forge_artifact": {
      if (!action.cardId) return { success: false, error: "cardId required" };
      const card = CARD_MAP.get(action.cardId);
      if (!card) return { success: false, error: "Artifact not found" };

      const foundryValidationError = validateFoundryClaim(player, action, card);
      if (foundryValidationError) return { success: false, error: foundryValidationError };
      const isFoundryRecovery = action.blueprintAction === "foundry_recovery";

      if ((state.burnPile ?? []).includes(action.cardId))
        return { success: false, error: "Artifact has been burned" };

      const forgeRow = getForgeRowForTier(state, card.tier as 1 | 2 | 3);
      const forgeSlotIndex = forgeRow.indexOf(action.cardId);
      const archive = getDeckForTier(state, card.tier as 1 | 2 | 3);
      const isTideArchiveForge =
        forgeSlotIndex === -1 &&
        player.tideArchiveForgeAvailable === true &&
        player.luminaries.includes("lum_tide") &&
        archive[0] === action.cardId;
      if (action.blueprintAction && isTideArchiveForge) {
        return { success: false, error: "Foundry Forge requires a face-up Tier II Artifact" };
      }
      if (forgeSlotIndex === -1 && !isTideArchiveForge && !isFoundryRecovery)
        return { success: false, error: ERR_ARTIFACT_NOT_IN_FORGE };
      if (
        action.blueprintAction &&
        !isFoundryRecovery &&
        forgeSlotIndex === -1
      ) {
        return { success: false, error: "Foundry Forge requires a face-up Tier II Artifact" };
      }
      const liveAffinityBonuses = effectiveAffinityBonuses(state, player);
      const baseCost = effectiveCost(card, player, liveAffinityBonuses);
      const eff = isFoundryRecovery
        ? zeroAffinities()
        : action.blueprintAction
          ? applyFoundryForgeCost(card, baseCost)
          : baseCost;
      if (!canAfford(eff, player.affinities))
        return { success: false, error: "Cannot afford this Artifact" };
      if (card.tier === 2) clearAscensionRegistryDeferrals(state, playerId);
      const antimatterResult = isFoundryRecovery
        ? "none"
        : resolveAntimatterClaim(
            state,
            player,
            action.cardId,
            _isAutoExec,
            "forged",
          );
      if (antimatterResult === "detonated") {
        actionSummaryOverride = `triggered an Antimatter charge while Forging ${getCardLore(action.cardId).name}; action consumed`;
        break;
      }
      const kardashevBefore = computeKardashevTier(player.forgedArtifactIds, player.discountedForgeIds);

      // Read the marker before refillForgeSlot removes it.
      const forgeMarker = (state.artifactMarkers ?? {})[action.cardId];
      const nullifiedExempt = resolveNullifiedForge(state, playerId, action.cardId, forgeMarker);
      const markerSuppressesEminence = markerSuppressesForgeValue(forgeMarker, nullifiedExempt);

      payForgeCost(
        card,
        player,
        state.affinityWell,
        liveAffinityBonuses,
        eff,
      );
      player.forgedArtifactIds.push(action.cardId);
      recordArtifactImplementation(player, action.cardId, state.turnCount);
      const isZeroCostForge = Object.values(eff).every((v) => v === 0);
      if (isZeroCostForge) {
        player.discountedForgeIds.push(action.cardId);
      }
      if (!player.forgedArtifactBonusSnapshots) player.forgedArtifactBonusSnapshots = {};
      player.forgedArtifactBonusSnapshots[action.cardId] = { ...liveAffinityBonuses };
      markBlueprintBlockedByBrand(player, action.cardId, forgeMarker, nullifiedExempt);
      player.bonuses[card.bonusAffinity]++;
      completeFoundryClaim(state, player, action);

      const seedAlly = applyAvatarSeedImbuement(
        state,
        card,
        forgeMarker,
        playerId,
        forgeSlotIndex >= 0 ? `${card.tier}-${forgeSlotIndex}` : undefined,
      );

      // Marked cards grant 0 Eminence; unmarked/avatar-seeded grant normal printed value.
      player.eminence += markerSuppressesEminence ? 0 : card.eminence;

      // The Glass Orchard — Perfect Replication: first forge with Verdance or Radiance cost.
      if (
        !markerSuppressesEminence &&
        !state.glassOrchardTriggered &&
        player.luminaries.includes("lum_orchard") &&
        (card.cost.verdance > 0 || card.cost.radiance > 0)
      ) {
        player.bonuses[card.bonusAffinity]++;
        state.glassOrchardTriggered = true;
        pushLog(state, {
          playerId: player.playerId, playerName: player.playerName,
          summary: `The Glass Orchard — Perfect Replication: +1 extra ${AFFINITY_LABEL[card.bonusAffinity]} bonus`,
          turn: state.roundNumber,
        });
        pushActivationEvent(state, "lum_orchard", "action", player.playerId, [card.id], {
          affinityType: card.bonusAffinity,
          affinityAmount: 1,
        });
      }

      if (isFoundryRecovery) {
        const storedIndex = player.reservedArtifactIds.indexOf(action.cardId);
        if (storedIndex !== -1) player.reservedArtifactIds.splice(storedIndex, 1);
        if (player.privateReservedArtifactIds) {
          player.privateReservedArtifactIds = player.privateReservedArtifactIds
            .filter((id) => id !== action.cardId);
        }
        if (state.artifactMarkers) delete state.artifactMarkers[action.cardId];
      } else if (isTideArchiveForge) {
        archive.shift();
        if (state.artifactMarkers) delete state.artifactMarkers[action.cardId];
        player.tideArchiveForgeAvailable = false;
      } else {
        refillForgeSlot(state, forgeRow, archive, action.cardId);
      }
      checkBlueprintManifestations(state, player);
      checkLuminaries(state, player);
      if (seedAlly && seedAlly.playerId !== player.playerId) checkLuminaries(state, seedAlly);
      checkKardashevAdvance(state, player, kardashevBefore, isZeroCostForge, card.tier);
      break;
    }

    case "forge_reserved_artifact": {
      if (!action.cardId) return { success: false, error: "cardId required" };
      const idx = player.reservedArtifactIds.indexOf(action.cardId);
      if (idx === -1)
        return { success: false, error: "Artifact not in your reserve" };
      const card = CARD_MAP.get(action.cardId);
      if (!card) return { success: false, error: "Artifact not found" };
      const isFoundryStored = foundryStoredArtifactIds(player).includes(action.cardId);
      const foundry = getManifestedDevice(player, "bp_mantle_to_orbit_foundry");
      if (isFoundryStored && foundry?.state === "recovering") {
        return {
          success: false,
          error: "Use free Foundry recovery while the Broken Covenant recovery is active",
        };
      }
      const liveBonusesReserved = effectiveAffinityBonuses(state, player);
      const eff = effectiveCost(card, player, liveBonusesReserved);
      if (!canAfford(eff, player.affinities))
        return { success: false, error: "Cannot afford this Artifact" };
      const kardashevBeforeReserved = computeKardashevTier(player.forgedArtifactIds, player.discountedForgeIds);

      const reservedMarker = (state.artifactMarkers ?? {})[action.cardId];
      const reservedNullifiedExempt = resolveNullifiedForge(state, playerId, action.cardId, reservedMarker);
      const reservedMarkerSuppressesEminence = markerSuppressesForgeValue(
        reservedMarker,
        reservedNullifiedExempt,
      );
      // Clean up any marker (Forgotten/Condemned/Nullified/AvatarSeed) now that the card is forged.
      if (state.artifactMarkers) delete state.artifactMarkers[action.cardId];

      payForgeCost(
        card,
        player,
        state.affinityWell,
        liveBonusesReserved,
        eff,
      );
      player.reservedArtifactIds.splice(idx, 1);
      if (player.privateReservedArtifactIds) {
        const privateIdx = player.privateReservedArtifactIds.indexOf(action.cardId);
        if (privateIdx !== -1) player.privateReservedArtifactIds.splice(privateIdx, 1);
      }
      if (isFoundryStored) {
        const foundryPrivateState = findPrivateBlueprintState(
          player,
          "bp_mantle_to_orbit_foundry",
        );
        if (foundryPrivateState) {
          removeArtifactFromFoundryStorage(foundryPrivateState, action.cardId);
        }
      }
      player.forgedArtifactIds.push(action.cardId);
      recordArtifactImplementation(player, action.cardId, state.turnCount);
      const isDiscountReserved = Object.values(eff).every((v) => v === 0);
      if (isDiscountReserved) {
        player.discountedForgeIds.push(action.cardId);
      }
      if (!player.forgedArtifactBonusSnapshots) player.forgedArtifactBonusSnapshots = {};
      player.forgedArtifactBonusSnapshots[action.cardId] = { ...liveBonusesReserved };
      markBlueprintBlockedByBrand(player, action.cardId, reservedMarker, reservedNullifiedExempt);
      player.bonuses[card.bonusAffinity]++;
      const reservedSeedAlly = applyAvatarSeedImbuement(
        state,
        card,
        reservedMarker,
        playerId,
      );
      player.eminence += reservedMarkerSuppressesEminence ? 0 : card.eminence;

      // The Glass Orchard — Perfect Replication (reserved forge path).
      if (
        !reservedMarkerSuppressesEminence &&
        !state.glassOrchardTriggered &&
        player.luminaries.includes("lum_orchard") &&
        (card.cost.verdance > 0 || card.cost.radiance > 0)
      ) {
        player.bonuses[card.bonusAffinity]++;
        state.glassOrchardTriggered = true;
        pushLog(state, {
          playerId: player.playerId, playerName: player.playerName,
          summary: `The Glass Orchard — Perfect Replication: +1 extra ${AFFINITY_LABEL[card.bonusAffinity]} bonus`,
          turn: state.roundNumber,
        });
        pushActivationEvent(state, "lum_orchard", "action", player.playerId, [card.id], {
          affinityType: card.bonusAffinity,
          affinityAmount: 1,
        });
      }

      checkBlueprintManifestations(state, player);
      checkLuminaries(state, player);
      if (reservedSeedAlly && reservedSeedAlly.playerId !== player.playerId) {
        checkLuminaries(state, reservedSeedAlly);
      }
      checkKardashevAdvance(state, player, kardashevBeforeReserved, isDiscountReserved, card.tier);
      break;
    }

    case "assimilate": {
      // Final Hunger — Assimilation: one-time replacement for a Forge action.
      if (!state.firstHungerAvailable || state.firstHungerAvailable !== playerId) {
        return { success: false, error: "Assimilation is not available" };
      }
      if (!action.cardId) return { success: false, error: "cardId required" };
      const assimCard = CARD_MAP.get(action.cardId);
      if (!assimCard) return { success: false, error: "Artifact not found" };
      const assimilationForgeRow = getForgeRowForTier(state, assimCard.tier as 1 | 2 | 3);
      if (!assimilationForgeRow.includes(action.cardId))
        return { success: false, error: ERR_ARTIFACT_NOT_IN_FORGE };

      if (!Array.isArray(player.assimilatedArtifactIds)) player.assimilatedArtifactIds = [];
      player.assimilatedArtifactIds.push(action.cardId);
      player.bonuses[assimCard.bonusAffinity] =
        (player.bonuses[assimCard.bonusAffinity] ?? 0) + 1;
      refillForgeSlot(
        state,
        assimilationForgeRow,
        getDeckForTier(state, assimCard.tier as 1 | 2 | 3),
        action.cardId,
      );

      // Assimilation is consumed.
      state.firstHungerAvailable = null;

      const assimLore = getCardLore(action.cardId);
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `The Final Hunger Assimilated ${assimLore.name}: +1 ${AFFINITY_LABEL[assimCard.bonusAffinity]} permanent Affinity, 0 Eminence.`,
        turn: state.roundNumber,
      });
      pushActivationEvent(
        state,
        "lum_hunger",
        "action",
        player.playerId,
        [action.cardId],
        { affinityType: assimCard.bonusAffinity, affinityAmount: 1 },
      );
      checkBlueprintManifestations(state, player);
      break;
    }

    case "pass": {
      // No effect; just advances turn. Used for timer expiry.
      break;
    }

    case "surrender": {
      if (state.traceScenario?.guidanceMethod === null) {
        return { success: false, error: 'Resolve Crownfall before conceding this history' };
      }
      if (state.recurrenceScenario?.custodyMethod === null) {
        return { success: false, error: 'Resolve custody of the Deep Index before conceding this history' };
      }
      if (state.triangulationScenario?.coordinationArchitecture === null) {
        return { success: false, error: 'Resolve the Alignment before conceding this history' };
      }
      // Player surrenders; end the game with them as last place
      state.phase = "finished";
      state.finishReason = "surrender";
      // Clear any win-trigger from a mid-game Luminary summon — the fanfare
      // for a surrender should not use a stale Luminary color.
      state.winTriggerLuminaryId = null;
      // Set the winner to the remaining player with the highest Eminence.
      const others = state.players.filter((p) => p.playerId !== playerId);
      state.winnerId = selectWinnerId(others);
      finalizeTraceScenarioOutcome(state);
      finalizeRecurrenceScenarioOutcome(state);
      finalizeTriangulationScenarioOutcome(state);
      break;
    }

    case "resolve_chronicle_choice": {
      if (state.triangulationScenario) {
        if (!isTriangulationCoordinationArchitecture(action.triangulationCoordinationArchitecture)) {
          return { success: false, error: 'A valid Alignment architecture is required' };
        }
        const result = resolveTriangulationAlignment(
          state,
          playerId,
          action.triangulationCoordinationArchitecture,
        );
        if (!result.success) return { success: false, error: result.error };
        if (!result.changed) return { success: true };
        state.lastAction = {
          type: 'resolve_chronicle_choice',
          playerId,
          triangulationCoordinationArchitecture: action.triangulationCoordinationArchitecture,
        };
        pushLog(state, {
          playerId,
          playerName: player.playerName,
          summary: 'established the Three-Bearing Alignment',
          turn: state.roundNumber,
        });
        continuePendingTurnTransition(state);
        state.version++;
        return { success: true };
      }
      if (state.recurrenceScenario) {
        if (!isRecurrenceCustodyMethod(action.recurrenceCustodyMethod)) {
          return { success: false, error: 'A valid Deep Index custody method is required' };
        }
        const result = resolveRecurrenceCustody(state, playerId, action.recurrenceCustodyMethod);
        if (!result.success) return { success: false, error: result.error };
        if (!result.changed) return { success: true };
        state.lastAction = {
          type: 'resolve_chronicle_choice',
          playerId,
          recurrenceCustodyMethod: action.recurrenceCustodyMethod,
        };
        pushLog(state, {
          playerId,
          playerName: player.playerName,
          summary: 'set custody of the Deep Index',
          turn: state.roundNumber,
        });
        continuePendingTurnTransition(state);
        state.version++;
        return { success: true };
      }
      if (!isTraceGuidanceMethod(action.traceGuidanceMethod)) {
        return { success: false, error: 'A valid Crownfall guidance method is required' };
      }
      const result = resolveTraceGuidance(state, playerId, action.traceGuidanceMethod);
      if (!result.success) return { success: false, error: result.error };
      if (!result.changed) return { success: true };
      state.lastAction = {
        type: 'resolve_chronicle_choice',
        playerId,
        traceGuidanceMethod: action.traceGuidanceMethod,
      };
      pushLog(state, {
        playerId,
        playerName: player.playerName,
        summary: 'set the Crownfall guidance posture',
        turn: state.roundNumber,
      });
      continuePendingTurnTransition(state);
      state.version++;
      return { success: true };
    }

    case "resolve_summon": {
      // Non-turn-gated: any player can acknowledge the cutscene is done.
      // Removes the matching pending event; if nothing changed, returns a no-op
      // so the caller avoids a redundant broadcast.
      const { eventId } = action;
      if (!Array.isArray(state.pendingSummonEvents)) {
        state.pendingSummonEvents = [];
      }
      const lenBefore = state.pendingSummonEvents.length;
      state.pendingSummonEvents = state.pendingSummonEvents.filter(
        (e) => e.eventId !== eventId,
      );
      if (state.pendingSummonEvents.length === lenBefore) {
        // Already resolved by another client — no-op, skip version bump.
        return { success: true };
      }
      // Stamp lastAction so the broadcast does not carry a stale real-action
      // type from the turn that triggered the summon cutscene.
      state.lastAction = { type: "resolve_summon", playerId, eventId };
      advanceDevLuminarySequenceStage(state);
      continuePendingTurnTransition(state);
      state.version++;

      return { success: true };
    }

    case "resolve_luminary_activation": {
      // Non-turn-gated: any client can acknowledge the complete activation
      // presentation. Removes the matching event and resumes the staged pipeline.
      const { eventId } = action;
      if (!Array.isArray(state.pendingLuminaryActivationEvents)) {
        state.pendingLuminaryActivationEvents = [];
      }
      const resolvedActivation = state.pendingLuminaryActivationEvents.find(
        (event) => event.eventId === eventId,
      );
      const lenBefore = state.pendingLuminaryActivationEvents.length;
      state.pendingLuminaryActivationEvents = state.pendingLuminaryActivationEvents.filter(
        (e) => e.eventId !== eventId,
      );
      if (state.pendingLuminaryActivationEvents.length === lenBefore) {
        // Already resolved by another client — no-op.
        return { success: true };
      }
      state.lastAction = { type: "resolve_luminary_activation", playerId, eventId };
      if (
        resolvedActivation?.luminaryId === "lum_hunger" &&
        resolvedActivation.effectType === "action"
      ) {
        const owner = state.players.find(
          (candidate) => candidate.playerId === resolvedActivation.triggeringPlayerId,
        );
        if (owner) checkLuminaries(state, owner);
      }
      advanceDevLuminarySequenceStage(state);
      continuePendingTurnTransition(state);
      state.version++;
      return { success: true };
    }

    case "resolve_blueprint_manifestation": {
      const { eventId } = action;
      const before = state.pendingBlueprintManifestationEvents.length;
      state.pendingBlueprintManifestationEvents = state.pendingBlueprintManifestationEvents.filter(
        (event) => event.eventId !== eventId,
      );
      if (state.pendingBlueprintManifestationEvents.length === before) {
        return { success: true };
      }
      state.lastAction = { type: "resolve_blueprint_manifestation", playerId, eventId };
      continuePendingTurnTransition(state);
      state.version++;
      return { success: true };
    }

    case "resolve_blueprint_detonation": {
      const { eventId } = action;
      const before = state.pendingBlueprintDetonationEvents.length;
      state.pendingBlueprintDetonationEvents = state.pendingBlueprintDetonationEvents.filter(
        (event) => event.eventId !== eventId,
      );
      if (state.pendingBlueprintDetonationEvents.length === before) {
        return { success: true };
      }
      state.lastAction = { type: "resolve_blueprint_detonation", playerId, eventId };
      continuePendingTurnTransition(state);
      state.version++;
      return { success: true };
    }

    case "choose_luminary_order": {
      // Turn-gated action sent by the current player to resolve a pending
      // simultaneous multi-Luminary claim.  orderedIds must be a permutation
      // of pendingLuminaryChoice.candidates.
      if (!state.pendingLuminaryChoice) {
        return { success: false, error: "No pending Luminary choice" };
      }
      if (state.pendingLuminaryChoice.playerId !== playerId) {
        return { success: false, error: "This choice belongs to another player" };
      }
      const { orderedIds } = action;
      if (!orderedIds || !Array.isArray(orderedIds)) {
        return { success: false, error: "orderedIds required" };
      }
      const candidates = state.pendingLuminaryChoice.candidates;
      if (orderedIds.length !== candidates.length) {
        return { success: false, error: "orderedIds must list all candidates exactly once" };
      }
      for (const id of orderedIds) {
        if (!candidates.includes(id)) {
          return { success: false, error: `Unknown candidate: ${id}` };
        }
      }
      // Clear the gate before applying so any re-entry from cascade does not
      // see a stale pendingLuminaryChoice.
      state.pendingLuminaryChoice = null;
      applyLuminaryBatch(state, player, orderedIds, 0);
      // Fall through to the tail code — it stamps the action and starts the
      // staged transition, which pauses on the newly queued summon events.
      break;
    }

    case "plan_action": {
      // Non-turn-gated: any player may submit a planned action for their
      // upcoming turn.  Validate legality first via a dry-run clone.
      const inner = action.plannedActionData;
      if (!inner) return { success: false, error: "No plannedActionData provided" };
      settlePreManifestAction(state, playerId);
      const disallowed: ActionType[] = [
        "plan_action",
        "cancel_plan",
        "resolve_summon",
        "resolve_luminary_activation",
        "resolve_blueprint_manifestation",
        "resolve_blueprint_detonation",
        "surrender",
        "pass",
      ];
      if (disallowed.includes(inner.type)) {
        return { success: false, error: `Cannot plan a '${inner.type}' action` };
      }
      const validation = validatePlannedAction(state, playerId, inner);
      if (!validation.ok) {
        return { success: false, error: validation.error ?? "Planned action is not currently legal" };
      }
      player.plannedAction = inner;
      player.plannedActionCancelReason = null;
      // Stamp lastAction so the broadcast does not carry a stale real-action type,
      // which would confuse client-side animation-queue dedup guards (same rationale
      // as cancel_plan below).  Without this, plan_action state updates keep the
      // previous real action (e.g. harness_three_affinities / forge_artifact) and the client's
      // version-sensitive dedup keys produce a fresh key on each version bump, causing
      // burst animations to re-fire even though no new game action occurred.
      state.lastAction = { type: "plan_action", playerId };
      state.version++;

      return { success: true };
    }

    case "execute_plan": {
      const planned = player.plannedAction;
      if (!planned) {
        return { success: false, error: "No planned action to execute" };
      }
      player.plannedAction = null;
      player.plannedActionCancelReason = null;
      const plannedResult = applyAction(state, playerId, planned, true);
      if (!plannedResult.success) {
        recordFailedPlannedAction(
          state,
          player,
          planned,
          plannedResult.error ?? "Planned move is no longer legal.",
        );
        return { success: true };
      }
      return plannedResult;
    }

    case "cancel_plan": {
      // Non-turn-gated: cancel any standing planned action.
      player.plannedAction = null;
      player.plannedActionCancelReason = null;
      settlePreManifestAction(state, playerId);
      // Stamp lastAction so the broadcast does not carry a stale Forge action
      // type, which would confuse animation-queue gating on the client.
      state.lastAction = { type: "cancel_plan", playerId };
      state.version++;
      return { success: true };
    }

    case "tutorial_fast_forward": {
      // Non-turn-gated tutorial action. Sets up a scripted endgame state where
      // the player is one Verdance Artifact away from summoning lum_verdant and
      // winning. Uses specific card IDs to guarantee a deterministic scenario.
      const ENDGAME_FORGED = [
        "t2e01", "t2e02", "t2e03", "t2e04", "t2e06", // 5 Verdance bonuses, 8 Eminence
        "t2r01", "t2r02", "t2r03",                    // 3 Flare bonuses, 5 Eminence
        "t3s01", "t3p01",                              // 1 Continuum, 1 Radiance, 6 Eminence
      ];                                                 // total: 19 Eminence, 5 Verdance bonuses
      const ENDGAME_RESERVED = ["t1e07"]; // verdance, cost abyss=2 radiance=1
      const allEndgameCards = [...ENDGAME_FORGED, ...ENDGAME_RESERVED];

      // Remove scripted Artifacts from the Forge and deck pools.
      for (const arr of [
        state.forgeTier1, state.forgeTier2, state.forgeTier3,
        state.deckTier1,   state.deckTier2,   state.deckTier3,
      ]) {
        for (const id of allEndgameCards) {
          const idx = arr.indexOf(id);
          if (idx >= 0) arr.splice(idx, 1);
        }
      }

      // Refill Forge rows to four face-up Artifacts from the remaining decks.
      while (state.forgeTier1.length < 4 && state.deckTier1.length > 0) {
        state.forgeTier1.push(state.deckTier1.shift()!);
      }
      while (state.forgeTier2.length < 4 && state.deckTier2.length > 0) {
        state.forgeTier2.push(state.deckTier2.shift()!);
      }
      while (state.forgeTier3.length < 4 && state.deckTier3.length > 0) {
        state.forgeTier3.push(state.deckTier3.shift()!);
      }

      // Ensure lum_verdant is an active Luminary for this game
      if (!state.activeLuminaries.includes("lum_verdant")) {
        state.activeLuminaries.push("lum_verdant");
      }

      // Set up the player's endgame state
      player.forgedArtifactIds = [...ENDGAME_FORGED];
      player.artifactForgeCounts = usageCountsFromIds(ENDGAME_FORGED);
      player.civilization = normalizeCivilizationState({
        civilization: emptyCivilizationState(),
        forgedArtifactIds: player.forgedArtifactIds,
        artifactForgeCounts: player.artifactForgeCounts,
      });
      player.assimilatedArtifactIds = [];
      player.reservedArtifactIds  = [...ENDGAME_RESERVED];
      player.privateReservedArtifactIds = [];
      player.affinities  = { flare: 0, continuum: 0, verdance: 0, abyss: 3, radiance: 2, singularity: 0 };
      player.bonuses   = { flare: 3, continuum: 1, verdance: 5, abyss: 0, radiance: 1, singularity: 0 };
      player.eminence    = DEFAULT_VICTORY_REQUIREMENT - 1;
      player.luminaries = [];
      // Clear any luminaryAffinities entries owned by this player so that a
      // subsequent Luminary summon starts with a fresh summonedAtTurnCount.
      // Without this, stale entries from a previous summon satisfy timing checks
      // immediately and cause effects (e.g. Cinder Mandate burn) to fire on the
      // wrong turn.
      state.luminaryAffinities = state.luminaryAffinities.filter(
        (x) => x.ownerId !== player.playerId,
      );
      if (state.voidSealOwnerId === player.playerId) state.voidSealOwnerId = null;
      // Clear any Forge markers (condemned, forgotten, nullified) owned by
      // this player so the board is clean for the next test.
      if (state.artifactMarkers) {
        for (const id of Object.keys(state.artifactMarkers)) {
          removeArtifactBrands(state, id, (brand) => brand.ownerId === player.playerId);
        }
      }
      player.plannedAction = null;
      player.plannedActionCancelReason = null;

      // Ensure it is the player's turn
      state.currentPlayerIndex = playerIdx;

      // Advance turnCount so living Luminary bonuses are not artificially blocked
      if (state.turnCount < 20) state.turnCount = 20;
      if (state.roundNumber < 5) state.roundNumber = 5;

      // Clear any pending summon events
      state.pendingSummonEvents = [];

      state.lastAction = { type: "tutorial_fast_forward", playerId };
      state.version++;
      return { success: true };
    }

    default:
      return { success: false, error: "Unknown action type" };
  }

  const { type: _t, ...restAction } = action;
  state.lastAction = { type: action.type, playerId, ...restAction };
  pushLog(state, {
    playerId,
    playerName: player.playerName,
    summary: actionSummaryOverride ?? describeAction(action, player),
    turn: state.roundNumber,
  });
  // Mark the core action slot as consumed until the full resolution pipeline
  // releases the incoming player.
  if (CORE_ACTIONS.has(action.type)) {
    state.coreActionUsed = true;
  }
  updateTraceProgressAfterAction(state, player, action);
  updateRecurrenceProgressAfterAction(state, player, action);
  updateTriangulationProgressAfterAction(state, player, action);
  if (_isAutoExec) settlePreManifestAction(state, playerId);
  state.version++;
  
  // Begin the durable resolution pipeline. It advances synchronously when no
  // Luminary work exists and otherwise persists its exact stage in game state.
  if (state.phase !== "finished" && !state.pendingLuminaryChoice) {
    beginTurnTransition(state);
  }

  return { success: true };
}

// ─── Human-readable action summary ────────────────────────────────────────────

function describeAction(action: ActionPayload, _player: PlayerGameState): string {
  switch (action.type) {
    case "harness_three_affinities": {
      const sel = action.affinities ?? {};
      const parts = STANDARD_AFFINITY_KEYS
        .filter((c) => (sel[c] ?? 0) > 0)
        .map((c) => `${sel[c]} ${AFFINITY_LABEL[c]}`);
      const base = parts.length === 0
        ? "Harnessed nothing"
        : `Harnessed ${parts.join(", ")}`;
      const ret = action.returnAffinities;
      if (ret) {
        const retParts = (Object.keys(ret) as AffinityKey[])
          .filter((c) => (ret[c] ?? 0) > 0)
          .map((c) => `${ret[c]} ${AFFINITY_LABEL[c as StandardAffinityKey] ?? "Singularity"}`);
        if (retParts.length > 0) return `${base} (returned ${retParts.join(", ")})`;
      }
      return base;
    }
    case "harness_two_affinities": {
      const base = action.affinity
        ? `Harnessed 2 ${AFFINITY_LABEL[action.affinity]}`
        : "Harnessed 2 affinities";
      const ret = action.returnAffinities;
      if (ret) {
        const retParts = (Object.keys(ret) as AffinityKey[])
          .filter((c) => (ret[c] ?? 0) > 0)
          .map((c) => `${ret[c]} ${AFFINITY_LABEL[c as StandardAffinityKey] ?? "Singularity"}`);
        if (retParts.length > 0) return `${base} (returned ${retParts.join(", ")})`;
      }
      return base;
    }
    case "reserve_artifact": {
      const ret = action.returnAffinities;
      const retSuffix = ret
        ? (() => {
            const parts = (Object.keys(ret) as AffinityKey[])
              .filter((c) => (ret[c] ?? 0) > 0)
              .map((c) => `${ret[c]} ${AFFINITY_LABEL[c as StandardAffinityKey] ?? "Singularity"}`);
            return parts.length > 0 ? ` (returned ${parts.join(", ")})` : "";
          })()
        : "";
      if (action.cardId) {
        const lore = getCardLore(action.cardId);
        return `Encrypted "${lore.name}"${retSuffix}`;
      }
      return (action.tier
        ? `Encrypted a concealed Tier ${action.tier} Artifact from the Archive`
        : "Encrypted an Artifact") + retSuffix;
    }
    case "forge_artifact":
    case "forge_reserved_artifact": {
      if (action.cardId) {
        const card = CARD_MAP.get(action.cardId);
        const lore = getCardLore(action.cardId);
        const verb = action.type === "forge_reserved_artifact"
          ? "Forged reserved"
          : action.blueprintAction === "foundry_recovery"
            ? "Recovered through Mantle-to-Orbit Foundry"
          : action.blueprintAction === "foundry_overdrive"
            ? "Forged with Mantle-to-Orbit Overdrive"
          : action.blueprintAction === "foundry_sustainable"
            ? "Forged through Mantle-to-Orbit Foundry"
          : action.luminaryId === "lum_tide"
            ? "Forged from an Archive"
            : "Forged";
        const eminence = card?.eminence ?? 0;
        return `${verb} "${lore.name}"${eminence ? ` (+${eminence} Eminence)` : ""}`;
      }
      return "Forged an Artifact";
    }
    case "assimilate": {
      if (!action.cardId) return "Used Assimilation";
      const card = CARD_MAP.get(action.cardId);
      const lore = getCardLore(action.cardId);
      const bonus = card ? AFFINITY_LABEL[card.bonusAffinity] : "Affinity";
      return `Assimilated "${lore.name}" (+1 ${bonus}, 0 Eminence)`;
    }
    case "pass":
      return "Time expired — turn passed";
    case "surrender":
      return "Surrendered";
    default:
      return "Took an action";
  }
}

// ─── Forge helpers ────────────────────────────────────────────────────────────

function getForgeRowForTier(state: GameStateData, tier: 1 | 2 | 3): string[] {
  if (tier === 1) return state.forgeTier1;
  if (tier === 2) return state.forgeTier2;
  return state.forgeTier3;
}

function getDeckForTier(state: GameStateData, tier: 1 | 2 | 3): string[] {
  if (tier === 1) return state.deckTier1;
  if (tier === 2) return state.deckTier2;
  return state.deckTier3;
}

/**
 * Return every face-up Forge Artifact to its matching Archive, randomize the
 * complete tier pools, and refill each Forge row. The returned ID order mirrors
 * the board presentation (Tier III, Tier II, Tier I) so clients can map the
 * activation payload back to the twelve original slots.
 */
function resetForgeThroughArchives(state: GameStateData, sourcePlayerId: string): string[] {
  const returnedIds: string[] = [];

  for (const tier of [3, 2, 1] as const) {
    const forgeRow = getForgeRowForTier(state, tier);
    const archive = getDeckForTier(state, tier);
    const protectedSlots = new Map<number, string>();
    const returnedFromRow = forgeRow.filter((cardId, slotIndex) => {
      const protectedClaim = interceptHostilePlannedClaim(
        state,
        cardId,
        sourcePlayerId,
        "claim_cancellation",
      );
      if (protectedClaim) protectedSlots.set(slotIndex, cardId);
      return !protectedClaim;
    });
    returnedIds.push(...returnedFromRow);

    const randomizedPool = shuffle([...archive, ...returnedFromRow]);
    const nextRow = forgeRow.map((_, slotIndex) =>
      protectedSlots.get(slotIndex) ?? randomizedPool.shift()!,
    );
    const nextArchive = randomizedPool;

    forgeRow.splice(0, forgeRow.length, ...nextRow);
    archive.splice(0, archive.length, ...nextArchive);
  }

  retargetUnavailableAntimatterCharges(state);
  return returnedIds;
}

// ─── State Normalization ────────────────────────────────────────────────

/**
 * Normalise a GameStateData object loaded from the DB.
 * Handles field renames that happened during development so stale rows
 * don't silently break in-flight games.
 */
export function normalizeState(raw: unknown): GameStateData {
  const state = raw as Record<string, unknown>;
  if (typeof state.startedAt !== "number") {
    state.startedAt = 0;
  }
  if (!("openingTurnOrder" in state)) {
    state.openingTurnOrder = null;
  }
  if (Array.isArray(state.players)) {
    state.players = (state.players as Record<string, unknown>[]).map((p) => {
      // ensure luminaries array exists
      if (!Array.isArray(p.luminaries)) p = { ...p, luminaries: [] };
      if (p.luminaryArrivalSound !== "first_resonance") {
        p = { ...p, luminaryArrivalSound: "standard" };
      }
      // filter out old luminary IDs (lum01-lum05) no longer in the pantheon
      p = {
        ...p,
        luminaries: (p.luminaries as string[]).filter((id: string) =>
          LUMINARY_MAP.has(id),
        ),
      };
      // ensure Plan Move fields exist (added in Plan Move feature)
      if (!("plannedAction" in p)) p = { ...p, plannedAction: null };
      if (!("plannedActionCancelReason" in p)) p = { ...p, plannedActionCancelReason: null };
      // ensure discountedForgeIds exists (added in Kardashev bonus-discount feature)
      if (!Array.isArray(p.discountedForgeIds)) p = { ...p, discountedForgeIds: [] };
      if (!Array.isArray(p.privateReservedArtifactIds)) {
        // Older saves did not record the source of reserved Artifacts. Treat
        // them as private rather than risk exposing a blind Archive draw.
        p = {
          ...p,
          privateReservedArtifactIds: Array.isArray(p.reservedArtifactIds)
            ? [...p.reservedArtifactIds]
            : [],
        };
      }
      if (!Array.isArray(p.blueprintBlockedCardIds)) p = { ...p, blueprintBlockedCardIds: [] };
      if (!Array.isArray(p.blueprintPrivateStates)) p = { ...p, blueprintPrivateStates: [] };
      const foundryPrivateState = (p.blueprintPrivateStates as Array<Record<string, unknown>>)
        .find((entry) => entry.blueprintId === "bp_mantle_to_orbit_foundry");
      if (foundryPrivateState) {
        const legacyRecoveryIds = Array.isArray(foundryPrivateState.foundryRecoveryArtifactIds)
          ? foundryPrivateState.foundryRecoveryArtifactIds.filter(
              (artifactId): artifactId is string => typeof artifactId === "string",
            )
          : [];
        if (!Array.isArray(foundryPrivateState.foundryStoredArtifactIds)) {
          foundryPrivateState.foundryStoredArtifactIds = [...legacyRecoveryIds];
        }
        const storedIds = (foundryPrivateState.foundryStoredArtifactIds as unknown[])
          .filter((artifactId): artifactId is string => typeof artifactId === "string");
        foundryPrivateState.foundryStoredArtifactIds = [...new Set(storedIds)];
        delete foundryPrivateState.foundryRecoveryArtifactIds;
        if (storedIds.length > 0) {
          const reservedIds = Array.isArray(p.reservedArtifactIds)
            ? p.reservedArtifactIds.filter((artifactId): artifactId is string => typeof artifactId === "string")
            : [];
          p = {
            ...p,
            reservedArtifactIds: [...new Set([...reservedIds, ...storedIds])],
            privateReservedArtifactIds: (p.privateReservedArtifactIds as string[])
              .filter((artifactId) => !storedIds.includes(artifactId)),
          };
        }
      }
      if (!Array.isArray(p.manifestedBlueprintDevices)) p = { ...p, manifestedBlueprintDevices: [] };
      if (!p.blueprintPresentationVariants || typeof p.blueprintPresentationVariants !== "object" || Array.isArray(p.blueprintPresentationVariants)) {
        p = { ...p, blueprintPresentationVariants: {} };
      }
      if (!Array.isArray(p.assimilatedArtifactIds)) p = { ...p, assimilatedArtifactIds: [] };
      if (!p.artifactForgeCounts || typeof p.artifactForgeCounts !== "object" || Array.isArray(p.artifactForgeCounts)) {
        p = { ...p, artifactForgeCounts: usageCountsFromIds(p.forgedArtifactIds) };
      }
      p = {
        ...p,
        civilization: normalizeCivilizationState({
          civilization: p.civilization,
          forgedArtifactIds: p.forgedArtifactIds,
          artifactForgeCounts: p.artifactForgeCounts,
          discountedForgeIds: p.discountedForgeIds,
          manifestedBlueprintDevices: p.manifestedBlueprintDevices,
          civilizationTurnCount: typeof state.turnCount === "number" ? state.turnCount : null,
        }),
      };
      if (!p.luminaryAllianceCounts || typeof p.luminaryAllianceCounts !== "object" || Array.isArray(p.luminaryAllianceCounts)) {
        p = { ...p, luminaryAllianceCounts: usageCountsFromIds(p.luminaries) };
      }
      if (typeof p.tideArchiveForgeAvailable !== "boolean") {
        p = {
          ...p,
          // Existing games with Tide already claimed gain the redesigned use.
          tideArchiveForgeAvailable: (p.luminaries as string[]).includes("lum_tide"),
        };
      }
      // ensure forgedArtifactBonusSnapshots exists (added in bonus-snapshot feature)
      if (!p.forgedArtifactBonusSnapshots || typeof p.forgedArtifactBonusSnapshots !== 'object' || Array.isArray(p.forgedArtifactBonusSnapshots)) {
        p = { ...p, forgedArtifactBonusSnapshots: {} };
      }
      return p;
    });
  }
  // ensure turnCount exists (added in Living Luminary Affinity feature)
  if (typeof state.turnCount !== "number") {
    state.turnCount = 0;
  }
  if (state.traceScenario && typeof state.traceScenario === 'object' && !Array.isArray(state.traceScenario)) {
    const trace = state.traceScenario as unknown as Partial<TraceScenarioState>;
    if (
      trace.chronicleId === TRACE_CHRONICLE_ID &&
      trace.scenarioId === TRACE_SCENARIO_ID &&
      typeof trace.architectPlayerId === 'string' &&
      typeof trace.autonomousPlayerId === 'string'
    ) {
      state.traceScenario = {
        chronicleId: TRACE_CHRONICLE_ID,
        scenarioId: TRACE_SCENARIO_ID,
        definitionVersion: TRACE_DEFINITION_VERSION,
        runKind: trace.runKind === 'rehearsal' ? 'rehearsal' : 'primary',
        architectPlayerId: trace.architectPlayerId,
        autonomousPlayerId: trace.autonomousPlayerId,
        phase: trace.phase === 'awaiting_guidance' || trace.phase === 'guidance_resolved' ||
          trace.phase === 'finished' || trace.phase === 'setup'
          ? trace.phase
          : 'playing',
        architectCoreActionCount: Math.max(0, Math.trunc(trace.architectCoreActionCount ?? 0)),
        guidanceDueAfterCoreActions: Math.max(
          1,
          Math.trunc(trace.guidanceDueAfterCoreActions ?? TRACE_GUIDANCE_DUE_AFTER_CORE_ACTIONS),
        ),
        guidanceMethod: isTraceGuidanceMethod(trace.guidanceMethod) ? trace.guidanceMethod : null,
        guidanceResolvedAtTurnCount: typeof trace.guidanceResolvedAtTurnCount === 'number'
          ? Math.max(0, Math.trunc(trace.guidanceResolvedAtTurnCount))
          : null,
        preparednessObjectiveMet: trace.preparednessObjectiveMet === true,
        preparednessArtifactId: typeof trace.preparednessArtifactId === 'string'
          ? trace.preparednessArtifactId
          : null,
        outcomeId: typeof trace.outcomeId === 'string'
          ? trace.outcomeId as TraceScenarioState['outcomeId']
          : null,
      };
    } else {
      delete state.traceScenario;
    }
  }
  if (state.recurrenceScenario && typeof state.recurrenceScenario === 'object' && !Array.isArray(state.recurrenceScenario)) {
    const recurrence = state.recurrenceScenario as unknown as Partial<RecurrenceScenarioState>;
    if (
      recurrence.chronicleId === RECURRENCE_CHRONICLE_ID &&
      recurrence.scenarioId === RECURRENCE_SCENARIO_ID &&
      typeof recurrence.architectPlayerId === 'string' &&
      typeof recurrence.autonomousPlayerId === 'string'
    ) {
      state.recurrenceScenario = {
        chronicleId: RECURRENCE_CHRONICLE_ID,
        scenarioId: RECURRENCE_SCENARIO_ID,
        definitionVersion: RECURRENCE_DEFINITION_VERSION,
        runKind: recurrence.runKind === 'rehearsal' ? 'rehearsal' : 'primary',
        architectPlayerId: recurrence.architectPlayerId,
        autonomousPlayerId: recurrence.autonomousPlayerId,
        phase: recurrence.phase === 'awaiting_custody' || recurrence.phase === 'custody_resolved' ||
          recurrence.phase === 'finished' || recurrence.phase === 'setup'
          ? recurrence.phase
          : 'playing',
        architectCoreActionCount: Math.max(0, Math.trunc(recurrence.architectCoreActionCount ?? 0)),
        custodyDueAfterCoreActions: Math.max(
          1,
          Math.trunc(recurrence.custodyDueAfterCoreActions ?? RECURRENCE_CUSTODY_DUE_AFTER_CORE_ACTIONS),
        ),
        custodyMethod: isRecurrenceCustodyMethod(recurrence.custodyMethod)
          ? recurrence.custodyMethod
          : null,
        custodyResolvedAtTurnCount: typeof recurrence.custodyResolvedAtTurnCount === 'number'
          ? Math.max(0, Math.trunc(recurrence.custodyResolvedAtTurnCount))
          : null,
        preparednessObjectiveMet: recurrence.preparednessObjectiveMet === true,
        preparednessArtifactId: typeof recurrence.preparednessArtifactId === 'string'
          ? recurrence.preparednessArtifactId
          : null,
        outcomeId: typeof recurrence.outcomeId === 'string' &&
          (RECURRENCE_OUTCOME_IDS as readonly string[]).includes(recurrence.outcomeId)
          ? recurrence.outcomeId as RecurrenceScenarioState['outcomeId']
          : null,
      };
    } else {
      delete state.recurrenceScenario;
    }
  }
  if (state.triangulationScenario && typeof state.triangulationScenario === 'object' && !Array.isArray(state.triangulationScenario)) {
    const scenario = state.triangulationScenario as unknown as Partial<TriangulationScenarioState>;
    if (
      scenario.chronicleId === TRIANGULATION_CHRONICLE_ID &&
      scenario.scenarioId === TRIANGULATION_SCENARIO_ID &&
      typeof scenario.architectPlayerId === 'string' &&
      typeof scenario.myriaPlayerId === 'string' &&
      typeof scenario.vesperPlayerId === 'string'
    ) {
      state.triangulationScenario = {
        chronicleId: TRIANGULATION_CHRONICLE_ID,
        scenarioId: TRIANGULATION_SCENARIO_ID,
        definitionVersion: TRIANGULATION_DEFINITION_VERSION,
        runKind: scenario.runKind === 'rehearsal' ? 'rehearsal' : 'primary',
        architectPlayerId: scenario.architectPlayerId,
        myriaPlayerId: scenario.myriaPlayerId,
        vesperPlayerId: scenario.vesperPlayerId,
        phase: scenario.phase === 'awaiting_alignment' || scenario.phase === 'alignment_resolved' ||
          scenario.phase === 'finished' || scenario.phase === 'setup'
          ? scenario.phase
          : 'playing',
        architectCoreActions: Math.max(0, Math.trunc(scenario.architectCoreActions ?? 0)),
        alignmentDueAfterActions: Math.max(
          1,
          Math.trunc(scenario.alignmentDueAfterActions ?? TRIANGULATION_ALIGNMENT_DUE_AFTER_CORE_ACTIONS),
        ),
        coordinationArchitecture: isTriangulationCoordinationArchitecture(scenario.coordinationArchitecture)
          ? scenario.coordinationArchitecture
          : null,
        choiceResolvedAtTurn: typeof scenario.choiceResolvedAtTurn === 'number'
          ? Math.max(0, Math.trunc(scenario.choiceResolvedAtTurn))
          : null,
        preparednessMet: scenario.preparednessMet === true,
        preparednessCapabilityId: typeof scenario.preparednessCapabilityId === 'string' &&
          (TRIANGULATION_PREPAREDNESS_CAPABILITY_IDS as readonly string[]).includes(scenario.preparednessCapabilityId)
          ? scenario.preparednessCapabilityId as TriangulationScenarioState['preparednessCapabilityId']
          : null,
        preparednessArtifactId: typeof scenario.preparednessArtifactId === 'string'
          ? scenario.preparednessArtifactId
          : null,
        priorMemoryLines: Array.isArray(scenario.priorMemoryLines)
          ? scenario.priorMemoryLines.filter((line): line is string => typeof line === 'string').slice(0, 2)
          : [],
        referenceCivilization: isTriangulationReferenceCivilization(scenario.referenceCivilization)
          ? scenario.referenceCivilization
          : null,
        outcomeId: typeof scenario.outcomeId === 'string' &&
          (TRIANGULATION_OUTCOME_IDS as readonly string[]).includes(scenario.outcomeId)
          ? scenario.outcomeId as TriangulationScenarioState['outcomeId']
          : null,
      };
    } else {
      delete state.triangulationScenario;
    }
  }
  // ensure victoryRequirement exists (added in Oblivion-as-threshold feature)
  if (
    typeof state.victoryRequirement !== "number" ||
    state.victoryRequirement < MIN_VICTORY_REQUIREMENT
  ) {
    state.victoryRequirement = MIN_VICTORY_REQUIREMENT;
  }
  if (state.cinematicMode !== "epic") {
    state.cinematicMode = "standard";
  }
  // ensure luminaryAffinities array exists (added in Living Luminary Affinity feature)
  if (!Array.isArray(state.luminaryAffinities)) {
    state.luminaryAffinities = [];
  }
  // ensure pendingSummonEvents array exists (added in summon gate feature)
  if (!Array.isArray(state.pendingSummonEvents)) {
    state.pendingSummonEvents = [];
  } else {
    state.pendingSummonEvents = (state.pendingSummonEvents as Record<string, unknown>[]).map((event) => ({
      ...event,
      arrivalSound: event.arrivalSound === "first_resonance" ? "first_resonance" : "standard",
    }));
  }
  // ensure pendingLuminaryActivationEvents array exists (added in activation cinematic feature)
  if (!Array.isArray(state.pendingLuminaryActivationEvents)) {
    state.pendingLuminaryActivationEvents = [];
  }
  if (!Array.isArray(state.pendingBlueprintManifestationEvents)) {
    state.pendingBlueprintManifestationEvents = [];
  }
  if (!Array.isArray(state.pendingBlueprintDetonationEvents)) {
    state.pendingBlueprintDetonationEvents = [];
  }
  // Older persisted games have already advanced around any legacy pending
  // cinematic events. Never infer a transition retroactively.
  if (!("pendingTurnTransition" in state)) {
    state.pendingTurnTransition = null;
  }
  // ensure pendingLuminaryChoice exists (added in interactive claim-order feature)
  if (!("pendingLuminaryChoice" in state)) {
    state.pendingLuminaryChoice = null;
  }
  // ensure winTriggerLuminaryId exists (added in win-fanfare Luminary color feature)
  if (!("winTriggerLuminaryId" in state)) {
    state.winTriggerLuminaryId = null;
  }
  // ensure v0.8 fields exist (optional fields default to absent; guard avoids runtime errors)
  if (typeof state.artifactMarkers !== "object" || state.artifactMarkers === null || Array.isArray(state.artifactMarkers)) {
    state.artifactMarkers = {};
  }
  if (
    state.nullifiedFirstForge !== null &&
    (
      typeof state.nullifiedFirstForge !== "object" ||
      Array.isArray(state.nullifiedFirstForge) ||
      typeof (state.nullifiedFirstForge as Record<string, unknown>).cardId !== "string" ||
      typeof (state.nullifiedFirstForge as Record<string, unknown>).playerId !== "string" ||
      typeof (state.nullifiedFirstForge as Record<string, unknown>).exempt !== "boolean"
    )
  ) {
    state.nullifiedFirstForge = null;
  }
  if (typeof state.forgottenHourCycle !== "object" || state.forgottenHourCycle === null || Array.isArray(state.forgottenHourCycle)) {
    state.forgottenHourCycle = {};
  }
  const forgottenHourCycle = state.forgottenHourCycle as Record<string, ForgottenHourCycleState>;
  const forgeMarkers = state.artifactMarkers as Record<string, ArtifactMarker>;
  for (const [artifactId, marker] of Object.entries(forgeMarkers)) {
    const normalized = buildArtifactMarker(getArtifactBrands(marker));
    if (normalized) forgeMarkers[artifactId] = normalized;
    else delete forgeMarkers[artifactId];
  }
  for (const la of state.luminaryAffinities as LuminaryAffinity[]) {
    if (la.luminaryId !== "lum_compass") continue;
    if (!forgottenHourCycle[la.ownerId]) {
      const hasActiveForgottenMarker = Object.values(forgeMarkers).some(
        (marker) => markerHasBrand(marker, "forgotten", la.ownerId),
      );
      forgottenHourCycle[la.ownerId] = {
        lastAppliedTurnCount: typeof la.summonedAtTurnCount === "number" ? la.summonedAtTurnCount : 0,
        cooldownOwnerTurnsRemaining: hasActiveForgottenMarker ? null : 12,
      };
    }
  }
  if (
    typeof state.phoenixRecurrence !== "object" ||
    state.phoenixRecurrence === null ||
    Array.isArray(state.phoenixRecurrence)
  ) {
    const phoenixOwner = (state.players as PlayerGameState[] | undefined)?.find(
      (player) => player.luminaries.includes("lum_astral"),
    );
    const phoenixAffinity = (state.luminaryAffinities as LuminaryAffinity[]).find(
      (affinity) => affinity.luminaryId === "lum_astral",
    );
    // Existing games may already have Phoenix manifested. Do not retroactively
    // recover their Burn Pile; only a new manifestation schedules that one-time return.
    state.phoenixRecurrence = phoenixOwner
      ? {
          ownerId: phoenixOwner.playerId,
          summonedAtTurnCount: phoenixAffinity?.summonedAtTurnCount ?? 0,
          recoveryPending: false,
        }
      : undefined;
  }
  if (typeof state.catalystBloomBurnCount !== "number") {
    state.catalystBloomBurnCount = 0;
  }
  if (typeof state.concordanceMandalaTriggered !== "boolean") {
    state.concordanceMandalaTriggered = false;
  }
  if (typeof state.concordanceMandalaFinalTriggered !== "boolean") {
    state.concordanceMandalaFinalTriggered = false;
  }
  if (typeof state.glassOrchardTriggered !== "boolean") {
    state.glassOrchardTriggered = false;
  }
  if (!("firstHungerAvailable" in state)) {
    state.firstHungerAvailable = null;
  }
  // Retain the legacy field for save/client compatibility, but the removed
  // Void Seal mechanic must never be restored from an older game snapshot.
  state.voidSealOwnerId = null;
  // ensure burnPile and burnEvents exist (added in Burn keyword feature)
  if (!Array.isArray(state.burnPile)) {
    state.burnPile = [];
  }
  if (!Array.isArray(state.burnEvents)) {
    state.burnEvents = [];
  }
  if (!Array.isArray(state.annihilatedArtifactIds)) {
    state.annihilatedArtifactIds = [];
  }
  if (typeof state.brokenCovenantDeclared !== "boolean") {
    state.brokenCovenantDeclared = false;
  }
  if (
    state.lumiiThresholdApproach !== "kinship" &&
    state.lumiiThresholdApproach !== "inquiry" &&
    state.lumiiThresholdApproach !== "dominion"
  ) {
    state.lumiiThresholdApproach = undefined;
  }
  if (
    state.phase === "finished" &&
    state.finishReason !== "win" &&
    state.finishReason !== "surrender" &&
    state.finishReason !== "withdrawal"
  ) {
    state.finishReason = "win";
  }
  // ensure coreActionUsed exists (added in double-action exploit prevention)
  if (typeof state.coreActionUsed !== "boolean") {
    state.coreActionUsed = false;
  }
  // Migrate legacy BurnEvents (pre-enriched-payload format) to the current shape.
  // New fields default to safe values so old game records remain playable.
  state.burnEvents = (state.burnEvents as unknown[]).map((raw: unknown, i: number) => {
    const e = raw as Partial<BurnEvent> & Record<string, unknown>;
    return {
      eventId:
        typeof e.eventId === "string"
          ? e.eventId
          : `legacy-${String(e.cardId ?? i)}-${String(e.turn ?? 0)}`,
      cardId: typeof e.cardId === "string" ? e.cardId : "",
      artifactName:
        typeof e.artifactName === "string"
          ? e.artifactName
          : typeof e.cardId === "string"
          ? e.cardId
          : "",
      tier: ([1, 2, 3] as unknown[]).includes(e.tier)
        ? (e.tier as 1 | 2 | 3)
        : (1 as 1 | 2 | 3),
      sourceType: (["luminary", "action", "system"] as unknown[]).includes(e.sourceType)
        ? (e.sourceType as "luminary" | "action" | "system")
        : "luminary",
      sourceLuminaryId:
        typeof e.sourceLuminaryId === "string" ? e.sourceLuminaryId : "",
      sourceName:
        typeof e.sourceName === "string" ? e.sourceName : undefined,
      ownerPlayerId:
        typeof e.ownerPlayerId === "string" ? e.ownerPlayerId : undefined,
      triggeredByPlayerId:
        typeof e.triggeredByPlayerId === "string"
          ? e.triggeredByPlayerId
          : undefined,
      destination: e.destination === "archive" ? "archive" : "burn_pile",
      turn: typeof e.turn === "number" ? e.turn : 0,
    };
  });
  if (
    typeof state.avatarSeedState === "object" &&
    state.avatarSeedState !== null &&
    !Array.isArray(state.avatarSeedState)
  ) {
    const avatarSeedState = state.avatarSeedState as Record<string, unknown>;
    const rawSlots = Array.isArray(avatarSeedState.moldSlots)
      ? avatarSeedState.moldSlots.filter((slot): slot is string => typeof slot === "string")
      : [];
    const validByTier = new Map<number, string>();
    for (const slot of rawSlots) {
      const [tierText, slotText] = slot.split("-");
      const tier = Number(tierText);
      const slotIndex = Number(slotText);
      if (![1, 2, 3].includes(tier) || !Number.isInteger(slotIndex)) continue;
      const row = getForgeRowForTier(state as unknown as GameStateData, tier as 1 | 2 | 3);
      if (Array.isArray(row) && slotIndex >= 0 && slotIndex < row.length && !validByTier.has(tier)) {
        validByTier.set(tier, `${tier}-${slotIndex}`);
      }
    }
    const summonedAt = typeof avatarSeedState.summonedAtTurnCount === "number"
      ? avatarSeedState.summonedAtTurnCount
      : 0;
    for (const tier of [1, 2, 3] as const) {
      if (validByTier.has(tier)) continue;
      const row = getForgeRowForTier(state as unknown as GameStateData, tier);
      if (Array.isArray(row) && row.length > 0) {
        validByTier.set(tier, `${tier}-${(summonedAt + tier * 7) % row.length}`);
      }
    }
    avatarSeedState.moldSlots = [...validByTier.values()];
    delete avatarSeedState.pendingEminence;
    delete avatarSeedState.deckSeeds;
    delete avatarSeedState.payoutDone;
  }

  // migrate old action log summaries: "Glass Orchard — Perfect Replication" → "The Glass Orchard — Perfect Replication"
  if (Array.isArray(state.actionLog)) {
    state.actionLog = (state.actionLog as Record<string, unknown>[]).map((entry) => {
      if (
        typeof entry.summary === "string" &&
        entry.summary.includes("Glass Orchard — Perfect Replication") &&
        !entry.summary.includes("The Glass Orchard — Perfect Replication")
      ) {
        return {
          ...entry,
          summary: entry.summary.replace(
            "Glass Orchard — Perfect Replication",
            "The Glass Orchard — Perfect Replication",
          ),
        };
      }
      return entry;
    });
  }

  // filter activeLuminaries to only known IDs (backward compat for old saves)
  if (Array.isArray(state.activeLuminaries)) {
    const original = state.activeLuminaries as string[];
    const valid = original.filter((id) => LUMINARY_MAP.has(id));
    // If the saved game predates the redesign (all old IDs got dropped),
    // re-roll fresh Luminaries from the new pantheon so the panel isn't empty.
    if (valid.length === 0 && original.length > 0) {
      const playerCount = Array.isArray(state.players)
        ? (state.players as unknown[]).length
        : 2;
      const lumCount = Math.min(
        Math.max(playerCount + 1, original.length),
        AVAILABLE_LUMINARIES.length,
      );
      state.activeLuminaries = shuffle(AVAILABLE_LUMINARIES.map((l) => l.id)).slice(
        0,
        lumCount,
      );
    } else {
      state.activeLuminaries = valid;
    }
  }
  return state as unknown as GameStateData;
}

// ─── State to API format ──────────────────────────────────────────────────────

function withLore(card: ArtifactCard) {
  const lore = getCardLore(card.id);
  return { ...card, name: lore.name, flavor: lore.flavor };
}

export type AiDifficulty = "easy" | "medium" | "hard" | "passive";

export const zAiDifficulty = z.enum(["easy", "medium", "hard", "passive"]);

export function parseAiDifficulty(value: unknown): AiDifficulty {
  const result = zAiDifficulty.safeParse(value);
  if (!result.success) {
    throw new Error(`Invalid AI difficulty value: ${JSON.stringify(value)}`);
  }
  return result.data;
}

export function formatGameState(
  roomId: string,
  status: string,
  stateData: GameStateData,
  connectedPlayerIds: Set<string>,
  avatarMap?: Map<string, string | null>,
  aiMap?: Map<string, { isAi: boolean; aiDifficulty: AiDifficulty | null }>,
  scenarioId: string | null = null,
) {
  const forgeTier1 = stateData.forgeTier1
    .map((id) => CARD_MAP.get(id))
    .filter(Boolean)
    .map((c) => withLore(c as ArtifactCard));
  const forgeTier2 = stateData.forgeTier2
    .map((id) => CARD_MAP.get(id))
    .filter(Boolean)
    .map((c) => withLore(c as ArtifactCard));
  const forgeTier3 = stateData.forgeTier3
    .map((id) => CARD_MAP.get(id))
    .filter(Boolean)
    .map((c) => withLore(c as ArtifactCard));
  const luminaries = stateData.activeLuminaries
    .map((id) => LUMINARY_MAP.get(id))
    .filter(Boolean) as LuminaryDef[];
  const formatArchiveTop = (cardId: string | undefined): ArtifactCard | null => {
    const card = cardId ? CARD_MAP.get(cardId) : undefined;
    return card ? withLore(card) : null;
  };

  const players = stateData.players.map((p) => {
    const aiEntry = aiMap?.get(p.playerId);
    const tideArchiveTopCards = p.luminaries.includes("lum_tide")
      ? {
          tier1: formatArchiveTop(stateData.deckTier1[0]),
          tier2: formatArchiveTop(stateData.deckTier2[0]),
          tier3: formatArchiveTop(stateData.deckTier3[0]),
        }
      : undefined;
    return {
      playerId: p.playerId,
      playerName: p.playerName,
      civName: p.civName ?? null,
      avatarId: aiEntry?.isAi && aiEntry.aiDifficulty === "passive"
        ? GUIDED_LUMII_AVATAR_ID
        : avatarMap?.get(p.playerId) ?? null,
      isAi: aiEntry?.isAi ?? false,
      aiDifficulty: aiEntry?.aiDifficulty ?? null,
      affinities: p.affinities,
      bonuses: p.bonuses,
      eminence: p.eminence,
      reservedArtifacts: p.reservedArtifactIds
        .map((id) => CARD_MAP.get(id))
        .filter(Boolean)
        .map((c) => withLore(c as ArtifactCard)),
      privateReservedArtifactIds: p.privateReservedArtifactIds ?? [],
      forgedArtifactIds: p.forgedArtifactIds,
      civilization: normalizeCivilizationState({
        ...p,
        civilizationTurnCount: stateData.turnCount,
      }),
      assimilatedArtifactIds: p.assimilatedArtifactIds ?? [],
      discountedForgeIds: p.discountedForgeIds ?? [],
      forgedArtifacts: p.forgedArtifactIds
        .map((id) => CARD_MAP.get(id))
        .filter(Boolean)
        .map((c) => {
          const card = withLore(c as ArtifactCard);
          const snapshot = p.forgedArtifactBonusSnapshots?.[card.id];
          return snapshot ? { ...card, bonusesAtForge: snapshot } : card;
        }),
      isConnected: connectedPlayerIds.has(p.playerId),
      claimedLuminaryIds: p.luminaries ?? [],
      tideArchiveTopCards,
      tideArchiveForgeAvailable: p.tideArchiveForgeAvailable === true,
      plannedAction: p.plannedAction ?? null,
      plannedActionCancelReason: p.plannedActionCancelReason ?? null,
      blueprintPrivateStates: p.blueprintPrivateStates ?? [],
      manifestedBlueprintDevices: p.manifestedBlueprintDevices ?? [],
    };
  });

  return {
    roomId,
    status: stateData.phase === "finished" ? "finished" : status,
    scenarioId,
    finishReason: stateData.phase === "finished" ? stateData.finishReason ?? "win" : null,
    startedAt: stateData.startedAt ?? 0,
    openingTurnOrder: stateData.openingTurnOrder ?? null,
    canReplaySameBoard: !!stateData.initialBoard,
    currentPlayerIndex: stateData.currentPlayerIndex,
    roundNumber: stateData.roundNumber,
    turnCount: stateData.turnCount ?? 0,
    victoryRequirement: getVictoryRequirement(stateData),
    cinematicMode: stateData.cinematicMode === "epic" ? "epic" : "standard",
    affinityWell: stateData.affinityWell,
    forgeTier1: forgeTier1,
    forgeTier2: forgeTier2,
    forgeTier3: forgeTier3,
    deckCounts: {
      tier1: stateData.deckTier1.length,
      tier2: stateData.deckTier2.length,
      tier3: stateData.deckTier3.length,
    },
    luminaries,
    luminaryAffinities: stateData.luminaryAffinities ?? [],
    players,
    winnerId: stateData.winnerId,
    winTriggerLuminaryId: stateData.winTriggerLuminaryId ?? null,
    lastAction: stateData.lastAction,
    actionLog: stateData.actionLog,
    turnTimerSeconds: stateData.turnTimerSeconds,
    turnDeadline: stateData.turnDeadline,
    version: stateData.version,
    pendingSummonEvents: stateData.pendingSummonEvents ?? [],
    pendingLuminaryActivationEvents: stateData.pendingLuminaryActivationEvents ?? [],
    pendingBlueprintManifestationEvents: stateData.pendingBlueprintManifestationEvents ?? [],
    pendingBlueprintDetonationEvents: stateData.pendingBlueprintDetonationEvents ?? [],
    scenarioProtocols: [],
    pendingScenarioProtocolEvents: [],
    pendingTurnTransition: stateData.pendingTurnTransition ?? null,
    traceScenario: scenarioId === TRACE_SCENARIO_ID ? stateData.traceScenario ?? null : null,
    recurrenceScenario: scenarioId === RECURRENCE_SCENARIO_ID
      ? stateData.recurrenceScenario ?? null
      : null,
    triangulationScenario: scenarioId === TRIANGULATION_SCENARIO_ID
      ? stateData.triangulationScenario ?? null
      : null,
    devLuminarySequenceActive: stateData.devLuminarySequenceActive === true,
    pendingLuminaryChoice: stateData.pendingLuminaryChoice ?? null,
    // v0.8 marker / effect state exposed to clients
    artifactMarkers: stateData.artifactMarkers ?? {},
    nullifiedFirstForge: stateData.nullifiedFirstForge ?? null,
    forgottenHourCycle: stateData.forgottenHourCycle ?? {},
    avatarSeedMoldSlots: stateData.avatarSeedState?.moldSlots ?? [],
    avatarSeedOwnerId: stateData.avatarSeedState?.ownerId ?? null,
    firstHungerAvailable: stateData.firstHungerAvailable ?? null,
    voidSealOwnerId: null,
    catalystBloomBurnCount: stateData.catalystBloomBurnCount ?? 0,
    concordanceMandalaTriggered: stateData.concordanceMandalaTriggered ?? false,
    concordanceMandalaFinalTriggered: stateData.concordanceMandalaFinalTriggered ?? false,
    glassOrchardTriggered: stateData.glassOrchardTriggered ?? false,
    brokenCovenantDeclared: stateData.brokenCovenantDeclared === true,
    lumiiThresholdApproach: scenarioId === "blueprint_clearance_lumii"
      ? stateData.lumiiThresholdApproach ?? "inquiry"
      : null,
    burnPile: stateData.burnPile ?? [],
    burnEvents: stateData.burnEvents ?? [],
    annihilatedArtifactIds: stateData.annihilatedArtifactIds ?? [],
    coreActionUsed: stateData.coreActionUsed ?? false,
  };
}
