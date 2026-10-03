import { describe, expect, it } from "vitest";
import {
  ARTIFACT_CATALOG,
  ARTIFACT_CANON,
  ARTIFACT_FUNCTION_DEFINITIONS,
  ARTIFACT_FUNCTIONS_BY_ID,
  ARTIFACT_FUNCTION_TAGS_VERSION,
  artifactHasFunctionTag,
  getArtifactFunctionTags,
} from "@workspace/game-types";

describe("public Artifact Function (Capability) tags", () => {
  it("defines the eight distinct public functions with understandable descriptions", () => {
    expect(ARTIFACT_FUNCTION_DEFINITIONS.map(({ id, label }) => [id, label])).toEqual([
      ["function:energy", "Energy"],
      ["function:materials", "Materials"],
      ["function:mobility", "Mobility"],
      ["function:ecology", "Ecology"],
      ["function:information", "Information"],
      ["function:coordination", "Coordination"],
      ["function:protection", "Protection"],
      ["function:security", "Security"],
    ]);
    for (const definition of ARTIFACT_FUNCTION_DEFINITIONS) {
      expect(definition.description.trim().length).toBeGreaterThan(20);
    }
  });

  it("assigns every current Artifact one or two valid, distinct functions", () => {
    const artifactIds = ARTIFACT_CATALOG.map(({ id }) => id).sort();
    const functionIds = new Set(ARTIFACT_FUNCTION_DEFINITIONS.map(({ id }) => id));

    expect(artifactIds).toHaveLength(95);
    expect(ARTIFACT_FUNCTION_TAGS_VERSION).toBe("artifact-functions-v2");
    expect(Object.keys(ARTIFACT_FUNCTIONS_BY_ID).sort()).toEqual(artifactIds);
    for (const artifactId of artifactIds) {
      const ids = ARTIFACT_FUNCTIONS_BY_ID[artifactId];
      expect(ids.length, artifactId).toBeGreaterThanOrEqual(1);
      expect(ids.length, artifactId).toBeLessThanOrEqual(2);
      expect(new Set(ids).size, artifactId).toBe(ids.length);
      for (const id of ids) expect(functionIds.has(id), `${artifactId}: ${id}`).toBe(true);

      const panelTags = getArtifactFunctionTags(artifactId);
      expect(panelTags.map(({ id }) => id), artifactId).toEqual(ids);
      for (const tag of panelTags) {
        expect(tag.label.trim().length, artifactId).toBeGreaterThan(0);
        expect(tag.description.trim().length, artifactId).toBeGreaterThan(20);
      }
    }
  });

  it("represents a substantial single or dual function rather than incidental materials or timing", () => {
    expect(getArtifactFunctionTags("t1r01").map(({ label }) => label)).toEqual(["Energy"]);
    // Timing one local ignition does not imply coordinating separate operations.
    expect(getArtifactFunctionTags("t1r03").map(({ label }) => label)).toEqual(["Energy"]);
    expect(getArtifactFunctionTags("t1s04").map(({ label }) => label)).toEqual([
      "Materials", "Coordination",
    ]);
    expect(getArtifactFunctionTags("t2r04").map(({ label }) => label)).toEqual([
      "Energy", "Ecology",
    ]);
  });

  it("classifies the revised Galactic technologies by their current roles", () => {
    expect(ARTIFACT_CANON.t3r01.name).toBe("Spiral-Arm Shepherd");
    expect(getArtifactFunctionTags("t3r01").map(({ label }) => label)).toEqual([
      "Energy", "Mobility",
    ]);
    expect(ARTIFACT_CANON.t3e02.name).toBe("Starborne Succession");
    expect(getArtifactFunctionTags("t3e02").map(({ label }) => label)).toEqual([
      "Ecology", "Mobility",
    ]);
    expect(getArtifactFunctionTags("t3p04").map(({ label }) => label)).toEqual([
      "Information", "Security",
    ]);
  });

  it("treats both assigned functions equally without inferring a third function", () => {
    expect(artifactHasFunctionTag("t2r04", "function:energy")).toBe(true);
    expect(artifactHasFunctionTag("t2r04", "function:ecology")).toBe(true);
    expect(artifactHasFunctionTag("t2r04", "function:materials")).toBe(false);
    expect(artifactHasFunctionTag("t1s04", "function:coordination")).toBe(true);
    expect(artifactHasFunctionTag("t1r03", "function:coordination")).toBe(false);
  });

  it("does not reveal tags for concealed IDs or classify unknown and inherited object keys", () => {
    for (const id of [
      "", "unknown-artifact", "encrypted-opaque-opponent-id", "encrypted-t3p04",
      "constructor", "toString", "__proto__",
    ]) {
      expect(getArtifactFunctionTags(id), id).toEqual([]);
      for (const definition of ARTIFACT_FUNCTION_DEFINITIONS) {
        expect(artifactHasFunctionTag(id, definition.id), `${id}: ${definition.id}`).toBe(false);
      }
    }
  });
});
