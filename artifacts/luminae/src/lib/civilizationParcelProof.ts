import type { ArtifactId, CivilizationSurfaceDistrictFamily } from '@workspace/game-types';

/** Reduced, chronologically replayed witnesses from the 2026-09-30 parcel audit.
 * These are allocation histories, not resource/economy simulations. */
export const CIVILIZATION_PARCEL_PROOFS = [
  {
    family: 'archive_quarter',
    label: 'Archive Quarter — third district',
    artifactIds: ['t1r05', 't1r07', 't1r08', 't1e01', 't1e02', 't1e03', 't1e07', 't1e08', 't1e09', 't1p02', 't1p03', 't1p04', 't1p05', 't1p07', 't1p08', 't1p09', 't1o02', 't1o03', 't1o05', 't1o07', 't1o08', 't1s01', 't1s05'],
  },
  {
    family: 'coastal_margin',
    label: 'Coastal Margin — third district',
    artifactIds: ['t1o07', 't1o06', 't1o05', 't1o04', 't1o03', 't1o02', 't1r08', 't1r07', 't1r06', 't1r05', 't1r04', 't1r03', 't1e09', 't1e08', 't1e07', 't1e06', 't1e05', 't1e04', 't1e03', 't1e02', 't1e01', 't1p09', 't1p08', 't1p07', 't1p05', 't1p03', 't1s09', 't1s06', 't1s05', 't1s01'],
  },
  {
    family: 'containment_zone',
    label: 'Containment Zone — third district',
    artifactIds: ['t1p09', 't1p05', 't1p03', 't1r03', 't1r02', 't1e05', 't1e04', 't1e03', 't1e02', 't1e01', 't1s07', 't1s04', 't1s03', 't1o07', 't1o05', 't1o04', 't1o01'],
  },
  {
    family: 'industrial_district',
    label: 'Industrial District — third district',
    artifactIds: ['t1r04', 't1r07', 't1e04', 't1e05', 't1e06', 't1e07', 't1o05', 't1o07', 't1o08', 't1o09', 't1p02', 't1p04', 't1p05', 't1p06', 't1s02', 't1s03', 't1s04', 't1s07'],
  },
  {
    family: 'subsurface_works',
    label: 'Subsurface Works — third district',
    artifactIds: ['t1r05', 't1p02', 't1p03', 't1p05', 't1p06', 't1p07', 't1p08', 't1e01', 't1e02', 't1e03', 't1e04', 't1e05', 't1e07', 't1e08', 't1s01', 't1s05', 't1s06', 't1o03', 't1o04', 't1o06'],
  },
  {
    family: 'transit_terminus',
    label: 'Transit Terminus — third district',
    artifactIds: ['t1o09', 't1o05', 't1o03', 't1e08', 't1e07', 't1e06', 't1e05', 't1e04', 't1e03', 't1e02', 't1e01', 't1s08', 't1s07', 't1s06', 't1s05', 't1s04', 't1s03', 't1s02', 't1p09', 't1p06', 't1p04', 't1p02', 't1p01', 't1r07', 't1r04', 't1r03', 't1r01'],
  },
  {
    family: 'wilderness_margin',
    label: 'Wilderness Margin — third district',
    artifactIds: ['t1p09', 't1p08', 't1p06', 't1p04', 't1o07', 't1o05', 't1o04', 't1o03', 't1o01', 't1e08', 't1e05', 't1e04', 't1e03', 't1e02', 't1e01', 't1s08', 't1s06', 't1r02'],
  }
] as const satisfies readonly { family: CivilizationSurfaceDistrictFamily; label: string; artifactIds: readonly ArtifactId[] }[];

export function getCivilizationParcelProof(family: string | null) {
  return CIVILIZATION_PARCEL_PROOFS.find((proof) => proof.family === family)
    ?? CIVILIZATION_PARCEL_PROOFS.find((proof) => proof.family === 'wilderness_margin')!;
}
