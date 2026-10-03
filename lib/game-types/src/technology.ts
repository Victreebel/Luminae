import { TIER_THREE_ARTIFACT_CANON, type ArtifactCanon } from './artifact-canon';
export { TIER_THREE_ARTIFACT_CANON } from './artifact-canon';
import type { ArtifactId } from './artifacts';
import {
  ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID,
  type ArtifactCivilizationCapabilityId,
} from './civilization-capabilities';

export const TECHNOLOGY_LINEAGES = [
  'energy',
  'ecology',
  'causality',
  'transit',
  'memory',
  'infrastructure',
  'concealment',
  'containment',
  'fabrication',
  'accord',
  'reclamation',
  'boundary_science',
] as const;

export type TechnologyLineage = (typeof TECHNOLOGY_LINEAGES)[number];

export const TECHNOLOGY_LINEAGE_LABELS: Record<TechnologyLineage, string> = {
  energy: 'Energy',
  ecology: 'Ecology',
  causality: 'Causality',
  transit: 'Transit',
  memory: 'Memory',
  infrastructure: 'Infrastructure',
  concealment: 'Concealment',
  containment: 'Containment',
  fabrication: 'Fabrication',
  accord: 'Accord',
  reclamation: 'Reclamation',
  boundary_science: 'Boundary Science',
};

export type ArtifactDepictionScale =
  | 'macro'
  | 'tabletop'
  | 'room'
  | 'installation'
  | 'planetary'
  | 'stellar'
  | 'galactic';

export interface ArtifactProjectLead {
  name: string;
  priority: 'primary' | 'secondary';
}

export type TierThreeArtifactCanon = ArtifactCanon;

const LINEAGE_ARTIFACT_IDS = {
  energy: ['t1r01', 't1r03', 't1e03', 't2r01', 't2r02', 't3r01', 't3r03'],
  ecology: ['t1r02', 't1r06', 't1e04', 't1e07', 't1e08', 't1p08', 't2r04', 't2e01', 't2e04', 't2o05', 't3e01', 't3e02', 't3e03'],
  causality: ['t1r04', 't1s05', 't1p05', 't1o08', 't2r05', 't2s03', 't2e02', 't2p05', 't3s04'],
  transit: ['t1s02', 't1r09', 't1s09', 't2r03', 't2s01', 't2s04', 't3s01'],
  memory: ['t1s01', 't1s06', 't1s08', 't2s02', 't2s05', 't2e05', 't3s03'],
  infrastructure: ['t1s04', 't1s07', 't1p06', 't2e06', 't2p04', 't3p03'],
  concealment: ['t1o01', 't1o04', 't1o07', 't1o09', 't2o03', 't3o01', 't3o03'],
  containment: ['t1r05', 't1s03', 't1p02', 't1p04', 't2e03', 't2o02', 't2p01', 't3o02'],
  fabrication: ['t1e01', 't1e05', 't1o05', 't1p01', 't2o04', 't3r04', 't3p02'],
  accord: ['t1r08', 't1p09', 't2p02', 't2p03', 't2p06', 't3s02', 't3e04', 't3p01', 't3p04'],
  reclamation: ['t1r07', 't1e06', 't1o03', 't1o06', 't1e09', 't2r06', 't3r02'],
  boundary_science: ['t1e02', 't1o02', 't1p03', 't1p07', 't2s06', 't2o01', 't2o06', 't3o04'],
} as const satisfies Record<TechnologyLineage, readonly ArtifactId[]>;

export const ARTIFACT_LINEAGE_BY_ID = Object.fromEntries(
  TECHNOLOGY_LINEAGES.flatMap((lineage) => (
    LINEAGE_ARTIFACT_IDS[lineage].map((artifactId) => [artifactId, lineage] as const)
  )),
) as Record<ArtifactId, TechnologyLineage>;

export const ARTIFACT_BUILT_ON = {
  t2r01: ['t1s04', 't1o05', 't1p04'], t2r02: ['t1s04', 't1e06', 't1o06'],
  t2r03: ['t1r01', 't1r07', 't1p04'], t2r04: ['t1r06', 't1e05', 't1p01'],
  t2r05: ['t1s03', 't1o02', 't1p05'], t2r06: ['t1o05', 't1o06', 't1o07'],
  t2s01: ['t1r04', 't1e01', 't1p02'], t2s02: ['t1r03', 't1o08', 't1p03'],
  t2s03: ['t1s05', 't1s07', 't1p05'], t2s04: ['t1e07', 't1e08', 't1p06'],
  t2s05: ['t1r03', 't1r08'], t2s06: ['t1r04', 't1o07', 't1p03'],
  t2e01: ['t1r06', 't1s06', 't1p01'], t2e02: ['t1r03', 't1s08', 't1o01'],
  t2e03: ['t1e02', 't1e08', 't1o03'], t2e04: ['t1s06', 't1o04', 't1p06'],
  t2e05: ['t1s01', 't1s06', 't1s08'], t2e06: ['t1r06', 't1o05', 't1p08'],
  t2o01: ['t1s01', 't1e02', 't1p07'], t2o02: ['t1r08', 't1e06', 't1p03'],
  t2o03: ['t1r07', 't1o02'], t2o04: ['t1r02', 't1e03', 't1p08'],
  t2o05: ['t1e04', 't1e06', 't1e08'], t2o06: ['t1r04', 't1s01', 't1p02'],
  t2p01: ['t1r05', 't1s04', 't1o07'], t2p02: ['t1s03', 't1e05', 't1o08'],
  t2p03: ['t1e01', 't1e07', 't1p06'], t2p04: ['t1r01', 't1s04', 't1p03'],
  t2p05: ['t1p01', 't1p05', 't1p06'], t2p06: ['t1s06', 't1e04', 't1o02'],
  t3r01: ['t2r05', 't2o03', 't2p01'], t3r02: ['t2e05', 't2o04', 't2p03'],
  t3r03: ['t2s02', 't2o06', 't2p04'], t3r04: ['t2e01', 't2o04', 't2p06'],
  t3s01: ['t2r03', 't2s02', 't2p05'], t3s02: ['t2r05', 't2s03', 't2o02'],
  t3s03: ['t2e05', 't2o04'], t3s04: ['t2r05', 't2s05', 't2p06'],
  t3e01: ['t2s04', 't2e04', 't2p03'], t3e02: ['t2r04', 't2s02', 't2o03'],
  t3e03: ['t2s05', 't2o05', 't2p01'], t3e04: ['t2r02', 't2s04', 't2e04'],
  t3o01: ['t2s04', 't2e02', 't2o05'], t3o02: ['t2s03', 't2e03', 't2p01'],
  t3o03: ['t2r06', 't2e04', 't2p05'], t3o04: ['t2s06', 't2o06', 't2o01'],
  t3p01: ['t2r05', 't2e04', 't2o02'], t3p02: ['t2r01', 't2e06', 't2p05'],
  t3p03: ['t2r06', 't2e01', 't2p05'], t3p04: ['t2s05', 't2o02', 't2p03'],
} as const satisfies Partial<Record<ArtifactId, readonly ArtifactId[]>>;

const leadsToward = Object.fromEntries(
  Object.keys(ARTIFACT_LINEAGE_BY_ID).map((artifactId) => [artifactId, [] as ArtifactId[]]),
) as Record<ArtifactId, ArtifactId[]>;

for (const [targetId, predecessors] of Object.entries(ARTIFACT_BUILT_ON) as Array<[
  ArtifactId,
  readonly ArtifactId[],
]>) {
  for (const predecessorId of predecessors) leadsToward[predecessorId].push(targetId);
}

export const ARTIFACT_LEADS_TOWARD: Readonly<Record<ArtifactId, readonly ArtifactId[]>> = leadsToward;

/** Artwork-subject scale, independent from Artifact tier, engineering reach, or scene maturity. */
export const ARTIFACT_DEPICTION_SCALE_BY_ID = {
  t1r01: 'macro', t1r02: 'macro', t1r03: 'tabletop', t1r04: 'tabletop',
  t1r05: 'tabletop', t1r06: 'macro', t1r07: 'tabletop', t1r08: 'tabletop',
  t1s01: 'macro', t1s02: 'room', t1s03: 'tabletop', t1s04: 'tabletop',
  t1s05: 'macro', t1s06: 'tabletop', t1s07: 'tabletop', t1s08: 'macro',
  t1e01: 'macro', t1e02: 'tabletop', t1e03: 'macro', t1e04: 'tabletop',
  t1e05: 'macro', t1e06: 'macro', t1e07: 'macro', t1e08: 'tabletop',
  t1o01: 'tabletop', t1o02: 'tabletop', t1o03: 'room', t1o04: 'macro',
  t1o05: 'tabletop', t1o06: 'macro', t1o07: 'macro', t1o08: 'tabletop',
  t1p01: 'macro', t1p02: 'macro', t1p03: 'tabletop', t1p04: 'tabletop',
  t1p05: 'tabletop', t1p06: 'macro', t1p07: 'tabletop', t1p08: 'tabletop',
  t1r09: 'room', t1s09: 'room', t1e09: 'room', t1o09: 'room', t1p09: 'room',
  t2r01: 'room', t2r02: "installation", t2r03: 'room', t2r04: "stellar",
  t2r05: "installation", t2r06: "installation", t2s01: "installation", t2s02: 'macro',
  t2s03: "installation", t2s04: "installation", t2s05: 'tabletop', t2s06: "installation",
  t2e01: "installation", t2e02: 'macro', t2e03: "installation", t2e04: 'tabletop',
  t2e05: "installation", t2e06: "installation", t2o01: "installation", t2o02: "installation",
  t2o03: "installation", t2o04: "installation", t2o05: "installation", t2o06: "installation",
  t2p01: "installation", t2p02: "installation", t2p03: 'macro', t2p04: 'macro',
  t2p05: 'room', t2p06: 'tabletop',
  t3r01: "stellar", t3r02: 'stellar', t3r03: 'stellar', t3r04: 'stellar',
  t3s01: 'stellar', t3s02: 'planetary', t3s03: 'stellar', t3s04: 'stellar',
  t3e01: 'stellar', t3e02: "stellar", t3e03: 'planetary', t3e04: 'planetary',
  t3o01: 'planetary', t3o02: 'stellar', t3o03: 'stellar', t3o04: 'stellar',
  t3p01: 'planetary', t3p02: 'installation', t3p03: 'stellar', t3p04: 'planetary',
} as const satisfies Record<ArtifactId, ArtifactDepictionScale>;

export interface ArtifactTechnologyMetadata {
  lineage: TechnologyLineage;
  builtOn: readonly ArtifactId[];
  leadsToward: readonly ArtifactId[];
  depictionScale: ArtifactDepictionScale;
  capabilityIds: readonly ArtifactCivilizationCapabilityId[];
  projectLeads: readonly ArtifactProjectLead[];
  artStatus: 'current' | 'requires_regeneration';
}

const builtOnById: Partial<Record<ArtifactId, readonly ArtifactId[]>> = ARTIFACT_BUILT_ON;
const tierThreeCanonById: Partial<Record<ArtifactId, TierThreeArtifactCanon>> =
  TIER_THREE_ARTIFACT_CANON;

export const ARTIFACT_TECHNOLOGY_METADATA_BY_ID = Object.fromEntries(
  (Object.keys(ARTIFACT_LINEAGE_BY_ID) as ArtifactId[]).map((artifactId) => [
    artifactId,
    {
      lineage: ARTIFACT_LINEAGE_BY_ID[artifactId],
      builtOn: builtOnById[artifactId] ?? [],
      leadsToward: ARTIFACT_LEADS_TOWARD[artifactId],
      depictionScale: ARTIFACT_DEPICTION_SCALE_BY_ID[artifactId],
      capabilityIds: ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID[artifactId],
      projectLeads: tierThreeCanonById[artifactId]?.projectLeads ?? [],
      artStatus: 'current',
    } satisfies ArtifactTechnologyMetadata,
  ]),
) as unknown as Record<ArtifactId, ArtifactTechnologyMetadata>;
