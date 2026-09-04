import type { AffinityKey } from "@/lib/affinityMeta";
import {
  TUTORIAL_BEATS,
  TUTORIAL_CARDS,
  T3_PURCHASABLE_IDS,
  T3_IMPOSSIBLE_ID,
  FAST_FORWARD_CARDS,
  FINAL_T2_ID,
  FIRST_FORGE_ID,
  RESERVE_CARD_ID,
  TIER2_SINGULARITY_ID,
  VERDANCE_LUMINARY_EMINENCE,
  BEAT_INDEX,
  getTutorialHarnessPattern,
  type TutorialCard,
  type TutorialBranchChoice,
  type TutorialForgeView,
} from "@/lib/tutorialData";

// ─── State ────────────────────────────────────────────────────────────────────
export interface TutState {
  beat: number;
  dlgLine: number;
  subStep: number;
  /** Persisted tutorial-save compatibility field containing held Affinities. */
  affinities: Record<AffinityKey, number>;
  wellBank: Record<AffinityKey, number>;
  bonuses: Record<AffinityKey, number>;
  reserved: string[];
  forged: string[];
  eminence: number;
  wellSel: Partial<Record<AffinityKey, number>>;
  nudge: string | null;
  view: TutorialForgeView;
  t3choice: string | null;
  ffDone: boolean;
  tier3PlanVersion: number;
  tier3GrantPending: boolean;
  tier2GrantPending: boolean;
  tier2DeliveryComplete: boolean;
  finalGrantPending: boolean;
  finalDeliveryComplete: boolean;
  lumDone: boolean;
  showLuminary: boolean;
  navigateTo: string | null;
  animTrigger?: {
    type: "forge";
    eminence: number;
    name: string;
    cardId: string;
    paidAffinities: AffinityKey[];
  } | { type: "harness"; affinities: AffinityKey[] };
}

const INIT_AFFINITIES: Record<AffinityKey, number> = {
  flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0,
};
const INIT_BONUSES: Record<AffinityKey, number> = {
  flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0,
};

export const INIT_STATE: TutState = {
  beat: 0, dlgLine: 0, subStep: 0,
  affinities: { ...INIT_AFFINITIES },
  wellBank: { flare: 7, continuum: 7, verdance: 7, abyss: 7, radiance: 7, singularity: 5 },
  bonuses: { ...INIT_BONUSES },
  reserved: [], forged: [], eminence: 0,
  wellSel: {}, nudge: null, view: "needed",
  t3choice: null, ffDone: false, tier3PlanVersion: 0, tier3GrantPending: false, tier2GrantPending: false, tier2DeliveryComplete: false, finalGrantPending: false, finalDeliveryComplete: false, lumDone: false, showLuminary: false,
  navigateTo: null,
};

export type TAction =
  | { type: "NEXT_DLG" }
  | { type: "NEXT_BEAT" }
  | { type: "RESET" }
  | { type: "PLAYER_RESPONSE" }
  | { type: "BRANCH_CHOICE"; choice: TutorialBranchChoice }
  | { type: "SEL_AFF"; affinity: AffinityKey; delta: 1 | 2 | -1 }
  | { type: "CLEAR_SEL" }
  | { type: "HARNESS" }
  | { type: "FORGE_ARTIFACT"; cardId: string }
  | { type: "FORGE_RESERVED"; cardId: string }
  | { type: "RESERVE"; cardId: string }
  | { type: "SET_VIEW"; view: TutorialForgeView }
  | { type: "NUDGE"; msg: string | null }
  | { type: "FF_DONE" }
  | { type: "INIT_TIER3_PLAN" }
  | { type: "START_TIER2_DELIVERY" }
  | { type: "GRANT_TIER2_RESERVE" }
  | { type: "START_TIER3_DELIVERY" }
  | { type: "GRANT_TIER3_RESERVE" }
  | { type: "START_FINAL_DELIVERY" }
  | { type: "GRANT_FINAL_RESERVE" }
  | { type: "FINAL_FORGE_PRESENTED" }
  | { type: "LUM_DONE" }
  | { type: "PANEL_VIEWED" }
  | { type: "JUMP_BEAT"; toIndex: number; entryState?: TutState };

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function effectiveCost(
  card: TutorialCard,
  bonuses: Record<AffinityKey, number>
): Partial<Record<AffinityKey, number>> {
  const out: Partial<Record<AffinityKey, number>> = {};
  for (const [k, v] of Object.entries(card.cost) as [AffinityKey, number][]) {
    if (v > 0) out[k] = Math.max(0, v - (bonuses[k] ?? 0));
  }
  return out;
}

export function canAfford(
  card: TutorialCard,
  heldAffinities: Record<AffinityKey, number>,
  bonuses: Record<AffinityKey, number>
): boolean {
  const eff = effectiveCost(card, bonuses);
  let shortfall = 0;
  for (const [k, need] of Object.entries(eff) as [AffinityKey, number][]) {
    const have = heldAffinities[k] ?? 0;
    if (have < need) shortfall += need - have;
  }
  return shortfall <= (heldAffinities.singularity ?? 0);
}

export interface TutorialForgePayment {
  heldAfter: Record<AffinityKey, number>;
  wellAfter: Record<AffinityKey, number>;
  paidAffinities: AffinityKey[];
}

export function resolveTutorialForgePayment(
  heldAffinities: Record<AffinityKey, number>,
  wellBank: Record<AffinityKey, number>,
  card: TutorialCard,
  bonuses: Record<AffinityKey, number>
): TutorialForgePayment {
  const heldAfter = { ...heldAffinities };
  const wellAfter = { ...wellBank };
  const paidAffinities: AffinityKey[] = [];
  const eff = effectiveCost(card, bonuses);
  for (const [k, need] of Object.entries(eff) as [AffinityKey, number][]) {
    if (k === "singularity") continue;
    const naturalPaid = Math.min(heldAfter[k] ?? 0, need);
    if (naturalPaid > 0) {
      heldAfter[k] -= naturalPaid;
      wellAfter[k] += naturalPaid;
      for (let index = 0; index < naturalPaid; index++) paidAffinities.push(k);
    }
    const singularityPaid = Math.max(0, need - naturalPaid);
    if (singularityPaid > 0) {
      heldAfter.singularity = Math.max(0, heldAfter.singularity - singularityPaid);
      wellAfter.singularity += singularityPaid;
      for (let index = 0; index < singularityPaid; index++) paidAffinities.push("singularity");
    }
  }
  return { heldAfter, wellAfter, paidAffinities };
}

export function applyTutorialForge(s: TutState, cardId: string): Partial<TutState> {
  const card = TUTORIAL_CARDS[cardId];
  if (!card) return {};
  const payment = resolveTutorialForgePayment(s.affinities, s.wellBank, card, s.bonuses);
  const newBonuses = { ...s.bonuses };
  if (card.bonusAffinity !== "singularity") {
    newBonuses[card.bonusAffinity] = (newBonuses[card.bonusAffinity] ?? 0) + 1;
  }
  return {
    affinities: payment.heldAfter,
    wellBank: payment.wellAfter,
    bonuses: newBonuses,
    forged: [...s.forged, cardId],
    eminence: s.eminence + card.eminence,
  };
}

function tutorialForgeTrigger(s: TutState, card: TutorialCard) {
  const payment = resolveTutorialForgePayment(s.affinities, s.wellBank, card, s.bonuses);
  return {
    type: "forge" as const,
    eminence: card.eminence,
    name: card.name,
    cardId: card.id,
    paidAffinities: payment.paidAffinities,
  };
}

function applyTimeSkip(s: TutState): Pick<TutState, "forged" | "bonuses" | "eminence"> {
  const forged = [...s.forged];
  const bonuses = { ...s.bonuses };
  let eminence = s.eminence;

  for (const cardId of FAST_FORWARD_CARDS) {
    const card = TUTORIAL_CARDS[cardId];
    if (!card || forged.includes(cardId)) continue;
    forged.push(cardId);
    bonuses[card.bonusAffinity] = (bonuses[card.bonusAffinity] ?? 0) + 1;
    eminence += card.eminence;
  }

  return { forged, bonuses, eminence };
}

function matchesHarnessPattern(
  selection: Partial<Record<AffinityKey, number>>,
  pattern: Readonly<Partial<Record<AffinityKey, number>>>,
): boolean {
  return Object.entries(selection).every(
    ([affinity, count]) => !count || pattern[affinity as AffinityKey] === count,
  ) && Object.entries(pattern).every(
    ([affinity, count]) => (selection[affinity as AffinityKey] ?? 0) === count,
  );
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
export function tutorialReducer(s: TutState, a: TAction): TutState {
  if (a.type === "RESET") return { ...INIT_STATE };
  const beat = TUTORIAL_BEATS[s.beat];
  if (!beat) return s;
  const isLastDlg = s.dlgLine >= beat.dialogue.length - 1;

  switch (a.type) {
    case "NEXT_DLG": {
      if (!isLastDlg) return { ...s, dlgLine: s.dlgLine + 1, nudge: null };
      if (beat.id === "b3b_farewell") {
        return { ...s, navigateTo: "/" };
      }
      if (beat.completion.type === "dialogue") {
        if (s.beat >= TUTORIAL_BEATS.length - 1) {
          return { ...s, dlgLine: Math.max(0, beat.dialogue.length - 1), nudge: null };
        }
        const nextBeat = beat.nextBeatId == null
          ? s.beat + 1
          : BEAT_INDEX[beat.nextBeatId];
        if (nextBeat == null) return s;
        return { ...s, beat: nextBeat, dlgLine: 0, subStep: 0, nudge: null };
      }
      return { ...s, dlgLine: s.dlgLine, nudge: null };
    }

    case "NEXT_BEAT": {
      const nextBeat = s.beat + 1;
      if (nextBeat >= TUTORIAL_BEATS.length) return s;
      return { ...s, beat: nextBeat, dlgLine: 0, subStep: 0, nudge: null, wellSel: {} };
    }

    case "SEL_AFF": {
      if (a.delta < 0) {
        const cur = s.wellSel[a.affinity] ?? 0;
        const next = Math.max(0, cur + a.delta);
        const newSel = { ...s.wellSel, [a.affinity]: next };
        return { ...s, wellSel: newSel, nudge: null };
      }

      const guidedPattern = getTutorialHarnessPattern(beat.id, s.subStep);
      if (!guidedPattern) {
        return { ...s, wellSel: {}, nudge: beat.wrongClickNudge ?? "Follow Lumii's current action." };
      }

      const currentSelectionIsValid = Object.entries(s.wellSel).every(
        ([affinity, count]) => !count || guidedPattern[affinity as AffinityKey] === count,
      );
      const baseSelection = currentSelectionIsValid ? s.wellSel : {};
      const cur = baseSelection[a.affinity] ?? 0;
      const expected = guidedPattern[a.affinity] ?? 0;
      if (cur !== 0 || expected !== a.delta) {
        return { ...s, wellSel: {}, nudge: beat.wrongClickNudge ?? "Follow Lumii's highlighted Harness pattern." };
      }

      const next = cur + a.delta;
      const newSel = { ...baseSelection, [a.affinity]: next };
      const totalSel = Object.values(newSel).reduce((a, b) => a + b, 0);
      const heldTotal = Object.values(s.affinities).reduce((sum, count) => sum + count, 0);
      if (heldTotal + totalSel > 10) {
        return { ...s, nudge: "You have reached the affinity limit. Release some first." };
      }
      const maxSingle = Math.max(0, ...Object.values(newSel).filter(v => v > 0));
      if (maxSingle > 2) return { ...s, nudge: "You can harness at most 2 of the same affinity at once." };
      if (a.delta === 2 && (s.wellBank[a.affinity] ?? 0) < 4) {
        return { ...s, nudge: "×2 needs at least 4 of that affinity remaining in the Well." };
      }
      return { ...s, wellSel: newSel, nudge: null };
    }

    case "CLEAR_SEL":
      return { ...s, wellSel: {}, nudge: null };

    case "HARNESS": {
      const sel = s.wellSel;
      const total = Object.values(sel).reduce((a, b) => a + b, 0);
      if (total === 0) return { ...s, nudge: "Select the affinities you need first." };
      const heldTotal = Object.values(s.affinities).reduce((sum, count) => sum + count, 0);
      if (heldTotal + total > 10) {
        return { ...s, wellSel: {}, nudge: "You have reached the affinity limit. Release some first." };
      }

      const selectedAmounts = Object.values(sel).filter((count) => count > 0);
      const isUpToThreeDifferent = selectedAmounts.length >= 1 && selectedAmounts.length <= 3 && selectedAmounts.every((count) => count === 1);
      const isTwoOfSame = selectedAmounts.length === 1 && selectedAmounts[0] === 2;
      if (!isUpToThreeDifferent && !isTwoOfSame) {
        return { ...s, nudge: "Harness up to 3 different affinities, or 2 of the same affinity." };
      }
      for (const [affinity, count] of Object.entries(sel) as [AffinityKey, number][]) {
        if (count > (s.wellBank[affinity] ?? 0)) {
          return { ...s, nudge: "The Affinity Well does not hold enough of that resource." };
        }
        if (count === 2 && (s.wellBank[affinity] ?? 0) < 4) {
          return { ...s, nudge: "×2 needs at least 4 of that affinity remaining in the Well." };
        }
      }

      const beatId = beat.id;

      const guidedPattern = getTutorialHarnessPattern(beatId, s.subStep);
      if (guidedPattern && !matchesHarnessPattern(sel, guidedPattern)) {
        return {
          ...s,
          wellSel: {},
          nudge: beat.wrongClickNudge ?? "Follow Lumii's highlighted Harness pattern.",
        };
      }

      const heldAfterHarness = { ...s.affinities };
      const remainingWell = { ...s.wellBank };
      const harnessedAffinities: AffinityKey[] = [];
      for (const [k, v] of Object.entries(sel) as [AffinityKey, number][]) {
        heldAfterHarness[k] = (heldAfterHarness[k] ?? 0) + v;
        remainingWell[k] = Math.max(0, (remainingWell[k] ?? 0) - v);
        for (let i = 0; i < v; i++) harnessedAffinities.push(k);
      }
      const harnessTrigger = { type: "harness" as const, affinities: harnessedAffinities };

      const nextSubStep = s.subStep + 1;
      if (beatId === "b8_first_harness") {
        return { ...s, affinities: heldAfterHarness, wellBank: remainingWell, wellSel: {}, nudge: null, beat: s.beat + 1, dlgLine: 0, subStep: 0, animTrigger: harnessTrigger };
      }
      if (beatId === "b11_forge_reserved") {
        return {
          ...s,
          affinities: heldAfterHarness,
          wellBank: remainingWell,
          wellSel: {},
          nudge: null,
          dlgLine: beat.dialogue.length - 1,
          subStep: nextSubStep,
          animTrigger: harnessTrigger,
        };
      }
      if (beatId === "b12_tier2" && s.subStep === 0) {
        return {
          ...s,
          affinities: heldAfterHarness,
          wellBank: remainingWell,
          wellSel: {},
          nudge: null,
          dlgLine: beat.dialogue.length - 1,
          subStep: nextSubStep,
          animTrigger: harnessTrigger,
        };
      }
      return { ...s, affinities: heldAfterHarness, wellBank: remainingWell, wellSel: {}, nudge: null, subStep: nextSubStep, animTrigger: harnessTrigger };
    }

    case "SET_VIEW": {
      return { ...s, view: a.view, nudge: null };
    }

    case "RESERVE": {
      const cardId = a.cardId;
      const beatId = beat.id;
      if (beatId === "b10_reserve") {
        if (cardId !== RESERVE_CARD_ID) {
          return { ...s, nudge: "Encrypt the highlighted Artifact." };
        }
        const heldAfterReserve = { ...s.affinities, singularity: (s.affinities.singularity ?? 0) + 1 };
        return {
          ...s,
          reserved: [...s.reserved, cardId],
          affinities: heldAfterReserve,
          wellBank: {
            ...s.wellBank,
            singularity: Math.max(0, (s.wellBank.singularity ?? 0) - 1),
          },
          beat: s.beat + 1,
          dlgLine: 0,
          subStep: 0,
          nudge: null,
        };
      }
      return s;
    }

    case "FORGE_ARTIFACT": {
      const cardId = a.cardId;
      const beatId = beat.id;
      const card = TUTORIAL_CARDS[cardId];
      if (!card) return s;

      if (!canAfford(card, s.affinities, s.bonuses)) {
        return { ...s, nudge: "Gather the required affinities first." };
      }

      const forgeTrigger = tutorialForgeTrigger(s, card);

      if (beatId === "b9_first_forge") {
        if (cardId !== FIRST_FORGE_ID) {
          return { ...s, nudge: "Forge the artifact Lumii highlighted." };
        }
        return { ...s, ...applyTutorialForge(s, cardId), beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null, animTrigger: forgeTrigger };
      }

      if (beatId === "b12_tier2") {
        if (cardId !== TIER2_SINGULARITY_ID) {
          return { ...s, nudge: "Forge the Verdance artifact Lumii highlighted." };
        }
        if (s.subStep < 1) {
          return { ...s, nudge: "Gather the required affinities first." };
        }
        return { ...s, ...applyTutorialForge(s, cardId), beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null, view: "needed", animTrigger: forgeTrigger };
      }

      if (beatId === "b13_tier3") {
        if (cardId === T3_IMPOSSIBLE_ID) {
          return { ...s, nudge: beat.wrongClickNudge ?? "That path is beyond this society's reach for now." };
        }
        if (cardId !== T3_PURCHASABLE_IDS[0]) {
          return { ...s, nudge: "Forge Worldroot Lattice, the artifact Lumii highlighted." };
        }
        const forgeResult = applyTutorialForge(s, cardId);
        const t13Trigger = tutorialForgeTrigger(s, card);
        return {
          ...s,
          ...forgeResult,
          t3choice: cardId,
          beat: s.beat + 1,
          dlgLine: 0,
          subStep: 0,
          nudge: null,
          animTrigger: t13Trigger,
        };
      }

      if (beatId === "b16_final_forge") {
        if (cardId !== FINAL_T2_ID) {
          return { ...s, nudge: "Forge the final artifact Lumii highlighted." };
        }
        if (!s.finalDeliveryComplete) {
          return { ...s, nudge: "Wait for Lumii's Continuum delivery." };
        }
        const forgeResult = applyTutorialForge(s, cardId);
        return {
          ...s,
          ...forgeResult,
          nudge: null,
          showLuminary: true,
          animTrigger: forgeTrigger,
        };
      }

      return { ...s, nudge: "That is not the right moment." };
    }

    case "FORGE_RESERVED": {
      const cardId = a.cardId;
      const beatId = beat.id;
      const card = TUTORIAL_CARDS[cardId];
      if (!card) return s;

      if (beatId === "b11_forge_reserved") {
        if (cardId !== RESERVE_CARD_ID) {
          return { ...s, nudge: "Forge the encrypted artifact." };
        }
        if (s.subStep < 1) {
          return { ...s, nudge: "Gather the required affinities first." };
        }
        if (!canAfford(card, s.affinities, s.bonuses)) {
          return { ...s, nudge: "Gather the required affinities first." };
        }
        const forgeResult = applyTutorialForge(s, cardId);
        return {
          ...s,
          ...forgeResult,
          reserved: s.reserved.filter(id => id !== cardId),
          beat: s.beat + 1,
          dlgLine: 0,
          subStep: 0,
          nudge: null,
          animTrigger: tutorialForgeTrigger(s, card),
        };
      }
      return s;
    }

    case "BRANCH_CHOICE": {
      if (beat.id === "b3_architect") {
        const targetId = a.choice === "curious"
          ? "b3a_stance_curious"
          : a.choice === "guarded"
            ? "b3a_stance_guarded"
            : a.choice === "resolute"
              ? "b3a_stance_resolute"
              : null;
        if (!targetId) return s;
        return { ...s, beat: BEAT_INDEX[targetId], dlgLine: 0, subStep: 0, nudge: null };
      }

      if (beat.id === "b3c_border") {
        if (
          a.choice === "curious" ||
          a.choice === "guarded" ||
          a.choice === "resolute"
        ) {
          return { ...s, beat: BEAT_INDEX.b4_shatter, dlgLine: 0, subStep: 0, nudge: null };
        }
        if (a.choice !== "go" && a.choice !== "home") return s;
        const targetId = a.choice === "home" ? "b3b_farewell" : "b4_shatter";
        const targetIndex = TUTORIAL_BEATS.findIndex(candidate => candidate.id === targetId);
        return { ...s, beat: targetIndex, dlgLine: 0, subStep: 0, nudge: null };
      }

      if (beat.id === "b5_luminae_interface") {
        if (a.choice !== "continue" && a.choice !== "inquire") return s;
        const targetId = a.choice === "inquire" ? "b5a_luminae_origin" : "b5_affinities";
        const targetIndex = TUTORIAL_BEATS.findIndex(candidate => candidate.id === targetId);
        return { ...s, beat: targetIndex, dlgLine: 0, subStep: 0, nudge: null };
      }

      if (beat.id === "b5a_luminae_origin") {
        const targetId = a.choice === "origin_unsettled"
          ? "b5a2_luminae_reassurance"
          : a.choice === "origin_expected"
            ? "b5a3_luminae_expected"
            : null;
        if (!targetId) return s;
        return { ...s, beat: BEAT_INDEX[targetId], dlgLine: 0, subStep: 0, nudge: null };
      }

      if (beat.id === "b9b_forge_complete") {
        const targetId = a.choice === "artifact_continue"
          ? "b9c_transition"
          : a.choice === "artifact_where"
            ? "b9d_signature"
            : null;
        if (!targetId) return s;
        return { ...s, beat: BEAT_INDEX[targetId], dlgLine: 0, subStep: 0, nudge: null };
      }

      if (beat.id === "b10_encrypt_principle") {
        const targetId = a.choice === "encrypt_inquire"
          ? "b10a_encrypt_origin"
          : a.choice === "encrypt_act"
            ? "b10_encrypt_pathway"
            : null;
        if (!targetId) return s;
        return { ...s, beat: BEAT_INDEX[targetId], dlgLine: 0, subStep: 0, nudge: null };
      }

      return s;
    }

    case "PLAYER_RESPONSE": {
      const beat = TUTORIAL_BEATS[s.beat];
      if (!beat) return s;
      if (beat.completion.type === "dialogue") {
        const nextBeat = beat.nextBeatId == null
          ? s.beat + 1
          : BEAT_INDEX[beat.nextBeatId];
        if (nextBeat == null) return s;
        return { ...s, beat: nextBeat, dlgLine: 0, subStep: 0, nudge: null };
      }
      return { ...s, dlgLine: beat.dialogue.length, nudge: null };
    }

    case "NUDGE":
      return { ...s, nudge: a.msg };

    case "FF_DONE": {
      if (beat.id !== "b15_fast_forward" || s.ffDone) return s;
      return {
        ...s,
        ...applyTimeSkip(s),
        ffDone: true,
        beat: s.beat + 1,
        dlgLine: 0,
        subStep: 0,
        nudge: null,
      };
    }

    case "INIT_TIER3_PLAN": {
      if (beat.id !== "b13_tier3" || s.tier3PlanVersion >= 3) return s;
      return {
        ...s,
        // Older saved tutorials reached Tier 3 with the former free-forge
        // path. Restart this lesson at its first legal Harness pattern.
        affinities: { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0, singularity: 0 },
        wellBank: { flare: 7, continuum: 7, verdance: 7, abyss: 7, radiance: 7, singularity: 5 },
        wellSel: {},
        dlgLine: 0,
        subStep: 0,
        nudge: null,
        tier3PlanVersion: 3,
        tier3GrantPending: false,
      };
    }

    // A forge lesson must never point at a card the player cannot reach after
    // its one instructed Harness. Lumii supplies the calculated remaining gap.
    case "START_TIER2_DELIVERY": {
      if (beat.id !== "b12_tier2" || s.subStep !== 0 || s.tier2GrantPending || s.tier2DeliveryComplete) return s;
      return { ...s, tier2GrantPending: true, wellSel: {}, nudge: null };
    }

    case "GRANT_TIER2_RESERVE": {
      if (beat.id !== "b12_tier2" || !s.tier2GrantPending) return s;
      // After the guided two-Abyss Harness, this supply makes Verdant
      // Emergence genuinely affordable using its printed, post-bonus cost.
      return {
        ...s,
        affinities: { ...s.affinities, verdance: (s.affinities.verdance ?? 0) + 1, abyss: (s.affinities.abyss ?? 0) + 1 },
        wellBank: {
          ...s.wellBank,
          verdance: Math.max(0, (s.wellBank.verdance ?? 0) - 1),
          abyss: Math.max(0, (s.wellBank.abyss ?? 0) - 1),
        },
        tier2GrantPending: false,
        tier2DeliveryComplete: true,
      };
    }

    case "START_TIER3_DELIVERY": {
      if (beat.id !== "b13_tier3" || s.tier3PlanVersion !== 3 || s.tier3GrantPending) return s;
      return { ...s, tier3GrantPending: true, wellSel: {}, nudge: null };
    }

    case "GRANT_TIER3_RESERVE": {
      if (beat.id !== "b13_tier3" || !s.tier3GrantPending) return s;
      return {
        ...s,
        // The two Continuum from the next legal Harness complete this cost.
        // Three Verdance bonuses already erase Canopy's Verdance cost.
        affinities: { ...s.affinities, continuum: 3, radiance: 2, singularity: 1 },
        wellBank: {
          ...s.wellBank,
          continuum: Math.max(0, s.wellBank.continuum - 3),
          radiance: Math.max(0, s.wellBank.radiance - 2),
          singularity: Math.max(0, s.wellBank.singularity - 1),
        },
        tier3GrantPending: false,
        tier3PlanVersion: 4,
      };
    }

    case "START_FINAL_DELIVERY": {
      if (beat.id !== "b16_final_forge" || s.finalGrantPending || s.finalDeliveryComplete) return s;
      return { ...s, finalGrantPending: true, wellSel: {}, nudge: null };
    }

    case "GRANT_FINAL_RESERVE": {
      if (beat.id !== "b16_final_forge" || !s.finalGrantPending) return s;
      return {
        ...s,
        affinities: { ...s.affinities, continuum: (s.affinities.continuum ?? 0) + 5 },
        wellBank: { ...s.wellBank, continuum: Math.max(0, (s.wellBank.continuum ?? 0) - 5) },
        finalGrantPending: false,
        finalDeliveryComplete: true,
      };
    }

    case "FINAL_FORGE_PRESENTED":
      if (beat.id !== "b16_final_forge" || !s.showLuminary || !s.forged.includes(FINAL_T2_ID)) return s;
      return {
        ...s,
        beat: s.beat + 1,
        dlgLine: 0,
        subStep: 0,
        nudge: null,
        showLuminary: false,
        animTrigger: undefined,
      };


    case "LUM_DONE":
      if (beat.id !== "b17_luminary" || s.lumDone) return s;
      return {
        ...s,
        lumDone: true,
        beat: s.beat + 1,
        dlgLine: 0,
        subStep: 0,
        nudge: null,
        eminence: s.eminence + VERDANCE_LUMINARY_EMINENCE,
        affinities: { ...s.affinities, verdance: (s.affinities.verdance ?? 0) + 1 },
        wellBank: { ...s.wellBank, verdance: Math.max(0, (s.wellBank.verdance ?? 0) - 1) },
      };

    case "PANEL_VIEWED": {
      const beat = TUTORIAL_BEATS[s.beat];
      if (!beat || beat.completion.type !== "panel_view") return s;
      return { ...s, beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null };
    }

    case "JUMP_BEAT": {
      const idx = Math.max(0, Math.min(a.toIndex, TUTORIAL_BEATS.length - 1));
      return {
        ...(a.entryState ?? s),
        beat: idx,
        dlgLine: 0,
        subStep: 0,
        wellSel: {},
        animTrigger: undefined,
        nudge: null,
        navigateTo: null,
      };
    }

    default:
      return s;
  }
}

function freshTutorialState(): TutState {
  return {
    ...INIT_STATE,
    affinities: { ...INIT_STATE.affinities },
    wellBank: { ...INIT_STATE.wellBank },
    bonuses: { ...INIT_STATE.bonuses },
    reserved: [],
    forged: [],
    wellSel: {},
  };
}

/** Replays canonical tutorial actions so developer scene jumps obey live tutorial rules. */
export function buildTutorialEntryState(targetBeat: number): TutState {
  const target = Math.max(0, Math.min(targetBeat, TUTORIAL_BEATS.length - 1));
  const atOrAfter = (beatId: string) => target >= (BEAT_INDEX[beatId] ?? Number.MAX_SAFE_INTEGER);
  let state = freshTutorialState();
  const enter = (beatId: string) => {
    state = { ...state, beat: BEAT_INDEX[beatId], dlgLine: 0, subStep: 0, wellSel: {} };
  };
  const act = (action: TAction) => {
    state = tutorialReducer(state, action);
  };

  if (atOrAfter("b9_first_forge")) {
    enter("b8_first_harness");
    act({ type: "SEL_AFF", affinity: "flare", delta: 1 });
    act({ type: "SEL_AFF", affinity: "continuum", delta: 1 });
    act({ type: "SEL_AFF", affinity: "radiance", delta: 1 });
    act({ type: "HARNESS" });
  }
  if (atOrAfter("b9b_affinity_returns")) {
    act({ type: "FORGE_ARTIFACT", cardId: FIRST_FORGE_ID });
  }
  if (atOrAfter("b10b_reserve_granted")) {
    enter("b10_reserve");
    act({ type: "RESERVE", cardId: RESERVE_CARD_ID });
  }
  if (atOrAfter("b11b_singularity_substitution")) {
    enter("b11_forge_reserved");
    act({ type: "SEL_AFF", affinity: "abyss", delta: 2 });
    act({ type: "HARNESS" });
    act({ type: "FORGE_RESERVED", cardId: RESERVE_CARD_ID });
  }
  if (atOrAfter("b15b_luminary_signal")) {
    enter("b15_fast_forward");
    act({ type: "FF_DONE" });
  }
  if (atOrAfter("b17_luminary")) {
    enter("b16_final_forge");
    act({ type: "START_FINAL_DELIVERY" });
    act({ type: "GRANT_FINAL_RESERVE" });
    act({ type: "FORGE_ARTIFACT", cardId: FINAL_T2_ID });
    act({ type: "FINAL_FORGE_PRESENTED" });
  }
  if (atOrAfter("b18_victory")) {
    enter("b17_luminary");
    act({ type: "LUM_DONE" });
  }

  return {
    ...state,
    beat: target,
    dlgLine: 0,
    subStep: 0,
    wellSel: {},
    animTrigger: undefined,
    nudge: null,
    navigateTo: null,
  };
}
