import React from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { CivilizationCameraScale } from '@workspace/game-types';
import { CivilizationLivingWorldLayer } from '@/components/CivilizationLivingWorldLayer';

const SCENES: CivilizationCameraScale[] = ['surface', 'orbit', 'stellar', 'galaxy'];

describe('CivilizationLivingWorldLayer', () => {
  afterEach(cleanup);

  it.each(SCENES)('keeps the persistent %s motion budget at two focal effects or fewer', (scene) => {
    const { container } = render(
      <div data-civilization-motion="active">
        <CivilizationLivingWorldLayer scene={scene} dyad="chrysalis" />
      </div>,
    );

    const animatedFocalEffects = container.querySelectorAll('.civ-physical-motion');

    expect(screen.getByTestId('civilization-living-world')).toHaveAttribute('data-scene', scene);
    expect(animatedFocalEffects.length).toBeLessThanOrEqual(2);
  });

  it('defines paused, mobile, and reduced-motion fallbacks for every persistent loop', () => {
    const { container } = render(
      <div data-civilization-motion="paused">
        <CivilizationLivingWorldLayer scene="galaxy" dyad="chrysalis" />
      </div>,
    );
    const styleText = container.querySelector('style')?.textContent ?? '';

    expect(styleText).toContain('[data-civilization-motion="paused"] .civ-physical-motion');
    expect(styleText).toContain('@media (max-width: 640px)');
    expect(styleText).toContain('@media (prefers-reduced-motion: reduce)');
    expect(styleText).toContain('animation: none !important');
  });

  it('uses only the two strongest operational affinities for living activity', () => {
    const { container } = render(
      <CivilizationLivingWorldLayer
        scene="surface"
        dyad="echo"
        operationalShares={{
          flare: 0.05,
          radiance: 0,
          verdance: 0.2,
          continuum: 0.4,
          abyss: 0.35,
        }}
      />,
    );

    const vehicles = Array.from(container.querySelectorAll<HTMLElement>('.civ-ground-vehicle'));
    expect(vehicles).toHaveLength(2);
    expect(vehicles.map((vehicle) => vehicle.style.getPropertyValue('--vehicle-tone')))
      .toEqual(['#3D6BFF', '#A832D4']);
  });

  it('physically suspends traffic under isolation and makes disruption intermittent', () => {
    const { rerender } = render(
      <CivilizationLivingWorldLayer
        scene="stellar"
        dyad="echo"
        activeConditions={['isolated']}
      />,
    );

    expect(screen.getByTestId('civilization-living-world'))
      .toHaveAttribute('data-condition-motion', 'suspended');

    rerender(
      <CivilizationLivingWorldLayer
        scene="stellar"
        dyad="echo"
        activeConditions={['disrupted']}
      />,
    );

    expect(screen.getByTestId('civilization-living-world'))
      .toHaveAttribute('data-condition-motion', 'intermittent');
  });
});
