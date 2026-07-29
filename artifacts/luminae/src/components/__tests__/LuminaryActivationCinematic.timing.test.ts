import { describe, it, expect } from 'vitest';
import {
  ENTITY_TIMES,
  ENTITY_FILTER_TIMES,
  REVEAL_MS,
  HOLD_MS,
  PAN_OUT_MS,
  BEAT_TARGET_MS,
  BEAT_SNAP_MS,
  BEAT_DONE_MS,
  BURN_RESOLUTION_MIN_MS,
  getVisibleProcedureSteps,
} from '@/components/LuminaryActivationCinematic';
import type { AnimationProcedureStep } from '@/lib/animationProcedure';

// ─── Tests ────────────────────────────────────────────────────────────────────
//
// Guards the hand-tuned ENTITY_TIMES overshoot/settle budget.
//
// Index layout:
//   [0] = 0.000  — start
//   [1] = 0.072  — fade-in mid
//   [2] = 0.135  — fade-in late
//   [3] = 0.180  — overshoot peak  (entity below center, spring about to pull back)
//   [4] = 0.224  — settle at rest  (entity at 0vh, must be ≥100ms before beat)
//   [5] = 1.000  — pan-out complete
//
// Invariants (per timing budget comments in source):
//   1. overshoot < settle             — spring-back direction is downward then up
//   2. settle ≤ 0.249                 — entity must arrive ≥100ms before BEAT_TARGET_MS
//   3. spring-back window ≥ 70ms      — snappy but readable on slow devices
//   4. settle_ms ≤ beat_ms − 100      — the 100ms guard before the first effect beat
//   5. ENTITY_FILTER_TIMES[3,4] mirror ENTITY_TIMES[3,4] — filter and motion must stay in sync

const ENTITY_DUR_MS = REVEAL_MS + HOLD_MS + PAN_OUT_MS;
const OVERSHOOT_IDX = 3;
const SETTLE_IDX    = 4;

describe('LuminaryActivationCinematic — ENTITY_TIMES timing invariants', () => {
  const tOvershoot = ENTITY_TIMES[OVERSHOOT_IDX];
  const tSettle    = ENTITY_TIMES[SETTLE_IDX];

  it('overshoot keyframe comes before settle keyframe', () => {
    expect(tOvershoot).toBeLessThan(tSettle);
  });

  it('settle keyframe is at or before t=0.249 (≥100ms guard before beat)', () => {
    expect(tSettle).toBeLessThanOrEqual(0.249);
  });

  it('spring-back window is at least 70ms', () => {
    const springBackMs = (tSettle - tOvershoot) * ENTITY_DUR_MS;
    expect(springBackMs).toBeGreaterThanOrEqual(70);
  });

  it('settle arrives ≥100ms before the first effect beat', () => {
    const beatMs    = REVEAL_MS + BEAT_TARGET_MS;
    const settleMs  = tSettle * ENTITY_DUR_MS;
    const bufferMs  = beatMs - settleMs;
    expect(bufferMs).toBeGreaterThanOrEqual(100);
  });

  it('ENTITY_FILTER_TIMES overshoot index matches ENTITY_TIMES (must stay in sync)', () => {
    expect(ENTITY_FILTER_TIMES[OVERSHOOT_IDX]).toBe(tOvershoot);
  });

  it('ENTITY_FILTER_TIMES settle index matches ENTITY_TIMES (must stay in sync)', () => {
    expect(ENTITY_FILTER_TIMES[SETTLE_IDX]).toBe(tSettle);
  });
});

// ─── Beat sequence timing invariants ─────────────────────────────────────────
//
// All beat offsets are measured from the start of the HOLD phase.
// They must fire in ascending order and all complete before HOLD_MS expires —
// otherwise the last beat is silently dropped when the cinematic advances to
// pan-out.
//
// Invariants:
//   1. TARGET < SNAP              — beats fire in sequence
//   2. SNAP   < DONE              — beats fire in sequence
//   3. TARGET < HOLD_MS           — target beat completes within hold window
//   4. SNAP   < HOLD_MS           — snap beat completes within hold window
//   5. DONE   < HOLD_MS           — done beat completes within hold window (critical guard)
//   6. SNAP − TARGET ≥ 80ms       — snap and target can't collapse into each other
//   7. DONE − SNAP   ≥ 80ms       — done and snap can't collapse into each other

const MIN_BEAT_GAP_MS = 80;

describe('LuminaryActivationCinematic — beat sequence timing invariants', () => {
  it('BEAT_TARGET_MS fires before BEAT_SNAP_MS', () => {
    expect(BEAT_TARGET_MS).toBeLessThan(BEAT_SNAP_MS);
  });

  it('BEAT_SNAP_MS fires before BEAT_DONE_MS', () => {
    expect(BEAT_SNAP_MS).toBeLessThan(BEAT_DONE_MS);
  });

  it('BEAT_TARGET_MS completes before HOLD_MS expires', () => {
    expect(BEAT_TARGET_MS).toBeLessThan(HOLD_MS);
  });

  it('BEAT_SNAP_MS completes before HOLD_MS expires', () => {
    expect(BEAT_SNAP_MS).toBeLessThan(HOLD_MS);
  });

  it('BEAT_DONE_MS completes before HOLD_MS expires (regression guard — silent drop)', () => {
    expect(BEAT_DONE_MS).toBeLessThan(HOLD_MS);
  });

  it(`BEAT_SNAP_MS is at least ${MIN_BEAT_GAP_MS}ms after BEAT_TARGET_MS (snap and target can't collapse)`, () => {
    expect(BEAT_SNAP_MS - BEAT_TARGET_MS).toBeGreaterThanOrEqual(MIN_BEAT_GAP_MS);
  });

  it(`BEAT_DONE_MS is at least ${MIN_BEAT_GAP_MS}ms after BEAT_SNAP_MS (done and snap can't collapse)`, () => {
    expect(BEAT_DONE_MS - BEAT_SNAP_MS).toBeGreaterThanOrEqual(MIN_BEAT_GAP_MS);
  });
});

describe('LuminaryActivationCinematic — readable procedure timeline', () => {
  it('turns a multi-card Burn into an explicit target, action, and result sequence', () => {
    const procedure: AnimationProcedureStep[] = [
      { type: 'luminaryPulse', luminaryId: 'lum_moth' },
      { type: 'targetClaim', targetIds: ['a', 'b', 'c'], keyword: 'burn' },
      {
        type: 'keywordEvents',
        events: [{ keyword: 'burn', targetIds: ['a', 'b', 'c'] }],
      },
      { type: 'forgeRefill', slotIds: [] },
    ];

    expect(getVisibleProcedureSteps(procedure).map(step => step.label)).toEqual([
      'TARGET 3',
      'BURN 3',
      'REFILL FORGE',
    ]);
  });

  it('holds Burn resolution through the Forge replacement animation', () => {
    const REFILL_START_MS = 1520;
    const REFILL_ANIMATION_MS = 700;
    expect(BURN_RESOLUTION_MIN_MS).toBeGreaterThanOrEqual(
      REFILL_START_MS + REFILL_ANIMATION_MS,
    );
  });
});
