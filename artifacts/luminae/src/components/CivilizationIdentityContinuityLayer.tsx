import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { CivilizationDistrictInstance } from '@workspace/api-client-react';
import {
  createCivilizationEnvironmentIdentity,
  getArtifactPlacementPhysicalContract,
  type ArtifactPlacementFamily,
  type CivilizationDyadId,
  type CivilizationEnvironmentIdentity,
  type CivilizationEnvironmentVariantId,
  type CivilizationManifestationSupportMode,
} from '@workspace/game-types';
import {
  getCivilizationEnvironmentPlateArtSlot,
  type CivilizationPlateArtSlot,
} from '@/lib/civilizationArtRegistry';
import type { CivilizationPlateMaturity } from '@/lib/civilizationDyadEvolutionPlateManifest';
import {
  getCivilizationManifestationArt,
  getCivilizationNeutralSettlementArt,
  getCivilizationSurfaceDistrictArt,
  type CivilizationManifestationArt,
} from '@/lib/civilizationManifestationArtRegistry';
import {
  CIVILIZATION_SURFACE_LAYOUT_POLICY_VERSION,
  getCivilizationContinuitySocket,
  getCivilizationEnvironmentSocketContract,
  getCivilizationScenePhysicalContract,
  getCivilizationSurfaceDistrictAnchor,
  getCivilizationStellarAnchor,
  type CivilizationManifestationSocketDefinition,
} from '@/lib/civilizationEnvironmentSockets';
import {
  getCivilizationSurfaceDistrictParcelsForFamily,
  getCivilizationSurfaceDistrictParcelsForStageAndOccupancy,
} from '@/lib/civilizationSurfaceDistrictPlan';
import type {
  CivilizationCityDevelopmentStage,
  CivilizationSceneProgress,
  CivilizationSceneKind,
  CivilizationVisualIdentity,
} from '@/lib/civilizationVisualState';
import { CIVILIZATION_DYAD_VISUALS } from '@/lib/civilizationVisualState';
import { AFFINITY_META } from '@/lib/affinityMeta';
import { getCivilizationDistrictPresentation } from '@/lib/civilizationDistrictPresentation';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';
import {
  CivilizationDistrictResidents,
  CIVILIZATION_DISTRICT_RESIDENT_STYLES,
} from '@/components/CivilizationDistrictResidents';

const PREDECESSOR_SCENE: Partial<Record<CivilizationSceneKind, CivilizationSceneKind>> = {
  orbit: 'surface',
  stellar: 'orbit',
  galaxy: 'stellar',
};

const CITY_DISTRICT_LAYOUT: readonly {
  placement: ArtifactPlacementFamily;
  x: number;
  y: number;
  scale: number;
  width: number;
}[] = [
  { placement: 'civic_core', x: 50, y: 64, scale: 0.9, width: 38 },
  { placement: 'industrial_district', x: 28, y: 87, scale: 0.78, width: 34 },
  { placement: 'habitat_district', x: 72, y: 87, scale: 0.78, width: 34 },
  { placement: 'transit_terminus', x: 17, y: 75, scale: 0.66, width: 27 },
  { placement: 'archive_quarter', x: 83, y: 75, scale: 0.66, width: 27 },
];

const ACTIVE_SETTLEMENT_LAYOUTS: Record<CivilizationSceneKind, readonly {
  placement: ArtifactPlacementFamily;
  xOffset: number;
  yOffset: number;
  width: number;
  scale: number;
}[]> = {
  surface: [
    { placement: 'civic_core', xOffset: -4, yOffset: -13, width: 24, scale: 0.78 },
    { placement: 'industrial_district', xOffset: 5, yOffset: -10, width: 23, scale: 0.74 },
    { placement: 'habitat_district', xOffset: -4, yOffset: -11, width: 22, scale: 0.72 },
    { placement: 'transit_terminus', xOffset: 7, yOffset: -7, width: 18, scale: 0.66 },
    { placement: 'archive_quarter', xOffset: -7, yOffset: -7, width: 18, scale: 0.64 },
    { placement: 'observatory_ridge', xOffset: 0, yOffset: 3, width: 15, scale: 0.6 },
    { placement: 'coastal_margin', xOffset: -5, yOffset: -6, width: 17, scale: 0.62 },
    { placement: 'wilderness_margin', xOffset: -8, yOffset: -7, width: 16, scale: 0.58 },
    { placement: 'subsurface_works', xOffset: 6, yOffset: -4, width: 17, scale: 0.62 },
    { placement: 'containment_zone', xOffset: 8, yOffset: -5, width: 16, scale: 0.58 },
  ],
  orbit: [
    { placement: 'low_orbit', xOffset: -6, yOffset: -5, width: 18, scale: 0.94 },
    { placement: 'orbital_yard', xOffset: -2, yOffset: -5, width: 19, scale: 1 },
    { placement: 'habitat_orbit', xOffset: 4, yOffset: -5, width: 17, scale: 0.92 },
    { placement: 'high_orbit', xOffset: -4, yOffset: 4, width: 15, scale: 0.86 },
    { placement: 'moonward_lane', xOffset: 5, yOffset: 4, width: 15, scale: 0.84 },
    { placement: 'atmosphere_edge', xOffset: 3, yOffset: -7, width: 17, scale: 0.9 },
  ],
  stellar: [
    { placement: 'lagrange_network', xOffset: -4, yOffset: 3, width: 22, scale: 1.04 },
    { placement: 'habitable_orbits', xOffset: 1, yOffset: -4, width: 25, scale: 1.12 },
    { placement: 'outer_system', xOffset: 5, yOffset: -3, width: 22, scale: 1.04 },
    { placement: 'distributed_systems', xOffset: -2, yOffset: -4, width: 24, scale: 1.08 },
    { placement: 'heliopause', xOffset: -5, yOffset: 4, width: 19, scale: 0.98 },
    { placement: 'inner_system', xOffset: -5, yOffset: -3, width: 29, scale: 1.18 },
  ],
  galaxy: [
    { placement: 'coreward_region', xOffset: -3, yOffset: 0, width: 18, scale: 0.96 },
    { placement: 'dark_sector', xOffset: 4, yOffset: -2, width: 15, scale: 0.86 },
    { placement: 'distributed_clusters', xOffset: -3, yOffset: 2, width: 16, scale: 0.9 },
    { placement: 'spiral_arm', xOffset: 1, yOffset: -2, width: 19, scale: 1 },
    { placement: 'rimward_region', xOffset: -2, yOffset: -2, width: 16, scale: 0.9 },
    { placement: 'interarm_void', xOffset: -4, yOffset: 3, width: 15, scale: 0.84 },
  ],
};

type CityFabricDistrict = {
  x: number;
  y: number;
  width: number;
  depth: 'distance' | 'midground';
};

export interface CivilizationDistrictAffinityAccent {
  primaryTone: string;
  secondaryTone: string;
  composition: string;
}

const CITY_DEVELOPMENT_STRUCTURE_COUNTS: Record<CivilizationCityDevelopmentStage, number> = {
  0: 0,
  1: 3,
  2: 5,
  3: 7,
  4: 8,
  5: 8,
  6: 9,
  7: 9,
  8: 10,
  9: 10,
};

const CITY_DEVELOPMENT_FABRIC_COUNTS: Record<CivilizationCityDevelopmentStage, number> = {
  0: 0,
  1: 2,
  2: 4,
  3: 6,
  4: 7,
  5: 8,
  6: 8,
  7: 9,
  8: 9,
  9: 10,
};

const CITY_DEVELOPMENT_STRUCTURE_SCALE: Record<CivilizationCityDevelopmentStage, number> = {
  0: 0.76,
  1: 0.8,
  2: 0.84,
  3: 0.88,
  4: 0.92,
  5: 0.96,
  6: 0.99,
  7: 1.01,
  8: 1.03,
  9: 1.05,
};

const CITY_MATURITY_STRUCTURE_SCALE: Record<CivilizationPlateMaturity, number> = {
  planetary: 0.94,
  stellar: 1,
  galactic: 1.07,
};

function getCityConstructionPhase(
  cityDevelopmentStage: CivilizationCityDevelopmentStage,
): 'foundation' | 'developing' | 'mature' | 'ascendant' {
  if (cityDevelopmentStage <= 1) return 'foundation';
  if (cityDevelopmentStage <= 4) return 'developing';
  if (cityDevelopmentStage <= 7) return 'mature';
  return 'ascendant';
}

/*
 * Each Dyad owns the macro-composition of its city, not merely the styling of
 * a few landmark buildings. These are physical district belts laid over the
 * persistent terrain and ordinary settlement substrate.
 */
const CITY_FABRIC_LAYOUTS: Record<CivilizationDyadId, readonly CityFabricDistrict[]> = {
  vortex: [
    { x: 50, y: 49, width: 18, depth: 'distance' },
    { x: 37, y: 55, width: 16, depth: 'distance' },
    { x: 63, y: 55, width: 16, depth: 'distance' },
    { x: 27, y: 62, width: 15, depth: 'midground' },
    { x: 73, y: 62, width: 15, depth: 'midground' },
    { x: 16, y: 69, width: 14, depth: 'midground' },
    { x: 84, y: 69, width: 14, depth: 'midground' },
    { x: 40, y: 69, width: 17, depth: 'midground' },
    { x: 60, y: 69, width: 17, depth: 'midground' },
    { x: 50, y: 76, width: 19, depth: 'midground' },
  ],
  flux: [
    { x: 10, y: 61, width: 14, depth: 'distance' },
    { x: 23, y: 66, width: 15, depth: 'midground' },
    { x: 36, y: 69, width: 16, depth: 'midground' },
    { x: 49, y: 65, width: 17, depth: 'midground' },
    { x: 61, y: 58, width: 16, depth: 'distance' },
    { x: 73, y: 53, width: 15, depth: 'distance' },
    { x: 85, y: 57, width: 14, depth: 'distance' },
    { x: 91, y: 67, width: 13, depth: 'midground' },
    { x: 68, y: 72, width: 16, depth: 'midground' },
    { x: 39, y: 54, width: 15, depth: 'distance' },
  ],
  bloom: [
    { x: 50, y: 73, width: 19, depth: 'midground' },
    { x: 50, y: 62, width: 17, depth: 'midground' },
    { x: 50, y: 51, width: 15, depth: 'distance' },
    { x: 37, y: 58, width: 16, depth: 'distance' },
    { x: 25, y: 53, width: 14, depth: 'distance' },
    { x: 63, y: 58, width: 16, depth: 'distance' },
    { x: 76, y: 52, width: 14, depth: 'distance' },
    { x: 32, y: 69, width: 16, depth: 'midground' },
    { x: 68, y: 69, width: 16, depth: 'midground' },
    { x: 87, y: 65, width: 14, depth: 'midground' },
  ],
  chrysalis: [
    { x: 50, y: 47, width: 18, depth: 'distance' },
    { x: 28, y: 53, width: 17, depth: 'distance' },
    { x: 72, y: 53, width: 17, depth: 'distance' },
    { x: 12, y: 64, width: 16, depth: 'midground' },
    { x: 88, y: 64, width: 16, depth: 'midground' },
    { x: 31, y: 70, width: 18, depth: 'midground' },
    { x: 50, y: 69, width: 20, depth: 'midground' },
    { x: 69, y: 70, width: 18, depth: 'midground' },
    { x: 13, y: 79, width: 16, depth: 'midground' },
    { x: 87, y: 79, width: 16, depth: 'midground' },
  ],
  orbit: [
    { x: 50, y: 48, width: 16, depth: 'distance' },
    { x: 33, y: 51, width: 15, depth: 'distance' },
    { x: 67, y: 51, width: 15, depth: 'distance' },
    { x: 20, y: 58, width: 14, depth: 'distance' },
    { x: 80, y: 58, width: 14, depth: 'distance' },
    { x: 12, y: 68, width: 14, depth: 'midground' },
    { x: 88, y: 68, width: 14, depth: 'midground' },
    { x: 31, y: 69, width: 17, depth: 'midground' },
    { x: 69, y: 69, width: 17, depth: 'midground' },
    { x: 50, y: 74, width: 19, depth: 'midground' },
  ],
  canopy: [
    { x: 14, y: 56, width: 15, depth: 'distance' },
    { x: 31, y: 49, width: 17, depth: 'distance' },
    { x: 50, y: 46, width: 19, depth: 'distance' },
    { x: 69, y: 49, width: 17, depth: 'distance' },
    { x: 86, y: 56, width: 15, depth: 'distance' },
    { x: 23, y: 68, width: 16, depth: 'midground' },
    { x: 41, y: 66, width: 17, depth: 'midground' },
    { x: 59, y: 66, width: 17, depth: 'midground' },
    { x: 77, y: 68, width: 16, depth: 'midground' },
    { x: 50, y: 75, width: 18, depth: 'midground' },
  ],
  eclipse: [
    { x: 50, y: 49, width: 15, depth: 'distance' },
    { x: 34, y: 52, width: 15, depth: 'distance' },
    { x: 66, y: 52, width: 15, depth: 'distance' },
    { x: 22, y: 60, width: 14, depth: 'distance' },
    { x: 78, y: 60, width: 14, depth: 'distance' },
    { x: 14, y: 71, width: 15, depth: 'midground' },
    { x: 86, y: 71, width: 15, depth: 'midground' },
    { x: 34, y: 73, width: 17, depth: 'midground' },
    { x: 66, y: 73, width: 17, depth: 'midground' },
    { x: 50, y: 76, width: 16, depth: 'midground' },
  ],
  lineage: [
    { x: 10, y: 57, width: 14, depth: 'distance' },
    { x: 25, y: 63, width: 16, depth: 'midground' },
    { x: 40, y: 57, width: 15, depth: 'distance' },
    { x: 55, y: 64, width: 17, depth: 'midground' },
    { x: 70, y: 57, width: 15, depth: 'distance' },
    { x: 86, y: 64, width: 15, depth: 'midground' },
    { x: 18, y: 72, width: 16, depth: 'midground' },
    { x: 37, y: 69, width: 17, depth: 'midground' },
    { x: 62, y: 72, width: 17, depth: 'midground' },
    { x: 81, y: 70, width: 16, depth: 'midground' },
  ],
  echo: [
    { x: 50, y: 48, width: 14, depth: 'distance' },
    { x: 39, y: 54, width: 15, depth: 'distance' },
    { x: 61, y: 54, width: 15, depth: 'distance' },
    { x: 29, y: 61, width: 16, depth: 'distance' },
    { x: 71, y: 61, width: 16, depth: 'distance' },
    { x: 19, y: 69, width: 16, depth: 'midground' },
    { x: 81, y: 69, width: 16, depth: 'midground' },
    { x: 39, y: 70, width: 18, depth: 'midground' },
    { x: 61, y: 70, width: 18, depth: 'midground' },
    { x: 50, y: 77, width: 20, depth: 'midground' },
  ],
  spore: [
    { x: 14, y: 53, width: 14, depth: 'distance' },
    { x: 37, y: 49, width: 16, depth: 'distance' },
    { x: 63, y: 56, width: 15, depth: 'distance' },
    { x: 85, y: 51, width: 14, depth: 'distance' },
    { x: 25, y: 65, width: 17, depth: 'midground' },
    { x: 49, y: 63, width: 18, depth: 'midground' },
    { x: 76, y: 68, width: 17, depth: 'midground' },
    { x: 10, y: 74, width: 14, depth: 'midground' },
    { x: 41, y: 75, width: 16, depth: 'midground' },
    { x: 91, y: 73, width: 14, depth: 'midground' },
  ],
};

function getCityFabricSocketScore(
  socket: CivilizationManifestationSocketDefinition,
  district: CityFabricDistrict,
): number {
  const depthPenalty = socket.depth === district.depth
    ? 0
    : socket.depth === 'foreground'
      ? 2_000
      : 540;
  const horizontalDistance = socket.desktopTransform.x - district.x;
  const verticalDistance = socket.desktopTransform.y - district.y;
  return depthPenalty + horizontalDistance ** 2 + verticalDistance ** 2 * 1.35;
}

function selectCityFabricSocket(
  sockets: readonly CivilizationManifestationSocketDefinition[],
  placement: ArtifactPlacementFamily,
  district: CityFabricDistrict,
): CivilizationManifestationSocketDefinition | null {
  const compatibleSockets = sockets.filter((socket) => (
    socket.nativeScene === 'surface' && socket.semanticRole === placement
  ));
  const authoredDistrictAnchor = compatibleSockets.find((socket) => socket.socketId.endsWith(':0'));
  if (authoredDistrictAnchor) {
    const desktopAnchor = getCivilizationSurfaceDistrictAnchor(
      authoredDistrictAnchor.environmentVariantId,
      placement,
      false,
    );
    const mobileAnchor = getCivilizationSurfaceDistrictAnchor(
      authoredDistrictAnchor.environmentVariantId,
      placement,
      true,
    );
    return {
      ...authoredDistrictAnchor,
      desktopTransform: {
        ...authoredDistrictAnchor.desktopTransform,
        ...desktopAnchor,
      },
      mobileTransform: {
        ...authoredDistrictAnchor.mobileTransform,
        ...mobileAnchor,
      },
    };
  }
  return compatibleSockets
    .sort((left, right) => (
      getCityFabricSocketScore(left, district) - getCityFabricSocketScore(right, district) ||
      left.socketId.localeCompare(right.socketId)
    ))[0] ?? null;
}

function getCityFabricTerrainClipPath(
  depth: CivilizationManifestationSocketDefinition['depth'],
  support: CivilizationManifestationSupportMode,
) {
  // Waterfront artwork includes its own piles, spillways and waterline. An
  // inland terrain cut severs those foundations above the supporting pier.
  if (depth === 'foreground' || support === 'shore_pylons') return undefined;
  return depth === 'distance'
    ? 'polygon(0 0,100% 0,100% 88%,84% 85%,68% 92%,48% 87%,28% 93%,12% 87%,0 90%)'
    : 'polygon(0 0,100% 0,100% 95%,80% 92%,62% 97%,40% 93%,20% 97%,0 94%)';
}

const DISTRICT_ENTRANCE_APRONS = {
  civic: {
    top: 'M36 94 63 94 72 98 30 98Z',
    face: 'M30 98 72 98 72 100 30 100Z',
    recess: 'M43 98.5 50 98.5 50 99.5 43 99.5Z M56 98.5 63 98.5 63 99.5 56 99.5Z',
  },
  forge: {
    top: 'M49 92 61 94 72 98 50 98Z',
    face: 'M50 98 72 98 72 100 50 100Z',
    recess: 'M55 98.5 62 98.5 62 99.5 55 99.5Z',
  },
  transit: {
    top: 'M28 89 60 89 68 97 22 97Z',
    face: 'M22 97 68 97 68 100 22 100Z',
    recess: 'M27 98 35 98 35 99.3 27 99.3Z M54 98 62 98 62 99.3 54 99.3Z',
  },
} as const;

type DistrictEntranceApron = keyof typeof DISTRICT_ENTRANCE_APRONS;

const DISTRICT_ENTRANCE_BY_PARCEL: Readonly<Partial<Record<string, DistrictEntranceApron>>> = {
  'civic-central': 'civic',
  'underworks-southwest': 'forge',
  'transit-west-gate': 'transit',
};

function CityDistrictPhysicalSupport({
  entranceApron,
  ...foundation
}: {
  mode: CivilizationManifestationSupportMode;
  shoreSupportDepth?: number;
  shoreSpillway?: boolean;
  entranceApron?: DistrictEntranceApron;
}) {
  const apron = entranceApron ? DISTRICT_ENTRANCE_APRONS[entranceApron] : null;
  return (
    <>
      <CityDistrictFoundation {...foundation} />
      {apron && (
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full"
          data-city-district-entrance={entranceApron}
        >
          {/* Short bearing faces stay inside the already fitted parcel and
              tuck beneath the original stairs, artwork and resident bays. */}
          <path d={apron.face} fill="#292c2e" />
          <path d={apron.top} fill="#49413e" stroke="#70645b" strokeWidth="0.4" />
          <path d={apron.recess} fill="#182322" />
        </svg>
      )}
    </>
  );
}

function CityDistrictFoundation({
  mode,
  shoreSupportDepth = 0.1,
  shoreSpillway = false,
}: {
  mode: CivilizationManifestationSupportMode;
  shoreSupportDepth?: number;
  shoreSpillway?: boolean;
}) {
  if (mode === 'shore_pylons') {
    const height = 100 + shoreSupportDepth * 100;
    const extraDrop = height - 110;
    return (
      <svg
        aria-hidden="true"
        viewBox={`0 0 100 ${height}`}
        className="pointer-events-none absolute inset-x-0 top-0 z-0 w-full"
        style={{ height: `${height}%` }}
        data-city-district-support="shore-pylons"
        data-shore-form={shoreSpillway ? 'open-spillway' : 'bearing-deck'}
      >
        {shoreSpillway ? (
          <>
            {/* The Chrysalis art already contains an outfall. Support its two
                quay edges without laying a solid deck beneath the falling water. */}
            <path d="M0 95 15 87 25 86 23 90 9 99 0 99Z" fill="#3d4343" data-shore-connection="approach" />
            <path d="M0 99 9 99 23 90 23 94 9 103 0 102Z" fill="#202a30" />
            <path d={`M16 93 22 94 22 ${107 + extraDrop} 19 ${109 + extraDrop} 16 ${107 + extraDrop}Z M81 89 88 87 88 ${105 + extraDrop} 84 ${107 + extraDrop} 81 ${105 + extraDrop}Z`} fill="#202b31" />
            <path d={`M18 95 20 96 20 ${107 + extraDrop} 18 ${108 + extraDrop}Z M83 91 85 90 85 ${105 + extraDrop} 83 ${106 + extraDrop}Z`} fill="#56605f" />
            <path d="M7 85 22 82 27 85 22 92 13 93 7 90Z M76 80 89 79 97 84 96 88 84 94 76 91Z" fill="#424b4b" data-shore-deck="bearing" />
            <path d="M7 90 13 93 22 92 22 97 13 98 7 95Z M76 91 84 94 96 88 96 94 84 100 76 97Z" fill="#222d34" />
            <path d="M7 90 13 93 22 92M76 91 84 94 96 88" fill="none" stroke="#66716b" strokeWidth="0.65" />
            <path d="M13 94V98M80 94V98M89 93V97" stroke="#121f26" strokeWidth="0.7" />
          </>
        ) : (
          <>
            {/* An opaque load path, kept within the parcel's reserved support
                allowance: shore approach, bearing deck, fascia, then driven piles. */}
            <path d="M0 96 28 85 43 89 13 102 0 101Z" fill="#303c40" data-shore-connection="approach" />
            <path d="M0 95 28 84 43 88 13 99 0 99Z" fill="#78817d" />
            <path d={`M18 94 24 95 24 ${107 + extraDrop} 20 ${109 + extraDrop} 18 ${107 + extraDrop}Z M48 98 55 97 55 ${108 + extraDrop} 51 ${110 + extraDrop} 48 ${108 + extraDrop}Z M83 93 89 91 89 ${104 + extraDrop} 86 ${106 + extraDrop} 83 ${105 + extraDrop}Z`} fill="#263238" />
            <path d={`M20 97 22 97 22 ${107 + extraDrop} 20 ${108 + extraDrop}Z M50 100 53 99 53 ${108 + extraDrop} 50 ${109 + extraDrop}Z M85 96 87 95 87 ${104 + extraDrop} 85 ${105 + extraDrop}Z`} fill="#7b8580" />
            <path d="M7 84 72 80 97 85 84 89 48 94 19 91 7 87Z" fill="#4f5d5d" data-shore-deck="bearing" />
            <path d="M7 87 19 91 48 94 84 89 97 85 97 94 84 98 48 103 19 100 7 95Z" fill="#253039" />
            <path d="M7 87 19 91 48 94 84 89 97 85 97 87 84 91 48 96 19 93 7 89Z" fill="#758381" />
            <path d="M19 93V100M34 95V102M48 96V103M66 94V100M84 91V98" stroke="#121f26" strokeWidth="0.7" />
          </>
        )}
      </svg>
    );
  }

  if (mode === 'terraced_foundation') {
    return (
      <span
        className="pointer-events-none absolute inset-x-[8%] bottom-0 z-0 h-[9%] opacity-80"
        data-city-district-support="terraced-foundation"
      >
        <span className="absolute inset-0 border-t border-stone-200/25 bg-gradient-to-b from-stone-500/85 via-stone-800/90 to-stone-950 shadow-[0_2px_3px_rgba(0,0,0,0.84)] [clip-path:polygon(3%_42%,14%_18%,29%_31%,45%_4%,61%_24%,77%_12%,96%_43%,100%_100%,0_100%)]" />
      </span>
    );
  }

  if (mode === 'subsurface_anchor') {
    return (
      <span
        className="pointer-events-none absolute inset-x-[20%] bottom-0 z-0 h-[10%] overflow-hidden opacity-80"
        data-city-district-support="subsurface-anchor"
      >
        <span className="absolute bottom-0 left-[45%] h-full w-[10%] bg-gradient-to-b from-zinc-500 via-zinc-800 to-black" />
        <span className="absolute inset-x-0 top-[2%] h-[22%] rounded-[50%] bg-gradient-to-b from-zinc-500 to-zinc-950 shadow-[0_2px_3px_rgba(0,0,0,0.86)]" />
      </span>
    );
  }

  if (mode === 'terrain_integrated') {
    return (
      <span
        className="pointer-events-none absolute inset-x-[11%] bottom-0 z-0 h-[7%] bg-gradient-to-b from-stone-500/55 via-stone-800/80 to-black/90 opacity-75 shadow-[0_2px_2px_rgba(0,0,0,0.78)] [clip-path:polygon(2%_56%,12%_24%,27%_36%,44%_4%,63%_27%,78%_14%,98%_58%,91%_100%,8%_100%)]"
        data-city-district-support="terrain-integrated"
      />
    );
  }

  return (
    <span
      className="pointer-events-none absolute inset-x-[14%] bottom-0 z-0 h-[6%] rounded-[45%] bg-gradient-to-b from-slate-500/50 via-slate-800/75 to-black/90 opacity-75 shadow-[0_2px_2px_rgba(0,0,0,0.78)]"
      data-city-district-support="district-foundation"
    />
  );
}

const NEUTRAL_SETTLEMENT_CLUSTER_OFFSETS = [
  { x: -12, y: 2 },
  { x: 12, y: 2 },
  { x: 0, y: -9 },
  { x: -20, y: 8 },
  { x: 20, y: 8 },
  { x: -5.5, y: 7.5 },
  { x: 5.5, y: 7.5 },
  { x: -17.5, y: 4.5 },
  { x: 17.5, y: 4.5 },
  { x: 0, y: 11 },
] as const;

type StellarFabricOffset = {
  x: number;
  y: number;
  width: number;
  mobileX: number;
  mobileY: number;
  mobileWidth: number;
  depth: 'foreground' | 'midground' | 'distance';
};

type GalaxyColonyAnchor = {
  x: number;
  y: number;
  width: number;
  mobileX: number;
  mobileY: number;
  mobileWidth: number;
  depth: 'foreground' | 'midground' | 'distance';
};

const STELLAR_FABRIC_OFFSETS: Record<CivilizationDyadId, readonly StellarFabricOffset[]> = {
  vortex: [
    { x: 0, y: 0, width: 1.58, mobileX: 0, mobileY: 0, mobileWidth: 1.5, depth: 'foreground' },
    { x: -27, y: 24, width: 15, mobileX: -22, mobileY: 27, mobileWidth: 18, depth: 'midground' },
    { x: 27, y: 23, width: 14, mobileX: 23, mobileY: 28, mobileWidth: 17, depth: 'distance' },
  ],
  flux: [
    { x: 0, y: 0, width: 1.56, mobileX: 0, mobileY: 0, mobileWidth: 1.48, depth: 'foreground' },
    { x: -30, y: 17, width: 14, mobileX: -23, mobileY: 25, mobileWidth: 17, depth: 'distance' },
    { x: 24, y: 31, width: 16, mobileX: 22, mobileY: 31, mobileWidth: 18, depth: 'midground' },
  ],
  bloom: [
    { x: 0, y: 0, width: 1.62, mobileX: 0, mobileY: 0, mobileWidth: 1.52, depth: 'foreground' },
    { x: -24, y: 29, width: 16, mobileX: -21, mobileY: 29, mobileWidth: 18, depth: 'midground' },
    { x: 27, y: 18, width: 14, mobileX: 22, mobileY: 25, mobileWidth: 17, depth: 'distance' },
  ],
  chrysalis: [
    { x: 0, y: 0, width: 1.66, mobileX: 0, mobileY: 0, mobileWidth: 1.56, depth: 'foreground' },
    { x: -27, y: 25, width: 15, mobileX: -22, mobileY: 29, mobileWidth: 18, depth: 'midground' },
    { x: 27, y: 25, width: 15, mobileX: 22, mobileY: 29, mobileWidth: 18, depth: 'midground' },
  ],
  orbit: [
    { x: 0, y: 0, width: 1.58, mobileX: 0, mobileY: 0, mobileWidth: 1.5, depth: 'foreground' },
    { x: -29, y: 10, width: 14, mobileX: -23, mobileY: 20, mobileWidth: 17, depth: 'distance' },
    { x: 29, y: 10, width: 14, mobileX: 23, mobileY: 20, mobileWidth: 17, depth: 'distance' },
  ],
  canopy: [
    { x: 0, y: 0, width: 1.62, mobileX: 0, mobileY: 0, mobileWidth: 1.52, depth: 'foreground' },
    { x: -30, y: 23, width: 16, mobileX: -23, mobileY: 28, mobileWidth: 18, depth: 'midground' },
    { x: 26, y: 17, width: 14, mobileX: 22, mobileY: 24, mobileWidth: 17, depth: 'distance' },
  ],
  eclipse: [
    { x: 0, y: 0, width: 1.6, mobileX: 0, mobileY: 0, mobileWidth: 1.5, depth: 'foreground' },
    { x: -27, y: -11, width: 13, mobileX: -22, mobileY: 17, mobileWidth: 16, depth: 'distance' },
    { x: 25, y: 29, width: 16, mobileX: 22, mobileY: 30, mobileWidth: 18, depth: 'midground' },
  ],
  lineage: [
    { x: 0, y: 0, width: 1.64, mobileX: 0, mobileY: 0, mobileWidth: 1.54, depth: 'foreground' },
    { x: -29, y: 28, width: 16, mobileX: -23, mobileY: 30, mobileWidth: 18, depth: 'midground' },
    { x: 27, y: 12, width: 14, mobileX: 22, mobileY: 22, mobileWidth: 17, depth: 'distance' },
  ],
  echo: [
    { x: 0, y: 0, width: 1.62, mobileX: 0, mobileY: 0, mobileWidth: 1.52, depth: 'foreground' },
    { x: -27, y: 21, width: 15, mobileX: -22, mobileY: 27, mobileWidth: 18, depth: 'midground' },
    { x: 27, y: 21, width: 15, mobileX: 22, mobileY: 27, mobileWidth: 18, depth: 'midground' },
  ],
  spore: [
    { x: 0, y: 0, width: 1.58, mobileX: 0, mobileY: 0, mobileWidth: 1.5, depth: 'foreground' },
    { x: -31, y: 25, width: 14, mobileX: -23, mobileY: 29, mobileWidth: 17, depth: 'distance' },
    { x: 22, y: 31, width: 16, mobileX: 20, mobileY: 32, mobileWidth: 18, depth: 'midground' },
  ],
};

const NEUTRAL_STELLAR_FABRIC_OFFSETS = STELLAR_FABRIC_OFFSETS.orbit;

const GALAXY_COLONY_LAYOUTS: Record<CivilizationDyadId, readonly GalaxyColonyAnchor[]> = {
  vortex: [
    { x: 52, y: 30, width: 23, mobileX: 53, mobileY: 28, mobileWidth: 30, depth: 'foreground' },
    { x: 74, y: 52, width: 18, mobileX: 74, mobileY: 50, mobileWidth: 23, depth: 'midground' },
    { x: 54, y: 73, width: 16, mobileX: 55, mobileY: 70, mobileWidth: 21, depth: 'distance' },
  ],
  flux: [
    { x: 45, y: 25, width: 19, mobileX: 48, mobileY: 27, mobileWidth: 25, depth: 'distance' },
    { x: 66, y: 46, width: 22, mobileX: 68, mobileY: 47, mobileWidth: 28, depth: 'foreground' },
    { x: 82, y: 69, width: 17, mobileX: 79, mobileY: 67, mobileWidth: 22, depth: 'midground' },
  ],
  bloom: [
    { x: 54, y: 28, width: 22, mobileX: 54, mobileY: 28, mobileWidth: 28, depth: 'foreground' },
    { x: 73, y: 48, width: 17, mobileX: 73, mobileY: 48, mobileWidth: 22, depth: 'distance' },
    { x: 61, y: 72, width: 19, mobileX: 60, mobileY: 69, mobileWidth: 24, depth: 'midground' },
  ],
  chrysalis: [
    { x: 54, y: 28, width: 23, mobileX: 54, mobileY: 29, mobileWidth: 29, depth: 'foreground' },
    { x: 77, y: 55, width: 18, mobileX: 76, mobileY: 53, mobileWidth: 23, depth: 'midground' },
    { x: 57, y: 73, width: 17, mobileX: 57, mobileY: 69, mobileWidth: 22, depth: 'midground' },
  ],
  orbit: [
    { x: 52, y: 26, width: 21, mobileX: 53, mobileY: 27, mobileWidth: 27, depth: 'foreground' },
    { x: 78, y: 44, width: 17, mobileX: 77, mobileY: 44, mobileWidth: 22, depth: 'distance' },
    { x: 69, y: 72, width: 18, mobileX: 67, mobileY: 68, mobileWidth: 23, depth: 'midground' },
  ],
  canopy: [
    { x: 48, y: 28, width: 20, mobileX: 50, mobileY: 29, mobileWidth: 26, depth: 'distance' },
    { x: 67, y: 39, width: 22, mobileX: 67, mobileY: 41, mobileWidth: 28, depth: 'foreground' },
    { x: 80, y: 66, width: 18, mobileX: 78, mobileY: 63, mobileWidth: 23, depth: 'midground' },
  ],
  eclipse: [
    { x: 50, y: 24, width: 18, mobileX: 51, mobileY: 27, mobileWidth: 24, depth: 'distance' },
    { x: 79, y: 42, width: 21, mobileX: 77, mobileY: 43, mobileWidth: 27, depth: 'foreground' },
    { x: 61, y: 72, width: 18, mobileX: 61, mobileY: 68, mobileWidth: 23, depth: 'midground' },
  ],
  lineage: [
    { x: 46, y: 28, width: 20, mobileX: 48, mobileY: 29, mobileWidth: 26, depth: 'midground' },
    { x: 67, y: 45, width: 22, mobileX: 67, mobileY: 45, mobileWidth: 28, depth: 'foreground' },
    { x: 81, y: 67, width: 17, mobileX: 79, mobileY: 64, mobileWidth: 22, depth: 'distance' },
  ],
  echo: [
    { x: 50, y: 31, width: 20, mobileX: 51, mobileY: 31, mobileWidth: 26, depth: 'midground' },
    { x: 77, y: 31, width: 20, mobileX: 76, mobileY: 34, mobileWidth: 26, depth: 'midground' },
    { x: 64, y: 68, width: 22, mobileX: 63, mobileY: 66, mobileWidth: 28, depth: 'foreground' },
  ],
  spore: [
    { x: 47, y: 25, width: 17, mobileX: 49, mobileY: 28, mobileWidth: 22, depth: 'distance' },
    { x: 78, y: 47, width: 20, mobileX: 76, mobileY: 47, mobileWidth: 26, depth: 'foreground' },
    { x: 58, y: 73, width: 18, mobileX: 58, mobileY: 69, mobileWidth: 23, depth: 'midground' },
  ],
};

const NEUTRAL_GALAXY_COLONY_LAYOUT = GALAXY_COLONY_LAYOUTS.orbit;

const SETTLEMENT_COUNTS: Record<CivilizationSceneKind, readonly [number, number, number, number]> = {
  surface: [2, 4, 7, 10],
  orbit: [1, 3, 5, 6],
  stellar: [0, 1, 2, 3],
  galaxy: [0, 1, 2, 3],
};

const DYAD_ORDER: readonly CivilizationDyadId[] = [
  'vortex', 'flux', 'bloom', 'chrysalis', 'orbit',
  'canopy', 'eclipse', 'lineage', 'echo', 'spore',
];

const SURFACE_FABRIC_PRIORITY: Record<CivilizationDyadId, readonly ArtifactPlacementFamily[]> = {
  vortex: ['civic_core', 'observatory_ridge', 'industrial_district'],
  flux: ['transit_terminus', 'industrial_district', 'subsurface_works'],
  bloom: ['wilderness_margin', 'habitat_district', 'industrial_district'],
  chrysalis: ['containment_zone', 'industrial_district', 'subsurface_works'],
  orbit: ['transit_terminus', 'observatory_ridge', 'archive_quarter'],
  canopy: ['habitat_district', 'observatory_ridge', 'wilderness_margin'],
  eclipse: ['containment_zone', 'observatory_ridge', 'archive_quarter'],
  lineage: ['transit_terminus', 'habitat_district', 'wilderness_margin'],
  echo: ['archive_quarter', 'containment_zone', 'subsurface_works'],
  spore: ['wilderness_margin', 'containment_zone', 'habitat_district'],
};

const PLANET_LIGHT_PATTERNS: readonly (readonly { x: number; y: number }[])[] = [
  [{ x: 50, y: 48 }, { x: 42, y: 55 }, { x: 58, y: 55 }, { x: 34, y: 64 }, { x: 66, y: 64 }, { x: 50, y: 70 }],
  [{ x: 27, y: 68 }, { x: 38, y: 60 }, { x: 48, y: 53 }, { x: 58, y: 58 }, { x: 69, y: 48 }, { x: 78, y: 57 }],
  [{ x: 28, y: 69 }, { x: 39, y: 61 }, { x: 47, y: 70 }, { x: 57, y: 55 }, { x: 66, y: 65 }, { x: 76, y: 50 }],
  [{ x: 34, y: 67 }, { x: 42, y: 58 }, { x: 50, y: 64 }, { x: 58, y: 57 }, { x: 66, y: 67 }, { x: 50, y: 48 }],
  [{ x: 31, y: 61 }, { x: 41, y: 51 }, { x: 53, y: 47 }, { x: 65, y: 52 }, { x: 75, y: 62 }, { x: 53, y: 70 }],
  [{ x: 27, y: 64 }, { x: 37, y: 54 }, { x: 49, y: 50 }, { x: 61, y: 54 }, { x: 73, y: 63 }, { x: 49, y: 71 }],
  [{ x: 31, y: 52 }, { x: 42, y: 47 }, { x: 55, y: 49 }, { x: 67, y: 57 }, { x: 73, y: 69 }, { x: 44, y: 68 }],
  [{ x: 27, y: 68 }, { x: 37, y: 58 }, { x: 47, y: 66 }, { x: 57, y: 55 }, { x: 67, y: 63 }, { x: 77, y: 51 }],
  [{ x: 32, y: 57 }, { x: 43, y: 49 }, { x: 43, y: 67 }, { x: 57, y: 49 }, { x: 57, y: 67 }, { x: 68, y: 57 }],
  [{ x: 29, y: 57 }, { x: 39, y: 67 }, { x: 48, y: 51 }, { x: 57, y: 69 }, { x: 67, y: 55 }, { x: 76, y: 65 }],
] as const;

function orderFabricLayout<T extends { placement: ArtifactPlacementFamily }>(
  layout: readonly T[],
  dyad: CivilizationDyadId | null,
  scene: CivilizationSceneKind,
): T[] {
  if (!dyad) return [...layout];
  if (scene === 'surface') {
    const priority = SURFACE_FABRIC_PRIORITY[dyad];
    return [...layout].sort((left, right) => {
      const leftIndex = priority.indexOf(left.placement);
      const rightIndex = priority.indexOf(right.placement);
      const leftRank = leftIndex < 0 ? priority.length : leftIndex;
      const rightRank = rightIndex < 0 ? priority.length : rightIndex;
      return leftRank - rightRank;
    });
  }
  const phase = DYAD_ORDER.indexOf(dyad);
  const offset = ((phase % layout.length) + layout.length) % layout.length;
  return [...layout.slice(offset), ...layout.slice(0, offset)];
}

function getPlanetLightPattern(dyad: CivilizationDyadId | null) {
  return PLANET_LIGHT_PATTERNS[Math.max(0, DYAD_ORDER.indexOf(dyad ?? 'vortex'))]!;
}

function ManifestationArtwork({ art }: { art: CivilizationManifestationArt }) {
  const atlas = art.atlas;
  return (
    <img
      src={art.src}
      alt=""
      className={atlas ? 'absolute max-w-none' : 'absolute inset-0 h-full w-full object-contain'}
      style={atlas ? {
        width: `${atlas.columns * 100}%`,
        height: `${atlas.rows * 100}%`,
        left: `${-atlas.column * 100}%`,
        top: `${-atlas.row * 100}%`,
      } : undefined}
      decoding="async"
      draggable={false}
    />
  );
}

function StellarNeighborhoodArtwork({
  art,
  primaryTone,
  secondaryTone,
  compact = false,
  preserveCanonicalStar = false,
  renderLocalStar = false,
}: {
  art: CivilizationManifestationArt;
  primaryTone: string;
  secondaryTone: string;
  compact?: boolean;
  preserveCanonicalStar?: boolean;
  renderLocalStar?: boolean;
}) {
  const preservesStar = preserveCanonicalStar || renderLocalStar;
  const artworkMask = preservesStar
    ? 'radial-gradient(circle at 50% 50%, transparent 0 18%, rgba(0,0,0,0.18) 23%, #000 31% 72%, rgba(0,0,0,0.78) 84%, transparent 98%)'
    : 'radial-gradient(ellipse at 50% 50%, #000 0 58%, rgba(0,0,0,0.96) 72%, rgba(0,0,0,0.42) 87%, transparent 98%)';
  return (
    <>
      <span
        className="absolute inset-[-14%] rounded-[50%]"
        style={{
          background: `radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.72) 0 0.7%, ${primaryTone}8F 1.4%, ${primaryTone}30 7%, ${secondaryTone}16 19%, rgba(6,10,17,0.34) 38%, transparent 70%)`,
          filter: `blur(${compact ? 2 : 4}px)`,
          opacity: compact ? 0.72 : 0.86,
        }}
        data-stellar-neighborhood-light="true"
      />
      {renderLocalStar && (
        <>
          <span
            className="absolute left-1/2 top-1/2 block w-[88%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
            style={{
              aspectRatio: '2.75 / 1',
              border: `1px solid ${secondaryTone}48`,
              boxShadow: `inset 0 0 5px ${primaryTone}24`,
              transform: 'translate(-50%, -50%) rotate(-7deg)',
              zIndex: 1,
            }}
            data-colony-orbit="outer-network"
          />
          <span
            className="absolute left-1/2 top-1/2 block w-[63%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
            style={{
              aspectRatio: '2.3 / 1',
              border: `1px solid ${primaryTone}62`,
              transform: 'translate(-50%, -50%) rotate(11deg)',
              zIndex: 1,
            }}
            data-colony-orbit="inhabited-band"
          />
          <span
            className="absolute left-[13%] top-[53%] block w-[8%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
            style={{
              aspectRatio: '1 / 1',
              background: 'radial-gradient(circle at 32% 28%, #dce7ef, #526577 42%, #080c12 78%)',
              boxShadow: `0 0 5px ${secondaryTone}72`,
              zIndex: 2,
            }}
            data-system-body="colony-world"
          />
          <span
            className="absolute left-[76%] top-[36%] block w-[5.5%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
            style={{
              aspectRatio: '1 / 1',
              background: `radial-gradient(circle at 32% 28%, #fff3cf, ${primaryTone} 40%, #100b0a 78%)`,
              boxShadow: `0 0 4px ${primaryTone}76`,
              zIndex: 2,
            }}
            data-system-body="colony-world"
          />
          <span
            className="absolute left-1/2 top-1/2 block w-[28%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
            style={{
              aspectRatio: '1 / 1',
              background: `radial-gradient(circle, #fffef2 0 9%, ${primaryTone} 24%, ${secondaryTone}B8 43%, ${primaryTone}28 59%, transparent 74%)`,
              boxShadow: `0 0 8px ${primaryTone}D8, 0 0 24px ${secondaryTone}72`,
              zIndex: 1,
            }}
            data-system-body="colony-star"
            data-canonical-body="true"
          />
        </>
      )}
      <span
        className="absolute inset-0 z-[2] block overflow-hidden"
        style={{
          WebkitMaskImage: artworkMask,
          maskImage: artworkMask,
        }}
        data-canonical-star-visibility={preserveCanonicalStar ? 'preserved' : undefined}
      >
        <ManifestationArtwork art={art} />
      </span>
    </>
  );
}

function StellarSystemInfrastructureField({
  starAnchor,
  stage,
  primaryTone,
  secondaryTone,
  dyad,
}: {
  starAnchor: ReturnType<typeof getCivilizationStellarAnchor>;
  stage: CivilizationSceneProgress['stage'];
  primaryTone: string;
  secondaryTone: string;
  dyad: CivilizationDyadId | null;
}) {
  const rings = [
    { width: 180, ratio: 2.65, rotation: -8, tone: primaryTone },
    { width: 265, ratio: 2.85, rotation: 7, tone: '#dfb86b' },
    { width: 355, ratio: 3.05, rotation: -4, tone: secondaryTone },
  ].slice(0, Math.max(1, stage));
  const { desktopTransform, mobileTransform } = starAnchor;

  return (
    <span
      className="civ-stellar-physical-field absolute block"
      style={{
        '--stellar-field-x': `${desktopTransform.x}%`,
        '--stellar-field-y': `${desktopTransform.y}%`,
        '--stellar-field-width': `${desktopTransform.width}%`,
        '--stellar-field-mobile-x': `${mobileTransform.x}%`,
        '--stellar-field-mobile-y': `${mobileTransform.y}%`,
        '--stellar-field-mobile-width': `${mobileTransform.width}%`,
        aspectRatio: '1 / 1',
      } as CSSProperties}
      data-system-field="physical-orbital-infrastructure"
      data-system-dyad={dyad ?? 'forming'}
      data-celestial-anchor="home-star"
      data-host-body-preserved="true"
      data-star-rendering="authored-plate"
    >
      <span
        className="absolute left-1/2 top-1/2 block w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{
          aspectRatio: '1 / 1',
          background: `radial-gradient(circle, rgba(255,255,255,0.44) 0 3%, ${primaryTone}42 17%, ${secondaryTone}19 38%, transparent 70%)`,
          filter: 'blur(1.6px)',
        }}
        data-stellar-body-reinforcement="existing-home-star"
      />
      {rings.map((ring, index) => (
        <span
          key={`${ring.width}:${ring.rotation}`}
          className="absolute left-1/2 top-1/2 block -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
          style={{
            width: `${ring.width}%`,
            aspectRatio: `${ring.ratio} / 1`,
            border: `1px solid ${ring.tone}${index === 0 ? '72' : '4A'}`,
            boxShadow: `inset 0 0 5px ${ring.tone}24, 0 0 5px ${ring.tone}18`,
            transform: `translate(-50%, -50%) rotate(${ring.rotation}deg)`,
          }}
          data-system-orbital-zone={index === 0 ? 'inner-orbit' : index === 1 ? 'habitable-band' : 'outer-network'}
        >
          <span
            className={`civ-system-orbit-light absolute left-[76%] top-[2%] block h-[5px] w-[12px] rounded-full ${index % 2 === 0 ? '' : '[animation-direction:reverse]'}`}
            style={{
              background: `linear-gradient(90deg, transparent, ${ring.tone}, #fff8d9)`,
              boxShadow: `0 0 7px ${ring.tone}`,
            }}
            data-system-traffic="orbital-transit"
          />
          <span
            className="absolute left-[18%] top-[77%] block h-[7px] w-[7px] rounded-[50%] border border-white/45 bg-[#111722]"
            style={{ boxShadow: `0 0 8px ${ring.tone}92` }}
            data-system-station="inhabited-orbital"
          />
        </span>
      ))}
    </span>
  );
}

function EnvironmentPlanetArtwork({ plate }: { plate: CivilizationPlateArtSlot }) {
  if (plate.atlasCell) {
    const { columns, rows, column, row } = plate.atlasCell;
    const backgroundPosition = `${columns <= 1 ? 50 : (column / (columns - 1)) * 100}% ${
      rows <= 1 ? 50 : 15 + (row / (rows - 1)) * 70
    }%`;
    return (
      <span
        className="absolute inset-0 block bg-no-repeat"
        style={{
          backgroundImage: `url(${plate.src})`,
          backgroundPosition,
          backgroundSize: `${columns * 100}% auto`,
          filter: 'saturate(0.96) contrast(1.05) brightness(0.9)',
          transform: 'scale(1.08)',
        }}
      />
    );
  }

  return (
    <picture className="absolute inset-0 block">
      {plate.mobileSrc && <source media="(max-width: 640px)" srcSet={plate.mobileSrc} />}
      <img
        src={plate.src}
        alt=""
        className="h-full w-full object-cover"
        style={{
          objectPosition: plate.position,
          filter: 'saturate(0.96) contrast(1.05) brightness(0.9)',
          transform: 'scale(1.14)',
        }}
        decoding="async"
        draggable={false}
      />
    </picture>
  );
}

function NestedCityRegion({
  identity,
  maturity,
  settlementPhase,
  cityDevelopmentStage,
  compact = false,
}: {
  identity: CivilizationVisualIdentity;
  maturity: CivilizationPlateMaturity;
  settlementPhase: CivilizationSceneProgress['settlementPhase'];
  cityDevelopmentStage: CivilizationCityDevelopmentStage;
  compact?: boolean;
}) {
  const committed = identity.status === 'committed' && Boolean(identity.dyad);
  if (!committed && settlementPhase === 'wilderness') return null;
  const developmentCount = CITY_DEVELOPMENT_STRUCTURE_COUNTS[cityDevelopmentStage];
  const visibleDistrictCount = compact
    ? Math.min(developmentCount, maturity === 'planetary' ? 3 : maturity === 'stellar' ? 4 : 5)
    : developmentCount;
  const primaryTone = committed ? identity.primaryTone : '#d9d5c8';
  const secondaryTone = committed ? identity.secondaryTone : '#7ea2ad';
  const orderedDistricts = orderFabricLayout(
    CITY_DISTRICT_LAYOUT,
    committed ? identity.dyad : null,
    'surface',
  );
  const fabricComposition = committed && identity.dyad
    ? CIVILIZATION_DYAD_VISUALS[identity.dyad].composition
    : 'uncommitted';
  return (
    <div
      className="absolute inset-0 overflow-visible"
      data-testid="civilization-nested-city-region"
      data-child-dyad={identity.dyad ?? 'forming'}
      data-continuity-form="physical-city-region"
      data-physical-host="terrain"
      data-construction-model="grounded-districts"
      data-nesting-density={compact ? 'compact' : 'full'}
      data-city-maturity={maturity}
      data-city-development-stage={cityDevelopmentStage}
      data-visible-districts={visibleDistrictCount}
      data-fabric-composition={fabricComposition}
    >
      <span
        className="absolute bottom-[2%] left-[5%] right-[5%] h-[34%]"
        style={{
          background: [
            `radial-gradient(circle at 22% 70%, ${primaryTone}C8 0 1.2%, transparent 3.2%)`,
            `radial-gradient(circle at 37% 56%, ${secondaryTone}B8 0 1.1%, transparent 3%)`,
            `radial-gradient(circle at 50% 62%, ${primaryTone}E0 0 1.5%, transparent 3.8%)`,
            `radial-gradient(circle at 64% 58%, ${secondaryTone}B8 0 1.1%, transparent 3%)`,
            `radial-gradient(circle at 79% 72%, ${primaryTone}C8 0 1.2%, transparent 3.2%)`,
            `radial-gradient(ellipse at 50% 68%, ${primaryTone}38 0 21%, ${secondaryTone}18 36%, rgba(3,7,11,0.62) 57%, transparent 78%)`,
          ].join(','),
          transform: 'perspective(120px) rotateX(64deg)',
          transformOrigin: '50% 100%',
          filter: 'blur(0.45px)',
        }}
        data-city-urban-footprint="inhabited-districts"
      />
      {orderedDistricts.slice(0, visibleDistrictCount).map(({ placement, x, y, scale, width }) => {
        const art = committed
          ? getCivilizationManifestationArt(identity.dyad, 'surface', placement)
          : getCivilizationNeutralSettlementArt('surface', placement);
        if (!art) return null;
        return (
          <span
            key={placement}
            className="absolute block overflow-hidden"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${width * (compact ? 0.78 : 1)}%`,
              aspectRatio: String(art.aspectRatio ?? 1),
              transform: `translate(-50%, -88%) scale(${scale * (compact ? 0.82 : 1)})`,
              transformOrigin: '50% 88%',
              filter: compact
                ? 'saturate(0.96) contrast(1.08) brightness(1.02) drop-shadow(0 2px 3px rgba(0,0,0,0.86))'
                : `saturate(1.04) contrast(1.08) brightness(1.12) drop-shadow(0 2px 3px rgba(0,0,0,0.84)) drop-shadow(0 0 4px ${primaryTone}45)`,
            }}
            data-city-district={placement}
          >
            <ManifestationArtwork art={art} />
          </span>
        );
      })}
    </div>
  );
}

function NestedPlanet({
  identity,
  cityIdentity,
  maturity,
  environmentIdentity,
  settlementPhase,
  cityDevelopmentStage,
}: {
  identity: CivilizationVisualIdentity;
  cityIdentity?: CivilizationVisualIdentity;
  maturity: CivilizationPlateMaturity;
  environmentIdentity: CivilizationEnvironmentIdentity;
  settlementPhase: CivilizationSceneProgress['settlementPhase'];
  cityDevelopmentStage: CivilizationCityDevelopmentStage;
}) {
  const committed = identity.status === 'committed' && Boolean(identity.dyad);
  if (!committed && settlementPhase === 'wilderness') return null;
  const primaryTone = committed ? identity.primaryTone : '#d9d5c8';
  const secondaryTone = committed ? identity.secondaryTone : '#7ea2ad';
  const plate = getCivilizationEnvironmentPlateArtSlot(
    'orbit',
    false,
    environmentIdentity,
    2,
    maturity,
    settlementPhase,
    committed ? identity.dyad : null,
  );
  const citySocket = getCivilizationContinuitySocket(environmentIdentity.variantId, 'orbit');
  const identityWorks = orderFabricLayout(
    ACTIVE_SETTLEMENT_LAYOUTS.orbit,
    committed ? identity.dyad : null,
    'orbit',
  ).slice(0, 2).map((entry, index) => ({
    ...entry,
    x: index === 0 ? 28 : 72,
    y: index === 0 ? 47 : 66,
    width: index === 0 ? 15 : 12,
    art: committed
      ? getCivilizationManifestationArt(identity.dyad, 'orbit', entry.placement)
      : getCivilizationNeutralSettlementArt('orbit', entry.placement),
  })).filter((entry): entry is typeof entry & { art: CivilizationManifestationArt } => (
    entry.art !== null
  ));

  return (
    <div
      className="absolute inset-0"
      data-testid="civilization-nested-planet"
      data-child-dyad={identity.dyad ?? 'forming'}
      data-continuity-form="physical-homeworld"
      data-physical-host="homeworld"
      data-construction-model="orbital-works"
      data-host-body-preserved="true"
      data-environment-variant={environmentIdentity.variantId}
      data-fabric-composition={committed && identity.dyad
        ? CIVILIZATION_DYAD_VISUALS[identity.dyad].composition
        : 'uncommitted'}
    >
      <span
        className="absolute inset-[2%] block overflow-hidden rounded-[50%]"
        style={{
          clipPath: 'circle(47% at 50% 50%)',
          WebkitMaskImage: 'radial-gradient(circle at 50% 50%, #000 0 88%, rgba(0,0,0,0.96) 94%, transparent 100%)',
          maskImage: 'radial-gradient(circle at 50% 50%, #000 0 88%, rgba(0,0,0,0.96) 94%, transparent 100%)',
          filter: `drop-shadow(0 0 7px ${primaryTone}42) drop-shadow(0 3px 5px rgba(0,0,0,0.86))`,
        }}
        data-planet-limb="physical-sphere"
      >
        <EnvironmentPlanetArtwork plate={plate} />
        <span
          className="absolute inset-0 block"
          style={{
            background: [
              'radial-gradient(circle at 34% 27%, rgba(255,255,255,0.3) 0 2%, transparent 26%)',
              'linear-gradient(118deg, transparent 0 42%, rgba(3,5,10,0.14) 58%, rgba(2,3,8,0.82) 88%, rgba(0,0,0,0.96) 100%)',
            ].join(','),
          }}
          data-planet-terminator="physical-lighting"
        />
      </span>
      <span
        className="absolute inset-[2%] block rounded-[50%]"
        style={{
          clipPath: 'circle(47% at 50% 50%)',
          border: `1px solid ${secondaryTone}66`,
          boxShadow: `inset -10px -6px 18px rgba(0,0,0,0.82), inset 4px 3px 8px ${primaryTone}2E, 0 0 5px ${secondaryTone}4A`,
        }}
        data-planet-atmosphere="authored-limb"
      />
      {identityWorks.map(({ placement, art, x, y, width }) => (
        <span
          key={placement}
          className="absolute block -translate-x-1/2 -translate-y-1/2 overflow-hidden"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            aspectRatio: String(art.aspectRatio ?? 1),
            filter: 'saturate(0.92) contrast(1.06) brightness(0.92) drop-shadow(0 2px 3px rgba(0,0,0,0.82))',
            zIndex: 2,
          }}
          data-planet-identity-work={placement}
          data-planet-dyad={identity.dyad}
        >
          <ManifestationArtwork art={art} />
        </span>
      ))}
      {cityIdentity && (cityIdentity.status === 'committed' || settlementPhase !== 'wilderness') && (
        <span
          className="absolute inset-[3%] overflow-hidden"
          data-testid="civilization-nested-planet-city-mask"
        >
          <span
            className="civ-continuity-object absolute block overflow-visible"
            style={getContinuityObjectStyle(citySocket, '2.2 / 1', 2.05)}
            data-testid="civilization-nested-planet-city-socket"
            data-city-dyad={cityIdentity.dyad ?? 'forming'}
            data-continuity-socket={citySocket.socketId}
          >
            <NestedCityRegion
              identity={cityIdentity}
              maturity={maturity}
              settlementPhase={settlementPhase}
              cityDevelopmentStage={cityDevelopmentStage}
              compact
            />
          </span>
        </span>
      )}
    </div>
  );
}

function NestedSystem({
  identity,
  planetIdentity,
  cityIdentity,
  maturity,
  environmentIdentity,
  settlementPhase,
  cityDevelopmentStage,
}: {
  identity: CivilizationVisualIdentity;
  planetIdentity?: CivilizationVisualIdentity;
  cityIdentity?: CivilizationVisualIdentity;
  maturity: CivilizationPlateMaturity;
  environmentIdentity: CivilizationEnvironmentIdentity;
  settlementPhase: CivilizationSceneProgress['settlementPhase'];
  cityDevelopmentStage: CivilizationCityDevelopmentStage;
}) {
  const committed = identity.status === 'committed' && Boolean(identity.dyad);
  if (!committed && settlementPhase === 'wilderness') return null;
  const primaryTone = committed ? identity.primaryTone : '#d9d5c8';
  const secondaryTone = committed ? identity.secondaryTone : '#7ea2ad';
  const planetSocket = getCivilizationContinuitySocket(environmentIdentity.variantId, 'stellar');
  const systemLead = orderFabricLayout(
    ACTIVE_SETTLEMENT_LAYOUTS.stellar,
    committed ? identity.dyad : null,
    'stellar',
  )[0];
  const authoredSystemStructures = (systemLead ? [
    { placement: systemLead.placement, width: 19, zIndex: 3 },
  ] : []).map((structure) => {
    const art = committed
      ? getCivilizationManifestationArt(identity.dyad, 'stellar', structure.placement)
      : getCivilizationNeutralSettlementArt('stellar', structure.placement);
    return art ? {
      ...structure,
      art,
      x: 43,
      y: 51,
    } : null;
  }).filter((structure): structure is NonNullable<typeof structure> => structure !== null);

  return (
    <div
      className="absolute inset-0 block overflow-hidden"
      data-testid="civilization-nested-system"
      data-child-dyad={identity.dyad ?? 'forming'}
      data-planet-dyad={planetIdentity?.dyad ?? undefined}
      data-city-dyad={cityIdentity?.dyad ?? undefined}
      data-continuity-form="physical-stellar-neighbourhood"
      data-colonized-system="true"
      data-physical-host="home-star"
      data-construction-model="distributed-system-infrastructure"
      data-host-body-preserved="true"
      data-fabric-composition={committed && identity.dyad
        ? CIVILIZATION_DYAD_VISUALS[identity.dyad].composition
        : 'uncommitted'}
    >
      <span
        className="absolute left-[45%] top-[53%] h-[67%] w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{
          background: `radial-gradient(ellipse at 35% 55%, ${primaryTone}16 0 12%, ${secondaryTone}0D 25%, transparent 67%)`,
          filter: 'blur(7px)',
        }}
        data-system-environment="stellar-dust"
      />
      {[
        { width: 48, ratio: 2.55, rotation: -8, tone: primaryTone },
        { width: 69, ratio: 2.8, rotation: 6, tone: secondaryTone },
        { width: 88, ratio: 3.05, rotation: -3, tone: '#d7bd84' },
      ].map((ring, index) => (
        <span
          key={`${ring.width}:${ring.rotation}`}
          className="absolute left-[43%] top-[51%] block -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
          style={{
            width: `${ring.width}%`,
            aspectRatio: `${ring.ratio} / 1`,
            border: `1px solid ${ring.tone}${index === 0 ? '64' : '3D'}`,
            boxShadow: `inset 0 0 4px ${ring.tone}1F`,
            transform: `translate(-50%, -50%) rotate(${ring.rotation}deg)`,
            zIndex: 1,
          }}
          data-inherited-system-orbit={index === 0 ? 'inner' : index === 1 ? 'habitable' : 'outer'}
        >
          <span
            className="absolute left-[16%] top-[72%] block h-[5px] w-[5px] rounded-[50%] border border-white/40 bg-[#101721]"
            style={{ boxShadow: `0 0 6px ${ring.tone}8A` }}
            data-inherited-system-station="inhabited"
          />
        </span>
      ))}
      <span
        className="absolute left-[43%] top-[51%] block w-[15%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{
          aspectRatio: '1 / 1',
          background: `radial-gradient(circle, #fff 0 8%, ${primaryTone} 23%, ${secondaryTone}72 47%, transparent 73%)`,
          boxShadow: `0 0 12px ${primaryTone}B8, 0 0 34px ${secondaryTone}58`,
          zIndex: 1,
        }}
        data-system-body="home-star"
        data-canonical-body="true"
      />
      {authoredSystemStructures.map(({ placement, art, x, y, width, zIndex }) => (
        <span
          key={placement}
          className="absolute block -translate-x-1/2 -translate-y-1/2 overflow-hidden"
          style={{
            left: `${x}%`,
            top: `${y}%`,
            width: `${width}%`,
            aspectRatio: String(art.aspectRatio ?? 1),
            zIndex,
            opacity: 1,
            filter: 'saturate(0.92) contrast(1.04) brightness(0.84) drop-shadow(0 3px 5px rgba(0,0,0,0.88))',
          }}
          data-system-infrastructure={placement}
          data-system-dyad={identity.dyad ?? 'forming'}
          data-astronomical-host="home-star"
          data-construction-model="distributed-system-infrastructure"
          data-megastructure-status="ordinary-infrastructure"
          data-host-body-preserved="true"
        >
          <StellarNeighborhoodArtwork
            art={art}
            primaryTone={primaryTone}
            secondaryTone={secondaryTone}
            preserveCanonicalStar
          />
        </span>
      ))}
      {authoredSystemStructures.length === 0 && (
        <span
          className="absolute left-[26%] top-[51%] block w-[18%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
          style={{
            aspectRatio: '1 / 1',
            background: `radial-gradient(circle at 36% 34%, #fff 0 8%, ${primaryTone} 32%, #27180f 67%, transparent 72%)`,
            boxShadow: `0 0 8px ${primaryTone}B8, 0 0 18px ${primaryTone}52`,
          }}
        />
      )}
      <span
        className="absolute left-[84%] top-[44%] block w-[4%] -translate-x-1/2 -translate-y-1/2 rounded-[50%]"
        style={{
          aspectRatio: '1 / 1',
          background: 'radial-gradient(circle at 35% 30%, rgba(255,255,255,0.9), #91a8bb 34%, #05070a 78%)',
          boxShadow: '0 0 4px rgba(145,168,187,0.42)',
          zIndex: 1,
        }}
        data-system-body="distant-planet"
      />
      {planetIdentity && (planetIdentity.status === 'committed' || settlementPhase !== 'wilderness') && (
        <span
          className="civ-continuity-object absolute block"
          style={{ ...getContinuityObjectStyle(planetSocket, '16 / 10'), zIndex: 5 }}
          data-testid="civilization-nested-system-homeworld-socket"
          data-planet-dyad={planetIdentity.dyad ?? 'forming'}
          data-continuity-socket={planetSocket.socketId}
          data-celestial-anchor="homeworld"
          data-replaces-background-body="true"
        >
          <NestedPlanet
            identity={planetIdentity}
            cityIdentity={cityIdentity}
            maturity={maturity}
            environmentIdentity={environmentIdentity}
            settlementPhase={settlementPhase}
            cityDevelopmentStage={cityDevelopmentStage}
          />
        </span>
      )}
    </div>
  );
}

function ActiveSettlementInfrastructure({
  identity,
  scene,
  progress,
  maturity,
  environmentVariantId,
  settlementAnchors,
  districtAffinityAccents,
  districtOccupancyCounts,
  districtInstances,
  residentSites,
  placementProof,
}: {
  identity: CivilizationVisualIdentity;
  scene: CivilizationSceneKind;
  progress: CivilizationSceneProgress;
  maturity: CivilizationPlateMaturity;
  environmentVariantId: CivilizationEnvironmentVariantId;
  settlementAnchors: readonly { x: number; y: number }[];
  districtAffinityAccents: Readonly<Partial<Record<ArtifactPlacementFamily, CivilizationDistrictAffinityAccent>>>;
  districtOccupancyCounts: Readonly<Partial<Record<ArtifactPlacementFamily, number>>>;
  districtInstances: readonly CivilizationDistrictInstance[];
  residentSites: readonly CivilizationDeploymentSite[];
  placementProof: boolean;
}) {
  const committed = identity.status === 'committed' && Boolean(identity.dyad);
  const neutralSettlement = !committed &&
    progress.unlocked &&
    progress.settlementPhase !== 'wilderness';
  const infrastructureRef = useRef<HTMLDivElement>(null);
  const [sceneAspectRatio, setSceneAspectRatio] = useState<number>();
  const visible = committed || neutralSettlement;
  useEffect(() => {
    const element = infrastructureRef.current;
    if (!element || scene !== 'surface' || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSceneAspectRatio(width / height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [scene, visible]);
  if (!visible) return null;

  const { stage } = progress;
  const physicalContract = getCivilizationScenePhysicalContract(scene);
  const layout = orderFabricLayout(
    ACTIVE_SETTLEMENT_LAYOUTS[scene],
    committed ? identity.dyad : null,
    scene,
  );
  const maturityCount = SETTLEMENT_COUNTS[scene][stage];
  const cityDevelopmentCount = CITY_DEVELOPMENT_STRUCTURE_COUNTS[progress.cityDevelopmentStage];
  const cityFabricCount = scene === 'surface' && committed
    ? Math.min(
        CITY_DEVELOPMENT_FABRIC_COUNTS[progress.cityDevelopmentStage],
        CITY_FABRIC_LAYOUTS[identity.dyad!].length,
      )
    : 0;
  const usesPersistentDistricts = scene === 'surface' && districtInstances.length > 0;
  const chrysalisDistrictParcels = scene === 'surface' && (
    usesPersistentDistricts || (committed && identity.dyad === 'chrysalis')
  )
    ? [...new Map([
        ...getCivilizationSurfaceDistrictParcelsForStageAndOccupancy(
          progress.cityDevelopmentStage,
          districtOccupancyCounts,
        ),
        // A persisted resident needs its host even in a low-stage thumbnail
        // where no family occupancy summary was supplied.
        ...districtInstances.flatMap((district) => getCivilizationSurfaceDistrictParcelsForFamily(district.family)
          .filter((parcel) => parcel.instance === district.instance)),
      ].map((parcel) => [parcel.id, parcel])).values()]
    : [];
  const visibleCount = Math.min(
    scene === 'surface'
      ? cityDevelopmentCount
      : scene === 'galaxy' && neutralSettlement
        ? Math.max(maturityCount, 3)
        : maturityCount,
    layout.length,
  );
  const renderedCount = Math.min(visibleCount, physicalContract.maxIdentityStructures);
  const renderedInfrastructureCount = scene === 'surface'
    ? usesPersistentDistricts
      ? chrysalisDistrictParcels.length
      : committed
        ? identity.dyad === 'chrysalis'
          ? chrysalisDistrictParcels.length
          : cityFabricCount
        : renderedCount
    : renderedCount;
  const primaryTone = committed ? identity.primaryTone : '#d7d2c3';
  const secondaryTone = committed ? identity.secondaryTone : '#7897a2';
  const environmentSockets = scene === 'surface'
    ? getCivilizationEnvironmentSocketContract(environmentVariantId)
    : [];
  const stellarAnchor = scene === 'stellar'
    ? getCivilizationStellarAnchor(environmentVariantId)
    : null;
  const settlementCenter = scene === 'surface' && settlementAnchors.length > 0
    ? {
        x: settlementAnchors.reduce((total, anchor) => total + anchor.x, 0) / settlementAnchors.length,
        y: settlementAnchors.reduce((total, anchor) => total + anchor.y, 0) / settlementAnchors.length,
      }
    : null;
  const cumulativeScale = scene === 'surface'
    ? 0.86 + progress.cityDevelopmentStage * 0.018
    : scene === 'orbit'
      ? 0.79 + stage * 0.07
      : scene === 'stellar'
        ? 0.62 + stage * 0.12
        : 0.73 + stage * 0.09;
  const fabricComposition = committed && identity.dyad
    ? CIVILIZATION_DYAD_VISUALS[identity.dyad].composition
    : 'uncommitted';
  const cityFabricRoles = committed && identity.dyad
    ? orderFabricLayout(ACTIVE_SETTLEMENT_LAYOUTS.surface, identity.dyad, 'surface')
    : [];
  const stellarFabricLayout = committed && identity.dyad
    ? STELLAR_FABRIC_OFFSETS[identity.dyad]
    : NEUTRAL_STELLAR_FABRIC_OFFSETS;
  const stellarFabricRoles = orderFabricLayout(
    ACTIVE_SETTLEMENT_LAYOUTS.stellar,
    committed ? identity.dyad : null,
    'stellar',
  );
  const galaxyColonyLayout = committed && identity.dyad
    ? GALAXY_COLONY_LAYOUTS[identity.dyad]
    : NEUTRAL_GALAXY_COLONY_LAYOUT;
  const neutralSurfaceWidthScale = progress.cityDevelopmentStage <= 1 ? 0.9 : 0.82;
  const neutralSurfaceStructureScale = progress.cityDevelopmentStage <= 1 ? 1.05 : 1;
  const usesGalacticChrysalisEntrances = scene === 'surface' &&
    environmentVariantId === 'aurora_basin' && progress.cityDevelopmentStage === 9 &&
    committed && identity.dyad === 'chrysalis';
  const cityFabricIntegratedIntoPlate = scene === 'surface' &&
    !placementProof &&
    progress.cityDevelopmentStage >= 1;
  const integratedDistrictWidthScale = cityFabricIntegratedIntoPlate
    ? progress.cityDevelopmentStage >= 9
      ? 0.54
      : progress.cityDevelopmentStage === 8
        ? 0.56
        : progress.cityDevelopmentStage === 7
          ? 0.58
          : progress.cityDevelopmentStage === 6
            ? 0.6
            : progress.cityDevelopmentStage === 5
              ? 0.64
              : progress.cityDevelopmentStage === 4
                ? 0.68
                : 0.72
    : 1;

  return (
    <div
      className="absolute inset-0"
      ref={infrastructureRef}
      data-testid="civilization-active-identity-infrastructure"
      data-identity-dyad={identity.dyad ?? undefined}
      data-identity-layer={identity.layer}
      data-visual-role="physical-settlement-growth"
      data-settlement-style={committed ? 'committed-dyad' : 'neutral-forming'}
      data-settlement-phase={progress.settlementPhase}
      data-artifact-count={progress.artifactCount}
      data-settlement-stage={stage}
      data-city-development-stage={progress.cityDevelopmentStage}
      data-city-development-label={progress.cityDevelopmentLabel}
      data-settlement-count={renderedInfrastructureCount}
      data-settlement-anchor-source={(committed || usesPersistentDistricts) && scene === 'surface'
        ? 'environment-fabric-sockets'
        : settlementCenter
          ? 'artifact-cluster'
          : 'environment-sockets'}
      data-fabric-composition={fabricComposition}
      data-physical-host={physicalContract.host}
      data-construction-model={physicalContract.constructionModel}
      data-density-model="cumulative-construction"
      data-density-stage={stage}
      data-city-fabric-layout={committed && identity.dyad ? identity.dyad : undefined}
      data-city-fabric-source="physical-district-layer"
      data-city-fabric-context={cityFabricIntegratedIntoPlate ? 'integrated-urban-fabric' : 'open-substrate'}
      data-composition-model="authored-modular-kit"
      data-surface-layout-policy={scene === 'surface'
        ? CIVILIZATION_SURFACE_LAYOUT_POLICY_VERSION
        : undefined}
      data-composite-policy="cache-when-stable"
      data-host-body-preserved={physicalContract.preservesHostBody ? 'true' : 'false'}
      data-scale-interpretation={physicalContract.scaleInterpretation}
    >
      {scene === 'surface' && (
        <>
          {neutralSettlement && !usesPersistentDistricts && settlementCenter && (
            <span
              className="absolute rounded-[50%]"
              style={{
                left: `${settlementCenter.x}%`,
                top: `${settlementCenter.y}%`,
                width: `${Math.min(66, 38 + progress.cityDevelopmentStage * 7)}%`,
                height: `${Math.min(39, 23 + progress.cityDevelopmentStage * 4)}%`,
                transform: 'translate(-50%, -66%)',
                background: [
                  `radial-gradient(ellipse at 35% 62%, ${primaryTone}22 0 8%, transparent 24%)`,
                  `radial-gradient(ellipse at 66% 60%, ${secondaryTone}1F 0 7%, transparent 23%)`,
                  'radial-gradient(ellipse at 50% 64%, rgba(6,9,12,0.52) 0 34%, rgba(4,7,10,0.3) 55%, transparent 79%)',
                ].join(','),
                WebkitMaskImage: 'radial-gradient(ellipse at center, #000 0 58%, rgba(0,0,0,0.82) 72%, transparent 100%)',
                maskImage: 'radial-gradient(ellipse at center, #000 0 58%, rgba(0,0,0,0.82) 72%, transparent 100%)',
                opacity: 0.72,
              }}
              data-city-settlement-footprint="built-environment"
            />
          )}
          {(usesPersistentDistricts || (committed && identity.dyad === 'chrysalis')) && chrysalisDistrictParcels.map((parcel) => {
            const familyParcels = getCivilizationSurfaceDistrictParcelsForFamily(parcel.family);
            const precedingCapacity = familyParcels
              .filter((candidate) => candidate.instance < parcel.instance)
              .reduce((total, candidate) => total + candidate.capacity, 0);
            const occupiedCount = districtOccupancyCounts[parcel.family] ?? 0;
            const districtInstance = districtInstances.find((district) => (
              district.family === parcel.family && district.instance === parcel.instance
            ));
            const specialist = districtInstance
              ? districtInstance.residentArtifactIds.length > 0
              : occupiedCount > precedingCapacity;
            // The finished reference already contains serviced courts in its
            // city plate. Keep unused addresses grounded without stamping a
            // miniature complete district into each reserve court.
            const emptyReserve = usesGalacticChrysalisEntrances && usesPersistentDistricts && !specialist;
            const districtDyad = districtInstance?.permanentDyad ?? (
              districtInstance ? null : identity.dyad
            );
            const entranceApron = usesGalacticChrysalisEntrances && !emptyReserve && districtDyad === 'chrysalis'
              ? DISTRICT_ENTRANCE_BY_PARCEL[parcel.id]
              : undefined;
            const art = districtDyad
              ? getCivilizationSurfaceDistrictArt(districtDyad, parcel.family, parcel.instance)
              : getCivilizationNeutralSettlementArt('surface', parcel.family);
            if (!art) return null;
            const desktopTransform = parcel.desktopTransform;
            const mobileTransform = parcel.mobileTransform;
            const physical = getArtifactPlacementPhysicalContract(parcel.family);
            const dyadVisual = districtDyad ? CIVILIZATION_DYAD_VISUALS[districtDyad] : null;
            const districtAccent = districtAffinityAccents[parcel.family];
            const districtPrimaryTone = dyadVisual
              ? AFFINITY_META[dyadVisual.affinities[0]].hex
              : specialist
                ? districtAccent?.primaryTone ?? primaryTone
                : '#aab6b7';
            const districtSecondaryTone = dyadVisual
              ? AFFINITY_META[dyadVisual.affinities[1]].hex
              : specialist
                ? districtAccent?.secondaryTone ?? secondaryTone
                : '#687779';
            const layerBase = parcel.depth === 'distance' ? 6 : parcel.depth === 'midground' ? 42 : 78;
            // Fit the full, fixed plan once per viewport. Further growth/dyad
            // multipliers would reintroduce overlaps or hide early settlements.
            const desktopPresentation = getCivilizationDistrictPresentation(parcel.id, false, sceneAspectRatio)!;
            const mobilePresentation = getCivilizationDistrictPresentation(parcel.id, true, sceneAspectRatio)!;
            return (
              <span
                key={parcel.id}
                className="civ-city-fabric-district absolute block"
                style={{
                  '--city-fabric-x': `${desktopTransform.x}%`,
                  '--city-fabric-y': `${desktopTransform.y}%`,
                  '--city-fabric-width': `${desktopPresentation.width}%`,
                  '--city-fabric-scale': '1',
                  '--city-fabric-mobile-x': `${mobileTransform.x}%`,
                  '--city-fabric-mobile-y': `${mobileTransform.y}%`,
                  '--city-fabric-mobile-width': `${mobilePresentation.width}%`,
                  '--city-fabric-mobile-scale': '1',
                  aspectRatio: '1',
                  opacity: 1,
                  filter: physical.requiredSupport === 'shore_pylons'
                    ? `saturate(${specialist ? 0.98 : 0.72}) contrast(1.06) brightness(${specialist ? 0.98 : 0.86}) drop-shadow(0 1px 1px rgba(0,0,0,0.55))`
                    : parcel.depth === 'distance'
                    ? `saturate(${specialist ? 0.98 : 0.72}) contrast(1.06) brightness(${specialist ? 0.92 : 0.78}) drop-shadow(0 3px 4px rgba(0,0,0,0.9)) drop-shadow(0 0 3px ${districtPrimaryTone}42)`
                    : `saturate(${specialist ? 1.04 : 0.76}) contrast(1.08) brightness(${specialist ? 1.02 : 0.82}) drop-shadow(0 4px 5px rgba(0,0,0,0.9)) drop-shadow(0 0 4px ${districtPrimaryTone}52) drop-shadow(0 0 2px ${districtSecondaryTone}38)`,
                  zIndex: layerBase + Math.round(desktopTransform.y / 4),
                } as CSSProperties}
                data-city-skyline-district={parcel.family}
                data-city-district-parcel={parcel.id}
                data-district-instance={parcel.instance}
                data-district-id={districtInstance?.districtId}
                data-district-dyad={districtDyad ?? 'neutral'}
                data-district-presentation={emptyReserve ? 'reserve-foundation' : specialist
                  ? districtDyad ? 'locked-dyad' : 'neutral-residents'
                  : 'generic-filler'}
                data-district-artifact-count={districtInstance?.residentArtifactIds.length ?? Math.max(0, Math.min(
                  parcel.capacity,
                  occupiedCount - precedingCapacity,
                ))}
                data-settlement-structure={parcel.family}
                data-infrastructure-role={parcel.family}
                data-city-fabric-position={`${desktopTransform.x}:${desktopTransform.y}:${desktopTransform.width}`}
                data-city-fabric-mobile-position={`${mobileTransform.x}:${mobileTransform.y}:${mobileTransform.width}`}
                data-city-fabric-intent={`${desktopTransform.x}:${desktopTransform.y}:${parcel.depth}`}
                data-fabric-depth={parcel.depth}
                data-fabric-layout="persistent-district-first"
                data-district-sizing="socket-fit-with-corridors"
                data-fabric-socket={parcel.id}
                data-fabric-grounding="district-master-plan"
                data-substrate={physical.substrate}
                data-required-support={physical.requiredSupport}
                data-structural-adaptation="native-grounding"
                data-physical-validity="authored"
                data-construction-phase={getCityConstructionPhase(progress.cityDevelopmentStage)}
                data-city-technology-maturity={maturity}
                data-district-affinity-composition={specialist
                  ? districtInstance
                    ? districtInstance.foundingAffinities.join('+') || 'single-affinity-neutral'
                    : districtAccent?.composition ?? 'dyad-default'
                  : 'generic-city-fabric'}
              >
                <CityDistrictPhysicalSupport
                  mode={physical.requiredSupport}
                  shoreSupportDepth={parcel.shoreSupportDepth}
                  shoreSpillway={!emptyReserve && districtDyad === 'chrysalis'}
                  entranceApron={entranceApron}
                />
                {!emptyReserve && <span
                  className="absolute inset-0 z-[1] block overflow-hidden"
                  style={{ clipPath: getCityFabricTerrainClipPath(parcel.depth, physical.requiredSupport) }}
                  data-city-district-terrain-occlusion={parcel.depth === 'foreground' || physical.requiredSupport === 'shore_pylons' ? 'architecture' : 'terrain'}
                >
                  {physical.requiredSupport !== 'shore_pylons' && (
                    <span className={`absolute left-[8%] right-[8%] rounded-[50%] bg-black/55 blur-[2px] ${entranceApron
                      ? 'bottom-[7%] h-[7%]'
                      : 'bottom-[2%] h-[12%]'}`} />
                  )}
                  <ManifestationArtwork art={art} />
                </span>}
                {districtInstance && (
                  <CivilizationDistrictResidents district={districtInstance} sites={residentSites} />
                )}
              </span>
            );
          })}
          {committed && identity.dyad && identity.dyad !== 'chrysalis' && !usesPersistentDistricts && progress.cityDevelopmentStage >= 1 && CITY_FABRIC_LAYOUTS[identity.dyad]
            .slice(0, cityFabricCount).map((district, index) => {
            const placement = cityFabricRoles[index]?.placement;
            if (!placement) return null;
            const art = getCivilizationManifestationArt(identity.dyad!, 'surface', placement);
            if (!art) return null;
            const fabricSocket = selectCityFabricSocket(environmentSockets, placement, district);
            const desktopTransform = fabricSocket?.desktopTransform ?? {
              x: district.x,
              y: district.y,
              scale: district.depth === 'distance' ? 0.52 : 0.72,
            };
            const mobileTransform = fabricSocket?.mobileTransform ?? {
              x: district.x,
              y: district.y,
              scale: desktopTransform.scale * 0.9,
            };
            const fabricDepth = fabricSocket?.depth ?? district.depth;
            const fabricY = desktopTransform.y;
            const districtWidthScale = art.atlas
              ? fabricDepth === 'distance' ? 0.96 : fabricDepth === 'midground' ? 1.08 : 1.16
              : fabricDepth === 'distance' ? 1.08 : fabricDepth === 'midground' ? 1.2 : 1.28;
            const districtDepthScale = art.atlas
              ? fabricDepth === 'distance' ? 0.9 : fabricDepth === 'midground' ? 0.98 : 1.04
              : fabricDepth === 'distance' ? 0.9 : fabricDepth === 'midground' ? 1 : 1.06;
            const constructionScale = CITY_DEVELOPMENT_STRUCTURE_SCALE[progress.cityDevelopmentStage];
            const maturityScale = CITY_MATURITY_STRUCTURE_SCALE[maturity];
            const constructionPhase = getCityConstructionPhase(progress.cityDevelopmentStage);
            const displayWidth = district.width * districtWidthScale * integratedDistrictWidthScale;
            const displayScale = art.scale * districtDepthScale * constructionScale * maturityScale;
            const mobileWidthScale = cityFabricIntegratedIntoPlate ? 1.05 : 0.9;
            const mobileStructureScale = cityFabricIntegratedIntoPlate ? 0.98 : 0.9;
            const supportMode = fabricSocket?.requiredSupport ?? 'district_foundation';
            const layerBase = fabricDepth === 'distance' ? 6 : fabricDepth === 'midground' ? 42 : 78;
            const districtAccent = districtAffinityAccents[placement];
            const districtPrimaryTone = districtAccent?.primaryTone ?? primaryTone;
            const districtSecondaryTone = districtAccent?.secondaryTone ?? secondaryTone;
            return (
              <span
                key={`fabric:${placement}:${index}`}
                className="civ-city-fabric-district absolute block"
                style={{
                  '--city-fabric-x': `${desktopTransform.x}%`,
                  '--city-fabric-y': `${desktopTransform.y}%`,
                  '--city-fabric-width': `${displayWidth}%`,
                  '--city-fabric-scale': String(displayScale),
                  '--city-fabric-mobile-x': `${mobileTransform.x}%`,
                  '--city-fabric-mobile-y': `${mobileTransform.y}%`,
                  '--city-fabric-mobile-width': `${displayWidth * mobileWidthScale}%`,
                  '--city-fabric-mobile-scale': String(displayScale * mobileStructureScale),
                  aspectRatio: String(art.aspectRatio ?? 1),
                  opacity: 1,
                  filter: supportMode === 'shore_pylons'
                    ? 'saturate(0.94) contrast(1.07) brightness(0.94) drop-shadow(0 1px 1px rgba(0,0,0,0.55))'
                    : fabricDepth === 'distance'
                    ? `saturate(0.94) contrast(1.07) brightness(0.88) drop-shadow(0 3px 4px rgba(0,0,0,0.9)) drop-shadow(0 0 3px ${districtPrimaryTone}52)`
                    : `saturate(1.02) contrast(1.09) brightness(1.02) drop-shadow(0 4px 5px rgba(0,0,0,0.9)) drop-shadow(0 0 4px ${districtPrimaryTone}62) drop-shadow(0 0 2px ${districtSecondaryTone}48)`,
                  zIndex: layerBase + Math.round(fabricY / 4),
                } as CSSProperties}
                data-city-skyline-district={placement}
                data-settlement-structure={placement}
                data-infrastructure-role={placement}
                data-city-fabric-position={`${desktopTransform.x}:${fabricY}:${displayWidth}`}
                data-city-fabric-mobile-position={`${mobileTransform.x}:${mobileTransform.y}:${displayWidth * mobileWidthScale}`}
                data-city-fabric-intent={`${district.x}:${district.y}:${district.depth}`}
                data-fabric-depth={fabricDepth}
                data-fabric-layout={identity.dyad}
                data-fabric-socket={fabricSocket?.socketId}
                data-fabric-grounding={fabricSocket ? 'environment-authored' : 'layout-fallback'}
                data-substrate={fabricSocket?.substrate}
                data-required-support={supportMode}
                data-structural-adaptation={fabricSocket?.structuralAdaptation ?? 'native-grounding'}
                data-physical-validity={fabricSocket?.physicalValidation ?? 'authored'}
                data-construction-phase={constructionPhase}
                data-city-technology-maturity={maturity}
                data-district-affinity-composition={districtAccent?.composition ?? 'dyad-default'}
              >
                <CityDistrictPhysicalSupport mode={supportMode} />
                <span
                  className="absolute inset-0 z-[1] block overflow-hidden"
                  style={{ clipPath: getCityFabricTerrainClipPath(fabricDepth, supportMode) }}
                  data-city-district-terrain-occlusion={supportMode === 'shore_pylons' ? 'architecture' : fabricSocket?.occlusion ?? 'terrain'}
                >
                  {supportMode !== 'shore_pylons' && (
                    <span className="absolute bottom-[2%] left-[8%] right-[8%] h-[12%] rounded-[50%] bg-black/55 blur-[2px]" />
                  )}
                  <ManifestationArtwork art={art} />
                </span>
              </span>
            );
          })}
        </>
      )}
      {scene === 'orbit' && stage >= 1 && (
        <span
          className="absolute bottom-[8%] left-[10%] h-[34%] w-[64%] rounded-[50%]"
          style={{
            background: getPlanetLightPattern(committed ? identity.dyad : null)
              .map((point, index) => `radial-gradient(circle at ${point.x}% ${point.y}%, ${index % 2 === 0 ? primaryTone : secondaryTone} 0 0.8%, transparent 2%)`)
              .join(','),
            filter: `drop-shadow(0 0 4px ${primaryTone})`,
            opacity: 0.68 + stage * 0.1,
            transform: 'rotate(-9deg)',
          }}
          data-planetary-settlement-lights="inhabited-regions"
        />
      )}
      {scene === 'stellar' && stellarAnchor && stage >= 1 && (
        <StellarSystemInfrastructureField
          starAnchor={stellarAnchor}
          stage={stage}
          primaryTone={primaryTone}
          secondaryTone={secondaryTone}
          dyad={identity.dyad}
        />
      )}
      {(scene === 'surface' && (committed || usesPersistentDistricts)
        ? []
        : layout.slice(0, renderedCount)).map(({ placement, xOffset, yOffset, width, scale }, index) => {
        const physicalSourceScene = scene === 'galaxy' ? 'stellar' : scene;
        const physicalSourcePlacement = scene === 'galaxy'
          ? stellarFabricRoles[index % stellarFabricRoles.length]?.placement ?? 'inner_system'
          : placement;
        const art = committed
          ? getCivilizationManifestationArt(identity.dyad, physicalSourceScene, physicalSourcePlacement)
          : getCivilizationNeutralSettlementArt(physicalSourceScene, physicalSourcePlacement);
        if (!art) return null;
        const neutralSocket = neutralSettlement
          ? environmentSockets.find((socket) => (
              socket.nativeScene === 'surface' &&
              socket.semanticRole === placement &&
              socket.socketId.endsWith(':0')
            ))
          : null;
        const identitySocket = committed && scene === 'surface'
          ? environmentSockets.find((socket) => (
              socket.nativeScene === 'surface' &&
              socket.semanticRole === placement &&
              socket.socketId.endsWith(':0')
            ))
          : null;
        const useSurfaceCluster = neutralSettlement && scene === 'surface';
        const neutralOffset = NEUTRAL_SETTLEMENT_CLUSTER_OFFSETS[index] ?? { x: 0, y: 0 };
        const stellarOffset = scene === 'stellar' ? stellarFabricLayout[index] : null;
        const galaxyAnchor = scene === 'galaxy' ? galaxyColonyLayout[index] : null;
        const stellarDesktop = stellarAnchor && stellarOffset
          ? {
              x: Math.min(92, Math.max(8, stellarAnchor.desktopTransform.x + stellarOffset.x)),
              y: Math.min(90, Math.max(12, stellarAnchor.desktopTransform.y + stellarOffset.y)),
              width: index === 0
                ? stellarAnchor.desktopTransform.width * stellarOffset.width
                : stellarOffset.width,
            }
          : null;
        const stellarMobile = stellarAnchor && stellarOffset
          ? {
              x: Math.min(92, Math.max(8, stellarAnchor.mobileTransform.x + stellarOffset.mobileX)),
              y: Math.min(90, Math.max(12, stellarAnchor.mobileTransform.y + stellarOffset.mobileY)),
              width: index === 0
                ? stellarAnchor.mobileTransform.width * stellarOffset.mobileWidth
                : stellarOffset.mobileWidth,
            }
          : null;
        const anchor = galaxyAnchor ?? stellarDesktop ?? identitySocket?.desktopTransform ?? settlementCenter ?? neutralSocket?.desktopTransform ?? art.anchor;
        const anchored = Boolean(galaxyAnchor || stellarDesktop || identitySocket);
        const x = Math.min(92, Math.max(8, anchor.x + (anchored ? 0 : useSurfaceCluster ? neutralOffset.x : xOffset)));
        const y = Math.min(90, Math.max(12, anchor.y + (anchored ? 0 : useSurfaceCluster ? neutralOffset.y : yOffset)));
        const depthScale = identitySocket?.depth === 'distance' ? 0.7 : identitySocket?.depth === 'midground' ? 0.84 : 1;
        const renderWidth = galaxyAnchor
          ? galaxyAnchor.width * 1.15
          : stellarDesktop?.width ?? (useSurfaceCluster ? width * neutralSurfaceWidthScale : width * depthScale);
        const compositionDepth = galaxyAnchor?.depth ?? stellarOffset?.depth ?? identitySocket?.depth;
        const compositionZ = compositionDepth === 'foreground' ? 5 : compositionDepth === 'midground' ? 4 : 3;
        const visualScale = scene === 'galaxy'
          ? scale * cumulativeScale * 0.88
          : art.scale * scale * cumulativeScale * (useSurfaceCluster ? neutralSurfaceStructureScale : 1);
        return (
          <span
            key={placement}
            className={`civ-settlement-structure absolute block overflow-hidden ${
              scene === 'galaxy' ? 'civ-galaxy-colony-system' : ''
            } ${scene === 'stellar' ? 'civ-stellar-primary-anchor' : ''}`}
            style={{
              left: scene === 'galaxy' || scene === 'stellar' ? undefined : `${x}%`,
              top: scene === 'galaxy' || scene === 'stellar' ? undefined : `${y}%`,
              width: scene === 'galaxy' || scene === 'stellar' ? undefined : `${renderWidth}%`,
              '--galaxy-colony-x': `${x}%`,
              '--galaxy-colony-y': `${y}%`,
              '--galaxy-colony-width': `${renderWidth}%`,
              '--galaxy-colony-mobile-x': `${galaxyAnchor?.mobileX ?? x}%`,
              '--galaxy-colony-mobile-y': `${galaxyAnchor?.mobileY ?? y}%`,
              '--galaxy-colony-mobile-width': `${galaxyAnchor ? galaxyAnchor.mobileWidth * 1.08 : renderWidth}%`,
              '--stellar-anchor-x': `${stellarDesktop?.x ?? x}%`,
              '--stellar-anchor-y': `${stellarDesktop?.y ?? y}%`,
              '--stellar-anchor-width': `${stellarDesktop?.width ?? renderWidth}%`,
              '--stellar-mobile-anchor-x': `${stellarMobile?.x ?? x}%`,
              '--stellar-mobile-anchor-y': `${stellarMobile?.y ?? y}%`,
              '--stellar-mobile-anchor-width': `${stellarMobile?.width ?? renderWidth}%`,
              aspectRatio: String(art.aspectRatio ?? 1),
              transform: `translate(-50%, ${scene === 'surface' ? '-88%' : '-50%'}) scale(${visualScale})`,
              transformOrigin: scene === 'surface' ? '50% 88%' : '50% 50%',
              opacity: 1,
              zIndex: scene === 'surface' ? Math.round(y) : compositionZ,
              clipPath: identitySocket?.occlusion === 'terrain'
                ? 'polygon(0 0, 100% 0, 100% 94%, 82% 90%, 64% 96%, 43% 92%, 25% 97%, 0 92%)'
                : undefined,
              WebkitMaskImage: useSurfaceCluster
                ? 'linear-gradient(to bottom, #000 0 56%, rgba(0,0,0,0.88) 69%, rgba(0,0,0,0.3) 82%, transparent 96%)'
                : undefined,
              maskImage: useSurfaceCluster
                ? 'linear-gradient(to bottom, #000 0 56%, rgba(0,0,0,0.88) 69%, rgba(0,0,0,0.3) 82%, transparent 96%)'
                : undefined,
              filter: scene === 'surface'
                ? identitySocket?.depth === 'distance'
                  ? 'saturate(0.78) contrast(1.02) brightness(0.68) blur(0.2px) drop-shadow(0 3px 4px rgba(0,0,0,0.82))'
                  : identitySocket?.depth === 'midground'
                    ? 'saturate(0.88) contrast(1.06) brightness(0.78) drop-shadow(0 4px 5px rgba(0,0,0,0.86))'
                    : 'saturate(0.96) contrast(1.09) brightness(0.88) drop-shadow(0 4px 5px rgba(0,0,0,0.9))'
                : scene === 'galaxy'
                  ? `saturate(1.02) contrast(1.1) brightness(0.94) drop-shadow(0 2px 5px rgba(0,0,0,0.9)) drop-shadow(0 0 5px ${primaryTone}4A)`
                  : `saturate(1.02) contrast(1.08) brightness(0.96) drop-shadow(0 3px 5px rgba(0,0,0,0.86)) drop-shadow(0 0 4px ${primaryTone}45)`,
            } as CSSProperties}
            data-infrastructure-role={placement}
            data-infrastructure-source-scene={scene}
            data-infrastructure-source-placement={physicalSourcePlacement}
            data-settlement-structure={placement}
            data-fabric-composition={fabricComposition}
            data-fabric-depth={compositionDepth}
            data-fabric-socket={identitySocket?.socketId}
            data-structural-adaptation={identitySocket?.structuralAdaptation}
            data-astronomical-host={physicalContract.host}
            data-construction-model={physicalContract.constructionModel}
            data-host-body-preserved={physicalContract.preservesHostBody ? 'true' : 'false'}
            data-scale-interpretation={physicalContract.scaleInterpretation}
            data-stellar-development={scene === 'stellar' ? 'relay-habitat-network' : undefined}
            data-celestial-anchor={scene === 'stellar' ? index === 0 ? 'home-star' : 'system-orbit' : undefined}
            data-megastructure-status={scene === 'stellar' ? 'ordinary-infrastructure' : undefined}
            data-colonized-system={scene === 'galaxy' ? 'true' : undefined}
            data-galactic-region-scale={scene === 'galaxy' ? 'stellar-neighborhood' : undefined}
            data-system-dyad={scene === 'galaxy' ? identity.dyad ?? 'forming' : undefined}
            data-colony-layout={scene === 'galaxy' ? `${galaxyAnchor?.x}:${galaxyAnchor?.y}:${galaxyAnchor?.width}` : undefined}
            data-colony-depth={scene === 'galaxy' ? galaxyAnchor?.depth : undefined}
            data-colony-system-source={scene === 'galaxy' ? 'physical-stellar-manifestation' : undefined}
          >
            {scene === 'surface' && (
              <span className={`absolute bottom-[2%] rounded-[50%] bg-black/55 ${
                useSurfaceCluster
                  ? 'left-[18%] right-[18%] h-[8%] blur-[3px]'
                  : 'left-[10%] right-[10%] h-[12%] blur-[2px]'
              }`} />
            )}
            {scene === 'stellar' || scene === 'galaxy' ? (
              <StellarNeighborhoodArtwork
                art={art}
                primaryTone={primaryTone}
                secondaryTone={secondaryTone}
                compact={scene === 'galaxy'}
                preserveCanonicalStar={scene === 'stellar' && index === 0}
                renderLocalStar={scene === 'galaxy'}
              />
            ) : (
              <ManifestationArtwork art={art} />
            )}
          </span>
        );
      })}
    </div>
  );
}

const CONTINUITY_STYLES = `
  @keyframes civSystemTraffic {
    0%, 100% {
      opacity: 0.28;
      transform: translate3d(-4px, 0, 0);
    }
    50% {
      opacity: 1;
      transform: translate3d(5px, 0, 0);
    }
  }
  .civ-galaxy-colony-system {
    left: var(--galaxy-colony-x);
    top: var(--galaxy-colony-y);
    width: var(--galaxy-colony-width);
  }
  .civ-stellar-physical-field {
    left: var(--stellar-field-x);
    top: var(--stellar-field-y);
    width: var(--stellar-field-width);
    transform: translate(-50%, -50%);
    z-index: 1;
  }
  .civ-system-orbit-light {
    animation: civSystemTraffic 7.5s ease-in-out infinite;
  }
  .civ-stellar-primary-anchor {
    left: var(--stellar-anchor-x);
    top: var(--stellar-anchor-y);
    width: var(--stellar-anchor-width);
  }
  .civ-city-fabric-district {
    left: var(--city-fabric-x);
    top: var(--city-fabric-y);
    width: var(--city-fabric-width);
    transform: translate(-50%, -94%) scale(var(--city-fabric-scale));
    transform-origin: 50% 94%;
  }
  .civ-continuity-compact .civ-city-fabric-district {
    left: var(--city-fabric-mobile-x);
    top: var(--city-fabric-mobile-y);
    width: var(--city-fabric-mobile-width);
    transform: translate(-50%, -94%) scale(var(--city-fabric-mobile-scale));
  }
  .civ-continuity-object {
    left: var(--continuity-x);
    top: var(--continuity-y);
    width: var(--continuity-width);
    transform: translate(-50%, -50%) rotate(var(--continuity-rotation)) scale(var(--continuity-scale));
    transform-origin: 50% 50%;
  }
  [data-civilization-motion="paused"] .civ-system-orbit-light {
    animation: none;
  }
  @media (max-width: 640px) {
    .civ-galaxy-colony-system {
      left: var(--galaxy-colony-mobile-x);
      top: var(--galaxy-colony-mobile-y);
      width: var(--galaxy-colony-mobile-width);
    }
    .civ-stellar-primary-anchor {
      left: var(--stellar-mobile-anchor-x);
      top: var(--stellar-mobile-anchor-y);
      width: var(--stellar-mobile-anchor-width);
    }
    .civ-city-fabric-district {
      left: var(--city-fabric-mobile-x);
      top: var(--city-fabric-mobile-y);
      width: var(--city-fabric-mobile-width);
      transform: translate(-50%, -94%) scale(var(--city-fabric-mobile-scale));
    }
    .civ-stellar-physical-field {
      left: var(--stellar-field-mobile-x);
      top: var(--stellar-field-mobile-y);
      width: var(--stellar-field-mobile-width);
    }
    .civ-system-orbit-light {
      animation: none;
    }
    .civ-continuity-object {
      left: var(--continuity-mobile-x);
      top: var(--continuity-mobile-y);
      width: var(--continuity-mobile-width);
      transform: translate(-50%, -50%) rotate(var(--continuity-mobile-rotation)) scale(var(--continuity-mobile-scale));
    }
  }
`;

function getContinuityObjectStyle(
  socket: ReturnType<typeof getCivilizationContinuitySocket>,
  aspectRatio: CSSProperties['aspectRatio'],
  widthScale = 1,
): CSSProperties {
  const desktop = socket.desktopTransform;
  const mobile = socket.mobileTransform;
  return {
    '--continuity-x': `${desktop.x}%`,
    '--continuity-y': `${desktop.y}%`,
    '--continuity-width': `${desktop.width * widthScale}%`,
    '--continuity-rotation': `${desktop.rotation}deg`,
    '--continuity-scale': desktop.scale,
    '--continuity-mobile-x': `${mobile.x}%`,
    '--continuity-mobile-y': `${mobile.y}%`,
    '--continuity-mobile-width': `${mobile.width * widthScale}%`,
    '--continuity-mobile-rotation': `${mobile.rotation}deg`,
    '--continuity-mobile-scale': mobile.scale,
    aspectRatio,
  } as CSSProperties;
}

export function CivilizationIdentityContinuityLayer({
  scene,
  identities,
  progress,
  maturity,
  compact = false,
  bakedIntoPlate = false,
  environmentVariantId = 'aurora_basin',
  settlementAnchors = [],
  districtAffinityAccents = {},
  districtOccupancyCounts = {},
  districtInstances = [],
  residentSites = [],
  placementProof = false,
}: {
  scene: CivilizationSceneKind;
  identities: Record<CivilizationSceneKind, CivilizationVisualIdentity>;
  progress: CivilizationSceneProgress;
  maturity: CivilizationPlateMaturity;
  compact?: boolean;
  bakedIntoPlate?: boolean;
  environmentVariantId?: CivilizationEnvironmentVariantId;
  settlementAnchors?: readonly { x: number; y: number }[];
  districtAffinityAccents?: Readonly<Partial<Record<ArtifactPlacementFamily, CivilizationDistrictAffinityAccent>>>;
  districtOccupancyCounts?: Readonly<Partial<Record<ArtifactPlacementFamily, number>>>;
  districtInstances?: readonly CivilizationDistrictInstance[];
  residentSites?: readonly CivilizationDeploymentSite[];
  placementProof?: boolean;
}) {
  const activeIdentity = identities[scene];
  const predecessorScene = PREDECESSOR_SCENE[scene];
  const predecessorIdentity = predecessorScene ? identities[predecessorScene] : null;
  const socket = predecessorIdentity && scene !== 'surface'
    ? getCivilizationContinuitySocket(environmentVariantId, scene)
    : null;
  const environmentIdentity = createCivilizationEnvironmentIdentity(
    `continuity:${environmentVariantId}`,
    environmentVariantId,
  );
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[7] overflow-hidden ${compact ? 'civ-continuity-compact' : ''}`}
      data-testid="civilization-identity-continuity"
      data-active-layer={activeIdentity.layer ?? undefined}
      data-active-status={activeIdentity.status}
      data-active-dyad={activeIdentity.dyad ?? undefined}
      data-history-layer={predecessorIdentity?.layer ?? undefined}
      data-history-dyad={predecessorIdentity?.dyad ?? undefined}
      data-complexity-stage={progress.stage}
      data-city-development-stage={progress.cityDevelopmentStage}
      data-city-development-label={progress.cityDevelopmentLabel}
      data-continuity-mode="physical-nesting"
      data-continuity-source="layered-physical-objects"
      data-composition-model="authored-modular-kit"
      data-composite-policy="cache-when-stable"
      data-identity-rendering={bakedIntoPlate ? 'baked-terminal-plate' : 'modular-layers'}
      data-continuity-socket={socket?.socketId}
      style={{ contain: 'layout paint style', isolation: 'isolate' }}
      aria-hidden="true"
    >
      <style>{CONTINUITY_STYLES}</style>
      <style>{CIVILIZATION_DISTRICT_RESIDENT_STYLES}</style>
      {!bakedIntoPlate && (
        <ActiveSettlementInfrastructure
          identity={activeIdentity}
          scene={scene}
          progress={progress}
          maturity={maturity}
          environmentVariantId={environmentVariantId}
          settlementAnchors={settlementAnchors}
          districtAffinityAccents={districtAffinityAccents}
          districtOccupancyCounts={districtOccupancyCounts}
          districtInstances={districtInstances}
          residentSites={residentSites}
          placementProof={placementProof}
        />
      )}
      {predecessorIdentity && socket && (
        <div
          className="civ-continuity-object absolute"
          style={{
            ...getContinuityObjectStyle(
              socket,
              scene === 'orbit' ? '2.2 / 1' : scene === 'stellar' ? '1 / 1' : '1.45 / 1',
              scene === 'orbit' ? 1.28 : 1,
            ),
            zIndex: socket.depth === 'foreground' ? 9 : socket.depth === 'midground' ? 7 : 5,
          }}
          data-celestial-anchor={scene === 'stellar' ? 'homeworld' : undefined}
          data-replaces-background-body={scene === 'stellar' ? 'true' : undefined}
        >
          {scene === 'orbit' && (
            <NestedCityRegion
              identity={predecessorIdentity}
              maturity={maturity}
              settlementPhase={progress.settlementPhase}
              cityDevelopmentStage={progress.cityDevelopmentStage}
              compact
            />
          )}
          {scene === 'stellar' && (
            <NestedPlanet
              identity={predecessorIdentity}
              cityIdentity={identities.surface}
              maturity={maturity}
              environmentIdentity={environmentIdentity}
              settlementPhase={progress.settlementPhase}
              cityDevelopmentStage={progress.cityDevelopmentStage}
            />
          )}
          {scene === 'galaxy' && (
            <NestedSystem
              identity={predecessorIdentity}
              planetIdentity={identities.orbit}
              cityIdentity={identities.surface}
              maturity={maturity}
              environmentIdentity={environmentIdentity}
              settlementPhase={progress.settlementPhase}
              cityDevelopmentStage={progress.cityDevelopmentStage}
            />
          )}
        </div>
      )}
    </div>
  );
}
