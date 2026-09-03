import { describe, expect, it } from 'vitest';
import { buildPaleMerchantOrbitSlots } from '@/lib/paleMerchantOrbit';
import { buildPaleMerchantReturnSchedule } from '../PaleMerchantReturnDirector';

describe('PaleMerchantReturnDirector schedule', () => {
  it('gathers every payment before releasing Affinity groups to the Well', () => {
    const schedule = buildPaleMerchantReturnSchedule([
      { playerId: 'p1', playerName: 'Aster', affinity: 'flare', amount: 2 },
      { playerId: 'p1', playerName: 'Aster', affinity: 'singularity', amount: 2 },
      { playerId: 'p2', playerName: 'Nox', affinity: 'verdance', amount: 2 },
    ], {
      pullLeadMs: 450,
      playerStaggerMs: 190,
      affinityStaggerMs: 110,
      gatherFlightMs: 900,
      orbitHoldMs: 1_050,
      releaseStaggerMs: 130,
      returnFlightMs: 920,
      landingHoldMs: 460,
    });

    expect(schedule.groups).toHaveLength(2);
    expect(schedule.groups[0]).toMatchObject({
      playerId: 'p1',
      highlightStartMs: 0,
      gatherStartMs: 450,
      gatherEndMs: 1_460,
    });
    expect(schedule.gatherDelayByKey).toMatchObject({
      'p1:flare': 450,
      'p1:singularity': 560,
      'p2:verdance': 640,
    });
    expect(schedule.allGatheredAtMs).toBe(1_540);
    expect(schedule.releaseStartMs).toBe(2_590);
    expect(schedule.releaseDelayByKey).toMatchObject({
      'p1:flare': 2_590,
      'p1:singularity': 2_720,
      'p2:verdance': 2_850,
    });
    expect(schedule.totalDurationMs).toBe(4_230);
  });

  it.each([
    { total: 6, tokenSize: 40, baseRadius: 50 },
    { total: 10, tokenSize: 40, baseRadius: 50 },
    { total: 18, tokenSize: 28, baseRadius: 50 },
    { total: 20, tokenSize: 28, baseRadius: 82 },
  ])('keeps $total orbiting tokens separated', ({ total, tokenSize, baseRadius }) => {
    const slots = buildPaleMerchantOrbitSlots(total, tokenSize, baseRadius);
    expect(slots).toHaveLength(total);

    for (let firstIndex = 0; firstIndex < slots.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < slots.length; secondIndex += 1) {
        const first = slots[firstIndex]!;
        const second = slots[secondIndex]!;
        const firstPoint = {
          x: Math.cos(first.angle) * first.radius,
          y: Math.sin(first.angle) * first.radius,
        };
        const secondPoint = {
          x: Math.cos(second.angle) * second.radius,
          y: Math.sin(second.angle) * second.radius,
        };
        const distance = Math.hypot(
          secondPoint.x - firstPoint.x,
          secondPoint.y - firstPoint.y,
        );
        expect(distance).toBeGreaterThanOrEqual(tokenSize + 7.9);
      }
    }
  });
});
