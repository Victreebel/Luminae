import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type LuminaryPresentationRuntimeSignals,
  useLuminaryPresentationEngine,
} from '@/hooks/use-luminary-presentation-engine';

interface TestState {
  version: number;
}

const IDLE_SIGNALS: LuminaryPresentationRuntimeSignals = {
  visibleArrivalActive: false,
  activationGateActive: false,
  activationQueueLength: 0,
  activationAftermathActive: false,
  activeDelayedResult: false,
  delayedResultQueueLength: 0,
  seedBoardEffectActive: false,
  brandStrikeCount: 0,
  pendingTurnTransition: false,
  pendingSummonCount: 0,
  pendingActivationCount: 0,
  devSequenceActive: false,
  cameraSequenceActive: false,
  cameraMotionActive: false,
};

let nextAnimationFrameId = 1;
let animationFrames = new Map<number, FrameRequestCallback>();

function flushAnimationFrames() {
  const pending = [...animationFrames.values()];
  animationFrames.clear();
  pending.forEach(callback => callback(performance.now()));
}

beforeEach(() => {
  vi.useFakeTimers();
  nextAnimationFrameId = 1;
  animationFrames = new Map();
  vi.stubGlobal(
    'requestAnimationFrame',
    (callback: FrameRequestCallback) => {
      const id = nextAnimationFrameId++;
      animationFrames.set(id, callback);
      return id;
    },
  );
  vi.stubGlobal(
    'cancelAnimationFrame',
    (handle: number) => {
      animationFrames.delete(handle);
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useLuminaryPresentationEngine', () => {
  it('holds one camera lease across adjacent presentation phases', () => {
    const beginCameraSequence = vi.fn();
    const endCameraSequence = vi.fn();
    const { result, rerender } = renderHook(
      ({ signals }) => useLuminaryPresentationEngine<TestState>({
        signals,
        getProcessedVersion: () => 1,
        processAuthoritativeState: vi.fn(),
        beginCameraSequence,
        endCameraSequence,
      }),
      { initialProps: { signals: IDLE_SIGNALS } },
    );

    act(() => flushAnimationFrames());
    beginCameraSequence.mockClear();
    endCameraSequence.mockClear();

    rerender({
      signals: {
        ...IDLE_SIGNALS,
        activationQueueLength: 1,
      },
    });
    expect(result.current.status.phase).toBe('activation');
    expect(result.current.status.cameraControlled).toBe(true);
    expect(beginCameraSequence).toHaveBeenCalledTimes(1);

    rerender({
      signals: {
        ...IDLE_SIGNALS,
        activationAftermathActive: true,
      },
    });
    act(() => flushAnimationFrames());
    expect(result.current.status.phase).toBe('aftermath');
    expect(endCameraSequence).not.toHaveBeenCalled();

    rerender({ signals: IDLE_SIGNALS });
    act(() => flushAnimationFrames());
    expect(result.current.status.phase).toBe('idle');
    expect(endCameraSequence).toHaveBeenCalledTimes(1);
  });

  it('queues authoritative states behind the presentation and drains in order', () => {
    let processedVersion = 1;
    const processAuthoritativeState = vi.fn((state: TestState) => {
      processedVersion = state.version;
    });
    const activeSignals = {
      ...IDLE_SIGNALS,
      activationQueueLength: 1,
    };
    const { result, rerender } = renderHook(
      ({ signals }) => useLuminaryPresentationEngine<TestState>({
        signals,
        getProcessedVersion: () => processedVersion,
        processAuthoritativeState,
        beginCameraSequence: vi.fn(),
        endCameraSequence: vi.fn(),
      }),
      { initialProps: { signals: activeSignals } },
    );

    act(() => {
      result.current.ingress.accept({ version: 3 }, 'websocket');
      result.current.ingress.accept({ version: 2 }, 'polling');
    });
    expect(result.current.queuedStateCount).toBe(2);
    expect(processAuthoritativeState).not.toHaveBeenCalled();

    rerender({ signals: IDLE_SIGNALS });
    act(() => vi.runAllTimers());

    expect(processAuthoritativeState.mock.calls.map(([state]) => state.version))
      .toEqual([2, 3]);
    expect(result.current.queuedStateCount).toBe(0);
  });

  it('releases an unclaimed Sequence Lab launch lease after its fallback', () => {
    const beginCameraSequence = vi.fn();
    const endCameraSequence = vi.fn();
    const { result } = renderHook(() => (
      useLuminaryPresentationEngine<TestState>({
        signals: IDLE_SIGNALS,
        getProcessedVersion: () => 1,
        processAuthoritativeState: vi.fn(),
        beginCameraSequence,
        endCameraSequence,
      })
    ));

    act(() => flushAnimationFrames());
    beginCameraSequence.mockClear();
    endCameraSequence.mockClear();

    act(() => result.current.beginDevSequenceRun());
    expect(result.current.status.phase).toBe('awaiting-state');
    expect(beginCameraSequence).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(2_999));
    expect(endCameraSequence).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(1));
    act(() => flushAnimationFrames());
    expect(result.current.status.phase).toBe('idle');
    expect(endCameraSequence).toHaveBeenCalledTimes(1);
  });
});
