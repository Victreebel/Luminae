/**
 * @workspace/game-types
 *
 * Shared game constants and types used by both the frontend (luminae) and the
 * backend (api-server).  Keeping them here ensures a single source of truth:
 * adding a new aura style in this file immediately produces TypeScript errors
 * in both packages if the LUMINARIES array or LUMINARY_VISUALS map does not
 * include a matching value.
 */

import { ARTIFACT_DEFINITION_BY_ID } from './artifacts';
import type { ArtifactEventFactId } from './artifact-event-facts';
import {
  ARTIFACT_MANIFESTATION_PROFILE_BY_ID,
  getArtifactPlacementPhysicalContract,
  type ArtifactDistrictPlacementStrength,
  type ArtifactManifestationProfile,
  type ArtifactPlacementFamily,
  type CivilizationCameraScale,
} from './artifact-manifestations';
import {
  ARTIFACT_CIVILIZATION_CAPABILITY_BY_ID,
  ARTIFACT_CIVILIZATION_CAPABILITY_DOMAIN_BY_ID,
  type ArtifactCivilizationCapabilityId,
  type CivilizationCapabilityDomain,
} from './civilization-capabilities';
import {
  assessCivilizationPressureResponse,
  assessCivilizationPressureResponses,
  type CivilizationPressureCapabilityCoverage,
  type CivilizationPressureResponseAssessment,
} from './civilization-pressure';
import { ARTIFACT_TECHNOLOGY_METADATA_BY_ID } from './technology';
import type { CampaignContentState, CampaignProgressProjection } from './chronicles';

export * from './artifacts';
export * from './artifact-canon';
export * from './artifact-tier-audit';
export * from './artifact-event-facts';
export * from './artifact-functions';
export * from './artifact-manifestations';
export * from './civilization-capabilities';
export * from './civilization-pressure';
export * from './chronicles';
export * from './recurrenceChronicle';
export * from './traceChronicle';
export * from './triangulationChronicle';
export * from './technology';
export * from './tutorialInvestigation';

/** Duration of the opening first-player selector shared by client and server. */
export const OPENING_TURN_ORDER_PRESENTATION_MS = 3400;

/**
 * Match-length policy shared by room setup, simulation, tutorial, and UI.
 * Fifteen remains a supported shorter custom format; new standard matches use
 * twenty so the complete three-tier civilization arc has room to develop.
 */
export const MIN_VICTORY_REQUIREMENT = 15 as const;
export const DEFAULT_VICTORY_REQUIREMENT = 20 as const;
export const VICTORY_REQUIREMENT_OPTIONS = [15, 20, 25] as const;
export type VictoryRequirementOption = (typeof VICTORY_REQUIREMENT_OPTIONS)[number];

/**
 * Canonical set of Luminary ID string literals.  This is the authoritative
 * list — both the backend LuminaryDef interface and the frontend
 * LUMINARY_VISUALS map type their `id` field (and map key) as `LuminaryId`, so
 * an ID that is not in this list is a compile-time error in both packages.
 *
 * When adding a new Luminary:
 *   1. Add its ID here.
 *   2. Add a matching entry to LUMINARIES in gameEngine.ts.
 *   3. Add a matching entry to LUMINARY_VISUALS in luminaryAssets.tsx.
 *   4. TypeScript will flag every incomplete usage automatically.
 *
 * The lint:summon-colors script remains a secondary safety net that checks
 * summonColor / summonSecondaryColor / auraStyle values match at runtime; the
 * primary guard for ID correctness is this compile-time union type.
 */
export const LUMINARY_IDS = [
  'lum_ember',
  'lum_tide',
  'lum_verdant',
  'lum_void',
  'lum_radiant',
  'lum_astral',
  'lum_bloom',
  'lum_forge',
  'lum_compass',
  'lum_seed',
  'lum_orchard',
  'lum_pale',
  'lum_hunger',
  'lum_moth',
  'lum_null',
  'lum_oracle',
  'lum_scholar',
] as const;

export type LuminaryId = (typeof LUMINARY_IDS)[number];

/** Arrival rewards only; Eminence granted by abilities is accounted for separately. */
export type LuminaryNativeEminence = 0 | 1 | 2 | 3;

/**
 * Shared by gameplay, tutorial, and animation previews. Three compensates for
 * modest, shared, or unreliable effects relative to the alliance requirements;
 * recurring scoring and engine growth receive smaller arrival rewards.
 */
export const LUMINARY_NATIVE_EMINENCE = {
  lum_moth: 3, // One shared Tier III refresh; its benefit depends on the market.
  lum_tide: 2, // Persistent Archive information and one alternative Forge source.
  lum_verdant: 3, // Only one held token after building five permanent Verdance.
  lum_void: 2, // A substantial, shared change to the victory threshold.
  lum_radiant: 1, // Two later Eminence milestones reward the same specialization.
  lum_astral: 3, // Conditional recycling benefits both players.
  lum_bloom: 1, // Recurring Eminence can accumulate from any player's burns.
  lum_forge: 3, // One shared market reset after building eight Affinities.
  lum_compass: 1, // Recurring suppression plus exclusive Encryption access.
  lum_seed: 2, // Repeatable permanent Affinities from opponents' Seeded Forges.
  lum_orchard: 3, // Just one extra permanent Affinity after an eight-Affinity setup.
  lum_pale: 3, // Symmetric, threshold-dependent token removal may have no benefit.
  lum_ember: 3, // Nine-Affinity setup for a delayed, conditional market disruption.
  lum_hunger: 2, // A free choice of Artifact can complete a valuable Blueprint.
  lum_null: 0, // Retains its existing zero-point reward for Tier III suppression.
  lum_oracle: 3, // Deferred; no implemented ability supplements its arrival reward.
  lum_scholar: 2, // Deferred; a free Artifact would supply additional engine value.
} as const satisfies Readonly<Record<LuminaryId, LuminaryNativeEminence>>;

/**
 * Canonical set of aura animation style keys recognised by the frontend aura
 * renderer.  This is the authoritative list — both the backend LuminaryDef
 * interface and the frontend LUMINARY_VISUALS map type their `auraStyle` field
 * as `AuraStyle`, so an unknown value is a compile-time error in both packages.
 *
 * When adding a new animation variant:
 *   1. Add its key here.
 *   2. Add a matching case to the aura renderer in luminaryAssets.tsx
 *      (AURA_VARIANTS record).
 *   3. TypeScript will flag every incomplete usage automatically.
 */
export const KNOWN_AURA_STYLES = [
  'fire',
  'tide',
  'verdant',
  'void',
  'radiant',
  'astral',
  'storm',
  'pale',
  'bloom',
  'compass',
  'oracle',
  'null',
  'distorted',
] as const;

export type AuraStyle = (typeof KNOWN_AURA_STYLES)[number];

/**
 * Canonical Luminae affinity vocabulary.
 *
 * The string values are stable transport/storage identifiers used by existing
 * games and clients. Application code should treat them as opaque keys and use
 * AFFINITY_NAMES whenever a player-facing name is needed.
 */
export const AFFINITY_KEYS = [
  'flare',
  'radiance',
  'verdance',
  'continuum',
  'abyss',
  'singularity',
] as const;

export type AffinityKey = (typeof AFFINITY_KEYS)[number];

export const STANDARD_AFFINITY_KEYS = [
  'flare',
  'radiance',
  'verdance',
  'continuum',
  'abyss',
] as const satisfies readonly AffinityKey[];

export type StandardAffinityKey = (typeof STANDARD_AFFINITY_KEYS)[number];

export type AffinityCounts = Record<AffinityKey, number>;

export const AFFINITY_NAMES: Record<AffinityKey, string> = {
  flare: 'Flare',
  radiance: 'Radiance',
  verdance: 'Verdance',
  continuum: 'Continuum',
  abyss: 'Abyss',
  singularity: 'Singularity',
};

/**
 * Versioned, backend-owned Civilization history for one player in one match.
 *
 * This deliberately separates historical mastery from the current operational
 * implementation. An implementation may be damaged or annihilated without
 * erasing the fact that the civilization mastered the Artifact.
 */
export const CIVILIZATION_STATE_VERSION = 5 as const;

export const CIVILIZATION_ENVIRONMENT_POLICY_ID = 'persistent-world-v1' as const;

/**
 * Every player begins on the same authored Surface construction topology.
 * Environment identity may change atmosphere and material treatment, but it
 * may not move terrain, cameras, districts, or manifestation sockets.
 */
export const CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID = 'shared-basin-v1' as const;
export type CivilizationSurfaceConstructionPlanId =
  typeof CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID;

export const CIVILIZATION_ENVIRONMENT_VARIANTS = [
  {
    id: 'aurora_basin',
    terrain: 'terraced_basin',
    celestial: 'near_ringed_world',
    atmosphere: 'auroral_twilight',
  },
  {
    id: 'terminator_reach',
    terrain: 'terminator_highlands',
    celestial: 'binary_dawn',
    atmosphere: 'copper_haze',
  },
  {
    id: 'oceanic_scar',
    terrain: 'archipelago_scar',
    celestial: 'tidal_moon',
    atmosphere: 'storm_blue',
  },
  {
    id: 'obsidian_steppe',
    terrain: 'volcanic_steppe',
    celestial: 'distant_giant',
    atmosphere: 'clear_violet',
  },
] as const;

export type CivilizationEnvironmentVariantId =
  (typeof CIVILIZATION_ENVIRONMENT_VARIANTS)[number]['id'];
export type CivilizationEnvironmentTerrain =
  (typeof CIVILIZATION_ENVIRONMENT_VARIANTS)[number]['terrain'];
export type CivilizationEnvironmentCelestial =
  (typeof CIVILIZATION_ENVIRONMENT_VARIANTS)[number]['celestial'];
export type CivilizationEnvironmentAtmosphere =
  (typeof CIVILIZATION_ENVIRONMENT_VARIANTS)[number]['atmosphere'];

export interface CivilizationEnvironmentIdentity {
  policyId: typeof CIVILIZATION_ENVIRONMENT_POLICY_ID;
  /** Stable inside one match. A rematch deliberately receives a fresh seed. */
  matchScopedSeed: number;
  variantId: CivilizationEnvironmentVariantId;
  terrain: CivilizationEnvironmentTerrain;
  celestial: CivilizationEnvironmentCelestial;
  atmosphere: CivilizationEnvironmentAtmosphere;
  historyEvidence: CivilizationHistoryEvidence;
}

export const CIVILIZATION_ARTIFACT_IMPLEMENTATION_STATES = [
  'operational',
  'damaged',
  'archived',
  'annihilated',
] as const;

export type CivilizationArtifactImplementationState =
  (typeof CIVILIZATION_ARTIFACT_IMPLEMENTATION_STATES)[number];

export type CivilizationHistoryEvidence = 'recorded' | 'legacy_inferred';

function hashCivilizationIdentitySeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function nextCivilizationSeed(seed: number): number {
  let value = seed || 0x6d2b79f5;
  value ^= value << 13;
  value ^= value >>> 17;
  value ^= value << 5;
  return value >>> 0;
}

export function createCivilizationEnvironmentIdentity(
  matchSeed: string | number,
  variantId: CivilizationEnvironmentVariantId = CIVILIZATION_ENVIRONMENT_VARIANTS[0].id,
  historyEvidence: CivilizationHistoryEvidence = 'recorded',
): CivilizationEnvironmentIdentity {
  const variant = CIVILIZATION_ENVIRONMENT_VARIANTS.find((candidate) => candidate.id === variantId)
    ?? CIVILIZATION_ENVIRONMENT_VARIANTS[0];
  return {
    policyId: CIVILIZATION_ENVIRONMENT_POLICY_ID,
    matchScopedSeed: hashCivilizationIdentitySeed(String(matchSeed)),
    variantId: variant.id,
    terrain: variant.terrain,
    celestial: variant.celestial,
    atmosphere: variant.atmosphere,
    historyEvidence,
  };
}

/** Assigns every seat a visibly distinct environment without replacement. */
export function createCivilizationEnvironmentSet(
  matchSeed: string | number,
  playerIds: readonly string[],
  historyEvidence: CivilizationHistoryEvidence = 'recorded',
): Record<string, CivilizationEnvironmentIdentity> {
  const variants = [...CIVILIZATION_ENVIRONMENT_VARIANTS];
  let seed = hashCivilizationIdentitySeed(String(matchSeed));
  for (let index = variants.length - 1; index > 0; index -= 1) {
    seed = nextCivilizationSeed(seed);
    const swapIndex = seed % (index + 1);
    [variants[index], variants[swapIndex]] = [variants[swapIndex]!, variants[index]!];
  }
  return Object.fromEntries(playerIds.map((playerId, seatIndex) => {
    const variant = variants[seatIndex % variants.length]!;
    return [
      playerId,
      createCivilizationEnvironmentIdentity(`${matchSeed}:${playerId}:${seatIndex}`, variant.id, historyEvidence),
    ];
  }));
}

export interface CivilizationArtifactChangeSource {
  sourceType: 'artifact' | 'blueprint' | 'chronicle' | 'scenario' | 'system';
  sourceId: string | null;
}

export interface CivilizationArtifactLifecycleState {
  artifactId: string;
  /** Null means the match predates turn-level Civilization history. */
  firstMasteredTurnCount: number | null;
  /** Lifetime mastery count in this match, including lost implementations. */
  masteryCount: number;
  /** Null means the current implementation state cannot be known truthfully. */
  implementationState: CivilizationArtifactImplementationState | null;
  /** Null for legacy state whose transition timing was never recorded. */
  implementationStateChangedTurnCount: number | null;
  implementationChangeSource: CivilizationArtifactChangeSource | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export type CivilizationNaturalAffinityCounts = Record<StandardAffinityKey, number>;

export const CIVILIZATION_DYAD_DEFINITIONS = [
  { id: 'vortex', name: 'Vortex', affinities: ['flare', 'radiance'] },
  { id: 'flux', name: 'Flux', affinities: ['flare', 'continuum'] },
  { id: 'bloom', name: 'Bloom', affinities: ['flare', 'verdance'] },
  { id: 'chrysalis', name: 'Chrysalis', affinities: ['flare', 'abyss'] },
  { id: 'orbit', name: 'Orbit', affinities: ['radiance', 'continuum'] },
  { id: 'canopy', name: 'Canopy', affinities: ['radiance', 'verdance'] },
  { id: 'eclipse', name: 'Eclipse', affinities: ['radiance', 'abyss'] },
  { id: 'lineage', name: 'Lineage', affinities: ['continuum', 'verdance'] },
  { id: 'echo', name: 'Echo', affinities: ['continuum', 'abyss'] },
  { id: 'spore', name: 'Spore', affinities: ['verdance', 'abyss'] },
] as const satisfies readonly {
  id: string;
  name: string;
  affinities: readonly [StandardAffinityKey, StandardAffinityKey];
}[];

export type CivilizationDyadId = (typeof CIVILIZATION_DYAD_DEFINITIONS)[number]['id'];

export const CIVILIZATION_DISTRICT_IDENTITY_POLICY_ID = 'district-dyad-v1' as const;
export const CIVILIZATION_DISTRICT_SOFT_CAPACITY = 2 as const;
export const CIVILIZATION_DISTRICT_HARD_CAPACITY = 3 as const;
export const CIVILIZATION_DISTRICT_DYAD_REPLACEMENT_MARGIN = 0.15 as const;

export const CIVILIZATION_SURFACE_DISTRICT_FAMILIES = [
  'industrial_district',
  'civic_core',
  'habitat_district',
  'wilderness_margin',
  'subsurface_works',
  'observatory_ridge',
  'transit_terminus',
  'archive_quarter',
  'coastal_margin',
  'containment_zone',
] as const satisfies readonly ArtifactPlacementFamily[];

export type CivilizationSurfaceDistrictFamily =
  (typeof CIVILIZATION_SURFACE_DISTRICT_FAMILIES)[number];

export interface CivilizationDistrictInstance {
  districtId: string;
  family: CivilizationSurfaceDistrictFamily;
  instance: number;
  residentArtifactIds: string[];
  residentAffinities: StandardAffinityKey[];
  foundingAffinities: [] | [StandardAffinityKey] | [StandardAffinityKey, StandardAffinityKey];
  permanentDyad: CivilizationDyadId | null;
  softCapacity: typeof CIVILIZATION_DISTRICT_SOFT_CAPACITY;
  hardCapacity: typeof CIVILIZATION_DISTRICT_HARD_CAPACITY;
  influence: number;
  establishedTurnCount: number | null;
  committedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationDistrictIdentityState {
  policyId: typeof CIVILIZATION_DISTRICT_IDENTITY_POLICY_ID;
  districts: Record<string, CivilizationDistrictInstance>;
  artifactAssignments: Record<string, string>;
  influenceByDyad: Record<CivilizationDyadId, number>;
  totalInfluence: number;
  rawDominantDyad: CivilizationDyadId | null;
  presentationDyad: CivilizationDyadId | null;
  calculatedTurnCount: number | null;
  presentationCommittedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export type CivilizationAffinityIdentityForm =
  | 'unformed'
  | 'singular'
  | 'dyad'
  | 'plural';

export interface CivilizationRankedAffinity {
  affinity: StandardAffinityKey;
  historicalWeight: number;
  operationalWeight: number;
}

export interface CivilizationIdentityEpoch {
  epochIndex: number;
  dyad: CivilizationDyadId;
  startedTurnCount: number | null;
  endedTurnCount: number | null;
  historicalSharesAtStart: CivilizationNaturalAffinityCounts;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationAffinityIdentity {
  /** Centralized compatibility policy; final confidence calibration is deferred. */
  policyId: 'provisional-ratio-v1';
  form: CivilizationAffinityIdentityForm;
  historicalCounts: CivilizationNaturalAffinityCounts;
  operationalCounts: CivilizationNaturalAffinityCounts;
  rankedAffinities: CivilizationRankedAffinity[];
  dominantAffinity: StandardAffinityKey | null;
  dominantDyad: CivilizationDyadId | null;
  /** First stable dyad expressed by this civilization. It is never rewritten. */
  foundingDyad: CivilizationDyadId | null;
  /** Hysteretic architectural identity currently presented by the portrait. */
  presentationDyad: CivilizationDyadId | null;
  identityEpochs: CivilizationIdentityEpoch[];
  normalizedHistoricalShares: CivilizationNaturalAffinityCounts;
  normalizedOperationalShares: CivilizationNaturalAffinityCounts;
  thirdAffinity: StandardAffinityKey | null;
  dominantShare: number;
  secondaryToPrimaryRatio: number;
  thirdToPrimaryRatio: number;
}

/**
 * Architectural identity is committed independently at each visible scale.
 * Evidence earned after one layer commits belongs exclusively to the next.
 */
export const CIVILIZATION_IDENTITY_LAYERS = [
  'city',
  'planet',
  'system',
  'galaxy',
] as const;

export type CivilizationIdentityLayer = (typeof CIVILIZATION_IDENTITY_LAYERS)[number];

export const CIVILIZATION_IDENTITY_STATUSES = [
  'plain',
  'forming',
  'committed',
] as const;

export type CivilizationIdentityStatus = (typeof CIVILIZATION_IDENTITY_STATUSES)[number];

export const CIVILIZATION_NESTED_IDENTITY_POLICY_ID = 'nested-milestone-v1' as const;

/** City, Planet, and System need a meaningful body of era evidence before commitment. */
export const CIVILIZATION_IDENTITY_COMMITMENT_EVIDENCE = {
  city: 4,
  planet: 4,
  system: 4,
  galaxy: 0,
} as const satisfies Record<CivilizationIdentityLayer, number>;

export interface CivilizationIdentityEvidence {
  evidenceId: string;
  artifactId: string;
  masteryOrdinal: number;
  affinity: StandardAffinityKey;
  routedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationIdentityRankedAffinity {
  affinity: StandardAffinityKey;
  weight: number;
}

export interface CivilizationIdentityLayerState {
  policyId: typeof CIVILIZATION_NESTED_IDENTITY_POLICY_ID;
  layer: CivilizationIdentityLayer;
  status: CivilizationIdentityStatus;
  eraStartedTurnCount: number | null;
  affinityCounts: CivilizationNaturalAffinityCounts;
  normalizedShares: CivilizationNaturalAffinityCounts;
  rankedAffinities: CivilizationIdentityRankedAffinity[];
  dominantAffinity: StandardAffinityKey | null;
  candidateDyad: CivilizationDyadId | null;
  committedDyad: CivilizationDyadId | null;
  committedTurnCount: number | null;
  evidence: CivilizationIdentityEvidence[];
  historyEvidence: CivilizationHistoryEvidence;
}

export type CivilizationNestedIdentityState = Record<
  CivilizationIdentityLayer,
  CivilizationIdentityLayerState
>;

export interface CivilizationLegacyState {
  completedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export const CIVILIZATION_MATURITY_LEVELS = [
  'planetary',
  'stellar',
  'galactic',
] as const;

export type CivilizationMaturity = (typeof CIVILIZATION_MATURITY_LEVELS)[number];
export type CivilizationOperationalReach = CivilizationMaturity | 'unknown';

export const CIVILIZATION_REACH_CONDITIONS = [
  'intact',
  'degraded',
  'fractured',
  'unknown',
] as const;

export type CivilizationReachCondition = (typeof CIVILIZATION_REACH_CONDITIONS)[number];
export type LiteralKardashevType = 0 | 1 | 2 | 3;

export interface CivilizationScaleEvidence {
  sourceType: 'artifact' | 'blueprint' | 'chronicle' | 'scenario' | 'system';
  sourceId: string | null;
  turnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationScaleState {
  historicalMaturity: CivilizationMaturity;
  historicalMaturityEvidence: CivilizationScaleEvidence[];
  currentReach: CivilizationOperationalReach;
  currentReachCondition: CivilizationReachCondition;
  currentReachEvidence: CivilizationScaleEvidence[];
  /** Historical scientific metadata only; never a Civilization Maturity alias. */
  literalKardashevType: LiteralKardashevType;
  literalKardashevEvidence: CivilizationHistoryEvidence;
}

export const CIVILIZATION_CORE_CONDITIONS = [
  'damaged',
  'isolated',
  'quarantined',
  'disrupted',
] as const;

export type CivilizationCoreCondition = (typeof CIVILIZATION_CORE_CONDITIONS)[number];

export const CIVILIZATION_CONDITION_NAMESPACES = [
  'blueprint',
  'chronicle',
  'scenario',
] as const;

export type CivilizationConditionNamespace =
  (typeof CIVILIZATION_CONDITION_NAMESPACES)[number];
export type CivilizationConditionType =
  | CivilizationCoreCondition
  | `${CivilizationConditionNamespace}:${string}`;

/**
 * The stable cross-content pressure vocabulary. Content may combine tags, but
 * must not invent synonyms for these causal families.
 */
export const CIVILIZATION_PRESSURE_TAGS = [
  'disruption',
  'isolation',
  'proliferation',
  'exposure',
  'attrition',
  'coordination',
  'transformation',
] as const;

export type CivilizationPressureTag = (typeof CIVILIZATION_PRESSURE_TAGS)[number];

export const CIVILIZATION_CAPABILITY_NAMESPACES = [
  'artifact',
  'project',
  'chronicle',
  'scenario',
  'system',
] as const;

export type CivilizationCapabilityNamespace =
  (typeof CIVILIZATION_CAPABILITY_NAMESPACES)[number];
export type CivilizationCapabilityId = `${CivilizationCapabilityNamespace}:${string}`;

/** Project capabilities already established by authoritative first-pool rules. */
export const CIVILIZATION_PROJECT_CAPABILITIES = {
  antimatterClaimAnnihilation: 'project:claim_annihilation',
  foundryForge: 'project:foundry_forge',
  hostileClaimInterception: 'project:hostile_claim_interception',
  claimDeferralObservation: 'project:claim_deferral_observation',
} as const satisfies Record<string, CivilizationCapabilityId>;

export interface CivilizationCapabilityDefinition {
  id: CivilizationCapabilityId;
  label: string;
  description: string;
}

export const CIVILIZATION_PROJECT_CAPABILITY_DEFINITIONS = [
  {
    id: CIVILIZATION_PROJECT_CAPABILITIES.antimatterClaimAnnihilation,
    label: 'Claim annihilation',
    description: 'Erase a marked Artifact claim at the authorized interception window.',
  },
  {
    id: CIVILIZATION_PROJECT_CAPABILITIES.foundryForge,
    label: 'Orbital foundry fabrication',
    description: 'Convert mantle feedstock into a reduced-cost Artifact through the Foundry.',
  },
  {
    id: CIVILIZATION_PROJECT_CAPABILITIES.hostileClaimInterception,
    label: 'Hostile claim interception',
    description: 'Intercept a hostile effect before it can cancel or destroy a legal claim.',
  },
  {
    id: CIVILIZATION_PROJECT_CAPABILITIES.claimDeferralObservation,
    label: 'Claim deferral observation',
    description: 'Verify and publish a civilization\'s repeated deferral of an available claim.',
  },
] as const satisfies readonly CivilizationCapabilityDefinition[];

const CIVILIZATION_PROJECT_CAPABILITY_BY_ID = Object.fromEntries(
  CIVILIZATION_PROJECT_CAPABILITY_DEFINITIONS.map((definition) => [definition.id, definition]),
) as Record<
  (typeof CIVILIZATION_PROJECT_CAPABILITY_DEFINITIONS)[number]['id'],
  (typeof CIVILIZATION_PROJECT_CAPABILITY_DEFINITIONS)[number]
>;

/** Returns authored copy for known capabilities and legible fallback copy for future namespaces. */
export function getCivilizationCapabilityDefinition(
  capabilityId: CivilizationCapabilityId,
): CivilizationCapabilityDefinition {
  const artifactDefinition = ARTIFACT_CIVILIZATION_CAPABILITY_BY_ID[
    capabilityId as keyof typeof ARTIFACT_CIVILIZATION_CAPABILITY_BY_ID
  ];
  if (artifactDefinition) return artifactDefinition;
  const projectDefinition = CIVILIZATION_PROJECT_CAPABILITY_BY_ID[
    capabilityId as keyof typeof CIVILIZATION_PROJECT_CAPABILITY_BY_ID
  ];
  if (projectDefinition) return projectDefinition;
  const [, rawLabel = capabilityId] = capabilityId.split(':', 2);
  const label = rawLabel
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
  return {
    id: capabilityId,
    label,
    description: 'An authored Civilization capability exposed by the current historical state.',
  };
}

export type CivilizationEntityReference =
  | { kind: 'world'; id: string }
  | { kind: 'artifact_implementation'; id: string }
  | { kind: 'network'; id: string }
  | { kind: 'installation'; id: string }
  | { kind: 'project'; id: string };

export interface CivilizationCondition {
  id: string;
  type: CivilizationConditionType;
  coreType: CivilizationCoreCondition | null;
  target: CivilizationEntityReference;
  source: CivilizationArtifactChangeSource;
  appliedTurnCount: number | null;
  resolvedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationWorld {
  id: string;
  role: 'homeworld' | 'settled_world';
  name: string | null;
  state: 'active' | 'annihilated';
  establishedTurnCount: number | null;
  stateChangedTurnCount: number | null;
  conditionIds: string[];
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationEntity {
  id: string;
  kind: 'network' | 'installation' | 'project';
  state: 'operational' | 'disabled' | 'annihilated';
  worldId: string | null;
  sourceId: string | null;
  establishedTurnCount: number | null;
  stateChangedTurnCount: number | null;
  conditionIds: string[];
  historyEvidence: CivilizationHistoryEvidence;
}

export const CIVILIZATION_STABILITY_BANDS = [
  'stable',
  'strained',
  'unstable',
  'crisis',
] as const;

export type CivilizationStabilityBand = (typeof CIVILIZATION_STABILITY_BANDS)[number];

export interface CivilizationStabilityContributor {
  id: string;
  direction: 'support' | 'pressure';
  magnitude: number;
  label: string;
  source: CivilizationArtifactChangeSource;
  target: CivilizationEntityReference | null;
  appliedTurnCount: number | null;
  resolvedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationStabilityState {
  band: CivilizationStabilityBand;
  /** Null until an explicitly selected calibration is available. */
  score: number | null;
  calibrationId: string | null;
  contributors: CivilizationStabilityContributor[];
  calculatedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export const CIVILIZATION_HISTORICAL_QUALITY_DIMENSIONS = [
  'continuity',
  'agency',
  'achievement',
] as const;

export type CivilizationHistoricalQualityDimension =
  (typeof CIVILIZATION_HISTORICAL_QUALITY_DIMENSIONS)[number];

/**
 * Authored historical meaning that cannot be inferred safely from structural
 * state alone. Magnitudes reuse the Stability vocabulary without altering the
 * Stability track.
 */
export interface CivilizationOutcomeSignal {
  signalId: string;
  dimension: CivilizationHistoricalQualityDimension;
  direction: 'support' | 'pressure';
  magnitude: CivilizationStabilityImpact;
  label: string;
}

/** Adversity is context for recovery credit, never a fifth quality dimension. */
export interface CivilizationAdversityEvidence {
  evidenceId: string;
  magnitude: CivilizationStabilityImpact;
  label: string;
  recoveryEligible: boolean;
}

export interface CivilizationEventHistoryEntry {
  eventId: string;
  definitionId?: CivilizationEventCardId;
  rulesVersion?: string;
  targetEvidence?: CivilizationEventTargetEvidence[];
  source: CivilizationArtifactChangeSource;
  turnCount: number | null;
  form: CivilizationResolutionForm;
  pressureTags: CivilizationPressureTag[];
  selectedTrajectoryId: string;
  outcome: 'success' | 'failure';
  summary: string;
  history: Record<string, string>;
  outcomeSignals: CivilizationOutcomeSignal[];
  adversity: CivilizationAdversityEvidence | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationStabilityCalibration {
  id: string;
  baseline: number;
  minimum: number;
  maximum: number;
  stableMinimum: number;
  strainedMinimum: number;
  unstableMinimum: number;
}

/**
 * Competitive v1 Stability calibration. The 80-point baseline leaves room for
 * visible support while ensuring one modest pressure does not immediately
 * change band. Crisis requires compound systemic harm or homeworld loss.
 */
export const CIVILIZATION_STABILITY_CALIBRATION_V1 = {
  id: 'civilization-stability-v1',
  baseline: 80,
  minimum: 0,
  maximum: 100,
  stableMinimum: 70,
  strainedMinimum: 45,
  unstableMinimum: 20,
} as const satisfies CivilizationStabilityCalibration;

export const CIVILIZATION_STABILITY_IMPACT_MAGNITUDES = {
  trace: 3,
  minor: 5,
  material: 10,
  severe: 20,
  catastrophic: 35,
} as const;

export type CivilizationStabilityImpact =
  keyof typeof CIVILIZATION_STABILITY_IMPACT_MAGNITUDES;

export type CivilizationManifestationSourceType = 'artifact' | 'blueprint';

export interface CivilizationManifestationAssignment {
  sourceId: string;
  sourceType: CivilizationManifestationSourceType;
  nativeScene: CivilizationCameraScale;
  placementFamily: ArtifactPlacementFamily;
  socketId: string;
  assignmentTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export const CIVILIZATION_MANIFESTATION_SOCKET_RESERVE_RATIO = 1.25 as const;

export interface CivilizationState {
  version: typeof CIVILIZATION_STATE_VERSION;
  environmentIdentity: CivilizationEnvironmentIdentity;
  artifacts: Record<string, CivilizationArtifactLifecycleState>;
  /** Backend-owned Blueprint projects, including private assembly progress. */
  projects: Record<string, CivilizationProjectLifecycleState>;
  /**
   * Compatibility summary of all lifetime Affinity development. Its dyad
   * fields mirror `districtIdentity`, which is authoritative for presentation.
   */
  affinityIdentity: CivilizationAffinityIdentity;
  districtIdentity: CivilizationDistrictIdentityState;
  /** Deprecated scale history retained for save compatibility and inspection. */
  identityScales: CivilizationNestedIdentityState;
  scale: CivilizationScaleState;
  homeworldId: string;
  worlds: Record<string, CivilizationWorld>;
  entities: Record<string, CivilizationEntity>;
  conditions: Record<string, CivilizationCondition>;
  stability: CivilizationStabilityState;
  manifestationAssignments: Record<string, CivilizationManifestationAssignment>;
  events: CivilizationEventHistoryEntry[];
  legacy: CivilizationLegacyState;
}

/**
 * Public, identity-safe Civilization projection carried by live game state.
 *
 * Internal causal IDs are intentionally absent: a Condition or Stability
 * contributor may originate in a sealed Blueprint, Chronicle, or scenario.
 * The public projection preserves the inspectable consequence without leaking
 * the concealed source record.
 */
export interface CivilizationPublicArtifactState {
  artifactId: string;
  firstMasteredTurnCount: number | null;
  masteryCount: number;
  implementationState: CivilizationArtifactImplementationState | null;
  implementationStateChangedTurnCount: number | null;
  changeSourceType: CivilizationArtifactChangeSource['sourceType'] | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationPublicConditionState {
  type: CivilizationConditionType;
  coreType: CivilizationCoreCondition | null;
  targetKind: CivilizationEntityReference['kind'];
  sourceType: CivilizationArtifactChangeSource['sourceType'];
  appliedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationPublicStabilityContributor {
  direction: CivilizationStabilityContributor['direction'];
  magnitude: number;
  label: string;
  sourceType: CivilizationArtifactChangeSource['sourceType'];
  targetKind: CivilizationEntityReference['kind'] | null;
  appliedTurnCount: number | null;
  resolvedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationPublicEventHistoryEntry {
  eventId: string;
  definitionId?: CivilizationEventCardId;
  rulesVersion?: string;
  targetEvidence?: CivilizationEventTargetEvidence[];
  sourceType: CivilizationArtifactChangeSource['sourceType'];
  turnCount: number | null;
  form: CivilizationResolutionForm;
  pressureTags: CivilizationPressureTag[];
  outcome: 'success' | 'failure';
  summary: string;
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationPublicProjectState {
  projectId: string;
  blueprintId: BlueprintId;
  slotIndex: number;
  status: 'manifested';
  deviceState: BlueprintDeviceState;
  presentationVariant: BlueprintPresentationVariant;
  manifestedTurnCount: number | null;
  stateChangedTurnCount: number | null;
  activeCapabilityIds: CivilizationCapabilityId[];
  historyEvidence: CivilizationHistoryEvidence;
}

export interface CivilizationPublicState {
  version: typeof CIVILIZATION_STATE_VERSION;
  environmentIdentity: CivilizationEnvironmentIdentity;
  artifacts: CivilizationPublicArtifactState[];
  affinityIdentity: CivilizationAffinityIdentity;
  districtIdentity: CivilizationDistrictIdentityState;
  identityScales: CivilizationNestedIdentityState;
  scale: Pick<
    CivilizationScaleState,
    | 'historicalMaturity'
    | 'currentReach'
    | 'currentReachCondition'
    | 'literalKardashevType'
    | 'literalKardashevEvidence'
  >;
  stability: {
    band: CivilizationStabilityBand;
    score: number | null;
    calibrationId: string | null;
    contributors: CivilizationPublicStabilityContributor[];
    calculatedTurnCount: number | null;
    historyEvidence: CivilizationHistoryEvidence;
  };
  activeConditions: CivilizationPublicConditionState[];
  /** Manifested projects only. Assembly remains private to the owner. */
  projects?: CivilizationPublicProjectState[];
  activeCapabilityIds: CivilizationCapabilityId[];
  manifestationAssignments: CivilizationManifestationAssignment[];
  events: CivilizationPublicEventHistoryEntry[];
  legacy: CivilizationLegacyState;
  /** Current Legacy qualification without contributions from damaged Artifacts. */
  legacyArtifactEligibility?: CivilizationLegacyArtifactEligibility;
}

const CIVILIZATION_AFFINITY_INDEX = Object.fromEntries(
  STANDARD_AFFINITY_KEYS.map((affinity, index) => [affinity, index]),
) as Record<StandardAffinityKey, number>;

const CIVILIZATION_DYAD_BY_PAIR = Object.fromEntries(
  CIVILIZATION_DYAD_DEFINITIONS.map((definition) => [
    [...definition.affinities]
      .sort((a, b) => CIVILIZATION_AFFINITY_INDEX[a] - CIVILIZATION_AFFINITY_INDEX[b])
      .join(':'),
    definition,
  ]),
) as Record<string, (typeof CIVILIZATION_DYAD_DEFINITIONS)[number]>;

export function emptyCivilizationNaturalAffinityCounts(): CivilizationNaturalAffinityCounts {
  return { flare: 0, radiance: 0, verdance: 0, continuum: 0, abyss: 0 };
}

export function getCivilizationDyad(
  first: StandardAffinityKey,
  second: StandardAffinityKey,
): (typeof CIVILIZATION_DYAD_DEFINITIONS)[number] | null {
  const key = [first, second]
    .sort((a, b) => CIVILIZATION_AFFINITY_INDEX[a] - CIVILIZATION_AFFINITY_INDEX[b])
    .join(':');
  return CIVILIZATION_DYAD_BY_PAIR[key] ?? null;
}

function emptyCivilizationDyadInfluence(): Record<CivilizationDyadId, number> {
  return Object.fromEntries(
    CIVILIZATION_DYAD_DEFINITIONS.map((definition) => [definition.id, 0]),
  ) as Record<CivilizationDyadId, number>;
}

export function createInitialCivilizationDistrictIdentityState(
  historyEvidence: CivilizationHistoryEvidence = 'recorded',
): CivilizationDistrictIdentityState {
  return {
    policyId: CIVILIZATION_DISTRICT_IDENTITY_POLICY_ID,
    districts: {},
    artifactAssignments: {},
    influenceByDyad: emptyCivilizationDyadInfluence(),
    totalInfluence: 0,
    rawDominantDyad: null,
    presentationDyad: null,
    calculatedTurnCount: historyEvidence === 'recorded' ? 0 : null,
    presentationCommittedTurnCount: historyEvidence === 'recorded' ? 0 : null,
    historyEvidence,
  };
}

function isCivilizationSurfaceDistrictFamily(
  placement: ArtifactPlacementFamily,
): placement is CivilizationSurfaceDistrictFamily {
  return (CIVILIZATION_SURFACE_DISTRICT_FAMILIES as readonly ArtifactPlacementFamily[])
    .includes(placement);
}

function civilizationDistrictId(
  family: CivilizationSurfaceDistrictFamily,
  instance: number,
): string {
  return `district:${family}:${instance}`;
}

function nextCivilizationDistrictInstance(
  districts: Readonly<Record<string, CivilizationDistrictInstance>>,
  family: CivilizationSurfaceDistrictFamily,
): number {
  return Object.values(districts)
    .filter((district) => district.family === family)
    .reduce((highest, district) => Math.max(highest, district.instance + 1), 0);
}

function createCivilizationDistrictInstance(
  family: CivilizationSurfaceDistrictFamily,
  instance: number,
  turnCount: number | null,
  historyEvidence: CivilizationHistoryEvidence,
): CivilizationDistrictInstance {
  return {
    districtId: civilizationDistrictId(family, instance),
    family,
    instance,
    residentArtifactIds: [],
    residentAffinities: [],
    foundingAffinities: [],
    permanentDyad: null,
    softCapacity: CIVILIZATION_DISTRICT_SOFT_CAPACITY,
    hardCapacity: CIVILIZATION_DISTRICT_HARD_CAPACITY,
    influence: 0,
    establishedTurnCount: turnCount,
    committedTurnCount: null,
    historyEvidence,
  };
}

function districtFamilyPreference(
  families: readonly CivilizationSurfaceDistrictFamily[],
  family: CivilizationSurfaceDistrictFamily,
): number {
  const index = families.indexOf(family);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}

const CIVILIZATION_DISTRICT_PLACEMENT_STRENGTH_RANK = {
  native: 0,
  natural: 1,
  adaptable: 2,
} as const satisfies Record<ArtifactDistrictPlacementStrength, number>;

interface CivilizationDistrictPlacementPolicy {
  strengthByFamily?: Partial<
    Record<CivilizationSurfaceDistrictFamily, ArtifactDistrictPlacementStrength>
  >;
  anchorFamily?: CivilizationSurfaceDistrictFamily | null;
}

function selectCivilizationDistrictForArtifact(
  districts: Record<string, CivilizationDistrictInstance>,
  compatibleFamilies: readonly CivilizationSurfaceDistrictFamily[],
  affinity: StandardAffinityKey,
  turnCount: number | null,
  historyEvidence: CivilizationHistoryEvidence,
  policy: CivilizationDistrictPlacementPolicy = {},
): CivilizationDistrictInstance {
  if (
    policy.anchorFamily &&
    compatibleFamilies.includes(policy.anchorFamily) &&
    !Object.values(districts).some((district) => district.family === policy.anchorFamily)
  ) {
    const anchored = createCivilizationDistrictInstance(
      policy.anchorFamily,
      nextCivilizationDistrictInstance(districts, policy.anchorFamily),
      turnCount,
      historyEvidence,
    );
    districts[anchored.districtId] = anchored;
    return anchored;
  }
  const compatibleDistricts = Object.values(districts)
    .filter((district) => compatibleFamilies.includes(district.family));
  const familyOccupancy = new Map(compatibleFamilies.map((family) => [
    family,
    compatibleDistricts.filter((district) => district.family === family)
      .reduce((total, district) => total + district.residentArtifactIds.length, 0),
  ]));
  const candidates: {
    district: CivilizationDistrictInstance;
    fit: number;
    isNew: boolean;
    strength: number;
  }[] = [];

  const placementStrength = (family: CivilizationSurfaceDistrictFamily) => (
    CIVILIZATION_DISTRICT_PLACEMENT_STRENGTH_RANK[
      policy.strengthByFamily?.[family] ?? (
        districtFamilyPreference(compatibleFamilies, family) === 0 ? 'native' : 'natural'
      )
    ]
  );

  for (const district of compatibleDistricts) {
    const occupancy = district.residentArtifactIds.length;
    if (occupancy >= district.hardCapacity) continue;
    const matchesPair = district.permanentDyad !== null &&
      (district.foundingAffinities as readonly StandardAffinityKey[]).includes(affinity);
    const establishesPair = district.permanentDyad === null &&
      district.residentAffinities.length === 1 &&
      district.residentAffinities[0] !== affinity;
    // The third slot is reserved for establishing or reinforcing a pair.
    if (occupancy >= district.softCapacity && !matchesPair && !establishesPair) continue;
    const matchesAffinity = district.permanentDyad !== null
      ? matchesPair
      : district.residentAffinities.includes(affinity);
    const fit = occupancy === 0 ? 2 : matchesAffinity ? 0 : establishesPair ? 1 : null;
    if (fit !== null) candidates.push({
      district,
      fit,
      isNew: false,
      strength: placementStrength(district.family),
    });
  }

  for (const family of compatibleFamilies) {
    candidates.push({
      district: createCivilizationDistrictInstance(
        family, nextCivilizationDistrictInstance(districts, family), turnCount, historyEvidence,
      ),
      fit: 2,
      isNew: true,
      strength: placementStrength(family),
    });
  }

  candidates.sort((left, right) => (
    left.fit - right.fit ||
    familyOccupancy.get(left.district.family)! - familyOccupancy.get(right.district.family)! ||
    right.district.residentArtifactIds.length - left.district.residentArtifactIds.length ||
    // Reuse an equivalent empty district instead of opening a new one.
    Number(left.isNew) - Number(right.isNew) ||
    (left.district.establishedTurnCount ?? Number.MAX_SAFE_INTEGER) -
      (right.district.establishedTurnCount ?? Number.MAX_SAFE_INTEGER) ||
    left.strength - right.strength ||
    districtFamilyPreference(compatibleFamilies, left.district.family) -
      districtFamilyPreference(compatibleFamilies, right.district.family) ||
    left.district.instance - right.district.instance ||
    left.district.districtId.localeCompare(right.district.districtId)
  ));
  const selected = candidates[0]!;
  if (selected.isNew) districts[selected.district.districtId] = selected.district;
  return selected.district;
}

export function getCivilizationRawDominantDistrictDyad(
  influenceByDyad: Readonly<Record<CivilizationDyadId, number>>,
): CivilizationDyadId | null {
  const rankedInfluence = CIVILIZATION_DYAD_DEFINITIONS
    .map((definition) => ({ dyad: definition.id, influence: influenceByDyad[definition.id] }))
    .sort((left, right) => right.influence - left.influence);
  const leadingInfluence = rankedInfluence[0]?.influence ?? 0;
  return leadingInfluence > 0 &&
    rankedInfluence.filter((entry) => entry.influence === leadingInfluence).length === 1
    ? rankedInfluence[0]!.dyad
    : null;
}

export function resolveCivilizationDistrictPresentationDyad(
  influenceByDyad: Readonly<Record<CivilizationDyadId, number>>,
  incumbent: CivilizationDyadId | null,
): CivilizationDyadId | null {
  const challenger = getCivilizationRawDominantDistrictDyad(influenceByDyad);
  if (!incumbent) return challenger;
  if (!challenger || challenger === incumbent) return incumbent;
  const totalInfluence = Object.values(influenceByDyad).reduce(
    (total, influence) => total + influence,
    0,
  );
  if (totalInfluence <= 0) return incumbent;
  const challengerShare = influenceByDyad[challenger] / totalInfluence;
  const incumbentShare = influenceByDyad[incumbent] / totalInfluence;
  return challengerShare > incumbentShare + CIVILIZATION_DISTRICT_DYAD_REPLACEMENT_MARGIN
    ? challenger
    : incumbent;
}

export interface ReconcileCivilizationDistrictIdentityOptions {
  /** Civilization-wide presentation changes are committed only at turn end. */
  commitPresentation?: boolean;
  historyEvidence?: CivilizationHistoryEvidence;
}

/**
 * Rebuilds the deterministic Surface district model while preserving every
 * established assignment and permanent district dyad.
 */
export function reconcileCivilizationDistrictIdentityState(
  state: Pick<
    CivilizationState,
    'artifacts' | 'manifestationAssignments' | 'districtIdentity' | 'affinityIdentity'
  >,
  turnCount: number | null,
  options: ReconcileCivilizationDistrictIdentityOptions = {},
): CivilizationDistrictIdentityState {
  const previous = state.districtIdentity?.policyId === CIVILIZATION_DISTRICT_IDENTITY_POLICY_ID
    ? state.districtIdentity
    : createInitialCivilizationDistrictIdentityState('legacy_inferred');
  const defaultHistoryEvidence = options.historyEvidence ?? previous.historyEvidence;
  const districts = Object.fromEntries(
    Object.values(previous.districts ?? {})
      .filter((district) => (
        (CIVILIZATION_SURFACE_DISTRICT_FAMILIES as readonly string[]).includes(district.family) &&
        Number.isInteger(district.instance) &&
        district.instance >= 0
      ))
      .map((district) => [district.districtId, {
        ...district,
        residentArtifactIds: [],
        residentAffinities: [],
        foundingAffinities: district.permanentDyad ? [...district.foundingAffinities] : [],
        softCapacity: CIVILIZATION_DISTRICT_SOFT_CAPACITY,
        hardCapacity: CIVILIZATION_DISTRICT_HARD_CAPACITY,
        influence: 0,
      }]),
  ) as Record<string, CivilizationDistrictInstance>;
  const artifactAssignments: Record<string, string> = {};
  const artifactProfiles = ARTIFACT_MANIFESTATION_PROFILE_BY_ID as Readonly<
    Record<string, ArtifactManifestationProfile>
  >;

  const artifacts = Object.values(state.artifacts)
    .filter((artifact) => artifact.masteryCount > 0)
    .sort((left, right) => (
      (left.firstMasteredTurnCount ?? Number.MAX_SAFE_INTEGER) -
        (right.firstMasteredTurnCount ?? Number.MAX_SAFE_INTEGER) ||
      left.artifactId.localeCompare(right.artifactId)
    ))
    .flatMap((artifact) => {
      const profile = artifactProfiles[artifact.artifactId];
      if (!profile || profile.nativeCameraScale !== 'surface') return [];
      const definition = ARTIFACT_DEFINITION_BY_ID[
        artifact.artifactId as keyof typeof ARTIFACT_DEFINITION_BY_ID
      ];
      if (!definition) return [];
      const compatibleFamilies = profile.compatiblePlacementFamilies.filter(
        isCivilizationSurfaceDistrictFamily,
      );
      if (compatibleFamilies.length === 0) return [];
      const placementStrengthByFamily = Object.fromEntries(
        compatibleFamilies.map((family) => [
          family,
          profile.districtPlacementStrengthByFamily[family] ?? 'natural',
        ]),
      ) as Partial<
        Record<CivilizationSurfaceDistrictFamily, ArtifactDistrictPlacementStrength>
      >;
      const anchorFamily = profile.districtAnchorFamily &&
        isCivilizationSurfaceDistrictFamily(profile.districtAnchorFamily)
        ? profile.districtAnchorFamily
        : null;
      const migrationPlacement = state.manifestationAssignments?.[`artifact:${artifact.artifactId}`]
        ?.placementFamily;
      const migrationFamily = migrationPlacement && isCivilizationSurfaceDistrictFamily(migrationPlacement) &&
        compatibleFamilies.includes(migrationPlacement) ? migrationPlacement : null;
      return [{
        artifact,
        affinity: definition.bonusAffinity,
        compatibleFamilies,
        placementStrengthByFamily,
        anchorFamily,
        migrationFamily,
        historyEvidence: artifact.historyEvidence === 'legacy_inferred'
          ? 'legacy_inferred' as const
          : defaultHistoryEvidence,
      }];
    });

  const assign = (entry: (typeof artifacts)[number], district: CivilizationDistrictInstance) => {
    const { artifact, affinity, historyEvidence } = entry;
    district.residentArtifactIds.push(artifact.artifactId);
    if (!district.residentAffinities.includes(affinity)) district.residentAffinities.push(affinity);
    if (!district.permanentDyad) {
      const firstAffinity = district.foundingAffinities[0] ?? affinity;
      if (district.foundingAffinities.length === 0) {
        district.foundingAffinities = [firstAffinity];
      } else if (affinity !== firstAffinity) {
        const dyad = getCivilizationDyad(firstAffinity, affinity);
        if (dyad) {
          district.foundingAffinities = [firstAffinity, affinity];
          district.permanentDyad = dyad.id;
          district.committedTurnCount = artifact.firstMasteredTurnCount ?? turnCount;
        }
      }
    }
    if (historyEvidence === 'legacy_inferred') district.historyEvidence = 'legacy_inferred';
    artifactAssignments[artifact.artifactId] = district.districtId;
  };

  // Reserve established residents first, including those with unknown Forge dates.
  // A newly dated Artifact must never take a saved resident's last slot.
  for (const entry of artifacts) {
    const districtId = previous.artifactAssignments?.[entry.artifact.artifactId];
    const district = districtId ? districts[districtId] : undefined;
    if (district && entry.compatibleFamilies.includes(district.family) &&
      district.residentArtifactIds.length < district.hardCapacity) assign(entry, district);
  }

  // Legacy physical placements are also fixed. Reconstruct their districts before
  // scoring genuinely unassigned works, without moving an existing manifestation.
  for (const entry of artifacts.filter((entry) => entry.migrationFamily !== null)) {
    if (artifactAssignments[entry.artifact.artifactId]) continue;
    assign(entry, selectCivilizationDistrictForArtifact(
      districts, [entry.migrationFamily!], entry.affinity,
      entry.artifact.firstMasteredTurnCount, entry.historyEvidence,
    ));
  }
  for (const entry of artifacts) {
    if (artifactAssignments[entry.artifact.artifactId]) continue;
    assign(entry, selectCivilizationDistrictForArtifact(
      districts, entry.compatibleFamilies, entry.affinity,
      entry.artifact.firstMasteredTurnCount, entry.historyEvidence,
      {
        strengthByFamily: entry.placementStrengthByFamily,
        anchorFamily: entry.anchorFamily,
      },
    ));
  }

  const influenceByDyad = emptyCivilizationDyadInfluence();
  Object.values(districts).forEach((district) => {
    district.influence = district.permanentDyad ? district.residentArtifactIds.length : 0;
    if (district.permanentDyad) {
      influenceByDyad[district.permanentDyad] += district.influence;
    }
  });
  const totalInfluence = Object.values(influenceByDyad).reduce((total, value) => total + value, 0);
  const rawDominantDyad = getCivilizationRawDominantDistrictDyad(influenceByDyad);

  const reconstructingLegacyDistricts = previous.historyEvidence === 'legacy_inferred' &&
    Object.keys(previous.artifactAssignments).length === 0;
  let presentationDyad = reconstructingLegacyDistricts
    ? rawDominantDyad
    : previous.presentationDyad;
  let presentationCommittedTurnCount = previous.presentationCommittedTurnCount;
  if (options.commitPresentation) {
    presentationDyad = resolveCivilizationDistrictPresentationDyad(
      influenceByDyad,
      presentationDyad,
    );
    presentationCommittedTurnCount = turnCount;
  }

  return {
    policyId: CIVILIZATION_DISTRICT_IDENTITY_POLICY_ID,
    districts,
    artifactAssignments,
    influenceByDyad,
    totalInfluence,
    rawDominantDyad,
    presentationDyad,
    calculatedTurnCount: turnCount,
    presentationCommittedTurnCount,
    historyEvidence: Object.values(districts).some(
      (district) => district.historyEvidence === 'legacy_inferred',
    ) ? 'legacy_inferred' : defaultHistoryEvidence,
  };
}

function applyCivilizationDistrictDirectionToAffinityIdentity(
  derived: CivilizationAffinityIdentity,
  districtIdentity: CivilizationDistrictIdentityState,
  previous: CivilizationAffinityIdentity | null | undefined,
  turnCount: number | null,
): CivilizationAffinityIdentity {
  const presentationDyad = districtIdentity.presentationDyad;
  const epochs = previous?.identityEpochs?.map((epoch) => ({ ...epoch })) ?? [];
  const activeEpoch = epochs.at(-1);
  if (presentationDyad && activeEpoch?.dyad !== presentationDyad) {
    if (activeEpoch?.endedTurnCount === null) {
      epochs[epochs.length - 1] = { ...activeEpoch, endedTurnCount: turnCount };
    }
    epochs.push({
      epochIndex: epochs.length,
      dyad: presentationDyad,
      startedTurnCount: turnCount,
      endedTurnCount: null,
      historicalSharesAtStart: derived.normalizedHistoricalShares,
      historyEvidence: districtIdentity.historyEvidence,
    });
  } else if (presentationDyad && epochs.length === 0) {
    epochs.push({
      epochIndex: 0,
      dyad: presentationDyad,
      startedTurnCount: turnCount,
      endedTurnCount: null,
      historicalSharesAtStart: derived.normalizedHistoricalShares,
      historyEvidence: districtIdentity.historyEvidence,
    });
  }

  return {
    ...derived,
    form: presentationDyad || districtIdentity.rawDominantDyad ? 'dyad' : derived.form,
    dominantDyad: districtIdentity.rawDominantDyad,
    foundingDyad: previous?.foundingDyad ?? epochs[0]?.dyad ?? presentationDyad,
    presentationDyad,
    identityEpochs: epochs,
  };
}

/**
 * Derives historical identity from mastered Artifact bonuses and operational
 * capability from current implementations. Singularity and held Affinities
 * cannot enter either profile.
 */
export function deriveCivilizationAffinityIdentity(
  artifacts: Readonly<Record<string, CivilizationArtifactLifecycleState>>,
): CivilizationAffinityIdentity {
  const historicalCounts = emptyCivilizationNaturalAffinityCounts();
  const operationalCounts = emptyCivilizationNaturalAffinityCounts();

  for (const lifecycle of Object.values(artifacts)) {
    const definition = ARTIFACT_DEFINITION_BY_ID[lifecycle.artifactId as keyof typeof ARTIFACT_DEFINITION_BY_ID];
    if (!definition) continue;
    historicalCounts[definition.bonusAffinity] += Math.max(0, lifecycle.masteryCount);
    if (lifecycle.implementationState === 'operational') {
      operationalCounts[definition.bonusAffinity] += 1;
    }
  }

  const rankedAffinities = STANDARD_AFFINITY_KEYS
    .map((affinity) => ({
      affinity,
      historicalWeight: historicalCounts[affinity],
      operationalWeight: operationalCounts[affinity],
    }))
    .sort((a, b) =>
      b.historicalWeight - a.historicalWeight ||
      CIVILIZATION_AFFINITY_INDEX[a.affinity] - CIVILIZATION_AFFINITY_INDEX[b.affinity],
    );
  const total = rankedAffinities.reduce((sum, entry) => sum + entry.historicalWeight, 0);
  const primary = rankedAffinities[0];
  const secondary = rankedAffinities[1];
  const third = rankedAffinities[2];
  const primaryWeight = primary?.historicalWeight ?? 0;
  const topTieCount = primaryWeight > 0
    ? rankedAffinities.filter((entry) => entry.historicalWeight === primaryWeight).length
    : 0;
  const secondaryRatio = primaryWeight > 0 ? (secondary?.historicalWeight ?? 0) / primaryWeight : 0;
  const thirdRatio = primaryWeight > 0 ? (third?.historicalWeight ?? 0) / primaryWeight : 0;
  const plural = topTieCount >= 3;
  const dyad = !plural && secondaryRatio >= 0.45
    ? getCivilizationDyad(primary.affinity, secondary.affinity)
    : null;
  const operationalTotal = STANDARD_AFFINITY_KEYS.reduce(
    (sum, affinity) => sum + operationalCounts[affinity],
    0,
  );
  const normalizedHistoricalShares = Object.fromEntries(
    STANDARD_AFFINITY_KEYS.map((affinity) => [
      affinity,
      total > 0 ? historicalCounts[affinity] / total : 0,
    ]),
  ) as CivilizationNaturalAffinityCounts;
  const normalizedOperationalShares = Object.fromEntries(
    STANDARD_AFFINITY_KEYS.map((affinity) => [
      affinity,
      operationalTotal > 0 ? operationalCounts[affinity] / operationalTotal : 0,
    ]),
  ) as CivilizationNaturalAffinityCounts;

  return {
    policyId: 'provisional-ratio-v1',
    form: total === 0 ? 'unformed' : plural ? 'plural' : dyad ? 'dyad' : 'singular',
    historicalCounts,
    operationalCounts,
    rankedAffinities,
    dominantAffinity: topTieCount === 1 ? primary.affinity : null,
    dominantDyad: dyad?.id ?? null,
    foundingDyad: dyad?.id ?? null,
    presentationDyad: dyad?.id ?? null,
    identityEpochs: dyad ? [{
      epochIndex: 0,
      dyad: dyad.id,
      startedTurnCount: null,
      endedTurnCount: null,
      historicalSharesAtStart: normalizedHistoricalShares,
      historyEvidence: 'recorded',
    }] : [],
    normalizedHistoricalShares,
    normalizedOperationalShares,
    thirdAffinity: dyad && thirdRatio >= 0.45 ? third.affinity : null,
    dominantShare: total > 0 ? primaryWeight / total : 0,
    secondaryToPrimaryRatio: secondaryRatio,
    thirdToPrimaryRatio: thirdRatio,
  };
}

const CIVILIZATION_DYAD_REPLACEMENT_MARGIN = 0.15;
const CIVILIZATION_DYAD_MINIMUM_AFFINITY_SHARE = 0.15;

function dyadCombinedShare(
  dyadId: CivilizationDyadId | null,
  shares: CivilizationNaturalAffinityCounts,
): number {
  if (!dyadId) return 0;
  const dyad = CIVILIZATION_DYAD_DEFINITIONS.find((candidate) => candidate.id === dyadId);
  if (!dyad) return 0;
  return shares[dyad.affinities[0]] + shares[dyad.affinities[1]];
}

/**
 * Preserves architectural history while allowing a decisively stronger dyad
 * to become the presented identity. Raw affinity dominance remains available
 * through `dominantDyad`; only presentation uses the hysteretic result.
 */
export function evolveCivilizationAffinityIdentity(
  derived: CivilizationAffinityIdentity,
  previous: CivilizationAffinityIdentity | null | undefined,
  turnCount: number | null,
  historyEvidence: CivilizationHistoryEvidence = 'recorded',
): CivilizationAffinityIdentity {
  const previousPresentation = previous?.presentationDyad ?? previous?.dominantDyad ?? null;
  const challenger = derived.dominantDyad;
  let presentationDyad = previousPresentation;

  if (!presentationDyad) {
    presentationDyad = challenger;
  } else if (challenger && challenger !== presentationDyad) {
    const challengerDefinition = CIVILIZATION_DYAD_DEFINITIONS.find(
      (candidate) => candidate.id === challenger,
    );
    const candidateEligible = Boolean(challengerDefinition) && challengerDefinition!.affinities.every(
      (affinity) => derived.normalizedHistoricalShares[affinity] >= CIVILIZATION_DYAD_MINIMUM_AFFINITY_SHARE,
    );
    const challengerShare = dyadCombinedShare(challenger, derived.normalizedHistoricalShares);
    const incumbentShare = dyadCombinedShare(presentationDyad, derived.normalizedHistoricalShares);
    if (candidateEligible && challengerShare > incumbentShare + CIVILIZATION_DYAD_REPLACEMENT_MARGIN) {
      presentationDyad = challenger;
    }
  }

  const previousEpochs = previous?.identityEpochs?.length
    ? previous.identityEpochs.map((epoch) => ({ ...epoch }))
    : previousPresentation
      ? [{
          epochIndex: 0,
          dyad: previousPresentation,
          startedTurnCount: null,
          endedTurnCount: null,
          historicalSharesAtStart: previous?.normalizedHistoricalShares
            ?? derived.normalizedHistoricalShares,
          historyEvidence: 'legacy_inferred' as const,
        }]
      : [];
  const activeEpoch = previousEpochs[previousEpochs.length - 1];
  if (presentationDyad && activeEpoch?.dyad !== presentationDyad) {
    if (activeEpoch && activeEpoch.endedTurnCount === null) {
      previousEpochs[previousEpochs.length - 1] = {
        ...activeEpoch,
        endedTurnCount: turnCount,
      };
    }
    previousEpochs.push({
      epochIndex: previousEpochs.length,
      dyad: presentationDyad,
      startedTurnCount: turnCount,
      endedTurnCount: null,
      historicalSharesAtStart: derived.normalizedHistoricalShares,
      historyEvidence,
    });
  }

  return {
    ...derived,
    foundingDyad: previous?.foundingDyad ?? previousEpochs[0]?.dyad ?? presentationDyad,
    presentationDyad,
    identityEpochs: previousEpochs,
  };
}

function createCivilizationIdentityLayerState(
  layer: CivilizationIdentityLayer,
  historyEvidence: CivilizationHistoryEvidence,
): CivilizationIdentityLayerState {
  return {
    policyId: CIVILIZATION_NESTED_IDENTITY_POLICY_ID,
    layer,
    status: 'plain',
    eraStartedTurnCount: layer === 'city' && historyEvidence === 'recorded' ? 0 : null,
    affinityCounts: emptyCivilizationNaturalAffinityCounts(),
    normalizedShares: emptyCivilizationNaturalAffinityCounts(),
    rankedAffinities: STANDARD_AFFINITY_KEYS.map((affinity) => ({ affinity, weight: 0 })),
    dominantAffinity: null,
    candidateDyad: null,
    committedDyad: null,
    committedTurnCount: null,
    evidence: [],
    historyEvidence,
  };
}

export function createInitialCivilizationNestedIdentityState(
  historyEvidence: CivilizationHistoryEvidence = 'recorded',
): CivilizationNestedIdentityState {
  return Object.fromEntries(
    CIVILIZATION_IDENTITY_LAYERS.map((layer) => [
      layer,
      createCivilizationIdentityLayerState(layer, historyEvidence),
    ]),
  ) as CivilizationNestedIdentityState;
}

function summarizeCivilizationIdentityEvidence(
  evidence: readonly CivilizationIdentityEvidence[],
): Pick<
  CivilizationIdentityLayerState,
  | 'affinityCounts'
  | 'normalizedShares'
  | 'rankedAffinities'
  | 'dominantAffinity'
  | 'candidateDyad'
> {
  const affinityCounts = emptyCivilizationNaturalAffinityCounts();
  for (const entry of evidence) affinityCounts[entry.affinity] += 1;
  const rankedAffinities = STANDARD_AFFINITY_KEYS
    .map((affinity) => ({ affinity, weight: affinityCounts[affinity] }))
    .sort((left, right) => (
      right.weight - left.weight ||
      CIVILIZATION_AFFINITY_INDEX[left.affinity] - CIVILIZATION_AFFINITY_INDEX[right.affinity]
    ));
  const total = evidence.length;
  const primary = rankedAffinities[0];
  const secondary = rankedAffinities[1];
  const primaryWeight = primary?.weight ?? 0;
  const topTieCount = primaryWeight > 0
    ? rankedAffinities.filter((entry) => entry.weight === primaryWeight).length
    : 0;
  const secondaryRatio = primaryWeight > 0 ? (secondary?.weight ?? 0) / primaryWeight : 0;
  const candidateDyad = topTieCount < 3 && secondaryRatio >= 0.45 && primary && secondary
    ? getCivilizationDyad(primary.affinity, secondary.affinity)?.id ?? null
    : null;
  return {
    affinityCounts,
    normalizedShares: Object.fromEntries(
      STANDARD_AFFINITY_KEYS.map((affinity) => [
        affinity,
        total > 0 ? affinityCounts[affinity] / total : 0,
      ]),
    ) as CivilizationNaturalAffinityCounts,
    rankedAffinities,
    dominantAffinity: topTieCount === 1 ? primary?.affinity ?? null : null,
    candidateDyad,
  };
}

function rebuildCivilizationIdentityLayer(
  layerState: CivilizationIdentityLayerState,
  turnCount: number | null,
  legacyCompleted: boolean,
): CivilizationIdentityLayerState {
  const summary = summarizeCivilizationIdentityEvidence(layerState.evidence);
  const minimumEvidence = CIVILIZATION_IDENTITY_COMMITMENT_EVIDENCE[layerState.layer];
  const commitmentWindowOpen = layerState.layer === 'galaxy'
    ? legacyCompleted
    : layerState.evidence.length >= minimumEvidence;
  const canCommit = commitmentWindowOpen && summary.candidateDyad !== null;
  const committedDyad = layerState.committedDyad ?? (canCommit ? summary.candidateDyad : null);
  const historyEvidence = layerState.historyEvidence === 'legacy_inferred' ||
    layerState.evidence.some((entry) => entry.historyEvidence === 'legacy_inferred')
    ? 'legacy_inferred'
    : 'recorded';
  const latestEvidenceTurn = layerState.evidence.reduce<number | null>((latest, entry) => (
    entry.routedTurnCount === null
      ? latest
      : latest === null
        ? entry.routedTurnCount
        : Math.max(latest, entry.routedTurnCount)
  ), null);
  return {
    ...layerState,
    ...summary,
    status: committedDyad
      ? 'committed'
      : layerState.evidence.length > 0
        ? 'forming'
        : 'plain',
    committedDyad,
    committedTurnCount: layerState.committedDyad
      ? layerState.committedTurnCount
      : committedDyad && historyEvidence === 'recorded'
        ? turnCount ?? latestEvidenceTurn
        : null,
    historyEvidence,
  };
}

export interface ReconcileCivilizationNestedIdentityOptions {
  /** Used exactly once while reconstructing saves that predate scale ledgers. */
  missingEvidenceHistory?: CivilizationHistoryEvidence;
}

/**
 * Routes every Artifact mastery ordinal exactly once. A committed layer is
 * immutable; later evidence advances into the next architectural era.
 */
export function reconcileCivilizationNestedIdentityState(
  state: Pick<CivilizationState, 'artifacts' | 'identityScales' | 'legacy'>,
  turnCount: number | null,
  options: ReconcileCivilizationNestedIdentityOptions = {},
): CivilizationNestedIdentityState {
  const layers = Object.fromEntries(CIVILIZATION_IDENTITY_LAYERS.map((layer) => {
    const existing = state.identityScales?.[layer]
      ?? createCivilizationIdentityLayerState(layer, options.missingEvidenceHistory ?? 'legacy_inferred');
    return [layer, {
      ...existing,
      affinityCounts: { ...existing.affinityCounts },
      normalizedShares: { ...existing.normalizedShares },
      rankedAffinities: existing.rankedAffinities.map((entry) => ({ ...entry })),
      evidence: existing.evidence.map((entry) => ({ ...entry })),
    }];
  })) as CivilizationNestedIdentityState;
  const legacyCompleted = state.legacy.completedTurnCount !== null;
  const routedEvidenceIds = new Set(
    CIVILIZATION_IDENTITY_LAYERS.flatMap((layer) => (
      layers[layer].evidence.map((entry) => entry.evidenceId)
    )),
  );
  const contributions = Object.values(state.artifacts)
    .flatMap((artifact) => {
      const definition = ARTIFACT_DEFINITION_BY_ID[
        artifact.artifactId as keyof typeof ARTIFACT_DEFINITION_BY_ID
      ];
      if (!definition) return [];
      return Array.from({ length: Math.max(0, artifact.masteryCount) }, (_, index) => ({
        evidenceId: `artifact:${artifact.artifactId}:mastery:${index + 1}`,
        artifactId: artifact.artifactId,
        masteryOrdinal: index + 1,
        affinity: definition.bonusAffinity,
        firstMasteredTurnCount: artifact.firstMasteredTurnCount,
        historyEvidence: options.missingEvidenceHistory ?? artifact.historyEvidence,
      }));
    })
    .sort((left, right) => (
      (left.firstMasteredTurnCount ?? Number.MAX_SAFE_INTEGER) -
        (right.firstMasteredTurnCount ?? Number.MAX_SAFE_INTEGER) ||
      left.artifactId.localeCompare(right.artifactId) ||
      left.masteryOrdinal - right.masteryOrdinal
    ));

  for (const contribution of contributions) {
    if (routedEvidenceIds.has(contribution.evidenceId)) continue;
    const activeLayer = CIVILIZATION_IDENTITY_LAYERS.find((layer) => (
      layers[layer].committedDyad === null
    )) ?? 'galaxy';
    const active = layers[activeLayer];
    active.evidence.push({
      evidenceId: contribution.evidenceId,
      artifactId: contribution.artifactId,
      masteryOrdinal: contribution.masteryOrdinal,
      affinity: contribution.affinity,
      routedTurnCount: contribution.historyEvidence === 'legacy_inferred'
        ? contribution.firstMasteredTurnCount
        : turnCount ?? contribution.firstMasteredTurnCount,
      historyEvidence: contribution.historyEvidence,
    });
    routedEvidenceIds.add(contribution.evidenceId);
    layers[activeLayer] = rebuildCivilizationIdentityLayer(active, turnCount, legacyCompleted);
    const activeIndex = CIVILIZATION_IDENTITY_LAYERS.indexOf(activeLayer);
    const nextLayer = CIVILIZATION_IDENTITY_LAYERS[activeIndex + 1];
    if (layers[activeLayer].committedDyad && nextLayer && layers[nextLayer].eraStartedTurnCount === null) {
      layers[nextLayer] = {
        ...layers[nextLayer],
        eraStartedTurnCount: layers[activeLayer].committedTurnCount,
      };
    }
  }

  for (const [index, layer] of CIVILIZATION_IDENTITY_LAYERS.entries()) {
    layers[layer] = rebuildCivilizationIdentityLayer(layers[layer], turnCount, legacyCompleted);
    const nextLayer = CIVILIZATION_IDENTITY_LAYERS[index + 1];
    if (layers[layer].committedDyad && nextLayer && layers[nextLayer].eraStartedTurnCount === null) {
      layers[nextLayer] = {
        ...layers[nextLayer],
        eraStartedTurnCount: layers[layer].committedTurnCount,
      };
    }
  }
  return layers;
}

export function createInitialCivilizationState(
  environmentIdentity: CivilizationEnvironmentIdentity = createCivilizationEnvironmentIdentity(
    'unassigned',
    CIVILIZATION_ENVIRONMENT_VARIANTS[0].id,
  ),
): CivilizationState {
  const homeworldId = 'world:home';
  return {
    version: CIVILIZATION_STATE_VERSION,
    environmentIdentity,
    artifacts: {},
    projects: {},
    affinityIdentity: deriveCivilizationAffinityIdentity({}),
    districtIdentity: createInitialCivilizationDistrictIdentityState(),
    identityScales: createInitialCivilizationNestedIdentityState(),
    scale: {
      historicalMaturity: 'planetary',
      historicalMaturityEvidence: [],
      currentReach: 'planetary',
      currentReachCondition: 'intact',
      currentReachEvidence: [],
      literalKardashevType: 0,
      literalKardashevEvidence: 'recorded',
    },
    homeworldId,
    worlds: {
      [homeworldId]: {
        id: homeworldId,
        role: 'homeworld',
        name: null,
        state: 'active',
        establishedTurnCount: 0,
        stateChangedTurnCount: 0,
        conditionIds: [],
        historyEvidence: 'recorded',
      },
    },
    entities: {},
    conditions: {},
    stability: {
      band: 'stable',
      score: CIVILIZATION_STABILITY_CALIBRATION_V1.baseline,
      calibrationId: CIVILIZATION_STABILITY_CALIBRATION_V1.id,
      contributors: [],
      calculatedTurnCount: 0,
      historyEvidence: 'recorded',
    },
    manifestationAssignments: {},
    events: [],
    legacy: {
      completedTurnCount: null,
      historyEvidence: 'recorded',
    },
  };
}

export function advanceCivilizationMaturity(
  scale: CivilizationScaleState,
  target: CivilizationMaturity,
  evidence: CivilizationScaleEvidence,
): CivilizationScaleState {
  const currentIndex = CIVILIZATION_MATURITY_LEVELS.indexOf(scale.historicalMaturity);
  const targetIndex = CIVILIZATION_MATURITY_LEVELS.indexOf(target);
  if (targetIndex <= currentIndex) return scale;
  return {
    ...scale,
    historicalMaturity: target,
    historicalMaturityEvidence: [...scale.historicalMaturityEvidence, evidence],
  };
}

export function setCivilizationOperationalReach(
  scale: CivilizationScaleState,
  currentReach: CivilizationOperationalReach,
  currentReachCondition: CivilizationReachCondition,
  evidence: CivilizationScaleEvidence,
): CivilizationScaleState {
  return {
    ...scale,
    currentReach,
    currentReachCondition,
    currentReachEvidence: [...scale.currentReachEvidence, evidence],
  };
}

export function upsertCivilizationWorld(
  state: CivilizationState,
  world: CivilizationWorld,
): CivilizationState {
  const role = world.id === state.homeworldId ? 'homeworld' : world.role;
  return {
    ...state,
    worlds: {
      ...state.worlds,
      [world.id]: { ...world, role },
    },
  };
}

export function upsertCivilizationEntity(
  state: CivilizationState,
  entity: CivilizationEntity,
): CivilizationState {
  return {
    ...state,
    entities: {
      ...state.entities,
      [entity.id]: entity,
    },
  };
}

export function applyCivilizationCondition(
  state: CivilizationState,
  condition: CivilizationCondition,
): CivilizationState {
  const next: CivilizationState = {
    ...state,
    conditions: {
      ...state.conditions,
      [condition.id]: condition,
    },
  };
  if (condition.target.kind === 'world') {
    const world = next.worlds[condition.target.id];
    if (world && !world.conditionIds.includes(condition.id)) {
      next.worlds = {
        ...next.worlds,
        [world.id]: { ...world, conditionIds: [...world.conditionIds, condition.id] },
      };
    }
  } else if (
    condition.target.kind === 'network' ||
    condition.target.kind === 'installation' ||
    condition.target.kind === 'project'
  ) {
    const entity = next.entities[condition.target.id];
    if (entity && !entity.conditionIds.includes(condition.id)) {
      next.entities = {
        ...next.entities,
        [entity.id]: { ...entity, conditionIds: [...entity.conditionIds, condition.id] },
      };
    }
  }
  return next;
}

export function resolveCivilizationCondition(
  state: CivilizationState,
  conditionId: string,
  resolvedTurnCount: number,
): CivilizationState {
  const condition = state.conditions[conditionId];
  if (!condition || condition.resolvedTurnCount !== null) return state;
  const next: CivilizationState = {
    ...state,
    conditions: {
      ...state.conditions,
      [conditionId]: { ...condition, resolvedTurnCount },
    },
  };
  if (condition.target.kind === 'world') {
    const world = next.worlds[condition.target.id];
    if (world) {
      next.worlds = {
        ...next.worlds,
        [world.id]: {
          ...world,
          conditionIds: world.conditionIds.filter((id) => id !== conditionId),
        },
      };
    }
  } else if (
    condition.target.kind === 'network' ||
    condition.target.kind === 'installation' ||
    condition.target.kind === 'project'
  ) {
    const entity = next.entities[condition.target.id];
    if (entity) {
      next.entities = {
        ...next.entities,
        [entity.id]: {
          ...entity,
          conditionIds: entity.conditionIds.filter((id) => id !== conditionId),
        },
      };
    }
  }
  return next;
}

export function addCivilizationStabilityContributor(
  state: CivilizationStabilityState,
  contributor: CivilizationStabilityContributor,
  calibration: CivilizationStabilityCalibration = CIVILIZATION_STABILITY_CALIBRATION_V1,
): CivilizationStabilityState {
  const contributors = [
    ...state.contributors.filter((entry) => entry.id !== contributor.id),
    contributor,
  ];
  const next = { ...state, contributors };
  return recalculateCivilizationStability(next, calibration, contributor.appliedTurnCount);
}

export function recalculateCivilizationStability(
  state: CivilizationStabilityState,
  calibration: CivilizationStabilityCalibration,
  turnCount: number | null,
): CivilizationStabilityState {
  const delta = state.contributors
    .filter((contributor) => contributor.resolvedTurnCount === null)
    .reduce(
      (sum, contributor) =>
        sum + (contributor.direction === 'support' ? contributor.magnitude : -contributor.magnitude),
      0,
    );
  const score = Math.max(calibration.minimum, Math.min(calibration.maximum, calibration.baseline + delta));
  const band: CivilizationStabilityBand = score >= calibration.stableMinimum
    ? 'stable'
    : score >= calibration.strainedMinimum
      ? 'strained'
      : score >= calibration.unstableMinimum
        ? 'unstable'
        : 'crisis';
  return {
    ...state,
    band,
    score,
    calibrationId: calibration.id,
    calculatedTurnCount: turnCount,
  };
}

export function resolveCivilizationStabilityCause(
  state: CivilizationStabilityState,
  source: CivilizationArtifactChangeSource,
  resolvedTurnCount: number,
  calibration: CivilizationStabilityCalibration = CIVILIZATION_STABILITY_CALIBRATION_V1,
): CivilizationStabilityState {
  const contributors = state.contributors.map((contributor) =>
    contributor.resolvedTurnCount === null &&
    contributor.source.sourceType === source.sourceType &&
    contributor.source.sourceId === source.sourceId
      ? { ...contributor, resolvedTurnCount }
      : contributor,
  );
  const next = { ...state, contributors };
  return recalculateCivilizationStability(next, calibration, resolvedTurnCount);
}

const CIVILIZATION_STRUCTURAL_STABILITY_PREFIX = 'structural:';
const CIVILIZATION_STABILITY_SYSTEM_SOURCE: CivilizationArtifactChangeSource = {
  sourceType: 'system',
  sourceId: CIVILIZATION_STABILITY_CALIBRATION_V1.id,
};

function structuralContributor(
  id: string,
  magnitude: number,
  label: string,
  target: CivilizationEntityReference,
  historyEvidence: CivilizationHistoryEvidence,
  source: CivilizationArtifactChangeSource = CIVILIZATION_STABILITY_SYSTEM_SOURCE,
): CivilizationStabilityContributor {
  return {
    id: `${CIVILIZATION_STRUCTURAL_STABILITY_PREFIX}${id}`,
    direction: 'pressure',
    magnitude,
    label,
    source,
    target,
    appliedTurnCount: null,
    resolvedTurnCount: null,
    historyEvidence,
  };
}

function conditionMagnitude(
  condition: CivilizationCoreCondition,
  targetKind: CivilizationEntityReference['kind'],
): number {
  switch (condition) {
    case 'damaged':
      return CIVILIZATION_STABILITY_IMPACT_MAGNITUDES.minor;
    case 'isolated':
      return targetKind === 'world' ? 12 : 8;
    case 'quarantined':
      return targetKind === 'world' ? 8 : 5;
    case 'disrupted':
      return targetKind === 'world' ? 10 : 7;
  }
}

/**
 * Converts concrete live harm into inspectable global Stability pressure.
 * Ordinary capability ownership never grants generic Stability; authored
 * supports remain explicit contributors tied to their actual cause.
 */
export function deriveCivilizationStructuralStabilityContributors(
  state: Pick<CivilizationState, 'artifacts' | 'worlds' | 'entities' | 'conditions' | 'homeworldId'>,
): CivilizationStabilityContributor[] {
  const contributors: CivilizationStabilityContributor[] = [];
  const damagedArtifactIds = new Set<string>();

  for (const lifecycle of Object.values(state.artifacts)) {
    if (lifecycle.implementationState === 'damaged') {
      damagedArtifactIds.add(lifecycle.artifactId);
      contributors.push(structuralContributor(
        `artifact:${lifecycle.artifactId}:damaged`,
        CIVILIZATION_STABILITY_IMPACT_MAGNITUDES.minor,
        'Artifact implementation damaged',
        { kind: 'artifact_implementation', id: lifecycle.artifactId },
        lifecycle.historyEvidence,
        lifecycle.implementationChangeSource ?? CIVILIZATION_STABILITY_SYSTEM_SOURCE,
      ));
    } else if (lifecycle.implementationState === 'annihilated') {
      contributors.push(structuralContributor(
        `artifact:${lifecycle.artifactId}:annihilated`,
        8,
        'Artifact implementation annihilated',
        { kind: 'artifact_implementation', id: lifecycle.artifactId },
        lifecycle.historyEvidence,
        lifecycle.implementationChangeSource ?? CIVILIZATION_STABILITY_SYSTEM_SOURCE,
      ));
    }
  }

  for (const world of Object.values(state.worlds)) {
    if (world.state !== 'annihilated') continue;
    const homeworld = world.id === state.homeworldId;
    contributors.push(structuralContributor(
      `world:${world.id}:annihilated`,
      homeworld ? 65 : 30,
      homeworld ? 'Homeworld annihilated' : 'Settled world annihilated',
      { kind: 'world', id: world.id },
      world.historyEvidence,
    ));
  }

  for (const entity of Object.values(state.entities)) {
    if (entity.state === 'operational') continue;
    contributors.push(structuralContributor(
      `entity:${entity.id}:${entity.state}`,
      entity.state === 'annihilated' ? 15 : 8,
      `${entity.kind === 'project' ? 'Project' : entity.kind === 'network' ? 'Network' : 'Installation'} ${entity.state}`,
      { kind: entity.kind, id: entity.id },
      entity.historyEvidence,
    ));
  }

  for (const condition of Object.values(state.conditions)) {
    if (condition.resolvedTurnCount !== null || !condition.coreType) continue;
    if (
      condition.target.kind === 'world' &&
      state.worlds[condition.target.id]?.state === 'annihilated'
    ) {
      continue;
    }
    if (
      (
        condition.target.kind === 'network' ||
        condition.target.kind === 'installation' ||
        condition.target.kind === 'project'
      ) &&
      state.entities[condition.target.id] !== undefined &&
      state.entities[condition.target.id]?.state !== 'operational'
    ) {
      continue;
    }
    if (
      condition.coreType === 'damaged' &&
      condition.target.kind === 'artifact_implementation' &&
      damagedArtifactIds.has(condition.target.id)
    ) {
      continue;
    }
    contributors.push(structuralContributor(
      `condition:${condition.id}`,
      conditionMagnitude(condition.coreType, condition.target.kind),
      `${condition.coreType.charAt(0).toUpperCase()}${condition.coreType.slice(1)} ${condition.target.kind.replace('_', ' ')}`,
      condition.target,
      condition.historyEvidence,
      condition.source,
    ));
  }

  return contributors.sort((left, right) => left.id.localeCompare(right.id));
}

export function recalculateCivilizationStabilityFromState(
  state: CivilizationState,
  turnCount: number | null,
  calibration: CivilizationStabilityCalibration = CIVILIZATION_STABILITY_CALIBRATION_V1,
): CivilizationStabilityState {
  const authoredContributors = state.stability.contributors.filter(
    (contributor) => !contributor.id.startsWith(CIVILIZATION_STRUCTURAL_STABILITY_PREFIX),
  );
  return recalculateCivilizationStability(
    {
      ...state.stability,
      contributors: [
        ...authoredContributors,
        ...deriveCivilizationStructuralStabilityContributors(state),
      ],
    },
    calibration,
    turnCount,
  );
}

export const CIVILIZATION_RESOLUTION_FORMS = [
  'automatic',
  'contextual',
  'state_modified',
] as const;

export type CivilizationResolutionForm = (typeof CIVILIZATION_RESOLUTION_FORMS)[number];

export type CivilizationTrajectoryRequirement =
  | { type: 'capability_active'; capabilityId: CivilizationCapabilityId }
  | { type: 'capability_absent'; capabilityId: CivilizationCapabilityId }
  | {
      type: 'pressure_capability_coverage';
      pressureTag: CivilizationPressureTag;
      minimum: Exclude<CivilizationPressureCapabilityCoverage, 'none'>;
    }
  | { type: 'minimum_pressure_aptitude'; pressureTag: CivilizationPressureTag; score: number }
  | { type: 'maximum_pressure_risk'; pressureTag: CivilizationPressureTag; score: number }
  | { type: 'condition_present'; conditionType: CivilizationConditionType }
  | { type: 'condition_absent'; conditionType: CivilizationConditionType }
  | { type: 'minimum_stability'; band: CivilizationStabilityBand }
  | { type: 'minimum_reach'; reach: CivilizationMaturity }
  | { type: 'historical_affinity'; affinity: StandardAffinityKey; minimumWeight: number }
  | { type: 'operational_affinity'; affinity: StandardAffinityKey; minimumWeight: number }
  | { type: 'dominant_dyad'; dyad: CivilizationDyadId };

export interface CivilizationResolutionSnapshot {
  activeCapabilityIds: readonly CivilizationCapabilityId[];
  activeConditionTypes: readonly CivilizationConditionType[];
  stabilityBand: CivilizationStabilityBand;
  currentReach: CivilizationOperationalReach;
  affinityIdentity: CivilizationAffinityIdentity;
}

export function buildCivilizationResolutionSnapshot(
  state: CivilizationState,
  additionalCapabilityIds: readonly CivilizationCapabilityId[] = [],
  manifestedDevices: readonly ManifestedDevicePublicState[] = [],
): CivilizationResolutionSnapshot {
  const authoritativeProjectCapabilities = deriveOperationalCivilizationProjectCapabilityIds(
    state.projects,
  );
  const projectCapabilityIds = Object.keys(state.projects ?? {}).length > 0
    ? authoritativeProjectCapabilities
    : deriveOperationalProjectCapabilityIds(manifestedDevices);
  return {
    activeCapabilityIds: [
      ...new Set([
        ...deriveOperationalArtifactCapabilityIds(state),
        ...projectCapabilityIds,
        ...additionalCapabilityIds,
      ]),
    ].sort(),
    activeConditionTypes: Object.values(state.conditions)
      .filter((condition) => condition.resolvedTurnCount === null)
      .map((condition) => condition.type)
      .filter((condition, index, conditions) => conditions.indexOf(condition) === index)
      .sort(),
    stabilityBand: state.stability.band,
    currentReach: state.scale.currentReach,
    affinityIdentity: state.affinityIdentity,
  };
}

/**
 * Derives Artifact capabilities from current implementation state only.
 * Historical mastery remains visible in Civilization history and Affinity
 * identity, but damaged, archived, annihilated, and unknown implementations
 * cannot satisfy an operational capability requirement.
 */
export function deriveOperationalArtifactCapabilityIds(
  state: Pick<CivilizationState, 'artifacts'>,
  capabilityIdsByArtifactId: Readonly<
    Partial<Record<
      string,
      | readonly CivilizationCapabilityId[]
      | { readonly capabilityIds: readonly CivilizationCapabilityId[] }
    >>
  > = ARTIFACT_TECHNOLOGY_METADATA_BY_ID,
): CivilizationCapabilityId[] {
  const capabilityIds = new Set<CivilizationCapabilityId>();
  for (const lifecycle of Object.values(state.artifacts)) {
    if (lifecycle.implementationState !== 'operational') continue;
    const metadataOrCapabilities = capabilityIdsByArtifactId[lifecycle.artifactId];
    const artifactCapabilityIds = Array.isArray(metadataOrCapabilities)
      ? metadataOrCapabilities
      : (
          metadataOrCapabilities as
            | { readonly capabilityIds: readonly CivilizationCapabilityId[] }
            | undefined
        )?.capabilityIds ?? [];
    for (const capabilityId of artifactCapabilityIds) {
      capabilityIds.add(capabilityId);
    }
  }
  return [...capabilityIds].sort();
}

/** Historical mastery remains evidence even when the local implementation is unavailable. */
export function deriveHistoricalArtifactCapabilityIds(
  state: Pick<CivilizationState, 'artifacts'>,
): ArtifactCivilizationCapabilityId[] {
  const capabilityIds = new Set<ArtifactCivilizationCapabilityId>();
  for (const lifecycle of Object.values(state.artifacts)) {
    if (lifecycle.masteryCount <= 0) continue;
    const metadata = ARTIFACT_TECHNOLOGY_METADATA_BY_ID[
      lifecycle.artifactId as keyof typeof ARTIFACT_TECHNOLOGY_METADATA_BY_ID
    ];
    for (const capabilityId of metadata?.capabilityIds ?? []) {
      capabilityIds.add(capabilityId);
    }
  }
  return [...capabilityIds].sort();
}

export interface CivilizationUncertaintyModifier {
  id: string;
  delta: number;
  label: string;
  requirements: readonly CivilizationTrajectoryRequirement[];
}

export interface CivilizationAuthoredUncertainty {
  baseSuccessChance: number;
  modifiers: readonly CivilizationUncertaintyModifier[];
}

export type CivilizationConsequence =
  | { type: 'apply_condition'; condition: CivilizationCondition }
  | { type: 'resolve_condition'; conditionId: string; resolvedTurnCount: number }
  | {
      type: 'set_artifact_implementation';
      artifactId: string;
      implementationState: CivilizationArtifactImplementationState;
      turnCount: number;
      source: CivilizationArtifactChangeSource;
    }
  | {
      type: 'set_entity_state';
      entityId: string;
      state: CivilizationEntity['state'];
      turnCount: number;
    }
  | {
      type: 'set_world_state';
      worldId: string;
      state: CivilizationWorld['state'];
      turnCount: number;
    }
  | { type: 'add_stability_contributor'; contributor: CivilizationStabilityContributor }
  | { type: 'advance_maturity'; maturity: CivilizationMaturity; evidence: CivilizationScaleEvidence }
  | {
      type: 'set_reach';
      reach: CivilizationOperationalReach;
      condition: CivilizationReachCondition;
      evidence: CivilizationScaleEvidence;
    }
  | { type: 'record_history'; key: string; value: string };

export interface CivilizationResolutionTrajectory {
  id: string;
  label: string;
  requirements: readonly CivilizationTrajectoryRequirement[];
  uncertainty: CivilizationAuthoredUncertainty | null;
  successConsequences: readonly CivilizationConsequence[];
  failureConsequences: readonly CivilizationConsequence[];
}

export interface CivilizationResolutionRequest {
  eventId: string;
  source: CivilizationArtifactChangeSource;
  form: CivilizationResolutionForm;
  /** Contextual resolution occurs inside its cause and never consumes a normal turn. */
  timing: 'trigger_window';
  pressureTags: readonly CivilizationPressureTag[];
  snapshot: CivilizationResolutionSnapshot;
  trajectories: readonly CivilizationResolutionTrajectory[];
  selectedTrajectoryId?: string | null;
  /** Authored random value in [0, 1); absent until the uncertainty step resolves. */
  uncertaintyRoll?: number | null;
}

export interface CivilizationRequirementEvaluation {
  requirement: CivilizationTrajectoryRequirement;
  satisfied: boolean;
  explanation: string;
}

export interface CivilizationTrajectoryEvaluation {
  trajectoryId: string;
  label: string;
  available: boolean;
  requirements: CivilizationRequirementEvaluation[];
  successChance: number | null;
  uncertaintyModifiers: Array<{
    id: string;
    delta: number;
    label: string;
    applied: boolean;
  }>;
}

export type CivilizationResolutionStatus =
  | 'awaiting_choice'
  | 'awaiting_uncertainty'
  | 'resolved'
  | 'no_available_trajectory'
  | 'invalid_selection';

export interface CivilizationResolutionResult {
  eventId: string;
  source: CivilizationArtifactChangeSource;
  pressureTags: readonly CivilizationPressureTag[];
  pressureResponses: CivilizationPressureResponseAssessment[];
  status: CivilizationResolutionStatus;
  form: CivilizationResolutionForm;
  selectedTrajectoryId: string | null;
  outcome: 'success' | 'failure' | null;
  evaluations: CivilizationTrajectoryEvaluation[];
  consequences: readonly CivilizationConsequence[];
  explanation: string[];
}

const STABILITY_EXECUTION_ORDER: Record<CivilizationStabilityBand, number> = {
  crisis: 0,
  unstable: 1,
  strained: 2,
  stable: 3,
};

const REACH_EXECUTION_ORDER: Record<CivilizationMaturity, number> = {
  planetary: 0,
  stellar: 1,
  galactic: 2,
};

const PRESSURE_COVERAGE_ORDER: Record<CivilizationPressureCapabilityCoverage, number> = {
  none: 0,
  partial: 1,
  strong: 2,
};

function evaluateCivilizationRequirement(
  requirement: CivilizationTrajectoryRequirement,
  snapshot: CivilizationResolutionSnapshot,
): CivilizationRequirementEvaluation {
  const capabilities = new Set(snapshot.activeCapabilityIds);
  const conditions = new Set(snapshot.activeConditionTypes);
  let satisfied = false;
  let explanation = '';

  switch (requirement.type) {
    case 'capability_active':
      satisfied = capabilities.has(requirement.capabilityId);
      explanation = `${requirement.capabilityId} ${satisfied ? 'is' : 'is not'} operational`;
      break;
    case 'capability_absent':
      satisfied = !capabilities.has(requirement.capabilityId);
      explanation = `${requirement.capabilityId} ${satisfied ? 'is absent' : 'is operational'}`;
      break;
    case 'pressure_capability_coverage': {
      const assessment = assessCivilizationPressureResponse(
        requirement.pressureTag,
        snapshot.activeCapabilityIds,
        snapshot.affinityIdentity,
      );
      satisfied = PRESSURE_COVERAGE_ORDER[assessment.capabilityCoverage] >=
        PRESSURE_COVERAGE_ORDER[requirement.minimum];
      explanation = `${requirement.pressureTag} capability coverage is ${assessment.capabilityCoverage}; requires ${requirement.minimum}`;
      break;
    }
    case 'minimum_pressure_aptitude': {
      const assessment = assessCivilizationPressureResponse(
        requirement.pressureTag,
        snapshot.activeCapabilityIds,
        snapshot.affinityIdentity,
      );
      satisfied = assessment.aptitudeScore >= requirement.score;
      explanation = `${requirement.pressureTag} aptitude is ${assessment.aptitudeScore}; requires ${requirement.score}`;
      break;
    }
    case 'maximum_pressure_risk': {
      const assessment = assessCivilizationPressureResponse(
        requirement.pressureTag,
        snapshot.activeCapabilityIds,
        snapshot.affinityIdentity,
      );
      satisfied = assessment.riskScore <= requirement.score;
      explanation = `${requirement.pressureTag} characteristic risk is ${assessment.riskScore}; maximum ${requirement.score}`;
      break;
    }
    case 'condition_present':
      satisfied = conditions.has(requirement.conditionType);
      explanation = `${requirement.conditionType} ${satisfied ? 'is active' : 'is not active'}`;
      break;
    case 'condition_absent':
      satisfied = !conditions.has(requirement.conditionType);
      explanation = `${requirement.conditionType} ${satisfied ? 'is absent' : 'is active'}`;
      break;
    case 'minimum_stability':
      satisfied = STABILITY_EXECUTION_ORDER[snapshot.stabilityBand] >= STABILITY_EXECUTION_ORDER[requirement.band];
      explanation = `Stability is ${snapshot.stabilityBand}; requires ${requirement.band} or stronger`;
      break;
    case 'minimum_reach':
      satisfied = snapshot.currentReach !== 'unknown' &&
        REACH_EXECUTION_ORDER[snapshot.currentReach] >= REACH_EXECUTION_ORDER[requirement.reach];
      explanation = `Reach is ${snapshot.currentReach}; requires ${requirement.reach}`;
      break;
    case 'historical_affinity': {
      const weight = snapshot.affinityIdentity.historicalCounts[requirement.affinity];
      satisfied = weight >= requirement.minimumWeight;
      explanation = `Historical ${requirement.affinity} weight is ${weight}; requires ${requirement.minimumWeight}`;
      break;
    }
    case 'operational_affinity': {
      const weight = snapshot.affinityIdentity.operationalCounts[requirement.affinity];
      satisfied = weight >= requirement.minimumWeight;
      explanation = `Operational ${requirement.affinity} weight is ${weight}; requires ${requirement.minimumWeight}`;
      break;
    }
    case 'dominant_dyad':
      satisfied = snapshot.affinityIdentity.dominantDyad === requirement.dyad;
      explanation = `Dominant dyad is ${snapshot.affinityIdentity.dominantDyad ?? 'none'}; requires ${requirement.dyad}`;
      break;
  }

  return { requirement, satisfied, explanation };
}

function evaluateCivilizationTrajectory(
  trajectory: CivilizationResolutionTrajectory,
  snapshot: CivilizationResolutionSnapshot,
): CivilizationTrajectoryEvaluation {
  const requirements = trajectory.requirements.map((requirement) =>
    evaluateCivilizationRequirement(requirement, snapshot),
  );
  const available = requirements.every((requirement) => requirement.satisfied);
  if (!trajectory.uncertainty) {
    return {
      trajectoryId: trajectory.id,
      label: trajectory.label,
      available,
      requirements,
      successChance: null,
      uncertaintyModifiers: [],
    };
  }

  const uncertaintyModifiers = trajectory.uncertainty.modifiers.map((modifier) => {
    const applied = modifier.requirements.every((requirement) =>
      evaluateCivilizationRequirement(requirement, snapshot).satisfied,
    );
    return { id: modifier.id, delta: modifier.delta, label: modifier.label, applied };
  });
  const successChance = Math.max(
    0,
    Math.min(
      1,
      trajectory.uncertainty.baseSuccessChance +
        uncertaintyModifiers.reduce((sum, modifier) => sum + (modifier.applied ? modifier.delta : 0), 0),
    ),
  );
  return {
    trajectoryId: trajectory.id,
    label: trajectory.label,
    available,
    requirements,
    successChance,
    uncertaintyModifiers,
  };
}

export function resolveCivilizationEvent(
  request: CivilizationResolutionRequest,
): CivilizationResolutionResult {
  const pressureResponses = assessCivilizationPressureResponses(
    request.pressureTags,
    request.snapshot.activeCapabilityIds,
    request.snapshot.affinityIdentity,
  );
  const evaluations = request.trajectories.map((trajectory) =>
    evaluateCivilizationTrajectory(trajectory, request.snapshot),
  );
  const available = evaluations.filter((evaluation) => evaluation.available);
  if (available.length === 0) {
    return {
      eventId: request.eventId,
      source: request.source,
      pressureTags: request.pressureTags,
      pressureResponses,
      status: 'no_available_trajectory',
      form: request.form,
      selectedTrajectoryId: null,
      outcome: null,
      evaluations,
      consequences: [],
      explanation: ['No authored trajectory can be executed from the current Civilization state.'],
    };
  }

  const selectedId = request.form === 'automatic'
    ? available[0].trajectoryId
    : request.selectedTrajectoryId ?? null;
  if (!selectedId) {
    return {
      eventId: request.eventId,
      source: request.source,
      pressureTags: request.pressureTags,
      pressureResponses,
      status: 'awaiting_choice',
      form: request.form,
      selectedTrajectoryId: null,
      outcome: null,
      evaluations,
      consequences: [],
      explanation: ['A contextual trajectory must be selected inside the trigger window.'],
    };
  }

  const evaluation = evaluations.find((entry) => entry.trajectoryId === selectedId);
  const trajectory = request.trajectories.find((entry) => entry.id === selectedId);
  if (!evaluation?.available || !trajectory) {
    return {
      eventId: request.eventId,
      source: request.source,
      pressureTags: request.pressureTags,
      pressureResponses,
      status: 'invalid_selection',
      form: request.form,
      selectedTrajectoryId: selectedId,
      outcome: null,
      evaluations,
      consequences: [],
      explanation: ['The selected trajectory is unavailable in the current Civilization state.'],
    };
  }

  if (evaluation.successChance !== null && request.uncertaintyRoll == null) {
    return {
      eventId: request.eventId,
      source: request.source,
      pressureTags: request.pressureTags,
      pressureResponses,
      status: 'awaiting_uncertainty',
      form: request.form,
      selectedTrajectoryId: selectedId,
      outcome: null,
      evaluations,
      consequences: [],
      explanation: [
        `Authored uncertainty remains: ${(evaluation.successChance * 100).toFixed(1)}% success.`,
      ],
    };
  }

  const success = evaluation.successChance === null ||
    (
      typeof request.uncertaintyRoll === 'number' &&
      request.uncertaintyRoll >= 0 &&
      request.uncertaintyRoll < 1 &&
      request.uncertaintyRoll < evaluation.successChance
    );
  return {
    eventId: request.eventId,
    source: request.source,
    pressureTags: request.pressureTags,
    pressureResponses,
    status: 'resolved',
    form: request.form,
    selectedTrajectoryId: selectedId,
    outcome: success ? 'success' : 'failure',
    evaluations,
    consequences: success ? trajectory.successConsequences : trajectory.failureConsequences,
    explanation: [
      ...evaluation.requirements.map((requirement) => requirement.explanation),
      evaluation.successChance === null
        ? 'Preparation determines the result; no random roll is used.'
        : `Authored uncertainty resolved at ${(evaluation.successChance * 100).toFixed(1)}% success.`,
    ],
  };
}

export interface ApplyCivilizationConsequencesOptions {
  stabilityCalibration?: CivilizationStabilityCalibration;
  outcomeSignals?: readonly CivilizationOutcomeSignal[];
  adversity?: CivilizationAdversityEvidence | null;
}

export interface AppliedCivilizationConsequences {
  state: CivilizationState;
  history: Record<string, string>;
}

export interface AppliedCivilizationResolution extends AppliedCivilizationConsequences {
  event: CivilizationEventHistoryEntry;
}

export function applyCivilizationConsequences(
  current: CivilizationState,
  consequences: readonly CivilizationConsequence[],
  options: ApplyCivilizationConsequencesOptions = {},
): AppliedCivilizationConsequences {
  let state = current;
  const history: Record<string, string> = {};
  for (const consequence of consequences) {
    switch (consequence.type) {
      case 'apply_condition':
        state = applyCivilizationCondition(state, consequence.condition);
        break;
      case 'resolve_condition':
        state = resolveCivilizationCondition(state, consequence.conditionId, consequence.resolvedTurnCount);
        break;
      case 'set_artifact_implementation': {
        const prior = state.artifacts[consequence.artifactId];
        state = {
          ...state,
          artifacts: {
            ...state.artifacts,
            [consequence.artifactId]: {
              artifactId: consequence.artifactId,
              firstMasteredTurnCount: prior?.firstMasteredTurnCount ?? null,
              masteryCount: Math.max(1, prior?.masteryCount ?? 0),
              implementationState: consequence.implementationState,
              implementationStateChangedTurnCount: consequence.turnCount,
              implementationChangeSource: consequence.source,
              historyEvidence: prior?.historyEvidence ?? 'legacy_inferred',
            },
          },
        };
        break;
      }
      case 'set_entity_state': {
        const entity = state.entities[consequence.entityId];
        if (entity) {
          state = upsertCivilizationEntity(state, {
            ...entity,
            state: consequence.state,
            stateChangedTurnCount: consequence.turnCount,
          });
        }
        break;
      }
      case 'set_world_state': {
        const world = state.worlds[consequence.worldId];
        if (world) {
          state = upsertCivilizationWorld(state, {
            ...world,
            state: consequence.state,
            stateChangedTurnCount: consequence.turnCount,
          });
        }
        break;
      }
      case 'add_stability_contributor':
        state = {
          ...state,
          stability: addCivilizationStabilityContributor(
            state.stability,
            consequence.contributor,
            options.stabilityCalibration,
          ),
        };
        break;
      case 'advance_maturity':
        state = {
          ...state,
          scale: advanceCivilizationMaturity(state.scale, consequence.maturity, consequence.evidence),
        };
        break;
      case 'set_reach':
        state = {
          ...state,
          scale: setCivilizationOperationalReach(
            state.scale,
            consequence.reach,
            consequence.condition,
            consequence.evidence,
          ),
        };
        break;
      case 'record_history':
        history[consequence.key] = consequence.value;
        break;
    }
  }
  const consequenceTurns = consequences.flatMap((consequence) => {
    switch (consequence.type) {
      case 'apply_condition':
        return consequence.condition.appliedTurnCount ?? [];
      case 'resolve_condition':
        return consequence.resolvedTurnCount;
      case 'set_artifact_implementation':
      case 'set_entity_state':
      case 'set_world_state':
        return consequence.turnCount;
      case 'add_stability_contributor':
        return consequence.contributor.appliedTurnCount ?? [];
      case 'advance_maturity':
        return consequence.evidence.turnCount ?? [];
      case 'set_reach':
        return consequence.evidence.turnCount ?? [];
      case 'record_history':
        return [];
    }
  });
  const calculatedTurnCount = consequenceTurns.length > 0
    ? Math.max(...consequenceTurns)
    : state.stability.calculatedTurnCount;
  state = reconcileCivilizationDerivedState(state, [], calculatedTurnCount);
  state = {
    ...state,
    stability: recalculateCivilizationStabilityFromState(
      state,
      calculatedTurnCount,
      options.stabilityCalibration ?? CIVILIZATION_STABILITY_CALIBRATION_V1,
    ),
  };
  return { state, history };
}

/**
 * Applies a completed authored resolution and appends one deduplicated causal
 * record. Live state retains a bounded ledger while the immutable match record
 * captures its final contents at closure.
 */
export function applyCivilizationResolution(
  current: CivilizationState,
  resolution: CivilizationResolutionResult,
  turnCount: number | null,
  summary: string,
  options: ApplyCivilizationConsequencesOptions = {},
): AppliedCivilizationResolution {
  if (
    resolution.status !== 'resolved' ||
    resolution.selectedTrajectoryId === null ||
    resolution.outcome === null
  ) {
    throw new Error(`Civilization resolution ${resolution.eventId} is not complete`);
  }

  const applied = applyCivilizationConsequences(current, resolution.consequences, options);
  const event: CivilizationEventHistoryEntry = {
    eventId: resolution.eventId,
    source: resolution.source,
    turnCount,
    form: resolution.form,
    pressureTags: [...resolution.pressureTags],
    selectedTrajectoryId: resolution.selectedTrajectoryId,
    outcome: resolution.outcome,
    summary,
    history: applied.history,
    outcomeSignals: [...(options.outcomeSignals ?? [])],
    adversity: options.adversity ?? null,
    historyEvidence: 'recorded',
  };
  const events = [
    ...applied.state.events.filter((entry) => entry.eventId !== event.eventId),
    event,
  ].slice(-64);

  return {
    ...applied,
    state: { ...applied.state, events },
    event,
  };
}

export const BLUEPRINT_IDS = [
  'bp_antimatter_detonator',
  'bp_mantle_to_orbit_foundry',
  'bp_ascension_registry',
  'bp_worldshield_covenant',
] as const;

export type BlueprintId = (typeof BLUEPRINT_IDS)[number];

/** Records physically exposed by the first Lumii clearance threshold. */
export const OUTER_VAULT_BLUEPRINT_IDS = [
  'bp_antimatter_detonator',
  'bp_mantle_to_orbit_foundry',
  'bp_worldshield_covenant',
] as const satisfies readonly BlueprintId[];

export const BLUEPRINT_CLAIM_ACTIONS = [
  'foundry_sustainable',
  'foundry_overdrive',
  'foundry_recovery',
] as const;

export type BlueprintClaimAction = (typeof BLUEPRINT_CLAIM_ACTIONS)[number];

export const CHRONICLE_IDS = [
  'chronicle_outer_vault_access',
] as const;

export type ChronicleId = (typeof CHRONICLE_IDS)[number];

export const CHRONICLE_STATUSES = [
  'sealed',
  'available',
  'recovered',
] as const;

export type ChronicleStatus = (typeof CHRONICLE_STATUSES)[number];

export const BLUEPRINT_PRESENTATION_VARIANTS = [
  'armored',
  'original',
  'asymmetric',
  'lattice',
] as const;

export type BlueprintPresentationVariant =
  (typeof BLUEPRINT_PRESENTATION_VARIANTS)[number];

export const GAME_MODES = [
  'standard',
  'campaign',
  'custom',
  'competitive',
] as const;

export type GameMode = (typeof GAME_MODES)[number];

export const BLUEPRINT_POLICIES = [
  'none',
  'owned',
  'all',
  'seasonal',
  'scenario',
] as const;

export type BlueprintPolicy = (typeof BLUEPRINT_POLICIES)[number];

export const BLUEPRINT_CLEARANCE_STATUSES = [
  'classified',
  'challenge_ready',
  'challenge_active',
  'cleared',
] as const;

export type BlueprintClearanceStatus =
  (typeof BLUEPRINT_CLEARANCE_STATUSES)[number];

export const BLUEPRINT_CLEARANCE_REQUIRED_WINS = 5;

export const LUMII_THRESHOLD_APPROACHES = [
  'kinship',
  'inquiry',
  'dominion',
] as const;

export type LumiiThresholdApproach =
  (typeof LUMII_THRESHOLD_APPROACHES)[number];

export const LUMII_THRESHOLD_DIALOGUE_CHOICE_IDS = [
  'kinship-want',
  'kinship-fear',
  'kinship-familiar',
  'kinship-with-you',
  'kinship-help',
  'kinship-grow',
  'inquiry-answer',
  'inquiry-warning',
  'inquiry-relation',
  'inquiry-unsayable',
  'inquiry-warning-against',
  'inquiry-preserve',
  'inquiry-risk',
  'inquiry-pattern',
  'dominion-decide',
  'dominion-cipher',
  'dominion-stand',
  'dominion-stop',
] as const;

export type LumiiThresholdDialogueChoiceId =
  (typeof LUMII_THRESHOLD_DIALOGUE_CHOICE_IDS)[number];

export const LUMII_THRESHOLD_DIALOGUE_RESOLUTIONS = [
  'left',
  'continued',
] as const;

export type LumiiThresholdDialogueResolution =
  (typeof LUMII_THRESHOLD_DIALOGUE_RESOLUTIONS)[number];

export const LUMII_THRESHOLD_DIALOGUE_PATHS: Record<
  LumiiThresholdApproach,
  readonly (readonly LumiiThresholdDialogueChoiceId[])[]
> = {
  kinship: [
    ['kinship-want', 'kinship-with-you'],
    ['kinship-fear', 'kinship-help'],
    ['kinship-familiar', 'kinship-grow'],
  ],
  inquiry: [
    ['inquiry-answer', 'inquiry-unsayable'],
    ['inquiry-warning', 'inquiry-warning-against', 'inquiry-risk'],
    ['inquiry-relation', 'inquiry-pattern'],
  ],
  dominion: [
    ['dominion-decide'],
    ['dominion-cipher'],
    ['dominion-stand'],
  ],
};

export type BlueprintDeviceState =
  | 'armed'
  | 'ready'
  | 'recovering'
  | 'vigilant'
  | 'spent';

export const CIVILIZATION_PROJECT_STATUSES = [
  'assembling',
  'ready_to_manifest',
  'manifested',
] as const;

export type CivilizationProjectStatus =
  (typeof CIVILIZATION_PROJECT_STATUSES)[number];

/**
 * Authoritative lifecycle for a Blueprint inside its owner's Civilization.
 * The former public-device list is retained as a compatibility projection,
 * but project completion, capability state, and Legacy credit derive here.
 */
export interface CivilizationProjectLifecycleState {
  projectId: string;
  blueprintId: BlueprintId;
  slotIndex: number;
  status: CivilizationProjectStatus;
  matchedComponentIds: string[];
  deviceState: BlueprintDeviceState | null;
  presentationVariant: BlueprintPresentationVariant;
  manifestedTurnCount: number | null;
  stateChangedTurnCount: number | null;
  historyEvidence: CivilizationHistoryEvidence;
}

export function civilizationProjectId(
  blueprintId: BlueprintId,
  slotIndex: number,
): string {
  return `project:${slotIndex}:${blueprintId}`;
}

export interface BlueprintComponentDefinition {
  artifactId: string;
  stage: string;
  function: string;
}

export interface BlueprintPresentationMetadata {
  serialCode: string;
  scaleLabel: 'Planetary' | 'Stellar';
  canonicalVariant: BlueprintPresentationVariant;
  manifestationTreatment: 'dedicated' | 'shared';
  detonationTreatment: 'dedicated' | 'none';
}

export const BLUEPRINT_CIVILIZATION_TRIGGER_WINDOWS = [
  'legal_forge_before_payment',
  'legal_encrypt_before_reserve',
  'project_claim',
  'hostile_claim_interception',
  'turn_start_observation',
] as const;

export type BlueprintCivilizationTriggerWindow =
  (typeof BLUEPRINT_CIVILIZATION_TRIGGER_WINDOWS)[number];

export const BLUEPRINT_MANIFESTATION_SCALES = [
  'installation',
  'satellite',
  'planetary',
  'stellar',
  'distributed',
] as const;

export type BlueprintManifestationScale =
  (typeof BLUEPRINT_MANIFESTATION_SCALES)[number];

export const BLUEPRINT_MANIFESTATION_MOTIONS = [
  'gimbaled_orbit',
  'industrial_transit',
  'signal_constellation',
  'shield_breath',
] as const;

export type BlueprintManifestationMotion =
  (typeof BLUEPRINT_MANIFESTATION_MOTIONS)[number];

export interface BlueprintCivilizationMetadata {
  projectForm: string;
  scaleBand: 'planetary' | 'stellar' | 'galactic';
  manifestationScale: BlueprintManifestationScale;
  manifestationMotion: BlueprintManifestationMotion;
  affinity: StandardAffinityKey;
  siteTitle: string;
  visibleAs: string;
  siteSummary: string;
  laneLabel: string;
  manifestation: 'automatic';
  triggerWindows: readonly BlueprintCivilizationTriggerWindow[];
  resolutionForm: CivilizationResolutionForm;
  pressureTags: readonly CivilizationPressureTag[];
  providedCapabilityIds: readonly CivilizationCapabilityId[];
  interactingCapabilityIds: readonly CivilizationCapabilityId[];
  consequencePolicyStatus:
    | 'deferred_by_civilization_spec'
    | 'requires_runtime_reconciliation'
    | 'runtime_aligned';
}

export interface BlueprintDefinition {
  id: BlueprintId;
  name: string;
  family: 'catastrophe_engine' | 'industrial_chain' | 'institution' | 'covenant';
  components: readonly BlueprintComponentDefinition[];
  publicEffect: string;
  initialDeviceState: BlueprintDeviceState;
  competitiveApproved: boolean;
  presentation: BlueprintPresentationMetadata;
  civilization: BlueprintCivilizationMetadata;
}

export const BLUEPRINT_DEFINITIONS: Record<BlueprintId, BlueprintDefinition> = {
  bp_antimatter_detonator: {
    id: 'bp_antimatter_detonator',
    name: 'Antimatter Detonator',
    family: 'catastrophe_engine',
    components: [
      {
        artifactId: 't1r01',
        stage: 'Reaction Core',
        function: 'Supplies the controlled reaction mass and the first ignition event inside the containment field.',
      },
      {
        artifactId: 't1p04',
        stage: 'Containment Cage',
        function: 'Suspends matter and antimatter across a governed magnetic boundary until firing is authorized.',
      },
      {
        artifactId: 't1r04',
        stage: 'Governed Trigger',
        function: 'Orders the ignition sequence and prevents the reaction from beginning without a valid command.',
      },
      {
        artifactId: 't2o01',
        stage: 'Annihilation Sink',
        function: 'Draws the annihilation boundary away from the civilization and absorbs the reaction horizon.',
      },
    ],
    publicEffect:
      'Uniformly mark a face-up Tier II Artifact. A legal Forge or Encrypt Annihilates it before payment; gain 2 Eminence and become Spent. Broken Covenant also Annihilates two random eligible Tier I implementations belonging to the claimant.',
    initialDeviceState: 'armed',
    competitiveApproved: true,
    presentation: {
      serialCode: 'BP-AD-01',
      scaleLabel: 'Stellar',
      canonicalVariant: 'armored',
      manifestationTreatment: 'dedicated',
      detonationTreatment: 'dedicated',
    },
    civilization: {
      projectForm: 'Stellar Device',
      scaleBand: 'stellar',
      manifestationScale: 'satellite',
      manifestationMotion: 'gimbaled_orbit',
      affinity: 'abyss',
      siteTitle: 'Antimatter Quarantine Orbit',
      visibleAs: 'a cold red exclusion path around the inhabited system',
      siteSummary: 'Controlled annihilation infrastructure, warning lanes, and a reserved catastrophe orbit make the device visible at civilization scale.',
      laneLabel: 'Controlled catastrophe',
      manifestation: 'automatic',
      triggerWindows: ['legal_forge_before_payment', 'legal_encrypt_before_reserve'],
      resolutionForm: 'automatic',
      pressureTags: ['disruption', 'attrition'],
      providedCapabilityIds: [CIVILIZATION_PROJECT_CAPABILITIES.antimatterClaimAnnihilation],
      interactingCapabilityIds: [CIVILIZATION_PROJECT_CAPABILITIES.hostileClaimInterception],
      consequencePolicyStatus: 'runtime_aligned',
    },
  },
  bp_mantle_to_orbit_foundry: {
    id: 'bp_mantle_to_orbit_foundry',
    name: 'Mantle-to-Orbit Foundry',
    family: 'industrial_chain',
    components: [
      {
        artifactId: 't1r07',
        stage: 'Thermal Baffle',
        function: 'Routes mantle heat and decay into useful work before either can destroy the ascent chambers.',
      },
      {
        artifactId: 't1s02',
        stage: 'Mantlelift Coil',
        function: 'Accelerates sealed feedstock capsules from the deep crust into stable orbit along a timed induction line.',
      },
      {
        artifactId: 't1o05',
        stage: 'Vacuum Forge Die',
        function: 'Forms lifted feedstock into precise orbital structures without atmosphere, convection, or contaminating vapor.',
      },
    ],
    publicEffect:
      'Gain 1 Eminence. Twice, Foundry Forge a face-up Tier II Artifact with each nonzero printed natural Affinity channel reduced by 1. Then Overdrive may repeat the discount and seal the three Foundry components in Cipher storage.',
    initialDeviceState: 'ready',
    competitiveApproved: true,
    presentation: {
      serialCode: 'BP-MO-01',
      scaleLabel: 'Planetary',
      canonicalVariant: 'armored',
      manifestationTreatment: 'dedicated',
      detonationTreatment: 'none',
    },
    civilization: {
      projectForm: 'Planetary Infrastructure',
      scaleBand: 'planetary',
      manifestationScale: 'planetary',
      manifestationMotion: 'industrial_transit',
      affinity: 'flare',
      siteTitle: 'Mantle-to-Orbit Freight Lane',
      visibleAs: 'a forged ascent corridor connecting deep crust to orbital industry',
      siteSummary: 'Repeated launch paths, feedstock traffic, and orbital manufacturing traces make the Foundry visible at civilization scale.',
      laneLabel: 'Orbital industry',
      manifestation: 'automatic',
      triggerWindows: ['project_claim'],
      resolutionForm: 'contextual',
      pressureTags: [],
      providedCapabilityIds: [CIVILIZATION_PROJECT_CAPABILITIES.foundryForge],
      interactingCapabilityIds: [],
      consequencePolicyStatus: 'runtime_aligned',
    },
  },
  bp_ascension_registry: {
    id: 'bp_ascension_registry',
    name: 'Ascension Registry',
    family: 'institution',
    components: [
      {
        artifactId: 't1p05',
        stage: 'Readiness Verification',
        function: 'Verifies that a civilization began its turn with a legal Tier II claim available.',
      },
      {
        artifactId: 't1s03',
        stage: 'Deferral Boundary',
        function: 'Distinguishes a genuine deferred claim from a claim that was attempted and interrupted.',
      },
      {
        artifactId: 't1r08',
        stage: 'Public Record',
        function: 'Publishes each qualifying deferral and clears the record when any legal Tier II claim is made.',
      },
    ],
    publicEffect:
      'When another civilization begins a turn with a legal Tier II claim but makes none, add 1 public Deferral, at most once per round. Any legal Tier II claim clears all Deferrals. At 2, gain 2 Eminence and become Spent; under Broken Covenant, clear Deferrals and remain Active.',
    initialDeviceState: 'ready',
    competitiveApproved: false,
    presentation: {
      serialCode: 'BP-AR-01',
      scaleLabel: 'Stellar',
      canonicalVariant: 'armored',
      manifestationTreatment: 'shared',
      detonationTreatment: 'none',
    },
    civilization: {
      projectForm: 'Stellar Institution',
      scaleBand: 'stellar',
      manifestationScale: 'distributed',
      manifestationMotion: 'signal_constellation',
      affinity: 'radiance',
      siteTitle: 'Ascension Registry Beacon',
      visibleAs: 'a public stellar readiness ledger carried across civic signal lanes',
      siteSummary: 'Verification beacons, public deferral records, and coordinated claim-readiness signals reveal the distributed institution.',
      laneLabel: 'Public coordination',
      manifestation: 'automatic',
      triggerWindows: ['turn_start_observation'],
      resolutionForm: 'automatic',
      pressureTags: ['coordination'],
      providedCapabilityIds: [CIVILIZATION_PROJECT_CAPABILITIES.claimDeferralObservation],
      interactingCapabilityIds: [],
      consequencePolicyStatus: 'runtime_aligned',
    },
  },
  bp_worldshield_covenant: {
    id: 'bp_worldshield_covenant',
    name: 'Worldshield Covenant',
    family: 'covenant',
    components: [
      {
        artifactId: 't1s01',
        stage: 'Early Warning',
        function: 'Models the point where a hostile effect would interrupt a legal claim.',
      },
      {
        artifactId: 't1o01',
        stage: 'Concealed Defense',
        function: 'Hides the protected claim inside a controlled decay shadow until the hostile effect is spent.',
      },
      {
        artifactId: 't1p06',
        stage: 'Civic Repair',
        function: 'Restores the legal claim path after the hostile source has been expended.',
      },
    ],
    publicEffect:
      'Gain 1 Eminence. Intercept the first hostile effect that would Burn, Annihilate, Nullify, or cancel your legal Artifact claim; continue the claim normally, then become Spent. Under Broken Covenant, remain Vigilant.',
    initialDeviceState: 'vigilant',
    competitiveApproved: false,
    presentation: {
      serialCode: 'BP-WC-01',
      scaleLabel: 'Planetary',
      canonicalVariant: 'armored',
      manifestationTreatment: 'dedicated',
      detonationTreatment: 'none',
    },
    civilization: {
      projectForm: 'Planetary Network',
      scaleBand: 'planetary',
      manifestationScale: 'planetary',
      manifestationMotion: 'shield_breath',
      affinity: 'radiance',
      siteTitle: 'Worldshield Covenant Veil',
      visibleAs: 'a treaty-lit defense envelope wrapped around the civilization',
      siteSummary: 'Public warning, concealment, and repair infrastructure make the Covenant visible without reducing it to a single machine.',
      laneLabel: 'Civic defense',
      manifestation: 'automatic',
      triggerWindows: ['hostile_claim_interception'],
      resolutionForm: 'automatic',
      pressureTags: [],
      providedCapabilityIds: [CIVILIZATION_PROJECT_CAPABILITIES.hostileClaimInterception],
      interactingCapabilityIds: [CIVILIZATION_PROJECT_CAPABILITIES.antimatterClaimAnnihilation],
      consequencePolicyStatus: 'runtime_aligned',
    },
  },
};

export interface ChronicleDefinition {
  id: ChronicleId;
  title: string;
  chapterLabel: string;
  summary: string;
  relatedBlueprintIds: readonly BlueprintId[];
  civilization: ChronicleCivilizationAuthoring;
}

export const CHRONICLE_CIVILIZATION_ROLES = [
  'account_record',
  'runtime_pressure',
] as const;

export type ChronicleCivilizationRole =
  (typeof CHRONICLE_CIVILIZATION_ROLES)[number];

export interface ChronicleCivilizationOutcomeProfile {
  resolutionId: string;
  pressureTags: readonly CivilizationPressureTag[];
  outcomeSignals: readonly CivilizationOutcomeSignal[];
  adversity: CivilizationAdversityEvidence | null;
}

export interface ChronicleCivilizationAuthoring {
  role: ChronicleCivilizationRole;
  /** Runtime-pressure Chronicles author one profile for every recorded resolution. */
  outcomeProfiles: readonly ChronicleCivilizationOutcomeProfile[];
}

export const CHRONICLE_DEFINITIONS: Record<ChronicleId, ChronicleDefinition> = {
  chronicle_outer_vault_access: {
    id: 'chronicle_outer_vault_access',
    title: 'Outer Vault Access',
    chapterLabel: 'Threshold Record',
    summary:
      'The first recovered Vault thread: Lumii yields the outer threshold, Antimatter Detonator is recovered, and deeper records remain corrupted.',
    relatedBlueprintIds: ['bp_antimatter_detonator'],
    civilization: {
      role: 'account_record',
      outcomeProfiles: [],
    },
  },
};

export interface BlueprintLoadout {
  mode: GameMode;
  slots: Array<BlueprintId | null>;
}

export interface BlueprintPrivateState {
  blueprintId: BlueprintId;
  slotIndex: number;
  matchedComponentIds: string[];
  manifested: boolean;
  secretTargetCardId?: string | null;
  safePreManifestActionPlayerIds?: string[];
  /** Owner-only Foundry components held in exceptional Cipher storage after Overdrive. */
  foundryStoredArtifactIds?: string[];
  /** @deprecated Compatibility read for Broken-Covenant saves created before Foundry storage. */
  foundryRecoveryArtifactIds?: string[];
  /** Server observation cursor for Ascension Registry; never projected to opponents. */
  ascensionObservedPlayerId?: string | null;
  ascensionObservedTurnCount?: number | null;
  ascensionLastDeferralRound?: number | null;
}

export interface EncryptedArtifactState {
  reservedArtifactIds?: readonly string[];
  blueprintPrivateStates?: readonly BlueprintPrivateState[];
}

/** Canonical Foundry storage read, with legacy Broken-Covenant recovery compatibility. */
export function foundryStoredArtifactIds(state: EncryptedArtifactState): string[] {
  const foundry = state.blueprintPrivateStates?.find(
    (entry) => entry.blueprintId === 'bp_mantle_to_orbit_foundry',
  );
  const stored = foundry?.foundryStoredArtifactIds ?? foundry?.foundryRecoveryArtifactIds ?? [];
  return [...new Set(stored)];
}

/** Counts only ordinary Encrypted Artifacts; Foundry-bound overflow never consumes capacity. */
export function ordinaryEncryptedCount(state: EncryptedArtifactState): number {
  const stored = new Set(foundryStoredArtifactIds(state));
  return (state.reservedArtifactIds ?? []).filter((artifactId) => !stored.has(artifactId)).length;
}

export interface ManifestedDevicePublicState {
  blueprintId: BlueprintId;
  ownerPlayerId: string;
  slotIndex: number;
  state: BlueprintDeviceState;
  presentationVariant: BlueprintPresentationVariant;
  /** Canonical v2 Foundry state. Legacy readiness fields remain optional below. */
  foundryUsesRemaining?: number;
  /** Public Deferral pressure recorded by Ascension Registry. */
  ascensionDeferrals?: number;
  /** Legacy v1 Foundry fields retained for compatibility reads only. */
  foundryTier2Ready?: boolean;
  foundryTier3Ready?: boolean;
}

/** A normal Blueprint loadout contributes two Great Works to the Legacy Path. */
export const LEGACY_BLUEPRINT_REQUIREMENT = 2;

export interface LegacyBlueprintProgress {
  completedBlueprintIds: BlueprintId[];
  completedProjectCount: number;
  requiredProjectCount: number;
  achieved: boolean;
}

export const CIVILIZATION_LEGACY_TRIAL_REQUIREMENT = 1;

export type CivilizationLegacyCriterionId =
  | 'great_works'
  | 'galactic_identity'
  | 'continuity'
  | 'defining_trial';

export interface CivilizationLegacyCriterionProgress {
  id: CivilizationLegacyCriterionId;
  label: string;
  current: number;
  required: number;
  achieved: boolean;
  detail: string;
}

export interface CivilizationLegacyProgress extends LegacyBlueprintProgress {
  consequentialEventCount: number;
  galacticIdentityReady: boolean;
  continuitySecured: boolean;
  criteria: CivilizationLegacyCriterionProgress[];
  completedCriterionCount: number;
  requiredCriterionCount: number;
}

export interface CivilizationLegacyArtifactEligibility {
  qualifyingMaturity: CivilizationMaturity;
  galacticIdentityReady: boolean;
  excludedDamagedArtifactIds: string[];
}

type CivilizationLegacyProjectLike = Pick<
  CivilizationProjectLifecycleState,
  'blueprintId' | 'status'
>;

type CivilizationLegacyEventLike = Pick<
  CivilizationEventHistoryEntry,
  'eventId' | 'outcome'
> & {
  pressureTags: readonly CivilizationPressureTag[];
  /** Authoritative state carries the full source; public projections expose its type. */
  source?: Pick<CivilizationArtifactChangeSource, 'sourceType'>;
  sourceType?: CivilizationArtifactChangeSource['sourceType'];
};

export interface CivilizationLegacySource {
  projects?: Readonly<Record<string, CivilizationLegacyProjectLike>> |
    readonly CivilizationLegacyProjectLike[];
  scale?: Pick<CivilizationScaleState, 'historicalMaturity'>;
  stability?: Pick<CivilizationStabilityState, 'band'>;
  identityScales?: {
    galaxy?: Pick<
      CivilizationIdentityLayerState,
      'status' | 'candidateDyad' | 'committedDyad'
    >;
  };
  events?: readonly CivilizationLegacyEventLike[];
  legacyArtifactEligibility?: CivilizationLegacyArtifactEligibility;
}

/**
 * Reassesses only Legacy qualification. Historical mastery, identity routing,
 * demonstrated Maturity, and already manifested Projects remain unchanged.
 */
export function deriveCivilizationLegacyArtifactEligibility(
  state: CivilizationState,
): CivilizationLegacyArtifactEligibility {
  const excludedDamagedArtifactIds = Object.values(state.artifacts)
    .filter((artifact) => artifact.implementationState === 'damaged')
    .map((artifact) => artifact.artifactId)
    .sort();
  const galaxyIdentity = state.identityScales.galaxy;
  const identityFormed = galaxyIdentity.status === 'forming' ||
    galaxyIdentity.status === 'committed';
  if (excludedDamagedArtifactIds.length === 0) {
    return {
      qualifyingMaturity: state.scale.historicalMaturity,
      galacticIdentityReady: state.scale.historicalMaturity === 'galactic' &&
        identityFormed && Boolean(galaxyIdentity.candidateDyad || galaxyIdentity.committedDyad),
      excludedDamagedArtifactIds,
    };
  }

  const excludedIds = new Set(excludedDamagedArtifactIds);
  const qualifyingState = {
    ...state,
    artifacts: Object.fromEntries(Object.entries(state.artifacts)
      .filter(([, artifact]) => !excludedIds.has(artifact.artifactId))),
  };
  const qualifyingMaturity = assessCivilizationMaturity(
    qualifyingState,
    civilizationProjectMaturityInputs(state),
    'historical',
  ).candidateMaturity;
  const qualifyingIdentity = summarizeCivilizationIdentityEvidence(
    galaxyIdentity.evidence.filter((evidence) => !excludedIds.has(evidence.artifactId)),
  );
  return {
    qualifyingMaturity,
    galacticIdentityReady: qualifyingMaturity === 'galactic' && identityFormed &&
      qualifyingIdentity.candidateDyad !== null,
    excludedDamagedArtifactIds,
  };
}

export function getLegacyBlueprintProgress(
  devices: readonly Pick<ManifestedDevicePublicState, 'blueprintId'>[] | null | undefined,
  requiredProjectCount = LEGACY_BLUEPRINT_REQUIREMENT,
): LegacyBlueprintProgress {
  const completedBlueprintIds = [...new Set(
    (devices ?? [])
      .map((device) => device.blueprintId)
      .filter((blueprintId): blueprintId is BlueprintId => BLUEPRINT_IDS.includes(blueprintId)),
  )];
  const normalizedRequirement = Math.max(1, Math.floor(requiredProjectCount));
  return {
    completedBlueprintIds,
    completedProjectCount: completedBlueprintIds.length,
    requiredProjectCount: normalizedRequirement,
    achieved: completedBlueprintIds.length >= normalizedRequirement,
  };
}

/**
 * Authoritative callers must supply freshly derived Artifact eligibility.
 * Public callers read its projected counterpart; older projections retain the
 * previous historical-only behavior until refreshed by the server.
 */
export function getCivilizationLegacyProgress(
  civilization: CivilizationLegacySource | null | undefined,
  requiredProjectCount = LEGACY_BLUEPRINT_REQUIREMENT,
  artifactEligibility?: CivilizationLegacyArtifactEligibility,
): CivilizationLegacyProgress {
  const projects = Array.isArray(civilization?.projects)
    ? civilization.projects
    : Object.values(civilization?.projects ?? {});
  const projectProgress = getLegacyBlueprintProgress(
    projects.filter((project) => project.status === 'manifested'),
    requiredProjectCount,
  );
  const consequentialEventCount = new Set(
    (civilization?.events ?? [])
      .filter((event) => {
        const sourceType = event.source?.sourceType ?? event.sourceType;
        return event.pressureTags.length > 0 &&
          (sourceType === 'chronicle' || sourceType === 'scenario');
      })
      .map((event) => event.eventId),
  ).size;
  const galaxyIdentity = civilization?.identityScales?.galaxy;
  const eligibility = artifactEligibility ?? civilization?.legacyArtifactEligibility;
  const galacticIdentityReady = eligibility?.galacticIdentityReady ??
    (civilization?.scale?.historicalMaturity === 'galactic' && Boolean(
    galaxyIdentity &&
    (galaxyIdentity.status === 'forming' || galaxyIdentity.status === 'committed') &&
    (galaxyIdentity.candidateDyad || galaxyIdentity.committedDyad),
  ));
  const continuitySecured = civilization?.stability?.band === 'stable' ||
    civilization?.stability?.band === 'strained';
  const criteria: CivilizationLegacyCriterionProgress[] = [
    {
      id: 'great_works',
      label: 'Great Works',
      current: projectProgress.completedProjectCount,
      required: projectProgress.requiredProjectCount,
      achieved: projectProgress.achieved,
      detail: 'Manifest civilization-scale Blueprint projects.',
    },
    {
      id: 'galactic_identity',
      label: 'Galactic Identity',
      current: galacticIdentityReady ? 1 : 0,
      required: 1,
      achieved: galacticIdentityReady,
      detail: 'Reach Galactic scale and form a final civilizational identity; damaged Artifacts do not contribute.',
    },
    {
      id: 'continuity',
      label: 'Continuity',
      current: continuitySecured ? 1 : 0,
      required: 1,
      achieved: continuitySecured,
      detail: 'Remain Stable or Strained when the Legacy is completed.',
    },
    {
      id: 'defining_trial',
      label: 'Defining Trial',
      current: consequentialEventCount,
      required: CIVILIZATION_LEGACY_TRIAL_REQUIREMENT,
      achieved: consequentialEventCount >= CIVILIZATION_LEGACY_TRIAL_REQUIREMENT,
      detail: 'Resolve a consequential Civilization Event.',
    },
  ];
  const completedCriterionCount = criteria.filter((criterion) => criterion.achieved).length;

  return {
    ...projectProgress,
    consequentialEventCount,
    galacticIdentityReady,
    continuitySecured,
    criteria,
    completedCriterionCount,
    requiredCriterionCount: criteria.length,
    achieved: completedCriterionCount === criteria.length,
  };
}

/**
 * Projects provide their authored capabilities only while their public device
 * is operational. Recovery preserves the Project's history but suspends its
 * capability until the recovery sequence completes.
 */
export function deriveOperationalProjectCapabilityIds(
  devices: readonly ManifestedDevicePublicState[],
): CivilizationCapabilityId[] {
  const capabilityIds = new Set<CivilizationCapabilityId>();
  for (const device of devices) {
    if (device.state === 'spent' || device.state === 'recovering') continue;
    const definition = BLUEPRINT_DEFINITIONS[device.blueprintId];
    for (const capabilityId of definition?.civilization.providedCapabilityIds ?? []) {
      capabilityIds.add(capabilityId);
    }
  }
  return [...capabilityIds].sort();
}

export function deriveOperationalCivilizationProjectCapabilityIds(
  projects: Readonly<Record<string, CivilizationProjectLifecycleState>> | null | undefined,
): CivilizationCapabilityId[] {
  const capabilityIds = new Set<CivilizationCapabilityId>();
  for (const project of Object.values(projects ?? {})) {
    if (
      project.status !== 'manifested' ||
      project.deviceState === null ||
      project.deviceState === 'spent' ||
      project.deviceState === 'recovering'
    ) {
      continue;
    }
    const definition = BLUEPRINT_DEFINITIONS[project.blueprintId];
    for (const capabilityId of definition?.civilization.providedCapabilityIds ?? []) {
      capabilityIds.add(capabilityId);
    }
  }
  return [...capabilityIds].sort();
}

function civilizationProjectMaturityInputs(
  state: CivilizationState,
): Array<Pick<ManifestedDevicePublicState, 'blueprintId' | 'state'>> {
  return Object.values(state.projects ?? {})
    .filter((project) => project.status === 'manifested' && project.deviceState !== null)
    .map((project) => ({
      blueprintId: project.blueprintId,
      state: project.deviceState!,
    }));
}

export const CIVILIZATION_MATURITY_POLICY_ID = 'civilization-maturity-v1' as const;

export interface CivilizationMaturityCriterion {
  id: string;
  label: string;
  satisfied: boolean;
  observed: number | boolean;
  required: number | boolean;
}

export interface CivilizationMaturityAssessment {
  policyId: typeof CIVILIZATION_MATURITY_POLICY_ID;
  mode: 'historical' | 'operational';
  candidateMaturity: CivilizationMaturity;
  artifactImplementationCount: number;
  capabilityIds: ArtifactCivilizationCapabilityId[];
  capabilityDomains: CivilizationCapabilityDomain[];
  manifestedProjectCount: number;
  stellarProjectCount: number;
  galacticProjectCount: number;
  settledWorldCount: number;
  networkCount: number;
  interstellarCapabilityTriad: boolean;
  stellarFoundationSignalCount: number;
  stellarCriteria: CivilizationMaturityCriterion[];
  galacticCriteria: CivilizationMaturityCriterion[];
  explanation: string[];
}

const INTERSTELLAR_COORDINATION_CAPABILITIES = new Set<ArtifactCivilizationCapabilityId>([
  'artifact:temporal_coordination',
  'artifact:distributed_coordination',
  'artifact:secure_communication',
]);

const INTERSTELLAR_SUSTAINMENT_CAPABILITIES = new Set<ArtifactCivilizationCapabilityId>([
  'artifact:controlled_energy',
  'artifact:energy_conversion',
  'artifact:habitat_engineering',
  'artifact:ecological_adaptation',
  'artifact:resource_reclamation',
]);

function artifactCapabilityDomains(
  capabilityIds: readonly ArtifactCivilizationCapabilityId[],
): CivilizationCapabilityDomain[] {
  return [...new Set(capabilityIds.map((capabilityId) =>
    ARTIFACT_CIVILIZATION_CAPABILITY_DOMAIN_BY_ID[capabilityId],
  ))].sort();
}

function hasAnyCapability(
  capabilityIds: ReadonlySet<ArtifactCivilizationCapabilityId>,
  candidates: ReadonlySet<ArtifactCivilizationCapabilityId>,
): boolean {
  return [...candidates].some((capabilityId) => capabilityIds.has(capabilityId));
}

function criterion(
  id: string,
  label: string,
  observed: number | boolean,
  required: number | boolean,
): CivilizationMaturityCriterion {
  const satisfied = typeof observed === 'boolean'
    ? observed === required
    : observed >= (required as number);
  return { id, label, satisfied, observed, required };
}

/**
 * Derives demonstrated scale from breadth plus independent scale signals.
 * Artwork depiction scale, Artifact tier, and literal Kardashev Type are
 * intentionally absent from this calculation.
 */
export function assessCivilizationMaturity(
  state: CivilizationState,
  manifestedDevices: readonly Pick<ManifestedDevicePublicState, 'blueprintId' | 'state'>[] = [],
  mode: CivilizationMaturityAssessment['mode'] = 'historical',
): CivilizationMaturityAssessment {
  const historical = mode === 'historical';
  const artifactLifecycles = Object.values(state.artifacts).filter((lifecycle) =>
    lifecycle.masteryCount > 0 && (historical || lifecycle.implementationState === 'operational'),
  );
  const capabilityIds = historical
    ? deriveHistoricalArtifactCapabilityIds({ artifacts: Object.fromEntries(
        artifactLifecycles.map((lifecycle) => [lifecycle.artifactId, lifecycle]),
      ) })
    : deriveOperationalArtifactCapabilityIds({ artifacts: Object.fromEntries(
        artifactLifecycles.map((lifecycle) => [lifecycle.artifactId, lifecycle]),
      ) }) as ArtifactCivilizationCapabilityId[];
  const capabilitySet = new Set(capabilityIds);
  const capabilityDomains = artifactCapabilityDomains(capabilityIds);
  const devices = manifestedDevices.filter((device) =>
    historical || (device.state !== 'spent' && device.state !== 'recovering'),
  );
  const projectScaleBands = devices.map((device) =>
    BLUEPRINT_DEFINITIONS[device.blueprintId]?.civilization.scaleBand ?? 'planetary',
  );
  const stellarProjectCount = projectScaleBands.filter((scale) => scale !== 'planetary').length;
  const galacticProjectCount = projectScaleBands.filter((scale) => scale === 'galactic').length;
  const settledWorldCount = Object.values(state.worlds).filter((world) =>
    world.role === 'settled_world' && (historical || world.state === 'active'),
  ).length;
  const networkCount = Object.values(state.entities).filter((entity) =>
    entity.kind === 'network' && (historical || entity.state === 'operational'),
  ).length;
  const interstellarCapabilityTriad =
    capabilitySet.has('artifact:transit_navigation') &&
    hasAnyCapability(capabilitySet, INTERSTELLAR_COORDINATION_CAPABILITIES) &&
    hasAnyCapability(capabilitySet, INTERSTELLAR_SUSTAINMENT_CAPABILITIES);
  const stellarFoundationSignalCount =
    Number(stellarProjectCount > 0) +
    Number(settledWorldCount > 0) +
    Number(networkCount > 0) +
    Number(interstellarCapabilityTriad);

  const stellarCriteria = [
    criterion('stellar-artifact-breadth', 'At least six distinct mastered implementations', artifactLifecycles.length, 6),
    criterion('stellar-capability-breadth', 'At least six qualitative capabilities', capabilityIds.length, 6),
    criterion('stellar-domain-breadth', 'At least three capability domains', capabilityDomains.length, 3),
    criterion('stellar-scale-signal', 'At least one independent stellar foundation signal', stellarFoundationSignalCount, 1),
  ];
  const hasGalacticAnchor = galacticProjectCount > 0 || (
    interstellarCapabilityTriad && (
      stellarProjectCount >= 2 ||
      settledWorldCount >= 2 ||
      (stellarProjectCount >= 1 && settledWorldCount >= 1)
    )
  );
  const galacticCriteria = [
    criterion('galactic-artifact-breadth', 'At least twelve distinct mastered implementations', artifactLifecycles.length, 12),
    criterion('galactic-capability-breadth', 'At least twelve qualitative capabilities', capabilityIds.length, 12),
    criterion('galactic-domain-breadth', 'At least six capability domains', capabilityDomains.length, 6),
    criterion('galactic-foundations', 'At least two independent stellar foundation signals', stellarFoundationSignalCount, 2),
    criterion('galactic-anchor', 'A galactic Project or distributed interstellar anchor', hasGalacticAnchor, true),
  ];
  const stellarSatisfied = stellarCriteria.every((entry) => entry.satisfied);
  const galacticSatisfied = stellarSatisfied && galacticCriteria.every((entry) => entry.satisfied);
  const candidateMaturity: CivilizationMaturity = galacticSatisfied
    ? 'galactic'
    : stellarSatisfied
      ? 'stellar'
      : 'planetary';

  return {
    policyId: CIVILIZATION_MATURITY_POLICY_ID,
    mode,
    candidateMaturity,
    artifactImplementationCount: artifactLifecycles.length,
    capabilityIds,
    capabilityDomains,
    manifestedProjectCount: devices.length,
    stellarProjectCount,
    galacticProjectCount,
    settledWorldCount,
    networkCount,
    interstellarCapabilityTriad,
    stellarFoundationSignalCount,
    stellarCriteria,
    galacticCriteria,
    explanation: [
      `${artifactLifecycles.length} ${historical ? 'historically mastered' : 'operational'} implementations expose ${capabilityIds.length} capabilities across ${capabilityDomains.length} domains.`,
      `${stellarFoundationSignalCount} independent stellar foundation signal${stellarFoundationSignalCount === 1 ? '' : 's'} detected.`,
      `Derived ${mode} scale: ${candidateMaturity}.`,
    ],
  };
}

function scaleEvidence(
  sourceId: string,
  turnCount: number | null,
  historyEvidence: CivilizationHistoryEvidence,
): CivilizationScaleEvidence {
  return {
    sourceType: 'system',
    sourceId,
    turnCount,
    historyEvidence,
  };
}

function scaleIndex(scale: CivilizationMaturity): number {
  return CIVILIZATION_MATURITY_LEVELS.indexOf(scale);
}

function deriveReachCondition(
  state: CivilizationState,
  historicalMaturity: CivilizationMaturity,
  currentReach: CivilizationMaturity,
): CivilizationReachCondition {
  const homeworldLost = state.worlds[state.homeworldId]?.state === 'annihilated';
  const activeSystemicCondition = Object.values(state.conditions).some((condition) =>
    condition.resolvedTurnCount === null &&
    (condition.coreType === 'isolated' || condition.coreType === 'disrupted'),
  );
  const disabledInfrastructure = Object.values(state.entities).some((entity) =>
    entity.state !== 'operational',
  );
  const gap = scaleIndex(historicalMaturity) - scaleIndex(currentReach);
  if (homeworldLost || gap >= 2) return 'fractured';
  if (gap === 1 || activeSystemicCondition || disabledInfrastructure) return 'degraded';
  return 'intact';
}

export function deriveCivilizationScaleState(
  state: CivilizationState,
  manifestedDevices: readonly Pick<ManifestedDevicePublicState, 'blueprintId' | 'state'>[] = [],
  turnCount: number | null = null,
): CivilizationScaleState {
  const historicalAssessment = assessCivilizationMaturity(state, manifestedDevices, 'historical');
  const operationalAssessment = assessCivilizationMaturity(state, manifestedDevices, 'operational');
  const historicalMaturity = scaleIndex(historicalAssessment.candidateMaturity) >
      scaleIndex(state.scale.historicalMaturity)
    ? historicalAssessment.candidateMaturity
    : state.scale.historicalMaturity;
  const historyEvidence: CivilizationHistoryEvidence = Object.values(state.artifacts)
    .some((lifecycle) => lifecycle.historyEvidence === 'legacy_inferred')
    ? 'legacy_inferred'
    : 'recorded';
  const maturityAdvanced = historicalMaturity !== state.scale.historicalMaturity;
  const latestReachEvidence = state.scale.currentReachEvidence.at(-1);
  const authoredReachIsActive = latestReachEvidence !== undefined &&
    latestReachEvidence.sourceType !== 'system';
  const currentReach = authoredReachIsActive
    ? state.scale.currentReach
    : operationalAssessment.candidateMaturity;
  const currentReachCondition = authoredReachIsActive
    ? state.scale.currentReachCondition
    : deriveReachCondition(
        state,
        historicalMaturity,
        operationalAssessment.candidateMaturity,
      );
  const reachChanged = currentReach !== state.scale.currentReach ||
    currentReachCondition !== state.scale.currentReachCondition;

  return {
    ...state.scale,
    historicalMaturity,
    historicalMaturityEvidence: maturityAdvanced
      ? [
          ...state.scale.historicalMaturityEvidence,
          scaleEvidence(`${CIVILIZATION_MATURITY_POLICY_ID}:${historicalMaturity}`, turnCount, historyEvidence),
        ]
      : state.scale.historicalMaturityEvidence,
    currentReach,
    currentReachCondition,
    currentReachEvidence: reachChanged
      ? [
          ...state.scale.currentReachEvidence,
          scaleEvidence(
            `${CIVILIZATION_MATURITY_POLICY_ID}:reach:${currentReach}:${currentReachCondition}`,
            turnCount,
            historyEvidence,
          ),
        ]
      : state.scale.currentReachEvidence,
  };
}

export interface CivilizationBlueprintManifestationProfile {
  blueprintId: BlueprintId;
  nativeScene: CivilizationCameraScale;
  physicalFootprint: BlueprintManifestationScale;
  validSocketClasses: readonly ArtifactPlacementFamily[];
  environmentalConstraints: readonly string[];
  motionBehavior: BlueprintManifestationMotion;
  nonNativeRepresentationPolicy: 'connected_locator';
}

export const CIVILIZATION_BLUEPRINT_MANIFESTATION_PROFILES: Record<
  BlueprintId,
  CivilizationBlueprintManifestationProfile
> = {
  bp_antimatter_detonator: {
    blueprintId: 'bp_antimatter_detonator',
    nativeScene: 'stellar',
    physicalFootprint: 'satellite',
    validSocketClasses: ['outer_system', 'lagrange_network'],
    environmentalConstraints: ['vacuum', 'inhabited-system exclusion orbit'],
    motionBehavior: 'gimbaled_orbit',
    nonNativeRepresentationPolicy: 'connected_locator',
  },
  bp_mantle_to_orbit_foundry: {
    blueprintId: 'bp_mantle_to_orbit_foundry',
    nativeScene: 'orbit',
    physicalFootprint: 'installation',
    validSocketClasses: ['orbital_yard', 'atmosphere_edge'],
    environmentalConstraints: ['planetary mantle access', 'stable cargo orbit'],
    motionBehavior: 'industrial_transit',
    nonNativeRepresentationPolicy: 'connected_locator',
  },
  bp_ascension_registry: {
    blueprintId: 'bp_ascension_registry',
    nativeScene: 'stellar',
    physicalFootprint: 'distributed',
    validSocketClasses: ['distributed_systems', 'lagrange_network'],
    environmentalConstraints: ['multiple civic nodes', 'line-of-sight relay'],
    motionBehavior: 'signal_constellation',
    nonNativeRepresentationPolicy: 'connected_locator',
  },
  bp_worldshield_covenant: {
    blueprintId: 'bp_worldshield_covenant',
    nativeScene: 'orbit',
    physicalFootprint: 'planetary',
    validSocketClasses: ['atmosphere_edge', 'high_orbit'],
    environmentalConstraints: ['continuous planetary envelope', 'synchronous shield nodes'],
    motionBehavior: 'shield_breath',
    nonNativeRepresentationPolicy: 'connected_locator',
  },
};

export interface CivilizationManifestationSocketCapacity {
  nativeScene: CivilizationCameraScale;
  placementFamily: ArtifactPlacementFamily;
  currentCompatibleSourceCount: number;
  authoredCapacity: number;
}

/** Production contract: every compatible template carries 25% spare capacity. */
export function getCivilizationManifestationSocketCapacities(): CivilizationManifestationSocketCapacity[] {
  const demand = new Map<string, {
    nativeScene: CivilizationCameraScale;
    placementFamily: ArtifactPlacementFamily;
    count: number;
  }>();
  const addDemand = (
    nativeScene: CivilizationCameraScale,
    placementFamily: ArtifactPlacementFamily,
  ) => {
    const key = `${nativeScene}:${placementFamily}`;
    const current = demand.get(key);
    demand.set(key, {
      nativeScene,
      placementFamily,
      count: (current?.count ?? 0) + 1,
    });
  };
  for (const profile of Object.values(ARTIFACT_MANIFESTATION_PROFILE_BY_ID)) {
    for (const placement of profile.compatiblePlacementFamilies) {
      addDemand(profile.nativeCameraScale, placement);
    }
  }
  for (const profile of Object.values(CIVILIZATION_BLUEPRINT_MANIFESTATION_PROFILES)) {
    for (const placement of profile.validSocketClasses) {
      addDemand(profile.nativeScene, placement);
    }
  }
  return [...demand.values()].map((entry) => ({
    nativeScene: entry.nativeScene,
    placementFamily: entry.placementFamily,
    currentCompatibleSourceCount: entry.count,
    authoredCapacity: Math.ceil(entry.count * CIVILIZATION_MANIFESTATION_SOCKET_RESERVE_RATIO),
  }));
}

function manifestationAssignmentKey(
  sourceType: CivilizationManifestationSourceType,
  sourceId: string,
): string {
  return `${sourceType}:${sourceId}`;
}

function nextAvailableManifestationSocket(
  scene: CivilizationCameraScale,
  placements: readonly ArtifactPlacementFamily[],
  occupiedSocketIds: ReadonlySet<string>,
): { placementFamily: ArtifactPlacementFamily; socketId: string } {
  const candidates = placements.map((placementFamily, preferenceIndex) => {
    let ordinal = 0;
    while (occupiedSocketIds.has(`${scene}:${placementFamily}:${ordinal}`)) ordinal += 1;
    return {
      placementFamily,
      socketId: `${scene}:${placementFamily}:${ordinal}`,
      ordinal,
      score: ordinal * 2 + preferenceIndex * 0.72,
    };
  });
  const selected = candidates.sort((left, right) => left.score - right.score)[0];
  if (selected) return selected;
  const fallback = scene === 'surface'
    ? 'civic_core'
    : scene === 'orbit'
      ? 'low_orbit'
      : scene === 'stellar'
        ? 'distributed_systems'
        : 'distributed_clusters';
  let ordinal = 0;
  while (occupiedSocketIds.has(`${scene}:${fallback}:${ordinal}`)) ordinal += 1;
  return { placementFamily: fallback, socketId: `${scene}:${fallback}:${ordinal}` };
}

export function isCivilizationManifestationAssignmentCompatible(
  assignment: CivilizationManifestationAssignment,
): boolean {
  const physical = getArtifactPlacementPhysicalContract(assignment.placementFamily);
  if (physical.nativeScene !== assignment.nativeScene) return false;
  if (!assignment.socketId.startsWith(
    `${assignment.nativeScene}:${assignment.placementFamily}:`,
  )) return false;
  const ordinal = Number.parseInt(assignment.socketId.split(':').at(-1) ?? '', 10);
  if (!Number.isFinite(ordinal) || ordinal < 0) return false;

  if (assignment.sourceType === 'artifact') {
    const profile = ARTIFACT_MANIFESTATION_PROFILE_BY_ID[
      assignment.sourceId as keyof typeof ARTIFACT_MANIFESTATION_PROFILE_BY_ID
    ];
    return Boolean(
      profile &&
      profile.nativeCameraScale === assignment.nativeScene &&
      profile.compatiblePlacementFamilies.includes(assignment.placementFamily) &&
      profile.validSubstrates.includes(physical.substrate) &&
      profile.requiredSupportModes.includes(physical.requiredSupport),
    );
  }

  const profile = CIVILIZATION_BLUEPRINT_MANIFESTATION_PROFILES[assignment.sourceId as BlueprintId];
  return Boolean(
    profile &&
    profile.nativeScene === assignment.nativeScene &&
    profile.validSocketClasses.includes(assignment.placementFamily),
  );
}

/**
 * Allocates each unique physical work exactly once. Existing assignments are
 * immutable: new construction fills a compatible empty socket around it.
 */
export function reconcileCivilizationManifestationAssignments(
  state: CivilizationState,
  turnCount: number | null,
): Record<string, CivilizationManifestationAssignment> {
  const assignments = Object.fromEntries(
    Object.entries(state.manifestationAssignments ?? {}).filter(([, assignment]) => (
      isCivilizationManifestationAssignmentCompatible(assignment)
    )),
  ) as Record<string, CivilizationManifestationAssignment>;
  const occupied = new Set(Object.values(assignments).map((assignment) => assignment.socketId));
  const artifactProfiles = ARTIFACT_MANIFESTATION_PROFILE_BY_ID as Readonly<
    Record<string, ArtifactManifestationProfile>
  >;

  Object.values(state.artifacts)
    .sort((left, right) => (
      (left.firstMasteredTurnCount ?? Number.MAX_SAFE_INTEGER) -
        (right.firstMasteredTurnCount ?? Number.MAX_SAFE_INTEGER) ||
      left.artifactId.localeCompare(right.artifactId)
    ))
    .forEach((artifact) => {
      const key = manifestationAssignmentKey('artifact', artifact.artifactId);
      if (assignments[key]) return;
      const profile = artifactProfiles[artifact.artifactId];
      if (!profile) return;
      const districtId = profile.nativeCameraScale === 'surface'
        ? state.districtIdentity?.artifactAssignments?.[artifact.artifactId]
        : undefined;
      const districtFamily = districtId
        ? state.districtIdentity?.districts?.[districtId]?.family
        : undefined;
      const socket = nextAvailableManifestationSocket(
        profile.nativeCameraScale,
        districtFamily ? [districtFamily] : profile.compatiblePlacementFamilies,
        occupied,
      );
      assignments[key] = {
        sourceId: artifact.artifactId,
        sourceType: 'artifact',
        nativeScene: profile.nativeCameraScale,
        placementFamily: socket.placementFamily,
        socketId: socket.socketId,
        assignmentTurnCount: artifact.firstMasteredTurnCount ?? turnCount,
        historyEvidence: artifact.historyEvidence,
      };
      occupied.add(socket.socketId);
    });

  Object.values(state.projects ?? {})
    .filter((project) => project.status === 'manifested')
    .sort((left, right) => (
      (left.manifestedTurnCount ?? Number.MAX_SAFE_INTEGER) -
        (right.manifestedTurnCount ?? Number.MAX_SAFE_INTEGER) ||
      left.blueprintId.localeCompare(right.blueprintId)
    ))
    .forEach((project) => {
      const key = manifestationAssignmentKey('blueprint', project.blueprintId);
      if (assignments[key]) return;
      const profile = CIVILIZATION_BLUEPRINT_MANIFESTATION_PROFILES[project.blueprintId];
      const socket = nextAvailableManifestationSocket(
        profile.nativeScene,
        profile.validSocketClasses,
        occupied,
      );
      assignments[key] = {
        sourceId: project.blueprintId,
        sourceType: 'blueprint',
        nativeScene: profile.nativeScene,
        placementFamily: socket.placementFamily,
        socketId: socket.socketId,
        assignmentTurnCount: project.manifestedTurnCount ?? turnCount,
        historyEvidence: project.historyEvidence,
      };
      occupied.add(socket.socketId);
    });

  return assignments;
}

/** Reconciles every deterministic Civilization view of the same causal state. */
export function reconcileCivilizationDerivedState(
  state: CivilizationState,
  manifestedDevices: readonly ManifestedDevicePublicState[] = [],
  turnCount: number | null = null,
  nestedIdentityOptions: ReconcileCivilizationNestedIdentityOptions = {},
  districtIdentityOptions: ReconcileCivilizationDistrictIdentityOptions = {},
): CivilizationState {
  const authoritativeProjects = civilizationProjectMaturityInputs(state);
  const maturityProjects = Object.keys(state.projects ?? {}).length > 0
    ? authoritativeProjects
    : manifestedDevices;
  const districtIdentity = reconcileCivilizationDistrictIdentityState(
    state,
    turnCount,
    districtIdentityOptions,
  );
  const stateWithDistrictIdentity = { ...state, districtIdentity };
  const affinityIdentity = applyCivilizationDistrictDirectionToAffinityIdentity(
    deriveCivilizationAffinityIdentity(state.artifacts),
    districtIdentity,
    state.affinityIdentity,
    turnCount,
  );
  const withIdentity: CivilizationState = {
    ...state,
    affinityIdentity,
    districtIdentity,
    identityScales: reconcileCivilizationNestedIdentityState(
      stateWithDistrictIdentity,
      turnCount,
      nestedIdentityOptions,
    ),
    manifestationAssignments: reconcileCivilizationManifestationAssignments(
      stateWithDistrictIdentity,
      turnCount,
    ),
  };
  const withScale = {
    ...withIdentity,
    scale: deriveCivilizationScaleState(withIdentity, maturityProjects, turnCount),
  };
  return {
    ...withScale,
    stability: recalculateCivilizationStabilityFromState(withScale, turnCount),
  };
}

export interface BlueprintManifestationEvent {
  eventId: string;
  blueprintId: BlueprintId;
  ownerPlayerId: string;
  slotIndex: number;
  presentationVariant: BlueprintPresentationVariant;
  createdAt: number;
}

export interface BlueprintArtifactSnapshot {
  id: string;
  name: string;
  tier: 1 | 2 | 3;
  bonusAffinity: StandardAffinityKey;
  eminence: number;
  cost: AffinityCounts;
  flavor: string;
}

export interface BlueprintDetonationEvent {
  eventId: string;
  blueprintId: BlueprintId;
  ownerPlayerId: string;
  triggeringPlayerId: string;
  targetCardId: string;
  trigger?: 'forged' | 'encrypted';
  hostileEffect?: 'burn' | 'annihilation' | 'nullification' | 'claim_cancellation';
  targetArtifact?: BlueprintArtifactSnapshot;
  collateralCardIds?: string[];
  collateralArtifacts?: BlueprintArtifactSnapshot[];
  interceptedByBlueprintId?: BlueprintId;
  presentationVariant: BlueprintPresentationVariant;
  createdAt: number;
}

export const EVENT_FREQUENCIES = ['off', 'standard', 'frequent'] as const;
export type EventFrequency = (typeof EVENT_FREQUENCIES)[number];
export type EventDelivery = 'archive_v1' | 'scheduled_forge_v1';
export const EVENT_FREQUENCY_LABELS: Record<EventFrequency, string> = {
  off: 'Off',
  standard: 'Standard',
  frequent: 'Frequent',
};

/** Historical pool retained for existing games and exact-board replays. */
export const GENERAL_CIVILIZATION_EVENT_CARD_IDS = [
  'event_planetary_affinity_bloom',
  'event_planetary_forge_drift',
  'event_stellar_containment_cascade',
  'event_stellar_affinity_inversion',
  'event_stellar_system_shock',
  'event_galactic_entropy_storm',
  'event_galactic_terminus_tide',
  'event_galactic_fracture_wave',
] as const;

/** Regular games use this reviewed pool; Containment Cascade awaits recovery rules. */
export const REGULAR_CIVILIZATION_EVENT_CARD_IDS = [
  'event_planetary_affinity_bloom',
  'event_planetary_forge_drift',
  'event_stellar_affinity_inversion',
  'event_stellar_system_shock',
  'event_galactic_entropy_storm',
  'event_galactic_terminus_tide',
  'event_galactic_fracture_wave',
] as const;

/** Unpublished pilot content. Never infer availability from a player's account. */
export const LORE_PILOT_CIVILIZATION_EVENT_CARD_IDS = [
  'event_planetary_signal_clarity',
  'event_stellar_synchronization_shear',
] as const;

export const CIVILIZATION_EVENT_CARD_IDS = [
  ...GENERAL_CIVILIZATION_EVENT_CARD_IDS,
  ...LORE_PILOT_CIVILIZATION_EVENT_CARD_IDS,
] as const;

export type CivilizationEventCardId =
  (typeof CIVILIZATION_EVENT_CARD_IDS)[number];

export type CivilizationEventContentProfile = 'general_v1' | 'general_v2' | 'lore_pilot_v1';

/** Fixed at match creation; the pilot is an explicit internal test/encounter pool. */
export const CIVILIZATION_EVENT_POOLS = {
  general_v1: GENERAL_CIVILIZATION_EVENT_CARD_IDS,
  general_v2: REGULAR_CIVILIZATION_EVENT_CARD_IDS,
  lore_pilot_v1: LORE_PILOT_CIVILIZATION_EVENT_CARD_IDS,
} as const satisfies Record<CivilizationEventContentProfile, readonly CivilizationEventCardId[]>;

export type CivilizationEventArtifactSelector =
  | { kind: 'capability'; id: ArtifactCivilizationCapabilityId }
  | { kind: 'event_fact'; id: ArtifactEventFactId };

/** Explicit public-state contract, independent of names, artwork and Affinity. */
export interface CivilizationEventTargetingRule {
  rulesVersion: 'lore-events-v1';
  zone: 'forged';
  lifecycle: 'operational';
  selector: CivilizationEventArtifactSelector;
  perPlayerLimit: 1;
  selectionOrder: 'newest_forged';
  protectedByOwnCapability?: ArtifactCivilizationCapabilityId;
}

export interface CivilizationEventTargetEvidence {
  artifactId: string;
  match: CivilizationEventArtifactSelector;
  role: 'responder' | 'target' | 'mitigator';
  reason: string;
}

export const CIVILIZATION_EVENT_WINDOWS = [
  'deck_reveal',
  // Retained for saved receipts from the milestone prototype.
  'first_contact',
  'late_pressure',
  'authored',
] as const;

export type CivilizationEventWindow =
  (typeof CIVILIZATION_EVENT_WINDOWS)[number];

export type CivilizationEventEffectProfile =
  | 'affinity_bloom'
  | 'forge_drift'
  | 'containment_cascade'
  | 'affinity_inversion'
  | 'system_shock'
  | 'entropy_storm'
  | 'terminus_tide'
  | 'fracture_wave'
  | 'signal_clarity'
  | 'synchronization_shear';

export interface CivilizationEventCardDefinition {
  id: CivilizationEventCardId;
  title: string;
  rulesText: string;
  tier: 1 | 2 | 3;
  effectProfile: CivilizationEventEffectProfile;
  timing: CivilizationEventWindow;
  pressureTags: readonly CivilizationPressureTag[];
  affectedPlayers: 'all' | 'leader' | 'trailing' | 'qualified';
  fallbackOutcomeId: CivilizationEventOutcomeId;
  targeting?: CivilizationEventTargetingRule;
  presentation: {
    scale: CivilizationCameraScale;
    accent: 'disruption' | 'opportunity' | 'crisis';
  };
}

/** Mechanical rules are draft content; authored Chronicle dialogue is independent. */
export const CIVILIZATION_EVENT_CARD_DEFINITIONS = {
  event_planetary_affinity_bloom: {
    id: 'event_planetary_affinity_bloom', title: 'Affinity Bloom', tier: 1,
    effectProfile: 'affinity_bloom', timing: 'deck_reveal',
    rulesText: 'Each player gains 1 of their least-held standard Affinities available in the Well, up to the 10-Affinity limit. Ties follow Well order.',
    pressureTags: [], affectedPlayers: 'all', fallbackOutcomeId: 'protected',
    presentation: { scale: 'orbit', accent: 'opportunity' },
  },
  event_planetary_forge_drift: {
    id: 'event_planetary_forge_drift', title: 'Orbital Drift', tier: 1,
    effectProfile: 'forge_drift', timing: 'deck_reveal',
    rulesText: 'The leftmost unmarked Planetary Artifact returns to the bottom of its Archive. Reveal its replacement in the Forge.',
    pressureTags: ['transformation'], affectedPlayers: 'all', fallbackOutcomeId: 'partial',
    presentation: { scale: 'orbit', accent: 'disruption' },
  },
  event_stellar_containment_cascade: {
    id: 'event_stellar_containment_cascade', title: 'Stellar Containment Cascade', tier: 2,
    effectProfile: 'containment_cascade', timing: 'deck_reveal',
    rulesText: 'Each civilization answers Disruption with its operational technologies.',
    pressureTags: ['disruption'], affectedPlayers: 'all', fallbackOutcomeId: 'exposed',
    presentation: { scale: 'stellar', accent: 'disruption' },
  },
  event_stellar_affinity_inversion: {
    id: 'event_stellar_affinity_inversion', title: 'Affinity Inversion', tier: 2,
    effectProfile: 'affinity_inversion', timing: 'deck_reveal',
    rulesText: 'Each player holding 3 or more of one standard Affinity returns 2 of their most-held Affinity to the Well. Other players gain 1 of their least-held available standard Affinities, up to the hand limit. Ties follow Well order.',
    pressureTags: ['disruption'], affectedPlayers: 'all', fallbackOutcomeId: 'partial',
    presentation: { scale: 'stellar', accent: 'disruption' },
  },
  event_galactic_entropy_storm: {
    id: 'event_galactic_entropy_storm', title: 'Entropy Storm', tier: 3,
    effectProfile: 'entropy_storm', timing: 'deck_reveal',
    rulesText: 'Each player returns up to 3 of their most-held standard Affinity to the Well and their oldest ordinary Encrypted Artifact to the bottom of its Archive. Foundry storage is unaffected. Ties follow Well order.',
    pressureTags: ['attrition'], affectedPlayers: 'all', fallbackOutcomeId: 'exposed',
    presentation: { scale: 'galaxy', accent: 'crisis' },
  },
  event_stellar_system_shock: {
    id: 'event_stellar_system_shock', title: 'System Shock', tier: 2,
    effectProfile: 'system_shock', timing: 'deck_reveal',
    rulesText: 'Damage each player\'s most recently Forged operational Artifact. Damaged Artifacts keep their Affinity bonuses but cannot contribute to new Blueprints or Legacy Victory until repaired.',
    pressureTags: ['disruption'], affectedPlayers: 'all', fallbackOutcomeId: 'exposed',
    presentation: { scale: 'stellar', accent: 'disruption' },
  },
  event_galactic_terminus_tide: {
    id: 'event_galactic_terminus_tide', title: 'Cosmic Reflux', tier: 3,
    effectProfile: 'terminus_tide', timing: 'deck_reveal',
    rulesText: 'Return the oldest Burned Artifact of each tier from the Burn Pile to its Forge, replacing its leftmost unmarked Artifact if needed. Each player gains 1 Singularity from the Well, up to the hand limit.',
    pressureTags: ['transformation'], affectedPlayers: 'all', fallbackOutcomeId: 'protected',
    presentation: { scale: 'galaxy', accent: 'opportunity' },
  },
  event_galactic_fracture_wave: {
    id: 'event_galactic_fracture_wave', title: 'Fracture Wave', tier: 3,
    effectProfile: 'fracture_wave', timing: 'deck_reveal',
    rulesText: 'Damage up to 2 of each player\'s highest-tier operational Artifacts, choosing the most recently Forged first within a tier. Damaged Artifacts keep their Affinity bonuses but cannot contribute to new Blueprints or Legacy Victory until repaired.',
    pressureTags: ['attrition'], affectedPlayers: 'all', fallbackOutcomeId: 'exposed',
    presentation: { scale: 'galaxy', accent: 'crisis' },
  },
  event_planetary_signal_clarity: {
    id: 'event_planetary_signal_clarity', title: 'Signal Clarity', tier: 1,
    effectProfile: 'signal_clarity', timing: 'deck_reveal',
    rulesText: 'Interference subsides. Each player with an operational signal-interpreting Artifact gains 1 of their least-held standard Affinities available in the Well, up to the hand limit. Each Artifact reads only its established domain. Resolve players in seating order; Affinity ties follow Well order.',
    pressureTags: [], affectedPlayers: 'all', fallbackOutcomeId: 'protected',
    targeting: {
      rulesVersion: 'lore-events-v1', zone: 'forged', lifecycle: 'operational',
      selector: { kind: 'capability', id: 'artifact:signal_interpretation' },
      perPlayerLimit: 1, selectionOrder: 'newest_forged',
    },
    presentation: { scale: 'orbit', accent: 'opportunity' },
  },
  event_stellar_synchronization_shear: {
    id: 'event_stellar_synchronization_shear', title: 'Synchronization Shear', tier: 2,
    effectProfile: 'synchronization_shear', timing: 'deck_reveal',
    rulesText: 'Damage each player\'s most recently Forged unprotected operational Artifact that depends on coordination between separated active systems. An Artifact with its own resilient computation protects only itself and is skipped when selecting a target. If none qualifies, nothing is damaged. Damaged Artifacts retain Affinity bonuses but cannot contribute to new Blueprints or Legacy Victory until repaired.',
    pressureTags: ['coordination'], affectedPlayers: 'all', fallbackOutcomeId: 'protected',
    targeting: {
      rulesVersion: 'lore-events-v1', zone: 'forged', lifecycle: 'operational',
      selector: { kind: 'event_fact', id: 'dependency:distributed_synchronization' },
      protectedByOwnCapability: 'artifact:resilient_computation',
      perPlayerLimit: 1, selectionOrder: 'newest_forged',
    },
    presentation: { scale: 'stellar', accent: 'disruption' },
  },
} as const satisfies Record<CivilizationEventCardId, CivilizationEventCardDefinition>;

export function isCivilizationEventCardId(id: string): id is CivilizationEventCardId {
  return (CIVILIZATION_EVENT_CARD_IDS as readonly string[]).includes(id);
}

export const CIVILIZATION_EVENT_OUTCOME_IDS = [
  'protected',
  'partial',
  'exposed',
] as const;

export type CivilizationEventOutcomeId =
  (typeof CIVILIZATION_EVENT_OUTCOME_IDS)[number];

export interface CivilizationEventRespondingManifestation {
  sourceType: CivilizationManifestationSourceType;
  sourceId: string;
  capabilityIds: CivilizationCapabilityId[];
}

export interface CivilizationEventPlayerOutcome {
  playerId: string;
  outcomeId: CivilizationEventOutcomeId;
  capabilityCoverage: CivilizationPressureCapabilityCoverage;
  respondingCapabilityIds: CivilizationCapabilityId[];
  respondingManifestations: CivilizationEventRespondingManifestation[];
  /** Public forged implementations disabled by this Event; absent in older receipts. */
  damagedArtifactIds?: string[];
  targetEvidence?: CivilizationEventTargetEvidence[];
  appliedConditionType: CivilizationConditionType | null;
  stabilityPressure: number;
  summary: string;
}

export const CIVILIZATION_EVENT_INSTANCE_PHASES = [
  'reveal',
  'awaiting_choice',
  'resolving',
  'receipt',
  'complete',
] as const;

export type CivilizationEventInstancePhase =
  (typeof CIVILIZATION_EVENT_INSTANCE_PHASES)[number];

/**
 * Public, reconnect-safe presentation receipt. New `reveal` receipts contain
 * deterministic previews; consequences commit when presentation is acknowledged.
 * Legacy `receipt` instances already committed and must not be applied again.
 */
export interface CivilizationEventInstance {
  eventId: string;
  rulesVersion?: string;
  /** Frozen explanation for versioned receipts, independent of later catalog edits. */
  rulesText?: string;
  definitionId: CivilizationEventCardId;
  triggerWindow: CivilizationEventWindow;
  triggerTurnCount: number;
  /** Forge slot remains occupied until this receipt is acknowledged. */
  sourceCard?: {
    id: CivilizationEventCardId;
    tier: 1 | 2 | 3;
    /** Scheduled Events fill a vacated Forge mold from the separate Event deck. */
    origin?: 'forge' | 'archive' | 'scheduled';
    /** Physical source mold; null retains blind Archive and legacy scheduled temporary reveals. */
    forgeSlotIndex: number | null;
  };
  phase: CivilizationEventInstancePhase;
  affectedPlayerIds: string[];
  outcomesByPlayerId: Record<string, CivilizationEventPlayerOutcome>;
  createdAt: number;
}

/** Public timing information. Selected Event identities and queue order stay private. */
export interface EventForecast {
  status: 'off' | 'countdown' | 'armed' | 'resolving' | 'complete' | 'closed';
  tier: 1 | 2 | 3 | null;
  roundsRemaining: number | null;
  /** Number of this player's ordinary turns remaining before the countdown is armed. */
  turnsRemainingByPlayerId: Record<string, number>;
}

/** Private, replayable separate Event deck and activation cursor. */
export interface CivilizationEventScheduleState {
  queue: CivilizationEventCardId[];
  roundFloors: number[];
  nextQueueIndex: number;
  dueAfterTurnCount: number;
  lastEventTurnCount: number | null;
  readyCardId: CivilizationEventCardId | null;
}

/** Private catalog and resolution cursor; legacy games keep Events in Artifact Archives. */
export interface CivilizationEventDeckState {
  contentProfile?: CivilizationEventContentProfile;
  eventFrequency?: EventFrequency;
  delivery?: EventDelivery;
  scheduled?: CivilizationEventScheduleState;
  rulesVersion?: string;
  definitionIds: CivilizationEventCardId[];
  nextIndex: number;
  firedWindows: CivilizationEventWindow[];
  completedEventIds: string[];
}

export type ScenarioProtocolId =
  | 'sealed_protocol_01'
  | 'sealed_protocol_02'
  | 'sealed_protocol_03';

export interface ScenarioProtocolPublicState {
  protocolId: ScenarioProtocolId;
  ownerPlayerId: string;
  slotIndex: number;
  state: BlueprintDeviceState;
  publicEffect: string;
  foundryUsesRemaining?: number;
  ascensionDeferrals?: number;
  foundryTier2Ready?: boolean;
  foundryTier3Ready?: boolean;
}

export interface ScenarioProtocolEvent {
  eventId: string;
  protocolId: ScenarioProtocolId;
  ownerPlayerId: string;
  slotIndex: number;
  kind: 'manifestation' | 'effect';
  publicEffect: string;
  triggeringPlayerId?: string;
  targetCardId?: string;
  trigger?: 'forged' | 'encrypted';
  hostileEffect?: 'burn' | 'annihilation' | 'nullification' | 'claim_cancellation';
  targetArtifact?: BlueprintArtifactSnapshot;
  collateralCardIds?: string[];
  collateralArtifacts?: BlueprintArtifactSnapshot[];
  intercepted?: boolean;
  createdAt: number;
}

export type CosmeticSlot =
  | 'card_back'
  | 'civilization_ambience'
  | 'luminary_arrival_sound'
  | 'blueprint_presentation'
  | 'vault_seal';

export type LuminaryArrivalSoundVariant = 'standard' | 'first_resonance';

export interface CosmeticLoadoutItem {
  slot: CosmeticSlot;
  scopeKey: string;
  itemId: string;
}

export interface BlueprintClearanceSummary {
  qualifyingWins: number;
  requiredWins: number;
  status: BlueprintClearanceStatus;
  challengeRoomId: string | null;
  cipherDeactivated: boolean;
  thresholdApproach: LumiiThresholdApproach | null;
  thresholdDialoguePath: LumiiThresholdDialogueChoiceId[];
  thresholdDialogueResolution: LumiiThresholdDialogueResolution | null;
  thresholdRuptured: boolean;
  /** @deprecated Compatibility alias for Threshold rupture. */
  covenantBroken: boolean;
  decryptionKeyBypassActive: boolean;
  revealPending: boolean;
}

export interface BlueprintVaultState {
  clearance: BlueprintClearanceSummary & { warningSeen: boolean };
  decryptionKeyAvailable: boolean;
  slotCount: number;
  competitiveEnabled: boolean;
  unlockedBlueprintIds: BlueprintId[];
  blueprints: BlueprintDefinition[];
  corruptedRecordCount: number | null;
  campaignNodes: Array<{
    id: string;
    blueprintId: BlueprintId;
    title: string;
    status: CampaignContentState;
  }>;
  campaignProgress: CampaignProgressProjection;
  loadouts: BlueprintLoadout[];
  mastery: Array<{
    blueprintId: BlueprintId;
    manifestations: number;
    triggers: number;
    armedMatchFinishes: number;
  }>;
  chronicles?: AccountArchiveChronicle[];
}

export interface BlueprintChallengeSession {
  roomId: string;
  inviteCode: string;
  playerId: string;
  sessionToken: string;
  resumed: boolean;
  scenarioId: string;
  lumiiThresholdApproach: LumiiThresholdApproach;
  campaignAssistance: string;
}

export interface BlueprintVaultThresholdResult {
  ok: true;
  status: BlueprintClearanceStatus;
  cipherDeactivated: boolean;
  thresholdApproach: LumiiThresholdApproach | null;
  thresholdDialoguePath: LumiiThresholdDialogueChoiceId[];
  thresholdDialogueResolution: LumiiThresholdDialogueResolution | null;
  decryptionKeyBypassActive: boolean;
}

export interface BlueprintDecryptionKeyUseResult {
  ok: true;
  status: 'challenge_ready';
  alreadyActive: boolean;
  decryptionKeyAvailable: false;
  decryptionKeyBypassActive: true;
}

export interface BlueprintChallengeWithdrawal {
  roomId: string;
  status: Extract<BlueprintClearanceStatus, 'classified' | 'challenge_ready'>;
}

export interface AccountArchiveArtifact {
  id: string;
  name: string;
  flavor: string;
  tier: 1 | 2 | 3;
  bonusAffinity: string;
  eminence: number;
  forgeCount: number;
}

export interface AccountArchiveLuminary {
  id: string;
  name: string;
  domain: string;
  eminence: number;
  flavor: string;
  effectName: string | null;
  effectDescription: string | null;
  summonColor: string;
  summonSecondaryColor: string;
  allianceCount: number;
}

export interface AccountArchiveChronicle {
  id: ChronicleId;
  title: string;
  chapterLabel: string;
  summary: string;
  status: ChronicleStatus;
  unlockedAt: string | null;
  relatedBlueprintIds: BlueprintId[];
}

export interface AccountArchiveSummary {
  artifacts: {
    discovered: AccountArchiveArtifact[];
    total: number;
    discoveredByTier: Record<1 | 2 | 3, number>;
    totalByTier: Record<1 | 2 | 3, number>;
  };
  luminaries: {
    encountered: AccountArchiveLuminary[];
    total: number;
  };
  identity: {
    totalForges: number;
    totalAlliances: number;
    signatureArtifactId: string | null;
    closestLuminaryId: string | null;
  };
  vault: {
    qualifyingWins: number;
    requiredWins: number;
    unlocked: boolean;
    status: BlueprintClearanceStatus;
    challengeRoomId: string | null;
  };
  chronicles?: {
    entries: AccountArchiveChronicle[];
    recovered: number;
    total: number;
  };
}

export const CIVILIZATION_RECORD_VERSION = 2 as const;
export type CivilizationRecordVersion = 1 | typeof CIVILIZATION_RECORD_VERSION;

export type CivilizationRecordEvidence =
  | 'recorded'
  | 'partial_legacy'
  | 'legacy_unavailable';

export type CivilizationRecordFinishReason = 'win' | 'surrender' | 'unknown';

export interface CivilizationRecordProject {
  blueprintId: BlueprintId;
  state: BlueprintDeviceState;
  slotIndex: number;
}

export interface CivilizationRecordLuminaryRelationship {
  luminaryId: LuminaryId;
  allianceCount: number;
}

export const CIVILIZATION_OUTCOME_POLICY_ID = 'civilization-outcome-v1' as const;
export const CIVILIZATION_LUME_POLICY_ID = 'civilization-lume-v1' as const;

export const CIVILIZATION_OUTCOME_CATEGORIES = [
  'ascendant',
  'enduring',
  'precarious',
  'subordinated',
  'collapsed',
] as const;

export type CivilizationOutcomeCategory =
  (typeof CIVILIZATION_OUTCOME_CATEGORIES)[number];

export type CivilizationOutcomeDimension =
  | CivilizationHistoricalQualityDimension
  | 'stability';

export interface CivilizationOutcomeFactor {
  factorId: string;
  direction: 'support' | 'pressure';
  points: number;
  label: string;
  source: 'structural' | 'authored';
}

export interface CivilizationOutcomeDimensionAssessment {
  dimension: CivilizationOutcomeDimension;
  score: number;
  baseline: number;
  factors: CivilizationOutcomeFactor[];
  explanation: string;
}

export interface CivilizationAdversityAssessment {
  /** Context only; never included as a fifth weighted dimension. */
  intensity: number;
  recoveryEligibleIntensity: number;
  recoveryCredit: number;
  explanation: string;
}

export interface CivilizationOutcomeAssessment {
  policyId: typeof CIVILIZATION_OUTCOME_POLICY_ID;
  evidence: CivilizationRecordEvidence;
  category: CivilizationOutcomeCategory;
  qualityScore: number;
  dimensions: {
    continuity: CivilizationOutcomeDimensionAssessment;
    agency: CivilizationOutcomeDimensionAssessment;
    achievement: CivilizationOutcomeDimensionAssessment;
    stability: CivilizationOutcomeDimensionAssessment;
  };
  adversity: CivilizationAdversityAssessment;
  explanation: string[];
}

export interface CivilizationOutcomeSummary {
  policyId: typeof CIVILIZATION_OUTCOME_POLICY_ID;
  evidence: CivilizationRecordEvidence;
  category: CivilizationOutcomeCategory;
  qualityScore: number;
  continuity: number;
  agency: number;
  achievement: number;
  stability: number;
  adversityIntensity: number;
  recoveryCredit: number;
  primaryFactors: Record<CivilizationOutcomeDimension, CivilizationOutcomePublicFactor[]>;
  explanation: string[];
}

export interface CivilizationOutcomePublicFactor {
  direction: 'support' | 'pressure';
  points: number;
  label: string;
}

export const CIVILIZATION_LUME_AWARD_STATUSES = [
  'awarded',
  'insufficient_evidence',
  'retroactive_ineligible',
  'campaign_record_only',
  'campaign_policy_required',
  'custom_ineligible',
  'unavailable',
] as const;

export type CivilizationLumeAwardStatus =
  (typeof CIVILIZATION_LUME_AWARD_STATUSES)[number];

export const CIVILIZATION_CAMPAIGN_LUME_POLICIES = [
  'award',
  'record_only',
] as const;

export type CivilizationCampaignLumePolicy =
  (typeof CIVILIZATION_CAMPAIGN_LUME_POLICIES)[number];

export const CIVILIZATION_HISTORICAL_CONTEXTS = [
  'historical',
  'forecast',
  'rehearsal',
  'interface_simulation',
  'unknown',
] as const;

export type CivilizationHistoricalContext =
  (typeof CIVILIZATION_HISTORICAL_CONTEXTS)[number];

export interface CivilizationLumeAssessment {
  policyId: typeof CIVILIZATION_LUME_POLICY_ID;
  status: CivilizationLumeAwardStatus;
  amount: number;
  qualityScore: number | null;
  recoveryCredit: number;
  explanation: string[];
}

export interface AssessCivilizationOutcomeInput {
  civilization: CivilizationState;
  projects: readonly CivilizationRecordProject[];
  evidence: CivilizationRecordEvidence;
}

export interface AssessCivilizationLumeInput {
  outcome: CivilizationOutcomeAssessment | null;
  evidence: CivilizationRecordEvidence;
  gameMode: GameMode;
  liveClosure: boolean;
  campaignLumePolicy?: CivilizationCampaignLumePolicy;
}

function clampOutcomeScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function outcomeImpactPoints(magnitude: CivilizationStabilityImpact): number {
  return CIVILIZATION_STABILITY_IMPACT_MAGNITUDES[magnitude];
}

function dimensionAssessment(
  dimension: CivilizationOutcomeDimension,
  baseline: number,
  factors: CivilizationOutcomeFactor[],
): CivilizationOutcomeDimensionAssessment {
  const deduplicatedFactors = [...new Map(
    factors.map((factor) => [factor.factorId, factor]),
  ).values()];
  const score = clampOutcomeScore(deduplicatedFactors.reduce(
    (total, factor) => total + (factor.direction === 'support' ? factor.points : -factor.points),
    baseline,
  ));
  const strongestSupport = deduplicatedFactors
    .filter((factor) => factor.direction === 'support')
    .sort((left, right) => right.points - left.points)[0];
  const strongestPressure = deduplicatedFactors
    .filter((factor) => factor.direction === 'pressure')
    .sort((left, right) => right.points - left.points)[0];
  const explanation = strongestPressure
    ? `${dimension} closes at ${score}; strongest pressure: ${strongestPressure.label}.`
    : strongestSupport
      ? `${dimension} closes at ${score}; strongest support: ${strongestSupport.label}.`
      : `${dimension} closes at ${score} from its recorded baseline.`;
  return { dimension, score, baseline, factors: deduplicatedFactors, explanation };
}

function eventOutcomeFactors(
  state: CivilizationState,
  dimension: CivilizationHistoricalQualityDimension,
): CivilizationOutcomeFactor[] {
  return state.events.flatMap((event) => (event.outcomeSignals ?? [])
    .filter((signal) => signal.dimension === dimension)
    .map((signal) => ({
      factorId: `${event.eventId}:${signal.signalId}`,
      direction: signal.direction,
      points: outcomeImpactPoints(signal.magnitude),
      label: signal.label,
      source: 'authored' as const,
    })));
}

function continuityFactors(state: CivilizationState): CivilizationOutcomeFactor[] {
  const factors: CivilizationOutcomeFactor[] = [];
  const settledWorlds = Object.values(state.worlds).filter((world) => world.role === 'settled_world');
  const activeSettledWorlds = settledWorlds.filter((world) => world.state === 'active').length;
  const annihilatedSettledWorlds = settledWorlds.length - activeSettledWorlds;
  const homeworld = state.worlds[state.homeworldId];
  if (!homeworld) {
    factors.push({
      factorId: 'homeworld-unrecorded',
      direction: 'pressure',
      points: 35,
      label: 'Homeworld continuity is unrecorded',
      source: 'structural',
    });
  } else if (homeworld.state === 'annihilated') {
    factors.push({
      factorId: 'homeworld-annihilated',
      direction: 'pressure',
      points: activeSettledWorlds > 0 ? 55 : 70,
      label: activeSettledWorlds > 0
        ? 'Homeworld annihilated; off-world continuity remains'
        : 'Homeworld annihilated with no viable settled world',
      source: 'structural',
    });
  }

  if (activeSettledWorlds > 0) {
    factors.push({
      factorId: 'active-settled-worlds',
      direction: 'support',
      points: Math.min(10, activeSettledWorlds * 4),
      label: 'Viable settled worlds preserve multiple futures',
      source: 'structural',
    });
  }
  if (annihilatedSettledWorlds > 0) {
    factors.push({
      factorId: 'annihilated-settled-worlds',
      direction: 'pressure',
      points: Math.min(40, annihilatedSettledWorlds * 20),
      label: 'Settled worlds were annihilated',
      source: 'structural',
    });
  }

  if (state.scale.currentReachCondition === 'degraded') {
    factors.push({
      factorId: 'reach-degraded',
      direction: 'pressure',
      points: 8,
      label: 'Operational reach is degraded',
      source: 'structural',
    });
  } else if (state.scale.currentReachCondition === 'fractured') {
    factors.push({
      factorId: 'reach-fractured',
      direction: 'pressure',
      points: 18,
      label: 'Operational reach is fractured',
      source: 'structural',
    });
  }

  const annihilatedEntities = Object.values(state.entities)
    .filter((entity) => entity.state === 'annihilated').length;
  if (annihilatedEntities > 0) {
    factors.push({
      factorId: 'annihilated-infrastructure',
      direction: 'pressure',
      points: Math.min(12, annihilatedEntities * 4),
      label: 'Consequential infrastructure was annihilated',
      source: 'structural',
    });
  }

  const activeSystemicConditions = Object.values(state.conditions).filter((condition) =>
    condition.resolvedTurnCount === null &&
    (condition.target.kind === 'world' || condition.target.kind === 'network'),
  );
  if (activeSystemicConditions.length > 0) {
    factors.push({
      factorId: 'active-systemic-conditions',
      direction: 'pressure',
      points: Math.min(20, activeSystemicConditions.reduce((total, condition) => {
        if (condition.coreType === 'isolated') return total + 10;
        if (condition.coreType === 'quarantined') return total + 7;
        if (condition.coreType === 'disrupted') return total + 8;
        return total + 4;
      }, 0)),
      label: 'Worlds or networks remain systemically constrained',
      source: 'structural',
    });
  }
  return [...factors, ...eventOutcomeFactors(state, 'continuity')];
}

function achievementFactors(
  state: CivilizationState,
  projects: readonly CivilizationRecordProject[],
): CivilizationOutcomeFactor[] {
  const masteredArtifacts = Object.values(state.artifacts)
    .filter((artifact) => artifact.masteryCount > 0).length;
  const capabilityCount = deriveHistoricalArtifactCapabilityIds(state).length;
  const maturityPoints = state.scale.historicalMaturity === 'galactic'
    ? 30
    : state.scale.historicalMaturity === 'stellar'
      ? 15
      : 0;
  const factors: CivilizationOutcomeFactor[] = [
    {
      factorId: 'mastered-implementations',
      direction: 'support',
      points: Math.min(20, masteredArtifacts * 2),
      label: 'Distinct Artifact implementations were mastered',
      source: 'structural',
    },
    {
      factorId: 'capability-breadth',
      direction: 'support',
      points: Math.min(25, capabilityCount * 2),
      label: 'Mastered capabilities span a broad technological history',
      source: 'structural',
    },
  ];
  if (maturityPoints > 0) {
    factors.push({
      factorId: 'historical-maturity',
      direction: 'support',
      points: maturityPoints,
      label: `${state.scale.historicalMaturity} Maturity was historically demonstrated`,
      source: 'structural',
    });
  }
  const uniqueProjectCount = new Set(projects.map((project) => project.blueprintId)).size;
  if (uniqueProjectCount > 0) {
    factors.push({
      factorId: 'manifested-projects',
      direction: 'support',
      points: Math.min(16, uniqueProjectCount * 8),
      label: 'Blueprint Projects manifested',
      source: 'structural',
    });
  }
  return [...factors, ...eventOutcomeFactors(state, 'achievement')];
}

function stabilityAssessment(state: CivilizationState): CivilizationOutcomeDimensionAssessment {
  const factors = state.stability.contributors
    .filter((contributor) => contributor.resolvedTurnCount === null)
    .map((contributor): CivilizationOutcomeFactor => ({
      factorId: contributor.id,
      direction: contributor.direction,
      points: contributor.magnitude,
      label: contributor.label,
      source: contributor.id.startsWith('structural:') ? 'structural' : 'authored',
    }));
  const score = clampOutcomeScore(
    state.stability.score ?? CIVILIZATION_STABILITY_CALIBRATION_V1.baseline,
  );
  return {
    dimension: 'stability',
    score,
    baseline: CIVILIZATION_STABILITY_CALIBRATION_V1.baseline,
    factors,
    explanation: `stability closes at ${score} (${state.stability.band}).`,
  };
}

function adversityAssessment(
  state: CivilizationState,
  continuity: number,
  stability: number,
): CivilizationAdversityAssessment {
  const authoredById = new Map<string, CivilizationAdversityEvidence>();
  for (const event of state.events) {
    if (event.adversity) {
      authoredById.set(`${event.eventId}:${event.adversity.evidenceId}`, event.adversity);
    }
  }
  const authored = [...authoredById.values()];
  const resolvedPressures = [...new Map(
    state.stability.contributors
      .filter((contributor) =>
        contributor.direction === 'pressure' && contributor.resolvedTurnCount !== null,
      )
      .map((contributor) => [contributor.id, contributor] as const),
  ).values()];
  const authoredIntensity = authored.reduce(
    (total, evidence) => total + outcomeImpactPoints(evidence.magnitude),
    0,
  );
  const resolvedIntensity = resolvedPressures.reduce(
    (total, contributor) => total + contributor.magnitude,
    0,
  );
  const recoveryEligibleIntensity = Math.min(100, authored
    .filter((evidence) => evidence.recoveryEligible)
    .reduce((total, evidence) => total + outcomeImpactPoints(evidence.magnitude), 0) +
    resolvedIntensity);
  const intensity = Math.min(100, authoredIntensity + resolvedIntensity);
  const recoveryStrength = Math.min(continuity, stability) / 100;
  const recoveryCredit = continuity >= 50 && stability >= 45
    ? Math.min(8, Math.round((recoveryEligibleIntensity / 5) * recoveryStrength))
    : 0;
  return {
    intensity,
    recoveryEligibleIntensity,
    recoveryCredit,
    explanation: recoveryCredit > 0
      ? `Recovered from qualifying adversity contributes ${recoveryCredit} quality points.`
      : intensity > 0
        ? 'Adversity is recorded as context; unresolved harm grants no recovery credit.'
        : 'No qualifying recovery adversity was recorded.',
  };
}

/**
 * Assesses historical quality without consulting competitive result, Eminence,
 * turn count, held Affinities, or cosmetic/account state.
 */
export function assessCivilizationOutcome(
  input: AssessCivilizationOutcomeInput,
): CivilizationOutcomeAssessment {
  const continuity = dimensionAssessment('continuity', 82, continuityFactors(input.civilization));
  const agency = dimensionAssessment(
    'agency',
    75,
    eventOutcomeFactors(input.civilization, 'agency'),
  );
  const achievement = dimensionAssessment(
    'achievement',
    10,
    achievementFactors(input.civilization, input.projects),
  );
  const stability = stabilityAssessment(input.civilization);
  const adversity = adversityAssessment(
    input.civilization,
    continuity.score,
    stability.score,
  );
  let qualityScore = clampOutcomeScore(
    continuity.score * 0.30 +
    agency.score * 0.25 +
    achievement.score * 0.25 +
    stability.score * 0.20 +
    adversity.recoveryCredit,
  );
  if (continuity.score < 20) qualityScore = Math.min(qualityScore, 30);
  if (agency.score < 20) qualityScore = Math.min(qualityScore, 40);
  if (stability.score < 20) qualityScore = Math.min(qualityScore, 65);

  const category: CivilizationOutcomeCategory = continuity.score < 20
    ? 'collapsed'
    : agency.score < 25
      ? 'subordinated'
      : continuity.score < 50 || stability.score < 30 ||
        input.civilization.scale.currentReachCondition === 'fractured'
        ? 'precarious'
        : achievement.score >= 70 && qualityScore >= 70
          ? 'ascendant'
          : 'enduring';

  return {
    policyId: CIVILIZATION_OUTCOME_POLICY_ID,
    evidence: input.evidence,
    category,
    qualityScore,
    dimensions: { continuity, agency, achievement, stability },
    adversity,
    explanation: [
      `Historical outcome: ${category}.`,
      `Quality ${qualityScore}/100 from Continuity ${continuity.score}, Agency ${agency.score}, Achievement ${achievement.score}, and Stability ${stability.score}.`,
      adversity.explanation,
      'Competitive result and Eminence are not assessment inputs.',
    ],
  };
}

export function summarizeCivilizationOutcome(
  outcome: CivilizationOutcomeAssessment | null,
): CivilizationOutcomeSummary | null {
  if (!outcome) return null;
  const summarizeFactors = (
    assessment: CivilizationOutcomeDimensionAssessment,
  ): CivilizationOutcomePublicFactor[] => {
    const strongest = (direction: CivilizationOutcomePublicFactor['direction']) => assessment.factors
      .filter((factor) => factor.direction === direction)
      .sort((left, right) => right.points - left.points)[0];
    return (['support', 'pressure'] as const).flatMap((direction) => {
      const factor = strongest(direction);
      if (!factor) return [];
      return [{
        direction,
        points: factor.points,
        label: factor.source === 'structural'
          ? factor.label
          : `Recorded ${assessment.dimension} ${direction}`,
      }];
    });
  };
  return {
    policyId: outcome.policyId,
    evidence: outcome.evidence,
    category: outcome.category,
    qualityScore: outcome.qualityScore,
    continuity: outcome.dimensions.continuity.score,
    agency: outcome.dimensions.agency.score,
    achievement: outcome.dimensions.achievement.score,
    stability: outcome.dimensions.stability.score,
    adversityIntensity: outcome.adversity.intensity,
    recoveryCredit: outcome.adversity.recoveryCredit,
    primaryFactors: {
      continuity: summarizeFactors(outcome.dimensions.continuity),
      agency: summarizeFactors(outcome.dimensions.agency),
      achievement: summarizeFactors(outcome.dimensions.achievement),
      stability: summarizeFactors(outcome.dimensions.stability),
    },
    explanation: [...outcome.explanation],
  };
}

export function assessCivilizationLume(
  input: AssessCivilizationLumeInput,
): CivilizationLumeAssessment {
  if (!input.outcome) {
    return {
      policyId: CIVILIZATION_LUME_POLICY_ID,
      status: 'unavailable',
      amount: 0,
      qualityScore: null,
      recoveryCredit: 0,
      explanation: ['No recorded Civilization state exists; no Lume was assessed.'],
    };
  }
  const qualityAmount = Math.max(
    0,
    Math.min(10, Math.round((input.outcome.qualityScore - 20) / 8)),
  );
  const achievementScore = input.outcome.dimensions.achievement.score;
  const achievementCeiling = achievementScore < 20
    ? 2
    : achievementScore < 35
      ? 4
      : achievementScore < 50
        ? 6
        : achievementScore < 70
          ? 8
          : 10;
  const potentialAmount = Math.min(qualityAmount, achievementCeiling);
  let status: CivilizationLumeAwardStatus = 'awarded';
  if (input.evidence !== 'recorded') status = 'insufficient_evidence';
  else if (!input.liveClosure) status = 'retroactive_ineligible';
  else if (input.gameMode === 'custom') status = 'custom_ineligible';
  else if (input.gameMode === 'campaign') {
    if (input.campaignLumePolicy === 'record_only') status = 'campaign_record_only';
    else if (input.campaignLumePolicy !== 'award') status = 'campaign_policy_required';
  }
  const amount = status === 'awarded' ? potentialAmount : 0;
  const explanation = status === 'awarded'
    ? [
        `${amount} Lume awarded from historical quality ${input.outcome.qualityScore}/100.`,
        ...(achievementCeiling < qualityAmount
          ? [`Achievement ${achievementScore}/100 limits this award to ${achievementCeiling} Lume.`]
          : []),
        'Competitive result and Eminence were not reward inputs.',
      ]
    : status === 'retroactive_ineligible'
      ? ['Historical quality was assessed, but prior matches are never awarded Lume retroactively.']
      : status === 'campaign_record_only'
        ? ['This authored campaign records its forecast but does not award historical Lume.']
      : status === 'campaign_policy_required'
        ? ['This authored campaign has no explicit Lume reward policy.']
        : status === 'custom_ineligible'
          ? ['Custom matches record their histories but do not award Lume.']
          : ['The record contains incomplete historical evidence; no Lume was awarded.'];
  return {
    policyId: CIVILIZATION_LUME_POLICY_ID,
    status,
    amount,
    qualityScore: input.outcome.qualityScore,
    recoveryCredit: input.outcome.adversity.recoveryCredit,
    explanation,
  };
}

/** Immutable server-side closure snapshot for one civilization in one match. */
export interface CivilizationRecord {
  version: typeof CIVILIZATION_RECORD_VERSION;
  evidence: CivilizationRecordEvidence;
  matchInstanceId: string;
  roomId: string;
  playerId: string;
  accountId: string;
  gameMode: GameMode;
  scenarioId: string | null;
  historicalContext: CivilizationHistoricalContext;
  startedAt: number | null;
  finishedAt: string;
  finishReason: CivilizationRecordFinishReason;
  competitiveResult: 'win' | 'loss' | 'tie';
  finalEminence: number;
  totalPlayers: number;
  civilization: CivilizationState | null;
  projects: CivilizationRecordProject[];
  luminaryRelationships: CivilizationRecordLuminaryRelationship[];
  outcome: CivilizationOutcomeAssessment | null;
  lume: CivilizationLumeAssessment;
  unavailableFields: string[];
}

/** Identity-safe account-history projection of a stored Civilization Record. */
export interface CivilizationRecordSummary {
  version: CivilizationRecordVersion;
  evidence: CivilizationRecordEvidence;
  historicalContext: CivilizationHistoricalContext;
  historicalMaturity: CivilizationMaturity | null;
  currentReach: CivilizationOperationalReach | null;
  currentReachCondition: CivilizationReachCondition | null;
  stabilityBand: CivilizationStabilityBand | null;
  stabilityScore: number | null;
  affinityForm: CivilizationAffinityIdentityForm | null;
  dominantAffinity: StandardAffinityKey | null;
  dominantDyad: CivilizationDyadId | null;
  masteredArtifactCount: number | null;
  operationalArtifactCount: number | null;
  damagedArtifactCount: number | null;
  annihilatedArtifactCount: number | null;
  manifestedProjectCount: number;
  civilizationEventCount: number | null;
  outcome: CivilizationOutcomeSummary | null;
  lume: CivilizationLumeAssessment;
  unavailableFields: string[];
}

export function summarizeCivilizationRecord(
  record: CivilizationRecord | null,
): CivilizationRecordSummary | null {
  if (!record) return null;
  const civilization = record.civilization;
  const artifacts = civilization ? Object.values(civilization.artifacts) : [];
  const unavailableLume: CivilizationLumeAssessment = {
    policyId: CIVILIZATION_LUME_POLICY_ID,
    status: 'unavailable',
    amount: 0,
    qualityScore: null,
    recoveryCredit: 0,
    explanation: ['This record predates Civilization Outcome and Lume assessment.'],
  };
  const recordWithOptionalAssessment = record as CivilizationRecord & {
    outcome?: CivilizationOutcomeAssessment | null;
    lume?: CivilizationLumeAssessment;
  };
  const lume = recordWithOptionalAssessment.lume ?? unavailableLume;
  return {
    version: record.version as CivilizationRecordVersion,
    evidence: record.evidence,
    historicalContext: recordWithOptionalAssessment.historicalContext ?? 'unknown',
    historicalMaturity: civilization?.scale.historicalMaturity ?? null,
    currentReach: civilization?.scale.currentReach ?? null,
    currentReachCondition: civilization?.scale.currentReachCondition ?? null,
    stabilityBand: civilization?.stability.band ?? null,
    stabilityScore: civilization?.stability.score ?? null,
    affinityForm: civilization?.affinityIdentity.form ?? null,
    dominantAffinity: civilization?.affinityIdentity.dominantAffinity ?? null,
    dominantDyad: civilization?.affinityIdentity.dominantDyad ?? null,
    masteredArtifactCount: civilization
      ? artifacts.filter((artifact) => artifact.masteryCount > 0).length
      : null,
    operationalArtifactCount: civilization
      ? artifacts.filter((artifact) => artifact.implementationState === 'operational').length
      : null,
    damagedArtifactCount: civilization
      ? artifacts.filter((artifact) => artifact.implementationState === 'damaged').length
      : null,
    annihilatedArtifactCount: civilization
      ? artifacts.filter((artifact) => artifact.implementationState === 'annihilated').length
      : null,
    manifestedProjectCount: record.projects.length,
    civilizationEventCount: civilization?.events.length ?? null,
    outcome: summarizeCivilizationOutcome(recordWithOptionalAssessment.outcome ?? null),
    lume: { ...lume, explanation: [...lume.explanation] },
    unavailableFields: [...record.unavailableFields],
  };
}

export interface GameHistoryEntry {
  roomId: string;
  inviteCode: string;
  finishedAt: string;
  result: 'win' | 'loss' | 'tie';
  eminenceEarned: number;
  totalPlayers: number;
  civilizationRecord?: CivilizationRecordSummary | null;
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  avgEminence: number;
  totalLume: number;
  recentGames: GameHistoryEntry[];
  matchHistory?: GameHistoryEntry[];
  archive?: AccountArchiveSummary;
}

export type EquippableStoreItemKind = Extract<
  CosmeticSlot,
  | 'card_back'
  | 'civilization_ambience'
  | 'luminary_arrival_sound'
  | 'blueprint_presentation'
  | 'vault_seal'
>;
export type StoreItemKind = EquippableStoreItemKind | 'consumable';
export type StoreItemRarity = 'foundational' | 'rare' | 'mythic';
export type StoreItemVisibility = 'player_only' | 'all_participants';
export type StoreItemPreviewKind =
  | 'card_back'
  | 'civilization_ambience'
  | 'luminary_arrival_sound'
  | 'blueprint_device'
  | 'vault_seal'
  | 'consumable';

export interface StoreContentDescriptor {
  assetKey: string;
  previewKind: StoreItemPreviewKind;
  tags: string[];
}

export interface StoreItem {
  id: string;
  name: string;
  kind: StoreItemKind;
  rarity: StoreItemRarity;
  visibility: StoreItemVisibility;
  scopeKey: string;
  included?: boolean;
  blueprintId?: BlueprintId;
  presentationVariant?: BlueprintPresentationVariant;
  priceLabel: string;
  lumePrice: number | null;
  shortDescription: string;
  description: string;
  previewClass: string;
  assetKey: string;
  previewKind: StoreItemPreviewKind;
  contentTags: string[];
}

export interface StoreEngagement {
  lumeBalance: number;
  lifetimeEarnedLume: number;
  lifetimePurchasedLume: number;
  lifetimeGrantedLume: number;
  lifetimeSpentLume: number;
  lifetimeRefundedLume: number;
  dailyClaimStreak: number;
  lastDailyClaimDate: string | null;
  canClaimDaily: boolean;
  currencyName: string;
}

export type NativeStoreProvider = "google_play" | "samsung_iap";
export type LumePackId = "lume_100" | "lume_300" | "lume_700";

export interface LumePackDefinition {
  id: LumePackId;
  lumeAmount: 100 | 300 | 700;
  productIds: Record<NativeStoreProvider, string>;
}

export interface NativeLumePackOffer {
  packId: LumePackId;
  productId: string;
  lumeAmount: number;
  localizedPrice: string;
  currencyCode?: string;
}

export interface NativeLumePurchaseResult {
  status: "pending" | "credited" | "already_credited" | "settlement_pending";
  provider: NativeStoreProvider;
  packId: LumePackId;
  lumeAmount: number;
  lumeBalance: number;
}

export interface StoreState {
  items: StoreItem[];
  ownedItemIds: string[];
  equippedItemIds: Record<EquippableStoreItemKind, string | null>;
  equippedItems: CosmeticLoadoutItem[];
  testCheckoutEnabled: boolean;
  lumePacks: LumePackDefinition[];
  engagement: StoreEngagement;
}

export interface VictoryArtifactSummary {
  tier: number;
  bonusAffinity: string;
}

export interface VictoryStandingSummary {
  eminence: number;
  reservedArtifactCount: number;
  forgedArtifacts: ReadonlyArray<VictoryArtifactSummary>;
}

/** Tier counts ordered from the strongest tie-break value to the weakest. */
export type ArtifactTierCounts = [
  tier3: number,
  tier2: number,
  tier1: number,
];

export function getArtifactTierCounts(
  artifacts: ReadonlyArray<VictoryArtifactSummary>,
): ArtifactTierCounts {
  const counts: ArtifactTierCounts = [0, 0, 0];
  for (const artifact of artifacts) {
    if (artifact.tier === 3) counts[0]++;
    else if (artifact.tier === 2) counts[1]++;
    else if (artifact.tier === 1) counts[2]++;
  }
  return counts;
}

function compareArtifactTierCounts(
  a: ArtifactTierCounts,
  b: ArtifactTierCounts,
): number {
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return b[index] - a[index];
  }
  return 0;
}

export function getStrongestAffinityTierCounts(
  artifacts: ReadonlyArray<VictoryArtifactSummary>,
): ArtifactTierCounts {
  const byAffinity = new Map<string, VictoryArtifactSummary[]>();
  for (const artifact of artifacts) {
    const affinityArtifacts = byAffinity.get(artifact.bonusAffinity) ?? [];
    affinityArtifacts.push(artifact);
    byAffinity.set(artifact.bonusAffinity, affinityArtifacts);
  }

  let strongest: ArtifactTierCounts = [0, 0, 0];
  for (const affinityArtifacts of byAffinity.values()) {
    const counts = getArtifactTierCounts(affinityArtifacts);
    if (compareArtifactTierCounts(counts, strongest) < 0) strongest = counts;
  }
  return strongest;
}

/**
 * Sort comparator for final standings. A negative result means `a` ranks ahead
 * of `b`. Exact ties retain the game's existing stable player order.
 */
export function compareVictoryStandings(
  a: VictoryStandingSummary,
  b: VictoryStandingSummary,
): number {
  if (a.eminence !== b.eminence) return b.eminence - a.eminence;
  if (a.reservedArtifactCount !== b.reservedArtifactCount) {
    return a.reservedArtifactCount - b.reservedArtifactCount;
  }

  const overallTierComparison = compareArtifactTierCounts(
    getArtifactTierCounts(a.forgedArtifacts),
    getArtifactTierCounts(b.forgedArtifacts),
  );
  if (overallTierComparison !== 0) return overallTierComparison;

  return compareArtifactTierCounts(
    getStrongestAffinityTierCounts(a.forgedArtifacts),
    getStrongestAffinityTierCounts(b.forgedArtifacts),
  );
}
