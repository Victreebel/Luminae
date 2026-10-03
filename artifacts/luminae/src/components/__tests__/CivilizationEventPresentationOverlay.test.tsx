import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CivilizationEventInstance,
  GamePlayerState,
} from '@workspace/api-client-react';
import { CivilizationEventPresentationOverlay } from '@/components/CivilizationEventPresentationOverlay';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('@/components/CivilizationScenePanel', () => ({
  CivilizationScenePanel: ({ civilizationName, externalRecentSiteIds }: {
    civilizationName: string;
    externalRecentSiteIds: string[];
  }) => (
    <div
      data-testid="event-civilization-scene"
      data-civilization-name={civilizationName}
      data-recent-site-ids={externalRecentSiteIds.join(',')}
    />
  ),
}));

function player(
  playerId: string,
  playerName: string,
  artifactId?: string,
): GamePlayerState {
  return {
    playerId,
    playerName,
    civName: `${playerName} Compact`,
    forgedArtifacts: artifactId ? [{
      id: artifactId,
      name: 'Containment Lattice',
      tier: 1,
      eminence: 1,
      bonusAffinity: 'continuum',
      flavor: '',
      cost: {
        flare: 0,
        continuum: 1,
        verdance: 0,
        abyss: 0,
        radiance: 0,
        singularity: 0,
      },
    }] : [],
    discountedForgeIds: [],
    manifestedBlueprintDevices: [],
  } as GamePlayerState;
}

const event: CivilizationEventInstance = {
  eventId: 'event-1',
  definitionId: 'event_stellar_containment_cascade',
  triggerWindow: 'first_contact',
  triggerTurnCount: 8,
  phase: 'receipt',
  affectedPlayerIds: ['p1', 'p2'],
  outcomesByPlayerId: {
    p1: {
      playerId: 'p1',
      outcomeId: 'protected',
      capabilityCoverage: 'strong',
      respondingCapabilityIds: ['artifact:containment'],
      respondingManifestations: [{
        sourceType: 'artifact',
        sourceId: 't1p01',
        capabilityIds: ['artifact:containment'],
      }],
      appliedConditionType: null,
      stabilityPressure: 0,
      summary: 'Containment systems absorbed the cascade.',
    },
    p2: {
      playerId: 'p2',
      outcomeId: 'exposed',
      capabilityCoverage: 'none',
      respondingCapabilityIds: [],
      respondingManifestations: [],
      appliedConditionType: 'disrupted',
      stabilityPressure: 10,
      summary: 'The cascade disrupted the civilization.',
    },
  },
  createdAt: 1,
};

describe('CivilizationEventPresentationOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('reveals the Event, then focuses each civilization and only its real response', () => {
    render(
      <TooltipProvider>
        <CivilizationEventPresentationOverlay
          event={event}
          players={[player('p1', 'Architect', 't1p01'), player('p2', 'Rival')]}
          onComplete={vi.fn()}
        />
      </TooltipProvider>,
    );

    expect(screen.getByText('Stellar Containment Cascade')).toBeInTheDocument();
    expect(screen.getByText(/answers Disruption/i)).toBeInTheDocument();
    expect(screen.queryByTestId('event-civilization-scene')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Skip current Event beat' }));

    expect(screen.getByText('Architect Compact')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-event-presentation'))
      .toHaveAttribute('data-response-site-ids', 'artifact:t1p01');

    act(() => vi.advanceTimersByTime(850));

    expect(screen.getByText('Protected')).toBeInTheDocument();
    expect(screen.getByText('Containment systems absorbed the cascade.')).toBeInTheDocument();
    expect(screen.getByText(/Containment Lattice/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Skip current Event beat' }));

    expect(screen.getByText('Rival Compact')).toBeInTheDocument();
    expect(screen.getByTestId('civilization-event-presentation'))
      .not.toHaveAttribute('data-response-site-ids');
  });

  it('completes only after the final receipt beat', () => {
    const onComplete = vi.fn();
    render(
      <TooltipProvider>
        <CivilizationEventPresentationOverlay
          event={event}
          players={[player('p1', 'Architect', 't1p01'), player('p2', 'Rival')]}
          reducedMotion
          onComplete={onComplete}
        />
      </TooltipProvider>,
    );

    const skip = () => fireEvent.click(screen.getByRole('button', { name: 'Skip current Event beat' }));
    skip();
    skip();
    skip();

    expect(screen.getAllByText('Event Resolved')).toHaveLength(2);
    expect(screen.getByText('Architect')).toBeInTheDocument();
    expect(screen.getByText('Rival')).toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();

    skip();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
