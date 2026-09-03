#!/usr/bin/env tsx

import { writeFileSync } from "node:fs";
import {
  BLUEPRINT_DEFINITIONS,
  BLUEPRINT_IDS,
  type BlueprintId,
} from "@workspace/game-types";
import {
  applyAction,
  initializeGame,
  type ActionPayload,
  type GameStateData,
} from "../lib/gameEngine.js";
import { chooseAiAction } from "../lib/aiPlayer.js";

const MAX_TURNS = 400;
const LOADOUTS: readonly (readonly [BlueprintId, BlueprintId])[] = [
  ["bp_antimatter_detonator", "bp_mantle_to_orbit_foundry"],
  ["bp_antimatter_detonator", "bp_ascension_registry"],
  ["bp_antimatter_detonator", "bp_worldshield_covenant"],
  ["bp_mantle_to_orbit_foundry", "bp_ascension_registry"],
  ["bp_mantle_to_orbit_foundry", "bp_worldshield_covenant"],
  ["bp_ascension_registry", "bp_worldshield_covenant"],
];

interface BlueprintCounters {
  assignedSeats: number;
  manifestations: number;
  wins: number;
  spentFinishes: number;
  detonations: number;
  interceptions: number;
}

interface SimulationReport {
  schema: "luminae-blueprint-simulation/v1";
  generatedAt: string;
  seed: number;
  gamesRequested: number;
  gamesCompleted: number;
  completionRate: number;
  stalledGames: number;
  stallReasons: Record<string, number>;
  averageTurns: number;
  seatWinRates: number[];
  blueprints: Record<BlueprintId, BlueprintCounters & {
    name: string;
    manifestationRate: number;
    winRate: number;
    winRateDeltaPoints: number;
    detonationRate: number | null;
  }>;
  gates: {
    simulationCount: boolean;
    stability: boolean;
    completionWindow: boolean;
    antimatterDetonationWindow: boolean;
    winRateDelta: boolean;
    secrecy: "verified-by-tests";
    humanPlaytests: "pending";
    competitiveEnabled: false;
  };
}

function parseArgs(): { games: number; seed: number; output: string | null } {
  const args = process.argv.slice(2);
  let games = 1_000;
  let seed = 7_142_031;
  let output: string | null = null;
  for (let index = 0; index < args.length; index++) {
    if (args[index] === "--games" && args[index + 1]) games = Number.parseInt(args[++index], 10);
    if (args[index] === "--seed" && args[index + 1]) seed = Number.parseInt(args[++index], 10);
    if ((args[index] === "--output" || args[index] === "-o") && args[index + 1]) output = args[++index];
  }
  if (!Number.isInteger(games) || games < 1) throw new Error("--games must be a positive integer");
  if (!Number.isInteger(seed)) throw new Error("--seed must be an integer");
  return { games, seed, output };
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function emptyCounters(): Record<BlueprintId, BlueprintCounters> {
  return Object.fromEntries(
    BLUEPRINT_IDS.map((blueprintId) => [blueprintId, {
      assignedSeats: 0,
      manifestations: 0,
      wins: 0,
      spentFinishes: 0,
      detonations: 0,
      interceptions: 0,
    }]),
  ) as Record<BlueprintId, BlueprintCounters>;
}

function resolvePresentations(
  state: GameStateData,
  counters: Record<BlueprintId, BlueprintCounters>,
  seenEvents: Set<string>,
): string | null {
  for (let guard = 0; guard < 100; guard++) {
    let action: ActionPayload | null = null;
    const choice = state.pendingLuminaryChoice;
    if (choice) {
      const result = applyAction(state, choice.playerId, {
        type: "choose_luminary_order",
        orderedIds: [...choice.candidates],
      });
      if (!result.success) {
        return `choice:${result.error ?? "unknown"}:current=${state.currentPlayerIndex}:next=${state.pendingTurnTransition?.nextPlayerIndex ?? "none"}:stage=${state.pendingTurnTransition?.stage ?? "none"}`;
      }
      continue;
    }
    const summon = state.pendingSummonEvents?.[0];
    const activation = summon ? null : state.pendingLuminaryActivationEvents?.[0];
    const manifestation = summon || activation ? null : state.pendingBlueprintManifestationEvents?.[0];
    const detonation = summon || activation || manifestation ? null : state.pendingBlueprintDetonationEvents?.[0];

    if (summon) action = { type: "resolve_summon", eventId: summon.eventId };
    else if (activation) action = { type: "resolve_luminary_activation", eventId: activation.eventId };
    else if (manifestation) {
      if (!seenEvents.has(manifestation.eventId)) {
        counters[manifestation.blueprintId].manifestations += 1;
        seenEvents.add(manifestation.eventId);
      }
      action = { type: "resolve_blueprint_manifestation", eventId: manifestation.eventId };
    } else if (detonation) {
      if (!seenEvents.has(detonation.eventId)) {
        const counter = counters[detonation.blueprintId];
        if (detonation.interceptedByBlueprintId) counter.interceptions += 1;
        else counter.detonations += 1;
        seenEvents.add(detonation.eventId);
      }
      action = { type: "resolve_blueprint_detonation", eventId: detonation.eventId };
    } else {
      return state.pendingTurnTransition
        ? `transition:${state.pendingTurnTransition.stage}`
        : null;
    }

    const result = applyAction(state, state.players[0].playerId, action);
    if (!result.success) return `presentation:${result.error ?? action.type}`;
  }
  return "presentation-guard-exhausted";
}

function recoverAction(state: GameStateData, playerId: string): boolean {
  for (const affinity of ["flare", "radiance", "verdance", "continuum", "abyss"] as const) {
    if (state.affinityWell[affinity] < 1) continue;
    const result = applyAction(state, playerId, {
      type: "harness_three_affinities",
      affinities: { [affinity]: 1 },
    });
    if (result.success) return true;
  }
  return applyAction(state, playerId, { type: "pass" }).success;
}

function runGame(
  gameIndex: number,
  counters: Record<BlueprintId, BlueprintCounters>,
): { completed: boolean; stalled: boolean; stallReason: string | null; turns: number; winnerSeat: number | null } {
  const playerDefs = Array.from({ length: 4 }, (_, seat) => ({
    id: `g${gameIndex}-p${seat}`,
    name: `Hard AI ${seat + 1}`,
  }));
  const assignedByPlayer = new Map<string, readonly BlueprintId[]>();
  const blueprintSetups = Object.fromEntries(playerDefs.map((player, seat) => {
    const loadout = LOADOUTS[(gameIndex + seat) % LOADOUTS.length];
    assignedByPlayer.set(player.id, loadout);
    for (const blueprintId of loadout) counters[blueprintId].assignedSeats += 1;
    return [player.id, {
      blueprintIds: [...loadout],
      presentationVariants: Object.fromEntries(loadout.map((blueprintId) => [blueprintId, "armored"])),
    }];
  }));
  const state = initializeGame(playerDefs, 4, undefined, "standard", { blueprintSetups });
  const seenEvents = new Set<string>();
  let stalled = false;
  let stallReason: string | null = null;

  for (let turn = 0; turn < MAX_TURNS && state.phase !== "finished"; turn++) {
    const presentationError = resolvePresentations(state, counters, seenEvents);
    if (presentationError) {
      stalled = true;
      stallReason = presentationError;
      break;
    }
    if ((state.phase as string) === "finished") break;
    const currentPlayer = state.players[state.currentPlayerIndex];
    const action = chooseAiAction(state, currentPlayer.playerId, "hard");
    const result = applyAction(state, currentPlayer.playerId, action);
    if (!result.success && !recoverAction(state, currentPlayer.playerId)) {
      stalled = true;
      stallReason = `action:${result.error ?? action.type}`;
      break;
    }
  }

  const finalPresentationError = resolvePresentations(state, counters, seenEvents);
  if (finalPresentationError && state.phase !== "finished") {
    stalled = true;
    stallReason ??= finalPresentationError;
  }
  const winnerSeat = state.winnerId
    ? state.players.findIndex((player) => player.playerId === state.winnerId)
    : null;
  if (winnerSeat !== null && winnerSeat >= 0) {
    for (const blueprintId of assignedByPlayer.get(state.winnerId!) ?? []) counters[blueprintId].wins += 1;
  }
  for (const player of state.players) {
    for (const device of player.manifestedBlueprintDevices ?? []) {
      if (device.state === "spent") counters[device.blueprintId].spentFinishes += 1;
    }
  }
  return {
    completed: state.phase === "finished",
    stalled,
    stallReason,
    turns: state.turnCount,
    winnerSeat: winnerSeat !== null && winnerSeat >= 0 ? winnerSeat : null,
  };
}

function percent(numerator: number, denominator: number): number {
  return denominator > 0 ? Number(((numerator / denominator) * 100).toFixed(2)) : 0;
}

function runSimulation(games: number, seed: number): SimulationReport {
  const originalRandom = Math.random;
  Math.random = seededRandom(seed);
  try {
    const counters = emptyCounters();
    const seatWins = [0, 0, 0, 0];
    let completed = 0;
    let stalled = 0;
    const stallReasons: Record<string, number> = {};
    let totalTurns = 0;
    for (let gameIndex = 0; gameIndex < games; gameIndex++) {
      const result = runGame(gameIndex, counters);
      if (result.completed) completed += 1;
      if (result.stalled) stalled += 1;
      if (result.stallReason) {
        stallReasons[result.stallReason] = (stallReasons[result.stallReason] ?? 0) + 1;
      }
      if (result.winnerSeat !== null) seatWins[result.winnerSeat] += 1;
      totalTurns += result.turns;
      if (games >= 100 && (gameIndex + 1) % 100 === 0) {
        process.stdout.write(`Blueprint simulations: ${gameIndex + 1}/${games}\r`);
      }
    }
    if (games >= 100) process.stdout.write("\n");

    const rawWinRates = Object.fromEntries(
      BLUEPRINT_IDS.map((blueprintId) => [
        blueprintId,
        percent(counters[blueprintId].wins, counters[blueprintId].assignedSeats),
      ]),
    ) as Record<BlueprintId, number>;
    const poolAverage = BLUEPRINT_IDS.reduce((sum, blueprintId) => sum + rawWinRates[blueprintId], 0) / BLUEPRINT_IDS.length;
    const blueprints = Object.fromEntries(BLUEPRINT_IDS.map((blueprintId) => {
      const counter = counters[blueprintId];
      const manifestationRate = percent(counter.manifestations, counter.assignedSeats);
      const detonationRate = blueprintId === "bp_antimatter_detonator"
        ? percent(counter.detonations, counter.manifestations)
        : null;
      return [blueprintId, {
        ...counter,
        name: BLUEPRINT_DEFINITIONS[blueprintId].name,
        manifestationRate,
        winRate: rawWinRates[blueprintId],
        winRateDeltaPoints: Number((rawWinRates[blueprintId] - poolAverage).toFixed(2)),
        detonationRate,
      }];
    })) as SimulationReport["blueprints"];
    const manifestationRates = BLUEPRINT_IDS.map((blueprintId) => blueprints[blueprintId].manifestationRate);
    const antimatterDetonationRate = blueprints.bp_antimatter_detonator.detonationRate ?? 0;

    return {
      schema: "luminae-blueprint-simulation/v1",
      generatedAt: new Date().toISOString(),
      seed,
      gamesRequested: games,
      gamesCompleted: completed,
      completionRate: percent(completed, games),
      stalledGames: stalled,
      stallReasons,
      averageTurns: Number((totalTurns / games).toFixed(2)),
      seatWinRates: seatWins.map((wins) => percent(wins, completed)),
      blueprints,
      gates: {
        simulationCount: games >= 1_000,
        stability: completed / games >= 0.995 && stalled === 0,
        completionWindow: manifestationRates.every((rate) => rate >= 8 && rate <= 45),
        antimatterDetonationWindow: antimatterDetonationRate >= 25 && antimatterDetonationRate <= 75,
        winRateDelta: BLUEPRINT_IDS.every((blueprintId) => Math.abs(blueprints[blueprintId].winRateDeltaPoints) <= 2),
        secrecy: "verified-by-tests",
        humanPlaytests: "pending",
        competitiveEnabled: false,
      },
    };
  } finally {
    Math.random = originalRandom;
  }
}

const { games, seed, output } = parseArgs();
const report = runSimulation(games, seed);
const serialized = JSON.stringify(report, null, 2);
if (output) writeFileSync(output, `${serialized}\n`, "utf8");
console.log(serialized);
