import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TriangulationScenarioState } from '@workspace/game-types';
import { TriangulationChronicleExperience } from './TriangulationChronicleExperience';

vi.mock('@/lib/audio', () => ({ gameAudio: { playTriangulationSignal: vi.fn() } }));

function triangulationState(
  overrides: Partial<TriangulationScenarioState> = {},
): TriangulationScenarioState {
  return {
    chronicleId: 'chronicle_triangulation',
    scenarioId: 'chronicle_triangulation_v1',
    definitionVersion: 1,
    runKind: 'primary',
    architectPlayerId: 'architect',
    myriaPlayerId: 'myria',
    vesperPlayerId: 'vesper',
    phase: 'awaiting_alignment',
    architectCoreActions: 5,
    alignmentDueAfterActions: 5,
    coordinationArchitecture: null,
    choiceResolvedAtTurn: null,
    preparednessMet: false,
    preparednessCapabilityId: null,
    preparednessArtifactId: null,
    priorMemoryLines: ['At Vey, you made uncertainty public.'],
    referenceCivilization: null,
    outcomeId: null,
    ...overrides,
  };
}

function advanceDialogue(): void {
  while (screen.queryByRole('button', { name: 'Continue' })) {
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
  }
}

describe('TriangulationChronicleExperience', () => {
  it('shows prior memory sentence-by-sentence and a labeled preparedness objective', () => {
    render(<TriangulationChronicleExperience state={triangulationState()} gameStatus="playing" localPlayerId="architect" disableFocusTrap onChoose={vi.fn()} />);
    expect(screen.getByText('At Vey, you made uncertainty public.')).toBeInTheDocument();
    expect(screen.getByText('INDEPENDENT FRAME')).toBeInTheDocument();
    expect(screen.getByText('UNPREPARED')).toBeInTheDocument();
    expect(screen.queryByText('0 / 0')).not.toBeInTheDocument();
  });

  it('requires explicit confirmation before recording an architecture', () => {
    const onChoose = vi.fn();
    render(<TriangulationChronicleExperience state={triangulationState()} gameStatus="playing" localPlayerId="architect" disableFocusTrap onChoose={onChoose} />);
    advanceDialogue();
    fireEvent.click(screen.getByRole('button', { name: /Build a measure none of them owns/i }));
    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByText('A common language will still decide what cannot be said.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /let them govern the omissions together/i }));
    expect(onChoose).toHaveBeenCalledWith('establish_unowned_measure');
  });

  it('lets only the Architect choose after the shared dialogue', () => {
    render(<TriangulationChronicleExperience state={triangulationState()} gameStatus="playing" localPlayerId="myria" disableFocusTrap onChoose={vi.fn()} />);
    advanceDialogue();
    expect(screen.getByText('The Architect is establishing the Alignment.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Keep all three witnesses/i })).not.toBeInTheDocument();
  });

  it('replaces generic game over with the three-history Chronicle record', () => {
    const { container } = render(<TriangulationChronicleExperience
      state={triangulationState({
        phase: 'finished',
        coordinationArchitecture: 'instantiate_composite_mind',
        referenceCivilization: 'vesper',
        outcomeId: 'triangulation_composite_vesper_reference',
      })}
      gameStatus="finished"
      localPlayerId="architect"
      disableFocusTrap
      onChoose={vi.fn()}
    />);
    expect(screen.getByRole('heading', { name: 'One Sky' })).toBeInTheDocument();
    expect(screen.getByText('THREE HISTORIES RECORDED')).toBeInTheDocument();
    expect(container.querySelectorAll('.triangulation-bearing__node')).toHaveLength(3);
    expect(container.querySelector('.triangulation-bearing__node--vesper.is-reference')).not.toBeNull();
  });
});
