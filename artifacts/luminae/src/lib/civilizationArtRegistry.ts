import type { BlueprintId } from '@workspace/game-types';
import type {
  ArtifactSceneTreatment,
  CivilizationDeploymentSite,
} from '@/lib/civilizationDeploymentSites';
import type { CivilizationArchetypeId } from '@/lib/civilizationArchetypes';
import orbitAccordPlateUrl from '@/assets/civilization/civilization-plate-orbit-accord-v1.jpg';
import orbitContainmentPlateUrl from '@/assets/civilization/civilization-plate-orbit-containment-v1.jpg';
import orbitForgePlateUrl from '@/assets/civilization/civilization-plate-orbit-forge-v1.jpg';
import orbitLivingPlateUrl from '@/assets/civilization/civilization-plate-orbit-living-v1.jpg';
import orbitRoutePlateUrl from '@/assets/civilization/civilization-plate-orbit-route-v1.jpg';
import planetaryPlateCinematicUrl from '@/assets/civilization/civilization-plate-planetary-v1_runtime.webp';
import surfaceCityPlateUrl from '@/assets/civilization/civilization-plate-surface-v3-city_runtime.webp';
import surfaceContainmentPlateUrl from '@/assets/civilization/civilization-plate-surface-containment-v1.jpg';
import surfaceForgePlateUrl from '@/assets/civilization/civilization-plate-surface-forge-v1.jpg';
import surfaceLivingPlateUrl from '@/assets/civilization/civilization-plate-surface-living-v1.jpg';
import surfaceRoutePlateUrl from '@/assets/civilization/civilization-plate-surface-route-v1.jpg';
import stellarContainmentPlateUrl from '@/assets/civilization/civilization-plate-stellar-containment-v1.jpg';
import stellarForgePlateUrl from '@/assets/civilization/civilization-plate-stellar-forge-v1.jpg';
import stellarArchivePlateUrl from '@/assets/civilization/civilization-plate-stellar-archive-v1.jpg';
import stellarLivingPlateUrl from '@/assets/civilization/civilization-plate-stellar-living-v1.jpg';
import stellarPlateNeutralUrl from '@/assets/civilization/civilization-plate-stellar-v2-neutral_runtime.webp';
import stellarRoutePlateUrl from '@/assets/civilization/civilization-plate-stellar-route-v1.jpg';
import galacticAccordPlateUrl from '@/assets/civilization/civilization-plate-galactic-accord-v1.jpg';
import galacticArchivePlateUrl from '@/assets/civilization/civilization-plate-galactic-archive-v1.jpg';
import galacticContainmentPlateUrl from '@/assets/civilization/civilization-plate-galactic-containment-v1.jpg';
import galacticForgePlateUrl from '@/assets/civilization/civilization-plate-galactic-forge-v1.jpg';
import galacticLivingPlateUrl from '@/assets/civilization/civilization-plate-galactic-living-v1.jpg';
import galacticPlateNeutralUrl from '@/assets/civilization/civilization-plate-galactic-v2-neutral_runtime.webp';
import galacticRoutePlateUrl from '@/assets/civilization/civilization-plate-galactic-route-v1.jpg';

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
  position: string;
  transformOrigin: string;
  cinematicScale: number;
  scanScale: number;
  contrast: string;
}

type CivilizationPlateArtPair = {
  cinematic: CivilizationPlateArtSlot;
  scan: CivilizationPlateArtSlot;
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

const CIVILIZATION_PLATE_ART: Record<CivilizationArtScene, CivilizationPlateArtPair> = {
  surface: {
    cinematic: {
      ...slot(
        'civilization.plate.surface.cinematic',
        'plate',
        'City surface cinematic plate',
        'bitmap',
        'Dedicated market-ready city/surface civilization plate with visible districts and built forms.',
        surfaceCityPlateUrl,
      ),
      layer: 'plate',
      src: surfaceCityPlateUrl,
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
        'City surface scan plate',
        'bitmap',
        'Dedicated scan-ready city plate; districts stay visible under deployment pins and dossiers.',
        surfaceCityPlateUrl,
      ),
      layer: 'plate',
      src: surfaceCityPlateUrl,
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
        'Planetary orbit cinematic plate',
        'bitmap',
        'Full planetary civilization read.',
        planetaryPlateCinematicUrl,
      ),
      layer: 'plate',
      src: planetaryPlateCinematicUrl,
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
        'Planetary orbit scan plate',
        'bitmap',
        'Currently reuses the cinematic orbit plate until a dedicated scan plate is purchased.',
        planetaryPlateCinematicUrl,
      ),
      layer: 'plate',
      src: planetaryPlateCinematicUrl,
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
        'Cleaner system-scale civilization plate for authored stellar composition.',
        stellarPlateNeutralUrl,
      ),
      layer: 'plate',
      src: stellarPlateNeutralUrl,
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
        'Cleaner scan-ready stellar plate that leaves room for deployment sites and routes.',
        stellarPlateNeutralUrl,
      ),
      layer: 'plate',
      src: stellarPlateNeutralUrl,
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
        'Cleaner galactic sector plate that keeps the galaxy readable before scan overlays appear.',
        galacticPlateNeutralUrl,
      ),
      layer: 'plate',
      src: galacticPlateNeutralUrl,
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
        'Cleaner scan-ready galactic plate for sector pins, routes, and aggregate signals.',
        galacticPlateNeutralUrl,
      ),
      layer: 'plate',
      src: galacticPlateNeutralUrl,
      position: '50% 50%',
      transformOrigin: '50% 50%',
      cinematicScale: 1,
      scanScale: 1,
      contrast: 'saturate(1.04) contrast(1.06) brightness(1.03)',
    },
  },
};

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
): CivilizationPlateArtSlot {
  const archetypePlateArt = archetype
    ? CIVILIZATION_ARCHETYPE_PLATE_ART[archetype]?.[scene]
    : undefined;
  return (archetypePlateArt ?? CIVILIZATION_PLATE_ART[scene])[scanActive ? 'scan' : 'cinematic'];
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
    'Rendered by the low-cost SVG identity layer until bespoke/purchased archetype art is attached.',
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
    'Rendered as a civilization-scale consequence. Attach bespoke project art here when available.',
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
    'Rendered as scale-aware SVG treatment marks. Attach lightweight treatment art here when available.',
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
  const archetypePlateSlots = Object.values(CIVILIZATION_ARCHETYPE_PLATE_ART)
    .flatMap((scenes) => Object.values(scenes ?? {}))
    .flatMap((entry) => [entry.cinematic, entry.scan]);
  const archetypeSlots = (Object.keys(ARCHETYPE_LABELS) as CivilizationArchetypeId[])
    .flatMap((archetype) => (
      (['surface', 'orbit', 'stellar', 'galaxy'] as CivilizationArtScene[])
        .map((scene) => getCivilizationArchetypeArtSlot(archetype, scene))
    ));
  const blueprintSlots = BLUEPRINT_SLOT_IDS
    .map((blueprintId) => getCivilizationBlueprintArtSlot(blueprintId));
  const treatmentSlots = (Object.keys(TREATMENT_LABELS) as ArtifactSceneTreatment[])
    .map(getCivilizationArtifactTreatmentArtSlot);
  return [...plateSlots, ...archetypePlateSlots, ...archetypeSlots, ...blueprintSlots, ...treatmentSlots];
}
