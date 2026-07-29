// ─── Luminae Game Engine ────────────────────────────────────────────────────
// Original tabletop engine-building game built around Affinities, Artifacts,
// the Forge, Eminence, and Luminaries.

import { z } from "zod";
import {
  compareVictoryStandings,
  KNOWN_AURA_STYLES,
  LUMINARY_IDS,
  STANDARD_AFFINITY_KEYS,
} from '@workspace/game-types';
import type {
  AffinityCounts,
  AffinityKey,
  AuraStyle,
  LuminaryId,
  StandardAffinityKey,
} from '@workspace/game-types';
import { getCardLore } from "./cardLore";

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

/** Emitted each time a Luminary's mechanical effect fires (arrival cutscene,
 *  end-of-turn hook, start-of-turn hook).  Clients consume it to trigger
 *  the 4-second activation cinematic overlay, then send
 *  resolve_luminary_activation to pop it from the queue. */
export interface PendingLuminaryActivationEvent {
  eventId: string;
  luminaryId: string;
  /** Which hook fired this event. */
  effectType: "summon" | "end_of_turn" | "start_of_turn";
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
}

const ERR_ARTIFACT_NOT_IN_FORGE = "Artifact is no longer in The Forge";
const ERR_CANNOT_ENCRYPT_DURING_FORGOTTEN_HOUR = "Cannot encrypt during The Forgotten Hour";

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
  /** Pending Eminence accumulated from opponents forging seeded Artifacts. */
  pendingEminence: number;
  /** Artifact IDs with Avatar Seed tokens still sitting at the top of their source deck. */
  deckSeeds: string[];
  /** True once the end-of-next-turn payout has fired (prevents double-pay). */
  payoutDone: boolean;
}

export interface ArtifactCard {
  id: string;
  tier: 1 | 2 | 3;
  bonusAffinity: StandardAffinityKey;
  eminence: number;
  cost: AffinityCounts;
}

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
}

export interface PlayerGameState {
  playerId: string;
  playerName: string;
  /** Custom civilization name set by the player. Falls back to "{playerName}'s Civilization" on the client when absent. */
  civName?: string;
  affinities: AffinityCounts;
  bonuses: AffinityCounts;
  eminence: number;
  reservedArtifactIds: string[];
  /** Reserved Artifact IDs drawn blind from an Archive. Never exposed to non-owners. */
  privateReservedArtifactIds?: string[];
  forgedArtifactIds: string[];
  /** Artifact IDs forged at zero Affinity cost (fully covered by bonuses). */
  discountedForgeIds: string[];
  /** Per-card bonus snapshot captured at forge time. Key = card ID. Added in bonus-snapshot feature. */
  forgedArtifactBonusSnapshots?: Record<string, AffinityCounts>;
  /** Card IDs forged while Forgotten; future Blueprint checks must ignore these cards. */
  blueprintBlockedCardIds?: string[];
  luminaries: string[];
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
  /** Player whose action caused the burn (e.g. the Assimilation actor). */
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
  includeEndOfTurnEffects: boolean;
  includeStartOfTurnEffects: boolean;
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
  finishReason?: "win" | "surrender";
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
  /** Staged turn handoff held until all Luminary resolutions are presented. */
  pendingTurnTransition?: PendingTurnTransition | null;
  /** DEV-only delayed-effect cursor advanced after all arrival effects finish. */
  devLuminarySequenceStage?: DevLuminarySequenceStage;
  /** DEV-only sequence lease held until every staged presentation is acknowledged. */
  devLuminarySequenceActive?: boolean;
  /** Card markers: Forgotten / Condemned / Nullified / Avatar Seed (v0.8+). */
  artifactMarkers?: Record<string, ArtifactMarker>;
  /** Owner-relative repeat timing for ??? / The Forgotten Hour. */
  forgottenHourCycle?: Record<string, ForgottenHourCycleState>;
  /** Delayed one-time recovery state for Phoenix Paradox / Eternal Recurrence. */
  phoenixRecurrence?: PhoenixRecurrenceState;
  /** State for Seed Beyond Seasons Avatar Seeds (v0.8+). */
  avatarSeedState?: AvatarSeedState;
  /** Count of distinct burn effects since end of Catalyst Bloom owner's last turn (v0.8+). */
  catalystBloomBurnCount?: number;
  /** True once Concordance Mandala's Perfect Coherence has fired (one per game, v0.8+). */
  concordanceMandalaTriggered?: boolean;
  /** True once Glass Orchard's Perfect Replication has fired (one per game, v0.8+). */
  glassOrchardTriggered?: boolean;
  /** PlayerId if Final Hunger Assimilation is available this turn (cleared on use or turn end, v0.8+). */
  firstHungerAvailable?: string | null;
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

function affinityCost(
  flare: number,
  continuum: number,
  verdance: number,
  abyss: number,
  radiance: number,
): AffinityCounts {
  return {
    flare: flare,
    continuum: continuum,
    verdance: verdance,
    abyss: abyss,
    radiance: radiance,
    singularity: 0,
  };
}

const CARD_CATALOG: ArtifactCard[] = [
  // ─── Tier 1 (40 cards — 8 per Affinity) ──────────────────────────────────
  // Flare bonus
  { id: "t1r01", tier: 1, bonusAffinity: "flare", eminence: 0, cost: affinityCost(0, 0, 1, 1, 1) },
  { id: "t1r02", tier: 1, bonusAffinity: "flare", eminence: 0, cost: affinityCost(0, 0, 1, 2, 0) },
  { id: "t1r03", tier: 1, bonusAffinity: "flare", eminence: 0, cost: affinityCost(0, 1, 1, 0, 1) },
  { id: "t1r04", tier: 1, bonusAffinity: "flare", eminence: 0, cost: affinityCost(0, 2, 0, 0, 0) },
  { id: "t1r05", tier: 1, bonusAffinity: "flare", eminence: 0, cost: affinityCost(0, 0, 0, 2, 2) },
  { id: "t1r06", tier: 1, bonusAffinity: "flare", eminence: 0, cost: affinityCost(0, 2, 1, 0, 0) },
  { id: "t1r07", tier: 1, bonusAffinity: "flare", eminence: 0, cost: affinityCost(0, 0, 2, 2, 0) },
  { id: "t1r08", tier: 1, bonusAffinity: "flare", eminence: 1, cost: affinityCost(0, 0, 0, 0, 4) },
  // Continuum bonus
  { id: "t1s01", tier: 1, bonusAffinity: "continuum", eminence: 0, cost: affinityCost(1, 0, 1, 0, 1) },
  { id: "t1s02", tier: 1, bonusAffinity: "continuum", eminence: 0, cost: affinityCost(2, 0, 1, 0, 0) },
  { id: "t1s03", tier: 1, bonusAffinity: "continuum", eminence: 0, cost: affinityCost(1, 0, 0, 1, 1) },
  { id: "t1s04", tier: 1, bonusAffinity: "continuum", eminence: 0, cost: affinityCost(1, 0, 0, 0, 2) },
  { id: "t1s05", tier: 1, bonusAffinity: "continuum", eminence: 0, cost: affinityCost(0, 0, 0, 2, 2) },
  { id: "t1s06", tier: 1, bonusAffinity: "continuum", eminence: 0, cost: affinityCost(1, 0, 2, 0, 0) },
  { id: "t1s07", tier: 1, bonusAffinity: "continuum", eminence: 0, cost: affinityCost(2, 0, 0, 2, 0) },
  { id: "t1s08", tier: 1, bonusAffinity: "continuum", eminence: 1, cost: affinityCost(0, 0, 4, 0, 0) },
  // Verdance bonus
  { id: "t1e01", tier: 1, bonusAffinity: "verdance", eminence: 0, cost: affinityCost(1, 1, 0, 0, 1) },
  { id: "t1e02", tier: 1, bonusAffinity: "verdance", eminence: 0, cost: affinityCost(0, 2, 0, 1, 0) },
  { id: "t1e03", tier: 1, bonusAffinity: "verdance", eminence: 0, cost: affinityCost(1, 1, 0, 1, 0) },
  { id: "t1e04", tier: 1, bonusAffinity: "verdance", eminence: 0, cost: affinityCost(0, 3, 0, 0, 0) },
  { id: "t1e05", tier: 1, bonusAffinity: "verdance", eminence: 0, cost: affinityCost(2, 0, 0, 0, 2) },
  { id: "t1e06", tier: 1, bonusAffinity: "verdance", eminence: 0, cost: affinityCost(0, 1, 0, 1, 2) },
  { id: "t1e07", tier: 1, bonusAffinity: "verdance", eminence: 0, cost: affinityCost(0, 0, 0, 2, 1) },
  { id: "t1e08", tier: 1, bonusAffinity: "verdance", eminence: 1, cost: affinityCost(0, 0, 0, 4, 0) },
  // Abyss bonus
  { id: "t1o01", tier: 1, bonusAffinity: "abyss", eminence: 0, cost: affinityCost(0, 1, 1, 0, 1) },
  { id: "t1o02", tier: 1, bonusAffinity: "abyss", eminence: 0, cost: affinityCost(0, 1, 0, 0, 2) },
  { id: "t1o03", tier: 1, bonusAffinity: "abyss", eminence: 0, cost: affinityCost(1, 0, 1, 0, 1) },
  { id: "t1o04", tier: 1, bonusAffinity: "abyss", eminence: 0, cost: affinityCost(0, 0, 2, 1, 0) },
  { id: "t1o05", tier: 1, bonusAffinity: "abyss", eminence: 0, cost: affinityCost(2, 1, 0, 0, 0) },
  { id: "t1o06", tier: 1, bonusAffinity: "abyss", eminence: 0, cost: affinityCost(0, 2, 2, 0, 0) },
  { id: "t1o07", tier: 1, bonusAffinity: "abyss", eminence: 0, cost: affinityCost(1, 0, 0, 1, 2) },
  { id: "t1o08", tier: 1, bonusAffinity: "abyss", eminence: 1, cost: affinityCost(0, 4, 0, 0, 0) },
  // Radiance bonus
  { id: "t1p01", tier: 1, bonusAffinity: "radiance", eminence: 0, cost: affinityCost(1, 1, 0, 1, 0) },
  { id: "t1p02", tier: 1, bonusAffinity: "radiance", eminence: 0, cost: affinityCost(0, 1, 0, 2, 0) },
  { id: "t1p03", tier: 1, bonusAffinity: "radiance", eminence: 0, cost: affinityCost(1, 0, 1, 1, 0) },
  { id: "t1p04", tier: 1, bonusAffinity: "radiance", eminence: 0, cost: affinityCost(2, 0, 0, 0, 1) },
  { id: "t1p05", tier: 1, bonusAffinity: "radiance", eminence: 0, cost: affinityCost(0, 2, 0, 0, 2) },
  { id: "t1p06", tier: 1, bonusAffinity: "radiance", eminence: 0, cost: affinityCost(1, 0, 1, 0, 2) },
  { id: "t1p07", tier: 1, bonusAffinity: "radiance", eminence: 0, cost: affinityCost(0, 0, 1, 2, 1) },
  { id: "t1p08", tier: 1, bonusAffinity: "radiance", eminence: 1, cost: affinityCost(0, 0, 4, 0, 0) },

  // ─── Tier 2 (30 cards — 6 per Affinity) ──────────────────────────────────
  // Flare bonus
  { id: "t2r01", tier: 2, bonusAffinity: "flare", eminence: 1, cost: affinityCost(0, 2, 0, 3, 2) },
  { id: "t2r02", tier: 2, bonusAffinity: "flare", eminence: 2, cost: affinityCost(0, 1, 4, 2, 0) },
  { id: "t2r03", tier: 2, bonusAffinity: "flare", eminence: 2, cost: affinityCost(3, 0, 0, 0, 3) },
  { id: "t2r04", tier: 2, bonusAffinity: "flare", eminence: 1, cost: affinityCost(2, 0, 2, 0, 2) },
  { id: "t2r05", tier: 2, bonusAffinity: "flare", eminence: 2, cost: affinityCost(0, 3, 0, 2, 2) },
  { id: "t2r06", tier: 2, bonusAffinity: "flare", eminence: 2, cost: affinityCost(0, 0, 0, 5, 0) },
  // Continuum bonus
  { id: "t2s01", tier: 2, bonusAffinity: "continuum", eminence: 1, cost: affinityCost(2, 0, 3, 0, 2) },
  { id: "t2s02", tier: 2, bonusAffinity: "continuum", eminence: 2, cost: affinityCost(4, 0, 0, 2, 1) },
  { id: "t2s03", tier: 2, bonusAffinity: "continuum", eminence: 2, cost: affinityCost(0, 3, 0, 0, 3) },
  { id: "t2s04", tier: 2, bonusAffinity: "continuum", eminence: 1, cost: affinityCost(0, 0, 2, 0, 3) },
  { id: "t2s05", tier: 2, bonusAffinity: "continuum", eminence: 2, cost: affinityCost(5, 0, 0, 0, 0) },
  { id: "t2s06", tier: 2, bonusAffinity: "continuum", eminence: 2, cost: affinityCost(2, 0, 0, 3, 2) },
  // Verdance bonus
  { id: "t2e01", tier: 2, bonusAffinity: "verdance", eminence: 1, cost: affinityCost(3, 2, 0, 0, 2) },
  { id: "t2e02", tier: 2, bonusAffinity: "verdance", eminence: 2, cost: affinityCost(2, 4, 0, 1, 0) },
  { id: "t2e03", tier: 2, bonusAffinity: "verdance", eminence: 2, cost: affinityCost(0, 0, 3, 3, 0) },
  { id: "t2e04", tier: 2, bonusAffinity: "verdance", eminence: 1, cost: affinityCost(0, 2, 0, 2, 2) },
  { id: "t2e05", tier: 2, bonusAffinity: "verdance", eminence: 2, cost: affinityCost(0, 5, 0, 0, 0) },
  { id: "t2e06", tier: 2, bonusAffinity: "verdance", eminence: 2, cost: affinityCost(2, 0, 0, 2, 3) },
  // Abyss bonus
  { id: "t2o01", tier: 2, bonusAffinity: "abyss", eminence: 1, cost: affinityCost(0, 2, 2, 0, 3) },
  { id: "t2o02", tier: 2, bonusAffinity: "abyss", eminence: 2, cost: affinityCost(1, 0, 2, 0, 4) },
  { id: "t2o03", tier: 2, bonusAffinity: "abyss", eminence: 2, cost: affinityCost(3, 0, 0, 3, 0) },
  { id: "t2o04", tier: 2, bonusAffinity: "abyss", eminence: 1, cost: affinityCost(2, 0, 3, 0, 2) },
  { id: "t2o05", tier: 2, bonusAffinity: "abyss", eminence: 2, cost: affinityCost(0, 0, 5, 0, 0) },
  { id: "t2o06", tier: 2, bonusAffinity: "abyss", eminence: 2, cost: affinityCost(2, 3, 0, 0, 2) },
  // Radiance bonus
  { id: "t2p01", tier: 2, bonusAffinity: "radiance", eminence: 1, cost: affinityCost(2, 3, 0, 2, 0) },
  { id: "t2p02", tier: 2, bonusAffinity: "radiance", eminence: 2, cost: affinityCost(0, 2, 1, 4, 0) },
  { id: "t2p03", tier: 2, bonusAffinity: "radiance", eminence: 2, cost: affinityCost(0, 0, 3, 0, 3) },
  { id: "t2p04", tier: 2, bonusAffinity: "radiance", eminence: 1, cost: affinityCost(3, 2, 0, 0, 2) },
  { id: "t2p05", tier: 2, bonusAffinity: "radiance", eminence: 2, cost: affinityCost(0, 0, 0, 0, 5) },
  { id: "t2p06", tier: 2, bonusAffinity: "radiance", eminence: 2, cost: affinityCost(0, 2, 3, 2, 0) },

  // ─── Tier 3 (20 cards — 4 per Affinity) ──────────────────────────────────
  // Flare bonus
  { id: "t3r01", tier: 3, bonusAffinity: "flare", eminence: 3, cost: affinityCost(3, 0, 0, 5, 3) },
  { id: "t3r02", tier: 3, bonusAffinity: "flare", eminence: 4, cost: affinityCost(0, 0, 3, 6, 3) },
  { id: "t3r03", tier: 3, bonusAffinity: "flare", eminence: 3, cost: affinityCost(0, 5, 0, 3, 3) },
  { id: "t3r04", tier: 3, bonusAffinity: "flare", eminence: 5, cost: affinityCost(0, 0, 7, 3, 3) },
  // Continuum bonus
  { id: "t3s01", tier: 3, bonusAffinity: "continuum", eminence: 3, cost: affinityCost(5, 3, 0, 0, 3) },
  { id: "t3s02", tier: 3, bonusAffinity: "continuum", eminence: 4, cost: affinityCost(6, 3, 0, 3, 0) },
  { id: "t3s03", tier: 3, bonusAffinity: "continuum", eminence: 3, cost: affinityCost(3, 0, 5, 3, 0) },
  { id: "t3s04", tier: 3, bonusAffinity: "continuum", eminence: 5, cost: affinityCost(3, 7, 0, 0, 3) },
  // Verdance bonus
  { id: "t3e01", tier: 3, bonusAffinity: "verdance", eminence: 3, cost: affinityCost(0, 5, 3, 0, 3) },
  { id: "t3e02", tier: 3, bonusAffinity: "verdance", eminence: 4, cost: affinityCost(3, 6, 0, 3, 0) },
  { id: "t3e03", tier: 3, bonusAffinity: "verdance", eminence: 3, cost: affinityCost(0, 3, 0, 5, 3) },
  { id: "t3e04", tier: 3, bonusAffinity: "verdance", eminence: 5, cost: affinityCost(3, 3, 7, 0, 0) },
  // Abyss bonus
  { id: "t3o01", tier: 3, bonusAffinity: "abyss", eminence: 3, cost: affinityCost(0, 3, 5, 3, 0) },
  { id: "t3o02", tier: 3, bonusAffinity: "abyss", eminence: 4, cost: affinityCost(0, 3, 6, 0, 3) },
  { id: "t3o03", tier: 3, bonusAffinity: "abyss", eminence: 3, cost: affinityCost(3, 0, 3, 0, 5) },
  { id: "t3o04", tier: 3, bonusAffinity: "abyss", eminence: 5, cost: affinityCost(0, 3, 3, 7, 0) },
  // Radiance bonus
  { id: "t3p01", tier: 3, bonusAffinity: "radiance", eminence: 3, cost: affinityCost(3, 0, 3, 5, 0) },
  { id: "t3p02", tier: 3, bonusAffinity: "radiance", eminence: 4, cost: affinityCost(3, 0, 3, 0, 6) },
  { id: "t3p03", tier: 3, bonusAffinity: "radiance", eminence: 3, cost: affinityCost(5, 0, 3, 0, 3) },
  { id: "t3p04", tier: 3, bonusAffinity: "radiance", eminence: 5, cost: affinityCost(0, 3, 0, 3, 7) },
];

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
    effectDescription: "On arrival, burns all Tier III Artifacts whose Flare cost is 4 or less, forcing those slots to immediately redraw.",
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
    effectDescription: "On arrival, scries the Tier II and Tier III Archives and reorders them so Continuum Artifacts surface first.",
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
    effectDescription: "Living Luminary bonus — starting the turn after this Luminary arrives, you gain +1 Verdance toward every Artifact you forge while you own it.",
  },
  {
    id: "lum_void",
    name: "The Void Warden",
    domain: "Void",
    eminence: 0,
    oblivion: 5,
    requirements: { flare: 0, continuum: 0, verdance: 0, abyss: 6, radiance: 0, singularity: 0 },
    flavor: "In the space between stars, something watches without eyes.",
    summonColor: "#4c1d95",
    summonSecondaryColor: "#0a0a14",
    auraStyle: "void",
    effectName: "Oblivion",
    effectDescription: "On arrival, raises the shared victory requirement by 5. This Luminary awards no Eminence to its claimer.",
  },
  {
    id: "lum_radiant",
    name: "Concordance Mandala",
    domain: "Coherence",
    eminence: 3,
    requirements: { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 6, singularity: 0 },
    flavor: "Truth is not revealed. It is aligned.",
    summonColor: "#fef9c3",
    summonSecondaryColor: "#2ecc71",
    auraStyle: "radiant",
    effectName: "Perfect Coherence",
    effectDescription: "Once per game, when you end a turn with 8 or more Radiance Artifacts forged, you immediately gain +2 Eminence.",
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
    effectDescription: "On arrival, burns every currently face-up Tier III Artifact from The Forge, forcing all those slots to manifest replacements from the Archive.",
  },
  {
    id: "lum_compass",
    name: "???",
    domain: "Erasure",
    eminence: 0,
    requirements: { flare: 0, continuum: 4, verdance: 0, abyss: 4, radiance: 0, singularity: 0 },
    flavor: "Everyone remembers something happened, but no one recalls what was lost.",
    summonColor: "#2563eb",
    summonSecondaryColor: "#0a0a14",
    auraStyle: "distorted",
    effectName: "The Forgotten Hour",
    effectDescription: "On arrival, raises the shared victory requirement by 1 and marks all currently face-up Forge Artifacts as Forgotten. Forgotten marks last only until the source player's next end of turn, and players cannot Encrypt during that window. After the marks expire, 12 owner-turn cycles pass; then Forgotten Hour returns at the source player's end of turn. Artifacts forged while Forgotten award 0 Eminence and cannot be used for blueprints.",
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
    effectDescription: "On arrival, places Avatar Seed tokens on the next Artifact in each Archive. When an opponent forges a seeded Artifact, you earn pending Eminence paid out at the end of your next turn.",
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
    effectDescription: "Once per game, the first time you forge an Artifact, a free copy of your cheapest-cost Tier I Artifact is added to your collection.",
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
    effectDescription: "On arrival, each player holding more than half the starting supply of any Affinity must return 1 of that Affinity to the Well.",
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
    effectDescription: "On arrival, mark each face-up Artifact as Condemned unless its forge cost includes 3 or more Flare, Abyss, or Radiance. At the end of your next turn, burn each remaining Condemned Artifact and refill its Forge slot.",
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
    effectDescription: "On arrival, you may replace your forge action this turn with Assimilation — copy the bonus affinity of any Artifact in your collection as a permanent bonus.",
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
    effectDescription: "On arrival, marks all face-up Tier III Artifacts that do not require all three of Continuum, Abyss, and Radiance as Nullified — they award 0 Eminence when forged.",
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
  players: { id: string; name: string }[],
  playerCount: number,
  victoryRequirement: number = WIN_THRESHOLD,
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

  const playerStates: PlayerGameState[] = players.map((p) => ({
    playerId: p.id,
    playerName: p.name,
    affinities: zeroAffinities(),
    bonuses: zeroAffinities(),
    eminence: 0,
    reservedArtifactIds: [],
    privateReservedArtifactIds: [],
    forgedArtifactIds: [],
    discountedForgeIds: [],
    blueprintBlockedCardIds: [],
    luminaries: [],
    isConnected: true,
    plannedAction: null,
    plannedActionCancelReason: null,
  }));

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
    victoryRequirement: Math.max(WIN_THRESHOLD, Math.floor(victoryRequirement)),
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
    pendingTurnTransition: null,
    forgottenHourCycle: {},
    phoenixRecurrence: undefined,
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
    coreActionUsed: false,
  };
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
  | "plan_action"
  | "execute_plan"
  | "cancel_plan"
  | "tutorial_fast_forward"
  | "set_civ_name"
  | "choose_luminary_order";

export interface ActionPayload {
  type: ActionType;
  affinities?: Partial<AffinityCounts>;
  /** Used by same-Affinity Harness actions and legacy Luminary Affinity payloads. */
  affinity?: StandardAffinityKey;
  returnAffinities?: Partial<AffinityCounts>;
  cardId?: string;
  tier?: 1 | 2 | 3;
  luminaryId?: string;
  eventId?: string;
  plannedActionData?: ActionPayload;
  civName?: string;
  /** Ordered list of luminaryIds for choose_luminary_order action. */
  orderedIds?: string[];
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
): void {
  const needed = effectiveCost(card, player, bonusOverride);
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
      if (lumId === "lum_void") {
        pushActivationEvent(state, lumId, "summon", player.playerId);
      }
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
    state.victoryRequirement = getVictoryRequirement(state) + lum.oblivion!;
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
 * Handles marker cleanup (removes marker from the removed card) and
 * Avatar Seed token transfer (if the incoming deck card was seeded).
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
    // Transfer Avatar Seed token if the incoming card was seeded in the deck.
    if (state.avatarSeedState) {
      const si = state.avatarSeedState.deckSeeds.indexOf(newId);
      if (si !== -1) {
        state.avatarSeedState.deckSeeds.splice(si, 1);
        addArtifactBrand(state, newId, {
          type: "avatar_seed",
          ownerId: state.avatarSeedState.ownerId,
          summonedAtTurnCount: state.avatarSeedState.summonedAtTurnCount,
        });
      }
    }
    return newId;
  } else {
    forgeRow.splice(idx, 1);
    return null;
  }
}

// ─── v0.8 Burn / Scry Helpers ─────────────────────────────────────────────────

/** Sum of all Affinity costs on an Artifact (used for lowest-cost comparisons). */
function markerSuppressesForgeValue(marker?: ArtifactMarker | null): boolean {
  return getArtifactBrands(marker).some(
    (brand) => brand.type === "forgotten" || brand.type === "condemned" || brand.type === "nullified",
  );
}

function isForgottenHourActive(state: GameStateData): boolean {
  const activeCycle = Object.values(state.forgottenHourCycle ?? {}).some(
    (cycle) => cycle?.cooldownOwnerTurnsRemaining === null,
  );
  if (activeCycle) return true;

  return Object.values(state.artifactMarkers ?? {}).some((marker) => markerHasBrand(marker, "forgotten"));
}

function markBlueprintBlockedIfForgotten(
  player: PlayerGameState,
  cardId: string,
  marker?: ArtifactMarker | null,
): void {
  if (!markerHasBrand(marker, "forgotten")) return;
  if (!Array.isArray(player.blueprintBlockedCardIds)) player.blueprintBlockedCardIds = [];
  if (!player.blueprintBlockedCardIds.includes(cardId)) {
    player.blueprintBlockedCardIds.push(cardId);
  }
}

/**
 * Burn all face-up Artifacts currently in the Forge tier.
 * Only the cards present at the moment this function is called are burned;
 * replacement cards drawn from the deck are NOT re-burned.
 * Pushes a single aggregate action-log entry (single-card or multi-card canonical
 * format) instead of per-card entries — callers must NOT push a redundant summary.
 * Returns the count of cards that were burned.
 */
function burnAllInTier(state: GameStateData, tier: 1 | 2 | 3, sourceLuminaryId: string): number {
  const snapshot = [...getForgeRowForTier(state, tier)];
  const burnedNames: string[] = [];
  for (const id of snapshot) {
    const forgeRow = getForgeRowForTier(state, tier);
    if (forgeRow.includes(id)) {
      const lore = getCardLore(id);
      burnedNames.push(lore.name);
      burnCard(state, id, tier, sourceLuminaryId, true); // suppressLog — aggregate below
    }
  }
  const count = burnedNames.length;
  if (count > 0) {
    const lum = LUMINARIES.find((l) => l.id === sourceLuminaryId);
    const lumName = lum?.name ?? sourceLuminaryId;
    const owner = state.players.find((p) => p.luminaries.includes(sourceLuminaryId));
    const recurrenceActive = state.players.some((p) => p.luminaries.includes("lum_astral"));
    const destinationText = recurrenceActive
      ? "They returned to the bottoms of their corresponding Archives."
      : "They moved to the Burn Pile.";
    const summary = count === 1
      ? `${lumName} Burned ${burnedNames[0]}. ${recurrenceActive ? `${burnedNames[0]} returned to the bottom of its Archive.` : `${burnedNames[0]} moved to the Burn Pile.`}`
      : `${lumName} Burned ${count} Artifacts. ${destinationText}`;
    pushLog(state, {
      playerId: owner?.playerId ?? "",
      playerName: owner?.playerName ?? "",
      summary,
      turn: state.roundNumber,
    });
  }
  return count;
}

/**
 * Scry top `count` cards of the given tier's deck and reorder:
 * cards with `keepColor` in their cost stay on top (original order),
 * cards without `keepColor` go to the bottom (original order).
 */
function scryAndReorder(
  state: GameStateData,
  tier: 1 | 2 | 3,
  keepColor: StandardAffinityKey,
): void {
  const deck = getDeckForTier(state, tier);
  if (deck.length === 0) return;
  const scryCount = Math.min(3, deck.length);
  const scried = deck.splice(0, scryCount);
  const keep = scried.filter((id) => {
    const card = CARD_MAP.get(id);
    return card && (card.cost[keepColor] ?? 0) > 0;
  });
  const bottom = scried.filter((id) => !keep.includes(id));
  deck.unshift(...keep);
  deck.push(...bottom);
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

/**
 * Shared "burn" primitive — the single authoritative path for all Luminary burn effects.
 *
 * Emits one `BurnEvent`, routes the card to the Burn Pile or corresponding
 * Archive according to Eternal Recurrence, increments the Catalyst Bloom
 * accumulator, optionally pushes a per-card log, then refills the Forge slot.
 *
 * Pass `suppressLog = true` when the caller (e.g. burnAllInTier) will push its
 * own aggregate log entry instead of per-card entries.
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
): void {
  if (!Array.isArray(state.burnPile)) state.burnPile = [];
  if (!Array.isArray(state.burnEvents)) state.burnEvents = [];
  const recurrenceActive = state.players.some((p) => p.luminaries.includes("lum_astral"));
  const destination: BurnEvent["destination"] = recurrenceActive ? "archive" : "burn_pile";
  if (recurrenceActive) {
    const archive = getDeckForTier(state, tier);
    if (!archive.includes(cardId)) archive.push(cardId);
  } else if (!state.burnPile.includes(cardId)) {
    state.burnPile.push(cardId);
  }

  // Resolve lookup values shared by the event payload and the log entry.
  const burntLore = getCardLore(cardId);
  const lum = LUMINARIES.find((l) => l.id === sourceLuminaryId);
  const owner = state.players.find((p) => p.luminaries.includes(sourceLuminaryId));

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
  const deckSeeds: string[] = [];
  for (const tier of [1, 2, 3] as const) {
    const deck = getDeckForTier(state, tier);
    for (const id of deck.slice(0, 2)) {
      if (!deckSeeds.includes(id)) deckSeeds.push(id);
    }
  }
  state.avatarSeedState = {
    ownerId: player.playerId,
    summonedAtTurnCount,
    pendingEminence: 0,
    deckSeeds,
    payoutDone: false,
  };
  pushLog(state, {
    playerId: player.playerId, playerName: player.playerName,
    summary: `Seed Beyond Seasons — Avatar Seeds: ${deckSeeds.length} future manifestation(s) seeded in the Archives`,
    turn: state.roundNumber,
  });
  return deckSeeds;
}

function applySummonEffect_balanceDue(
  state: GameStateData,
  player: PlayerGameState,
): void {
  // "More than half that affinity's starting supply" per player count.
  const n = state.players.length === 2 ? 4 : state.players.length === 3 ? 5 : 7;
  const halfSupply = n / 2; // e.g. 2 for 4-start, 2.5 for 5-start

  let totalReturned = 0;
  for (const p of state.players) {
    for (const c of STANDARD_AFFINITY_KEYS) {
      if ((p.affinities[c] ?? 0) > halfSupply) {
        p.affinities[c]--;
        state.affinityWell[c]++;
        totalReturned++;
      }
    }
  }
  if (totalReturned > 0) {
    pushLog(state, {
      playerId: player.playerId, playerName: player.playerName,
      summary: `Pale Merchant — Balance Due: ${totalReturned} Affinity returned`,
      turn: state.roundNumber,
    });
  }
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
): void {
  if (!Array.isArray(state.pendingLuminaryActivationEvents)) {
    state.pendingLuminaryActivationEvents = [];
  }
  state.pendingLuminaryActivationEvents.push({
    eventId: `${luminaryId}-${effectType}-v${state.version}-${Date.now()}`,
    luminaryId,
    effectType,
    triggeringPlayerId,
    createdAt: Date.now(),
    ...(targetCardIds && targetCardIds.length > 0 ? { targetCardIds } : {}),
  });
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
      for (const cardId of targets) {
        if (state.forgeTier3.includes(cardId)) {
          burnCard(state, cardId, 3, "lum_moth", true);
        }
      }
      if (targets.length > 0) {
        pushLog(state, {
          playerId: player.playerId, playerName: player.playerName,
          summary: `Red Moth — Rupture of the Still: burned ${targets.length} Tier III Artifact${targets.length === 1 ? "" : "s"} costing 4 or less Flare`,
          turn: state.roundNumber,
        });
      }
      pushActivationEvent(state, lumId, "summon", player.playerId, targets);
      break;
    }
    case "lum_tide": {
      // The Observer Effect: scry+reorder top 3 of T2 and T3 decks by Continuum.
      scryAndReorder(state, 2, "continuum");
      scryAndReorder(state, 3, "continuum");
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Tide Architect — The Observer Effect: Archives reordered (Continuum Artifacts promoted)`,
        turn: state.roundNumber,
      });
      pushActivationEvent(state, lumId, "summon", player.playerId);
      break;
    }
    case "lum_forge": {
      // Impact Extinction: burn all face-up T3 Artifacts.
      // burnAllInTier pushes the canonical aggregate log — no redundant summary here.
      burnAllInTier(state, 3, "lum_forge");
      pushActivationEvent(state, lumId, "summon", player.playerId);
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
      pushActivationEvent(state, lumId, "summon", player.playerId);
      break;
    }
    case "lum_compass": {
      // The Forgotten Hour: mark all face-up Forge cards as Forgotten.
      const forgottenIds = applySummonEffect_forgottenHour(state, player, summonedAtTurnCount);
      pushActivationEvent(state, lumId, "summon", player.playerId, forgottenIds);
      break;
    }
    case "lum_seed": {
      // Avatar Seeds: reveal and mark top 2 cards of each deck.
      // The frontend plays Seed's activation announcement before the board-level
      // deck-seeding flourish so the seeded strike does not appear without its cue.
      const seededIds = applySummonEffect_avatarSeeds(state, player, summonedAtTurnCount);
      pushActivationEvent(state, lumId, "summon", player.playerId, seededIds);
      break;
    }
    case "lum_pale": {
      // Balance Due: each player holding more than half starting supply returns 1.
      applySummonEffect_balanceDue(state, player);
      pushActivationEvent(state, lumId, "summon", player.playerId);
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
      // Assimilation: enable this turn's Assimilation action for the claimer.
      state.firstHungerAvailable = player.playerId;
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Final Hunger — Assimilation available: choose a face-up Artifact to Burn for Eminence`,
        turn: state.roundNumber,
      });
      pushActivationEvent(state, lumId, "summon", player.playerId);
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
    // lum_verdant: cheaper cost, no arrival effect.
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
  // ── Concordance Mandala (lum_radiant): +2 Eminence if ≥8 Radiance Artifacts ──
  if (player.luminaries.includes("lum_radiant") && !state.concordanceMandalaTriggered) {
    const radianceArtifacts = player.forgedArtifactIds.filter(
      (id) => CARD_MAP.get(id)?.bonusAffinity === "radiance",
    ).length;
    if (radianceArtifacts >= 8) {
      player.eminence += 2;
      state.concordanceMandalaTriggered = true;
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Concordance Mandala — Perfect Coherence: 8+ Radiance Artifacts → +2 Eminence`,
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

  // ── Seed Beyond Seasons (lum_seed): payout pending Eminence at end of next turn ──
  const seedLa = state.luminaryAffinities.find(
    (x) => x.luminaryId === "lum_seed" && x.ownerId === player.playerId,
  );
  if (
    seedLa &&
    state.avatarSeedState?.ownerId === player.playerId &&
    !state.avatarSeedState.payoutDone &&
    state.turnCount > seedLa.summonedAtTurnCount
  ) {
    const pending = state.avatarSeedState.pendingEminence;
    if (pending > 0) {
      player.eminence += pending;
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Seed Beyond Seasons — Avatar Seeds: +${pending} pending Eminence paid out`,
        turn: state.roundNumber,
      });
      pushActivationEvent(state, "lum_seed", "end_of_turn", player.playerId);
    }
    state.avatarSeedState.payoutDone = true;
    // Remove all remaining Avatar Seed tokens from deck tops, the Forge, and
    // reserved Artifacts (tracked through deckSeeds and artifactMarkers).
    state.avatarSeedState.deckSeeds = [];
    if (state.artifactMarkers) {
      for (const id of Object.keys(state.artifactMarkers)) {
        removeArtifactBrands(state, id, (brand) => brand.type === "avatar_seed");
      }
    }
    pushLog(state, {
      playerId: player.playerId, playerName: player.playerName,
      summary: `Seed Beyond Seasons — Avatar Seed tokens expired and cleared`,
      turn: state.roundNumber,
    });
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
      const condemnedCardIds = condemned.map(([id]) => id);
      let burnCount = 0;
      for (const [cardId] of condemned) {
        for (const tier of [1, 2, 3] as const) {
          const forgeRow = getForgeRowForTier(state, tier);
          if (forgeRow.includes(cardId)) {
            burnCard(state, cardId, tier, "lum_ember");
            burnCount++;
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
        pushActivationEvent(state, "lum_ember", "end_of_turn", player.playerId, condemnedCardIds);
      }
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
}

export interface DevLuminarySequenceOptions {
  luminaryIds: string[];
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
    otherPlayer.discountedForgeIds = otherPlayer.discountedForgeIds.filter((id) => !artifactIds.has(id));
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
  if (selectedIds.has("lum_radiant")) state.concordanceMandalaTriggered = false;
  if (selectedIds.has("lum_orchard")) state.glassOrchardTriggered = false;
  if (selectedIds.has("lum_astral")) state.phoenixRecurrence = undefined;
  if (selectedIds.has("lum_seed")) state.avatarSeedState = undefined;
  if (selectedIds.has("lum_hunger") && state.firstHungerAvailable === playerId) {
    state.firstHungerAvailable = null;
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
    player.bonuses.radiance = Math.max(player.bonuses.radiance, radianceIds.length);
    refillDevForgeRows(state);
    state.concordanceMandalaTriggered = false;
  }

  if (selectedIds.has("lum_bloom")) {
    state.catalystBloomBurnCount = Math.max(2, state.catalystBloomBurnCount ?? 0);
  }

  if (selectedIds.has("lum_seed") && state.avatarSeedState?.ownerId === player.playerId) {
    state.avatarSeedState.summonedAtTurnCount = state.turnCount - 1;
    state.avatarSeedState.pendingEminence = Math.max(2, state.avatarSeedState.pendingEminence);
    state.avatarSeedState.payoutDone = false;
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
    (state.pendingLuminaryActivationEvents?.length ?? 0) > 0
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
  while (state.devLuminarySequenceStage && !hasPendingLuminaryPresentation(state)) {
    const phase = stage.phase ?? "arrivals";
    if (phase === "arrivals") {
      stage.phase = "end_of_turn";
      if (stage.includeEndOfTurnEffects) {
        primeDevEndOfTurnEffects(state, player, selectedIds);
        applyEndOfTurnEffects(state, player);
      }
      continue;
    }
    if (phase === "end_of_turn") {
      stage.phase = "start_of_turn";
      if (stage.includeStartOfTurnEffects) {
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
  applyLuminaryBatch(state, player, orderedIds, 1);

  if (options.includeEndOfTurnEffects || options.includeStartOfTurnEffects) {
    state.devLuminarySequenceStage = {
      playerId: player.playerId,
      luminaryIds: orderedIds,
      includeEndOfTurnEffects: !!options.includeEndOfTurnEffects,
      includeStartOfTurnEffects: !!options.includeStartOfTurnEffects,
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
    includeEndOfTurnEffects: !!options.includeEndOfTurnEffects,
    includeStartOfTurnEffects: !!options.includeStartOfTurnEffects,
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

const WIN_THRESHOLD = 15;

function getVictoryRequirement(state: GameStateData): number {
  return Math.max(WIN_THRESHOLD, state.victoryRequirement ?? WIN_THRESHOLD);
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
        reservedArtifactCount: contender.reservedArtifactIds.length,
        forgedArtifacts: contender.forgedArtifactIds
          .map((id) => CARD_MAP.get(id))
          .filter((card): card is ArtifactCard => !!card),
      },
      {
        eminence: winner.eminence,
        reservedArtifactCount: winner.reservedArtifactIds.length,
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
    (state.pendingLuminaryActivationEvents?.length ?? 0) > 0
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
    return;
  }

  if (state.phase === "playing" && checkWin(state)) {
    state.phase = "last_round";
  }

  if (state.phase !== "last_round" || nextPlayerIndex !== 0) return;

  state.phase = "finished";
  state.finishReason = "win";
  assignWinner(state);
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
      if (endingPlayer) applyEndOfTurnEffects(state, endingPlayer);
      continue;
    }

    if (transition.stage === "after_end_effects") {
      state.turnCount = (state.turnCount ?? 0) + 1;
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
  clone.pendingLuminaryChoice = null;
  continuePendingTurnTransition(clone);
  clone.pendingSummonEvents = [];
  clone.pendingLuminaryActivationEvents = [];
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
    action.type === "choose_luminary_order" ||
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
    action.type !== "plan_action" &&
    action.type !== "cancel_plan" &&
    action.type !== "tutorial_fast_forward" &&
    action.type !== "set_civ_name" &&
    action.type !== "choose_luminary_order";
  if (isTurnGated && state.currentPlayerIndex !== playerIdx) {
    return { success: false, error: "Not your turn" };
  }

  // Guard: only one core action is allowed per turn. This remains active while
  // the staged transition is resolving, preventing a second action from landing.
  if (isTurnGated && state.coreActionUsed && CORE_ACTIONS.has(action.type)) {
    return { success: false, error: "You already used your core action this turn." };
  }

  const player = state.players[playerIdx];

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
      if (isForgottenHourActive(state))
        return { success: false, error: ERR_CANNOT_ENCRYPT_DURING_FORGOTTEN_HOUR };
      if (player.reservedArtifactIds.length >= 3)
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
        const blindId = deck.shift()!;
        // Avatar Seed: if the drawn card was seeded in the deck, transfer the token
        // to artifactMarkers so it follows the card into the reserved pile.
        if (state.avatarSeedState && !state.avatarSeedState.payoutDone) {
          const si = state.avatarSeedState.deckSeeds.indexOf(blindId);
          if (si !== -1) {
            state.avatarSeedState.deckSeeds.splice(si, 1);
            addArtifactBrand(state, blindId, {
              type: "avatar_seed",
              ownerId: state.avatarSeedState.ownerId,
              summonedAtTurnCount: state.avatarSeedState.summonedAtTurnCount,
            });
          }
        }
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

      // Reserve from the Forge. Save the marker before the slot is refilled so
      // it follows the Artifact into the reserved pile.
      const reserveMarker = (state.artifactMarkers ?? {})[action.cardId];
      player.reservedArtifactIds.push(action.cardId);
      refillForgeSlot(state, forgeRow, getDeckForTier(state, card.tier as 1 | 2 | 3), action.cardId);
      if (reserveMarker) {
        const retainedBrands = getArtifactBrands(reserveMarker).filter(
          (brand) => brand.type !== "avatar_seed" ||
            (state.avatarSeedState !== undefined && !state.avatarSeedState.payoutDone),
        );
        const retainedMarker = buildArtifactMarker(retainedBrands);
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

      if ((state.burnPile ?? []).includes(action.cardId))
        return { success: false, error: "Artifact has been burned" };

      const forgeRow = getForgeRowForTier(state, card.tier as 1 | 2 | 3);
      if (!forgeRow.includes(action.cardId))
        return { success: false, error: ERR_ARTIFACT_NOT_IN_FORGE };
      const liveAffinityBonuses = effectiveAffinityBonuses(state, player);
      const eff = effectiveCost(card, player, liveAffinityBonuses);
      if (!canAfford(eff, player.affinities))
        return { success: false, error: "Cannot afford this Artifact" };
      const kardashevBefore = computeKardashevTier(player.forgedArtifactIds, player.discountedForgeIds);

      // Read the marker before refillForgeSlot removes it.
      const forgeMarker = (state.artifactMarkers ?? {})[action.cardId];
      const markerSuppressesEminence = markerSuppressesForgeValue(forgeMarker);

      // Avatar Seed: if forged by an opponent, increment pending.
      const forgeSeedBrand = getArtifactBrands(forgeMarker).find(
        (brand) => brand.type === "avatar_seed",
      );
      if (forgeSeedBrand && forgeSeedBrand.ownerId !== playerId) {
        if (state.avatarSeedState && !state.avatarSeedState.payoutDone) {
          state.avatarSeedState.pendingEminence++;
        }
      }

      payForgeCost(card, player, state.affinityWell, liveAffinityBonuses);
      player.forgedArtifactIds.push(action.cardId);
      const isZeroCostForge = Object.values(eff).every((v) => v === 0);
      if (isZeroCostForge) {
        player.discountedForgeIds.push(action.cardId);
      }
      if (!player.forgedArtifactBonusSnapshots) player.forgedArtifactBonusSnapshots = {};
      player.forgedArtifactBonusSnapshots[action.cardId] = { ...liveAffinityBonuses };
      markBlueprintBlockedIfForgotten(player, action.cardId, forgeMarker);
      player.bonuses[card.bonusAffinity]++;

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
      }

      refillForgeSlot(state, forgeRow, getDeckForTier(state, card.tier as 1 | 2 | 3), action.cardId);
      checkLuminaries(state, player);
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
      const liveBonusesReserved = effectiveAffinityBonuses(state, player);
      const eff = effectiveCost(card, player, liveBonusesReserved);
      if (!canAfford(eff, player.affinities))
        return { success: false, error: "Cannot afford this Artifact" };
      const kardashevBeforeReserved = computeKardashevTier(player.forgedArtifactIds, player.discountedForgeIds);

      // Avatar Seed: the token follows the card into the reserved pile (v0.8 spec).
      // If forged by an opponent, accumulate +1 pending Eminence on The Seed Beyond Seasons.
      // If forged by the owner, just remove the token — no pending.
      const reservedMarker = (state.artifactMarkers ?? {})[action.cardId];
      const reservedMarkerSuppressesEminence = markerSuppressesForgeValue(reservedMarker);
      const reservedSeedBrand = getArtifactBrands(reservedMarker).find(
        (brand) => brand.type === "avatar_seed",
      );
      if (reservedSeedBrand && state.avatarSeedState && !state.avatarSeedState.payoutDone) {
        if (reservedSeedBrand.ownerId !== playerId) {
          state.avatarSeedState.pendingEminence++;
        }
        // Token is consumed on forge regardless of who forges.
      }
      // Clean up any marker (Forgotten/Condemned/Nullified/AvatarSeed) now that the card is forged.
      if (state.artifactMarkers) delete state.artifactMarkers[action.cardId];

      payForgeCost(card, player, state.affinityWell, liveBonusesReserved);
      player.reservedArtifactIds.splice(idx, 1);
      if (player.privateReservedArtifactIds) {
        const privateIdx = player.privateReservedArtifactIds.indexOf(action.cardId);
        if (privateIdx !== -1) player.privateReservedArtifactIds.splice(privateIdx, 1);
      }
      player.forgedArtifactIds.push(action.cardId);
      const isDiscountReserved = Object.values(eff).every((v) => v === 0);
      if (isDiscountReserved) {
        player.discountedForgeIds.push(action.cardId);
      }
      if (!player.forgedArtifactBonusSnapshots) player.forgedArtifactBonusSnapshots = {};
      player.forgedArtifactBonusSnapshots[action.cardId] = { ...liveBonusesReserved };
      markBlueprintBlockedIfForgotten(player, action.cardId, reservedMarker);
      player.bonuses[card.bonusAffinity]++;
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
      }

      checkLuminaries(state, player);
      checkKardashevAdvance(state, player, kardashevBeforeReserved, isDiscountReserved, card.tier);
      break;
    }

    case "assimilate": {
      // Final Hunger — Assimilation: one-time action replacing the forge on the summon turn.
      if (!state.firstHungerAvailable || state.firstHungerAvailable !== playerId) {
        return { success: false, error: "Assimilation is not available this turn" };
      }
      if (!action.cardId) return { success: false, error: "cardId required" };
      const assimCard = CARD_MAP.get(action.cardId);
      if (!assimCard) return { success: false, error: "Artifact not found" };
      const assimilationForgeRow = getForgeRowForTier(state, assimCard.tier as 1 | 2 | 3);
      if (!assimilationForgeRow.includes(action.cardId))
        return { success: false, error: ERR_ARTIFACT_NOT_IN_FORGE };
      if (assimCard.cost.flare === 0 && assimCard.cost.verdance === 0 && assimCard.cost.radiance === 0)
        return { success: false, error: "Target must have Flare, Verdance, or Radiance in its cost" };

      // Cost: printed base cost, reduced by player's card-derived bonuses for Flare (flare),
      // Verdance (verdance), and Radiance (radiance) only. Continuum/Abyss/Singularity costs
      // are paid in full from the printed cost. Luminary bonuses do not apply here.
      const assimCost: AffinityCounts = { ...assimCard.cost } as AffinityCounts;
      assimCost.flare   = Math.max(0, (assimCost.flare   ?? 0) - (player.bonuses.flare   ?? 0));
      assimCost.verdance = Math.max(0, (assimCost.verdance ?? 0) - (player.bonuses.verdance ?? 0));
      assimCost.radiance  = Math.max(0, (assimCost.radiance  ?? 0) - (player.bonuses.radiance  ?? 0));
      if (!canAfford(assimCost, player.affinities))
        return { success: false, error: "Cannot afford Assimilation" };

      // Pay manually with the reduced cost (payForgeCost uses normal effective cost).
      let singularityUsed = 0;
      for (const c of STANDARD_AFFINITY_KEYS) {
        const needed = assimCost[c] ?? 0;
        const avail = player.affinities[c] ?? 0;
        const fromOwn = Math.min(needed, avail);
        player.affinities[c] -= fromOwn;
        state.affinityWell[c] += fromOwn;
        singularityUsed += needed - fromOwn;
      }
      player.affinities.singularity -= singularityUsed;
      state.affinityWell.singularity += singularityUsed;

      // Burn via shared burnCard — emits BurnEvent, increments Catalyst Bloom, refills slot.
      burnCard(state, action.cardId, assimCard.tier as 1 | 2 | 3, "lum_hunger", false, { triggeredByPlayerId: playerId });

      // Grant printed Eminence + 2 bonus.
      const assimilationEminence = assimCard.eminence + 2;
      player.eminence += assimilationEminence;

      // Assimilation is consumed.
      state.firstHungerAvailable = null;

      const assimLore = getCardLore(action.cardId);
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `The Final Hunger Assimilated ${assimLore.name}: it was Burned, and you gained ${assimilationEminence} Eminence.`,
        turn: state.roundNumber,
      });
      checkLuminaries(state, player);
      break;
    }

    case "pass": {
      // No effect; just advances turn. Used for timer expiry.
      break;
    }

    case "surrender": {
      // Player surrenders; end the game with them as last place
      state.phase = "finished";
      state.finishReason = "surrender";
      // Clear any win-trigger from a mid-game Luminary summon — the fanfare
      // for a surrender should not use a stale Luminary color.
      state.winTriggerLuminaryId = null;
      // Set the winner to the remaining player with the highest Eminence.
      const others = state.players.filter((p) => p.playerId !== playerId);
      state.winnerId = selectWinnerId(others);
      break;
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
      const lenBefore = state.pendingLuminaryActivationEvents.length;
      state.pendingLuminaryActivationEvents = state.pendingLuminaryActivationEvents.filter(
        (e) => e.eventId !== eventId,
      );
      if (state.pendingLuminaryActivationEvents.length === lenBefore) {
        // Already resolved by another client — no-op.
        return { success: true };
      }
      state.lastAction = { type: "resolve_luminary_activation", playerId, eventId };
      advanceDevLuminarySequenceStage(state);
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
      if (state.currentPlayerIndex !== playerIdx) {
        return { success: false, error: "Not your turn" };
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
      const disallowed: ActionType[] = ["plan_action", "cancel_plan", "resolve_summon", "resolve_luminary_activation", "surrender", "pass"];
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
      ];                                                 // total: 13 Eminence, 5 Verdance bonuses
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
      player.reservedArtifactIds  = [...ENDGAME_RESERVED];
      player.privateReservedArtifactIds = [];
      player.affinities  = { flare: 0, continuum: 0, verdance: 0, abyss: 3, radiance: 2, singularity: 0 };
      player.bonuses   = { flare: 3, continuum: 0, verdance: 5, abyss: 0, radiance: 0, singularity: 0 };
      player.eminence    = 13;
      player.luminaries = [];
      // Clear any luminaryAffinities entries owned by this player so that a
      // subsequent Luminary summon starts with a fresh summonedAtTurnCount.
      // Without this, stale entries from a previous summon satisfy timing checks
      // immediately and cause effects (e.g. Cinder Mandate burn) to fire on the
      // wrong turn.
      state.luminaryAffinities = state.luminaryAffinities.filter(
        (x) => x.ownerId !== player.playerId,
      );
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
    summary: describeAction(action, player),
    turn: state.roundNumber,
  });
  // Mark the core action slot as consumed until the full resolution pipeline
  // releases the incoming player.
  if (CORE_ACTIONS.has(action.type)) {
    state.coreActionUsed = true;
  }
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
        const verb = action.type === "forge_reserved_artifact" ? "Forged reserved" : "Forged";
        const eminence = card?.eminence ?? 0;
        return `${verb} "${lore.name}"${eminence ? ` (+${eminence} Eminence)` : ""}`;
      }
      return "Forged an Artifact";
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
  // ensure victoryRequirement exists (added in Oblivion-as-threshold feature)
  if (typeof state.victoryRequirement !== "number" || state.victoryRequirement < WIN_THRESHOLD) {
    state.victoryRequirement = WIN_THRESHOLD;
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
  }
  // ensure pendingLuminaryActivationEvents array exists (added in activation cinematic feature)
  if (!Array.isArray(state.pendingLuminaryActivationEvents)) {
    state.pendingLuminaryActivationEvents = [];
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
  if (typeof state.glassOrchardTriggered !== "boolean") {
    state.glassOrchardTriggered = false;
  }
  if (!("firstHungerAvailable" in state)) {
    state.firstHungerAvailable = null;
  }
  // ensure burnPile and burnEvents exist (added in Burn keyword feature)
  if (!Array.isArray(state.burnPile)) {
    state.burnPile = [];
  }
  if (!Array.isArray(state.burnEvents)) {
    state.burnEvents = [];
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
    if (typeof avatarSeedState.pendingEminence !== "number") {
      avatarSeedState.pendingEminence = 0;
    }
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

  const players = stateData.players.map((p) => {
    const aiEntry = aiMap?.get(p.playerId);
    return {
      playerId: p.playerId,
      playerName: p.playerName,
      civName: p.civName ?? null,
      avatarId: avatarMap?.get(p.playerId) ?? null,
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
      plannedAction: p.plannedAction ?? null,
      plannedActionCancelReason: p.plannedActionCancelReason ?? null,
    };
  });

  return {
    roomId,
    status: stateData.phase === "finished" ? "finished" : status,
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
    pendingTurnTransition: stateData.pendingTurnTransition ?? null,
    devLuminarySequenceActive: stateData.devLuminarySequenceActive === true,
    pendingLuminaryChoice: stateData.pendingLuminaryChoice ?? null,
    // v0.8 marker / effect state exposed to clients
    artifactMarkers: stateData.artifactMarkers ?? {},
    forgottenHourCycle: stateData.forgottenHourCycle ?? {},
    avatarSeedDeckSeeds: stateData.avatarSeedState?.deckSeeds ?? [],
    avatarSeedOwnerId: stateData.avatarSeedState?.ownerId ?? null,
    firstHungerAvailable: stateData.firstHungerAvailable ?? null,
    catalystBloomBurnCount: stateData.catalystBloomBurnCount ?? 0,
    concordanceMandalaTriggered: stateData.concordanceMandalaTriggered ?? false,
    glassOrchardTriggered: stateData.glassOrchardTriggered ?? false,
    burnPile: stateData.burnPile ?? [],
    burnEvents: stateData.burnEvents ?? [],
    coreActionUsed: stateData.coreActionUsed ?? false,
  };
}
