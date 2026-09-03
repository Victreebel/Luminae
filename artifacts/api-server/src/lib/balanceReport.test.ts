import { describe, expect, it } from "vitest";
import { average, percentage, percentile } from "./balanceReport";

describe("balance report statistics", () => {
  it("uses nearest-rank percentiles for seed-replayable reports", () => {
    expect(percentile([9, 1, 5, 3, 7], 0.5)).toBe(5);
    expect(percentile([9, 1, 5, 3, 7], 0.9)).toBe(9);
    expect(percentile([], 0.9)).toBe(0);
  });

  it("returns stable rounded percentages and averages", () => {
    expect(percentage(1, 3)).toBe(33.33);
    expect(percentage(0, 0)).toBe(0);
    expect(average([2, 4, 6])).toBe(4);
  });
});

