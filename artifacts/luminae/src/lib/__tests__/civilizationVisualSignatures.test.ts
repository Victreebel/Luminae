import { describe, expect, it } from 'vitest';
import type { CivilizationDeploymentSite } from '@/lib/civilizationDeploymentSites';
import {
  getCivilizationVisualSignature,
  isSmallArtifactVisualSignature,
  selectCivilizationVisualSignatures,
} from '@/lib/civilizationVisualSignatures';

function site(overrides: Partial<CivilizationDeploymentSite> = {}): CivilizationDeploymentSite {
  return {
    id: 'artifact:t1r02',
    kind: 'artifact',
    scaleBand: 'stellar',
    trait: 'biosphere',
    artifactId: 't1r02',
    artifactTier: 1,
    artifactForm: 'Biotech Module',
    blueprintRole: 'habitat ecology support',
    blueprintFamilies: 'Planetary Cradle Engine',
    componentSummary: undefined,
    gameplayEffect: undefined,
    consequenceLabel: 'Living Recovery',
    visualCue: 'living habitat bands between worlds',
    synergySummary: 'A trace is combining with related civic work.',
    supportingArtifactNames: [],
    engineeringScale: 'Planetary',
    depictionScale: 'macro',
    representationMode: 'local_trace',
    sourceQuality: 'authored',
    blueprintId: undefined,
    affinity: 'verdance',
    anchor: { x: 50, y: 50 },
    priority: 100,
    title: 'Ashroot Bloom Trace',
    summary: 'The scan registers local work without enlarging the artifact.',
    visibleAs: 'habitat ecology chains threaded between worlds',
    laneLabel: 'Habitat ecology',
    relatedArtifactIds: ['t1r02'],
    ...overrides,
  };
}

describe('civilization visual signatures', () => {
  it('maps small artifact traces into public trait signatures', () => {
    const descriptor = getCivilizationVisualSignature(site());

    expect(descriptor.kind).toBe('biosphere');
    expect(descriptor.sourceKind).toBe('artifact');
    expect(descriptor.publicByDefault).toBe(true);
    expect(isSmallArtifactVisualSignature(descriptor.site)).toBe(true);
  });

  it('maps known Blueprint projects into bespoke environmental signatures', () => {
    expect(getCivilizationVisualSignature(site({
      id: 'blueprint:bp_antimatter_detonator',
      kind: 'blueprint',
      blueprintId: 'bp_antimatter_detonator',
      artifactId: undefined,
      artifactTier: undefined,
      representationMode: 'blueprint_consequence',
      affinity: 'abyss',
      title: 'Antimatter Quarantine Orbit',
      priority: 1000,
    })).kind).toBe('quarantine');

    expect(getCivilizationVisualSignature(site({
      id: 'blueprint:bp_mantle_to_orbit_foundry',
      kind: 'blueprint',
      blueprintId: 'bp_mantle_to_orbit_foundry',
      artifactId: undefined,
      artifactTier: undefined,
      representationMode: 'blueprint_consequence',
      affinity: 'flare',
      title: 'Mantle-to-Orbit Freight Lane',
      priority: 1000,
    })).kind).toBe('foundry');

    expect(getCivilizationVisualSignature(site({
      id: 'blueprint:bp_worldshield_covenant',
      kind: 'blueprint',
      blueprintId: 'bp_worldshield_covenant',
      artifactId: undefined,
      artifactTier: undefined,
      representationMode: 'blueprint_consequence',
      affinity: 'radiance',
      title: 'Worldshield Covenant Veil',
      priority: 1000,
    })).kind).toBe('shield');
  });

  it('keeps sealed future records out of ambient signatures unless scan includes sealed marks', () => {
    const protocol = site({
      id: 'protocol:sealed_protocol_01',
      kind: 'protocol',
      artifactId: undefined,
      artifactTier: undefined,
      representationMode: 'sealed_protocol',
      title: 'Sealed Protocol 01',
      priority: 900,
    });

    expect(getCivilizationVisualSignature(protocol).kind).toBe('sealed');
    expect(getCivilizationVisualSignature(protocol).publicByDefault).toBe(false);
    expect(selectCivilizationVisualSignatures([protocol], { limit: 3 })).toHaveLength(0);
    expect(selectCivilizationVisualSignatures([protocol], { limit: 3, includeSealed: true })[0]?.kind).toBe('sealed');
  });

  it('keeps a small artifact signature visible when major projects compete for slots', () => {
    const signatures = selectCivilizationVisualSignatures([
      site({
        id: 'blueprint:bp_antimatter_detonator',
        kind: 'blueprint',
        blueprintId: 'bp_antimatter_detonator',
        artifactId: undefined,
        artifactTier: undefined,
        representationMode: 'blueprint_consequence',
        affinity: 'abyss',
        title: 'Antimatter Quarantine Orbit',
        priority: 1000,
      }),
      site({
        id: 'luminary:ember',
        kind: 'luminary',
        artifactId: undefined,
        artifactTier: undefined,
        representationMode: 'luminary_influence',
        title: 'Ember Sovereign Pressure',
        priority: 900,
      }),
      site({
        id: 'artifact:t1r02',
        artifactId: 't1r02',
        artifactTier: 1,
        priority: 120,
        title: 'Ashroot Bloom Trace',
      }),
    ], { limit: 2 });

    expect(signatures.map((signature) => signature.site.id)).toEqual([
      'blueprint:bp_antimatter_detonator',
      'artifact:t1r02',
    ]);
  });

  it('prefers distinct visual signatures before repeating the same trait family', () => {
    const signatures = selectCivilizationVisualSignatures([
      site({ id: 'artifact:t2a', artifactId: 't2a', artifactTier: 2, priority: 300, title: 'First Biosphere Trace' }),
      site({ id: 'artifact:t2b', artifactId: 't2b', artifactTier: 2, priority: 290, title: 'Second Biosphere Trace' }),
      site({ id: 'artifact:t2c', artifactId: 't2c', artifactTier: 2, priority: 240, trait: 'transit', title: 'Transit Trace' }),
    ], { limit: 2, sourceKinds: ['artifact'] });

    expect(signatures.map((signature) => signature.kind)).toEqual(['biosphere', 'transit']);
  });
});
