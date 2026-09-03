import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FinalHungerAssimilationDirector } from '../FinalHungerAssimilationDirector';

vi.mock('@/lib/audio', () => ({
  gameAudio: {
    playLuminaryEffectBeat: vi.fn(),
    playAssimilationDissolve: vi.fn(),
    playAssimilationTransit: vi.fn(),
    stopActivationSting: vi.fn(),
  },
}));

vi.mock('@/pages/game-card', () => ({
  ArtifactCardView: ({ card }: { card: { id: string } }) => (
    <div data-testid="assimilated-artifact">{card.id}</div>
  ),
}));

vi.mock('@/components/AffinityEmblem', () => ({
  AffinityEmblem: ({ color }: { color: string }) => (
    <div data-testid="absorbed-affinity">{color}</div>
  ),
}));

describe('FinalHungerAssimilationDirector', () => {
  it('takes over the selected mold before revealing its replacement', async () => {
    const takeOverSlot = vi.fn();
    const revealReplacement = vi.fn();
    const onComplete = vi.fn();

    const source = document.createElement('div');
    source.dataset.cardId = 't2p01';
    source.getBoundingClientRect = () => ({
      x: 80,
      y: 120,
      left: 80,
      top: 120,
      right: 200,
      bottom: 290,
      width: 120,
      height: 170,
      toJSON: () => ({}),
    });
    document.body.appendChild(source);

    const target = document.createElement('div');
    target.dataset.civilizationDropTarget = 'true';
    target.getBoundingClientRect = () => ({
      x: 240,
      y: 700,
      left: 240,
      top: 700,
      right: 340,
      bottom: 756,
      width: 100,
      height: 56,
      toJSON: () => ({}),
    });
    document.body.appendChild(target);

    const view = render(
      <FinalHungerAssimilationDirector
        slot={{
          cardId: 't2p01',
          card: {
            id: 't2p01',
            name: 'Test Artifact',
            tier: 2,
            eminence: 2,
            bonusAffinity: 'continuum',
            cost: {
              flare: 0,
              radiance: 0,
              verdance: 0,
              continuum: 2,
              abyss: 0,
              singularity: 0,
            },
          } as never,
          tier: 2,
          slotKey: 'tier2-0',
          destinationSelector: '[data-civilization-drop-target]',
        }}
        affinity="continuum"
        triggeringPlayerName="Stargazer"
        actions={{
          takeOverSlot,
          revealReplacement,
          playAffinityAbsorb: vi.fn(),
        }}
        onComplete={onComplete}
      />,
    );

    const director = screen.getByTestId('final-hunger-assimilation-director');
    const advance = screen.getByTestId('luminary-effect-skip');
    expect(director).toHaveAttribute('data-effect-phase', 'announce');
    expect(takeOverSlot).not.toHaveBeenCalled();
    expect(revealReplacement).not.toHaveBeenCalled();

    fireEvent.click(advance);
    await waitFor(() => expect(director).toHaveAttribute('data-effect-phase', 'frame'));
    fireEvent.click(advance);
    await waitFor(() => expect(director).toHaveAttribute('data-effect-phase', 'target'));
    expect(takeOverSlot).toHaveBeenCalledOnce();
    expect(takeOverSlot).toHaveBeenCalledWith('tier2-0');

    fireEvent.click(advance);
    await waitFor(() => expect(director).toHaveAttribute('data-effect-phase', 'resolve'));
    expect(screen.getByTestId('assimilated-artifact')).toHaveTextContent('t2p01');
    expect(screen.getAllByTestId('assimilation-fragment')).toHaveLength(63);
    expect(screen.getAllByTestId('assimilation-fragment')[0]).toHaveStyle({ borderRadius: '1px' });
    expect(revealReplacement).not.toHaveBeenCalled();

    fireEvent.click(advance);
    await waitFor(() => expect(director).toHaveAttribute('data-effect-phase', 'reveal'));
    expect(revealReplacement).toHaveBeenCalledOnce();
    expect(revealReplacement).toHaveBeenCalledWith('tier2-0', 2, false);

    fireEvent.click(advance);
    await waitFor(() => expect(director).toHaveAttribute('data-effect-phase', 'aftermath'));
    fireEvent.click(advance);
    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(false));

    view.unmount();
    source.remove();
    target.remove();
  });
});
