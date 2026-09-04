import { describe, expect, it } from 'vitest';
import {
  getArtifactArtworkScalePolicy,
  isArtifactPinDepictionScale,
  isLocalArtifactDepictionScale,
} from '@/lib/civilizationArtworkScale';

describe('civilization artwork scale policy', () => {
  it('keeps macro and tabletop artifacts as local pins instead of structures', () => {
    expect(getArtifactArtworkScalePolicy('macro')).toMatchObject({
      nativeLayer: 'surface',
      presence: 'artifact_pin',
      canRenderAsStructure: false,
    });
    expect(getArtifactArtworkScalePolicy('tabletop')).toMatchObject({
      nativeLayer: 'surface',
      presence: 'artifact_pin',
      canRenderAsStructure: false,
    });
  });

  it('allows larger artwork scales to occupy the proper scene layer', () => {
    expect(getArtifactArtworkScalePolicy('room')).toMatchObject({
      nativeLayer: 'surface',
      presence: 'deployment_site',
      canRenderAsStructure: true,
    });
    expect(getArtifactArtworkScalePolicy('planetary')).toMatchObject({
      nativeLayer: 'orbit',
      presence: 'planetary_infrastructure',
      canRenderAsStructure: true,
    });
    expect(getArtifactArtworkScalePolicy('stellar')).toMatchObject({
      nativeLayer: 'stellar',
      presence: 'stellar_megastructure',
      canRenderAsStructure: true,
    });
    expect(getArtifactArtworkScalePolicy('galactic')).toMatchObject({
      nativeLayer: 'galaxy',
      presence: 'galactic_network',
      canRenderAsStructure: true,
    });
  });

  it('classifies local artifact depiction separately from higher-scale infrastructure', () => {
    expect(isLocalArtifactDepictionScale('installation')).toBe(true);
    expect(isLocalArtifactDepictionScale('planetary')).toBe(false);
    expect(isArtifactPinDepictionScale('tabletop')).toBe(true);
    expect(isArtifactPinDepictionScale('room')).toBe(false);
  });
});
