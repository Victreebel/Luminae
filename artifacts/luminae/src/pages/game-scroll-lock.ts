import { useEffect, useRef, type RefObject } from 'react';

export function useScrollLock(
  overlays: readonly boolean[],
  mainScrollRef: RefObject<HTMLElement | null>,
) {
  const lockedScrollYRef = useRef(0);
  const isAnyOpen = overlays.some(Boolean);

  useEffect(() => {
    if (!isAnyOpen) return;

    lockedScrollYRef.current = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${lockedScrollYRef.current}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = '';
      window.scrollTo({ top: lockedScrollYRef.current, behavior: 'auto' });

      const main = mainScrollRef.current;
      if (main) {
        requestAnimationFrame(() => {
          const active = document.activeElement;
          if (!active || active === document.body || active === main) {
            main.focus({ preventScroll: true });
          }
        });
      }
    };
  }, [isAnyOpen, mainScrollRef]);
}
