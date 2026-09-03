import { describe, expect, it } from "vitest";
import {
  getTutorialCameraFocus,
  getTutorialCameraScrollBehavior,
  getTutorialCameraScrollTop,
  getTutorialCompactSurface,
  usesStaticTutorialCamera,
} from "@/lib/tutorialCamera";

function focus(
  beatId: string,
  isActionInstructionVisible = false,
  finalDeliveryComplete = false,
) {
  return getTutorialCameraFocus({
    beatId,
    isActionInstructionVisible,
    finalDeliveryComplete,
  });
}

describe("tutorial camera policy", () => {
  it("frames every board lesson around its current teaching target", () => {
    expect(focus("b6_forge_appears")).toBe("overview");
    expect(focus("b6b_root_lattice")).toBe("tier1");
    expect(focus("b7_artifact_cost")).toBe("tier1");
    expect(focus("b8_first_harness")).toBe("tier1");
    expect(focus("b8a_lumii_harness_three")).toBe("well");
    expect(focus("b9_first_forge")).toBe("tier1");
    expect(focus("b9a_lumii_harness_two")).toBe("well");
    expect(focus("b9b_forge_complete")).toBe("well");
    expect(focus("b10_reserve")).toBe("tier1");
    expect(focus("b10a_lumii_harness_three")).toBe("well");
    expect(focus("b10b_reserve_granted")).toBe("well");
    expect(focus("b11_forge_reserved")).toBe("well");
    expect(focus("b11a_lumii_forge")).toBe("tier1");
    expect(focus("b11b_forge_reserved")).toBe("well");
    expect(focus("b11c_lumii_harness_three")).toBe("well");
    expect(focus("b14_win_condition")).toBe("well");
    expect(focus("b15b_luminary_signal")).toBe("overview");
  });

  it("moves the final Forge camera only as its delivery becomes usable", () => {
    expect(focus("b16_final_forge", false, false)).toBe("overview");
    expect(focus("b16_final_forge", true, false)).toBe("well");
    expect(focus("b16_final_forge", true, true)).toBe("tier2");
  });

  it("uses a static camera at every required phone verification size", () => {
    expect(usesStaticTutorialCamera({ width: 320, height: 568 })).toBe(true);
    expect(usesStaticTutorialCamera({ width: 390, height: 844 })).toBe(true);
    expect(usesStaticTutorialCamera({ width: 844, height: 390 })).toBe(true);
    expect(usesStaticTutorialCamera({ width: 1440, height: 900 })).toBe(false);
  });

  it("replaces low-priority content instead of hiding the active phone target", () => {
    expect(getTutorialCompactSurface("b8_first_harness")).toBe("forge");
    expect(getTutorialCompactSurface("b10_reserve")).toBe("forge");
    expect(getTutorialCompactSurface("b15b_luminary_signal")).toBe("luminary");
    expect(getTutorialCompactSurface("b16_final_forge")).toBe("forge");
  });

  it("clamps every scrolling-camera destination to the board", () => {
    const metrics = { maxScroll: 900, tier1Top: 820, tier2Top: 430 };
    expect(getTutorialCameraScrollTop("overview", metrics, false)).toBe(0);
    expect(getTutorialCameraScrollTop("well", metrics, false)).toBe(900);
    expect(getTutorialCameraScrollTop("tier1", metrics, false)).toBe(820);
    expect(getTutorialCameraScrollTop("tier2", metrics, false)).toBe(382);
    expect(getTutorialCameraScrollTop("tier1", { ...metrics, tier1Top: 1200 }, false)).toBe(900);
    expect(getTutorialCameraScrollTop("tier2", { maxScroll: 900 }, false)).toBe(402);
  });

  it("resets static-camera scroll immediately after a resize", () => {
    const metrics = { maxScroll: 900, tier1Top: 820, tier2Top: 430 };
    expect(getTutorialCameraScrollTop("tier1", metrics, true)).toBe(0);
    expect(getTutorialCameraScrollBehavior("tier1", true)).toBe("auto");
    expect(getTutorialCameraScrollBehavior("well", false)).toBe("smooth");
  });
});
