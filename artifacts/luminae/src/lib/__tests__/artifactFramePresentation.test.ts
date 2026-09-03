import { describe, expect, it } from 'vitest';
import { artifactFrameUsesArtCrop } from '../artifactFramePresentation';

describe('Artifact animation frame presentation', () => {
  it('keeps complete cards in portrait frames', () => {
    expect(artifactFrameUsesArtCrop(112, 160)).toBe(false);
    expect(artifactFrameUsesArtCrop(56, 80)).toBe(false);
  });

  it('uses an artwork crop in landscape Forge molds', () => {
    expect(artifactFrameUsesArtCrop(113.5, 79)).toBe(true);
    expect(artifactFrameUsesArtCrop(120, 68)).toBe(true);
  });

  it('falls back safely for incomplete measurements', () => {
    expect(artifactFrameUsesArtCrop(0, 80)).toBe(false);
    expect(artifactFrameUsesArtCrop(112, Number.NaN)).toBe(false);
  });
});
