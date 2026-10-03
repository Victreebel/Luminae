import React from 'react';
import { Check, ChevronRight, FileText, Layers3, ScanLine, Wrench, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { ArtifactCard, CivilizationPublicState } from '@workspace/api-client-react';
import {
  CIVILIZATION_DISTRICT_IDENTITY_POLICY_ID,
  CIVILIZATION_DYAD_DEFINITIONS,
  createCivilizationEnvironmentIdentity,
  getCivilizationCapabilityDefinition,
} from '@workspace/game-types';
import type {
  ArtifactPlacementFamily,
  CivilizationCoreCondition,
  CivilizationDyadId,
  CivilizationEnvironmentVariantId,
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
} from '@/lib/civilizationVisualSignatures';
import {
  deriveCivilizationArchetype,
  type CivilizationArchetypeId,
} from '@/lib/civilizationArchetypes';
import { getArtifactArtworkScalePolicy } from '@/lib/civilizationArtworkScale';
import {
  getCivilizationEnvironmentDressing,
  getCivilizationEnvironmentPlateArtSlot,
  getCivilizationPlateArtSlot,
  getCivilizationSiteArtSlot,
} from '@/lib/civilizationArtRegistry';
import { AFFINITY_META } from '@/lib/affinityMeta';
import { useIsMobile } from '@/hooks/use-mobile';
import { CARD_RUNTIME_ART } from '@/lib/cardArtManifest';
import { CivilizationHistoryRibbon } from '@/components/CivilizationHistoryRibbon';
import { ArtifactFunctionTags } from '@/components/ArtifactFunctionTags';
import { CivilizationDistrictReadout } from '@/components/CivilizationDistrictReadout';
import {
  buildCivilizationArtifactWorldAnchors,
  CivilizationArtifactManifestationLayer,
  type CivilizationArtifactWorldAnchor,
} from '@/components/CivilizationArtifactManifestationLayer';
import { CivilizationLivingWorldLayer } from '@/components/CivilizationLivingWorldLayer';
import {
  buildCivilizationBlueprintWorldAnchors,
  CivilizationBlueprintManifestationLayer,
  getCivilizationBlueprintManifestationArt,
} from '@/components/CivilizationBlueprintManifestationLayer';
import {
  CivilizationIdentityContinuityLayer,
  type CivilizationDistrictAffinityAccent,
} from '@/components/CivilizationIdentityContinuityLayer';
import {
  CivilizationMaturityCinematic,
  CivilizationMorphologyStyles,
  CivilizationScaleTransition,
} from '@/components/CivilizationMorphologyLayer';
import {
  deriveCivilizationVisualState,
  type CivilizationCityDevelopmentStage,
  type CivilizationComplexityStage,
  type CivilizationSceneKind,
  type CivilizationSettlementPhase,
  type CivilizationVisualIdentity,
  type CivilizationVisualState,
} from '@/lib/civilizationVisualState';
import {
  getCivilizationSurfaceBuildableZones,
} from '@/lib/civilizationEnvironmentSockets';
import {
  CHRYSALIS_SURFACE_DISTRICT_PARCELS,
  type CivilizationSurfaceDistrictParcel,
} from '@/lib/civilizationSurfaceDistrictPlan';
import { useCivilizationViewportFit } from '@/hooks/use-civilization-viewport-fit';

interface CivilizationScenePanelProps {
  tier: KardashevTier;
  palette: AffinityPalette;
  profile: CivilizationProfile;
  progressFraction: number;
  paused: boolean;
  civilizationName?: string;
  permanentAffinities?: React.ReactNode;
  presentationMode?: boolean;
  fitViewport?: boolean;
  defaultScanActive?: boolean;
  defaultScene?: MarketSceneKind;
  showAllArtifactPins?: boolean;
  placementProof?: boolean;
  deploymentSites: readonly CivilizationDeploymentSite[];
  forgedArtifacts: readonly ArtifactCard[];
  civilization?: CivilizationPublicState | null;
  environmentIdentity?: CivilizationPublicState['environmentIdentity'];
  guidanceEnabled?: boolean;
  stabilityBand?: CivilizationStabilityBand;
  activeConditions?: readonly CivilizationCoreCondition[];
  externalRecentSiteIds?: readonly string[];
  artifactRenderingIds?: Readonly<Record<string, string>>;
  pendingRepairArtifactIds?: readonly string[];
  onRecentSiteIdsSeen?: (siteIds: readonly string[]) => void;
  onRepairArtifacts?: (artifactIds: readonly string[]) => void | Promise<void>;
  onOpenArtifact: (card: ArtifactCard) => void;
}

const DISTRICT_PROOF_DEPTH_TONES = {
  distance: '#82ddff',
  midground: '#c8a8ff',
  foreground: '#ffb76d',
} as const;

function getDistrictProofLabel(parcel: CivilizationSurfaceDistrictParcel): string {
  return parcel.family
    .split('_')
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function CivilizationDistrictPlacementProof({
  compact,
  environmentVariantId,
  occupancyCounts,
}: {
  compact: boolean;
  environmentVariantId: CivilizationEnvironmentVariantId;
  occupancyCounts: Readonly<Record<string, number>>;
}) {
  const zones = getCivilizationSurfaceBuildableZones(environmentVariantId, compact);
  const parcelsById = React.useMemo(() => new Map(
    CHRYSALIS_SURFACE_DISTRICT_PARCELS.map((parcel) => [parcel.id, parcel]),
  ), []);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[16] overflow-hidden"
      data-testid="civilization-district-placement-proof"
      data-environment-variant={environmentVariantId}
      data-layout-mode="district-first-saturated-proof"
      aria-hidden="true"
    >
      {zones.map((zone, index) => {
        const parcel = parcelsById.get(zone.id);
        if (!parcel) return null;
        const tone = DISTRICT_PROOF_DEPTH_TONES[zone.depth];
        const width = zone.maxX - zone.minX;
        const height = zone.maxY - zone.minY;
        const occupancy = occupancyCounts[parcel.id] ?? 0;
        return (
          <span
            key={zone.id}
            className="absolute block border"
            style={{
              left: `${zone.minX}%`,
              top: `${zone.minY}%`,
              width: `${width}%`,
              height: `${height}%`,
              borderColor: `${tone}B8`,
              background: `linear-gradient(180deg, transparent 18%, ${tone}0D 72%, ${tone}1C)`,
              boxShadow: `inset 0 0 0 1px rgba(0,0,0,0.42), 0 0 9px ${tone}28`,
              clipPath: 'polygon(8% 0, 92% 0, 100% 16%, 96% 100%, 4% 100%, 0 16%)',
            }}
            data-testid="civilization-district-socket-envelope"
            data-parcel-id={parcel.id}
            data-district-family={parcel.family}
            data-depth={parcel.depth}
            data-capacity={parcel.capacity}
            data-occupancy={occupancy}
          >
            <span
              className="absolute bottom-[3%] left-[7%] right-[7%] h-[24%] rounded-[50%] border"
              style={{
                borderColor: `${tone}78`,
                background: `radial-gradient(ellipse, ${tone}22, transparent 72%)`,
              }}
              data-testid="civilization-district-foundation-envelope"
            />
            <span
              className="absolute bottom-1 left-1 max-w-[calc(100%-8px)] truncate bg-[#020711]/88 px-1 py-0.5 text-[6px] font-black uppercase text-white shadow-[0_1px_4px_rgba(0,0,0,0.9)] sm:text-[7px]"
              style={{ color: tone }}
            >
              {String(index + 1).padStart(2, '0')} {getDistrictProofLabel(parcel)} // {occupancy}/{parcel.capacity}
            </span>
          </span>
        );
      })}
      <span className="absolute left-2 top-2 border border-[#82ddff]/55 bg-[#020711]/90 px-2 py-1 text-[7px] font-black uppercase tracking-[0.14em] text-[#dff7ff] shadow-[0_4px_14px_rgba(0,0,0,0.55)] sm:text-[8px]">
        Placement proof // {zones.length} protected district sites
      </span>
    </div>
  );
}

const CIVILIZATION_STABILITY_LABELS: Record<CivilizationStabilityBand, string> = {
  stable: 'Stable',
  strained: 'Strained',
  unstable: 'Unstable',
  crisis: 'Crisis',
};

const FALLBACK_CIVILIZATION_ENVIRONMENT = createCivilizationEnvironmentIdentity(
  'civilization-neutral-fallback',
  'aurora_basin',
);

function getCivilizationScenePalette(
  identity: CivilizationVisualIdentity,
  fallback: AffinityPalette,
): AffinityPalette {
  return {
    primary: identity.primaryTone ?? fallback.primary,
    secondary: identity.secondaryTone ?? fallback.secondary,
    accent: identity.primaryAffinity
      ? AFFINITY_META[identity.primaryAffinity].glowHex
      : fallback.accent,
  };
}

function getCivilizationSceneTitle(identity: CivilizationVisualIdentity): string {
  if (identity.status === 'committed' && identity.dyad) {
    const dyad = CIVILIZATION_DYAD_DEFINITIONS.find((definition) => definition.id === identity.dyad);
    return `${dyad?.name ?? identity.label.replace(' Dyad', '')} Civilization`;
  }
  if (identity.status === 'forming') {
    return `${identity.layer ? `${identity.layer.charAt(0).toUpperCase()}${identity.layer.slice(1)} ` : ''}Identity Forming`;
  }
  return 'Unformed Civilization';
}

const CIVILIZATION_SYSTEM_STATE_STYLES = `
  .civ-state-smoke {
    width: 18px;
    height: 40px;
    border-radius: 48% 52% 42% 58%;
    background: rgba(70, 76, 84, 0.82);
    box-shadow: 9px -11px 0 -2px rgba(96, 101, 109, 0.62), -7px -21px 0 -3px rgba(44, 48, 54, 0.58);
    filter: blur(2.6px);
    transform-origin: 50% 100%;
    animation: civ-state-smoke 5.8s ease-in-out infinite;
  }
  .civ-state-fault {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(255, 158, 82, 0.92);
    box-shadow: 0 0 5px rgba(255, 126, 62, 0.9), 7px -5px 0 -2px rgba(255, 213, 137, 0.72);
    animation: civ-state-fault 2.6s steps(4, end) infinite;
  }
  .civ-state-beacon {
    width: 14px;
    height: 14px;
    border: 1px solid rgba(238, 184, 91, 0.86);
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(238, 184, 91, 0.5), inset 0 0 4px rgba(238, 184, 91, 0.42);
    animation: civ-state-beacon 3.2s ease-in-out infinite;
  }
  .civ-state-disruption {
    width: 28px;
    height: 3px;
    border-radius: 1px;
    background: rgba(170, 118, 255, 0.72);
    box-shadow: 8px 6px 0 -0.5px rgba(255, 148, 103, 0.72), -7px -6px 0 -0.5px rgba(170, 118, 255, 0.68), 14px -2px 0 -1px rgba(235,224,255,0.72);
    animation: civ-state-disruption 2.8s steps(5, end) infinite;
  }
  .civ-state-blackout {
    width: 7px;
    height: 3px;
    border-radius: 1px;
    background: rgba(255, 91, 67, 0.78);
    box-shadow: 10px 1px 0 -0.5px rgba(255, 91, 67, 0.62), -9px 2px 0 -0.5px rgba(255, 164, 103, 0.48), 0 0 5px rgba(255, 91, 67, 0.42);
    animation: civ-state-blackout 4.4s steps(2, end) infinite;
  }
  @keyframes civ-state-smoke {
    0%, 100% { transform: translate3d(0, 0, 0) scale(0.86); opacity: 0.66; }
    50% { transform: translate3d(3px, -10px, 0) scale(1.08); opacity: 0.88; }
  }
  @keyframes civ-state-fault {
    0%, 100% { transform: scale(0.72); opacity: 0.28; }
    35% { transform: scale(1.16); opacity: 0.94; }
    58% { transform: scale(0.9); opacity: 0.44; }
  }
  @keyframes civ-state-beacon {
    0%, 100% { transform: scale(0.84); opacity: 0.48; }
    50% { transform: scale(1.22); opacity: 0.94; }
  }
  @keyframes civ-state-disruption {
    0%, 100% { transform: translate3d(-2px, 0, 0) rotate(-12deg); opacity: 0.24; }
    45% { transform: translate3d(2px, -2px, 0) rotate(9deg); opacity: 0.9; }
  }
  @keyframes civ-state-blackout {
    0%, 72%, 100% { opacity: 0.34; }
    76%, 88% { opacity: 0.9; }
  }
  [data-civilization-motion="paused"] .civ-state-signal,
  [data-civilization-visibility="offscreen"] .civ-state-signal {
    animation-play-state: paused !important;
  }
  @media (prefers-reduced-motion: reduce) {
    .civ-state-signal { animation: none !important; opacity: 0.68; }
  }
`;

const CIVILIZATION_STATE_ANCHORS: Record<MarketSceneKind, readonly { x: number; y: number }[]> = {
  surface: [{ x: 29, y: 76 }, { x: 68, y: 69 }, { x: 82, y: 79 }],
  orbit: [{ x: 34, y: 64 }, { x: 69, y: 42 }, { x: 78, y: 69 }],
  stellar: [{ x: 31, y: 63 }, { x: 66, y: 44 }, { x: 79, y: 67 }],
  galaxy: [{ x: 27, y: 68 }, { x: 61, y: 47 }, { x: 78, y: 70 }],
};

function CivilizationSystemStateLayer({
  scene,
  stabilityBand,
  activeConditions,
}: {
  scene: MarketSceneKind;
  stabilityBand: CivilizationStabilityBand;
  activeConditions: readonly CivilizationCoreCondition[];
}) {
  const conditions = new Set(activeConditions);
  const anchors = CIVILIZATION_STATE_ANCHORS[scene];
  const faultCount = stabilityBand === 'crisis' ? 3 : stabilityBand === 'unstable' ? 2 : stabilityBand === 'strained' ? 1 : 0;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[18] overflow-hidden"
      data-testid="civilization-system-state"
      data-stability={stabilityBand}
      data-conditions={activeConditions.join(',') || 'none'}
      data-state-composition="localized-physical"
      aria-hidden="true"
    >
      <style>{CIVILIZATION_SYSTEM_STATE_STYLES}</style>
      {Array.from({ length: faultCount }, (_, index) => (
        <span
          key={`fault:${index}`}
          className="civ-state-signal civ-state-fault absolute"
          style={{ left: `${anchors[index]!.x}%`, top: `${anchors[index]!.y}%` }}
          data-state-treatment="power-fault"
        />
      ))}
      {conditions.has('damaged') && anchors.map((anchor, index) => (
        <React.Fragment key={`damage:${index}`}>
          <span
            className="civ-state-signal civ-state-smoke absolute"
            style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
            data-state-treatment="structural-damage"
          />
          <span
            className="civ-state-signal civ-state-fault absolute"
            style={{ left: `${anchor.x + 0.6}%`, top: `${anchor.y + 2}%` }}
            data-state-treatment="damage-ember"
          />
        </React.Fragment>
      ))}
      {conditions.has('isolated') && anchors.map((anchor, index) => (
        <span
          key={`isolation:${index}`}
          className="civ-state-signal civ-state-blackout absolute"
          style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
          data-state-treatment="operational-blackout"
        />
      ))}
      {conditions.has('quarantined') && anchors.map((anchor, index) => (
        <span
          key={`quarantine:${index}`}
          className="civ-state-signal civ-state-beacon absolute"
          style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
          data-state-treatment="quarantine-beacon"
        />
      ))}
      {conditions.has('disrupted') && anchors.map((anchor, index) => (
        <span
          key={`disruption:${index}`}
          className="civ-state-signal civ-state-disruption absolute"
          style={{ left: `${anchor.x}%`, top: `${anchor.y}%` }}
          data-state-treatment="power-disruption"
        />
      ))}
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
  civilization?: CivilizationPublicState | null;
  recentSiteIds?: readonly string[];
  showRecentCard?: boolean;
  presentation?: 'standard' | 'thumbnail';
  className?: string;
}

type MarketSceneKind = 'surface' | 'orbit' | 'stellar' | 'galaxy';
type CivilizationImpactKind = 'artifact' | 'blueprint' | 'luminary' | 'protocol' | 'chronicle';

const RECENT_TRACE_VISIBLE_MS = 6500;

function useDocumentVisible(): boolean {
  const [visible, setVisible] = React.useState(() => (
    typeof document === 'undefined' || document.visibilityState !== 'hidden'
  ));

  React.useEffect(() => {
    const handleVisibilityChange = () => setVisible(document.visibilityState !== 'hidden');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return visible;
}

function useElementInViewport<T extends Element>(ref: React.RefObject<T | null>): boolean {
  const [inViewport, setInViewport] = React.useState(true);

  React.useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      setInViewport(Boolean(entry?.isIntersecting));
    }, { rootMargin: '120px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);

  return inViewport;
}

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

function CivilizationImpactBadgeContent({
  kind,
  className = 'h-2.5 w-2.5',
}: {
  kind: CivilizationImpactKind;
  className?: string;
}) {
  if (kind === 'blueprint') {
    return (
      <FileText
        className={className}
        aria-hidden="true"
        data-testid="civilization-blueprint-paper-symbol"
      />
    );
  }
  return <>{getCivilizationImpactBadge(kind)}</>;
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

function getReachRootScene(
  tier: KardashevTier,
  deploymentSites: readonly CivilizationDeploymentSite[] = [],
): MarketSceneKind {
  return deploymentSites.reduce<MarketSceneKind>((currentRoot, site) => {
    const nativeScene = getNativeSceneForSite(site);
    return getSceneIndex(nativeScene) > getSceneIndex(currentRoot)
      ? nativeScene
      : currentRoot;
  }, getRootSceneKind(tier));
}

function getAvailableScenePath(
  tier: KardashevTier,
  deploymentSites: readonly CivilizationDeploymentSite[] = [],
): MarketSceneKind[] {
  const rootIndex = getSceneIndex(getReachRootScene(tier, deploymentSites));
  return SCENE_ORDER
    .filter((scene) => getSceneIndex(scene) <= rootIndex)
    .reverse();
}

function normalizeSceneForTier(
  scene: MarketSceneKind | undefined | null,
  tier: KardashevTier,
  deploymentSites: readonly CivilizationDeploymentSite[] = [],
): MarketSceneKind {
  const rootScene = getReachRootScene(tier, deploymentSites);
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
  if (defaultScene) return normalizeSceneForTier(defaultScene, tier, deploymentSites);

  const rootScene = getRootSceneKind(tier);
  if (!defaultScanActive) return rootScene;

  const hasSurfaceNativeWork = deploymentSites.some((site) => getNativeSceneForSite(site) === 'surface');
  if (tier === 1 && hasSurfaceNativeWork) return 'surface';

  return rootScene;
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

function getBlueprintManifestationScaleLabel(
  manifestationScale: NonNullable<CivilizationDeploymentSite['blueprintManifestationScale']>,
): string {
  const labels: Record<
    NonNullable<CivilizationDeploymentSite['blueprintManifestationScale']>,
    string
  > = {
    installation: 'Installation-scale',
    satellite: 'Satellite-scale',
    planetary: 'Planetary-scale',
    stellar: 'Stellar-scale',
    distributed: 'Distributed',
  };
  return labels[manifestationScale];
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

function shouldRenderDominantBlueprint(site: CivilizationDeploymentSite, scene: MarketSceneKind): boolean {
  if (site.kind !== 'blueprint') return false;
  return getSceneIndex(scene) >= getSceneIndex(getNativeSceneForSite(site));
}

function isSiteAvailableInScene(site: CivilizationDeploymentSite, scene: MarketSceneKind): boolean {
  if (site.kind === 'artifact' && site.artifactManifestation) {
    return Boolean(site.artifactManifestation.visibilityByCameraScale[scene]);
  }
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
  if (site.kind === 'blueprint' && site.blueprintManifestationScale) {
    return `${getSiteKindLabel(site)} // ${getBlueprintManifestationScaleLabel(site.blueprintManifestationScale)} / ${getCivilizationScaleLabel(site.scaleBand)} theater`;
  }
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
  if (site.kind === 'blueprint' && site.blueprintManifestationScale) {
    return getBlueprintManifestationScaleLabel(site.blueprintManifestationScale);
  }
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
  if (site.kind === 'blueprint' && site.blueprintManifestationScale) {
    return `${getBlueprintManifestationScaleLabel(site.blueprintManifestationScale)} manifestation / ${getCivilizationScaleLabel(site.scaleBand)} theater // ${site.visibleAs}`;
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

function applyCanonicalAffinityIdentity(
  identity: CivilizationSceneIdentity,
  primaryAffinity: CivilizationSceneIdentity['primaryAffinity'],
  secondaryAffinity: CivilizationSceneIdentity['secondaryAffinity'],
): CivilizationSceneIdentity {
  return {
    ...identity,
    primaryAffinity,
    secondaryAffinity,
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
    if (site.blueprintManifestationScale) {
      return `The Blueprint manifests as a ${getBlueprintManifestationScaleLabel(site.blueprintManifestationScale).toLowerCase()} project within its ${getCivilizationScaleLabel(site.scaleBand).toLowerCase()} theater. Its wider civilization consequence is ${site.visibleAs}.`;
    }
    return `The Blueprint manifests within its ${getCivilizationScaleLabel(site.scaleBand).toLowerCase()} theater. Its wider civilization consequence is ${site.visibleAs}.`;
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
    return site.blueprintManifestationScale
      ? `The physical project is shown at ${getBlueprintManifestationScaleLabel(site.blueprintManifestationScale).toLowerCase()} size while its lasting consequence remains visible across the ${getCivilizationScaleLabel(site.scaleBand).toLowerCase()} theater.`
      : 'The physical project and its lasting civilization consequence remain visible at their authored scale.';
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

        @keyframes civArtifactIdentityGlow {
          0%, 100% { opacity: 0.72; }
          50% { opacity: 1; }
        }

        @keyframes civMapRing {
          0% { transform: translateX(-50%) scale(0.62); opacity: 0.7; }
          100% { transform: translateX(-50%) scale(1.65); opacity: 0; }
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

        @keyframes civIdentityMetamorphosis {
          0% { opacity: 0; transform: scale(0.92); }
          18% { opacity: 0.58; }
          62% { opacity: 0.34; transform: scale(1.04); }
          100% { opacity: 0; transform: scale(1.12); }
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
        .civ-artifact-identity-glow { animation: civArtifactIdentityGlow 2.8s ease-in-out infinite; }
        .civ-portrait-flow { stroke-dasharray: 12 14; animation: civPortraitSweep 11s linear infinite; }
        .civ-portrait-haze { animation: civPortraitHaze 14s ease-in-out infinite; will-change: transform, opacity; }
        .civ-portrait-mark { filter: drop-shadow(0 0 10px currentColor); }
        .civ-environment-signature { filter: drop-shadow(0 0 14px currentColor); }
        .civ-signature-atmosphere { animation: civIdentityWeather 17s ease-in-out infinite; will-change: transform, opacity; }
        .civ-identity-weather { animation: civIdentityWeather 16s ease-in-out infinite; will-change: transform, opacity; }
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
          border: 1px solid var(--pin-color);
          border-radius: 9999px;
          bottom: -0.08rem;
          content: '';
          height: 1rem;
          left: 50%;
          opacity: 0;
          pointer-events: none;
          position: absolute;
          transform: translateX(-50%) scale(0.72);
          width: 2.6rem;
        }
        .civ-map-pin[data-pin-state="selected"]::before,
        .civ-map-pin[data-pin-state="focused"]::before {
          animation: civMapRing 2.8s ease-out infinite;
          opacity: 0.42;
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
        [data-civilization-motion="paused"] .civ-artifact-identity-glow,
        [data-civilization-motion="paused"] .civ-portrait-flow,
        [data-civilization-motion="paused"] .civ-portrait-haze,
        [data-civilization-motion="paused"] .civ-signature-atmosphere,
        [data-civilization-motion="paused"] .civ-identity-weather,
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

        .civilization-scene-panel {
          container-type: inline-size;
        }

        @container (min-width: 760px) {
          .civilization-scene-header {
            align-items: center;
            flex-direction: row;
            gap: 0.75rem;
            justify-content: space-between;
          }

          .civilization-scene-scale-path {
            justify-content: flex-end;
          }
        }

        .civilization-scene-canvas {
          contain: layout paint style;
          isolation: isolate;
        }

        @media (max-width: 639px) {
          [data-civilization-performance="mobile"] .civ-market-pulse,
          [data-civilization-performance="mobile"] .civ-market-drift,
          [data-civilization-performance="mobile"] .civ-market-breathe,
          [data-civilization-performance="mobile"] .civ-market-flow,
          [data-civilization-performance="mobile"] .civ-map-pin-core,
          [data-civilization-performance="mobile"] .civ-artifact-identity-glow,
          [data-civilization-performance="mobile"] .civ-portrait-flow,
          [data-civilization-performance="mobile"] .civ-portrait-haze,
          [data-civilization-performance="mobile"] .civ-signature-atmosphere,
          [data-civilization-performance="mobile"] .civ-identity-weather,
          [data-civilization-performance="mobile"] .civ-artifact-substructure,
          [data-civilization-performance="mobile"] .civ-artifact-substructure-flow,
          [data-civilization-performance="mobile"] .civ-artifact-deployment,
          [data-civilization-performance="mobile"] .civ-artifact-deployment-flow,
          [data-civilization-performance="mobile"] .civ-focused-projection,
          [data-civilization-performance="mobile"] .civ-focused-projection-local-site,
          [data-civilization-performance="mobile"] .civ-integrated-consequence,
          [data-civilization-performance="mobile"] .civ-evolved-plate-flow,
          [data-civilization-performance="mobile"] .civ-evolved-plate-weather,
          [data-civilization-performance="mobile"] .civ-archetype-composition,
          [data-civilization-performance="mobile"] .civ-archetype-flow,
          [data-civilization-performance="mobile"] .civ-plate-dialect-flow,
          [data-civilization-performance="mobile"] .civ-dialect-field,
          [data-civilization-performance="mobile"] .civ-dialect-flow,
          [data-civilization-performance="mobile"] .civ-native-work,
          [data-civilization-performance="mobile"] .civ-native-work-flow,
          [data-civilization-performance="mobile"] .civ-materialized-site,
          [data-civilization-performance="mobile"] .civ-depth-pulse,
          [data-civilization-performance="mobile"] .civ-depth-flow,
          [data-civilization-performance="mobile"] .civ-scale-theater-mark,
          [data-civilization-performance="mobile"] .civ-scale-theater-flow,
          [data-civilization-performance="mobile"] .civ-command-frame-flow,
          [data-civilization-performance="mobile"] .civ-command-frame-beacon,
          [data-testid="civilization-miniature-scene"] .civ-market-pulse,
          [data-testid="civilization-miniature-scene"] .civ-market-drift,
          [data-testid="civilization-miniature-scene"] .civ-market-breathe,
          [data-testid="civilization-miniature-scene"] .civ-market-flow,
          [data-testid="civilization-miniature-scene"] .civ-portrait-haze,
          [data-testid="civilization-miniature-scene"] .civ-signature-atmosphere,
          [data-testid="civilization-miniature-scene"] .civ-identity-weather,
          [data-testid="civilization-miniature-scene"] .civ-archetype-composition,
          [data-testid="civilization-miniature-scene"] .civ-archetype-flow {
            animation: none !important;
            will-change: auto !important;
          }

          [data-civilization-performance="mobile"] .civ-map-pin::before {
            animation: none !important;
          }

          [data-civilization-performance="mobile"] .civ-portrait-mark,
          [data-civilization-performance="mobile"] .civ-environment-signature,
          [data-civilization-performance="mobile"] .civ-artifact-substructure,
          [data-civilization-performance="mobile"] .civ-artifact-deployment,
          [data-civilization-performance="mobile"] .civ-focused-projection,
          [data-civilization-performance="mobile"] .civ-integrated-consequence,
          [data-civilization-performance="mobile"] .civ-archetype-composition,
          [data-civilization-performance="mobile"] .civ-native-work,
          [data-civilization-performance="mobile"] .civ-materialized-site,
          [data-civilization-performance="mobile"] .civ-depth-composition,
          [data-civilization-performance="mobile"] .civ-scale-theater-mark {
            filter: none !important;
          }

          .civilization-scene-header {
            backdrop-filter: none !important;
          }
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
          .civ-artifact-identity-glow,
          .civ-portrait-flow,
          .civ-portrait-haze,
          .civ-environment-signature,
          .civ-signature-atmosphere,
          .civ-identity-weather,
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

export function MarketCivilizationScene({
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
  signals,
  archetype,
  dyad,
  environmentIdentity,
  evolutionStage = 0,
  civilizationMaturity = 'planetary',
  settlementPhase = 'wilderness',
  cityDevelopmentStage = 0,
  scanActive = false,
  compact = false,
}: {
  scene: MarketSceneKind;
  signals?: CivilizationSceneSignals;
  archetype?: CivilizationArchetypeId | null;
  dyad?: CivilizationDyadId | null;
  environmentIdentity?: CivilizationPublicState['environmentIdentity'];
  evolutionStage?: CivilizationComplexityStage;
  civilizationMaturity?: CivilizationVisualState['historicalMaturity'];
  settlementPhase?: CivilizationSettlementPhase;
  cityDevelopmentStage?: CivilizationCityDevelopmentStage;
  scanActive?: boolean;
  compact?: boolean;
}) {
  const plate = environmentIdentity
    ? getCivilizationEnvironmentPlateArtSlot(
        scene,
        scanActive,
        environmentIdentity,
        evolutionStage,
        civilizationMaturity,
        settlementPhase,
        dyad ?? null,
        cityDevelopmentStage,
      )
    : getCivilizationPlateArtSlot(
        scene,
        scanActive,
        archetype,
        dyad,
        evolutionStage,
        civilizationMaturity,
      );
  const environmentDressing = environmentIdentity && scene === 'surface'
    ? getCivilizationEnvironmentDressing(environmentIdentity.variantId)
    : null;
  const plateFilter = environmentDressing
    ? `${plate.contrast} ${environmentDressing.artFilter}`
    : plate.contrast;
  // Scan annotates the portrait; it never reframes the physical world beneath
  // its sockets, manifestations, or Blueprint devices.
  const scale = plate.cinematicScale;
  const plateFocus = environmentIdentity && scene === 'surface'
    ? { key: 'authored-masterplan', x: 0, y: 0 }
    : getPlateStateFocus(scene, signals);
  const atlasBackgroundPosition = plate.atlasCell
    ? `${plate.atlasCell.columns <= 1 ? 50 : (plate.atlasCell.column / (plate.atlasCell.columns - 1)) * 100}% ${
        plate.atlasCell.rows <= 1 ? 50 : 15 + (plate.atlasCell.row / (plate.atlasCell.rows - 1)) * 70
      }%`
    : null;
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
  const artSubstrate = cityDevelopmentStage > 0 || settlementPhase !== 'wilderness'
    ? 'inhabited-growth'
    : 'natural-world';
  return (
    <>
      {plate.atlasCell ? (
        <div
          className="absolute inset-0 block h-full w-full overflow-hidden"
          data-testid="civilization-plate-picture"
        >
          <div
            aria-hidden="true"
            data-testid="civilization-plate-art"
            data-art-slot={plate.id}
            data-art-resolution={plate.resolution}
            data-art-substrate={artSubstrate}
            data-atlas-cell={`${plate.atlasCell.column},${plate.atlasCell.row}`}
            data-plate-focus={plateFocus.key}
            data-dyad={dyad ?? undefined}
            data-environment-variant={environmentIdentity?.variantId}
            data-construction-plan={plate.constructionPlanId}
            data-evolution-stage={plate.evolutionStage}
            data-civilization-maturity={plate.civilizationMaturity}
            data-scan-geometry="invariant"
            className="h-full w-full bg-no-repeat transition-[filter,transform] duration-500"
            style={{
              backgroundImage: `url(${plate.src})`,
              backgroundPosition: atlasBackgroundPosition ?? '50% 50%',
              backgroundSize: `${plate.atlasCell.columns * 100}% auto`,
              filter: plateFilter,
              transform: `translate3d(${plateFocus.x}%, ${plateFocus.y}%, 0) scale(${scale})`,
              transformOrigin: plate.transformOrigin,
            }}
          />
        </div>
      ) : (
        <picture
          className="absolute inset-0 block h-full w-full"
          data-testid="civilization-plate-picture"
          data-plate-layout={compact ? 'portrait' : 'landscape'}
        >
          <img
            src={compact && plate.mobileSrc ? plate.mobileSrc : plate.src}
            alt=""
            aria-hidden="true"
            data-testid="civilization-plate-art"
            data-art-slot={plate.id}
            data-art-resolution={plate.resolution}
            data-art-substrate={artSubstrate}
            data-plate-focus={plateFocus.key}
            data-dyad={dyad ?? undefined}
            data-environment-variant={environmentIdentity?.variantId}
            data-construction-plan={plate.constructionPlanId}
            data-evolution-stage={plate.evolutionStage}
            data-civilization-maturity={plate.civilizationMaturity}
            data-scan-geometry="invariant"
            className="h-full w-full object-cover transition-[filter,transform] duration-500"
            style={{
              filter: plateFilter,
              objectPosition: plate.position,
              transform: `translate3d(${plateFocus.x}%, ${plateFocus.y}%, 0) scale(${scale})`,
              transformOrigin: plate.transformOrigin,
            }}
            decoding="async"
            fetchPriority="high"
            draggable={false}
          />
        </picture>
      )}
      {environmentDressing && (
        <div
          className="pointer-events-none absolute inset-0"
          data-testid="civilization-environment-dressing"
          data-environment-dressing={environmentDressing.id}
          data-construction-plan={plate.constructionPlanId}
          style={{
            background: environmentDressing.surfaceAtmosphere,
            mixBlendMode: 'color',
          }}
          aria-hidden="true"
        />
      )}
      {scanActive && plate.evolutionStage !== undefined && (
        <div
          className="pointer-events-none absolute inset-0"
          data-testid="civilization-plate-evolution-veil"
          data-evolution-stage={plate.evolutionStage}
          data-evolution-label={plate.evolutionLabel}
          data-civilization-maturity={plate.civilizationMaturity}
          style={{
            background: 'rgba(2,5,11,0.1)',
          }}
          aria-hidden="true"
        />
      )}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: scanActive ? `${verticalVeil},${edgeVeil}` : edgeVeil,
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

const REPAIR_BUTTON_CLIP = 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)';

function RepairActionButton({
  count,
  pending = false,
  disabled = false,
  compact = false,
  onClick,
}: {
  count: number;
  pending?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  const label = count === 0
    ? 'No damaged Artifacts selected'
    : count === 1
      ? 'Repair Artifact'
      : `Repair ${count} Artifacts`;
  return (
    <button
      type="button"
      className={`relative flex w-full items-center overflow-hidden text-left transition-[filter,transform,opacity] enabled:hover:brightness-110 enabled:active:translate-y-px disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82ddff]/80 ${compact ? 'h-10' : 'h-12'}`}
      style={{
        clipPath: REPAIR_BUTTON_CLIP,
        background: pending
          ? 'radial-gradient(circle at 30% 20%, rgba(130,221,255,0.24), transparent 55%), linear-gradient(155deg, #111b25, #071019)'
          : 'radial-gradient(circle at 24% 8%, rgba(130,221,255,0.28), transparent 52%), linear-gradient(155deg, #14212b, #071017)',
        boxShadow: pending
          ? 'inset 0 0 0 1px rgba(185,239,255,0.72), inset 0 0 0 3px rgba(14,42,55,0.94), inset 0 0 20px rgba(130,221,255,0.16)'
          : 'inset 0 0 0 1px rgba(202,241,255,0.58), inset 0 0 0 3px rgba(17,52,67,0.96), inset 0 0 0 4px rgba(130,221,255,0.42), 0 0 16px rgba(56,189,248,0.12)',
        opacity: disabled ? 0.38 : 1,
      }}
      disabled={disabled}
      onClick={onClick}
      aria-label={pending ? `${label}, queued for end of turn` : `${label}, free repair`}
      data-testid="civilization-repair-action"
      data-repair-state={pending ? 'queued' : disabled ? 'unavailable' : 'ready'}
    >
      <span className={`grid shrink-0 place-items-center border-r border-[#82ddff]/18 text-[#b9efff] ${compact ? 'h-10 w-10' : 'h-12 w-12'}`}>
        <Wrench className={compact ? 'h-4 w-4' : 'h-5 w-5'} aria-hidden="true" />
      </span>
      <span className="min-w-0 px-3">
        <strong className={`block truncate font-black uppercase tracking-[0.12em] text-white ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
          {pending ? 'Repair queued' : label}
        </strong>
        {!compact && (
          <span className="mt-0.5 block truncate text-[8px] font-semibold uppercase tracking-[0.08em] text-[#b9efff]/58">
            Free repair / resolves at turn end
          </span>
        )}
      </span>
    </button>
  );
}

function SiteDossier({
  site,
  forgedArtifacts,
  civilization,
  currentScene,
  preferredSide,
  preferredVerticalSide,
  districtLabel,
  isRecent,
  onZoomToNative,
  repairPending,
  repairSubmitting,
  onRepair,
  onOpenArtifact,
  onClose,
}: {
  site: CivilizationDeploymentSite;
  forgedArtifacts: readonly ArtifactCard[];
  civilization?: CivilizationPublicState | null;
  currentScene: MarketSceneKind;
  preferredSide: 'left' | 'right';
  preferredVerticalSide: 'top' | 'bottom';
  districtLabel: string | null;
  isRecent: boolean;
  onZoomToNative: (scene: MarketSceneKind) => void;
  repairPending: boolean;
  repairSubmitting: boolean;
  onRepair?: (artifactId: string) => void;
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
  const repairArtifactId = site.kind === 'artifact' ? site.artifactId : undefined;
  const repairableArtifactId = repairArtifactId &&
    site.implementationState === 'damaged'
    ? repairArtifactId
    : null;
  const primaryGameplayReadout = site.gameplayEffect ?? capabilityReadouts[0]?.description ?? site.summary;
  const districtId = site.kind === 'artifact' && site.artifactId
    ? civilization?.districtIdentity?.artifactAssignments[site.artifactId]
    : undefined;
  const district = districtId ? civilization?.districtIdentity?.districts[districtId] : undefined;

  return (
    <aside
      className={`pointer-events-auto absolute z-40 max-h-[min(13.5rem,44%)] w-[min(17rem,calc(100%-1rem))] overflow-y-auto border border-white/14 bg-[#050914]/84 p-2 shadow-2xl backdrop-blur-md [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:max-h-[min(19rem,calc(100%-1.5rem))] sm:w-[min(19rem,calc(100%-1.5rem))] sm:p-2.5 ${
        preferredSide === 'left' ? 'left-3 right-auto sm:left-3 sm:right-auto' : 'left-auto right-3 sm:right-3'
      } ${
        preferredVerticalSide === 'top' ? 'bottom-auto top-2 sm:top-3' : 'bottom-2 top-auto sm:bottom-3'
      }`}
      aria-label={`${site.title} dossier`}
      data-dossier-side={preferredSide}
      data-dossier-vertical-side={preferredVerticalSide}
      data-recent-trace={isRecent ? 'true' : undefined}
      data-operational-state={site.implementationState ?? site.projectState ?? 'operational'}
      style={isRecent ? {
        borderColor: `${tone}7A`,
        boxShadow: `0 18px 46px rgba(0,0,0,0.58), 0 0 32px ${tone}24, inset 0 0 0 1px ${tone}14`,
      } : undefined}
    >
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-start gap-2">
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
            <p className="mt-1 truncate text-[8px] font-semibold uppercase tracking-wider text-white/42">
              {sourceLabel}
            </p>
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
        className="mt-2 grid gap-1.5 border border-white/12 bg-black/22 p-2"
        data-testid="civilization-dossier-site-report"
        style={{
          borderColor: `${tone}38`,
          boxShadow: `inset 0 0 0 1px ${tone}0F`,
        }}
      >
        <div className="flex min-w-0 flex-wrap items-center gap-1">
          {districtLabel && !district && (
            <span
              className="max-w-full truncate rounded-full border px-1.5 py-0.5 text-[7px] font-black uppercase tracking-[0.12em] text-white/72"
              data-testid="civilization-dossier-district"
              style={{ borderColor: `${tone}55`, background: `${tone}10` }}
            >
              {districtLabel} district
            </span>
          )}
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
        <p className="line-clamp-2 text-[9px] leading-relaxed text-white/66 sm:text-[10px]">
          {primaryGameplayReadout}
        </p>
        {site.kind === 'artifact' && site.artifactId && (
          <ArtifactFunctionTags artifactId={site.artifactId} compact />
        )}
      </div>

      {district && <CivilizationDistrictReadout
        district={district}
        forgedArtifacts={forgedArtifacts}
        artifacts={civilization?.artifacts ?? []}
      />}

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        {repairArtifactId && onRepair && (
          <div className={primaryRelatedCard ? '' : 'col-span-2'}>
            <RepairActionButton
              count={1}
              compact
              pending={repairPending}
              disabled={!repairableArtifactId || repairPending || repairSubmitting}
              onClick={() => {
                if (repairableArtifactId) onRepair(repairableArtifactId);
              }}
            />
          </div>
        )}
        {primaryRelatedCard && (
          <button
            type="button"
            className={`flex min-h-10 items-center justify-between gap-2 border border-white/12 bg-white/[0.04] px-2 py-1.5 text-left text-[8px] font-black uppercase tracking-[0.1em] text-white/62 transition-colors hover:border-white/24 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${repairArtifactId && onRepair ? '' : 'col-span-2'}`}
            onClick={() => onOpenArtifact(primaryRelatedCard)}
            aria-label={`Inspect ${primaryRelatedCard.name} artifact record`}
            data-testid="civilization-dossier-inspect-artifact"
          >
            <span className="min-w-0 truncate">Artifact record</span>
            <ZoomIn className="h-3.5 w-3.5 shrink-0" style={{ color: tone }} aria-hidden="true" />
          </button>
        )}
        {canZoomToNative && (
          <button
            type="button"
            className="col-span-2 flex min-h-9 items-center justify-between gap-2 border border-white/12 bg-white/[0.035] px-2 py-1.5 text-left text-[8px] font-black uppercase tracking-[0.1em] text-white/60 transition-colors hover:border-white/24 hover:bg-white/[0.075] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            style={{ borderColor: `${tone}45` }}
            onClick={() => onZoomToNative(nativeScene)}
          >
            <span>View at {SCENE_UI[nativeScene].zoomLabel}</span>
            <ZoomIn className="h-3.5 w-3.5 shrink-0" style={{ color: tone }} aria-hidden="true" />
          </button>
        )}
      </div>

      <details
        className="mt-2 border-t border-white/10 pt-1.5 text-white/56"
        data-testid="civilization-dossier-details"
      >
        <summary className="cursor-pointer select-none text-[8px] font-black uppercase tracking-[0.14em] text-white/44 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
          Details
        </summary>
        <div
          className="mt-2 border border-white/12 bg-white/[0.035] p-2"
          data-testid="civilization-dossier-intelligence"
          style={{ borderColor: `${tone}3d` }}
        >
          <div className="flex gap-2">
            <ScanLine className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: tone }} aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[9px] font-semibold leading-snug text-white/80">{registrationTitle}</p>
              <p className="mt-1 text-[9px] leading-relaxed text-white/52">{getDossierRegistrationBody(site, nativeScene)}</p>
            </div>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-1 text-[7px] font-black uppercase tracking-[0.1em] text-white/38">
            <span className="col-span-2 min-w-0 border border-white/10 bg-black/18 px-2 py-1" data-testid="civilization-dossier-source-label">
              Source <span className="ml-1 text-white/62">{sourceLabel}</span>
            </span>
            <span className="border border-white/10 bg-black/18 px-2 py-1">{traceScaleLine}</span>
            <span className="border border-white/10 bg-black/18 px-2 py-1" data-testid="civilization-dossier-readout-label">{getDossierReadoutLabel(site)}</span>
            <span className="border border-white/10 bg-black/18 px-2 py-1">{getDossierEvidenceLabel(site)}</span>
            <span className="border border-white/10 bg-black/18 px-2 py-1">{getDossierScaleReading(site)}</span>
          </div>
        </div>
        {scaleContext && (
          <p className="mt-2 text-[9px] leading-relaxed text-white/48" data-testid="civilization-dossier-scale-context">
            {scaleContext.native}{scaleContext.influence ? `; ${scaleContext.influence}` : ''}
          </p>
        )}
        <p className="mt-2 text-[9px] leading-relaxed text-white/52">{site.visibleAs}. {site.visualCue}.</p>
        {site.kind !== 'artifact' && site.synergySummary && <p className="mt-1 text-[9px] leading-relaxed text-white/46">{site.synergySummary}</p>}
        {capabilityReadouts.length > 0 && (
          <div className="mt-2 grid gap-1" data-testid="civilization-dossier-capabilities">
            {capabilityReadouts.map((capability) => (
              <p key={capability.id} className="text-[9px] leading-relaxed text-white/50">
                <span className="font-semibold text-white/72">{capability.label}:</span> {capability.description}
                {!capability.active ? ' Inactive.' : ''}
              </p>
            ))}
            <p className="text-[8px] text-white/38">{operationalPresentation.detail}</p>
          </div>
        )}
        {site.componentSummary && (
          <p className="mt-2 text-[9px] leading-relaxed text-white/50">
            <span className="font-black uppercase tracking-widest text-white/38">Components </span>
            {site.componentSummary}
          </p>
        )}
        {site.kind !== 'artifact' && site.supportingArtifactNames && site.supportingArtifactNames.length > 0 && (
          <p className="mt-2 text-[9px] leading-relaxed text-white/46">
            <span className="font-black uppercase tracking-widest text-white/38">Supporting </span>
            {site.supportingArtifactNames.slice(0, 4).join(', ')}
          </p>
        )}
        {site.gameplayEffect && site.gameplayEffect !== primaryGameplayReadout && (
          <p className="mt-2 text-[9px] leading-relaxed text-white/50">
            <span className="font-black uppercase tracking-widest text-white/38">Effect </span>
            {site.gameplayEffect}
          </p>
        )}
        {relatedCards.length > 0 && (
          <div className="mt-2 sr-only" data-testid="civilization-dossier-source-artifacts">
            Inspect artifact record: {relatedCards.map((card) => card.name).join(', ')}
          </div>
        )}
      </details>

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
  horizontal = false,
}: {
  sites: readonly CivilizationDeploymentSite[];
  selectedSiteId: string | null;
  overflowCount: number;
  clusterGroups: ReturnType<typeof getClusterGroups>;
  recentSiteIds: readonly string[];
  onSelect: (siteId: string) => void;
  horizontal?: boolean;
}) {
  return (
    <div
      className={horizontal
        ? 'pointer-events-auto flex snap-x snap-mandatory gap-1.5 overflow-x-auto [scrollbar-width:thin]'
        : 'pointer-events-auto grid grid-cols-2 gap-2 max-[390px]:grid-cols-1'}
      aria-label={horizontal ? 'Artifact index' : 'Scene influences'}
      data-testid={horizontal ? 'civilization-artifact-index' : undefined}
    >
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
              horizontal ? 'w-[11rem] shrink-0 snap-start' : ''
            } ${
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
  const markerArtwork = site.kind === 'artifact' && site.artifactId
    ? CARD_RUNTIME_ART[site.artifactId] ?? null
    : site.kind === 'blueprint'
      ? getCivilizationBlueprintManifestationArt(site.blueprintId)
      : null;

  return (
    <button
      type="button"
      className="pointer-events-auto relative z-[36] grid w-full grid-cols-[2.5rem_minmax(0,1fr)_1.25rem] items-center gap-2 border border-white/12 bg-[#050914]/82 px-2 py-1.5 text-left shadow-[0_10px_24px_rgba(0,0,0,0.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/65"
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
        className="relative flex h-10 w-9 items-center justify-center overflow-hidden border border-white/12 bg-black/28"
        style={{
          color: tone,
          borderColor: `${tone}88`,
          clipPath: markerArtwork
            ? 'polygon(14% 0, 86% 0, 100% 10%, 100% 80%, 50% 100%, 0 80%, 0 10%)'
            : undefined,
        }}
        aria-hidden="true"
      >
        {markerArtwork ? (
          <img
            src={markerArtwork}
            alt=""
            className="h-full w-full object-cover"
            decoding="async"
            draggable={false}
          />
        ) : site.kind === 'artifact' && site.artifactVisualMotif ? (
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
            <CivilizationImpactBadgeContent kind={impactKind} />
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
      <span className="grid h-7 w-5 place-items-center text-white/42" aria-hidden="true">
        <ChevronRight className="h-4 w-4" />
      </span>
    </button>
  );
}










interface CivilizationScanMarkerAnchor {
  x: number;
  y: number;
}

export function resolveCivilizationScanMarkerAnchors(
  sites: readonly CivilizationDeploymentSite[],
  artifactWorldAnchors?: ReadonlyMap<string, CivilizationArtifactWorldAnchor>,
  compact = false,
  expandedFocus = false,
  canvasSize?: { width: number; height: number; hitSize: number },
): ReadonlyMap<string, CivilizationScanMarkerAnchor> {
  const occupied: CivilizationScanMarkerAnchor[] = [];
  const resolved = new Map<string, CivilizationScanMarkerAnchor>();
  const dense = sites.length > 20;
  const mediumDensity = sites.length > 12;
  const minimumXGap = compact
    ? dense
      ? 13.2
      : mediumDensity
        ? 13.5
        : 14
    : dense
      ? 5.8
      : mediumDensity
        ? 6.4
        : 7;
  const minimumYGap = compact
    ? dense
      ? 10.5
      : mediumDensity
        ? 11
        : 12
    : dense
      ? 10
      : mediumDensity
        ? 11
        : 12;
  const columnSteps = expandedFocus
    ? [-9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    : [-8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8];
  const rowSteps = expandedFocus
    ? [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6]
    : [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5];
  const offsets = rowSteps
    .flatMap((row) => columnSteps.map((column) => ({
      x: column * minimumXGap,
      y: row * minimumYGap,
    })))
    .sort((left, right) => (
      Math.hypot(left.x, left.y) - Math.hypot(right.x, right.y) ||
      left.y - right.y ||
      left.x - right.x
    ));
  const orderedSites = [...sites].sort((left, right) => (
    right.priority - left.priority || left.id.localeCompare(right.id)
  ));

  if (canvasSize && canvasSize.width > 0 && canvasSize.height > 0) {
    // Reserve the selected marker's largest hit rectangle, in actual CSS pixels.
    // Percent-only spacing collides when the game fits the city above the Well.
    const gap = canvasSize.hitSize * 1.16 + 4;
    const columns = Math.floor((canvasSize.width - 4) / gap);
    const rows = Math.floor((canvasSize.height - 4) / gap);
    if (columns * rows >= sites.length) {
      const slots = Array.from({ length: rows * columns }, (_, index) => ({
        x: (canvasSize.width - (columns - 1) * gap) / 2 + (index % columns) * gap,
        y: (canvasSize.height - (rows - 1) * gap) / 2 + Math.floor(index / columns) * gap,
      }));
      const targets = orderedSites.map(site => {
        const host = artifactWorldAnchors?.get(site.id);
        return {
          x: (host?.scanX ?? host?.x ?? site.anchor.x) * canvasSize.width / 100,
          y: (host?.scanY ?? (host ? Math.max(5, host.y - 5.4) : site.anchor.y)) * canvasSize.height / 100,
        };
      });
      const distance = (point: CivilizationScanMarkerAnchor, target: CivilizationScanMarkerAnchor) => (
        (point.x - target.x) ** 2 + (point.y - target.y) ** 2
      );
      const chosen = targets.map(target => {
        let nearest = 0;
        slots.forEach((slot, index) => {
          if (distance(slot, target) < distance(slots[nearest], target)) nearest = index;
        });
        return slots.splice(nearest, 1)[0];
      });
      // Exchange occupied slots when both assignments together become closer.
      // This reduces the displacement of later residents without moving the city.
      for (let pass = 0; pass < 2; pass++) {
        for (let left = 0; left < chosen.length; left++) {
          for (let right = left + 1; right < chosen.length; right++) {
            if (distance(chosen[right], targets[left]) + distance(chosen[left], targets[right])
              < distance(chosen[left], targets[left]) + distance(chosen[right], targets[right])) {
              [chosen[left], chosen[right]] = [chosen[right], chosen[left]];
            }
          }
        }
      }
      orderedSites.forEach((site, index) => resolved.set(site.id, {
        x: chosen[index].x / canvasSize.width * 100,
        y: chosen[index].y / canvasSize.height * 100,
      }));
      return resolved;
    }
  }

  if (compact && dense) {
    const lattice: CivilizationScanMarkerAnchor[] = [];
    for (let y = 8; y <= 93; y += 10.6) {
      for (let x = 5; x <= 95; x += 12.8) lattice.push({ x, y });
    }
    const available = new Set(lattice.map((_, index) => index));
    for (const site of orderedSites) {
      const worldAnchor = artifactWorldAnchors?.get(site.id);
      const base = {
        x: worldAnchor?.scanX ?? worldAnchor?.x ?? site.anchor.x,
        y: worldAnchor?.scanY ?? (worldAnchor
          ? Math.max(5, worldAnchor.y - (site.kind === 'blueprint' ? 6.2 : 5.4))
          : site.anchor.y),
      };
      const selectedIndex = [...available].sort((left, right) => {
        const leftAnchor = lattice[left]!;
        const rightAnchor = lattice[right]!;
        return Math.hypot(leftAnchor.x - base.x, leftAnchor.y - base.y) -
          Math.hypot(rightAnchor.x - base.x, rightAnchor.y - base.y) ||
          left - right;
      })[0];
      if (selectedIndex === undefined) break;
      available.delete(selectedIndex);
      resolved.set(site.id, lattice[selectedIndex]!);
    }
    return resolved;
  }

  for (const site of orderedSites) {
    const worldAnchor = artifactWorldAnchors?.get(site.id);
    const base = {
      x: worldAnchor?.scanX ?? worldAnchor?.x ?? site.anchor.x,
      y: worldAnchor?.scanY ?? (worldAnchor
        ? Math.max(5, worldAnchor.y - (site.kind === 'blueprint' ? 6.2 : 5.4))
        : site.anchor.y),
    };
    const candidates = offsets
      .map((offset, index) => {
        const x = Math.min(95, Math.max(5, base.x + offset.x));
        const y = Math.min(92, Math.max(8, base.y + offset.y));
        const overlapPenalty = occupied.reduce((score, prior) => {
          const xOverlap = Math.max(0, minimumXGap - Math.abs(prior.x - x));
          const yOverlap = Math.max(0, minimumYGap - Math.abs(prior.y - y));
          return score + (xOverlap > 0 && yOverlap > 0 ? 1_000_000 + xOverlap * yOverlap * 1_000 : 0);
        }, 0);
        return {
          x,
          y,
          score: overlapPenalty + Math.hypot(offset.x, offset.y) * 1.2 + index * 0.02,
        };
      })
      .filter((candidate, index, allCandidates) => (
        allCandidates.findIndex((other) => other.x === candidate.x && other.y === candidate.y) === index
      ));
    const candidate = candidates.sort((left, right) => left.score - right.score)[0]!;
    occupied.push(candidate);
    resolved.set(site.id, { x: candidate.x, y: candidate.y });
  }

  return resolved;
}

function resolveCivilizationScanClusterAnchors(
  clusters: readonly CivilizationScanMarkerCluster[],
  individualAnchors: ReadonlyMap<string, CivilizationScanMarkerAnchor>,
  compact: boolean,
): ReadonlyMap<string, CivilizationScanMarkerAnchor> {
  const occupied = [...individualAnchors.values()];
  const resolved = new Map<string, CivilizationScanMarkerAnchor>();
  const xStep = compact ? 6.4 : 4.2;
  const yStep = compact ? 5.4 : 5;
  const minimumXGap = compact ? 14 : 4.6;
  const minimumYGap = compact ? 11 : 8.4;
  const offsetSteps = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const offsets = offsetSteps
    .flatMap((row) => offsetSteps.map((column) => ({
      x: column * xStep,
      y: row * yStep,
    })))
    .sort((left, right) => Math.hypot(left.x, left.y) - Math.hypot(right.x, right.y));

  [...clusters]
    .sort((left, right) => right.sites.length - left.sites.length || left.id.localeCompare(right.id))
    .forEach((cluster) => {
      const candidate = offsets
        .map((offset, index) => {
          const x = Math.min(95, Math.max(5, cluster.anchor.x + offset.x));
          const y = Math.min(93, Math.max(7, cluster.anchor.y + offset.y));
          const overlapPenalty = occupied.reduce((score, prior) => {
            const xOverlap = Math.max(0, minimumXGap - Math.abs(prior.x - x));
            const yOverlap = Math.max(0, minimumYGap - Math.abs(prior.y - y));
            return score + (xOverlap > 0 && yOverlap > 0 ? xOverlap * yOverlap * 140 : 0);
          }, 0);
          return {
            x,
            y,
            score: overlapPenalty + Math.hypot(offset.x, offset.y) * 0.7 + index * 0.01,
          };
        })
        .sort((left, right) => left.score - right.score)[0]!;
      occupied.push(candidate);
      resolved.set(cluster.id, { x: candidate.x, y: candidate.y });
    });

  return resolved;
}

interface CivilizationScanMarkerCluster {
  id: string;
  label: string;
  sites: CivilizationDeploymentSite[];
  anchor: CivilizationScanMarkerAnchor;
}

function formatScanDistrictLabel(value: string): string {
  return value
    .split(/[_-]/g)
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ');
}

function getScanMarkerBaseAnchor(
  site: CivilizationDeploymentSite,
  artifactWorldAnchors?: ReadonlyMap<string, CivilizationArtifactWorldAnchor>,
): CivilizationScanMarkerAnchor {
  const worldAnchor = artifactWorldAnchors?.get(site.id);
  return {
    x: worldAnchor?.scanX ?? worldAnchor?.x ?? site.anchor.x,
    y: worldAnchor?.scanY ?? (worldAnchor
      ? Math.max(5, worldAnchor.y - (site.kind === 'blueprint' ? 6.2 : 5.4))
      : site.anchor.y),
  };
}

function buildScanMarkerPresentation({
  sites,
  artifactWorldAnchors,
  prioritySiteIds,
  compact,
  forceAll,
}: {
  sites: readonly CivilizationDeploymentSite[];
  artifactWorldAnchors?: ReadonlyMap<string, CivilizationArtifactWorldAnchor>;
  prioritySiteIds: ReadonlySet<string>;
  compact: boolean;
  forceAll: boolean;
}): {
  individualSites: CivilizationDeploymentSite[];
  clusters: CivilizationScanMarkerCluster[];
} {
  const individualLimit = compact ? 11 : 20;
  if (forceAll || sites.length <= individualLimit) {
    return { individualSites: [...sites], clusters: [] };
  }

  const prioritySites = sites.filter((site) => (
    site.kind !== 'artifact' || prioritySiteIds.has(site.id)
  ));
  const ordinarySites = sites
    .filter((site) => site.kind === 'artifact' && !prioritySiteIds.has(site.id))
    .sort((left, right) => right.priority - left.priority || left.id.localeCompare(right.id));
  const ordinarySlots = Math.max(3, individualLimit - prioritySites.length);
  const individualSites = [...prioritySites, ...ordinarySites.slice(0, ordinarySlots)];
  const clusteredSites = ordinarySites.slice(ordinarySlots);
  const byDistrict = new Map<string, CivilizationDeploymentSite[]>();

  clusteredSites.forEach((site) => {
    const anchor = getScanMarkerBaseAnchor(site, artifactWorldAnchors);
    const horizontal = anchor.x < 34 ? 'West' : anchor.x < 67 ? 'Central' : 'East';
    const vertical = anchor.y < 50 ? 'North' : 'South';
    const district = `${vertical}-${horizontal}`.toLowerCase();
    const group = byDistrict.get(district) ?? [];
    group.push(site);
    byDistrict.set(district, group);
  });

  const clusters = [...byDistrict.entries()].map(([district, members]) => {
    const memberAnchors = members.map((site) => getScanMarkerBaseAnchor(site, artifactWorldAnchors));
    const anchor = memberAnchors.reduce((total, item) => ({
      x: total.x + item.x / memberAnchors.length,
      y: total.y + item.y / memberAnchors.length,
    }), { x: 0, y: 0 });
    return {
      id: `district:${district}`,
      label: formatScanDistrictLabel(district),
      sites: members,
      anchor,
    };
  });

  return { individualSites, clusters };
}

function ArtifactStructureScanMarkers({
  sites,
  artifactWorldAnchors,
  selectedSiteIds,
  focusedSiteId,
  recentSiteIds,
  pendingRepairArtifactIds,
  repairedSiteIds,
  focusedClusterId,
  forceAll,
  compact,
  onSelect,
  onInspect,
  onFocusCluster,
  onHover,
}: {
  sites: readonly CivilizationDeploymentSite[];
  artifactWorldAnchors?: ReadonlyMap<string, CivilizationArtifactWorldAnchor>;
  selectedSiteIds: ReadonlySet<string>;
  focusedSiteId: string | null;
  recentSiteIds: readonly string[];
  pendingRepairArtifactIds: ReadonlySet<string>;
  repairedSiteIds: ReadonlySet<string>;
  focusedClusterId: string | null;
  forceAll: boolean;
  compact: boolean;
  onSelect: (siteId: string) => void;
  onInspect: (siteId: string) => void;
  onFocusCluster: (cluster: CivilizationScanMarkerCluster) => void;
  onHover: (siteId: string | null) => void;
}) {
  const markerRootRef = React.useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = React.useState<{ width: number; height: number }>();
  React.useLayoutEffect(() => {
    const root = markerRootRef.current;
    if (!root) return;
    const measure = () => {
      const width = root.clientWidth;
      const height = root.clientHeight;
      if (width <= 0 || height <= 0) return;
      setCanvasSize(previous => previous?.width === width && previous.height === height
        ? previous : { width, height });
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(root);
    return () => observer?.disconnect();
  }, []);
  const clickTimersRef = React.useRef(new Map<string, number>());
  React.useEffect(() => () => {
    clickTimersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    clickTimersRef.current.clear();
  }, []);
  const prioritySiteIds = React.useMemo(() => new Set(sites
    .filter((site) => (
      selectedSiteIds.has(site.id) ||
      site.id === focusedSiteId ||
      recentSiteIds.includes(site.id) ||
      repairedSiteIds.has(site.id) ||
      site.implementationState === 'damaged' ||
      Boolean(site.artifactId && pendingRepairArtifactIds.has(site.artifactId))
    ))
    .map((site) => site.id)), [
    focusedSiteId,
    pendingRepairArtifactIds,
    recentSiteIds,
    repairedSiteIds,
    selectedSiteIds,
    sites,
  ]);
  const markerPresentation = React.useMemo(() => buildScanMarkerPresentation({
    sites,
    artifactWorldAnchors,
    prioritySiteIds,
    compact,
    forceAll,
  }), [artifactWorldAnchors, compact, forceAll, prioritySiteIds, sites]);
  const focusedCluster = focusedClusterId
    ? markerPresentation.clusters.find((cluster) => cluster.id === focusedClusterId) ?? null
    : null;
  const visibleSites = React.useMemo(() => {
    if (!focusedCluster) return markerPresentation.individualSites;
    const visibleIds = new Set([
      ...markerPresentation.individualSites
        .filter((site) => site.kind !== 'artifact' || prioritySiteIds.has(site.id))
        .map((site) => site.id),
      ...focusedCluster.sites.map((site) => site.id),
    ]);
    return sites.filter((site) => visibleIds.has(site.id));
  }, [focusedCluster, markerPresentation.individualSites, prioritySiteIds, sites]);
  const smallHitTargets = visibleSites.length > 20 && (compact || (canvasSize?.width ?? Infinity) < 640);
  const hitSize = smallHitTargets ? 32 : 44;
  const markerAnchors = React.useMemo(
    () => resolveCivilizationScanMarkerAnchors(
      visibleSites,
      artifactWorldAnchors,
      compact,
      Boolean(focusedCluster),
      canvasSize ? { ...canvasSize, hitSize } : undefined,
    ),
    [artifactWorldAnchors, canvasSize, compact, focusedCluster, hitSize, visibleSites],
  );
  const clusterAnchors = React.useMemo(
    () => resolveCivilizationScanClusterAnchors(
      focusedCluster ? [] : markerPresentation.clusters,
      markerAnchors,
      compact,
    ),
    [compact, focusedCluster, markerAnchors, markerPresentation.clusters],
  );
  const fallbackSelectedId = [...selectedSiteIds].at(-1) ?? null;
  const linkedSiteId = focusedSiteId ?? fallbackSelectedId;
  const linkedSite = linkedSiteId
    ? sites.find((site) => site.id === linkedSiteId) ?? null
    : null;
  const linkedWorldAnchor = linkedSite
    ? artifactWorldAnchors?.get(linkedSite.id)
    : undefined;
  const linkedMarkerAnchor = linkedSite ? markerAnchors.get(linkedSite.id) : undefined;
  const linkedTone = linkedSite ? getCivilizationSiteTone(linkedSite) : null;
  const hasSelection = selectedSiteIds.size > 0;
  const cameraScaleCompensation = focusedCluster ? 1 / (compact ? 1.38 : 1.28) : 1;

  const selectAfterClick = React.useCallback((siteId: string, clickCount: number) => {
    const pendingTimer = clickTimersRef.current.get(siteId);
    if (pendingTimer !== undefined) {
      window.clearTimeout(pendingTimer);
      clickTimersRef.current.delete(siteId);
    }
    if (clickCount === 0) {
      onSelect(siteId);
      return;
    }
    if (clickCount > 1) return;
    const timerId = window.setTimeout(() => {
      clickTimersRef.current.delete(siteId);
      onSelect(siteId);
    }, 220);
    clickTimersRef.current.set(siteId, timerId);
  }, [onSelect]);

  const inspectAfterDoubleClick = React.useCallback((siteId: string) => {
    const pendingTimer = clickTimersRef.current.get(siteId);
    if (pendingTimer !== undefined) window.clearTimeout(pendingTimer);
    clickTimersRef.current.delete(siteId);
    onInspect(siteId);
  }, [onInspect]);

  return (
    <div
      ref={markerRootRef}
      className="pointer-events-none absolute inset-0 z-20"
      data-testid="civilization-artifact-structure-markers"
      aria-hidden={false}
    >
      {linkedSite && linkedWorldAnchor && linkedMarkerAnchor && linkedTone && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          data-testid="civilization-artifact-pin-host-links"
        >
          <path
            d={`M ${linkedMarkerAnchor.x} ${linkedMarkerAnchor.y} Q ${(linkedMarkerAnchor.x + linkedWorldAnchor.x) / 2} ${Math.min(linkedMarkerAnchor.y, linkedWorldAnchor.y) - 1.5} ${linkedWorldAnchor.x} ${linkedWorldAnchor.y}`}
            fill="none"
            stroke={linkedTone}
            strokeOpacity="0.92"
            strokeWidth="0.34"
            vectorEffect="non-scaling-stroke"
            data-testid="civilization-artifact-pin-host-link"
            data-site-id={linkedSite.id}
            data-world-host-key={linkedWorldAnchor.hostKey}
          />
          <circle
            cx={linkedWorldAnchor.x}
            cy={linkedWorldAnchor.y}
            r="0.72"
            fill={linkedTone}
            fillOpacity="0.76"
            stroke="rgba(255,255,255,0.76)"
            strokeWidth="0.12"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      )}

      {visibleSites.map((site, index) => {
        const worldAnchor = artifactWorldAnchors?.get(site.id);
        const markerAnchor = markerAnchors.get(site.id) ?? site.anchor;
        const markerX = markerAnchor.x;
        const markerY = markerAnchor.y;
        const markerOffset = worldAnchor ? Math.max(0, worldAnchor.y - markerY) : 0;
        const selected = selectedSiteIds.has(site.id);
        const focused = site.id === focusedSiteId;
        const isRecent = recentSiteIds.includes(site.id);
        const isDamaged = site.implementationState === 'damaged';
        const repairQueued = Boolean(site.artifactId && pendingRepairArtifactIds.has(site.artifactId));
        const wasRepaired = repairedSiteIds.has(site.id);
        const active = selected || focused || repairQueued || wasRepaired || (!hasSelection && isRecent);
        const tone = getCivilizationSiteTone(site);
        const markerArtwork = site.kind === 'artifact' && site.artifactId
          ? CARD_RUNTIME_ART[site.artifactId] ?? null
          : site.kind === 'blueprint'
            ? getCivilizationBlueprintManifestationArt(site.blueprintId)
            : null;
        const restingScale = hasSelection ? 0.9 : 1;
        const portraitSize = compact
          ? visibleSites.length > 20
            ? 'h-5 w-5'
            : visibleSites.length > 12
              ? 'h-6 w-6'
              : 'h-8 w-8'
          : visibleSites.length > 24
            ? 'h-7 w-7'
            : visibleSites.length > 16
              ? 'h-8 w-8'
              : 'h-9 w-9';
        const pinHitSize = smallHitTargets ? 'h-8 w-8' : 'h-11 w-11';
        const isBlueprint = site.kind === 'blueprint';

        return (
          <button
            key={site.id}
            type="button"
            aria-label={isBlueprint
              ? `Inspect Blueprint ${site.title}`
              : `${site.title}. Click or Space to select; double-click or Enter to inspect`}
            aria-pressed={site.kind === 'artifact' ? selected : undefined}
            className={`civ-map-pin pointer-events-auto absolute ${pinHitSize} opacity-100 text-white transition-[filter,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`}
            style={{
              left: `${markerX}%`,
              top: `${markerY}%`,
              transform: `translate(-50%, -50%) scale(${cameraScaleCompensation * (selected ? 1.16 : focused ? 1.1 : active ? 1.04 : restingScale)})`,
              filter: active
                ? `drop-shadow(0 0 12px ${tone}86)`
                : `drop-shadow(0 3px 6px rgba(0,0,0,0.88)) drop-shadow(0 0 5px ${tone}52)`,
              ['--pin-color' as string]: tone,
            }}
            data-pin-state={selected ? 'selected' : focused || isRecent ? 'focused' : 'resting'}
            data-testid="civilization-scan-map-pin"
            data-marker-mode="artifact-structure"
            data-site-id={site.id}
            data-artifact-id={site.artifactId ?? undefined}
            data-pin-presentation="artifact-structure"
            data-pin-link-state={selected || focused ? 'linked' : 'available'}
            data-operational-state={isDamaged ? 'damaged' : 'operational'}
            data-repair-state={repairQueued ? 'queued' : wasRepaired ? 'restored' : 'idle'}
            data-world-anchor={`${worldAnchor?.x ?? markerX},${worldAnchor?.y ?? markerY}`}
            data-world-host-key={worldAnchor?.hostKey}
            data-pin-offset={worldAnchor ? markerOffset : undefined}
            onClick={(event) => {
              if (site.kind === 'artifact') {
                selectAfterClick(site.id, event.detail);
                return;
              }
              onInspect(site.id);
            }}
            onKeyDown={(event) => {
              if (site.kind !== 'artifact') return;
              if (event.key === ' ') {
                event.preventDefault();
                onSelect(site.id);
              }
              if (event.key === 'Enter') {
                event.preventDefault();
                onInspect(site.id);
              }
            }}
            onDoubleClick={(event) => {
              event.preventDefault();
              if (site.kind === 'artifact') inspectAfterDoubleClick(site.id);
            }}
            onPointerEnter={() => onHover(site.id)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(site.id)}
            onBlur={() => onHover(null)}
            title={site.title}
          >
            <span
              className={`absolute left-1/2 top-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden border bg-[#050914] transition-[width,height,border-radius] duration-200 ${portraitSize} ${isBlueprint ? 'rounded-[5px] [clip-path:polygon(50%_0,100%_28%,100%_72%,50%_100%,0_72%,0_28%)]' : 'rounded-full'}`}
              style={{
                borderColor: active ? `${tone}FF` : `${tone}E8`,
                background: `radial-gradient(circle, ${tone}42, rgb(5,9,20) 72%)`,
                boxShadow: active
                  ? `inset 0 0 0 1px rgba(255,255,255,0.22), 0 0 15px ${tone}72`
                  : `inset 0 0 0 1px rgba(255,255,255,0.16), 0 3px 10px rgba(0,0,0,0.88), 0 0 7px ${tone}42`,
              }}
              aria-hidden="true"
            >
              {markerArtwork ? (
                <img
                  src={markerArtwork}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ filter: 'saturate(1.12) contrast(1.16) brightness(1.06)' }}
                  decoding="async"
                  draggable={false}
                  data-testid={isBlueprint
                    ? 'civilization-blueprint-map-pin-art'
                    : 'civilization-artifact-map-pin-art'}
                  data-artifact-id={site.artifactId}
                  data-blueprint-id={site.blueprintId}
                />
              ) : (
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: tone, boxShadow: `0 0 8px ${tone}` }}
                />
              )}
              <span
                className={`pointer-events-none absolute inset-0 ${isBlueprint ? 'rounded-[5px]' : 'rounded-full'}`}
                style={{ boxShadow: 'inset 0 0 7px rgba(0,0,0,0.32), inset 0 0 0 1px rgba(255,255,255,0.2)' }}
              />
            </span>
            {isBlueprint && (
              <span
                className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-[3px] border border-[#82ddff]/80 bg-[#061927]/96 text-[#b9efff] shadow-[0_0_9px_rgba(130,221,255,0.48)]"
                aria-hidden="true"
                data-testid="civilization-blueprint-paper-badge"
              >
                <FileText className="h-3 w-3" strokeWidth={2.1} />
              </span>
            )}
            {isDamaged && !repairQueued && (
              <span
                className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full border border-[#ff857f]/80 bg-[#2a090b] text-[#ffd4cf] shadow-[0_0_9px_rgba(255,93,86,0.55)]"
                aria-hidden="true"
                data-testid="civilization-artifact-damaged-badge"
              >
                <Wrench className="h-2.5 w-2.5" />
              </span>
            )}
            {repairQueued && (
              <span
                className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full border border-[#82ddff]/85 bg-[#071923] text-[#d7f7ff] shadow-[0_0_9px_rgba(130,221,255,0.58)]"
                aria-hidden="true"
                data-testid="civilization-artifact-repair-queued-badge"
              >
                <Wrench className="h-2.5 w-2.5" />
              </span>
            )}
            {wasRepaired && (
              <span
                className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full border border-[#9af0c1]/85 bg-[#071c15] text-[#d9ffe9] shadow-[0_0_10px_rgba(110,231,167,0.62)]"
                aria-hidden="true"
                data-testid="civilization-artifact-restored-badge"
              >
                <Check className="h-2.5 w-2.5" />
              </span>
            )}
            <span className="sr-only">Map marker {index + 1}</span>
          </button>
        );
      })}
      {!focusedCluster && markerPresentation.clusters.map((cluster) => {
        const clusterAnchor = clusterAnchors.get(cluster.id) ?? cluster.anchor;
        const tone = getCivilizationSiteTone(cluster.sites[0]!);
        const previews = cluster.sites.slice(0, 3).map((site) => (
          site.artifactId ? CARD_RUNTIME_ART[site.artifactId] ?? null : null
        ));
        return (
          <button
            key={cluster.id}
            type="button"
            className="pointer-events-auto absolute grid h-12 w-12 place-items-center text-white transition-[filter,transform] duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/75"
            style={{
              left: `${clusterAnchor.x}%`,
              top: `${clusterAnchor.y}%`,
              transform: 'translate(-50%, -50%)',
              filter: `drop-shadow(0 4px 7px rgba(0,0,0,0.78)) drop-shadow(0 0 7px ${tone}42)`,
            }}
            aria-label={`Open ${cluster.label} district with ${cluster.sites.length} ${cluster.sites.length === 1 ? 'Artifact' : 'Artifacts'}`}
            onClick={() => onFocusCluster({ ...cluster, anchor: clusterAnchor })}
            data-testid="civilization-scan-district-stack"
            data-cluster-id={cluster.id}
            data-cluster-count={cluster.sites.length}
          >
            <span
              className="absolute inset-1 rounded-full border bg-[#050914]/94"
              style={{ borderColor: `${tone}B8`, boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.08), 0 0 15px ${tone}34` }}
              aria-hidden="true"
            />
            {previews.map((artwork, previewIndex) => (
              <span
                key={`${cluster.id}:preview:${previewIndex}`}
                className="absolute h-6 w-6 overflow-hidden rounded-full border border-white/28 bg-[#09111d]"
                style={{
                  left: `${8 + previewIndex * 7}px`,
                  top: `${8 + (previewIndex % 2) * 7}px`,
                  zIndex: previewIndex + 1,
                }}
                aria-hidden="true"
              >
                {artwork ? (
                  <img src={artwork} alt="" className="h-full w-full object-cover" decoding="async" draggable={false} />
                ) : (
                  <Layers3 className="m-1 h-4 w-4" style={{ color: tone }} />
                )}
              </span>
            ))}
            <span className="absolute -bottom-1 -right-1 z-10 min-w-5 rounded-full border border-white/28 bg-[#07101b] px-1 text-[7px] font-black text-white shadow-lg">
              +{cluster.sites.length}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ScanMapPins({
  sites,
  artifactWorldAnchors,
  annotationOnly = false,
  selectedSiteIds,
  focusedSiteId,
  recentSiteIds,
  pendingRepairArtifactIds,
  repairedSiteIds,
  focusedClusterId,
  forceAll = false,
  compact = false,
  onSelect,
  onInspect,
  onFocusCluster,
  onHover,
}: {
  sites: readonly CivilizationDeploymentSite[];
  artifactWorldAnchors?: ReadonlyMap<string, CivilizationArtifactWorldAnchor>;
  annotationOnly?: boolean;
  selectedSiteIds: ReadonlySet<string>;
  focusedSiteId: string | null;
  recentSiteIds: readonly string[];
  pendingRepairArtifactIds: ReadonlySet<string>;
  repairedSiteIds: ReadonlySet<string>;
  focusedClusterId: string | null;
  forceAll?: boolean;
  compact?: boolean;
  onSelect: (siteId: string) => void;
  onInspect: (siteId: string) => void;
  onFocusCluster: (cluster: CivilizationScanMarkerCluster) => void;
  onHover: (siteId: string | null) => void;
}) {
  const selectedSiteId = [...selectedSiteIds].at(-1) ?? null;
  if (annotationOnly) {
    return (
      <ArtifactStructureScanMarkers
        sites={sites}
        artifactWorldAnchors={artifactWorldAnchors}
        selectedSiteIds={selectedSiteIds}
        focusedSiteId={focusedSiteId}
        recentSiteIds={recentSiteIds}
        pendingRepairArtifactIds={pendingRepairArtifactIds}
        repairedSiteIds={repairedSiteIds}
        focusedClusterId={focusedClusterId}
        forceAll={forceAll}
        compact={compact}
        onSelect={onSelect}
        onInspect={onInspect}
        onFocusCluster={onFocusCluster}
        onHover={onHover}
      />
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20" aria-hidden={false}>
      {annotationOnly && (
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
          data-testid="civilization-artifact-pin-host-links"
        >
          {sites.map((site) => {
            const worldAnchor = site.kind === 'artifact'
              ? artifactWorldAnchors?.get(site.id)
              : undefined;
            if (!worldAnchor) return null;
            const tone = getCivilizationSiteTone(site);
            const active = site.id === selectedSiteId || site.id === focusedSiteId;
            const bendY = Math.min(worldAnchor.y, worldAnchor.hostY) - 1.4;
            return (
              <g key={`world-link:${site.id}`}>
                <path
                  d={`M ${worldAnchor.x} ${worldAnchor.y} Q ${(worldAnchor.x + worldAnchor.hostX) / 2} ${bendY} ${worldAnchor.hostX} ${worldAnchor.hostY}`}
                  fill="none"
                  stroke={tone}
                  strokeOpacity={active ? 0.88 : 0.28}
                  strokeWidth={active ? 0.34 : 0.18}
                  vectorEffect="non-scaling-stroke"
                  data-testid="civilization-artifact-pin-host-link"
                  data-site-id={site.id}
                  data-world-host-key={worldAnchor.hostKey}
                />
                <circle
                  cx={worldAnchor.hostX}
                  cy={worldAnchor.hostY}
                  r={active ? 0.72 : 0.45}
                  fill={tone}
                  fillOpacity={active ? 0.72 : 0.26}
                  stroke="rgba(255,255,255,0.72)"
                  strokeOpacity={active ? 0.72 : 0.2}
                  strokeWidth="0.12"
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            );
          })}
        </svg>
      )}
      {sites.map((site, index) => {
        const tone = getCivilizationSiteTone(site);
        const isArtifactPin = site.kind === 'artifact' && Boolean(site.artifactId);
        const artifactArtwork = isArtifactPin && site.artifactId
          ? CARD_RUNTIME_ART[site.artifactId] ?? null
          : null;
        const selected = site.id === selectedSiteId;
        const focused = site.id === focusedSiteId;
        const isRecent = recentSiteIds.includes(site.id);
        const worldAnchor = isArtifactPin ? artifactWorldAnchors?.get(site.id) : undefined;
        const markerAnchor = worldAnchor ?? site.anchor;
        return (
          <button
            key={site.id}
            type="button"
            aria-label={selectedSiteId ? `Map marker ${index + 1}: ${site.title}` : `Map marker ${index + 1}`}
            className={`civ-map-pin pointer-events-auto absolute opacity-100 text-white transition-[filter,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
              annotationOnly ? 'h-12 w-8 sm:h-14 sm:w-9' : 'h-16 w-11 sm:h-20 sm:w-12'
            }`}
            style={{
              left: `${markerAnchor.x}%`,
              top: `${markerAnchor.y}%`,
              transform: `translate(-50%, -97%) scale(${selected ? (annotationOnly ? 1.18 : 1.3) : focused || isRecent ? (annotationOnly ? 1.08 : 1.12) : 1})`,
              filter: selected || focused || isRecent
                ? `drop-shadow(0 0 22px ${tone}8A)`
                : `drop-shadow(0 0 14px ${tone}42)`,
              ['--pin-color' as string]: tone,
            }}
            data-pin-state={selected ? 'selected' : focused || isRecent ? 'focused' : 'resting'}
            data-testid="civilization-scan-map-pin"
            data-pin-link-state={isArtifactPin ? (selected || focused ? 'linked' : 'available') : undefined}
            data-world-anchor={worldAnchor ? `${worldAnchor.x},${worldAnchor.y}` : undefined}
            data-world-host-key={worldAnchor?.hostKey}
            onClick={() => onSelect(site.id)}
            onPointerEnter={() => onHover(site.id)}
            onPointerLeave={() => onHover(null)}
            onFocus={() => onHover(site.id)}
            onBlur={() => onHover(null)}
            title={site.title}
          >
            {isArtifactPin && (
              <span
                className={`civ-map-pin-link-aura pointer-events-none absolute left-1/2 -translate-x-1/2 rounded-[50%] transition-[opacity,transform] duration-300 ${
                  annotationOnly ? 'bottom-[-0.45rem] h-8 w-14 sm:h-9 sm:w-16' : 'bottom-[-1rem] h-12 w-20 sm:h-14 sm:w-24'
                } ${
                  selected || focused ? 'civ-artifact-identity-glow opacity-100' : 'opacity-0'
                }`}
                style={{
                  background: `radial-gradient(ellipse at center, ${tone}${selected || focused ? '62' : '2A'} 0%, ${tone}${selected || focused ? '28' : '10'} 42%, transparent 72%)`,
                  boxShadow: selected || focused ? `0 0 26px ${tone}4A` : undefined,
                  transform: `translateX(-50%) scale(${selected || focused ? 1.06 : 0.9})`,
                }}
                data-testid="civilization-artifact-pin-link-aura"
                data-artifact-id={site.artifactId}
                aria-hidden="true"
              />
            )}
            <span
              className={`absolute bottom-0 left-1/2 -translate-x-1/2 rounded-full border ${
                annotationOnly ? 'h-2.5 w-7' : 'h-4 w-10'
              }`}
              style={{
                borderColor: selected ? `${tone}CC` : focused || isRecent ? `${tone}90` : `${tone}62`,
                background: `radial-gradient(ellipse at center, ${tone}2E, transparent 68%)`,
                boxShadow: selected || focused || isRecent ? `0 0 18px ${tone}44` : undefined,
              }}
              aria-hidden="true"
            />
            <span
              className={`absolute left-1/2 w-px -translate-x-1/2 ${
                annotationOnly ? 'bottom-2 h-7 sm:h-8' : 'bottom-3 h-9 sm:h-14'
              }`}
              style={{
                background: `linear-gradient(180deg, rgba(255,255,255,0.92), ${tone}E8 36%, ${tone}00)`,
                boxShadow: `0 0 16px ${tone}78`,
              }}
              aria-hidden="true"
            />
            <span
              className={`absolute left-1/2 w-[1.5px] -translate-x-1/2 ${
                annotationOnly ? 'bottom-[0.65rem] h-5 sm:h-6' : 'bottom-[1.05rem] h-6 sm:h-10'
              }`}
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.72), rgba(255,255,255,0))',
              }}
              aria-hidden="true"
            />
            <span
              className={`civ-map-pin-core absolute left-1/2 z-10 flex -translate-x-1/2 items-center justify-center ${
                artifactArtwork
                  ? annotationOnly
                    ? 'bottom-[1.55rem] h-9 w-7 overflow-hidden sm:bottom-[1.75rem] sm:h-10 sm:w-8'
                    : 'bottom-[2.15rem] h-12 w-9 overflow-hidden sm:bottom-[3.25rem] sm:h-14 sm:w-10'
                  : annotationOnly
                    ? 'bottom-[1.55rem] h-6 w-6 rotate-45 border bg-[#050914]/86 shadow-[0_0_14px_rgba(0,0,0,0.8)] sm:bottom-[1.8rem] sm:h-7 sm:w-7'
                    : 'bottom-[2.35rem] h-8 w-8 rotate-45 border bg-[#050914]/86 shadow-[0_0_18px_rgba(0,0,0,0.82)] backdrop-blur-sm sm:bottom-[3.5rem] sm:h-9 sm:w-9'
              }`}
              style={{
                borderColor: selected ? `${tone}F0` : focused || isRecent ? `${tone}C8` : `${tone}86`,
                background: artifactArtwork
                  ? `linear-gradient(145deg, rgba(255,255,255,0.92) 0%, ${tone}F0 14%, rgba(16,22,31,0.98) 40%, ${tone}A8 74%, rgba(2,5,12,0.98) 100%)`
                  : selected || focused || isRecent
                    ? `radial-gradient(circle, rgba(255,255,255,0.78), ${tone}74 38%, rgba(5,9,20,0.88) 72%)`
                    : `radial-gradient(circle, rgba(255,255,255,0.46), ${tone}52 42%, rgba(5,9,20,0.9) 72%)`,
                color: '#fff',
                boxShadow: artifactArtwork
                  ? undefined
                  : selected || focused || isRecent
                    ? `inset 0 0 0 1px rgba(255,255,255,0.18), 0 0 26px ${tone}82, 0 0 42px ${tone}30`
                    : `inset 0 0 0 1px rgba(255,255,255,0.1), 0 0 20px ${tone}4A`,
                clipPath: artifactArtwork
                  ? 'polygon(15% 0, 85% 0, 100% 10%, 100% 76%, 50% 100%, 0 76%, 0 10%)'
                  : undefined,
                textShadow: `0 0 8px ${tone}`,
              }}
              data-pin-presentation={artifactArtwork ? 'artifact-relic' : 'signal'}
              aria-hidden="true"
            >
              {artifactArtwork ? (
                <span
                  className="absolute inset-[2px] overflow-hidden bg-[#030712]"
                  style={{
                    clipPath: 'polygon(15% 0, 85% 0, 100% 10%, 100% 75%, 50% 100%, 0 75%, 0 10%)',
                  }}
                  data-testid="civilization-artifact-map-pin-art"
                  data-artifact-id={site.artifactId}
                >
                  <img
                    src={artifactArtwork}
                    alt=""
                    className="h-full w-full object-cover"
                    decoding="async"
                    draggable={false}
                  />
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background: `linear-gradient(180deg, rgba(255,255,255,0.18), transparent 22%, transparent 58%, rgba(1,4,11,0.42) 78%, ${tone}4A 100%)`,
                      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.16), inset 0 -10px 14px rgba(0,0,0,0.25)',
                    }}
                  />
                  <span
                    className="pointer-events-none absolute left-[19%] right-[19%] top-px h-px"
                    style={{
                      background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)',
                      boxShadow: `0 0 5px ${tone}B8`,
                    }}
                  />
                  <span
                    className="pointer-events-none absolute bottom-[3px] left-1/2 h-1.5 w-1.5 -translate-x-1/2 rotate-45 border"
                    style={{
                      borderColor: `${tone}E8`,
                      background: 'rgba(255,255,255,0.84)',
                      boxShadow: `0 0 7px ${tone}`,
                    }}
                  />
                </span>
              ) : (
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
              )}
            </span>
          </button>
        );
      })}
    </div>
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
  civilization,
  recentSiteIds = [],
  showRecentCard = true,
  presentation = 'standard',
  className = '',
}: CivilizationMiniatureSceneProps) {
  void progressFraction;
  void palette;
  const sceneRootRef = React.useRef<HTMLDivElement>(null);
  const compactPlate = useIsMobile();
  const documentVisible = useDocumentVisible();
  const inViewport = useElementInViewport(sceneRootRef);
  const motionPaused = paused || !documentVisible || !inViewport;
  const isThumbnail = presentation === 'thumbnail';
  const environmentIdentity = civilization?.environmentIdentity ?? FALLBACK_CIVILIZATION_ENVIRONMENT;
  const rootScene = getSceneKind(tier);
  const visualState = React.useMemo(() => deriveCivilizationVisualState({
    civilization,
    deploymentSites,
    profile,
    fallbackTier: tier,
  }), [civilization, deploymentSites, profile, tier]);
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
  const visualIdentity = visualState.identities[scene];
  const sceneSites = React.useMemo(() => (
    deploymentSites.filter((site) => isSiteAvailableInScene(site, scene))
  ), [deploymentSites, scene]);
  const operationalSceneSites = React.useMemo(() => (
    sceneSites.filter(isCivilizationSiteOperational)
  ), [sceneSites]);
  const sceneSignals = React.useMemo(() => buildSceneSignals(sceneSites), [sceneSites]);
  const sceneIdentity = React.useMemo(() => applyCanonicalAffinityIdentity(
    buildSceneIdentity(sceneSites),
    visualIdentity.primaryAffinity,
    visualIdentity.secondaryAffinity,
  ), [sceneSites, visualIdentity.primaryAffinity, visualIdentity.secondaryAffinity]);
  const sceneArchetype = React.useMemo(() => (
    civilization
      ? visualIdentity.plateArchetype
      : getCivilizationSceneArchetype(profile, sceneIdentity, sceneSignals)
  ), [civilization, profile, sceneIdentity, sceneSignals, visualIdentity.plateArchetype]);
  const miniatureSiteLimit = isThumbnail
    ? 1
    : recentSiteIds.length > 0
      ? 3
      : 2;
  const cinematicHeroSites = React.useMemo(() => (
    selectCinematicHeroSites(operationalSceneSites, miniatureSiteLimit, recentSiteIds)
  ), [miniatureSiteLimit, operationalSceneSites, recentSiteIds]);
  const recentSite = React.useMemo(() => (
    selectSitesByIdOrder(sceneSites, recentSiteIds)[0] ?? null
  ), [sceneSites, recentSiteIds]);
  const cinematicStructuralSites = React.useMemo(() => (
    cinematicHeroSites.filter((site) => site.kind !== 'luminary')
  ), [cinematicHeroSites]);

  return (
    <div
      ref={sceneRootRef}
      className={`relative h-full w-full overflow-hidden bg-[#030711] ${className}`}
      role="img"
      aria-label="Civilization preview showing recent artifact, Blueprint, and Luminary consequences."
      data-testid="civilization-miniature-scene"
      data-scene={scene}
      data-root-scene={rootScene}
      data-recent-focus-site={recentFocusSite?.id ?? undefined}
      data-presentation={presentation}
      data-archetype={sceneArchetype ?? undefined}
      data-visual-identity={visualIdentity.morphologyId}
      data-identity-layer={visualIdentity.layer ?? undefined}
      data-identity-status={visualIdentity.status}
      data-complexity={visualState.scenes[scene].stage}
      data-global-complexity={visualState.globalComplexity}
      data-city-development-stage={visualState.cityDevelopmentStage}
      data-city-development-label={visualState.cityDevelopmentLabel}
      data-current-reach={visualState.scenes[scene].reach}
      data-civilization-motion={motionPaused ? 'paused' : 'active'}
      data-civilization-visibility={inViewport ? 'visible' : 'offscreen'}
    >
      <MarketSceneStyles />
      <CivilizationMorphologyStyles />
      <CinematicCivilizationPlate
        scene={scene}
        signals={sceneSignals}
        archetype={sceneArchetype}
        dyad={visualIdentity.dyad}
        environmentIdentity={environmentIdentity}
        evolutionStage={scene === 'surface'
          ? visualState.cityDevelopmentStage >= 8
            ? 3
            : visualState.cityDevelopmentStage >= 6
              ? 2
              : visualState.cityDevelopmentStage >= 5
                ? 1
                : 0
          : visualState.scenes[scene].stage}
        civilizationMaturity={visualState.historicalMaturity}
        settlementPhase={visualState.settlementPhase}
        cityDevelopmentStage={visualState.cityDevelopmentStage}
        scanActive={false}
        compact={compactPlate}
      />
      <CivilizationIdentityContinuityLayer
        scene={scene}
        identities={visualState.identities}
        progress={visualState.scenes[scene]}
        maturity={visualState.historicalMaturity}
        compact={compactPlate}
        environmentVariantId={environmentIdentity.variantId}
        districtInstances={Object.values(civilization?.districtIdentity?.districts ?? {})}
        residentSites={sceneSites}
      />
      <CivilizationLivingWorldLayer
        scene={scene}
        dyad={visualIdentity.dyad}
        operationalShares={civilization?.affinityIdentity.normalizedOperationalShares}
      />
      <CivilizationArtifactManifestationLayer
        sites={sceneSites}
        scene={scene}
        dyad={visualIdentity.dyad}
        environmentVariantId={environmentIdentity.variantId}
        identityEpochs={[]}
        scanActive={false}
        compact
        recentSiteIds={recentSiteIds}
        districtInstances={Object.values(civilization?.districtIdentity?.districts ?? {})}
      />
      <CivilizationBlueprintManifestationLayer
        sites={cinematicStructuralSites.filter((site) => shouldRenderDominantBlueprint(site, scene))}
        scene={scene}
        compact
        environmentVariantId={environmentIdentity.variantId}
      />
      {recentSite && !isThumbnail && (
        <MiniatureRecentTracePulse
          site={recentSite}
          recentCount={recentSiteIds.length}
          showCard={showRecentCard}
        />
      )}
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


export function CivilizationScenePanel({
  tier,
  palette,
  profile,
  progressFraction,
  paused,
  civilizationName,
  permanentAffinities,
  presentationMode = false,
  fitViewport = false,
  defaultScanActive = false,
  defaultScene,
  placementProof = false,
  deploymentSites,
  forgedArtifacts,
  civilization,
  environmentIdentity,
  stabilityBand = 'stable',
  activeConditions = [],
  externalRecentSiteIds = [],
  artifactRenderingIds,
  pendingRepairArtifactIds = [],
  onRecentSiteIdsSeen,
  onRepairArtifacts,
  onOpenArtifact,
}: CivilizationScenePanelProps) {
  void progressFraction;
  const sceneRootRef = React.useRef<HTMLElement>(null);
  const isMobile = useIsMobile();
  const documentVisible = useDocumentVisible();
  const inViewport = useElementInViewport(sceneRootRef);
  const motionPaused = paused || !documentVisible || !inViewport;
  const [compactViewport, setCompactViewport] = React.useState(false);
  const compactScanLayout = isMobile || compactViewport;
  const fittedCanvasWidth = useCivilizationViewportFit(
    sceneRootRef, fitViewport && !presentationMode, compactScanLayout,
  );
  const [scanActive, setScanActive] = React.useState(defaultScanActive);
  const [selectedSiteId, setSelectedSiteId] = React.useState<string | null>(null);
  const [selectedArtifactSiteIds, setSelectedArtifactSiteIds] = React.useState<Set<string>>(() => new Set());
  const [inspectedSiteId, setInspectedSiteId] = React.useState<string | null>(null);
  const [zoomedSiteId, setZoomedSiteId] = React.useState<string | null>(null);
  const [inspectionOriginScene, setInspectionOriginScene] = React.useState<MarketSceneKind | null>(null);
  const [scanClusterFocus, setScanClusterFocus] = React.useState<CivilizationScanMarkerCluster | null>(null);
  const [scanIndexOpen, setScanIndexOpen] = React.useState(false);
  const [repairSubmitting, setRepairSubmitting] = React.useState(false);
  const [repairedSiteIds, setRepairedSiteIds] = React.useState<string[]>([]);
  const [hoveredSiteId, setHoveredSiteId] = React.useState<string | null>(null);
  const [sceneOverride, setSceneOverride] = React.useState<MarketSceneKind>(() => (
    getInitialSceneOverride({ defaultScene, defaultScanActive, deploymentSites, tier })
  ));
  const [recentSiteIds, setRecentSiteIds] = React.useState<string[]>([]);
  const resolvedEnvironmentIdentity = civilization?.environmentIdentity
    ?? environmentIdentity
    ?? FALLBACK_CIVILIZATION_ENVIRONMENT;
  const visualState = React.useMemo(() => deriveCivilizationVisualState({
    civilization,
    deploymentSites,
    profile,
    fallbackTier: tier,
  }), [civilization, deploymentSites, profile, tier]);
  const previousSiteIdsRef = React.useRef<Set<string> | null>(null);
  const previousPendingRepairIdsRef = React.useRef<Set<string> | null>(null);
  const hasInitializedScanSelectionRef = React.useRef(false);
  const scene = normalizeSceneForTier(sceneOverride, tier, deploymentSites);
  const visualIdentity = visualState.identities[scene];
  const scenePalette = getCivilizationScenePalette(visualIdentity, palette);
  const activePresentationDyad = civilization?.districtIdentity?.presentationDyad
    ?? civilization?.affinityIdentity?.presentationDyad
    ?? null;
  const activePresentationCommittedTurnCount =
    civilization?.districtIdentity?.presentationCommittedTurnCount
    ?? civilization?.affinityIdentity?.identityEpochs?.at(-1)?.startedTurnCount
    ?? null;
  const previousSceneRef = React.useRef<CivilizationSceneKind>(scene);
  const previousMaturityRef = React.useRef(visualState.historicalMaturity);
  const [sceneTransition, setSceneTransition] = React.useState<{
    from: CivilizationSceneKind;
    to: CivilizationSceneKind;
  } | null>(null);
  const [maturityTransition, setMaturityTransition] = React.useState<typeof visualState.historicalMaturity | null>(null);
  const [identityTransitionDyad, setIdentityTransitionDyad] = React.useState<CivilizationDyadId | null>(null);
  const availableScenes = React.useMemo(
    () => getAvailableScenePath(tier, deploymentSites),
    [deploymentSites, tier],
  );
  const sceneSites = React.useMemo(() => (
    deploymentSites.filter((site) => isSiteAvailableInScene(site, scene))
  ), [deploymentSites, scene]);
  const operationalSceneSites = React.useMemo(() => (
    sceneSites.filter(isCivilizationSiteOperational)
  ), [sceneSites]);
  const hasDominantBlueprintInScene = operationalSceneSites.some((site) => (
    shouldRenderDominantBlueprint(site, scene)
  ));
  const showPersistentLivingLayer = !compactScanLayout || !hasDominantBlueprintInScene;
  const artifactWorldAnchors = React.useMemo(() => (
    buildCivilizationArtifactWorldAnchors(
      sceneSites,
      scene,
      visualIdentity.dyad,
      resolvedEnvironmentIdentity?.variantId,
      [],
      compactScanLayout,
      Object.values(civilization?.districtIdentity?.districts ?? {}),
    )
  ), [
    resolvedEnvironmentIdentity?.variantId,
    compactScanLayout,
    sceneSites,
    scene,
    visualIdentity.dyad,
    civilization?.districtIdentity?.districts,
  ]);
  const blueprintWorldAnchors = React.useMemo(() => (
    buildCivilizationBlueprintWorldAnchors(
      sceneSites,
      scene,
      resolvedEnvironmentIdentity?.variantId,
      compactScanLayout,
    )
  ), [compactScanLayout, resolvedEnvironmentIdentity?.variantId, scene, sceneSites]);
  const manifestationWorldAnchors = React.useMemo(() => new Map([
    ...artifactWorldAnchors,
    ...blueprintWorldAnchors,
  ]), [artifactWorldAnchors, blueprintWorldAnchors]);
  const settlementAnchors = React.useMemo(() => (
    [...artifactWorldAnchors.values()].map(({ x, y }) => ({ x, y }))
  ), [artifactWorldAnchors]);
  const districtAffinityAccents = React.useMemo(() => {
    const affinityCounts = new Map<ArtifactPlacementFamily, Map<string, {
      count: number;
      tone: string;
    }>>();

    sceneSites.forEach((site) => {
      if (site.kind !== 'artifact') return;
      const placement = artifactWorldAnchors.get(site.id)?.placement;
      if (!placement) return;
      const districtCounts = affinityCounts.get(placement) ?? new Map();
      const current = districtCounts.get(site.affinity) ?? {
        count: 0,
        tone: getCivilizationSiteTone(site),
      };
      districtCounts.set(site.affinity, { ...current, count: current.count + 1 });
      affinityCounts.set(placement, districtCounts);
    });

    const accents: Partial<Record<ArtifactPlacementFamily, CivilizationDistrictAffinityAccent>> = {};
    affinityCounts.forEach((counts, placement) => {
      const ranked = [...counts.entries()].sort((left, right) => (
        right[1].count - left[1].count || left[0].localeCompare(right[0])
      ));
      const primary = ranked[0];
      if (!primary) return;
      const secondary = ranked[1] ?? primary;
      accents[placement] = {
        primaryTone: primary[1].tone,
        secondaryTone: secondary[1].tone,
        composition: ranked.map(([affinity, value]) => `${affinity}:${value.count}`).join('|'),
      };
    });
    return accents;
  }, [artifactWorldAnchors, sceneSites]);
  const districtOccupancyCounts = React.useMemo(() => {
    const counts: Partial<Record<ArtifactPlacementFamily, number>> = {};
    sceneSites.forEach((site) => {
      if (site.kind !== 'artifact') return;
      const placement = artifactWorldAnchors.get(site.id)?.placement;
      if (!placement) return;
      counts[placement] = (counts[placement] ?? 0) + 1;
    });
    return counts;
  }, [artifactWorldAnchors, sceneSites]);
  const districtParcelOccupancyCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    artifactWorldAnchors.forEach((anchor) => {
      if (!anchor.districtParcelId) return;
      counts[anchor.districtParcelId] = (counts[anchor.districtParcelId] ?? 0) + 1;
    });
    return counts;
  }, [artifactWorldAnchors]);
  // Catalog coverage must fail if a physical host is missing; never revive the
  // retired trace renderer as a visual fallback.
  const scanEligibleSites = React.useMemo(() => (
    sceneSites.filter((site) => (
      (site.kind !== 'artifact' && site.kind !== 'blueprint') || manifestationWorldAnchors.has(site.id)
    ))
  ), [manifestationWorldAnchors, sceneSites]);
  const scanSites = scanEligibleSites;
  const sceneSignals = React.useMemo(() => buildSceneSignals(sceneSites), [sceneSites]);
  const sceneIdentity = React.useMemo(() => applyCanonicalAffinityIdentity(
    buildSceneIdentity(sceneSites),
    visualIdentity.primaryAffinity,
    visualIdentity.secondaryAffinity,
  ), [sceneSites, visualIdentity.primaryAffinity, visualIdentity.secondaryAffinity]);
  const sceneArchetype = React.useMemo(() => (
    civilization
      ? visualIdentity.plateArchetype
      : getCivilizationSceneArchetype(profile, sceneIdentity, sceneSignals)
  ), [civilization, profile, sceneIdentity, sceneSignals, visualIdentity.plateArchetype]);
  const scanLedgerSites = scanEligibleSites;
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
    selectSitesByIdOrder(scanSites, recentSiteIds)
  ), [recentSiteIds, scanSites]);
  const recentTraceSummary = React.useMemo(() => formatTraceNames(recentSites), [recentSites]);
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
    setSceneOverride((current) => normalizeSceneForTier(current, tier, deploymentSites));
  }, [deploymentSites, tier]);

  React.useEffect(() => {
    const previousScene = previousSceneRef.current;
    if (previousScene === scene) return undefined;
    previousSceneRef.current = scene;
    setSceneTransition({ from: previousScene, to: scene });
    const timeoutId = window.setTimeout(() => setSceneTransition(null), 1100);
    return () => window.clearTimeout(timeoutId);
  }, [scene]);

  React.useEffect(() => {
    const previousMaturity = previousMaturityRef.current;
    if (previousMaturity === visualState.historicalMaturity) return undefined;
    previousMaturityRef.current = visualState.historicalMaturity;
    setMaturityTransition(visualState.historicalMaturity);
    const timeoutId = window.setTimeout(() => setMaturityTransition(null), 2300);
    return () => window.clearTimeout(timeoutId);
  }, [visualState.historicalMaturity]);

  React.useEffect(() => {
    setIdentityTransitionDyad(null);
    if (!activePresentationDyad || activePresentationCommittedTurnCount === null) {
      return undefined;
    }
    const environmentSeed = resolvedEnvironmentIdentity?.matchScopedSeed ?? 0;
    const seenKey = [
      'luminae_civilization_identity_seen',
      environmentSeed,
      CIVILIZATION_DISTRICT_IDENTITY_POLICY_ID,
      activePresentationDyad,
      activePresentationCommittedTurnCount,
    ].join(':');
    try {
      if (sessionStorage.getItem(seenKey)) return undefined;
      sessionStorage.setItem(seenKey, '1');
    } catch {
      // A private browsing policy should not suppress the presentation.
    }
    setIdentityTransitionDyad(activePresentationDyad);
    const timeoutId = window.setTimeout(() => setIdentityTransitionDyad(null), 2600);
    return () => {
      window.clearTimeout(timeoutId);
      setIdentityTransitionDyad(null);
    };
  }, [
    activePresentationCommittedTurnCount,
    activePresentationDyad,
    resolvedEnvironmentIdentity?.matchScopedSeed,
  ]);

  React.useEffect(() => {
    if (!scanActive) {
      setHoveredSiteId(null);
      setInspectedSiteId(null);
      setZoomedSiteId(null);
      setInspectionOriginScene(null);
      setScanClusterFocus(null);
      setScanIndexOpen(false);
      setSelectedArtifactSiteIds(new Set());
      if (hasInitializedScanSelectionRef.current) {
        setSelectedSiteId(null);
      } else {
        hasInitializedScanSelectionRef.current = true;
      }
      return;
    }
    hasInitializedScanSelectionRef.current = true;
    if (hoveredSiteId && !scanSites.some((site) => site.id === hoveredSiteId)) {
      setHoveredSiteId(null);
    }
    const availableSiteIds = new Set(scanSites.map((site) => site.id));
    setSelectedArtifactSiteIds((current) => {
      const next = new Set([...current].filter((siteId) => availableSiteIds.has(siteId)));
      return next.size === current.size ? current : next;
    });
    if (zoomedSiteId && !availableSiteIds.has(zoomedSiteId)) setZoomedSiteId(null);
    if (!selectedSiteId) return;
    if (scanSites.some((site) => site.id === selectedSiteId)) return;
    setSelectedSiteId(null);
    setInspectedSiteId(null);
    setZoomedSiteId(null);
    setInspectionOriginScene(null);
  }, [hoveredSiteId, scanActive, scanSites, selectedSiteId, zoomedSiteId]);

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
    if (primaryNewSite) {
      setSceneOverride(normalizeSceneForTier(getNativeSceneForSite(primaryNewSite), tier, deploymentSites));
      if (primaryNewSite.kind !== 'artifact') setScanActive(true);
    }
    // Let the reveal breathe before the player opens the detailed dossier.
    setSelectedSiteId(null);
    setInspectedSiteId(null);
    setZoomedSiteId(null);
    setInspectionOriginScene(null);
    setScanClusterFocus(null);
    setSelectedArtifactSiteIds(new Set());
    const timeoutId = window.setTimeout(() => {
      setRecentSiteIds((current) => current.filter((siteId) => !newlyVisibleIds.includes(siteId)));
    }, RECENT_TRACE_VISIBLE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [deploymentSites, tier]);

  React.useEffect(() => {
    const currentPendingIds = new Set(pendingRepairArtifactIds);
    const trackedIds = previousPendingRepairIdsRef.current ?? new Set<string>();
    currentPendingIds.forEach((artifactId) => trackedIds.add(artifactId));
    previousPendingRepairIdsRef.current = trackedIds;

    const completedArtifactIds = [...trackedIds].filter((artifactId) => (
      !currentPendingIds.has(artifactId) && deploymentSites.some((site) => (
        site.artifactId === artifactId && site.implementationState !== 'damaged'
      ))
    ));
    if (completedArtifactIds.length === 0) return;

    completedArtifactIds.forEach((artifactId) => trackedIds.delete(artifactId));
    setRepairedSiteIds(deploymentSites
      .filter((site) => Boolean(site.artifactId && completedArtifactIds.includes(site.artifactId)))
      .map((site) => site.id));
  }, [deploymentSites, pendingRepairArtifactIds]);

  React.useEffect(() => {
    if (repairedSiteIds.length === 0) return undefined;
    const timeoutId = window.setTimeout(() => setRepairedSiteIds([]), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [repairedSiteIds]);

  const toggleScan = React.useCallback(() => {
    setScanActive((current) => {
      const next = !current;
      if (!next) {
        setSelectedSiteId(null);
        setInspectedSiteId(null);
        setZoomedSiteId(null);
        setInspectionOriginScene(null);
        setScanClusterFocus(null);
        setScanIndexOpen(false);
        setSelectedArtifactSiteIds(new Set());
        setHoveredSiteId(null);
      }
      return next;
    });
  }, []);

  React.useEffect(() => {
    const displayableIds = externalRecentSiteIds.filter((siteId) => (
      deploymentSites.some((site) => site.id === siteId)
    ));
    if (displayableIds.length === 0) return undefined;

    const primaryRecentSite = deploymentSites.find((site) => site.id === displayableIds[0]);
    setRecentSiteIds((current) => prioritizeRecentCivilizationSiteIds(displayableIds, current));
    if (primaryRecentSite) {
      setSceneOverride(normalizeSceneForTier(getNativeSceneForSite(primaryRecentSite), tier, deploymentSites));
      if (primaryRecentSite.kind !== 'artifact') setScanActive(true);
    }
    // Keep the new trace visible without covering its first presentation with details.
    setSelectedSiteId(null);
    setInspectedSiteId(null);
    setZoomedSiteId(null);
    setInspectionOriginScene(null);
    setScanClusterFocus(null);
    setSelectedArtifactSiteIds(new Set());

    const timeoutId = window.setTimeout(() => {
      setRecentSiteIds((current) => current.filter((siteId) => !displayableIds.includes(siteId)));
      onRecentSiteIdsSeen?.(displayableIds);
    }, RECENT_TRACE_VISIBLE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [deploymentSites, externalRecentSiteIds, onRecentSiteIdsSeen, tier]);
  const selectedArtifactFocusId = [...selectedArtifactSiteIds].at(-1) ?? null;
  const selectedSite = React.useMemo(() => (
    scanActive
      ? scanSites.find((site) => site.id === (selectedSiteId ?? selectedArtifactFocusId)) ?? null
      : null
  ), [scanActive, scanSites, selectedArtifactFocusId, selectedSiteId]);
  const focusedSite = scanActive
    ? selectedSite ?? visibleRecentSites[0] ?? null
    : null;
  const focusedSiteId = focusedSite?.id ?? null;
  const linkedSiteId = scanActive ? hoveredSiteId ?? zoomedSiteId ?? selectedSiteId ?? focusedSiteId : null;
  const scanMapSites = scanSites;
  const dossierSite = scanActive
    ? scanSites.find((site) => site.id === inspectedSiteId) ?? null
    : null;
  const dossierAnchor = dossierSite ? manifestationWorldAnchors.get(dossierSite.id) : undefined;
  const dossierPreferredSide = dossierSite && (dossierAnchor?.x ?? dossierSite.anchor.x) > 55 ? 'left' : 'right';
  const dossierPreferredVerticalSide = dossierSite && (dossierAnchor?.y ?? dossierSite.anchor.y) > 50
    ? 'top'
    : 'bottom';
  const dossierDistrictLabel = dossierAnchor?.district
    ? formatScanDistrictLabel(dossierAnchor.district)
    : null;
  const zoomAnchor = zoomedSiteId ? manifestationWorldAnchors.get(zoomedSiteId) : undefined;
  const cameraFocusOffset = zoomedSiteId && zoomAnchor
    ? {
        x: Math.max(-28, Math.min(
          28,
          (dossierPreferredSide === 'left'
            ? compactScanLayout ? 76 : 72
            : compactScanLayout ? 24 : 28) - zoomAnchor.x,
        )),
        y: Math.max(-24, Math.min(
          24,
          (dossierPreferredVerticalSide === 'top'
            ? compactScanLayout ? 74 : 68
            : compactScanLayout ? 26 : 32) - zoomAnchor.y,
        )),
      }
    : { x: 0, y: 0 };
  const pendingRepairIdSet = React.useMemo(
    () => new Set(pendingRepairArtifactIds),
    [pendingRepairArtifactIds],
  );
  const repairedSiteIdSet = React.useMemo(() => new Set(repairedSiteIds), [repairedSiteIds]);
  const selectedArtifactSites = React.useMemo(() => scanSites.filter((site) => (
    site.kind === 'artifact' && selectedArtifactSiteIds.has(site.id)
  )), [scanSites, selectedArtifactSiteIds]);
  const selectedRepairableArtifactIds = React.useMemo(() => [...new Set(
    selectedArtifactSites
      .filter((site) => site.implementationState === 'damaged' && site.artifactId)
      .map((site) => site.artifactId!)
      .filter((artifactId) => !pendingRepairIdSet.has(artifactId)),
  )], [pendingRepairIdSet, selectedArtifactSites]);
  const selectedPendingRepairCount = React.useMemo(() => selectedArtifactSites.filter((site) => (
    Boolean(site.artifactId && pendingRepairIdSet.has(site.artifactId))
  )).length, [pendingRepairIdSet, selectedArtifactSites]);
  const sceneOverlaySites = sceneSites;
  const sceneOverlaySignals = React.useMemo(() => buildSceneSignals(sceneOverlaySites), [sceneOverlaySites]);
  const sceneOverlayIdentity = React.useMemo(() => applyCanonicalAffinityIdentity(
    buildSceneIdentity(sceneOverlaySites),
    visualIdentity.primaryAffinity,
    visualIdentity.secondaryAffinity,
  ), [sceneOverlaySites, visualIdentity.primaryAffinity, visualIdentity.secondaryAffinity]);
  const sceneOverlayArchetype = React.useMemo(() => (
    civilization
      ? sceneArchetype
      : getCivilizationSceneArchetype(profile, sceneOverlayIdentity, sceneOverlaySignals)
  ), [civilization, profile, sceneArchetype, sceneOverlayIdentity, sceneOverlaySignals]);
  const focusScanSite = React.useCallback((siteId: string) => {
    const site = deploymentSites.find((entry) => entry.id === siteId);
    if (!site) return;
    if (site.kind === 'artifact') {
      setSelectedArtifactSiteIds((current) => {
        const next = new Set(current);
        if (next.has(siteId)) next.delete(siteId);
        else next.add(siteId);
        return next;
      });
      setSelectedSiteId(null);
    } else {
      setSelectedSiteId(siteId);
    }
    setInspectedSiteId(null);
    setZoomedSiteId(null);
    setScanActive(true);
  }, [deploymentSites]);
  const openScanDossier = React.useCallback((siteId: string) => {
    const site = deploymentSites.find((entry) => entry.id === siteId);
    if (!site) return;
    setSelectedSiteId(siteId);
    if (site.kind === 'artifact') {
      setSelectedArtifactSiteIds((current) => new Set(current).add(siteId));
    }
    setInspectedSiteId(siteId);
    setZoomedSiteId(siteId);
    setInspectionOriginScene((current) => current ?? scene);
    setScanClusterFocus(null);
    setScanActive(true);
    setSceneOverride(normalizeSceneForTier(getNativeSceneForSite(site), tier, deploymentSites));
  }, [deploymentSites, scene, tier]);
  const focusScanCluster = React.useCallback((cluster: CivilizationScanMarkerCluster) => {
    setScanClusterFocus(cluster);
    setInspectedSiteId(null);
    setZoomedSiteId(null);
    setSelectedSiteId(null);
    setScanActive(true);
  }, []);
  const returnToOverview = React.useCallback(() => {
    if (inspectionOriginScene) {
      setSceneOverride(normalizeSceneForTier(inspectionOriginScene, tier, deploymentSites));
    }
    setZoomedSiteId(null);
    setInspectedSiteId(null);
    setInspectionOriginScene(null);
    setScanClusterFocus(null);
  }, [deploymentSites, inspectionOriginScene, tier]);
  const queueArtifactRepairs = React.useCallback(async (artifactIds: readonly string[]) => {
    if (!onRepairArtifacts || artifactIds.length === 0 || repairSubmitting) return;
    setRepairSubmitting(true);
    try {
      await onRepairArtifacts(artifactIds);
    } finally {
      setRepairSubmitting(false);
    }
  }, [onRepairArtifacts, repairSubmitting]);

  return (
    <section
      ref={sceneRootRef}
      className={`civilization-scene-panel relative overflow-hidden bg-[#050914] ${presentationMode
        ? 'h-full border-0'
        : 'rounded-[10px] border border-white/14 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035),0_22px_62px_rgba(0,0,0,0.28)]'}`}
      aria-label="Civilization scene"
      data-testid="civilization-scene-panel"
      data-scene={scene}
      data-archetype={sceneArchetype ?? undefined}
      data-visual-identity={visualIdentity.morphologyId}
      data-identity-layer={visualIdentity.layer ?? undefined}
      data-identity-status={visualIdentity.status}
      data-complexity={visualState.scenes[scene].stage}
      data-global-complexity={visualState.globalComplexity}
      data-city-development-stage={visualState.cityDevelopmentStage}
      data-city-development-label={visualState.cityDevelopmentLabel}
      data-current-reach={visualState.scenes[scene].reach}
      data-civilization-performance={compactScanLayout ? 'mobile' : 'full'}
      data-render-generation="authored-world"
      data-placement-proof={placementProof ? 'active' : undefined}
      data-stability={stabilityBand}
      data-civilization-motion={motionPaused ? 'paused' : 'active'}
      data-civilization-visibility={inViewport ? 'visible' : 'offscreen'}
      style={{
        borderColor: `${scenePalette.primary}33`,
        boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.035), 0 22px 62px rgba(0,0,0,0.28), 0 0 34px ${scenePalette.primary}12`,
      }}
    >
      <MarketSceneStyles />
      <CivilizationMorphologyStyles />
      {!presentationMode && <header
        className="civilization-scene-header relative z-20 flex flex-col gap-2 border-b border-white/12 bg-[#050914]/72 px-3 py-2.5 backdrop-blur-md sm:px-3.5 sm:py-3"
        style={{
          background: `linear-gradient(135deg, rgba(5,9,20,0.76), ${scenePalette.primary}12)`,
        }}
      >
        {permanentAffinities}
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-3">
            <h2 className="min-w-0 truncate text-base font-semibold text-white sm:text-lg">
              {civilizationName ?? getCivilizationSceneTitle(visualIdentity)}
            </h2>
            {(stabilityBand !== 'stable' || activeConditions.length > 0) && (
              <span
                className="inline-flex min-h-6 shrink-0 items-center gap-1.5 rounded-[6px] border border-[#e78d62]/35 bg-[#e78d62]/10 px-2 text-[8px] font-black uppercase tracking-[0.12em] text-[#ffc3a9] sm:text-[9px]"
                data-testid="civilization-attention-state"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-[#e78d62] shadow-[0_0_8px_rgba(231,141,98,0.72)]" aria-hidden="true" />
                {activeConditions.length > 0
                  ? `${activeConditions.length} active condition${activeConditions.length === 1 ? '' : 's'}`
                  : CIVILIZATION_STABILITY_LABELS[stabilityBand]}
              </span>
            )}
          </div>
          {recentTraceSummary && (
            <p className="mt-0.5 line-clamp-2 text-[9px] font-black uppercase tracking-[0.16em] text-[#dfb86b] sm:mt-1 sm:truncate sm:text-[10px] sm:tracking-[0.18em]" aria-live="polite">
              New work realized // {recentTraceSummary}
              {recentZoomHint ? ` // ${recentZoomHint}` : ''}
            </p>
          )}
        </div>
        <div className="civilization-scene-scale-path flex flex-wrap items-center gap-1 sm:gap-1.5" aria-label="Civilization scale path">
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
                  onClick={() => {
                    returnToOverview();
                    setSceneOverride(item);
                  }}
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
                      {getCivilizationImpactKind(recentNativeTargetSite ?? undefined) === 'blueprint'
                        ? <FileText className="h-2.5 w-2.5" aria-hidden="true" />
                        : suggestedScaleChip}
                    </span>
                  )}
                </button>
              </React.Fragment>
            );
          })}
          {deploymentSites.length > 0 && (
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
      </header>}

      <div
        className={`civilization-scene-canvas relative overflow-hidden bg-[#030711] ${presentationMode
          ? 'h-full min-h-0'
          : compactScanLayout
            ? 'aspect-[4/5] h-auto'
            : 'aspect-video h-auto'}`}
        role="group"
        aria-label="Civilization portrait where artifacts, Blueprints, and allied Luminaries are represented as environmental changes at believable scale."
          style={{
            background: `radial-gradient(circle at 50% 34%, ${scenePalette.primary}13, transparent 44%), #030711`,
            ...(fittedCanvasWidth === undefined ? {} : {
              width: '100%',
              maxWidth: fittedCanvasWidth,
              marginInline: 'auto',
            }),
          }}
      >
        {identityTransitionDyad && (
          <>
            <div
              className="pointer-events-none absolute inset-[8%] z-[70] border border-[#dfb86b]/25"
              style={{
                animation: 'civIdentityMetamorphosis 2.5s ease-out both',
                background: `radial-gradient(ellipse at 50% 58%, ${visualIdentity.primaryTone}38 0%, ${visualIdentity.secondaryTone}1E 34%, transparent 70%)`,
              }}
              aria-hidden="true"
            />
            <button
              type="button"
              className="absolute inset-x-0 top-3 z-[95] mx-auto w-fit max-w-[calc(100%-24px)] border border-[#dfb86b]/35 bg-[#030711]/88 px-4 py-2 text-center shadow-[0_10px_32px_rgba(0,0,0,0.55)] backdrop-blur-sm"
              onClick={() => setIdentityTransitionDyad(null)}
              data-testid="civilization-identity-transition"
              aria-label="Dismiss civilization evolution notice"
            >
              <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#dfb86b]">
                Civilization evolved
              </span>
              <span className="mt-0.5 block text-sm font-semibold text-white">
                {CIVILIZATION_DYAD_DEFINITIONS.find((definition) => definition.id === identityTransitionDyad)?.name ?? identityTransitionDyad}
                {' '}architecture now leads
              </span>
              <span className="mt-0.5 block text-[10px] text-white/58">Earlier districts remain</span>
            </button>
          </>
        )}
        {repairedSiteIds.length > 0 && (
          <div
            className="pointer-events-none absolute left-1/2 top-2 z-[92] flex -translate-x-1/2 items-center gap-2 border border-[#9af0c1]/48 bg-[#06140f]/94 px-3 py-2 text-[#d9ffe9] shadow-[0_12px_32px_rgba(0,0,0,0.58),0_0_22px_rgba(110,231,167,0.2)] backdrop-blur-md"
            role="status"
            aria-live="polite"
            data-testid="civilization-repair-complete-notice"
          >
            <span className="grid h-6 w-6 place-items-center rounded-full border border-[#9af0c1]/60 bg-[#9af0c1]/10">
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.14em]">
              {repairedSiteIds.length} {repairedSiteIds.length === 1 ? 'Artifact' : 'Artifacts'} restored
            </span>
          </div>
        )}
        {(zoomedSiteId || scanClusterFocus) && (
          <button
            type="button"
            className="absolute left-2 top-2 z-[90] inline-flex min-h-9 items-center gap-2 border border-[#82ddff]/38 bg-[#050914]/92 px-3 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-[0_10px_28px_rgba(0,0,0,0.56)] backdrop-blur-md transition-colors hover:border-[#82ddff]/72 hover:bg-[#0a1724]/96 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#82ddff]/80 sm:left-3 sm:top-3"
            onClick={returnToOverview}
            data-testid="civilization-return-overview"
          >
            <ZoomOut className="h-4 w-4 text-[#b9efff]" aria-hidden="true" />
            Overview
          </button>
        )}
        {scanActive && !dossierSite && selectedArtifactSites.length > 0 && (
          <div
            className="absolute right-2 top-2 z-[88] w-[min(15rem,calc(100%-1rem))] border border-white/14 bg-[#050914]/92 p-1.5 shadow-[0_14px_34px_rgba(0,0,0,0.58)] backdrop-blur-md sm:right-3 sm:top-3 sm:w-64 sm:p-2"
            data-testid="civilization-artifact-selection-toolbar"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
              <span className="text-[8px] font-black uppercase tracking-[0.16em] text-white/58">
                {selectedArtifactSites.length} selected
                {' · '}{selectedRepairableArtifactIds.length} repairable
                {selectedPendingRepairCount > 0 ? ` · ${selectedPendingRepairCount} queued` : ''}
              </span>
              <button
                type="button"
                className="grid h-6 w-6 place-items-center rounded-full text-white/48 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                aria-label="Clear Artifact selection"
                onClick={() => {
                  setSelectedArtifactSiteIds(new Set());
                  setSelectedSiteId(null);
                }}
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
            <RepairActionButton
              count={selectedRepairableArtifactIds.length || selectedPendingRepairCount}
              compact
              pending={selectedRepairableArtifactIds.length === 0 && selectedPendingRepairCount > 0}
              disabled={!onRepairArtifacts || repairSubmitting || selectedRepairableArtifactIds.length === 0}
              onClick={() => void queueArtifactRepairs(selectedRepairableArtifactIds)}
            />
          </div>
        )}
        <div
          className="absolute inset-0 transition-transform duration-700 ease-[cubic-bezier(0.2,0.72,0.18,1)] motion-reduce:transition-none"
          data-testid="civilization-scene-camera"
          data-camera-shift={zoomedSiteId && zoomAnchor
            ? 'artifact-focus'
            : scanClusterFocus
              ? 'district-focus'
              : 'resting'}
          data-camera-focus-offset={`${cameraFocusOffset.x},${cameraFocusOffset.y}`}
          style={{
            transformOrigin: zoomedSiteId && zoomAnchor
              ? `${zoomAnchor.x}% ${zoomAnchor.y}%`
              : scanClusterFocus
                ? `${scanClusterFocus.anchor.x}% ${scanClusterFocus.anchor.y}%`
              : '50% 50%',
            transform: zoomedSiteId && zoomAnchor
              ? `translate(${cameraFocusOffset.x}%, ${cameraFocusOffset.y}%) scale(${compactScanLayout ? 1.62 : 1.92})`
              : scanClusterFocus
                ? `scale(${compactScanLayout ? 1.38 : 1.28})`
                : 'scale(1)',
          }}
        >
        <CinematicCivilizationPlate
          scene={scene}
          signals={sceneOverlaySignals}
          archetype={sceneOverlayArchetype}
          dyad={visualIdentity.dyad}
          environmentIdentity={resolvedEnvironmentIdentity}
          evolutionStage={scene === 'surface'
            ? visualState.cityDevelopmentStage >= 8
              ? 3
              : visualState.cityDevelopmentStage >= 6
                ? 2
                : visualState.cityDevelopmentStage >= 5
                  ? 1
                  : 0
            : visualState.scenes[scene].stage}
          civilizationMaturity={visualState.historicalMaturity}
          settlementPhase={visualState.settlementPhase}
          cityDevelopmentStage={visualState.cityDevelopmentStage}
          scanActive={false}
          compact={compactScanLayout}
        />
        {placementProof && scene === 'surface' && visualIdentity.dyad === 'chrysalis' && (
          <CivilizationDistrictPlacementProof
            compact={compactScanLayout}
            environmentVariantId={resolvedEnvironmentIdentity.variantId}
            occupancyCounts={districtParcelOccupancyCounts}
          />
        )}
        <CivilizationIdentityContinuityLayer
          scene={scene}
          identities={visualState.identities}
          progress={visualState.scenes[scene]}
          maturity={visualState.historicalMaturity}
          compact={compactScanLayout}
          environmentVariantId={resolvedEnvironmentIdentity?.variantId}
          settlementAnchors={settlementAnchors}
          districtAffinityAccents={districtAffinityAccents}
          districtOccupancyCounts={districtOccupancyCounts}
          districtInstances={Object.values(civilization?.districtIdentity?.districts ?? {})}
          residentSites={sceneSites}
          placementProof={placementProof}
        />
        <CivilizationSystemStateLayer
          scene={scene}
          stabilityBand={stabilityBand}
          activeConditions={activeConditions}
        />
        {showPersistentLivingLayer && (
          <CivilizationLivingWorldLayer
            scene={scene}
            dyad={visualIdentity.dyad}
            operationalShares={civilization?.affinityIdentity.normalizedOperationalShares}
            activeConditions={activeConditions}
          />
        )}
        <CivilizationArtifactManifestationLayer
          sites={sceneSites}
          scene={scene}
          dyad={visualIdentity.dyad}
          environmentVariantId={resolvedEnvironmentIdentity?.variantId}
          identityEpochs={[]}
          scanActive={scanActive}
          compact={compactScanLayout}
          focusedSiteId={linkedSiteId}
          recentSiteIds={recentSiteIds}
          repairedSiteIds={repairedSiteIds}
          activeConditions={activeConditions}
          artifactRenderingIds={artifactRenderingIds}
          districtInstances={Object.values(civilization?.districtIdentity?.districts ?? {})}
          onHoverSite={setHoveredSiteId}
        />
        <CivilizationBlueprintManifestationLayer
          sites={operationalSceneSites.filter((site) => shouldRenderDominantBlueprint(site, scene))}
          scene={scene}
          compact={compactScanLayout}
          environmentVariantId={resolvedEnvironmentIdentity?.variantId}
        />
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
        {scanActive && (
          <ScanMapPins
            sites={scanMapSites}
            artifactWorldAnchors={manifestationWorldAnchors}
            annotationOnly
            selectedSiteIds={selectedArtifactSiteIds}
            focusedSiteId={linkedSiteId}
            recentSiteIds={recentSiteIds}
            pendingRepairArtifactIds={pendingRepairIdSet}
            repairedSiteIds={repairedSiteIdSet}
            focusedClusterId={scanClusterFocus?.id ?? null}
            forceAll
            compact={compactScanLayout}
            onSelect={focusScanSite}
            onInspect={openScanDossier}
            onFocusCluster={focusScanCluster}
            onHover={setHoveredSiteId}
          />
        )}
        </div>

        {dossierSite && (
          <SiteDossier
            site={dossierSite}
            forgedArtifacts={forgedArtifacts}
            civilization={civilization}
            currentScene={scene}
            preferredSide={dossierPreferredSide}
            preferredVerticalSide={dossierPreferredVerticalSide}
            districtLabel={dossierDistrictLabel}
            onZoomToNative={(nativeScene) => {
              setSelectedSiteId(dossierSite.id);
              setInspectedSiteId(dossierSite.id);
              setZoomedSiteId(dossierSite.id);
              setSceneOverride(nativeScene);
              setScanActive(true);
            }}
            repairPending={Boolean(dossierSite.artifactId && pendingRepairIdSet.has(dossierSite.artifactId))}
            repairSubmitting={repairSubmitting}
            onRepair={onRepairArtifacts
              ? (artifactId) => void queueArtifactRepairs([artifactId])
              : undefined}
            onOpenArtifact={onOpenArtifact}
            onClose={() => {
              returnToOverview();
            }}
            isRecent={recentSiteIds.includes(dossierSite.id)}
          />
        )}
        {sceneTransition && (
          <CivilizationScaleTransition
            from={sceneTransition.from}
            to={sceneTransition.to}
            primaryTone={visualIdentity.primaryTone}
          />
        )}
        {maturityTransition && (
          <CivilizationMaturityCinematic
            maturity={maturityTransition}
            tone={visualIdentity.primaryTone}
          />
        )}
      </div>
      {scanActive && !dossierSite && compactScanLayout && focusedSite && (
        <div
          className="civilization-mobile-scan-dock border-t border-white/10 bg-[#050914]/94 p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]"
          data-testid="civilization-mobile-scan-dock"
        >
          <MobileScanPrimaryReadout
            site={focusedSite}
            isRecent={Boolean(focusedSite && recentSiteIds.includes(focusedSite.id))}
            onSelect={openScanDossier}
          />
        </div>
      )}
      {scanActive && !dossierSite && !compactScanLayout && (
        <div
          className="civilization-desktop-scan-rail hidden border-t border-white/10 bg-[#050914]/88 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] sm:block"
          data-testid="civilization-desktop-scan-rail"
        >
          <button
            type="button"
            className="flex min-h-9 w-full items-center justify-between gap-3 px-3 py-2 text-[8px] font-black uppercase tracking-[0.16em] text-white/58 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/55"
            aria-expanded={scanIndexOpen}
            onClick={() => setScanIndexOpen((current) => !current)}
          >
            <span className="inline-flex items-center gap-1.5">
              <ChevronRight className={`h-3 w-3 transition-transform ${scanIndexOpen ? 'rotate-90' : ''}`} aria-hidden="true" />
              Artifact index
            </span>
            <span className="text-white/38">{scanLedgerSites.length} records</span>
          </button>
          {scanIndexOpen && (
            <div className="border-t border-white/8 p-2">
              <InfluenceTray
                sites={scanLedgerSites}
                selectedSiteId={selectedSiteId ?? selectedArtifactFocusId}
                overflowCount={0}
                clusterGroups={[]}
                recentSiteIds={recentSiteIds}
                onSelect={focusScanSite}
                horizontal
              />
            </div>
          )}
        </div>
      )}
      {scanActive && (
        <CivilizationHistoryRibbon
          visualState={visualState}
          currentScene={scene}
          onFocusMilestone={(milestone) => {
            if (milestone.scene) {
              setSceneOverride(normalizeSceneForTier(milestone.scene, tier, deploymentSites));
            }
            if (milestone.siteId) {
              setSelectedSiteId(milestone.siteId);
              setInspectedSiteId(milestone.siteId);
              setScanActive(true);
            }
          }}
        />
      )}
    </section>
  );
}
