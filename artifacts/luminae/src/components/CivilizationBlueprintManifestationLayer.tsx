import React from 'react';
import {
  CIVILIZATION_BLUEPRINT_MANIFESTATION_PROFILES,
  getArtifactPlacementPhysicalContract,
  type CivilizationEnvironmentVariantId,
} from '@workspace/game-types';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';
import { getCivilizationEnvironmentSocket } from '@/lib/civilizationEnvironmentSockets';
import type { CivilizationArtifactWorldAnchor } from '@/components/CivilizationArtifactManifestationLayer';
import antimatterDetonatorUrl from '@/assets/blueprints/antimatter/antimatter-detonator-civilization-v1.webp';
import mantleToOrbitFoundryUrl from '@/assets/blueprints/mantle-to-orbit/mantle-to-orbit-foundry-civilization-runtime-v2.webp';
import ascensionRegistryUrl from '@/assets/blueprints/ascension-registry/ascension-registry-civilization-runtime-v1.webp';
import worldshieldCovenantUrl from '@/assets/blueprints/worldshield/worldshield-covenant-civilization-runtime-v3.webp';

type CivilizationSceneKind = 'surface' | 'orbit' | 'stellar' | 'galaxy';

interface BlueprintVisualDefinition {
  asset: string;
  nativeScene: CivilizationSceneKind;
  testId: string;
  deviceTestId?: string;
  widthByScene: Partial<Record<CivilizationSceneKind, number>>;
  anchorAdjustment?: Partial<Record<CivilizationSceneKind, { x: number; y: number }>>;
  motionClass: string;
  tone: string;
}

const BLUEPRINT_VISUALS: Record<string, BlueprintVisualDefinition> = {
  bp_antimatter_detonator: {
    asset: antimatterDetonatorUrl,
    nativeScene: 'stellar',
    testId: 'civilization-blueprint-antimatter-native',
    deviceTestId: 'civilization-blueprint-antimatter-device',
    widthByScene: { stellar: 2.8, galaxy: 0.9 },
    anchorAdjustment: { stellar: { x: 0, y: -1.5 }, galaxy: { x: 0, y: 0 } },
    motionClass: 'civ-blueprint-physical--gimbaled',
    tone: '#ff6972',
  },
  bp_mantle_to_orbit_foundry: {
    asset: mantleToOrbitFoundryUrl,
    nativeScene: 'orbit',
    testId: 'civilization-blueprint-mantle-native',
    widthByScene: { orbit: 10, stellar: 3.2, galaxy: 1.1 },
    anchorAdjustment: { orbit: { x: 0, y: -5 }, stellar: { x: 0, y: -1 }, galaxy: { x: 0, y: 0 } },
    motionClass: 'civ-blueprint-physical--industrial',
    tone: '#dfb86b',
  },
  bp_ascension_registry: {
    asset: ascensionRegistryUrl,
    nativeScene: 'stellar',
    testId: 'civilization-blueprint-ascension-native',
    widthByScene: { stellar: 4.4, galaxy: 1.3 },
    anchorAdjustment: { stellar: { x: 0, y: -1 }, galaxy: { x: 0, y: 0 } },
    motionClass: 'civ-blueprint-physical--registry',
    tone: '#fff0ad',
  },
  bp_worldshield_covenant: {
    asset: worldshieldCovenantUrl,
    nativeScene: 'orbit',
    testId: 'civilization-blueprint-worldshield-native',
    widthByScene: { orbit: 8.5, stellar: 3.4, galaxy: 1.1 },
    anchorAdjustment: { orbit: { x: 0, y: -1.5 }, stellar: { x: 0, y: 0 }, galaxy: { x: 0, y: 0 } },
    motionClass: 'civ-blueprint-physical--shield',
    tone: '#d8edff',
  },
};

export function getCivilizationBlueprintManifestationArt(blueprintId?: string): string | null {
  if (!blueprintId) return null;
  return BLUEPRINT_VISUALS[blueprintId]?.asset ?? null;
}

const SCENE_ORDER: Record<CivilizationSceneKind, number> = {
  surface: 0,
  orbit: 1,
  stellar: 2,
  galaxy: 3,
};

function getBlueprintNativeScene(site: CivilizationDeploymentSite): CivilizationSceneKind {
  if (site.scaleBand === 'galactic') return 'galaxy';
  if (site.scaleBand === 'stellar') return 'stellar';
  return 'orbit';
}

export function buildCivilizationBlueprintWorldAnchors(
  sites: readonly CivilizationDeploymentSite[],
  scene: CivilizationSceneKind,
  environmentVariantId: CivilizationEnvironmentVariantId = 'aurora_basin',
  compact = false,
): ReadonlyMap<string, CivilizationArtifactWorldAnchor> {
  const anchors = new Map<string, CivilizationArtifactWorldAnchor>();
  for (const site of sites) {
    const blueprintId = site.blueprintId;
    if (site.kind !== 'blueprint' || !blueprintId) continue;
    const visual = BLUEPRINT_VISUALS[blueprintId];
    if (!visual) continue;
    const profile = CIVILIZATION_BLUEPRINT_MANIFESTATION_PROFILES[blueprintId];
    const nativeScene = profile?.nativeScene ?? getBlueprintNativeScene(site) ?? visual.nativeScene;
    if (SCENE_ORDER[scene] < SCENE_ORDER[nativeScene] || !visual.widthByScene[scene]) continue;
    const placement = site.manifestationAssignment?.sourceType === 'blueprint' &&
      site.manifestationAssignment.nativeScene === nativeScene
      ? site.manifestationAssignment.placementFamily
      : profile.validSocketClasses[0];
    const socketId = site.manifestationAssignment?.sourceType === 'blueprint' &&
      site.manifestationAssignment.nativeScene === nativeScene
      ? site.manifestationAssignment.socketId
      : `${nativeScene}:${placement}:0`;
    const socket = scene === nativeScene
      ? getCivilizationEnvironmentSocket(environmentVariantId, socketId)
      : null;
    if (scene === nativeScene && !socket) continue;
    const transform = socket
      ? compact ? socket.mobileTransform : socket.desktopTransform
      : site.anchor;
    const adjustment = visual.anchorAdjustment?.[scene] ?? { x: 0, y: 0 };
    const x = Math.max(2, Math.min(98, transform.x + adjustment.x));
    const y = Math.max(4, Math.min(96, transform.y + adjustment.y));
    const physical = getArtifactPlacementPhysicalContract(placement);
    anchors.set(site.id, {
      x,
      y,
      scanX: socket && !compact ? socket.scanAttachment.x : x,
      scanY: socket && !compact ? socket.scanAttachment.y : Math.max(5, y - 6),
      hostX: x,
      hostY: y,
      hostKey: `blueprint:${blueprintId}:${scene === nativeScene ? socketId : 'connected-locator'}`,
      placement,
      district: socket?.district ?? physical.district,
      substrate: socket?.substrate ?? physical.substrate,
      requiredSupport: socket?.requiredSupport ?? physical.requiredSupport,
      structuralAdaptation: socket?.structuralAdaptation ?? 'native-grounding',
      physicalValidity: 'authored',
      authoredDepth: socket?.depth ?? 'distance',
      occlusion: socket?.occlusion ?? (scene === 'orbit' ? 'atmosphere' : 'none'),
      socketScale: socket
        ? compact ? socket.mobileTransform.scale : socket.desktopTransform.scale
        : 1,
      memberIndex: 0,
      memberCount: 1,
      districtParcelId: socket?.districtParcelId ?? null,
    });
  }
  return anchors;
}

function physicalStateClass(site: CivilizationDeploymentSite): string {
  if (site.projectState === 'spent') return 'civ-blueprint-physical--spent';
  if (site.projectState === 'recovering') return 'civ-blueprint-physical--recovering';
  return 'civ-blueprint-physical--operational';
}

function BlueprintManifestation({
  site,
  scene,
  compact,
  environmentVariantId,
  worldAnchor,
}: {
  site: CivilizationDeploymentSite;
  scene: CivilizationSceneKind;
  compact: boolean;
  environmentVariantId: CivilizationEnvironmentVariantId;
  worldAnchor: CivilizationArtifactWorldAnchor;
}) {
  const blueprintId = site.blueprintId;
  if (!blueprintId) return null;
  const visual = BLUEPRINT_VISUALS[blueprintId];
  if (!visual) return null;

  const nativeScene = getBlueprintNativeScene(site) ?? visual.nativeScene;
  if (SCENE_ORDER[scene] < SCENE_ORDER[nativeScene]) return null;
  const width = visual.widthByScene[scene];
  if (!width) return null;

  const isNative = scene === nativeScene;
  const profile = CIVILIZATION_BLUEPRINT_MANIFESTATION_PROFILES[blueprintId];
  const fallbackSocketId = `${nativeScene}:${profile.validSocketClasses[0]}:0`;
  const socketId = site.manifestationAssignment?.sourceType === 'blueprint' &&
    site.manifestationAssignment.nativeScene === nativeScene
    ? site.manifestationAssignment.socketId
    : fallbackSocketId;
  const left = Math.max(width / 2, Math.min(100 - width / 2, worldAnchor.x));
  const top = worldAnchor.y;
  const manifestationScale = site.blueprintManifestationScale ?? 'installation';
  const manifestationMotion = site.blueprintManifestationMotion ?? 'industrial_transit';

  return (
    <div
      className={`civ-blueprint-physical ${physicalStateClass(site)}`}
      data-testid={visual.testId}
      data-blueprint-id={blueprintId}
      data-native-scene={nativeScene}
      data-current-scene={scene}
      data-representation-mode={isNative ? 'native-manifestation' : 'distant-consequence'}
      data-manifestation-scale={manifestationScale}
      data-manifestation-motion={manifestationMotion}
      data-environment-variant={environmentVariantId}
      data-manifestation-socket={isNative ? socketId : undefined}
      data-world-anchor={`${left},${top}`}
      data-world-host-key={worldAnchor.hostKey}
      data-device-width={width.toFixed(2)}
      data-megastructure-authority="blueprint-project"
      style={{
        '--blueprint-tone': visual.tone,
        left: `${left}%`,
        top: `${top}%`,
        width: `${compact ? width * 0.92 : width}%`,
      } as React.CSSProperties}
    >
      <div className={`civ-blueprint-physical__motion ${visual.motionClass}`}>
        <img
          className="civ-blueprint-physical__art"
          data-testid={visual.deviceTestId}
          src={visual.asset}
          alt=""
          draggable={false}
        />
        <span className="civ-blueprint-physical__engine" aria-hidden="true" />
      </div>
    </div>
  );
}

export function CivilizationBlueprintManifestationLayer({
  sites,
  scene,
  compact = false,
  environmentVariantId = 'aurora_basin',
}: {
  sites: readonly CivilizationDeploymentSite[];
  scene: CivilizationSceneKind;
  compact?: boolean;
  environmentVariantId?: CivilizationEnvironmentVariantId;
}) {
  const blueprints = sites.filter((site) => site.kind === 'blueprint' && site.blueprintId);
  if (blueprints.length === 0) return null;
  const worldAnchors = buildCivilizationBlueprintWorldAnchors(
    blueprints,
    scene,
    environmentVariantId,
    compact,
  );

  return (
    <div
      className="pointer-events-none absolute inset-0 z-[9] overflow-hidden"
      data-testid="civilization-blueprint-manifestations"
      data-composition="persistent-physical"
      data-visual-authority="blueprint-exclusive-projects"
      aria-hidden="true"
    >
      <style>{`
        .civ-blueprint-physical {
          position: absolute;
          transform: translate(-50%, -50%);
          transform-origin: 50% 50%;
          opacity: 1;
          contain: layout paint style;
        }
        .civ-blueprint-physical__motion {
          position: relative;
          width: 100%;
          transform-origin: 50% 50%;
        }
        .civ-blueprint-physical__art {
          display: block;
          width: 100%;
          height: auto;
          filter: drop-shadow(0 2px 2px rgba(0,0,0,0.92)) drop-shadow(0 0 5px color-mix(in srgb, var(--blueprint-tone) 34%, transparent));
          object-fit: contain;
          user-select: none;
        }
        .civ-blueprint-physical__engine {
          position: absolute;
          left: 48%;
          top: 50%;
          width: 8%;
          aspect-ratio: 1;
          border-radius: 50%;
          background: var(--blueprint-tone);
          box-shadow: 0 0 10px var(--blueprint-tone);
          opacity: 0.24;
          transform: translate(-50%, -50%);
          animation: civBlueprintEngine 4.8s ease-in-out infinite;
        }
        .civ-blueprint-physical--gimbaled {
          animation: civBlueprintGimbaled 11s ease-in-out infinite;
        }
        .civ-blueprint-physical--industrial {
          animation: civBlueprintIndustry 8.5s ease-in-out infinite;
        }
        .civ-blueprint-physical--registry {
          animation: civBlueprintRegistry 10s ease-in-out infinite;
        }
        .civ-blueprint-physical--shield {
          animation: civBlueprintShield 7.5s ease-in-out infinite;
        }
        .civ-blueprint-physical--spent {
          opacity: 0.62;
          filter: saturate(0.55) brightness(0.72);
        }
        .civ-blueprint-physical--recovering .civ-blueprint-physical__art {
          animation: civBlueprintRecovering 3.6s ease-in-out infinite;
        }
        @keyframes civBlueprintEngine {
          0%, 100% { opacity: 0.16; transform: translate(-50%, -50%) scale(0.84); }
          50% { opacity: 0.36; transform: translate(-50%, -50%) scale(1.12); }
        }
        @keyframes civBlueprintGimbaled {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-0.35deg); }
          50% { transform: translate3d(0, -2%, 0) rotate(0.35deg); }
        }
        @keyframes civBlueprintIndustry {
          0%, 100% { transform: translate3d(0, 0, 0); }
          50% { transform: translate3d(0, -0.8%, 0); }
        }
        @keyframes civBlueprintRegistry {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-0.18deg); }
          50% { transform: translate3d(0, -1.4%, 0) rotate(0.18deg); }
        }
        @keyframes civBlueprintShield {
          0%, 100% { transform: scale(0.997); }
          50% { transform: scale(1.005); }
        }
        @keyframes civBlueprintRecovering {
          0%, 100% { opacity: 0.62; }
          50% { opacity: 0.92; }
        }
        [data-civilization-motion="paused"] .civ-blueprint-physical__motion,
        [data-civilization-motion="paused"] .civ-blueprint-physical__engine,
        [data-civilization-motion="paused"] .civ-blueprint-physical--recovering .civ-blueprint-physical__art,
        [data-civilization-performance="mobile"] .civ-blueprint-physical__motion,
        [data-civilization-performance="mobile"] .civ-blueprint-physical__engine {
          animation: none !important;
        }
        [data-civilization-performance="mobile"] .civ-blueprint-physical__art {
          filter: drop-shadow(0 1px 1px rgba(0,0,0,0.86));
        }
        @media (prefers-reduced-motion: reduce) {
          .civ-blueprint-physical__motion,
          .civ-blueprint-physical__engine,
          .civ-blueprint-physical--recovering .civ-blueprint-physical__art {
            animation: none !important;
          }
        }
      `}</style>
      {blueprints.map((site) => (
        worldAnchors.has(site.id) ? (
          <BlueprintManifestation
            key={site.id}
            site={site}
            scene={scene}
            compact={compact}
            environmentVariantId={environmentVariantId}
            worldAnchor={worldAnchors.get(site.id)!}
          />
        ) : null
      ))}
    </div>
  );
}
