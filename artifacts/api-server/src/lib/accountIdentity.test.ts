import { describe, expect, it } from "vitest";
import type {
  CivilizationIdentityOptions,
  CivilizationIdentitySelection,
} from "@workspace/game-types";
import {
  summarizeCivilizationIdentity,
  validateCivilizationIdentitySelection,
} from "./accountIdentityRules";

const earnedOptions: CivilizationIdentityOptions = {
  lineages: ["accord"],
  affinities: ["radiance"],
  artifactIds: ["t1p05"],
  luminaryIds: ["lum_tide"],
  blueprintIds: ["bp_ascension_registry"],
};

const earnedSelection: CivilizationIdentitySelection = {
  lineage: "accord",
  affinity: "radiance",
  signatureArtifactId: "t1p05",
  signatureLuminaryId: "lum_tide",
  signatureBlueprintId: "bp_ascension_registry",
};

describe("account civilization identity", () => {
  it("derives the public designation, Type line, and optional Project epithet", () => {
    expect(summarizeCivilizationIdentity(earnedSelection, 2)).toEqual({
      ...earnedSelection,
      displayName: "The Radiant Concord",
      scaleType: 2,
      scaleLabel: "Kardashev Type II",
      projectEpithet: "Ascension Registry",
    });
  });

  it("accepts only options earned by the account", () => {
    expect(validateCivilizationIdentitySelection(earnedSelection, earnedOptions)).toBeNull();
    expect(validateCivilizationIdentitySelection({
      ...earnedSelection,
      lineage: "fabrication",
    }, earnedOptions)).toBe("That lineage has not been earned.");
    expect(validateCivilizationIdentitySelection({
      ...earnedSelection,
      signatureBlueprintId: "bp_antimatter_detonator",
    }, earnedOptions)).toBe("That signature Project has not manifested.");
  });
});
