import { describe, expect, it } from "vitest";
import { getDailyLumeReward, isTestCheckoutEnabled } from "./storeRules.js";

describe("store rules", () => {
  it("keeps the daily reward useful without allowing runaway streak inflation", () => {
    expect(getDailyLumeReward(1)).toBe(10);
    expect(getDailyLumeReward(3)).toBe(10);
    expect(getDailyLumeReward(4)).toBe(15);
    expect(getDailyLumeReward(10)).toBe(25);
    expect(getDailyLumeReward(100)).toBe(25);
  });

  it("never exposes test checkout in production", () => {
    expect(isTestCheckoutEnabled("production")).toBe(false);
    expect(isTestCheckoutEnabled("development")).toBe(true);
    expect(isTestCheckoutEnabled("test")).toBe(true);
  });
});
