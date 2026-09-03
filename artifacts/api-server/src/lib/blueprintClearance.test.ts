import { describe, expect, it } from "vitest";
import {
  LUMII_THRESHOLD_DIALOGUE_GRAPH,
  type LumiiThresholdApproach,
  type LumiiThresholdDialogueChoiceId,
} from "@workspace/game-types";
import {
  decideBlueprintThresholdAction,
  decideLumiiDialogueLeave,
  decideLumiiDialoguePathUpdate,
  freshLumiiEncounterMemory,
  isCompleteLumiiThresholdDialoguePath,
  isLumiiThresholdDialoguePathPrefix,
  isQualifyingBlueprintVictory,
} from "./blueprintClearance.js";

const hardTable = [
  { id: "player", isAi: false, aiDifficulty: null },
  { id: "hard-1", isAi: true, aiDifficulty: "hard" },
  { id: "hard-2", isAi: true, aiDifficulty: "hard" },
  { id: "hard-3", isAi: true, aiDifficulty: "hard" },
];

function qualifies(
  overrides: Partial<Parameters<typeof isQualifyingBlueprintVictory>[0]> = {},
) {
  return isQualifyingBlueprintVictory({
    gameMode: "standard",
    blueprintPolicy: "none",
    victoryRequirement: 15,
    turnTimerSeconds: null,
    playerId: "player",
    winnerId: "player",
    participants: hardTable,
    ...overrides,
  });
}

describe("Blueprint clearance victory", () => {
  it("accepts a win against exactly three Hard AI opponents", () => {
    expect(qualifies()).toBe(true);
  });

  it.each([
    ["a loss", { winnerId: "hard-1" }],
    ["a tie", { winnerId: null }],
    ["three civilizations", { participants: hardTable.slice(0, 3) }],
    [
      "five civilizations",
      {
        participants: [
          ...hardTable,
          { id: "hard-4", isAi: true, aiDifficulty: "hard" },
        ],
      },
    ],
    [
      "a non-Hard AI",
      {
        participants: hardTable.map((entry, index) =>
          index === 1 ? { ...entry, aiDifficulty: "medium" } : entry,
        ),
      },
    ],
    [
      "another human",
      {
        participants: hardTable.map((entry, index) =>
          index === 1 ? { ...entry, isAi: false, aiDifficulty: null } : entry,
        ),
      },
    ],
    ["custom play", { gameMode: "custom" }],
    ["Blueprint-enabled standard play", { blueprintPolicy: "owned" }],
    ["a nonstandard Eminence target", { victoryRequirement: 20 }],
    ["a timed match", { turnTimerSeconds: 60 }],
  ] as const)("rejects %s", (_label, overrides) => {
    expect(qualifies(overrides)).toBe(false);
  });
});

describe("Lumii Vault threshold", () => {
  it("clears every remembered encounter field for a decryption-key attempt", () => {
    expect(freshLumiiEncounterMemory()).toEqual({
      warningSeenAt: null,
      cipherDeactivatedAt: null,
      thresholdApproach: null,
      thresholdDialoguePath: [],
      thresholdDialogueResolution: null,
      covenantBrokenAt: null,
    });
  });

  it("deactivates the Cipher once and treats repeats as successful no-ops", () => {
    const first = decideBlueprintThresholdAction(
      { cipherDeactivated: false, thresholdApproach: null },
      { action: "deactivate_cipher" },
    );
    const repeat = decideBlueprintThresholdAction(
      { cipherDeactivated: true, thresholdApproach: null },
      { action: "deactivate_cipher" },
    );

    expect(first).toMatchObject({ ok: true, writeCipher: true });
    expect(repeat).toMatchObject({ ok: true, writeCipher: false });
  });

  it("requires the Cipher to be inert before recording an approach", () => {
    expect(
      decideBlueprintThresholdAction(
        { cipherDeactivated: false, thresholdApproach: null },
        { action: "choose_approach", approach: "inquiry" },
      ),
    ).toMatchObject({ ok: false, status: 409 });
  });

  it("accepts the same approach idempotently and rejects a conflicting route", () => {
    expect(
      decideBlueprintThresholdAction(
        { cipherDeactivated: true, thresholdApproach: "kinship" },
        { action: "choose_approach", approach: "kinship" },
      ),
    ).toMatchObject({
      ok: true,
      writeApproach: null,
      thresholdApproach: "kinship",
    });

    expect(
      decideBlueprintThresholdAction(
        { cipherDeactivated: true, thresholdApproach: "kinship" },
        { action: "choose_approach", approach: "dominion" },
      ),
    ).toMatchObject({
      ok: false,
      status: 409,
      error: "Your approach at this threshold has already been recorded",
    });
  });

  it("records only the next valid response and treats an identical path as a no-op", () => {
    const first = decideLumiiDialoguePathUpdate(
      { approach: "inquiry", path: [], resolution: null },
      ["inquiry-meaning"],
    );
    const repeat = decideLumiiDialoguePathUpdate(
      { approach: "inquiry", path: ["inquiry-meaning"], resolution: null },
      ["inquiry-meaning"],
    );

    expect(first).toEqual({ ok: true, writePath: ["inquiry-meaning"] });
    expect(repeat).toEqual({ ok: true, writePath: null });
  });

  it("rejects skipped, conflicting, and post-resolution responses", () => {
    expect(
      decideLumiiDialoguePathUpdate(
        { approach: "inquiry", path: [], resolution: null },
        ["inquiry-meaning", "inquiry-warning-against-truth"],
      ),
    ).toMatchObject({ ok: false, status: 409 });
    expect(
      decideLumiiDialoguePathUpdate(
        { approach: "kinship", path: [], resolution: null },
        ["dominion-stand"],
      ),
    ).toMatchObject({ ok: false, status: 409 });
    expect(
      decideLumiiDialoguePathUpdate(
        {
          approach: "dominion",
          path: ["dominion-command"],
          resolution: "left",
        },
        ["dominion-command", "dominion-final-answer"],
      ),
    ).toMatchObject({ ok: false, status: 409 });
  });

  it("recognizes complete branches and records an early leave idempotently", () => {
    expect(
      isCompleteLumiiThresholdDialoguePath("inquiry", [
        "inquiry-meaning",
        "inquiry-warning-against-truth",
        "inquiry-preservation",
      ]),
    ).toBe(true);
    expect(
      isCompleteLumiiThresholdDialoguePath("inquiry", ["inquiry-meaning"]),
    ).toBe(false);
    expect(
      isCompleteLumiiThresholdDialoguePath("kinship", [
        "kinship-guide",
        "kinship-familiar-how",
      ]),
    ).toBe(false);
    expect(
      isCompleteLumiiThresholdDialoguePath("kinship", [
        "kinship-guide",
        "kinship-familiar-how",
        "kinship-light-why",
      ]),
    ).toBe(true);
    expect(
      isCompleteLumiiThresholdDialoguePath("dominion", ["dominion-command"]),
    ).toBe(false);
    expect(
      isCompleteLumiiThresholdDialoguePath("dominion", [
        "dominion-command",
        "dominion-final-answer",
      ]),
    ).toBe(true);
    expect(
      isCompleteLumiiThresholdDialoguePath("dominion", ["dominion-stand"]),
    ).toBe(true);
    expect(decideLumiiDialogueLeave(null)).toEqual({
      ok: true,
      writeResolution: "left",
    });
    expect(decideLumiiDialogueLeave("left")).toEqual({
      ok: true,
      writeResolution: null,
    });
    expect(decideLumiiDialogueLeave("continued")).toMatchObject({
      ok: false,
      status: 409,
    });
  });

  it("keeps every authored branch and optional question reachable", () => {
    for (const approach of Object.keys(
      LUMII_THRESHOLD_DIALOGUE_GRAPH,
    ) as LumiiThresholdApproach[]) {
      const branches = LUMII_THRESHOLD_DIALOGUE_GRAPH[approach];
      for (const branch of branches) {
        const requiredPath: LumiiThresholdDialogueChoiceId[] = [
          branch.primaryChoiceId,
          ...branch.followUpChoiceIds,
        ];
        const requiresSecondaryBranch =
          "requiresSecondaryBranch" in branch &&
          branch.requiresSecondaryBranch === true;
        expect(isLumiiThresholdDialoguePathPrefix(approach, requiredPath)).toBe(
          true,
        );
        expect(
          isCompleteLumiiThresholdDialoguePath(approach, requiredPath),
        ).toBe(!requiresSecondaryBranch);

        for (const optionalBranch of branches) {
          if (optionalBranch.primaryChoiceId === branch.primaryChoiceId)
            continue;
          const optionalPath = requiresSecondaryBranch
            ? [
                ...requiredPath,
                optionalBranch.primaryChoiceId,
                ...optionalBranch.followUpChoiceIds,
              ]
            : [...requiredPath, optionalBranch.primaryChoiceId];
          expect(
            isLumiiThresholdDialoguePathPrefix(approach, optionalPath),
          ).toBe(true);
          expect(
            isCompleteLumiiThresholdDialoguePath(approach, optionalPath),
          ).toBe(true);
        }
      }
    }
  });

  it("persists every authored branch one response at a time with idempotent retries", () => {
    for (const approach of Object.keys(
      LUMII_THRESHOLD_DIALOGUE_GRAPH,
    ) as LumiiThresholdApproach[]) {
      const branches = LUMII_THRESHOLD_DIALOGUE_GRAPH[approach];
      for (const branch of branches) {
        let path: LumiiThresholdDialogueChoiceId[] = [];
        for (const choiceId of [
          branch.primaryChoiceId,
          ...branch.followUpChoiceIds,
        ]) {
          const requestedPath = [...path, choiceId];
          const decision = decideLumiiDialoguePathUpdate(
            { approach, path, resolution: null },
            requestedPath,
          );
          if (!decision.ok || !decision.writePath) {
            throw new Error(`Could not persist ${approach}:${choiceId}`);
          }
          path = decision.writePath;
          expect(
            decideLumiiDialoguePathUpdate(
              { approach, path, resolution: null },
              requestedPath,
            ),
          ).toEqual({ ok: true, writePath: null });
        }
        const requiresSecondaryBranch =
          "requiresSecondaryBranch" in branch &&
          branch.requiresSecondaryBranch === true;
        expect(isCompleteLumiiThresholdDialoguePath(approach, path)).toBe(
          !requiresSecondaryBranch,
        );

        for (const optionalBranch of branches) {
          if (optionalBranch.primaryChoiceId === branch.primaryChoiceId)
            continue;
          let optionalPath = [...path];
          const optionalChoices = requiresSecondaryBranch
            ? [
                optionalBranch.primaryChoiceId,
                ...optionalBranch.followUpChoiceIds,
              ]
            : [optionalBranch.primaryChoiceId];
          for (const choiceId of optionalChoices) {
            const optionalDecision = decideLumiiDialoguePathUpdate(
              { approach, path: optionalPath, resolution: null },
              [...optionalPath, choiceId],
            );
            expect(optionalDecision).toMatchObject({ ok: true });
            if (optionalDecision.ok && optionalDecision.writePath) {
              optionalPath = optionalDecision.writePath;
            }
          }
          expect(
            isCompleteLumiiThresholdDialoguePath(approach, optionalPath),
          ).toBe(true);
        }
      }
    }
  });

  it("accepts every legacy dialogue journey and resumes at an authored beat", () => {
    const journeys: Array<{
      approach: LumiiThresholdApproach;
      path: LumiiThresholdDialogueChoiceId[];
    }> = [
      { approach: "kinship", path: ["kinship-want", "kinship-with-you"] },
      { approach: "kinship", path: ["kinship-fear", "kinship-help"] },
      { approach: "kinship", path: ["kinship-familiar", "kinship-grow"] },
      { approach: "inquiry", path: ["inquiry-answer", "inquiry-unsayable"] },
      {
        approach: "inquiry",
        path: ["inquiry-warning", "inquiry-warning-against", "inquiry-risk"],
      },
      {
        approach: "inquiry",
        path: [
          "inquiry-warning",
          "inquiry-warning-against",
          "inquiry-preserve",
        ],
      },
      { approach: "inquiry", path: ["inquiry-relation", "inquiry-pattern"] },
      { approach: "dominion", path: ["dominion-decide"] },
      { approach: "dominion", path: ["dominion-cipher"] },
      { approach: "dominion", path: ["dominion-stand", "dominion-stop"] },
    ];

    for (const journey of journeys) {
      let storedPath: LumiiThresholdDialogueChoiceId[] = [];
      for (let length = 1; length <= journey.path.length; length += 1) {
        const decision = decideLumiiDialoguePathUpdate(
          { approach: journey.approach, path: storedPath, resolution: null },
          journey.path.slice(0, length),
        );
        if (!decision.ok) {
          throw new Error(
            `Legacy path failed: ${journey.path.slice(0, length).join("/")}`,
          );
        }
        storedPath = decision.writePath ?? storedPath;
      }
      expect(
        isLumiiThresholdDialoguePathPrefix(journey.approach, storedPath),
      ).toBe(true);
    }
  });
});
