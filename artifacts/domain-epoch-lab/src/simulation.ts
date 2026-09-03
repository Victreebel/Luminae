import { applyAction, createGame } from "./engine";
import { chooseBotAction, mixedStrategyForSeat } from "./bots";
import type { Format, GameState, Ruleset, SimulationReport, VictoryModel } from "./types";

export interface PlayedGame {
  state: GameState;
  deadlocked: boolean;
}

export function playBotGame(ruleset: Ruleset): PlayedGame {
  let state = createGame(ruleset);
  let deadlocked = false;
  while (state.phase === "playing") {
    const strategy = mixedStrategyForSeat(state.activePlayerIndex, ruleset.seed);
    const action = chooseBotAction(state, strategy);
    if (!action) {
      deadlocked = true;
      break;
    }
    state = applyAction(state, action);
  }
  return { state, deadlocked };
}

export interface MatrixOptions {
  seedsPerConfiguration: number;
  catalog?: "micro" | "core";
}

export function runSimulationMatrix(options: MatrixOptions): SimulationReport {
  const formats: Format[] = ["quick", "standard", "epic"];
  const victoryModels: VictoryModel[] = ["eminence", "legacy", "keystone"];
  const playerCounts = [2, 3, 4] as const;
  const runs: PlayedGame[] = [];
  const victoryStats: SimulationReport["victoryModels"] = {
    eminence: { games: 0, completionRate: 0, averageTurns: 0 },
    legacy: { games: 0, completionRate: 0, averageTurns: 0 },
    keystone: { games: 0, completionRate: 0, averageTurns: 0 },
  };
  for (const format of formats) {
    for (const victoryModel of victoryModels) {
      for (const playerCount of playerCounts) {
        for (let seed = 1; seed <= options.seedsPerConfiguration; seed += 1) {
          const ruleset: Ruleset = {
            seed: seed + playerCount * 10_000 + formats.indexOf(format) * 1_000 + victoryModels.indexOf(victoryModel) * 100,
            playerCount,
            format,
            victoryModel,
            catalog: options.catalog ?? "core",
            optionalModules: [],
          };
          const run = playBotGame(ruleset);
          runs.push(run);
          const stat = victoryStats[victoryModel];
          stat.games += 1;
          stat.averageTurns += run.state.totalTurns;
          if (run.state.phase === "complete") stat.completionRate += 1;
        }
      }
    }
  }
  for (const stat of Object.values(victoryStats)) {
    stat.averageTurns /= stat.games;
    stat.completionRate /= stat.games;
  }
  const completed = runs.filter((run) => run.state.phase === "complete");
  const actionTotals = { initiate: 0, channel: 0, pivot: 0, coordinate: 0 };
  let totalActions = 0;
  for (const run of runs) {
    for (const type of Object.keys(actionTotals) as (keyof typeof actionTotals)[]) {
      actionTotals[type] += run.state.actionCounts[type];
      totalActions += run.state.actionCounts[type];
    }
  }
  const actionShares = Object.fromEntries(Object.entries(actionTotals).map(([key, value]) => [key, totalActions ? value / totalActions : 0])) as SimulationReport["actionShares"];
  const seatParityByPlayerCount = { 2: 0, 3: 0, 4: 0 } as Record<2 | 3 | 4, number>;
  let seatWinRates: number[] = [];
  for (const playerCount of [2, 3, 4] as const) {
    const relevant = completed.filter((run) => run.state.ruleset.playerCount === playerCount);
    const wins = Array.from({ length: playerCount }, () => 0);
    for (const run of relevant) run.state.players.forEach((player, seat) => {
      if (run.state.winnerIds.includes(player.id)) wins[seat] += 1 / run.state.winnerIds.length;
    });
    const rates = wins.map((winsForSeat) => relevant.length ? winsForSeat / relevant.length : 0);
    seatParityByPlayerCount[playerCount] = rates.length ? Math.max(...rates) - Math.min(...rates) : 1;
    if (playerCount === 4) seatWinRates = rates;
  }
  const openerRelativeSpread = Math.max(...Object.values(seatParityByPlayerCount));
  const outcomeCounts = { flourishing: 0, strained: 0, fractured: 0 };
  for (const run of completed) outcomeCounts[run.state.domainOutcome as keyof typeof outcomeCounts] += 1;
  const completionRate = completed.length / runs.length;
  const wellStarvationTurns = runs.reduce((sum, run) => sum + run.state.wellStarvationTurns, 0);
  const forcedPasses = runs.reduce((sum, run) => sum + run.state.forcedPasses, 0);
  const allTurns = runs.reduce((sum, run) => sum + run.state.totalTurns, 0);
  const twoSlotUsers = runs.reduce((sum, run) => sum + run.state.players.filter((player) => player.maxOccupiedSlots === 2).length, 0);
  const allPlayers = runs.reduce((sum, run) => sum + run.state.players.length, 0);
  const maxActionShare = Math.max(...Object.values(actionShares));
  return {
    schema: "domain-epoch-report/v0.1",
    generatedAt: new Date().toISOString(),
    games: runs.length,
    configurations: formats.length * victoryModels.length * playerCounts.length,
    completedGames: completed.length,
    deadlocks: runs.length - completed.length,
    averageTurns: allTurns / runs.length,
    completionRate,
    seatWinRates,
    seatParityByPlayerCount,
    openerRelativeSpread,
    actionShares,
    maxActionShare,
    wellStarvationRate: allTurns ? wellStarvationTurns / allTurns : 0,
    forcedPassRate: allTurns ? forcedPasses / allTurns : 0,
    twoSlotUseRate: allPlayers ? twoSlotUsers / allPlayers : 0,
    averageTension: runs.reduce((sum, run) => sum + run.state.tension, 0) / runs.length,
    domainOutcomes: outcomeCounts,
    victoryModels: victoryStats,
    gates: {
      completion: { passed: completionRate >= 0.995, value: completionRate, threshold: ">= 0.995" },
      deadlocks: { passed: runs.length === completed.length, value: runs.length - completed.length, threshold: "= 0" },
      seatParity: { passed: openerRelativeSpread <= 0.04, value: openerRelativeSpread, threshold: "<= 0.04" },
      actionDominance: { passed: maxActionShare <= 0.6, value: maxActionShare, threshold: "<= 0.60" },
      wellStarvation: { passed: allTurns === 0 || wellStarvationTurns / allTurns <= 0.01, value: allTurns ? wellStarvationTurns / allTurns : 0, threshold: "<= 0.01" },
      forcedPasses: { passed: allTurns === 0 || forcedPasses / allTurns <= 0.01, value: allTurns ? forcedPasses / allTurns : 0, threshold: "<= 0.01" },
      twoProgramSlots: { passed: twoSlotUsers / allPlayers >= 0.5, value: twoSlotUsers / allPlayers, threshold: ">= 0.50" },
    },
    notes: [
      "Automated bot evidence is a screening gate, not human preference evidence.",
      "Pacing in turns is measured here; wall-clock targets require logged human sessions.",
      "Lineage and comeback diversity need richer telemetry before the automated-core gate can be considered complete.",
    ],
  };
}
