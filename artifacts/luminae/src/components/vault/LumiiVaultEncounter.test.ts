import { describe, expect, it } from "vitest";
import type { GameState } from "@workspace/api-client-react";
import {
  LUMII_THRESHOLD_DIALOGUE_GRAPH,
  type LumiiThresholdApproach,
} from "@workspace/game-types";
import { selectLumiiCommentary } from "./LumiiVaultEncounter";
import {
  LUMII_APPROACH_CHOICES,
  LUMII_OUTCOME_DIALOGUE,
  resolveLumiiDialogueNode,
} from "./lumiiVaultNarrative";

function state(overrides: Partial<GameState> = {}): GameState {
  return {
    startedAt: 101,
    version: 1,
    victoryRequirement: 15,
    players: [
      {
        playerId: "architect",
        playerName: "Architect",
        isAi: false,
        eminence: 6,
        forgedArtifacts: [],
      },
      {
        playerId: "lumii",
        playerName: "Lumii",
        isAi: true,
        eminence: 7,
        forgedArtifacts: [],
      },
    ],
    pendingSummonEvents: [],
    pendingBlueprintManifestationEvents: [],
    pendingBlueprintDetonationEvents: [],
    pendingScenarioProtocolEvents: [],
    scenarioProtocols: [],
    lumiiThresholdApproach: "inquiry",
    lastAction: null,
    ...overrides,
  } as GameState;
}

describe("Lumii encounter commentary", () => {
  it("prioritizes a near-victory threshold over a simultaneous Blueprint event", () => {
    const previous = state();
    const current = state({
      version: 2,
      players: [
        {
          playerId: "architect",
          playerName: "Architect",
          isAi: false,
          eminence: 12,
          forgedArtifacts: [],
        },
        {
          playerId: "lumii",
          playerName: "Lumii",
          isAi: true,
          eminence: 7,
          forgedArtifacts: [],
        },
      ] as GameState["players"],
      pendingBlueprintManifestationEvents: [
        { eventId: "manifest-1" },
      ] as GameState["pendingBlueprintManifestationEvents"],
    });

    expect(selectLumiiCommentary(previous, current, "architect")).toMatchObject(
      {
        key: "near-victory:player:12",
        priority: 92,
      },
    );
  });

  it.each([
    ["kinship", "You are nearing the threshold. You may still withdraw."],
    ["inquiry", "Your path now reaches the threshold."],
    ["dominion", "You are advancing. I have not yielded."],
  ] as const)("uses the %s route for major commentary", (route, text) => {
    const previous = state({ lumiiThresholdApproach: route });
    const current = state({
      version: 2,
      lumiiThresholdApproach: route,
      players: [
        {
          playerId: "architect",
          playerName: "Architect",
          isAi: false,
          eminence: 12,
          forgedArtifacts: [],
        },
        {
          playerId: "lumii",
          playerName: "Lumii",
          isAi: true,
          eminence: 7,
          forgedArtifacts: [],
        },
      ] as GameState["players"],
    });

    expect(selectLumiiCommentary(previous, current, "architect")).toMatchObject(
      { text },
    );
  });

  it("comments on anonymous protocol events without needing a Blueprint identity", () => {
    const previous = state();
    const current = state({
      version: 2,
      pendingScenarioProtocolEvents: [
        {
          eventId: "sealed-event",
          protocolId: "sealed_protocol_02",
          ownerPlayerId: "lumii",
          slotIndex: 1,
          kind: "manifestation",
          publicEffect: "A public consequence.",
          createdAt: 1,
        },
      ],
    });

    expect(selectLumiiCommentary(previous, current, "architect")).toMatchObject(
      {
        key: "protocol-manifestation:sealed-event",
        text: "It is coherent. That does not make it safe.",
        priority: 78,
      },
    );
  });

  it("comments only on public event payloads and ignores private Blueprint state changes", () => {
    const previous = state();
    const current = state({
      version: 2,
      players: [
        {
          playerId: "architect",
          playerName: "Architect",
          isAi: false,
          eminence: 6,
          forgedArtifacts: [],
          blueprintPrivateStates: [{ blueprintId: "bp_antimatter_detonator" }],
        },
        {
          playerId: "lumii",
          playerName: "Lumii",
          isAi: true,
          eminence: 7,
          forgedArtifacts: [],
        },
      ] as GameState["players"],
    });

    expect(selectLumiiCommentary(previous, current, "architect")).toBeNull();
  });

  it("prioritizes a meaningful lead change over a simultaneous major Forge", () => {
    const previous = state();
    const forgedCard = { id: "tier-three", tier: 3, eminence: 4 };
    const current = state({
      version: 2,
      players: [
        {
          playerId: "architect",
          playerName: "Architect",
          isAi: false,
          eminence: 10,
          forgedArtifacts: [forgedCard],
        },
        {
          playerId: "lumii",
          playerName: "Lumii",
          isAi: true,
          eminence: 7,
          forgedArtifacts: [],
        },
      ] as GameState["players"],
      lastAction: {
        type: "forge_artifact",
        playerId: "architect",
        cardId: "tier-three",
      } as GameState["lastAction"],
    });

    expect(selectLumiiCommentary(previous, current, "architect")).toMatchObject(
      {
        key: "lead:2:player",
        priority: 58,
      },
    );
  });

  it("answers the Architect's major Forge with restrained humor", () => {
    const previous = state();
    const forgedCard = { id: "tier-three", tier: 3, eminence: 4 };
    const current = state({
      version: 2,
      players: [
        {
          playerId: "architect",
          playerName: "Architect",
          isAi: false,
          eminence: 6,
          forgedArtifacts: [forgedCard],
        },
        {
          playerId: "lumii",
          playerName: "Lumii",
          isAi: true,
          eminence: 7,
          forgedArtifacts: [],
        },
      ] as GameState["players"],
      lastAction: {
        type: "forge_artifact",
        playerId: "architect",
        cardId: "tier-three",
      } as GameState["lastAction"],
    });

    expect(selectLumiiCommentary(previous, current, "architect")).toMatchObject(
      {
        text: "That was not an encouraging sound.",
        priority: 50,
      },
    );
  });
});

describe("Lumii Threshold dialogue graph", () => {
  it("gives completed branches a commitment and keeps the first Inquiry branch curious", () => {
    for (const route of Object.keys(
      LUMII_THRESHOLD_DIALOGUE_GRAPH,
    ) as LumiiThresholdApproach[]) {
      const branches = LUMII_THRESHOLD_DIALOGUE_GRAPH[route];
      for (const branch of branches) {
        const path = [branch.primaryChoiceId, ...branch.followUpChoiceIds];
        const node = resolveLumiiDialogueNode(route, path);
        const requiresSecondaryBranch =
          "requiresSecondaryBranch" in branch &&
          branch.requiresSecondaryBranch === true;
        expect(node.complete).toBe(!requiresSecondaryBranch);
        if (node.complete) {
          expect(node.combatTransition).toBeTruthy();
        }
        expect(node.optionalChoices?.map((choice) => choice.id)).toEqual(
          branches
            .filter(
              (candidate) =>
                candidate.primaryChoiceId !== branch.primaryChoiceId,
            )
            .map((candidate) => candidate.primaryChoiceId),
        );

        for (const optionalChoice of node.optionalChoices ?? []) {
          const optionalBranch = branches.find(
            (candidate) => candidate.primaryChoiceId === optionalChoice.id,
          );
          const optionalPath =
            requiresSecondaryBranch && optionalBranch
              ? [
                  optionalBranch.primaryChoiceId,
                  ...optionalBranch.followUpChoiceIds,
                ]
              : [optionalChoice.id];
          const optionalNode = resolveLumiiDialogueNode(route, [
            ...path,
            ...optionalPath,
          ]);
          expect(optionalNode.complete).toBe(true);
          expect(optionalNode.escalationLabel).toBeTruthy();
          expect(optionalNode.combatTransition).toBeTruthy();
          expect(optionalNode.optionalChoices).toEqual([]);
        }
      }
    }
  });

  it("gives the first Kinship branch its cooperative invitation and Lumii's refusal", () => {
    const node = resolveLumiiDialogueNode("kinship", [
      "kinship-universe",
      "kinship-difference",
      "kinship-stop-why",
    ]);

    expect(node).toMatchObject({
      complete: true,
      escalationLabel: "Then let's find out together.",
      combatTransition: [
        "No.",
        "Not together.",
        "If you continue, I need to know whether I can stop you.",
      ],
    });
  });

  it("places optional humor after the lines that naturally prompt it", () => {
    expect(
      resolveLumiiDialogueNode("kinship", [
        "kinship-universe",
        "kinship-difference",
        "kinship-stop-why",
      ]).asides,
    ).toContainEqual({
      id: "kinship-theme",
      label: "That is becoming a theme.",
      replies: ["I have noticed."],
    });
    expect(
      resolveLumiiDialogueNode("inquiry", ["inquiry-demand-answer"]).asides,
    ).toContainEqual({
      id: "inquiry-efficient",
      label: "Convenient.",
      replies: ["Efficient, too. Saved us a whole conversation."],
    });
    expect(
      resolveLumiiDialogueNode("dominion", [
        "dominion-cipher-authority",
        "dominion-refusal-authority",
      ]).asides,
    ).toContainEqual({
      id: "dominion-pleased",
      label: "You seem pleased with that answer.",
      replies: ["I am surprised by it."],
    });
    expect(resolveLumiiDialogueNode("dominion", []).asides).toBeUndefined();
  });

  it("requires another Inquiry line after Lumii cannot account for the word", () => {
    const first = resolveLumiiDialogueNode("inquiry", [
      "inquiry-demand-answer",
    ]);
    expect(first.choices).toEqual([
      {
        id: "inquiry-demand-unsayable",
        label: "Where did it come from?",
      },
    ]);

    const curious = resolveLumiiDialogueNode("inquiry", [
      "inquiry-demand-answer",
      "inquiry-demand-unsayable",
    ]);
    expect(curious).toMatchObject({
      complete: false,
    });
    expect(curious.optionalChoices?.map((choice) => choice.id)).toEqual([
      "inquiry-meaning",
      "inquiry-sight",
    ]);

    const complete = resolveLumiiDialogueNode("inquiry", [
      "inquiry-demand-answer",
      "inquiry-demand-unsayable",
      "inquiry-meaning",
      "inquiry-warning-against-truth",
      "inquiry-preservation",
    ]);
    expect(complete).toMatchObject({
      complete: true,
      escalationLabel: "I've heard the warning. I'm still going.",
      combatTransition: [
        "Then the warning has become a boundary.",
        "I need to know whether I can hold it.",
      ],
    });
  });

  it("restores legacy paths at their equivalent authored beat", () => {
    expect(
      resolveLumiiDialogueNode("dominion", ["dominion-stand"]),
    ).toMatchObject({
      complete: true,
      escalationLabel: "Then stop me.",
      combatTransition: ["As you wish."],
    });
    expect(
      resolveLumiiDialogueNode("inquiry", [
        "inquiry-answer",
        "inquiry-unsayable",
      ]),
    ).toMatchObject({
      complete: false,
      optionalChoices: [
        { id: "inquiry-meaning", label: "What does that mean?" },
        { id: "inquiry-sight", label: "How do you know?" },
      ],
    });
  });

  it("keeps untaught system terminology out of the Architect's dialogue", () => {
    const architectLines = [
      ...Object.values(LUMII_APPROACH_CHOICES),
      ...Object.values(LUMII_OUTCOME_DIALOGUE).map(({ question }) => question),
    ];

    for (const route of Object.keys(
      LUMII_THRESHOLD_DIALOGUE_GRAPH,
    ) as LumiiThresholdApproach[]) {
      for (const branch of LUMII_THRESHOLD_DIALOGUE_GRAPH[route]) {
        const path: Parameters<typeof resolveLumiiDialogueNode>[1][number][] =
          [];
        for (const choiceId of [
          branch.primaryChoiceId,
          ...branch.followUpChoiceIds,
        ]) {
          const node = resolveLumiiDialogueNode(route, path);
          const choice = [
            ...(node.choices ?? []),
            ...(node.optionalChoices ?? []),
          ].find((candidate) => candidate.id === choiceId);
          expect(choice).toBeDefined();
          architectLines.push(choice?.label ?? "");
          path.push(choiceId);
        }
        architectLines.push(
          resolveLumiiDialogueNode(route, path).escalationLabel ?? "",
        );
      }
    }

    expect(architectLines.join(" ")).not.toMatch(
      /\b(?:cipher|firewall|protocol|forecast|covenant|redaction|clearance)\b/i,
    );
    expect(resolveLumiiDialogueNode("dominion", []).choices).toContainEqual({
      id: "dominion-cipher-authority",
      label: "You said Architects determine what your people become.",
    });
  });
});
