export interface TutorialGuidePoint {
  x: number;
  y: number;
}

export interface TutorialGuideRect {
  left: number;
  top: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

interface TutorialCameraFrameInput {
  currentScrollTop: number;
  scrollHeight: number;
  clientHeight: number;
  containerTop: number;
  target: TutorialGuideRect;
  focusRatio?: number;
  padding?: number;
}

interface TutorialGuidePositionInput {
  target: TutorialGuideRect;
  viewportWidth: number;
  safeTop: number;
  safeBottom: number;
  avoid?: TutorialGuideRect | null;
  guideRadius?: number;
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export function calculateTutorialCameraScrollTop({
  currentScrollTop,
  scrollHeight,
  clientHeight,
  containerTop,
  target,
  focusRatio = 0.5,
  padding = 10,
}: TutorialCameraFrameInput): number {
  const maxScroll = Math.max(0, scrollHeight - clientHeight);
  if (maxScroll === 0) return 0;

  const targetTopInContent = currentScrollTop + target.top - containerTop;
  const usableHeight = Math.max(1, clientHeight - padding * 2);
  const desired = target.height >= usableHeight
    ? targetTopInContent - padding
    : targetTopInContent + target.height / 2 - clientHeight * focusRatio;

  return clamp(desired, 0, maxScroll);
}

function pointFits(
  point: TutorialGuidePoint,
  radius: number,
  viewportWidth: number,
  safeTop: number,
  safeBottom: number,
  avoid?: TutorialGuideRect | null,
): boolean {
  if (
    point.x - radius < 8 ||
    point.x + radius > viewportWidth - 8 ||
    point.y - radius < safeTop ||
    point.y + radius > safeBottom
  ) {
    return false;
  }
  if (!avoid) return true;
  const clearance = radius + 8;
  return !(
    point.x > avoid.left - clearance &&
    point.x < avoid.right + clearance &&
    point.y > avoid.top - clearance &&
    point.y < avoid.bottom + clearance
  );
}

export function calculateTutorialGuidePosition({
  target,
  viewportWidth,
  safeTop,
  safeBottom,
  avoid,
  guideRadius = 26,
}: TutorialGuidePositionInput): TutorialGuidePoint {
  const centerX = target.left + target.width / 2;
  const centerY = target.top + target.height / 2;
  const gap = guideRadius + 22;
  const targetIsWide = target.width >= viewportWidth * 0.58;
  const horizontal = centerX < viewportWidth / 2
    ? [
        { x: target.right + gap, y: centerY },
        { x: target.left - gap, y: centerY },
      ]
    : [
        { x: target.left - gap, y: centerY },
        { x: target.right + gap, y: centerY },
      ];
  const vertical = [
    { x: centerX, y: target.top - gap },
    { x: centerX, y: target.bottom + gap },
  ];
  const candidates = targetIsWide ? [...vertical, ...horizontal] : [...horizontal, ...vertical];
  const fitting = candidates.find((candidate) =>
    pointFits(candidate, guideRadius, viewportWidth, safeTop, safeBottom, avoid)
  );
  if (fitting) return fitting;

  const fallback = candidates[0] ?? { x: centerX, y: centerY };
  return {
    x: clamp(fallback.x, guideRadius + 8, viewportWidth - guideRadius - 8),
    y: clamp(fallback.y, safeTop + guideRadius, safeBottom - guideRadius),
  };
}

export function calculateTutorialTetherEndpoint(
  guide: TutorialGuidePoint,
  target: TutorialGuideRect,
): TutorialGuidePoint {
  const insideX = guide.x >= target.left && guide.x <= target.right;
  const insideY = guide.y >= target.top && guide.y <= target.bottom;

  if (!insideX || !insideY) {
    return {
      x: clamp(guide.x, target.left, target.right),
      y: clamp(guide.y, target.top, target.bottom),
    };
  }

  const edges = [
    { distance: guide.x - target.left, point: { x: target.left, y: guide.y } },
    { distance: target.right - guide.x, point: { x: target.right, y: guide.y } },
    { distance: guide.y - target.top, point: { x: guide.x, y: target.top } },
    { distance: target.bottom - guide.y, point: { x: guide.x, y: target.bottom } },
  ];
  edges.sort((a, b) => a.distance - b.distance);
  return edges[0]!.point;
}

export function tutorialCostRegion(target: TutorialGuideRect): TutorialGuideRect {
  const top = target.top + target.height * 0.66;
  const height = Math.max(18, target.bottom - top - 4);
  return {
    left: target.left + 4,
    top,
    width: Math.max(1, target.width - 8),
    height,
    right: target.right - 4,
    bottom: top + height,
  };
}
