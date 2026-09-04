import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { RecurrenceScenarioState } from '@workspace/game-types';
import { RecurrenceChronicleExperience } from './RecurrenceChronicleExperience';

vi.mock('@/lib/audio', () => ({ gameAudio: { playWhiteReturnSignal: vi.fn() } }));

function recurrenceState(overrides: Partial<RecurrenceScenarioState> = {}): RecurrenceScenarioState {
  return {
    chronicleId: 'chronicle_recurrence', scenarioId: 'chronicle_recurrence_v1', definitionVersion: 1,
    runKind: 'primary', architectPlayerId: 'architect', autonomousPlayerId: 'oru', phase: 'awaiting_custody',
    architectCoreActionCount: 5, custodyDueAfterCoreActions: 5, custodyMethod: null,
    custodyResolvedAtTurnCount: null, preparednessObjectiveMet: false, preparednessArtifactId: null, outcomeId: null,
    ...overrides,
  };
}

function advanceSetup() {
  for (let index = 0; index < 7; index += 1) fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
}

describe('RecurrenceChronicleExperience', () => {
  it('presents Lumii sentence by sentence before the three custody choices', () => {
    render(<RecurrenceChronicleExperience state={recurrenceState()} gameStatus="playing" localPlayerId="architect" disableFocusTrap onChoose={vi.fn()} />);
    expect(screen.getByText('The Deep Index is genuine.')).toBeInTheDocument();
    expect(screen.queryByText('Give both civilizations the whole Archive.')).not.toBeInTheDocument();
    advanceSetup();
    expect(screen.getByRole('button', { name: /Give both civilizations/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Preserve the warning/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Divide the Archive/i })).toBeInTheDocument();
  });

  it('requires confirmation and submits only the recognized custody method', () => {
    const onChoose = vi.fn();
    render(<RecurrenceChronicleExperience state={recurrenceState()} gameStatus="playing" localPlayerId="architect" disableFocusTrap onChoose={onChoose} />);
    advanceSetup();
    fireEvent.click(screen.getByRole('button', { name: /Divide the Archive/i }));
    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByText('Then trust becomes part of the mechanism.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /establish two-reader custody/i }));
    expect(onChoose).toHaveBeenCalledWith('establish_dual_custody');
  });

  it('shows a legible readiness objective and reconnect-restored custody', () => {
    render(<RecurrenceChronicleExperience state={recurrenceState({ phase: 'custody_resolved', custodyMethod: 'seal_operational_grammar' })} gameStatus="playing" localPlayerId="architect" disableFocusTrap onChoose={vi.fn()} />);
    expect(screen.getByText('INDEPENDENT READER')).toBeInTheDocument();
    expect(screen.getByText('UNPREPARED')).toBeInTheDocument();
    expect(screen.getByText('PRESERVE THE WARNING')).toBeInTheDocument();
  });

  it('replaces generic game over with the authored Chronicle record', () => {
    render(<RecurrenceChronicleExperience state={recurrenceState({ phase: 'finished', custodyMethod: 'publish_complete_index', outcomeId: 'recurrence_published_victory' })} gameStatus="finished" localPlayerId="architect" winnerId="architect" disableFocusTrap onChoose={vi.fn()} />);
    expect(screen.getByRole('heading', { name: 'The Open Index' })).toBeInTheDocument();
    expect(screen.getByText('HISTORY RECORDED')).toBeInTheDocument();
  });
});
