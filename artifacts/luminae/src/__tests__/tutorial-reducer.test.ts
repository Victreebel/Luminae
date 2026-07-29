import { describe, it, expect } from 'vitest';
import { canAfford, tutorialReducer, INIT_STATE } from '@/lib/tutorialReducer';
import { BEAT_INDEX, FINAL_T2_ID, FIRST_FORGE_ID, RESERVE_CARD_ID, T3_PURCHASABLE_IDS, TIER2_SINGULARITY_ID, TUTORIAL_BEATS, TUTORIAL_CARDS } from '@/lib/tutorialData';

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

  it('RESET clears held Affinities, bonuses, and reserved Artifacts', () => {
    const dirtyState = {
      ...INIT_STATE,
      beat: 10,
      affinities: { flare: 3, continuum: 2, verdance: 1, abyss: 4, radiance: 1, singularity: 1 },
      bonuses: { flare: 1, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0 },
      reserved: ['t1e07'],
      forged: ['t1e01'],
      wellSel: { flare: 1 },
      nudge: 'Some nudge message',
      navigateTo: null,
    };
    const result = tutorialReducer(dirtyState, { type: 'RESET' });

    expect(Object.values(result.affinities).every(v => v === 0)).toBe(true);
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

describe('guided forge prompts', () => {
  it('uses the same selectable cost views as the live Forge', () => {
    const discounted = tutorialReducer(INIT_STATE, { type: 'SET_VIEW', view: 'discounted' });
    const full = tutorialReducer(discounted, { type: 'SET_VIEW', view: 'all' });

    expect(discounted.view).toBe('discounted');
    expect(full.view).toBe('all');
  });

  it('recaps all four core actions by their current interface names', () => {
    const recap = TUTORIAL_BEATS[BEAT_INDEX.b18_victory].dialogue
      .map(line => line.text)
      .join(' ');

    expect(recap).toContain('take 3 different Affinities');
    expect(recap).toContain('take 2 of one Affinity');
    expect(recap).toContain('Forge an Artifact');
    expect(recap).toContain('Encrypt an Artifact');
  });

  it('only allows the highlighted Tier 3 artifact to be forged', () => {
    const state = {
      ...INIT_STATE,
      beat: BEAT_INDEX.b13_tier3,
      subStep: 1,
      affinities: { flare: 3, continuum: 6, verdance: 0, abyss: 3, radiance: 0, singularity: 0 },
      bonuses: { ...INIT_STATE.bonuses, verdance: 3 },
    };

    const result = tutorialReducer(state, { type: 'FORGE_ARTIFACT', cardId: T3_PURCHASABLE_IDS[1] });

    expect(result.forged).toHaveLength(0);
    expect(result.nudge).toContain('Canopy Ascendant');
  });

  it('makes every prompted artifact affordable at its instructed forge moment', () => {
    const cases = [
      {
        cardId: FIRST_FORGE_ID,
        heldAffinities: { flare: 1, continuum: 1, verdance: 0, abyss: 0, radiance: 1, singularity: 0 },
        bonuses: INIT_STATE.bonuses,
      },
      {
        cardId: RESERVE_CARD_ID,
        heldAffinities: { flare: 0, continuum: 0, verdance: 0, abyss: 2, radiance: 0, singularity: 1 },
        bonuses: INIT_STATE.bonuses,
      },
      {
        cardId: TIER2_SINGULARITY_ID,
        heldAffinities: { flare: 0, continuum: 0, verdance: 1, abyss: 3, radiance: 0, singularity: 0 },
        bonuses: { ...INIT_STATE.bonuses, verdance: 2 },
      },
      {
        cardId: T3_PURCHASABLE_IDS[0],
        heldAffinities: { flare: 0, continuum: 5, verdance: 0, abyss: 0, radiance: 2, singularity: 1 },
        bonuses: { ...INIT_STATE.bonuses, verdance: 3 },
      },
      {
        cardId: FINAL_T2_ID,
        heldAffinities: { flare: 0, continuum: 5, verdance: 0, abyss: 0, radiance: 0, singularity: 0 },
        bonuses: INIT_STATE.bonuses,
      },
    ];

    for (const scenario of cases) {
      expect(canAfford(TUTORIAL_CARDS[scenario.cardId], scenario.heldAffinities, scenario.bonuses)).toBe(true);
    }
  });
});
