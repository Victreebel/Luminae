import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LuminaryEffectSkipControl } from '../LuminaryEffectChrome';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => (
    window.setTimeout(() => callback(performance.now()), 16)
  ));
  vi.stubGlobal('cancelAnimationFrame', (id: number) => clearTimeout(id));
  Object.defineProperty(HTMLElement.prototype, 'setPointerCapture', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('LuminaryEffectSkipControl', () => {
  it('uses a tap for one beat and a hold for only the current effect', () => {
    const onAdvance = vi.fn();
    const onSkip = vi.fn();
    render(
      <LuminaryEffectSkipControl
        color="#f97316"
        onAdvance={onAdvance}
        onSkip={onSkip}
      />,
    );
    const control = screen.getByRole('button');

    fireEvent.click(control);
    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(onSkip).not.toHaveBeenCalled();

    fireEvent.pointerDown(control, {
      button: 0,
      pointerId: 1,
      pointerType: 'touch',
    });
    act(() => vi.advanceTimersByTime(400));
    fireEvent.pointerUp(control, { pointerId: 1, pointerType: 'touch' });
    fireEvent.click(control);

    expect(onSkip).toHaveBeenCalledTimes(1);
    expect(onAdvance).toHaveBeenCalledTimes(1);
  });
});
