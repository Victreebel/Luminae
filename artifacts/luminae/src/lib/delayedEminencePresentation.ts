const CONTROLLED_EMINENCE_BESTOWAL_LUMINARIES = new Set([
  'lum_radiant',
  'lum_bloom',
]);

export function usesControlledEminenceBestowal(luminaryId: string): boolean {
  return CONTROLLED_EMINENCE_BESTOWAL_LUMINARIES.has(luminaryId);
}
