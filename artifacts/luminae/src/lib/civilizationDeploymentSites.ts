import type {
  ArtifactCard,
  CardLoreCatalog,
  CivilizationPublicArtifactState,
  GamePlayerState,
  LuminaryActiveState,
  ScenarioProtocolPublicState,
} from '@workspace/api-client-react';
import {
  ARTIFACT_DEPICTION_SCALE_BY_ID,
  ARTIFACT_DEFINITION_BY_ID,
  ARTIFACT_TECHNOLOGY_METADATA_BY_ID,
  type ArtifactId,
  type BlueprintId,
  type CivilizationCapabilityId,
} from '@workspace/game-types';
import type { KardashevTier } from '@/lib/kardashev';
import {
  getArtifactArtworkScalePolicy,
  isArtifactPinDepictionScale,
  type ArtifactDepictionScale,
  type ArtifactScalePresence,
  type CivilizationArtworkLayer,
} from '@/lib/civilizationArtworkScale';
import {
  CIVILIZATION_TRAIT_LABELS,
  getArtifactCivilizationTrait,
  hashCivilizationValue,
  type CivilizationTrait,
} from '@/lib/civilizationProfile';

export type CivilizationScaleBand = 'planetary' | 'stellar' | 'galactic';
export type CivilizationDeploymentKind = 'artifact' | 'blueprint' | 'luminary' | 'protocol' | 'chronicle';

type ArtifactAffinity = ArtifactCard['bonusAffinity'];
export type ArtifactVisualMotif =
  | 'seed'
  | 'coil'
  | 'prism'
  | 'vessel'
  | 'archive'
  | 'lattice'
  | 'forge'
  | 'organ'
  | 'seal'
  | 'aperture'
  | 'relay'
  | 'containment'
  | 'generic';
export type ArtifactSceneTreatment =
  | 'ashroot_recovery'
  | 'mantlelift_driver'
  | 'ignition_kernel'
  | 'magnetic_bottle'
  | 'horizon_extractor'
  | 'entropy_baffle';

export interface CivilizationDeploymentAnchor {
  x: number;
  y: number;
}

export interface CivilizationDeploymentSite {
  id: string;
  kind: CivilizationDeploymentKind;
  scaleBand: CivilizationScaleBand;
  trait: CivilizationTrait;
  artifactId?: string;
  artifactTier?: ArtifactCard['tier'];
  artifactForm?: string;
  blueprintRole?: string;
  blueprintFamilies?: string;
  completedBlueprintId?: BlueprintId;
  componentSummary?: string;
  gameplayEffect?: string;
  capabilityIds?: readonly CivilizationCapabilityId[];
  activeCapabilityIds?: readonly CivilizationCapabilityId[];
  implementationState?: CivilizationPublicArtifactState['implementationState'];
  implementationStateChangedTurnCount?: number | null;
  masteryCount?: number;
  historyEvidence?: CivilizationPublicArtifactState['historyEvidence'];
  projectState?: NonNullable<GamePlayerState['manifestedBlueprintDevices']>[number]['state'];
  consequenceLabel: string;
  visualCue: string;
  synergySummary?: string;
  supportingArtifactNames?: string[];
  engineeringScale?: string;
  depictionScale?: ArtifactDepictionScale;
  scalePresence?: ArtifactScalePresence;
  nativeArtworkLayer?: CivilizationArtworkLayer;
  nativeArtworkLabel?: string;
  scalePolicyCopy?: string;
  artifactVisualMotif?: ArtifactVisualMotif;
  artifactSceneTreatment?: ArtifactSceneTreatment;
  representationMode: 'local_trace' | 'civilization_infrastructure' | 'blueprint_consequence' | 'luminary_influence' | 'sealed_protocol' | 'chronicle_record';
  sourceQuality: 'authored' | 'derived';
  blueprintId?: BlueprintId;
  chronicleId?: string;
  affinity: ArtifactAffinity;
  anchor: CivilizationDeploymentAnchor;
  priority: number;
  title: string;
  summary: string;
  visibleAs: string;
  laneLabel: string;
  relatedArtifactIds: string[];
}

export interface CivilizationChronicleState {
  chronicleId: string;
  ownerPlayerId?: string;
  title: string;
  summary?: string;
  visibleAs?: string;
  laneLabel?: string;
  publicEffect?: string;
  scaleBand?: CivilizationScaleBand;
  affinity?: ArtifactAffinity;
  trait?: CivilizationTrait;
  priority?: number;
}

export interface BuildCivilizationDeploymentSitesInput {
  forgedArtifacts: readonly ArtifactCard[];
  loreCatalog?: CardLoreCatalog;
  tier: KardashevTier;
  ownerPlayerId?: string;
  turnCount?: number;
  luminaryAffinities?: readonly LuminaryActiveState[];
  manifestedBlueprintDevices?: GamePlayerState['manifestedBlueprintDevices'];
  scenarioProtocols?: readonly ScenarioProtocolPublicState[];
  chronicleRecords?: readonly CivilizationChronicleState[];
  civilizationArtifacts?: readonly CivilizationPublicArtifactState[];
  activeCapabilityIds?: readonly string[];
}

export function buildCivilizationArtifactHistoryCards(
  forgedArtifacts: readonly ArtifactCard[],
  civilizationArtifacts: readonly CivilizationPublicArtifactState[] = [],
  loreCatalog?: CardLoreCatalog,
): ArtifactCard[] {
  const cards = [...forgedArtifacts];
  const representedIds = new Set(cards.map((card) => card.id));

  for (const lifecycle of civilizationArtifacts) {
    if (representedIds.has(lifecycle.artifactId)) continue;
    const definition = ARTIFACT_DEFINITION_BY_ID[lifecycle.artifactId as ArtifactId];
    if (!definition) continue;
    const lore = loreCatalog?.[lifecycle.artifactId];
    cards.push({
      ...definition,
      name: lore?.name ?? `Artifact ${lifecycle.artifactId.toUpperCase()}`,
      flavor: lore?.flavor ?? '',
    });
    representedIds.add(lifecycle.artifactId);
  }

  return cards;
}

const TRAIT_SITE_TITLES: Record<CivilizationScaleBand, Record<CivilizationTrait, string>> = {
  planetary: {
    ignition: 'Forge District',
    biosphere: 'Biosphere Recovery Belt',
    chronology: 'Chronology Array',
    transit: 'Orbital Transit Corridor',
    archive: 'Archive Citadel',
    lattice: 'Habitat Lattice',
    veil: 'Veil Shadow Field',
    containment: 'Containment Perimeter',
    replication: 'Fabrication Ward',
    accord: 'Concord Complex',
    entropy: 'Waste-Heat Channel',
    aperture: 'Threshold Station',
  },
  stellar: {
    ignition: 'Inner-System Ignition Relay',
    biosphere: 'Habitat Ecology Chain',
    chronology: 'Synchronized Orbit Clock',
    transit: 'Interplanetary Freight Lane',
    archive: 'Archive Moon Uplink',
    lattice: 'Orbital Habitat Mesh',
    veil: 'Heliopause Blind',
    containment: 'Quarantine Orbit',
    replication: 'Autoforge Swarm Site',
    accord: 'Treaty Beacon Chain',
    entropy: 'Thermal Dump Orbit',
    aperture: 'Wormgate Approach',
  },
  galactic: {
    ignition: 'Relic Forge Chain',
    biosphere: 'Worldroot Corridor',
    chronology: 'Causality Accord Sector',
    transit: 'Spiral-Arm Route',
    archive: 'Archive Spine',
    lattice: 'Habitat Cluster Mesh',
    veil: 'Dark-Sector Lane',
    containment: 'Collapse Mandala',
    replication: 'Distributed Maker Chain',
    accord: 'Concordance Sector',
    entropy: 'Terminal-System Buffer',
    aperture: 'Black-Map Threshold',
  },
};

const TRAIT_VISIBLE_AS: Record<CivilizationScaleBand, Record<CivilizationTrait, string>> = {
  planetary: {
    ignition: 'thermal glow from controlled forge districts',
    biosphere: 'green recovery belts and adaptive biome corridors',
    chronology: 'time-locked civic arrays and synchronized infrastructure',
    transit: 'launch lanes, elevator traffic, and orbital cargo pulses',
    archive: 'memory citadels, witness vaults, and archive uplinks',
    lattice: 'linked habitats and illuminated civic grids',
    veil: 'shadowed signal fields crossing the horizon',
    containment: 'sealed perimeter lights around dangerous work zones',
    replication: 'fabrication wards and self-repairing industrial grids',
    accord: 'treaty-lit civic centers and public legitimacy signals',
    entropy: 'waste-heat scars converted into usable industrial flow',
    aperture: 'a threshold station where encrypted transit opens',
  },
  stellar: {
    ignition: 'inner-system relay arcs and controlled solar industry',
    biosphere: 'habitat ecology chains threaded between worlds',
    chronology: 'synchronized orbit clocks and causality audit stations',
    transit: 'interplanetary freight lanes and wormgate approach vectors',
    archive: 'archive moons and long-memory signal paths',
    lattice: 'orbital habitat meshes around inhabited worlds',
    veil: 'heliopause-scale concealment and signal discipline',
    containment: 'quarantine orbits and cold exclusion bands',
    replication: 'autoforge swarms operating in stable orbital lanes',
    accord: 'treaty beacon chains binding multi-world governance',
    entropy: 'thermal dump orbits and stellar waste-routing paths',
    aperture: 'wormgate approaches and sealed threshold corridors',
  },
  galactic: {
    ignition: 'relic forge chains distributed through a spiral-arm sector',
    biosphere: 'worldroot corridors binding distant living systems',
    chronology: 'causality accord sectors and deep-time governance routes',
    transit: 'spiral-arm routes linking strategic star clusters',
    archive: 'archive spines preserving extinct and living civilizations',
    lattice: 'habitat cluster meshes across settled volumes',
    veil: 'dark-sector lanes and deliberate absence on public maps',
    containment: 'collapse mandalas around forbidden systems',
    replication: 'distributed maker chains seeded between clusters',
    accord: 'concordance sectors where incompatible societies remain legible',
    entropy: 'terminal-system buffers and dead-zone energy routing',
    aperture: 'black-map thresholds at the edge of sanctioned travel',
  },
};

const TRAIT_VISUAL_CUES: Record<CivilizationScaleBand, Record<CivilizationTrait, string>> = {
  planetary: {
    ignition: 'warm forge light under civic districts',
    biosphere: 'green restoration seams crossing damaged terrain',
    chronology: 'synchronized white timing pulses across the skyline',
    transit: 'gold launch arcs and freight lanes rising out of the crust',
    archive: 'quiet uplinks around protected memory towers',
    lattice: 'linked habitat lights and civic grid geometry',
    veil: 'low shadow bands where signals deliberately disappear',
    containment: 'red perimeter rings around dangerous work',
    replication: 'self-repair grids expanding through industrial wards',
    accord: 'public treaty beacons in civic centers',
    entropy: 'dim heat channels carrying waste into useful work',
    aperture: 'threshold geometry at sanctioned transit gates',
  },
  stellar: {
    ignition: 'controlled inner-system heat arcs',
    biosphere: 'living habitat bands between worlds',
    chronology: 'orbit clocks keeping separate worlds synchronized',
    transit: 'freight curves crossing planet lanes',
    archive: 'long-memory uplinks from moons and archives',
    lattice: 'habitat meshes around inhabited worlds',
    veil: 'blind heliopause lanes in the outer system',
    containment: 'cold quarantine ellipses and exclusion bands',
    replication: 'maker swarms in stable manufacturing orbits',
    accord: 'treaty beacons binding multi-world governance',
    entropy: 'thermal dumping lanes away from habitation',
    aperture: 'sealed approach vectors into wormgate corridors',
  },
  galactic: {
    ignition: 'relic forge chains along a spiral-arm industry route',
    biosphere: 'worldroot corridors between living systems',
    chronology: 'deep-time governance routes across causality sectors',
    transit: 'strategic route geometry through star clusters',
    archive: 'archive spines along protected memory corridors',
    lattice: 'habitat clusters connected as a settled mesh',
    veil: 'missing lanes and deliberate absence on public maps',
    containment: 'collapse mandalas around forbidden systems',
    replication: 'distributed maker chains seeded between clusters',
    accord: 'concordance fields making distant societies legible',
    entropy: 'dead-zone buffers routing terminal system heat',
    aperture: 'black-map thresholds at sanctioned borders',
  },
};

const ARTIFACT_TREATMENT_SITE_COPY: Record<ArtifactSceneTreatment, Record<CivilizationScaleBand, {
  visibleAs: string;
  visualCue: string;
}>> = {
  ashroot_recovery: {
    planetary: {
      visibleAs: 'green recovery belts, charred root nurseries, and adaptive biome corridors rebuilding damaged districts',
      visualCue: 'ember-veined recovery beds with new green tissue spreading through scarred terrain',
    },
    stellar: {
      visibleAs: 'habitat ecology chains repaired by ash-root nurseries between inhabited worlds',
      visualCue: 'soft green recovery seams moving through habitat bands and damaged orbital gardens',
    },
    galactic: {
      visibleAs: 'worldroot corridors where burned systems become seedbeds for new living routes',
      visualCue: 'green recovery threads crossing old burn scars between distant systems',
    },
  },
  mantlelift_driver: {
    planetary: {
      visibleAs: 'sealed feedstock capsule pulses climbing from crustal lift coils into orbital industry',
      visualCue: 'thin gold ascent spines, capsule ticks, and freight handoff glints rising from the city',
    },
    stellar: {
      visibleAs: 'interplanetary freight lanes fed by planetary lift coils and orbital handoff stations',
      visualCue: 'gold lift geometry feeding cooler blue freight curves between planets',
    },
    galactic: {
      visibleAs: 'industrial ascent chains feeding relic-forge routes across settled clusters',
      visualCue: 'linked freight sparks moving from local wells into spiral-arm logistics',
    },
  },
  ignition_kernel: {
    planetary: {
      visibleAs: 'bounded ignition hearts starting furnaces, shipyards, and rescue heat without burning the city',
      visualCue: 'small contained flare cores nested inside forge districts and emergency heat lines',
    },
    stellar: {
      visibleAs: 'controlled ignition relays feeding inner-system industry and orbital forge starts',
      visualCue: 'warm furnace-heart nodes blinking inside solar industry lanes',
    },
    galactic: {
      visibleAs: 'furnace-heart nodes lighting relic forge chains without spreading into open warfire',
      visualCue: 'contained orange ignition points distributed along old forge routes',
    },
  },
  magnetic_bottle: {
    planetary: {
      visibleAs: 'white-gold containment shells where dangerous plasma and field pressure are disciplined',
      visualCue: 'nested field loops and bottle-shaped containment glints around hazardous work zones',
    },
    stellar: {
      visibleAs: 'quarantine containment shells holding reaction lanes apart across the inhabited system',
      visualCue: 'white-gold magnetic loops bracing red exclusion paths and orbital hazard lanes',
    },
    galactic: {
      visibleAs: 'field-discipline mandalas around forbidden work that must remain bounded at distance',
      visualCue: 'small containment knots embedded inside larger dark-sector warning geometry',
    },
  },
  horizon_extractor: {
    planetary: {
      visibleAs: 'horizon samplers reading forbidden boundary physics from protected civic instruments',
      visualCue: 'dark half-rings and white sampling rays pointed at sealed boundary stations',
    },
    stellar: {
      visibleAs: 'boundary-energy samplers coupled to cold exclusion bands and observatory lanes',
      visualCue: 'black horizon arcs with white extraction ticks near outer-system hazard paths',
    },
    galactic: {
      visibleAs: 'black-map sampling stations watching the edge of sanctioned physics from far corridors',
      visualCue: 'thin horizon crescents hidden inside abyssal route scars',
    },
  },
  entropy_baffle: {
    planetary: {
      visibleAs: 'soot-dark heat baffles routing waste heat and decay into usable industrial flow',
      visualCue: 'stacked heat fins, ember vents, and dark thermal channels along forge districts',
    },
    stellar: {
      visibleAs: 'thermal dump baffles pushing dangerous waste heat away from inhabited orbits',
      visualCue: 'dark orange heat-sink fins at the edge of brighter freight and forge lanes',
    },
    galactic: {
      visibleAs: 'terminal-system buffers where dead heat is caught before it poisons the route chain',
      visualCue: 'dim ember baffles interrupting otherwise clean industrial paths',
    },
  },
};

const TRAIT_CONSEQUENCE_LABELS: Record<CivilizationTrait, string> = {
  ignition: 'Energy Work',
  biosphere: 'Living Recovery',
  chronology: 'Time Discipline',
  transit: 'Logistics',
  archive: 'Memory',
  lattice: 'Settlement Mesh',
  veil: 'Concealment',
  containment: 'Hazard Control',
  replication: 'Fabrication',
  accord: 'Civic Order',
  entropy: 'Waste Routing',
  aperture: 'Threshold Access',
};

const ANCHORS: Record<CivilizationScaleBand, Record<CivilizationTrait, CivilizationDeploymentAnchor>> = {
  planetary: {
    ignition: { x: 35, y: 60 },
    biosphere: { x: 55, y: 47 },
    chronology: { x: 66, y: 34 },
    transit: { x: 73, y: 62 },
    archive: { x: 42, y: 36 },
    lattice: { x: 62, y: 58 },
    veil: { x: 26, y: 40 },
    containment: { x: 29, y: 68 },
    replication: { x: 52, y: 70 },
    accord: { x: 48, y: 46 },
    entropy: { x: 23, y: 72 },
    aperture: { x: 78, y: 39 },
  },
  stellar: {
    ignition: { x: 50, y: 47 },
    biosphere: { x: 59, y: 66 },
    chronology: { x: 64, y: 31 },
    transit: { x: 72, y: 51 },
    archive: { x: 39, y: 29 },
    lattice: { x: 43, y: 67 },
    veil: { x: 86, y: 38 },
    containment: { x: 23, y: 71 },
    replication: { x: 69, y: 69 },
    accord: { x: 31, y: 47 },
    entropy: { x: 22, y: 36 },
    aperture: { x: 81, y: 58 },
  },
  galactic: {
    ignition: { x: 67, y: 31 },
    biosphere: { x: 45, y: 61 },
    chronology: { x: 58, y: 45 },
    transit: { x: 73, y: 55 },
    archive: { x: 38, y: 38 },
    lattice: { x: 50, y: 72 },
    veil: { x: 81, y: 30 },
    containment: { x: 72, y: 74 },
    replication: { x: 30, y: 58 },
    accord: { x: 48, y: 47 },
    entropy: { x: 23, y: 70 },
    aperture: { x: 84, y: 56 },
  },
};

function clampPercent(value: number): number {
  return Math.min(92, Math.max(8, value));
}

function jitterAnchor(anchor: CivilizationDeploymentAnchor, seed: number): CivilizationDeploymentAnchor {
  const jitterX = ((seed & 0xff) / 255 - 0.5) * 7;
  const jitterY = (((seed >>> 8) & 0xff) / 255 - 0.5) * 6;
  return {
    x: clampPercent(anchor.x + jitterX),
    y: clampPercent(anchor.y + jitterY),
  };
}

function sceneScaleBand(tier: KardashevTier): CivilizationScaleBand {
  if (tier >= 3) return 'galactic';
  if (tier >= 2) return 'stellar';
  return 'planetary';
}

function formatForm(lore: CardLoreCatalog[string] | undefined): string {
  const firstForm = lore?.artifactForm?.split('/')?.[0]?.trim();
  return (firstForm || 'artifact').toLowerCase();
}

function fallbackForm(trait: CivilizationTrait): string {
  const forms: Record<CivilizationTrait, string> = {
    ignition: 'reactor component',
    biosphere: 'biotech catalyst',
    chronology: 'chronometric instrument',
    transit: 'transit component',
    archive: 'archive instrument',
    lattice: 'habitat lattice component',
    veil: 'concealment device',
    containment: 'containment device',
    replication: 'fabrication component',
    accord: 'civic signal object',
    entropy: 'thermal control device',
    aperture: 'threshold instrument',
  };
  return forms[trait];
}

function fallbackRole(trait: CivilizationTrait, scaleBand: CivilizationScaleBand): string {
  const scalePrefix = scaleBand === 'galactic'
    ? 'sector'
    : scaleBand === 'stellar'
      ? 'system'
      : 'civic';
  const roles: Record<CivilizationTrait, string> = {
    ignition: `${scalePrefix} energy regulation`,
    biosphere: `${scalePrefix} ecological adaptation`,
    chronology: `${scalePrefix} timing discipline`,
    transit: `${scalePrefix} movement and logistics`,
    archive: `${scalePrefix} memory and recordkeeping`,
    lattice: `${scalePrefix} habitat coordination`,
    veil: `${scalePrefix} concealment and signal discipline`,
    containment: `${scalePrefix} hazard containment`,
    replication: `${scalePrefix} fabrication and repair`,
    accord: `${scalePrefix} legitimacy and treaty signaling`,
    entropy: `${scalePrefix} waste-heat routing`,
    aperture: `${scalePrefix} threshold control`,
  };
  return roles[trait];
}

function fallbackEngineeringScale(card: ArtifactCard, scaleBand: CivilizationScaleBand): string {
  if (card.tier >= 3 || scaleBand === 'galactic') return 'Galactic';
  if (card.tier >= 2 || scaleBand === 'stellar') return 'Star-system';
  return 'Planetary';
}

function deriveDepictionScaleFromLore(
  card: ArtifactCard,
  lore: CardLoreCatalog[string] | undefined,
): ArtifactDepictionScale {
  const recordedScale = ARTIFACT_DEPICTION_SCALE_BY_ID[card.id as ArtifactId];
  if (recordedScale) return recordedScale;
  if (lore?.depictionScale) return lore.depictionScale;

  const prompt = lore?.artPrompt?.toLowerCase() ?? '';
  const form = lore?.artifactForm?.toLowerCase() ?? '';
  if (/galactic-scale|galactic industrial scene|galactic network|galactic region|galactic civic|galactic-arm|wide galactic|deep galactic|interstellar necrobiome|many star systems|several star systems|across systems|spiral arm/.test(prompt)) {
    return 'galactic';
  }
  if (/stellar-scale|star-system|system-scale|heliosphere|several stars|around a star|around different stars/.test(prompt)) {
    return 'stellar';
  }
  if (/extreme macro|macro close-up|macro cross-section|grain-|marble-sized|thumbnail-sized/.test(prompt)) {
    return 'macro';
  }
  if (/room-scale|space large enough to walk through|wall-mounted|console-sized/.test(prompt)) {
    return 'room';
  }
  if (/tabletop|handheld|palm-sized|finger-length|fingertip-sized|coin-sized|matchbox-sized|forearm-sized|hand-sized/.test(prompt)) {
    return 'tabletop';
  }
  if (/installation-scale|facility-scale|building-scale|warehouse|tower|facade/.test(prompt)) {
    return 'installation';
  }
  if (/galaxy-wide|galaxy|interstellar/.test(prompt)) {
    return 'galactic';
  }
  if (/planetary-scale|planet-wide|planet surface|horizon|world-scale/.test(prompt)) {
    return 'planetary';
  }
  if (/galactic/.test(form)) return 'galactic';
  if (/stellar|star-system|heliosphere/.test(form)) return 'stellar';
  if (/planetary|world/.test(form)) return 'planetary';
  return 'tabletop';
}

function deriveArtifactVisualMotif(
  card: ArtifactCard,
  lore: CardLoreCatalog[string] | undefined,
): ArtifactVisualMotif {
  const haystack = [
    card.name,
    lore?.artifactForm,
    lore?.practicalCapability,
    lore?.civLane,
    lore?.artPrompt,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/coil|solenoid|driver|filament|thread|wire|winding/.test(haystack)) return 'coil';
  if (/prism|lens|crystal|facet|shard|glass|gem/.test(haystack)) return 'prism';
  if (/bottle|cask|vessel|flask|casket|container|chamber|capsule/.test(haystack)) return 'vessel';
  if (/organ|biomass|immune|neural|heart|lung|vascular/.test(haystack)) return 'organ';
  if (/seed|spore|bloom|wick|root|lichen|mycelial|graft|garden|orchard|verdant/.test(haystack)) return 'seed';
  if (/archive|ledger|chronicle|index|memory|record|codex|library/.test(haystack)) return 'archive';
  if (/lattice|scaffold|mesh|grid|matrix|network|web/.test(haystack)) return 'lattice';
  if (/forge|foundry|furnace|crucible|pyre|igniter|kernel|anvil|mantle/.test(haystack)) return 'forge';
  if (/seal|oath|treaty|accord|covenant|mandate|sigil/.test(haystack)) return 'seal';
  if (/gate|aperture|threshold|horizon|void|interstice|portal|door/.test(haystack)) return 'aperture';
  if (/containment|baffle|veil|null|entropy|erasure|quarantine|abyss|hazard/.test(haystack)) return 'containment';
  if (/relay|anchor|gauge|control|instrument|beacon|signal|antenna|node/.test(haystack)) return 'relay';
  return 'generic';
}

function deriveArtifactSceneTreatment(
  card: ArtifactCard,
  lore: CardLoreCatalog[string] | undefined,
): ArtifactSceneTreatment | undefined {
  const haystack = [
    card.id,
    card.name,
    lore?.name,
    lore?.artifactForm,
    lore?.practicalCapability,
    lore?.civLane,
    lore?.artPrompt,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (/ashroot|ashen bloom|post-burn|phoenix biosphere|ecological recovery/.test(haystack)) {
    return 'ashroot_recovery';
  }
  if (/mantlelift|driver coil|mass acceleration|feedstock capsule|material ascent/.test(haystack)) {
    return 'mantlelift_driver';
  }
  if (/ignition kernel|reaction core|furnace heart|controlled ignition|thermal regulation/.test(haystack)) {
    return 'ignition_kernel';
  }
  if (/magnetic bottle|containment cage|field containment|plasma/.test(haystack)) {
    return 'magnetic_bottle';
  }
  if (/horizon extractor|annihilation sink|horizon watch|boundary-energy|forbidden physics/.test(haystack)) {
    return 'horizon_extractor';
  }
  if (/entropy pyre|heat baffle|thermal control|waste heat|decay routing/.test(haystack)) {
    return 'entropy_baffle';
  }
  return undefined;
}

function getDepictionScaleLabel(depictionScale: ArtifactDepictionScale): string {
  const labels: Record<ArtifactDepictionScale, string> = {
    macro: 'macro',
    tabletop: 'tabletop',
    room: 'room-scale',
    installation: 'installation-scale',
    planetary: 'planetary-scale',
    stellar: 'stellar-scale',
    galactic: 'galactic-scale',
  };
  return labels[depictionScale];
}

function formatLane(lore: CardLoreCatalog[string] | undefined, trait: CivilizationTrait): string {
  const lane = lore?.civLane?.split('/')?.[0]?.trim();
  if (!lane) return CIVILIZATION_TRAIT_LABELS[trait];
  return lane.charAt(0).toUpperCase() + lane.slice(1);
}

function sentence(value: string | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  const leading = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(leading) ? leading : `${leading}.`;
}

interface ArtifactSiteContext {
  card: ArtifactCard;
  lore: CardLoreCatalog[string] | undefined;
  trait: CivilizationTrait;
  lane: string;
  occurrenceIndex: number;
  duplicateCount: number;
  siteId: string;
  lifecycle?: CivilizationPublicArtifactState;
}

function buildArtifactSiteContexts(
  forgedArtifacts: readonly ArtifactCard[],
  loreCatalog: CardLoreCatalog | undefined,
  civilizationArtifacts: readonly CivilizationPublicArtifactState[],
): ArtifactSiteContext[] {
  const lifecycleByArtifactId = new Map(
    civilizationArtifacts.map((lifecycle) => [lifecycle.artifactId, lifecycle]),
  );
  const duplicateCounts = new Map<string, number>();
  forgedArtifacts.forEach((card) => {
    duplicateCounts.set(card.id, (duplicateCounts.get(card.id) ?? 0) + 1);
  });
  const seenCounts = new Map<string, number>();

  return forgedArtifacts.map((card) => {
    const lore = loreCatalog?.[card.id];
    const trait = getArtifactCivilizationTrait(card);
    const occurrenceIndex = seenCounts.get(card.id) ?? 0;
    seenCounts.set(card.id, occurrenceIndex + 1);
    return {
      card,
      lore,
      trait,
      lane: formatLane(lore, trait),
      occurrenceIndex,
      duplicateCount: duplicateCounts.get(card.id) ?? 1,
      siteId: occurrenceIndex === 0 ? `artifact:${card.id}` : `artifact:${card.id}#${occurrenceIndex + 1}`,
      lifecycle: lifecycleByArtifactId.get(card.id),
    };
  });
}

function formatArtifactOccurrenceSuffix(context: ArtifactSiteContext): string {
  if (context.occurrenceIndex === 0) return '';
  const roman = ['', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][context.occurrenceIndex] ?? `#${context.occurrenceIndex + 1}`;
  return ` ${roman}`;
}

function getArtifactSynergyContext(
  context: ArtifactSiteContext,
  allContexts: readonly ArtifactSiteContext[],
): {
  supportingArtifactNames: string[];
  sharedLaneCount: number;
  synergySummary?: string;
} {
  const partners = allContexts
    .filter((entry) => entry.siteId !== context.siteId)
    .map((entry) => {
      const sameLane = entry.lane === context.lane || entry.trait === context.trait;
      return {
        entry,
        sameLane,
        score: (sameLane ? 10 : 0) + entry.card.tier,
      };
    })
    .filter(({ score }) => score > 0)
    .sort((left, right) => (
      right.score - left.score ||
      right.entry.card.tier - left.entry.card.tier ||
      left.entry.card.name.localeCompare(right.entry.card.name)
    ));

  const supportingArtifactNames = partners.slice(0, 3).map(({ entry }) => entry.card.name);
  const sharedLaneCount = allContexts.filter((entry) => (
    entry.siteId !== context.siteId &&
    (entry.lane === context.lane || entry.trait === context.trait)
  )).length;

  if (supportingArtifactNames.length === 0) {
    return {
      supportingArtifactNames,
      sharedLaneCount,
      synergySummary:
        `${context.card.name} is currently a solitary trace. It marks a new civic capability, but no larger project has cohered around it yet.`,
    };
  }

  const partnersText = supportingArtifactNames.length === 1
    ? supportingArtifactNames[0]
    : `${supportingArtifactNames.slice(0, -1).join(', ')} and ${supportingArtifactNames[supportingArtifactNames.length - 1]}`;
  return {
    supportingArtifactNames,
    sharedLaneCount,
    synergySummary:
      `${context.card.name} is combining with ${partnersText} inside ${context.lane.toLowerCase()} infrastructure, so the scene shows the civilizational consequence rather than a giant copy of the device.`,
  };
}

function getCompletedBlueprintIdForArtifact(
  context: ArtifactSiteContext,
  completedBlueprintDevices: readonly NonNullable<GamePlayerState['manifestedBlueprintDevices']>[number][],
): BlueprintId | undefined {
  return completedBlueprintDevices.find((device) =>
    device.definition?.components.some((component) => component.artifactId === context.card.id),
  )?.blueprintId;
}

function buildArtifactSummary(
  card: ArtifactCard,
  lore: CardLoreCatalog[string] | undefined,
  visibleAs: string,
  trait: CivilizationTrait,
  scaleBand: CivilizationScaleBand,
  depictionScale: ArtifactDepictionScale,
): string {
  const form = lore?.artifactForm ? formatForm(lore) : fallbackForm(trait);
  const role = sentence(lore?.practicalCapability ?? fallbackRole(trait, scaleBand));
  const roleClause = role ? ` ${role}` : '';
  const policy = getArtifactArtworkScalePolicy(depictionScale);
  const scaleText = policy.presence === 'artifact_pin'
    ? `${card.name} is depicted at ${getDepictionScaleLabel(depictionScale)} scale as a ${form}; the scene uses a deployment pin and consequence layer instead of pretending the object is a visible landmark.`
    : policy.canRenderAsStructure
      ? `${card.name} is depicted as ${policy.label.toLowerCase()} and belongs natively in the ${policy.nativeLabel.toLowerCase()} layer as a ${form}.`
      : `${card.name} is depicted at ${getDepictionScaleLabel(depictionScale)} scale as a ${form}; the scene refuses to pretend it is visible from impossible scale.`;
  return `${scaleText} The scan registers its work through ${visibleAs}.${roleClause}`;
}

function buildArtifactSite(
  context: ArtifactSiteContext,
  allContexts: readonly ArtifactSiteContext[],
  scaleBand: CivilizationScaleBand,
  index: number,
  completedBlueprintDevices: readonly NonNullable<GamePlayerState['manifestedBlueprintDevices']>[number][],
  activeCapabilityIds: ReadonlySet<CivilizationCapabilityId> | null,
): CivilizationDeploymentSite {
  const { card, lore, trait } = context;
  const seed = hashCivilizationValue(`${card.id}:${scaleBand}:${index}`);
  const title = TRAIT_SITE_TITLES[scaleBand][trait];
  const laneLabel = formatLane(lore, trait);
  const practicalCapability = lore?.practicalCapability ?? fallbackRole(trait, scaleBand);
  const synergy = getArtifactSynergyContext(context, allContexts);
  const completedBlueprintId = getCompletedBlueprintIdForArtifact(context, completedBlueprintDevices);
  const projectPriorityBonus = Math.min(24, synergy.supportingArtifactNames.length * 8 + synergy.sharedLaneCount * 3);
  const depictionScale = deriveDepictionScaleFromLore(card, lore);
  const scalePolicy = getArtifactArtworkScalePolicy(depictionScale);
  const artifactVisualMotif = deriveArtifactVisualMotif(card, lore);
  const artifactSceneTreatment = deriveArtifactSceneTreatment(card, lore);
  const treatmentCopy = artifactSceneTreatment
    ? ARTIFACT_TREATMENT_SITE_COPY[artifactSceneTreatment][scaleBand]
    : undefined;
  const visibleAs = treatmentCopy?.visibleAs ?? TRAIT_VISIBLE_AS[scaleBand][trait];
  const visualCue = treatmentCopy?.visualCue ?? TRAIT_VISUAL_CUES[scaleBand][trait];
  const capabilityIds = ARTIFACT_TECHNOLOGY_METADATA_BY_ID[card.id as ArtifactId]?.capabilityIds ?? [];
  const implementationState = context.lifecycle?.implementationState ?? 'operational';
  return {
    id: context.siteId,
    kind: 'artifact',
    scaleBand,
    trait,
    artifactId: card.id,
    artifactTier: card.tier,
    artifactForm: lore?.artifactForm ?? fallbackForm(trait),
    blueprintRole: practicalCapability,
    completedBlueprintId,
    capabilityIds,
    activeCapabilityIds: activeCapabilityIds
      ? capabilityIds.filter((capabilityId) => activeCapabilityIds.has(capabilityId))
      : implementationState === 'operational'
        ? capabilityIds
        : [],
    implementationState,
    implementationStateChangedTurnCount:
      context.lifecycle?.implementationStateChangedTurnCount ?? null,
    masteryCount: context.lifecycle?.masteryCount ?? context.duplicateCount,
    historyEvidence: context.lifecycle?.historyEvidence ?? 'recorded',
    consequenceLabel: TRAIT_CONSEQUENCE_LABELS[trait],
    visualCue,
    synergySummary: synergy.synergySummary,
    supportingArtifactNames: synergy.supportingArtifactNames,
    engineeringScale: lore?.engineeringScale ?? fallbackEngineeringScale(card, scaleBand),
    depictionScale,
    scalePresence: scalePolicy.presence,
    nativeArtworkLayer: scalePolicy.nativeLayer,
    nativeArtworkLabel: scalePolicy.nativeLabel,
    scalePolicyCopy: scalePolicy.scanCopy,
    artifactVisualMotif,
    artifactSceneTreatment,
    representationMode: isArtifactPinDepictionScale(depictionScale) ? 'local_trace' : 'civilization_infrastructure',
    sourceQuality: lore ? 'authored' : 'derived',
    affinity: card.bonusAffinity,
    anchor: jitterAnchor(ANCHORS[scaleBand][trait], seed),
    priority: card.tier * 100 + Math.max(0, card.eminence) * 10 + projectPriorityBonus + (12 - index),
    title: `${card.name} Trace${formatArtifactOccurrenceSuffix(context)}`,
    summary: buildArtifactSummary(card, lore, visibleAs, trait, scaleBand, depictionScale),
    visibleAs,
    laneLabel: `${laneLabel} / ${title}`,
    relatedArtifactIds: [card.id],
  };
}

function buildBlueprintSite(
  device: NonNullable<GamePlayerState['manifestedBlueprintDevices']>[number],
  index: number,
  activeCapabilityIds: ReadonlySet<CivilizationCapabilityId> | null,
): CivilizationDeploymentSite | null {
  const blueprintId = device.blueprintId;
  const definition = device.definition;
  if (!definition) return null;
  const scaleBand = definition.civilization.scaleBand;
  const componentSummary = definition.components
    .map((component) => component.stage)
    .join(' / ');
  const trait: CivilizationTrait = blueprintId === 'bp_antimatter_detonator'
    ? 'containment'
    : blueprintId === 'bp_mantle_to_orbit_foundry'
      ? 'transit'
      : 'accord';
  const seed = hashCivilizationValue(`${blueprintId}:${index}`);
  const componentNames = definition.components.map((component) => component.stage);
  const capabilityIds = definition.civilization.providedCapabilityIds as CivilizationCapabilityId[];
  return {
    id: `blueprint:${blueprintId}`,
    kind: 'blueprint',
    scaleBand,
    trait,
    blueprintId,
    artifactForm: definition.civilization.projectForm,
    blueprintRole: definition.name,
    componentSummary,
    gameplayEffect: definition.publicEffect,
    capabilityIds,
    activeCapabilityIds: activeCapabilityIds
      ? capabilityIds.filter((capabilityId) => activeCapabilityIds.has(capabilityId))
      : device.state === 'spent' || device.state === 'recovering'
        ? []
        : capabilityIds,
    projectState: device.state,
    consequenceLabel: 'Blueprint Project',
    visualCue: TRAIT_VISUAL_CUES[scaleBand][trait],
    synergySummary:
      `${definition.name} is a completed civilization project: ${componentNames.slice(0, -1).join(', ')}${componentNames.length > 1 ? ` and ${componentNames[componentNames.length - 1]}` : componentNames[0]} have stopped behaving like separate artifacts and now read as one environmental condition.`,
    supportingArtifactNames: definition.components.map((component) => component.stage),
    engineeringScale: getCivilizationScaleLabel(scaleBand),
    representationMode: 'blueprint_consequence',
    sourceQuality: 'authored',
    affinity: definition.civilization.affinity,
    anchor: jitterAnchor(ANCHORS[scaleBand][trait], seed),
    priority: 1000 + index,
    title: definition.civilization.siteTitle,
    summary: definition.civilization.siteSummary,
    visibleAs: definition.civilization.visibleAs,
    laneLabel: definition.civilization.laneLabel,
    relatedArtifactIds: definition.components.map((component) => component.artifactId),
  };
}

function buildLuminarySite(
  alliance: LuminaryActiveState,
  scaleBand: CivilizationScaleBand,
  index: number,
): CivilizationDeploymentSite {
  const affinity = alliance.activeAffinity as ArtifactAffinity;
  const trait: CivilizationTrait = affinity === 'flare'
    ? 'ignition'
    : affinity === 'verdance'
      ? 'biosphere'
      : affinity === 'radiance'
        ? 'accord'
        : affinity === 'abyss'
          ? 'veil'
          : 'chronology';
  const seed = hashCivilizationValue(`${alliance.luminaryId}:${alliance.activeAffinity}:${index}`);
  const affinityLabel = alliance.activeAffinity.charAt(0).toUpperCase() + alliance.activeAffinity.slice(1);
  const visibleAs = scaleBand === 'planetary'
    ? `${affinityLabel} pressure in the civilization's weather, light, and civic rhythm`
    : scaleBand === 'stellar'
      ? `${affinityLabel} pressure across orbital paths and inhabited worlds`
      : `${affinityLabel} pressure bending routes through the settled sector`;
  return {
    id: `luminary:${alliance.luminaryId}`,
    kind: 'luminary',
    scaleBand,
    trait,
    engineeringScale: getCivilizationScaleLabel(scaleBand),
    representationMode: 'luminary_influence',
    sourceQuality: 'derived',
    affinity,
    consequenceLabel: 'Luminary Alliance',
    visualCue: TRAIT_VISUAL_CUES[scaleBand][trait],
    synergySummary:
      `The alliance amplifies ${affinityLabel.toLowerCase()}-aligned work already present in the civilization, changing atmosphere and behavior instead of adding a visible creature to the map.`,
    anchor: jitterAnchor(ANCHORS[scaleBand][trait], seed),
    priority: 720 + index,
    title: `${affinityLabel} Luminary Pressure`,
    summary:
      'The allied Luminary is represented as atmosphere, pressure, and altered civilizational behavior, not as a body hovering inside the Civilization view.',
    visibleAs,
    laneLabel: `${affinityLabel} influence`,
    relatedArtifactIds: [],
  };
}

function buildProtocolSite(
  protocol: ScenarioProtocolPublicState,
  scaleBand: CivilizationScaleBand,
  index: number,
): CivilizationDeploymentSite {
  const seed = hashCivilizationValue(`${protocol.protocolId}:${index}`);
  const trait: CivilizationTrait = 'veil';
  return {
    id: `protocol:${protocol.protocolId}`,
    kind: 'protocol',
    scaleBand,
    trait,
    engineeringScale: getCivilizationScaleLabel(scaleBand),
    representationMode: 'sealed_protocol',
    sourceQuality: 'derived',
    affinity: 'abyss',
    consequenceLabel: 'Sealed Protocol',
    visualCue: TRAIT_VISUAL_CUES[scaleBand][trait],
    synergySummary:
      'The identity remains sealed; the civilization can only read the scar left by an active protocol.',
    anchor: jitterAnchor(ANCHORS[scaleBand][trait], seed),
    priority: 900 + index,
    title: `Sealed Protocol ${String(protocol.slotIndex + 1).padStart(2, '0')}`,
    summary:
      'This Blueprint-scale event remains anonymous. The civilization can see the consequence pattern without exposing the sealed record identity.',
    visibleAs: scaleBand === 'galactic'
      ? 'a redacted route scar through the sector intelligence layer'
      : 'a redacted signal scar in the deployment intelligence layer',
    laneLabel: 'Sealed protocol',
    relatedArtifactIds: [],
  };
}

function getChronicleVisibleAs(record: CivilizationChronicleState, scaleBand: CivilizationScaleBand): string {
  if (record.visibleAs) return record.visibleAs;
  if (scaleBand === 'galactic') return 'a recovered story thread projected as an archive route through settled space';
  if (scaleBand === 'stellar') return 'a recovered story thread carried by archive beacons between inhabited worlds';
  return 'a recovered story thread visible as civic memory, archival signals, and restored context';
}

function buildChronicleSite(
  record: CivilizationChronicleState,
  defaultScaleBand: CivilizationScaleBand,
  index: number,
): CivilizationDeploymentSite {
  const scaleBand = record.scaleBand ?? defaultScaleBand;
  const trait = record.trait ?? 'archive';
  const affinity = record.affinity ?? 'radiance';
  const seed = hashCivilizationValue(`${record.chronicleId}:${index}`);
  const visibleAs = getChronicleVisibleAs(record, scaleBand);
  return {
    id: `chronicle:${record.chronicleId}`,
    kind: 'chronicle',
    scaleBand,
    trait,
    chronicleId: record.chronicleId,
    engineeringScale: getCivilizationScaleLabel(scaleBand),
    representationMode: 'chronicle_record',
    sourceQuality: 'authored',
    affinity,
    consequenceLabel: 'Chronicle Thread',
    visualCue: TRAIT_VISUAL_CUES[scaleBand][trait],
    synergySummary: record.publicEffect
      ? `The recovered Chronicle adds story context to the civilization: ${record.publicEffect}`
      : 'The recovered Chronicle adds story context to the civilization without becoming a playable structure.',
    anchor: jitterAnchor(ANCHORS[scaleBand][trait], seed),
    priority: record.priority ?? 680 + index,
    title: record.title,
    summary: record.summary ?? 'This recovered story record shapes the civilization as archive pressure, civic memory, and restored context.',
    visibleAs,
    laneLabel: record.laneLabel ?? 'Chronicle thread',
    relatedArtifactIds: [],
  };
}

export function buildCivilizationDeploymentSites({
  forgedArtifacts,
  loreCatalog,
  tier,
  ownerPlayerId,
  turnCount = 0,
  luminaryAffinities = [],
  manifestedBlueprintDevices = [],
  scenarioProtocols = [],
  chronicleRecords = [],
  civilizationArtifacts = [],
  activeCapabilityIds,
}: BuildCivilizationDeploymentSitesInput): CivilizationDeploymentSite[] {
  const band = sceneScaleBand(tier);
  const activeCapabilityIdSet = activeCapabilityIds
    ? new Set(activeCapabilityIds as readonly CivilizationCapabilityId[])
    : null;
  const artifactContexts = buildArtifactSiteContexts(
    forgedArtifacts,
    loreCatalog,
    civilizationArtifacts,
  );
  const artifactSites = artifactContexts.map((context, index) => (
    buildArtifactSite(
      context,
      artifactContexts,
      band,
      index,
      manifestedBlueprintDevices,
      activeCapabilityIdSet,
    )
  ));

  const blueprintSites = manifestedBlueprintDevices
    .map((device, index) => buildBlueprintSite(device, index, activeCapabilityIdSet))
    .filter((site): site is CivilizationDeploymentSite => site !== null);

  const luminarySites = luminaryAffinities
    .filter((alliance) => (
      (!ownerPlayerId || alliance.ownerId === ownerPlayerId) &&
      turnCount >= alliance.summonedAtTurnCount
    ))
    .map((alliance, index) => buildLuminarySite(alliance, band, index));

  const protocolSites = scenarioProtocols
    .filter((protocol) => !ownerPlayerId || protocol.ownerPlayerId === ownerPlayerId)
    .map((protocol, index) => buildProtocolSite(protocol, band, index));

  const chronicleSites = chronicleRecords
    .filter((record) => !ownerPlayerId || !record.ownerPlayerId || record.ownerPlayerId === ownerPlayerId)
    .map((record, index) => buildChronicleSite(record, band, index));

  return [
    ...blueprintSites,
    ...protocolSites,
    ...chronicleSites,
    ...luminarySites,
    ...artifactSites,
  ].sort((left, right) => (
    right.priority - left.priority ||
    left.title.localeCompare(right.title) ||
    left.id.localeCompare(right.id)
  ));
}

export function getCivilizationScaleLabel(scaleBand: CivilizationScaleBand): string {
  if (scaleBand === 'galactic') return 'Galactic sector';
  if (scaleBand === 'stellar') return 'Stellar system';
  return 'Planetary domain';
}

export function getCivilizationDeploymentSiteSignature(site: CivilizationDeploymentSite): string {
  return [
    site.kind,
    site.scaleBand,
    site.trait,
    site.artifactId ?? '',
    site.artifactTier ?? '',
    site.artifactForm ?? '',
    site.blueprintRole ?? '',
    site.blueprintFamilies ?? '',
    site.completedBlueprintId ?? '',
    site.componentSummary ?? '',
    site.gameplayEffect ?? '',
    site.capabilityIds?.join(',') ?? '',
    site.activeCapabilityIds?.join(',') ?? '',
    site.implementationState ?? '',
    site.implementationStateChangedTurnCount ?? '',
    site.masteryCount ?? '',
    site.historyEvidence ?? '',
    site.projectState ?? '',
    site.consequenceLabel,
    site.visualCue,
    site.synergySummary ?? '',
    site.supportingArtifactNames?.join(',') ?? '',
    site.engineeringScale ?? '',
    site.depictionScale ?? '',
    site.scalePresence ?? '',
    site.nativeArtworkLayer ?? '',
    site.nativeArtworkLabel ?? '',
    site.artifactVisualMotif ?? '',
    site.artifactSceneTreatment ?? '',
    site.representationMode,
    site.sourceQuality,
    site.blueprintId ?? '',
    site.chronicleId ?? '',
    site.affinity,
    site.priority,
    site.title,
    site.summary,
    site.visibleAs,
    site.laneLabel,
    site.relatedArtifactIds.join(','),
  ].join('|');
}

export function getCivilizationDeploymentSiteSignatureMap(
  sites: readonly CivilizationDeploymentSite[],
): Map<string, string> {
  return new Map(sites.map((site) => [site.id, getCivilizationDeploymentSiteSignature(site)]));
}

export function getRecentCivilizationDeploymentSiteIds(
  previousSignatures: ReadonlyMap<string, string>,
  nextSignatures: ReadonlyMap<string, string>,
  sites: readonly CivilizationDeploymentSite[],
): string[] {
  const addedSiteIds: string[] = [];
  const changedSiteIds: string[] = [];

  for (const site of sites) {
    const nextSignature = nextSignatures.get(site.id) ?? getCivilizationDeploymentSiteSignature(site);
    if (!previousSignatures.has(site.id)) {
      addedSiteIds.push(site.id);
    } else if (previousSignatures.get(site.id) !== nextSignature) {
      changedSiteIds.push(site.id);
    }
  }

  return [...addedSiteIds, ...changedSiteIds];
}

export function prioritizeRecentCivilizationSiteIds(
  incomingSiteIds: readonly string[],
  existingSiteIds: readonly string[] = [],
): string[] {
  const incoming = [...new Set(incomingSiteIds)];
  const incomingSet = new Set(incoming);
  return [
    ...incoming,
    ...existingSiteIds.filter((siteId) => !incomingSet.has(siteId)),
  ];
}

export function getDeploymentTraitLabel(site: CivilizationDeploymentSite): string {
  if (site.kind !== 'artifact' || !site.artifactId) return site.kind;
  return CIVILIZATION_TRAIT_LABELS[getArtifactCivilizationTrait({
    id: site.artifactId,
    name: site.artifactId,
    tier: 1,
    eminence: 0,
    bonusAffinity: site.affinity,
    flavor: '',
    cost: {
      flare: 0,
      continuum: 0,
      verdance: 0,
      abyss: 0,
      radiance: 0,
      singularity: 0,
    },
  })];
}
