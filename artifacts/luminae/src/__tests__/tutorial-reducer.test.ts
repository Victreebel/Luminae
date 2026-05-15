import { describe, it, expect } from 'vitest';
import { tutorialReducer, INIT_STATE } from '@/lib/tutorialReducer';
import { TUTORIAL_BEATS } from '@/lib/tutorialData';

// ─── Tests ────────────────────────────────────────────────────────────────────
//
// These tests exercise the tutorialReducer directly — no React, no DOM, no
// Vite-specific imports.  They guard the RESET action (replay tutorial) and
// the phase-routing invariant that beat 0 always maps to the cinematic phase.

describe('tutorialReducer — RESET action (replay tutorial)', () => {
  it('RESET from INIT_STATE returns identical shape with beat 0', () => {
    const result = tutorialReducer(INIT_STATE, { type: 'RESET' });
    expect(result.beat).toBe(0);
    expect(result.dlgLine).toBe(0);
    expect(result.subStep).toBe(0);
  });

  it('RESET from a mid-tutorial state returns beat 0', () => {
    const midState = { ...INIT_STATE, beat: 12, dlgLine: 3, subStep: 1, eminence: 7 };
    const result = tutorialReducer(midState, { type: 'RESET' });
    expect(result.beat).toBe(0);
    expect(result.dlgLine).toBe(0);
    expect(result.subStep).toBe(0);
    expect(result.eminence).toBe(0);
  });

  it('RESET from the victory beat returns beat 0', () => {
    const victoryBeatIdx = TUTORIAL_BEATS.findIndex(b => b.id === 'b18_victory');
    expect(victoryBeatIdx).toBeGreaterThan(0);
    const victoryState = { ...INIT_STATE, beat: victoryBeatIdx, eminence: 15, forged: ['a', 'b'] };
    const result = tutorialReducer(victoryState, { type: 'RESET' });
    expect(result.beat).toBe(0);
    expect(result.eminence).toBe(0);
    expect(result.forged).toHaveLength(0);
  });

  it('RESET clears all accumulated crystals, bonuses, and reserved cards', () => {
    const dirtyState = {
      ...INIT_STATE,
      beat: 10,
      crystals: { ruby: 3, sapphire: 2, emerald: 1, onyx: 4, pearl: 1, flux: 1 },
      bonuses: { ruby: 1, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
      reserved: ['t1e07'],
      forged: ['t1e01'],
      wellSel: { ruby: 1 },
      nudge: 'Some nudge message',
      navigateTo: null,
    };
    const result = tutorialReducer(dirtyState, { type: 'RESET' });

    expect(Object.values(result.crystals).every(v => v === 0)).toBe(true);
    expect(Object.values(result.bonuses).every(v => v === 0)).toBe(true);
    expect(result.reserved).toHaveLength(0);
    expect(result.forged).toHaveLength(0);
    expect(result.wellSel).toEqual({});
    expect(result.nudge).toBeNull();
  });

  it('RESET clears navigateTo and showLuminary flags', () => {
    const state = { ...INIT_STATE, beat: 5, navigateTo: '/', showLuminary: true, ffDone: true, lumDone: true };
    const result = tutorialReducer(state, { type: 'RESET' });
    expect(result.navigateTo).toBeNull();
    expect(result.showLuminary).toBe(false);
    expect(result.ffDone).toBe(false);
    expect(result.lumDone).toBe(false);
  });
});

describe('phase-routing invariant — beat 0 is always cinematic', () => {
  it('beat 0 maps to the first TUTORIAL_BEATS entry', () => {
    expect(TUTORIAL_BEATS[0]).toBeDefined();
    expect(TUTORIAL_BEATS[0].id).toBe('b0_contact');
  });

  it('INIT_STATE.beat is 0 (always starts at cinematic phase)', () => {
    expect(INIT_STATE.beat).toBe(0);
  });

  it('RESET always lands on beat 0 regardless of starting beat', () => {
    const beats = [0, 1, 5, 9, 10, 15, TUTORIAL_BEATS.length - 1];
    for (const beat of beats) {
      const state = { ...INIT_STATE, beat };
      const result = tutorialReducer(state, { type: 'RESET' });
      expect(result.beat).toBe(0);
    }
  });

  it('beat 0 has a valid TUTORIAL_BEATS entry with a dialogue array', () => {
    const beat = TUTORIAL_BEATS[INIT_STATE.beat];
    expect(beat).toBeDefined();
    expect(Array.isArray(beat.dialogue)).toBe(true);
    expect(beat.dialogue.length).toBeGreaterThan(0);
  });
});
