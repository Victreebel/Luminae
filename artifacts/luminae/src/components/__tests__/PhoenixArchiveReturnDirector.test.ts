import { describe, expect, it } from "vitest";
import { archivePulseDelayForIndexes } from "../phoenixArchiveReturnTiming";

describe("archivePulseDelayForIndexes", () => {
  it("does not schedule a pulse before tier flights exist", () => {
    expect(archivePulseDelayForIndexes([])).toBeNull();
  });

  it("always returns a finite delay for valid flight indexes", () => {
    const delay = archivePulseDelayForIndexes([0, 3, 5]);

    expect(delay).not.toBeNull();
    expect(Number.isFinite(delay)).toBe(true);
  });

  it("ignores non-finite indexes instead of passing them to animation timing", () => {
    expect(
      archivePulseDelayForIndexes([Number.NaN, Number.POSITIVE_INFINITY]),
    ).toBeNull();
    expect(archivePulseDelayForIndexes([Number.NaN, 2])).toBeCloseTo(0.77);
  });
});
