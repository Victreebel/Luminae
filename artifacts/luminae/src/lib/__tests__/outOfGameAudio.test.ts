import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OutOfGameAudio } from "../outOfGameAudio";

class FakeAudioParam {
  value = 1;
  cancelScheduledValues() {}
  exponentialRampToValueAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; }
  setValueAtTime(value: number) { this.value = value; }
  setTargetAtTime(value: number) { this.value = value; }
}

class FakeAudioNode extends EventTarget {
  connect() { return this; }
  disconnect() {}
}

class FakeSource extends FakeAudioNode {
  buffer: unknown = null;
  loop = false;
  start() {}
  stop() {}
}

class FakeOscillator extends FakeSource {
  type = "sine";
  detune = new FakeAudioParam();
  frequency = new FakeAudioParam();
}

class FakeGain extends FakeAudioNode {
  gain = new FakeAudioParam();
}

class FakeFilter extends FakeAudioNode {
  type = "lowpass";
  frequency = new FakeAudioParam();
  Q = new FakeAudioParam();
}

class FakeCompressor extends FakeAudioNode {
  threshold = new FakeAudioParam();
  knee = new FakeAudioParam();
  ratio = new FakeAudioParam();
  attack = new FakeAudioParam();
  release = new FakeAudioParam();
}

class FakeAudioContext {
  currentTime = 0;
  destination = new FakeAudioNode();
  sampleRate = 100;
  state = "running";

  createBiquadFilter() { return new FakeFilter(); }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() { return new FakeSource(); }
  createDynamicsCompressor() { return new FakeCompressor(); }
  createGain() { return new FakeGain(); }
  createOscillator() { return new FakeOscillator(); }
  resume() { return Promise.resolve(); }
}

describe("OutOfGameAudio", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.removeItem("luminae_muted");
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: FakeAudioContext,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps every interface cue brief and bounded", () => {
    const audio = new OutOfGameAudio();

    for (const cue of [
      "control",
      "navigate",
      "primary",
      "open",
      "close",
      "archive",
      "store",
      "settings",
      "confirm",
      "vault",
    ] as const) {
      expect(audio.play(cue)).toBe(true);
    }
    expect(audio.getActiveResourceCounts().buses).toBe(10);

    vi.advanceTimersByTime(1_250);
    expect(audio.getActiveResourceCounts().buses).toBe(0);
  });

  it("keeps every Lumii cinematic cue bounded", () => {
    const audio = new OutOfGameAudio();

    for (const cue of [
      "threshold-expand",
      "cipher-surge",
      "cipher-collapse",
      "covenant-break",
      "board-entry",
      "vault-release",
      "reward-reveal",
    ] as const) {
      expect(audio.playLumiiCinematic(cue)).toBe(true);
    }
    expect(audio.getActiveResourceCounts().buses).toBe(7);

    vi.advanceTimersByTime(2_200);
    expect(audio.getActiveResourceCounts().buses).toBe(0);
  });

  it("reads the current mute preference before every cue", () => {
    const audio = new OutOfGameAudio();

    audio.setMuted(true);
    expect(audio.play("primary")).toBe(false);
    expect(audio.getActiveResourceCounts().buses).toBe(0);

    audio.setMuted(false);
    expect(audio.play("control")).toBe(true);
  });

  it("keeps out-of-match ambience as a single bounded layer", () => {
    const audio = new OutOfGameAudio();

    expect(audio.startOutOfMatchAmbient("dashboard")).toBe(true);
    expect(audio.getActiveResourceCounts().ambient).toBe(true);

    expect(audio.startOutOfMatchAmbient("vault")).toBe(true);
    expect(audio.getActiveResourceCounts().ambient).toBe(true);

    expect(audio.stopOutOfMatchAmbient(0.12)).toBe(true);
    vi.advanceTimersByTime(400);
    expect(audio.getActiveResourceCounts().ambient).toBe(false);
  });
});
