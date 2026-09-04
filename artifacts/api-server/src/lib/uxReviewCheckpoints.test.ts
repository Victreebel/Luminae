import { describe, expect, it } from "vitest";
import {
  UX_REVIEW_CHECKPOINT_IDS,
  UX_REVIEW_CHECKPOINT_RECIPES,
  uxReviewServerAllowed,
} from "./uxReviewCheckpoints";

describe("UX review checkpoint policy", () => {
  it("keeps every checkpoint explicit and forward-only", () => {
    expect(UX_REVIEW_CHECKPOINT_IDS).toEqual([
      "fresh",
      "post_tutorial",
      "trace_ready",
      "recurrence_ready",
      "triangulation_ready",
      "vault_ready",
      "vault_reveal",
      "vault_hub",
    ]);
    expect(UX_REVIEW_CHECKPOINT_IDS.map((id) =>
      UX_REVIEW_CHECKPOINT_RECIPES[id].completedChronicleCount,
    )).toEqual([0, 0, 0, 1, 2, 3, 3, 3]);
    expect(UX_REVIEW_CHECKPOINT_RECIPES.fresh.seeded).toBe(false);
    expect(UX_REVIEW_CHECKPOINT_RECIPES.vault_reveal.vaultState).toBe("reveal");
    expect(UX_REVIEW_CHECKPOINT_RECIPES.vault_hub.vaultState).toBe("opened");
  });

  it("is unavailable in production even when explicitly enabled", () => {
    expect(uxReviewServerAllowed({
      nodeEnv: "production",
      explicitEnable: "1",
      loopback: true,
    })).toBe(false);
  });

  it("requires a loopback development server or an explicit non-production enable", () => {
    expect(uxReviewServerAllowed({
      nodeEnv: "development",
      explicitEnable: undefined,
      loopback: true,
    })).toBe(true);
    expect(uxReviewServerAllowed({
      nodeEnv: undefined,
      explicitEnable: undefined,
      loopback: true,
    })).toBe(false);
    expect(uxReviewServerAllowed({
      nodeEnv: "test",
      explicitEnable: "1",
      loopback: false,
    })).toBe(true);
  });
});
