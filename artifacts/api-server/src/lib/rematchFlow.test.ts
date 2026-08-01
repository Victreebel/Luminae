import { describe, expect, it } from "vitest";
import { getRematchReadiness } from "./rematchFlow.js";

const humans = [
  { id: "a", isAi: false },
  { id: "b", isAi: false },
  { id: "c", isAi: false },
];

describe("getRematchReadiness", () => {
  it("waits indefinitely for slower human players instead of timing them out", () => {
    expect(
      getRematchReadiness(
        {
          joinedIds: new Set(["a"]),
          declinedIds: new Set(),
        },
        humans,
      ),
    ).toEqual({
      active: true,
      allHumansResponded: false,
      confirmedCount: 1,
      shouldStart: false,
    });
  });

  it("starts as soon as every human player joins", () => {
    expect(
      getRematchReadiness(
        {
          joinedIds: new Set(["a", "b", "c"]),
          declinedIds: new Set(),
        },
        humans,
      ).shouldStart,
    ).toBe(true);
  });

  it("allows a deliberate subset after the other players explicitly decline", () => {
    expect(
      getRematchReadiness(
        {
          joinedIds: new Set(["a", "b"]),
          declinedIds: new Set(["c"]),
        },
        humans,
      ).shouldStart,
    ).toBe(true);
  });

  it("does not start a one-player rematch", () => {
    expect(
      getRematchReadiness(
        {
          joinedIds: new Set(["a"]),
          declinedIds: new Set(["b", "c"]),
        },
        humans,
      ).shouldStart,
    ).toBe(false);
  });

  it("auto-confirms AI seats once the human player joins", () => {
    expect(
      getRematchReadiness(
        {
          joinedIds: new Set(["a"]),
          declinedIds: new Set(),
        },
        [
          { id: "a", isAi: false },
          { id: "ai", isAi: true },
        ],
      ).shouldStart,
    ).toBe(true);
  });
});
