import React from 'react';
import { ScanLine, X, ZoomIn } from 'lucide-react';
import type { ArtifactCard } from '@workspace/api-client-react';
import { getCivilizationCapabilityDefinition } from '@workspace/game-types';
import type {
  CivilizationCoreCondition,
  CivilizationStabilityBand,
} from '@workspace/game-types';
import type { AffinityPalette, KardashevTier } from '@/lib/kardashev';
import type { CivilizationProfile } from '@/lib/civilizationProfile';
import {
  getCivilizationScaleLabel,
  prioritizeRecentCivilizationSiteIds,
  type CivilizationDeploymentAnchor,
  type CivilizationDeploymentSite,
} from '@/lib/civilizationDeploymentSites';
import {
  isSmallArtifactVisualSignature,
  selectCivilizationVisualSignatures,
  type CivilizationVisualSignatureDescriptor,
} from '@/lib/civilizationVisualSignatures';
import {
  CIVILIZATION_ARCHETYPE_VISUALS,
  deriveCivilizationArchetype,
  getCivilizationArchetypeTone,
  type CivilizationArchetypeId,
} from '@/lib/civilizationArchetypes';
import { getArtifactArtworkScalePolicy, isLocalArtifactDepictionScale } from '@/lib/civilizationArtworkScale';
import {
  getCivilizationArchetypeArtSlot,
  getCivilizationPlateArtSlot,
  getCivilizationSiteArtSlot,
} from '@/lib/civilizationArtRegistry';
import { AFFINITY_META } from '@/lib/affinityMeta';
import { useIsMobile } from '@/hooks/use-mobile';
import { markHintSeen } from '@/lib/cinematicPrefs';

interface CivilizationScenePanelProps {
  tier: KardashevTier;
  palette: AffinityPalette;
  profile: CivilizationProfile;
  progressFraction: number;
  paused: boolean;
  defaultScanActive?: boolean;
  defaultScene?: MarketSceneKind;
  deploymentSites: readonly CivilizationDeploymentSite[];
  forgedArtifacts: readonly ArtifactCard[];
  guidanceEnabled?: boolean;
  stabilityBand?: CivilizationStabilityBand;
  activeConditions?: readonly CivilizationCoreCondition[];
  externalRecentSiteIds?: readonly string[];
  onRecentSiteIdsSeen?: (siteIds: readonly string[]) => void;
  onOpenArtifact: (card: ArtifactCard) => void;
}

const CIVILIZATION_STABILITY_LABELS: Record<CivilizationStabilityBand, string> = {
  stable: 'Stable',
  strained: 'Strained',
  unstable: 'Unstable',
  crisis: 'Crisis',
};

function CivilizationSystemStateLayer({
  stabilityBand,
  activeConditions,
}: {
  stabilityBand: CivilizationStabilityBand;
  activeConditions: readonly CivilizationCoreCondition[];
}) {
  const conditions = new Set(activeConditions);
  const stabilityBackground = stabilityBand === 'stable'
    ? 'transparent'
    : stabilityBand === 'strained'
      ? 'radial-gradient(ellipse at 50% 48%, transparent 56%, rgba(225,166,82,0.16) 100%)'
      : stabilityBand === 'unstable'
        ? 'repeating-linear-gradient(173deg, transparent 0 54px, rgba(232,127,79,0.075) 55px 57px, transparent 58px 104px), radial-gradient(ellipse at 50% 48%, transparent 48%, rgba(176,80,65,0.2) 100%)'
        : 'repeating-linear-gradient(167deg, transparent 0 72px, rgba(232,92,72,0.105) 73px 75px, transparent 76px 126px), radial-gradient(ellipse at 50% 45%, transparent 32%, rgba(73,12,24,0.48) 100%)';

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[18]"
      data-testid="civilization-system-state"
      data-stability={stabilityBand}
      data-conditions={activeConditions.join(',') || 'none'}
      aria-hidden="true"
    >
      <div className="absolute inset-0" style={{ background: stabilityBackground }} />
      {conditions.has('damaged') && (
        <div
          className="absolute inset-0 opacity-55"
          style={{
            background: 'linear-gradient(132deg, transparent 0 13%, rgba(245,139,93,0.28) 13.2% 13.45%, transparent 13.7% 77%, rgba(245,139,93,0.2) 77.2% 77.45%, transparent 77.7%)',
          }}
        />
      )}
      {conditions.has('isolated') && (
        <div className="absolute inset-[3%] border border-[#b496ff]/22 shadow-[inset_0_0_42px_rgba(75,44,124,0.17)]" />
      )}
      {conditions.has('quarantined') && (
        <div className="absolute inset-[5%] rounded-[50%] border border-[#e8b45f]/30 shadow-[0_0_26px_rgba(232,180,95,0.12),inset_0_0_26px_rgba(232,180,95,0.08)]" />
      )}
      {conditions.has('disrupted') && (
        <div
          className="absolute inset-0 opacity-35"
          style={{
            background: 'repeating-linear-gradient(180deg, transparent 0 41px, rgba(130,221,255,0.18) 42px 43px, transparent 44px 78px)',
            clipPath: 'polygon(0 0, 38% 0, 38% 24%, 72% 24%, 72% 42%, 26% 42%, 26% 66%, 83% 66%, 83% 82%, 0 82%)',
          }}
        />
      )}
    </div>
  );
}

export interface CivilizationMiniatureSceneProps {
  tier: KardashevTier;
  palette: AffinityPalette;
  profile: CivilizationProfile;
  progressFraction: number;
  paused: boolean;
  deploymentSites: readonly CivilizationDeploymentSite[];
  recentSiteIds?: readonly string[];
  showRecentCard?: boolean;
  presentation?: 'standard' | 'thumbnail';
  className?: string;
}

type MarketSceneKind = 'surface' | 'orbit' | 'stellar' | 'galaxy';
type CivilizationImpactKind = 'artifact' | 'blueprint' | 'luminary' | 'protocol' | 'chronicle';

const RECENT_TRACE_VISIBLE_MS = 6500;

const SCENE_COPY: Record<MarketSceneKind, { title: string; copy: string; label: string }> = {
  surface: {
    title: 'City Detail',
    label: 'City / surface detail',
    copy:
      'Local works resolve into districts, vaults, gardens, corridors, and controlled hazard sites.',
  },
  orbit: {
    title: 'Planet View',
    label: 'Planetary scale',
    copy:
      'City lights, weather bands, and orbital works reveal how Artifacts reshape the planet.',
  },
  stellar: {
    title: 'System View',
    label: 'Stellar system',
    copy:
      'Traffic lanes, shield pressure, industry, ecological routing, and warning bands define the system.',
  },
  galaxy: {
    title: 'Galactic View',
    label: 'Galactic sector',
    copy:
      'Spiral arms resolve into recovery corridors, pressure fields, redacted regions, and route networks.',
  },
};

const SCENE_ORDER: readonly MarketSceneKind[] = ['surface', 'orbit', 'stellar', 'galaxy'];

const SCENE_UI: Record<MarketSceneKind, { label: string; zoomLabel: string; hotspotLabel: string; hotspotAnchor: CivilizationDeploymentAnchor }> = {
  surface: {
    label: 'City',
    zoomLabel: 'City detail',
    hotspotLabel: 'City detail',
    hotspotAnchor: { x: 50, y: 68 },
  },
  orbit: {
    label: 'Planet',
    zoomLabel: 'Planet view',
    hotspotLabel: 'Inspect city',
    hotspotAnchor: { x: 45, y: 61 },
  },
  stellar: {
    label: 'System',
    zoomLabel: 'System view',
    hotspotLabel: 'Inspect planet',
    hotspotAnchor: { x: 66, y: 50 },
  },
  galaxy: {
    label: 'Galaxy',
    zoomLabel: 'Galactic view',
    hotspotLabel: 'Inspect system',
    hotspotAnchor: { x: 50, y: 50 },
  },
};

function getSceneIndex(scene: MarketSceneKind): number {
  return SCENE_ORDER.indexOf(scene);
}

function getSceneDepthLabel(scene: MarketSceneKind): string {
  return SCENE_UI[scene].zoomLabel;
}

function getCivilizationImpactKind(site: CivilizationDeploymentSite | undefined): CivilizationImpactKind {
  if (site?.kind === 'blueprint') return 'blueprint';
  if (site?.kind === 'luminary') return 'luminary';
  if (site?.kind === 'protocol') return 'protocol';
  if (site?.kind === 'chronicle') return 'chronicle';
  return 'artifact';
}

function getCivilizationImpactBadge(kind: CivilizationImpactKind): string {
  if (kind === 'blueprint') return 'BP';
  if (kind === 'luminary') return 'LUM';
  if (kind === 'protocol') return 'SEAL';
  if (kind === 'chronicle') return 'CHR';
  return 'ART';
}

function getCivilizationImpactLabel(kind: CivilizationImpactKind): string {
  if (kind === 'blueprint') return 'Blueprint reshapes civilization';
  if (kind === 'luminary') return 'Luminary pressure detected';
  if (kind === 'protocol') return 'Sealed protocol active';
  if (kind === 'chronicle') return 'Chronicle thread restored';
  return 'Artifact trace integrated';
}

function getCivilizationImpactShortLabel(kind: CivilizationImpactKind): string {
  if (kind === 'blueprint') return 'Blueprint online';
  if (kind === 'luminary') return 'Luminary pressure';
  if (kind === 'protocol') return 'Protocol sealed';
  if (kind === 'chronicle') return 'Chronicle active';
  return 'Artifact trace';
}

function getCivilizationScaleTargetChip(site: CivilizationDeploymentSite | undefined): string {
  const kind = getCivilizationImpactKind(site);
  if (kind === 'artifact') return 'New';
  return getCivilizationImpactBadge(kind);
}

function getCivilizationScaleTargetLabel(
  scaleLabel: string,
  site: CivilizationDeploymentSite | undefined,
): string {
  const kind = getCivilizationImpactKind(site);
  if (kind === 'blueprint') return `${scaleLabel} scale has new Blueprint work`;
  if (kind === 'luminary') return `${scaleLabel} scale has new Luminary influence`;
  if (kind === 'protocol') return `${scaleLabel} scale has new sealed protocol`;
  if (kind === 'chronicle') return `${scaleLabel} scale has new Chronicle thread`;
  return `${scaleLabel} scale has new work`;
}

function getRootSceneKind(tier: KardashevTier): MarketSceneKind {
  if (tier >= 3) return 'galaxy';
  if (tier >= 2) return 'stellar';
  return 'orbit';
}

function getSceneKind(tier: KardashevTier): MarketSceneKind {
  return getRootSceneKind(tier);
}

function getAvailableScenePath(tier: KardashevTier): MarketSceneKind[] {
  const rootIndex = getSceneIndex(getRootSceneKind(tier));
  return SCENE_ORDER
    .filter((scene) => getSceneIndex(scene) <= rootIndex)
    .reverse();
}

function normalizeSceneForTier(scene: MarketSceneKind | undefined | null, tier: KardashevTier): MarketSceneKind {
  const rootScene = getRootSceneKind(tier);
  if (!scene) return rootScene;
  return getSceneIndex(scene) <= getSceneIndex(rootScene) ? scene : rootScene;
}

function getInitialSceneOverride({
  defaultScene,
  defaultScanActive,
  deploymentSites,
  tier,
}: {
  defaultScene?: MarketSceneKind;
  defaultScanActive: boolean;
  deploymentSites: readonly CivilizationDeploymentSite[];
  tier: KardashevTier;
}): MarketSceneKind {
  if (defaultScene) return normalizeSceneForTier(defaultScene, tier);

  const rootScene = getRootSceneKind(tier);
  if (!defaultScanActive) return rootScene;

  const hasSurfaceNativeWork = deploymentSites.some((site) => getNativeSceneForSite(site) === 'surface');
  if (tier === 1 && hasSurfaceNativeWork) return 'surface';

  return rootScene;
}

function getChildScene(scene: MarketSceneKind, tier: KardashevTier): MarketSceneKind | null {
  const sceneIndex = getSceneIndex(scene);
  if (sceneIndex <= 0) return null;
  const child = SCENE_ORDER[sceneIndex - 1] ?? null;
  if (!child) return null;
  return getAvailableScenePath(tier).includes(child) ? child : null;
}

function getSceneForScaleBand(scaleBand: CivilizationDeploymentSite['scaleBand']): MarketSceneKind {
  if (scaleBand === 'galactic') return 'galaxy';
  if (scaleBand === 'stellar') return 'stellar';
  return 'orbit';
}

function getSceneForDepictionScale(
  depictionScale: NonNullable<CivilizationDeploymentSite['depictionScale']>,
): MarketSceneKind {
  return getArtifactArtworkScalePolicy(depictionScale).nativeLayer;
}

function getDepictionScaleLabel(
  depictionScale: NonNullable<CivilizationDeploymentSite['depictionScale']>,
): string {
  const labels: Record<NonNullable<CivilizationDeploymentSite['depictionScale']>, string> = {
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

function getArtifactTreatmentLabel(
  treatment: NonNullable<CivilizationDeploymentSite['artifactSceneTreatment']>,
): string {
  const labels: Record<NonNullable<CivilizationDeploymentSite['artifactSceneTreatment']>, string> = {
    ashroot_recovery: 'Recovery Root',
    mantlelift_driver: 'Lift Driver',
    ignition_kernel: 'Ignition Core',
    magnetic_bottle: 'Containment Bottle',
    horizon_extractor: 'Horizon Sampler',
    entropy_baffle: 'Heat Baffle',
  };
  return labels[treatment];
}

function getNativeSceneForSite(site: CivilizationDeploymentSite): MarketSceneKind {
  if (site.kind === 'blueprint' || site.kind === 'protocol' || site.kind === 'chronicle') {
    return getSceneForScaleBand(site.scaleBand);
  }
  if (site.kind === 'luminary') return getSceneForScaleBand(site.scaleBand);
  if (site.nativeArtworkLayer) return site.nativeArtworkLayer;
  if (site.depictionScale) return getSceneForDepictionScale(site.depictionScale);
  if (site.representationMode === 'local_trace' || isSmallArtifactSite(site)) return 'surface';
  if (site.artifactTier === 1) return 'surface';
  return getSceneForScaleBand(site.scaleBand);
}

function shouldRenderArtifactNative(site: CivilizationDeploymentSite, scene: MarketSceneKind): boolean {
  return site.kind === 'artifact' && getNativeSceneForSite(site) === scene;
}

function shouldRenderArtifactAsNativeStructure(site: CivilizationDeploymentSite, scene: MarketSceneKind): boolean {
  if (!shouldRenderArtifactNative(site, scene)) return false;
  if (!site.depictionScale) return !isSmallArtifactSite(site);
  return getArtifactArtworkScalePolicy(site.depictionScale).canRenderAsStructure;
}

function shouldRenderArtifactInfluence(site: CivilizationDeploymentSite, scene: MarketSceneKind): boolean {
  return site.kind === 'artifact' && getSceneIndex(scene) > getSceneIndex(getNativeSceneForSite(site));
}

function shouldRenderDominantBlueprint(site: CivilizationDeploymentSite, scene: MarketSceneKind): boolean {
  if (site.kind !== 'blueprint') return false;
  return getSceneIndex(scene) >= getSceneIndex(getNativeSceneForSite(site));
}

function isSiteAvailableInScene(site: CivilizationDeploymentSite, scene: MarketSceneKind): boolean {
  return getSceneIndex(scene) >= getSceneIndex(getNativeSceneForSite(site));
}

function getSiteKindLabel(site: CivilizationDeploymentSite): string {
  if (site.kind === 'blueprint') return 'Blueprint consequence';
  if (site.kind === 'luminary') return 'Luminary influence';
  if (site.kind === 'protocol') return 'Sealed protocol';
  if (site.kind === 'chronicle') return 'Chronicle thread';
  return 'Artifact deployment';
}

function getDossierScaleKicker(
  site: CivilizationDeploymentSite,
  currentScene: MarketSceneKind,
  nativeScene: MarketSceneKind,
): string {
  if (site.kind !== 'artifact') {
    return `${getSiteKindLabel(site)} // ${getCivilizationScaleLabel(site.scaleBand)}`;
  }
  if (currentScene === nativeScene) {
    return `${getSiteKindLabel(site)} // Native ${SCENE_UI[nativeScene].zoomLabel}`;
  }
  return `${getSiteKindLabel(site)} // Influence ${getCivilizationScaleLabel(site.scaleBand)}`;
}

function getDossierScaleContextLabels(
  site: CivilizationDeploymentSite,
  nativeScene: MarketSceneKind,
): { native: string; influence?: string } | null {
  if (site.kind !== 'artifact') return null;
  const influenceScene = getSceneForScaleBand(site.scaleBand);
  const native = `Native: ${SCENE_UI[nativeScene].zoomLabel}`;
  if (influenceScene === nativeScene) return { native };
  return {
    native,
    influence: `Influence: ${getCivilizationScaleLabel(site.scaleBand)}`,
  };
}

function getTraceScaleBadge(site: CivilizationDeploymentSite): string {
  const nativeScene = getNativeSceneForSite(site);
  if (site.kind === 'artifact' && site.depictionScale) {
    return getDepictionScaleLabel(site.depictionScale);
  }
  return SCENE_UI[nativeScene].zoomLabel;
}

function getTraceScaleLine(site: CivilizationDeploymentSite): string {
  const nativeScene = getNativeSceneForSite(site);
  if (site.kind === 'artifact') {
    return `Native ${SCENE_UI[nativeScene].label.toLowerCase()} // ${site.visibleAs}`;
  }
  return `${getSiteKindLabel(site)} // ${site.visibleAs}`;
}

function getCivilizationSiteTone(site: CivilizationDeploymentSite): string {
  if (site.blueprintId === 'bp_antimatter_detonator') return '#ff6972';
  if (site.blueprintId === 'bp_mantle_to_orbit_foundry') return '#dfb86b';
  if (site.blueprintId === 'bp_worldshield_covenant') return '#ffe4a3';
  if (site.kind === 'protocol') return '#ff6972';
  if (site.kind === 'chronicle') return '#bea2ff';
  if (site.completedBlueprintId === 'bp_antimatter_detonator') return '#ff6972';
  if (site.completedBlueprintId === 'bp_mantle_to_orbit_foundry') return '#dfb86b';
  if (site.completedBlueprintId === 'bp_worldshield_covenant') return '#ffe4a3';
  return AFFINITY_META[site.affinity].hex;
}

function hasDominantBlueprintMark(site: CivilizationDeploymentSite): boolean {
  return (
    site.blueprintId === 'bp_antimatter_detonator' ||
    site.blueprintId === 'bp_mantle_to_orbit_foundry' ||
    site.blueprintId === 'bp_worldshield_covenant'
  );
}

function getClusterGroups(sites: readonly CivilizationDeploymentSite[]) {
  const groups = new Map<string, {
    count: number;
    pinTraceCount: number;
    label: string;
    scaleBand: CivilizationDeploymentSite['scaleBand'];
  }>();

  sites.forEach((site) => {
    const key = `${site.scaleBand}:${site.laneLabel}`;
    const pinTraceCount = isPinTraceArtifactSite(site) ? 1 : 0;
    const current = groups.get(key);
    if (current) {
      current.count += 1;
      current.pinTraceCount += pinTraceCount;
      return;
    }
    groups.set(key, {
      count: 1,
      pinTraceCount,
      label: site.laneLabel,
      scaleBand: site.scaleBand,
    });
  });

  return [...groups.values()].sort((left, right) => (
    right.count - left.count ||
    getCivilizationScaleLabel(left.scaleBand).localeCompare(getCivilizationScaleLabel(right.scaleBand)) ||
    left.label.localeCompare(right.label)
  ));
}

function isSmallArtifactSite(site: CivilizationDeploymentSite): boolean {
  return isSmallArtifactVisualSignature(site);
}

function isPinTraceArtifactSite(site: CivilizationDeploymentSite): boolean {
  if (site.kind !== 'artifact') return false;
  if (!site.depictionScale) return isSmallArtifactSite(site);
  return getArtifactArtworkScalePolicy(site.depictionScale).presence === 'artifact_pin';
}

function isCompactLocalArtifactSite(site: CivilizationDeploymentSite): boolean {
  return (
    site.kind === 'artifact' &&
    (
      isPinTraceArtifactSite(site) ||
      getNativeSceneForSite(site) === 'surface' ||
      (site.artifactTier ?? 0) <= 1
    )
  );
}

function getSmallArtifactTraceLabels(
  sites: readonly CivilizationDeploymentSite[],
  forgedArtifacts: readonly ArtifactCard[],
): string[] {
  const labels = sites
    .filter(isCompactLocalArtifactSite)
    .map((site) => {
      const card = site.artifactId
        ? forgedArtifacts.find((artifactCard) => artifactCard.id === site.artifactId)
        : null;
      return card?.name ?? site.title.replace(/\s+Trace$/i, '');
    });
  return [...new Set(labels)];
}

function formatSmallArtifactTraceSummary(labels: readonly string[]): string | null {
  if (labels.length === 0) return null;
  const shown = labels.slice(0, 2).join(' / ');
  const hiddenCount = labels.length - 2;
  return hiddenCount > 0 ? `${shown} +${hiddenCount}` : shown;
}

function formatTraceNames(sites: readonly CivilizationDeploymentSite[]): string {
  if (sites.length === 0) return '';
  const shown = sites.slice(0, 2).map((site) => site.title).join(' / ');
  const hiddenCount = sites.length - 2;
  return hiddenCount > 0 ? `${shown} +${hiddenCount}` : shown;
}

function selectSitesByIdOrder(
  sites: readonly CivilizationDeploymentSite[],
  siteIds: readonly string[],
): CivilizationDeploymentSite[] {
  const siteMap = new Map(sites.map((site) => [site.id, site]));
  return siteIds
    .map((siteId) => siteMap.get(siteId))
    .filter((site): site is CivilizationDeploymentSite => Boolean(site));
}

function selectSummaryWorks(
  sites: readonly CivilizationDeploymentSite[],
  visibleLimit: number,
  recentSiteIds: readonly string[] = [],
): CivilizationDeploymentSite[] {
  const selected: CivilizationDeploymentSite[] = [];
  const add = (site: CivilizationDeploymentSite | undefined) => {
    if (!site) return;
    if (selected.some((entry) => entry.id === site.id)) return;
    if (selected.length >= visibleLimit) return;
    selected.push(site);
  };

  for (const siteId of recentSiteIds) {
    add(sites.find((site) => site.id === siteId));
  }

  const sorted = [...sites].sort((left, right) => (
    right.priority - left.priority ||
    getSiteKindLabel(left).localeCompare(getSiteKindLabel(right)) ||
    left.title.localeCompare(right.title)
  ));

  add(sorted.find((site) => site.kind === 'blueprint'));
  add(sorted.find((site) => site.kind === 'luminary'));
  add(sorted.find((site) => site.kind === 'artifact' && (site.artifactTier ?? 0) >= 3));
  add(sorted.find(isSmallArtifactSite));

  for (const site of sorted) add(site);
  return selected;
}

function selectCompactSummaryWorks(
  sites: readonly CivilizationDeploymentSite[],
  visibleLimit: number,
  recentSiteIds: readonly string[] = [],
): CivilizationDeploymentSite[] {
  const selected: CivilizationDeploymentSite[] = [];
  const add = (site: CivilizationDeploymentSite | undefined) => {
    if (!site) return;
    if (selected.some((entry) => entry.id === site.id)) return;
    if (selected.length >= visibleLimit) return;
    selected.push(site);
  };

  for (const siteId of recentSiteIds) {
    add(sites.find((site) => site.id === siteId));
  }

  const sorted = [...sites].sort((left, right) => (
    right.priority - left.priority ||
    getSiteKindLabel(left).localeCompare(getSiteKindLabel(right)) ||
    left.title.localeCompare(right.title)
  ));

  add(sorted.find((site) => site.kind === 'blueprint'));
  add(sorted.find(isCompactLocalArtifactSite));
  add(sorted.find((site) => site.kind === 'artifact' && (site.artifactTier ?? 0) >= 3));
  add(sorted.find((site) => site.kind === 'luminary'));

  for (const site of sorted) add(site);
  return selected;
}

function getWorkSummaryTitle(site: CivilizationDeploymentSite, recentSiteIds: readonly string[]): string {
  if (recentSiteIds.includes(site.id)) return site.title;
  if (site.kind === 'blueprint' || site.kind === 'luminary' || site.kind === 'chronicle') return site.title;
  if (site.kind === 'protocol') return 'Sealed Protocol Trace';
  if (site.representationMode === 'local_trace') return `${site.consequenceLabel} Trace`;
  return site.title;
}

function selectVisibleSites(
  sites: readonly CivilizationDeploymentSite[],
  visibleLimit: number,
  pinnedSiteIds: readonly string[] = [],
): CivilizationDeploymentSite[] {
  if (sites.length <= visibleLimit) return [...sites];

  const selected: CivilizationDeploymentSite[] = [];
  const add = (site: CivilizationDeploymentSite | undefined) => {
    if (!site) return;
    if (selected.some((entry) => entry.id === site.id)) return;
    if (selected.length >= visibleLimit) return;
    selected.push(site);
  };

  for (const siteId of pinnedSiteIds) {
    add(sites.find((site) => site.id === siteId));
  }

  const blueprintsAndProtocols = sites.filter((site) => site.kind === 'blueprint' || site.kind === 'protocol' || site.kind === 'chronicle');
  const luminaries = sites.filter((site) => site.kind === 'luminary');
  const artifacts = sites.filter((site) => site.kind === 'artifact');
  const smallArtifacts = artifacts.filter(isPinTraceArtifactSite);

  add(blueprintsAndProtocols[0]);
  if (visibleLimit > 4) add(blueprintsAndProtocols[1]);
  add(luminaries[0]);
  add(artifacts[0]);
  add(smallArtifacts[0]);

  for (const site of sites) add(site);
  return selected;
}

function selectScanFocusSites(
  sites: readonly CivilizationDeploymentSite[],
  focusSiteId: string | null,
  visibleLimit: number,
  recentSiteIds: readonly string[] = [],
): CivilizationDeploymentSite[] {
  if (sites.length <= visibleLimit) return [...sites];

  const selected: CivilizationDeploymentSite[] = [];
  const add = (site: CivilizationDeploymentSite | undefined) => {
    if (!site) return;
    if (selected.some((entry) => entry.id === site.id)) return;
    if (selected.length >= visibleLimit) return;
    selected.push(site);
  };

  const focusSite = focusSiteId ? sites.find((site) => site.id === focusSiteId) : undefined;
  add(focusSite);
  for (const siteId of recentSiteIds) add(sites.find((site) => site.id === siteId));

  const sorted = [...sites].sort((left, right) => (
    right.priority - left.priority ||
    getSiteKindLabel(left).localeCompare(getSiteKindLabel(right)) ||
    left.title.localeCompare(right.title)
  ));

  if (focusSite) {
    add(sorted.find((site) => (
      site.id !== focusSite.id &&
      (site.completedBlueprintId === focusSite.completedBlueprintId ||
        site.blueprintId === focusSite.completedBlueprintId ||
        site.trait === focusSite.trait ||
        site.laneLabel === focusSite.laneLabel)
    )));
  }

  add(sorted.find((site) => site.kind === 'blueprint'));
  add(sorted.find((site) => site.kind === 'chronicle'));
  add(sorted.find((site) => site.kind === 'luminary'));
  add(sorted.find((site) => site.kind === 'artifact' && (site.artifactTier ?? 0) >= 3));
  add(sorted.find(isSmallArtifactSite));

  for (const site of sorted) add(site);
  return selected;
}

function selectCinematicSites(
  sites: readonly CivilizationDeploymentSite[],
  visibleLimit: number,
): CivilizationDeploymentSite[] {
  const selected: CivilizationDeploymentSite[] = [];
  const add = (site: CivilizationDeploymentSite | undefined) => {
    if (!site) return;
    if (selected.some((entry) => entry.id === site.id)) return;
    if (selected.length >= visibleLimit) return;
    selected.push(site);
  };

  const sorted = [...sites].sort((left, right) => (
    right.priority - left.priority ||
    getSiteKindLabel(left).localeCompare(getSiteKindLabel(right)) ||
    left.title.localeCompare(right.title)
  ));

  const blueprints = sorted.filter((site) => site.kind === 'blueprint');
  const hasBlueprint = blueprints.length > 0;
  blueprints.forEach(add);
  if (!hasBlueprint) {
    add(sorted.find((site) => site.kind === 'artifact' && (site.artifactTier ?? 0) >= 3));
    add(sorted.find(isSmallArtifactSite));
    add(sorted.find((site) => site.kind === 'luminary'));
  }

  for (const site of sorted) {
    if (hasBlueprint && site.kind !== 'blueprint' && site.kind !== 'protocol' && site.kind !== 'chronicle') continue;
    add(site);
  }

  if (selected.length === 0) add(sorted[0]);
  return selected;
}

function selectCinematicSignatureSites(
  sites: readonly CivilizationDeploymentSite[],
): CivilizationDeploymentSite[] {
  const hasBlueprint = sites.some((site) => site.kind === 'blueprint');
  if (!hasBlueprint) return [...sites];
  return sites.filter((site) => site.kind === 'blueprint' || site.kind === 'protocol' || site.kind === 'chronicle');
}

function selectCinematicVisualSites(
  sites: readonly CivilizationDeploymentSite[],
  visibleLimit: number,
  recentSiteIds: readonly string[] = [],
): CivilizationDeploymentSite[] {
  const selected: CivilizationDeploymentSite[] = [];
  const add = (site: CivilizationDeploymentSite | undefined) => {
    if (!site) return;
    if (selected.some((entry) => entry.id === site.id)) return;
    if (selected.length >= visibleLimit) return;
    selected.push(site);
  };

  for (const siteId of recentSiteIds) {
    add(sites.find((site) => site.id === siteId));
  }

  const sorted = [...sites].sort((left, right) => (
    right.priority - left.priority ||
    getSiteKindLabel(left).localeCompare(getSiteKindLabel(right)) ||
    left.title.localeCompare(right.title)
  ));
  const hasBlueprint = sorted.some((site) => site.kind === 'blueprint');

  add(sorted.find((site) => site.kind === 'blueprint'));
  add(sorted.find((site) => site.kind === 'chronicle'));
  add(sorted.find((site) => site.kind === 'luminary'));
  if (!hasBlueprint) {
    add(sorted.find(isSmallArtifactSite));
    add(sorted.find((site) => site.kind === 'artifact' && (site.artifactTier ?? 0) >= 3));
  }

  for (const site of selectCinematicSites(sites, visibleLimit)) add(site);
  for (const site of sorted) {
    if (hasBlueprint && site.kind === 'artifact') continue;
    add(site);
  }

  return selected;
}

function selectCinematicHeroSites(
  sites: readonly CivilizationDeploymentSite[],
  visibleLimit: number,
  recentSiteIds: readonly string[] = [],
): CivilizationDeploymentSite[] {
  const selected: CivilizationDeploymentSite[] = [];
  const add = (site: CivilizationDeploymentSite | undefined) => {
    if (!site) return;
    if (selected.some((entry) => entry.id === site.id)) return;
    if (selected.length >= visibleLimit) return;
    selected.push(site);
  };

  const sorted = [...sites].sort((left, right) => (
    right.priority - left.priority ||
    getSiteKindLabel(left).localeCompare(getSiteKindLabel(right)) ||
    left.title.localeCompare(right.title)
  ));

  add(sorted.find((site) => site.kind === 'blueprint'));
  add(sorted.find((site) => site.kind === 'luminary'));

  for (const siteId of recentSiteIds) {
    add(sorted.find((site) => site.id === siteId));
  }

  if (selected.length === 0) {
    add(sorted.find((site) => site.kind === 'artifact' && (site.artifactTier ?? 0) >= 3));
    add(sorted.find(isSmallArtifactSite));
  }

  for (const site of sorted) add(site);
  return selected;
}

function selectArtifactSubstructureSites(
  sites: readonly CivilizationDeploymentSite[],
  visibleLimit: number,
  recentSiteIds: readonly string[] = [],
): CivilizationDeploymentSite[] {
  const artifacts = sites.filter((site) => site.kind === 'artifact');
  if (artifacts.length === 0) return [];

  const selected: CivilizationDeploymentSite[] = [];
  const representedTraits = new Set<CivilizationDeploymentSite['trait']>();
  const add = (site: CivilizationDeploymentSite | undefined) => {
    if (!site) return;
    if (selected.some((entry) => entry.id === site.id)) return;
    if (selected.length >= visibleLimit) return;
    selected.push(site);
    representedTraits.add(site.trait);
  };

  for (const siteId of recentSiteIds) {
    add(artifacts.find((site) => site.id === siteId));
  }

  const sorted = [...artifacts].sort((left, right) => (
    right.priority - left.priority ||
    (right.artifactTier ?? 0) - (left.artifactTier ?? 0) ||
    left.trait.localeCompare(right.trait) ||
    left.title.localeCompare(right.title)
  ));

  add(sorted.find((site) => Boolean(site.completedBlueprintId)));
  add(sorted.find(isSmallArtifactSite));
  add(sorted.find((site) => (site.artifactTier ?? 0) >= 3));

  for (const site of sorted) {
    if (!representedTraits.has(site.trait)) add(site);
  }
  for (const site of sorted) add(site);

  return selected;
}

function selectIntegratedConsequenceSites(
  sites: readonly CivilizationDeploymentSite[],
  scene: MarketSceneKind,
  visibleLimit: number,
  recentSiteIds: readonly string[] = [],
): CivilizationDeploymentSite[] {
  const availableSites = sites.filter((site) => isSiteAvailableInScene(site, scene));
  if (availableSites.length === 0) return [];

  const selected: CivilizationDeploymentSite[] = [];
  const add = (site: CivilizationDeploymentSite | undefined) => {
    if (!site) return;
    if (selected.some((entry) => entry.id === site.id)) return;
    if (selected.length >= visibleLimit) return;
    selected.push(site);
  };

  for (const siteId of recentSiteIds) add(availableSites.find((site) => site.id === siteId));

  const sorted = [...availableSites].sort((left, right) => (
    right.priority - left.priority ||
    getSiteKindLabel(left).localeCompare(getSiteKindLabel(right)) ||
    left.title.localeCompare(right.title)
  ));

  add(sorted.find((site) => site.kind === 'blueprint'));
  add(sorted.find((site) => site.kind === 'protocol'));
  add(sorted.find((site) => site.kind === 'chronicle'));
  add(sorted.find((site) => site.kind === 'artifact' && Boolean(site.artifactSceneTreatment)));
  add(sorted.find((site) => site.kind === 'luminary'));

  for (const site of sorted) add(site);
  return selected;
}

interface CivilizationSceneSignals {
  living: boolean;
  foundry: boolean;
  hazard: boolean;
  luminary: boolean;
  route: boolean;
  redaction: boolean;
}

interface CivilizationSceneIdentity {
  primaryAffinity: CivilizationDeploymentSite['affinity'] | null;
  secondaryAffinity: CivilizationDeploymentSite['affinity'] | null;
  routeScore: number;
  fieldScore: number;
  districtScore: number;
  blueprintCount: number;
  luminaryCount: number;
}

function getProfileTraitWeight(
  profile: CivilizationProfile,
  traits: ReadonlyArray<CivilizationDeploymentSite['trait']>,
): number {
  return traits.reduce((total, trait) => total + (profile.traitWeights[trait] ?? 0), 0);
}

function getCivilizationSceneArchetype(
  profile: CivilizationProfile,
  identity: CivilizationSceneIdentity,
  signals: CivilizationSceneSignals,
): CivilizationArchetypeId | null {
  const accordWeight = getProfileTraitWeight(profile, ['accord']);
  const archiveWeight = getProfileTraitWeight(profile, ['archive']);
  const livingWeight = getProfileTraitWeight(profile, ['biosphere', 'replication', 'lattice']);
  const routeWeight = getProfileTraitWeight(profile, ['transit', 'chronology', 'aperture']);
  const foundryWeight = getProfileTraitWeight(profile, ['ignition', 'entropy']);
  const softerIdentityAllowed = !signals.hazard && !signals.redaction;
  if (
    softerIdentityAllowed &&
    accordWeight > 0 &&
    accordWeight >= livingWeight &&
    accordWeight >= routeWeight &&
    accordWeight >= foundryWeight
  ) return 'accord_beacon';
  if (
    softerIdentityAllowed &&
    archiveWeight > 0 &&
    archiveWeight >= livingWeight &&
    archiveWeight >= routeWeight &&
    archiveWeight >= foundryWeight
  ) return 'archive_lattice';

  const routeDominant = signals.route &&
    identity.routeScore > 0 &&
    identity.routeScore > identity.fieldScore &&
    identity.routeScore > identity.districtScore;
  if (
    !signals.hazard &&
    !signals.redaction &&
    !signals.living &&
    !(signals.foundry && identity.districtScore > 0) &&
    routeDominant
  ) return 'route_network';

  return deriveCivilizationArchetype(profile, {
    living: signals.living,
    foundry: signals.foundry,
    hazard: signals.hazard,
    luminary: signals.luminary,
    route: signals.route,
    redaction: signals.redaction,
    blueprintCount: identity.blueprintCount,
  });
}

function buildSceneSignals(sites: readonly CivilizationDeploymentSite[]): CivilizationSceneSignals {
  return {
    living: sites.some((site) => (
      site.affinity === 'verdance' ||
      (
        (site.trait === 'biosphere' || site.trait === 'replication' || site.trait === 'lattice') &&
        /biosphere|ecology|living|recovery|habitat/i.test(`${site.title} ${site.laneLabel} ${site.visibleAs}`)
      )
    )),
    foundry: sites.some((site) => (
      (site.affinity === 'flare' && (site.trait === 'ignition' || site.trait === 'entropy' || site.kind === 'luminary')) ||
      site.blueprintId === 'bp_mantle_to_orbit_foundry' ||
      /forge|foundry|industry|thermal|ignition/i.test(`${site.title} ${site.laneLabel} ${site.visibleAs}`)
    )),
    hazard: sites.some((site) => (
      site.kind === 'protocol' ||
      site.affinity === 'abyss' ||
      site.blueprintId === 'bp_antimatter_detonator' ||
      /containment|quarantine|catastrophe|redacted|exclusion/i.test(`${site.title} ${site.laneLabel} ${site.visibleAs}`)
    )),
    luminary: sites.some((site) => site.kind === 'luminary'),
    route: sites.some((site) => (
      (site.affinity === 'continuum' && (isRouteTrait(site) || site.kind === 'luminary')) ||
      /transit|route|corridor|lane|orbit|aperture|threshold/i.test(`${site.title} ${site.laneLabel} ${site.visibleAs}`)
    )),
    redaction: sites.some((site) => site.kind === 'protocol' || /sealed|redacted/i.test(`${site.title} ${site.laneLabel}`)),
  };
}

function buildSceneIdentity(sites: readonly CivilizationDeploymentSite[]): CivilizationSceneIdentity {
  const affinityScores = new Map<CivilizationDeploymentSite['affinity'], number>();
  let routeScore = 0;
  let fieldScore = 0;
  let districtScore = 0;
  let blueprintCount = 0;
  let luminaryCount = 0;

  sites.forEach((site) => {
    const kindWeight = site.kind === 'blueprint'
      ? 5
      : site.kind === 'luminary'
        ? 4
        : site.kind === 'protocol'
          ? 3
          : site.kind === 'chronicle'
            ? 3
            : site.artifactTier ?? 1;
    affinityScores.set(site.affinity, (affinityScores.get(site.affinity) ?? 0) + kindWeight);
    if (isRouteTrait(site)) routeScore += kindWeight;
    if (isFieldTrait(site)) fieldScore += kindWeight;
    if (isDistrictTrait(site)) districtScore += kindWeight;
    if (site.kind === 'blueprint') blueprintCount += 1;
    if (site.kind === 'luminary') luminaryCount += 1;
  });

  const sortedAffinities = [...affinityScores.entries()].sort((left, right) => (
    right[1] - left[1] || left[0].localeCompare(right[0])
  ));

  return {
    primaryAffinity: sortedAffinities[0]?.[0] ?? null,
    secondaryAffinity: sortedAffinities[1]?.[0] ?? null,
    routeScore,
    fieldScore,
    districtScore,
    blueprintCount,
    luminaryCount,
  };
}

function getInfluenceSubtitle(site: CivilizationDeploymentSite): string {
  if (site.kind === 'artifact' && site.artifactSceneTreatment) {
    return getArtifactTreatmentLabel(site.artifactSceneTreatment);
  }
  if (site.consequenceLabel) return site.consequenceLabel;
  if (site.kind === 'luminary') return 'aurora pressure';
  if (site.kind === 'protocol') return 'sealed consequence';
  if (site.kind === 'chronicle') return 'recovered memory';
  if (site.kind === 'blueprint') {
    if (site.blueprintId === 'bp_antimatter_detonator') return 'containment scar';
    if (site.blueprintId === 'bp_mantle_to_orbit_foundry') return 'launch arteries';
    return 'blueprint consequence';
  }
  if (site.affinity === 'verdance') return 'living infrastructure';
  if (site.affinity === 'flare') return 'thermal signature';
  if (site.affinity === 'continuum') return 'route geometry';
  if (site.affinity === 'radiance') return 'signal lattice';
  if (site.affinity === 'abyss') return 'pressure shadow';
  return site.laneLabel;
}

function isRouteTrait(site: CivilizationDeploymentSite): boolean {
  return site.trait === 'transit' || site.trait === 'aperture' || site.trait === 'chronology';
}

function isDistrictTrait(site: CivilizationDeploymentSite): boolean {
  return site.trait === 'ignition' || site.trait === 'replication' || site.trait === 'archive' || site.trait === 'lattice';
}

function isFieldTrait(site: CivilizationDeploymentSite): boolean {
  return site.trait === 'containment' || site.trait === 'veil' || site.trait === 'accord' || site.trait === 'entropy';
}

function getTraitDialectTone(trait: CivilizationDeploymentSite['trait']): string {
  if (trait === 'ignition' || trait === 'entropy') return AFFINITY_META.flare.hex;
  if (trait === 'biosphere' || trait === 'replication') return AFFINITY_META.verdance.hex;
  if (trait === 'chronology' || trait === 'transit' || trait === 'aperture') return AFFINITY_META.continuum.hex;
  if (trait === 'archive' || trait === 'lattice' || trait === 'accord') return AFFINITY_META.radiance.hex;
  return AFFINITY_META.abyss.hex;
}

function getDossierScaleReading(site: CivilizationDeploymentSite): string {
  if (site.kind === 'artifact') {
    const depictionScale = site.depictionScale ? getDepictionScaleLabel(site.depictionScale) : null;
    if (site.scalePolicyCopy) {
      return `${site.scalePolicyCopy} Current readout: ${site.visibleAs}.`;
    }
    if (site.representationMode === 'local_trace') {
      const form = site.artifactForm ?? 'artifact';
      return depictionScale
        ? `The card art depicts a ${depictionScale} ${form}. The civilization-scale reading is the work it enables: ${site.visibleAs}.`
        : `The ${form} remains local. The civilization-scale reading is the work it enables: ${site.visibleAs}.`;
    }
    return depictionScale
      ? `The card art is ${depictionScale}; its main depiction belongs at that zoom level, while higher views show its consequence: ${site.visibleAs}.`
      : `This ${site.artifactForm ?? 'artifact'} has enough reach to register as infrastructure: ${site.visibleAs}.`;
  }
  if (site.kind === 'blueprint') {
    return `The Blueprint is read as a civilization condition, not a card object: ${site.visibleAs}.`;
  }
  if (site.kind === 'luminary') {
    return `The allied Luminary is represented through pressure and behavior changes across the civilization: ${site.visibleAs}.`;
  }
  if (site.kind === 'chronicle') {
    return `The Chronicle is represented as restored story context, civic memory, and archival signal: ${site.visibleAs}.`;
  }
  return `The record identity remains sealed; only the public consequence pattern is visible: ${site.visibleAs}.`;
}

function getDossierRegistrationTitle(site: CivilizationDeploymentSite): string {
  if (site.kind === 'artifact') {
    return site.representationMode === 'local_trace'
      ? 'Local trace integrated'
      : 'Infrastructure awakened';
  }
  if (site.kind === 'blueprint') return 'Blueprint consequence online';
  if (site.kind === 'luminary') return 'Luminary pressure detected';
  if (site.kind === 'chronicle') return 'Chronicle thread restored';
  return 'Sealed protocol active';
}

function getDossierRegistrationBody(site: CivilizationDeploymentSite, nativeScene: MarketSceneKind): string {
  if (site.kind === 'artifact') {
    if (site.representationMode === 'local_trace') {
      return `The artifact stays at ${SCENE_UI[nativeScene].zoomLabel.toLowerCase()} scale; the civilization view shows the work it is doing.`;
    }
    return `The artifact is large enough to become part of the ${SCENE_UI[nativeScene].zoomLabel.toLowerCase()} layer.`;
  }
  if (site.kind === 'blueprint') {
    return 'Blueprints are shown as lasting environmental consequences, not as extra card widgets.';
  }
  if (site.kind === 'luminary') {
    return 'Luminaries alter the scene as atmospheric pressure, allegiance, and affinity behavior.';
  }
  if (site.kind === 'chronicle') {
    return 'Chronicles alter the scene as memory, narrative context, and recovered civilization records.';
  }
  return 'The identity remains hidden, but the public consequence pattern can still be scanned.';
}

function getDossierSourceLabel(site: CivilizationDeploymentSite, primaryRelatedCard: ArtifactCard | null): string {
  if (site.kind === 'artifact') return primaryRelatedCard?.name ?? site.title.replace(/\s+Trace(?:\s+\d+)?$/i, '');
  if (site.kind === 'blueprint') return site.blueprintRole ?? site.blueprintFamilies ?? 'Recovered Blueprint';
  if (site.kind === 'luminary') return site.title;
  if (site.kind === 'chronicle') return site.title;
  return 'Anonymous sealed record';
}

function getDossierReadoutLabel(site: CivilizationDeploymentSite): string {
  if (site.kind === 'artifact') {
    if (site.representationMode === 'local_trace') return 'Pin plus consequence layer';
    if (site.scalePresence === 'deployment_site') return 'Deployment site';
    if (
      site.scalePresence === 'visible_structure' ||
      site.scalePresence === 'planetary_infrastructure' ||
      site.scalePresence === 'stellar_megastructure' ||
      site.scalePresence === 'galactic_network'
    ) {
      return 'Structure layer';
    }
    return 'Environmental consequence';
  }
  if (site.kind === 'blueprint') return 'Civilization condition';
  if (site.kind === 'luminary') return 'Affinity field';
  if (site.kind === 'chronicle') return 'Recovered memory';
  return 'Redacted signal';
}

function getDossierEvidenceLabel(site: CivilizationDeploymentSite): string {
  if (site.kind === 'blueprint') return 'Blueprint state';
  if (site.kind === 'luminary') return 'Alliance state';
  if (site.kind === 'protocol') return 'Scenario state';
  if (site.kind === 'chronicle') return 'Chronicle record';
  if (site.sourceQuality === 'authored') return 'Authored card lore';
  return 'Derived civilization trace';
}

function isCivilizationSiteOperational(site: CivilizationDeploymentSite | null | undefined): boolean {
  if (!site) return false;
  if (site.kind === 'artifact') {
    return site.implementationState === undefined || site.implementationState === 'operational';
  }
  if (site.kind === 'blueprint') {
    return site.projectState !== 'spent' && site.projectState !== 'recovering';
  }
  return true;
}

function getCivilizationSiteOperationalPresentation(site: CivilizationDeploymentSite): {
  label: string;
  detail: string;
  tone: string;
} {
  if (site.kind === 'blueprint' && site.projectState === 'recovering') {
    return {
      label: 'Recovering',
      detail: 'The Project remains part of civilization history, but its capability is suspended during recovery.',
      tone: '#f2bd67',
    };
  }
  if (site.kind === 'blueprint' && site.projectState === 'spent') {
    return {
      label: 'Spent',
      detail: 'The Project remains manifested, but it no longer provides an active response capability.',
      tone: '#8fa3b8',
    };
  }
  if (site.kind !== 'artifact' || site.implementationState === undefined || site.implementationState === 'operational') {
    return {
      label: 'Operational',
      detail: 'This implementation currently contributes its listed capabilities to civilization response.',
      tone: '#8ce7c2',
    };
  }
  if (site.implementationState === 'damaged') {
    return {
      label: 'Damaged',
      detail: 'Historical mastery remains, but the damaged implementation cannot currently provide its capabilities.',
      tone: '#f2bd67',
    };
  }
  if (site.implementationState === 'archived') {
    return {
      label: 'Archived',
      detail: 'The implementation is preserved as history and no longer functions as active infrastructure.',
      tone: '#86acd6',
    };
  }
  if (site.implementationState === 'annihilated') {
    return {
      label: 'Annihilated',
      detail: 'The implementation is permanently lost. Discovery and historical mastery remain recorded.',
      tone: '#ef7777',
    };
  }
  return {
    label: 'Status unknown',
    detail: 'This legacy record proves mastery, but its final operational state was not recorded.',
    tone: '#aeb8c4',
  };
}

function CivilizationArtifactLifecycleScarLayer({
  sites,
  focusedSiteId,
}: {
  sites: readonly CivilizationDeploymentSite[];
  focusedSiteId: string | null;
}) {
  const scars = sites.filter((site) => site.kind === 'artifact' && !isCivilizationSiteOperational(site));
  if (scars.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-[12]" data-testid="civilization-artifact-lifecycle-scars">
      {scars.map((site) => {
        const presentation = getCivilizationSiteOperationalPresentation(site);
        const focused = site.id === focusedSiteId;
        const isAnnihilated = site.implementationState === 'annihilated';
        const isArchived = site.implementationState === 'archived';
        return (
          <span
            key={site.id}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            data-artifact-state={site.implementationState ?? 'unknown'}
            aria-hidden="true"
            style={{
              left: `${site.anchor.x}%`,
              top: `${site.anchor.y}%`,
              width: focused ? 54 : 38,
              height: focused ? 54 : 38,
              opacity: focused ? 0.92 : 0.62,
            }}
          >
            <span
              className="absolute inset-0 rounded-full border"
              style={{
                borderColor: `${presentation.tone}B8`,
                borderStyle: isArchived ? 'dashed' : 'solid',
                boxShadow: `0 0 ${focused ? 22 : 14}px ${presentation.tone}32, inset 0 0 12px ${presentation.tone}18`,
              }}
            />
            <span
              className="absolute left-1/2 top-1/2 h-px w-[72%] -translate-x-1/2 -translate-y-1/2 rotate-45"
              style={{ backgroundColor: `${presentation.tone}D8` }}
            />
            {(isAnnihilated || site.implementationState === 'damaged') && (
              <span
                className="absolute left-1/2 top-1/2 h-px w-[72%] -translate-x-1/2 -translate-y-1/2 -rotate-45"
                style={{ backgroundColor: `${presentation.tone}${isAnnihilated ? 'E8' : '94'}` }}
              />
            )}
            <span
              className="absolute inset-[35%] rounded-full"
              style={{ backgroundColor: presentation.tone, boxShadow: `0 0 9px ${presentation.tone}88` }}
            />
          </span>
        );
      })}
    </div>
  );
}

function ArtifactMotifGlyph({
  site,
  x,
  y,
  tone,
  scale = 1,
  rotation = 0,
  emphasis = 1,
}: {
  site: CivilizationDeploymentSite;
  x: number;
  y: number;
  tone: string;
  scale?: number;
  rotation?: number;
  emphasis?: number;
}) {
  const motif = site.artifactVisualMotif;
  if (!motif) return null;

  const stroke = `${tone}D4`;
  const soft = `${tone}62`;
  const fill = `${tone}1F`;
  const white = 'rgba(255,255,255,0.74)';
  const e = Math.max(0.7, emphasis);
  const treatment = site.artifactSceneTreatment;

  return (
    <g
      className="civ-artifact-motif"
      data-testid="civilization-artifact-motif"
      transform={`translate(${x} ${y}) rotate(${rotation}) scale(${scale * e})`}
      style={{ color: tone }}
    >
      {treatment === 'ashroot_recovery' && (
        <g data-testid="civilization-artifact-treatment-ashroot_recovery">
          <path d="M-4.8 3.7 C-2.1 1.4, -1 -0.9, -0.2 -4.4 C1.1 -1.8, 2.9 -0.8, 4.9 -1.6 C3.7 1.6, 1.7 3.5, -0.4 4.7 C-1.5 3.6, -2.9 3.3, -4.8 3.7 Z" fill={fill} stroke={stroke} strokeLinejoin="round" strokeWidth="0.42" />
          <path d="M-5.4 5 C-3.2 2.8, -1.7 1.1, 0.1 -0.8 M-2.2 2.6 C-1.7 0.9, -0.9 -0.2, 0.4 -1.5 M1.1 2.6 C2.3 1.4, 3.2 0, 3.9 -1.8" fill="none" stroke={white} strokeLinecap="round" strokeWidth="0.23" />
          <circle cx="-2.9" cy="3.2" r="0.48" fill="rgba(255,148,93,0.82)" />
          <circle cx="2.5" cy="-0.8" r="0.42" fill="rgba(229,255,238,0.82)" />
        </g>
      )}
      {treatment === 'mantlelift_driver' && (
        <g data-testid="civilization-artifact-treatment-mantlelift_driver">
          <path d="M-5.4 4.5 C-3.1 0.8, -1.2 -1.6, 0 -5 C1.4 -1.4, 3.3 1, 5.4 4.5" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="0.48" />
          <path d="M-3.1 4.2 C-1.6 1.8, -0.6 -0.1, 0 -2.6 C0.8 -0.1, 1.9 1.8, 3.3 4.2" fill="none" stroke={white} strokeLinecap="round" strokeWidth="0.24" />
          <path d="M-5.8 5.1 H5.8 M-2.2 -0.7 H2.2 M-1.1 -2.8 H1.1" stroke={soft} strokeLinecap="round" strokeWidth="0.28" />
          <circle cx="0" cy="-5" r="0.66" fill={white} />
        </g>
      )}
      {treatment === 'ignition_kernel' && (
        <g data-testid="civilization-artifact-treatment-ignition_kernel">
          <path d="M0 -5.2 L4.5 -1.6 L3.2 4 L0 5.2 L-3.2 4 L-4.5 -1.6 Z" fill={fill} stroke={stroke} strokeLinejoin="round" strokeWidth="0.42" />
          <path d="M0 -3.5 C1.6 -1.4, 1 0.9, 0 3.5 C-1.2 1.7, -1.4 -0.7, 0 -3.5 Z" fill="rgba(255,244,194,0.82)" />
          <path d="M-5.6 0 H-3.2 M3.2 0 H5.6 M0 -5.8 V-3.6 M0 3.8 V5.8" stroke={soft} strokeLinecap="round" strokeWidth="0.24" />
        </g>
      )}
      {treatment === 'magnetic_bottle' && (
        <g data-testid="civilization-artifact-treatment-magnetic_bottle">
          <ellipse cx="0" cy="0" rx="5.5" ry="3.6" fill={fill} stroke={stroke} strokeWidth="0.38" />
          <ellipse cx="0" cy="0" rx="3.2" ry="5.2" fill="none" stroke={soft} strokeWidth="0.28" />
          <rect x="-1.8" y="-3" width="3.6" height="6" rx="0.8" fill="rgba(0,0,0,0.24)" stroke={white} strokeWidth="0.2" />
          <path d="M-5.7 0 H-2.3 M2.3 0 H5.7 M-3.8 -2.5 C-1 -4.2, 1 -4.2, 3.8 -2.5 M-3.8 2.5 C-1 4.2, 1 4.2, 3.8 2.5" stroke={white} strokeLinecap="round" strokeWidth="0.22" fill="none" />
        </g>
      )}
      {treatment === 'horizon_extractor' && (
        <g data-testid="civilization-artifact-treatment-horizon_extractor">
          <path d="M-5.8 1.3 C-2.2 -2.4, 2.2 -2.4, 5.8 1.3" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="0.46" />
          <path d="M-4.4 3.2 C-1.6 0.6, 1.6 0.6, 4.4 3.2" fill="none" stroke={soft} strokeLinecap="round" strokeWidth="0.3" />
          <circle cx="0" cy="1.3" r="2.2" fill="rgba(0,0,0,0.54)" stroke="rgba(255,255,255,0.28)" strokeWidth="0.22" />
          <path d="M-1.3 1.3 H1.3 M0 -4.7 V-1.2 M-3.7 -3.1 L-1.5 -0.9 M3.7 -3.1 L1.5 -0.9" stroke={white} strokeLinecap="round" strokeWidth="0.22" />
        </g>
      )}
      {treatment === 'entropy_baffle' && (
        <g data-testid="civilization-artifact-treatment-entropy_baffle">
          <path d="M-5.2 4.4 L-3.6 -4.2 H3.6 L5.2 4.4 Z" fill={fill} stroke={stroke} strokeLinejoin="round" strokeWidth="0.42" />
          <path d="M-3.4 -2.2 H3.4 M-4 0 H4 M-4.6 2.2 H4.6" stroke={white} strokeLinecap="round" strokeWidth="0.22" />
          <path d="M-5.6 5.2 C-3.1 3.8, -1.4 5.9, 0 4.8 S3.6 4, 5.7 5.2" fill="none" stroke="rgba(255,148,93,0.72)" strokeLinecap="round" strokeWidth="0.28" />
        </g>
      )}
      {!treatment && motif === 'seed' && (
        <>
          <path d="M0 -4.4 C3.3 -1.2, 2.3 3.4, 0 5 C-2.3 3.4, -3.3 -1.2, 0 -4.4 Z" fill={fill} stroke={stroke} strokeWidth="0.42" />
          <path d="M0 -2.8 C-0.5 -0.7, -0.3 1.5, 0.2 3.4 M0.1 -0.7 C1.8 -1.8, 3 -1.3, 3.8 0.1 M-0.1 0.4 C-1.7 -0.7, -2.8 -0.1, -3.5 1.2" fill="none" stroke={white} strokeLinecap="round" strokeWidth="0.24" />
        </>
      )}
      {!treatment && motif === 'coil' && (
        <>
          <path d="M-4.9 1.2 C-2.8 -3, 2.8 -3, 4.9 1.2 M-3.4 1.5 C-1.8 -1.1, 1.8 -1.1, 3.4 1.5 M-1.7 1.7 C-0.8 0.3, 0.8 0.3, 1.7 1.7" fill="none" stroke={stroke} strokeLinecap="round" strokeWidth="0.48" />
          <path d="M-5.6 3.2 H5.6" stroke={soft} strokeLinecap="round" strokeWidth="0.32" />
          <circle cx="0" cy="1.6" r="0.72" fill={white} />
        </>
      )}
      {!treatment && motif === 'prism' && (
        <>
          <path d="M0 -5.2 L4.7 -0.4 L1.8 4.9 L-3.7 2.6 L-4.4 -2.3 Z" fill={fill} stroke={stroke} strokeLinejoin="round" strokeWidth="0.42" />
          <path d="M0 -5.2 L0.2 1.1 L1.8 4.9 M-4.4 -2.3 L0.2 1.1 L4.7 -0.4" fill="none" stroke={white} strokeLinejoin="round" strokeWidth="0.22" />
        </>
      )}
      {!treatment && motif === 'vessel' && (
        <>
          <path d="M-3.8 -2.9 C-2.5 -4.6, 2.5 -4.6, 3.8 -2.9 V2.6 C2.4 4.6, -2.4 4.6, -3.8 2.6 Z" fill={fill} stroke={stroke} strokeWidth="0.42" />
          <path d="M-2.4 -2.3 H2.4 M-2.8 1.3 C-1.2 0.4, 1.3 0.4, 2.8 1.3" fill="none" stroke={white} strokeLinecap="round" strokeWidth="0.24" />
        </>
      )}
      {!treatment && motif === 'archive' && (
        <>
          <rect x="-4.3" y="-4.4" width="8.6" height="8.8" rx="0.6" fill={fill} stroke={stroke} strokeWidth="0.42" />
          <path d="M-2.5 -2.5 H2.6 M-2.5 -0.7 H1.8 M-2.5 1.1 H2.5 M-2.5 2.8 H0.8" stroke={white} strokeLinecap="round" strokeWidth="0.24" />
        </>
      )}
      {!treatment && motif === 'lattice' && (
        <>
          <path d="M0 -5 L4.4 -2.4 V2.5 L0 5 L-4.4 2.5 V-2.4 Z" fill={fill} stroke={stroke} strokeWidth="0.42" />
          <path d="M0 -5 V5 M-4.4 -2.4 L4.4 2.5 M4.4 -2.4 L-4.4 2.5" stroke={white} strokeLinecap="round" strokeWidth="0.2" />
        </>
      )}
      {!treatment && motif === 'forge' && (
        <>
          <path d="M0 -5.1 L3.7 -0.4 L1.6 4.5 H-1.6 L-3.7 -0.4 Z" fill={fill} stroke={stroke} strokeLinejoin="round" strokeWidth="0.42" />
          <path d="M0 -3.3 C1.5 -1.4, 0.8 0.7, 0 2.7 C-1 1.1, -1.1 -0.6, 0 -3.3 Z" fill={white} opacity="0.78" />
          <path d="M-4.6 4 H4.6" stroke={soft} strokeLinecap="round" strokeWidth="0.32" />
        </>
      )}
      {!treatment && motif === 'organ' && (
        <>
          <path d="M-0.8 -4.7 C3.8 -3.1, 4.4 2.6, 0.7 4.8 C-3.1 5.5, -5.2 0.9, -3.7 -2.2 C-2.9 -4, -2 -4.8, -0.8 -4.7 Z" fill={fill} stroke={stroke} strokeWidth="0.42" />
          <path d="M-2.7 -1.5 C-0.9 -2.1, 1.8 -1.3, 3 0.6 M-2.3 1.2 C-0.6 0.8, 1.3 1.5, 2 3" fill="none" stroke={white} strokeLinecap="round" strokeWidth="0.24" />
        </>
      )}
      {!treatment && motif === 'seal' && (
        <>
          <circle cx="0" cy="0" r="4.7" fill={fill} stroke={stroke} strokeWidth="0.38" />
          <circle cx="0" cy="0" r="2.4" fill="none" stroke={white} strokeWidth="0.22" />
          <path d="M0 -5.6 V5.6 M-5.6 0 H5.6" stroke={soft} strokeLinecap="round" strokeWidth="0.24" />
        </>
      )}
      {!treatment && motif === 'aperture' && (
        <>
          <ellipse cx="0" cy="0" rx="5.3" ry="3.2" fill={fill} stroke={stroke} strokeWidth="0.4" />
          <path d="M-3.7 -1.8 L-0.7 0 L-3.7 1.8 M3.7 -1.8 L0.7 0 L3.7 1.8" fill="none" stroke={white} strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.24" />
          <circle cx="0" cy="0" r="0.72" fill={white} />
        </>
      )}
      {!treatment && motif === 'relay' && (
        <>
          <path d="M-4.7 3.5 L0 -4.6 L4.7 3.5" fill="none" stroke={stroke} strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.46" />
          <path d="M-2.6 0.5 C-1 -0.9, 1 -0.9, 2.6 0.5 M-3.9 -1.7 C-1.4 -3.7, 1.4 -3.7, 3.9 -1.7" fill="none" stroke={white} strokeLinecap="round" strokeWidth="0.22" />
          <circle cx="0" cy="-4.6" r="0.72" fill={white} />
        </>
      )}
      {!treatment && motif === 'containment' && (
        <>
          <ellipse cx="0" cy="0" rx="5.5" ry="3.6" fill={fill} stroke={stroke} strokeDasharray="1.2 0.9" strokeWidth="0.38" />
          <rect x="-2.4" y="-2.2" width="4.8" height="4.4" rx="0.7" fill="rgba(0,0,0,0.18)" stroke={white} strokeWidth="0.22" />
          <path d="M-5.5 0 H-2.5 M2.5 0 H5.5" stroke={soft} strokeLinecap="round" strokeWidth="0.24" />
        </>
      )}
      {!treatment && motif === 'generic' && (
        <>
          <rect x="-4.2" y="-3.4" width="8.4" height="6.8" rx="0.8" fill={fill} stroke={stroke} strokeWidth="0.38" />
          <circle cx="0" cy="0" r="0.86" fill={white} />
          <path d="M-3.2 2.3 C-1.1 0.8, 1.1 0.8, 3.2 2.3" fill="none" stroke={soft} strokeLinecap="round" strokeWidth="0.24" />
        </>
      )}
    </g>
  );
}

function ArtifactTreatmentDeploymentMark({
  site,
  index,
  scene,
  recent,
  scanActive,
  centerGlyph,
}: {
  site: CivilizationDeploymentSite;
  index: number;
  scene: MarketSceneKind;
  recent: boolean;
  scanActive: boolean;
  centerGlyph: React.ReactNode;
}) {
  const treatment = site.artifactSceneTreatment;
  if (!treatment) return null;

  const tone = getCivilizationSiteTone(site);
  const x = site.anchor.x;
  const y = site.anchor.y;
  const sceneScale = scene === 'surface' ? 1.18 : scene === 'orbit' ? 0.92 : scene === 'stellar' ? 0.76 : 0.64;
  const spread = (recent ? 20 : 16) * sceneScale;
  const height = (recent ? 13 : 10) * sceneScale;
  const rotation = ((index % 5) - 2) * 7;
  const opacity = recent ? 0.62 : scanActive ? 0.46 : 0.36;
  const stroke = `${tone}${recent ? 'CC' : '96'}`;
  const soft = `${tone}${recent ? '30' : '1B'}`;
  const white = 'rgba(255,255,255,0.38)';
  const label = getArtifactTreatmentLabel(treatment);
  const localSurfaceSite = scene === 'surface' && (
    site.scalePresence === 'artifact_pin' ||
    site.scalePresence === 'deployment_site' ||
    site.representationMode === 'local_trace' ||
    (site.depictionScale ? isLocalArtifactDepictionScale(site.depictionScale) : false)
  );

  if (treatment === 'ashroot_recovery') {
    return (
      <g
        className="civ-artifact-deployment"
        data-testid="civilization-artifact-treatment-deployment-ashroot_recovery"
        data-treatment-label={label}
        opacity={opacity}
        style={{ color: tone }}
      >
        <path
          d={`M${Math.max(0, x - spread)} ${y + height * 0.68} C${x - spread * 0.62} ${y - height * 0.82}, ${x - spread * 0.12} ${y - height * 0.62}, ${x} ${y - height * 0.08} C${x + spread * 0.18} ${y - height * 0.98}, ${x + spread * 0.72} ${y - height * 0.5}, ${Math.min(100, x + spread)} ${y + height * 0.44}`}
          fill={`${tone}16`}
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth={0.72 * sceneScale}
        />
        <path
          className="civ-artifact-deployment-flow"
          d={`M${Math.max(1, x - spread * 0.78)} ${y + height * 0.94} C${x - spread * 0.32} ${y + height * 0.1}, ${x + spread * 0.3} ${y + height * 0.06}, ${Math.min(99, x + spread * 0.86)} ${y + height * 0.82}`}
          fill="none"
          stroke="rgba(229,255,238,0.34)"
          strokeLinecap="round"
          strokeWidth={0.3 * sceneScale}
        />
        {[-0.54, -0.22, 0.18, 0.5].map((step, nodeIndex) => (
          <circle
            key={step}
            cx={x + spread * step}
            cy={y + height * (nodeIndex % 2 === 0 ? 0.32 : -0.04)}
            r={(nodeIndex === 2 ? 0.9 : 0.62) * sceneScale}
            fill={nodeIndex === 2 ? 'rgba(229,255,238,0.84)' : `${tone}B8`}
          />
        ))}
        {centerGlyph}
      </g>
    );
  }

  if (treatment === 'mantlelift_driver') {
    const baseY = Math.min(96, y + height * 1.5);
    const headY = Math.max(4, y - height * 1.45);
    const liftX = x - spread * 0.18;
    const freightD = `M${Math.max(1, x - spread)} ${y + height * 0.56} C${x - spread * 0.34} ${y - height * 0.72}, ${x + spread * 0.32} ${y + height * 0.82}, ${Math.min(99, x + spread)} ${y - height * 0.45}`;
    if (localSurfaceSite) {
      const localBaseY = Math.min(88, y + 4.6);
      const localHeadY = Math.max(45, y - 5.8);
      const localLiftX = x - 0.8;
      const localOpacity = recent ? 0.5 : scanActive ? 0.34 : 0.28;
      const localStroke = `${tone}${recent ? '98' : scanActive ? '6E' : '54'}`;
      return (
        <g
          className="civ-artifact-deployment civ-artifact-deployment-local-site"
          data-testid="civilization-artifact-treatment-deployment-mantlelift_driver"
          data-treatment-label={label}
          data-native-work-scale="local-site"
          opacity={localOpacity}
          style={{ color: tone }}
        >
          <path
            d={`M${localLiftX} ${localBaseY} C${localLiftX + 0.9} ${y + 2.5}, ${localLiftX - 0.8} ${y - 3.4}, ${localLiftX + 0.7} ${localHeadY}`}
            fill="none"
            stroke={`${tone}1F`}
            strokeLinecap="round"
            strokeWidth="1.55"
          />
          <path
            className="civ-artifact-deployment-flow"
            d={`M${localLiftX} ${localBaseY} C${localLiftX + 0.9} ${y + 2.5}, ${localLiftX - 0.8} ${y - 3.4}, ${localLiftX + 0.7} ${localHeadY}`}
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeLinecap="round"
            strokeWidth="0.16"
          />
          <path
            d={`M${x - 5.2} ${localBaseY + 0.5} L${x - 1.1} ${localBaseY - 1.9} L${x + 5.6} ${localBaseY + 0.6} L${x + 2.7} ${localBaseY + 2.3} L${x - 5.9} ${localBaseY + 1.8} Z`}
            fill={soft}
            stroke={localStroke}
            strokeLinejoin="round"
            strokeWidth="0.22"
          />
          <path
            d={`M${x - 8.8} ${y + 3.4} C${x - 3.8} ${y - 1.3}, ${x + 3.2} ${y + 3.8}, ${x + 9.4} ${y - 1.6}`}
            fill="none"
            stroke={`${tone}58`}
            strokeLinecap="round"
            strokeWidth="0.25"
          />
          <path
            d={`M${x - 5.6} ${y + 2.2} C${x - 2.4} ${y - 0.5}, ${x + 2.8} ${y + 2.2}, ${x + 6.3} ${y - 0.8}`}
            fill="none"
            stroke="rgba(255,255,255,0.17)"
            strokeLinecap="round"
            strokeWidth="0.14"
          />
          <circle cx={localLiftX + 0.7} cy={localHeadY} r="0.5" fill="rgba(255,244,194,0.68)" />
          <circle cx={x + 5.8} cy={y - 1.1} r="0.38" fill={`${tone}96`} />
          <ArtifactMotifGlyph site={site} x={x} y={y + 0.4} tone={tone} scale={0.42} rotation={rotation} emphasis={recent ? 1 : 0.9} />
        </g>
      );
    }
    return (
      <g
        className="civ-artifact-deployment"
        data-testid="civilization-artifact-treatment-deployment-mantlelift_driver"
        data-treatment-label={label}
        opacity={opacity}
        style={{ color: tone }}
      >
        <path
          d={`M${liftX} ${baseY} C${liftX + 1.6 * sceneScale} ${y + height * 0.4}, ${liftX - 1.6 * sceneScale} ${y - height * 0.3}, ${liftX + 1.2 * sceneScale} ${headY}`}
          fill="none"
          stroke={`${tone}22`}
          strokeLinecap="round"
          strokeWidth={4.8 * sceneScale}
        />
        <path
          className="civ-artifact-deployment-flow"
          d={`M${liftX} ${baseY} C${liftX + 1.6 * sceneScale} ${y + height * 0.4}, ${liftX - 1.6 * sceneScale} ${y - height * 0.3}, ${liftX + 1.2 * sceneScale} ${headY}`}
          fill="none"
          stroke={white}
          strokeLinecap="round"
          strokeWidth={0.42 * sceneScale}
        />
        <path
          d={freightD}
          fill="none"
          stroke={`${tone}54`}
          strokeLinecap="round"
          strokeWidth={0.64 * sceneScale}
        />
        <path
          d={`M${liftX - spread * 0.42} ${baseY + height * 0.08} L${liftX - spread * 0.08} ${baseY - height * 0.38} L${liftX + spread * 0.38} ${baseY + height * 0.04} L${liftX + spread * 0.18} ${baseY + height * 0.24} Z`}
          fill={soft}
          stroke={stroke}
          strokeLinejoin="round"
          strokeWidth={0.38 * sceneScale}
        />
        {[0.22, 0.46, 0.72, 0.9].map((step) => (
          <circle
            key={step}
            cx={Math.max(3, Math.min(97, x - spread + spread * 2 * step))}
            cy={y + height * 0.56 - Math.sin(step * Math.PI) * height * 1.1}
            r={(step > 0.85 ? 1 : 0.62) * sceneScale}
            fill={step > 0.85 ? 'rgba(255,244,194,0.82)' : `${tone}B8`}
          />
        ))}
        {centerGlyph}
      </g>
    );
  }

  if (treatment === 'ignition_kernel') {
    return (
      <g
        className="civ-artifact-deployment"
        data-testid="civilization-artifact-treatment-deployment-ignition_kernel"
        data-treatment-label={label}
        opacity={opacity}
        style={{ color: tone }}
      >
        <path
          d={`M${x} ${y - height} L${x + spread * 0.52} ${y - height * 0.22} L${x + spread * 0.42} ${y + height * 0.74} L${x} ${y + height} L${x - spread * 0.42} ${y + height * 0.74} L${x - spread * 0.52} ${y - height * 0.22} Z`}
          fill={`${tone}1B`}
          stroke={stroke}
          strokeLinejoin="round"
          strokeWidth={0.52 * sceneScale}
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <path
          d={`M${x - spread * 0.82} ${y + height * 0.76} C${x - spread * 0.24} ${y + height * 0.12}, ${x + spread * 0.25} ${y + height * 0.12}, ${x + spread * 0.84} ${y + height * 0.72}`}
          fill="none"
          stroke="rgba(255,244,194,0.4)"
          strokeLinecap="round"
          strokeWidth={0.34 * sceneScale}
        />
        <circle cx={x} cy={y} r={2.1 * sceneScale} fill="rgba(255,244,194,0.75)" />
        <circle cx={x} cy={y} r={0.72 * sceneScale} fill="#ffffff" />
        {centerGlyph}
      </g>
    );
  }

  if (treatment === 'magnetic_bottle') {
    return (
      <g
        className="civ-artifact-deployment"
        data-testid="civilization-artifact-treatment-deployment-magnetic_bottle"
        data-treatment-label={label}
        opacity={opacity}
        style={{ color: tone }}
      >
        <ellipse
          cx={x}
          cy={y}
          rx={spread * 0.8}
          ry={height * 0.56}
          fill={`${tone}16`}
          stroke={stroke}
          strokeWidth={0.56 * sceneScale}
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <ellipse
          cx={x}
          cy={y}
          rx={spread * 0.42}
          ry={height * 0.86}
          fill="rgba(0,0,0,0.18)"
          stroke={`${tone}70`}
          strokeWidth={0.34 * sceneScale}
          transform={`rotate(${-rotation} ${x} ${y})`}
        />
        <rect
          x={x - spread * 0.16}
          y={y - height * 0.52}
          width={spread * 0.32}
          height={height * 1.04}
          rx={1.1 * sceneScale}
          fill="rgba(0,0,0,0.28)"
          stroke={white}
          strokeWidth={0.22 * sceneScale}
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <path
          d={`M${Math.max(0, x - spread)} ${y} H${x - spread * 0.32} M${x + spread * 0.32} ${y} H${Math.min(100, x + spread)} M${x - spread * 0.62} ${y - height * 0.44} C${x - spread * 0.2} ${y - height * 0.9}, ${x + spread * 0.22} ${y - height * 0.9}, ${x + spread * 0.64} ${y - height * 0.44} M${x - spread * 0.62} ${y + height * 0.44} C${x - spread * 0.2} ${y + height * 0.9}, ${x + spread * 0.22} ${y + height * 0.9}, ${x + spread * 0.64} ${y + height * 0.44}`}
          fill="none"
          stroke={white}
          strokeLinecap="round"
          strokeWidth={0.24 * sceneScale}
        />
        {centerGlyph}
      </g>
    );
  }

  if (treatment === 'horizon_extractor') {
    return (
      <g
        className="civ-artifact-deployment"
        data-testid="civilization-artifact-treatment-deployment-horizon_extractor"
        data-treatment-label={label}
        opacity={opacity}
        style={{ color: tone }}
      >
        <path
          d={`M${x - spread * 0.9} ${y + height * 0.14} C${x - spread * 0.34} ${y - height * 0.94}, ${x + spread * 0.36} ${y - height * 0.94}, ${x + spread * 0.92} ${y + height * 0.14}`}
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth={0.66 * sceneScale}
        />
        <path
          d={`M${x - spread * 0.66} ${y + height * 0.52} C${x - spread * 0.2} ${y - height * 0.06}, ${x + spread * 0.22} ${y - height * 0.06}, ${x + spread * 0.68} ${y + height * 0.52}`}
          fill="none"
          stroke={`${tone}72`}
          strokeLinecap="round"
          strokeWidth={0.32 * sceneScale}
        />
        <circle cx={x} cy={y + height * 0.12} r={3.2 * sceneScale} fill="rgba(0,0,0,0.56)" stroke="rgba(255,255,255,0.28)" strokeWidth={0.24 * sceneScale} />
        <path
          d={`M${x} ${y - height * 1.18} V${y - height * 0.34} M${x - spread * 0.46} ${y - height * 0.78} L${x - spread * 0.14} ${y - height * 0.18} M${x + spread * 0.46} ${y - height * 0.78} L${x + spread * 0.14} ${y - height * 0.18}`}
          stroke={white}
          strokeLinecap="round"
          strokeWidth={0.22 * sceneScale}
        />
        {centerGlyph}
      </g>
    );
  }

  if (treatment === 'entropy_baffle') {
    const fins = [-0.56, -0.28, 0, 0.28, 0.56];
    return (
      <g
        className="civ-artifact-deployment"
        data-testid="civilization-artifact-treatment-deployment-entropy_baffle"
        data-treatment-label={label}
        opacity={opacity}
        style={{ color: tone }}
        transform={`rotate(${rotation} ${x} ${y})`}
      >
        <path
          d={`M${x - spread * 0.72} ${y + height * 0.62} L${x - spread * 0.48} ${y - height * 0.66} H${x + spread * 0.48} L${x + spread * 0.72} ${y + height * 0.62} Z`}
          fill={`${tone}17`}
          stroke={stroke}
          strokeLinejoin="round"
          strokeWidth={0.5 * sceneScale}
        />
        {fins.map((step, finIndex) => (
          <path
            key={step}
            d={`M${x + spread * step} ${y + height * 0.5} V${y - height * (0.42 + (finIndex % 2) * 0.16)}`}
            stroke={finIndex === 2 ? white : `${tone}98`}
            strokeLinecap="round"
            strokeWidth={(finIndex === 2 ? 0.38 : 0.28) * sceneScale}
          />
        ))}
        <path
          d={`M${x - spread * 0.84} ${y + height * 0.88} C${x - spread * 0.44} ${y + height * 0.46}, ${x - spread * 0.14} ${y + height}, ${x + spread * 0.08} ${y + height * 0.68} S${x + spread * 0.54} ${y + height * 0.4}, ${x + spread * 0.86} ${y + height * 0.86}`}
          fill="none"
          stroke="rgba(255,148,93,0.56)"
          strokeLinecap="round"
          strokeWidth={0.28 * sceneScale}
        />
        {centerGlyph}
      </g>
    );
  }

  return null;
}

function ArtifactMotifDeploymentMark({
  site,
  index,
  scene,
  recent,
  scanActive,
}: {
  site: CivilizationDeploymentSite;
  index: number;
  scene: MarketSceneKind;
  recent: boolean;
  scanActive: boolean;
}) {
  const motif = site.artifactVisualMotif;
  if (!motif) return null;

  const treatment = site.artifactSceneTreatment;
  const tone = getCivilizationSiteTone(site);
  const x = site.anchor.x;
  const y = site.anchor.y;
  const sceneScale = scene === 'surface' ? 1.18 : scene === 'orbit' ? 0.92 : scene === 'stellar' ? 0.76 : 0.64;
  const spread = (recent ? 19 : 15.5) * sceneScale;
  const height = (recent ? 12 : 9.5) * sceneScale;
  const rotation = ((index % 5) - 2) * 7;
  const opacity = recent ? 0.56 : scanActive ? 0.42 : 0.34;
  const stroke = `${tone}${recent ? 'B8' : '8A'}`;
  const soft = `${tone}${recent ? '32' : '1F'}`;
  const white = 'rgba(255,255,255,0.3)';

  const centerGlyph = (
    <ArtifactMotifGlyph
      site={site}
      x={x}
      y={y}
      tone={tone}
      scale={sceneScale * (recent ? 1.05 : 0.92)}
      rotation={rotation}
      emphasis={recent ? 1.08 : 1}
    />
  );

  if (treatment) {
    const treatmentMark = (
      <ArtifactTreatmentDeploymentMark
        site={site}
        index={index}
        scene={scene}
        recent={recent}
        scanActive={scanActive}
        centerGlyph={centerGlyph}
      />
    );
    if (treatmentMark) return treatmentMark;
  }

  if (motif === 'seed' || motif === 'organ') {
    return (
      <g
        className="civ-artifact-deployment"
        data-testid="civilization-artifact-deployment"
        opacity={opacity}
        style={{ color: tone }}
      >
        <path
          d={`M${Math.max(0, x - spread)} ${y + height * 0.72} C${x - spread * 0.55} ${y - height * 0.85}, ${x - spread * 0.1} ${y - height * 0.7}, ${x} ${y - height * 0.18} C${x + spread * 0.18} ${y - height * 1.05}, ${x + spread * 0.74} ${y - height * 0.68}, ${Math.min(100, x + spread)} ${y + height * 0.48}`}
          fill={`${tone}13`}
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth={0.72 * sceneScale}
        />
        <path
          d={`M${Math.max(0, x - spread * 0.84)} ${y + height * 0.96} C${x - spread * 0.38} ${y + height * 0.1}, ${x + spread * 0.34} ${y + height * 0.08}, ${Math.min(100, x + spread * 0.86)} ${y + height * 0.86}`}
          fill="none"
          stroke="rgba(229,255,238,0.26)"
          strokeLinecap="round"
          strokeWidth={0.28 * sceneScale}
        />
        <circle cx={x - spread * 0.36} cy={y + height * 0.34} r={0.86 * sceneScale} fill={`${tone}A8`} />
        <circle cx={x + spread * 0.44} cy={y + height * 0.2} r={0.68 * sceneScale} fill="rgba(229,255,238,0.74)" />
        {centerGlyph}
      </g>
    );
  }

  if (motif === 'coil' || motif === 'relay') {
    const railY = y + height * 0.52;
    return (
      <g
        className="civ-artifact-deployment"
        data-testid="civilization-artifact-deployment"
        opacity={opacity}
        style={{ color: tone }}
      >
        <path
          className="civ-artifact-deployment-flow"
          d={`M${Math.max(0, x - spread)} ${railY} C${x - spread * 0.36} ${y - height * 0.85}, ${x + spread * 0.3} ${y + height * 0.8}, ${Math.min(100, x + spread)} ${y - height * 0.5}`}
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth={1.05 * sceneScale}
        />
        <path
          d={`M${Math.max(0, x - spread * 0.74)} ${railY + height * 0.28} C${x - spread * 0.22} ${y - height * 0.25}, ${x + spread * 0.28} ${y + height * 0.48}, ${Math.min(100, x + spread * 0.78)} ${y - height * 0.12}`}
          fill="none"
          stroke={white}
          strokeLinecap="round"
          strokeWidth={0.32 * sceneScale}
        />
        <ellipse cx={x} cy={y} rx={spread * 0.38} ry={height * 0.26} fill={soft} stroke={`${tone}70`} strokeWidth={0.3 * sceneScale} transform={`rotate(${rotation} ${x} ${y})`} />
        {centerGlyph}
      </g>
    );
  }

  if (motif === 'vessel' || motif === 'containment') {
    return (
      <g
        className="civ-artifact-deployment"
        data-testid="civilization-artifact-deployment"
        opacity={opacity}
        style={{ color: tone }}
      >
        <ellipse
          cx={x}
          cy={y}
          rx={spread * 0.72}
          ry={height * 0.52}
          fill={`${tone}16`}
          stroke={stroke}
          strokeDasharray={!treatment && motif === 'containment' ? '3.4 2.1' : undefined}
          strokeWidth={0.58 * sceneScale}
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <rect
          x={x - spread * 0.22}
          y={y - height * 0.32}
          width={spread * 0.44}
          height={height * 0.64}
          rx={1.2 * sceneScale}
          fill="rgba(0,0,0,0.2)"
          stroke="rgba(255,255,255,0.28)"
          strokeWidth={0.24 * sceneScale}
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <path
          d={`M${Math.max(0, x - spread * 0.92)} ${y} H${x - spread * 0.3} M${x + spread * 0.3} ${y} H${Math.min(100, x + spread * 0.92)}`}
          stroke={`${tone}6C`}
          strokeLinecap="round"
          strokeWidth={0.36 * sceneScale}
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        {centerGlyph}
      </g>
    );
  }

  if (motif === 'archive' || motif === 'lattice' || motif === 'seal') {
    const columns = [-0.48, -0.24, 0, 0.24, 0.48];
    return (
      <g
        className="civ-artifact-deployment"
        data-testid="civilization-artifact-deployment"
        opacity={opacity}
        style={{ color: tone }}
        transform={`rotate(${rotation} ${x} ${y})`}
      >
        <path
          d={`M${x - spread * 0.82} ${y + height * 0.46} L${x - spread * 0.42} ${y - height * 0.34} L${x + spread * 0.54} ${y - height * 0.46} L${x + spread * 0.86} ${y + height * 0.42} Z`}
          fill={`${tone}13`}
          stroke={stroke}
          strokeLinejoin="round"
          strokeWidth={0.48 * sceneScale}
        />
        {columns.map((column, columnIndex) => (
          <path
            key={column}
            d={`M${x + spread * column} ${y + height * 0.36} V${y - height * (0.08 + (columnIndex % 3) * 0.16)}`}
            stroke={columnIndex === 2 ? 'rgba(255,255,255,0.42)' : `${tone}82`}
            strokeLinecap="round"
            strokeWidth={(columnIndex === 2 ? 0.34 : 0.25) * sceneScale}
          />
        ))}
        {centerGlyph}
      </g>
    );
  }

  if (motif === 'prism' || motif === 'aperture') {
    return (
      <g
        className="civ-artifact-deployment"
        data-testid="civilization-artifact-deployment"
        opacity={opacity}
        style={{ color: tone }}
      >
        <path
          d={`M${x} ${y - height * 0.98} L${x + spread * 0.56} ${y - height * 0.04} L${x + spread * 0.18} ${y + height * 0.9} L${x - spread * 0.62} ${y + height * 0.45} L${x - spread * 0.5} ${y - height * 0.45} Z`}
          fill={`${tone}12`}
          stroke={stroke}
          strokeLinejoin="round"
          strokeWidth={0.48 * sceneScale}
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <path
          d={`M${x - spread * 0.92} ${y} H${x - spread * 0.34} M${x + spread * 0.34} ${y} H${Math.min(100, x + spread * 0.92)} M${x} ${y - height * 0.92} V${y - height * 0.32} M${x} ${y + height * 0.32} V${y + height * 0.92}`}
          stroke={white}
          strokeLinecap="round"
          strokeWidth={0.28 * sceneScale}
        />
        {centerGlyph}
      </g>
    );
  }

  if (motif === 'forge') {
    return (
      <g
        className="civ-artifact-deployment"
        data-testid="civilization-artifact-deployment"
        opacity={opacity}
        style={{ color: tone }}
      >
        <path
          d={`M${x - spread * 0.82} ${y + height * 0.55} L${x - spread * 0.26} ${y - height * 0.46} L${x + spread * 0.26} ${y - height * 0.5} L${x + spread * 0.86} ${y + height * 0.48} Z`}
          fill={`${tone}14`}
          stroke={stroke}
          strokeLinejoin="round"
          strokeWidth={0.5 * sceneScale}
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <path
          d={`M${x - spread * 0.32} ${y + height * 0.36} C${x - spread * 0.14} ${y - height * 0.18}, ${x + spread * 0.05} ${y - height * 0.2}, ${x + spread * 0.24} ${y + height * 0.34}`}
          fill="none"
          stroke="rgba(255,244,194,0.36)"
          strokeLinecap="round"
          strokeWidth={0.36 * sceneScale}
        />
        {centerGlyph}
      </g>
    );
  }

  return (
    <g
      className="civ-artifact-deployment"
      data-testid="civilization-artifact-deployment"
      opacity={opacity}
      style={{ color: tone }}
    >
      <rect
        x={x - spread * 0.48}
        y={y - height * 0.36}
        width={spread * 0.96}
        height={height * 0.72}
        rx={1.4 * sceneScale}
        fill={`${tone}12`}
        stroke={stroke}
        strokeWidth={0.44 * sceneScale}
        transform={`rotate(${rotation} ${x} ${y})`}
      />
      {centerGlyph}
    </g>
  );
}

function CivilizationArtifactDeploymentLayer({
  sites,
  scene,
  scanActive,
  recentSiteIds,
  maxSites,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: MarketSceneKind;
  scanActive: boolean;
  recentSiteIds: readonly string[];
  maxSites: number;
}) {
  const nativeSites = React.useMemo(() => (
    selectArtifactSubstructureSites(
      sites.filter((site) => (
        shouldRenderArtifactAsNativeStructure(site, scene) &&
        Boolean(site.artifactVisualMotif)
      )),
      maxSites,
      recentSiteIds,
    )
  ), [sites, scene, maxSites, recentSiteIds]);

  if (nativeSites.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[9] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-artifact-deployments"
    >
      {nativeSites.map((site, index) => (
        <ArtifactMotifDeploymentMark
          key={site.id}
          site={site}
          index={index}
          scene={scene}
          recent={recentSiteIds.includes(site.id)}
          scanActive={scanActive}
        />
      ))}
    </svg>
  );
}

function MarketSceneStyles() {
  return (
    <style>
      {`
        @keyframes civMarketPulse {
          0%, 100% { opacity: 0.42; }
          50% { opacity: 0.98; }
        }

        @keyframes civMarketDrift {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }

        @keyframes civMarketBreathe {
          0%, 100% { transform: scaleX(0.96); opacity: 0.46; }
          50% { transform: scaleX(1.05); opacity: 0.84; }
        }

        @keyframes civMarketDash {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -96; }
        }

        @keyframes civScanAttention {
          0%, 100% { box-shadow: 0 0 0 rgba(130,221,255,0); }
          50% { box-shadow: 0 0 24px rgba(130,221,255,0.34); }
        }

        @keyframes civRecentTraceGlow {
          0%, 100% { opacity: 0.78; }
          50% { opacity: 1; }
        }

        @keyframes civTraceRecordedRing {
          0% { transform: scale(0.56); opacity: 0; }
          18% { opacity: 0.92; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        @keyframes civTraceRecordedLabel {
          0% { transform: translateY(8px); opacity: 0; }
          16%, 78% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-4px); opacity: 0; }
        }

        @keyframes civTraceRecordedVector {
          0% { opacity: 0; stroke-dashoffset: 38; }
          14%, 74% { opacity: 0.95; }
          100% { opacity: 0; stroke-dashoffset: 0; }
        }

        @keyframes civMiniatureTraceCard {
          0% { transform: translateY(-7px); opacity: 0; }
          15%, 84% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-3px); opacity: 0; }
        }

        @keyframes civMapPinBreathe {
          0%, 100% { transform: scale(0.94); opacity: 0.76; }
          50% { transform: scale(1.04); opacity: 1; }
        }

        @keyframes civMapRing {
          0% { transform: translateX(-50%) scale(0.62); opacity: 0.7; }
          100% { transform: translateX(-50%) scale(1.65); opacity: 0; }
        }

        @keyframes civPortraitSignal {
          0%, 100% { opacity: 0.52; }
          50% { opacity: 0.92; }
        }

        @keyframes civPortraitLoom {
          0%, 100% { transform: scale(0.992); opacity: 0.78; }
          50% { transform: scale(1.012); opacity: 1; }
        }

        @keyframes civPortraitSweep {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -120; }
        }

        @keyframes civPortraitHaze {
          0%, 100% { transform: translate3d(-1.2%, 0, 0); opacity: 0.34; }
          50% { transform: translate3d(1.2%, -0.8%, 0); opacity: 0.62; }
        }

        @keyframes civIdentityWeather {
          0%, 100% { transform: translate3d(-1%, 0, 0) scale(1); opacity: 0.42; }
          50% { transform: translate3d(1%, -1%, 0) scale(1.025); opacity: 0.72; }
        }

        @keyframes civProjectZonePulse {
          0%, 100% { opacity: 0.62; }
          50% { opacity: 0.9; }
        }

        @keyframes civArtifactSubstructure {
          0%, 100% { opacity: 0.62; transform: scale(0.994); }
          50% { opacity: 0.96; transform: scale(1.006); }
        }

        @keyframes civArtifactSubstructureFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -84; }
        }

        @keyframes civArtifactDeploymentSettle {
          0%, 100% { opacity: 0.72; transform: scale(0.996); }
          50% { opacity: 1; transform: scale(1.008); }
        }

        @keyframes civFocusedLocalSiteSettle {
          0%, 100% { opacity: 0.8; transform: translate3d(0, 0, 0) scale(0.998); }
          50% { opacity: 0.96; transform: translate3d(0, -0.12%, 0) scale(1.003); }
        }

        @keyframes civArtifactDeploymentFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -88; }
        }

        @keyframes civIntegratedConsequence {
          0%, 100% { opacity: 0.76; transform: scale(0.997); }
          50% { opacity: 1; transform: scale(1.007); }
        }

        @keyframes civEvolvedPlateFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -110; }
        }

        @keyframes civEvolvedPlateWeather {
          0%, 100% { opacity: 0.62; transform: translate3d(-0.6%, 0, 0); }
          50% { opacity: 0.95; transform: translate3d(0.8%, -0.4%, 0); }
        }

        @keyframes civArchetypeFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -120; }
        }

        @keyframes civArchetypeBreath {
          0%, 100% { opacity: 0.72; transform: scale(0.998); }
          50% { opacity: 1; transform: scale(1.006); }
        }

        @keyframes civPlateDialectFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -118; }
        }

        @keyframes civDialectField {
          0%, 100% { opacity: 0.52; transform: translate3d(-0.4%, 0, 0); }
          50% { opacity: 0.86; transform: translate3d(0.4%, -0.3%, 0); }
        }

        @keyframes civDialectFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -132; }
        }

        @keyframes civNativeWorkSettle {
          0%, 100% { opacity: 0.78; transform: translate3d(0, 0, 0) scale(1); }
          50% { opacity: 1; transform: translate3d(0, -0.35%, 0) scale(1.01); }
        }

        @keyframes civNativeWorkFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -108; }
        }

        @keyframes civMaterializedSitePresence {
          0%, 100% { opacity: 0.72; transform: translate3d(0, 0, 0) scale(1); }
          50% { opacity: 0.94; transform: translate3d(0, -0.16%, 0) scale(1.002); }
        }

        @keyframes civDepthPulse {
          0%, 100% { opacity: 0.72; transform: scale(0.998); }
          50% { opacity: 1; transform: scale(1.006); }
        }

        @keyframes civDepthFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -126; }
        }

        @keyframes civScaleTheaterLoom {
          0%, 100% { opacity: 0.74; transform: scale(0.997); }
          50% { opacity: 1; transform: scale(1.006); }
        }

        @keyframes civScaleTheaterFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -118; }
        }

        @keyframes civCommandFrameFlow {
          from { stroke-dashoffset: 0; }
          to { stroke-dashoffset: -128; }
        }

        @keyframes civCommandFrameBeacon {
          0%, 100% { opacity: 0.48; transform: scale(0.96); }
          50% { opacity: 0.96; transform: scale(1.04); }
        }

        .civ-market-pulse { animation: civMarketPulse 5.8s ease-in-out infinite; }
        .civ-market-drift { animation: civMarketDrift 9.6s ease-in-out infinite; }
        .civ-market-breathe { animation: civMarketBreathe 12s ease-in-out infinite; transform-origin: center; }
        .civ-market-flow { stroke-dasharray: 9 15; animation: civMarketDash 7s linear infinite; }
        .civ-scan-attention { animation: civScanAttention 2.4s ease-in-out infinite; }
        .civ-site-recent { animation: civRecentTraceGlow 2s ease-in-out infinite; }
        .civ-trace-recorded-ring { animation: civTraceRecordedRing 1.85s ease-out infinite; transform-box: fill-box; transform-origin: center; }
        .civ-trace-recorded-label { animation: civTraceRecordedLabel 4.8s ease-out both; }
        .civ-trace-reveal-vector { animation: civTraceRecordedVector 4.8s ease-out both; stroke-dasharray: 11 9; }
        .civ-miniature-trace-card { animation: civMiniatureTraceCard 5.4s ease-out both; }
        .civ-map-pin-core { animation: civMapPinBreathe 3.8s ease-in-out infinite; }
        .civ-portrait-signal { animation: civPortraitSignal 6.5s ease-in-out infinite; }
        .civ-portrait-loom { animation: civPortraitLoom 11s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .civ-portrait-flow { stroke-dasharray: 12 14; animation: civPortraitSweep 11s linear infinite; }
        .civ-portrait-haze { animation: civPortraitHaze 14s ease-in-out infinite; will-change: transform, opacity; }
        .civ-portrait-mark { filter: drop-shadow(0 0 10px currentColor); }
        .civ-environment-signature { filter: drop-shadow(0 0 14px currentColor); }
        .civ-dominant-blueprint { filter: drop-shadow(0 0 20px currentColor); }
        .civ-signature-atmosphere { animation: civIdentityWeather 17s ease-in-out infinite; will-change: transform, opacity; }
        .civ-identity-weather { animation: civIdentityWeather 16s ease-in-out infinite; will-change: transform, opacity; }
        .civ-project-wash { animation: civProjectZonePulse 12s ease-in-out infinite; will-change: opacity; }
        .civ-project-zone { animation: civProjectZonePulse 9s ease-in-out infinite; }
        .civ-artifact-substructure { animation: civArtifactSubstructure 10s ease-in-out infinite; filter: drop-shadow(0 0 12px currentColor); transform-box: fill-box; transform-origin: center; }
        .civ-artifact-substructure-flow { stroke-dasharray: 8 12; animation: civArtifactSubstructureFlow 12s linear infinite; }
        .civ-artifact-deployment { animation: civArtifactDeploymentSettle 13s ease-in-out infinite; filter: drop-shadow(0 0 18px currentColor); transform-box: fill-box; transform-origin: center; }
        .civ-artifact-deployment-local-site { filter: drop-shadow(0 0 8px currentColor); }
        .civ-artifact-deployment-flow { stroke-dasharray: 10 13; animation: civArtifactDeploymentFlow 13s linear infinite; }
        .civ-focused-projection { animation: civArtifactDeploymentSettle 12s ease-in-out infinite; filter: drop-shadow(0 0 18px currentColor); transform-box: fill-box; transform-origin: center; }
        .civ-focused-projection-local-site { animation: civFocusedLocalSiteSettle 14s ease-in-out infinite; filter: drop-shadow(0 0 12px currentColor); transform-origin: bottom center; }
        .civ-integrated-consequence { animation: civIntegratedConsequence 15s ease-in-out infinite; filter: drop-shadow(0 0 16px currentColor); transform-box: fill-box; transform-origin: center; }
        .civ-evolved-plate-flow { stroke-dasharray: 14 18; animation: civEvolvedPlateFlow 20s linear infinite; }
        .civ-evolved-plate-weather { animation: civEvolvedPlateWeather 18s ease-in-out infinite; will-change: transform, opacity; }
        .civ-archetype-composition { animation: civArchetypeBreath 16s ease-in-out infinite; filter: drop-shadow(0 0 14px currentColor); transform-box: fill-box; transform-origin: center; }
        .civ-archetype-flow { stroke-dasharray: 14 18; animation: civArchetypeFlow 20s linear infinite; }
        .civ-plate-dialect-flow { stroke-dasharray: 12 16; animation: civPlateDialectFlow 18s linear infinite; }
        .civ-dialect-field { animation: civDialectField 18s ease-in-out infinite; will-change: transform, opacity; }
        .civ-dialect-flow { stroke-dasharray: 14 18; animation: civDialectFlow 18s linear infinite; }
        .civ-native-work { animation: civNativeWorkSettle 12s ease-in-out infinite; filter: drop-shadow(0 0 16px currentColor); transform-box: fill-box; transform-origin: center; }
        .civ-native-work-flow { stroke-dasharray: 10 14; animation: civNativeWorkFlow 14s linear infinite; }
        .civ-materialized-site { animation: civMaterializedSitePresence 16s ease-in-out infinite; filter: drop-shadow(0 0 14px currentColor); transform-box: fill-box; transform-origin: bottom center; }
        .civ-depth-composition { filter: drop-shadow(0 0 16px currentColor); transform-box: fill-box; transform-origin: center; }
        .civ-depth-pulse { animation: civDepthPulse 16s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .civ-depth-flow { stroke-dasharray: 14 18; animation: civDepthFlow 19s linear infinite; }
        .civ-scale-theater-mark { animation: civScaleTheaterLoom 15s ease-in-out infinite; filter: drop-shadow(0 0 18px currentColor); transform-box: fill-box; transform-origin: center; }
        .civ-scale-theater-flow { stroke-dasharray: 12 16; animation: civScaleTheaterFlow 17s linear infinite; }
        .civ-command-frame-flow { stroke-dasharray: 12 16; animation: civCommandFrameFlow 18s linear infinite; }
        .civ-command-frame-beacon { animation: civCommandFrameBeacon 5.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .civ-map-pin::before {
          animation: civMapRing 2.8s ease-out infinite;
          border: 1px solid var(--pin-color);
          border-radius: 9999px;
          bottom: -0.08rem;
          content: '';
          height: 1rem;
          left: 50%;
          opacity: 0.42;
          position: absolute;
          transform: translateX(-50%);
          width: 2.6rem;
        }

        [data-civilization-motion="paused"] .civ-market-pulse,
        [data-civilization-motion="paused"] .civ-market-drift,
        [data-civilization-motion="paused"] .civ-market-breathe,
        [data-civilization-motion="paused"] .civ-market-flow,
        [data-civilization-motion="paused"] .civ-scan-attention,
        [data-civilization-motion="paused"] .civ-site-recent,
        [data-civilization-motion="paused"] .civ-trace-recorded-ring,
        [data-civilization-motion="paused"] .civ-trace-recorded-label,
        [data-civilization-motion="paused"] .civ-trace-reveal-vector,
        [data-civilization-motion="paused"] .civ-miniature-trace-card,
        [data-civilization-motion="paused"] .civ-map-pin-core,
        [data-civilization-motion="paused"] .civ-portrait-signal,
        [data-civilization-motion="paused"] .civ-portrait-loom,
        [data-civilization-motion="paused"] .civ-portrait-flow,
        [data-civilization-motion="paused"] .civ-portrait-haze,
        [data-civilization-motion="paused"] .civ-signature-atmosphere,
        [data-civilization-motion="paused"] .civ-identity-weather,
        [data-civilization-motion="paused"] .civ-project-wash,
        [data-civilization-motion="paused"] .civ-project-zone,
        [data-civilization-motion="paused"] .civ-artifact-substructure,
        [data-civilization-motion="paused"] .civ-artifact-substructure-flow,
        [data-civilization-motion="paused"] .civ-artifact-deployment,
        [data-civilization-motion="paused"] .civ-artifact-deployment-flow,
        [data-civilization-motion="paused"] .civ-focused-projection,
        [data-civilization-motion="paused"] .civ-focused-projection-local-site,
        [data-civilization-motion="paused"] .civ-integrated-consequence,
        [data-civilization-motion="paused"] .civ-evolved-plate-flow,
        [data-civilization-motion="paused"] .civ-evolved-plate-weather,
        [data-civilization-motion="paused"] .civ-archetype-composition,
        [data-civilization-motion="paused"] .civ-archetype-flow,
        [data-civilization-motion="paused"] .civ-plate-dialect-flow,
        [data-civilization-motion="paused"] .civ-dialect-field,
        [data-civilization-motion="paused"] .civ-dialect-flow,
        [data-civilization-motion="paused"] .civ-native-work,
        [data-civilization-motion="paused"] .civ-native-work-flow,
        [data-civilization-motion="paused"] .civ-materialized-site,
        [data-civilization-motion="paused"] .civ-depth-pulse,
        [data-civilization-motion="paused"] .civ-depth-flow,
        [data-civilization-motion="paused"] .civ-scale-theater-mark,
        [data-civilization-motion="paused"] .civ-scale-theater-flow,
        [data-civilization-motion="paused"] .civ-command-frame-flow,
        [data-civilization-motion="paused"] .civ-command-frame-beacon {
          animation: none !important;
          will-change: auto !important;
        }

        [data-civilization-motion="paused"] .civ-map-pin::before {
          animation: none !important;
        }

        @media (prefers-reduced-motion: reduce) {
          .civ-market-pulse,
          .civ-market-drift,
          .civ-market-breathe,
          .civ-market-flow,
          .civ-scan-attention,
          .civ-site-recent,
          .civ-trace-recorded-ring,
          .civ-trace-recorded-label,
          .civ-trace-reveal-vector,
          .civ-miniature-trace-card,
          .civ-map-pin-core,
          .civ-portrait-signal,
          .civ-portrait-loom,
          .civ-portrait-flow,
          .civ-portrait-haze,
          .civ-dominant-blueprint,
          .civ-environment-signature,
          .civ-signature-atmosphere,
          .civ-identity-weather,
          .civ-project-wash,
          .civ-project-zone,
          .civ-artifact-substructure,
          .civ-artifact-substructure-flow,
          .civ-artifact-deployment,
          .civ-artifact-deployment-flow,
          .civ-focused-projection,
          .civ-focused-projection-local-site,
          .civ-integrated-consequence,
          .civ-evolved-plate-flow,
          .civ-evolved-plate-weather,
          .civ-archetype-composition,
          .civ-archetype-flow,
          .civ-plate-dialect-flow,
          .civ-dialect-field,
          .civ-dialect-flow,
          .civ-native-work,
          .civ-native-work-flow,
          .civ-materialized-site,
          .civ-depth-pulse,
          .civ-depth-flow,
          .civ-scale-theater-mark,
          .civ-scale-theater-flow,
          .civ-command-frame-flow,
          .civ-command-frame-beacon,
          .civ-map-pin::before {
            animation: none !important;
            will-change: auto !important;
          }
        }
      `}
    </style>
  );
}

function SurfaceLayer({ signals }: { signals: CivilizationSceneSignals }) {
  return (
    <g>
      <rect width="1100" height="650" fill="url(#civMarketSurfaceSky)" />
      <circle cx="918" cy="112" r="56" fill="rgba(255,242,190,0.24)" filter="url(#civMarketSoftGlow)" />
      <circle cx="918" cy="112" r="18" fill="rgba(255,252,225,0.62)" />
      <path d="M0 184 C150 112 316 124 492 150 C684 178 842 96 1100 190 L1100 390 C906 318 746 330 588 302 C392 266 194 306 0 360 Z" fill="url(#civMarketHeroSkyAurora)" opacity={signals.luminary ? 0.8 : 0.38} className={signals.luminary ? 'civ-market-drift' : undefined} />
      <path d="M0 376 C128 302 278 334 422 302 C580 268 720 318 884 282 C990 258 1048 284 1100 246 L1100 650 L0 650 Z" fill="#101b2d" />
      <path d="M0 472 C138 408 314 442 476 390 C652 334 800 412 1100 342 L1100 650 L0 650 Z" fill="#07101f" />
      <path d="M0 548 C164 486 340 542 522 500 C714 454 892 500 1100 426 L1100 650 L0 650 Z" fill="rgba(0,0,0,0.36)" />
      <ellipse cx="568" cy="542" rx="390" ry="94" fill="url(#civMarketCityGlow)" opacity="0.66" />
      <path d="M246 536 C350 504 478 512 578 492 C694 468 802 490 938 458 C902 498 820 528 692 542 C538 560 374 558 246 536 Z" fill="rgba(3,7,15,0.66)" />
      <g opacity="0.74" filter="url(#civMarketCrispGlow)">
        <path d="M280 526 v-44 h18 v44 M314 526 v-70 h24 v70 M352 526 v-52 h18 v52 M392 522 v-96 h26 v96 M430 522 v-62 h18 v62 M742 500 v-78 h18 v78 M776 500 v-116 h26 v116 M818 500 v-82 h22 v82 M854 498 v-58 h18 v58" fill="rgba(6,12,24,0.76)" stroke="rgba(143,220,255,0.32)" strokeWidth="2" />
        <path d="M286 496 H292 M320 480 H332 M358 500 H366 M398 452 H412 M436 484 H444 M750 452 H756 M784 422 H798 M824 446 H834 M860 464 H868" stroke="rgba(255,230,168,0.78)" strokeWidth="2.3" strokeLinecap="round" />
      </g>

      <g filter="url(#civMarketCrispGlow)">
        <path d="M56 470 C168 440 302 452 410 426 C554 392 684 420 816 388 C932 360 1018 364 1090 344" fill="none" stroke="rgba(134,224,255,0.34)" strokeWidth="2.4" />
        <path d="M84 488 C200 462 310 490 444 450 C594 404 740 450 914 402 C980 384 1038 386 1092 376" fill="none" stroke="rgba(223,184,107,0.24)" strokeWidth="1.8" />
        <path d="M136 462 H202 M232 454 H300 M352 438 H454 M504 426 H574 M650 416 H748 M836 392 H1004" stroke="rgba(255,226,154,0.7)" strokeWidth="2.6" strokeLinecap="round" strokeDasharray="2 12" />
        <path d="M168 430 v-54 h16 v54 M198 430 v-88 h22 v88 M234 430 v-66 h18 v66 M784 388 v-72 h18 v72 M816 388 v-110 h24 v110 M856 388 v-84 h20 v84" fill="none" stroke="rgba(142,224,255,0.4)" strokeWidth="2.2" />
        <path d="M160 430 H266 M768 388 H900" stroke="rgba(142,224,255,0.5)" strokeWidth="2.4" />
        <path d="M468 456 L522 256 L584 456 M888 414 L946 184 L1006 414" fill="rgba(223,184,107,0.1)" stroke="rgba(223,184,107,0.5)" strokeWidth="1.8" />
        <path d="M498 456 C510 384 530 326 552 276 C568 340 588 390 624 456 M904 414 C922 326 940 254 962 196 C982 284 1000 350 1040 414" fill="url(#civMarketHeroFoundryFire)" opacity={signals.foundry || signals.route ? 0.78 : 0.26} />
        <path d="M70 532 C174 506 288 532 392 504 C520 470 650 498 760 474 C886 446 986 460 1090 430" fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth="18" strokeLinecap="round" />
        <path d="M92 532 C196 506 298 530 418 500 C548 468 658 496 784 468 C904 442 1008 456 1090 432" fill="none" stroke="rgba(130,221,255,0.26)" strokeWidth="2" strokeLinecap="round" />
      </g>

      {signals.living && (
        <g className="civ-market-pulse">
          <path d="M36 520 C166 446 304 544 438 470 C586 388 728 494 946 386 C1018 350 1068 344 1100 328" fill="none" stroke="#76f5b5" strokeWidth="5.2" opacity="0.82" />
          <path d="M98 560 C252 506 384 582 548 512 C690 452 812 524 1040 450" fill="none" stroke="#76f5b5" strokeWidth="3.2" opacity="0.54" />
          <path d="M202 480 C250 430 292 418 362 372 M436 496 C498 424 548 406 626 334 M704 442 C768 386 826 366 918 308" fill="none" stroke="#d9ffe8" strokeWidth="1.6" opacity="0.64" />
        </g>
      )}

      {(signals.foundry || signals.route) && (
        <g>
          <path d="M538 358 C584 278 632 238 716 198 C776 170 828 158 900 136" fill="none" stroke="#ffc96f" strokeWidth="3.6" opacity="0.62" className="civ-market-flow" />
          <path d="M568 372 C622 308 700 278 794 250 C868 228 940 220 1038 198" fill="none" stroke="#ff8f45" strokeWidth="2.2" opacity="0.5" className="civ-market-flow" />
          <path d="M486 456 C540 426 592 424 652 456 M878 416 C928 392 990 392 1056 416" fill="none" stroke="rgba(255,228,163,0.42)" strokeWidth="1.8" />
        </g>
      )}

      {signals.hazard && (
        <g className="civ-market-breathe">
          <ellipse cx="780" cy="470" rx="156" ry="54" fill="url(#civMarketHeroHazard)" stroke="#ff6570" strokeWidth="2.6" />
          <ellipse cx="780" cy="470" rx="94" ry="30" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="1.3" />
          <path d="M650 470 H910 M780 422 V518" stroke="rgba(255,255,255,0.2)" strokeWidth="1.4" />
        </g>
      )}

      {signals.redaction && (
        <g opacity="0.58">
          <path d="M656 214 H892 M624 238 H850 M694 262 H976" stroke="rgba(255,101,112,0.42)" strokeWidth="3" strokeLinecap="round" strokeDasharray="28 13" />
          <path d="M656 214 H892 M624 238 H850 M694 262 H976" stroke="rgba(5,9,20,0.75)" strokeWidth="1" strokeLinecap="round" strokeDasharray="9 16" />
        </g>
      )}
    </g>
  );
}

function OrbitLayer({ signals }: { signals: CivilizationSceneSignals }) {
  return (
    <g>
      <rect width="1040" height="585" fill="url(#civMarketDeepSpace)" />
      <circle cx="520" cy="314" r="232" fill="rgba(130,221,255,0.12)" filter="url(#civMarketSoftGlow)" />
      <circle cx="520" cy="314" r="214" fill="url(#civMarketPlanet)" />
      <path d="M356 174 C448 124 564 126 662 178 C578 168 498 190 436 248 C392 290 364 344 352 414 C306 322 310 224 356 174 Z" fill="rgba(255,255,255,0.09)" />
      <circle cx="520" cy="314" r="216" fill="none" stroke="rgba(130,221,255,0.42)" strokeWidth="1.8" />
      <ellipse cx="520" cy="314" rx="354" ry="88" fill="none" stroke="rgba(130,221,255,0.26)" strokeWidth="1.4" transform="rotate(-8 520 314)" />
      <ellipse cx="520" cy="314" rx="418" ry="116" fill="none" stroke="rgba(223,184,107,0.2)" strokeWidth="1.2" transform="rotate(12 520 314)" />
      <g opacity="0.72">
        <path d="M418 298 C478 262 548 268 622 308 M386 384 C486 342 594 390 678 346 M456 206 C522 188 584 202 644 242" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" />
        <path d="M404 318 L412 318 M444 302 L452 302 M492 286 L500 286 M556 294 L564 294 M606 318 L614 318 M456 386 L464 386 M520 372 L528 372 M582 386 L590 386 M628 354 L636 354" stroke="rgba(255,236,178,0.62)" strokeWidth="2.2" strokeLinecap="round" />
      </g>
      {signals.living && (
        <>
          <path d="M324 258 C414 214 484 236 560 194 C646 146 724 216 752 286 C674 272 610 318 530 306 C444 294 390 266 324 258 Z" fill="rgba(112,239,178,0.16)" className="civ-market-pulse" />
          <path d="M318 372 C430 320 548 396 700 328" fill="none" stroke="rgba(112,239,178,0.66)" strokeWidth="2.2" className="civ-market-pulse" />
        </>
      )}
      {(signals.foundry || signals.route) && (
        <>
          <path d="M302 310 C408 276 598 264 744 310" fill="none" stroke="rgba(223,184,107,0.48)" strokeWidth="1.5" />
          <path d="M304 432 C426 372 584 448 714 374" fill="none" stroke="rgba(130,221,255,0.48)" strokeWidth="1.6" />
          <g className="civ-market-flow">
            <path d="M236 170 C380 96 608 94 800 178" fill="none" stroke="rgba(130,221,255,0.36)" strokeWidth="1.4" />
            <path d="M300 154 C430 106 606 112 736 168" fill="none" stroke="rgba(223,184,107,0.34)" strokeWidth="1.3" />
          </g>
          <path d="M742 170 L762 156 L786 164 M278 462 L302 476 L328 468" fill="none" stroke="rgba(255,228,163,0.54)" strokeWidth="2" />
        </>
      )}
      {signals.luminary && (
        <path d="M250 310 C390 208 588 204 790 314" fill="none" stroke="rgba(190,162,255,0.56)" strokeWidth="2" className="civ-market-drift" />
      )}
      {signals.hazard && (
        <g className="civ-market-breathe">
          <ellipse cx="644" cy="256" rx="66" ry="30" fill="rgba(255,105,114,0.13)" stroke="#ff6972" strokeWidth="1.6" transform="rotate(-13 644 256)" />
          <path d="M590 254 C620 232 662 234 700 256" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth="1.1" />
        </g>
      )}
    </g>
  );
}

function StellarLayer({ signals }: { signals: CivilizationSceneSignals }) {
  return (
    <g>
      <rect width="1040" height="585" fill="url(#civMarketDeepSpace)" />
      <circle cx="520" cy="286" r="138" fill="rgba(255,185,104,0.18)" filter="url(#civMarketSoftGlow)" />
      <circle cx="520" cy="286" r="96" fill="url(#civMarketStar)" className="civ-market-pulse" />
      <ellipse cx="520" cy="286" rx="170" ry="66" fill="none" stroke="rgba(223,184,107,0.36)" strokeWidth="1.6" />
      <ellipse cx="520" cy="286" rx="262" ry="108" fill="none" stroke="rgba(130,221,255,0.3)" strokeWidth="1.4" />
      <ellipse cx="520" cy="286" rx="362" ry="146" fill="none" stroke="rgba(190,162,255,0.24)" strokeWidth="1.3" />
      <g opacity="0.9">
        <circle cx="688" cy="282" r="9" fill="#82ddff" />
        <circle cx="338" cy="360" r="6" fill="#dfb86b" />
        <circle cx="778" cy="182" r="5" fill="#bea2ff" />
        <path d="M250 410 C380 334 506 440 680 346 C806 278 876 320 966 274" fill="none" stroke="rgba(130,221,255,0.28)" strokeWidth="1.4" />
      </g>
      {signals.foundry && (
        <g className="civ-market-pulse">
          <path d="M368 232 L392 220 M458 184 L484 176 M586 188 L612 198 M688 270 L716 276 M646 390 L672 410 M472 416 L490 438 M318 340 L284 356" stroke="#dfb86b" strokeWidth="8" strokeLinecap="round" opacity="0.64" />
          <path d="M368 232 L392 220 M458 184 L484 176 M586 188 L612 198 M688 270 L716 276 M646 390 L672 410 M472 416 L490 438 M318 340 L284 356" stroke="rgba(255,255,255,0.34)" strokeWidth="2.2" strokeLinecap="round" />
        </g>
      )}
      {(signals.route || signals.foundry) && (
        <path d="M164 380 C300 282 418 432 578 346 C722 270 788 360 914 298" fill="none" stroke="rgba(130,221,255,0.48)" strokeWidth="1.8" className="civ-market-flow" />
      )}
      {signals.living && (
        <path d="M202 390 C320 322 424 462 586 382 C720 316 790 388 882 348" fill="none" stroke="rgba(112,239,178,0.34)" strokeWidth="1.4" />
      )}
      {signals.hazard && (
        <g className="civ-market-breathe">
          <ellipse cx="520" cy="286" rx="414" ry="168" fill="rgba(255,105,114,0.05)" stroke="rgba(255,105,114,0.4)" strokeWidth="1.6" />
          <ellipse cx="520" cy="286" rx="328" ry="134" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1" />
        </g>
      )}
      {signals.luminary && (
        <path d="M690 126 C772 142 836 190 892 256 C820 232 746 210 672 196 Z" fill="rgba(190,162,255,0.17)" className="civ-market-drift" />
      )}
    </g>
  );
}

function GalaxyLayer({ signals }: { signals: CivilizationSceneSignals }) {
  return (
    <g>
      <rect width="1040" height="585" fill="url(#civMarketDeepSpace)" />
      <g transform="translate(520 302)">
        <g className="civ-market-breathe">
          <ellipse rx="410" ry="122" fill="rgba(130,221,255,0.09)" stroke="rgba(130,221,255,0.34)" strokeWidth="1.5" transform="rotate(-14)" />
          <ellipse rx="342" ry="94" fill="rgba(223,184,107,0.062)" stroke="rgba(223,184,107,0.34)" strokeWidth="1.2" transform="rotate(17)" />
          <ellipse rx="258" ry="70" fill="none" stroke="rgba(190,162,255,0.34)" strokeWidth="1.1" transform="rotate(-34)" />
          <path d="M-374 -6 C-224 -90 -98 -78 0 -8 C124 82 236 70 384 -4" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="20" strokeLinecap="round" transform="rotate(-13)" />
          <path d="M-326 42 C-188 -26 -78 -34 28 24 C148 90 264 82 348 28" fill="none" stroke="rgba(130,221,255,0.28)" strokeWidth="10" strokeLinecap="round" transform="rotate(18)" />
          <path d="M-340 -44 C-180 24 -68 18 34 -34 C158 -98 278 -76 384 -10" fill="none" stroke="rgba(112,239,178,0.18)" strokeWidth="7" strokeLinecap="round" transform="rotate(29)" />
          <circle r="38" fill="rgba(223,184,107,0.34)" filter="url(#civMarketSoftGlow)" />
          <circle r="18" fill="rgba(223,184,107,0.74)" />
          <circle r="6" fill="rgba(255,246,203,0.9)" />
        </g>
        <g opacity="0.78">
          <circle cx="-292" cy="-58" r="2.4" fill="rgba(255,255,255,0.7)" />
          <circle cx="-196" cy="64" r="2" fill="rgba(130,221,255,0.72)" />
          <circle cx="-70" cy="-76" r="1.8" fill="rgba(255,255,255,0.64)" />
          <circle cx="88" cy="72" r="2.2" fill="rgba(190,162,255,0.7)" />
          <circle cx="226" cy="-44" r="2" fill="rgba(255,228,163,0.72)" />
          <circle cx="330" cy="42" r="1.8" fill="rgba(255,255,255,0.58)" />
        </g>
      </g>
      {signals.living && (
        <path d="M142 388 C310 206 444 416 604 252 C710 146 818 222 932 116" fill="none" stroke="rgba(112,239,178,0.48)" strokeWidth="1.7" className="civ-market-pulse" />
      )}
      {signals.luminary && (
        <path d="M208 252 C344 188 468 224 588 174 C716 122 836 172 930 232" fill="none" stroke="rgba(190,162,255,0.48)" strokeWidth="1.6" className="civ-market-drift" />
      )}
      {signals.hazard && (
        <path d="M610 190 C684 152 762 164 824 214 C770 226 694 244 626 280 C606 248 594 218 610 190 Z" fill="rgba(255,105,114,0.14)" stroke="rgba(255,105,114,0.34)" strokeWidth="1.3" className="civ-market-breathe" />
      )}
      {(signals.route || signals.foundry) && (
        <path d="M274 438 C420 378 570 462 764 366" fill="none" stroke="rgba(130,221,255,0.32)" strokeWidth="1.4" className="civ-market-flow" />
      )}
    </g>
  );
}

function MarketCivilizationScene({
  scene,
  signals,
}: {
  scene: MarketSceneKind;
  signals: CivilizationSceneSignals;
}) {
  return (
    <svg
      className="absolute inset-0 h-full w-full"
      viewBox={scene === 'surface' ? '0 0 1100 650' : '0 0 1040 585'}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="civMarketDeepSpace" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#10223b" />
          <stop offset="56%" stopColor="#071021" />
          <stop offset="100%" stopColor="#010309" />
        </radialGradient>
        <linearGradient id="civMarketSurfaceSky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#071021" />
          <stop offset="44%" stopColor="#122640" />
          <stop offset="70%" stopColor="#102033" />
          <stop offset="100%" stopColor="#050914" />
        </linearGradient>
        <radialGradient id="civMarketPlanet" cx="44%" cy="39%" r="62%">
          <stop offset="0%" stopColor="#386d8e" />
          <stop offset="42%" stopColor="#193b61" />
          <stop offset="72%" stopColor="#0b1730" />
          <stop offset="100%" stopColor="#01040a" />
        </radialGradient>
        <radialGradient id="civMarketStar" cx="50%" cy="50%" r="52%">
          <stop offset="0%" stopColor="#fff7c8" />
          <stop offset="42%" stopColor="#ffb968" />
          <stop offset="100%" stopColor="rgba(255,185,104,0)" />
        </radialGradient>
        <linearGradient id="civMarketAurora" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#82ddff" stopOpacity="0" />
          <stop offset="38%" stopColor="#bea2ff" stopOpacity="0.58" />
          <stop offset="66%" stopColor="#70efb2" stopOpacity="0.42" />
          <stop offset="100%" stopColor="#82ddff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="civMarketHeroSkyAurora" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#86e0ff" stopOpacity="0" />
          <stop offset="30%" stopColor="#c5a7ff" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#76f5b5" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#86e0ff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="civMarketHeroFoundryFire" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#ffc96f" stopOpacity="0.86" />
          <stop offset="52%" stopColor="#ff7b3e" stopOpacity="0.38" />
          <stop offset="100%" stopColor="#ff7b3e" stopOpacity="0" />
        </linearGradient>
        <radialGradient id="civMarketCityGlow" cx="50%" cy="50%" r="58%">
          <stop offset="0%" stopColor="#ffe6a8" stopOpacity="0.28" />
          <stop offset="34%" stopColor="#82ddff" stopOpacity="0.18" />
          <stop offset="66%" stopColor="#4b2a8f" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#040711" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="civMarketHeroHazard" cx="50%" cy="50%" r="58%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.35" />
          <stop offset="18%" stopColor="#ff6570" stopOpacity="0.42" />
          <stop offset="70%" stopColor="#ff6570" stopOpacity="0.13" />
          <stop offset="100%" stopColor="#ff6570" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="civMarketSurfaceGlow" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#dfb86b" stopOpacity="0.58" />
          <stop offset="100%" stopColor="#dfb86b" stopOpacity="0" />
        </linearGradient>
        <filter id="civMarketSoftGlow">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="civMarketCrispGlow">
          <feGaussianBlur stdDeviation="0.45" />
        </filter>
      </defs>

      {scene === 'surface' && <SurfaceLayer signals={signals} />}
      {scene === 'orbit' && <OrbitLayer signals={signals} />}
      {scene === 'stellar' && <StellarLayer signals={signals} />}
      {scene === 'galaxy' && <GalaxyLayer signals={signals} />}
    </svg>
  );
}

function CinematicCivilizationPlate({
  scene,
  palette,
  identity,
  signals,
  archetype,
  scanActive = false,
}: {
  scene: MarketSceneKind;
  palette: AffinityPalette;
  identity?: CivilizationSceneIdentity;
  signals?: CivilizationSceneSignals;
  archetype?: CivilizationArchetypeId | null;
  scanActive?: boolean;
}) {
  const plate = getCivilizationPlateArtSlot(scene, scanActive, archetype);
  const scale = scanActive ? plate.scanScale : plate.cinematicScale;
  const plateFocus = getPlateStateFocus(scene, signals);
  const primaryTone = identity?.primaryAffinity ? AFFINITY_META[identity.primaryAffinity].hex : palette.primary;
  const secondaryTone = identity?.secondaryAffinity ? AFFINITY_META[identity.secondaryAffinity].hex : palette.secondary;
  const living = Boolean(signals?.living);
  const foundry = Boolean(signals?.foundry);
  const hazard = Boolean(signals?.hazard);
  const luminary = Boolean(signals?.luminary);
  const route = Boolean(signals?.route);
  const redaction = Boolean(signals?.redaction);
  const gradeSaturation = 1.02 + (living ? 0.08 : 0) + (foundry ? 0.05 : 0) + (luminary ? 0.05 : 0);
  const gradeContrast = 1.01 + (hazard ? 0.04 : 0) + (redaction ? 0.03 : 0);
  const gradeBrightness = scene === 'galaxy'
    ? (scanActive ? 1.04 : 1.06) + (luminary ? 0.03 : 0)
    : (scanActive ? 1.04 : 1.06) + (foundry ? 0.03 : 0) + (living ? 0.015 : 0) - (hazard ? 0.02 : 0);
  const verticalVeil = scanActive
    ? scene === 'galaxy'
      ? 'linear-gradient(180deg, rgba(2,4,10,0.08), rgba(2,4,10,0.01) 42%, rgba(2,4,10,0.3))'
      : 'linear-gradient(180deg, rgba(2,4,10,0.18), rgba(2,4,10,0.045) 42%, rgba(2,4,10,0.44))'
    : scene === 'galaxy'
      ? 'linear-gradient(180deg, rgba(2,4,10,0.025), rgba(2,4,10,0) 46%, rgba(2,4,10,0.18))'
      : 'linear-gradient(180deg, rgba(2,4,10,0.055), rgba(2,4,10,0.005) 42%, rgba(2,4,10,0.31))';
  const edgeVeil = scanActive
    ? scene === 'galaxy'
      ? 'radial-gradient(circle at 50% 50%, transparent 50%, rgba(0,0,0,0.16) 100%)'
      : 'radial-gradient(circle at 50% 50%, transparent 42%, rgba(0,0,0,0.25) 100%)'
    : scene === 'galaxy'
      ? 'radial-gradient(circle at 50% 50%, transparent 58%, rgba(0,0,0,0.08) 100%)'
      : 'radial-gradient(circle at 50% 50%, transparent 46%, rgba(0,0,0,0.15) 100%)';
  const plateDialect = [
    living
      ? `radial-gradient(ellipse at ${scene === 'surface' ? '30% 74%' : '34% 56%'}, ${AFFINITY_META.verdance.hex}${scanActive ? '2E' : '22'} 0%, transparent ${scene === 'galaxy' ? '40%' : '34%'})`
      : null,
    foundry
      ? `radial-gradient(ellipse at ${scene === 'surface' ? '68% 73%' : '58% 62%'}, ${AFFINITY_META.flare.hex}${scanActive ? '2A' : '1D'} 0%, transparent 36%)`
      : null,
    route
      ? `linear-gradient(${scene === 'surface' ? '116deg' : '104deg'}, transparent 18%, ${AFFINITY_META.continuum.hex}${scanActive ? '18' : '10'} 44%, ${primaryTone}${scanActive ? '16' : '0D'} 64%, transparent 88%)`
      : null,
    hazard
      ? `radial-gradient(ellipse at ${scene === 'galaxy' ? '34% 72%' : '72% 58%'}, ${AFFINITY_META.abyss.hex}${scanActive ? '22' : '18'} 0%, rgba(255,105,114,0.08) 28%, transparent 50%)`
      : null,
    luminary
      ? `radial-gradient(ellipse at ${scene === 'galaxy' ? '70% 32%' : '58% 34%'}, ${secondaryTone}${scanActive ? '26' : '18'} 0%, transparent 38%)`
      : null,
    redaction
      ? 'linear-gradient(90deg, transparent 0%, rgba(255,105,114,0.06) 22%, rgba(2,4,10,0.26) 52%, rgba(255,105,114,0.05) 78%, transparent 100%)'
      : null,
  ].filter(Boolean).join(',');
  return (
    <>
      <img
        src={plate.src}
        alt=""
        aria-hidden="true"
        data-testid="civilization-plate-art"
        data-art-slot={plate.id}
        data-art-resolution={plate.resolution}
        data-plate-focus={plateFocus.key}
        className="absolute inset-0 h-full w-full object-cover transition-[filter,transform] duration-500"
        style={{
          filter: `${plate.contrast} saturate(${gradeSaturation.toFixed(2)}) contrast(${gradeContrast.toFixed(2)}) brightness(${gradeBrightness.toFixed(2)})`,
          objectPosition: plate.position,
          transform: `translate3d(${plateFocus.x}%, ${plateFocus.y}%, 0) scale(${scale})`,
          transformOrigin: plate.transformOrigin,
        }}
        draggable={false}
      />
      <div
        className="pointer-events-none absolute inset-0 mix-blend-soft-light"
        data-testid="civilization-plate-identity-grade"
        style={{
          background: plateDialect || `radial-gradient(circle at 50% 46%, ${primaryTone}12, transparent 48%)`,
          opacity: scanActive ? 0.32 : 0.74,
        }}
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: [
            verticalVeil,
            edgeVeil,
            `radial-gradient(circle at 50% 46%, ${palette.primary}18, transparent 48%)`,
          ].join(','),
        }}
        aria-hidden="true"
      />
    </>
  );
}

function getPlateStateFocus(
  scene: MarketSceneKind,
  signals?: CivilizationSceneSignals,
): { key: string; x: number; y: number } {
  if (!signals) return { key: 'neutral', x: 0, y: 0 };

  if (scene === 'surface') {
    if (signals.hazard || signals.redaction) return { key: 'hazard-district', x: -2.5, y: 0.4 };
    if (signals.foundry && !signals.living) return { key: 'forge-spine', x: -2.2, y: 0.2 };
    if (signals.living && !signals.foundry) return { key: 'living-district', x: 2.1, y: 0.5 };
    if (signals.route) return { key: 'route-grid', x: -0.9, y: 0.3 };
    if (signals.luminary) return { key: 'luminary-aurora', x: 0.4, y: -0.3 };
    return { key: 'city-core', x: 0, y: 0 };
  }

  if (scene === 'orbit') {
    if (signals.hazard || signals.redaction) return { key: 'orbital-quarantine', x: -1.1, y: 0.3 };
    if (signals.route || signals.foundry) return { key: 'orbital-lanes', x: -0.8, y: 0 };
    if (signals.living) return { key: 'biosphere-bands', x: 0.7, y: 0.3 };
    return { key: 'planetary-core', x: 0, y: 0 };
  }

  if (scene === 'stellar') {
    if (signals.hazard || signals.redaction) return { key: 'stellar-exclusion', x: -0.7, y: 0 };
    if (signals.route || signals.foundry) return { key: 'stellar-routes', x: -0.5, y: 0 };
    if (signals.living) return { key: 'stellar-ecology', x: 0.5, y: 0 };
    return { key: 'stellar-core', x: 0, y: 0 };
  }

  if (signals.hazard || signals.redaction) return { key: 'galactic-redaction', x: -0.4, y: 0 };
  if (signals.route || signals.living) return { key: 'galactic-routes', x: 0.3, y: 0 };
  if (signals.luminary) return { key: 'galactic-luminary', x: 0, y: -0.2 };
  return { key: 'galactic-core', x: 0, y: 0 };
}

function formatSceneStateFlags(signals: CivilizationSceneSignals): string {
  return [
    signals.living ? 'living' : null,
    signals.foundry ? 'foundry' : null,
    signals.hazard ? 'hazard' : null,
    signals.luminary ? 'luminary' : null,
    signals.route ? 'route' : null,
    signals.redaction ? 'redaction' : null,
  ].filter(Boolean).join(' ') || 'quiet';
}

function CivilizationEvolvedPlateStateLayer({
  scene,
  palette,
  identity,
  signals,
  scanActive,
}: {
  scene: MarketSceneKind;
  palette: AffinityPalette;
  identity: CivilizationSceneIdentity;
  signals: CivilizationSceneSignals;
  scanActive: boolean;
}) {
  if (
    !signals.living &&
    !signals.foundry &&
    !signals.hazard &&
    !signals.luminary &&
    !signals.route &&
    !signals.redaction
  ) {
    return null;
  }

  const primaryTone = identity.primaryAffinity ? AFFINITY_META[identity.primaryAffinity].hex : palette.primary;
  const secondaryTone = identity.secondaryAffinity ? AFFINITY_META[identity.secondaryAffinity].hex : palette.secondary;
  const opacity = scanActive ? 0.38 : 0.58;
  const surfaceBackground = [
    signals.living
      ? `radial-gradient(ellipse at 34% 76%, ${AFFINITY_META.verdance.hex}24 0%, ${AFFINITY_META.verdance.hex}10 28%, transparent 54%)`
      : null,
    signals.foundry
      ? `radial-gradient(ellipse at 61% 72%, ${AFFINITY_META.flare.hex}20 0%, rgba(223,184,107,0.11) 32%, transparent 58%)`
      : null,
    signals.hazard
      ? `radial-gradient(ellipse at 79% 63%, rgba(255,105,114,0.18) 0%, rgba(21,6,16,0.34) 30%, transparent 58%)`
      : null,
    signals.luminary
      ? `linear-gradient(118deg, transparent 8%, ${secondaryTone}16 30%, ${primaryTone}10 58%, transparent 88%)`
      : null,
  ].filter(Boolean).join(',');
  const orbitBackground = [
    signals.living
      ? `radial-gradient(ellipse at 39% 66%, ${AFFINITY_META.verdance.hex}22 0%, transparent 44%)`
      : null,
    signals.route || signals.foundry
      ? `linear-gradient(106deg, transparent 18%, ${AFFINITY_META.continuum.hex}18 42%, ${AFFINITY_META.flare.hex}12 58%, transparent 84%)`
      : null,
    signals.hazard
      ? 'radial-gradient(ellipse at 72% 60%, rgba(255,105,114,0.18) 0%, rgba(2,4,10,0.28) 35%, transparent 60%)'
      : null,
  ].filter(Boolean).join(',');
  const stellarBackground = [
    signals.foundry
      ? 'radial-gradient(circle at 44% 42%, rgba(255,196,103,0.2) 0%, transparent 32%)'
      : null,
    signals.living
      ? `radial-gradient(ellipse at 35% 66%, ${AFFINITY_META.verdance.hex}18 0%, transparent 42%)`
      : null,
    signals.hazard
      ? 'radial-gradient(ellipse at 76% 70%, rgba(255,105,114,0.22) 0%, rgba(2,4,10,0.36) 38%, transparent 64%)'
      : null,
    signals.luminary
      ? `linear-gradient(132deg, transparent 10%, ${secondaryTone}18 33%, transparent 72%)`
      : null,
  ].filter(Boolean).join(',');
  const galaxyBackground = [
    signals.route || signals.living
      ? `radial-gradient(ellipse at 48% 50%, ${primaryTone}14 0%, transparent 52%)`
      : null,
    signals.hazard || signals.redaction
      ? 'radial-gradient(ellipse at 67% 55%, rgba(255,105,114,0.2) 0%, rgba(0,0,0,0.34) 36%, transparent 62%)'
      : null,
    signals.luminary
      ? `linear-gradient(112deg, transparent 5%, ${secondaryTone}14 34%, transparent 72%)`
      : null,
  ].filter(Boolean).join(',');
  const background = scene === 'surface'
    ? surfaceBackground
    : scene === 'orbit'
      ? orbitBackground
      : scene === 'stellar'
        ? stellarBackground
        : galaxyBackground;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[3]"
      aria-hidden="true"
      data-testid="civilization-evolved-plate-state"
      data-scene={scene}
      data-state-flags={formatSceneStateFlags(signals)}
    >
      <div
        className="absolute inset-0 mix-blend-soft-light"
        style={{
          background: background || `radial-gradient(circle at 50% 50%, ${primaryTone}12, transparent 52%)`,
          opacity,
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full mix-blend-screen"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {scene === 'surface' && (
          <g data-testid="civilization-evolved-surface-state" opacity={scanActive ? 0.38 : 0.58}>
            {signals.living && (
              <g>
                <path
                  d="M0 84 C16 76, 28 80, 42 72 C57 63, 72 69, 100 56 L100 100 L0 100 Z"
                  fill={`${AFFINITY_META.verdance.hex}12`}
                />
                <path
                  d="M8 87 C23 76, 40 82, 54 70 C66 60, 82 61, 96 50"
                  fill="none"
                  stroke={`${AFFINITY_META.verdance.hex}80`}
                  strokeLinecap="round"
                  strokeWidth="0.72"
                  className="civ-evolved-plate-flow"
                />
              </g>
            )}
            {(signals.foundry || signals.route) && (
              <g>
                <path
                  d="M58 92 C60 78, 64 66, 70 50 C73 42, 76 36, 80 29"
                  fill="none"
                  stroke={`${signals.foundry ? AFFINITY_META.flare.hex : AFFINITY_META.continuum.hex}42`}
                  strokeLinecap="round"
                  strokeWidth="0.54"
                />
                <path
                  d="M50 90 C60 78, 69 66, 84 55"
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeLinecap="round"
                  strokeWidth="0.24"
                />
              </g>
            )}
            {signals.hazard && (
              <g>
                <ellipse
                  cx="76"
                  cy="68"
                  rx="24"
                  ry="9"
                  fill="rgba(255,105,114,0.12)"
                  stroke="rgba(255,105,114,0.42)"
                  strokeDasharray="4 2.5"
                  strokeWidth="0.44"
                  transform="rotate(-10 76 68)"
                />
                <path d="M58 70 H94" stroke="rgba(255,255,255,0.16)" strokeLinecap="round" strokeWidth="0.24" />
              </g>
            )}
            {signals.luminary && (
              <path
                d="M-4 28 C18 17, 35 23, 54 17 C72 10, 86 20, 104 12"
                fill="none"
                stroke={`${secondaryTone}66`}
                strokeLinecap="round"
                strokeWidth="1.2"
                className="civ-evolved-plate-weather"
              />
            )}
          </g>
        )}
        {scene === 'orbit' && (
          <g data-testid="civilization-evolved-orbit-state" opacity={scanActive ? 0.34 : 0.52}>
            {signals.living && (
              <path
                d="M-6 72 C16 58, 36 62, 55 69 C72 76, 88 72, 106 60"
                fill="none"
                stroke={`${AFFINITY_META.verdance.hex}78`}
                strokeLinecap="round"
                strokeWidth="1.25"
                className="civ-evolved-plate-flow"
              />
            )}
            {(signals.route || signals.foundry) && (
              <>
                <ellipse cx="56" cy="56" rx="42" ry="11" fill="none" stroke={`${AFFINITY_META.continuum.hex}66`} strokeWidth="0.58" transform="rotate(-11 56 56)" />
                <path d="M43 78 C48 61, 56 45, 70 29" fill="none" stroke={`${AFFINITY_META.flare.hex}70`} strokeLinecap="round" strokeWidth="0.62" />
              </>
            )}
            {signals.hazard && (
              <ellipse cx="66" cy="62" rx="31" ry="8" fill="rgba(255,105,114,0.1)" stroke="rgba(255,105,114,0.44)" strokeDasharray="3.5 2.4" strokeWidth="0.42" transform="rotate(-9 66 62)" />
            )}
          </g>
        )}
        {scene === 'stellar' && (
          <g data-testid="civilization-evolved-stellar-state" opacity={scanActive ? 0.3 : 0.38}>
            {(signals.route || signals.foundry) && (
              <>
                <ellipse cx="55" cy="50" rx="44" ry="15" fill="none" stroke={`${AFFINITY_META.continuum.hex}66`} strokeWidth="0.6" transform="rotate(-8 55 50)" className="civ-evolved-plate-flow" />
                <path d="M31 61 C45 50, 61 62, 82 45" fill="none" stroke={`${AFFINITY_META.flare.hex}5C`} strokeLinecap="round" strokeWidth="0.55" />
              </>
            )}
            {signals.living && (
              <path d="M7 72 C28 54, 42 66, 61 54 C76 45, 88 49, 101 39" fill="none" stroke={`${AFFINITY_META.verdance.hex}72`} strokeLinecap="round" strokeWidth="0.86" />
            )}
            {signals.hazard && (
              <g>
                <circle cx="80" cy="70" r="13" fill="rgba(255,105,114,0.1)" stroke="rgba(255,105,114,0.44)" strokeDasharray="4 2.5" strokeWidth="0.44" />
                <circle cx="80" cy="70" r="6" fill="rgba(0,0,0,0.28)" stroke="rgba(255,255,255,0.14)" strokeWidth="0.22" />
              </g>
            )}
            {signals.luminary && (
              <path d="M18 37 C35 25, 52 32, 70 24 C83 19, 94 24, 103 31" fill="none" stroke={`${secondaryTone}68`} strokeLinecap="round" strokeWidth="0.92" className="civ-evolved-plate-weather" />
            )}
          </g>
        )}
        {scene === 'galaxy' && (
          <g data-testid="civilization-evolved-galaxy-state" opacity={scanActive ? 0.28 : 0.34}>
            {(signals.route || signals.living) && (
              <>
                <path d="M8 64 C24 46, 43 48, 58 52 C74 57, 86 49, 98 31" fill="none" stroke={`${primaryTone}70`} strokeLinecap="round" strokeWidth="0.82" className="civ-evolved-plate-flow" />
                <path d="M9 42 C26 55, 44 57, 60 45 C74 36, 86 42, 99 58" fill="none" stroke={`${AFFINITY_META.verdance.hex}48`} strokeLinecap="round" strokeWidth="0.5" />
              </>
            )}
            {(signals.hazard || signals.redaction) && (
              <path
                d="M61 40 C72 31, 85 34, 96 45 C86 52, 76 62, 66 78 C58 66, 55 52, 61 40 Z"
                fill="rgba(255,105,114,0.11)"
                stroke="rgba(255,105,114,0.38)"
                strokeWidth="0.38"
                className="civ-evolved-plate-weather"
              />
            )}
            {signals.luminary && (
              <path d="M14 28 C32 20, 47 25, 63 18 C79 11, 90 18, 101 26" fill="none" stroke={`${secondaryTone}64`} strokeLinecap="round" strokeWidth="0.76" />
            )}
          </g>
        )}
      </svg>
    </div>
  );
}

function CivilizationArchetypeAtmosphereLayer({
  profile,
  scene,
  identity,
  signals,
  scanActive,
}: {
  profile: CivilizationProfile;
  scene: MarketSceneKind;
  identity: CivilizationSceneIdentity;
  signals: CivilizationSceneSignals;
  scanActive: boolean;
}) {
  const archetype = getCivilizationSceneArchetype(profile, identity, signals);
  if (!archetype) return null;

  const visual = CIVILIZATION_ARCHETYPE_VISUALS[archetype];
  const primary = identity.primaryAffinity ? AFFINITY_META[identity.primaryAffinity].hex : AFFINITY_META[visual.affinity].hex;
  const secondary = identity.secondaryAffinity ? AFFINITY_META[identity.secondaryAffinity].hex : '#dfb86b';
  const tone = getCivilizationArchetypeTone(archetype, primary);
  const opacity = scanActive
    ? scene === 'surface' ? 0.5 : 0.38
    : scene === 'surface' ? 0.42 : 0.32;
  const surface = scene === 'surface';
  const wide = scene === 'galaxy' ? 1.28 : scene === 'stellar' ? 1.12 : 1;
  const background = getArchetypeAtmosphereBackground(archetype, scene, tone, primary, secondary, scanActive);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[3]"
      aria-hidden="true"
      data-testid="civilization-archetype-atmosphere"
      data-archetype={archetype}
      data-composition-key={visual.compositionKey}
      data-scene={scene}
      style={{ opacity }}
    >
      <div
        className="absolute inset-0 mix-blend-screen"
        style={{ background }}
      />
      <svg
        className="absolute inset-0 h-full w-full mix-blend-screen"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        {archetype === 'living_arcology' && (
          <g opacity={surface ? 0.72 : 0.58}>
            <path d={`M-4 ${surface ? 83 : 71} C14 ${surface ? 72 : 61}, 30 ${surface ? 78 : 66}, 45 ${surface ? 65 : 58} C59 ${surface ? 53 : 49}, 73 ${surface ? 58 : 52}, 104 ${surface ? 39 : 35}`} fill="none" stroke={`${tone}7A`} strokeLinecap="round" strokeWidth={0.9 * wide} />
            <path d={`M8 ${surface ? 90 : 76} C25 ${surface ? 80 : 66}, 39 ${surface ? 83 : 70}, 57 ${surface ? 72 : 62} C72 ${surface ? 63 : 55}, 84 ${surface ? 66 : 57}, 101 ${surface ? 52 : 44}`} fill="none" stroke="rgba(229,255,238,0.22)" strokeLinecap="round" strokeWidth={0.34 * wide} />
          </g>
        )}
        {archetype === 'forge_spine' && (
          <g opacity={surface ? 0.76 : 0.58}>
            <path d={`M${surface ? 58 : 48} 98 C${surface ? 61 : 53} 76, ${surface ? 66 : 61} 57, ${surface ? 75 : 73} 27`} fill="none" stroke={`${tone}78`} strokeLinecap="round" strokeWidth={1.1 * wide} />
            <path d={`M${surface ? 46 : 35} 94 C${surface ? 58 : 52} 74, ${surface ? 74 : 74} 64, ${surface ? 96 : 94} 48`} fill="none" stroke="rgba(255,244,194,0.24)" strokeLinecap="round" strokeWidth={0.38 * wide} />
            <path d={`M${surface ? 64 : 58} 86 L${surface ? 72 : 66} 57 L${surface ? 82 : 77} 86 Z`} fill={`${tone}10`} stroke={`${tone}62`} strokeLinejoin="round" strokeWidth="0.32" />
          </g>
        )}
        {archetype === 'containment_sentinel' && (
          <g opacity={surface ? 0.72 : 0.56}>
            <ellipse cx={surface ? 75 : 67} cy={surface ? 68 : 58} rx={(surface ? 30 : 25) * wide} ry={(surface ? 10 : 8) * wide} fill="rgba(255,105,114,0.08)" stroke={`${tone}70`} strokeDasharray="4.5 2.6" strokeWidth="0.42" transform={`rotate(-10 ${surface ? 75 : 67} ${surface ? 68 : 58})`} />
            <path d={`M${surface ? 52 : 45} ${surface ? 68 : 59} H${surface ? 98 : 91}`} stroke="rgba(255,255,255,0.18)" strokeLinecap="round" strokeWidth="0.28" />
          </g>
        )}
        {archetype === 'route_network' && (
          <g opacity={surface ? 0.72 : 0.62}>
            <path className="civ-archetype-flow" d={`M-5 ${surface ? 76 : 61} C18 ${surface ? 55 : 44}, 36 ${surface ? 78 : 64}, 58 ${surface ? 61 : 52} C75 ${surface ? 48 : 41}, 87 ${surface ? 58 : 47}, 106 ${surface ? 42 : 34}`} fill="none" stroke={`${tone}80`} strokeLinecap="round" strokeWidth={0.8 * wide} />
            <path d={`M4 ${surface ? 88 : 72} C25 ${surface ? 77 : 63}, 42 ${surface ? 88 : 72}, 61 ${surface ? 76 : 63} C78 ${surface ? 64 : 52}, 91 ${surface ? 72 : 58}, 104 ${surface ? 62 : 48}`} fill="none" stroke="rgba(255,255,255,0.18)" strokeLinecap="round" strokeWidth="0.3" />
          </g>
        )}
        {archetype === 'accord_beacon' && (
          <g opacity={surface ? 0.66 : 0.54}>
            <path d={`M10 ${surface ? 38 : 30} C28 ${surface ? 24 : 19}, 46 ${surface ? 31 : 25}, 63 ${surface ? 19 : 15} C78 ${surface ? 9 : 10}, 91 ${surface ? 20 : 17}, 103 ${surface ? 29 : 24}`} fill="none" stroke={`${tone}76`} strokeLinecap="round" strokeWidth={0.72 * wide} />
            <path d={`M42 ${surface ? 82 : 67} L56 ${surface ? 63 : 52} L72 ${surface ? 80 : 65} L56 ${surface ? 94 : 76} Z`} fill={`${secondary}0F`} stroke="rgba(255,244,194,0.24)" strokeLinejoin="round" strokeWidth="0.28" />
          </g>
        )}
        {archetype === 'archive_lattice' && (
          <g opacity={surface ? 0.68 : 0.54}>
            <path d={`M16 ${surface ? 91 : 75} V${surface ? 58 : 46} H29 V${surface ? 91 : 75} M40 ${surface ? 91 : 75} V${surface ? 48 : 38} H54 V${surface ? 91 : 75} M66 ${surface ? 91 : 75} V${surface ? 56 : 44} H79 V${surface ? 91 : 75}`} fill="rgba(2,7,18,0.38)" stroke={`${tone}78`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.38" />
            <path className="civ-archetype-flow" d={`M10 ${surface ? 84 : 68} C28 ${surface ? 72 : 59}, 46 ${surface ? 78 : 63}, 65 ${surface ? 64 : 53} C80 ${surface ? 53 : 45}, 91 ${surface ? 58 : 49}, 102 ${surface ? 48 : 39}`} fill="none" stroke="rgba(255,255,255,0.18)" strokeLinecap="round" strokeWidth="0.3" />
          </g>
        )}
      </svg>
    </div>
  );
}

function getArchetypeAtmosphereBackground(
  archetype: CivilizationArchetypeId,
  scene: MarketSceneKind,
  tone: string,
  primary: string,
  secondary: string,
  scanActive: boolean,
): string {
  const scanBoost = scanActive ? '28' : '1E';
  if (archetype === 'living_arcology') {
    return [
      `radial-gradient(ellipse at ${scene === 'surface' ? '28% 78%' : '35% 62%'}, ${tone}${scanBoost} 0%, transparent 42%)`,
      `linear-gradient(126deg, transparent 16%, ${primary}12 47%, transparent 84%)`,
    ].join(',');
  }
  if (archetype === 'forge_spine') {
    return [
      `radial-gradient(ellipse at ${scene === 'surface' ? '69% 69%' : '58% 54%'}, ${tone}${scanBoost} 0%, transparent 40%)`,
      'linear-gradient(102deg, transparent 42%, rgba(255,244,194,0.14) 57%, transparent 76%)',
    ].join(',');
  }
  if (archetype === 'containment_sentinel') {
    return [
      `radial-gradient(ellipse at ${scene === 'surface' ? '76% 66%' : '68% 58%'}, ${tone}${scanActive ? '30' : '24'} 0%, rgba(12,4,12,0.22) 32%, transparent 56%)`,
      'linear-gradient(90deg, transparent 0%, rgba(255,105,114,0.06) 35%, rgba(0,0,0,0.18) 65%, transparent 100%)',
    ].join(',');
  }
  if (archetype === 'route_network') {
    return [
      `linear-gradient(118deg, transparent 12%, ${tone}${scanBoost} 38%, ${primary}14 58%, transparent 88%)`,
      `radial-gradient(ellipse at 55% 62%, ${tone}12 0%, transparent 48%)`,
    ].join(',');
  }
  if (archetype === 'accord_beacon') {
    return [
      `radial-gradient(ellipse at 55% 30%, ${tone}${scanBoost} 0%, transparent 42%)`,
      `linear-gradient(142deg, transparent 12%, ${secondary}12 46%, transparent 78%)`,
    ].join(',');
  }
  return [
    `radial-gradient(ellipse at 43% 56%, ${tone}${scanBoost} 0%, transparent 44%)`,
    `linear-gradient(90deg, transparent 10%, ${primary}10 45%, transparent 84%)`,
  ].join(',');
}

function CivilizationScaleFrameLayer({
  scene,
  palette,
  scanActive,
}: {
  scene: MarketSceneKind;
  palette: AffinityPalette;
  scanActive: boolean;
}) {
  const primary = palette.primary;
  const secondary = palette.secondary;
  const opacity = scanActive
    ? 0.08
    : scene === 'surface'
      ? 0.24
      : scene === 'orbit'
        ? 0.18
        : scene === 'stellar'
          ? 0.11
          : 0.08;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[4] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-scale-frame"
      style={{ opacity }}
    >
      {scene === 'surface' && (
        <g>
          <path
            d="M0 75 C18 68, 30 74, 45 65 C62 54, 75 64, 100 54 L100 100 L0 100 Z"
            fill={`${primary}10`}
          />
          <path
            d="M5 92 C22 80, 38 84, 54 74 C70 64, 84 72, 98 61"
            fill="none"
            stroke={`${primary}70`}
            strokeLinecap="round"
            strokeWidth="0.72"
            className="civ-portrait-flow"
          />
          <path
            d="M10 98 C25 90, 42 88, 60 80 M18 96 C30 84, 46 81, 61 67 M30 100 C42 88, 54 85, 69 71 M47 100 C56 91, 68 86, 84 76"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeLinecap="round"
            strokeWidth="0.28"
          />
          {[16, 28, 41, 57, 72, 86].map((x, index) => (
            <path
              key={x}
              d={`M${x} ${83 - (index % 3) * 4} V${70 - (index % 4) * 5}`}
              stroke={index % 2 === 0 ? `${primary}82` : `${secondary}72`}
              strokeLinecap="round"
              strokeWidth={index % 2 === 0 ? 0.54 : 0.38}
            />
          ))}
          <ellipse
            cx="50"
            cy="74"
            rx="34"
            ry="7"
            fill="none"
            stroke="rgba(255,244,194,0.16)"
            strokeDasharray="2.2 2"
            strokeWidth="0.32"
          />
        </g>
      )}
      {scene === 'orbit' && (
        <g>
          <path
            d="M-4 72 C20 55, 42 54, 63 63 C78 70, 91 69, 104 58"
            fill="none"
            stroke={`${primary}70`}
            strokeLinecap="round"
            strokeWidth="0.82"
          />
          <path
            d="M-3 80 C23 64, 46 63, 69 72 C83 77, 94 76, 104 68"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeLinecap="round"
            strokeWidth="0.32"
          />
          <path
            d="M28 64 C36 58, 45 58, 53 63 M35 69 C43 64, 52 64, 61 68"
            fill="none"
            stroke={`${secondary}66`}
            strokeLinecap="round"
            strokeWidth="0.36"
            className="civ-portrait-flow"
          />
          <circle cx="45" cy="61" r="1.2" fill="#fff" opacity="0.72" />
          <circle cx="50" cy="64" r="0.78" fill={primary} opacity="0.74" />
        </g>
      )}
      {scene === 'stellar' && (
        <g>
          <circle cx="28" cy="47" r="6.2" fill="rgba(255,244,194,0.48)" />
          <circle cx="28" cy="47" r="13.5" fill="none" stroke={`${primary}48`} strokeWidth="0.28" />
          <ellipse cx="55" cy="50" rx="37" ry="14" fill="none" stroke={`${primary}62`} strokeWidth="0.42" transform="rotate(-8 55 50)" />
          <ellipse cx="59" cy="50" rx="26" ry="9.5" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="0.22" transform="rotate(-8 59 50)" />
          <path
            d="M35 54 C49 41, 67 45, 86 34"
            fill="none"
            stroke={`${secondary}72`}
            strokeLinecap="round"
            strokeWidth="0.5"
            className="civ-portrait-flow"
          />
          <circle cx="66" cy="50" r="1.15" fill="#fff" opacity="0.72" />
        </g>
      )}
      {scene === 'galaxy' && (
        <g>
          <path
            d="M13 62 C30 42, 49 43, 64 51 C78 59, 88 49, 96 33"
            fill="none"
            stroke={`${primary}5C`}
            strokeLinecap="round"
            strokeWidth="0.82"
            className="civ-portrait-flow"
          />
          <path
            d="M9 42 C25 54, 44 55, 60 45 C73 37, 85 42, 96 57"
            fill="none"
            stroke={`${secondary}4C`}
            strokeLinecap="round"
            strokeWidth="0.56"
          />
          <ellipse cx="52" cy="50" rx="9.5" ry="3.8" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.2)" strokeWidth="0.24" transform="rotate(-12 52 50)" />
          {[23, 36, 49, 62, 75, 88].map((x, index) => (
            <circle
              key={x}
              cx={x}
              cy={index % 2 === 0 ? 55 - index * 2.2 : 40 + index * 2.4}
              r={index === 3 ? 0.85 : 0.52}
              fill={index === 3 ? '#fff' : primary}
              opacity={index === 3 ? 0.82 : 0.58}
            />
          ))}
        </g>
      )}
    </svg>
  );
}

function CivilizationPlateDialectLayer({
  scene,
  identity,
  signals,
  scanActive,
}: {
  scene: MarketSceneKind;
  identity: CivilizationSceneIdentity;
  signals: CivilizationSceneSignals;
  scanActive: boolean;
}) {
  const primary = identity.primaryAffinity ? AFFINITY_META[identity.primaryAffinity].hex : '#82ddff';
  const secondary = identity.secondaryAffinity ? AFFINITY_META[identity.secondaryAffinity].hex : '#dfb86b';
  const routeWeight = Math.min(1, identity.routeScore / 12);
  const fieldWeight = Math.min(1, identity.fieldScore / 12);
  const districtWeight = Math.min(1, identity.districtScore / 12);
  const opacity = scanActive
    ? 0.07
    : scene === 'surface'
      ? 0.16
      : scene === 'orbit'
        ? 0.12
        : scene === 'stellar'
          ? 0.08
          : 0.06;
  const horizonY = scene === 'surface' ? 78 : scene === 'orbit' ? 65 : scene === 'stellar' ? 56 : 52;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[4] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-plate-dialect"
      style={{ opacity }}
    >
      {(districtWeight > 0 || signals.foundry) && (
        <g opacity={0.36 + districtWeight * 0.38}>
          <path
            d={`M0 ${horizonY + 10} C18 ${horizonY + 3}, 34 ${horizonY + 7}, 50 ${horizonY - 1} C68 ${horizonY - 10}, 82 ${horizonY - 2}, 100 ${horizonY - 12} L100 100 L0 100 Z`}
            fill={`${primary}0E`}
          />
          {[12, 21, 34, 47, 62, 76, 89].map((x, index) => (
            <path
              key={x}
              d={`M${x} ${horizonY + 8} V${horizonY - 2 - (index % 4) * 3.2}`}
              stroke={index % 2 === 0 ? `${primary}70` : `${secondary}66`}
              strokeLinecap="round"
              strokeWidth={scene === 'surface' ? 0.36 : 0.24}
            />
          ))}
        </g>
      )}
      {(routeWeight > 0 || signals.route) && (
        <g opacity={0.3 + routeWeight * 0.42}>
          <path
            className="civ-plate-dialect-flow"
            d={`M-6 ${horizonY - 4} C18 ${horizonY - 18}, 34 ${horizonY + 5}, 55 ${horizonY - 7} C75 ${horizonY - 19}, 84 ${horizonY - 3}, 106 ${horizonY - 18}`}
            fill="none"
            stroke={`${AFFINITY_META.continuum.hex}9A`}
            strokeLinecap="round"
            strokeWidth={scene === 'galaxy' ? 0.48 : 0.62}
          />
          <path
            d={`M4 ${horizonY + 3} C24 ${horizonY - 4}, 40 ${horizonY + 9}, 59 ${horizonY} C78 ${horizonY - 8}, 90 ${horizonY + 2}, 104 ${horizonY - 4}`}
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeLinecap="round"
            strokeWidth="0.22"
          />
        </g>
      )}
      {(fieldWeight > 0 || signals.hazard || signals.luminary) && (
        <g opacity={0.26 + fieldWeight * 0.38}>
          <ellipse
            cx={signals.hazard ? 68 : 56}
            cy={scene === 'surface' ? 68 : 52}
            rx={signals.hazard ? 25 : 32}
            ry={signals.hazard ? 8 : 11}
            fill={`${signals.hazard ? AFFINITY_META.abyss.hex : secondary}12`}
            stroke={`${signals.hazard ? AFFINITY_META.abyss.hex : secondary}6A`}
            strokeDasharray={signals.hazard ? '4 2.4' : '2.6 2'}
            strokeWidth="0.34"
            transform={`rotate(${signals.hazard ? -11 : 8} ${signals.hazard ? 68 : 56} ${scene === 'surface' ? 68 : 52})`}
          />
          <ellipse
            cx={signals.luminary ? 42 : 52}
            cy={scene === 'galaxy' ? 44 : 38}
            rx={signals.luminary ? 36 : 22}
            ry={signals.luminary ? 8 : 5}
            fill="none"
            stroke={`${secondary}42`}
            strokeWidth="0.25"
            transform={`rotate(-9 ${signals.luminary ? 42 : 52} ${scene === 'galaxy' ? 44 : 38})`}
          />
        </g>
      )}
      {signals.living && (
        <g opacity={scanActive ? 0.12 : 0.34}>
          <path
            d={`M3 ${horizonY + 2} C20 ${horizonY - 15}, 34 ${horizonY + 4}, 49 ${horizonY - 9} S75 ${horizonY - 6}, 96 ${horizonY - 18}`}
            fill="none"
            stroke={`${AFFINITY_META.verdance.hex}8E`}
            strokeLinecap="round"
            strokeWidth="0.56"
          />
          <path
            d={`M28 ${horizonY - 5} C31 ${horizonY - 12}, 36 ${horizonY - 12}, 39 ${horizonY - 6} M58 ${horizonY - 9} C64 ${horizonY - 15}, 70 ${horizonY - 12}, 72 ${horizonY - 4}`}
            fill="none"
            stroke="rgba(229,255,238,0.24)"
            strokeLinecap="round"
            strokeWidth="0.24"
          />
        </g>
      )}
    </svg>
  );
}

function CivilizationScaleContextLayer({
  scene,
  palette,
  scanActive,
}: {
  scene: MarketSceneKind;
  palette: AffinityPalette;
  scanActive: boolean;
}) {
  const primary = palette.primary;
  const secondary = palette.secondary;
  const opacity = scanActive
    ? scene === 'surface' ? 0.06 : 0.05
    : scene === 'surface'
      ? 0.26
      : scene === 'orbit'
        ? 0.13
        : scene === 'stellar'
          ? 0.09
          : 0.07;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[5] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-scale-context"
      style={{ opacity }}
    >
      {scene === 'surface' && (
        <g>
          <path
            d="M0 96 C13 91, 23 93, 34 88 C45 82, 57 86, 68 80 C80 74, 89 80, 100 72 L100 100 L0 100 Z"
            fill="rgba(2,5,12,0.78)"
          />
          <path
            d="M7 94 V79 H11 V94 M14 94 V73 H20 V94 M24 94 V82 H28 V94 M38 91 V69 H43 V91 M47 90 V75 H53 V90 M73 82 V62 H77 V82 M81 79 V57 H88 V79 M91 76 V66 H95 V76"
            fill="rgba(3,8,18,0.72)"
            stroke={`${primary}78`}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="0.34"
          />
          <path
            d="M5 94 C22 86, 39 90, 56 80 C72 70, 85 73, 99 62"
            fill="none"
            stroke={`${primary}82`}
            strokeLinecap="round"
            strokeWidth="0.56"
            className="civ-native-work-flow"
          />
          <path
            d="M14 86 H20 M38 77 H43 M49 82 H52 M74 69 H77 M83 64 H88"
            stroke="rgba(255,244,194,0.62)"
            strokeLinecap="round"
            strokeWidth="0.28"
          />
          <ellipse
            cx="56"
            cy="83"
            rx="16"
            ry="4.2"
            fill={`${secondary}16`}
            stroke={`${secondary}72`}
            strokeDasharray="2.5 2"
            strokeWidth="0.28"
          />
        </g>
      )}
      {scene === 'orbit' && (
        <g>
          <path
            d="M-5 82 C21 63, 48 66, 70 74 C85 80, 96 75, 105 65"
            fill="none"
            stroke={`${primary}8A`}
            strokeLinecap="round"
            strokeWidth="1.25"
          />
          <path
            d="M-4 88 C23 70, 48 72, 72 82 C86 88, 98 84, 106 76"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeLinecap="round"
            strokeWidth="0.52"
          />
          <ellipse
            cx="56"
            cy="56"
            rx="41"
            ry="10"
            fill="none"
            stroke={`${secondary}72`}
            strokeWidth="0.42"
            transform="rotate(-11 56 56)"
            className="civ-native-work-flow"
          />
          <ellipse
            cx="56"
            cy="56"
            rx="28"
            ry="6.8"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="0.24"
            transform="rotate(-11 56 56)"
          />
          <path
            d="M43 76 C46 66, 49 59, 54 49 C57 43, 60 39, 65 34"
            fill="none"
            stroke="rgba(255,244,194,0.52)"
            strokeLinecap="round"
            strokeWidth="0.5"
          />
          <circle cx="66" cy="34" r="0.9" fill="rgba(255,244,194,0.82)" />
          <circle cx="81" cy="48" r="0.72" fill={primary} />
          <circle cx="30" cy="62" r="0.62" fill={secondary} />
        </g>
      )}
      {scene === 'stellar' && (
        <g>
          <circle cx="32" cy="47" r="5.5" fill="rgba(255,244,194,0.42)" />
          <circle cx="32" cy="47" r="14" fill="none" stroke="rgba(255,244,194,0.2)" strokeWidth="0.26" />
          <ellipse
            cx="56"
            cy="50"
            rx="43"
            ry="15"
            fill="none"
            stroke={`${primary}82`}
            strokeWidth="0.48"
            transform="rotate(-8 56 50)"
            className="civ-native-work-flow"
          />
          <ellipse
            cx="58"
            cy="50"
            rx="28"
            ry="9"
            fill="none"
            stroke={`${secondary}62`}
            strokeWidth="0.34"
            transform="rotate(-8 58 50)"
          />
          <path
            d="M28 64 C42 52, 56 65, 74 52 C84 45, 92 46, 99 40"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeLinecap="round"
            strokeWidth="0.36"
          />
          <path
            d="M64 48 L70 45 L77 47 M46 58 L51 61 L58 59"
            fill="none"
            stroke="rgba(255,244,194,0.5)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="0.32"
          />
          <circle cx="72" cy="49" r="1" fill="#fff" />
          <circle cx="88" cy="42" r="0.7" fill={primary} />
          <circle cx="47" cy="59" r="0.66" fill={secondary} />
        </g>
      )}
      {scene === 'galaxy' && (
        <g>
          <path
            d="M7 63 C23 45, 43 48, 56 52 C72 58, 84 49, 96 31"
            fill="none"
            stroke={`${primary}86`}
            strokeLinecap="round"
            strokeWidth="0.78"
            className="civ-native-work-flow"
          />
          <path
            d="M8 39 C25 54, 42 57, 59 45 C73 35, 86 42, 98 58"
            fill="none"
            stroke={`${secondary}62`}
            strokeLinecap="round"
            strokeWidth="0.52"
          />
          <path
            d="M20 71 C35 59, 48 71, 62 62 C78 52, 87 61, 99 49"
            fill="none"
            stroke="rgba(255,244,194,0.18)"
            strokeLinecap="round"
            strokeWidth="0.36"
          />
          {[
            [18, 57, 0.62],
            [31, 48, 0.86],
            [45, 51, 0.7],
            [58, 51, 1.05],
            [72, 56, 0.72],
            [84, 47, 0.82],
            [94, 34, 0.58],
          ].map(([x, y, r], index) => (
            <circle
              key={`${x}:${y}`}
              cx={x}
              cy={y}
              r={r}
              fill={index === 3 ? 'rgba(255,255,255,0.86)' : primary}
              opacity={index === 3 ? 0.9 : 0.64}
            />
          ))}
          <ellipse
            cx="58"
            cy="51"
            rx="18"
            ry="6"
            fill="rgba(255,255,255,0.04)"
            stroke="rgba(255,255,255,0.16)"
            strokeWidth="0.18"
            transform="rotate(-12 58 51)"
          />
        </g>
      )}
    </svg>
  );
}

function CivilizationSceneDepthCompositionLayer({
  scene,
  palette,
  identity,
  signals,
  scanActive,
}: {
  scene: MarketSceneKind;
  palette: AffinityPalette;
  identity: CivilizationSceneIdentity;
  signals: CivilizationSceneSignals;
  scanActive: boolean;
}) {
  const primary = identity.primaryAffinity ? AFFINITY_META[identity.primaryAffinity].hex : palette.primary;
  const secondary = identity.secondaryAffinity ? AFFINITY_META[identity.secondaryAffinity].hex : palette.secondary;
  const hazardTone = signals.hazard ? AFFINITY_META.abyss.hex : secondary;
  const routeTone = signals.route ? AFFINITY_META.continuum.hex : primary;
  const opacity = scanActive
    ? scene === 'surface' ? 0.07 : 0.06
    : scene === 'surface'
      ? 0.34
      : scene === 'orbit'
        ? 0.18
        : scene === 'stellar'
          ? 0.12
          : 0.09;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[6] h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-depth-composition"
      style={{ opacity }}
    >
      {scene === 'surface' && (
        <g className="civ-depth-composition" style={{ color: primary }}>
          <path
            d="M0 84 C13 78, 25 81, 38 74 C51 67, 64 72, 78 64 C88 58, 95 60, 100 55 L100 100 L0 100 Z"
            fill="rgba(2,5,12,0.72)"
          />
          <path
            d="M3 99 L28 80 L42 100 M20 100 L46 75 L62 100 M47 100 L70 72 L86 100 M74 100 L94 66 L100 76"
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeLinecap="round"
            strokeWidth="0.38"
          />
          <path
            className="civ-depth-flow"
            d="M4 88 C19 80, 31 84, 45 76 C60 67, 76 72, 97 58"
            fill="none"
            stroke={`${routeTone}92`}
            strokeLinecap="round"
            strokeWidth="0.72"
          />
          <path
            d="M9 89 V77 H13 V89 M17 87 V69 H23 V87 M27 85 V73 H31 V85 M36 82 V64 H42 V82 M48 78 V59 H54 V78 M62 74 V55 H68 V74 M78 66 V49 H84 V66 M88 62 V53 H94 V62"
            fill="rgba(3,8,18,0.8)"
            stroke={`${primary}86`}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="0.34"
          />
          {signals.living && (
            <path
              className="civ-depth-pulse"
              d="M6 92 C20 80, 31 92, 46 78 C59 66, 72 80, 96 62"
              fill="none"
              stroke={`${AFFINITY_META.verdance.hex}96`}
              strokeLinecap="round"
              strokeWidth="0.54"
            />
          )}
          {signals.hazard && (
            <ellipse
              className="civ-depth-pulse"
              cx="72"
              cy="77"
              rx="17"
              ry="5.2"
              fill={`${AFFINITY_META.abyss.hex}18`}
              stroke={`${AFFINITY_META.abyss.hex}8A`}
              strokeDasharray="3 2"
              strokeWidth="0.34"
              transform="rotate(-9 72 77)"
            />
          )}
        </g>
      )}

      {scene === 'orbit' && (
        <g className="civ-depth-composition" style={{ color: primary }}>
          <path
            d="M-6 81 C18 66, 42 67, 63 75 C79 81, 91 76, 106 64 L106 100 L-6 100 Z"
            fill="rgba(2,5,12,0.36)"
          />
          <path
            d="M-5 82 C20 65, 43 66, 64 75 C82 82, 94 76, 106 64"
            fill="none"
            stroke={`${primary}8A`}
            strokeLinecap="round"
            strokeWidth="0.88"
          />
          <ellipse
            className="civ-depth-flow"
            cx="55"
            cy="54"
            rx="43"
            ry="11"
            fill="none"
            stroke={`${routeTone}7E`}
            strokeWidth="0.5"
            transform="rotate(-11 55 54)"
          />
          <ellipse
            cx="55"
            cy="54"
            rx="27"
            ry="6.8"
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="0.22"
            transform="rotate(-11 55 54)"
          />
          <path
            d="M43 80 C47 65, 53 51, 64 34"
            fill="none"
            stroke="rgba(255,244,194,0.62)"
            strokeLinecap="round"
            strokeWidth="0.58"
          />
          <path
            d="M61 36 L68 31 L75 34 M40 81 L47 85 L55 83"
            fill="none"
            stroke={`${secondary}8A`}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="0.38"
          />
          <circle cx="64" cy="34" r="1" fill="#fff4c2" />
          {signals.foundry && (
            <path
              className="civ-depth-pulse"
              d="M30 76 C41 65, 54 68, 68 58 C80 50, 91 50, 102 42"
              fill="none"
              stroke={`${AFFINITY_META.flare.hex}78`}
              strokeLinecap="round"
              strokeWidth="0.52"
            />
          )}
          {signals.hazard && (
            <ellipse
              cx="67"
              cy="53"
              rx="20"
              ry="6"
              fill={`${hazardTone}12`}
              stroke={`${hazardTone}78`}
              strokeDasharray="4 2.4"
              strokeWidth="0.34"
              transform="rotate(-11 67 53)"
            />
          )}
        </g>
      )}

      {scene === 'stellar' && (
        <g className="civ-depth-composition" style={{ color: primary }}>
          <circle className="civ-depth-pulse" cx="30" cy="47" r="5.8" fill="rgba(255,244,194,0.5)" />
          <circle cx="30" cy="47" r="15" fill="none" stroke="rgba(255,244,194,0.18)" strokeWidth="0.28" />
          <ellipse
            cx="57"
            cy="50"
            rx="42"
            ry="15"
            fill="none"
            stroke={`${routeTone}74`}
            strokeWidth="0.5"
            transform="rotate(-8 57 50)"
          />
          <ellipse
            className="civ-depth-flow"
            cx="59"
            cy="50"
            rx="30"
            ry="9.2"
            fill="none"
            stroke={`${secondary}68`}
            strokeWidth="0.36"
            transform="rotate(-8 59 50)"
          />
          <path
            d="M17 67 C34 51, 50 69, 68 54 C79 45, 89 45, 99 38"
            fill="none"
            stroke="rgba(255,255,255,0.16)"
            strokeLinecap="round"
            strokeWidth="0.38"
          />
          <path
            d="M53 47 L61 43 L70 46 M41 61 L48 65 L58 62 M77 43 L84 39 L91 41"
            fill="none"
            stroke="rgba(255,244,194,0.48)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="0.34"
          />
          {[44, 58, 72, 86].map((x, index) => (
            <circle
              key={x}
              cx={x}
              cy={index % 2 === 0 ? 58 - index * 3 : 44 + index * 2}
              r={index === 1 ? 1 : 0.68}
              fill={index === 1 ? 'rgba(255,255,255,0.88)' : primary}
              opacity={0.72}
            />
          ))}
          {signals.foundry && (
            <g className="civ-depth-pulse">
              <path d="M41 39 L46 36 M55 34 L62 34 M70 39 L76 42 M47 63 L52 67 M68 60 L74 63" stroke={`${AFFINITY_META.flare.hex}90`} strokeWidth="1.9" strokeLinecap="round" />
              <path d="M41 39 L46 36 M55 34 L62 34 M70 39 L76 42 M47 63 L52 67 M68 60 L74 63" stroke="rgba(255,255,255,0.28)" strokeWidth="0.46" strokeLinecap="round" />
            </g>
          )}
          {signals.hazard && (
            <ellipse
              cx="58"
              cy="50"
              rx="46"
              ry="17"
              fill={`${AFFINITY_META.abyss.hex}0E`}
              stroke={`${AFFINITY_META.abyss.hex}62`}
              strokeWidth="0.34"
              transform="rotate(-8 58 50)"
            />
          )}
        </g>
      )}

      {scene === 'galaxy' && (
        <g className="civ-depth-composition" style={{ color: primary }}>
          <path
            className="civ-depth-pulse"
            d="M6 64 C23 43, 42 47, 57 52 C72 58, 84 49, 97 30"
            fill="none"
            stroke={`${primary}82`}
            strokeLinecap="round"
            strokeWidth="0.88"
          />
          <path
            d="M7 39 C25 55, 43 57, 60 45 C74 35, 86 42, 99 59"
            fill="none"
            stroke={`${secondary}62`}
            strokeLinecap="round"
            strokeWidth="0.58"
          />
          <path
            className="civ-depth-flow"
            d="M18 72 C34 58, 48 72, 63 62 C78 52, 88 62, 100 49"
            fill="none"
            stroke="rgba(255,244,194,0.24)"
            strokeLinecap="round"
            strokeWidth="0.42"
          />
          <ellipse
            cx="57"
            cy="51"
            rx="18"
            ry="6.2"
            fill="rgba(255,255,255,0.045)"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="0.2"
            transform="rotate(-12 57 51)"
          />
          {[17, 30, 44, 58, 72, 85, 95].map((x, index) => (
            <circle
              key={x}
              cx={x}
              cy={index % 2 === 0 ? 57 - index * 2.1 : 39 + index * 2.5}
              r={index === 3 ? 1.05 : 0.58}
              fill={index === 3 ? 'rgba(255,255,255,0.88)' : primary}
              opacity={index === 3 ? 0.92 : 0.66}
            />
          ))}
          {signals.living && (
            <path
              d="M14 66 C32 44, 44 65, 61 48 C73 36, 86 39, 97 28"
              fill="none"
              stroke={`${AFFINITY_META.verdance.hex}72`}
              strokeLinecap="round"
              strokeWidth="0.48"
            />
          )}
          {signals.hazard && (
            <path
              d="M62 35 C72 28, 84 32, 91 42 C81 45, 72 50, 64 57 C60 49, 58 41, 62 35 Z"
              fill={`${AFFINITY_META.abyss.hex}18`}
              stroke={`${AFFINITY_META.abyss.hex}72`}
              strokeWidth="0.28"
            />
          )}
        </g>
      )}
    </svg>
  );
}

function getScaleTheaterSiteAnchor(
  site: CivilizationDeploymentSite,
  index: number,
  count: number,
  scene: MarketSceneKind,
): CivilizationDeploymentAnchor {
  if (scene === 'surface') {
    const spread = count <= 1 ? 0 : (index - (count - 1) / 2) * 15;
    return {
      x: Math.max(18, Math.min(84, site.anchor.x + spread * 0.45)),
      y: Math.max(56, Math.min(91, site.anchor.y + 12 + (index % 2) * 5)),
    };
  }
  if (scene === 'orbit') {
    const anchors = [
      { x: 31, y: 69 },
      { x: 66, y: 33 },
      { x: 76, y: 61 },
      { x: 43, y: 40 },
    ];
    return anchors[index % anchors.length] ?? site.anchor;
  }
  if (scene === 'stellar') {
    const anchors = [
      { x: 36, y: 63 },
      { x: 69, y: 39 },
      { x: 54, y: 73 },
      { x: 82, y: 54 },
    ];
    return anchors[index % anchors.length] ?? site.anchor;
  }
  const anchors = [
    { x: 33, y: 58 },
    { x: 63, y: 43 },
    { x: 74, y: 62 },
    { x: 47, y: 34 },
  ];
  return anchors[index % anchors.length] ?? site.anchor;
}

function SurfaceScaleTheaterMark({
  site,
  index,
  count,
  native,
}: {
  site: CivilizationDeploymentSite;
  index: number;
  count: number;
  native: boolean;
}) {
  const tone = getCivilizationSiteTone(site);
  const anchor = getScaleTheaterSiteAnchor(site, index, count, 'surface');
  const width = native ? 18 : 11;
  const height = native ? 18 : 11;
  const isPin = site.scalePresence === 'artifact_pin';
  const rotation = index % 2 === 0 ? -7 : 8;

  return (
    <g
      className="civ-scale-theater-mark"
      data-testid={native ? 'civilization-scale-theater-native' : 'civilization-scale-theater-aggregate'}
      data-native-scene={getNativeSceneForSite(site)}
      data-site-id={site.id}
      opacity={native ? 0.72 : 0.42}
      style={{ color: tone }}
    >
      {isPin ? (
        <>
          <ellipse
            cx={anchor.x}
            cy={anchor.y + 3}
            rx={width * 0.55}
            ry={height * 0.18}
            fill={`${tone}14`}
            stroke={`${tone}72`}
            strokeDasharray="2 1.8"
            strokeWidth="0.28"
            transform={`rotate(${rotation} ${anchor.x} ${anchor.y + 3})`}
          />
          <path
            d={`M${anchor.x - 7} ${anchor.y + 5} C${anchor.x - 2} ${anchor.y + 1}, ${anchor.x + 3} ${anchor.y + 1}, ${anchor.x + 8} ${anchor.y + 5}`}
            fill="none"
            stroke="rgba(255,255,255,0.24)"
            strokeLinecap="round"
            strokeWidth="0.22"
          />
        </>
      ) : (
        <>
          <path
            d={`M${anchor.x - width * 0.58} ${anchor.y + height * 0.36} L${anchor.x - width * 0.22} ${anchor.y - height * 0.38} L${anchor.x + width * 0.22} ${anchor.y - height * 0.44} L${anchor.x + width * 0.62} ${anchor.y + height * 0.34} Z`}
            fill={`${tone}16`}
            stroke={`${tone}A6`}
            strokeLinejoin="round"
            strokeWidth="0.44"
            transform={`rotate(${rotation} ${anchor.x} ${anchor.y})`}
          />
          <path
            d={`M${anchor.x - width * 0.34} ${anchor.y + height * 0.24} H${anchor.x + width * 0.34} M${anchor.x - width * 0.18} ${anchor.y + height * 0.02} H${anchor.x + width * 0.24} M${anchor.x - width * 0.04} ${anchor.y - height * 0.22} H${anchor.x + width * 0.18}`}
            stroke="rgba(255,255,255,0.28)"
            strokeLinecap="round"
            strokeWidth="0.22"
            transform={`rotate(${rotation} ${anchor.x} ${anchor.y})`}
          />
        </>
      )}
      {site.kind === 'artifact' && (
        <ArtifactMotifGlyph
          site={site}
          x={anchor.x}
          y={anchor.y}
          tone={tone}
          scale={native ? 0.64 : 0.48}
          rotation={rotation}
          emphasis={native ? 1.08 : 0.9}
        />
      )}
    </g>
  );
}

function OrbitScaleTheaterMark({
  site,
  index,
  count,
  native,
}: {
  site: CivilizationDeploymentSite;
  index: number;
  count: number;
  native: boolean;
}) {
  const tone = getCivilizationSiteTone(site);
  const anchor = getScaleTheaterSiteAnchor(site, index, count, 'orbit');
  const rotation = index % 2 === 0 ? -12 : 14;
  const nativeScene = getNativeSceneForSite(site);

  return (
    <g
      className="civ-scale-theater-mark"
      data-testid={native ? 'civilization-scale-theater-native' : 'civilization-scale-theater-aggregate'}
      data-native-scene={nativeScene}
      data-site-id={site.id}
      opacity={native ? 0.62 : 0.38}
      style={{ color: tone }}
    >
      {native ? (
        <>
          <ellipse
            cx={anchor.x}
            cy={anchor.y}
            rx="19"
            ry="5.4"
            fill={`${tone}12`}
            stroke={`${tone}A0`}
            strokeWidth="0.42"
            transform={`rotate(${rotation} ${anchor.x} ${anchor.y})`}
          />
          <path
            className="civ-scale-theater-flow"
            d={`M${Math.max(3, anchor.x - 26)} ${anchor.y + 3} C${anchor.x - 9} ${anchor.y - 6}, ${anchor.x + 9} ${anchor.y + 7}, ${Math.min(97, anchor.x + 29)} ${anchor.y - 4}`}
            fill="none"
            stroke="rgba(255,255,255,0.32)"
            strokeLinecap="round"
            strokeWidth="0.32"
          />
          <circle cx={anchor.x - 8} cy={anchor.y + 1.4} r="0.82" fill={`${tone}C8`} />
          <circle cx={anchor.x + 8} cy={anchor.y - 1.3} r="0.7" fill="rgba(255,255,255,0.78)" />
        </>
      ) : (
        <>
          <path
            d={`M${anchor.x - 9} ${anchor.y + 5} C${anchor.x - 3} ${anchor.y + 1}, ${anchor.x + 4} ${anchor.y + 1}, ${anchor.x + 10} ${anchor.y + 5}`}
            fill="none"
            stroke={`${tone}8C`}
            strokeLinecap="round"
            strokeWidth="0.4"
          />
          <path
            d={`M${anchor.x - 7} ${anchor.y + 8} H${anchor.x + 7} M${anchor.x - 4} ${anchor.y + 6} V${anchor.y + 3} M${anchor.x} ${anchor.y + 6.8} V${anchor.y + 2.4} M${anchor.x + 4} ${anchor.y + 6} V${anchor.y + 3.2}`}
            stroke="rgba(255,255,255,0.24)"
            strokeLinecap="round"
            strokeWidth="0.2"
          />
          <circle cx={anchor.x} cy={anchor.y + 4.3} r="0.72" fill={`${tone}C8`} />
        </>
      )}
      {site.kind === 'artifact' && native && (
        <ArtifactMotifGlyph site={site} x={anchor.x} y={anchor.y} tone={tone} scale={0.54} rotation={rotation} />
      )}
    </g>
  );
}

function StellarScaleTheaterMark({
  site,
  index,
  count,
  native,
}: {
  site: CivilizationDeploymentSite;
  index: number;
  count: number;
  native: boolean;
}) {
  const tone = getCivilizationSiteTone(site);
  const anchor = getScaleTheaterSiteAnchor(site, index, count, 'stellar');
  const nativeScene = getNativeSceneForSite(site);

  return (
    <g
      className="civ-scale-theater-mark"
      data-testid={native ? 'civilization-scale-theater-native' : 'civilization-scale-theater-aggregate'}
      data-native-scene={nativeScene}
      data-site-id={site.id}
      opacity={native ? 0.62 : 0.36}
      style={{ color: tone }}
    >
      {native ? (
        <>
          <path
            className="civ-scale-theater-flow"
            d={`M${Math.max(3, anchor.x - 31)} ${anchor.y + 9} C${anchor.x - 11} ${anchor.y - 12}, ${anchor.x + 14} ${anchor.y + 12}, ${Math.min(98, anchor.x + 34)} ${anchor.y - 8}`}
            fill="none"
            stroke={`${tone}A6`}
            strokeLinecap="round"
            strokeWidth="1.05"
          />
          <path
            d={`M${Math.max(3, anchor.x - 24)} ${anchor.y + 3} C${anchor.x - 8} ${anchor.y - 6}, ${anchor.x + 9} ${anchor.y + 7}, ${Math.min(98, anchor.x + 27)} ${anchor.y - 4}`}
            fill="none"
            stroke="rgba(255,255,255,0.24)"
            strokeLinecap="round"
            strokeWidth="0.28"
          />
          {[0, 0.35, 0.68, 1].map((step) => (
            <circle
              key={step}
              cx={Math.max(5, Math.min(96, anchor.x - 25 + 50 * step))}
              cy={anchor.y + Math.sin(step * Math.PI * 2 + index) * 5}
              r={step === 0.68 ? 1.12 : 0.7}
              fill={step === 0.68 ? 'rgba(255,255,255,0.78)' : `${tone}C0`}
            />
          ))}
        </>
      ) : (
        <>
          <circle cx={anchor.x} cy={anchor.y} r="3.2" fill={`${tone}20`} stroke={`${tone}8E`} strokeWidth="0.28" />
          <ellipse
            cx={anchor.x}
            cy={anchor.y}
            rx="9.6"
            ry="3.2"
            fill="none"
            stroke={`${tone}54`}
            strokeWidth="0.22"
            transform={`rotate(${index % 2 === 0 ? -11 : 13} ${anchor.x} ${anchor.y})`}
          />
          <circle cx={anchor.x + 7} cy={anchor.y - 1.8} r="0.5" fill="rgba(255,255,255,0.62)" />
        </>
      )}
      {site.kind === 'artifact' && native && (
        <ArtifactMotifGlyph site={site} x={anchor.x} y={anchor.y} tone={tone} scale={0.5} rotation={-6} />
      )}
    </g>
  );
}

function GalaxyScaleTheaterMark({
  site,
  index,
  count,
  native,
}: {
  site: CivilizationDeploymentSite;
  index: number;
  count: number;
  native: boolean;
}) {
  const tone = getCivilizationSiteTone(site);
  const anchor = getScaleTheaterSiteAnchor(site, index, count, 'galaxy');
  const nativeScene = getNativeSceneForSite(site);
  const rotation = index % 2 === 0 ? -16 : 18;

  return (
    <g
      className="civ-scale-theater-mark"
      data-testid={native ? 'civilization-scale-theater-native' : 'civilization-scale-theater-aggregate'}
      data-native-scene={nativeScene}
      data-site-id={site.id}
      opacity={native ? 0.58 : 0.32}
      style={{ color: tone }}
    >
      {native ? (
        <>
          <path
            d={`M${anchor.x - 18} ${anchor.y - 5} C${anchor.x - 5} ${anchor.y - 14}, ${anchor.x + 7} ${anchor.y - 13}, ${anchor.x + 19} ${anchor.y - 5} C${anchor.x + 11} ${anchor.y + 8}, ${anchor.x - 10} ${anchor.y + 8}, ${anchor.x - 18} ${anchor.y - 5} Z`}
            fill={`${tone}12`}
            stroke={`${tone}88`}
            strokeWidth="0.34"
            transform={`rotate(${rotation} ${anchor.x} ${anchor.y})`}
          />
          <path
            className="civ-scale-theater-flow"
            d={`M${anchor.x - 22} ${anchor.y + 4} C${anchor.x - 7} ${anchor.y - 8}, ${anchor.x + 8} ${anchor.y + 8}, ${anchor.x + 24} ${anchor.y - 4}`}
            fill="none"
            stroke="rgba(255,255,255,0.28)"
            strokeLinecap="round"
            strokeWidth="0.28"
          />
          <circle cx={anchor.x} cy={anchor.y - 2} r="1.1" fill="rgba(255,255,255,0.78)" />
          <circle cx={anchor.x - 10} cy={anchor.y + 1.5} r="0.62" fill={`${tone}B8`} />
          <circle cx={anchor.x + 10} cy={anchor.y + 1.5} r="0.62" fill={`${tone}B8`} />
        </>
      ) : (
        <>
          <ellipse
            cx={anchor.x}
            cy={anchor.y}
            rx="8.4"
            ry="3.1"
            fill={`${tone}10`}
            stroke={`${tone}5C`}
            strokeWidth="0.22"
            transform={`rotate(${rotation} ${anchor.x} ${anchor.y})`}
          />
          <circle cx={anchor.x - 4} cy={anchor.y + 0.5} r="0.55" fill={`${tone}A8`} />
          <circle cx={anchor.x + 0.5} cy={anchor.y - 1} r="0.66" fill="rgba(255,255,255,0.66)" />
          <circle cx={anchor.x + 4.6} cy={anchor.y + 1.2} r="0.48" fill={`${tone}88`} />
        </>
      )}
      {site.kind === 'artifact' && native && (
        <ArtifactMotifGlyph site={site} x={anchor.x} y={anchor.y - 0.5} tone={tone} scale={0.48} rotation={rotation} />
      )}
    </g>
  );
}

function ScaleTheaterMark({
  site,
  index,
  count,
  scene,
  native,
}: {
  site: CivilizationDeploymentSite;
  index: number;
  count: number;
  scene: MarketSceneKind;
  native: boolean;
}) {
  if (scene === 'surface') {
    return <SurfaceScaleTheaterMark site={site} index={index} count={count} native={native} />;
  }
  if (scene === 'orbit') {
    return <OrbitScaleTheaterMark site={site} index={index} count={count} native={native} />;
  }
  if (scene === 'stellar') {
    return <StellarScaleTheaterMark site={site} index={index} count={count} native={native} />;
  }
  return <GalaxyScaleTheaterMark site={site} index={index} count={count} native={native} />;
}

function CivilizationScaleTheaterLayer({
  sites,
  scene,
  scanActive,
  recentSiteIds,
  maxSites,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: MarketSceneKind;
  scanActive: boolean;
  recentSiteIds: readonly string[];
  maxSites: number;
}) {
  const theaterSites = React.useMemo(() => (
    sites.filter((site) => isSiteAvailableInScene(site, scene))
  ), [sites, scene]);
  const nativeSites = React.useMemo(() => (
    selectIntegratedConsequenceSites(
      theaterSites.filter((site) => getNativeSceneForSite(site) === scene),
      scene,
      maxSites,
      recentSiteIds,
    )
  ), [theaterSites, scene, maxSites, recentSiteIds]);
  const aggregateSites = React.useMemo(() => (
    selectIntegratedConsequenceSites(
      theaterSites.filter((site) => getSceneIndex(getNativeSceneForSite(site)) < getSceneIndex(scene)),
      scene,
      Math.max(1, Math.min(3, maxSites)),
      recentSiteIds,
    )
  ), [theaterSites, scene, maxSites, recentSiteIds]);

  if (nativeSites.length === 0 && aggregateSites.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[7] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-scale-theater"
      data-scene={scene}
      data-native-count={nativeSites.length}
      data-aggregate-count={aggregateSites.length}
      style={{
        opacity: scanActive
          ? 0.46
          : scene === 'surface'
            ? 0.72
            : scene === 'orbit'
              ? 0.62
              : scene === 'stellar'
                ? 0.5
                : 0.44,
      }}
    >
      {aggregateSites.map((site, index) => (
        <ScaleTheaterMark
          key={`aggregate:${site.id}`}
          site={site}
          index={index}
          count={aggregateSites.length}
          scene={scene}
          native={false}
        />
      ))}
      {nativeSites.map((site, index) => (
        <ScaleTheaterMark
          key={`native:${site.id}`}
          site={site}
          index={index}
          count={nativeSites.length}
          scene={scene}
          native
        />
      ))}
    </svg>
  );
}

function CivilizationTraitDialectMark({
  trait,
  index,
  scene,
  compact,
}: {
  trait: CivilizationDeploymentSite['trait'];
  index: number;
  scene: MarketSceneKind;
  compact: boolean;
}) {
  const tone = getTraitDialectTone(trait);
  const wide = scene === 'galaxy' ? 1.35 : scene === 'stellar' ? 1.18 : scene === 'orbit' ? 1.08 : 1;
  const yBase = scene === 'surface' ? 72 : scene === 'galaxy' ? 48 : 56;
  const xShift = (index - 1) * (compact ? 10 : 14);
  const opacity = compact ? Math.max(0.1, 0.2 - index * 0.04) : Math.max(0.12, 0.28 - index * 0.05);

  if (trait === 'transit' || trait === 'chronology' || trait === 'aperture') {
    const y = yBase - index * 8;
    return (
      <g className="civ-dialect-field" opacity={opacity} style={{ color: tone }}>
        <path
          className="civ-dialect-flow"
          d={`M${Math.max(-8, 10 + xShift)} ${y + 10} C${28 + xShift} ${y - 10}, ${52 + xShift} ${y + 14}, ${Math.min(108, 88 + xShift)} ${y - 8}`}
          fill="none"
          stroke={`${tone}9A`}
          strokeLinecap="round"
          strokeWidth={compact ? 0.7 : 0.9}
        />
        <path
          d={`M${Math.max(-4, 18 + xShift)} ${y + 3} C${34 + xShift} ${y - 3}, ${55 + xShift} ${y + 6}, ${Math.min(104, 80 + xShift)} ${y - 3}`}
          fill="none"
          stroke="rgba(255,255,255,0.16)"
          strokeLinecap="round"
          strokeWidth="0.24"
        />
      </g>
    );
  }

  if (trait === 'biosphere' || trait === 'replication') {
    const y = scene === 'surface' ? 66 + index * 5 : 58 + index * 4;
    return (
      <g className="civ-dialect-field" opacity={opacity} style={{ color: tone }}>
        <path
          d={`M${Math.max(-4, 6 + xShift)} ${y + 8} C${25 + xShift} ${y - 16}, ${43 + xShift} ${y + 13}, ${62 + xShift} ${y - 5} S${86 + xShift} ${y + 1}, ${Math.min(106, 98 + xShift)} ${y - 13}`}
          fill="none"
          stroke={`${tone}9A`}
          strokeLinecap="round"
          strokeWidth={compact ? 0.78 : 1.05}
        />
        <path
          d={`M${30 + xShift} ${y - 4} C${33 + xShift} ${y - 11}, ${39 + xShift} ${y - 11}, ${42 + xShift} ${y - 5} M${63 + xShift} ${y - 2} C${72 + xShift} ${y - 8}, ${79 + xShift} ${y - 4}, ${82 + xShift} ${y + 3}`}
          fill="none"
          stroke="rgba(229,255,238,0.2)"
          strokeLinecap="round"
          strokeWidth="0.28"
        />
      </g>
    );
  }

  if (trait === 'containment' || trait === 'veil' || trait === 'entropy') {
    const x = 58 + xShift * 0.5;
    const y = scene === 'galaxy' ? 51 : 62 - index * 5;
    return (
      <g className="civ-dialect-field" opacity={opacity} style={{ color: tone }}>
        <ellipse
          cx={x}
          cy={y}
          rx={(compact ? 18 : 25) * wide}
          ry={(compact ? 5.5 : 7.5) * wide}
          fill={`${tone}10`}
          stroke={`${tone}72`}
          strokeWidth="0.46"
          strokeDasharray={trait === 'veil' ? '3 2' : '5 3'}
          transform={`rotate(${-10 + index * 8} ${x} ${y})`}
        />
        <path
          d={`M${x - 19 * wide} ${y - 5} L${x + 20 * wide} ${y + 6} M${x - 18 * wide} ${y + 6} L${x + 19 * wide} ${y - 5}`}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeLinecap="round"
          strokeWidth="0.24"
          transform={`rotate(${-10 + index * 8} ${x} ${y})`}
        />
      </g>
    );
  }

  if (trait === 'archive' || trait === 'lattice' || trait === 'accord') {
    const x = 28 + index * 18 + xShift * 0.2;
    const y = scene === 'surface' ? 74 : 64;
    const columns = compact ? [-6, 0, 6] : [-10, -5, 0, 5, 10];
    return (
      <g className="civ-dialect-field" opacity={opacity} style={{ color: tone }}>
        <path
          d={`M${x - 18} ${y + 8} C${x - 8} ${y + 2}, ${x + 8} ${y + 2}, ${x + 18} ${y + 8}`}
          fill="none"
          stroke={`${tone}84`}
          strokeLinecap="round"
          strokeWidth="0.58"
        />
        {columns.map((dx, columnIndex) => (
          <path
            key={dx}
            d={`M${x + dx} ${y + 7} V${y - 3 - (columnIndex % 2) * 4}`}
            stroke={columnIndex === Math.floor(columns.length / 2) ? 'rgba(255,255,255,0.3)' : `${tone}74`}
            strokeLinecap="round"
            strokeWidth={columnIndex === Math.floor(columns.length / 2) ? 0.38 : 0.28}
          />
        ))}
      </g>
    );
  }

  const x = 30 + index * 18 + xShift * 0.2;
  const y = scene === 'surface' ? 70 : 58;
  return (
    <g className="civ-dialect-field" opacity={opacity} style={{ color: tone }}>
      <path
        d={`M${x} ${y + 12} L${x - 4.2 * wide} ${y + 2} L${x} ${y - 13} L${x + 4.2 * wide} ${y + 2} Z`}
        fill={`${tone}13`}
        stroke={`${tone}84`}
        strokeWidth="0.4"
      />
      <path
        d={`M${x - 13 * wide} ${y + 7} C${x - 5 * wide} ${y + 1}, ${x - 4 * wide} ${y - 7}, ${x} ${y - 13} M${x + 13 * wide} ${y + 7} C${x + 5 * wide} ${y + 1}, ${x + 4 * wide} ${y - 7}, ${x} ${y - 13}`}
        fill="none"
        stroke="rgba(255,244,194,0.18)"
        strokeLinecap="round"
        strokeWidth="0.28"
      />
    </g>
  );
}

function CivilizationTraitDialectLayer({
  profile,
  scene,
  compact,
}: {
  profile: CivilizationProfile;
  scene: MarketSceneKind;
  compact: boolean;
}) {
  const dominantTraits = profile.dominantTraits.slice(0, compact ? 2 : 3);
  if (dominantTraits.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[5] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-trait-dialect"
    >
      {dominantTraits.map((trait, index) => (
        <CivilizationTraitDialectMark
          key={trait}
          trait={trait}
          index={index}
          scene={scene}
          compact={compact}
        />
      ))}
    </svg>
  );
}

function CivilizationArchetypeCompositionLayer({
  profile,
  scene,
  identity,
  signals,
  scanActive,
}: {
  profile: CivilizationProfile;
  scene: MarketSceneKind;
  identity: CivilizationSceneIdentity;
  signals: CivilizationSceneSignals;
  scanActive: boolean;
}) {
  const archetype = getCivilizationSceneArchetype(profile, identity, signals);
  if (!archetype) return null;

  const archetypeVisual = CIVILIZATION_ARCHETYPE_VISUALS[archetype];
  const archetypeArtSlot = getCivilizationArchetypeArtSlot(archetype, scene);
  const primary = identity.primaryAffinity ? AFFINITY_META[identity.primaryAffinity].hex : '#82ddff';
  const secondary = identity.secondaryAffinity ? AFFINITY_META[identity.secondaryAffinity].hex : '#dfb86b';
  const tone = getCivilizationArchetypeTone(archetype, primary);
  const opacity = scanActive ? 0.22 : scene === 'surface' ? 0.48 : 0.4;
  const horizon = scene === 'surface' ? 77 : scene === 'orbit' ? 66 : scene === 'stellar' ? 58 : 54;
  const wide = scene === 'galaxy' ? 1.22 : scene === 'stellar' ? 1.12 : 1;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[4] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-archetype-composition"
      data-archetype={archetype}
      data-asset-slot={archetypeArtSlot.id}
      data-art-resolution={archetypeArtSlot.resolution}
      data-composition-key={archetypeVisual.compositionKey}
      data-scene={scene}
      style={{ opacity }}
    >
      {archetype === 'living_arcology' && (
        <g className="civ-archetype-composition" data-testid="civilization-archetype-living">
          <path
            d={`M-4 ${horizon + 11} C12 ${horizon + 2}, 22 ${horizon + 7}, 34 ${horizon - 2} C48 ${horizon - 13}, 61 ${horizon - 5}, 73 ${horizon - 15} C84 ${horizon - 24}, 93 ${horizon - 17}, 104 ${horizon - 27} L104 100 L-4 100 Z`}
            fill={`${tone}16`}
          />
          <path
            className="civ-archetype-flow"
            d={`M5 ${horizon + 7} C18 ${horizon - 4}, 30 ${horizon + 7}, 43 ${horizon - 5} S66 ${horizon - 11}, 92 ${horizon - 25}`}
            fill="none"
            stroke={`${tone}9A`}
            strokeLinecap="round"
            strokeWidth={0.7 * wide}
          />
          <path
            d={`M25 ${horizon + 2} C29 ${horizon - 9}, 36 ${horizon - 9}, 39 ${horizon - 1} M56 ${horizon - 7} C64 ${horizon - 17}, 70 ${horizon - 12}, 72 ${horizon - 3}`}
            fill="none"
            stroke="rgba(229,255,238,0.34)"
            strokeLinecap="round"
            strokeWidth="0.32"
          />
          {[28, 41, 59, 74].map((x, index) => (
            <path
              key={x}
              d={`M${x} ${horizon + 9} C${x - 3} ${horizon - 2}, ${x + 3} ${horizon - 9 - index}, ${x + 1} ${horizon - 20 - index}`}
              fill="none"
              stroke={index % 2 === 0 ? `${tone}72` : 'rgba(229,255,238,0.36)'}
              strokeLinecap="round"
              strokeWidth={index === 2 ? 0.52 : 0.34}
            />
          ))}
        </g>
      )}
      {archetype === 'forge_spine' && (
        <g className="civ-archetype-composition" data-testid="civilization-archetype-forge">
          <path
            d={`M${scene === 'surface' ? 54 : 62} ${horizon + 18} C${scene === 'surface' ? 56 : 59} ${horizon + 2}, ${scene === 'surface' ? 63 : 65} ${horizon - 15}, ${scene === 'surface' ? 74 : 78} ${horizon - 34}`}
            fill="none"
            stroke={`${tone}8C`}
            strokeLinecap="round"
            strokeWidth={0.92 * wide}
          />
          <path
            d={`M${scene === 'surface' ? 45 : 48} ${horizon + 13} C${scene === 'surface' ? 58 : 62} ${horizon - 3}, ${scene === 'surface' ? 69 : 73} ${horizon - 13}, ${scene === 'surface' ? 88 : 96} ${horizon - 24}`}
            fill="none"
            stroke="rgba(255,244,194,0.24)"
            strokeLinecap="round"
            strokeWidth="0.36"
          />
          <path
            d={`M${scene === 'surface' ? 60 : 70} ${horizon + 12} L${scene === 'surface' ? 67 : 76} ${horizon - 10} L${scene === 'surface' ? 76 : 85} ${horizon + 11} Z`}
            fill={`${tone}18`}
            stroke={`${tone}88`}
            strokeLinejoin="round"
            strokeWidth="0.48"
          />
          <path
            d={`M${scene === 'surface' ? 38 : 42} ${horizon + 15} C${scene === 'surface' ? 52 : 56} ${horizon + 5}, ${scene === 'surface' ? 68 : 73} ${horizon + 5}, ${scene === 'surface' ? 91 : 99} ${horizon - 8}`}
            fill="none"
            stroke={`${secondary}6E`}
            strokeLinecap="round"
            strokeWidth="0.78"
            className="civ-archetype-flow"
          />
          <circle cx={scene === 'surface' ? 67 : 76} cy={horizon - 10} r="2.1" fill="#fff" opacity="0.62" />
        </g>
      )}
      {archetype === 'containment_sentinel' && (
        <g className="civ-archetype-composition" data-testid="civilization-archetype-containment">
          <ellipse
            cx={scene === 'surface' ? 75 : scene === 'galaxy' ? 66 : 72}
            cy={scene === 'surface' ? 66 : scene === 'galaxy' ? 55 : 62}
            rx={(scene === 'galaxy' ? 25 : 30) * wide}
            ry={(scene === 'surface' ? 10 : 8) * wide}
            fill="rgba(255,105,114,0.08)"
            stroke={`${tone}84`}
            strokeDasharray="4 2.4"
            strokeWidth="0.5"
            transform={`rotate(${scene === 'galaxy' ? -18 : -9} ${scene === 'surface' ? 75 : scene === 'galaxy' ? 66 : 72} ${scene === 'surface' ? 66 : scene === 'galaxy' ? 55 : 62})`}
          />
          <path
            className="civ-archetype-flow"
            d={`M${scene === 'galaxy' ? 49 : 50} ${scene === 'surface' ? 68 : 62} H${scene === 'galaxy' ? 91 : 98}`}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeLinecap="round"
            strokeWidth="0.32"
          />
          <path
            d={`M${scene === 'galaxy' ? 58 : 67} ${scene === 'surface' ? 56 : 52} C${scene === 'galaxy' ? 70 : 79} ${scene === 'surface' ? 47 : 47}, ${scene === 'galaxy' ? 84 : 91} ${scene === 'surface' ? 52 : 52}, ${scene === 'galaxy' ? 96 : 101} ${scene === 'surface' ? 64 : 63}`}
            fill="none"
            stroke="rgba(255,105,114,0.34)"
            strokeLinecap="round"
            strokeWidth="0.48"
          />
          {[0, 1, 2].map((ring) => (
            <ellipse
              key={ring}
              cx={scene === 'surface' ? 75 : scene === 'galaxy' ? 66 : 72}
              cy={scene === 'surface' ? 66 : scene === 'galaxy' ? 55 : 62}
              rx={(14 + ring * 8) * wide}
              ry={(4.2 + ring * 2.4) * wide}
              fill="none"
              stroke={ring === 1 ? 'rgba(255,255,255,0.22)' : `${tone}58`}
              strokeDasharray={ring === 2 ? '2.6 2.2' : undefined}
              strokeWidth="0.24"
              transform={`rotate(${scene === 'galaxy' ? -18 : -9} ${scene === 'surface' ? 75 : scene === 'galaxy' ? 66 : 72} ${scene === 'surface' ? 66 : scene === 'galaxy' ? 55 : 62})`}
            />
          ))}
        </g>
      )}
      {archetype === 'route_network' && (
        <g className="civ-archetype-composition" data-testid="civilization-archetype-route">
          <path
            className="civ-archetype-flow"
            d={`M-5 ${horizon + 2} C18 ${horizon - 16}, 34 ${horizon + 8}, 56 ${horizon - 4} C76 ${horizon - 16}, 88 ${horizon - 1}, 106 ${horizon - 13}`}
            fill="none"
            stroke={`${tone}9C`}
            strokeLinecap="round"
            strokeWidth={0.84 * wide}
          />
          <path
            d={`M7 ${horizon + 9} C26 ${horizon + 1}, 42 ${horizon + 13}, 61 ${horizon + 3} C78 ${horizon - 5}, 90 ${horizon + 5}, 104 ${horizon - 2}`}
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeLinecap="round"
            strokeWidth="0.3"
          />
          {[22, 43, 63, 84].map((x, index) => (
            <circle key={x} cx={x} cy={horizon + (index % 2 === 0 ? -2 : 3)} r={index === 2 ? 1.1 : 0.72} fill={index === 2 ? '#fff' : tone} opacity="0.8" />
          ))}
          {[31, 67, 91].map((x, index) => (
            <ellipse
              key={x}
              cx={x}
              cy={horizon + (index === 1 ? -5 : 2)}
              rx={index === 1 ? 4.8 : 3.2}
              ry={index === 1 ? 1.8 : 1.2}
              fill="none"
              stroke={`${tone}72`}
              strokeWidth="0.28"
              transform={`rotate(${index === 1 ? -18 : 12} ${x} ${horizon + (index === 1 ? -5 : 2)})`}
            />
          ))}
        </g>
      )}
      {archetype === 'accord_beacon' && (
        <g className="civ-archetype-composition" data-testid="civilization-archetype-accord">
          <path
            d={`M14 ${horizon - 18} C30 ${horizon - 27}, 47 ${horizon - 22}, 60 ${horizon - 30} C75 ${horizon - 39}, 87 ${horizon - 32}, 99 ${horizon - 24}`}
            fill="none"
            stroke={`${tone}82`}
            strokeLinecap="round"
            strokeWidth="0.66"
          />
          <path
            d={`M24 ${horizon + 2} C38 ${horizon - 16}, 58 ${horizon - 14}, 74 ${horizon + 1}`}
            fill={`${secondary}0F`}
            stroke="rgba(255,244,194,0.24)"
            strokeLinecap="round"
            strokeWidth="0.32"
          />
          {[26, 44, 62, 80].map((x, index) => (
            <circle key={x} cx={x} cy={horizon - 17 - (index % 2) * 8} r={index === 1 ? 1.1 : 0.72} fill={index === 1 ? '#fff' : tone} opacity="0.82" />
          ))}
          <path
            d={`M48 ${horizon + 5} L58 ${horizon - 7} L70 ${horizon + 4} L58 ${horizon + 16} Z`}
            fill={`${tone}16`}
            stroke={`${tone}76`}
            strokeLinejoin="round"
            strokeWidth="0.36"
          />
        </g>
      )}
      {archetype === 'archive_lattice' && (
        <g className="civ-archetype-composition" data-testid="civilization-archetype-archive">
          <path
            d={`M18 ${horizon + 12} V${horizon - 12} H29 V${horizon + 12} M38 ${horizon + 12} V${horizon - 22} H51 V${horizon + 12} M61 ${horizon + 12} V${horizon - 15} H73 V${horizon + 12}`}
            fill="rgba(3,8,18,0.48)"
            stroke={`${tone}80`}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="0.42"
          />
          <path
            className="civ-archetype-flow"
            d={`M12 ${horizon + 15} C30 ${horizon + 5}, 46 ${horizon + 10}, 63 ${horizon - 1} C76 ${horizon - 9}, 88 ${horizon - 5}, 99 ${horizon - 13}`}
            fill="none"
            stroke="rgba(255,255,255,0.2)"
            strokeLinecap="round"
            strokeWidth="0.32"
          />
          {[21, 44, 67].map((x, index) => (
            <path
              key={x}
              d={`M${x - 5} ${horizon - 4 - index * 3} H${x + 7} M${x - 5} ${horizon + 4 - index * 3} H${x + 7}`}
              fill="none"
              stroke={`${tone}64`}
              strokeLinecap="round"
              strokeWidth="0.24"
            />
          ))}
        </g>
      )}
    </svg>
  );
}

function CivilizationIdentityAtmosphereLayer({
  identity,
  palette,
}: {
  identity: CivilizationSceneIdentity;
  palette: AffinityPalette;
}) {
  const primaryColor = identity.primaryAffinity ? AFFINITY_META[identity.primaryAffinity].hex : palette.primary;
  const secondaryColor = identity.secondaryAffinity ? AFFINITY_META[identity.secondaryAffinity].hex : palette.secondary;
  const routeOpacity = Math.min(0.15, 0.04 + identity.routeScore * 0.004);
  const fieldOpacity = Math.min(0.16, 0.04 + identity.fieldScore * 0.004 + identity.luminaryCount * 0.014);
  const districtOpacity = Math.min(0.14, 0.035 + identity.districtScore * 0.004 + identity.blueprintCount * 0.01);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[8] overflow-hidden mix-blend-screen"
      data-testid="civilization-identity-atmosphere"
      aria-hidden="true"
    >
      <div
        className="civ-identity-weather absolute -inset-[8%]"
        style={{
          background: [
            `radial-gradient(circle at 30% 35%, ${primaryColor}2E, transparent 34%)`,
            `radial-gradient(circle at 72% 62%, ${secondaryColor}22, transparent 38%)`,
            `linear-gradient(105deg, transparent 12%, ${primaryColor}16 42%, ${secondaryColor}12 68%, transparent 92%)`,
          ].join(','),
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M-4 72 C18 58, 33 66, 48 52 C65 36, 78 45, 104 28"
          fill="none"
          stroke={primaryColor}
          strokeLinecap="round"
          strokeWidth="0.7"
          opacity={routeOpacity}
        />
        <path
          d="M-2 34 C20 42, 38 25, 56 38 C72 49, 86 35, 104 44"
          fill="none"
          stroke={secondaryColor}
          strokeLinecap="round"
          strokeWidth="0.48"
          opacity={fieldOpacity}
        />
        <ellipse
          cx="52"
          cy="69"
          rx="22"
          ry="5.5"
          fill={primaryColor}
          opacity={districtOpacity}
        />
      </svg>
    </div>
  );
}

function getProjectWashStyle(
  site: CivilizationDeploymentSite,
  index: number,
  scene: MarketSceneKind,
  scanActive: boolean,
): React.CSSProperties {
  const tone = getCivilizationSiteTone(site);
  const isBlueprint = site.kind === 'blueprint' || site.kind === 'protocol' || site.kind === 'chronicle';
  const sceneScale = scene === 'galaxy' ? 1.18 : scene === 'stellar' ? 1.08 : 1;
  const rotation = ((index % 5) - 2) * 13;
  const localTrace = site.representationMode === 'local_trace';
  const route = isRouteTrait(site);
  const field = isFieldTrait(site);
  const district = isDistrictTrait(site);
  const width = localTrace
    ? 9
    : isBlueprint
      ? 28 * sceneScale
      : site.kind === 'luminary'
        ? 34 * sceneScale
        : route
          ? 28 * sceneScale
          : field
            ? 22 * sceneScale
            : district
              ? 18 * sceneScale
              : 18 * sceneScale;
  const height = localTrace
    ? 6
    : isBlueprint
      ? 10 * sceneScale
      : site.kind === 'luminary'
        ? 14 * sceneScale
        : route
          ? 7 * sceneScale
          : field
            ? 9 * sceneScale
            : district
              ? 7 * sceneScale
              : 8 * sceneScale;
  const opacity = scanActive
    ? localTrace ? 0.14 : 0.12
    : localTrace ? 0.18 : isBlueprint ? 0.23 : site.kind === 'luminary' ? 0.18 : 0.12;
  const background = site.blueprintId === 'bp_antimatter_detonator'
    ? `radial-gradient(ellipse at 50% 50%, ${tone}52 0%, ${tone}24 36%, transparent 72%),
       linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 46%, ${tone}42 50%, rgba(255,255,255,0.08) 54%, transparent 100%)`
    : site.blueprintId === 'bp_mantle_to_orbit_foundry'
      ? `linear-gradient(90deg, transparent 0%, rgba(223,184,107,0.1) 22%, rgba(255,228,163,0.34) 50%, rgba(223,184,107,0.1) 78%, transparent 100%),
         radial-gradient(ellipse at 50% 84%, rgba(223,184,107,0.3) 0%, transparent 58%)`
      : site.kind === 'luminary'
        ? `radial-gradient(ellipse at 50% 50%, ${tone}36 0%, ${tone}18 42%, transparent 72%)`
        : route
          ? `linear-gradient(90deg, transparent 0%, ${tone}18 20%, ${tone}4A 50%, ${tone}18 80%, transparent 100%)`
          : field
            ? `radial-gradient(ellipse at 50% 50%, ${tone}38 0%, ${tone}16 44%, transparent 76%)`
            : district
              ? `radial-gradient(ellipse at 50% 55%, ${tone}32 0%, ${tone}18 38%, transparent 72%)`
              : `radial-gradient(ellipse at 50% 50%, ${tone}30 0%, transparent 70%)`;

  return {
    background,
    borderRadius: route || isBlueprint ? '999px' : '45%',
    filter: localTrace ? `drop-shadow(0 0 8px ${tone}66)` : `blur(6px) drop-shadow(0 0 18px ${tone}2E)`,
    height: `${height}%`,
    left: `${site.anchor.x}%`,
    opacity,
    top: `${site.anchor.y}%`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    width: `${width}%`,
  };
}

function CivilizationProjectWashLayer({
  sites,
  scene,
  scanActive,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: MarketSceneKind;
  scanActive: boolean;
}) {
  if (sites.length === 0) return null;
  return (
    <div
      className="pointer-events-none absolute inset-0 z-[8] overflow-hidden mix-blend-screen"
      data-testid="civilization-project-washes"
      aria-hidden="true"
    >
      {sites.map((site, index) => (
        <span
          key={site.id}
          className="civ-project-wash absolute"
          style={{
            ...getProjectWashStyle(site, index, scene, scanActive),
            animationDelay: `${(index % 5) * -1.6}s`,
          }}
        />
      ))}
    </div>
  );
}

function getSignatureAtmosphereStyle(
  descriptor: CivilizationVisualSignatureDescriptor,
  index: number,
  scene: MarketSceneKind,
  scanActive: boolean,
): React.CSSProperties {
  const { site, kind } = descriptor;
  const color = getCivilizationSiteTone(site);
  const wide = scene === 'galaxy' ? 1.22 : scene === 'stellar' ? 1.12 : 1;
  const localTrace = descriptor.sourceKind === 'artifact' && site.representationMode === 'local_trace';
  const dominantBlueprint = descriptor.sourceKind === 'blueprint' && hasDominantBlueprintMark(site);
  const width = kind === 'quarantine'
    ? 40 * wide
    : kind === 'foundry'
      ? scene === 'surface' || scene === 'orbit'
        ? (dominantBlueprint && !scanActive ? 15 : 22) * wide
        : 34 * wide
      : kind === 'luminary'
        ? 46 * wide
        : localTrace
          ? 13 * wide
          : 34 * wide;
  const height = kind === 'foundry'
    ? scene === 'surface' || scene === 'orbit'
      ? (dominantBlueprint && !scanActive ? 38 : 58) * wide
      : 12 * wide
    : kind === 'quarantine'
      ? 22 * wide
      : kind === 'luminary'
        ? 18 * wide
        : localTrace
          ? 8 * wide
          : 18 * wide;
  const opacity = scanActive
    ? localTrace ? 0.09 : 0.12
    : kind === 'quarantine'
      ? 0.18
      : kind === 'foundry'
        ? dominantBlueprint ? 0.07 : 0.16
        : kind === 'luminary'
          ? 0.14
          : localTrace
            ? 0.1
            : 0.13;
  const rotation = kind === 'foundry'
    ? scene === 'surface' || scene === 'orbit'
      ? -22 + index * 7
      : -9 + index * 5
    : kind === 'quarantine'
      ? -9
      : ((index % 5) - 2) * 11;
  const background = kind === 'foundry'
    ? scene === 'surface' || scene === 'orbit'
      ? `linear-gradient(180deg, rgba(255,244,194,0.48), ${color}33 30%, transparent 82%),
         radial-gradient(ellipse at 50% 80%, ${color}3A 0%, transparent 64%)`
      : `linear-gradient(90deg, transparent 0%, ${color}24 22%, rgba(255,244,194,0.24) 50%, ${color}1C 78%, transparent 100%),
         radial-gradient(ellipse at 50% 50%, ${color}18 0%, transparent 68%)`
    : kind === 'quarantine'
      ? `radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.16) 0%, ${color}30 14%, rgba(0,0,0,0.18) 38%, transparent 74%)`
      : kind === 'luminary'
        ? `linear-gradient(90deg, transparent 0%, ${color}20 28%, rgba(255,255,255,0.12) 52%, ${color}1B 74%, transparent 100%)`
        : kind === 'biosphere'
          ? `linear-gradient(100deg, transparent 0%, ${color}1E 24%, rgba(229,255,238,0.16) 52%, ${color}18 76%, transparent 100%)`
          : kind === 'transit' || kind === 'aperture'
            ? `linear-gradient(90deg, transparent 0%, ${color}1D 24%, rgba(255,255,255,0.11) 50%, ${color}18 76%, transparent 100%)`
            : kind === 'sealed'
              ? `linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.42) 24%, ${color}1C 50%, rgba(0,0,0,0.42) 76%, transparent 100%)`
              : `radial-gradient(ellipse at 50% 50%, ${color}28 0%, ${color}10 42%, transparent 76%)`;

  return {
    background,
    borderRadius: kind === 'foundry' ? '42% 42% 999px 999px' : '999px',
    filter: localTrace ? `blur(3px) drop-shadow(0 0 10px ${color}44)` : `blur(14px) drop-shadow(0 0 24px ${color}2E)`,
    height: `${height}%`,
    left: `${site.anchor.x}%`,
    opacity: Math.max(0.06, opacity - index * 0.018),
    top: `${site.anchor.y}%`,
    transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
    width: `${width}%`,
  };
}

function CivilizationSignatureAtmosphereLayer({
  sites,
  scene,
  scanActive,
  maxSites,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: MarketSceneKind;
  scanActive: boolean;
  maxSites: number;
}) {
  const signatures = React.useMemo(() => (
    selectCivilizationVisualSignatures(sites, {
      limit: maxSites,
      includeSealed: scanActive,
    }).filter((descriptor) => !(
      !scanActive &&
      descriptor.sourceKind === 'blueprint' &&
      hasDominantBlueprintMark(descriptor.site)
    )).filter((descriptor) => !(
      descriptor.sourceKind === 'artifact' &&
      Boolean(descriptor.site.artifactSceneTreatment)
    ))
  ), [sites, maxSites, scanActive]);

  if (signatures.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[6] overflow-hidden mix-blend-screen"
      data-testid="civilization-signature-atmosphere"
      aria-hidden="true"
    >
      {signatures.map((descriptor, index) => (
        <span
          key={descriptor.site.id}
          className="civ-signature-atmosphere absolute"
          style={{
            ...getSignatureAtmosphereStyle(descriptor, index, scene, scanActive),
            animationDelay: `${(index % 4) * -2.3}s`,
          }}
        />
      ))}
    </div>
  );
}

function getPortraitOpacity(site: CivilizationDeploymentSite, index: number, scanActive: boolean): number {
  const base = scanActive
    ? site.kind === 'blueprint'
      ? 0.5
      : site.kind === 'protocol'
        ? 0.46
        : site.kind === 'luminary'
          ? 0.44
          : site.representationMode === 'local_trace'
            ? 0.34
            : 0.38
    : site.kind === 'blueprint'
      ? 0.36
      : site.kind === 'protocol'
        ? 0.22
        : site.kind === 'luminary'
          ? 0.34
          : site.representationMode === 'local_trace'
            ? 0.24
            : 0.3;
  const falloff = Math.max(0, index - 2) * 0.05;
  return Math.max(scanActive ? 0.18 : 0.16, base - falloff);
}

function BlueprintPortraitMark({
  site,
  scene,
  opacity,
}: {
  site: CivilizationDeploymentSite;
  scene: MarketSceneKind;
  opacity: number;
}) {
  const tone = getCivilizationSiteTone(site);
  const x = site.anchor.x;
  const y = site.anchor.y;
  const sceneWide = scene === 'galaxy' || scene === 'stellar';

  if (site.blueprintId === 'bp_antimatter_detonator') {
    return (
      <g
        className="civ-portrait-loom"
        opacity={opacity}
        style={{ color: tone }}
      >
        <ellipse
          cx={x}
          cy={y}
          rx={sceneWide ? 22 : 17}
          ry={sceneWide ? 6.8 : 5.2}
          fill={`${tone}12`}
          stroke={`${tone}7A`}
          strokeWidth="0.42"
          transform={`rotate(-10 ${x} ${y})`}
        />
        <ellipse
          cx={x}
          cy={y}
          rx={sceneWide ? 13 : 9.4}
          ry={sceneWide ? 3.8 : 2.8}
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="0.18"
          strokeDasharray="2 2.4"
          transform={`rotate(-10 ${x} ${y})`}
        />
        <path
          d={`M${Math.max(3, x - 28)} ${y + 5} C${x - 12} ${y - 7}, ${x + 12} ${y + 10}, ${Math.min(97, x + 30)} ${y - 4}`}
          fill="none"
          stroke={`${tone}72`}
          strokeLinecap="round"
          strokeWidth="0.38"
          strokeDasharray="5 4"
        />
      </g>
    );
  }

  if (site.blueprintId === 'bp_mantle_to_orbit_foundry') {
    const foundryColor = '#dfb86b';
    const baseY = Math.min(92, y + (scene === 'surface' ? 20 : 15));
    const topY = Math.max(8, y - (scene === 'surface' ? 34 : 22));
    return (
      <g
        className="civ-portrait-mark"
        opacity={opacity}
        style={{ color: foundryColor }}
      >
        <path
          className="civ-portrait-flow"
          d={`M${x - 10} ${baseY} C${x - 5} ${y + 5}, ${x + 6} ${y - 8}, ${x + 18} ${topY}`}
          fill="none"
          stroke="rgba(255,228,163,0.68)"
          strokeLinecap="round"
          strokeWidth="0.86"
        />
        <path
          d={`M${x - 5} ${baseY + 1} C${x - 1} ${y + 2}, ${x + 10} ${y - 10}, ${x + 25} ${topY + 5}`}
          fill="none"
          stroke="rgba(255,255,255,0.42)"
          strokeLinecap="round"
          strokeWidth="0.28"
        />
        <path
          d={`M${x - 17} ${baseY} L${x + 1} ${baseY - 4} L${x + 15} ${baseY + 2}`}
          fill="rgba(223,184,107,0.14)"
          stroke="rgba(255,228,163,0.52)"
          strokeLinejoin="round"
          strokeWidth="0.36"
        />
        <circle cx={x + 18} cy={topY} r="0.82" fill="#fff4c2" />
      </g>
    );
  }

  if (site.blueprintId === 'bp_worldshield_covenant') {
    return (
      <g
        className="civ-portrait-mark civ-portrait-signal"
        opacity={opacity}
        style={{ color: tone }}
      >
        <ellipse
          cx={x}
          cy={y}
          rx={sceneWide ? 26 : 20}
          ry={sceneWide ? 12 : 9}
          fill={`${tone}12`}
          stroke={`${tone}B8`}
          strokeWidth="0.48"
        />
        <path
          d={`M${x - 20} ${y - 2} C${x - 6} ${y - 11}, ${x + 7} ${y - 11}, ${x + 22} ${y - 1}`}
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeLinecap="round"
          strokeWidth="0.24"
        />
      </g>
    );
  }

  return (
    <g className="civ-portrait-mark civ-portrait-signal" opacity={opacity} style={{ color: tone }}>
      <ellipse cx={x} cy={y} rx="13" ry="5.2" fill={`${tone}1F`} stroke={`${tone}A6`} strokeWidth="0.42" />
      <path
        d={`M${x - 14} ${y + 2} C${x - 5} ${y - 5}, ${x + 6} ${y + 5}, ${x + 15} ${y - 1}`}
        fill="none"
        stroke={`${tone}AA`}
        strokeLinecap="round"
        strokeWidth="0.42"
      />
    </g>
  );
}

function ProtocolPortraitMark({
  site,
  opacity,
}: {
  site: CivilizationDeploymentSite;
  opacity: number;
}) {
  const tone = getCivilizationSiteTone(site);
  const x = site.anchor.x;
  const y = site.anchor.y;
  return (
    <g className="civ-portrait-mark" opacity={opacity} style={{ color: tone }}>
      <path
        d={`M${x - 14} ${y - 5} H${x + 15} M${x - 19} ${y} H${x + 11} M${x - 10} ${y + 5} H${x + 20}`}
        stroke={`${tone}A8`}
        strokeLinecap="round"
        strokeWidth="0.92"
        strokeDasharray="5 2.4"
      />
      <path
        d={`M${x - 14} ${y - 5} H${x + 15} M${x - 19} ${y} H${x + 11} M${x - 10} ${y + 5} H${x + 20}`}
        stroke="rgba(4,7,15,0.82)"
        strokeLinecap="round"
        strokeWidth="0.34"
        strokeDasharray="1.3 2"
      />
    </g>
  );
}

function CivilizationEnvironmentalSignatureMark({
  descriptor,
  index,
  scene,
  scanActive,
}: {
  descriptor: CivilizationVisualSignatureDescriptor;
  index: number;
  scene: MarketSceneKind;
  scanActive: boolean;
}) {
  const { site, kind } = descriptor;
  const tone = getCivilizationSiteTone(site);
  const x = site.anchor.x;
  const y = site.anchor.y;
  const wide = scene === 'galaxy' ? 1.38 : scene === 'stellar' ? 1.18 : 1;
  const rotation = ((index % 5) - 2) * 8;
  const opacityBase = scanActive
    ? descriptor.sourceKind === 'blueprint' ? 0.28 : 0.2
    : descriptor.sourceKind === 'blueprint' ? 0.34 : descriptor.sourceKind === 'luminary' ? 0.22 : 0.16;
  const opacity = Math.max(scanActive ? 0.12 : 0.14, opacityBase - index * 0.035);

  if (descriptor.sourceKind === 'artifact' && site.representationMode === 'local_trace') {
    const localOpacity = scanActive ? Math.min(0.22, opacity + 0.03) : Math.min(0.2, opacity + 0.02);
    return (
      <g className="civ-environment-signature civ-portrait-signal" opacity={localOpacity} style={{ color: tone }}>
        <ellipse cx={x} cy={y} rx={8.6 * wide} ry={3.2 * wide} fill={`${tone}14`} stroke={`${tone}7C`} strokeWidth="0.26" strokeDasharray="1.2 1.5" transform={`rotate(${rotation} ${x} ${y})`} />
        <path d={`M${x - 6} ${y + 2} C${x - 2} ${y - 1}, ${x + 1} ${y + 2.4}, ${x + 6.6} ${y - 1.2}`} fill="none" stroke="rgba(255,255,255,0.24)" strokeLinecap="round" strokeWidth="0.22" />
        <circle cx={x} cy={y} r="0.78" fill="rgba(255,255,255,0.62)" />
      </g>
    );
  }

  if (kind === 'quarantine') {
    return (
      <g className="civ-environment-signature civ-portrait-loom" opacity={opacity} style={{ color: tone }}>
        <ellipse cx={x} cy={y} rx={30 * wide} ry={8.4 * wide} fill={`${tone}10`} stroke={`${tone}62`} strokeWidth="0.34" strokeDasharray="3.5 2.6" transform={`rotate(${rotation - 8} ${x} ${y})`} />
        <ellipse cx={x} cy={y} rx={18 * wide} ry={4.6 * wide} fill="rgba(0,0,0,0.18)" stroke="rgba(255,255,255,0.16)" strokeWidth="0.16" transform={`rotate(${rotation - 8} ${x} ${y})`} />
        <path d={`M${Math.max(0, x - 34 * wide)} ${y - 9} L${Math.min(100, x + 34 * wide)} ${y + 9} M${Math.max(0, x - 33 * wide)} ${y + 10} L${Math.min(100, x + 33 * wide)} ${y - 8}`} fill="none" stroke={`${tone}4F`} strokeLinecap="round" strokeWidth="0.54" transform={`rotate(${rotation - 8} ${x} ${y})`} />
      </g>
    );
  }

  if (kind === 'foundry') {
    const foundryColor = '#dfb86b';
    if (scene === 'galaxy' || scene === 'stellar') {
      const routeD = `M${Math.max(1, x - 36 * wide)} ${y + 12} C${x - 18} ${y - 7}, ${x + 14} ${y + 13}, ${Math.min(99, x + 40 * wide)} ${y - 8}`;
      return (
        <g className="civ-environment-signature civ-portrait-signal" opacity={Math.max(scanActive ? 0.14 : 0.12, opacity * 0.82)} style={{ color: foundryColor }}>
          <path d={routeD} fill="none" stroke="rgba(223,184,107,0.18)" strokeLinecap="round" strokeWidth="3.2" />
          <path className="civ-portrait-flow" d={routeD} fill="none" stroke="rgba(255,228,163,0.54)" strokeLinecap="round" strokeWidth="0.52" />
          {[0.16, 0.42, 0.7, 0.91].map((step, stepIndex) => (
            <circle
              key={step}
              cx={Math.max(2, Math.min(98, x - 34 * wide + 72 * wide * step))}
              cy={y + 10 - Math.sin(step * Math.PI) * 16 + (stepIndex % 2 ? 1.8 : -1.2)}
              r={stepIndex === 1 ? 0.86 : 0.58}
              fill={stepIndex === 1 ? 'rgba(255,244,194,0.82)' : 'rgba(223,184,107,0.7)'}
            />
          ))}
        </g>
      );
    }
    const baseY = Math.min(96, y + 24 * wide);
    const topY = Math.max(4, y - 34 * wide);
    return (
      <g className="civ-environment-signature civ-portrait-signal" opacity={Math.max(scanActive ? 0.12 : 0.1, opacity * 0.78)} style={{ color: foundryColor }}>
        <path d={`M${x - 16} ${baseY} C${x - 8} ${y + 8}, ${x + 3} ${y - 8}, ${x + 19} ${topY}`} fill="none" stroke="rgba(223,184,107,0.2)" strokeLinecap="round" strokeWidth="4.4" />
        <path className="civ-portrait-flow" d={`M${x - 16} ${baseY} C${x - 8} ${y + 8}, ${x + 3} ${y - 8}, ${x + 19} ${topY}`} fill="none" stroke="rgba(255,228,163,0.58)" strokeLinecap="round" strokeWidth="0.64" />
        <path d={`M${x - 30} ${baseY + 2} L${x - 8} ${baseY - 5} L${x + 15} ${baseY + 2} M${x - 22} ${baseY - 5} L${x} ${baseY - 12} L${x + 22} ${baseY - 5}`} fill="none" stroke="rgba(255,244,194,0.26)" strokeLinecap="round" strokeWidth="0.34" />
        <circle cx={x + 19} cy={topY} r="1.2" fill="rgba(255,244,194,0.78)" />
      </g>
    );
  }

  if (kind === 'shield') {
    return (
      <g className="civ-environment-signature civ-portrait-loom" opacity={opacity} style={{ color: tone }}>
        <path d={`M${Math.max(0, x - 38 * wide)} ${y + 10} C${x - 19} ${y - 23 * wide}, ${x + 20} ${y - 23 * wide}, ${Math.min(100, x + 39 * wide)} ${y + 10}`} fill="none" stroke={`${tone}88`} strokeLinecap="round" strokeWidth="0.7" />
        <path d={`M${Math.max(0, x - 31 * wide)} ${y + 13} C${x - 11} ${y - 10 * wide}, ${x + 12} ${y - 10 * wide}, ${Math.min(100, x + 32 * wide)} ${y + 13}`} fill="none" stroke="rgba(255,255,255,0.24)" strokeLinecap="round" strokeWidth="0.3" />
        <path d={`M${x - 7} ${y + 9} C${x - 2} ${y + 13}, ${x + 2} ${y + 13}, ${x + 7} ${y + 9}`} fill="none" stroke={`${tone}60`} strokeLinecap="round" strokeWidth="0.36" />
      </g>
    );
  }

  if (kind === 'luminary') {
    return (
      <g className="civ-environment-signature civ-portrait-haze" opacity={opacity} style={{ color: tone }}>
        <path d={`M${Math.max(0, x - 42 * wide)} ${y + 7} C${x - 20} ${y - 15}, ${x + 19} ${y - 15}, ${Math.min(100, x + 42 * wide)} ${y + 6}`} fill="none" stroke={`${tone}78`} strokeLinecap="round" strokeWidth="1.4" />
        <path d={`M${Math.max(0, x - 36 * wide)} ${y + 15} C${x - 12} ${y + 3}, ${x + 13} ${y + 3}, ${Math.min(100, x + 36 * wide)} ${y + 14}`} fill="none" stroke="rgba(255,255,255,0.18)" strokeLinecap="round" strokeWidth="0.36" />
        <circle cx={x} cy={y - 5} r="1.1" fill="rgba(255,255,255,0.72)" />
        <circle cx={x - 9} cy={y - 1} r="0.6" fill={`${tone}CC`} />
        <circle cx={x + 9} cy={y - 1} r="0.6" fill={`${tone}CC`} />
      </g>
    );
  }

  if (kind === 'sealed') {
    return (
      <g className="civ-environment-signature" opacity={opacity} style={{ color: tone }}>
        <path d={`M${Math.max(0, x - 32 * wide)} ${y - 8} H${Math.min(100, x + 32 * wide)} M${Math.max(0, x - 38 * wide)} ${y} H${Math.min(100, x + 28 * wide)} M${Math.max(0, x - 28 * wide)} ${y + 8} H${Math.min(100, x + 38 * wide)}`} stroke={`${tone}84`} strokeLinecap="round" strokeWidth="1.1" strokeDasharray="6 3" transform={`rotate(${rotation} ${x} ${y})`} />
        <path d={`M${Math.max(0, x - 32 * wide)} ${y - 8} H${Math.min(100, x + 32 * wide)} M${Math.max(0, x - 38 * wide)} ${y} H${Math.min(100, x + 28 * wide)} M${Math.max(0, x - 28 * wide)} ${y + 8} H${Math.min(100, x + 38 * wide)}`} stroke="rgba(0,0,0,0.68)" strokeLinecap="round" strokeWidth="0.42" strokeDasharray="2 5" transform={`rotate(${rotation} ${x} ${y})`} />
      </g>
    );
  }

  if (kind === 'biosphere') {
    return (
      <g className="civ-environment-signature civ-portrait-signal" opacity={opacity} style={{ color: tone }}>
        <path d={`M${Math.max(0, x - 30 * wide)} ${y + 8} C${x - 17} ${y - 11}, ${x + 10} ${y + 14}, ${Math.min(100, x + 32 * wide)} ${y - 9}`} fill="none" stroke={`${tone}62`} strokeLinecap="round" strokeWidth="0.82" />
        <path d={`M${x - 8} ${y + 1} C${x - 7} ${y - 7}, ${x - 2} ${y - 8}, ${x + 2} ${y - 3} M${x + 4} ${y + 4} C${x + 12} ${y - 1}, ${x + 17} ${y + 1}, ${x + 19} ${y + 7}`} fill="none" stroke="rgba(229,255,238,0.2)" strokeLinecap="round" strokeWidth="0.28" />
      </g>
    );
  }

  if (kind === 'transit' || kind === 'aperture') {
    return (
      <g className="civ-environment-signature" opacity={opacity} style={{ color: tone }}>
        <path className="civ-portrait-flow" d={`M${Math.max(0, x - 42 * wide)} ${y + 12} C${x - 17} ${y - 14}, ${x + 14} ${y + 15}, ${Math.min(100, x + 44 * wide)} ${y - 10}`} fill="none" stroke={`${tone}92`} strokeLinecap="round" strokeWidth="0.82" />
        <path d={`M${Math.max(0, x - 31 * wide)} ${y + 4} C${x - 9} ${y - 5}, ${x + 11} ${y + 6}, ${Math.min(100, x + 33 * wide)} ${y - 4}`} fill="none" stroke="rgba(255,255,255,0.2)" strokeLinecap="round" strokeWidth="0.3" />
      </g>
    );
  }

  if (kind === 'reactor' || kind === 'entropy') {
    return (
      <g className="civ-environment-signature civ-portrait-signal" opacity={opacity} style={{ color: tone }}>
        <path d={`M${Math.max(0, x - 30 * wide)} ${y + 8} C${x - 14} ${y - 8}, ${x + 11} ${y + 13}, ${Math.min(100, x + 31 * wide)} ${y - 6}`} fill="none" stroke={`${tone}86`} strokeLinecap="round" strokeWidth="1" />
        <path d={`M${x - 8} ${y + 12} L${x - 2} ${y - 1} L${x + 2} ${y + 4} L${x + 8} ${y - 12}`} fill="none" stroke="rgba(255,244,194,0.28)" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.38" />
      </g>
    );
  }

  if (kind === 'archive' || kind === 'lattice' || kind === 'accord' || kind === 'replication') {
    const cols = [-14, -7, 0, 7, 14];
    return (
      <g className="civ-environment-signature civ-portrait-signal" opacity={opacity} style={{ color: tone }}>
        <path d={`M${x - 20} ${y + 8} C${x - 8} ${y + 2}, ${x + 9} ${y + 2}, ${x + 21} ${y + 8}`} fill="none" stroke={`${tone}76`} strokeLinecap="round" strokeWidth="0.62" />
        {cols.map((dx, colIndex) => (
          <path key={dx} d={`M${x + dx} ${y + 7} V${y - 3 - (colIndex % 2) * 4}`} stroke={colIndex === 2 ? 'rgba(255,255,255,0.34)' : `${tone}74`} strokeLinecap="round" strokeWidth={colIndex === 2 ? 0.36 : 0.26} />
        ))}
      </g>
    );
  }

  return (
    <g className="civ-environment-signature civ-portrait-loom" opacity={opacity} style={{ color: tone }}>
      <ellipse cx={x} cy={y} rx={22 * wide} ry={6 * wide} fill={`${tone}12`} stroke={`${tone}62`} strokeWidth="0.34" transform={`rotate(${rotation} ${x} ${y})`} />
    </g>
  );
}

function CivilizationEnvironmentalSignatureLayer({
  sites,
  scene,
  scanActive,
  maxSites,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: MarketSceneKind;
  scanActive: boolean;
  maxSites: number;
}) {
  const signatures = React.useMemo(() => (
    selectCivilizationVisualSignatures(sites, {
      limit: maxSites,
      includeSealed: scanActive,
    }).filter((descriptor) => !(
      !scanActive &&
      descriptor.sourceKind === 'blueprint' &&
      hasDominantBlueprintMark(descriptor.site)
    ))
  ), [sites, maxSites, scanActive]);

  if (signatures.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[7] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-environment-signatures"
    >
      {signatures.map((descriptor, index) => (
        <CivilizationEnvironmentalSignatureMark
          key={descriptor.site.id}
          descriptor={descriptor}
          index={index}
          scene={scene}
          scanActive={scanActive}
        />
      ))}
    </svg>
  );
}

function ArtifactTreatmentInfluenceMark({
  site,
  index,
  scene,
  scanActive,
  recent,
}: {
  site: CivilizationDeploymentSite;
  index: number;
  scene: MarketSceneKind;
  scanActive: boolean;
  recent: boolean;
}) {
  const treatment = site.artifactSceneTreatment;
  if (!treatment) return null;

  const tone = getCivilizationSiteTone(site);
  const x = site.anchor.x;
  const y = site.anchor.y;
  const wide = scene === 'galaxy' ? 1.36 : scene === 'stellar' ? 1.18 : 1;
  const rotation = ((index % 5) - 2) * 8;
  const opacity = recent ? 0.64 : scanActive ? 0.36 : 0.28;
  const stroke = `${tone}${recent ? 'D2' : scanActive ? 'A8' : '82'}`;
  const soft = `${tone}${recent ? '22' : '14'}`;
  const white = 'rgba(255,255,255,0.3)';
  const label = getArtifactTreatmentLabel(treatment);

  if (treatment === 'ashroot_recovery') {
    return (
      <g
        className="civ-artifact-substructure"
        data-testid="civilization-artifact-treatment-influence-ashroot_recovery"
        data-treatment-label={label}
        opacity={opacity}
        style={{ color: tone }}
      >
        <path
          d={`M${Math.max(0, x - 28 * wide)} ${y + 8} C${x - 15 * wide} ${y - 14}, ${x + 7 * wide} ${y + 12}, ${Math.min(100, x + 32 * wide)} ${y - 8}`}
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth={recent ? 1.04 : 0.72}
        />
        <path
          d={`M${x - 10 * wide} ${y + 2} C${x - 7 * wide} ${y - 7}, ${x - 1 * wide} ${y - 8}, ${x + 4 * wide} ${y - 3} M${x + 7 * wide} ${y + 4} C${x + 14 * wide} ${y - 1}, ${x + 22 * wide} ${y + 2}, ${x + 24 * wide} ${y + 8}`}
          fill="none"
          stroke="rgba(229,255,238,0.34)"
          strokeLinecap="round"
          strokeWidth="0.32"
        />
        <circle cx={x - 9 * wide} cy={y + 1.8} r={recent ? 1 : 0.66} fill={`${tone}C8`} />
        <ArtifactMotifGlyph site={site} x={x + 1.6 * wide} y={y - 0.8} tone={tone} scale={recent ? 0.64 : 0.52} rotation={rotation * 0.4} emphasis={recent ? 1.08 : 1} />
      </g>
    );
  }

  if (treatment === 'mantlelift_driver') {
    return (
      <g
        className="civ-artifact-substructure"
        data-testid="civilization-artifact-treatment-influence-mantlelift_driver"
        data-treatment-label={label}
        opacity={opacity}
        style={{ color: tone }}
      >
        <path
          className="civ-artifact-substructure-flow"
          d={`M${Math.max(0, x - 32 * wide)} ${y + 10} C${x - 14 * wide} ${y - 10}, ${x + 14 * wide} ${y + 12}, ${Math.min(100, x + 36 * wide)} ${y - 8}`}
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth={recent ? 1.08 : 0.74}
        />
        {[0.18, 0.44, 0.68, 0.9].map((step, stepIndex) => (
          <circle
            key={step}
            cx={Math.max(3, Math.min(97, x - 30 * wide + 62 * wide * step))}
            cy={y + 9 - Math.sin(step * Math.PI) * 18}
            r={(stepIndex === 2 ? 1 : 0.62) * (recent ? 1.08 : 1)}
            fill={stepIndex === 2 ? 'rgba(255,244,194,0.82)' : `${tone}C8`}
          />
        ))}
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={recent ? 0.62 : 0.5} rotation={rotation} emphasis={recent ? 1.1 : 1} />
      </g>
    );
  }

  if (treatment === 'ignition_kernel') {
    return (
      <g
        className="civ-artifact-substructure"
        data-testid="civilization-artifact-treatment-influence-ignition_kernel"
        data-treatment-label={label}
        opacity={opacity}
        style={{ color: tone }}
      >
        <path
          d={`M${Math.max(1, x - 24 * wide)} ${y + 7} C${x - 10 * wide} ${y - 5}, ${x + 10 * wide} ${y + 6}, ${Math.min(99, x + 26 * wide)} ${y - 6}`}
          fill="none"
          stroke={`${tone}A4`}
          strokeLinecap="round"
          strokeWidth={recent ? 0.92 : 0.6}
        />
        {[-0.42, 0, 0.42].map((step, nodeIndex) => (
          <circle
            key={step}
            cx={x + step * 24 * wide}
            cy={y + (nodeIndex === 1 ? -1.5 : 1.4)}
            r={(nodeIndex === 1 ? 1.45 : 0.8) * (recent ? 1.08 : 1)}
            fill={nodeIndex === 1 ? 'rgba(255,244,194,0.82)' : `${tone}B8`}
          />
        ))}
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={recent ? 0.6 : 0.48} rotation={rotation} emphasis={recent ? 1.08 : 1} />
      </g>
    );
  }

  if (treatment === 'magnetic_bottle') {
    return (
      <g
        className="civ-artifact-substructure"
        data-testid="civilization-artifact-treatment-influence-magnetic_bottle"
        data-treatment-label={label}
        opacity={opacity}
        style={{ color: tone }}
      >
        <ellipse
          cx={x}
          cy={y}
          rx={11.5 * wide}
          ry={4.6 * wide}
          fill={soft}
          stroke={stroke}
          strokeWidth={recent ? 0.58 : 0.4}
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <ellipse
          cx={x}
          cy={y}
          rx={6.4 * wide}
          ry={7.8 * wide}
          fill="rgba(0,0,0,0.14)"
          stroke={`${tone}66`}
          strokeWidth="0.24"
          transform={`rotate(${-rotation} ${x} ${y})`}
        />
        <path
          d={`M${Math.max(1, x - 16 * wide)} ${y} H${x - 5 * wide} M${x + 5 * wide} ${y} H${Math.min(99, x + 16 * wide)}`}
          stroke={white}
          strokeLinecap="round"
          strokeWidth="0.24"
        />
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={recent ? 0.6 : 0.48} rotation={rotation} emphasis={recent ? 1.08 : 1} />
      </g>
    );
  }

  if (treatment === 'horizon_extractor') {
    return (
      <g
        className="civ-artifact-substructure"
        data-testid="civilization-artifact-treatment-influence-horizon_extractor"
        data-treatment-label={label}
        opacity={opacity}
        style={{ color: tone }}
      >
        <path
          d={`M${x - 14 * wide} ${y + 2} C${x - 6 * wide} ${y - 8}, ${x + 7 * wide} ${y - 8}, ${x + 15 * wide} ${y + 2}`}
          fill="none"
          stroke={stroke}
          strokeLinecap="round"
          strokeWidth={recent ? 0.82 : 0.52}
        />
        <path
          d={`M${x - 10 * wide} ${y + 5} C${x - 3 * wide} ${y - 1}, ${x + 4 * wide} ${y - 1}, ${x + 11 * wide} ${y + 5}`}
          fill="none"
          stroke={`${tone}6C`}
          strokeLinecap="round"
          strokeWidth="0.28"
        />
        <circle cx={x} cy={y + 1.2} r={recent ? 2.2 : 1.6} fill="rgba(0,0,0,0.52)" stroke="rgba(255,255,255,0.28)" strokeWidth="0.2" />
        <path d={`M${x} ${y - 8} V${y - 2.4} M${x - 5.8 * wide} ${y - 6} L${x - 2.2 * wide} ${y - 1.8} M${x + 5.8 * wide} ${y - 6} L${x + 2.2 * wide} ${y - 1.8}`} stroke={white} strokeLinecap="round" strokeWidth="0.2" />
        <ArtifactMotifGlyph site={site} x={x} y={y + 0.6} tone={tone} scale={recent ? 0.6 : 0.48} rotation={rotation} emphasis={recent ? 1.08 : 1} />
      </g>
    );
  }

  if (treatment === 'entropy_baffle') {
    return (
      <g
        className="civ-artifact-substructure"
        data-testid="civilization-artifact-treatment-influence-entropy_baffle"
        data-treatment-label={label}
        opacity={opacity}
        style={{ color: tone }}
        transform={`rotate(${rotation} ${x} ${y})`}
      >
        <path
          d={`M${x - 12 * wide} ${y + 5} L${x - 8 * wide} ${y - 6} H${x + 8 * wide} L${x + 12 * wide} ${y + 5} Z`}
          fill={soft}
          stroke={stroke}
          strokeLinejoin="round"
          strokeWidth={recent ? 0.52 : 0.34}
        />
        {[-7, -3.5, 0, 3.5, 7].map((dx, finIndex) => (
          <path
            key={dx}
            d={`M${x + dx * wide} ${y + 4.4} V${y - 3.8 - (finIndex % 2) * 1.8}`}
            stroke={finIndex === 2 ? white : `${tone}92`}
            strokeLinecap="round"
            strokeWidth={finIndex === 2 ? 0.32 : 0.24}
          />
        ))}
        <path
          d={`M${x - 13 * wide} ${y + 7.2} C${x - 6 * wide} ${y + 3.2}, ${x - 2 * wide} ${y + 8}, ${x + 1 * wide} ${y + 5.8} S${x + 8 * wide} ${y + 3.4}, ${x + 13 * wide} ${y + 7}`}
          fill="none"
          stroke="rgba(255,148,93,0.48)"
          strokeLinecap="round"
          strokeWidth="0.25"
        />
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={recent ? 0.58 : 0.46} rotation={0} emphasis={recent ? 1.08 : 1} />
      </g>
    );
  }

  return null;
}

function ArtifactSubstructureMark({
  site,
  index,
  scene,
  scanActive,
  recent,
}: {
  site: CivilizationDeploymentSite;
  index: number;
  scene: MarketSceneKind;
  scanActive: boolean;
  recent: boolean;
}) {
  const tone = getCivilizationSiteTone(site);
  const x = site.anchor.x;
  const y = site.anchor.y;
  const wide = scene === 'galaxy' ? 1.35 : scene === 'stellar' ? 1.18 : scene === 'orbit' ? 1.08 : 1;
  const rotation = ((index % 5) - 2) * 9;
  const localTrace = site.representationMode === 'local_trace';
  const baseOpacity = recent
    ? scanActive ? 0.72 : 0.62
    : localTrace
      ? scanActive ? 0.32 : 0.26
      : scanActive ? 0.38 : 0.3;
  const motifSilhouetteNative = Boolean(site.artifactVisualMotif && shouldRenderArtifactNative(site, scene));
  const opacity = motifSilhouetteNative ? Math.max(0.18, baseOpacity * 0.76) : baseOpacity;
  const strokeOpacity = recent ? 'D8' : scanActive ? 'A8' : '82';
  const motifScale = localTrace ? (recent ? 0.62 : 0.52) : (recent ? 0.78 : 0.64);

  if (site.artifactSceneTreatment && shouldRenderArtifactInfluence(site, scene)) {
    return (
      <ArtifactTreatmentInfluenceMark
        site={site}
        index={index}
        scene={scene}
        scanActive={scanActive}
        recent={recent}
      />
    );
  }

  if (isRouteTrait(site)) {
    const startX = Math.max(1, x - 28 * wide);
    const endX = Math.min(99, x + 34 * wide);
    const midY = y + (index % 2 === 0 ? -9 : 8);
    return (
      <g className="civ-artifact-substructure" opacity={opacity} style={{ color: tone }}>
        <path
          d={`M${startX} ${y + 7} C${x - 12 * wide} ${midY}, ${x + 13 * wide} ${midY}, ${endX} ${y - 6}`}
          fill="none"
          stroke={`${tone}${strokeOpacity}`}
          strokeLinecap="round"
          strokeWidth={recent ? 1.05 : 0.72}
          className="civ-artifact-substructure-flow"
        />
        <path
          d={`M${Math.max(2, x - 17 * wide)} ${y + 2} C${x - 5 * wide} ${y - 4}, ${x + 7 * wide} ${y + 4}, ${Math.min(98, x + 19 * wide)} ${y - 2}`}
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeLinecap="round"
          strokeWidth="0.28"
        />
        <circle cx={Math.max(3, x - 12 * wide)} cy={y + 1.5} r={recent ? 1.1 : 0.72} fill={`${tone}D8`} />
        <circle cx={Math.min(97, x + 14 * wide)} cy={y - 1.2} r={recent ? 1 : 0.66} fill="rgba(255,255,255,0.8)" />
        <ArtifactMotifGlyph site={site} x={x} y={y - 1.2} tone={tone} scale={motifScale} rotation={rotation} emphasis={recent ? 1.08 : 1} />
      </g>
    );
  }

  if (site.trait === 'biosphere') {
    return (
      <g className="civ-artifact-substructure" opacity={opacity} style={{ color: tone }}>
        <path
          d={`M${Math.max(0, x - 25 * wide)} ${y + 9} C${x - 13 * wide} ${y - 13}, ${x + 6 * wide} ${y + 13}, ${Math.min(100, x + 29 * wide)} ${y - 8}`}
          fill="none"
          stroke={`${tone}${strokeOpacity}`}
          strokeLinecap="round"
          strokeWidth={recent ? 1.12 : 0.78}
        />
        <path
          d={`M${x - 8 * wide} ${y + 2} C${x - 7 * wide} ${y - 7}, ${x - 2 * wide} ${y - 8}, ${x + 2 * wide} ${y - 3} M${x + 4 * wide} ${y + 4} C${x + 12 * wide} ${y - 1}, ${x + 18 * wide} ${y + 2}, ${x + 20 * wide} ${y + 8}`}
          fill="none"
          stroke="rgba(229,255,238,0.34)"
          strokeLinecap="round"
          strokeWidth="0.34"
        />
        <circle cx={x - 8 * wide} cy={y + 2} r={recent ? 1.05 : 0.68} fill={`${tone}C8`} />
        <ArtifactMotifGlyph site={site} x={x + 2 * wide} y={y - 0.6} tone={tone} scale={motifScale} rotation={rotation * 0.5} emphasis={recent ? 1.08 : 1} />
      </g>
    );
  }

  if (isFieldTrait(site)) {
    const rx = localTrace ? 9.5 * wide : 15.5 * wide;
    const ry = localTrace ? 3.8 * wide : 6 * wide;
    return (
      <g className="civ-artifact-substructure" opacity={opacity} style={{ color: tone }}>
        <ellipse
          cx={x}
          cy={y}
          rx={rx}
          ry={ry}
          fill={`${tone}${recent ? '22' : '14'}`}
          stroke={`${tone}${strokeOpacity}`}
          strokeWidth={recent ? 0.62 : 0.42}
          strokeDasharray={site.trait === 'veil' ? '2.2 1.7' : site.trait === 'containment' ? '4 2.3' : undefined}
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <ellipse
          cx={x}
          cy={y}
          rx={Math.max(4, rx * 0.58)}
          ry={Math.max(1.4, ry * 0.48)}
          fill="rgba(0,0,0,0.12)"
          stroke="rgba(255,255,255,0.22)"
          strokeWidth="0.2"
          transform={`rotate(${-rotation} ${x} ${y})`}
        />
        {recent && (
          <path
            d={`M${Math.max(1, x - rx - 5)} ${y} H${Math.min(99, x + rx + 5)}`}
            stroke="rgba(255,255,255,0.34)"
            strokeLinecap="round"
            strokeWidth="0.18"
            transform={`rotate(${rotation} ${x} ${y})`}
          />
        )}
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={motifScale} rotation={rotation} emphasis={recent ? 1.08 : 1} />
      </g>
    );
  }

  if (isDistrictTrait(site)) {
    const cell = localTrace ? 2.4 : 3.2;
    const cells = [
      [-8, 3],
      [-4, -1],
      [0, 3],
      [4, -2],
      [8, 2],
    ];
    return (
      <g className="civ-artifact-substructure" opacity={opacity} style={{ color: tone }} transform={`rotate(${rotation} ${x} ${y})`}>
        <path
          d={`M${x - 14 * wide} ${y + 7} C${x - 7 * wide} ${y + 1}, ${x + 7 * wide} ${y + 1}, ${x + 15 * wide} ${y + 7}`}
          fill="none"
          stroke={`${tone}${strokeOpacity}`}
          strokeLinecap="round"
          strokeWidth={recent ? 0.78 : 0.52}
        />
        {cells.map(([dx, dy], cellIndex) => (
          <rect
            key={`${dx}:${dy}`}
            x={x + dx * wide - cell / 2}
            y={y + dy * wide - cell / 2}
            width={cell}
            height={cell}
            fill={`${tone}${recent || cellIndex === 2 ? '30' : '18'}`}
            stroke={cellIndex === 2 ? 'rgba(255,255,255,0.44)' : `${tone}92`}
            strokeWidth="0.24"
          />
        ))}
        <ArtifactMotifGlyph site={site} x={x} y={y + 0.5} tone={tone} scale={motifScale} rotation={-rotation} emphasis={recent ? 1.08 : 1} />
      </g>
    );
  }

  if (localTrace) {
    return (
      <g className="civ-artifact-substructure" opacity={opacity} style={{ color: tone }}>
        <ellipse
          cx={x}
          cy={y}
          rx={recent ? 9.4 : 7}
          ry={recent ? 3.8 : 2.8}
          fill={`${tone}${recent ? '20' : '12'}`}
          stroke={`${tone}${strokeOpacity}`}
          strokeWidth={recent ? 0.48 : 0.32}
          strokeDasharray="1.3 1.4"
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <path
          d={`M${x - 6} ${y + 2.2} C${x - 2} ${y - 1.5}, ${x + 2} ${y + 2.8}, ${x + 6.8} ${y - 1.6}`}
          fill="none"
          stroke="rgba(255,255,255,0.34)"
          strokeLinecap="round"
          strokeWidth="0.28"
        />
        <circle cx={x} cy={y} r={recent ? 1.08 : 0.68} fill="rgba(255,255,255,0.82)" />
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={motifScale} rotation={rotation} emphasis={recent ? 1.12 : 1} />
      </g>
    );
  }

  return (
    <g className="civ-artifact-substructure" opacity={opacity} style={{ color: tone }}>
      <path
        d={`M${Math.max(2, x - 18 * wide)} ${y + 6} C${x - 9 * wide} ${y - 7}, ${x + 9 * wide} ${y + 8}, ${Math.min(98, x + 20 * wide)} ${y - 5}`}
        fill="none"
        stroke={`${tone}${strokeOpacity}`}
        strokeLinecap="round"
        strokeWidth={recent ? 0.9 : 0.62}
      />
      <ellipse
        cx={x}
        cy={y}
        rx={9 * wide}
        ry={3.4 * wide}
        fill={`${tone}12`}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="0.2"
        transform={`rotate(${rotation} ${x} ${y})`}
      />
      <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={motifScale} rotation={rotation} emphasis={recent ? 1.08 : 1} />
    </g>
  );
}

function CivilizationArtifactSubstructureLayer({
  sites,
  scene,
  scanActive,
  recentSiteIds,
  maxSites,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: MarketSceneKind;
  scanActive: boolean;
  recentSiteIds: readonly string[];
  maxSites: number;
}) {
  const artifactSites = React.useMemo(() => (
    selectArtifactSubstructureSites(sites, maxSites, recentSiteIds)
  ), [sites, maxSites, recentSiteIds]);

  if (artifactSites.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[10] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-artifact-substructures"
    >
      {artifactSites.map((site, index) => (
        <ArtifactSubstructureMark
          key={site.id}
          site={site}
          index={index}
          scene={scene}
          scanActive={scanActive}
          recent={recentSiteIds.includes(site.id)}
        />
      ))}
    </svg>
  );
}

function shouldRenderMaterializedLocalSite(
  site: CivilizationDeploymentSite,
  scene: MarketSceneKind,
): boolean {
  if (scene !== 'surface') return false;
  if (site.kind !== 'artifact') return false;
  if (!shouldRenderArtifactNative(site, scene)) return false;
  if (site.scalePresence === 'deployment_site' || site.scalePresence === 'visible_structure') return true;
  if (site.artifactSceneTreatment && site.depictionScale && isLocalArtifactDepictionScale(site.depictionScale)) return true;
  return Boolean(site.depictionScale && getArtifactArtworkScalePolicy(site.depictionScale).canRenderAsStructure);
}

function MaterializedLocalSiteMark({
  site,
  index,
  scanActive,
  recent,
  focused = false,
  compactFocus = false,
}: {
  site: CivilizationDeploymentSite;
  index: number;
  scanActive: boolean;
  recent: boolean;
  focused?: boolean;
  compactFocus?: boolean;
}) {
  const tone = getCivilizationSiteTone(site);
  const x = focused
    ? Math.min(84, Math.max(18, site.anchor.x))
    : Math.min(86, Math.max(16, site.anchor.x + ((index % 3) - 1) * 1.8));
  const y = focused
    ? compactFocus
      ? Math.min(50, Math.max(38, site.anchor.y - 10))
      : Math.min(72, Math.max(44, site.anchor.y + 2))
    : Math.min(78, Math.max(48, site.anchor.y + 10 + (index % 2) * 2));
  const baseY = Math.min(91, y + 8);
  const opacity = focused ? recent ? 0.86 : 0.74 : recent ? 0.62 : scanActive ? 0.42 : 0.34;
  const darkFill = scanActive ? 'rgba(4,8,17,0.82)' : 'rgba(4,8,17,0.7)';
  const deepFill = scanActive ? 'rgba(8,14,26,0.78)' : 'rgba(8,14,26,0.62)';
  const glowFill = `${tone}${recent ? '24' : scanActive ? '1B' : '15'}`;
  const stroke = `${tone}${recent ? 'CE' : scanActive ? 'B2' : '86'}`;
  const softStroke = 'rgba(255,255,255,0.24)';
  const treatment = site.artifactSceneTreatment;
  const testId = `civilization-materialized-site-${treatment ?? site.trait ?? 'generic'}`;
  const scale = focused ? compactFocus ? 0.74 : 0.82 : 0.48;

  if (treatment === 'mantlelift_driver') {
    return (
      <g
        className="civ-materialized-site"
        data-testid={testId}
        data-solid-form="local-city-site"
        data-treatment-label={getArtifactTreatmentLabel(treatment)}
        data-focus-mode={focused ? 'selected' : undefined}
        opacity={opacity}
        transform={`translate(${x} ${baseY}) scale(${scale}) translate(${-x} ${-baseY})`}
        style={{ color: tone }}
      >
        <ellipse cx={x + 2} cy={baseY + 1.4} rx="18.2" ry="5.1" fill={glowFill} stroke={`${tone}44`} strokeWidth="0.24" transform={`rotate(-8 ${x + 2} ${baseY + 1.4})`} />
        <path d={`M${x - 12.4} ${baseY + 0.3} L${x - 2.2} ${baseY - 6.2} L${x + 13.2} ${baseY - 1.2} L${x + 7.8} ${baseY + 4.7} L${x - 13.2} ${baseY + 3.8} Z`} fill={darkFill} stroke={stroke} strokeLinejoin="round" strokeWidth="0.5" />
        <path d={`M${x - 7} ${baseY - 1.9} L${x - 0.4} ${baseY - 22.6} L${x + 6.8} ${baseY - 1.7} L${x + 2.6} ${baseY + 0.9} Z`} fill={deepFill} stroke="rgba(255,244,194,0.62)" strokeLinejoin="round" strokeWidth="0.4" />
        <path d={`M${x - 0.2} ${baseY - 20.8} V${baseY - 31.6} M${x + 4.7} ${baseY - 2.6} V${baseY - 17.2} M${x - 4} ${baseY - 2.9} V${baseY - 13}`} stroke="rgba(255,244,194,0.54)" strokeLinecap="round" strokeWidth="0.32" />
        <path d={`M${x - 14} ${baseY - 2.1} C${x - 6} ${baseY - 9}, ${x + 6} ${baseY - 1.4}, ${x + 16} ${baseY - 8.2}`} fill="none" stroke={`${tone}78`} strokeLinecap="round" strokeWidth="0.44" />
        <path d={`M${x - 8} ${baseY - 3.7} C${x - 2.5} ${baseY - 7.4}, ${x + 4.8} ${baseY - 3.3}, ${x + 11} ${baseY - 6.1}`} fill="none" stroke={softStroke} strokeLinecap="round" strokeWidth="0.22" />
        <circle cx={x + 0.1} cy={baseY - 31} r="0.84" fill="rgba(255,244,194,0.86)" />
      </g>
    );
  }

  if (treatment === 'ignition_kernel' || site.artifactVisualMotif === 'forge') {
    return (
      <g
        className="civ-materialized-site"
        data-testid={testId}
        data-solid-form="local-forge-district"
        data-treatment-label={treatment ? getArtifactTreatmentLabel(treatment) : undefined}
        opacity={opacity}
        style={{ color: tone }}
      >
        <ellipse cx={x} cy={baseY + 0.8} rx="14.2" ry="4.2" fill={glowFill} stroke={`${tone}52`} strokeWidth="0.25" transform={`rotate(6 ${x} ${baseY + 0.8})`} />
        <path d={`M${x - 10} ${baseY + 1} L${x - 5} ${baseY - 7} L${x + 4} ${baseY - 8.4} L${x + 11} ${baseY - 0.4} L${x + 5} ${baseY + 4.6} L${x - 9} ${baseY + 4.2} Z`} fill={darkFill} stroke={stroke} strokeLinejoin="round" strokeWidth="0.42" />
        <path d={`M${x - 2.6} ${baseY - 4.4} C${x - 0.5} ${baseY - 11.5}, ${x + 3.1} ${baseY - 10.2}, ${x + 4.5} ${baseY - 4.4}`} fill="rgba(255,244,194,0.22)" stroke="rgba(255,244,194,0.54)" strokeWidth="0.26" />
        <circle cx={x + 1.2} cy={baseY - 5.8} r="1.65" fill="rgba(255,244,194,0.7)" />
        <path d={`M${x - 12.5} ${baseY + 5.2} C${x - 5.3} ${baseY + 0.4}, ${x + 4.4} ${baseY + 0.5}, ${x + 12.8} ${baseY + 4.8}`} fill="none" stroke="rgba(255,255,255,0.22)" strokeLinecap="round" strokeWidth="0.22" />
      </g>
    );
  }

  if (treatment === 'ashroot_recovery' || site.artifactVisualMotif === 'seed' || site.artifactVisualMotif === 'organ') {
    return (
      <g
        className="civ-materialized-site"
        data-testid={testId}
        data-solid-form="local-living-district"
        data-treatment-label={treatment ? getArtifactTreatmentLabel(treatment) : undefined}
        opacity={opacity}
        style={{ color: tone }}
      >
        <ellipse cx={x} cy={baseY + 1.5} rx="16.4" ry="5" fill={glowFill} stroke={`${tone}4A`} strokeWidth="0.26" transform={`rotate(-5 ${x} ${baseY + 1.5})`} />
        <path d={`M${x - 13} ${baseY + 1.5} C${x - 8} ${baseY - 5.5}, ${x + 7} ${baseY - 5.5}, ${x + 13} ${baseY + 1.2} C${x + 5} ${baseY + 5.2}, ${x - 5} ${baseY + 5.2}, ${x - 13} ${baseY + 1.5} Z`} fill={darkFill} stroke={stroke} strokeWidth="0.4" />
        <path d={`M${x - 7.2} ${baseY + 0.8} C${x - 5.8} ${baseY - 7.6}, ${x - 1.6} ${baseY - 12.4}, ${x + 1.2} ${baseY - 17.5} M${x - 0.8} ${baseY - 2} C${x + 3.8} ${baseY - 7.2}, ${x + 7.6} ${baseY - 8.2}, ${x + 10} ${baseY - 5.1}`} fill="none" stroke="rgba(229,255,238,0.46)" strokeLinecap="round" strokeWidth="0.36" />
        <circle cx={x + 1.2} cy={baseY - 17.5} r="0.74" fill="rgba(229,255,238,0.84)" />
        <circle cx={x + 10} cy={baseY - 5.1} r="0.58" fill={`${tone}CC`} />
      </g>
    );
  }

  return (
    <g
      className="civ-materialized-site"
      data-testid={testId}
      data-solid-form="local-city-site"
      opacity={opacity}
      style={{ color: tone }}
    >
      <ellipse cx={x} cy={baseY + 1.2} rx="13.2" ry="4.1" fill={glowFill} stroke={`${tone}4A`} strokeWidth="0.24" transform={`rotate(-7 ${x} ${baseY + 1.2})`} />
      <path d={`M${x - 8.8} ${baseY + 2.3} L${x - 5.5} ${baseY - 5.2} L${x + 1.4} ${baseY - 7} L${x + 9.2} ${baseY + 1.2} L${x + 3.6} ${baseY + 4.3} Z`} fill={darkFill} stroke={stroke} strokeLinejoin="round" strokeWidth="0.38" />
      <path d={`M${x - 4.6} ${baseY} H${x + 5.2} M${x - 1.5} ${baseY - 2.6} H${x + 3.4}`} stroke={softStroke} strokeLinecap="round" strokeWidth="0.2" />
    </g>
  );
}

function CivilizationMaterializedSiteLayer({
  sites,
  scene,
  scanActive,
  recentSiteIds,
  maxSites,
  focusMode = false,
  compactFocus = false,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: MarketSceneKind;
  scanActive: boolean;
  recentSiteIds: readonly string[];
  maxSites: number;
  focusMode?: boolean;
  compactFocus?: boolean;
}) {
  const materializedSites = React.useMemo(() => (
    selectArtifactSubstructureSites(
      sites.filter((site) => shouldRenderMaterializedLocalSite(site, scene)),
      maxSites,
      recentSiteIds,
    )
  ), [sites, scene, maxSites, recentSiteIds]);

  if (materializedSites.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[8] h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-materialized-sites"
      data-scene={scene}
      data-render-mode="solid-local-forms"
    >
      {materializedSites.map((site, index) => (
        <MaterializedLocalSiteMark
          key={site.id}
          site={site}
          index={index}
          scanActive={scanActive}
          recent={recentSiteIds.includes(site.id)}
          focused={focusMode}
          compactFocus={compactFocus}
        />
      ))}
    </svg>
  );
}

function NativeWorkMark({
  site,
  index,
  scene,
  recent,
  compactFocus = false,
}: {
  site: CivilizationDeploymentSite;
  index: number;
  scene: MarketSceneKind;
  recent: boolean;
  compactFocus?: boolean;
}) {
  const tone = getCivilizationSiteTone(site);
  const x = site.anchor.x;
  const y = compactFocus && scene === 'surface'
    ? Math.min(site.anchor.y, 42)
    : site.anchor.y;
  const emphasis = recent ? 1.25 : 1;
  const opacity = recent ? 0.72 : 0.48 - Math.min(index, 3) * 0.05;
  const rotation = ((index % 5) - 2) * 7;
  const isRoute = isRouteTrait(site);
  const isField = isFieldTrait(site);
  const isDistrict = isDistrictTrait(site) || site.trait === 'biosphere' || site.trait === 'replication';
  const motifScale = scene === 'surface'
    ? 0.92
    : scene === 'orbit'
      ? 0.78
      : scene === 'stellar'
        ? 0.68
        : 0.62;

  if (scene === 'surface') {
    const localSurfaceSite = (
      site.scalePresence === 'artifact_pin' ||
      site.scalePresence === 'deployment_site' ||
      site.representationMode === 'local_trace' ||
      (site.depictionScale ? isLocalArtifactDepictionScale(site.depictionScale) : false)
    );
    if (isRoute) {
      const primarySpan = localSurfaceSite ? 18 : 30;
      const secondarySpan = localSurfaceSite ? 12 : 22;
      const primaryYOffset = localSurfaceSite ? 7 : 12;
      const primaryStroke = localSurfaceSite ? 0.92 : 1.55;
      return (
        <g
          className="civ-native-work"
          opacity={opacity}
          style={{ color: tone }}
          data-native-work-scale={localSurfaceSite ? 'local-site' : 'district-corridor'}
        >
          <path
            className="civ-native-work-flow"
            d={`M${Math.max(0, x - primarySpan)} ${y + primaryYOffset} C${x - primarySpan * 0.38} ${y - 3.4}, ${x + primarySpan * 0.36} ${y + primaryYOffset * 0.82}, ${Math.min(100, x + primarySpan * 1.06)} ${y - 4.8}`}
            fill="none"
            stroke={`${tone}CC`}
            strokeLinecap="round"
            strokeWidth={primaryStroke * emphasis}
          />
          <path
            d={`M${Math.max(2, x - secondarySpan)} ${y + 4.4} C${x - secondarySpan * 0.32} ${y - 1.4}, ${x + secondarySpan * 0.36} ${y + 4.8}, ${Math.min(98, x + secondarySpan * 1.08)} ${y - 2.4}`}
            fill="none"
            stroke="rgba(255,255,255,0.32)"
            strokeLinecap="round"
            strokeWidth={localSurfaceSite ? 0.28 : 0.38}
          />
          {localSurfaceSite && (
            <path
              d={`M${x - 5.4} ${y + 7.6} H${x + 6.2} M${x - 2.6} ${y + 5.6} V${y + 1.8} M${x + 2.5} ${y + 5.8} V${y + 2.2}`}
              fill="none"
              stroke="rgba(255,255,255,0.22)"
              strokeLinecap="round"
              strokeWidth="0.2"
            />
          )}
          <ArtifactMotifGlyph site={site} x={x} y={y + 0.5} tone={tone} scale={motifScale * (localSurfaceSite ? 0.82 : 1)} rotation={rotation} emphasis={emphasis} />
        </g>
      );
    }

    if (isField) {
      return (
        <g className="civ-native-work" opacity={opacity} style={{ color: tone }}>
          <ellipse
            cx={x}
            cy={y}
            rx={13 * emphasis}
            ry={5.4 * emphasis}
            fill={`${tone}1F`}
            stroke={`${tone}C2`}
            strokeWidth="0.72"
            strokeDasharray={site.trait === 'veil' ? '2.5 1.8' : site.trait === 'containment' ? '4.5 2.4' : undefined}
            transform={`rotate(${rotation} ${x} ${y})`}
          />
          <ellipse
            cx={x}
            cy={y}
            rx={7.2 * emphasis}
            ry={2.8 * emphasis}
            fill="rgba(0,0,0,0.18)"
            stroke="rgba(255,255,255,0.24)"
            strokeWidth="0.22"
            transform={`rotate(${-rotation} ${x} ${y})`}
          />
          <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={motifScale} rotation={rotation} emphasis={emphasis} />
        </g>
      );
    }

    if (isDistrict) {
      const columns = [-7.5, -3.5, 0.5, 4.5, 8];
      return (
        <g className="civ-native-work" opacity={opacity} style={{ color: tone }} transform={`rotate(${rotation} ${x} ${y})`}>
          <path
            d={`M${x - 15} ${y + 6.5} L${x - 7} ${y - 3} L${x + 5} ${y - 5} L${x + 15} ${y + 5.5} Z`}
            fill={`${tone}22`}
            stroke={`${tone}B8`}
            strokeLinejoin="round"
            strokeWidth="0.58"
          />
          {columns.map((dx, columnIndex) => (
            <path
              key={dx}
              d={`M${x + dx} ${y + 5} V${y - 2 - (columnIndex % 3) * 2.3}`}
              stroke={columnIndex === 2 ? 'rgba(255,255,255,0.44)' : `${tone}A0`}
              strokeLinecap="round"
              strokeWidth={columnIndex === 2 ? 0.42 : 0.34}
            />
          ))}
          <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={motifScale} rotation={-rotation} emphasis={emphasis} />
        </g>
      );
    }

    return (
      <g className="civ-native-work" opacity={opacity} style={{ color: tone }}>
        <rect
          x={x - 6}
          y={y - 5}
          width="12"
          height="10"
          rx="1.5"
          fill={`${tone}20`}
          stroke={`${tone}A8`}
          strokeWidth="0.52"
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <circle cx={x} cy={y} r={1.2 * emphasis} fill="rgba(255,255,255,0.72)" />
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={motifScale} rotation={rotation} emphasis={emphasis} />
      </g>
    );
  }

  if (scene === 'orbit') {
    return (
      <g className="civ-native-work" opacity={opacity} style={{ color: tone }}>
        <ellipse
          cx={x}
          cy={y}
          rx={18 * emphasis}
          ry={5.8 * emphasis}
          fill={`${tone}14`}
          stroke={`${tone}AC`}
          strokeWidth="0.64"
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <path
          className={isRoute ? 'civ-native-work-flow' : undefined}
          d={`M${Math.max(2, x - 25)} ${y + 3} C${x - 8} ${y - 5}, ${x + 9} ${y + 6}, ${Math.min(98, x + 27)} ${y - 3}`}
          fill="none"
          stroke="rgba(255,255,255,0.28)"
          strokeLinecap="round"
          strokeWidth="0.34"
        />
        <circle cx={x - 7 * emphasis} cy={y + 1.4} r={1.05 * emphasis} fill={`${tone}C8`} />
        <circle cx={x + 8 * emphasis} cy={y - 1.5} r={0.78 * emphasis} fill="rgba(255,255,255,0.72)" />
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={motifScale} rotation={rotation} emphasis={emphasis} />
      </g>
    );
  }

  if (scene === 'stellar') {
    return (
      <g className="civ-native-work" opacity={opacity} style={{ color: tone }}>
        <path
          className={isRoute ? 'civ-native-work-flow' : undefined}
          d={`M${Math.max(1, x - 32)} ${y + 10} C${x - 12} ${y - 12}, ${x + 14} ${y + 12}, ${Math.min(99, x + 35)} ${y - 8}`}
          fill="none"
          stroke={`${tone}B4`}
          strokeLinecap="round"
          strokeWidth={1.1 * emphasis}
        />
        {[0, 0.38, 0.7, 1].map((step) => (
          <circle
            key={step}
            cx={Math.max(3, Math.min(97, x - 26 + 54 * step))}
            cy={y + Math.sin(step * Math.PI * 2 + index) * 5}
            r={(step === 0.7 ? 1.2 : 0.82) * emphasis}
            fill={step === 0.7 ? 'rgba(255,255,255,0.78)' : `${tone}C8`}
          />
        ))}
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={motifScale} rotation={rotation} emphasis={emphasis} />
      </g>
    );
  }

  return (
    <g className="civ-native-work" opacity={opacity} style={{ color: tone }}>
      <path
        d={`M${x - 16} ${y - 5} C${x - 5} ${y - 13}, ${x + 6} ${y - 13}, ${x + 17} ${y - 5} C${x + 10} ${y + 8}, ${x - 10} ${y + 8}, ${x - 16} ${y - 5} Z`}
        fill={`${tone}18`}
        stroke={`${tone}A8`}
        strokeWidth="0.44"
      />
      <circle cx={x} cy={y - 2} r={1.35 * emphasis} fill="rgba(255,255,255,0.72)" />
      <circle cx={x - 9} cy={y + 1.5} r="0.76" fill={`${tone}B8`} />
      <circle cx={x + 9} cy={y + 1.5} r="0.76" fill={`${tone}B8`} />
      <ArtifactMotifGlyph site={site} x={x} y={y - 0.5} tone={tone} scale={motifScale} rotation={rotation} emphasis={emphasis} />
    </g>
  );
}

function CivilizationNativeWorkLayer({
  sites,
  scene,
  recentSiteIds,
  maxSites,
  compactFocus = false,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: MarketSceneKind;
  recentSiteIds: readonly string[];
  maxSites: number;
  compactFocus?: boolean;
}) {
  const nativeSites = React.useMemo(() => (
    selectArtifactSubstructureSites(
      sites.filter((site) => shouldRenderArtifactAsNativeStructure(site, scene)),
      maxSites,
      recentSiteIds,
    )
  ), [sites, scene, maxSites, recentSiteIds]);

  if (nativeSites.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[10] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-native-work-layer"
    >
      {nativeSites.map((site, index) => (
        <NativeWorkMark
          key={site.id}
          site={site}
          index={index}
          scene={scene}
          recent={recentSiteIds.includes(site.id)}
          compactFocus={compactFocus}
        />
      ))}
    </svg>
  );
}

function DominantBlueprintMark({
  site,
  scene,
  scanActive,
  index,
}: {
  site: CivilizationDeploymentSite;
  scene: MarketSceneKind;
  scanActive: boolean;
  index: number;
}) {
  const x = site.anchor.x;
  const y = site.anchor.y;
  const opacity = scanActive ? 0.34 : 0.46 - index * 0.08;

  if (site.blueprintId === 'bp_antimatter_detonator') {
    const quarantineX = scene === 'surface' ? Math.max(62, x) : x;
    const quarantineY = scene === 'galaxy' ? Math.min(66, y + 4) : y;
    const wide = scene === 'galaxy' ? 1.35 : scene === 'stellar' ? 1.18 : 1;
    const hazardOpacity = scanActive ? 0.34 : 0.24 - index * 0.03;
    const outerRx = 31 * wide;
    const outerRy = 10.8 * wide;
    const innerRx = 17.5 * wide;
    const innerRy = 5.4 * wide;
    const warningNodes = [
      [-0.72, -0.25, 0.72],
      [-0.34, 0.48, 0.58],
      [0.08, -0.55, 0.82],
      [0.46, 0.35, 0.62],
      [0.78, -0.12, 0.54],
    ] as const;
    return (
      <g
        className="civ-dominant-blueprint civ-portrait-loom"
        data-testid="civilization-blueprint-antimatter-native"
        opacity={hazardOpacity}
        style={{ color: '#ff6972' }}
      >
        <ellipse
          cx={quarantineX}
          cy={quarantineY}
          rx={outerRx}
          ry={outerRy}
          fill="rgba(255,105,114,0.14)"
          stroke="rgba(255,143,150,0.62)"
          strokeWidth="0.52"
          strokeDasharray="7 4"
          transform={`rotate(-11 ${quarantineX} ${quarantineY})`}
        />
        <ellipse
          cx={quarantineX}
          cy={quarantineY}
          rx={innerRx}
          ry={innerRy}
          fill="rgba(0,0,0,0.2)"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="0.26"
          strokeDasharray="2.4 2.2"
          transform={`rotate(-11 ${quarantineX} ${quarantineY})`}
        />
        <path
          d={`M${quarantineX - outerRx * 0.9} ${quarantineY - outerRy * 0.18} C${quarantineX - outerRx * 0.34} ${quarantineY - outerRy * 1.55}, ${quarantineX + outerRx * 0.32} ${quarantineY + outerRy * 1.44}, ${quarantineX + outerRx * 0.92} ${quarantineY + outerRy * 0.08}`}
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeLinecap="round"
          strokeWidth={0.34 * wide}
          transform={`rotate(-11 ${quarantineX} ${quarantineY})`}
        />
        <path
          d={`M${quarantineX - innerRx * 0.78} ${quarantineY - innerRy * 0.84} L${quarantineX - innerRx * 0.28} ${quarantineY - innerRy * 0.28} M${quarantineX + innerRx * 0.78} ${quarantineY + innerRy * 0.84} L${quarantineX + innerRx * 0.28} ${quarantineY + innerRy * 0.28} M${quarantineX - innerRx * 0.78} ${quarantineY + innerRy * 0.84} L${quarantineX - innerRx * 0.28} ${quarantineY + innerRy * 0.28} M${quarantineX + innerRx * 0.78} ${quarantineY - innerRy * 0.84} L${quarantineX + innerRx * 0.28} ${quarantineY - innerRy * 0.28}`}
          fill="none"
          stroke="rgba(255,214,214,0.44)"
          strokeLinecap="round"
          strokeWidth={0.38 * wide}
          transform={`rotate(-11 ${quarantineX} ${quarantineY})`}
        />
        {warningNodes.map(([nx, ny, radius], nodeIndex) => (
          <circle
            key={`${nx}:${ny}`}
            cx={quarantineX + outerRx * nx}
            cy={quarantineY + outerRy * ny}
            r={radius * wide}
            fill={nodeIndex === 2 ? 'rgba(255,255,255,0.72)' : 'rgba(255,105,114,0.68)'}
            transform={`rotate(-11 ${quarantineX + outerRx * nx} ${quarantineY + outerRy * ny})`}
          />
        ))}
        <circle cx={quarantineX} cy={quarantineY} r={3 * wide} fill="rgba(255,255,255,0.2)" />
        <circle cx={quarantineX} cy={quarantineY} r={1.55 * wide} fill="#ff6972" />
        <circle cx={quarantineX} cy={quarantineY} r={0.58 * wide} fill="rgba(255,255,255,0.86)" />
      </g>
    );
  }

  if (site.blueprintId === 'bp_mantle_to_orbit_foundry') {
    const baseX = scene === 'surface' ? Math.max(50, x - 4) : Math.max(48, x - 18);
    const baseY = scene === 'surface' ? 92 : scene === 'galaxy' ? 78 : 86;
    const topX = scene === 'surface' ? Math.min(96, x + 26) : scene === 'galaxy' ? Math.min(96, x + 33) : Math.min(96, x + 24);
    const topY = scene === 'surface' ? 12 : scene === 'galaxy' ? 22 : 10;
    const midX = (baseX + topX) / 2 + (scene === 'stellar' ? 5 : 0);
    const midY = (baseY + topY) / 2 - 8;
    const d = `M${baseX} ${baseY} C${baseX + 9} ${Math.max(10, y + 14)}, ${midX} ${midY}, ${topX} ${topY}`;

    if (scene === 'galaxy') {
      const routeD = `M${Math.max(6, x - 36)} ${Math.min(86, y + 12)} C${x - 18} ${y - 3}, ${x + 8} ${y + 11}, ${Math.min(96, x + 38)} ${Math.max(18, y - 18)}`;
      return (
        <g
          className="civ-dominant-blueprint civ-portrait-signal"
          data-testid="civilization-blueprint-mantle-native"
          opacity={Math.max(0.22, opacity * 0.62)}
          style={{ color: '#dfb86b' }}
        >
          <path
            d={routeD}
            fill="none"
            stroke="rgba(223,184,107,0.16)"
            strokeLinecap="round"
            strokeWidth="4.4"
          />
          <path
            d={routeD}
            fill="none"
            stroke="rgba(255,244,194,0.54)"
            strokeLinecap="round"
            strokeWidth="0.58"
            className="civ-portrait-flow"
          />
          {[0.08, 0.27, 0.48, 0.7, 0.9].map((step, nodeIndex) => {
            const nodeX = Math.max(5, Math.min(97, x - 34 + 72 * step));
            const nodeY = y + 11 - Math.sin(step * Math.PI) * 18 + (nodeIndex % 2 === 0 ? -2 : 2);
            return (
              <circle
                key={step}
                cx={nodeX}
                cy={nodeY}
                r={nodeIndex === 2 ? 1.05 : 0.68}
                fill={nodeIndex === 2 ? '#fff4c2' : 'rgba(223,184,107,0.76)'}
              />
            );
          })}
        </g>
      );
    }

    if (scene === 'stellar') {
      const routeD = `M${Math.max(4, x - 32)} ${Math.min(86, y + 13)} C${x - 12} ${y - 9}, ${x + 14} ${y + 12}, ${Math.min(98, x + 34)} ${Math.max(14, y - 15)}`;
      return (
        <g
          className="civ-dominant-blueprint civ-portrait-signal"
          data-testid="civilization-blueprint-mantle-native"
          opacity={Math.max(0.24, opacity * 0.74)}
          style={{ color: '#dfb86b' }}
        >
          <path
            d={routeD}
            fill="none"
            stroke="rgba(223,184,107,0.18)"
            strokeLinecap="round"
            strokeWidth="4.8"
          />
          <path
            d={routeD}
            fill="none"
            stroke="rgba(255,244,194,0.58)"
            strokeLinecap="round"
            strokeWidth="0.68"
            className="civ-portrait-flow"
          />
          <ellipse
            cx={x + 3}
            cy={y - 1}
            rx="14"
            ry="5"
            fill="rgba(223,184,107,0.08)"
            stroke="rgba(255,228,163,0.32)"
            strokeWidth="0.24"
            transform={`rotate(-12 ${x + 3} ${y - 1})`}
          />
          {[0.18, 0.44, 0.68, 0.9].map((step) => (
            <circle
              key={step}
              cx={Math.max(5, Math.min(97, x - 30 + 62 * step))}
              cy={y + 10 - Math.sin(step * Math.PI) * 19}
              r={step > 0.8 ? 1.05 : 0.72}
              fill={step > 0.8 ? '#fff4c2' : 'rgba(223,184,107,0.78)'}
            />
          ))}
        </g>
      );
    }

    if (scene === 'orbit') {
      const liftX = 26;
      const liftBaseY = 79;
      const orbitalY = 18;
      const foundryX = 64;
      const freightD = `M17 ${orbitalY + 11} C32 ${orbitalY - 4}, 52 ${orbitalY - 3}, 83 ${orbitalY + 5}`;
      return (
        <g
          className="civ-dominant-blueprint civ-portrait-signal"
          data-testid="civilization-blueprint-mantle-native"
          opacity={Math.max(0.3, opacity * 0.82)}
          style={{ color: '#dfb86b' }}
        >
          <path
            d={`M${liftX + 5} ${liftBaseY} C${liftX + 4} 62, ${liftX + 1} 40, ${liftX + 3} ${orbitalY + 3}`}
            fill="none"
            stroke="rgba(223,184,107,0.12)"
            strokeLinecap="round"
            strokeWidth="3.6"
          />
          <path
            d={`M${liftX + 5} ${liftBaseY} C${liftX + 4} 62, ${liftX + 1} 40, ${liftX + 3} ${orbitalY + 3}`}
            fill="none"
            stroke="rgba(255,244,194,0.48)"
            strokeLinecap="round"
            strokeWidth="0.5"
          />
          <path
            className="civ-portrait-flow"
            d={`M${liftX + 5} ${liftBaseY} C${liftX + 4} 62, ${liftX + 1} 40, ${liftX + 3} ${orbitalY + 3}`}
            fill="none"
            stroke="rgba(255,255,255,0.36)"
            strokeLinecap="round"
            strokeWidth="0.18"
          />
          <path
            d={`M${liftX - 8} ${liftBaseY + 2} L${liftX + 4} ${liftBaseY - 6} L${liftX + 18} ${liftBaseY + 1} L${liftX + 8} ${liftBaseY + 5} Z`}
            fill="rgba(223,184,107,0.1)"
            stroke="rgba(255,228,163,0.38)"
            strokeLinejoin="round"
            strokeWidth="0.34"
          />
          <path
            d={`M${liftX + 2} ${liftBaseY - 8} V${liftBaseY - 20} M${liftX + 7} ${liftBaseY - 8} V${liftBaseY - 25} M${liftX + 12} ${liftBaseY - 7} V${liftBaseY - 18}`}
            fill="none"
            stroke="rgba(255,228,163,0.28)"
            strokeLinecap="round"
            strokeWidth="0.28"
          />
          <path
            d={freightD}
            fill="none"
            stroke="rgba(223,184,107,0.13)"
            strokeLinecap="round"
            strokeWidth="3.2"
          />
          <path
            d={freightD}
            fill="none"
            stroke="rgba(255,244,194,0.46)"
            strokeLinecap="round"
            strokeWidth="0.42"
          />
          <ellipse
            cx={foundryX}
            cy={orbitalY + 4}
            rx="8.8"
            ry="2.6"
            fill="rgba(223,184,107,0.09)"
            stroke="rgba(255,244,194,0.38)"
            strokeWidth="0.24"
            transform={`rotate(-8 ${foundryX} ${orbitalY + 4})`}
          />
          <path
            d={`M${foundryX - 7} ${orbitalY + 4} H${foundryX + 7} M${foundryX - 3.5} ${orbitalY + 1.8} L${foundryX} ${orbitalY - 0.8} L${foundryX + 3.5} ${orbitalY + 1.8}`}
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="0.18"
          />
          {[0.18, 0.4, 0.64, 0.86].map((step) => {
            const nodeX = 17 + 66 * step;
            const nodeY = orbitalY + 9 - Math.sin(step * Math.PI) * 9;
            return (
              <circle
                key={step}
                cx={nodeX}
                cy={nodeY}
                r={step > 0.8 ? 0.9 : 0.56}
                fill={step > 0.8 ? 'rgba(255,244,194,0.82)' : 'rgba(223,184,107,0.66)'}
              />
            );
          })}
        </g>
      );
    }

    return (
      <g
        className="civ-dominant-blueprint civ-portrait-signal"
        data-testid="civilization-blueprint-mantle-native"
        opacity={opacity}
        style={{ color: '#dfb86b' }}
      >
        <path
          d={d}
          fill="none"
          stroke="rgba(223,184,107,0.22)"
          strokeLinecap="round"
          strokeWidth="6.2"
        />
        <path
          d={d}
          fill="none"
          stroke="rgba(255,244,194,0.62)"
          strokeLinecap="round"
          strokeWidth="0.82"
        />
        <path
          className="civ-portrait-flow"
          d={d}
          fill="none"
          stroke="rgba(255,255,255,0.48)"
          strokeLinecap="round"
          strokeWidth="0.3"
        />
        <path
          d={`M${baseX - 15} ${baseY + 2} L${baseX + 2} ${baseY - 8} L${baseX + 22} ${baseY + 1} L${baseX + 12} ${baseY + 5} Z`}
          fill="rgba(223,184,107,0.12)"
          stroke="rgba(255,228,163,0.46)"
          strokeLinejoin="round"
          strokeWidth="0.42"
        />
        <path
          d={`M${baseX - 3} ${baseY - 8} L${baseX + 11} ${baseY - 16} L${baseX + 30} ${baseY - 7} M${baseX + 3} ${baseY - 11} V${baseY - 30} M${baseX + 11} ${baseY - 16} V${baseY - 35} M${baseX + 19} ${baseY - 12} V${baseY - 28}`}
          fill="none"
          stroke="rgba(255,228,163,0.42)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="0.46"
        />
        <ellipse
          cx={topX}
          cy={topY}
          rx="9.5"
          ry="3.3"
          fill="rgba(223,184,107,0.1)"
          stroke="rgba(255,244,194,0.5)"
          strokeWidth="0.32"
          transform={`rotate(-12 ${topX} ${topY})`}
        />
        <path
          d={`M${topX - 9} ${topY + 0.2} H${topX + 9} M${topX - 5} ${topY - 2.6} L${topX} ${topY - 5.2} L${topX + 5} ${topY - 2.6}`}
          fill="none"
          stroke="rgba(255,255,255,0.38)"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="0.24"
        />
        {[0.2, 0.48, 0.73, 0.94].map((step) => {
          const nodeX = baseX + (topX - baseX) * step + Math.sin(step * Math.PI) * 5;
          const nodeY = baseY + (topY - baseY) * step - Math.sin(step * Math.PI) * 10;
          return (
            <circle
              key={step}
              cx={nodeX}
              cy={nodeY}
              r={step > 0.9 ? 1.35 : 0.82}
              fill={step > 0.9 ? '#fff4c2' : 'rgba(223,184,107,0.78)'}
            />
          );
        })}
      </g>
    );
  }

  if (site.blueprintId === 'bp_worldshield_covenant') {
    const shieldX = x;
    const shieldY = Math.min(76, y + 4);
    const wide = scene === 'galaxy' ? 1.3 : scene === 'stellar' ? 1.14 : 1;
    return (
      <g className="civ-dominant-blueprint civ-portrait-loom" opacity={opacity} style={{ color: '#ffe4a3' }}>
        <path
          d={`M${Math.max(0, shieldX - 42 * wide)} ${shieldY + 12} C${shieldX - 22} ${shieldY - 24 * wide}, ${shieldX + 22} ${shieldY - 24 * wide}, ${Math.min(100, shieldX + 42 * wide)} ${shieldY + 12}`}
          fill="rgba(255,228,163,0.08)"
          stroke="rgba(255,228,163,0.56)"
          strokeLinecap="round"
          strokeWidth="0.74"
        />
        <path
          d={`M${Math.max(0, shieldX - 32 * wide)} ${shieldY + 14} C${shieldX - 12} ${shieldY - 9 * wide}, ${shieldX + 12} ${shieldY - 9 * wide}, ${Math.min(100, shieldX + 32 * wide)} ${shieldY + 14}`}
          fill="none"
          stroke="rgba(255,255,255,0.26)"
          strokeLinecap="round"
          strokeWidth="0.32"
        />
      </g>
    );
  }

  return null;
}

function CivilizationDominantBlueprintLayer({
  sites,
  scene,
  scanActive,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: MarketSceneKind;
  scanActive: boolean;
}) {
  const blueprints = sites
    .filter((site) => site.kind === 'blueprint')
    .slice(0, scanActive ? 2 : 1);
  if (blueprints.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[9] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-dominant-blueprints"
    >
      {blueprints.map((site, index) => (
        <DominantBlueprintMark
          key={site.id}
          site={site}
          scene={scene}
          scanActive={scanActive}
          index={index}
        />
      ))}
    </svg>
  );
}

function IntegratedConsequenceMark({
  site,
  scene,
  scanActive,
  recent,
  index,
}: {
  site: CivilizationDeploymentSite;
  scene: MarketSceneKind;
  scanActive: boolean;
  recent: boolean;
  index: number;
}) {
  const tone = getCivilizationSiteTone(site);
  const nativeScene = getNativeSceneForSite(site);
  const relationDistance = Math.max(0, getSceneIndex(scene) - getSceneIndex(nativeScene));
  const scale = scene === 'surface' ? 1 : scene === 'orbit' ? 1.1 : scene === 'stellar' ? 1.22 : 1.34;
  const local = relationDistance === 0;
  const x = Math.min(86, Math.max(14, site.anchor.x + (index % 2 === 0 ? -1.8 : 1.8)));
  const y = Math.min(scene === 'surface' ? 74 : 78, Math.max(scene === 'surface' ? 22 : 18, site.anchor.y + (index % 3 - 1) * 1.6));
  const opacity = scanActive
    ? recent ? 0.46 : 0.28
    : recent ? 0.62 : Math.max(0.22, 0.38 - index * 0.06);
  const rotation = ((index % 5) - 2) * 7;
  const rx = (local ? 13 : 22 + relationDistance * 5) * scale;
  const ry = (local ? 5.6 : 8.2 + relationDistance * 2) * scale;
  const white = 'rgba(255,255,255,0.48)';
  const softFill = `${tone}${recent ? '2A' : '18'}`;
  const strongStroke = `${tone}${recent ? 'E2' : 'A8'}`;

  if (site.kind === 'luminary') {
    const auroraWidth = scene === 'galaxy' ? 36 : scene === 'stellar' ? 30 : 24;
    const deepSpace = scene === 'stellar' || scene === 'galaxy';
    if (deepSpace) {
      return (
        <g
          className="civ-integrated-consequence"
          opacity={opacity * (scanActive ? 0.72 : 0.58)}
          style={{ color: tone }}
          data-testid="civilization-integrated-luminary"
        >
          <ellipse
            cx={x}
            cy={y + 4}
            rx={auroraWidth * (scene === 'galaxy' ? 1.04 : 0.94)}
            ry={scene === 'galaxy' ? 10.5 : 8.2}
            fill={`${tone}18`}
            stroke={`${tone}44`}
            strokeWidth="0.28"
            transform={`rotate(-8 ${x} ${y + 4})`}
          />
          <ellipse
            cx={x + 4}
            cy={y + 1}
            rx={auroraWidth * 0.62}
            ry={scene === 'galaxy' ? 5.2 : 4.4}
            fill="none"
            stroke="rgba(255,255,255,0.13)"
            strokeWidth="0.18"
            transform={`rotate(11 ${x + 4} ${y + 1})`}
          />
          <path
            d={`M${Math.max(2, x - auroraWidth * 0.68)} ${y + 8} C${x - 9} ${y - 1}, ${x + 12} ${y - 2}, ${Math.min(98, x + auroraWidth * 0.7)} ${y + 7}`}
            fill="none"
            stroke={`${tone}68`}
            strokeLinecap="round"
            strokeWidth="0.32"
          />
          <circle cx={x} cy={y + 2} r="1.05" fill="rgba(255,255,255,0.5)" />
        </g>
      );
    }
    return (
      <g className="civ-integrated-consequence" opacity={opacity} style={{ color: tone }} data-testid="civilization-integrated-luminary">
        <path
          d={`M${Math.max(0, x - auroraWidth)} ${y + 12} C${x - 16} ${y - 9}, ${x - 8} ${y - 13}, ${x} ${y - 2} C${x + 8} ${y + 9}, ${x + 17} ${y - 10}, ${Math.min(100, x + auroraWidth)} ${y + 9}`}
          fill="none"
          stroke={`${tone}C8`}
          strokeLinecap="round"
          strokeWidth={1.05 * scale}
        />
        <path
          d={`M${Math.max(0, x - auroraWidth * 0.72)} ${y + 16} C${x - 10} ${y + 1}, ${x + 6} ${y + 4}, ${Math.min(100, x + auroraWidth * 0.74)} ${y - 2}`}
          fill="none"
          stroke="rgba(255,255,255,0.24)"
          strokeLinecap="round"
          strokeWidth="0.36"
        />
      </g>
    );
  }

  if (site.kind === 'protocol') {
    return (
      <g className="civ-integrated-consequence" opacity={opacity} style={{ color: tone }} data-testid="civilization-integrated-protocol" transform={`rotate(${rotation} ${x} ${y})`}>
        <rect x={x - rx * 0.62} y={y - ry * 0.85} width={rx * 1.24} height={ry * 1.7} rx="1.5" fill="rgba(0,0,0,0.42)" stroke={`${tone}8E`} strokeWidth="0.36" />
        <path d={`M${x - rx * 0.46} ${y - ry * 0.36} H${x + rx * 0.44} M${x - rx * 0.36} ${y + ry * 0.1} H${x + rx * 0.52} M${x - rx * 0.5} ${y + ry * 0.52} H${x + rx * 0.28}`} stroke={`${tone}C8`} strokeLinecap="round" strokeWidth="0.72" />
      </g>
    );
  }

  const isAntimatter = site.blueprintId === 'bp_antimatter_detonator';
  const isMantleFoundry = site.blueprintId === 'bp_mantle_to_orbit_foundry' || site.artifactSceneTreatment === 'mantlelift_driver';
  const treatment = site.artifactSceneTreatment;

  if (!local) {
    const aggregateOpacity = scanActive
      ? recent ? 0.38 : 0.22
      : recent ? 0.52 : Math.max(0.18, 0.3 - index * 0.04);
    const aggregateWidth = scene === 'galaxy' ? 27 : scene === 'stellar' ? 22 : 16;
    const aggregateHeight = scene === 'galaxy' ? 9 : scene === 'stellar' ? 7 : 4.8;
    const pathD = scene === 'orbit'
      ? `M${Math.max(4, x - aggregateWidth)} ${y + 5} C${x - 7} ${y - 3}, ${x + 8} ${y + 6}, ${Math.min(96, x + aggregateWidth)} ${y - 4}`
      : scene === 'stellar'
        ? `M${Math.max(3, x - aggregateWidth)} ${y + 7} C${x - 9} ${y - 9}, ${x + 10} ${y + 9}, ${Math.min(97, x + aggregateWidth)} ${y - 7}`
        : `M${Math.max(2, x - aggregateWidth)} ${y + 6} C${x - 12} ${y - 10}, ${x + 12} ${y + 10}, ${Math.min(98, x + aggregateWidth)} ${y - 6}`;
    return (
      <g
        className="civ-integrated-consequence"
        opacity={aggregateOpacity}
        style={{ color: tone }}
        data-testid="civilization-integrated-aggregate"
        data-native-scene={nativeScene}
      >
        <path
          className="civ-portrait-flow"
          d={pathD}
          fill="none"
          stroke={`${tone}8C`}
          strokeLinecap="round"
          strokeWidth={scene === 'galaxy' ? 0.82 : scene === 'stellar' ? 0.68 : 0.48}
        />
        <ellipse
          cx={x}
          cy={y}
          rx={aggregateWidth * 0.34}
          ry={aggregateHeight * 0.44}
          fill={`${tone}12`}
          stroke={`${tone}62`}
          strokeWidth="0.24"
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <circle cx={x - aggregateWidth * 0.18} cy={y + 1} r="0.54" fill={`${tone}B8`} />
        <circle cx={x + aggregateWidth * 0.08} cy={y - 0.7} r="0.64" fill="rgba(255,255,255,0.68)" />
        <circle cx={x + aggregateWidth * 0.25} cy={y + 1.4} r="0.46" fill={`${tone}92`} />
      </g>
    );
  }

  if (isAntimatter || treatment === 'horizon_extractor') {
    const dark = isAntimatter ? 'rgba(56,7,18,0.48)' : 'rgba(2,6,18,0.48)';
    return (
      <g className="civ-integrated-consequence" opacity={opacity} style={{ color: tone }} data-testid="civilization-integrated-horizon">
        <ellipse cx={x} cy={y} rx={rx * 1.05} ry={ry * 1.08} fill={dark} stroke={strongStroke} strokeWidth={0.72 * scale} strokeDasharray={isAntimatter ? '4 2.4' : undefined} transform={`rotate(${rotation} ${x} ${y})`} />
        <path d={`M${x - rx * 0.76} ${y + ry * 0.12} C${x - rx * 0.28} ${y - ry * 0.72}, ${x + rx * 0.3} ${y - ry * 0.72}, ${x + rx * 0.78} ${y + ry * 0.1}`} fill="none" stroke="rgba(255,255,255,0.34)" strokeLinecap="round" strokeWidth="0.38" />
        <path d={`M${x - rx * 0.42} ${y} H${x + rx * 0.42}`} stroke={`${tone}D8`} strokeLinecap="round" strokeWidth={isAntimatter ? 0.82 : 0.5} />
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={0.58 * scale} emphasis={recent ? 1.14 : 1} />
      </g>
    );
  }

  if (isMantleFoundry) {
    const baseY = Math.min(92, y + 13 * scale);
    const apexY = Math.max(10, y - 16 * scale);
    return (
      <g className="civ-integrated-consequence" opacity={opacity} style={{ color: tone }} data-testid="civilization-integrated-lift">
        <path d={`M${x - 3.4 * scale} ${baseY} L${x} ${apexY} L${x + 3.4 * scale} ${baseY} Z`} fill={softFill} stroke={strongStroke} strokeLinejoin="round" strokeWidth="0.5" />
        <path d={`M${x} ${baseY} V${apexY - 4} M${x - 7 * scale} ${baseY - 3} C${x - 3 * scale} ${y}, ${x + 4 * scale} ${y}, ${x + 10 * scale} ${apexY + 6}`} stroke={white} strokeLinecap="round" strokeWidth="0.34" fill="none" />
        <ellipse cx={x} cy={apexY - 1.2} rx={9.5 * scale} ry={2.8 * scale} fill={`${tone}16`} stroke={`${tone}A8`} strokeWidth="0.34" />
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={0.62 * scale} emphasis={recent ? 1.12 : 1} />
      </g>
    );
  }

  if (treatment === 'ashroot_recovery') {
    return (
      <g className="civ-integrated-consequence" opacity={opacity} style={{ color: tone }} data-testid="civilization-integrated-recovery">
        <path
          d={`M${x - rx * 0.95} ${y + ry * 0.35} C${x - rx * 0.62} ${y - ry * 0.68}, ${x - rx * 0.12} ${y - ry * 0.9}, ${x + rx * 0.22} ${y - ry * 0.18} C${x + rx * 0.46} ${y + ry * 0.34}, ${x + rx * 0.76} ${y - ry * 0.22}, ${x + rx} ${y + ry * 0.42} C${x + rx * 0.34} ${y + ry}, ${x - rx * 0.4} ${y + ry * 0.94}, ${x - rx * 0.95} ${y + ry * 0.35} Z`}
          fill={softFill}
          stroke={strongStroke}
          strokeLinejoin="round"
          strokeWidth="0.45"
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <path d={`M${x - rx * 0.76} ${y + ry * 0.62} C${x - rx * 0.26} ${y + ry * 0.18}, ${x - rx * 0.1} ${y - ry * 0.16}, ${x + rx * 0.12} ${y - ry * 0.66} M${x - rx * 0.14} ${y + ry * 0.38} C${x + rx * 0.1} ${y + ry * 0.02}, ${x + rx * 0.42} ${y + ry * 0.14}, ${x + rx * 0.72} ${y - ry * 0.28}`} fill="none" stroke={white} strokeLinecap="round" strokeWidth="0.32" />
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={0.62 * scale} emphasis={recent ? 1.1 : 1} />
      </g>
    );
  }

  if (treatment === 'magnetic_bottle' || site.trait === 'containment') {
    return (
      <g className="civ-integrated-consequence" opacity={opacity} style={{ color: tone }} data-testid="civilization-integrated-containment">
        <ellipse cx={x} cy={y} rx={rx} ry={ry} fill={`${tone}12`} stroke={strongStroke} strokeWidth="0.58" transform={`rotate(${rotation} ${x} ${y})`} />
        <ellipse cx={x} cy={y} rx={rx * 0.56} ry={ry * 1.36} fill="none" stroke="rgba(255,255,255,0.26)" strokeWidth="0.32" transform={`rotate(${-rotation} ${x} ${y})`} />
        <path d={`M${x - rx * 0.82} ${y + ry * 0.74} C${x - rx * 0.28} ${y + ry * 1.2}, ${x + rx * 0.34} ${y + ry * 1.18}, ${x + rx * 0.84} ${y + ry * 0.72}`} fill="none" stroke={`${tone}96`} strokeLinecap="round" strokeWidth="0.42" />
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={0.58 * scale} emphasis={recent ? 1.12 : 1} />
      </g>
    );
  }

  if (treatment === 'ignition_kernel' || treatment === 'entropy_baffle' || site.trait === 'ignition' || site.trait === 'entropy') {
    const finCount = treatment === 'entropy_baffle' ? 5 : 3;
    return (
      <g className="civ-integrated-consequence" opacity={opacity} style={{ color: tone }} data-testid="civilization-integrated-forge" transform={`rotate(${rotation} ${x} ${y})`}>
        <path d={`M${x - rx * 0.68} ${y + ry * 0.74} L${x - rx * 0.22} ${y - ry * 0.62} L${x + rx * 0.28} ${y - ry * 0.72} L${x + rx * 0.72} ${y + ry * 0.68} Z`} fill={softFill} stroke={strongStroke} strokeLinejoin="round" strokeWidth="0.5" />
        {Array.from({ length: finCount }, (_, finIndex) => {
          const dx = (finIndex - (finCount - 1) / 2) * (rx / (finCount + 0.4));
          return <path key={finIndex} d={`M${x + dx} ${y + ry * 0.55} V${y - ry * (0.18 + (finIndex % 2) * 0.2)}`} stroke={finIndex === Math.floor(finCount / 2) ? white : `${tone}9C`} strokeLinecap="round" strokeWidth="0.34" />;
        })}
        <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={0.56 * scale} emphasis={recent ? 1.12 : 1} />
      </g>
    );
  }

  return (
    <g className="civ-integrated-consequence" opacity={opacity} style={{ color: tone }} data-testid="civilization-integrated-generic" transform={`rotate(${rotation} ${x} ${y})`}>
      <path d={`M${x - rx * 0.6} ${y + ry * 0.42} L${x - rx * 0.16} ${y - ry * 0.5} L${x + rx * 0.54} ${y - ry * 0.2} L${x + rx * 0.38} ${y + ry * 0.54} Z`} fill={softFill} stroke={strongStroke} strokeLinejoin="round" strokeWidth="0.42" />
      <ArtifactMotifGlyph site={site} x={x} y={y} tone={tone} scale={0.58 * scale} emphasis={recent ? 1.1 : 1} />
    </g>
  );
}

function CivilizationIntegratedConsequenceLayer({
  sites,
  scene,
  scanActive,
  recentSiteIds,
  maxSites,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: MarketSceneKind;
  scanActive: boolean;
  recentSiteIds: readonly string[];
  maxSites: number;
}) {
  const integratedSites = React.useMemo(() => (
    selectIntegratedConsequenceSites(sites, scene, maxSites, recentSiteIds)
  ), [sites, scene, maxSites, recentSiteIds]);

  if (integratedSites.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[8] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-integrated-consequences"
    >
      {integratedSites.map((site, index) => (
        <IntegratedConsequenceMark
          key={site.id}
          site={site}
          scene={scene}
          scanActive={scanActive}
          recent={recentSiteIds.includes(site.id)}
          index={index}
        />
      ))}
    </svg>
  );
}

function LuminaryPortraitMark({
  site,
  scene,
  opacity,
}: {
  site: CivilizationDeploymentSite;
  scene: MarketSceneKind;
  opacity: number;
}) {
  const meta = AFFINITY_META[site.affinity];
  const x = site.anchor.x;
  const y = site.anchor.y;
  const spread = scene === 'galaxy' ? 30 : scene === 'stellar' ? 24 : 19;
  const deepSpace = scene === 'stellar' || scene === 'galaxy';
  if (deepSpace) {
    return (
      <g
        className="civ-portrait-mark civ-portrait-haze"
        opacity={opacity * 0.74}
        style={{ color: meta.hex }}
      >
        <ellipse
          cx={x}
          cy={y + 2}
          rx={spread * 1.12}
          ry={scene === 'galaxy' ? 7.4 : 6.1}
          fill={`${meta.hex}16`}
          stroke={`${meta.hex}4E`}
          strokeWidth="0.24"
          transform={`rotate(-7 ${x} ${y + 2})`}
        />
        <path
          d={`M${Math.max(4, x - spread * 0.76)} ${y + 5} C${x - 8} ${y - 3}, ${x + 8} ${y - 3}, ${Math.min(96, x + spread * 0.78)} ${y + 4}`}
          fill="none"
          stroke={`${meta.hex}76`}
          strokeLinecap="round"
          strokeWidth="0.34"
        />
        <circle cx={x} cy={y} r="1.1" fill="rgba(255,255,255,0.58)" />
        <circle cx={x - 6} cy={y + 2} r="0.42" fill={`${meta.hex}B8`} />
        <circle cx={x + 6} cy={y + 2} r="0.42" fill={`${meta.hex}B8`} />
      </g>
    );
  }
  return (
    <g className="civ-portrait-mark civ-portrait-haze" opacity={opacity} style={{ color: meta.hex }}>
      <path
        d={`M${Math.max(2, x - spread)} ${y + 2} C${x - 10} ${y - 13}, ${x + 9} ${y - 13}, ${Math.min(98, x + spread)} ${y + 1}`}
        fill="none"
        stroke={`${meta.hex}B0`}
        strokeLinecap="round"
        strokeWidth="0.72"
      />
      <path
        d={`M${Math.max(4, x - spread + 4)} ${y + 7} C${x - 6} ${y - 3}, ${x + 6} ${y - 3}, ${Math.min(96, x + spread - 4)} ${y + 6}`}
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeLinecap="round"
        strokeWidth="0.24"
      />
      <circle cx={x} cy={y - 2} r="1.35" fill="#fff" />
      <circle cx={x - 7} cy={y + 1} r="0.55" fill={`${meta.hex}DD`} />
      <circle cx={x + 7} cy={y + 1} r="0.55" fill={`${meta.hex}DD`} />
    </g>
  );
}

function ArtifactPortraitMark({
  site,
  index,
  opacity,
}: {
  site: CivilizationDeploymentSite;
  index: number;
  opacity: number;
}) {
  const meta = AFFINITY_META[site.affinity];
  const x = site.anchor.x;
  const y = site.anchor.y;
  const rotation = index % 2 === 0 ? -8 : 9;

  if (site.representationMode === 'local_trace') {
    return (
      <g className="civ-portrait-mark civ-portrait-signal" opacity={Math.min(opacity, 0.42)} style={{ color: meta.hex }}>
        <ellipse
          cx={x}
          cy={y}
          rx="5.8"
          ry="2.2"
          fill={`${meta.hex}18`}
          stroke={`${meta.hex}86`}
          strokeWidth="0.3"
          strokeDasharray="1.2 1"
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <circle cx={x} cy={y} r="0.72" fill="rgba(255,255,255,0.76)" />
        <path
          d={`M${x - 3.4} ${y + 1.7} C${x - 1.1} ${y + 0.4}, ${x + 1.1} ${y + 0.4}, ${x + 3.6} ${y + 1.7}`}
          fill="none"
          stroke={`${meta.hex}78`}
          strokeLinecap="round"
          strokeWidth="0.22"
        />
      </g>
    );
  }

  if (site.trait === 'biosphere') {
    return (
      <g className="civ-portrait-mark civ-portrait-signal" opacity={opacity} style={{ color: meta.hex }}>
        <path
          d={`M${Math.max(3, x - 18)} ${y + 4} C${x - 8} ${y - 7}, ${x + 9} ${y + 9}, ${Math.min(97, x + 20)} ${y - 5}`}
          fill="none"
          stroke={`${meta.hex}B8`}
          strokeLinecap="round"
          strokeWidth="0.64"
        />
        <path
          d={`M${x - 5} ${y} C${x - 2} ${y - 5}, ${x + 3} ${y - 5}, ${x + 5} ${y - 1} M${x + 4} ${y + 2} C${x + 8} ${y - 1}, ${x + 11} ${y}, ${x + 13} ${y + 4}`}
          fill="none"
          stroke="rgba(229,255,238,0.58)"
          strokeLinecap="round"
          strokeWidth="0.25"
        />
      </g>
    );
  }

  if (isRouteTrait(site)) {
    return (
      <g className="civ-portrait-mark" opacity={opacity} style={{ color: meta.hex }}>
        <path
          className="civ-portrait-flow"
          d={`M${Math.max(3, x - 22)} ${y + 4} C${x - 10} ${y - 10}, ${x + 11} ${y + 10}, ${Math.min(97, x + 24)} ${y - 4}`}
          fill="none"
          stroke={`${meta.hex}B8`}
          strokeLinecap="round"
          strokeWidth="0.62"
        />
        <path
          d={`M${Math.max(5, x - 15)} ${y + 8} C${x - 4} ${y + 2}, ${x + 5} ${y + 6}, ${Math.min(95, x + 17)} ${y}`}
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeLinecap="round"
          strokeWidth="0.22"
        />
      </g>
    );
  }

  if (isDistrictTrait(site)) {
    return (
      <g className="civ-portrait-mark" opacity={opacity} style={{ color: meta.hex }}>
        <rect
          x={x - 4.8}
          y={y - 3.6}
          width="9.6"
          height="7.2"
          fill={`${meta.hex}24`}
          stroke={`${meta.hex}9A`}
          strokeWidth="0.32"
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <path
          d={`M${x - 7.2} ${y + 4.8} H${x + 7.6} M${x - 4.2} ${y + 2.1} V${y - 4.2} M${x} ${y + 2.2} V${y - 5.1} M${x + 4.2} ${y + 2.1} V${y - 3.6}`}
          fill="none"
          stroke="rgba(255,244,194,0.52)"
          strokeLinecap="round"
          strokeWidth="0.28"
        />
      </g>
    );
  }

  if (isFieldTrait(site)) {
    return (
      <g className="civ-portrait-mark civ-portrait-loom" opacity={opacity} style={{ color: meta.hex }}>
        <ellipse
          cx={x}
          cy={y}
          rx="8.8"
          ry="3.7"
          fill={`${meta.hex}20`}
          stroke={`${meta.hex}A8`}
          strokeWidth="0.42"
          strokeDasharray={site.trait === 'veil' ? '1.8 1.4' : undefined}
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <ellipse
          cx={x}
          cy={y}
          rx="5.3"
          ry="1.8"
          fill="none"
          stroke="rgba(255,255,255,0.24)"
          strokeWidth="0.2"
          transform={`rotate(${-rotation} ${x} ${y})`}
        />
      </g>
    );
  }

  return (
    <g className="civ-portrait-mark civ-portrait-signal" opacity={opacity} style={{ color: meta.hex }}>
      <ellipse
        cx={x}
        cy={y}
        rx="6.4"
        ry="2.6"
        fill={`${meta.hex}2C`}
        stroke={`${meta.hex}92`}
        strokeWidth="0.32"
        transform={`rotate(${rotation} ${x} ${y})`}
      />
      <circle cx={x} cy={y} r="0.62" fill="rgba(255,255,255,0.76)" />
    </g>
  );
}

function BlueprintProjectZone({
  site,
  scene,
  opacity,
}: {
  site: CivilizationDeploymentSite;
  scene: MarketSceneKind;
  opacity: number;
}) {
  const tone = getCivilizationSiteTone(site);
  const x = site.anchor.x;
  const y = site.anchor.y;
  const wideScale = scene === 'galaxy' ? 1.35 : scene === 'stellar' ? 1.18 : 1;

  if (site.blueprintId === 'bp_antimatter_detonator') {
    return (
      <g className="civ-project-zone" opacity={opacity} style={{ color: tone }}>
        <ellipse
          cx={x}
          cy={y}
          rx={18 * wideScale}
          ry={6.2 * wideScale}
          fill={`${tone}12`}
          stroke={`${tone}58`}
          strokeWidth="0.34"
          strokeDasharray="3 2.8"
          transform={`rotate(-9 ${x} ${y})`}
        />
        <ellipse
          cx={x}
          cy={y}
          rx={10 * wideScale}
          ry={3.2 * wideScale}
          fill="rgba(255,255,255,0.06)"
          stroke="rgba(255,255,255,0.16)"
          strokeWidth="0.16"
          transform={`rotate(-9 ${x} ${y})`}
        />
        <path
          d={`M${Math.max(0, x - 31 * wideScale)} ${y + 8} C${x - 12} ${y + 2}, ${x + 10} ${y + 9}, ${Math.min(100, x + 32 * wideScale)} ${y + 1}`}
          fill="none"
          stroke={`${tone}45`}
          strokeLinecap="round"
          strokeWidth="0.28"
        />
      </g>
    );
  }

  if (site.blueprintId === 'bp_mantle_to_orbit_foundry') {
    const foundryColor = '#dfb86b';
    if (scene === 'galaxy' || scene === 'stellar') {
      const routeD = `M${Math.max(2, x - 30 * wideScale)} ${y + 8} C${x - 12} ${y - 8}, ${x + 12} ${y + 10}, ${Math.min(98, x + 32 * wideScale)} ${y - 7}`;
      return (
        <g className="civ-project-zone" opacity={opacity} style={{ color: foundryColor }}>
          <path
            d={routeD}
            fill="none"
            stroke="rgba(223,184,107,0.18)"
            strokeLinecap="round"
            strokeWidth="2.1"
          />
          <path
            className="civ-portrait-flow"
            d={routeD}
            fill="none"
            stroke="rgba(255,228,163,0.58)"
            strokeLinecap="round"
            strokeWidth="0.42"
          />
          <circle cx={x - 7} cy={y + 1.2} r="0.74" fill="rgba(223,184,107,0.8)" />
          <circle cx={x + 11} cy={y - 2.2} r="0.9" fill="rgba(255,244,194,0.76)" />
        </g>
      );
    }
    const baseY = Math.min(95, y + 19 * wideScale);
    const topY = Math.max(5, y - 28 * wideScale);
    return (
      <g className="civ-project-zone" opacity={opacity} style={{ color: foundryColor }}>
        <path
          d={`M${x - 7} ${baseY} C${x - 3} ${y + 3}, ${x + 4} ${y - 7}, ${x + 14} ${topY}`}
          fill="none"
          stroke="rgba(223,184,107,0.22)"
          strokeLinecap="round"
          strokeWidth="1.55"
        />
        <path
          className="civ-portrait-flow"
          d={`M${x - 7} ${baseY} C${x - 3} ${y + 3}, ${x + 4} ${y - 7}, ${x + 14} ${topY}`}
          fill="none"
          stroke="rgba(255,228,163,0.56)"
          strokeLinecap="round"
          strokeWidth="0.38"
        />
        <path
          d={`M${x - 14} ${baseY + 1} L${x + 1} ${baseY - 4} L${x + 15} ${baseY + 2} Z`}
          fill="rgba(223,184,107,0.08)"
          stroke="rgba(223,184,107,0.28)"
          strokeWidth="0.3"
        />
      </g>
    );
  }

  if (site.blueprintId === 'bp_worldshield_covenant') {
    return (
      <g className="civ-project-zone" opacity={opacity} style={{ color: tone }}>
        <path
          d={`M${Math.max(0, x - 30 * wideScale)} ${y + 6} C${x - 13} ${y - 18 * wideScale}, ${x + 13} ${y - 18 * wideScale}, ${Math.min(100, x + 31 * wideScale)} ${y + 5}`}
          fill="none"
          stroke={`${tone}9A`}
          strokeLinecap="round"
          strokeWidth="0.76"
        />
        <path
          d={`M${Math.max(0, x - 23 * wideScale)} ${y + 8} C${x - 8} ${y - 7 * wideScale}, ${x + 8} ${y - 7 * wideScale}, ${Math.min(100, x + 24 * wideScale)} ${y + 7}`}
          fill="none"
          stroke="rgba(255,255,255,0.22)"
          strokeLinecap="round"
          strokeWidth="0.34"
        />
      </g>
    );
  }

  return (
    <g className="civ-project-zone" opacity={opacity} style={{ color: tone }}>
      <ellipse
        cx={x}
        cy={y}
        rx={14 * wideScale}
        ry={5 * wideScale}
        fill={`${tone}18`}
        stroke={`${tone}70`}
        strokeWidth="0.4"
      />
    </g>
  );
}

function LuminaryProjectZone({
  site,
  scene,
  opacity,
}: {
  site: CivilizationDeploymentSite;
  scene: MarketSceneKind;
  opacity: number;
}) {
  const meta = AFFINITY_META[site.affinity];
  const x = site.anchor.x;
  const y = site.anchor.y;
  const spread = scene === 'galaxy' ? 38 : scene === 'stellar' ? 30 : 24;
  const deepSpace = scene === 'stellar' || scene === 'galaxy';
  if (deepSpace) {
    return (
      <g className="civ-project-zone" opacity={opacity * 0.72} style={{ color: meta.hex }}>
        <ellipse
          cx={x}
          cy={y + 7}
          rx={spread * 0.96}
          ry={scene === 'galaxy' ? 11 : 8.5}
          fill={`${meta.hex}12`}
          stroke={`${meta.hex}42`}
          strokeWidth="0.32"
          transform={`rotate(-9 ${x} ${y + 7})`}
        />
        <ellipse
          cx={x + 5}
          cy={y + 5}
          rx={spread * 0.58}
          ry={scene === 'galaxy' ? 5.4 : 4.2}
          fill="none"
          stroke="rgba(255,255,255,0.11)"
          strokeWidth="0.2"
          transform={`rotate(10 ${x + 5} ${y + 5})`}
        />
      </g>
    );
  }
  return (
    <g className="civ-project-zone" opacity={opacity} style={{ color: meta.hex }}>
      <path
        d={`M${Math.max(0, x - spread)} ${y + 8} C${x - 18} ${y - 9}, ${x + 16} ${y - 10}, ${Math.min(100, x + spread)} ${y + 6}`}
        fill="none"
        stroke={`${meta.hex}78`}
        strokeLinecap="round"
        strokeWidth="1.2"
      />
      <path
        d={`M${Math.max(0, x - spread + 5)} ${y + 13} C${x - 10} ${y + 1}, ${x + 10} ${y + 1}, ${Math.min(100, x + spread - 5)} ${y + 12}`}
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeLinecap="round"
        strokeWidth="0.32"
      />
    </g>
  );
}

function ArtifactProjectZone({
  site,
  index,
  opacity,
}: {
  site: CivilizationDeploymentSite;
  index: number;
  opacity: number;
}) {
  const meta = AFFINITY_META[site.affinity];
  const x = site.anchor.x;
  const y = site.anchor.y;
  const rotation = index % 2 === 0 ? -8 : 10;

  if (site.representationMode === 'local_trace') {
    return (
      <g className="civ-project-zone" opacity={Math.max(0.22, opacity)} style={{ color: meta.hex }}>
        <path
          d={`M${x - 3.2} ${y + 1.6} C${x - 1.3} ${y - 1.3}, ${x + 1.2} ${y + 2}, ${x + 3.7} ${y - 1.1}`}
          fill="none"
          stroke={`${meta.hex}94`}
          strokeLinecap="round"
          strokeWidth="0.34"
        />
        <circle cx={x - 3.2} cy={y + 1.6} r="0.46" fill={`${meta.hex}CC`} />
        <circle cx={x + 0.1} cy={y + 0.1} r="0.56" fill="rgba(255,255,255,0.7)" />
        <circle cx={x + 3.7} cy={y - 1.1} r="0.46" fill={`${meta.hex}B8`} />
      </g>
    );
  }

  if (isRouteTrait(site)) {
    const deepSpace = site.scaleBand !== 'planetary';
    if (deepSpace) {
      const routeRx = site.scaleBand === 'galactic' ? 24 : 19;
      return (
        <g className="civ-project-zone" opacity={opacity * 0.68} style={{ color: meta.hex }}>
          <ellipse
            cx={x}
            cy={y + 2}
            rx={routeRx}
            ry={site.scaleBand === 'galactic' ? 7.2 : 5.6}
            fill={`${meta.hex}12`}
            stroke={`${meta.hex}42`}
            strokeWidth="0.3"
            transform={`rotate(${rotation} ${x} ${y + 2})`}
          />
          <path
            d={`M${Math.max(3, x - routeRx * 0.78)} ${y + 4} C${x - 8} ${y - 1}, ${x + 8} ${y + 5}, ${Math.min(97, x + routeRx * 0.8)} ${y + 1}`}
            fill="none"
            stroke={`${meta.hex}58`}
            strokeLinecap="round"
            strokeWidth="0.3"
          />
        </g>
      );
    }
    return (
      <g className="civ-project-zone" opacity={opacity} style={{ color: meta.hex }}>
        <path
          d={`M${Math.max(0, x - 28)} ${y + 8} C${x - 12} ${y - 8}, ${x + 10} ${y + 12}, ${Math.min(100, x + 30)} ${y - 5}`}
          fill="none"
          stroke={`${meta.hex}70`}
          strokeLinecap="round"
          strokeWidth="0.76"
        />
        <path
          d={`M${Math.max(0, x - 21)} ${y + 3.4} C${x - 8} ${y - 4.4}, ${x + 7} ${y + 5.8}, ${Math.min(100, x + 23)} ${y - 2}`}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
          strokeLinecap="round"
          strokeWidth="0.26"
        />
      </g>
    );
  }

  if (isFieldTrait(site)) {
    return (
      <g className="civ-project-zone" opacity={opacity} style={{ color: meta.hex }}>
        <ellipse
          cx={x}
          cy={y}
          rx="10"
          ry="3.7"
          fill={`${meta.hex}16`}
          stroke={`${meta.hex}66`}
          strokeWidth="0.36"
          strokeDasharray={site.trait === 'veil' ? '2 1.6' : undefined}
          transform={`rotate(${rotation} ${x} ${y})`}
        />
      </g>
    );
  }

  if (isDistrictTrait(site)) {
    return (
      <g className="civ-project-zone" opacity={opacity} style={{ color: meta.hex }}>
        <path
          d={`M${x - 7} ${y + 3} L${x - 3} ${y - 2.6} L${x + 3.5} ${y - 3.5} L${x + 7.2} ${y + 2.5} Z`}
          fill={`${meta.hex}14`}
          stroke={`${meta.hex}66`}
          strokeLinejoin="round"
          strokeWidth="0.32"
          transform={`rotate(${rotation} ${x} ${y})`}
        />
        <path
          d={`M${x - 4.5} ${y + 1.6} H${x + 4.4} M${x - 1.8} ${y - 0.5} H${x + 3.2} M${x + 0.8} ${y - 2.4} H${x + 5.4}`}
          stroke={`${meta.hex}8C`}
          strokeLinecap="round"
          strokeWidth="0.3"
          transform={`rotate(${rotation} ${x} ${y})`}
        />
      </g>
    );
  }

  return (
    <g className="civ-project-zone" opacity={opacity} style={{ color: meta.hex }}>
      <rect
        x={x - 6}
        y={y - 4}
        width="12"
        height="8"
        fill={`${meta.hex}12`}
        stroke={`${meta.hex}58`}
        strokeWidth="0.3"
        transform={`rotate(${rotation} ${x} ${y})`}
      />
    </g>
  );
}

function TraitSignatureMark({
  descriptor,
  index,
  scene,
  opacity,
}: {
  descriptor: CivilizationVisualSignatureDescriptor;
  index: number;
  scene: MarketSceneKind;
  opacity: number;
}) {
  const { site, kind } = descriptor;
  const meta = AFFINITY_META[site.affinity];
  const tone = getCivilizationSiteTone(site);
  const x = site.anchor.x;
  const y = site.anchor.y;
  const wideScale = scene === 'galaxy' ? 1.28 : scene === 'stellar' ? 1.12 : 1;
  const rotation = index % 2 === 0 ? -9 : 12;

  if (kind === 'reactor') {
    return (
      <g className="civ-portrait-mark civ-portrait-signal" opacity={opacity} style={{ color: meta.hex }}>
        <path d={`M${x} ${y + 10} L${x - 3.2} ${y + 1.8} L${x} ${y - 9} L${x + 3.2} ${y + 1.8} Z`} fill={`${meta.hex}20`} stroke={`${meta.hex}A8`} strokeWidth="0.36" />
        <path d={`M${x - 9} ${y + 5} C${x - 4} ${y}, ${x - 3} ${y - 5}, ${x} ${y - 10} M${x + 9} ${y + 5} C${x + 4} ${y}, ${x + 3} ${y - 5}, ${x} ${y - 10}`} fill="none" stroke="rgba(255,244,194,0.42)" strokeLinecap="round" strokeWidth="0.28" />
      </g>
    );
  }

  if (kind === 'biosphere') {
    return (
      <g className="civ-portrait-mark civ-portrait-signal" opacity={opacity} style={{ color: meta.hex }}>
        <path d={`M${Math.max(2, x - 22 * wideScale)} ${y + 7} C${x - 12} ${y - 9}, ${x + 9} ${y + 11}, ${Math.min(98, x + 24 * wideScale)} ${y - 7}`} fill="none" stroke={`${meta.hex}A8`} strokeLinecap="round" strokeWidth="0.62" />
        <path d={`M${x - 7} ${y + 1} C${x - 5} ${y - 5}, ${x - 1} ${y - 6}, ${x + 2} ${y - 2} M${x + 4} ${y + 3} C${x + 9} ${y - 2}, ${x + 13} ${y}, ${x + 15} ${y + 5}`} fill="none" stroke="rgba(229,255,238,0.46)" strokeLinecap="round" strokeWidth="0.24" />
        <circle cx={x - 7} cy={y + 1} r="0.7" fill={`${meta.hex}CC`} />
        <circle cx={x + 15} cy={y + 5} r="0.55" fill="rgba(229,255,238,0.72)" />
      </g>
    );
  }

  if (kind === 'clock') {
    return (
      <g className="civ-portrait-mark" opacity={opacity} style={{ color: meta.hex }}>
        <ellipse cx={x} cy={y} rx={10 * wideScale} ry={4.2 * wideScale} fill="none" stroke={`${meta.hex}96`} strokeWidth="0.36" strokeDasharray="1.2 2" transform={`rotate(${rotation} ${x} ${y})`} />
        <ellipse cx={x} cy={y} rx={5.8 * wideScale} ry={2.2 * wideScale} fill={`${meta.hex}10`} stroke="rgba(255,255,255,0.28)" strokeWidth="0.18" transform={`rotate(${-rotation} ${x} ${y})`} />
        <path d={`M${x} ${y - 6.5} V${y - 9.2} M${x + 7.5} ${y} H${x + 10.5} M${x} ${y + 6.5} V${y + 9.2} M${x - 7.5} ${y} H${x - 10.5}`} stroke={`${meta.hex}9A`} strokeLinecap="round" strokeWidth="0.22" />
      </g>
    );
  }

  if (kind === 'transit') {
    return (
      <g className="civ-portrait-mark" opacity={opacity} style={{ color: meta.hex }}>
        <path className="civ-portrait-flow" d={`M${Math.max(1, x - 29 * wideScale)} ${y + 8} C${x - 12} ${y - 9}, ${x + 13} ${y + 11}, ${Math.min(99, x + 32 * wideScale)} ${y - 6}`} fill="none" stroke={`${meta.hex}B2`} strokeLinecap="round" strokeWidth="0.58" />
        <path d={`M${Math.max(3, x - 21 * wideScale)} ${y + 2.8} C${x - 6} ${y - 3}, ${x + 7} ${y + 5}, ${Math.min(97, x + 23 * wideScale)} ${y - 1.5}`} fill="none" stroke="rgba(255,255,255,0.28)" strokeLinecap="round" strokeWidth="0.24" />
        <circle cx={Math.max(4, x - 11 * wideScale)} cy={y + 1} r="0.72" fill={`${meta.hex}CC`} />
        <circle cx={Math.min(96, x + 13 * wideScale)} cy={y - 0.8} r="0.62" fill="rgba(255,255,255,0.76)" />
      </g>
    );
  }

  if (kind === 'archive') {
    return (
      <g className="civ-portrait-mark civ-portrait-signal" opacity={opacity} style={{ color: meta.hex }}>
        <path d={`M${x - 8} ${y + 7} V${y - 3} M${x - 2.8} ${y + 8} V${y - 9} M${x + 2.8} ${y + 8} V${y - 6} M${x + 8} ${y + 7} V${y - 1}`} stroke={`${meta.hex}9E`} strokeLinecap="round" strokeWidth="0.46" />
        <path d={`M${x - 11} ${y + 8} H${x + 11} M${x - 7} ${y - 3} H${x + 7} M${x - 3} ${y - 9} H${x + 3}`} stroke="rgba(255,255,255,0.24)" strokeLinecap="round" strokeWidth="0.22" />
      </g>
    );
  }

  if (kind === 'lattice') {
    return (
      <g className="civ-portrait-mark" opacity={opacity} style={{ color: meta.hex }}>
        <path d={`M${x - 10} ${y} L${x - 4} ${y - 6} L${x + 4} ${y - 6} L${x + 10} ${y} L${x + 4} ${y + 6} L${x - 4} ${y + 6} Z M${x - 4} ${y - 6} L${x + 4} ${y + 6} M${x + 4} ${y - 6} L${x - 4} ${y + 6}`} fill={`${meta.hex}10`} stroke={`${meta.hex}82`} strokeLinejoin="round" strokeWidth="0.28" transform={`rotate(${rotation} ${x} ${y})`} />
        <circle cx={x - 10} cy={y} r="0.5" fill={`${meta.hex}CC`} />
        <circle cx={x + 10} cy={y} r="0.5" fill={`${meta.hex}CC`} />
      </g>
    );
  }

  if (kind === 'veil') {
    return (
      <g className="civ-portrait-mark" opacity={opacity} style={{ color: meta.hex }}>
        <path d={`M${x - 18} ${y - 6} H${x + 16} M${x - 22} ${y} H${x + 12} M${x - 14} ${y + 6} H${x + 20}`} stroke={`${meta.hex}8F`} strokeLinecap="round" strokeWidth="0.72" strokeDasharray="3 3" transform={`rotate(${rotation} ${x} ${y})`} />
        <path d={`M${x - 18} ${y - 6} H${x + 16} M${x - 22} ${y} H${x + 12} M${x - 14} ${y + 6} H${x + 20}`} stroke="rgba(0,0,0,0.64)" strokeLinecap="round" strokeWidth="0.24" strokeDasharray="1 4" transform={`rotate(${rotation} ${x} ${y})`} />
      </g>
    );
  }

  if (kind === 'containment') {
    return (
      <g className="civ-portrait-mark civ-portrait-loom" opacity={opacity} style={{ color: meta.hex }}>
        <ellipse cx={x} cy={y} rx={11 * wideScale} ry={4.4 * wideScale} fill={`${meta.hex}12`} stroke={`${meta.hex}98`} strokeWidth="0.38" strokeDasharray="2.2 1.8" transform={`rotate(${rotation} ${x} ${y})`} />
        <path d={`M${x - 12} ${y - 5} L${x - 8} ${y - 8} M${x + 12} ${y + 5} L${x + 8} ${y + 8} M${x - 12} ${y + 5} L${x - 8} ${y + 8} M${x + 12} ${y - 5} L${x + 8} ${y - 8}`} stroke="rgba(255,255,255,0.22)" strokeLinecap="round" strokeWidth="0.24" />
      </g>
    );
  }

  if (kind === 'replication') {
    return (
      <g className="civ-portrait-mark civ-portrait-signal" opacity={opacity} style={{ color: meta.hex }}>
        {[0, 1, 2, 3].map((step) => (
          <rect
            key={step}
            x={x - 10 + step * 5.4}
            y={y - 4 + (step % 2) * 3.2}
            width="3.6"
            height="3.6"
            fill={`${meta.hex}20`}
            stroke={`${meta.hex}8E`}
            strokeWidth="0.22"
            transform={`rotate(${rotation} ${x} ${y})`}
          />
        ))}
        <path d={`M${x - 11} ${y + 6} C${x - 4} ${y + 2}, ${x + 5} ${y + 7}, ${x + 12} ${y + 2}`} fill="none" stroke="rgba(255,255,255,0.22)" strokeLinecap="round" strokeWidth="0.24" />
      </g>
    );
  }

  if (kind === 'accord') {
    return (
      <g className="civ-portrait-mark civ-portrait-signal" opacity={opacity} style={{ color: meta.hex }}>
        <circle cx={x - 5.5} cy={y} r="3.8" fill={`${meta.hex}12`} stroke={`${meta.hex}88`} strokeWidth="0.28" />
        <circle cx={x + 5.5} cy={y} r="3.8" fill={`${meta.hex}12`} stroke={`${meta.hex}88`} strokeWidth="0.28" />
        <path d={`M${x - 1.5} ${y} H${x + 1.5} M${x - 9.5} ${y + 5.8} C${x - 3} ${y + 10}, ${x + 3} ${y + 10}, ${x + 9.5} ${y + 5.8}`} stroke="rgba(255,255,255,0.24)" strokeLinecap="round" strokeWidth="0.24" fill="none" />
      </g>
    );
  }

  if (kind === 'entropy') {
    return (
      <g className="civ-portrait-mark" opacity={opacity} style={{ color: meta.hex }}>
        <path d={`M${Math.max(2, x - 20)} ${y + 4} C${x - 12} ${y - 5}, ${x - 4} ${y + 12}, ${x + 4} ${y + 2} S${Math.min(98, x + 22)} ${y + 1}, ${Math.min(98, x + 25)} ${y - 7}`} fill="none" stroke={`${meta.hex}9F`} strokeLinecap="round" strokeWidth="0.58" />
        <path d={`M${x - 13} ${y + 9} C${x - 4} ${y + 4}, ${x + 6} ${y + 10}, ${x + 15} ${y + 4}`} fill="none" stroke="rgba(255,255,255,0.2)" strokeLinecap="round" strokeWidth="0.22" />
      </g>
    );
  }

  if (kind === 'quarantine') {
    return (
      <g className="civ-portrait-mark civ-portrait-loom" opacity={opacity} style={{ color: tone }}>
        <ellipse cx={x} cy={y} rx={15 * wideScale} ry={5.2 * wideScale} fill={`${tone}12`} stroke={`${tone}A8`} strokeWidth="0.42" strokeDasharray="2 1.3" transform={`rotate(${rotation} ${x} ${y})`} />
        <path d={`M${x - 18} ${y - 7} L${x + 18} ${y + 7} M${x - 18} ${y + 7} L${x + 18} ${y - 7}`} stroke="rgba(255,255,255,0.24)" strokeLinecap="round" strokeWidth="0.26" transform={`rotate(${rotation} ${x} ${y})`} />
        <circle cx={x} cy={y} r="2.1" fill={`${tone}24`} stroke="rgba(255,255,255,0.34)" strokeWidth="0.2" />
      </g>
    );
  }

  if (kind === 'foundry') {
    const foundryColor = '#dfb86b';
    return (
      <g className="civ-portrait-mark civ-portrait-signal" opacity={opacity} style={{ color: foundryColor }}>
        <path d={`M${x - 12} ${y + 10} C${x - 5} ${y + 2}, ${x - 3} ${y - 5}, ${x} ${y - 12} C${x + 3} ${y - 5}, ${x + 5} ${y + 2}, ${x + 12} ${y + 10}`} fill="none" stroke="rgba(255,228,163,0.62)" strokeLinecap="round" strokeWidth="0.46" />
        <path d={`M${x - 5} ${y + 9} V${y - 8} M${x + 5} ${y + 9} V${y - 8} M${x - 8} ${y + 5} H${x + 8}`} stroke="rgba(255,244,194,0.36)" strokeLinecap="round" strokeWidth="0.28" />
        <circle cx={x} cy={y - 10.4} r="0.8" fill="rgba(255,244,194,0.78)" />
      </g>
    );
  }

  if (kind === 'shield') {
    return (
      <g className="civ-portrait-mark civ-portrait-loom" opacity={opacity} style={{ color: tone }}>
        <path d={`M${x - 15} ${y - 1} C${x - 11} ${y - 10}, ${x + 11} ${y - 10}, ${x + 15} ${y - 1} C${x + 10} ${y + 10}, ${x - 10} ${y + 10}, ${x - 15} ${y - 1} Z`} fill={`${tone}0F`} stroke={`${tone}94`} strokeWidth="0.34" />
        <path d={`M${x - 9} ${y - 1} C${x - 4} ${y - 4}, ${x + 4} ${y - 4}, ${x + 9} ${y - 1} M${x - 8} ${y + 4} C${x - 3} ${y + 7}, ${x + 3} ${y + 7}, ${x + 8} ${y + 4}`} fill="none" stroke="rgba(255,255,255,0.26)" strokeLinecap="round" strokeWidth="0.22" />
      </g>
    );
  }

  if (kind === 'luminary') {
    const nodes = [
      [0, -7.5],
      [6.5, -3],
      [6, 4.8],
      [0, 8],
      [-6, 4.8],
      [-6.5, -3],
    ];
    return (
      <g className="civ-portrait-mark civ-portrait-signal" opacity={opacity} style={{ color: meta.hex }}>
        <path d={nodes.map(([dx, dy], nodeIndex) => `${nodeIndex === 0 ? 'M' : 'L'}${x + dx} ${y + dy}`).join(' ') + ' Z'} fill={`${meta.hex}10`} stroke={`${meta.hex}8F`} strokeWidth="0.26" />
        {nodes.map(([dx, dy], nodeIndex) => (
          <circle key={`${dx}:${dy}:${nodeIndex}`} cx={x + dx} cy={y + dy} r={nodeIndex === 0 ? 1.05 : 0.74} fill={`${meta.hex}C8`} />
        ))}
        <circle cx={x} cy={y} r="1.8" fill="rgba(255,255,255,0.44)" />
      </g>
    );
  }

  if (kind === 'sealed') {
    return (
      <g className="civ-portrait-mark" opacity={opacity} style={{ color: tone }}>
        <rect x={x - 12} y={y - 6} width="24" height="12" fill="rgba(0,0,0,0.2)" stroke={`${tone}78`} strokeWidth="0.28" strokeDasharray="2 2" transform={`rotate(${rotation} ${x} ${y})`} />
        <path d={`M${x - 8} ${y - 2} H${x + 8} M${x - 9} ${y + 2} H${x + 5}`} stroke="rgba(255,255,255,0.22)" strokeLinecap="round" strokeWidth="0.24" transform={`rotate(${rotation} ${x} ${y})`} />
      </g>
    );
  }

  return (
    <g className="civ-portrait-mark civ-portrait-signal" opacity={opacity} style={{ color: meta.hex }}>
      <path d={`M${x - 13} ${y + 8} L${x - 5} ${y} L${x - 13} ${y - 8} M${x + 13} ${y + 8} L${x + 5} ${y} L${x + 13} ${y - 8}`} fill="none" stroke={`${meta.hex}9E`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.5" />
      <ellipse cx={x} cy={y} rx={5.8 * wideScale} ry={2.4 * wideScale} fill={`${meta.hex}14`} stroke="rgba(255,255,255,0.22)" strokeWidth="0.18" />
    </g>
  );
}

function CivilizationTraitSignatureLayer({
  sites,
  scene,
  scanActive,
  maxSites,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: MarketSceneKind;
  scanActive: boolean;
  maxSites: number;
}) {
  const signatures = React.useMemo(() => (
    selectCivilizationVisualSignatures(sites, {
      limit: maxSites,
      includeSealed: scanActive,
    }).filter((descriptor) => !(
      descriptor.sourceKind === 'artifact' &&
      Boolean(descriptor.site.artifactSceneTreatment)
    ))
  ), [sites, maxSites, scanActive]);

  if (signatures.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[10] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-trait-signatures"
    >
      {signatures.map((descriptor, index) => (
        <TraitSignatureMark
          key={descriptor.site.id}
          descriptor={descriptor}
          index={index}
          scene={scene}
          opacity={Math.max(scanActive ? 0.18 : 0.09, (scanActive ? 0.42 : 0.22) - index * 0.04)}
        />
      ))}
    </svg>
  );
}

function CivilizationProjectZoneLayer({
  sites,
  scene,
  scanActive,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: MarketSceneKind;
  scanActive: boolean;
}) {
  if (sites.length === 0) return null;
  const renderedSites = scanActive
    ? sites
    : sites.filter((site) => site.kind !== 'protocol').slice(0, 4);
  if (renderedSites.length === 0) return null;
  const baseOpacity = scanActive ? 0.22 : 0.28;
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[9] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-project-zones"
    >
      {renderedSites.map((site, index) => {
        const opacity = Math.max(scanActive ? 0.14 : 0.11, baseOpacity - Math.max(0, index - 1) * 0.04);
        if (site.kind === 'blueprint') {
          return <BlueprintProjectZone key={site.id} site={site} scene={scene} opacity={scanActive ? opacity : opacity * 1.18} />;
        }
        if (site.kind === 'luminary') {
          return <LuminaryProjectZone key={site.id} site={site} scene={scene} opacity={opacity * (scanActive ? 0.86 : 0.72)} />;
        }
        if (site.kind === 'protocol') {
          return scanActive ? <ProtocolPortraitMark key={site.id} site={site} opacity={opacity * 0.72} /> : null;
        }
        if (site.kind === 'artifact' && site.artifactSceneTreatment) {
          return null;
        }
        return <ArtifactProjectZone key={site.id} site={site} index={index} opacity={opacity * (scanActive ? 0.68 : 0.54)} />;
      })}
    </svg>
  );
}

function CivilizationConsequenceLayer({
  sites,
  scene,
  scanActive,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: MarketSceneKind;
  scanActive: boolean;
}) {
  if (sites.length === 0) return null;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[10] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-consequence-layer"
    >
      {sites.map((site, index) => {
        const opacity = getPortraitOpacity(site, index, scanActive);
        if (!scanActive && site.kind === 'protocol') {
          return null;
        }
        if (site.kind === 'blueprint') {
          if (!scanActive && hasDominantBlueprintMark(site)) return null;
          return <BlueprintPortraitMark key={site.id} site={site} scene={scene} opacity={opacity} />;
        }
        if (site.kind === 'protocol') {
          return <ProtocolPortraitMark key={site.id} site={site} opacity={opacity} />;
        }
        if (site.kind === 'luminary') {
          return <LuminaryPortraitMark key={site.id} site={site} scene={scene} opacity={opacity} />;
        }
        return <ArtifactPortraitMark key={site.id} site={site} index={index} opacity={opacity} />;
      })}
    </svg>
  );
}

function DossierSignalEmblem({
  site,
  tone,
}: {
  site: CivilizationDeploymentSite;
  tone: string;
}) {
  return (
    <span
      className="relative grid h-11 w-11 shrink-0 place-items-center overflow-hidden border border-white/12 bg-black/24 sm:h-14 sm:w-14"
      style={{
        borderColor: `${tone}55`,
        boxShadow: `inset 0 0 0 1px ${tone}12, 0 0 22px ${tone}18`,
      }}
      aria-hidden="true"
    >
      <span
        className="absolute inset-1 rounded-full border border-white/8"
        style={{
          background: `radial-gradient(circle, ${tone}26, transparent 68%)`,
          boxShadow: `0 0 24px ${tone}20`,
        }}
      />
      <svg className="relative h-8 w-8 overflow-visible sm:h-10 sm:w-10" viewBox="-12 -12 24 24">
        {site.kind === 'artifact' && site.artifactVisualMotif ? (
          <ArtifactMotifGlyph site={site} x={0} y={0} tone={tone} scale={1.05} emphasis={1.1} />
        ) : site.kind === 'blueprint' ? (
          <g>
            <path d="M0 -8 L7 0 L0 8 L-7 0 Z" fill={`${tone}1F`} stroke={`${tone}D6`} strokeWidth="0.72" />
            <path d="M-4 -1.5 H4 M-4 1.5 H4 M0 -5 V5" stroke="rgba(255,255,255,0.72)" strokeLinecap="round" strokeWidth="0.42" />
          </g>
        ) : site.kind === 'luminary' ? (
          <g>
            {[0, 60, 120, 180, 240, 300].map((rotation) => (
              <circle
                key={rotation}
                cx={Math.cos((rotation * Math.PI) / 180) * 5.4}
                cy={Math.sin((rotation * Math.PI) / 180) * 5.4}
                r="1.05"
                fill={`${tone}B8`}
              />
            ))}
            <circle r="2.2" fill="rgba(255,255,255,0.74)" stroke={`${tone}E0`} strokeWidth="0.45" />
          </g>
        ) : (
          <g>
            <rect x="-6.5" y="-6.5" width="13" height="13" fill={`${tone}18`} stroke={`${tone}C8`} strokeDasharray="1.2 1.2" strokeWidth="0.6" />
            <path d="M-4 0 H4 M0 -4 V4" stroke="rgba(255,255,255,0.66)" strokeLinecap="round" strokeWidth="0.42" />
          </g>
        )}
      </svg>
    </span>
  );
}

function SiteDossier({
  site,
  forgedArtifacts,
  currentScene,
  preferredSide,
  isRecent,
  onZoomToNative,
  onOpenArtifact,
  onClose,
}: {
  site: CivilizationDeploymentSite;
  forgedArtifacts: readonly ArtifactCard[];
  currentScene: MarketSceneKind;
  preferredSide: 'left' | 'right';
  isRecent: boolean;
  onZoomToNative: (scene: MarketSceneKind) => void;
  onOpenArtifact: (card: ArtifactCard) => void;
  onClose: () => void;
}) {
  const relatedCards = site.relatedArtifactIds
    .map((artifactId) => forgedArtifacts.find((card) => card.id === artifactId))
    .filter((card): card is ArtifactCard => Boolean(card));
  const primaryRelatedCard = relatedCards[0] ?? null;
  const meta = AFFINITY_META[site.affinity];
  const tone = getCivilizationSiteTone(site);
  const nativeScene = getNativeSceneForSite(site);
  const artSlot = getCivilizationSiteArtSlot(site);
  const canZoomToNative = currentScene !== nativeScene;
  const scaleContext = getDossierScaleContextLabels(site, nativeScene);
  const sourceLabel = getDossierSourceLabel(site, primaryRelatedCard);
  const registrationTitle = getDossierRegistrationTitle(site);
  const traceScaleBadge = getTraceScaleBadge(site);
  const traceScaleLine = getTraceScaleLine(site);
  const operationalPresentation = getCivilizationSiteOperationalPresentation(site);
  const capabilityReadouts = (site.capabilityIds ?? []).map((capabilityId) => ({
    ...getCivilizationCapabilityDefinition(capabilityId),
    active: site.activeCapabilityIds
      ? site.activeCapabilityIds.includes(capabilityId)
      : isCivilizationSiteOperational(site),
  }));

  return (
    <aside
      className={`pointer-events-auto absolute bottom-2 z-40 max-h-[min(15.25rem,32vh)] w-[min(20rem,82%)] overflow-hidden border border-white/14 bg-[#050914]/88 p-1.5 shadow-2xl backdrop-blur-md sm:inset-x-auto sm:bottom-3 sm:top-auto sm:max-h-[min(27rem,calc(100%-1.5rem))] sm:w-[min(24rem,calc(100%-1.5rem))] sm:overflow-y-auto sm:p-2.5 lg:max-h-[min(31rem,calc(100%-1.5rem))] lg:w-[min(26rem,calc(100%-2rem))] ${
        preferredSide === 'left' ? 'left-3 right-auto sm:left-3 sm:right-auto' : 'left-auto right-3 sm:right-3'
      }`}
      aria-label={`${site.title} dossier`}
      data-dossier-side={preferredSide}
      data-recent-trace={isRecent ? 'true' : undefined}
      data-operational-state={site.implementationState ?? site.projectState ?? 'operational'}
      style={isRecent ? {
        borderColor: `${tone}7A`,
        boxShadow: `0 18px 46px rgba(0,0,0,0.58), 0 0 32px ${tone}24, inset 0 0 0 1px ${tone}14`,
      } : undefined}
    >
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-2 sm:grid-cols-[3.5rem_minmax(0,1fr)_auto] sm:gap-3">
        <DossierSignalEmblem site={site} tone={tone} />
        <div className="min-w-0">
            <p
              className="text-[8px] font-black uppercase tracking-widest text-white/44"
              data-testid="civilization-dossier-scale-kicker"
              data-view-scale={currentScene}
              data-native-scale={nativeScene}
              data-influence-scale={getSceneForScaleBand(site.scaleBand)}
            >
              {isRecent ? 'New trace // ' : ''}
              {getDossierScaleKicker(site, currentScene, nativeScene)}
            </p>
            <h3 className="mt-1 line-clamp-2 text-[13px] font-semibold leading-tight text-white sm:text-sm">{site.title}</h3>
            <p className="mt-1 hidden text-[9px] font-semibold uppercase tracking-wider text-white/42 sm:block">
              {site.laneLabel}
            </p>
            {scaleContext && (
              <div
                className="mt-1 hidden flex-wrap gap-1 sm:flex"
                data-testid="civilization-dossier-scale-context"
                aria-label={`${scaleContext.native}${scaleContext.influence ? `; ${scaleContext.influence}` : ''}`}
              >
                <span className="border border-white/10 bg-white/[0.035] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-white/44">
                  {scaleContext.native}
                </span>
                {scaleContext.influence && (
                  <span className="border border-white/10 bg-white/[0.035] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-white/44">
                    {scaleContext.influence}
                  </span>
                )}
              </div>
            )}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {isRecent && (
            <span
              className="hidden rounded-full border px-2 py-0.5 text-[8px] font-black uppercase text-[#fff3bd] sm:inline-flex"
              style={{
                borderColor: `${tone}66`,
                backgroundColor: `${tone}16`,
                boxShadow: `0 0 14px ${tone}24`,
              }}
            >
              New
            </span>
          )}
          <span
            className="rounded-full border px-2 py-0.5 text-[8px] font-black uppercase"
            style={{
              borderColor: `${tone}66`,
              color: tone,
              backgroundColor: `${tone}15`,
            }}
          >
            {meta.shortName}
          </span>
          <button
            type="button"
            className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-white/[0.045] text-white/60 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Close scan dossier"
            onClick={onClose}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        className="mt-1.5 grid gap-1 border border-white/12 bg-black/22 p-1.5 sm:mt-3 sm:gap-1.5 sm:p-2.5"
        data-testid="civilization-dossier-site-report"
        style={{
          borderColor: `${tone}38`,
          boxShadow: `inset 0 0 0 1px ${tone}0F`,
        }}
      >
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/34">Site report</span>
          <span className="flex min-w-0 items-center gap-1">
            <span
              className="max-w-[8.5rem] truncate rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em]"
              style={{ borderColor: `${tone}55`, color: tone, background: `${tone}10` }}
            >
              {traceScaleBadge}
            </span>
            <span
              className="truncate rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em]"
              data-testid="civilization-dossier-operational-status"
              style={{
                borderColor: `${operationalPresentation.tone}66`,
                color: operationalPresentation.tone,
                background: `${operationalPresentation.tone}12`,
              }}
            >
              {operationalPresentation.label}
            </span>
          </span>
        </div>
        <p className="line-clamp-2 text-[9px] font-semibold uppercase tracking-[0.08em] text-white/72 sm:line-clamp-none sm:text-[10px]">
          {traceScaleLine}
        </p>
        <p className="hidden text-[10px] leading-relaxed text-white/54 sm:block">
          {site.visibleAs}.
        </p>
        {capabilityReadouts[0] && (
          <p className="line-clamp-2 text-[9px] leading-relaxed text-white/52 sm:hidden">
            <span className="font-black uppercase tracking-[0.12em] text-white/34">Capability </span>
            <span className="font-semibold text-white/72">{capabilityReadouts[0].label}:</span>
            {' '}{capabilityReadouts[0].description}
            {!capabilityReadouts[0].active ? ' Inactive.' : ''}
            {capabilityReadouts.length > 1 ? ` +${capabilityReadouts.length - 1} more.` : ''}
          </p>
        )}
      </div>

      <div className="mt-1.5 grid grid-cols-[minmax(0,1fr)_auto] items-stretch gap-1.5 sm:hidden">
        <span
          className="min-w-0 border border-white/10 bg-white/[0.04] px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-white/42"
          title={sourceLabel}
        >
          <span className="block text-white/30">Source</span>
          <span className="block truncate text-white/66">{sourceLabel}</span>
        </span>
        <span className="border border-white/10 bg-white/[0.04] px-2 py-1 text-[7px] font-black uppercase tracking-[0.12em] text-white/42">
          <span className="block text-white/30">Readout</span>
          <span className="block text-white/66">{getDossierReadoutLabel(site)}</span>
        </span>
      </div>

      <div
        className="mt-2 hidden border border-white/12 bg-white/[0.045] p-2 sm:mt-3 sm:block sm:p-2.5"
        data-testid="civilization-dossier-intelligence"
        style={{
          borderColor: `${tone}3d`,
          boxShadow: `inset 0 0 0 1px ${tone}10, 0 0 22px ${tone}10`,
        }}
      >
        <div className="flex gap-2">
          <span
            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center border border-white/12 bg-black/20"
            style={{ color: tone, borderColor: `${tone}4d` }}
            aria-hidden="true"
          >
            <ScanLine className="h-3.5 w-3.5" />
          </span>
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/38">
              Civilization scan
            </p>
            <p className="mt-0.5 text-[11px] font-semibold leading-snug text-white/86">
              {registrationTitle}
            </p>
            <p className="mt-1 text-[10px] leading-relaxed text-white/60">
              {getDossierRegistrationBody(site, nativeScene)}
            </p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-[8px] font-black uppercase tracking-[0.12em] text-white/42">
          <span
            className="col-span-2 min-w-0 border border-white/10 bg-black/18 px-2 py-1"
            data-testid="civilization-dossier-source-label"
            title={sourceLabel}
          >
            <span className="block text-white/30">Source</span>
            <span className="block truncate text-white/62">{sourceLabel}</span>
          </span>
          <span className="min-w-0 border border-white/10 bg-black/18 px-2 py-1">
            <span className="block text-white/30">Native layer</span>
            <span className="block truncate text-white/62">{SCENE_UI[nativeScene].zoomLabel}</span>
          </span>
          <span
            className="min-w-0 border border-white/10 bg-black/18 px-2 py-1"
            data-testid="civilization-dossier-readout-label"
          >
            <span className="block text-white/30">Readout</span>
            <span className="block truncate text-white/62">{getDossierReadoutLabel(site)}</span>
          </span>
          <span className="min-w-0 border border-white/10 bg-black/18 px-2 py-1">
            <span className="block text-white/30">Evidence</span>
            <span className="block truncate text-white/62">{getDossierEvidenceLabel(site)}</span>
          </span>
          <span className="min-w-0 border border-white/10 bg-black/18 px-2 py-1">
            <span className="block text-white/30">Operation</span>
            <span className="block truncate" style={{ color: operationalPresentation.tone }}>
              {operationalPresentation.label}
            </span>
          </span>
        </div>
      </div>

      {canZoomToNative && (
        <button
          type="button"
          className="mt-1.5 flex w-full items-center justify-between gap-2 border border-white/12 bg-white/[0.045] px-2.5 py-2 text-left text-[9px] font-black uppercase tracking-[0.14em] text-white/70 transition-colors hover:border-white/24 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:mt-2"
          style={{
            borderColor: `${tone}45`,
            boxShadow: `inset 0 0 0 1px ${tone}10`,
          }}
          onClick={() => onZoomToNative(nativeScene)}
        >
          <span className="min-w-0">
            <span className="block text-white/44">Show true artifact scale</span>
            <span className="mt-0.5 block truncate text-white/82">
              View in {SCENE_UI[nativeScene].zoomLabel}
            </span>
          </span>
          <ZoomIn className="h-4 w-4 shrink-0" style={{ color: tone }} aria-hidden="true" />
        </button>
      )}
      {primaryRelatedCard && (
        <button
          type="button"
          className="mt-1.5 flex w-full items-center justify-between gap-2 border border-white/12 bg-white/[0.04] px-2 py-1.5 text-left text-[8px] font-black uppercase tracking-[0.12em] text-white/62 transition-colors hover:border-white/24 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 sm:hidden"
          onClick={() => onOpenArtifact(primaryRelatedCard)}
        >
          <span className="min-w-0 truncate">Inspect artifact record</span>
          <ZoomIn className="h-3.5 w-3.5 shrink-0" style={{ color: tone }} aria-hidden="true" />
        </button>
      )}
      <div className="mt-2 hidden gap-1.5 text-[10px] leading-relaxed text-white/62 sm:grid">
        <p className="border-l pl-2" style={{ borderColor: `${tone}66` }}>
          <span className="font-black uppercase tracking-widest text-white/38">Scene cue </span>
          {site.visualCue}.
        </p>
        {site.synergySummary && (
          <p className="border-l border-white/12 pl-2">
            <span className="font-black uppercase tracking-widest text-white/38">Interaction </span>
            {site.synergySummary}
          </p>
        )}
      </div>
      {capabilityReadouts.length > 0 && (
        <div
          className="mt-2 hidden gap-1.5 border-l pl-2 sm:grid"
          data-testid="civilization-dossier-capabilities"
          style={{ borderColor: `${operationalPresentation.tone}66` }}
        >
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/38">
            Civilization capabilities
          </p>
          {capabilityReadouts.map((capability) => (
            <div key={capability.id} className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-1.5">
              <span
                className="mt-1 h-1.5 w-1.5 rounded-full"
                style={{
                  backgroundColor: capability.active ? operationalPresentation.tone : 'rgba(255,255,255,0.18)',
                  boxShadow: capability.active ? `0 0 8px ${operationalPresentation.tone}88` : 'none',
                }}
                aria-hidden="true"
              />
              <p className="text-[9px] leading-relaxed text-white/52">
                <span className="font-semibold text-white/76">{capability.label}</span>
                {' — '}{capability.description}
                {!capability.active && (
                  <span className="font-semibold uppercase text-white/34"> Inactive.</span>
                )}
              </p>
            </div>
          ))}
          <p className="text-[9px] leading-relaxed text-white/42">
            {operationalPresentation.detail}
            {(site.masteryCount ?? 1) > 1 ? ` Mastered ${site.masteryCount} times.` : ''}
          </p>
        </div>
      )}
      <p className="mt-1.5 hidden text-[10px] leading-relaxed text-white/58 line-clamp-3 sm:block">
        {site.summary}
      </p>
      <p className="mt-2 hidden border-l border-white/12 pl-2 text-[10px] leading-relaxed text-white/62 sm:block">
        {getDossierScaleReading(site)}
      </p>
      {site.componentSummary && (
        <p className="mt-2 hidden text-[9px] leading-relaxed text-white/50 sm:block">
          <span className="font-black uppercase tracking-widest text-white/38">Components </span>
          {site.componentSummary}
        </p>
      )}
      {site.supportingArtifactNames && site.supportingArtifactNames.length > 0 && (
        <div className="mt-2 hidden flex-wrap gap-1 sm:flex">
          {site.supportingArtifactNames.slice(0, 4).map((name) => (
            <span
              key={name}
              className="border border-white/10 bg-white/[0.035] px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wider text-white/44"
            >
              {name}
            </span>
          ))}
        </div>
      )}
      {site.gameplayEffect && (
        <p className="mt-1 hidden text-[9px] leading-relaxed text-white/50 sm:block">
          <span className="font-black uppercase tracking-widest text-white/38">Effect </span>
          {site.gameplayEffect}
        </p>
      )}

      {artSlot && (
        <span
          className="sr-only"
          data-testid="civilization-site-art-slot"
          data-art-slot={artSlot.id}
          data-art-resolution={artSlot.resolution}
        >
          {artSlot.label}
        </span>
      )}

      {relatedCards.length > 0 && (
        <div className="mt-3 hidden gap-1.5 sm:grid" data-testid="civilization-dossier-source-artifacts">
          <p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/34">
            Source artifact record
          </p>
          {relatedCards.slice(0, 4).map((card) => (
            <button
              key={card.id}
              type="button"
              className="flex items-center justify-between gap-2 border border-white/12 bg-white/[0.045] px-2.5 py-2 text-left text-[9px] font-semibold text-white/72 transition-colors hover:border-white/25 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              onClick={() => onOpenArtifact(card)}
              data-testid="civilization-dossier-inspect-artifact"
            >
              <span className="min-w-0">
                <span className="block truncate text-white/82">{card.name}</span>
                <span className="mt-0.5 block text-[7px] font-black uppercase tracking-[0.14em] text-white/36">
                  Inspect artifact record
                </span>
              </span>
              <ZoomIn className="h-3.5 w-3.5 shrink-0" style={{ color: tone }} aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}

function InfluenceTray({
  sites,
  selectedSiteId,
  overflowCount,
  clusterGroups,
  recentSiteIds,
  onSelect,
}: {
  sites: readonly CivilizationDeploymentSite[];
  selectedSiteId: string | null;
  overflowCount: number;
  clusterGroups: ReturnType<typeof getClusterGroups>;
  recentSiteIds: readonly string[];
  onSelect: (siteId: string) => void;
}) {
  return (
    <div className="pointer-events-auto grid grid-cols-2 gap-2 max-[390px]:grid-cols-1" aria-label="Scene influences">
      {sites.map((site) => {
        const tone = getCivilizationSiteTone(site);
        const isRecent = recentSiteIds.includes(site.id);
        return (
          <button
            key={site.id}
            type="button"
            aria-label={`Inspect ${site.title}`}
            aria-pressed={site.id === selectedSiteId}
            className={`min-w-0 rounded-[7px] border border-white/14 bg-[#050914]/58 px-2.5 py-1.5 text-left shadow-lg backdrop-blur transition-colors hover:border-white/26 hover:bg-white/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
              isRecent ? 'civ-site-recent' : ''
            }`}
            style={site.id === selectedSiteId ? {
              borderColor: `${tone}80`,
              boxShadow: `0 0 22px ${tone}22`,
            } : isRecent ? {
              borderColor: `${tone}7A`,
              boxShadow: `0 0 18px ${tone}28`,
            } : undefined}
            onClick={() => onSelect(site.id)}
          >
            <span className="mb-1 flex min-w-0 items-center justify-between gap-2">
              <span
                className="block h-0.5 w-10 shrink-0"
                style={{ backgroundColor: tone, boxShadow: `0 0 12px ${tone}` }}
                aria-hidden="true"
              />
              <span
                className="min-w-0 truncate rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em]"
                style={{
                  borderColor: `${tone}50`,
                  color: `${tone}`,
                  background: `${tone}10`,
                }}
              >
                {getTraceScaleBadge(site)}
              </span>
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              {site.kind === 'artifact' && site.artifactVisualMotif && (
                <svg
                  className="h-4 w-4 shrink-0 overflow-visible opacity-85"
                  viewBox="-8 -8 16 16"
                  aria-hidden="true"
                >
                  <ArtifactMotifGlyph site={site} x={0} y={0} tone={tone} scale={0.9} />
                </svg>
              )}
              <strong className="block min-w-0 truncate text-[11px] font-semibold text-white/92">
                {site.title}
              </strong>
            </span>
            <span className="mt-0.5 block truncate text-[10px] text-white/58">
              {getInfluenceSubtitle(site)}
            </span>
            <span className="mt-1 block truncate border-t border-white/8 pt-1 text-[8px] font-semibold uppercase tracking-[0.08em] text-white/46">
              {getTraceScaleLine(site)}
            </span>
          </button>
        );
      })}
      {overflowCount > 0 && (
        <div className="min-w-0 rounded-[7px] border border-white/10 bg-[#050914]/46 px-2.5 py-1.5 text-left text-white/50 backdrop-blur">
          <strong className="block text-[10px] font-black uppercase tracking-widest">
            +{overflowCount} clustered
          </strong>
          <span className="mt-0.5 block truncate text-[9px] text-white/42">
            {clusterGroups.slice(0, 2).map((group) => (
              group.pinTraceCount > 0
                ? `${group.pinTraceCount} small artifact trace${group.pinTraceCount === 1 ? '' : 's'}`
                : `${group.count} ${group.label}`
            )).join(' / ')}
          </span>
        </div>
      )}
    </div>
  );
}

function MobileInfluenceRail({
  sites,
  selectedSiteId,
  overflowCount,
  recentSiteIds,
  onSelect,
}: {
  sites: readonly CivilizationDeploymentSite[];
  selectedSiteId: string | null;
  overflowCount: number;
  recentSiteIds: readonly string[];
  onSelect: (siteId: string) => void;
}) {
  if (sites.length === 0) return null;

  return (
    <div
      className="pointer-events-auto absolute inset-x-2 top-2 z-[35] flex snap-x snap-mandatory gap-1 overflow-x-auto border border-white/10 bg-[#050914]/72 p-1 shadow-[0_14px_34px_rgba(0,0,0,0.52)] backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      data-testid="civilization-mobile-scan-rail"
      aria-label="Mobile scan sites"
    >
      {sites.map((site, index) => {
        const tone = getCivilizationSiteTone(site);
        const selected = site.id === selectedSiteId;
        const isRecent = recentSiteIds.includes(site.id);
        return (
          <button
            key={site.id}
            type="button"
            aria-label={`Inspect scan site ${index + 1}`}
            aria-pressed={selected}
            className={`flex min-w-[8.25rem] max-w-[9rem] shrink-0 snap-start items-center gap-1.5 border bg-[#050914]/72 px-1.5 py-1.5 text-left shadow-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${
              isRecent ? 'civ-site-recent' : ''
            }`}
            style={{
              borderColor: selected ? `${tone}9C` : isRecent ? `${tone}78` : 'rgba(255,255,255,0.12)',
              boxShadow: selected || isRecent ? `0 0 20px ${tone}24` : undefined,
            }}
            onClick={() => onSelect(site.id)}
          >
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center border border-white/10 bg-white/[0.04]"
              style={{ color: tone }}
              aria-hidden="true"
            >
              {site.kind === 'artifact' && site.artifactVisualMotif ? (
                <svg className="h-3.5 w-3.5 overflow-visible" viewBox="-8 -8 16 16">
                  <ArtifactMotifGlyph site={site} x={0} y={0} tone={tone} scale={0.76} />
                </svg>
              ) : (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: tone, boxShadow: `0 0 12px ${tone}` }}
                />
              )}
            </span>
            <span className="min-w-0">
              <span
                className="mb-0.5 block truncate text-[6.5px] font-black uppercase tracking-[0.13em]"
                style={{ color: tone }}
              >
                {getTraceScaleBadge(site)}
              </span>
              <strong className="block truncate text-[8px] font-semibold text-white/90">
                {site.title.replace(/\s+Trace$/i, '')}
              </strong>
              <span className="mt-0.5 block truncate text-[7px] text-white/48">
                {getTraceScaleLine(site)}
              </span>
            </span>
          </button>
        );
      })}
      {overflowCount > 0 && (
        <div className="flex min-w-[4.75rem] shrink-0 snap-start items-center border border-white/10 bg-white/[0.035] px-1.5 py-1 text-[7px] font-black uppercase tracking-widest text-white/46">
          +{overflowCount} more
        </div>
      )}
    </div>
  );
}

function MobileScanPrimaryReadout({
  site,
  isRecent,
  onSelect,
}: {
  site: CivilizationDeploymentSite | null;
  isRecent: boolean;
  onSelect: (siteId: string) => void;
}) {
  if (!site) return null;

  const tone = getCivilizationSiteTone(site);
  const impactKind = getCivilizationImpactKind(site);
  const nativeScene = getNativeSceneForSite(site);

  return (
    <button
      type="button"
      className="pointer-events-auto absolute inset-x-2 bottom-2 z-[36] grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-2 border border-white/12 bg-[#050914]/82 px-2 py-1.5 text-left shadow-[0_16px_38px_rgba(0,0,0,0.56)] backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/65 sm:hidden"
      style={{
        borderColor: `${tone}66`,
        boxShadow: `0 16px 38px rgba(0,0,0,0.56), inset 0 0 0 1px ${tone}12, 0 0 22px ${tone}18`,
      }}
      data-testid="civilization-mobile-scan-command-primary"
      data-impact-kind={impactKind}
      data-native-scene={nativeScene}
      data-recent-trace={isRecent ? 'true' : undefined}
      aria-label="Inspect primary mobile scan readout"
      onClick={() => onSelect(site.id)}
    >
      <span
        className="flex h-8 w-8 items-center justify-center border border-white/12 bg-black/28"
        style={{ color: tone, borderColor: `${tone}55` }}
        aria-hidden="true"
      >
        {site.kind === 'artifact' && site.artifactVisualMotif ? (
          <svg className="h-5 w-5 overflow-visible" viewBox="-8 -8 16 16">
            <ArtifactMotifGlyph site={site} x={0} y={0} tone={tone} scale={0.88} />
          </svg>
        ) : (
          <span
            className="h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: tone, boxShadow: `0 0 12px ${tone}` }}
          />
        )}
      </span>
      <span className="min-w-0">
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className="shrink-0 rounded-full border px-1.5 py-0.5 text-[6.5px] font-black uppercase leading-none tracking-[0.1em]"
            style={{
              borderColor: `${tone}58`,
              color: tone,
              background: `${tone}10`,
            }}
          >
            {getCivilizationImpactBadge(impactKind)}
          </span>
          {isRecent && (
            <span
              className="shrink-0 rounded-full border px-1.5 py-0.5 text-[6.5px] font-black uppercase leading-none tracking-[0.1em] text-[#fff3bd]"
              style={{
                borderColor: `${tone}72`,
                background: `${tone}16`,
                boxShadow: `0 0 12px ${tone}24`,
              }}
            >
              New
            </span>
          )}
          <span className="truncate text-[7px] font-black uppercase tracking-[0.12em] text-white/42">
            Native {SCENE_UI[nativeScene].label} / {getTraceScaleBadge(site)}
          </span>
        </span>
        <strong className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[0.04em] text-white/92">
          {site.title}
        </strong>
        <span className="mt-0.5 block truncate text-[8px] font-semibold uppercase tracking-[0.06em] text-white/52">
          {getInfluenceSubtitle(site)}
        </span>
      </span>
      <span className="min-w-0 max-w-[4.75rem] truncate text-right text-[7px] font-black uppercase tracking-[0.1em] text-white/36">
        Tap
      </span>
      <span className="col-span-3 truncate text-[8px] leading-relaxed text-white/52">
        {site.visibleAs}.
      </span>
    </button>
  );
}

function CivilizationSceneDeploymentLedger({
  sites,
  recentSiteIds,
  limit = 3,
  compact = false,
  onSelect,
}: {
  sites: readonly CivilizationDeploymentSite[];
  recentSiteIds: readonly string[];
  limit?: number;
  compact?: boolean;
  onSelect: (siteId: string) => void;
}) {
  const works = React.useMemo(() => (
    compact
      ? selectCompactSummaryWorks(sites, limit, recentSiteIds)
      : selectSummaryWorks(sites, limit, recentSiteIds)
  ), [compact, sites, limit, recentSiteIds]);

  if (works.length === 0) return null;

  return (
    <div
      className="pointer-events-auto relative ml-auto grid w-full max-w-[23.5rem] gap-1.5 overflow-hidden border border-white/12 bg-[#050914]/64 p-2 shadow-[0_18px_46px_rgba(0,0,0,0.42)] backdrop-blur-md"
      data-testid="civilization-scene-deployment-ledger"
      aria-label="Registered civilization deployments"
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(255,244,194,0.6), rgba(130,221,255,0.42), transparent)' }}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-2">
        <span className="text-[8px] font-black uppercase tracking-[0.18em] text-[#dff7ff]/58">
          Active deployments
        </span>
        <span className="rounded-full border border-[#82ddff]/18 bg-[#82ddff]/8 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-[#dff7ff]/52">
          Scan index
        </span>
      </div>
      <div className="grid gap-1.5">
        {works.map((site) => {
          const tone = getCivilizationSiteTone(site);
          const isRecent = recentSiteIds.includes(site.id);
          const impactKind = getCivilizationImpactKind(site);
          const impactLabel = getCivilizationImpactShortLabel(impactKind);
          return (
            <button
              key={site.id}
              type="button"
              className={`relative grid min-w-0 grid-cols-[1.8rem_minmax(0,1fr)_auto] items-center gap-2 overflow-hidden border px-2 py-1.5 text-left transition-colors hover:border-white/28 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/65 ${
                isRecent ? 'civ-site-recent' : ''
              }`}
              style={{
                borderColor: isRecent ? `${tone}8C` : `${tone}3D`,
                background: `linear-gradient(100deg, rgba(5,9,20,0.7), ${tone}${isRecent ? '24' : '0D'} 58%, rgba(255,255,255,0.025))`,
                boxShadow: isRecent ? `0 0 20px ${tone}24` : undefined,
              }}
              data-testid="civilization-scene-deployment-ledger-item"
              data-impact-kind={impactKind}
              data-recent={isRecent ? 'true' : undefined}
              aria-label={`Focus deployment ${site.title}`}
              onClick={() => onSelect(site.id)}
            >
              <span
                className="pointer-events-none absolute inset-y-1 left-0 w-px"
                style={{ background: `linear-gradient(180deg, transparent, ${tone}A0, transparent)` }}
                aria-hidden="true"
              />
              <span
                className="flex h-7 w-7 items-center justify-center border border-white/12 bg-black/28"
                style={{
                  color: tone,
                  borderColor: `${tone}5E`,
                  boxShadow: `inset 0 0 0 1px ${tone}12, 0 0 14px ${tone}14`,
                }}
                aria-hidden="true"
              >
                {site.kind === 'artifact' && site.artifactVisualMotif ? (
                  <svg className="h-[1.05rem] w-[1.05rem] overflow-visible" viewBox="-8 -8 16 16">
                    <ArtifactMotifGlyph site={site} x={0} y={0} tone={tone} scale={0.78} />
                  </svg>
                ) : (
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tone, boxShadow: `0 0 10px ${tone}` }}
                  />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className="block truncate text-[10px] font-semibold uppercase tracking-[0.06em] text-white/88"
                  title={site.title}
                >
                  {getWorkSummaryTitle(site, recentSiteIds)}
                </span>
                <span className="mt-0.5 block truncate text-[8px] font-semibold uppercase tracking-[0.08em] text-white/46">
                  {impactLabel} // {getInfluenceSubtitle(site)}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <span
                  className="rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase leading-none tracking-[0.1em]"
                  style={{
                    borderColor: `${tone}58`,
                    color: tone,
                    background: `${tone}10`,
                  }}
                >
                  {getCivilizationImpactBadge(impactKind)}
                </span>
                <span className="max-w-[5.5rem] truncate text-[7px] font-black uppercase tracking-[0.09em] text-white/34">
                  {getTraceScaleBadge(site)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CivilizationScanScaleContext({
  sites,
  focusSite,
  currentScene,
  recentSiteIds,
  limit = 3,
  onSelect,
  onFocusNative,
}: {
  sites: readonly CivilizationDeploymentSite[];
  focusSite: CivilizationDeploymentSite | null;
  currentScene: MarketSceneKind;
  recentSiteIds: readonly string[];
  limit?: number;
  onSelect: (siteId: string) => void;
  onFocusNative: (site: CivilizationDeploymentSite) => void;
}) {
  const works = React.useMemo(() => (
    selectSummaryWorks(sites, limit, recentSiteIds)
  ), [sites, limit, recentSiteIds]);

  if (!focusSite && works.length === 0) return null;

  const focusTone = focusSite ? getCivilizationSiteTone(focusSite) : '#82ddff';
  const focusImpactKind = focusSite ? getCivilizationImpactKind(focusSite) : null;
  const focusNativeScene = focusSite ? getNativeSceneForSite(focusSite) : currentScene;
  const focusMeta = focusSite ? AFFINITY_META[focusSite.affinity] : null;
  const focusRecent = Boolean(focusSite && recentSiteIds.includes(focusSite.id));

  return (
    <aside
      className="pointer-events-auto absolute right-3 top-3 z-[34] hidden w-[min(22.5rem,calc(100%-1.5rem))] overflow-hidden border border-white/12 bg-[#050914]/82 p-2.5 shadow-[0_20px_54px_rgba(0,0,0,0.54)] backdrop-blur-md sm:block"
      data-testid="civilization-scan-scale-context"
      aria-label="Civilization scan command"
      style={{
        borderColor: `${focusTone}40`,
        boxShadow: `0 20px 54px rgba(0,0,0,0.54), inset 0 0 0 1px ${focusTone}10, 0 0 28px ${focusTone}12`,
      }}
    >
      <span
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${focusTone}88, rgba(255,255,255,0.46), transparent)` }}
        aria-hidden="true"
      />
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-[#82ddff]/72">
          Scan response
        </span>
        <span className="rounded-full border border-white/12 bg-white/[0.045] px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-white/44">
          {SCENE_UI[currentScene].zoomLabel}
        </span>
      </div>

      {focusSite && focusImpactKind && (
        <button
          type="button"
          className="grid w-full min-w-0 grid-cols-[3rem_minmax(0,1fr)] gap-2 border border-white/12 bg-black/24 p-2 text-left transition-colors hover:border-white/28 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/65"
          style={{
            borderColor: `${focusTone}55`,
            background: `linear-gradient(135deg, rgba(0,0,0,0.32), ${focusTone}12 56%, rgba(255,255,255,0.035))`,
            boxShadow: `inset 0 0 0 1px ${focusTone}10`,
          }}
          data-testid="civilization-scan-command-primary"
          data-impact-kind={focusImpactKind}
          data-native-scene={focusNativeScene}
          data-recent-trace={focusRecent ? 'true' : undefined}
          onClick={() => onSelect(focusSite.id)}
          aria-label="Inspect primary scan readout"
        >
          <DossierSignalEmblem site={focusSite} tone={focusTone} />
          <span className="min-w-0">
            <span className="flex min-w-0 items-center justify-between gap-2">
              <span className="truncate text-[8px] font-black uppercase tracking-[0.16em] text-white/42">
                {focusRecent ? 'New trace' : 'Primary readout'}
              </span>
              <span className="flex shrink-0 items-center gap-1">
                {focusRecent && (
                  <span
                    className="rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase leading-none tracking-[0.1em] text-[#fff3bd]"
                    style={{
                      borderColor: `${focusTone}72`,
                      background: `${focusTone}16`,
                      boxShadow: `0 0 12px ${focusTone}24`,
                    }}
                  >
                    New
                  </span>
                )}
                <span
                  className="rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase leading-none tracking-[0.1em]"
                  style={{
                    borderColor: `${focusTone}58`,
                    color: focusTone,
                    background: `${focusTone}10`,
                  }}
                >
                  {getCivilizationImpactBadge(focusImpactKind)}
                </span>
              </span>
            </span>
            <strong className="mt-1 block truncate text-[12px] font-semibold uppercase tracking-[0.04em] text-white/94">
              {focusSite.title}
            </strong>
            <span className="mt-0.5 block truncate text-[9px] font-semibold uppercase tracking-[0.08em] text-white/48">
              {getInfluenceSubtitle(focusSite)}
            </span>
            <span className="mt-1.5 grid grid-cols-3 gap-1 text-[7px] font-black uppercase tracking-[0.1em] text-white/42">
              <span className="min-w-0 border border-white/10 bg-white/[0.035] px-1.5 py-1">
                <span className="block truncate text-white/30">Native</span>
                <span className="block truncate text-white/66">{SCENE_UI[focusNativeScene].label}</span>
              </span>
              <span className="min-w-0 border border-white/10 bg-white/[0.035] px-1.5 py-1">
                <span className="block truncate text-white/30">Scale</span>
                <span className="block truncate text-white/66">{getTraceScaleBadge(focusSite)}</span>
              </span>
              <span className="min-w-0 border border-white/10 bg-white/[0.035] px-1.5 py-1">
                <span className="block truncate text-white/30">Affinity</span>
                <span className="block truncate text-white/66">{focusMeta?.shortName ?? focusSite.affinity}</span>
              </span>
            </span>
          </span>
          <span className="col-span-2 mt-1.5 line-clamp-2 text-[10px] leading-relaxed text-white/58">
            {focusSite.visibleAs}.
          </span>
        </button>
      )}

      {works.length > 0 && (
        <div className="mt-2 border-t border-white/10 pt-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="text-[8px] font-black uppercase tracking-[0.18em] text-white/42">
              Native layers
            </span>
            <span className="rounded-full border border-[#82ddff]/22 bg-[#82ddff]/10 px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.1em] text-[#dff7ff]/68">
              Deployment map
            </span>
          </div>
          <div className="grid gap-1.5">
            {works.map((site) => {
              const tone = getCivilizationSiteTone(site);
              const nativeScene = getNativeSceneForSite(site);
              const impactKind = getCivilizationImpactKind(site);
              const recent = recentSiteIds.includes(site.id);
              return (
                <button
                  key={site.id}
                  type="button"
                  className={`relative grid min-w-0 grid-cols-[1.35rem_minmax(0,1fr)_auto] items-center gap-2 overflow-hidden border bg-black/22 px-2 py-1.5 text-left transition-colors hover:border-white/28 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/65 ${
                    recent ? 'civ-site-recent' : ''
                  }`}
                  style={{
                    borderColor: recent ? `${tone}8C` : `${tone}3D`,
                    background: `linear-gradient(100deg, rgba(0,0,0,0.24), ${tone}${recent ? '18' : '08'} 62%, rgba(255,255,255,0.025))`,
                    boxShadow: recent ? `0 0 18px ${tone}24` : undefined,
                  }}
                  data-testid="civilization-scan-scale-context-item"
                  data-impact-kind={impactKind}
                  data-native-scene={nativeScene}
                  onClick={() => onFocusNative(site)}
                >
                  <span
                    className="h-3 w-3 rotate-45 border"
                    style={{
                      borderColor: tone,
                      backgroundColor: `${tone}1C`,
                      boxShadow: `0 0 12px ${tone}`,
                    }}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-[9px] font-semibold uppercase tracking-[0.06em] text-white/86">
                      {site.title}
                    </span>
                    <span className="mt-0.5 block truncate text-[7.5px] font-black uppercase tracking-[0.1em] text-white/38">
                      Native layer // {SCENE_UI[nativeScene].zoomLabel}
                    </span>
                  </span>
                  <span
                    className="rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase leading-none tracking-[0.1em]"
                    style={{
                      borderColor: `${tone}58`,
                      color: tone,
                      background: `${tone}10`,
                    }}
                  >
                    {getCivilizationImpactBadge(impactKind)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
}

function MiniatureWorkLedger({
  sites,
  recentSiteIds,
}: {
  sites: readonly CivilizationDeploymentSite[];
  recentSiteIds: readonly string[];
}) {
  const works = React.useMemo(() => (
    selectSummaryWorks(sites, 2, recentSiteIds)
  ), [sites, recentSiteIds]);

  if (works.length === 0) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-2 bottom-2 z-30 grid gap-1"
      data-testid="civilization-miniature-work-ledger"
      aria-hidden="true"
    >
      {works.map((site) => {
        const tone = getCivilizationSiteTone(site);
        const isRecent = recentSiteIds.includes(site.id);
        return (
          <span
            key={site.id}
            className="flex min-w-0 items-center gap-1.5 border border-white/10 bg-[#050914]/62 px-1.5 py-1 text-[7px] font-semibold uppercase tracking-[0.11em] text-white/78 shadow-[0_8px_18px_rgba(0,0,0,0.42)] backdrop-blur-sm"
            style={{
              borderColor: isRecent ? `${tone}86` : `${tone}30`,
              background: `linear-gradient(90deg, rgba(5,9,20,0.72), ${tone}${isRecent ? '20' : '0D'})`,
            }}
          >
            <i
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: tone, boxShadow: `0 0 10px ${tone}` }}
              aria-hidden="true"
            />
            <span className="truncate">{getWorkSummaryTitle(site, recentSiteIds)}</span>
          </span>
        );
      })}
    </div>
  );
}

function ScanTraceFields({
  sites,
  selectedSiteId,
  focusedSiteId,
  recentSiteIds,
}: {
  sites: readonly CivilizationDeploymentSite[];
  selectedSiteId: string | null;
  focusedSiteId: string | null;
  recentSiteIds: readonly string[];
}) {
  return (
    <svg
      className="pointer-events-none absolute inset-0 z-10 h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {sites.map((site) => {
        const tone = getCivilizationSiteTone(site);
        const selected = site.id === selectedSiteId;
        const focused = site.id === focusedSiteId;
        const isRecent = recentSiteIds.includes(site.id);
        if (!selected && !focused && !isRecent) return null;
        const motifScale = selected ? 0.78 : focused || isRecent ? 0.68 : 0.5;
        const opacity = selected ? 0.88 : focused || isRecent ? 0.68 : 0.14;
        const strokeAlpha = selected ? 'CC' : focused || isRecent ? '7A' : '42';
        const fillAlpha = selected ? '1F' : focused || isRecent ? '10' : '08';
        return (
          <g key={site.id} opacity={opacity}>
            <ellipse
              cx={site.anchor.x}
              cy={site.anchor.y}
              rx={selected ? 9 : focused || isRecent ? 7.8 : 5.4}
              ry={selected ? 4.6 : focused || isRecent ? 4 : 2.8}
              fill={`${tone}${fillAlpha}`}
              stroke={`${tone}${strokeAlpha}`}
              strokeWidth={selected ? 0.42 : 0.28}
              strokeDasharray="0.9 1.3"
            />
            <ellipse
              cx={site.anchor.x}
              cy={site.anchor.y}
              rx={selected ? 15 : 10}
              ry={selected ? 7.4 : 5}
              fill="none"
              stroke={`${tone}${selected ? '66' : '38'}`}
              strokeWidth="0.18"
            />
            {site.kind === 'artifact' && (
              <ArtifactMotifGlyph
                site={site}
                x={site.anchor.x}
                y={site.anchor.y}
                tone={tone}
                scale={motifScale}
                rotation={selected ? -6 : 8}
                emphasis={selected ? 1.08 : 1}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function FocusedProjectionSymbol({
  site,
  x,
  y,
  tone,
  scale,
}: {
  site: CivilizationDeploymentSite;
  x: number;
  y: number;
  tone: string;
  scale: number;
}) {
  const treatment = site.artifactSceneTreatment;
  const white = 'rgba(255,255,255,0.72)';
  const softWhite = 'rgba(255,255,255,0.28)';

  if (site.kind === 'blueprint') {
    if (site.blueprintId === 'bp_antimatter_detonator') {
      return (
        <g transform={`translate(${x} ${y}) scale(${scale})`} data-testid="civilization-focused-blueprint-antimatter">
          <ellipse cx="0" cy="0" rx="14" ry="5.4" fill={`${tone}16`} stroke={`${tone}D0`} strokeWidth="0.55" />
          <circle cx="0" cy="0" r="3.1" fill="rgba(0,0,0,0.58)" stroke={white} strokeWidth="0.28" />
          <path d="M-11 -3.8 C-5 -10.2, 5 -10.2, 11 -3.8 M-11 3.8 C-5 10.2, 5 10.2, 11 3.8" fill="none" stroke={`${tone}9C`} strokeLinecap="round" strokeWidth="0.48" />
          <path d="M-17 0 H-9 M9 0 H17 M0 -8 V-4.2 M0 4.2 V8" stroke={softWhite} strokeLinecap="round" strokeWidth="0.3" />
        </g>
      );
    }
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} data-testid="civilization-focused-blueprint-project">
        <path d="M-10 7 C-3 0, 5 2, 12 -6" fill="none" stroke={`${tone}D0`} strokeLinecap="round" strokeWidth="1.35" />
        <path d="M-14 8 L-3 4 L10 8 M4 -3 L12 -7 L16 -4" fill="none" stroke={white} strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.38" />
        <circle cx="-10" cy="7" r="1.7" fill={`${tone}D8`} />
        <circle cx="12" cy="-6" r="1.2" fill={white} />
      </g>
    );
  }

  if (site.kind === 'luminary') {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} data-testid="civilization-focused-luminary-pressure">
        <path d="M0 -9 L8 -4.2 L8 4.2 L0 9 L-8 4.2 L-8 -4.2 Z" fill={`${tone}14`} stroke={`${tone}B8`} strokeWidth="0.38" />
        {[0, 60, 120, 180, 240, 300].map((angle) => {
          const radians = (angle * Math.PI) / 180;
          return (
            <circle
              key={angle}
              cx={Math.cos(radians) * 8}
              cy={Math.sin(radians) * 8}
              r="0.86"
              fill={angle === 0 ? white : `${tone}CC`}
            />
          );
        })}
        <circle cx="0" cy="0" r="2" fill={white} opacity="0.72" />
      </g>
    );
  }

  if (site.kind === 'protocol') {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} data-testid="civilization-focused-sealed-protocol">
        <path d="M-14 -5 H14 M-18 0 H10 M-10 5 H18" stroke={`${tone}D0`} strokeLinecap="round" strokeWidth="1.25" strokeDasharray="5 2" />
        <path d="M-14 -5 H14 M-18 0 H10 M-10 5 H18" stroke="rgba(0,0,0,0.72)" strokeLinecap="round" strokeWidth="0.36" strokeDasharray="1.2 2.2" />
      </g>
    );
  }

  if (site.kind === 'chronicle') {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} data-testid="civilization-focused-chronicle-thread">
        <path d="M-11 -7 H9 C12 -7 13 -5.5 13 -3 V8 H-9 C-12 8 -13 6.5 -13 4 V-4 C-13 -5.8 -12.4 -7 -11 -7 Z" fill={`${tone}16`} stroke={`${tone}C8`} strokeWidth="0.62" />
        <path d="M-8 -3 H8 M-8 0.5 H7 M-8 4 H4" stroke={white} strokeLinecap="round" strokeWidth="0.46" opacity="0.76" />
        <path d="M-13 -3.8 C-8 -8, 2 -8, 13 -3.6" fill="none" stroke={`${tone}9C`} strokeLinecap="round" strokeWidth="0.44" />
      </g>
    );
  }

  if (treatment === 'ashroot_recovery') {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} data-testid="civilization-focused-artifact-ashroot_recovery">
        <path d="M-13 7 C-8 -4, -2 3, 0 -8 C3 -1, 9 -4, 13 6" fill={`${tone}18`} stroke={`${tone}CC`} strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.62" />
        <path d="M-10 5 C-4 1, -1 2, 2 -2 M1 2 C5 -1, 8 1, 11 5" fill="none" stroke={white} strokeLinecap="round" strokeWidth="0.28" />
        <ArtifactMotifGlyph site={site} x={0} y={1} tone={tone} scale={0.72} />
      </g>
    );
  }

  if (treatment === 'mantlelift_driver') {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} data-testid="civilization-focused-artifact-mantlelift_driver">
        <path d="M-2 12 C-1 4, 1 -4, 3 -14" fill="none" stroke={`${tone}2E`} strokeLinecap="round" strokeWidth="5.4" />
        <path d="M-2 12 C-1 4, 1 -4, 3 -14" fill="none" stroke={white} strokeLinecap="round" strokeWidth="0.5" />
        <path d="M-12 12 L-2 7 L11 11 L7 15 L-9 15 Z" fill={`${tone}20`} stroke={`${tone}B8`} strokeLinejoin="round" strokeWidth="0.44" />
        <path d="M-15 2 C-6 -7, 6 9, 15 -4" fill="none" stroke={`${tone}A8`} strokeLinecap="round" strokeWidth="0.78" />
        <ArtifactMotifGlyph site={site} x={2} y={-2} tone={tone} scale={0.58} />
      </g>
    );
  }

  if (treatment === 'ignition_kernel') {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} data-testid="civilization-focused-artifact-ignition_kernel">
        <path d="M0 -12 L10 -4 L8 9 L0 14 L-8 9 L-10 -4 Z" fill={`${tone}1E`} stroke={`${tone}C8`} strokeLinejoin="round" strokeWidth="0.58" />
        <circle cx="0" cy="0" r="4" fill="rgba(255,244,194,0.74)" />
        <circle cx="0" cy="0" r="1.4" fill="#fff" />
        <path d="M-12 11 C-6 5, 6 5, 12 11" fill="none" stroke={softWhite} strokeLinecap="round" strokeWidth="0.34" />
      </g>
    );
  }

  if (treatment === 'magnetic_bottle') {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} data-testid="civilization-focused-artifact-magnetic_bottle">
        <ellipse cx="0" cy="0" rx="13" ry="6" fill={`${tone}18`} stroke={`${tone}D0`} strokeWidth="0.58" />
        <ellipse cx="0" cy="0" rx="6" ry="10" fill="rgba(0,0,0,0.32)" stroke={`${tone}7A`} strokeWidth="0.36" />
        <rect x="-2.4" y="-7" width="4.8" height="14" rx="1.2" fill="rgba(0,0,0,0.42)" stroke={white} strokeWidth="0.24" />
        <path d="M-16 0 H-7 M7 0 H16 M-8 -6 C-3 -10, 3 -10, 8 -6 M-8 6 C-3 10, 3 10, 8 6" fill="none" stroke={softWhite} strokeLinecap="round" strokeWidth="0.28" />
      </g>
    );
  }

  if (treatment === 'horizon_extractor') {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} data-testid="civilization-focused-artifact-horizon_extractor">
        <path d="M-15 2 C-9 -8, 9 -8, 15 2" fill="none" stroke={`${tone}D0`} strokeLinecap="round" strokeWidth="0.78" />
        <path d="M-10 6 C-4 0, 4 0, 10 6" fill="none" stroke={`${tone}76`} strokeLinecap="round" strokeWidth="0.42" />
        <circle cx="0" cy="2.2" r="4.3" fill="rgba(0,0,0,0.72)" stroke={white} strokeWidth="0.26" />
        <path d="M0 -10 V-3 M-7 -8 L-3 -2.4 M7 -8 L3 -2.4" stroke={softWhite} strokeLinecap="round" strokeWidth="0.28" />
        <ArtifactMotifGlyph site={site} x={0} y={1.4} tone={tone} scale={0.56} />
      </g>
    );
  }

  if (treatment === 'entropy_baffle') {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`} data-testid="civilization-focused-artifact-entropy_baffle">
        <path d="M-13 8 L-8 -8 H8 L13 8 Z" fill={`${tone}18`} stroke={`${tone}C8`} strokeLinejoin="round" strokeWidth="0.48" />
        {[-8, -4, 0, 4, 8].map((dx) => (
          <path key={dx} d={`M${dx} 7 V${dx === 0 ? -7 : -4}`} stroke={dx === 0 ? white : `${tone}A0`} strokeLinecap="round" strokeWidth={dx === 0 ? 0.38 : 0.28} />
        ))}
        <path d="M-15 10 C-8 5, -2 11, 3 7 S10 5, 15 10" fill="none" stroke="rgba(255,148,93,0.48)" strokeLinecap="round" strokeWidth="0.28" />
      </g>
    );
  }

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} data-testid="civilization-focused-artifact-generic">
      <rect x="-8" y="-7" width="16" height="14" rx="2" fill={`${tone}1C`} stroke={`${tone}BC`} strokeWidth="0.48" />
      <circle cx="0" cy="0" r="2.1" fill={white} />
      <ArtifactMotifGlyph site={site} x={0} y={0} tone={tone} scale={0.66} />
    </g>
  );
}

function FocusedDeploymentProjectionLayer({
  site,
  scene,
  selected,
  recent,
  compactFocus = false,
}: {
  site: CivilizationDeploymentSite | null;
  scene: MarketSceneKind;
  selected: boolean;
  recent: boolean;
  compactFocus?: boolean;
}) {
  if (!site) return null;

  const tone = getCivilizationSiteTone(site);
  const nativeScene = getNativeSceneForSite(site);
  const sceneIndex = getSceneIndex(scene);
  const nativeIndex = getSceneIndex(nativeScene);
  const relation = nativeScene === scene
    ? 'native'
    : nativeIndex < sceneIndex
      ? 'magnified'
      : 'remote';
  const x = Math.min(84, Math.max(16, site.anchor.x));
  const y = Math.min(76, Math.max(18, site.anchor.y));
  const isNativeSurface = relation === 'native' && nativeScene === 'surface';
  const baseProjectionX = relation === 'native'
    ? x
    : Math.min(82, Math.max(18, x + (x > 55 ? -18 : 18)));
  const baseProjectionY = relation === 'native'
    ? isNativeSurface
      ? compactFocus && selected
        ? Math.min(46, Math.max(38, y - 16))
        : Math.min(82, Math.max(55, y + 8))
      : y
    : Math.min(76, Math.max(18, y - (relation === 'remote' ? 12 : 10)));
  const projectionAnchor = selected && relation === 'native'
    ? { x: baseProjectionX, y: baseProjectionY }
    : avoidScanTrayZone({ x: baseProjectionX, y: baseProjectionY });
  const projectionX = projectionAnchor.x;
  const projectionY = projectionAnchor.y;
  const projectionMoved = Math.abs(projectionX - baseProjectionX) > 0.1 || Math.abs(projectionY - baseProjectionY) > 0.1;
  const rx = isNativeSurface ? 6.2 : relation === 'native' ? 18 : 12;
  const ry = isNativeSurface ? 2.8 : relation === 'native' ? 8.6 : 6.4;
  const opacity = isNativeSurface
    ? selected ? 0.36 : recent ? 0.5 : 0.42
    : selected ? 0.9 : recent ? 0.82 : 0.76;
  const symbolScale = isNativeSurface ? 0.36 : relation === 'native' ? 1.02 : 0.78;
  const showConnector = relation !== 'native' || projectionMoved;

  return (
    <svg
      className="pointer-events-none absolute inset-0 z-[19] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      data-testid="civilization-focused-deployment-projection"
      data-native-scene={nativeScene}
      data-scale-relation={relation}
      data-scale-presence={site.scalePresence ?? 'unspecified'}
      data-site-id={site.id}
      data-native-presentation={isNativeSurface ? 'local-site' : relation === 'native' ? 'full-scale' : undefined}
      data-layout-zone={projectionMoved ? 'scene-reserved' : 'scene-anchor'}
    >
      {showConnector && (
        <g opacity="0.62">
          <path
            d={`M${x} ${y} C${(x + projectionX) / 2} ${Math.min(y, projectionY) - 5}, ${(x + projectionX) / 2} ${Math.min(y, projectionY) - 5}, ${projectionX} ${projectionY}`}
            fill="none"
            stroke={`${tone}72`}
            strokeLinecap="round"
            strokeWidth="0.34"
            strokeDasharray={relation === 'remote' ? '3 2.2' : relation === 'native' ? '2 1.8' : '1.4 1.8'}
          />
          <circle cx={x} cy={y} r="1.2" fill={`${tone}C8`} />
        </g>
      )}
      <g
        className={isNativeSurface ? 'civ-focused-projection civ-focused-projection-local-site' : 'civ-focused-projection'}
        opacity={opacity}
        style={{ color: tone }}
      >
        {relation === 'native' ? (
          <>
            <ellipse
              cx={projectionX}
              cy={projectionY + (isNativeSurface ? 4.2 : 5.8)}
              rx={rx * (isNativeSurface ? 1.52 : 1.04)}
              ry={isNativeSurface ? 2.6 : 3.8}
              fill={`${tone}${isNativeSurface ? '10' : '14'}`}
              stroke={`${tone}${isNativeSurface ? '32' : '54'}`}
              strokeWidth={isNativeSurface ? 0.18 : 0.28}
            />
            {isNativeSurface && (
              <path
                d={`M${projectionX - rx * 1.42} ${projectionY + 4.1} C${projectionX - rx * 0.48} ${projectionY + 2.7}, ${projectionX + rx * 0.48} ${projectionY + 2.7}, ${projectionX + rx * 1.42} ${projectionY + 4.1}`}
                fill="none"
                stroke="rgba(255,255,255,0.11)"
                strokeLinecap="round"
                strokeWidth="0.18"
              />
            )}
          </>
        ) : (
          <>
            <rect
              x={projectionX - rx}
              y={projectionY - ry}
              width={rx * 2}
              height={ry * 2}
              rx="2.2"
              fill="rgba(3,7,17,0.56)"
              stroke={`${tone}7A`}
              strokeWidth="0.32"
            />
            <path
              d={`M${projectionX - rx + 2} ${projectionY + ry - 2} H${projectionX + rx - 2} M${projectionX - rx + 2} ${projectionY - ry + 2} H${projectionX + rx - 2}`}
              stroke="rgba(255,255,255,0.16)"
              strokeLinecap="round"
              strokeWidth="0.2"
            />
          </>
        )}
        <ellipse
          cx={projectionX}
          cy={projectionY}
          rx={rx}
          ry={ry}
          fill={`${tone}${relation === 'native' ? '12' : '0E'}`}
          stroke={`${tone}${isNativeSurface ? selected ? '82' : '64' : selected ? 'C8' : '8F'}`}
          strokeWidth={isNativeSurface ? selected ? 0.32 : 0.24 : selected ? 0.5 : 0.36}
          strokeDasharray={relation === 'native' ? undefined : '2.2 1.7'}
          transform={`rotate(${isNativeSurface ? -3 : -7} ${projectionX} ${projectionY})`}
        />
        <FocusedProjectionSymbol
          site={site}
          x={projectionX}
          y={projectionY}
          tone={tone}
          scale={symbolScale}
        />
      </g>
    </svg>
  );
}

function avoidScanTrayZone(point: CivilizationDeploymentAnchor): CivilizationDeploymentAnchor {
  if (point.x > 52 && point.y > 36) {
    return {
      x: Math.max(22, Math.min(50, point.x - 20)),
      y: Math.max(20, Math.min(44, point.y - 10)),
    };
  }
  if (point.x > 58 && point.y > 48) {
    return {
      x: Math.max(18, Math.min(58, point.x - 18)),
      y: Math.max(18, Math.min(46, point.y - 16)),
    };
  }
  if (point.x > 66 && point.y > 38) {
    return {
      x: Math.max(18, point.x - 14),
      y: Math.max(18, point.y - 8),
    };
  }
  return point;
}

function ScanFocusLayer({
  site,
  selected,
  recent,
}: {
  site: CivilizationDeploymentSite | null;
  selected: boolean;
  recent: boolean;
}) {
  if (!site) return null;
  const tone = getCivilizationSiteTone(site);
  const focusState = selected ? 'selected' : recent ? 'recent' : 'steady';

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[21]"
      data-testid="civilization-scan-focus"
      data-focus-state={focusState}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full mix-blend-screen"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <ellipse
          cx={site.anchor.x}
          cy={site.anchor.y}
          rx={selected ? 10 : 8.4}
          ry={selected ? 4.8 : 3.8}
          fill={`${tone}${selected ? '16' : '0F'}`}
          stroke={`${tone}${selected ? 'D6' : 'A8'}`}
          strokeWidth={selected ? 0.42 : 0.3}
          strokeDasharray={selected ? undefined : '2.2 1.8'}
          transform={`rotate(-8 ${site.anchor.x} ${site.anchor.y})`}
        />
        <ellipse
          cx={site.anchor.x}
          cy={site.anchor.y}
          rx={selected ? 16 : 13}
          ry={selected ? 7.2 : 5.8}
          fill="none"
          stroke={`${tone}42`}
          strokeWidth="0.2"
          transform={`rotate(-8 ${site.anchor.x} ${site.anchor.y})`}
        />
        {site.kind === 'artifact' && (
          <ArtifactMotifGlyph
            site={site}
            x={site.anchor.x}
            y={site.anchor.y}
            tone={tone}
            scale={selected ? 0.62 : 0.52}
            rotation={-6}
            emphasis={selected ? 1.1 : 1}
          />
        )}
      </svg>
    </div>
  );
}

function EnvironmentalTraceGlows({
  sites,
  scanActive,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scanActive: boolean;
}) {
  if (sites.length === 0) return null;
  return (
    <svg
      data-testid="civilization-trace-glows"
      className="pointer-events-none absolute inset-0 z-[11] h-full w-full mix-blend-screen"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {sites.map((site, index) => {
        const tone = getCivilizationSiteTone(site);
        const isBlueprint = site.kind === 'blueprint' || site.kind === 'protocol' || site.kind === 'chronicle';
        const isLuminary = site.kind === 'luminary';
        if (!scanActive && site.kind === 'protocol') return null;
        if (!scanActive && site.kind === 'blueprint' && hasDominantBlueprintMark(site)) return null;
        const opacity = scanActive ? 0.16 : site.kind === 'blueprint' ? 0.055 : isLuminary ? 0.05 : 0.035;
        const rotation = index % 2 === 0 ? -10 : 12;
        const routeStartX = Math.max(3, site.anchor.x - 15);
        const routeEndX = Math.min(97, site.anchor.x + 17);
        const routeMidY = site.anchor.y + (index % 2 === 0 ? -2.5 : 2.2);
        return (
          <g key={site.id} opacity={opacity}>
            {isRouteTrait(site) && (
              <>
                <path
                  d={`M${routeStartX} ${site.anchor.y + 2} C ${site.anchor.x - 7} ${routeMidY}, ${site.anchor.x + 6} ${routeMidY}, ${routeEndX} ${site.anchor.y - 1.4}`}
                  fill="none"
                  stroke={`${tone}9A`}
                  strokeLinecap="round"
                  strokeWidth={isBlueprint ? 0.72 : 0.48}
                  strokeDasharray={site.trait === 'chronology' ? '1.2 2' : '4 2.2'}
                />
                <path
                  d={`M${routeStartX + 3} ${site.anchor.y + 4.6} C ${site.anchor.x - 4} ${site.anchor.y + 1.4}, ${site.anchor.x + 4} ${site.anchor.y + 4.2}, ${routeEndX - 2} ${site.anchor.y + 1}`}
                  fill="none"
                  stroke={`${tone}54`}
                  strokeLinecap="round"
                  strokeWidth="0.32"
                />
              </>
            )}
            {isDistrictTrait(site) && (
              <>
                <rect
                  x={site.anchor.x - 4.2}
                  y={site.anchor.y - 2.8}
                  width="8.4"
                  height="5.6"
                  fill={`${tone}24`}
                  stroke={`${tone}76`}
                  strokeWidth="0.34"
                  transform={`rotate(${rotation} ${site.anchor.x} ${site.anchor.y})`}
                />
                <path
                  d={`M${site.anchor.x - 5.8} ${site.anchor.y + 3.4} H${site.anchor.x + 5.8} M${site.anchor.x - 3.6} ${site.anchor.y + 1.1} V${site.anchor.y - 3.5} M${site.anchor.x} ${site.anchor.y + 1.2} V${site.anchor.y - 4.3} M${site.anchor.x + 3.7} ${site.anchor.y + 1.1} V${site.anchor.y - 2.7}`}
                  fill="none"
                  stroke={`${tone}88`}
                  strokeLinecap="round"
                  strokeWidth="0.34"
                />
              </>
            )}
            {isFieldTrait(site) && (
              <>
                <ellipse
                  cx={site.anchor.x}
                  cy={site.anchor.y}
                  rx={isBlueprint ? 9.4 : 6.8}
                  ry={isBlueprint ? 3.7 : 2.7}
                  fill={`${tone}28`}
                  stroke={`${tone}86`}
                  strokeWidth={isBlueprint ? 0.46 : 0.32}
                  strokeDasharray={site.trait === 'veil' ? '2 1.5' : undefined}
                  transform={`rotate(${rotation} ${site.anchor.x} ${site.anchor.y})`}
                />
                <ellipse
                  cx={site.anchor.x}
                  cy={site.anchor.y}
                  rx={isBlueprint ? 5.6 : 3.8}
                  ry={isBlueprint ? 2 : 1.4}
                  fill="none"
                  stroke={`${tone}50`}
                  strokeWidth="0.22"
                  transform={`rotate(${-rotation} ${site.anchor.x} ${site.anchor.y})`}
                />
              </>
            )}
            {!isRouteTrait(site) && !isDistrictTrait(site) && !isFieldTrait(site) && (
              <>
                <ellipse
                  cx={site.anchor.x}
                  cy={site.anchor.y}
                  rx={isBlueprint ? 8.8 : isLuminary ? 7.2 : 5.4}
                  ry={isBlueprint ? 3.3 : isLuminary ? 2.8 : 2.2}
                  fill={`${tone}42`}
                  transform={`rotate(${rotation} ${site.anchor.x} ${site.anchor.y})`}
                />
                <path
                  d={`M${Math.max(3, site.anchor.x - 11)} ${site.anchor.y + 1.4} C ${site.anchor.x - 4} ${site.anchor.y - 2.2}, ${site.anchor.x + 4} ${site.anchor.y + 3.2}, ${Math.min(97, site.anchor.x + 12)} ${site.anchor.y - 0.8}`}
                  fill="none"
                  stroke={`${tone}8A`}
                  strokeLinecap="round"
                  strokeWidth={isBlueprint ? 0.58 : 0.38}
                  strokeDasharray={isBlueprint ? '2.5 1.4' : undefined}
                />
              </>
            )}
            {site.representationMode === 'local_trace' && (
              <circle cx={site.anchor.x} cy={site.anchor.y} r="0.55" fill="#ffffff" opacity="0.72" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

function RecentTraceReveal({
  sites,
  showLabel = true,
}: {
  sites: readonly CivilizationDeploymentSite[];
  showLabel?: boolean;
}) {
  if (sites.length === 0) return null;
  const primary = sites[0]!;
  const tone = getCivilizationSiteTone(primary);
  const labelTop = primary.anchor.y > 42
    ? Math.max(16, primary.anchor.y - 24)
    : Math.min(78, primary.anchor.y + 24);
  const primaryTitle = primary.title.replace(/\s+Trace$/i, '');
  const title = sites.length > 1 ? `${primaryTitle} +${sites.length - 1}` : primaryTitle;
  const subtitle = getInfluenceSubtitle(primary);
  const nativeScene = getNativeSceneForSite(primary);
  const scaleLabel = SCENE_UI[nativeScene].zoomLabel;
  const impactKind = getCivilizationImpactKind(primary);
  const impactBadge = getCivilizationImpactBadge(impactKind);
  const impactLabel = getCivilizationImpactLabel(impactKind);
  const labelLeft = primary.anchor.x < 50
    ? 'clamp(10.5rem, 24%, calc(100% - 10.5rem))'
    : 'clamp(10.5rem, 76%, calc(100% - 10.5rem))';

  return (
    <div
      data-testid="civilization-trace-reveal"
      className="pointer-events-none absolute inset-0 z-30"
      data-impact-kind={impactKind}
      data-primary-title={title}
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full mix-blend-screen"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          className="civ-trace-reveal-vector"
          d={`M${Math.max(2, primary.anchor.x - 24)} ${primary.anchor.y + 9} C${primary.anchor.x - 9} ${primary.anchor.y - 8}, ${primary.anchor.x + 12} ${primary.anchor.y + 10}, ${Math.min(98, primary.anchor.x + 27)} ${primary.anchor.y - 6}`}
          fill="none"
          stroke={tone}
          strokeLinecap="round"
          strokeWidth="0.72"
        />
        <path
          className="civ-trace-reveal-vector"
          d={`M${Math.max(3, primary.anchor.x - 14)} ${primary.anchor.y - 5} H${Math.min(97, primary.anchor.x + 16)} M${primary.anchor.x} ${Math.max(5, primary.anchor.y - 12)} V${Math.min(95, primary.anchor.y + 11)}`}
          fill="none"
          stroke="rgba(255,255,255,0.52)"
          strokeLinecap="round"
          strokeWidth="0.22"
          style={{ animationDelay: '0.08s' }}
        />
        <ellipse
          className="civ-trace-reveal-vector"
          cx={primary.anchor.x}
          cy={primary.anchor.y}
          rx="16"
          ry="6.8"
          fill={`${tone}20`}
          stroke={`${tone}D8`}
          strokeWidth="0.44"
          style={{ animationDelay: '0.14s' }}
        />
        <path
          className="civ-trace-reveal-vector"
          d={`M${Math.max(3, primary.anchor.x - 18)} ${primary.anchor.y + 2} C${primary.anchor.x - 8} ${primary.anchor.y - 5}, ${primary.anchor.x + 9} ${primary.anchor.y + 4}, ${Math.min(97, primary.anchor.x + 21)} ${primary.anchor.y - 3}`}
          fill="none"
          stroke="rgba(255,255,255,0.72)"
          strokeLinecap="round"
          strokeWidth="0.3"
          style={{ animationDelay: '0.22s' }}
        />
      </svg>
      <div
        className="absolute h-20 w-20 -translate-x-1/2 -translate-y-1/2"
        style={{ left: `${primary.anchor.x}%`, top: `${primary.anchor.y}%` }}
      >
        <span
          className="civ-trace-recorded-ring absolute inset-0 rounded-full border"
          style={{
            borderColor: `${tone}BB`,
            boxShadow: `0 0 30px ${tone}55`,
          }}
        />
        <span
          className="civ-trace-recorded-ring absolute inset-3 rounded-full border"
          style={{
            animationDelay: '0.34s',
            borderColor: `${tone}80`,
            boxShadow: `0 0 22px ${tone}44`,
          }}
        />
      </div>
      {showLabel && (
        <div
          className="absolute max-w-[min(21rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2"
          style={{
            left: labelLeft,
            top: `${labelTop}%`,
          }}
        >
          <div
            className="civ-trace-recorded-label flex items-center gap-2.5 border border-white/16 bg-[#050914]/90 px-3 py-2.5 text-left shadow-[0_14px_36px_rgba(0,0,0,0.55)] backdrop-blur-md"
            style={{
              borderColor: `${tone}72`,
              boxShadow: `0 14px 36px rgba(0,0,0,0.55), 0 0 30px ${tone}28`,
            }}
          >
            <svg
              className="h-9 w-9 shrink-0"
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{ color: tone, filter: `drop-shadow(0 0 10px ${tone}88)` }}
            >
              <circle cx="12" cy="12" r="10" fill={`${tone}16`} stroke={`${tone}82`} strokeWidth="0.8" />
              {impactKind === 'artifact' && primary.artifactVisualMotif ? (
                <ArtifactMotifGlyph site={primary} x={12} y={12} tone={tone} scale={1.06} />
              ) : impactKind === 'blueprint' ? (
                <g>
                  <path d="M12 5.1 L18.6 12 L12 18.9 L5.4 12 Z" fill={`${tone}22`} stroke={`${tone}D2`} strokeWidth="0.72" />
                  <path d="M8.7 10.2 H15.3 M8.7 12 H15.3 M8.7 13.8 H15.3" stroke="rgba(255,255,255,0.72)" strokeLinecap="round" strokeWidth="0.42" />
                </g>
              ) : impactKind === 'luminary' ? (
                <g>
                  {[0, 60, 120, 180, 240, 300].map((angle) => {
                    const radians = (angle * Math.PI) / 180;
                    return (
                      <circle
                        key={angle}
                        cx={12 + Math.cos(radians) * 5.6}
                        cy={12 + Math.sin(radians) * 5.6}
                        r="0.9"
                        fill={angle === 0 ? 'rgba(255,255,255,0.86)' : `${tone}C8`}
                      />
                    );
                  })}
                  <circle cx="12" cy="12" r="2.25" fill="rgba(255,255,255,0.72)" stroke={`${tone}D8`} strokeWidth="0.44" />
                </g>
              ) : impactKind === 'chronicle' ? (
                <g>
                  <path d="M7.2 6.8 H15.2 C16.3 6.8 16.8 7.5 16.8 8.5 V17.2 H8.6 C7.5 17.2 7.2 16.5 7.2 15.6 Z" fill={`${tone}18`} stroke={`${tone}CC`} strokeWidth="0.58" />
                  <path d="M9.3 10 H14.8 M9.3 12.1 H14.2 M9.3 14.2 H12.7" stroke="rgba(255,255,255,0.72)" strokeLinecap="round" strokeWidth="0.42" />
                  <path d="M7.2 9 C9.2 6.6 13.4 6.4 16.8 8.4" fill="none" stroke={`${tone}92`} strokeLinecap="round" strokeWidth="0.38" />
                </g>
              ) : (
                <g>
                  <rect x="7.2" y="7.2" width="9.6" height="9.6" fill={`${tone}18`} stroke={`${tone}C8`} strokeDasharray="1.3 1" strokeWidth="0.58" />
                  <path d="M8.8 12 H15.2 M12 8.8 V15.2" stroke="rgba(255,255,255,0.68)" strokeLinecap="round" strokeWidth="0.42" />
                </g>
              )}
            </svg>
            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-1.5 text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: tone }}>
                <span className="min-w-0 truncate">{impactLabel}</span>
                <span
                  className="shrink-0 border px-1.5 py-0.5 text-[7px] leading-none tracking-[0.12em] text-white/82"
                  style={{
                    borderColor: `${tone}68`,
                    background: `${tone}18`,
                    borderRadius: impactKind === 'blueprint' || impactKind === 'chronicle' ? '3px' : impactKind === 'protocol' ? '2px' : '999px',
                    borderStyle: impactKind === 'protocol' ? 'dashed' : 'solid',
                    boxShadow: `0 0 10px ${tone}1F`,
                  }}
                >
                  {impactBadge}
                </span>
              </p>
              <p className="mt-0.5 truncate text-xs font-semibold text-white/94" data-testid="civilization-trace-reveal-title">
                {title}
              </p>
              <p className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-white/52">
                {scaleLabel} // {subtitle}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ScanMapPins({
  sites,
  selectedSiteId,
  focusedSiteId,
  recentSiteIds,
  onSelect,
}: {
  sites: readonly CivilizationDeploymentSite[];
  selectedSiteId: string | null;
  focusedSiteId: string | null;
  recentSiteIds: readonly string[];
  onSelect: (siteId: string) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden={false}>
      {sites.map((site, index) => {
        const tone = getCivilizationSiteTone(site);
        const selected = site.id === selectedSiteId;
        const focused = site.id === focusedSiteId;
        const isRecent = recentSiteIds.includes(site.id);
        return (
          <button
            key={site.id}
            type="button"
            aria-label={selectedSiteId ? `Map marker ${index + 1}: ${site.title}` : `Map marker ${index + 1}`}
            className={`civ-map-pin pointer-events-auto absolute h-16 w-11 text-white transition-[filter,opacity,transform] hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 sm:h-20 sm:w-12 ${
              selected || focused || isRecent ? 'opacity-100' : 'opacity-70'
            }`}
            style={{
              left: `${site.anchor.x}%`,
              top: `${site.anchor.y}%`,
              transform: `translate(-50%, -97%) scale(${selected ? 1.08 : focused || isRecent ? 1.03 : 1})`,
              filter: selected || focused || isRecent
                ? `drop-shadow(0 0 22px ${tone}8A)`
                : `drop-shadow(0 0 14px ${tone}42)`,
              ['--pin-color' as string]: tone,
            }}
            onClick={() => onSelect(site.id)}
            title={site.title}
          >
            <span
              className="absolute bottom-0 left-1/2 h-4 w-10 -translate-x-1/2 rounded-full border"
              style={{
                borderColor: selected ? `${tone}CC` : focused || isRecent ? `${tone}90` : `${tone}62`,
                background: `radial-gradient(ellipse at center, ${tone}2E, transparent 68%)`,
                boxShadow: selected || focused || isRecent ? `0 0 18px ${tone}44` : undefined,
              }}
              aria-hidden="true"
            />
            <span
              className="absolute bottom-3 left-1/2 h-9 w-px -translate-x-1/2 sm:h-14"
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,0.92), ${tone}E8 36%, ${tone}00)`,
                boxShadow: `0 0 16px ${tone}78`,
              }}
              aria-hidden="true"
            />
            <span
              className="absolute bottom-[1.05rem] left-1/2 h-6 w-[1.5px] -translate-x-1/2 sm:h-10"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0))',
              }}
              aria-hidden="true"
            />
            <span
              className="civ-map-pin-core absolute bottom-[2.35rem] left-1/2 z-10 flex h-8 w-8 -translate-x-1/2 rotate-45 items-center justify-center border bg-[#050914]/86 shadow-[0_0_18px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:bottom-[3.5rem] sm:h-9 sm:w-9"
              style={{
                borderColor: selected ? `${tone}F0` : focused || isRecent ? `${tone}C8` : `${tone}86`,
                background: selected || focused || isRecent
                  ? `radial-gradient(circle, rgba(255,255,255,0.78), ${tone}74 38%, rgba(5,9,20,0.88) 72%)`
                  : `radial-gradient(circle, rgba(255,255,255,0.46), ${tone}52 42%, rgba(5,9,20,0.9) 72%)`,
                color: '#fff',
                boxShadow: selected || focused || isRecent
                  ? `inset 0 0 0 1px rgba(255,255,255,0.18), 0 0 26px ${tone}82, 0 0 42px ${tone}30`
                  : `inset 0 0 0 1px rgba(255,255,255,0.1), 0 0 20px ${tone}4A`,
                textShadow: `0 0 8px ${tone}`,
              }}
              aria-hidden="true"
            >
              <span className="flex h-full w-full -rotate-45 items-center justify-center">
                {site.kind === 'artifact' && site.artifactVisualMotif ? (
                  <svg className="h-[1.125rem] w-[1.125rem] overflow-visible" viewBox="-8 -8 16 16">
                    <ArtifactMotifGlyph site={site} x={0} y={0} tone="#fff" scale={0.72} />
                  </svg>
                ) : (
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: '#fff', boxShadow: `0 0 10px ${tone}` }}
                  />
                )}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function CivilizationZoomHotspot({
  scene,
  childScene,
  palette,
  highlight = false,
  hintLabel,
  compact = false,
  onZoom,
}: {
  scene: MarketSceneKind;
  childScene: MarketSceneKind;
  palette: AffinityPalette;
  highlight?: boolean;
  hintLabel?: string;
  compact?: boolean;
  onZoom: (scene: MarketSceneKind) => void;
}) {
  const anchor = SCENE_UI[scene].hotspotAnchor;
  const y = compact ? Math.min(anchor.y, 46) : anchor.y;
  const childLabel = SCENE_UI[childScene].zoomLabel;
  return (
    <button
      type="button"
      className={`group pointer-events-auto absolute z-30 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full border border-white/18 bg-[#050914]/68 px-2.5 py-2 text-left text-white shadow-[0_12px_34px_rgba(0,0,0,0.48)] backdrop-blur-md transition-[border-color,background-color,box-shadow,transform] hover:border-white/38 hover:bg-[#07111f]/82 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
        highlight ? 'civ-scan-attention' : ''
      }`}
      style={{
        left: `${anchor.x}%`,
        top: `${y}%`,
        boxShadow: `0 0 0 1px ${palette.primary}1F, 0 12px 34px rgba(0,0,0,0.48), 0 0 24px ${palette.primary}24`,
      }}
      data-testid="civilization-zoom-hotspot"
      aria-label={`${SCENE_UI[scene].hotspotLabel}: ${childLabel}`}
      onClick={() => onZoom(childScene)}
    >
      <span
        className="relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-black"
        style={{
          borderColor: `${palette.primary}88`,
          background: `radial-gradient(circle, ${palette.primary}38, rgba(5,9,20,0.9) 70%)`,
          color: '#ffffff',
          textShadow: `0 0 10px ${palette.primary}`,
        }}
        aria-hidden="true"
      >
        +
        <span
          className="absolute -inset-2 rounded-full border opacity-55 group-hover:opacity-80"
          style={{ borderColor: `${palette.primary}66` }}
        />
      </span>
      <span className="hidden min-w-0 sm:block">
        <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-white/44">
          Zoom in
        </span>
        <span className="block text-[10px] font-semibold uppercase tracking-[0.08em] text-white/86">
          {hintLabel ?? childLabel}
        </span>
      </span>
    </button>
  );
}

function MiniatureRecentTracePulse({
  site,
  recentCount,
  showCard = true,
}: {
  site: CivilizationDeploymentSite;
  recentCount: number;
  showCard?: boolean;
}) {
  const tone = getCivilizationSiteTone(site);
  const title = site.title.replace(/\s+Trace$/i, '');
  const subtitle = getInfluenceSubtitle(site);
  return (
    <div
      className="pointer-events-none absolute inset-0 z-20"
      data-testid="civilization-miniature-trace-pulse"
      aria-hidden="true"
    >
      <svg
        className="absolute inset-0 h-full w-full mix-blend-screen"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <ellipse
          className="civ-trace-recorded-ring"
          data-testid="civilization-miniature-registration-ring"
          cx={site.anchor.x}
          cy={site.anchor.y}
          rx="9"
          ry="3.8"
          fill="none"
          stroke={`${tone}F0`}
          strokeWidth="0.7"
        />
        <ellipse
          className="civ-trace-recorded-ring"
          data-testid="civilization-miniature-registration-ring"
          cx={site.anchor.x}
          cy={site.anchor.y}
          rx="13"
          ry="5.2"
          fill="none"
          stroke="rgba(255,255,255,0.64)"
          strokeWidth="0.28"
          style={{ animationDelay: '0.18s' }}
        />
        <ellipse
          className="civ-trace-reveal-vector"
          cx={site.anchor.x}
          cy={site.anchor.y}
          rx="23"
          ry="9.2"
          fill={`${tone}32`}
          stroke={`${tone}E0`}
          strokeWidth="0.86"
        />
        <path
          className="civ-trace-reveal-vector"
          d={`M${Math.max(2, site.anchor.x - 34)} ${site.anchor.y + 10} C${site.anchor.x - 12} ${site.anchor.y - 10}, ${site.anchor.x + 13} ${site.anchor.y + 11}, ${Math.min(98, site.anchor.x + 36)} ${site.anchor.y - 8}`}
          fill="none"
          stroke={tone}
          strokeLinecap="round"
          strokeWidth="1.34"
          style={{ animationDelay: '0.06s' }}
        />
        <path
          className="civ-trace-reveal-vector"
          d={`M${Math.max(2, site.anchor.x - 39)} ${site.anchor.y - 7} C${site.anchor.x - 16} ${site.anchor.y + 5}, ${site.anchor.x + 18} ${site.anchor.y - 6}, ${Math.min(98, site.anchor.x + 41)} ${site.anchor.y + 6}`}
          fill="none"
          stroke={`${tone}B8`}
          strokeLinecap="round"
          strokeWidth="0.72"
          style={{ animationDelay: '0.21s' }}
        />
        <path
          className="civ-trace-reveal-vector"
          d={`M${Math.max(4, site.anchor.x - 21)} ${site.anchor.y + 2} C${site.anchor.x - 8} ${site.anchor.y - 4}, ${site.anchor.x + 8} ${site.anchor.y + 4}, ${Math.min(96, site.anchor.x + 23)} ${site.anchor.y - 2}`}
          fill="none"
          stroke="rgba(255,255,255,0.58)"
          strokeLinecap="round"
          strokeWidth="0.3"
          style={{ animationDelay: '0.13s' }}
        />
        <circle
          className="civ-trace-reveal-vector"
          cx={site.anchor.x}
          cy={site.anchor.y}
          r="1.55"
          fill="#fff"
          style={{ animationDelay: '0.16s' }}
        />
      </svg>
      {showCard && (
        <div
          className="civ-miniature-trace-card absolute inset-x-2 top-2 flex min-w-0 items-center gap-2 border border-white/16 bg-[#050914]/88 px-2.5 py-2 text-left shadow-[0_14px_34px_rgba(0,0,0,0.62)] backdrop-blur-md"
          style={{
            borderColor: `${tone}A0`,
            boxShadow: `0 14px 34px rgba(0,0,0,0.62), 0 0 24px ${tone}34`,
          }}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center border border-white/14 bg-white/[0.055]"
            style={{ color: tone }}
            aria-hidden="true"
          >
            {site.kind === 'artifact' && site.artifactVisualMotif ? (
              <svg className="h-5 w-5 overflow-visible" viewBox="-8 -8 16 16">
                <ArtifactMotifGlyph site={site} x={0} y={0} tone={tone} scale={0.82} />
              </svg>
            ) : (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: tone, boxShadow: `0 0 10px ${tone}` }}
              />
            )}
          </span>
          <span className="min-w-0">
            <span className="block text-[7.5px] font-black uppercase tracking-[0.18em]" style={{ color: tone }}>
              Civilization updated{recentCount > 1 ? ` +${recentCount - 1}` : ''}
            </span>
            <span className="mt-0.5 block truncate text-[10px] font-semibold uppercase tracking-[0.05em] text-white/92">
              {title}
            </span>
            <span className="mt-0.5 block truncate text-[8.5px] font-semibold uppercase tracking-[0.08em] text-white/52">
              {subtitle}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

export function CivilizationMiniatureScene({
  tier,
  palette,
  profile,
  progressFraction,
  paused,
  deploymentSites,
  recentSiteIds = [],
  showRecentCard = true,
  presentation = 'standard',
  className = '',
}: CivilizationMiniatureSceneProps) {
  void progressFraction;
  const isThumbnail = presentation === 'thumbnail';
  const rootScene = getSceneKind(tier);
  const orderedRecentSites = React.useMemo(() => (
    selectSitesByIdOrder(deploymentSites, recentSiteIds)
  ), [deploymentSites, recentSiteIds]);
  const recentFocusSite = React.useMemo(() => {
    if (recentSiteIds.length === 0) return null;
    return orderedRecentSites[0] ?? null;
  }, [orderedRecentSites, recentSiteIds.length]);
  const scene = recentFocusSite
    ? normalizeSceneForTier(getNativeSceneForSite(recentFocusSite), tier)
    : rootScene;
  const sceneSites = React.useMemo(() => (
    deploymentSites.filter((site) => isSiteAvailableInScene(site, scene))
  ), [deploymentSites, scene]);
  const operationalSceneSites = React.useMemo(() => (
    sceneSites.filter(isCivilizationSiteOperational)
  ), [sceneSites]);
  const sceneSignals = React.useMemo(() => buildSceneSignals(sceneSites), [sceneSites]);
  const sceneIdentity = React.useMemo(() => buildSceneIdentity(sceneSites), [sceneSites]);
  const sceneArchetype = React.useMemo(() => (
    getCivilizationSceneArchetype(profile, sceneIdentity, sceneSignals)
  ), [profile, sceneIdentity, sceneSignals]);
  const miniatureSiteLimit = isThumbnail
    ? 1
    : recentSiteIds.length > 0
      ? 3
      : 2;
  const cinematicVisualSites = React.useMemo(() => (
    selectCinematicVisualSites(operationalSceneSites, miniatureSiteLimit, recentSiteIds)
  ), [miniatureSiteLimit, operationalSceneSites, recentSiteIds]);
  const cinematicHeroSites = React.useMemo(() => (
    selectCinematicHeroSites(operationalSceneSites, miniatureSiteLimit, recentSiteIds)
  ), [miniatureSiteLimit, operationalSceneSites, recentSiteIds]);
  const cinematicSignatureSites = React.useMemo(() => (
    selectCinematicSignatureSites(cinematicHeroSites)
  ), [cinematicHeroSites]);
  const sceneRenderSites = React.useMemo(() => (
    selectCinematicSites(cinematicHeroSites, 2)
  ), [cinematicHeroSites]);
  const recentSite = React.useMemo(() => (
    selectSitesByIdOrder(sceneSites, recentSiteIds)[0] ?? null
  ), [sceneSites, recentSiteIds]);
  const hasCinematicHeroBlueprint = cinematicHeroSites.some((site) => site.kind === 'blueprint');
  const cinematicStructuralSites = React.useMemo(() => (
    cinematicHeroSites.filter((site) => site.kind !== 'luminary')
  ), [cinematicHeroSites]);
  const miniatureArtifactInfluenceSites = React.useMemo(() => (
    (hasCinematicHeroBlueprint
      ? cinematicVisualSites.filter((site) => recentSiteIds.includes(site.id))
      : cinematicVisualSites
    ).filter((site) => shouldRenderArtifactInfluence(site, scene))
  ), [cinematicVisualSites, hasCinematicHeroBlueprint, recentSiteIds, scene]);

  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#030711] ${className}`}
      role="img"
      aria-label="Civilization preview showing recent artifact, Blueprint, and Luminary consequences."
      data-testid="civilization-miniature-scene"
      data-scene={scene}
      data-root-scene={rootScene}
      data-recent-focus-site={recentFocusSite?.id ?? undefined}
      data-presentation={presentation}
      data-archetype={sceneArchetype ?? undefined}
      data-civilization-motion={paused ? 'paused' : 'active'}
    >
      <MarketSceneStyles />
      <CinematicCivilizationPlate
        scene={scene}
        palette={palette}
        identity={sceneIdentity}
        signals={sceneSignals}
        archetype={sceneArchetype}
        scanActive={false}
      />
      <CivilizationEvolvedPlateStateLayer
        scene={scene}
        palette={palette}
        identity={sceneIdentity}
        signals={sceneSignals}
        scanActive={false}
      />
      <CivilizationArchetypeAtmosphereLayer
        profile={profile}
        scene={scene}
        identity={sceneIdentity}
        signals={sceneSignals}
        scanActive={false}
      />
      {!isThumbnail && (
        <>
          <CivilizationArchetypeCompositionLayer
            profile={profile}
            scene={scene}
            identity={sceneIdentity}
            signals={sceneSignals}
            scanActive={false}
          />
          <CivilizationPlateDialectLayer
            scene={scene}
            identity={sceneIdentity}
            signals={sceneSignals}
            scanActive={false}
          />
          <CivilizationSignatureAtmosphereLayer
            sites={cinematicSignatureSites}
            scene={scene}
            scanActive={false}
            maxSites={2}
          />
          <CivilizationEnvironmentalSignatureLayer
            sites={cinematicSignatureSites}
            scene={scene}
            scanActive={false}
            maxSites={2}
          />
          <CivilizationArtifactSubstructureLayer
            sites={miniatureArtifactInfluenceSites}
            scene={scene}
            scanActive={false}
            recentSiteIds={recentSiteIds}
            maxSites={recentSite ? 3 : 2}
          />
        </>
      )}
      <CivilizationMaterializedSiteLayer
        sites={recentFocusSite ? [recentFocusSite] : []}
        scene={scene}
        scanActive={false}
        recentSiteIds={recentSiteIds}
        maxSites={1}
        focusMode={Boolean(recentFocusSite)}
        compactFocus={Boolean(recentFocusSite)}
      />
      {!isThumbnail && (
        <CivilizationNativeWorkLayer
          sites={cinematicStructuralSites}
          scene={scene}
          recentSiteIds={recentSiteIds}
          maxSites={recentSite ? 3 : 2}
        />
      )}
      <CivilizationIntegratedConsequenceLayer
        sites={cinematicStructuralSites}
        scene={scene}
        scanActive={false}
        recentSiteIds={recentSiteIds}
        maxSites={isThumbnail ? 1 : recentSite ? 3 : 2}
      />
      {!isThumbnail && (
        <>
          <CivilizationDominantBlueprintLayer
            sites={cinematicStructuralSites.filter((site) => shouldRenderDominantBlueprint(site, scene))}
            scene={scene}
            scanActive={false}
          />
          <CivilizationConsequenceLayer
            sites={sceneRenderSites}
            scene={scene}
            scanActive={false}
          />
          <EnvironmentalTraceGlows sites={sceneRenderSites} scanActive={false} />
        </>
      )}
      {recentSite && !isThumbnail && (
        <MiniatureRecentTracePulse
          site={recentSite}
          recentCount={recentSiteIds.length}
          showCard={showRecentCard}
        />
      )}
      {!isThumbnail && <MiniatureWorkLedger sites={sceneSites} recentSiteIds={recentSiteIds} />}
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_28%,rgba(0,0,0,0.46)_100%),linear-gradient(180deg,rgba(0,0,0,0.08),transparent_32%,rgba(0,0,0,0.5))]"
        style={{
          background: scene === 'galaxy'
            ? 'radial-gradient(circle at 50% 48%, transparent 48%, rgba(0,0,0,0.28) 100%), linear-gradient(180deg, rgba(0,0,0,0.04), transparent 36%, rgba(0,0,0,0.36))'
            : scene === 'stellar'
              ? 'radial-gradient(circle at 50% 45%, transparent 36%, rgba(0,0,0,0.36) 100%), linear-gradient(180deg, rgba(0,0,0,0.06), transparent 34%, rgba(0,0,0,0.42))'
              : undefined,
        }}
        aria-hidden="true"
      />
    </div>
  );
}

function CivilizationCommandFrame({
  palette,
  scanActive,
  scene,
  traceCount,
}: {
  palette: AffinityPalette;
  scanActive: boolean;
  scene: MarketSceneKind;
  traceCount: number;
}) {
  const cornerStyle = {
    borderColor: `${palette.primary}72`,
    boxShadow: `0 0 18px ${palette.primary}18`,
  };
  const edgeStyle = {
    background: `linear-gradient(90deg, transparent, ${palette.primary}78, rgba(255,255,255,0.36), transparent)`,
  };
  const routePath = scene === 'surface'
    ? 'M3 82 C18 68, 31 75, 45 63 C59 51, 73 61, 97 45'
    : scene === 'orbit'
      ? 'M4 69 C20 55, 36 57, 53 64 C68 71, 82 69, 97 55'
      : scene === 'stellar'
        ? 'M8 62 C25 45, 42 65, 58 52 C72 41, 84 49, 96 38'
        : 'M8 63 C24 44, 43 48, 58 53 C75 59, 86 49, 96 31';
  const contourPath = scene === 'surface'
    ? 'M7 91 C24 82, 41 87, 59 75 C76 64, 88 71, 98 60'
    : scene === 'orbit'
      ? 'M13 74 C30 63, 47 64, 63 70 C77 76, 88 73, 97 65'
      : scene === 'stellar'
        ? 'M18 70 C35 59, 49 71, 67 58 C80 49, 90 52, 98 45'
        : 'M13 44 C29 55, 45 58, 61 46 C74 37, 85 42, 98 58';
  const orbitGuide = scene === 'surface'
    ? { cx: 56, cy: 75, rx: 26, ry: 7, rotation: -8 }
    : scene === 'orbit'
      ? { cx: 53, cy: 61, rx: 39, ry: 11, rotation: -10 }
      : scene === 'stellar'
        ? { cx: 56, cy: 51, rx: 42, ry: 14, rotation: -8 }
        : { cx: 55, cy: 51, rx: 30, ry: 9, rotation: -14 };
  const activeMeterCount = Math.min(6, Math.max(2, traceCount));

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[24]"
      aria-hidden="true"
      data-testid="civilization-command-frame"
      data-frame-scene={scene}
      data-scan-active={scanActive ? 'true' : 'false'}
    >
      <div
        className="absolute inset-3 border border-white/10 opacity-80"
        style={{
          boxShadow: `inset 0 0 28px ${palette.primary}12, inset 0 0 0 1px rgba(255,255,255,0.035)`,
        }}
      />
      <svg
        className="absolute inset-0 h-full w-full mix-blend-screen"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <path
          d="M4 14 L8 9 H31 L35 13 H65 L69 9 H92 L96 14 M4 86 L8 91 H31 L35 87 H65 L69 91 H92 L96 86"
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="0.26"
        />
        <path
          d={routePath}
          fill="none"
          stroke={`${palette.primary}${scanActive ? '8E' : '54'}`}
          strokeLinecap="round"
          strokeWidth={scanActive ? 0.46 : 0.34}
          className={scanActive ? 'civ-command-frame-flow' : undefined}
        />
        <path
          d={contourPath}
          fill="none"
          stroke={`${palette.accent}${scanActive ? '5C' : '32'}`}
          strokeLinecap="round"
          strokeWidth="0.26"
          strokeDasharray="1.6 2.4"
        />
        <ellipse
          cx={orbitGuide.cx}
          cy={orbitGuide.cy}
          rx={orbitGuide.rx}
          ry={orbitGuide.ry}
          fill="none"
          stroke={`${palette.secondary}${scanActive ? '66' : '34'}`}
          strokeWidth="0.24"
          strokeDasharray="2.8 2.4"
          transform={`rotate(${orbitGuide.rotation} ${orbitGuide.cx} ${orbitGuide.cy})`}
        />
        <ellipse
          cx={orbitGuide.cx}
          cy={orbitGuide.cy}
          rx={orbitGuide.rx * 0.56}
          ry={orbitGuide.ry * 0.48}
          fill="none"
          stroke="rgba(255,255,255,0.14)"
          strokeWidth="0.16"
          transform={`rotate(${orbitGuide.rotation} ${orbitGuide.cx} ${orbitGuide.cy})`}
        />
        {[18, 32, 47, 63, 79].map((x, index) => (
          <circle
            key={x}
            cx={x}
            cy={index % 2 === 0 ? 16 : 88}
            r={index < activeMeterCount ? 0.34 : 0.22}
            fill={index < activeMeterCount ? palette.primary : 'rgba(255,255,255,0.18)'}
            opacity={index < activeMeterCount ? 0.72 : 0.32}
            className={scanActive && index < activeMeterCount ? 'civ-command-frame-beacon' : undefined}
          />
        ))}
        {scanActive && (
          <g opacity="0.72">
            <path
              d="M12 22 H22 M12 26 H18 M78 22 H88 M82 26 H88 M13 76 H24 M16 80 H26 M75 76 H88 M79 80 H88"
              stroke="rgba(255,255,255,0.18)"
              strokeLinecap="round"
              strokeWidth="0.24"
            />
            <path
              d="M50 8 L52.6 10.6 L50 13.2 L47.4 10.6 Z"
              fill={`${palette.primary}16`}
              stroke={`${palette.primary}9A`}
              strokeWidth="0.28"
            />
          </g>
        )}
      </svg>

      <span className="absolute left-3 top-3 h-10 w-10 border-l border-t" style={cornerStyle} />
      <span className="absolute right-3 top-3 h-10 w-10 border-r border-t" style={cornerStyle} />
      <span className="absolute bottom-3 left-3 h-10 w-10 border-b border-l" style={cornerStyle} />
      <span className="absolute bottom-3 right-3 h-10 w-10 border-b border-r" style={cornerStyle} />

      <span className="absolute left-[12%] right-[12%] top-3 h-px opacity-70" style={edgeStyle} />
      <span className="absolute bottom-3 left-[14%] right-[14%] h-px opacity-45" style={edgeStyle} />

      <span
        className="absolute left-5 top-5 h-8 w-28 border border-white/10 bg-[#030711]/18 opacity-70"
        style={{
          clipPath: 'polygon(0 0, 88% 0, 100% 50%, 88% 100%, 0 100%)',
          boxShadow: `inset 0 0 18px ${palette.primary}0F`,
        }}
      />
      <span
        className="absolute right-5 top-5 h-8 w-28 border border-white/10 bg-[#030711]/18 opacity-70"
        style={{
          clipPath: 'polygon(12% 0, 100% 0, 100% 100%, 12% 100%, 0 50%)',
          boxShadow: `inset 0 0 18px ${palette.primary}0F`,
        }}
      />
      <span
        className="absolute left-1/2 top-3 h-7 w-7 -translate-x-1/2 rotate-45 border"
        style={{
          borderColor: `${palette.primary}7A`,
          background: `radial-gradient(circle, ${palette.primary}20, rgba(3,7,17,0.18) 68%)`,
          boxShadow: `0 0 18px ${palette.primary}20`,
        }}
      />

      <span className="absolute left-3 top-[28%] h-14 w-px bg-white/18" />
      <span className="absolute left-3 top-[46%] h-8 w-px bg-white/12" />
      <span className="absolute right-3 top-[30%] h-10 w-px bg-white/14" />
      <span className="absolute right-3 top-[54%] h-16 w-px bg-white/18" />

      <span className="absolute left-4 top-1/2 hidden -translate-y-1/2 flex-col gap-2 sm:flex">
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            className="h-7 w-7 rotate-45 border border-white/12 bg-[#030711]/28"
            style={index === 1 || (scanActive && index < 3) ? {
              borderColor: `${palette.primary}72`,
              background: `${palette.primary}10`,
              boxShadow: `0 0 16px ${palette.primary}18`,
            } : undefined}
          />
        ))}
      </span>

      <span className="absolute left-5 top-5 flex gap-1.5">
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={index}
            className="h-1 w-5 bg-white/18"
            style={index < (scanActive ? 4 : 2) ? {
              background: `linear-gradient(90deg, ${palette.primary}, rgba(255,255,255,0.34))`,
              boxShadow: `0 0 12px ${palette.primary}20`,
            } : undefined}
          />
        ))}
      </span>
      <span className="absolute bottom-5 right-5 hidden gap-1 sm:flex">
        {Array.from({ length: 4 }).map((_, index) => (
          <span
            key={`tile-${index}`}
            className="h-6 w-10 border border-white/12 bg-[#030711]/34"
            style={index < Math.min(4, Math.max(1, traceCount)) ? {
              borderColor: `${palette.secondary}58`,
              background: `linear-gradient(135deg, ${palette.secondary}12, rgba(255,255,255,0.035))`,
              boxShadow: `inset 0 0 14px ${palette.secondary}10`,
            } : undefined}
          />
        ))}
      </span>
      <span className="absolute bottom-5 right-5 flex gap-1 sm:bottom-14">
        {Array.from({ length: 5 }).map((_, index) => (
          <span
            key={index}
            className="h-1.5 w-1.5 rotate-45 border border-white/22"
            style={index === 0 || (scanActive && index < 3) ? {
              borderColor: `${palette.accent}A0`,
              background: `${palette.primary}1C`,
              boxShadow: `0 0 10px ${palette.primary}24`,
            } : undefined}
          />
        ))}
      </span>
    </div>
  );
}

export function CivilizationScenePanel({
  tier,
  palette,
  profile,
  progressFraction,
  paused,
  defaultScanActive = false,
  defaultScene,
  deploymentSites,
  forgedArtifacts,
  guidanceEnabled = true,
  stabilityBand = 'stable',
  activeConditions = [],
  externalRecentSiteIds = [],
  onRecentSiteIdsSeen,
  onOpenArtifact,
}: CivilizationScenePanelProps) {
  void progressFraction;
  const isMobile = useIsMobile();
  const [compactViewport, setCompactViewport] = React.useState(false);
  const compactScanLayout = isMobile || compactViewport;
  const visibleLimit = compactScanLayout ? 4 : 6;
  const [scanActive, setScanActive] = React.useState(defaultScanActive);
  const [portraitGuideVisible, setPortraitGuideVisible] = React.useState(false);
  const [scanGuideVisible, setScanGuideVisible] = React.useState(false);
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | null>(null);
  const [sceneOverride, setSceneOverride] = React.useState<MarketSceneKind>(() => (
    getInitialSceneOverride({ defaultScene, defaultScanActive, deploymentSites, tier })
  ));
  const [recentSiteIds, setRecentSiteIds] = React.useState<string[]>([]);
  const previousSiteIdsRef = React.useRef<Set<string> | null>(null);
  const hasInitializedScanSelectionRef = React.useRef(false);
  const scene = normalizeSceneForTier(sceneOverride, tier);
  const availableScenes = React.useMemo(() => getAvailableScenePath(tier), [tier]);
  const childScene = getChildScene(scene, tier);
  const sceneSites = React.useMemo(() => (
    deploymentSites.filter((site) => isSiteAvailableInScene(site, scene))
  ), [deploymentSites, scene]);
  const operationalSceneSites = React.useMemo(() => (
    sceneSites.filter(isCivilizationSiteOperational)
  ), [sceneSites]);
  const scaleContextSites = React.useMemo(() => (
    deploymentSites.filter((site) => !isSiteAvailableInScene(site, scene))
  ), [deploymentSites, scene]);
  const visibleSites = React.useMemo(
    () => selectVisibleSites(
      sceneSites,
      visibleLimit,
      selectedSiteId ? [...recentSiteIds, selectedSiteId] : recentSiteIds,
    ),
    [sceneSites, recentSiteIds, selectedSiteId, visibleLimit],
  );
  const cinematicVisualSites = React.useMemo(
    () => selectCinematicVisualSites(operationalSceneSites, isMobile ? 2 : 3, recentSiteIds),
    [operationalSceneSites, recentSiteIds, isMobile],
  );
  const cinematicHeroSites = React.useMemo(
    () => selectCinematicHeroSites(operationalSceneSites, recentSiteIds.length > 0 ? (isMobile ? 2 : 3) : (isMobile ? 1 : 2), recentSiteIds),
    [operationalSceneSites, recentSiteIds, isMobile],
  );
  const cinematicSites = React.useMemo(
    () => selectCinematicSites(cinematicHeroSites, isMobile ? 1 : 2),
    [cinematicHeroSites, isMobile],
  );
  const overflowSites = React.useMemo(
    () => sceneSites.filter((site) => !visibleSites.some((visible) => visible.id === site.id)),
    [sceneSites, visibleSites],
  );
  const overflowCount = overflowSites.length;
  const clusterGroups = React.useMemo(() => (
    getClusterGroups(overflowSites)
  ), [overflowSites]);
  const sceneCopy = SCENE_COPY[scene];
  const sceneSignals = React.useMemo(() => buildSceneSignals(sceneSites), [sceneSites]);
  const sceneIdentity = React.useMemo(() => buildSceneIdentity(sceneSites), [sceneSites]);
  const sceneArchetype = React.useMemo(() => (
    getCivilizationSceneArchetype(profile, sceneIdentity, sceneSignals)
  ), [profile, sceneIdentity, sceneSignals]);
  const sceneArchetypeVisual = sceneArchetype ? CIVILIZATION_ARCHETYPE_VISUALS[sceneArchetype] : null;
  const traceCount = sceneSites.length;
  const smallArtifactTraceSummary = React.useMemo(() => (
    formatSmallArtifactTraceSummary(getSmallArtifactTraceLabels(sceneSites, forgedArtifacts))
  ), [sceneSites, forgedArtifacts]);
  const recentSites = React.useMemo(() => (
    selectSitesByIdOrder(deploymentSites, recentSiteIds)
  ), [deploymentSites, recentSiteIds]);
  const recentNativeTargetScene = React.useMemo(() => {
    const nativeScenes = recentSites
      .map(getNativeSceneForSite)
      .filter((nativeScene) => nativeScene !== scene)
      .sort((left, right) => (
        Math.abs(getSceneIndex(left) - getSceneIndex(scene)) -
        Math.abs(getSceneIndex(right) - getSceneIndex(scene))
      ));
    return nativeScenes[0] ?? null;
  }, [recentSites, scene]);
  const recentZoomHint = recentNativeTargetScene
    ? `New work in ${getSceneDepthLabel(recentNativeTargetScene)}`
    : null;
  const recentNativeTargetSite = React.useMemo(() => (
    recentNativeTargetScene
      ? recentSites.find((site) => getNativeSceneForSite(site) === recentNativeTargetScene) ?? null
      : null
  ), [recentNativeTargetScene, recentSites]);
  const visibleRecentSites = React.useMemo(() => (
    selectSitesByIdOrder(visibleSites, recentSiteIds)
  ), [recentSiteIds, visibleSites]);
  const revealRecentSites = React.useMemo(() => (
    visibleRecentSites.length > 0
      ? visibleRecentSites
      : recentSites.slice(0, compactScanLayout ? 1 : 2)
  ), [compactScanLayout, recentSites, visibleRecentSites]);
  const recentTraceSummary = React.useMemo(() => formatTraceNames(recentSites), [recentSites]);
  const cinematicSignatureSites = React.useMemo(() => (
    selectCinematicSignatureSites(cinematicHeroSites)
  ), [cinematicHeroSites]);
  React.useEffect(() => {
    if (!guidanceEnabled || forgedArtifacts.length === 0) {
      setPortraitGuideVisible(false);
      return;
    }
    try {
      setPortraitGuideVisible(!localStorage.getItem('luminae_civilization_portrait_hint_seen'));
    } catch {
      setPortraitGuideVisible(true);
    }
  }, [forgedArtifacts.length, guidanceEnabled]);

  React.useEffect(() => {
    const check = () => setCompactViewport(window.innerWidth < 640);
    if (typeof window.matchMedia !== 'function') {
      check();
      return undefined;
    }
    const mediaQuery = window.matchMedia('(max-width: 639px)');
    mediaQuery.addEventListener('change', check);
    check();
    return () => mediaQuery.removeEventListener('change', check);
  }, []);

  React.useEffect(() => {
    setSceneOverride((current) => normalizeSceneForTier(current, tier));
  }, [tier]);

  React.useEffect(() => {
    if (!scanActive) {
      if (hasInitializedScanSelectionRef.current) {
        setSelectedSiteId(null);
      } else {
        hasInitializedScanSelectionRef.current = true;
      }
      return;
    }
    hasInitializedScanSelectionRef.current = true;
    if (!selectedSiteId) return;
    if (visibleSites.some((site) => site.id === selectedSiteId)) return;
    setSelectedSiteId(null);
  }, [scanActive, selectedSiteId, visibleSites]);

  React.useEffect(() => {
    const nextIds = new Set(deploymentSites.map((site) => site.id));
    const previousIds = previousSiteIdsRef.current;
    previousSiteIdsRef.current = nextIds;

    if (!previousIds) return undefined;

    const newlyVisibleIds = deploymentSites
      .filter((site) => !previousIds.has(site.id))
      .map((site) => site.id);

    if (newlyVisibleIds.length === 0) return undefined;

    const primaryNewSite = deploymentSites.find((site) => site.id === newlyVisibleIds[0]);
    setRecentSiteIds(newlyVisibleIds);
    setScanActive(true);
    if (primaryNewSite) {
      setSceneOverride(normalizeSceneForTier(getNativeSceneForSite(primaryNewSite), tier));
    }
    setSelectedSiteId((current) => (
      current && newlyVisibleIds.includes(current) ? current : newlyVisibleIds[0] ?? null
    ));
    const timeoutId = window.setTimeout(() => {
      setRecentSiteIds((current) => current.filter((siteId) => !newlyVisibleIds.includes(siteId)));
    }, RECENT_TRACE_VISIBLE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [deploymentSites, tier]);

  const toggleScan = React.useCallback(() => {
    setScanActive((current) => {
      const next = !current;
      if (next && guidanceEnabled) {
        try {
          setScanGuideVisible(!localStorage.getItem('luminae_civilization_scan_hint_seen'));
        } catch {
          setScanGuideVisible(true);
        }
      }
      return next;
    });
  }, [guidanceEnabled]);

  React.useEffect(() => {
    const displayableIds = externalRecentSiteIds.filter((siteId) => (
      deploymentSites.some((site) => site.id === siteId)
    ));
    if (displayableIds.length === 0) return undefined;

    const primaryRecentSite = deploymentSites.find((site) => site.id === displayableIds[0]);
    setRecentSiteIds((current) => prioritizeRecentCivilizationSiteIds(displayableIds, current));
    setScanActive(true);
    if (primaryRecentSite) {
      setSceneOverride(normalizeSceneForTier(getNativeSceneForSite(primaryRecentSite), tier));
    }
    setSelectedSiteId((current) => (
      current && displayableIds.includes(current) ? current : displayableIds[0] ?? null
    ));

    const timeoutId = window.setTimeout(() => {
      setRecentSiteIds((current) => current.filter((siteId) => !displayableIds.includes(siteId)));
      onRecentSiteIdsSeen?.(displayableIds);
    }, RECENT_TRACE_VISIBLE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [deploymentSites, externalRecentSiteIds, onRecentSiteIdsSeen, tier]);
  const selectedSite = React.useMemo(() => (
    scanActive ? visibleSites.find((site) => site.id === selectedSiteId) ?? null : null
  ), [scanActive, selectedSiteId, visibleSites]);
  const focusedSite = scanActive ? selectedSite ?? visibleRecentSites[0] ?? visibleSites[0] ?? null : null;
  const focusedSiteId = focusedSite?.id ?? null;
  const dossierSite = selectedSite;
  const selectedScanPresentationActive = scanActive && Boolean(dossierSite);
  const dossierPreferredSide = dossierSite && dossierSite.anchor.x > 55 ? 'left' : 'right';
  const sceneOverlaySites = React.useMemo(() => (
    selectedScanPresentationActive && dossierSite ? [dossierSite] : sceneSites
  ), [selectedScanPresentationActive, dossierSite, sceneSites]);
  const sceneOverlaySignals = React.useMemo(() => buildSceneSignals(sceneOverlaySites), [sceneOverlaySites]);
  const sceneOverlayIdentity = React.useMemo(() => buildSceneIdentity(sceneOverlaySites), [sceneOverlaySites]);
  const sceneOverlayArchetype = React.useMemo(() => (
    getCivilizationSceneArchetype(profile, sceneOverlayIdentity, sceneOverlaySignals)
  ), [profile, sceneOverlayIdentity, sceneOverlaySignals]);
  const scanContextSites = React.useMemo(() => (
    scanActive
      ? selectScanFocusSites(visibleSites, focusedSiteId, 1, recentSiteIds)
          .filter(isCivilizationSiteOperational)
      : []
  ), [scanActive, visibleSites, focusedSiteId, recentSiteIds]);
  const scanPrimarySites = React.useMemo(() => (
    scanActive && focusedSite && isCivilizationSiteOperational(focusedSite) ? [focusedSite] : []
  ), [scanActive, focusedSite]);
  const hasCinematicHeroBlueprint = cinematicHeroSites.some((site) => site.kind === 'blueprint');
  const cinematicArtifactInfluenceSites = React.useMemo(() => (
    (hasCinematicHeroBlueprint
      ? cinematicVisualSites.filter((site) => recentSiteIds.includes(site.id))
      : cinematicVisualSites
    ).filter((site) => shouldRenderArtifactInfluence(site, scene))
  ), [cinematicVisualSites, hasCinematicHeroBlueprint, recentSiteIds, scene]);
  const heavyRenderSites = scanActive ? scanPrimarySites : cinematicHeroSites;
  const scanPresentationSites = selectedScanPresentationActive ? [] : heavyRenderSites;
  const structuralRenderSites = scanActive
    ? scanPresentationSites
    : heavyRenderSites.filter((site) => site.kind !== 'luminary');
  const selectedNativeWorkSites = selectedScanPresentationActive && focusedSite && isCivilizationSiteOperational(focusedSite) && getNativeSceneForSite(focusedSite) === scene
    ? [focusedSite]
    : structuralRenderSites;
  const sceneRenderSites = scanActive ? scanPresentationSites : cinematicSites;
  const signatureRenderSites = scanActive && selectedScanPresentationActive ? [] : scanActive ? scanContextSites : cinematicSignatureSites;
  const focusScanSite = React.useCallback((siteId: string) => {
    const site = deploymentSites.find((entry) => entry.id === siteId);
    setSelectedSiteId(siteId);
    setScanActive(true);
    if (site) {
      setSceneOverride(normalizeSceneForTier(getNativeSceneForSite(site), tier));
    }
  }, [deploymentSites, tier]);

  return (
    <section
      className="relative overflow-hidden rounded-[10px] border border-white/14 bg-[#050914] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035),0_22px_62px_rgba(0,0,0,0.28)]"
      aria-label="Civilization scene"
      data-testid="civilization-scene-panel"
      data-archetype={sceneArchetype ?? undefined}
      data-stability={stabilityBand}
      data-civilization-motion={paused ? 'paused' : 'active'}
      style={{
        borderColor: `${palette.primary}33`,
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.035), 0 22px 62px rgba(0,0,0,0.28), 0 0 34px ${palette.primary}12`,
      }}
    >
      <MarketSceneStyles />
      <header
        className="relative z-20 flex flex-col gap-2 border-b border-white/12 bg-[#050914]/72 px-3 py-2.5 backdrop-blur-md sm:flex-row sm:items-start sm:justify-between sm:gap-3 sm:px-3.5 sm:py-3"
        style={{
          background: `linear-gradient(135deg, rgba(5,9,20,0.76), ${palette.primary}12)`,
        }}
      >
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-white sm:text-base">Civilization Portrait</h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-white/54 sm:text-xs">
            {sceneCopy.label} // {traceCount} trace{traceCount === 1 ? '' : 's'} recorded
          </p>
          {sceneArchetypeVisual && (
            <p
              className="mt-0.5 truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-[#dfb86b]/76 sm:mt-1 sm:text-[10px] sm:tracking-[0.16em]"
              data-testid="civilization-archetype-label"
            >
              Visual identity // {sceneArchetypeVisual.label}
            </p>
          )}
          {smallArtifactTraceSummary && (
            <p className="mt-0.5 line-clamp-2 text-[9px] font-semibold uppercase tracking-[0.14em] text-[#82ddff]/72 sm:mt-1 sm:truncate sm:text-[10px] sm:tracking-[0.16em]">
              Local artifact traces // {smallArtifactTraceSummary}
            </p>
          )}
          {recentTraceSummary && (
            <p className="mt-0.5 line-clamp-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#dfb86b] sm:mt-1 sm:truncate sm:text-[10px] sm:tracking-[0.18em]" aria-live="polite">
              New trace recorded // {recentTraceSummary}
              {recentZoomHint ? ` // ${recentZoomHint}` : ''}
            </p>
          )}
          <p
            className="mt-1 inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-white/62"
            data-testid="civilization-system-state-label"
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: stabilityBand === 'stable'
                  ? '#8ed3aa'
                  : stabilityBand === 'strained'
                    ? '#dfb86b'
                    : stabilityBand === 'unstable'
                      ? '#e78d62'
                      : '#ef665f',
              }}
              aria-hidden="true"
            />
            Stability // {CIVILIZATION_STABILITY_LABELS[stabilityBand]}
            {activeConditions.length > 0 ? ` // ${activeConditions.length} active condition${activeConditions.length === 1 ? '' : 's'}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1 sm:justify-end sm:gap-1.5" aria-label="Civilization scale path">
          {availableScenes.map((item, index) => {
            const activeScale = scene === item;
            const suggestedScale = Boolean(recentNativeTargetScene && recentNativeTargetScene === item && !activeScale);
            const suggestedScaleChip = suggestedScale ? getCivilizationScaleTargetChip(recentNativeTargetSite ?? undefined) : null;
            return (
              <React.Fragment key={item}>
                {index > 0 && (
                  <span className="hidden text-[10px] font-semibold text-white/24 sm:inline" aria-hidden="true">
                    /
                  </span>
                )}
                <button
                  type="button"
                  aria-label={suggestedScale ? getCivilizationScaleTargetLabel(SCENE_UI[item].label, recentNativeTargetSite ?? undefined) : undefined}
                  aria-pressed={activeScale}
                  data-active-scale={activeScale ? 'true' : undefined}
                  data-recent-scale-target={suggestedScale ? 'true' : undefined}
                  className={`inline-flex items-center gap-1.5 rounded-[7px] border px-2 py-1.5 text-[9px] font-semibold transition-colors hover:border-white/28 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/65 sm:px-2.5 sm:text-[10px] ${
                    suggestedScale ? 'civ-scan-attention' : ''
                  }`}
                  style={activeScale ? {
                    borderColor: 'rgba(223, 184, 107, 0.86)',
                    background: 'linear-gradient(180deg, rgba(223, 184, 107, 0.32), rgba(223, 184, 107, 0.14))',
                    color: '#fff8d7',
                    boxShadow: 'inset 0 0 0 1px rgba(255, 244, 197, 0.12), 0 0 20px rgba(223, 184, 107, 0.24)',
                  } : suggestedScale ? {
                    borderColor: 'rgba(130, 221, 255, 0.74)',
                    backgroundColor: 'rgba(130, 221, 255, 0.1)',
                    color: '#dff7ff',
                    boxShadow: 'inset 0 0 0 1px rgba(220, 248, 255, 0.08), 0 0 18px rgba(130, 221, 255, 0.22)',
                  } : {
                    borderColor: 'rgba(255, 255, 255, 0.14)',
                    backgroundColor: 'rgba(255, 255, 255, 0.06)',
                    color: 'rgba(255, 255, 255, 0.68)',
                  }}
                  onClick={() => setSceneOverride(item)}
                >
                  {(activeScale || suggestedScale) && (
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      data-testid={activeScale ? 'civilization-scale-active-indicator' : 'civilization-scale-recent-target-indicator'}
                      style={{
                        backgroundColor: activeScale ? '#fff4c5' : '#82ddff',
                        boxShadow: activeScale
                          ? '0 0 10px rgba(223, 184, 107, 0.82)'
                          : '0 0 12px rgba(130, 221, 255, 0.72)',
                      }}
                      aria-hidden="true"
                    />
                  )}
                  {SCENE_UI[item].label}
                  {suggestedScaleChip && (
                    <span className="rounded-full border border-[#82ddff]/38 bg-[#82ddff]/14 px-1 py-0.5 text-[7px] font-black uppercase leading-none tracking-[0.1em] text-[#dff7ff]">
                      {suggestedScaleChip}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
          {sceneSites.length > 0 && (
            <button
              type="button"
              aria-pressed={scanActive}
              className={`inline-flex items-center gap-1.5 rounded-[7px] border border-white/14 bg-white/[0.06] px-2 py-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/72 transition-colors hover:border-white/28 hover:bg-white/10 aria-pressed:border-[#82ddff]/70 aria-pressed:bg-[#82ddff]/12 aria-pressed:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/65 sm:px-2.5 sm:text-[10px] ${
                recentTraceSummary && !scanActive ? 'civ-scan-attention' : ''
              }`}
              onClick={toggleScan}
            >
              {scanActive ? <X className="h-3.5 w-3.5" aria-hidden="true" /> : <ScanLine className="h-3.5 w-3.5" aria-hidden="true" />}
              Scan
              {recentTraceSummary && !scanActive && (
                <span className="rounded-full bg-[#dfb86b]/20 px-1.5 py-0.5 text-[8px] text-[#ffe4a3]">
                  New
                </span>
              )}
            </button>
          )}
        </div>
      </header>

      <div
        className="relative h-[clamp(320px,54dvh,500px)] overflow-hidden bg-[#030711] sm:h-[560px]"
        role="img"
        aria-label="Civilization portrait where artifacts, Blueprints, and allied Luminaries are represented as environmental changes at believable scale."
        style={{
          background: `radial-gradient(circle at 50% 34%, ${palette.primary}13, transparent 44%), #030711`,
        }}
      >
        {(portraitGuideVisible || scanGuideVisible) && (
          <aside
            className="absolute inset-x-3 top-3 z-[90] flex items-start justify-between gap-2 border border-[#82ddff]/30 bg-[#04101a]/96 px-3 py-2 text-left shadow-[0_10px_26px_rgba(0,0,0,0.36)] sm:left-auto sm:max-w-[420px] sm:gap-3 sm:py-2.5 sm:backdrop-blur-md"
            aria-live="polite"
            data-testid={scanGuideVisible ? 'civilization-scan-guide' : 'civilization-portrait-guide'}
          >
            <div>
              <strong className="block text-xs font-semibold text-white">
                {scanGuideVisible ? 'Read the causal record' : 'Your first historical trace'}
              </strong>
              <span className="mt-1 block text-[10px] leading-snug text-white/70 sm:hidden">
                {scanGuideVisible
                  ? 'Select a deployment to inspect its role, location, and present condition.'
                  : 'Forged technology now alters this civilization. Open Scan to inspect the cause.'}
              </span>
              <span className="mt-1 hidden text-[11px] leading-relaxed text-white/68 sm:block">
                {scanGuideVisible
                  ? 'Select a deployment site to see what it does, where it operates, and whether its capability is currently active. Stability and Conditions describe the civilization now; the historical imprint remains.'
                  : 'A Forged Artifact is implemented capability. Its plausible deployment and wider consequences now alter this portrait permanently.'}
              </span>
            </div>
            <button
              type="button"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/12 text-white/65 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label="Dismiss Civilization guidance"
              onClick={() => {
                if (scanGuideVisible) {
                  markHintSeen('luminae_civilization_scan_hint_seen');
                  setScanGuideVisible(false);
                }
                if (portraitGuideVisible) {
                  markHintSeen('luminae_civilization_portrait_hint_seen');
                  setPortraitGuideVisible(false);
                }
              }}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </aside>
        )}
        <div
          className="absolute inset-0 opacity-[0.82]"
          style={{
            backgroundImage: [
              'radial-gradient(circle at 7% 17%, rgba(255,255,255,0.8) 0 1px, transparent 1.5px)',
              'radial-gradient(circle at 14% 46%, rgba(255,255,255,0.38) 0 1px, transparent 1.5px)',
              'radial-gradient(circle at 28% 12%, rgba(255,255,255,0.42) 0 1px, transparent 1.5px)',
              'radial-gradient(circle at 41% 32%, rgba(255,255,255,0.55) 0 1px, transparent 1.5px)',
              'radial-gradient(circle at 59% 15%, rgba(255,255,255,0.44) 0 1px, transparent 1.5px)',
              'radial-gradient(circle at 75% 31%, rgba(255,255,255,0.62) 0 1px, transparent 1.5px)',
              'radial-gradient(circle at 88% 61%, rgba(255,255,255,0.36) 0 1px, transparent 1.5px)',
              'radial-gradient(circle at 63% 83%, rgba(255,255,255,0.4) 0 1px, transparent 1.5px)',
            ].join(','),
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(130,221,255,0.07),transparent_45%)]"
          aria-hidden="true"
        />
        <div className="hidden" aria-hidden="true">
          <MarketCivilizationScene scene={scene} signals={sceneSignals} />
        </div>
        <CinematicCivilizationPlate
          scene={scene}
          palette={palette}
          identity={sceneOverlayIdentity}
          signals={sceneOverlaySignals}
          archetype={sceneOverlayArchetype}
          scanActive={scanActive}
        />
        <CivilizationEvolvedPlateStateLayer
          scene={scene}
          palette={palette}
          identity={sceneOverlayIdentity}
          signals={sceneOverlaySignals}
          scanActive={scanActive}
        />
        <CivilizationArchetypeAtmosphereLayer
          profile={profile}
          scene={scene}
          identity={sceneOverlayIdentity}
          signals={sceneOverlaySignals}
          scanActive={scanActive}
        />
        <CivilizationSystemStateLayer
          stabilityBand={stabilityBand}
          activeConditions={activeConditions}
        />
        {!selectedScanPresentationActive && (
          <CivilizationArchetypeCompositionLayer
            profile={profile}
            scene={scene}
            identity={sceneOverlayIdentity}
            signals={sceneOverlaySignals}
            scanActive={scanActive}
          />
        )}
        {!scanActive && (
          <>
            <CivilizationScaleFrameLayer scene={scene} palette={palette} scanActive={scanActive} />
            <CivilizationPlateDialectLayer
              scene={scene}
              identity={sceneIdentity}
              signals={sceneSignals}
              scanActive={scanActive}
            />
            <CivilizationScaleContextLayer scene={scene} palette={palette} scanActive={scanActive} />
            <CivilizationSceneDepthCompositionLayer
              scene={scene}
              palette={palette}
              identity={sceneIdentity}
              signals={sceneSignals}
              scanActive={scanActive}
            />
          </>
        )}
        <CivilizationScaleTheaterLayer
          sites={structuralRenderSites}
          scene={scene}
          scanActive={scanActive}
          recentSiteIds={recentSiteIds}
          maxSites={scanActive ? 1 : isMobile ? 2 : 4}
        />
        <CivilizationMaterializedSiteLayer
          sites={selectedNativeWorkSites}
          scene={scene}
          scanActive={scanActive}
          recentSiteIds={recentSiteIds}
          maxSites={scanActive ? 1 : isMobile ? 2 : 3}
          focusMode={selectedScanPresentationActive}
          compactFocus={compactScanLayout && selectedScanPresentationActive}
        />
        {!selectedScanPresentationActive && (
          <CivilizationTraitDialectLayer profile={profile} scene={scene} compact={isMobile} />
        )}
        <CivilizationSignatureAtmosphereLayer
          sites={signatureRenderSites}
          scene={scene}
          scanActive={scanActive}
          maxSites={scanActive ? (isMobile ? 1 : 2) : isMobile ? 2 : 3}
        />
        <CivilizationIdentityAtmosphereLayer identity={sceneIdentity} palette={palette} />
        <CivilizationEnvironmentalSignatureLayer
          sites={signatureRenderSites}
          scene={scene}
          scanActive={scanActive}
          maxSites={scanActive ? (isMobile ? 1 : 2) : isMobile ? 2 : 3}
        />
        <CivilizationArtifactSubstructureLayer
          sites={scanActive ? scanPresentationSites : cinematicArtifactInfluenceSites}
          scene={scene}
          scanActive={scanActive}
          recentSiteIds={recentSiteIds}
          maxSites={scanActive ? 1 : isMobile ? 2 : 3}
        />
        <CivilizationArtifactDeploymentLayer
          sites={structuralRenderSites}
          scene={scene}
          scanActive={scanActive}
          recentSiteIds={recentSiteIds}
          maxSites={scanActive ? 1 : isMobile ? 1 : 2}
        />
        <CivilizationNativeWorkLayer
          sites={selectedNativeWorkSites}
          scene={scene}
          recentSiteIds={recentSiteIds}
          maxSites={scanActive ? 1 : isMobile ? 2 : 3}
          compactFocus={compactScanLayout && selectedScanPresentationActive}
        />
        <CivilizationIntegratedConsequenceLayer
          sites={structuralRenderSites}
          scene={scene}
          scanActive={scanActive}
          recentSiteIds={recentSiteIds}
          maxSites={scanActive ? 1 : isMobile ? 2 : 3}
        />
        <CivilizationDominantBlueprintLayer
          sites={structuralRenderSites.filter((site) => shouldRenderDominantBlueprint(site, scene))}
          scene={scene}
          scanActive={scanActive}
        />
        {scanActive && (
          <CivilizationProjectWashLayer
            sites={scanPresentationSites}
            scene={scene}
            scanActive={scanActive}
          />
        )}
        {scanActive && (
          <>
            <CivilizationProjectZoneLayer
              sites={scanPresentationSites}
              scene={scene}
              scanActive={scanActive}
            />
            <CivilizationTraitSignatureLayer
              sites={scanPresentationSites}
              scene={scene}
              scanActive={scanActive}
              maxSites={1}
            />
          </>
        )}
        <CivilizationConsequenceLayer
          sites={sceneRenderSites}
          scene={scene}
          scanActive={scanActive}
        />
        <EnvironmentalTraceGlows sites={sceneRenderSites} scanActive={scanActive} />
        <CivilizationArtifactLifecycleScarLayer
          sites={sceneSites}
          focusedSiteId={focusedSiteId}
        />
        <RecentTraceReveal sites={revealRecentSites} showLabel={!dossierSite} />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,transparent_42%,rgba(0,0,0,0.3)_100%),linear-gradient(180deg,rgba(0,0,0,0.07),transparent_30%,rgba(0,0,0,0.4))]"
          style={{
            background: scene === 'galaxy'
              ? 'radial-gradient(circle at 50% 48%, transparent 58%, rgba(0,0,0,0.18) 100%), linear-gradient(180deg, rgba(0,0,0,0.025), transparent 36%, rgba(0,0,0,0.24))'
              : scene === 'stellar'
                ? 'radial-gradient(circle at 50% 45%, transparent 48%, rgba(0,0,0,0.24) 100%), linear-gradient(180deg, rgba(0,0,0,0.04), transparent 32%, rgba(0,0,0,0.32))'
                : undefined,
          }}
          aria-hidden="true"
        />
        <div
          className={`pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(130,221,255,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(130,221,255,0.09)_1px,transparent_1px)] bg-[size:54px_54px] mix-blend-screen transition-opacity duration-200 ${
            scanActive ? 'opacity-[0.22]' : 'opacity-0'
          }`}
          aria-hidden="true"
        />
        <CivilizationCommandFrame
          palette={palette}
          scanActive={scanActive}
          scene={scene}
          traceCount={traceCount}
        />
        {scanActive && (
          <>
            <ScanTraceFields
              sites={visibleSites}
              selectedSiteId={selectedSiteId}
              focusedSiteId={focusedSiteId}
              recentSiteIds={recentSiteIds}
            />
            {isCivilizationSiteOperational(focusedSite) && (
              <FocusedDeploymentProjectionLayer
                site={focusedSite}
                scene={scene}
                selected={Boolean(dossierSite)}
                recent={Boolean(focusedSite && recentSiteIds.includes(focusedSite.id))}
                compactFocus={compactScanLayout && selectedScanPresentationActive}
              />
            )}
            <ScanFocusLayer
              site={focusedSite}
              selected={Boolean(dossierSite)}
              recent={Boolean(focusedSite && recentSiteIds.includes(focusedSite.id))}
            />
            <ScanMapPins
              sites={visibleSites}
              selectedSiteId={selectedSiteId}
              focusedSiteId={focusedSiteId}
              recentSiteIds={recentSiteIds}
              onSelect={focusScanSite}
            />
            {compactScanLayout && !selectedSite && (
              <MobileInfluenceRail
                sites={visibleSites}
                selectedSiteId={selectedSiteId}
                overflowCount={overflowCount}
                recentSiteIds={recentSiteIds}
                onSelect={focusScanSite}
              />
            )}
            {compactScanLayout && !selectedSite && (
              <MobileScanPrimaryReadout
                site={focusedSite}
                isRecent={Boolean(focusedSite && recentSiteIds.includes(focusedSite.id))}
                onSelect={focusScanSite}
              />
            )}
            {!compactScanLayout && !dossierSite && (
              <CivilizationScanScaleContext
                sites={scaleContextSites}
                focusSite={focusedSite}
                currentScene={scene}
                recentSiteIds={recentSiteIds}
                limit={3}
                onSelect={focusScanSite}
                onFocusNative={(site) => {
                  setSelectedSiteId(site.id);
                  setSceneOverride(getNativeSceneForSite(site));
                  setScanActive(true);
                }}
              />
            )}
          </>
        )}
        {!scanActive && childScene && (
          <CivilizationZoomHotspot
            scene={scene}
            childScene={childScene}
            palette={palette}
            highlight={Boolean(recentZoomHint)}
            hintLabel={recentZoomHint ?? undefined}
            compact={compactScanLayout}
            onZoom={setSceneOverride}
          />
        )}

        {!scanActive && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 z-30 grid gap-2 text-white drop-shadow-[0_1px_12px_rgba(0,0,0,0.82)] sm:grid-cols-[minmax(0,1fr)_minmax(240px,0.62fr)] sm:items-end">
            <div className="max-w-2xl">
              <strong className="block text-sm font-medium text-white/94">{sceneCopy.title}</strong>
              <span className="mt-1 block text-[12px] leading-relaxed text-white/74 max-sm:line-clamp-2">
                {sceneCopy.copy}
              </span>
            </div>
            <CivilizationSceneDeploymentLedger
              sites={sceneSites}
              recentSiteIds={recentSiteIds}
              limit={compactScanLayout ? 2 : 3}
              compact={compactScanLayout}
              onSelect={focusScanSite}
            />
          </div>
        )}

        {dossierSite && (
          <SiteDossier
            site={dossierSite}
            forgedArtifacts={forgedArtifacts}
            currentScene={scene}
            preferredSide={dossierPreferredSide}
            onZoomToNative={(nativeScene) => {
              setSelectedSiteId(dossierSite.id);
              setSceneOverride(nativeScene);
              setScanActive(true);
            }}
            onOpenArtifact={onOpenArtifact}
            onClose={() => {
              if (selectedSite) {
                setSelectedSiteId(null);
                return;
              }
              setScanActive(false);
            }}
            isRecent={recentSiteIds.includes(dossierSite.id)}
          />
        )}
      </div>
      {scanActive && !dossierSite && (
        <div
          className="hidden border-t border-white/10 bg-[#050914]/88 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:block"
          data-testid="civilization-desktop-scan-rail"
        >
          <InfluenceTray
            sites={visibleSites}
            selectedSiteId={selectedSiteId}
            overflowCount={overflowCount}
            clusterGroups={clusterGroups}
            recentSiteIds={recentSiteIds}
            onSelect={focusScanSite}
          />
        </div>
      )}
    </section>
  );
}
