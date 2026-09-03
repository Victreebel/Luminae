import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SeededAffinityImbueDirector } from '../SeededAffinityImbueDirector';
import { gameAudio } from '@/lib/audio';

vi.mock('@/lib/audio', () => ({
  gameAudio: {
    playBonusSound: vi.fn(),
    playLuminaryEffectBeat: vi.fn(),
    stopActivationSting: vi.fn(),
  },
}));

vi.mock('../AffinityEmblem', () => ({
  AffinityEmblem: ({ color }: { color: string }) => (
    <div data-testid="imbued-affinity">{color}</div>
  ),
}));

vi.mock('../AvatarSeedSymbol', () => ({
  AvatarSeedSymbol: () => <div data-testid="avatar-seed-symbol" />,
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

describe('SeededAffinityImbueDirector', () => {
  it('carries the mold seed into the allied player as matching permanent Affinity', async () => {
    const mold = document.createElement('div');
    mold.dataset.slotKey = '2-1';
    mold.getBoundingClientRect = () => rect(80, 180, 120, 170);
    document.body.appendChild(mold);

    const ally = document.createElement('div');
    ally.dataset.playerAffinitySource = 'ally-1';
    ally.getBoundingClientRect = () => rect(440, 36, 130, 48);
    document.body.appendChild(ally);

    const onComplete = vi.fn();
    render(
      <SeededAffinityImbueDirector
        targetCardIds={['t2p01']}
        targetSlotIds={['2-1']}
        affinity="continuum"
        alliedPlayerId="ally-1"
        alliedPlayerName="Aster"
        reducedMotion
        onComplete={onComplete}
      />,
    );

    const director = screen.getByTestId('seeded-affinity-imbue-director');
    const advance = screen.getByTestId('luminary-effect-skip');
    expect(director).toHaveAttribute('data-effect-phase', 'announce');
    expect(director).toHaveAccessibleName('Aster gains +1 permanent Continuum.');

    fireEvent.click(advance);
    await waitFor(() => expect(director).toHaveAttribute('data-effect-phase', 'frame'));
    fireEvent.click(advance);
    await waitFor(() => expect(director).toHaveAttribute('data-effect-phase', 'target'));
    fireEvent.click(advance);
    await waitFor(() => expect(director).toHaveAttribute('data-effect-phase', 'resolve'));

    expect(screen.getByTestId('avatar-seed-symbol')).toBeInTheDocument();
    expect(screen.getByTestId('imbued-affinity')).toHaveTextContent('continuum');
    await waitFor(
      () => expect(gameAudio.playBonusSound).toHaveBeenCalledWith('continuum'),
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
