import type {
  ArtifactPlacementFamily,
  CivilizationCameraScale,
  CivilizationDyadId,
} from '@workspace/game-types';
import chrysalisSurfaceArchiveUrl from '@/assets/civilization/manifestations/chrysalis/surface-archive-v1.avif';
import chrysalisSurfaceCivicUrl from '@/assets/civilization/manifestations/chrysalis/surface-civic-v1.avif';
import chrysalisSurfaceCoastalUrl from '@/assets/civilization/manifestations/chrysalis/surface-coastal-v1.avif';
import chrysalisSurfaceContainmentUrl from '@/assets/civilization/manifestations/chrysalis/surface-containment-v1.avif';
import chrysalisSurfaceHabitatUrl from '@/assets/civilization/manifestations/chrysalis/surface-habitat-v1.avif';
import chrysalisSurfaceIndustrialUrl from '@/assets/civilization/manifestations/chrysalis/surface-industrial-v1.avif';
import chrysalisSurfaceObservatoryUrl from '@/assets/civilization/manifestations/chrysalis/surface-observatory-v1.avif';
import chrysalisSurfaceSubsurfaceUrl from '@/assets/civilization/manifestations/chrysalis/surface-subsurface-v1.avif';
import chrysalisSurfaceTransitUrl from '@/assets/civilization/manifestations/chrysalis/surface-transit-v1.avif';
import chrysalisSurfaceWildernessUrl from '@/assets/civilization/manifestations/chrysalis/surface-wilderness-v1.avif';
import chrysalisSurfaceDistrictVariantsUrl from '@/assets/civilization/manifestations/chrysalis/surface-district-variants-v2.webp';
import chrysalisOrbitAtmosphereUrl from '@/assets/civilization/manifestations/chrysalis/orbit-atmosphere-v1.avif';
import chrysalisOrbitHabitatUrl from '@/assets/civilization/manifestations/chrysalis/orbit-habitat-v1.avif';
import chrysalisOrbitHighUrl from '@/assets/civilization/manifestations/chrysalis/orbit-high-v1.avif';
import chrysalisOrbitLowUrl from '@/assets/civilization/manifestations/chrysalis/orbit-low-v1.avif';
import chrysalisOrbitMoonwardUrl from '@/assets/civilization/manifestations/chrysalis/orbit-moonward-v1.avif';
import chrysalisOrbitYardUrl from '@/assets/civilization/manifestations/chrysalis/orbit-yard-v1.avif';
import chrysalisStellarDistributedUrl from '@/assets/civilization/manifestations/chrysalis/stellar-distributed-v1.webp';
import chrysalisStellarHabitableUrl from '@/assets/civilization/manifestations/chrysalis/stellar-habitable-v1.webp';
import chrysalisStellarHeliopauseUrl from '@/assets/civilization/manifestations/chrysalis/stellar-heliopause-v1.webp';
import chrysalisStellarInnerUrl from '@/assets/civilization/manifestations/chrysalis/stellar-inner-v1.webp';
import chrysalisStellarLagrangeUrl from '@/assets/civilization/manifestations/chrysalis/stellar-lagrange-v1.webp';
import chrysalisStellarOuterUrl from '@/assets/civilization/manifestations/chrysalis/stellar-outer-v1.webp';
import chrysalisGalaxyCorewardUrl from '@/assets/civilization/manifestations/chrysalis/galaxy-coreward-v1.avif';
import chrysalisGalaxyDarkSectorUrl from '@/assets/civilization/manifestations/chrysalis/galaxy-dark-sector-v1.avif';
import chrysalisGalaxyDistributedUrl from '@/assets/civilization/manifestations/chrysalis/galaxy-distributed-v1.avif';
import chrysalisGalaxyInterarmUrl from '@/assets/civilization/manifestations/chrysalis/galaxy-interarm-v1.avif';
import chrysalisGalaxyRimwardUrl from '@/assets/civilization/manifestations/chrysalis/galaxy-rimward-v1.avif';
import chrysalisGalaxySpiralArmUrl from '@/assets/civilization/manifestations/chrysalis/galaxy-spiral-arm-v1.avif';
import vortexSurfaceAtlasUrl from '@/assets/civilization/manifestations/vortex/surface-district-atlas-v1.avif';
import vortexOrbitAtlasUrl from '@/assets/civilization/manifestations/vortex/orbit-facility-atlas-v1.avif';
import vortexStellarAtlasUrl from '@/assets/civilization/manifestations/vortex/stellar-cluster-atlas-v1.webp';
import vortexGalaxyAtlasUrl from '@/assets/civilization/manifestations/vortex/galaxy-region-atlas-v2.webp';
import fluxSurfaceAtlasUrl from '@/assets/civilization/manifestations/flux/surface-district-atlas-v1.avif';
import fluxOrbitAtlasUrl from '@/assets/civilization/manifestations/flux/orbit-facility-atlas-v1.avif';
import fluxStellarAtlasUrl from '@/assets/civilization/manifestations/flux/stellar-cluster-atlas-v1.webp';
import fluxGalaxyAtlasUrl from '@/assets/civilization/manifestations/flux/galaxy-region-atlas-v2.webp';
import bloomSurfaceAtlasUrl from '@/assets/civilization/manifestations/bloom/surface-district-atlas-v1.avif';
import bloomOrbitAtlasUrl from '@/assets/civilization/manifestations/bloom/orbit-facility-atlas-v1.avif';
import bloomStellarAtlasUrl from '@/assets/civilization/manifestations/bloom/stellar-cluster-atlas-v1.webp';
import bloomGalaxyAtlasUrl from '@/assets/civilization/manifestations/bloom/galaxy-region-atlas-v2.webp';
import orbitSurfaceAtlasUrl from '@/assets/civilization/manifestations/orbit/surface-district-atlas-v1.avif';
import orbitOrbitAtlasUrl from '@/assets/civilization/manifestations/orbit/orbit-facility-atlas-v1.avif';
import orbitStellarAtlasUrl from '@/assets/civilization/manifestations/orbit/stellar-cluster-atlas-v1.webp';
import orbitGalaxyAtlasUrl from '@/assets/civilization/manifestations/orbit/galaxy-region-atlas-v2.webp';
import canopySurfaceAtlasUrl from '@/assets/civilization/manifestations/canopy/surface-district-atlas-v1.avif';
import canopyOrbitAtlasUrl from '@/assets/civilization/manifestations/canopy/orbit-facility-atlas-v1.avif';
import canopyStellarAtlasUrl from '@/assets/civilization/manifestations/canopy/stellar-cluster-atlas-v1.webp';
import canopyGalaxyAtlasUrl from '@/assets/civilization/manifestations/canopy/galaxy-region-atlas-v2.webp';
import eclipseSurfaceAtlasUrl from '@/assets/civilization/manifestations/eclipse/surface-district-atlas-v1.avif';
import eclipseOrbitAtlasUrl from '@/assets/civilization/manifestations/eclipse/orbit-facility-atlas-v1.avif';
import eclipseStellarAtlasUrl from '@/assets/civilization/manifestations/eclipse/stellar-cluster-atlas-v1.webp';
import eclipseGalaxyAtlasUrl from '@/assets/civilization/manifestations/eclipse/galaxy-region-atlas-v2.webp';
import lineageSurfaceAtlasUrl from '@/assets/civilization/manifestations/lineage/surface-district-atlas-v1.avif';
import lineageOrbitAtlasUrl from '@/assets/civilization/manifestations/lineage/orbit-facility-atlas-v1.avif';
import lineageStellarAtlasUrl from '@/assets/civilization/manifestations/lineage/stellar-cluster-atlas-v1.webp';
import lineageGalaxyAtlasUrl from '@/assets/civilization/manifestations/lineage/galaxy-region-atlas-v3.webp';
import echoSurfaceAtlasUrl from '@/assets/civilization/manifestations/echo/surface-district-atlas-v1.avif';
import echoOrbitAtlasUrl from '@/assets/civilization/manifestations/echo/orbit-facility-atlas-v1.avif';
import echoStellarAtlasUrl from '@/assets/civilization/manifestations/echo/stellar-cluster-atlas-v1.webp';
import echoGalaxyAtlasUrl from '@/assets/civilization/manifestations/echo/galaxy-region-atlas-v2.webp';
import sporeSurfaceAtlasUrl from '@/assets/civilization/manifestations/spore/surface-district-atlas-v1.avif';
import sporeOrbitAtlasUrl from '@/assets/civilization/manifestations/spore/orbit-facility-atlas-v1.avif';
import sporeStellarAtlasUrl from '@/assets/civilization/manifestations/spore/stellar-cluster-atlas-v1.webp';
import sporeGalaxyAtlasUrl from '@/assets/civilization/manifestations/spore/galaxy-region-atlas-v2.webp';
import neutralSurfaceSettlementAtlasUrl from '@/assets/civilization/manifestations/neutral/surface-settlement-atlas-v2.webp';
import neutralOrbitFacilityAtlasUrl from '@/assets/civilization/manifestations/neutral/orbit-facility-atlas-v1.avif';
import neutralStellarClusterAtlasUrl from '@/assets/civilization/manifestations/neutral/stellar-cluster-atlas-alpha-v1.png';
import neutralGalaxyRegionAtlasUrl from '@/assets/civilization/manifestations/neutral/galaxy-region-atlas-v1.avif';
import t1eArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t1e-artifact-atlas-v1.webp';
import t1oArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t1o-artifact-atlas-v1.webp';
import t1pArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t1p-artifact-atlas-v1.webp';
import t1rArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t1r-artifact-atlas-v1.webp';
import t1sArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t1s-artifact-atlas-v1.webp';
import t2eArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t2e-artifact-atlas-v4.webp';
import t2oArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t2o-artifact-atlas-v4.webp';
import t2pArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t2p-artifact-atlas-v4.webp';
import t2rArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t2r-artifact-atlas-v4.webp';
import t2sArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t2s-artifact-atlas-v4.webp';
import t3eArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t3e-artifact-atlas-v4.webp';
import t3oArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t3o-artifact-atlas-v3.webp';
import t3pArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t3p-artifact-atlas-v2.webp';
import t3rArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t3r-artifact-atlas-v4.webp';
import t3sArtifactAtlasUrl from '@/assets/civilization/manifestations/artifacts/authored/t3s-artifact-atlas-v3.webp';

export interface CivilizationManifestationArt {
  src: string;
  anchor: {
    x: number;
    y: number;
  };
  scale: number;
  aspectRatio?: number;
  atlas?: {
    columns: number;
    rows: number;
    column: number;
    row: number;
  };
}

export interface CivilizationStandaloneArtifactArt {
  src: string;
  scale: number;
  cellAspectRatio: number;
  /** Normalized cell height where the physical structure meets its substrate. */
  groundLine: number;
  atlas?: {
    columns: number;
    rows: number;
    column: number;
    row: number;
  };
}

export const DEFAULT_CIVILIZATION_ARTIFACT_RENDERING_ID = 'canonical';

export type CivilizationArtifactRenderingAvailability = 'included' | 'unlockable' | 'premium';

export interface CivilizationArtifactRenderingDescriptor {
  id: string;
  displayName: string;
  availability: CivilizationArtifactRenderingAvailability;
  art: CivilizationStandaloneArtifactArt;
}

type SceneManifestationArt = Partial<Record<ArtifactPlacementFamily, CivilizationManifestationArt>>;

const CHRYSALIS_SURFACE_ART: SceneManifestationArt = {
  industrial_district: {
    src: chrysalisSurfaceIndustrialUrl,
    anchor: { x: 27, y: 74 },
    scale: 0.9,
  },
  civic_core: {
    src: chrysalisSurfaceCivicUrl,
    anchor: { x: 47, y: 70 },
    scale: 0.78,
  },
  habitat_district: {
    src: chrysalisSurfaceHabitatUrl,
    anchor: { x: 70, y: 76 },
    scale: 0.86,
  },
  wilderness_margin: {
    src: chrysalisSurfaceWildernessUrl,
    anchor: { x: 83, y: 79 },
    scale: 0.88,
  },
  subsurface_works: {
    src: chrysalisSurfaceSubsurfaceUrl,
    anchor: { x: 36, y: 86 },
    scale: 1,
  },
  observatory_ridge: {
    src: chrysalisSurfaceObservatoryUrl,
    anchor: { x: 79, y: 51 },
    scale: 0.63,
  },
  transit_terminus: {
    src: chrysalisSurfaceTransitUrl,
    anchor: { x: 16, y: 70 },
    scale: 0.78,
  },
  archive_quarter: {
    src: chrysalisSurfaceArchiveUrl,
    anchor: { x: 64, y: 56 },
    scale: 0.66,
  },
  coastal_margin: {
    src: chrysalisSurfaceCoastalUrl,
    anchor: { x: 88, y: 70 },
    scale: 0.78,
  },
  containment_zone: {
    src: chrysalisSurfaceContainmentUrl,
    anchor: { x: 13, y: 82 },
    scale: 0.92,
  },
};

const CHRYSALIS_SURFACE_SECONDARY_VARIANTS: Partial<Record<
  ArtifactPlacementFamily,
  CivilizationManifestationArt['atlas']
>> = {
  civic_core: { columns: 3, rows: 2, column: 0, row: 0 },
  industrial_district: { columns: 3, rows: 2, column: 1, row: 0 },
  habitat_district: { columns: 3, rows: 2, column: 2, row: 0 },
  archive_quarter: { columns: 3, rows: 2, column: 0, row: 1 },
  containment_zone: { columns: 3, rows: 2, column: 1, row: 1 },
  observatory_ridge: { columns: 3, rows: 2, column: 2, row: 1 },
};

const CHRYSALIS_ORBIT_ART: SceneManifestationArt = {
  low_orbit: {
    src: chrysalisOrbitLowUrl,
    anchor: { x: 33, y: 60 },
    scale: 0.72,
  },
  high_orbit: {
    src: chrysalisOrbitHighUrl,
    anchor: { x: 66, y: 27 },
    scale: 0.56,
  },
  orbital_yard: {
    src: chrysalisOrbitYardUrl,
    anchor: { x: 76, y: 57 },
    scale: 0.82,
  },
  habitat_orbit: {
    src: chrysalisOrbitHabitatUrl,
    anchor: { x: 59, y: 69 },
    scale: 0.78,
  },
  moonward_lane: {
    src: chrysalisOrbitMoonwardUrl,
    anchor: { x: 26, y: 31 },
    scale: 0.6,
  },
  atmosphere_edge: {
    src: chrysalisOrbitAtmosphereUrl,
    anchor: { x: 45, y: 78 },
    scale: 0.88,
  },
};

const CHRYSALIS_STELLAR_ART: SceneManifestationArt = {
  inner_system: {
    src: chrysalisStellarInnerUrl,
    anchor: { x: 49, y: 61 },
    scale: 0.58,
  },
  habitable_orbits: {
    src: chrysalisStellarHabitableUrl,
    anchor: { x: 75, y: 53 },
    scale: 0.56,
  },
  lagrange_network: {
    src: chrysalisStellarLagrangeUrl,
    anchor: { x: 68, y: 31 },
    scale: 0.48,
  },
  outer_system: {
    src: chrysalisStellarOuterUrl,
    anchor: { x: 23, y: 64 },
    scale: 0.58,
  },
  heliopause: {
    src: chrysalisStellarHeliopauseUrl,
    anchor: { x: 22, y: 30 },
    scale: 0.48,
  },
  distributed_systems: {
    src: chrysalisStellarDistributedUrl,
    anchor: { x: 57, y: 75 },
    scale: 0.58,
  },
};

const CHRYSALIS_GALAXY_ART: SceneManifestationArt = {
  spiral_arm: {
    src: chrysalisGalaxySpiralArmUrl,
    anchor: { x: 58, y: 53 },
    scale: 0.7,
  },
  coreward_region: {
    src: chrysalisGalaxyCorewardUrl,
    anchor: { x: 50, y: 43 },
    scale: 0.56,
  },
  rimward_region: {
    src: chrysalisGalaxyRimwardUrl,
    anchor: { x: 74, y: 66 },
    scale: 0.58,
  },
  dark_sector: {
    src: chrysalisGalaxyDarkSectorUrl,
    anchor: { x: 27, y: 67 },
    scale: 0.58,
  },
  distributed_clusters: {
    src: chrysalisGalaxyDistributedUrl,
    anchor: { x: 59, y: 72 },
    scale: 0.6,
  },
  interarm_void: {
    src: chrysalisGalaxyInterarmUrl,
    anchor: { x: 76, y: 33 },
    scale: 0.52,
  },
};

function buildAtlasArt(
  src: string,
  columns: number,
  rows: number,
  placements: readonly ArtifactPlacementFamily[],
  composition: SceneManifestationArt,
): SceneManifestationArt {
  return Object.fromEntries(placements.map((placement, index) => {
    const authoredComposition = composition[placement];
    if (!authoredComposition) return [placement, undefined];
    return [placement, {
      ...authoredComposition,
      src,
      aspectRatio: 1,
      atlas: {
        columns,
        rows,
        column: index % columns,
        row: Math.floor(index / columns),
      },
    } satisfies CivilizationManifestationArt];
  })) as SceneManifestationArt;
}

const SURFACE_PLACEMENTS: readonly ArtifactPlacementFamily[] = [
  'industrial_district', 'civic_core', 'habitat_district', 'wilderness_margin', 'subsurface_works',
  'observatory_ridge', 'transit_terminus', 'archive_quarter', 'coastal_margin', 'containment_zone',
];

const NEUTRAL_SURFACE_PLACEMENTS: readonly ArtifactPlacementFamily[] = [
  'civic_core', 'industrial_district', 'habitat_district', 'transit_terminus', 'archive_quarter',
  'observatory_ridge', 'coastal_margin', 'wilderness_margin', 'subsurface_works', 'containment_zone',
];

const NEUTRAL_SURFACE_ART = buildAtlasArt(
  neutralSurfaceSettlementAtlasUrl,
  5,
  2,
  NEUTRAL_SURFACE_PLACEMENTS,
  CHRYSALIS_SURFACE_ART,
);

const ORBIT_PLACEMENTS: readonly ArtifactPlacementFamily[] = [
  'low_orbit', 'high_orbit', 'orbital_yard', 'habitat_orbit', 'moonward_lane', 'atmosphere_edge',
];

const STELLAR_PLACEMENTS: readonly ArtifactPlacementFamily[] = [
  'inner_system', 'habitable_orbits', 'lagrange_network', 'outer_system', 'heliopause', 'distributed_systems',
];

const GALAXY_PLACEMENTS: readonly ArtifactPlacementFamily[] = [
  'spiral_arm', 'coreward_region', 'rimward_region', 'dark_sector', 'distributed_clusters', 'interarm_void',
];

const NEUTRAL_STELLAR_PLACEMENTS: readonly ArtifactPlacementFamily[] = [
  'inner_system', 'habitable_orbits', 'lagrange_network', 'outer_system', 'distributed_systems', 'heliopause',
];

const NEUTRAL_SETTLEMENT_ART: Partial<Record<CivilizationCameraScale, SceneManifestationArt>> = {
  surface: NEUTRAL_SURFACE_ART,
  orbit: buildAtlasArt(
    neutralOrbitFacilityAtlasUrl,
    3,
    2,
    ORBIT_PLACEMENTS,
    CHRYSALIS_ORBIT_ART,
  ),
  stellar: buildAtlasArt(
    neutralStellarClusterAtlasUrl,
    3,
    2,
    NEUTRAL_STELLAR_PLACEMENTS,
    CHRYSALIS_STELLAR_ART,
  ),
  galaxy: buildAtlasArt(
    neutralGalaxyRegionAtlasUrl,
    3,
    2,
    GALAXY_PLACEMENTS,
    CHRYSALIS_GALAXY_ART,
  ),
};

type AtlasUrls = Record<CivilizationCameraScale, string>;
type AtlasDyadId = Exclude<CivilizationDyadId, 'chrysalis'>;

type PlacementAnchorMap = Partial<Record<ArtifactPlacementFamily, { x: number; y: number }>>;

type SceneAnchorMaps = Partial<Record<CivilizationCameraScale, PlacementAnchorMap>>;

/**
 * Each background has its own physical geography. These anchors attach the
 * shared placement families to visible terrain, orbital lanes, celestial
 * bodies, and galactic regions instead of projecting one composition over all
 * ten dyads. Member offsets then distribute individual Artifacts around the
 * authored host without changing their identity or position in Scan.
 */
const ANCHORS_BY_DYAD: Record<AtlasDyadId, SceneAnchorMaps> = {
  vortex: {
    surface: {
      industrial_district: { x: 26, y: 74 }, civic_core: { x: 48, y: 67 },
      habitat_district: { x: 69, y: 75 }, wilderness_margin: { x: 84, y: 80 },
      subsurface_works: { x: 35, y: 88 }, observatory_ridge: { x: 77, y: 52 },
      transit_terminus: { x: 14, y: 69 }, archive_quarter: { x: 61, y: 57 },
      coastal_margin: { x: 88, y: 68 }, containment_zone: { x: 11, y: 83 },
    },
    orbit: {
      low_orbit: { x: 42, y: 65 }, high_orbit: { x: 65, y: 18 },
      orbital_yard: { x: 14, y: 61 }, habitat_orbit: { x: 81, y: 52 },
      moonward_lane: { x: 78, y: 18 }, atmosphere_edge: { x: 56, y: 27 },
    },
    stellar: {
      inner_system: { x: 44, y: 48 }, habitable_orbits: { x: 69, y: 61 },
      lagrange_network: { x: 63, y: 43 }, outer_system: { x: 88, y: 22 },
      heliopause: { x: 12, y: 25 }, distributed_systems: { x: 32, y: 73 },
    },
    galaxy: {
      spiral_arm: { x: 62, y: 55 }, coreward_region: { x: 49, y: 47 },
      rimward_region: { x: 81, y: 68 }, dark_sector: { x: 21, y: 72 },
      distributed_clusters: { x: 70, y: 29 }, interarm_void: { x: 29, y: 31 },
    },
  },
  flux: {
    surface: {
      industrial_district: { x: 68, y: 72 }, civic_core: { x: 52, y: 65 },
      habitat_district: { x: 80, y: 76 }, wilderness_margin: { x: 20, y: 80 },
      subsurface_works: { x: 38, y: 88 }, observatory_ridge: { x: 78, y: 51 },
      transit_terminus: { x: 24, y: 67 }, archive_quarter: { x: 60, y: 55 },
      coastal_margin: { x: 45, y: 83 }, containment_zone: { x: 12, y: 84 },
    },
    orbit: {
      low_orbit: { x: 45, y: 42 }, high_orbit: { x: 20, y: 18 },
      orbital_yard: { x: 67, y: 62 }, habitat_orbit: { x: 86, y: 35 },
      moonward_lane: { x: 82, y: 12 }, atmosphere_edge: { x: 55, y: 29 },
    },
    stellar: {
      inner_system: { x: 44, y: 30 }, habitable_orbits: { x: 72, y: 27 },
      lagrange_network: { x: 57, y: 36 }, outer_system: { x: 88, y: 20 },
      heliopause: { x: 12, y: 35 }, distributed_systems: { x: 60, y: 67 },
    },
    galaxy: {
      spiral_arm: { x: 61, y: 54 }, coreward_region: { x: 50, y: 47 },
      rimward_region: { x: 82, y: 65 }, dark_sector: { x: 20, y: 72 },
      distributed_clusters: { x: 68, y: 27 }, interarm_void: { x: 29, y: 31 },
    },
  },
  bloom: {
    surface: {
      industrial_district: { x: 69, y: 67 }, civic_core: { x: 50, y: 65 },
      habitat_district: { x: 76, y: 73 }, wilderness_margin: { x: 88, y: 82 },
      subsurface_works: { x: 28, y: 88 }, observatory_ridge: { x: 79, y: 51 },
      transit_terminus: { x: 18, y: 69 }, archive_quarter: { x: 58, y: 56 },
      coastal_margin: { x: 43, y: 82 }, containment_zone: { x: 11, y: 83 },
    },
    orbit: {
      low_orbit: { x: 35, y: 65 }, high_orbit: { x: 82, y: 22 },
      orbital_yard: { x: 75, y: 62 }, habitat_orbit: { x: 87, y: 48 },
      moonward_lane: { x: 13, y: 18 }, atmosphere_edge: { x: 55, y: 30 },
    },
    stellar: {
      inner_system: { x: 31, y: 30 }, habitable_orbits: { x: 68, y: 51 },
      lagrange_network: { x: 45, y: 35 }, outer_system: { x: 88, y: 71 },
      heliopause: { x: 88, y: 18 }, distributed_systems: { x: 57, y: 70 },
    },
    galaxy: {
      spiral_arm: { x: 47, y: 56 }, coreward_region: { x: 62, y: 48 },
      rimward_region: { x: 29, y: 67 }, dark_sector: { x: 83, y: 74 },
      distributed_clusters: { x: 73, y: 30 }, interarm_void: { x: 32, y: 32 },
    },
  },
  orbit: {
    surface: {
      industrial_district: { x: 25, y: 74 }, civic_core: { x: 58, y: 62 },
      habitat_district: { x: 79, y: 59 }, wilderness_margin: { x: 89, y: 80 },
      subsurface_works: { x: 30, y: 87 }, observatory_ridge: { x: 78, y: 48 },
      transit_terminus: { x: 16, y: 67 }, archive_quarter: { x: 51, y: 54 },
      coastal_margin: { x: 72, y: 68 }, containment_zone: { x: 10, y: 83 },
    },
    orbit: {
      low_orbit: { x: 38, y: 70 }, high_orbit: { x: 81, y: 18 },
      orbital_yard: { x: 84, y: 54 }, habitat_orbit: { x: 90, y: 37 },
      moonward_lane: { x: 87, y: 12 }, atmosphere_edge: { x: 56, y: 40 },
    },
    stellar: {
      inner_system: { x: 37, y: 31 }, habitable_orbits: { x: 80, y: 59 },
      lagrange_network: { x: 57, y: 40 }, outer_system: { x: 90, y: 25 },
      heliopause: { x: 10, y: 77 }, distributed_systems: { x: 62, y: 72 },
    },
    galaxy: {
      spiral_arm: { x: 55, y: 51 }, coreward_region: { x: 63, y: 42 },
      rimward_region: { x: 26, y: 67 }, dark_sector: { x: 86, y: 71 },
      distributed_clusters: { x: 73, y: 27 }, interarm_void: { x: 36, y: 25 },
    },
  },
  canopy: {
    surface: {
      industrial_district: { x: 22, y: 74 }, civic_core: { x: 47, y: 65 },
      habitat_district: { x: 72, y: 66 }, wilderness_margin: { x: 87, y: 81 },
      subsurface_works: { x: 32, y: 88 }, observatory_ridge: { x: 78, y: 50 },
      transit_terminus: { x: 15, y: 68 }, archive_quarter: { x: 60, y: 56 },
      coastal_margin: { x: 45, y: 82 }, containment_zone: { x: 10, y: 83 },
    },
    orbit: {
      low_orbit: { x: 68, y: 60 }, high_orbit: { x: 82, y: 23 },
      orbital_yard: { x: 90, y: 67 }, habitat_orbit: { x: 87, y: 48 },
      moonward_lane: { x: 90, y: 10 }, atmosphere_edge: { x: 67, y: 36 },
    },
    stellar: {
      inner_system: { x: 50, y: 53 }, habitable_orbits: { x: 77, y: 59 },
      lagrange_network: { x: 64, y: 43 }, outer_system: { x: 19, y: 20 },
      heliopause: { x: 90, y: 18 }, distributed_systems: { x: 31, y: 72 },
    },
    galaxy: {
      spiral_arm: { x: 53, y: 54 }, coreward_region: { x: 41, y: 54 },
      rimward_region: { x: 76, y: 70 }, dark_sector: { x: 17, y: 73 },
      distributed_clusters: { x: 31, y: 27 }, interarm_void: { x: 78, y: 28 },
    },
  },
  eclipse: {
    surface: {
      industrial_district: { x: 28, y: 74 }, civic_core: { x: 51, y: 66 },
      habitat_district: { x: 73, y: 71 }, wilderness_margin: { x: 86, y: 81 },
      subsurface_works: { x: 34, y: 87 }, observatory_ridge: { x: 78, y: 49 },
      transit_terminus: { x: 16, y: 68 }, archive_quarter: { x: 61, y: 55 },
      coastal_margin: { x: 84, y: 70 }, containment_zone: { x: 12, y: 82 },
    },
    orbit: {
      low_orbit: { x: 73, y: 60 }, high_orbit: { x: 87, y: 29 },
      orbital_yard: { x: 90, y: 68 }, habitat_orbit: { x: 80, y: 47 },
      moonward_lane: { x: 87, y: 13 }, atmosphere_edge: { x: 72, y: 36 },
    },
    stellar: {
      inner_system: { x: 50, y: 39 }, habitable_orbits: { x: 29, y: 62 },
      lagrange_network: { x: 66, y: 42 }, outer_system: { x: 88, y: 35 },
      heliopause: { x: 10, y: 21 }, distributed_systems: { x: 72, y: 70 },
    },
    galaxy: {
      spiral_arm: { x: 58, y: 54 }, coreward_region: { x: 45, y: 45 },
      rimward_region: { x: 78, y: 67 }, dark_sector: { x: 20, y: 71 },
      distributed_clusters: { x: 61, y: 28 }, interarm_void: { x: 24, y: 30 },
    },
  },
  lineage: {
    surface: {
      industrial_district: { x: 24, y: 74 }, civic_core: { x: 58, y: 65 },
      habitat_district: { x: 79, y: 57 }, wilderness_margin: { x: 88, y: 81 },
      subsurface_works: { x: 30, y: 88 }, observatory_ridge: { x: 78, y: 47 },
      transit_terminus: { x: 15, y: 68 }, archive_quarter: { x: 61, y: 53 },
      coastal_margin: { x: 73, y: 69 }, containment_zone: { x: 10, y: 83 },
    },
    orbit: {
      low_orbit: { x: 69, y: 62 }, high_orbit: { x: 88, y: 24 },
      orbital_yard: { x: 89, y: 63 }, habitat_orbit: { x: 82, y: 47 },
      moonward_lane: { x: 84, y: 12 }, atmosphere_edge: { x: 67, y: 36 },
    },
    stellar: {
      inner_system: { x: 50, y: 40 }, habitable_orbits: { x: 75, y: 67 },
      lagrange_network: { x: 62, y: 49 }, outer_system: { x: 10, y: 68 },
      heliopause: { x: 90, y: 17 }, distributed_systems: { x: 35, y: 71 },
    },
    galaxy: {
      spiral_arm: { x: 51, y: 56 }, coreward_region: { x: 62, y: 46 },
      rimward_region: { x: 26, y: 69 }, dark_sector: { x: 84, y: 72 },
      distributed_clusters: { x: 73, y: 28 }, interarm_void: { x: 36, y: 28 },
    },
  },
  echo: {
    surface: {
      industrial_district: { x: 30, y: 74 }, civic_core: { x: 62, y: 57 },
      habitat_district: { x: 82, y: 58 }, wilderness_margin: { x: 89, y: 81 },
      subsurface_works: { x: 27, y: 88 }, observatory_ridge: { x: 79, y: 47 },
      transit_terminus: { x: 16, y: 68 }, archive_quarter: { x: 48, y: 54 },
      coastal_margin: { x: 72, y: 65 }, containment_zone: { x: 9, y: 83 },
    },
    orbit: {
      low_orbit: { x: 70, y: 66 }, high_orbit: { x: 85, y: 28 },
      orbital_yard: { x: 18, y: 52 }, habitat_orbit: { x: 83, y: 54 },
      moonward_lane: { x: 86, y: 13 }, atmosphere_edge: { x: 66, y: 39 },
    },
    stellar: {
      inner_system: { x: 31, y: 36 }, habitable_orbits: { x: 67, y: 59 },
      lagrange_network: { x: 48, y: 43 }, outer_system: { x: 85, y: 31 },
      heliopause: { x: 90, y: 14 }, distributed_systems: { x: 55, y: 72 },
    },
    galaxy: {
      spiral_arm: { x: 59, y: 55 }, coreward_region: { x: 47, y: 47 },
      rimward_region: { x: 78, y: 68 }, dark_sector: { x: 21, y: 73 },
      distributed_clusters: { x: 31, y: 27 }, interarm_void: { x: 77, y: 30 },
    },
  },
  spore: {
    surface: {
      industrial_district: { x: 22, y: 74 }, civic_core: { x: 49, y: 65 },
      habitat_district: { x: 73, y: 68 }, wilderness_margin: { x: 88, y: 82 },
      subsurface_works: { x: 30, y: 88 }, observatory_ridge: { x: 78, y: 50 },
      transit_terminus: { x: 14, y: 68 }, archive_quarter: { x: 61, y: 56 },
      coastal_margin: { x: 45, y: 82 }, containment_zone: { x: 10, y: 83 },
    },
    orbit: {
      low_orbit: { x: 68, y: 67 }, high_orbit: { x: 15, y: 30 },
      orbital_yard: { x: 83, y: 54 }, habitat_orbit: { x: 18, y: 61 },
      moonward_lane: { x: 23, y: 14 }, atmosphere_edge: { x: 69, y: 40 },
    },
    stellar: {
      inner_system: { x: 71, y: 46 }, habitable_orbits: { x: 55, y: 59 },
      lagrange_network: { x: 64, y: 52 }, outer_system: { x: 90, y: 10 },
      heliopause: { x: 10, y: 28 }, distributed_systems: { x: 32, y: 72 },
    },
    galaxy: {
      spiral_arm: { x: 58, y: 54 }, coreward_region: { x: 71, y: 45 },
      rimward_region: { x: 35, y: 70 }, dark_sector: { x: 18, y: 70 },
      distributed_clusters: { x: 79, y: 27 }, interarm_void: { x: 39, y: 29 },
    },
  },
};

const ATLAS_URLS_BY_DYAD = {
  vortex: {
    surface: vortexSurfaceAtlasUrl,
    orbit: vortexOrbitAtlasUrl,
    stellar: vortexStellarAtlasUrl,
    galaxy: vortexGalaxyAtlasUrl,
  },
  flux: {
    surface: fluxSurfaceAtlasUrl,
    orbit: fluxOrbitAtlasUrl,
    stellar: fluxStellarAtlasUrl,
    galaxy: fluxGalaxyAtlasUrl,
  },
  bloom: {
    surface: bloomSurfaceAtlasUrl,
    orbit: bloomOrbitAtlasUrl,
    stellar: bloomStellarAtlasUrl,
    galaxy: bloomGalaxyAtlasUrl,
  },
  orbit: {
    surface: orbitSurfaceAtlasUrl,
    orbit: orbitOrbitAtlasUrl,
    stellar: orbitStellarAtlasUrl,
    galaxy: orbitGalaxyAtlasUrl,
  },
  canopy: {
    surface: canopySurfaceAtlasUrl,
    orbit: canopyOrbitAtlasUrl,
    stellar: canopyStellarAtlasUrl,
    galaxy: canopyGalaxyAtlasUrl,
  },
  eclipse: {
    surface: eclipseSurfaceAtlasUrl,
    orbit: eclipseOrbitAtlasUrl,
    stellar: eclipseStellarAtlasUrl,
    galaxy: eclipseGalaxyAtlasUrl,
  },
  lineage: {
    surface: lineageSurfaceAtlasUrl,
    orbit: lineageOrbitAtlasUrl,
    stellar: lineageStellarAtlasUrl,
    galaxy: lineageGalaxyAtlasUrl,
  },
  echo: {
    surface: echoSurfaceAtlasUrl,
    orbit: echoOrbitAtlasUrl,
    stellar: echoStellarAtlasUrl,
    galaxy: echoGalaxyAtlasUrl,
  },
  spore: {
    surface: sporeSurfaceAtlasUrl,
    orbit: sporeOrbitAtlasUrl,
    stellar: sporeStellarAtlasUrl,
    galaxy: sporeGalaxyAtlasUrl,
  },
} satisfies Record<AtlasDyadId, AtlasUrls>;

function applyAnchorOverrides(
  composition: SceneManifestationArt,
  overrides: PlacementAnchorMap,
): SceneManifestationArt {
  return Object.fromEntries(Object.entries(composition).map(([placement, art]) => [
    placement,
    art ? {
      ...art,
      anchor: overrides[placement as ArtifactPlacementFamily] ?? art.anchor,
    } : art,
  ])) as SceneManifestationArt;
}

function buildAtlasDyadArt(dyad: AtlasDyadId, urls: AtlasUrls) {
  return {
    surface: buildAtlasArt(
      urls.surface,
      5,
      2,
      SURFACE_PLACEMENTS,
      applyAnchorOverrides(CHRYSALIS_SURFACE_ART, ANCHORS_BY_DYAD[dyad].surface ?? {}),
    ),
    orbit: buildAtlasArt(
      urls.orbit,
      3,
      2,
      ORBIT_PLACEMENTS,
      applyAnchorOverrides(CHRYSALIS_ORBIT_ART, ANCHORS_BY_DYAD[dyad].orbit ?? {}),
    ),
    stellar: buildAtlasArt(
      urls.stellar,
      3,
      2,
      STELLAR_PLACEMENTS,
      applyAnchorOverrides(CHRYSALIS_STELLAR_ART, ANCHORS_BY_DYAD[dyad].stellar ?? {}),
    ),
    galaxy: buildAtlasArt(
      urls.galaxy,
      3,
      2,
      GALAXY_PLACEMENTS,
      applyAnchorOverrides(CHRYSALIS_GALAXY_ART, ANCHORS_BY_DYAD[dyad].galaxy ?? {}),
    ),
  } satisfies Partial<Record<CivilizationCameraScale, SceneManifestationArt>>;
}

const MANIFESTATION_ART: Partial<
  Record<CivilizationDyadId, Partial<Record<CivilizationCameraScale, SceneManifestationArt>>>
> = {
  ...Object.fromEntries(
    (Object.entries(ATLAS_URLS_BY_DYAD) as [AtlasDyadId, AtlasUrls][])
      .map(([dyad, urls]) => [dyad, buildAtlasDyadArt(dyad, urls)]),
  ),
  chrysalis: {
    surface: CHRYSALIS_SURFACE_ART,
    orbit: CHRYSALIS_ORBIT_ART,
    stellar: CHRYSALIS_STELLAR_ART,
    galaxy: CHRYSALIS_GALAXY_ART,
  },
};

const ARTIFACT_ATLAS_GROUND_LINES: Readonly<Record<string, readonly number[]>> = {
  t1e: [0.906, 0.918, 0.92, 0.918, 0.793, 0.739, 0.795, 0.818],
  t1o: [0.855, 0.895, 0.861, 0.861, 0.795, 0.798, 0.801, 0.784],
  t1p: [0.875, 0.861, 0.878, 0.889, 0.875, 0.849, 0.869, 0.875],
  t1r: [0.866, 0.832, 0.818, 0.844, 0.832, 0.849, 0.781, 0.832],
  t1s: [0.889, 0.881, 0.886, 0.898, 0.83, 0.832, 0.759, 0.841],
};

function artifactAtlasCells(
  src: string,
  prefix: string,
  count: number,
  columns: number,
  rows: number,
  scale: number,
): Readonly<Record<string, CivilizationStandaloneArtifactArt>> {
  return Object.fromEntries(Array.from({ length: count }, (_, index) => {
    const artifactId = `${prefix}${String(index + 1).padStart(2, '0')}`;
    return [
      artifactId,
      {
      src,
      scale,
      // The authored atlases are square. Preserve each cell's native geometry
      // instead of compressing tall Tier I/II structures into token-like pads.
      cellAspectRatio: rows / columns,
      // A few authored cells retain transparent staging room or detached
      // generation fragments below the real base. Align the physical footprint,
      // not the atlas edge, to the environmental socket.
      groundLine: ARTIFACT_ATLAS_GROUND_LINES[prefix]?.[index] ?? 1,
      atlas: {
        columns,
        rows,
        column: index % columns,
        row: Math.floor(index / columns),
      },
      } satisfies CivilizationStandaloneArtifactArt,
    ];
  }));
}

const STANDALONE_ARTIFACT_ART: Readonly<Record<string, CivilizationStandaloneArtifactArt>> = {
  ...Object.fromEntries(Object.entries({
    t1r09: { src: t1r09Art, groundLine: 0.965 },
    t1s09: { src: t1s09Art, groundLine: 0.957 },
    t1e09: { src: t1e09Art, groundLine: 0.955 },
    t1o09: { src: t1o09Art, groundLine: 0.953 },
    t1p09: { src: t1p09Art, groundLine: 0.947 },
  }).map(([id, art]) => [id, {
    ...art, scale: 1.12, cellAspectRatio: 1,
    atlas: { columns: 1, rows: 1, column: 0, row: 0 },
  } satisfies CivilizationStandaloneArtifactArt])),
  ...artifactAtlasCells(t1rArtifactAtlasUrl, 't1r', 8, 4, 2, 1.12),
  ...artifactAtlasCells(t1sArtifactAtlasUrl, 't1s', 8, 4, 2, 1.12),
  ...artifactAtlasCells(t1eArtifactAtlasUrl, 't1e', 8, 4, 2, 1.12),
  ...artifactAtlasCells(t1oArtifactAtlasUrl, 't1o', 8, 4, 2, 1.12),
  ...artifactAtlasCells(t1pArtifactAtlasUrl, 't1p', 8, 4, 2, 1.12),
  ...artifactAtlasCells(t2rArtifactAtlasUrl, 't2r', 6, 3, 2, 1.24),
  ...artifactAtlasCells(t2sArtifactAtlasUrl, 't2s', 6, 3, 2, 1.24),
  ...artifactAtlasCells(t2eArtifactAtlasUrl, 't2e', 6, 3, 2, 1.24),
  ...artifactAtlasCells(t2oArtifactAtlasUrl, 't2o', 6, 3, 2, 1.24),
  ...artifactAtlasCells(t2pArtifactAtlasUrl, 't2p', 6, 3, 2, 1.24),
  ...artifactAtlasCells(t3rArtifactAtlasUrl, 't3r', 4, 2, 2, 1.42),
  ...artifactAtlasCells(t3sArtifactAtlasUrl, 't3s', 4, 2, 2, 1.42),
  ...artifactAtlasCells(t3eArtifactAtlasUrl, 't3e', 4, 2, 2, 1.42),
  ...artifactAtlasCells(t3oArtifactAtlasUrl, 't3o', 4, 2, 2, 1.42),
  ...artifactAtlasCells(t3pArtifactAtlasUrl, 't3p', 4, 2, 2, 1.42),
};

// Optional visual editions live here. They never alter placement, scale, or
// gameplay identity; a missing or unavailable edition falls back to canonical.
const ARTIFACT_RENDERING_EDITIONS: Readonly<
  Record<string, Readonly<Record<string, CivilizationArtifactRenderingDescriptor>>>
> = {};

export function getCivilizationManifestationArt(
  dyad: CivilizationDyadId | null | undefined,
  scene: CivilizationCameraScale,
  placement: ArtifactPlacementFamily | null,
): CivilizationManifestationArt | null {
  if (!dyad || !placement) return null;
  return MANIFESTATION_ART[dyad]?.[scene]?.[placement] ?? null;
}

export function getCivilizationSurfaceDistrictArt(
  dyad: CivilizationDyadId | null | undefined,
  placement: ArtifactPlacementFamily | null,
  instance: number,
): CivilizationManifestationArt | null {
  const canonical = getCivilizationManifestationArt(dyad, 'surface', placement);
  if (dyad !== 'chrysalis' || !placement || instance <= 0) return canonical;
  const atlas = CHRYSALIS_SURFACE_SECONDARY_VARIANTS[placement];
  if (!canonical || !atlas) return canonical;
  return {
    ...canonical,
    src: chrysalisSurfaceDistrictVariantsUrl,
    aspectRatio: 1,
    atlas,
    scale: canonical.scale * 0.94,
  };
}

export function getCivilizationNeutralSettlementArt(
  scene: CivilizationCameraScale,
  placement: ArtifactPlacementFamily | null,
): CivilizationManifestationArt | null {
  if (!placement) return null;
  return NEUTRAL_SETTLEMENT_ART[scene]?.[placement] ?? null;
}

export function getCivilizationStandaloneArtifactArt(
  artifactId: string | null | undefined,
  renderingId: string = DEFAULT_CIVILIZATION_ARTIFACT_RENDERING_ID,
): CivilizationStandaloneArtifactArt | null {
  return getCivilizationArtifactRendering(artifactId, renderingId)?.art ?? null;
}

export function getCivilizationArtifactRendering(
  artifactId: string | null | undefined,
  renderingId: string = DEFAULT_CIVILIZATION_ARTIFACT_RENDERING_ID,
): CivilizationArtifactRenderingDescriptor | null {
  if (!artifactId) return null;
  const canonicalArt = STANDALONE_ARTIFACT_ART[artifactId];
  if (!canonicalArt) return null;
  if (renderingId !== DEFAULT_CIVILIZATION_ARTIFACT_RENDERING_ID) {
    const edition = ARTIFACT_RENDERING_EDITIONS[artifactId]?.[renderingId];
    if (edition) return edition;
  }
  return {
    id: DEFAULT_CIVILIZATION_ARTIFACT_RENDERING_ID,
    displayName: 'Canonical manifestation',
    availability: 'included',
    art: canonicalArt,
  };
}

export function listCivilizationArtifactRenderings(
  artifactId: string | null | undefined,
): readonly CivilizationArtifactRenderingDescriptor[] {
  const canonical = getCivilizationArtifactRendering(artifactId);
  if (!canonical || !artifactId) return [];
  return [canonical, ...Object.values(ARTIFACT_RENDERING_EDITIONS[artifactId] ?? {})];
}
import t1r09Art from '@/assets/civilization/manifestations/artifacts/authored/planetary-foundations-v1/t1r09.webp';
import t1s09Art from '@/assets/civilization/manifestations/artifacts/authored/planetary-foundations-v1/t1s09.webp';
import t1e09Art from '@/assets/civilization/manifestations/artifacts/authored/planetary-foundations-v1/t1e09.webp';
import t1o09Art from '@/assets/civilization/manifestations/artifacts/authored/planetary-foundations-v1/t1o09.webp';
import t1p09Art from '@/assets/civilization/manifestations/artifacts/authored/planetary-foundations-v1/t1p09.webp';
