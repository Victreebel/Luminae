import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthoritativeStateIngress } from '@/hooks/use-authoritative-state-ingress';

interface TestState {
  version: number;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('useAuthoritativeStateIngress', () => {
  it('processes an unblocked state immediately and ignores stale duplicates', () => {
    let processedVersion = 1;
    const process = vi.fn((state: TestState) => {
      processedVersion = state.version;
    });
    const { result } = renderHook(() => useAuthoritativeStateIngress<TestState>({
      blocked: false,
      getProcessedVersion: () => processedVersion,
      process,
    }));

    expect(result.current.accept({ version: 2 }, 'websocket')).toBe('processed');
    expect(result.current.accept({ version: 2 }, 'rest')).toBe('ignored');
    expect(process).toHaveBeenCalledTimes(1);
  });

  it('deduplicates transports and drains queued states in version order', () => {
    vi.useFakeTimers();
    let processedVersion = 1;
    const process = vi.fn((state: TestState) => {
      processedVersion = state.version;
    });
    const { result, rerender } = renderHook(
      ({ blocked }) => useAuthoritativeStateIngress<TestState>({
        blocked,
        getProcessedVersion: () => processedVersion,
        process,
      }),
      { initialProps: { blocked: true } },
    );

    act(() => {
      expect(result.current.accept({ version: 4 }, 'polling')).toBe('queued');
      expect(result.current.accept({ version: 2 }, 'websocket')).toBe('queued');
      expect(result.current.accept({ version: 4 }, 'rest')).toBe('queued');
      expect(result.current.accept({ version: 3 }, 'rest')).toBe('queued');
    });
    expect(result.current.queuedCount).toBe(3);

    rerender({ blocked: false });
    act(() => {
      vi.runAllTimers();
    });

    expect(process.mock.calls.map(([state]) => state.version)).toEqual([2, 3, 4]);
    expect(result.current.queuedCount).toBe(0);
  });

  it('clears pending work and releases its timer', () => {
    vi.useFakeTimers();
    const process = vi.fn();
    const { result } = renderHook(() => useAuthoritativeStateIngress<TestState>({
      blocked: true,
      getProcessedVersion: () => 1,
      process,
    }));

    act(() => {
      result.current.accept({ version: 2 }, 'websocket');
      result.current.clear();
      vi.runAllTimers();
    });

    expect(result.current.queuedCount).toBe(0);
    expect(process).not.toHaveBeenCalled();
  });
});
