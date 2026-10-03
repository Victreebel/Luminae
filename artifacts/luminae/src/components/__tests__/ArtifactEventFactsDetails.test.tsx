import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ArtifactEventFactsDetails } from '../ArtifactEventFactsDetails';

afterEach(cleanup);

describe('Artifact Function and current rule inspection', () => {
  it('keeps the initial scan to functions and one closed rules disclosure', () => {
    const { container } = render(<ArtifactEventFactsDetails artifactId="t1r02" />);
    expect(within(screen.getByRole('list', { name: 'Function tags' })).getByText('Ecology')).toBeVisible();
    expect(container.querySelectorAll('details')).toHaveLength(1);
    expect(screen.getByText('Rules').closest('details')).not.toHaveAttribute('open');
    expect(screen.queryByText('Practical role:')).not.toBeInTheDocument();
    expect(screen.queryByText(/Why these capabilities fit/)).not.toBeInTheDocument();
    expect(screen.queryByText('Reviewed targeting exclusions')).not.toBeInTheDocument();
    expect(screen.getByText('Ecological recovery.')).not.toBeVisible();
    fireEvent.click(screen.getByText('Rules'));
    expect(screen.getByText('Ecological recovery.')).toBeVisible();
  });

  it('does not guess functions for an unknown or hidden Artifact', () => {
    const { container, rerender } = render(<ArtifactEventFactsDetails artifactId="unknown" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<ArtifactEventFactsDetails artifactId="encrypted-private-id" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('keeps both functions visible and exact current rules available on demand', () => {
    render(<ArtifactEventFactsDetails artifactId="t2e04" />);
    const tags = screen.getByRole('list', { name: 'Function tags' });
    expect(within(tags).getByText('Ecology')).toBeVisible();
    expect(within(tags).getByText('Coordination')).toBeVisible();
    expect(screen.getByText('Signal interpretation.')).not.toBeVisible();
    fireEvent.click(screen.getByText('Rules'));
    expect(screen.getByText('Signal interpretation.')).toBeVisible();
    expect(screen.getByText(/Current Event and progression rules can refer/)).toBeVisible();
  });

  it('keeps the existing synchronization dependency inspectable without presenting it as a function', () => {
    const view = render(<ArtifactEventFactsDetails artifactId="t1s04" />);
    const tags = screen.getByRole('list', { name: 'Function tags' });
    expect(within(tags).getByText('Materials')).toBeVisible();
    expect(within(tags).getByText('Coordination')).toBeVisible();
    expect(screen.getByText('Distributed synchronization.')).not.toBeVisible();
    fireEvent.click(screen.getByText('Rules'));
    expect(screen.getByRole('list', { name: 'Artifact dependencies' })).toBeVisible();
    view.rerender(<ArtifactEventFactsDetails artifactId="t1s01" />);
    expect(screen.getByText('Rules').closest('details')).not.toHaveAttribute('open');
    expect(screen.queryByRole('list', { name: 'Artifact dependencies' })).not.toBeInTheDocument();
  });
});
