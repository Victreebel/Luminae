import React from 'react';
import { render } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { ForgeMarkerLayer } from '../pages/game-board-forge-markers';
import { ArtifactBrandDetails } from '../pages/game-luminary-effects';

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

describe('ForgeMarkerLayer keyword branding', () => {
  it.each([
    ['forgotten', 'Forgotten'],
    ['condemned', 'Condemned'],
    ['nullified', 'Nullified'],
    ['avatar_seed', 'Seeded'],
  ] as const)('renders the %s state as its persistent keyword', (type, label) => {
    const { container } = render(
      <ForgeMarkerLayer markerType={type} suppressed={false} />,
    );

    const keyword = container.querySelector(`[data-brand-keyword="${type}"]`);
    expect(keyword).toHaveAttribute('data-brand-label', label);
    expect(keyword).toHaveAttribute('data-brand-treatment', 'forged-tattoo');
    expect(keyword).toHaveAttribute('data-compact', 'false');
  });

  it('uses the same keyword treatment in compact mode', () => {
    const { container } = render(
      <ForgeMarkerLayer markerType="condemned" suppressed={false} compact />,
    );

    const keyword = container.querySelector('[data-brand-keyword="condemned"]');
    expect(keyword).toHaveAttribute('data-brand-label', 'Condemned');
    expect(keyword).toHaveAttribute('data-brand-treatment', 'forged-tattoo');
    expect(keyword).toHaveAttribute('data-compact', 'true');
    expect(container.querySelector('[aria-label*="marker"]')).not.toBeInTheDocument();
  });

  it('suppresses the complete brand when its marker is hidden', () => {
    const { container } = render(
      <ForgeMarkerLayer markerType="forgotten" suppressed />,
    );

    expect(container.querySelector('[data-brand-keyword]')).not.toBeInTheDocument();
  });

  it('keeps older brands visible while a new brand strike is pending', () => {
    const { container } = render(
      <ForgeMarkerLayer
        markerTypes={['forgotten', 'nullified']}
        suppressed
      />,
    );

    expect(container.querySelector('[data-brand-keyword="forgotten"]')).toBeInTheDocument();
    expect(container.querySelector('[data-brand-keyword="nullified"]')).not.toBeInTheDocument();
  });

  it('renders every persistent brand after the strike lands', () => {
    const { container } = render(
      <ForgeMarkerLayer
        markerTypes={['forgotten', 'nullified']}
        suppressed={false}
      />,
    );

    expect(container.querySelector('[data-brand-keyword="forgotten"]')).toBeInTheDocument();
    expect(container.querySelector('[data-brand-keyword="nullified"]')).toBeInTheDocument();
  });

  it('explains every active brand in Artifact details', () => {
    const { getAllByText, getByText, getByTestId } = render(
      <ArtifactBrandDetails types={['forgotten', 'nullified']} />,
    );

    expect(getByTestId('artifact-active-brands')).toBeInTheDocument();
    expect(getByText('Forgotten')).toBeInTheDocument();
    expect(getByText('Nullified')).toBeInTheDocument();
    expect(getAllByText(/awards 0 Eminence/)).toHaveLength(2);
  });
});
