import { describe, expect, it } from "vitest";
import {
  calculateTutorialCameraScrollTop,
  calculateTutorialGuidePosition,
  calculateTutorialTetherEndpoint,
  tutorialCostRegion,
  type TutorialGuideRect,
} from "@/lib/tutorialGuidance";

const rect = (left: number, top: number, width: number, height: number): TutorialGuideRect => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
});

describe("tutorial guidance geometry", () => {
  it("frames a lower shelf at the real compact-board scroll boundary", () => {
    expect(calculateTutorialCameraScrollTop({
      currentScrollTop: 0,
      scrollHeight: 330,
      clientHeight: 291,
      containerTop: 48,
      target: rect(6, 276, 514, 98),
      focusRatio: 0.64,
    })).toBe(39);
  });

  it("returns to the top when the upper shelf becomes the camera target", () => {
    expect(calculateTutorialCameraScrollTop({
      currentScrollTop: 39,
      scrollHeight: 330,
      clientHeight: 291,
      containerTop: 48,
      target: rect(6, 39, 514, 98),
      focusRatio: 0.38,
    })).toBe(0);
  });

  it("places Lumii beside a narrow target while respecting safe chrome", () => {
    const position = calculateTutorialGuidePosition({
      target: rect(10, 250, 104, 80),
      viewportWidth: 526,
      safeTop: 52,
      safeBottom: 506,
    });

    expect(position.x).toBeGreaterThan(114);
    expect(position.y).toBeGreaterThanOrEqual(78);
    expect(position.y).toBeLessThanOrEqual(480);
  });

  it("uses a vertical placement for a viewport-wide target", () => {
    const position = calculateTutorialGuidePosition({
      target: rect(0, 350, 526, 100),
      viewportWidth: 526,
      safeTop: 52,
      safeBottom: 506,
    });

    expect(position.x).toBeCloseTo(263);
    expect(position.y).toBeLessThan(350);
  });

  it("anchors the tether to the nearest target edge instead of a guessed center", () => {
    expect(calculateTutorialTetherEndpoint(
      { x: 170, y: 290 },
      rect(10, 250, 104, 80),
    )).toEqual({ x: 114, y: 290 });
  });

  it("narrows a card target to its visible cost region", () => {
    const cost = tutorialCostRegion(rect(10, 200, 100, 120));
    expect(cost.top).toBeCloseTo(279.2);
    expect(cost.left).toBe(14);
    expect(cost.right).toBe(106);
    expect(cost.bottom).toBe(316);
  });
});
