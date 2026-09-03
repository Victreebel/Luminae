import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useViewportSize } from "../use-viewport-size";

const originalWidth = window.innerWidth;
const originalHeight = window.innerHeight;

function setViewportSize(width: number, height: number) {
  Object.defineProperty(window, "innerWidth", {
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, "innerHeight", {
    configurable: true,
    value: height,
  });
}

afterEach(() => {
  setViewportSize(originalWidth, originalHeight);
});

describe("useViewportSize", () => {
  it("refreshes geometry after the viewport is resized", () => {
    setViewportSize(720, 640);
    const { result } = renderHook(() => useViewportSize());

    expect(result.current).toEqual({ width: 720, height: 640 });

    act(() => {
      setViewportSize(1440, 900);
      window.dispatchEvent(new Event("resize"));
    });

    expect(result.current).toEqual({ width: 1440, height: 900 });
  });
});
