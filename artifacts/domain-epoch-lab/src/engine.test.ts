import { describe, expect, it } from "vitest";
import { chooseBotAction } from "./bots";
import { CORE_CATALOG, MICRO_CATALOG } from "./catalog";
import { applyAction, createGame, legalActions } from "./engine";
import { playBotGame, runSimulationMatrix } from "./simulation";
import type { Ruleset } from "./types";

const ruleset = (overrides: Partial<Ruleset> = {}): Ruleset => ({
  seed: 42,
  playerCount: 2,
  format: "quick",
  victoryModel: "eminence",
  catalog: "micro",
  optionalModules: [],
  ...overrides,
});

describe("Domain Epoch catalog", () => {
  it("contains balanced 15-card and 30-card catalogs", () => {
    expect(MICRO_CATALOG).toHaveLength(15);
    expect(CORE_CATALOG).toHaveLength(30);
    for (const catalog of [MICRO_CATALOG, CORE_CATALOG]) {
      expect(new Set(catalog.map((artifact) => artifact.affinity)).size).toBe(5);
      expect(new Set(catalog.map((artifact) => artifact.scale)).size).toBe(3);
    }
  });
});

describe("pure engine", () => {
  it("is deterministic and never mutates its input", () => {
    const initial = createGame(ruleset());
    const before = structuredClone(initial);
    const action = legalActions(initial)[0];
    const first = applyAction(initial, action);
    const second = applyAction(createGame(ruleset()), action);
    expect(initial).toEqual(before);
    expect(first).toEqual(second);
  });

  it("Initiate occupies a Program, commits one unit, and refills its sector", () => {
    const initial = createGame(ruleset());
    const action = legalActions(initial).find((candidate) => candidate.type === "initiate")!;
    if (action.type !== "initiate") throw new Error("Expected initiate");
    const card = initial.frontier[action.sector];
    const wellBefore = initial.well[action.startingAffinity];
    const next = applyAction(initial, action);
    expect(next.players[0].programs[action.slot]?.artifactId).toBe(card);
    expect(next.well[action.startingAffinity]).toBe(wellBefore - 1);
    expect(next.frontier[action.sector]).not.toBe(card);
  });

  it("Pivot returns committed addressability and raises Tension", () => {
    const initial = createGame(ruleset());
    const initiate = legalActions(initial).find((candidate) => candidate.type === "initiate")!;
    let state = applyAction(initial, initiate);
    state.activePlayerIndex = 0;
    const before = { ...state.well };
    const program = state.players[0].programs[0] ?? state.players[0].programs[1];
    expect(program).not.toBeNull();
    const pivot = legalActions(state).find((candidate) => candidate.type === "pivot")!;
    const next = applyAction(state, pivot);
    const committedAffinity = Object.entries(program!.committed).find(([, count]) => count === 1)![0] as keyof typeof before;
    expect(next.well[committedAffinity]).toBe(before[committedAffinity] + 1);
    expect(next.tension).toBe(state.tension + 1);
  });

  it("offers lineage substitution only when Built On mastery exists", () => {
    const state = createGame(ruleset({ catalog: "core" }));
    state.frontier.flare = "t2r01";
    state.players[0].implemented.push("t1r01");
    const inherited = legalActions(state).filter((action) => action.type === "initiate" && action.sector === "flare");
    expect(inherited.length).toBeGreaterThan(0);
    expect(inherited.every((action) => action.type === "initiate" && action.inheritedAffinity !== null)).toBe(true);
  });

  it("makes both Program slots available", () => {
    let state = createGame(ruleset());
    const first = legalActions(state).find((action) => action.type === "initiate" && action.slot === 0)!;
    state = applyAction(state, first);
    state.activePlayerIndex = 0;
    const second = legalActions(state).find((action) => action.type === "initiate" && action.slot === 1)!;
    state = applyAction(state, second);
    expect(state.players[0].programs.filter(Boolean)).toHaveLength(2);
    expect(state.players[0].maxOccupiedSlots).toBe(2);
  });
});

describe("rules laboratory", () => {
  it("replays identical bot games exactly", () => {
    const first = playBotGame(ruleset({ catalog: "core", format: "standard" }));
    const second = playBotGame(ruleset({ catalog: "core", format: "standard" }));
    expect(first).toEqual(second);
  });

  it("produces machine-readable telemetry across the full matrix", () => {
    const report = runSimulationMatrix({ seedsPerConfiguration: 2, catalog: "core" });
    expect(report.games).toBe(54);
    expect(report.configurations).toBe(27);
    expect(report.schema).toBe("domain-epoch-report/v0.1");
    expect(Object.keys(report.actionShares)).toEqual(["initiate", "channel", "pivot", "coordinate"]);
    expect(Number.isFinite(report.averageTurns)).toBe(true);
  });

  it("selects a legal deterministic bot action", () => {
    const state = createGame(ruleset());
    const action = chooseBotAction(state, "lineage");
    expect(action).not.toBeNull();
    expect(legalActions(state)).toContainEqual(action);
  });
});
