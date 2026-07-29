import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpponentHarnessTrace } from '../game-causal-motion';

function setRect(
  element: HTMLElement,
  rect: { left: number; top: number; width: number; height: number },
) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      ...rect,
      x: rect.left,
      y: rect.top,
      right: rect.left + rect.width,
      bottom: rect.top + rect.height,
      toJSON: () => rect,
    }),
  });
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
});

describe('opponent Affinity collection', () => {
  it('lands on the receiving avatar and emphasizes its containing pill', async () => {
    const chip = document.createElement('div');
    chip.dataset.opponentChip = 'player-2';
    const avatar = document.createElement('div');
    avatar.dataset.opponentAvatar = 'player-2';
    chip.appendChild(avatar);

    const source = document.createElement('div');
    source.dataset.affinitySymbol = 'flare';

    setRect(chip, { left: 100, top: 20, width: 140, height: 30 });
    setRect(avatar, { left: 108, top: 25, width: 20, height: 20 });
    setRect(source, { left: 300, top: 500, width: 48, height: 48 });

    const chipAnimate = vi.fn();
    const avatarAnimate = vi.fn();
    const sourceAnimate = vi.fn();
    Object.defineProperty(chip, 'animate', { value: chipAnimate });
    Object.defineProperty(avatar, 'animate', { value: avatarAnimate });
    Object.defineProperty(source, 'animate', { value: sourceAnimate });
    document.body.append(chip, source);

    render(
      <OpponentHarnessTrace
        trace={{
          key: 1,
          affinities: ['flare'],
          playerId: 'player-2',
          playerName: 'Nyx',
        }}
      />,
    );

    const recipient = await screen.findByTestId('opponent-harness-recipient');
    expect(recipient).toHaveStyle({
      left: '100px',
      top: '20px',
      width: '140px',
      height: '30px',
    });
    expect(screen.getByText('Nyx')).toBeInTheDocument();
    expect(screen.getByText('Received +1 Affinity')).toBeInTheDocument();

    await waitFor(() => {
      expect(chipAnimate).toHaveBeenCalledOnce();
      expect(avatarAnimate).toHaveBeenCalledOnce();
    });

    const tracePath = document.querySelector('.causal-motion-layer--opponent path');
    expect(tracePath?.getAttribute('d')).toMatch(/118 35$/);
  });
});
