import { describe, expect, it } from "vitest";
import {
  ANTIMATTER_DETONATION_EMINENCE_REWARD,
  ANTIMATTER_DETONATION_TARGET_TIER,
  ANTIMATTER_DETONATION_TRIGGERS,
  ANTIMATTER_DETONATION_VARIANTS,
  ANTIMATTER_DETONATION_TIMING,
} from "../antimatterDetonationTimeline";

describe("Antimatter detonation timeline", () => {
  it("converges all three inward waves at the vacuum and pinch", () => {
    const timing = ANTIMATTER_DETONATION_TIMING;

    expect(timing.implosionWaves).toHaveLength(3);
    for (const startsAt of timing.implosionWaves) {
      expect(startsAt).toBeGreaterThanOrEqual(timing.implosion.startsAt);
      expect(startsAt).toBeLessThan(timing.vacuum.startsAt);
    }
    expect(timing.vacuum.endsAt - timing.vacuum.startsAt).toBeCloseTo(0.06, 5);
    expect(timing.vacuum.endsAt).toBe(timing.implosion.pinchesAt);
    expect(timing.flash.startsAt).toBe(timing.implosion.pinchesAt);
  });

  it("removes the target before the outcome and reward resolve", () => {
    const timing = ANTIMATTER_DETONATION_TIMING;

    expect(timing.target.vanishesAt).toBeGreaterThan(
      timing.flash.peaksAt - 0.02,
    );
    expect(timing.target.vanishesAt).toBeLessThan(timing.outcome.startsAt);
    expect(timing.aftershock.startsAt).toBeGreaterThanOrEqual(
      timing.flash.peaksAt,
    );
    expect(timing.aftershock.endsAt).toBeLessThan(timing.reward.impactsAt);
    expect(timing.reward.completesAt).toBeLessThan(timing.duration);
  });

  it("uses the locked Tier II target, triggers, and Eminence reward", () => {
    expect(ANTIMATTER_DETONATION_TARGET_TIER).toBe(2);
    expect(ANTIMATTER_DETONATION_EMINENCE_REWARD).toBe(2);
    expect(ANTIMATTER_DETONATION_TRIGGERS).toEqual(["forged", "encrypted"]);
  });

  it("resolves broken-Covenant collateral before the reward lands", () => {
    const { covenant, flash, reward } = ANTIMATTER_DETONATION_TIMING;

    expect(covenant.artifactsAppearAt).toBeGreaterThanOrEqual(flash.endsAt);
    expect(covenant.artifactsLockAt).toBeGreaterThan(
      covenant.artifactsAppearAt,
    );
    expect(covenant.artifactsAnnihilateAt).toBeGreaterThan(
      covenant.artifactsLockAt,
    );
    expect(covenant.artifactsVanishAt).toBeGreaterThan(
      covenant.artifactsAnnihilateAt,
    );
    expect(covenant.artifactsVanishAt).toBeLessThan(reward.appearsAt);
  });

  it("supports every existing 3D device form", () => {
    expect(ANTIMATTER_DETONATION_VARIANTS).toEqual([
      "original",
      "asymmetric",
      "lattice",
      "armored",
    ]);
  });
});
