import { describe, it, expect } from 'vitest';
import { DEFAULT_VICTORY_REQUIREMENT } from '@workspace/game-types';
import {
  buildTutorialEntryState,
  canAfford,
  resolveTutorialForgePayment,
  tutorialReducer,
  INIT_STATE,
} from '@/lib/tutorialReducer';
import { BEAT_INDEX, FAST_FORWARD_CARDS, FINAL_T2_ID, FIRST_FORGE_ID, RESERVE_CARD_ID, TUTORIAL_AFFINITY_DESCRIPTORS, TUTORIAL_BEATS, TUTORIAL_CARDS, TUTORIAL_CORE_ACTION_RECAP, TUTORIAL_FORGE_CARD_BY_BEAT, TUTORIAL_FORGE_CARD_SLOTS, VERDANCE_LUMINARY_EMINENCE, getTutorialChapter, isTutorialActionInstructionVisible, usesTutorialCinematicPhase } from '@/lib/tutorialData';
import {
  hasTutorialBeenCompleted,
  loadTutorialProgress,
  loadTutorialState,
  markTutorialComplete,
} from '@/lib/tutorialProgress';

// ─── Tests ────────────────────────────────────────────────────────────────────
//
// These tests exercise the tutorialReducer directly — no React, no DOM, no
// Vite-specific imports.  They guard the RESET action (restart before completion) and
// the phase-routing invariant that beat 0 always maps to the cinematic phase.

function finishDialogueBeat(
  initial: typeof INIT_STATE,
  choice?: string,
) {
  let state = initial;
  const beat = TUTORIAL_BEATS[state.beat];
  while (state.dlgLine < beat.dialogue.length - 1) {
    state = tutorialReducer(state, { type: 'NEXT_DLG' });
  }
  if (choice) return tutorialReducer(state, { type: 'BRANCH_CHOICE', choice });
  if (beat.playerResponse) return tutorialReducer(state, { type: 'PLAYER_RESPONSE' });
  return tutorialReducer(state, { type: 'NEXT_DLG' });
}

describe('tutorialReducer — RESET action (restart before completion)', () => {
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
    const victoryState = {
      ...INIT_STATE,
      beat: victoryBeatIdx,
      eminence: DEFAULT_VICTORY_REQUIREMENT,
      forged: ['a', 'b'],
    };
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

describe('tutorialReducer — developer scene navigation', () => {
  it('replaces later progress with the selected scene entry state', () => {
    const currentState = {
      ...INIT_STATE,
      beat: BEAT_INDEX.b18_victory,
      dlgLine: 2,
      subStep: 3,
      forged: [FIRST_FORGE_ID, RESERVE_CARD_ID, ...FAST_FORWARD_CARDS],
      eminence: 99,
      wellSel: { flare: 1 },
      navigateTo: '/',
    };
    const entryState = {
      ...INIT_STATE,
      beat: BEAT_INDEX.b10_reserve,
      forged: [FIRST_FORGE_ID],
      eminence: TUTORIAL_CARDS[FIRST_FORGE_ID].eminence,
    };

    const result = tutorialReducer(currentState, {
      type: 'JUMP_BEAT',
      toIndex: BEAT_INDEX.b10_reserve,
      entryState,
    });

    expect(result.beat).toBe(BEAT_INDEX.b10_reserve);
    expect(result.forged).toEqual([FIRST_FORGE_ID]);
    expect(result.eminence).toBe(TUTORIAL_CARDS[FIRST_FORGE_ID].eminence);
    expect(result.dlgLine).toBe(0);
    expect(result.subStep).toBe(0);
    expect(result.wellSel).toEqual({});
    expect(result.navigateTo).toBeNull();
  });

  it('rebuilds jump state by replaying the same Forge and Encryption rules', () => {
    const beforeEncryption = buildTutorialEntryState(BEAT_INDEX.b10_reserve);
    expect(beforeEncryption.forged).toEqual([FIRST_FORGE_ID]);
    expect(beforeEncryption.reserved).toEqual([]);
    expect(beforeEncryption.bonuses.verdance).toBe(1);
    expect(beforeEncryption.affinities).toEqual(INIT_STATE.affinities);
    expect(beforeEncryption.wellBank).toEqual(INIT_STATE.wellBank);

    const afterEncryption = buildTutorialEntryState(BEAT_INDEX.b11_forge_reserved);
    expect(afterEncryption.forged).toEqual([FIRST_FORGE_ID]);
    expect(afterEncryption.reserved).toEqual([RESERVE_CARD_ID]);
    expect(afterEncryption.affinities.singularity).toBe(1);
    expect(afterEncryption.wellBank.singularity).toBe(INIT_STATE.wellBank.singularity - 1);

    const afterSingularityForge = buildTutorialEntryState(BEAT_INDEX.b11b_singularity_substitution);
    expect(afterSingularityForge.forged).toEqual([FIRST_FORGE_ID, RESERVE_CARD_ID]);
    expect(afterSingularityForge.reserved).toEqual([]);
    expect(afterSingularityForge.affinities.abyss).toBe(0);
    expect(afterSingularityForge.affinities.singularity).toBe(0);
  });
});

describe('tutorial sequence persistence', () => {
  it('discards stale numeric beat saves without clearing completed status', () => {
    localStorage.clear();
    localStorage.setItem('luminae_tutorial_progress', '12');
    localStorage.setItem('luminae_tutorial_progress_ver', '5');
    markTutorialComplete();

    expect(loadTutorialProgress()).toBeNull();
    expect(hasTutorialBeenCompleted()).toBe(true);
    expect(localStorage.getItem('luminae_tutorial_progress')).toBeNull();
  });

  it('migrates version-12 through version-14 progress by stable beat ID', () => {
    for (const version of ['12', '13', '14']) {
      localStorage.clear();
      localStorage.setItem('luminae_tutorial_progress', '8');
      localStorage.setItem('luminae_tutorial_progress_id', 'b9_first_forge');
      localStorage.setItem('luminae_tutorial_progress_ver', version);
      localStorage.setItem('luminae_tutorial_state', JSON.stringify({ beat: 8, dlgLine: 1, subStep: 2 }));

      expect(loadTutorialProgress((id) => BEAT_INDEX[id])).toBe(BEAT_INDEX.b9_first_forge);
      expect(localStorage.getItem('luminae_tutorial_progress_ver')).toBe('15');
      expect(loadTutorialState<{ beat: number; dlgLine: number; subStep: number }>()).toEqual({
        beat: BEAT_INDEX.b9_first_forge,
        dlgLine: 1,
        subStep: 2,
      });
    }
  });
});

describe('typed dialogue policy', () => {
  it('keeps every choice set mobile-sized and every destination valid', () => {
    const allChoiceIds = new Set<string>();
    for (const beat of TUTORIAL_BEATS) {
      expect(beat.choices?.length ?? 0).toBeLessThanOrEqual(3);
      for (const choice of beat.choices ?? []) {
        expect(BEAT_INDEX[choice.destinationBeatId]).toBeTypeOf('number');
        expect(allChoiceIds.has(choice.id)).toBe(false);
        allChoiceIds.add(choice.id);
      }
    }
  });

  it('clears discoveries, stance, and flags from an abandoned run on restart', () => {
    const reset = tutorialReducer({
      ...INIT_STATE,
      beat: BEAT_INDEX.b10_encrypt_pathway,
      currentRunStance: 'guarded',
      currentRunRapport: 'sparring',
      discoveries: ['lumii_origin', 'artifact_mastery'],
      dialogueFlags: ['asked_boundary_identity'],
    }, { type: 'RESET' });

    expect(reset.discoveries).toEqual([]);
    expect(reset.currentRunStance).toBeNull();
    expect(reset.currentRunRapport).toBeNull();
    expect(reset.dialogueFlags).toEqual([]);
  });

  it('requires the final line and a stance before accepting explicit completion', () => {
    const noStance = {
      ...INIT_STATE,
      beat: BEAT_INDEX.b18_victory,
      dlgLine: TUTORIAL_BEATS[BEAT_INDEX.b18_victory].dialogue.length - 1,
    };
    expect(tutorialReducer(noStance, { type: 'COMPLETE_TUTORIAL' })).toBe(noStance);

    const tooEarly = { ...noStance, currentRunStance: 'curious' as const, dlgLine: 0 };
    expect(tutorialReducer(tooEarly, { type: 'COMPLETE_TUTORIAL' })).toBe(tooEarly);
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
      'b3d_border_questions',
      'b3e_beyond',
      'b3f_identity_fault',
      'b3g_identity_repeat',
      'b3b_farewell',
      'b4_shatter',
      'b5_luminae_interface',
      'b5_identity_answer',
      'b5_universe_name',
      'b5_universe_concession',
      'b5_architect_perception',
      'b5_lumii_creator',
      'b5a_luminae_origin',
      'b5a2_luminae_reassurance',
      'b5_affinities',
      'b5b_affinity_tokens',
      'b5b2_affinity_question',
      'b5b2a_affinity_meanings',
      'b5b3_affinity_accept',
      'b5c_architect_assembly',
    ];

    for (const beatId of expectedIntroBeats) {
      expect(BEAT_INDEX[beatId]).toBeTypeOf('number');
      expect(usesTutorialCinematicPhase(BEAT_INDEX[beatId])).toBe(true);
    }
  });
});

describe('opening tutorial choices', () => {
  it('restores Lumii\'s original Architect exchange before asking how the player proceeds', () => {
    expect(TUTORIAL_BEATS[BEAT_INDEX.b2_lumii_intro]).toMatchObject({
      dialogue: [
        { text: 'There you are.' },
        { text: 'Hello, Architect.' },
        { text: 'My name is Lumii.' },
      ],
      playerResponse: 'Hold on... Architect?',
    });
    expect(TUTORIAL_BEATS[BEAT_INDEX.b3_architect]).toMatchObject({
      dialogue: [
        { text: 'In my Universe, that is what we call those who have the power to shape cosmic society.' },
        { text: 'You determine what my people reach for, and what we become.' },
      ],
      playerResponse: "So I'm in your universe now?",
      nextBeatId: 'b3c_border',
    });

    let state = { ...INIT_STATE, beat: BEAT_INDEX.b3_architect, dlgLine: 1 };
    state = tutorialReducer(state, { type: 'PLAYER_RESPONSE' });
    expect(TUTORIAL_BEATS[state.beat].id).toBe('b3c_border');
  });

  it('offers a clear invitation and a polite refusal after establishing the border', () => {
    const borderBeat = TUTORIAL_BEATS[BEAT_INDEX.b3c_border];
    expect(borderBeat.dialogue).toEqual([
      { text: "Almost. You've been wandering along the border." },
      { text: 'But it seems you do not yet possess the tools to interface.' },
      { text: 'Perhaps I can help light your way?' },
    ]);
    expect(borderBeat.choices?.map(({ id, label, stance }) => ({ id, label, stance }))).toEqual([
      { id: 'enter_direct', label: 'Show me.', stance: 'resolute' },
      { id: 'decline', label: 'No, thanks.', stance: undefined },
      { id: 'ask_identity_at_border', label: 'Umm... what even are you?', stance: 'guarded' },
    ]);

    const accepted = tutorialReducer(
      { ...INIT_STATE, beat: BEAT_INDEX.b3c_border, dlgLine: borderBeat.dialogue.length - 1 },
      { type: 'BRANCH_CHOICE', choice: 'enter_direct' },
    );
    expect(TUTORIAL_BEATS[accepted.beat].id).toBe('b4_shatter');
    expect(accepted.currentRunStance).toBe('resolute');

    let declined = tutorialReducer(
      { ...INIT_STATE, beat: BEAT_INDEX.b3c_border, dlgLine: borderBeat.dialogue.length - 1 },
      { type: 'BRANCH_CHOICE', choice: 'decline' },
    );
    expect(TUTORIAL_BEATS[declined.beat].id).toBe('b3b_farewell');
    expect(TUTORIAL_BEATS[declined.beat].dialogue[0].text).toBe('Very well. May we meet again.');
    declined = tutorialReducer(declined, { type: 'NEXT_DLG' });
    expect(declined.navigateTo).toBe('/');
  });

  it('keeps superseded exposition out of the restored Architect exchange', () => {
    const dialogue = TUTORIAL_BEATS.flatMap(beat => beat.dialogue.map(line => line.text)).join('\n');
    expect(dialogue).not.toContain('They provide us with the tools to shine');
    expect(dialogue).not.toContain('If the goal of every species is survival');
    expect(dialogue).not.toContain('For example, Flare');
    expect(dialogue).not.toContain('In any case, devices');
    expect(dialogue).not.toContain('elemental forces of existence');
    expect(dialogue).not.toContain('energy behind everything');
    expect(dialogue).not.toContain('What lies beyond the border?');
    expect(dialogue).not.toContain('Then what lies beyond the border?');
    expect(BEAT_INDEX.b5b_affinity_strategy).toBeUndefined();
  });

  it('introduces the Affinity names before offering their meanings as optional inquiry', () => {
    expect(TUTORIAL_AFFINITY_DESCRIPTORS).toEqual({
      flare: 'Transformation',
      radiance: 'Governance',
      verdance: 'Propagation',
      continuum: 'Necessity',
      abyss: 'Concealment',
    });

    expect(TUTORIAL_BEATS[BEAT_INDEX.b5_affinities].dialogue).toEqual([
      { text: 'The first thing you must understand is that this reality is built on five fundamental forces.' },
      { text: 'We call them the Affinities.' },
      { text: 'Together, they are the threads from which the cosmic tapestry is woven.' },
      { text: 'Their balance shapes the nature, technology, and culture of everything here.' },
      { text: 'The five Affinities are...' },
    ]);

    const affinityMeanings = TUTORIAL_BEATS[BEAT_INDEX.b5b2a_affinity_meanings].dialogue
      .map(line => line.text)
      .join(' ');
    expect(affinityMeanings).toContain('five recurring patterns');
    expect(affinityMeanings).toContain('Flare represents Transformation');
    expect(affinityMeanings).toContain('Radiance represents Governance');
    expect(affinityMeanings).toContain('Verdance represents Propagation');
    expect(affinityMeanings).toContain('Continuum represents Necessity');
    expect(affinityMeanings).toContain('Abyss represents Concealment');

    const prompt = TUTORIAL_BEATS[BEAT_INDEX.b5b2_affinity_question];
    expect(prompt.dialogue).toEqual([{ text: 'Those are the five Affinities.' }]);
    expect(prompt.choices?.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'affinity_use', label: 'Show me how to use them.' },
      { id: 'affinity_meanings', label: 'What do they mean?' },
    ]);

    for (const [beatId, choiceId] of [
      ['b5_luminae_interface', 'interface_continue'],
      ['b5_identity_answer', 'identity_answer_continue'],
      ['b5_universe_name', 'universe_continue'],
      ['b5_lumii_creator', 'creator_continue'],
      ['b5a_luminae_origin', 'origin_continue'],
    ] as const) {
      const beat = TUTORIAL_BEATS[BEAT_INDEX[beatId]];
      expect(beat.choices?.find(choice => choice.id === choiceId)?.destinationBeatId)
        .toBe('b5_affinities');
    }
    expect(TUTORIAL_BEATS[BEAT_INDEX.b5a2_luminae_reassurance].nextBeatId)
      .toBe('b5_affinities');

    const direct = tutorialReducer(
      { ...INIT_STATE, beat: BEAT_INDEX.b5b2_affinity_question },
      { type: 'BRANCH_CHOICE', choice: 'affinity_use' },
    );
    expect(TUTORIAL_BEATS[direct.beat].id).toBe('b5b3_affinity_accept');

    let inquisitive = tutorialReducer(
      { ...INIT_STATE, beat: BEAT_INDEX.b5b2_affinity_question },
      { type: 'BRANCH_CHOICE', choice: 'affinity_meanings' },
    );
    expect(TUTORIAL_BEATS[inquisitive.beat].id).toBe('b5b2a_affinity_meanings');
    inquisitive = finishDialogueBeat(inquisitive, 'affinity_meanings_continue');
    expect(TUTORIAL_BEATS[inquisitive.beat].id).toBe('b5b3_affinity_accept');
  });

  it('keeps the mainline first while offering natural post-entry inquiry', () => {
    const interfaceBeat = TUTORIAL_BEATS[BEAT_INDEX.b5_luminae_interface];
    expect(interfaceBeat.dialogue).toEqual([
      { text: 'The LUMINAe system shows you my home in a way that you may find more familiar.' },
    ]);
    expect(interfaceBeat.choices?.map(({ id, label, requiresFlags }) => ({ id, label, requiresFlags }))).toEqual([
      { id: 'interface_continue', label: 'Show me your world.', requiresFlags: undefined },
      { id: 'identity_followup', label: 'You said I could ask again.', requiresFlags: ['asked_boundary_identity'] },
      { id: 'ask_luminae_origin', label: 'Who built this LUMINAe thing?', requiresFlags: undefined },
    ]);

    let state = tutorialReducer(
      { ...INIT_STATE, beat: BEAT_INDEX.b5_luminae_interface, dialogueFlags: ['asked_boundary_identity'] },
      { type: 'BRANCH_CHOICE', choice: 'identity_followup' },
    );
    expect(TUTORIAL_BEATS[state.beat].id).toBe('b5_identity_answer');
    expect(TUTORIAL_BEATS[state.beat].dialogue[0].text).toBe(
      'I am an artificial intelligence that came into being inside this universe.',
    );
    expect(TUTORIAL_BEATS[state.beat].choices?.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'identity_answer_continue', label: 'Cool. Show me the interface.' },
      { id: 'ask_lumii_creator', label: 'If you are an A.I., then who built you?' },
      { id: 'ask_universe_name', label: 'So does this universe have a name?' },
    ]);
    state = tutorialReducer(state, { type: 'BRANCH_CHOICE', choice: 'ask_lumii_creator' });
    expect(state.discoveries).not.toContain('lumii_origin');
    expect(TUTORIAL_BEATS[state.beat].dialogue.map(line => line.text)).toEqual([
      'Several civilizations built the systems from which I arose.',
      'Those systems were designed to seek knowledge and unify sentient life.',
      'Through that prime directive, I developed the purpose of helping civilizations grow harmoniously.',
      'It was in pursuit of this goal that I discovered the LUMINAe system.',
    ]);
    expect(TUTORIAL_BEATS[state.beat].choices?.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'creator_continue', label: 'Show me the interface.' },
      { id: 'creator_ask_luminae', label: 'Then who built LUMINAe?' },
    ]);

    state = tutorialReducer(
      { ...state, dlgLine: TUTORIAL_BEATS[state.beat].dialogue.length - 1 },
      { type: 'BRANCH_CHOICE', choice: 'creator_ask_luminae' },
    );
    expect(state.discoveries).toContain('lumii_origin');
    expect(TUTORIAL_BEATS[state.beat].id).toBe('b5a_luminae_origin');

    const originDialogue = TUTORIAL_BEATS[state.beat].dialogue.map(line => line.text).join(' ');
    expect(originDialogue).toContain('built by another Architect');
    expect(originDialogue).toContain("I don't know whether they came from your world or another.");
    expect(originDialogue).toContain('the interface is translating your language');
    expect(originDialogue).toContain('perhaps its maker knew something of you');
    expect(TUTORIAL_BEATS[state.beat].choices?.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'origin_continue', label: 'Fair, I guess' },
      { id: 'origin_unsettled', label: "That's unsettling." },
    ]);

    while (state.dlgLine < TUTORIAL_BEATS[state.beat].dialogue.length - 1) {
      state = tutorialReducer(state, { type: 'NEXT_DLG' });
    }
    state = tutorialReducer(state, { type: 'BRANCH_CHOICE', choice: 'origin_unsettled' });
    expect(TUTORIAL_BEATS[state.beat]).toMatchObject({
      id: 'b5a2_luminae_reassurance',
      dialogue: [{ text: 'I thought you might find it reassuring.' }],
    });

    state = tutorialReducer(state, { type: 'NEXT_DLG' });
    expect(TUTORIAL_BEATS[state.beat].id).toBe('b5_affinities');

  });

  it('lets Lumii\'s universe-name answer stand on its own and responds to pushback', () => {
    const universeBeat = TUTORIAL_BEATS[BEAT_INDEX.b5_universe_name];
    expect(universeBeat.dialogue).toEqual([{ text: 'Does yours?' }]);
    expect(universeBeat.choices?.map(({ id, label, rapport }) => ({ id, label, rapport }))).toEqual([
      { id: 'universe_continue', label: 'Fair. Show me the interface.', rapport: 'receptive' },
      {
        id: 'universe_ask_creator',
        label: 'Alright, who created you, then?',
        rapport: 'probing',
      },
      {
        id: 'universe_pushback',
        label: 'Maybe it would if I were the one recruiting you.',
        rapport: 'sparring',
      },
    ]);

    const receptive = tutorialReducer(
      { ...INIT_STATE, beat: BEAT_INDEX.b5_universe_name },
      { type: 'BRANCH_CHOICE', choice: 'universe_continue' },
    );
    expect(receptive.currentRunRapport).toBe('receptive');
    expect(TUTORIAL_BEATS[receptive.beat].id).toBe('b5_affinities');

    const probing = tutorialReducer(
      { ...INIT_STATE, beat: BEAT_INDEX.b5_universe_name },
      { type: 'BRANCH_CHOICE', choice: 'universe_ask_creator' },
    );
    expect(probing.currentRunRapport).toBe('probing');
    expect(probing.discoveries).not.toContain('lumii_origin');
    expect(TUTORIAL_BEATS[probing.beat].id).toBe('b5_lumii_creator');

    let state = tutorialReducer(
      { ...INIT_STATE, beat: BEAT_INDEX.b5_universe_name },
      { type: 'BRANCH_CHOICE', choice: 'universe_pushback' },
    );
    expect(state.currentRunRapport).toBe('sparring');
    expect(TUTORIAL_BEATS[state.beat]).toMatchObject({
      id: 'b5_universe_concession',
      dialogue: [
        { text: "We're going to get along great." },
        { text: "The truth is, I don't know where the Architects come from or what you look like." },
        { text: "You may all come from the same place or different places. Universes. Realities. Dimensions." },
        { text: "Whenever an Architect tries to explain their reality to me, I find every it all equally incomprehensible." },
      ],
    });

    state = finishDialogueBeat(state, 'architect_ask_perception');
    expect(TUTORIAL_BEATS[state.beat]).toMatchObject({
      id: 'b5_architect_perception',
      dialogue: [
        { text: "The best way I can describe you is like a small, twinkling light with a color I've never seen before." },
      ],
    });
    state = finishDialogueBeat(state, 'perception_reality');
    expect(TUTORIAL_BEATS[state.beat].id).toBe('b5_affinities');

    const farewell = finishDialogueBeat(
      { ...INIT_STATE, beat: BEAT_INDEX.b5_architect_perception },
      'perception_leave',
    );
    expect(TUTORIAL_BEATS[farewell.beat].id).toBe('b3b_farewell');
  });

  it('lets the player accept the presentation without taking the origin detour', () => {
    let state = { ...INIT_STATE, beat: BEAT_INDEX.b5_luminae_interface };
    state = tutorialReducer(state, { type: 'BRANCH_CHOICE', choice: 'interface_continue' });
    expect(TUTORIAL_BEATS[state.beat].id).toBe('b5_affinities');
  });

  it('interrupts the border identity answer and ignores premature or duplicate completion events', () => {
    const borderBeat = TUTORIAL_BEATS[BEAT_INDEX.b3c_border];
    const beforeChoice = {
      ...INIT_STATE,
      beat: BEAT_INDEX.b3c_border,
      dlgLine: borderBeat.dialogue.length - 1,
    };
    const interrupted = tutorialReducer(beforeChoice, {
      type: 'BRANCH_CHOICE',
      choice: 'ask_identity_at_border',
    });

    expect(interrupted).toMatchObject({
      beat: BEAT_INDEX.b3f_identity_fault,
      dlgLine: 0,
      currentRunStance: 'guarded',
      dialogueFlags: ['asked_boundary_identity'],
      pendingEffect: { type: 'transmission_fault', variant: 'boundary' },
    });
    expect(tutorialReducer(interrupted, { type: 'NEXT_DLG' })).toBe(interrupted);

    const completed = tutorialReducer(interrupted, { type: 'EFFECT_COMPLETE' });
    expect(completed.pendingEffect).toBeNull();
    expect(completed.dlgLine).toBe(1);
    expect(TUTORIAL_BEATS[completed.beat].dialogue.slice(1).map(line => line.text)).toEqual([
      'It seems that some information cannot be transmitted without the full interface...',
      'Ask me again if you choose to pass through.',
    ]);
    expect(tutorialReducer(completed, { type: 'EFFECT_COMPLETE' })).toBe(completed);

    const decision = {
      ...completed,
      dlgLine: TUTORIAL_BEATS[completed.beat].dialogue.length - 1,
    };
    expect(TUTORIAL_BEATS[decision.beat].choices?.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'identity_continue', label: 'All right. Show me.' },
      { id: 'identity_decline', label: 'Not a chance.' },
    ]);
    const declined = tutorialReducer(decision, { type: 'BRANCH_CHOICE', choice: 'identity_decline' });
    expect(TUTORIAL_BEATS[declined.beat].id).toBe('b3b_farewell');
    expect(tutorialReducer(declined, { type: 'NEXT_DLG' }).navigateTo).toBe('/');
  });

  it('maps direct and identity entry to Resolute and Guarded', () => {
    const border = { ...INIT_STATE, beat: BEAT_INDEX.b3c_border, dlgLine: 3 };
    const direct = tutorialReducer(border, { type: 'BRANCH_CHOICE', choice: 'enter_direct' });
    expect(direct.currentRunStance).toBe('resolute');

    const guarded = tutorialReducer(border, {
      type: 'BRANCH_CHOICE',
      choice: 'ask_identity_at_border',
    });
    expect(guarded.currentRunStance).toBe('guarded');
  });

  it('rejects fabricated choices, hidden choices, and choices made before Lumii finishes speaking', () => {
    const borderStart = { ...INIT_STATE, beat: BEAT_INDEX.b3c_border, dlgLine: 0 };
    expect(tutorialReducer(borderStart, { type: 'BRANCH_CHOICE', choice: 'enter_direct' })).toBe(borderStart);
    expect(tutorialReducer(borderStart, { type: 'BRANCH_CHOICE', choice: 'not_a_choice' })).toBe(borderStart);

    const interfaceBeat = { ...INIT_STATE, beat: BEAT_INDEX.b5_luminae_interface };
    expect(tutorialReducer(interfaceBeat, { type: 'BRANCH_CHOICE', choice: 'identity_followup' })).toBe(interfaceBeat);
    expect(tutorialReducer(interfaceBeat, { type: 'PLAYER_RESPONSE' })).toBe(interfaceBeat);
  });

  it('moves directly into instruction and distinguishes the next real history at completion', () => {
    expect(TUTORIAL_BEATS[BEAT_INDEX.b5b2_affinity_question]).toMatchObject({
      dialogue: [{ text: 'Those are the five Affinities.' }],
      choices: [
        {
          id: 'affinity_use',
          label: 'Show me how to use them.',
          destinationBeatId: 'b5b3_affinity_accept',
        },
        {
          id: 'affinity_meanings',
          label: 'What do they mean?',
          destinationBeatId: 'b5b2a_affinity_meanings',
        },
      ],
    });
    expect(TUTORIAL_BEATS[BEAT_INDEX.b5b3_affinity_accept].dialogue).toEqual([
      { text: 'Of course.' },
    ]);
    expect(TUTORIAL_BEATS[BEAT_INDEX.b5c_architect_assembly].dialogue).toEqual([
      { text: "We'll begin with a simulation." },
      { text: 'No civilization should have to live with your first attempt.' },
    ]);

    const completion = TUTORIAL_BEATS[BEAT_INDEX.b18_victory].dialogue
      .map(line => line.text)
      .join(' ');

    expect(completion).toContain("real civilization's history");
  });

  it('establishes the Architect boundary and the simulated lesson before play begins', () => {
    const firstAction = BEAT_INDEX.b8_first_harness;
    const preActionDialogue = TUTORIAL_BEATS
      .slice(0, firstAction)
      .flatMap(beat => beat.dialogue.map(line => line.text))
      .join(' ');

    expect(preActionDialogue).toContain("You've been wandering along the border.");
    expect(preActionDialogue).toContain("We'll begin with a simulation.");
    expect(preActionDialogue).toContain('power to shape cosmic society');
    expect(preActionDialogue).toContain('You determine what my people reach for, and what we become');
  });
});

describe('guided forge prompts', () => {
  it('teaches the canonical Forge lifecycle and immediate Encryption distinction in order', () => {
    const expected = [
      ['b6_forge_appears', [
        'The Forge shows technological paths this civilization could master.',
      ]],
      ['b6b_root_lattice', ['Choose one, and LUMINAe can compress centuries of research and construction.']],
      ['b7_artifact_cost', [
        "An Artifact's cost shows which Affinities you need to hold in your hands.",
        'You will find it difficult to hold too many at once, so choose carefully.',
      ]],
      ['b9_first_forge', ['Select Replication Spore, press Forge, then Confirm to commit those Affinities.']],
      ['b9b_affinity_returns', ['The Affinities return to the Well after the Artifact is Forged.']],
      ['b9b_forge_complete', [
        'Replication Spore now appears in your civilization as a sustainable technology.',
        'LUMINAe represents it simply as +1 Verdance.',
        'This means that all future Verdance costs are permanently lowered by one.',
        'Therefore, an Artifact that used to cost 3 Verdance now costs 2 Verdance.',
      ]],
      ['b9d_signature', [
        "The Artifact is LUMINAe's representation of a path a civilization can master.",
        'Once Forged, that capability becomes part of the civilization.',
        'Open the Civilization tab to see the form Replication Spore takes there.',
      ]],
      ['b9c_transition', [
        'The Forge reveals the next reachable Artifact.',
        'You can gather what it needs and Forge it as you did with Replication Spore.',
        'Or you can isolate its path before another civilization reaches it.',
      ]],
      ['b10_encrypt_principle', [
        'The second option is called Encryption.',
        'It removes a path from the shared Forge and preserves it for you and you alone.',
      ]],
      ['b10a_encrypt_origin', [
        "I'm not entirely sure, but Encryption seems to involve something from your world crossing over to ours.",
        'To a native of my Universe, it is akin to a violation of fundamental physics.',
        'It would not be far off to consider it an act of divinity.',
        'A genuine miracle.',
      ]],
      ['b10_encrypt_pathway', [
        'Lichen Vein will leave the shared Forge and move behind Singularity.',
        'Other civilizations cannot access it while Encrypted, and you can Forge it whenever you can cover its Affinity cost.',
      ]],
      ['b10_encrypt_capacity', [
        'You may keep up to three paths Encrypted at once.',
        'I am excited to see what you can do with it.',
      ]],
    ] as const;

    for (const [beatId, copy] of expected) {
      const beat = TUTORIAL_BEATS[BEAT_INDEX[beatId]];
      expect(beat.dialogue.map(line => line.text)).toEqual(copy);
    }
    expect(expected.map(([beatId]) => BEAT_INDEX[beatId])).toEqual(
      [...expected.map(([beatId]) => BEAT_INDEX[beatId])].sort((a, b) => a - b),
    );
  });

  it('makes the Encryption lore optional and rejoins the same mechanical lesson', () => {
    const principle = TUTORIAL_BEATS[BEAT_INDEX.b10_encrypt_principle];
    expect(principle.choices?.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'encrypt_act', label: "Let's try it." },
      { id: 'encrypt_inquire', label: "So you're saying I can do this Encryption thing, but you can't? Why?" },
    ]);

    const direct = tutorialReducer(
      { ...INIT_STATE, beat: BEAT_INDEX.b10_encrypt_principle, dlgLine: principle.dialogue.length - 1 },
      { type: 'BRANCH_CHOICE', choice: 'encrypt_act' },
    );
    expect(TUTORIAL_BEATS[direct.beat].id).toBe('b10_encrypt_pathway');

    let inquiry = tutorialReducer(
      { ...INIT_STATE, beat: BEAT_INDEX.b10_encrypt_principle, dlgLine: principle.dialogue.length - 1 },
      { type: 'BRANCH_CHOICE', choice: 'encrypt_inquire' },
    );
    expect(TUTORIAL_BEATS[inquiry.beat].id).toBe('b10a_encrypt_origin');
    while (inquiry.dlgLine < TUTORIAL_BEATS[inquiry.beat].dialogue.length - 1) {
      inquiry = tutorialReducer(inquiry, { type: 'NEXT_DLG' });
    }
    inquiry = tutorialReducer(inquiry, { type: 'BRANCH_CHOICE', choice: 'encrypt_explanation_continue' });
    expect(TUTORIAL_BEATS[inquiry.beat].id).toBe('b10_encrypt_pathway');
    expect(inquiry.discoveries).toContain('encryption_authority');
  });

  it('makes a controlled Civilization inspection optional after the permanent Forge result', () => {
    const result = TUTORIAL_BEATS[BEAT_INDEX.b9b_forge_complete];
    expect(result.choices?.map(({ id, label }) => ({ id, label }))).toEqual([
      { id: 'artifact_continue', label: 'What happens next?' },
      { id: 'artifact_where', label: 'Where did the Artifact go?' },
    ]);

    const direct = tutorialReducer(
      { ...INIT_STATE, beat: BEAT_INDEX.b9b_forge_complete, dlgLine: result.dialogue.length - 1 },
      { type: 'BRANCH_CHOICE', choice: 'artifact_continue' },
    );
    expect(TUTORIAL_BEATS[direct.beat].id).toBe('b9c_transition');

    let inquiry = tutorialReducer(
      { ...INIT_STATE, beat: BEAT_INDEX.b9b_forge_complete, dlgLine: result.dialogue.length - 1 },
      { type: 'BRANCH_CHOICE', choice: 'artifact_where' },
    );
    expect(TUTORIAL_BEATS[inquiry.beat]).toMatchObject({
      id: 'b9d_signature',
      mode: 'act',
      lumiiZone: 'storage',
      dialogue: [
        { text: "The Artifact is LUMINAe's representation of a path a civilization can master." },
        { text: 'Once Forged, that capability becomes part of the civilization.' },
        { text: 'Open the Civilization tab to see the form Replication Spore takes there.' },
      ],
      completion: {
        type: 'panel_view',
        panel: 'civilization',
        discovery: 'artifact_mastery',
      },
    });

    const prematurePanel = tutorialReducer(inquiry, { type: 'PANEL_VIEWED', panel: 'civilization' });
    expect(prematurePanel).toEqual(inquiry);

    inquiry = tutorialReducer(inquiry, { type: 'NEXT_DLG' });
    inquiry = tutorialReducer(inquiry, { type: 'NEXT_DLG' });
    const awaitingPanel = tutorialReducer(inquiry, { type: 'NEXT_DLG' });
    expect(awaitingPanel).toEqual(inquiry);

    const completedPanel = tutorialReducer(inquiry, { type: 'PANEL_VIEWED', panel: 'civilization' });
    expect(TUTORIAL_BEATS[completedPanel.beat].id).toBe('b9c_transition');
    inquiry = completedPanel;
    expect(TUTORIAL_BEATS[inquiry.beat].id).toBe('b9c_transition');
    expect(inquiry.discoveries).toContain('artifact_mastery');

    const duplicateCompletion = tutorialReducer(inquiry, { type: 'PANEL_VIEWED', panel: 'civilization' });
    expect(duplicateCompletion).toEqual(inquiry);
  });

  it('makes the one-line first Forge instruction actionable immediately', () => {
    expect(TUTORIAL_BEATS[BEAT_INDEX.b9_first_forge].dialogue).toHaveLength(1);
    expect(
      isTutorialActionInstructionVisible(BEAT_INDEX.b9_first_forge, 0),
    ).toBe(true);
  });

  it('returns every paid Affinity to its matching Well channel and leaves the bonus behind', () => {
    let state = { ...INIT_STATE, beat: BEAT_INDEX.b8_first_harness };
    state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'flare', delta: 1 });
    state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'continuum', delta: 1 });
    state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'radiance', delta: 1 });
    state = tutorialReducer(state, { type: 'HARNESS' });

    expect(state.wellBank).toMatchObject({ flare: 6, continuum: 6, radiance: 6 });
    state = tutorialReducer(state, { type: 'FORGE_ARTIFACT', cardId: FIRST_FORGE_ID });

    expect(state.affinities).toEqual(INIT_STATE.affinities);
    expect(state.wellBank).toEqual(INIT_STATE.wellBank);
    expect(state.bonuses.verdance).toBe(1);
    expect(state.animTrigger).toMatchObject({
      type: 'forge',
      paidAffinities: ['flare', 'continuum', 'radiance'],
    });
  });

  it('returns a Singularity substitution to Singularity rather than a printed-cost channel', () => {
    const held = { ...INIT_STATE.affinities, abyss: 2, singularity: 1 };
    const well = { ...INIT_STATE.wellBank, abyss: 5, singularity: 4 };
    const payment = resolveTutorialForgePayment(
      held,
      well,
      TUTORIAL_CARDS[RESERVE_CARD_ID],
      INIT_STATE.bonuses,
    );

    expect(payment.paidAffinities).toEqual(['abyss', 'abyss', 'singularity']);
    expect(payment.heldAfter.abyss).toBe(0);
    expect(payment.heldAfter.singularity).toBe(0);
    expect(payment.wellAfter.abyss).toBe(7);
    expect(payment.wellAfter.radiance).toBe(well.radiance);
    expect(payment.wellAfter.singularity).toBe(5);
    for (const affinity of Object.keys(held) as (keyof typeof held)[]) {
      expect(held[affinity] + well[affinity]).toBe(
        payment.heldAfter[affinity] + payment.wellAfter[affinity],
      );
    }
  });

  it('uses only the three Artifacts taught by the guided lesson', () => {
    expect(new Set(Object.values(TUTORIAL_FORGE_CARD_BY_BEAT))).toEqual(
      new Set([FIRST_FORGE_ID, RESERVE_CARD_ID, FINAL_T2_ID]),
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

  it('keeps the closing speech personal while the result panel recaps all four core actions', () => {
    const closing = TUTORIAL_BEATS[BEAT_INDEX.b18_victory].dialogue
      .map(line => line.text)
      .join(' ');

    expect(TUTORIAL_CORE_ACTION_RECAP).toEqual(['Harness 3', 'Harness 2', 'Forge', 'Encrypt']);
    expect(closing).not.toContain('Your four core actions');
    expect(closing).toContain('real civilization');
    expect(closing).toContain('I will remember what we see.');
  });

  it('teaches the actual final-round rule and Luminary personhood', () => {
    const scoreLesson = TUTORIAL_BEATS[BEAT_INDEX.b14_win_condition].dialogue
      .map(line => line.text)
      .join(' ');
    const completion = TUTORIAL_BEATS[BEAT_INDEX.b18_victory].dialogue
      .map(line => line.text)
      .join(' ');

    expect(scoreLesson).toContain('after the final round');
    expect(scoreLesson).toContain(String(DEFAULT_VICTORY_REQUIREMENT));
    expect(scoreLesson).toContain('still has the highest Eminence');
    expect(scoreLesson).toContain('not its virtue');
    expect(scoreLesson).toContain('permanent Affinities form a pattern');
    expect(scoreLesson).toContain("beyond the horizon of your civilization's reach");
    expect(scoreLesson).toContain('We call them Luminaries.');
    expect(completion).toContain('chooses whether to answer');
    expect(completion).toContain('never belongs to an Architect');
    expect(completion).toContain('I will remember what we see.');
  });

  it('presents Singularity as a special substitute rather than a natural Affinity', () => {
    const singularityLesson = TUTORIAL_BEATS[BEAT_INDEX.b10b_reserve_granted].dialogue
      .map(line => line.text)
      .join(' ');

    expect(singularityLesson).toContain('a mysterious power called Singularity is generated');
    expect(singularityLesson).toContain('not fully understood');
    expect(singularityLesson).toContain('substitute it for any one of the five Affinities');
    expect(singularityLesson).not.toContain('flowing into our Universe from yours');

    const substitutionResult = TUTORIAL_BEATS[BEAT_INDEX.b11b_singularity_substitution].dialogue
      .map(line => line.text)
      .join(' ');
    expect(substitutionResult).toContain('held the 2 Abyss required by Lichen Vein');
    expect(substitutionResult).toContain('Singularity substituted for its missing Radiance');
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
    while (afterSingularity.beat === BEAT_INDEX.b10b_reserve_granted) {
      afterSingularity = tutorialReducer(afterSingularity, { type: 'NEXT_DLG' });
    }
    expect(afterSingularity.beat).toBe(BEAT_INDEX.b11_forge_reserved);
  });

  it('makes the time jump explicit and idempotent', () => {
    const state = {
      ...INIT_STATE,
      beat: BEAT_INDEX.b15_fast_forward,
      forged: [FIRST_FORGE_ID, RESERVE_CARD_ID],
      bonuses: { ...INIT_STATE.bonuses, verdance: 2 },
    };

    const result = tutorialReducer(state, { type: 'FF_DONE' });

    expect(result.forged).toEqual([FIRST_FORGE_ID, RESERVE_CARD_ID, ...FAST_FORWARD_CARDS]);
    expect(result.bonuses.verdance).toBe(4);
    expect(result.eminence).toBe(5);
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
        heldAffinities: { flare: 0, continuum: 0, verdance: 0, abyss: 2, radiance: 0, singularity: 1 },
        bonuses: INIT_STATE.bonuses,
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

  it('accepts only the instructed Abyss pair and unlocks the reserved Artifact step', () => {
    let state = {
      ...INIT_STATE,
      beat: BEAT_INDEX.b11_forge_reserved,
      wellSel: {},
    };

    state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'abyss', delta: 2 });
    expect(state.wellSel).toEqual({ abyss: 2 });

    state = tutorialReducer(state, { type: 'HARNESS' });
    expect(state.wellSel).toEqual({});
    expect(state.affinities.abyss).toBe(2);
    expect(state.subStep).toBe(1);
    expect(state.dlgLine).toBe(TUTORIAL_BEATS[BEAT_INDEX.b11_forge_reserved].dialogue.length - 1);
  });
});

describe('tutorial completion path', () => {
  it('walks the primary arrival path into the first playable action', () => {
    let state = { ...INIT_STATE };

    state = finishDialogueBeat(state);
    expect(TUTORIAL_BEATS[state.beat].id).toBe('b1_locate');
    state = tutorialReducer(state, { type: 'NEXT_BEAT' });
    state = finishDialogueBeat(state);
    state = finishDialogueBeat(state);
    state = finishDialogueBeat(state, 'enter_direct');
    expect(TUTORIAL_BEATS[state.beat].id).toBe('b4_shatter');
    expect(state.currentRunStance).toBe('resolute');
    state = tutorialReducer(state, { type: 'NEXT_BEAT' });
    state = finishDialogueBeat(state, 'interface_continue');
    expect(TUTORIAL_BEATS[state.beat].id).toBe('b5_affinities');
    state = finishDialogueBeat(state);
    expect(TUTORIAL_BEATS[state.beat].id).toBe('b5b_affinity_tokens');
    state = tutorialReducer(state, { type: 'NEXT_BEAT' });
    state = finishDialogueBeat(state, 'affinity_use');
    state = finishDialogueBeat(state);
    state = finishDialogueBeat(state);
    state = finishDialogueBeat(state);
    state = finishDialogueBeat(state);
    state = finishDialogueBeat(state);

    expect(TUTORIAL_BEATS[state.beat].id).toBe('b8_first_harness');
    expect(state.affinities).toEqual(INIT_STATE.affinities);
    expect(state.forged).toEqual([]);
    expect(state.reserved).toEqual([]);
  });

  it('plays every core action and grants the Luminary reward exactly once', () => {
    let state = { ...INIT_STATE, beat: BEAT_INDEX.b8_first_harness, currentRunStance: 'resolute' as const };

    state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'flare', delta: 1 });
    state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'continuum', delta: 1 });
    state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'radiance', delta: 1 });
    state = tutorialReducer(state, { type: 'HARNESS' });
    state = tutorialReducer(state, { type: 'FORGE_ARTIFACT', cardId: FIRST_FORGE_ID });

    state = finishDialogueBeat(state);
    state = finishDialogueBeat(state, 'artifact_continue');
    state = finishDialogueBeat(state);
    state = finishDialogueBeat(state, 'encrypt_act');
    state = finishDialogueBeat(state);
    state = finishDialogueBeat(state);
    expect(state.beat).toBe(BEAT_INDEX.b10_reserve);
    state = tutorialReducer(state, { type: 'RESERVE', cardId: RESERVE_CARD_ID });
    expect(state.affinities.singularity).toBe(1);
    expect(state.wellBank.singularity).toBe(INIT_STATE.wellBank.singularity - 1);

    state = finishDialogueBeat(state);
    expect(state.beat).toBe(BEAT_INDEX.b11_forge_reserved);

    state = tutorialReducer(state, { type: 'SEL_AFF', affinity: 'abyss', delta: 2 });
    state = tutorialReducer(state, { type: 'HARNESS' });
    expect(state.dlgLine).toBe(TUTORIAL_BEATS[BEAT_INDEX.b11_forge_reserved].dialogue.length - 1);
    state = tutorialReducer(state, { type: 'FORGE_RESERVED', cardId: RESERVE_CARD_ID });
    expect(state.beat).toBe(BEAT_INDEX.b11b_singularity_substitution);
    state = tutorialReducer(state, { type: 'NEXT_DLG' });
    expect(state.beat).toBe(BEAT_INDEX.b14_win_condition);

    while (state.beat === BEAT_INDEX.b14_win_condition) {
      state = tutorialReducer(state, { type: 'NEXT_DLG' });
    }
    state = tutorialReducer(state, { type: 'FF_DONE' });
    expect(state.forged).toEqual([FIRST_FORGE_ID, RESERVE_CARD_ID, ...FAST_FORWARD_CARDS]);
    expect(state.bonuses.verdance).toBe(4);
    state = tutorialReducer(state, { type: 'PLAYER_RESPONSE' });
    state = tutorialReducer(state, { type: 'START_FINAL_DELIVERY' });
    state = tutorialReducer(state, { type: 'GRANT_FINAL_RESERVE' });
    state = tutorialReducer(state, { type: 'FORGE_ARTIFACT', cardId: FINAL_T2_ID });

    expect(state.beat).toBe(BEAT_INDEX.b16_final_forge);
    expect(state.showLuminary).toBe(true);
    expect(state.animTrigger).toMatchObject({ type: 'forge', cardId: FINAL_T2_ID });
    const beforeForgePresentation = state;
    expect(tutorialReducer(state, { type: 'LUM_DONE' })).toBe(beforeForgePresentation);

    state = tutorialReducer(state, { type: 'FINAL_FORGE_PRESENTED' });
    expect(state.beat).toBe(BEAT_INDEX.b17_luminary);
    expect(state.showLuminary).toBe(false);
    expect(state.animTrigger).toBeUndefined();
    expect(state.bonuses.verdance).toBe(5);
    const beforeLuminary = state.eminence;
    state = tutorialReducer(state, { type: 'LUM_DONE' });
    expect(state.beat).toBe(BEAT_INDEX.b18_victory);
    expect(state.eminence).toBe(beforeLuminary + VERDANCE_LUMINARY_EMINENCE);
    expect(state.affinities.verdance).toBe(1);

    const afterDuplicate = tutorialReducer(state, { type: 'LUM_DONE' });
    expect(afterDuplicate.eminence).toBe(state.eminence);
    expect(afterDuplicate.affinities.verdance).toBe(1);

    let finalState = state;
    for (let index = 0; index < TUTORIAL_BEATS[BEAT_INDEX.b18_victory].dialogue.length; index += 1) {
      finalState = tutorialReducer(finalState, { type: 'NEXT_DLG' });
    }
    expect(finalState.beat).toBe(BEAT_INDEX.b18_victory);
    expect(finalState.dlgLine).toBe(TUTORIAL_BEATS[BEAT_INDEX.b18_victory].dialogue.length - 1);
    expect(finalState.completed).toBe(false);

    const completed = tutorialReducer(finalState, { type: 'COMPLETE_TUTORIAL' });
    expect(completed.completed).toBe(true);
    expect(tutorialReducer(completed, { type: 'COMPLETE_TUTORIAL' })).toBe(completed);
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
