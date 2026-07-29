import { describe, expect, it } from "vitest";
import type { GameState } from "@workspace/api-client-react";
import { resolveLuminaryProcedure } from "../luminaryAnimationProcedures";

const minimalState = {} as GameState;

describe("Phoenix Paradox animation procedure", () => {
  it("announces manifestation without pretending the delayed recovery already happened", () => {
    const steps = resolveLuminaryProcedure(
      "lum_astral",
      "summon",
      minimalState,
      "p1",
      { targetCardIds: ["t1-example"] },
    );

    expect(steps).toEqual([
      { type: "luminaryPulse", luminaryId: "lum_astral" },
    ]);
  });

  it("returns the server-provided Burned Artifacts before presenting Forge refill", () => {
    const returnedCardIds = ["t1-example", "t3-example"];
    const steps = resolveLuminaryProcedure(
      "lum_astral",
      "start_of_turn",
      minimalState,
      "p1",
      { targetCardIds: returnedCardIds },
    );

    expect(steps).toEqual([
      { type: "luminaryPulse", luminaryId: "lum_astral" },
      { type: "archiveReturn", cardIds: returnedCardIds },
      { type: "forgeRefill", slotIds: [] },
    ]);
  });

  it("keeps Forgotten Hour's victory rise on the branding step", () => {
    const state = {
      forgeTier1: ["t1-example"],
      forgeTier2: [],
      forgeTier3: [],
    } as unknown as GameState;

    const summonSteps = resolveLuminaryProcedure("lum_compass", "summon", state, "p1");
    const summonResidue = summonSteps.find(step => step.type === "residue");
    expect(summonResidue).toMatchObject({
      type: "residue",
      keyword: "forgotten",
      victoryRequirementChange: 1,
    });
    expect(summonSteps.some(step => step.type === "victoryRequirementChange")).toBe(false);

    const repeatSteps = resolveLuminaryProcedure("lum_compass", "end_of_turn", state, "p1");
    const repeatResidue = repeatSteps.find(step => step.type === "residue");
    expect(repeatResidue).toMatchObject({ type: "residue", keyword: "forgotten" });
    expect(repeatResidue?.type === "residue" ? repeatResidue.victoryRequirementChange : undefined)
      .toBeUndefined();
  });
});
