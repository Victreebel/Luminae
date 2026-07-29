import type { AffinityKey } from "@/lib/affinityMeta";
import {
  TUTORIAL_BEATS,
  TUTORIAL_CARDS,
  T3_PURCHASABLE_IDS,
  T3_IMPOSSIBLE_ID,
  FINAL_T2_ID,
  FIRST_FORGE_ID,
  RESERVE_CARD_ID,
  TIER2_SINGULARITY_ID,
  VERDANCE_LUMINARY_EMINENCE,
  type TutorialCard,
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
  | { type: "BRANCH_CHOICE"; choice: "go" | "home" }
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
  const newBonuses = { ...s.bonuses };
  if (card.bonusAffinity !== "singularity") {
    newBonuses[card.bonusAffinity] = (newBonuses[card.bonusAffinity] ?? 0) + 1;
  }
  return {
    affinities: heldAfterForge,
    bonuses: newBonuses,
    forged: [...s.forged, cardId],
    eminence: s.eminence + card.eminence,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────
export function tutorialReducer(s: TutState, a: TAction): TutState {
  const beat = TUTORIAL_BEATS[s.beat];
  const isLastDlg = s.dlgLine >= beat.dialogue.length - 1;

  switch (a.type) {
    case "NEXT_DLG": {
      if (!isLastDlg) return { ...s, dlgLine: s.dlgLine + 1, nudge: null };
      if (beat.id === "b3b_farewell") {
        return { ...s, navigateTo: "/" };
      }
      if (beat.completion.type === "dialogue") {
        const nextBeat = s.beat + 1;
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
      const cur = s.wellSel[a.affinity] ?? 0;
      const next = Math.max(0, cur + a.delta);
      const newSel = { ...s.wellSel, [a.affinity]: next };
      if (a.delta < 0) {
        return { ...s, wellSel: newSel, nudge: null };
      }
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
      const sel = s.wellSel;
      const total = Object.values(sel).reduce((a, b) => a + b, 0);
      if (total === 0) return { ...s, nudge: "Select the affinities you need first." };

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

      if (beatId === "b8_first_harness") {
        if ((sel.flare ?? 0) !== 1 || (sel.continuum ?? 0) !== 1 || (sel.radiance ?? 0) !== 1) {
          return { ...s, nudge: "Not yet. Follow the cost first — Flare, Continuum, and Radiance." };
        }
      }

      if (beatId === "b11_forge_reserved" && s.subStep === 0) {
        if ((sel.abyss ?? 0) !== 2) {
          return { ...s, nudge: "Gather 2 Abyss affinities to forge the encrypted artifact." };
        }
      }

      if (beatId === "b12_tier2" && s.subStep === 0) {
        if ((sel.abyss ?? 0) !== 2) {
          return { ...s, nudge: "Gather 2 Abyss affinities. Lumii's delivery covers the remaining cost." };
        }
      }

      if (beatId === "b13_tier3") {
        const required: Array<Partial<Record<AffinityKey, number>>> = [{ continuum: 2 }];
        const expected = required[s.subStep];
        if (!expected || Object.entries(sel).some(([affinity, count]) => count !== (expected[affinity as AffinityKey] ?? 0)) || Object.entries(expected).some(([affinity, count]) => (sel[affinity as AffinityKey] ?? 0) !== count)) {
          return { ...s, nudge: "Follow the highlighted Harness pattern." };
        }
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
          return { ...s, nudge: "Encrypt the highlighted artifact." };
        }
        const heldAfterReserve = { ...s.affinities, singularity: (s.affinities.singularity ?? 0) + 1 };
        return {
          ...s,
          reserved: [...s.reserved, cardId],
          affinities: heldAfterReserve,
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

      const forgeTrigger = { type: "forge" as const, eminence: card.eminence, name: card.name, cardId };

      if (beatId === "b9_first_forge") {
        if (cardId !== FIRST_FORGE_ID) {
          return { ...s, nudge: "Forge the artifact Lumii highlighted." };
        }
        return { ...s, ...applyForge(s, cardId), beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null, animTrigger: forgeTrigger };
      }

      if (beatId === "b12_tier2") {
        if (cardId !== TIER2_SINGULARITY_ID) {
          return { ...s, nudge: "Forge the Verdance artifact Lumii highlighted." };
        }
        if (s.subStep < 1) {
          return { ...s, nudge: "Gather the required affinities first." };
        }
        return { ...s, ...applyForge(s, cardId), beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null, view: "needed", animTrigger: forgeTrigger };
      }

      if (beatId === "b13_tier3") {
        if (cardId === T3_IMPOSSIBLE_ID) {
          return { ...s, nudge: beat.wrongClickNudge ?? "That path is beyond this society's reach for now." };
        }
        if (cardId !== T3_PURCHASABLE_IDS[0]) {
          return { ...s, nudge: "Forge Canopy Ascendant, the artifact Lumii highlighted." };
        }
        const forgeResult = applyForge(s, cardId);
        const t13Trigger = { type: "forge" as const, eminence: card.eminence, name: card.name, cardId };
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
        const forgeResult = applyForge(s, cardId);
        const totalEm = (forgeResult.eminence ?? s.eminence) + VERDANCE_LUMINARY_EMINENCE;
        return {
          ...s,
          ...forgeResult,
          eminence: totalEm,
          beat: s.beat + 1,
          dlgLine: 0,
          subStep: 0,
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
      return s;
    }

    case "BRANCH_CHOICE": {
      const farewellIdx = TUTORIAL_BEATS.findIndex(b => b.id === "b3b_farewell");
      const shatterIdx  = TUTORIAL_BEATS.findIndex(b => b.id === "b4_shatter");
      if (a.choice === "home") {
        return { ...s, beat: farewellIdx, dlgLine: 0, subStep: 0, nudge: null };
      }
      return { ...s, beat: shatterIdx, dlgLine: 0, subStep: 0, nudge: null };
    }

    case "RESET":
      return { ...INIT_STATE };

    case "PLAYER_RESPONSE": {
      const beat = TUTORIAL_BEATS[s.beat];
      if (!beat) return s;
      if (beat.completion.type === "dialogue") {
        return { ...s, beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null };
      }
      return { ...s, dlgLine: beat.dialogue.length, nudge: null };
    }

    case "NUDGE":
      return { ...s, nudge: a.msg };

    case "FF_DONE": {
      // The time skip reveals the dormant Luminary; it does not forge unseen
      // artifacts or grant invisible Verdance depth.
      return {
        ...s,
        ffDone: true,
        affinities: { ...s.affinities, continuum: (s.affinities.continuum ?? 0) + 3 },
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


    case "LUM_DONE":
      return { ...s, lumDone: true, beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null };

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
