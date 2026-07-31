import { useEffect, type RefObject } from 'react';

const SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'End',
  'Home',
  'PageDown',
  'PageUp',
  ' ',
]);

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return !!target.closest(
    'button, a, input, textarea, select, [contenteditable="true"], [role="button"], [role="menuitem"]',
  );
}

interface CameraInputLeaseOptions {
  active: boolean;
  boardRef: RefObject<HTMLElement | null>;
  passthroughRef?: RefObject<HTMLElement | null>;
}

/**
 * Gives a cinematic camera exclusive ownership of manual scroll inputs while
 * still allowing the orchestrator's programmatic scrollTo/scrollBy calls.
 */
export function useCameraInputLease({
  active,
  boardRef,
  passthroughRef,
}: CameraInputLeaseOptions) {
  useEffect(() => {
    if (!active) return;

    const surfaces = new Set(
      [boardRef.current, passthroughRef?.current].filter(
        (surface): surface is HTMLElement => surface !== null && surface !== undefined,
      ),
    );
    const preventScroll = (event: Event) => event.preventDefault();
    const preventMiddleMouse = (event: MouseEvent) => {
      if (event.button === 1) event.preventDefault();
    };
    const preventScrollKey = (event: KeyboardEvent) => {
      if (!SCROLL_KEYS.has(event.key) || isInteractiveTarget(event.target)) return;
      event.preventDefault();
    };

    surfaces.forEach((surface) => {
      surface.addEventListener('wheel', preventScroll, { passive: false });
      surface.addEventListener('touchmove', preventScroll, { passive: false });
      surface.addEventListener('mousedown', preventMiddleMouse);
    });
    window.addEventListener('keydown', preventScrollKey, true);

    return () => {
      surfaces.forEach((surface) => {
        surface.removeEventListener('wheel', preventScroll);
        surface.removeEventListener('touchmove', preventScroll);
        surface.removeEventListener('mousedown', preventMiddleMouse);
      });
      window.removeEventListener('keydown', preventScrollKey, true);
    };
  }, [active, boardRef, passthroughRef]);
}
