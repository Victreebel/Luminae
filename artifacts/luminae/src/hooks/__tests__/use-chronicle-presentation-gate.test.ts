import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useChroniclePresentationGate } from '../use-chronicle-presentation-gate';

describe('Chronicle presentation lane', () => {
  it('waits for prior effects, then retains its lane despite later queued effects', () => {
    const onPresentationActiveChange = vi.fn();
    const { result, rerender } = renderHook(
      props => useChroniclePresentationGate({ ...props, onPresentationActiveChange }),
      { initialProps: { requested: true, presentationEnabled: false } },
    );
    expect(result.current.presentationVisible).toBe(false);
    expect(onPresentationActiveChange).toHaveBeenLastCalledWith(false);

    rerender({ requested: true, presentationEnabled: true });
    expect(result.current.presentationVisible).toBe(true);
    expect(onPresentationActiveChange).toHaveBeenLastCalledWith(true);

    rerender({ requested: true, presentationEnabled: false });
    expect(result.current.presentationVisible).toBe(true);
    expect(onPresentationActiveChange).toHaveBeenLastCalledWith(true);
  });

  it('releases the next phase only after the outgoing presentation has exited', () => {
    const onPresentationActiveChange = vi.fn();
    const { result, rerender } = renderHook(
      props => useChroniclePresentationGate({ ...props, onPresentationActiveChange }),
      { initialProps: { requested: true, presentationEnabled: true } },
    );
    rerender({ requested: false, presentationEnabled: true });
    expect(result.current.presentationVisible).toBe(false);
    expect(onPresentationActiveChange).toHaveBeenLastCalledWith(true);
    act(() => result.current.completePresentationExit());
    expect(onPresentationActiveChange).toHaveBeenLastCalledWith(false);
  });

  it('keeps the lane when one Chronicle phase transitions directly into another', () => {
    const onPresentationActiveChange = vi.fn();
    const { result } = renderHook(() => useChroniclePresentationGate({
      requested: true,
      onPresentationActiveChange,
    }));
    act(() => result.current.completePresentationExit());
    expect(result.current.presentationVisible).toBe(true);
    expect(onPresentationActiveChange).toHaveBeenLastCalledWith(true);
  });

  it('waits for the remaining sound tail after a quick choice and exit', () => {
    vi.useFakeTimers();
    try {
      const onPresentationActiveChange = vi.fn();
      const { result, rerender, unmount } = renderHook(
        props => useChroniclePresentationGate({ ...props, onPresentationActiveChange }),
        { initialProps: { requested: true } },
      );
      act(() => result.current.holdPresentationForSound(1_300));
      rerender({ requested: false });
      act(() => result.current.completePresentationExit());
      act(() => vi.advanceTimersByTime(1_299));
      expect(onPresentationActiveChange).toHaveBeenLastCalledWith(true);
      act(() => vi.advanceTimersByTime(1));
      expect(onPresentationActiveChange).toHaveBeenLastCalledWith(false);
      unmount();
    } finally {
      vi.useRealTimers();
    }
  });

  it('releases its lane on navigation without retaining a stale busy signal', () => {
    const onPresentationActiveChange = vi.fn();
    const { unmount } = renderHook(() => useChroniclePresentationGate({
      requested: true,
      onPresentationActiveChange,
    }));
    unmount();
    expect(onPresentationActiveChange).toHaveBeenLastCalledWith(false);
  });
});
