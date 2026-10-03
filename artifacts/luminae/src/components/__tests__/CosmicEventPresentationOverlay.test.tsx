import React from 'react';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { CivilizationEventInstance, GamePlayerState } from '@workspace/api-client-react';
import { COSMIC_EVENT_TIMING, CosmicEventPresentationOverlay, getCosmicEventEffectDuration } from '../CosmicEventPresentationOverlay';

const audio = vi.hoisted(() => ({ play: vi.fn(), stop: vi.fn(), dispose: vi.fn() }));
vi.mock('@/lib/cosmicEventAudio', () => ({ createCosmicEventAudio: () => audio }));

const event: CivilizationEventInstance = {
  eventId: 'cosmic-1',
  definitionId: 'event_planetary_affinity_bloom',
  triggerWindow: 'deck_reveal',
  triggerTurnCount: 2,
  phase: 'receipt',
  sourceCard: { id: 'event_planetary_affinity_bloom', tier: 1, forgeSlotIndex: 2 },
  affectedPlayerIds: ['p1', 'p2', 'p3', 'p4'],
  outcomesByPlayerId: Object.fromEntries(['p1', 'p2', 'p3', 'p4'].map((playerId) => [playerId, {
    playerId,
    outcomeId: 'protected',
    capabilityCoverage: 'none',
    respondingCapabilityIds: [],
    respondingManifestations: [],
    appliedConditionType: null,
    stabilityPressure: 0,
    summary: `${playerId} gained one Affinity.`,
  }])),
  createdAt: 100,
};
const players = ['p1', 'p2', 'p3', 'p4'].map((playerId) => ({
  playerId, playerName: `Player ${playerId}`,
})) as GamePlayerState[];
const timing = COSMIC_EVENT_TIMING.normal;
const effectDuration = getCosmicEventEffectDuration(event);
const advance = (duration: number) => act(() => { vi.advanceTimersByTime(duration); });
const phase = () => screen.getByTestId('cosmic-event-presentation').getAttribute('data-phase');
const makeMold = () => {
  const slot = document.createElement('div');
  slot.dataset.slotKey = '1-2';
  document.body.appendChild(slot);
  Object.defineProperties(slot, { clientWidth: { value: 90 }, clientHeight: { value: 60 } });
  vi.spyOn(slot, 'getBoundingClientRect').mockReturnValue({ left: 240, top: 180, width: 90, height: 60 } as DOMRect);
  return slot;
};

describe('CosmicEventPresentationOverlay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  });
  afterEach(() => { cleanup(); document.body.innerHTML = ''; vi.restoreAllMocks(); vi.useRealTimers(); });

  it('finishes activation before explanation, then holds all four results through the effect and receipt', () => {
    const onComplete = vi.fn();
    render(<CosmicEventPresentationOverlay event={event} players={players} onComplete={onComplete} sourceRect={{ left: 50, top: 150, width: 120, height: 180 }} />);
    expect(phase()).toBe('formation');
    expect(screen.getByTestId('cosmic-event-presentation').style.getPropertyValue('--event-source-x')).toBe('110px');
    expect(screen.queryByTestId('cosmic-event-explanation')).not.toBeInTheDocument();
    expect(screen.queryByTestId('cosmic-event-card')).not.toBeInTheDocument();
    advance(timing.formation);
    expect(phase()).toBe('tremble');
    advance(timing.tremble);
    expect(phase()).toBe('lift');
    advance(timing.lift);
    expect(phase()).toBe('activation');
    advance(timing.activation - 1);
    expect(screen.queryByTestId('cosmic-event-explanation')).not.toBeInTheDocument();
    advance(1);
    expect(phase()).toBe('effect');
    expect(audio.play).toHaveBeenLastCalledWith('effect', effectDuration);
    for (const player of players) {
      expect(screen.getByText(player.playerName)).toBeInTheDocument();
      expect(screen.getByText(`${player.playerId} gained one Affinity.`)).toBeInTheDocument();
    }
    advance(effectDuration);
    expect(phase()).toBe('receipt');
    expect(onComplete).not.toHaveBeenCalled();
    expect(screen.getByTestId('cosmic-event-explanation')).toBeInTheDocument();
    advance(timing.receipt);
    expect(phase()).toBe('settle');
    expect(onComplete).not.toHaveBeenCalled();
    advance(timing.settle);
    expect(onComplete).toHaveBeenCalledTimes(1);
    advance(20_000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('fills the actual compact mold in its physical tier before revealing a single lifting Event card', () => {
    const slot = makeMold();
    const scheduled = { ...event, definitionId: 'event_galactic_entropy_storm' as const, sourceCard: { ...event.sourceCard!, origin: 'scheduled' as const } };
    render(<CosmicEventPresentationOverlay event={scheduled} players={players} onComplete={vi.fn()} />);
    const fill = screen.getByTestId('cosmic-event-formation');
    expect(fill.parentElement).toBe(slot);
    expect(fill).toHaveAttribute('data-target-slot-key', '1-2');
    expect(fill).toHaveAttribute('data-placement', 'slot');
    expect(screen.getByTestId('cosmic-event-forming-card')).toHaveAttribute('data-event-art', 'entropy_storm');
    expect(screen.queryByTestId('cosmic-event-card')).not.toBeInTheDocument();
    expect(audio.play).not.toHaveBeenCalled();

    vi.mocked(slot.getBoundingClientRect).mockReturnValue({ left: 200, top: 140, width: 90, height: 60 } as DOMRect);
    act(() => window.dispatchEvent(new Event('scroll')));
    expect(screen.getByTestId('cosmic-event-presentation').style.getPropertyValue('--event-source-x')).toBe('245px');
    advance(timing.formation - 1);
    expect(phase()).toBe('formation');
    advance(1);
    expect(phase()).toBe('tremble');
    expect(slot.childElementCount).toBe(0);
    expect(screen.getAllByTestId('cosmic-event-card')).toHaveLength(1);
    expect(audio.play).toHaveBeenLastCalledWith('tremble', undefined);
    advance(timing.tremble);
    expect(phase()).toBe('lift');
  });

  it('suspends formation for both Pause and hidden-tab time, then continues its remaining fill', () => {
    makeMold();
    const hidden = vi.spyOn(document, 'hidden', 'get');
    render(<CosmicEventPresentationOverlay event={event} players={players} onComplete={vi.fn()} />);
    advance(300);
    fireEvent.click(screen.getByRole('button', { name: 'Pause Event to read' }));
    expect(screen.getByTestId('cosmic-event-formation')).toHaveAttribute('data-paused', 'true');
    advance(60_000);
    fireEvent.click(screen.getByRole('button', { name: 'Resume Event' }));
    advance(200);
    act(() => { hidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange')); });
    advance(60_000);
    expect(phase()).toBe('formation');
    act(() => { hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); });
    advance(timing.formation - 501);
    expect(phase()).toBe('formation');
    advance(1);
    expect(phase()).toBe('tremble');
  });

  it('preserves elapsed condensation when a responsive layout replaces the mold DOM node', async () => {
    const oldSlot = makeMold();
    render(<CosmicEventPresentationOverlay event={event} players={players} onComplete={vi.fn()} />);
    advance(600);
    const newSlot = oldSlot.cloneNode(false) as HTMLElement;
    Object.defineProperties(newSlot, { clientWidth: { value: 100 }, clientHeight: { value: 140 } });
    vi.spyOn(newSlot, 'getBoundingClientRect').mockReturnValue({ left: 200, top: 150, width: 100, height: 140 } as DOMRect);
    await act(async () => { oldSlot.replaceWith(newSlot); });
    expect(screen.getByTestId('cosmic-event-formation').parentElement).toBe(newSlot);
    expect(screen.getByTestId('cosmic-event-formation').style.getPropertyValue('--forge-refill-delay')).toBe('-600ms');
    advance(timing.formation - 600);
    expect(phase()).toBe('tremble');
    expect(screen.getByTestId('cosmic-event-presentation')).not.toHaveAttribute('data-source-compact');
  });

  it('uses a brief in-mold fade for reduced motion and cleans the portal immediately on Skip', () => {
    const slot = makeMold();
    const onComplete = vi.fn();
    render(<CosmicEventPresentationOverlay event={event} players={players} reducedMotion onComplete={onComplete} />);
    expect(screen.getByTestId('cosmic-event-formation')).toHaveAttribute('data-motion', 'reduced');
    expect(slot.querySelector('canvas')).toBeNull();
    advance(COSMIC_EVENT_TIMING.reduced.formation - 1);
    expect(phase()).toBe('formation');
    fireEvent.click(screen.getByRole('button', { name: 'Skip animation' }));
    expect(phase()).toBe('receipt');
    expect(slot.childElementCount).toBe(0);
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    advance(60_000);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('retains legacy scheduled receipts without inventing a new empty mold', () => {
    const legacy = { ...event, sourceCard: { ...event.sourceCard!, origin: 'scheduled' as const, forgeSlotIndex: null } };
    render(<CosmicEventPresentationOverlay event={legacy} players={players} sourceRect={{ left: 20, top: 40, width: 120, height: 180 }} onComplete={vi.fn()} />);
    expect(phase()).toBe('tremble');
    expect(screen.queryByTestId('cosmic-event-formation')).not.toBeInTheDocument();
  });

  it('does not restart a beat when game state refreshes with a new completion callback', () => {
    const before = vi.fn();
    const after = vi.fn();
    const view = render(<CosmicEventPresentationOverlay event={event} players={players} onComplete={before} />);
    advance(1000);
    view.rerender(<CosmicEventPresentationOverlay event={{ ...event }} players={[...players]} onComplete={after} />);
    advance(250);
    expect(phase()).toBe('lift');
    fireEvent.click(screen.getByRole('button', { name: 'Skip animation' }));
    expect(phase()).toBe('receipt');
    advance(timing.receipt);
    advance(timing.settle);
    expect(before).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('keeps the rules captured at activation when the current catalog changes', () => {
    render(<CosmicEventPresentationOverlay event={{ ...event, rulesText: 'The recorded rules for this activation.' }} players={players} onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip animation' }));
    expect(screen.getByText('The recorded rules for this activation.')).toBeInTheDocument();
    expect(screen.queryByText(/Each player gains 1 of their least-held standard Affinities available in the Well/)).not.toBeInTheDocument();
  });

  it('pauses both visual clock and sound while hidden and resumes the remaining dwell', () => {
    const hidden = vi.spyOn(document, 'hidden', 'get');
    const onComplete = vi.fn();
    render(<CosmicEventPresentationOverlay event={event} players={players} onComplete={onComplete} />);
    advance(1000);
    act(() => { hidden.mockReturnValue(true); document.dispatchEvent(new Event('visibilitychange')); });
    expect(screen.getByTestId('cosmic-event-presentation')).toHaveAttribute('data-paused', 'true');
    expect(audio.stop).toHaveBeenCalled();
    advance(60_000);
    expect(phase()).toBe('tremble');
    expect(onComplete).not.toHaveBeenCalled();
    act(() => { hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); });
    advance(249);
    expect(phase()).toBe('tremble');
    advance(1);
    expect(phase()).toBe('lift');
  });

  it('keeps reduced-motion reading time and supports pausing the receipt', () => {
    const onComplete = vi.fn();
    render(<CosmicEventPresentationOverlay event={event} players={players} reducedMotion onComplete={onComplete} />);
    advance(COSMIC_EVENT_TIMING.reduced.tremble);
    advance(COSMIC_EVENT_TIMING.reduced.lift);
    advance(COSMIC_EVENT_TIMING.reduced.activation);
    advance(effectDuration - 500);
    expect(phase()).toBe('effect');
    advance(500);
    expect(phase()).toBe('receipt');
    fireEvent.click(screen.getByRole('button', { name: 'Pause Event to read' }));
    advance(60_000);
    expect(onComplete).not.toHaveBeenCalled();
    expect(phase()).toBe('receipt');
    fireEvent.click(screen.getByRole('button', { name: 'Resume Event' }));
    advance(COSMIC_EVENT_TIMING.reduced.receipt);
    advance(COSMIC_EVENT_TIMING.reduced.settle);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('cleans up an interrupted event and starts the next identity at the Forge', () => {
    const onComplete = vi.fn();
    const view = render(<CosmicEventPresentationOverlay event={event} players={players} onComplete={onComplete} />);
    advance(timing.tremble);
    view.rerender(<CosmicEventPresentationOverlay event={{ ...event, eventId: 'cosmic-2', definitionId: 'event_galactic_entropy_storm' }} players={players} onComplete={onComplete} />);
    expect(phase()).toBe('tremble');
    expect(screen.getByTestId('cosmic-event-presentation')).toHaveAttribute('data-profile', 'entropy_storm');
    expect(audio.dispose).toHaveBeenCalledTimes(1);
    view.unmount();
    advance(60_000);
    expect(onComplete).not.toHaveBeenCalled();
    expect(audio.dispose).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['event_stellar_system_shock', 'System Shock', 'system_shock', ['t2r01']],
    ['event_galactic_fracture_wave', 'Fracture Wave', 'fracture_wave', ['t2r01', 't1r01']],
  ] as const)('explains exact damage targets and recovery after %s activates', (definitionId, title, profile, ids) => {
    const damageEvent: CivilizationEventInstance = {
      ...event,
      definitionId,
      affectedPlayerIds: ['p1', 'p2'],
      outcomesByPlayerId: {
        p1: { ...event.outcomesByPlayerId.p1, summary: 'Operational implementations were damaged.', damagedArtifactIds: [...ids] },
        p2: { ...event.outcomesByPlayerId.p2, summary: 'No operational Artifacts to damage.', damagedArtifactIds: [] },
      },
    };
    const damagePlayers = [
      { ...players[0], forgedArtifacts: [{ id: 't2r01', name: 'Stellar Crucible' }, { id: 't1r01', name: 'Ignition Kernel' }] },
      { ...players[1], forgedArtifacts: [] },
    ] as GamePlayerState[];
    render(<CosmicEventPresentationOverlay event={damageEvent} players={damagePlayers} reducedMotion onComplete={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: title })).toHaveAttribute('data-profile', profile);
    expect(screen.queryByText(/queue free repairs/)).not.toBeInTheDocument();
    advance(COSMIC_EVENT_TIMING.reduced.tremble);
    advance(COSMIC_EVENT_TIMING.reduced.lift);
    advance(COSMIC_EVENT_TIMING.reduced.activation);
    const targets = screen.getByRole('list', { name: 'Damaged Artifacts for Player p1' });
    expect(within(targets).getAllByRole('listitem')).toHaveLength(ids.length);
    expect(within(targets).getByText(/Stellar Crucible/)).toBeInTheDocument();
    if (ids.length === 2) expect(within(targets).getByText(/Ignition Kernel/)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: 'Damaged Artifacts for Player p2' })).not.toBeInTheDocument();
    expect(screen.getByText('No operational Artifacts to damage.')).toBeInTheDocument();
    expect(screen.getByText(/Select damaged Artifacts in Civilization and queue free repairs/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pause Event to read' }));
    advance(60_000);
    expect(phase()).toBe('effect');
    expect(targets).toBeInTheDocument();
  });

  it.each([
    ['event_planetary_signal_clarity', 'Signal Clarity', 'signal_clarity'],
    ['event_stellar_synchronization_shear', 'Synchronization Shear', 'synchronization_shear'],
  ] as const)('reveals the recorded lore targeting reason only after %s activates', (definitionId, title, profile) => {
    const loreEvent: CivilizationEventInstance = {
      ...event,
      definitionId,
      affectedPlayerIds: ['p1'],
      outcomesByPlayerId: {
        p1: {
          ...event.outcomesByPlayerId.p1,
          targetEvidence: [{
            artifactId: 't1s04', match: { kind: 'event_fact', id: 'dependency:distributed_synchronization' },
            role: 'target', reason: 'Requires distributed synchronization.',
          }],
        },
      },
    };
    render(<CosmicEventPresentationOverlay event={loreEvent} players={players} reducedMotion onComplete={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: title })).toHaveAttribute('data-profile', profile);
    expect(screen.queryByText(/Requires distributed synchronization/)).not.toBeInTheDocument();
    advance(COSMIC_EVENT_TIMING.reduced.tremble);
    advance(COSMIC_EVENT_TIMING.reduced.lift);
    advance(COSMIC_EVENT_TIMING.reduced.activation);
    expect(screen.getByText(/Requires distributed synchronization/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pause Event to read' }));
    advance(60_000);
    expect(phase()).toBe('effect');
  });
});
