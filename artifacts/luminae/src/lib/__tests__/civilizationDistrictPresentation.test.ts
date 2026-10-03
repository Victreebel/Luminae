import { describe, expect, it } from 'vitest';
import {
  buildCivilizationDistrictPresentation,
  CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS,
  CIVILIZATION_DISTRICT_PRESENTATION_GAP,
  getCivilizationDistrictPresentation,
} from '@/lib/civilizationDistrictPresentation';
import { CHRYSALIS_SURFACE_DISTRICT_PARCELS } from '@/lib/civilizationSurfaceDistrictPlan';

describe('fixed district presentation fit', () => {
  it.each([
    [false, CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS.desktop],
    [true, CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS.compact],
    [false, 2.4],
    [false, 1],
  ] as const)('preserves real corridors around all 30 full artwork boxes (compact %s, aspect %s)', (compact, aspect) => {
    const fitted = buildCivilizationDistrictPresentation(compact, CHRYSALIS_SURFACE_DISTRICT_PARCELS, aspect);
    expect(fitted.size).toBe(30);
    const entries = [...fitted.entries()];
    entries.forEach(([id, presentation], index) => {
      const parcel = CHRYSALIS_SURFACE_DISTRICT_PARCELS.find((candidate) => candidate.id === id)!;
      const transform = compact ? parcel.mobileTransform : parcel.desktopTransform;
      expect(getCivilizationDistrictPresentation(id, compact, aspect)).toEqual(presentation);
      expect(presentation.width, id).toBeGreaterThan(0);
      expect(presentation.width, id).toBeLessThanOrEqual(transform.presentationWidth ?? transform.width);
      expect((presentation.bounds.minX + presentation.bounds.maxX) / 2, id).toBeCloseTo(transform.x);
      expect(presentation.bounds.minY + presentation.width * 0.94 * aspect, id).toBeCloseTo(transform.y);
      expect(presentation.bounds.minX, id).toBeGreaterThanOrEqual(0);
      expect(presentation.bounds.maxX, id).toBeLessThanOrEqual(100);
      expect(presentation.bounds.minY, id).toBeGreaterThanOrEqual(0);
      expect(presentation.bounds.maxY, id).toBeLessThanOrEqual(100);
      entries.slice(index + 1).forEach(([otherId, other]) => {
        const horizontalGap = Math.max(other.bounds.minX - presentation.bounds.maxX, presentation.bounds.minX - other.bounds.maxX);
        const verticalGap = Math.max(other.bounds.minY - presentation.bounds.maxY, presentation.bounds.minY - other.bounds.maxY) / aspect;
        expect(Math.max(horizontalGap, verticalGap), `${id} / ${otherId}`)
          .toBeGreaterThanOrEqual(CIVILIZATION_DISTRICT_PRESENTATION_GAP - 1e-9);
      });
    });
  });

  it.each([false, true])('reserves readable background districts in the authored viewport (compact %s)', (compact) => {
    const fitted = buildCivilizationDistrictPresentation(compact);
    for (const parcel of CHRYSALIS_SURFACE_DISTRICT_PARCELS) {
      expect(fitted.get(parcel.id)!.width, parcel.id).toBeGreaterThanOrEqual(parcel.instance === 0 ? 5 : 3.5);
    }
  });

  it('keeps compact primary work districts readable while retaining prominent foreground landmarks', () => {
    const fitted = buildCivilizationDistrictPresentation(true);
    const pixels = (id: string) => fitted.get(id)!.width * 372 / 100;
    for (const id of ['industry-west', 'containment-west', 'frontier-east']) {
      expect(pixels(id), id).toBeGreaterThan(55);
    }
    expect(pixels('observatory-northwest')).toBeGreaterThan(40);
    for (const id of ['civic-central', 'underworks-southwest', 'habitat-east']) {
      expect(pixels(id), id).toBeGreaterThan(70);
    }
    expect(pixels('transit-west-gate')).toBeGreaterThan(70);
    expect(pixels('archive-northwest')).toBeGreaterThan(70);
  });

  it('uses the western Transit court while retaining its original ground anchor', () => {
    const fitted = buildCivilizationDistrictPresentation();
    expect(fitted.get('transit-west-gate')!.width * 1390 / 100).toBeGreaterThan(125);
    expect(fitted.get('underworks-southwest')!.width * 1390 / 100).toBeGreaterThan(235);
  });

  it.each([false, true])('uses every available increment within its final safe bounds (compact %s)', (compact) => {
    const fitted = buildCivilizationDistrictPresentation(compact);
    const aspect = compact ? 4 / 5 : 16 / 9;
    // A meaningful increase would cross the socket/perspective ceiling, canvas,
    // or a full artwork corridor. This also detects space abandoned after a cap.
    for (const [id, presentation] of fitted) {
      expect(presentation.width, id).toBeLessThanOrEqual(presentation.maxWidth);
      expect(presentation.limitedBy.length, id).toBeGreaterThan(0);
      const increment = 0.001;
      if (presentation.width + increment > presentation.maxWidth) continue;
      const parcel = CHRYSALIS_SURFACE_DISTRICT_PARCELS.find((candidate) => candidate.id === id)!;
      const expanded = {
        minX: presentation.bounds.minX - increment / 2,
        maxX: presentation.bounds.maxX + increment / 2,
        minY: presentation.bounds.minY - increment * 0.94 * aspect,
        maxY: presentation.bounds.maxY + increment * (0.06 + (parcel.family === 'coastal_margin'
          ? parcel.shoreSupportDepth ?? 0.1 : 0)) * aspect,
      };
      const leavesCanvas = expanded.minX < 0 || expanded.maxX > 100 || expanded.minY < 0 || expanded.maxY > 100;
      const closesCorridor = [...fitted.entries()].some(([otherId, other]) => {
        if (otherId === id) return false;
        const horizontalGap = Math.max(other.bounds.minX - expanded.maxX, expanded.minX - other.bounds.maxX);
        const verticalGap = Math.max(other.bounds.minY - expanded.maxY, expanded.minY - other.bounds.maxY) / aspect;
        return Math.max(horizontalGap, verticalGap) < CIVILIZATION_DISTRICT_PRESENTATION_GAP;
      });
      expect(leavesCanvas || closesCorridor, id).toBe(true);
    }
  });

  it.each([false, true])('preserves larger first instances and smaller later perspectives (compact %s)', (compact) => {
    const fitted = buildCivilizationDistrictPresentation(compact);
    for (const parcel of CHRYSALIS_SURFACE_DISTRICT_PARCELS) {
      if (parcel.instance === 0) continue;
      const first = CHRYSALIS_SURFACE_DISTRICT_PARCELS.find((candidate) => candidate.family === parcel.family && candidate.instance === 0)!;
      expect(fitted.get(parcel.id)!.width, parcel.id).toBeLessThan(fitted.get(first.id)!.width);
    }
  });

  it.each([false, true])('adds the third-instance parcels without shrinking existing primary districts (compact %s)', (compact) => {
    const added = new Set(['frontier-west-ledge', 'industry-west-terrace', 'archive-east-court', 'containment-east-court', 'underworks-central-cut', 'transit-central-platform', 'coastal-breakwater']);
    const previousPlan = CHRYSALIS_SURFACE_DISTRICT_PARCELS.filter(({ id }) => !added.has(id));
    const previous = buildCivilizationDistrictPresentation(compact, previousPlan);
    const current = buildCivilizationDistrictPresentation(compact);
    for (const parcel of previousPlan.filter(({ instance }) => instance === 0)) {
      expect(current.get(parcel.id)!.width, parcel.id).toBe(previous.get(parcel.id)!.width);
      expect(current.get(parcel.id)!.bounds, parcel.id).toEqual(previous.get(parcel.id)!.bounds);
    }
  });

  it('is invariant under input order and does not use occupancy, stage, dyad, or legacy scale', () => {
    const canonical = buildCivilizationDistrictPresentation();
    const reordered = buildCivilizationDistrictPresentation(false, [...CHRYSALIS_SURFACE_DISTRICT_PARCELS].reverse());
    const restyled = buildCivilizationDistrictPresentation(false, CHRYSALIS_SURFACE_DISTRICT_PARCELS.map((parcel) => ({
      ...parcel,
      activationStage: 0,
      desktopTransform: { ...parcel.desktopTransform, scale: 2.5 },
    })));
    expect(reordered).toEqual(canonical);
    expect(restyled).toEqual(canonical);
    for (const [id, fit] of canonical) expect(getCivilizationDistrictPresentation(id)).toEqual(fit);
  });

  it.each([false, true])('includes the coastal pylons below the 94%% artwork anchor (compact %s)', (compact) => {
    const parcel = CHRYSALIS_SURFACE_DISTRICT_PARCELS.find(({ family }) => family === 'coastal_margin')!;
    const fit = getCivilizationDistrictPresentation(parcel.id, compact)!;
    const transform = compact ? parcel.mobileTransform : parcel.desktopTransform;
    const aspect = compact ? 4 / 5 : 16 / 9;
    expect(fit.bounds.minY).toBeCloseTo(transform.y - fit.width * 0.94 * aspect);
    expect(fit.bounds.maxY).toBeCloseTo(transform.y + fit.width * 0.16 * aspect);
  });

  it('maximizes a free socket and reports when the canvas constrains an edge socket', () => {
    const original = CHRYSALIS_SURFACE_DISTRICT_PARCELS[0]!;
    const free = { ...original, desktopTransform: { ...original.desktopTransform, x: 50, y: 60, width: 20 } };
    const fit = buildCivilizationDistrictPresentation(false, [free]).get(free.id)!;
    expect(fit.width).toBe(20);
    expect(fit.limitedBy).toContain('socket-width');
    const edge = { ...free, desktopTransform: { ...free.desktopTransform, x: 2 } };
    const constrained = buildCivilizationDistrictPresentation(false, [edge]).get(edge.id)!;
    expect(constrained.width).toBeCloseTo(4, 3);
    expect(constrained.limitedBy).toContain('canvas');
    expect(constrained.belowPreferredReadability).toBe(true);
  });

  it('rejects an impossible corridor instead of hiding or clipping a district', () => {
    const original = CHRYSALIS_SURFACE_DISTRICT_PARCELS[0]!;
    expect(() => buildCivilizationDistrictPresentation(false, [original, { ...original, id: 'duplicate-anchor' }]))
      .toThrow('cannot preserve the presentation corridor');
  });

  it('bounds an isolated secondary parcel when a custom plan omits its first instance', () => {
    const original = CHRYSALIS_SURFACE_DISTRICT_PARCELS.find(({ instance }) => instance === 1)!;
    const fit = buildCivilizationDistrictPresentation(false, [original]).get(original.id)!;
    expect(fit.width).toBeGreaterThan(0);
    expect(fit.width).toBeLessThanOrEqual(original.desktopTransform.width);
    expect(fit.width).toBeLessThanOrEqual(fit.maxWidth);
  });

  it('rejects unavailable viewport measurements without returning unsafe sizes', () => {
    for (const aspect of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => buildCivilizationDistrictPresentation(false, CHRYSALIS_SURFACE_DISTRICT_PARCELS, aspect))
        .toThrow('finite, positive scene aspect ratio');
    }
  });
});
