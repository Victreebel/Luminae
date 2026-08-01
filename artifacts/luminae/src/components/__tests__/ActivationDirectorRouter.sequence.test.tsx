import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  ActivationDirectorRouter,
  type ActivationDirectorRouterProps,
} from '../ActivationDirectorRouter';

vi.mock('../LuminaryActivationCinematic', () => ({
  LuminaryActivationCinematic: ({
    reducedMotion,
    sourceOnly,
    playbackMode,
    timelinePlaybackRate,
    onComplete,
  }: {
    reducedMotion?: boolean;
    sourceOnly?: boolean;
    playbackMode?: string;
    timelinePlaybackRate?: number;
    onComplete: (skipped?: boolean) => void;
  }) => (
    <button
      type="button"
      data-testid="activation-prelude"
      data-reduced-motion={String(!!reducedMotion)}
      data-source-only={String(!!sourceOnly)}
      data-playback-mode={playbackMode}
      data-timeline-playback-rate={timelinePlaybackRate}
      onClick={() => onComplete(false)}
    >
      Activation prelude
    </button>
  ),
}));

vi.mock('../IronHarbingerResetDirector', () => ({
  IronHarbingerResetDirector: ({
    reducedMotion,
    playbackMode,
    timelinePlaybackRate,
  }: {
    reducedMotion: boolean;
    playbackMode?: string;
    timelinePlaybackRate?: number;
  }) => (
    <div
      data-testid="impact-extinction-director"
      data-reduced-motion={String(reducedMotion)}
      data-playback-mode={playbackMode}
      data-timeline-playback-rate={timelinePlaybackRate}
    />
  ),
}));

function props(): ActivationDirectorRouterProps {
  const noop = vi.fn();
  return {
    evt: {
      eventId: 'iron-harbinger-summon',
      luminaryId: 'lum_forge',
      effectType: 'summon',
      triggeringPlayerId: 'player-1',
      targetCardIds: ['t3p01'],
    } as ActivationDirectorRouterProps['evt'],
    lum: {
      id: 'lum_forge',
      name: 'The Iron Harbinger',
      effectName: 'Impact Extinction',
      effectDescription: 'Return every Forge Artifact to its Archive.',
    } as ActivationDirectorRouterProps['lum'],
    triggeringPlayer: undefined,
    state: null,
    abridgedAnims: false,
    playbackMode: 'swift',
    activationTimelineRate: 4,
    pendingBurnSlots: [],
    queuePosition: 1,
    queueTotal: 1,
    brandingActions: {
      prepare: noop,
      lockBoardScroll: noop,
      unlockBoardScroll: noop,
      setAnimEndTime: noop,
      unsuppressMarkers: noop,
      fireBrandStrikes: noop,
    },
    onBrandingComplete: noop,
    burnActions: {
      prepare: noop,
      restore: noop,
      setAnimEndTime: noop,
      unsuppressMarkers: noop,
      onHeatWash: noop,
      onCardExit: noop,
      onRefillPulse: noop,
      playCardBurn: noop,
    },
    onBurnComplete: noop,
    ironHarbingerSlots: [],
    ironHarbingerActions: {
      prepare: noop,
      setAnimEndTime: noop,
      onLiftSlots: noop,
      onRevealSlot: noop,
      onFinish: noop,
      playShuffle: noop,
      playArchiveImpact: noop,
      playDeal: noop,
    },
    onCinematicComplete: noop,
  };
}

describe('ActivationDirectorRouter sequence composition', () => {
  it('shows the Iron Harbinger activation before its accelerated custom director', () => {
    render(<ActivationDirectorRouter {...props()} />);

    const prelude = screen.getByTestId('activation-prelude');
    expect(prelude).toHaveAttribute('data-reduced-motion', 'false');
    expect(prelude).toHaveAttribute('data-source-only', 'true');
    expect(prelude).toHaveAttribute('data-playback-mode', 'swift');
    expect(prelude).toHaveAttribute('data-timeline-playback-rate', '4');
    expect(screen.queryByTestId('impact-extinction-director')).toBeNull();

    fireEvent.click(prelude);

    expect(screen.queryByTestId('activation-prelude')).toBeNull();
    expect(screen.getByTestId('impact-extinction-director'))
      .toHaveAttribute('data-reduced-motion', 'false');
    expect(screen.getByTestId('impact-extinction-director'))
      .toHaveAttribute('data-playback-mode', 'swift');
    expect(screen.getByTestId('impact-extinction-director'))
      .toHaveAttribute('data-timeline-playback-rate', '4');
  });
});
