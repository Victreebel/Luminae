import type {
  ArtifactBrand,
  ArtifactMarkerType,
  ArtifactMarker,
} from '@workspace/api-client-react';

const ARTIFACT_BRAND_TYPES = new Set<ArtifactMarkerType>([
  'forgotten',
  'condemned',
  'nullified',
  'avatar_seed',
]);

const LUMINARY_BRAND_TYPES: Partial<Record<string, ArtifactMarkerType>> = {
  lum_compass: 'forgotten',
  lum_ember: 'condemned',
  lum_null: 'nullified',
  lum_seed: 'avatar_seed',
};

type MarkerLike =
  | ArtifactMarker
  | {
      type?: string;
      ownerId?: string;
      summonedAtTurnCount?: number;
      brands?: Array<Partial<ArtifactBrand> | null>;
    }
  | null
  | undefined;

export function isArtifactBrandType(value: unknown): value is ArtifactMarkerType {
  return typeof value === 'string' && ARTIFACT_BRAND_TYPES.has(value as ArtifactMarkerType);
}

export function getArtifactBrandVisibilityKey(
  cardId: string,
  type: ArtifactMarkerType,
): string {
  return `${cardId}:${type}`;
}

export function getPendingArtifactBrandTypes(
  events: ReadonlyArray<{
    luminaryId: string;
    effectType: string;
    targetCardIds?: readonly string[] | null;
  }> | null | undefined,
): Map<string, ArtifactMarkerType[]> {
  const pendingByCardId = new Map<string, ArtifactMarkerType[]>();

  for (const event of events ?? []) {
    const type = LUMINARY_BRAND_TYPES[event.luminaryId];
    if (!type || !event.targetCardIds?.length) continue;
    // Cinder Mandate's end-turn event burns an already-visible Condemned
    // brand. Only its summon event introduces the brand.
    if (event.luminaryId === 'lum_ember' && event.effectType !== 'summon') continue;

    for (const cardId of event.targetCardIds) {
      const current = pendingByCardId.get(cardId) ?? [];
      if (!current.includes(type)) pendingByCardId.set(cardId, [...current, type]);
    }
  }

  return pendingByCardId;
}

/**
 * Normalizes both legacy one-brand markers and cumulative markers from the
 * current API. Ordering is oldest to newest, matching the server representation.
 */
export function getArtifactBrands(marker: MarkerLike): ArtifactBrand[] {
  if (!marker) return [];

  const candidates = marker.brands?.length
    ? marker.brands
    : [marker];
  const seen = new Set<string>();
  const brands: ArtifactBrand[] = [];

  for (const candidate of candidates) {
    if (!candidate || !isArtifactBrandType(candidate.type)) continue;
    const ownerId = typeof candidate.ownerId === 'string' ? candidate.ownerId : '';
    const key = `${candidate.type}:${ownerId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    brands.push({
      type: candidate.type,
      ownerId,
      summonedAtTurnCount: Number.isFinite(candidate.summonedAtTurnCount)
        ? Number(candidate.summonedAtTurnCount)
        : 0,
    });
  }

  return brands;
}

export function getArtifactBrandTypes(marker: MarkerLike): ArtifactMarkerType[] {
  const seen = new Set<ArtifactMarkerType>();
  return getArtifactBrands(marker)
    .map(brand => brand.type)
    .filter(type => {
      if (seen.has(type)) return false;
      seen.add(type);
      return true;
    });
}

export function artifactMarkerHasBrand(
  marker: MarkerLike,
  type: ArtifactMarkerType,
): boolean {
  return getArtifactBrands(marker).some(brand => brand.type === type);
}

export function artifactMarkerBlocksForgeEminence(
  marker: MarkerLike,
  ignoreNullified = false,
): boolean {
  return getArtifactBrands(marker).some(brand => (
    brand.type === 'forgotten' ||
    brand.type === 'condemned' ||
    (brand.type === 'nullified' && !ignoreNullified)
  ));
}

export function isNullifiedFirstForgeExempt(
  marker: MarkerLike,
  playerId: string | null | undefined,
  firstForge: unknown,
): boolean {
  if (!playerId || firstForge) return false;
  return getArtifactBrands(marker).some(
    brand => brand.type === 'nullified' && brand.ownerId === playerId,
  );
}

export function getAddedArtifactBrandTypes(
  previous: MarkerLike,
  next: MarkerLike,
): ArtifactMarkerType[] {
  // A repeated application of the same brand updates its timestamp rather than
  // appending a second persistent brand. Treat that refresh as a new visual
  // strike, while keeping the stored brand collection deduplicated.
  const previousBrands = new Map<string, number>(
    getArtifactBrands(previous).map(brand => [
      `${brand.type}:${brand.ownerId}`,
      brand.summonedAtTurnCount,
    ] as const),
  );

  return getArtifactBrands(next)
    .filter(brand => {
      const key = `${brand.type}:${brand.ownerId}`;
      const previousTurn = previousBrands.get(key);
      return previousTurn === undefined || previousTurn !== brand.summonedAtTurnCount;
    })
    .map(brand => brand.type);
}
