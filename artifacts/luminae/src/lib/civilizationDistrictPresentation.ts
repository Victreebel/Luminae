import {
  CHRYSALIS_SURFACE_DISTRICT_PARCELS,
  type CivilizationSurfaceDistrictParcel,
} from '@/lib/civilizationSurfaceDistrictPlan';

export const CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS = {
  desktop: 16 / 9,
  compact: 4 / 5,
} as const;

/** A corridor one percent of the scene's width, including vertical separations. */
export const CIVILIZATION_DISTRICT_PRESENTATION_GAP = 1;

const GROUND_ANCHOR = 0.94;
const SECONDARY_PERSPECTIVE = 0.84;
const PREFERRED_MINIMUM_WIDTH = 8;
// Reserve visible middle-row architecture before foreground growth spends the
// remaining room. A distant harbor needs less screen space than a civic terrace.
const PREFERRED_PRIMARY_WIDTH = { foreground: 12, midground: 10, distance: 6 } as const;
// Compact foreground landmarks must leave room for readable first-instance
// work districts, rather than reducing those hosts to tiny background stamps.
const COMPACT_PREFERRED_PRIMARY_WIDTH = { ...PREFERRED_PRIMARY_WIDTH, midground: 16 } as const;
const PRECISION = 0.0001;

export interface CivilizationDistrictPresentationBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface CivilizationDistrictPresentation {
  /** Full square artwork width as a percentage of scene width; do not scale again. */
  width: number;
  /** Full artwork and structural support bounds in scene x/y percentages. */
  bounds: CivilizationDistrictPresentationBounds;
  /** Socket and perspective ceiling before adjacent artwork/canvas constraints. */
  maxWidth: number;
  limitedBy: readonly string[];
  belowPreferredReadability: boolean;
}

interface FittingParcel {
  parcel: CivilizationSurfaceDistrictParcel;
  x: number;
  /** All fitting distances use scene-width units so aspect ratios cannot distort gaps. */
  y: number;
  maxWidth: number;
  preferredMinimum: number;
  width: number;
}

function boundsFor(item: FittingParcel, width = item.width): CivilizationDistrictPresentationBounds {
  return {
    minX: item.x - width / 2,
    maxX: item.x + width / 2,
    minY: item.y - GROUND_ANCHOR * width,
    // Reserve the full visible pile length, including the deeper breakwater.
    maxY: item.y + (1 - GROUND_ANCHOR + (item.parcel.family === 'coastal_margin'
      ? item.parcel.shoreSupportDepth ?? 0.1 : 0)) * width,
  };
}

function separated(
  left: CivilizationDistrictPresentationBounds,
  right: CivilizationDistrictPresentationBounds,
): boolean {
  const gap = CIVILIZATION_DISTRICT_PRESENTATION_GAP;
  return left.maxX + gap <= right.minX || right.maxX + gap <= left.minX ||
    left.maxY + gap <= right.minY || right.maxY + gap <= left.minY;
}

function fitsCanvas(bounds: CivilizationDistrictPresentationBounds, height: number): boolean {
  return bounds.minX >= 0 && bounds.maxX <= 100 && bounds.minY >= 0 && bounds.maxY <= height;
}

function maximumFit(minimum: number, maximum: number, fits: (value: number) => boolean): number {
  if (fits(maximum)) return maximum;
  let lower = minimum;
  let upper = maximum;
  for (let iteration = 0; iteration < 40; iteration += 1) {
    const candidate = (lower + upper) / 2;
    if (fits(candidate)) lower = candidate;
    else upper = candidate;
  }
  return lower;
}

/**
 * Fits the complete, fixed parcel plan, never the currently visible districts.
 * First instances receive space first, then closer anchors within each instance.
 * This is a deterministic priority fit, not an area-maximizing layout: reserved
 * readable background districts must not disappear to enlarge a foreground one.
 * Conservative square image boxes avoid dyad-specific sizes or alpha-crop jumps.
 */
export function buildCivilizationDistrictPresentation(
  compact = false,
  parcels: readonly CivilizationSurfaceDistrictParcel[] = CHRYSALIS_SURFACE_DISTRICT_PARCELS,
  aspectRatio: number = compact
    ? CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS.compact
    : CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS.desktop,
): ReadonlyMap<string, CivilizationDistrictPresentation> {
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
    throw new Error('District presentation requires a finite, positive scene aspect ratio.');
  }
  const height = 100 / aspectRatio;
  const transformOf = (parcel: CivilizationSurfaceDistrictParcel) => compact
    ? parcel.mobileTransform
    : parcel.desktopTransform;
  const widthCeilingOf = (parcel: CivilizationSurfaceDistrictParcel) => {
    const transform = transformOf(parcel);
    return transform.presentationWidth ?? transform.width;
  };
  const preferredPrimaryWidth = compact ? COMPACT_PREFERRED_PRIMARY_WIDTH : PREFERRED_PRIMARY_WIDTH;
  const firstByFamily = new Map(parcels.filter(({ instance }) => instance === 0)
    .map((parcel) => [parcel.family, parcel]));
  const items: FittingParcel[] = parcels.map((parcel) => {
    const transform = transformOf(parcel);
    const first = firstByFamily.get(parcel.family);
    const perspective = SECONDARY_PERSPECTIVE ** parcel.instance;
    const maxWidth = Math.min(widthCeilingOf(parcel), (first ? widthCeilingOf(first) : widthCeilingOf(parcel)) * perspective);
    return {
      parcel,
      x: transform.x,
      y: transform.y / aspectRatio,
      maxWidth,
      preferredMinimum: Math.min(maxWidth, parcel.instance === 0
        ? preferredPrimaryWidth[parcel.depth]
        : PREFERRED_MINIMUM_WIDTH * perspective),
      width: 0,
    };
  }).sort((left, right) => left.parcel.instance - right.parcel.instance ||
    right.y - left.y || (left.parcel.id < right.parcel.id ? -1 : 1));

  const fitsPlan = () => items.every((item, index) => {
    const bounds = boundsFor(item);
    return fitsCanvas(bounds, height) && items.slice(index + 1).every((other) => separated(bounds, boundsFor(other)));
  });
  if (!fitsPlan()) {
    throw new Error('District anchors cannot preserve the presentation corridor even at zero artwork size.');
  }

  // Reserve all background districts before spending remaining space on primaries.
  const seedScale = maximumFit(0, 1, (scale) => {
    items.forEach((item) => { item.width = item.preferredMinimum * scale; });
    return fitsPlan();
  });
  items.forEach((item) => { item.width = item.preferredMinimum * seedScale; });

  // The second pass consumes any room released by rounded perspective ceilings.
  // It only grows districts, so a later step cannot invalidate an earlier fit.
  for (let pass = 0; pass < 2; pass += 1) {
    const fittedFirstByFamily = new Map<string, FittingParcel>();
    for (const item of items) {
      const first = fittedFirstByFamily.get(item.parcel.family);
      if (item.parcel.instance > 0 && first) {
        item.maxWidth = Math.min(widthCeilingOf(item.parcel), first.width * SECONDARY_PERSPECTIVE ** item.parcel.instance);
      }
      item.width = Math.min(item.width, item.maxWidth);
      const width = maximumFit(item.width, item.maxWidth, (candidate) => {
        const bounds = boundsFor(item, candidate);
        return fitsCanvas(bounds, height) && items.every((other) => other === item || separated(bounds, boundsFor(other)));
      });
      // Round inward, never outward across a neighboring building or corridor.
      item.width = Math.min(item.maxWidth, Math.max(item.width, Math.floor(width * 10_000) / 10_000));
      if (item.parcel.instance === 0) fittedFirstByFamily.set(item.parcel.family, item);
    }
  }

  return new Map(items.map((item) => {
    const bounds = boundsFor(item);
    const expanded = boundsFor(item, item.width + PRECISION * 2);
    const limitedBy: string[] = [];
    if (item.width + PRECISION * 2 >= widthCeilingOf(item.parcel)) limitedBy.push('socket-width');
    if (item.parcel.instance > 0 && item.width + PRECISION * 2 >= item.maxWidth) limitedBy.push('perspective');
    if (!fitsCanvas(expanded, height)) limitedBy.push('canvas');
    items.forEach((other) => {
      if (other !== item && !separated(expanded, boundsFor(other))) limitedBy.push(`district:${other.parcel.id}`);
    });
    return [item.parcel.id, {
      width: item.width,
      bounds: { ...bounds, minY: bounds.minY * aspectRatio, maxY: bounds.maxY * aspectRatio },
      maxWidth: item.maxWidth,
      limitedBy,
      belowPreferredReadability: item.width + PRECISION < item.preferredMinimum,
    }];
  }));
}

const DESKTOP_PRESENTATION = buildCivilizationDistrictPresentation();
const COMPACT_PRESENTATION = buildCivilizationDistrictPresentation(true);
// ResizeObserver may supply many ratios while a panel is resized. Retain only
// the latest measured result per responsive mode, rather than an unbounded cache.
const MEASURED_PRESENTATIONS: Partial<Record<'desktop' | 'compact', {
  aspectRatio: number;
  presentation: ReadonlyMap<string, CivilizationDistrictPresentation>;
}>> = {};

export function getCivilizationDistrictPresentation(
  parcelId: string,
  compact = false,
  aspectRatio: number = compact
    ? CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS.compact
    : CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS.desktop,
): CivilizationDistrictPresentation | undefined {
  const mode = compact ? 'compact' : 'desktop';
  if (aspectRatio === CIVILIZATION_DISTRICT_PRESENTATION_ASPECT_RATIOS[mode]) {
    return (compact ? COMPACT_PRESENTATION : DESKTOP_PRESENTATION).get(parcelId);
  }
  let measured = MEASURED_PRESENTATIONS[mode];
  if (!measured || measured.aspectRatio !== aspectRatio) {
    measured = {
      aspectRatio,
      presentation: buildCivilizationDistrictPresentation(compact, CHRYSALIS_SURFACE_DISTRICT_PARCELS, aspectRatio),
    };
    MEASURED_PRESENTATIONS[mode] = measured;
  }
  return measured.presentation.get(parcelId);
}
