import { act, cleanup, render } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ForgeMoltenSurface } from "@/components/ForgeMoltenSurface";

const props = {
  durationMs: 1_500,
  delayMs: 0,
  primary: "#c97d39",
  secondary: "#65a5b0",
  width: 73,
  height: 104,
};

function mockContext() {
  const loseContext = vi.fn();
  const context = {
    VERTEX_SHADER: 35633,
    FRAGMENT_SHADER: 35632,
    COMPILE_STATUS: 35713,
    LINK_STATUS: 35714,
    ARRAY_BUFFER: 34962,
    STATIC_DRAW: 35044,
    FLOAT: 5126,
    TRIANGLE_STRIP: 5,
    NO_ERROR: 0,
    createShader: vi.fn(() => ({})),
    shaderSource: vi.fn(),
    compileShader: vi.fn(),
    getShaderParameter: vi.fn(() => true),
    createProgram: vi.fn(() => ({})),
    attachShader: vi.fn(),
    linkProgram: vi.fn(),
    getProgramParameter: vi.fn(() => true),
    useProgram: vi.fn(),
    createBuffer: vi.fn(() => ({})),
    bindBuffer: vi.fn(),
    bufferData: vi.fn(),
    getAttribLocation: vi.fn(() => 0),
    enableVertexAttribArray: vi.fn(),
    vertexAttribPointer: vi.fn(),
    viewport: vi.fn(),
    getUniformLocation: vi.fn((_program: unknown, name: string) => ({ name })),
    uniform2f: vi.fn(),
    uniform3fv: vi.fn(),
    uniform1f: vi.fn(),
    drawArrays: vi.fn(),
    getError: vi.fn(() => 0),
    isContextLost: vi.fn(() => false),
    deleteBuffer: vi.fn(),
    deleteProgram: vi.fn(),
    deleteShader: vi.fn(),
    getExtension: vi.fn(() => ({ loseContext })),
  };
  // JSDOM has no GPU; this mock implements only the WebGL calls used by the renderer.
  // eslint-disable-next-line no-restricted-syntax
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as unknown as WebGLRenderingContext);
  return { context, loseContext };
}

describe("ForgeMoltenSurface", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("WebGLRenderingContext", function WebGLRenderingContext() {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("leaves the CSS fallback visible when no WebGL context is available", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const requestFrame = vi.spyOn(window, "requestAnimationFrame");
    const { container } = render(<ForgeMoltenSurface {...props} />);

    expect(container.querySelector("canvas")).toHaveAttribute("data-ready", "false");
    act(() => vi.advanceTimersByTime(2_000));
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it("releases partially compiled resources without hiding the fallback", () => {
    const { context } = mockContext();
    context.getShaderParameter.mockReturnValue(false);
    const { container } = render(<ForgeMoltenSurface {...props} />);

    expect(container.querySelector("canvas")).toHaveAttribute("data-ready", "false");
    expect(context.deleteProgram).toHaveBeenCalledTimes(1);
    expect(context.deleteShader).toHaveBeenCalledTimes(1);
    expect(context.drawArrays).not.toHaveBeenCalled();
  });

  it("cancels the active frame and releases its GPU context when unmounted", async () => {
    const { context, loseContext } = mockContext();
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame");
    const { container, unmount } = render(<ForgeMoltenSurface {...props} />);
    expect(container.querySelector("canvas")).toHaveAttribute("data-ready", "true");
    act(() => vi.advanceTimersByTime(0));
    expect(requestFrame).toHaveBeenCalledTimes(1);

    await act(async () => unmount());
    expect(cancelFrame).toHaveBeenCalledWith(42);
    expect(context.deleteBuffer).toHaveBeenCalledTimes(1);
    expect(context.deleteProgram).toHaveBeenCalledTimes(1);
    expect(context.deleteShader).toHaveBeenCalledTimes(2);
    expect(loseContext).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(2_000));
    expect(requestFrame).toHaveBeenCalledTimes(1);
  });

  it("updates a resized surface without rebuilding its context or restarting condensation", () => {
    const { context, loseContext } = mockContext();
    const now = vi.spyOn(performance, "now").mockReturnValue(100);
    const frames: FrameRequestCallback[] = [];
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => {
      frames.push(callback);
      return frames.length;
    });
    const { container, rerender } = render(<ForgeMoltenSurface {...props} seed="card:1" />);
    act(() => vi.advanceTimersByTime(0));
    now.mockReturnValue(850);
    act(() => frames.shift()!(850));
    expect(context.uniform1f).toHaveBeenLastCalledWith({ name: "uProgress" }, .5);

    rerender(<ForgeMoltenSurface {...props} seed="card:1" width={103} height={147} />);
    const canvas = container.querySelector("canvas")!;
    const pixelRatio = Math.min(1.5, window.devicePixelRatio || 1);
    expect(canvas).toHaveAttribute("data-ready", "true");
    expect(canvas.width).toBe(Math.round(103 * pixelRatio));
    expect(canvas.height).toBe(Math.round(147 * pixelRatio));
    expect(context.uniform2f).toHaveBeenLastCalledWith({ name: "uSize" }, 103, 147);
    expect(context.uniform1f).toHaveBeenLastCalledWith({ name: "uProgress" }, .5);
    expect(HTMLCanvasElement.prototype.getContext).toHaveBeenCalledTimes(1);
    expect(context.createProgram).toHaveBeenCalledTimes(1);
    expect(context.deleteProgram).not.toHaveBeenCalled();
    expect(loseContext).not.toHaveBeenCalled();

    now.mockReturnValue(1_600);
    act(() => frames.shift()!(1_600));
    expect(context.uniform1f).toHaveBeenLastCalledWith({ name: "uProgress" }, 1);
    expect(requestFrame).toHaveBeenCalledTimes(2);
  });

  it("preserves the scheduled start when the slot resizes during a stagger", () => {
    const { context } = mockContext();
    const now = vi.spyOn(performance, "now").mockReturnValue(100);
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);
    const { rerender } = render(<ForgeMoltenSurface {...props} delayMs={600} />);
    act(() => vi.advanceTimersByTime(300));
    now.mockReturnValue(400);
    rerender(<ForgeMoltenSurface {...props} delayMs={600} width={103} height={147} />);
    expect(context.uniform1f).toHaveBeenLastCalledWith({ name: "uProgress" }, 0);
    expect(requestFrame).not.toHaveBeenCalled();

    act(() => vi.advanceTimersByTime(300));
    expect(requestFrame).toHaveBeenCalledTimes(1);
    expect(context.createProgram).toHaveBeenCalledTimes(1);
  });

  it("freezes condensation while paused and resumes the remaining material clock without a new context", () => {
    const { context } = mockContext();
    const now = vi.spyOn(performance, "now").mockReturnValue(100);
    const frames = new Map<number, FrameRequestCallback>();
    let nextFrame = 0;
    vi.spyOn(window, "requestAnimationFrame").mockImplementation(callback => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    });
    vi.spyOn(window, "cancelAnimationFrame").mockImplementation(id => { frames.delete(id); });
    const { rerender } = render(<ForgeMoltenSurface {...props} />);
    act(() => vi.advanceTimersByTime(0));
    now.mockReturnValue(700);
    rerender(<ForgeMoltenSurface {...props} paused />);
    expect(context.uniform1f).toHaveBeenLastCalledWith({ name: "uProgress" }, .4);
    expect(frames.size).toBe(0);

    now.mockReturnValue(60_700);
    rerender(<ForgeMoltenSurface {...props} paused width={90} />);
    expect(context.uniform1f).toHaveBeenLastCalledWith({ name: "uProgress" }, .4);
    expect(frames.size).toBe(0);
    rerender(<ForgeMoltenSurface {...props} width={90} />);
    act(() => vi.advanceTimersByTime(0));
    now.mockReturnValue(61_000);
    act(() => frames.values().next().value!(61_000));
    expect(context.uniform1f).toHaveBeenLastCalledWith({ name: "uProgress" }, .6);
    expect(context.createProgram).toHaveBeenCalledTimes(1);
  });

  it("does not advance an initially paused material or lose the remaining stagger", () => {
    const { context } = mockContext();
    const now = vi.spyOn(performance, "now").mockReturnValue(100);
    const requestFrame = vi.spyOn(window, "requestAnimationFrame").mockReturnValue(42);
    const { rerender } = render(<ForgeMoltenSurface {...props} delayMs={600} paused />);
    act(() => vi.advanceTimersByTime(60_000));
    now.mockReturnValue(60_100);
    expect(requestFrame).not.toHaveBeenCalled();
    rerender(<ForgeMoltenSurface {...props} delayMs={600} />);
    expect(context.uniform1f).toHaveBeenLastCalledWith({ name: "uProgress" }, 0);
    act(() => vi.advanceTimersByTime(599));
    expect(requestFrame).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(requestFrame).toHaveBeenCalledTimes(1);
  });

  it("can resume a replaced mold from its existing condensation progress", () => {
    const { context } = mockContext();
    vi.spyOn(performance, "now").mockReturnValue(100);
    render(<ForgeMoltenSurface {...props} initialElapsedMs={600} paused />);
    expect(context.uniform1f).toHaveBeenLastCalledWith({ name: "uProgress" }, .4);
  });

  it("keeps each seed stable and gives other casts a different bounded material phase", () => {
    const { context } = mockContext();
    const { rerender } = render(<ForgeMoltenSurface {...props} seed="card:1" />);
    const seedCalls = () => context.uniform2f.mock.calls.filter(([uniform]) => uniform.name === "uSeed");
    const firstPhase = seedCalls()[0].slice(1);
    expect(firstPhase.every(value => typeof value === "number" && value >= -1 && value <= 1)).toBe(true);

    rerender(<ForgeMoltenSurface {...props} seed="card:1" width={99} />);
    expect(seedCalls()).toHaveLength(1);
    rerender(<ForgeMoltenSurface {...props} seed="card:2" />);
    expect(seedCalls()[1].slice(1)).not.toEqual(firstPhase);
    rerender(<ForgeMoltenSurface {...props} seed="card:1" />);
    expect(seedCalls()[2].slice(1)).toEqual(firstPhase);
    rerender(<ForgeMoltenSurface {...props} />);
    expect(seedCalls()[3].slice(1)).toEqual([0, 0]);
    expect(context.createProgram).toHaveBeenCalledTimes(1);
  });

  it("does not lose a still-mounted canvas during StrictMode effect replay", async () => {
    const { context, loseContext } = mockContext();
    const { container, unmount } = render(<StrictMode><ForgeMoltenSurface {...props} /></StrictMode>);
    await act(async () => {});
    expect(container.querySelector("canvas")).toHaveAttribute("data-ready", "true");
    expect(context.createProgram).toHaveBeenCalledTimes(2);
    expect(loseContext).not.toHaveBeenCalled();

    await act(async () => unmount());
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it("does not schedule frames during a stagger, including after an early unmount", () => {
    const { context } = mockContext();
    const requestFrame = vi.spyOn(window, "requestAnimationFrame");
    const { unmount } = render(<ForgeMoltenSurface {...props} delayMs={600} />);
    expect(context.drawArrays).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(500));
    expect(requestFrame).not.toHaveBeenCalled();

    unmount();
    act(() => vi.advanceTimersByTime(1_000));
    expect(requestFrame).not.toHaveBeenCalled();
  });

  it("returns to the fallback and stops drawing when the context is lost", () => {
    const { context } = mockContext();
    vi.spyOn(window, "requestAnimationFrame").mockReturnValue(47);
    const cancelFrame = vi.spyOn(window, "cancelAnimationFrame");
    const { container } = render(<ForgeMoltenSurface {...props} />);
    act(() => vi.advanceTimersByTime(0));
    const canvas = container.querySelector("canvas")!;
    context.isContextLost.mockReturnValue(true);

    act(() => canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true })));
    expect(canvas).toHaveAttribute("data-ready", "false");
    expect(cancelFrame).toHaveBeenCalledWith(47);
    expect(context.deleteProgram).toHaveBeenCalledTimes(1);
  });
});
