import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GameAudio,
  LUMINARY_SWEEP_IN_BEATS_MS,
  getImpactExtinctionShockwaveSourceOffset,
  getSeedBeyondSeasonsCueTiming,
} from '../audio';

class FakeAudioParam {
  value = 1;
  automation: Array<{ kind: string; value: number; time: number }> = [];
  cancelScheduledValues() {}
  exponentialRampToValueAtTime(value: number, time = 0) {
    this.value = value;
    this.automation.push({ kind: 'exponential', value, time });
  }
  linearRampToValueAtTime(value: number, time = 0) {
    this.value = value;
    this.automation.push({ kind: 'linear', value, time });
  }
  setTargetAtTime(value: number, time = 0) {
    this.value = value;
    this.automation.push({ kind: 'target', value, time });
  }
  setValueAtTime(value: number, time = 0) {
    this.value = value;
    this.automation.push({ kind: 'set', value, time });
  }
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

class FakeConvolver extends FakeAudioNode {
  buffer: unknown = null;
}

class FakeStereoPanner extends FakeAudioNode {
  pan = new FakeAudioParam();
}

class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  currentTime = 0;
  destination = new FakeAudioNode();
  sampleRate = 10;
  state = 'running';
  stereoPanners: FakeStereoPanner[] = [];

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createBiquadFilter() { return new FakeFilter(); }
  createBuffer(_channels: number, length: number) {
    return { getChannelData: () => new Float32Array(length) };
  }
  createBufferSource() { return new FakeScheduledSource(); }
  createConvolver() { return new FakeConvolver(); }
  createDynamicsCompressor() { return new FakeCompressor(); }
  createGain() { return new FakeGain(); }
  createOscillator() { return new FakeOscillator(); }
  createStereoPanner() {
    const panner = new FakeStereoPanner();
    this.stereoPanners.push(panner);
    return panner;
  }
  resume() { return Promise.resolve(); }
}

describe('GameAudio transient resource lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeAudioContext.instances = [];
    localStorage.removeItem('luminae_muted');
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

  it('keeps phase-locked effect tails alive when the source sting stops', () => {
    const audio = new GameAudio();

    audio.playLuminaryEffectBeat('forgeReset', 'resolve', '#f97316', 'lum_forge');
    expect(audio.getTransientResourceCounts().activationBuses).toBe(0);
    expect(audio.getTransientResourceCounts().buses).toBe(1);

    audio.stopActivationSting();
    vi.advanceTimersByTime(120);
    expect(audio.getTransientResourceCounts().activationBuses).toBe(0);
    expect(audio.getTransientResourceCounts().buses).toBe(1);

    vi.advanceTimersByTime(2_680);
    expect(audio.getTransientResourceCounts().buses).toBe(0);
  });

  it('supports every audible phase without persistent buses', () => {
    const audio = new GameAudio();

    audio.playLuminaryEffectBeat('scry', 'target', '#60a5fa');
    audio.playLuminaryEffectBeat('scry', 'resolve', '#60a5fa');
    audio.playLuminaryEffectBeat('scry', 'aftermath', '#60a5fa');
    expect(audio.getTransientResourceCounts().activationBuses).toBe(0);
    expect(audio.getTransientResourceCounts().buses).toBe(3);

    vi.advanceTimersByTime(2_800);
    expect(audio.getTransientResourceCounts().buses).toBe(0);
  });

  it('keeps identity signatures inside the same bounded phase bus', () => {
    const audio = new GameAudio();

    audio.playLuminaryEffectBeat('scry', 'resolve', '#60a5fa', 'lum_tide');
    expect(audio.getTransientResourceCounts().buses).toBe(1);

    vi.advanceTimersByTime(2_800);
    expect(audio.getTransientResourceCounts().buses).toBe(0);
  });

  it('bounds every bespoke Luminary action sound', () => {
    const audio = new GameAudio();

    audio.playImpactExtinctionTremor();
    audio.playImpactExtinctionShockwave();
    audio.playSeedBeyondSeasonsCue(897);
    audio.playAvatarSeedPlant(0);
    audio.playRecurrenceDeparture(0);
    audio.playRecurrenceArchiveImpact(1);
    audio.playAssimilationDissolve();
    audio.playEarlyBloomGrowth();
    audio.playVictoryRequirementShift(1);
    audio.playOblivionThresholdShift(8);
    expect(audio.getTransientResourceCounts().buses).toBe(10);

    vi.advanceTimersByTime(4_450);
    expect(audio.getTransientResourceCounts().buses).toBe(0);
  });

  it('replaces, mutes, and bounds the Antimatter cinematic score', () => {
    const audio = new GameAudio();

    expect(audio.playAntimatterBlueprintCinematic()).toBe(true);
    expect(audio.getTransientResourceCounts().antimatterBuses).toBe(1);

    expect(audio.playAntimatterBlueprintCinematic()).toBe(true);
    expect(audio.getTransientResourceCounts().antimatterBuses).toBe(1);

    audio.setMuted(true);
    expect(audio.getTransientResourceCounts().antimatterBuses).toBe(0);

    audio.setMuted(false);
    expect(audio.playAntimatterBlueprintCinematic({ abridged: true })).toBe(true);
    expect(audio.getTransientResourceCounts().antimatterBuses).toBe(1);
    vi.advanceTimersByTime(3_100);
    expect(audio.getTransientResourceCounts().antimatterBuses).toBe(0);
  });

  it('bounds the Antimatter detonation cue to one transient bus', () => {
    const audio = new GameAudio();

    expect(audio.playAntimatterDetonation()).toBe(true);
    expect(audio.getTransientResourceCounts().buses).toBe(1);

    vi.advanceTimersByTime(4_400);
    expect(audio.getTransientResourceCounts().buses).toBe(0);
  });

  it('aligns the authored Impact Extinction transient with the paced shockwave', () => {
    expect(getImpactExtinctionShockwaveSourceOffset(550)).toBeCloseTo(2.09, 5);
    expect(getImpactExtinctionShockwaveSourceOffset(137.5)).toBeCloseTo(2.5025, 5);
    expect(getImpactExtinctionShockwaveSourceOffset(3_000)).toBe(0);
  });

  it('aligns the procedural Avatar Seeds transient with normal and reduced motion', () => {
    expect(getSeedBeyondSeasonsCueTiming(897)).toEqual({
      startDelaySeconds: 0.537,
      sourceOffsetSeconds: 0,
    });
    const reducedMotionTiming = getSeedBeyondSeasonsCueTiming(260);
    expect(reducedMotionTiming.startDelaySeconds).toBe(0);
    expect(reducedMotionTiming.sourceOffsetSeconds).toBeCloseTo(0.1, 5);
  });

  it('lets the authored Forgotten Hour cue outlive activation cleanup', () => {
    const audio = new GameAudio();

    audio.playForgottenHour();
    expect(audio.getTransientResourceCounts().activationBuses).toBe(0);
    expect(audio.getTransientResourceCounts().buses).toBe(1);

    audio.stopActivationSting();
    vi.advanceTimersByTime(120);
    expect(audio.getTransientResourceCounts().buses).toBe(1);

    vi.advanceTimersByTime(5_880);
    expect(audio.getTransientResourceCounts().buses).toBe(0);
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
      antimatterBuses: 0,
    });
  });

  it('plays First Resonance through the bounded arrival bus', () => {
    const audio = new GameAudio();

    audio.playArrivalCutscene('radiant', 'first_resonance');
    expect(audio.getTransientResourceCounts().arrivalBuses).toBe(1);
    expect(audio.getTransientResourceCounts().voices).toBeGreaterThan(0);

    audio.stopArrivalCutscene();
    vi.advanceTimersByTime(320);
    expect(audio.getTransientResourceCounts().arrivalBuses).toBe(0);

    audio.resetTransientAudio();
    expect(audio.getTransientResourceCounts().voices).toBe(0);
  });

  it('moves the First Resonance sweep from screen-left to center at reveal', () => {
    const audio = new GameAudio();

    audio.playArrivalCutscene('radiant', 'first_resonance');

    const context = FakeAudioContext.instances[0];
    expect(context?.stereoPanners).toHaveLength(1);
    const panAutomation = context.stereoPanners[0].pan.automation;
    expect(panAutomation[0]).toEqual({
      kind: 'set',
      value: -0.78,
      time: LUMINARY_SWEEP_IN_BEATS_MS.start / 1000,
    });
    expect(panAutomation.at(-1)).toMatchObject({
      kind: 'linear',
      value: 0,
    });
    expect(panAutomation.at(-1)?.time).toBeCloseTo(
      LUMINARY_SWEEP_IN_BEATS_MS.arrive / 1000,
      5,
    );
  });

  it('deduplicates and bounds tutorial presentation cues', () => {
    const audio = new GameAudio();

    audio.playTutorialCue('interface-reveal');
    audio.playTutorialCue('interface-reveal');
    expect(audio.getTransientResourceCounts().buses).toBe(1);

    audio.playTutorialCue('affinity-reveal', 'verdance');
    audio.playTutorialAffinityReturn(['flare', 'continuum', 'radiance']);
    audio.playTutorialCue('well-infusion');
    expect(audio.getTransientResourceCounts().buses).toBe(4);

    vi.advanceTimersByTime(3_400);
    expect(audio.getTransientResourceCounts().buses).toBe(0);
  });
});
