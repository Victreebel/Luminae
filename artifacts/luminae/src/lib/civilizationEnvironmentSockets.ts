import {
  CIVILIZATION_ENVIRONMENT_VARIANTS,
  CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID,
  getArtifactPlacementPhysicalContract,
  getCivilizationManifestationSocketCapacities,
  type ArtifactPlacementFamily,
  type CivilizationCameraScale,
  type CivilizationEnvironmentVariantId,
  type CivilizationManifestationDistrict,
  type CivilizationManifestationSubstrate,
  type CivilizationManifestationSupportMode,
} from '@workspace/game-types';
import {
  CHRYSALIS_SURFACE_DISTRICT_PARCELS,
  getCivilizationSurfaceArtifactAttachmentTransform,
  getCivilizationSurfaceDistrictParcelsForFamily,
  isCivilizationSurfaceDistrictFamily,
  type CivilizationDistrictAttachmentRole,
} from '@/lib/civilizationSurfaceDistrictPlan';
import { getCivilizationDistrictPresentation } from '@/lib/civilizationDistrictPresentation';

export type CivilizationSocketDepth = 'foreground' | 'midground' | 'distance';
export type CivilizationSocketOcclusion = 'terrain' | 'architecture' | 'atmosphere' | 'none';
export type CivilizationSocketMotion = 'grounded' | 'orbital' | 'systemic' | 'distributed';

export type CivilizationPhysicalHost =
  | 'terrain'
  | 'homeworld'
  | 'home-star'
  | 'galactic-region';

export type CivilizationConstructionModel =
  | 'grounded-districts'
  | 'orbital-works'
  | 'distributed-system-infrastructure'
  | 'colonized-stellar-neighborhoods';

/**
 * The non-negotiable physical reading for each Civilization camera scale.
 * Identity art may change architectural language, but it may not invent a new
 * celestial body or inflate one local work into a scale-spanning monolith.
 */
export interface CivilizationScenePhysicalContract {
  scene: CivilizationCameraScale;
  host: CivilizationPhysicalHost;
  constructionModel: CivilizationConstructionModel;
  maxIdentityStructures: number;
  preservesHostBody: boolean;
  scaleInterpretation: 'literal-local' | 'perspective-compressed' | 'distributed-aggregate';
}

export const CIVILIZATION_SCENE_PHYSICAL_CONTRACTS: Record<
  CivilizationCameraScale,
  CivilizationScenePhysicalContract
> = {
  surface: {
    scene: 'surface',
    host: 'terrain',
    constructionModel: 'grounded-districts',
    maxIdentityStructures: 20,
    preservesHostBody: true,
    scaleInterpretation: 'literal-local',
  },
  orbit: {
    scene: 'orbit',
    host: 'homeworld',
    constructionModel: 'orbital-works',
    maxIdentityStructures: 6,
    preservesHostBody: true,
    scaleInterpretation: 'perspective-compressed',
  },
  stellar: {
    scene: 'stellar',
    host: 'home-star',
    constructionModel: 'distributed-system-infrastructure',
    maxIdentityStructures: 3,
    preservesHostBody: true,
    scaleInterpretation: 'perspective-compressed',
  },
  galaxy: {
    scene: 'galaxy',
    host: 'galactic-region',
    constructionModel: 'colonized-stellar-neighborhoods',
    maxIdentityStructures: 3,
    preservesHostBody: true,
    scaleInterpretation: 'distributed-aggregate',
  },
};

export function getCivilizationScenePhysicalContract(
  scene: CivilizationCameraScale,
): CivilizationScenePhysicalContract {
  return CIVILIZATION_SCENE_PHYSICAL_CONTRACTS[scene];
}

export interface CivilizationSocketTransform {
  x: number;
  y: number;
  scale: number;
}

export const CIVILIZATION_SURFACE_LAYOUT_POLICY_VERSION =
  `${CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID}:layout-v1` as const;

export interface CivilizationSurfaceBuildableZone {
  id: string;
  depth: CivilizationSocketDepth;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Geometry shared by Portrait and Scan. These sockets are environmental
 * contracts, not UI markers: a pin attaches to an existing manifestation.
 */
export interface CivilizationManifestationSocketDefinition {
  socketId: string;
  environmentVariantId: CivilizationEnvironmentVariantId;
  nativeScene: CivilizationCameraScale;
  semanticRole: ArtifactPlacementFamily;
  district: CivilizationManifestationDistrict;
  substrate: CivilizationManifestationSubstrate;
  requiredSupport: CivilizationManifestationSupportMode;
  structuralAdaptation: 'native-grounding' | 'cliff-terrace' | 'shore-platform';
  physicalValidation: 'authored';
  perspective: 'ground_plane' | 'orbital_plane' | 'system_plane' | 'galactic_plane';
  footprint: { width: number; height: number };
  depth: CivilizationSocketDepth;
  occlusion: CivilizationSocketOcclusion;
  lighting: 'horizon_key' | 'stellar_rim' | 'ambient_field' | 'galactic_field';
  motion: CivilizationSocketMotion;
  desktopTransform: CivilizationSocketTransform;
  mobileTransform: CivilizationSocketTransform;
  scanAttachment: { x: number; y: number };
  districtParcelId?: string;
  districtAttachmentId?: string;
  districtAttachmentRole?: CivilizationDistrictAttachmentRole;
}

export type CivilizationContinuityChild = 'city' | 'planet' | 'system';

/**
 * A physical replacement socket for the civilization built at the preceding
 * scale. These are deliberately separate from Artifact sockets: a City is a
 * geographical region on its Planet, a Planet is a body in its System, and a
 * System is a foreground stellar neighbourhood in its Galaxy.
 */
export interface CivilizationContinuitySocketDefinition {
  socketId: string;
  environmentVariantId: CivilizationEnvironmentVariantId;
  parentScene: Exclude<CivilizationCameraScale, 'surface'>;
  child: CivilizationContinuityChild;
  perspective: 'planetary_surface' | 'stellar_depth' | 'galactic_depth';
  depth: CivilizationSocketDepth;
  occlusion: CivilizationSocketOcclusion;
  desktopTransform: CivilizationSocketTransform & {
    width: number;
    rotation: number;
  };
  mobileTransform: CivilizationSocketTransform & {
    width: number;
    rotation: number;
  };
  scanAttachment: { x: number; y: number };
}

export interface CivilizationStellarAnchorDefinition {
  environmentVariantId: CivilizationEnvironmentVariantId;
  body: 'home-star';
  desktopTransform: CivilizationSocketTransform & { width: number };
  mobileTransform: CivilizationSocketTransform & { width: number };
}

const PLACEMENT_ANCHORS: Record<ArtifactPlacementFamily, { x: number; y: number }> = {
  industrial_district: { x: 27, y: 73 },
  civic_core: { x: 50, y: 66 },
  habitat_district: { x: 67, y: 72 },
  wilderness_margin: { x: 81, y: 77 },
  subsurface_works: { x: 39, y: 84 },
  observatory_ridge: { x: 76, y: 48 },
  transit_terminus: { x: 16, y: 67 },
  archive_quarter: { x: 59, y: 52 },
  coastal_margin: { x: 88, y: 66 },
  containment_zone: { x: 13, y: 80 },
  low_orbit: { x: 31, y: 61 },
  high_orbit: { x: 68, y: 28 },
  orbital_yard: { x: 78, y: 57 },
  habitat_orbit: { x: 58, y: 69 },
  moonward_lane: { x: 20, y: 31 },
  atmosphere_edge: { x: 43, y: 76 },
  inner_system: { x: 45, y: 46 },
  habitable_orbits: { x: 64, y: 60 },
  lagrange_network: { x: 72, y: 36 },
  outer_system: { x: 21, y: 62 },
  heliopause: { x: 84, y: 53 },
  distributed_systems: { x: 54, y: 74 },
  spiral_arm: { x: 62, y: 50 },
  coreward_region: { x: 49, y: 41 },
  rimward_region: { x: 77, y: 67 },
  dark_sector: { x: 24, y: 67 },
  distributed_clusters: { x: 57, y: 70 },
  interarm_void: { x: 81, y: 34 },
};

const SURFACE_ENVIRONMENT_ANCHORS: Record<
  CivilizationEnvironmentVariantId,
  Partial<Record<ArtifactPlacementFamily, { x: number; y: number }>>
> = {
  aurora_basin: {
    industrial_district: { x: 18, y: 61 },
    civic_core: { x: 49, y: 53 },
    habitat_district: { x: 81, y: 57 },
    wilderness_margin: { x: 89, y: 44 },
    subsurface_works: { x: 76, y: 83 },
    observatory_ridge: { x: 8, y: 20 },
    transit_terminus: { x: 15, y: 43 },
    archive_quarter: { x: 67, y: 52 },
    coastal_margin: { x: 90, y: 70 },
    containment_zone: { x: 9, y: 75 },
  },
  terminator_reach: {
    industrial_district: { x: 34, y: 75 },
    civic_core: { x: 54, y: 69 },
    habitat_district: { x: 73, y: 70 },
    wilderness_margin: { x: 85, y: 73 },
    subsurface_works: { x: 46, y: 84 },
    observatory_ridge: { x: 61, y: 49 },
    transit_terminus: { x: 22, y: 76 },
    archive_quarter: { x: 69, y: 58 },
    coastal_margin: { x: 88, y: 60 },
    containment_zone: { x: 14, y: 84 },
  },
  oceanic_scar: {
    industrial_district: { x: 25, y: 79 },
    civic_core: { x: 38, y: 84 },
    habitat_district: { x: 77, y: 80 },
    wilderness_margin: { x: 86, y: 72 },
    subsurface_works: { x: 32, y: 87 },
    observatory_ridge: { x: 24, y: 55 },
    transit_terminus: { x: 14, y: 77 },
    archive_quarter: { x: 68, y: 84 },
    coastal_margin: { x: 90, y: 60 },
    containment_zone: { x: 10, y: 87 },
  },
  obsidian_steppe: {
    industrial_district: { x: 29, y: 78 },
    civic_core: { x: 52, y: 74 },
    habitat_district: { x: 68, y: 74 },
    wilderness_margin: { x: 82, y: 68 },
    subsurface_works: { x: 42, y: 86 },
    observatory_ridge: { x: 80, y: 45 },
    transit_terminus: { x: 16, y: 72 },
    archive_quarter: { x: 61, y: 59 },
    coastal_margin: { x: 89, y: 63 },
    containment_zone: { x: 10, y: 82 },
  },
};

/**
 * Portrait plates are independently composed, so their ground planes need
 * authored anchors rather than a compressed copy of desktop coordinates.
 */
const SURFACE_ENVIRONMENT_MOBILE_ANCHORS: Partial<Record<
  CivilizationEnvironmentVariantId,
  Partial<Record<ArtifactPlacementFamily, { x: number; y: number }>>
>> = {
  aurora_basin: {
    industrial_district: { x: 31, y: 68 },
    civic_core: { x: 51, y: 44 },
    habitat_district: { x: 73, y: 56 },
    wilderness_margin: { x: 83, y: 24 },
    subsurface_works: { x: 72, y: 81 },
    observatory_ridge: { x: 22, y: 17 },
    transit_terminus: { x: 24, y: 39 },
    archive_quarter: { x: 68, y: 38 },
    coastal_margin: { x: 86, y: 70 },
    containment_zone: { x: 15, y: 52 },
  },
  terminator_reach: {
    industrial_district: { x: 18, y: 71 },
    civic_core: { x: 36, y: 63 },
    habitat_district: { x: 76, y: 68 },
    wilderness_margin: { x: 86, y: 54 },
    subsurface_works: { x: 30, y: 84 },
    observatory_ridge: { x: 49, y: 35 },
    transit_terminus: { x: 10, y: 58 },
    archive_quarter: { x: 69, y: 82 },
    coastal_margin: { x: 90, y: 65 },
    containment_zone: { x: 12, y: 87 },
  },
  oceanic_scar: {
    industrial_district: { x: 18, y: 78 },
    civic_core: { x: 32, y: 74 },
    habitat_district: { x: 77, y: 75 },
    wilderness_margin: { x: 84, y: 63 },
    subsurface_works: { x: 31, y: 88 },
    observatory_ridge: { x: 19, y: 47 },
    transit_terminus: { x: 10, y: 69 },
    archive_quarter: { x: 69, y: 85 },
    coastal_margin: { x: 90, y: 68 },
    containment_zone: { x: 12, y: 88 },
  },
  obsidian_steppe: {
    industrial_district: { x: 18, y: 72 },
    civic_core: { x: 36, y: 64 },
    habitat_district: { x: 76, y: 69 },
    wilderness_margin: { x: 87, y: 55 },
    subsurface_works: { x: 30, y: 85 },
    observatory_ridge: { x: 50, y: 38 },
    transit_terminus: { x: 10, y: 59 },
    archive_quarter: { x: 70, y: 83 },
    coastal_margin: { x: 91, y: 66 },
    containment_zone: { x: 12, y: 88 },
  },
};

const AURORA_BASIN_DESKTOP_CAMPUS_MEMBER_OFFSETS = [
  { x: -5, y: 0 },
  { x: 5, y: 0 },
  { x: -5, y: 6 },
  { x: 5, y: 6 },
  { x: 0, y: 12 },
  { x: 0, y: -5 },
  { x: 8, y: -4 },
  { x: -9, y: 5 },
  { x: 9, y: 5 },
  { x: -6, y: 11 },
  { x: 6, y: 11 },
] as const;

const AURORA_BASIN_MOBILE_CAMPUS_MEMBER_OFFSETS = [
  { x: -6, y: 0 },
  { x: 6, y: 0 },
  { x: -6, y: 5 },
  { x: 6, y: 5 },
  { x: 0, y: 10 },
  { x: 0, y: -5 },
  { x: 9, y: -4 },
  { x: -9, y: 5 },
  { x: 9, y: 5 },
  { x: -5, y: 10 },
  { x: 5, y: 10 },
] as const;

export function getCivilizationSurfaceDistrictAnchor(
  variantId: CivilizationEnvironmentVariantId,
  placement: ArtifactPlacementFamily,
  compact = false,
): { x: number; y: number } {
  void variantId;
  if (isCivilizationSurfaceDistrictFamily(placement)) {
    const authoredParcel = getCivilizationSurfaceDistrictParcelsForFamily(placement)[0];
    if (authoredParcel) {
      const transform = compact
        ? authoredParcel.mobileTransform
        : authoredParcel.desktopTransform;
      return { x: transform.x, y: transform.y };
    }
  }
  const desktop = SURFACE_ENVIRONMENT_ANCHORS.aurora_basin[placement]
    ?? PLACEMENT_ANCHORS[placement];
  if (!compact) return desktop;
  return SURFACE_ENVIRONMENT_MOBILE_ANCHORS.aurora_basin?.[placement] ?? desktop;
}

function getSharedSurfaceCampusMemberPosition(
  placement: ArtifactPlacementFamily,
  ordinal: number,
  compact: boolean,
): { x: number; y: number } {
  const anchor = getCivilizationSurfaceDistrictAnchor('aurora_basin', placement, compact);
  const offsets = compact
    ? AURORA_BASIN_MOBILE_CAMPUS_MEMBER_OFFSETS
    : AURORA_BASIN_DESKTOP_CAMPUS_MEMBER_OFFSETS;
  const baseOffset = offsets[ordinal % offsets.length]!;
  const ring = Math.floor(ordinal / offsets.length);
  const ringScale = 1 + ring * 0.16;
  return {
    x: clamp(anchor.x + baseOffset.x * ringScale),
    y: clamp(anchor.y + baseOffset.y * ringScale),
  };
}

const AURORA_BASIN_SURFACE_PRIMARY_DEPTHS: Partial<Record<
  ArtifactPlacementFamily,
  CivilizationSocketDepth
>> = {
  industrial_district: 'foreground',
  civic_core: 'midground',
  habitat_district: 'midground',
  wilderness_margin: 'distance',
  subsurface_works: 'foreground',
  observatory_ridge: 'distance',
  transit_terminus: 'distance',
  archive_quarter: 'midground',
  coastal_margin: 'midground',
  containment_zone: 'midground',
};

export function getCivilizationSurfaceBuildableZones(
  variantId: CivilizationEnvironmentVariantId,
  compact = false,
): readonly CivilizationSurfaceBuildableZone[] {
  void variantId;
  return CHRYSALIS_SURFACE_DISTRICT_PARCELS.map((parcel) => {
    const { bounds } = getCivilizationDistrictPresentation(parcel.id, compact)!;
    return {
      id: parcel.id,
      depth: parcel.depth,
      ...bounds,
    };
  });
}

/** Residents follow the fitted district, including small repeat parcels. */
function fittedSurfaceAttachment(
  placement: ArtifactPlacementFamily,
  ordinal: number,
  compact: boolean,
) {
  if (!isCivilizationSurfaceDistrictFamily(placement)) return null;
  const attachment = getCivilizationSurfaceArtifactAttachmentTransform(placement, ordinal, compact);
  if (!attachment) return null;
  const transform = compact ? attachment.parcel.mobileTransform : attachment.parcel.desktopTransform;
  const fit = getCivilizationDistrictPresentation(attachment.parcel.id, compact)!;
  const ratio = fit.width / transform.width;
  return {
    ...attachment,
    x: Math.max(fit.bounds.minX + 0.1, Math.min(fit.bounds.maxX - 0.1,
      transform.x + (attachment.x - transform.x) * ratio)),
    // Positive authored offsets described the old loose apron. Keep residents
    // on their building's ground contact, not on a road below its foundation.
    y: Math.max(fit.bounds.minY + 0.1, Math.min(transform.y,
      transform.y + (attachment.y - transform.y) * ratio)),
    scale: attachment.scale * ratio,
  };
}

const VARIANT_TRANSFORMS: Record<
  CivilizationEnvironmentVariantId,
  Record<CivilizationCameraScale, { x: number; y: number; scaleX: number; scaleY: number }>
> = {
  aurora_basin: {
    surface: { x: -1.5, y: 1, scaleX: 0.96, scaleY: 0.94 },
    orbit: { x: -2, y: 0, scaleX: 0.96, scaleY: 0.98 },
    stellar: { x: -1, y: 1, scaleX: 0.98, scaleY: 0.96 },
    galaxy: { x: -1, y: 0, scaleX: 0.98, scaleY: 0.98 },
  },
  terminator_reach: {
    surface: { x: 2.5, y: -1, scaleX: 0.9, scaleY: 1 },
    orbit: { x: 2, y: -1, scaleX: 0.92, scaleY: 0.96 },
    stellar: { x: 2, y: 0, scaleX: 0.94, scaleY: 0.98 },
    galaxy: { x: 1, y: -1, scaleX: 0.96, scaleY: 0.96 },
  },
  oceanic_scar: {
    surface: { x: 0, y: 3, scaleX: 0.9, scaleY: 0.88 },
    orbit: { x: 1, y: 2, scaleX: 0.94, scaleY: 0.92 },
    stellar: { x: -2, y: 1, scaleX: 0.92, scaleY: 0.96 },
    galaxy: { x: 2, y: 1, scaleX: 0.94, scaleY: 0.96 },
  },
  obsidian_steppe: {
    surface: { x: -3, y: -2, scaleX: 0.88, scaleY: 0.94 },
    orbit: { x: -1, y: -2, scaleX: 0.9, scaleY: 0.94 },
    stellar: { x: 1, y: -1, scaleX: 0.94, scaleY: 0.94 },
    galaxy: { x: -2, y: -1, scaleX: 0.92, scaleY: 0.96 },
  },
};

const CONTINUITY_SOCKET_CONTRACTS: Record<
  CivilizationEnvironmentVariantId,
  readonly CivilizationContinuitySocketDefinition[]
> = {
  aurora_basin: [
    {
      socketId: 'orbit:city-region:0',
      environmentVariantId: 'aurora_basin',
      parentScene: 'orbit',
      child: 'city',
      perspective: 'planetary_surface',
      depth: 'midground',
      occlusion: 'atmosphere',
      desktopTransform: { x: 51, y: 66, scale: 1, width: 18, rotation: -8 },
      mobileTransform: { x: 50, y: 67, scale: 0.88, width: 22, rotation: -8 },
      scanAttachment: { x: 51, y: 58 },
    },
    {
      socketId: 'stellar:home-planet:0',
      environmentVariantId: 'aurora_basin',
      parentScene: 'stellar',
      child: 'planet',
      perspective: 'stellar_depth',
      depth: 'midground',
      occlusion: 'none',
      desktopTransform: { x: 22, y: 55, scale: 1, width: 10, rotation: -5 },
      mobileTransform: { x: 18, y: 50, scale: 1, width: 12, rotation: -5 },
      scanAttachment: { x: 22, y: 48 },
    },
    {
      socketId: 'galaxy:home-system:0',
      environmentVariantId: 'aurora_basin',
      parentScene: 'galaxy',
      child: 'system',
      perspective: 'galactic_depth',
      depth: 'foreground',
      occlusion: 'none',
      desktopTransform: { x: 24, y: 70, scale: 1, width: 40, rotation: -7 },
      mobileTransform: { x: 25, y: 70, scale: 0.92, width: 48, rotation: -7 },
      scanAttachment: { x: 24, y: 58 },
    },
  ],
  terminator_reach: [
    {
      socketId: 'orbit:city-region:0',
      environmentVariantId: 'terminator_reach',
      parentScene: 'orbit',
      child: 'city',
      perspective: 'planetary_surface',
      depth: 'midground',
      occlusion: 'atmosphere',
      desktopTransform: { x: 58, y: 61, scale: 1, width: 18, rotation: 6 },
      mobileTransform: { x: 57, y: 63, scale: 0.88, width: 22, rotation: 6 },
      scanAttachment: { x: 58, y: 53 },
    },
    {
      socketId: 'stellar:home-planet:0',
      environmentVariantId: 'terminator_reach',
      parentScene: 'stellar',
      child: 'planet',
      perspective: 'stellar_depth',
      depth: 'midground',
      occlusion: 'none',
      desktopTransform: { x: 31, y: 18, scale: 1, width: 10, rotation: 3 },
      mobileTransform: { x: 31, y: 24, scale: 1, width: 12, rotation: 3 },
      scanAttachment: { x: 31, y: 11 },
    },
    {
      socketId: 'galaxy:home-system:0',
      environmentVariantId: 'terminator_reach',
      parentScene: 'galaxy',
      child: 'system',
      perspective: 'galactic_depth',
      depth: 'foreground',
      occlusion: 'none',
      desktopTransform: { x: 24, y: 70, scale: 1, width: 40, rotation: 8 },
      mobileTransform: { x: 25, y: 70, scale: 0.92, width: 48, rotation: 8 },
      scanAttachment: { x: 24, y: 58 },
    },
  ],
  oceanic_scar: [
    {
      socketId: 'orbit:city-region:0',
      environmentVariantId: 'oceanic_scar',
      parentScene: 'orbit',
      child: 'city',
      perspective: 'planetary_surface',
      depth: 'midground',
      occlusion: 'atmosphere',
      desktopTransform: { x: 49, y: 61, scale: 1, width: 18, rotation: -10 },
      mobileTransform: { x: 50, y: 61, scale: 0.88, width: 22, rotation: -10 },
      scanAttachment: { x: 49, y: 53 },
    },
    {
      socketId: 'stellar:home-planet:0',
      environmentVariantId: 'oceanic_scar',
      parentScene: 'stellar',
      child: 'planet',
      perspective: 'stellar_depth',
      depth: 'midground',
      occlusion: 'none',
      desktopTransform: { x: 15, y: 31, scale: 1, width: 8, rotation: -4 },
      mobileTransform: { x: 12, y: 28, scale: 1, width: 10, rotation: -4 },
      scanAttachment: { x: 15, y: 25 },
    },
    {
      socketId: 'galaxy:home-system:0',
      environmentVariantId: 'oceanic_scar',
      parentScene: 'galaxy',
      child: 'system',
      perspective: 'galactic_depth',
      depth: 'foreground',
      occlusion: 'none',
      desktopTransform: { x: 24, y: 70, scale: 1, width: 40, rotation: 5 },
      mobileTransform: { x: 25, y: 70, scale: 0.92, width: 48, rotation: 5 },
      scanAttachment: { x: 24, y: 58 },
    },
  ],
  obsidian_steppe: [
    {
      socketId: 'orbit:city-region:0',
      environmentVariantId: 'obsidian_steppe',
      parentScene: 'orbit',
      child: 'city',
      perspective: 'planetary_surface',
      depth: 'midground',
      occlusion: 'atmosphere',
      desktopTransform: { x: 57, y: 57, scale: 1, width: 18, rotation: 7 },
      mobileTransform: { x: 55, y: 58, scale: 0.88, width: 22, rotation: 7 },
      scanAttachment: { x: 57, y: 49 },
    },
    {
      socketId: 'stellar:home-planet:0',
      environmentVariantId: 'obsidian_steppe',
      parentScene: 'stellar',
      child: 'planet',
      perspective: 'stellar_depth',
      depth: 'midground',
      occlusion: 'none',
      desktopTransform: { x: 12, y: 44, scale: 1, width: 9, rotation: 7 },
      mobileTransform: { x: 12, y: 34, scale: 1, width: 11, rotation: 7 },
      scanAttachment: { x: 12, y: 37 },
    },
    {
      socketId: 'galaxy:home-system:0',
      environmentVariantId: 'obsidian_steppe',
      parentScene: 'galaxy',
      child: 'system',
      perspective: 'galactic_depth',
      depth: 'foreground',
      occlusion: 'none',
      desktopTransform: { x: 24, y: 70, scale: 1, width: 40, rotation: -10 },
      mobileTransform: { x: 25, y: 70, scale: 0.92, width: 48, rotation: -10 },
      scanAttachment: { x: 24, y: 58 },
    },
  ],
};

const STELLAR_STAR_ANCHORS: Record<
  CivilizationEnvironmentVariantId,
  CivilizationStellarAnchorDefinition
> = {
  aurora_basin: {
    environmentVariantId: 'aurora_basin',
    body: 'home-star',
    desktopTransform: { x: 31, y: 31, scale: 1, width: 22 },
    mobileTransform: { x: 28, y: 39, scale: 1, width: 30 },
  },
  terminator_reach: {
    environmentVariantId: 'terminator_reach',
    body: 'home-star',
    desktopTransform: { x: 61, y: 35, scale: 1, width: 21 },
    mobileTransform: { x: 60, y: 30, scale: 1, width: 28 },
  },
  oceanic_scar: {
    environmentVariantId: 'oceanic_scar',
    body: 'home-star',
    desktopTransform: { x: 38, y: 33, scale: 1, width: 20 },
    mobileTransform: { x: 38, y: 27, scale: 1, width: 27 },
  },
  obsidian_steppe: {
    environmentVariantId: 'obsidian_steppe',
    body: 'home-star',
    desktopTransform: { x: 62, y: 33, scale: 1, width: 21 },
    mobileTransform: { x: 64, y: 29, scale: 1, width: 28 },
  },
};

const DISTRIBUTION_CANDIDATE_OFFSETS = [
  { x: 0, y: 0 },
  { x: -5.4, y: 0.8 },
  { x: 5.4, y: 0.8 },
  { x: -2.8, y: 6.2 },
  { x: 2.8, y: 6.2 },
  { x: -8.2, y: 5.4 },
  { x: 8.2, y: 5.4 },
  { x: -3.8, y: -5.8 },
  { x: 3.8, y: -5.8 },
  { x: -9.4, y: -4.8 },
  { x: 9.4, y: -4.8 },
  { x: 0, y: 11.4 },
  { x: -14.2, y: 1.8 },
  { x: 14.2, y: 1.8 },
  { x: -12.2, y: 10.8 },
  { x: 12.2, y: 10.8 },
  { x: -12.2, y: -9.4 },
  { x: 12.2, y: -9.4 },
  { x: 0, y: -12.4 },
  { x: 0, y: 16.2 },
  { x: -18.4, y: -1.8 },
  { x: 18.4, y: -1.8 },
  { x: -17.2, y: 13.8 },
  { x: 17.2, y: 13.8 },
  { x: -17.2, y: -13.2 },
  { x: 17.2, y: -13.2 },
] as const;

const SURFACE_FOREGROUND_PLACEMENTS: ReadonlySet<ArtifactPlacementFamily> = new Set([
  'industrial_district',
]);

const SURFACE_DISTANCE_PLACEMENTS: ReadonlySet<ArtifactPlacementFamily> = new Set([
  'observatory_ridge',
  'archive_quarter',
  'transit_terminus',
  'wilderness_margin',
  'coastal_margin',
]);

interface OccupiedSocketPoint {
  x: number;
  y: number;
  district: CivilizationManifestationDistrict;
  reservedLandmark?: boolean;
}

function clamp(value: number): number {
  return Math.min(94, Math.max(6, value));
}

function clampBetween(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function distributeSocketPosition(
  base: { x: number; y: number },
  ordinal: number,
  scene: CivilizationCameraScale,
  district: CivilizationManifestationDistrict,
  occupied: readonly OccupiedSocketPoint[],
  compact: boolean,
  authoredDepth?: CivilizationSocketDepth,
): { x: number; y: number } {
  const minimumXGap = compact
    ? scene === 'surface' ? 8.4 : scene === 'orbit' ? 6.8 : 6.2
    : scene === 'surface' ? 7.2 : scene === 'orbit' ? 5.8 : 5.4;
  const minimumYGap = compact
    ? scene === 'surface' ? 7 : scene === 'orbit' ? 6.4 : 6
    : scene === 'surface' ? 7.8 : scene === 'orbit' ? 7 : 6.4;
  const preferredIndex = ordinal % DISTRIBUTION_CANDIDATE_OFFSETS.length;
  const ring = Math.floor(ordinal / DISTRIBUTION_CANDIDATE_OFFSETS.length);

  const rankedCandidates = DISTRIBUTION_CANDIDATE_OFFSETS
    .map((_, candidateIndex) => {
      const rotatedIndex = (candidateIndex + preferredIndex) % DISTRIBUTION_CANDIDATE_OFFSETS.length;
      const candidate = DISTRIBUTION_CANDIDATE_OFFSETS[rotatedIndex]!;
      const ringDirection = ring % 2 === 0 ? -1 : 1;
      const x = clamp(base.x + candidate.x + ringDirection * ring * 2.4);
      const maximumY = scene === 'surface' ? compact ? 91 : 92 : 94;
      const unconstrainedY = Math.min(maximumY, clamp(base.y + candidate.y + ring * 3.2));
      const depthBounds = authoredDepth && scene === 'surface'
        ? getSurfaceDepthBounds(authoredDepth, compact)
        : null;
      const y = depthBounds
        ? clampBetween(unconstrainedY, depthBounds.minY, depthBounds.maxY)
        : unconstrainedY;
      const collisionPenalty = occupied.reduce((total, prior) => {
        const xOverlap = Math.max(0, minimumXGap - Math.abs(prior.x - x));
        const yOverlap = Math.max(0, minimumYGap - Math.abs(prior.y - y));
        if (xOverlap === 0 || yOverlap === 0) return total;
        const sameDistrictMultiplier = (prior.district === district ? 1.35 : 1) *
          (prior.reservedLandmark ? 24 : 1);
        return total + xOverlap * yOverlap * 120 * sameDistrictMultiplier;
      }, 0);
      const semanticDrift = Math.hypot(x - base.x, y - base.y) * (scene === 'surface' ? 0.8 : 0.4);
      const preferencePenalty = Math.min(
        Math.abs(rotatedIndex - preferredIndex),
        DISTRIBUTION_CANDIDATE_OFFSETS.length - Math.abs(rotatedIndex - preferredIndex),
      ) * 0.18;
      return { x, y, score: collisionPenalty + semanticDrift + preferencePenalty, candidateIndex };
    })
    .sort((left, right) => left.score - right.score || left.candidateIndex - right.candidateIndex);
  return rankedCandidates.find((candidate) => !occupied.some((prior) => (
    Math.abs(prior.x - candidate.x) < 4.2 && Math.abs(prior.y - candidate.y) < 4.8
  ))) ?? rankedCandidates[0]!;
}

function getAuthoredSocketDepth(
  scene: CivilizationCameraScale,
  placement: ArtifactPlacementFamily,
  ordinal: number,
): CivilizationSocketDepth | null {
  if (scene !== 'surface') return null;
  if (SURFACE_FOREGROUND_PLACEMENTS.has(placement)) {
    if (ordinal === 0) return 'foreground';
    return ordinal % 2 === 1 ? 'distance' : 'midground';
  }
  if (SURFACE_DISTANCE_PLACEMENTS.has(placement)) {
    return ordinal % 2 === 0 ? 'distance' : 'midground';
  }
  return ordinal % 2 === 0 ? 'midground' : 'distance';
}

function getSurfaceDepthBounds(
  depth: CivilizationSocketDepth,
  compact: boolean,
): { minY: number; maxY: number } {
  if (depth === 'distance') return compact ? { minY: 32, maxY: 52 } : { minY: 36, maxY: 50 };
  if (depth === 'midground') return compact ? { minY: 55, maxY: 70 } : { minY: 58, maxY: 72 };
  return compact ? { minY: 75, maxY: 88 } : { minY: 78, maxY: 90 };
}

function perspective(scene: CivilizationCameraScale): CivilizationManifestationSocketDefinition['perspective'] {
  if (scene === 'surface') return 'ground_plane';
  if (scene === 'orbit') return 'orbital_plane';
  if (scene === 'stellar') return 'system_plane';
  return 'galactic_plane';
}

function adaptPhysicalSiteToEnvironment(
  variantId: CivilizationEnvironmentVariantId,
  scene: CivilizationCameraScale,
  substrate: CivilizationManifestationSubstrate,
  support: CivilizationManifestationSupportMode,
): {
  substrate: CivilizationManifestationSubstrate;
  support: CivilizationManifestationSupportMode;
  adaptation: CivilizationManifestationSocketDefinition['structuralAdaptation'];
} {
  void variantId;
  if (scene !== 'surface' || substrate !== 'developed_land') {
    return { substrate, support, adaptation: 'native-grounding' };
  }
  return { substrate, support, adaptation: 'native-grounding' };
}

function buildSocket(
  variantId: CivilizationEnvironmentVariantId,
  scene: CivilizationCameraScale,
  placement: ArtifactPlacementFamily,
  ordinal: number,
  occupiedDesktop: OccupiedSocketPoint[],
  occupiedMobile: OccupiedSocketPoint[],
): CivilizationManifestationSocketDefinition {
  const physical = getArtifactPlacementPhysicalContract(placement);
  const surfaceAttachment = scene === 'surface' && isCivilizationSurfaceDistrictFamily(placement)
    ? fittedSurfaceAttachment(placement, ordinal, false)
    : null;
  const compactSurfaceAttachment = scene === 'surface' && isCivilizationSurfaceDistrictFamily(placement)
    ? fittedSurfaceAttachment(placement, ordinal, true)
    : null;
  const authoredDepth = scene === 'surface'
    ? surfaceAttachment?.parcel.depth ??
      AURORA_BASIN_SURFACE_PRIMARY_DEPTHS[placement] ??
      getAuthoredSocketDepth(scene, placement, ordinal)
    : getAuthoredSocketDepth(scene, placement, ordinal);
  const adaptedPhysical = adaptPhysicalSiteToEnvironment(
    variantId,
    scene,
    physical.substrate,
    physical.requiredSupport,
  );
  const base = scene === 'surface'
    ? SURFACE_ENVIRONMENT_ANCHORS.aurora_basin[placement] ?? PLACEMENT_ANCHORS[placement]
    : PLACEMENT_ANCHORS[placement];
  const transform = VARIANT_TRANSFORMS[variantId][scene];
  const transformedBase = scene === 'surface'
    ? base
    : {
        x: clamp(50 + (base.x - 50) * transform.scaleX + transform.x),
        y: clamp(50 + (base.y - 50) * transform.scaleY + transform.y),
      };
  const desktopPosition = scene === 'surface'
    ? surfaceAttachment ?? getSharedSurfaceCampusMemberPosition(placement, ordinal, false)
    : distributeSocketPosition(
        transformedBase,
        ordinal,
        scene,
        physical.district,
        occupiedDesktop,
        false,
        undefined,
      );
  // Authored Surface attachments are already fitted inside their physical
  // parcel. A generic marker margin would pull edge-harbor residents off it.
  // Scan applies its own viewport-safe target placement independently.
  const x = surfaceAttachment ? desktopPosition.x : clamp(desktopPosition.x);
  const y = surfaceAttachment ? desktopPosition.y : clamp(desktopPosition.y);
  const mobileBase = scene === 'surface'
    ? SURFACE_ENVIRONMENT_MOBILE_ANCHORS.aurora_basin?.[placement]
    : undefined;
  const transformedMobileBase = scene === 'surface'
    ? mobileBase ?? base
    : {
        x: clamp(50 + (transformedBase.x - 50) * 0.78),
        y: clamp(51 + (transformedBase.y - 50) * 0.93),
      };
  const mobilePosition = scene === 'surface'
    ? compactSurfaceAttachment ?? getSharedSurfaceCampusMemberPosition(placement, ordinal, true)
    : distributeSocketPosition(
        transformedMobileBase,
        ordinal,
        scene,
        physical.district,
        occupiedMobile,
        true,
        undefined,
      );
  const mobileX = compactSurfaceAttachment ? mobilePosition.x : clamp(mobilePosition.x);
  const mobileY = compactSurfaceAttachment ? mobilePosition.y : clamp(mobilePosition.y);
  const depth: CivilizationSocketDepth = authoredDepth ?? (y >= 68
    ? 'foreground'
    : y >= 49
      ? 'midground'
      : 'distance');
  const scale = surfaceAttachment?.scale ?? (
    depth === 'foreground' ? 1 : depth === 'midground' ? 0.72 : 0.52
  );
  const socket: CivilizationManifestationSocketDefinition = {
    socketId: `${scene}:${placement}:${ordinal}`,
    environmentVariantId: variantId,
    nativeScene: scene,
    semanticRole: placement,
    district: physical.district,
    substrate: adaptedPhysical.substrate,
    requiredSupport: adaptedPhysical.support,
    structuralAdaptation: adaptedPhysical.adaptation,
    physicalValidation: 'authored',
    perspective: perspective(scene),
    footprint: scene === 'surface'
      ? {
          width: Math.max(6, (surfaceAttachment?.parcel.desktopTransform.width ?? 12) * 0.42),
          height: Math.max(8, (surfaceAttachment?.parcel.desktopTransform.width ?? 12) * 0.62),
        }
      : scene === 'orbit'
        ? { width: 8, height: 11 }
        : { width: 7, height: 9 },
    depth,
    occlusion: scene === 'surface'
      ? depth === 'foreground' ? 'architecture' : 'terrain'
      : scene === 'orbit' ? 'atmosphere' : 'none',
    lighting: scene === 'surface'
      ? 'horizon_key'
      : scene === 'orbit'
        ? 'stellar_rim'
        : scene === 'stellar'
          ? 'ambient_field'
          : 'galactic_field',
    motion: scene === 'surface'
      ? 'grounded'
      : scene === 'orbit'
        ? 'orbital'
        : scene === 'stellar'
          ? 'systemic'
          : 'distributed',
    desktopTransform: { x, y, scale },
    mobileTransform: {
      x: mobileX,
      y: mobileY,
      scale: compactSurfaceAttachment?.scale ?? scale * 0.9,
    },
    scanAttachment: { x, y: clamp(y - (scene === 'surface' ? 8 : 5)) },
    districtParcelId: surfaceAttachment?.parcel.id,
    districtAttachmentId: surfaceAttachment
      ? `${surfaceAttachment.parcel.id}:${surfaceAttachment.attachment.id}`
      : undefined,
    districtAttachmentRole: surfaceAttachment?.attachment.role,
  };
  occupiedDesktop.push({
    x,
    y,
    district: physical.district,
    reservedLandmark: scene === 'surface' && ordinal === 0,
  });
  occupiedMobile.push({
    x: mobileX,
    y: mobileY,
    district: physical.district,
    reservedLandmark: scene === 'surface' && ordinal === 0,
  });
  return socket;
}

const SOCKET_CONTRACTS = Object.fromEntries(
  CIVILIZATION_ENVIRONMENT_VARIANTS.map((variant) => {
    const occupiedDesktopByScene = new Map<CivilizationCameraScale, OccupiedSocketPoint[]>();
    const occupiedMobileByScene = new Map<CivilizationCameraScale, OccupiedSocketPoint[]>();
    const capacities = getCivilizationManifestationSocketCapacities();
    const maximumCapacity = Math.max(...capacities.map((capacity) => capacity.authoredCapacity));
    const sockets: CivilizationManifestationSocketDefinition[] = [];
    for (let ordinal = 0; ordinal < maximumCapacity; ordinal += 1) {
      for (const capacity of capacities) {
        if (ordinal >= capacity.authoredCapacity) continue;
        const occupiedDesktop = occupiedDesktopByScene.get(capacity.nativeScene) ?? [];
        const occupiedMobile = occupiedMobileByScene.get(capacity.nativeScene) ?? [];
        occupiedDesktopByScene.set(capacity.nativeScene, occupiedDesktop);
        occupiedMobileByScene.set(capacity.nativeScene, occupiedMobile);
        sockets.push(buildSocket(
          variant.id,
          capacity.nativeScene,
          capacity.placementFamily,
          ordinal,
          occupiedDesktop,
          occupiedMobile,
        ));
      }
    }
    return [variant.id, sockets];
  }),
) as Record<CivilizationEnvironmentVariantId, CivilizationManifestationSocketDefinition[]>;

export function getCivilizationEnvironmentSocketContract(
  variantId: CivilizationEnvironmentVariantId,
): readonly CivilizationManifestationSocketDefinition[] {
  return SOCKET_CONTRACTS[variantId];
}

export function getCivilizationEnvironmentSocket(
  variantId: CivilizationEnvironmentVariantId,
  socketId: string,
): CivilizationManifestationSocketDefinition | null {
  return SOCKET_CONTRACTS[variantId].find((socket) => socket.socketId === socketId) ?? null;
}

export function getCivilizationContinuitySocket(
  variantId: CivilizationEnvironmentVariantId,
  parentScene: Exclude<CivilizationCameraScale, 'surface'>,
): CivilizationContinuitySocketDefinition {
  const socket = CONTINUITY_SOCKET_CONTRACTS[variantId].find((entry) => (
    entry.parentScene === parentScene
  ));
  if (!socket) {
    throw new Error(`Missing ${parentScene} continuity socket for ${variantId}`);
  }
  return socket;
}

export function getCivilizationContinuitySocketContract(
  variantId: CivilizationEnvironmentVariantId,
): readonly CivilizationContinuitySocketDefinition[] {
  return CONTINUITY_SOCKET_CONTRACTS[variantId];
}

export function getCivilizationStellarAnchor(
  variantId: CivilizationEnvironmentVariantId,
): CivilizationStellarAnchorDefinition {
  return STELLAR_STAR_ANCHORS[variantId];
}
