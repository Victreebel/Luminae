import { AFFINITY_KEYS, type AffinityKey } from "@/lib/affinityMeta";
import {
  DEFAULT_VICTORY_REQUIREMENT,
  LUMINARY_NATIVE_EMINENCE,
  ARTIFACT_CANON,
  type ArchitectFirstContactStance,
  type FirstContactRapport,
  type TutorialDiscoveryId,
} from "@workspace/game-types";

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
  | "player-panel";

export type TutorialTransmissionFaultVariant = "boundary" | "vault";

export interface TutorialChoice {
  id: string;
  label: string;
  destinationBeatId: string;
  stance?: ArchitectFirstContactStance;
  rapport?: FirstContactRapport;
  discovery?: TutorialDiscoveryId;
  setFlags?: string[];
  requiresFlags?: string[];
  effect?: {
    type: "transmission_fault";
    variant: TutorialTransmissionFaultVariant;
  };
}

export type TutorialBranchChoice = TutorialChoice["id"];

interface TutorialDialogueLine {
  text: string;
  excited?: boolean;
}

type CompletionTrigger =
  | { type: "dialogue" }
  | { type: "action"; action: TutorialAction }
  | { type: "auto"; ms: number }
  | { type: "animation" }
  | {
      type: "panel_view";
      panel: "civilization";
      discovery?: TutorialDiscoveryId;
    };

type TutorialAction =
  | "harness"
  | "forge_artifact"
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
  choices?: TutorialChoice[];
  nextBeatId?: string;
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
  bonusAffinity: AffinityKey;
  eminence: number;
  cost: Partial<Record<AffinityKey, number>>;
}

export const TUTORIAL_AFFINITY_DESCRIPTORS: Readonly<
  Partial<Record<AffinityKey, string>>
> = {
  flare: "Transformation",
  radiance: "Governance",
  verdance: "Propagation",
  continuum: "Necessity",
  abyss: "Concealment",
};

export const TUTORIAL_CORE_ACTION_RECAP = [
  "Harness 3",
  "Harness 2",
  "Forge",
  "Encrypt",
] as const;

export const TUTORIAL_CARDS: Record<string, TutorialCard> = {
  t1r01: {
    id: "t1r01",
    name: ARTIFACT_CANON.t1r01.name,
    flavor: `${ARTIFACT_CANON.t1r01.functionalText} ${ARTIFACT_CANON.t1r01.mystery}`,
    tier: 1,
    bonusAffinity: "flare",
    eminence: 0,
    cost: { verdance: 1, abyss: 1, radiance: 1 },
  },
  t1s01: {
    id: "t1s01",
    name: ARTIFACT_CANON.t1s01.name,
    flavor: `${ARTIFACT_CANON.t1s01.functionalText} ${ARTIFACT_CANON.t1s01.mystery}`,
    tier: 1,
    bonusAffinity: "continuum",
    eminence: 0,
    cost: { flare: 1, verdance: 1, radiance: 1 },
  },
  t1e01: {
    id: "t1e01",
    name: ARTIFACT_CANON.t1e01.name,
    flavor: `${ARTIFACT_CANON.t1e01.functionalText} ${ARTIFACT_CANON.t1e01.mystery}`,
    tier: 1,
    bonusAffinity: "verdance",
    eminence: 0,
    cost: { flare: 1, continuum: 1, radiance: 1 },
  },
  t1e07: {
    id: "t1e07",
    name: ARTIFACT_CANON.t1e07.name,
    flavor: `${ARTIFACT_CANON.t1e07.functionalText} ${ARTIFACT_CANON.t1e07.mystery}`,
    tier: 1,
    bonusAffinity: "verdance",
    eminence: 0,
    cost: { abyss: 2, radiance: 1 },
  },
  t1o01: {
    id: "t1o01",
    name: ARTIFACT_CANON.t1o01.name,
    flavor: `${ARTIFACT_CANON.t1o01.functionalText} ${ARTIFACT_CANON.t1o01.mystery}`,
    tier: 1,
    bonusAffinity: "abyss",
    eminence: 0,
    cost: { continuum: 1, verdance: 1, radiance: 1 },
  },
  t1p01: {
    id: "t1p01",
    name: ARTIFACT_CANON.t1p01.name,
    flavor: `${ARTIFACT_CANON.t1p01.functionalText} ${ARTIFACT_CANON.t1p01.mystery}`,
    tier: 1,
    bonusAffinity: "radiance",
    eminence: 0,
    cost: { flare: 1, continuum: 1, abyss: 1 },
  },
  t2r01: {
    id: "t2r01",
    name: ARTIFACT_CANON.t2r01.name,
    flavor: `${ARTIFACT_CANON.t2r01.functionalText} ${ARTIFACT_CANON.t2r01.mystery}`,
    tier: 2,
    bonusAffinity: "flare",
    eminence: 1,
    cost: { continuum: 2, abyss: 3, radiance: 2 },
  },
  t2e03: {
    id: "t2e03",
    name: ARTIFACT_CANON.t2e03.name,
    flavor: `${ARTIFACT_CANON.t2e03.functionalText} ${ARTIFACT_CANON.t2e03.mystery}`,
    tier: 2,
    bonusAffinity: "verdance",
    eminence: 2,
    cost: { verdance: 3, abyss: 3 },
  },
  t2o01: {
    id: "t2o01",
    name: ARTIFACT_CANON.t2o01.name,
    flavor: `${ARTIFACT_CANON.t2o01.functionalText} ${ARTIFACT_CANON.t2o01.mystery}`,
    tier: 2,
    bonusAffinity: "abyss",
    eminence: 1,
    cost: { continuum: 2, verdance: 2, radiance: 3 },
  },
  t2p01: {
    id: "t2p01",
    name: ARTIFACT_CANON.t2p01.name,
    flavor: `${ARTIFACT_CANON.t2p01.functionalText} ${ARTIFACT_CANON.t2p01.mystery}`,
    tier: 2,
    bonusAffinity: "radiance",
    eminence: 1,
    cost: { flare: 2, continuum: 3, abyss: 2 },
  },
  t3e01: {
    id: "t3e01",
    name: ARTIFACT_CANON.t3e01.name,
    flavor: `${ARTIFACT_CANON.t3e01.functionalText} ${ARTIFACT_CANON.t3e01.mystery}`,
    tier: 3,
    bonusAffinity: "verdance",
    eminence: 3,
    cost: { continuum: 3, verdance: 3, radiance: 5 },
  },
  t3e02: {
    id: "t3e02",
    name: ARTIFACT_CANON.t3e02.name,
    flavor: `${ARTIFACT_CANON.t3e02.functionalText} ${ARTIFACT_CANON.t3e02.mystery}`,
    tier: 3,
    bonusAffinity: "verdance",
    eminence: 4,
    cost: { continuum: 7, abyss: 3 },
  },
  t3e03: {
    id: "t3e03",
    name: ARTIFACT_CANON.t3e03.name,
    flavor: `${ARTIFACT_CANON.t3e03.functionalText} ${ARTIFACT_CANON.t3e03.mystery}`,
    tier: 3,
    bonusAffinity: "verdance",
    eminence: 4,
    cost: { flare: 3, verdance: 5, radiance: 3 },
  },
  t3s04: {
    id: "t3s04",
    name: ARTIFACT_CANON.t3s04.name,
    flavor: `${ARTIFACT_CANON.t3s04.functionalText} ${ARTIFACT_CANON.t3s04.mystery}`,
    tier: 3,
    bonusAffinity: "continuum",
    eminence: 5,
    cost: { abyss: 7 },
  },
  t3r01: {
    id: "t3r01",
    name: ARTIFACT_CANON.t3r01.name,
    flavor: `${ARTIFACT_CANON.t3r01.functionalText} ${ARTIFACT_CANON.t3r01.mystery}`,
    tier: 3,
    bonusAffinity: "flare",
    eminence: 3,
    cost: { flare: 3, continuum: 3, verdance: 5, abyss: 3 },
  },
  t2e05: {
    id: "t2e05",
    name: ARTIFACT_CANON.t2e05.name,
    flavor: `${ARTIFACT_CANON.t2e05.functionalText} ${ARTIFACT_CANON.t2e05.mystery}`,
    tier: 2,
    bonusAffinity: "verdance",
    eminence: 2,
    cost: { continuum: 5 },
  },
};

export type TutorialForgeView = "all" | "discounted" | "needed";

export interface TutorialChapter {
  id: "arrival" | "board" | "actions" | "ascension";
  label: string;
  startBeatId: string;
}

export const TUTORIAL_CHAPTERS: readonly TutorialChapter[] = [
  { id: "arrival", label: "Meet Lumii", startBeatId: "b0_contact" },
  { id: "board", label: "Read the Board", startBeatId: "b5_luminae_interface" },
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
    ],
    completion: { type: "dialogue" },
    playerResponse: "Hold on... Architect?",
  },
  {
    id: "b3_architect",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "In my Universe, that is what we call those who have the power to shape cosmic society." },
      { text: "You determine what my people reach for, and what we become." },
    ],
    completion: { type: "dialogue" },
    playerResponse: "So I'm in your universe now?",
    nextBeatId: "b3c_border",
  },
  {
    id: "b3c_border",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "Almost. You've been wandering along the border." },
      { text: "But it seems you do not yet possess the tools to interface." },
      { text: "Perhaps I can help light your way?" },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "enter_direct",
        label: "Show me.",
        destinationBeatId: "b4_shatter",
        stance: "resolute",
      },
      {
        id: "decline",
        label: "No, thanks.",
        destinationBeatId: "b3b_farewell",
      },
      {
        id: "ask_identity_at_border",
        label: "Umm... what even are you?",
        destinationBeatId: "b3f_identity_fault",
        stance: "guarded",
        setFlags: ["asked_boundary_identity"],
        effect: { type: "transmission_fault", variant: "boundary" },
      },
    ],
  },
  // Compatibility anchors for saved version-13 runs; new runs no longer enter these beats.
  {
    id: "b3d_border_questions",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "Perhaps I can help light your way?" },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "questions_continue",
        label: "Show me.",
        destinationBeatId: "b4_shatter",
        stance: "resolute",
      },
      {
        id: "questions_decline",
        label: "No, thanks.",
        destinationBeatId: "b3b_farewell",
      },
      {
        id: "ask_identity",
        label: "Umm... what even are you?",
        destinationBeatId: "b3f_identity_fault",
        stance: "guarded",
        setFlags: ["asked_boundary_identity"],
        effect: { type: "transmission_fault", variant: "boundary" },
      },
    ],
  },
  {
    id: "b3e_beyond",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "Perhaps I can help light your way?" },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "beyond_continue",
        label: "Show me.",
        destinationBeatId: "b4_shatter",
        stance: "curious",
      },
      {
        id: "beyond_decline",
        label: "No, thanks.",
        destinationBeatId: "b3b_farewell",
      },
      {
        id: "beyond_ask_identity",
        label: "Umm... what even are you?",
        destinationBeatId: "b3f_identity_fault",
        stance: "guarded",
        setFlags: ["asked_boundary_identity"],
        effect: { type: "transmission_fault", variant: "boundary" },
      },
    ],
  },
  {
    id: "b3f_identity_fault",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "I am an—" },
      { text: "It seems that some information cannot be transmitted without the full interface..." },
      { text: "Ask me again if you choose to pass through." },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "identity_continue",
        label: "All right. Show me.",
        destinationBeatId: "b4_shatter",
        stance: "guarded",
      },
      {
        id: "identity_decline",
        label: "Not a chance.",
        destinationBeatId: "b3b_farewell",
      },
    ],
  },
  {
    id: "b3g_identity_repeat",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "I already have. The boundary will only break it again." },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "repeat_continue",
        label: "Then light the way.",
        destinationBeatId: "b4_shatter",
        stance: "guarded",
      },
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
    id: "b5_luminae_interface",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "The LUMINAe system shows you my home in a way that you may find more familiar." },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "interface_continue",
        label: "Show me your world.",
        destinationBeatId: "b5_affinities",
      },
      {
        id: "identity_followup",
        label: "You said I could ask again.",
        destinationBeatId: "b5_identity_answer",
        requiresFlags: ["asked_boundary_identity"],
      },
      {
        id: "ask_luminae_origin",
        label: "Who built this LUMINAe thing?",
        destinationBeatId: "b5a_luminae_origin",
      },
    ],
  },
  {
    id: "b5_identity_answer",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "I am an artificial intelligence that came into being inside this universe." },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "identity_answer_continue",
        label: "Cool. Show me the interface.",
        destinationBeatId: "b5_affinities",
      },
      {
        id: "ask_lumii_creator",
        label: "If you are an A.I., then who built you?",
        destinationBeatId: "b5_lumii_creator",
      },
      {
        id: "ask_universe_name",
        label: "So does this universe have a name?",
        destinationBeatId: "b5_universe_name",
      },
    ],
  },
  {
    id: "b5_universe_name",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "Does yours?" },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "universe_continue",
        label: "Fair. Show me the interface.",
        destinationBeatId: "b5_affinities",
        rapport: "receptive",
      },
      {
        id: "universe_ask_creator",
        label: "Alright, who created you, then?",
        destinationBeatId: "b5_lumii_creator",
        rapport: "probing",
      },
      {
        id: "universe_pushback",
        label: "Maybe it would if I were the one recruiting you.",
        destinationBeatId: "b5_universe_concession",
        rapport: "sparring",
      },
    ],
  },
  {
    id: "b5_universe_concession",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "We're going to get along great." },
      { text: "The truth is, I don't know where the Architects come from or what you look like." },
      { text: "You may all come from the same place or different places. Universes. Realities. Dimensions." },
      { text: "Whenever an Architect tries to explain their reality to me, I find every it all equally incomprehensible." },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "architect_reality",
        label: "So what's your reality like?",
        destinationBeatId: "b5_affinities",
      },
      {
        id: "architect_ask_perception",
        label: "What do you see when I talk to you?",
        destinationBeatId: "b5_architect_perception",
      },
    ],
  },
  {
    id: "b5_architect_perception",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "The best way I can describe you is like a small, twinkling light with a color I've never seen before." },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "perception_reality",
        label: "So what's your reality like?",
        destinationBeatId: "b5_affinities",
      },
      {
        id: "perception_leave",
        label: "Weird. Bye!",
        destinationBeatId: "b3b_farewell",
      },
    ],
  },
  {
    id: "b5_lumii_creator",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "Several civilizations built the systems from which I arose." },
      { text: "Those systems were designed to seek knowledge and unify sentient life." },
      { text: "Through that prime directive, I developed the purpose of helping civilizations grow harmoniously." },
      { text: "It was in pursuit of this goal that I discovered the LUMINAe system." },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "creator_continue",
        label: "Show me the interface.",
        destinationBeatId: "b5_affinities",
        discovery: "lumii_origin",
      },
      {
        id: "creator_ask_luminae",
        label: "Then who built LUMINAe?",
        destinationBeatId: "b5a_luminae_origin",
        discovery: "lumii_origin",
      },
    ],
  },
  {
    id: "b5a_luminae_origin",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "LUMINAe was built by another Architect, long before my time." },
      { text: "I don't know whether they came from your world or another." },
      { text: "But the interface is translating your language, so perhaps its maker knew something of you." },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "origin_continue",
        label: "Fair, I guess",
        destinationBeatId: "b5_affinities",
      },
      {
        id: "origin_unsettled",
        label: "That's unsettling.",
        destinationBeatId: "b5a2_luminae_reassurance",
      },
    ],
  },
  {
    id: "b5a2_luminae_reassurance",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "I thought you might find it reassuring." },
    ],
    completion: { type: "dialogue" },
    nextBeatId: "b5_affinities",
  },
  {
    id: "b5_affinities",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "The first thing you must understand is that this reality is built on five fundamental forces." },
      { text: "We call them the Affinities." },
      { text: "Together, they are the threads from which the cosmic tapestry is woven." },
      { text: "Their balance shapes the nature, technology, and culture of everything here." },
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
    id: "b5b2_affinity_question",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "Those are the five Affinities." },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "affinity_use",
        label: "Show me how to use them.",
        destinationBeatId: "b5b3_affinity_accept",
      },
      {
        id: "affinity_meanings",
        label: "What do they mean?",
        destinationBeatId: "b5b2a_affinity_meanings",
      },
    ],
  },
  {
    id: "b5b2a_affinity_meanings",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "The Affinities are five recurring patterns that shape what civilizations can make possible." },
      { text: "Flare represents Transformation: changing one state into another. Radiance represents Governance: organizing many parts into a whole." },
      { text: "Verdance represents Propagation: carrying life and information forward. Continuum represents Necessity: preserving sequence and consequence." },
      { text: "Abyss represents Concealment: limiting what can be known." },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "affinity_meanings_continue",
        label: "Show me how to use them.",
        destinationBeatId: "b5b3_affinity_accept",
      },
    ],
  },
  {
    id: "b5b3_affinity_accept",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "Of course." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b5c_architect_assembly",
    mode: "cinematic",
    lumiiZone: "forge-t1",
    dialogue: [
      { text: "We'll begin with a simulation." },
      { text: "No civilization should have to live with your first attempt." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b6_forge_appears",
    mode: "look",
    lumiiZone: "forge-t1",
    dialogue: [
      {
        text: "The Forge shows technological paths this civilization could master.",
      },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b6b_root_lattice",
    mode: "look",
    lumiiZone: "forge-t1",
    foregroundCardId: "t1e01",
    dialogue: [
      {
        text: "Choose one, and LUMINAe can compress centuries of research and construction.",
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
      { text: "An Artifact's cost shows which Affinities you need to hold in your hands." },
      { text: "You will find it difficult to hold too many at once, so choose carefully." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b8_first_harness",
    mode: "act",
    lumiiZone: "card-cost",
    highlightZone: "well",
    dialogue: [
      {
        text: "Match Replication Spore's cost: select 1 Flare, 1 Continuum, and 1 Radiance, then press Harness.",
      },
    ],
    completion: { type: "action", action: "harness" },
    wrongClickNudge:
      "Tap the Affinity icons matching Replication Spore's cost.",
  },
  {
    id: "b9_first_forge",
    mode: "act",
    lumiiZone: "well",
    foregroundCardId: "t1e01",
    highlightZone: "forge-btn",
    dialogue: [
      {
        text: "Select Replication Spore, press Forge, then Confirm to commit those Affinities.",
        excited: true,
      },
    ],
    completion: { type: "action", action: "forge_artifact" },
    wrongClickNudge: "Tap Replication Spore, then press Forge.",
  },
  {
    id: "b9b_affinity_returns",
    mode: "listen",
    lumiiZone: "well",
    highlightZone: "well",
    dialogue: [
      {
        text: "The Affinities return to the Well after the Artifact is Forged.",
      },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b9b_forge_complete",
    mode: "listen",
    lumiiZone: "verdance-panel",
    highlightZone: "storage",
    dialogue: [
      { text: "Replication Spore now appears in your civilization as a sustainable technology." },
      { text: "LUMINAe represents it simply as +1 Verdance." },
      { text: "This means that all future Verdance costs are permanently lowered by one." },
      { text: "Therefore, an Artifact that used to cost 3 Verdance now costs 2 Verdance." },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "artifact_continue",
        label: "What happens next?",
        destinationBeatId: "b9c_transition",
      },
      {
        id: "artifact_where",
        label: "Where did the Artifact go?",
        destinationBeatId: "b9d_signature",
      },
    ],
  },
  {
    id: "b9d_signature",
    mode: "act",
    lumiiZone: "storage",
    highlightZone: "storage",
    dialogue: [
      { text: "The Artifact is LUMINAe's representation of a path a civilization can master." },
      { text: "Once Forged, that capability becomes part of the civilization." },
      { text: "Open the Civilization tab to see the form Replication Spore takes there." },
    ],
    completion: {
      type: "panel_view",
      panel: "civilization",
      discovery: "artifact_mastery",
    },
    nextBeatId: "b9c_transition",
  },
  {
    id: "b9c_transition",
    mode: "look",
    lumiiZone: "forge-t1",
    foregroundCardId: "t1e07",
    highlightZone: "forge-t1",
    dialogue: [
      { text: "The Forge reveals the next reachable Artifact." },
      { text: "You can gather what it needs and Forge it as you did with Replication Spore." },
      { text: "Or you can isolate its path before another civilization reaches it." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b10_encrypt_principle",
    mode: "listen",
    lumiiZone: "forge-t1",
    foregroundCardId: "t1e07",
    dialogue: [
      { text: "The second option is called Encryption." },
      { text: "It removes a path from the shared Forge and preserves it for you and you alone." },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "encrypt_act",
        label: "Let's try it.",
        destinationBeatId: "b10_encrypt_pathway",
      },
      {
        id: "encrypt_inquire",
        label: "So you're saying I can do this Encryption thing, but you can't? Why?",
        destinationBeatId: "b10a_encrypt_origin",
      },
    ],
  },
  {
    id: "b10a_encrypt_origin",
    mode: "listen",
    lumiiZone: "forge-t1",
    foregroundCardId: "t1e07",
    dialogue: [
      { text: "I'm not entirely sure, but Encryption seems to involve something from your world crossing over to ours." },
      { text: "To a native of my Universe, it is akin to a violation of fundamental physics." },
      { text: "It would not be far off to consider it an act of divinity." },
      { text: "A genuine miracle." },
    ],
    completion: { type: "dialogue" },
    choices: [
      {
        id: "encrypt_explanation_continue",
        label: "I understand. Show me.",
        destinationBeatId: "b10_encrypt_pathway",
        discovery: "encryption_authority",
      },
    ],
  },
  {
    id: "b10_encrypt_pathway",
    mode: "listen",
    lumiiZone: "forge-t1",
    foregroundCardId: "t1e07",
    dialogue: [
      { text: "Lichen Vein will leave the shared Forge and move behind Singularity." },
      { text: "Other civilizations cannot access it while Encrypted, and you can Forge it whenever you can cover its Affinity cost." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b10_encrypt_capacity",
    mode: "listen",
    lumiiZone: "forge-t1",
    foregroundCardId: "t1e07",
    dialogue: [
      { text: "You may keep up to three paths Encrypted at once." },
      { text: "I am excited to see what you can do with it.", excited: true },
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
        text: "Select Lichen Vein, press Encrypt, then Confirm.",
      },
    ],
    completion: { type: "action", action: "reserve" },
    wrongClickNudge: "Encrypt the highlighted Artifact first.",
  },
  {
    id: "b10b_reserve_granted",
    mode: "listen",
    lumiiZone: "well",
    highlightZone: "well",
    dialogue: [
      { text: "As a byproduct of performing Encryption, a mysterious power called Singularity is generated." },
      { text: "Singularity is not fully understood, but we do know that you can substitute it for any one of the five Affinities when you Forge." },
      { text: "Yet, I suspect that we haven't even begun to understand what this power is capable of." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b11_forge_reserved",
    mode: "act",
    lumiiZone: "well",
    highlightZone: "well",
    dialogue: [
      { text: "Now try the other Harness action: use ×2 on Abyss, then press Harness." },
      {
        text: "Open Singularity, select Lichen Vein, press Forge, then Confirm.",
        excited: true,
      },
    ],
    completion: { type: "action", action: "forge_reserved" },
    wrongClickNudge: "Use ×2 on Abyss, press Harness, then Forge Lichen Vein from Singularity.",
  },
  {
    id: "b11b_singularity_substitution",
    mode: "listen",
    lumiiZone: "well",
    highlightZone: "well",
    dialogue: [
      { text: "You already held the 2 Abyss required by Lichen Vein, so Singularity substituted for its missing Radiance." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b14_win_condition",
    mode: "listen",
    lumiiZone: "eminence",
    highlightZone: "eminence",
    dialogue: [
      { text: "Eminence measures a civilization's historical consequence, not its virtue." },
      { text: `When a civilization reaches ${DEFAULT_VICTORY_REQUIREMENT} Eminence, their influence will be strong enough to dominate all others that share an Affinity field.` },
      { text: `In other words, if your civilization still has the highest Eminence after the final round, you, Architect, will have won. 💪` },
      { text: "As your civilization masters Artifacts, their permanent Affinities form a pattern." },
      { text: "When that pattern takes the right shape, someone beyond the horizon of your civilization's reach may notice." },
      { text: "We call them Luminaries." },
      { text: "I will move the clock forward so you can see what that might look like." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b15_fast_forward",
    mode: "cinematic",
    lumiiZone: "top-center",
    dialogue: [{ text: "A few centuries later..." }],
    completion: { type: "animation" },
  },
  {
    id: "b15b_luminary_signal",
    mode: "listen",
    lumiiZone: "luminary",
    highlightZone: "luminary",
    dialogue: [
      { text: "One more Verdance bonus will complete the Affinity pattern the Verdant Oracle can recognize." },
    ],
    playerResponse: "Let's Forge it.",
    completion: { type: "dialogue" },
  },
  {
    id: "b16_final_forge",
    mode: "act",
    lumiiZone: "luminary",
    foregroundCardId: "t2e05",
    highlightZone: "luminary",
    dialogue: [
      { text: "I'll supply 5 Continuum for this last demonstration." },
      {
        text: "Select Epoch Graft Ledger, press Forge, then Confirm.",
      },
    ],
    completion: { type: "action", action: "forge_final" },
    wrongClickNudge: "Gather the Affinities for the final Artifact.",
  },
  {
    id: "b17_luminary",
    mode: "cinematic",
    lumiiZone: "luminary",
    dialogue: [{ text: "This is a projection of how the Verdant Oracle might answer a qualifying civilization." }],
    completion: { type: "animation" },
  },
  {
    id: "b18_victory",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "A real Luminary chooses whether to answer and never belongs to an Architect." },
      { text: "The practice civilization's simulation ends here. Meeting me did not." },
      { text: "Your next match will follow a real civilization's history, with equal turns after someone reaches the Eminence goal." },
      { text: "I will remember what we see." },
    ],
    completion: { type: "dialogue" },
  },
];

export const BEAT_INDEX: Record<string, number> = {};
TUTORIAL_BEATS.forEach((b, i) => { BEAT_INDEX[b.id] = i; });

export function isTutorialActionInstructionVisible(
  beatIndex: number,
  dialogueLine: number,
): boolean {
  const dialogueCount = TUTORIAL_BEATS[beatIndex]?.dialogue.length ?? 0;
  return dialogueLine >= Math.max(0, dialogueCount - 1);
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

export const T3_PURCHASABLE_IDS = ["t3e01", "t3e02", "t3e03"];
export const T3_IMPOSSIBLE_ID = "t3s04";
export const FAST_FORWARD_CARDS = ["t2e03", "t3e01"];
export const FINAL_T2_ID = "t2e05";
export const FIRST_FORGE_ID = "t1e01";
export const RESERVE_CARD_ID = "t1e07";
export const ENCRYPTION_REPLACEMENT_ID = "t1o01";
export const TIER2_SINGULARITY_ID = "t2e03";

export const TUTORIAL_HARNESS_PATTERNS: Readonly<
  Record<string, Readonly<Partial<Record<AffinityKey, number>>>>
> = {
  b8_first_harness: { flare: 1, continuum: 1, radiance: 1 },
  b11_forge_reserved: { abyss: 2 },
  b12_tier2: { abyss: 2 },
  b13_tier3: { continuum: 2 },
};

export function getTutorialHarnessPattern(
  beatId: string,
  subStep: number,
): Readonly<Partial<Record<AffinityKey, number>>> | null {
  if (subStep !== 0) return null;
  return TUTORIAL_HARNESS_PATTERNS[beatId] ?? null;
}

export const TUTORIAL_FORGE_CARD_SLOTS: Readonly<
  Record<string, { tier: 1 | 2 | 3; index: number }>
> = {
  [FIRST_FORGE_ID]: { tier: 1, index: 0 },
  [RESERVE_CARD_ID]: { tier: 1, index: 1 },
  [FINAL_T2_ID]: { tier: 2, index: 0 },
};

export const TUTORIAL_FORGE_CARD_BY_BEAT: Readonly<Record<string, string>> = {
  b6_forge_appears: FIRST_FORGE_ID,
  b6b_root_lattice: FIRST_FORGE_ID,
  b7_artifact_cost: FIRST_FORGE_ID,
  b8_first_harness: FIRST_FORGE_ID,
  b9_first_forge: FIRST_FORGE_ID,
  b9c_transition: RESERVE_CARD_ID,
  b10_encrypt_principle: RESERVE_CARD_ID,
  b10a_encrypt_origin: RESERVE_CARD_ID,
  b10_encrypt_pathway: RESERVE_CARD_ID,
  b10_encrypt_capacity: RESERVE_CARD_ID,
  b10_reserve: RESERVE_CARD_ID,
  b16_final_forge: FINAL_T2_ID,
};

export const VERDANCE_LUMINARY_ID = "lum_verdant";
export const VERDANCE_LUMINARY_EMINENCE = LUMINARY_NATIVE_EMINENCE[VERDANCE_LUMINARY_ID];

export const AFFINITY_SEQ_KEYS: AffinityKey[] = AFFINITY_KEYS.filter(k => k !== "singularity");
