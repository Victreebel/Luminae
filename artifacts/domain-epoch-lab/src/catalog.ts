import {
  AFFINITIES,
  emptyAffinityCounts,
  type Affinity,
  type ArtifactDefinition,
  type CatalogMode,
  type CivilizationImperative,
  type DomainCondition,
  type Scale,
} from "./types";

const NAMES: Record<string, string> = {
  t1r01: "Ignition Kernel", t1r02: "Ashroot Bloom",
  t1s01: "Echo Splinter", t1s02: "Mantlelift Driver Coil",
  t1e01: "Replication Spore", t1e02: "Voidroot Tap",
  t1o01: "Entropy Veil", t1o02: "Horizon Lantern",
  t1p01: "Correction Seed", t1p02: "Still-Point Shard",
  t2r01: "Stellar Crucible", t2r02: "Biomass Ignition Index",
  t2s01: "Interstice Gate Seed", t2s02: "Storm-Memory Filament",
  t2e01: "Solar Immune Organ", t2e02: "Dormancy Clock Graft",
  t2o01: "Horizon Extractor", t2o02: "Radiant Erasure Casket",
  t2p01: "Containment Lattice", t2p02: "Null-Convergence Prism",
  t3r01: "Ignition Reliquary", t3r02: "Extinction Furnace",
  t3s01: "Wormgate Spine", t3s02: "Recursive Commonwealth",
  t3e01: "Worldroot Lattice", t3e02: "Stellar Overgrowth",
  t3o01: "Cryptobiotic Constellation", t3o02: "Collapse Mandala",
  t3p01: "Galactic Concordance", t3p02: "Relic Forge Commons",
};

const CODE: Record<Affinity, string> = {
  flare: "r", continuum: "s", verdance: "e", abyss: "o", radiance: "p",
};
const SCALE: Record<number, Scale> = { 1: "planetary", 2: "stellar", 3: "galactic" };
const TAG: Record<Affinity, string> = {
  flare: "energy", continuum: "continuity", verdance: "regeneration", abyss: "adaptation", radiance: "coherence",
};

function requirements(affinity: Affinity, tier: number, variant: number) {
  const result = emptyAffinityCounts();
  const index = AFFINITIES.indexOf(affinity);
  const next = AFFINITIES[(index + 1) % AFFINITIES.length];
  const previous = AFFINITIES[(index + AFFINITIES.length - 1) % AFFINITIES.length];
  const opposite = AFFINITIES[(index + 2) % AFFINITIES.length];
  if (tier === 1) {
    result[affinity] = 1;
    result[next] = variant === 1 ? 1 : 2;
    result[previous] = 1;
  } else if (tier === 2) {
    result[affinity] = variant === 1 ? 1 : 2;
    result[next] = 2;
    result[previous] = 2;
    if (variant === 2) result[opposite] = 1;
  } else {
    result[affinity] = 2;
    result[next] = variant === 1 ? 2 : 3;
    result[previous] = 2;
    result[opposite] = 1;
  }
  return result;
}

function buildCatalog(): ArtifactDefinition[] {
  const result: ArtifactDefinition[] = [];
  for (let tier = 1; tier <= 3; tier += 1) {
    for (const affinity of AFFINITIES) {
      for (const variant of [1, 2]) {
        const id = `t${tier}${CODE[affinity]}0${variant}`;
        const previousTier = tier - 1;
        const builtOn = previousTier > 0
          ? [`t${previousTier}${CODE[affinity]}0${variant}`, `t${previousTier}${CODE[affinity]}0${variant === 1 ? 2 : 1}`]
          : [];
        result.push({
          id,
          name: NAMES[id],
          affinity,
          scale: SCALE[tier],
          requirements: requirements(affinity, tier, variant),
          builtOn,
          tags: [TAG[affinity], SCALE[tier]],
          eminence: tier + (variant === 2 ? 1 : 0),
        });
      }
    }
  }
  return result;
}

export const CORE_CATALOG = buildCatalog();
export const MICRO_CATALOG = CORE_CATALOG.filter((artifact) => artifact.id.endsWith("01"));

export function getCatalog(mode: CatalogMode): ArtifactDefinition[] {
  return mode === "micro" ? MICRO_CATALOG : CORE_CATALOG;
}

export const DOMAIN_CONDITIONS: DomainCondition[] = [
  { id: "stellar-instability", name: "Stellar Instability", requiredTag: "energy", targetPerPlayer: 0.75 },
  { id: "causal-shear", name: "Causal Shear", requiredTag: "continuity", targetPerPlayer: 0.75 },
  { id: "biosphere-collapse", name: "Biosphere Collapse", requiredTag: "regeneration", targetPerPlayer: 0.75 },
  { id: "dark-frontier", name: "Dark Frontier", requiredTag: "adaptation", targetPerPlayer: 0.75 },
  { id: "signal-fracture", name: "Signal Fracture", requiredTag: "coherence", targetPerPlayer: 0.75 },
];

export const IMPERATIVES: CivilizationImperative[] = [
  { id: "sustain-the-flame", name: "Sustain the Flame", tag: "energy", target: 3 },
  { id: "preserve-continuity", name: "Preserve Continuity", tag: "continuity", target: 3 },
  { id: "renew-the-living", name: "Renew the Living", tag: "regeneration", target: 3 },
  { id: "inhabit-the-unknown", name: "Inhabit the Unknown", tag: "adaptation", target: 3 },
  { id: "build-coherence", name: "Build Coherence", tag: "coherence", target: 3 },
];

export function artifactMap(catalog: ArtifactDefinition[]): Map<string, ArtifactDefinition> {
  return new Map(catalog.map((artifact) => [artifact.id, artifact]));
}
