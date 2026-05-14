import { useEffect, useReducer, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { GEM_META, type GemKey } from "@/lib/gemMeta";
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
  AFFINITY_SEQ_KEYS,
  AFFINITY_SEQ_NAMES,
  type TutorialCard,
  type TutorialMarketView,
} from "@/lib/tutorialData";
import { LuminarySummonCutscene, LuminaryPanelArt } from "@/lib/luminaryAssets";
import { gameAudio } from "@/lib/audio";
import backgroundCosmos from "@assets/generated_images/background_cosmos.png";

// ─── Card art ─────────────────────────────────────────────────────────────────
const CARD_ART_MODULES = import.meta.glob(
  "../../assets/cards/*.png",
  { eager: true, query: "?url", import: "default" }
) as Record<string, string>;
const CARD_ART: Record<string, string> = {};
for (const [path, url] of Object.entries(CARD_ART_MODULES)) {
  const id = path.split("/").pop()!.replace(".png", "");
  CARD_ART[id] = url;
}

// ─── Gem images ───────────────────────────────────────────────────────────────
const ALL_GEMS: GemKey[] = ["ruby", "sapphire", "emerald", "onyx", "pearl", "flux"];
const GEM_KEYS_NO_FLUX: GemKey[] = ["ruby", "sapphire", "emerald", "onyx", "pearl"];

// ─── State ────────────────────────────────────────────────────────────────────
interface TutState {
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
  animTrigger?: { type: "forge"; lumens: number; name: string } | { type: "harvest"; gems: GemKey[] };
}

const INIT_CRYSTALS: Record<GemKey, number> = {
  ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0,
};
const INIT_BONUSES: Record<GemKey, number> = {
  ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0, flux: 0,
};

const INIT_STATE: TutState = {
  beat: 0, dlgLine: 0, subStep: 0,
  crystals: { ...INIT_CRYSTALS },
  bonuses: { ...INIT_BONUSES },
  reserved: [], forged: [], eminence: 0,
  wellSel: {}, nudge: null, view: "all",
  t3choice: null, ffDone: false, lumDone: false, showLuminary: false,
  navigateTo: null,
};

type TAction =
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
  | { type: "LUM_DONE" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function effectiveCost(
  card: TutorialCard,
  bonuses: Record<GemKey, number>
): Partial<Record<GemKey, number>> {
  const out: Partial<Record<GemKey, number>> = {};
  for (const [k, v] of Object.entries(card.cost) as [GemKey, number][]) {
    if (v > 0) out[k] = Math.max(0, v - (bonuses[k] ?? 0));
  }
  return out;
}

function canAfford(
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
function reducer(s: TutState, a: TAction): TutState {
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
      const totalSel = Object.values({ ...s.wellSel, [a.gem]: next }).reduce((a, b) => a + b, 0);
      if (totalSel > 10) return { ...s, nudge: "You have reached the affinity limit. To gather more, release some affinity first." };
      return { ...s, wellSel: { ...s.wellSel, [a.gem]: next }, nudge: null };
    }

    case "CLEAR_SEL":
      return { ...s, wellSel: {}, nudge: null };

    case "HARNESS": {
      const sel = s.wellSel;
      const total = Object.values(sel).reduce((a, b) => a + b, 0);
      if (total === 0) return { ...s, nudge: "Select the affinities you need first." };

      const beatId = beat.id;

      // Beat 8: must select ruby:1, sap:1, pearl:1
      if (beatId === "b8_first_harness") {
        if ((sel.ruby ?? 0) !== 1 || (sel.sapphire ?? 0) !== 1 || (sel.pearl ?? 0) !== 1) {
          return { ...s, nudge: "Not yet. Follow the cost first — Flare, Continuum, and Radiance." };
        }
      }

      // Beat 11, subStep 0: must select onyx:2, pearl:1
      if (beatId === "b11_forge_reserved" && s.subStep === 0) {
        if ((sel.onyx ?? 0) !== 2 || (sel.pearl ?? 0) !== 1) {
          return { ...s, nudge: "Gather the Abyss and Radiance affinities shown in the cost." };
        }
      }

      // Beat 12, subStep 1: must select onyx:3
      if (beatId === "b12_tier2" && s.subStep === 1) {
        if ((sel.onyx ?? 0) !== 3) {
          return { ...s, nudge: "Gather the Abyss affinities — Singularity will bridge the Verdance gap." };
        }
      }

      // Beat 16, subStep 0: must harness sapphire:2
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

      // Beat 9: must forge FIRST_FORGE_ID
      const forgeTrigger = { type: "forge" as const, lumens: card.lumens, name: card.name };

      if (beatId === "b9_first_forge") {
        if (cardId !== FIRST_FORGE_ID) {
          return { ...s, nudge: "Forge the artifact Lumii highlighted." };
        }
        return { ...s, ...applyForge(s, cardId), beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null, animTrigger: forgeTrigger };
      }

      // Beat 12: must forge TIER2_SINGULARITY_ID
      if (beatId === "b12_tier2") {
        if (cardId !== TIER2_SINGULARITY_ID) {
          return { ...s, nudge: "Forge the Verdance artifact Lumii highlighted." };
        }
        if (s.subStep < 2) {
          return { ...s, nudge: "Gather the required affinities first." };
        }
        return { ...s, ...applyForge(s, cardId), beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null, view: "all", animTrigger: forgeTrigger };
      }

      // Beat 13: must forge one of the Tier 3 Verdance cards
      if (beatId === "b13_tier3") {
        if (cardId === T3_IMPOSSIBLE_ID) {
          return { ...s, nudge: beat.wrongClickNudge ?? "That path is beyond this society's reach for now." };
        }
        if (!T3_PURCHASABLE_IDS.includes(cardId)) {
          return { ...s, nudge: beat.wrongClickNudge ?? "Choose a Verdance artifact." };
        }
        const forgeResult = applyForge(s, cardId);
        const t13Trigger = { type: "forge" as const, lumens: card.lumens, name: card.name };
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

      // Beat 16: final forge
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

      // Beat 11: forge the reserved Tier 1 card (no flux allowed)
      if (beatId === "b11_forge_reserved") {
        if (cardId !== RESERVE_CARD_ID) {
          return { ...s, nudge: "Forge the reserved artifact." };
        }
        if (s.subStep < 1) {
          return { ...s, nudge: "Gather the required affinities first." };
        }
        // Block flux usage
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
        return {
          ...s,
          ...forgeResult,
          reserved: s.reserved.filter(id => id !== cardId),
          beat: s.beat + 1,
          dlgLine: 0,
          subStep: 0,
          nudge: null,
          animTrigger: { type: "forge" as const, lumens: card.lumens, name: card.name },
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
        // dialogue-completion beats (b0, b3): response = advance beat
        return { ...s, beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null };
      }
      // act/semiOpen beats (b13): response = dismiss dialogue, player now acts freely
      return { ...s, dlgLine: beat.dialogue.length, nudge: null };
    }

    case "NUDGE":
      return { ...s, nudge: a.msg };

    case "FF_DONE": {
      // Inject fast-forward state: two remaining Tier 3 Verdance cards
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
      // Give player starting crystals for beat 16
      nextState.crystals = { ...nextState.crystals, sapphire: (nextState.crystals.sapphire ?? 0) + 3 };
      return { ...nextState, beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null };
    }

    case "LUM_DONE":
      return { ...s, lumDone: true, beat: s.beat + 1, dlgLine: 0, subStep: 0, nudge: null };

    default:
      return s;
  }
}

// ─── LumiiOrb ─────────────────────────────────────────────────────────────────
function LumiiOrb({ size = 64, excited = false }: { size?: number; excited?: boolean }) {
  const blur = Math.round(size * 0.45);
  const mask = "radial-gradient(circle, rgba(0,0,0,0.95) 22%, rgba(0,0,0,0.45) 52%, transparent 74%)";
  return (
    <div style={{ width: size, height: size, position: "relative", pointerEvents: "none" }}>
      <motion.div
        animate={{ scale: excited ? [1, 1.4, 1.1, 1.4, 1] : [1, 1.18, 1], opacity: excited ? [0.7, 1, 0.78, 1, 0.7] : [0.52, 0.84, 0.52] }}
        transition={{ duration: excited ? 1.6 : 3.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "absolute", inset: "-62%", borderRadius: "50%", background: "conic-gradient(from 0deg,#f97316aa,#3b82f6aa,#22c55eaa,#a855f7aa,#e2e8f066,#fbbf24aa,#f97316aa)", filter: `blur(${blur}px)` }}
      />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: excited ? 4.5 : 11, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", inset: 0, borderRadius: "50%", background: "conic-gradient(from 0deg,#f97316cc,#fbbf2499,#22c55ecc,#3b82f6cc,#a855f7cc,#e2e8f055,#f97316cc)", maskImage: mask, WebkitMaskImage: mask }}
      />
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: excited ? 7 : 17, repeat: Infinity, ease: "linear" }}
        style={{ position: "absolute", inset: "13%", borderRadius: "50%", background: "conic-gradient(from 90deg,#3b82f6bb,#22c55e99,#fbbf24bb,#a855f7bb,#f9731699,#3b82f6bb)", maskImage: mask, WebkitMaskImage: mask }}
      />
      <div style={{ position: "absolute", inset: "30%", borderRadius: "50%", background: "radial-gradient(circle,rgba(255,255,255,0.92) 0%,rgba(220,240,255,0.65) 45%,transparent 70%)", boxShadow: "0 0 12px 4px rgba(180,220,255,0.5)" }} />
    </div>
  );
}

// ─── MiniGem ──────────────────────────────────────────────────────────────────
function MiniGem({ gem, size = 14 }: { gem: GemKey; size?: number }) {
  const meta = GEM_META[gem];
  return (
    <img
      src={meta.image}
      alt={meta.name}
      style={{ width: size, height: size, objectFit: "contain", filter: `drop-shadow(0 0 3px ${meta.glowHex}88)` }}
      draggable={false}
    />
  );
}

// ─── DialogueBox ──────────────────────────────────────────────────────────────
function DialogueBox({
  lines, lineIndex, onTap, nudge, mode, showOrb = true,
  playerResponse, onPlayerResponse, choices, onChoice,
}: {
  lines: { text: string }[];
  lineIndex: number;
  onTap: () => void;
  nudge: string | null;
  mode: string;
  showOrb?: boolean;
  playerResponse?: string;
  onPlayerResponse?: () => void;
  choices?: { label: string; value: string }[];
  onChoice?: (value: string) => void;
}) {
  const text = nudge ?? (lines[lineIndex]?.text ?? "");
  const isLast = lineIndex >= lines.length - 1;
  const isPassiveMode = mode === "listen" || mode === "look";
  const showChoices    = !nudge && isLast && !!choices?.length && !!onChoice;
  const showResponseBtn = !showChoices && !nudge && isLast && !!playerResponse && !!onPlayerResponse;
  const canTap = !showResponseBtn && !showChoices && (isPassiveMode || !isLast);

  const hintText = (() => {
    if (nudge || showResponseBtn || showChoices) return null;
    if (!isLast) return "tap to continue";
    if (isPassiveMode) return "tap to continue";
    return null;
  })();

  return (
    <motion.div
      key={nudge ? "nudge" : `line-${lineIndex}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="relative"
    >
      <div
        className={`bg-slate-950/95 border border-white/10 rounded-2xl px-5 py-4 max-w-sm mx-auto shadow-2xl backdrop-blur-md select-none ${canTap ? "cursor-pointer" : ""}`}
        onClick={canTap ? onTap : undefined}
        style={{ boxShadow: nudge ? "0 0 0 2px rgba(251,191,36,0.5), 0 8px 32px rgba(0,0,0,0.8)" : "0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.9)" }}
      >
        <div className="flex items-start gap-3">
          {showOrb && <LumiiOrb size={32} excited={!!nudge} />}
          <div className="flex-1">
            <p className="text-sm text-white/90 leading-relaxed">{text}</p>
            {hintText && (
              <p className="text-[10px] text-white/35 mt-2">{hintText}</p>
            )}
          </div>
        </div>
        {showResponseBtn && (
          <motion.button
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            onClick={onPlayerResponse}
            className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium tracking-wide text-amber-200 select-none cursor-pointer"
            style={{
              background: "rgba(251,191,36,0.08)",
              border: "1px solid rgba(251,191,36,0.3)",
              boxShadow: "0 0 12px rgba(251,191,36,0.1)",
            }}
          >
            {playerResponse}
          </motion.button>
        )}
        {showChoices && (
          <div className="mt-3 flex flex-col gap-2">
            {choices!.map((c, i) => (
              <motion.button
                key={c.value}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
                onClick={() => onChoice!(c.value)}
                className="w-full py-2.5 rounded-xl text-sm font-medium tracking-wide select-none cursor-pointer transition-all active:scale-[0.98]"
                style={i === 0 ? {
                  background: "rgba(251,191,36,0.12)",
                  border: "1px solid rgba(251,191,36,0.45)",
                  boxShadow: "0 0 16px rgba(251,191,36,0.15)",
                  color: "rgba(253,230,138,1)",
                } : {
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.55)",
                }}
              >
                {c.label}
              </motion.button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── TutorialCard ─────────────────────────────────────────────────────────────
function TutorialCard({
  card,
  bonuses,
  crystals,
  onForge,
  onReserve,
  forgeEnabled,
  reserveEnabled,
  highlighted,
  foreground,
  forged,
  impossible,
}: {
  card: TutorialCard;
  bonuses: Record<GemKey, number>;
  crystals: Record<GemKey, number>;
  onForge?: () => void;
  onReserve?: () => void;
  forgeEnabled?: boolean;
  reserveEnabled?: boolean;
  highlighted?: boolean;
  foreground?: boolean;
  forged?: boolean;
  impossible?: boolean;
}) {
  const eff = effectiveCost(card, bonuses);
  const artUrl = CARD_ART[card.id];
  const bonusMeta = GEM_META[card.bonusColor];
  const affordable = canAfford(card, crystals, bonuses);

  const bgStyle: React.CSSProperties = artUrl
    ? { backgroundImage: `url(${artUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: `linear-gradient(175deg, #021005 0%, #063020 50%, #020c04 100%)` };

  return (
    <motion.div
      animate={foreground ? { scale: 1.08, y: -8 } : { scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative shrink-0"
      style={{ width: foreground ? 112 : 88, height: foreground ? 156 : 124 }}
    >
      <div
        className={`absolute inset-0 rounded-xl overflow-hidden shadow-xl ${highlighted ? "ring-2 ring-amber-400 shadow-amber-400/30" : "ring-1 ring-white/10"} ${forged ? "opacity-40 grayscale" : ""} ${impossible ? "opacity-50" : ""}`}
        style={bgStyle}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/5 to-black/90" />
        {highlighted && (
          <motion.div
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="absolute inset-0 bg-amber-400/15 rounded-xl"
          />
        )}
        <div className="relative z-10 h-full p-2 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-base font-serif font-bold text-white drop-shadow">{card.lumens > 0 ? card.lumens : ""}</span>
            <div className="w-4 h-4 rounded-full ring-1 ring-black/40 overflow-hidden">
              <img src={bonusMeta.image} alt={bonusMeta.name} className="w-full h-full object-contain" draggable={false} />
            </div>
          </div>
          <div className="space-y-1">
            <div className="text-[8px] font-semibold text-white drop-shadow line-clamp-2 leading-tight">{card.name}</div>
            <div className="flex flex-wrap gap-0.5 justify-end">
              {(Object.entries(card.cost) as [GemKey, number][]).map(([k, v]) => {
                if (!v || v <= 0) return null;
                const ek = eff[k] ?? 0;
                const reduced = ek < v;
                const free = ek === 0;
                return (
                  <div key={k} className={`flex items-center gap-0.5 rounded px-1 py-0.5 ${free ? "bg-green-900/80" : reduced ? "bg-blue-900/80" : "bg-black/60"}`}>
                    {reduced && !free && <span className="text-[6px] text-white/30 line-through mr-0.5">{v}</span>}
                    <span className={`text-[9px] font-bold ${free ? "text-green-300" : reduced ? "text-blue-200" : "text-white"}`}>{free ? "✓" : ek}</span>
                    <MiniGem gem={k} size={9} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {forged && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-white/50 font-semibold bg-black/60 rounded px-2 py-0.5">Forged</span>
          </div>
        )}
      </div>
      {!forged && (
        <div className="absolute -bottom-9 left-0 right-0 flex gap-1 justify-center">
          {onForge && (
            <button
              onClick={forgeEnabled ? onForge : undefined}
              disabled={!forgeEnabled || !affordable}
              className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-all ${forgeEnabled && affordable ? "bg-amber-500 text-black hover:bg-amber-400 shadow-lg" : "bg-white/8 text-white/30 cursor-not-allowed"}`}
            >Forge</button>
          )}
          {onReserve && (
            <button
              onClick={reserveEnabled ? onReserve : undefined}
              disabled={!reserveEnabled}
              className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-all ${reserveEnabled ? "bg-blue-600 text-white hover:bg-blue-500 shadow-lg" : "bg-white/8 text-white/30 cursor-not-allowed"}`}
            >Reserve</button>
          )}
        </div>
      )}
    </motion.div>
  );
}

// ─── Affinity Well ─────────────────────────────────────────────────────────────
function AffinityWell({
  s, dispatch, beatId, subStep, wellEnabled,
}: {
  s: TutState;
  dispatch: React.Dispatch<TAction>;
  beatId: string;
  subStep: number;
  wellEnabled: boolean;
}) {
  const totalSel = Object.values(s.wellSel).reduce((a, b) => a + b, 0);

  // Compute which gems should be highlighted per beat/subStep
  const guidedGems: Partial<Record<GemKey, number>> = (() => {
    if (beatId === "b8_first_harness") return { ruby: 1, sapphire: 1, pearl: 1 };
    if (beatId === "b11_forge_reserved" && subStep === 0) return { onyx: 2, pearl: 1 };
    if (beatId === "b12_tier2" && subStep === 1) return { onyx: 3 };
    if (beatId === "b16_final_forge" && subStep === 0) return { sapphire: 2 };
    return {};
  })();

  const isGuidedBeat = Object.keys(guidedGems).length > 0;

  return (
    <div className="border border-white/10 rounded-2xl p-3 backdrop-blur-md" style={{ background: "rgba(3,3,12,0.78)" }}>
      <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2">Affinity Well</div>
      <div className="flex gap-3 flex-wrap justify-center mb-3">
        {GEM_KEYS_NO_FLUX.map(gem => {
          const meta = GEM_META[gem];
          const cur = s.wellSel[gem] ?? 0;
          const guided = guidedGems[gem] ?? 0;
          const isHighlighted = isGuidedBeat && guided > 0;
          const canAdd = wellEnabled && (!isGuidedBeat || guided > cur);
          const canRemove = wellEnabled && cur > 0;

          return (
            <div key={gem} className="flex flex-col items-center gap-1.5">
              {/* Tap gem orb to add; shows selected count as badge */}
              <motion.button
                animate={isHighlighted && cur < guided ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                transition={{ duration: 1.1, repeat: Infinity }}
                onClick={() => canAdd ? dispatch({ type: "SEL_AFF", gem, delta: 1 }) : undefined}
                disabled={!canAdd}
                className={`relative w-14 h-14 rounded-full border-2 flex items-center justify-center transition-all
                  ${isHighlighted ? "shadow-[0_0_12px_rgba(251,191,36,0.6)]" : ""}
                  ${canAdd ? "cursor-pointer active:scale-90" : "cursor-default opacity-40"}
                  ${cur > 0 ? "bg-white/10" : "bg-black/30"}`}
                style={{ borderColor: cur > 0 ? meta.hex : isHighlighted ? "#fbbf24" : "rgba(255,255,255,0.15)" }}
              >
                <img src={meta.image} alt={meta.name} className="w-8 h-8 object-contain" draggable={false} />
                {cur > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center text-white shadow"
                    style={{ background: meta.hex }}
                  >{cur}</span>
                )}
              </motion.button>
              {/* Minus button — only visible when cur > 0 */}
              <button
                onClick={() => canRemove ? dispatch({ type: "SEL_AFF", gem, delta: -1 }) : undefined}
                disabled={!canRemove}
                className={`text-[10px] font-bold w-6 h-5 rounded transition-all
                  ${canRemove ? "bg-white/10 text-white/70 hover:bg-white/20" : "opacity-0 pointer-events-none"}`}
              >−</button>
            </div>
          );
        })}
      </div>
      <div className="flex gap-2 items-center justify-between">
        <div className="text-[10px] text-white/40">
          {totalSel > 0 ? `${totalSel} selected` : "Tap a gem to select it"}
        </div>
        <div className="flex gap-1">
          {totalSel > 0 && (
            <button
              onClick={() => dispatch({ type: "CLEAR_SEL" })}
              className="text-[10px] px-2 py-1.5 rounded-lg bg-white/8 text-white/50 hover:bg-white/15"
            >Clear</button>
          )}
          <button
            onClick={() => wellEnabled && totalSel > 0 ? dispatch({ type: "HARNESS" }) : undefined}
            disabled={!wellEnabled || totalSel === 0}
            className={`text-[11px] font-bold px-4 py-1.5 rounded-lg transition-all ${wellEnabled && totalSel > 0 ? "bg-emerald-600 text-white hover:bg-emerald-500 shadow-md" : "bg-white/8 text-white/20 cursor-not-allowed"}`}
          >Harness</button>
        </div>
      </div>
    </div>
  );
}

// ─── Player Hand (reserved) ───────────────────────────────────────────────────
function PlayerHand({ s, dispatch, beatId, subStep }: { s: TutState; dispatch: React.Dispatch<TAction>; beatId: string; subStep: number }) {
  if (s.reserved.length === 0) return null;
  const isForgeReservedBeat = beatId === "b11_forge_reserved";
  const forgeEnabled = isForgeReservedBeat && subStep >= 1;

  return (
    <div className="border border-white/10 rounded-2xl p-3 backdrop-blur-md" style={{ background: "rgba(3,3,12,0.78)" }}>
      <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2">Reserved</div>
      <div className="flex gap-3 flex-wrap">
        {s.reserved.map(id => {
          const card = TUTORIAL_CARDS[id];
          if (!card) return null;
          const isHighlighted = isForgeReservedBeat;
          return (
            <div key={id} className="mb-10">
              <TutorialCard
                card={card}
                bonuses={s.bonuses}
                crystals={s.crystals}
                onForge={() => dispatch({ type: "FORGE_RESERVED", cardId: id })}
                forgeEnabled={forgeEnabled}
                highlighted={isHighlighted}
                foreground={isHighlighted}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Player Storage (forged) ──────────────────────────────────────────────────
function PlayerStorage({ s, highlighted }: { s: TutState; highlighted: boolean }) {
  const bonusTotals: Partial<Record<GemKey, number>> = {};
  for (const [k, v] of Object.entries(s.bonuses) as [GemKey, number][]) {
    if (v > 0) bonusTotals[k] = v;
  }

  return (
    <div className={`border rounded-2xl p-3 backdrop-blur-md transition-all ${highlighted ? "border-amber-400/50 shadow-amber-400/20 shadow-lg" : "border-white/10"}`}
      style={{ background: "rgba(3,3,12,0.78)" }}>
      <div className="flex justify-between items-center mb-2">
        <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider">Forged Artifacts</div>
        {Object.keys(bonusTotals).length > 0 && (
          <div className="flex gap-1">
            {(Object.entries(bonusTotals) as [GemKey, number][]).map(([k, v]) => (
              <div key={k} className="flex items-center gap-0.5 bg-black/40 rounded px-1.5 py-0.5">
                <span className="text-[9px] text-emerald-300 font-bold">+{v}</span>
                <MiniGem gem={k} size={9} />
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-1 flex-wrap min-h-[36px] items-center">
        {s.forged.length === 0 && <span className="text-[10px] text-white/20">No artifacts yet</span>}
        {s.forged.map(id => {
          const card = TUTORIAL_CARDS[id];
          if (!card) return null;
          const bonusMeta = GEM_META[card.bonusColor];
          return (
            <div key={id} className="flex items-center gap-1 bg-black/40 rounded-lg px-2 py-1 border border-white/10">
              <img src={bonusMeta.image} alt="" className="w-3 h-3 object-contain" draggable={false} />
              <span className="text-[8px] text-white/70">{card.name}</span>
              {card.lumens > 0 && <span className="text-[8px] font-bold text-amber-300">+{card.lumens}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Player Stats ─────────────────────────────────────────────────────────────
function PlayerStats({ s, highlighted }: { s: TutState; highlighted: boolean }) {
  return (
    <div className={`border rounded-2xl p-3 backdrop-blur-md transition-all ${highlighted ? "border-amber-400/50 shadow-amber-400/20 shadow-lg" : "border-white/10"}`}
      style={{ background: "rgba(3,3,12,0.82)" }}>
      {/* Eminence row */}
      <div className="flex items-center gap-3 mb-2.5">
        <div>
          <div className="text-[9px] text-white/40 uppercase tracking-wider">Eminence</div>
          <motion.div
            key={s.eminence}
            initial={{ scale: 1.3, color: "#fbbf24" }}
            animate={{ scale: 1, color: "#ffffff" }}
            className="text-2xl font-serif font-bold text-white leading-none"
          >{s.eminence}</motion.div>
          <div className="text-[9px] text-white/30">of 15</div>
        </div>
        <div className="flex-1 bg-white/5 rounded-full h-1.5">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
            animate={{ width: `${Math.min(100, (s.eminence / 15) * 100)}%` }}
            transition={{ type: "spring", stiffness: 100 }}
          />
        </div>
      </div>
      {/* 6-column affinity boxes — matches the game's player panel */}
      <div className="flex gap-1">
        {ALL_GEMS.map(gem => {
          const meta = GEM_META[gem];
          const held = s.crystals[gem] ?? 0;
          const bonus = gem !== "flux" ? (s.bonuses[gem] ?? 0) : 0;
          const reserved = gem === "flux" ? s.reserved.length : 0;
          const hasContent = gem === "flux" ? (held > 0 || reserved > 0) : (held > 0 || bonus > 0);
          return (
            <div
              key={gem}
              className="flex-1 min-h-[64px] flex flex-col items-center gap-0.5 rounded-lg relative overflow-hidden pt-1.5 pb-1.5"
              style={{
                background: hasContent
                  ? `linear-gradient(180deg, #060611 0%, ${meta.hex}33 100%)`
                  : "linear-gradient(180deg, #07070b 0%, #0e0e14 100%)",
                border: `1px solid ${hasContent ? meta.hex + "AA" : meta.hex + "22"}`,
                boxShadow: hasContent ? `inset 0 0 14px ${meta.hex}22, 0 0 8px ${meta.hex}33` : "none",
              }}
            >
              {hasContent && (
                <div className="absolute inset-x-0 top-0 h-[1px]"
                  style={{ background: `linear-gradient(90deg, transparent, ${meta.glowHex}AA, transparent)` }} />
              )}
              <div className="flex items-center gap-0.5 justify-center">
                <span className="text-[7px] font-semibold tracking-wide leading-none truncate"
                  style={{ color: meta.glowHex }}>{meta.shortName}</span>
                <MiniGem gem={gem} size={7} />
              </div>
              <span
                className="text-xl font-black leading-none tracking-tight"
                style={{
                  color: hasContent ? "#fff" : meta.hex + "40",
                  textShadow: hasContent ? `0 0 10px ${meta.glowHex}` : "none",
                }}
              >{held}</span>
              {gem !== "flux" && bonus > 0 && (
                <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>+{bonus}</span>
              )}
              {gem === "flux" && reserved > 0 && (
                <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>{reserved}r</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Market view tabs ─────────────────────────────────────────────────────────
function MarketTabs({
  view, dispatch, beatId, subStep, highlightDiscounted, highlightNeeded,
}: {
  view: TutorialMarketView;
  dispatch: React.Dispatch<TAction>;
  beatId: string;
  subStep: number;
  highlightDiscounted: boolean;
  highlightNeeded: boolean;
}) {
  const tabs: { key: TutorialMarketView; label: string }[] = [
    { key: "all", label: "All" },
    { key: "discounted", label: "Discounted" },
    { key: "needed", label: "Needed" },
  ];
  return (
    <div className="flex gap-1 mb-3">
      {tabs.map(tab => {
        const isActive = view === tab.key;
        const isHl = (tab.key === "discounted" && highlightDiscounted) || (tab.key === "needed" && highlightNeeded);
        return (
          <motion.button
            key={tab.key}
            onClick={() => dispatch({ type: "SET_VIEW", view: tab.key })}
            animate={isHl ? { boxShadow: ["0 0 0px transparent", "0 0 10px rgba(251,191,36,0.6)", "0 0 0px transparent"] } : {}}
            transition={{ duration: 1.5, repeat: Infinity }}
            className={`text-[10px] font-semibold px-3 py-1.5 rounded-lg transition-all ${isActive ? "bg-white/15 text-white" : "bg-black/30 text-white/40 hover:bg-white/8"} ${isHl ? "ring-1 ring-amber-400" : ""}`}
          >{tab.label}</motion.button>
        );
      })}
    </div>
  );
}

// ─── Scripted Market ──────────────────────────────────────────────────────────
function ScriptedMarket({ s, dispatch, beatId, subStep }: {
  s: TutState;
  dispatch: React.Dispatch<TAction>;
  beatId: string;
  subStep: number;
}) {
  const inFF = beatId === "b15_fast_forward" || s.ffDone;

  // Determine which cards appear per tier per beat phase
  const t1Cards: string[] = [];
  const t2Cards: string[] = [];
  const t3Cards: string[] = [];

  const earlyBeats = ["b6_forge_appears", "b7_artifact_cost", "b8_first_harness", "b9_first_forge", "b9b_forge_complete"];
  const midBeats = ["b10_reserve", "b10b_reserve_granted", "b11_forge_reserved", "b12_tier2"];
  const lateBeats = ["b13_tier3", "b14_win_condition", "b15_fast_forward"];
  const finalBeat = ["b16_final_forge"];

  if (earlyBeats.includes(beatId)) {
    t1Cards.push(FIRST_FORGE_ID);
  } else if (midBeats.includes(beatId)) {
    if (!s.forged.includes(FIRST_FORGE_ID)) t1Cards.push(FIRST_FORGE_ID);
    else t1Cards.push(FIRST_FORGE_ID); // show as forged
    t1Cards.push(RESERVE_CARD_ID);
    if (!s.forged.includes(TIER2_SINGULARITY_ID) && !s.reserved.includes(TIER2_SINGULARITY_ID)) {
      t2Cards.push(TIER2_SINGULARITY_ID);
    }
  } else if (lateBeats.includes(beatId)) {
    t3Cards.push(...T3_PURCHASABLE_IDS, T3_IMPOSSIBLE_ID);
  } else if (finalBeat.includes(beatId)) {
    t2Cards.push(FINAL_T2_ID);
  }

  // Beat-specific card interactions
  const isForgeMarketBeat = ["b9_first_forge", "b12_tier2", "b13_tier3", "b16_final_forge"].includes(beatId);
  const isReserveBeat = beatId === "b10_reserve";
  const highlightDiscounted = beatId === "b10_reserve";
  const highlightNeeded = beatId === "b12_tier2" && subStep === 0;

  const getCardForgeEnabled = (cardId: string) => {
    if (!isForgeMarketBeat) return false;
    if (beatId === "b9_first_forge") return cardId === FIRST_FORGE_ID;
    if (beatId === "b12_tier2") return cardId === TIER2_SINGULARITY_ID && subStep >= 2;
    if (beatId === "b13_tier3") return T3_PURCHASABLE_IDS.includes(cardId);
    if (beatId === "b16_final_forge") return cardId === FINAL_T2_ID && subStep >= 1;
    return false;
  };

  const getCardReserveEnabled = (cardId: string) => {
    if (!isReserveBeat) return false;
    return cardId === RESERVE_CARD_ID && (s.subStep >= 1 || subStep >= 1);
  };

  const getHighlighted = (cardId: string) => {
    if (beatId === "b6_forge_appears" || beatId === "b7_artifact_cost") return cardId === FIRST_FORGE_ID;
    if (beatId === "b9_first_forge") return cardId === FIRST_FORGE_ID;
    if (beatId === "b10_reserve") return cardId === RESERVE_CARD_ID && (s.subStep >= 1 || subStep >= 1);
    if (beatId === "b12_tier2") return cardId === TIER2_SINGULARITY_ID;
    if (beatId === "b13_tier3") return T3_PURCHASABLE_IDS.includes(cardId) && !s.forged.includes(cardId);
    if (beatId === "b16_final_forge") return cardId === FINAL_T2_ID;
    return false;
  };

  const getForeground = (cardId: string) => {
    if (beatId === "b6_forge_appears" || beatId === "b7_artifact_cost") return cardId === FIRST_FORGE_ID;
    if (beatId === "b9_first_forge") return cardId === FIRST_FORGE_ID;
    if (beatId === "b12_tier2") return cardId === TIER2_SINGULARITY_ID;
    if (beatId === "b16_final_forge") return cardId === FINAL_T2_ID;
    return false;
  };

  const filterByView = (cardId: string): boolean => {
    const card = TUTORIAL_CARDS[cardId];
    if (!card) return false;
    if (s.view === "all") return true;
    if (s.view === "discounted") {
      return Object.entries(card.cost).some(([k, v]) => (v as number) > 0 && (s.bonuses[k as GemKey] ?? 0) > 0);
    }
    if (s.view === "needed") {
      return card.bonusColor === "emerald";
    }
    return true;
  };

  const renderTierRow = (tier: number, cardIds: string[], label: string) => {
    if (cardIds.length === 0) return null;
    const visible = cardIds.filter(id => {
      if (id === T3_IMPOSSIBLE_ID) return s.view === "all"; // impossible only shows in "all"
      return filterByView(id);
    });
    if (visible.length === 0) return null;
    return (
      <div key={tier} className="mb-4">
        <div className="text-[9px] text-white/30 font-semibold uppercase tracking-wider mb-3">Tier {tier} — {label}</div>
        <div className="flex gap-3 overflow-x-auto pb-2">
          {visible.map(cardId => {
            const card = TUTORIAL_CARDS[cardId];
            if (!card) return null;
            const isForged = s.forged.includes(cardId);
            const isReserved = s.reserved.includes(cardId);
            if (isReserved) return null;
            const isImpossible = cardId === T3_IMPOSSIBLE_ID;
            return (
              <div key={cardId} className="mb-10">
                <TutorialCard
                  card={card}
                  bonuses={s.bonuses}
                  crystals={s.crystals}
                  onForge={isImpossible ? () => dispatch({ type: "NUDGE", msg: TUTORIAL_BEATS[s.beat]?.wrongClickNudge ?? "That artifact is beyond reach right now." }) : () => dispatch({ type: "FORGE_MARKET", cardId })}
                  onReserve={!isImpossible ? () => dispatch({ type: "RESERVE", cardId }) : undefined}
                  forgeEnabled={getCardForgeEnabled(cardId)}
                  reserveEnabled={getCardReserveEnabled(cardId)}
                  highlighted={getHighlighted(cardId)}
                  foreground={getForeground(cardId)}
                  forged={isForged}
                  impossible={isImpossible}
                />
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div>
      <MarketTabs
        view={s.view}
        dispatch={dispatch}
        beatId={beatId}
        subStep={subStep}
        highlightDiscounted={highlightDiscounted}
        highlightNeeded={highlightNeeded}
      />
      {renderTierRow(3, t3Cards, "Frontier")}
      {renderTierRow(2, t2Cards, "Ascendant")}
      {renderTierRow(1, t1Cards, "Foundation")}
    </div>
  );
}

// ─── Fullscreen Shatter Overlay ───────────────────────────────────────────────
// Matches the exact phase structure, 4-layer crack paint, 3-D shard scatter,
// and audio timing of the Luminary summon cutscene.

const FS_PHASE_ORDER = [
  'pressure', 'firstcrack', 'leaking', 'secondcrack',
  'cracking', 'shattering', 'flashing', 'gone',
] as const;
type FSPhase = typeof FS_PHASE_ORDER[number];

// Phase durations (ms) — identical to PHASE_DURATIONS in luminaryAssets.tsx
const FS_DURS: Partial<Record<FSPhase, number>> = {
  pressure: 90, firstcrack: 320, leaking: 850, secondcrack: 360,
  cracking: 1100, shattering: 1000, flashing: 950,
};

// Six-shard geometry — same polygon network as PANEL_PIECES in luminaryAssets,
// already expressed in percentage coordinates so they tile the full viewport.
const FS_SHARDS = [
  { clip: 'polygon(0% 0%, 35.7% 0%, 28.6% 15%, 50% 42.5%, 39.3% 40%, 19.6% 37.5%, 0% 40%)',
    dx: '-38%', dy: '-32%', rX: -12, rY:   9, rZ:  10 },
  { clip: 'polygon(35.7% 0%, 100% 0%, 100% 35%, 60.7% 35%, 50% 42.5%, 28.6% 15%)',
    dx:  '36%', dy: '-30%', rX: -10, rY: -10, rZ:  -9 },
  { clip: 'polygon(0% 40%, 19.6% 37.5%, 39.3% 40%, 50% 42.5%, 41.1% 57.5%, 25% 72.5%, 16.1% 76.25%, 0% 80%)',
    dx: '-42%', dy:   '3%', rX:   4, rY:  11, rZ:   7 },
  { clip: 'polygon(100% 35%, 100% 72.5%, 71.4% 70%, 46.4% 70%, 25% 72.5%, 41.1% 57.5%, 50% 42.5%, 60.7% 35%)',
    dx:  '44%', dy:   '2%', rX:  -3, rY: -12, rZ:  -6 },
  { clip: 'polygon(25% 72.5%, 33.9% 85%, 39.3% 100%, 0% 100%, 0% 80%, 16.1% 76.25%)',
    dx: '-32%', dy:  '36%', rX:  13, rY:   8, rZ:  12 },
  { clip: 'polygon(25% 72.5%, 46.4% 70%, 71.4% 70%, 100% 72.5%, 100% 100%, 39.3% 100%, 33.9% 85%)',
    dx:  '30%', dy:  '36%', rX:  11, rY:  -9, rZ: -10 },
] as const;

// Crack network — paths in viewBox 0-100 using the same percentage coords
// as the shard polygon vertices (junction P=50,42.5  Q=25,72.5).
type CrackDef = { d: string; d1: number; isDetail?: true };

const FS_CRACKS_1: CrackDef[] = [
  { d: 'M35.7,0 L28.6,15 L50,42.5',           d1: 0.00 }, // main  TA→K1→P
  { d: 'M50,42.5 L60.7,35 L100,35',            d1: 0.06 }, // branch P→K2→RA
  { d: 'M50,42.5 L39.3,40 L19.6,37.5 L0,40',  d1: 0.08 }, // branch P→K3a→K3b→LA2
  { d: 'M28.6,15 L19.6,8.75 L10.7,3.1',        d1: 0.05, isDetail: true },
];
const FS_CRACKS_2: CrackDef[] = [
  { d: 'M50,42.5 L41.1,57.5 L25,72.5 L33.9,85 L39.3,100', d1: 0.00 }, // main P→K4→Q→K8→BA
  { d: 'M25,72.5 L46.4,70 L71.4,70 L100,72.5',            d1: 0.22 }, // branch Q→K5→K6→RB
  { d: 'M25,72.5 L16.1,76.25 L0,80',                      d1: 0.25 }, // branch Q→K7→LA
  { d: 'M41.1,57.5 L33.9,52.5 L25,51.25',                 d1: 0.20, isDetail: true },
];

const FSO_GOLD = '#fbbf24';

// 4-layer crack painter: white snap → chasing glow → residual wound → tinted seam
// Stroke widths are scaled for a 100-unit viewBox rendered at ~1280 px wide.
function FSOCrack({ d, d1, isDetail }: CrackDef) {
  if (isDetail) {
    return (
      <motion.path d={d} stroke="white" strokeWidth="0.18" fill="none"
        filter="url(#fso-cgb)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0.65, 0.55] }}
        transition={{ duration: 0.08, delay: d1, ease: 'easeOut' }}
      />
    );
  }
  return (
    <>
      {/* L1 white snap */}
      <motion.path d={d} stroke="white" strokeWidth="0.22" fill="none"
        filter="url(#fso-cgb)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 1.0, 0.95] }}
        transition={{ duration: 0.10, delay: d1, ease: 'easeOut' }}
      />
      {/* L2 chasing glow */}
      <motion.path d={d} stroke={FSO_GOLD} strokeWidth="3.5" fill="none"
        filter="url(#fso-cgw)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0.80, 0.20, 0] }}
        transition={{
          pathLength: { duration: 0.28, delay: d1 + 0.04, ease: 'easeOut' },
          opacity:    { duration: 0.56, delay: d1 + 0.04, times: [0, 0.14, 0.55, 1.0] },
        }}
      />
      {/* L3 residual wound glow */}
      <motion.path d={d} stroke={FSO_GOLD} strokeWidth="2.2" fill="none"
        filter="url(#fso-cgw)"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0, 0.46, 0.64, 0.56] }}
        transition={{ duration: 0.62, delay: d1 + 0.14, ease: 'easeOut' }}
      />
      {/* L4 tinted seam */}
      <motion.path d={d} stroke={FSO_GOLD} strokeWidth="0.45" fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: [0, 0, 0.32, 0.52, 0.45] }}
        transition={{ duration: 0.58, delay: d1 + 0.16, ease: 'easeOut' }}
      />
    </>
  );
}

function FullscreenShatterOverlay({ onDone, onRevealCosmos, onShattering }: {
  onDone: () => void;
  onRevealCosmos?: () => void;
  onShattering?: () => void;
}) {
  const [phase, setPhase] = useState<FSPhase>('pressure');
  const doneRef = useRef(onDone);
  const revealRef = useRef(onRevealCosmos);
  const shatteringRef = useRef(onShattering);
  useEffect(() => { doneRef.current = onDone; }, [onDone]);
  useEffect(() => { revealRef.current = onRevealCosmos; }, [onRevealCosmos]);
  useEffect(() => { shatteringRef.current = onShattering; }, [onShattering]);

  // Advance through phases at the same durations as the summon cutscene.
  // onShattering fires when shards begin flying (cosmos underlight starts).
  // onRevealCosmos fires at the same moment so the cosmos fades in through the gaps.
  useEffect(() => {
    gameAudio.playTutorialShatter();
    let t = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];
    FS_PHASE_ORDER.slice(1).forEach((p, i) => {
      t += FS_DURS[FS_PHASE_ORDER[i] as FSPhase] ?? 0;
      timers.push(setTimeout(() => {
        setPhase(p);
        if (p === 'shattering') {
          shatteringRef.current?.();
          revealRef.current?.();
        }
      }, t));
    });
    timers.push(setTimeout(() => doneRef.current(), t + 300));
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (phase === 'gone') return null;

  const phaseIdx  = FS_PHASE_ORDER.indexOf(phase);
  const past = (p: FSPhase) => phaseIdx >= FS_PHASE_ORDER.indexOf(p);

  const isShattering = past('shattering');
  const isFlashing   = phase === 'flashing';
  const BG = 'radial-gradient(ellipse at 50% 43%, #0c0c1f 0%, #040408 100%)';

  return (
    <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">

      {/* ── Solid gold fill behind the shards — blazes through gaps as they scatter */}
      {isShattering && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{ background: FSO_GOLD }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0, 1, 0.92, 0.60, 0.10] }}
          transition={{ duration: 4.5, times: [0, 0.04, 0.18, 0.42, 0.72, 1.0], ease: 'easeInOut' }}
        />
      )}

      {/* ── Six crystal shard panels ────────────────────────────────────── */}
      {FS_SHARDS.map((sh, i) => (
        <motion.div key={i} className="absolute inset-0"
          style={{
            clipPath: sh.clip, background: BG,
            transformPerspective: 1400,
            transformStyle: 'preserve-3d',
          }}
          animate={isShattering ? {
            x: [0, `${parseFloat(sh.dx) * 0.08}`, sh.dx],
            y: [0, `${parseFloat(sh.dy) * 0.08}`, sh.dy],
            rotateX: [0, sh.rX], rotateY: [0, sh.rY], rotateZ: [0, sh.rZ],
            opacity: [1, 1, 0.96, 0.66, 0],
            filter: [
              'brightness(1.0)',
              'brightness(1.4) drop-shadow(0 0 6px rgba(251,191,36,0.60))',
              'brightness(2.2) drop-shadow(0 0 12px rgba(251,191,36,0.85))',
              'brightness(4.0) drop-shadow(0 0 20px rgba(251,191,36,0.95))',
              'brightness(7.0) drop-shadow(0 0 28px rgba(255,255,255,0.80))',
            ],
          } : { x: '0%', y: '0%', rotateX: 0, rotateY: 0, rotateZ: 0, opacity: 1, filter: 'brightness(1.0)' }}
          transition={isShattering ? {
            duration: 4.5, delay: i * 0.04,
            x:       { times: [0, 0.06, 1.0], ease: ['easeIn', [0.10, 0.70, 0.30, 1.0]] },
            y:       { times: [0, 0.06, 1.0], ease: ['easeIn', [0.10, 0.70, 0.30, 1.0]] },
            rotateX: { ease: 'easeOut' }, rotateY: { ease: 'easeOut' }, rotateZ: { ease: 'easeOut' },
            opacity: { times: [0, 0.08, 0.26, 0.56, 1.0], ease: 'easeInOut' },
            filter:  { times: [0, 0.12, 0.34, 0.60, 0.82], ease: 'easeInOut' },
          } : { duration: 0 }}
        >
          {/* Gold screen-blend transmutation overlay on each shard */}
          {isShattering && (
            <motion.div className="absolute inset-0 pointer-events-none"
              style={{ background: FSO_GOLD, mixBlendMode: 'screen' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0, 0.18, 0.70, 1.00, 0.85] }}
              transition={{ duration: 4.5, times: [0, 0.10, 0.34, 0.58, 0.78, 1.0], ease: 'easeInOut', delay: i * 0.04 }}
            />
          )}
        </motion.div>
      ))}

      {/* ── Crack SVG — four-layer paint, hidden during shattering ──────── */}
      <AnimatePresence>
        {!isShattering && (
          <motion.svg exit={{ opacity: 0, transition: { duration: 0.08 } }}
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 100 100" preserveAspectRatio="none"
          >
            <defs>
              {/* Tight bloom for crisp white fracture line */}
              <filter id="fso-cgb" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="0.25" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              {/* Wide glow for chasing + residual layers */}
              <filter id="fso-cgw" x="-100%" y="-100%" width="300%" height="300%">
                <feGaussianBlur stdDeviation="3" />
              </filter>
            </defs>

            {/* First crack network — mounts on firstcrack phase, stays visible */}
            {past('firstcrack') && FS_CRACKS_1.map((c, i) => <FSOCrack key={`c1-${i}`} {...c} />)}

            {/* Second crack network — mounts on secondcrack phase */}
            {past('secondcrack') && FS_CRACKS_2.map((c, i) => <FSOCrack key={`c2-${i}`} {...c} />)}

            {/* Ambient junction glow during leaking phase */}
            {past('leaking') && !past('cracking') && (
              <>
                <motion.circle cx="50" cy="42.5" r="6" fill={FSO_GOLD} filter="url(#fso-cgw)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.18, 0.09, 0.22, 0.10, 0.20] }}
                  transition={{ duration: 3.2, ease: 'easeOut', repeat: Infinity, repeatType: 'mirror', delay: 0.4 }}
                />
                <motion.circle cx="50" cy="42.5" r="0.7" fill="white" filter="url(#fso-cgb)"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.56, 0.10, 0.76, 0.24, 0.48, 0] }}
                  transition={{ duration: 2.8, ease: 'easeInOut', repeat: Infinity, delay: 0.25 }}
                />
              </>
            )}

            {/* Energy burst at junctions during cracking phase */}
            {past('cracking') && (
              <>
                <motion.circle cx="50" cy="42.5" r="0"
                  fill={FSO_GOLD} filter="url(#fso-cgw)"
                  animate={{ r: 8, opacity: [0, 0.55, 0.22] }}
                  transition={{ duration: 0.70, ease: 'easeOut' }}
                />
                <motion.circle cx="25" cy="72.5" r="0"
                  fill={FSO_GOLD} filter="url(#fso-cgw)"
                  animate={{ r: 6, opacity: [0, 0.45, 0.18] }}
                  transition={{ duration: 0.58, delay: 0.12, ease: 'easeOut' }}
                />
              </>
            )}
          </motion.svg>
        )}
      </AnimatePresence>

      {/* ── Pre-shatter ambient glow build-up ───────────────────────────── */}
      {!isShattering && (
        <motion.div className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: past('firstcrack') ? 0.55 : 0.18 }}
          transition={{ duration: past('firstcrack') ? 0.6 : 0.5, ease: 'easeOut' }}
          style={{ background: 'radial-gradient(ellipse at 50% 42.5%, rgba(251,191,36,0.30) 0%, rgba(251,191,36,0.08) 40%, transparent 68%)' }}
        />
      )}

      {/* ── Full-panel white-gold flash at the moment of release ────────── */}
      {isFlashing && (
        <motion.div className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.95, 0.50, 0] }}
          transition={{ duration: 1.10, times: [0, 0.10, 0.28, 0.62, 1.0] }}
          style={{ background: 'rgba(255, 255, 200, 1.0)' }}
        />
      )}
    </div>
  );
}

// ─── Cinematic Phase ──────────────────────────────────────────────────────────
function CinematicPhase({ s, dispatch }: { s: TutState; dispatch: React.Dispatch<TAction> }) {
  const beat = TUTORIAL_BEATS[s.beat];
  const [showLumii, setShowLumii] = useState(false);
  const [panDone, setPanDone] = useState(false);
  const [affIdx, setAffIdx] = useState(-1);
  const [shatterReady, setShatterReady] = useState(false);
  const [cosmosVisible, setCosmosVisible] = useState(false);
  const [shatteringStarted, setShatteringStarted] = useState(false);
  const [affinityNames] = useState(["Flare", "Radiance", "Verdance", "Continuum", "Abyss"]);
  const [affKeys] = useState<GemKey[]>(["ruby", "pearl", "emerald", "sapphire", "onyx"]);

  const isContact = beat.id === "b0_contact";
  const isLocate = beat.id === "b1_locate";
  const isShatter = beat.id === "b4_shatter";
  const isAffinityTokens = beat.id === "b5b_affinity_tokens";

  // Beat 1: pan then reveal lumii
  useEffect(() => {
    if (!isLocate) return;
    const t1 = setTimeout(() => setShowLumii(true), 600);
    const t2 = setTimeout(() => { setPanDone(true); }, 1800);
    const t3 = setTimeout(() => { dispatch({ type: "NEXT_BEAT" }); }, 3000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [isLocate, dispatch]);

  // Reset shatterReady whenever the beat changes
  useEffect(() => { setShatterReady(false); }, [s.beat]);

  // Beat b5b: init affinity token sequence on entry
  useEffect(() => {
    if (!isAffinityTokens) return;
    setAffIdx(0);
  }, [isAffinityTokens]);

  // Tap handler — advances token or exits when all 5 seen
  // Note: dispatch must NOT be called inside a state updater (React 18 concurrent mode).
  const handleAffTap = () => {
    if (affIdx >= 4) {
      dispatch({ type: "NEXT_BEAT" });
    } else {
      setAffIdx(i => i + 1);
    }
  };

  const dlgText = beat.dialogue[s.dlgLine]?.text ?? "";
  const isLastDlg = s.dlgLine >= beat.dialogue.length - 1;

  return (
    <div
      className="fixed inset-0 flex items-center justify-center select-none"
      style={{ background: "radial-gradient(ellipse at 50% 60%, #0a0a1a 0%, #000000 100%)" }}
    >
      {/* Cosmos fades in when shattering starts — veil begins transparent so the
          initial reveal is a bright star-field that gradually settles to dark */}
      {(cosmosVisible || s.beat >= 7) && (
        <motion.div
          className="absolute inset-0"
          style={{ backgroundImage: `url(${backgroundCosmos})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2.2, ease: [0.20, 0, 0.10, 1] }}
        >
          <motion.div
            className="absolute inset-0 bg-black"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.60 }}
            transition={{ duration: 3.5, ease: 'easeIn' }}
          />
        </motion.div>
      )}

      {/* White/gold underlighting — blazes from behind the shards as they scatter.
          Lives at z-15, below the shatter overlay (z-20), so it shines through
          the transparent gaps between the flying shard clip-path regions. */}
      {shatteringStarted && (
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            zIndex: 15,
            background: 'radial-gradient(ellipse at 50% 43%, rgba(255,255,230,1.0) 0%, rgba(255,220,140,0.85) 22%, rgba(251,191,36,0.50) 45%, rgba(251,191,36,0.10) 68%, transparent 85%)',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 0.35, 0.90, 1.0, 0.65, 0] }}
          transition={{ duration: 2.2, times: [0, 0.07, 0.20, 0.40, 0.65, 1.0], ease: 'easeInOut' }}
        />
      )}

      {/* Fullscreen shatter animation — only starts after player taps "Welcome to Luminae." */}
      {isShatter && shatterReady && (
        <FullscreenShatterOverlay
          onDone={() => dispatch({ type: "NEXT_BEAT" })}
          onRevealCosmos={() => setCosmosVisible(true)}
          onShattering={() => setShatteringStarted(true)}
        />
      )}

      {/* Affinity token sequence — click-gated, Lumii stays in front at z-30 */}
      {isAffinityTokens && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center cursor-pointer"
          onClick={handleAffTap}
        >
          <AnimatePresence mode="wait">
            {affIdx >= 0 && affIdx < 5 && (
              <motion.div
                key={affIdx}
                className="flex flex-col items-center gap-4 pointer-events-none"
                style={{ transformPerspective: 900 }}
                initial={{ x: -380, rotateY: -90, opacity: 0 }}
                animate={{ x: 0, rotateY: 0, opacity: 1 }}
                exit={{ x: 380, rotateY: 90, opacity: 0 }}
                transition={{ duration: 0.52, ease: [0.22, 1.0, 0.36, 1.0] }}
              >
                <img
                  src={GEM_META[affKeys[affIdx]].image}
                  alt=""
                  className="w-32 h-32 object-contain drop-shadow-[0_0_36px_rgba(255,255,255,0.55)]"
                  draggable={false}
                />
                <motion.span
                  className="text-white font-serif text-3xl tracking-widest"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.32 }}
                >
                  {affinityNames[affIdx]}
                </motion.span>
              </motion.div>
            )}
          </AnimatePresence>
          {/* Tap hint */}
          <motion.p
            className="absolute bottom-20 text-white/35 text-xs tracking-widest font-serif"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            tap to continue
          </motion.p>
        </div>
      )}

      {/* Lumii orb */}
      <AnimatePresence>
        {(s.beat >= 2 || showLumii) && (
          <motion.div
            initial={isLocate ? { x: 160, opacity: 0 } : { opacity: 0, scale: 0.8 }}
            animate={{ x: 0, opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 20, delay: isLocate ? 0.3 : 0 }}
            className="absolute z-30"
            style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
          >
            <LumiiOrb size={88} excited={s.beat === 2} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dialogue */}
      {!isLocate && !isAffinityTokens && !(isShatter && shatterReady) && (
        <div className="absolute bottom-16 left-0 right-0 z-30 px-6">
          <AnimatePresence mode="wait">
            <DialogueBox
              key={`${s.beat}-${s.dlgLine}`}
              lines={beat.dialogue}
              lineIndex={s.dlgLine}
              onTap={() => {
                if (isShatter) {
                  // Tapping "Welcome to Luminae." triggers the unskippable shatter
                  setShatterReady(true);
                } else {
                  dispatch({ type: "NEXT_DLG" });
                }
              }}
              nudge={null}
              mode="listen"
              showOrb={false}
              playerResponse={beat.playerResponse}
              onPlayerResponse={() => dispatch({ type: "PLAYER_RESPONSE" })}
              choices={beat.choices}
              onChoice={(c) => dispatch({ type: "BRANCH_CHOICE", choice: c as "go" | "home" })}
            />
          </AnimatePresence>
        </div>
      )}

      {/* Beat 1 locate: "over here" text */}
      {isLocate && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="absolute z-30 text-white/80 font-serif text-xl"
          style={{ right: "10%", top: "50%" }}
        >
          Over here.
        </motion.div>
      )}


      {/* Subtle star field for early beats */}
      {s.beat <= 4 && (
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(30)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute rounded-full bg-white"
              style={{
                width: Math.random() * 2 + 1,
                height: Math.random() * 2 + 1,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                opacity: Math.random() * 0.5 + 0.1,
              }}
              animate={{ opacity: [0.1, 0.6, 0.1] }}
              transition={{ duration: Math.random() * 4 + 2, repeat: Infinity, delay: Math.random() * 3 }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Fast-forward Cinematic ───────────────────────────────────────────────────
function FastForwardCinematic({ s, dispatch }: { s: TutState; dispatch: React.Dispatch<TAction> }) {
  const remaining = FAST_FORWARD_CARDS.filter(id => id !== s.t3choice);
  const [cardStep, setCardStep] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setCardStep(1), 1200);
    const t2 = setTimeout(() => setCardStep(2), 2600);
    const t3 = setTimeout(() => dispatch({ type: "FF_DONE" }), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [dispatch]);

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ background: `url(${backgroundCosmos}) center/cover` }}>
      <div className="absolute inset-0 bg-black/70" />
      {/* Blue time-stream */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0, 0.4, 0.6, 0.3, 0] }}
        transition={{ duration: 4, times: [0, 0.2, 0.5, 0.8, 1] }}
        style={{ background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.3) 30%, rgba(99,179,237,0.4) 50%, rgba(59,130,246,0.3) 70%, transparent)" }}
      />
      <div className="relative z-10 flex flex-col items-center gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white/80 font-serif text-xl text-center px-8"
        >Now I will let the centuries pass.</motion.div>
        <LumiiOrb size={64} excited />
        <div className="flex gap-8 mt-4">
          {remaining.map((cardId, idx) => {
            const card = TUTORIAL_CARDS[cardId];
            if (!card) return null;
            return (
              <AnimatePresence key={cardId}>
                {cardStep > idx && (
                  <motion.div
                    initial={{ y: -60, opacity: 0, scale: 0.7 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className="flex flex-col items-center gap-2"
                  >
                    <TutorialCard card={card} bonuses={s.bonuses} crystals={s.crystals} />
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.4 }}
                      className="text-[10px] text-emerald-400 font-semibold"
                    >+{card.lumens} Eminence</motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Luminary Phase ───────────────────────────────────────────────────────────
function LuminaryPhase({ s, dispatch }: { s: TutState; dispatch: React.Dispatch<TAction> }) {
  const beat = TUTORIAL_BEATS[s.beat];
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: `url(${backgroundCosmos}) center/cover` }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex flex-col items-center gap-6 w-full">
        <LuminarySummonCutscene
          luminaryId="lum_verdant"
          luminaryName="The Verdant Oracle"
          domain="Verdance"
          lumens={2}
          flavor="She reads the future in the rings of trees that have not yet been planted."
          onComplete={() => dispatch({ type: "LUM_DONE" })}
          onSkip={() => dispatch({ type: "LUM_DONE" })}
        />
        <div className="px-6 w-full max-w-sm">
          <AnimatePresence mode="wait">
            <DialogueBox
              key={`lum-${s.dlgLine}`}
              lines={beat.dialogue}
              lineIndex={s.dlgLine}
              onTap={() => dispatch({ type: "NEXT_DLG" })}
              nudge={null}
              mode="listen"
              showOrb={false}
            />
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Victory Phase ────────────────────────────────────────────────────────────
function VictoryPhase({ s, dispatch }: { s: TutState; dispatch: React.Dispatch<TAction> }) {
  const beat = TUTORIAL_BEATS[s.beat];
  const [, setLocation] = useLocation();
  const showButtons = s.dlgLine >= beat.dialogue.length - 1;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center" style={{ background: `url(${backgroundCosmos}) center/cover` }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 flex flex-col items-center gap-6 w-full max-w-sm px-6">
        <LumiiOrb size={80} excited />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="font-serif text-3xl font-bold text-white mb-1">{s.eminence} Eminence</div>
          <div className="text-white/50 text-sm">Victory through Verdance</div>
        </motion.div>
        <div className="w-full">
          <AnimatePresence mode="wait">
            <DialogueBox
              key={`vic-${s.dlgLine}`}
              lines={beat.dialogue}
              lineIndex={s.dlgLine}
              onTap={() => dispatch({ type: "NEXT_DLG" })}
              nudge={null}
              mode="listen"
              showOrb={false}
            />
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {showButtons && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-3 w-full"
            >
              <button
                onClick={() => { localStorage.setItem("luminae_tutorial_seen", "1"); setLocation("/"); }}
                className="w-full py-3 rounded-2xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition-all shadow-lg"
              >Begin a Full Game</button>
              <button
                onClick={() => dispatch({ type: "RESET" })}
                className="w-full py-2 rounded-2xl bg-white/8 text-white/60 text-sm hover:bg-white/15 transition-all"
              >Replay Tutorial</button>
              <button
                onClick={() => setLocation("/")}
                className="w-full py-2 rounded-xl text-white/40 text-sm hover:text-white/70 transition-all"
              >Return Home</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Gameplay Phase ───────────────────────────────────────────────────────────
function GameplayPhase({ s, dispatch }: { s: TutState; dispatch: React.Dispatch<TAction> }) {
  const beat = TUTORIAL_BEATS[s.beat];
  const beatId = beat.id;
  const subStep = s.subStep;

  // ── Burst animation state ──────────────────────────────────────────────────
  const [purchaseBurst, setPurchaseBurst] = useState<{ key: number; lumens: number; name: string } | null>(null);
  const purchaseBurstKeyRef = useRef(0);
  const [gemBurst, setGemBurst] = useState<{ key: number; gems: GemKey[] } | null>(null);
  const gemBurstKeyRef = useRef(0);

  useEffect(() => {
    const trigger = s.animTrigger;
    if (!trigger) return;
    if (trigger.type === "forge") {
      purchaseBurstKeyRef.current += 1;
      setPurchaseBurst({ key: purchaseBurstKeyRef.current, lumens: trigger.lumens, name: trigger.name });
      setTimeout(() => setPurchaseBurst(null), 1500);
    } else if (trigger.type === "harvest") {
      const { gems } = trigger;
      gemBurstKeyRef.current += 1;
      const key = gemBurstKeyRef.current;
      setGemBurst({ key, gems });
      const burstDuration = (gems.length - 1) * 0.78 + 1.25 + 0.5 + 0.05;
      setTimeout(() => setGemBurst(null), (burstDuration + 0.35) * 1000);
    }
  }, [s.animTrigger]);

  // Dim mode: listen/look dims the interactive areas
  const isDimmed = beat.mode === "listen" || beat.mode === "look";
  const isWellEnabled = (beat.mode === "act" || beat.mode === "semiOpen") &&
    ["b8_first_harness", "b11_forge_reserved", "b12_tier2", "b13_tier3", "b16_final_forge"].includes(beatId) &&
    !(beatId === "b11_forge_reserved" && subStep >= 1) &&
    !(beatId === "b12_tier2" && subStep === 0) &&
    !(beatId === "b16_final_forge" && subStep >= 1);

  const isStorageHighlighted = beatId === "b9b_forge_complete" || beatId === "b14_win_condition";
  const isEminenceHighlighted = beatId === "b14_win_condition";
  const isHandHighlighted = beatId === "b10b_reserve_granted";

  // Where the Lumii floats
  const lumiiTarget = beat.lumiiZone;

  const LUMII_ZONE_POS: Record<string, { x: string; y: string }> = {
    "market-t1": { x: "20%", y: "72%" },
    "market-t2": { x: "20%", y: "55%" },
    "market-t3": { x: "20%", y: "38%" },
    well: { x: "80%", y: "78%" },
    hand: { x: "80%", y: "90%" },
    storage: { x: "15%", y: "90%" },
    eminence: { x: "88%", y: "12%" },
    "discounted-tab": { x: "42%", y: "28%" },
    "needed-tab": { x: "52%", y: "28%" },
    "top-center": { x: "50%", y: "10%" },
    center: { x: "50%", y: "50%" },
    luminary: { x: "50%", y: "30%" },
  };
  const lumiiPos = LUMII_ZONE_POS[lumiiTarget] ?? { x: "88%", y: "88%" };

  const isActMode = beat.mode === "act" || beat.mode === "semiOpen";
  const totalCrystals = Object.values(s.crystals).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Cosmos background with breathing animation — matches game */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url(${backgroundCosmos})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          animation: "cosmic-breathe 12s ease-in-out infinite",
        }}
      />
      {/* Darkening veil */}
      <div className="absolute inset-0 bg-black/68 pointer-events-none" />
      {/* Nebula corner glows — affinity-palette tints */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 55% 35% at 100% 0%,   #3D6BFF0F 0%, transparent 70%)," +
            "radial-gradient(ellipse 45% 30% at 0%   100%, #FF5A3C0C 0%, transparent 70%)," +
            "radial-gradient(ellipse 40% 28% at 0%   0%,   #7B1FA20C 0%, transparent 65%)," +
            "radial-gradient(ellipse 42% 30% at 100% 100%, #2ECC710B 0%, transparent 65%)",
        }}
      />

      {/* Dim overlay for listen/look mode */}
      {isDimmed && (
        <div className="absolute inset-0 bg-black/30 z-20 pointer-events-none" />
      )}

      {/* Tutorial header bar — mirrors the game's header */}
      <header className="shrink-0 z-30 flex items-center justify-between px-4 py-2 border-b border-white/10 backdrop-blur-md" style={{ background: "rgba(3,3,12,0.82)" }}>
        <div className="flex items-center gap-2">
          <div className="flex flex-col leading-none">
            <span className="text-sm font-serif font-bold text-indigo-300 tracking-wide">Luminae</span>
            <span className="text-[9px] text-white/35 tracking-widest">Tutorial</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <LumiiOrb size={22} excited={isActMode} />
          <span className="text-[10px] text-white/50 font-medium">Lumii</span>
        </div>
      </header>

      {/* Scrollable board content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 pb-4">
        {/* Market section */}
        <div className="border border-white/10 rounded-2xl p-3 backdrop-blur-md" style={{ background: "rgba(3,3,12,0.78)" }}>
          <div className="text-[10px] text-white/40 font-semibold uppercase tracking-wider mb-2">The Forge</div>
          <ScriptedMarket s={s} dispatch={dispatch} beatId={beatId} subStep={subStep} />
        </div>

        {/* Player hand */}
        <div className={isHandHighlighted ? "ring-1 ring-amber-400/50 rounded-2xl" : ""}>
          <PlayerHand s={s} dispatch={dispatch} beatId={beatId} subStep={subStep} />
        </div>

        {/* Storage */}
        <PlayerStorage s={s} highlighted={isStorageHighlighted} />

        {/* Affinity well */}
        <AffinityWell s={s} dispatch={dispatch} beatId={beatId} subStep={subStep} wellEnabled={isWellEnabled} />
      </div>

      {/* ── Pinned Player Panel — mirrors the real game's bottom panel ── */}
      <div
        className={`shrink-0 z-20 border-t px-3 py-2 backdrop-blur-md transition-all ${
          isActMode ? 'border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.20)]' : 'border-white/10'
        }`}
        style={{ background: 'rgba(3,3,12,0.92)' }}
      >
        {/* Identity + stats row */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <div className="w-[22px] h-[22px] rounded-full bg-indigo-700/70 border border-indigo-400/40 flex items-center justify-center shrink-0">
              <span className="text-[9px] font-bold text-white">Y</span>
            </div>
            {isActMode && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse shrink-0" />}
            <span className="text-xs font-semibold text-white truncate">You</span>
            {isActMode && (
              <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/15 px-1.5 py-0.5 rounded-full shrink-0">your turn</span>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="flex items-baseline gap-1">
              <span className="font-serif font-black text-lg text-white leading-none">{totalCrystals}</span>
              <span className="text-[10px] text-white/40">Affinity</span>
            </span>
            <button
              type="button"
              onClick={() => {}}
              className="inline-flex items-center gap-1 rounded-md px-1 py-0.5"
            >
              <motion.span
                key={s.eminence}
                initial={{ scale: 1.4, color: '#a5b4fc' }}
                animate={{ scale: 1, color: '#818cf8' }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className="font-serif font-black text-lg leading-none"
              >{s.eminence}</motion.span>
              <Sparkles className="h-3 w-3 text-indigo-400" />
            </button>
          </div>
        </div>
        {/* 6 affinity boxes */}
        <div className="flex gap-1.5">
          {ALL_GEMS.map(gem => {
            const meta = GEM_META[gem];
            const held = s.crystals[gem] ?? 0;
            const bonus = gem !== 'flux' ? (s.bonuses[gem] ?? 0) : 0;
            const reservedCount = gem === 'flux' ? s.reserved.length : 0;
            const hasContent = gem === 'flux' ? (held > 0 || reservedCount > 0) : (held > 0 || bonus > 0);
            return (
              <div
                key={gem}
                className="flex-1 min-h-[72px] flex flex-col items-center gap-1 rounded-lg relative overflow-hidden pt-1.5 pb-1.5"
                style={{
                  background: hasContent
                    ? `linear-gradient(180deg, #060611 0%, ${meta.hex}33 100%)`
                    : 'linear-gradient(180deg, #07070b 0%, #0e0e14 100%)',
                  border: `1px solid ${hasContent ? meta.hex + 'AA' : meta.hex + '22'}`,
                  boxShadow: hasContent ? `inset 0 0 14px ${meta.hex}22, 0 0 8px ${meta.hex}33` : 'none',
                }}
              >
                {hasContent && (
                  <div className="absolute inset-x-0 top-0 h-[1px]"
                    style={{ background: `linear-gradient(90deg, transparent, ${meta.glowHex}AA, transparent)` }} />
                )}
                <div className="flex items-center gap-0.5 w-full justify-center">
                  <span className="text-[7px] font-semibold tracking-wide leading-none truncate" style={{ color: meta.glowHex }}>{meta.shortName}</span>
                  <MiniGem gem={gem} size={7} />
                </div>
                <div className="flex items-center gap-0.5">
                  <span
                    className="text-2xl font-black leading-none tracking-tight"
                    style={{
                      color: hasContent ? '#fff' : meta.hex + '40',
                      textShadow: hasContent ? `0 0 10px ${meta.glowHex}` : 'none',
                    }}
                  >{held}</span>
                </div>
                {gem !== 'flux' && bonus > 0 && (
                  <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>+{bonus}</span>
                )}
                {gem === 'flux' && reservedCount > 0 && (
                  <span className="text-[9px] font-bold leading-none" style={{ color: meta.glowHex }}>{reservedCount}r</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Floating Lumii + "over here" hint */}
      {(() => {
        const hintVisible = isActMode && s.dlgLine >= beat.dialogue.length - 1;
        // Clickable when hint is showing AND there's still a dialogue line to dismiss
        const lumiiClickable = hintVisible && s.dlgLine < beat.dialogue.length;
        // Dart to top-right corner while burst animations are playing so Lumii
        // doesn't compete with the centred token / forge animations.
        const burstActive = !!(purchaseBurst || gemBurst);
        const effectiveLumiiPos = burstActive ? { x: "90%", y: "7%" } : lumiiPos;
        return (
          <motion.div
            animate={{ left: effectiveLumiiPos.x, top: effectiveLumiiPos.y }}
            transition={
              burstActive
                ? { type: "spring", stiffness: 260, damping: 22 }
                : { type: "spring", stiffness: 80, damping: 18 }
            }
            className="fixed z-[60] pointer-events-none"
            style={{ transform: "translate(-50%, -50%)" }}
          >
            {/* Attention bounce when ready for player action, gentle float otherwise */}
            <motion.div
              animate={hintVisible
                ? { y: [0, -22, 3, -15, 1, -8, 0, 0, 0] }
                : { y: [0, -6, 0] }
              }
              transition={hintVisible
                ? {
                    duration: 2.0,
                    repeat: Infinity,
                    repeatDelay: 0.8,
                    times: [0, 0.12, 0.24, 0.34, 0.44, 0.54, 0.64, 0.82, 1],
                    ease: "easeOut",
                  }
                : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
              }
            >
              <div
                className={lumiiClickable ? "pointer-events-auto cursor-pointer active:scale-90 transition-transform" : ""}
                onClick={lumiiClickable ? (e) => { e.stopPropagation(); dispatch({ type: "PLAYER_RESPONSE" }); } : undefined}
              >
                <LumiiOrb size={48} excited={isActMode} />
              </div>
            </motion.div>
          </motion.div>
        );
      })()}

      {/* Dialogue box — sits above the pinned player panel (~152px tall) */}
      {s.dlgLine < beat.dialogue.length && (
        <div className="fixed bottom-[152px] left-0 right-0 z-50 px-4">
          <AnimatePresence mode="wait">
            <DialogueBox
              key={`${beatId}-${s.dlgLine}-${s.nudge}`}
              lines={beat.dialogue}
              lineIndex={s.dlgLine}
              onTap={() => {
                if (s.nudge) {
                  dispatch({ type: "NUDGE", msg: null });
                } else {
                  dispatch({ type: "NEXT_DLG" });
                }
              }}
              nudge={s.nudge}
              mode={beat.mode}
              showOrb={false}
              playerResponse={beat.playerResponse}
              onPlayerResponse={() => dispatch({ type: "PLAYER_RESPONSE" })}
            />
          </AnimatePresence>
        </div>
      )}

      {/* ── Forge Burst Overlay ─────────────────────────────────────────── */}
      <AnimatePresence>
        {purchaseBurst && (
          <motion.div
            key={purchaseBurst.key}
            className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
          >
            <motion.div
              className="absolute rounded-full border-2 border-amber-400"
              initial={{ width: 60, height: 60, opacity: 0.9 }}
              animate={{ width: 360, height: 360, opacity: 0 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
            />
            <motion.div
              className="absolute rounded-full border border-amber-300/50"
              initial={{ width: 40, height: 40, opacity: 0.7 }}
              animate={{ width: 250, height: 250, opacity: 0 }}
              transition={{ duration: 0.70, ease: "easeOut", delay: 0.09 }}
            />
            <motion.div
              className="flex flex-col items-center gap-1"
              initial={{ y: 0, opacity: 1, scale: 0.8 }}
              animate={{ y: -90, opacity: 0, scale: 1.12 }}
              transition={{ duration: 1.15, ease: "easeOut" }}
            >
              <span className="text-3xl font-serif font-black text-amber-300 drop-shadow-[0_0_14px_rgba(251,191,36,0.85)]">
                Forged!
              </span>
              {purchaseBurst.lumens > 0 && (
                <span className="flex items-center gap-1.5 text-lg font-bold text-indigo-300 drop-shadow-[0_0_8px_rgba(129,140,248,0.7)]">
                  +{purchaseBurst.lumens} Eminence
                </span>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Gem Pickup Burst Overlay ─────────────────────────────────────── */}
      <AnimatePresence>
        {gemBurst && (() => {
          const count = gemBurst.gems.length;
          const spacing = 74;
          const offset = ((count - 1) / 2) * spacing;
          const burstDuration = (count - 1) * 0.78 + 1.25 + 0.5 + 0.05;
          return (
            <motion.div
              key={gemBurst.key}
              className="pointer-events-none fixed inset-0 z-[70] flex items-center justify-center"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                className="absolute inset-0 bg-black/35"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
              />
              <div className="relative h-72 w-[18rem]">
                {gemBurst.gems.map((gem, index) => {
                  const x = index * spacing - offset;
                  const delay = index * 0.78 + 0.05;
                  return (
                    <motion.div
                      key={`${gemBurst.key}-${gem}-${index}`}
                      className="absolute inset-0 flex items-center justify-center"
                      initial={{ opacity: 0, rotateY: 0, scale: 0.4, x: 0, y: 64 }}
                      animate={{
                        opacity: [0, 0, 1, 1, 0],
                        rotateY: [0, 180, 360, 540, 720],
                        scale: [0.4, 0.68, 1.12, 1.02, 0.9],
                        x: [0, x * 0.35, x * 0.95, x, x],
                        y: [64, 18, 0, -6, -18],
                      }}
                      transition={{ duration: 1.25, delay, times: [0, 0.18, 0.46, 0.74, 1] }}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <div className="rounded-full bg-black/50 p-2 shadow-[0_0_24px_rgba(255,255,255,0.2)]">
                          <MiniGem gem={gem} size={52} />
                        </div>
                        <span
                          className="text-xs font-bold uppercase tracking-widest"
                          style={{ color: GEM_META[gem].glowHex }}
                        >
                          {GEM_META[gem].shortName}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <motion.div
                className="fixed left-0 right-0 flex items-center justify-center"
                style={{ bottom: "22%" }}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: [0, 1, 1, 0], y: [16, 0, 0, -8] }}
                transition={{ duration: burstDuration, times: [0, 0.15, 0.75, 1] }}
              >
                <span className="text-sm font-semibold text-white/80 tracking-widest uppercase">
                  Affinities gathered
                </span>
              </motion.div>
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function TutorialDirector() {
  const [s, dispatch] = useReducer(reducer, INIT_STATE);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (s.navigateTo) navigate(s.navigateTo);
  }, [s.navigateTo, navigate]);

  const beat = TUTORIAL_BEATS[s.beat];
  if (!beat) return null;

  // Cinematic beats: 0–8 (b3c_border=4, b3b_farewell=5, b4_shatter=6, b5_affinities=7, b5b_affinity_tokens=8)
  if (s.beat <= 8) {
    return <CinematicPhase s={s} dispatch={dispatch} />;
  }

  // Fast-forward cinematic
  if (beat.id === "b15_fast_forward") {
    return <FastForwardCinematic s={s} dispatch={dispatch} />;
  }

  // Luminary reveal
  if (beat.id === "b17_luminary") {
    return <LuminaryPhase s={s} dispatch={dispatch} />;
  }

  // Victory
  if (beat.id === "b18_victory") {
    return <VictoryPhase s={s} dispatch={dispatch} />;
  }

  // Gameplay beats: 6–16
  return <GameplayPhase s={s} dispatch={dispatch} />;
}
