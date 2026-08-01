import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LuminaryActivationCinematic } from '../LuminaryActivationCinematic';

beforeEach(() => {
  vi.stubGlobal('matchMedia', vi.fn().mockImplementation((query: string) => ({
    matches: false,
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
});

describe('LuminaryActivationCinematic phase integration', () => {
  it('keeps the full activation presentation when only its timeline is accelerated', () => {
    render(
      <LuminaryActivationCinematic
        luminaryId="lum_forge"
        effectType="summon"
        luminaryName="The Iron Harbinger"
        timelinePlaybackRate={4}
        onComplete={vi.fn()}
      />,
    );

    const cinematic = screen.getByTestId('luminary-activation-cinematic');
    expect(cinematic).toHaveAttribute('data-presentation-mode', 'full');
    expect(cinematic).toHaveAttribute('data-timeline-playback-rate', '4');
  });

  it('advances one reduced-motion beat without skipping the effect', async () => {
    vi.useFakeTimers();
    const onResolutionStart = vi.fn();
    const onComplete = vi.fn();

    render(
      <LuminaryActivationCinematic
        luminaryId="lum_null"
        effectType="summon"
        luminaryName="The Null Sovereign"
        reducedMotion
        procedure={[
          { type: 'luminaryPulse', luminaryId: 'lum_null' },
          { type: 'targetClaim', targetIds: ['t3-1'] },
          { type: 'residue', keyword: 'nullified', targetIds: ['t3-1'] },
        ]}
        onResolutionStart={onResolutionStart}
        onComplete={onComplete}
      />,
    );

    const cinematic = screen.getByTestId('luminary-activation-cinematic');
    expect(cinematic).toHaveAttribute('data-effect-phase', 'announce');
    expect(cinematic).toHaveAttribute('data-presentation-mode', 'compact');
    expect(screen.getByTestId('luminary-activation-entity')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(cinematic);
      await Promise.resolve();
    });

    expect(onResolutionStart).toHaveBeenCalledTimes(1);
    expect(onComplete).not.toHaveBeenCalled();

    await act(async () => {
      await vi.runAllTimersAsync();
    });
    expect(onComplete).toHaveBeenCalledWith(false);
  });

  it('lets a named director use a source-only prelude', async () => {
    vi.useFakeTimers();
    const onResolutionStart = vi.fn();
    const onComplete = vi.fn();

    render(
      <LuminaryActivationCinematic
        luminaryId="lum_forge"
        effectType="summon"
        luminaryName="The Iron Harbinger"
        sourceOnly
        reducedMotion
        procedure={[
          { type: 'luminaryPulse', luminaryId: 'lum_forge' },
          { type: 'targetClaim', targetIds: ['t1-1', 't2-1'] },
          { type: 'archiveReturn', cardIds: ['t1-1', 't2-1'] },
          { type: 'forgeRefill', tiers: [1, 2] },
        ]}
        onResolutionStart={onResolutionStart}
        onComplete={onComplete}
      />,
    );

    expect(screen.queryByText(/Forge refills/i)).toBeNull();
    expect(screen.queryByRole('list', { name: 'Luminary effect resolution' })).toBeNull();
    expect(screen.queryByText(/World shift/i)).toBeNull();
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(onResolutionStart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(false);
  });

  it('keeps the reduced source pulse visible long enough to register', () => {
    vi.useFakeTimers();

    render(
      <LuminaryActivationCinematic
        luminaryId="lum_forge"
        effectType="summon"
        luminaryName="The Iron Harbinger"
        reducedMotion
        onComplete={vi.fn()}
      />,
    );

    const entity = screen.getByTestId('luminary-activation-entity');
    const sourceImage = entity.querySelector('img');
    expect(sourceImage).toHaveAttribute('loading', 'eager');
    expect(sourceImage).toHaveAttribute('decoding', 'sync');

    act(() => vi.advanceTimersByTime(1_200));

    expect(screen.getByTestId('luminary-activation-cinematic')).toBeInTheDocument();
    expect(entity).toBeInTheDocument();
  });
});
