import { describe, expect, it } from 'vitest';
import type { ArtifactCard } from '@workspace/api-client-react';
import {
  CIVILIZATION_ARCHETYPE_VISUALS,
  deriveCivilizationArchetype,
  getCivilizationArchetypeAssetSlot,
  getCivilizationArchetypeTone,
} from '@/lib/civilizationArchetypes';
import { buildCivilizationProfile } from '@/lib/civilizationProfile';

function artifact(id: string, bonusAffinity: ArtifactCard['bonusAffinity'] = 'verdance'): ArtifactCard {
  return {
    id,
    name: id,
    tier: 1,
    eminence: 1,
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

const quietSignals = {
  living: false,
  foundry: false,
  hazard: false,
  luminary: false,
  route: false,
  redaction: false,
  blueprintCount: 0,
};

describe('civilization archetypes', () => {
  it('returns no archetype for an empty quiet civilization', () => {
    expect(deriveCivilizationArchetype(buildCivilizationProfile([]), quietSignals)).toBeNull();
  });

  it('maps dominant traits into market-facing composition archetypes', () => {
    expect(deriveCivilizationArchetype(buildCivilizationProfile([artifact('t1r02')]), quietSignals))
      .toBe('living_arcology');
    expect(deriveCivilizationArchetype(buildCivilizationProfile([artifact('t1r01', 'flare')]), quietSignals))
      .toBe('forge_spine');
    expect(deriveCivilizationArchetype(buildCivilizationProfile([artifact('t1s02', 'continuum')]), quietSignals))
      .toBe('route_network');
    expect(deriveCivilizationArchetype(buildCivilizationProfile([artifact('t1s01', 'continuum')]), quietSignals))
      .toBe('archive_lattice');
    expect(deriveCivilizationArchetype(buildCivilizationProfile([artifact('t2p03', 'radiance')]), quietSignals))
      .toBe('accord_beacon');
  });

  it('lets danger and redaction override softer identities', () => {
    const profile = buildCivilizationProfile([artifact('t1r02')]);

    expect(deriveCivilizationArchetype(profile, { ...quietSignals, hazard: true }))
      .toBe('containment_sentinel');
    expect(deriveCivilizationArchetype(profile, { ...quietSignals, redaction: true }))
      .toBe('containment_sentinel');
  });

  it('exposes stable art asset slots for future plate variants', () => {
    expect(getCivilizationArchetypeAssetSlot('living_arcology', 'surface'))
      .toBe('civilization.archetype.living_arcology.surface');
    expect(CIVILIZATION_ARCHETYPE_VISUALS.living_arcology.assetSlots.stellar)
      .toBe('civilization.archetype.living_arcology.stellar');
    expect(CIVILIZATION_ARCHETYPE_VISUALS.containment_sentinel.compositionKey)
      .toBe('quarantine-field');
    expect(getCivilizationArchetypeTone('forge_spine', '#ffffff'))
      .toBeTruthy();
  });
});
