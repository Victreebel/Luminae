// ─── Luminae Game Engine ────────────────────────────────────────────────────
// Original tabletop engine-building game inspired by gem-market tableau games.
// Original names, original card designs, original rules presentation.

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

export interface PendingSummonEvent {
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
}

export interface PlayerGameState {
  playerId: string;
  playerName: string;
  crystals: CrystalCounts;
  bonuses: CrystalCounts;
  lumens: number;
  reservedCardIds: string[];
  purchasedCardIds: string[];
  luminaries: string[];
  isConnected: boolean;
  plannedAction: ActionPayload | null;
  plannedActionCancelReason: string | null;
}

export interface ActionLogEntry {
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
  lastAction: Record<string, unknown> | null;
  actionLog: ActionLogEntry[];
  turnTimerSeconds: number | null;
  turnDeadline: number | null;
  version: number;
  pendingSummonEvents: PendingSummonEvent[];
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

function zeroCost(): CrystalCounts {
  return { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0 };
}

function cost(
  r: number,
  s: number,
  e: number,
  o: number,
  p: number,
): CrystalCounts {
  return { ruby: r, sapphire: s, emerald: e, onyx: o, pearl: p, flux: 0 };
}

export const CARD_CATALOG: ArtifactCard[] = [
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
  {
    id: "lum_forge",
    name: "The Iron Harbinger",
    domain: "Ruin",
    lumens: 3,
    requirements: { ruby: 0, sapphire: 0, emerald: 4, onyx: 4, pearl: 0, flux: 0 },
    flavor: "What he builds he eventually unmakes. Creation and ruin are the same song played in different keys.",
    summonColor: "#2ecc71",
    summonSecondaryColor: "#7b1fa2",
    auraStyle: "storm",
  },
  {
    id: "lum_ember",
    name: "The Ember Sovereign",
    domain: "Flame",
    lumens: 4,
    requirements: { ruby: 3, sapphire: 0, emerald: 3, onyx: 3, pearl: 0, flux: 0 },
    flavor: "Born of the first stellar ignition, she feeds on the light of dying suns and leaves only cinders where empires once stood.",
    summonColor: "#ff5a3c",
    summonSecondaryColor: "#7b1fa2",
    auraStyle: "fire",
  },
  {
    id: "lum_null",
    name: "The Null Sovereign",
    domain: "Transcendence",
    lumens: 0,
    oblivion: 4,
    requirements: { ruby: 0, sapphire: 4, emerald: 0, onyx: 4, pearl: 4, flux: 0 },
    flavor: "Beyond the final star, past the edge of the last dark, something waits that was never born and cannot die.",
    summonColor: "#0f172a",
    summonSecondaryColor: "#a8b8e8",
    auraStyle: "null",
  },
  // ── Mono-color Luminaries (1–2 Eminence) ────────────────────────────────────
  {
    id: "lum_tide",
    name: "The Tide Architect",
    domain: "Tides",
    lumens: 2,
    requirements: { ruby: 0, sapphire: 6, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
    flavor: "The sea does not rage. It simply rises.",
    summonColor: "#60a5fa",
    summonSecondaryColor: "#e2e8f0",
    auraStyle: "tide",
  },
  {
    id: "lum_verdant",
    name: "The Verdant Oracle",
    domain: "Verdance",
    lumens: 2,
    requirements: { ruby: 0, sapphire: 0, emerald: 6, onyx: 0, pearl: 0, flux: 0 },
    flavor: "She reads the future in the rings of trees that have not yet been planted.",
    summonColor: "#4ade80",
    summonSecondaryColor: "#166534",
    auraStyle: "verdant",
  },
  {
    id: "lum_void",
    name: "The Void Warden",
    domain: "Void",
    lumens: 0,
    oblivion: 2,
    requirements: { ruby: 0, sapphire: 0, emerald: 0, onyx: 6, pearl: 0, flux: 0 },
    flavor: "In the space between stars, something watches without eyes.",
    summonColor: "#4c1d95",
    summonSecondaryColor: "#0a0a14",
    auraStyle: "void",
  },
  {
    id: "lum_radiant",
    name: "The Radiant Keeper",
    domain: "Light",
    lumens: 2,
    requirements: { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 6, flux: 0 },
    flavor: "She holds back the dark not with fire, but with patience.",
    summonColor: "#fef9c3",
    summonSecondaryColor: "#2ecc71",
    auraStyle: "radiant",
  },
  // ── Dual-color Luminaries (3 Eminence) ──────────────────────────────────────
  {
    id: "lum_astral",
    name: "The Astral Weaver",
    domain: "Stars",
    lumens: 3,
    requirements: { ruby: 3, sapphire: 3, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
    flavor: "Where stellar fire meets the deep cold, the astral web is woven.",
    summonColor: "#f43f5e",
    summonSecondaryColor: "#3d6bff",
    auraStyle: "astral",
  },
  {
    id: "lum_pale",
    name: "The Pale Merchant",
    domain: "Balance",
    lumens: 3,
    requirements: { ruby: 0, sapphire: 0, emerald: 0, onyx: 3, pearl: 3, flux: 0 },
    flavor: "Every transaction is a small death. Every debt, a small birth.",
    summonColor: "#cbd5e1",
    summonSecondaryColor: "#0a0a14",
    auraStyle: "pale",
  },
  {
    id: "lum_bloom",
    name: "The Bloom Tyrant",
    domain: "Wildgrowth",
    lumens: 3,
    requirements: { ruby: 4, sapphire: 0, emerald: 4, onyx: 0, pearl: 0, flux: 0 },
    flavor: "She tends the garden of conflict and harvests its strange flowers.",
    summonColor: "#86efac",
    summonSecondaryColor: "#7f1d1d",
    auraStyle: "bloom",
  },
  {
    id: "lum_compass",
    name: "The Stellar Guide",
    domain: "Navigation",
    lumens: 3,
    requirements: { ruby: 0, sapphire: 4, emerald: 4, onyx: 0, pearl: 0, flux: 0 },
    flavor: "The shortest path between two stars is a story.",
    summonColor: "#38bdf8",
    summonSecondaryColor: "#2ecc71",
    auraStyle: "compass",
  },
  // ── Triple-color Luminary (4 Eminence) ──────────────────────────────────────
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

// Luminaries with complete illustrated assets — only these enter the active
// pool until the remaining entries have their art finalised.
// All 12 Luminaries are accessible during iteration. Accepted reference art:
// lum_forge, lum_ember, lum_verdant. Remaining 9 have batch-generated assets
// (commit 4d38f3ef) that need a panel/entity/aura regeneration pass before
// publication — see replit.md Luminary Art Direction for the approved brief.
const ILLUSTRATED_IDS = new Set([
  "lum_forge", "lum_ember", "lum_verdant",
  "lum_null", "lum_oracle",
  "lum_astral", "lum_bloom", "lum_compass",
  "lum_pale", "lum_radiant", "lum_tide", "lum_void",
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

export type ActionType =
  | "take_three_crystals"
  | "take_two_crystals"
  | "reserve_card"
  | "purchase_card"
  | "purchase_reserved"
  | "pass"
  | "surrender"
  | "toggle_luminary_affinity"
  | "resolve_summon"
  | "plan_action"
  | "cancel_plan"
  | "tutorial_fast_forward";

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
    }
  }
}

function isLuminaryAlreadyClaimed(state: GameStateData, luminaryId: string): boolean {
  return state.players.some((p) => p.luminaries.includes(luminaryId));
}

// ─── Draw Card ───────────────────────────────────────────────────────────────

function drawIntoMarket(
  market: string[],
  deck: string[],
  removedId: string,
): void {
  const idx = market.indexOf(removedId);
  if (idx !== -1) {
    if (deck.length > 0) {
      market[idx] = deck.shift()!;
    } else {
      market.splice(idx, 1);
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
  // plan_action, cancel_plan, tutorial_fast_forward may be sent at any time.
  const isTurnGated =
    action.type !== "toggle_luminary_affinity" &&
    action.type !== "resolve_summon" &&
    action.type !== "plan_action" &&
    action.type !== "cancel_plan" &&
    action.type !== "tutorial_fast_forward";
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

      // Reserve from market
      player.reservedCardIds.push(action.cardId);
      drawIntoMarket(market, getDeckForTier(state, card.tier as 1 | 2 | 3), action.cardId);
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
      payForCard(card, player, state.crystalBank, liveBonusesPurchase);
      player.purchasedCardIds.push(action.cardId);
      player.bonuses[card.bonusColor]++;
      player.lumens += card.lumens;
      drawIntoMarket(market, getDeckForTier(state, card.tier as 1 | 2 | 3), action.cardId);
      checkLuminaries(state, player);
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
      payForCard(card, player, state.crystalBank, liveBonusesReserved);
      player.reservedCardIds.splice(idx, 1);
      player.purchasedCardIds.push(action.cardId);
      player.bonuses[card.bonusColor]++;
      player.lumens += card.lumens;
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
            currentPlayer.plannedActionCancelReason =
              autoResult.error ?? "Planned move is no longer legal.";
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
      state.version++;

      // Edge case: if this player is already the active player with no pending
      // summon gate (plan_action arrived at the server after another player's
      // turn action already advanced the turn to this player), execute the plan
      // immediately rather than leaving it stuck until the next full lap.
      if (
        !_isAutoExec &&
        state.currentPlayerIndex === playerIdx &&
        (state.pendingSummonEvents ?? []).length === 0
      ) {
        player.plannedAction = null;
        const autoResult = applyAction(state, playerId, inner, true);
        if (!autoResult.success) {
          player.plannedActionCancelReason =
            autoResult.error ?? "Planned move is no longer legal.";
          state.version++;
        }
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

function describeAction(action: ActionPayload, player: PlayerGameState): string {
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
      purchasedCards: p.purchasedCardIds
        .map((id) => CARD_MAP.get(id))
        .filter(Boolean)
        .map((c) => withLore(c as ArtifactCard)),
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
  };
}
