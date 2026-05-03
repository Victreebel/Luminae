// ─── Luminae Game Engine ────────────────────────────────────────────────────
// Original tabletop engine-building game inspired by gem-market tableau games.
// Original names, original card designs, original rules presentation.

import { getCardLore } from "./cardLore";

export type CrystalColor = "ruby" | "sapphire" | "emerald" | "onyx" | "pearl";
export type CrystalColorWithFlux = CrystalColor | "flux";

export type CrystalCounts = Record<CrystalColorWithFlux, number>;

export const CRYSTAL_COLORS: CrystalColor[] = [
  "ruby",
  "sapphire",
  "emerald",
  "onyx",
  "pearl",
];

export interface ArtifactCard {
  id: string;
  tier: 1 | 2 | 3;
  bonusColor: CrystalColor;
  prestigePoints: number;
  cost: CrystalCounts;
}

export interface LuminaryDef {
  id: string;
  name: string;
  prestigePoints: number;
  requirements: CrystalCounts;
}

export interface PlayerGameState {
  playerId: string;
  playerName: string;
  crystals: CrystalCounts;
  bonuses: CrystalCounts;
  prestige: number;
  reservedCardIds: string[];
  purchasedCardIds: string[];
  luminaries: string[];
  isConnected: boolean;
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
  phase: "playing" | "last_round" | "finished";
  crystalBank: CrystalCounts;
  marketTier1: string[];
  marketTier2: string[];
  marketTier3: string[];
  deckTier1: string[];
  deckTier2: string[];
  deckTier3: string[];
  activeLuminaries: string[];
  players: PlayerGameState[];
  winnerId: string | null;
  lastAction: Record<string, unknown> | null;
  actionLog: ActionLogEntry[];
  turnTimerSeconds: number | null;
  turnDeadline: number | null;
  version: number;
}

const ACTION_LOG_MAX = 20;
const COLOR_LABEL: Record<CrystalColor, string> = {
  ruby: "Ruby",
  sapphire: "Sapphire",
  emerald: "Emerald",
  onyx: "Onyx",
  pearl: "Pearl",
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
  // ─── Tier 1 ───────────────────────────────────────────────────────────────
  // Ruby bonus
  { id: "t1r01", tier: 1, bonusColor: "ruby", prestigePoints: 0, cost: cost(0, 0, 1, 1, 1) },
  { id: "t1r02", tier: 1, bonusColor: "ruby", prestigePoints: 0, cost: cost(0, 0, 1, 2, 0) },
  { id: "t1r03", tier: 1, bonusColor: "ruby", prestigePoints: 0, cost: cost(0, 1, 1, 0, 1) },
  { id: "t1r04", tier: 1, bonusColor: "ruby", prestigePoints: 0, cost: cost(0, 2, 0, 0, 0) },
  // Sapphire bonus
  { id: "t1s01", tier: 1, bonusColor: "sapphire", prestigePoints: 0, cost: cost(1, 0, 1, 0, 1) },
  { id: "t1s02", tier: 1, bonusColor: "sapphire", prestigePoints: 0, cost: cost(2, 0, 1, 0, 0) },
  { id: "t1s03", tier: 1, bonusColor: "sapphire", prestigePoints: 0, cost: cost(1, 0, 0, 1, 1) },
  { id: "t1s04", tier: 1, bonusColor: "sapphire", prestigePoints: 0, cost: cost(1, 0, 0, 0, 2) },
  // Emerald bonus
  { id: "t1e01", tier: 1, bonusColor: "emerald", prestigePoints: 0, cost: cost(1, 1, 0, 0, 1) },
  { id: "t1e02", tier: 1, bonusColor: "emerald", prestigePoints: 0, cost: cost(0, 2, 0, 1, 0) },
  { id: "t1e03", tier: 1, bonusColor: "emerald", prestigePoints: 0, cost: cost(1, 1, 0, 1, 0) },
  { id: "t1e04", tier: 1, bonusColor: "emerald", prestigePoints: 0, cost: cost(0, 3, 0, 0, 0) },
  // Onyx bonus
  { id: "t1o01", tier: 1, bonusColor: "onyx", prestigePoints: 0, cost: cost(0, 1, 1, 0, 1) },
  { id: "t1o02", tier: 1, bonusColor: "onyx", prestigePoints: 0, cost: cost(0, 1, 0, 0, 2) },
  { id: "t1o03", tier: 1, bonusColor: "onyx", prestigePoints: 0, cost: cost(1, 0, 1, 0, 1) },
  { id: "t1o04", tier: 1, bonusColor: "onyx", prestigePoints: 0, cost: cost(0, 0, 2, 1, 0) },
  // Pearl bonus
  { id: "t1p01", tier: 1, bonusColor: "pearl", prestigePoints: 0, cost: cost(1, 1, 0, 1, 0) },
  { id: "t1p02", tier: 1, bonusColor: "pearl", prestigePoints: 0, cost: cost(0, 1, 0, 2, 0) },
  { id: "t1p03", tier: 1, bonusColor: "pearl", prestigePoints: 0, cost: cost(1, 0, 1, 1, 0) },
  { id: "t1p04", tier: 1, bonusColor: "pearl", prestigePoints: 0, cost: cost(2, 0, 0, 0, 1) },

  // ─── Tier 2 ───────────────────────────────────────────────────────────────
  // Ruby bonus
  { id: "t2r01", tier: 2, bonusColor: "ruby", prestigePoints: 1, cost: cost(0, 2, 0, 3, 2) },
  { id: "t2r02", tier: 2, bonusColor: "ruby", prestigePoints: 2, cost: cost(0, 1, 4, 2, 0) },
  { id: "t2r03", tier: 2, bonusColor: "ruby", prestigePoints: 2, cost: cost(3, 0, 0, 0, 3) },
  // Sapphire bonus
  { id: "t2s01", tier: 2, bonusColor: "sapphire", prestigePoints: 1, cost: cost(2, 0, 3, 0, 2) },
  { id: "t2s02", tier: 2, bonusColor: "sapphire", prestigePoints: 2, cost: cost(4, 0, 0, 2, 1) },
  { id: "t2s03", tier: 2, bonusColor: "sapphire", prestigePoints: 2, cost: cost(0, 3, 0, 0, 3) },
  // Emerald bonus
  { id: "t2e01", tier: 2, bonusColor: "emerald", prestigePoints: 1, cost: cost(3, 2, 0, 0, 2) },
  { id: "t2e02", tier: 2, bonusColor: "emerald", prestigePoints: 2, cost: cost(2, 4, 0, 1, 0) },
  { id: "t2e03", tier: 2, bonusColor: "emerald", prestigePoints: 2, cost: cost(0, 0, 3, 3, 0) },
  // Onyx bonus
  { id: "t2o01", tier: 2, bonusColor: "onyx", prestigePoints: 1, cost: cost(0, 2, 2, 0, 3) },
  { id: "t2o02", tier: 2, bonusColor: "onyx", prestigePoints: 2, cost: cost(1, 0, 2, 0, 4) },
  { id: "t2o03", tier: 2, bonusColor: "onyx", prestigePoints: 2, cost: cost(3, 0, 0, 3, 0) },
  // Pearl bonus
  { id: "t2p01", tier: 2, bonusColor: "pearl", prestigePoints: 1, cost: cost(2, 3, 0, 2, 0) },
  { id: "t2p02", tier: 2, bonusColor: "pearl", prestigePoints: 2, cost: cost(0, 2, 1, 4, 0) },
  { id: "t2p03", tier: 2, bonusColor: "pearl", prestigePoints: 2, cost: cost(0, 0, 3, 0, 3) },

  // ─── Tier 3 ───────────────────────────────────────────────────────────────
  // Ruby bonus
  { id: "t3r01", tier: 3, bonusColor: "ruby", prestigePoints: 3, cost: cost(3, 0, 0, 5, 3) },
  { id: "t3r02", tier: 3, bonusColor: "ruby", prestigePoints: 4, cost: cost(0, 0, 3, 6, 3) },
  // Sapphire bonus
  { id: "t3s01", tier: 3, bonusColor: "sapphire", prestigePoints: 3, cost: cost(5, 3, 0, 0, 3) },
  { id: "t3s02", tier: 3, bonusColor: "sapphire", prestigePoints: 4, cost: cost(6, 3, 0, 3, 0) },
  // Emerald bonus
  { id: "t3e01", tier: 3, bonusColor: "emerald", prestigePoints: 3, cost: cost(0, 5, 3, 0, 3) },
  { id: "t3e02", tier: 3, bonusColor: "emerald", prestigePoints: 4, cost: cost(3, 6, 0, 3, 0) },
  // Onyx bonus
  { id: "t3o01", tier: 3, bonusColor: "onyx", prestigePoints: 3, cost: cost(0, 3, 5, 3, 0) },
  { id: "t3o02", tier: 3, bonusColor: "onyx", prestigePoints: 4, cost: cost(0, 3, 6, 0, 3) },
  // Pearl bonus
  { id: "t3p01", tier: 3, bonusColor: "pearl", prestigePoints: 3, cost: cost(3, 0, 3, 5, 0) },
  { id: "t3p02", tier: 3, bonusColor: "pearl", prestigePoints: 4, cost: cost(3, 0, 3, 0, 6) },
];

export const LUMINARIES: LuminaryDef[] = [
  {
    id: "lum01",
    name: "The Astral Weaver",
    prestigePoints: 3,
    requirements: { ruby: 4, sapphire: 4, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
  },
  {
    id: "lum02",
    name: "The Runic Forge",
    prestigePoints: 3,
    requirements: { ruby: 0, sapphire: 0, emerald: 4, onyx: 3, pearl: 0, flux: 0 },
  },
  {
    id: "lum03",
    name: "The Crystal Oracle",
    prestigePoints: 3,
    requirements: { ruby: 3, sapphire: 3, emerald: 3, onyx: 0, pearl: 0, flux: 0 },
  },
  {
    id: "lum04",
    name: "The Void Merchant",
    prestigePoints: 3,
    requirements: { ruby: 0, sapphire: 0, emerald: 0, onyx: 3, pearl: 3, flux: 0 },
  },
  {
    id: "lum05",
    name: "The Luminary Sage",
    prestigePoints: 3,
    requirements: { ruby: 0, sapphire: 3, emerald: 0, onyx: 0, pearl: 4, flux: 0 },
  },
];

export const CARD_MAP = new Map<string, ArtifactCard>(
  CARD_CATALOG.map((c) => [c.id, c]),
);
export const LUMINARY_MAP = new Map<string, LuminaryDef>(
  LUMINARIES.map((l) => [l.id, l]),
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

  // Luminaries: pick playerCount+1 from shuffled list
  const lumCount = Math.min(playerCount + 1, LUMINARIES.length);
  const activeLuminaries = shuffle(LUMINARIES.map((l) => l.id)).slice(
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
    prestige: 0,
    reservedCardIds: [],
    purchasedCardIds: [],
    luminaries: [],
    isConnected: true,
  }));

  return {
    currentPlayerIndex: 0,
    roundNumber: 1,
    phase: "playing",
    crystalBank: crystalBankForPlayerCount(playerCount),
    marketTier1,
    marketTier2,
    marketTier3,
    deckTier1,
    deckTier2,
    deckTier3,
    activeLuminaries,
    players: playerStates,
    winnerId: null,
    lastAction: null,
    actionLog: [],
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
  | "surrender";

export interface ActionPayload {
  type: ActionType;
  crystals?: Partial<CrystalCounts>;
  crystal?: CrystalColor;
  cardId?: string;
  tier?: 1 | 2 | 3;
}

// ─── Effective Cost with Bonuses ──────────────────────────────────────────────

function effectiveCost(
  card: ArtifactCard,
  player: PlayerGameState,
): CrystalCounts {
  const result = zeroCrystals();
  for (const color of CRYSTAL_COLORS) {
    const after = Math.max(0, card.cost[color] - player.bonuses[color]);
    result[color] = after;
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
): void {
  const needed = effectiveCost(card, player);
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
  for (const lumId of [...state.activeLuminaries]) {
    if (player.luminaries.includes(lumId)) continue;
    const lum = LUMINARY_MAP.get(lumId);
    if (!lum) continue;
    const qualifies = CRYSTAL_COLORS.every(
      (c) => player.bonuses[c] >= lum.requirements[c],
    );
    if (qualifies) {
      player.luminaries.push(lumId);
      player.prestige += lum.prestigePoints;
      pushLog(state, {
        playerId: player.playerId,
        playerName: player.playerName,
        summary: `Drew the favor of ${lum.name} (+${lum.prestigePoints})`,
        turn: state.roundNumber,
      });
    }
  }
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
  return state.players.some((p) => p.prestige >= WIN_THRESHOLD);
}

// ─── Advance Turn ─────────────────────────────────────────────────────────────

function advanceTurn(state: GameStateData): void {
  const playerCount = state.players.length;
  const nextIndex = (state.currentPlayerIndex + 1) % playerCount;

  if (state.phase === "playing" && checkWin(state)) {
    state.phase = "last_round";
  }

  if (state.phase === "last_round") {
    // Last round ends when it wraps back around to first player
    if (nextIndex === 0) {
      state.phase = "finished";
      // Find winner (most prestige, tie-break: fewest cards)
      let bestPrestige = -1;
      let bestCards = Infinity;
      let winnerId: string | null = null;
      for (const p of state.players) {
        const cards = p.purchasedCardIds.length;
        if (
          p.prestige > bestPrestige ||
          (p.prestige === bestPrestige && cards < bestCards)
        ) {
          bestPrestige = p.prestige;
          bestCards = cards;
          winnerId = p.playerId;
        }
      }
      state.winnerId = winnerId;
    }
  }

  if (state.phase !== "finished") {
    state.currentPlayerIndex = nextIndex;
    if (nextIndex === 0) {
      state.roundNumber++;
    }
  }
}

// ─── Main Action Handler ──────────────────────────────────────────────────────

export function applyAction(
  state: GameStateData,
  playerId: string,
  action: ActionPayload,
): { success: boolean; error?: string } {
  const playerIdx = state.players.findIndex((p) => p.playerId === playerId);
  if (playerIdx === -1) return { success: false, error: "Player not found" };
  if (state.currentPlayerIndex !== playerIdx)
    return { success: false, error: "Not your turn" };
  if (state.phase === "finished")
    return { success: false, error: "Game is over" };

  const player = state.players[playerIdx];

  switch (action.type) {
    case "take_three_crystals": {
      const selected = action.crystals ?? {};
      const colors = CRYSTAL_COLORS.filter((c) => (selected[c] ?? 0) > 0);
      if (colors.length < 1 || colors.length > 3)
        return { success: false, error: "Must select 1–3 different crystal colors" };
      if (new Set(colors).size !== colors.length)
        return { success: false, error: "Must be different colors" };
      for (const c of colors) {
        if ((selected[c] ?? 0) !== 1)
          return { success: false, error: "Take exactly 1 of each color" };
        if (state.crystalBank[c] < 1)
          return { success: false, error: `No ${c} crystals available` };
      }
      // Hand limit: 10 total
      const totalHeld = CRYSTAL_COLORS.reduce((s, c) => s + player.crystals[c], 0) + player.crystals.flux;
      if (totalHeld + colors.length > 10) {
        return { success: false, error: "Would exceed 10 crystal limit" };
      }
      for (const c of colors) {
        player.crystals[c]++;
        state.crystalBank[c]--;
      }
      break;
    }

    case "take_two_crystals": {
      const color = action.crystal;
      if (!color || !CRYSTAL_COLORS.includes(color))
        return { success: false, error: "Invalid crystal color" };
      if (state.crystalBank[color] < 4)
        return { success: false, error: "Need at least 4 in bank to take 2" };
      const totalHeld = CRYSTAL_COLORS.reduce((s, c) => s + player.crystals[c], 0) + player.crystals.flux;
      if (totalHeld + 2 > 10)
        return { success: false, error: "Would exceed 10 crystal limit" };
      player.crystals[color] += 2;
      state.crystalBank[color] -= 2;
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
      const eff = effectiveCost(card, player);
      if (!canAfford(eff, player.crystals))
        return { success: false, error: "Cannot afford this card" };
      payForCard(card, player, state.crystalBank);
      player.purchasedCardIds.push(action.cardId);
      player.bonuses[card.bonusColor]++;
      player.prestige += card.prestigePoints;
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
      const eff = effectiveCost(card, player);
      if (!canAfford(eff, player.crystals))
        return { success: false, error: "Cannot afford this card" };
      payForCard(card, player, state.crystalBank);
      player.reservedCardIds.splice(idx, 1);
      player.purchasedCardIds.push(action.cardId);
      player.bonuses[card.bonusColor]++;
      player.prestige += card.prestigePoints;
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
      // Set winner to highest prestige among remaining players (or first if tied)
      const others = state.players.filter((p) => p.playerId !== playerId);
      if (others.length > 0) {
        const winner = others.reduce((best, p) =>
          p.prestige > best.prestige ? p : best
        );
        state.winnerId = winner.playerId;
      }
      break;
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
      return parts.length === 0
        ? "Took no crystals"
        : `Took ${parts.join(", ")}`;
    }
    case "take_two_crystals":
      return action.crystal
        ? `Took 2 ${COLOR_LABEL[action.crystal]}`
        : "Took 2 crystals";
    case "reserve_card": {
      if (action.cardId) {
        const lore = getCardLore(action.cardId);
        return `Reserved "${lore.name}"`;
      }
      return action.tier
        ? `Reserved a Tier ${action.tier} card from the deck`
        : "Reserved a card";
    }
    case "purchase_card":
    case "purchase_reserved": {
      if (action.cardId) {
        const card = CARD_MAP.get(action.cardId);
        const lore = getCardLore(action.cardId);
        const verb = action.type === "purchase_reserved" ? "Built reserved" : "Forged";
        const pts = card?.prestigePoints ?? 0;
        return `${verb} "${lore.name}"${pts ? ` (+${pts})` : ""}`;
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
  // Reference player to satisfy unused-arg lint when added later
  void player;
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

// ─── State to API format ──────────────────────────────────────────────────────

function withLore(card: ArtifactCard) {
  const lore = getCardLore(card.id);
  return { ...card, name: lore.name, flavor: lore.flavor };
}

export function formatGameState(
  roomId: string,
  status: string,
  stateData: GameStateData,
  connectedPlayerIds: Set<string>,
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

  const players = stateData.players.map((p) => ({
    playerId: p.playerId,
    playerName: p.playerName,
    crystals: p.crystals,
    bonuses: p.bonuses,
    prestige: p.prestige,
    reservedCards: p.reservedCardIds
      .map((id) => CARD_MAP.get(id))
      .filter(Boolean)
      .map((c) => withLore(c as ArtifactCard)),
    purchasedCardIds: p.purchasedCardIds,
    isConnected: connectedPlayerIds.has(p.playerId),
  }));

  return {
    roomId,
    status: stateData.phase === "finished" ? "finished" : status,
    currentPlayerIndex: stateData.currentPlayerIndex,
    roundNumber: stateData.roundNumber,
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
    players,
    winnerId: stateData.winnerId,
    lastAction: stateData.lastAction,
    actionLog: stateData.actionLog,
    turnTimerSeconds: stateData.turnTimerSeconds,
    turnDeadline: stateData.turnDeadline,
    version: stateData.version,
  };
}
