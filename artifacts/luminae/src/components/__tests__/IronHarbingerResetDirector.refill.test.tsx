import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ArtifactCard } from '@workspace/api-client-react';
import { IronHarbingerResetDirector, type IronHarbingerResetActions } from '../IronHarbingerResetDirector';
import { ForgeDeckPile } from '@/pages/game-board-forge-deck';
import { gameAudio } from '@/lib/audio';
import { FORGE_REFILL_DURATION_MS, FORGE_REFILL_REDUCED_DURATION_MS, getForgeRefillRevealMs } from '@/lib/forgeRefillTiming';
import { MOCK_PROCEDURE_STATES } from '@/pages/mockProcedureStates';

vi.hoisted(() => { if (!('AnimationEvent' in window)) vi.stubGlobal('AnimationEvent', Event); });
vi.mock('framer-motion', async importOriginal => ({
  ...await importOriginal<typeof import('framer-motion')>(),
  animate: vi.fn(() => ({ stop: vi.fn() })),
}));
vi.mock('@/components/ForgeMoltenSurface', () => ({ ForgeMoltenSurface: () => null }));
vi.mock('@/lib/luminaryEffectSound', () => ({ playLuminaryEffectPhaseSound: vi.fn() }));
vi.mock('@/lib/audio', () => ({ gameAudio: {
  preloadImpactExtinctionShockwave: vi.fn(), stopActivationSting: vi.fn(),
  playImpactExtinctionTremor: vi.fn(), playImpactExtinctionShockwave: vi.fn(),
  startForgeRefill: vi.fn(() => ({ reveal: vi.fn(), complete: vi.fn(), cancel: vi.fn() })),
} }));

function setup(reducedMotion = false) {
  const cards = [0, 1].map(index => ({
    id: `t1r0${index + 1}`, tier: 1, name: `Artifact ${index}`, eminence: 0, bonusAffinity: 'flare', cost: {},
  } as ArtifactCard));
  const onComplete = vi.fn();
  const actions: IronHarbingerResetActions = {
    prepare: vi.fn((_procedure, done) => done?.()), setAnimEndTime: vi.fn(),
    onLiftSlots: vi.fn(), onRefillReveal: vi.fn(), onRevealSlot: vi.fn(), onFinish: vi.fn(),
    playShuffle: vi.fn(), playArchiveImpact: vi.fn(), playDeal: vi.fn(),
  };
  const result = render(<>
    <div data-forge-tiers>
      {[0, 1].map(index => <div key={index} data-slot-key={`1-${index}`} className="board-forge-compact-chip" />)}
      <ForgeDeckPile tier={1} deckCount={10} deckDisabled={false} deckTitle="Archive" isDeckPending={false} forgeCompact onCancelPlan={() => {}} onDeckTap={() => {}} />
    </div>
    <IronHarbingerResetDirector
      targetCardIds={cards.map(card => card.id)}
      capturedSlots={cards.map((card, slotIndex) => ({ cardId: card.id, card, tier: 1, slotIndex, slotKey: `1-${slotIndex}` }))}
      state={{ ...MOCK_PROCEDURE_STATES.lum_moth.state, forgeTier1: cards, forgeTier2: [], forgeTier3: [], deckCounts: { tier1: 10, tier2: 10, tier3: 10 } }}
      reducedMotion={reducedMotion} actions={actions} onComplete={onComplete}
    />
  </>);
  const reachRefill = async () => {
    for (let i = 0; i < 40 && screen.queryAllByTestId('forge-replacement-deal-animation').length === 0; i++) {
      await act(async () => { await vi.advanceTimersToNextTimerAsync(); });
    }
    expect(screen.getAllByTestId('forge-replacement-deal-animation')).toHaveLength(2);
  };
  return { ...result, actions, onComplete, reachRefill };
}

function finish(element: HTMLElement) {
  const event = new Event('animationend', { bubbles: true });
  Object.defineProperty(event, 'animationName', { value: 'forge-refill-lifecycle' });
  fireEvent(element, event);
}

describe('Iron Harbinger cosmic redeal', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => new DOMRect(10, 20, 73, 104));
    vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  });
  afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.clearAllMocks(); });

  it.each([false, true])('depletes the Archive on each reveal while retaining the cast until completion (reduced=%s)', async reduced => {
    const { actions, onComplete, reachRefill } = setup(reduced);
    await reachRefill();
    const crystal = document.querySelector('[data-archive-cinematic="1"] .archive-vessel')!;
    expect(crystal).toHaveAttribute('data-archive-remaining', '12');
    const effects = screen.getAllByTestId('forge-replacement-deal-animation');
    expect(effects[0]).toHaveAttribute('data-motion', reduced ? 'reduced' : 'full');
    expect(actions.onRevealSlot).not.toHaveBeenCalled();
    expect(actions.playDeal).not.toHaveBeenCalled();
    const sounds = vi.mocked(gameAudio.startForgeRefill).mock.results.map(result => result.value);
    const duration = reduced ? FORGE_REFILL_REDUCED_DURATION_MS : FORGE_REFILL_DURATION_MS;
    const revealMs = getForgeRefillRevealMs(duration, reduced);
    await act(async () => { await vi.advanceTimersByTimeAsync(revealMs - 1); });
    expect(sounds[0].reveal).not.toHaveBeenCalled();
    expect(actions.onRefillReveal).not.toHaveBeenCalled();
    expect(crystal).toHaveAttribute('data-archive-remaining', '12');
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(sounds[0].reveal).toHaveBeenCalledOnce();
    expect(sounds[0].complete).not.toHaveBeenCalled();
    expect(actions.onRefillReveal).toHaveBeenCalledExactlyOnceWith('1-0');
    expect(actions.onRevealSlot).not.toHaveBeenCalled();
    expect(crystal).toHaveAttribute('data-archive-remaining', '11');
    expect(screen.getAllByTestId('forge-replacement-deal-animation')).toHaveLength(2);
    finish(effects[0]);
    expect(sounds[0].reveal).toHaveBeenCalledOnce();
    expect(sounds[0].complete).toHaveBeenCalledOnce();
    expect(crystal).toHaveAttribute('data-archive-remaining', '11');
    expect(actions.onRevealSlot).toHaveBeenCalledWith('1-0');
    expect(onComplete).not.toHaveBeenCalled();
    const stagger = Number.parseFloat(effects[1].style.getPropertyValue('--forge-refill-delay'));
    await act(async () => { await vi.advanceTimersByTimeAsync(stagger); });
    expect(sounds[1].reveal).toHaveBeenCalledOnce();
    expect(sounds[1].complete).not.toHaveBeenCalled();
    expect(actions.onRefillReveal).toHaveBeenNthCalledWith(2, '1-1');
    expect(crystal).toHaveAttribute('data-archive-remaining', '10');
    finish(effects[1]);
    await act(async () => { await vi.advanceTimersByTimeAsync(600); });
    expect(onComplete).toHaveBeenCalledExactlyOnceWith(false);
    expect(document.querySelector('[data-archive-cinematic]')).toBeNull();
    expect(screen.queryByTestId('forge-replacement-deal-animation')).not.toBeInTheDocument();
  });

  it('cancels unfinished casts when the reset is skipped', async () => {
    const { actions, onComplete, reachRefill } = setup();
    await reachRefill();
    const sounds = vi.mocked(gameAudio.startForgeRefill).mock.results.map(result => result.value);
    const skip = screen.getByTestId('luminary-effect-skip');
    Object.defineProperty(skip, 'setPointerCapture', { value: vi.fn() });
    fireEvent.pointerDown(skip, { pointerType: 'touch', pointerId: 1 });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });
    expect(onComplete).toHaveBeenCalledExactlyOnceWith(true);
    expect(actions.onFinish).toHaveBeenCalledWith(['1-0', '1-1']);
    expect(screen.queryByTestId('forge-replacement-deal-animation')).not.toBeInTheDocument();
    sounds.forEach(sound => {
      expect(sound.reveal).not.toHaveBeenCalled();
      expect(sound.complete).not.toHaveBeenCalled();
      expect(sound.cancel).toHaveBeenCalledOnce();
    });
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
