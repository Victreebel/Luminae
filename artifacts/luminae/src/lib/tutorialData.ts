import type { GemKey } from "@/lib/gemMeta";

export type TutorialBeatMode =
  | "listen"
  | "look"
  | "act"
  | "cinematic"
  | "semiOpen";

export type LumiiZone =
  | "hidden"
  | "center"
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

export interface TutorialDialogueLine {
  text: string;
  excited?: boolean;
}

export type CompletionTrigger =
  | { type: "dialogue" }
  | { type: "action"; action: TutorialAction }
  | { type: "auto"; ms: number }
  | { type: "animation" };

export type TutorialAction =
  | "harness"
  | "forge_market"
  | "forge_reserved"
  | "reserve"
  | "view_discounted"
  | "view_needed"
  | "cinematic_ff"
  | "forge_final";

export interface TutorialBeat {
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

export interface TutorialSubStep {
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
      { text: "Here, both the nature and technology of all life is determined by certain Affinities." },
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
    id: "b5c_architect_assembly",
    mode: "cinematic",
    lumiiZone: "market-t1",
    dialogue: [
      { text: "Let me show you how to use it." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b6_forge_appears",
    mode: "look",
    lumiiZone: "market-t1",
    dialogue: [
      { text: "Use The Forge to turn Affinities into Artifacts." },
      { text: "Artifacts are technologies that permanently alter the course of civilization." },
      { text: "Forging lower-tier artifacts will make higher-tier artifacts easier to obtain." },
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
      { text: "An artifact's cost is shown here." },
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
      { text: "Those affinities come from the Affinity Well." },
      { text: "Let me show you how to gather them." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b8_first_harness",
    mode: "act",
    lumiiZone: "well",
    highlightZone: "well",
    dialogue: [
      { text: "Gather 1 Flare, 1 Continuum, and 1 Radiance from the Well." },
      { text: "These match Root Lattice's cost exactly." },
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
      { text: "Your affinities are ready." },
      { text: "Select Root Lattice and press Forge.", excited: true },
    ],
    completion: { type: "action", action: "forge_market" },
    wrongClickNudge: "Tap Root Lattice, then press Forge.",
  },
  {
    id: "b9b_forge_complete",
    mode: "listen",
    lumiiZone: "player-panel",
    highlightZone: "storage",
    dialogue: [
      { text: "A forged artifact remains with your society." },
      { text: "Its bonus will make future artifacts easier to shape." },
      { text: "Your artifacts are always reachable here — tap your panel to see what you have built." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b9c_transition",
    mode: "listen",
    lumiiZone: "storage",
    highlightZone: "storage",
    dialogue: [
      { text: "Now let me prepare your interface." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b10_reserve",
    mode: "act",
    lumiiZone: "market-t1",
    highlightZone: "discounted-tab",
    dialogue: [
      { text: "Your first artifact has already changed the path." },
      { text: "The Discounted view reveals artifacts your society has already made closer." },
      { text: "Reserve this one. It will wait for you until you are ready." },
    ],
    completion: { type: "action", action: "reserve" },
    wrongClickNudge: "Reserve the highlighted artifact first.",
  },
  {
    id: "b10b_reserve_granted",
    mode: "listen",
    lumiiZone: "market-t1",
    highlightZone: "hand",
    dialogue: [
      { text: "Reserving protects a future artifact." },
      { text: "It also grants Singularity." },
      { text: "Hold that for now. A convergence is most useful when the path becomes harder." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b10c_needed_peek",
    mode: "act",
    lumiiZone: "needed-tab",
    highlightZone: "needed-tab",
    dialogue: [
      { text: "Before you gather what it needs — notice the Needed view." },
      { text: "Switch to Needed now. It shows your reserved artifact's exact shortfall." },
    ],
    completion: { type: "action", action: "view_needed" },
    wrongClickNudge: "Switch to the Needed tab to see your reserved artifact's shortfall.",
  },
  {
    id: "b11_forge_reserved",
    mode: "act",
    lumiiZone: "market-t1",
    highlightZone: "hand",
    dialogue: [
      { text: "Reserved artifacts can still be forged." },
      { text: "Notice the shortfall chips — they update live as you select affinities from the well." },
      { text: "Your collection is always one tap away — press your panel below to review it." },
      { text: "Gather what's needed, then forge it from your hand.", excited: true },
    ],
    completion: { type: "action", action: "forge_reserved" },
    wrongClickNudge: "Hold that Singularity for now. A harder path is coming.",
  },
  {
    id: "b12_tier2",
    mode: "act",
    lumiiZone: "needed-tab",
    highlightZone: "needed-tab",
    dialogue: [
      { text: "Your society is no longer choosing from nothing." },
      { text: "Earlier artifacts now pull certain futures closer." },
      { text: "The Needed view helps reveal artifacts that advance the path you are already building." },
      { text: "This one is within reach — but not perfectly." },
      { text: "Curious what your society holds? Tap your panel below to inspect your full collection." },
      { text: "Discounts have lowered the cost. Singularity can stand in for what you still lack." },
    ],
    completion: { type: "action", action: "forge_market" },
    wrongClickNudge: "Gather the required affinities, then use Singularity for any remaining gap.",
  },
  {
    id: "b13_tier3",
    mode: "semiOpen",
    lumiiZone: "market-t3",
    highlightZone: "market-t3",
    dialogue: [
      { text: "Now something changes." },
      { text: "Any of these Verdance artifacts will deepen the path you have shaped." },
      { text: "This choice belongs to you alone. I will hold the boundary still — gather what you need, then choose." },
    ],
    completion: { type: "action", action: "forge_market" },
    wrongClickNudge: "That path is beyond this society's reach for now. Its cost is too distant from what you have already shaped.",
    playerResponse: "I'll choose the path.",
  },
  {
    id: "b14_win_condition",
    mode: "listen",
    lumiiZone: "eminence",
    highlightZone: "eminence",
    dialogue: [
      { text: "Every artifact changes what your society can become." },
      { text: "Some also add Eminence." },
      { text: "Reach enough Eminence, and your society is no longer quiet in the cosmos." },
      { text: "In a full game, the first society to reach 15 Eminence wins." },
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
    id: "b16_final_forge",
    mode: "act",
    lumiiZone: "market-t2",
    foregroundCardId: "t2e05",
    highlightZone: "market-t2",
    dialogue: [
      { text: "One more artifact will make the path unmistakable." },
      { text: "Forge this, and the boundary will thin." },
    ],
    completion: { type: "action", action: "forge_final" },
    wrongClickNudge: "Gather the affinities for the final artifact.",
  },
  {
    id: "b17_luminary",
    mode: "cinematic",
    lumiiZone: "luminary",
    dialogue: [
      { text: "When a society expresses an affinity strongly enough, the boundary thins." },
      { text: "And something answers." },
    ],
    completion: { type: "animation" },
  },
  {
    id: "b18_victory",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "You followed Verdance to Eminence." },
      { text: "Other affinities lead elsewhere." },
      { text: "Now you know the first shape of the game." },
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

export const AFFINITY_SEQ_KEYS: GemKey[] = [
  "ruby", "pearl", "emerald", "sapphire", "onyx"
];

export const AFFINITY_SEQ_NAMES: Record<GemKey, string> = {
  ruby: "Flare",
  sapphire: "Continuum",
  emerald: "Verdance",
  onyx: "Abyss",
  pearl: "Radiance",
  flux: "Singularity",
};
