import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CinderMandateBurnDirector,
  type CinderMandateBurnActions,
  type DirectorBurnSlot,
} from '@/components/CinderMandateBurnDirector';
import { gameAudio } from '@/lib/audio';
import { FORGE_REFILL_LOCK_MS, FORGE_REFILL_STAGGER_MS } from '@/lib/forgeRefillTiming';
import type { LuminaryPlaybackMode } from '@/lib/luminaryPresentationPacing';

vi.mock('framer-motion', () => ({ animate: vi.fn() }));
vi.mock('@/lib/audio', () => ({ gameAudio: { stopActivationSting: vi.fn() } }));
vi.mock('@/lib/luminaryEffectSound', () => ({ playLuminaryEffectPhaseSound: vi.fn() }));

function renderDirector({
  reducedMotion = false,
  playbackMode = 'standard',
  timelinePlaybackRate = 1,
}: {
  reducedMotion?: boolean;
  playbackMode?: LuminaryPlaybackMode;
  timelinePlaybackRate?: number;
} = {}) {
  const mountedAt = Date.now();
  const refillTimes: number[] = [];
  const actions = {
    // Let the real sequence exercise its camera-settle fallback.
    prepare: vi.fn(),
    restore: vi.fn(),
    lockBoardScroll: vi.fn(),
    unlockBoardScroll: vi.fn(),
    setAnimEndTime: vi.fn(),
    onBurnFlash: vi.fn(),
    onBurnChipPulse: vi.fn(),
    onBurnPileParticle: vi.fn(),
    onSetCondemnedGhosts: vi.fn(),
    onHideSlots: vi.fn(),
    onRefillPulse: vi.fn(() => { refillTimes.push(Date.now()); }),
    playCardBurn: vi.fn(),
  } satisfies CinderMandateBurnActions;
  const slots: DirectorBurnSlot[] = ['1-0', '1-1'].map((slotKey, index) => ({
    slotKey,
    slotRect: new DOMRect(20 + index * 110, 200, 103, 147),
    sourceLuminaryId: 'lum_ember',
  }));
  const onComplete = vi.fn();
  const result = render(
    <CinderMandateBurnDirector
      targetCardIds={[]}
      pendingBurnSlots={slots}
      reducedMotion={reducedMotion}
      playbackMode={playbackMode}
      timelinePlaybackRate={timelinePlaybackRate}
      actions={actions}
      onComplete={onComplete}
    />,
  );

  const reachRefill = async () => {
    for (let step = 0; step < 10 && refillTimes.length === 0; step += 1) {
      await act(async () => { await vi.advanceTimersToNextTimerAsync(); });
    }
    expect(actions.onRefillPulse).toHaveBeenCalledExactlyOnceWith(['1-0', '1-1']);
    expect(screen.getByTestId('cinder-mandate-burn-director')).toHaveAttribute('data-effect-phase', 'aftermath');
    return refillTimes[0];
  };

  return { ...result, actions, mountedAt, onComplete, reachRefill };
}

describe('CinderMandateBurnDirector refill ownership', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllTimers();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it.each([
    { label: 'standard playback', reducedMotion: false, playbackMode: 'standard' as const, timelinePlaybackRate: 1 },
    { label: 'accelerated swift playback', reducedMotion: false, playbackMode: 'swift' as const, timelinePlaybackRate: 4 },
    { label: 'reduced motion', reducedMotion: true, playbackMode: 'standard' as const, timelinePlaybackRate: 1 },
  ])('owns the board through the last staggered cast in $label', async options => {
    const { actions, mountedAt, onComplete, reachRefill } = renderDirector(options);
    expect(actions.lockBoardScroll).toHaveBeenCalledTimes(1);
    const refillAt = await reachRefill();
    const finalCastDeadline = refillAt + FORGE_REFILL_LOCK_MS + FORGE_REFILL_STAGGER_MS;
    const drainDeadline = mountedAt + actions.setAnimEndTime.mock.calls[0][0];
    expect(drainDeadline).toBeGreaterThanOrEqual(finalCastDeadline);

    await act(async () => { await vi.advanceTimersByTimeAsync(finalCastDeadline - Date.now() - 1); });
    expect(actions.unlockBoardScroll).not.toHaveBeenCalled();
    expect(actions.restore).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(actions.unlockBoardScroll).toHaveBeenCalledTimes(1);
    expect(actions.restore).toHaveBeenCalledExactlyOnceWith({ immediate: options.reducedMotion });
    expect(onComplete).toHaveBeenCalledExactlyOnceWith(false);
    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('allows an explicit hold-to-skip during refill without a later completion', async () => {
    const { actions, onComplete, reachRefill } = renderDirector();
    await reachRefill();
    const skip = screen.getByTestId('luminary-effect-skip');
    Object.defineProperty(skip, 'setPointerCapture', { value: vi.fn() });
    fireEvent.pointerDown(skip, { pointerType: 'touch', pointerId: 1 });
    await act(async () => { await vi.advanceTimersByTimeAsync(400); });

    expect(onComplete).toHaveBeenCalledExactlyOnceWith(true);
    expect(actions.unlockBoardScroll).toHaveBeenCalled();
    expect(actions.restore).toHaveBeenLastCalledWith({ immediate: true });
    expect(gameAudio.stopActivationSting).toHaveBeenCalled();
    const releaseCount = actions.unlockBoardScroll.mock.calls.length;
    const restoreCount = actions.restore.mock.calls.length;

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(actions.unlockBoardScroll).toHaveBeenCalledTimes(releaseCount);
    expect(actions.restore).toHaveBeenCalledTimes(restoreCount);
  });

  it('cancels pending aftermath work when unmounted during refill', async () => {
    const { actions, onComplete, reachRefill, unmount } = renderDirector();
    await reachRefill();
    unmount();
    expect(actions.unlockBoardScroll).toHaveBeenCalledTimes(1);
    expect(gameAudio.stopActivationSting).toHaveBeenCalled();

    await act(async () => { await vi.advanceTimersByTimeAsync(10_000); });
    expect(onComplete).not.toHaveBeenCalled();
    expect(actions.restore).not.toHaveBeenCalled();
    expect(actions.unlockBoardScroll).toHaveBeenCalledTimes(1);
    expect(actions.onRefillPulse).toHaveBeenCalledTimes(1);
  });
});
