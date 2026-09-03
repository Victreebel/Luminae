import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LuminaryClaimedEntityArt } from '../luminaryAssets';

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => true,
}));

describe('Tide Architect idle eye', () => {
  it('does not render the bright static eyelid bar in reduced-detail mode', () => {
    const { container } = render(
      <div style={{ position: 'relative', width: 180, height: 260 }}>
        <LuminaryClaimedEntityArt
          luminaryId="lum_tide"
          animate={false}
          idleMotionActive={false}
          detailMotionActive={false}
        />
      </div>,
    );

    const eye = container.querySelector('svg');
    expect(eye).toBeInTheDocument();
    expect(eye?.querySelector('path[fill="#f8fafb"]')).toBeNull();
  });
});
