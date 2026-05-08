// ─── Luminae AI Player ──────────────────────────────────────────────────────
// Simple, deterministic-ish AI with three difficulty levels.

import {
  CRYSTAL_COLORS,
  CARD_MAP,
  LUMINARY_MAP,
  zeroCrystals,
  type ActionPayload,
  type CrystalColor,
  type CrystalCounts,
  type GameStateData,
  type PlayerGameState,
  type ArtifactCard,
  type LuminaryDef,
} from "./gameEngine";

export type AiDifficulty = "easy" | "medium" | "hard";

function totalCrystals(c: CrystalCounts): number {
  return c.ruby + c.sapphire + c.emerald + c.onyx + c.pearl + c.flux;
}

function effectiveCost(card: ArtifactCard, player: PlayerGameState): CrystalCounts {
  const result = zeroCrystals();
  for (const color of CRYSTAL_COLORS) {
    result[color] = Math.max(0, card.cost[color] - player.bonuses[color]);
  }
  return result;
}

function canAfford(cost: CrystalCounts, crystals: CrystalCounts): boolean {
  let fluxNeeded = 0;
  for (const color of CRYSTAL_COLORS) {
    fluxNeeded += Math.max(0, cost[color] - crystals[color]);
  }
  return fluxNeeded <= crystals.flux;
}

function getMarket(state: GameStateData): ArtifactCard[] {
  const ids = [...state.marketTier1, ...state.marketTier2, ...state.marketTier3];
  return ids.map((id) => CARD_MAP.get(id)).filter(Boolean) as ArtifactCard[];
}

// Score: how much we want a card (lumens + bonus utility for luminaries)
function scoreCard(
  card: ArtifactCard,
  player: PlayerGameState,
  state: GameStateData,
  difficulty: AiDifficulty,
): number {
  let score = card.lumens * 3;

  if (difficulty !== "easy") {
    // Bonus value: helps build engine for affordability
    score += 1;

    if (difficulty === "hard") {
      // Reward bonuses needed for active luminaries.
      // Scale the boost by the Luminary's lumen value so higher-reward
      // Luminaries get proportionally stronger card-direction guidance.
      // Add a "commitment" bonus when the player is already ≥ halfway toward
      // a Luminary's per-color requirement — prevents the AI from abandoning
      // a mono-color Luminary it has already started building toward.
      for (const lumId of state.activeLuminaries) {
        const lum = LUMINARY_MAP.get(lumId);
        if (!lum) continue;
        const req = lum.requirements[card.bonusColor];
        if (req <= 0) continue;
        const have = player.bonuses[card.bonusColor];
        const need = Math.max(0, req - have);
        if (need > 0) {
          // Base boost proportional to Luminary value (1–4)
          score += lum.lumens;
          // Commitment bonus: once ≥ halfway to this color requirement,
          // add extra incentive to finish (applies to mono Luminaries most)
          if (have >= req / 2) score += 2;
        }
      }
      // Tier bonus (prefer building toward higher tiers)
      score += card.tier;
    }
  }

  return score;
}

// Find an affordable card sorted by score (best first)
function findAffordableCards(
  player: PlayerGameState,
  state: GameStateData,
  difficulty: AiDifficulty,
): ArtifactCard[] {
  const market = getMarket(state);
  const reserved = player.reservedCardIds
    .map((id) => CARD_MAP.get(id))
    .filter(Boolean) as ArtifactCard[];
  const all = [...market, ...reserved];
  return all
    .filter((c) => canAfford(effectiveCost(c, player), player.crystals))
    .sort(
      (a, b) =>
        scoreCard(b, player, state, difficulty) -
        scoreCard(a, player, state, difficulty),
    );
}

// Choose 1-3 different crystal colors that help most toward affording a target card,
// or just pick the most-stocked colors as a fallback.
function pickThreeCrystals(
  state: GameStateData,
  player: PlayerGameState,
  difficulty: AiDifficulty,
): Partial<CrystalCounts> {
  const available = CRYSTAL_COLORS.filter((c) => state.crystalBank[c] > 0);
  if (available.length === 0) return {};

  if (difficulty === "easy") {
    const shuffled = [...available].sort(() => Math.random() - 0.5);
    const pick = shuffled.slice(0, Math.min(3, shuffled.length));
    const result: Partial<CrystalCounts> = {};
    for (const c of pick) result[c] = 1;
    return result;
  }

  // Medium/hard: weight by deficits across reachable cards
  const market = getMarket(state);
  const targets = market
    .map((card) => ({ card, eff: effectiveCost(card, player) }))
    .sort(
      (a, b) =>
        scoreCard(b.card, player, state, difficulty) -
        scoreCard(a.card, player, state, difficulty),
    )
    .slice(0, difficulty === "hard" ? 6 : 3);

  const need: Record<CrystalColor, number> = {
    ruby: 0,
    sapphire: 0,
    emerald: 0,
    onyx: 0,
    pearl: 0,
  };
  for (const { eff } of targets) {
    for (const c of CRYSTAL_COLORS) {
      const deficit = Math.max(0, eff[c] - player.crystals[c]);
      need[c] += deficit;
    }
  }

  const ranked = available
    .filter((c) => need[c] > 0)
    .sort((a, b) => need[b] - need[a]);

  const pick = ranked.slice(0, 3);

  // Fall back to stocked colors if we don't have 3 useful picks
  if (pick.length < 3) {
    const fallback = available
      .filter((c) => !pick.includes(c))
      .sort((a, b) => state.crystalBank[b] - state.crystalBank[a]);
    while (pick.length < 3 && fallback.length > 0) {
      pick.push(fallback.shift()!);
    }
  }

  const result: Partial<CrystalCounts> = {};
  for (const c of pick) result[c] = 1;
  return result;
}

function pickReserveCard(
  state: GameStateData,
  player: PlayerGameState,
  difficulty: AiDifficulty,
): { cardId?: string; tier?: 1 | 2 | 3 } | null {
  if (player.reservedCardIds.length >= 3) return null;
  const market = getMarket(state);
  const ranked = market.sort(
    (a, b) =>
      scoreCard(b, player, state, difficulty) -
      scoreCard(a, player, state, difficulty),
  );
  // Reserve the best market card (one we can't afford yet)
  for (const card of ranked) {
    if (!canAfford(effectiveCost(card, player), player.crystals)) {
      return { cardId: card.id };
    }
  }
  return null;
}

// Main AI brain
export function chooseAiAction(
  state: GameStateData,
  playerId: string,
  difficulty: AiDifficulty,
): ActionPayload {
  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) {
    // Should never happen, but provide safe fallback
    return { type: "take_three_crystals", crystals: {} };
  }

  const totalHeld = totalCrystals(player.crystals);

  // 1. If we can afford a card, purchase the best one
  const affordable = findAffordableCards(player, state, difficulty);
  if (affordable.length > 0) {
    const card = affordable[0];
    const isReserved = player.reservedCardIds.includes(card.id);
    return {
      type: isReserved ? "purchase_reserved" : "purchase_card",
      cardId: card.id,
    };
  }

  // 2. If hand is getting full or no useful crystals to take, consider reserving
  const wouldExceed = totalHeld + 3 > 10;
  if ((wouldExceed || difficulty !== "easy") && Math.random() < (difficulty === "hard" ? 0.3 : 0.15)) {
    const reserve = pickReserveCard(state, player, difficulty);
    if (reserve?.cardId) {
      return { type: "reserve_card", cardId: reserve.cardId };
    }
  }

  // 3. Take crystals (3 different colors, or 2 same if bank allows and we need them)
  const crystals = pickThreeCrystals(state, player, difficulty);
  const numPicked = Object.keys(crystals).length;

  if (numPicked === 0) {
    // Bank empty of regular crystals — try take 2 of any with >=4
    for (const c of CRYSTAL_COLORS) {
      if (state.crystalBank[c] >= 4 && totalHeld + 2 <= 10) {
        return { type: "take_two_crystals", crystal: c };
      }
    }
    // Last resort: try to reserve a card
    const reserve = pickReserveCard(state, player, difficulty);
    if (reserve?.cardId) {
      return { type: "reserve_card", cardId: reserve.cardId };
    }
    // Nothing better — pass-like move (take whatever 1 we can)
    for (const c of CRYSTAL_COLORS) {
      if (state.crystalBank[c] > 0 && totalHeld + 1 <= 10) {
        return { type: "take_three_crystals", crystals: { [c]: 1 } as Partial<CrystalCounts> };
      }
    }
    // Truly stuck: try reserving blind from any tier with cards
    for (const tier of [1, 2, 3] as const) {
      const deck =
        tier === 1 ? state.deckTier1 : tier === 2 ? state.deckTier2 : state.deckTier3;
      if (deck.length > 0 && player.reservedCardIds.length < 3) {
        return { type: "reserve_card", tier, cardId: "blind" };
      }
    }
    // Absolute fallback (turn will fail validation, but engine handles it)
    return { type: "take_three_crystals", crystals: {} };
  }

  // Cap crystals so we don't exceed 10
  const remaining = 10 - totalHeld;
  if (numPicked > remaining) {
    const trimmed: Partial<CrystalCounts> = {};
    let count = 0;
    for (const k of Object.keys(crystals)) {
      if (count >= remaining) break;
      trimmed[k as CrystalColor] = 1;
      count++;
    }
    if (Object.keys(trimmed).length === 0) {
      // Nothing fits — try a reserve
      const reserve = pickReserveCard(state, player, difficulty);
      if (reserve?.cardId) {
        return { type: "reserve_card", cardId: reserve.cardId };
      }
    }
    return { type: "take_three_crystals", crystals: trimmed };
  }

  return { type: "take_three_crystals", crystals };
}
