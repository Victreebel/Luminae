import { describe, expect, it } from "vitest";
import {
  ARTIFACT_CATALOG,
  ARTIFACT_DEFINITIONS,
  BLUEPRINT_DEFINITIONS,
  type ArtifactId,
} from "@workspace/game-types";

function words(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

describe("Technology System v2 invariants", () => {
  it("keeps the stable 40/30/20 Artifact economy", () => {
    expect(ARTIFACT_CATALOG).toHaveLength(90);
    expect(ARTIFACT_CATALOG.filter((artifact) => artifact.tier === 1)).toHaveLength(40);
    expect(ARTIFACT_CATALOG.filter((artifact) => artifact.tier === 2)).toHaveLength(30);
    expect(ARTIFACT_CATALOG.filter((artifact) => artifact.tier === 3)).toHaveLength(20);
  });

  it("keeps every lineage edge immediate, Affinity-compatible, and acyclic", () => {
    const visited = new Set<ArtifactId>();
    const active = new Set<ArtifactId>();
    const invalidEdges: string[] = [];

    const visit = (artifactId: ArtifactId): void => {
      if (active.has(artifactId)) throw new Error(`Lineage cycle at ${artifactId}`);
      if (visited.has(artifactId)) return;
      active.add(artifactId);
      const artifact = ARTIFACT_DEFINITIONS[artifactId];
      for (const predecessorId of artifact.builtOn) {
        const predecessor = ARTIFACT_DEFINITIONS[predecessorId];
        expect(predecessor, `${artifactId} has unknown predecessor ${predecessorId}`).toBeDefined();
        if (predecessor.tier !== artifact.tier - 1) {
          invalidEdges.push(`${predecessorId}->${artifactId}: non-immediate tier`);
        }
        if (artifact.cost[predecessor.bonusAffinity] <= 0) {
          invalidEdges.push(
            `${predecessorId}->${artifactId}: missing ${predecessor.bonusAffinity} cost`,
          );
        }
        expect(predecessor.leadsToward).toContain(artifactId);
        visit(predecessorId);
      }
      active.delete(artifactId);
      visited.add(artifactId);
    };

    for (const artifact of ARTIFACT_CATALOG) visit(artifact.id);
    expect(invalidEdges).toEqual([]);
  });

  it("gives every Tier I and II Artifact a higher Artifact or exact Project destination", () => {
    const projectComponents = new Set(
      Object.values(BLUEPRINT_DEFINITIONS)
        .flatMap((blueprint) => blueprint.components.map((component) => component.artifactId)),
    );
    const orphans = ARTIFACT_CATALOG
      .filter((artifact) => artifact.tier < 3)
      .filter((artifact) => artifact.leadsToward.length === 0 && !projectComponents.has(artifact.id))
      .map((artifact) => artifact.id);

    expect(orphans).toEqual([]);
  });

  it("keeps Tier III cards bounded and succinct", () => {
    for (const artifact of ARTIFACT_CATALOG.filter((candidate) => candidate.tier === 3)) {
      expect(artifact.engineeringScale).toBe("Galactic");
      expect(artifact.projectLeads.length).toBeGreaterThan(0);
      expect(artifact.projectLeads.length).toBeLessThanOrEqual(2);
      expect(words(`${artifact.practicalCapability} ${artifact.mystery}`)).toBeLessThanOrEqual(30);
    }
  });
});
