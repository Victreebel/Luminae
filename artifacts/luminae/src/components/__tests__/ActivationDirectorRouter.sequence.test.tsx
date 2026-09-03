import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_VICTORY_REQUIREMENT } from '@workspace/game-types';
import {
  ActivationDirectorRouter,
  DIRECTOR_ROUTES,
  type ActivationDirectorRouterProps,
} from '../ActivationDirectorRouter';

vi.mock('../LuminaryActivationCinematic', () => ({
  LuminaryActivationCinematic: ({
    reducedMotion,
    sourceOnly,
    playbackMode,
    timelinePlaybackRate,
    victoryRequirementBefore,
    victoryRequirementAfter,
    onComplete,
  }: {
    reducedMotion?: boolean;
    sourceOnly?: boolean;
    playbackMode?: string;
    timelinePlaybackRate?: number;
    victoryRequirementBefore?: number;
    victoryRequirementAfter?: number;
    onComplete: (skipped?: boolean) => void;
  }) => (
    <button
      type="button"
      data-testid="activation-prelude"
      data-reduced-motion={String(!!reducedMotion)}
      data-source-only={String(!!sourceOnly)}
      data-playback-mode={playbackMode}
      data-timeline-playback-rate={timelinePlaybackRate}
      data-victory-before={victoryRequirementBefore}
      data-victory-after={victoryRequirementAfter}
      onClick={() => onComplete(false)}
    >
      Activation prelude
    </button>
  ),
}));

vi.mock('../CinderMandateBrandingDirector', () => ({
  ArtifactBrandingDirector: ({
    onComplete,
  }: {
    onComplete: (skipped?: boolean) => void;
  }) => (
    <button type="button" data-testid="branding-director" onClick={() => onComplete(false)}>
      Branding director
    </button>
  ),
}));

vi.mock('../VictoryRequirementChangeOverlay', () => ({
  VictoryRequirementChangeOverlay: ({
    amount,
    requirementBefore,
    requirementAfter,
    onComplete,
  }: {
    amount: number;
    requirementBefore?: number;
    requirementAfter?: number;
    onComplete?: () => void;
  }) => (
    <button
      type="button"
      data-testid="threshold-overlay"
      data-amount={amount}
      data-before={requirementBefore}
      data-after={requirementAfter}
      onClick={onComplete}
    >
      Threshold overlay
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

vi.mock('../VerdantOracleGainDirector', () => ({
  VerdantOracleGainDirector: ({
    playerId,
    playerName,
    amount,
    playbackMode,
    timelinePlaybackRate,
  }: {
    playerId: string;
    playerName?: string;
    amount: number;
    playbackMode?: string;
    timelinePlaybackRate?: number;
  }) => (
    <div
      data-testid="early-bloom-director"
      data-player-id={playerId}
      data-player-name={playerName}
      data-amount={amount}
      data-playback-mode={playbackMode}
      data-timeline-playback-rate={timelinePlaybackRate}
    />
  ),
}));

vi.mock('../FinalHungerAssimilationDirector', () => ({
  FinalHungerAssimilationDirector: ({
    slot,
    affinity,
    playbackMode,
    timelinePlaybackRate,
  }: {
    slot: { cardId: string } | null;
    affinity: string;
    playbackMode?: string;
    timelinePlaybackRate?: number;
  }) => (
    <div
      data-testid="assimilation-director"
      data-card-id={slot?.cardId}
      data-affinity={affinity}
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
    assimilationSlot: null,
    assimilationActions: {
      takeOverSlot: noop,
      revealReplacement: noop,
      playAffinityAbsorb: noop,
    },
    onCinematicComplete: noop,
  };
}

describe('ActivationDirectorRouter sequence composition', () => {
  it.each(DIRECTOR_ROUTES)(
    'plays one source activation before $luminaryId:$effectType resolves',
    ({ luminaryId, effectType }) => {
      const routeProps = props();
      routeProps.evt = {
        ...routeProps.evt,
        eventId: `${luminaryId}-${effectType}`,
        luminaryId,
        effectType,
      } as ActivationDirectorRouterProps['evt'];
      routeProps.lum = {
        ...routeProps.lum,
        id: luminaryId,
        name: luminaryId,
        effectName: effectType,
      } as ActivationDirectorRouterProps['lum'];

      const view = render(<ActivationDirectorRouter {...routeProps} />);

      expect(screen.getAllByTestId('activation-prelude')).toHaveLength(1);
      expect(screen.getByTestId('activation-prelude'))
        .toHaveAttribute('data-source-only', 'true');
      view.unmount();
    },
  );

  it('routes Early Bloom as one authoritative Well-to-owner gain', () => {
    const verdantProps = props();
    verdantProps.evt = {
      eventId: 'verdant-oracle-summon',
      luminaryId: 'lum_verdant',
      effectType: 'summon',
      triggeringPlayerId: 'player-1',
      affinityType: 'verdance',
      affinityAmount: 1,
    } as ActivationDirectorRouterProps['evt'];
    verdantProps.triggeringPlayer = {
      playerId: 'player-1',
      playerName: 'Aster',
    } as ActivationDirectorRouterProps['triggeringPlayer'];
    verdantProps.lum = {
      id: 'lum_verdant',
      name: 'The Verdant Oracle',
      effectName: 'Early Bloom',
      effectDescription: 'Gain 1 Verdance from the Affinity Well.',
    } as ActivationDirectorRouterProps['lum'];

    render(<ActivationDirectorRouter {...verdantProps} />);

    const prelude = screen.getByTestId('activation-prelude');
    expect(screen.queryByTestId('early-bloom-director')).toBeNull();
    fireEvent.click(prelude);

    const director = screen.getByTestId('early-bloom-director');
    expect(director).toHaveAttribute('data-player-id', 'player-1');
    expect(director).toHaveAttribute('data-player-name', 'Aster');
    expect(director).toHaveAttribute('data-amount', '1');
    expect(director).toHaveAttribute('data-playback-mode', 'swift');
    expect(director).toHaveAttribute('data-timeline-playback-rate', '4');
  });

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

  it('never gates a Luminary effect behind local acknowledgment', () => {
    const firstRender = render(<ActivationDirectorRouter {...props()} />);

    expect(screen.getByTestId('activation-prelude')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /continue/i })).toBeNull();
    firstRender.unmount();

    const repeatProps = props();
    repeatProps.evt = {
      ...repeatProps.evt,
      eventId: 'iron-harbinger-repeat',
    } as ActivationDirectorRouterProps['evt'];
    render(<ActivationDirectorRouter {...repeatProps} />);

    expect(screen.queryByRole('button', { name: /continue/i })).toBeNull();
    expect(screen.getByTestId('activation-prelude')).toBeInTheDocument();
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

  it('plays Final Hunger activation before the selected Artifact dissolves into Civilization', () => {
    const hungerProps = props();
    hungerProps.evt = {
      eventId: 'final-hunger-action',
      luminaryId: 'lum_hunger',
      effectType: 'action',
      triggeringPlayerId: 'player-1',
      targetCardIds: ['t2p01'],
      affinityType: 'continuum',
      affinityAmount: 1,
    } as ActivationDirectorRouterProps['evt'];
    hungerProps.lum = {
      id: 'lum_hunger',
      name: 'The Final Hunger',
      effectName: 'Assimilation',
      effectDescription: 'Convert an Artifact into permanent Affinity.',
    } as ActivationDirectorRouterProps['lum'];
    hungerProps.assimilationSlot = {
      cardId: 't2p01',
      card: { id: 't2p01', bonusAffinity: 'continuum' },
      tier: 2,
      slotKey: 'tier2-0',
      destinationSelector: '[data-civilization-drop-target]',
    } as ActivationDirectorRouterProps['assimilationSlot'];

    render(<ActivationDirectorRouter {...hungerProps} />);

    const prelude = screen.getByTestId('activation-prelude');
    expect(prelude).toHaveAttribute('data-source-only', 'true');
    expect(screen.queryByTestId('assimilation-director')).toBeNull();

    fireEvent.click(prelude);

    const director = screen.getByTestId('assimilation-director');
    expect(director).toHaveAttribute('data-card-id', 't2p01');
    expect(director).toHaveAttribute('data-affinity', 'continuum');
    expect(director).toHaveAttribute('data-playback-mode', 'swift');
    expect(director).toHaveAttribute('data-timeline-playback-rate', '4');
  });

  it('presents Forgotten Hour branding before its threshold increase', () => {
    const compassProps = props();
    const onBrandingComplete = vi.fn();
    compassProps.evt = {
      eventId: 'forgotten-hour-summon',
      luminaryId: 'lum_compass',
      effectType: 'summon',
      triggeringPlayerId: 'player-1',
      targetCardIds: ['t1p01'],
      victoryRequirementBefore: DEFAULT_VICTORY_REQUIREMENT,
      victoryRequirementAfter: DEFAULT_VICTORY_REQUIREMENT + 1,
      victoryRequirementChange: 1,
    } as ActivationDirectorRouterProps['evt'];
    compassProps.lum = {
      id: 'lum_compass',
      name: '???',
      effectName: 'The Forgotten Hour',
    } as ActivationDirectorRouterProps['lum'];
    compassProps.onBrandingComplete = onBrandingComplete;

    render(<ActivationDirectorRouter {...compassProps} />);
    fireEvent.click(screen.getByTestId('activation-prelude'));
    expect(screen.getByTestId('branding-director')).toBeInTheDocument();
    expect(screen.queryByTestId('threshold-overlay')).toBeNull();

    fireEvent.click(screen.getByTestId('branding-director'));
    const threshold = screen.getByTestId('threshold-overlay');
    expect(threshold).toHaveAttribute('data-amount', '1');
    expect(threshold).toHaveAttribute('data-before', String(DEFAULT_VICTORY_REQUIREMENT));
    expect(threshold).toHaveAttribute('data-after', String(DEFAULT_VICTORY_REQUIREMENT + 1));
    expect(onBrandingComplete).not.toHaveBeenCalled();

    fireEvent.click(threshold);
    expect(onBrandingComplete).toHaveBeenCalledWith(false);
  });

  it('passes authoritative Oblivion thresholds into the generic cinematic', () => {
    const voidProps = props();
    voidProps.evt = {
      eventId: 'void-warden-summon',
      luminaryId: 'lum_void',
      effectType: 'summon',
      triggeringPlayerId: 'player-1',
      victoryRequirementBefore: DEFAULT_VICTORY_REQUIREMENT,
      victoryRequirementAfter: DEFAULT_VICTORY_REQUIREMENT + 8,
      victoryRequirementChange: 8,
    } as ActivationDirectorRouterProps['evt'];
    voidProps.lum = {
      id: 'lum_void',
      name: 'The Void Warden',
      effectName: 'Oblivion',
    } as ActivationDirectorRouterProps['lum'];

    render(<ActivationDirectorRouter {...voidProps} />);

    expect(screen.getByTestId('activation-prelude')).toHaveAttribute(
      'data-victory-before',
      String(DEFAULT_VICTORY_REQUIREMENT),
    );
    expect(screen.getByTestId('activation-prelude')).toHaveAttribute(
      'data-victory-after',
      String(DEFAULT_VICTORY_REQUIREMENT + 8),
    );
  });
});
