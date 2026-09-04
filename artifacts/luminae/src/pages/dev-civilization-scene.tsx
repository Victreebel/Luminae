import React from 'react';
import {
  Archive,
  Factory,
  Handshake,
  Leaf,
  LockKeyhole,
  Orbit,
  Route,
  ShieldAlert,
  type LucideIcon,
} from 'lucide-react';
import type { ArtifactCard, CardLoreCatalog } from '@workspace/api-client-react';
import type {
  BlueprintId,
  CivilizationCoreCondition,
  CivilizationStabilityBand,
} from '@workspace/game-types';
import { CivilizationScenePanel } from '@/components/CivilizationScenePanel';
import {
  BoardCivilizationTraceNotice,
} from '@/pages/game-civilization-preview';
import { buildCivilizationDeploymentSites } from '@/lib/civilizationDeploymentSites';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';
import {
  deriveCivilizationArchetype,
  type CivilizationArchetypeSignals,
} from '@/lib/civilizationArchetypes';
import {
  getCivilizationPlateArtSlot,
  getCivilizationSiteArtSlot,
  type CivilizationArtScene,
} from '@/lib/civilizationArtRegistry';
import {
  buildCivilizationProfile,
} from '@/lib/civilizationProfile';
import {
  getDominantAffinityPalette,
  type KardashevTier,
} from '@/lib/kardashev';

type PreviewSceneKind = 'surface' | 'orbit' | 'stellar' | 'galaxy';
type PreviewPresetId = 'balanced' | 'recovery' | 'foundry' | 'hazard' | 'routes' | 'accord' | 'archive' | 'chronicle' | 'sealed';
type TracePreviewMode = 'scan' | 'notice';

interface PreviewPreset {
  id: PreviewPresetId;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  tone: string;
  artifactIds: readonly string[];
  blueprintIds: readonly BlueprintId[];
  luminaryAffinity?: 'flare' | 'continuum' | 'verdance' | 'abyss' | 'radiance';
  includeSealedProtocol?: boolean;
  includeChronicle?: boolean;
}

const TIERS: Array<{ label: string; tier: KardashevTier }> = [
  { label: 'Planetary', tier: 1 },
  { label: 'Stellar', tier: 2 },
  { label: 'Galactic', tier: 3 },
];

const TIER_QUERY_LABELS: Record<KardashevTier, string> = {
  0: 'emergent',
  1: 'planetary',
  2: 'stellar',
  3: 'galactic',
};

function getInitialTier(): KardashevTier {
  if (typeof window === 'undefined') return 2;
  const tier = new URLSearchParams(window.location.search).get('tier')?.toLowerCase();
  if (tier === '1' || tier === 'planetary') return 1;
  if (tier === '2' || tier === 'stellar') return 2;
  if (tier === '3' || tier === 'galactic') return 3;
  return 2;
}

function getInitialScanState(): boolean {
  if (typeof window === 'undefined') return false;
  const scan = new URLSearchParams(window.location.search).get('scan')?.toLowerCase();
  return scan === '1' || scan === 'true' || scan === 'open';
}

function getInitialNoticePreviewState(): boolean {
  if (typeof window === 'undefined') return false;
  const notice = new URLSearchParams(window.location.search).get('notice')?.toLowerCase();
  return notice === '1' || notice === 'true' || notice === 'board';
}

function getInitialScene(): PreviewSceneKind | undefined {
  if (typeof window === 'undefined') return undefined;
  const scene = new URLSearchParams(window.location.search).get('scene')?.toLowerCase();
  if (scene === 'surface' || scene === 'orbit' || scene === 'stellar' || scene === 'galaxy') {
    return scene;
  }
  return undefined;
}

function getInitialPreset(): PreviewPresetId {
  if (typeof window === 'undefined') return 'balanced';
  const preset = new URLSearchParams(window.location.search).get('preset')?.toLowerCase();
  if (
    preset === 'recovery' ||
    preset === 'foundry' ||
    preset === 'hazard' ||
    preset === 'routes' ||
    preset === 'accord' ||
    preset === 'archive' ||
    preset === 'chronicle' ||
    preset === 'sealed'
  ) {
    return preset;
  }
  return 'balanced';
}

function getInitialForgePreviewCount(): number {
  if (typeof window === 'undefined') return 0;
  const count = Number(new URLSearchParams(window.location.search).get('forge') ?? '0');
  if (!Number.isFinite(count)) return 0;
  return Math.min(FORGE_PREVIEW_ARTIFACTS.length, Math.max(0, Math.trunc(count)));
}

function getInitialRecentSiteIds(): string[] {
  if (typeof window === 'undefined') return [];
  const recent = new URLSearchParams(window.location.search).get('recent');
  if (!recent) return [];
  return recent
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getInitialStability(): CivilizationStabilityBand {
  if (typeof window === 'undefined') return 'stable';
  const value = new URLSearchParams(window.location.search).get('stability');
  return value === 'strained' || value === 'unstable' || value === 'crisis' ? value : 'stable';
}

function getInitialCondition(): CivilizationCoreCondition | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get('condition');
  return value === 'damaged' || value === 'isolated' || value === 'quarantined' || value === 'disrupted'
    ? value
    : null;
}

function updatePreviewQuery(nextTier: KardashevTier, nextPreset?: PreviewPresetId) {
  if (typeof window === 'undefined') return;
  const params = new URLSearchParams(window.location.search);
  params.set('tier', TIER_QUERY_LABELS[nextTier]);
  if (nextPreset) params.set('preset', nextPreset);
  window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
}

function getPreviewRecordScene(
  tier: KardashevTier,
  site: CivilizationDeploymentSite | null,
): CivilizationArtScene {
  if (site?.nativeArtworkLayer) return site.nativeArtworkLayer;
  if (site?.depictionScale === 'galactic' || site?.scaleBand === 'galactic') return 'galaxy';
  if (site?.depictionScale === 'stellar' || site?.scaleBand === 'stellar') return 'stellar';
  if (
    site?.depictionScale === 'macro' ||
    site?.depictionScale === 'tabletop' ||
    site?.depictionScale === 'room' ||
    site?.depictionScale === 'installation'
  ) return 'surface';
  if (tier >= 3) return 'galaxy';
  if (tier >= 2) return 'stellar';
  return 'surface';
}

function getPreviewArchetypeSignals(
  deploymentSites: readonly CivilizationDeploymentSite[],
  blueprintCount: number,
  luminary: boolean,
): CivilizationArchetypeSignals {
  return {
    blueprintCount,
    luminary,
    living: deploymentSites.some((site) => (
      site.trait === 'biosphere' ||
      site.trait === 'replication' ||
      site.trait === 'lattice'
    )),
    foundry: deploymentSites.some((site) => site.trait === 'ignition' || site.trait === 'entropy'),
    hazard: deploymentSites.some((site) => (
      site.trait === 'containment' ||
      site.trait === 'veil' ||
      site.blueprintId === 'bp_antimatter_detonator'
    )),
    route: deploymentSites.some((site) => (
      site.trait === 'transit' ||
      site.trait === 'chronology' ||
      site.trait === 'aperture'
    )),
  redaction: deploymentSites.some((site) => site.kind === 'protocol'),
  };
}

function artifact(
  id: string,
  name: string,
  tier: number,
  bonusAffinity: ArtifactCard['bonusAffinity'],
  eminence: number,
): ArtifactCard {
  return {
    id,
    name,
    tier,
    eminence,
    bonusAffinity,
    flavor: '',
    cost: {
      flare: 0,
      continuum: 0,
      verdance: 0,
      abyss: 0,
      radiance: 0,
      singularity: 0,
    },
  };
}

const SAMPLE_ARTIFACTS: ArtifactCard[] = [
  artifact('t1r02', 'Ashroot Bloom', 1, 'verdance', 1),
  artifact('t1s02', 'Mantlelift Driver Coil', 1, 'continuum', 1),
  artifact('t1r01', 'Ignition Kernel', 1, 'flare', 1),
  artifact('t1p04', 'Magnetic Bottle', 1, 'radiance', 1),
  artifact('t2o01', 'Horizon Extractor', 2, 'abyss', 2),
  artifact('t3s01', 'Voidline Route Solver', 3, 'continuum', 5),
  artifact('t3e01', 'Xenobiome Route Graft', 3, 'verdance', 4),
  artifact('t1s01', 'Echo Splinter', 1, 'continuum', 1),
  artifact('t2s02', 'Storm-Memory Filament', 2, 'continuum', 2),
  artifact('t3s03', 'Extinction Signal Decoder', 3, 'continuum', 3),
  artifact('t2p03', 'Living Treaty Organ', 2, 'radiance', 2),
  artifact('t3p01', 'Plurality Accord Verifier', 3, 'radiance', 3),
];

const PREVIEW_PRESETS: readonly PreviewPreset[] = [
  {
    id: 'balanced',
    label: 'Balanced',
    shortLabel: 'BAL',
    icon: Orbit,
    tone: '#82ddff',
    artifactIds: ['t1r02', 't1s02', 't1r01', 't1p04', 't2o01', 't3s01', 't3e01'],
    blueprintIds: ['bp_antimatter_detonator', 'bp_mantle_to_orbit_foundry'],
    luminaryAffinity: 'verdance',
    includeSealedProtocol: true,
  },
  {
    id: 'recovery',
    label: 'Recovery',
    shortLabel: 'REC',
    icon: Leaf,
    tone: '#70efb2',
    artifactIds: ['t1r02', 't3e01'],
    blueprintIds: [],
    luminaryAffinity: 'verdance',
  },
  {
    id: 'foundry',
    label: 'Foundry',
    shortLabel: 'FOU',
    icon: Factory,
    tone: '#dfb86b',
    artifactIds: ['t1s02', 't1r01'],
    blueprintIds: ['bp_mantle_to_orbit_foundry'],
    luminaryAffinity: 'flare',
  },
  {
    id: 'hazard',
    label: 'Hazard',
    shortLabel: 'HAZ',
    icon: ShieldAlert,
    tone: '#ff6972',
    artifactIds: ['t1p04', 't2o01'],
    blueprintIds: ['bp_antimatter_detonator'],
    luminaryAffinity: 'abyss',
  },
  {
    id: 'routes',
    label: 'Routes',
    shortLabel: 'ROU',
    icon: Route,
    tone: '#8bbdff',
    artifactIds: ['t1s02', 't3s01'],
    blueprintIds: [],
    luminaryAffinity: 'continuum',
  },
  {
    id: 'accord',
    label: 'Accord',
    shortLabel: 'ACC',
    icon: Handshake,
    tone: '#ffe4a3',
    artifactIds: ['t2p03', 't3p01'],
    blueprintIds: [],
    luminaryAffinity: 'radiance',
  },
  {
    id: 'archive',
    label: 'Archive',
    shortLabel: 'ARC',
    icon: Archive,
    tone: '#bea2ff',
    artifactIds: ['t1s01', 't2s02', 't3s03'],
    blueprintIds: [],
    luminaryAffinity: 'continuum',
  },
  {
    id: 'chronicle',
    label: 'Chronicle',
    shortLabel: 'CHR',
    icon: Archive,
    tone: '#bea2ff',
    artifactIds: ['t1s01', 't2s02'],
    blueprintIds: [],
    luminaryAffinity: 'radiance',
    includeChronicle: true,
  },
  {
    id: 'sealed',
    label: 'Sealed',
    shortLabel: 'SEA',
    icon: LockKeyhole,
    tone: '#ff6972',
    artifactIds: ['t1p04', 't2o01', 't3s01'],
    blueprintIds: ['bp_antimatter_detonator'],
    luminaryAffinity: 'abyss',
    includeSealedProtocol: true,
  },
];

const SAMPLE_ARTIFACT_BY_ID = new Map(SAMPLE_ARTIFACTS.map((entry) => [entry.id, entry]));

const FORGE_PREVIEW_ARTIFACTS: ArtifactCard[] = [
  artifact('preview-pocket-null', 'Pocket Null', 1, 'abyss', 1),
  artifact('preview-accord-spark', 'Accord Spark', 1, 'radiance', 1),
];

const SAMPLE_LORE: CardLoreCatalog = {
  t1r02: {
    name: 'Ashroot Bloom',
    flavor: '',
    artifactForm: 'Biotech Module / Catalyst',
    practicalCapability: 'post-burn ecological recovery',
    civLane: 'phoenix biosphere',
    engineeringScale: 'Planetary',
    depictionScale: 'macro',
  },
  t1s02: {
    name: 'Mantlelift Driver Coil',
    flavor: '',
    artifactForm: 'Transit Component / Power Component',
    practicalCapability: 'planetary-to-orbit mass acceleration',
    civLane: 'orbital logistics civilization',
    engineeringScale: 'Planetary',
    depictionScale: 'room',
  },
  t1r01: {
    name: 'Ignition Kernel',
    flavor: '',
    artifactForm: 'Power Component / Control Instrument',
    practicalCapability: 'controlled ignition and thermal regulation',
    civLane: 'planetary forge culture',
    engineeringScale: 'Planetary',
    depictionScale: 'macro',
  },
  t1p04: {
    name: 'Magnetic Bottle',
    flavor: '',
    artifactForm: 'Containment / Power Component',
    practicalCapability: 'magnetic boundary containment',
    civLane: 'controlled catastrophe civilization',
    engineeringScale: 'Planetary',
    depictionScale: 'tabletop',
  },
  t2o01: {
    name: 'Horizon Extractor',
    flavor: '',
    artifactForm: 'Sensor / Containment',
    practicalCapability: 'boundary-energy sampling',
    civLane: 'event-horizon engineering culture',
    engineeringScale: 'Star-system',
    depictionScale: 'tabletop',
  },
  t3s01: {
    name: 'Voidline Route Solver',
    flavor: '',
    artifactForm: 'Route Computer / Distributed Observatory',
    practicalCapability: 'stable interstellar route derivation',
    civLane: 'interstellar transit civilization',
    engineeringScale: 'Galactic',
    depictionScale: 'room',
  },
  t3e01: {
    name: 'Xenobiome Route Graft',
    flavor: '',
    artifactForm: 'Biotech Graft / Transit Ecology',
    practicalCapability: 'noninvasive biosphere transit',
    civLane: 'interstellar symbiotic civilization',
    engineeringScale: 'Galactic',
    depictionScale: 'tabletop',
  },
  t1s01: {
    name: 'Echo Splinter',
    flavor: '',
    artifactForm: 'Archive / Sensor',
    practicalCapability: 'event echo capture',
    civLane: 'planetary memory culture',
    engineeringScale: 'Planetary',
    depictionScale: 'macro',
  },
  t2s02: {
    name: 'Storm-Memory Filament',
    flavor: '',
    artifactForm: 'Archive / Sensor',
    practicalCapability: 'stellar weather memory',
    civLane: 'heliosphere archivist culture',
    engineeringScale: 'Star-system',
    depictionScale: 'macro',
  },
  t3s03: {
    name: 'Extinction Signal Decoder',
    flavor: '',
    artifactForm: 'Signal Decoder / Cultural Archive',
    practicalCapability: 'extinct-civilization interpretation',
    civLane: 'galactic archivist civilization',
    engineeringScale: 'Galactic',
    depictionScale: 'room',
  },
  t2p03: {
    name: 'Living Treaty Organ',
    flavor: '',
    artifactForm: 'Biotech Protocol / Civic Signal',
    practicalCapability: 'interdependent treaty metabolism',
    civLane: 'treaty ecology civilization',
    engineeringScale: 'Star-system',
    depictionScale: 'macro',
  },
  t3p01: {
    name: 'Plurality Accord Verifier',
    flavor: '',
    artifactForm: 'Verification System / Civic Protocol',
    practicalCapability: 'cross-species consent verification',
    civLane: 'plural civic civilization',
    engineeringScale: 'Galactic',
    depictionScale: 'room',
  },
};

export default function DevCivilizationScene() {
  const [tier, setTier] = React.useState<KardashevTier>(() => getInitialTier());
  const [presetId, setPresetId] = React.useState<PreviewPresetId>(() => getInitialPreset());
  const [defaultScanActive, setDefaultScanActive] = React.useState(() => getInitialScanState());
  const [noticePreviewActive, setNoticePreviewActive] = React.useState(() => getInitialNoticePreviewState());
  const [stabilityBand, setStabilityBand] = React.useState<CivilizationStabilityBand>(() => getInitialStability());
  const [activeCondition, setActiveCondition] = React.useState<CivilizationCoreCondition | null>(() => getInitialCondition());
  const defaultScene = React.useMemo(() => getInitialScene(), []);
  const initialRecentSiteIds = React.useMemo(() => getInitialRecentSiteIds(), []);
  const [selectedCard, setSelectedCard] = React.useState<ArtifactCard | null>(null);
  const [previewRecentSiteIds, setPreviewRecentSiteIds] = React.useState<string[]>(initialRecentSiteIds);
  const [forgePreviewArtifacts, setForgePreviewArtifacts] = React.useState<ArtifactCard[]>(() => (
    FORGE_PREVIEW_ARTIFACTS.slice(0, getInitialForgePreviewCount())
  ));
  const activePreset = React.useMemo(() => (
    PREVIEW_PRESETS.find((preset) => preset.id === presetId) ?? PREVIEW_PRESETS[0]
  ), [presetId]);
  const presetArtifacts = React.useMemo(() => (
    activePreset.artifactIds
      .map((artifactId) => SAMPLE_ARTIFACT_BY_ID.get(artifactId))
      .filter((entry): entry is ArtifactCard => Boolean(entry))
  ), [activePreset]);
  const previewArtifacts = React.useMemo(() => [
    ...presetArtifacts,
    ...forgePreviewArtifacts,
  ], [forgePreviewArtifacts, presetArtifacts]);
  const profile = React.useMemo(() => buildCivilizationProfile(previewArtifacts), [previewArtifacts]);
  const palette = React.useMemo(() => getDominantAffinityPalette(previewArtifacts), [previewArtifacts]);
  const deploymentSites = React.useMemo(() => buildCivilizationDeploymentSites({
    forgedArtifacts: previewArtifacts,
    loreCatalog: SAMPLE_LORE,
    tier,
    ownerPlayerId: 'preview',
    turnCount: 9,
    luminaryAffinities: activePreset.luminaryAffinity ? [{
      luminaryId: `lum_${activePreset.luminaryAffinity}`,
      ownerId: 'preview',
      activeAffinity: activePreset.luminaryAffinity,
      eligibleAffinities: [activePreset.luminaryAffinity],
      summonedAtTurnCount: 3,
    }] : [],
    manifestedBlueprintDevices: activePreset.blueprintIds.map((blueprintId, index) => ({
      blueprintId,
      ownerPlayerId: 'preview',
      slotIndex: index,
      state: index === 0 ? 'armed' : 'ready',
      presentationVariant: 'armored',
    })),
    scenarioProtocols: activePreset.includeSealedProtocol ? [{
      protocolId: 'sealed_protocol_01',
      ownerPlayerId: 'preview',
      slotIndex: 0,
      state: 'armed',
      publicEffect: 'A sealed consequence is active.',
    }] : [],
    chronicleRecords: activePreset.includeChronicle ? [{
      chronicleId: 'outer_vault_access',
      ownerPlayerId: 'preview',
      title: 'Outer Vault Access',
      summary: 'The recovered thread changes how the civilization remembers the first opened threshold.',
      visibleAs: 'a restored archive signal threaded through civic memory and threshold records',
      laneLabel: 'Recovered story thread',
      publicEffect: 'A recovered story-mode thread is available for future campaign context.',
      scaleBand: 'planetary',
      affinity: 'radiance',
      trait: 'archive',
    }] : [],
  }), [activePreset, previewArtifacts, tier]);

  const hasRemainingForgePreview = forgePreviewArtifacts.length < FORGE_PREVIEW_ARTIFACTS.length;
  const tracePreviewMode: TracePreviewMode = noticePreviewActive ? 'notice' : 'scan';
  const setTracePreviewMode = React.useCallback((mode: TracePreviewMode) => {
    const nextNoticePreviewActive = mode === 'notice';
    setNoticePreviewActive(nextNoticePreviewActive);
    if (nextNoticePreviewActive) {
      setDefaultScanActive(false);
    }
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (nextNoticePreviewActive) {
      params.set('notice', '1');
      params.delete('scan');
    } else {
      params.delete('notice');
    }
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);
  const openScanPreview = React.useCallback(() => {
    setNoticePreviewActive(false);
    setDefaultScanActive(true);
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    params.delete('notice');
    params.set('scan', '1');
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, []);
  const acknowledgeRecentPreviewSites = React.useCallback((siteIds: readonly string[]) => {
    setPreviewRecentSiteIds((current) => current.filter((siteId) => !siteIds.includes(siteId)));
  }, []);
  const totalEminence = React.useMemo(() => (
    previewArtifacts.reduce((total, card) => total + Math.max(0, card.eminence), 0)
  ), [previewArtifacts]);
  const selectedTierLabel = TIERS.find((item) => item.tier === tier)?.label ?? 'Civilization';
  const commandFocusSite = React.useMemo(() => {
    const recentFocus = previewRecentSiteIds
      .map((siteId) => deploymentSites.find((site) => site.id === siteId))
      .find((site): site is NonNullable<typeof site> => Boolean(site));
    return recentFocus ?? deploymentSites[0] ?? null;
  }, [deploymentSites, previewRecentSiteIds]);
  const commandFocusCard = React.useMemo(() => (
    commandFocusSite?.artifactId
      ? previewArtifacts.find((card) => card.id === commandFocusSite.artifactId) ?? null
      : null
  ), [commandFocusSite, previewArtifacts]);
  const selectedCardSite = React.useMemo(() => (
    selectedCard
      ? deploymentSites.find((site) => site.artifactId === selectedCard.id) ?? null
      : null
  ), [deploymentSites, selectedCard]);
  const activeRecordSite = selectedCardSite ?? commandFocusSite;
  const activeRecordSource = selectedCard ?? commandFocusCard;
  const activeRecordScene = React.useMemo(() => (
    getPreviewRecordScene(tier, activeRecordSite)
  ), [activeRecordSite, tier]);
  const previewArchetype = React.useMemo(() => deriveCivilizationArchetype(
    profile,
    getPreviewArchetypeSignals(
      deploymentSites,
      activePreset.blueprintIds.length,
      Boolean(activePreset.luminaryAffinity),
    ),
  ), [activePreset.blueprintIds.length, activePreset.luminaryAffinity, deploymentSites, profile]);
  const activeRecordPlate = React.useMemo(() => (
    getCivilizationPlateArtSlot(activeRecordScene, true, previewArchetype)
  ), [activeRecordScene, previewArchetype]);
  const activeRecordArtSlot = React.useMemo(() => (
    activeRecordSite ? getCivilizationSiteArtSlot(activeRecordSite) : null
  ), [activeRecordSite]);
  const activeRecordTone = activeRecordSite ? palette.primary : '#82ddff';
  const activeRecordTitle = activeRecordSite?.title ?? activeRecordPlate.label;
  const activeRecordTitleCompact = activeRecordTitle.length > 28;
  const activeRecordTypeLabel = activeRecordSite
    ? activeRecordSite.kind === 'blueprint'
      ? 'Recovered Blueprint'
      : activeRecordSite.kind === 'luminary'
        ? 'Luminary Influence'
        : activeRecordSite.kind === 'protocol'
          ? 'Sealed Protocol'
          : activeRecordSite.kind === 'chronicle'
            ? 'Chronicle Thread'
            : activeRecordSource?.name ?? activeRecordSite.laneLabel
    : 'Civilization Record';

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#03050d] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          backgroundImage: [
            'radial-gradient(circle at 18% 18%, rgba(80,154,255,0.18), transparent 34%)',
            'radial-gradient(circle at 82% 22%, rgba(223,184,107,0.12), transparent 30%)',
            'linear-gradient(rgba(130,221,255,0.055) 1px, transparent 1px)',
            'linear-gradient(90deg, rgba(130,221,255,0.05) 1px, transparent 1px)',
          ].join(','),
          backgroundSize: 'auto, auto, 64px 64px, 64px 64px',
        }}
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-[1600px] flex-col gap-2 px-2 py-2 sm:gap-4 sm:px-5 sm:py-4 lg:px-6">
        <header className="relative overflow-hidden border border-[#82ddff]/16 bg-[#07101f]/86 shadow-[0_22px_80px_rgba(0,0,0,0.34)]">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#82ddff]/60 to-transparent"
            aria-hidden="true"
          />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 px-3 py-2 sm:px-4 sm:py-3 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1fr)_auto] lg:gap-4">
            <div className="col-start-1 row-start-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-[#82ddff]/48">
                Civilization View
              </p>
              <h1 className="mt-1 truncate text-base font-semibold text-white sm:text-lg">
                {selectedTierLabel} Command Portrait
              </h1>
            </div>
            <div className="col-span-2 row-start-2 flex flex-wrap gap-1.5 sm:gap-2 lg:col-span-1 lg:row-auto lg:justify-center">
              {TIERS.map((item) => (
                <button
                  key={item.tier}
                  type="button"
                  className="rounded-[7px] border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest transition-colors sm:px-3 sm:py-2 sm:text-[10px]"
                  style={{
                    borderColor: tier === item.tier ? palette.primary : 'rgba(255,255,255,0.14)',
                    background: tier === item.tier ? `${palette.primary}22` : 'rgba(255,255,255,0.035)',
                    color: tier === item.tier ? palette.accent : 'rgba(255,255,255,0.62)',
                  }}
                  onClick={() => {
                    setTier(item.tier);
                    setSelectedCard(null);
                    updatePreviewQuery(item.tier, presetId);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="col-start-2 row-start-1 justify-self-end rounded-[7px] border border-[#dfb86b]/45 bg-[#dfb86b]/10 px-2 py-1.5 text-[8px] font-black uppercase tracking-widest text-[#ffe4a3] transition-colors hover:border-[#dfb86b]/70 hover:bg-[#dfb86b]/16 sm:px-3 sm:py-2 sm:text-[10px] lg:col-auto lg:row-auto lg:justify-self-end"
              onClick={() => {
                setSelectedCard(null);
                setForgePreviewArtifacts((current) => {
                  if (current.length >= FORGE_PREVIEW_ARTIFACTS.length) {
                    setPreviewRecentSiteIds([]);
                    return [];
                  }
                  const nextArtifact = FORGE_PREVIEW_ARTIFACTS[current.length];
                  if (nextArtifact) setPreviewRecentSiteIds([`artifact:${nextArtifact.id}`]);
                  return nextArtifact ? [...current, nextArtifact] : current;
                });
              }}
            >
              {hasRemainingForgePreview ? (
                <>
                  <span className="sm:hidden">Forge Trace</span>
                  <span className="hidden sm:inline">Simulate Forge Trace</span>
                </>
              ) : (
                <>
                  <span className="sm:hidden">Reset</span>
                  <span className="hidden sm:inline">Reset Trace Test</span>
                </>
              )}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/8 px-3 pb-2 pt-2 sm:px-4 lg:justify-center">
            <span className="mr-1 text-[8px] font-black uppercase tracking-[0.22em] text-white/36">
              System state
            </span>
            <select
              aria-label="Preview Stability"
              className="rounded-[7px] border border-white/13 bg-[#07101f] px-2 py-1.5 text-[9px] text-white/72"
              value={stabilityBand}
              onChange={(event) => {
                const next = event.target.value as CivilizationStabilityBand;
                setStabilityBand(next);
                const params = new URLSearchParams(window.location.search);
                params.set('stability', next);
                window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
              }}
            >
              {(['stable', 'strained', 'unstable', 'crisis'] as const).map((band) => (
                <option key={band} value={band}>{band}</option>
              ))}
            </select>
            <select
              aria-label="Preview Condition"
              className="rounded-[7px] border border-white/13 bg-[#07101f] px-2 py-1.5 text-[9px] text-white/72"
              value={activeCondition ?? 'none'}
              onChange={(event) => {
                const next = event.target.value === 'none'
                  ? null
                  : event.target.value as CivilizationCoreCondition;
                setActiveCondition(next);
                const params = new URLSearchParams(window.location.search);
                if (next) params.set('condition', next);
                else params.delete('condition');
                window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
              }}
            >
              <option value="none">no condition</option>
              {(['damaged', 'isolated', 'quarantined', 'disrupted'] as const).map((condition) => (
                <option key={condition} value={condition}>{condition}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 border-t border-white/8 px-3 pb-2 pt-2 sm:px-4 lg:justify-center">
            <span className="mr-1 text-[8px] font-black uppercase tracking-[0.22em] text-white/36">
              Recent trace
            </span>
            {([
              ['scan', 'Scan Response'],
              ['notice', 'Board Notice'],
            ] as const).map(([mode, label]) => {
              const active = tracePreviewMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  className="rounded-[7px] border px-2.5 py-1.5 text-[8px] font-black uppercase tracking-widest transition-colors sm:px-3 sm:text-[9px]"
                  style={{
                    borderColor: active ? palette.primary : 'rgba(255,255,255,0.13)',
                    background: active ? `${palette.primary}1D` : 'rgba(255,255,255,0.032)',
                    color: active ? palette.accent : 'rgba(255,255,255,0.56)',
                  }}
                  onClick={() => setTracePreviewMode(mode)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </header>

        <div
          className={`grid min-h-0 gap-3 sm:gap-4 ${
            defaultScanActive ? 'lg:grid-cols-[72px_minmax(0,1fr)]' : 'lg:grid-cols-[72px_minmax(0,1fr)_340px]'
          }`}
        >
          <nav
            className="flex gap-1 overflow-x-auto border border-white/10 bg-black/32 p-1 sm:gap-2 sm:p-2 lg:flex-col lg:overflow-visible"
            aria-label="Civilization preview presets"
          >
            {PREVIEW_PRESETS.map((preset) => {
              const active = presetId === preset.id;
              const PresetIcon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={active}
                  className="group grid min-h-9 min-w-9 place-items-center rounded-[7px] border px-1 text-[8px] font-black uppercase tracking-widest transition-colors sm:min-h-12 sm:min-w-12 sm:px-2 sm:text-[9px] lg:min-w-0"
                  title={preset.label}
                  style={{
                    borderColor: active ? preset.tone : 'rgba(255,255,255,0.12)',
                    background: active
                      ? `linear-gradient(135deg, ${preset.tone}30, rgba(255,255,255,0.045))`
                      : 'rgba(255,255,255,0.028)',
                    color: active ? '#ffffff' : 'rgba(255,255,255,0.52)',
                    boxShadow: active ? `0 0 24px ${preset.tone}1F` : undefined,
                  }}
                  onClick={() => {
                    setPresetId(preset.id);
                    setSelectedCard(null);
                    setForgePreviewArtifacts([]);
                    setPreviewRecentSiteIds([]);
                    updatePreviewQuery(tier, preset.id);
                  }}
                >
                  <span
                    className="mb-0.5 grid h-5 w-5 place-items-center border sm:mb-1 sm:h-7 sm:w-7"
                    style={{
                      borderColor: active ? `${preset.tone}A8` : `${preset.tone}55`,
                      background: active ? `${preset.tone}1F` : 'rgba(255,255,255,0.035)',
                      boxShadow: active ? `inset 0 0 16px ${preset.tone}14` : undefined,
                    }}
                    aria-hidden="true"
                  >
                    <PresetIcon
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                      style={{
                        color: active ? preset.tone : 'rgba(255,255,255,0.48)',
                        filter: active ? `drop-shadow(0 0 7px ${preset.tone}99)` : undefined,
                      }}
                      strokeWidth={active ? 2.3 : 1.7}
                    />
                  </span>
                  <span className="hidden lg:block">{preset.shortLabel}</span>
                  <span className="sr-only">{preset.label}</span>
                </button>
              );
            })}
          </nav>

          <section className="min-w-0">
            <CivilizationScenePanel
              key={`${tier}:${presetId}:${defaultScanActive ? 'scan' : 'default'}:${tracePreviewMode}:${defaultScene ?? 'tier'}`}
              tier={tier}
              palette={palette}
              profile={profile}
              progressFraction={1}
              paused={false}
              defaultScanActive={defaultScanActive}
              defaultScene={defaultScene}
              deploymentSites={deploymentSites}
              forgedArtifacts={previewArtifacts}
              stabilityBand={stabilityBand}
              activeConditions={activeCondition ? [activeCondition] : []}
              externalRecentSiteIds={noticePreviewActive ? [] : previewRecentSiteIds}
              onRecentSiteIdsSeen={acknowledgeRecentPreviewSites}
              onOpenArtifact={setSelectedCard}
            />
          </section>

          <aside className={defaultScanActive ? 'hidden' : 'hidden lg:block'}>
            <section
              className="overflow-hidden border border-[#82ddff]/16 bg-[#07101f]/76 shadow-[inset_0_0_32px_rgba(130,221,255,0.045),0_18px_60px_rgba(0,0,0,0.34)]"
              style={{
                background: `linear-gradient(155deg, rgba(7,16,31,0.86), ${palette.primary}0D 52%, rgba(3,5,13,0.86))`,
              }}
            >
              <div className="border-b border-white/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#82ddff]/58">
                  Command Telemetry
                </p>
                <div className="mt-4 grid gap-3">
                  {[
                    ['Eminence', totalEminence],
                    ['Artifacts', previewArtifacts.length],
                    ['Traces', deploymentSites.length],
                  ].map(([label, value]) => (
                    <div key={label} className="grid grid-cols-[82px_1fr_auto] items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/42">
                        {label}
                      </span>
                      <span className="h-1.5 overflow-hidden bg-white/10">
                        <span
                          className="block h-full"
                          style={{
                            width: `${Math.min(100, Number(value) * 8 + 16)}%`,
                            background: `linear-gradient(90deg, ${palette.primary}, ${palette.accent})`,
                          }}
                        />
                      </span>
                      <span className="text-xs font-semibold text-white/82">{value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[248px] overflow-hidden border-b border-white/10">
                <img
                  src={activeRecordPlate.src}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover opacity-74"
                  style={{
                    objectPosition: activeRecordPlate.position,
                    filter: `${activeRecordPlate.contrast} saturate(1.08) brightness(0.78)`,
                    transform: `scale(${activeRecordPlate.scanScale + 0.035})`,
                    transformOrigin: activeRecordPlate.transformOrigin,
                  }}
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: [
                      'linear-gradient(180deg, rgba(3,5,13,0.06), rgba(3,5,13,0.84))',
                      'radial-gradient(circle at 50% 42%, transparent 0 30%, rgba(3,5,13,0.48) 72%)',
                    ].join(','),
                  }}
                  aria-hidden="true"
                />
                <div
                  className="pointer-events-none absolute inset-4 border border-white/14"
                  style={{
                    boxShadow: `inset 0 0 24px ${activeRecordTone}18, 0 0 26px ${activeRecordTone}12`,
                  }}
                  aria-hidden="true"
                />
                <div className="relative z-10 flex min-h-[248px] flex-col justify-between p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.24em] text-white/46">
                        Deployment Dossier
                      </p>
                      <p
                        className={`mt-1 max-w-[246px] font-semibold text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.95)] ${
                          activeRecordTitleCompact ? 'text-[16px] leading-[1.08]' : 'text-lg leading-tight'
                        }`}
                      >
                        {activeRecordTitle}
                      </p>
                      <p className="mt-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/52">
                        {activeRecordTypeLabel}
                      </p>
                    </div>
                    <span
                      className="grid h-10 w-10 shrink-0 place-items-center border"
                      style={{
                        borderColor: `${activeRecordTone}90`,
                        background: `${activeRecordTone}16`,
                        boxShadow: `0 0 28px ${activeRecordTone}28`,
                      }}
                      aria-hidden="true"
                    >
                      <span
                        className="h-4 w-4 rotate-45 border"
                        style={{
                          borderColor: activeRecordTone,
                          boxShadow: `0 0 18px ${activeRecordTone}`,
                        }}
                      />
                    </span>
                  </div>

                  <div>
                    <div className="mb-3 grid grid-cols-5 gap-1">
                      {Array.from({ length: 10 }).map((_, index) => (
                        <span
                          key={index}
                          className="h-1 bg-white/12"
                          style={index < Math.min(10, deploymentSites.length + 2) ? {
                            background: `linear-gradient(90deg, ${activeRecordTone}, rgba(255,255,255,0.28))`,
                            opacity: 0.78 - index * 0.045,
                          } : undefined}
                          aria-hidden="true"
                        />
                      ))}
                    </div>
                    <p className="line-clamp-3 text-xs leading-relaxed text-white/72 drop-shadow-[0_1px_10px_rgba(0,0,0,0.9)]">
                      {activeRecordSite?.summary ?? 'Civilization work is surfaced here as a focused command dossier.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {[activeRecordArtSlot?.label, activeRecordSource?.name, activeRecordSite?.laneLabel]
                        .filter((entry): entry is string => Boolean(entry))
                        .slice(0, 3)
                        .map((entry) => (
                          <span
                            key={entry}
                            className="border border-white/12 bg-black/34 px-2 py-1 text-[8px] font-black uppercase tracking-[0.12em] text-white/52 backdrop-blur"
                          >
                            {entry}
                          </span>
                        ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/38">
                  Civilization Consequence
                </p>
                {activeRecordSite ? (
                  <div className="mt-3 grid gap-3">
                    <p
                      className="border-l pl-3 text-xs leading-relaxed text-white/68"
                      style={{ borderColor: `${palette.primary}55` }}
                    >
                      {activeRecordSite.visibleAs}.
                    </p>
                    <div className="grid gap-2 text-[10px] leading-relaxed text-white/54">
                      <p>
                        <span className="mb-0.5 block font-black uppercase tracking-widest text-white/34">
                          Civic role
                        </span>
                        <span className="text-white/62">{activeRecordSite.laneLabel}</span>
                      </p>
                      {activeRecordSite.synergySummary && (
                        <p>
                          <span className="mb-0.5 block font-black uppercase tracking-widest text-white/34">
                            Network interaction
                          </span>
                          <span className="text-white/62">{activeRecordSite.synergySummary}</span>
                        </p>
                      )}
                      {activeRecordSite.gameplayEffect && (
                        <p>
                          <span className="mb-0.5 block font-black uppercase tracking-widest text-white/34">
                            Game effect
                          </span>
                          <span className="text-white/62">{activeRecordSite.gameplayEffect}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-sm leading-relaxed text-white/72">
                    Civilization traces will appear here as artifacts, Blueprints, and alliances reshape the portrait.
                  </p>
                )}
              </div>
            </section>
          </aside>
        </div>
      </div>
      {previewRecentSiteIds.length > 0 && noticePreviewActive && !defaultScanActive && (
        <BoardCivilizationTraceNotice
          deploymentSites={deploymentSites}
          recentSiteIds={previewRecentSiteIds}
          palette={palette}
          civilizationModel={{
            name: 'Preview Civilization',
            tier,
            palette,
            profile,
            forgedCount: previewArtifacts.length,
          }}
          progressFraction={1}
          onOpenCivilization={() => {
            openScanPreview();
          }}
        />
      )}
    </main>
  );
}
