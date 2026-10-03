import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ArtifactFunctionTags } from '../ArtifactFunctionTags';

afterEach(cleanup);

describe('Artifact Function tags', () => {
  it('shows a function immediately without a lore response or disclosure', () => {
    render(<ArtifactFunctionTags artifactId="t1r02" />);
    expect(screen.getByText('Functions')).toBeVisible();
    const tags = screen.getByRole('list', { name: 'Function tags' });
    expect(within(tags).getAllByRole('listitem')).toHaveLength(1);
    expect(within(tags).getByText('Ecology')).toBeVisible();
    expect(tags.closest('details')).toBeNull();
  });

  it('keeps both functions visible in compact inspectors', () => {
    render(<ArtifactFunctionTags artifactId="t3p04" compact />);
    const tags = screen.getByRole('list', { name: 'Function tags' });
    expect(within(tags).getAllByRole('listitem')).toHaveLength(2);
    expect(within(tags).getByText('Information')).toBeVisible();
    expect(within(tags).getByText('Security')).toBeVisible();
    expect(within(tags).getByText('Information')).toHaveAttribute('title', expect.stringContaining('knowledge'));
  });

  it.each(['unknown', 'encrypted-private-id', 'bp_antimatter_detonator', '__proto__'])(
    'does not infer or expose tags for %s',
    (artifactId) => {
      const { container } = render(<ArtifactFunctionTags artifactId={artifactId} />);
      expect(container).toBeEmptyDOMElement();
    },
  );
});
