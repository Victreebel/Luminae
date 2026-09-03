import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AffinityReservoirSymbol } from '@/components/AffinityReservoirSymbol';

describe('AffinityReservoirSymbol', () => {
  it('anchors the fill path to the keystone at empty, partial, and full states', () => {
    const { container, rerender } = render(
      <AffinityReservoirSymbol value={0} ariaLabel="Empty Affinity Well" />,
    );

    const symbol = screen.getByRole('img', { name: 'Empty Affinity Well' });
    expect(symbol).toHaveAttribute('data-has-progress', 'false');
    expect(symbol).toHaveAttribute('data-progress-complete', 'false');
    expect(container.querySelectorAll('.affinity-well-symbol__terminal')).toHaveLength(2);
    expect(container.querySelector('.affinity-well-symbol__terminal--start')).toBeInTheDocument();
    expect(container.querySelector('.affinity-well-symbol__terminal--end')).toBeInTheDocument();
    expect(container.querySelector('.affinity-well-symbol__keystone')).toBeInTheDocument();

    rerender(<AffinityReservoirSymbol value={4} ariaLabel="Partial Affinity Well" />);
    expect(screen.getByRole('img', { name: 'Partial Affinity Well' })).toHaveAttribute('data-has-progress', 'true');
    expect(screen.getByRole('img', { name: 'Partial Affinity Well' })).toHaveAttribute('data-progress-complete', 'false');

    rerender(<AffinityReservoirSymbol value={10} ariaLabel="Full Affinity Well" />);
    expect(screen.getByRole('img', { name: 'Full Affinity Well' })).toHaveAttribute('data-progress-complete', 'true');
  });

  it('renders the complete path for the compact navigation symbol', () => {
    const { container } = render(<AffinityReservoirSymbol compact />);

    const symbol = container.querySelector('.affinity-well-symbol--compact');
    expect(symbol).toHaveAttribute('data-has-progress', 'true');
    expect(symbol).toHaveAttribute('data-progress-complete', 'true');
    expect(container.querySelectorAll('.affinity-well-symbol__terminal')).toHaveLength(2);
  });
});
