import { fireEvent, render, screen } from '@testing-library/react';
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
  it('fast-forwards the current effect exactly once and exposes final resolution', () => {
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

    fireEvent.click(cinematic);
    fireEvent.click(cinematic);

    expect(onResolutionStart).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete).toHaveBeenCalledWith(true);
  });
});
