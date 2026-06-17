import { describe, it, expect } from 'vitest';
import {
  TOTAL_S,
  COMPLETE_DELAY_S,
  BLACK_CAP_SNAP_T,
} from '@/components/tutorial/ThresholdCinematic';

// ─── ThresholdCinematic timing invariants ────────────────────────────────────
//
// ThresholdCinematic runs a portal-zoom animation before handing control to
// the tutorial. Three constants govern the sequence:
//
//   TOTAL_S          — framer-motion animation duration (seconds).
//                      Every transition in the component uses this as its
//                      `duration` value, so all layers finish at this time.
//
//   COMPLETE_DELAY_S — how long after mount until onComplete fires (seconds).
//                      Must be ≥ TOTAL_S so the final black-cap layer is
//                      fully opaque before the component unmounts.
//
//   BLACK_CAP_SNAP_T — normalized time [0, 1] at which the final black-cap
//                      layer snaps to full opacity. Must be late enough that
//                      the portal zoom is visible (≥0.85), but strictly before
//                      the last frame (< 1.0) so the cut to black is not
//                      deferred to exactly t=1.
//
// Invariants:
//   1. COMPLETE_DELAY_S ≥ TOTAL_S        — callback fires after animation ends
//   2. COMPLETE_DELAY_S − TOTAL_S ≤ 0.5s — handoff buffer is tight (not stale)
//   3. TOTAL_S ≥ 1.0s                    — animation is long enough to be visible
//   4. COMPLETE_DELAY_S ≤ 6.0s           — cinematic doesn't stall game entry
//   5. BLACK_CAP_SNAP_T ≥ 0.85           — snap fires late in the animation
//   6. BLACK_CAP_SNAP_T < 1.0            — snap fires before the last frame

const TOTAL_MS          = TOTAL_S          * 1000;
const COMPLETE_DELAY_MS = COMPLETE_DELAY_S * 1000;

describe('ThresholdCinematic — animation / callback timing invariants', () => {
  it('onComplete fires after the animation ends (COMPLETE_DELAY_S ≥ TOTAL_S)', () => {
    expect(COMPLETE_DELAY_S).toBeGreaterThanOrEqual(TOTAL_S);
  });

  it('handoff buffer is ≤ 500ms (COMPLETE_DELAY_S − TOTAL_S tight, not stale)', () => {
    const bufferMs = COMPLETE_DELAY_MS - TOTAL_MS;
    expect(bufferMs).toBeLessThanOrEqual(500);
  });

  it('animation duration is at least 1 000ms (visible to the player)', () => {
    expect(TOTAL_MS).toBeGreaterThanOrEqual(1000);
  });

  it('cinematic completes within 6 000ms (does not stall game entry)', () => {
    expect(COMPLETE_DELAY_MS).toBeLessThanOrEqual(6000);
  });

  it('final black-cap snap fraction is ≥ 0.85 (snaps late in the animation)', () => {
    expect(BLACK_CAP_SNAP_T).toBeGreaterThanOrEqual(0.85);
  });

  it('final black-cap snap fraction is < 1.0 (snap fires before the last frame)', () => {
    expect(BLACK_CAP_SNAP_T).toBeLessThan(1.0);
  });
});
