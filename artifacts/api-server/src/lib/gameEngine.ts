// ─── Luminae Game Engine ────────────────────────────────────────────────────
// Original tabletop engine-building game inspired by gem-market tableau games.
// Original names, original card designs, original rules presentation.

import { z } from "zod";
import { getCardLore } from "./cardLore";

export type CrystalColor = "ruby" | "sapphire" | "emerald" | "onyx" | "pearl";

export type CrystalColorWithFlux = CrystalColor | "flux";

export interface LuminaryAffinity {
  luminaryId: string;
  ownerId: string;
  activeAffinity: CrystalColor;
  eligibleAffinities: CrystalColor[];
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

export type CrystalCounts = Record<CrystalColorWithFlux, number>;

export type CardMarkerType = 'forgotten' | 'condemned' | 'nullified' | 'avatar_seed';

export interface CardMarker {
  type: CardMarkerType;
  /** Player ID of the Luminary owner who placed the marker. */
  ownerId: string;
  /** turnCount when the Luminary was summoned (used for timing checks). */
  summonedAtTurnCount: number;
}

export interface AvatarSeedState {
  ownerId: string;
  summonedAtTurnCount: number;
  /** Pending eminence accumulated from opponents forging seeded cards. */
  pendingLumens: number;
  /** Card IDs with Avatar Seed tokens still sitting at the top of their source deck. */
  deckSeeds: string[];
  /** True once the end-of-next-turn payout has fired (prevents double-pay). */
  payoutDone: boolean;
}

export const CRYSTAL_COLORS: CrystalColor[] = [
  "ruby",
  "pearl",
  "emerald",
  "sapphire",
  "onyx",
];

export interface ArtifactCard {
  id: string;
  tier: 1 | 2 | 3;
  bonusColor: CrystalColor;
  lumens: number;
  cost: CrystalCounts;
}

export interface LuminaryDef {
  id: string;
  name: string;
  domain: string;
  lumens: number;
  /** When set, this Luminary deals Oblivion instead of awarding Eminence.
   *  On claim, ALL players lose this many Eminence. Mutually exclusive with
   *  a positive lumens award (lumens must be 0 when oblivion is set). */
  oblivion?: number;
  requirements: CrystalCounts;
  flavor: string;
  summonColor: string;
  summonSecondaryColor: string;
  auraStyle: string;
  /** Display name for this Luminary's special effect (v0.8+). */
  effectName?: string;
}

export interface PlayerGameState {
  playerId: string;
  playerName: string;
  /** Custom civilization name set by the player. Falls back to "{playerName}'s Civilization" on the client when absent. */
  civName?: string;
  crystals: CrystalCounts;
  bonuses: CrystalCounts;
  lumens: number;
  reservedCardIds: string[];
  purchasedCardIds: string[];
  /** Card IDs that were forged with zero crystals spent (fully covered by bonuses at forge time). */
  discountedForgeIds: string[];
  /** Per-card bonus snapshot captured at forge time. Key = card ID. Added in bonus-snapshot feature. */
  purchasedCardBonusSnapshots?: Record<string, CrystalCounts>;
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

export interface GameStateData {
  currentPlayerIndex: number;
  roundNumber: number;
  turnCount: number;
  phase: "playing" | "last_round" | "finished";
  finishReason?: "win" | "surrender";
  crystalBank: CrystalCounts;
  marketTier1: string[];
  marketTier2: string[];
  marketTier3: string[];
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
   * `purchase_card`) from leaking into the next broadcast and triggering
   * animation re-fires on non-turn mutations such as `toggle_luminary_affinity`
   * or `resolve_summon`.  Non-turn cases stamp their own type explicitly;
   * turn actions are covered by the single assignment at the bottom of
   * `applyAction` that runs after the switch falls through.
   */
  lastAction: Record<string, unknown> | null;
  actionLog: ActionLogEntry[];
  turnTimerSeconds: number | null;
  turnDeadline: number | null;
  version: number;
  pendingSummonEvents: PendingSummonEvent[];
  /** Card markers: Forgotten / Condemned / Nullified / Avatar Seed (v0.8+). */
  marketMarkers?: Record<string, CardMarker>;
  /** State for Seed Beyond Seasons Avatar Seeds (v0.8+). */
  avatarSeedState?: AvatarSeedState;
  /** Count of distinct burn effects since end of Catalyst Bloom owner's last turn (v0.8+). */
  catalystBloomBurnCount?: number;
  /** True once Concordance Mandala's Perfect Coherence has fired (one per game, v0.8+). */
  concordanceMandalaTriggered?: boolean;
  /** True once Glass Orchard's Perfect Replication has fired (one per game, v0.8+). */
  glassOrchardTriggered?: boolean;
  /** PlayerId if First Hunger Assimilation is available this turn (cleared on use or turn end, v0.8+). */
  firstHungerAvailable?: string | null;
}

const ACTION_LOG_MAX = 100;
const COLOR_LABEL: Record<CrystalColor, string> = {
  ruby: "Flare",
  sapphire: "Continuum",
  emerald: "Verdance",
  onyx: "Abyss",
  pearl: "Radiance",
};

function pushLog(state: GameStateData, entry: ActionLogEntry): void {
  if (!state.actionLog) state.actionLog = [];
  state.actionLog.push(entry);
  if (state.actionLog.length > ACTION_LOG_MAX) {
    state.actionLog.splice(0, state.actionLog.length - ACTION_LOG_MAX);
  }
}

// ─── Card Catalog ────────────────────────────────────────────────────────────

function cost(
  r: number,
  s: number,
  e: number,
  o: number,
  p: number,
): CrystalCounts {
  return { ruby: r, sapphire: s, emerald: e, onyx: o, pearl: p, flux: 0 };
}

const CARD_CATALOG: ArtifactCard[] = [
  // ─── Tier 1 (40 cards — 8 per gem) ───────────────────────────────────────
  // Ruby bonus
  { id: "t1r01", tier: 1, bonusColor: "ruby", lumens: 0, cost: cost(0, 0, 1, 1, 1) },
  { id: "t1r02", tier: 1, bonusColor: "ruby", lumens: 0, cost: cost(0, 0, 1, 2, 0) },
  { id: "t1r03", tier: 1, bonusColor: "ruby", lumens: 0, cost: cost(0, 1, 1, 0, 1) },
  { id: "t1r04", tier: 1, bonusColor: "ruby", lumens: 0, cost: cost(0, 2, 0, 0, 0) },
  { id: "t1r05", tier: 1, bonusColor: "ruby", lumens: 0, cost: cost(0, 0, 0, 2, 2) },
  { id: "t1r06", tier: 1, bonusColor: "ruby", lumens: 0, cost: cost(0, 2, 1, 0, 0) },
  { id: "t1r07", tier: 1, bonusColor: "ruby", lumens: 0, cost: cost(0, 0, 2, 2, 0) },
  { id: "t1r08", tier: 1, bonusColor: "ruby", lumens: 1, cost: cost(0, 0, 0, 0, 4) },
  // Sapphire bonus
  { id: "t1s01", tier: 1, bonusColor: "sapphire", lumens: 0, cost: cost(1, 0, 1, 0, 1) },
  { id: "t1s02", tier: 1, bonusColor: "sapphire", lumens: 0, cost: cost(2, 0, 1, 0, 0) },
  { id: "t1s03", tier: 1, bonusColor: "sapphire", lumens: 0, cost: cost(1, 0, 0, 1, 1) },
  { id: "t1s04", tier: 1, bonusColor: "sapphire", lumens: 0, cost: cost(1, 0, 0, 0, 2) },
  { id: "t1s05", tier: 1, bonusColor: "sapphire", lumens: 0, cost: cost(0, 0, 0, 2, 2) },
  { id: "t1s06", tier: 1, bonusColor: "sapphire", lumens: 0, cost: cost(1, 0, 2, 0, 0) },
  { id: "t1s07", tier: 1, bonusColor: "sapphire", lumens: 0, cost: cost(2, 0, 0, 2, 0) },
  { id: "t1s08", tier: 1, bonusColor: "sapphire", lumens: 1, cost: cost(0, 0, 4, 0, 0) },
  // Emerald bonus
  { id: "t1e01", tier: 1, bonusColor: "emerald", lumens: 0, cost: cost(1, 1, 0, 0, 1) },
  { id: "t1e02", tier: 1, bonusColor: "emerald", lumens: 0, cost: cost(0, 2, 0, 1, 0) },
  { id: "t1e03", tier: 1, bonusColor: "emerald", lumens: 0, cost: cost(1, 1, 0, 1, 0) },
  { id: "t1e04", tier: 1, bonusColor: "emerald", lumens: 0, cost: cost(0, 3, 0, 0, 0) },
  { id: "t1e05", tier: 1, bonusColor: "emerald", lumens: 0, cost: cost(2, 0, 0, 0, 2) },
  { id: "t1e06", tier: 1, bonusColor: "emerald", lumens: 0, cost: cost(0, 1, 0, 1, 2) },
  { id: "t1e07", tier: 1, bonusColor: "emerald", lumens: 0, cost: cost(0, 0, 0, 2, 1) },
  { id: "t1e08", tier: 1, bonusColor: "emerald", lumens: 1, cost: cost(0, 0, 0, 4, 0) },
  // Onyx bonus
  { id: "t1o01", tier: 1, bonusColor: "onyx", lumens: 0, cost: cost(0, 1, 1, 0, 1) },
  { id: "t1o02", tier: 1, bonusColor: "onyx", lumens: 0, cost: cost(0, 1, 0, 0, 2) },
  { id: "t1o03", tier: 1, bonusColor: "onyx", lumens: 0, cost: cost(1, 0, 1, 0, 1) },
  { id: "t1o04", tier: 1, bonusColor: "onyx", lumens: 0, cost: cost(0, 0, 2, 1, 0) },
  { id: "t1o05", tier: 1, bonusColor: "onyx", lumens: 0, cost: cost(2, 1, 0, 0, 0) },
  { id: "t1o06", tier: 1, bonusColor: "onyx", lumens: 0, cost: cost(0, 2, 2, 0, 0) },
  { id: "t1o07", tier: 1, bonusColor: "onyx", lumens: 0, cost: cost(1, 0, 0, 1, 2) },
  { id: "t1o08", tier: 1, bonusColor: "onyx", lumens: 1, cost: cost(0, 4, 0, 0, 0) },
  // Pearl bonus
  { id: "t1p01", tier: 1, bonusColor: "pearl", lumens: 0, cost: cost(1, 1, 0, 1, 0) },
  { id: "t1p02", tier: 1, bonusColor: "pearl", lumens: 0, cost: cost(0, 1, 0, 2, 0) },
  { id: "t1p03", tier: 1, bonusColor: "pearl", lumens: 0, cost: cost(1, 0, 1, 1, 0) },
  { id: "t1p04", tier: 1, bonusColor: "pearl", lumens: 0, cost: cost(2, 0, 0, 0, 1) },
  { id: "t1p05", tier: 1, bonusColor: "pearl", lumens: 0, cost: cost(0, 2, 0, 0, 2) },
  { id: "t1p06", tier: 1, bonusColor: "pearl", lumens: 0, cost: cost(1, 0, 1, 0, 2) },
  { id: "t1p07", tier: 1, bonusColor: "pearl", lumens: 0, cost: cost(0, 0, 1, 2, 1) },
  { id: "t1p08", tier: 1, bonusColor: "pearl", lumens: 1, cost: cost(0, 0, 4, 0, 0) },

  // ─── Tier 2 (30 cards — 6 per gem) ───────────────────────────────────────
  // Ruby bonus
  { id: "t2r01", tier: 2, bonusColor: "ruby", lumens: 1, cost: cost(0, 2, 0, 3, 2) },
  { id: "t2r02", tier: 2, bonusColor: "ruby", lumens: 2, cost: cost(0, 1, 4, 2, 0) },
  { id: "t2r03", tier: 2, bonusColor: "ruby", lumens: 2, cost: cost(3, 0, 0, 0, 3) },
  { id: "t2r04", tier: 2, bonusColor: "ruby", lumens: 1, cost: cost(2, 0, 2, 0, 2) },
  { id: "t2r05", tier: 2, bonusColor: "ruby", lumens: 2, cost: cost(0, 3, 0, 2, 2) },
  { id: "t2r06", tier: 2, bonusColor: "ruby", lumens: 2, cost: cost(0, 0, 0, 5, 0) },
  // Sapphire bonus
  { id: "t2s01", tier: 2, bonusColor: "sapphire", lumens: 1, cost: cost(2, 0, 3, 0, 2) },
  { id: "t2s02", tier: 2, bonusColor: "sapphire", lumens: 2, cost: cost(4, 0, 0, 2, 1) },
  { id: "t2s03", tier: 2, bonusColor: "sapphire", lumens: 2, cost: cost(0, 3, 0, 0, 3) },
  { id: "t2s04", tier: 2, bonusColor: "sapphire", lumens: 1, cost: cost(0, 0, 2, 0, 3) },
  { id: "t2s05", tier: 2, bonusColor: "sapphire", lumens: 2, cost: cost(5, 0, 0, 0, 0) },
  { id: "t2s06", tier: 2, bonusColor: "sapphire", lumens: 2, cost: cost(2, 0, 0, 3, 2) },
  // Emerald bonus
  { id: "t2e01", tier: 2, bonusColor: "emerald", lumens: 1, cost: cost(3, 2, 0, 0, 2) },
  { id: "t2e02", tier: 2, bonusColor: "emerald", lumens: 2, cost: cost(2, 4, 0, 1, 0) },
  { id: "t2e03", tier: 2, bonusColor: "emerald", lumens: 2, cost: cost(0, 0, 3, 3, 0) },
  { id: "t2e04", tier: 2, bonusColor: "emerald", lumens: 1, cost: cost(0, 2, 0, 2, 2) },
  { id: "t2e05", tier: 2, bonusColor: "emerald", lumens: 2, cost: cost(0, 5, 0, 0, 0) },
  { id: "t2e06", tier: 2, bonusColor: "emerald", lumens: 2, cost: cost(2, 0, 0, 2, 3) },
  // Onyx bonus
  { id: "t2o01", tier: 2, bonusColor: "onyx", lumens: 1, cost: cost(0, 2, 2, 0, 3) },
  { id: "t2o02", tier: 2, bonusColor: "onyx", lumens: 2, cost: cost(1, 0, 2, 0, 4) },
  { id: "t2o03", tier: 2, bonusColor: "onyx", lumens: 2, cost: cost(3, 0, 0, 3, 0) },
  { id: "t2o04", tier: 2, bonusColor: "onyx", lumens: 1, cost: cost(2, 0, 3, 0, 2) },
  { id: "t2o05", tier: 2, bonusColor: "onyx", lumens: 2, cost: cost(0, 0, 5, 0, 0) },
  { id: "t2o06", tier: 2, bonusColor: "onyx", lumens: 2, cost: cost(2, 3, 0, 0, 2) },
  // Pearl bonus
  { id: "t2p01", tier: 2, bonusColor: "pearl", lumens: 1, cost: cost(2, 3, 0, 2, 0) },
  { id: "t2p02", tier: 2, bonusColor: "pearl", lumens: 2, cost: cost(0, 2, 1, 4, 0) },
  { id: "t2p03", tier: 2, bonusColor: "pearl", lumens: 2, cost: cost(0, 0, 3, 0, 3) },
  { id: "t2p04", tier: 2, bonusColor: "pearl", lumens: 1, cost: cost(3, 2, 0, 0, 2) },
  { id: "t2p05", tier: 2, bonusColor: "pearl", lumens: 2, cost: cost(0, 0, 0, 0, 5) },
  { id: "t2p06", tier: 2, bonusColor: "pearl", lumens: 2, cost: cost(0, 2, 3, 2, 0) },

  // ─── Tier 3 (20 cards — 4 per gem) ───────────────────────────────────────
  // Ruby bonus
  { id: "t3r01", tier: 3, bonusColor: "ruby", lumens: 3, cost: cost(3, 0, 0, 5, 3) },
  { id: "t3r02", tier: 3, bonusColor: "ruby", lumens: 4, cost: cost(0, 0, 3, 6, 3) },
  { id: "t3r03", tier: 3, bonusColor: "ruby", lumens: 3, cost: cost(0, 5, 0, 3, 3) },
  { id: "t3r04", tier: 3, bonusColor: "ruby", lumens: 5, cost: cost(0, 0, 7, 3, 3) },
  // Sapphire bonus
  { id: "t3s01", tier: 3, bonusColor: "sapphire", lumens: 3, cost: cost(5, 3, 0, 0, 3) },
  { id: "t3s02", tier: 3, bonusColor: "sapphire", lumens: 4, cost: cost(6, 3, 0, 3, 0) },
  { id: "t3s03", tier: 3, bonusColor: "sapphire", lumens: 3, cost: cost(3, 0, 5, 3, 0) },
  { id: "t3s04", tier: 3, bonusColor: "sapphire", lumens: 5, cost: cost(3, 7, 0, 0, 3) },
  // Emerald bonus
  { id: "t3e01", tier: 3, bonusColor: "emerald", lumens: 3, cost: cost(0, 5, 3, 0, 3) },
  { id: "t3e02", tier: 3, bonusColor: "emerald", lumens: 4, cost: cost(3, 6, 0, 3, 0) },
  { id: "t3e03", tier: 3, bonusColor: "emerald", lumens: 3, cost: cost(0, 3, 0, 5, 3) },
  { id: "t3e04", tier: 3, bonusColor: "emerald", lumens: 5, cost: cost(3, 3, 7, 0, 0) },
  // Onyx bonus
  { id: "t3o01", tier: 3, bonusColor: "onyx", lumens: 3, cost: cost(0, 3, 5, 3, 0) },
  { id: "t3o02", tier: 3, bonusColor: "onyx", lumens: 4, cost: cost(0, 3, 6, 0, 3) },
  { id: "t3o03", tier: 3, bonusColor: "onyx", lumens: 3, cost: cost(3, 0, 3, 0, 5) },
  { id: "t3o04", tier: 3, bonusColor: "onyx", lumens: 5, cost: cost(0, 3, 3, 7, 0) },
  // Pearl bonus
  { id: "t3p01", tier: 3, bonusColor: "pearl", lumens: 3, cost: cost(3, 0, 3, 5, 0) },
  { id: "t3p02", tier: 3, bonusColor: "pearl", lumens: 4, cost: cost(3, 0, 3, 0, 6) },
  { id: "t3p03", tier: 3, bonusColor: "pearl", lumens: 3, cost: cost(5, 0, 3, 0, 3) },
  { id: "t3p04", tier: 3, bonusColor: "pearl", lumens: 5, cost: cost(0, 3, 0, 3, 7) },
];

export const LUMINARIES: LuminaryDef[] = [
  // ── Mono-color Luminaries (2 Eminence) ──────────────────────────────────────
  {
    id: "lum_moth",
    name: "Red Moth",
    domain: "Rupture",
    lumens: 2,
    requirements: { ruby: 6, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
    flavor: "Where it passes, the universe is divided into before and after.",
    summonColor: "#ef4444",
    summonSecondaryColor: "#7f1d1d",
    auraStyle: "fire",
    effectName: "Rupture of the Still",
  },
  {
    id: "lum_tide",
    name: "The Tide Architect",
    domain: "Tides",
    lumens: 2,
    requirements: { ruby: 0, sapphire: 6, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
    flavor: "Possibility collapses to its bias.",
    summonColor: "#60a5fa",
    summonSecondaryColor: "#e2e8f0",
    auraStyle: "tide",
    effectName: "The Observer Effect",
  },
  {
    id: "lum_verdant",
    name: "The Verdant Oracle",
    domain: "Verdance",
    lumens: 2,
    requirements: { ruby: 0, sapphire: 0, emerald: 5, onyx: 0, pearl: 0, flux: 0 },
    flavor: "It answers only after the question has taken root.",
    summonColor: "#4ade80",
    summonSecondaryColor: "#166534",
    auraStyle: "verdant",
    effectName: "Early Bloom",
  },
  {
    id: "lum_void",
    name: "The Void Warden",
    domain: "Void",
    lumens: 0,
    oblivion: 4,
    requirements: { ruby: 0, sapphire: 0, emerald: 0, onyx: 6, pearl: 0, flux: 0 },
    flavor: "In the space between stars, something watches without eyes.",
    summonColor: "#4c1d95",
    summonSecondaryColor: "#0a0a14",
    auraStyle: "void",
    effectName: "Oblivion",
  },
  {
    id: "lum_radiant",
    name: "Concordance Mandala",
    domain: "Coherence",
    lumens: 2,
    requirements: { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 6, flux: 0 },
    flavor: "Truth is not revealed. It is aligned.",
    summonColor: "#fef9c3",
    summonSecondaryColor: "#2ecc71",
    auraStyle: "radiant",
    effectName: "Perfect Coherence",
  },
  // ── Dual-color Luminaries (3 Eminence) ──────────────────────────────────────
  {
    id: "lum_astral",
    name: "Phoenix Paradox",
    domain: "Recurrence",
    lumens: 3,
    requirements: { ruby: 4, sapphire: 4, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
    flavor: "Every ending becomes fuel. Every return comes back less innocent.",
    summonColor: "#f43f5e",
    summonSecondaryColor: "#3d6bff",
    auraStyle: "astral",
    effectName: "Ash-Seeking Recurrence",
  },
  {
    id: "lum_bloom",
    name: "Catalyst Bloom",
    domain: "Aftergrowth",
    lumens: 3,
    requirements: { ruby: 4, sapphire: 0, emerald: 4, onyx: 0, pearl: 0, flux: 0 },
    flavor: "It waits for the nova to wound the world, then flowers in the scar.",
    summonColor: "#86efac",
    summonSecondaryColor: "#7f1d1d",
    auraStyle: "bloom",
    effectName: "Aftergrowth",
  },
  {
    id: "lum_forge",
    name: "The Iron Harbinger",
    domain: "Ruin",
    lumens: 3,
    requirements: { ruby: 4, sapphire: 0, emerald: 0, onyx: 4, pearl: 0, flux: 0 },
    flavor: "The hammer falls only after the future has already broken.",
    summonColor: "#2ecc71",
    summonSecondaryColor: "#7b1fa2",
    auraStyle: "storm",
    effectName: "Impact Extinction",
  },
  {
    id: "lum_compass",
    name: "???",
    domain: "Erasure",
    lumens: 3,
    requirements: { ruby: 0, sapphire: 4, emerald: 0, onyx: 4, pearl: 0, flux: 0 },
    flavor: "Everyone remembered something happened, but no one can recall what was lost.",
    summonColor: "#38bdf8",
    summonSecondaryColor: "#0a0a14",
    auraStyle: "compass",
    effectName: "The Forgotten Hour",
  },
  {
    id: "lum_seed",
    name: "The Seed Beyond Seasons",
    domain: "Propagation",
    lumens: 3,
    requirements: { ruby: 0, sapphire: 4, emerald: 4, onyx: 0, pearl: 0, flux: 0 },
    flavor: "It leaves its avatars where tomorrow has already begun to remember.",
    summonColor: "#38bdf8",
    summonSecondaryColor: "#4ade80",
    auraStyle: "compass",
    effectName: "Avatar Seeds",
  },
  {
    id: "lum_orchard",
    name: "Glass Orchard",
    domain: "Replication",
    lumens: 3,
    requirements: { ruby: 0, sapphire: 0, emerald: 4, onyx: 0, pearl: 4, flux: 0 },
    flavor: "It learned to copy itself perfectly, and called the absence of error peace.",
    summonColor: "#4ade80",
    summonSecondaryColor: "#fef9c3",
    auraStyle: "verdant",
    effectName: "Perfect Replication",
  },
  {
    id: "lum_pale",
    name: "The Pale Merchant",
    domain: "Balance",
    lumens: 3,
    requirements: { ruby: 0, sapphire: 0, emerald: 0, onyx: 4, pearl: 4, flux: 0 },
    flavor: "Every bargain reveals one truth and buries another.",
    summonColor: "#cbd5e1",
    summonSecondaryColor: "#0a0a14",
    auraStyle: "pale",
    effectName: "Balance Due",
  },
  // ── Triple-color Luminaries (2–4 Eminence) ──────────────────────────────────
  {
    id: "lum_ember",
    name: "The Ember Sovereign",
    domain: "Flame",
    lumens: 4,
    requirements: { ruby: 3, sapphire: 0, emerald: 0, onyx: 3, pearl: 3, flux: 0 },
    flavor: "What cannot survive the fire is granted the mercy of disappearance.",
    summonColor: "#ff5a3c",
    summonSecondaryColor: "#7b1fa2",
    auraStyle: "fire",
    effectName: "Cinder Mandate",
  },
  {
    id: "lum_hunger",
    name: "The First Hunger",
    domain: "Assimilation",
    lumens: 2,
    requirements: { ruby: 3, sapphire: 0, emerald: 3, onyx: 0, pearl: 3, flux: 0 },
    flavor: "Its first act is consumption. Its second is perfect repetition.",
    summonColor: "#fbbf24",
    summonSecondaryColor: "#4ade80",
    auraStyle: "oracle",
    effectName: "Assimilation",
  },
  {
    id: "lum_null",
    name: "The Null Sovereign",
    domain: "Transcendence",
    lumens: 0,
    requirements: { ruby: 0, sapphire: 4, emerald: 0, onyx: 4, pearl: 4, flux: 0 },
    flavor: "Past the last observable star, entire futures fall silent without being destroyed.",
    summonColor: "#0f172a",
    summonSecondaryColor: "#a8b8e8",
    auraStyle: "null",
    effectName: "Black Domain",
  },
  // ── Deferred / Inactive Luminaries (not in active summon pool) ────────────
  {
    id: "lum_oracle",
    name: "The Cosmic Oracle",
    domain: "Prophecy",
    lumens: 4,
    requirements: { ruby: 3, sapphire: 3, emerald: 3, onyx: 0, pearl: 0, flux: 0 },
    flavor: "She sees what will be, and what might have been, and cannot tell the difference.",
    summonColor: "#fbbf24",
    summonSecondaryColor: "#ef4444",
    auraStyle: "oracle",
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
 * Compute the player's Kardashev tier from their purchased card IDs and the
 * set of card IDs that were forged entirely through permanent bonus discounts.
 * Logic mirrors getKardashevTier in the frontend kardashev.ts.
 */
function computeKardashevTier(
  purchasedCardIds: ReadonlyArray<string>,
  discountedForgeIds: ReadonlyArray<string>,
): 0 | 1 | 2 | 3 {
  if (purchasedCardIds.length === 0) return 0;

  const discountedSet = new Set(discountedForgeIds);
  const cards: Array<{ id: string; tier: number }> = [];
  for (const id of purchasedCardIds) {
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
 * @param oldTier   Tier computed BEFORE the card was added.
 * @param isDiscount  Whether the card was forged with zero crystals spent.
 * @param cardTier  Artifact tier of the forged card (1, 2, or 3).
 */
function checkKardashevAdvance(
  state: GameStateData,
  player: PlayerGameState,
  oldTier: 0 | 1 | 2 | 3,
  isDiscount: boolean,
  cardTier: number,
): void {
  const newTier = computeKardashevTier(
    player.purchasedCardIds,
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

// Luminaries in the active summon pool for v0.8.
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

export function zeroCrystals(): CrystalCounts {
  return { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0 };
}

function crystalBankForPlayerCount(count: number): CrystalCounts {
  const n = count === 2 ? 4 : count === 3 ? 5 : 7;
  return { ruby: n, sapphire: n, emerald: n, onyx: n, pearl: n, flux: 5 };
}

// ─── Game Initialization ─────────────────────────────────────────────────────

export function initializeGame(
  players: { id: string; name: string }[],
  playerCount: number,
): GameStateData {
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
  const activeLuminaries = shuffle(AVAILABLE_LUMINARIES.map((l) => l.id)).slice(
    0,
    lumCount,
  );

  const marketTier1 = tier1Ids.slice(0, 4);
  const deckTier1 = tier1Ids.slice(4);
  const marketTier2 = tier2Ids.slice(0, 4);
  const deckTier2 = tier2Ids.slice(4);
  const marketTier3 = tier3Ids.slice(0, 4);
  const deckTier3 = tier3Ids.slice(4);

  const playerStates: PlayerGameState[] = players.map((p) => ({
    playerId: p.id,
    playerName: p.name,
    crystals: zeroCrystals(),
    bonuses: zeroCrystals(),
    lumens: 0,
    reservedCardIds: [],
    purchasedCardIds: [],
    discountedForgeIds: [],
    luminaries: [],
    isConnected: true,
    plannedAction: null,
    plannedActionCancelReason: null,
  }));

  const startingPlayerIndex = Math.floor(Math.random() * playerStates.length);
  const startingPlayer = playerStates[startingPlayerIndex];

  return {
    currentPlayerIndex: startingPlayerIndex,
    roundNumber: 1,
    turnCount: 0,
    phase: "playing",
    crystalBank: crystalBankForPlayerCount(playerCount),
    marketTier1,
    marketTier2,
    marketTier3,
    deckTier1,
    deckTier2,
    deckTier3,
    activeLuminaries,
    luminaryAffinities: [],
    pendingSummonEvents: [],
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
  };
}

// ─── Action Types ─────────────────────────────────────────────────────────────

type ActionType =
  | "take_three_crystals"
  | "take_two_crystals"
  | "reserve_card"
  | "purchase_card"
  | "purchase_reserved"
  | "assimilate"
  | "pass"
  | "surrender"
  | "toggle_luminary_affinity"
  | "resolve_summon"
  | "plan_action"
  | "cancel_plan"
  | "tutorial_fast_forward"
  | "set_civ_name";

export interface ActionPayload {
  type: ActionType;
  crystals?: Partial<CrystalCounts>;
  crystal?: CrystalColor;
  returnCrystals?: Partial<CrystalCounts>;
  cardId?: string;
  tier?: 1 | 2 | 3;
  luminaryId?: string;
  affinity?: CrystalColor;
  eventId?: string;
  plannedActionData?: ActionPayload;
  civName?: string;
}

// ─── Luminary Affinity Helpers ────────────────────────────────────────────────

// Maps a Luminary's summonColor hex to its closest CrystalColor affinity.
// Used to pick a sensible default active affinity when claiming a Luminary.
const SUMMON_COLOR_TO_AFFINITY: Partial<Record<string, CrystalColor>> = {
  // Ruby / Radiance
  "#ff5a3c": "ruby",   // lum_ember
  "#f43f5e": "ruby",   // lum_astral
  "#fbbf24": "ruby",   // lum_oracle (ruby is first eligible)
  // Sapphire / Continuum
  "#3d6bff": "sapphire",
  "#60a5fa": "sapphire", // lum_tide
  "#38bdf8": "sapphire", // lum_compass
  // Emerald / Verdance
  "#2ecc71": "emerald",
  "#4ade80": "emerald",  // lum_verdant
  "#86efac": "emerald",  // lum_bloom (emerald is first eligible)
  // Onyx / Abyss
  "#7b1fa2": "onyx",
  "#4c1d95": "onyx",     // lum_void
  // Pearl / Singularity
  "#a8b8e8": "pearl",
  "#fef9c3": "pearl",    // lum_radiant
  "#cbd5e1": "pearl",    // lum_pale (pearl is first eligible)
};

function defaultActiveAffinity(
  lum: LuminaryDef,
  eligible: CrystalColor[],
): CrystalColor {
  if (eligible.length === 0) return "ruby";
  const mapped = SUMMON_COLOR_TO_AFFINITY[lum.summonColor.toLowerCase()];
  if (mapped && eligible.includes(mapped)) return mapped;
  return eligible[0];
}

/**
 * Returns the player's effective bonus counts, including any +1 bonuses from
 * Living Luminary Affinities that have become active (i.e. were claimed on a
 * prior turn).  Used in place of player.bonuses wherever permanent card bonuses
 * are normally counted: effectiveCost, canAfford, checkLuminaries.
 */
/**
 * Merge card-purchased bonuses with the "Fixed Bond" living-affinity bonus for
 * every Luminary the player has claimed.
 *
 * Fixed Bond — universal v0.8 rule:
 *   Starting the turn AFTER a Luminary is summoned, the owner gains +1 to the
 *   Luminary's active affinity on every card purchase / cost calculation.
 *   For mono-color Luminaries (Verdant Oracle, Void Warden, Concordance Mandala)
 *   there is exactly one eligible affinity; for dual/triple Luminaries the owner
 *   can toggle which affinity is active (defaults to first eligible).
 *   This mechanism is identical for ALL 15 Luminaries — there is no separate
 *   "Fixed Bond" flag; the eligibleAffinities length determines whether toggling
 *   is meaningful, not whether the bonus applies.
 */
export function effectiveBonuses(
  state: GameStateData,
  player: PlayerGameState,
): CrystalCounts {
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
  bonusOverride?: CrystalCounts,
): CrystalCounts {
  const bonuses = bonusOverride ?? player.bonuses;
  const result = zeroCrystals();
  for (const color of CRYSTAL_COLORS) {
    result[color] = Math.max(0, card.cost[color] - bonuses[color]);
  }
  return result;
}

function canAfford(
  cost: CrystalCounts,
  playerCrystals: CrystalCounts,
): boolean {
  let fluxNeeded = 0;
  for (const color of CRYSTAL_COLORS) {
    const deficit = Math.max(0, cost[color] - playerCrystals[color]);
    fluxNeeded += deficit;
  }
  return fluxNeeded <= playerCrystals.flux;
}

// ─── Apply Purchase ───────────────────────────────────────────────────────────

function payForCard(
  card: ArtifactCard,
  player: PlayerGameState,
  bank: CrystalCounts,
  bonusOverride?: CrystalCounts,
): void {
  const needed = effectiveCost(card, player, bonusOverride);
  let fluxUsed = 0;
  for (const color of CRYSTAL_COLORS) {
    const fromCrystals = Math.min(needed[color], player.crystals[color]);
    player.crystals[color] -= fromCrystals;
    bank[color] += fromCrystals;
    const deficit = needed[color] - fromCrystals;
    fluxUsed += deficit;
  }
  player.crystals.flux -= fluxUsed;
  bank.flux += fluxUsed;
}

// ─── Luminary Check ───────────────────────────────────────────────────────────

function checkLuminaries(state: GameStateData, player: PlayerGameState): void {
  const liveBonuses = effectiveBonuses(state, player);
  for (const lumId of [...state.activeLuminaries]) {
    if (player.luminaries.includes(lumId)) continue;
    const lum = LUMINARY_MAP.get(lumId);
    if (!lum) continue;
    const qualifies = CRYSTAL_COLORS.every(
      (c) => liveBonuses[c] >= lum.requirements[c],
    );
    if (qualifies) {
      if (isLuminaryAlreadyClaimed(state, lumId)) continue;
      player.luminaries.push(lumId);
      const eligible = CRYSTAL_COLORS.filter((c) => lum.requirements[c] > 0);
      const defaultAffinity = defaultActiveAffinity(lum, eligible);
      state.luminaryAffinities.push({
        luminaryId: lumId,
        ownerId: player.playerId,
        activeAffinity: defaultAffinity,
        eligibleAffinities: eligible,
        summonedAtTurnCount: state.turnCount,
      });
      if (lum.oblivion) {
        // Oblivion — penalise every player, including the one who triggered the claim.
        for (const p of state.players) {
          p.lumens -= lum.oblivion;
        }
        pushLog(state, {
          playerId: player.playerId,
          playerName: player.playerName,
          summary: `Invoked the Oblivion of ${lum.name} (−${lum.oblivion} eminence to all players)`,
          turn: state.roundNumber,
        });
      } else {
        const lumensBeforeSummon = player.lumens;
        player.lumens += lum.lumens;
        // Record the win trigger only when this specific Luminary summon is
        // the action that crosses the threshold (player was below it before
        // the lumens were added, and is at or above it after). This avoids
        // falsely marking wins that were already secured by prior card forges.
        if (
          state.phase === "playing" &&
          lumensBeforeSummon < WIN_THRESHOLD &&
          player.lumens >= WIN_THRESHOLD
        ) {
          state.winTriggerLuminaryId = lumId;
        }
        pushLog(state, {
          playerId: player.playerId,
          playerName: player.playerName,
          summary: `Drew the favor of ${lum.name} (+${lum.lumens} eminence)`,
          turn: state.roundNumber,
        });
      }
      // Queue a summon event so all clients can play the cutscene.
      // eventId uses the current version (before the post-action increment) to
      // produce a stable unique key. Idempotency guard prevents double-push.
      if (!Array.isArray(state.pendingSummonEvents)) {
        state.pendingSummonEvents = [];
      }
      const eventId = `${lumId}-v${state.version}`;
      if (!state.pendingSummonEvents.some((e) => e.eventId === eventId)) {
        state.pendingSummonEvents.push({
          eventId,
          luminaryId: lumId,
          claimedByPlayerId: player.playerId,
          createdAt: Date.now(),
        });
      }
      // Apply the v0.8 on-summon mechanical effect for this Luminary.
      applySummonEffect(state, player, lumId, state.turnCount);
    }
  }
}

function isLuminaryAlreadyClaimed(state: GameStateData, luminaryId: string): boolean {
  return state.players.some((p) => p.luminaries.includes(luminaryId));
}

// ─── Draw Card ───────────────────────────────────────────────────────────────

/**
 * Remove a card from the market and refill the slot from the deck.
 * Handles marker cleanup (removes marker from the removed card) and
 * Avatar Seed token transfer (if the incoming deck card was seeded).
 * Returns the ID of the card that now occupies the slot, or null if the slot
 * was collapsed (deck empty).
 */
function drawIntoMarket(
  state: GameStateData,
  market: string[],
  deck: string[],
  removedId: string,
): string | null {
  const idx = market.indexOf(removedId);
  if (idx === -1) return null;

  // Remove any marker on the leaving card.
  if (state.marketMarkers) delete state.marketMarkers[removedId];

  if (deck.length > 0) {
    const newId = deck.shift()!;
    market[idx] = newId;
    // Transfer Avatar Seed token if the incoming card was seeded in the deck.
    if (state.avatarSeedState) {
      const si = state.avatarSeedState.deckSeeds.indexOf(newId);
      if (si !== -1) {
        state.avatarSeedState.deckSeeds.splice(si, 1);
        if (!state.marketMarkers) state.marketMarkers = {};
        state.marketMarkers[newId] = {
          type: "avatar_seed",
          ownerId: state.avatarSeedState.ownerId,
          summonedAtTurnCount: state.avatarSeedState.summonedAtTurnCount,
        };
      }
    }
    return newId;
  } else {
    market.splice(idx, 1);
    return null;
  }
}

// ─── v0.8 Burn / Scry Helpers ─────────────────────────────────────────────────

/** Sum of all crystal costs on a card (used for "lowest-cost" comparisons). */
function totalCost(card: ArtifactCard): number {
  return CRYSTAL_COLORS.reduce((s, c) => s + (card.cost[c] ?? 0), 0);
}

/** True if the card has at least one of the given colors in its crystal cost. */
function cardHasAffinityIn(card: ArtifactCard, colors: CrystalColor[]): boolean {
  return colors.some((c) => (card.cost[c] ?? 0) > 0);
}

/**
 * Burn (refresh) the single lowest-cost face-up card in `tier`'s market that
 * has NONE of the `excludeColors` in its cost.  Returns the burned card ID, or
 * null if no valid target exists.
 */
function burnLowestCostWithout(
  state: GameStateData,
  tier: 1 | 2 | 3,
  excludeColors: CrystalColor[],
): string | null {
  const market = getMarketForTier(state, tier);
  let bestId: string | null = null;
  let bestCost = Infinity;
  for (const id of market) {
    const card = CARD_MAP.get(id);
    if (!card) continue;
    if (cardHasAffinityIn(card, excludeColors)) continue;
    const tc = totalCost(card);
    if (tc < bestCost) { bestCost = tc; bestId = id; }
  }
  if (!bestId) return null;
  drawIntoMarket(state, getMarketForTier(state, tier), getDeckForTier(state, tier), bestId);
  return bestId;
}

/**
 * Burn (refresh) all face-up cards currently in `tier`'s market.
 * Only the cards present at the moment this function is called are burned;
 * replacement cards drawn from the deck are NOT re-burned.
 * Returns the count of cards that were burned.
 */
function burnAllInTier(state: GameStateData, tier: 1 | 2 | 3): number {
  const snapshot = [...getMarketForTier(state, tier)];
  let count = 0;
  for (const id of snapshot) {
    const market = getMarketForTier(state, tier);
    if (market.includes(id)) {
      drawIntoMarket(state, market, getDeckForTier(state, tier), id);
      count++;
    }
  }
  return count;
}

/**
 * Phoenix Paradox — Ash-Seeking Recurrence cascade for one tier:
 * 1. Find lowest-cost face-up card without Flare (ruby) or Continuum (sapphire).
 * 2. Burn it and publicly log the reveal of the replacement.
 * 3. If the replacement also lacks Flare/Continuum, burn it too — repeat until a
 *    replacement with the right affinity arrives or the deck empties.
 * Each checked replacement is logged as a public reveal event per v0.8 spec.
 * Returns true if at least one card was burned (i.e., one burn effect occurred).
 */
function phoenixParadoxCascade(
  state: GameStateData,
  tier: 1 | 2 | 3,
  player: PlayerGameState,
): boolean {
  const market = getMarketForTier(state, tier);
  const deck = getDeckForTier(state, tier);

  let targetIdx = -1;
  let minCost = Infinity;
  for (let i = 0; i < market.length; i++) {
    const card = CARD_MAP.get(market[i]);
    if (!card) continue;
    if (card.cost.ruby > 0 || card.cost.sapphire > 0) continue;
    const tc = totalCost(card);
    if (tc < minCost) { minCost = tc; targetIdx = i; }
  }
  if (targetIdx === -1) return false;

  // Cascade: keep burning the slot until a qualifying card lands or deck runs out.
  while (true) {
    const cardId = market[targetIdx];
    if (!cardId) break;
    if (state.marketMarkers) delete state.marketMarkers[cardId];

    if (deck.length === 0) {
      market.splice(targetIdx, 1);
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Phoenix Paradox — T${tier} reveal: ${cardId} burned (deck empty — no replacement)`,
        turn: state.roundNumber,
      });
      break;
    }
    const replacement = deck.shift()!;
    market[targetIdx] = replacement;

    // Transfer Avatar Seed if needed.
    if (state.avatarSeedState && !state.avatarSeedState.payoutDone) {
      const si = state.avatarSeedState.deckSeeds.indexOf(replacement);
      if (si !== -1) {
        state.avatarSeedState.deckSeeds.splice(si, 1);
        if (!state.marketMarkers) state.marketMarkers = {};
        state.marketMarkers[replacement] = {
          type: "avatar_seed",
          ownerId: state.avatarSeedState.ownerId,
          summonedAtTurnCount: state.avatarSeedState.summonedAtTurnCount,
        };
      }
    }

    const replCard = CARD_MAP.get(replacement);
    const replQualifies = !!replCard && (replCard.cost.ruby > 0 || replCard.cost.sapphire > 0);
    pushLog(state, {
      playerId: player.playerId, playerName: player.playerName,
      summary: replQualifies
        ? `Phoenix Paradox — T${tier} reveal: ${cardId} burned → ${replacement} revealed (Flare/Continuum ✓ — cascade ends)`
        : `Phoenix Paradox — T${tier} reveal: ${cardId} burned → ${replacement} revealed (no Flare/Continuum — cascade continues)`,
      turn: state.roundNumber,
    });
    if (replQualifies) break;
    // Replacement also lacks required affinity → continue cascade.
  }

  return true;
}

/**
 * Scry top `count` cards of the given tier's deck and reorder:
 * cards with `keepColor` in their cost stay on top (original order),
 * cards without `keepColor` go to the bottom (original order).
 */
function scryAndReorder(
  state: GameStateData,
  tier: 1 | 2 | 3,
  keepColor: CrystalColor,
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

// ─── v0.8 On-Summon Effect Helpers ────────────────────────────────────────────

function applySummonEffect_forgottenHour(
  state: GameStateData,
  player: PlayerGameState,
  summonedAtTurnCount: number,
): void {
  if (!state.marketMarkers) state.marketMarkers = {};
  let count = 0;
  for (const tier of [1, 2, 3] as const) {
    for (const id of getMarketForTier(state, tier)) {
      if (!state.marketMarkers[id]) {
        state.marketMarkers[id] = { type: "forgotten", ownerId: player.playerId, summonedAtTurnCount };
        count++;
      }
    }
  }
  if (count > 0) {
    pushLog(state, {
      playerId: player.playerId, playerName: player.playerName,
      summary: `??? — The Forgotten Hour: ${count} Artifact(s) marked Forgotten (0 Eminence until end of next turn)`,
      turn: state.roundNumber,
    });
  }
}

function applySummonEffect_avatarSeeds(
  state: GameStateData,
  player: PlayerGameState,
  summonedAtTurnCount: number,
): void {
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
    pendingLumens: 0,
    deckSeeds,
    payoutDone: false,
  };
  pushLog(state, {
    playerId: player.playerId, playerName: player.playerName,
    summary: `Seed Beyond Seasons — Avatar Seeds: ${deckSeeds.length} card(s) seeded on deck tops`,
    turn: state.roundNumber,
  });
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
    for (const c of CRYSTAL_COLORS) {
      if ((p.crystals[c] ?? 0) > halfSupply) {
        p.crystals[c]--;
        state.crystalBank[c]++;
        totalReturned++;
      }
    }
  }
  if (totalReturned > 0) {
    pushLog(state, {
      playerId: player.playerId, playerName: player.playerName,
      summary: `Pale Merchant — Balance Due: ${totalReturned} crystal(s) returned`,
      turn: state.roundNumber,
    });
  }
}

function applySummonEffect_cinderMandate(
  state: GameStateData,
  player: PlayerGameState,
  summonedAtTurnCount: number,
): void {
  if (!state.marketMarkers) state.marketMarkers = {};
  let count = 0;
  for (const tier of [1, 2, 3] as const) {
    for (const id of getMarketForTier(state, tier)) {
      const card = CARD_MAP.get(id);
      if (!card) continue;
      // Condemned if lacks ALL of: Flare (ruby), Abyss (onyx), Radiance (pearl)
      if (card.cost.ruby === 0 && card.cost.onyx === 0 && card.cost.pearl === 0) {
        state.marketMarkers[id] = { type: "condemned", ownerId: player.playerId, summonedAtTurnCount };
        count++;
      }
    }
  }
  if (count > 0) {
    pushLog(state, {
      playerId: player.playerId, playerName: player.playerName,
      summary: `Ember Sovereign — Cinder Mandate: ${count} Artifact(s) marked Condemned (burns at start of next turn)`,
      turn: state.roundNumber,
    });
  }
}

function applySummonEffect_blackDomain(
  state: GameStateData,
  player: PlayerGameState,
  summonedAtTurnCount: number,
): void {
  if (!state.marketMarkers) state.marketMarkers = {};
  let count = 0;
  // Only Tier III per spec.
  for (const id of state.marketTier3) {
    const card = CARD_MAP.get(id);
    if (!card) continue;
    // Nullified if lacks ALL of: Continuum (sapphire), Abyss (onyx), Radiance (pearl)
    if (card.cost.sapphire === 0 && card.cost.onyx === 0 && card.cost.pearl === 0) {
      state.marketMarkers[id] = { type: "nullified", ownerId: player.playerId, summonedAtTurnCount };
      count++;
    }
  }
  if (count > 0) {
    pushLog(state, {
      playerId: player.playerId, playerName: player.playerName,
      summary: `Null Sovereign — Black Domain: ${count} Tier III Artifact(s) marked Nullified`,
      turn: state.roundNumber,
    });
  }
}

/**
 * Dispatch the on-summon effect for the given Luminary (v0.8).
 * Called from checkLuminaries immediately after the eminence award.
 */
function applySummonEffect(
  state: GameStateData,
  player: PlayerGameState,
  lumId: string,
  summonedAtTurnCount: number,
): void {
  switch (lumId) {
    case "lum_moth": {
      // Rupture of the Still: burn lowest-cost T3 without Flare, then T2 without Flare.
      const b3 = burnLowestCostWithout(state, 3, ["ruby"]);
      const b2 = burnLowestCostWithout(state, 2, ["ruby"]);
      if (b3 || b2) {
        incrementBloomCount(state);
        pushLog(state, {
          playerId: player.playerId, playerName: player.playerName,
          summary: `Red Moth — Rupture of the Still: burned lowest-cost Artifacts without Flare`,
          turn: state.roundNumber,
        });
      }
      break;
    }
    case "lum_tide": {
      // The Observer Effect: scry+reorder top 3 of T2 and T3 decks by Continuum.
      scryAndReorder(state, 2, "sapphire");
      scryAndReorder(state, 3, "sapphire");
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Tide Architect — The Observer Effect: deck reordered (Continuum cards promoted)`,
        turn: state.roundNumber,
      });
      break;
    }
    case "lum_forge": {
      // Impact Extinction: burn all face-up T3 Artifacts.
      const count = burnAllInTier(state, 3);
      if (count > 0) {
        incrementBloomCount(state);
        pushLog(state, {
          playerId: player.playerId, playerName: player.playerName,
          summary: `Iron Harbinger — Impact Extinction: burned all ${count} Tier III Artifact(s)`,
          turn: state.roundNumber,
        });
      }
      break;
    }
    case "lum_astral": {
      // Ash-Seeking Recurrence: cascade burn T3, then T2.
      // Per-card reveal logs are pushed inside phoenixParadoxCascade.
      const did3 = phoenixParadoxCascade(state, 3, player);
      const did2 = phoenixParadoxCascade(state, 2, player);
      if (did3 || did2) {
        incrementBloomCount(state);
        pushLog(state, {
          playerId: player.playerId, playerName: player.playerName,
          summary: `Phoenix Paradox — Ash-Seeking Recurrence: burned and revealed until Flare/Continuum`,
          turn: state.roundNumber,
        });
      }
      break;
    }
    case "lum_compass": {
      // The Forgotten Hour: mark all face-up market cards as Forgotten.
      applySummonEffect_forgottenHour(state, player, summonedAtTurnCount);
      break;
    }
    case "lum_seed": {
      // Avatar Seeds: reveal and mark top 2 cards of each deck.
      applySummonEffect_avatarSeeds(state, player, summonedAtTurnCount);
      break;
    }
    case "lum_pale": {
      // Balance Due: each player holding more than half starting supply returns 1.
      applySummonEffect_balanceDue(state, player);
      break;
    }
    case "lum_ember": {
      // Cinder Mandate: mark face-up cards without Flare/Abyss/Radiance as Condemned.
      applySummonEffect_cinderMandate(state, player, summonedAtTurnCount);
      break;
    }
    case "lum_null": {
      // Black Domain: mark face-up T3 without Continuum/Abyss/Radiance as Nullified.
      applySummonEffect_blackDomain(state, player, summonedAtTurnCount);
      break;
    }
    case "lum_hunger": {
      // Assimilation: enable this turn's Assimilation action for the summoner.
      state.firstHungerAvailable = player.playerId;
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `First Hunger — Assimilation available: replace forge action this turn`,
        turn: state.roundNumber,
      });
      break;
    }
    // Passive / delayed effects — nothing on summon:
    // lum_verdant: cheaper cost, no arrival effect.
    // lum_void: oblivion handled before this call.
    // lum_radiant (Concordance Mandala): delayed end-of-turn check.
    // lum_bloom (Catalyst Bloom): delayed end-of-turn check.
    // lum_orchard (Glass Orchard): first-forge trigger handled in purchase_card.
    default:
      break;
  }
}

// ─── v0.8 End-of-Turn / Start-of-Turn Hooks ───────────────────────────────────

/**
 * Apply delayed effects for the player whose turn is about to end.
 * Called at the START of advanceTurn, BEFORE turnCount is incremented.
 * This means state.turnCount equals the ending turn's count at call time.
 */
function applyEndOfTurnEffects(state: GameStateData, player: PlayerGameState): void {
  // ── Concordance Mandala (lum_radiant): +2 Eminence if ≥8 Radiance Artifacts ──
  if (player.luminaries.includes("lum_radiant") && !state.concordanceMandalaTriggered) {
    const radianceArtifacts = player.purchasedCardIds.filter(
      (id) => CARD_MAP.get(id)?.bonusColor === "pearl",
    ).length;
    if (radianceArtifacts >= 8) {
      player.lumens += 2;
      state.concordanceMandalaTriggered = true;
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Concordance Mandala — Perfect Coherence: 8+ Radiance Artifacts → +2 Eminence`,
        turn: state.roundNumber,
      });
    }
  }

  // ── Catalyst Bloom (lum_bloom): +1 Eminence per burn effect since last turn ──
  if (player.luminaries.includes("lum_bloom")) {
    const burnEffects = state.catalystBloomBurnCount ?? 0;
    if (burnEffects > 0) {
      player.lumens += burnEffects;
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Catalyst Bloom — Aftergrowth: +${burnEffects} Eminence (${burnEffects} burn effect(s))`,
        turn: state.roundNumber,
      });
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
    const pending = state.avatarSeedState.pendingLumens;
    if (pending > 0) {
      player.lumens += pending;
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Seed Beyond Seasons — Avatar Seeds: +${pending} pending Eminence paid out`,
        turn: state.roundNumber,
      });
    }
    state.avatarSeedState.payoutDone = true;
    // Remove ALL remaining Avatar Seed tokens from deck tops, market, and
    // reserved cards (all tracked via deckSeeds + marketMarkers).
    state.avatarSeedState.deckSeeds = [];
    if (state.marketMarkers) {
      for (const [id, marker] of Object.entries(state.marketMarkers)) {
        if (marker.type === "avatar_seed") delete state.marketMarkers[id];
      }
    }
    pushLog(state, {
      playerId: player.playerId, playerName: player.playerName,
      summary: `Seed Beyond Seasons — Avatar Seed tokens expired and cleared`,
      turn: state.roundNumber,
    });
  }

  // ── Forgotten Hour (lum_compass): clear Forgotten markers at end of owner's next turn ──
  const forgottenLa = state.luminaryAffinities.find(
    (x) => x.luminaryId === "lum_compass" && x.ownerId === player.playerId,
  );
  if (forgottenLa && state.turnCount > forgottenLa.summonedAtTurnCount && state.marketMarkers) {
    let clearedCount = 0;
    for (const [id, marker] of Object.entries(state.marketMarkers)) {
      if (marker.type === "forgotten" && marker.ownerId === player.playerId) {
        delete state.marketMarkers[id];
        clearedCount++;
      }
    }
    if (clearedCount > 0) {
      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `Forgotten Hour — markers expired: ${clearedCount} Forgotten card(s) cleared`,
        turn: state.roundNumber,
      });
    }
  }
}

/**
 * Apply start-of-turn effects for the player whose turn is about to begin.
 * Called at the END of advanceTurn, AFTER turnCount has been incremented and
 * the currentPlayerIndex has advanced.
 */
function applyStartOfTurnEffects(state: GameStateData, player: PlayerGameState): void {
  // ── Clear Assimilation if it belongs to a different player ──
  if (state.firstHungerAvailable && state.firstHungerAvailable !== player.playerId) {
    state.firstHungerAvailable = null;
  }

  // ── Ember Sovereign (lum_ember): burn remaining Condemned cards at start of summoner's next turn ──
  const emberLa = state.luminaryAffinities.find(
    (x) => x.luminaryId === "lum_ember" && x.ownerId === player.playerId,
  );
  if (
    emberLa &&
    state.turnCount > emberLa.summonedAtTurnCount &&
    state.marketMarkers
  ) {
    const condemned = Object.entries(state.marketMarkers).filter(
      ([, m]) => m.type === "condemned" && m.ownerId === player.playerId,
    );
    if (condemned.length > 0) {
      let burnCount = 0;
      for (const [cardId] of condemned) {
        for (const tier of [1, 2, 3] as const) {
          const market = getMarketForTier(state, tier);
          if (market.includes(cardId)) {
            drawIntoMarket(state, market, getDeckForTier(state, tier), cardId);
            burnCount++;
            break;
          }
        }
        // Marker already removed by drawIntoMarket.
      }
      if (burnCount > 0) {
        incrementBloomCount(state);
        pushLog(state, {
          playerId: player.playerId, playerName: player.playerName,
          summary: `Ember Sovereign — Cinder Mandate: burned ${burnCount} Condemned Artifact(s)`,
          turn: state.roundNumber,
        });
      }
    }
  }
}

// ─── Win Condition ────────────────────────────────────────────────────────────

const WIN_THRESHOLD = 15;

function checkWin(state: GameStateData): boolean {
  return state.players.some((p) => p.lumens >= WIN_THRESHOLD);
}

// ─── Advance Turn ─────────────────────────────────────────────────────────────

function advanceTurn(state: GameStateData): void {
  // Apply end-of-turn effects for the current player BEFORE incrementing the
  // turn counter.  Many timing conditions (Avatar Seeds, Forgotten Hour) check
  // state.turnCount > summonedAtTurnCount; doing this pre-increment means
  // "same turn as summon" equals false correctly.
  const endingPlayer = state.players[state.currentPlayerIndex];
  if (endingPlayer) applyEndOfTurnEffects(state, endingPlayer);

  state.turnCount = (state.turnCount ?? 0) + 1;
  const playerCount = state.players.length;
  const nextIndex = (state.currentPlayerIndex + 1) % playerCount;

  if (state.phase === "playing" && checkWin(state)) {
    state.phase = "last_round";
  }

  if (state.phase === "last_round") {
    // Last round ends when it wraps back around to first player
    if (nextIndex === 0) {
      state.phase = "finished";
      state.finishReason = "win";
      // Find winner (most lumens, tie-break: fewest cards)
      let bestLumens = -1;
      let bestCards = Infinity;
      let winnerId: string | null = null;
      for (const p of state.players) {
        const cards = p.purchasedCardIds.length;
        if (
          p.lumens > bestLumens ||
          (p.lumens === bestLumens && cards < bestCards)
        ) {
          bestLumens = p.lumens;
          bestCards = cards;
          winnerId = p.playerId;
        }
      }
      state.winnerId = winnerId;
      // Validate winTriggerLuminaryId against the actual winner — if the
      // player who triggered last-round via Luminary isn't the final winner
      // (e.g. someone else accumulated more lumens in the last round), clear
      // the trigger so the fanfare falls back to the winner's card color.
      if (state.winTriggerLuminaryId) {
        const winnerState = state.players.find((p) => p.playerId === winnerId);
        if (!winnerState?.luminaries.includes(state.winTriggerLuminaryId)) {
          state.winTriggerLuminaryId = null;
        }
      }
    }
  }

  if (state.phase !== "finished") {
    state.currentPlayerIndex = nextIndex;
    if (nextIndex === 0) {
      state.roundNumber++;
    }
    // Apply start-of-turn effects for the incoming player AFTER the index
    // has advanced and turnCount has been incremented.
    const startingPlayer = state.players[state.currentPlayerIndex];
    if (startingPlayer) applyStartOfTurnEffects(state, startingPlayer);
  }
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
  clone.currentPlayerIndex = idx;
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
    state.pendingSummonEvents = state.pendingSummonEvents.filter(
      (e) => !e.createdAt || now - e.createdAt < SUMMON_TTL_MS,
    );
  }

  // Non-turn-gated actions: toggle_luminary_affinity, resolve_summon,
  // plan_action, cancel_plan, tutorial_fast_forward, set_civ_name may be sent at any time.
  const isTurnGated =
    action.type !== "toggle_luminary_affinity" &&
    action.type !== "resolve_summon" &&
    action.type !== "plan_action" &&
    action.type !== "cancel_plan" &&
    action.type !== "tutorial_fast_forward" &&
    action.type !== "set_civ_name";
  if (isTurnGated && state.currentPlayerIndex !== playerIdx)
    return { success: false, error: "Not your turn" };

  const player = state.players[playerIdx];

  switch (action.type) {
    case "toggle_luminary_affinity": {
      const { luminaryId, affinity } = action;
      if (!luminaryId || !affinity)
        return { success: false, error: "luminaryId and affinity required" };
      if (!player.luminaries.includes(luminaryId))
        return { success: false, error: "You don't own this Luminary" };
      const la = state.luminaryAffinities.find(
        (x) => x.luminaryId === luminaryId,
      );
      if (!la)
        return { success: false, error: "Luminary affinity record not found" };
      if (state.turnCount <= la.summonedAtTurnCount)
        return {
          success: false,
          error: "Alliance bonus activates on your next turn",
        };
      if (!la.eligibleAffinities.includes(affinity))
        return { success: false, error: "Invalid affinity for this Luminary" };
      const previousAffinity = la.activeAffinity;
      la.activeAffinity = affinity;
      const lumDef = LUMINARY_MAP.get(luminaryId);
      const fromLabel = previousAffinity ? `${COLOR_LABEL[previousAffinity] ?? previousAffinity} → ` : "";
      pushLog(state, {
        playerId: player.playerId,
        playerName: player.playerName,
        summary: `switched ${lumDef?.name ?? luminaryId} to ${fromLabel}${COLOR_LABEL[affinity] ?? affinity}`,
        turn: state.roundNumber,
      });
      // Stamp lastAction so the broadcast does not carry a stale real-action
      // type from the previous turn, which would re-trigger turn animations.
      state.lastAction = { type: "toggle_luminary_affinity", playerId, luminaryId, affinity };
      state.version++;
      return { success: true };
    }
    case "set_civ_name": {
      const raw = action.civName ?? "";
      const trimmed = raw.trim().slice(0, 48);
      player.civName = trimmed || undefined;
      state.lastAction = { type: "set_civ_name", playerId };
      state.version++;
      return { success: true };
    }
    case "take_three_crystals": {
      const selected = action.crystals ?? {};
      const colors = CRYSTAL_COLORS.filter((c) => (selected[c] ?? 0) > 0);
      if (colors.length < 1 || colors.length > 3)
        return { success: false, error: "Must select 1–3 different affinities" };
      if (new Set(colors).size !== colors.length)
        return { success: false, error: "Must be different affinities" };
      for (const c of colors) {
        if ((selected[c] ?? 0) !== 1)
          return { success: false, error: "Harness exactly 1 of each affinity" };
        if (state.crystalBank[c] < 1)
          return { success: false, error: `No ${COLOR_LABEL[c]} available` };
      }
      const totalHeld = CRYSTAL_COLORS.reduce((s, c) => s + player.crystals[c], 0) + player.crystals.flux;
      const postTakeTotal = totalHeld + colors.length;
      for (const c of colors) {
        player.crystals[c]++;
        state.crystalBank[c]--;
      }
      if (postTakeTotal > 10) {
        const excessCount = postTakeTotal - 10;
        const returnMap = action.returnCrystals ?? {};
        const returnColorsWithFlux = (Object.keys(returnMap) as CrystalColorWithFlux[]).filter((c) => (returnMap[c] ?? 0) > 0);
        // Validate: all return counts must be non-negative integers
        for (const c of returnColorsWithFlux) {
          const count = returnMap[c] ?? 0;
          if (!Number.isInteger(count) || count < 0) {
            for (const col of colors) { player.crystals[col]--; state.crystalBank[col]++; }
            return { success: false, error: "Return counts must be non-negative integers" };
          }
        }
        const totalReturned = returnColorsWithFlux.reduce((s, c) => s + (returnMap[c] ?? 0), 0);
        if (totalReturned < excessCount) {
          for (const c of colors) { player.crystals[c]--; state.crystalBank[c]++; }
          return { success: false, error: `Must return ${excessCount} crystal(s) to stay within the 10-crystal limit` };
        }
        for (const c of returnColorsWithFlux) {
          const count = returnMap[c] ?? 0;
          if ((player.crystals[c] ?? 0) < count) {
            for (const col of colors) { player.crystals[col]--; state.crystalBank[col]++; }
            return { success: false, error: `Cannot return ${COLOR_LABEL[c as CrystalColor] ?? "Singularity"} you do not hold` };
          }
        }
        for (const c of returnColorsWithFlux) {
          const count = returnMap[c] ?? 0;
          player.crystals[c] -= count;
          state.crystalBank[c] += count;
        }
      }
      break;
    }

    case "take_two_crystals": {
      const color = action.crystal;
      if (!color || !CRYSTAL_COLORS.includes(color))
        return { success: false, error: "Invalid affinity" };
      if (state.crystalBank[color] < 4)
        return { success: false, error: "Need at least 4 in the well to harness 2" };
      const totalHeld = CRYSTAL_COLORS.reduce((s, c) => s + player.crystals[c], 0) + player.crystals.flux;
      const postTakeTotal = totalHeld + 2;
      player.crystals[color] += 2;
      state.crystalBank[color] -= 2;
      if (postTakeTotal > 10) {
        const excessCount = postTakeTotal - 10;
        const returnMap = action.returnCrystals ?? {};
        const returnColorsWithFlux = (Object.keys(returnMap) as CrystalColorWithFlux[]).filter((c) => (returnMap[c] ?? 0) > 0);
        // Validate: all return counts must be non-negative integers
        for (const c of returnColorsWithFlux) {
          const count = returnMap[c] ?? 0;
          if (!Number.isInteger(count) || count < 0) {
            player.crystals[color] -= 2; state.crystalBank[color] += 2;
            return { success: false, error: "Return counts must be non-negative integers" };
          }
        }
        const totalReturned = returnColorsWithFlux.reduce((s, c) => s + (returnMap[c] ?? 0), 0);
        if (totalReturned < excessCount) {
          player.crystals[color] -= 2; state.crystalBank[color] += 2;
          return { success: false, error: `Must return ${excessCount} crystal(s) to stay within the 10-crystal limit` };
        }
        for (const c of returnColorsWithFlux) {
          const count = returnMap[c] ?? 0;
          if ((player.crystals[c] ?? 0) < count) {
            player.crystals[color] -= 2; state.crystalBank[color] += 2;
            return { success: false, error: `Cannot return ${COLOR_LABEL[c as CrystalColor] ?? "Singularity"} you do not hold` };
          }
        }
        for (const c of returnColorsWithFlux) {
          const count = returnMap[c] ?? 0;
          player.crystals[c] -= count;
          state.crystalBank[c] += count;
        }
      }
      break;
    }

    case "reserve_card": {
      if (player.reservedCardIds.length >= 3)
        return { success: false, error: "Cannot reserve more than 3 cards" };
      if (!action.cardId && !action.tier)
        return { success: false, error: "cardId or tier required" };

      // Blind reserve from deck (no cardId; tier specified)
      if (!action.cardId) {
        const tier = action.tier as 1 | 2 | 3;
        if (![1, 2, 3].includes(tier))
          return { success: false, error: "Invalid tier" };
        const deck = getDeckForTier(state, tier);
        if (deck.length === 0)
          return { success: false, error: "Deck is empty" };
        const blindId = deck.shift()!;
        // Avatar Seed: if the drawn card was seeded in the deck, transfer the token
        // to marketMarkers so it follows the card into the reserved pile.
        if (state.avatarSeedState && !state.avatarSeedState.payoutDone) {
          const si = state.avatarSeedState.deckSeeds.indexOf(blindId);
          if (si !== -1) {
            state.avatarSeedState.deckSeeds.splice(si, 1);
            if (!state.marketMarkers) state.marketMarkers = {};
            state.marketMarkers[blindId] = {
              type: "avatar_seed",
              ownerId: state.avatarSeedState.ownerId,
              summonedAtTurnCount: state.avatarSeedState.summonedAtTurnCount,
            };
          }
        }
        player.reservedCardIds.push(blindId);
        if (state.crystalBank.flux > 0) {
          player.crystals.flux++;
          state.crystalBank.flux--;
        }
        break;
      }

      const card = CARD_MAP.get(action.cardId);
      if (!card) return { success: false, error: "Card not found" };

      const market = getMarketForTier(state, card.tier as 1 | 2 | 3);
      if (!market.includes(action.cardId))
        return { success: false, error: "Card not in market" };

      // Reserve from market. drawIntoMarket removes all markers; save the Avatar Seed
      // marker first so it follows the card into the reserved pile (v0.8 spec).
      const mktReserveMarker = (state.marketMarkers ?? {})[action.cardId];
      player.reservedCardIds.push(action.cardId);
      drawIntoMarket(state, market, getDeckForTier(state, card.tier as 1 | 2 | 3), action.cardId);
      // Re-apply avatar_seed marker if the card was seeded and the effect is still active.
      if (
        mktReserveMarker?.type === "avatar_seed" &&
        state.avatarSeedState &&
        !state.avatarSeedState.payoutDone
      ) {
        if (!state.marketMarkers) state.marketMarkers = {};
        state.marketMarkers[action.cardId] = mktReserveMarker;
      }
      if (state.crystalBank.flux > 0) {
        player.crystals.flux++;
        state.crystalBank.flux--;
      }
      break;
    }

    case "purchase_card": {
      if (!action.cardId) return { success: false, error: "cardId required" };
      const card = CARD_MAP.get(action.cardId);
      if (!card) return { success: false, error: "Card not found" };
      const market = getMarketForTier(state, card.tier as 1 | 2 | 3);
      if (!market.includes(action.cardId))
        return { success: false, error: "Card not in market" };
      const liveBonusesPurchase = effectiveBonuses(state, player);
      const eff = effectiveCost(card, player, liveBonusesPurchase);
      if (!canAfford(eff, player.crystals))
        return { success: false, error: "Cannot afford this card" };
      const kardashevBefore = computeKardashevTier(player.purchasedCardIds, player.discountedForgeIds);

      // Read the market marker BEFORE drawIntoMarket removes it.
      const purchaseMarker = (state.marketMarkers ?? {})[action.cardId];
      const markerZerosLumens =
        purchaseMarker &&
        (purchaseMarker.type === "forgotten" ||
          purchaseMarker.type === "condemned" ||
          purchaseMarker.type === "nullified");

      // Avatar Seed: if forged by an opponent, increment pending.
      if (purchaseMarker?.type === "avatar_seed" && purchaseMarker.ownerId !== playerId) {
        if (state.avatarSeedState && !state.avatarSeedState.payoutDone) {
          state.avatarSeedState.pendingLumens++;
        }
      }

      payForCard(card, player, state.crystalBank, liveBonusesPurchase);
      player.purchasedCardIds.push(action.cardId);
      const isDiscountPurchase = Object.values(eff).every((v) => v === 0);
      if (isDiscountPurchase) {
        player.discountedForgeIds.push(action.cardId);
      }
      if (!player.purchasedCardBonusSnapshots) player.purchasedCardBonusSnapshots = {};
      player.purchasedCardBonusSnapshots[action.cardId] = { ...liveBonusesPurchase };
      player.bonuses[card.bonusColor]++;

      // Marked cards grant 0 Eminence; unmarked/avatar-seeded grant normal printed value.
      player.lumens += markerZerosLumens ? 0 : card.lumens;

      // Glass Orchard — Perfect Replication: first forge with Verdance or Radiance cost.
      if (
        !markerZerosLumens &&
        !state.glassOrchardTriggered &&
        player.luminaries.includes("lum_orchard") &&
        (card.cost.emerald > 0 || card.cost.pearl > 0)
      ) {
        player.bonuses[card.bonusColor]++;
        state.glassOrchardTriggered = true;
        pushLog(state, {
          playerId: player.playerId, playerName: player.playerName,
          summary: `Glass Orchard — Perfect Replication: +1 extra ${COLOR_LABEL[card.bonusColor]} bonus`,
          turn: state.roundNumber,
        });
      }

      drawIntoMarket(state, market, getDeckForTier(state, card.tier as 1 | 2 | 3), action.cardId);
      checkLuminaries(state, player);
      checkKardashevAdvance(state, player, kardashevBefore, isDiscountPurchase, card.tier);
      break;
    }

    case "purchase_reserved": {
      if (!action.cardId) return { success: false, error: "cardId required" };
      const idx = player.reservedCardIds.indexOf(action.cardId);
      if (idx === -1)
        return { success: false, error: "Card not in your reserved pile" };
      const card = CARD_MAP.get(action.cardId);
      if (!card) return { success: false, error: "Card not found" };
      const liveBonusesReserved = effectiveBonuses(state, player);
      const eff = effectiveCost(card, player, liveBonusesReserved);
      if (!canAfford(eff, player.crystals))
        return { success: false, error: "Cannot afford this card" };
      const kardashevBeforeReserved = computeKardashevTier(player.purchasedCardIds, player.discountedForgeIds);

      // Avatar Seed: the token follows the card into the reserved pile (v0.8 spec).
      // If forged by an opponent, accumulate +1 pending Eminence on The Seed Beyond Seasons.
      // If forged by the owner, just remove the token — no pending.
      const reservedMarker = (state.marketMarkers ?? {})[action.cardId];
      if (
        reservedMarker?.type === "avatar_seed" &&
        state.avatarSeedState &&
        !state.avatarSeedState.payoutDone
      ) {
        if (reservedMarker.ownerId !== playerId) {
          state.avatarSeedState.pendingLumens++;
        }
        // Token is consumed on forge regardless of who forges.
      }
      // Clean up any marker (Forgotten/Condemned/Nullified/AvatarSeed) now that the card is forged.
      if (state.marketMarkers) delete state.marketMarkers[action.cardId];

      payForCard(card, player, state.crystalBank, liveBonusesReserved);
      player.reservedCardIds.splice(idx, 1);
      player.purchasedCardIds.push(action.cardId);
      const isDiscountReserved = Object.values(eff).every((v) => v === 0);
      if (isDiscountReserved) {
        player.discountedForgeIds.push(action.cardId);
      }
      if (!player.purchasedCardBonusSnapshots) player.purchasedCardBonusSnapshots = {};
      player.purchasedCardBonusSnapshots[action.cardId] = { ...liveBonusesReserved };
      player.bonuses[card.bonusColor]++;
      player.lumens += card.lumens;

      // Glass Orchard — Perfect Replication (reserved forge path).
      if (
        !state.glassOrchardTriggered &&
        player.luminaries.includes("lum_orchard") &&
        (card.cost.emerald > 0 || card.cost.pearl > 0)
      ) {
        player.bonuses[card.bonusColor]++;
        state.glassOrchardTriggered = true;
        pushLog(state, {
          playerId: player.playerId, playerName: player.playerName,
          summary: `Glass Orchard — Perfect Replication: +1 extra ${COLOR_LABEL[card.bonusColor]} bonus`,
          turn: state.roundNumber,
        });
      }

      checkLuminaries(state, player);
      checkKardashevAdvance(state, player, kardashevBeforeReserved, isDiscountReserved, card.tier);
      break;
    }

    case "assimilate": {
      // First Hunger — Assimilation: one-time action replacing the forge on the summon turn.
      if (!state.firstHungerAvailable || state.firstHungerAvailable !== playerId) {
        return { success: false, error: "Assimilation is not available this turn" };
      }
      if (!action.cardId) return { success: false, error: "cardId required" };
      const assimCard = CARD_MAP.get(action.cardId);
      if (!assimCard) return { success: false, error: "Card not found" };
      const assimMarket = getMarketForTier(state, assimCard.tier as 1 | 2 | 3);
      if (!assimMarket.includes(action.cardId))
        return { success: false, error: "Card not in market" };
      if (assimCard.cost.ruby === 0 && assimCard.cost.emerald === 0 && assimCard.cost.pearl === 0)
        return { success: false, error: "Target must have Flare, Verdance, or Radiance in its cost" };

      // Cost: normal effective cost with -1 each in Flare, Verdance, Radiance (min 0 per color).
      const assimBonuses = effectiveBonuses(state, player);
      const assimBase = effectiveCost(assimCard, player, assimBonuses);
      const assimCost: CrystalCounts = { ...assimBase } as CrystalCounts;
      assimCost.ruby = Math.max(0, (assimCost.ruby ?? 0) - 1);
      assimCost.emerald = Math.max(0, (assimCost.emerald ?? 0) - 1);
      assimCost.pearl = Math.max(0, (assimCost.pearl ?? 0) - 1);
      if (!canAfford(assimCost, player.crystals))
        return { success: false, error: "Cannot afford Assimilation" };

      // Pay manually with the reduced cost (payForCard uses normal effective cost).
      let fluxUsed = 0;
      for (const c of CRYSTAL_COLORS) {
        const needed = assimCost[c] ?? 0;
        const avail = player.crystals[c] ?? 0;
        const fromOwn = Math.min(needed, avail);
        player.crystals[c] -= fromOwn;
        state.crystalBank[c] += fromOwn;
        fluxUsed += needed - fromOwn;
      }
      player.crystals.flux -= fluxUsed;
      state.crystalBank.flux += fluxUsed;

      // Burn the card (not forged; no artifact bonus, no permanent card).
      drawIntoMarket(state, assimMarket, getDeckForTier(state, assimCard.tier as 1 | 2 | 3), action.cardId);
      incrementBloomCount(state);

      // Grant printed Eminence + 2 bonus.
      const assimLumens = assimCard.lumens + 2;
      player.lumens += assimLumens;

      // Assimilation is consumed.
      state.firstHungerAvailable = null;

      pushLog(state, {
        playerId: player.playerId, playerName: player.playerName,
        summary: `First Hunger — Assimilation: consumed ${action.cardId} for +${assimLumens} Eminence`,
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
      // Set winner to highest lumens among remaining players (or first if tied)
      const others = state.players.filter((p) => p.playerId !== playerId);
      if (others.length > 0) {
        const winner = others.reduce((best, p) =>
          p.lumens > best.lumens ? p : best
        );
        state.winnerId = winner.playerId;
      }
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
      state.version++;

      // Deferred planned-action execution: if this was the last pending summon,
      // the current player's plan (if any) was held behind the gate.  Now that
      // the global cutscene is fully resolved, attempt to execute it.  Uses the
      // same _isAutoExec=true guard to prevent recursion; any new summon triggered
      // inside would re-enter pendingSummonEvents and gate again correctly.
      if (state.pendingSummonEvents.length === 0) {
        const currentPlayer = state.players[state.currentPlayerIndex];
        const deferred = currentPlayer?.plannedAction ?? null;
        if (deferred) {
          currentPlayer.plannedAction = null;
          const autoResult = applyAction(state, currentPlayer.playerId, deferred, true);
          if (!autoResult.success) {
            const cancelReason =
              autoResult.error ?? "Planned move is no longer legal.";
            currentPlayer.plannedActionCancelReason = cancelReason;
            pushLog(state, {
              playerId: currentPlayer.playerId,
              playerName: currentPlayer.playerName,
              summary: `planned move voided — ${cancelReason}`,
              turn: state.roundNumber,
            });
            state.lastAction = {
              type: "planned_action_cancelled",
              playerId: currentPlayer.playerId,
              reason: cancelReason,
            };
            state.version++;
          }
        }
      }

      return { success: true };
    }

    case "plan_action": {
      // Non-turn-gated: any player may submit a planned action for their
      // upcoming turn.  Validate legality first via a dry-run clone.
      const inner = action.plannedActionData;
      if (!inner) return { success: false, error: "No plannedActionData provided" };
      const disallowed: ActionType[] = ["plan_action", "cancel_plan", "resolve_summon", "surrender", "pass"];
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
      // previous lastAction (e.g. take_three_crystals / purchase_card) and the client's
      // version-sensitive dedup keys produce a fresh key on each version bump, causing
      // burst animations to re-fire even though no new game action occurred.
      state.lastAction = { type: "plan_action", playerId };
      state.version++;

      // Race condition: the turn already switched to this player before the
      // plan_action arrived (e.g. submitted just as another player's action
      // advanced the turn).  Execute the inner action as a genuine real action
      // (_isAutoExec=false) so that lastAction, version, and advanceTurn all
      // resolve exactly as if the player had submitted the action directly.
      // The WS broadcast will carry lastAction = inner type (e.g. purchase_card),
      // not plan_action, so the client fires the correct purchase/reserve animation
      // rather than seeing a silent market mutation.
      if (
        !_isAutoExec &&
        state.currentPlayerIndex === playerIdx &&
        (state.pendingSummonEvents ?? []).length === 0
      ) {
        return applyAction(state, playerId, inner, false);
      }

      return { success: true };
    }

    case "cancel_plan": {
      // Non-turn-gated: cancel any standing planned action.
      player.plannedAction = null;
      player.plannedActionCancelReason = null;
      // Stamp lastAction so the broadcast doesn't carry a stale market-action
      // type, which would confuse animation-queue gating on the client.
      state.lastAction = { type: "cancel_plan", playerId };
      state.version++;
      return { success: true };
    }

    case "tutorial_fast_forward": {
      // Non-turn-gated tutorial action. Sets up a scripted endgame state where
      // the player is one Verdance Artifact away from summoning lum_verdant and
      // winning. Uses specific card IDs to guarantee a deterministic scenario.
      const ENDGAME_PURCHASED = [
        "t2e01", "t2e02", "t2e03", "t2e04", "t2e06", // 5 emerald bonuses — 8 lumens
        "t2r01", "t2r02", "t2r03",                    // 3 ruby bonuses — 5 lumens
      ];                                               // total: 13 lumens, 5 emerald bonuses
      const ENDGAME_RESERVED = ["t1e07"]; // emerald, cost onyx=2 pearl=1
      const allEndgameCards = [...ENDGAME_PURCHASED, ...ENDGAME_RESERVED];

      // Remove endgame cards from market and deck pools
      for (const arr of [
        state.marketTier1, state.marketTier2, state.marketTier3,
        state.deckTier1,   state.deckTier2,   state.deckTier3,
      ]) {
        for (const id of allEndgameCards) {
          const idx = arr.indexOf(id);
          if (idx >= 0) arr.splice(idx, 1);
        }
      }

      // Refill market rows to 4 face-up cards from remaining decks
      while (state.marketTier1.length < 4 && state.deckTier1.length > 0) {
        state.marketTier1.push(state.deckTier1.shift()!);
      }
      while (state.marketTier2.length < 4 && state.deckTier2.length > 0) {
        state.marketTier2.push(state.deckTier2.shift()!);
      }
      while (state.marketTier3.length < 4 && state.deckTier3.length > 0) {
        state.marketTier3.push(state.deckTier3.shift()!);
      }

      // Ensure lum_verdant is an active Luminary for this game
      if (!state.activeLuminaries.includes("lum_verdant")) {
        state.activeLuminaries.push("lum_verdant");
      }

      // Set up the player's endgame state
      player.purchasedCardIds = [...ENDGAME_PURCHASED];
      player.reservedCardIds  = [...ENDGAME_RESERVED];
      player.crystals  = { ruby: 0, sapphire: 0, emerald: 0, onyx: 3, pearl: 2, flux: 0 };
      player.bonuses   = { ruby: 3, sapphire: 0, emerald: 5, onyx: 0, pearl: 0, flux: 0 };
      player.lumens    = 13;
      player.luminaries = [];
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
  state.version++;
  
  // Only advance turn if game hasn't ended (e.g., from surrender)
  if (state.phase !== "finished") {
    advanceTurn(state);
  }

  // Auto-execute the new current player's planned action (once only — _isAutoExec
  // guards against infinite recursion).
  //
  // If a Luminary summon is pending (pendingSummonEvents non-empty), the global
  // cutscene is still resolving on clients.  Executing the plan now would advance
  // the board underneath the cinematic.  Instead, leave the plan stored and defer
  // execution to the resolve_summon handler, which fires once the last client
  // finishes the cutscene.  See the "resolve_summon" case for the deferred path.
  if (!_isAutoExec && state.phase !== "finished") {
    const hasPendingSummons = (state.pendingSummonEvents ?? []).length > 0;
    if (!hasPendingSummons) {
      const nextPlayer = state.players[state.currentPlayerIndex];
      const planned = nextPlayer?.plannedAction ?? null;
      if (planned) {
        nextPlayer.plannedAction = null;
        const autoResult = applyAction(state, nextPlayer.playerId, planned, true);
        if (!autoResult.success) {
          nextPlayer.plannedActionCancelReason =
            autoResult.error ?? "Planned move is no longer legal.";
          state.version++;
        }
      }
    }
  }

  return { success: true };
}

// ─── Human-readable action summary ────────────────────────────────────────────

function describeAction(action: ActionPayload, _player: PlayerGameState): string {
  switch (action.type) {
    case "take_three_crystals": {
      const sel = action.crystals ?? {};
      const parts = CRYSTAL_COLORS
        .filter((c) => (sel[c] ?? 0) > 0)
        .map((c) => `${sel[c]} ${COLOR_LABEL[c]}`);
      const base = parts.length === 0
        ? "Harnessed nothing"
        : `Harnessed ${parts.join(", ")}`;
      const ret = action.returnCrystals;
      if (ret) {
        const retParts = (Object.keys(ret) as CrystalColorWithFlux[])
          .filter((c) => (ret[c] ?? 0) > 0)
          .map((c) => `${ret[c]} ${COLOR_LABEL[c as CrystalColor] ?? "Singularity"}`);
        if (retParts.length > 0) return `${base} (returned ${retParts.join(", ")})`;
      }
      return base;
    }
    case "take_two_crystals": {
      const base = action.crystal
        ? `Harnessed 2 ${COLOR_LABEL[action.crystal]}`
        : "Harnessed 2 affinities";
      const ret = action.returnCrystals;
      if (ret) {
        const retParts = (Object.keys(ret) as CrystalColorWithFlux[])
          .filter((c) => (ret[c] ?? 0) > 0)
          .map((c) => `${ret[c]} ${COLOR_LABEL[c as CrystalColor] ?? "Singularity"}`);
        if (retParts.length > 0) return `${base} (returned ${retParts.join(", ")})`;
      }
      return base;
    }
    case "reserve_card": {
      if (action.cardId) {
        const lore = getCardLore(action.cardId);
        return `Encrypted "${lore.name}"`;
      }
      return action.tier
        ? `Encrypted a Tier ${action.tier} card from the deck`
        : "Encrypted a card";
    }
    case "purchase_card":
    case "purchase_reserved": {
      if (action.cardId) {
        const card = CARD_MAP.get(action.cardId);
        const lore = getCardLore(action.cardId);
        const verb = action.type === "purchase_reserved" ? "Built reserved" : "Forged";
        const pts = card?.lumens ?? 0;
        return `${verb} "${lore.name}"${pts ? ` (+${pts} eminence)` : ""}`;
      }
      return "Forged a card";
    }
    case "pass":
      return "Time expired — turn passed";
    case "surrender":
      return "Surrendered";
    default:
      return "Took an action";
  }
}

// ─── Market helpers ───────────────────────────────────────────────────────────

function getMarketForTier(state: GameStateData, tier: 1 | 2 | 3): string[] {
  if (tier === 1) return state.marketTier1;
  if (tier === 2) return state.marketTier2;
  return state.marketTier3;
}

function getDeckForTier(state: GameStateData, tier: 1 | 2 | 3): string[] {
  if (tier === 1) return state.deckTier1;
  if (tier === 2) return state.deckTier2;
  return state.deckTier3;
}

// ─── State Normalization (backwards-compat) ───────────────────────────────────

/**
 * Normalise a GameStateData object loaded from the DB.
 * Handles field renames that happened during development so stale rows
 * don't silently break in-flight games.
 */
export function normalizeState(raw: unknown): GameStateData {
  const state = raw as Record<string, unknown>;
  if (Array.isArray(state.players)) {
    state.players = (state.players as Record<string, unknown>[]).map((p) => {
      // prestige → lumens rename
      if (typeof p.lumens === "undefined" && typeof p.prestige === "number") {
        p = { ...p, lumens: p.prestige };
        delete p.prestige;
      }
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
      // ensure purchasedCardBonusSnapshots exists (added in bonus-snapshot feature)
      if (!p.purchasedCardBonusSnapshots || typeof p.purchasedCardBonusSnapshots !== 'object' || Array.isArray(p.purchasedCardBonusSnapshots)) {
        p = { ...p, purchasedCardBonusSnapshots: {} };
      }
      return p;
    });
  }
  // ensure turnCount exists (added in Living Luminary Affinity feature)
  if (typeof state.turnCount !== "number") {
    state.turnCount = 0;
  }
  // ensure luminaryAffinities array exists (added in Living Luminary Affinity feature)
  if (!Array.isArray(state.luminaryAffinities)) {
    state.luminaryAffinities = [];
  }
  // ensure pendingSummonEvents array exists (added in summon gate feature)
  if (!Array.isArray(state.pendingSummonEvents)) {
    state.pendingSummonEvents = [];
  }
  // ensure winTriggerLuminaryId exists (added in win-fanfare Luminary color feature)
  if (!("winTriggerLuminaryId" in state)) {
    state.winTriggerLuminaryId = null;
  }
  // ensure v0.8 fields exist (optional fields default to absent; guard avoids runtime errors)
  if (typeof state.marketMarkers !== "object" || state.marketMarkers === null || Array.isArray(state.marketMarkers)) {
    state.marketMarkers = {};
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
  // avatarSeedState: leave undefined if not set (it's truly optional)

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
  const marketTier1 = stateData.marketTier1
    .map((id) => CARD_MAP.get(id))
    .filter(Boolean)
    .map((c) => withLore(c as ArtifactCard));
  const marketTier2 = stateData.marketTier2
    .map((id) => CARD_MAP.get(id))
    .filter(Boolean)
    .map((c) => withLore(c as ArtifactCard));
  const marketTier3 = stateData.marketTier3
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
      crystals: p.crystals,
      bonuses: p.bonuses,
      lumens: p.lumens,
      reservedCards: p.reservedCardIds
        .map((id) => CARD_MAP.get(id))
        .filter(Boolean)
        .map((c) => withLore(c as ArtifactCard)),
      purchasedCardIds: p.purchasedCardIds,
      discountedForgeIds: p.discountedForgeIds ?? [],
      purchasedCards: p.purchasedCardIds
        .map((id) => CARD_MAP.get(id))
        .filter(Boolean)
        .map((c) => {
          const card = withLore(c as ArtifactCard);
          const snapshot = p.purchasedCardBonusSnapshots?.[card.id];
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
    currentPlayerIndex: stateData.currentPlayerIndex,
    roundNumber: stateData.roundNumber,
    turnCount: stateData.turnCount ?? 0,
    crystalBank: stateData.crystalBank,
    marketTier1,
    marketTier2,
    marketTier3,
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
    // v0.8 marker / effect state exposed to clients
    marketMarkers: stateData.marketMarkers ?? {},
    avatarSeedDeckSeeds: stateData.avatarSeedState?.deckSeeds ?? [],
    avatarSeedOwnerId: stateData.avatarSeedState?.ownerId ?? null,
    firstHungerAvailable: stateData.firstHungerAvailable ?? null,
  };
}
