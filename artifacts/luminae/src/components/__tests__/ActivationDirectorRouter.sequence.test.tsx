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

vi.mock('../PaleMerchantReturnDirector', () => ({
  PaleMerchantReturnDirector: ({
    returns,
    playbackMode,
    timelinePlaybackRate,
  }: {
    returns: unknown[];
    playbackMode?: string;
    timelinePlaybackRate?: number;
  }) => (
    <div
      data-testid="balance-due-director"
      data-returns={JSON.stringify(returns)}
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

  it('routes every authoritative Balance Due return instead of the legacy active Affinity', () => {
    const paleProps = props();
    paleProps.evt = {
      eventId: 'pale-merchant-summon',
      luminaryId: 'lum_pale',
      effectType: 'summon',
      triggeringPlayerId: 'player-1',
      affinityType: 'flare',
      affinityAmount: 2,
      affinityReturns: [
        { playerId: 'player-1', affinityType: 'verdance', affinityAmount: 2 },
        { playerId: 'player-1', affinityType: 'singularity', affinityAmount: 2 },
        { playerId: 'player-2', affinityType: 'abyss', affinityAmount: 2 },
      ],
    } as ActivationDirectorRouterProps['evt'];
    paleProps.lum = {
      id: 'lum_pale',
      name: 'The Pale Merchant',
      effectName: 'Balance Due',
      effectDescription: 'Qualifying players return two matching Affinity tokens.',
    } as ActivationDirectorRouterProps['lum'];
    paleProps.state = {
      players: [
        { playerId: 'player-1', playerName: 'Aster' },
        { playerId: 'player-2', playerName: 'Nox' },
      ],
    } as ActivationDirectorRouterProps['state'];

    render(<ActivationDirectorRouter {...paleProps} />);
    fireEvent.click(screen.getByTestId('activation-prelude'));

    const director = screen.getByTestId('balance-due-director');
    expect(JSON.parse(director.getAttribute('data-returns') ?? '[]')).toEqual([
      { playerId: 'player-1', playerName: 'Aster', affinity: 'verdance', amount: 2 },
      { playerId: 'player-1', playerName: 'Aster', affinity: 'singularity', amount: 2 },
      { playerId: 'player-2', playerName: 'Nox', affinity: 'abyss', amount: 2 },
    ]);
    expect(director).toHaveAttribute('data-playback-mode', 'swift');
    expect(director).toHaveAttribute('data-timeline-playback-rate', '4');
  });
});
