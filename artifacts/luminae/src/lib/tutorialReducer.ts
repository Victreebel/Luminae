import type { AffinityKey } from "@/lib/affinityMeta";
import type { FirstContactStance } from "@workspace/game-types";
import { TUTORIAL_CARDS, type TutorialCard } from "@/lib/tutorialCards";
import {
  TUTORIAL_BEATS,
  FAST_FORWARD_CARDS,
  LUMII_FAST_FORWARD_EMINENCE,
  VERDANCE_LUMINARY_EMINENCE,
  getTutorialInteractionPolicy,
  isTutorialInteractionUnlocked,
  type TutorialOpponentAction,
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
  lumiiAffinities: Record<AffinityKey, number>;
  lumiiBonuses: Record<AffinityKey, number>;
  lumiiForged: string[];
  lumiiEminence: number;
  reserved: string[];
  forged: string[];
  eminence: number;
  wellSel: Partial<Record<AffinityKey, number>>;
  nudge: string | null;
  view: TutorialForgeView;
  ffDone: boolean;
  finalGrantPending: boolean;
  finalDeliveryComplete: boolean;
  lumDone: boolean;
  showLuminary: boolean;
  firstContactStance: FirstContactStance | null;
  completed: boolean;
  completionId: string | null;
  navigateTo: string | null;
  animTrigger?: { type: "forge"; eminence: number; name: string; cardId: string } | { type: "harness"; affinities: AffinityKey[] };
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
  wellBank: { flare: 4, continuum: 4, verdance: 4, abyss: 4, radiance: 4, singularity: 5 },
  bonuses: { ...INIT_BONUSES },
  lumiiAffinities: { ...INIT_AFFINITIES },
  lumiiBonuses: { ...INIT_BONUSES },
  lumiiForged: [],
  lumiiEminence: 0,
  reserved: [], forged: [], eminence: 0,
  wellSel: {}, nudge: null, view: "needed",
  ffDone: false, finalGrantPending: false, finalDeliveryComplete: false, lumDone: false, showLuminary: false,
  firstContactStance: null, completed: false, completionId: null,
  navigateTo: null,
};

export type TAction =
  | { type: "NEXT_DLG" }
  | { type: "NEXT_BEAT" }
  | { type: "RESET" }
  | { type: "PLAYER_RESPONSE" }
  | { type: "CHOOSE_FIRST_CONTACT"; stance: FirstContactStance }
  | { type: "COMPLETE_TUTORIAL"; completionId: string }
  | { type: "SEL_AFF"; affinity: AffinityKey; delta: 1 | 2 | -1 }
  | { type: "CLEAR_SEL" }
  | { type: "HARNESS" }
  | { type: "FORGE_ARTIFACT"; cardId: string }
  | { type: "FORGE_RESERVED"; cardId: string }
  | { type: "RESERVE"; cardId: string }
  | { type: "SET_VIEW"; view: TutorialForgeView }
  | { type: "NUDGE"; msg: string | null }
  | { type: "FF_DONE" }
  | { type: "START_FINAL_DELIVERY" }
  | { type: "GRANT_FINAL_RESERVE" }
  | { type: "COMPLETE_LUMII_TURN" }
  | { type: "LUM_DONE" }
  | { type: "PANEL_VIEWED" }
  | { type: "JUMP_BEAT"; toIndex: number };

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

function spendAffinitiesForArtifact(
  heldAffinities: Record<AffinityKey, number>,
  card: TutorialCard,
  bonuses: Record<AffinityKey, number>
): Record<AffinityKey, number> {
  const next = { ...heldAffinities };
  const eff = effectiveCost(card, bonuses);
  let singularityLeft = next.singularity ?? 0;
  for (const [k, need] of Object.entries(eff) as [AffinityKey, number][]) {
    const have = next[k] ?? 0;
    if (have >= need) {
      next[k] = have - need;
    } else {
      const gap = need - have;
      next[k] = 0;
      singularityLeft -= gap;
    }
  }
  next.singularity = Math.max(0, singularityLeft);
  return next;
}

function applyForge(s: TutState, cardId: string): Partial<TutState> {
  const card = TUTORIAL_CARDS[cardId];
  if (!card) return {};
  const heldAfterForge = spendAffinitiesForArtifact(s.affinities, card, s.bonuses);
  const wellAfterForge = { ...s.wellBank };
  for (const affinity of Object.keys(heldAfterForge) as AffinityKey[]) {
    const spent = (s.affinities[affinity] ?? 0) - (heldAfterForge[affinity] ?? 0);
    if (spent > 0) wellAfterForge[affinity] = (wellAfterForge[affinity] ?? 0) + spent;
  }
  const newBonuses = { ...s.bonuses };
  if (card.bonusAffinity !== "singularity") {
    newBonuses[card.bonusAffinity] = (newBonuses[card.bonusAffinity] ?? 0) + 1;
  }
  return {
    affinities: heldAfterForge,
    wellBank: wellAfterForge,
    bonuses: newBonuses,
    forged: [...s.forged, cardId],
    eminence: s.eminence + card.eminence,
  };
}

function applyTimeSkip(s: TutState): Pick<TutState, "forged" | "bonuses" | "eminence" | "lumiiEminence"> {
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

  return {
    forged,
    bonuses,
    eminence,
    lumiiEminence: Math.max(s.lumiiEminence, LUMII_FAST_FORWARD_EMINENCE),
  };
}

function applyLumiiTurn(s: TutState, action: TutorialOpponentAction): Partial<TutState> | null {
  if (action.kind === "harness") {
    const counts = action.affinities.reduce<Partial<Record<AffinityKey, number>>>((result, affinity) => {
      result[affinity] = (result[affinity] ?? 0) + 1;
      return result;
    }, {});
    const amounts = Object.values(counts);
    const isThreeDifferent = action.affinities.length === 3 && amounts.length === 3;
    const isTwoSame = action.affinities.length === 2 && amounts.length === 1 && amounts[0] === 2;
    if (!isThreeDifferent && !isTwoSame) return null;

    for (const [affinity, amount] of Object.entries(counts) as [AffinityKey, number][]) {
      const available = s.wellBank[affinity] ?? 0;
      if (available < amount || (amount === 2 && available < 4)) return null;
    }

    const lumiiAffinities = { ...s.lumiiAffinities };
    const wellBank = { ...s.wellBank };
    for (const [affinity, amount] of Object.entries(counts) as [AffinityKey, number][]) {
      lumiiAffinities[affinity] = (lumiiAffinities[affinity] ?? 0) + amount;
      wellBank[affinity] = Math.max(0, (wellBank[affinity] ?? 0) - amount);
    }
    return { lumiiAffinities, wellBank };
  }

  const card = TUTORIAL_CARDS[action.cardId];
  if (!card || !canAfford(card, s.lumiiAffinities, s.lumiiBonuses)) return null;
  const lumiiAffinities = spendAffinitiesForArtifact(s.lumiiAffinities, card, s.lumiiBonuses);
  const wellBank = { ...s.wellBank };
  for (const affinity of Object.keys(lumiiAffinities) as AffinityKey[]) {
    const spent = (s.lumiiAffinities[affinity] ?? 0) - (lumiiAffinities[affinity] ?? 0);
    if (spent > 0) wellBank[affinity] = (wellBank[affinity] ?? 0) + spent;
  }
  const lumiiBonuses = { ...s.lumiiBonuses };
  lumiiBonuses[card.bonusAffinity] = (lumiiBonuses[card.bonusAffinity] ?? 0) + 1;
  return {
    lumiiAffinities,
    lumiiBonuses,
    wellBank,
    lumiiForged: [...s.lumiiForged, action.cardId],
    lumiiEminence: s.lumiiEminence + card.eminence,
  };
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
  const interactionPolicy = getTutorialInteractionPolicy(beat.id, s.subStep);
  const interactionUnlocked = isTutorialInteractionUnlocked(beat.id, s.subStep, s.dlgLine);

  switch (a.type) {
    case "NEXT_DLG": {
      if (!isLastDlg) return { ...s, dlgLine: s.dlgLine + 1, nudge: null };
      if (beat.completion.type === "dialogue") {
        if (s.beat >= TUTORIAL_BEATS.length - 1) {
          return { ...s, dlgLine: Math.max(0, beat.dialogue.length - 1), nudge: null };
        }
        const nextBeat = s.beat + 1;
        return { ...s, beat: nextBeat, dlgLine: 0, subStep: 0, nudge: null };
      }
      return { ...s, dlgLine: s.dlgLine, nudge: null };
    }

    case "COMPLETE_TUTORIAL": {
      if (beat.id !== "b18_victory" || !isLastDlg || s.completed) return s;
      return { ...s, completed: true, completionId: a.completionId, nudge: null };
    }

    case "NEXT_BEAT": {
      if (beat.completion.type !== "animation") return s;
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

      const guidedPattern = interactionUnlocked && interactionPolicy?.target.zone === "well"
        ? interactionPolicy.target.harnessPattern
        : null;
      if (!guidedPattern) {
        return { ...s, wellSel: {}, nudge: interactionPolicy?.wrongNudge ?? beat.wrongClickNudge ?? "Follow Lumii's current action." };
      }

      const currentSelectionIsValid = Object.entries(s.wellSel).every(
        ([affinity, count]) => !count || guidedPattern[affinity as AffinityKey] === count,
      );
      const baseSelection = currentSelectionIsValid ? s.wellSel : {};
      const cur = baseSelection[a.affinity] ?? 0;
      const expected = guidedPattern[a.affinity] ?? 0;
      if (cur !== 0 || expected !== a.delta) {
        return { ...s, wellSel: {}, nudge: interactionPolicy?.wrongNudge ?? beat.wrongClickNudge ?? "Follow Lumii's highlighted Harness pattern." };
      }

      const next = cur + a.delta;
      const newSel = { ...baseSelection, [a.affinity]: next };
      const totalSel = Object.values(newSel).reduce((a, b) => a + b, 0);
      if (totalSel > 10) return { ...s, nudge: "You have reached the affinity limit. Release some first." };
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
      if (interactionPolicy?.exactAction !== "HARNESS" || !interactionUnlocked) {
        return { ...s, nudge: interactionPolicy?.wrongNudge ?? beat.wrongClickNudge ?? "Follow Lumii's current action." };
      }
      const sel = s.wellSel;
      const total = Object.values(sel).reduce((a, b) => a + b, 0);
      if (total === 0) return { ...s, nudge: "Select the affinities you need first." };

      const selectedAmounts = Object.values(sel).filter((count) => count > 0);
      const isThreeDifferent = selectedAmounts.length === 3 && selectedAmounts.every((count) => count === 1);
      const isTwoOfSame = selectedAmounts.length === 1 && selectedAmounts[0] === 2;
      if (!isThreeDifferent && !isTwoOfSame) {
        return { ...s, nudge: "Harness exactly 3 different affinities, or 2 of the same affinity." };
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

      const guidedPattern = interactionPolicy?.target.zone === "well"
        ? interactionPolicy.target.harnessPattern
        : null;
      if (guidedPattern && !matchesHarnessPattern(sel, guidedPattern)) {
        return {
          ...s,
          wellSel: {},
          nudge: interactionPolicy?.wrongNudge ?? beat.wrongClickNudge ?? "Follow Lumii's highlighted Harness pattern.",
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
        return { ...s, affinities: heldAfterHarness, wellBank: remainingWell, wellSel: {}, nudge: null, beat: s.beat + 1, dlgLine: 0, subStep: 0, animTrigger: harnessTrigger };
      }
      return { ...s, affinities: heldAfterHarness, wellBank: remainingWell, wellSel: {}, nudge: null, subStep: nextSubStep, animTrigger: harnessTrigger };
    }

    case "SET_VIEW": {
      return { ...s, view: a.view, nudge: null };
    }

    case "RESERVE": {
      const cardId = a.cardId;
      const beatId = beat.id;
      if (
        interactionPolicy?.exactAction === "RESERVE"
        && interactionPolicy.completionEvent === "artifact_encrypted"
        && interactionUnlocked
        && beatId === "b10_reserve"
      ) {
        if (interactionPolicy.target.zone !== "forge" || cardId !== interactionPolicy.target.cardId) {
          return { ...s, nudge: interactionPolicy.wrongNudge };
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
      return { ...s, nudge: interactionPolicy?.wrongNudge ?? "That is not the right action yet." };
    }

    case "FORGE_ARTIFACT": {
      const cardId = a.cardId;
      const beatId = beat.id;
      if (interactionPolicy?.exactAction !== "FORGE_ARTIFACT" || !interactionUnlocked) {
        return { ...s, nudge: interactionPolicy?.wrongNudge ?? beat.wrongClickNudge ?? "That is not the right moment." };
      }
      const card = TUTORIAL_CARDS[cardId];
      if (!card) return s;

      if (!canAfford(card, s.affinities, s.bonuses)) {
        return { ...s, nudge: "Gather the required affinities first." };
      }

      const forgeTrigger = { type: "forge" as const, eminence: card.eminence, name: card.name, cardId };

      if (interactionPolicy.completionEvent === "artifact_forged" && beatId === "b9_first_forge") {
        if (interactionPolicy.target.zone !== "forge" || cardId !== interactionPolicy.target.cardId) {
          return { ...s, nudge: interactionPolicy.wrongNudge };
        }
        return { ...s, ...applyForge(s, cardId), beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null, animTrigger: forgeTrigger };
      }

      if (interactionPolicy.completionEvent === "final_artifact_forged" && beatId === "b16_final_forge") {
        if (interactionPolicy.target.zone !== "forge" || cardId !== interactionPolicy.target.cardId) {
          return { ...s, nudge: interactionPolicy.wrongNudge };
        }
        if (!s.finalDeliveryComplete) {
          return { ...s, nudge: "Wait for Lumii's Continuum delivery." };
        }
        const forgeResult = applyForge(s, cardId);
        return {
          ...s,
          ...forgeResult,
          beat: s.beat + 1,
          dlgLine: 0,
          subStep: 0,
          nudge: null,
          showLuminary: true,
          animTrigger: forgeTrigger,
        };
      }

      return { ...s, nudge: interactionPolicy?.wrongNudge ?? "That is not the right moment." };
    }

    case "FORGE_RESERVED": {
      const cardId = a.cardId;
      const beatId = beat.id;
      if (interactionPolicy?.exactAction !== "FORGE_RESERVED" || !interactionUnlocked) {
        return { ...s, nudge: interactionPolicy?.wrongNudge ?? beat.wrongClickNudge ?? "That is not the right action yet." };
      }
      const card = TUTORIAL_CARDS[cardId];
      if (!card) return s;

      if (interactionPolicy.completionEvent === "encrypted_artifact_forged" && beatId === "b11b_forge_reserved") {
        if (interactionPolicy.target.zone !== "storage" || cardId !== interactionPolicy.target.cardId) {
          return { ...s, nudge: interactionPolicy.wrongNudge };
        }
        if (!canAfford(card, s.affinities, s.bonuses)) {
          return { ...s, nudge: "Gather the required affinities first." };
        }
        const forgeResult = applyForge(s, cardId);
        return {
          ...s,
          ...forgeResult,
          reserved: s.reserved.filter(id => id !== cardId),
          beat: s.beat + 1,
          dlgLine: 0,
          subStep: 0,
          nudge: null,
          animTrigger: { type: "forge" as const, eminence: card.eminence, name: card.name, cardId },
        };
      }
      return { ...s, nudge: interactionPolicy?.wrongNudge ?? "That is not the right action yet." };
    }

    case "COMPLETE_LUMII_TURN": {
      if (beat.completion.type !== "opponent_action") return s;
      const result = applyLumiiTurn(s, beat.completion.action);
      if (!result || s.beat >= TUTORIAL_BEATS.length - 1) return s;
      return {
        ...s,
        ...result,
        beat: s.beat + 1,
        dlgLine: 0,
        subStep: 0,
        nudge: null,
        wellSel: {},
        animTrigger: undefined,
      };
    }

    case "CHOOSE_FIRST_CONTACT": {
      if (beat.id !== "b3c_border" || !isLastDlg) return s;
      const shatterIdx  = TUTORIAL_BEATS.findIndex(b => b.id === "b4_shatter");
      return {
        ...s,
        firstContactStance: a.stance,
        beat: shatterIdx,
        dlgLine: 0,
        subStep: 0,
        nudge: null,
      };
    }

    case "PLAYER_RESPONSE": {
      const beat = TUTORIAL_BEATS[s.beat];
      if (!beat?.playerResponse || !isLastDlg) return s;
      if (beat.completion.type === "dialogue") {
        return { ...s, beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null };
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

    case "START_FINAL_DELIVERY": {
      if (
        beat.id !== "b16_final_forge"
        || !interactionUnlocked
        || s.finalGrantPending
        || s.finalDeliveryComplete
      ) return s;
      return { ...s, finalGrantPending: true, wellSel: {}, nudge: null };
    }

    case "GRANT_FINAL_RESERVE": {
      if (beat.id !== "b16_final_forge" || !s.finalGrantPending) return s;
      return {
        ...s,
        affinities: { ...s.affinities, continuum: (s.affinities.continuum ?? 0) + 4 },
        wellBank: { ...s.wellBank, continuum: Math.max(0, (s.wellBank.continuum ?? 0) - 4) },
        finalGrantPending: false,
        finalDeliveryComplete: true,
      };
    }


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
      return { ...s, beat: idx, dlgLine: 0, subStep: 0, wellSel: {}, nudge: null };
    }

    default:
      return s;
  }
}
