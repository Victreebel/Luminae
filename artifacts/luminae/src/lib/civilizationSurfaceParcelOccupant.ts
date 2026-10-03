import type { CivilizationDistrictInstance } from '@workspace/api-client-react';
import type { CivilizationPlateMaturity } from '@/lib/civilizationDyadEvolutionPlateManifest';
import type { CivilizationSurfaceDistrictParcel } from '@/lib/civilizationSurfaceDistrictPlan';

export type CivilizationSurfaceParcelOccupant =
  | { kind: 'specialist'; district: CivilizationDistrictInstance }
  | {
    kind: 'civilian';
    themeKey: string;
    maturity: CivilizationPlateMaturity;
    variant: CivilizationSurfaceDistrictParcel['genericFillerVariant'];
  };

/** Presentation only: civilian buildings never create a district or resident. */
export function resolveCivilizationSurfaceParcelOccupant({
  parcel,
  districtInstances,
  themeKey,
  maturity,
}: {
  parcel: CivilizationSurfaceDistrictParcel;
  districtInstances: readonly CivilizationDistrictInstance[];
  themeKey: string;
  maturity: CivilizationPlateMaturity;
}): CivilizationSurfaceParcelOccupant {
  const district = districtInstances.find((candidate) => (
    candidate.family === parcel.family && candidate.instance === parcel.instance
  ));
  if (district && district.residentArtifactIds.length > 0) {
    return { kind: 'specialist', district };
  }
  return { kind: 'civilian', themeKey, maturity, variant: parcel.genericFillerVariant };
}
