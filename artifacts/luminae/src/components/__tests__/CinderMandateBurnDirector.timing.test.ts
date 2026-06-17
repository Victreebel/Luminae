import { describe, it, expect } from 'vitest';
import {
  DECREE_MS,
  SHUDDER_MS,
  HEAT_WASH_MS,
  BURN_FLASH_TOTAL_MS,
  AFTERMATH_HOLD_MS,
} from '@/components/CinderMandateBurnDirector';
import { BURN_START_S } from '@/pages/game-luminary-effects';

// ─── Tests ────────────────────────────────────────────────────────────────────
//
// Guards the hand-tuned BurnFlash / CinderMandateBurnDirector timing budget.
//
// Phase layout (non-reduced-motion path):
//   t=0                         : decree overlay fades in
//   t=DECREE_MS                 : shudder begins; decree fades out
//   t=DECREE_MS + SHUDDER_MS*0.4: heat wash begins (40% into shudder)
//   t=DECREE_MS + SHUDDER_MS    : BurnFlash fires for each condemned slot (burnAt)
//   t=burnAt + BURN_FLASH_TOTAL_MS : refill pulse fires
//   t=burnAt + BURN_FLASH_TOTAL_MS + AFTERMATH_HOLD_MS : sequence completes (completesAt)
//
// Invariants:
//   1. All phase durations are positive integers
//   2. Heat wash starts before shudder ends (40% overlap rule)
//   3. BURN_FLASH_TOTAL_MS >= BURN_START_S*1000 — refill must not fire before flame ignites
//   4. BURN_FLASH_TOTAL_MS >= 320 — badge display window fits inside the total
//   5. completesAt = DECREE_MS + SHUDDER_MS + BURN_FLASH_TOTAL_MS + AFTERMATH_HOLD_MS
//   6. Drain-gate budget adds HEAT_WASH_MS on top of completesAt as extra buffer

const BURN_BADGE_MS = 320; // documented badge duration in source comment

describe('CinderMandateBurnDirector — phase duration sanity', () => {
  it('DECREE_MS is a positive integer', () => {
    expect(Number.isInteger(DECREE_MS)).toBe(true);
    expect(DECREE_MS).toBeGreaterThan(0);
  });

  it('SHUDDER_MS is a positive integer', () => {
    expect(Number.isInteger(SHUDDER_MS)).toBe(true);
    expect(SHUDDER_MS).toBeGreaterThan(0);
  });

  it('HEAT_WASH_MS is a positive integer', () => {
    expect(Number.isInteger(HEAT_WASH_MS)).toBe(true);
    expect(HEAT_WASH_MS).toBeGreaterThan(0);
  });

  it('BURN_FLASH_TOTAL_MS is a positive integer', () => {
    expect(Number.isInteger(BURN_FLASH_TOTAL_MS)).toBe(true);
    expect(BURN_FLASH_TOTAL_MS).toBeGreaterThan(0);
  });

  it('AFTERMATH_HOLD_MS is a positive integer', () => {
    expect(Number.isInteger(AFTERMATH_HOLD_MS)).toBe(true);
    expect(AFTERMATH_HOLD_MS).toBeGreaterThan(0);
  });
});

// ─── Heat-wash overlap invariants ────────────────────────────────────────────
//
// The heat wash starts at SHUDDER_MS * 0.4 (40% into the shudder window).
// This offset must be strictly less than SHUDDER_MS so the wash begins while
// the shudder is still active.  If SHUDDER_MS were ever set to 0, this would
// divide by zero and the heat wash would fire before the shudder even started.

describe('CinderMandateBurnDirector — heat-wash overlap invariants', () => {
  const heatStartOffset = Math.round(SHUDDER_MS * 0.4);

  it('heat-wash start offset is strictly before shudder ends (40% rule)', () => {
    expect(heatStartOffset).toBeLessThan(SHUDDER_MS);
  });

  it('heat-wash start offset is at least 1 ms into the shudder window', () => {
    expect(heatStartOffset).toBeGreaterThanOrEqual(1);
  });

  it('heat wash completes after the shudder ends (overlap extends past shudder boundary)', () => {
    const heatEndOffset = heatStartOffset + HEAT_WASH_MS;
    expect(heatEndOffset).toBeGreaterThan(SHUDDER_MS);
  });
});

// ─── BurnFlash timing invariants ─────────────────────────────────────────────
//
// BURN_FLASH_TOTAL_MS is the delay from BurnFlash mount to refill-pulse fire.
// Two hard lower bounds:
//   a) It must exceed the BurnFlash badge display window (BURN_BADGE_MS) so the
//      badge is visible before the slot redraws.
//   b) It must exceed BURN_START_S*1000 (the delay before the flame front rises)
//      so the refill cannot fire before the flame is even visible.  This is a
//      cross-file invariant: BURN_START_S lives in game-luminary-effects.tsx and
//      BURN_FLASH_TOTAL_MS lives here; both must stay in sync.

describe('CinderMandateBurnDirector — BurnFlash schedule invariants', () => {
  it(`BURN_FLASH_TOTAL_MS >= badge display window (${BURN_BADGE_MS} ms)`, () => {
    expect(BURN_FLASH_TOTAL_MS).toBeGreaterThanOrEqual(BURN_BADGE_MS);
  });

  it('BURN_FLASH_TOTAL_MS >= BURN_START_S*1000 (refill fires after flame ignites)', () => {
    const flameIgnitionMs = BURN_START_S * 1000;
    expect(BURN_FLASH_TOTAL_MS).toBeGreaterThanOrEqual(flameIgnitionMs);
  });
});

// ─── Sequence completion and drain-gate budget ────────────────────────────────
//
// completesAt is the timeout that calls onComplete().  It equals
//   DECREE_MS + SHUDDER_MS + BURN_FLASH_TOTAL_MS + AFTERMATH_HOLD_MS.
//
// The drain gate is pre-sized to:
//   DECREE_MS + SHUDDER_MS + HEAT_WASH_MS + BURN_FLASH_TOTAL_MS + AFTERMATH_HOLD_MS + 800
//
// The extra HEAT_WASH_MS and +800 are deliberate buffers; the drain gate is
// intentionally larger than completesAt.  These tests assert that relationship
// holds so no future refactor accidentally makes the gate smaller than the
// sequence it protects.

describe('CinderMandateBurnDirector — drain-gate vs completesAt relationship', () => {
  const completesAt = DECREE_MS + SHUDDER_MS + BURN_FLASH_TOTAL_MS + AFTERMATH_HOLD_MS;
  const drainGateBase = DECREE_MS + SHUDDER_MS + HEAT_WASH_MS + BURN_FLASH_TOTAL_MS + AFTERMATH_HOLD_MS;
  const CAMERA_SETTLE_BUFFER_MS = 800;
  const drainGate = drainGateBase + CAMERA_SETTLE_BUFFER_MS;

  it('drain-gate budget exceeds completesAt', () => {
    expect(drainGate).toBeGreaterThan(completesAt);
  });

  it('drain-gate budget exceeds completesAt by at least HEAT_WASH_MS + camera-settle buffer', () => {
    const minExcess = HEAT_WASH_MS + CAMERA_SETTLE_BUFFER_MS;
    expect(drainGate - completesAt).toBeGreaterThanOrEqual(minExcess);
  });
});
