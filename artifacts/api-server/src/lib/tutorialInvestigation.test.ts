import { beforeAll, describe, expect, it } from "vitest";

let investigation: typeof import("./tutorialInvestigation");

beforeAll(async () => {
  process.env.DATABASE_URL ??= "postgres://localhost/luminae_test";
  investigation = await import("./tutorialInvestigation");
});

describe("First Contact investigation", () => {
  it("normalizes discovery input to the allowlisted stable order", () => {
    expect(investigation.normalizeTutorialDiscoveries([
      "encryption_authority",
      "not_a_discovery",
      "lumii_origin",
      "lumii_origin",
    ])).toEqual(["lumii_origin", "encryption_authority"]);
  });
});
