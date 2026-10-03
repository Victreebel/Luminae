import { describe, expect, it } from "vitest";
import { getPublicCardLoreCatalog } from "./cardLore";
import { ARTIFACT_CANON } from '@workspace/game-types';

describe("public card lore projection", () => {
  it('keeps concealed Blueprint associations out of the shared client canon', () => {
    const shared = JSON.stringify(ARTIFACT_CANON);
    for (const name of ['Antimatter Detonator', 'Mantle-to-Orbit Foundry', 'Worldshield Covenant', 'Ascension Registry']) {
      expect(shared).not.toContain(name);
    }
    for (const canon of Object.values(ARTIFACT_CANON)) {
      expect(canon).not.toHaveProperty('blueprintFamilies');
    }
  });

  it("returns all 95 Artifacts without leaking Blueprint identities or recipes", () => {
    const catalog = getPublicCardLoreCatalog();
    const serialized = JSON.stringify(catalog);

    expect(Object.keys(catalog)).toHaveLength(95);
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
