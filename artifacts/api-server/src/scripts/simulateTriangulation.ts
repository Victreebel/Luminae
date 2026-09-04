import {
  TRIANGULATION_COORDINATION_ARCHITECTURES,
  TRIANGULATION_REFERENCE_CIVILIZATIONS,
  triangulationOutcomeId,
  type TriangulationCoordinationArchitecture,
  type TriangulationReferenceCivilization,
} from "@workspace/game-types";
import { chooseAiAction } from "../lib/aiPlayer";
import {
  applyAction,
  CARD_MAP,
  configureTriangulationScenario,
  initializeGame,
  normalizeState,
  type GameStateData,
} from "../lib/gameEngine";

const DEFAULT_GAMES = 1_500;
const MAX_ACTIONS_PER_GAME = 500;

function optionalIntegerArg(name: string): number | null {
  const prefix = `--${name}=`;
  const raw = process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
}

interface RunResult {
  architecture: TriangulationCoordinationArchitecture;
  seed: number;
  completed: boolean;
  actions: number;
  turns: number;
  reference: TriangulationReferenceCivilization | null;
  outcomeId: string | null;
  preparednessMet: boolean;
  preparednessOpportunity: boolean;
  autonomousEncryptions: number;
  actionFailures: number;
  failureReasons: string[];
  incompleteState: Record<string, unknown> | null;
}

function positiveIntegerArg(name: string, fallback: number): number {
  const prefix = `--${name}=`;
  const raw = process.argv.find((value) => value.startsWith(prefix))?.slice(prefix.length);
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
}

function seededRandom(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function preparednessOpportunity(state: GameStateData): boolean {
  const preparedIds = new Set(["t1p03", "t1o06", "t1r08"]);
  return state.forgeTier1.some((artifactId) => preparedIds.has(artifactId));
}

function runOne(
  architecture: TriangulationCoordinationArchitecture,
  seed: number,
): RunResult {
  const originalRandom = Math.random;
  Math.random = seededRandom(seed);
  try {
    const state = normalizeState(initializeGame([
      { id: "deme", name: "Deme Assemblies" },
      { id: "myria", name: "Myriad Groves" },
      { id: "vesper", name: "Vesper Choir" },
    ], 3));
    state.activeLuminaries = [];
    configureTriangulationScenario(state, "deme", "myria", "vesper", "primary");
    const hadPreparednessOpportunity = preparednessOpportunity(state);
    let autonomousEncryptions = 0;
    let actionFailures = 0;
    const failureReasons: string[] = [];
    const recentActions: Array<Record<string, unknown>> = [];
    let actions = 0;

    for (; actions < MAX_ACTIONS_PER_GAME && state.phase !== "finished"; actions += 1) {
      if (state.triangulationScenario?.phase === "awaiting_alignment") {
        const result = applyAction(state, "deme", {
          type: "resolve_chronicle_choice",
          triangulationCoordinationArchitecture: architecture,
        });
        if (!result.success) {
          actionFailures += 1;
          if (failureReasons.length < 4) failureReasons.push(`deme:resolve_chronicle_choice:${result.error}`);
        }
        continue;
      }

      const currentPlayer = state.players[state.currentPlayerIndex];
      if (!currentPlayer) break;
      const action = chooseAiAction(state, currentPlayer.playerId, "hard");
      const before = {
        turn: state.turnCount,
        playerId: currentPlayer.playerId,
        action,
        well: { ...state.affinityWell },
        held: { ...currentPlayer.affinities },
      };
      if ((currentPlayer.playerId === "myria" || currentPlayer.playerId === "vesper") &&
          action.type === "reserve_artifact") autonomousEncryptions += 1;
      const result = applyAction(state, currentPlayer.playerId, action);
      if (action.type !== "pass") {
        recentActions.push({ ...before, result });
        if (recentActions.length > 18) recentActions.shift();
      }
      if (result.success) continue;
      actionFailures += 1;
      if (failureReasons.length < 4) {
        failureReasons.push(`${currentPlayer.playerId}:${action.type}:${result.error}`);
      }
      const fallback = applyAction(state, currentPlayer.playerId, { type: "pass" });
      if (!fallback.success) break;
    }

    const scenario = state.triangulationScenario;
    return {
      architecture,
      seed,
      completed: state.phase === "finished" && scenario?.phase === "finished",
      actions,
      turns: state.turnCount,
      reference: scenario?.referenceCivilization ?? null,
      outcomeId: scenario?.outcomeId ?? null,
      preparednessMet: scenario?.preparednessMet ?? false,
      preparednessOpportunity: hadPreparednessOpportunity,
      autonomousEncryptions,
      actionFailures,
      failureReasons,
      incompleteState: state.phase === "finished" ? null : {
        phase: state.phase,
        scenarioPhase: scenario?.phase ?? null,
        currentPlayerId: state.players[state.currentPlayerIndex]?.playerId ?? null,
        turnCount: state.turnCount,
        eminence: Object.fromEntries(state.players.map((player) => [player.playerId, player.eminence])),
        forgeCards: state.forgeTier1.length + state.forgeTier2.length + state.forgeTier3.length,
        deckCards: state.deckTier1.length + state.deckTier2.length + state.deckTier3.length,
        affinityWell: state.affinityWell,
        players: state.players.map((player) => ({
          playerId: player.playerId,
          affinities: player.affinities,
          bonuses: player.bonuses,
          eminence: player.eminence,
          reservedArtifactIds: player.reservedArtifactIds,
          forgedArtifactIds: player.forgedArtifactIds,
        })),
        forge: [...state.forgeTier1, ...state.forgeTier2, ...state.forgeTier3].map((artifactId) => {
          const card = CARD_MAP.get(artifactId);
          return card ? { artifactId, tier: card.tier, cost: card.cost } : { artifactId };
        }),
        recentActions,
      },
    };
  } finally {
    Math.random = originalRandom;
  }
}

function percentile(values: readonly number[], fraction: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * fraction))] ?? 0;
}

function main(): void {
  const requestedSeed = optionalIntegerArg("seed");
  const requestedArchitecture = process.argv.find((value) => value.startsWith("--architecture="))
    ?.slice("--architecture=".length) as TriangulationCoordinationArchitecture | undefined;
  if (requestedSeed !== null) {
    if (!requestedArchitecture || !TRIANGULATION_COORDINATION_ARCHITECTURES.includes(requestedArchitecture)) {
      throw new Error("--architecture must name a Triangulation coordination architecture when --seed is used");
    }
    console.log(JSON.stringify(runOne(requestedArchitecture, requestedSeed), null, 2));
    return;
  }
  const games = positiveIntegerArg("games", DEFAULT_GAMES);
  if (games % TRIANGULATION_COORDINATION_ARCHITECTURES.length !== 0) {
    throw new Error("games must divide evenly across the three Alignment architectures");
  }
  const perArchitecture = games / TRIANGULATION_COORDINATION_ARCHITECTURES.length;
  const runs: RunResult[] = [];
  for (let architectureIndex = 0; architectureIndex < TRIANGULATION_COORDINATION_ARCHITECTURES.length; architectureIndex += 1) {
    const architecture = TRIANGULATION_COORDINATION_ARCHITECTURES[architectureIndex];
    for (let index = 0; index < perArchitecture; index += 1) {
      runs.push(runOne(architecture, architectureIndex * 100_000 + index + 1));
    }
  }

  const architectureClosures = Object.fromEntries(TRIANGULATION_COORDINATION_ARCHITECTURES.map((architecture) => [
    architecture,
    runs.filter((run) => run.architecture === architecture && run.completed).length,
  ]));
  const referenceCounts = Object.fromEntries(TRIANGULATION_REFERENCE_CIVILIZATIONS.map((reference) => [
    reference,
    runs.filter((run) => run.reference === reference).length,
  ]));
  const mappingErrors = runs.filter((run) => run.completed && run.reference &&
    run.outcomeId !== triangulationOutcomeId(run.architecture, run.reference));
  const completed = runs.filter((run) => run.completed);
  const report = {
    schema: "luminae-triangulation-simulation/v1",
    games,
    perArchitecture,
    completedClosures: completed.length,
    incompleteClosures: games - completed.length,
    architectureClosures,
    referenceCounts,
    preparedness: {
      legalOpportunityCount: runs.filter((run) => run.preparednessOpportunity).length,
      achievedCount: runs.filter((run) => run.preparednessMet).length,
    },
    pacing: {
      medianTurns: percentile(completed.map((run) => run.turns), 0.5),
      p95Turns: percentile(completed.map((run) => run.turns), 0.95),
      medianActions: percentile(completed.map((run) => run.actions), 0.5),
      p95Actions: percentile(completed.map((run) => run.actions), 0.95),
    },
    integrity: {
      autonomousEncryptions: runs.reduce((sum, run) => sum + run.autonomousEncryptions, 0),
      actionFailures: runs.reduce((sum, run) => sum + run.actionFailures, 0),
      outcomeMappingErrors: mappingErrors.length,
      failureSamples: runs.filter((run) => run.failureReasons.length > 0).slice(0, 8).map((run) => ({
        architecture: run.architecture,
        seed: run.seed,
        reasons: run.failureReasons,
      })),
      incompleteSamples: runs.filter((run) => !run.completed).slice(0, 8).map((run) => ({
        architecture: run.architecture,
        seed: run.seed,
        state: run.incompleteState,
        reasons: run.failureReasons,
      })),
    },
    gates: {
      simulationCount: games >= 1_500,
      architectureClosureCount: Object.values(architectureClosures).every((count) => count >= 500),
      allReferencesReachable: Object.values(referenceCounts).every((count) => count > 0),
      preparednessOpportunity: runs.every((run) => run.preparednessOpportunity),
      noIllegalAutonomousEncryptions: runs.every((run) => run.autonomousEncryptions === 0),
      deterministicOutcomeMapping: mappingErrors.length === 0,
      allRunsCompleted: completed.length === games,
    },
  };
  console.log(JSON.stringify(report, null, 2));
  if (!Object.values(report.gates).every(Boolean)) process.exitCode = 1;
}

main();
