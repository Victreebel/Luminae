import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PendingActionOverlay } from '../pages/game-card';
import { ForgeDeckPile } from '../pages/game-board-forge-deck';

describe('PendingActionOverlay', () => {
  it('keeps a compact Forge plan legible and cancels without activating its card', () => {
    const onCancel = vi.fn();
    const onCardTap = vi.fn();

    render(
      <div onClick={onCardTap}>
        <PendingActionOverlay
          label="Forge pending"
          compact
          onCancel={onCancel}
        />
      </div>,
    );

    expect(screen.getByText('Forge')).toBeInTheDocument();
    expect(screen.getByText('pending')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel pending Forge' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onCardTap).not.toHaveBeenCalled();
  });

  it('keeps Archive access and its remaining count in the tier header control', () => {
    const onDeckTap = vi.fn();

    render(
      <ForgeDeckPile
        deckCount={36}
        deckDisabled={false}
        deckTitle="Encrypt a concealed Artifact"
        forgeCompact
        inline
        isDeckPending={false}
        onCancelPlan={vi.fn()}
        onDeckTap={onDeckTap}
        tier={1}
      />,
    );

    fireEvent.click(screen.getByRole('button', {
      name: 'Tier 1 Archive, 36 concealed Artifacts remaining. Encrypt a concealed Artifact',
    }));

    expect(onDeckTap).toHaveBeenCalledTimes(1);
  });

  it('lets the inline Archive control cancel a pending Encrypt without reopening it', () => {
    const onCancelPlan = vi.fn();
    const onDeckTap = vi.fn();

    const { container } = render(
      <ForgeDeckPile
        deckCount={12}
        deckDisabled={false}
        deckTitle="Cancel pending encrypt"
        forgeCompact
        inline
        isDeckPending
        onCancelPlan={onCancelPlan}
        onDeckTap={onDeckTap}
        tier={1}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel pending Encrypt' }));

    expect(onCancelPlan).toHaveBeenCalledTimes(1);
    expect(onDeckTap).not.toHaveBeenCalled();
    expect(container.querySelector('button button')).toBeNull();
    expect(container.querySelector('.archive-vessel--inline')).not.toBeNull();
  });

  it('labels a Tide plan as an Archive Forge rather than Encrypt', () => {
    render(
      <ForgeDeckPile
        deckCount={8}
        deckDisabled={false}
        deckTitle="Cancel archive Forge"
        forgeCompact
        inline
        isDeckPending
        pendingLabel="Archive Forge pending"
        onCancelPlan={vi.fn()}
        onDeckTap={vi.fn()}
        tier={2}
      />,
    );

    expect(screen.getByRole('button', { name: 'Cancel pending Archive Forge' })).toBeInTheDocument();
  });
});
