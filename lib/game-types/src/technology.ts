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

export interface TierThreeArtifactCanon {
  name: string;
  practicalCapability: string;
  mystery: string;
  forms: readonly string[];
  blueprintRole: string;
  blueprintFamilies: string;
  projectLeads: readonly ArtifactProjectLead[];
}

function projectLeads(primary: string, secondary: string): ArtifactProjectLead[] {
  return [
    { name: primary, priority: 'primary' },
    { name: secondary, priority: 'secondary' },
  ];
}

/** Technology v2 bounded-keystone canon. The displaced v1 Project art is not canonical card art. */
export const TIER_THREE_ARTIFACT_CANON = {
  t3r01: {
    name: 'Relicfire Interpreter',
    practicalCapability: 'Translates alien ignition systems into safe startup sequences.',
    mystery: 'One extinct lineage asks whether the star consents.',
    forms: ['Interpreter', 'Stellar Control System'],
    blueprintRole: 'safe alien stellar ignition',
    blueprintFamilies: 'Ignition Reliquary; Relic Forge Commons',
    projectLeads: projectLeads('Ignition Reliquary', 'Relic Forge Commons'),
  },
  t3r02: {
    name: 'Terminal-System Reclaimer',
    practicalCapability: 'Recovers useful matter and energy from dead systems without spreading their failure.',
    mystery: 'Some recovered elements have no known origin.',
    forms: ['Recovery System', 'Failure Archive'],
    blueprintRole: 'safe terminal-system reclamation',
    blueprintFamilies: 'Extinction Furnace; Interstellar Necrobiome',
    projectLeads: projectLeads('Extinction Furnace', 'Interstellar Necrobiome'),
  },
  t3r03: {
    name: 'Chronoflare Phase Regulator',
    practicalCapability: 'Synchronizes relativistic stellar events without forcing one universal clock.',
    mystery: 'Its final phase arrives before calibration.',
    forms: ['Phase Regulator', 'Stellar Timing System'],
    blueprintRole: 'relativistic stellar-energy coordination',
    blueprintFamilies: 'Chronoflare Array; Chronology Accord',
    projectLeads: projectLeads('Chronoflare Array', 'Chronology Accord'),
  },
  t3r04: {
    name: 'Plural Habitat Forge Heart',
    practicalCapability: 'Fabricates habitat cores compatible with unrelated forms of life.',
    mystery: 'One chamber prepares for an absent species.',
    forms: ['Fabrication Core', 'Habitat Interface'],
    blueprintRole: 'alien-compatible habitat fabrication',
    blueprintFamilies: 'Star-River Crucible; Stellar Overgrowth',
    projectLeads: projectLeads('Star-River Crucible', 'Stellar Overgrowth'),
  },
  t3s01: {
    name: 'Voidline Route Solver',
    practicalCapability: 'Computes traversable paths through regions where ordinary navigation fails.',
    mystery: 'It returns routes from places never surveyed.',
    forms: ['Route Computer', 'Distributed Observatory'],
    blueprintRole: 'stable interstellar route derivation',
    blueprintFamilies: 'Wormgate Spine; Dark-Sector Aperture',
    projectLeads: projectLeads('Wormgate Spine', 'Dark-Sector Aperture'),
  },
  t3s02: {
    name: 'Divergence Reconciler',
    practicalCapability: 'Reconciles incompatible civic records without erasing their differences.',
    mystery: 'It preserves a decision nobody remembers making.',
    forms: ['Civic Protocol', 'Continuity Engine'],
    blueprintRole: 'plural historical reconciliation',
    blueprintFamilies: 'Recursive Commonwealth; Causality Audit Court',
    projectLeads: projectLeads('Recursive Commonwealth', 'Causality Audit Court'),
  },
  t3s03: {
    name: 'Extinction Signal Decoder',
    practicalCapability: 'Recovers meaning from signals made by vanished civilizations.',
    mystery: 'A few decoded messages receive new replies.',
    forms: ['Signal Decoder', 'Cultural Archive'],
    blueprintRole: 'extinct-civilization interpretation',
    blueprintFamilies: 'Extinction Archive; Interstellar Necrobiome',
    projectLeads: projectLeads('Extinction Archive', 'Interstellar Necrobiome'),
  },
  t3s04: {
    name: 'Relativistic Chronology Governor',
    practicalCapability: 'Lets distant systems share an ordered history across unequal clocks.',
    mystery: 'Several valid dates insist they came first.',
    forms: ['Chronology Instrument', 'Civic Protocol'],
    blueprintRole: 'relativistic historical ordering',
    blueprintFamilies: 'Chronology Accord; Causality Audit Court',
    projectLeads: projectLeads('Chronology Accord', 'Causality Audit Court'),
  },
  t3e01: {
    name: 'Xenobiome Route Graft',
    practicalCapability: 'Carries living material safely between incompatible ecologies.',
    mystery: 'Some grafts grow toward worlds not on any chart.',
    forms: ['Biotech Graft', 'Transit Ecology'],
    blueprintRole: 'noninvasive biosphere transit',
    blueprintFamilies: 'Worldroot Lattice; Biosphere Concordance',
    projectLeads: projectLeads('Worldroot Lattice', 'Biosphere Concordance'),
  },
  t3e02: {
    name: 'Stellar Habitat Genome',
    practicalCapability: 'Encodes habitats that adapt to different stars without becoming identical.',
    mystery: 'A dormant genome names a star not yet born.',
    forms: ['Engineered Genome', 'Habitat Seed'],
    blueprintRole: 'star-adaptive living infrastructure',
    blueprintFamilies: 'Stellar Overgrowth; Star-River Crucible',
    projectLeads: projectLeads('Stellar Overgrowth', 'Star-River Crucible'),
  },
  t3e03: {
    name: 'Extinction Immunome',
    practicalCapability: 'Teaches living systems to survive failure patterns recovered from dead worlds.',
    mystery: 'It remembers an extinction that has not happened.',
    forms: ['Biological Archive', 'Immunity System'],
    blueprintRole: 'cross-world extinction resistance',
    blueprintFamilies: 'Interstellar Necrobiome; Cryptobiotic Constellation',
    projectLeads: projectLeads('Interstellar Necrobiome', 'Cryptobiotic Constellation'),
  },
  t3e04: {
    name: 'Biosphere Translation Membrane',
    practicalCapability: 'Exchanges matter between alien ecologies without allowing either to consume the other.',
    mystery: 'Contact changes a third ecology no sensor can find.',
    forms: ['Living Interface', 'Ecological Protocol'],
    blueprintRole: 'plural biosphere exchange',
    blueprintFamilies: 'Biosphere Concordance; Galactic Concordance',
    projectLeads: projectLeads('Biosphere Concordance', 'Galactic Concordance'),
  },
  t3o01: {
    name: 'Refuge Dormancy Kernel',
    practicalCapability: 'Preserves a complete refuge biosphere through geological catastrophe.',
    mystery: 'Its waking signal comes from outside the map.',
    forms: ['Dormancy Kernel', 'Biosphere Reserve'],
    blueprintRole: 'hidden deep-time biosphere preservation',
    blueprintFamilies: 'Cryptobiotic Constellation; Worldroot Lattice',
    projectLeads: projectLeads('Cryptobiotic Constellation', 'Worldroot Lattice'),
  },
  t3o02: {
    name: 'Collapse Forecast Engine',
    practicalCapability: 'Predicts cascading physical, ecological, and civic failure.',
    mystery: 'Its safest branch contains no observers.',
    forms: ['Forecast Engine', 'Distributed Sensor'],
    blueprintRole: 'multi-system collapse forecasting',
    blueprintFamilies: 'Collapse Mandala; Causality Audit Court',
    projectLeads: projectLeads('Collapse Mandala', 'Causality Audit Court'),
  },
  t3o03: {
    name: 'Quiet-Signal Symbiont',
    practicalCapability: "Carries authenticated communication without revealing the sender's location.",
    mystery: 'Some replies originate inside the organism.',
    forms: ['Signal Symbiont', 'Concealment Protocol'],
    blueprintRole: 'authenticated covert communication',
    blueprintFamilies: 'Ordered Silence; Cryptobiotic Constellation',
    projectLeads: projectLeads('Ordered Silence', 'Cryptobiotic Constellation'),
  },
  t3o04: {
    name: 'Null-Baseline Interferometer',
    practicalCapability: 'Distinguishes true absence from insufficient observation.',
    mystery: 'Occasionally the absence observes back.',
    forms: ['Interferometer', 'Boundary Observatory'],
    blueprintRole: 'distributed dark-sector observation',
    blueprintFamilies: 'Dark-Sector Aperture; Collapse Mandala',
    projectLeads: projectLeads('Dark-Sector Aperture', 'Collapse Mandala'),
  },
  t3p01: {
    name: 'Plurality Accord Verifier',
    practicalCapability: 'Tests whether unlike minds have given authentic consent.',
    mystery: 'One channel answers before it is queried.',
    forms: ['Verification System', 'Civic Protocol'],
    blueprintRole: 'cross-species consent verification',
    blueprintFamilies: 'Galactic Concordance; Biosphere Concordance',
    projectLeads: projectLeads('Galactic Concordance', 'Biosphere Concordance'),
  },
  t3p02: {
    name: 'Relic Provenance Standard',
    practicalCapability: 'Verifies the material and procedural history of civilization-changing fabrication.',
    mystery: 'Every complete chain contains the same blank step.',
    forms: ['Manufacturing Standard', 'Verification Protocol'],
    blueprintRole: 'accountable impossible manufacture',
    blueprintFamilies: 'Relic Forge Commons; Star-River Crucible',
    projectLeads: projectLeads('Relic Forge Commons', 'Star-River Crucible'),
  },
  t3p03: {
    name: 'Federated Logic Substrate',
    practicalCapability: 'Lets star-scale minds exchange proofs without merging identities.',
    mystery: 'A proof remembers a thinker who never joined.',
    forms: ['Computation Substrate', 'Identity Protocol'],
    blueprintRole: 'plural star-scale computation',
    blueprintFamilies: 'Matrioshka Chorus; Stellar Overgrowth',
    projectLeads: projectLeads('Matrioshka Chorus', 'Stellar Overgrowth'),
  },
  t3p04: {
    name: 'Species-Rights Witness',
    practicalCapability: 'Records identity and harm in forms unrelated species can verify.',
    mystery: 'A sealed channel records an unlocatable witness.',
    forms: ['Witness Instrument', 'Rights Protocol'],
    blueprintRole: 'cross-species evidence verification',
    blueprintFamilies: 'Witness Constellation; Galactic Concordance',
    projectLeads: projectLeads('Witness Constellation', 'Galactic Concordance'),
  },
} as const satisfies Partial<Record<ArtifactId, TierThreeArtifactCanon>>;

const LINEAGE_ARTIFACT_IDS = {
  energy: ['t1r01', 't1r03', 't1e03', 't2r01', 't2r02', 't3r01', 't3r03'],
  ecology: ['t1r02', 't1r06', 't1e04', 't1e07', 't1e08', 't1p08', 't2r04', 't2e01', 't2e04', 't2o05', 't3e01', 't3e02', 't3e03'],
  causality: ['t1r04', 't1s05', 't1p05', 't1o08', 't2r05', 't2s03', 't2e02', 't2p05', 't3s04'],
  transit: ['t1s02', 't2r03', 't2s04', 't3s01'],
  memory: ['t1s01', 't1s06', 't1s08', 't2s02', 't2s05', 't2e05', 't3s03'],
  infrastructure: ['t1s04', 't1s07', 't1p06', 't2e06', 't2p04', 't3p03'],
  concealment: ['t1o01', 't1o04', 't1o07', 't2o02', 't3o01', 't3o03'],
  containment: ['t1r05', 't1s03', 't1p02', 't1p04', 't2e03', 't2p01', 't3o02'],
  fabrication: ['t1e01', 't1e05', 't1o05', 't1p01', 't2o04', 't3r04', 't3p02'],
  accord: ['t1r08', 't2s06', 't2p02', 't2p03', 't2p06', 't3s02', 't3e04', 't3p01', 't3p04'],
  reclamation: ['t1r07', 't1e06', 't1o03', 't1o06', 't2r06', 't2o03', 't3r02'],
  boundary_science: ['t1e02', 't1o02', 't1p03', 't1p07', 't2s01', 't2o01', 't2o06', 't3o04'],
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
  t3s01: ['t2r03', 't2s01', 't2p05'], t3s02: ['t2r05', 't2s03', 't2o02'],
  t3s03: ['t2r02', 't2e05', 't2o04'], t3s04: ['t2r05', 't2s05', 't2p06'],
  t3e01: ['t2s01', 't2e04', 't2p03'], t3e02: ['t2r04', 't2s02', 't2o03'],
  t3e03: ['t2s05', 't2o05', 't2p01'], t3e04: ['t2r02', 't2s04', 't2e04'],
  t3o01: ['t2s04', 't2e02', 't2o05'], t3o02: ['t2s03', 't2e05', 't2p02'],
  t3o03: ['t2r06', 't2e04', 't2p05'], t3o04: ['t2s06', 't2e03', 't2o01'],
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
  t2r01: 'room', t2r02: 'tabletop', t2r03: 'room', t2r04: 'tabletop',
  t2r05: 'macro', t2r06: 'room', t2s01: 'macro', t2s02: 'macro',
  t2s03: 'room', t2s04: 'tabletop', t2s05: 'tabletop', t2s06: 'room',
  t2e01: 'macro', t2e02: 'macro', t2e03: 'tabletop', t2e04: 'tabletop',
  t2e05: 'tabletop', t2e06: 'macro', t2o01: 'tabletop', t2o02: 'macro',
  t2o03: 'room', t2o04: 'tabletop', t2o05: 'macro', t2o06: 'room',
  t2p01: 'tabletop', t2p02: 'tabletop', t2p03: 'macro', t2p04: 'macro',
  t2p05: 'room', t2p06: 'tabletop',
  t3r01: 'room', t3r02: 'installation', t3r03: 'installation', t3r04: 'installation',
  t3s01: 'room', t3s02: 'room', t3s03: 'room', t3s04: 'room',
  t3e01: 'tabletop', t3e02: 'macro', t3e03: 'tabletop', t3e04: 'room',
  t3o01: 'room', t3o02: 'installation', t3o03: 'tabletop', t3o04: 'installation',
  t3p01: 'room', t3p02: 'room', t3p03: 'installation', t3p04: 'room',
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
      artStatus: artifactId.startsWith('t3') ? 'requires_regeneration' : 'current',
    } satisfies ArtifactTechnologyMetadata,
  ]),
) as unknown as Record<ArtifactId, ArtifactTechnologyMetadata>;
