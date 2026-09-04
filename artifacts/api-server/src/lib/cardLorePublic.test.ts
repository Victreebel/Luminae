import { describe, expect, it } from "vitest";
import { getPublicCardLoreCatalog } from "./cardLore";

describe("public card lore projection", () => {
  it("returns all 90 Artifacts without leaking Blueprint identities or recipes", () => {
    const catalog = getPublicCardLoreCatalog();
    const serialized = JSON.stringify(catalog);

    expect(Object.keys(catalog)).toHaveLength(90);
    for (const lore of Object.values(catalog)) {
      expect(lore).not.toHaveProperty("blueprintRole");
      expect(lore).not.toHaveProperty("blueprintFamilies");
    }

    expect(catalog.t1r01.practicalCapability).toBe(
      "controlled ignition and thermal regulation",
    );

    expect(serialized).not.toContain("Antimatter Detonator");
    expect(serialized).not.toContain("Mantle-to-Orbit Foundry");
    expect(serialized).not.toContain("Worldshield Covenant");
    expect(serialized).not.toContain("Ascension Registry");
  });
});
