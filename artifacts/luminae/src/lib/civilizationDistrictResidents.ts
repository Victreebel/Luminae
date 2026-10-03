import type { CivilizationDistrictInstance } from '@workspace/api-client-react';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';
import {
  CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS,
  getCivilizationDistrictPresentation,
} from '@/lib/civilizationDistrictPresentation';
import { getCivilizationSurfaceDistrictParcelsForFamily } from '@/lib/civilizationSurfaceDistrictPlan';
import residentAtlas from '@/assets/civilization/manifestations/artifacts/residents/proof-service-bays-v2.webp';
import civicResidentAtlas from '@/assets/civilization/manifestations/artifacts/residents/civic-service-bays-v1.webp';
import sensorBiosphereResidentAtlas from '@/assets/civilization/manifestations/artifacts/residents/sensor-biosphere-service-bays-v2.webp';

interface ResidentArt {
  src: string;
  atlasSize: { width: number; height: number };
  /** Explicit pixel crops retain each complete unit where atlas spacing varies. */
  crop: { x: number; y: number; width: number; height: number };
  groundLine: number;
}

function residentArt(x: number, y: number, width: number, ground: number): ResidentArt {
  return {
    src: residentAtlas,
    atlasSize: { width: 1536, height: 1024 },
    crop: { x, y, width, height: 512 }, groundLine: ground / 512,
  };
}

function civicResidentArt(column: number, ground: number): ResidentArt {
  return {
    src: civicResidentAtlas,
    atlasSize: { width: 1774, height: 887 },
    crop: { x: column * 887, y: 0, width: 887, height: 887 },
    groundLine: ground / 887,
  };
}

function sensorBiosphereResidentArt(column: number, row: number, ground: number): ResidentArt {
  return {
    src: sensorBiosphereResidentAtlas,
    atlasSize: { width: 1536, height: 1024 },
    crop: { x: column * 512, y: row * 512, width: 512, height: 512 },
    groundLine: ground / 512,
  };
}

const RESIDENT_ART: Readonly<Record<string, ResidentArt>> = {
  t1r01: residentArt(0, 0, 512, 485),
  t1r07: residentArt(512, 0, 498, 499),
  t1o05: residentArt(1010, 0, 526, 504),
  t1s03: residentArt(0, 512, 512, 403),
  t1s05: residentArt(512, 512, 512, 436),
  t1o01: residentArt(1024, 512, 512, 431),
  t1s04: civicResidentArt(0, 740),
  t1o08: civicResidentArt(1, 752),
  t1s01: sensorBiosphereResidentArt(0, 0, 501),
  t1o07: sensorBiosphereResidentArt(1, 0, 491),
  t1e02: sensorBiosphereResidentArt(2, 0, 499),
  t1o03: sensorBiosphereResidentArt(0, 1, 425),
  t1o06: sensorBiosphereResidentArt(1, 1, 431),
  t1s08: sensorBiosphereResidentArt(2, 1, 447),
};

// Stable slots inside the already fitted district, leaving all external roads
// and corridors untouched. Forge order, not operational state, owns a slot.
export const CIVILIZATION_DISTRICT_RESIDENT_SLOTS = [
  { x: 19, groundY: 84, width: 28 },
  { x: 81, groundY: 84, width: 28 },
  { x: 50, groundY: 94, width: 28 },
] as const;

export function getCivilizationDistrictResidents(
  district: CivilizationDistrictInstance,
  sites: readonly CivilizationDeploymentSite[],
) {
  const parcel = getCivilizationSurfaceDistrictParcelsForFamily(district.family)
    .find(({ instance }) => instance === district.instance);
  if (!parcel) return [];
  return [...new Set(district.residentArtifactIds)].slice(0, district.hardCapacity)
    .flatMap((artifactId, slotIndex) => {
      const art = RESIDENT_ART[artifactId];
      const slot = CIVILIZATION_DISTRICT_RESIDENT_SLOTS[slotIndex];
      const site = sites.find((candidate) => candidate.kind === 'artifact' && candidate.artifactId === artifactId);
      if (!art || !slot || !site) return [];
      return [{ artifactId, site, slot, slotIndex, art, parcelId: parcel.id, districtId: district.districtId }];
    });
}

export function getCivilizationDistrictResidentWorldAnchor(
  resident: ReturnType<typeof getCivilizationDistrictResidents>[number],
  compact: boolean,
  aspectRatio = CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS[compact ? 'compact' : 'desktop'],
) {
  const presentation = getCivilizationDistrictPresentation(resident.parcelId, compact, aspectRatio)!;
  return {
    x: presentation.bounds.minX + presentation.width * resident.slot.x / 100,
    y: presentation.bounds.minY + presentation.width * aspectRatio * resident.slot.groundY / 100,
  };
}
