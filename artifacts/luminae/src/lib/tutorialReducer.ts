import type { GemKey } from "@/lib/gemMeta";
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
  type TutorialCard,
  type TutorialMarketView,
} from "@/lib/tutorialData";

// ─── State ────────────────────────────────────────────────────────────────────
export interface TutState {
  beat: number;
  dlgLine: number;
  subStep: number;
  crystals: Record<GemKey, number>;
  bonuses: Record<GemKey, number>;
  reserved: string[];
  forged: string[];
  eminence: number;
  wellSel: Partial<Record<GemKey, number>>;
  nudge: string | null;
  view: TutorialMarketView;
  t3choice: string | null;
  ffDone: boolean;
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
  bonuses: { ...INIT_BONUSES },
  reserved: [], forged: [], eminence: 0,
  wellSel: {}, nudge: null, view: "all",
  t3choice: null, ffDone: false, lumDone: false, showLuminary: false,
  navigateTo: null,
};

export type TAction =
  | { type: "NEXT_DLG" }
  | { type: "NEXT_BEAT" }
  | { type: "RESET" }
  | { type: "PLAYER_RESPONSE" }
  | { type: "BRANCH_CHOICE"; choice: "go" | "home" }
  | { type: "SEL_AFF"; gem: GemKey; delta: 1 | -1 }
  | { type: "CLEAR_SEL" }
  | { type: "HARNESS" }
  | { type: "FORGE_MARKET"; cardId: string }
  | { type: "FORGE_RESERVED"; cardId: string }
  | { type: "RESERVE"; cardId: string }
  | { type: "SET_VIEW"; view: TutorialMarketView }
  | { type: "NUDGE"; msg: string | null }
  | { type: "FF_DONE" }
  | { type: "LUM_DONE" }
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
      return { ...s, beat: nextBeat, dlgLine: 0, subStep: 0, nudge: null, wellSel: {}, animTrigger: undefined };
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
      return { ...s, wellSel: newSel, nudge: null };
    }

    case "CLEAR_SEL":
      return { ...s, wellSel: {}, nudge: null };

    case "HARNESS": {
      const sel = s.wellSel;
      const total = Object.values(sel).reduce((a, b) => a + b, 0);
      if (total === 0) return { ...s, nudge: "Select the affinities you need first." };

      const beatId = beat.id;

      if (beatId === "b8_first_harness") {
        if ((sel.ruby ?? 0) !== 1 || (sel.sapphire ?? 0) !== 1 || (sel.pearl ?? 0) !== 1) {
          return { ...s, nudge: "Not yet. Follow the cost first — Flare, Continuum, and Radiance." };
        }
      }

      if (beatId === "b11_forge_reserved" && s.subStep === 0) {
        if ((sel.onyx ?? 0) !== 2 || (sel.pearl ?? 0) !== 1) {
          return { ...s, nudge: "Gather the Abyss and Radiance affinities shown in the cost." };
        }
      }

      if (beatId === "b12_tier2" && s.subStep === 1) {
        if ((sel.onyx ?? 0) !== 2) {
          return { ...s, nudge: "Gather 2 Abyss affinities — Singularity will bridge the Verdance gap." };
        }
      }

      if (beatId === "b16_final_forge" && s.subStep === 0) {
        if ((sel.sapphire ?? 0) !== 2) {
          return { ...s, nudge: "The final artifact requires Continuum. Gather 2 more." };
        }
      }

      const addedCrystals = { ...s.crystals };
      const flatGems: GemKey[] = [];
      for (const [k, v] of Object.entries(sel) as [GemKey, number][]) {
        addedCrystals[k] = (addedCrystals[k] ?? 0) + v;
        for (let i = 0; i < v; i++) flatGems.push(k);
      }
      const harvestTrigger = { type: "harvest" as const, gems: flatGems };

      const nextSubStep = s.subStep + 1;
      if (beatId === "b8_first_harness") {
        return { ...s, crystals: addedCrystals, wellSel: {}, nudge: null, beat: s.beat + 1, dlgLine: 0, subStep: 0, animTrigger: harvestTrigger };
      }
      return { ...s, crystals: addedCrystals, wellSel: {}, nudge: null, subStep: nextSubStep, animTrigger: harvestTrigger };
    }

    case "SET_VIEW": {
      const nextView = a.view;
      const beatId = beat.id;
      if (beatId === "b10_reserve" && nextView === "discounted" && s.subStep === 0) {
        return { ...s, view: nextView, subStep: 1, nudge: null };
      }
      if (beatId === "b10c_needed_peek" && nextView === "needed") {
        return { ...s, view: nextView, beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null, wellSel: {} };
      }
      if (beatId === "b12_tier2" && nextView === "needed" && s.subStep === 0) {
        return { ...s, view: nextView, subStep: 1, nudge: null };
      }
      return { ...s, view: nextView };
    }

    case "RESERVE": {
      const cardId = a.cardId;
      const beatId = beat.id;
      if (beatId === "b10_reserve") {
        if (cardId !== RESERVE_CARD_ID) {
          return { ...s, nudge: "Reserve the highlighted artifact." };
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
        if (s.subStep < 2) {
          return { ...s, nudge: "Gather the required affinities first." };
        }
        return { ...s, ...applyForge(s, cardId), beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null, view: "all", animTrigger: forgeTrigger };
      }

      if (beatId === "b13_tier3") {
        if (cardId === T3_IMPOSSIBLE_ID) {
          return { ...s, nudge: beat.wrongClickNudge ?? "That path is beyond this society's reach for now." };
        }
        if (!T3_PURCHASABLE_IDS.includes(cardId)) {
          return { ...s, nudge: beat.wrongClickNudge ?? "Choose a Verdance artifact." };
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
        if (s.subStep < 1) {
          return { ...s, nudge: "Gather the affinities first." };
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
        const eff = effectiveCost(card, s.bonuses);
        const shortfall = Object.entries(eff).reduce((acc, [k, need]) => {
          const have = s.crystals[k as GemKey] ?? 0;
          return acc + Math.max(0, need - have);
        }, 0);
        if (shortfall > 0) {
          if (s.crystals.flux > 0) {
            return { ...s, nudge: "Hold that Singularity for now. A harder path is coming." };
          }
          return { ...s, nudge: "Gather the required affinities first." };
        }
        const forgeResult = applyForge(s, cardId);
        const carriedCrystals = { ...(forgeResult.crystals ?? s.crystals) };
        carriedCrystals.onyx = (carriedCrystals.onyx ?? 0) + 1;
        return {
          ...s,
          ...forgeResult,
          crystals: carriedCrystals,
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
      const remaining = FAST_FORWARD_CARDS.filter(id => id !== s.t3choice);
      let nextState = { ...s, ffDone: true };
      for (const cardId of remaining) {
        const card = TUTORIAL_CARDS[cardId];
        if (!card) continue;
        const bonus = card.bonusColor as GemKey;
        nextState = {
          ...nextState,
          forged: [...nextState.forged, cardId],
          eminence: nextState.eminence + card.lumens,
          bonuses: {
            ...nextState.bonuses,
            [bonus]: (nextState.bonuses[bonus] ?? 0) + 1,
          },
        };
      }
      nextState.crystals = { ...nextState.crystals, sapphire: (nextState.crystals.sapphire ?? 0) + 3 };
      return { ...nextState, beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null };
    }

    case "LUM_DONE":
      return { ...s, lumDone: true, beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null };

    case "JUMP_BEAT": {
      const idx = Math.max(0, Math.min(a.toIndex, TUTORIAL_BEATS.length - 1));
      return { ...s, beat: idx, dlgLine: 0, subStep: 0, wellSel: {}, nudge: null, animTrigger: undefined };
    }

    default:
      return s;
  }
}
