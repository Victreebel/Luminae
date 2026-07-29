export const PHOENIX_ARCHIVE_FLIGHT_MS = 760;
export const PHOENIX_ARCHIVE_STAGGER_MS = 70;

export function archivePulseDelayForIndexes(
  indexes: number[],
  reducedMotion = false,
): number | null {
  const finiteIndexes = indexes.filter(Number.isFinite);
  if (finiteIndexes.length === 0) return null;
  if (reducedMotion) return 0.18;

  const lastIndex = Math.max(...finiteIndexes);
  return Math.max(
    0,
    (lastIndex * PHOENIX_ARCHIVE_STAGGER_MS + PHOENIX_ARCHIVE_FLIGHT_MS - 130) /
      1000,
  );
}
