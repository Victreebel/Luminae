import { useLayoutEffect, useState, type RefObject } from 'react';

/** Fit the complete scene above the game's persistent Well, without cropping the world. */
export function useCivilizationViewportFit(
  rootRef: RefObject<HTMLElement | null>,
  enabled: boolean,
  compact: boolean,
): number | undefined {
  const [maximumWidth, setMaximumWidth] = useState<number>();

  useLayoutEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    const viewport = root?.closest<HTMLElement>('[data-game-board]');
    const canvas = root?.querySelector<HTMLElement>('.civilization-scene-canvas');
    const header = root?.querySelector<HTMLElement>('.civilization-scene-header');
    if (!viewport || !canvas) return;

    const measure = () => {
      if (viewport.clientHeight <= 0 || viewport.clientWidth <= 0) return;
      // Scroll position must not change the size of the city. Measure its origin
      // in the scroll content, so opening Scan or inspecting a record cannot zoom it.
      const contentTop = canvas.getBoundingClientRect().top
        - viewport.getBoundingClientRect().top + viewport.scrollTop;
      const availableHeight = Math.max(120, viewport.clientHeight - contentTop - 16);
      const width = availableHeight * (compact ? 4 / 5 : 16 / 9);
      setMaximumWidth(previous => previous !== undefined && Math.abs(previous - width) < 0.5
        ? previous
        : width);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(viewport);
    if (header) observer?.observe(header);
    window.addEventListener('resize', measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [compact, enabled, rootRef]);

  return enabled ? maximumWidth : undefined;
}
