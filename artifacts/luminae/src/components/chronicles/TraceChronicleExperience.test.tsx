import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TraceScenarioState } from '@workspace/api-client-react';
import { TraceChronicleExperience } from './TraceChronicleExperience';

vi.mock('@/lib/audio', () => ({
  gameAudio: { playTraceSignal: vi.fn() },
}));

function traceState(overrides: Partial<TraceScenarioState> = {}): TraceScenarioState {
  return {
    chronicleId: 'chronicle_trace',
    scenarioId: 'chronicle_trace_v1',
    definitionVersion: 1,
    runKind: 'primary',
    architectPlayerId: 'architect',
    autonomousPlayerId: 'keelborn',
    phase: 'awaiting_guidance',
    architectCoreActionCount: 5,
    guidanceDueAfterCoreActions: 5,
    guidanceMethod: null,
    guidanceResolvedAtTurnCount: null,
    preparednessObjectiveMet: false,
    preparednessArtifactId: null,
    outcomeId: null,
    ...overrides,
  };
}

describe('TraceChronicleExperience', () => {
  it('recalls the primary-history first-contact stance before the Chronicle setup', () => {
    const { rerender } = render(
      <TraceChronicleExperience
        state={traceState()}
        gameStatus="playing"
        localPlayerId="architect"
        firstContactStance="curious"
        disableFocusTrap
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getByText('You asked what happens when a civilization can hear you. This is what happens next.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText("Crownfall has begun: Vey's magnetic routes are collapsing.")).toBeInTheDocument();

    rerender(
      <TraceChronicleExperience
        state={traceState({ runKind: 'rehearsal' })}
        gameStatus="playing"
        localPlayerId="architect"
        firstContactStance="curious"
        disableFocusTrap
        onChoose={vi.fn()}
      />,
    );
    expect(screen.queryByText('You asked what happens when a civilization can hear you. This is what happens next.')).not.toBeInTheDocument();
  });

  it('presents Lumii one sentence at a time before exposing the three authored choices', () => {
    render(
      <TraceChronicleExperience
        state={traceState()}
        gameStatus="playing"
        localPlayerId="architect"
        disableFocusTrap
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getByText("Crownfall has begun: Vey's magnetic routes are collapsing.")).toBeInTheDocument();
    expect(screen.queryByText('Show them every route.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('Hundreds of independent sky-cities and the Keelborn convoy must find new paths before the corridors close.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('The Witness Assembly can reveal every survivable route and its uncertainty.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(screen.getByText('The Continuance Office can direct every vessel onto the route most likely to survive.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('How should I use the forecast?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show them every route/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Show them only the safest route/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Bind every helm/i })).toBeInTheDocument();
  });

  it('requires a confirmation before recording the guidance posture', () => {
    const onChoose = vi.fn();
    render(
      <TraceChronicleExperience
        state={traceState()}
        gameStatus="playing"
        localPlayerId="architect"
        disableFocusTrap
        onChoose={onChoose}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    fireEvent.click(screen.getByRole('button', { name: /Show them only the safest route/i }));

    expect(onChoose).not.toHaveBeenCalled();
    expect(screen.getByText('Their consent is based on what we chose to reveal.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /give them the safe answer/i }));
    expect(onChoose).toHaveBeenCalledWith('withhold_alternatives');
  });

  it('shows the independent-channel objective and reconnect-restored posture in the docked HUD', () => {
    render(
      <TraceChronicleExperience
        state={traceState({
          phase: 'guidance_resolved',
          guidanceMethod: 'expose_all_routes',
          guidanceResolvedAtTurnCount: 9,
          preparednessObjectiveMet: true,
          preparednessArtifactId: 't1p03',
        })}
        gameStatus="playing"
        localPlayerId="architect"
        disableFocusTrap
        onChoose={vi.fn()}
      />,
    );

    expect(screen.getByText('INDEPENDENT CHANNEL')).toBeInTheDocument();
    expect(screen.getByText('PREPARED')).toBeInTheDocument();
    expect(screen.getByText('Show them every route')).toBeInTheDocument();
  });

  it('replaces generic game-over presentation with the authored primary or rehearsal record', () => {
    const { rerender } = render(
      <TraceChronicleExperience
        state={traceState({
          phase: 'finished',
          guidanceMethod: 'force_helm_lock',
          outcomeId: 'trace_forced_victory',
        })}
        gameStatus="finished"
        localPlayerId="architect"
        winnerId="architect"
        disableFocusTrap
        onChoose={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'Every Helm' })).toBeInTheDocument();
    expect(screen.getByText('HISTORY RECORDED')).toBeInTheDocument();

    rerender(
      <TraceChronicleExperience
        state={traceState({
          runKind: 'rehearsal',
          phase: 'finished',
          guidanceMethod: 'force_helm_lock',
          outcomeId: 'trace_forced_defeat',
        })}
        gameStatus="finished"
        localPlayerId="architect"
        winnerId="keelborn"
        disableFocusTrap
        onChoose={vi.fn()}
      />,
    );
    expect(screen.getByRole('heading', { name: 'The Refusal After' })).toBeInTheDocument();
    expect(screen.getByText('COUNTERFACTUAL COMPLETE')).toBeInTheDocument();
  });
});
