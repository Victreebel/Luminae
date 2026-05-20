// ─── Luminae AI Player ──────────────────────────────────────────────────────
// Simple, deterministic-ish AI with three difficulty levels.

import {
  CRYSTAL_COLORS,
  CARD_MAP,
  LUMINARY_MAP,
  zeroCrystals,
  effectiveBonuses,
  type ActionPayload,
  type CrystalColor,
  type CrystalColorWithFlux,
  type CrystalCounts,
  type GameStateData,
  type PlayerGameState,
  type ArtifactCard,
  type LuminaryAffinity,
  type LuminaryDef,
} from "./gameEngine";

export type AiDifficulty = "easy" | "medium" | "hard" | "passive";

function totalCrystals(c: CrystalCounts): number {
  return c.ruby + c.sapphire + c.emerald + c.onyx + c.pearl + c.flux;
}

function effectiveCost(card: ArtifactCard, player: PlayerGameState, state: GameStateData): CrystalCounts {
  const bonuses = effectiveBonuses(state, player);
  const result = zeroCrystals();
  for (const color of CRYSTAL_COLORS) {
    result[color] = Math.max(0, card.cost[color] - bonuses[color]);
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
    .filter((c) => canAfford(effectiveCost(c, player, state), player.crystals))
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

  // Medium/hard: weight by deficits across reachable cards, prioritising one-away cards
  const market = getMarket(state);

  // Compute effective cost and total remaining crystal deficit per card.
  // effectiveCost already accounts for Living Luminary bonuses via effectiveBonuses.
  type CardWithCost = { card: ArtifactCard; eff: CrystalCounts; totalDeficit: number };
  const cardsWithCosts: CardWithCost[] = market.map((card) => {
    const eff = effectiveCost(card, player, state);
    const totalDeficit = CRYSTAL_COLORS.reduce(
      (sum, c) => sum + Math.max(0, eff[c] - player.crystals[c]),
      0,
    );
    return { card, eff, totalDeficit };
  });

  // One-away cards (exactly 1 crystal short) are the most actionable — a single
  // harvest turn makes them purchasable immediately. Sort them first regardless of
  // scoreCard so the AI never wastes that harvest on a less urgent color.
  const oneAway = cardsWithCosts
    .filter((x) => x.totalDeficit === 1)
    .sort(
      (a, b) =>
        scoreCard(b.card, player, state, difficulty) -
        scoreCard(a.card, player, state, difficulty),
    );
  const others = cardsWithCosts
    .filter((x) => x.totalDeficit !== 1)
    .sort(
      (a, b) =>
        scoreCard(b.card, player, state, difficulty) -
        scoreCard(a.card, player, state, difficulty),
    );

  const sliceSize = difficulty === "hard" ? 6 : 3;
  // One-away cards lead the target list; fill the rest with the best-scored cards
  const targets = [...oneAway, ...others].slice(0, sliceSize);

  const need: Record<CrystalColor, number> = {
    ruby: 0,
    sapphire: 0,
    emerald: 0,
    onyx: 0,
    pearl: 0,
  };
  for (const { eff, totalDeficit } of targets) {
    // Give one-away cards 10× weight so the AI strongly prefers the exact color
    // it needs to unlock an immediately purchasable card next turn.
    const weight = totalDeficit === 1 ? 10 : 1;
    for (const c of CRYSTAL_COLORS) {
      const deficit = Math.max(0, eff[c] - player.crystals[c]);
      need[c] += deficit * weight;
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

// ─── Living Luminary Affinity Toggle ─────────────────────────────────────────
// For medium/hard-difficulty AI: evaluate each eligible affinity for an owned
// Luminary and return the affinity that would maximise progress toward the best
// target cards (and unclaimed Luminaries for hard).  Returns null when the
// current affinity is already optimal (no toggle needed).
//
// Difficulty differences:
//   medium — looks at top 3 cards only; skips Luminary scoring.
//   hard   — looks at top 8 cards; also scores toward unclaimed Luminaries.
function chooseBestAffinity(
  la: LuminaryAffinity,
  player: PlayerGameState,
  state: GameStateData,
  difficulty: "medium" | "hard",
): CrystalColor | null {
  if (la.eligibleAffinities.length <= 1) return null;
  if (state.turnCount <= la.summonedAtTurnCount) return null;

  const market = getMarket(state);
  const reserved = player.reservedCardIds
    .map((id) => CARD_MAP.get(id))
    .filter(Boolean) as ArtifactCard[];
  const allCards = [...market, ...reserved];

  // Top-scored target cards: 3 for medium, 8 for hard
  const cardLimit = difficulty === "hard" ? 8 : 3;
  const topTargets = allCards
    .slice()
    .sort(
      (a, b) =>
        scoreCard(b, player, state, difficulty) - scoreCard(a, player, state, difficulty),
    )
    .slice(0, cardLimit);

  let bestAffinity = la.activeAffinity;
  let bestScore = -Infinity;

  for (const aff of la.eligibleAffinities) {
    // Build a simulated bonus count: all active luminary bonuses, but replace
    // THIS luminary's contribution with the candidate affinity.
    const simBonuses = { ...player.bonuses };
    for (const otherLa of state.luminaryAffinities) {
      if (otherLa.ownerId !== player.playerId) continue;
      if (state.turnCount <= otherLa.summonedAtTurnCount) continue;
      const contribution = otherLa.luminaryId === la.luminaryId ? aff : otherLa.activeAffinity;
      simBonuses[contribution]++;
    }

    let score = 0;

    // Score toward top target cards: higher score = closer to affording.
    // Total per-color deficits are reduced by flux (wildcard) crystals before
    // computing the remaining shortfall so the heuristic is accurate when the
    // player holds flux that can cover any color.
    for (const card of topTargets) {
      let rawDeficit = 0;
      for (const color of CRYSTAL_COLORS) {
        const needed = Math.max(0, card.cost[color] - simBonuses[color]);
        rawDeficit += Math.max(0, needed - player.crystals[color]);
      }
      const shortfall = Math.max(0, rawDeficit - player.crystals.flux);
      const cardValue = scoreCard(card, player, state, difficulty);
      score += cardValue / (shortfall + 1);
    }

    // Hard only: also score toward unclaimed active Luminaries
    if (difficulty === "hard") {
      for (const lumId of state.activeLuminaries) {
        if (player.luminaries.includes(lumId)) continue;
        const lum = LUMINARY_MAP.get(lumId);
        if (!lum) continue;
        let shortfall = 0;
        for (const color of CRYSTAL_COLORS) {
          shortfall += Math.max(0, lum.requirements[color] - simBonuses[color]);
        }
        score += (lum.lumens * 2) / (shortfall + 1);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestAffinity = aff;
    }
  }

  return bestAffinity !== la.activeAffinity ? bestAffinity : null;
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
    if (!canAfford(effectiveCost(card, player, state), player.crystals)) {
      return { cardId: card.id };
    }
  }
  return null;
}

// Selects which crystals to return when a harvest would exceed 10
// Least useful first: prefer returning colors with surplus over what target cards need.
function pickCrystalsToReturn(
  projected: Record<CrystalColor, number>,
  excessCount: number,
  player: PlayerGameState,
  state: GameStateData,
  difficulty: AiDifficulty,
): Partial<CrystalCounts> {
  const allColors: CrystalColor[] = CRYSTAL_COLORS;

  if (difficulty === "easy") {
    // Easy: just return excess of the most-held colors
    const order = [...allColors].sort((a, b) => (projected[b] ?? 0) - (projected[a] ?? 0));
    const returnMap: Partial<CrystalCounts> = {};
    let remaining = excessCount;
    for (const c of order) {
      if (remaining <= 0) break;
      const avail = projected[c] ?? 0;
      if (avail > 0) {
        returnMap[c] = 1;
        remaining--;
      }
    }
    return returnMap;
  }

  // Medium/hard: compute how useful each color is for target cards
  const ranked = [...CARD_MAP.values()]
    .filter(card => !player.purchasedCardIds.includes(card.id) && !player.reservedCardIds.includes(card.id))
    .sort((a, b) => scoreCard(b, player, state, difficulty) - scoreCard(a, player, state, difficulty))
    .slice(0, 6);

  const colorNeed: Record<CrystalColor, number> = { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0 };
  for (const card of ranked) {
    const cost = effectiveCost(card, player, state);
    for (const c of allColors) {
      const shortfall = Math.max(0, cost[c] - projected[c]);
      colorNeed[c] = Math.max(colorNeed[c], shortfall);
    }
  }

  // Score: lower = less useful = return first
  const utilityOrder = [...allColors].sort((a, b) => {
    const needA = colorNeed[a] ?? 0;
    const needB = colorNeed[b] ?? 0;
    if (needA !== needB) return needA - needB;
    // Tiebreak: return more of the same color (higher surplus = less marginal value)
    return (projected[b] ?? 0) - (projected[a] ?? 0);
  });

  // Also consider flux (least useful to return since it's versatile, but if we must)
  const allWithFlux: CrystalColorWithFlux[] = [...utilityOrder, "flux" as const];
  const returnMap: Partial<CrystalCounts> = {};
  let remaining = excessCount;
  for (const cwf of allWithFlux) {
    if (remaining <= 0) break;
    const avail = cwf === "flux" ? player.crystals.flux : (projected[cwf] ?? 0);
    if (avail > 0) {
      returnMap[cwf] = 1;
      remaining--;
    }
  }
  return returnMap;
}

// Main AI brain
export function chooseAiAction(
  state: GameStateData,
  playerId: string,
  difficulty: AiDifficulty,
): ActionPayload {
  // Passive placeholder: takes no affinities, forges no cards, cannot win.
  if (difficulty === "passive") {
    return { type: "take_three_crystals", crystals: {} };
  }

  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) {
    // Should never happen, but provide safe fallback
    return { type: "take_three_crystals", crystals: {} };
  }

  const totalHeld = totalCrystals(player.crystals);

  // 0. Medium/hard AI: optimise Living Luminary active affinity before acting.
  // toggle_luminary_affinity is non-turn-gated so the turn runner will apply
  // it immediately and then call chooseAiAction again for the real action.
  // Medium uses a simpler evaluation (top 3 cards, no Luminary scoring).
  if (difficulty === "hard" || difficulty === "medium") {
    for (const la of state.luminaryAffinities ?? []) {
      if (la.ownerId !== playerId) continue;
      const betterAffinity = chooseBestAffinity(la, player, state, difficulty);
      if (betterAffinity) {
        return {
          type: "toggle_luminary_affinity",
          luminaryId: la.luminaryId,
          affinity: betterAffinity,
        };
      }
    }
  }

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
      if (state.crystalBank[c] >= 4) {
        if (totalHeld + 2 <= 10) {
          return { type: "take_two_crystals", crystal: c };
        }
        // Over limit: compute which crystals to return
        const excessCount = totalHeld + 2 - 10;
        const projected: Record<CrystalColor, number> = {
          ruby: player.crystals.ruby,
          sapphire: player.crystals.sapphire,
          emerald: player.crystals.emerald,
          onyx: player.crystals.onyx,
          pearl: player.crystals.pearl,
        };
        projected[c] = (projected[c] ?? 0) + 2;
        const returnMap = pickCrystalsToReturn(projected, excessCount, player, state, difficulty);
        return { type: "take_two_crystals", crystal: c, returnCrystals: returnMap };
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
        return { type: "reserve_card", tier };
      }
    }
    // Absolute fallback (turn will fail validation, but engine handles it)
    return { type: "take_three_crystals", crystals: {} };
  }

  // If taking these crystals would exceed 10, compute return crystals
  if (totalHeld + numPicked > 10) {
    const excessCount = totalHeld + numPicked - 10;
    // Build projected hand after taking
    const projected: Record<CrystalColor, number> = {
      ruby:     player.crystals.ruby,
      sapphire: player.crystals.sapphire,
      emerald:  player.crystals.emerald,
      onyx:     player.crystals.onyx,
      pearl:    player.crystals.pearl,
    };
    for (const c of Object.keys(crystals) as CrystalColor[]) {
      projected[c] = (projected[c] ?? 0) + (crystals[c] ?? 0);
    }
    const returnMap = pickCrystalsToReturn(projected, excessCount, player, state, difficulty);
    return { type: "take_three_crystals", crystals, returnCrystals: returnMap };
  }

  return { type: "take_three_crystals", crystals };
}
