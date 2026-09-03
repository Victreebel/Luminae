import { ARTIFACT_BASE_DEFINITIONS } from "./artifactRegistry.generated";

export const ARTIFACT_TIERS = [1, 2, 3] as const;
export type ArtifactTier = (typeof ARTIFACT_TIERS)[number];
export type ArtifactId = keyof typeof ARTIFACT_BASE_DEFINITIONS;

export const TECHNOLOGY_LINEAGES = [
  "energy",
  "ecology",
  "causality",
  "transit",
  "memory",
  "infrastructure",
  "concealment",
  "containment",
  "fabrication",
  "accord",
  "reclamation",
  "boundary_science",
] as const;

export type TechnologyLineage = (typeof TECHNOLOGY_LINEAGES)[number];

export const TECHNOLOGY_LINEAGE_LABELS: Record<TechnologyLineage, string> = {
  energy: "Energy",
  ecology: "Ecology",
  causality: "Causality",
  transit: "Transit",
  memory: "Memory",
  infrastructure: "Infrastructure",
  concealment: "Concealment",
  containment: "Containment",
  fabrication: "Fabrication",
  accord: "Accord",
  reclamation: "Reclamation",
  boundary_science: "Boundary Science",
};

export const TECHNOLOGY_LINEAGE_NOUNS: Record<TechnologyLineage, string> = {
  energy: "Crucible",
  ecology: "Garden",
  causality: "Chronicle",
  transit: "Way",
  memory: "Archive",
  infrastructure: "Lattice",
  concealment: "Quiet",
  containment: "Ward",
  fabrication: "Foundry",
  accord: "Concord",
  reclamation: "Renewal",
  boundary_science: "Horizon",
};

export const ARTIFACT_TIER_LABELS: Record<ArtifactTier, string> = {
  1: "Planetary Foundations",
  2: "Stellar Systems",
  3: "Galactic Keystones",
};

export interface ProjectLead {
  name: string;
  priority: "primary" | "secondary";
}

export interface ArtifactDefinition {
  id: ArtifactId;
  name: string;
  tier: ArtifactTier;
  bonusAffinity: "flare" | "continuum" | "verdance" | "abyss" | "radiance";
  eminence: number;
  cost: {
    flare: number;
    continuum: number;
    verdance: number;
    abyss: number;
    radiance: number;
    singularity: number;
  };
  flavor: string;
  practicalCapability: string;
  mystery: string;
  forms: readonly string[];
  blueprintRole: string;
  blueprintFamilies: string;
  engineeringScale: "Planetary" | "Star-system" | "Galactic";
  lineage: TechnologyLineage;
  builtOn: readonly ArtifactId[];
  leadsToward: readonly ArtifactId[];
  projectLeads: readonly ProjectLead[];
}

type ArtifactOverride = Partial<Pick<
  ArtifactDefinition,
  "name" | "flavor" | "practicalCapability" | "mystery" | "forms" |
  "blueprintRole" | "blueprintFamilies" | "engineeringScale" | "projectLeads"
>>;

const TIER_THREE_OVERRIDES: Partial<Record<ArtifactId, ArtifactOverride>> = {
  t3r01: {
    name: "Relicfire Interpreter",
    practicalCapability: "Translates alien ignition systems into safe startup sequences.",
    mystery: "One extinct lineage always asks whether the star consents.",
    flavor: "Translates alien ignition systems into safe startup sequences. One extinct lineage always asks whether the star consents.",
    forms: ["Interpreter", "Stellar Control System"],
    blueprintRole: "safe alien stellar ignition",
    blueprintFamilies: "Ignition Reliquary; Relic Forge Commons",
    projectLeads: projectLeads("Ignition Reliquary", "Relic Forge Commons"),
  },
  t3r02: {
    name: "Terminal-System Reclaimer",
    practicalCapability: "Separates reusable matter from the failures that killed a star system.",
    mystery: "Some ruins refuse to be classified as dead.",
    flavor: "Separates reusable matter from the failures that killed a star system. Some ruins refuse to be classified as dead.",
    forms: ["Recovery System", "Failure Archive"],
    blueprintRole: "safe terminal-system reclamation",
    blueprintFamilies: "Extinction Furnace; Interstellar Necrobiome",
    projectLeads: projectLeads("Extinction Furnace", "Interstellar Necrobiome"),
  },
  t3r03: {
    name: "Chronoflare Phase Regulator",
    practicalCapability: "Synchronizes stellar energy releases across relativistic distance.",
    mystery: "The final pulse consistently arrives before anyone authorizes it.",
    flavor: "Synchronizes stellar energy releases across relativistic distance. The final pulse consistently arrives before anyone authorizes it.",
    forms: ["Phase Regulator", "Stellar Timing System"],
    blueprintRole: "relativistic stellar-energy coordination",
    blueprintFamilies: "Chronoflare Array; Chronology Accord",
    projectLeads: projectLeads("Chronoflare Array", "Chronology Accord"),
  },
  t3r04: {
    name: "Plural Habitat Forge Heart",
    practicalCapability: "Shapes stellar matter into habitats safe for radically different bodies.",
    mystery: "Empty chambers sometimes develop occupants before launch.",
    flavor: "Shapes stellar matter into habitats safe for radically different bodies. Empty chambers sometimes develop occupants before launch.",
    forms: ["Fabrication Core", "Habitat Interface"],
    blueprintRole: "alien-compatible habitat fabrication",
    blueprintFamilies: "Star-River Crucible; Stellar Overgrowth",
    projectLeads: projectLeads("Star-River Crucible", "Stellar Overgrowth"),
  },
  t3s01: {
    name: "Voidline Route Solver",
    practicalCapability: "Compares observations from many systems to derive stable interstellar routes.",
    mystery: "One solution leads somewhere no observer departed.",
    flavor: "Compares observations from many systems to derive stable interstellar routes. One solution leads somewhere no observer departed.",
    forms: ["Route Computer", "Distributed Observatory"],
    blueprintRole: "stable interstellar route derivation",
    blueprintFamilies: "Wormgate Spine; Dark-Sector Aperture",
    projectLeads: projectLeads("Wormgate Spine", "Dark-Sector Aperture"),
  },
  t3s02: {
    name: "Divergence Reconciler",
    practicalCapability: "Reunites societies whose laws and memories evolved apart without erasing either.",
    mystery: "A third history always survives the merge.",
    flavor: "Reunites societies whose laws and memories evolved apart without erasing either. A third history always survives the merge.",
    forms: ["Civic Protocol", "Continuity Engine"],
    blueprintRole: "plural historical reconciliation",
    blueprintFamilies: "Recursive Commonwealth; Causality Audit Court",
    projectLeads: projectLeads("Recursive Commonwealth", "Causality Audit Court"),
  },
  t3s03: {
    name: "Extinction Signal Decoder",
    practicalCapability: "Reconstructs meaning from ruins distributed across many stars.",
    mystery: "Several extinct languages continue adding new words.",
    flavor: "Reconstructs meaning from ruins distributed across many stars. Several extinct languages continue adding new words.",
    forms: ["Signal Decoder", "Cultural Archive"],
    blueprintRole: "extinct-civilization interpretation",
    blueprintFamilies: "Extinction Archive; Interstellar Necrobiome",
    projectLeads: projectLeads("Extinction Archive", "Interstellar Necrobiome"),
  },
  t3s04: {
    name: "Relativistic Chronology Governor",
    practicalCapability: "Lets distant civilizations share historical order without sharing a clock.",
    mystery: "Some events remain first in every calendar.",
    flavor: "Lets distant civilizations share historical order without sharing a clock. Some events remain first in every calendar.",
    forms: ["Chronology Instrument", "Civic Protocol"],
    blueprintRole: "relativistic historical ordering",
    blueprintFamilies: "Chronology Accord; Causality Audit Court",
    projectLeads: projectLeads("Chronology Accord", "Causality Audit Court"),
  },
  t3e01: {
    name: "Xenobiome Route Graft",
    practicalCapability: "Carries life between incompatible worlds without carrying ecological conquest.",
    mystery: "Its oldest route grows beyond the mapped systems.",
    flavor: "Carries life between incompatible worlds without carrying ecological conquest. Its oldest route grows beyond the mapped systems.",
    forms: ["Biotech Graft", "Transit Ecology"],
    blueprintRole: "noninvasive biosphere transit",
    blueprintFamilies: "Worldroot Lattice; Biosphere Concordance",
    projectLeads: projectLeads("Worldroot Lattice", "Biosphere Concordance"),
  },
  t3e02: {
    name: "Stellar Habitat Genome",
    practicalCapability: "Teaches living infrastructure to grow around unfamiliar stars.",
    mystery: "One sequence describes a star that has not formed.",
    flavor: "Teaches living infrastructure to grow around unfamiliar stars. One sequence describes a star that has not formed.",
    forms: ["Engineered Genome", "Habitat Seed"],
    blueprintRole: "star-adaptive living infrastructure",
    blueprintFamilies: "Stellar Overgrowth; Star-River Crucible",
    projectLeads: projectLeads("Stellar Overgrowth", "Star-River Crucible"),
  },
  t3e03: {
    name: "Extinction Immunome",
    practicalCapability: "Turns the failures of dead biospheres into defenses for living worlds.",
    mystery: "One immunity has no recorded disease.",
    flavor: "Turns the failures of dead biospheres into defenses for living worlds. One immunity has no recorded disease.",
    forms: ["Biological Archive", "Immunity System"],
    blueprintRole: "cross-world extinction resistance",
    blueprintFamilies: "Interstellar Necrobiome; Cryptobiotic Constellation",
    projectLeads: projectLeads("Interstellar Necrobiome", "Cryptobiotic Constellation"),
  },
  t3e04: {
    name: "Biosphere Translation Membrane",
    practicalCapability: "Lets alien ecologies exchange matter without becoming alike.",
    mystery: "The membrane occasionally translates something that is not alive.",
    flavor: "Lets alien ecologies exchange matter without becoming alike. The membrane occasionally translates something that is not alive.",
    forms: ["Living Interface", "Ecological Protocol"],
    blueprintRole: "plural biosphere exchange",
    blueprintFamilies: "Biosphere Concordance; Galactic Concordance",
    projectLeads: projectLeads("Biosphere Concordance", "Galactic Concordance"),
  },
  t3o01: {
    name: "Refuge Dormancy Kernel",
    practicalCapability: "Keeps a hidden biosphere viable through interstellar ages.",
    mystery: "The sleepers report sharing the same dream.",
    flavor: "Keeps a hidden biosphere viable through interstellar ages. The sleepers report sharing the same dream.",
    forms: ["Dormancy Kernel", "Biosphere Reserve"],
    blueprintRole: "hidden deep-time biosphere preservation",
    blueprintFamilies: "Cryptobiotic Constellation; Worldroot Lattice",
    projectLeads: projectLeads("Cryptobiotic Constellation", "Worldroot Lattice"),
  },
  t3o02: {
    name: "Collapse Forecast Engine",
    practicalCapability: "Finds physical, ecological, and civic collapse patterns no single world can see.",
    mystery: "Its safest forecast always requires one civilization to disappear.",
    flavor: "Finds collapse patterns no single world can see. Its safest forecast always requires one civilization to disappear.",
    forms: ["Forecast Engine", "Distributed Sensor"],
    blueprintRole: "multi-system collapse forecasting",
    blueprintFamilies: "Collapse Mandala; Causality Audit Court",
    projectLeads: projectLeads("Collapse Mandala", "Causality Audit Court"),
  },
  t3o03: {
    name: "Quiet-Signal Symbiont",
    practicalCapability: "Carries authenticated messages without revealing sender or receiver.",
    mystery: "Sometimes it answers before the intended receiver is born.",
    flavor: "Carries authenticated messages without revealing sender or receiver. Sometimes it answers before the intended receiver is born.",
    forms: ["Signal Symbiont", "Concealment Protocol"],
    blueprintRole: "authenticated covert communication",
    blueprintFamilies: "Ordered Silence; Cryptobiotic Constellation",
    projectLeads: projectLeads("Ordered Silence", "Cryptobiotic Constellation"),
  },
  t3o04: {
    name: "Null-Baseline Interferometer",
    practicalCapability: "Combines distant measurements to observe regions that emit nothing.",
    mystery: "The darkest result appears to be observing back.",
    flavor: "Combines distant measurements to observe regions that emit nothing. The darkest result appears to be observing back.",
    forms: ["Interferometer", "Boundary Observatory"],
    blueprintRole: "distributed dark-sector observation",
    blueprintFamilies: "Dark-Sector Aperture; Collapse Mandala",
    projectLeads: projectLeads("Dark-Sector Aperture", "Collapse Mandala"),
  },
  t3p01: {
    name: "Plurality Accord Verifier",
    practicalCapability: "Tests whether unlike minds truly agreed rather than merely obeyed.",
    mystery: "One valid signature belongs to no known species.",
    flavor: "Tests whether unlike minds truly agreed rather than merely obeyed. One valid signature belongs to no known species.",
    forms: ["Verification System", "Civic Protocol"],
    blueprintRole: "cross-species consent verification",
    blueprintFamilies: "Galactic Concordance; Biosphere Concordance",
    projectLeads: projectLeads("Galactic Concordance", "Biosphere Concordance"),
  },
  t3p02: {
    name: "Relic Provenance Standard",
    practicalCapability: "Makes civilization-changing manufacture traceable across many societies.",
    mystery: "Every authentic relic contains one step no maker claims.",
    flavor: "Makes civilization-changing manufacture traceable across many societies. Every authentic relic contains one step no maker claims.",
    forms: ["Manufacturing Standard", "Verification Protocol"],
    blueprintRole: "accountable impossible manufacture",
    blueprintFamilies: "Relic Forge Commons; Star-River Crucible",
    projectLeads: projectLeads("Relic Forge Commons", "Star-River Crucible"),
  },
  t3p03: {
    name: "Federated Logic Substrate",
    practicalCapability: "Lets star-scale minds exchange proofs without merging identities.",
    mystery: "A proof occasionally remembers a thinker who never joined.",
    flavor: "Lets star-scale minds exchange proofs without merging identities. A proof occasionally remembers a thinker who never joined.",
    forms: ["Computation Substrate", "Identity Protocol"],
    blueprintRole: "plural star-scale computation",
    blueprintFamilies: "Matrioshka Chorus; Stellar Overgrowth",
    projectLeads: projectLeads("Matrioshka Chorus", "Stellar Overgrowth"),
  },
  t3p04: {
    name: "Species-Rights Witness",
    practicalCapability: "Records identity and harm in forms unrelated species can verify.",
    mystery: "Some testimony identifies the witness as the victim.",
    flavor: "Records identity and harm in forms unrelated species can verify. Some testimony identifies the witness as the victim.",
    forms: ["Witness Instrument", "Rights Protocol"],
    blueprintRole: "cross-species evidence verification",
    blueprintFamilies: "Witness Constellation; Galactic Concordance",
    projectLeads: projectLeads("Witness Constellation", "Galactic Concordance"),
  },
};

function projectLeads(primary: string, secondary: string): ProjectLead[] {
  return [
    { name: primary, priority: "primary" },
    { name: secondary, priority: "secondary" },
  ];
}

const LINEAGE_ARTIFACT_IDS: Record<TechnologyLineage, readonly ArtifactId[]> = {
  energy: ["t1r01", "t1r03", "t1e03", "t2r01", "t2r02", "t3r01", "t3r03"],
  ecology: ["t1r02", "t1r06", "t1e04", "t1e07", "t1e08", "t1p08", "t2r04", "t2e01", "t2e04", "t2o05", "t3e01", "t3e02", "t3e03"],
  causality: ["t1r04", "t1s05", "t1p05", "t1o08", "t2r05", "t2s03", "t2e02", "t2p05", "t3s04"],
  transit: ["t1s02", "t2r03", "t2s04", "t3s01"],
  memory: ["t1s01", "t1s06", "t1s08", "t2s02", "t2s05", "t2e05", "t3s03"],
  infrastructure: ["t1s04", "t1s07", "t1p06", "t2e06", "t2p04", "t3p03"],
  concealment: ["t1o01", "t1o04", "t1o07", "t2o02", "t3o01", "t3o03"],
  containment: ["t1r05", "t1s03", "t1p02", "t1p04", "t2e03", "t2p01", "t3o02"],
  fabrication: ["t1e01", "t1e05", "t1o05", "t1p01", "t2o04", "t3r04", "t3p02"],
  accord: ["t1r08", "t2s06", "t2p02", "t2p03", "t2p06", "t3s02", "t3e04", "t3p01", "t3p04"],
  reclamation: ["t1r07", "t1e06", "t1o03", "t1o06", "t2r06", "t2o03", "t3r02"],
  boundary_science: ["t1e02", "t1o02", "t1p03", "t1p07", "t2s01", "t2o01", "t2o06", "t3o04"],
};

const LINEAGE_BY_ARTIFACT = Object.fromEntries(
  TECHNOLOGY_LINEAGES.flatMap((lineage) =>
    LINEAGE_ARTIFACT_IDS[lineage].map((artifactId) => [artifactId, lineage] as const),
  ),
) as Record<ArtifactId, TechnologyLineage>;

const BUILT_ON: Partial<Record<ArtifactId, readonly ArtifactId[]>> = {
  t2r01: ["t1s04", "t1o05", "t1p04"], t2r02: ["t1s04", "t1e06", "t1o06"],
  t2r03: ["t1r01", "t1r07", "t1p04"], t2r04: ["t1r06", "t1e05", "t1p01"],
  t2r05: ["t1s03", "t1o02", "t1p05"], t2r06: ["t1o05", "t1o06", "t1o07"],
  t2s01: ["t1r04", "t1e01", "t1p02"], t2s02: ["t1r03", "t1o08", "t1p03"],
  t2s03: ["t1s05", "t1s07", "t1p05"], t2s04: ["t1e07", "t1e08", "t1p06"],
  t2s05: ["t1r03", "t1r08"], t2s06: ["t1r04", "t1o07", "t1p03"],
  t2e01: ["t1r06", "t1s06", "t1p01"], t2e02: ["t1r03", "t1s08", "t1o01"],
  t2e03: ["t1e02", "t1e08", "t1o03"], t2e04: ["t1s06", "t1o04", "t1p06"],
  t2e05: ["t1s01", "t1s06", "t1s08"], t2e06: ["t1r06", "t1o05", "t1p08"],
  t2o01: ["t1s01", "t1e02", "t1p07"], t2o02: ["t1r08", "t1e06", "t1p03"],
  // v2 matrix erratum: o02 (Abyss), not s02 (Continuum), is cost-compatible here.
  t2o03: ["t1r07", "t1o02"], t2o04: ["t1r02", "t1e03", "t1p08"],
  t2o05: ["t1e04", "t1e06", "t1e08"], t2o06: ["t1r04", "t1s01", "t1p02"],
  t2p01: ["t1r05", "t1s04", "t1o07"], t2p02: ["t1s03", "t1e05", "t1o08"],
  t2p03: ["t1e01", "t1e07", "t1p06"], t2p04: ["t1r01", "t1s04", "t1p03"],
  t2p05: ["t1p01", "t1p05", "t1p06"], t2p06: ["t1s06", "t1e04", "t1o02"],
  t3r01: ["t2r05", "t2o03", "t2p01"], t3r02: ["t2e05", "t2o04", "t2p03"],
  t3r03: ["t2s02", "t2o06", "t2p04"], t3r04: ["t2e01", "t2o04", "t2p06"],
  t3s01: ["t2r03", "t2s01", "t2p05"], t3s02: ["t2r05", "t2s03", "t2o02"],
  // v2 matrix erratum: p06 (Radiance), not o06 (Abyss), matches the printed cost.
  t3s03: ["t2r02", "t2e05", "t2o04"], t3s04: ["t2r05", "t2s05", "t2p06"],
  t3e01: ["t2s01", "t2e04", "t2p03"], t3e02: ["t2r04", "t2s02", "t2o03"],
  t3e03: ["t2s05", "t2o05", "t2p01"], t3e04: ["t2r02", "t2s04", "t2e04"],
  t3o01: ["t2s04", "t2e02", "t2o05"], t3o02: ["t2s03", "t2e05", "t2p02"],
  t3o03: ["t2r06", "t2e04", "t2p05"], t3o04: ["t2s06", "t2e03", "t2o01"],
  t3p01: ["t2r05", "t2e04", "t2o02"], t3p02: ["t2r01", "t2e06", "t2p05"],
  t3p03: ["t2r06", "t2e01", "t2p05"], t3p04: ["t2s05", "t2o02", "t2p03"],
};

const LEADS_TOWARD = Object.fromEntries(
  Object.keys(ARTIFACT_BASE_DEFINITIONS).map((id) => [id, [] as ArtifactId[]]),
) as Record<ArtifactId, ArtifactId[]>;

for (const [targetId, predecessors] of Object.entries(BUILT_ON) as Array<[ArtifactId, readonly ArtifactId[]]>) {
  for (const predecessorId of predecessors) LEADS_TOWARD[predecessorId].push(targetId);
}

function splitFlavor(flavor: string): { practicalCapability: string; mystery: string } {
  const match = flavor.match(/^(.+?[.!?])\s+(.+)$/);
  return match
    ? { practicalCapability: match[1], mystery: match[2] }
    : { practicalCapability: flavor, mystery: "" };
}

export const ARTIFACT_DEFINITIONS = Object.fromEntries(
  (Object.entries(ARTIFACT_BASE_DEFINITIONS) as Array<[ArtifactId, typeof ARTIFACT_BASE_DEFINITIONS[ArtifactId]]>)
    .map(([artifactId, base]) => {
      const flavorParts = splitFlavor(base.flavor);
      const override = TIER_THREE_OVERRIDES[artifactId] ?? {};
      const definition: ArtifactDefinition = {
        id: artifactId,
        name: override.name ?? base.name,
        tier: base.tier,
        bonusAffinity: base.bonusAffinity,
        eminence: base.eminence,
        cost: { ...base.cost },
        flavor: override.flavor ?? base.flavor,
        practicalCapability: override.practicalCapability ?? flavorParts.practicalCapability,
        mystery: override.mystery ?? flavorParts.mystery,
        forms: override.forms ?? base.artifactForm.split(" / "),
        blueprintRole: override.blueprintRole ?? base.blueprintRole,
        blueprintFamilies: override.blueprintFamilies ?? base.blueprintFamilies,
        engineeringScale: override.engineeringScale ?? base.engineeringScale,
        lineage: LINEAGE_BY_ARTIFACT[artifactId],
        builtOn: BUILT_ON[artifactId] ?? [],
        leadsToward: LEADS_TOWARD[artifactId],
        projectLeads: override.projectLeads ?? [],
      };
      return [artifactId, definition];
    }),
) as Record<ArtifactId, ArtifactDefinition>;

export const ARTIFACT_IDS = Object.keys(ARTIFACT_DEFINITIONS) as ArtifactId[];
export const ARTIFACT_CATALOG = ARTIFACT_IDS.map((artifactId) => ARTIFACT_DEFINITIONS[artifactId]);

export type KardashevType = 0 | 1 | 2 | 3;

export const KARDASHEV_TYPE_LABELS: Record<KardashevType, string> = {
  0: "Pre-Type I",
  1: "Kardashev Type I",
  2: "Kardashev Type II",
  3: "Kardashev Type III",
};

export const KARDASHEV_SCALE_LABELS: Record<KardashevType, string> = {
  0: "Emergent civilization",
  1: "Planetary civilization",
  2: "Stellar civilization",
  3: "Galactic civilization",
};

export function computeKardashevType(
  forgedArtifactIds: ReadonlyArray<string>,
  bonusFundedForgeIds: ReadonlyArray<string>,
): KardashevType {
  const bonusFunded = new Set(bonusFundedForgeIds);
  const cards = forgedArtifactIds
    .map((artifactId) => ARTIFACT_DEFINITIONS[artifactId as ArtifactId])
    .filter((artifact): artifact is ArtifactDefinition => artifact !== undefined);
  if (cards.some((artifact) => artifact.tier === 3 && bonusFunded.has(artifact.id))) return 3;
  if (cards.some((artifact) => artifact.tier === 3 || (artifact.tier === 2 && bonusFunded.has(artifact.id)))) return 2;
  if (cards.some((artifact) => artifact.tier === 2 || (artifact.tier === 1 && bonusFunded.has(artifact.id)))) return 1;
  return 0;
}

export const AFFINITY_IDENTITY_ADJECTIVES = {
  flare: "Ember",
  continuum: "Temporal",
  verdance: "Verdant",
  abyss: "Veiled",
  radiance: "Radiant",
} as const;
