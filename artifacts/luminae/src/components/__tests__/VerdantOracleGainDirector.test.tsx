import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { VerdantOracleGainDirector } from '../VerdantOracleGainDirector';
import { gameAudio } from '@/lib/audio';

vi.mock('@/lib/audio', () => ({
  gameAudio: {
    playEarlyBloomGrowth: vi.fn(),
    playHarnessLand: vi.fn(),
    playLuminaryEffectBeat: vi.fn(),
    stopActivationSting: vi.fn(),
  },
}));

vi.mock('../AffinityEmblem', () => ({
  AffinityEmblem: ({ color }: { color: string }) => (
    <div data-testid="early-bloom-affinity">{color}</div>
  ),
}));

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    x: left,
    y: top,
    left,
    top,
    right: left + width,
    bottom: top + height,
    width,
    height,
    toJSON: () => ({}),
  };
}

afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllMocks();
});

describe('VerdantOracleGainDirector', () => {
  it('shows one Verdance token leaving the Well and landing on its owner', async () => {
    const well = document.createElement('div');
    well.dataset.sharedAffinityWell = '';
    const symbol = document.createElement('div');
    symbol.dataset.affinitySymbol = 'verdance';
    symbol.getBoundingClientRect = () => rect(120, 520, 48, 48);
    well.appendChild(symbol);
    document.body.appendChild(well);

    const owner = document.createElement('div');
    owner.dataset.playerAffinitySource = 'player-1';
    owner.getBoundingClientRect = () => rect(420, 44, 132, 42);
    document.body.appendChild(owner);

    const onResolutionStart = vi.fn();
    const onComplete = vi.fn();
    render(
      <VerdantOracleGainDirector
        playerId="player-1"
        playerName="Aster"
        amount={1}
        reducedMotion
        onResolutionStart={onResolutionStart}
        onComplete={onComplete}
      />,
    );

    const director = screen.getByTestId('verdant-oracle-gain-director');
    const advance = screen.getByTestId('luminary-effect-skip');
    expect(director).toHaveAttribute('data-effect-phase', 'announce');
    expect(director).toHaveAccessibleName('Aster gains 1 Verdance from the Affinity Well.');

    fireEvent.click(advance);
    await waitFor(() => expect(director).toHaveAttribute('data-effect-phase', 'frame'));
    expect(onResolutionStart).toHaveBeenCalledTimes(1);

    fireEvent.click(advance);
    await waitFor(() => expect(director).toHaveAttribute('data-effect-phase', 'target'));
    expect(document.querySelector('[data-early-bloom-source="verdance"]')).not.toBeNull();
    expect(document.querySelector('[data-early-bloom-recipient="player-1"]')).not.toBeNull();

    fireEvent.click(advance);
    await waitFor(() => expect(director).toHaveAttribute('data-effect-phase', 'resolve'));
    expect(screen.getAllByTestId('early-bloom-affinity')[0]).toHaveTextContent('verdance');
    expect(gameAudio.playEarlyBloomGrowth).toHaveBeenCalledWith(520);
    await waitFor(
      () => expect(gameAudio.playHarnessLand).toHaveBeenCalledWith('verdance'),
      { timeout: 1_000 },
    );

    fireEvent.click(advance);
    await waitFor(() => expect(director).toHaveAttribute('data-effect-phase', 'reveal'));
    fireEvent.click(advance);
    await waitFor(() => expect(director).toHaveAttribute('data-effect-phase', 'aftermath'));
    fireEvent.click(advance);
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(false));
  });
});
