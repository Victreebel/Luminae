import { describe, expect, it } from 'vitest';
import {
  boundedLuminaryStagger,
  luminaryGroupDuration,
  luminaryPacedDuration,
  luminaryReadDuration,
} from '../luminaryPresentationPacing';

describe('Luminary presentation pacing', () => {
  it('gives readable copy a bounded human reading window', () => {
    expect(luminaryReadDuration('All condemned Artifacts are burned.'))
      .toBe(1_550);
    expect(luminaryReadDuration('One.')).toBe(1_050);
    expect(luminaryReadDuration('word '.repeat(40))).toBe(2_400);
  });

  it('keeps Swift distinct from reduced motion', () => {
    expect(luminaryPacedDuration(1_000, 'standard')).toBe(1_000);
    expect(luminaryPacedDuration(1_000, 'swift')).toBe(680);
  });

  it('bounds target-group staggering instead of growing without limit', () => {
    const stagger = boundedLuminaryStagger(16, 120);
    expect(stagger * 15).toBeLessThanOrEqual(650);
    expect(luminaryGroupDuration(16, 900, 120)).toBeLessThanOrEqual(1_550);
  });
});
