import { beforeEach, describe, expect, it } from "vitest";
import { HINT_KEYS, clearHintsSeen, setPreferencesSyncToken } from "../cinematicPrefs";

describe("hint reset boundaries", () => {
  beforeEach(() => {
    localStorage.clear();
    setPreferencesSyncToken(null);
  });

  it("does not erase canonical First Contact state when hints are reset", () => {
    localStorage.setItem(HINT_KEYS[0], "1");
    localStorage.setItem("luminae_tutorial_seen", "1");
    localStorage.setItem("luminae_tutorial_completed", "1");
    localStorage.setItem("luminae_tutorial_progress", "17");

    clearHintsSeen();

    expect(localStorage.getItem(HINT_KEYS[0])).toBeNull();
    expect(localStorage.getItem("luminae_tutorial_seen")).toBe("1");
    expect(localStorage.getItem("luminae_tutorial_completed")).toBe("1");
    expect(localStorage.getItem("luminae_tutorial_progress")).toBe("17");
  });
});
