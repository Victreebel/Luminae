import { useEffect, useRef } from 'react';

export type EscapeTarget = {
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Registers a single document-level capture-phase keydown listener that closes
 * the most-recently-opened sheet/overlay when Escape is pressed.
 *
 * Pass `targets` in a stable order (e.g. declaration order in the component).
 * Internally the hook tracks when each target transitions to `isOpen: true` and
 * closes the one that most recently became open — so the order of the array does
 * not need to match open order.
 *
 * The listener is suppressed when:
 *   - A modifier key (Ctrl, Alt, Meta) is held
 *   - No target is open
 *
 * Using capture phase ensures this fires before bubble-phase handlers and before
 * inner elements can swallow the event.
 *
 * IMPORTANT: Pair with `useFocusTrap(..., { handleEscape: false })` for any
 * container also managed by a focus trap so that a single Escape keypress never
 * closes more than one sheet.
 */
export function useEscapeToClose(targets: EscapeTarget[]): void {
  const targetsRef = useRef(targets);
  useEffect(() => {
    targetsRef.current = targets;
  });

  // openTimestamps[i] is the performance.now() value when targets[i] last
  // transitioned from closed → open. Never reset to 0 on close so that the
  // most-recently-opened entry is still identifiable even after it closes.
  const openTimestamps = useRef<number[]>([]);

  // Track open→open transitions: when isOpen goes from false to true, record now.
  const prevIsOpen = useRef<boolean[]>([]);

  useEffect(() => {
    const current = targetsRef.current;

    // Grow the arrays to match the (stable) targets length if needed.
    while (openTimestamps.current.length < current.length) {
      openTimestamps.current.push(0);
    }
    while (prevIsOpen.current.length < current.length) {
      prevIsOpen.current.push(false);
    }

    current.forEach((t, i) => {
      if (t.isOpen && !prevIsOpen.current[i]) {
        openTimestamps.current[i] = performance.now();
      }
      prevIsOpen.current[i] = t.isOpen;
    });
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (e.ctrlKey || e.altKey || e.metaKey) return;

      const current = targetsRef.current;
      const ts = openTimestamps.current;

      // Find the open target that became open most recently.
      let bestIdx = -1;
      let bestTs = -1;
      for (let i = 0; i < current.length; i++) {
        if (current[i].isOpen && ts[i] > bestTs) {
          bestTs = ts[i];
          bestIdx = i;
        }
      }

      if (bestIdx === -1) return;

      e.preventDefault();
      e.stopPropagation();
      current[bestIdx].onClose();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);
}
