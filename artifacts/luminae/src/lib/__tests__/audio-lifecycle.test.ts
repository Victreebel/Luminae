import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameAudio } from '../audio';

class FakeAudioParam {
  value = 1;
  cancelScheduledValues() {}
  exponentialRampToValueAtTime(value: number) { this.value = value; }
  linearRampToValueAtTime(value: number) { this.value = value; }
  setTargetAtTime(value: number) { this.value = value; }
  setValueAtTime(value: number) { this.value = value; }
}

class FakeAudioNode extends EventTarget {
  disconnected = false;
  connect() { return this; }
  disconnect() { this.disconnected = true; }
}

class FakeScheduledSource extends FakeAudioNode {
  buffer: unknown = null;
  stopped = false;
  start() {}
  stop() { this.stopped = true; }
}

class FakeOscillator extends FakeScheduledSource {
  type = 'sine';
  frequency = new FakeAudioParam();
  detune = new FakeAudioParam();
}

class FakeGain extends FakeAudioNode {
  gain = new FakeAudioParam();
}

class FakeFilter extends FakeAudioNode {
  type = 'lowpass';
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
  sampleRate = 10;
  state = 'running';

  createBiquadFilter() { return new FakeFilter(); }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() { return new FakeScheduledSource(); }
  createDynamicsCompressor() { return new FakeCompressor(); }
  createGain() { return new FakeGain(); }
  createOscillator() { return new FakeOscillator(); }
  resume() { return Promise.resolve(); }
}

describe('GameAudio transient resource lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      value: FakeAudioContext,
    });
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('disposes activation buses after their bounded lifetime', () => {
    const audio = new GameAudio();

    audio.playActivationSting('summon');
    expect(audio.getTransientResourceCounts().activationBuses).toBe(1);

    vi.advanceTimersByTime(12_000);
    expect(audio.getTransientResourceCounts().activationBuses).toBe(0);
  });

  it('hard-resets arrival voices and buses at a game-session boundary', () => {
    const audio = new GameAudio();

    audio.playArrivalCutscene('radiant');
    expect(audio.getTransientResourceCounts().arrivalBuses).toBe(1);
    expect(audio.getTransientResourceCounts().voices).toBeGreaterThan(0);

    audio.resetTransientAudio();
    expect(audio.getTransientResourceCounts()).toEqual({
      voices: 0,
      buses: 0,
      arrivalBuses: 0,
      activationBuses: 0,
    });
  });
});
