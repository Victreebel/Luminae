import { describe, it, expect } from 'vitest';
import {
  PHASE_1_MS,
  PHASE_2_MS,
  PHASE_3_MS,
  CONTINUE_BTN_MS,
  TITLE_DELAY,
  CIV_DELAY,
  STATS_DELAY,
  ACCOLADE_DELAY,
} from '@/components/VictoryCinematic';

// ─── Phase ordering invariants ────────────────────────────────────────────────
//
// Phase timeline (ms from mount):
//   PHASE_1_MS      =  800  — board-reveal → darkening veil fades in
//   PHASE_2_MS      = 1200  — darkening → KardashevScene fades in (civ-in)
//   PHASE_3_MS      = 2000  — civ-in → accolades phase active
//   CONTINUE_BTN_MS = 4500  — Continue button becomes visible
//
// Invariants:
//   1. PHASE_1 < PHASE_2 < PHASE_3       — phases fire in order
//   2. PHASE_3 < CONTINUE_BTN            — all content visible before continue prompt
//   3. PHASE_2 − PHASE_1 ≥ 200ms         — darkening is perceptible before scene loads
//   4. PHASE_3 − PHASE_2 ≥ 400ms         — scene must settle before accolades phase
//   5. CONTINUE_BTN − PHASE_3 ≥ 1000ms  — content readable window before continue prompt

describe('VictoryCinematic — phase ordering invariants', () => {
  it('PHASE_1_MS fires before PHASE_2_MS', () => {
    expect(PHASE_1_MS).toBeLessThan(PHASE_2_MS);
  });

  it('PHASE_2_MS fires before PHASE_3_MS', () => {
    expect(PHASE_2_MS).toBeLessThan(PHASE_3_MS);
  });

  it('PHASE_3_MS fires before CONTINUE_BTN_MS', () => {
    expect(PHASE_3_MS).toBeLessThan(CONTINUE_BTN_MS);
  });

  it('PHASE_2 − PHASE_1 ≥ 200ms (darkening is perceptible before scene loads)', () => {
    expect(PHASE_2_MS - PHASE_1_MS).toBeGreaterThanOrEqual(200);
  });

  it('PHASE_3 − PHASE_2 ≥ 400ms (scene must settle before accolades phase)', () => {
    expect(PHASE_3_MS - PHASE_2_MS).toBeGreaterThanOrEqual(400);
  });

  it('CONTINUE_BTN − PHASE_3 ≥ 1000ms (content readable window before continue prompt)', () => {
    expect(CONTINUE_BTN_MS - PHASE_3_MS).toBeGreaterThanOrEqual(1000);
  });
});

// ─── Text reveal ordering invariants ─────────────────────────────────────────
//
// Text delays are in seconds (framer-motion `delay` convention).
// Converted to ms for assertions: DELAY * 1000.
//
// Reveal order:
//   TITLE_DELAY    = 2.0 s  — title ("Victory" / "Defeat" / "{name} Wins")
//   CIV_DELAY      = 2.4 s  — civilization name + Kardashev tier label
//   STATS_DELAY    = 2.8 s  — Eminence count + Forged count
//   ACCOLADE_DELAY = 3.2 s  — accolade badges (first badge; per-badge stagger on top)
//
// Invariants:
//   1. TITLE < CIV < STATS < ACCOLADE         — text layers appear in reading order
//   2. Stagger between adjacent text layers ≥ 200ms  — each layer is distinct, not simultaneous
//   3. TITLE_DELAY_MS ≥ PHASE_2_MS            — title waits for dark background (civ-in phase)
//   4. ACCOLADE_DELAY_MS ≥ PHASE_3_MS         — accolades wait for their phase to activate
//   5. CONTINUE_BTN_MS − ACCOLADE_DELAY_MS ≥ 1000ms  — drain-gate: accolades visible ≥1s before continue

const MIN_TEXT_STAGGER_MS = 200;

describe('VictoryCinematic — text reveal ordering invariants', () => {
  const titleMs    = TITLE_DELAY    * 1000;
  const civMs      = CIV_DELAY      * 1000;
  const statsMs    = STATS_DELAY    * 1000;
  const accoladeMs = ACCOLADE_DELAY * 1000;

  it('TITLE_DELAY fires before CIV_DELAY', () => {
    expect(titleMs).toBeLessThan(civMs);
  });

  it('CIV_DELAY fires before STATS_DELAY', () => {
    expect(civMs).toBeLessThan(statsMs);
  });

  it('STATS_DELAY fires before ACCOLADE_DELAY', () => {
    expect(statsMs).toBeLessThan(accoladeMs);
  });

  it(`CIV_DELAY − TITLE_DELAY ≥ ${MIN_TEXT_STAGGER_MS}ms (text layers must be distinct)`, () => {
    expect(civMs - titleMs).toBeGreaterThanOrEqual(MIN_TEXT_STAGGER_MS);
  });

  it(`STATS_DELAY − CIV_DELAY ≥ ${MIN_TEXT_STAGGER_MS}ms (text layers must be distinct)`, () => {
    expect(statsMs - civMs).toBeGreaterThanOrEqual(MIN_TEXT_STAGGER_MS);
  });

  it(`ACCOLADE_DELAY − STATS_DELAY ≥ ${MIN_TEXT_STAGGER_MS}ms (text layers must be distinct)`, () => {
    expect(accoladeMs - statsMs).toBeGreaterThanOrEqual(MIN_TEXT_STAGGER_MS);
  });

  it('TITLE_DELAY_MS ≥ PHASE_2_MS (title waits for dark background / civ-in phase)', () => {
    expect(titleMs).toBeGreaterThanOrEqual(PHASE_2_MS);
  });

  it('ACCOLADE_DELAY_MS ≥ PHASE_3_MS (accolades wait for their phase to activate)', () => {
    expect(accoladeMs).toBeGreaterThanOrEqual(PHASE_3_MS);
  });

  it('CONTINUE_BTN_MS − ACCOLADE_DELAY_MS ≥ 1000ms (drain-gate: accolades visible ≥1s before continue prompt)', () => {
    expect(CONTINUE_BTN_MS - accoladeMs).toBeGreaterThanOrEqual(1000);
  });
});
