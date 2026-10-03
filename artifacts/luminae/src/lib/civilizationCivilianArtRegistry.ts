import type { CivilizationPlateMaturity } from '@/lib/civilizationDyadEvolutionPlateManifest';
import type { CivilizationManifestationArt } from '@/lib/civilizationManifestationArtRegistry';
import type { CivilizationSurfaceDistrictParcel } from '@/lib/civilizationSurfaceDistrictPlan';
import chrysalisGalacticCivilianAtlas from '@/assets/civilization/manifestations/chrysalis/civilian-galactic-atlas-v1.webp';

export interface CivilizationCivilianParcelArt extends CivilizationManifestationArt {
  /** Foundation base inside its atlas cell, excluding the soft shadow/fringe. */
  groundLine: number;
}

// Measured from each 512px cell's last substantial opaque foundation row.
// The bottom row was authored higher in its cells; retain the original pixels
// and align each cropped cell to the parcel's ground line during rendering.
const CIVILIAN_CELLS: Record<CivilizationSurfaceDistrictParcel['genericFillerVariant'], readonly [number, number, number]> = {
  terrace: [0, 0, 487 / 512],
  campus: [1, 0, 498 / 512],
  garden: [2, 0, 500 / 512],
  works: [0, 1, 426 / 512],
  edge: [1, 1, 431 / 512],
};

/** Civilian architecture follows the presented city, without establishing district identity. */
export function getCivilizationCivilianParcelArt(
  themeKey: string,
  maturity: CivilizationPlateMaturity,
  variant: CivilizationSurfaceDistrictParcel['genericFillerVariant'],
): CivilizationCivilianParcelArt | null {
  // Other identities/tiers require their own authored edition. A future Triad
  // key can be registered here without changing district identity mechanics.
  if (themeKey !== 'chrysalis' || maturity !== 'galactic') return null;
  const [column, row, groundLine] = CIVILIAN_CELLS[variant];
  return {
    src: chrysalisGalacticCivilianAtlas,
    anchor: { x: 50, y: 94 },
    scale: 1,
    aspectRatio: 1,
    groundLine,
    atlas: { columns: 3, rows: 2, column, row },
  };
}
