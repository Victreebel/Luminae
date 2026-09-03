import type { AffinityCounts, StandardAffinityKey } from './index';

export interface ArtifactDefinition<Id extends string = string> {
  id: Id;
  tier: 1 | 2 | 3;
  bonusAffinity: StandardAffinityKey;
  eminence: number;
  cost: AffinityCounts;
}

type NaturalAffinityCost = readonly [
  flare: number,
  continuum: number,
  verdance: number,
  abyss: number,
  radiance: number,
];

function artifact<const Id extends string>(
  id: Id,
  tier: 1 | 2 | 3,
  bonusAffinity: StandardAffinityKey,
  eminence: number,
  [flare, continuum, verdance, abyss, radiance]: NaturalAffinityCost,
): ArtifactDefinition<Id> {
  return {
    id,
    tier,
    bonusAffinity,
    eminence,
    cost: { flare, continuum, verdance, abyss, radiance, singularity: 0 },
  };
}

/**
 * Authoritative mechanical Artifact catalog shared by server and clients.
 * Names and lore remain in their canonical content registry; this table owns
 * only balance-tested IDs, tiers, costs, bonuses, and Eminence.
 */
export const ARTIFACT_CATALOG = [
  artifact('t1r01', 1, 'flare', 0, [0, 0, 1, 1, 1]),
  artifact('t1r02', 1, 'flare', 0, [0, 0, 1, 2, 0]),
  artifact('t1r03', 1, 'flare', 0, [0, 1, 1, 0, 1]),
  artifact('t1r04', 1, 'flare', 0, [0, 2, 0, 0, 0]),
  artifact('t1r05', 1, 'flare', 0, [0, 0, 0, 2, 2]),
  artifact('t1r06', 1, 'flare', 0, [0, 2, 1, 0, 0]),
  artifact('t1r07', 1, 'flare', 0, [0, 0, 2, 2, 0]),
  artifact('t1r08', 1, 'flare', 1, [0, 0, 0, 0, 4]),
  artifact('t1s01', 1, 'continuum', 0, [1, 0, 1, 0, 1]),
  artifact('t1s02', 1, 'continuum', 0, [2, 0, 1, 0, 0]),
  artifact('t1s03', 1, 'continuum', 0, [1, 0, 0, 1, 1]),
  artifact('t1s04', 1, 'continuum', 0, [1, 0, 0, 0, 2]),
  artifact('t1s05', 1, 'continuum', 0, [0, 0, 0, 2, 2]),
  artifact('t1s06', 1, 'continuum', 0, [1, 0, 2, 0, 0]),
  artifact('t1s07', 1, 'continuum', 0, [2, 0, 0, 2, 0]),
  artifact('t1s08', 1, 'continuum', 1, [0, 0, 4, 0, 0]),
  artifact('t1e01', 1, 'verdance', 0, [1, 1, 0, 0, 1]),
  artifact('t1e02', 1, 'verdance', 0, [0, 2, 0, 1, 0]),
  artifact('t1e03', 1, 'verdance', 0, [1, 1, 0, 1, 0]),
  artifact('t1e04', 1, 'verdance', 0, [0, 3, 0, 0, 0]),
  artifact('t1e05', 1, 'verdance', 0, [2, 0, 0, 0, 2]),
  artifact('t1e06', 1, 'verdance', 0, [0, 1, 0, 1, 2]),
  artifact('t1e07', 1, 'verdance', 0, [0, 0, 0, 2, 1]),
  artifact('t1e08', 1, 'verdance', 1, [0, 0, 0, 4, 0]),
  artifact('t1o01', 1, 'abyss', 0, [0, 1, 1, 0, 1]),
  artifact('t1o02', 1, 'abyss', 0, [0, 1, 0, 0, 2]),
  artifact('t1o03', 1, 'abyss', 0, [1, 0, 1, 0, 1]),
  artifact('t1o04', 1, 'abyss', 0, [0, 0, 2, 1, 0]),
  artifact('t1o05', 1, 'abyss', 0, [2, 1, 0, 0, 0]),
  artifact('t1o06', 1, 'abyss', 0, [0, 2, 2, 0, 0]),
  artifact('t1o07', 1, 'abyss', 0, [1, 0, 0, 1, 2]),
  artifact('t1o08', 1, 'abyss', 1, [0, 4, 0, 0, 0]),
  artifact('t1p01', 1, 'radiance', 0, [1, 1, 0, 1, 0]),
  artifact('t1p02', 1, 'radiance', 0, [0, 1, 0, 2, 0]),
  artifact('t1p03', 1, 'radiance', 0, [1, 0, 1, 1, 0]),
  artifact('t1p04', 1, 'radiance', 0, [2, 0, 0, 0, 1]),
  artifact('t1p05', 1, 'radiance', 0, [0, 2, 0, 0, 2]),
  artifact('t1p06', 1, 'radiance', 0, [1, 0, 1, 0, 2]),
  artifact('t1p07', 1, 'radiance', 0, [0, 0, 1, 2, 1]),
  artifact('t1p08', 1, 'radiance', 1, [0, 0, 4, 0, 0]),
  artifact('t2r01', 2, 'flare', 1, [0, 2, 0, 3, 2]),
  artifact('t2r02', 2, 'flare', 2, [0, 1, 4, 2, 0]),
  artifact('t2r03', 2, 'flare', 2, [3, 0, 0, 0, 3]),
  artifact('t2r04', 2, 'flare', 1, [2, 0, 2, 0, 2]),
  artifact('t2r05', 2, 'flare', 2, [0, 3, 0, 2, 2]),
  artifact('t2r06', 2, 'flare', 2, [0, 0, 0, 5, 0]),
  artifact('t2s01', 2, 'continuum', 1, [2, 0, 3, 0, 2]),
  artifact('t2s02', 2, 'continuum', 2, [4, 0, 0, 2, 1]),
  artifact('t2s03', 2, 'continuum', 2, [0, 3, 0, 0, 3]),
  artifact('t2s04', 2, 'continuum', 1, [0, 0, 2, 0, 3]),
  artifact('t2s05', 2, 'continuum', 2, [5, 0, 0, 0, 0]),
  artifact('t2s06', 2, 'continuum', 2, [2, 0, 0, 3, 2]),
  artifact('t2e01', 2, 'verdance', 1, [3, 2, 0, 0, 2]),
  artifact('t2e02', 2, 'verdance', 2, [2, 4, 0, 1, 0]),
  artifact('t2e03', 2, 'verdance', 2, [0, 0, 3, 3, 0]),
  artifact('t2e04', 2, 'verdance', 1, [0, 2, 0, 2, 2]),
  artifact('t2e05', 2, 'verdance', 2, [0, 5, 0, 0, 0]),
  artifact('t2e06', 2, 'verdance', 2, [2, 0, 0, 2, 3]),
  artifact('t2o01', 2, 'abyss', 1, [0, 2, 2, 0, 3]),
  artifact('t2o02', 2, 'abyss', 2, [1, 0, 2, 0, 4]),
  artifact('t2o03', 2, 'abyss', 2, [3, 0, 0, 3, 0]),
  artifact('t2o04', 2, 'abyss', 1, [2, 0, 3, 0, 2]),
  artifact('t2o05', 2, 'abyss', 2, [0, 0, 5, 0, 0]),
  artifact('t2o06', 2, 'abyss', 2, [2, 3, 0, 0, 2]),
  artifact('t2p01', 2, 'radiance', 1, [2, 3, 0, 2, 0]),
  artifact('t2p02', 2, 'radiance', 2, [0, 2, 1, 4, 0]),
  artifact('t2p03', 2, 'radiance', 2, [0, 0, 3, 0, 3]),
  artifact('t2p04', 2, 'radiance', 1, [3, 2, 0, 0, 2]),
  artifact('t2p05', 2, 'radiance', 2, [0, 0, 0, 0, 5]),
  artifact('t2p06', 2, 'radiance', 2, [0, 2, 3, 2, 0]),
  artifact('t3r01', 3, 'flare', 3, [3, 0, 0, 5, 3]),
  artifact('t3r02', 3, 'flare', 4, [0, 0, 3, 6, 3]),
  artifact('t3r03', 3, 'flare', 3, [0, 5, 0, 3, 3]),
  artifact('t3r04', 3, 'flare', 5, [0, 0, 7, 3, 3]),
  artifact('t3s01', 3, 'continuum', 3, [5, 3, 0, 0, 3]),
  artifact('t3s02', 3, 'continuum', 4, [6, 3, 0, 3, 0]),
  artifact('t3s03', 3, 'continuum', 3, [3, 0, 5, 3, 0]),
  artifact('t3s04', 3, 'continuum', 5, [3, 7, 0, 0, 3]),
  artifact('t3e01', 3, 'verdance', 3, [0, 5, 3, 0, 3]),
  artifact('t3e02', 3, 'verdance', 4, [3, 6, 0, 3, 0]),
  artifact('t3e03', 3, 'verdance', 3, [0, 3, 0, 5, 3]),
  artifact('t3e04', 3, 'verdance', 5, [3, 3, 7, 0, 0]),
  artifact('t3o01', 3, 'abyss', 3, [0, 3, 5, 3, 0]),
  artifact('t3o02', 3, 'abyss', 4, [0, 3, 6, 0, 3]),
  artifact('t3o03', 3, 'abyss', 3, [3, 0, 3, 0, 5]),
  artifact('t3o04', 3, 'abyss', 5, [0, 3, 3, 7, 0]),
  artifact('t3p01', 3, 'radiance', 3, [3, 0, 3, 5, 0]),
  artifact('t3p02', 3, 'radiance', 4, [3, 0, 3, 0, 6]),
  artifact('t3p03', 3, 'radiance', 3, [5, 0, 3, 0, 3]),
  artifact('t3p04', 3, 'radiance', 5, [0, 3, 0, 3, 7]),
] as const;

export type ArtifactId = (typeof ARTIFACT_CATALOG)[number]['id'];

export const ARTIFACT_DEFINITION_BY_ID: Readonly<Record<ArtifactId, ArtifactDefinition<ArtifactId>>> =
  Object.fromEntries(
    ARTIFACT_CATALOG.map((definition) => [definition.id, definition]),
  ) as Record<ArtifactId, ArtifactDefinition<ArtifactId>>;
