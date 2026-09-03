import { AFFINITY_KEYS, type AffinityKey } from "@/lib/affinityMeta";
import type { FirstContactStance } from "@workspace/game-types";

type TutorialBeatMode =
  | "listen"
  | "look"
  | "act"
  | "cinematic"
  | "semiOpen";

type LumiiZone =
  | "hidden"
  | "center"
  | "verdance-panel"
  | "off-right"
  | "top-center"
  | "forge-t1"
  | "forge-t2"
  | "forge-t3"
  | "well"
  | "hand"
  | "storage"
  | "eminence"
  | "discounted-tab"
  | "needed-tab"
  | "luminary"
  | "card-cost"
  | "player-panel"
  | "opponent";

export type TutorialHighlightZone =
  | "well"
  | "forge-btn"
  | "hand"
  | "storage"
  | "forge-t1"
  | "forge-t2"
  | "forge-t3"
  | "card-cost"
  | "eminence"
  | "discounted-tab"
  | "needed-tab"
  | "luminary"
  | "verdance-bonus";

interface TutorialDialogueLine {
  text: string;
  excited?: boolean;
}

type CompletionTrigger =
  | { type: "dialogue" }
  | { type: "action"; action: TutorialAction }
  | { type: "auto"; ms: number }
  | { type: "animation" }
  | { type: "opponent_action"; action: TutorialOpponentAction }
  | { type: "panel_view" };

export type TutorialOpponentAction =
  | { kind: "harness"; affinities: readonly AffinityKey[] }
  | { kind: "forge"; cardId: string };

type TutorialAction =
  | "harness"
  | "forge_artifact"
  | "forge_reserved"
  | "reserve"
  | "view_discounted"
  | "view_needed"
  | "cinematic_ff"
  | "forge_final";

export type TutorialInteractionKind =
  | "harness"
  | "forge"
  | "encrypt"
  | "forge_reserved"
  | "forge_final";

export type TutorialInteractionTarget =
  | { zone: "well"; harnessPattern: Readonly<Partial<Record<AffinityKey, number>>> }
  | { zone: "forge" | "storage"; cardId: string };

export interface TutorialInteractionPolicy {
  substep: { min: number; max?: number };
  availableFromDialogue: number | "last";
  kind: TutorialInteractionKind;
  target: TutorialInteractionTarget;
  exactAction: "HARNESS" | "FORGE_ARTIFACT" | "RESERVE" | "FORGE_RESERVED";
  completionEvent:
    | "harness_completed"
    | "artifact_forged"
    | "artifact_encrypted"
    | "encrypted_artifact_forged"
    | "final_artifact_forged";
  wrongNudge: string;
}

export interface TutorialBeat {
  id: string;
  mode: TutorialBeatMode;
  dialogue: TutorialDialogueLine[];
  lumiiZone: LumiiZone;
  highlightZone?: TutorialHighlightZone;
  foregroundCardId?: string;
  completion: CompletionTrigger;
  wrongClickNudge?: string;
  interactionPolicies?: readonly TutorialInteractionPolicy[];
  subSteps?: TutorialSubStep[];
  playerResponse?: string;
  choices?: { label: string; value: FirstContactStance }[];
}

interface TutorialSubStep {
  label: string;
  action: TutorialAction;
  dialogue?: string;
  wrongNudge?: string;
}

export const TUTORIAL_HARNESS_PATTERNS: Readonly<
  Record<string, Readonly<Partial<Record<AffinityKey, number>>>>
> = {
  b8_first_harness: { flare: 1, continuum: 1, radiance: 1 },
  b11_forge_reserved: { verdance: 2 },
};


export type TutorialForgeView = "all" | "discounted" | "needed";

export interface TutorialChapter {
  id: "arrival" | "board" | "actions" | "ascension";
  label: string;
  startBeatId: string;
}

export const TUTORIAL_CHAPTERS: readonly TutorialChapter[] = [
  { id: "arrival", label: "Meet Lumii", startBeatId: "b0_contact" },
  { id: "board", label: "Read the Board", startBeatId: "b5_affinities" },
  { id: "actions", label: "Core Actions", startBeatId: "b8_first_harness" },
  {
    id: "ascension",
    label: "Eminence & Luminaries",
    startBeatId: "b14_win_condition",
  },
];

export const TUTORIAL_BEATS: TutorialBeat[] = [
  {
    id: "b0_contact",
    mode: "listen",
    lumiiZone: "hidden",
    dialogue: [{ text: "Hello..." }, { text: "Are you there?" }],
    completion: { type: "dialogue" },
    playerResponse: "Who's there?",
  },
  {
    id: "b1_locate",
    mode: "cinematic",
    lumiiZone: "off-right",
    dialogue: [
      { text: "Over here." },
    ],
    completion: { type: "animation" },
  },
  {
    id: "b2_lumii_intro",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "There you are." },
      { text: "Hello, Architect." },
      { text: "My name is Lumii." },
      { text: "You can think of me as your guide." },
    ],
    completion: { type: "dialogue" },
    playerResponse: "Hold on... Architect??",
  },
  {
    id: "b3_architect",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "In my Universe, that is what we call those who have the power to shape cosmic society." },
      { text: "They determine what my people reach for, and what we become." },
      { text: "They provide us with the tools to shine brilliantly throughout the cosmos.", excited: true },
    ],
    completion: { type: "dialogue" },
    playerResponse: "So I'm in your universe now?",
  },
  {
    id: "b3c_border",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "Almost. You've been wandering along the border." },
      { text: "I can light your way." },
    ],
    completion: { type: "dialogue" },
    choices: [
      { label: "Show me what lies beyond.", value: "curious" },
      { label: "I'll follow, but I want answers.", value: "guarded" },
      { label: "Then let's build.", value: "resolute" },
    ],
  },
  {
    id: "b4_shatter",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [],
    completion: { type: "animation" },
  },
  {
    id: "b5_affinities",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "Welcome to LUMINAe." },
      {
        text: "Here, both the nature and technology of all life are determined by certain Affinities.",
      },
      {
        text: "They are the elemental forces of existence - the energy behind everything you will build.",
      },
      { text: "The five Affinities are..." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b5b_affinity_tokens",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [],
    completion: { type: "animation" },
  },
  {
    id: "b5c_architect_assembly",
    mode: "cinematic",
    lumiiZone: "forge-t1",
    dialogue: [
      { text: "Let me show you how to use them." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b6_forge_appears",
    mode: "look",
    lumiiZone: "forge-t1",
    highlightZone: "forge-t1",
    dialogue: [
      {
        text: "In a match, the Forge holds 12 Artifacts across three tiers. Here, I'll reveal only the Artifact we're learning.",
      },
      {
        text: "The Affinity Well shows what you hold and what remains for everyone.",
      },
      {
        text: "I'll take the other seat and play gently. After each of your actions, watch what I do before your next turn.",
      },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b6b_root_lattice",
    mode: "look",
    lumiiZone: "forge-t1",
    foregroundCardId: "t1e01",
    highlightZone: "forge-t1",
    dialogue: [
      {
        text: "This is Replication Spore, your first Artifact.",
        excited: true,
      },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b7_artifact_cost",
    mode: "look",
    lumiiZone: "card-cost",
    foregroundCardId: "t1e01",
    highlightZone: "card-cost",
    dialogue: [
      {
        text: "Read an Artifact in this order: cost at the base, the Affinity bonus it grants when Forged, then its Eminence.",
      },
      { text: "Replication Spore costs 1 Flare, 1 Continuum, and 1 Radiance." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b8_first_harness",
    mode: "act",
    lumiiZone: "well",
    highlightZone: "well",
    dialogue: [
      {
        text: "In the Well, the large number shows the Affinity tokens you can spend. After you Forge, a smaller +number shows permanent bonuses. The pips show what remains for everyone.",
      },
      {
        text: "First action: tap 1 Flare, 1 Continuum, and 1 Radiance, then press Harness.",
      },
    ],
    completion: { type: "action", action: "harness" },
    interactionPolicies: [{
      substep: { min: 0, max: 0 },
      availableFromDialogue: "last",
      kind: "harness",
      target: { zone: "well", harnessPattern: TUTORIAL_HARNESS_PATTERNS.b8_first_harness },
      exactAction: "HARNESS",
      completionEvent: "harness_completed",
      wrongNudge: "Tap 1 Flare, 1 Continuum, and 1 Radiance, then Harness.",
    }],
    wrongClickNudge:
      "Tap the Affinity icons matching Replication Spore's cost.",
  },
  {
    id: "b8a_lumii_harness_three",
    mode: "cinematic",
    lumiiZone: "opponent",
    dialogue: [
      { text: "My turn. I'll take 1 Flare, 1 Continuum, and 1 Abyss." },
    ],
    completion: {
      type: "opponent_action",
      action: { kind: "harness", affinities: ["flare", "continuum", "abyss"] },
    },
  },
  {
    id: "b9_first_forge",
    mode: "act",
    lumiiZone: "forge-t1",
    foregroundCardId: "t1e01",
    highlightZone: "well",
    dialogue: [
      { text: "You now hold exactly what Replication Spore costs." },
      {
        text: "For the Forge Artifact action, select Replication Spore, press Forge, then Confirm.",
        excited: true,
      },
    ],
    completion: { type: "action", action: "forge_artifact" },
    interactionPolicies: [{
      substep: { min: 0 },
      availableFromDialogue: "last",
      kind: "forge",
      target: { zone: "forge", cardId: "t1e01" },
      exactAction: "FORGE_ARTIFACT",
      completionEvent: "artifact_forged",
      wrongNudge: "Select Replication Spore, then press Forge and Confirm.",
    }],
    wrongClickNudge: "Tap Replication Spore, then press Forge.",
  },
  {
    id: "b9a_lumii_harness_two",
    mode: "cinematic",
    lumiiZone: "opponent",
    dialogue: [
      { text: "Now I'll take 2 Radiance. Watch the shared Well change." },
    ],
    completion: {
      type: "opponent_action",
      action: { kind: "harness", affinities: ["radiance", "radiance"] },
    },
  },
  {
    id: "b9b_forge_complete",
    mode: "look",
    lumiiZone: "verdance-panel",
    highlightZone: "verdance-bonus",
    dialogue: [
      {
        text: "See +1 beside Verdance in the Well. That is a permanent bonus, not a token: it is never spent.",
      },
      {
        text: "It stays in your Civilization and automatically lowers every future Verdance cost by 1.",
      },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b10_reserve",
    mode: "act",
    lumiiZone: "forge-t1",
    highlightZone: "forge-t1",
    dialogue: [
      {
        text: "For the Encrypt Artifact action, select Root Memory Valve, press Encrypt, then Confirm. It will wait only for you.",
      },
    ],
    completion: { type: "action", action: "reserve" },
    interactionPolicies: [{
      substep: { min: 0 },
      availableFromDialogue: "last",
      kind: "encrypt",
      target: { zone: "forge", cardId: "t1s08" },
      exactAction: "RESERVE",
      completionEvent: "artifact_encrypted",
      wrongNudge: "Select Root Memory Valve, then press Encrypt and Confirm.",
    }],
    wrongClickNudge: "Encrypt the highlighted artifact first.",
  },
  {
    id: "b10a_lumii_harness_three",
    mode: "cinematic",
    lumiiZone: "opponent",
    dialogue: [
      { text: "My turn again: 1 Flare, 1 Radiance, and 1 Abyss." },
    ],
    completion: {
      type: "opponent_action",
      action: { kind: "harness", affinities: ["flare", "radiance", "abyss"] },
    },
  },
  {
    id: "b10b_reserve_granted",
    mode: "listen",
    lumiiZone: "well",
    highlightZone: "storage",
    dialogue: [
      {
        text: "There it is... The current answers you quickly.",
      },
      {
        text: "When an Architect Encrypts an Artifact, the five Affinities converge around it. The resulting current is called Singularity.",
      },
      {
        text: "The Artifact waits behind the Singularity cell for you alone. Singularity can cover any one missing Affinity.",
      },
      {
        text: "Replication Spore lowers Root Memory Valve's 4 Verdance cost to 3. Harness 2 Verdance; Singularity will cover the last one.",
      },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b11_forge_reserved",
    mode: "act",
    lumiiZone: "well",
    highlightZone: "well",
    dialogue: [
      { text: "Fourth action: tap ×2 on Verdance, then Harness." },
    ],
    completion: { type: "action", action: "harness" },
    interactionPolicies: [{
      substep: { min: 0 },
      availableFromDialogue: 0,
      kind: "harness",
      target: { zone: "well", harnessPattern: TUTORIAL_HARNESS_PATTERNS.b11_forge_reserved },
      exactAction: "HARNESS",
      completionEvent: "harness_completed",
      wrongNudge: "Use x2 on Verdance, then Harness.",
    }],
    wrongClickNudge: "Harness 2 Verdance.",
  },
  {
    id: "b11a_lumii_forge",
    mode: "cinematic",
    lumiiZone: "opponent",
    foregroundCardId: "t1s03",
    highlightZone: "forge-t1",
    dialogue: [
      { text: "My turn. I'll Forge Null-Loop Anchor. Its Continuum bonus is permanent, even though it grants no Eminence." },
    ],
    completion: {
      type: "opponent_action",
      action: { kind: "forge", cardId: "t1s03" },
    },
  },
  {
    id: "b11b_forge_reserved",
    mode: "act",
    lumiiZone: "storage",
    highlightZone: "storage",
    dialogue: [
      {
        text: "Singularity is open. Choose Root Memory Valve, then press Forge and Confirm.",
        excited: true,
      },
    ],
    completion: { type: "action", action: "forge_reserved" },
    interactionPolicies: [{
      substep: { min: 0 },
      availableFromDialogue: 0,
      kind: "forge_reserved",
      target: { zone: "storage", cardId: "t1s08" },
      exactAction: "FORGE_RESERVED",
      completionEvent: "encrypted_artifact_forged",
      wrongNudge: "Open Singularity and Forge Root Memory Valve.",
    }],
    wrongClickNudge: "Open Singularity and Forge Root Memory Valve.",
  },
  {
    id: "b11c_lumii_harness_three",
    mode: "cinematic",
    lumiiZone: "opponent",
    dialogue: [
      { text: "I'll finish this exchange by taking 1 Flare, 1 Continuum, and 1 Radiance." },
    ],
    completion: {
      type: "opponent_action",
      action: { kind: "harness", affinities: ["flare", "continuum", "radiance"] },
    },
  },
  {
    id: "b14_win_condition",
    mode: "listen",
    lumiiZone: "eminence",
    highlightZone: "eminence",
    dialogue: [
      {
        text: "Artifacts with Eminence advance your score. Reaching 15 triggers the final round so every civilization receives equal turns.",
      },
      {
        text: "Build enough matching permanent Artifact bonuses and a Luminary can awaken. Let's jump ahead a few turns.",
      },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b15_fast_forward",
    mode: "cinematic",
    lumiiZone: "top-center",
    dialogue: [{ text: "A few turns later..." }],
    completion: { type: "animation" },
  },
  {
    id: "b15b_luminary_signal",
    mode: "listen",
    lumiiZone: "luminary",
    highlightZone: "luminary",
    dialogue: [
      { text: "One more Verdance Artifact will awaken the Verdant Oracle." },
    ],
    playerResponse: "Let's forge it.",
    completion: { type: "dialogue" },
  },
  {
    id: "b16_final_forge",
    mode: "act",
    lumiiZone: "luminary",
    foregroundCardId: "t2e05",
    highlightZone: "luminary",
    dialogue: [
      { text: "I'll supply 4 Continuum. Your permanent bonus covers the fifth cost." },
      {
        text: "Select Epoch Graft Ledger, press Forge, then Confirm to awaken the Verdant Oracle.",
      },
    ],
    completion: { type: "action", action: "forge_final" },
    interactionPolicies: [{
      substep: { min: 0 },
      availableFromDialogue: "last",
      kind: "forge_final",
      target: { zone: "forge", cardId: "t2e05" },
      exactAction: "FORGE_ARTIFACT",
      completionEvent: "final_artifact_forged",
      wrongNudge: "Select Epoch Graft Ledger, then press Forge and Confirm.",
    }],
    wrongClickNudge: "Gather the affinities for the final artifact.",
  },
  {
    id: "b17_luminary",
    mode: "cinematic",
    lumiiZone: "luminary",
    dialogue: [],
    completion: { type: "animation" },
  },
  {
    id: "b18_victory",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      {
        text: "The Verdant Oracle answered your civilization.",
      },
      {
        text: "Your four core actions are: take 3 different Affinities, take 2 of one Affinity, Forge an Artifact, and Encrypt an Artifact into private storage.",
      },
      {
        text: "The Verdant Oracle grants 1 Eminence and immediately draws 1 Verdance from the Well.",
      },
      {
        text: "Build matching bonuses to awaken Luminaries. After the final round, the civilization with the most Eminence wins.",
      },
      {
        text: "Wait... something answered that convergence. No. Only an echo. For now.",
      },
    ],
    completion: { type: "dialogue" },
  },
];

export const BEAT_INDEX: Record<string, number> = {};
TUTORIAL_BEATS.forEach((b, i) => { BEAT_INDEX[b.id] = i; });

const LEGACY_BEAT_ID_MIGRATIONS: Readonly<Record<string, string>> = {
  b3b_farewell: "b3c_border",
  b5b_affinity_strategy: "b5c_architect_assembly",
  b7b_cost_bridge: "b8_first_harness",
  b9c_transition: "b10_reserve",
  b10c_needed_peek: "b11_forge_reserved",
  b11a_lumii_harness_three: "b11a_lumii_forge",
  b11c_lumii_forge: "b11c_lumii_harness_three",
  b12_tier2: "b14_win_condition",
  b13_tier3: "b14_win_condition",
};

export function resolveTutorialBeatIndex(beatId: string | null): number | null {
  if (!beatId) return null;
  const currentId = LEGACY_BEAT_ID_MIGRATIONS[beatId] ?? beatId;
  return BEAT_INDEX[currentId] ?? null;
}

export function getTutorialChapter(beatIndex: number) {
  const clampedBeat = Math.max(
    0,
    Math.min(beatIndex, TUTORIAL_BEATS.length - 1),
  );
  let chapterIndex = 0;
  for (let index = 1; index < TUTORIAL_CHAPTERS.length; index += 1) {
    const chapterStart = BEAT_INDEX[TUTORIAL_CHAPTERS[index].startBeatId];
    if (chapterStart == null || clampedBeat < chapterStart) break;
    chapterIndex = index;
  }
  return {
    ...TUTORIAL_CHAPTERS[chapterIndex],
    chapterIndex,
    chapterNumber: chapterIndex + 1,
    totalChapters: TUTORIAL_CHAPTERS.length,
  };
}

/**
 * The cinematic shell owns every beat before the playable board appears.
 * Keep this tied to a beat ID so inserting narration cannot silently reroute
 * a cinematic through the gameplay UI.
 */
export function usesTutorialCinematicPhase(beatIndex: number): boolean {
  const firstGameplayBeat = BEAT_INDEX.b6_forge_appears;
  return firstGameplayBeat != null && beatIndex < firstGameplayBeat;
}

export const FAST_FORWARD_FEATURED_CARDS = ["t1e07", "t2e03", "t3e01"];
export const FAST_FORWARD_CARDS = [
  ...FAST_FORWARD_FEATURED_CARDS,
  "t3r01",
  "t3s01",
];
export const FINAL_T2_ID = "t2e05";
export const FIRST_FORGE_ID = "t1e01";
export const RESERVE_CARD_ID = "t1s08";
export const LUMII_FORGE_ID = "t1s03";
export const LUMII_FAST_FORWARD_EMINENCE = 9;

export function getTutorialInteractionPolicy(
  beatId: string,
  subStep: number,
): TutorialInteractionPolicy | null {
  const beat = TUTORIAL_BEATS.find((candidate) => candidate.id === beatId);
  return beat?.interactionPolicies?.find(({ substep }) => (
    subStep >= substep.min && (substep.max == null || subStep <= substep.max)
  )) ?? null;
}

export function isTutorialInteractionUnlocked(
  beatId: string,
  subStep: number,
  dialogueLine: number,
): boolean {
  const beat = TUTORIAL_BEATS.find((candidate) => candidate.id === beatId);
  const policy = getTutorialInteractionPolicy(beatId, subStep);
  if (!beat || !policy) return false;
  const firstAllowedLine = policy.availableFromDialogue === "last"
    ? Math.max(0, beat.dialogue.length - 1)
    : policy.availableFromDialogue;
  return dialogueLine >= firstAllowedLine;
}

export function getTutorialHarnessPattern(
  beatId: string,
  subStep: number,
): Readonly<Partial<Record<AffinityKey, number>>> | null {
  const target = getTutorialInteractionPolicy(beatId, subStep)?.target;
  return target?.zone === "well" ? target.harnessPattern : null;
}

export const TUTORIAL_FORGE_CARD_SLOTS: Readonly<
  Record<string, { tier: 1 | 2 | 3; index: number }>
> = {
  [FIRST_FORGE_ID]: { tier: 1, index: 0 },
  [RESERVE_CARD_ID]: { tier: 1, index: 1 },
  [LUMII_FORGE_ID]: { tier: 1, index: 2 },
  [FINAL_T2_ID]: { tier: 2, index: 0 },
};

export const TUTORIAL_FORGE_CARD_BY_BEAT: Readonly<Record<string, string>> = {
  b6_forge_appears: FIRST_FORGE_ID,
  b6b_root_lattice: FIRST_FORGE_ID,
  b7_artifact_cost: FIRST_FORGE_ID,
  b8_first_harness: FIRST_FORGE_ID,
  b9_first_forge: FIRST_FORGE_ID,
  b10_reserve: RESERVE_CARD_ID,
  b11a_lumii_forge: LUMII_FORGE_ID,
  b16_final_forge: FINAL_T2_ID,
};

export const VERDANCE_LUMINARY_ID = "lum_verdant";
export const VERDANCE_LUMINARY_EMINENCE = 1;

export const AFFINITY_SEQ_KEYS: AffinityKey[] = AFFINITY_KEYS.filter(k => k !== "singularity");
