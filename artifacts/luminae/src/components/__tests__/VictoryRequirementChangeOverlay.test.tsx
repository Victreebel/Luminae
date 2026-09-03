import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  REDUCED_VICTORY_THRESHOLD_PRESENTATION_MS,
  VICTORY_THRESHOLD_PRESENTATION_MS,
  VictoryRequirementChangeOverlay,
} from '../VictoryRequirementChangeOverlay';
import { gameAudio } from '@/lib/audio';

vi.mock('@/lib/audio', () => ({
  gameAudio: {
    playOblivionThresholdShift: vi.fn(),
    playVictoryRequirementShift: vi.fn(),
  },
}));

describe('VictoryRequirementChangeOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('presents Oblivion as a central void pulse and counts to the authoritative target', async () => {
    const onComplete = vi.fn();
    render(
      <VictoryRequirementChangeOverlay
        amount={8}
        requirementBefore={15}
        requirementAfter={23}
        variant="oblivion"
        onComplete={onComplete}
      />,
    );

    expect(screen.getByTestId('victory-requirement-change')).toHaveAttribute(
      'data-variant',
      'oblivion',
    );
    expect(screen.getByTestId('victory-threshold-sigil')).toBeInTheDocument();
    expect(screen.getByTestId('oblivion-void-pulse')).toBeInTheDocument();
    expect(screen.getByTestId('victory-requirement-value')).toHaveTextContent('15');
    expect(gameAudio.playOblivionThresholdShift).toHaveBeenCalledWith(8);
    expect(gameAudio.playVictoryRequirementShift).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_750);
    });
    expect(screen.getByTestId('victory-requirement-value')).toHaveTextContent('23');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(VICTORY_THRESHOLD_PRESENTATION_MS - 1_750);
    });
    expect(onComplete).toHaveBeenCalledOnce();
  });

  it('uses the general Eminence threshold treatment for other increases', async () => {
    const onComplete = vi.fn();
    render(
      <VictoryRequirementChangeOverlay
        amount={1}
        requirementBefore={20}
        requirementAfter={21}
        reducedMotion
        onComplete={onComplete}
      />,
    );

    expect(screen.queryByTestId('oblivion-void-pulse')).toBeNull();
    expect(gameAudio.playVictoryRequirementShift).toHaveBeenCalledWith(1);
    expect(gameAudio.playOblivionThresholdShift).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REDUCED_VICTORY_THRESHOLD_PRESENTATION_MS);
    });
    expect(screen.getByTestId('victory-requirement-value')).toHaveTextContent('21');
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
