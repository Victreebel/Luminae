import { describe, expect, it } from 'vitest';
import { getReplacementDealMotion } from '../pages/game-replacement-motion';

describe('Forge replacement deal motion', () => {
  it('starts centered on the Archive and finishes exactly in the mold', () => {
    const motion = getReplacementDealMotion(
      { left: 100, top: 20, width: 60, height: 200 },
      { left: 300, top: 500, width: 120, height: 180 },
      120,
    );

    expect(motion.deckRect).toEqual({ x: 70, y: 30, w: 120, h: 180 });
    expect(motion.slotRect).toEqual({ x: 300, y: 500, w: 120, h: 180 });
    expect(motion.animX).toEqual([0, 115, 230]);
    expect(motion.animY).toEqual([0, -40, 470]);
    expect(motion.deckRect.x + motion.animX[2]).toBe(motion.slotRect.x);
    expect(motion.deckRect.y + motion.animY[2]).toBe(motion.slotRect.y);
    expect(motion.faceScale).toBe(1);
  });

  it('keeps an upward arc and uses a safe card width fallback', () => {
    const motion = getReplacementDealMotion(
      { left: 0, top: 500, width: 100, height: 200 },
      { left: 200, top: 100, width: 112, height: 168 },
      0,
    );

    expect(motion.animY[1]).toBeLessThan(motion.animY[2]);
    expect(motion.animRotateY).toEqual([0, 90, 180]);
    expect(motion.animScale).toEqual([1, 1, 1]);
    expect(motion.faceScale).toBe(1);
  });
});
