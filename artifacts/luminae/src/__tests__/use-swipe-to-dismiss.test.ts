import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PanInfo } from 'framer-motion';

// ─── framer-motion mock ───────────────────────────────────────────────────────
// animate() queues its .then() callbacks so tests can simulate what happens
// during a spring animation (e.g. browser resetting scroll) before flushing.

let pendingThenCallbacks: Array<() => void> = [];

/** Flush all queued animate .then() callbacks, then clear the queue. */
function flushAnimations() {
  const cbs = [...pendingThenCallbacks];
  pendingThenCallbacks = [];
  cbs.forEach(cb => cb());
}

const animateMock = vi.fn();

vi.mock('framer-motion', () => {
  const makeAnimCtrl = () => {
    const ctrl = {
      then(cb: () => void) {
        pendingThenCallbacks.push(cb);
        return ctrl;
      },
    };
    return ctrl;
  };

  const useMotionValue = (initial: number) => {
    let value = initial;
    return {
      get: () => value,
      set: (v: number) => { value = v; },
      on: vi.fn(),
    };
  };

  return {
    animate: animateMock.mockImplementation(makeAnimCtrl),
    useDragControls: () => ({ start: vi.fn() }),
    useMotionValue,
    useTransform: vi.fn().mockReturnValue({ get: () => 0, set: vi.fn() }),
  };
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function makePanelEl(height = 600, width = 400): HTMLElement {
  const el = document.createElement('div');
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    height,
    width,
    top: 0,
    left: 0,
    right: width,
    bottom: height,
    x: 0,
    y: 0,
    toJSON: () => ({}),
  } as DOMRect);
  return el;
}

/**
 * Creates a div whose scrollTop is backed by a getter/setter so vitest can
 * spy on it and so writes during tests are observable.
 */
function makeScrollableEl(initialScrollTop = 0) {
  const el = document.createElement('div');
  let _scrollTop = initialScrollTop;
  Object.defineProperty(el, 'scrollTop', {
    configurable: true,
    enumerable: true,
    get: () => _scrollTop,
    set: (v: number) => { _scrollTop = v; },
  });
  return el;
}

function makePanInfo(
  overrides: Partial<{
    offsetX: number;
    offsetY: number;
    velocityX: number;
    velocityY: number;
  }> = {},
): PanInfo {
  return {
    offset: { x: overrides.offsetX ?? 0, y: overrides.offsetY ?? 0 },
    velocity: { x: overrides.velocityX ?? 0, y: overrides.velocityY ?? 0 },
    point: { x: 0, y: 0 },
    delta: { x: 0, y: 0 },
  };
}

async function getHook() {
  const mod = await import('../hooks/use-swipe-to-dismiss');
  return mod.useSwipeToDismiss;
}

// ─── tests ────────────────────────────────────────────────────────────────────

describe('useSwipeToDismiss', () => {
  let useSwipeToDismiss: Awaited<ReturnType<typeof getHook>>;

  beforeEach(async () => {
    animateMock.mockClear();
    pendingThenCallbacks = [];
    useSwipeToDismiss = await getHook();
  });

  // ── fast-flick dismiss (vertical) ─────────────────────────────────────────

  describe('fast-flick dismiss (vertical)', () => {
    it('calls onDismiss when downward velocity exceeds VELOCITY_THRESHOLD (250 px/s)', () => {
      const panelEl = makePanelEl();
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss),
      );

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ velocityY: 300 }),
        );
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('does NOT call onDismiss when velocity and offset are both below thresholds', () => {
      const panelEl = makePanelEl();
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss),
      );

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ velocityY: 100, offsetY: 50 }),
        );
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });

    it('calls onDismiss at a velocity just above the threshold (251 px/s)', () => {
      const panelEl = makePanelEl();
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss),
      );

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ velocityY: 251 }),
        );
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });
  });

  // ── horizontal dismiss ─────────────────────────────────────────────────────

  describe('horizontal dismiss', () => {
    it('dismisses when rightward offset exceeds 40 % of panel width', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss),
      );

      // 0.4 × 400 = 160 px threshold; 161 is clearly past it
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetX: 161 }),
        );
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('dismisses when leftward offset exceeds 40 % of panel width', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss),
      );

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetX: -161 }),
        );
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('dismisses when horizontal velocity exceeds HORIZONTAL_VELOCITY_THRESHOLD (400 px/s)', () => {
      const panelEl = makePanelEl();
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss),
      );

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ velocityX: 450 }),
        );
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('does NOT dismiss on a small horizontal movement', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss),
      );

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetX: 50 }),
        );
      });

      expect(onDismiss).not.toHaveBeenCalled();
    });
  });

  // ── sub-threshold snap-back ────────────────────────────────────────────────

  describe('sub-threshold snap-back', () => {
    it('animates panel back to {y:0, x:0} when drag does not meet any dismiss threshold', () => {
      const panelEl = makePanelEl();
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss),
      );

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 50, velocityY: 50 }),
        );
      });

      expect(onDismiss).not.toHaveBeenCalled();
      expect(animateMock).toHaveBeenCalledWith(panelEl, { y: 0, x: 0 }, expect.any(Object));
    });
  });

  // ── slow vertical drag → peek ──────────────────────────────────────────────

  describe('slow vertical drag past threshold → peek state', () => {
    it('snaps to peek when dragged slowly past threshold and peekHeight is set', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      // height=600, threshold=0.3 → need > 180 px; use 200
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });

      expect(onDismiss).not.toHaveBeenCalled();
      expect(result.current.sheetState.current).toBe('peek');
      // peekOffset = 600 × (1 − 0.4) = 360
      expect(animateMock).toHaveBeenCalledWith(panelEl, { y: 360, x: 0 }, expect.any(Object));
    });

    it('dismisses directly (bypasses peek) on a fast flick even when peekHeight is set', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 300 }),
        );
      });

      expect(onDismiss).toHaveBeenCalledOnce();
      expect(result.current.sheetState.current).toBe('open');
    });
  });

  // ── peek → open snap-back ──────────────────────────────────────────────────

  describe('peek → open snap-back', () => {
    it('snaps back to open when dragged upward ≥ 40 px from peek', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      // Drive to peek first
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });
      expect(result.current.sheetState.current).toBe('peek');
      animateMock.mockClear();

      // Upward drag from peek — exceeds PEEK_OPEN_OFFSET (40 px)
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: -50 }),
        );
      });

      expect(onDismiss).not.toHaveBeenCalled();
      expect(result.current.sheetState.current).toBe('open');
      expect(animateMock).toHaveBeenCalledWith(panelEl, { y: 0, x: 0 }, expect.any(Object));
    });

    it('stays at peek (snaps back) when upward drag is less than PEEK_OPEN_OFFSET (40 px)', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });
      animateMock.mockClear();

      // Upward drag that does NOT exceed PEEK_OPEN_OFFSET
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: -20 }),
        );
      });

      expect(onDismiss).not.toHaveBeenCalled();
      expect(result.current.sheetState.current).toBe('peek');
      // Should animate back to the peek offset (360 px)
      expect(animateMock).toHaveBeenCalledWith(panelEl, { y: 360, x: 0 }, expect.any(Object));
    });

    it('dismisses from peek on downward drag ≥ PEEK_DISMISS_OFFSET (40 px)', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 50 }),
        );
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('dismisses from peek on fast vertical flick', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ velocityY: 300 }),
        );
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('dismisses from peek on horizontal flick', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ velocityX: 450 }),
        );
      });

      expect(onDismiss).toHaveBeenCalledOnce();
    });
  });

  // ── isOpen state reset ─────────────────────────────────────────────────────

  describe('isOpen state reset', () => {
    it('resets sheetState back to open when isOpen changes', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result, rerender } = renderHook(
        ({ isOpen }: { isOpen: boolean }) =>
          useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4, isOpen }),
        { initialProps: { isOpen: true } },
      );

      // Drive sheet to peek
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });
      expect(result.current.sheetState.current).toBe('peek');

      // Close then reopen — internal state should be reset to 'open'
      act(() => { rerender({ isOpen: false }); });
      act(() => { rerender({ isOpen: true }); });

      expect(result.current.sheetState.current).toBe('open');
    });
  });

  // ── single scrollable area — scroll preservation ───────────────────────────
  //
  // Scroll preservation sequence:
  //   1. scrollEl has a non-zero scrollTop
  //   2. Call onDragEnd → the preserve function saves scrollTop, queues .then(cb)
  //   3. Simulate the browser resetting scrollTop to 0 (what happens mid-animation)
  //   4. flushAnimations() → cb() restores the saved scrollTop
  //
  // Step 3 must happen AFTER step 2 (so the save captures the real value) but
  // BEFORE step 4 (so there is something to restore).

  describe('single scrollable area — scroll preservation across peek ↔ open', () => {
    it('restores scrollTop after the open animation completes (peek → open path)', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      // Register a scrollable element with non-zero scroll
      const scrollEl = makeScrollableEl(200);
      act(() => { result.current.scrollableAreaProps.ref(scrollEl); });

      // Drive to peek (so sheetState becomes 'peek')
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });
      flushAnimations();

      // Snap back to open: animateToOpenPreservingScroll saves scrollTop=200
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: -50 }),
        );
      });

      // Simulate browser resetting scroll mid-animation (between save and restore)
      scrollEl.scrollTop = 0;

      // Flushing fires the queued .then() callback, which writes back 200
      flushAnimations();

      expect(scrollEl.scrollTop).toBe(200);
    });

    it('restores scrollTop after the peek animation completes (open → peek path)', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      const scrollEl = makeScrollableEl(150);
      act(() => { result.current.scrollableAreaProps.ref(scrollEl); });

      // Snap to peek: animateToPeekPreservingScroll saves scrollTop=150
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });

      // Simulate browser resetting scroll during the peek animation
      scrollEl.scrollTop = 0;

      // Flushing fires the queued .then() callback, which writes back 150
      flushAnimations();

      expect(scrollEl.scrollTop).toBe(150);
    });

    it('does NOT write scrollTop when it was 0 (skips spurious restore)', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      const scrollEl = makeScrollableEl(0);
      const writeSpy = vi.spyOn(scrollEl, 'scrollTop', 'set');

      act(() => { result.current.scrollableAreaProps.ref(scrollEl); });

      // Drive peek → open; scrollTop was 0 throughout
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: -50 }),
        );
      });
      flushAnimations();

      // The guard `scrollTop > 0` means no write should ever occur
      expect(writeSpy).not.toHaveBeenCalled();
    });

    it('unregisters element when callback ref is called with null', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      const scrollEl = makeScrollableEl(150);
      act(() => { result.current.scrollableAreaProps.ref(scrollEl); });

      // Unmount: ref called with null removes element from the set
      act(() => { result.current.scrollableAreaProps.ref(null); });

      // Peek then open
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: -50 }),
        );
      });
      // Simulate reset and flush
      scrollEl.scrollTop = 0;
      flushAnimations();

      // Element was unregistered — scroll not restored
      expect(scrollEl.scrollTop).toBe(0);
    });
  });

  // ── multi-area scroll preservation ────────────────────────────────────────

  describe('multi-area scroll preservation', () => {
    it('preserves scroll positions of ALL registered areas on peek → open', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      const areaA = makeScrollableEl(80);
      const areaB = makeScrollableEl(300);

      const propsA = result.current.makeScrollableAreaProps();
      const propsB = result.current.makeScrollableAreaProps();

      act(() => {
        propsA.ref(areaA);
        propsB.ref(areaB);
      });

      // Drive to peek (scroll positions are still non-zero)
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });
      flushAnimations();

      // Snap back to open: saves [areaA→80, areaB→300]
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: -50 }),
        );
      });

      // Simulate browser resetting both areas mid open-animation
      areaA.scrollTop = 0;
      areaB.scrollTop = 0;

      flushAnimations();

      expect(areaA.scrollTop).toBe(80);
      expect(areaB.scrollTop).toBe(300);
    });

    it('only restores areas whose scrollTop was > 0 at save time', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      const scrolledArea = makeScrollableEl(100);
      const topArea = makeScrollableEl(0);
      const spyTop = vi.spyOn(topArea, 'scrollTop', 'set');

      const propsA = result.current.makeScrollableAreaProps();
      const propsB = result.current.makeScrollableAreaProps();

      act(() => {
        propsA.ref(scrolledArea);
        propsB.ref(topArea);
      });

      // Drive peek then open
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: -50 }),
        );
      });
      flushAnimations();

      expect(scrolledArea.scrollTop).toBe(100);
      expect(spyTop).not.toHaveBeenCalled();
    });

    it('preserves scroll positions of ALL registered areas on open → peek transition', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      const areaA = makeScrollableEl(60);
      const areaB = makeScrollableEl(180);

      const propsA = result.current.makeScrollableAreaProps();
      const propsB = result.current.makeScrollableAreaProps();

      act(() => {
        propsA.ref(areaA);
        propsB.ref(areaB);
      });

      // Snap to peek: animateToPeekPreservingScroll saves [areaA→60, areaB→180]
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });

      // Simulate browser resetting both areas during the peek animation
      areaA.scrollTop = 0;
      areaB.scrollTop = 0;

      // Flushing the .then() callback restores both
      flushAnimations();

      expect(areaA.scrollTop).toBe(60);
      expect(areaB.scrollTop).toBe(180);
    });

    it('each makeScrollableAreaProps() call has an independent registration lifecycle', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      const propsA = result.current.makeScrollableAreaProps();
      const propsB = result.current.makeScrollableAreaProps();

      const areaA = makeScrollableEl(50);
      const areaB = makeScrollableEl(50);

      act(() => {
        propsA.ref(areaA);
        propsB.ref(areaB);
      });

      // Unregister only areaA
      act(() => { propsA.ref(null); });

      // Drive peek then open
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });
      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: -50 }),
        );
      });

      // Simulate browser resetting both mid open-animation
      areaA.scrollTop = 0;
      areaB.scrollTop = 0;

      flushAnimations();

      // areaA was unregistered → NOT restored
      expect(areaA.scrollTop).toBe(0);
      // areaB is still registered → IS restored
      expect(areaB.scrollTop).toBe(50);
    });
  });

  // ── makeScrollableAreaProps — returned shape ───────────────────────────────

  describe('makeScrollableAreaProps — returned shape', () => {
    it('returns props with correct touch-action style', () => {
      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: makePanelEl() }, vi.fn()),
      );

      expect(result.current.scrollableAreaProps.style).toMatchObject({
        touchAction: 'pan-y',
        overscrollBehavior: 'contain',
      });
    });

    it('scrollableAreaProps and makeScrollableAreaProps() both register elements for scroll preservation', () => {
      const panelEl = makePanelEl(600, 400);
      const onDismiss = vi.fn();

      const { result } = renderHook(() =>
        useSwipeToDismiss({ current: panelEl }, onDismiss, { peekHeight: 0.4 }),
      );

      // One element via the convenience alias, one via the factory
      const elA = makeScrollableEl(90);
      const elB = makeScrollableEl(110);
      const extraProps = result.current.makeScrollableAreaProps();

      act(() => {
        result.current.scrollableAreaProps.ref(elA);
        extraProps.ref(elB);
      });

      // Snap back to open: saves both areas
      act(() => {
        // First drive to peek
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: 200, velocityY: 50 }),
        );
      });
      flushAnimations();

      act(() => {
        result.current.dragProps.onDragEnd?.(
          new MouseEvent('pointerup'),
          makePanInfo({ offsetY: -50 }),
        );
      });

      // Simulate browser resetting both mid open-animation
      elA.scrollTop = 0;
      elB.scrollTop = 0;

      flushAnimations();

      expect(elA.scrollTop).toBe(90);
      expect(elB.scrollTop).toBe(110);
    });
  });
});
