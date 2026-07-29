import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ArrivalBrandStrike,
  type BrandStrikeTarget,
} from '../game-luminary-effects';

const forgottenStrike: BrandStrikeTarget = {
  rect: { x: 80, y: 120, w: 96, h: 140 },
  type: 'forgotten',
  delay: 300,
};

beforeEach(() => {
  vi.useFakeTimers();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Forgotten Hour brand-strike audio timing', () => {
  it('fires the sound callback when the first beam reaches its card', () => {
    const onFirstImpact = vi.fn();
    const onDone = vi.fn();

    render(
      <ArrivalBrandStrike
        strikes={[forgottenStrike]}
        onFirstImpact={onFirstImpact}
        onDone={onDone}
      />,
    );

    vi.advanceTimersByTime(719);
    expect(onFirstImpact).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onFirstImpact).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(2_000);
    expect(onFirstImpact).toHaveBeenCalledOnce();
    expect(onDone).toHaveBeenCalledOnce();
  });

  it('cancels a pending impact sound when the strike unmounts', () => {
    const onFirstImpact = vi.fn();
    const { unmount } = render(
      <ArrivalBrandStrike
        strikes={[forgottenStrike]}
        onFirstImpact={onFirstImpact}
        onDone={vi.fn()}
      />,
    );

    vi.advanceTimersByTime(400);
    unmount();
    vi.advanceTimersByTime(1_000);

    expect(onFirstImpact).not.toHaveBeenCalled();
  });
});
