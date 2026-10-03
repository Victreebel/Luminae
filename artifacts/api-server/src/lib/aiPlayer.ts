// ─── Luminae AI Player ──────────────────────────────────────────────────────
// Simple, deterministic-ish AI with three difficulty levels.

import {
  ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID,
  BLUEPRINT_DEFINITIONS,
  foundryStoredArtifactIds,
  ordinaryEncryptedCount,
  STANDARD_AFFINITY_KEYS,
  type BlueprintId,
  type BlueprintClaimAction,
} from "@workspace/game-types";
import {
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

const TRIANGULATION_ARCHITECT_WELL_RESERVE = 3;

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

function foundryCost(card: ArtifactCard, player: PlayerGameState, state: GameStateData): AffinityCounts {
  const result = effectiveCost(card, player, state);
  for (const affinity of STANDARD_AFFINITY_KEYS) {
    if (card.cost[affinity] > 0 && result[affinity] > 0) result[affinity]--;
  }
  return result;
}

function getFoundryClaimAction(player: PlayerGameState): BlueprintClaimAction | null {
  const device = player.manifestedBlueprintDevices?.find(
    (candidate) => candidate.blueprintId === "bp_mantle_to_orbit_foundry",
  );
  if (!device || device.state !== "ready") return null;
  const legacyUses = Number(device.foundryTier2Ready === true) +
    Number(device.foundryTier3Ready === true);
  const usesRemaining = device.foundryUsesRemaining ?? (legacyUses > 0 ? legacyUses : 2);
  return usesRemaining > 0 ? "foundry_sustainable" : "foundry_overdrive";
}

function findAffordableFoundryCards(
  player: PlayerGameState,
  state: GameStateData,
  difficulty: AiDifficulty,
): ArtifactCard[] {
  if (!getFoundryClaimAction(player)) return [];
  const candidates = state.forgeTier2
    .map((id) => CARD_MAP.get(id))
    .filter((card): card is ArtifactCard => !!card)
    .filter((card) => canAfford(foundryCost(card, player, state), player.affinities));
  const antimatterTarget = player.blueprintPrivateStates?.find(
    (entry) => entry.blueprintId === "bp_antimatter_detonator",
  )?.secretTargetCardId;
  const safeCandidates = candidates.filter((card) => card.id !== antimatterTarget);
  return (safeCandidates.length > 0 ? safeCandidates : candidates).sort(
    (left, right) =>
      scoreCard(right, player, state, difficulty) - scoreCard(left, player, state, difficulty),
  );
}

function getForgeArtifacts(state: GameStateData): ArtifactCard[] {
  const ids = [...state.forgeTier1, ...state.forgeTier2, ...state.forgeTier3];
  return ids.map((id) => CARD_MAP.get(id)).filter(Boolean) as ArtifactCard[];
}

function getReservedArtifacts(player: PlayerGameState): ArtifactCard[] {
  return [...new Set([...player.reservedArtifactIds, ...(player.privateReservedArtifactIds ?? [])])]
    .map((id) => CARD_MAP.get(id))
    .filter(Boolean) as ArtifactCard[];
}

// Score how strongly the AI wants an Artifact (Eminence plus bonus utility).
function scoreCard(
  card: ArtifactCard,
  player: PlayerGameState,
  state: GameStateData,
  difficulty: AiDifficulty,
): number {
  let score = card.eminence * 3;

  const triangulation = state.triangulationScenario;
  if (triangulation && player.playerId === triangulation.myriaPlayerId) {
    const capabilities = ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID[
      card.id as keyof typeof ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID
    ] ?? [];
    if (capabilities.some((capability) => [
      'artifact:cross_ecology_mediation',
      'artifact:memory_preservation',
      'artifact:distributed_coordination',
      'artifact:system_stabilization',
    ].includes(capability))) score += 9;
  }
  if (triangulation && player.playerId === triangulation.vesperPlayerId) {
    const capabilities = ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID[
      card.id as keyof typeof ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID
    ] ?? [];
    if (capabilities.some((capability) => [
      'artifact:signal_interpretation',
      'artifact:predictive_modeling',
      'artifact:controlled_energy',
      'artifact:temporal_coordination',
    ].includes(capability))) score += 9;
  }

  if (difficulty === "hard") {
    for (const blueprint of player.blueprintPrivateStates ?? []) {
      if (blueprint.manifested) continue;
      const definition = BLUEPRINT_DEFINITIONS[blueprint.blueprintId as BlueprintId];
      if (!definition) continue;
      const isMissingComponent = definition.components.some(
        (component) =>
          component.artifactId === card.id &&
          !blueprint.matchedComponentIds.includes(component.artifactId),
      );
      if (isMissingComponent) {
        // Assigned-slot order is strategic priority; slot zero is Lumii's
        // disclosed Antimatter plan in the clearance scenario.
        score += Math.max(18, 32 - blueprint.slotIndex * 6);
      }
    }
  }

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
        const have = effectiveAffinityBonuses(state, player)[card.bonusAffinity];
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
  const reserved = getReservedArtifacts(player);
  const archiveTops = player.tideArchiveForgeAvailable
    ? [state.deckTier1[0], state.deckTier2[0], state.deckTier3[0]]
        .map((id) => id ? CARD_MAP.get(id) : undefined)
        .filter(Boolean) as ArtifactCard[]
    : [];
  const all = [...forgeArtifacts, ...reserved, ...archiveTops];
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

  // Medium/hard: weight by deficits across reachable cards, prioritising one-away cards.
  // Secured scenario cards belong in this planning set even though opponents
  // cannot see their identities.
  const forgeArtifacts = [...getForgeArtifacts(state), ...getReservedArtifacts(player)];

  // Compute effective cost and total remaining Affinity deficit per Artifact.
  // effectiveCost already accounts for Living Luminary bonuses via effectiveAffinityBonuses.
  type CardWithCost = { card: ArtifactCard; eff: AffinityCounts; totalDeficit: number };
  const cardsWithCosts: CardWithCost[] = forgeArtifacts.map((card) => {
    const eff = effectiveCost(card, player, state);
    const coloredDeficit = STANDARD_AFFINITY_KEYS.reduce(
      (sum, c) => sum + Math.max(0, eff[c] - player.affinities[c]),
      0,
    );
    const totalDeficit = Math.max(0, coloredDeficit - player.affinities.singularity);
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

function chooseTriangulationHarnessSelection(
  state: GameStateData,
  player: PlayerGameState,
  difficulty: AiDifficulty,
): Partial<AffinityCounts> {
  const candidates = [...getForgeArtifacts(state), ...getReservedArtifacts(player)]
    .map((card) => {
      const cost = effectiveCost(card, player, state);
      const deficits = Object.fromEntries(STANDARD_AFFINITY_KEYS.map((affinity) => [
        affinity,
        Math.max(0, cost[affinity] - player.affinities[affinity]),
      ])) as Record<StandardAffinityKey, number>;
      const coloredDeficit = STANDARD_AFFINITY_KEYS.reduce(
        (sum, affinity) => sum + deficits[affinity],
        0,
      );
      return {
        card,
        deficits,
        totalDeficit: Math.max(0, coloredDeficit - player.affinities.singularity),
      };
    })
    .filter((candidate) => candidate.totalDeficit > 0)
    .sort((left, right) =>
      left.totalDeficit - right.totalDeficit ||
      scoreCard(right.card, player, state, difficulty) -
        scoreCard(left.card, player, state, difficulty),
    );

  for (const candidate of candidates) {
    const usefulAffinities = STANDARD_AFFINITY_KEYS
      .filter((affinity) => candidate.deficits[affinity] > 0 && state.affinityWell[affinity] > 0)
      .sort((left, right) =>
        candidate.deficits[right] - candidate.deficits[left] ||
        state.affinityWell[right] - state.affinityWell[left],
      )
      .slice(0, 3);
    if (usefulAffinities.length === 0) continue;
    return Object.fromEntries(usefulAffinities.map((affinity) => [affinity, 1]));
  }

  return {};
}

function pickReserveCard(
  state: GameStateData,
  player: PlayerGameState,
  difficulty: AiDifficulty,
): { cardId?: string; tier?: 1 | 2 | 3 } | null {
  if (ordinaryEncryptedCount(player) >= 3) {
    return null;
  }
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
    .filter(card =>
      !player.forgedArtifactIds.includes(card.id) &&
      !player.reservedArtifactIds.includes(card.id) &&
      !(player.privateReservedArtifactIds ?? []).includes(card.id)
    )
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

  // Repairs are free auxiliary orders, resolved after this player's core action.
  // Queue them once before choosing that action so AI and simulation players
  // participate in the same damage/recovery loop as human players.
  const pendingRepairs = new Set(player.pendingArtifactRepairIds ?? []);
  const damagedArtifactIds = [...new Set(player.forgedArtifactIds)].filter((id) => (
    player.civilization.artifacts[id]?.implementationState === "damaged" &&
    !pendingRepairs.has(id)
  ));
  if (damagedArtifactIds.length > 0) {
    return { type: "repair_artifacts", artifactIds: damagedArtifactIds };
  }

  const totalHeld = totalAffinities(player.affinities);
  const triangulationAutonomous = !!state.triangulationScenario && (
    playerId === state.triangulationScenario.myriaPlayerId ||
    playerId === state.triangulationScenario.vesperPlayerId
  );

  const foundryDevice = player.manifestedBlueprintDevices?.find(
    (entry) => entry.blueprintId === "bp_mantle_to_orbit_foundry",
  );
  const recoveryArtifactId = foundryDevice?.state === "recovering"
    ? foundryStoredArtifactIds(player)[0]
    : undefined;
  if (recoveryArtifactId) {
    return {
      type: "forge_artifact",
      cardId: recoveryArtifactId,
      blueprintAction: "foundry_recovery",
    };
  }

  const foundryAction = getFoundryClaimAction(player);
  const foundryAffordable = findAffordableFoundryCards(player, state, difficulty);
  if (foundryAction && foundryAffordable.length > 0 && difficulty === "hard") {
    return {
      type: "forge_artifact",
      cardId: foundryAffordable[0].id,
      blueprintAction: foundryAction,
    };
  }

  // 1. If an Artifact is affordable, Forge the best one.
  const affordable = findAffordableCards(player, state, difficulty);
  if (affordable.length > 0) {
    const card = affordable[0];
    const isReserved =
      player.reservedArtifactIds.includes(card.id) ||
      (player.privateReservedArtifactIds ?? []).includes(card.id);
    const isTideArchiveTop =
      player.tideArchiveForgeAvailable === true &&
      [state.deckTier1[0], state.deckTier2[0], state.deckTier3[0]].includes(card.id);
    return {
      type: isReserved ? "forge_reserved_artifact" : "forge_artifact",
      cardId: card.id,
      ...(isTideArchiveTop ? { luminaryId: "lum_tide", tier: card.tier } : {}),
    };
  }


  if (foundryAction && foundryAffordable.length > 0) {
    return {
      type: "forge_artifact",
      cardId: foundryAffordable[0].id,
      blueprintAction: foundryAction,
    };
  }

  // 2. If the hand is getting full, consider reserving.
  const wouldExceed = totalHeld + 3 > 10;
  if (!triangulationAutonomous && (wouldExceed || difficulty !== "easy") && Math.random() < (difficulty === "hard" ? 0.3 : 0.15)) {
    const reserve = triangulationAutonomous ? null : pickReserveCard(state, player, difficulty);
    if (reserve?.cardId) {
      const overflowReturn = chooseReserveOverflowReturn(player, state, difficulty);
      return { type: "reserve_artifact", cardId: reserve.cardId, ...(overflowReturn ? { returnAffinities: overflowReturn } : {}) };
    }
  }

  // 3. Harness 3 different Affinities, or 2 of one Affinity when the Well allows it.
  const selectedAffinities = state.triangulationScenario
    ? chooseTriangulationHarnessSelection(state, player, difficulty)
    : chooseHarnessSelection(state, player, difficulty);
  if (triangulationAutonomous) {
    const availableStandardAffinities = STANDARD_AFFINITY_KEYS.reduce(
      (sum, affinity) => sum + state.affinityWell[affinity],
      0,
    );
    const autonomousTakeLimit = Math.max(
      0,
      availableStandardAffinities - TRIANGULATION_ARCHITECT_WELL_RESERVE,
    );
    const selectedKeys = Object.keys(selectedAffinities) as StandardAffinityKey[];
    for (const affinity of selectedKeys.slice(autonomousTakeLimit)) {
      delete selectedAffinities[affinity];
    }
  }
  const numPicked = Object.keys(selectedAffinities).length;

  if (numPicked === 0) {
    if (triangulationAutonomous) return { type: "pass" };
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
    const reserve = triangulationAutonomous ? null : pickReserveCard(state, player, difficulty);
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
    for (const tier of triangulationAutonomous ? [] : [1, 2, 3] as const) {
      const deck =
        tier === 1 ? state.deckTier1 : tier === 2 ? state.deckTier2 : state.deckTier3;
      if (deck.length > 0 && ordinaryEncryptedCount(player) < 3) {
        const overflowReturn = chooseReserveOverflowReturn(player, state, difficulty);
        return { type: "reserve_artifact", tier, ...(overflowReturn ? { returnAffinities: overflowReturn } : {}) };
      }
    }
    // No legal Forge, Harness, or Encrypt is available. Passing keeps the
    // turn valid and lets another seat release resources without manufacturing
    // a validation failure.
    return { type: "pass" };
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
