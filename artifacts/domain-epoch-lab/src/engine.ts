import { artifactMap, DOMAIN_CONDITIONS, getCatalog, IMPERATIVES } from "./catalog";
import {
  AFFINITIES,
  emptyAffinityCounts,
  type Affinity,
  type ArtifactDefinition,
  type CivilizationState,
  type GameState,
  type ProgramState,
  type PrototypeAction,
  type Ruleset,
} from "./types";

const FORMAT = {
  quick: { epochs: 2, turnsPerPlayer: 5 },
  standard: { epochs: 3, turnsPerPlayer: 6 },
  epic: { epochs: 5, turnsPerPlayer: 6 },
} as const;

function nextRandom(state: GameState): number {
  let x = state.rngState || 0x6d2b79f5;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.rngState = x >>> 0;
  return state.rngState / 0x1_0000_0000;
}

function seededShuffle<T>(state: GameState, values: T[]): T[] {
  const copy = [...values];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(nextRandom(state) * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

function occupiedSlots(player: CivilizationState): number {
  return player.programs.filter(Boolean).length;
}

function artifactFor(state: GameState, artifactId: string): ArtifactDefinition {
  const artifact = artifactMap(getCatalog(state.ruleset.catalog)).get(artifactId);
  if (!artifact) throw new Error(`Unknown prototype Artifact: ${artifactId}`);
  return artifact;
}

function remaining(program: ProgramState, artifact: ArtifactDefinition, affinity: Affinity): number {
  const inherited = program.inheritedAffinity === affinity ? 1 : 0;
  return Math.max(0, artifact.requirements[affinity] - program.committed[affinity] - inherited);
}

function isComplete(program: ProgramState, artifact: ArtifactDefinition): boolean {
  return AFFINITIES.every((affinity) => remaining(program, artifact, affinity) === 0);
}

function hasLineage(player: CivilizationState, artifact: ArtifactDefinition): boolean {
  return artifact.builtOn.some((id) => player.implemented.includes(id));
}

function drawFrontier(state: GameState, affinity: Affinity): void {
  state.frontier[affinity] = state.decks[affinity].shift() ?? null;
}

function log(state: GameState, playerId: string, action: PrototypeAction["type"] | "system", detail: string): void {
  state.log.push({ turn: state.totalTurns, epoch: state.epoch, playerId, action, detail });
}

function conditionFor(state: GameState, epoch: number) {
  return DOMAIN_CONDITIONS[(state.ruleset.seed + epoch - 1) % DOMAIN_CONDITIONS.length];
}

export function createGame(input: Ruleset): GameState {
  if (input.playerCount < 2 || input.playerCount > 4) throw new Error("Prototype supports 2–4 civilizations.");
  const state: GameState = {
    schema: "domain-epoch-lab/v0.1",
    ruleset: structuredClone(input),
    phase: "playing",
    rngState: input.seed >>> 0,
    epoch: 1,
    turnsInEpoch: 0,
    totalTurns: 0,
    activePlayerIndex: 0,
    openingPlayerIndex: 0,
    closingAfterEpoch: null,
    well: emptyAffinityCounts(),
    frontier: { flare: null, continuum: null, verdance: null, abyss: null, radiance: null },
    decks: { flare: [], continuum: [], verdance: [], abyss: [], radiance: [] },
    discard: [],
    tension: 0,
    condition: DOMAIN_CONDITIONS[0],
    epochContribution: 0,
    epochResults: [],
    domainOutcome: "pending",
    players: [],
    winnerIds: [],
    log: [],
    actionCounts: { initiate: 0, channel: 0, pivot: 0, coordinate: 0 },
    wellStarvationTurns: 0,
    forcedPasses: 0,
  };
  const supply = input.playerCount + 4;
  for (const affinity of AFFINITIES) state.well[affinity] = supply;
  state.condition = conditionFor(state, 1);
  const catalog = getCatalog(input.catalog);
  for (const affinity of AFFINITIES) {
    const cards = catalog.filter((artifact) => artifact.affinity === affinity);
    const ordered: string[] = [];
    for (const scale of ["planetary", "stellar", "galactic"] as const) {
      ordered.push(...seededShuffle(state, cards.filter((artifact) => artifact.scale === scale).map((artifact) => artifact.id)));
    }
    state.decks[affinity] = ordered;
    drawFrontier(state, affinity);
  }
  state.players = Array.from({ length: input.playerCount }, (_, index) => ({
    id: `civilization-${index + 1}`,
    name: `Civilization ${index + 1}`,
    eminence: 0,
    legacy: { reach: 0, network: 0, resilience: 0 },
    programs: [null, null],
    implemented: [],
    exhausted: [],
    domainContribution: 0,
    imperative: structuredClone(IMPERATIVES[(input.seed + index) % IMPERATIVES.length]),
    imperativeComplete: false,
    maxOccupiedSlots: 0,
  }));
  log(state, "domain", "system", `Epoch 1 begins: ${state.condition.name}.`);
  return state;
}

function initiationActions(state: GameState, player: CivilizationState): PrototypeAction[] {
  const actions: PrototypeAction[] = [];
  for (const sector of AFFINITIES) {
    const id = state.frontier[sector];
    if (!id) continue;
    const artifact = artifactFor(state, id);
    const inheritanceChoices: (Affinity | null)[] = hasLineage(player, artifact)
      ? AFFINITIES.filter((affinity) => artifact.requirements[affinity] > 0)
      : [null];
    for (const slot of [0, 1] as const) {
      if (player.programs[slot]) continue;
      for (const inheritedAffinity of inheritanceChoices) {
        for (const startingAffinity of AFFINITIES) {
          const inherited = inheritedAffinity === startingAffinity ? 1 : 0;
          if (artifact.requirements[startingAffinity] - inherited > 0 && state.well[startingAffinity] > 0) {
            actions.push({ type: "initiate", sector, slot, startingAffinity, inheritedAffinity });
          }
        }
      }
    }
  }
  return actions;
}

function channelActions(state: GameState, player: CivilizationState): PrototypeAction[] {
  const needs: { slot: 0 | 1; affinity: Affinity }[] = [];
  for (const slot of [0, 1] as const) {
    const program = player.programs[slot];
    if (!program) continue;
    const artifact = artifactFor(state, program.artifactId);
    for (const affinity of AFFINITIES) {
      const count = Math.min(2, remaining(program, artifact, affinity));
      for (let unit = 0; unit < count; unit += 1) needs.push({ slot, affinity });
    }
  }
  const actions: PrototypeAction[] = [];
  for (let first = 0; first < needs.length; first += 1) {
    for (let second = first + 1; second < needs.length; second += 1) {
      const a = needs[first];
      const b = needs[second];
      if (a.slot === b.slot && a.affinity === b.affinity) {
        const program = player.programs[a.slot]!;
        if (remaining(program, artifactFor(state, program.artifactId), a.affinity) < 2) continue;
      }
      const requiredFromWell = a.affinity === b.affinity ? 2 : 1;
      if (state.well[a.affinity] < requiredFromWell || state.well[b.affinity] < 1) continue;
      actions.push({ type: "channel", placements: [a, b] });
    }
  }
  return actions;
}

export function legalActions(state: GameState): PrototypeAction[] {
  if (state.phase !== "playing") return [];
  const player = state.players[state.activePlayerIndex];
  const actions = [...initiationActions(state, player), ...channelActions(state, player)];
  for (const slot of [0, 1] as const) if (player.programs[slot]) actions.push({ type: "pivot", slot });
  for (const id of player.implemented) {
    if (!player.exhausted.includes(id)) {
      actions.push({ type: "coordinate", artifactId: id });
    }
  }
  return actions;
}

function operateProgram(state: GameState, player: CivilizationState, slot: 0 | 1): void {
  const program = player.programs[slot];
  if (!program) return;
  const artifact = artifactFor(state, program.artifactId);
  if (!isComplete(program, artifact)) return;
  for (const affinity of AFFINITIES) state.well[affinity] += program.committed[affinity];
  player.programs[slot] = null;
  player.implemented.push(artifact.id);
  player.eminence += artifact.eminence;
  player.legacy.reach += artifact.scale === "planetary" ? 1 : artifact.scale === "stellar" ? 2 : 3;
  player.legacy.network = new Set(player.implemented.flatMap((id) => artifactFor(state, id).tags)).size;
  const imperativeCount = player.implemented.filter((id) => artifactFor(state, id).tags.includes(player.imperative.tag)).length;
  if (!player.imperativeComplete && imperativeCount >= player.imperative.target) {
    player.imperativeComplete = true;
    player.eminence += 3;
    log(state, player.id, "system", `${player.name} fulfills ${player.imperative.name}.`);
  }
  if (state.ruleset.victoryModel === "keystone" && (artifact.scale === "galactic" || player.imperativeComplete)) {
    state.closingAfterEpoch ??= state.epoch;
  }
  log(state, player.id, "system", `${artifact.name} becomes operational; committed addressability returns to the Well.`);
}

function resolveEpoch(state: GameState): void {
  const target = Math.ceil(state.condition.targetPerPlayer * state.ruleset.playerCount);
  const success = state.epochContribution >= target;
  state.epochResults.push({ epoch: state.epoch, conditionId: state.condition.id, contribution: state.epochContribution, target, success });
  if (success) state.tension = Math.max(0, state.tension - 2);
  else state.tension += target - state.epochContribution;
  log(state, "domain", "system", `${state.condition.name}: ${success ? "addressed" : "unresolved"} (${state.epochContribution}/${target}).`);
  for (const player of state.players) player.exhausted = [];
  const shouldEnd = state.epoch >= FORMAT[state.ruleset.format].epochs || state.closingAfterEpoch === state.epoch;
  if (shouldEnd) {
    completeGame(state);
    return;
  }
  state.epoch += 1;
  state.turnsInEpoch = 0;
  state.epochContribution = 0;
  state.openingPlayerIndex = (state.openingPlayerIndex + 1) % state.ruleset.playerCount;
  state.activePlayerIndex = state.openingPlayerIndex;
  state.condition = conditionFor(state, state.epoch);
  log(state, "domain", "system", `Epoch ${state.epoch} begins: ${state.condition.name}.`);
}

function legacyScore(state: GameState, playerIndex: number): number {
  const axes = ["reach", "network", "resilience"] as const;
  let score = 0;
  for (const axis of axes) {
    const ordered = [...state.players].sort((a, b) => b.legacy[axis] - a.legacy[axis]);
    const rank = ordered.findIndex((player) => player.id === state.players[playerIndex].id);
    score += state.players.length - rank;
  }
  return score;
}

function completeGame(state: GameState): void {
  state.phase = "complete";
  const successes = state.epochResults.filter((result) => result.success).length;
  state.domainOutcome = successes === state.epochResults.length && state.tension <= 3
    ? "flourishing"
    : successes >= Math.ceil(state.epochResults.length / 2)
      ? "strained"
      : "fractured";
  const scores = state.players.map((player, index) => {
    if (state.ruleset.victoryModel === "legacy") return legacyScore(state, index) * 100 + player.eminence;
    if (state.ruleset.victoryModel === "keystone") return player.eminence + (player.imperativeComplete ? 3 : 0) + player.domainContribution;
    return player.eminence;
  });
  const maximum = Math.max(...scores);
  state.winnerIds = state.players.filter((_, index) => scores[index] === maximum).map((player) => player.id);
  log(state, "domain", "system", `Observation closes. Domain outcome: ${state.domainOutcome}.`);
}

export function applyAction(source: GameState, action: PrototypeAction): GameState {
  const state = structuredClone(source);
  const legal = legalActions(state);
  if (!legal.some((candidate) => JSON.stringify(candidate) === JSON.stringify(action))) throw new Error(`Illegal action: ${JSON.stringify(action)}`);
  const player = state.players[state.activePlayerIndex];
  state.actionCounts[action.type] += 1;
  if (action.type === "initiate") {
    const artifactId = state.frontier[action.sector]!;
    const program: ProgramState = { artifactId, committed: emptyAffinityCounts(), inheritedAffinity: action.inheritedAffinity };
    program.committed[action.startingAffinity] = 1;
    state.well[action.startingAffinity] -= 1;
    player.programs[action.slot] = program;
    drawFrontier(state, action.sector);
    player.maxOccupiedSlots = Math.max(player.maxOccupiedSlots, occupiedSlots(player));
    log(state, player.id, action.type, `Initiated ${artifactFor(state, artifactId).name} in slot ${action.slot + 1}; committed 1 ${action.startingAffinity}.`);
    operateProgram(state, player, action.slot);
  } else if (action.type === "channel") {
    for (const placement of action.placements) {
      const program = player.programs[placement.slot]!;
      program.committed[placement.affinity] += 1;
      state.well[placement.affinity] -= 1;
    }
    if (action.placements[0].affinity === action.placements[1].affinity) state.tension += 1;
    log(state, player.id, action.type, `Channeled ${action.placements.map((placement) => placement.affinity).join(" + ")}.`);
    for (const slot of [...new Set(action.placements.map((placement) => placement.slot))] as (0 | 1)[]) operateProgram(state, player, slot);
  } else if (action.type === "pivot") {
    const program = player.programs[action.slot]!;
    for (const affinity of AFFINITIES) state.well[affinity] += program.committed[affinity];
    state.discard.push(program.artifactId);
    player.programs[action.slot] = null;
    state.tension += 1;
    log(state, player.id, action.type, `Pivoted away from ${artifactFor(state, program.artifactId).name}; addressability returned, Tension +1.`);
  } else {
    const direct = artifactFor(state, action.artifactId).tags.includes(state.condition.requiredTag);
    player.exhausted.push(action.artifactId);
    player.domainContribution += 1;
    player.legacy.resilience += 1;
    if (direct) player.eminence += 1;
    state.epochContribution += direct ? 2 : 1;
    log(state, player.id, action.type, `${artifactFor(state, action.artifactId).name} ${direct ? "directly addressed" : "improvised support against"} ${state.condition.name}.`);
  }
  state.totalTurns += 1;
  state.turnsInEpoch += 1;
  if (AFFINITIES.every((affinity) => state.well[affinity] === 0)) state.wellStarvationTurns += 1;
  if (state.turnsInEpoch >= FORMAT[state.ruleset.format].turnsPerPlayer * state.ruleset.playerCount) resolveEpoch(state);
  else if (state.phase === "playing") state.activePlayerIndex = (state.activePlayerIndex + 1) % state.ruleset.playerCount;
  while (state.phase === "playing" && legalActions(state).length === 0) {
    const unavailable = state.players[state.activePlayerIndex];
    state.forcedPasses += 1;
    state.totalTurns += 1;
    state.turnsInEpoch += 1;
    log(state, unavailable.id, "system", `${unavailable.name} has no addressable intervention in this interval.`);
    if (state.turnsInEpoch >= FORMAT[state.ruleset.format].turnsPerPlayer * state.ruleset.playerCount) resolveEpoch(state);
    else if (state.phase === "playing") state.activePlayerIndex = (state.activePlayerIndex + 1) % state.ruleset.playerCount;
  }
  return state;
}

export function replayGame(ruleset: Ruleset, actions: PrototypeAction[]): GameState {
  return actions.reduce((state, action) => applyAction(state, action), createGame(ruleset));
}

export function rulesSummary(state: GameState): string {
  return `${state.ruleset.format} · ${state.ruleset.victoryModel} · ${state.ruleset.playerCount} civilizations · seed ${state.ruleset.seed}`;
}
