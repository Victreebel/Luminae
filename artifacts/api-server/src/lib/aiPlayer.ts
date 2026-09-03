// ─── Luminae AI Player ──────────────────────────────────────────────────────
// Simple, deterministic-ish AI with three difficulty levels.

import {
  ARTIFACT_DEFINITIONS,
  BLUEPRINT_DEFINITIONS,
  NATURAL_AFFINITY_KEYS,
  type BlueprintId,
  type NaturalAffinityKey,
} from "@workspace/game-types";
import {
  CARD_MAP,
  LUMINARY_MAP,
  zeroAffinities,
  effectiveAffinityBonuses,
  getArtifactBrands,
  getBalanceRuleset,
  type ActionPayload,
  type AiDifficulty,
  type AffinityKey,
  type AffinityCounts,
  type GameStateData,
  type PlayerGameState,
  type ArtifactCard,
} from "./gameEngine";

export type { AiDifficulty };

/**
 * Deliberately different decision policies used by the balance laboratory.
 * `adaptive` is the production-compatible policy and remains the default for
 * every existing caller.
 */
export const AI_STRATEGIES = [
  "adaptive",
  "specialization",
  "tier-rush",
  "encrypt-denial",
  "luminary",
  "comeback",
] as const;

export type AiStrategy = (typeof AI_STRATEGIES)[number];

export interface AiActionPolicy {
  /** Whether this actor may Encrypt an Artifact and generate its configured reward. */
  allowEncryption?: boolean;
  /** Optional balance-laboratory strategy. Existing production callers default to adaptive. */
  strategy?: AiStrategy;
  /** Fixed specialization lane. When omitted it is derived stably from playerId. */
  focusAffinity?: NaturalAffinityKey;
}

function strategyFor(policy: AiActionPolicy): AiStrategy {
  return policy.strategy ?? "adaptive";
}

function stableFocusAffinity(player: PlayerGameState, policy: AiActionPolicy): NaturalAffinityKey {
  if (policy.focusAffinity) return policy.focusAffinity;
  let hash = 0;
  for (const char of player.playerId) hash = Math.imul(hash, 31) + char.charCodeAt(0);
  return NATURAL_AFFINITY_KEYS[Math.abs(hash) % NATURAL_AFFINITY_KEYS.length]!;
}

function totalAffinities(c: AffinityCounts): number {
  return c.flare + c.continuum + c.verdance + c.abyss + c.radiance + c.singularity;
}

function isEncryptionBlockedByForgottenHour(
  state: GameStateData,
  playerId: string,
): boolean {
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

function focusAffinityOptions(
  card: ArtifactCard,
  player: PlayerGameState,
  state: GameStateData,
): NaturalAffinityKey[] {
  const ruleset = getBalanceRuleset(state);
  const isReserved = player.reservedArtifactIds.includes(card.id) ||
    (player.privateReservedArtifactIds ?? []).includes(card.id);
  const hasFocus = isReserved &&
    ruleset.encryptReward === "artifact_bound_focus" &&
    (state.experimentalBalanceState?.focusedReservationIdsByPlayerId?.[player.playerId] ?? [])
      .includes(card.id);
  if (!hasFocus) return [];

  const bonuses = effectiveAffinityBonuses(state, player);
  return NATURAL_AFFINITY_KEYS.filter(
    (affinity) => Math.max(0, card.cost[affinity] - bonuses[affinity]) > 0,
  );
}

function effectiveCost(
  card: ArtifactCard,
  player: PlayerGameState,
  state: GameStateData,
  selectedFocusAffinity?: NaturalAffinityKey,
): AffinityCounts {
  const bonuses = effectiveAffinityBonuses(state, player);
  const result = zeroAffinities();
  for (const color of NATURAL_AFFINITY_KEYS) {
    result[color] = Math.max(0, card.cost[color] - bonuses[color]);
  }

  const ruleset = getBalanceRuleset(state);
  const isReserved = player.reservedArtifactIds.includes(card.id) ||
    (player.privateReservedArtifactIds ?? []).includes(card.id);
  const hasFocus = isReserved &&
    ruleset.encryptReward === "artifact_bound_focus" &&
    (state.experimentalBalanceState?.focusedReservationIdsByPlayerId?.[player.playerId] ?? [])
      .includes(card.id);
  if (hasFocus) {
    const eligibleAffinities = NATURAL_AFFINITY_KEYS.filter(
      (candidate) => result[candidate] > 0,
    );
    const affinity = selectedFocusAffinity && eligibleAffinities.includes(selectedFocusAffinity)
      ? selectedFocusAffinity
      : eligibleAffinities[0];
    if (affinity) result[affinity]--;
  }

  const definition = ARTIFACT_DEFINITIONS[card.id as keyof typeof ARTIFACT_DEFINITIONS];
  const hasLineageConnection = card.tier >= 2 &&
    ruleset.advancedPayment === "minimum_one_lineage_waiver" &&
    (definition?.builtOn.some((artifactId) => player.forgedArtifactIds.includes(artifactId)) ?? false);
  if (hasLineageConnection) {
    const affinity = NATURAL_AFFINITY_KEYS.find((candidate) => result[candidate] > 0);
    if (affinity) result[affinity]--;
  }

  const lineageWaivesFloor = hasLineageConnection;
  const floorApplies = card.tier >= 2 && ruleset.advancedPayment !== "current";
  if (
    floorApplies &&
    NATURAL_AFFINITY_KEYS.every((affinity) => result[affinity] === 0) &&
    !lineageWaivesFloor
  ) {
    const paymentAffinity = NATURAL_AFFINITY_KEYS.find(
      (affinity) => player.affinities[affinity] > 0,
    );
    if (paymentAffinity) result[paymentAffinity] = 1;
  }
  return result;
}

function foundryCost(card: ArtifactCard, player: PlayerGameState, state: GameStateData): AffinityCounts {
  const bonuses = effectiveAffinityBonuses(state, player);
  const result = zeroAffinities();
  for (const color of NATURAL_AFFINITY_KEYS) {
    const printed = card.cost[color] > 0 ? card.cost[color] - 1 : 0;
    result[color] = Math.max(0, printed - bonuses[color]);
  }
  return result;
}

function manifestedProjects(player: PlayerGameState) {
  return player.manifestedBlueprintProjects ?? player.manifestedBlueprintDevices ?? [];
}

function secretAntimatterTarget(player: PlayerGameState): string | null {
  return player.blueprintPrivateStates?.find(
    (blueprint) => blueprint.blueprintId === "bp_antimatter_detonator",
  )?.secretTargetCardId ?? null;
}

function canAfford(cost: AffinityCounts, heldAffinities: AffinityCounts): boolean {
  let singularityNeeded = 0;
  for (const color of NATURAL_AFFINITY_KEYS) {
    singularityNeeded += Math.max(0, cost[color] - heldAffinities[color]);
  }
  return singularityNeeded <= heldAffinities.singularity;
}

function effectiveCostSatisfiesPaymentRules(
  card: ArtifactCard,
  player: PlayerGameState,
  state: GameStateData,
  cost: AffinityCounts,
): boolean {
  const ruleset = getBalanceRuleset(state);
  if (
    card.tier >= 2 &&
    ruleset.advancedPayment !== "current" &&
    NATURAL_AFFINITY_KEYS.every((affinity) => cost[affinity] === 0)
  ) {
    const definition = ARTIFACT_DEFINITIONS[card.id as keyof typeof ARTIFACT_DEFINITIONS];
    const lineageWaivesFloor = ruleset.advancedPayment === "minimum_one_lineage_waiver" &&
      (definition?.builtOn.some((artifactId) => player.forgedArtifactIds.includes(artifactId)) ?? false);
    if (!lineageWaivesFloor) return false;
  }
  return canAfford(cost, player.affinities);
}

function singularityShortfall(cost: AffinityCounts, heldAffinities: AffinityCounts): number {
  return NATURAL_AFFINITY_KEYS.reduce(
    (total, affinity) => total + Math.max(0, cost[affinity] - heldAffinities[affinity]),
    0,
  );
}

function chooseAiFocusAffinity(
  card: ArtifactCard,
  player: PlayerGameState,
  state: GameStateData,
): NaturalAffinityKey | null {
  const options = focusAffinityOptions(card, player, state);
  if (options.length === 0) return null;

  return options
    .map((affinity, order) => {
      const cost = effectiveCost(card, player, state, affinity);
      return {
        affinity,
        order,
        affordable: effectiveCostSatisfiesPaymentRules(card, player, state, cost),
        singularityShortfall: singularityShortfall(cost, player.affinities),
      };
    })
    .sort((left, right) =>
      Number(right.affordable) - Number(left.affordable) ||
      left.singularityShortfall - right.singularityShortfall ||
      left.order - right.order
    )[0]!.affinity;
}

function canAffordArtifact(
  card: ArtifactCard,
  player: PlayerGameState,
  state: GameStateData,
): boolean {
  const focusOptions = focusAffinityOptions(card, player, state);
  const costs = focusOptions.length > 0
    ? focusOptions.map((affinity) => effectiveCost(card, player, state, affinity))
    : [effectiveCost(card, player, state)];
  return costs.some((cost) =>
    effectiveCostSatisfiesPaymentRules(card, player, state, cost)
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
  policy: AiActionPolicy = {},
): number {
  let score = card.eminence * 3;
  const strategy = strategyFor(policy);

  if (strategy === "specialization") {
    const focus = stableFocusAffinity(player, policy);
    if (card.bonusAffinity === focus) score += 14;
    score += Math.min(4, card.cost[focus]) * 2;
  } else if (strategy === "tier-rush") {
    score += card.tier * 8;
    if (card.tier === 3) score += 10;
  } else if (strategy === "encrypt-denial") {
    score += card.eminence * 3 + card.tier * 3;
  } else if (strategy === "comeback") {
    const fieldLeader = Math.max(
      player.eminence,
      ...state.players
        .filter((candidate) => candidate.playerId !== player.playerId)
        .map((candidate) => candidate.eminence),
    );
    const deficit = Math.max(0, fieldLeader - player.eminence);
    if (deficit > 0) score += card.eminence * (4 + Math.min(6, deficit));
  }

  if (
    difficulty === "hard" &&
    state.lumiiThresholdApproach &&
    secretAntimatterTarget(player) === card.id
  ) {
    const antimatterWin = player.eminence + 2 >= (state.victoryRequirement ?? 15);
    score += antimatterWin ? 80 : -120;
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
        if (state.players.some((candidate) => candidate.luminaries.includes(lumId))) {
          continue;
        }
        const lum = LUMINARY_MAP.get(lumId);
        if (!lum) continue;
        const req = lum.requirements[card.bonusAffinity];
        if (req <= 0) continue;
        const have = player.bonuses[card.bonusAffinity];
        const need = Math.max(0, req - have);
        if (need > 0) {
          // Base boost proportional to Luminary value (1–4)
          score += strategy === "luminary"
            ? Math.max(4, lum.eminence * 4)
            : lum.eminence;
          // Commitment bonus: once ≥ halfway to this color requirement,
          // add extra incentive to finish (applies to mono Luminaries most)
          if (have >= req / 2) score += strategy === "luminary" ? 8 : 2;
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
  policy: AiActionPolicy,
): ArtifactCard[] {
  const forgeArtifacts = getForgeArtifacts(state);
  const reserved = getReservedArtifacts(player);
  const archiveTops = player.tideArchiveForgeAvailable
    ? [state.deckTier1[0], state.deckTier2[0], state.deckTier3[0]]
        .map((id) => id ? CARD_MAP.get(id) : undefined)
        .filter(Boolean) as ArtifactCard[]
    : [];
  const all = [...forgeArtifacts, ...reserved, ...archiveTops];
  const targetToAvoid = difficulty === "hard" && state.lumiiThresholdApproach
    ? secretAntimatterTarget(player)
    : null;
  const antimatterWouldWin = player.eminence + 2 >= (state.victoryRequirement ?? 15);
  return all
    .filter((card) => card.id !== targetToAvoid || antimatterWouldWin)
    .filter((card) => canAffordArtifact(card, player, state))
    .sort(
      (a, b) =>
        scoreCard(b, player, state, difficulty, policy) -
        scoreCard(a, player, state, difficulty, policy),
    );
}

function findFoundryCards(
  player: PlayerGameState,
  state: GameStateData,
  difficulty: AiDifficulty,
  policy: AiActionPolicy,
): ArtifactCard[] {
  const foundry = manifestedProjects(player).find(
    (project) => project.blueprintId === "bp_mantle_to_orbit_foundry",
  );
  if (foundry?.state !== "active") return [];
  const targetToAvoid = difficulty === "hard" && state.lumiiThresholdApproach
    ? secretAntimatterTarget(player)
    : null;
  const antimatterWouldWin = player.eminence + 2 >= (state.victoryRequirement ?? 15);
  return state.forgeTier2
    .map((artifactId) => CARD_MAP.get(artifactId))
    .filter((card): card is ArtifactCard => !!card)
    .filter((card) => card.id !== targetToAvoid || antimatterWouldWin)
    .filter((card) => canAfford(foundryCost(card, player, state), player.affinities))
    .sort(
      (left, right) =>
        scoreCard(right, player, state, difficulty, policy) -
        scoreCard(left, player, state, difficulty, policy),
    );
}

// Choose exactly 3 different Affinities that best advance an Artifact Forge cost,
// falling back to the most-stocked Affinities in the Well.
function chooseHarnessSelection(
  state: GameStateData,
  player: PlayerGameState,
  difficulty: AiDifficulty,
  policy: AiActionPolicy,
): Partial<AffinityCounts> {
  const availableAffinities = NATURAL_AFFINITY_KEYS.filter((c) => state.affinityWell[c] > 0);
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
    const totalDeficit = NATURAL_AFFINITY_KEYS.reduce(
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
        scoreCard(b.card, player, state, difficulty, policy) -
        scoreCard(a.card, player, state, difficulty, policy),
    );
  const others = cardsWithCosts
    .filter((x) => x.totalDeficit !== 1)
    .sort(
      (a, b) =>
        scoreCard(b.card, player, state, difficulty, policy) -
        scoreCard(a.card, player, state, difficulty, policy),
    );

  const sliceSize = difficulty === "hard" ? 6 : 3;
  // One-away cards lead the target list; fill the rest with the best-scored cards
  const targets = [...oneAway, ...others].slice(0, sliceSize);

  const need: Record<NaturalAffinityKey, number> = {
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
    for (const c of NATURAL_AFFINITY_KEYS) {
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

/**
 * Select the core game's concentrated Harness when it advances a real target
 * more than taking unrelated colors. The old AI considered this action only
 * after proving the Well was empty, which made the `>= 4` requirement
 * unreachable and removed an entire strategy from every balance baseline.
 */
function chooseTwoSameHarnessAffinity(
  state: GameStateData,
  player: PlayerGameState,
  difficulty: AiDifficulty,
  policy: AiActionPolicy,
): NaturalAffinityKey | null {
  if (difficulty === "easy") return null;
  const eligible = NATURAL_AFFINITY_KEYS.filter((affinity) => state.affinityWell[affinity] >= 4);
  if (eligible.length === 0) return null;

  const strategy = strategyFor(policy);
  const focus = strategy === "specialization" ? stableFocusAffinity(player, policy) : null;
  const targets = [...getForgeArtifacts(state), ...getReservedArtifacts(player)];
  let best: { affinity: NaturalAffinityKey; utility: number } | null = null;

  for (const card of targets) {
    const cost = effectiveCost(card, player, state);
    const deficits = Object.fromEntries(
      NATURAL_AFFINITY_KEYS.map((affinity) => [
        affinity,
        Math.max(0, cost[affinity] - player.affinities[affinity]),
      ]),
    ) as Record<NaturalAffinityKey, number>;
    const totalDeficit = NATURAL_AFFINITY_KEYS.reduce(
      (sum, affinity) => sum + deficits[affinity],
      0,
    );

    for (const affinity of eligible) {
      if (deficits[affinity] < 2) continue;
      const unlocksNow = totalDeficit === 2;
      const reinforcesFocus = focus === affinity;
      if (!unlocksNow && !reinforcesFocus) continue;

      const utility = scoreCard(card, player, state, difficulty, policy) +
        (unlocksNow ? 30 : 0) +
        (reinforcesFocus ? 16 : 0) -
        Math.max(0, totalDeficit - 2) * 3;
      if (!best || utility > best.utility) best = { affinity, utility };
    }
  }

  return best?.affinity ?? null;
}

function pickReserveCard(
  state: GameStateData,
  player: PlayerGameState,
  difficulty: AiDifficulty,
  policy: AiActionPolicy,
): { cardId?: string; tier?: 1 | 2 | 3 } | null {
  if (
    player.reservedArtifactIds.length +
      (player.privateReservedArtifactIds?.length ?? 0) >=
    3
  ) {
    return null;
  }
  const forgeArtifacts = getForgeArtifacts(state).filter((card) =>
    !getArtifactBrands(state.artifactMarkers?.[card.id]).some(
      (brand) => brand.type === "nullified",
    )
  );
  const ranked = forgeArtifacts.sort((a, b) => {
    if (strategyFor(policy) === "encrypt-denial") {
      const denialScore = (card: ArtifactCard): number => Math.max(
        ...state.players
          .filter((candidate) => candidate.playerId !== player.playerId)
          .map((candidate) => scoreCard(card, candidate, state, difficulty, { strategy: "adaptive" })),
        scoreCard(card, player, state, difficulty, policy),
      );
      return denialScore(b) - denialScore(a);
    }
    return scoreCard(b, player, state, difficulty, policy) -
      scoreCard(a, player, state, difficulty, policy);
  });
  // Reserve the best Forge Artifact that is not yet affordable.
  for (const card of ranked) {
    if (
      strategyFor(policy) === "encrypt-denial" ||
      !canAffordArtifact(card, player, state)
    ) {
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
  policy: AiActionPolicy,
): Partial<AffinityCounts> | undefined {
  if (state.affinityWell.singularity <= 0) return undefined;
  if (totalAffinities(player.affinities) < 10) return undefined;
  const projected: Record<NaturalAffinityKey, number> = {
    flare: player.affinities.flare,
    continuum: player.affinities.continuum,
    verdance: player.affinities.verdance,
    abyss: player.affinities.abyss,
    radiance: player.affinities.radiance,
  };
  return chooseAffinitiesToReturn(projected, 1, player, state, difficulty, policy);
}

function chooseAffinitiesToReturn(
  projected: Record<NaturalAffinityKey, number>,
  excessCount: number,
  player: PlayerGameState,
  state: GameStateData,
  difficulty: AiDifficulty,
  policy: AiActionPolicy,
): Partial<AffinityCounts> {
  const allColors: NaturalAffinityKey[] = [...NATURAL_AFFINITY_KEYS];

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
    .sort(
      (a, b) =>
        scoreCard(b, player, state, difficulty, policy) -
        scoreCard(a, player, state, difficulty, policy),
    )
    .slice(0, 6);

  const colorNeed: Record<NaturalAffinityKey, number> = { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0 };
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
  policy: AiActionPolicy = {},
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

  const allowEncryption = policy.allowEncryption !== false &&
    !isEncryptionBlockedByForgottenHour(state, playerId);
  const strategy = strategyFor(policy);
  const totalHeld = totalAffinities(player.affinities);

  // Lumii uses the Foundry as a visible pressure tool: desirable safe Tier II
  // alternatives are claimed before the hidden Antimatter target.
  const foundryCards = findFoundryCards(player, state, difficulty, policy);
  if (difficulty === "hard" && foundryCards.length > 0) {
    const card = foundryCards[0];
    const foundry = manifestedProjects(player).find(
      (project) => project.blueprintId === "bp_mantle_to_orbit_foundry",
    );
    return {
      type: "foundry_forge_artifact",
      cardId: card.id,
      ...(foundry && (foundry.foundryUses ?? 0) >= 2 ? { confirmOverdrive: true } : {}),
    };
  }

  // 1. If an Artifact is affordable, Forge the best one.
  const affordable = findAffordableCards(player, state, difficulty, policy);
  const bestAffordable = affordable[0];
  const denialWillEncrypt = strategy === "encrypt-denial" &&
    allowEncryption &&
    player.reservedArtifactIds.length + (player.privateReservedArtifactIds?.length ?? 0) < 3 &&
    (!bestAffordable || player.eminence + bestAffordable.eminence < (state.victoryRequirement ?? 15)) &&
    Math.random() < 0.85;
  if (bestAffordable && !denialWillEncrypt) {
    const card = bestAffordable;
    const isReserved =
      player.reservedArtifactIds.includes(card.id) ||
      (player.privateReservedArtifactIds ?? []).includes(card.id);
    const isTideArchiveTop =
      player.tideArchiveForgeAvailable === true &&
      [state.deckTier1[0], state.deckTier2[0], state.deckTier3[0]].includes(card.id);
    const focusAffinity = isReserved
      ? chooseAiFocusAffinity(card, player, state)
      : null;
    return {
      type: isReserved ? "forge_reserved_artifact" : "forge_artifact",
      cardId: card.id,
      ...(focusAffinity ? { affinity: focusAffinity } : {}),
      ...(isTideArchiveTop ? { luminaryId: "lum_tide", tier: card.tier } : {}),
    };
  }

  // Final Hunger replaces a Forge action with a free permanent bonus. Use it
  // when no ordinary Forge is currently available instead of spending a turn
  // collecting Affinities for an Artifact that can be Assimilated now.
  const experimentalHungerAvailable = getBalanceRuleset(state).luminaryContact === "nonexclusive" &&
    state.experimentalBalanceState?.luminaryOwnerStateByPlayerId?.[playerId]
      ?.firstHungerAvailable === true;
  if (state.firstHungerAvailable === playerId || experimentalHungerAvailable) {
    const assimilationTarget = getForgeArtifacts(state).sort(
      (left, right) =>
        scoreCard(right, player, state, difficulty, policy) -
        scoreCard(left, player, state, difficulty, policy),
    )[0];
    if (assimilationTarget) {
      return { type: "assimilate", cardId: assimilationTarget.id };
    }
  }

  // 2. If the hand is getting full, consider reserving.
  const wouldExceed = totalHeld + 3 > 10;
  if (
    allowEncryption &&
    (wouldExceed || difficulty !== "easy") &&
    (denialWillEncrypt || Math.random() < (difficulty === "hard" ? 0.3 : 0.15))
  ) {
    const reserve = pickReserveCard(state, player, difficulty, policy);
    if (reserve?.cardId) {
      const overflowReturn = chooseReserveOverflowReturn(player, state, difficulty, policy);
      return { type: "reserve_artifact", cardId: reserve.cardId, ...(overflowReturn ? { returnAffinities: overflowReturn } : {}) };
    }
  }

  // A denial policy still takes a legal Forge when no useful Encrypt exists.
  if (bestAffordable) {
    const isReserved =
      player.reservedArtifactIds.includes(bestAffordable.id) ||
      (player.privateReservedArtifactIds ?? []).includes(bestAffordable.id);
    const isTideArchiveTop =
      player.tideArchiveForgeAvailable === true &&
      [state.deckTier1[0], state.deckTier2[0], state.deckTier3[0]].includes(bestAffordable.id);
    const focusAffinity = isReserved
      ? chooseAiFocusAffinity(bestAffordable, player, state)
      : null;
    return {
      type: isReserved ? "forge_reserved_artifact" : "forge_artifact",
      cardId: bestAffordable.id,
      ...(focusAffinity ? { affinity: focusAffinity } : {}),
      ...(isTideArchiveTop ? { luminaryId: "lum_tide", tier: bestAffordable.tier } : {}),
    };
  }

  // 3. Harness 3 different Affinities, or 2 of one Affinity when the Well allows it.
  // The corrected concentrated-Harness policy is balance-laboratory evidence,
  // not a production AI migration. Simulator/dev callers opt in by naming a
  // strategy; ordinary AI callers keep the established decision policy.
  const concentratedAffinity = policy.strategy
    ? chooseTwoSameHarnessAffinity(state, player, difficulty, policy)
    : null;
  if (concentratedAffinity) {
    if (totalHeld + 2 <= 10) {
      return { type: "harness_two_affinities", affinity: concentratedAffinity };
    }
    const projected: Record<NaturalAffinityKey, number> = {
      flare: player.affinities.flare,
      continuum: player.affinities.continuum,
      verdance: player.affinities.verdance,
      abyss: player.affinities.abyss,
      radiance: player.affinities.radiance,
    };
    projected[concentratedAffinity] += 2;
    const returnAffinities = chooseAffinitiesToReturn(
      projected,
      totalHeld + 2 - 10,
      player,
      state,
      difficulty,
      policy,
    );
    return {
      type: "harness_two_affinities",
      affinity: concentratedAffinity,
      returnAffinities,
    };
  }

  const selectedAffinities = chooseHarnessSelection(state, player, difficulty, policy);
  const numPicked = Object.keys(selectedAffinities).length;

  if (numPicked !== 3) {
    // Last resort: try to reserve a card
    if (allowEncryption) {
      const reserve = pickReserveCard(state, player, difficulty, policy);
      if (reserve?.cardId) {
        const overflowReturn = chooseReserveOverflowReturn(player, state, difficulty, policy);
        return { type: "reserve_artifact", cardId: reserve.cardId, ...(overflowReturn ? { returnAffinities: overflowReturn } : {}) };
      }
    }
    // Truly stuck: try reserving blind from any tier with cards
    if (allowEncryption) {
      for (const tier of [1, 2, 3] as const) {
        const deck =
          tier === 1 ? state.deckTier1 : tier === 2 ? state.deckTier2 : state.deckTier3;
        if (deck.length > 0 && player.reservedArtifactIds.length < 3) {
          const overflowReturn = chooseReserveOverflowReturn(player, state, difficulty, policy);
          return { type: "reserve_artifact", tier, ...(overflowReturn ? { returnAffinities: overflowReturn } : {}) };
        }
      }
    }
    return { type: "pass" };
  }

  // If the Harness selection would exceed 10, compute returned Affinities.
  if (totalHeld + numPicked > 10) {
    const excessCount = totalHeld + numPicked - 10;
    // Build projected hand after taking
    const projected: Record<NaturalAffinityKey, number> = {
      flare:     player.affinities.flare,
      continuum: player.affinities.continuum,
      verdance:  player.affinities.verdance,
      abyss:     player.affinities.abyss,
      radiance:    player.affinities.radiance,
    };
    for (const c of Object.keys(selectedAffinities) as NaturalAffinityKey[]) {
      projected[c] = (projected[c] ?? 0) + (selectedAffinities[c] ?? 0);
    }
    const returnMap = chooseAffinitiesToReturn(
      projected,
      excessCount,
      player,
      state,
      difficulty,
      policy,
    );
    return { type: "harness_three_affinities", affinities: selectedAffinities, returnAffinities: returnMap };
  }

  return { type: "harness_three_affinities", affinities: selectedAffinities };
}
