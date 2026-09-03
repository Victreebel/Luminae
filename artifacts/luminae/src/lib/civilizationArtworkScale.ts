import type { CardLoreCatalog } from '@workspace/api-client-react';

export type ArtifactDepictionScale = NonNullable<CardLoreCatalog[string]['depictionScale']>;

export type CivilizationArtworkLayer = 'surface' | 'orbit' | 'stellar' | 'galaxy';

export type ArtifactScalePresence =
  | 'artifact_pin'
  | 'deployment_site'
  | 'visible_structure'
  | 'planetary_infrastructure'
  | 'stellar_megastructure'
  | 'galactic_network';

export interface ArtifactArtworkScalePolicy {
  depictionScale: ArtifactDepictionScale;
  nativeLayer: CivilizationArtworkLayer;
  presence: ArtifactScalePresence;
  label: string;
  nativeLabel: string;
  canRenderAsStructure: boolean;
  scanCopy: string;
}

const ARTWORK_SCALE_POLICIES: Record<ArtifactDepictionScale, ArtifactArtworkScalePolicy> = {
  macro: {
    depictionScale: 'macro',
    nativeLayer: 'surface',
    presence: 'artifact_pin',
    label: 'Macro object',
    nativeLabel: 'Local site',
    canRenderAsStructure: false,
    scanCopy:
      'The card art is close-up object scale. The scene marks the deployment site and its consequences, not a giant version of the object.',
  },
  tabletop: {
    depictionScale: 'tabletop',
    nativeLayer: 'surface',
    presence: 'artifact_pin',
    label: 'Tabletop object',
    nativeLabel: 'Local site',
    canRenderAsStructure: false,
    scanCopy:
      'The card art is personal object scale. The scene marks where the artifact is deployed and what work it causes nearby.',
  },
  room: {
    depictionScale: 'room',
    nativeLayer: 'surface',
    presence: 'deployment_site',
    label: 'Room-scale apparatus',
    nativeLabel: 'City site',
    canRenderAsStructure: true,
    scanCopy:
      'The card art can plausibly appear inside a city-scale site, while higher views show routes, fields, or civic effects.',
  },
  installation: {
    depictionScale: 'installation',
    nativeLayer: 'surface',
    presence: 'visible_structure',
    label: 'Installation',
    nativeLabel: 'City structure',
    canRenderAsStructure: true,
    scanCopy:
      'The card art is large enough to become an actual city-scale structure before resolving into influence at higher views.',
  },
  planetary: {
    depictionScale: 'planetary',
    nativeLayer: 'orbit',
    presence: 'planetary_infrastructure',
    label: 'Planetary work',
    nativeLabel: 'Planet feature',
    canRenderAsStructure: true,
    scanCopy:
      'The card art belongs at planetary scale, where it can appear as geography, orbital industry, climate work, or visible civic infrastructure.',
  },
  stellar: {
    depictionScale: 'stellar',
    nativeLayer: 'stellar',
    presence: 'stellar_megastructure',
    label: 'Stellar work',
    nativeLabel: 'System structure',
    canRenderAsStructure: true,
    scanCopy:
      'The card art belongs at system scale, where it can appear as orbital infrastructure, heliopause fields, or star-system routes.',
  },
  galactic: {
    depictionScale: 'galactic',
    nativeLayer: 'galaxy',
    presence: 'galactic_network',
    label: 'Galactic network',
    nativeLabel: 'Galactic network',
    canRenderAsStructure: true,
    scanCopy:
      'The card art belongs at galactic scale, where it can appear as sector routes, archive spines, containment regions, or distributed networks.',
  },
};

export function getArtifactArtworkScalePolicy(
  depictionScale: ArtifactDepictionScale,
): ArtifactArtworkScalePolicy {
  return ARTWORK_SCALE_POLICIES[depictionScale];
}

export function isLocalArtifactDepictionScale(depictionScale: ArtifactDepictionScale): boolean {
  const policy = getArtifactArtworkScalePolicy(depictionScale);
  return policy.presence === 'artifact_pin' || policy.presence === 'deployment_site' || policy.presence === 'visible_structure';
}

export function isArtifactPinDepictionScale(depictionScale: ArtifactDepictionScale): boolean {
  return getArtifactArtworkScalePolicy(depictionScale).presence === 'artifact_pin';
}
