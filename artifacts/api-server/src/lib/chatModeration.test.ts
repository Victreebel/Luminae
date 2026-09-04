import { describe, expect, it, vi } from "vitest";

vi.mock("@workspace/db", () => ({
  accountBlocksTable: {},
  moderationEventsTable: {},
  db: {},
}));

import { filterChatText } from "./chatModeration";

describe("filterChatText", () => {
  it("normalizes control characters, whitespace, and length", () => {
    const result = filterChatText(`  hello\u0000    world ${"x".repeat(250)}  `);
    expect(result.text).not.toContain("\u0000");
    expect(result.text).not.toContain("  ");
    expect(result.text.length).toBeLessThanOrEqual(200);
  });

  it("removes links and direct contact details", () => {
    const result = filterChatText("Find me at test@example.com, +1 (212) 555-0199, or https://example.com");
    expect(result.text).toBe("Find me at [contact removed], [contact removed], or [link removed]");
    expect(result.filtered).toBe(true);
  });

  it("removes direct-harm phrases while leaving ordinary game chat intact", () => {
    expect(filterChatText("kys").text).toBe("[message removed]");
    expect(filterChatText("That forge timing was excellent")).toEqual({
      text: "That forge timing was excellent",
      filtered: false,
    });
  });
});
