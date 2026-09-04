import { describe, expect, it } from "vitest";
import {
  accountProofMatches,
  getNativePurchaseVerifier,
  obfuscateStoreAccountId,
} from "./nativePurchaseVerification";

describe("native purchase verification helpers", () => {
  it("creates a stable, account-specific proof without exposing the account id", () => {
    const first = obfuscateStoreAccountId("account-a");
    const again = obfuscateStoreAccountId("account-a");
    const other = obfuscateStoreAccountId("account-b");
    expect(first).toBe(again);
    expect(first).not.toBe(other);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(first).not.toContain("account-a");
  });

  it("accepts the exact proof and Samsung's base64 transport form only", () => {
    const proof = obfuscateStoreAccountId("account-a");
    expect(accountProofMatches(proof, "account-a")).toBe(true);
    expect(accountProofMatches(Buffer.from(proof).toString("base64"), "account-a")).toBe(true);
    expect(accountProofMatches(proof, "account-b")).toBe(false);
    expect(accountProofMatches(null, "account-a")).toBe(false);
  });

  it("selects a distinct provider adapter", () => {
    expect(getNativePurchaseVerifier("google_play"))
      .not.toBe(getNativePurchaseVerifier("samsung_iap"));
  });
});
