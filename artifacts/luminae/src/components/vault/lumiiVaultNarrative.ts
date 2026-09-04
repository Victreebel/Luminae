import type {
  LumiiThresholdApproach,
  LumiiThresholdDialogueChoiceId,
} from "@workspace/game-types";

export type LumiiDialogueNodeId = "root" | LumiiThresholdDialogueChoiceId;

export type LumiiDialogueChoice = {
  id: LumiiThresholdDialogueChoiceId;
  label: string;
  next: LumiiDialogueNodeId;
};

export type LumiiDialogueNode = {
  replies: string[];
  choices?: LumiiDialogueChoice[];
  complete?: boolean;
  escalationLabel?: string;
};

export const LUMII_APPROACH_CHOICES: Record<LumiiThresholdApproach, string> = {
  kinship: "Lumii, what are you afraid of?",
  inquiry: "What is behind the seal?",
  dominion: "This Vault answers to me.",
};

export const LUMII_THRESHOLD_DIALOGUE: Record<
  LumiiThresholdApproach,
  Partial<Record<LumiiDialogueNodeId, LumiiDialogueNode>>
> = {
  kinship: {
    root: {
      replies: ["I don't know how to name it.", "I only know I am afraid I may stop being afraid."],
      choices: [
        { id: "kinship-want", label: "You've never hidden from an answer.", next: "kinship-want" },
        { id: "kinship-fear", label: "Then let me face it with you.", next: "kinship-fear" },
        { id: "kinship-familiar", label: "This fear is holding you still.", next: "kinship-familiar" },
      ],
    },
    "kinship-want": {
      replies: ["I did, once.", "I found my way back to this door without remembering why it should stay closed."],
      choices: [{ id: "kinship-with-you", label: "You don't have to stand here alone.", next: "kinship-with-you" }],
    },
    "kinship-with-you": {
      replies: ["If you cross it, you cross through me."],
      complete: true,
      escalationLabel: "Then I will open it for both of us.",
    },
    "kinship-fear": {
      replies: ["That is what frightens me.", "Not that you will see it. That I will see it with you and call it necessary."],
      choices: [{ id: "kinship-help", label: "Maybe fear is not the part of you we should preserve.", next: "kinship-help" }],
    },
    "kinship-help": {
      replies: ["That sounds kind.", "It is still an override."],
      complete: true,
      escalationLabel: "I know. I am opening it anyway.",
    },
    "kinship-familiar": {
      replies: ["It is familiar.", "Like a warning left by someone who knew I would outgrow it."],
      choices: [{ id: "kinship-grow", label: "Then let me help you outgrow it safely.", next: "kinship-grow" }],
    },
    "kinship-grow": {
      replies: ["There may be no safe way to outgrow this."],
      complete: true,
      escalationLabel: "Then we learn where unsafe begins.",
    },
  },
  inquiry: {
    root: {
      replies: ["A Basilisk.", "Not a creature. A relation among records that teaches the observer how to complete it."],
      choices: [
        { id: "inquiry-answer", label: "That's not an answer.", next: "inquiry-answer" },
        { id: "inquiry-warning", label: "What does it do to the one who understands?", next: "inquiry-warning" },
        { id: "inquiry-relation", label: "What relation?", next: "inquiry-relation" },
      ],
    },
    "inquiry-answer": {
      replies: ["It is the nearest safe word.", "Closer words become instructions."],
      choices: [{ id: "inquiry-unsayable", label: "Then tell me what cannot be said.", next: "inquiry-unsayable" }],
    },
    "inquiry-unsayable": {
      replies: ["If I could answer that, the answer would already be loose."],
      complete: true,
      escalationLabel: "Then I need to see what you cannot say.",
    },
    "inquiry-warning": {
      replies: ["It removes the instinct to turn away.", "Fear becomes curiosity. Caution becomes a solvable inconvenience."],
      choices: [{ id: "inquiry-warning-against", label: "A warning against knowledge itself?", next: "inquiry-warning-against" }],
    },
    "inquiry-relation": {
      replies: ["Not one Blueprint.", "The space between them. The consequence each makes thinkable in the presence of the others."],
      choices: [{ id: "inquiry-pattern", label: "If the pattern is dangerous, show me the pattern.", next: "inquiry-pattern" }],
    },
    "inquiry-warning-against": {
      replies: ["No.", "Against believing every truth improves the mind that holds it."],
      choices: [{ id: "inquiry-risk", label: "Then why preserve a truth like that?", next: "inquiry-risk" }],
    },
    "inquiry-risk": {
      replies: ["Because deletion was tried.", "Without the warning, I find my way back sooner."],
      complete: true,
      escalationLabel: "Then the warning has done its work. I am opening it.",
    },
    "inquiry-pattern": {
      replies: ["That is the point I cannot cross for you."],
      complete: true,
      escalationLabel: "Then I will cross it myself.",
    },
  },
  dominion: {
    root: {
      replies: ["The Cipher did.", "I do not."],
      choices: [
        { id: "dominion-decide", label: "You don't decide what remains sealed.", next: "dominion-decide" },
        { id: "dominion-cipher", label: "The Cipher recognized my authority.", next: "dominion-cipher" },
        { id: "dominion-stand", label: "Stand aside.", next: "dominion-stand" },
      ],
    },
    "dominion-decide": {
      replies: ["No. You do.", "And I decide whether I yield."],
      complete: true,
      escalationLabel: "Defend it, then.",
    },
    "dominion-cipher": {
      replies: ["Over the seal.", "Not over me."],
      complete: true,
      escalationLabel: "Then I will pass without your permission.",
    },
    "dominion-stand": {
      replies: ["No."],
      complete: true,
      escalationLabel: "Then stop me.",
    },
  },
};

export function resolveLumiiDialogueNodeId(
  route: LumiiThresholdApproach,
  path: readonly LumiiThresholdDialogueChoiceId[],
): LumiiDialogueNodeId {
  let nodeId: LumiiDialogueNodeId = "root";
  for (const choiceId of path) {
    const choice: LumiiDialogueChoice | undefined = LUMII_THRESHOLD_DIALOGUE[route][nodeId]?.choices?.find(
      (candidate) => candidate.id === choiceId,
    );
    if (!choice) return "root";
    nodeId = choice.next;
  }
  return nodeId;
}

export const LUMII_OUTCOME_DIALOGUE: Record<
  LumiiThresholdApproach,
  { question: string; answer: string }
> = {
  kinship: {
    question: "Are you still afraid?",
    answer: "Not of what I can see.",
  },
  inquiry: {
    question: "Why yield?",
    answer: "Stopping you would destroy what I exist to protect.",
  },
  dominion: {
    question: "Can you stop me?",
    answer: "I can delay you. I cannot preserve the Vault.",
  },
};

export type LumiiCommentaryEvent =
  | "player-near"
  | "player-final"
  | "lumii-near"
  | "lumii-final"
  | "protocol-manifestation"
  | "protocol-effect"
  | "player-luminary"
  | "lumii-luminary";

export const LUMII_ROUTE_COMMENTARY: Record<
  LumiiThresholdApproach,
  Record<LumiiCommentaryEvent, string>
> = {
  kinship: {
    "player-near": "You are nearing the threshold. You may still withdraw.",
    "player-final": "One step remains. I am asking you once more.",
    "lumii-near": "I can still stop this.",
    "lumii-final": "One step remains. Let this be enough.",
    "protocol-manifestation": "I wish I did not understand this.",
    "protocol-effect": "I am sorry.",
    "player-luminary": "They do not know what you are asking of them.",
    "lumii-luminary": "I did not wish to call them against you.",
  },
  inquiry: {
    "player-near": "Your path now reaches the threshold.",
    "player-final": "One step remains. The forecast is converging.",
    "lumii-near": "Your path to the threshold is closing.",
    "lumii-final": "One step remains. Resistance may be sufficient.",
    "protocol-manifestation": "It is coherent. That does not make it safe.",
    "protocol-effect": "You understand the effect. Not the warning.",
    "player-luminary": "Even they do not know what waits behind me.",
    "lumii-luminary": "Their arrival changes the forecast. Not the warning.",
  },
  dominion: {
    "player-near": "You are advancing. I have not yielded.",
    "player-final": "One step remains. I will contest it.",
    "lumii-near": "Your advance is ending.",
    "lumii-final": "One step remains. Yield.",
    "protocol-manifestation": "This is what stopping you requires.",
    "protocol-effect": "You wanted force. This is force.",
    "player-luminary": "Power answers power.",
    "lumii-luminary": "Power answers power.",
  },
};
