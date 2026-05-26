import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React, { useRef } from 'react';
import { useFocusTrap } from '@/hooks/use-focus-trap';

// ─── requestAnimationFrame mock ────────────────────────────────────────────────
// useFocusTrap uses rAF to delay setting initial focus so the container is
// fully painted before focus().  Replace it with a synchronous call so tests
// can assert focus state immediately after render without timers.

beforeEach(() => {
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0);
    return 0;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── Helper components ─────────────────────────────────────────────────────────

/**
 * Minimal wrapper that applies useFocusTrap to a container div holding
 * `buttonCount` focusable buttons, plus one button outside the container.
 */
function TrapContainer({
  isOpen,
  onClose,
  buttonCount = 3,
}: {
  isOpen: boolean;
  onClose: () => void;
  buttonCount?: number;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useFocusTrap(ref, isOpen, onClose);

  return (
    <div>
      <button data-testid="outside-btn">Outside</button>
      {isOpen && (
        <div
          ref={(el) => { ref.current = el; }}
          role="dialog"
          aria-modal="true"
          data-testid="trap-root"
        >
          {Array.from({ length: buttonCount }, (_, i) => (
            <button key={i} data-testid={`trap-btn-${i}`}>
              Trap Button {i}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Container with no focusable children — tests the empty-trap edge-case. */
function EmptyTrapContainer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement | null>(null);
  useFocusTrap(ref, isOpen, onClose);

  if (!isOpen) return null;

  return (
    <div
      ref={(el) => { ref.current = el; }}
      role="dialog"
      aria-modal="true"
      data-testid="empty-trap"
    >
      <span>No focusable children</span>
    </div>
  );
}


// ─── Tests ─────────────────────────────────────────────────────────────────────

describe('useFocusTrap', () => {

  // ── Initial focus on open ────────────────────────────────────────────────────

  describe('initial focus on open', () => {
    it('moves focus to the first focusable element inside the container when isOpen=true', () => {
      render(<TrapContainer isOpen onClose={vi.fn()} />);

      expect(document.activeElement).toBe(screen.getByTestId('trap-btn-0'));
    });

    it('does not steal focus from outside when isOpen=false', () => {
      const { container } = render(<TrapContainer isOpen={false} onClose={vi.fn()} />);

      // The outside button should not have been automatically focused
      expect(document.activeElement).not.toBe(
        container.querySelector('[data-testid="trap-btn-0"]'),
      );
    });

    it('re-focuses the first element when the trap reopens after being closed', () => {
      const { rerender } = render(<TrapContainer isOpen={false} onClose={vi.fn()} />);

      rerender(<TrapContainer isOpen onClose={vi.fn()} />);

      expect(document.activeElement).toBe(screen.getByTestId('trap-btn-0'));
    });
  });

  // ── Tab key cycling ──────────────────────────────────────────────────────────

  describe('Tab key cycling (focus stays inside the container)', () => {
    it('wraps focus from the last element back to the first on forward Tab', () => {
      render(<TrapContainer isOpen onClose={vi.fn()} buttonCount={3} />);

      // Move focus explicitly to the last element
      screen.getByTestId('trap-btn-2').focus();
      expect(document.activeElement).toBe(screen.getByTestId('trap-btn-2'));

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);

      // Hook must have called preventDefault and moved focus to first
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(screen.getByTestId('trap-btn-0'));
    });

    it('wraps focus from the first element back to the last on Shift+Tab', () => {
      render(<TrapContainer isOpen onClose={vi.fn()} buttonCount={3} />);

      screen.getByTestId('trap-btn-0').focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(screen.getByTestId('trap-btn-2'));
    });

    it('does NOT call preventDefault when focus is on an intermediate element (Tab flows normally)', () => {
      render(<TrapContainer isOpen onClose={vi.fn()} buttonCount={3} />);

      // btn-1 is neither first nor last
      screen.getByTestId('trap-btn-1').focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });

    it('wraps focus to first when focus escapes the container boundary (Tab)', () => {
      render(<TrapContainer isOpen onClose={vi.fn()} />);

      // Manually move active element outside the trap (simulates an exotic focus escape)
      screen.getByTestId('outside-btn').focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);

      // Hook must recapture focus back to the first element inside
      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(screen.getByTestId('trap-btn-0'));
    });

    it('wraps focus to last when focus escapes the container boundary (Shift+Tab)', () => {
      render(<TrapContainer isOpen onClose={vi.fn()} buttonCount={3} />);

      screen.getByTestId('outside-btn').focus();

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(document.activeElement).toBe(screen.getByTestId('trap-btn-2'));
    });
  });

  // ── Escape key ───────────────────────────────────────────────────────────────

  describe('Escape key', () => {
    it('calls onClose when Escape is pressed while the trap is active', () => {
      const onClose = vi.fn();
      render(<TrapContainer isOpen onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape', bubbles: true });

      expect(onClose).toHaveBeenCalledOnce();
    });

    it('prevents default on the Escape event so the browser does not also close things', () => {
      const event = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });

      render(<TrapContainer isOpen onClose={vi.fn()} />);
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });

    it('does NOT call onClose when Escape is pressed and the trap is inactive (isOpen=false)', () => {
      const onClose = vi.fn();
      render(<TrapContainer isOpen={false} onClose={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape', bubbles: true });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ── Empty container ──────────────────────────────────────────────────────────

  describe('container with no focusable children', () => {
    it('prevents Tab when there are no focusable elements in the container', () => {
      render(<EmptyTrapContainer isOpen onClose={vi.fn()} />);

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });
  });

  // ── Cleanup and focus restoration ────────────────────────────────────────────

  describe('focus restoration on close', () => {
    it('returns focus to the element that was focused when the trap activated', () => {
      // Create and focus an element outside the trap BEFORE opening it
      const trigger = document.createElement('button');
      trigger.dataset.testid = 'external-trigger';
      document.body.appendChild(trigger);
      trigger.focus();

      expect(document.activeElement).toBe(trigger);

      const { rerender } = render(<TrapContainer isOpen={false} onClose={vi.fn()} />);

      // Open the trap — it captures the previously focused element (trigger)
      rerender(<TrapContainer isOpen onClose={vi.fn()} />);
      expect(document.activeElement).toBe(screen.getByTestId('trap-btn-0'));

      // Close the trap — focus must be restored to trigger
      rerender(<TrapContainer isOpen={false} onClose={vi.fn()} />);
      expect(document.activeElement).toBe(trigger);

      document.body.removeChild(trigger);
    });
  });

  // ── No side-effects when inactive ───────────────────────────────────────────

  describe('no side-effects when the trap is inactive', () => {
    it('does not intercept Tab when isOpen=false', () => {
      render(<TrapContainer isOpen={false} onClose={vi.fn()} />);

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });
  });
});
