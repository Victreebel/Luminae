import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameAudio } from '../audio';

class FakeAudioParam {
  value = 1;
  automation: Array<{ value: number; time: number }> = [];
  setValueAtTime(value: number, time: number) { this.automation.push({ value, time }); }
  linearRampToValueAtTime(value: number, time: number) { this.automation.push({ value, time }); }
  exponentialRampToValueAtTime(value: number, time: number) { this.automation.push({ value, time }); }
}

class FakeNode extends EventTarget {
  disconnected = false;
  connect() { return this; }
  disconnect() { this.disconnected = true; }
}

class FakeSource extends FakeNode {
  buffer: unknown = null;
  type = 'sine';
  frequency = new FakeAudioParam();
  detune = new FakeAudioParam();
  start = vi.fn();
  stop = vi.fn();
}

class FakeGain extends FakeNode {
  gain = new FakeAudioParam();
}

class FakeFilter extends FakeNode {
  type = 'bandpass';
  frequency = new FakeAudioParam();
  Q = new FakeAudioParam();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 10;
  sampleRate = 100;
  state = 'running';
  destination = new FakeNode();
  sources: FakeSource[] = [];
  gains: FakeGain[] = [];
  decodedBuffer = { duration: 1.619594 };
  decodeAudioData = vi.fn(() => Promise.resolve(this.decodedBuffer));
  resume = vi.fn(() => Promise.resolve());

  constructor() { FakeAudioContext.instances.push(this); }
  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
  createBiquadFilter() { return new FakeFilter(); }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() {
    const source = new FakeSource();
    this.sources.push(source);
    return source;
  }
  createOscillator() { return this.createBufferSource(); }
}

describe('cosmic Forge refill audio', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.removeItem('luminae_muted');
    FakeAudioContext.instances = [];
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({
      ok: true,
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
    })));
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('unlocks and preloads the original card-deal asset without playing it early', async () => {
    const audio = new GameAudio();
    audio.prepareForgeRefillAudio();
    const ctx = FakeAudioContext.instances[0];
    await vi.advanceTimersByTimeAsync(0);
    expect(fetch).toHaveBeenCalledOnce();
    expect(decodeURI(vi.mocked(fetch).mock.calls[0][0] as string)).toContain('/Effects/Card draw.mp3');
    expect(ctx.decodeAudioData).toHaveBeenCalledOnce();
    expect(ctx.sources).toHaveLength(0);
    ctx.state = 'suspended';
    audio.prepareForgeRefillAudio();
    expect(ctx.resume).toHaveBeenCalledOnce();
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('scales the swell to the visual duration and staggers its actual start', () => {
    const audio = new GameAudio();
    audio.startForgeRefill({ durationMs: 2_000, delayMs: 240 });
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.sources).toHaveLength(3);
    for (const source of ctx.sources) {
      expect(source.start).toHaveBeenCalledWith(10.24);
      expect(source.stop.mock.calls[0][0]).toBeGreaterThanOrEqual(12.24);
      expect(source.stop.mock.calls[0][0]).toBeLessThan(12.3);
    }
    // No reveal chime is scheduled in advance of the visual callback.
    vi.advanceTimersByTime(2_240);
    expect(ctx.sources).toHaveLength(3);
  });

  it('plays the original card-deal cue once during reveal, with the swell continuing until completion', async () => {
    const audio = new GameAudio();
    const cue = audio.startForgeRefill({ durationMs: 2_000 });
    const ctx = FakeAudioContext.instances[0];
    await vi.advanceTimersByTimeAsync(0);
    ctx.currentTime = 11.1;
    cue.reveal();
    cue.reveal();
    await vi.advanceTimersByTimeAsync(0);
    expect(ctx.sources).toHaveLength(8);
    expect(ctx.sources.every((source) => !source.disconnected)).toBe(true);
    expect(audio.getTransientResourceCounts().voices).toBe(8);
    expect(ctx.sources.slice(3).every((source) => !source.disconnected)).toBe(true);
    // Preserve the real flip asset and its full-strength contact layer, rather
    // than substituting the separate, quieter fallback refill cue.
    const settling = ctx.sources.slice(3, 7);
    expect(settling.filter(source => source.buffer === null).map(source => [source.frequency.value, source.type])).toEqual([
      [104, 'sine'], [208, 'triangle'], [78, 'sine'],
    ]);
    settling.forEach((source, index) => {
      expect(source.start.mock.calls[0][0]).toBeCloseTo([11.4, 11.408, 11.4, 11.455][index]);
    });
    expect(ctx.sources[7].buffer).toBe(ctx.decodedBuffer);
    expect(ctx.sources[7].start).toHaveBeenCalledWith(11.1, 0);
    expect(ctx.gains.slice(-5).map(gain => Math.max(...gain.gain.automation.map(point => point.value)))).toEqual([
      0.058, 0.017, 0.012, 0.028, 0.55,
    ]);
    ctx.currentTime = 12;
    cue.complete();
    cue.complete();
    cue.reveal();
    cue.cancel();
    await vi.advanceTimersByTimeAsync(0);
    expect(ctx.sources).toHaveLength(8);
    expect(ctx.sources.slice(0, 3).every((source) => source.disconnected)).toBe(true);
    expect(ctx.sources.slice(3).every((source) => !source.disconnected)).toBe(true);
    expect(audio.getTransientResourceCounts().voices).toBe(5);
    vi.advanceTimersByTime(950);
    expect(ctx.sources[7].disconnected).toBe(false);
    vi.advanceTimersByTime(1_650);
    expect(audio.getTransientResourceCounts().voices).toBe(0);
    expect(ctx.sources[7].disconnected).toBe(true);
  });

  it('cancels pending audio without ever playing the reveal chime', () => {
    const audio = new GameAudio();
    const cue = audio.startForgeRefill({ durationMs: 2_000, delayMs: 600 });
    const ctx = FakeAudioContext.instances[0];
    cue.cancel();
    cue.reveal();
    cue.complete();
    vi.advanceTimersByTime(4_000);
    expect(ctx.sources).toHaveLength(3);
    expect(ctx.sources.every((source) => source.disconnected)).toBe(true);
    for (const source of ctx.sources) expect(source.stop).toHaveBeenLastCalledWith();
    expect(audio.getTransientResourceCounts().voices).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('completes without adding a late cue if the Artifact never revealed', () => {
    const audio = new GameAudio();
    const cue = audio.startForgeRefill({ durationMs: 2_000 });
    const ctx = FakeAudioContext.instances[0];
    cue.complete();
    cue.reveal();
    expect(ctx.sources).toHaveLength(3);
    expect(ctx.sources.every((source) => source.disconnected)).toBe(true);
    expect(audio.getTransientResourceCounts().voices).toBe(0);
  });

  it('silences an active refill on mute and does not revive it after unmuting', () => {
    const audio = new GameAudio();
    const cue = audio.startForgeRefill({ durationMs: 2_000 });
    const ctx = FakeAudioContext.instances[0];
    audio.setMuted(true);
    expect(audio.getTransientResourceCounts().voices).toBe(0);
    audio.setMuted(false);
    cue.reveal();
    cue.complete();
    expect(ctx.sources).toHaveLength(3);
    audio.playForgeRefill();
    expect(audio.getTransientResourceCounts().voices).toBe(4);
    audio.toggleMute();
    expect(audio.getTransientResourceCounts().voices).toBe(0);
  });

  it('allocates no audio while muted', () => {
    const audio = new GameAudio();
    audio.setMuted(true);
    audio.prepareForgeRefillAudio();
    const cue = audio.startForgeRefill({ durationMs: 420 });
    cue.reveal();
    cue.complete();
    cue.cancel();
    audio.playForgeRefill();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it('limits a simultaneous Forge refill to three swells and one original card-deal cue', async () => {
    const audio = new GameAudio();
    const cues = Array.from({ length: 12 }, () => audio.startForgeRefill({ durationMs: 2_000 }));
    const ctx = FakeAudioContext.instances[0];
    expect(ctx.sources).toHaveLength(9);
    await vi.advanceTimersByTimeAsync(0);
    ctx.currentTime = 11.1;
    for (const cue of cues) cue.reveal();
    await vi.advanceTimersByTimeAsync(0);
    expect(ctx.sources).toHaveLength(14);
    expect(audio.getTransientResourceCounts().voices).toBe(14);
    ctx.currentTime = 12;
    for (const cue of cues) cue.complete();
    await vi.advanceTimersByTimeAsync(0);
    expect(ctx.sources).toHaveLength(14);
    expect(ctx.sources.filter(source => source.buffer === ctx.decodedBuffer)).toHaveLength(1);
    expect(audio.getTransientResourceCounts().voices).toBe(5);
  });

  it.each(['mute', 'reset', 'expired'] as const)('does not revive a reveal asset when %s happens during decode', async (interruption) => {
    const audio = new GameAudio();
    const cue = audio.startForgeRefill({ durationMs: 2_000 });
    const ctx = FakeAudioContext.instances[0];
    let finishDecode!: (buffer: typeof ctx.decodedBuffer) => void;
    ctx.decodeAudioData.mockImplementationOnce(() => new Promise(resolve => { finishDecode = resolve; }));
    await vi.advanceTimersByTimeAsync(0);
    expect(ctx.decodeAudioData).toHaveBeenCalledOnce();
    ctx.currentTime = 11.1;
    cue.reveal();
    expect(ctx.sources).toHaveLength(7);

    if (interruption === 'mute') {
      audio.setMuted(true);
      audio.setMuted(false);
    } else if (interruption === 'reset') audio.resetTransientAudio();
    else {
      cue.complete();
      vi.advanceTimersByTime(2_600);
    }

    finishDecode(ctx.decodedBuffer);
    await vi.advanceTimersByTimeAsync(0);
    expect(ctx.sources).toHaveLength(7);
    expect(ctx.sources.every(source => source.disconnected)).toBe(true);
    expect(audio.getTransientResourceCounts().voices).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('releases unfinished cues and prevents reveal after a presentation reset', () => {
    const audio = new GameAudio();
    const cue = audio.startForgeRefill({ durationMs: 420 });
    const ctx = FakeAudioContext.instances[0];
    audio.resetTransientAudio();
    cue.reveal();
    cue.complete();
    expect(ctx.sources).toHaveLength(3);
    expect(audio.getTransientResourceCounts().voices).toBe(0);
    audio.startForgeRefill({ durationMs: 420 });
    vi.advanceTimersByTime(1_420);
    expect(audio.getTransientResourceCounts().voices).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
