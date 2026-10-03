export type TutorialCopyStatus = "locked" | "approved" | "draft";

export type TutorialCopyLocator =
  | { kind: "dialogue"; beatId: string; lineIndex: number }
  | { kind: "player_response"; beatId: string }
  | { kind: "choice"; beatId: string; choiceId: string }
  | { kind: "affinity_subtitle"; affinity: string };

export interface TutorialCopyDecision {
  locator: TutorialCopyLocator;
  status: Exclude<TutorialCopyStatus, "draft">;
  text: string;
  provenance: "user-authored" | "user-approved";
}

export const TUTORIAL_DIALOGUE_POLICY_VERSION = 1;

/**
 * Exact copy decisions made by the user. Anything absent from this ledger is a
 * draft, even when it is already live. Changing a decision requires explicit
 * copy approval; behavior or layout work is not sufficient authorization.
 */
export const TUTORIAL_COPY_DECISIONS = [
  {
    locator: { kind: "dialogue", beatId: "b3_architect", lineIndex: 0 },
    status: "locked",
    text: "In my Universe, that is what we call those who have the power to shape cosmic society.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b3_architect", lineIndex: 1 },
    status: "locked",
    text: "You determine what my people reach for, and what we become.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "player_response", beatId: "b3_architect" },
    status: "locked",
    text: "So I'm in your universe now?",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b3c_border", lineIndex: 0 },
    status: "approved",
    text: "Almost. You've been wandering along the border.",
    provenance: "user-approved",
  },
  {
    locator: { kind: "dialogue", beatId: "b3c_border", lineIndex: 1 },
    status: "locked",
    text: "But it seems you do not yet possess the tools to interface.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b3c_border", lineIndex: 2 },
    status: "locked",
    text: "Perhaps I can help light your way?",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b3c_border", choiceId: "enter_direct" },
    status: "locked",
    text: "Show me.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b3c_border", choiceId: "decline" },
    status: "locked",
    text: "No, thanks.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b3c_border", choiceId: "ask_identity_at_border" },
    status: "locked",
    text: "Umm... what even are you?",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b3f_identity_fault", lineIndex: 0 },
    status: "locked",
    text: "I am an—",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b3f_identity_fault", lineIndex: 1 },
    status: "locked",
    text: "It seems that some information cannot be transmitted without the full interface...",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b3f_identity_fault", lineIndex: 2 },
    status: "locked",
    text: "Ask me again if you choose to pass through.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b3f_identity_fault", choiceId: "identity_continue" },
    status: "locked",
    text: "All right. Show me.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b3f_identity_fault", choiceId: "identity_decline" },
    status: "locked",
    text: "Not a chance.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b3b_farewell", lineIndex: 0 },
    status: "approved",
    text: "Very well. May we meet again.",
    provenance: "user-approved",
  },
  {
    locator: { kind: "choice", beatId: "b5_luminae_interface", choiceId: "interface_continue" },
    status: "approved",
    text: "Show me your world.",
    provenance: "user-approved",
  },
  {
    locator: { kind: "choice", beatId: "b5_luminae_interface", choiceId: "identity_followup" },
    status: "locked",
    text: "You said I could ask again.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b5_luminae_interface", choiceId: "ask_luminae_origin" },
    status: "locked",
    text: "Who built this LUMINAe thing?",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_identity_answer", lineIndex: 0 },
    status: "locked",
    text: "I am an artificial intelligence that came into being inside this universe.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b5_identity_answer", choiceId: "identity_answer_continue" },
    status: "locked",
    text: "Cool. Show me the interface.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b5_identity_answer", choiceId: "ask_lumii_creator" },
    status: "locked",
    text: "If you are an A.I., then who built you?",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b5_identity_answer", choiceId: "ask_universe_name" },
    status: "locked",
    text: "So does this universe have a name?",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_universe_name", lineIndex: 0 },
    status: "locked",
    text: "Does yours?",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b5_universe_name", choiceId: "universe_continue" },
    status: "locked",
    text: "Fair. Show me the interface.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b5_universe_name", choiceId: "universe_ask_creator" },
    status: "locked",
    text: "Alright, who created you, then?",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b5_universe_name", choiceId: "universe_pushback" },
    status: "locked",
    text: "Maybe it would if I were the one recruiting you.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_universe_concession", lineIndex: 0 },
    status: "locked",
    text: "We're going to get along great.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_universe_concession", lineIndex: 1 },
    status: "locked",
    text: "The truth is, I don't know where the Architects come from or what you look like.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_universe_concession", lineIndex: 2 },
    status: "locked",
    text: "You may all come from the same place or different places. Universes. Realities. Dimensions.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_universe_concession", lineIndex: 3 },
    status: "locked",
    text: "Whenever an Architect tries to explain their reality to me, I find every it all equally incomprehensible.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b5_universe_concession", choiceId: "architect_reality" },
    status: "locked",
    text: "So what's your reality like?",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b5_universe_concession", choiceId: "architect_ask_perception" },
    status: "locked",
    text: "What do you see when I talk to you?",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_architect_perception", lineIndex: 0 },
    status: "locked",
    text: "The best way I can describe you is like a small, twinkling light with a color I've never seen before.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b5_architect_perception", choiceId: "perception_reality" },
    status: "locked",
    text: "So what's your reality like?",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b5_architect_perception", choiceId: "perception_leave" },
    status: "locked",
    text: "Weird. Bye!",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_lumii_creator", lineIndex: 0 },
    status: "locked",
    text: "Several civilizations built the systems from which I arose.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_lumii_creator", lineIndex: 1 },
    status: "locked",
    text: "Those systems were designed to seek knowledge and unify sentient life.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_lumii_creator", lineIndex: 2 },
    status: "locked",
    text: "Through that prime directive, I developed the purpose of helping civilizations grow harmoniously.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_lumii_creator", lineIndex: 3 },
    status: "locked",
    text: "It was in pursuit of this goal that I discovered the LUMINAe system.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5a_luminae_origin", lineIndex: 0 },
    status: "locked",
    text: "LUMINAe was built by another Architect, long before my time.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5a_luminae_origin", lineIndex: 1 },
    status: "locked",
    text: "I don't know whether they came from your world or another.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5a_luminae_origin", lineIndex: 2 },
    status: "locked",
    text: "But the interface is translating your language, so perhaps its maker knew something of you.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b5a_luminae_origin", choiceId: "origin_continue" },
    status: "locked",
    text: "Fair, I guess",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b5a_luminae_origin", choiceId: "origin_unsettled" },
    status: "locked",
    text: "That's unsettling.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5a2_luminae_reassurance", lineIndex: 0 },
    status: "locked",
    text: "I thought you might find it reassuring.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_affinities", lineIndex: 0 },
    status: "locked",
    text: "The first thing you must understand is that this reality is built on five fundamental forces.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_affinities", lineIndex: 1 },
    status: "locked",
    text: "We call them the Affinities.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_affinities", lineIndex: 2 },
    status: "locked",
    text: "Together, they are the threads from which the cosmic tapestry is woven.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_affinities", lineIndex: 3 },
    status: "locked",
    text: "Their balance shapes the nature, technology, and culture of everything here.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b5_affinities", lineIndex: 4 },
    status: "locked",
    text: "The five Affinities are...",
    provenance: "user-authored",
  },
  {
    locator: { kind: "affinity_subtitle", affinity: "flare" },
    status: "locked",
    text: "Transformation",
    provenance: "user-approved",
  },
  {
    locator: { kind: "affinity_subtitle", affinity: "radiance" },
    status: "locked",
    text: "Governance",
    provenance: "user-approved",
  },
  {
    locator: { kind: "affinity_subtitle", affinity: "verdance" },
    status: "locked",
    text: "Propagation",
    provenance: "user-approved",
  },
  {
    locator: { kind: "affinity_subtitle", affinity: "continuum" },
    status: "locked",
    text: "Necessity",
    provenance: "user-approved",
  },
  {
    locator: { kind: "affinity_subtitle", affinity: "abyss" },
    status: "locked",
    text: "Concealment",
    provenance: "user-approved",
  },
  {
    locator: { kind: "dialogue", beatId: "b7_artifact_cost", lineIndex: 0 },
    status: "locked",
    text: "An Artifact's cost shows which Affinities you need to hold in your hands.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b7_artifact_cost", lineIndex: 1 },
    status: "locked",
    text: "You will find it difficult to hold too many at once, so choose carefully.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b9b_affinity_returns", lineIndex: 0 },
    status: "locked",
    text: "The Affinities return to the Well after the Artifact is Forged.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b9b_forge_complete", lineIndex: 0 },
    status: "locked",
    text: "Replication Spore now appears in your civilization as a sustainable technology.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b9b_forge_complete", lineIndex: 1 },
    status: "locked",
    text: "LUMINAe represents it simply as +1 Verdance.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b9b_forge_complete", lineIndex: 2 },
    status: "locked",
    text: "This means that all future Verdance costs are permanently lowered by one.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b9b_forge_complete", lineIndex: 3 },
    status: "locked",
    text: "Therefore, an Artifact that used to cost 3 Verdance now costs 2 Verdance.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b9d_signature", lineIndex: 0 },
    status: "locked",
    text: "The Artifact is LUMINAe's representation of a path a civilization can master.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b9c_transition", lineIndex: 1 },
    status: "locked",
    text: "You can gather what it needs and Forge it as you did with Replication Spore.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b10_encrypt_principle", choiceId: "encrypt_act" },
    status: "approved",
    text: "Let's try it.",
    provenance: "user-approved",
  },
  {
    locator: { kind: "dialogue", beatId: "b10_encrypt_principle", lineIndex: 1 },
    status: "locked",
    text: "It removes a path from the shared Forge and preserves it for you and you alone.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "choice", beatId: "b10_encrypt_principle", choiceId: "encrypt_inquire" },
    status: "locked",
    text: "So you're saying I can do this Encryption thing, but you can't? Why?",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b10a_encrypt_origin", lineIndex: 0 },
    status: "locked",
    text: "I'm not entirely sure, but Encryption seems to involve something from your world crossing over to ours.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b10a_encrypt_origin", lineIndex: 1 },
    status: "locked",
    text: "To a native of my Universe, it is akin to a violation of fundamental physics.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b10a_encrypt_origin", lineIndex: 2 },
    status: "locked",
    text: "It would not be far off to consider it an act of divinity.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b10a_encrypt_origin", lineIndex: 3 },
    status: "locked",
    text: "A genuine miracle.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b10_encrypt_pathway", lineIndex: 1 },
    status: "locked",
    text: "Other civilizations cannot access it while Encrypted, and you can Forge it whenever you can cover its Affinity cost.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b10b_reserve_granted", lineIndex: 0 },
    status: "locked",
    text: "As a byproduct of performing Encryption, a mysterious power called Singularity is generated.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b10b_reserve_granted", lineIndex: 1 },
    status: "locked",
    text: "Singularity is not fully understood, but we do know that you can substitute it for any one of the five Affinities when you Forge.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b10b_reserve_granted", lineIndex: 2 },
    status: "locked",
    text: "Yet, I suspect that we haven't even begun to understand what this power is capable of.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b14_win_condition", lineIndex: 1 },
    status: "locked",
    text: "When a civilization reaches 20 Eminence, their influence will be strong enough to dominate all others that share an Affinity field.",
    provenance: "user-authored",
  },
  {
    locator: { kind: "dialogue", beatId: "b14_win_condition", lineIndex: 2 },
    status: "locked",
    text: "In other words, if your civilization still has the highest Eminence after the final round, you, Architect, will have won. 💪",
    provenance: "user-authored",
  },
] as const satisfies readonly TutorialCopyDecision[];

export const TUTORIAL_REJECTED_COPY = [
  "You can think of me as your guide.",
  "They provide us with the tools to shine",
  "If the goal of every species is survival",
  "For example, Flare",
  "In any case, devices",
  "Perhaps a universe doesn't need a name until it encounters another",
  "I am not LUMINAe; I use it to reach you.",
  "That answer will not cross the border intact",
  "What lies beyond the border?",
  "Then what lies beyond the border?",
] as const;

export function tutorialCopyLocatorKey(locator: TutorialCopyLocator): string {
  switch (locator.kind) {
    case "dialogue":
      return `dialogue:${locator.beatId}:${locator.lineIndex}`;
    case "player_response":
      return `player_response:${locator.beatId}`;
    case "choice":
      return `choice:${locator.beatId}:${locator.choiceId}`;
    case "affinity_subtitle":
      return `affinity_subtitle:${locator.affinity}`;
  }
}

const TUTORIAL_COPY_DECISION_BY_KEY = new Map(
  TUTORIAL_COPY_DECISIONS.map((decision) => [
    tutorialCopyLocatorKey(decision.locator),
    decision,
  ]),
);

export function getTutorialCopyStatus(locator: TutorialCopyLocator): TutorialCopyStatus {
  return TUTORIAL_COPY_DECISION_BY_KEY.get(tutorialCopyLocatorKey(locator))?.status ?? "draft";
}
