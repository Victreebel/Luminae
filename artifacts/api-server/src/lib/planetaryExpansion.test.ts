import { describe, expect, it } from "vitest";
import {
  ARTIFACT_CATALOG,
  ARTIFACT_CANON,
  ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID,
  ARTIFACT_DEFINITION_BY_ID,
  ARTIFACT_EVENT_FACTS_BY_ID,
  ARTIFACT_FUNCTIONS_BY_ID,
  ARTIFACT_MANIFESTATION_PROFILE_BY_ID,
  ARTIFACT_TECHNOLOGY_METADATA_BY_ID,
  ARTIFACT_TIER_AUDIT_BY_ID,
  BLUEPRINT_DEFINITIONS,
  getArtifactPlacementPhysicalContract,
  type ArtifactDefinition,
} from "@workspace/game-types";

const expansionIds = ["t1r09", "t1s09", "t1e09", "t1o09", "t1p09"] as const;
const affinityKeys = ["flare", "continuum", "verdance", "abyss", "radiance"] as const;
const expectedCosts = [
  [0, 1, 2, 0, 0],
  [1, 0, 1, 1, 0],
  [2, 1, 0, 0, 0],
  [2, 0, 1, 0, 0],
  [2, 1, 0, 0, 0],
];

function strictlyDominates(left: ArtifactDefinition, right: ArtifactDefinition): boolean {
  const channels = [...affinityKeys, "singularity"] as const;
  return left.bonusAffinity === right.bonusAffinity && left.tier === right.tier &&
    left.eminence >= right.eminence &&
    channels.every((key) => left.cost[key] <= right.cost[key]) &&
    (left.eminence > right.eminence || channels.some((key) => left.cost[key] < right.cost[key]));
}

describe("five-card planetary foundation expansion", () => {
  it("adds one accessible three-Affinity, zero-Eminence foundation per bonus", () => {
    for (const [index, id] of expansionIds.entries()) {
      const card = ARTIFACT_DEFINITION_BY_ID[id];
      expect(card.tier, id).toBe(1);
      expect(card.bonusAffinity, id).toBe(affinityKeys[index]);
      expect(card.eminence, id).toBe(0);
      expect(affinityKeys.map((key) => card.cost[key]), id).toEqual(expectedCosts[index]);
      expect(Object.values(card.cost).reduce((sum, amount) => sum + amount, 0), id).toBe(3);
      expect(card.cost.singularity, id).toBe(0);
      expect(card.cost[card.bonusAffinity], id).toBe(0);
    }
    const tierOne = ARTIFACT_CATALOG.filter(({ tier }) => tier === 1);
    expect(affinityKeys.map((key) => tierOne.reduce((sum, card) => sum + card.cost[key], 0)))
      .toEqual([28, 29, 31, 30, 32]);
  });

  it("introduces no strict same-bonus cost and Eminence domination in either direction", () => {
    for (const id of expansionIds) {
      const added = ARTIFACT_DEFINITION_BY_ID[id];
      for (const other of ARTIFACT_CATALOG.filter((card) => card.id !== id)) {
        expect(strictlyDominates(added, other), `${id} dominates ${other.id}`).toBe(false);
        expect(strictlyDominates(other, added), `${other.id} dominates ${id}`).toBe(false);
      }
    }
  });

  it("adds complete planetary services with explicit provenance and no private recipe leads", () => {
    for (const id of expansionIds) {
      const canon = ARTIFACT_CANON[id];
      const audit = ARTIFACT_TIER_AUDIT_BY_ID[id];
      const technology = ARTIFACT_TECHNOLOGY_METADATA_BY_ID[id];
      expect(canon.engineeringScale, id).toBe("Planetary");
      expect(`${canon.functionalText} ${canon.mystery}`.trim().split(/\s+/).length, id).toBeLessThanOrEqual(30);
      expect(canon.projectLeads, id).toEqual([]);
      expect(audit.decision, id).toBe("add");
      expect(audit.priorName, id).toBeNull();
      expect(audit.priorFunction, id).toBeNull();
      expect(audit.confinementTest.length, id).toBeGreaterThan(60);
      expect(technology.builtOn, id).toEqual([]);
      expect(technology.depictionScale, id).toBe("room");
      expect(technology.projectLeads, id).toEqual([]);
    }
    const exactRecipeIds = Object.values(BLUEPRINT_DEFINITIONS)
      .flatMap((blueprint) => blueprint.components.map((component) => component.artifactId));
    expect(exactRecipeIds.filter((id) => expansionIds.some((added) => added === id))).toEqual([]);
  });

  it("fills practical gaps without turning light, living material or agreements into unrelated powers", () => {
    expect(ARTIFACT_FUNCTIONS_BY_ID.t1r09).toEqual(["function:mobility", "function:coordination"]);
    expect(ARTIFACT_FUNCTIONS_BY_ID.t1s09).toEqual(["function:mobility", "function:coordination"]);
    expect(ARTIFACT_FUNCTIONS_BY_ID.t1e09).toEqual(["function:ecology", "function:materials"]);
    expect(ARTIFACT_FUNCTIONS_BY_ID.t1o09).toEqual(["function:security", "function:coordination"]);
    expect(ARTIFACT_FUNCTIONS_BY_ID.t1p09).toEqual(["function:coordination", "function:ecology"]);
    for (const id of expansionIds) {
      const facts = ARTIFACT_EVENT_FACTS_BY_ID[id];
      expect(facts.evidence, id).toBe(ARTIFACT_CANON[id].functionalText);
      expect(facts.reviewedCapabilityIds, id).toEqual(ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID[id]);
      expect(facts.factReviews["dependency:distributed_synchronization"].matches, id)
        .toBe(id === "t1r09" || id === "t1s09");
    }
    expect(ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID.t1e09).not.toContain("artifact:ecological_propagation");
    expect(ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID.t1o09).not.toContain("artifact:concealment");
  });

  it("uses three physically supported Surface families per service and existing district rendering", () => {
    const expectedFamilies = [
      ["observatory_ridge", "transit_terminus", "coastal_margin"],
      ["coastal_margin", "transit_terminus", "observatory_ridge"],
      ["coastal_margin", "industrial_district", "habitat_district"],
      ["subsurface_works", "transit_terminus", "coastal_margin"],
      ["wilderness_margin", "subsurface_works", "civic_core"],
    ];
    for (const [index, id] of expansionIds.entries()) {
      const profile = ARTIFACT_MANIFESTATION_PROFILE_BY_ID[id];
      expect(profile.implementationScale, id).toBe("planetary");
      expect(profile.nativeCameraScale, id).toBe("surface");
      expect(profile.compatiblePlacementFamilies, id).toEqual(expectedFamilies[index]);
      expect(profile.compatiblePlacementFamilies, id).toContain(profile.districtAnchorFamily);
      expect(profile.standaloneAssetRequired, id).toBe(false);
      expect(profile.requiresVisibleSupport, id).toBe(true);
      for (const family of profile.compatiblePlacementFamilies) {
        const physical = getArtifactPlacementPhysicalContract(family);
        expect(physical.nativeScene, `${id}: ${family}`).toBe("surface");
        expect(physical.allowsUnanchoredHover, `${id}: ${family}`).toBe(false);
        expect(profile.validSubstrates, `${id}: ${family}`).toContain(physical.substrate);
        expect(profile.requiredSupportModes, `${id}: ${family}`).toContain(physical.requiredSupport);
      }
    }
  });
});
