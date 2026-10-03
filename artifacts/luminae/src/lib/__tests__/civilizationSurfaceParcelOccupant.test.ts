import { describe, expect, it } from 'vitest';
import type { CivilizationDistrictInstance } from '@workspace/game-types';
import { CHRYSALIS_SURFACE_DISTRICT_PARCELS } from '@/lib/civilizationSurfaceDistrictPlan';
import { resolveCivilizationSurfaceParcelOccupant } from '@/lib/civilizationSurfaceParcelOccupant';

const parcel = CHRYSALIS_SURFACE_DISTRICT_PARCELS.find(({ id }) => id === 'civic-central')!;
const district: CivilizationDistrictInstance = {
  districtId: 'district:civic_core:0', family: parcel.family, instance: parcel.instance,
  residentArtifactIds: ['t1r08', 't1o08'], residentAffinities: ['flare', 'abyss'],
  foundingAffinities: ['flare', 'abyss'], permanentDyad: 'chrysalis',
  softCapacity: 2, hardCapacity: 3, influence: 2, establishedTurnCount: 1,
  committedTurnCount: 2, historyEvidence: 'recorded',
};

describe('Surface parcel occupant selection', () => {
  it.each(['chrysalis', 'echo', null] as const)('preserves a resident district with %s identity as the exclusive specialist', (permanentDyad) => {
    const residentDistrict: CivilizationDistrictInstance = permanentDyad ? { ...district, permanentDyad } : {
      ...district, permanentDyad, residentArtifactIds: ['t1r08'], residentAffinities: ['flare'],
      foundingAffinities: ['flare'], influence: 0, committedTurnCount: null,
    };
    const occupant = resolveCivilizationSurfaceParcelOccupant({
      parcel, districtInstances: [residentDistrict], themeKey: 'chrysalis', maturity: 'galactic',
    });
    expect(occupant).toEqual({ kind: 'specialist', district: residentDistrict });
    if (occupant.kind === 'specialist') expect(occupant.district).toBe(residentDistrict);
    expect(occupant).not.toHaveProperty('themeKey');
  });

  it('uses the parcel variant for an empty address without creating a district or mutating state', () => {
    const districts = [{ ...district, residentArtifactIds: [] }];
    const before = structuredClone(districts);
    expect(resolveCivilizationSurfaceParcelOccupant({
      parcel, districtInstances: districts, themeKey: 'chrysalis', maturity: 'galactic',
    })).toEqual({ kind: 'civilian', themeKey: 'chrysalis', maturity: 'galactic', variant: parcel.genericFillerVariant });
    expect(districts).toEqual(before);
  });

  it('matches the complete persistent address and keeps all unoccupied variant choices stable', () => {
    const unrelated = [{ ...district, instance: district.instance + 1 }, { ...district, family: 'industrial_district' as const }];
    const select = (districtInstances: CivilizationDistrictInstance[]) => CHRYSALIS_SURFACE_DISTRICT_PARCELS
      .map((candidate) => resolveCivilizationSurfaceParcelOccupant({
        parcel: candidate, districtInstances, themeKey: 'chrysalis', maturity: 'galactic',
      }));
    expect(resolveCivilizationSurfaceParcelOccupant({
      parcel, districtInstances: unrelated, themeKey: 'chrysalis', maturity: 'galactic',
    }).kind).toBe('civilian');
    expect(select(unrelated)).toEqual(select([...unrelated].reverse()));
    expect(select([])).toEqual(CHRYSALIS_SURFACE_DISTRICT_PARCELS.map((candidate) => ({
      kind: 'civilian', themeKey: 'chrysalis', maturity: 'galactic', variant: candidate.genericFillerVariant,
    })));
  });

  it('accepts visual theme and maturity inputs without deriving new identity mechanics', () => {
    expect(resolveCivilizationSurfaceParcelOccupant({
      parcel, districtInstances: [], themeKey: 'future-visual-theme', maturity: 'stellar',
    })).toEqual({ kind: 'civilian', themeKey: 'future-visual-theme', maturity: 'stellar', variant: parcel.genericFillerVariant });
  });
});
