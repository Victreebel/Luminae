import { describe, expect, it } from "vitest";
import {
  TUTORIAL_AFFINITY_DESCRIPTORS,
  TUTORIAL_BEATS,
} from "@/lib/tutorialData";
import {
  TUTORIAL_COPY_DECISIONS,
  TUTORIAL_REJECTED_COPY,
  getTutorialCopyStatus,
  tutorialCopyLocatorKey,
  type TutorialCopyLocator,
} from "@/lib/tutorialDialogueGovernance";

function readTutorialCopy(locator: TutorialCopyLocator): string | undefined {
  if (locator.kind === "affinity_subtitle") {
    return TUTORIAL_AFFINITY_DESCRIPTORS[
      locator.affinity as keyof typeof TUTORIAL_AFFINITY_DESCRIPTORS
    ];
  }

  const beat = TUTORIAL_BEATS.find((candidate) => candidate.id === locator.beatId);
  if (!beat) return undefined;

  switch (locator.kind) {
    case "dialogue":
      return beat.dialogue[locator.lineIndex]?.text;
    case "player_response":
      return beat.playerResponse;
    case "choice":
      return beat.choices?.find((choice) => choice.id === locator.choiceId)?.label;
  }
}

describe("tutorial dialogue authorship governance", () => {
  it("keeps every locked or approved copy decision exact", () => {
    for (const decision of TUTORIAL_COPY_DECISIONS) {
      expect(
        readTutorialCopy(decision.locator),
        `${tutorialCopyLocatorKey(decision.locator)} changed without copy approval`,
      ).toBe(decision.text);
    }
  });

  it("gives every decision a unique stable locator", () => {
    const keys = TUTORIAL_COPY_DECISIONS.map((decision) =>
      tutorialCopyLocatorKey(decision.locator),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("classifies unreviewed copy as draft", () => {
    expect(getTutorialCopyStatus({
      kind: "dialogue",
      beatId: "b6_forge_appears",
      lineIndex: 0,
    })).toBe("draft");
  });

  it("does not restore copy the user rejected", () => {
    const visibleCopy = TUTORIAL_BEATS.flatMap((beat) => [
      ...beat.dialogue.map((line) => line.text),
      beat.playerResponse ?? "",
      ...(beat.choices?.map((choice) => choice.label) ?? []),
    ]).join("\n").toLocaleLowerCase();

    for (const rejected of TUTORIAL_REJECTED_COPY) {
      expect(visibleCopy).not.toContain(rejected.toLocaleLowerCase());
    }
  });
});
