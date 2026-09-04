import { useEffect, useState } from 'react';
import type { BoardDensityMode, BoardLayoutMode } from './game-types';

export type BoardViewportClass = 'phone-portrait' | 'phone-landscape' | 'tablet' | 'desktop';

export interface BoardLayoutPolicy {
  layout: BoardLayoutMode;
  density: BoardDensityMode;
  viewportClass: BoardViewportClass;
  sideAffinityWell: boolean;
  forceCompactForge: boolean;
}

const CIVILIZATION_PREVIEW_MIN_WIDTH = 1600;
const CIVILIZATION_PREVIEW_MIN_HEIGHT = 900;

function createPolicy(
  viewportClass: BoardViewportClass,
  density: BoardDensityMode,
  layout: BoardLayoutMode = 'base',
  options: { sideAffinityWell?: boolean; forceCompactForge?: boolean } = {},
): BoardLayoutPolicy {
  return {
    layout,
    density,
    viewportClass,
    sideAffinityWell: options.sideAffinityWell ?? false,
    forceCompactForge: options.forceCompactForge ?? false,
  };
}

export function getBoardLayoutPolicyForViewport(width: number, height: number): BoardLayoutPolicy {
  const safeWidth = Math.max(0, width);
  const safeHeight = Math.max(0, height);

  const landscape = safeWidth > safeHeight;
  const phonePortrait = !landscape && safeWidth <= 600;
  const phoneLandscape = landscape && (safeWidth <= 940 || safeHeight <= 600);
  const desktopLandscape = landscape && safeWidth >= 1200 && safeHeight >= 720;

  if (phonePortrait) {
    return createPolicy('phone-portrait', 'stacked');
  }

  if (phoneLandscape) {
    const density: BoardDensityMode =
      safeHeight <= 520
        ? 'cockpit'
        : safeWidth >= 940 && safeHeight >= 540
          ? 'efficient'
          : 'stacked';
    return createPolicy('phone-landscape', density, 'base', {
      sideAffinityWell: true,
    });
  }

  if (desktopLandscape) {
    const density: BoardDensityMode =
      safeWidth >= 1800 && safeHeight >= 960 ? 'showcase' :
      safeWidth >= 1500 && safeHeight >= 820 ? 'comfortable' :
      'efficient';
    const layout: BoardLayoutMode =
      safeWidth >= CIVILIZATION_PREVIEW_MIN_WIDTH &&
      safeHeight >= CIVILIZATION_PREVIEW_MIN_HEIGHT
        ? 'left-civ'
        : 'base';

    return createPolicy('desktop', density, layout, { sideAffinityWell: true });
  }

  if (landscape) {
    return createPolicy('tablet', 'efficient', 'base', { sideAffinityWell: true });
  }

  return createPolicy('tablet', 'stacked');
}

export function getBoardLayoutPolicy(): BoardLayoutPolicy {
  if (typeof window === 'undefined') {
    return createPolicy('phone-portrait', 'stacked');
  }

  return getBoardLayoutPolicyForViewport(window.innerWidth, window.innerHeight);
}

export function useBoardLayoutPolicy(): BoardLayoutPolicy {
  const [boardLayoutPolicy, setBoardLayoutPolicy] = useState<BoardLayoutPolicy>(() => getBoardLayoutPolicy());

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setBoardLayoutPolicy(getBoardLayoutPolicy());
      });
    };

    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return boardLayoutPolicy;
}

export function getBoardLayoutMode(): BoardLayoutMode {
  return getBoardLayoutPolicy().layout;
}

export function useBoardLayoutMode(): BoardLayoutMode {
  return useBoardLayoutPolicy().layout;
}

export function useLandscapeCockpit(): boolean {
  return useBoardLayoutPolicy().forceCompactForge;
}

export function useSideAffinityWellLayout(): boolean {
  return useBoardLayoutPolicy().sideAffinityWell;
}
