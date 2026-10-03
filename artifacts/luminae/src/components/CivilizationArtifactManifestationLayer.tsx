import React from 'react';
import type { CivilizationDistrictInstance } from '@workspace/api-client-react';
import {
  ARTIFACT_CATALOG,
  ARTIFACT_PLACEMENT_FAMILIES,
  getArtifactPlacementPhysicalContract,
  isCivilizationManifestationAssignmentCompatible,
  type ArtifactId,
  type ArtifactPlacementFamily,
  type CivilizationCameraScale,
  type CivilizationCoreCondition,
  type CivilizationDyadId,
  type CivilizationEnvironmentVariantId,
  type CivilizationIdentityEpoch,
  type CivilizationManifestationDistrict,
  type CivilizationManifestationSubstrate,
  type CivilizationManifestationSupportMode,
} from '@workspace/game-types';
import { CivilizationArtifactStructure } from '@/components/CivilizationArtifactStructure';
import {
  getCivilizationDistrictResidents,
  getCivilizationDistrictResidentWorldAnchor,
} from '@/lib/civilizationDistrictResidents';
import { AFFINITY_META } from '@/lib/affinityMeta';
import {
  getArtifactManifestationProfile,
  type ArtifactManifestationProfile,
} from '@/lib/civilizationArtifactManifestations';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';
import {
  getCivilizationManifestationArt,
  type CivilizationManifestationArt,
} from '@/lib/civilizationManifestationArtRegistry';
import {
  getCivilizationEnvironmentSocket,
  type CivilizationSocketDepth,
  type CivilizationSocketOcclusion,
} from '@/lib/civilizationEnvironmentSockets';
import {
  buildCanonicalSurfaceArtifactPlacementAssignments,
  getCivilizationSurfaceDistrictParcelsForFamily,
  type CivilizationDistrictAttachmentRole,
} from '@/lib/civilizationSurfaceDistrictPlan';

type CivilizationManifestationScene = CivilizationCameraScale;

const ARTIFACT_STATE_STYLES = `
  .civ-artifact-construct {
    transform-origin: 50% 92%;
    animation: civ-artifact-construct 1.55s cubic-bezier(0.2, 0.72, 0.18, 1) both;
  }
  .civ-artifact-arrival-ring {
    animation: civ-artifact-arrival-ring 1.35s ease-out both;
  }
  .civ-host-impact-ring {
    animation: civ-host-impact-ring 1.45s ease-out both;
  }
  .civ-artifact-repair-ring {
    animation: civ-artifact-repair-ring 2.2s cubic-bezier(0.2, 0.72, 0.18, 1) both;
  }
  @keyframes civ-artifact-construct {
    0% {
      clip-path: inset(100% 0 0 0);
      opacity: 0.18;
      transform: translate3d(0, 9%, 0) scale(0.94);
    }
    58% {
      clip-path: inset(20% 0 0 0);
      opacity: 0.88;
      transform: translate3d(0, 1.5%, 0) scale(0.985);
    }
    82% {
      clip-path: inset(0 0 0 0);
      opacity: 1;
      transform: translate3d(0, -1%, 0) scale(1.018);
    }
    100% {
      clip-path: inset(0 0 0 0);
      opacity: 1;
      transform: translate3d(0, 0, 0) scale(1);
    }
  }
  @keyframes civ-artifact-arrival-ring {
    0% { opacity: 0; transform: scale(0.54); }
    28% { opacity: 0.72; }
    100% { opacity: 0; transform: scale(1.28); }
  }
  @keyframes civ-host-impact-ring {
    0% { opacity: 0; transform: scale(0.7); }
    34% { opacity: 0.58; }
    100% { opacity: 0; transform: scale(1.16); }
  }
  @keyframes civ-artifact-repair-ring {
    0% { opacity: 0; transform: scale(0.68); }
    18% { opacity: 0.95; transform: scale(0.88); }
    52% { opacity: 0.72; transform: scale(1.05); }
    100% { opacity: 0; transform: scale(1.28); }
  }
  .civ-artifact-state-smoke {
    width: 7px;
    height: 18px;
    border-radius: 50%;
    background: rgba(38, 42, 47, 0.76);
    box-shadow: 4px -6px 0 -1px rgba(62, 62, 64, 0.46), -3px -11px 0 -2px rgba(24, 27, 31, 0.36);
    filter: blur(1.6px);
    animation: civ-artifact-state-smoke 5.4s ease-in-out infinite;
  }
  .civ-artifact-state-beacon {
    border: 1px solid rgba(238, 184, 91, 0.82);
    border-radius: 50%;
    box-shadow: 0 0 9px rgba(238, 184, 91, 0.5), inset 0 0 5px rgba(238, 184, 91, 0.32);
    animation: civ-artifact-state-beacon 3.1s ease-in-out infinite;
  }
  .civ-artifact-state-disruption {
    width: 13px;
    height: 2px;
    border-radius: 1px;
    background: rgba(177, 126, 255, 0.78);
    box-shadow: 4px 4px 0 -0.5px rgba(255, 151, 104, 0.62);
    animation: civ-artifact-state-disruption 2.7s steps(5, end) infinite;
  }
  @keyframes civ-artifact-state-smoke {
    0%, 100% { transform: translate3d(0, 0, 0) scale(0.82); opacity: 0.38; }
    50% { transform: translate3d(2px, -8px, 0) scale(1.1); opacity: 0.76; }
  }
  @keyframes civ-artifact-state-beacon {
    0%, 100% { transform: scale(0.88); opacity: 0.44; }
    50% { transform: scale(1.12); opacity: 0.92; }
  }
  @keyframes civ-artifact-state-disruption {
    0%, 100% { transform: translate3d(-2px, 0, 0) rotate(-10deg); opacity: 0.18; }
    45% { transform: translate3d(2px, -2px, 0) rotate(8deg); opacity: 0.92; }
  }
  [data-civilization-motion="paused"] .civ-artifact-state-signal,
  [data-civilization-visibility="offscreen"] .civ-artifact-state-signal,
  [data-civilization-motion="paused"] .civ-artifact-construct,
  [data-civilization-motion="paused"] .civ-artifact-arrival-ring,
  [data-civilization-motion="paused"] .civ-host-impact-ring,
  [data-civilization-motion="paused"] .civ-artifact-repair-ring,
  [data-civilization-visibility="offscreen"] .civ-artifact-construct,
  [data-civilization-visibility="offscreen"] .civ-artifact-arrival-ring,
  [data-civilization-visibility="offscreen"] .civ-host-impact-ring,
  [data-civilization-visibility="offscreen"] .civ-artifact-repair-ring {
    animation-play-state: paused !important;
  }
  @media (prefers-reduced-motion: reduce) {
    .civ-artifact-state-signal { animation: none !important; opacity: 0.68; }
    .civ-artifact-construct,
    .civ-artifact-arrival-ring,
    .civ-host-impact-ring,
    .civ-artifact-repair-ring { animation: none !important; }
  }
`;

function placementMatchesScene(
  placement: ArtifactPlacementFamily,
  scene: CivilizationManifestationScene,
): boolean {
  const surface = placement === 'industrial_district' || placement === 'civic_core' ||
    placement === 'habitat_district' || placement === 'wilderness_margin' ||
    placement === 'subsurface_works' || placement === 'observatory_ridge' ||
    placement === 'transit_terminus' || placement === 'archive_quarter' ||
    placement === 'coastal_margin' || placement === 'containment_zone';
  const orbit = placement === 'low_orbit' || placement === 'high_orbit' ||
    placement === 'orbital_yard' || placement === 'habitat_orbit' ||
    placement === 'moonward_lane' || placement === 'atmosphere_edge';
  const stellar = placement === 'inner_system' || placement === 'habitable_orbits' ||
    placement === 'lagrange_network' || placement === 'outer_system' ||
    placement === 'heliopause' || placement === 'distributed_systems';
  const galaxy = placement === 'spiral_arm' || placement === 'coreward_region' ||
    placement === 'rimward_region' || placement === 'dark_sector' ||
    placement === 'distributed_clusters' || placement === 'interarm_void';
  return scene === 'surface' ? surface : scene === 'orbit' ? orbit : scene === 'stellar' ? stellar : galaxy;
}

interface ManifestationMember {
  site: CivilizationDeploymentSite;
  profile: ArtifactManifestationProfile;
}

interface ManifestationRenderItem {
  key: string;
  members: ManifestationMember[];
  placement: ArtifactPlacementFamily | null;
  styleDyad: CivilizationDyadId | null;
}

function getManifestationStyleDyad(
  site: CivilizationDeploymentSite,
  identityEpochs: readonly CivilizationIdentityEpoch[],
  fallbackDyad: CivilizationDyadId | null,
): CivilizationDyadId | null {
  const assignedTurn = site.manifestationAssignment?.assignmentTurnCount;
  if (identityEpochs.length === 0) return fallbackDyad;
  if (assignedTurn === null || assignedTurn === undefined) {
    return identityEpochs[0]?.dyad ?? fallbackDyad;
  }
  return [...identityEpochs]
    .reverse()
    .find((epoch) => (
      (epoch.startedTurnCount === null || epoch.startedTurnCount <= assignedTurn) &&
      (epoch.endedTurnCount === null || assignedTurn <= epoch.endedTurnCount)
    ))?.dyad ?? identityEpochs[0]?.dyad ?? fallbackDyad;
}

export interface CivilizationArtifactWorldAnchor {
  x: number;
  y: number;
  scanX: number;
  scanY: number;
  hostX: number;
  hostY: number;
  hostKey: string;
  placement: ArtifactPlacementFamily | null;
  district: CivilizationManifestationDistrict | null;
  substrate: CivilizationManifestationSubstrate | null;
  requiredSupport: CivilizationManifestationSupportMode | null;
  structuralAdaptation: 'native-grounding' | 'cliff-terrace' | 'shore-platform' | null;
  physicalValidity: 'authored' | 'invalid';
  authoredDepth: CivilizationSocketDepth;
  occlusion: CivilizationSocketOcclusion;
  socketScale: number;
  memberIndex: number;
  memberCount: number;
  districtParcelId: string | null;
  /** Only persisted district attachments can replace terrain support with a roof mount. */
  districtAttachmentRole?: CivilizationDistrictAttachmentRole;
}

type CanonicalArtifactWorldAnchor = Omit<CivilizationArtifactWorldAnchor, 'memberIndex' | 'memberCount'> & {
  artifactId: ArtifactId;
  memberIndex: number;
  memberCount: number;
};

function getPlacement(
  profile: ArtifactManifestationProfile,
  scene: CivilizationManifestationScene,
): ArtifactPlacementFamily | null {
  return profile.compatiblePlacementFamilies.find((candidate) => (
    placementMatchesScene(candidate, scene)
  )) ?? null;
}

function buildRenderItems(
  sites: readonly CivilizationDeploymentSite[],
  scene: CivilizationManifestationScene,
  dyad: CivilizationDyadId | null,
  identityEpochs: readonly CivilizationIdentityEpoch[],
): ManifestationRenderItem[] {
  const canonicalPlacementAssignments = buildCanonicalPlacementAssignments(scene);
  const members = sites
    .filter((site) => site.kind === 'artifact' && site.artifactId)
    .map((site) => ({
      site,
      profile: site.artifactManifestation ?? getArtifactManifestationProfile(site.artifactId!),
    }))
    .filter((member) => member.profile.nativeCameraScale === scene);

  const groups = new Map<string, ManifestationRenderItem>();
  for (const member of members) {
    const assignment = member.site.manifestationAssignment;
    if (assignment?.nativeScene === scene && !isCivilizationManifestationAssignmentCompatible(assignment)) {
      continue;
    }
    const placement = member.site.artifactId
      ? assignment?.nativeScene === scene
        ? assignment.placementFamily
        : canonicalPlacementAssignments.get(member.site.artifactId as ArtifactId) ??
        getPlacement(member.profile, scene)
      : null;
    const styleDyad = getManifestationStyleDyad(member.site, identityEpochs, dyad);
    const key = `native:${styleDyad ?? 'unformed'}:${placement ?? member.profile.manifestationFamily}`;
    const existing = groups.get(key);
    if (existing) {
      existing.members.push(member);
      continue;
    }
    groups.set(key, {
      key,
      members: [member],
      placement,
      styleDyad,
    });
  }
  return [...groups.values()];
}

const IMPLEMENTATION_SCALE_MULTIPLIER: Record<ArtifactManifestationProfile['implementationScale'], number> = {
  local: 0.82,
  civic: 1,
  planetary: 1.12,
  orbital: 0.62,
  system: 0.46,
  interstellar: 0.38,
  galactic: 0.3,
};

const PORTRAIT_PROMINENCE_LIMIT: Record<CivilizationManifestationScene, number> = {
  surface: 6,
  orbit: 6,
  stellar: 5,
  galaxy: 4,
};

const COMPACT_PROMINENCE_LIMIT: Record<CivilizationManifestationScene, number> = {
  surface: 4,
  orbit: 4,
  stellar: 3,
  galaxy: 3,
};

type CivilizationArtifactDepthBand = CivilizationSocketDepth;

function getArtifactGroundingMode(
  scene: CivilizationManifestationScene,
  placement: ArtifactPlacementFamily | null,
): CivilizationManifestationSupportMode {
  if (placement) return getArtifactPlacementPhysicalContract(placement).requiredSupport;
  if (scene === 'orbit') return 'orbital_stationkeeping';
  if (scene === 'stellar') return 'system_stationkeeping';
  if (scene === 'galaxy') return 'distributed_network';
  return 'district_foundation';
}

function getArtifactDepthBand(
  authoredDepth: CivilizationArtifactDepthBand,
  _focused: boolean,
  _recent: boolean,
): CivilizationArtifactDepthBand {
  return authoredDepth;
}

function getArtifactDepthFilter(
  scene: CivilizationManifestationScene,
  depthBand: CivilizationArtifactDepthBand,
  focused: boolean,
  tone: string,
): string {
  if (focused) {
    return `drop-shadow(0 0 6px ${tone}F2) drop-shadow(0 0 16px ${tone}9A)`;
  }
  if (depthBand === 'foreground') {
    return scene === 'surface'
      ? 'saturate(0.66) contrast(1.01) brightness(0.82) drop-shadow(0 2px 2px rgba(0,0,0,0.9))'
      : 'saturate(0.76) brightness(0.86) drop-shadow(0 2px 2px rgba(0,0,0,0.82))';
  }
  if (depthBand === 'midground') {
    return 'saturate(0.58) contrast(0.98) brightness(0.76)';
  }
  return 'saturate(0.5) contrast(0.94) brightness(0.68)';
}

function getArtifactDepthZIndex(depthBand: CivilizationArtifactDepthBand, y: number): number {
  const layerBase = depthBand === 'distance' ? 6 : depthBand === 'midground' ? 42 : 84;
  return layerBase + Math.round(y / 4);
}

function getArtifactTerrainClipPath(
  scene: CivilizationManifestationScene,
  depthBand: CivilizationArtifactDepthBand,
): string | undefined {
  if (scene !== 'surface' || depthBand === 'foreground') return undefined;
  return depthBand === 'distance'
    ? 'polygon(0 0,100% 0,100% 87%,84% 84%,68% 91%,48% 86%,28% 92%,12% 86%,0 89%)'
    : 'polygon(0 0,100% 0,100% 95%,80% 92%,62% 97%,40% 93%,20% 97%,0 94%)';
}

function clampWorldPercent(value: number): number {
  return Math.min(94, Math.max(6, value));
}

/**
 * Uses every authored-compatible placement as a real option. A small preference
 * for the first choice preserves physical intent, while load balancing prevents
 * saturated civilizations from becoming one crowded district and several empty ones.
 */
function buildCanonicalPlacementAssignments(
  scene: CivilizationManifestationScene,
): ReadonlyMap<ArtifactId, ArtifactPlacementFamily> {
  if (scene === 'surface') return buildCanonicalSurfaceArtifactPlacementAssignments();
  const assignments = new Map<ArtifactId, ArtifactPlacementFamily>();
  const placementLoad = new Map<ArtifactPlacementFamily, number>();

  for (const { id: artifactId } of ARTIFACT_CATALOG) {
    const profile = getArtifactManifestationProfile(artifactId);
    if (profile.nativeCameraScale !== scene) continue;
    const candidates = profile.compatiblePlacementFamilies.filter((placement) => (
      placementMatchesScene(placement, scene)
    ));
    if (candidates.length === 0) continue;

    const selected = candidates
      .map((placement, preferenceIndex) => ({
        placement,
        score: (placementLoad.get(placement) ?? 0) * 2 + preferenceIndex * 0.72,
        preferenceIndex,
      }))
      .sort((a, b) => a.score - b.score || a.preferenceIndex - b.preferenceIndex)[0]!;

    assignments.set(artifactId, selected.placement);
    placementLoad.set(selected.placement, (placementLoad.get(selected.placement) ?? 0) + 1);
  }

  return assignments;
}

/**
 * Resolves Scan identity markers against the same authored world used by Portrait.
 * Scan may annotate these coordinates, but it must never create a second layout.
 */
export function buildCivilizationArtifactWorldAnchors(
  sites: readonly CivilizationDeploymentSite[],
  scene: CivilizationManifestationScene,
  dyad?: CivilizationDyadId | null,
  environmentVariantId: CivilizationEnvironmentVariantId = 'aurora_basin',
  identityEpochs: readonly CivilizationIdentityEpoch[] = [],
  compact = false,
  districtInstances: readonly CivilizationDistrictInstance[] = [],
): ReadonlyMap<string, CivilizationArtifactWorldAnchor> {
  const canonicalPlacementAssignments = buildCanonicalPlacementAssignments(scene);
  const canonicalGroups = new Map<ArtifactPlacementFamily, Array<{
    artifactId: ArtifactId;
    profile: ArtifactManifestationProfile;
  }>>();

  for (const { id: artifactId } of ARTIFACT_CATALOG) {
    const profile = getArtifactManifestationProfile(artifactId);
    if (profile.nativeCameraScale !== scene) continue;
    const placement = canonicalPlacementAssignments.get(artifactId) ?? getPlacement(profile, scene);
    if (!placement) continue;
    const group = canonicalGroups.get(placement) ?? [];
    group.push({ artifactId, profile });
    canonicalGroups.set(placement, group);
  }

  const canonicalAnchors = new Map<ArtifactId, CanonicalArtifactWorldAnchor>();
  ARTIFACT_PLACEMENT_FAMILIES
    .filter((placement) => placementMatchesScene(placement, scene))
    .forEach((placement) => {
      const members = canonicalGroups.get(placement) ?? [];

      members.forEach(({ artifactId }, memberIndex) => {
        const socket = getCivilizationEnvironmentSocket(
          environmentVariantId,
          `${scene}:${placement}:${memberIndex}`,
        );
        if (!socket) return;
        const selected = compact ? socket.mobileTransform : socket.desktopTransform;
        canonicalAnchors.set(artifactId, {
          artifactId,
          x: selected.x,
          y: selected.y,
          scanX: compact ? selected.x : socket.scanAttachment.x,
          scanY: compact ? clampWorldPercent(selected.y - 7) : socket.scanAttachment.y,
          hostX: selected.x,
          hostY: selected.y,
          hostKey: `native:${placement}`,
          placement,
          district: socket.district,
          substrate: socket.substrate,
          requiredSupport: socket.requiredSupport,
          structuralAdaptation: socket.structuralAdaptation,
          physicalValidity: socket.physicalValidation,
          authoredDepth: socket.depth,
          occlusion: socket.occlusion,
          socketScale: selected.scale,
          memberIndex,
          memberCount: members.length,
          districtParcelId: socket.districtParcelId ?? null,
        });
      });
  });

  const anchors = new Map<string, CivilizationArtifactWorldAnchor>();
  for (const site of sites) {
    if (!site.artifactId) continue;
    const assignment = site.manifestationAssignment;
    if (assignment?.nativeScene === scene) {
      if (!isCivilizationManifestationAssignmentCompatible(assignment)) continue;
      const placement = assignment.placementFamily;
      const styleDyad = getManifestationStyleDyad(site, identityEpochs, dyad ?? null);
      const socket = getCivilizationEnvironmentSocket(environmentVariantId, assignment.socketId);
      if (!socket) continue;
      const transform = compact ? socket.mobileTransform : socket.desktopTransform;
      anchors.set(site.id, {
        x: clampWorldPercent(transform.x),
        y: clampWorldPercent(transform.y),
        scanX: compact ? clampWorldPercent(transform.x) : socket.scanAttachment.x,
        scanY: compact ? clampWorldPercent(transform.y - 7) : socket.scanAttachment.y,
        hostX: clampWorldPercent(transform.x),
        hostY: clampWorldPercent(transform.y),
        hostKey: `native:${styleDyad ?? 'unformed'}:${placement}`,
        placement,
        district: socket.district,
        substrate: socket.substrate,
        requiredSupport: socket.requiredSupport,
        structuralAdaptation: socket.structuralAdaptation,
        physicalValidity: socket.physicalValidation,
        authoredDepth: socket.depth,
        occlusion: socket.occlusion,
        socketScale: transform.scale,
        memberIndex: Number.parseInt(assignment.socketId.split(':').at(-1) ?? '0', 10) || 0,
        memberCount: 1,
        districtParcelId: socket.districtParcelId ?? null,
      });
      continue;
    }
    const canonical = canonicalAnchors.get(site.artifactId as ArtifactId);
    if (!canonical) continue;
    const styleDyad = getManifestationStyleDyad(site, identityEpochs, dyad ?? null);
    anchors.set(site.id, {
      ...canonical,
      hostKey: `native:${styleDyad ?? 'unformed'}:${canonical.placement}`,
    });
  }

  if (scene === 'surface') {
    for (const district of districtInstances) {
      const parcels = getCivilizationSurfaceDistrictParcelsForFamily(district.family);
      const parcel = parcels.find(({ instance }) => instance === district.instance);
      if (!parcel) continue;
      // Family-wide socket ordinals cannot identify persistent instances: a
      // soft-full district may keep two residents while its successor has three.
      const precedingCapacity = parcels.filter(({ instance }) => instance < district.instance)
        .reduce((sum, prior) => sum + prior.capacity, 0);
      const residentIds = [...new Set(district.residentArtifactIds)].slice(0, district.hardCapacity);
      const annexes = new Map(getCivilizationDistrictResidents(district, sites)
        .map((resident) => [resident.artifactId, resident]));
      for (const [slotIndex, artifactId] of residentIds.entries()) {
        const site = sites.find((candidate) => candidate.kind === 'artifact' && candidate.artifactId === artifactId);
        const anchor = site && anchors.get(site.id);
        const socket = getCivilizationEnvironmentSocket(environmentVariantId,
          `surface:${district.family}:${precedingCapacity + slotIndex}`);
        if (!site || !anchor || !socket || socket.districtParcelId !== parcel.id) continue;
        const transform = compact ? socket.mobileTransform : socket.desktopTransform;
        const annex = annexes.get(artifactId);
        const { x, y } = annex ? getCivilizationDistrictResidentWorldAnchor(annex, compact) : transform;
        anchors.set(site.id, {
          ...anchor,
          x, y,
          scanX: annex || compact ? x : socket.scanAttachment.x,
          scanY: annex ? y : compact ? clampWorldPercent(y - 7) : socket.scanAttachment.y,
          hostX: x, hostY: y,
          hostKey: district.districtId,
          placement: district.family,
          district: socket.district,
          substrate: socket.substrate,
          requiredSupport: socket.requiredSupport,
          structuralAdaptation: socket.structuralAdaptation,
          physicalValidity: socket.physicalValidation,
          authoredDepth: socket.depth,
          occlusion: socket.occlusion,
          socketScale: transform.scale,
          districtParcelId: parcel.id,
          districtAttachmentRole: annex ? undefined : socket.districtAttachmentRole,
          memberIndex: slotIndex,
          memberCount: residentIds.length,
        });
      }
    }
  }
  return anchors;
}

function AuthoredHostArtwork({
  art,
  scene,
}: {
  art: CivilizationManifestationArt;
  scene: CivilizationManifestationScene;
}) {
  const atlas = art.atlas;
  return (
    <span
      className="absolute inset-0 block overflow-hidden"
      data-host-scene={scene}
    >
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
    </span>
  );
}

function getHostBaseSize(
  scene: CivilizationManifestationScene,
  compact: boolean,
): string {
  if (compact) {
    if (scene === 'surface') return 'clamp(42px, 11vw, 62px)';
    if (scene === 'orbit') return 'clamp(42px, 10vw, 60px)';
    if (scene === 'stellar') return 'clamp(40px, 9vw, 56px)';
    return 'clamp(42px, 11vw, 68px)';
  }
  if (scene === 'surface') return 'clamp(44px, 5.2vw, 68px)';
  if (scene === 'orbit') return 'clamp(52px, 6.5vw, 78px)';
  if (scene === 'stellar') return 'clamp(48px, 5.5vw, 68px)';
  return 'clamp(52px, 7.5vw, 86px)';
}

function getArtifactBaseSize(
  scene: CivilizationManifestationScene,
  compact: boolean,
  depth: CivilizationArtifactDepthBand,
): string {
  if (scene !== 'surface') {
    if (compact) {
      if (scene === 'orbit') return 'clamp(17px, 3.8vw, 30px)';
      if (scene === 'stellar') return 'clamp(16px, 3.5vw, 28px)';
      return 'clamp(15px, 3.2vw, 26px)';
    }
    if (scene === 'orbit') return 'clamp(21px, 4.3vw, 42px)';
    if (scene === 'stellar') return 'clamp(20px, 4vw, 38px)';
    return 'clamp(19px, 3.7vw, 35px)';
  }

  if (compact) {
    if (depth === 'foreground') return 'clamp(32px, 8.4vw, 52px)';
    if (depth === 'midground') return 'clamp(26px, 6.8vw, 42px)';
    return 'clamp(20px, 5.2vw, 34px)';
  }
  if (depth === 'foreground') return 'clamp(52px, 6.6vw, 88px)';
  if (depth === 'midground') return 'clamp(42px, 5.3vw, 70px)';
  return 'clamp(30px, 4vw, 52px)';
}

function getArtifactDensityScale(
  scene: CivilizationManifestationScene,
  compact: boolean,
  artifactCount: number,
  prominent: boolean,
  recent: boolean,
): number {
  if (scene !== 'surface') return 1;
  // Early settlements need the forged work to read as the cause of growth,
  // not as a tiny decoration added after the landscape changes.
  if (artifactCount <= 2) return compact ? 1.42 : 1.28;
  if (artifactCount <= 5) return compact ? 1.18 : 1.1;
  if (artifactCount <= 12) return 1;
  if (recent) return artifactCount > 24 ? 0.92 : 0.96;
  if (prominent) {
    if (artifactCount > 24) return compact ? 0.78 : 0.72;
    return compact ? 0.88 : 0.84;
  }
  if (artifactCount > 24) return compact ? 0.64 : 0.56;
  return compact ? 0.78 : 0.72;
}

function selectProminentArtifactSites(
  members: readonly ManifestationMember[],
  scene: CivilizationManifestationScene,
  compact: boolean,
  recentSiteIds: readonly string[],
): ReadonlySet<string> {
  const recentIds = new Set(recentSiteIds);
  const configuredLimit = compact ? COMPACT_PROMINENCE_LIMIT[scene] : PORTRAIT_PROMINENCE_LIMIT[scene];
  const limit = scene === 'surface' && members.length > 24
    ? Math.min(configuredLimit, compact ? 3 : 4)
    : configuredLimit;
  return new Set(
    [...members]
      .sort((left, right) => {
        const leftImmediate = recentIds.has(left.site.id) ? 1 : 0;
        const rightImmediate = recentIds.has(right.site.id) ? 1 : 0;
        return rightImmediate - leftImmediate ||
          right.site.priority - left.site.priority ||
          (left.site.artifactId ?? left.site.id).localeCompare(right.site.artifactId ?? right.site.id);
      })
      .slice(0, limit)
      .map((member) => member.site.id),
  );
}

function ArtifactPhysicalSupport({
  mode,
  roofMounted = false,
  testId = 'civilization-artifact-physical-support',
}: {
  mode: CivilizationManifestationSupportMode;
  roofMounted?: boolean;
  testId?: string;
}) {
  if (roofMounted) {
    return (
      <svg
        className="pointer-events-none absolute inset-x-[12%] bottom-0 z-0 h-[10%] w-[76%]"
        viewBox="0 0 100 16"
        preserveAspectRatio="none"
        aria-hidden="true"
        data-testid={testId}
        data-support-form="roof-mounting-collar"
      >
        <path d="M0 6 14 0H86L100 6 86 12H14Z" fill="#62696a" />
        <path d="M0 6 14 12H86L100 6V10L86 16H14L0 10Z" fill="#30383b" />
      </svg>
    );
  }

  if (mode === 'shore_pylons') {
    return (
      <span
        className="pointer-events-none absolute inset-x-[5%] bottom-[-30%] z-0 h-[48%]"
        data-testid={testId}
        data-support-form="shore-pylons"
      >
        <span className="absolute bottom-0 left-[13%] h-[88%] w-[11%] bg-gradient-to-r from-slate-950 via-slate-500 to-slate-900 shadow-[1px_0_1px_rgba(255,255,255,0.22)] [clip-path:polygon(20%_0,80%_0,100%_100%,0_100%)]" />
        <span className="absolute bottom-0 right-[13%] h-[88%] w-[11%] bg-gradient-to-r from-slate-950 via-slate-500 to-slate-900 shadow-[1px_0_1px_rgba(255,255,255,0.22)] [clip-path:polygon(20%_0,80%_0,100%_100%,0_100%)]" />
        <span className="absolute inset-x-[13%] top-[45%] h-[8%] rotate-[16deg] bg-slate-600/90 shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
        <span className="absolute inset-x-[13%] top-[45%] h-[8%] -rotate-[16deg] bg-slate-700/90 shadow-[0_1px_1px_rgba(0,0,0,0.8)]" />
        <span className="absolute inset-x-0 top-0 h-[24%] rounded-[45%] border-t border-slate-300/45 bg-gradient-to-b from-slate-400 via-slate-700 to-slate-950 shadow-[0_3px_3px_rgba(0,0,0,0.88)]" />
      </span>
    );
  }

  if (mode === 'terraced_foundation') {
    return (
      <span
        className="pointer-events-none absolute inset-x-[-2%] bottom-0 z-0 h-[24%]"
        data-testid={testId}
        data-support-form="terraced-foundation"
      >
        <span className="absolute inset-x-[17%] top-0 h-[30%] border-t border-stone-300/35 bg-gradient-to-b from-stone-400 to-stone-800 shadow-[0_2px_2px_rgba(0,0,0,0.74)] [clip-path:polygon(8%_0,92%_0,100%_100%,0_100%)]" />
        <span className="absolute inset-x-[8%] top-[29%] h-[31%] bg-gradient-to-b from-stone-500 to-stone-900 shadow-[0_2px_2px_rgba(0,0,0,0.82)] [clip-path:polygon(7%_0,93%_0,100%_100%,0_100%)]" />
        <span className="absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-b from-stone-600 to-stone-950 shadow-[0_3px_3px_rgba(0,0,0,0.9)] [clip-path:polygon(6%_0,94%_0,100%_100%,0_100%)]" />
      </span>
    );
  }

  if (mode === 'subsurface_anchor') {
    return (
      <span
        className="pointer-events-none absolute inset-x-[16%] bottom-0 z-0 h-[19%] overflow-hidden"
        data-testid={testId}
        data-support-form="subsurface-anchor"
      >
        <span className="absolute bottom-0 left-[42%] h-full w-[16%] bg-gradient-to-b from-zinc-500 via-zinc-800 to-black" />
        <span className="absolute inset-x-0 top-[3%] h-[27%] rounded-[50%] bg-gradient-to-b from-zinc-500 to-zinc-950 shadow-[0_2px_3px_rgba(0,0,0,0.9)]" />
      </span>
    );
  }

  if (mode === 'terrain_integrated') {
    return (
      <span
        className="pointer-events-none absolute inset-x-[6%] bottom-0 z-0 h-[12%] bg-gradient-to-b from-stone-500/70 via-stone-800/85 to-black/90 shadow-[0_2px_2px_rgba(0,0,0,0.82)] [clip-path:polygon(2%_56%,12%_24%,27%_36%,44%_4%,63%_27%,78%_14%,98%_58%,91%_100%,8%_100%)]"
        data-testid={testId}
        data-support-form="terrain-integrated"
      />
    );
  }

  return (
    <span
      className="pointer-events-none absolute inset-x-[10%] bottom-0 z-0 h-[10%] rounded-[45%] bg-gradient-to-b from-slate-500/80 via-slate-800/90 to-black shadow-[0_2px_2px_rgba(0,0,0,0.86)]"
      data-testid={testId}
      data-support-form="district-foundation"
    />
  );
}

export function CivilizationArtifactManifestationLayer({
  sites,
  scene,
  dyad,
  environmentVariantId = 'aurora_basin',
  identityEpochs = [],
  scanActive,
  compact,
  bakedIntoPlate = false,
  focusedSiteId,
  recentSiteIds = [],
  repairedSiteIds = [],
  activeConditions = [],
  artifactRenderingIds,
  districtInstances = [],
  onHoverSite,
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: CivilizationManifestationScene;
  dyad?: CivilizationDyadId | null;
  environmentVariantId?: CivilizationEnvironmentVariantId;
  identityEpochs?: readonly CivilizationIdentityEpoch[];
  scanActive: boolean;
  compact: boolean;
  bakedIntoPlate?: boolean;
  focusedSiteId?: string | null;
  recentSiteIds?: readonly string[];
  repairedSiteIds?: readonly string[];
  activeConditions?: readonly CivilizationCoreCondition[];
  artifactRenderingIds?: Readonly<Record<string, string>>;
  districtInstances?: readonly CivilizationDistrictInstance[];
  onHoverSite?: (siteId: string | null) => void;
}) {
  const items = React.useMemo(
    () => buildRenderItems(sites, scene, dyad ?? null, identityEpochs),
    [dyad, identityEpochs, scene, sites],
  );
  const nativeItems = items;
  // Stellar composites contain their own stars and planets. The continuity
  // layer owns those canonical bodies, so Artifacts render only as their
  // unique structures at this scale rather than stamping duplicate systems.
  const contextualHostItems = scene === 'surface' || scene === 'stellar' ? [] : nativeItems;
  const nativeMembers = nativeItems.flatMap((item) => item.members);
  const integratedSiteIds = new Set(scene === 'surface'
    ? districtInstances.flatMap((district) => getCivilizationDistrictResidents(district, sites).map(({ site }) => site.id))
    : []);
  const inputArtifactSites = sites.filter((site) => site.kind === 'artifact' && site.artifactId);
  const crossScaleArtifactCount = inputArtifactSites.length - nativeMembers.length;
  const artifactWorldAnchors = React.useMemo(
    () => buildCivilizationArtifactWorldAnchors(
      sites,
      scene,
      dyad,
      environmentVariantId,
      identityEpochs,
      compact,
      districtInstances,
    ),
    [compact, dyad, districtInstances, environmentVariantId, identityEpochs, scene, sites],
  );
  const prominentSiteIds = React.useMemo(() => (
    selectProminentArtifactSites(
      nativeMembers,
      scene,
      compact,
      recentSiteIds,
    )
  ), [compact, nativeMembers, recentSiteIds, scene]);
  const recentIds = React.useMemo(() => new Set(recentSiteIds), [recentSiteIds]);
  const repairedIds = React.useMemo(() => new Set(repairedSiteIds), [repairedSiteIds]);
  const conditions = React.useMemo(() => new Set(activeConditions), [activeConditions]);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[12] overflow-hidden"
      data-testid="civilization-artifact-manifestation-layer"
      data-scene={scene}
      data-artifact-count={inputArtifactSites.length}
      data-native-artifact-count={nativeMembers.length}
      data-cross-scale-artifact-count={crossScaleArtifactCount}
      data-render-item-count={items.length}
      data-contextual-host-count={contextualHostItems.length}
      data-render-mode={scanActive ? 'scan-annotation' : 'portrait'}
      data-structure-rendering={bakedIntoPlate ? 'baked-terminal-plate' : integratedSiteIds.size > 0
        ? 'district-residents-and-manifestations' : 'individual-manifestations'}
      data-integrated-resident-count={integratedSiteIds.size}
      data-world-layout="invariant"
      data-density-treatment={scene === 'surface' && nativeMembers.length > 12
        ? 'depth-scaled'
        : 'standard'}
      aria-hidden="true"
    >
      <style>{ARTIFACT_STATE_STYLES}</style>
      {!bakedIntoPlate && contextualHostItems.map((item) => {
        if (!item.placement) return null;
        const art = getCivilizationManifestationArt(item.styleDyad, scene, item.placement);
        if (!art) return null;
        const districtSocket = getCivilizationEnvironmentSocket(
          environmentVariantId,
          `${scene}:${item.placement}:0`,
        );
        if (!districtSocket) return null;
        const districtTransform = compact
          ? districtSocket.mobileTransform
          : districtSocket.desktopTransform;
        const hostX = districtTransform.x;
        const hostY = districtTransform.y;
        const hostMember = item.members[0]!;
        const focusedHost = item.members.some((member) => member.site.id === focusedSiteId);
        const hostRecent = item.members.some((member) => recentIds.has(member.site.id));
        const hostRepaired = item.members.some((member) => repairedIds.has(member.site.id));
        const hostDepthBand = getArtifactDepthBand(
          districtSocket.depth,
          focusedHost,
          hostRecent,
        );
        const hostOperational = hostMember.site.implementationState === undefined ||
          hostMember.site.implementationState === 'operational';
        const hostDisplayScale = Math.min(
          scene === 'surface' ? 0.9 : 1.12,
          art.scale * districtTransform.scale * (hostRecent ? 1.12 : 1),
        );

        return (
          <span
            key={`artifact-host:${item.key}`}
            className="civ-authored-host absolute block transition-[filter,opacity] duration-300"
            style={{
              left: `${hostX}%`,
              top: `${hostY}%`,
              width: getHostBaseSize(scene, compact),
              aspectRatio: String(art.aspectRatio ?? 1),
              opacity: 1,
              transform: `translate(-50%, -88%) scale(${hostDisplayScale.toFixed(3)})`,
              transformOrigin: '50% 88%',
              zIndex: getArtifactDepthZIndex(hostDepthBand, hostY),
              filter: `${scene === 'surface'
                ? hostDepthBand === 'distance'
                  ? 'saturate(0.46) contrast(0.92) brightness(0.65) blur(0.25px)'
                  : hostDepthBand === 'midground'
                    ? 'saturate(0.56) contrast(0.97) brightness(0.72) drop-shadow(0 2px 2px rgba(0,0,0,0.72))'
                    : 'saturate(0.64) contrast(1) brightness(0.78) drop-shadow(0 4px 4px rgba(0,0,0,0.86))'
                : scene === 'galaxy'
                  ? 'saturate(0.82) contrast(1.05) brightness(0.82) drop-shadow(0 4px 6px rgba(0,0,0,0.86))'
                  : 'saturate(0.88) contrast(1.02) brightness(0.84) drop-shadow(0 4px 5px rgba(0,0,0,0.78))'} ${
                hostRepaired ? 'drop-shadow(0 0 10px rgba(130,221,255,0.78))' : ''
              }`,
            }}
            data-testid="civilization-authored-host"
            data-render-medium="dyad-authored-artifact-shell"
            data-visual-role="contextual-dyad-foundation"
            data-manifestation-kind="dyad-artifact-composite"
            data-artifact-unit={hostMember.site.artifactId}
            data-artifact-units={item.members.map((member) => member.site.artifactId).join(',')}
            data-style-dyad={item.styleDyad ?? undefined}
            data-world-host-key={item.key}
            data-world-anchor={`${hostX},${hostY}`}
            data-placement-family={item.placement}
            data-district={districtSocket.district}
            data-substrate={districtSocket.substrate}
            data-required-support={districtSocket.requiredSupport}
            data-structural-adaptation={districtSocket.structuralAdaptation}
            data-physical-validity={districtSocket.physicalValidation}
            data-authored-depth={districtSocket.depth}
            data-depth-band={hostDepthBand}
            data-occlusion={districtSocket.occlusion}
            data-artifact-occupancy={item.members.length}
            data-operational-state={hostOperational ? 'active' : 'historical'}
            aria-hidden="true"
          >
            {scene === 'surface' && (
              <ArtifactPhysicalSupport
                mode={districtSocket.requiredSupport}
                testId="civilization-host-physical-support"
              />
            )}
            <span
              className="pointer-events-none absolute bottom-[2%] left-[8%] right-[8%] h-[12%] rounded-[50%] bg-black/55 blur-[2px]"
            />
            <span
              className="absolute inset-0"
              style={{ clipPath: getArtifactTerrainClipPath(scene, hostDepthBand) }}
              data-terrain-occlusion={scene === 'surface' && hostDepthBand !== 'foreground' ? hostDepthBand : 'none'}
            >
              <AuthoredHostArtwork art={art} scene={scene} />
            </span>
            {hostRecent && (
              <span
                className="civ-host-impact-ring pointer-events-none absolute inset-[12%] rounded-[50%] border"
                style={{
                  borderColor: `${AFFINITY_META[item.members[0]!.site.affinity].hex}9A`,
                  boxShadow: `0 0 24px ${AFFINITY_META[item.members[0]!.site.affinity].hex}52`,
                }}
                data-testid="civilization-host-impact-ring"
              />
            )}
            {hostRepaired && (
              <span
                className="civ-artifact-repair-ring pointer-events-none absolute inset-[9%] rounded-[50%] border"
                style={{
                  borderColor: 'rgba(185,239,255,0.9)',
                  boxShadow: '0 0 26px rgba(130,221,255,0.68), inset 0 0 15px rgba(130,221,255,0.34)',
                }}
                data-testid="civilization-host-repair-ring"
              />
            )}
            <span
              className="pointer-events-none absolute inset-[22%] rounded-[50%] transition-opacity duration-200"
              style={{
                background: `radial-gradient(circle, ${AFFINITY_META[item.members[0]!.site.affinity].hex}24, transparent 68%)`,
                opacity: focusedHost || hostRecent ? 0.4 : 0,
              }}
              data-testid="civilization-host-affinity-glow"
            />
          </span>
        );
      })}
      {!bakedIntoPlate && nativeMembers.map((member) => {
        if (integratedSiteIds.has(member.site.id)) return null;
        const artifactId = member.site.artifactId;
        const worldAnchor = artifactWorldAnchors.get(member.site.id);
        if (!artifactId || !worldAnchor) return null;

        const tone = AFFINITY_META[member.site.affinity].hex;
        const focused = member.site.id === focusedSiteId;
        const prominent = prominentSiteIds.has(member.site.id);
        const recent = recentIds.has(member.site.id);
        const repaired = repairedIds.has(member.site.id);
        const depthBand = getArtifactDepthBand(worldAnchor.authoredDepth, focused, recent);
        const baseSize = getArtifactBaseSize(scene, compact, depthBand);
        const physicalScale = IMPLEMENTATION_SCALE_MULTIPLIER[member.profile.implementationScale];
        const prominenceScale = scene === 'surface'
          ? recent
            ? 1.06
            : prominent
              ? 1.04
              : 1
          : 1;
        const densityScale = getArtifactDensityScale(
          scene,
          compact,
          nativeMembers.length,
          prominent,
          recent,
        );
        const artifactScale = physicalScale * prominenceScale * worldAnchor.socketScale * densityScale;
        const groundingMode = worldAnchor.requiredSupport ??
          getArtifactGroundingMode(scene, worldAnchor.placement);
        const districtMounted = scene === 'surface' && worldAnchor.districtAttachmentRole !== undefined;
        const roofMounted = districtMounted && worldAnchor.districtAttachmentRole === 'roof-module';
        const operational = member.site.implementationState === undefined ||
          member.site.implementationState === 'operational';
        const physicallyAffected = prominent || focused || recent;
        const groundContactInset = roofMounted ? '12%' : groundingMode === 'subsurface_anchor'
          ? '18%'
          : groundingMode === 'terraced_foundation'
            ? '22%'
            : groundingMode === 'shore_pylons'
              ? '16%'
              : '12%';

        return (
          <span
            key={`artifact-structure:${member.site.id}`}
            className={`absolute block transition-[filter,opacity,transform] duration-200 ${
              scanActive ? 'pointer-events-auto' : 'pointer-events-none'
            } ${recent ? 'civ-artifact-arrival' : ''}`}
            style={{
              left: `${worldAnchor.x}%`,
              top: `${worldAnchor.y}%`,
              width: baseSize,
              aspectRatio: '8 / 9',
              opacity: 1,
              transform: `translate(-50%, -100%) scale(${(
                artifactScale * (recent ? 1.04 : 1)
              ).toFixed(3)})`,
              transformOrigin: '50% 100%',
              zIndex: getArtifactDepthZIndex(depthBand, worldAnchor.y) + 4,
              filter: `${getArtifactDepthFilter(scene, depthBand, focused, tone)} ${
                operational ? '' : 'grayscale(0.48) saturate(0.72) brightness(0.68) contrast(1.08)'
              } ${repaired ? 'drop-shadow(0 0 11px rgba(130,221,255,0.82))' : ''}`,
            }}
            data-testid="civilization-artifact-structure"
            data-visual-role="primary-artifact-identity"
            data-artifact-unit={artifactId}
            data-artifact-visual-identity={member.profile.visualIdentity}
            data-world-anchor={`${worldAnchor.x},${worldAnchor.y}`}
            data-world-host-key={worldAnchor.hostKey}
            data-placement-family={worldAnchor.placement ?? undefined}
            data-district={worldAnchor.district ?? undefined}
            data-district-parcel={worldAnchor.districtParcelId ?? undefined}
            data-district-attachment-role={worldAnchor.districtAttachmentRole}
            data-substrate={worldAnchor.substrate ?? undefined}
            data-required-support={groundingMode}
            data-structural-adaptation={worldAnchor.structuralAdaptation ?? undefined}
            data-physical-validity={worldAnchor.physicalValidity}
            data-authored-depth={worldAnchor.authoredDepth}
            data-depth-band={depthBand}
            data-occlusion={roofMounted ? 'architecture' : worldAnchor.occlusion}
            data-implementation-scale={member.profile.implementationScale}
            data-grounding-mode={roofMounted ? 'roof_mount' : groundingMode}
            data-portrait-prominence={focused ? 'focused' : recent ? 'recent' : prominent ? 'hero' : 'supporting'}
            data-density-scale={densityScale.toFixed(2)}
            data-scan-link-state={scanActive ? (focused ? 'linked' : 'available') : undefined}
            data-elevation-mode={roofMounted ? 'roof-mounted' : scene === 'surface' ? 'integrated-ground' : 'scale-native'}
            data-operational-state={operational ? 'active' : 'historical-imprint'}
            data-repair-state={repaired ? 'restored' : 'settled'}
            data-condition-state={activeConditions.join(',') || 'none'}
            data-condition-treatment={activeConditions.length > 0 ? 'localized-physical' : 'none'}
            data-construction-transition={recent ? 'assembling' : 'settled'}
            onPointerEnter={scanActive ? () => onHoverSite?.(member.site.id) : undefined}
            onPointerLeave={scanActive ? () => onHoverSite?.(null) : undefined}
            aria-hidden="true"
          >
            <span
              className={`pointer-events-none absolute inset-[-22%] rounded-[50%] transition-opacity duration-200 ${
                focused ? 'civ-artifact-identity-glow opacity-100' : 'opacity-0'
              }`}
              style={{
                background: `radial-gradient(ellipse at 50% 72%, ${tone}8A 0%, ${tone}32 45%, transparent 74%)`,
                boxShadow: focused ? `0 0 22px ${tone}72` : undefined,
              }}
              data-testid="civilization-artifact-identity-glow"
            />
            {recent && (
              <span
                className="civ-artifact-arrival-ring pointer-events-none absolute inset-[-28%] rounded-[50%] border"
                style={{
                  borderColor: `${tone}B8`,
                  boxShadow: `0 0 16px ${tone}72, inset 0 0 10px ${tone}42`,
                }}
                data-testid="civilization-artifact-arrival-ring"
              />
            )}
            {repaired && (
              <span
                className="civ-artifact-repair-ring pointer-events-none absolute inset-[-25%] rounded-[50%] border"
                style={{
                  borderColor: 'rgba(185,239,255,0.96)',
                  boxShadow: '0 0 18px rgba(130,221,255,0.82), inset 0 0 12px rgba(130,221,255,0.38)',
                }}
                data-testid="civilization-artifact-repair-ring"
              />
            )}
            {scene === 'surface' && (
              <>
                <ArtifactPhysicalSupport mode={groundingMode} roofMounted={roofMounted} />
                <span
                  className="pointer-events-none absolute bottom-0 z-0 h-[9%] rounded-[50%]"
                  style={{
                    left: groundContactInset,
                    right: groundContactInset,
                    background: 'radial-gradient(ellipse, rgba(0,0,0,0.82) 0 36%, rgba(0,0,0,0.48) 56%, transparent 76%)',
                    filter: 'blur(1px)',
                  }}
                  data-testid="civilization-artifact-ground-contact"
                />
              </>
            )}
            <span
              className={`absolute inset-0 ${recent ? 'civ-artifact-construct' : ''}`}
              // District platforms already carry these attachments. A wrapper
              // terrain mask cuts tall atlas silhouettes and their access bases;
              // each sprite retains its own authored ground-line crop instead.
              style={{ clipPath: districtMounted ? undefined : getArtifactTerrainClipPath(scene, depthBand) }}
              data-construction-phase={recent ? 'bottom-up-assembly' : 'complete'}
              data-terrain-occlusion={!districtMounted && scene === 'surface' && depthBand !== 'foreground' ? depthBand : 'none'}
            >
              <CivilizationArtifactStructure
                artifactId={artifactId}
                profile={member.profile}
                tone={tone}
                scene={scene}
                renderingId={artifactRenderingIds?.[artifactId]}
              />
            </span>
            {physicallyAffected && conditions.has('damaged') && (
              <span
                className="civ-artifact-state-signal civ-artifact-state-smoke pointer-events-none absolute left-[54%] top-[16%] z-20"
                data-testid="civilization-artifact-damage-smoke"
              />
            )}
            {physicallyAffected && conditions.has('quarantined') && (
              <span
                className="civ-artifact-state-signal civ-artifact-state-beacon pointer-events-none absolute inset-[4%] z-20"
                data-testid="civilization-artifact-quarantine-beacon"
              />
            )}
            {physicallyAffected && conditions.has('disrupted') && (
              <span
                className="civ-artifact-state-signal civ-artifact-state-disruption pointer-events-none absolute left-[62%] top-[34%] z-20"
                data-testid="civilization-artifact-disruption"
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
