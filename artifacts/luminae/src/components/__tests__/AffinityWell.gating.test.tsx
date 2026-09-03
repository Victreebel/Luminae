import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AffinityWellCells, type AffinityWellCellsProps } from '@/components/AffinityWell';

const affinities = {
  flare: 0,
  radiance: 0,
  verdance: 0,
  continuum: 0,
  abyss: 0,
  singularity: 0,
};

function makeProps(overrides: Partial<AffinityWellCellsProps> = {}): AffinityWellCellsProps {
  return {
    me: {
      affinities,
      bonuses: { ...affinities, verdance: 1 },
      reservedArtifacts: [],
    },
    state: {
      affinityWell: {
        flare: 7,
        radiance: 7,
        verdance: 7,
        continuum: 7,
        abyss: 7,
        singularity: 5,
      },
      luminaryAffinities: [],
      turnCount: 1,
      players: [{}, {}, {}, {}],
    },
    selectedAffinities: {},
    isMyTurn: true,
    canPlan: false,
    isActivePlayer: true,
    isTutorial: true,
    tutorialZone: 'well',
    tutorialAttention: null,
    sessionPlayerId: undefined,
    onAffinityClick: vi.fn(),
    onPromoteToTake2: vi.fn(),
    onOpenReserved: vi.fn(),
    onOpenForged: vi.fn(),
    ...overrides,
  };
}

describe('AffinityWellCells tutorial gates', () => {
  it('enables only the instructed take-two Affinity', () => {
    render(
      <AffinityWellCells
        {...makeProps()}
        allowedSingleAffinities={[]}
        allowedTakeTwoAffinities={['abyss']}
        singularityInteractive={false}
      />,
    );

    expect(screen.getByRole('button', { name: 'Take 2 Abyss' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Take 2 Continuum' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Open encrypted Artifacts/ })).toBeDisabled();
  });

  it('does not expose forged-bonus shortcuts while all single actions are gated', () => {
    const onOpenForged = vi.fn();
    render(
      <AffinityWellCells
        {...makeProps({
          isMyTurn: false,
          onOpenForged,
        })}
        allowedSingleAffinities={[]}
        allowedTakeTwoAffinities={[]}
        singularityInteractive={false}
      />,
    );

    const verdance = screen.getByRole('button', {
      name: /Verdance, 0 held\. 1 permanent bonus\. Reservoir 7 of 7/,
    });
    expect(verdance).toBeDisabled();
    fireEvent.click(verdance);
    expect(onOpenForged).not.toHaveBeenCalled();
  });

  it('describes Singularity without an Architect label in the Well', () => {
    render(
      <AffinityWellCells
        {...makeProps()}
        allowedSingleAffinities={[]}
        allowedTakeTwoAffinities={[]}
        singularityInteractive={false}
      />,
    );

    const singularity = screen.getByRole('button', {
      name: /Singularity, 0 held\. Convergence capacity 5 of 5/,
    });
    expect(singularity).toHaveAttribute('title', 'Created by Encrypting; cannot be Harnessed.');
    expect(singularity.closest('[data-affinity-origin]')).toHaveAttribute('data-affinity-origin', 'convergence');
    expect(screen.queryByText('Architect')).not.toBeInTheDocument();
  });
});
