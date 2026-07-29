export interface ReplacementMotionRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ReplacementDealMotion {
  deckRect: { x: number; y: number; w: number; h: number };
  slotRect: { x: number; y: number; w: number; h: number };
  animX: [number, number, number];
  animY: [number, number, number];
  animRotateY: [number, number, number];
  animScale: [number, number, number];
  faceScale: number;
}

export function getReplacementDealMotion(
  deckRect: ReplacementMotionRect,
  slotRect: ReplacementMotionRect,
  rawCardWidth: number,
): ReplacementDealMotion {
  const safeCardWidth = rawCardWidth > 0 ? rawCardWidth : 112;
  const faceScale = slotRect.width / safeCardWidth;
  const startX = deckRect.left + (deckRect.width - slotRect.width) / 2;
  const startY = deckRect.top + (deckRect.height - slotRect.height) / 2;
  const deltaX = slotRect.left - startX;
  const deltaY = slotRect.top - startY;
  const arcY = Math.min(deltaY - 60, -40);

  return {
    deckRect: { x: startX, y: startY, w: slotRect.width, h: slotRect.height },
    slotRect: {
      x: slotRect.left,
      y: slotRect.top,
      w: slotRect.width,
      h: slotRect.height,
    },
    animX: [0, deltaX * 0.5, deltaX],
    animY: [0, arcY, deltaY],
    animRotateY: [0, 90, 180],
    animScale: [1, 1, 1],
    faceScale,
  };
}
