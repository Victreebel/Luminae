import type { ArtifactId } from './artifacts';

/**
 * Canonical public Function (Capability) tags, shared by every Artifact inspector.
 * Tags describe an Artifact's services, independently of Affinity, tier, physical
 * placement, and implementation state. Damage suspends operation, not identity.
 *
 * Existing Event, Chronicle, and Maturity policies retain their versioned detailed
 * rules until migrated. These tags alone never grant immunity or change a recipe.
 */
export const ARTIFACT_FUNCTION_TAGS_VERSION = 'artifact-functions-v2' as const;

export const ARTIFACT_FUNCTION_DEFINITIONS = [
  { id: 'function:energy', label: 'Energy', description: 'Produces, stores, converts, or delivers energy, or manages waste heat.' },
  { id: 'function:materials', label: 'Materials', description: 'Extracts, reclaims, engineers, or fabricates useful matter.' },
  { id: 'function:mobility', label: 'Mobility', description: 'Transports cargo, populations, or habitats, or establishes their routes.' },
  { id: 'function:ecology', label: 'Ecology', description: 'Sustains, restores, adapts, or manages living systems and habitats.' },
  { id: 'function:information', label: 'Information', description: 'Observes, computes, interprets, verifies, preserves, or reconstructs knowledge.' },
  { id: 'function:coordination', label: 'Coordination', description: 'Organizes timing, shared work, services, resource agreements, or institutions.' },
  { id: 'function:protection', label: 'Protection', description: 'Stabilizes systems, contains hazards, isolates failures, or restores safe operation.' },
  { id: 'function:security', label: 'Security', description: 'Conceals signatures or protects access, custody, and authenticated exchange.' },
] as const;

export type ArtifactFunctionDefinition = (typeof ARTIFACT_FUNCTION_DEFINITIONS)[number];
export type ArtifactFunctionId = ArtifactFunctionDefinition['id'];

export const ARTIFACT_FUNCTION_BY_ID = Object.fromEntries(
  ARTIFACT_FUNCTION_DEFINITIONS.map((definition) => [definition.id, definition]),
) as Readonly<Record<ArtifactFunctionId, ArtifactFunctionDefinition>>;

/** Explicit authored assignments; never infer tags from names, color, or lore keywords. */
export const ARTIFACT_FUNCTIONS_BY_ID = {
  t1r01: ['function:energy'],
  t1r02: ['function:ecology'],
  t1r03: ['function:energy'],
  t1r04: ['function:energy', 'function:protection'],
  t1r05: ['function:energy', 'function:protection'],
  t1r06: ['function:energy'],
  t1r07: ['function:energy'],
  t1r08: ['function:energy', 'function:information'],
  t1r09: ['function:mobility', 'function:coordination'],
  t1s01: ['function:information'],
  t1s02: ['function:mobility'],
  t1s03: ['function:protection'],
  t1s04: ['function:materials', 'function:coordination'],
  t1s05: ['function:information', 'function:protection'],
  t1s06: ['function:information'],
  t1s07: ['function:materials'],
  t1s08: ['function:information', 'function:security'],
  t1s09: ['function:mobility', 'function:coordination'],
  t1e01: ['function:ecology'],
  t1e02: ['function:materials'],
  t1e03: ['function:ecology', 'function:information'],
  t1e04: ['function:ecology'],
  t1e05: ['function:materials'],
  t1e06: ['function:materials', 'function:ecology'],
  t1e07: ['function:materials', 'function:ecology'],
  t1e08: ['function:ecology'],
  t1e09: ['function:ecology', 'function:materials'],
  t1o01: ['function:security'],
  t1o02: ['function:information'],
  t1o03: ['function:information'],
  t1o04: ['function:security'],
  t1o05: ['function:materials'],
  t1o06: ['function:materials', 'function:ecology'],
  t1o07: ['function:materials', 'function:information'],
  t1o08: ['function:information', 'function:security'],
  t1o09: ['function:security', 'function:coordination'],
  t1p01: ['function:protection'],
  t1p02: ['function:protection'],
  t1p03: ['function:information'],
  t1p04: ['function:protection'],
  t1p05: ['function:information'],
  t1p06: ['function:protection', 'function:coordination'],
  t1p07: ['function:information'],
  t1p08: ['function:information'],
  t1p09: ['function:coordination', 'function:ecology'],
  t2r01: ['function:materials'],
  t2r02: ['function:energy', 'function:protection'],
  t2r03: ['function:materials', 'function:protection'],
  t2r04: ['function:energy', 'function:ecology'],
  t2r05: ['function:energy', 'function:protection'],
  t2r06: ['function:energy'],
  t2s01: ['function:mobility', 'function:information'],
  t2s02: ['function:information'],
  t2s03: ['function:information'],
  t2s04: ['function:mobility', 'function:coordination'],
  t2s05: ['function:information', 'function:coordination'],
  t2s06: ['function:information'],
  t2e01: ['function:ecology', 'function:protection'],
  t2e02: ['function:ecology', 'function:coordination'],
  t2e03: ['function:ecology', 'function:protection'],
  t2e04: ['function:ecology', 'function:coordination'],
  t2e05: ['function:information'],
  t2e06: ['function:ecology', 'function:materials'],
  t2o01: ['function:materials', 'function:protection'],
  t2o02: ['function:protection', 'function:security'],
  t2o03: ['function:energy', 'function:security'],
  t2o04: ['function:materials'],
  t2o05: ['function:ecology', 'function:protection'],
  t2o06: ['function:information'],
  t2p01: ['function:protection'],
  t2p02: ['function:information', 'function:coordination'],
  t2p03: ['function:ecology', 'function:coordination'],
  t2p04: ['function:energy', 'function:coordination'],
  t2p05: ['function:protection', 'function:coordination'],
  t2p06: ['function:energy', 'function:coordination'],
  t3r01: ['function:energy', 'function:mobility'],
  t3r02: ['function:materials', 'function:protection'],
  t3r03: ['function:energy', 'function:coordination'],
  t3r04: ['function:materials', 'function:mobility'],
  t3s01: ['function:mobility', 'function:coordination'],
  t3s02: ['function:information', 'function:coordination'],
  t3s03: ['function:information'],
  t3s04: ['function:information', 'function:coordination'],
  t3e01: ['function:ecology', 'function:mobility'],
  t3e02: ['function:ecology', 'function:mobility'],
  t3e03: ['function:ecology', 'function:materials'],
  t3e04: ['function:ecology', 'function:protection'],
  t3o01: ['function:ecology', 'function:protection'],
  t3o02: ['function:protection'],
  t3o03: ['function:security', 'function:coordination'],
  t3o04: ['function:information'],
  t3p01: ['function:coordination', 'function:information'],
  t3p02: ['function:materials', 'function:information'],
  t3p03: ['function:information', 'function:coordination'],
  t3p04: ['function:information', 'function:security'],
} as const satisfies Record<ArtifactId, readonly [ArtifactFunctionId] | readonly [ArtifactFunctionId, ArtifactFunctionId]>;

/** Redacted, unknown, and non-Artifact IDs have no public function identity. */
export function getArtifactFunctionTags(artifactId: string): readonly ArtifactFunctionDefinition[] {
  if (!Object.hasOwn(ARTIFACT_FUNCTIONS_BY_ID, artifactId)) return [];
  return ARTIFACT_FUNCTIONS_BY_ID[artifactId as ArtifactId]
    .map((id) => ARTIFACT_FUNCTION_BY_ID[id]);
}

export function artifactHasFunctionTag(artifactId: string, functionId: ArtifactFunctionId): boolean {
  return getArtifactFunctionTags(artifactId).some((tag) => tag.id === functionId);
}
