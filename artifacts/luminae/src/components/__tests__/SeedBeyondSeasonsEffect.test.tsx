import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SeedBeyondSeasonsEffect } from '../SeedBeyondSeasonsEffect';
import { playLuminaryEffectPhaseSound } from '@/lib/luminaryEffectSound';
import { gameAudio } from '@/lib/audio';

vi.mock('@/lib/luminaryEffectSound', () => ({
  playLuminaryEffectPhaseSound: vi.fn(),
}));

vi.mock('@/lib/audio', () => ({
  gameAudio: {
    preloadSeedBeyondSeasonsCue: vi.fn(),
    playSeedBeyondSeasonsCue: vi.fn(),
    playAvatarSeedPlant: vi.fn(),
  },
}));

describe('SeedBeyondSeasonsEffect sound sequence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('sounds target, inscription, and settlement in causal order', async () => {
    const onComplete = vi.fn();
    render(<SeedBeyondSeasonsEffect moldSlots={[]} onComplete={onComplete} />);

    expect(playLuminaryEffectPhaseSound).toHaveBeenNthCalledWith(
      1,
      'lum_seed',
      'target',
      '#67e8a2',
    );
    expect(gameAudio.preloadSeedBeyondSeasonsCue).toHaveBeenCalledTimes(1);
    expect(gameAudio.playSeedBeyondSeasonsCue).toHaveBeenCalledWith(260);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(260);
    });
    expect(playLuminaryEffectPhaseSound).toHaveBeenNthCalledWith(
      2,
      'lum_seed',
      'resolve',
      '#67e8a2',
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(playLuminaryEffectPhaseSound).toHaveBeenNthCalledWith(
      3,
      'lum_seed',
      'aftermath',
      '#67e8a2',
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(290);
    });
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('sounds each visible mold inscription beneath the authored cue', async () => {
    const mold = document.createElement('div');
    mold.dataset.slotKey = '1-0';
    mold.getBoundingClientRect = () => new DOMRect(120, 220, 80, 120);
    document.body.appendChild(mold);

    render(<SeedBeyondSeasonsEffect moldSlots={['1-0']} onComplete={vi.fn()} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_050);
    });
    expect(gameAudio.playAvatarSeedPlant).toHaveBeenCalledWith(0);
    mold.remove();
  });
});
