import { ARTIFACT_CANON } from './artifact-canon';
import { ARTIFACT_CATALOG, type ArtifactId } from './artifacts';
import {
  ARTIFACT_DEPICTION_SCALE_BY_ID,
  ARTIFACT_LINEAGE_BY_ID,
  type ArtifactDepictionScale,
  type TechnologyLineage,
} from './technology';

export const CIVILIZATION_CAMERA_SCALES = ['surface', 'orbit', 'stellar', 'galaxy'] as const;
export type CivilizationCameraScale = (typeof CIVILIZATION_CAMERA_SCALES)[number];

export const ARTIFACT_IMPLEMENTATION_SCALES = [
  'local',
  'civic',
  'planetary',
  'orbital',
  'system',
  'interstellar',
  'galactic',
] as const;
export type ArtifactImplementationScale = (typeof ARTIFACT_IMPLEMENTATION_SCALES)[number];

export const ARTIFACT_MANIFESTATION_FAMILIES = [
  'power_core',
  'biological_catalyst',
  'chronology_device',
  'thermal_system',
  'civic_signal',
  'transit_system',
  'archive_system',
  'fabrication_system',
  'containment_system',
  'concealment_system',
  'observation_system',
  'habitat_system',
  'ecology_system',
  'reclamation_system',
  'boundary_system',
  'computation_system',
  'accord_system',
  'stellar_industry',
  'galactic_network',
] as const;
export type ArtifactManifestationFamily = (typeof ARTIFACT_MANIFESTATION_FAMILIES)[number];

export const ARTIFACT_PLACEMENT_FAMILIES = [
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
  'low_orbit',
  'high_orbit',
  'orbital_yard',
  'habitat_orbit',
  'moonward_lane',
  'atmosphere_edge',
  'inner_system',
  'habitable_orbits',
  'lagrange_network',
  'outer_system',
  'heliopause',
  'distributed_systems',
  'spiral_arm',
  'coreward_region',
  'rimward_region',
  'dark_sector',
  'distributed_clusters',
  'interarm_void',
] as const;
export type ArtifactPlacementFamily = (typeof ARTIFACT_PLACEMENT_FAMILIES)[number];

export const CIVILIZATION_MANIFESTATION_SUBSTRATES = [
  'developed_land',
  'natural_land',
  'ridge',
  'subsurface',
  'shoreline',
  'orbital_track',
  'libration_zone',
  'system_orbit',
  'system_boundary',
  'galactic_region',
] as const;
export type CivilizationManifestationSubstrate =
  (typeof CIVILIZATION_MANIFESTATION_SUBSTRATES)[number];

export const CIVILIZATION_MANIFESTATION_SUPPORT_MODES = [
  'district_foundation',
  'terrain_integrated',
  'terraced_foundation',
  'subsurface_anchor',
  'shore_pylons',
  'orbital_stationkeeping',
  'system_stationkeeping',
  'distributed_network',
] as const;
export type CivilizationManifestationSupportMode =
  (typeof CIVILIZATION_MANIFESTATION_SUPPORT_MODES)[number];

export const CIVILIZATION_MANIFESTATION_DISTRICTS = [
  'industry',
  'civic',
  'habitation',
  'frontier',
  'underworks',
  'science',
  'transit',
  'archive',
  'waterfront',
  'containment',
  'orbital_industry',
  'orbital_habitation',
  'orbital_transit',
  'system_interior',
  'system_habitation',
  'system_transit',
  'system_exterior',
  'galactic_core',
  'galactic_arm',
  'galactic_rim',
  'galactic_void',
  'galactic_network',
] as const;
export type CivilizationManifestationDistrict =
  (typeof CIVILIZATION_MANIFESTATION_DISTRICTS)[number];

export interface ArtifactPlacementPhysicalContract {
  placementFamily: ArtifactPlacementFamily;
  nativeScene: CivilizationCameraScale;
  district: CivilizationManifestationDistrict;
  substrate: CivilizationManifestationSubstrate;
  requiredSupport: CivilizationManifestationSupportMode;
  allowsUnanchoredHover: boolean;
}

const placementContract = (
  placementFamily: ArtifactPlacementFamily,
  nativeScene: CivilizationCameraScale,
  district: CivilizationManifestationDistrict,
  substrate: CivilizationManifestationSubstrate,
  requiredSupport: CivilizationManifestationSupportMode,
): ArtifactPlacementPhysicalContract => ({
  placementFamily,
  nativeScene,
  district,
  substrate,
  requiredSupport,
  allowsUnanchoredHover: nativeScene !== 'surface',
});

/**
 * Physical meaning shared by assignment, rendering, Scan, and validation.
 * A placement family is never merely a pair of screen coordinates.
 */
export const ARTIFACT_PLACEMENT_PHYSICAL_CONTRACTS: Readonly<
  Record<ArtifactPlacementFamily, ArtifactPlacementPhysicalContract>
> = {
  industrial_district: placementContract('industrial_district', 'surface', 'industry', 'developed_land', 'district_foundation'),
  civic_core: placementContract('civic_core', 'surface', 'civic', 'developed_land', 'district_foundation'),
  habitat_district: placementContract('habitat_district', 'surface', 'habitation', 'developed_land', 'district_foundation'),
  wilderness_margin: placementContract('wilderness_margin', 'surface', 'frontier', 'natural_land', 'terrain_integrated'),
  subsurface_works: placementContract('subsurface_works', 'surface', 'underworks', 'subsurface', 'subsurface_anchor'),
  observatory_ridge: placementContract('observatory_ridge', 'surface', 'science', 'ridge', 'terraced_foundation'),
  transit_terminus: placementContract('transit_terminus', 'surface', 'transit', 'developed_land', 'district_foundation'),
  archive_quarter: placementContract('archive_quarter', 'surface', 'archive', 'developed_land', 'district_foundation'),
  coastal_margin: placementContract('coastal_margin', 'surface', 'waterfront', 'shoreline', 'shore_pylons'),
  containment_zone: placementContract('containment_zone', 'surface', 'containment', 'developed_land', 'district_foundation'),
  low_orbit: placementContract('low_orbit', 'orbit', 'orbital_transit', 'orbital_track', 'orbital_stationkeeping'),
  high_orbit: placementContract('high_orbit', 'orbit', 'orbital_habitation', 'orbital_track', 'orbital_stationkeeping'),
  orbital_yard: placementContract('orbital_yard', 'orbit', 'orbital_industry', 'orbital_track', 'orbital_stationkeeping'),
  habitat_orbit: placementContract('habitat_orbit', 'orbit', 'orbital_habitation', 'orbital_track', 'orbital_stationkeeping'),
  moonward_lane: placementContract('moonward_lane', 'orbit', 'orbital_transit', 'libration_zone', 'orbital_stationkeeping'),
  atmosphere_edge: placementContract('atmosphere_edge', 'orbit', 'orbital_transit', 'orbital_track', 'orbital_stationkeeping'),
  inner_system: placementContract('inner_system', 'stellar', 'system_interior', 'system_orbit', 'system_stationkeeping'),
  habitable_orbits: placementContract('habitable_orbits', 'stellar', 'system_habitation', 'system_orbit', 'system_stationkeeping'),
  lagrange_network: placementContract('lagrange_network', 'stellar', 'system_transit', 'libration_zone', 'system_stationkeeping'),
  outer_system: placementContract('outer_system', 'stellar', 'system_exterior', 'system_orbit', 'system_stationkeeping'),
  heliopause: placementContract('heliopause', 'stellar', 'system_exterior', 'system_boundary', 'system_stationkeeping'),
  distributed_systems: placementContract('distributed_systems', 'stellar', 'system_habitation', 'system_orbit', 'distributed_network'),
  spiral_arm: placementContract('spiral_arm', 'galaxy', 'galactic_arm', 'galactic_region', 'distributed_network'),
  coreward_region: placementContract('coreward_region', 'galaxy', 'galactic_core', 'galactic_region', 'distributed_network'),
  rimward_region: placementContract('rimward_region', 'galaxy', 'galactic_rim', 'galactic_region', 'distributed_network'),
  dark_sector: placementContract('dark_sector', 'galaxy', 'galactic_void', 'galactic_region', 'distributed_network'),
  distributed_clusters: placementContract('distributed_clusters', 'galaxy', 'galactic_network', 'galactic_region', 'distributed_network'),
  interarm_void: placementContract('interarm_void', 'galaxy', 'galactic_void', 'galactic_region', 'distributed_network'),
};

export function getArtifactPlacementPhysicalContract(
  placementFamily: ArtifactPlacementFamily,
): ArtifactPlacementPhysicalContract {
  return ARTIFACT_PLACEMENT_PHYSICAL_CONTRACTS[placementFamily];
}

export function getArtifactPlacementCompatibleSubstrates(
  placementFamily: ArtifactPlacementFamily,
): readonly CivilizationManifestationSubstrate[] {
  const physical = getArtifactPlacementPhysicalContract(placementFamily);
  if (physical.nativeScene !== 'surface') return [physical.substrate];
  if (physical.substrate === 'developed_land') {
    return ['developed_land', 'ridge', 'shoreline'];
  }
  if (physical.substrate === 'natural_land') return ['natural_land', 'ridge'];
  return [physical.substrate];
}

export function getArtifactPlacementCompatibleSupportModes(
  placementFamily: ArtifactPlacementFamily,
): readonly CivilizationManifestationSupportMode[] {
  const physical = getArtifactPlacementPhysicalContract(placementFamily);
  if (physical.nativeScene !== 'surface') return [physical.requiredSupport];
  if (physical.substrate === 'developed_land') {
    return ['district_foundation', 'terraced_foundation', 'shore_pylons'];
  }
  if (physical.substrate === 'natural_land') {
    return ['terrain_integrated', 'terraced_foundation'];
  }
  return [physical.requiredSupport];
}

export type ArtifactScaleVisibility =
  | 'landmark'
  | 'environmental'
  | 'regional'
  | 'aggregate';

export const ARTIFACT_PHYSICAL_FOOTPRINTS = [
  'installation',
  'district',
  'orbital_complex',
  'system_network',
  'galactic_network',
] as const;
export type ArtifactPhysicalFootprint = (typeof ARTIFACT_PHYSICAL_FOOTPRINTS)[number];

export const ARTIFACT_MANIFESTATION_MOTIONS = [
  'grounded_ambient',
  'orbital_drift',
  'system_orbit',
  'distributed_pulse',
] as const;
export type ArtifactManifestationMotion = (typeof ARTIFACT_MANIFESTATION_MOTIONS)[number];

export type ArtifactNonNativeRepresentationPolicy =
  | 'connected_locator'
  | 'distant_consequence';

export const ARTIFACT_DISTRICT_PLACEMENT_STRENGTHS = [
  'native',
  'natural',
  'adaptable',
] as const;
export type ArtifactDistrictPlacementStrength =
  (typeof ARTIFACT_DISTRICT_PLACEMENT_STRENGTHS)[number];

export const ARTIFACT_HIGHER_SCALE_CONSEQUENCES = [
  'controlled_heat',
  'living_recovery',
  'synchronized_time',
  'material_flow',
  'hidden_activity',
  'containment_field',
  'archive_activity',
  'transit_traffic',
  'habitat_growth',
  'fabrication_output',
  'observation_activity',
  'reclamation_activity',
  'computation_activity',
  'treaty_activity',
  'boundary_distortion',
  'distributed_presence',
  'stellar_engineering',
  'galactic_coordination',
] as const;
export type ArtifactHigherScaleConsequence =
  (typeof ARTIFACT_HIGHER_SCALE_CONSEQUENCES)[number];

export interface ArtifactManifestationProfile {
  artifactId: ArtifactId;
  lineage: TechnologyLineage;
  cardSubjectScale: ArtifactDepictionScale;
  implementationScale: ArtifactImplementationScale;
  nativeCameraScale: CivilizationCameraScale;
  manifestationFamily: ArtifactManifestationFamily;
  /** Plain physical description used by Portrait art direction and Scan copy. */
  nativeRepresentation: string;
  physicalFootprint: ArtifactPhysicalFootprint;
  environmentalConstraints: readonly ArtifactPlacementFamily[];
  motionBehavior: ArtifactManifestationMotion;
  nonNativeRepresentationPolicy: Record<
    CivilizationCameraScale,
    ArtifactNonNativeRepresentationPolicy
  >;
  higherScaleConsequences: Partial<
    Record<CivilizationCameraScale, readonly ArtifactHigherScaleConsequence[]>
  >;
  visibilityByCameraScale: Record<CivilizationCameraScale, ArtifactScaleVisibility>;
  standaloneAssetRequired: boolean;
  compatiblePlacementFamilies: readonly ArtifactPlacementFamily[];
  districtPlacementStrengthByFamily: Partial<
    Record<ArtifactPlacementFamily, ArtifactDistrictPlacementStrength>
  >;
  /** Seeds a scarce Surface family before this Artifact is considered elsewhere. */
  districtAnchorFamily: ArtifactPlacementFamily | null;
  validSubstrates: readonly CivilizationManifestationSubstrate[];
  requiredSupportModes: readonly CivilizationManifestationSupportMode[];
  requiresVisibleSupport: boolean;
  /** Stable authored identity. It must remain unique without relying on hashing. */
  visualIdentity: string;
}

function physicalFootprintFor(
  implementationScale: ArtifactImplementationScale,
  nativeCameraScale: CivilizationCameraScale,
): ArtifactPhysicalFootprint {
  if (nativeCameraScale === 'galaxy') return 'galactic_network';
  if (nativeCameraScale === 'stellar') return 'system_network';
  if (nativeCameraScale === 'orbit') return 'orbital_complex';
  return implementationScale === 'local' ? 'installation' : 'district';
}

function motionFor(nativeCameraScale: CivilizationCameraScale): ArtifactManifestationMotion {
  if (nativeCameraScale === 'orbit') return 'orbital_drift';
  if (nativeCameraScale === 'stellar') return 'system_orbit';
  if (nativeCameraScale === 'galaxy') return 'distributed_pulse';
  return 'grounded_ambient';
}

function nonNativePolicyFor(
  nativeCameraScale: CivilizationCameraScale,
): Record<CivilizationCameraScale, ArtifactNonNativeRepresentationPolicy> {
  const nativeIndex = CIVILIZATION_CAMERA_SCALES.indexOf(nativeCameraScale);
  return Object.fromEntries(CIVILIZATION_CAMERA_SCALES.map((cameraScale, index) => [
    cameraScale,
    index < nativeIndex ? 'connected_locator' : 'distant_consequence',
  ])) as Record<CivilizationCameraScale, ArtifactNonNativeRepresentationPolicy>;
}

interface ArtifactManifestationSpec {
  implementationScale: ArtifactImplementationScale;
  nativeCameraScale: CivilizationCameraScale;
  manifestationFamily: ArtifactManifestationFamily;
  nativeRepresentation: string;
  compatiblePlacementFamilies: readonly ArtifactPlacementFamily[];
  districtPlacementStrengthByFamily: Partial<
    Record<ArtifactPlacementFamily, ArtifactDistrictPlacementStrength>
  >;
  districtAnchorFamily: ArtifactPlacementFamily | null;
  standaloneAssetRequired?: boolean;
}

interface ArtifactManifestationOptions {
  standaloneAssetRequired?: boolean;
  adaptablePlacementFamilies?: readonly ArtifactPlacementFamily[];
  districtAnchorFamily?: ArtifactPlacementFamily;
}

const FAMILY_CONSEQUENCES: Record<
  ArtifactManifestationFamily,
  readonly ArtifactHigherScaleConsequence[]
> = {
  power_core: ['controlled_heat', 'stellar_engineering'],
  biological_catalyst: ['living_recovery', 'habitat_growth'],
  chronology_device: ['synchronized_time', 'computation_activity'],
  thermal_system: ['controlled_heat', 'reclamation_activity'],
  civic_signal: ['treaty_activity', 'distributed_presence'],
  transit_system: ['transit_traffic', 'material_flow'],
  archive_system: ['archive_activity', 'distributed_presence'],
  fabrication_system: ['fabrication_output', 'material_flow'],
  containment_system: ['containment_field', 'hidden_activity'],
  concealment_system: ['hidden_activity', 'distributed_presence'],
  observation_system: ['observation_activity', 'distributed_presence'],
  habitat_system: ['habitat_growth', 'distributed_presence'],
  ecology_system: ['living_recovery', 'habitat_growth'],
  reclamation_system: ['reclamation_activity', 'material_flow'],
  boundary_system: ['boundary_distortion', 'observation_activity'],
  computation_system: ['computation_activity', 'synchronized_time'],
  accord_system: ['treaty_activity', 'galactic_coordination'],
  stellar_industry: ['stellar_engineering', 'material_flow'],
  galactic_network: ['galactic_coordination', 'distributed_presence'],
};

function visibilityForNativeScale(
  nativeCameraScale: CivilizationCameraScale,
): Record<CivilizationCameraScale, ArtifactScaleVisibility> {
  const nativeIndex = CIVILIZATION_CAMERA_SCALES.indexOf(nativeCameraScale);
  return Object.fromEntries(CIVILIZATION_CAMERA_SCALES.map((cameraScale, index) => {
    if (index === nativeIndex) return [cameraScale, 'landmark'];
    if (index < nativeIndex) return [cameraScale, 'environmental'];
    if (index === nativeIndex + 1) return [cameraScale, 'regional'];
    return [cameraScale, 'aggregate'];
  })) as Record<CivilizationCameraScale, ArtifactScaleVisibility>;
}

function higherScaleConsequences(
  nativeCameraScale: CivilizationCameraScale,
  family: ArtifactManifestationFamily,
): ArtifactManifestationProfile['higherScaleConsequences'] {
  const nativeIndex = CIVILIZATION_CAMERA_SCALES.indexOf(nativeCameraScale);
  return Object.fromEntries(
    CIVILIZATION_CAMERA_SCALES
      .filter((_, index) => index > nativeIndex)
      .map((cameraScale) => [cameraScale, FAMILY_CONSEQUENCES[family]]),
  );
}

const P = (
  implementationScale: ArtifactImplementationScale,
  nativeCameraScale: CivilizationCameraScale,
  manifestationFamily: ArtifactManifestationFamily,
  nativeRepresentation: string,
  authoredPlacementFamilies: readonly ArtifactPlacementFamily[],
  standaloneOrOptions: boolean | ArtifactManifestationOptions = false,
): ArtifactManifestationSpec => {
  const options = typeof standaloneOrOptions === 'boolean'
    ? { standaloneAssetRequired: standaloneOrOptions }
    : standaloneOrOptions;
  const adaptablePlacementFamilies = options.adaptablePlacementFamilies ?? [];
  const compatiblePlacementFamilies = [
    ...new Set([...authoredPlacementFamilies, ...adaptablePlacementFamilies]),
  ];
  const districtPlacementStrengthByFamily = Object.fromEntries([
    ...authoredPlacementFamilies.map((family, index) => [
      family,
      index === 0 ? 'native' : 'natural',
    ] as const),
    ...adaptablePlacementFamilies.map((family) => [family, 'adaptable'] as const),
  ]);
  return {
    implementationScale,
    nativeCameraScale,
    manifestationFamily,
    nativeRepresentation,
    compatiblePlacementFamilies,
    districtPlacementStrengthByFamily,
    districtAnchorFamily: options.districtAnchorFamily ?? null,
    standaloneAssetRequired: options.standaloneAssetRequired ?? false,
  };
};

/**
 * Authored Civilization-view specification for every playable Artifact.
 * This record is deliberately exhaustive: adding an Artifact to the catalog
 * without deciding how it exists in the portrait is a compile-time error.
 */
const ARTIFACT_MANIFESTATION_SPEC_BY_ID = /* @__PURE__ */ (() => ({
  t1r01: P('civic', 'surface', 'power_core', 'contained ignition hearts embedded in public forge furnaces', ['industrial_district', 'civic_core'], { adaptablePlacementFamilies: ['transit_terminus'] }),
  t1r02: P('civic', 'surface', 'biological_catalyst', 'charred recovery nurseries threaded with pale new growth', ['wilderness_margin', 'habitat_district']),
  t1r03: P('civic', 'surface', 'archive_system', 'ember-lit memory reliquaries beside district power halls', ['archive_quarter', 'industrial_district'], { adaptablePlacementFamilies: ['observatory_ridge'] }),
  t1r04: P('local', 'surface', 'chronology_device', 'causal test coils housed in shielded research courts', ['containment_zone', 'civic_core']),
  t1r05: P('civic', 'surface', 'containment_system', 'sealed voidflare casks banked beneath emergency heat stations', ['subsurface_works', 'containment_zone']),
  t1r06: P('civic', 'surface', 'biological_catalyst', 'living solar wicks cultivated through greenhouse power terraces', ['habitat_district', 'wilderness_margin'], { adaptablePlacementFamilies: ['coastal_margin'] }),
  t1r07: P('civic', 'surface', 'thermal_system', 'soot-dark heat baffles lining the industrial exhaust canals', ['industrial_district', 'subsurface_works']),
  t1r08: P('civic', 'surface', 'civic_signal', 'witnessed oathfire beacons at sanctioned civic foundries', ['civic_core', 'industrial_district']),
  t1r09: P('planetary', 'surface', 'transit_system', 'weather-adaptive route beacons on ridge foundations, freight termini and harbor pylons', ['observatory_ridge', 'transit_terminus', 'coastal_margin'], { districtAnchorFamily: 'observatory_ridge' }),

  t1s01: P('local', 'surface', 'archive_system', 'echo-sensing crystal splinters set into structural watch stations', ['observatory_ridge', 'archive_quarter'], { adaptablePlacementFamilies: ['coastal_margin'] }),
  t1s02: P('planetary', 'surface', 'transit_system', 'mantlelift coil mouths feeding sealed cargo into near orbit', ['transit_terminus', 'industrial_district'], {
    standaloneAssetRequired: true,
    adaptablePlacementFamilies: ['subsurface_works'],
    districtAnchorFamily: 'transit_terminus',
  }),
  t1s03: P('civic', 'surface', 'chronology_device', 'null-loop anchors guarding recursive machinery districts', ['containment_zone', 'industrial_district']),
  t1s04: P('civic', 'surface', 'fabrication_system', ARTIFACT_CANON.t1s04.functionalText, ['industrial_district', 'civic_core']),
  t1s05: P('local', 'surface', 'chronology_device', ARTIFACT_CANON.t1s05.functionalText, ['archive_quarter', 'containment_zone']),
  t1s06: P('civic', 'surface', 'archive_system', 'living chronicle houses whose tissue records the changing city', ['archive_quarter', 'habitat_district']),
  t1s07: P('civic', 'surface', 'fabrication_system', ARTIFACT_CANON.t1s07.functionalText, ['industrial_district', 'civic_core']),
  t1s08: P('civic', 'surface', 'archive_system', 'root-memory valves regulating ancestral signal gardens', ['habitat_district', 'archive_quarter'], { adaptablePlacementFamilies: ['wilderness_margin', 'subsurface_works'] }),
  t1s09: P('planetary', 'surface', 'transit_system', 'landing-schedule stations at coastal recovery ports and freight pads, supported by ridge tracking instruments', ['coastal_margin', 'transit_terminus', 'observatory_ridge'], { districtAnchorFamily: 'coastal_margin' }),

  t1e01: P('civic', 'surface', 'biological_catalyst', 'controlled replication beds repairing damaged ground by district', ['wilderness_margin', 'habitat_district'], { adaptablePlacementFamilies: ['containment_zone'] }),
  t1e02: P('local', 'surface', 'boundary_system', 'voidroot taps descending into lightless nutrient seams', ['subsurface_works', 'wilderness_margin']),
  t1e03: P('local', 'surface', 'observation_system', 'char tendril probes searching burn scars for surviving life', ['wilderness_margin', 'observatory_ridge']),
  t1e04: P('civic', 'surface', 'fabrication_system', 'climate seed presses producing restorative micro-ecologies', ['habitat_district', 'industrial_district'], { adaptablePlacementFamilies: ['coastal_margin'] }),
  t1e05: P('civic', 'surface', 'computation_system', 'facetcell crystal gardens performing adaptive optical work', ['habitat_district', 'civic_core'], { adaptablePlacementFamilies: ['transit_terminus'] }),
  t1e06: P('civic', 'surface', 'reclamation_system', 'decay lattices turning civic waste into ordered soil', ['subsurface_works', 'habitat_district']),
  t1e07: P('civic', 'surface', 'ecology_system', 'lichen veins joining architecture to the local biosphere', ['habitat_district', 'civic_core']),
  t1e08: P('civic', 'surface', 'archive_system', 'necrobloom beds preserving memory inside decomposition gardens', ['wilderness_margin', 'archive_quarter']),
  t1e09: P('planetary', 'surface', 'reclamation_system', 'powered living membrane waterworks at coastal intakes, industrial outflows and settlement freshwater plants', ['coastal_margin', 'industrial_district', 'habitat_district'], { districtAnchorFamily: 'coastal_margin' }),

  t1o01: P('planetary', 'surface', 'concealment_system', 'entropy veils breaking settlement signatures along exposed borders', ['wilderness_margin', 'containment_zone']),
  t1o02: P('civic', 'surface', 'observation_system', 'horizon lantern observatories watching forbidden boundary light', ['observatory_ridge', 'coastal_margin'], {
    adaptablePlacementFamilies: ['transit_terminus'],
    districtAnchorFamily: 'coastal_margin',
  }),
  t1o03: P('civic', 'surface', 'archive_system', 'ashen hollows preserving heat-scarred civic records underground', ['subsurface_works', 'archive_quarter']),
  t1o04: P('civic', 'surface', 'concealment_system', 'undergrowth silencers masking inhabited root corridors', ['wilderness_margin', 'subsurface_works']),
  t1o05: P('civic', 'surface', 'fabrication_system', 'blackglass die works casting components in evacuated chambers', ['industrial_district', 'containment_zone']),
  t1o06: P('planetary', 'surface', 'reclamation_system', 'subsurface decay networks feeding hidden recycler districts', ['subsurface_works', 'habitat_district']),
  t1o07: P('local', 'surface', 'boundary_system', ARTIFACT_CANON.t1o07.functionalText, ['observatory_ridge', 'containment_zone']),
  t1o08: P('civic', 'surface', 'concealment_system', ARTIFACT_CANON.t1o08.functionalText, ['archive_quarter', 'civic_core']),
  t1o09: P('planetary', 'surface', 'concealment_system', 'compartmented optical dispatch stations in buried conduits, freight termini and sheltered harbor service chambers', ['subsurface_works', 'transit_terminus', 'coastal_margin'], { districtAnchorFamily: 'transit_terminus' }),

  t1p01: P('civic', 'surface', 'biological_catalyst', 'correction seed gardens repairing damaged civic systems', ['civic_core', 'habitat_district']),
  t1p02: P('civic', 'surface', 'chronology_device', ARTIFACT_CANON.t1p02.functionalText, ['civic_core', 'containment_zone']),
  t1p03: P('civic', 'surface', 'observation_system', ARTIFACT_CANON.t1p03.functionalText, ['observatory_ridge', 'civic_core'], { adaptablePlacementFamilies: ['coastal_margin'] }),
  t1p04: P('civic', 'surface', 'containment_system', 'magnetic bottle stations enclosing dangerous field experiments', ['containment_zone', 'industrial_district']),
  t1p05: P('civic', 'surface', 'computation_system', 'recursive lens arrays checking and correcting public systems', ['observatory_ridge', 'civic_core']),
  t1p06: P('planetary', 'surface', 'habitat_system', 'living lattice nodes knitting dense districts into one ecology', ['habitat_district', 'civic_core'], { adaptablePlacementFamilies: ['transit_terminus'] }),
  t1p07: P('civic', 'surface', 'boundary_system', ARTIFACT_CANON.t1p07.functionalText, ['observatory_ridge', 'containment_zone']),
  t1p08: P('civic', 'surface', 'archive_system', 'petrified bloom archives embedded in public fossil gardens', ['archive_quarter', 'wilderness_margin'], { adaptablePlacementFamilies: ['subsurface_works'] }),
  t1p09: P('planetary', 'surface', 'accord_system', 'auditable release stations at watershed sluices, buried cistern gates and civic water-allocation halls', ['wilderness_margin', 'subsurface_works', 'civic_core'], { districtAnchorFamily: 'wilderness_margin' }),

  t2r01: P('orbital', 'orbit', 'stellar_industry', ARTIFACT_CANON.t2r01.functionalText, ['orbital_yard', 'high_orbit'], true),
  t2r02: P('system', 'stellar', 'biological_catalyst', ARTIFACT_CANON.t2r02.functionalText, ['habitable_orbits', 'distributed_systems']),
  t2r03: P('orbital', 'orbit', 'transit_system', 'starlift pressure nozzles transferring matter into orbital industry', ['atmosphere_edge', 'orbital_yard'], true),
  t2r04: P('system', 'stellar', 'ecology_system', ARTIFACT_CANON.t2r04.functionalText, ['habitable_orbits', 'inner_system']),
  t2r05: P('system', 'stellar', 'chronology_device', ARTIFACT_CANON.t2r05.functionalText, ['inner_system', 'lagrange_network']),
  t2r06: P('system', 'stellar', 'thermal_system', ARTIFACT_CANON.t2r06.functionalText, ['outer_system', 'distributed_systems']),

  t2s01: P('system', 'stellar', 'transit_system', ARTIFACT_CANON.t2s01.functionalText, ['lagrange_network', 'outer_system']),
  t2s02: P('system', 'stellar', 'archive_system', ARTIFACT_CANON.t2s02.functionalText, ['heliopause', 'distributed_systems']),
  t2s03: P('system', 'stellar', 'computation_system', ARTIFACT_CANON.t2s03.functionalText, ['lagrange_network', 'habitable_orbits']),
  t2s04: P('orbital', 'orbit', 'transit_system', ARTIFACT_CANON.t2s04.functionalText, ['moonward_lane', 'habitat_orbit'], true),
  t2s05: P('system', 'stellar', 'archive_system', ARTIFACT_CANON.t2s05.functionalText, ['distributed_systems', 'outer_system']),
  t2s06: P('system', 'stellar', 'observation_system', ARTIFACT_CANON.t2s06.functionalText, ['lagrange_network', 'heliopause']),

  t2e01: P('orbital', 'orbit', 'ecology_system', ARTIFACT_CANON.t2e01.functionalText, ['habitat_orbit', 'atmosphere_edge']),
  t2e02: P('system', 'stellar', 'chronology_device', ARTIFACT_CANON.t2e02.functionalText, ['habitable_orbits', 'outer_system']),
  t2e03: P('orbital', 'orbit', 'containment_system', ARTIFACT_CANON.t2e03.functionalText, ['high_orbit', 'habitat_orbit'], true),
  t2e04: P('system', 'stellar', 'civic_signal', ARTIFACT_CANON.t2e04.functionalText, ['habitable_orbits', 'distributed_systems']),
  t2e05: P('system', 'stellar', 'archive_system', ARTIFACT_CANON.t2e05.functionalText, ['habitable_orbits', 'lagrange_network']),
  t2e06: P('orbital', 'orbit', 'habitat_system', ARTIFACT_CANON.t2e06.functionalText, ['habitat_orbit', 'orbital_yard']),

  t2o01: P('system', 'stellar', 'boundary_system', ARTIFACT_CANON.t2o01.functionalText, ['heliopause', 'outer_system']),
  t2o02: P('orbital', 'orbit', 'concealment_system', ARTIFACT_CANON.t2o02.functionalText, ['high_orbit', 'moonward_lane']),
  t2o03: P('system', 'stellar', 'thermal_system', ARTIFACT_CANON.t2o03.functionalText, ['outer_system', 'heliopause']),
  t2o04: P('system', 'stellar', 'fabrication_system', ARTIFACT_CANON.t2o04.functionalText, ['distributed_systems', 'outer_system']),
  t2o05: P('system', 'stellar', 'ecology_system', ARTIFACT_CANON.t2o05.functionalText, ['habitable_orbits', 'outer_system']),
  t2o06: P('system', 'stellar', 'boundary_system', ARTIFACT_CANON.t2o06.functionalText, ['lagrange_network', 'heliopause']),

  t2p01: P('orbital', 'orbit', 'containment_system', ARTIFACT_CANON.t2p01.functionalText, ['high_orbit', 'orbital_yard'], true),
  t2p02: P('system', 'stellar', 'observation_system', ARTIFACT_CANON.t2p02.functionalText, ['lagrange_network', 'outer_system']),
  t2p03: P('system', 'stellar', 'accord_system', ARTIFACT_CANON.t2p03.functionalText, ['habitable_orbits', 'distributed_systems']),
  t2p04: P('system', 'stellar', 'power_core', ARTIFACT_CANON.t2p04.functionalText, ['inner_system', 'lagrange_network']),
  t2p05: P('system', 'stellar', 'computation_system', ARTIFACT_CANON.t2p05.functionalText, ['distributed_systems', 'lagrange_network']),
  t2p06: P('system', 'stellar', 'accord_system', ARTIFACT_CANON.t2p06.functionalText, ['habitable_orbits', 'inner_system']),

  t3r01: P('galactic', 'galaxy', 'stellar_industry', ARTIFACT_CANON.t3r01.functionalText, ['spiral_arm', 'distributed_clusters']),
  t3r02: P('galactic', 'galaxy', 'reclamation_system', ARTIFACT_CANON.t3r02.functionalText, ['rimward_region', 'distributed_clusters'], true),
  t3r03: P('galactic', 'galaxy', 'chronology_device', ARTIFACT_CANON.t3r03.functionalText, ['spiral_arm', 'coreward_region'], true),
  t3r04: P('galactic', 'galaxy', 'fabrication_system', ARTIFACT_CANON.t3r04.functionalText, ['distributed_clusters', 'spiral_arm'], true),

  t3s01: P('galactic', 'galaxy', 'transit_system', ARTIFACT_CANON.t3s01.functionalText, ['interarm_void', 'spiral_arm']),
  t3s02: P('galactic', 'galaxy', 'accord_system', ARTIFACT_CANON.t3s02.functionalText, ['distributed_clusters', 'coreward_region']),
  t3s03: P('galactic', 'galaxy', 'archive_system', ARTIFACT_CANON.t3s03.functionalText, ['rimward_region', 'dark_sector']),
  t3s04: P('galactic', 'galaxy', 'chronology_device', ARTIFACT_CANON.t3s04.functionalText, ['distributed_clusters', 'spiral_arm']),

  t3e01: P('galactic', 'galaxy', 'ecology_system', ARTIFACT_CANON.t3e01.functionalText, ['spiral_arm', 'distributed_clusters']),
  t3e02: P('galactic', 'galaxy', 'habitat_system', ARTIFACT_CANON.t3e02.functionalText, ['distributed_clusters', 'rimward_region']),
  t3e03: P('galactic', 'galaxy', 'reclamation_system', ARTIFACT_CANON.t3e03.functionalText, ['rimward_region', 'dark_sector']),
  t3e04: P('galactic', 'galaxy', 'accord_system', ARTIFACT_CANON.t3e04.functionalText, ['distributed_clusters', 'spiral_arm']),

  t3o01: P('galactic', 'galaxy', 'concealment_system', ARTIFACT_CANON.t3o01.functionalText, ['dark_sector', 'rimward_region']),
  t3o02: P('galactic', 'galaxy', 'containment_system', ARTIFACT_CANON.t3o02.functionalText, ['dark_sector', 'distributed_clusters'], true),
  t3o03: P('galactic', 'galaxy', 'civic_signal', ARTIFACT_CANON.t3o03.functionalText, ['interarm_void', 'dark_sector']),
  t3o04: P('galactic', 'galaxy', 'boundary_system', ARTIFACT_CANON.t3o04.functionalText, ['interarm_void', 'dark_sector'], true),

  t3p01: P('galactic', 'galaxy', 'accord_system', ARTIFACT_CANON.t3p01.functionalText, ['distributed_clusters', 'coreward_region']),
  t3p02: P('galactic', 'galaxy', 'fabrication_system', ARTIFACT_CANON.t3p02.functionalText, ['spiral_arm', 'distributed_clusters']),
  t3p03: P('galactic', 'galaxy', 'computation_system', ARTIFACT_CANON.t3p03.functionalText, ['coreward_region', 'distributed_clusters'], true),
  t3p04: P('galactic', 'galaxy', 'observation_system', ARTIFACT_CANON.t3p04.functionalText, ['distributed_clusters', 'rimward_region']),
} as const satisfies Record<ArtifactId, ArtifactManifestationSpec>))();

export const ARTIFACT_MANIFESTATION_PROFILE_BY_ID: Readonly<
  Record<ArtifactId, ArtifactManifestationProfile>
> = /* @__PURE__ */ (() => Object.fromEntries(ARTIFACT_CATALOG.map(({ id }) => {
  const spec = ARTIFACT_MANIFESTATION_SPEC_BY_ID[id];
  return [id, {
    artifactId: id,
    lineage: ARTIFACT_LINEAGE_BY_ID[id],
    cardSubjectScale: ARTIFACT_DEPICTION_SCALE_BY_ID[id],
    implementationScale: spec.implementationScale,
    nativeCameraScale: spec.nativeCameraScale,
    manifestationFamily: spec.manifestationFamily,
    nativeRepresentation: spec.nativeRepresentation,
    physicalFootprint: physicalFootprintFor(spec.implementationScale, spec.nativeCameraScale),
    environmentalConstraints: spec.compatiblePlacementFamilies,
    motionBehavior: motionFor(spec.nativeCameraScale),
    nonNativeRepresentationPolicy: nonNativePolicyFor(spec.nativeCameraScale),
    higherScaleConsequences: higherScaleConsequences(
      spec.nativeCameraScale,
      spec.manifestationFamily,
    ),
    visibilityByCameraScale: visibilityForNativeScale(spec.nativeCameraScale),
    standaloneAssetRequired: spec.standaloneAssetRequired ?? false,
    compatiblePlacementFamilies: spec.compatiblePlacementFamilies,
    districtPlacementStrengthByFamily: spec.districtPlacementStrengthByFamily,
    districtAnchorFamily: spec.districtAnchorFamily,
    validSubstrates: [...new Set(spec.compatiblePlacementFamilies.flatMap((placement) => (
      getArtifactPlacementCompatibleSubstrates(placement)
    )))],
    requiredSupportModes: [...new Set(spec.compatiblePlacementFamilies.flatMap((placement) => (
      getArtifactPlacementCompatibleSupportModes(placement)
    )))],
    requiresVisibleSupport: spec.nativeCameraScale === 'surface',
    visualIdentity: `${id}:${spec.manifestationFamily}:${spec.nativeRepresentation}`,
  } satisfies ArtifactManifestationProfile];
})) as unknown as Record<ArtifactId, ArtifactManifestationProfile>)();

export function getArtifactManifestationProfile(
  artifactId: ArtifactId,
): ArtifactManifestationProfile {
  return ARTIFACT_MANIFESTATION_PROFILE_BY_ID[artifactId];
}
