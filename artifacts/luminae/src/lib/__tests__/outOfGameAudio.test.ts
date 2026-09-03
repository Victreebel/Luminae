import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { OutOfGameAudio } from "../outOfGameAudio";
import {
  LUMII_AFFINITY_NODE_COUNT,
  LUMII_NATURAL_AFFINITIES,
  LUMII_SIGNAL_NOTES,
} from "../lumiiIdentity";

class FakeAudioParam {
  value = 1;
  cancelScheduledValues() {}
  exponentialRampToValueAtTime(value: number) {
    this.value = value;
  }
  linearRampToValueAtTime(value: number) {
    this.value = value;
  }
  setValueAtTime(value: number) {
    this.value = value;
  }
  setTargetAtTime(value: number) {
    this.value = value;
  }
}

class FakeAudioNode extends EventTarget {
  connect() {
    return this;
  }
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

  createBiquadFilter() {
    return new FakeFilter();
  }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    return new FakeSource();
  }
  createDynamicsCompressor() {
    return new FakeCompressor();
  }
  createGain() {
    return new FakeGain();
  }
  createOscillator() {
    return new FakeOscillator();
  }
  resume() {
    return Promise.resolve();
  }
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
    vi.unstubAllGlobals();
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
      "cipher-dismiss",
      "architect-cipher-pressure",
      "architect-cipher-fracture",
      "architect-cipher-release",
      "vault-doors-open",
      "vault-doors-halt",
      "covenant-break",
      "board-entry",
      "vault-release",
      "reward-reveal",
    ] as const) {
      expect(audio.playLumiiCinematic(cue)).toBe(true);
    }
    expect(audio.getActiveResourceCounts().buses).toBe(13);

    vi.advanceTimersByTime(2_200);
    expect(audio.getActiveResourceCounts().buses).toBe(2);
    vi.advanceTimersByTime(1_400);
    expect(audio.getActiveResourceCounts().buses).toBe(1);
    vi.advanceTimersByTime(1_800);
    expect(audio.getActiveResourceCounts().buses).toBe(0);
  });

  it("preloads the recorded door halt when the Vault begins opening", async () => {
    const decodeAudioData = vi.fn().mockResolvedValue({ duration: 0.65 });
    class FakeDecodedAudioContext extends FakeAudioContext {
      decodeAudioData = decodeAudioData;
    }
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: FakeDecodedAudioContext,
    });
    const fetchAudio = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    vi.stubGlobal("fetch", fetchAudio);
    const audio = new OutOfGameAudio();

    expect(audio.playLumiiCinematic("vault-doors-open")).toBe(true);
    await vi.waitFor(() => expect(decodeAudioData).toHaveBeenCalledOnce());
    expect(String(fetchAudio.mock.calls[0]?.[0])).toContain(
      "Vault%20Doors%20Halt.wav",
    );

    expect(audio.playLumiiCinematic("vault-doors-halt")).toBe(true);
    await Promise.resolve();
    expect(fetchAudio).toHaveBeenCalledOnce();
  });

  it("preloads the glass break before the permanent Cipher rupture", async () => {
    const decodeAudioData = vi.fn().mockResolvedValue({ duration: 1.1 });
    class FakeDecodedAudioContext extends FakeAudioContext {
      decodeAudioData = decodeAudioData;
    }
    Object.defineProperty(window, "AudioContext", {
      configurable: true,
      value: FakeDecodedAudioContext,
    });
    const fetchAudio = vi.fn().mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    });
    vi.stubGlobal("fetch", fetchAudio);
    const audio = new OutOfGameAudio();

    expect(audio.playLumiiCinematic("architect-cipher-pressure")).toBe(true);
    await vi.waitFor(() => expect(decodeAudioData).toHaveBeenCalledOnce());
    expect(String(fetchAudio.mock.calls[0]?.[0])).toContain(
      "Glass%20Shatter.mp3",
    );

    expect(audio.playLumiiCinematic("architect-cipher-fracture")).toBe(true);
    await Promise.resolve();
    expect(fetchAudio).toHaveBeenCalledOnce();
  });

  it("derives every Lumii signal from the five-node identity", () => {
    expect(LUMII_NATURAL_AFFINITIES).toHaveLength(5);
    expect(LUMII_AFFINITY_NODE_COUNT).toBe(5);
    for (const notes of Object.values(LUMII_SIGNAL_NOTES)) {
      expect(notes).toHaveLength(LUMII_AFFINITY_NODE_COUNT);
    }
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
