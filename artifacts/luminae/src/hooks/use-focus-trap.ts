import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

export interface FocusTrapOptions {
  /**
   * Whether pressing Escape should call `onClose`.
   * Default: true.
   *
   * Pass `false` when a higher-level handler (e.g. `useEscapeToClose`) owns
   * Escape for this sheet so that a single keypress never closes two dialogs.
   */
  handleEscape?: boolean;
}

/**
 * Traps keyboard focus within `containerRef` while `isOpen` is true.
 *
 * Behaviours:
 * - Tab / Shift+Tab cycle only through focusable descendants of the container.
 * - Escape calls `onClose` (unless `options.handleEscape` is `false`).
 * - On open, focuses the first focusable element inside the container.
 * - On close, returns focus to whatever element was focused when the trap activated.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  isOpen: boolean,
  onClose: () => void,
  options: FocusTrapOptions = {},
): void {
  const { handleEscape = true } = options;
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const getFocusables = (): HTMLElement[] =>
      Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      ).filter(
        (el) =>
          !el.hasAttribute('disabled') &&
          !el.closest('[inert]') &&
          el.tabIndex !== -1,
      );

    requestAnimationFrame(() => {
      const els = getFocusables();
      if (els.length > 0) els[0].focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (handleEscape) {
          e.preventDefault();
          e.stopPropagation();
          onCloseRef.current();
        }
        return;
      }

      if (e.key === 'Tab') {
        const els = getFocusables();
        if (els.length === 0) {
          e.preventDefault();
          return;
        }

        const first = els[0];
        const last = els[els.length - 1];
        const active = document.activeElement;

        if (e.shiftKey) {
          if (active === first || !container.contains(active)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (active === last || !container.contains(active)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [isOpen, containerRef, handleEscape]);
}
