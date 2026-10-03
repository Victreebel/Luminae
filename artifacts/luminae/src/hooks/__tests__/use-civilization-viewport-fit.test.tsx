import { useRef } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useCivilizationViewportFit } from '../use-civilization-viewport-fit';

let viewportHeight: number;
let scrollTop: number;
let headerHeight: number;
let notifyResize: () => void;
const disconnect = vi.fn();

function Fixture({ compact = false, enabled = true }) {
  const rootRef = useRef<HTMLElement>(null);
  const width = useCivilizationViewportFit(rootRef, enabled, compact);
  return <main data-game-board>
    <section ref={rootRef}>
      <header className="civilization-scene-header" />
      <div className="civilization-scene-canvas" data-testid="canvas" style={{ maxWidth: width }} />
    </section>
  </main>;
}

beforeEach(() => {
  viewportHeight = 600;
  headerHeight = 80;
  scrollTop = 0;
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: () => void) { notifyResize = callback; }
    observe() {}
    disconnect = disconnect;
  });
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockImplementation(function () {
    return this.hasAttribute('data-game-board') ? viewportHeight : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1200);
  vi.spyOn(HTMLElement.prototype, 'scrollTop', 'get').mockImplementation(() => scrollTop);
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    const top = this.classList.contains('civilization-scene-canvas')
      ? 50 + 16 + headerHeight - scrollTop : 50;
    return { top } as DOMRect;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  disconnect.mockClear();
});

describe('Civilization viewport framing', () => {
  it('reserves the header and lower gutter, and follows space freed by a compact Well', () => {
    render(<Fixture />);
    expect(parseFloat(screen.getByTestId('canvas').style.maxWidth)).toBeCloseTo(488 * 16 / 9);
    act(() => { viewportHeight = 720; notifyResize(); });
    expect(parseFloat(screen.getByTestId('canvas').style.maxWidth)).toBeCloseTo(608 * 16 / 9);
  });

  it('keeps city geometry fixed through scrolling and unrelated resize notifications', () => {
    render(<Fixture />);
    const before = screen.getByTestId('canvas').style.maxWidth;
    act(() => { scrollTop = 200; notifyResize(); });
    expect(screen.getByTestId('canvas').style.maxWidth).toBe(before);
  });

  it('uses the portrait proportions and recalculates when header details expand', () => {
    render(<Fixture compact />);
    expect(parseFloat(screen.getByTestId('canvas').style.maxWidth)).toBeCloseTo(488 * 4 / 5);
    act(() => { headerHeight = 140; notifyResize(); });
    expect(parseFloat(screen.getByTestId('canvas').style.maxWidth)).toBeCloseTo(428 * 4 / 5);
  });

  it('leaves standalone scenes unconstrained and disconnects when disabled', () => {
    const { rerender } = render(<Fixture />);
    rerender(<Fixture enabled={false} />);
    expect(screen.getByTestId('canvas').style.maxWidth).toBe('');
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
