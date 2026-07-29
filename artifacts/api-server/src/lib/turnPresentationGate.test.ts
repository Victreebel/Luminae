import { describe, expect, it } from "vitest";
import { OPENING_TURN_ORDER_PRESENTATION_MS } from "@workspace/game-types";
import {
  getOpeningTurnPresentationWaitMs,
  OPENING_TURN_ORDER_SETTLE_MS,
} from "./turnPresentationGate.js";

describe("getOpeningTurnPresentationWaitMs", () => {
  it("holds the opening AI turn until the selector has completed", () => {
    const startedAt = 10_000;
    const elapsed = 2_200;

    expect(
      getOpeningTurnPresentationWaitMs(
        {
          turnCount: 0,
          openingTurnOrder: { startedAt },
        },
        startedAt + elapsed,
      ),
    ).toBe(OPENING_TURN_ORDER_PRESENTATION_MS + OPENING_TURN_ORDER_SETTLE_MS - elapsed);
  });

  it("does not delay later turns or completed opening presentations", () => {
    const startedAt = 10_000;

    expect(
      getOpeningTurnPresentationWaitMs(
        {
          turnCount: 1,
          openingTurnOrder: { startedAt },
        },
        startedAt + 100,
      ),
    ).toBe(0);
    expect(
      getOpeningTurnPresentationWaitMs(
        {
          turnCount: 0,
          openingTurnOrder: { startedAt },
        },
        startedAt + OPENING_TURN_ORDER_PRESENTATION_MS + OPENING_TURN_ORDER_SETTLE_MS,
      ),
    ).toBe(0);
  });
});
