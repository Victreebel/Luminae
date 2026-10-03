import React, { StrictMode } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventForecast } from '@workspace/game-types';
import { CivilizationEventForecast, EventTurnWarning, getEventTurnWarning } from '../EventForecast';

const audio = vi.hoisted(() => ({ play: vi.fn(), dispose: vi.fn() }));
vi.mock('@/lib/cosmicEventAudio', () => ({ createCosmicEventAudio: () => audio }));

const forecast: EventForecast = {
  status: 'countdown', tier: 2, roundsRemaining: 3,
  turnsRemainingByPlayerId: { local: 3, opponent: 2 },
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  sessionStorage.clear();
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });

describe('Civilization Event forecast', () => {
  it('explains complete rounds and separates readiness from a Forge trigger', () => {
    const { rerender } = render(<CivilizationEventForecast forecast={forecast} />);
    expect(screen.getByText('Within 3 rounds')).toBeInTheDocument();
    expect(screen.getByText('Next: Stellar')).toBeInTheDocument();
    expect(screen.getByText(/after every player completes a turn/)).toBeInTheDocument();
    rerender(<CivilizationEventForecast forecast={{ ...forecast, status: 'armed', roundsRemaining: 0 }} />);
    expect(screen.getByText('Event ready')).toBeInTheDocument();
    expect(screen.getByText(/fill the next vacated Forge slot/)).toBeInTheDocument();
  });

  it('shows no invented clock for an older game and explains the final-round closure', () => {
    const { container, rerender } = render(<CivilizationEventForecast />);
    expect(container).toBeEmptyDOMElement();
    rerender(<CivilizationEventForecast forecast={{ ...forecast, status: 'closed', tier: null, roundsRemaining: null }} />);
    expect(screen.getByText(/match is closing/)).toBeInTheDocument();
    expect(screen.queryByText(/Next:/)).not.toBeInTheDocument();
  });
});

describe('turn introduction Event warning', () => {
  it('uses the player’s own count and never warns early, in legacy games, or during resolution', () => {
    expect(getEventTurnWarning('scheduled_forge_v1', forecast, 'local')).toEqual({ dotsRemaining: 3, armed: false });
    expect(getEventTurnWarning('scheduled_forge_v1', forecast, 'opponent')).toEqual({ dotsRemaining: 2, armed: false });
    expect(getEventTurnWarning('scheduled_forge_v1', forecast, 'unknown')).toBeNull();
    expect(getEventTurnWarning('archive_v1', forecast, 'local')).toBeNull();
    expect(getEventTurnWarning('scheduled_forge_v1', { ...forecast, turnsRemainingByPlayerId: { local: 4 } }, 'local')).toBeNull();
    for (const status of ['off', 'resolving', 'complete', 'closed'] as const) {
      expect(getEventTurnWarning('scheduled_forge_v1', { ...forecast, status }, 'local')).toBeNull();
    }
  });

  it('empties three dots and distinguishes waiting on others from being armed', () => {
    const { container, rerender } = render(<EventTurnWarning warning={{ dotsRemaining: 2, armed: false }} turnIdentity="dots" reducedMotion muted />);
    expect(container.querySelectorAll('[data-event-dot="filled"]')).toHaveLength(2);
    expect(container.querySelectorAll('[data-event-dot="empty"]')).toHaveLength(1);
    rerender(<EventTurnWarning warning={{ dotsRemaining: 0, armed: false }} turnIdentity="dots" reducedMotion muted />);
    expect(screen.getByText('Awaiting the round')).toBeInTheDocument();
    expect(container.querySelectorAll('[data-event-dot="empty"]')).toHaveLength(3);
    rerender(<EventTurnWarning warning={{ dotsRemaining: 0, armed: true }} turnIdentity="dots" reducedMotion muted />);
    expect(screen.getByText('Cosmic Event ready')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Event ready; countdown empty' })).toBeInTheDocument();
    expect(audio.play).not.toHaveBeenCalled();
  });

  it('plays one low cue per semantic turn, including under StrictMode and remounts', () => {
    const view = () => <StrictMode><EventTurnWarning warning={{ dotsRemaining: 1, armed: false }} turnIdentity="dedupe-turn" /></StrictMode>;
    const { unmount } = render(view());
    act(() => vi.advanceTimersByTime(300));
    expect(audio.play).toHaveBeenCalledExactlyOnceWith('forecast');
    unmount();
    render(view());
    act(() => vi.advanceTimersByTime(300));
    expect(audio.play).toHaveBeenCalledTimes(1);
    expect(audio.dispose).toHaveBeenCalled();
  });

  it('cancels a dismissed warning and stays silent in a hidden or muted tab', () => {
    const { unmount } = render(<EventTurnWarning warning={{ dotsRemaining: 3, armed: false }} turnIdentity="dismissed-turn" />);
    unmount();
    act(() => vi.advanceTimersByTime(300));
    expect(audio.play).not.toHaveBeenCalled();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    render(<EventTurnWarning warning={{ dotsRemaining: 2, armed: false }} turnIdentity="hidden-turn" />);
    act(() => vi.advanceTimersByTime(300));
    expect(audio.play).not.toHaveBeenCalled();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
    render(<EventTurnWarning warning={{ dotsRemaining: 2, armed: false }} turnIdentity="muted-turn" muted />);
    act(() => vi.advanceTimersByTime(300));
    expect(audio.play).not.toHaveBeenCalled();
  });

  it('allows the same room and personal turn to sound again in a new match epoch', () => {
    const { rerender } = render(<EventTurnWarning warning={{ dotsRemaining: 3, armed: false }} turnIdentity="room:100:player:4" />);
    act(() => vi.advanceTimersByTime(300));
    rerender(<EventTurnWarning warning={{ dotsRemaining: 3, armed: false }} turnIdentity="room:200:player:4" />);
    act(() => vi.advanceTimersByTime(300));
    expect(audio.play).toHaveBeenCalledTimes(2);
  });

  it('keeps armed dots empty from the first frame on each waiting turn', () => {
    const { container, rerender } = render(<EventTurnWarning warning={{ dotsRemaining: 0, armed: true }} turnIdentity="armed:first" muted />);
    for (const dot of container.querySelectorAll('[data-event-dot]')) {
      expect(dot).toHaveStyle({ backgroundColor: 'rgba(255, 255, 255, 0)' });
    }
    rerender(<EventTurnWarning key="next" warning={{ dotsRemaining: 0, armed: true }} turnIdentity="armed:next" muted />);
    for (const dot of container.querySelectorAll('[data-event-dot]')) {
      expect(dot).toHaveStyle({ backgroundColor: 'rgba(255, 255, 255, 0)' });
    }
  });
});
