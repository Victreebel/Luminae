import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COSMIC_EVENT_SOUND_PROFILES, createCosmicEventAudio, type CosmicEventEffectProfile } from '../cosmicEventAudio';
import { CIVILIZATION_EVENT_CARD_DEFINITIONS } from '@workspace/game-types';

const preferences = vi.hoisted(() => ({ muted: false }));
vi.mock('@/lib/audio', () => ({ gameAudio: { isMuted: () => preferences.muted } }));

class FakeParam {
  value = 0;
  values: number[] = [];
  setValueAtTime(value: number) { this.values.push(value); }
  linearRampToValueAtTime(value: number) { this.values.push(value); }
  exponentialRampToValueAtTime(value: number) { this.values.push(value); }
}
class FakeNode {
  disconnected = false;
  connect() { return this; }
  disconnect() { this.disconnected = true; }
}
class FakeOscillator extends FakeNode {
  frequency = new FakeParam();
  type = 'sine';
  stopped = false;
  scheduledStart = 0;
  start(time: number) { this.scheduledStart = time; }
  stop(time?: number) { if (time === undefined) this.stopped = true; }
}
class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakeFilter extends FakeNode {
  type = 'lowpass';
  frequency = new FakeParam();
  Q = new FakeParam();
}
class FakeContext {
  static instances: FakeContext[] = [];
  currentTime = 0;
  state = 'running';
  destination = new FakeNode();
  oscillators: FakeOscillator[] = [];
  gains: FakeGain[] = [];
  filters: FakeFilter[] = [];
  constructor() { FakeContext.instances.push(this); }
  createOscillator() { const node = new FakeOscillator(); this.oscillators.push(node); return node; }
  createGain() { const node = new FakeGain(); this.gains.push(node); return node; }
  createBiquadFilter() { const node = new FakeFilter(); this.filters.push(node); return node; }
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
}

describe('cosmic Event sound lifecycle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    preferences.muted = false;
    FakeContext.instances = [];
    vi.stubGlobal('AudioContext', FakeContext);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });

  it('gives each Event a different audible pitch, rhythm and voice profile', () => {
    const signatures = new Set<string>();
    for (const profile of Object.keys(COSMIC_EVENT_SOUND_PROFILES) as CosmicEventEffectProfile[]) {
      const sound = createCosmicEventAudio(profile);
      sound.play('effect');
      const context = FakeContext.instances.at(-1)!;
      signatures.add(JSON.stringify(context.oscillators.map((voice) => [voice.type, voice.frequency.values, voice.scheduledStart])));
      expect(context.oscillators.length).toBe(11);
      sound.dispose();
      expect(context.state).toBe('closed');
    }
    expect(signatures.size).toBe(Object.keys(CIVILIZATION_EVENT_CARD_DEFINITIONS).length);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels even future notes on hide and releases every node on disposal', () => {
    const sound = createCosmicEventAudio('entropy_storm');
    sound.play('effect');
    const context = FakeContext.instances[0];
    expect(context.oscillators.some((voice) => voice.scheduledStart > 2)).toBe(true);
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(context.oscillators.every((voice) => voice.stopped && voice.disconnected)).toBe(true);
    expect(context.gains.every((node) => node.disconnected)).toBe(true);
    expect(context.filters.every((node) => node.disconnected)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    sound.dispose();
    sound.play('activation');
    expect(FakeContext.instances).toHaveLength(1);
    expect(context.state).toBe('closed');
  });

  it('keeps adverse Events low through every beat, including shared arrival and resolution cues', () => {
    const adverseProfiles: CosmicEventEffectProfile[] = [
      'containment_cascade', 'affinity_inversion', 'entropy_storm',
      'system_shock', 'fracture_wave', 'synchronization_shear',
    ];
    for (const profile of adverseProfiles) {
      for (const beat of ['tremble', 'lift', 'activation', 'effect', 'receipt'] as const) {
        const sound = createCosmicEventAudio(profile);
        sound.play(beat);
        const context = FakeContext.instances.at(-1)!;
        const pitches = context.oscillators.flatMap(voice => voice.frequency.values);
        expect(pitches.length).toBeGreaterThan(0);
        expect(Math.max(...pitches)).toBeLessThan(180);
        expect(context.filters[0].type).toBe('lowpass');
        expect(context.filters[0].frequency.value).toBeLessThanOrEqual(340);
        sound.dispose();
      }
    }
    const bloom = createCosmicEventAudio('affinity_bloom');
    bloom.play('effect');
    const context = FakeContext.instances.at(-1)!;
    expect(Math.max(...context.oscillators.flatMap(voice => voice.frequency.values))).toBeGreaterThan(1000);
    expect(context.filters[0].frequency.value).toBeGreaterThan(2000);
    bloom.dispose();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('obeys mute and cleans a naturally completed cue', () => {
    const sound = createCosmicEventAudio('affinity_bloom');
    preferences.muted = true;
    sound.play('effect');
    expect(FakeContext.instances).toHaveLength(0);
    preferences.muted = false;
    sound.play('activation');
    const context = FakeContext.instances[0];
    vi.advanceTimersByTime(2000);
    expect(context.oscillators.every((voice) => voice.stopped && voice.disconnected)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    sound.dispose();
  });

  it('keeps the countdown reminder short and low and cancels it on dismissal', () => {
    const sound = createCosmicEventAudio('system_shock');
    sound.play('forecast');
    const context = FakeContext.instances[0];
    expect(context.oscillators).toHaveLength(2);
    expect(Math.max(...context.oscillators.flatMap(voice => voice.frequency.values))).toBeLessThan(100);
    expect(Math.max(...context.oscillators.map(voice => voice.scheduledStart))).toBeLessThan(0.3);
    sound.dispose();
    expect(context.oscillators.every((voice) => voice.stopped && voice.disconnected)).toBe(true);
    expect(context.state).toBe('closed');
    expect(vi.getTimerCount()).toBe(0);
  });
});
