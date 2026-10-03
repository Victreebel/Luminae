import { describe, expect, it } from 'vitest';
import { getCivilizationDistrictGroundFootprint } from '@/lib/civilizationDistrictGroundFootprint';
import { getCivilizationDistrictPresentation } from '@/lib/civilizationDistrictPresentation';
import { CHRYSALIS_SURFACE_DISTRICT_PARCELS } from '@/lib/civilizationSurfaceDistrictPlan';

describe('district ground clearance', () => {
  it.each([[false, 16 / 9], [true, 4 / 5], [false, 2.4]] as const)(
    'keeps every floor inside its fixed fitted parcel, below the building airspace (%s, %s)',
    (compact, aspect) => {
      const before = structuredClone(CHRYSALIS_SURFACE_DISTRICT_PARCELS);
      for (const parcel of CHRYSALIS_SURFACE_DISTRICT_PARCELS) {
        const footprint = getCivilizationDistrictGroundFootprint(parcel.id, compact, aspect)!;
        const fit = getCivilizationDistrictPresentation(parcel.id, compact, aspect)!;
        const anchor = compact ? parcel.mobileTransform : parcel.desktopTransform;
        expect(footprint.anchor, parcel.id).toEqual({ x: anchor.x, y: anchor.y });
        expect(footprint.floorBounds.minY, parcel.id).toBeGreaterThan(fit.bounds.minY + fit.width * aspect * 0.5);
        expect(footprint.floorBounds.maxY - footprint.floorBounds.minY, parcel.id)
          .toBeGreaterThanOrEqual(fit.width * aspect * 0.3);
        expect(footprint.floorBounds.minY, parcel.id).toBeLessThan(anchor.y);
        expect(footprint.floorBounds.maxY, parcel.id).toBeCloseTo(anchor.y + fit.width * aspect * 0.06);
        for (const [x, y] of footprint.floor) {
          expect(x, parcel.id).toBeGreaterThanOrEqual(fit.bounds.minX);
          expect(x, parcel.id).toBeLessThanOrEqual(fit.bounds.maxX);
          expect(y, parcel.id).toBeGreaterThanOrEqual(fit.bounds.minY);
          expect(y, parcel.id).toBeLessThanOrEqual(fit.bounds.maxY + 1e-10);
        }
      }
      expect(CHRYSALIS_SURFACE_DISTRICT_PARCELS).toEqual(before);
    },
  );

  it('requires a deck across the existing desktop Transit road without moving its anchor', () => {
    const desktop = getCivilizationDistrictGroundFootprint('transit-west-gate')!;
    expect(desktop.support).toBe('road-spanning-deck');
    expect(desktop.anchor).toEqual({ x: 28, y: 68 });
    expect(getCivilizationDistrictGroundFootprint('transit-west-gate', true)!.support).toBe('station-platform');
  });

  it('requires a desktop archive-court deck while keeping its compact floor on a normal terrace', () => {
    const parcel = CHRYSALIS_SURFACE_DISTRICT_PARCELS.find(({ id }) => id === 'archive-east-court')!;
    const desktop = getCivilizationDistrictGroundFootprint(parcel.id)!;
    expect(desktop.support).toBe('road-spanning-deck');
    expect(desktop.anchor).toEqual({ x: parcel.desktopTransform.x, y: parcel.desktopTransform.y });
    expect(getCivilizationDistrictGroundFootprint(parcel.id, true)!.support).toBe('terrace');
  });

  it.each([false, true])('keeps quay water and piles separate from solid floors (%s)', (compact) => {
    for (const parcel of CHRYSALIS_SURFACE_DISTRICT_PARCELS.filter(({ family }) => family === 'coastal_margin')) {
      const footprint = getCivilizationDistrictGroundFootprint(parcel.id, compact)!;
      const fit = getCivilizationDistrictPresentation(parcel.id, compact)!;
      expect(footprint.support).toBe('piled-quay');
      expect(footprint.waterAndPileBounds!.minY).toBe(footprint.floorBounds.maxY);
      expect(footprint.waterAndPileBounds!.maxY).toBe(fit.bounds.maxY);
      expect(footprint.waterAndPileBounds!.maxY).toBeGreaterThan(footprint.floorBounds.maxY);
    }
  });

  it('does not invent floors for unknown parcels', () => {
    expect(getCivilizationDistrictGroundFootprint('unknown')).toBeUndefined();
  });
});
