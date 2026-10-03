import {
  ARTIFACT_CATALOG,
  getArtifactPlacementPhysicalContract,
  type ArtifactId,
  type ArtifactPlacementFamily,
} from '@workspace/game-types';
import { getArtifactManifestationProfile } from '@/lib/civilizationArtifactManifestations';
import type { CivilizationCityDevelopmentStage } from '@/lib/civilizationVisualState';
import type { CivilizationSocketDepth } from '@/lib/civilizationEnvironmentSockets';

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

export type CivilizationDistrictAttachmentRole =
  | 'anchor-landmark'
  | 'plaza-module'
  | 'roof-module'
  | 'infrastructure-module';

export interface CivilizationDistrictAttachmentSocket {
  id: string;
  role: CivilizationDistrictAttachmentRole;
  desktopOffset: { x: number; y: number; scale: number };
  mobileOffset: { x: number; y: number; scale: number };
}

export interface CivilizationSurfaceDistrictTransform {
  x: number;
  y: number;
  width: number;
  /** Optional visual ceiling; width still defines the authored attachment frame. */
  presentationWidth?: number;
  scale: number;
}

export interface CivilizationSurfaceDistrictParcel {
  id: string;
  family: CivilizationSurfaceDistrictFamily;
  instance: number;
  depth: CivilizationSocketDepth;
  activationStage: CivilizationCityDevelopmentStage;
  capacity: number;
  genericFillerVariant: 'terrace' | 'campus' | 'garden' | 'works' | 'edge';
  desktopTransform: CivilizationSurfaceDistrictTransform;
  mobileTransform: CivilizationSurfaceDistrictTransform;
  attachmentSockets: readonly CivilizationDistrictAttachmentSocket[];
  /** Visible piles below the square artwork, as a fraction of its width. */
  shoreSupportDepth?: number;
}

export interface CivilizationDistrictDesignContract {
  family: CivilizationSurfaceDistrictFamily;
  genericForm: string;
  chrysalisForm: string;
  artifactIntegration: string;
}

export interface CivilizationSurfaceArtifactDistrictAssignment {
  artifactId: ArtifactId;
  placement: CivilizationSurfaceDistrictFamily;
  parcelId: string;
  parcelMemberIndex: number;
  attachmentSocketId: string;
}

const DISTANCE_ATTACHMENTS: readonly CivilizationDistrictAttachmentSocket[] = [
  {
    id: 'anchor',
    role: 'anchor-landmark',
    desktopOffset: { x: -3.1, y: 1.1, scale: 0.7 },
    mobileOffset: { x: -3.5, y: 1.1, scale: 0.64 },
  },
  {
    id: 'plaza',
    role: 'plaza-module',
    desktopOffset: { x: 3.1, y: 1.1, scale: 0.66 },
    mobileOffset: { x: 3.5, y: 1.1, scale: 0.6 },
  },
  {
    id: 'roof',
    role: 'roof-module',
    desktopOffset: { x: -3.1, y: -3.9, scale: 0.58 },
    mobileOffset: { x: -3.5, y: -3.9, scale: 0.54 },
  },
  {
    id: 'infrastructure',
    role: 'infrastructure-module',
    desktopOffset: { x: 3.1, y: -3.9, scale: 0.56 },
    mobileOffset: { x: 3.5, y: -3.9, scale: 0.52 },
  },
] as const;

const MIDGROUND_ATTACHMENTS: readonly CivilizationDistrictAttachmentSocket[] = [
  {
    id: 'anchor',
    role: 'anchor-landmark',
    desktopOffset: { x: -3.5, y: 1.3, scale: 0.88 },
    mobileOffset: { x: -3.8, y: 1.3, scale: 0.78 },
  },
  {
    id: 'plaza',
    role: 'plaza-module',
    desktopOffset: { x: 3.5, y: 1.3, scale: 0.82 },
    mobileOffset: { x: 3.8, y: 1.3, scale: 0.74 },
  },
  {
    id: 'roof',
    role: 'roof-module',
    desktopOffset: { x: -3.5, y: -3.8, scale: 0.72 },
    mobileOffset: { x: -3.8, y: -3.8, scale: 0.66 },
  },
  {
    id: 'infrastructure',
    role: 'infrastructure-module',
    desktopOffset: { x: 3.5, y: -3.8, scale: 0.7 },
    mobileOffset: { x: 3.8, y: -3.8, scale: 0.64 },
  },
] as const;

const FOREGROUND_ATTACHMENTS: readonly CivilizationDistrictAttachmentSocket[] = [
  {
    id: 'anchor',
    role: 'anchor-landmark',
    desktopOffset: { x: -3.8, y: 1.4, scale: 1 },
    mobileOffset: { x: -4, y: 1.4, scale: 0.86 },
  },
  {
    id: 'plaza',
    role: 'plaza-module',
    desktopOffset: { x: 3.8, y: 1.4, scale: 0.94 },
    mobileOffset: { x: 4, y: 1.4, scale: 0.82 },
  },
  {
    id: 'roof',
    role: 'roof-module',
    desktopOffset: { x: -3.8, y: -4, scale: 0.82 },
    mobileOffset: { x: -4, y: -4, scale: 0.72 },
  },
  {
    id: 'infrastructure',
    role: 'infrastructure-module',
    desktopOffset: { x: 3.8, y: -4, scale: 0.8 },
    mobileOffset: { x: 4, y: -4, scale: 0.7 },
  },
] as const;

function attachmentsForDepth(depth: CivilizationSocketDepth) {
  if (depth === 'foreground') return FOREGROUND_ATTACHMENTS;
  if (depth === 'midground') return MIDGROUND_ATTACHMENTS;
  return DISTANCE_ATTACHMENTS;
}

function parcel(
  id: string,
  family: CivilizationSurfaceDistrictFamily,
  instance: number,
  depth: CivilizationSocketDepth,
  activationStage: CivilizationCityDevelopmentStage,
  capacity: number,
  genericFillerVariant: CivilizationSurfaceDistrictParcel['genericFillerVariant'],
  desktopTransform: CivilizationSurfaceDistrictTransform,
  mobileTransform: CivilizationSurfaceDistrictTransform,
): CivilizationSurfaceDistrictParcel {
  return {
    id,
    family,
    instance,
    depth,
    activationStage,
    capacity,
    genericFillerVariant,
    desktopTransform,
    mobileTransform,
    attachmentSockets: attachmentsForDepth(depth),
  };
}

/**
 * Stable parcel identities projected onto the actual Aurora Basin master plates.
 * Anchors mark the front of a ground plane, not a uniform screen-space row.
 * The foreground excavation, civic terrace and residential terrace take the
 * largest districts; inland pads and the existing harbor carry smaller work.
 * Later instances use smaller serviced terraces, cuts, and harbor extensions.
 * Three parcels per family cover the saved allocation witnesses and sampled
 * histories; this is not an exhaustive upper bound on reachable instances.
 * Coordinates correct the presentation only: family/instance IDs and residents
 * are unchanged. Artwork must retain these terraces, roads and shore contacts.
 */
export const CHRYSALIS_SURFACE_DISTRICT_PARCELS: readonly CivilizationSurfaceDistrictParcel[] = [
  // Three principal foreground landforms: center terrace, west pit, east terrace.
  parcel('civic-central', 'civic_core', 0, 'foreground', 1, 3, 'campus',
    { x: 48, y: 78, width: 25, scale: 1.04 }, { x: 55, y: 83, width: 28, scale: 0.9 }),
  parcel('industry-west', 'industrial_district', 0, 'midground', 1, 3, 'works',
    { x: 15, y: 44, width: 16, scale: 0.9 }, { x: 18, y: 65, width: 25, scale: 0.82 }),
  parcel('habitat-east', 'habitat_district', 0, 'foreground', 1, 3, 'garden',
    { x: 81, y: 71, width: 23, scale: 1.04 }, { x: 80, y: 66, width: 25, scale: 0.82 }),
  parcel('transit-west-gate', 'transit_terminus', 0, 'midground', 2, 3, 'terrace',
    { x: 28, y: 68, width: 8, presentationWidth: 10, scale: 0.68 }, { x: 21, y: 45, width: 21, scale: 0.7 }),
  parcel('archive-northwest', 'archive_quarter', 0, 'midground', 2, 3, 'campus',
    { x: 31, y: 46, width: 14, scale: 0.9 }, { x: 50, y: 46, width: 20, scale: 0.7 }),
  parcel('containment-west', 'containment_zone', 0, 'midground', 3, 3, 'campus',
    { x: 52, y: 47, width: 14, scale: 0.9 }, { x: 49, y: 65, width: 23, scale: 0.82 }),
  parcel('frontier-east', 'wilderness_margin', 0, 'midground', 3, 3, 'edge',
    { x: 68, y: 46, width: 12, scale: 0.84 }, { x: 78, y: 46, width: 23, scale: 0.7 }),
  parcel('frontier-northeast', 'wilderness_margin', 1, 'distance', 9, 3, 'edge',
    { x: 23, y: 28, width: 5, scale: 0.34 }, { x: 84, y: 31, width: 6.5, scale: 0.34 }),
  parcel('observatory-northwest', 'observatory_ridge', 0, 'midground', 4, 3, 'terrace',
    { x: 84, y: 45, width: 14, scale: 0.84 }, { x: 26, y: 29, width: 10, presentationWidth: 12, scale: 0.5 }),
  parcel('underworks-southwest', 'subsurface_works', 0, 'foreground', 5, 3, 'works',
    { x: 14, y: 75, width: 23, scale: 1.04 }, { x: 16, y: 81, width: 26, scale: 0.9 }),
  parcel('underworks-southeast', 'subsurface_works', 1, 'distance', 9, 3, 'works',
    { x: 53, y: 29, width: 5.5, scale: 0.34 }, { x: 52, y: 29, width: 6.5, scale: 0.34 }),
  // The harbor is on the upper-right shore, never the foreground ravine.
  parcel('coastal-east', 'coastal_margin', 0, 'distance', 5, 3, 'edge',
    { x: 88, y: 26, width: 10, scale: 0.68 }, { x: 88, y: 24, width: 9, scale: 0.5 }),
  parcel('civic-south', 'civic_core', 1, 'distance', 6, 3, 'campus',
    { x: 60, y: 29, width: 5.5, scale: 0.34 }, { x: 60, y: 29, width: 6.5, scale: 0.34 }),
  parcel('habitat-south', 'habitat_district', 1, 'distance', 6, 3, 'garden',
    { x: 67, y: 29, width: 5.5, scale: 0.34 }, { x: 68, y: 29, width: 6.5, scale: 0.34 }),
  parcel('habitat-far-east', 'habitat_district', 2, 'distance', 9, 3, 'garden',
    { x: 70, y: 65, width: 4.5, scale: 0.3 }, { x: 89, y: 42, width: 4.5, scale: 0.3 }),
  parcel('industry-southwest', 'industrial_district', 1, 'distance', 7, 3, 'works',
    { x: 39, y: 28, width: 5.5, scale: 0.34 }, { x: 36, y: 29, width: 6.5, scale: 0.34 }),
  parcel('archive-northeast', 'archive_quarter', 1, 'distance', 7, 3, 'campus',
    { x: 46, y: 29, width: 5.5, scale: 0.34 }, { x: 44, y: 29, width: 6.5, scale: 0.34 }),
  parcel('containment-southeast', 'containment_zone', 1, 'distance', 8, 3, 'campus',
    { x: 74, y: 29, width: 5.5, scale: 0.34 }, { x: 76, y: 29, width: 6.5, scale: 0.34 }),
  // The existing western ridge observatory and its adjoining serviced ledge.
  parcel('observatory-northeast', 'observatory_ridge', 1, 'distance', 9, 3, 'terrace',
    { x: 12, y: 17, width: 6, scale: 0.34 }, { x: 10, y: 17, width: 6, scale: 0.34 }),
  parcel('observatory-high-ridge', 'observatory_ridge', 2, 'distance', 9, 3, 'terrace',
    { x: 19, y: 17, width: 4.5, scale: 0.3 }, { x: 17, y: 17, width: 4.5, scale: 0.3 }),
  parcel('civic-northwest', 'civic_core', 2, 'distance', 9, 3, 'campus',
    { x: 61, y: 73, width: 4.5, scale: 0.3 }, { x: 71, y: 80, width: 4.5, scale: 0.3 }),
  parcel('transit-inland-ridge', 'transit_terminus', 1, 'distance', 9, 3, 'terrace',
    { x: 29, y: 28, width: 5, scale: 0.34 }, { x: 16, y: 24, width: 5, scale: 0.34 }),
  parcel('coastal-northeast', 'coastal_margin', 1, 'distance', 9, 3, 'edge',
    { x: 80, y: 25, width: 5, scale: 0.34 }, { x: 78, y: 23, width: 5, scale: 0.34 }),
  // Wooded western ledge above the lower service road, below the ridge station.
  // A distinct reserve address for legal histories opening Wilderness instance 2.
  parcel('frontier-west-ledge', 'wilderness_margin', 2, 'distance', 9, 3, 'edge',
    { x: 7, y: 26.5, width: 4, scale: 0.3 }, { x: 7, y: 27, width: 4.5, scale: 0.3 }),
  // Existing western service terraces, separated from the ridge reserve.
  parcel('industry-west-terrace', 'industrial_district', 2, 'distance', 9, 3, 'works',
    { x: 13, y: 27, width: 4, scale: 0.3 }, { x: 7, y: 34, width: 4.5, scale: 0.3 }),
  // Small courts inside the developed blocks, clear of the through avenues.
  parcel('archive-east-court', 'archive_quarter', 2, 'distance', 9, 3, 'campus',
    { x: 38.8, y: 44, width: 4, scale: 0.3 }, { x: 35, y: 43, width: 4.5, scale: 0.3 }),
  parcel('containment-east-court', 'containment_zone', 2, 'distance', 9, 3, 'campus',
    { x: 76, y: 44, width: 4, scale: 0.3 }, { x: 64, y: 39, width: 4.5, scale: 0.3 }),
  // Shaft head in a retained terrace cut, beside the lower utility route.
  parcel('underworks-central-cut', 'subsurface_works', 2, 'distance', 9, 3, 'works',
    { x: 36.7, y: 59, width: 3.5, scale: 0.3 }, { x: 32, y: 62, width: 4.5, scale: 0.3 }),
  // A platform alongside the existing transport spine, not on its carriageway.
  parcel('transit-central-platform', 'transit_terminus', 2, 'distance', 9, 3, 'terrace',
    { x: 60, y: 47.5, width: 4, scale: 0.3 }, { x: 34.1, y: 36, width: 4.5, scale: 0.3 }),
  // Eastern end of the harbor: retain its opaque approach, bearing deck and piles.
  { ...parcel('coastal-breakwater', 'coastal_margin', 2, 'distance', 9, 3, 'edge',
    { x: 95.5, y: 25.5, width: 4, scale: 0.3 }, { x: 95.5, y: 24, width: 4, scale: 0.3 }),
    shoreSupportDepth: 0.35 },
] as const;

export const CIVILIZATION_DISTRICT_DESIGN_CONTRACTS: Readonly<
  Record<CivilizationSurfaceDistrictFamily, CivilizationDistrictDesignContract>
> = {
  industrial_district: {
    family: 'industrial_district',
    genericForm: 'low fabrication halls, service courts, freight aprons, and exhaust infrastructure',
    chrysalisForm: 'black ceramic foundries with heated orange seams, violet pressure chambers, and shielded stacks',
    artifactIntegration: 'machines replace a production bay, crown a furnace hall, or join the freight and utility spine',
  },
  civic_core: {
    family: 'civic_core',
    genericForm: 'public halls, plazas, administration terraces, and ceremonial circulation',
    chrysalisForm: 'dark monumental halls gathered around orange-lit courts and controlled violet thresholds',
    artifactIntegration: 'public-facing devices occupy the central court, a flanking hall, or a civic roof lantern',
  },
  habitat_district: {
    family: 'habitat_district',
    genericForm: 'dense residential terraces, enclosed gardens, utilities, and neighborhood commons',
    chrysalisForm: 'charcoal habitat towers threaded by ember light, violet conservatories, and protected inner gardens',
    artifactIntegration: 'living systems become conservatories, utility hearts, garden landmarks, or inhabited annexes',
  },
  wilderness_margin: {
    family: 'wilderness_margin',
    genericForm: 'managed reserve, service paths, field stations, and a clear settlement edge',
    chrysalisForm: 'a dark cultivated frontier of blackglass shelters, ember beacons, and violet ecological wards',
    artifactIntegration: 'terrain-bound work occupies prepared clearings and keeps visible roots, pylons, or field supports',
  },
  subsurface_works: {
    family: 'subsurface_works',
    genericForm: 'excavation mouths, retaining walls, lifts, and buried utility exchanges',
    chrysalisForm: 'fortified black excavation portals with orange depth lights and violet sealed shafts',
    artifactIntegration: 'deep systems replace a shaft head, emerge through a retained cut, or connect below the utility deck',
  },
  observatory_ridge: {
    family: 'observatory_ridge',
    genericForm: 'terraced scientific campus with clear horizons, instrument pads, and shielded access',
    chrysalisForm: 'dark needle observatories on engineered terraces with ember apertures and violet sensing crowns',
    artifactIntegration: 'sensors and boundary devices occupy aligned pads without blocking neighboring sightlines',
  },
  transit_terminus: {
    family: 'transit_terminus',
    genericForm: 'intermodal station, freight court, guideways, and passenger concourse',
    chrysalisForm: 'black arched terminals, orange guideway light, violet transfer gates, and heavy logistics spines',
    artifactIntegration: 'transit Artifacts replace a gate or platform head and visibly connect to the city network',
  },
  archive_quarter: {
    family: 'archive_quarter',
    genericForm: 'repository halls, study courts, secure stacks, and memory infrastructure',
    chrysalisForm: 'charcoal reliquary towers, ember-lit vaults, violet memory wells, and quiet protected courts',
    artifactIntegration: 'memory devices become vault annexes, court monuments, roof instruments, or guarded stack cores',
  },
  coastal_margin: {
    family: 'coastal_margin',
    genericForm: 'reinforced waterfront, harbor works, utility piers, and flood-protected public decks',
    chrysalisForm: 'blackglass shore platforms on visible pylons with orange harbor light and violet tidal machinery',
    artifactIntegration: 'shoreline Artifacts sit on authored pylons or piers and never float unsupported over water',
  },
  containment_zone: {
    family: 'containment_zone',
    genericForm: 'buffered research enclave with berms, service rings, and controlled access',
    chrysalisForm: 'dark shielded compounds with orange warning seams, violet field cages, and deep setback courts',
    artifactIntegration: 'hazardous work occupies a field cell, sealed court, roof cage, or buried support annex',
  },
};

export function isCivilizationSurfaceDistrictFamily(
  placement: ArtifactPlacementFamily,
): placement is CivilizationSurfaceDistrictFamily {
  return (CIVILIZATION_SURFACE_DISTRICT_FAMILIES as readonly ArtifactPlacementFamily[])
    .includes(placement);
}

export function buildCanonicalSurfaceArtifactPlacementAssignments(): ReadonlyMap<
  ArtifactId,
  CivilizationSurfaceDistrictFamily
> {
  const assignments = new Map<ArtifactId, CivilizationSurfaceDistrictFamily>();
  const placementLoad = new Map<CivilizationSurfaceDistrictFamily, number>();

  for (const { id: artifactId } of ARTIFACT_CATALOG) {
    const profile = getArtifactManifestationProfile(artifactId);
    if (profile.nativeCameraScale !== 'surface') continue;
    const candidates = profile.compatiblePlacementFamilies.filter(
      (placement): placement is CivilizationSurfaceDistrictFamily => (
        isCivilizationSurfaceDistrictFamily(placement) &&
        (placementLoad.get(placement) ?? 0) < getCivilizationSurfaceDistrictCapacity(placement)
      ),
    );
    const selected = candidates
      .map((placement, preferenceIndex) => ({
        placement,
        score: (placementLoad.get(placement) ?? 0) * 2 + preferenceIndex * 0.72,
        preferenceIndex,
      }))
      .sort((left, right) => (
        left.score - right.score || left.preferenceIndex - right.preferenceIndex
      ))[0];
    if (!selected) continue;
    assignments.set(artifactId, selected.placement);
    placementLoad.set(selected.placement, (placementLoad.get(selected.placement) ?? 0) + 1);
  }

  return assignments;
}

const CANONICAL_SURFACE_PLACEMENTS = buildCanonicalSurfaceArtifactPlacementAssignments();

export function getCivilizationSurfaceDistrictParcelsForStage(
  stage: CivilizationCityDevelopmentStage,
): readonly CivilizationSurfaceDistrictParcel[] {
  return CHRYSALIS_SURFACE_DISTRICT_PARCELS.filter((district) => (
    district.activationStage <= stage
  ));
}

export function getCivilizationSurfaceDistrictParcelsForStageAndOccupancy(
  stage: CivilizationCityDevelopmentStage,
  occupancyCounts: Readonly<Partial<Record<CivilizationSurfaceDistrictFamily, number>>>,
): readonly CivilizationSurfaceDistrictParcel[] {
  const consumedCapacity = new Map<CivilizationSurfaceDistrictFamily, number>();
  return CHRYSALIS_SURFACE_DISTRICT_PARCELS.filter((district) => {
    const precedingCapacity = consumedCapacity.get(district.family) ?? 0;
    consumedCapacity.set(district.family, precedingCapacity + district.capacity);
    return district.activationStage <= stage ||
      (occupancyCounts[district.family] ?? 0) > precedingCapacity;
  });
}

export function getCivilizationSurfaceDistrictParcelsForFamily(
  family: CivilizationSurfaceDistrictFamily,
): readonly CivilizationSurfaceDistrictParcel[] {
  return CHRYSALIS_SURFACE_DISTRICT_PARCELS.filter((district) => district.family === family);
}

export function getCivilizationSurfaceDistrictParcelForMember(
  family: CivilizationSurfaceDistrictFamily,
  familyMemberIndex: number,
): { parcel: CivilizationSurfaceDistrictParcel; attachmentIndex: number } | null {
  let remainingIndex = familyMemberIndex;
  for (const parcelDefinition of getCivilizationSurfaceDistrictParcelsForFamily(family)) {
    if (remainingIndex < parcelDefinition.capacity) {
      return { parcel: parcelDefinition, attachmentIndex: remainingIndex };
    }
    remainingIndex -= parcelDefinition.capacity;
  }
  return null;
}

export function buildCivilizationSurfaceArtifactDistrictAssignments(): ReadonlyMap<
  ArtifactId,
  CivilizationSurfaceArtifactDistrictAssignment
> {
  const familyMembers = new Map<CivilizationSurfaceDistrictFamily, ArtifactId[]>();
  CANONICAL_SURFACE_PLACEMENTS.forEach((family, artifactId) => {
    const members = familyMembers.get(family) ?? [];
    members.push(artifactId);
    familyMembers.set(family, members);
  });

  const assignments = new Map<ArtifactId, CivilizationSurfaceArtifactDistrictAssignment>();
  familyMembers.forEach((members, family) => {
    members.forEach((artifactId, familyMemberIndex) => {
      const resolved = getCivilizationSurfaceDistrictParcelForMember(family, familyMemberIndex);
      if (!resolved) return;
      const attachment = resolved.parcel.attachmentSockets[resolved.attachmentIndex];
      if (!attachment) return;
      assignments.set(artifactId, {
        artifactId,
        placement: family,
        parcelId: resolved.parcel.id,
        parcelMemberIndex: resolved.attachmentIndex,
        attachmentSocketId: `${resolved.parcel.id}:${attachment.id}`,
      });
    });
  });
  return assignments;
}

export function getCivilizationSurfaceArtifactAttachmentTransform(
  family: CivilizationSurfaceDistrictFamily,
  familyMemberIndex: number,
  compact = false,
): {
  parcel: CivilizationSurfaceDistrictParcel;
  attachment: CivilizationDistrictAttachmentSocket;
  x: number;
  y: number;
  scale: number;
} | null {
  const direct = getCivilizationSurfaceDistrictParcelForMember(family, familyMemberIndex);
  const familyCapacity = getCivilizationSurfaceDistrictCapacity(family);
  // Reserve socket alternatives may outnumber simultaneously rendered Artifacts.
  // Reuse the authored physical attachment contract instead of inventing a loose
  // point outside the district when an alternate compatibility socket is requested.
  const resolved = direct ?? (
    familyCapacity > 0
      ? getCivilizationSurfaceDistrictParcelForMember(family, familyMemberIndex % familyCapacity)
      : null
  );
  if (!resolved) return null;
  const { parcel: parcelDefinition, attachmentIndex } = resolved;
  const attachment = parcelDefinition.attachmentSockets[attachmentIndex];
  if (!attachment) return null;
  const base = compact ? parcelDefinition.mobileTransform : parcelDefinition.desktopTransform;
  const offset = compact ? attachment.mobileOffset : attachment.desktopOffset;
  return {
    parcel: parcelDefinition,
    attachment,
    // Tiny background sockets retain three distinct attachment points inside
    // their own parcel; foreground modules keep the authored spacing.
    x: base.x + Math.sign(offset.x) * Math.min(Math.abs(offset.x), Math.max(1.65, base.width * 0.24)),
    y: base.y + Math.max(offset.y, -base.width * (parcelDefinition.depth === 'foreground' ? 0.76 : 0.68) + 0.1),
    scale: base.scale * offset.scale,
  };
}

export function getCivilizationSurfaceDistrictCapacity(
  family: CivilizationSurfaceDistrictFamily,
): number {
  return getCivilizationSurfaceDistrictParcelsForFamily(family)
    .reduce((total, parcelDefinition) => total + parcelDefinition.capacity, 0);
}

export function validateCivilizationSurfaceDistrictPlan(): readonly string[] {
  const errors: string[] = [];
  const parcelIds = new Set<string>();
  CHRYSALIS_SURFACE_DISTRICT_PARCELS.forEach((parcelDefinition) => {
    if (parcelIds.has(parcelDefinition.id)) errors.push(`Duplicate parcel ${parcelDefinition.id}`);
    parcelIds.add(parcelDefinition.id);
    if (parcelDefinition.capacity > parcelDefinition.attachmentSockets.length) {
      errors.push(`${parcelDefinition.id} exceeds authored attachment capacity`);
    }
    const physical = getArtifactPlacementPhysicalContract(parcelDefinition.family);
    if (physical.nativeScene !== 'surface') {
      errors.push(`${parcelDefinition.id} is not a Surface district`);
    }
  });

  const requiredByFamily = new Map<CivilizationSurfaceDistrictFamily, number>();
  CANONICAL_SURFACE_PLACEMENTS.forEach((family) => {
    requiredByFamily.set(family, (requiredByFamily.get(family) ?? 0) + 1);
  });
  for (const family of CIVILIZATION_SURFACE_DISTRICT_FAMILIES) {
    const required = requiredByFamily.get(family) ?? 0;
    const capacity = getCivilizationSurfaceDistrictCapacity(family);
    if (required > capacity) {
      errors.push(`${family} requires ${required} attachments but only ${capacity} are authored`);
    }
  }

  const assignments = buildCivilizationSurfaceArtifactDistrictAssignments();
  const surfaceArtifacts = ARTIFACT_CATALOG.filter(({ id }) => (
    getArtifactManifestationProfile(id).nativeCameraScale === 'surface'
  ));
  if (assignments.size !== surfaceArtifacts.length) {
    errors.push(`Assigned ${assignments.size} of ${surfaceArtifacts.length} Surface Artifacts`);
  }
  return errors;
}
