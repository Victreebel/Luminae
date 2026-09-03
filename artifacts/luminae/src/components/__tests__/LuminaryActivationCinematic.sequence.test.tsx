import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ANTICIPATE_MS,
  getVisibleProcedureSteps,
  HOLD_MS,
  LuminaryActivationCinematic,
  PAN_OUT_MS,
  REVEAL_MS,
} from '../LuminaryActivationCinematic';
import { gameAudio } from '@/lib/audio';
import { getLuminaryImageAssets } from '@/lib/luminaryAssets';

vi.mock('@/lib/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audio')>();
  return {
    ...actual,
    gameAudio: {
      playActivationSting: vi.fn(),
      playLuminaryEffectBeat: vi.fn(),
      playOblivionThresholdShift: vi.fn(),
      playVictoryRequirementShift: vi.fn(),
      stopActivationSting: vi.fn(),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
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
  it('names threshold changes as victory requirements rather than victories', () => {
    expect(getVisibleProcedureSteps([
      { type: 'victoryRequirementChange', amount: 8 },
    ])).toEqual([
      expect.objectContaining({ label: 'VICTORY REQUIREMENT +8' }),
    ]);
  });

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

  it('reframes during release and waits for camera settlement before handoff', async () => {
    vi.useFakeTimers();
    let settleCamera: (() => void) | undefined;
    const prepareResolution = vi.fn(() => new Promise<void>((resolve) => {
      settleCamera = resolve;
    }));
    const onResolutionStart = vi.fn();
    const onComplete = vi.fn();

    render(
      <LuminaryActivationCinematic
        luminaryId="lum_forge"
        effectType="summon"
        luminaryName="The Iron Harbinger"
        sourceOnly
        prepareResolution={prepareResolution}
        onResolutionStart={onResolutionStart}
        onComplete={onComplete}
      />,
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(ANTICIPATE_MS + REVEAL_MS + HOLD_MS - 1);
    });
    expect(prepareResolution).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(prepareResolution).toHaveBeenCalledOnce();
    expect(screen.getByTestId('luminary-activation-cinematic')).toHaveAttribute(
      'data-effect-phase',
      'frame',
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(PAN_OUT_MS);
    });
    expect(onResolutionStart).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();

    await act(async () => {
      settleCamera?.();
      await Promise.resolve();
    });
    expect(onResolutionStart).toHaveBeenCalledOnce();
    expect(onComplete).toHaveBeenCalledWith(false);
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
    expect(gameAudio.playLuminaryEffectBeat).toHaveBeenCalledWith(
      'suppression',
      'target',
      '#ffffff',
      'lum_null',
    );
    expect(gameAudio.playLuminaryEffectBeat).toHaveBeenCalledWith(
      'suppression',
      'resolve',
      '#ffffff',
      'lum_null',
    );
    expect(gameAudio.playLuminaryEffectBeat).toHaveBeenCalledWith(
      'suppression',
      'aftermath',
      '#ffffff',
      'lum_null',
    );
  });

  it('uses transparent runtime layers for Concordance in the compact activation', () => {
    render(
      <LuminaryActivationCinematic
        luminaryId="lum_radiant"
        effectType="summon"
        luminaryName="Concordance Mandala"
        reducedMotion
        onComplete={vi.fn()}
      />,
    );

    const composite = screen.getByTestId('radiant-entity-composite');
    expect(composite).toHaveAttribute('data-runtime', 'true');
    expect(composite.querySelectorAll('[data-radiant-layer]')).toHaveLength(3);
    expect(composite.querySelector('[class*="lum-radiant"]')).toBeNull();
  });

  it('uses the current Final Hunger entity art instead of its legacy cinematic asset', () => {
    render(
      <LuminaryActivationCinematic
        luminaryId="lum_hunger"
        effectType="action"
        luminaryName="The Final Hunger"
        reducedMotion
        onComplete={vi.fn()}
      />,
    );

    const assets = getLuminaryImageAssets('lum_hunger');
    const sourceImage = screen
      .getByTestId('luminary-activation-entity')
      .querySelector('img');

    expect(sourceImage).toHaveAttribute('src', assets.entityRuntime);
    expect(sourceImage).not.toHaveAttribute('src', assets.cinematicArt);
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

  it('registers the reduced source pulse, then clears it before consequence motion', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();

    render(
      <LuminaryActivationCinematic
        luminaryId="lum_forge"
        effectType="summon"
        luminaryName="The Iron Harbinger"
        reducedMotion
        onComplete={onComplete}
      />,
    );

    const entity = screen.getByTestId('luminary-activation-entity');
    const sourceImage = entity.querySelector('img');
    expect(sourceImage).toHaveAttribute('loading', 'eager');
    expect(sourceImage).toHaveAttribute('decoding', 'sync');

    await act(async () => {
      await vi.advanceTimersByTimeAsync(REVEAL_MS + 100);
    });

    expect(entity).toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(HOLD_MS - 50);
    });

    expect(screen.getByTestId('luminary-activation-cinematic')).toBeInTheDocument();
    expect(screen.queryByTestId('luminary-activation-entity')).toBeNull();
    expect(onComplete).not.toHaveBeenCalled();
  });
});
