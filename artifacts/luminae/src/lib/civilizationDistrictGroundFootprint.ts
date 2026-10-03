import {
  CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS,
  getCivilizationDistrictPresentation,
  type CivilizationDistrictPresentationBounds,
} from '@/lib/civilizationDistrictPresentation';
import {
  CHRYSALIS_SURFACE_DISTRICT_PARCELS,
  type CivilizationSurfaceDistrictFamily,
} from '@/lib/civilizationSurfaceDistrictPlan';

export type CivilizationDistrictGroundPoint = readonly [x: number, y: number];
export const CIVILIZATION_DESKTOP_ROAD_SPANNING_PARCELS: readonly string[] = [
  'transit-west-gate',
  'archive-east-court',
];
export type CivilizationDistrictGroundSupport =
  | 'terrace'
  | 'excavation-platform'
  | 'ridge-platform'
  | 'station-platform'
  | 'road-spanning-deck'
  | 'piled-quay';

export interface CivilizationDistrictGroundFootprint {
  parcelId: string;
  family: CivilizationSurfaceDistrictFamily;
  instance: number;
  anchor: { x: number; y: number };
  fittedWidth: number;
  /** Authored floor clearance in full-scene percentages, not the tall artwork silhouette. */
  floor: readonly CivilizationDistrictGroundPoint[];
  floorBounds: CivilizationDistrictPresentationBounds;
  support: CivilizationDistrictGroundSupport;
  /** Water/piles below a quay are structural clearance, never additional solid floor. */
  waterAndPileBounds?: CivilizationDistrictPresentationBounds;
}

// Floors cover the existing low foundations, entrances and resident bays. Their
// upper edges are behind the front anchor, not at the square sprite's centre.
// These are clearance requirements for a background/occupant, not alpha masks
// and not evidence that an existing painted plate already provides bare land.
const FLOOR_PROFILES: Record<CivilizationSurfaceDistrictFamily, readonly CivilizationDistrictGroundPoint[]> = {
  civic_core: [[14, 62], [77, 62], [97, 78], [96, 92], [72, 100], [28, 100], [2, 88], [4, 74]],
  industrial_district: [[20, 60], [80, 60], [98, 77], [98, 95], [79, 100], [28, 100], [2, 87], [3, 73]],
  habitat_district: [[16, 58], [76, 58], [97, 73], [98, 91], [82, 100], [18, 100], [2, 88], [3, 73]],
  transit_terminus: [[14, 60], [78, 60], [98, 76], [96, 93], [70, 100], [20, 100], [2, 89], [2, 74]],
  archive_quarter: [[18, 60], [78, 60], [97, 75], [98, 92], [78, 100], [20, 100], [2, 89], [3, 74]],
  containment_zone: [[17, 58], [79, 58], [98, 77], [98, 94], [77, 100], [22, 100], [2, 89], [3, 73]],
  wilderness_margin: [[18, 58], [77, 58], [97, 77], [97, 93], [78, 100], [20, 100], [2, 88], [3, 73]],
  observatory_ridge: [[18, 58], [77, 58], [97, 76], [98, 93], [78, 100], [20, 100], [2, 89], [3, 74]],
  subsurface_works: [[15, 54], [77, 54], [98, 75], [98, 94], [77, 100], [20, 100], [2, 88], [2, 72]],
  // The front notch remains open to water/outfalls; the two quay wings bear load.
  coastal_margin: [[20, 68], [76, 68], [98, 82], [96, 94], [80, 100], [74, 92], [28, 92], [18, 100], [2, 94], [2, 80]],
};

function boundsOf(points: readonly CivilizationDistrictGroundPoint[]): CivilizationDistrictPresentationBounds {
  return {
    minX: Math.min(...points.map(([x]) => x)),
    maxX: Math.max(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxY: Math.max(...points.map(([, y]) => y)),
  };
}

/** Fixed parcel floor shared by specialist and future civilian occupants. No allocation or identity changes. */
export function getCivilizationDistrictGroundFootprint(
  parcelId: string,
  compact = false,
  aspectRatio: number = compact
    ? CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS.compact
    : CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS.desktop,
): CivilizationDistrictGroundFootprint | undefined {
  const parcel = CHRYSALIS_SURFACE_DISTRICT_PARCELS.find(({ id }) => id === parcelId);
  if (!parcel) return undefined;
  const fit = getCivilizationDistrictPresentation(parcelId, compact, aspectRatio)!;
  const transform = compact ? parcel.mobileTransform : parcel.desktopTransform;
  const floor = FLOOR_PROFILES[parcel.family].map(([x, y]): CivilizationDistrictGroundPoint => [
    transform.x + (x / 100 - 0.5) * fit.width,
    transform.y + (y / 100 - 0.94) * fit.width * aspectRatio,
  ]);
  const floorBounds = boundsOf(floor);
  const support: CivilizationDistrictGroundSupport = parcel.family === 'coastal_margin'
    ? 'piled-quay'
    : CIVILIZATION_DESKTOP_ROAD_SPANNING_PARCELS.includes(parcel.id) && !compact
      // Both fixed addresses cross diagonal roads in the desktop reference.
      // Keep the roads beneath bearing decks, regardless of parcel occupant.
      ? 'road-spanning-deck'
      : parcel.family === 'transit_terminus'
        ? 'station-platform'
        : parcel.family === 'subsurface_works'
          ? 'excavation-platform'
          : parcel.family === 'observatory_ridge'
            ? 'ridge-platform'
            : 'terrace';
  return {
    parcelId,
    family: parcel.family,
    instance: parcel.instance,
    anchor: { x: transform.x, y: transform.y },
    fittedWidth: fit.width,
    floor,
    floorBounds,
    support,
    ...(support === 'piled-quay' ? {
      waterAndPileBounds: {
        minX: floorBounds.minX,
        maxX: floorBounds.maxX,
        minY: floorBounds.maxY,
        maxY: fit.bounds.maxY,
      },
    } : {}),
  };
}
