import { describe, expect, it } from 'vitest';
import type { ArtifactCard } from '@workspace/api-client-react';
import {
  buildCivilizationProfile,
  getArtifactCivilizationTrait,
} from '@/lib/civilizationProfile';

function artifact(
  id: string,
  tier: number,
  bonusAffinity: ArtifactCard['bonusAffinity'],
  name = id,
  eminence = tier,
): ArtifactCard {
  return {
    id,
    tier,
    bonusAffinity,
    eminence,
    name,
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

describe('civilization profiles', () => {
  it('maps known artifacts to lore-aligned infrastructure families', () => {
    expect(getArtifactCivilizationTrait(
      artifact('t2e01', 2, 'verdance', 'Solar Immune Organ'),
    )).toBe('ecology');
    expect(getArtifactCivilizationTrait(
      artifact('t3s01', 3, 'continuum', 'Wormgate Spine'),
    )).toBe('transit');
    expect(getArtifactCivilizationTrait(
      artifact('t2p01', 2, 'radiance', 'Containment Lattice'),
    )).toBe('containment');
  });

  it('is deterministic for the same forged collection', () => {
    const cards = [
      artifact('t1r01', 1, 'flare'),
      artifact('t2e01', 2, 'verdance'),
      artifact('t3r04', 3, 'flare'),
    ];

    expect(buildCivilizationProfile(cards)).toEqual(buildCivilizationProfile(cards));
  });

  it('keeps the base scene seed stable as later artifacts are forged', () => {
    const first = artifact('t1s01', 1, 'continuum');
    const initial = buildCivilizationProfile([first]);
    const evolved = buildCivilizationProfile([
      first,
      artifact('t2p01', 2, 'radiance'),
    ]);

    expect(evolved.seed).toBe(initial.seed);
    expect(evolved.landmarks.find(({ artifactId }) => artifactId === first.id)?.seed)
      .toBe(initial.landmarks[0]?.seed);
  });

  it('prioritizes high-tier landmarks while preserving family variety', () => {
    const profile = buildCivilizationProfile([
      artifact('t1r01', 1, 'flare'),
      artifact('t2r01', 2, 'flare'),
      artifact('t3r01', 3, 'flare'),
      artifact('t2e01', 2, 'verdance'),
      artifact('t3r04', 3, 'flare'),
      artifact('t2p01', 2, 'radiance'),
      artifact('t2s05', 2, 'continuum'),
    ]);

    expect(profile.landmarks).toHaveLength(6);
    expect(profile.landmarks[0]?.artifactId).toBe('t3r01');
    expect(new Set(profile.landmarks.map(({ trait }) => trait)).size).toBeGreaterThan(3);
  });

  it('weights higher-tier artifacts more strongly in the dominant signature', () => {
    const profile = buildCivilizationProfile([
      artifact('t1e01', 1, 'verdance'),
      artifact('t1e05', 1, 'verdance'),
      artifact('t3s01', 3, 'continuum', 'Wormgate Spine', 5),
    ]);

    expect(profile.dominantTraits[0]).toBe('transit');
    expect(profile.traitCounts.fabrication).toBe(2);
    expect(profile.traitCounts.transit).toBe(1);
  });
});
