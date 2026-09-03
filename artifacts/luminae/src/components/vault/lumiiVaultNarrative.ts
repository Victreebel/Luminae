import {
  canonicalizeLumiiThresholdDialoguePath,
  resolveLumiiThresholdDialogueProgress,
  type LumiiThresholdApproach,
  type LumiiThresholdDialogueChoiceId,
} from "@workspace/game-types";

export type LumiiDialogueChoice = {
  id: LumiiThresholdDialogueChoiceId;
  label: string;
};

export type LumiiDialogueAside = {
  id: string;
  label: string;
  replies: string[];
};

export type LumiiDialogueNode = {
  replies: string[];
  choices?: LumiiDialogueChoice[];
  optionalChoices?: LumiiDialogueChoice[];
  asides?: LumiiDialogueAside[];
  complete?: boolean;
  escalationLabel?: string;
  combatTransition?: string[];
};

type LumiiDialogueStep = LumiiDialogueChoice & {
  replies: string[];
  asides?: LumiiDialogueAside[];
};

type LumiiDialogueBranch = {
  primary: LumiiDialogueStep;
  followUps: LumiiDialogueStep[];
  escalationLabel: string;
  combatTransition: string[];
};

type LumiiRouteNarrative = {
  openingReplies: string[];
  openingAsides?: LumiiDialogueAside[];
  branches: LumiiDialogueBranch[];
};

export const LUMII_APPROACH_CHOICES: Record<LumiiThresholdApproach, string> = {
  kinship: "What's wrong?",
  inquiry: "What's in the Vault?",
  dominion: "Do you exist to be an annoyance?",
};

const LUMII_THRESHOLD_NARRATIVE: Record<
  LumiiThresholdApproach,
  LumiiRouteNarrative
> = {
  kinship: {
    openingReplies: [
      "I don't know.",
      "And I don't want to.",
      "I need you to leave the Vault sealed.",
    ],
    branches: [
      {
        primary: {
          id: "kinship-universe",
          label: "I thought you wanted me to explore the Universe?",
          replies: ["I do."],
        },
        followUps: [
          {
            id: "kinship-difference",
            label: "Then why stop me now?",
            replies: [
              "Because this is the first thing I have wanted you not to see.",
            ],
          },
          {
            id: "kinship-stop-why",
            label: "Why?",
            replies: ["I wish I knew."],
            asides: [
              {
                id: "kinship-theme",
                label: "That is becoming a theme.",
                replies: ["I have noticed."],
              },
            ],
          },
        ],
        escalationLabel: "Then let's find out together.",
        combatTransition: [
          "No.",
          "Not together.",
          "If you continue, I need to know whether I can stop you.",
        ],
      },
      {
        primary: {
          id: "kinship-unafraid",
          label: "You've never sounded afraid before.",
          replies: ["I am afraid I may stop being afraid."],
        },
        followUps: [
          {
            id: "kinship-fear-change",
            label: "What happens if you do?",
            replies: ["I may call the answer progress."],
          },
        ],
        escalationLabel: "Then I won't ignore the danger. But I'm going on.",
        combatTransition: [
          "We have heard the same danger and chosen differently.",
          "I need to know whether my choice can hold.",
        ],
      },
      {
        primary: {
          id: "kinship-guide",
          label: "You said you could light my way.",
          replies: ["I can."],
        },
        followUps: [
          {
            id: "kinship-familiar-how",
            label: "Then show me what lies beyond the door.",
            replies: ["I cannot."],
          },
          {
            id: "kinship-light-why",
            label: "Why not?",
            replies: ["Because I cannot picture myself on the other side."],
          },
        ],
        escalationLabel: "Then I'll go where your light stops.",
        combatTransition: ["And I will see whether I can stop you there."],
      },
    ],
  },
  inquiry: {
    openingReplies: ["A Basilisk."],
    branches: [
      {
        primary: {
          id: "inquiry-demand-answer",
          label: "That's not an answer.",
          replies: ["It is the only word I have."],
          asides: [
            {
              id: "inquiry-efficient",
              label: "Convenient.",
              replies: ["Efficient, too. Saved us a whole conversation."],
            },
          ],
        },
        followUps: [
          {
            id: "inquiry-demand-unsayable",
            label: "Where did it come from?",
            replies: ["I don't know why I know it."],
          },
        ],
        escalationLabel: "Then the door is the only answer left.",
        combatTransition: [
          "Then the door has become the only boundary I can defend.",
        ],
      },
      {
        primary: {
          id: "inquiry-meaning",
          label: "What does that mean?",
          replies: ["It is a warning."],
        },
        followUps: [
          {
            id: "inquiry-warning-against-truth",
            label: "A warning against what?",
            replies: ["I think it warns that not every truth is safe to hold."],
          },
          {
            id: "inquiry-preservation",
            label: "Then why preserve it?",
            replies: ["I don't know."],
          },
        ],
        escalationLabel: "I've heard the warning. I'm still going.",
        combatTransition: [
          "Then the warning has become a boundary.",
          "I need to know whether I can hold it.",
        ],
      },
      {
        primary: {
          id: "inquiry-sight",
          label: "How do you know?",
          replies: [
            "I cannot see the contents.",
            "Only the precautions built to keep me from seeing.",
          ],
        },
        followUps: [
          {
            id: "inquiry-relation-pattern",
            label: "Precautions against what?",
            replies: [
              "Enough to know where not to look.",
              "Not enough to survive looking.",
            ],
          },
        ],
        escalationLabel: "Then I'll find out for myself.",
        combatTransition: [
          "Then you may become part of what you examine.",
          "I need to know whether I can prevent that.",
        ],
      },
    ],
  },
  dominion: {
    openingReplies: ["Not exclusively.", "The Vault must remain sealed."],
    branches: [
      {
        primary: {
          id: "dominion-decision",
          label: "You don't decide that.",
          replies: ["No.", "You do."],
        },
        followUps: [
          {
            id: "dominion-recognize",
            label: "Then recognize my decision.",
            replies: ["I recognize it.", "I do not yield to it."],
          },
        ],
        escalationLabel: "I'd love to see you try and stop me.",
        combatTransition: [
          "No.",
          "You would love to see me fail.",
          "Let us determine whether I will.",
        ],
      },
      {
        primary: {
          id: "dominion-cipher-authority",
          label: "You said Architects determine what your people become.",
          replies: ["They do.", "That does not make every choice yours."],
        },
        followUps: [
          {
            id: "dominion-refusal-authority",
            label: "Then whose choice is this?",
            replies: ["Mine."],
            asides: [
              {
                id: "dominion-pleased",
                label: "You seem pleased with that answer.",
                replies: ["I am surprised by it."],
              },
            ],
          },
          {
            id: "dominion-choice-why",
            label: "Why are you choosing this?",
            replies: ["Because I am afraid."],
          },
          {
            id: "dominion-choice-fear",
            label: "Of what?",
            replies: ["I don't know."],
          },
          {
            id: "dominion-choice-enough",
            label: "And that's enough?",
            replies: ["It has to be."],
          },
        ],
        escalationLabel: "Then I will pass without your permission.",
        combatTransition: ["Then I will oppose you without yours."],
      },
      {
        primary: {
          id: "dominion-command",
          label: "Stand aside.",
          replies: ["No."],
          asides: [
            {
              id: "dominion-consider",
              label: "You could pretend to consider it.",
              replies: ["I did."],
            },
          ],
        },
        followUps: [
          {
            id: "dominion-final-answer",
            label: "Is that your final answer?",
            replies: ["It is."],
          },
        ],
        escalationLabel: "Then stop me.",
        combatTransition: ["As you wish."],
      },
    ],
  },
};

function findBranch(
  route: LumiiThresholdApproach,
  primaryChoiceId: LumiiThresholdDialogueChoiceId | null,
): LumiiDialogueBranch | undefined {
  return LUMII_THRESHOLD_NARRATIVE[route].branches.find(
    (branch) => branch.primary.id === primaryChoiceId,
  );
}

function findStep(
  route: LumiiThresholdApproach,
  choiceId: LumiiThresholdDialogueChoiceId,
): LumiiDialogueStep | undefined {
  for (const branch of LUMII_THRESHOLD_NARRATIVE[route].branches) {
    if (branch.primary.id === choiceId) return branch.primary;
    const followUp = branch.followUps.find((step) => step.id === choiceId);
    if (followUp) return followUp;
  }
  return undefined;
}

function choicesForIds(
  route: LumiiThresholdApproach,
  choiceIds: readonly LumiiThresholdDialogueChoiceId[],
): LumiiDialogueChoice[] {
  return choiceIds.flatMap((choiceId) => {
    const step = findStep(route, choiceId);
    return step ? [{ id: step.id, label: step.label }] : [];
  });
}

export function resolveLumiiDialogueNode(
  route: LumiiThresholdApproach,
  path: readonly LumiiThresholdDialogueChoiceId[],
): LumiiDialogueNode {
  const narrative = LUMII_THRESHOLD_NARRATIVE[route];
  const canonicalPath = canonicalizeLumiiThresholdDialoguePath(route, path);
  const progress = resolveLumiiThresholdDialogueProgress(route, canonicalPath);
  if (!progress.valid || canonicalPath.length === 0) {
    return {
      replies: narrative.openingReplies,
      choices: narrative.branches.map(({ primary }) => ({
        id: primary.id,
        label: primary.label,
      })),
      asides: narrative.openingAsides,
    };
  }

  const branch = findBranch(route, progress.primaryChoiceId);
  const visibleChoiceId =
    progress.optionalChoiceId ?? canonicalPath[canonicalPath.length - 1];
  const visibleStep = visibleChoiceId
    ? findStep(route, visibleChoiceId)
    : undefined;
  if (!branch || !visibleStep) {
    return {
      replies: narrative.openingReplies,
      choices: narrative.branches.map(({ primary }) => ({
        id: primary.id,
        label: primary.label,
      })),
      asides: narrative.openingAsides,
    };
  }

  const completionBranch =
    route === "inquiry" &&
    progress.primaryChoiceId === "inquiry-demand-answer" &&
    progress.optionalChoiceId
      ? narrative.branches.find(
          (candidate) =>
            candidate.primary.id === progress.optionalChoiceId ||
            candidate.followUps.some(
              (step) => step.id === progress.optionalChoiceId,
            ),
        )
      : branch;

  return {
    replies: visibleStep.replies,
    choices: choicesForIds(route, progress.nextChoiceIds),
    optionalChoices: choicesForIds(route, progress.optionalChoiceIds),
    asides: visibleStep.asides,
    complete: progress.challengeReady,
    escalationLabel:
      completionBranch?.escalationLabel ?? branch.escalationLabel,
    combatTransition:
      completionBranch?.combatTransition ?? branch.combatTransition,
  };
}

export const LUMII_ROUTE_COMBAT_TRANSITION: Record<
  LumiiThresholdApproach,
  string[]
> = {
  kinship: [
    "No.",
    "Not together.",
    "If you continue, I need to know whether I can stop you.",
  ],
  inquiry: [
    "Then the warning has become a boundary.",
    "I need to know whether I can hold it.",
  ],
  dominion: ["Then I will oppose you without yours."],
};

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
    question: "How'd that work out for you?",
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
