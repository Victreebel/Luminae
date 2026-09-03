import { describe, expect, it } from 'vitest';
import { usesControlledEminenceBestowal } from '../delayedEminencePresentation';

describe('delayed Luminary Eminence presentation', () => {
  it.each([
    ['lum_radiant', true],
    ['lum_bloom', true],
    ['lum_orchard', false],
    ['lum_seed', false],
  ])('routes %s to controlled bestowal: %s', (luminaryId, expected) => {
    expect(usesControlledEminenceBestowal(luminaryId)).toBe(expected);
  });
});
