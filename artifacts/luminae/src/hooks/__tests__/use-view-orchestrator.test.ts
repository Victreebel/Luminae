import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import {
  forgeBoundsFitViewport,
  forgeCameraScrollTop,
  useViewOrchestrator,
} from '@/hooks/use-view-orchestrator';

describe('Luminary Forge camera contract', () => {
  it('keeps Full View only when the complete Forge fits both axes', () => {
    expect(forgeBoundsFitViewport(
      { top: 100, bottom: 660, left: 20, right: 780 },
      { width: 800, height: 600 },
    )).toBe(true);

    expect(forgeBoundsFitViewport(
      { top: 100, bottom: 700, left: 20, right: 780 },
      { width: 800, height: 600 },
    )).toBe(false);

    expect(forgeBoundsFitViewport(
      { top: 100, bottom: 660, left: 4, right: 796 },
      { width: 800, height: 600 },
    )).toBe(false);
  });

  it('centers a fitting Forge with equal vertical breathing room', () => {
    expect(forgeCameraScrollTop(
      { top: 300, bottom: 700 },
      600,
    )).toBe(200);
  });

  it('top-aligns an oversized Compact Forge with the safety inset', () => {
    expect(forgeCameraScrollTop(
      { top: 300, bottom: 980 },
      600,
    )).toBe(288);
  });

  it('defers restoration until the sequence lease ends', () => {
    const board = document.createElement('main');
    board.scrollTop = 240;
    const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
      if (typeof top === 'number') board.scrollTop = top;
    });
    Object.defineProperty(board, 'scrollTo', { value: scrollTo });
    const setForgeCompact = vi.fn();

    const { result } = renderHook(() => useViewOrchestrator({
      forgeCompact: false,
      setForgeCompact,
      boardRef: { current: board },
      abridgedAnims: true,
    }));

    act(() => result.current.beginSequence());
    act(() => result.current.prepare([]));
    expect(setForgeCompact).toHaveBeenCalledWith(true);

    act(() => result.current.restore());
    expect(result.current.isSequenceActive).toBe(true);
    expect(setForgeCompact).not.toHaveBeenCalledWith(false);

    act(() => result.current.endSequence());
    expect(result.current.isSequenceActive).toBe(false);
    expect(result.current.isOrchestrating).toBe(true);
    expect(result.current.isRestoring).toBe(true);
    expect(setForgeCompact).toHaveBeenCalledWith(false);
    expect(scrollTo).toHaveBeenCalledWith({ top: 240, behavior: 'instant' });
  });

  it('preserves the original view snapshot across chained camera preparations', () => {
    const board = document.createElement('main');
    board.scrollTop = 180;
    const scrollTo = vi.fn(({ top }: ScrollToOptions) => {
      if (typeof top === 'number') board.scrollTop = top;
    });
    Object.defineProperty(board, 'scrollTo', { value: scrollTo });
    const setForgeCompact = vi.fn();

    const { result, rerender } = renderHook(
      ({ compact }) => useViewOrchestrator({
        forgeCompact: compact,
        setForgeCompact,
        boardRef: { current: board },
        abridgedAnims: true,
      }),
      { initialProps: { compact: false } },
    );

    act(() => result.current.beginSequence());
    act(() => result.current.prepare([]));

    board.scrollTop = 520;
    rerender({ compact: true });
    act(() => result.current.prepare([]));
    act(() => result.current.restore());
    act(() => result.current.endSequence());

    expect(scrollTo).toHaveBeenLastCalledWith({ top: 180, behavior: 'instant' });
    expect(setForgeCompact).toHaveBeenCalledWith(false);
  });
});
