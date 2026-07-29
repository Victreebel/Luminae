import React from 'react';
import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import type { Luminary, LuminaryActiveState } from '@workspace/api-client-react';
import { LuminaryClaimedPortal } from '../game-luminary';

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

const luminary: Luminary = {
  id: 'lum_verdant',
  name: 'The Verdant Oracle',
  domain: 'Verdance',
  eminence: 2,
  requirements: {
    flare: 0,
    continuum: 0,
    verdance: 4,
    abyss: 0,
    radiance: 2,
    singularity: 0,
  },
  flavor: 'Test Luminary',
  summonColor: '#2ecc71',
  summonSecondaryColor: '#166534',
  auraStyle: 'verdant',
};

const activeState: LuminaryActiveState = {
  luminaryId: luminary.id,
  ownerId: 'player-1',
  activeAffinity: 'verdance',
  eligibleAffinities: ['verdance', 'radiance'],
  summonedAtTurnCount: 1,
};

describe('LuminaryClaimedPortal', () => {
  it('reuses the summoned backdrop without the former spiral vortex', () => {
    const { container } = render(
      <LuminaryClaimedPortal
        luminary={luminary}
        luminaryAffinity={activeState}
      />,
    );

    const backdrop = container.querySelector('.luminary-claimed-summoned-backdrop');
    expect(backdrop).toHaveClass('lum-claimed-native-portal');
    expect(container.querySelector('.lum-portal-vortex-spiral')).not.toBeInTheDocument();
    expect(container.querySelector('.luminary-claimed-free-entity')).toBeInTheDocument();
  });

  it('passes the active Affinity color into the shared backdrop', () => {
    const { getByTestId } = render(
      <LuminaryClaimedPortal
        luminary={luminary}
        luminaryAffinity={activeState}
      />,
    );

    expect(getByTestId('summoned-luminary-card')).toHaveStyle({
      '--lum-claimed-active': '#2ECC71',
    });
  });
});
