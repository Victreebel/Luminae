import { AFFINITY_KEYS, type AffinityKey } from "@/lib/affinityMeta";
import {
  DEFAULT_VICTORY_REQUIREMENT,
  type ArchitectFirstContactStance,
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

export type TutorialBranchChoice =
  | ArchitectFirstContactStance
  | "go"
  | "home"
  | "continue"
  | "inquire"
  | "origin_unsettled"
  | "origin_expected"
  | "artifact_continue"
  | "artifact_where"
  | "encrypt_inquire"
  | "encrypt_act";

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
  | "forge_artifact"
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
  choices?: { label: string; value: TutorialBranchChoice }[];
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
    name: "Ignition Kernel",
    flavor: "A caged spark that lights furnaces and cities but refuses to spread. No one knows who first taught fire restraint.",
    tier: 1,
    bonusAffinity: "flare",
    eminence: 0,
    cost: { verdance: 1, abyss: 1, radiance: 1 },
  },
  t1s01: {
    id: "t1s01",
    name: "Echo Splinter",
    flavor: "A crystal splinter that hears a structure fail moments before it breaks. Each warning sounds faintly like a voice.",
    tier: 1,
    bonusAffinity: "continuum",
    eminence: 0,
    cost: { flare: 1, verdance: 1, radiance: 1 },
  },
  t1e01: {
    id: "t1e01",
    name: "Replication Spore",
    flavor: "A spore bred to repair damaged land without taking it over. It stops growing at borders no instrument can detect.",
    tier: 1,
    bonusAffinity: "verdance",
    eminence: 0,
    cost: { flare: 1, continuum: 1, radiance: 1 },
  },
  t1e07: {
    id: "t1e07",
    name: "Lichen Vein",
    flavor: "Engineered lichen grows through stone and closes its cracks. Old walls repaired this way sometimes develop new doorways.",
    tier: 1,
    bonusAffinity: "verdance",
    eminence: 0,
    cost: { abyss: 2, radiance: 1 },
  },
  t1o01: {
    id: "t1o01",
    name: "Entropy Veil",
    flavor: "The veil hides the heat of failing machines until repairs arrive. Used too long, it also hides the failure from its owners.",
    tier: 1,
    bonusAffinity: "abyss",
    eminence: 0,
    cost: { continuum: 1, verdance: 1, radiance: 1 },
  },
  t1p01: {
    id: "t1p01",
    name: "Correction Seed",
    flavor: "Planted inside a damaged system, it guides the whole toward repair. What returns is healthier, but never quite the same.",
    tier: 1,
    bonusAffinity: "radiance",
    eminence: 0,
    cost: { flare: 1, continuum: 1, abyss: 1 },
  },
  t2r01: {
    id: "t2r01",
    name: "Stellar Crucible",
    flavor: "This chamber turns matter drawn from a star into materials no planet can make. Its walls remember every sun they have touched.",
    tier: 2,
    bonusAffinity: "flare",
    eminence: 1,
    cost: { continuum: 2, abyss: 3, radiance: 2 },
  },
  t2e03: {
    id: "t2e03",
    name: "Abyssal Culture Flask",
    flavor: "A sealed flask where life learns to thrive without light. Shapes gather against the glass when no one is watching.",
    tier: 2,
    bonusAffinity: "verdance",
    eminence: 2,
    cost: { verdance: 3, abyss: 3 },
  },
  t2o01: {
    id: "t2o01",
    name: "Horizon Extractor",
    flavor: "The extractor samples the edge of dangerous physics without crossing it. Something at the boundary occasionally samples back.",
    tier: 2,
    bonusAffinity: "abyss",
    eminence: 1,
    cost: { continuum: 2, verdance: 2, radiance: 3 },
  },
  t2p01: {
    id: "t2p01",
    name: "Containment Lattice",
    flavor: "Every dangerous chamber in this lattice can be inspected from outside. One sealed cell appears empty from every angle.",
    tier: 2,
    bonusAffinity: "radiance",
    eminence: 1,
    cost: { flare: 2, continuum: 3, abyss: 2 },
  },
  t3e01: {
    id: "t3e01",
    name: "Xenobiome Route Graft",
    flavor: "Carries living material safely between incompatible ecologies. Some grafts grow toward worlds not on any chart.",
    tier: 3,
    bonusAffinity: "verdance",
    eminence: 3,
    cost: { continuum: 3, verdance: 3, radiance: 5 },
  },
  t3e02: {
    id: "t3e02",
    name: "Stellar Habitat Genome",
    flavor: "Encodes habitats that adapt to different stars without becoming identical. A dormant genome names a star not yet born.",
    tier: 3,
    bonusAffinity: "verdance",
    eminence: 4,
    cost: { continuum: 7, abyss: 3 },
  },
  t3e03: {
    id: "t3e03",
    name: "Extinction Immunome",
    flavor: "Teaches living systems to survive failure patterns recovered from dead worlds. It remembers an extinction that has not happened.",
    tier: 3,
    bonusAffinity: "verdance",
    eminence: 4,
    cost: { flare: 3, verdance: 5, radiance: 3 },
  },
  t3s04: {
    id: "t3s04",
    name: "Relativistic Chronology Governor",
    flavor: "Lets distant systems share an ordered history across unequal clocks. Several valid dates insist they came first.",
    tier: 3,
    bonusAffinity: "continuum",
    eminence: 5,
    cost: { abyss: 7 },
  },
  t3r01: {
    id: "t3r01",
    name: "Relicfire Interpreter",
    flavor: "Translates alien ignition systems into safe startup sequences. One extinct lineage asks whether the star consents.",
    tier: 3,
    bonusAffinity: "flare",
    eminence: 3,
    cost: { flare: 3, continuum: 3, verdance: 5, abyss: 3 },
  },
  t2e05: {
    id: "t2e05",
    name: "Epoch Graft Ledger",
    flavor: "A living ledger grows a new band whenever an age ends. One ring records an era absent from every history.",
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
      { text: "You can think of me as your guide." },
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
    id: "b3a_stance_curious",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "You can discover what becomes possible when a civilization can hear you." },
    ],
    completion: { type: "dialogue" },
    nextBeatId: "b3c_border",
  },
  {
    id: "b3a_stance_guarded",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "Only what you choose to reveal through the interface." },
      { text: "I cannot see beyond it." },
    ],
    completion: { type: "dialogue" },
    nextBeatId: "b3c_border",
  },
  {
    id: "b3a_stance_resolute",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "You can make certain paths reachable." },
      { text: "The civilizations themselves decide what to build from them." },
    ],
    completion: { type: "dialogue" },
    nextBeatId: "b3c_border",
  },
  {
    id: "b3c_border",
    mode: "listen",
    lumiiZone: "center",
    dialogue: [
      { text: "Almost. You've been wandering along the border." },
      { text: "But it seems you do not yet possess the tools to use the interface." },
      { text: "Perhaps I can help." },
    ],
    completion: { type: "dialogue" },
    choices: [
      { label: "Show me.", value: "go" },
      { label: "Umm... no, thanks.", value: "home" },
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
      { label: "Show me your world.", value: "continue" },
      { label: "Who built LUMINAe?", value: "inquire" },
    ],
  },
  {
    id: "b5a_luminae_origin",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "LUMINAe was built by another Architect, long before my time." },
      { text: "I don't know whether they came from your world." },
      { text: "But the interface is translating your language, so its maker must have known something about you." },
    ],
    completion: { type: "dialogue" },
    choices: [
      { label: "Fair, I guess", value: "continue" },
      { label: "That's unsettling.", value: "origin_unsettled" },
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
    id: "b5a3_luminae_expected",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "Perhaps." },
    ],
    completion: { type: "dialogue" },
    nextBeatId: "b5_affinities",
  },
  {
    id: "b5_affinities",
    mode: "cinematic",
    lumiiZone: "center",
    dialogue: [
      { text: "The first thing you must understand is that this world is built on five fundamental forces." },
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
    dialogue: [],
    completion: { type: "dialogue" },
    playerResponse: "Can you show me how to use them?",
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
      { text: "An Artifact's cost shows which Affinities must be held in readiness." },
      { text: "You will find it difficult to hold more than 10 at once, so choose carefully." },
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
        text: "The Affinities return to the Well once the civilization can sustain the Artifact without them.",
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
      { text: "Replication Spore gives your civilization +1 Verdance." },
      { text: "It now counts as a permanent Affinity, reducing all other Verdance costs by one." },
      { text: "Therefore, if an Artifact used to cost 3 Verdance, it now only costs 2." },
    ],
    completion: { type: "dialogue" },
    choices: [
      { label: "What happens next?", value: "artifact_continue" },
      { label: "Where did the Artifact go?", value: "artifact_where" },
    ],
  },
  {
    id: "b9d_signature",
    mode: "listen",
    lumiiZone: "forge-t1",
    highlightZone: "storage",
    dialogue: [
      { text: "Mastering an Artifact leaves its class signature in the local Affinity field." },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b9e_interference",
    mode: "listen",
    lumiiZone: "forge-t1",
    highlightZone: "forge-t1",
    dialogue: [
      { text: "That interference can delay nearby civilizations from mastering the same class for centuries." },
      { text: "This is only a simulation." },
      { text: "In a real history, the Civilization tab will show what you have accomplished." },
      { text: "For now, let's focus, hmm?" },
    ],
    completion: { type: "dialogue" },
  },
  {
    id: "b9c_transition",
    mode: "look",
    lumiiZone: "forge-t1",
    foregroundCardId: "t1e07",
    highlightZone: "forge-t1",
    dialogue: [
      { text: "The Forge reveals the next reachable Artifact." },
      { text: "You can gather what it needs and Forge it." },
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
      { text: "It is an authority only an Architect can exercise through LUMINAe." },
      { text: "Not even I can do it." },
    ],
    completion: { type: "dialogue" },
    choices: [
      { label: "Let's try it.", value: "encrypt_act" },
      { label: "Why can't you do the Encryption thing?", value: "encrypt_inquire" },
    ],
  },
  {
    id: "b10a_encrypt_origin",
    mode: "listen",
    lumiiZone: "forge-t1",
    foregroundCardId: "t1e07",
    dialogue: [
      { text: "Encryption reaches through LUMINAe itself." },
      { text: "Its authority comes from beyond my universe." },
    ],
    completion: { type: "dialogue" },
    nextBeatId: "b10_encrypt_pathway",
  },
  {
    id: "b10_encrypt_pathway",
    mode: "listen",
    lumiiZone: "forge-t1",
    foregroundCardId: "t1e07",
    dialogue: [
      { text: "Encryption keeps the pathway open for you without committing it." },
      { text: "No mastery signature is created until you Forge the Artifact." },
      { text: "Once Encrypted, the pathway to that Artifact will remain hidden even from other Architects." },
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
      { text: "Encrypted Artifacts are stored behind the Singularity cell." },
      { text: "Encryption also grants you 1 Singularity." },
      { text: "It is a byproduct of the energies flowing into our Universe from yours." },
      { text: "We have found that it can be used as a substitute for any of the five natural Affinities." },
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
      { text: "You already possessed the 2 Abyss Lichen Vein required, so Singularity substituted for its missing Radiance." },
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
      { text: `When any civilization reaches ${DEFAULT_VICTORY_REQUIREMENT}, the final round begins.` },
      { text: "The civilization with the highest Eminence at the end wins." },
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
      { text: "The simulation ends here." },
      { text: "Your next match will follow a real civilization's history." },
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
export const VERDANCE_LUMINARY_EMINENCE = 1;

export const AFFINITY_SEQ_KEYS: AffinityKey[] = AFFINITY_KEYS.filter(k => k !== "singularity");
