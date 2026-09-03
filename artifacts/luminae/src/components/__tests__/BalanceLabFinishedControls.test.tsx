import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BalanceLabFinishedControls } from '../BalanceLabFinishedControls';

describe('BalanceLabFinishedControls', () => {
  it('replaces persistent rematch actions with working laboratory navigation', () => {
    const onReturnToLab = vi.fn();
    const onViewBoard = vi.fn();
    render(
      <BalanceLabFinishedControls
        onReturnToLab={onReturnToLab}
        onViewBoard={onViewBoard}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Play Again' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Replay Same Board' })).not.toBeInTheDocument();
    expect(screen.getByText(/do not create persistent rooms/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Return to Balance Lab' }));
    fireEvent.click(screen.getByRole('button', { name: 'View Board' }));
    expect(onReturnToLab).toHaveBeenCalledOnce();
    expect(onViewBoard).toHaveBeenCalledOnce();
  });
});
