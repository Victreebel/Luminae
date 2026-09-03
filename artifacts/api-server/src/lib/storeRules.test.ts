import { describe, expect, it } from "vitest";
import { getDailyStarlightReward, isTestCheckoutEnabled } from "./storeRules.js";

describe("store rules", () => {
  it("keeps the daily reward useful without allowing runaway streak inflation", () => {
    expect(getDailyStarlightReward(1)).toBe(10);
    expect(getDailyStarlightReward(3)).toBe(10);
    expect(getDailyStarlightReward(4)).toBe(15);
    expect(getDailyStarlightReward(10)).toBe(25);
    expect(getDailyStarlightReward(100)).toBe(25);
  });

  it("never exposes test checkout in production", () => {
    expect(isTestCheckoutEnabled("production")).toBe(false);
    expect(isTestCheckoutEnabled("development")).toBe(true);
    expect(isTestCheckoutEnabled("test")).toBe(true);
  });
});
