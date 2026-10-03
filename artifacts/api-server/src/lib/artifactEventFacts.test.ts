import { describe, expect, it } from "vitest";
import {
  ARTIFACT_CATALOG,
  ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID,
  ARTIFACT_CANON,
  ARTIFACT_EVENT_FACT_DEFINITIONS,
  ARTIFACT_EVENT_FACTS_BY_ID,
  ARTIFACT_EVENT_FACTS_RULES_VERSION,
  artifactHasEventFact,
  getArtifactEventFactEvidence,
  getArtifactEventFacts,
} from "@workspace/game-types";
import { CARD_LORE } from "./cardLore";

const synchronization = "dependency:distributed_synchronization";

describe("reviewed Artifact Event facts", () => {
  it("has an explicit review for every Artifact and every closed fact", () => {
    const artifactIds = ARTIFACT_CATALOG.map(({ id }) => id).sort();
    const factIds = ARTIFACT_EVENT_FACT_DEFINITIONS.map(({ id }) => id).sort();

    expect(artifactIds).toHaveLength(95);
    expect(Object.keys(ARTIFACT_EVENT_FACTS_BY_ID).sort()).toEqual(artifactIds);
    expect(ARTIFACT_EVENT_FACTS_RULES_VERSION).toBe("artifact-event-facts-v5");
    for (const artifactId of artifactIds) {
      const entry = ARTIFACT_EVENT_FACTS_BY_ID[artifactId];
      expect(entry.capabilityReview.status).toBe("reviewed");
      expect(entry.capabilityReview.reason.length).toBeGreaterThan(30);
      expect(Object.keys(entry.factReviews).sort()).toEqual(factIds);
      for (const factId of factIds) {
        const review = entry.factReviews[factId];
        expect(typeof review.matches).toBe("boolean");
        expect(review.reason.length).toBeGreaterThan(30);
      }
    }
  });

  it("keeps the review tied to current practical lore and its effective source", () => {
    for (const { id } of ARTIFACT_CATALOG) {
      const entry = ARTIFACT_EVENT_FACTS_BY_ID[id];
      const canon = ARTIFACT_CANON[id];
      expect(entry.practicalCapability).toBe(canon.practicalCapability);
      expect(entry.evidence).toBe(canon.functionalText);
      expect(entry.source).toEqual({
        path: "lib/game-types/src/artifact-canon.ts",
        key: `ARTIFACT_CANON.${id}`,
        field: "practicalCapability",
        evidenceField: "functionalText",
      });
      expect(CARD_LORE[id].name).toBe(canon.name);
      expect(CARD_LORE[id].blueprintRole).toBe(entry.practicalCapability);
      expect(CARD_LORE[id].flavor.startsWith(entry.evidence)).toBe(true);
      // A changed capability assignment must receive a new semantic review.
      expect(entry.reviewedCapabilityIds).toEqual(
        ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID[id],
      );
    }
  });

  it("limits distributed synchronization to thirteen reviewed live coordination functions", () => {
    const matches = ARTIFACT_CATALOG
      .filter(({ id }) => artifactHasEventFact(id, synchronization))
      .map(({ id }) => id)
      .sort();
    expect(matches).toEqual([
      "t1p06", "t1r09", "t1s04", "t1s09", "t2p04", "t2p05", "t3o03", "t3o04", "t3p03", "t3r01", "t3r03", "t3r04", "t3s01",
    ]);
    expect(ARTIFACT_CATALOG.filter(({ id }) => (
      getArtifactEventFactEvidence(id, synchronization)?.matches === false
    ))).toHaveLength(82);
  });

  it("does not equate broad coordination, timekeeping, or shared records with this dependency", () => {
    for (const id of [
      "t1r03", // Remembered local ignition, not separated live nodes.
      "t1o06", // Material routing, not shared timing/control state.
      "t2s05", // Multi-world archive, not synchronized clocks.
      "t2e02", // Dormancy schedule, not distributed timing.
      "t2e04", // Translation and relay, not synchronized control.
      "t2p03", // An agreement, not a synchronized control loop.
      "t2p06", // Allocation governance, not synchronized control.
      "t3s04", // Ordered historical records, not synchronized live clocks.
    ]) {
      expect(getArtifactEventFactEvidence(id, synchronization)?.matches).toBe(false);
    }
    // A temporal substrate qualifies despite not having distributed_coordination.
    expect(ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID.t1s04).not.toContain(
      "artifact:distributed_coordination",
    );
    expect(artifactHasEventFact("t1s04", synchronization)).toBe(true);
  });

  it("recognizes seven reviewed signal responders including explicit biological translation", () => {
    const responders = ARTIFACT_CATALOG.filter(({ id }) => (
      ARTIFACT_EVENT_FACTS_BY_ID[id].reviewedCapabilityIds.includes(
        "artifact:signal_interpretation",
      )
    )).map(({ id }) => id);
    expect(responders).toEqual([
      "t1p03", "t1p05", "t1p07", "t2s06", "t2e04", "t2p02", "t3o04",
    ]);
    expect(ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID.t3r01).not.toContain("artifact:signal_interpretation");
    expect(ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID.t3s03).toContain("artifact:information_recovery");
    expect(getArtifactEventFacts("t3o04")?.practicalCapability).toContain("time-calibrated observations");
  });

  it("does not silently classify unknown or inherited object keys", () => {
    for (const id of ["unknown-artifact", "constructor", "toString", "__proto__"]) {
      expect(getArtifactEventFacts(id)).toBeUndefined();
      expect(getArtifactEventFactEvidence(id, synchronization)).toBeUndefined();
      expect(artifactHasEventFact(id, synchronization)).toBe(false);
    }
  });
});
