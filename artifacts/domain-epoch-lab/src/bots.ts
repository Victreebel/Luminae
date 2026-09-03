import { getCatalog } from "./catalog";
import { legalActions } from "./engine";
import type { ArtifactDefinition, BotStrategy, GameState, PrototypeAction } from "./types";

function hash(value: string): number {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function artifact(state: GameState, id: string): ArtifactDefinition {
  const found = getCatalog(state.ruleset.catalog).find((candidate) => candidate.id === id);
  if (!found) throw new Error(`Unknown Artifact ${id}`);
  return found;
}

function score(state: GameState, action: PrototypeAction, strategy: BotStrategy): number {
  const player = state.players[state.activePlayerIndex];
  const noise = hash(`${state.ruleset.seed}:${state.totalTurns}:${strategy}:${JSON.stringify(action)}`) / 0xffff_ffff;
  let value = noise * 0.1;
  if (action.type === "coordinate") {
    value += strategy === "domain" ? 20 : strategy === "greedy" ? 7 : 4;
  } else if (action.type === "channel") {
    value += 8;
    for (const placement of action.placements) {
      const program = player.programs[placement.slot];
      if (program) value += artifact(state, program.artifactId).eminence;
    }
    if (action.placements[0].affinity === action.placements[1].affinity) value -= strategy === "greedy" ? 0.5 : 2;
  } else if (action.type === "initiate") {
    const id = state.frontier[action.sector]!;
    const candidate = artifact(state, id);
    value += 4 + candidate.eminence;
    if (action.inheritedAffinity) value += strategy === "lineage" ? 12 : 4;
    if (candidate.tags.includes(player.imperative.tag)) value += strategy === "greedy" ? 5 : 2;
    if (strategy === "denial") value += candidate.scale === "galactic" ? 10 : candidate.scale === "stellar" ? 5 : 1;
    if (player.programs.filter(Boolean).length === 1) value += 2;
  } else {
    value -= 10;
    const program = player.programs[action.slot];
    if (program && strategy === "denial") value += artifact(state, program.artifactId).eminence * -1;
  }
  if (strategy === "random") return noise;
  return value;
}

export function chooseBotAction(state: GameState, strategy: BotStrategy): PrototypeAction | null {
  const actions = legalActions(state);
  if (actions.length === 0) return null;
  return actions
    .map((action) => ({ action, score: score(state, action, strategy) }))
    .sort((a, b) => b.score - a.score)[0].action;
}

export function mixedStrategyForSeat(seat: number, seed: number): BotStrategy {
  const strategies: BotStrategy[] = ["greedy", "lineage", "denial", "domain", "random"];
  return strategies[(seat + seed) % strategies.length];
}
