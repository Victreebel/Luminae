import { GEM_KEYS, type GemKey } from "@/lib/gemMeta";

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
  | "market-t1"
  | "market-t2"
  | "market-t3"
  | "well"
  | "hand"
  | "storage"
  | "eminence"
  | "discounted-tab"
  | "needed-tab"
  | "luminary"
  | "card-cost"
  | "player-panel";

interface TutorialDialogueLine {
  text: string;
  excited?: boolean;
}

type CompletionTrigger =
  | { type: "dialogue" }
  | { type: "action"; action: TutorialAction }
  | { type: "auto"; ms: number }
  | { type: "animation" }
  | { type: "panel_view" };

type TutorialAction =
  | "harness"
  | "forge_market"
  | "forge_reserved"
  | "reserve"
  | "view_discounted"
  | "view_needed"
  | "cinematic_ff"
  | "forge_final";

interface TutorialBeat {
  id: string;
  mode: TutorialBeatMode;
  dialogue: TutorialDialogueLine[];
  lumiiZone: LumiiZone;
  highlightZone?: string;
  foregroundCardId?: string;
  completion: CompletionTrigger;
  wrongClickNudge?: string;
  subSteps?: TutorialSubStep[];
  playerResponse?: string;
  choices?: { label: string; value: string }[];
}

interface TutorialSubStep {
  label: string;
  action: TutorialAction;
  dialogue?: string;
  wrongNudge?: string;
}

export interface TutorialCard {
  id: string;
  name: string;
  flavor: string;
  tier: 1 | 2 | 3;
  bonusColor: GemKey;
  lumens: number;
  cost: Partial<Record<GemKey, number>>;
}

export const TUTORIAL_CARDS: Record<string, TutorialCard> = {
  t1e01: {
    id: "t1e01",
    name: "Root Lattice",
    flavor: "The first threads of Verdance take hold.",
    tier: 1,
    bonusColor: "emerald",
    lumens: 0,
    cost: { ruby: 1, sapphire: 1, pearl: 1 },
  },
  t1e07: {
    id: "t1e07",
    name: "Void Tendril",
    flavor: "Growth reaches even into the Abyss.",
    tier: 1,
    bonusColor: "emerald",
    lumens: 0,
    cost: { onyx: 2, pearl: 1 },
  },
  t2e03: {
    id: "t2e03",
    name: "Verdant Emergence",
    flavor: "From below the silence, life asserts itself.",
    tier: 2,
    bonusColor: "emerald",
    lumens: 2,
    cost: { emerald: 3, onyx: 3 },
  },
  t3e01: {
    id: "t3e01",
    name: "Canopy Ascendant",
    flavor: "The forest remembers what the stars forgot.",
    tier: 3,
    bonusColor: "emerald",
    lumens: 3,
    cost: { sapphire: 5, emerald: 3, pearl: 3 },
  },
  t3e02: {
    id: "t3e02",
    name: "Grove Sovereign",
    flavor: "Where it chooses to grow, all else follows.",
    tier: 3,
    bonusColor: "emerald",
    lumens: 4,
    cost: { ruby: 3, sapphire: 6, onyx: 3 },
  },
  t3e03: {
    id: "t3e03",
    name: "Mycelial Throne",
    flavor: "A network vast enough to remember everything.",
    tier: 3,
    bonusColor: "emerald",
    lumens: 3,
    cost: { sapphire: 3, onyx: 5, pearl: 3 },
  },
  t3s04: {
    id: "t3s04",
    name: "Stellar Recursion",
    flavor: "Time folded so many times it forgot its start.",
    tier: 3,
    bonusColor: "sapphire",
    lumens: 5,
    cost: { ruby: 3, sapphire: 7, pearl: 3 },
  },
  t2e05: {
    id: "t2e05",
    name: "Verdance Bloom",
    flavor: "A threshold crossed. Something distant stirs.",
    tier: 2,
    bonusColor: "emerald",
    lumens: 2,
    cost: { sapphire: 5 },
  },
};

export type TutorialMarketView = "all" | "discounted" | "needed";

export const TUTORIAL_BEATS: TutorialBeat[] = [
  {
    id: "b0_contact",
    mode: "listen",
    lumiiZone: "hidden",
    dialogue: [
      { text: "Hello…" },
      { text: "Are you there?" },
    ],
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
      { label: "Take me there.", value: "go" },
    ],
  },
  {
    id: "b3b_farewell",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "Very well. May we meet again." },
    ],
    completion: { type: "dialogue" },
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
      { text: "Here, both the nature and technology of all life are determined by certain Affinities." },
      { text: "They are the elemental forces of existence — the energy behind everything you will build." },
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
    id: "b5b_affinity_strategy",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "If the goal of every species is survival, Affinities represent a survival strategy." },
      { text: "For example, Flare embodies survival through transformation, and Verdance embodies survival through growth." },
      { text: "In any case, devices forged through the Affinities will definitely lead your society to prosper!" },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b5c_architect_assembly",
    mode: "cinematic",
    lumiiZone: "market-t1",
    dialogue: [
      { text: "Let me show you how to use them." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b6_forge_appears",
    mode: "look",
    lumiiZone: "market-t1",
    dialogue: [
      { text: "Use The Forge to turn Affinities into Artifacts." },
      { text: "Artifacts stay with your civilization and make matching future costs cheaper." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b6b_root_lattice",
    mode: "look",
    lumiiZone: "market-t1",
    foregroundCardId: "t1e01",
    dialogue: [
      { text: "This is Root Lattice — your first artifact.", excited: true },
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
      { text: "An artifact's cost is shown at the bottom of its card." },
      { text: "Root Lattice costs 1 Flare, 1 Continuum, and 1 Radiance." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b7b_cost_bridge",
    mode: "look",
    lumiiZone: "card-cost",
    foregroundCardId: "t1e01",
    highlightZone: "card-cost",
    dialogue: [
      { text: "The currency for those costs come from your Affinity Well." },
      { text: "Let me show you how to use them." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b8_first_harness",
    mode: "act",
    lumiiZone: "card-cost",
    highlightZone: "well",
    dialogue: [
      { text: "This is the Affinity Well, through which the essence of the Universe flows." },
      { text: "The large number shows how much of this shared reservoir you have harnessed. The small pips show how much is left to harness." },
      { text: "Beware, heavy usage of a single Affinity by yourself and others can cause that Affinity to run dry." },
      { text: "A Harness takes up to 3 different Affinities, or 2 of one Affinity. Gather 1 Flare, 1 Continuum, and 1 Radiance, then Harness." },
    ],
    completion: { type: "action", action: "harness" },
    wrongClickNudge: "Tap the affinity crystals matching Root Lattice's cost.",
  },
  {
    id: "b9_first_forge",
    mode: "act",
    lumiiZone: "well",
    foregroundCardId: "t1e01",
    highlightZone: "forge-btn",
    dialogue: [
      { text: "Use the Affinities harnessed from the Well to pay the costs." },
      { text: "Select Root Lattice and press Forge.", excited: true },
    ],
    completion: { type: "action", action: "forge_market" },
    wrongClickNudge: "Tap Root Lattice, then press Forge.",
  },
  {
    id: "b9b_forge_complete",
    mode: "listen",
    lumiiZone: "verdance-panel",
    highlightZone: "storage",
    dialogue: [
      { text: "Root Lattice adds 1 Verdance to your civilization. Future Verdance costs are now 1 lower." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b9c_transition",
    mode: "listen",
    lumiiZone: "storage",
    highlightZone: "storage",
    dialogue: [
      { text: "Next, protect an artifact before someone else can claim it." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b10_reserve",
    mode: "act",
    lumiiZone: "market-t1",
    highlightZone: "market-t1",
    dialogue: [
      { text: "The Forge now shows the cost still needed after your bonuses." },
      { text: "Encrypt Void Tendril in Tier 1. Encryption prevents rival civilizations from claiming it while it waits for you." },
    ],
    completion: { type: "action", action: "reserve" },
    wrongClickNudge: "Encrypt the highlighted artifact first.",
  },
  {
    id: "b10b_reserve_granted",
    mode: "listen",
    lumiiZone: "well",
    highlightZone: "well",
    dialogue: [
      { text: "Encrypted artifacts are kept in the Singularity panel of your Affinity Well." },
      { text: "Encryption also grants 1 Singularity, which can cover one missing affinity." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b10c_needed_peek",
    mode: "listen",
    lumiiZone: "well",
    highlightZone: "well",
    dialogue: [
      { text: "That is all the Forge needs to show: what remains after your bonuses." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b11_forge_reserved",
    mode: "act",
    lumiiZone: "well",
    highlightZone: "well",
    dialogue: [
      { text: "Encrypted artifacts can still be forged from the Singularity panel." },
      { text: "Use Abyss ×2, Harness it, then forge Void Tendril with the Singularity you earned.", excited: true },
    ],
    completion: { type: "action", action: "forge_reserved" },
    wrongClickNudge: "Hold that Singularity for now. A harder path is coming.",
  },
  {
    id: "b12_tier2",
    mode: "act",
    lumiiZone: "market-t2",
    highlightZone: "market-t2",
    dialogue: [
      { text: "Root Lattice and Void Tendril have already lowered Verdant Emergence's Verdance cost." },
      { text: "I will supply 1 Verdance and 1 Abyss. Use Abyss ×2, then Harness it." },
      { text: "Then forge Verdant Emergence. You will have exactly what it needs." },
    ],
    completion: { type: "action", action: "forge_market" },
    wrongClickNudge: "Harness 2 Abyss, then forge Verdant Emergence.",
  },
  {
    id: "b13_tier3",
    mode: "semiOpen",
    lumiiZone: "market-t3",
    highlightZone: "market-t3",
    dialogue: [
      { text: "Tier 3 artifacts demand a deeper reserve of Affinity." },
      { text: "I will move 3 Continuum, 2 Radiance, and 1 Singularity from the Well into your reserve." },
      { text: "Then use Continuum ×2 and forge Canopy Ascendant." },
    ],
    completion: { type: "action", action: "forge_market" },
    wrongClickNudge: "Build the reserve for Canopy Ascendant first.",
  },
  {
    id: "b14_win_condition",
    mode: "listen",
    lumiiZone: "eminence",
    highlightZone: "eminence",
    dialogue: [
      { text: "Some artifacts also grant Eminence." },
      { text: "The first civilization to reach 15 Eminence wins." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b15_fast_forward",
    mode: "cinematic",
    lumiiZone: "top-center",
    dialogue: [
      { text: "Now I will let the centuries pass." },
    ],
    completion: { type: "animation" },
  },
  {
    id: "b15b_luminary_signal",
    mode: "listen",
    lumiiZone: "luminary",
    highlightZone: "luminary",
    dialogue: [
      { text: "An irregularity has been detected..." },
    ],
    playerResponse: "Irregularity?",
    completion: { type: "dialogue" },
  },
  {
    id: "b16_final_forge",
    mode: "act",
    lumiiZone: "luminary",
    foregroundCardId: "t2e05",
    highlightZone: "luminary",
    dialogue: [
      { text: "A rulebreaker... A singularity at the edge of the observable cosmos..." },
      { text: "Whatever it is, it feels... willful. As if a presence from a foreign reality is peeking through..." },
      { text: "I've seen this before. We call these anomalies Luminaries." },
      { text: "This one appears to be drawn to the Verdance that our civilization has accumulated." },
      { text: "I will bring 5 Continuum. Forge Verdance Bloom to awaken it." },
    ],
    completion: { type: "action", action: "forge_final" },
    wrongClickNudge: "Gather the affinities for the final artifact.",
  },
  {
    id: "b17_luminary",
    mode: "cinematic",
    lumiiZone: "luminary",
    dialogue: [
      { text: "The Verdant Oracle answers your civilization. Its Verdance cost bonus begins next turn." },
    ],
    completion: { type: "animation" },
  },
  {
    id: "b18_victory",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "You have completed the core loop: harness, forge, and awaken a Luminary." },
      { text: "The first civilization to 15 Eminence wins. Other Affinities create other paths." },
    ],
    completion: { type: "dialogue" },
  },
];

export const BEAT_INDEX: Record<string, number> = {};
TUTORIAL_BEATS.forEach((b, i) => { BEAT_INDEX[b.id] = i; });

export const T3_PURCHASABLE_IDS = ["t3e01", "t3e02", "t3e03"];
export const T3_IMPOSSIBLE_ID = "t3s04";
export const FAST_FORWARD_CARDS = ["t3e01", "t3e02", "t3e03"];
export const FINAL_T2_ID = "t2e05";
export const FIRST_FORGE_ID = "t1e01";
export const RESERVE_CARD_ID = "t1e07";
export const TIER2_SINGULARITY_ID = "t2e03";

export const VERDANCE_LUMINARY_ID = "lum_verdant";
export const VERDANCE_LUMINARY_EMINENCE = 2;

export const AFFINITY_SEQ_KEYS: GemKey[] = GEM_KEYS.filter(k => k !== "flux");
