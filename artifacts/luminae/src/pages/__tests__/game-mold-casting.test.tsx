import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  ArtifactMoldCastingOverlay,
  type MoldCastCause,
} from '../game-mold-casting';

describe('ArtifactMoldCastingOverlay', () => {
  const causes: MoldCastCause[] = [
    'forge',
    'encrypt',
    'burn',
    'assimilate',
    'recurrence',
    'impact_extinction',
    'annihilation',
    'refill',
  ];

  it.each(causes)('exposes the %s replacement cause without adding readable UI', (cause) => {
    render(
      <ArtifactMoldCastingOverlay
        cue={{ id: `cast:${cause}`, cause, delayMs: 72, durationMs: 680 }}
      />,
    );

    const overlay = screen.getByTestId('artifact-mold-cast');
    expect(overlay).toHaveAttribute('data-cast-cause', cause);
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
    expect(overlay).toHaveStyle({
      '--mold-cast-delay': '72ms',
      '--mold-cast-duration': '680ms',
    });
    expect(overlay).toHaveTextContent('');
  });

  it('uses the same casting structure in compact mode while preserving the mold rim', () => {
    const { container } = render(
      <ArtifactMoldCastingOverlay
        compact
        cue={{ id: 'compact-cast', cause: 'forge', delayMs: 0, durationMs: 240 }}
      />,
    );

    const overlay = screen.getByTestId('artifact-mold-cast');
    expect(overlay).toHaveClass('artifact-mold-cast--compact');
    expect(container.querySelector('.artifact-mold-cast__alloy')).toBeInTheDocument();
    expect(container.querySelectorAll('.artifact-mold-cast__inscription')).toHaveLength(3);
  });
});
