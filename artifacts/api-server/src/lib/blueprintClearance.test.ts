import { describe, expect, it } from "vitest";
import {
  decideBlueprintThresholdAction,
  decideLumiiDialogueLeave,
  decideLumiiDialoguePathUpdate,
  freshLumiiEncounterMemory,
  isCompleteLumiiThresholdDialoguePath,
  isQualifyingBlueprintVictory,
} from "./blueprintClearance.js";

const hardTable = [
  { id: "player", isAi: false, aiDifficulty: null },
  { id: "hard-1", isAi: true, aiDifficulty: "hard" },
  { id: "hard-2", isAi: true, aiDifficulty: "hard" },
  { id: "hard-3", isAi: true, aiDifficulty: "hard" },
];

function qualifies(overrides: Partial<Parameters<typeof isQualifyingBlueprintVictory>[0]> = {}) {
  return isQualifyingBlueprintVictory({
    gameMode: "standard",
    blueprintPolicy: "none",
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
    ["five civilizations", { participants: [...hardTable, { id: "hard-4", isAi: true, aiDifficulty: "hard" }] }],
    ["a non-Hard AI", { participants: hardTable.map((entry, index) => index === 1 ? { ...entry, aiDifficulty: "medium" } : entry) }],
    ["another human", { participants: hardTable.map((entry, index) => index === 1 ? { ...entry, isAi: false, aiDifficulty: null } : entry) }],
    ["custom play", { gameMode: "custom" }],
    ["Blueprint-enabled standard play", { blueprintPolicy: "owned" }],
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
      thresholdRupturedAt: null,
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
    expect(decideBlueprintThresholdAction(
      { cipherDeactivated: false, thresholdApproach: null },
      { action: "choose_approach", approach: "inquiry" },
    )).toMatchObject({ ok: false, status: 409 });
  });

  it("accepts the same approach idempotently and rejects a conflicting route", () => {
    expect(decideBlueprintThresholdAction(
      { cipherDeactivated: true, thresholdApproach: "kinship" },
      { action: "choose_approach", approach: "kinship" },
    )).toMatchObject({ ok: true, writeApproach: null, thresholdApproach: "kinship" });

    expect(decideBlueprintThresholdAction(
      { cipherDeactivated: true, thresholdApproach: "kinship" },
      { action: "choose_approach", approach: "dominion" },
    )).toMatchObject({
      ok: false,
      status: 409,
      error: "Your approach at this threshold has already been recorded",
    });
  });

  it("records only the next valid response and treats an identical path as a no-op", () => {
    const first = decideLumiiDialoguePathUpdate(
      { approach: "inquiry", path: [], resolution: null },
      ["inquiry-warning"],
    );
    const repeat = decideLumiiDialoguePathUpdate(
      { approach: "inquiry", path: ["inquiry-warning"], resolution: null },
      ["inquiry-warning"],
    );

    expect(first).toEqual({ ok: true, writePath: ["inquiry-warning"] });
    expect(repeat).toEqual({ ok: true, writePath: null });
  });

  it("rejects skipped, conflicting, and post-resolution responses", () => {
    expect(decideLumiiDialoguePathUpdate(
      { approach: "inquiry", path: [], resolution: null },
      ["inquiry-warning", "inquiry-warning-against"],
    )).toMatchObject({ ok: false, status: 409 });
    expect(decideLumiiDialoguePathUpdate(
      { approach: "kinship", path: [], resolution: null },
      ["dominion-stand"],
    )).toMatchObject({ ok: false, status: 409 });
    expect(decideLumiiDialoguePathUpdate(
      { approach: "dominion", path: ["dominion-stand"], resolution: "left" },
      ["dominion-stand", "dominion-stop"],
    )).toMatchObject({ ok: false, status: 409 });
  });

  it("recognizes complete branches and records an early leave idempotently", () => {
    expect(isCompleteLumiiThresholdDialoguePath("inquiry", [
      "inquiry-warning",
      "inquiry-warning-against",
      "inquiry-risk",
    ])).toBe(true);
    expect(isCompleteLumiiThresholdDialoguePath("inquiry", ["inquiry-warning"])).toBe(false);
    expect(isCompleteLumiiThresholdDialoguePath("kinship", ["kinship-familiar", "kinship-grow"])).toBe(true);
    expect(isCompleteLumiiThresholdDialoguePath("dominion", ["dominion-stand"])).toBe(true);
    expect(decideLumiiDialogueLeave(null)).toEqual({ ok: true, writeResolution: "left" });
    expect(decideLumiiDialogueLeave("left")).toEqual({ ok: true, writeResolution: null });
    expect(decideLumiiDialogueLeave("continued")).toMatchObject({ ok: false, status: 409 });
  });
});
