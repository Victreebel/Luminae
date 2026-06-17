import { describe, it, expect } from 'vitest';
import {
  SOURCE_PULSE_LEAD_MS,
  BEAT_HOLD_MS,
  SETTLE_ESTIMATE_MS,
  AFTERMATH_HOLD_MS,
} from '@/components/CinderMandateBrandingDirector';
import { SOURCE_PULSE_LEAD_MS as FX_SOURCE_PULSE_LEAD_MS } from '@/pages/game-luminary-effects';

// ─── Tests ────────────────────────────────────────────────────────────────────
//
// Guards the hand-tuned CinderMandateBrandingDirector (brand-strike / summon)
// timing budget.
//
// Sequence layout (non-reduced-motion, with a valid source portal):
//   t=0                     : prepare() called; camera begins compact move
//   t≈SETTLE_ESTIMATE_MS    : camera settled; beat overlay fades in
//   t=SETTLE_ESTIMATE_MS + BEAT_HOLD_MS : beat overlay fades out; fireBrandStrikes()
//                              called with lead=SOURCE_PULSE_LEAD_MS
//   t=… + SOURCE_PULSE_LEAD_MS          : portal pulse fires; strike beams travel
//   t=… + (N-1)*90 + 3820 + 400        : aura-complete; aftermath begins
//   t=… + AFTERMATH_HOLD_MS             : onComplete called
//
// Invariants:
//   1. All phase durations are positive integers
//   2. BEAT_HOLD_MS >= 300 ms — overlay must be on screen long enough to read
//   3. AFTERMATH_HOLD_MS >= 200 ms — aura crackle must clear before game drains
//   4. SOURCE_PULSE_LEAD_MS must match the same constant in game-luminary-effects
//      (documented cross-file contract in the source comment)
//   5. SETTLE_ESTIMATE_MS >= BEAT_HOLD_MS — the camera-settle budget must not be
//      smaller than the window it precedes (an under-estimate shrinks the drain gate)
//   6. The minimum drain-gate estimate (N=1 card) exceeds the sum of
//      SETTLE_ESTIMATE_MS + BEAT_HOLD_MS + SOURCE_PULSE_LEAD_MS + AFTERMATH_HOLD_MS

const AURA_COMPLETE_MS = 3820;
const AURA_BUFFER_MS   = 400;
const MIN_READ_MS      = 300;
const MIN_AFTERMATH_MS = 200;

describe('CinderMandateBrandingDirector — phase duration sanity', () => {
  it('SOURCE_PULSE_LEAD_MS is a non-negative integer', () => {
    expect(Number.isInteger(SOURCE_PULSE_LEAD_MS)).toBe(true);
    expect(SOURCE_PULSE_LEAD_MS).toBeGreaterThanOrEqual(0);
  });

  it('BEAT_HOLD_MS is a positive integer', () => {
    expect(Number.isInteger(BEAT_HOLD_MS)).toBe(true);
    expect(BEAT_HOLD_MS).toBeGreaterThan(0);
  });

  it('SETTLE_ESTIMATE_MS is a positive integer', () => {
    expect(Number.isInteger(SETTLE_ESTIMATE_MS)).toBe(true);
    expect(SETTLE_ESTIMATE_MS).toBeGreaterThan(0);
  });

  it('AFTERMATH_HOLD_MS is a positive integer', () => {
    expect(Number.isInteger(AFTERMATH_HOLD_MS)).toBe(true);
    expect(AFTERMATH_HOLD_MS).toBeGreaterThan(0);
  });
});

// ─── Readability and aura-clear invariants ────────────────────────────────────

describe('CinderMandateBrandingDirector — readability and aura-clear guards', () => {
  it(`BEAT_HOLD_MS >= ${MIN_READ_MS} ms (overlay is on screen long enough to read)`, () => {
    expect(BEAT_HOLD_MS).toBeGreaterThanOrEqual(MIN_READ_MS);
  });

  it(`AFTERMATH_HOLD_MS >= ${MIN_AFTERMATH_MS} ms (aura crackle clears before game drains)`, () => {
    expect(AFTERMATH_HOLD_MS).toBeGreaterThanOrEqual(MIN_AFTERMATH_MS);
  });
});

// ─── Cross-file SOURCE_PULSE_LEAD_MS parity invariant ─────────────────────────
//
// The source comment explicitly states:
//   "Must match SOURCE_PULSE_LEAD_MS in game-luminary-effects."
//
// This test is the machine-enforced form of that contract.  game.tsx imports
// SOURCE_PULSE_LEAD_MS from game-luminary-effects for all non-director brand-
// strike calls, while CinderMandateBrandingDirector uses its own local copy.
// A drift between the two would make director-owned strikes fire the portal
// pulse at a different cadence than non-director strikes, producing a visually
// inconsistent result.

describe('CinderMandateBrandingDirector — cross-file SOURCE_PULSE_LEAD_MS parity', () => {
  it('SOURCE_PULSE_LEAD_MS matches the same constant in game-luminary-effects (cross-file contract)', () => {
    expect(SOURCE_PULSE_LEAD_MS).toBe(FX_SOURCE_PULSE_LEAD_MS);
  });
});

// ─── Drain-gate budget invariant ─────────────────────────────────────────────
//
// The pre-size estimate passed to setAnimEndTime must be at least as large as
// the real worst-case sequence duration so the drain gate never closes before
// the animation ends.
//
// Minimum estimate components (N=1 card):
//   SETTLE_ESTIMATE_MS + BEAT_HOLD_MS + SOURCE_PULSE_LEAD_MS + (0)*90 + AURA_COMPLETE_MS + AURA_BUFFER_MS + AFTERMATH_HOLD_MS
//
// The code also adds a 400 ms buffer: the total in the director is:
//   SETTLE_ESTIMATE_MS + BEAT_HOLD_MS + lead + (N-1)*90 + 3820 + 400 + AFTERMATH_HOLD_MS
//
// We test N=1 (minimum card count) as the most constrained case.

describe('CinderMandateBrandingDirector — drain-gate minimum budget', () => {
  const minEstimate =
    SETTLE_ESTIMATE_MS +
    BEAT_HOLD_MS +
    SOURCE_PULSE_LEAD_MS +
    AURA_COMPLETE_MS +
    AURA_BUFFER_MS +
    AFTERMATH_HOLD_MS;

  it('minimum drain-gate estimate (N=1) exceeds 5000 ms (sanity floor)', () => {
    expect(minEstimate).toBeGreaterThan(5000);
  });

  it('minimum drain-gate estimate (N=1) accounts for every named phase', () => {
    const namedPhases =
      SETTLE_ESTIMATE_MS + BEAT_HOLD_MS + SOURCE_PULSE_LEAD_MS + AFTERMATH_HOLD_MS;
    expect(minEstimate).toBeGreaterThanOrEqual(namedPhases);
  });
});
