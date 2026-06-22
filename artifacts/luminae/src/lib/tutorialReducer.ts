import type { GemKey } from "@/lib/gemMeta";
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
  type TutorialMarketView,
} from "@/lib/tutorialData";

// ─── State ────────────────────────────────────────────────────────────────────
export interface TutState {
  beat: number;
  dlgLine: number;
  subStep: number;
  crystals: Record<GemKey, number>;
  wellBank: Record<GemKey, number>;
  bonuses: Record<GemKey, number>;
  reserved: string[];
  forged: string[];
  eminence: number;
  wellSel: Partial<Record<GemKey, number>>;
  nudge: string | null;
  view: TutorialMarketView;
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
  animTrigger?: { type: "forge"; lumens: number; name: string; cardId: string } | { type: "harvest"; gems: GemKey[] };
}

const INIT_CRYSTALS: Record<GemKey, number> = {
  ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0,
};
const INIT_BONUSES: Record<GemKey, number> = {
  ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0,
};

export const INIT_STATE: TutState = {
  beat: 0, dlgLine: 0, subStep: 0,
  crystals: { ...INIT_CRYSTALS },
  wellBank: { ruby: 7, sapphire: 7, emerald: 7, onyx: 7, pearl: 7, flux: 5 },
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
  | { type: "SEL_AFF"; gem: GemKey; delta: 1 | 2 | -1 }
  | { type: "CLEAR_SEL" }
  | { type: "HARNESS" }
  | { type: "FORGE_MARKET"; cardId: string }
  | { type: "FORGE_RESERVED"; cardId: string }
  | { type: "RESERVE"; cardId: string }
  | { type: "SET_VIEW"; view: TutorialMarketView }
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
  bonuses: Record<GemKey, number>
): Partial<Record<GemKey, number>> {
  const out: Partial<Record<GemKey, number>> = {};
  for (const [k, v] of Object.entries(card.cost) as [GemKey, number][]) {
    if (v > 0) out[k] = Math.max(0, v - (bonuses[k] ?? 0));
  }
  return out;
}

export function canAfford(
  card: TutorialCard,
  crystals: Record<GemKey, number>,
  bonuses: Record<GemKey, number>
): boolean {
  const eff = effectiveCost(card, bonuses);
  let shortfall = 0;
  for (const [k, need] of Object.entries(eff) as [GemKey, number][]) {
    const have = crystals[k] ?? 0;
    if (have < need) shortfall += need - have;
  }
  return shortfall <= (crystals.flux ?? 0);
}

function spendForCard(
  crystals: Record<GemKey, number>,
  card: TutorialCard,
  bonuses: Record<GemKey, number>
): Record<GemKey, number> {
  const next = { ...crystals };
  const eff = effectiveCost(card, bonuses);
  let fluxLeft = next.flux ?? 0;
  for (const [k, need] of Object.entries(eff) as [GemKey, number][]) {
    const have = next[k] ?? 0;
    if (have >= need) {
      next[k] = have - need;
    } else {
      const gap = need - have;
      next[k] = 0;
      fluxLeft -= gap;
    }
  }
  next.flux = Math.max(0, fluxLeft);
  return next;
}

function applyForge(s: TutState, cardId: string): Partial<TutState> {
  const card = TUTORIAL_CARDS[cardId];
  if (!card) return {};
  const newCrystals = spendForCard(s.crystals, card, s.bonuses);
  const newBonuses = { ...s.bonuses };
  if (card.bonusColor !== "flux") {
    newBonuses[card.bonusColor] = (newBonuses[card.bonusColor] ?? 0) + 1;
  }
  return {
    crystals: newCrystals,
    bonuses: newBonuses,
    forged: [...s.forged, cardId],
    eminence: s.eminence + card.lumens,
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
      const cur = s.wellSel[a.gem] ?? 0;
      const next = Math.max(0, cur + a.delta);
      const newSel = { ...s.wellSel, [a.gem]: next };
      if (a.delta < 0) {
        return { ...s, wellSel: newSel, nudge: null };
      }
      const totalSel = Object.values(newSel).reduce((a, b) => a + b, 0);
      if (totalSel > 10) return { ...s, nudge: "You have reached the affinity limit. Release some first." };
      const maxSingle = Math.max(0, ...Object.values(newSel).filter(v => v > 0));
      if (maxSingle > 2) return { ...s, nudge: "You can harness at most 2 of the same affinity at once." };
      if (a.delta === 2 && (s.wellBank[a.gem] ?? 0) < 4) {
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
      for (const [gem, count] of Object.entries(sel) as [GemKey, number][]) {
        if (count > (s.wellBank[gem] ?? 0)) {
          return { ...s, nudge: "The Affinity Well does not hold enough of that resource." };
        }
        if (count === 2 && (s.wellBank[gem] ?? 0) < 4) {
          return { ...s, nudge: "×2 needs at least 4 of that affinity remaining in the Well." };
        }
      }

      const beatId = beat.id;

      if (beatId === "b8_first_harness") {
        if ((sel.ruby ?? 0) !== 1 || (sel.sapphire ?? 0) !== 1 || (sel.pearl ?? 0) !== 1) {
          return { ...s, nudge: "Not yet. Follow the cost first — Flare, Continuum, and Radiance." };
        }
      }

      if (beatId === "b11_forge_reserved" && s.subStep === 0) {
        if ((sel.onyx ?? 0) !== 2) {
          return { ...s, nudge: "Gather 2 Abyss affinities to forge the encrypted artifact." };
        }
      }

      if (beatId === "b12_tier2" && s.subStep === 0) {
        if ((sel.onyx ?? 0) !== 2) {
          return { ...s, nudge: "Gather 2 Abyss affinities. Lumii's delivery covers the remaining cost." };
        }
      }

      if (beatId === "b13_tier3") {
        const required: Array<Partial<Record<GemKey, number>>> = [{ sapphire: 2 }];
        const expected = required[s.subStep];
        if (!expected || Object.entries(sel).some(([gem, count]) => count !== (expected[gem as GemKey] ?? 0)) || Object.entries(expected).some(([gem, count]) => (sel[gem as GemKey] ?? 0) !== count)) {
          return { ...s, nudge: "Follow the highlighted Harvest pattern." };
        }
      }

      const addedCrystals = { ...s.crystals };
      const remainingWell = { ...s.wellBank };
      const flatGems: GemKey[] = [];
      for (const [k, v] of Object.entries(sel) as [GemKey, number][]) {
        addedCrystals[k] = (addedCrystals[k] ?? 0) + v;
        remainingWell[k] = Math.max(0, (remainingWell[k] ?? 0) - v);
        for (let i = 0; i < v; i++) flatGems.push(k);
      }
      const harvestTrigger = { type: "harvest" as const, gems: flatGems };

      const nextSubStep = s.subStep + 1;
      if (beatId === "b8_first_harness") {
        return { ...s, crystals: addedCrystals, wellBank: remainingWell, wellSel: {}, nudge: null, beat: s.beat + 1, dlgLine: 0, subStep: 0, animTrigger: harvestTrigger };
      }
      if (beatId === "b12_tier2" && s.subStep === 0) {
        return {
          ...s,
          crystals: addedCrystals,
          wellBank: remainingWell,
          wellSel: {},
          nudge: null,
          dlgLine: beat.dialogue.length - 1,
          subStep: nextSubStep,
          animTrigger: harvestTrigger,
        };
      }
      return { ...s, crystals: addedCrystals, wellBank: remainingWell, wellSel: {}, nudge: null, subStep: nextSubStep, animTrigger: harvestTrigger };
    }

    case "SET_VIEW": {
      // Cost views are an advanced-game tool. Guided play always shows the
      // actionable cost after bonuses, so every card speaks the same language.
      return { ...s, view: "needed" };
    }

    case "RESERVE": {
      const cardId = a.cardId;
      const beatId = beat.id;
      if (beatId === "b10_reserve") {
        if (cardId !== RESERVE_CARD_ID) {
          return { ...s, nudge: "Encrypt the highlighted artifact." };
        }
        const newCrystals = { ...s.crystals, flux: (s.crystals.flux ?? 0) + 1 };
        return {
          ...s,
          reserved: [...s.reserved, cardId],
          crystals: newCrystals,
          beat: s.beat + 1,
          dlgLine: 0,
          subStep: 0,
          nudge: null,
        };
      }
      return s;
    }

    case "FORGE_MARKET": {
      const cardId = a.cardId;
      const beatId = beat.id;
      const card = TUTORIAL_CARDS[cardId];
      if (!card) return s;

      if (!canAfford(card, s.crystals, s.bonuses)) {
        return { ...s, nudge: "Gather the required affinities first." };
      }

      const forgeTrigger = { type: "forge" as const, lumens: card.lumens, name: card.name, cardId };

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
        const t13Trigger = { type: "forge" as const, lumens: card.lumens, name: card.name, cardId };
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
          return { ...s, nudge: "Forge the reserved artifact." };
        }
        if (s.subStep < 1) {
          return { ...s, nudge: "Gather the required affinities first." };
        }
        if (!canAfford(card, s.crystals, s.bonuses)) {
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
          animTrigger: { type: "forge" as const, lumens: card.lumens, name: card.name, cardId },
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
        crystals: { ...s.crystals, sapphire: (s.crystals.sapphire ?? 0) + 3 },
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
        // path. Restart this lesson at its first legal Harvest pattern.
        crystals: { ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0 },
        wellBank: { ruby: 7, sapphire: 7, emerald: 7, onyx: 7, pearl: 7, flux: 5 },
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
        crystals: { ...s.crystals, emerald: (s.crystals.emerald ?? 0) + 1, onyx: (s.crystals.onyx ?? 0) + 1 },
        wellBank: {
          ...s.wellBank,
          emerald: Math.max(0, (s.wellBank.emerald ?? 0) - 1),
          onyx: Math.max(0, (s.wellBank.onyx ?? 0) - 1),
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
        crystals: { ...s.crystals, sapphire: 3, pearl: 2, flux: 1 },
        wellBank: {
          ...s.wellBank,
          sapphire: Math.max(0, s.wellBank.sapphire - 3),
          pearl: Math.max(0, s.wellBank.pearl - 2),
          flux: Math.max(0, s.wellBank.flux - 1),
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
        crystals: { ...s.crystals, sapphire: (s.crystals.sapphire ?? 0) + 5 },
        wellBank: { ...s.wellBank, sapphire: Math.max(0, (s.wellBank.sapphire ?? 0) - 5) },
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
