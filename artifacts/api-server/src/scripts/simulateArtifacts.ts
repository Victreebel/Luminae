#!/usr/bin/env tsx

import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  ARTIFACT_DEFINITIONS,
  BLUEPRINT_DEFINITIONS,
  NATURAL_AFFINITY_KEYS,
  type NaturalAffinityKey,
} from "@workspace/game-types";
import {
  CARD_MAP,
  LUMINARY_MAP,
  applyAction,
  effectiveAffinityBonuses,
  getArtifactBrands,
  getBalanceRulesetCandidate,
  initializeGame,
  setBalanceRuleset,
  setBalanceSimulationOverrides,
  type ActionPayload,
  type BalanceRuleset,
  type GameStateData,
  type PlayerGameState,
} from "../lib/gameEngine.js";
import {
  AI_STRATEGIES,
  chooseAiAction,
  type AiStrategy,
} from "../lib/aiPlayer.js";
import {
  BALANCE_FORMATS,
  average,
  percentage,
  percentile,
  rounded,
  type BalanceFinishReason,
  type BalanceFormat,
  type BalanceReportV2,
  type BalanceScoreSourceBreakdown,
  type BalanceScenarioV2,
} from "../lib/balanceReport.js";

const MAX_TURNS = 400;
const COMEBACK_DEFICIT = 3;

export const BALANCE_CANDIDATE_IDS = [
  "control",
  "reach",
  "luminary-relationship",
  "luminary-artifact-eligibility",
  "luminary-nonexclusive-contact",
  "focus",
  "encrypt-none",
  "payment-floor",
  "lineage-floor",
  "integrated",
] as const;

export type BalanceCandidateId = (typeof BALANCE_CANDIDATE_IDS)[number];

type SimulationMode =
  | "standard"
  | "uncompensated"
  | "luminary-expanded-pool"
  | "luminary-one-claim-cap"
  | "luminary-no-base-eminence"
  | "artifacts-only";

interface ParsedArgs {
  games: number;
  seed: number;
  playerCounts: number[];
  victoryRequirements: number[];
  modes: SimulationMode[];
  output: string | null;
  candidateIds: BalanceCandidateId[];
  policyLineups: AiStrategy[][];
  reportV2: boolean;
}

interface CardCounter {
  forged: number;
  ownerGames: number;
  ownerWins: number;
}

interface LuminaryCounter {
  claims: number;
  ownerWins: number;
  openingPositionClaims: number[];
}

interface LegacyScenarioReport {
  playerCount: number;
  victoryRequirement: number;
  mode: SimulationMode;
  gamesRequested: number;
  gamesCompleted: number;
  completionRate: number;
  stalledGames: number;
  averageTurns: number;
  averageWinnerEminence: number;
  seatWinRates: number[];
  openingPositionWinRates: number[];
  averageForgedByTier: number[];
  averageWinnerForgedByTier: number[];
  averageFinalEminenceByOpeningPosition: number[];
  averageLuminaryClaimsByOpeningPosition: number[];
  averageLuminaryBaseEminenceByOpeningPosition: number[];
  allArtifactBonusShares: Record<NaturalAffinityKey, number>;
  winnerArtifactBonusShares: Record<NaturalAffinityKey, number>;
  cards: Record<string, {
    forgeRatePerGame: number;
    ownerWinRate: number;
    ownerGames: number;
  }>;
  luminaries: Record<string, {
    claimsPerGame: number;
    ownerWinRate: number;
    openingPositionClaimShares: number[];
  }>;
}

interface LegacySimulationReport {
  schema: "luminae-artifact-simulation/v1";
  generatedAt: string;
  seed: number;
  scenarios: LegacyScenarioReport[];
}

interface ScenarioResult {
  legacy: LegacyScenarioReport;
  v2: BalanceScenarioV2;
}

interface GameLeadTracker {
  uniqueLeaderId: string | null;
  changes: number;
  leaderAt5: string | null;
  leaderAt10: string | null;
  maxDeficitByPlayer: Record<string, number>;
}

interface MarketTracker {
  firstSeenTurn: Map<string, number>;
  ageHistogram: Map<number, number>;
  samples: number;
  totalAge: number;
}

interface ZeroCostObservation {
  all: boolean;
  advanced: boolean;
  lineageEarned: boolean;
}

interface ArtifactScoreLedger {
  /** One entry per currently retained implementation created by a scored Forge action. */
  scoresByArtifactId: Map<string, number[]>;
}

interface PlayerScoreContext {
  startingCompensation: number;
  artifacts: ArtifactScoreLedger;
}

function parseNumberList(value: string, allowed: readonly number[], label: string): number[] {
  if (value === "all") return [...allowed];
  const parsed = value.split(",").map((part) => Number.parseInt(part, 10));
  if (parsed.some((entry) => !allowed.includes(entry))) {
    throw new Error(`${label} must be one of ${allowed.join(", ")}, a comma-separated subset, or all`);
  }
  return [...new Set(parsed)];
}

function parseModes(value: string): SimulationMode[] {
  if (value === "all") return ["standard", "artifacts-only"];
  if (value === "audit") {
    return [
      "standard",
      "uncompensated",
      "luminary-expanded-pool",
      "luminary-one-claim-cap",
      "luminary-no-base-eminence",
      "artifacts-only",
    ];
  }
  const modes = value.split(",") as SimulationMode[];
  const allowed: SimulationMode[] = [
    "standard",
    "uncompensated",
    "luminary-expanded-pool",
    "luminary-one-claim-cap",
    "luminary-no-base-eminence",
    "artifacts-only",
  ];
  if (modes.some((mode) => !allowed.includes(mode))) {
    throw new Error(
      "--mode must be standard, uncompensated, luminary-expanded-pool, " +
      "luminary-one-claim-cap, luminary-no-base-eminence, artifacts-only, audit, or all",
    );
  }
  return [...new Set(modes)];
}

function parseCandidates(value: string): BalanceCandidateId[] {
  if (value === "all") return [...BALANCE_CANDIDATE_IDS];
  const candidates = value.split(",") as BalanceCandidateId[];
  if (candidates.some((candidate) => !BALANCE_CANDIDATE_IDS.includes(candidate))) {
    throw new Error(`--candidate must be ${BALANCE_CANDIDATE_IDS.join(", ")}, or all`);
  }
  return [...new Set(candidates)];
}

function parsePolicyLineups(value: string): AiStrategy[][] {
  if (value === "mixed") return [[...AI_STRATEGIES]];
  if (value === "all") {
    return [
      ...AI_STRATEGIES.map((strategy) => [strategy]),
      [...AI_STRATEGIES],
    ];
  }
  const policies = value.split(",") as AiStrategy[];
  if (policies.length === 0 || policies.some((policy) => !AI_STRATEGIES.includes(policy))) {
    throw new Error(`--policies must be ${AI_STRATEGIES.join(", ")}, a comma-separated subset, all, or mixed`);
  }
  return [[...new Set(policies)]];
}

export function parseArtifactSimulationArgs(args = process.argv.slice(2)): ParsedArgs {
  let games = 1_000;
  let seed = 7_142_031;
  let playerCounts = [2, 3, 4];
  let victoryRequirements = [15, 20];
  let modes: SimulationMode[] = ["standard", "artifacts-only"];
  let output: string | null = null;
  let candidateIds: BalanceCandidateId[] = ["control"];
  let policyLineups: AiStrategy[][] = [["adaptive"]];
  let reportV2 = false;
  let modeExplicit = false;

  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    const value = args[index + 1];
    if (flag === "--games" && value) games = Number.parseInt(args[++index]!, 10);
    else if (flag === "--seed" && value) seed = Number.parseInt(args[++index]!, 10);
    else if (flag === "--players" && value) {
      playerCounts = parseNumberList(args[++index]!, [2, 3, 4], "--players");
    } else if (flag === "--victory" && value) {
      victoryRequirements = parseNumberList(args[++index]!, [15, 20, 25], "--victory");
    } else if (flag === "--formats" && value) {
      const formats = value === "all"
        ? (Object.keys(BALANCE_FORMATS) as BalanceFormat[])
        : value.split(",") as BalanceFormat[];
      if (formats.some((format) => !(format in BALANCE_FORMATS))) {
        throw new Error("--formats must be quick, standard, epic, a comma-separated subset, or all");
      }
      victoryRequirements = [...new Set(formats.map((format) => BALANCE_FORMATS[format]))];
      reportV2 = true;
      index++;
    } else if (flag === "--mode" && value) {
      modes = parseModes(args[++index]!);
      modeExplicit = true;
    } else if (flag === "--candidate" && value) {
      candidateIds = parseCandidates(args[++index]!);
      reportV2 = true;
    } else if (flag === "--policies" && value) {
      policyLineups = parsePolicyLineups(args[++index]!);
      reportV2 = true;
    } else if (flag === "--report-v2") {
      reportV2 = true;
    } else if ((flag === "--output" || flag === "-o") && value) {
      output = args[++index]!;
    }
  }

  if (!Number.isInteger(games) || games < 1) throw new Error("--games must be a positive integer");
  if (!Number.isInteger(seed)) throw new Error("--seed must be an integer");
  if (reportV2 && !modeExplicit) modes = ["standard"];
  return {
    games,
    seed,
    playerCounts,
    victoryRequirements,
    modes,
    output,
    candidateIds,
    policyLineups,
    reportV2,
  };
}

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function emptyAffinityTotals(): Record<NaturalAffinityKey, number> {
  return { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0 };
}

function emptyFinishReasons(): Record<BalanceFinishReason, number> {
  return {
    eminence: 0,
    frontier_exhaustion: 0,
    max_turns: 0,
    presentation_error: 0,
    action_error: 0,
    other: 0,
  };
}

function resolvePresentations(state: GameStateData): string | null {
  for (let guard = 0; guard < 100; guard++) {
    const choice = state.pendingLuminaryChoice;
    if (choice) {
      const result = applyAction(state, choice.playerId, {
        type: "choose_luminary_order",
        orderedIds: [...choice.candidates],
      });
      if (!result.success) return `choice:${result.error ?? "unknown"}`;
      continue;
    }

    let action: ActionPayload | null = null;
    const summon = state.pendingSummonEvents?.[0];
    const activation = summon ? null : state.pendingLuminaryActivationEvents?.[0];
    const manifestation = summon || activation ? null : state.pendingBlueprintManifestationEvents?.[0];
    const detonation = summon || activation || manifestation
      ? null
      : state.pendingBlueprintDetonationEvents?.[0];

    if (summon) action = { type: "resolve_summon", eventId: summon.eventId };
    else if (activation) action = { type: "resolve_luminary_activation", eventId: activation.eventId };
    else if (manifestation) action = { type: "resolve_blueprint_manifestation", eventId: manifestation.eventId };
    else if (detonation) action = { type: "resolve_blueprint_detonation", eventId: detonation.eventId };
    else return state.pendingTurnTransition ? `transition:${state.pendingTurnTransition.stage}` : null;

    const result = applyAction(state, state.players[0]!.playerId, action);
    if (!result.success) return `presentation:${result.error ?? action.type}`;
  }
  return "presentation-guard-exhausted";
}

function recoverAction(state: GameStateData, playerId: string): ActionPayload["type"] | null {
  for (const affinity of NATURAL_AFFINITY_KEYS) {
    if (state.affinityWell[affinity] < 1) continue;
    const action: ActionPayload = {
      type: "harness_three_affinities",
      affinities: { [affinity]: 1 },
    };
    if (applyAction(state, playerId, action).success) return action.type;
  }
  const pass: ActionPayload = { type: "pass" };
  return applyAction(state, playerId, pass).success ? pass.type : null;
}

function shareMap(totals: Record<NaturalAffinityKey, number>): Record<NaturalAffinityKey, number> {
  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
  return Object.fromEntries(
    NATURAL_AFFINITY_KEYS.map((affinity) => [affinity, percentage(totals[affinity], total)]),
  ) as Record<NaturalAffinityKey, number>;
}

function formatForVictory(victoryRequirement: number): BalanceFormat {
  if (victoryRequirement <= BALANCE_FORMATS.quick) return "quick";
  if (victoryRequirement >= BALANCE_FORMATS.epic) return "epic";
  return "standard";
}

function visibleArtifactIds(state: GameStateData): string[] {
  return [...state.forgeTier1, ...state.forgeTier2, ...state.forgeTier3];
}

function observeMarket(state: GameStateData, tracker: MarketTracker): void {
  const visible = visibleArtifactIds(state);
  const visibleSet = new Set(visible);
  for (const known of tracker.firstSeenTurn.keys()) {
    if (!visibleSet.has(known)) tracker.firstSeenTurn.delete(known);
  }
  for (const artifactId of visible) {
    if (!tracker.firstSeenTurn.has(artifactId)) tracker.firstSeenTurn.set(artifactId, state.turnCount);
    const age = Math.max(0, state.turnCount - (tracker.firstSeenTurn.get(artifactId) ?? state.turnCount));
    tracker.samples++;
    tracker.totalAge += age;
    tracker.ageHistogram.set(age, (tracker.ageHistogram.get(age) ?? 0) + 1);
  }
}

function histogramPercentile(histogram: Map<number, number>, quantile: number): number {
  const total = [...histogram.values()].reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;
  const target = Math.ceil(total * quantile);
  let seen = 0;
  for (const [age, count] of [...histogram.entries()].sort(([left], [right]) => left - right)) {
    seen += count;
    if (seen >= target) return age;
  }
  return 0;
}

function observeLead(state: GameStateData, tracker: GameLeadTracker): void {
  const maxEminence = Math.max(...state.players.map((player) => player.eminence));
  const leaders = state.players.filter((player) => player.eminence === maxEminence);
  const uniqueLeaderId = leaders.length === 1 ? leaders[0]!.playerId : null;
  if (
    uniqueLeaderId &&
    tracker.uniqueLeaderId &&
    uniqueLeaderId !== tracker.uniqueLeaderId
  ) {
    tracker.changes++;
  }
  if (uniqueLeaderId) tracker.uniqueLeaderId = uniqueLeaderId;

  if (!tracker.leaderAt5) {
    const first = state.players
      .filter((player) => player.eminence >= 5)
      .sort((left, right) => right.eminence - left.eminence)[0];
    if (first) tracker.leaderAt5 = first.playerId;
  }
  if (!tracker.leaderAt10) {
    const first = state.players
      .filter((player) => player.eminence >= 10)
      .sort((left, right) => right.eminence - left.eminence)[0];
    if (first) tracker.leaderAt10 = first.playerId;
  }
  for (const player of state.players) {
    tracker.maxDeficitByPlayer[player.playerId] = Math.max(
      tracker.maxDeficitByPlayer[player.playerId] ?? 0,
      maxEminence - player.eminence,
    );
  }
}

function forgeAndArchivesEmpty(state: GameStateData): boolean {
  return visibleArtifactIds(state).length === 0 &&
    state.deckTier1.length === 0 &&
    state.deckTier2.length === 0 &&
    state.deckTier3.length === 0;
}

function classifyFinishedGame(state: GameStateData): BalanceFinishReason {
  if (forgeAndArchivesEmpty(state)) return "frontier_exhaustion";
  if (state.players.some((player) => player.eminence >= (state.victoryRequirement ?? 15))) {
    return "eminence";
  }
  return "other";
}

function policyForSeat(lineup: readonly AiStrategy[], seat: number, gameIndex: number): AiStrategy {
  return lineup[(seat + gameIndex) % lineup.length]!;
}

function expandedPolicySeats(lineup: readonly AiStrategy[], playerCount: number): AiStrategy[] {
  return Array.from({ length: playerCount }, (_, seat) => lineup[seat % lineup.length]!);
}

function naturalHeld(player: PlayerGameState): number {
  return NATURAL_AFFINITY_KEYS.reduce((sum, affinity) => sum + player.affinities[affinity], 0);
}

function singularityHeld(player: PlayerGameState): number {
  return Math.max(0, player.affinities.singularity ?? 0);
}

function zeroCostObservation(
  state: GameStateData,
  player: PlayerGameState,
  action: ActionPayload,
  ruleset: BalanceRuleset,
  encryptedAt: Map<string, number>,
): ZeroCostObservation {
  if (
    action.type !== "forge_artifact" &&
    action.type !== "forge_reserved_artifact" &&
    action.type !== "foundry_forge_artifact"
  ) {
    return { all: false, advanced: false, lineageEarned: false };
  }
  const cardId = "cardId" in action ? action.cardId : undefined;
  const card = cardId ? CARD_MAP.get(cardId) : undefined;
  if (!card) return { all: false, advanced: false, lineageEarned: false };

  const bonuses = effectiveAffinityBonuses(state, player);
  const remaining = Object.fromEntries(
    NATURAL_AFFINITY_KEYS.map((affinity) => [
      affinity,
      Math.max(0, card.cost[affinity] - bonuses[affinity]),
    ]),
  ) as Record<NaturalAffinityKey, number>;
  const reservationKey = `${player.playerId}:${card.id}`;
  if (
    ruleset.encryptReward === "artifact_bound_focus" &&
    action.type === "forge_reserved_artifact" &&
    encryptedAt.has(reservationKey)
  ) {
    const requestedFocus = action.affinity ?? null;
    const focusAffinity = requestedFocus && remaining[requestedFocus] > 0
      ? requestedFocus
      : NATURAL_AFFINITY_KEYS.find((affinity) => remaining[affinity] > 0);
    if (focusAffinity) remaining[focusAffinity]--;
  }

  const definition = ARTIFACT_DEFINITIONS[card.id as keyof typeof ARTIFACT_DEFINITIONS];
  const advanced = card.tier >= 2;
  const lineageEarned = advanced &&
    ruleset.advancedPayment === "minimum_one_lineage_waiver" &&
    (definition?.builtOn.some((artifactId) =>
      player.forgedArtifactIds.includes(artifactId),
    ) ?? false);
  if (lineageEarned) {
    const affinity = NATURAL_AFFINITY_KEYS.find((candidate) => remaining[candidate] > 0);
    if (affinity) remaining[affinity]--;
  }
  const naturalCostIsZero = NATURAL_AFFINITY_KEYS.every(
    (affinity) => remaining[affinity] === 0,
  );
  if (!naturalCostIsZero) return { all: false, advanced: false, lineageEarned: false };
  const floorApplies = advanced && ruleset.advancedPayment !== "current";
  // A valid Built On connection is the approved waiver. It both substitutes
  // one remaining requirement and prevents the advanced-payment floor from
  // reimposing that same requirement when the substitution reaches zero.
  const floorWaived = lineageEarned;
  const actualZero = !floorApplies || floorWaived;
  return {
    all: actualZero,
    advanced: actualZero && advanced,
    lineageEarned: actualZero && lineageEarned,
  };
}

function distinctTierThreeCount(player: PlayerGameState): number {
  return new Set(
    Object.entries(player.artifactForgeCounts ?? {})
      .filter(([, count]) => count > 0)
      .map(([artifactId]) => artifactId)
      .filter((artifactId) => CARD_MAP.get(artifactId)?.tier === 3),
  ).size;
}

function observeTierThreeMilestones(
  state: GameStateData,
  milestoneTurns: Map<string, Map<1 | 2, number>>,
): void {
  for (const player of state.players) {
    const count = distinctTierThreeCount(player);
    let playerMilestones = milestoneTurns.get(player.playerId);
    if (!playerMilestones) {
      playerMilestones = new Map<1 | 2, number>();
      milestoneTurns.set(player.playerId, playerMilestones);
    }
    if (count >= 1 && !playerMilestones.has(1)) playerMilestones.set(1, state.turnCount);
    if (count >= 2 && !playerMilestones.has(2)) playerMilestones.set(2, state.turnCount);
  }
}

function requiredTierThreeForFormat(victoryRequirement: number): 0 | 1 | 2 {
  if (victoryRequirement < BALANCE_FORMATS.standard) return 0;
  if (victoryRequirement < BALANCE_FORMATS.epic) return 1;
  return 2;
}

function emptyScoreBreakdown(): BalanceScoreSourceBreakdown {
  return {
    artifact: 0,
    luminaryArrival: 0,
    startingCompensation: 0,
    blueprintProject: 0,
    other: 0,
    total: 0,
  };
}

function addScoreBreakdown(
  target: BalanceScoreSourceBreakdown,
  source: BalanceScoreSourceBreakdown,
): void {
  target.artifact += source.artifact;
  target.luminaryArrival += source.luminaryArrival;
  target.startingCompensation += source.startingCompensation;
  target.blueprintProject += source.blueprintProject;
  target.other += source.other;
  target.total += source.total;
}

function averageScoreBreakdown(
  total: BalanceScoreSourceBreakdown,
  denominator: number,
): BalanceScoreSourceBreakdown {
  const safeDenominator = Math.max(1, denominator);
  return {
    artifact: rounded(total.artifact / safeDenominator),
    luminaryArrival: rounded(total.luminaryArrival / safeDenominator),
    startingCompensation: rounded(total.startingCompensation / safeDenominator),
    blueprintProject: rounded(total.blueprintProject / safeDenominator),
    other: rounded(total.other / safeDenominator),
    total: rounded(total.total / safeDenominator),
  };
}

function createPlayerScoreContexts(state: GameStateData): Map<string, PlayerScoreContext> {
  return new Map(state.players.map((player) => [player.playerId, {
    startingCompensation: player.eminence,
    artifacts: { scoresByArtifactId: new Map() },
  }]));
}

function coreForgeArtifactId(action: ActionPayload): string | null {
  if (
    action.type !== "forge_artifact" &&
    action.type !== "forge_reserved_artifact" &&
    action.type !== "foundry_forge_artifact" &&
    action.type !== "recover_foundry_component"
  ) {
    return null;
  }
  return "cardId" in action && typeof action.cardId === "string" ? action.cardId : null;
}

function artifactScoreAwardBeforeAction(
  state: GameStateData,
  player: PlayerGameState,
  action: ActionPayload,
): { artifactId: string; forgeCountBefore: number; eminence: number } | null {
  const artifactId = coreForgeArtifactId(action);
  const card = artifactId ? CARD_MAP.get(artifactId) : undefined;
  if (!artifactId || !card) return null;
  if (action.type === "recover_foundry_component") {
    return {
      artifactId,
      forgeCountBefore: player.artifactForgeCounts?.[artifactId] ?? 0,
      eminence: card.eminence,
    };
  }

  const brands = getArtifactBrands(state.artifactMarkers?.[artifactId]);
  const hasNullified = brands.some((brand) => brand.type === "nullified");
  const firstNullifiedExemption = hasNullified &&
    !state.nullifiedFirstForge &&
    brands.some((brand) => brand.type === "nullified" && brand.ownerId === player.playerId);
  const suppressed = brands.some((brand) =>
    brand.type === "forgotten" ||
    brand.type === "condemned" ||
    (brand.type === "nullified" && !firstNullifiedExemption),
  );
  return {
    artifactId,
    forgeCountBefore: player.artifactForgeCounts?.[artifactId] ?? 0,
    eminence: suppressed ? 0 : card.eminence,
  };
}

function recordSuccessfulArtifactScore(
  state: GameStateData,
  playerId: string,
  observation: ReturnType<typeof artifactScoreAwardBeforeAction>,
  contexts: Map<string, PlayerScoreContext>,
): void {
  if (!observation) return;
  const player = state.players.find((candidate) => candidate.playerId === playerId);
  const context = contexts.get(playerId);
  if (!player || !context) return;
  const forgeCountAfter = player.artifactForgeCounts?.[observation.artifactId] ?? 0;
  const additions = Math.max(0, forgeCountAfter - observation.forgeCountBefore);
  if (additions === 0) return;
  const retainedCount = player.forgedArtifactIds.filter(
    (artifactId) => artifactId === observation.artifactId,
  ).length;
  const scores = context.artifacts.scoresByArtifactId.get(observation.artifactId) ?? [];
  for (let index = 0; index < additions && scores.length < retainedCount; index++) {
    scores.push(observation.eminence);
  }
  if (scores.length > 0) {
    context.artifacts.scoresByArtifactId.set(observation.artifactId, scores);
  }
}

function reconcileRetainedArtifactScores(
  state: GameStateData,
  contexts: Map<string, PlayerScoreContext>,
): void {
  for (const player of state.players) {
    const context = contexts.get(player.playerId);
    if (!context) continue;
    const retainedCounts = new Map<string, number>();
    for (const artifactId of player.forgedArtifactIds) {
      retainedCounts.set(artifactId, (retainedCounts.get(artifactId) ?? 0) + 1);
    }
    for (const [artifactId, scores] of context.artifacts.scoresByArtifactId) {
      const retained = retainedCounts.get(artifactId) ?? 0;
      if (scores.length > retained) scores.splice(retained);
      if (scores.length === 0) context.artifacts.scoresByArtifactId.delete(artifactId);
    }
  }
}

function retainedArtifactScore(context: PlayerScoreContext): number {
  let total = 0;
  for (const scores of context.artifacts.scoresByArtifactId.values()) {
    total += scores.reduce((sum, score) => sum + score, 0);
  }
  return total;
}

function luminaryArrivalScore(
  player: PlayerGameState,
  ruleset: BalanceRuleset,
  mode: SimulationMode,
): number {
  if (ruleset.luminaryBaseEminence === "none" || mode === "luminary-no-base-eminence") {
    return 0;
  }
  const counts = player.luminaryAllianceCounts ?? Object.fromEntries(
    player.luminaries.map((luminaryId) => [luminaryId, 1]),
  );
  return Object.entries(counts).reduce((sum, [luminaryId, count]) =>
    sum + (LUMINARY_MAP.get(luminaryId)?.eminence ?? 0) * count,
  0);
}

function blueprintManifestationScore(player: PlayerGameState): number {
  const projects = player.manifestedBlueprintProjects?.length
    ? player.manifestedBlueprintProjects
    : player.manifestedBlueprintDevices ?? [];
  return [...new Set(projects.map((project) => project.blueprintId))].reduce(
    (sum, blueprintId) => sum + (BLUEPRINT_DEFINITIONS[blueprintId]?.manifestationEminence ?? 0),
    0,
  );
}

function playerScoreBreakdown(
  player: PlayerGameState,
  context: PlayerScoreContext,
  ruleset: BalanceRuleset,
  mode: SimulationMode,
): BalanceScoreSourceBreakdown {
  const artifact = retainedArtifactScore(context);
  const luminaryArrival = luminaryArrivalScore(player, ruleset, mode);
  const startingCompensation = context.startingCompensation;
  const blueprintProject = blueprintManifestationScore(player);
  return {
    artifact,
    luminaryArrival,
    startingCompensation,
    blueprintProject,
    other: player.eminence - artifact - luminaryArrival - startingCompensation - blueprintProject,
    total: player.eminence,
  };
}

function configureLegacyMode(state: GameStateData, mode: SimulationMode): void {
  if (mode === "artifacts-only") state.activeLuminaries = [];
  if (mode === "luminary-no-base-eminence") {
    setBalanceSimulationOverrides(state, { suppressLuminaryBaseEminence: true });
  } else if (mode === "luminary-one-claim-cap") {
    setBalanceSimulationOverrides(state, { maxLuminaryClaimsPerPlayer: 1 });
  }
}

function runScenario(
  games: number,
  seed: number,
  playerCount: number,
  victoryRequirement: number,
  mode: SimulationMode,
  candidateId: BalanceCandidateId,
  policyLineup: readonly AiStrategy[],
): ScenarioResult {
  const selectedRuleset = getBalanceRulesetCandidate(candidateId);
  if (!selectedRuleset) throw new Error(`Unknown balance candidate: ${candidateId}`);
  const ruleset: BalanceRuleset = { ...selectedRuleset };
  const seatWins = Array.from({ length: playerCount }, () => 0);
  const openingPositionWins = Array.from({ length: playerCount }, () => 0);
  const forgedByTier = [0, 0, 0];
  const winnerForgedByTier = [0, 0, 0];
  const finalEminenceByOpeningPosition = Array.from({ length: playerCount }, () => 0);
  const luminaryClaimsByOpeningPosition = Array.from({ length: playerCount }, () => 0);
  const luminaryBaseEminenceByOpeningPosition = Array.from({ length: playerCount }, () => 0);
  const allBonuses = emptyAffinityTotals();
  const winnerBonuses = emptyAffinityTotals();
  const cardCounters = new Map<string, CardCounter>(
    [...CARD_MAP.keys()].map((cardId) => [cardId, { forged: 0, ownerGames: 0, ownerWins: 0 }]),
  );
  const luminaryCounters = new Map<string, LuminaryCounter>(
    [...LUMINARY_MAP.keys()].map((luminaryId) => [luminaryId, {
      claims: 0,
      ownerWins: 0,
      openingPositionClaims: Array.from({ length: playerCount }, () => 0),
    }]),
  );
  const finishReasons = emptyFinishReasons();
  const actionCounts: Record<string, number> = {};
  const actionFailures: Record<string, number> = {};
  const policyGames: Partial<Record<AiStrategy, number>> = {};
  const policyWins: Partial<Record<AiStrategy, number>> = {};
  const market: MarketTracker = {
    firstSeenTurn: new Map(),
    ageHistogram: new Map(),
    samples: 0,
    totalAge: 0,
  };
  const turnLengths: number[] = [];
  const conversionTurns: number[] = [];
  let completed = 0;
  let stalled = 0;
  let equalTurnViolations = 0;
  let totalWinnerEminence = 0;
  let totalDecisionTurns = 0;
  let anyColorEmptyTurns = 0;
  let fullyEmptyTurns = 0;
  let noLegalActionRecoveries = 0;
  let winnerTier3Reach = 0;
  let winnerTier3AtLeastTwo = 0;
  const winnerTier3ExactCounts = new Map<number, number>();
  const requiredTierThree = requiredTierThreeForFormat(victoryRequirement);
  const requiredMilestoneAttainmentFractions: number[] = [];
  const requiredMilestoneTurnsBeforeEnd: number[] = [];
  let requiredMilestoneNearEndingGames = 0;
  const allPlayerScoreSources = emptyScoreBreakdown();
  const winnerScoreSources = emptyScoreBreakdown();
  let zeroCostAll = 0;
  let zeroCostAdvanced = 0;
  let zeroCostLineage = 0;
  let encryptAttempts = 0;
  let encryptSuccesses = 0;
  let encryptConversions = 0;
  let encryptStranded = 0;
  let encryptRewardGenerated = 0;
  let encryptRewardSpent = 0;
  let encryptRewardUnused = 0;
  let totalLeadChanges = 0;
  let leaderAt5Games = 0;
  let leaderAt5Wins = 0;
  let leaderAt10Games = 0;
  let leaderAt10Wins = 0;
  let comebackWins = 0;

  for (let gameIndex = 0; gameIndex < games; gameIndex++) {
    // Candidate runs receive identical initial randomness and policy rotations.
    Math.random = seededRandom(seed + playerCount * 1_000_003 + gameIndex * 9_973);
    const playerDefs = Array.from({ length: playerCount }, (_, seat) => ({
      id: `g${gameIndex}-p${seat}`,
      name: `${policyForSeat(policyLineup, seat, gameIndex)} AI ${seat + 1}`,
    }));
    const state = initializeGame(
      playerDefs,
      playerCount,
      victoryRequirement,
      "standard",
      {
        ...(mode === "luminary-expanded-pool"
          ? { luminaryCountOverride: Math.min(playerCount * 2, 9) }
          : {}),
        applyTurnOrderCompensation: mode === "standard",
        balanceRuleset: ruleset,
      },
    );
    setBalanceRuleset(state, ruleset);
    configureLegacyMode(state, mode);
    market.firstSeenTurn.clear();
    const scoreContexts = createPlayerScoreContexts(state);
    const tierThreeMilestoneTurns = new Map<string, Map<1 | 2, number>>();
    observeTierThreeMilestones(state, tierThreeMilestoneTurns);

    const turnsBySeat = Array.from({ length: playerCount }, () => 0);
    const encryptedAt = new Map<string, number>();
    const lead: GameLeadTracker = {
      uniqueLeaderId: null,
      changes: 0,
      leaderAt5: null,
      leaderAt10: null,
      maxDeficitByPlayer: Object.fromEntries(playerDefs.map((player) => [player.id, 0])),
    };
    let failureReason: BalanceFinishReason | null = null;
    let hitTurnLimit = true;
    observeLead(state, lead);

    for (let turn = 0; turn < MAX_TURNS && state.phase !== "finished"; turn++) {
      const presentationError = resolvePresentations(state);
      if (presentationError) {
        failureReason = "presentation_error";
        hitTurnLimit = false;
        break;
      }
      if ((state.phase as string) === "finished") {
        hitTurnLimit = false;
        break;
      }
      reconcileRetainedArtifactScores(state, scoreContexts);

      observeMarket(state, market);
      observeLead(state, lead);
      totalDecisionTurns++;
      if (NATURAL_AFFINITY_KEYS.some((affinity) => state.affinityWell[affinity] === 0)) {
        anyColorEmptyTurns++;
      }
      if (NATURAL_AFFINITY_KEYS.every((affinity) => state.affinityWell[affinity] === 0)) {
        fullyEmptyTurns++;
      }

      const seat = state.currentPlayerIndex;
      const currentPlayer = state.players[seat]!;
      const strategy = policyForSeat(policyLineup, seat, gameIndex);
      const action = chooseAiAction(state, currentPlayer.playerId, "hard", { strategy });
      const artifactScoreObservation = artifactScoreAwardBeforeAction(
        state,
        currentPlayer,
        action,
      );
      const zeroCost = zeroCostObservation(state, currentPlayer, action, ruleset, encryptedAt);
      const singularityBefore = singularityHeld(currentPlayer);
      const heldBefore = naturalHeld(currentPlayer);
      if (action.type === "reserve_artifact") encryptAttempts++;

      const result = applyAction(state, currentPlayer.playerId, action);
      if (!result.success) {
        const failureKey = `${action.type}: ${result.error ?? "unknown"}`;
        actionFailures[failureKey] = (actionFailures[failureKey] ?? 0) + 1;
        const recovered = recoverAction(state, currentPlayer.playerId);
        if (!recovered) {
          failureReason = "action_error";
          hitTurnLimit = false;
          break;
        }
        noLegalActionRecoveries++;
        actionCounts[recovered] = (actionCounts[recovered] ?? 0) + 1;
      } else {
        recordSuccessfulArtifactScore(
          state,
          currentPlayer.playerId,
          artifactScoreObservation,
          scoreContexts,
        );
        actionCounts[action.type] = (actionCounts[action.type] ?? 0) + 1;
        if (zeroCost.all) zeroCostAll++;
        if (zeroCost.advanced) zeroCostAdvanced++;
        if (zeroCost.lineageEarned) zeroCostLineage++;
        if (action.type === "reserve_artifact") {
          encryptSuccesses++;
          const reservedId = "cardId" in action ? action.cardId : undefined;
          if (reservedId) encryptedAt.set(`${currentPlayer.playerId}:${reservedId}`, state.turnCount);
          if (ruleset.encryptReward === "artifact_bound_focus") encryptRewardGenerated++;
          else if (ruleset.encryptReward === "portable_singularity") {
            encryptRewardGenerated += Math.max(0, singularityHeld(currentPlayer) - singularityBefore);
          }
        }
        if (action.type === "forge_reserved_artifact") {
          const key = `${currentPlayer.playerId}:${action.cardId}`;
          const encryptedTurn = encryptedAt.get(key);
          if (encryptedTurn !== undefined) {
            encryptConversions++;
            conversionTurns.push(Math.max(0, state.turnCount - encryptedTurn));
            encryptedAt.delete(key);
            if (ruleset.encryptReward === "artifact_bound_focus") encryptRewardSpent++;
          }
        }
        if (
          ruleset.encryptReward === "portable_singularity" &&
          (
            action.type === "forge_artifact" ||
            action.type === "forge_reserved_artifact" ||
            action.type === "foundry_forge_artifact"
          )
        ) {
          encryptRewardSpent += Math.max(0, singularityBefore - singularityHeld(currentPlayer));
        }
      }

      // Forge history is lifetime state, so the first observed crossing remains
      // valid even if an implementation is later damaged or annihilated.
      observeTierThreeMilestones(state, tierThreeMilestoneTurns);

      // Count the interval even when the selected policy needed a legal recovery.
      turnsBySeat[seat]++;
      if (naturalHeld(currentPlayer) > heldBefore + 3) {
        // An effect, not Harness itself, changed holdings; no synthetic action is added.
      }
      observeLead(state, lead);
      if ((state.phase as string) === "finished") hitTurnLimit = false;
    }

    const finalPresentationError = resolvePresentations(state);
    reconcileRetainedArtifactScores(state, scoreContexts);
    if (finalPresentationError && state.phase !== "finished") {
      failureReason = "presentation_error";
      hitTurnLimit = false;
    }
    observeLead(state, lead);
    if (state.phase !== "finished") {
      const reason: BalanceFinishReason = failureReason ?? (hitTurnLimit ? "max_turns" : "other");
      finishReasons[reason]++;
      stalled++;
      continue;
    }

    completed++;
    const finishReason = classifyFinishedGame(state);
    finishReasons[finishReason]++;
    turnLengths.push(state.turnCount);
    if (Math.max(...turnsBySeat) !== Math.min(...turnsBySeat)) equalTurnViolations++;
    const winnerSeat = state.players.findIndex((player) => player.playerId === state.winnerId);
    if (winnerSeat < 0) continue;
    const winner = state.players[winnerSeat]!;
    totalWinnerEminence += winner.eminence;
    seatWins[winnerSeat]++;
    const winnerTierThreeCount = distinctTierThreeCount(winner);
    winnerTier3ExactCounts.set(
      winnerTierThreeCount,
      (winnerTier3ExactCounts.get(winnerTierThreeCount) ?? 0) + 1,
    );
    if (winnerTierThreeCount >= 1) winnerTier3Reach++;
    if (winnerTierThreeCount >= 2) winnerTier3AtLeastTwo++;
    if (requiredTierThree > 0) {
      const requiredMilestone = requiredTierThree as 1 | 2;
      const attainmentTurn = tierThreeMilestoneTurns
        .get(winner.playerId)
        ?.get(requiredMilestone);
      if (attainmentTurn !== undefined) {
        const attainmentFraction = state.turnCount > 0
          ? Math.min(1, attainmentTurn / state.turnCount)
          : 1;
        requiredMilestoneAttainmentFractions.push(attainmentFraction);
        requiredMilestoneTurnsBeforeEnd.push(Math.max(0, state.turnCount - attainmentTurn));
        if (attainmentFraction >= 0.75) requiredMilestoneNearEndingGames++;
      }
    }

    const openingSeat = state.players.findIndex(
      (player) => player.playerId === state.openingTurnOrder?.firstPlayerId,
    );
    const openingPosition = openingSeat >= 0
      ? (winnerSeat - openingSeat + playerCount) % playerCount
      : winnerSeat;
    openingPositionWins[openingPosition]++;

    totalLeadChanges += lead.changes;
    if (lead.leaderAt5) {
      leaderAt5Games++;
      if (lead.leaderAt5 === winner.playerId) leaderAt5Wins++;
    }
    if (lead.leaderAt10) {
      leaderAt10Games++;
      if (lead.leaderAt10 === winner.playerId) leaderAt10Wins++;
    }
    if ((lead.maxDeficitByPlayer[winner.playerId] ?? 0) >= COMEBACK_DEFICIT) comebackWins++;

    for (const [seat, player] of state.players.entries()) {
      const strategy = policyForSeat(policyLineup, seat, gameIndex);
      policyGames[strategy] = (policyGames[strategy] ?? 0) + 1;
      if (player.playerId === winner.playerId) policyWins[strategy] = (policyWins[strategy] ?? 0) + 1;
      const scoreContext = scoreContexts.get(player.playerId);
      if (scoreContext) {
        const breakdown = playerScoreBreakdown(player, scoreContext, ruleset, mode);
        addScoreBreakdown(allPlayerScoreSources, breakdown);
        if (player.playerId === winner.playerId) {
          addScoreBreakdown(winnerScoreSources, breakdown);
        }
      }
      const playerOpeningPosition = openingSeat >= 0
        ? (seat - openingSeat + playerCount) % playerCount
        : seat;
      finalEminenceByOpeningPosition[playerOpeningPosition] += player.eminence;
      encryptStranded += new Set([
        ...player.reservedArtifactIds,
        ...(player.privateReservedArtifactIds ?? []),
      ]).size;
      if (ruleset.encryptReward === "portable_singularity") {
        encryptRewardUnused += singularityHeld(player);
      } else if (ruleset.encryptReward === "artifact_bound_focus") {
        encryptRewardUnused += (
          state.experimentalBalanceState?.focusedReservationIdsByPlayerId?.[player.playerId] ?? []
        ).length;
      }

      for (const luminaryId of player.luminaries) {
        const luminary = LUMINARY_MAP.get(luminaryId);
        const counter = luminaryCounters.get(luminaryId);
        if (!luminary || !counter) continue;
        counter.claims++;
        counter.openingPositionClaims[playerOpeningPosition]++;
        luminaryClaimsByOpeningPosition[playerOpeningPosition]++;
        luminaryBaseEminenceByOpeningPosition[playerOpeningPosition] +=
          ruleset.luminaryBaseEminence === "none" ? 0 : luminary.eminence;
        if (player.playerId === winner.playerId) counter.ownerWins++;
      }

      for (const [cardId, count] of Object.entries(player.artifactForgeCounts ?? {})) {
        if (count < 1) continue;
        const card = CARD_MAP.get(cardId);
        const counter = cardCounters.get(cardId);
        if (!card || !counter) continue;
        counter.forged += count;
        counter.ownerGames++;
        forgedByTier[card.tier - 1] += count;
        allBonuses[card.bonusAffinity] += count;
        if (player.playerId === winner.playerId) {
          counter.ownerWins++;
          winnerForgedByTier[card.tier - 1] += count;
          winnerBonuses[card.bonusAffinity] += count;
        }
      }
    }
  }

  const safeCompleted = Math.max(1, completed);
  const claimsByOpeningPosition = luminaryClaimsByOpeningPosition.map(
    (count) => rounded(count / safeCompleted, 3),
  );
  const baseEminenceByOpeningPosition = luminaryBaseEminenceByOpeningPosition.map(
    (count) => rounded(count / safeCompleted, 3),
  );
  const cardReport = Object.fromEntries([...cardCounters.entries()].map(([cardId, counter]) => [cardId, {
    forgeRatePerGame: rounded(counter.forged / safeCompleted, 4),
    ownerWinRate: percentage(counter.ownerWins, counter.ownerGames),
    ownerGames: counter.ownerGames,
  }]));
  const luminaryReport = Object.fromEntries(
    [...luminaryCounters.entries()].map(([luminaryId, counter]) => [luminaryId, {
      claimsPerGame: rounded(counter.claims / safeCompleted, 4),
      ownerWinRate: percentage(counter.ownerWins, counter.claims),
      openingPositionClaimShares: counter.openingPositionClaims.map(
        (claims) => percentage(claims, counter.claims),
      ),
    }]),
  );
  const totalActions = Object.values(actionCounts).reduce((sum, count) => sum + count, 0);
  const actionShares = Object.fromEntries(
    Object.entries(actionCounts).map(([action, count]) => [action, percentage(count, totalActions)]),
  );
  const normalizedWinRates = Object.fromEntries(
    AI_STRATEGIES
      .filter((strategy) => (policyGames[strategy] ?? 0) > 0)
      .map((strategy) => {
        const opportunities = (policyGames[strategy] ?? 0) / playerCount;
        return [strategy, opportunities > 0 ? rounded(((policyWins[strategy] ?? 0) / opportunities) * 100) : 0];
      }),
  );
  const allBonusShares = shareMap(allBonuses);
  const winnerBonusShares = shareMap(winnerBonuses);
  const largestWinnerTierThreeCount = Math.max(2, ...winnerTier3ExactCounts.keys());
  const winnerTier3ExactGames = Object.fromEntries(
    Array.from({ length: largestWinnerTierThreeCount + 1 }, (_, count) => [
      String(count),
      winnerTier3ExactCounts.get(count) ?? 0,
    ]),
  );
  const winnerTier3ExactRates = Object.fromEntries(
    Object.entries(winnerTier3ExactGames).map(([count, countGames]) => [
      count,
      percentage(countGames, completed),
    ]),
  );
  const requiredTierThreeWinners = requiredTierThree === 0
    ? completed
    : [...winnerTier3ExactCounts.entries()].reduce(
      (sum, [count, countGames]) => sum + (count >= requiredTierThree ? countGames : 0),
      0,
    );

  const legacy: LegacyScenarioReport = {
    playerCount,
    victoryRequirement,
    mode,
    gamesRequested: games,
    gamesCompleted: completed,
    completionRate: percentage(completed, games),
    stalledGames: stalled,
    averageTurns: rounded(average(turnLengths)),
    averageWinnerEminence: completed > 0 ? rounded(totalWinnerEminence / completed) : 0,
    seatWinRates: seatWins.map((wins) => percentage(wins, completed)),
    openingPositionWinRates: openingPositionWins.map((wins) => percentage(wins, completed)),
    averageForgedByTier: forgedByTier.map((count) => rounded(count / safeCompleted)),
    averageWinnerForgedByTier: winnerForgedByTier.map((count) => rounded(count / safeCompleted)),
    averageFinalEminenceByOpeningPosition: finalEminenceByOpeningPosition.map(
      (count) => rounded(count / safeCompleted),
    ),
    averageLuminaryClaimsByOpeningPosition: claimsByOpeningPosition,
    averageLuminaryBaseEminenceByOpeningPosition: baseEminenceByOpeningPosition,
    allArtifactBonusShares: allBonusShares,
    winnerArtifactBonusShares: winnerBonusShares,
    cards: cardReport,
    luminaries: luminaryReport,
  };

  const v2: BalanceScenarioV2 = {
    candidateId,
    ruleset,
    playerCount,
    format: formatForVictory(victoryRequirement),
    victoryRequirement,
    policySeats: expandedPolicySeats(policyLineup, playerCount),
    policyRotation: "cyclic_by_game",
    gamesRequested: games,
    gamesCompleted: completed,
    completionRate: percentage(completed, games),
    stalledGames: stalled,
    finishReasons,
    averageTurns: rounded(average(turnLengths)),
    medianTurns: percentile(turnLengths, 0.5),
    p90Turns: percentile(turnLengths, 0.9),
    equalTurnViolations,
    seatWinRates: legacy.seatWinRates,
    openingPositionWinRates: legacy.openingPositionWinRates,
    actionCounts,
    actionShares,
    actionFailures,
    forgedByTier: legacy.averageForgedByTier,
    winnerForgedByTier: legacy.averageWinnerForgedByTier,
    winnerTier3ReachRate: percentage(winnerTier3Reach, completed),
    winnerTier3Milestones: {
      exactCountGames: winnerTier3ExactGames,
      exactCountRates: winnerTier3ExactRates,
      atLeastOneRate: percentage(winnerTier3Reach, completed),
      atLeastTwoRate: percentage(winnerTier3AtLeastTwo, completed),
      requiredForFormat: requiredTierThree,
      requiredRate: requiredTierThree === 0
        ? null
        : percentage(requiredTierThreeWinners, completed),
      timing: {
        requiredMilestone: requiredTierThree,
        nearEndingWindowStart: 0.75,
        attainedGames: requiredMilestoneAttainmentFractions.length,
        attainedNearEndingGames: requiredMilestoneNearEndingGames,
        attainedNearEndingRate: requiredTierThree === 0
          ? null
          : percentage(requiredMilestoneNearEndingGames, completed),
        meanAttainmentTurnFraction: requiredMilestoneAttainmentFractions.length > 0
          ? rounded(average(requiredMilestoneAttainmentFractions), 4)
          : null,
        medianAttainmentTurnFraction: requiredMilestoneAttainmentFractions.length > 0
          ? rounded(percentile(requiredMilestoneAttainmentFractions, 0.5), 4)
          : null,
        meanTurnsBeforeEnd: requiredMilestoneTurnsBeforeEnd.length > 0
          ? rounded(average(requiredMilestoneTurnsBeforeEnd))
          : null,
      },
    },
    scoreSources: {
      allPlayersAverage: averageScoreBreakdown(
        allPlayerScoreSources,
        completed * playerCount,
      ),
      winnerAverage: averageScoreBreakdown(winnerScoreSources, completed),
    },
    zeroCostForges: {
      all: zeroCostAll,
      advanced: zeroCostAdvanced,
      lineageEarned: zeroCostLineage,
    },
    well: {
      anyColorEmptyTurnRate: percentage(anyColorEmptyTurns, totalDecisionTurns),
      fullyEmptyTurnRate: percentage(fullyEmptyTurns, totalDecisionTurns),
      noLegalActionRecoveries,
    },
    encrypt: {
      attempts: encryptAttempts,
      successes: encryptSuccesses,
      forgeConversions: encryptConversions,
      conversionRate: percentage(encryptConversions, encryptSuccesses),
      meanTurnsToConversion: conversionTurns.length > 0 ? rounded(average(conversionTurns)) : null,
      strandedAtEnd: encryptStranded,
      rewardGenerated: encryptRewardGenerated,
      rewardSpent: encryptRewardSpent,
      rewardUnused: encryptRewardUnused,
    },
    lead: {
      averageChanges: completed > 0 ? rounded(totalLeadChanges / completed) : 0,
      leaderAt5WinRate: leaderAt5Games > 0 ? percentage(leaderAt5Wins, leaderAt5Games) : null,
      leaderAt10WinRate: leaderAt10Games > 0 ? percentage(leaderAt10Wins, leaderAt10Games) : null,
      comebackWinRate: percentage(comebackWins, completed),
    },
    luminaries: {
      claimsByOpeningPosition,
      firstToLastAccessRatio: claimsByOpeningPosition.at(-1)
        ? rounded(claimsByOpeningPosition[0]! / claimsByOpeningPosition.at(-1)!, 3)
        : null,
      baseEminenceByOpeningPosition,
      perId: luminaryReport,
    },
    market: {
      averageVisibleAge: market.samples > 0 ? rounded(market.totalAge / market.samples) : 0,
      p90VisibleAge: histogramPercentile(market.ageHistogram, 0.9),
    },
    policies: {
      games: policyGames,
      wins: policyWins,
      normalizedWinRates,
    },
    allArtifactBonusShares: allBonusShares,
    winnerArtifactBonusShares: winnerBonusShares,
    limitations: [
      "Comeback means the eventual winner trailed the observed Eminence leader by at least 3.",
      "Visible-market age is sampled once per core decision interval.",
      "Portable reward spending is the observed Singularity decrease across successful Forge actions.",
      "Blueprint-slot rules are reported but this Artifact harness does not inject private Blueprint loadouts.",
      "Artifact score attribution tracks retained implementations from successful Forge actions and honors observed Forge-time brands; Artifact score granted by effects is left in other.",
      "Blueprint/Project score includes declared manifestation Eminence only; later Project payouts, Luminary-effect awards, removals that cross the zero-score floor, and unattributable interactions reconcile through other, which may be negative.",
    ],
  };

  return { legacy, v2 };
}

function printLegacyScenario(report: LegacyScenarioReport): void {
  console.log(`\n${report.playerCount}P · ${report.victoryRequirement} Eminence · ${report.mode}`);
  console.log(
    `  completed ${report.gamesCompleted}/${report.gamesRequested}` +
    ` · avg turns ${report.averageTurns}` +
    ` · winner Eminence ${report.averageWinnerEminence}`,
  );
  console.log(`  seat win %        ${report.seatWinRates.join(" / ")}`);
  console.log(`  opener-relative % ${report.openingPositionWinRates.join(" / ")}`);
  console.log(`  final Eminence    ${report.averageFinalEminenceByOpeningPosition.join(" / ")}`);
  console.log(`  Luminary claims   ${report.averageLuminaryClaimsByOpeningPosition.join(" / ")}`);
  console.log(`  Luminary reward   ${report.averageLuminaryBaseEminenceByOpeningPosition.join(" / ")}`);
  console.log(`  forged T1/T2/T3   ${report.averageForgedByTier.join(" / ")}`);
  console.log(`  winner T1/T2/T3   ${report.averageWinnerForgedByTier.join(" / ")}`);
}

function printV2Scenario(report: BalanceScenarioV2): void {
  console.log(
    `\n${report.candidateId} · ${report.playerCount}P · ${report.format}` +
    ` · ${report.policySeats.join("/")}`,
  );
  console.log(
    `  completed ${report.gamesCompleted}/${report.gamesRequested}` +
    ` · turns mean/p50/p90 ${report.averageTurns}/${report.medianTurns}/${report.p90Turns}` +
    ` · equal-turn violations ${report.equalTurnViolations}`,
  );
  console.log(`  opener-relative % ${report.openingPositionWinRates.join(" / ")}`);
  console.log(`  finish reasons     ${JSON.stringify(report.finishReasons)}`);
  console.log(`  action shares %    ${JSON.stringify(report.actionShares)}`);
  console.log(
    `  Encrypt            ${report.encrypt.successes} successes` +
    ` · ${report.encrypt.forgeConversions} conversions` +
    ` · ${report.encrypt.conversionRate}%`,
  );
}

export function runArtifactBalanceSimulation(parsed: ParsedArgs): LegacySimulationReport | BalanceReportV2 {
  const originalRandom = Math.random;
  Math.random = seededRandom(parsed.seed);
  try {
    const results: ScenarioResult[] = [];
    for (const candidateId of parsed.candidateIds) {
      for (const policyLineup of parsed.policyLineups) {
        for (const mode of parsed.modes) {
          for (const victoryRequirement of parsed.victoryRequirements) {
            for (const playerCount of parsed.playerCounts) {
              const result = runScenario(
                parsed.games,
                parsed.seed,
                playerCount,
                victoryRequirement,
                mode,
                candidateId,
                policyLineup,
              );
              results.push(result);
              if (parsed.reportV2) printV2Scenario(result.v2);
              else printLegacyScenario(result.legacy);
            }
          }
        }
      }
    }

    if (parsed.reportV2) {
      return {
        schema: "luminae-balance-report/v2",
        generatedAt: new Date().toISOString(),
        seed: parsed.seed,
        candidates: results.map((result) => result.v2),
      };
    }
    return {
      schema: "luminae-artifact-simulation/v1",
      generatedAt: new Date().toISOString(),
      seed: parsed.seed,
      scenarios: results.map((result) => result.legacy),
    };
  } finally {
    Math.random = originalRandom;
  }
}

export function main(args = process.argv.slice(2)): void {
  const parsed = parseArtifactSimulationArgs(args);
  const report = runArtifactBalanceSimulation(parsed);
  if (parsed.output) writeFileSync(parsed.output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
}

const entrypoint = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;
if (entrypoint === import.meta.url) main();
