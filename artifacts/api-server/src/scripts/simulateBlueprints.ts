#!/usr/bin/env tsx

import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import {
  BLUEPRINT_DEFINITIONS,
  BLUEPRINT_IDS,
  getTurnOrderEminenceCompensation,
  type BlueprintId,
} from "@workspace/game-types";
import {
  DEFAULT_BALANCE_RULESET,
  applyAction,
  formatGameState,
  initializeGame,
  type ActionPayload,
  type BalanceRuleset,
  type GameStateData,
} from "../lib/gameEngine.js";
import { chooseAiAction } from "../lib/aiPlayer.js";
import type {
  BalanceFormat,
  BalanceFinishReason,
  BalanceScenarioCoreV2,
} from "../lib/balanceReport.js";
import { BALANCE_FORMATS } from "../lib/balanceReport.js";
import { filterStateForPlayer } from "../lib/stateProjection.js";

const MAX_TURNS = 400;
const GAME_SEED_STRIDE = 9_973;
const DEFAULT_PLAYER_COUNTS = [4] as const;
const DEFAULT_FORMATS = ["quick"] as const satisfies readonly BalanceFormat[];

const TWO_BLUEPRINT_LOADOUTS: readonly (readonly [BlueprintId, BlueprintId])[] =
  BLUEPRINT_IDS.flatMap((first, firstIndex) =>
    BLUEPRINT_IDS.slice(firstIndex + 1).map((second) => [first, second] as const),
  );

export type BlueprintSlotCount = 1 | 2;
export type BlueprintCandidateId = "blueprint-one" | "blueprint-two/control";

export interface ParsedBlueprintSimulationArgs {
  games: number;
  seed: number;
  output: string | null;
  blueprintSlots: BlueprintSlotCount[];
  playerCounts: number[];
  formats: BalanceFormat[];
}

interface BlueprintCounters {
  assignedSeats: number;
  manifestations: number;
  wins: number;
  manifestorWins: number;
  nonManifestorSeats: number;
  nonManifestorWins: number;
  spentFinishes: number;
  detonations: number;
  interceptions: number;
}

interface BlueprintResult extends BlueprintCounters {
  name: string;
  manifestationRate: number;
  winRate: number;
  winRateDeltaPoints: number;
  manifestorLosses: number;
  manifestorWinRate: number | null;
  nonManifestorWinRate: number | null;
  manifestorWinRateDeltaPoints: number | null;
  detonationRate: number | null;
}

interface ScenarioGates {
  simulationCount: boolean;
  stability: boolean;
  matchManifestationWindow: boolean;
  winRateDelta: boolean;
  secrecy: "verified-by-functional-checks" | "failed-functional-checks";
  humanPlaytests: "pending";
  competitiveEnabled: false;
}

interface UnavailableBalanceMetrics {
  forgedByTier: null;
  winnerForgedByTier: null;
  winnerTier3ReachRate: null;
  zeroCostForges: null;
  well: null;
  encrypt: null;
  lead: null;
  luminaries: null;
  market: null;
  policies: null;
  allArtifactBonusShares: null;
  winnerArtifactBonusShares: null;
}

export interface BlueprintScenarioReport
  extends BalanceScenarioCoreV2, UnavailableBalanceMetrics {
  candidateId: BlueprintCandidateId;
  ruleset: BalanceRuleset;
  blueprintSlots: BlueprintSlotCount;
  playerCount: number;
  gameMode: "standard";
  format: BalanceFormat;
  victoryRequirement: number;
  turnOrderCompensation: "production";
  turnOrderCompensationViolations: number;
  policySeats: "adaptive"[];
  difficultySeats: readonly "hard"[];
  policyRotation: "cyclic_by_game";
  gamesRequested: number;
  gamesCompleted: number;
  gamesNoncompleted: number;
  completionRate: number;
  stalledGames: number;
  stallReasons: Record<string, number>;
  finishReasons: Record<BalanceFinishReason, number>;
  averageTurns: number;
  medianTurns: number;
  p90Turns: number;
  turns: { mean: number; p50: number; p90: number };
  equalTurnViolations: number;
  seatWinRates: number[];
  seatBiasPoints: number;
  openingPositionWinRates: number[];
  openerRelativeWinRates: number[];
  openerRelativeBiasPoints: number;
  matchesWithManifestation: number;
  matchManifestationRate: number;
  manifestations: {
    matchesWithAny: number;
    rate: number;
    total: number;
    manifestorPoolWinRate: number | null;
    nonManifestorPoolWinRate: number | null;
    manifestorVsNonManifestorDeltaPoints: number | null;
    perBlueprint: Record<BlueprintId, {
      assignedSeats: number;
      actualManifestations: number;
      manifestationRate: number;
    }>;
    perManifestorWinRates: Record<BlueprintId, number | null>;
    largestManifestorDelta: number | null;
  };
  secrecyFailures: number;
  secrecy: {
    functionalChecks: number;
    failures: number;
    notHardcoded: true;
    method: "production-state-projection";
  };
  blueprintAssignments: Record<BlueprintId, number>;
  actualManifestations: Record<BlueprintId, number>;
  blueprints: Record<BlueprintId, BlueprintResult>;
  actionCounts: Record<string, number>;
  actionShares: Record<string, number>;
  limitations: string[];
  metricLimitations: Record<keyof UnavailableBalanceMetrics | "manifestorCausality", string>;
  gates: ScenarioGates;
}

export interface BlueprintSimulationReport {
  schema: "luminae-blueprint-simulation/v2";
  balanceSchema: "luminae-balance-report/v2";
  generatedAt: string;
  seed: number;
  blueprintSlots: BlueprintSlotCount[];
  playerCounts: number[];
  formats: BalanceFormat[];
  scenarios: BlueprintScenarioReport[];
  candidates: BlueprintScenarioReport[];
  scenarioCount: number;
  gamesRequestedPerScenario: number;
  gamesRequested: number;
  gamesCompleted: number;
  completionRate: number;
  stalledGames: number;
  stallReasons: Record<string, number>;
  finishReasons: Record<BalanceFinishReason, number>;
  equalTurnViolations: number;
  turnOrderCompensationViolations: number;
  averageTurns: number;
  matchesWithManifestation: number;
  matchManifestationRate: number;
  secrecyFailures: number;
  gates: ScenarioGates;
  /**
   * Explicit compatibility snapshot for the historical 4-player Quick,
   * two-slot report shape. Matrix-wide consumers must use the aggregate fields
   * above or the individual `scenarios` records.
   */
  legacyCellSummary: {
    candidateId: BlueprintCandidateId;
    blueprintSlots: BlueprintSlotCount;
    playerCount: number;
    format: BalanceFormat;
    gamesRequested: number;
    gamesCompleted: number;
    completionRate: number;
    stalledGames: number;
    stallReasons: Record<string, number>;
    averageTurns: number;
    seatWinRates: number[];
    seatBiasPoints: number;
    openerRelativeWinRates: number[];
    openerRelativeBiasPoints: number;
    matchesWithManifestation: number;
    matchManifestationRate: number;
    secrecyFailures: number;
    blueprints: Record<BlueprintId, BlueprintResult>;
    gates: ScenarioGates;
  };
}

interface SecrecyAuditResult {
  functionalChecks: number;
  failures: number;
}

interface RunGameResult {
  completed: boolean;
  stalled: boolean;
  stallReason: string | null;
  finishReason: BalanceFinishReason;
  turns: number;
  equalTurnViolation: boolean;
  turnOrderCompensationViolation: boolean;
  winnerSeat: number | null;
  winnerOpeningPosition: number | null;
  manifestedProjectCount: number;
  manifestorCivilizations: number;
  manifestorCivilizationWins: number;
  nonManifestorCivilizations: number;
  nonManifestorCivilizationWins: number;
  secrecy: SecrecyAuditResult;
  actionCounts: Record<string, number>;
}

const BALANCE_METRIC_LIMITATIONS: BlueprintScenarioReport["metricLimitations"] = {
  forgedByTier:
    "Forge-tier counts are not collected by this Blueprint-focused harness.",
  winnerForgedByTier:
    "Winner Forge-tier counts are not collected by this Blueprint-focused harness.",
  winnerTier3ReachRate:
    "Tier III reach is outside the Blueprint gate report and is not collected here.",
  zeroCostForges:
    "Zero-cost Forge provenance is not collected by this Blueprint-focused harness.",
  well:
    "Well starvation and constrained turns require legal-action snapshots that are not retained here.",
  encrypt:
    "Encrypt and reserved conversion events are not instrumented in this Blueprint-focused harness.",
  lead:
    "Lead changes and comebacks require per-turn score histories, which this harness does not retain.",
  luminaries:
    "Luminary access telemetry is outside this Blueprint-specific comparison.",
  market:
    "Visible Artifact age is not tracked by this Blueprint-focused harness.",
  policies:
    "Every seat uses the same adaptive Hard AI, so cross-policy outcomes are not estimated here.",
  allArtifactBonusShares:
    "Artifact Affinity shares are available from the Artifact balance harness, not duplicated here.",
  winnerArtifactBonusShares:
    "Winner Artifact Affinity shares are available from the Artifact balance harness, not duplicated here.",
  manifestorCausality:
    "Manifestor win rates are post-manifestation outcomes, not causal effect estimates; assembly progress also selects for strong positions.",
};

export function parseBlueprintSimulationArgs(
  args: readonly string[] = process.argv.slice(2),
): ParsedBlueprintSimulationArgs {
  let games = 1_000;
  let seed = 7_142_031;
  let output: string | null = null;
  let blueprintSlots: BlueprintSlotCount[] = [2];
  let playerCounts: number[] = [...DEFAULT_PLAYER_COUNTS];
  let formats: BalanceFormat[] = [...DEFAULT_FORMATS];

  for (let index = 0; index < args.length; index++) {
    const value = args[index + 1];
    if (args[index] === "--games" && value) games = Number.parseInt(args[++index]!, 10);
    else if (args[index] === "--seed" && value) seed = Number.parseInt(args[++index]!, 10);
    else if ((args[index] === "--output" || args[index] === "-o") && value) {
      output = args[++index]!;
    } else if (args[index] === "--blueprint-slots" && value) {
      const selection = args[++index];
      if (selection === "1") blueprintSlots = [1];
      else if (selection === "2") blueprintSlots = [2];
      else if (selection === "all") blueprintSlots = [2, 1];
      else throw new Error("--blueprint-slots must be 1, 2, or all");
    } else if (args[index] === "--players" && value) {
      const selection = args[++index];
      if (selection === "all") playerCounts = [2, 3, 4];
      else {
        const playerCount = Number.parseInt(selection!, 10);
        if (![2, 3, 4].includes(playerCount) || String(playerCount) !== selection) {
          throw new Error("--players must be 2, 3, 4, or all");
        }
        playerCounts = [playerCount];
      }
    } else if (args[index] === "--formats" && value) {
      const selection = args[++index];
      if (selection === "all") formats = ["quick", "standard", "epic"];
      else if (selection && selection in BALANCE_FORMATS) {
        formats = [selection as BalanceFormat];
      } else {
        throw new Error("--formats must be quick, standard, epic, or all");
      }
    }
  }

  if (!Number.isInteger(games) || games < 1) {
    throw new Error("--games must be a positive integer");
  }
  if (!Number.isInteger(seed)) throw new Error("--seed must be an integer");
  return { games, seed, output, blueprintSlots, playerCounts, formats };
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

/**
 * Candidate is deliberately absent from this seed. A one-slot and two-slot
 * run therefore receive the same production board and opening player for the
 * same game index, while each game remains independent from preceding games.
 */
export function blueprintGameSeed(
  seed: number,
  gameIndex: number,
  playerCount = 4,
  victoryRequirement = 15,
): number {
  return seed + playerCount * 1_000_003 + victoryRequirement * 65_537
    + gameIndex * GAME_SEED_STRIDE;
}

export function blueprintLoadoutForSeat(
  gameIndex: number,
  seat: number,
  blueprintSlots: BlueprintSlotCount,
): readonly BlueprintId[] {
  if (blueprintSlots === 1) {
    return [BLUEPRINT_IDS[(gameIndex + seat) % BLUEPRINT_IDS.length]!];
  }
  return TWO_BLUEPRINT_LOADOUTS[(gameIndex + seat) % TWO_BLUEPRINT_LOADOUTS.length]!;
}

function candidateIdForSlots(blueprintSlots: BlueprintSlotCount): BlueprintCandidateId {
  return blueprintSlots === 2 ? "blueprint-two/control" : "blueprint-one";
}

function rulesetForSlots(blueprintSlots: BlueprintSlotCount): BalanceRuleset {
  return {
    ...DEFAULT_BALANCE_RULESET,
    id: candidateIdForSlots(blueprintSlots),
    blueprintSlots,
  };
}

function emptyCounters(): Record<BlueprintId, BlueprintCounters> {
  return Object.fromEntries(
    BLUEPRINT_IDS.map((blueprintId) => [blueprintId, {
      assignedSeats: 0,
      manifestations: 0,
      wins: 0,
      manifestorWins: 0,
      nonManifestorSeats: 0,
      nonManifestorWins: 0,
      spentFinishes: 0,
      detonations: 0,
      interceptions: 0,
    }]),
  ) as Record<BlueprintId, BlueprintCounters>;
}

function addSecrecyAudit(total: SecrecyAuditResult, addition: SecrecyAuditResult): void {
  total.functionalChecks += addition.functionalChecks;
  total.failures += addition.failures;
}

/** Exercise the same formatter and player projection used by live matches. */
export function auditBlueprintSecrecy(state: GameStateData): SecrecyAuditResult {
  const connectedPlayerIds = new Set(state.players.map((player) => player.playerId));
  const formatted = formatGameState(
    "blueprint-balance-audit",
    state.phase === "finished" ? "finished" : "playing",
    state,
    connectedPlayerIds,
  );
  let functionalChecks = 0;
  let failures = 0;

  for (const viewer of state.players) {
    const projected = filterStateForPlayer(formatted, viewer.playerId);
    for (const [seat, projectedPlayer] of projected.players.entries()) {
      const sourcePlayer = state.players[seat]!;
      const ownsPlayerState = sourcePlayer.playerId === viewer.playerId;
      const hasPrivateState = Object.prototype.hasOwnProperty.call(
        projectedPlayer,
        "blueprintPrivateStates",
      );
      functionalChecks += 1;
      if (hasPrivateState !== ownsPlayerState) failures += 1;

      if (ownsPlayerState) {
        functionalChecks += 1;
        if (
          JSON.stringify(projectedPlayer.blueprintPrivateStates ?? []) !==
          JSON.stringify(sourcePlayer.blueprintPrivateStates ?? [])
        ) failures += 1;
        continue;
      }

      const serializedOpponent = JSON.stringify(projectedPlayer);
      for (const privateState of sourcePlayer.blueprintPrivateStates ?? []) {
        if (privateState.manifested) continue;
        functionalChecks += 1;
        if (serializedOpponent.includes(`\"${privateState.blueprintId}\"`)) failures += 1;
      }
      functionalChecks += 2;
      if (serializedOpponent.includes("secretTargetCardId")) failures += 1;
      if (serializedOpponent.includes("matchedComponentIds")) failures += 1;
    }
  }
  return { functionalChecks, failures };
}

function resolvePresentations(
  state: GameStateData,
  counters: Record<BlueprintId, BlueprintCounters>,
  seenEvents: Set<string>,
  manifestorsByBlueprint: Map<BlueprintId, Set<string>>,
): string | null {
  for (let guard = 0; guard < 100; guard++) {
    let action: ActionPayload | null = null;
    const choice = state.pendingLuminaryChoice;
    if (choice) {
      const result = applyAction(state, choice.playerId, {
        type: "choose_luminary_order",
        orderedIds: [...choice.candidates],
      });
      if (!result.success) return `choice:${result.error ?? "unknown"}`;
      continue;
    }

    const summon = state.pendingSummonEvents?.[0];
    const activation = summon ? null : state.pendingLuminaryActivationEvents?.[0];
    const manifestation = summon || activation
      ? null
      : state.pendingBlueprintManifestationEvents?.[0];
    const detonation = summon || activation || manifestation
      ? null
      : state.pendingBlueprintDetonationEvents?.[0];

    if (summon) action = { type: "resolve_summon", eventId: summon.eventId };
    else if (activation) {
      action = { type: "resolve_luminary_activation", eventId: activation.eventId };
    } else if (manifestation) {
      if (!seenEvents.has(manifestation.eventId)) {
        counters[manifestation.blueprintId].manifestations += 1;
        const manifestors = manifestorsByBlueprint.get(manifestation.blueprintId)
          ?? new Set<string>();
        manifestors.add(manifestation.ownerPlayerId);
        manifestorsByBlueprint.set(manifestation.blueprintId, manifestors);
        seenEvents.add(manifestation.eventId);
      }
      action = {
        type: "resolve_blueprint_manifestation",
        eventId: manifestation.eventId,
      };
    } else if (detonation) {
      if (!seenEvents.has(detonation.eventId)) {
        if (detonation.blueprintId === "bp_antimatter_detonator") {
          const counter = counters[detonation.blueprintId];
          if (detonation.interceptedByBlueprintId) counter.interceptions += 1;
          else counter.detonations += 1;
        }
        seenEvents.add(detonation.eventId);
      }
      action = { type: "resolve_blueprint_detonation", eventId: detonation.eventId };
    } else {
      return state.pendingTurnTransition
        ? `transition:${state.pendingTurnTransition.stage}`
        : null;
    }

    const result = applyAction(state, state.players[0]!.playerId, action);
    if (!result.success) return `presentation:${result.error ?? action.type}`;
  }
  return "presentation-guard-exhausted";
}

function recoverAction(state: GameStateData, playerId: string): string | null {
  for (const affinity of ["flare", "radiance", "verdance", "continuum", "abyss"] as const) {
    if (state.affinityWell[affinity] < 1) continue;
    const result = applyAction(state, playerId, {
      type: "harness_three_affinities",
      affinities: { [affinity]: 1 },
    });
    if (result.success) return "harness_three_affinities";
  }
  return applyAction(state, playerId, { type: "pass" }).success ? "pass" : null;
}

function runGame(
  gameIndex: number,
  seed: number,
  playerCount: number,
  victoryRequirement: number,
  blueprintSlots: BlueprintSlotCount,
  counters: Record<BlueprintId, BlueprintCounters>,
): RunGameResult {
  Math.random = seededRandom(
    blueprintGameSeed(seed, gameIndex, playerCount, victoryRequirement),
  );
  const playerDefs = Array.from({ length: playerCount }, (_, seat) => ({
    id: `g${gameIndex}-p${seat}`,
    name: `Hard AI ${seat + 1}`,
  }));
  const assignedByPlayer = new Map<string, readonly BlueprintId[]>();
  const blueprintSetups = Object.fromEntries(playerDefs.map((player, seat) => {
    const loadout = blueprintLoadoutForSeat(gameIndex, seat, blueprintSlots);
    assignedByPlayer.set(player.id, loadout);
    for (const blueprintId of loadout) counters[blueprintId].assignedSeats += 1;
    return [player.id, {
      blueprintIds: [...loadout],
      presentationVariants: Object.fromEntries(
        loadout.map((blueprintId) => [blueprintId, "armored"]),
      ),
    }];
  }));

  const state = initializeGame(
    playerDefs,
    playerCount,
    victoryRequirement,
    "standard",
    {
      blueprintSetups,
      applyTurnOrderCompensation: true,
      balanceRuleset: rulesetForSlots(blueprintSlots),
    },
  );
  const openingSeat = state.players.findIndex(
    (player) => player.playerId === state.openingTurnOrder?.firstPlayerId,
  );
  const turnOrderCompensationViolation = state.players.some((player, seat) => {
    const openingPosition = (seat - Math.max(0, openingSeat) + playerCount) % playerCount;
    return player.eminence !== getTurnOrderEminenceCompensation(
      openingPosition,
      playerCount,
      victoryRequirement,
    );
  });
  const seenEvents = new Set<string>();
  const manifestorsByBlueprint = new Map<BlueprintId, Set<string>>();
  const turnsTakenBySeat = Array.from({ length: playerCount }, () => 0);
  const secrecy = { functionalChecks: 0, failures: 0 };
  const actionCounts: Record<string, number> = {};
  let stalled = false;
  let stallReason: string | null = null;

  addSecrecyAudit(secrecy, auditBlueprintSecrecy(state));
  for (let turn = 0; turn < MAX_TURNS && state.phase !== "finished"; turn++) {
    const presentationError = resolvePresentations(
      state,
      counters,
      seenEvents,
      manifestorsByBlueprint,
    );
    if (presentationError) {
      stalled = true;
      stallReason = presentationError;
      break;
    }
    if ((state.phase as string) === "finished") break;

    const actingSeat = state.currentPlayerIndex;
    const currentPlayer = state.players[actingSeat]!;
    const action = chooseAiAction(state, currentPlayer.playerId, "hard", {
      strategy: "adaptive",
    });
    const result = applyAction(state, currentPlayer.playerId, action);
    const completedActionType = result.success
      ? action.type
      : recoverAction(state, currentPlayer.playerId);
    if (!completedActionType) {
      stalled = true;
      stallReason = `action:${result.error ?? action.type}`;
      break;
    }
    actionCounts[completedActionType] = (actionCounts[completedActionType] ?? 0) + 1;
    turnsTakenBySeat[actingSeat] += 1;
    addSecrecyAudit(secrecy, auditBlueprintSecrecy(state));
  }

  const finalPresentationError = resolvePresentations(
    state,
    counters,
    seenEvents,
    manifestorsByBlueprint,
  );
  if (finalPresentationError && state.phase !== "finished") {
    stalled = true;
    stallReason ??= finalPresentationError;
  }
  addSecrecyAudit(secrecy, auditBlueprintSecrecy(state));

  const winnerSeat = state.winnerId
    ? state.players.findIndex((player) => player.playerId === state.winnerId)
    : -1;
  if (winnerSeat >= 0 && state.winnerId) {
    for (const blueprintId of assignedByPlayer.get(state.winnerId) ?? []) {
      counters[blueprintId].wins += 1;
    }
    for (const [blueprintId, manifestors] of manifestorsByBlueprint) {
      if (manifestors.has(state.winnerId)) counters[blueprintId].manifestorWins += 1;
    }
  }
  const allManifestorIds = new Set(
    [...manifestorsByBlueprint.values()].flatMap((manifestors) => [...manifestors]),
  );
  if (state.phase === "finished") {
    for (const blueprintId of BLUEPRINT_IDS) {
      const manifestors = manifestorsByBlueprint.get(blueprintId) ?? new Set<string>();
      counters[blueprintId].nonManifestorSeats += playerCount - manifestors.size;
      if (state.winnerId && !manifestors.has(state.winnerId)) {
        counters[blueprintId].nonManifestorWins += 1;
      }
    }
  }
  for (const player of state.players) {
    for (const project of player.manifestedBlueprintProjects ?? []) {
      if (project.state === "spent") counters[project.blueprintId].spentFinishes += 1;
    }
  }

  const completed = state.phase === "finished";
  const winnerOpeningPosition = winnerSeat >= 0
    ? (winnerSeat - Math.max(0, openingSeat) + playerCount) % playerCount
    : null;
  const minimumTurns = Math.min(...turnsTakenBySeat);
  const maximumTurns = Math.max(...turnsTakenBySeat);
  const finishReason: BalanceFinishReason = completed
    ? state.finishReason === "win" || state.finishReason === undefined
      ? "eminence"
      : state.finishReason === "frontier_exhaustion"
        ? "frontier_exhaustion"
        : "other"
    : stalled
      ? stallReason?.startsWith("action:")
        ? "action_error"
        : "presentation_error"
      : "max_turns";

  return {
    completed,
    stalled,
    stallReason,
    finishReason,
    turns: state.turnCount,
    equalTurnViolation: completed && minimumTurns !== maximumTurns,
    turnOrderCompensationViolation,
    winnerSeat: winnerSeat >= 0 ? winnerSeat : null,
    winnerOpeningPosition,
    manifestedProjectCount: [...manifestorsByBlueprint.values()].reduce(
      (sum, manifestors) => sum + manifestors.size,
      0,
    ),
    manifestorCivilizations: completed ? allManifestorIds.size : 0,
    manifestorCivilizationWins:
      completed && state.winnerId && allManifestorIds.has(state.winnerId) ? 1 : 0,
    nonManifestorCivilizations: completed ? playerCount - allManifestorIds.size : 0,
    nonManifestorCivilizationWins:
      completed && state.winnerId && !allManifestorIds.has(state.winnerId) ? 1 : 0,
    secrecy,
    actionCounts,
  };
}

function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
}

export function outcomeRateDeltaPoints(
  focalWins: number,
  focalSeats: number,
  comparisonWins: number,
  comparisonSeats: number,
): number | null {
  if (focalSeats <= 0 || comparisonSeats <= 0) return null;
  return Number((
    percent(focalWins, focalSeats) - percent(comparisonWins, comparisonSeats)
  ).toFixed(2));
}

function roundedAverage(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function median(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  const result = sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
  return Number(result.toFixed(2));
}

function percentile(values: readonly number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.ceil(percentileValue * sorted.length) - 1);
  return sorted[index]!;
}

function rateSpread(rates: readonly number[]): number {
  return rates.length > 0
    ? Number((Math.max(...rates) - Math.min(...rates)).toFixed(2))
    : 0;
}

function mergeCounts(
  records: readonly Record<string, number>[],
): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const record of records) {
    for (const [key, count] of Object.entries(record)) {
      merged[key] = (merged[key] ?? 0) + count;
    }
  }
  return merged;
}

function summarizeBlueprints(
  counters: Record<BlueprintId, BlueprintCounters>,
): {
  blueprints: Record<BlueprintId, BlueprintResult>;
  largestManifestorDelta: number | null;
} {
  const assignmentWinRates = Object.fromEntries(
    BLUEPRINT_IDS.map((blueprintId) => [
      blueprintId,
      percent(counters[blueprintId].wins, counters[blueprintId].assignedSeats),
    ]),
  ) as Record<BlueprintId, number>;
  const assignmentPoolAverage = BLUEPRINT_IDS.reduce(
    (sum, blueprintId) => sum + assignmentWinRates[blueprintId],
    0,
  ) / BLUEPRINT_IDS.length;
  const blueprints = Object.fromEntries(BLUEPRINT_IDS.map((blueprintId) => {
    const counter = counters[blueprintId];
    const manifestationRate = percent(counter.manifestations, counter.assignedSeats);
    const manifestorWinRate = counter.manifestations > 0
      ? percent(counter.manifestorWins, counter.manifestations)
      : null;
    const nonManifestorWinRate = counter.nonManifestorSeats > 0
      ? percent(counter.nonManifestorWins, counter.nonManifestorSeats)
      : null;
    const detonationRate = blueprintId === "bp_antimatter_detonator"
      ? percent(counter.detonations, counter.manifestations)
      : null;
    return [blueprintId, {
      ...counter,
      name: BLUEPRINT_DEFINITIONS[blueprintId].name,
      manifestationRate,
      winRate: assignmentWinRates[blueprintId],
      winRateDeltaPoints: Number(
        (assignmentWinRates[blueprintId] - assignmentPoolAverage).toFixed(2),
      ),
      manifestorLosses: counter.manifestations - counter.manifestorWins,
      manifestorWinRate,
      nonManifestorWinRate,
      manifestorWinRateDeltaPoints: outcomeRateDeltaPoints(
        counter.manifestorWins,
        counter.manifestations,
        counter.nonManifestorWins,
        counter.nonManifestorSeats,
      ),
      detonationRate,
    }];
  })) as Record<BlueprintId, BlueprintResult>;
  const manifestorDeltas = BLUEPRINT_IDS.map(
    (blueprintId) => blueprints[blueprintId].manifestorWinRateDeltaPoints,
  ).filter((value): value is number => value !== null);

  return {
    blueprints,
    largestManifestorDelta: manifestorDeltas.length > 0
      ? Number(Math.max(...manifestorDeltas.map(Math.abs)).toFixed(2))
      : null,
  };
}

function runBlueprintScenario(
  games: number,
  seed: number,
  playerCount: number,
  format: BalanceFormat,
  blueprintSlots: BlueprintSlotCount,
  progress = false,
): BlueprintScenarioReport {
  const victoryRequirement = BALANCE_FORMATS[format];
  const counters = emptyCounters();
  const seatWins = Array.from({ length: playerCount }, () => 0);
  const openerRelativeWins = Array.from({ length: playerCount }, () => 0);
  const stallReasons: Record<string, number> = {};
  const finishReasons: Record<BalanceFinishReason, number> = {
    eminence: 0,
    frontier_exhaustion: 0,
    max_turns: 0,
    presentation_error: 0,
    action_error: 0,
    other: 0,
  };
  const actionCounts: Record<string, number> = {};
  const completedTurns: number[] = [];
  const secrecy = { functionalChecks: 0, failures: 0 };
  let completed = 0;
  let stalled = 0;
  let matchesWithManifestation = 0;
  let equalTurnViolations = 0;
  let turnOrderCompensationViolations = 0;
  let manifestorCivilizations = 0;
  let manifestorCivilizationWins = 0;
  let nonManifestorCivilizations = 0;
  let nonManifestorCivilizationWins = 0;

  for (let gameIndex = 0; gameIndex < games; gameIndex++) {
    const result = runGame(
      gameIndex,
      seed,
      playerCount,
      victoryRequirement,
      blueprintSlots,
      counters,
    );
    if (result.completed) {
      completed += 1;
      completedTurns.push(result.turns);
    }
    if (result.stalled) stalled += 1;
    if (result.stallReason) {
      stallReasons[result.stallReason] = (stallReasons[result.stallReason] ?? 0) + 1;
    }
    finishReasons[result.finishReason] = (finishReasons[result.finishReason] ?? 0) + 1;
    if (result.winnerSeat !== null) seatWins[result.winnerSeat] += 1;
    if (result.winnerOpeningPosition !== null) {
      openerRelativeWins[result.winnerOpeningPosition] += 1;
    }
    if (result.manifestedProjectCount > 0) matchesWithManifestation += 1;
    manifestorCivilizations += result.manifestorCivilizations;
    manifestorCivilizationWins += result.manifestorCivilizationWins;
    nonManifestorCivilizations += result.nonManifestorCivilizations;
    nonManifestorCivilizationWins += result.nonManifestorCivilizationWins;
    if (result.equalTurnViolation) equalTurnViolations += 1;
    if (result.turnOrderCompensationViolation) turnOrderCompensationViolations += 1;
    addSecrecyAudit(secrecy, result.secrecy);
    for (const [actionType, count] of Object.entries(result.actionCounts)) {
      actionCounts[actionType] = (actionCounts[actionType] ?? 0) + count;
    }

    if (progress && games >= 100 && (gameIndex + 1) % 100 === 0) {
      process.stdout.write(
        `${playerCount}P ${format} ${candidateIdForSlots(blueprintSlots)}: `
          + `${gameIndex + 1}/${games}\r`,
      );
    }
  }
  if (progress && games >= 100) process.stdout.write("\n");

  const { blueprints, largestManifestorDelta } = summarizeBlueprints(counters);
  const manifestorPoolWinRate = manifestorCivilizations > 0
    ? percent(manifestorCivilizationWins, manifestorCivilizations)
    : null;
  const nonManifestorPoolWinRate = nonManifestorCivilizations > 0
    ? percent(nonManifestorCivilizationWins, nonManifestorCivilizations)
    : null;
  const manifestorVsNonManifestorDeltaPoints = outcomeRateDeltaPoints(
    manifestorCivilizationWins,
    manifestorCivilizations,
    nonManifestorCivilizationWins,
    nonManifestorCivilizations,
  );
  const seatWinRates = seatWins.map((wins) => percent(wins, completed));
  const openerRelativeWinRates = openerRelativeWins.map((wins) => percent(wins, completed));
  const matchManifestationRate = percent(matchesWithManifestation, completed);
  const averageTurns = roundedAverage(completedTurns);
  const medianTurns = median(completedTurns);
  const p90Turns = percentile(completedTurns, 0.9);
  const totalManifestations = BLUEPRINT_IDS.reduce(
    (sum, blueprintId) => sum + counters[blueprintId].manifestations,
    0,
  );
  const totalActions = Object.values(actionCounts).reduce((sum, count) => sum + count, 0);
  const actionShares = Object.fromEntries(
    Object.entries(actionCounts).map(([actionType, count]) => [
      actionType,
      percent(count, totalActions),
    ]),
  );
  const gates: ScenarioGates = {
    simulationCount: games >= 1_000,
    stability: completed / games >= 0.995 && stalled === 0,
    matchManifestationWindow:
      matchManifestationRate >= 10 && matchManifestationRate <= 20,
    // The release gate concerns civilizations that actually manifested a
    // Project, not merely civilizations assigned that Blueprint at setup.
    winRateDelta:
      manifestorVsNonManifestorDeltaPoints !== null &&
      Math.abs(manifestorVsNonManifestorDeltaPoints) <= 2 &&
      largestManifestorDelta !== null &&
      largestManifestorDelta <= 2,
    secrecy: secrecy.failures === 0
      ? "verified-by-functional-checks"
      : "failed-functional-checks",
    humanPlaytests: "pending",
    competitiveEnabled: false,
  };

  return {
    candidateId: candidateIdForSlots(blueprintSlots),
    ruleset: rulesetForSlots(blueprintSlots),
    blueprintSlots,
    playerCount,
    gameMode: "standard",
    format,
    victoryRequirement,
    turnOrderCompensation: "production",
    turnOrderCompensationViolations,
    policySeats: Array.from({ length: playerCount }, () => "adaptive" as const),
    difficultySeats: Array.from({ length: playerCount }, () => "hard" as const),
    policyRotation: "cyclic_by_game",
    gamesRequested: games,
    gamesCompleted: completed,
    gamesNoncompleted: games - completed,
    completionRate: percent(completed, games),
    stalledGames: stalled,
    stallReasons,
    finishReasons,
    averageTurns,
    medianTurns,
    p90Turns,
    turns: { mean: averageTurns, p50: medianTurns, p90: p90Turns },
    equalTurnViolations,
    seatWinRates,
    seatBiasPoints: rateSpread(seatWinRates),
    openingPositionWinRates: openerRelativeWinRates,
    openerRelativeWinRates,
    openerRelativeBiasPoints: rateSpread(openerRelativeWinRates),
    matchesWithManifestation,
    matchManifestationRate,
    manifestations: {
      matchesWithAny: matchesWithManifestation,
      rate: matchManifestationRate,
      total: totalManifestations,
      manifestorPoolWinRate,
      nonManifestorPoolWinRate,
      manifestorVsNonManifestorDeltaPoints,
      perBlueprint: Object.fromEntries(BLUEPRINT_IDS.map((blueprintId) => [
        blueprintId,
        {
          assignedSeats: counters[blueprintId].assignedSeats,
          actualManifestations: counters[blueprintId].manifestations,
          manifestationRate: blueprints[blueprintId].manifestationRate,
        },
      ])) as BlueprintScenarioReport["manifestations"]["perBlueprint"],
      perManifestorWinRates: Object.fromEntries(BLUEPRINT_IDS.map((blueprintId) => [
        blueprintId,
        blueprints[blueprintId].manifestorWinRate,
      ])) as Record<BlueprintId, number | null>,
      largestManifestorDelta,
    },
    secrecyFailures: secrecy.failures,
    secrecy: {
      functionalChecks: secrecy.functionalChecks,
      failures: secrecy.failures,
      notHardcoded: true,
      method: "production-state-projection",
    },
    blueprintAssignments: Object.fromEntries(BLUEPRINT_IDS.map((blueprintId) => [
      blueprintId,
      counters[blueprintId].assignedSeats,
    ])) as Record<BlueprintId, number>,
    actualManifestations: Object.fromEntries(BLUEPRINT_IDS.map((blueprintId) => [
      blueprintId,
      counters[blueprintId].manifestations,
    ])) as Record<BlueprintId, number>,
    blueprints,
    actionCounts,
    actionShares,
    forgedByTier: null,
    winnerForgedByTier: null,
    winnerTier3ReachRate: null,
    zeroCostForges: null,
    well: null,
    encrypt: null,
    lead: null,
    luminaries: null,
    market: null,
    policies: null,
    allArtifactBonusShares: null,
    winnerArtifactBonusShares: null,
    limitations: Object.values(BALANCE_METRIC_LIMITATIONS),
    metricLimitations: { ...BALANCE_METRIC_LIMITATIONS },
    gates,
  };
}

export function runBlueprintSimulation(
  games: number,
  seed: number,
  blueprintSlots: readonly BlueprintSlotCount[] = [2],
  progress = false,
  playerCounts: readonly number[] = DEFAULT_PLAYER_COUNTS,
  formats: readonly BalanceFormat[] = DEFAULT_FORMATS,
): BlueprintSimulationReport {
  const originalRandom = Math.random;
  try {
    // Keep slot candidates adjacent within a cell. The seed derivation excludes
    // blueprintSlots, so paired candidates see the same board and opener.
    const scenarios = playerCounts.flatMap((playerCount) =>
      formats.flatMap((format) =>
        blueprintSlots.map((slotCount) =>
          runBlueprintScenario(
            games,
            seed,
            playerCount,
            format,
            slotCount,
            progress,
          ),
        ),
      ),
    );
    const legacy = scenarios.find((scenario) =>
      scenario.blueprintSlots === 2
      && scenario.playerCount === 4
      && scenario.format === "quick"
    ) ?? scenarios.find((scenario) => scenario.blueprintSlots === 2)
      ?? scenarios[0]!;
    const gamesRequested = scenarios.reduce(
      (sum, scenario) => sum + scenario.gamesRequested,
      0,
    );
    const gamesCompleted = scenarios.reduce(
      (sum, scenario) => sum + scenario.gamesCompleted,
      0,
    );
    const stalledGames = scenarios.reduce(
      (sum, scenario) => sum + scenario.stalledGames,
      0,
    );
    const matchesWithManifestation = scenarios.reduce(
      (sum, scenario) => sum + scenario.matchesWithManifestation,
      0,
    );
    const completedTurnTotal = scenarios.reduce(
      (sum, scenario) => sum + scenario.averageTurns * scenario.gamesCompleted,
      0,
    );
    const aggregateGates: ScenarioGates = {
      simulationCount: scenarios.every((scenario) => scenario.gates.simulationCount),
      stability: scenarios.every((scenario) => scenario.gates.stability),
      matchManifestationWindow: scenarios.every(
        (scenario) => scenario.gates.matchManifestationWindow,
      ),
      winRateDelta: scenarios.every((scenario) => scenario.gates.winRateDelta),
      secrecy: scenarios.every(
        (scenario) => scenario.gates.secrecy === "verified-by-functional-checks",
      )
        ? "verified-by-functional-checks"
        : "failed-functional-checks",
      humanPlaytests: "pending",
      competitiveEnabled: false,
    };

    return {
      schema: "luminae-blueprint-simulation/v2",
      balanceSchema: "luminae-balance-report/v2",
      generatedAt: new Date().toISOString(),
      seed,
      blueprintSlots: [...blueprintSlots],
      playerCounts: [...playerCounts],
      formats: [...formats],
      scenarios,
      candidates: scenarios,
      scenarioCount: scenarios.length,
      gamesRequestedPerScenario: games,
      gamesRequested,
      gamesCompleted,
      completionRate: percent(gamesCompleted, gamesRequested),
      stalledGames,
      stallReasons: mergeCounts(scenarios.map((scenario) => scenario.stallReasons)),
      finishReasons: mergeCounts(
        scenarios.map((scenario) => scenario.finishReasons),
      ) as Record<BalanceFinishReason, number>,
      equalTurnViolations: scenarios.reduce(
        (sum, scenario) => sum + scenario.equalTurnViolations,
        0,
      ),
      turnOrderCompensationViolations: scenarios.reduce(
        (sum, scenario) => sum + scenario.turnOrderCompensationViolations,
        0,
      ),
      averageTurns: gamesCompleted > 0
        ? Number((completedTurnTotal / gamesCompleted).toFixed(2))
        : 0,
      matchesWithManifestation,
      matchManifestationRate: percent(matchesWithManifestation, gamesCompleted),
      secrecyFailures: scenarios.reduce(
        (sum, scenario) => sum + scenario.secrecyFailures,
        0,
      ),
      gates: aggregateGates,
      legacyCellSummary: {
        candidateId: legacy.candidateId,
        blueprintSlots: legacy.blueprintSlots,
        playerCount: legacy.playerCount,
        format: legacy.format,
        gamesRequested: legacy.gamesRequested,
        gamesCompleted: legacy.gamesCompleted,
        completionRate: legacy.completionRate,
        stalledGames: legacy.stalledGames,
        stallReasons: legacy.stallReasons,
        averageTurns: legacy.averageTurns,
        seatWinRates: legacy.seatWinRates,
        seatBiasPoints: legacy.seatBiasPoints,
        openerRelativeWinRates: legacy.openerRelativeWinRates,
        openerRelativeBiasPoints: legacy.openerRelativeBiasPoints,
        matchesWithManifestation: legacy.matchesWithManifestation,
        matchManifestationRate: legacy.matchManifestationRate,
        secrecyFailures: legacy.secrecyFailures,
        blueprints: legacy.blueprints,
        gates: legacy.gates,
      },
    };
  } finally {
    Math.random = originalRandom;
  }
}

export function main(args: readonly string[] = process.argv.slice(2)): void {
  const parsed = parseBlueprintSimulationArgs(args);
  const report = runBlueprintSimulation(
    parsed.games,
    parsed.seed,
    parsed.blueprintSlots,
    true,
    parsed.playerCounts,
    parsed.formats,
  );
  const serialized = JSON.stringify(report, null, 2);
  if (parsed.output) writeFileSync(parsed.output, `${serialized}\n`, "utf8");
  console.log(serialized);
}

const invokedPath = process.argv[1];
if (invokedPath && import.meta.url === pathToFileURL(invokedPath).href) main();
