// ─── Luminae AI Player ──────────────────────────────────────────────────────
// Simple, deterministic-ish AI with three difficulty levels.

import {
  STANDARD_AFFINITY_KEYS,
  CARD_MAP,
  LUMINARY_MAP,
  zeroAffinities,
  effectiveAffinityBonuses,
  type ActionPayload,
  type AiDifficulty,
  type StandardAffinityKey,
  type AffinityKey,
  type AffinityCounts,
  type GameStateData,
  type PlayerGameState,
  type ArtifactCard,
} from "./gameEngine";

export type { AiDifficulty };

function totalAffinities(c: AffinityCounts): number {
  return c.flare + c.continuum + c.verdance + c.abyss + c.radiance + c.singularity;
}

function effectiveCost(card: ArtifactCard, player: PlayerGameState, state: GameStateData): AffinityCounts {
  const bonuses = effectiveAffinityBonuses(state, player);
  const result = zeroAffinities();
  for (const color of STANDARD_AFFINITY_KEYS) {
    result[color] = Math.max(0, card.cost[color] - bonuses[color]);
  }
  return result;
}

function canAfford(cost: AffinityCounts, heldAffinities: AffinityCounts): boolean {
  let singularityNeeded = 0;
  for (const color of STANDARD_AFFINITY_KEYS) {
    singularityNeeded += Math.max(0, cost[color] - heldAffinities[color]);
  }
  return singularityNeeded <= heldAffinities.singularity;
}

function getForgeArtifacts(state: GameStateData): ArtifactCard[] {
  const ids = [...state.forgeTier1, ...state.forgeTier2, ...state.forgeTier3];
  return ids.map((id) => CARD_MAP.get(id)).filter(Boolean) as ArtifactCard[];
}

// Score how strongly the AI wants an Artifact (Eminence plus bonus utility).
function scoreCard(
  card: ArtifactCard,
  player: PlayerGameState,
  state: GameStateData,
  difficulty: AiDifficulty,
): number {
  let score = card.eminence * 3;

  if (difficulty !== "easy") {
    // Bonus value: helps build engine for affordability
    score += 1;

    if (difficulty === "hard") {
      // Reward bonuses needed for active luminaries.
      // Scale the boost by the Luminary's Eminence value so higher-reward
      // Luminaries get proportionally stronger card-direction guidance.
      // Add a "commitment" bonus when the player is already ≥ halfway toward
      // a Luminary's per-color requirement — prevents the AI from abandoning
      // a mono-color Luminary it has already started building toward.
      for (const lumId of state.activeLuminaries) {
        const lum = LUMINARY_MAP.get(lumId);
        if (!lum) continue;
        const req = lum.requirements[card.bonusAffinity];
        if (req <= 0) continue;
        const have = player.bonuses[card.bonusAffinity];
        const need = Math.max(0, req - have);
        if (need > 0) {
          // Base boost proportional to Luminary value (1–4)
          score += lum.eminence;
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

// Find an affordable Artifact sorted by heuristic score (best first).
function findAffordableCards(
  player: PlayerGameState,
  state: GameStateData,
  difficulty: AiDifficulty,
): ArtifactCard[] {
  const forgeArtifacts = getForgeArtifacts(state);
  const reserved = player.reservedArtifactIds
    .map((id) => CARD_MAP.get(id))
    .filter(Boolean) as ArtifactCard[];
  const all = [...forgeArtifacts, ...reserved];
  return all
    .filter((c) => canAfford(effectiveCost(c, player, state), player.affinities))
    .sort(
      (a, b) =>
        scoreCard(b, player, state, difficulty) -
        scoreCard(a, player, state, difficulty),
    );
}

// Choose 1-3 different Affinities that best advance an Artifact Forge cost,
// falling back to the most-stocked Affinities in the Well.
function chooseHarnessSelection(
  state: GameStateData,
  player: PlayerGameState,
  difficulty: AiDifficulty,
): Partial<AffinityCounts> {
  const availableAffinities = STANDARD_AFFINITY_KEYS.filter((c) => state.affinityWell[c] > 0);
  if (availableAffinities.length === 0) return {};

  if (difficulty === "easy") {
    const shuffled = [...availableAffinities].sort(() => Math.random() - 0.5);
    const pick = shuffled.slice(0, Math.min(3, shuffled.length));
    const result: Partial<AffinityCounts> = {};
    for (const c of pick) result[c] = 1;
    return result;
  }

  // Medium/hard: weight by deficits across reachable cards, prioritising one-away cards
  const forgeArtifacts = getForgeArtifacts(state);

  // Compute effective cost and total remaining Affinity deficit per Artifact.
  // effectiveCost already accounts for Living Luminary bonuses via effectiveAffinityBonuses.
  type CardWithCost = { card: ArtifactCard; eff: AffinityCounts; totalDeficit: number };
  const cardsWithCosts: CardWithCost[] = forgeArtifacts.map((card) => {
    const eff = effectiveCost(card, player, state);
    const totalDeficit = STANDARD_AFFINITY_KEYS.reduce(
      (sum, c) => sum + Math.max(0, eff[c] - player.affinities[c]),
      0,
    );
    return { card, eff, totalDeficit };
  });

  // Artifacts exactly one Affinity short are the most actionable: one Harness
  // action can make them forgeable immediately.
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

  const need: Record<StandardAffinityKey, number> = {
    flare: 0,
    continuum: 0,
    verdance: 0,
    abyss: 0,
    radiance: 0,
  };
  for (const { eff, totalDeficit } of targets) {
    // Give one-away cards 10× weight so the AI strongly prefers the exact color
    // it needs to unlock an immediately purchasable card next turn.
    const weight = totalDeficit === 1 ? 10 : 1;
    for (const c of STANDARD_AFFINITY_KEYS) {
      const deficit = Math.max(0, eff[c] - player.affinities[c]);
      need[c] += deficit * weight;
    }
  }

  const ranked = availableAffinities
    .filter((c) => need[c] > 0)
    .sort((a, b) => need[b] - need[a]);

  const pick = ranked.slice(0, 3);

  // Fall back to stocked colors if we don't have 3 useful picks
  if (pick.length < 3) {
    const fallback = availableAffinities
      .filter((c) => !pick.includes(c))
      .sort((a, b) => state.affinityWell[b] - state.affinityWell[a]);
    while (pick.length < 3 && fallback.length > 0) {
      pick.push(fallback.shift()!);
    }
  }

  const result: Partial<AffinityCounts> = {};
  for (const c of pick) result[c] = 1;
  return result;
}

function pickReserveCard(
  state: GameStateData,
  player: PlayerGameState,
  difficulty: AiDifficulty,
): { cardId?: string; tier?: 1 | 2 | 3 } | null {
  if (player.reservedArtifactIds.length >= 3) return null;
  const forgeArtifacts = getForgeArtifacts(state);
  const ranked = forgeArtifacts.sort(
    (a, b) =>
      scoreCard(b, player, state, difficulty) -
      scoreCard(a, player, state, difficulty),
  );
  // Reserve the best Forge Artifact that is not yet affordable.
  for (const card of ranked) {
    if (!canAfford(effectiveCost(card, player, state), player.affinities)) {
      return { cardId: card.id };
    }
  }
  return null;
}

// Select which Affinities to return when a Harness action would exceed 10.
// Least useful first: prefer surplus over what target Artifacts need.
/**
 * When the AI reserves with 10 held Affinities and Singularity is available,
 * the wire protocol requires returnAffinities. Return that payload,
 * or undefined when no return is needed.
 */
function chooseReserveOverflowReturn(
  player: PlayerGameState,
  state: GameStateData,
  difficulty: AiDifficulty,
): Partial<AffinityCounts> | undefined {
  if (state.affinityWell.singularity <= 0) return undefined;
  if (totalAffinities(player.affinities) < 10) return undefined;
  const projected: Record<StandardAffinityKey, number> = {
    flare: player.affinities.flare,
    continuum: player.affinities.continuum,
    verdance: player.affinities.verdance,
    abyss: player.affinities.abyss,
    radiance: player.affinities.radiance,
  };
  return chooseAffinitiesToReturn(projected, 1, player, state, difficulty);
}

function chooseAffinitiesToReturn(
  projected: Record<StandardAffinityKey, number>,
  excessCount: number,
  player: PlayerGameState,
  state: GameStateData,
  difficulty: AiDifficulty,
): Partial<AffinityCounts> {
  const allColors: StandardAffinityKey[] = [...STANDARD_AFFINITY_KEYS];

  if (difficulty === "easy") {
    // Easy: return excess from the most-held Affinities.
    const order = [...allColors].sort((a, b) => (projected[b] ?? 0) - (projected[a] ?? 0));
    const returnMap: Partial<AffinityCounts> = {};
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

  // Medium/hard: compute how useful each Affinity is for target Artifacts.
  const ranked = [...CARD_MAP.values()]
    .filter(card => !player.forgedArtifactIds.includes(card.id) && !player.reservedArtifactIds.includes(card.id))
    .sort((a, b) => scoreCard(b, player, state, difficulty) - scoreCard(a, player, state, difficulty))
    .slice(0, 6);

  const colorNeed: Record<StandardAffinityKey, number> = { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0 };
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

  // Consider Singularity last because it can cover every Affinity.
  const allWithSingularity: AffinityKey[] = [...utilityOrder, "singularity" as const];
  const returnMap: Partial<AffinityCounts> = {};
  let remaining = excessCount;
  for (const cwf of allWithSingularity) {
    if (remaining <= 0) break;
    const avail = cwf === "singularity" ? player.affinities.singularity : (projected[cwf] ?? 0);
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
  // Guided Lumii always passes legally and never forges, so the player has a
  // real opponent without competitive pressure or interference with the Well.
  if (difficulty === "passive") {
    return { type: "pass" };
  }

  const player = state.players.find((p) => p.playerId === playerId);
  if (!player) {
    // Should never happen, but provide safe fallback
    return { type: "harness_three_affinities", affinities: {} };
  }

  const totalHeld = totalAffinities(player.affinities);

  // 1. If an Artifact is affordable, Forge the best one.
  const affordable = findAffordableCards(player, state, difficulty);
  if (affordable.length > 0) {
    const card = affordable[0];
    const isReserved = player.reservedArtifactIds.includes(card.id);
    return {
      type: isReserved ? "forge_reserved_artifact" : "forge_artifact",
      cardId: card.id,
    };
  }

  // 2. If the hand is getting full, consider reserving.
  const wouldExceed = totalHeld + 3 > 10;
  if ((wouldExceed || difficulty !== "easy") && Math.random() < (difficulty === "hard" ? 0.3 : 0.15)) {
    const reserve = pickReserveCard(state, player, difficulty);
    if (reserve?.cardId) {
      const overflowReturn = chooseReserveOverflowReturn(player, state, difficulty);
      return { type: "reserve_artifact", cardId: reserve.cardId, ...(overflowReturn ? { returnAffinities: overflowReturn } : {}) };
    }
  }

  // 3. Harness 3 different Affinities, or 2 of one Affinity when the Well allows it.
  const selectedAffinities = chooseHarnessSelection(state, player, difficulty);
  const numPicked = Object.keys(selectedAffinities).length;

  if (numPicked === 0) {
    // The Well has no standard Affinities available: try Harness 2 where possible.
    for (const c of STANDARD_AFFINITY_KEYS) {
      if (state.affinityWell[c] >= 4) {
        if (totalHeld + 2 <= 10) {
          return { type: "harness_two_affinities", affinity: c };
        }
        // Over limit: choose which Affinities to return.
        const excessCount = totalHeld + 2 - 10;
        const projected: Record<StandardAffinityKey, number> = {
          flare: player.affinities.flare,
          continuum: player.affinities.continuum,
          verdance: player.affinities.verdance,
          abyss: player.affinities.abyss,
          radiance: player.affinities.radiance,
        };
        projected[c] = (projected[c] ?? 0) + 2;
        const returnMap = chooseAffinitiesToReturn(projected, excessCount, player, state, difficulty);
        return { type: "harness_two_affinities", affinity: c, returnAffinities: returnMap };
      }
    }
    // Last resort: try to reserve a card
    const reserve = pickReserveCard(state, player, difficulty);
    if (reserve?.cardId) {
      const overflowReturn = chooseReserveOverflowReturn(player, state, difficulty);
      return { type: "reserve_artifact", cardId: reserve.cardId, ...(overflowReturn ? { returnAffinities: overflowReturn } : {}) };
    }
    // Nothing better — pass-like move (take whatever 1 we can)
    for (const c of STANDARD_AFFINITY_KEYS) {
      if (state.affinityWell[c] > 0 && totalHeld + 1 <= 10) {
        return { type: "harness_three_affinities", affinities: { [c]: 1 } as Partial<AffinityCounts> };
      }
    }
    // Truly stuck: try reserving blind from any tier with cards
    for (const tier of [1, 2, 3] as const) {
      const deck =
        tier === 1 ? state.deckTier1 : tier === 2 ? state.deckTier2 : state.deckTier3;
      if (deck.length > 0 && player.reservedArtifactIds.length < 3) {
        const overflowReturn = chooseReserveOverflowReturn(player, state, difficulty);
        return { type: "reserve_artifact", tier, ...(overflowReturn ? { returnAffinities: overflowReturn } : {}) };
      }
    }
    // Absolute fallback (turn will fail validation, but engine handles it)
    return { type: "harness_three_affinities", affinities: {} };
  }

  // If the Harness selection would exceed 10, compute returned Affinities.
  if (totalHeld + numPicked > 10) {
    const excessCount = totalHeld + numPicked - 10;
    // Build projected hand after taking
    const projected: Record<StandardAffinityKey, number> = {
      flare:     player.affinities.flare,
      continuum: player.affinities.continuum,
      verdance:  player.affinities.verdance,
      abyss:     player.affinities.abyss,
      radiance:    player.affinities.radiance,
    };
    for (const c of Object.keys(selectedAffinities) as StandardAffinityKey[]) {
      projected[c] = (projected[c] ?? 0) + (selectedAffinities[c] ?? 0);
    }
    const returnMap = chooseAffinitiesToReturn(projected, excessCount, player, state, difficulty);
    return { type: "harness_three_affinities", affinities: selectedAffinities, returnAffinities: returnMap };
  }

  return { type: "harness_three_affinities", affinities: selectedAffinities };
}
