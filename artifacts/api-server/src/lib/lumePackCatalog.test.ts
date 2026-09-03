import { describe, expect, it } from "vitest";
import { LUME_PACKS, getLumePack, matchesProviderProduct } from "./lumePackCatalog";

describe("Lume pack catalog", () => {
  it("offers only the approved native pack sizes", () => {
    expect(LUME_PACKS.map((pack) => pack.lumeAmount)).toEqual([100, 300, 700]);
    expect(new Set(LUME_PACKS.flatMap((pack) => Object.values(pack.productIds))).size).toBe(3);
  });

  it("requires an exact provider product match", () => {
    expect(matchesProviderProduct("google_play", "lume_300", "luminae_lume_300")).toBe(true);
    expect(matchesProviderProduct("samsung_iap", "lume_300", "luminae_lume_700")).toBe(false);
    expect(getLumePack("lume_700").lumeAmount).toBe(700);
  });
});
