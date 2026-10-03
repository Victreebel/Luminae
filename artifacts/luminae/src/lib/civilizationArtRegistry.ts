import type {
  BlueprintId,
  CivilizationDyadId,
  CivilizationEnvironmentIdentity,
} from '@workspace/game-types';
import {
  CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID,
  CIVILIZATION_ENVIRONMENT_VARIANTS,
  createCivilizationEnvironmentIdentity,
} from '@workspace/game-types';
import type {
  ArtifactSceneTreatment,
  CivilizationDeploymentSite,
} from '@/lib/civilizationDeploymentSites';
import type { CivilizationArchetypeId } from '@/lib/civilizationArchetypes';
import type { CivilizationPlateMaturity } from '@/lib/civilizationDyadEvolutionPlateManifest';
import type {
  CivilizationCityDevelopmentStage,
  CivilizationComplexityStage,
  CivilizationSettlementPhase,
} from '@/lib/civilizationVisualState';
import auroraBasinSubstrateAtlasUrl from '@/assets/civilization/environments/aurora-basin-substrate-atlas-v2.webp';
import auroraBasinSurfaceUrl from '@/assets/civilization/environments/growth/aurora-basin-empty-desktop-v1.webp';
import auroraBasinSurfaceMobileUrl from '@/assets/civilization/environments/growth/aurora-basin-empty-mobile-v1.webp';
import auroraBasinSparseCityUrl from '@/assets/civilization/environments/growth/aurora-basin-sparse-desktop-v1.webp';
import auroraBasinSparseCityMobileUrl from '@/assets/civilization/environments/growth/aurora-basin-sparse-mobile-v1.webp';
import auroraBasinYoungCityUrl from '@/assets/civilization/environments/growth/aurora-basin-young-desktop-v1.webp';
import auroraBasinYoungCityMobileUrl from '@/assets/civilization/environments/growth/aurora-basin-young-mobile-v1.webp';
import auroraBasinYoungChrysalisCityUrl from '@/assets/civilization/environments/growth/aurora-basin-young-chrysalis-desktop-v1.webp';
import auroraBasinYoungChrysalisCityMobileUrl from '@/assets/civilization/environments/growth/aurora-basin-young-chrysalis-mobile-v1.webp';
import auroraBasinYoungEchoCityUrl from '@/assets/civilization/environments/growth/aurora-basin-young-echo-desktop-v1.webp';
import auroraBasinYoungEchoCityMobileUrl from '@/assets/civilization/environments/growth/aurora-basin-young-echo-mobile-v1.webp';
import auroraBasinStellarCityUrl from '@/assets/civilization/environments/growth/aurora-basin-stellar-neutral-desktop-v1.webp';
import auroraBasinStellarCityMobileUrl from '@/assets/civilization/environments/growth/aurora-basin-stellar-neutral-mobile-v1.webp';
import auroraBasinStellarChrysalisCityUrl from '@/assets/civilization/environments/growth/aurora-basin-stellar-chrysalis-desktop-v1.webp';
import auroraBasinStellarChrysalisCityMobileUrl from '@/assets/civilization/environments/growth/aurora-basin-stellar-chrysalis-mobile-v1.webp';
import auroraBasinGalacticChrysalisCityUrl from '@/assets/civilization/environments/growth/aurora-basin-galactic-chrysalis-desktop-v1.webp';
import auroraBasinGalacticChrysalisCityMobileUrl from '@/assets/civilization/environments/growth/aurora-basin-galactic-chrysalis-mobile-v1.webp';
import auroraBasinGalacticChrysalisReferenceUrl from '@/assets/civilization/environments/growth/aurora-basin-galactic-chrysalis-desktop-v5.webp';
import auroraBasinGalacticChrysalisReferenceMobileUrl from '@/assets/civilization/environments/growth/aurora-basin-galactic-chrysalis-mobile-v5.webp';
import auroraBasinStellarEchoCityUrl from '@/assets/civilization/environments/growth/aurora-basin-stellar-echo-desktop-v1.webp';
import auroraBasinStellarEchoCityMobileUrl from '@/assets/civilization/environments/growth/aurora-basin-stellar-echo-mobile-v1.webp';
import auroraBasinSurfaceDistrictMasterUrl from '@/assets/civilization/environments/aurora-basin-surface-district-master-v1.webp';
import auroraBasinSurfaceDistrictMasterMobileUrl from '@/assets/civilization/environments/aurora-basin-surface-district-master-mobile-v1.webp';
import auroraBasinChrysalisCityFabricUrl from '@/assets/civilization/environments/aurora-basin-surface-district-fabric-chrysalis-v1.webp';
import auroraBasinChrysalisCityFabricMobileUrl from '@/assets/civilization/environments/aurora-basin-surface-district-fabric-chrysalis-mobile-v1.webp';
import auroraBasinEchoCityFabricUrl from '@/assets/civilization/environments/aurora-basin-surface-district-fabric-echo-v1.webp';
import auroraBasinEchoCityFabricMobileUrl from '@/assets/civilization/environments/aurora-basin-surface-district-fabric-echo-mobile-v1.webp';
import auroraBasinSurfaceType1CityUrl from '@/assets/civilization/environments/aurora-basin-surface-type1-city-v1.avif';
import auroraBasinSurfaceType2CityUrl from '@/assets/civilization/environments/aurora-basin-surface-type2-city-v1.avif';
import auroraBasinSurfaceType3CityUrl from '@/assets/civilization/environments/aurora-basin-surface-type3-city-v1.avif';
import auroraBasinSurfaceChrysalisType1CityUrl from '@/assets/civilization/environments/aurora-basin-surface-chrysalis-type1-city-v4.avif';
import auroraBasinSurfaceChrysalisType2CityUrl from '@/assets/civilization/environments/aurora-basin-surface-chrysalis-type2-city-v4.avif';
import auroraBasinSurfaceChrysalisType3CityUrl from '@/assets/civilization/environments/aurora-basin-surface-chrysalis-type3-city-v4.avif';
import auroraBasinOrbitUrl from '@/assets/civilization/environments/aurora-basin-orbit-v4.webp';
import auroraBasinOrbitMobileUrl from '@/assets/civilization/environments/aurora-basin-orbit-mobile-v4.webp';
import auroraBasinOrbitType1Url from '@/assets/civilization/environments/aurora-basin-orbit-type1-v1.avif';
import auroraBasinOrbitType2Url from '@/assets/civilization/environments/aurora-basin-orbit-type2-v1.avif';
import auroraBasinOrbitType3Url from '@/assets/civilization/environments/aurora-basin-orbit-type3-v1.avif';
import auroraBasinOrbitChrysalisMatureUrl from '@/assets/civilization/environments/aurora-basin-orbit-chrysalis-mature-v1.avif';
import auroraBasinStellarUrl from '@/assets/civilization/environments/aurora-basin-stellar-v4.webp';
import auroraBasinStellarMobileUrl from '@/assets/civilization/environments/aurora-basin-stellar-mobile-v4.webp';
import auroraBasinStellarChrysalisMatureUrl from '@/assets/civilization/environments/aurora-basin-stellar-chrysalis-mature-v1.avif';
import auroraBasinGalaxyUrl from '@/assets/civilization/environments/aurora-basin-galaxy-v4.webp';
import auroraBasinGalaxyMobileUrl from '@/assets/civilization/environments/aurora-basin-galaxy-mobile-v4.webp';
import auroraBasinGalaxyType2Url from '@/assets/civilization/environments/aurora-basin-galaxy-type2-v1.avif';
import auroraBasinGalaxyType3Url from '@/assets/civilization/environments/aurora-basin-galaxy-type3-v1.avif';
import auroraBasinGalaxyChrysalisMatureUrl from '@/assets/civilization/environments/aurora-basin-galaxy-chrysalis-mature-v1.avif';
import obsidianSteppeSubstrateAtlasUrl from '@/assets/civilization/environments/obsidian-steppe-substrate-atlas-v2.webp';
import obsidianSteppeSurfaceType1CityUrl from '@/assets/civilization/environments/obsidian-steppe-surface-type1-city-v1.avif';
import obsidianSteppeSurfaceType2CityUrl from '@/assets/civilization/environments/obsidian-steppe-surface-type2-city-v1.avif';
import obsidianSteppeSurfaceType3CityUrl from '@/assets/civilization/environments/obsidian-steppe-surface-type3-city-v1.avif';
import obsidianSteppeOrbitUrl from '@/assets/civilization/environments/obsidian-steppe-orbit-v4.webp';
import obsidianSteppeOrbitMobileUrl from '@/assets/civilization/environments/obsidian-steppe-orbit-mobile-v4.webp';
import obsidianSteppeOrbitType1Url from '@/assets/civilization/environments/obsidian-steppe-orbit-type1-v1.avif';
import obsidianSteppeOrbitType2Url from '@/assets/civilization/environments/obsidian-steppe-orbit-type2-v1.avif';
import obsidianSteppeOrbitType3Url from '@/assets/civilization/environments/obsidian-steppe-orbit-type3-v1.avif';
import obsidianSteppeStellarUrl from '@/assets/civilization/environments/obsidian-steppe-stellar-v4.webp';
import obsidianSteppeStellarMobileUrl from '@/assets/civilization/environments/obsidian-steppe-stellar-mobile-v4.webp';
import obsidianSteppeGalaxyUrl from '@/assets/civilization/environments/obsidian-steppe-galaxy-v3.webp';
import obsidianSteppeGalaxyMobileUrl from '@/assets/civilization/environments/obsidian-steppe-galaxy-mobile-v3.webp';
import obsidianSteppeGalaxyType2Url from '@/assets/civilization/environments/obsidian-steppe-galaxy-type2-v1.avif';
import obsidianSteppeGalaxyType3Url from '@/assets/civilization/environments/obsidian-steppe-galaxy-type3-v1.avif';
import oceanicScarSubstrateAtlasUrl from '@/assets/civilization/environments/oceanic-scar-substrate-atlas-v2.webp';
import oceanicScarSurfaceType1CityUrl from '@/assets/civilization/environments/oceanic-scar-surface-type1-city-v1.avif';
import oceanicScarSurfaceType2CityUrl from '@/assets/civilization/environments/oceanic-scar-surface-type2-city-v1.avif';
import oceanicScarSurfaceType3CityUrl from '@/assets/civilization/environments/oceanic-scar-surface-type3-city-v1.avif';
import oceanicScarOrbitUrl from '@/assets/civilization/environments/oceanic-scar-orbit-v4.webp';
import oceanicScarOrbitMobileUrl from '@/assets/civilization/environments/oceanic-scar-orbit-mobile-v4.webp';
import oceanicScarOrbitType1Url from '@/assets/civilization/environments/oceanic-scar-orbit-type1-v1.avif';
import oceanicScarOrbitType2Url from '@/assets/civilization/environments/oceanic-scar-orbit-type2-v1.avif';
import oceanicScarOrbitType3Url from '@/assets/civilization/environments/oceanic-scar-orbit-type3-v1.avif';
import oceanicScarStellarUrl from '@/assets/civilization/environments/oceanic-scar-stellar-v4.webp';
import oceanicScarStellarMobileUrl from '@/assets/civilization/environments/oceanic-scar-stellar-mobile-v4.webp';
import oceanicScarGalaxyUrl from '@/assets/civilization/environments/oceanic-scar-galaxy-v3.webp';
import oceanicScarGalaxyMobileUrl from '@/assets/civilization/environments/oceanic-scar-galaxy-mobile-v3.webp';
import oceanicScarGalaxyType2Url from '@/assets/civilization/environments/oceanic-scar-galaxy-type2-v1.avif';
import oceanicScarGalaxyType3Url from '@/assets/civilization/environments/oceanic-scar-galaxy-type3-v1.avif';
import terminatorReachSubstrateAtlasUrl from '@/assets/civilization/environments/terminator-reach-substrate-atlas-v2.webp';
import terminatorReachSurfaceType1CityUrl from '@/assets/civilization/environments/terminator-reach-surface-type1-city-v1.avif';
import terminatorReachSurfaceType2CityUrl from '@/assets/civilization/environments/terminator-reach-surface-type2-city-v1.avif';
import terminatorReachSurfaceType3CityUrl from '@/assets/civilization/environments/terminator-reach-surface-type3-city-v1.avif';
import terminatorReachOrbitUrl from '@/assets/civilization/environments/terminator-reach-orbit-v4.webp';
import terminatorReachOrbitMobileUrl from '@/assets/civilization/environments/terminator-reach-orbit-mobile-v4.webp';
import terminatorReachOrbitType1Url from '@/assets/civilization/environments/terminator-reach-orbit-type1-v1.avif';
import terminatorReachOrbitType2Url from '@/assets/civilization/environments/terminator-reach-orbit-type2-v1.avif';
import terminatorReachOrbitType3Url from '@/assets/civilization/environments/terminator-reach-orbit-type3-v1.avif';
import terminatorReachStellarUrl from '@/assets/civilization/environments/terminator-reach-stellar-v4.webp';
import terminatorReachStellarMobileUrl from '@/assets/civilization/environments/terminator-reach-stellar-mobile-v4.webp';
import terminatorReachGalaxyUrl from '@/assets/civilization/environments/terminator-reach-galaxy-v3.webp';
import terminatorReachGalaxyMobileUrl from '@/assets/civilization/environments/terminator-reach-galaxy-mobile-v3.webp';
import terminatorReachGalaxyType2Url from '@/assets/civilization/environments/terminator-reach-galaxy-type2-v1.avif';
import terminatorReachGalaxyType3Url from '@/assets/civilization/environments/terminator-reach-galaxy-type3-v1.avif';

export type CivilizationArtScene = 'surface' | 'orbit' | 'stellar' | 'galaxy';
export type CivilizationArtSlotLayer =
  | 'plate'
  | 'archetype'
  | 'blueprint'
  | 'artifact-treatment'
  | 'chronicle';
export type CivilizationArtResolution = 'bitmap' | 'procedural' | 'planned';

export interface CivilizationArtSlot {
  id: string;
  layer: CivilizationArtSlotLayer;
  label: string;
  resolution: CivilizationArtResolution;
  src?: string;
  notes: string;
}

export interface CivilizationPlateArtSlot extends CivilizationArtSlot {
  layer: 'plate';
  src: string;
  mobileSrc?: string;
  position: string;
  transformOrigin: string;
  cinematicScale: number;
  scanScale: number;
  contrast: string;
  evolutionStage?: CivilizationComplexityStage;
  evolutionLabel?: 'Foundation' | 'Established' | 'Integrated' | 'Ascendant';
  evolutionVeilOpacity?: number;
  evolutionInfrastructureOpacity?: number;
  civilizationMaturity?: CivilizationPlateMaturity;
  constructionPlanId?: typeof CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID;
  atlasCell?: {
    columns: number;
    rows: number;
    column: number;
    row: number;
  };
}

export interface CivilizationEnvironmentDressing {
  id: CivilizationEnvironmentIdentity['variantId'];
  label: string;
  artFilter: string;
  surfaceAtmosphere: string;
}

export const CIVILIZATION_ENVIRONMENT_DRESSINGS: Record<
  CivilizationEnvironmentIdentity['variantId'],
  CivilizationEnvironmentDressing
> = {
  aurora_basin: {
    id: 'aurora_basin',
    label: 'Auroral Twilight',
    artFilter: 'saturate(1.04) hue-rotate(-3deg)',
    surfaceAtmosphere: 'linear-gradient(180deg, rgba(67, 226, 205, 0.07), transparent 44%)',
  },
  terminator_reach: {
    id: 'terminator_reach',
    label: 'Copper Terminator',
    artFilter: 'sepia(0.12) saturate(0.94) hue-rotate(-10deg) brightness(0.96)',
    surfaceAtmosphere: 'linear-gradient(112deg, rgba(255, 124, 70, 0.16), transparent 52%, rgba(58, 25, 76, 0.12))',
  },
  oceanic_scar: {
    id: 'oceanic_scar',
    label: 'Storm-Blue Air',
    artFilter: 'saturate(0.9) hue-rotate(9deg) brightness(0.95)',
    surfaceAtmosphere: 'linear-gradient(180deg, rgba(39, 105, 159, 0.15), transparent 56%, rgba(15, 100, 122, 0.1))',
  },
  obsidian_steppe: {
    id: 'obsidian_steppe',
    label: 'Clear Violet Night',
    artFilter: 'saturate(0.78) hue-rotate(20deg) brightness(0.84) contrast(1.06)',
    surfaceAtmosphere: 'linear-gradient(138deg, rgba(48, 22, 76, 0.17), transparent 55%, rgba(164, 60, 127, 0.09))',
  },
};

export function getCivilizationEnvironmentDressing(
  variantId: CivilizationEnvironmentIdentity['variantId'],
): CivilizationEnvironmentDressing {
  return CIVILIZATION_ENVIRONMENT_DRESSINGS[variantId];
}

type CivilizationPlateArtPair = {
  cinematic: CivilizationPlateArtSlot;
  scan: CivilizationPlateArtSlot;
};

const CIVILIZATION_PLATE_EVOLUTION: Record<CivilizationComplexityStage, {
  label: NonNullable<CivilizationPlateArtSlot['evolutionLabel']>;
  zoom: number;
  saturation: number;
  contrast: number;
  brightness: number;
  veilOpacity: number;
  infrastructureOpacity: number;
}> = {
  0: {
    label: 'Foundation',
    zoom: 1.015,
    saturation: 0.96,
    contrast: 1.02,
    brightness: 1,
    veilOpacity: 0,
    infrastructureOpacity: 0.2,
  },
  1: {
    label: 'Established',
    zoom: 1.01,
    saturation: 0.98,
    contrast: 1.02,
    brightness: 1,
    veilOpacity: 0,
    infrastructureOpacity: 0.4,
  },
  2: {
    label: 'Integrated',
    zoom: 1.005,
    saturation: 1,
    contrast: 1.03,
    brightness: 1,
    veilOpacity: 0,
    infrastructureOpacity: 0.68,
  },
  3: {
    label: 'Ascendant',
    zoom: 1,
    saturation: 1.02,
    contrast: 1.04,
    brightness: 1,
    veilOpacity: 0,
    infrastructureOpacity: 1,
  },
};

function slot(
  id: string,
  layer: CivilizationArtSlotLayer,
  label: string,
  resolution: CivilizationArtResolution,
  notes: string,
  src?: string,
): CivilizationArtSlot {
  return { id, layer, label, resolution, notes, src };
}

const ENVIRONMENT_SUBSTRATE_ATLAS_URLS: Record<
  CivilizationEnvironmentIdentity['variantId'],
  string
> = {
  aurora_basin: auroraBasinSubstrateAtlasUrl,
  terminator_reach: terminatorReachSubstrateAtlasUrl,
  oceanic_scar: oceanicScarSubstrateAtlasUrl,
  obsidian_steppe: obsidianSteppeSubstrateAtlasUrl,
};

const ENVIRONMENT_SUBSTRATE_ATLAS_CELLS: Record<
  CivilizationArtScene,
  NonNullable<CivilizationPlateArtSlot['atlasCell']>
> = {
  surface: { columns: 2, rows: 2, column: 0, row: 0 },
  orbit: { columns: 2, rows: 2, column: 1, row: 0 },
  stellar: { columns: 2, rows: 2, column: 0, row: 1 },
  galaxy: { columns: 2, rows: 2, column: 1, row: 1 },
};

const DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS = ENVIRONMENT_SUBSTRATE_ATLAS_URLS.aurora_basin;

const ENVIRONMENT_SCENE_PLATE_URLS: Partial<Record<
  CivilizationEnvironmentIdentity['variantId'],
  Partial<Record<CivilizationArtScene, string>>
>> = {
  aurora_basin: {
    surface: auroraBasinSurfaceUrl,
    orbit: auroraBasinOrbitUrl,
    stellar: auroraBasinStellarUrl,
    galaxy: auroraBasinGalaxyUrl,
  },
  terminator_reach: {
    surface: auroraBasinSurfaceUrl,
    orbit: terminatorReachOrbitUrl,
    stellar: terminatorReachStellarUrl,
    galaxy: terminatorReachGalaxyUrl,
  },
  oceanic_scar: {
    surface: auroraBasinSurfaceUrl,
    orbit: oceanicScarOrbitUrl,
    stellar: oceanicScarStellarUrl,
    galaxy: oceanicScarGalaxyUrl,
  },
  obsidian_steppe: {
    surface: auroraBasinSurfaceUrl,
    orbit: obsidianSteppeOrbitUrl,
    stellar: obsidianSteppeStellarUrl,
    galaxy: obsidianSteppeGalaxyUrl,
  },
};

const ENVIRONMENT_SCENE_MOBILE_PLATE_URLS: Partial<Record<
  CivilizationEnvironmentIdentity['variantId'],
  Partial<Record<CivilizationArtScene, string>>
>> = {
  aurora_basin: {
    surface: auroraBasinSurfaceMobileUrl,
    orbit: auroraBasinOrbitMobileUrl,
    stellar: auroraBasinStellarMobileUrl,
    galaxy: auroraBasinGalaxyMobileUrl,
  },
  terminator_reach: {
    surface: auroraBasinSurfaceMobileUrl,
    orbit: terminatorReachOrbitMobileUrl,
    stellar: terminatorReachStellarMobileUrl,
    galaxy: terminatorReachGalaxyMobileUrl,
  },
  oceanic_scar: {
    surface: auroraBasinSurfaceMobileUrl,
    orbit: oceanicScarOrbitMobileUrl,
    stellar: oceanicScarStellarMobileUrl,
    galaxy: oceanicScarGalaxyMobileUrl,
  },
  obsidian_steppe: {
    surface: auroraBasinSurfaceMobileUrl,
    orbit: obsidianSteppeOrbitMobileUrl,
    stellar: obsidianSteppeStellarMobileUrl,
    galaxy: obsidianSteppeGalaxyMobileUrl,
  },
};

export const CIVILIZATION_LEGACY_ENVIRONMENT_GROWTH_PLATE_URLS: Partial<Record<
  CivilizationEnvironmentIdentity['variantId'],
  Partial<Record<CivilizationArtScene, Partial<Record<CivilizationComplexityStage, string>>>>
>> = {
  aurora_basin: {
    surface: {
      1: auroraBasinSurfaceType1CityUrl,
      2: auroraBasinSurfaceType2CityUrl,
      3: auroraBasinSurfaceType3CityUrl,
    },
    orbit: {
      1: auroraBasinOrbitType1Url,
      2: auroraBasinOrbitType2Url,
      3: auroraBasinOrbitType3Url,
    },
    galaxy: {
      2: auroraBasinGalaxyType2Url,
      3: auroraBasinGalaxyType3Url,
    },
  },
  terminator_reach: {
    surface: {
      1: terminatorReachSurfaceType1CityUrl,
      2: terminatorReachSurfaceType2CityUrl,
      3: terminatorReachSurfaceType3CityUrl,
    },
    orbit: {
      1: terminatorReachOrbitType1Url,
      2: terminatorReachOrbitType2Url,
      3: terminatorReachOrbitType3Url,
    },
    galaxy: {
      2: terminatorReachGalaxyType2Url,
      3: terminatorReachGalaxyType3Url,
    },
  },
  oceanic_scar: {
    surface: {
      1: oceanicScarSurfaceType1CityUrl,
      2: oceanicScarSurfaceType2CityUrl,
      3: oceanicScarSurfaceType3CityUrl,
    },
    orbit: {
      1: oceanicScarOrbitType1Url,
      2: oceanicScarOrbitType2Url,
      3: oceanicScarOrbitType3Url,
    },
    galaxy: {
      2: oceanicScarGalaxyType2Url,
      3: oceanicScarGalaxyType3Url,
    },
  },
  obsidian_steppe: {
    surface: {
      1: obsidianSteppeSurfaceType1CityUrl,
      2: obsidianSteppeSurfaceType2CityUrl,
      3: obsidianSteppeSurfaceType3CityUrl,
    },
    orbit: {
      1: obsidianSteppeOrbitType1Url,
      2: obsidianSteppeOrbitType2Url,
      3: obsidianSteppeOrbitType3Url,
    },
    galaxy: {
      2: obsidianSteppeGalaxyType2Url,
      3: obsidianSteppeGalaxyType3Url,
    },
  },
};

export const CIVILIZATION_CHRYSALIS_SURFACE_CITY_PLATE_URLS: Partial<Record<
  CivilizationComplexityStage,
  string
>> = {
  1: auroraBasinSurfaceChrysalisType1CityUrl,
  2: auroraBasinSurfaceChrysalisType2CityUrl,
  3: auroraBasinSurfaceChrysalisType3CityUrl,
};

export const CIVILIZATION_EARLY_SURFACE_CITY_PLATE_URLS: Partial<Record<
  CivilizationCityDevelopmentStage,
  string
>> = {
  1: auroraBasinSparseCityUrl,
  2: auroraBasinYoungCityUrl,
  3: auroraBasinYoungCityUrl,
};

export const CIVILIZATION_LEGACY_CHRYSALIS_SCALE_PLATE_URLS: Partial<Record<
  CivilizationArtScene,
  string
>> = {
  orbit: auroraBasinOrbitChrysalisMatureUrl,
  stellar: auroraBasinStellarChrysalisMatureUrl,
  galaxy: auroraBasinGalaxyChrysalisMatureUrl,
};

// Each phase retains the construction-plan master’s geography and camera.
// Early growth adds roads and ordinary buildings around the fixed district
// sites. Stellar development adds housing, transport and utility infrastructure.
// The saturated Chrysalis endpoint has its own Tier III city fabric; other
// identities and the earlier conversion milestone retain their existing art.
const SURFACE_CITY_FABRIC_URLS: Partial<Record<CivilizationDyadId, {
  desktop: string;
  mobile: string;
}>> = {
  chrysalis: { desktop: auroraBasinChrysalisCityFabricUrl, mobile: auroraBasinChrysalisCityFabricMobileUrl },
  echo: { desktop: auroraBasinEchoCityFabricUrl, mobile: auroraBasinEchoCityFabricMobileUrl },
};

const SURFACE_YOUNG_CITY_FABRIC_URLS: typeof SURFACE_CITY_FABRIC_URLS = {
  chrysalis: { desktop: auroraBasinYoungChrysalisCityUrl, mobile: auroraBasinYoungChrysalisCityMobileUrl },
  echo: { desktop: auroraBasinYoungEchoCityUrl, mobile: auroraBasinYoungEchoCityMobileUrl },
};

const SURFACE_STELLAR_CITY_FABRIC_URLS: typeof SURFACE_CITY_FABRIC_URLS = {
  chrysalis: { desktop: auroraBasinStellarChrysalisCityUrl, mobile: auroraBasinStellarChrysalisCityMobileUrl },
  echo: { desktop: auroraBasinStellarEchoCityUrl, mobile: auroraBasinStellarEchoCityMobileUrl },
};

function getSurfaceCityFabric(
  stage: CivilizationCityDevelopmentStage,
  identity: CivilizationDyadId | null,
) {
  if (!identity || stage < 2) return undefined;
  if (stage === 9 && identity === 'chrysalis') {
    return {
      desktop: auroraBasinGalacticChrysalisCityUrl,
      mobile: auroraBasinGalacticChrysalisCityMobileUrl,
    };
  }
  if (stage >= 6) return SURFACE_STELLAR_CITY_FABRIC_URLS[identity];
  return (stage < 4 ? SURFACE_YOUNG_CITY_FABRIC_URLS : SURFACE_CITY_FABRIC_URLS)[identity];
}

const SURFACE_CITY_PROGRESSION_URLS: Partial<Record<
  CivilizationCityDevelopmentStage,
  string
>> = {
  1: auroraBasinSparseCityUrl,
  2: auroraBasinYoungCityUrl,
  3: auroraBasinYoungCityUrl,
  4: auroraBasinSurfaceDistrictMasterUrl,
  5: auroraBasinSurfaceDistrictMasterUrl,
  6: auroraBasinStellarCityUrl,
  7: auroraBasinStellarCityUrl,
  8: auroraBasinStellarCityUrl,
  9: auroraBasinStellarCityUrl,
};

const SURFACE_CITY_PROGRESSION_MOBILE_URLS: Partial<Record<
  CivilizationCityDevelopmentStage,
  string
>> = {
  1: auroraBasinSparseCityMobileUrl,
  2: auroraBasinYoungCityMobileUrl,
  3: auroraBasinYoungCityMobileUrl,
  4: auroraBasinSurfaceDistrictMasterMobileUrl,
  5: auroraBasinSurfaceDistrictMasterMobileUrl,
  6: auroraBasinStellarCityMobileUrl,
  7: auroraBasinStellarCityMobileUrl,
  8: auroraBasinStellarCityMobileUrl,
  9: auroraBasinStellarCityMobileUrl,
};

function getEnvironmentCityProgressionPlate(
  scene: CivilizationArtScene,
  cityDevelopmentStage: CivilizationCityDevelopmentStage,
  architecturalIdentity: CivilizationDyadId | null,
): string | undefined {
  if (scene !== 'surface') return undefined;
  const neutral = SURFACE_CITY_PROGRESSION_URLS[cityDevelopmentStage];
  return getSurfaceCityFabric(cityDevelopmentStage, architecturalIdentity)?.desktop ?? neutral;
}

function getEnvironmentCityProgressionMobilePlate(
  scene: CivilizationArtScene,
  cityDevelopmentStage: CivilizationCityDevelopmentStage,
  architecturalIdentity: CivilizationDyadId | null,
): string | undefined {
  if (scene !== 'surface') return undefined;
  const neutral = SURFACE_CITY_PROGRESSION_MOBILE_URLS[cityDevelopmentStage];
  return getSurfaceCityFabric(cityDevelopmentStage, architecturalIdentity)?.mobile ?? neutral;
}

const CIVILIZATION_PLATE_ART: Record<CivilizationArtScene, CivilizationPlateArtPair> = {
  surface: {
    cinematic: {
      ...slot(
        'civilization.plate.surface.cinematic',
        'plate',
        'Uninhabited surface substrate',
        'bitmap',
        'Natural terrain substrate with clear authored sockets; civilization appears only through manifestations.',
        DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      ),
      layer: 'plate',
      src: DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      atlasCell: ENVIRONMENT_SUBSTRATE_ATLAS_CELLS.surface,
      position: '50% 54%',
      transformOrigin: '50% 54%',
      cinematicScale: 1.04,
      scanScale: 1.02,
      contrast: 'saturate(1.1) contrast(1.04) brightness(0.86)',
    },
    scan: {
      ...slot(
        'civilization.plate.surface.scan',
        'plate',
        'Uninhabited surface scan substrate',
        'bitmap',
        'Natural terrain substrate remains unchanged while Scan annotates existing manifestations.',
        DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      ),
      layer: 'plate',
      src: DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      atlasCell: ENVIRONMENT_SUBSTRATE_ATLAS_CELLS.surface,
      position: '50% 54%',
      transformOrigin: '50% 54%',
      cinematicScale: 1.04,
      scanScale: 1.02,
      contrast: 'saturate(1.1) contrast(1.04) brightness(0.86)',
    },
  },
  orbit: {
    cinematic: {
      ...slot(
        'civilization.plate.orbit.cinematic',
        'plate',
        'Uninhabited planetary orbit substrate',
        'bitmap',
        'Natural planetary substrate with no pre-authored orbital or surface civilization.',
        DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      ),
      layer: 'plate',
      src: DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      atlasCell: ENVIRONMENT_SUBSTRATE_ATLAS_CELLS.orbit,
      position: '50% 46%',
      transformOrigin: '50% 46%',
      cinematicScale: 1,
      scanScale: 1,
      contrast: 'saturate(1.03) contrast(1.02) brightness(0.9)',
    },
    scan: {
      ...slot(
        'civilization.plate.orbit.scan',
        'plate',
        'Uninhabited planetary orbit scan substrate',
        'bitmap',
        'Natural planetary substrate remains unchanged while Scan annotates existing manifestations.',
        DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      ),
      layer: 'plate',
      src: DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      atlasCell: ENVIRONMENT_SUBSTRATE_ATLAS_CELLS.orbit,
      position: '50% 46%',
      transformOrigin: '50% 46%',
      cinematicScale: 1,
      scanScale: 1,
      contrast: 'saturate(1.03) contrast(1.02) brightness(0.9)',
    },
  },
  stellar: {
    cinematic: {
      ...slot(
        'civilization.plate.stellar.cinematic',
        'plate',
        'Stellar system cinematic plate',
        'bitmap',
        'Natural system substrate with no pre-authored routes, stations, or stellar engineering.',
        DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      ),
      layer: 'plate',
      src: DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      atlasCell: ENVIRONMENT_SUBSTRATE_ATLAS_CELLS.stellar,
      position: '52% 52%',
      transformOrigin: '52% 52%',
      cinematicScale: 1,
      scanScale: 1,
      contrast: 'saturate(1.08) contrast(1.04) brightness(0.92)',
    },
    scan: {
      ...slot(
        'civilization.plate.stellar.scan',
        'plate',
        'Stellar system scan plate',
        'bitmap',
        'Natural system substrate remains unchanged while Scan annotates existing manifestations.',
        DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      ),
      layer: 'plate',
      src: DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      atlasCell: ENVIRONMENT_SUBSTRATE_ATLAS_CELLS.stellar,
      position: '52% 52%',
      transformOrigin: '52% 52%',
      cinematicScale: 1,
      scanScale: 1,
      contrast: 'saturate(1.08) contrast(1.04) brightness(0.92)',
    },
  },
  galaxy: {
    cinematic: {
      ...slot(
        'civilization.plate.galaxy.cinematic',
        'plate',
        'Galactic sector cinematic plate',
        'bitmap',
        'Natural galactic-region substrate with no pre-authored network or civilization.',
        DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      ),
      layer: 'plate',
      src: DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      atlasCell: ENVIRONMENT_SUBSTRATE_ATLAS_CELLS.galaxy,
      position: '50% 50%',
      transformOrigin: '50% 50%',
      cinematicScale: 1,
      scanScale: 1,
      contrast: 'saturate(1.04) contrast(1.06) brightness(1.03)',
    },
    scan: {
      ...slot(
        'civilization.plate.galaxy.scan',
        'plate',
        'Galactic sector scan plate',
        'bitmap',
        'Natural galactic-region substrate remains unchanged while Scan annotates existing manifestations.',
        DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      ),
      layer: 'plate',
      src: DEFAULT_ENVIRONMENT_SUBSTRATE_ATLAS,
      atlasCell: ENVIRONMENT_SUBSTRATE_ATLAS_CELLS.galaxy,
      position: '50% 50%',
      transformOrigin: '50% 50%',
      cinematicScale: 1,
      scanScale: 1,
      contrast: 'saturate(1.04) contrast(1.06) brightness(1.03)',
    },
  },
};

/*
 * Retired full-frame archetype replacement table.
 *
 * Its source art remains in the repository for structure-level salvage, but
 * the table is deliberately excluded from compilation: archetypes now build
 * physical architecture into a persistent neutral environment instead of
 * swapping the player's world.
 *
const CIVILIZATION_ARCHETYPE_PLATE_ART: Partial<
Record<CivilizationArchetypeId, Partial<Record<CivilizationArtScene, CivilizationPlateArtPair>>>
> = {
  living_arcology: {
    orbit: {
      cinematic: {
        ...slot(
          'civilization.plate.orbit.living_arcology.cinematic',
          'plate',
          'Living Arcology orbit cinematic plate',
          'bitmap',
          'Dedicated living/recovery orbit plate for biosphere restoration belts, orbital gardens, and worldroot corridors.',
          orbitLivingPlateUrl,
        ),
        layer: 'plate',
        src: orbitLivingPlateUrl,
        position: '50% 48%',
        transformOrigin: '50% 48%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.08) contrast(1.04) brightness(0.9)',
      },
      scan: {
        ...slot(
          'civilization.plate.orbit.living_arcology.scan',
          'plate',
          'Living Arcology orbit scan plate',
          'bitmap',
          'Dedicated scan-ready living orbit plate; recovery corridors stay legible under planetary pins and dossiers.',
          orbitLivingPlateUrl,
        ),
        layer: 'plate',
        src: orbitLivingPlateUrl,
        position: '50% 48%',
        transformOrigin: '50% 48%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.08) contrast(1.04) brightness(0.9)',
      },
    },
    surface: {
      cinematic: {
        ...slot(
          'civilization.plate.surface.living_arcology.cinematic',
          'plate',
          'Living Arcology surface cinematic plate',
          'bitmap',
          'Dedicated living/recovery city plate for Verdance, biosphere, recovery, and replication civilizations.',
          surfaceLivingPlateUrl,
        ),
        layer: 'plate',
        src: surfaceLivingPlateUrl,
        position: '50% 54%',
        transformOrigin: '50% 56%',
        cinematicScale: 1.03,
        scanScale: 1.01,
        contrast: 'saturate(1.08) contrast(1.03) brightness(0.88)',
      },
      scan: {
        ...slot(
          'civilization.plate.surface.living_arcology.scan',
          'plate',
          'Living Arcology surface scan plate',
          'bitmap',
          'Dedicated scan-ready living city plate; recovery districts remain legible under pins and dossiers.',
          surfaceLivingPlateUrl,
        ),
        layer: 'plate',
        src: surfaceLivingPlateUrl,
        position: '50% 54%',
        transformOrigin: '50% 56%',
        cinematicScale: 1.03,
        scanScale: 1.01,
        contrast: 'saturate(1.08) contrast(1.03) brightness(0.88)',
      },
    },
    stellar: {
      cinematic: {
        ...slot(
          'civilization.plate.stellar.living_arcology.cinematic',
          'plate',
          'Living Arcology stellar cinematic plate',
          'bitmap',
          'Dedicated living/recovery system plate for Verdance habitat chains and worldroot-scale civilization reads.',
          stellarLivingPlateUrl,
        ),
        layer: 'plate',
        src: stellarLivingPlateUrl,
        position: '50% 52%',
        transformOrigin: '50% 52%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.06) contrast(1.03) brightness(0.9)',
      },
      scan: {
        ...slot(
          'civilization.plate.stellar.living_arcology.scan',
          'plate',
          'Living Arcology stellar scan plate',
          'bitmap',
          'Dedicated scan-ready living system plate; habitat ecology chains remain legible under system pins.',
          stellarLivingPlateUrl,
        ),
        layer: 'plate',
        src: stellarLivingPlateUrl,
        position: '50% 52%',
        transformOrigin: '50% 52%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.06) contrast(1.03) brightness(0.9)',
      },
    },
    galaxy: {
      cinematic: {
        ...slot(
          'civilization.plate.galaxy.living_arcology.cinematic',
          'plate',
          'Living Arcology galactic cinematic plate',
          'bitmap',
          'Dedicated living/recovery galactic plate for refuge clusters, biosphere corridors, and Verdance sector-scale consequences.',
          galacticLivingPlateUrl,
        ),
        layer: 'plate',
        src: galacticLivingPlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.05) contrast(1.05) brightness(1.02)',
      },
      scan: {
        ...slot(
          'civilization.plate.galaxy.living_arcology.scan',
          'plate',
          'Living Arcology galactic scan plate',
          'bitmap',
          'Dedicated scan-ready living galactic plate; refuge clusters stay legible under galactic pins and dossiers.',
          galacticLivingPlateUrl,
        ),
        layer: 'plate',
        src: galacticLivingPlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.05) contrast(1.05) brightness(1.02)',
      },
    },
  },
  forge_spine: {
    orbit: {
      cinematic: {
        ...slot(
          'civilization.plate.orbit.forge_spine.cinematic',
          'plate',
          'Forge Spine orbit cinematic plate',
          'bitmap',
          'Dedicated forge/ascent orbit plate for mantle-to-orbit spines, launch arcs, and orbital manufacturing.',
          orbitForgePlateUrl,
        ),
        layer: 'plate',
        src: orbitForgePlateUrl,
        position: '50% 48%',
        transformOrigin: '50% 48%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.08) contrast(1.05) brightness(0.9)',
      },
      scan: {
        ...slot(
          'civilization.plate.orbit.forge_spine.scan',
          'plate',
          'Forge Spine orbit scan plate',
          'bitmap',
          'Dedicated scan-ready forge orbit plate; ascent spines stay legible under planetary pins and dossiers.',
          orbitForgePlateUrl,
        ),
        layer: 'plate',
        src: orbitForgePlateUrl,
        position: '50% 48%',
        transformOrigin: '50% 48%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.08) contrast(1.05) brightness(0.9)',
      },
    },
    surface: {
      cinematic: {
        ...slot(
          'civilization.plate.surface.forge_spine.cinematic',
          'plate',
          'Forge Spine surface cinematic plate',
          'bitmap',
          'Dedicated forge/ascent city plate for Flare, ignition, thermal industry, and cosmic forge civilizations.',
          surfaceForgePlateUrl,
        ),
        layer: 'plate',
        src: surfaceForgePlateUrl,
        position: '50% 54%',
        transformOrigin: '50% 55%',
        cinematicScale: 1.03,
        scanScale: 1.01,
        contrast: 'saturate(1.08) contrast(1.04) brightness(0.86)',
      },
      scan: {
        ...slot(
          'civilization.plate.surface.forge_spine.scan',
          'plate',
          'Forge Spine surface scan plate',
          'bitmap',
          'Dedicated scan-ready forge city plate; thermal districts and ascent spines remain legible under pins.',
          surfaceForgePlateUrl,
        ),
        layer: 'plate',
        src: surfaceForgePlateUrl,
        position: '50% 54%',
        transformOrigin: '50% 55%',
        cinematicScale: 1.03,
        scanScale: 1.01,
        contrast: 'saturate(1.08) contrast(1.04) brightness(0.86)',
      },
    },
    stellar: {
      cinematic: {
        ...slot(
          'civilization.plate.stellar.forge_spine.cinematic',
          'plate',
          'Forge Spine stellar cinematic plate',
          'bitmap',
          'Dedicated forge/ascent system plate for star-powered foundry rings, ignition arrays, and orbital industry.',
          stellarForgePlateUrl,
        ),
        layer: 'plate',
        src: stellarForgePlateUrl,
        position: '50% 52%',
        transformOrigin: '50% 52%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.08) contrast(1.05) brightness(0.9)',
      },
      scan: {
        ...slot(
          'civilization.plate.stellar.forge_spine.scan',
          'plate',
          'Forge Spine stellar scan plate',
          'bitmap',
          'Dedicated scan-ready forge system plate; foundry rings and ignition lanes remain legible under system pins.',
          stellarForgePlateUrl,
        ),
        layer: 'plate',
        src: stellarForgePlateUrl,
        position: '50% 52%',
        transformOrigin: '50% 52%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.08) contrast(1.05) brightness(0.9)',
      },
    },
    galaxy: {
      cinematic: {
        ...slot(
          'civilization.plate.galaxy.forge_spine.cinematic',
          'plate',
          'Forge Spine galactic cinematic plate',
          'bitmap',
          'Dedicated forge/ascent galactic plate for relic-forge chains, starbirth foundries, and sector-scale ignition consequences.',
          galacticForgePlateUrl,
        ),
        layer: 'plate',
        src: galacticForgePlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.07) contrast(1.06) brightness(1.01)',
      },
      scan: {
        ...slot(
          'civilization.plate.galaxy.forge_spine.scan',
          'plate',
          'Forge Spine galactic scan plate',
          'bitmap',
          'Dedicated scan-ready forge galactic plate; forge chains and ignition sectors remain legible under galactic pins.',
          galacticForgePlateUrl,
        ),
        layer: 'plate',
        src: galacticForgePlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.07) contrast(1.06) brightness(1.01)',
      },
    },
  },
  containment_sentinel: {
    orbit: {
      cinematic: {
        ...slot(
          'civilization.plate.orbit.containment_sentinel.cinematic',
          'plate',
          'Containment Sentinel orbit cinematic plate',
          'bitmap',
          'Dedicated containment/hazard orbit plate for quarantine regions, orbital exclusion bands, and sealed stations.',
          orbitContainmentPlateUrl,
        ),
        layer: 'plate',
        src: orbitContainmentPlateUrl,
        position: '50% 48%',
        transformOrigin: '50% 48%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.04) contrast(1.08) brightness(0.86)',
      },
      scan: {
        ...slot(
          'civilization.plate.orbit.containment_sentinel.scan',
          'plate',
          'Containment Sentinel orbit scan plate',
          'bitmap',
          'Dedicated scan-ready containment orbit plate; quarantine rings stay legible under hazard dossiers.',
          orbitContainmentPlateUrl,
        ),
        layer: 'plate',
        src: orbitContainmentPlateUrl,
        position: '50% 48%',
        transformOrigin: '50% 48%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.04) contrast(1.08) brightness(0.86)',
      },
    },
    surface: {
      cinematic: {
        ...slot(
          'civilization.plate.surface.containment_sentinel.cinematic',
          'plate',
          'Containment Sentinel surface cinematic plate',
          'bitmap',
          'Dedicated containment/hazard city plate for Abyss, redaction, quarantine, and sealed protocol civilizations.',
          surfaceContainmentPlateUrl,
        ),
        layer: 'plate',
        src: surfaceContainmentPlateUrl,
        position: '50% 54%',
        transformOrigin: '50% 54%',
        cinematicScale: 1.03,
        scanScale: 1.01,
        contrast: 'saturate(1.05) contrast(1.05) brightness(0.84)',
      },
      scan: {
        ...slot(
          'civilization.plate.surface.containment_sentinel.scan',
          'plate',
          'Containment Sentinel surface scan plate',
          'bitmap',
          'Dedicated scan-ready containment plate; quarantine geometry remains legible under hazard dossiers.',
          surfaceContainmentPlateUrl,
        ),
        layer: 'plate',
        src: surfaceContainmentPlateUrl,
        position: '50% 54%',
        transformOrigin: '50% 54%',
        cinematicScale: 1.03,
        scanScale: 1.01,
        contrast: 'saturate(1.05) contrast(1.05) brightness(0.84)',
      },
    },
    stellar: {
      cinematic: {
        ...slot(
          'civilization.plate.stellar.containment_sentinel.cinematic',
          'plate',
          'Containment Sentinel stellar cinematic plate',
          'bitmap',
          'Dedicated containment/hazard system plate for quarantine orbits, redaction bands, and exclusion infrastructure.',
          stellarContainmentPlateUrl,
        ),
        layer: 'plate',
        src: stellarContainmentPlateUrl,
        position: '50% 52%',
        transformOrigin: '50% 52%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.05) contrast(1.06) brightness(0.84)',
      },
      scan: {
        ...slot(
          'civilization.plate.stellar.containment_sentinel.scan',
          'plate',
          'Containment Sentinel stellar scan plate',
          'bitmap',
          'Dedicated scan-ready containment system plate; quarantine fields stay readable under hazard pins.',
          stellarContainmentPlateUrl,
        ),
        layer: 'plate',
        src: stellarContainmentPlateUrl,
        position: '50% 52%',
        transformOrigin: '50% 52%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.05) contrast(1.06) brightness(0.84)',
      },
    },
    galaxy: {
      cinematic: {
        ...slot(
          'civilization.plate.galaxy.containment_sentinel.cinematic',
          'plate',
          'Containment Sentinel galactic cinematic plate',
          'bitmap',
          'Dedicated containment/hazard galactic plate for dark sectors, exclusion mandalas, and sealed-route consequences.',
          galacticContainmentPlateUrl,
        ),
        layer: 'plate',
        src: galacticContainmentPlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.05) contrast(1.08) brightness(0.96)',
      },
      scan: {
        ...slot(
          'civilization.plate.galaxy.containment_sentinel.scan',
          'plate',
          'Containment Sentinel galactic scan plate',
          'bitmap',
          'Dedicated scan-ready containment galactic plate; dark sectors and quarantine mandalas remain legible under hazard dossiers.',
          galacticContainmentPlateUrl,
        ),
        layer: 'plate',
        src: galacticContainmentPlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.05) contrast(1.08) brightness(0.96)',
      },
    },
  },
  route_network: {
    orbit: {
      cinematic: {
        ...slot(
          'civilization.plate.orbit.route_network.cinematic',
          'plate',
          'Route Network orbit cinematic plate',
          'bitmap',
          'Dedicated route/transit orbit plate for launch lanes, orbital elevators, and planetary freight geometry.',
          orbitRoutePlateUrl,
        ),
        layer: 'plate',
        src: orbitRoutePlateUrl,
        position: '50% 48%',
        transformOrigin: '50% 48%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.06) contrast(1.04) brightness(0.92)',
      },
      scan: {
        ...slot(
          'civilization.plate.orbit.route_network.scan',
          'plate',
          'Route Network orbit scan plate',
          'bitmap',
          'Dedicated scan-ready route orbit plate; transit corridors stay legible under route pins.',
          orbitRoutePlateUrl,
        ),
        layer: 'plate',
        src: orbitRoutePlateUrl,
        position: '50% 48%',
        transformOrigin: '50% 48%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.06) contrast(1.04) brightness(0.92)',
      },
    },
    surface: {
      cinematic: {
        ...slot(
          'civilization.plate.surface.route_network.cinematic',
          'plate',
          'Route Network surface cinematic plate',
          'bitmap',
          'Dedicated route/transit city plate for Continuum, lift, logistics, and wormgate civilizations.',
          surfaceRoutePlateUrl,
        ),
        layer: 'plate',
        src: surfaceRoutePlateUrl,
        position: '50% 55%',
        transformOrigin: '50% 55%',
        cinematicScale: 1.03,
        scanScale: 1.01,
        contrast: 'saturate(1.06) contrast(1.04) brightness(0.87)',
      },
      scan: {
        ...slot(
          'civilization.plate.surface.route_network.scan',
          'plate',
          'Route Network surface scan plate',
          'bitmap',
          'Dedicated scan-ready route plate; transit corridors and lift hubs stay legible under route pins.',
          surfaceRoutePlateUrl,
        ),
        layer: 'plate',
        src: surfaceRoutePlateUrl,
        position: '50% 55%',
        transformOrigin: '50% 55%',
        cinematicScale: 1.03,
        scanScale: 1.01,
        contrast: 'saturate(1.06) contrast(1.04) brightness(0.87)',
      },
    },
    stellar: {
      cinematic: {
        ...slot(
          'civilization.plate.stellar.route_network.cinematic',
          'plate',
          'Route Network stellar cinematic plate',
          'bitmap',
          'Dedicated route/transit system plate for Continuum freight lanes, wormgate approaches, and orbital logistics.',
          stellarRoutePlateUrl,
        ),
        layer: 'plate',
        src: stellarRoutePlateUrl,
        position: '50% 52%',
        transformOrigin: '50% 52%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.07) contrast(1.04) brightness(0.9)',
      },
      scan: {
        ...slot(
          'civilization.plate.stellar.route_network.scan',
          'plate',
          'Route Network stellar scan plate',
          'bitmap',
          'Dedicated scan-ready route system plate; transit corridors remain legible under route pins.',
          stellarRoutePlateUrl,
        ),
        layer: 'plate',
        src: stellarRoutePlateUrl,
        position: '50% 52%',
        transformOrigin: '50% 52%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(0.86) contrast(0.98) brightness(0.8)',
      },
    },
    galaxy: {
      cinematic: {
        ...slot(
          'civilization.plate.galaxy.route_network.cinematic',
          'plate',
          'Route Network galactic cinematic plate',
          'bitmap',
          'Dedicated route/transit galactic plate for spiral-arm lanes, gateway chains, and sector logistics.',
          galacticRoutePlateUrl,
        ),
        layer: 'plate',
        src: galacticRoutePlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.06) contrast(1.05) brightness(1.02)',
      },
      scan: {
        ...slot(
          'civilization.plate.galaxy.route_network.scan',
          'plate',
          'Route Network galactic scan plate',
          'bitmap',
          'Dedicated scan-ready route galactic plate; spiral-arm routes stay readable under route pins.',
          galacticRoutePlateUrl,
        ),
        layer: 'plate',
        src: galacticRoutePlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(0.88) contrast(0.99) brightness(0.86)',
      },
    },
  },
  accord_beacon: {
    orbit: {
      cinematic: {
        ...slot(
          'civilization.plate.orbit.accord_beacon.cinematic',
          'plate',
          'Accord Beacon orbit cinematic plate',
          'bitmap',
          'Dedicated accord/covenant orbit plate for public treaty beacons, civic signal towers, and planetary witness infrastructure.',
          orbitAccordPlateUrl,
        ),
        layer: 'plate',
        src: orbitAccordPlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.03) contrast(1.05) brightness(0.9)',
      },
      scan: {
        ...slot(
          'civilization.plate.orbit.accord_beacon.scan',
          'plate',
          'Accord Beacon orbit scan plate',
          'bitmap',
          'Dedicated scan-ready accord orbit plate; treaty beacons and witness rings stay legible under civic dossiers.',
          orbitAccordPlateUrl,
        ),
        layer: 'plate',
        src: orbitAccordPlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.03) contrast(1.05) brightness(0.9)',
      },
    },
    galaxy: {
      cinematic: {
        ...slot(
          'civilization.plate.galaxy.accord_beacon.cinematic',
          'plate',
          'Accord Beacon galactic cinematic plate',
          'bitmap',
          'Dedicated accord/covenant galactic plate for witness constellations, treaty paths, and plural-civilization governance.',
          galacticAccordPlateUrl,
        ),
        layer: 'plate',
        src: galacticAccordPlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.03) contrast(1.05) brightness(1.01)',
      },
      scan: {
        ...slot(
          'civilization.plate.galaxy.accord_beacon.scan',
          'plate',
          'Accord Beacon galactic scan plate',
          'bitmap',
          'Dedicated scan-ready accord galactic plate; witness constellations and treaty paths stay legible under civic dossiers.',
          galacticAccordPlateUrl,
        ),
        layer: 'plate',
        src: galacticAccordPlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.03) contrast(1.05) brightness(1.01)',
      },
    },
  },
  archive_lattice: {
    stellar: {
      cinematic: {
        ...slot(
          'civilization.plate.stellar.archive_lattice.cinematic',
          'plate',
          'Archive Lattice stellar cinematic plate',
          'bitmap',
          'Dedicated archive/memory stellar plate for storm-memory filaments, archive stations, and system-scale warning relays.',
          stellarArchivePlateUrl,
        ),
        layer: 'plate',
        src: stellarArchivePlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.04) contrast(1.05) brightness(0.94)',
      },
      scan: {
        ...slot(
          'civilization.plate.stellar.archive_lattice.scan',
          'plate',
          'Archive Lattice stellar scan plate',
          'bitmap',
          'Dedicated scan-ready archive stellar plate; memory filaments and warning relays remain readable under system dossiers.',
          stellarArchivePlateUrl,
        ),
        layer: 'plate',
        src: stellarArchivePlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.04) contrast(1.05) brightness(0.94)',
      },
    },
    galaxy: {
      cinematic: {
        ...slot(
          'civilization.plate.galaxy.archive_lattice.cinematic',
          'plate',
          'Archive Lattice galactic cinematic plate',
          'bitmap',
          'Dedicated archive/memory galactic plate for ancestral signal networks, archive spines, and dead-system records.',
          galacticArchivePlateUrl,
        ),
        layer: 'plate',
        src: galacticArchivePlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.03) contrast(1.05) brightness(1.01)',
      },
      scan: {
        ...slot(
          'civilization.plate.galaxy.archive_lattice.scan',
          'plate',
          'Archive Lattice galactic scan plate',
          'bitmap',
          'Dedicated scan-ready archive galactic plate; memory spines and ancestral signal paths remain readable under archive dossiers.',
          galacticArchivePlateUrl,
        ),
        layer: 'plate',
        src: galacticArchivePlateUrl,
        position: '50% 50%',
        transformOrigin: '50% 50%',
        cinematicScale: 1,
        scanScale: 1,
        contrast: 'saturate(1.03) contrast(1.05) brightness(1.01)',
      },
    },
  },
};
*/

const ARCHETYPE_LABELS: Record<CivilizationArchetypeId, string> = {
  living_arcology: 'Living Arcology',
  forge_spine: 'Forge Spine',
  containment_sentinel: 'Containment Sentinel',
  route_network: 'Route Network',
  accord_beacon: 'Accord Beacon',
  archive_lattice: 'Archive Lattice',
};

const BLUEPRINT_SLOT_IDS: readonly BlueprintId[] = [
  'bp_antimatter_detonator',
  'bp_mantle_to_orbit_foundry',
  'bp_ascension_registry',
  'bp_worldshield_covenant',
];

const TREATMENT_LABELS: Record<ArtifactSceneTreatment, string> = {
  ashroot_recovery: 'Ashroot Recovery',
  mantlelift_driver: 'Mantlelift Driver',
  ignition_kernel: 'Ignition Kernel',
  magnetic_bottle: 'Magnetic Bottle',
  horizon_extractor: 'Horizon Extractor',
  entropy_baffle: 'Entropy Baffle',
};

export function getCivilizationPlateArtSlot(
  scene: CivilizationArtScene,
  scanActive: boolean,
  archetype?: CivilizationArchetypeId | null,
  dyad?: CivilizationDyadId | null,
  evolutionStage: CivilizationComplexityStage = 0,
  civilizationMaturity: CivilizationPlateMaturity = 'planetary',
): CivilizationPlateArtSlot {
  const mode = scanActive ? 'scan' : 'cinematic';
  const substrate = CIVILIZATION_PLATE_ART[scene][mode];
  const evolution = CIVILIZATION_PLATE_EVOLUTION[evolutionStage];
  // Dyads and archetypes are physical construction layers. They must never
  // replace the match-persistent world substrate.
  void archetype;
  void dyad;
  return {
    ...substrate,
    cinematicScale: substrate.cinematicScale * evolution.zoom,
    scanScale: substrate.scanScale * evolution.zoom,
    contrast: `saturate(${evolution.saturation}) contrast(${evolution.contrast}) brightness(${evolution.brightness})`,
    evolutionStage,
    evolutionLabel: evolution.label,
    evolutionVeilOpacity: evolution.veilOpacity,
    evolutionInfrastructureOpacity: evolution.infrastructureOpacity,
    civilizationMaturity,
  };
}

const ENVIRONMENT_PLATE_POSITION: Record<
  CivilizationEnvironmentIdentity['variantId'],
  Partial<Record<CivilizationArtScene, string>>
> = {
  aurora_basin: { surface: '45% 55%', orbit: '46% 48%', stellar: '48% 52%', galaxy: '46% 50%' },
  terminator_reach: { surface: '45% 55%', orbit: '56% 47%', stellar: '55% 50%', galaxy: '55% 48%' },
  oceanic_scar: { surface: '45% 55%', orbit: '52% 51%', stellar: '46% 54%', galaxy: '53% 52%' },
  obsidian_steppe: { surface: '45% 55%', orbit: '48% 43%', stellar: '54% 48%', galaxy: '48% 47%' },
};

/**
 * Persistent-world portrait. Geography, camera, and celestial identity remain
 * stable while a proven vertical slice may replace only the authored urban
 * fabric at each development milestone. Districts, Artifacts, and Blueprints
 * remain independent physical layers above the plate.
 */
export function getCivilizationEnvironmentPlateArtSlot(
  scene: CivilizationArtScene,
  scanActive: boolean,
  environmentIdentity: CivilizationEnvironmentIdentity,
  evolutionStage: CivilizationComplexityStage = 0,
  civilizationMaturity: CivilizationPlateMaturity = 'planetary',
  settlementPhase: CivilizationSettlementPhase = 'wilderness',
  architecturalIdentity: CivilizationDyadId | null = null,
  cityDevelopmentStage: CivilizationCityDevelopmentStage = 0,
): CivilizationPlateArtSlot {
  const base = getCivilizationPlateArtSlot(
    scene,
    scanActive,
    null,
    null,
    evolutionStage,
    civilizationMaturity,
  );
  const sceneSpecificPlate = ENVIRONMENT_SCENE_PLATE_URLS[environmentIdentity.variantId]?.[scene];
  const sceneSpecificMobilePlate = ENVIRONMENT_SCENE_MOBILE_PLATE_URLS[environmentIdentity.variantId]?.[scene];
  // The galactic city reference is authored for this one endpoint. Other
  // dressings and development stages retain their existing architectural art.
  const usesGalacticChrysalisReference = environmentIdentity.variantId === 'aurora_basin' &&
    scene === 'surface' && cityDevelopmentStage === 9 && architecturalIdentity === 'chrysalis';
  const cityProgressionPlate = usesGalacticChrysalisReference
    ? auroraBasinGalacticChrysalisReferenceUrl
    : getEnvironmentCityProgressionPlate(scene, cityDevelopmentStage, architecturalIdentity);
  const cityProgressionMobilePlate = usesGalacticChrysalisReference
    ? auroraBasinGalacticChrysalisReferenceMobileUrl
    : getEnvironmentCityProgressionMobilePlate(scene, cityDevelopmentStage, architecturalIdentity);
  const plate = cityProgressionPlate ?? sceneSpecificPlate;
  const cityProgressionActive = Boolean(cityProgressionPlate);
  const settlementNote = settlementPhase === 'wilderness'
    ? 'No settlement fabric is active.'
    : cityProgressionActive
      ? `Settlement phase ${settlementPhase} is authored into the continuous city fabric at stage ${cityDevelopmentStage}.`
      : `Settlement phase ${settlementPhase} is assembled above this plate at city stage ${cityDevelopmentStage}.`;
  const identityNote = architecturalIdentity
    ? cityProgressionActive
      ? getSurfaceCityFabric(cityDevelopmentStage, architecturalIdentity)
        ? `${architecturalIdentity} architecture shapes the surrounding city fabric and unoccupied districts on the shared construction plan; resident districts retain their own identity.`
        : `${architecturalIdentity} architecture shapes the unoccupied city districts above the shared road and foundation substrate; resident districts retain their own identity.`
      : `${architecturalIdentity} architecture is supplied by the modular district kit.`
    : 'Uncommitted construction is supplied by the neutral settlement kit.';
  return {
    ...base,
    id: cityProgressionActive
      ? `civilization.environment.${environmentIdentity.variantId}.${scene}.city-${cityDevelopmentStage}.${architecturalIdentity ?? 'neutral'}.${scanActive ? 'scan' : 'cinematic'}`
      : `civilization.environment.${environmentIdentity.variantId}.${scene}.${scanActive ? 'scan' : 'cinematic'}`,
    label: cityProgressionActive
      ? `${environmentIdentity.variantId.replaceAll('_', ' ')} ${scene} city stage ${cityDevelopmentStage}`
      : `${environmentIdentity.variantId.replaceAll('_', ' ')} ${scene} environment`,
    src: plate ?? ENVIRONMENT_SUBSTRATE_ATLAS_URLS[environmentIdentity.variantId],
    mobileSrc: cityProgressionActive ? cityProgressionMobilePlate : sceneSpecificMobilePlate,
    atlasCell: plate ? undefined : ENVIRONMENT_SUBSTRATE_ATLAS_CELLS[scene],
    cinematicScale: scene === 'surface' ? 1 : base.cinematicScale,
    scanScale: scene === 'surface' ? 1 : base.scanScale,
    contrast: base.contrast,
    constructionPlanId: scene === 'surface'
      ? CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID
      : undefined,
    notes: `Match-persistent world identity at evolution stage ${evolutionStage}. ${scene === 'surface' ? `All environment dressings share construction plan ${CIVILIZATION_SURFACE_CONSTRUCTION_PLAN_ID}; terrain topology, camera, districts, and sockets remain invariant.` : 'Geography, camera, and horizon remain continuous.'} ${settlementNote} ${identityNote} Artifacts and Blueprints remain independent physical manifestations.`,
    position: ENVIRONMENT_PLATE_POSITION[environmentIdentity.variantId][scene] ?? base.position,
    transformOrigin: ENVIRONMENT_PLATE_POSITION[environmentIdentity.variantId][scene] ?? base.transformOrigin,
  };
}

export function getCivilizationArchetypeArtSlot(
  archetype: CivilizationArchetypeId,
  scene: CivilizationArtScene,
): CivilizationArtSlot {
  return slot(
    `civilization.archetype.${archetype}.${scene}`,
    'archetype',
    `${ARCHETYPE_LABELS[archetype]} ${scene}`,
    'procedural',
    'Physical dyad host architecture integrated into the persistent environment at an authored socket.',
  );
}

export function getCivilizationBlueprintArtSlot(
  blueprintId: BlueprintId,
  revealedLabel = 'Manifested Blueprint',
): CivilizationArtSlot {
  return slot(
    `civilization.blueprint.${blueprintId}`,
    'blueprint',
    revealedLabel,
    'procedural',
    'Rendered as a physical Great Work with authored scale, construction state, and scene integration.',
  );
}

export function getCivilizationArtifactTreatmentArtSlot(
  treatment: ArtifactSceneTreatment,
): CivilizationArtSlot {
  return slot(
    `civilization.artifact-treatment.${treatment}`,
    'artifact-treatment',
    TREATMENT_LABELS[treatment],
    'procedural',
    'Rendered as a physical operational condition on the affected manifestation, never as scene geometry.',
  );
}

export function getCivilizationChronicleArtSlot(chronicleId: string): CivilizationArtSlot {
  const normalized = chronicleId.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_') || 'unknown';
  return slot(
    `civilization.chronicle.${normalized}`,
    'chronicle',
    `Chronicle ${normalized}`,
    'planned',
    'Reserved for story-mode chronicle scene influence art. No live render cost until an asset is attached.',
  );
}

export function getCivilizationSiteArtSlot(
  site: CivilizationDeploymentSite,
): CivilizationArtSlot | null {
  if (site.kind === 'blueprint' && site.blueprintId) {
    return getCivilizationBlueprintArtSlot(
      site.blueprintId,
      site.blueprintRole ?? site.title,
    );
  }
  if (site.kind === 'artifact' && site.artifactSceneTreatment) {
    return getCivilizationArtifactTreatmentArtSlot(site.artifactSceneTreatment);
  }
  if (site.kind === 'protocol') {
    return getCivilizationChronicleArtSlot(site.id);
  }
  if (site.kind === 'chronicle') {
    return getCivilizationChronicleArtSlot(site.chronicleId ?? site.id);
  }
  return null;
}

export function listCivilizationArtSlots(): CivilizationArtSlot[] {
  const plateSlots = Object.values(CIVILIZATION_PLATE_ART).flatMap((entry) => [
    entry.cinematic,
    entry.scan,
  ]);
  const environmentPlateSlots = CIVILIZATION_ENVIRONMENT_VARIANTS.flatMap((variant) => {
    const identity = createCivilizationEnvironmentIdentity(
      `art-registry:${variant.id}`,
      variant.id,
    );
    return (['surface', 'orbit', 'stellar', 'galaxy'] as CivilizationArtScene[])
      .flatMap((scene) => [
        getCivilizationEnvironmentPlateArtSlot(scene, false, identity),
        getCivilizationEnvironmentPlateArtSlot(scene, true, identity),
      ]);
  });
  const archetypeSlots = (Object.keys(ARCHETYPE_LABELS) as CivilizationArchetypeId[])
    .flatMap((archetype) => (
      (['surface', 'orbit', 'stellar', 'galaxy'] as CivilizationArtScene[])
        .map((scene) => getCivilizationArchetypeArtSlot(archetype, scene))
    ));
  const blueprintSlots = BLUEPRINT_SLOT_IDS
    .map((blueprintId) => getCivilizationBlueprintArtSlot(blueprintId));
  const treatmentSlots = (Object.keys(TREATMENT_LABELS) as ArtifactSceneTreatment[])
    .map(getCivilizationArtifactTreatmentArtSlot);
  return [
    ...plateSlots,
    ...environmentPlateSlots,
    ...archetypeSlots,
    ...blueprintSlots,
    ...treatmentSlots,
  ];
}
