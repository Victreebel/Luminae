import { afterEach, describe, expect, it } from "vitest";
import {
  clearDevSnapshot,
  prepareDevSequenceState,
} from "./devRewind";
import type { GameStateData } from "./gameEngine";

function state(version: number, turnCount: number): GameStateData {
  return {
    version,
    turnCount,
  } as GameStateData;
}

afterEach(() => {
  clearDevSnapshot("room-1");
});

describe("prepareDevSequenceState", () => {
  it("captures the first baseline and does not mutate the live state", () => {
    const current = state(4, 2);
    const prepared = prepareDevSequenceState("room-1", current, true);
    prepared.turnCount = 99;

    const repeated = prepareDevSequenceState("room-1", state(8, 7), true);
    expect(current.turnCount).toBe(2);
    expect(repeated.turnCount).toBe(2);
    expect(repeated.version).toBe(8);
  });

  it("replaces the baseline when repeat mode is disabled", () => {
    prepareDevSequenceState("room-1", state(4, 2), true);
    const fresh = prepareDevSequenceState("room-1", state(9, 6), false);
    expect(fresh.turnCount).toBe(6);

    const repeated = prepareDevSequenceState("room-1", state(12, 10), true);
    expect(repeated.turnCount).toBe(6);
    expect(repeated.version).toBe(12);
  });
});
