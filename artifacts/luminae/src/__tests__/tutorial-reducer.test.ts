import { describe, it, expect } from 'vitest';
import { canAfford, effectiveCost, tutorialReducer, INIT_STATE } from '@/lib/tutorialReducer';
import { TUTORIAL_CARDS } from '@/lib/tutorialCards';
import { BEAT_INDEX, FAST_FORWARD_CARDS, FINAL_T2_ID, FIRST_FORGE_ID, LUMII_FORGE_ID, RESERVE_CARD_ID, TUTORIAL_BEATS, TUTORIAL_FORGE_CARD_BY_BEAT, TUTORIAL_FORGE_CARD_SLOTS, VERDANCE_LUMINARY_EMINENCE, getTutorialChapter, getTutorialInteractionPolicy, isTutorialInteractionUnlocked, usesTutorialCinematicPhase } from '@/lib/tutorialData';

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
      reserved: [RESERVE_CARD_ID],
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

  it('keeps the complete assembly in the cinematic shell after beat insertions', () => {
    expect(usesTutorialCinematicPhase(BEAT_INDEX.b5c_architect_assembly)).toBe(true);
    expect(usesTutorialCinematicPhase(BEAT_INDEX.b6_forge_appears)).toBe(false);
  });

  it('preserves the extended arrival before the playable board', () => {
    const expectedIntroBeats = [
      'b0_contact',
      'b1_locate',
      'b2_lumii_intro',
      'b3_architect',
      'b3c_border',
      'b4_shatter',
      'b5_affinities',
      'b5b_affinity_tokens',
      'b5c_architect_assembly',
    ];

    for (const beatId of expectedIntroBeats) {
      expect(BEAT_INDEX[beatId]).toBeTypeOf('number');
      expect(usesTutorialCinematicPhase(BEAT_INDEX[beatId])).toBe(true);
    }
  });
});

describe('guided forge prompts', () => {
  it('uses only the four Artifacts acted on during the guided lesson', () => {
    expect(new Set(Object.values(TUTORIAL_FORGE_CARD_BY_BEAT))).toEqual(
      new Set([FIRST_FORGE_ID, RESERVE_CARD_ID, LUMII_FORGE_ID, FINAL_T2_ID]),
    );

    for (const cardId of Object.values(TUTORIAL_FORGE_CARD_BY_BEAT)) {
      const card = TUTORIAL_CARDS[cardId];
      const slot = TUTORIAL_FORGE_CARD_SLOTS[cardId];
      expect(card).toBeDefined();
      expect(slot).toBeDefined();
      expect(slot.tier).toBe(card.tier);
      expect(slot.index).toBeGreaterThanOrEqual(0);
      expect(slot.index).toBeLessThan(4);
    }
  });

  it('leaves the Forge empty outside explicit card-teaching beats', () => {
    const populatedBeats = TUTORIAL_BEATS
      .map(beat => beat.id)
      .filter(beatId => TUTORIAL_FORGE_CARD_BY_BEAT[beatId]);

    expect(populatedBeats).toEqual(Object.keys(TUTORIAL_FORGE_CARD_BY_BEAT));
    expect(TUTORIAL_FORGE_CARD_BY_BEAT.b9b_forge_complete).toBeUndefined();
    expect(TUTORIAL_FORGE_CARD_BY_BEAT.b10b_reserve_granted).toBeUndefined();
    expect(TUTORIAL_FORGE_CARD_BY_BEAT.b11_forge_reserved).toBeUndefined();
    expect(TUTORIAL_FORGE_CARD_BY_BEAT.b18_victory).toBeUndefined();
  });

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
    expect(recap).toContain('Encrypt an Artifact into private storage');
  });

  it('keeps Cost Views available without making them part of the lesson', () => {
    expect(BEAT_INDEX.b10c_needed_peek).toBeUndefined();
    const tutorialDialogue = TUTORIAL_BEATS
      .flatMap(beat => beat.dialogue.map(line => line.text))
      .join(' ');
    expect(tutorialDialogue).not.toMatch(/Cost View|Discounted/);

    const discounted = tutorialReducer(INIT_STATE, { type: 'SET_VIEW', view: 'discounted' });
    expect(discounted.view).toBe('discounted');
    expect(discounted.beat).toBe(INIT_STATE.beat);

    let afterSingularity = { ...INIT_STATE, beat: BEAT_INDEX.b10b_reserve_granted };
    for (let index = 0; index < TUTORIAL_BEATS[BEAT_INDEX.b10b_reserve_granted].dialogue.length; index += 1) {
      afterSingularity = tutorialReducer(afterSingularity, { type: 'NEXT_DLG' });
    }
    expect(afterSingularity.beat).toBe(BEAT_INDEX.b11_forge_reserved);
  });

  it('makes the time jump explicit and idempotent', () => {
    const state = {
      ...INIT_STATE,
      beat: BEAT_INDEX.b15_fast_forward,
      forged: [FIRST_FORGE_ID, RESERVE_CARD_ID],
      bonuses: { ...INIT_STATE.bonuses, continuum: 1, verdance: 1 },
      eminence: 1,
    };

    const result = tutorialReducer(state, { type: 'FF_DONE' });

    expect(result.forged).toEqual([FIRST_FORGE_ID, RESERVE_CARD_ID, ...FAST_FORWARD_CARDS]);
    expect(result.bonuses.verdance).toBe(4);
    expect(result.eminence).toBe(12);
    expect(result.lumiiEminence).toBe(9);
    expect(tutorialReducer(result, { type: 'FF_DONE' })).toEqual(result);
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
        heldAffinities: { flare: 0, continuum: 0, verdance: 2, abyss: 0, radiance: 0, singularity: 1 },
        bonuses: { ...INIT_STATE.bonuses, verdance: 1 },
      },
      {
        cardId: LUMII_FORGE_ID,
        heldAffinities: { flare: 2, continuum: 1, verdance: 0, abyss: 2, radiance: 3, singularity: 0 },
        bonuses: INIT_STATE.lumiiBonuses,
      },
      {
        cardId: FINAL_T2_ID,
        heldAffinities: { flare: 0, continuum: 4, verdance: 0, abyss: 0, radiance: 0, singularity: 0 },
        bonuses: { ...INIT_STATE.bonuses, continuum: 1 },
      },
    ];

    for (const scenario of cases) {
      expect(canAfford(TUTORIAL_CARDS[scenario.cardId], scenario.heldAffinities, scenario.bonuses)).toBe(true);
    }
  });

  it('uses the first permanent bonus to make the encrypted Artifact affordable', () => {
    const card = TUTORIAL_CARDS[RESERVE_CARD_ID];
    const held = { flare: 0, continuum: 0, verdance: 2, abyss: 0, radiance: 0, singularity: 1 };

    expect(effectiveCost(card, INIT_STATE.bonuses).verdance).toBe(4);
    expect(canAfford(card, held, INIT_STATE.bonuses)).toBe(false);
    expect(effectiveCost(card, { ...INIT_STATE.bonuses, verdance: 1 }).verdance).toBe(3);
    expect(canAfford(card, held, { ...INIT_STATE.bonuses, verdance: 1 })).toBe(true);
  });
});

describe('guided Harness gating', () => {
  it('rejects the wrong take-two Affinity without preserving a stuck selection', () => {
    const state = tutorialReducer(
      {
        ...INIT_STATE,
        beat: BEAT_INDEX.b11_forge_reserved,
        wellSel: {},
      },
      { type: 'SEL_AFF', affinity: 'continuum', delta: 2 },
    );

    expect(state.wellSel).toEqual({});
    expect(state.beat).toBe(BEAT_INDEX.b11_forge_reserved);
    expect(state.nudge).toBeTruthy();
  });

  it('clears an invalid persisted selection when Harness is attempted', () => {
    const state = tutorialReducer(
      {
        ...INIT_STATE,
        beat: BEAT_INDEX.b11_forge_reserved,
        wellSel: { continuum: 2 },
      },
      { type: 'HARNESS' },
    );

    expect(state.wellSel).toEqual({});
    expect(state.beat).toBe(BEAT_INDEX.b11_forge_reserved);
    expect(state.subStep).toBe(0);
    expect(state.nudge).toBeTruthy();
  });

  it('accepts only the instructed Verdance pair and yields the turn to Lumii', () => {
    let state = {
      ...INIT_STATE,
      beat: BEAT_INDEX.b11_forge_reserved,
      wellSel: {},
    };

    state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'verdance', delta: 2 });
    expect(state.wellSel).toEqual({ verdance: 2 });

    state = tutorialReducer(state, { type: 'HARNESS' });
    expect(state.wellSel).toEqual({});
    expect(state.affinities.verdance).toBe(2);
    expect(state.beat).toBe(BEAT_INDEX.b11a_lumii_forge);
    expect(state.subStep).toBe(0);
  });
});

describe('typed tutorial interaction policy', () => {
  it('declares one complete contract for every action substep', () => {
    const actionBeats = TUTORIAL_BEATS.filter(beat => beat.completion.type === 'action');
    expect(actionBeats).toHaveLength(6);

    for (const beat of actionBeats) {
      expect(beat.interactionPolicies?.length).toBeGreaterThan(0);
      for (const policy of beat.interactionPolicies ?? []) {
        expect(policy.substep.min).toBeGreaterThanOrEqual(0);
        expect(policy.exactAction).toBeTruthy();
        expect(policy.completionEvent).toBeTruthy();
        expect(policy.target.zone).toMatch(/^(well|forge|storage)$/);
        expect(policy.wrongNudge.length).toBeGreaterThan(8);
      }
    }
  });

  it('unlocks actions only at their declared dialogue line', () => {
    expect(isTutorialInteractionUnlocked('b8_first_harness', 0, 0)).toBe(false);
    expect(isTutorialInteractionUnlocked('b8_first_harness', 0, 1)).toBe(true);
    expect(isTutorialInteractionUnlocked('b11_forge_reserved', 0, 0)).toBe(true);
    expect(isTutorialInteractionUnlocked('b11b_forge_reserved', 0, 0)).toBe(true);
  });

  it('gives the take-two and reserved Forge their own turn contracts', () => {
    expect(getTutorialInteractionPolicy('b11_forge_reserved', 0)).toMatchObject({
      exactAction: 'HARNESS',
      completionEvent: 'harness_completed',
      target: { zone: 'well' },
    });
    expect(getTutorialInteractionPolicy('b11b_forge_reserved', 0)).toMatchObject({
      exactAction: 'FORGE_RESERVED',
      completionEvent: 'encrypted_artifact_forged',
      target: { zone: 'storage', cardId: RESERVE_CARD_ID },
    });
  });

  it('keeps prohibited actions harmless apart from a nudge', () => {
    const cases = [
      [{ ...INIT_STATE, beat: BEAT_INDEX.b8_first_harness, dlgLine: 1 }, { type: 'RESERVE', cardId: RESERVE_CARD_ID } as const],
      [{ ...INIT_STATE, beat: BEAT_INDEX.b9_first_forge, dlgLine: 1 }, { type: 'RESERVE', cardId: RESERVE_CARD_ID } as const],
      [{ ...INIT_STATE, beat: BEAT_INDEX.b10_reserve }, { type: 'FORGE_ARTIFACT', cardId: FIRST_FORGE_ID } as const],
      [{ ...INIT_STATE, beat: BEAT_INDEX.b11_forge_reserved, reserved: [RESERVE_CARD_ID] }, { type: 'FORGE_RESERVED', cardId: RESERVE_CARD_ID } as const],
      [{ ...INIT_STATE, beat: BEAT_INDEX.b16_final_forge, dlgLine: 1 }, { type: 'RESERVE', cardId: FINAL_T2_ID } as const],
    ] as const;

    for (const [state, action] of cases) {
      const result = tutorialReducer(state, action);
      expect({ ...result, nudge: null }).toEqual(state);
      expect(result.nudge).toBeTruthy();
    }
  });

  it('does not accept a stance or final delivery before its instruction is available', () => {
    const earlyChoice = {
      ...INIT_STATE,
      beat: BEAT_INDEX.b3c_border,
      dlgLine: 0,
    };
    expect(tutorialReducer(earlyChoice, {
      type: 'CHOOSE_FIRST_CONTACT',
      stance: 'guarded',
    })).toEqual(earlyChoice);

    const earlyDelivery = {
      ...INIT_STATE,
      beat: BEAT_INDEX.b16_final_forge,
      dlgLine: 0,
    };
    expect(tutorialReducer(earlyDelivery, { type: 'START_FINAL_DELIVERY' })).toEqual(earlyDelivery);
  });
});

describe('tutorial completion path', () => {
  it('reaches every authored beat and completes through one deterministic path', () => {
    let state = { ...INIT_STATE };
    const visited = new Set<string>();

    for (let guard = 0; guard < 160 && !state.completed; guard += 1) {
      const beat = TUTORIAL_BEATS[state.beat];
      visited.add(beat.id);

      if (beat.id === 'b15_fast_forward') {
        state = tutorialReducer(state, { type: 'FF_DONE' });
      } else if (beat.id === 'b17_luminary') {
        state = tutorialReducer(state, { type: 'LUM_DONE' });
      } else if (beat.completion.type === 'opponent_action') {
        state = tutorialReducer(state, { type: 'COMPLETE_LUMII_TURN' });
      } else if (beat.completion.type === 'animation') {
        state = tutorialReducer(state, { type: 'NEXT_BEAT' });
      } else if (beat.id === 'b8_first_harness') {
        if (state.dlgLine < beat.dialogue.length - 1) {
          state = tutorialReducer(state, { type: 'NEXT_DLG' });
        } else {
          state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'flare', delta: 1 });
          state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'continuum', delta: 1 });
          state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'radiance', delta: 1 });
          state = tutorialReducer(state, { type: 'HARNESS' });
        }
      } else if (beat.id === 'b9_first_forge') {
        state = state.dlgLine < beat.dialogue.length - 1
          ? tutorialReducer(state, { type: 'NEXT_DLG' })
          : tutorialReducer(state, { type: 'FORGE_ARTIFACT', cardId: FIRST_FORGE_ID });
      } else if (beat.id === 'b10_reserve') {
        state = tutorialReducer(state, { type: 'RESERVE', cardId: RESERVE_CARD_ID });
      } else if (beat.id === 'b11_forge_reserved') {
        state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'verdance', delta: 2 });
        state = tutorialReducer(state, { type: 'HARNESS' });
      } else if (beat.id === 'b11b_forge_reserved') {
        state = tutorialReducer(state, { type: 'FORGE_RESERVED', cardId: RESERVE_CARD_ID });
      } else if (beat.id === 'b16_final_forge') {
        if (state.dlgLine < beat.dialogue.length - 1) {
          state = tutorialReducer(state, { type: 'NEXT_DLG' });
        } else if (!state.finalDeliveryComplete) {
          state = tutorialReducer(state, { type: 'START_FINAL_DELIVERY' });
          state = tutorialReducer(state, { type: 'GRANT_FINAL_RESERVE' });
        } else {
          state = tutorialReducer(state, { type: 'FORGE_ARTIFACT', cardId: FINAL_T2_ID });
        }
      } else if (beat.id === 'b18_victory' && state.dlgLine >= beat.dialogue.length - 1) {
        state = tutorialReducer(state, { type: 'COMPLETE_TUTORIAL', completionId: 'complete-path' });
      } else if (beat.choices?.length && state.dlgLine >= beat.dialogue.length - 1) {
        state = tutorialReducer(state, { type: 'CHOOSE_FIRST_CONTACT', stance: 'curious' });
      } else if (beat.playerResponse && state.dlgLine >= beat.dialogue.length - 1) {
        state = tutorialReducer(state, { type: 'PLAYER_RESPONSE' });
      } else {
        state = tutorialReducer(state, { type: 'NEXT_DLG' });
      }
    }

    expect(state.completed).toBe(true);
    expect([...visited]).toEqual(TUTORIAL_BEATS.map(beat => beat.id));
  });

  it.each(['curious', 'guarded', 'resolute'] as const)(
    'records and replaces the completed replay stance with %s',
    (stance) => {
      const state = tutorialReducer({
        ...INIT_STATE,
        beat: BEAT_INDEX.b3c_border,
        dlgLine: TUTORIAL_BEATS[BEAT_INDEX.b3c_border].dialogue.length - 1,
        firstContactStance: stance === 'curious' ? 'resolute' : 'curious',
      }, { type: 'CHOOSE_FIRST_CONTACT', stance });

      expect(state.firstContactStance).toBe(stance);
      expect(state.beat).toBe(BEAT_INDEX.b4_shatter);
    },
  );

  it('treats duplicate guarded callbacks as no-ops', () => {
    const animationState = { ...INIT_STATE, beat: BEAT_INDEX.b4_shatter };
    const afterAnimation = tutorialReducer(animationState, { type: 'NEXT_BEAT' });
    expect(tutorialReducer(afterAnimation, { type: 'NEXT_BEAT' })).toEqual(afterAnimation);

    const delivery = {
      ...INIT_STATE,
      beat: BEAT_INDEX.b16_final_forge,
      dlgLine: 1,
      finalGrantPending: true,
    };
    const granted = tutorialReducer(delivery, { type: 'GRANT_FINAL_RESERVE' });
    expect(tutorialReducer(granted, { type: 'GRANT_FINAL_RESERVE' })).toEqual(granted);
  });

  it('walks the primary arrival path into the first playable action', () => {
    let state = { ...INIT_STATE };

    const finishDialogueBeat = () => {
      const beat = TUTORIAL_BEATS[state.beat];
      while (state.dlgLine < beat.dialogue.length - 1) {
        state = tutorialReducer(state, { type: 'NEXT_DLG' });
      }
      if (beat.choices?.length) {
        state = tutorialReducer(state, { type: 'CHOOSE_FIRST_CONTACT', stance: 'curious' });
      } else if (beat.playerResponse) {
        state = tutorialReducer(state, { type: 'PLAYER_RESPONSE' });
      } else {
        state = tutorialReducer(state, { type: 'NEXT_DLG' });
      }
    };

    finishDialogueBeat();
    expect(TUTORIAL_BEATS[state.beat].id).toBe('b1_locate');
    state = tutorialReducer(state, { type: 'NEXT_BEAT' });
    finishDialogueBeat();
    finishDialogueBeat();
    finishDialogueBeat();
    expect(TUTORIAL_BEATS[state.beat].id).toBe('b4_shatter');
    state = tutorialReducer(state, { type: 'NEXT_BEAT' });
    finishDialogueBeat();
    expect(TUTORIAL_BEATS[state.beat].id).toBe('b5b_affinity_tokens');
    state = tutorialReducer(state, { type: 'NEXT_BEAT' });
    finishDialogueBeat();
    finishDialogueBeat();
    finishDialogueBeat();
    finishDialogueBeat();
    finishDialogueBeat();

    expect(TUTORIAL_BEATS[state.beat].id).toBe('b8_first_harness');
    expect(state.affinities).toEqual(INIT_STATE.affinities);
    expect(state.forged).toEqual([]);
    expect(state.reserved).toEqual([]);
  });

  it('plays every core action and grants the Luminary reward exactly once', () => {
    let state = {
      ...INIT_STATE,
      beat: BEAT_INDEX.b8_first_harness,
      dlgLine: TUTORIAL_BEATS[BEAT_INDEX.b8_first_harness].dialogue.length - 1,
    };

    state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'flare', delta: 1 });
    state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'continuum', delta: 1 });
    state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'radiance', delta: 1 });
    state = tutorialReducer(state, { type: 'HARNESS' });
    expect(state.beat).toBe(BEAT_INDEX.b8a_lumii_harness_three);
    state = tutorialReducer(state, { type: 'COMPLETE_LUMII_TURN' });
    expect(state.beat).toBe(BEAT_INDEX.b9_first_forge);
    expect(state.lumiiAffinities).toMatchObject({ flare: 1, continuum: 1, abyss: 1 });
    expect(Object.values(state.lumiiAffinities).reduce((sum, count) => sum + count, 0)).toBe(3);

    state = tutorialReducer(state, { type: 'NEXT_DLG' });
    state = tutorialReducer(state, { type: 'FORGE_ARTIFACT', cardId: FIRST_FORGE_ID });
    expect(state.beat).toBe(BEAT_INDEX.b9a_lumii_harness_two);
    state = tutorialReducer(state, { type: 'COMPLETE_LUMII_TURN' });
    expect(Object.values(state.lumiiAffinities).reduce((sum, count) => sum + count, 0)).toBe(5);
    expect(state.wellBank.flare).toBe(3);
    expect(state.wellBank.continuum).toBe(3);
    expect(state.wellBank.radiance).toBe(2);

    for (let index = 0; index < TUTORIAL_BEATS[BEAT_INDEX.b9b_forge_complete].dialogue.length; index += 1) {
      state = tutorialReducer(state, { type: 'NEXT_DLG' });
    }
    expect(state.beat).toBe(BEAT_INDEX.b10_reserve);
    state = tutorialReducer(state, { type: 'RESERVE', cardId: RESERVE_CARD_ID });
    expect(state.beat).toBe(BEAT_INDEX.b10a_lumii_harness_three);
    expect(state.affinities.singularity).toBe(1);
    expect(state.wellBank.singularity).toBe(INIT_STATE.wellBank.singularity - 1);
    state = tutorialReducer(state, { type: 'COMPLETE_LUMII_TURN' });
    expect(Object.values(state.lumiiAffinities).reduce((sum, count) => sum + count, 0)).toBe(8);

    for (let index = 0; index < TUTORIAL_BEATS[BEAT_INDEX.b10b_reserve_granted].dialogue.length; index += 1) {
      state = tutorialReducer(state, { type: 'NEXT_DLG' });
    }
    expect(state.beat).toBe(BEAT_INDEX.b11_forge_reserved);

    state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'verdance', delta: 2 });
    state = tutorialReducer(state, { type: 'HARNESS' });
    expect(state.beat).toBe(BEAT_INDEX.b11a_lumii_forge);
    state = tutorialReducer(state, { type: 'COMPLETE_LUMII_TURN' });
    expect(state.beat).toBe(BEAT_INDEX.b11b_forge_reserved);
    expect(state.lumiiForged).toEqual([LUMII_FORGE_ID]);
    expect(state.lumiiBonuses.continuum).toBe(1);
    expect(state.lumiiEminence).toBe(0);
    expect(Object.values(state.lumiiAffinities).reduce((sum, count) => sum + count, 0)).toBeLessThanOrEqual(10);
    state = tutorialReducer(state, { type: 'FORGE_RESERVED', cardId: RESERVE_CARD_ID });
    expect(state.beat).toBe(BEAT_INDEX.b11c_lumii_harness_three);
    state = tutorialReducer(state, { type: 'COMPLETE_LUMII_TURN' });
    expect(state.beat).toBe(BEAT_INDEX.b14_win_condition);
    expect(state.lumiiForged).toEqual([LUMII_FORGE_ID]);
    expect(state.lumiiEminence).toBe(0);
    expect(Object.values(state.lumiiAffinities).reduce((sum, count) => sum + count, 0)).toBeLessThanOrEqual(10);

    state = tutorialReducer(state, { type: 'NEXT_DLG' });
    state = tutorialReducer(state, { type: 'NEXT_DLG' });
    state = tutorialReducer(state, { type: 'FF_DONE' });
    expect(state.forged).toEqual([FIRST_FORGE_ID, RESERVE_CARD_ID, ...FAST_FORWARD_CARDS]);
    expect(state.bonuses.verdance).toBe(4);
    state = tutorialReducer(state, { type: 'PLAYER_RESPONSE' });
    state = tutorialReducer(state, { type: 'NEXT_DLG' });
    state = tutorialReducer(state, { type: 'START_FINAL_DELIVERY' });
    state = tutorialReducer(state, { type: 'GRANT_FINAL_RESERVE' });
    state = tutorialReducer(state, { type: 'FORGE_ARTIFACT', cardId: FINAL_T2_ID });

    expect(state.beat).toBe(BEAT_INDEX.b17_luminary);
    expect(state.bonuses.verdance).toBe(5);
    const beforeLuminary = state.eminence;
    state = tutorialReducer(state, { type: 'LUM_DONE' });
    expect(state.beat).toBe(BEAT_INDEX.b18_victory);
    expect(state.eminence).toBe(beforeLuminary + VERDANCE_LUMINARY_EMINENCE);
    expect(state.eminence).toBe(15);
    expect(state.lumiiEminence).toBe(9);
    expect(state.affinities.verdance).toBe(1);

    const afterDuplicate = tutorialReducer(state, { type: 'LUM_DONE' });
    expect(afterDuplicate.eminence).toBe(state.eminence);
    expect(afterDuplicate.affinities.verdance).toBe(1);

    for (let index = 0; index < TUTORIAL_BEATS[BEAT_INDEX.b18_victory].dialogue.length - 1; index += 1) {
      state = tutorialReducer(state, { type: 'NEXT_DLG' });
    }
    expect(state.beat).toBe(BEAT_INDEX.b18_victory);
    expect(state.dlgLine).toBe(TUTORIAL_BEATS[BEAT_INDEX.b18_victory].dialogue.length - 1);
    expect(state.completed).toBe(false);

    const finalState = tutorialReducer(state, { type: 'COMPLETE_TUTORIAL', completionId: 'completion-1' });
    expect(finalState.completed).toBe(true);
    expect(finalState.completionId).toBe('completion-1');
    expect(tutorialReducer(finalState, { type: 'COMPLETE_TUTORIAL', completionId: 'completion-2' })).toEqual(finalState);
  });

  it('groups raw beats into four player-facing lessons', () => {
    expect(getTutorialChapter(BEAT_INDEX.b0_contact).label).toBe('Meet Lumii');
    expect(getTutorialChapter(BEAT_INDEX.b7_artifact_cost).label).toBe('Read the Board');
    expect(getTutorialChapter(BEAT_INDEX.b10_reserve).label).toBe('Core Actions');
    expect(getTutorialChapter(BEAT_INDEX.b18_victory)).toMatchObject({
      label: 'Eminence & Luminaries',
      chapterNumber: 4,
      totalChapters: 4,
    });
  });
});
