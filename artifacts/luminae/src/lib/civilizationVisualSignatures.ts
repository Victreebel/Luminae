import type { BlueprintId } from '@workspace/game-types';
import type {
  CivilizationDeploymentKind,
  CivilizationDeploymentSite,
} from '@/lib/civilizationDeploymentSites';
import type { CivilizationTrait } from '@/lib/civilizationProfile';

export type CivilizationVisualSignatureKind =
  | 'reactor'
  | 'biosphere'
  | 'clock'
  | 'transit'
  | 'archive'
  | 'lattice'
  | 'veil'
  | 'containment'
  | 'replication'
  | 'accord'
  | 'entropy'
  | 'aperture'
  | 'quarantine'
  | 'foundry'
  | 'shield'
  | 'luminary'
  | 'sealed';

export interface CivilizationVisualSignatureDescriptor {
  site: CivilizationDeploymentSite;
  kind: CivilizationVisualSignatureKind;
  sourceKind: CivilizationDeploymentKind;
  label: string;
  weight: number;
  publicByDefault: boolean;
}

interface SelectCivilizationVisualSignaturesOptions {
  limit: number;
  includeSealed?: boolean;
  sourceKinds?: readonly CivilizationDeploymentKind[];
}

const TRAIT_SIGNATURE_KIND: Record<CivilizationTrait, CivilizationVisualSignatureKind> = {
  ignition: 'reactor',
  biosphere: 'biosphere',
  chronology: 'clock',
  transit: 'transit',
  archive: 'archive',
  lattice: 'lattice',
  veil: 'veil',
  containment: 'containment',
  replication: 'replication',
  accord: 'accord',
  entropy: 'entropy',
  aperture: 'aperture',
};

const BLUEPRINT_SIGNATURE_KIND: Partial<Record<BlueprintId, CivilizationVisualSignatureKind>> = {
  bp_antimatter_detonator: 'quarantine',
  bp_mantle_to_orbit_foundry: 'foundry',
  bp_ascension_registry: 'accord',
  bp_worldshield_covenant: 'shield',
};

export function isSmallArtifactVisualSignature(site: CivilizationDeploymentSite): boolean {
  if (site.kind !== 'artifact') return false;
  if (site.depictionScale) {
    return (
      site.depictionScale === 'macro' ||
      site.depictionScale === 'tabletop' ||
      site.depictionScale === 'room' ||
      site.depictionScale === 'installation'
    );
  }
  // Unknown scale must never promote a card to a giant structure by tier.
  return true;
}

export function getCivilizationVisualSignature(
  site: CivilizationDeploymentSite,
): CivilizationVisualSignatureDescriptor {
  if (site.kind === 'blueprint') {
    return {
      site,
      kind: (site.blueprintId && BLUEPRINT_SIGNATURE_KIND[site.blueprintId]) || 'aperture',
      sourceKind: site.kind,
      label: site.title,
      weight: site.priority + 900,
      publicByDefault: true,
    };
  }

  if (site.kind === 'luminary') {
    return {
      site,
      kind: 'luminary',
      sourceKind: site.kind,
      label: site.title,
      weight: site.priority + 700,
      publicByDefault: true,
    };
  }

  if (site.kind === 'protocol') {
    return {
      site,
      kind: 'sealed',
      sourceKind: site.kind,
      label: 'Sealed protocol trace',
      weight: site.priority + 500,
      publicByDefault: false,
    };
  }

  return {
    site,
    kind: TRAIT_SIGNATURE_KIND[site.trait],
    sourceKind: site.kind,
    label: site.consequenceLabel,
    weight: site.priority + (isSmallArtifactVisualSignature(site) ? 80 : 0),
    publicByDefault: true,
  };
}

export function selectCivilizationVisualSignatures(
  sites: readonly CivilizationDeploymentSite[],
  options: SelectCivilizationVisualSignaturesOptions,
): CivilizationVisualSignatureDescriptor[] {
  const allowedKinds = options.sourceKinds ? new Set(options.sourceKinds) : null;
  const descriptors = sites
    .map(getCivilizationVisualSignature)
    .filter((descriptor) => !allowedKinds || allowedKinds.has(descriptor.sourceKind))
    .filter((descriptor) => descriptor.publicByDefault || options.includeSealed)
    .sort((left, right) => (
      right.weight - left.weight ||
      left.kind.localeCompare(right.kind) ||
      left.site.title.localeCompare(right.site.title)
    ));

  const selected: CivilizationVisualSignatureDescriptor[] = [];
  const representedKinds = new Set<CivilizationVisualSignatureKind>();

  const add = (descriptor: CivilizationVisualSignatureDescriptor | undefined) => {
    if (!descriptor) return;
    if (selected.some((entry) => entry.site.id === descriptor.site.id)) return;
    if (representedKinds.has(descriptor.kind) && selected.length >= Math.ceil(options.limit / 2)) return;
    if (selected.length >= options.limit) return;
    selected.push(descriptor);
    representedKinds.add(descriptor.kind);
  };

  add(descriptors.find((descriptor) => descriptor.sourceKind === 'blueprint'));
  add(descriptors.find((descriptor) => isSmallArtifactVisualSignature(descriptor.site)));
  add(descriptors.find((descriptor) => descriptor.sourceKind === 'luminary'));
  add(descriptors.find((descriptor) => descriptor.sourceKind === 'artifact' && (descriptor.site.artifactTier ?? 0) >= 3));
  add(descriptors.find((descriptor) => descriptor.sourceKind === 'protocol'));

  for (const descriptor of descriptors) add(descriptor);
  return selected;
}
