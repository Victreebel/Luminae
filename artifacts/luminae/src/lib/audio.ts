// ─── Luminae Audio Engine ────────────────────────────────────────────────────
// Blend of cosmic (warm, ethereal) + satisfying UI (snappy pops, tings).
// Each interaction has a distinct sonic character:
//   affinitySelected — Affinity-specific ting + tactile click
//   artifactForged   — bass thud + chord + sparkle arpeggio
//   artifactReserved — mysterious rising swoosh + soft pad
//   turnStart      — cosmic bell (metallic, long decay)
//   win            — epic bass boom + triumphant arpeggio
// Ambient music layers run separately on masterMusicGain.

import {
  DEFAULT_VICTORY_REQUIREMENT,
  type AffinityKey,
  type LuminaryArrivalSoundVariant,
} from '@workspace/game-types';
import type { AnimationArchetype } from '@/lib/luminaryAnimationConfig';
import type { TutorialSoundCue } from '@/lib/tutorialAudio';
import { ANTIMATTER_CINEMATIC_TIMING } from '@/lib/antimatterCinematicTimeline';
import { ANTIMATTER_DETONATION_TIMING } from '@/lib/antimatterDetonationTimeline';

// Maps each Luminary's arrivalColor hex → its nearest AffinityKey affinity.
// Mirrors the ARRIVAL_COLOR_TO_AFFINITY table in gameEngine.ts.
const FANFARE_COLOR_MAP: Record<string, AffinityKey> = {
  '#ff5a3c': 'flare',
  '#ff8a6a': 'flare',
  '#f43f5e': 'flare',
  '#ef4444': 'flare',
  '#f97316': 'flare',
  '#60a5fa': 'continuum',
  '#38bdf8': 'continuum',
  '#3d6bff': 'continuum',
  '#7090ff': 'continuum',
  '#2563eb': 'continuum',
  '#2ecc71': 'verdance',
  '#5be197': 'verdance',
  '#4ade80': 'verdance',
  '#86efac': 'verdance',
  '#0f172a': 'abyss',
  '#4c1d95': 'abyss',
  '#7b1fa2': 'abyss',
  '#a832d4': 'abyss',
  '#cc70f0': 'abyss',
  '#fef9c3': 'radiance',
  '#dfc878': 'radiance',
  '#f5e8b8': 'radiance',
  '#cbd5e1': 'radiance',
  '#a8b8e8': 'radiance',
  '#fbbf24': 'singularity',
  '#e8e4ff': 'singularity',
  '#c8c0ff': 'singularity',
  '#ffffff': 'radiance',
};

export type LuminaryEffectSoundBeat = 'target' | 'resolve' | 'aftermath';

export type ForgeRefillSound = {
  reveal(): void;
  complete(): void;
  cancel(): void;
};

// Card draw / flip — pre-built MP3 asset.
const CARD_DRAW_MP3 = new URL('../assets/audio/Effects/Card draw.mp3', import.meta.url).href;

// Impact Extinction — authored riser whose measured primary transient lands at
// 2.64s. Playback begins from a dynamic offset so that transient stays locked
// to the visual shockwave at every presentation speed.
const IMPACT_EXTINCTION_SHOCKWAVE_MP3 = new URL(
  '../assets/audio/Effects/Impact Extinction Shockwave.mp3',
  import.meta.url,
).href;
const IMPACT_EXTINCTION_SHOCKWAVE_PEAK_SECONDS = 2.64;

// Avatar Seeds — the procedural sowing gesture anticipates the first mold by
// this amount so its root impact stays frame-locked at every presentation speed.
const SEED_BEYOND_SEASONS_PEAK_SECONDS = 0.36;

const ANTIMATTER_CINEMATIC_SFX = {
  deepImpact: new URL(
    '../assets/audio/Blueprints/Antimatter/sources/deep-impact-665093.mp3',
    import.meta.url,
  ).href,
  hydraulics: new URL(
    '../assets/audio/Blueprints/Antimatter/sources/hydraulics-212941.mp3',
    import.meta.url,
  ).href,
  metalDoorSlam: new URL(
    '../assets/audio/Blueprints/Antimatter/sources/metal-door-slam-48980.mp3',
    import.meta.url,
  ).href,
  metalImpact: new URL(
    '../assets/audio/Blueprints/Antimatter/sources/metal-impact-620077.mp3',
    import.meta.url,
  ).href,
  pressureRelease: new URL(
    '../assets/audio/Blueprints/Antimatter/sources/pressure-release-457294.mp3',
    import.meta.url,
  ).href,
  ratchet: new URL(
    '../assets/audio/Blueprints/Antimatter/sources/ratchet-591529.mp3',
    import.meta.url,
  ).href,
} as const;

export function getImpactExtinctionShockwaveSourceOffset(impactDelayMs: number): number {
  return Math.max(
    0,
    IMPACT_EXTINCTION_SHOCKWAVE_PEAK_SECONDS - Math.max(0, impactDelayMs) / 1000,
  );
}

export function getSeedBeyondSeasonsCueTiming(impactDelayMs: number) {
  const impactDelaySeconds = Math.max(0, impactDelayMs) / 1000;
  return {
    startDelaySeconds: Math.max(0, impactDelaySeconds - SEED_BEYOND_SEASONS_PEAK_SECONDS),
    sourceOffsetSeconds: Math.max(0, SEED_BEYOND_SEASONS_PEAK_SECONDS - impactDelaySeconds),
  };
}

// Forge stamp impact — authored metal hit used at the artifact-sealing beat.
const FORGE_STAMP_HIT_MP3 = new URL('../assets/audio/Effects/Forge Stamp Hit.mp3', import.meta.url).href;

// First-party deterministic renders from scripts/generate-luminary-glass-audio.mjs.
// These contain no recordings, samples, or third-party source material.
const LUMINARY_GLASS_SFX = {
  firstCrack: new URL(
    '../assets/audio/generated/luminary/luminary-first-crack-v2.wav',
    import.meta.url,
  ).href,
  branchingFracture: new URL(
    '../assets/audio/generated/luminary/luminary-branching-fracture-v2.wav',
    import.meta.url,
  ).href,
  fullShatter: new URL(
    '../assets/audio/generated/luminary/luminary-full-shatter-v2.wav',
    import.meta.url,
  ).href,
} as const;

export const ARRIVAL_CUTSCENE_BEATS_MS = {
  pan: 0,
  focus: 580,
  intro: 1160,
  pressure: 1400,
  firstCrack: 1850,
  leak: 2420,
  secondCrack: 3100,
  cracking: 3520,
  shatter: 4560,
  flash: 5400,
  reveal: 6350,
} as const;

export const LUMINARY_SWEEP_IN_BEATS_MS = {
  start: ARRIVAL_CUTSCENE_BEATS_MS.shatter + 180,
  arrive: ARRIVAL_CUTSCENE_BEATS_MS.reveal,
  settle: ARRIVAL_CUTSCENE_BEATS_MS.reveal + 620,
} as const;

// Pentatonic-adjacent frequencies per Affinity; each has its own voice.
const AFFINITY_FREQUENCIES: Record<AffinityKey, number> = {
  flare: 659.25, // E5 — bright, fiery
  continuum: 523.25, // C5 — clear, ordered
  verdance: 587.33, // D5 — natural, growing
  abyss: 415.3, // Ab4 — dark, deep
  radiance: 783.99, // G5 — luminous, pure
  singularity: 880.0, // A5 — wild, special
};

export class GameAudio {
  private ctx: AudioContext | null = null;
  private muted = false;
  private decodedAudio = new Map<string, Promise<AudioBuffer>>();
  private reversedAudioSlices = new Map<string, AudioBuffer>();
  private transientEpoch = 0;
  private tutorialCueLastPlayed = new Map<string, number>();
  private transientVoices = new Map<AudioScheduledSourceNode, AudioNode[]>();
  private forgeRefillSounds = new Map<GainNode, {
    kind: 'swell' | 'settle';
    sources: AudioScheduledSourceNode[];
    cleanupTimer: ReturnType<typeof setTimeout>;
  }>();
  private lastForgeRefillChimeAt = Number.NEGATIVE_INFINITY;
  private transientBuses = new Map<AudioNode, {
    nodes: AudioNode[];
    cleanupTimer: ReturnType<typeof setTimeout>;
  }>();
  private arrivalBuses = new Map<GainNode, {
    compressor: DynamicsCompressorNode;
    cleanupTimer: ReturnType<typeof setTimeout> | null;
  }>();
  private activationBuses = new Map<GainNode, ReturnType<typeof setTimeout> | null>();
  private antimatterCinematicBus: {
    master: GainNode;
    nodes: AudioNode[];
    cleanupTimer: ReturnType<typeof setTimeout>;
  } | null = null;

  // ── Music state ─────────────────────────────────────────────────────────
  private musicStarted = false;
  private masterMusicGain: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private endgameOscillators: OscillatorNode[] = [];
  private endgameGain: GainNode | null = null;
  private endgameFilter: BiquadFilterNode | null = null;
  private lumiiScenarioGain: GainNode | null = null;
  private lumiiScenarioFilter: BiquadFilterNode | null = null;
  private lumiiScenarioOscillators: OscillatorNode[] = [];
  private lumiiScenarioActive = false;
  private noiseSource: AudioBufferSourceNode | null = null;
  private shimmerTimer: ReturnType<typeof setTimeout> | null = null;
  private musicNodes = new Set<AudioNode>();
  private endgameIntensity = 0;
  private musicDuckUntil = 0;
  private readonly MUSIC_GAIN = 0.32;

  constructor() {
    this.muted = localStorage.getItem('luminae_muted') === 'true';
  }

  private disconnect(node: AudioNode | null | undefined) {
    if (!node) return;
    try {
      node.disconnect();
    } catch {}
  }

  private rememberMusic(...nodes: AudioNode[]) {
    for (const node of nodes) this.musicNodes.add(node);
  }

  private trackVoice(source: AudioScheduledSourceNode, nodes: AudioNode[] = []) {
    this.transientVoices.set(source, nodes);
    const cleanup = () => {
      this.disconnect(source);
      for (const node of nodes) this.disconnect(node);
      this.transientVoices.delete(source);
    };
    source.addEventListener('ended', cleanup, { once: true });
  }

  private disposeArrivalBus(masterGain: GainNode) {
    const bus = this.arrivalBuses.get(masterGain);
    if (!bus) return;
    if (bus.cleanupTimer) clearTimeout(bus.cleanupTimer);
    this.disconnect(bus.compressor);
    this.disconnect(masterGain);
    this.arrivalBuses.delete(masterGain);
  }

  private scheduleArrivalBusCleanup(masterGain: GainNode, delayMs: number) {
    const bus = this.arrivalBuses.get(masterGain);
    if (!bus) return;
    if (bus.cleanupTimer) clearTimeout(bus.cleanupTimer);
    bus.cleanupTimer = setTimeout(() => this.disposeArrivalBus(masterGain), delayMs);
  }

  private registerActivationBus(gain: GainNode, lifetimeMs = 12_000) {
    const existing = this.activationBuses.get(gain);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => this.disposeActivationBus(gain), lifetimeMs);
    this.activationBuses.set(gain, timer);
  }

  private disposeActivationBus(gain: GainNode) {
    const timer = this.activationBuses.get(gain);
    if (timer) clearTimeout(timer);
    this.disconnect(gain);
    this.activationBuses.delete(gain);
  }

  private registerTransientBus(nodes: AudioNode[], lifetimeMs: number) {
    const root = nodes[0];
    if (!root) return;
    const cleanupTimer = setTimeout(() => this.disposeTransientBus(root), lifetimeMs);
    this.transientBuses.set(root, { nodes, cleanupTimer });
  }

  private disposeTransientBus(root: AudioNode) {
    const bus = this.transientBuses.get(root);
    if (!bus) return;
    clearTimeout(bus.cleanupTimer);
    for (const node of bus.nodes) this.disconnect(node);
    this.transientBuses.delete(root);
  }

  /** Dispose one-shot presentation audio without interrupting ambient music. */
  resetTransientAudio() {
    this.transientEpoch += 1;
    this.stopForgeRefillSounds();
    this.lastForgeRefillChimeAt = Number.NEGATIVE_INFINITY;
    this.tutorialCueLastPlayed.clear();
    this.disposeAntimatterBlueprintCinematic(false);
    this.stopArrivalCutscene();
    this.stopActivationSting();

    for (const [source, nodes] of this.transientVoices) {
      try {
        source.stop();
      } catch {}
      this.disconnect(source);
      for (const node of nodes) this.disconnect(node);
    }
    this.transientVoices.clear();

    for (const masterGain of [...this.arrivalBuses.keys()]) {
      this.disposeArrivalBus(masterGain);
    }
    for (const gain of [...this.activationBuses.keys()]) {
      this.disposeActivationBus(gain);
    }
    for (const root of [...this.transientBuses.keys()]) {
      this.disposeTransientBus(root);
    }
  }

  getTransientResourceCounts() {
    return {
      voices: this.transientVoices.size,
      buses: this.transientBuses.size,
      arrivalBuses: this.arrivalBuses.size,
      activationBuses: this.activationBuses.size,
      antimatterBuses: this.antimatterCinematicBus ? 1 : 0,
    };
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('luminae_muted', String(this.muted));
    if (this.muted) this.disposeAntimatterBlueprintCinematic(false);
    if (this.muted) this.stopForgeRefillSounds();
    if (this.masterMusicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterMusicGain.gain.cancelScheduledValues(now);
      this.masterMusicGain.gain.setTargetAtTime(this.muted ? 0 : this.getMusicGain(), now, 0.4);
      this.musicDuckUntil = 0;
    }
    return this.muted;
  }

  setMuted(value: boolean) {
    this.muted = value;
    localStorage.setItem('luminae_muted', String(this.muted));
    if (this.muted) this.disposeAntimatterBlueprintCinematic(false);
    if (this.muted) this.stopForgeRefillSounds();
    if (this.masterMusicGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterMusicGain.gain.cancelScheduledValues(now);
      this.masterMusicGain.gain.setTargetAtTime(this.muted ? 0 : this.getMusicGain(), now, 0.4);
      this.musicDuckUntil = 0;
    }
  }

  private getMusicGain() {
    return this.MUSIC_GAIN * (1 + this.endgameIntensity * 0.16);
  }

  private initCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  /**
   * Briefly clears space in the ambient mix for a gameplay cue. The automation
   * runs on the music bus only, so SFX retain their authored dynamics.
   */
  private duckMusic(
    depth = 0.45,
    holdSeconds = 0.55,
    attackSeconds = 0.06,
    releaseSeconds = 0.8,
    delaySeconds = 0,
  ) {
    if (!this.ctx || !this.masterMusicGain || this.muted) return;
    const start = this.ctx.currentTime + Math.max(0, delaySeconds);
    const downAt = start + Math.max(0.01, attackSeconds);
    const releaseAt = downAt + Math.max(0, holdSeconds);
    const restoredAt = releaseAt + Math.max(0.05, releaseSeconds);
    const musicGain = this.getMusicGain();
    const duckedGain = Math.max(0.001, musicGain * Math.max(0.04, Math.min(1, depth)));
    const gain = this.masterMusicGain.gain;

    try {
      gain.cancelAndHoldAtTime(start);
    } catch {
      gain.cancelScheduledValues(start);
      gain.setValueAtTime(Math.max(0.001, Math.min(musicGain, gain.value)), start);
    }
    gain.linearRampToValueAtTime(duckedGain, downAt);
    gain.setValueAtTime(duckedGain, releaseAt);
    gain.linearRampToValueAtTime(musicGain, restoredAt);
    this.musicDuckUntil = Math.max(this.musicDuckUntil, restoredAt);
  }

  private restoreMusic(releaseSeconds = 0.28) {
    if (!this.ctx || !this.masterMusicGain) return;
    const now = this.ctx.currentTime;
    const gain = this.masterMusicGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(this.muted ? 0 : this.getMusicGain(), now + releaseSeconds);
    this.musicDuckUntil = 0;
  }

  // ── Low-level helpers ───────────────────────────────────────────────────

  private osc(ctx: AudioContext, freq: number, type: OscillatorType, startTime: number, endTime: number, peakVol: number, attackTime = 0.005, dest?: AudioNode) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(peakVol, startTime + attackTime);
    g.gain.exponentialRampToValueAtTime(0.001, endTime);
    o.connect(g);
    g.connect(dest ?? ctx.destination);
    this.trackVoice(o, [g]);
    o.start(startTime);
    o.stop(endTime + 0.05);
    return { o, g };
  }

  private noiseBlip(ctx: AudioContext, startTime: number, duration: number, vol: number, freq: number, Q = 4, dest?: AudioNode) {
    const bufLen = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.frequency.value = freq;
    filt.Q.value = Q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, startTime);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest ?? ctx.destination);
    this.trackVoice(src, [filt, g]);
    src.start(startTime);
    src.stop(startTime + duration + 0.05);
    return src;
  }

  private noiseSweep(ctx: AudioContext, startTime: number, duration: number, vol: number, freqStart: number, freqEnd: number, dest?: AudioNode) {
    const bufLen = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filt = ctx.createBiquadFilter();
    filt.type = 'bandpass';
    filt.Q.value = 3;
    filt.frequency.setValueAtTime(freqStart, startTime);
    filt.frequency.exponentialRampToValueAtTime(freqEnd, startTime + duration);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    src.connect(filt);
    filt.connect(g);
    g.connect(dest ?? ctx.destination);
    this.trackVoice(src, [filt, g]);
    src.start(startTime);
    src.stop(startTime + duration + 0.05);
  }

  private staticInterference(ctx: AudioContext, startTime: number, duration: number, vol: number, dest?: AudioNode) {
    const bufLen = Math.ceil(ctx.sampleRate * duration);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufLen; i++) {
      const white = Math.random() * 2 - 1;
      const crackle = Math.random() < 0.0018 ? (Math.random() * 2 - 1) * 0.85 : 0;
      data[i] = Math.max(-1, Math.min(1, white * 0.72 + crackle));
    }

    const source = ctx.createBufferSource();
    source.buffer = buf;
    const highpass = ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 240;
    highpass.Q.value = 0.7;
    const lowpass = ctx.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = 7_400;
    lowpass.Q.value = 0.65;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(vol, startTime + 0.012);
    gain.gain.setValueAtTime(vol * 0.92, startTime + duration * 0.18);
    gain.gain.linearRampToValueAtTime(vol * 0.34, startTime + duration * 0.24);
    gain.gain.linearRampToValueAtTime(vol * 0.88, startTime + duration * 0.31);
    gain.gain.setValueAtTime(vol * 0.72, startTime + duration * 0.68);
    gain.gain.linearRampToValueAtTime(vol, startTime + duration * 0.76);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(dest ?? ctx.destination);
    this.trackVoice(source, [highpass, lowpass, gain]);
    source.start(startTime);
    source.stop(startTime + duration + 0.05);
  }

  /** A muted, low-register contact that makes a card feel seated in its mold. */
  private playMoldSettle(ctx: AudioContext, startTime: number, intensity = 1, dest?: AudioNode) {
    // The paired low tones preserve a physical metal-and-stone weight without
    // the abrasive high-frequency scrape in the previous sample.
    const contact = this.osc(ctx, 104, 'sine', startTime, startTime + 0.18, 0.058 * intensity, 0.006, dest);
    const overtone = this.osc(ctx, 208, 'triangle', startTime + 0.008, startTime + 0.15, 0.017 * intensity, 0.01, dest);
    const texture = this.noiseBlip(ctx, startTime, 0.045, 0.012 * intensity, 260, 3, dest);
    // A short delayed body note reads as the artifact settling into place.
    const body = this.osc(ctx, 78, 'sine', startTime + 0.055, startTime + 0.19, 0.028 * intensity, 0.005, dest);
    return [contact.o, overtone.o, texture, body.o];
  }

  /** Three-note Luminae identity: signal, ascent, illumination. */
  private playBrandMotif(
    ctx: AudioContext,
    startTime: number,
    intensity = 1,
    dest?: AudioNode,
  ) {
    const notes = [
      { frequency: 523.25, delay: 0, duration: 0.48, volume: 0.064 },
      { frequency: 783.99, delay: 0.13, duration: 0.58, volume: 0.056 },
      { frequency: 1318.51, delay: 0.31, duration: 0.78, volume: 0.05 },
    ];
    notes.forEach(({ frequency, delay, duration, volume }) => {
      const at = startTime + delay;
      this.osc(ctx, frequency, 'sine', at, at + duration, volume * intensity, 0.012, dest);
      this.osc(ctx, frequency * 0.5, 'triangle', at, at + duration * 0.72, volume * 0.28 * intensity, 0.01, dest);
    });
    this.osc(ctx, 261.63, 'sine', startTime, startTime + 0.92, 0.026 * intensity, 0.04, dest);
  }

  private getReversedAudioSlice(
    ctx: AudioContext,
    url: string,
    buffer: AudioBuffer,
    offset: number,
    duration: number,
  ) {
    const startFrame = Math.min(
      buffer.length - 1,
      Math.max(0, Math.floor(offset * buffer.sampleRate)),
    );
    const frameLength = Math.max(
      1,
      Math.min(
        buffer.length - startFrame,
        Math.ceil(duration * buffer.sampleRate),
      ),
    );
    const cacheKey = `${url}:${startFrame}:${frameLength}`;
    const cached = this.reversedAudioSlices.get(cacheKey);
    if (cached) return cached;

    const reversed = ctx.createBuffer(
      buffer.numberOfChannels,
      frameLength,
      buffer.sampleRate,
    );
    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const sourceData = buffer.getChannelData(channel);
      const targetData = reversed.getChannelData(channel);
      for (let frame = 0; frame < frameLength; frame += 1) {
        targetData[frame] = sourceData[startFrame + frameLength - frame - 1];
      }
    }
    this.reversedAudioSlices.set(cacheKey, reversed);
    return reversed;
  }

  private disposeAntimatterBlueprintCinematic(restoreAmbientMusic: boolean) {
    const bus = this.antimatterCinematicBus;
    if (!bus) return;
    clearTimeout(bus.cleanupTimer);
    for (const node of bus.nodes) this.disconnect(node);
    this.antimatterCinematicBus = null;
    if (restoreAmbientMusic) this.restoreMusic(0.32);
  }

  stopAntimatterBlueprintCinematic() {
    this.disposeAntimatterBlueprintCinematic(true);
  }

  /**
   * Eight-second authored score for the Antimatter Detonator manifestation.
   * Recorded metal and machinery cues share the Three.js timing source, so
   * replay can restart picture and sound on the same frame.
   */
  playAntimatterBlueprintCinematic(
    { abridged = false }: { abridged?: boolean } = {},
  ) {
    this.disposeAntimatterBlueprintCinematic(false);
    if (this.muted) return false;

    const nodes: AudioNode[] = [];
    try {
      const ctx = this.initCtx();
      const timing = ANTIMATTER_CINEMATIC_TIMING;
      const playbackDuration = abridged
        ? timing.duration - timing.reducedMotionStart
        : timing.duration;
      const start = ctx.currentTime + 0.035;

      const master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      const dryBus = ctx.createGain();
      const wetBus = ctx.createGain();
      const reverb = ctx.createConvolver();
      const assemblyBus = ctx.createGain();
      const manifestationBus = ctx.createGain();
      const musicBus = ctx.createGain();
      const musicFilter = ctx.createBiquadFilter();
      nodes.push(
        master,
        compressor,
        dryBus,
        wetBus,
        reverb,
        assemblyBus,
        manifestationBus,
        musicBus,
        musicFilter,
      );

      compressor.threshold.value = -22;
      compressor.knee.value = 12;
      compressor.ratio.value = 5.5;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.28;
      reverb.buffer = this.buildReverbIR(ctx, 2.8);
      dryBus.gain.value = 0.96;
      wetBus.gain.value = 0.16;
      musicBus.gain.value = 0.86;
      musicFilter.type = 'lowpass';
      musicFilter.Q.value = 0.7;
      musicFilter.frequency.setValueAtTime(240, start);
      musicFilter.frequency.linearRampToValueAtTime(520, start + timing.ignition.peaksAt);
      musicFilter.frequency.linearRampToValueAtTime(310, start + timing.duration);

      assemblyBus.connect(dryBus);
      assemblyBus.connect(reverb);
      manifestationBus.connect(dryBus);
      manifestationBus.connect(reverb);
      musicBus.connect(musicFilter);
      musicFilter.connect(dryBus);
      musicFilter.connect(reverb);
      reverb.connect(wetBus);
      dryBus.connect(master);
      wetBus.connect(master);
      master.connect(compressor);
      compressor.connect(ctx.destination);

      master.gain.setValueAtTime(0.0001, start);
      master.gain.linearRampToValueAtTime(0.68, start + 0.09);
      master.gain.setValueAtTime(0.68, start + playbackDuration - 0.38);
      master.gain.exponentialRampToValueAtTime(0.0001, start + playbackDuration + 0.28);

      const scheduleTone = ({
        at,
        duration,
        from,
        to = from,
        peak,
        type = 'sine',
        attack = 0.04,
        release = 0.24,
        destination = assemblyBus,
      }: {
        at: number;
        duration: number;
        from: number;
        to?: number;
        peak: number;
        type?: OscillatorType;
        attack?: number;
        release?: number;
        destination?: AudioNode;
      }) => {
        const beginsAt = start + at;
        const endsAt = beginsAt + duration;
        const attackEndsAt = beginsAt + Math.min(attack, duration * 0.45);
        const releaseStartsAt = Math.max(attackEndsAt, endsAt - release);
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(Math.max(1, from), beginsAt);
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), endsAt);
        gain.gain.setValueAtTime(0.0001, beginsAt);
        gain.gain.linearRampToValueAtTime(peak, attackEndsAt);
        gain.gain.setValueAtTime(peak * 0.78, releaseStartsAt);
        gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);
        oscillator.connect(gain);
        gain.connect(destination);
        this.trackVoice(oscillator, [gain]);
        oscillator.start(beginsAt);
        oscillator.stop(endsAt + 0.05);
      };

      const scheduleBassPulse = (
        at: number,
        intensity = 1,
        destination: AudioNode = musicBus,
      ) => {
        scheduleTone({
          at,
          duration: 0.52,
          from: 55,
          to: 33,
          peak: 0.14 * intensity,
          attack: 0.006,
          release: 0.46,
          destination,
        });
        scheduleTone({
          at: at + 0.008,
          duration: 0.19,
          from: 112,
          to: 56,
          peak: 0.043 * intensity,
          type: 'triangle',
          attack: 0.004,
          release: 0.16,
          destination,
        });
        this.noiseBlip(ctx, start + at, 0.065, 0.032 * intensity, 105, 1.1, destination);
      };

      const scheduleSample = ({
        url,
        at,
        duration,
        volume,
        offset = 0,
        rate = 1,
        attack = 0.004,
        release = 0.1,
        highpass,
        lowpass,
        pan = 0,
        reverse = false,
        destination = assemblyBus,
      }: {
        url: string;
        at: number;
        duration: number;
        volume: number;
        offset?: number;
        rate?: number;
        attack?: number;
        release?: number;
        highpass?: number;
        lowpass?: number;
        pan?: number;
        reverse?: boolean;
        destination?: AudioNode;
      }) => {
        const scheduledTime = start + at;
        void this.loadAudioAsset(url, ctx).then((buffer) => {
          if (this.muted || this.antimatterCinematicBus?.master !== master) return;

          const now = ctx.currentTime;
          const lateness = Math.max(0, now - scheduledTime);
          const playbackRate = Math.max(0.25, Math.min(2, rate));
          const baseSourceOffset = Math.min(
            buffer.duration - 0.01,
            Math.max(0, offset),
          );
          const requestedSourceDuration = Math.min(
            duration * playbackRate,
            Math.max(0.01, buffer.duration - baseSourceOffset),
          );
          const fullAudibleDuration = requestedSourceDuration / playbackRate;
          if (lateness >= fullAudibleDuration || lateness > 0.6) return;

          let playbackBuffer = buffer;
          let sourceOffset = baseSourceOffset + lateness * playbackRate;
          if (reverse) {
            playbackBuffer = this.getReversedAudioSlice(
              ctx,
              url,
              buffer,
              baseSourceOffset,
              requestedSourceDuration,
            );
            sourceOffset = Math.min(
              playbackBuffer.duration - 0.001,
              lateness * playbackRate,
            );
          }
          const sourceDuration = Math.max(
            0.001,
            Math.min(
              requestedSourceDuration - lateness * playbackRate,
              playbackBuffer.duration - sourceOffset,
            ),
          );
          const audibleDuration = sourceDuration / playbackRate;
          const startsAt = Math.max(now, scheduledTime);
          const attackEndsAt = startsAt + Math.min(attack, audibleDuration * 0.45);
          const releaseStartsAt = Math.max(
            attackEndsAt,
            startsAt + audibleDuration - Math.min(release, audibleDuration * 0.72),
          );

          const source = ctx.createBufferSource();
          const gain = ctx.createGain();
          const voiceNodes: AudioNode[] = [gain];
          source.buffer = playbackBuffer;
          source.playbackRate.setValueAtTime(playbackRate, startsAt);
          gain.gain.setValueAtTime(0.0001, startsAt);
          gain.gain.linearRampToValueAtTime(volume, attackEndsAt);
          gain.gain.setValueAtTime(volume, releaseStartsAt);
          gain.gain.exponentialRampToValueAtTime(0.0001, startsAt + audibleDuration);

          let tail: AudioNode = source;
          if (highpass != null) {
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = highpass;
            filter.Q.value = 0.7;
            tail.connect(filter);
            tail = filter;
            voiceNodes.push(filter);
          }
          if (lowpass != null) {
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = lowpass;
            filter.Q.value = 0.7;
            tail.connect(filter);
            tail = filter;
            voiceNodes.push(filter);
          }
          if (pan !== 0) {
            const panner = ctx.createStereoPanner();
            panner.pan.value = Math.max(-1, Math.min(1, pan));
            tail.connect(panner);
            tail = panner;
            voiceNodes.push(panner);
          }
          tail.connect(gain);
          gain.connect(destination);
          this.trackVoice(source, voiceNodes);
          source.start(startsAt, sourceOffset, sourceDuration);
        }).catch((error) => {
          console.warn('[Luminae] Antimatter sample failed', error);
        });
      };

      const registerCleanup = () => {
        this.duckMusic(0.16, Math.max(0.4, playbackDuration - 1.05), 0.08, 0.9);
        const cleanupTimer = setTimeout(() => {
          if (this.antimatterCinematicBus?.master === master) {
            this.disposeAntimatterBlueprintCinematic(true);
          }
        }, (playbackDuration + 1.4) * 1000);
        this.antimatterCinematicBus = { master, nodes, cleanupTimer };
        return true;
      };

      if (abridged) {
        scheduleSample({
          url: ANTIMATTER_CINEMATIC_SFX.deepImpact,
          at: 0,
          duration: playbackDuration,
          volume: 0.14,
          offset: 1.28,
          rate: 0.52,
          attack: 0.1,
          lowpass: 460,
          highpass: 28,
          release: 0.78,
          destination: manifestationBus,
        });
        [0.53, 1.27].forEach((at, index) => {
          scheduleSample({
            url: ANTIMATTER_CINEMATIC_SFX.metalDoorSlam,
            at,
            duration: Math.min(0.62, playbackDuration - at),
            volume: 0.25 + index * 0.04,
            rate: 0.36,
            lowpass: 230,
            highpass: 28,
            release: 0.48,
            destination: manifestationBus,
          });
          scheduleBassPulse(at, 0.7 + index * 0.08, manifestationBus);
        });
        return registerCleanup();
      }

      // A low procedural chord supplies the ominous score without an external
      // pad sample. Overlapping roots keep the long manifestation from feeling
      // looped while the shared bus still creates the implosion vacuum.
      [41.2, 61.74, 82.41].forEach((frequency, index) => {
        scheduleTone({
          at: 0.12 + index * 0.08,
          duration: 5.5 - index * 0.12,
          from: frequency,
          to: frequency * (index === 1 ? 1.018 : 0.992),
          peak: 0.032 - index * 0.004,
          type: index === 1 ? 'triangle' : 'sine',
          attack: 1.15,
          release: 1.05,
          destination: musicBus,
        });
      });
      [46.25, 69.3, 92.5].forEach((frequency, index) => {
        scheduleTone({
          at: 3.82 + index * 0.07,
          duration: Math.max(0.7, timing.phases.manifested - 3.82 - index * 0.08),
          from: frequency,
          to: frequency * 0.986,
          peak: 0.025 - index * 0.003,
          type: index === 2 ? 'triangle' : 'sine',
          attack: 0.92,
          release: 0.95,
          destination: musicBus,
        });
      });

      // Slowed structural recordings sit under the tonal pad so the score
      // retains physical scale without turning into machinery or a synth buzz.
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.deepImpact,
        at: 0,
        duration: timing.phases.manifested,
        volume: 0.24,
        offset: 0.18,
        rate: 0.32,
        attack: 1.05,
        release: 1.1,
        lowpass: 260,
        highpass: 24,
        destination: musicBus,
      });
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.metalDoorSlam,
        at: 0.1,
        duration: 4.1,
        volume: 0.1,
        offset: 0.06,
        rate: 0.25,
        attack: 0.8,
        release: 1.2,
        lowpass: 420,
        highpass: 38,
        pan: -0.22,
        destination: musicBus,
      });

      // Each source Artifact rides a different length of real hydraulic motion.
      const artifactCues = [
        timing.parts.ignitionKernel,
        timing.parts.magneticBottle,
        timing.parts.causalSparkCoil,
        timing.parts.horizonExtractor,
      ];
      const artifactPans = [-0.48, 0.24, 0.48, -0.2];
      const hydraulicOffsets = [0.28, 2.05, 4.38, 6.62];
      artifactCues.forEach(({ entersAt, locksAt }, index) => {
        scheduleSample({
          url: ANTIMATTER_CINEMATIC_SFX.hydraulics,
          at: entersAt,
          duration: Math.min(timing.assemblyAudio.entryStrokeDuration, locksAt - entersAt),
          volume: 0.115 + index * 0.008,
          offset: hydraulicOffsets[index],
          rate: 0.78 + index * 0.055,
          attack: 0.035,
          release: 0.16,
          highpass: 72,
          lowpass: 2_300 - index * 180,
          pan: artifactPans[index],
        });
      });

      // Each card-linked keystone now unfolds into a larger subsystem after
      // approach. These shared timing windows are also consumed by the Three.js
      // renderer, keeping every mechanical extension attached to visible motion.
      const deploymentCues = [
        {
          timing: timing.deployments.ignitionNetwork,
          strokeDuration: 0.34,
          offset: 1.12,
          rate: 0.62,
          volume: 0.105,
          pan: -0.42,
          lowpass: 1_500,
        },
        {
          timing: timing.deployments.magneticCage,
          strokeDuration: 0.32,
          offset: 3.16,
          rate: 0.6,
          volume: 0.11,
          pan: 0.16,
          lowpass: 1_400,
        },
        {
          timing: timing.deployments.causalCircumference,
          strokeDuration: 0.28,
          offset: 5.45,
          rate: 0.64,
          volume: 0.105,
          pan: 0.38,
          lowpass: 1_550,
        },
        {
          timing: timing.deployments.horizonMirror,
          strokeDuration: 0.26,
          offset: 7.45,
          rate: 0.58,
          volume: 0.11,
          pan: -0.34,
          lowpass: 1_250,
        },
        {
          timing: timing.deployments.horizonSpine,
          strokeDuration: 0.24,
          offset: 8.2,
          rate: 0.56,
          volume: 0.1,
          pan: 0,
          lowpass: 1_150,
        },
      ];
      deploymentCues.forEach(({ timing: deployment, strokeDuration, ...cue }, index) => {
        scheduleSample({
          url: ANTIMATTER_CINEMATIC_SFX.hydraulics,
          at: deployment.startsAt,
          duration: Math.min(strokeDuration, deployment.settlesAt - deployment.startsAt),
          attack: 0.025,
          release: 0.09,
          highpass: 58 + index * 6,
          ...cue,
        });
      });

      // Keep toothed motion brief. Longer ratchet slices read as caustic drilling
      // when layered with the hydraulic subsystem deployments.
      [
        { at: timing.deployments.magneticCage.startsAt + 0.16, duration: 0.38, offset: 2.18, pan: 0.12 },
      ].forEach((cue, index) => {
        scheduleSample({
          url: ANTIMATTER_CINEMATIC_SFX.ratchet,
          at: cue.at,
          duration: cue.duration,
          offset: cue.offset,
          volume: 0.12 + index * 0.025,
          rate: 0.7 + index * 0.04,
          attack: 0.012,
          release: 0.1,
          highpass: 115,
          lowpass: 3_800,
          pan: cue.pan,
        });
      });

      [
        { at: timing.deployments.ignitionNetwork.settlesAt, pan: -0.42, offset: 0.32 },
        { at: timing.deployments.magneticCage.settlesAt, pan: 0.16, offset: 0.52 },
        { at: timing.deployments.horizonMirror.settlesAt, pan: -0.34, offset: 0.74 },
      ].forEach(({ at, pan, offset }) => {
        scheduleSample({
          url: ANTIMATTER_CINEMATIC_SFX.metalImpact,
          at,
          duration: 0.22,
          offset,
          volume: 0.14,
          rate: 1.12,
          attack: 0.004,
          release: 0.14,
          highpass: 150,
          lowpass: 3_600,
          pan,
        });
      });

      // Ignition Kernel: one concise furnace-door closure. A slowed duplicate
      // bloomed after the visible lock and made this moment sound strained.
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.metalDoorSlam,
        at: timing.parts.ignitionKernel.locksAt,
        duration: 0.62,
        volume: 0.54,
        rate: 0.94,
        release: 0.28,
        lowpass: 3_800,
        highpass: 42,
        pan: artifactPans[0],
      });

      // Magnetic Bottle: a clamp snap with a longer steel resonance.
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.metalImpact,
        at: timing.parts.magneticBottle.locksAt,
        duration: 1.22,
        volume: 0.5,
        rate: 0.78,
        lowpass: 4_200,
        highpass: 62,
        pan: artifactPans[1],
      });
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.metalDoorSlam,
        at: timing.parts.magneticBottle.locksAt + 0.045,
        duration: 0.96,
        volume: 0.27,
        rate: 0.7,
        lowpass: 720,
        highpass: 34,
        pan: artifactPans[1],
      });

      // Causal Spark Coil: its deployment already carries the ratcheting motion;
      // reserve this moment for the distinct breaker-like seating hit.
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.metalImpact,
        at: timing.parts.causalSparkCoil.locksAt,
        duration: 0.96,
        volume: 0.46,
        rate: 0.94,
        highpass: 48,
        lowpass: 3_200,
        pan: artifactPans[2],
      });

      // Horizon Extractor: the heaviest, least resonant pressure seal.
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.metalDoorSlam,
        at: timing.parts.horizonExtractor.locksAt,
        duration: 0.74,
        volume: 0.66,
        rate: 0.64,
        lowpass: 1_450,
        highpass: 28,
        release: 0.52,
        pan: artifactPans[3],
      });
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.deepImpact,
        at: timing.parts.horizonExtractor.locksAt + 0.018,
        duration: 0.58,
        volume: 0.32,
        offset: 0.08,
        rate: 0.74,
        lowpass: 480,
        highpass: 24,
        pan: artifactPans[3] * 0.4,
      });

      // Containment is field pressure, not additional construction. Slowed and
      // reversed recordings create a smooth inward load between the last lock
      // and the implosion without introducing more ratchets or clanks.
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.deepImpact,
        at: timing.containment.startsAt,
        duration: timing.implosion.startsAt - timing.containment.startsAt,
        volume: 0.14,
        offset: 1.24,
        rate: 0.42,
        attack: 0.28,
        release: 0.22,
        highpass: 24,
        lowpass: 380,
        destination: manifestationBus,
      });
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.pressureRelease,
        at: timing.containment.startsAt + 0.08,
        duration: timing.implosion.startsAt - timing.containment.startsAt - 0.14,
        volume: 0.085,
        offset: 0.56,
        rate: 0.54,
        attack: 0.22,
        release: 0.16,
        highpass: 52,
        lowpass: 1_050,
        reverse: true,
        destination: manifestationBus,
      });
      [4.34, 4.96, 5.3].forEach((at, index) => {
        scheduleBassPulse(at, 0.42 + index * 0.09, manifestationBus);
      });

      // End the assembly texture decisively after the final lock so its metal
      // resonance cannot make the containment field read as more construction.
      const assemblyGain = assemblyBus.gain;
      assemblyGain.setValueAtTime(1, start);
      assemblyGain.setValueAtTime(
        1,
        start + timing.parts.horizonExtractor.locksAt + 0.04,
      );
      assemblyGain.exponentialRampToValueAtTime(
        0.0001,
        start + timing.phases.containment,
      );

      // The chamber bed falls into a hard vacuum at the pinch point, returns
      // under the aftershock, then ends exactly as the device manifests.
      const musicGain = musicBus.gain;
      musicGain.setValueAtTime(0.86, start + timing.implosion.startsAt);
      musicGain.linearRampToValueAtTime(0.025, start + timing.implosion.pinchesAt);
      musicGain.setValueAtTime(0.025, start + timing.flash.peaksAt + 0.02);
      musicGain.linearRampToValueAtTime(0.22, start + timing.flash.endsAt);
      musicGain.exponentialRampToValueAtTime(
        0.0001,
        start + timing.phases.manifested,
      );

      // Three inward fronts narrow toward the same instant. Reversing short
      // recorded slices gives the collapse a physical draw without a synth buzz.
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.pressureRelease,
        at: timing.implosion.startsAt,
        duration: timing.implosion.pinchesAt - timing.implosion.startsAt,
        volume: 0.18,
        offset: 0.24,
        rate: 0.86,
        attack: 0.025,
        release: 0.012,
        lowpass: 2_800,
        highpass: 72,
        reverse: true,
        destination: manifestationBus,
      });
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.deepImpact,
        at: timing.implosion.startsAt,
        duration: timing.implosion.pinchesAt - timing.implosion.startsAt,
        volume: 0.25,
        offset: 0.08,
        rate: 0.72,
        attack: 0.02,
        release: 0.012,
        lowpass: 620,
        highpass: 26,
        reverse: true,
        destination: manifestationBus,
      });
      timing.implosionWaves.forEach((at, index) => {
        scheduleSample({
          url: ANTIMATTER_CINEMATIC_SFX.metalImpact,
          at,
          duration: timing.implosion.pinchesAt - at,
          volume: 0.18 + index * 0.085,
          offset: 0.04 + index * 0.08,
          rate: 0.74 + index * 0.1,
          attack: 0.01,
          release: 0.008,
          lowpass: 1_150 + index * 520,
          highpass: 34,
          pan: [-0.4, 0.24, 0][index],
          reverse: true,
          destination: manifestationBus,
        });
      });

      // The flash is energy and displaced air, with no new mechanical strike
      // after the assembly has already completed.
      const annihilationTailDuration =
        timing.phases.manifested - timing.flash.peaksAt;
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.deepImpact,
        at: timing.flash.peaksAt,
        duration: annihilationTailDuration,
        volume: 0.9,
        rate: 0.86,
        lowpass: 1_450,
        highpass: 22,
        release: 0.36,
        destination: manifestationBus,
      });
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.pressureRelease,
        at: timing.flash.peaksAt,
        duration: annihilationTailDuration,
        volume: 0.13,
        offset: 0.2,
        rate: 0.56,
        lowpass: 1_200,
        highpass: 48,
        release: 0.38,
        destination: manifestationBus,
      });
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.deepImpact,
        at: timing.aftershock.startsAt,
        duration: timing.aftershock.endsAt - timing.aftershock.startsAt,
        volume: 0.27,
        offset: 0.78,
        rate: 0.5,
        attack: 0.035,
        lowpass: 440,
        highpass: 26,
        release: 0.34,
        destination: manifestationBus,
      });

      // After manifestation, the finished device speaks only through three
      // irregular bass beats. No ambience or annihilation tail crosses over.
      timing.manifestedPulses.forEach((at, index) => {
        scheduleBassPulse(at, 0.72 + index * 0.08, manifestationBus);
      });

      return registerCleanup();
    } catch (error) {
      for (const node of nodes) this.disconnect(node);
      console.warn('Antimatter cinematic audio failed', error);
      return false;
    }
  }

  /** Distinct low-cost cues for non-3D Blueprint manifestations. */
  playBlueprintManifestationCue(
    blueprintId: string,
    { reducedMotion = false }: { reducedMotion?: boolean } = {},
  ) {
    if (this.muted) return false;
    try {
      const ctx = this.initCtx();
      const start = ctx.currentTime + 0.025;
      const compressor = ctx.createDynamicsCompressor();
      const master = ctx.createGain();
      compressor.threshold.value = -20;
      compressor.knee.value = 10;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.006;
      compressor.release.value = 0.24;
      master.gain.value = 0.24;
      compressor.connect(master);
      master.connect(ctx.destination);
      this.registerTransientBus([compressor, master], reducedMotion ? 2_400 : 5_600);
      this.duckMusic(0.28, reducedMotion ? 0.7 : 2.4, 0.05, 0.8);

      if (blueprintId === 'bp_mantle_to_orbit_foundry') {
        this.osc(ctx, 58, 'sine', start, start + 1.5, 0.13, 0.02, compressor);
        [0, 0.28, 0.56].forEach((delay, index) => {
          const at = start + delay * (reducedMotion ? 0.35 : 1);
          this.osc(ctx, 196 * (index + 1), 'triangle', at, at + 0.54, 0.055, 0.01, compressor);
          this.noiseBlip(ctx, at, 0.055, 0.024, 1100 + index * 720, 7, compressor);
        });
        const lockAt = start + (reducedMotion ? 0.34 : 0.92);
        this.osc(ctx, 784, 'sine', lockAt, lockAt + 0.95, 0.052, 0.02, compressor);
        this.osc(ctx, 1175, 'sine', lockAt + 0.03, lockAt + 0.82, 0.032, 0.02, compressor);
        return true;
      }

      if (blueprintId === 'bp_worldshield_covenant') {
        const spacing = reducedMotion ? 0.1 : 0.27;
        [392, 523.25, 659.25].forEach((frequency, index) => {
          const at = start + index * spacing;
          this.osc(ctx, frequency, 'sine', at, at + 0.7, 0.045, 0.02, compressor);
        });
        const sealAt = start + (reducedMotion ? 0.28 : 0.84);
        this.osc(ctx, 82.4, 'sine', sealAt, sealAt + 1.25, 0.11, 0.01, compressor);
        this.osc(ctx, 1046.5, 'triangle', sealAt + 0.02, sealAt + 1.05, 0.048, 0.015, compressor);
        this.noiseBlip(ctx, sealAt, 0.08, 0.032, 2400, 10, compressor);
        return true;
      }

      this.osc(ctx, 523.25, 'sine', start, start + 0.85, 0.045, 0.02, compressor);
      return true;
    } catch (error) {
      console.warn('Blueprint manifestation SFX failed', error);
      return false;
    }
  }

  /**
   * Short forge-interruption cue for a trapped Artifact. Its three pressure
   * passes collapse into a true mix vacuum before the recorded impact lands.
   */
  playAntimatterDetonation({ speed = 1 }: { speed?: number } = {}) {
    if (this.muted) return false;

    const nodes: AudioNode[] = [];
    try {
      const ctx = this.initCtx();
      const timing = ANTIMATTER_DETONATION_TIMING;
      const playbackSpeed = Math.max(0.3, Math.min(1.5, speed));
      const at = (seconds: number) => seconds * playbackSpeed;
      const start = ctx.currentTime + 0.025;
      const master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      const pressureBus = ctx.createGain();
      const impactBus = ctx.createGain();
      nodes.push(master, compressor, pressureBus, impactBus);

      compressor.threshold.value = -20;
      compressor.knee.value = 8;
      compressor.ratio.value = 6;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.24;
      pressureBus.gain.value = 0.88;
      impactBus.gain.value = 1;
      pressureBus.connect(master);
      impactBus.connect(master);
      master.connect(compressor);
      compressor.connect(ctx.destination);

      master.gain.setValueAtTime(0.0001, start);
      master.gain.linearRampToValueAtTime(0.72, start + at(0.08));
      master.gain.setValueAtTime(0.72, start + at(timing.vacuum.startsAt - 0.035));
      master.gain.exponentialRampToValueAtTime(0.0001, start + at(timing.vacuum.startsAt));
      master.gain.setValueAtTime(0.0001, start + at(timing.vacuum.endsAt));
      master.gain.linearRampToValueAtTime(0.9, start + at(timing.flash.peaksAt));
      master.gain.setValueAtTime(0.72, start + at(timing.aftershock.startsAt + 0.08));
      master.gain.exponentialRampToValueAtTime(0.0001, start + at(timing.aftershock.endsAt + 0.24));

      this.registerTransientBus(nodes, (at(timing.duration) + 1) * 1000);
      this.duckMusic(0.1, at(2.15), 0.055, 0.82);

      const scheduleSample = ({
        url,
        startsAt,
        duration,
        volume,
        offset = 0,
        rate = 1,
        reverse = false,
        lowpass,
        highpass,
        destination,
      }: {
        url: string;
        startsAt: number;
        duration: number;
        volume: number;
        offset?: number;
        rate?: number;
        reverse?: boolean;
        lowpass?: number;
        highpass?: number;
        destination: AudioNode;
      }) => {
        const scheduledTime = start + at(startsAt);
        const adjustedRate = Math.max(0.3, Math.min(2, rate / playbackSpeed));
        void this.loadAudioAsset(url, ctx).then((buffer) => {
          if (this.muted || !this.transientBuses.has(master)) return;

          const lateness = Math.max(0, ctx.currentTime - scheduledTime);
          const baseOffset = Math.min(buffer.duration - 0.01, Math.max(0, offset));
          const sourceDuration = Math.min(
            duration * adjustedRate,
            Math.max(0.01, buffer.duration - baseOffset),
          );
          const audibleDuration = sourceDuration / adjustedRate;
          if (lateness >= audibleDuration || lateness > 0.5) return;

          let playbackBuffer = buffer;
          let sourceOffset = baseOffset + lateness * adjustedRate;
          if (reverse) {
            playbackBuffer = this.getReversedAudioSlice(
              ctx,
              url,
              buffer,
              baseOffset,
              sourceDuration,
            );
            sourceOffset = Math.min(playbackBuffer.duration - 0.001, lateness * adjustedRate);
          }

          const remainingSourceDuration = Math.max(
            0.001,
            Math.min(
              sourceDuration - lateness * adjustedRate,
              playbackBuffer.duration - sourceOffset,
            ),
          );
          const remainingAudibleDuration = remainingSourceDuration / adjustedRate;
          const beginsAt = Math.max(ctx.currentTime, scheduledTime);
          const endsAt = beginsAt + remainingAudibleDuration;
          const source = ctx.createBufferSource();
          const gain = ctx.createGain();
          const voiceNodes: AudioNode[] = [gain];
          source.buffer = playbackBuffer;
          source.playbackRate.setValueAtTime(adjustedRate, beginsAt);
          gain.gain.setValueAtTime(0.0001, beginsAt);
          gain.gain.linearRampToValueAtTime(volume, beginsAt + Math.min(0.018, remainingAudibleDuration * 0.24));
          gain.gain.setValueAtTime(volume, Math.max(beginsAt + 0.02, endsAt - Math.min(0.16, remainingAudibleDuration * 0.5)));
          gain.gain.exponentialRampToValueAtTime(0.0001, endsAt);

          let tail: AudioNode = source;
          if (highpass != null) {
            const filter = ctx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.value = highpass;
            filter.Q.value = 0.7;
            tail.connect(filter);
            tail = filter;
            voiceNodes.push(filter);
          }
          if (lowpass != null) {
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = lowpass;
            filter.Q.value = 0.7;
            tail.connect(filter);
            tail = filter;
            voiceNodes.push(filter);
          }
          tail.connect(gain);
          gain.connect(destination);
          this.trackVoice(source, voiceNodes);
          source.start(beginsAt, sourceOffset, remainingSourceDuration);
        }).catch((error) => {
          console.warn('[Luminae] Antimatter detonation sample failed', error);
        });
      };

      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.ratchet,
        startsAt: 0.06,
        duration: at(0.34),
        volume: 0.12,
        rate: 0.68,
        lowpass: 1_650,
        highpass: 55,
        destination: pressureBus,
      });
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.metalImpact,
        startsAt: 0.31,
        duration: at(0.34),
        volume: 0.16,
        rate: 0.72,
        lowpass: 1_100,
        highpass: 42,
        destination: pressureBus,
      });

      timing.implosionWaves.forEach((startsAt, index) => {
        scheduleSample({
          url: index === 1
            ? ANTIMATTER_CINEMATIC_SFX.deepImpact
            : ANTIMATTER_CINEMATIC_SFX.pressureRelease,
          startsAt,
          duration: at(timing.vacuum.startsAt - startsAt),
          volume: 0.13 + index * 0.055,
          offset: index === 1 ? 0.72 : 0.12 + index * 0.16,
          rate: 0.58 + index * 0.08,
          reverse: true,
          lowpass: 620 - index * 90,
          highpass: 28,
          destination: pressureBus,
        });
      });

      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.deepImpact,
        startsAt: timing.flash.startsAt,
        duration: at(0.68),
        volume: 0.44,
        offset: 0.08,
        rate: 0.62,
        lowpass: 520,
        highpass: 24,
        destination: impactBus,
      });
      scheduleSample({
        url: ANTIMATTER_CINEMATIC_SFX.pressureRelease,
        startsAt: timing.aftershock.startsAt,
        duration: at(timing.aftershock.endsAt - timing.aftershock.startsAt),
        volume: 0.18,
        offset: 0.18,
        rate: 0.58,
        lowpass: 920,
        highpass: 35,
        destination: impactBus,
      });

      return true;
    } catch (error) {
      for (const node of nodes) this.disconnect(node);
      console.warn('Antimatter detonation audio failed', error);
      return false;
    }
  }

  // ── SFX ─────────────────────────────────────────────────────────────────

  /** Short sonic logo used at the absolute beginning of a match and in the win resolve. */
  playBrandMnemonic() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      this.duckMusic(0.34, 0.62, 0.04, 0.72);
      this.osc(ctx, 130.81, 'sine', t, t + 0.9, 0.08, 0.025);
      this.osc(ctx, 196, 'sine', t + 0.04, t + 0.72, 0.045, 0.025);
      this.noiseSweep(ctx, t, 0.42, 0.028, 260, 1700);
      this.playBrandMotif(ctx, t + 0.04, 1);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * A restrained portal stir when one or more Luminaries first become eligible.
   * It deliberately stops short of the arrival impact so the selection or
   * summoning sequence still owns the spectacle.
   */
  playLuminaryEligibility(count = 1) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const voices = Math.max(1, Math.min(3, Math.round(count)));
      this.duckMusic(0.68, 0.48, 0.08, 0.72);
      this.noiseSweep(ctx, t, 0.72, 0.032, 120, 840);
      this.osc(ctx, 82.41, 'sine', t, t + 1.04, 0.075, 0.18);
      this.osc(ctx, 164.81, 'triangle', t + 0.08, t + 0.82, 0.032, 0.12);
      for (let index = 0; index < voices; index += 1) {
        const at = t + 0.24 + index * 0.13;
        const frequency = [392, 523.25, 659.25][index];
        this.osc(ctx, frequency, 'sine', at, at + 0.72, 0.036 - index * 0.004, 0.08);
      }
      this.noiseBlip(ctx, t + 0.7, 0.22, 0.026, 2300, 3);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * Short dull thud for a Harness that yielded no new tokens because every
   * selected Affinity was capped. Quieter and lower than the landing chime.
   *
   * The base pitch is derived from the Affinity's frequency divided by 4,
   * placing each color in the 100–220 Hz thud range while keeping a clearly
   * distinct timbre per Affinity (Abyss rumbles deepest at ~104 Hz; Singularity thuds
   * brightest at ~220 Hz).
   */
  playHarnessBlocked(color: AffinityKey = 'flare') {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      // Derive affinity-pitched thud frequency (100–220 Hz range).
      const base = AFFINITY_FREQUENCIES[color] / 4;
      // Primary low thud — sine at affinity pitch + sub-bass underpinning
      this.osc(ctx, base, 'sine', t, t + 0.26, 0.07, 0.006);
      this.osc(ctx, base * 0.5, 'sine', t, t + 0.34, 0.04, 0.01);
      // Muffled knock — bandpass noise centred near the affinity frequency
      this.noiseBlip(ctx, t, 0.09, 0.055, base * 1.2, 3);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * Short dissonant "denied" buzzer — played when a card-info action button
   * (Forge / Encrypt) is pressed after its card has already vanished from the
   * Forge. Two descending low square-wave tones over a sub thud, reading
   * clearly as a rejection without being harsh enough to startle.
   */
  playActionRejected() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      // Descending two-tone buzzer (harsh square waves).
      this.osc(ctx, 196, 'square', t, t + 0.1, 0.045, 0.004);
      this.osc(ctx, 147, 'square', t + 0.09, t + 0.24, 0.05, 0.004);
      // Low sub thud for weight.
      this.osc(ctx, 82, 'sine', t, t + 0.26, 0.05, 0.008);
      // Muffled noise edge — the "blocked" texture.
      this.noiseBlip(ctx, t, 0.07, 0.035, 320, 2);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * Soft chime timed to the moment a harnessed Affinity token lands.
   * Lighter and shorter than playAffinitySelected, and played once per token.
   */
  playHarnessLand(color: AffinityKey = 'flare') {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const freq = AFFINITY_FREQUENCIES[color];
      // Soft sine tone, quieter and shorter than the selection cue.
      this.osc(ctx, freq, 'sine', t, t + 0.28, 0.07, 0.003);
      this.osc(ctx, freq * 2, 'sine', t, t + 0.14, 0.025, 0.002);
      // Tiny tactile click for the landing impact
      this.noiseBlip(ctx, t, 0.04, 0.05, freq * 0.9, 7);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Affinity-pitched tone with a small tactile click. */
  playAffinitySelected(color: AffinityKey = 'flare') {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const freq = AFFINITY_FREQUENCIES[color];
      // Main ting: sine + quiet overtone
      this.osc(ctx, freq, 'sine', t, t + 0.5, 0.12, 0.003);
      this.osc(ctx, freq * 2, 'sine', t, t + 0.25, 0.04, 0.002);
      // Tactile click: short bandpass noise
      this.noiseBlip(ctx, t, 0.06, 0.08, freq * 0.8, 6);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * Affinity-pitched tokens stream out of the player's bank during Forge.
   * Unique colors are staggered to match the visible energy streams.
   */
  playAffinityPayment(colors: readonly AffinityKey[]) {
    if (this.muted || colors.length === 0) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime + 0.18;
      const unique = Array.from(new Set(colors)).slice(0, 6);
      unique.forEach((color, index) => {
        const root = AFFINITY_FREQUENCIES[color];
        const at = t + index * 0.052;
        this.noiseBlip(ctx, at, 0.036, 0.032, root * 1.35, 8);
        this.osc(ctx, root, 'triangle', at, at + 0.2, 0.036, 0.004);
        this.osc(ctx, root * 0.5, 'sine', at + 0.025, at + 0.31, 0.04, 0.006);
      });
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Balance Due — every collected token settles into the central contract orbit. */
  playBalanceDueGather() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.62, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 1_450);
      this.duckMusic(0.74, 0.72, 0.025, 0.55);

      this.noiseSweep(ctx, t, 0.46, 0.012, 1_800, 260, bus);
      this.osc(ctx, 196, 'triangle', t, t + 0.64, 0.022, 0.01, bus);
      this.osc(ctx, 293.66, 'sine', t + 0.07, t + 0.76, 0.018, 0.008, bus);
      this.osc(ctx, 440, 'sine', t + 0.16, t + 0.92, 0.013, 0.006, bus);
      this.noiseBlip(ctx, t + 0.03, 0.055, 0.018, 520, 5, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Balance Due — the completed orbit releases toward the shared Well. */
  playBalanceDueRelease() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.6, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 1_550);

      this.noiseSweep(ctx, t, 0.68, 0.014, 180, 2_400, bus);
      this.risingTone(ctx, t, 720, 130.81, 783.99, 0.024, bus);
      this.osc(ctx, 261.63, 'sine', t + 0.08, t + 0.62, 0.014, 0.008, bus);
      this.osc(ctx, 392, 'sine', t + 0.2, t + 0.84, 0.015, 0.006, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Artifact-forge celebration: bass thud + bright chord + sparkle arpeggio. */
  playArtifactForged() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      this.duckMusic(0.5, 0.46, 0.035, 0.72);

      // Bass thud (cosmic depth)
      this.osc(ctx, 80, 'sine', t, t + 0.5, 0.22, 0.005);
      this.osc(ctx, 55, 'sine', t, t + 0.8, 0.1, 0.008);
      // Mid-bass translation keeps the impact present on phone speakers.
      this.osc(ctx, 174.61, 'triangle', t, t + 0.34, 0.055, 0.006);

      // Chord: C4 + E4 + G4 — major triad, warm
      this.osc(ctx, 261.6, 'sine', t + 0.04, t + 0.9, 0.1, 0.01);
      this.osc(ctx, 329.6, 'sine', t + 0.04, t + 0.9, 0.09, 0.01);
      this.osc(ctx, 392.0, 'sine', t + 0.04, t + 0.9, 0.08, 0.01);

      // Sparkle arpeggio rising: C5 E5 G5 C6
      const arpeNotes = [523.25, 659.25, 783.99, 1046.5];
      arpeNotes.forEach((f, i) => {
        const at = t + 0.08 + i * 0.085;
        this.osc(ctx, f, 'sine', at, at + 0.55, 0.06, 0.004);
      });

      // Shimmer noise burst (bright, airy)
      this.noiseBlip(ctx, t + 0.08, 0.3, 0.06, 1800, 5);
      this.noiseBlip(ctx, t + 0.35, 0.25, 0.04, 2400, 4);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Card dealt from deck — papery thwip + soft mold settle. */
  playCardDraw(refillBus?: GainNode) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      // Play the real Card draw.mp3 asset as the core papery draw sound
      this.scheduleAudioAsset(CARD_DRAW_MP3, t, 0.55, undefined, refillBus);
      const sources = this.playMoldSettle(ctx, t + 0.3, 1, refillBus);
      if (refillBus) this.forgeRefillSounds.get(refillBus)?.sources.push(...sources);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Impact Extinction — a distinct short cue for each Archive intake. */
  playImpactExtinctionArchive() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.7, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 700);
      this.noiseBlip(ctx, t, 0.055, 0.065, 1_050, 5, bus);
      this.noiseSweep(ctx, t + 0.015, 0.22, 0.03, 680, 120, bus);
      this.osc(ctx, 96, 'sine', t + 0.018, t + 0.34, 0.075, 0.006, bus);
      this.osc(ctx, 192, 'triangle', t + 0.03, t + 0.2, 0.026, 0.004, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Impact Extinction — restrained metal instability before the central force arrives. */
  playImpactExtinctionTremor() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.72, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 1_100);
      this.duckMusic(0.86, 0.5, 0.03, 0.28);

      [0, 0.105, 0.215, 0.325, 0.44].forEach((offset, index) => {
        this.noiseBlip(ctx, t + offset, 0.075, 0.016, 170 + index * 24, 2.2, bus);
        this.osc(
          ctx,
          index % 2 === 0 ? 72 : 79,
          'triangle',
          t + offset,
          t + offset + 0.11,
          0.018,
          0.008,
          bus,
        );
      });
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Decode the authored shockwave ahead of its frame-locked playback beat. */
  preloadImpactExtinctionShockwave() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      void this.loadAudioAsset(IMPACT_EXTINCTION_SHOCKWAVE_MP3, ctx).catch(() => undefined);
    } catch (e) {
      console.warn('SFX preload failed', e);
    }
  }

  /** Impact Extinction — authored riser with its main transient locked to the shockwave. */
  playImpactExtinctionShockwave(impactDelayMs = 0) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.58, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 4_000);
      this.duckMusic(0.42, 1.7, 0.04, 1.05);

      void this.scheduleAudioAsset(
        IMPACT_EXTINCTION_SHOCKWAVE_MP3,
        t,
        1,
        undefined,
        bus,
        0.015,
        0.3,
        getImpactExtinctionShockwaveSourceOffset(impactDelayMs),
      );
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Kept as a stable director hook; the first-party cue is generated at playback. */
  preloadSeedBeyondSeasonsCue() {
    // Procedural Web Audio has no network/decode step to preload.
  }

  /** Avatar Seeds — a breath gathers into a rooted harmonic bloom at the first mold. */
  playSeedBeyondSeasonsCue(firstPlantDelayMs: number) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.72, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 3_500);
      this.duckMusic(0.66, 2.75, 0.06, 0.82);

      const timing = getSeedBeyondSeasonsCueTiming(firstPlantDelayMs);
      const cueStart = t + timing.startDelaySeconds;
      const plantAt = t + Math.max(0, firstPlantDelayMs) / 1000;
      const availableLead = Math.max(0.04, plantAt - cueStart);

      this.noiseSweep(ctx, cueStart, availableLead + 0.12, 0.018, 260, 1_450, bus);
      const gatheringRoot = this.osc(
        ctx,
        146.83,
        'sine',
        cueStart,
        plantAt + 0.42,
        0.036,
        Math.min(0.16, availableLead * 0.55),
        bus,
      );
      gatheringRoot.o.frequency.setValueAtTime(146.83, cueStart);
      gatheringRoot.o.frequency.exponentialRampToValueAtTime(98, plantAt + 0.08);

      this.noiseBlip(ctx, plantAt, 0.12, 0.028, 390, 2.4, bus);
      this.osc(ctx, 73.42, 'sine', plantAt, plantAt + 0.64, 0.052, 0.008, bus);
      [293.66, 440, 587.33, 880].forEach((frequency, index) => {
        const at = plantAt + 0.035 + index * 0.105;
        this.osc(ctx, frequency, 'sine', at, at + 0.82, 0.026 - index * 0.003, 0.025, bus);
      });
      this.noiseSweep(ctx, plantAt + 0.08, 1.18, 0.012, 720, 2_650, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Avatar Seeds — restrained per-mold inscription beneath the authored cue. */
  playAvatarSeedPlant(index = 0) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.5, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 1_650);
      const root = 587.33 * (1 + Math.min(index, 2) * 0.035);

      this.osc(ctx, 92, 'sine', t, t + 0.48, 0.035, 0.01, bus);
      this.noiseBlip(ctx, t + 0.015, 0.09, 0.018, 310, 2, bus);
      this.osc(ctx, root, 'sine', t + 0.035, t + 0.72, 0.024, 0.008, bus);
      this.osc(ctx, root * 1.5, 'sine', t + 0.12, t + 0.88, 0.014, 0.01, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Lumii's six-node motif. Hostile mode reverses and detunes the guardian interval set. */
  playLumiiSignal(mode: 'guardian' | 'hostile' | 'yielding' = 'guardian') {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(mode === 'hostile' ? 0.48 : 0.4, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 1_900);
      const guardian = [261.63, 329.63, 392, 523.25, 659.25, 783.99];
      const hostile = [783.99, 622.25, 466.16, 349.23, 277.18, 207.65];
      const yielding = [233.08, 293.66, 349.23, 440, 523.25, 622.25];
      const notes = mode === 'hostile' ? hostile : mode === 'yielding' ? yielding : guardian;
      notes.forEach((frequency, index) => {
        const at = t + index * (mode === 'hostile' ? 0.042 : 0.055);
        this.osc(
          ctx,
          frequency,
          mode === 'hostile' && index % 2 === 0 ? 'triangle' : 'sine',
          at,
          at + (mode === 'hostile' ? 0.42 : 0.62),
          Math.max(0.01, 0.028 - index * 0.0028),
          0.012,
          bus,
        );
      });
      if (mode === 'hostile') this.noiseBlip(ctx, t + 0.04, 0.28, 0.014, 620, 2.4, bus);
    } catch (e) {
      console.warn('Lumii signal failed', e);
    }
  }

  /** The Trace — Lumii's six-node signal refracted through the chosen guidance posture. */
  playTraceSignal(
    mode: 'presence' | 'expose' | 'withhold' | 'force' | 'closure' = 'presence',
  ) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(mode === 'force' ? 0.42 : 0.34, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 2_300);

      const notesByMode = {
        presence: [261.63, 329.63, 392, 523.25, 659.25, 783.99],
        expose: [261.63, 329.63, 392, 493.88, 659.25, 783.99],
        withhold: [261.63, 311.13, 392, 466.16, 587.33, 698.46],
        force: [293.66, 277.18, 261.63, 246.94, 233.08, 220],
        closure: [233.08, 293.66, 349.23, 440, 523.25, 698.46],
      } as const;
      notesByMode[mode].forEach((frequency, index) => {
        const at = t + index * (mode === 'force' ? 0.044 : 0.06);
        this.osc(
          ctx,
          frequency,
          mode === 'force' && index % 2 === 0 ? 'triangle' : 'sine',
          at,
          at + (mode === 'closure' ? 0.9 : 0.58),
          Math.max(0.009, 0.026 - index * 0.0026),
          0.012,
          bus,
        );
      });
      if (mode === 'force') this.noiseBlip(ctx, t + 0.06, 0.24, 0.01, 520, 2.2, bus);
      if (mode === 'closure') this.osc(ctx, 116.54, 'sine', t, t + 1.2, 0.018, 0.04, bus);
    } catch (e) {
      console.warn('Trace signal failed', e);
    }
  }

  /** The Recurrence — Lumii's signal refracted through Eido's archive custody. */
  playWhiteReturnSignal(
    mode: 'presence' | 'publish' | 'seal' | 'dual' | 'closure' = 'presence',
  ) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.3, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 2_400);
      const notesByMode = {
        presence: [196, 261.63, 311.13, 392, 523.25, 622.25],
        publish: [196, 246.94, 311.13, 392, 493.88, 622.25],
        seal: [196, 233.08, 277.18, 329.63, 392, 466.16],
        dual: [196, 293.66, 220, 329.63, 246.94, 392],
        closure: [174.61, 233.08, 293.66, 349.23, 466.16, 587.33],
      } as const;
      notesByMode[mode].forEach((frequency, index) => {
        const at = t + index * (mode === 'dual' ? 0.085 : 0.065);
        this.osc(
          ctx,
          frequency,
          mode === 'seal' ? 'triangle' : 'sine',
          at,
          at + (mode === 'closure' ? 0.95 : 0.62),
          Math.max(0.008, 0.024 - index * 0.0025),
          0.014,
          bus,
        );
      });
      if (mode === 'presence') this.noiseBlip(ctx, t + 0.03, 0.24, 0.008, 840, 2.4, bus);
      if (mode === 'seal') this.osc(ctx, 98, 'sine', t + 0.12, t + 1.1, 0.014, 0.05, bus);
      if (mode === 'closure') this.osc(ctx, 87.31, 'sine', t, t + 1.3, 0.015, 0.06, bus);
    } catch (e) {
      console.warn('White Return signal failed', e);
    }
  }

  /** The Triangulation — three independent bearings and their chosen relation. */
  playTriangulationSignal(
    mode: 'arrival' | 'alignment' | 'frames' | 'measure' | 'composite' | 'closure' = 'arrival',
  ) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(mode === 'composite' ? 0.34 : 0.29, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 2_600);
      const separated = [196, 293.66, 440] as const;
      if (mode === 'arrival' || mode === 'alignment') {
        separated.forEach((frequency, index) => {
          const at = t + index * (mode === 'alignment' ? 0.16 : 0.24);
          this.osc(ctx, frequency, index === 1 ? 'triangle' : 'sine', at, at + 0.72, 0.026, 0.02, bus);
        });
        if (mode === 'alignment') this.osc(ctx, 369.99, 'sine', t + 0.52, t + 1.22, 0.012, 0.04, bus);
      } else if (mode === 'frames') {
        [196, 293.66, 440, 196, 293.66, 440].forEach((frequency, index) => {
          const at = t + index * 0.13;
          this.osc(ctx, frequency, 'sine', at, at + 0.48, 0.018, 0.018, bus);
        });
      } else if (mode === 'measure') {
        [196, 246.94, 293.66, 369.99, 440].forEach((frequency, index) => {
          this.osc(ctx, frequency, 'sine', t + index * 0.05, t + 0.92, 0.017, 0.025, bus);
        });
      } else if (mode === 'composite') {
        [196, 293.66, 440, 369.99].forEach((frequency, index) => {
          const at = t + index * 0.045;
          this.osc(ctx, frequency, index === 3 ? 'triangle' : 'sine', at, at + 1.1, index === 3 ? 0.012 : 0.02, 0.03, bus);
        });
      } else {
        [174.61, 261.63, 392, 523.25].forEach((frequency, index) => {
          this.osc(ctx, frequency, 'sine', t + index * 0.075, t + 1.18, 0.019, 0.035, bus);
        });
      }
    } catch (e) {
      console.warn('Triangulation signal failed', e);
    }
  }

  /** Eternal Recurrence — one Burned Artifact lifts from the pile. */
  playRecurrenceDeparture(index = 0) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.58, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 1_300);
      const root = 220 * (1 + (index % 4) * 0.035);

      this.noiseSweep(ctx, t, 0.54, 0.012, 180, 1_260, bus);
      this.osc(ctx, root, 'triangle', t + 0.04, t + 0.62, 0.015, 0.018, bus);
      this.osc(ctx, root * 2, 'sine', t + 0.18, t + 0.7, 0.01, 0.012, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Eternal Recurrence — one restored Artifact is absorbed by its Archive. */
  playRecurrenceArchiveImpact(tier: 1 | 2 | 3) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.62, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 1_050);
      const root = tier === 1 ? 523.25 : tier === 2 ? 659.25 : 783.99;

      this.noiseBlip(ctx, t, 0.065, 0.014, 420, 3, bus);
      this.osc(ctx, root * 0.5, 'sine', t, t + 0.36, 0.018, 0.008, bus);
      this.osc(ctx, root, 'sine', t + 0.055, t + 0.48, 0.012, 0.008, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Assimilation — an accelerating nanoswarm consumes the Artifact under the scan front. */
  playAssimilationDissolve(durationMs = 1_900) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const duration = Math.min(2.8, Math.max(0.42, durationMs / 1000));
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.62, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], Math.round((duration + 0.85) * 1000));
      this.duckMusic(0.68, duration + 0.4, 0.045, 0.72);

      // A quiet, detuning mechanical cloud gives the grains a single body
      // without turning the effect into a continuous energy sweep.
      const swarm = this.osc(
        ctx,
        1_480,
        'sawtooth',
        t + 0.015,
        t + duration * 0.9,
        0.0065,
        0.08,
        bus,
      );
      swarm.o.frequency.setValueAtTime(1_480, t + 0.015);
      swarm.o.frequency.exponentialRampToValueAtTime(410, t + duration * 0.9);
      const undertone = this.osc(
        ctx,
        96,
        'triangle',
        t + duration * 0.12,
        t + duration + 0.2,
        0.017,
        0.12,
        bus,
      );
      undertone.o.frequency.setValueAtTime(96, t + duration * 0.12);
      undertone.o.frequency.exponentialRampToValueAtTime(54, t + duration + 0.2);

      // Short, accelerating grains read as thousands of small machines taking
      // successive bites. Their pitch descends as less of the Artifact remains.
      Array.from({ length: 20 }, (_, index) => index).forEach((index) => {
        const progress = index / 19;
        const accelerated = 1 - Math.pow(1 - progress, 1.65);
        const grainAt = t + duration * (0.035 + accelerated * 0.76);
        const alternatingPitch = index % 3 === 0 ? 310 : index % 3 === 1 ? -120 : 70;
        this.noiseBlip(
          ctx,
          grainAt,
          0.024 + progress * 0.025,
          0.007 + progress * 0.009,
          Math.max(360, 2_650 - progress * 1_900 + alternatingPitch),
          10 + progress * 5,
          bus,
        );
      });

      // Broader bites punctuate the grain cloud, then collapse into a suction
      // tail just before the particles begin their transit to Civilization.
      [0.16, 0.34, 0.53, 0.69, 0.81].forEach((progress, index) => {
        this.noiseBlip(
          ctx,
          t + duration * progress,
          0.055 + index * 0.008,
          0.012 + index * 0.002,
          1_350 - index * 190,
          4,
          bus,
        );
      });
      this.noiseSweep(ctx, t + 0.025, duration * 0.86, 0.012, 3_600, 520, bus);
      this.noiseSweep(ctx, t + duration * 0.7, duration * 0.34, 0.02, 980, 90, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Assimilation — focused nanomachine stream carrying matter to Civilization. */
  playAssimilationTransit(durationMs = 1_250) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const duration = Math.min(2.2, Math.max(0.3, durationMs / 1000));
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.58, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], Math.round((duration + 0.65) * 1000));

      this.noiseSweep(ctx, t, duration, 0.012, 180, 2_200, bus);
      this.risingTone(ctx, t, duration * 1000, 110, 880, 0.021, bus);
      [0, 0.2, 0.42, 0.66].forEach((progress, index) => {
        this.osc(
          ctx,
          220 * (1 + index * 0.5),
          'sine',
          t + duration * progress,
          t + duration * Math.min(0.98, progress + 0.34),
          0.009 + index * 0.002,
          0.008,
          bus,
        );
      });
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Assimilation — tuned compression impact when the Affinity becomes permanent. */
  playAssimilationAbsorb(affinity: AffinityKey) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const root = AFFINITY_FREQUENCIES[affinity] ?? 440;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.76, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 1_750);
      this.duckMusic(0.58, 0.92, 0.018, 0.62);

      this.noiseBlip(ctx, t, 0.105, 0.027, 230, 3, bus);
      this.osc(ctx, 52, 'sine', t, t + 0.58, 0.052, 0.018, bus);
      this.osc(ctx, root * 0.5, 'triangle', t + 0.025, t + 0.62, 0.026, 0.012, bus);
      this.osc(ctx, root, 'sine', t + 0.085, t + 0.9, 0.023, 0.008, bus);
      this.osc(ctx, root * 1.5, 'sine', t + 0.18, t + 1.12, 0.014, 0.006, bus);
      this.noiseSweep(ctx, t + 0.04, 0.42, 0.013, 1_800, 320, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Early Bloom — vines climb, leaves unfurl, and a quiet morning chorus answers. */
  playEarlyBloomGrowth(durationMs = 1_180) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const duration = Math.min(2.1, Math.max(0.42, durationMs / 1000));
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.5, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], Math.round((duration + 1.05) * 1000));
      this.duckMusic(0.82, duration + 0.2, 0.08, 0.7);

      // The rising body suggests a vine extending rather than magical energy.
      this.noiseSweep(ctx, t + 0.02, duration * 0.82, 0.009, 170, 1_050, bus);
      const vine = this.osc(
        ctx,
        146.83,
        'triangle',
        t,
        t + duration * 0.88,
        0.012,
        0.14,
        bus,
      );
      vine.o.frequency.setValueAtTime(146.83, t);
      vine.o.frequency.exponentialRampToValueAtTime(220, t + duration * 0.88);

      // Fibrous creaks and leaf-rustles appear progressively higher as growth
      // reaches upward through the visual transfer path.
      [0.08, 0.24, 0.43, 0.61, 0.77].forEach((progress, index) => {
        const at = t + duration * progress;
        this.noiseBlip(ctx, at, 0.07 + index * 0.008, 0.01, 310 + index * 85, 3, bus);
        this.noiseBlip(
          ctx,
          at + 0.035,
          0.095,
          0.0055,
          1_650 + index * 210,
          2,
          bus,
        );
      });

      // Dew-like harmonics keep the morning quality delicate and readable.
      [
        { progress: 0.18, frequency: 783.99 },
        { progress: 0.46, frequency: 987.77 },
        { progress: 0.72, frequency: 1_174.66 },
      ].forEach(({ progress, frequency }) => {
        this.osc(
          ctx,
          frequency,
          'sine',
          t + duration * progress,
          t + duration * progress + 0.42,
          0.009,
          0.012,
          bus,
        );
      });

      // Two distant, restrained chirps imply spring morning without becoming
      // a literal looping bird recording.
      [0.28, 0.56].forEach((progress, index) => {
        const chirpAt = t + duration * progress;
        const chirp = this.osc(
          ctx,
          1_760 + index * 190,
          'sine',
          chirpAt,
          chirpAt + 0.13,
          0.0045,
          0.018,
          bus,
        );
        chirp.o.frequency.exponentialRampToValueAtTime(
          2_640 + index * 230,
          chirpAt + 0.1,
        );
      });
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** The victory threshold visibly recedes; a low pull resolves into a distant seal. */
  playVictoryRequirementShift(amount = 1) {
    if (this.muted || amount === 0) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.7, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 2_200);
      this.duckMusic(0.64, 1.25, 0.035, 0.72);

      const direction = amount > 0 ? 1 : -1;
      this.noiseSweep(
        ctx,
        t,
        1.05,
        0.022,
        direction > 0 ? 820 : 180,
        direction > 0 ? 95 : 920,
        bus,
      );
      this.osc(ctx, 73.42, 'sine', t, t + 1.35, 0.043, 0.025, bus);
      this.osc(ctx, 293.66, 'triangle', t + 0.16, t + 0.86, 0.013, 0.018, bus);
      this.osc(ctx, 440, 'sine', t + 0.7, t + 1.5, 0.015, 0.01, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Void Warden — a spectral subharmonic pulse pushes the threshold outward. */
  playOblivionThresholdShift(amount = 1) {
    if (this.muted || amount <= 0) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.78, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 4_400);
      this.duckMusic(0.38, 2.45, 0.07, 1.05);

      const voidRoot = this.osc(ctx, 55, 'sine', t, t + 2.65, 0.055, 0.16, bus);
      voidRoot.o.frequency.setValueAtTime(55, t);
      voidRoot.o.frequency.exponentialRampToValueAtTime(29, t + 2.65);
      const spectralVoice = this.osc(ctx, 164.81, 'triangle', t + 0.04, t + 2.24, 0.026, 0.18, bus);
      spectralVoice.o.frequency.setValueAtTime(164.81, t + 0.04);
      spectralVoice.o.frequency.exponentialRampToValueAtTime(82.41, t + 2.24);
      const hollowFormant = this.osc(ctx, 246.94, 'sine', t + 0.11, t + 2.05, 0.014, 0.22, bus);
      hollowFormant.o.frequency.setValueAtTime(246.94, t + 0.11);
      hollowFormant.o.frequency.exponentialRampToValueAtTime(116.54, t + 2.05);
      this.noiseSweep(ctx, t + 0.03, 2.25, 0.026, 720, 48, bus);
      this.noiseBlip(ctx, t + 0.18, 0.28, 0.032, 125, 2, bus);

      const thresholdSteps = Math.min(8, Math.max(1, Math.round(amount)));
      Array.from({ length: thresholdSteps }, (_, index) => index).forEach((index) => {
        const progress = thresholdSteps === 1 ? 1 : index / (thresholdSteps - 1);
        const at = t + 0.58 + progress * 0.88;
        this.noiseBlip(ctx, at, 0.05, 0.011, 420 - progress * 170, 6, bus);
        this.osc(ctx, 110 - progress * 36, 'triangle', at, at + 0.2, 0.012, 0.01, bus);
      });

      this.noiseSweep(ctx, t + 1.42, 0.8, 0.024, 1_100, 75, bus);
      this.osc(ctx, 41.2, 'sine', t + 1.5, t + 2.82, 0.038, 0.03, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Mysterious swoop + soft pad, distinct from forging. */
  playArtifactReserved() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;

      // Rising noise sweep — the "holding" sensation
      this.noiseSweep(ctx, t, 0.45, 0.1, 300, 1800);

      // Soft pad tone: A3 + E4 (fifth interval)
      this.osc(ctx, 220.0, 'sine', t + 0.05, t + 0.8, 0.07, 0.03);
      this.osc(ctx, 329.6, 'sine', t + 0.1, t + 0.7, 0.04, 0.04);

      // Gentle high ting to punctuate
      this.osc(ctx, 1318.5, 'sine', t + 0.38, t + 0.75, 0.035, 0.005);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * Cipher Seal follows the 2-second visual contract:
   * circuit convergence, completed white seal, compression, transfer, receipt.
   */
  playCipherSeal() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      this.duckMusic(0.42, 1.28, 0.05, 0.82);

      // Release and branching circuits (0-920 ms).
      this.noiseBlip(ctx, t, 0.065, 0.036, 820, 5);
      this.noiseSweep(ctx, t + 0.16, 0.7, 0.044, 330, 1850);
      const circuitBeats = [0.2, 0.31, 0.41, 0.5, 0.58, 0.65, 0.71, 0.77];
      circuitBeats.forEach((offset, index) => {
        const frequency = 620 + index * 145;
        this.noiseBlip(ctx, t + offset, 0.034, 0.026 + index * 0.002, frequency, 10);
        this.osc(ctx, frequency * 0.5, 'triangle', t + offset, t + offset + 0.1, 0.014, 0.002);
      });

      // The white cipher is objectively complete at the start of lock (920 ms).
      const lock = t + 0.92;
      this.noiseBlip(ctx, lock, 0.07, 0.065, 1900, 12);
      this.osc(ctx, 523.25, 'sine', lock, lock + 0.68, 0.06, 0.012);
      this.osc(ctx, 783.99, 'sine', lock + 0.018, lock + 0.58, 0.042, 0.014);
      this.osc(ctx, 1046.5, 'sine', lock + 0.04, lock + 0.42, 0.026, 0.012);

      // Card compression changes the seal's color (920-1240 ms).
      this.noiseSweep(ctx, lock + 0.045, 0.3, 0.052, 1750, 190);
      this.osc(ctx, 174.61, 'sine', lock + 0.06, lock + 0.42, 0.07, 0.02);
      this.osc(ctx, 87.31, 'sine', lock + 0.1, lock + 0.5, 0.07, 0.018);

      // Transfer and destination receipt (1240-2000 ms).
      this.noiseSweep(ctx, t + 1.24, 0.46, 0.04, 980, 260);
      this.osc(ctx, 392, 'sine', t + 1.28, t + 1.72, 0.026, 0.03);
      this.playMoldSettle(ctx, t + 1.74, 0.72);
      this.osc(ctx, 1046.5, 'sine', t + 1.76, t + 2, 0.024, 0.004);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Cosmic bell — metallic tone with long decay. */
  playTurnStart() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;

      // Bell fundamental: 440 Hz with inharmonic partials
      this.osc(ctx, 440.0, 'sine', t, t + 2.2, 0.14, 0.004);
      this.osc(ctx, 880.0, 'sine', t, t + 1.2, 0.06, 0.003);
      this.osc(ctx, 1320.0, 'sine', t, t + 0.8, 0.03, 0.003);
      this.osc(ctx, 2200.0, 'sine', t, t + 0.5, 0.02, 0.002);

      // Warm upward sweep to signal "your turn"
      this.noiseSweep(ctx, t, 0.3, 0.05, 200, 800);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Softer, lower-pitched bell — plays when an opponent's turn begins. */
  playOpponentTurnStart() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;

      // Lower fundamental: 330 Hz with shorter decay and quieter amplitude
      this.osc(ctx, 330.0, 'sine', t, t + 1.1, 0.085, 0.005);
      this.osc(ctx, 660.0, 'sine', t, t + 0.6, 0.035, 0.004);
      this.osc(ctx, 990.0, 'sine', t, t + 0.4, 0.018, 0.003);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Light selector tick for the opening turn-order randomizer. */
  playTurnOrderTick(step = 0) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const freq = 720 + (step % 5) * 86;
      this.noiseBlip(ctx, t, 0.026, 0.045, 1700 + (step % 4) * 160, 8);
      this.osc(ctx, freq, 'triangle', t, t + 0.075, 0.026, 0.002);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Final selector landing, built from the same motif used at match start. */
  playTurnOrderResolved() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      this.duckMusic(0.56, 0.42, 0.025, 0.62);
      this.noiseBlip(ctx, t, 0.065, 0.07, 1250, 6);
      this.osc(ctx, 130.81, 'sine', t, t + 0.62, 0.09, 0.006);
      this.osc(ctx, 261.63, 'triangle', t, t + 0.4, 0.045, 0.005);
      this.playBrandMotif(ctx, t + 0.035, 0.72);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Epic win: bass boom + triumphant arpeggio + high sparkles. */
  playWin() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      this.duckMusic(0.1, 2.05, 0.05, 1.65);

      // Bass boom
      this.osc(ctx, 55, 'sine', t, t + 1.8, 0.25, 0.01);
      this.osc(ctx, 82.5, 'sine', t, t + 1.5, 0.15, 0.01);

      // Pad chord: C3 + G3 + C4
      this.osc(ctx, 130.8, 'sine', t + 0.05, t + 2.5, 0.1, 0.04);
      this.osc(ctx, 196.0, 'sine', t + 0.05, t + 2.5, 0.08, 0.04);
      this.osc(ctx, 261.6, 'sine', t + 0.05, t + 2.5, 0.07, 0.04);

      // The opening sonic logo returns as a larger, resolved victory statement.
      this.playBrandMotif(ctx, t + 0.12, 1.35);
      this.osc(ctx, 1046.5, 'sine', t + 0.72, t + 1.9, 0.08, 0.025);

      // High sparkle shower
      const sparkFreqs = [1046.5, 1318.5, 1568, 2093, 1760, 2349];
      sparkFreqs.forEach((f, i) => {
        const at = t + 0.5 + i * 0.11;
        this.osc(ctx, f, 'sine', at, at + 0.5, 0.04, 0.003);
      });

      // Noise burst
      this.noiseBlip(ctx, t + 0.1, 0.4, 0.07, 2000, 3);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * Short affinity-themed fanfare for the Luminary that sealed the game.
   * Fires at the end of the arrival cutscene, just before playWin().
   * Duration ~1.3 s — distinct from (and shorter than) the full win sound.
   * summonColor is the hex from the Luminary's summonColor field (API contract).
   */
  playLuminaryFanfare(summonColor: string) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      this.duckMusic(0.28, 1.06, 0.04, 0.9);
      const affinity: AffinityKey = FANFARE_COLOR_MAP[summonColor.toLowerCase()] ?? 'singularity';
      const base = AFFINITY_FREQUENCIES[affinity];

      // ── Tuning constants ────────────────────────────────────────────────────
      // Adjust these to change fanfare feel without rebuilding.
      const BASS_VOL_LOW = 0.18; // volume of sub-bass layer (base * 0.25)
      const BASS_VOL_MID = 0.12; // volume of mid-bass layer (base * 0.5)
      const BASS_VOL_HIGH = 0.09; // volume of root-bass layer (base)
      const ARP_NOTE_COUNT = 4; // number of ascending arpeggio notes
      const ARP_BASE_VOL = 0.1; // starting volume of the first arp note
      const ARP_VOL_DROP = 0.012; // volume decrease per arp note
      const SHIMMER_VOL = 0.04; // volume of the high shimmer tail oscillator
      const SHIMMER_DURATION = 0.7; // seconds the shimmer tail oscillator rings (tail end = start + 0.55 + duration)
      // ───────────────────────────────────────────────────────────────────────

      // Bass bloom at the affinity root — grounding, resonant
      this.osc(ctx, base * 0.25, 'sine', t, t + 1.1, BASS_VOL_LOW, 0.008);
      this.osc(ctx, base * 0.5, 'sine', t, t + 0.9, BASS_VOL_MID, 0.006);
      this.osc(ctx, base, 'sine', t, t + 0.65, BASS_VOL_HIGH, 0.004);

      // Impact noise burst — crystalline shockwave
      this.noiseBlip(ctx, t, 0.14, 0.1, base * 2, 4);

      // Rising arpeggio — ARP_NOTE_COUNT notes ascending on the affinity's voice
      const arpRatios = [0.5, 0.75, 1.0, 1.5, 2.0, 2.5, 3.0, 4.0];
      const arp: number[] = arpRatios.slice(0, ARP_NOTE_COUNT).map((r) => base * r);
      arp.forEach((f, i) => {
        const at = t + 0.1 + i * 0.16;
        this.osc(ctx, f, 'sine', at, at + Math.max(0.3, 0.65 - i * 0.05), ARP_BASE_VOL - i * ARP_VOL_DROP, 0.006);
      });

      // High shimmer tail — iridescent sparkle as the portal seals
      this.osc(ctx, base * 3.0, 'sine', t + 0.55, t + 0.55 + SHIMMER_DURATION, SHIMMER_VOL, 0.012);
      this.noiseBlip(ctx, t + 0.6, 0.5, 0.05, base * 4, 3);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * Short activation sting for the LuminaryActivationCinematic overlay (~1–1.5 s).
   * Four distinct tonal contours, one per effect trigger:
   *
   *   summon ('arrival' in-game) — crystalline arrival burst: sub-bass impact + bright ascending
   *                  4-note arpeggio + high shimmer tail.  Signals something has
   *                  materialized.
   *
   *   end_of_turn  — outward energy release: mid-range thud + broad sweep expanding
   *                  outward + warm resolving fifth chord.  Signals energy discharging.
   *
   *   start_of_turn — soft awakening bloom: gentle rising sweep + warm pad chord +
   *                   bell overtone.  Signals an entity rousing for its turn.
   *
   * `primaryColor` is the Luminary's hex color; it is mapped to an Affinity root so
   * each affinity has a distinct pitch center. Unknown colors use the
   * Singularity voice so they remain perceptually separate from the five
   * standard Affinities.
   */
  playActivationSting(
    effectType: 'summon' | 'action' | 'end_of_turn' | 'start_of_turn',
    primaryColor?: string,
    fadeOptions?: {
      fadeInMs?: number;
      fadeOutStartMs?: number;
      fadeOutMs?: number;
    },
  ) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      // Route through a shared gain node so stopActivationSting() can ramp
      // the volume to 0 immediately on skip, even during async WAV decode.
      const ag = ctx.createGain();

      const fadeInS = (fadeOptions?.fadeInMs ?? 0) / 1000;
      const fadeOutStartS = fadeOptions?.fadeOutStartMs ?? null;
      const fadeOutS = (fadeOptions?.fadeOutMs ?? 80) / 1000;

      if (fadeInS > 0) {
        // Start silent and ramp up to match the visual fade-in.
        ag.gain.setValueAtTime(0, t);
        ag.gain.linearRampToValueAtTime(1, t + fadeInS);
      } else {
        ag.gain.setValueAtTime(1, t);
      }

      if (fadeOutStartS !== null) {
        const foStart = t + fadeOutStartS / 1000;
        // Hold peak until fade-out begins, then ramp to silence.
        ag.gain.setValueAtTime(1, foStart);
        ag.gain.linearRampToValueAtTime(0, foStart + fadeOutS);
      }

      ag.connect(ctx.destination);
      this.registerActivationBus(ag);

      const affinity = FANFARE_COLOR_MAP[primaryColor?.toLowerCase() ?? ''] ?? 'singularity';
      const root = AFFINITY_FREQUENCIES[affinity];
      this.noiseSweep(ctx, t, 0.34, 0.018, root * 0.42, root * 2.25, ag);
      this.noiseBlip(ctx, t + 0.075, 0.085, 0.016, root * 1.7, 6, ag);
      this.osc(ctx, root * 0.25, 'triangle', t, t + 0.42, 0.02, 0.014, ag);
      const motif = (
        ratio: number,
        offset: number,
        duration: number,
        volume: number,
      ) => this.osc(
        ctx,
        root * ratio,
        'sine',
        t + offset,
        t + offset + duration,
        volume,
        0.014,
        ag,
      );

      // The procedural texture and quiet motif share the same source bus, so
      // skip/fade behavior remains deterministic. Each trigger type has a
      // stable contour pitched around its active affinity family.
      if (effectType === 'summon') {
        motif(0.5, 0.04, 0.48, 0.018);
        motif(0.75, 0.16, 0.44, 0.016);
        motif(1, 0.3, 0.52, 0.014);
      } else if (effectType === 'action') {
        motif(1, 0.04, 0.3, 0.015);
        motif(0.75, 0.15, 0.34, 0.017);
        motif(0.5, 0.28, 0.46, 0.019);
      } else if (effectType === 'end_of_turn') {
        motif(0.5, 0.03, 0.4, 0.019);
        motif(0.75, 0.22, 0.46, 0.016);
      } else {
        motif(0.375, 0.05, 0.42, 0.014);
        motif(0.5, 0.17, 0.44, 0.016);
        motif(0.75, 0.31, 0.5, 0.015);
      }
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * Short, phase-locked cues shared by every Luminary effect director.
   *
   * Target is intentionally consistent so the player learns "the effect has
   * chosen its subject." Resolve varies by animation archetype and sits under
   * authored sounds such as brand strikes, Burns, and Archive impacts.
   * Aftermath is a quiet cadence that confirms the causal step is complete.
   */
  playLuminaryEffectBeat(
    archetype: AnimationArchetype,
    beat: LuminaryEffectSoundBeat,
    primaryColor?: string,
    luminaryId?: string,
  ) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const affinity = FANFARE_COLOR_MAP[primaryColor?.toLowerCase() ?? ''] ?? 'singularity';
      const root = AFFINITY_FREQUENCIES[affinity];
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.74, t);
      bus.connect(ctx.destination);
      // Effect beats must survive the source activation component's cleanup.
      // They are one-shot transients, not part of the activation sting bus;
      // otherwise stopActivationSting() amputates resolve/aftermath tails as
      // soon as the director advances or unmounts.
      this.registerTransientBus([bus], 2_800);

      const tone = (
        ratio: number,
        offset: number,
        duration: number,
        volume: number,
        type: OscillatorType = 'sine',
      ) => this.osc(
        ctx,
        root * ratio,
        type,
        t + offset,
        t + offset + duration,
        volume,
        0.012,
        bus,
      );

      const signature = () => {
        // Keep identity motifs brief and quiet. They sit inside the semantic
        // phase cue rather than becoming a second, competing sound event.
        switch (luminaryId) {
          case 'lum_moth':
            tone(1.5, 0.02, 0.16, 0.011, 'sawtooth');
            tone(0.25, 0.12, 0.34, 0.018, 'triangle');
            break;
          case 'lum_tide':
            tone(0.5, 0.02, 0.5, 0.011);
            tone(1, 0.16, 0.58, 0.012);
            break;
          case 'lum_verdant':
            tone(0.5, 0.02, 0.34, 0.011, 'triangle');
            tone(1.25, 0.2, 0.42, 0.012);
            break;
          case 'lum_void':
            this.osc(ctx, 38, 'sine', t, t + 0.76, 0.025, 0.025, bus);
            tone(0.353, 0.11, 0.56, 0.009, 'triangle');
            break;
          case 'lum_radiant':
            tone(1, 0.02, 0.48, 0.011);
            tone(1.5, 0.15, 0.52, 0.01);
            break;
          case 'lum_astral':
            tone(0.375, 0.02, 0.6, 0.012);
            tone(1.5, 0.24, 0.56, 0.01);
            break;
          case 'lum_bloom':
            tone(0.5, 0.02, 0.28, 0.01, 'triangle');
            tone(0.75, 0.16, 0.34, 0.011, 'triangle');
            tone(1.25, 0.3, 0.42, 0.01);
            break;
          case 'lum_forge':
            this.osc(ctx, 49, 'sine', t, t + 0.7, 0.027, 0.018, bus);
            this.noiseBlip(ctx, t + 0.12, 0.09, 0.009, 310, 2, bus);
            break;
          case 'lum_compass':
            // Sparse clock interval; the procedural Forgotten Hour cue carries
            // the dramatic weight at the branding strike.
            tone(1, 0.04, 0.16, 0.008);
            tone(0.5, 0.34, 0.3, 0.009);
            break;
          case 'lum_seed':
            tone(0.375, 0.02, 0.4, 0.011, 'triangle');
            tone(1.25, 0.22, 0.5, 0.011);
            break;
          case 'lum_orchard':
            tone(1, 0.02, 0.38, 0.009);
            tone(1.5, 0.09, 0.44, 0.01);
            tone(2, 0.18, 0.48, 0.008);
            break;
          case 'lum_pale':
            tone(1, 0.02, 0.26, 0.009);
            tone(0.75, 0.18, 0.34, 0.01);
            tone(0.5, 0.34, 0.42, 0.011);
            break;
          case 'lum_ember':
            tone(0.25, 0.02, 0.46, 0.015, 'triangle');
            this.noiseBlip(ctx, t + 0.12, 0.08, 0.008, 520, 2, bus);
            break;
          case 'lum_hunger':
            tone(1.5, 0.02, 0.22, 0.009, 'sawtooth');
            tone(0.375, 0.2, 0.52, 0.014, 'triangle');
            break;
          case 'lum_null':
            tone(0.353, 0.02, 0.58, 0.011, 'triangle');
            this.noiseSweep(ctx, t + 0.08, 0.46, 0.007, root * 1.2, 90, bus);
            break;
        }
      };

      if (beat === 'target') {
        // One restrained focus gesture regardless of target count. Repeating
        // this per card made multi-target effects sound chaotic.
        tone(0.5, 0, 0.24, 0.02);
        tone(1, 0.055, 0.2, 0.012);
        this.noiseBlip(ctx, t + 0.025, 0.055, 0.01, root * 1.8, 10, bus);
        return;
      }

      if (beat === 'aftermath') {
        const unresolved = archetype === 'globalDisruption' || archetype === 'suppression';
        const destructive = archetype === 'burn' || archetype === 'condemned';
        tone(unresolved ? 0.7 : destructive ? 0.5 : 0.75, 0, 0.24, 0.012);
        tone(unresolved ? 0.5 : destructive ? 0.375 : 1, 0.09, 0.3, 0.014);
        return;
      }

      this.duckMusic(0.78, 0.28, 0.035, 0.42);
      signature();
      switch (archetype) {
        case 'burn':
        case 'condemned':
        case 'suppression':
          tone(0.25, 0, 0.5, 0.035, 'triangle');
          tone(0.375, 0.055, 0.34, 0.018);
          this.noiseSweep(ctx, t, 0.34, 0.018, root * 1.35, root * 0.24, bus);
          break;

        case 'revealUntil':
        case 'scry':
          tone(0.5, 0, 0.26, 0.016);
          tone(0.75, 0.095, 0.3, 0.016);
          tone(1, 0.2, 0.38, 0.015);
          this.noiseSweep(ctx, t + 0.04, 0.32, 0.01, root * 0.7, root * 2.2, bus);
          break;

        case 'recurrence':
          tone(0.375, 0, 0.52, 0.023);
          tone(0.75, 0.14, 0.48, 0.018);
          this.noiseSweep(ctx, t, 0.52, 0.018, root * 0.28, root * 1.6, bus);
          break;

        case 'forgeReset':
          this.osc(ctx, 55, 'sine', t, t + 0.64, 0.048, 0.018, bus);
          this.osc(ctx, 82.5, 'triangle', t + 0.05, t + 0.48, 0.022, 0.014, bus);
          this.noiseSweep(ctx, t + 0.02, 0.46, 0.02, 85, 420, bus);
          break;

        case 'globalDisruption':
          this.osc(ctx, 46, 'sine', t, t + 0.72, 0.044, 0.025, bus);
          tone(0.5, 0.06, 0.54, 0.019, 'triangle');
          tone(0.705, 0.13, 0.5, 0.012);
          this.noiseSweep(ctx, t, 0.58, 0.014, 460, 70, bus);
          break;

        case 'thresholdPayoff':
          tone(0.5, 0, 0.36, 0.018);
          tone(0.75, 0.09, 0.42, 0.018);
          tone(1, 0.19, 0.5, 0.02);
          break;

        case 'affinityReturn':
          tone(1, 0, 0.28, 0.015);
          tone(0.75, 0.1, 0.34, 0.017);
          tone(0.5, 0.22, 0.44, 0.02);
          this.noiseSweep(ctx, t + 0.02, 0.42, 0.012, root * 1.8, root * 0.5, bus);
          break;

        case 'seeded':
        case 'replication':
          tone(0.375, 0, 0.42, 0.017);
          tone(0.5, 0.1, 0.46, 0.018);
          tone(0.75, 0.23, 0.52, 0.017);
          break;

        case 'assimilate':
          tone(1.5, 0, 0.34, 0.013);
          tone(1, 0.1, 0.4, 0.016);
          tone(0.5, 0.24, 0.52, 0.021);
          this.noiseSweep(ctx, t, 0.5, 0.015, root * 2.8, root * 0.4, bus);
          break;

        case 'passiveBoon':
        case 'resourceTransfer':
        default:
          tone(0.5, 0, 0.38, 0.016);
          tone(0.75, 0.1, 0.42, 0.017);
          tone(1, 0.22, 0.5, 0.017);
          break;
      }
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Immediately silence the source activation sting without cutting effect beats. */
  stopActivationSting() {
    const ctx = this.ctx;
    if (!ctx) return;
    for (const gain of [...this.activationBuses.keys()]) {
      try {
        const t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.08);
      } catch {}
      const existing = this.activationBuses.get(gain);
      if (existing) clearTimeout(existing);
      this.activationBuses.set(
        gain,
        setTimeout(() => this.disposeActivationBus(gain), 120),
      );
    }
  }

  /** Metallic coin spin — rapid decelerating clicks + resonant ring. */
  playSingularityToken() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      // Rapid metallic clicks that decelerate like a real spinning coin
      let offset = 0;
      for (let i = 0; i < 11; i++) {
        const interval = 0.03 + i * 0.014; // gaps widen as coin slows
        const vol = Math.max(0.015, 0.1 - i * 0.007);
        const freq = 2800 - i * 55;
        this.noiseBlip(ctx, t + offset, 0.035, vol, freq, 12);
        offset += interval;
      }
      // Final landing thud
      this.noiseBlip(ctx, t + offset, 0.09, 0.14, 1600, 5);
      // Resonant metallic ring that fades with the coin
      this.osc(ctx, 1760, 'sine', t, t + 0.85, 0.05, 0.003);
      this.osc(ctx, 2640, 'sine', t, t + 0.5, 0.03, 0.002);
      // Gold shimmer high tone
      this.osc(ctx, AFFINITY_FREQUENCIES.singularity, 'sine', t + 0.04, t + 1.0, 0.04, 0.008);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Poker chips cascading — rapid metallic clicks with descending pitch + scatter. */
  playChipsCollected() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;

      let offset = 0;
      for (let i = 0; i < 8; i++) {
        const gap = 0.045 + Math.random() * 0.03;
        const vol = 0.09 - i * 0.006;
        const freq = 3200 - i * 180 + (Math.random() - 0.5) * 300;
        this.noiseBlip(ctx, t + offset, 0.04, Math.max(0.02, vol), freq, 9);
        if (i % 2 === 0) {
          this.osc(ctx, freq * 0.5, 'triangle', t + offset, t + offset + 0.06, vol * 0.3, 0.002);
        }
        offset += gap;
      }

      for (let i = 0; i < 4; i++) {
        const scatter = offset + 0.02 + Math.random() * 0.12;
        const freq = 1800 + Math.random() * 800;
        this.noiseBlip(ctx, t + scatter, 0.03, 0.04, freq, 7);
      }

      this.noiseBlip(ctx, t + offset + 0.08, 0.1, 0.1, 1400, 4);

      this.osc(ctx, 440, 'sine', t + 0.02, t + 0.6, 0.04, 0.005);
      this.osc(ctx, 660, 'sine', t + 0.05, t + 0.4, 0.025, 0.004);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * Brief recalibration cue — plays when a player or AI switches its active
   * Luminary affinity. Distinct from Harness/Forge cues: a quick descending
   * two-pitch shimmer with a soft mid-range click, suggesting a gear-shift or
   * strategic pivot.
   *
   * When `affinityKey` is supplied the chime is pitched to that affinity's AFFINITY_FREQUENCIES
   * entry so each affinity colour has a unique sound signature.  When omitted the
   * call falls back to a neutral 740 Hz root (preserving the original behaviour).
   *
   * Pitch relationships (ratio-based so the descending shape is consistent):
   *   tone 1  — base × 1.00  (root)
   *   tone 2  — base × 0.75  (descending minor-third-ish)
   *   noise   — base × 1.20  (mid-range tactile click)
   *   shimmer — base × 2.00  (sparkling harmonic overtone)
   */
  playAffinitySwitch(affinityKey?: AffinityKey) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const base = affinityKey ? AFFINITY_FREQUENCIES[affinityKey] : 740;
      // Two descending sine tones — "cycling down to next setting"
      this.osc(ctx, base, 'sine', t, t + 0.18, 0.06, 0.004);
      this.osc(ctx, base * 0.75, 'sine', t + 0.1, t + 0.32, 0.07, 0.005);
      // Soft mid-range click for tactile punctuation
      this.noiseBlip(ctx, t + 0.08, 0.05, 0.05, base * 1.2, 7);
      // Faint high shimmer to keep it cosmic
      this.osc(ctx, base * 2, 'sine', t + 0.16, t + 0.38, 0.025, 0.008);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * Soft crackle + ember whoosh for a card burn event (~320 ms).
   * Plays at the moment BurnFlash fires so it lands in sync with the
   * visual heat-fracture phase.  Volume is intentionally low (~0.06 peak)
   * so it blends under ambient music without dominating.
   *
   * Sound anatomy:
   *   0–160 ms  — ember rush: low-pass noise sweep from 80→300 Hz (the fire
   *               catching, a warm airy whoosh rather than a harsh crack).
   *   0–320 ms  — sub-bass ember thud: sine at ~68 Hz anchors the energy.
   *   20–300 ms — crackle pops: 4 short bandpass noise blips staggered at
   *               irregular intervals, centred 350–600 Hz (dry wood snapping).
   *   100–280 ms — brief high sizzle: bandpass burst at ~2 kHz (the momentary
   *               paper/fibre ignition pop).
   * When multiple cards burn in the same batch, pass a 0-based `index` so
   * each subsequent burn is offset by 80 ms, producing a staggered cluster
   * crackle instead of overlapping sounds.  Single burns (index=0) are
   * unaffected.
   *
   * Pass `total` (cluster size) alongside `index` so the volume of each
   * subsequent burn scales up modestly — a 3-card cluster feels noticeably
   * heftier than a single burn.  Scale factor: Math.min(1 + index * 0.12, 1.5),
   * capping at 1.5× so the last card in a large batch never clips.
   * Single burns (total=1 or index=0) produce scale=1.0 and are unaffected.
   */
  playCardBurn(index = 0, total = 1) {
    if (this.muted) return;
    try {
      const volScale = total > 1 ? Math.min(1 + index * 0.12, 1.5) : 1;
      const ctx = this.initCtx();
      const t = ctx.currentTime + index * 0.08;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.72 * volScale, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 900 + index * 80);

      this.noiseSweep(ctx, t, 0.32, 0.055, 90, 720, bus);
      this.osc(ctx, 68, 'sine', t, t + 0.44, 0.075, 0.006, bus);
      [0.035, 0.105, 0.19, 0.285].forEach((offset, popIndex) => {
        this.noiseBlip(
          ctx,
          t + offset,
          0.028 + popIndex * 0.006,
          0.035 - popIndex * 0.004,
          390 + popIndex * 115,
          7,
          bus,
        );
      });
      this.noiseBlip(ctx, t + 0.11, 0.17, 0.018, 2_150, 3.5, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Plays the procedural impact when arrival beams land on condemned/marked cards. */
  playBrandStrike() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.74, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 1_100);
      this.noiseSweep(ctx, t, 0.24, 0.052, 3_600, 540, bus);
      this.noiseBlip(ctx, t + 0.075, 0.095, 0.075, 820, 5, bus);
      this.osc(ctx, 110, 'sine', t + 0.065, t + 0.58, 0.12, 0.004, bus);
      this.osc(ctx, 440, 'triangle', t + 0.08, t + 0.38, 0.038, 0.003, bus);
      this.osc(ctx, 880, 'sine', t + 0.09, t + 0.52, 0.023, 0.004, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  playForgottenForge() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.58, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 1_700);
      this.noiseSweep(ctx, t, 0.72, 0.026, 1_500, 90, bus);
      this.osc(ctx, 73.42, 'sine', t + 0.04, t + 1.18, 0.065, 0.09, bus);
      this.osc(ctx, 103.83, 'triangle', t + 0.16, t + 0.92, 0.027, 0.12, bus);
      this.osc(ctx, 311.13, 'sine', t + 0.28, t + 0.76, 0.014, 0.08, bus);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  playForgottenHour(fadeOptions?: { fadeInMs?: number; fadeOutStartMs?: number; fadeOutMs?: number }) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const ag = ctx.createGain();

      const fadeInS = (fadeOptions?.fadeInMs ?? 0) / 1000;
      const fadeOutStartS = fadeOptions?.fadeOutStartMs ?? null;
      const fadeOutS = (fadeOptions?.fadeOutMs ?? 100) / 1000;

      if (fadeInS > 0) {
        ag.gain.setValueAtTime(0, t);
        ag.gain.linearRampToValueAtTime(1, t + fadeInS);
      } else {
        ag.gain.setValueAtTime(1, t);
      }

      if (fadeOutStartS !== null) {
        const foStart = t + fadeOutStartS / 1000;
        ag.gain.setValueAtTime(1, foStart);
        ag.gain.linearRampToValueAtTime(0, foStart + fadeOutS);
      }

      ag.connect(ctx.destination);
      // This restrained procedural cue deliberately outlives the branding
      // director. Keep it off the source activation bus so director completion
      // cannot cut its tail.
      this.registerTransientBus([ag], 6_000);
      this.noiseSweep(ctx, t, 2.8, 0.018, 1_200, 48, ag);
      this.osc(ctx, 36.71, 'sine', t, t + 4.45, 0.052, 0.42, ag);
      this.osc(ctx, 55, 'sine', t + 0.18, t + 4.2, 0.034, 0.54, ag);
      this.osc(ctx, 77.78, 'triangle', t + 0.42, t + 3.9, 0.018, 0.5, ag);
      [0.35, 1.7, 3.05].forEach((offset, toneIndex) => {
        this.osc(
          ctx,
          311.13 / (toneIndex + 1),
          'sine',
          t + offset,
          t + offset + 0.82,
          0.013,
          0.16,
          ag,
        );
      });
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Unlock the demo's audio context while a Replay/Play gesture is active. */
  prepareForgeRefillAudio() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      void this.loadAudioAsset(CARD_DRAW_MP3, ctx).catch(() => {});
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  private createForgeRefillBus(
    ctx: AudioContext,
    kind: 'swell' | 'settle',
    lifetimeMs: number,
  ) {
    const bus = ctx.createGain();
    bus.connect(ctx.destination);
    const sources: AudioScheduledSourceNode[] = [];
    const cleanupTimer = setTimeout(() => this.disposeForgeRefillBus(bus), lifetimeMs);
    this.forgeRefillSounds.set(bus, { kind, sources, cleanupTimer });
    return { bus, sources };
  }

  private disposeForgeRefillBus(bus: GainNode) {
    const sound = this.forgeRefillSounds.get(bus);
    if (!sound) return;
    clearTimeout(sound.cleanupTimer);
    for (const source of sound.sources) {
      try { source.stop(); } catch {}
      this.disconnect(source);
      for (const node of this.transientVoices.get(source) ?? []) this.disconnect(node);
      this.transientVoices.delete(source);
    }
    this.disconnect(bus);
    this.forgeRefillSounds.delete(bus);
  }

  private stopForgeRefillSounds() {
    for (const bus of [...this.forgeRefillSounds.keys()]) this.disposeForgeRefillBus(bus);
  }

  /** A breath of cosmic matter; the Artifact's reveal owns the familiar chime. */
  startForgeRefill({ durationMs, delayMs = 0 }: {
    durationMs: number;
    delayMs?: number;
  }): ForgeRefillSound {
    const silent: ForgeRefillSound = { reveal() {}, complete() {}, cancel() {} };
    if (this.muted) return silent;
    let bus: GainNode | undefined;
    try {
      const ctx = this.initCtx();
      // Decode during formation so the familiar deal cue can start on reveal.
      void this.loadAudioAsset(CARD_DRAW_MP3, ctx).catch(() => {});
      const duration = Math.max(0.12, durationMs / 1000);
      const delay = Math.max(0, delayMs / 1000);
      const start = ctx.currentTime + delay;
      const end = start + duration;
      const activeSwells = [...this.forgeRefillSounds.values()]
        .filter((sound) => sound.kind === 'swell' && sound.sources.length > 0).length;
      const sound = this.createForgeRefillBus(ctx, 'swell', (delay + duration + 1) * 1000);
      bus = sound.bus;

      // A whole row can refill at once. Only three carry the atmospheric bed;
      // all slots retain their reveal cue, which is coalesced below.
      if (activeSwells < 3) {
        const level = 1 / Math.sqrt(activeSwells + 1);
        const breath = ctx.createBufferSource();
        breath.buffer = this.buildNoiseBuffer(ctx, duration);
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 0.65;
        filter.frequency.setValueAtTime(320, start);
        filter.frequency.exponentialRampToValueAtTime(1_050, start + duration * 0.48);
        filter.frequency.exponentialRampToValueAtTime(440, end);
        const envelope = ctx.createGain();
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(0.018 * level, start + duration * 0.34);
        envelope.gain.linearRampToValueAtTime(0.008 * level, start + duration * 0.7);
        envelope.gain.linearRampToValueAtTime(0, end);
        breath.connect(filter);
        filter.connect(envelope);
        envelope.connect(bus);
        this.trackVoice(breath, [filter, envelope]);
        sound.sources.push(breath);
        breath.start(start);
        breath.stop(end + 0.02);

        // Close, slowly converging tones add a gentle shimmer without a
        // percussive attack or an industrial/metallic texture.
        for (const [frequency, volume, detune] of [[196, 0.011, -7], [293.66, 0.006, 6]]) {
          const tone = this.osc(ctx, frequency, 'sine', start, end, volume * level, duration * 0.42, bus);
          tone.o.detune.setValueAtTime(detune, start);
          tone.o.detune.linearRampToValueAtTime(0, end);
          sound.sources.push(tone.o);
        }
      }

      const activeBus = bus;
      let finished = false;
      let revealed = false;
      return {
        reveal: () => {
          if (finished || revealed || !this.forgeRefillSounds.has(activeBus)) return;
          revealed = true;
          this.playForgeRefill({ cardDeal: true });
        },
        complete: () => {
          if (finished || !this.forgeRefillSounds.has(activeBus)) return;
          finished = true;
          this.disposeForgeRefillBus(activeBus);
        },
        cancel: () => {
          if (finished) return;
          finished = true;
          this.disposeForgeRefillBus(activeBus);
        },
      };
    } catch (e) {
      if (bus) this.disposeForgeRefillBus(bus);
      console.warn('SFX failed', e);
      return silent;
    }
  }

  /** Cosmic reveal uses the original card-deal cue; fallback pulses retain their quiet contact. */
  playForgeRefill({ cardDeal = false }: { cardDeal?: boolean } = {}) {
    if (this.muted) return;
    let bus: GainNode | undefined;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      if (t - this.lastForgeRefillChimeAt < 0.25) return;
      this.lastForgeRefillChimeAt = t;
      const sound = this.createForgeRefillBus(ctx, 'settle', cardDeal ? 2_600 : 950);
      bus = sound.bus;
      if (cardDeal) this.playCardDraw(bus);
      else sound.sources.push(...this.playMoldSettle(ctx, t, 0.85, bus));
    } catch (e) {
      if (bus) this.disposeForgeRefillBus(bus);
      console.warn('SFX failed', e);
    }
  }

  /** Physical card flip — plays the Card draw.mp3 asset. */
  playCardFlip() {
    if (this.muted) return;
    const ctx = this.initCtx();
    this.scheduleAudioAsset(CARD_DRAW_MP3, ctx.currentTime, 0.85);
  }

  playBonusAbyss() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      this.osc(ctx, 55, 'sine', t, t + 1.8, 0.18, 0.04);
      this.osc(ctx, 82.5, 'sine', t, t + 1.4, 0.12, 0.05);
      this.osc(ctx, 110, 'sine', t + 0.1, t + 1.6, 0.06, 0.06);
      this.noiseSweep(ctx, t, 1.2, 0.07, 80, 40);
      this.noiseBlip(ctx, t + 0.3, 0.6, 0.05, 120, 2);
      this.osc(ctx, 165, 'triangle', t + 0.5, t + 1.5, 0.03, 0.08);
      this.noiseSweep(ctx, t + 0.8, 0.6, 0.04, 200, 60);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  playBonusFlare() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      this.osc(ctx, 880, 'sine', t, t + 0.6, 0.1, 0.003);
      this.osc(ctx, 1320, 'sine', t + 0.02, t + 0.4, 0.05, 0.003);
      for (let i = 0; i < 6; i++) {
        const at = t + 0.05 + i * 0.12;
        const freq = 1200 + Math.random() * 1600;
        this.noiseBlip(ctx, at, 0.04 + Math.random() * 0.03, 0.06 - i * 0.006, freq, 6 + Math.random() * 4);
      }
      this.osc(ctx, 440, 'sawtooth', t + 0.1, t + 0.5, 0.03, 0.01);
      this.noiseSweep(ctx, t + 0.3, 0.35, 0.05, 600, 2200);
      this.noiseBlip(ctx, t + 0.55, 0.15, 0.04, 3000, 3);
      this.osc(ctx, 659.25, 'sine', t + 0.6, t + 1.2, 0.04, 0.01);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  playBonusContinuum() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bufLen = Math.ceil(ctx.sampleRate * 2.0);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < bufLen; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(200, t);
      lp.frequency.linearRampToValueAtTime(800, t + 0.6);
      lp.frequency.linearRampToValueAtTime(300, t + 1.5);
      lp.Q.value = 1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.1, t + 0.4);
      g.gain.linearRampToValueAtTime(0.06, t + 1.0);
      g.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
      src.connect(lp);
      lp.connect(g);
      g.connect(ctx.destination);
      this.trackVoice(src, [lp, g]);
      src.start(t);
      src.stop(t + 2.1);
      this.osc(ctx, 220, 'sine', t + 0.1, t + 1.6, 0.05, 0.08);
      this.osc(ctx, 330, 'sine', t + 0.3, t + 1.4, 0.03, 0.06);
      this.osc(ctx, 523.25, 'sine', t + 0.8, t + 1.8, 0.04, 0.05);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  playBonusVerdance() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const notes = [261.6, 329.6, 392.0, 440.0, 523.25, 587.33, 659.25];
      notes.forEach((f, i) => {
        const at = t + i * 0.14;
        const dur = 0.6 - i * 0.04;
        this.osc(ctx, f, 'sine', at, at + Math.max(dur, 0.25), 0.07 - i * 0.005, 0.02);
        if (i % 2 === 0) {
          this.osc(ctx, f * 0.5, 'sine', at, at + dur + 0.2, 0.03, 0.03);
        }
      });
      this.noiseSweep(ctx, t, 0.8, 0.03, 400, 1200);
      this.noiseBlip(ctx, t + 0.5, 0.3, 0.03, 800, 2);
      this.osc(ctx, 196, 'sine', t, t + 1.5, 0.04, 0.06);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  playBonusRadiance() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      this.osc(ctx, 783.99, 'sine', t, t + 1.8, 0.08, 0.01);
      this.osc(ctx, 1046.5, 'sine', t + 0.05, t + 1.4, 0.05, 0.015);
      this.osc(ctx, 1568, 'sine', t + 0.1, t + 1.0, 0.03, 0.02);
      this.osc(ctx, 392, 'sine', t + 0.15, t + 1.6, 0.04, 0.03);
      this.noiseBlip(ctx, t + 0.2, 0.5, 0.04, 3000, 2);
      this.noiseBlip(ctx, t + 0.5, 0.4, 0.03, 4000, 3);
      this.osc(ctx, 2093, 'sine', t + 0.6, t + 1.2, 0.02, 0.01);
      this.osc(ctx, 1318.5, 'sine', t + 0.8, t + 1.5, 0.025, 0.01);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  // ── Summon-cutscene helpers ──────────────────────────────────────────────

  /** Oscillator with an LFO applied to frequency — produces an organic warble. */
  private wobble(ctx: AudioContext, startTime: number, durationMs: number, freq: number, lfoHz: number, vol: number, dest?: AudioNode) {
    const dur = durationMs / 1000;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfg = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq;
    lfo.type = 'sine';
    lfo.frequency.value = lfoHz;
    lfg.gain.value = freq * 0.05;
    lfo.connect(lfg);
    lfg.connect(o.frequency);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + 0.08);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    o.connect(g);
    g.connect(dest ?? ctx.destination);
    this.trackVoice(o, [g]);
    this.trackVoice(lfo, [lfg]);
    lfo.start(startTime);
    o.start(startTime);
    lfo.stop(startTime + dur + 0.05);
    o.stop(startTime + dur + 0.05);
  }

  /** Oscillator that glides from freqStart to freqEnd over durationMs. */
  private risingTone(ctx: AudioContext, startTime: number, durationMs: number, freqStart: number, freqEnd: number, vol: number, dest?: AudioNode) {
    const dur = durationMs / 1000;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freqStart, startTime);
    o.frequency.exponentialRampToValueAtTime(freqEnd, startTime + dur);
    g.gain.setValueAtTime(0, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime + dur * 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, startTime + dur);
    o.connect(g);
    g.connect(dest ?? ctx.destination);
    this.trackVoice(o, [g]);
    o.start(startTime);
    o.stop(startTime + dur + 0.05);
  }

  /** Broad spatial rush synchronized to the freed entity's left-to-center arc. */
  private luminarySweepIn(
    ctx: AudioContext,
    startTime: number,
    durationMs: number,
    dest?: AudioNode,
    intensity = 1,
  ) {
    const duration = Math.max(0.2, durationMs / 1000);
    const bufferLength = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferLength, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < bufferLength; index += 1) {
      samples[index] = Math.random() * 2 - 1;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 0.85;
    filter.frequency.setValueAtTime(240, startTime);
    filter.frequency.exponentialRampToValueAtTime(3_200, startTime + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.linearRampToValueAtTime(0.042 * intensity, startTime + Math.min(0.16, duration * 0.2));
    gain.gain.linearRampToValueAtTime(0.072 * intensity, startTime + duration * 0.74);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    const voiceNodes: AudioNode[] = [filter];
    source.connect(filter);
    let tail: AudioNode = filter;
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(-0.78, startTime);
      panner.pan.linearRampToValueAtTime(-0.16, startTime + duration * 0.74);
      panner.pan.linearRampToValueAtTime(0, startTime + duration);
      tail.connect(panner);
      tail = panner;
      voiceNodes.push(panner);
    }
    tail.connect(gain);
    gain.connect(dest ?? ctx.destination);
    voiceNodes.push(gain);
    this.trackVoice(source, voiceNodes);
    source.start(startTime);
    source.stop(startTime + duration + 0.05);
  }

  /**
   * Fetch, decode, and play an audio asset at an absolute AudioContext time.
   * Fire-and-forget: await not required at the call site.
   * Returns silently if the scheduled window has already passed or audio is muted.
   */
  private loadAudioAsset(url: string, ctx: AudioContext): Promise<AudioBuffer> {
    let audioPromise = this.decodedAudio.get(url);
    if (!audioPromise) {
      audioPromise = fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unable to load audio asset: ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then(arrayBuffer => ctx.decodeAudioData(arrayBuffer))
        .catch((error) => {
          this.decodedAudio.delete(url);
          throw error;
        });
      this.decodedAudio.set(url, audioPromise);
    }
    return audioPromise;
  }

  private async scheduleAudioAsset(url: string, scheduledTime: number, volume: number, fadeOut?: { afterSeconds: number; durationSeconds: number }, dest?: AudioNode, attackSeconds = 0, attackStartRatio = 0, sourceOffsetSeconds = 0, playbackDurationSeconds?: number): Promise<void> {
    if (this.muted) return;
    const epoch = this.transientEpoch;
    const refillSound = dest ? this.forgeRefillSounds.get(dest as GainNode) : undefined;
    try {
      const ctx = this.initCtx();
      const audioBuf = await this.loadAudioAsset(url, ctx);
      if (this.muted || epoch !== this.transientEpoch) return;
      if (refillSound && this.forgeRefillSounds.get(dest as GainNode) !== refillSound) return;
      const now = ctx.currentTime;
      if (now > scheduledTime + 0.6) return; // missed the window; skip silently
      const startAt = Math.max(now, scheduledTime);
      const src = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = audioBuf;
      if (attackSeconds > 0) {
        gain.gain.setValueAtTime(Math.max(0.001, volume * attackStartRatio), startAt);
        gain.gain.linearRampToValueAtTime(volume, startAt + attackSeconds);
      } else {
        gain.gain.setValueAtTime(volume, startAt);
      }
      if (fadeOut) {
        const fadeStart = startAt + fadeOut.afterSeconds;
        gain.gain.setValueAtTime(volume, fadeStart);
        gain.gain.linearRampToValueAtTime(0, fadeStart + fadeOut.durationSeconds);
      }
      src.connect(gain);
      // When a bus node is provided (e.g. _arrivalMasterGain), route through it
      // so a gain ramp on the bus silences this source even if decode finishes
      // after the ramp was scheduled (race-free skip behaviour).
      gain.connect(dest ?? ctx.destination);
      this.trackVoice(src, [gain]);
      refillSound?.sources.push(src);
      const sourceOffset = Math.min(
        Math.max(0, sourceOffsetSeconds),
        Math.max(0, audioBuf.duration - 0.01),
      );
      const boundedDuration = playbackDurationSeconds == null
        ? undefined
        : Math.min(
            Math.max(0.01, playbackDurationSeconds),
            Math.max(0.01, audioBuf.duration - sourceOffset),
          );
      if (boundedDuration === undefined) {
        src.start(startAt, sourceOffset);
      } else {
        src.start(startAt, sourceOffset, boundedDuration);
      }
    } catch (e) {
      console.warn('[Luminae] Audio asset schedule failed', e);
    }
  }

  // ── Luminary Arrival Cutscene ────────────────────────────────────────────
  // All sounds are pre-scheduled at AudioContext times matching the visual
  // phase durations in LuminaryArrivalCutscene.  Routed through a shared
  // DynamicsCompressor to prevent clipping when layers peak together.
  //
  // Beat offsets are exported through ARRIVAL_CUTSCENE_BEATS_MS so the canvas
  // cutscene and Web Audio scheduler share one timing contract.
  /**
   * Maps the 12 aura style keys to one of 6 sound groups.
   * Unrecognised styles fall through to 'radiant' (the generic bright swell).
   */
  private auraStyleGroup(auraStyle: string): string {
    const MAP: Record<string, string> = {
      fire: 'fire', // Ember Sovereign, Moth
      oracle: 'fire', // Oracle (amber burn)
      storm: 'storm', // Iron Harbinger
      astral: 'storm', // Astral (fire/ice electric)
      tide: 'tide', // Tide Luminary
      compass: 'tide', // Compass (orbital wave)
      void: 'void', // Void
      null: 'void', // Null Sovereign (entropy, silence)
      radiant: 'radiant', // Radiant (crystalline order)
      pale: 'radiant', // Pale (silver/pearl shimmer)
      verdant: 'verdant', // Verdant Oracle
      bloom: 'verdant', // Bloom Tyrant (organic swell)
    };
    return MAP[auraStyle] ?? 'radiant';
  }

  /**
   * Synthesises the flash-phase reveal burst tuned to the Luminary's aura group.
   * Called from playArrivalCutscene() at the FLASH beat (t + FLASH/1000).
   * All oscillators/noise are routed to `D` (the shared compressor bus).
   *
   * Groups and their sonic character:
   *   fire    — hot crackle + sawtooth roar + rising sweep
   *   storm   — rapid electric arc pops + descending high sweep
   *   tide    — deep ocean rumble + layered pad chord + high shimmer
   *   void    — sub-bass implosion + descending sweep (dark collapse)
   *   radiant — pure sine Cmaj7 chord + crystal bell harmonics (default)
   *   verdant — organic layered mid-range chord + nature whoosh
   */
  private flashSynthForStyle(ctx: AudioContext, at: number, group: string, D: AudioNode) {
    switch (group) {
      case 'fire': {
        // Crackle + roar: sawtooth harmonics simulate heat shimmer
        this.osc(ctx, 880, 'sawtooth', at, at + 0.35, 0.075, 0.008, D);
        this.osc(ctx, 440, 'sawtooth', at, at + 0.55, 0.045, 0.01, D);
        // Rapid crackle pops staggered over 0.4 s
        for (let i = 0; i < 5; i++) {
          const cr = at + i * 0.09 + Math.random() * 0.04;
          this.noiseBlip(ctx, cr, 0.04, 0.068 - i * 0.008, 1400 + Math.random() * 1200, 5, D);
        }
        // Rising fire sweep — energy climbing
        this.noiseSweep(ctx, at + 0.1, 0.65, 0.065, 600, 2400, D);
        // Bright hot shimmer tail
        this.osc(ctx, 1760, 'sine', at + 0.2, at + 0.82, 0.038, 0.01, D);
        break;
      }
      case 'storm': {
        // Rapid electric arc pops — staccato lightning strikes
        for (let i = 0; i < 7; i++) {
          const cr = at + i * 0.058 + Math.random() * 0.018;
          this.noiseBlip(ctx, cr, 0.022, Math.max(0.02, 0.08 - i * 0.008), 3000 + Math.random() * 2000, 10, D);
        }
        // Sharp electric crack — leading edge
        this.osc(ctx, 2200, 'sine', at, at + 0.2, 0.065, 0.004, D);
        this.osc(ctx, 3300, 'sine', at + 0.04, at + 0.16, 0.038, 0.004, D);
        // Descending high sweep — discharge falling away
        this.noiseSweep(ctx, at, 0.45, 0.085, 4000, 800, D);
        // Ringing afterglow
        this.osc(ctx, 1320, 'sine', at + 0.3, at + 0.88, 0.052, 0.015, D);
        break;
      }
      case 'tide': {
        // Ocean surge: wide low-freq sweep from sub to mid
        this.noiseSweep(ctx, at, 0.7, 0.09, 80, 600, D);
        // Deep resonant pad chord — water-column harmonics
        this.osc(ctx, 110, 'sine', at, at + 0.82, 0.1, 0.04, D);
        this.osc(ctx, 220, 'sine', at + 0.05, at + 0.78, 0.07, 0.04, D);
        this.osc(ctx, 330, 'sine', at + 0.1, at + 0.72, 0.05, 0.035, D);
        // High-freq sea-spray shimmer at the crest
        this.noiseBlip(ctx, at + 0.4, 0.55, 0.058, 5200, 2.5, D);
        this.osc(ctx, 1320, 'sine', at + 0.5, at + 0.92, 0.038, 0.018, D);
        break;
      }
      case 'void': {
        // Sub-bass implosion — descending collapse into silence
        this.osc(ctx, 55, 'sine', at, at + 0.9, 0.115, 0.01, D);
        this.osc(ctx, 38, 'sine', at, at + 0.8, 0.085, 0.012, D);
        // Descending noise sweep (high → sub) — implosion shape, not explosion
        this.noiseSweep(ctx, at, 0.55, 0.068, 1400, 60, D);
        this.osc(ctx, 220, 'sine', at, at + 0.45, 0.048, 0.008, D);
        // Dark whisper — a barely-there shimmer that fades to nothing
        this.osc(ctx, 440, 'sine', at + 0.3, at + 0.88, 0.022, 0.03, D);
        break;
      }
      case 'radiant': {
        // Crystal chord: Cmaj7 — pure sine, clear and luminous
        [523.25, 659.25, 783.99, 987.77].forEach((f, i) => {
          this.osc(ctx, f, 'sine', at + 0.022 + i * 0.016, at + 0.91, 0.075, 0.012, D);
        });
        this.osc(ctx, 880, 'sine', at, at + 0.46, 0.11, 0.008, D);
        this.osc(ctx, 1320, 'sine', at, at + 0.31, 0.055, 0.008, D);
        this.noiseBlip(ctx, at + 0.038, 0.6, 0.085, 5400, 2.0, D);
        // High crystal bell overtone
        this.osc(ctx, 2093, 'sine', at + 0.25, at + 0.88, 0.028, 0.012, D);
        break;
      }
      case 'verdant': {
        // Organic layered mid chord — living harmonics
        this.osc(ctx, 196, 'sine', at, at + 0.88, 0.09, 0.04, D);
        this.osc(ctx, 293, 'sine', at + 0.05, at + 0.82, 0.072, 0.04, D);
        this.osc(ctx, 392, 'sine', at + 0.1, at + 0.76, 0.058, 0.038, D);
        this.osc(ctx, 587, 'sine', at + 0.15, at + 0.7, 0.045, 0.035, D);
        // Nature whoosh — wind through leaves
        this.noiseSweep(ctx, at, 0.6, 0.058, 200, 1200, D);
        this.noiseBlip(ctx, at + 0.35, 0.5, 0.052, 3800, 2.5, D);
        // Soft high shimmer — sunlight through canopy
        this.osc(ctx, 1047, 'sine', at + 0.45, at + 0.92, 0.033, 0.018, D);
        break;
      }
      default: {
        // Fallback — same as 'radiant' (explicit, not silent)
        [523.25, 659.25, 783.99, 987.77].forEach((f, i) => {
          this.osc(ctx, f, 'sine', at + 0.022 + i * 0.016, at + 0.91, 0.075, 0.012, D);
        });
        this.osc(ctx, 880, 'sine', at, at + 0.46, 0.11, 0.008, D);
        this.osc(ctx, 1320, 'sine', at, at + 0.31, 0.055, 0.008, D);
        this.noiseBlip(ctx, at + 0.038, 0.6, 0.085, 5400, 2.0, D);
        this.noiseBlip(ctx, at + 0.24, 0.5, 0.06, 6600, 2.5, D);
        break;
      }
    }
  }

  /**
   * Restored original Luminary arrival arrangement. The synthesis voices and
   * harmony match the first production cue, retimed to the current shared
   * arrival beats so every client stays synchronized with the modern cutscene.
   */
  private playFirstResonanceArrivalCutscene() {
    try {
      this.stopArrivalCutscene();
      const ctx = this.initCtx();
      const t = ctx.currentTime;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 10;
      comp.ratio.value = 8;
      comp.attack.value = 0.002;
      comp.release.value = 0.18;

      const masterGain = ctx.createGain();
      masterGain.gain.value = 1;
      comp.connect(masterGain);
      masterGain.connect(ctx.destination);
      this.arrivalBuses.set(masterGain, { compressor: comp, cleanupTimer: null });
      this.scheduleArrivalBusCleanup(masterGain, 11_000);

      const D = comp;
      const s = (ms: number) => t + ms / 1000;
      const PAN = ARRIVAL_CUTSCENE_BEATS_MS.pan;
      const FOCUS = ARRIVAL_CUTSCENE_BEATS_MS.focus;
      const INTRO = ARRIVAL_CUTSCENE_BEATS_MS.intro;
      const PRES = ARRIVAL_CUTSCENE_BEATS_MS.pressure;
      const CRACK1 = ARRIVAL_CUTSCENE_BEATS_MS.firstCrack;
      const LEAK = ARRIVAL_CUTSCENE_BEATS_MS.leak;
      const CRACK2 = ARRIVAL_CUTSCENE_BEATS_MS.secondCrack;
      const CRACKS = ARRIVAL_CUTSCENE_BEATS_MS.cracking;
      const SHATT = ARRIVAL_CUTSCENE_BEATS_MS.shatter;
      const FLASH = ARRIVAL_CUTSCENE_BEATS_MS.flash;
      const REVL = ARRIVAL_CUTSCENE_BEATS_MS.reveal;
      const SWEEP = LUMINARY_SWEEP_IN_BEATS_MS.start;

      this.duckMusic(0.06, 1.55, 0.32, 1.65, Math.max(0, SHATT / 1000 - 0.48));

      // Anticipation and camera focus.
      this.noiseBlip(ctx, s(60), 0.5, 0.022, 4600, 2, D);
      this.osc(ctx, 55, 'sine', s(0), s(FOCUS + 200), 0.07, 0.45, D);
      this.noiseSweep(ctx, s(PAN), 1.1, 0.1, 55, 700, D);
      this.osc(ctx, 45, 'sine', s(PAN), s(FOCUS + 420), 0.1, 0.28, D);
      this.noiseBlip(ctx, s(FOCUS + 130), 0.5, 0.038, 3800, 3, D);
      this.osc(ctx, 1760, 'sine', s(FOCUS + 180), s(FOCUS + 600), 0.032, 0.06, D);
      this.osc(ctx, 110, 'sine', s(INTRO), s(PRES), 0.05, 0.3, D);
      this.risingTone(ctx, s(INTRO + 120), Math.max(240, PRES - INTRO), 155, 215, 0.04, D);

      // The first cue's high crystalline stress signature.
      for (let i = 0; i < 5; i++) {
        const at = s(PRES + i * 72 + Math.random() * 12);
        this.noiseBlip(
          ctx,
          at,
          0.034,
          0.038 + Math.random() * 0.022,
          2300 + Math.random() * 750,
          14,
          D,
        );
      }
      this.osc(ctx, 82, 'sine', s(PRES), s(CRACK1), 0.08, 0.1, D);
      this.wobble(ctx, s(PRES), Math.max(260, CRACK1 - PRES), 220, 9, 0.05, D);

      this.noiseBlip(ctx, s(CRACK1), 0.055, 0.15, 3700, 24, D);
      this.osc(ctx, 2093, 'sine', s(CRACK1), s(CRACK1 + 520), 0.09, 0.003, D);
      this.osc(ctx, 3520, 'sine', s(CRACK1 + 8), s(CRACK1 + 250), 0.04, 0.002, D);
      this.osc(ctx, 60, 'sine', s(CRACK1), s(CRACK1 + 310), 0.16, 0.005, D);
      this.osc(ctx, 42, 'sine', s(CRACK1), s(CRACK1 + 470), 0.1, 0.008, D);

      this.noiseBlip(ctx, s(LEAK), 0.68, 0.058, 4300, 2.5, D);
      this.osc(ctx, 1568, 'sine', s(LEAK + 60), s(CRACK2), 0.048, 0.1, D);
      this.risingTone(ctx, s(LEAK), Math.max(360, CRACK2 - LEAK), 185, 365, 0.058, D);

      [0, 105, 220, 335].forEach((off, i) => {
        this.noiseBlip(ctx, s(CRACK2 + off), 0.038, 0.052 + i * 0.02, 2700 + i * 370, 18, D);
        this.osc(
          ctx,
          1320 + i * 255,
          'sine',
          s(CRACK2 + off),
          s(CRACK2 + off + 170),
          0.032,
          0.002,
          D,
        );
      });
      this.noiseSweep(ctx, s(CRACK2), 0.42, 0.088, 360, 3400, D);

      [0, 88, 188, 305, 455, 675, 900].forEach((off, i) => {
        const vol = 0.042 + i * 0.017;
        const freq = 2000 + i * 275 + Math.random() * 340;
        this.noiseBlip(ctx, s(CRACKS + off), 0.032, Math.min(vol, 0.13), freq, 16 + i, D);
      });
      this.noiseSweep(ctx, s(CRACKS), Math.max(0.75, (SHATT - CRACKS) / 1000), 0.1, 270, 5200, D);
      this.osc(ctx, 52, 'sine', s(CRACKS), s(SHATT), 0.09, 0.2, D);

      // Original rupture, falling shard spray, and bass bloom.
      this.noiseBlip(ctx, s(SHATT), 0.36, 0.13, 2900, 3, D);
      this.noiseBlip(ctx, s(SHATT + 18), 0.27, 0.1, 1550, 2, D);
      this.noiseBlip(ctx, s(SHATT + 42), 0.21, 0.07, 760, 1.5, D);
      for (let i = 0; i < 10; i++) {
        const at = s(SHATT + 32 + i * 68 + Math.random() * 32);
        this.noiseBlip(
          ctx,
          at,
          0.028,
          Math.max(0.008, 0.048 - i * 0.003),
          1400 + Math.random() * 3000,
          10,
          D,
        );
      }
      this.osc(ctx, 40, 'sine', s(SHATT), s(SHATT + 760), 0.14, 0.01, D);
      this.osc(ctx, 58, 'sine', s(SHATT), s(SHATT + 560), 0.08, 0.015, D);
      this.osc(ctx, 80, 'sine', s(SHATT + 18), s(SHATT + 400), 0.055, 0.02, D);

      // Follow the entity's visible sweep from the broken vessel into the
      // center of the viewport, resolving before the reveal harmony lands.
      this.luminarySweepIn(ctx, s(SWEEP), REVL - SWEEP, D);

      // The universal luminous reveal from the original production cue.
      this.osc(ctx, 880, 'sine', s(FLASH), s(FLASH + 460), 0.11, 0.008, D);
      this.osc(ctx, 1320, 'sine', s(FLASH), s(FLASH + 310), 0.055, 0.008, D);
      [523.25, 659.25, 783.99, 987.77].forEach((frequency, index) => {
        this.osc(
          ctx,
          frequency,
          'sine',
          s(FLASH + 22 + index * 16),
          s(FLASH + 910),
          0.075,
          0.012,
          D,
        );
      });
      this.noiseBlip(ctx, s(FLASH + 38), 0.6, 0.085, 5400, 2, D);
      this.noiseBlip(ctx, s(FLASH + 240), 0.5, 0.06, 6600, 2.5, D);

      this.osc(ctx, 65.41, 'sine', s(REVL), s(REVL + 3000), 0.1, 0.38, D);
      this.osc(ctx, 98, 'sine', s(REVL + 100), s(REVL + 2850), 0.07, 0.42, D);
      this.osc(ctx, 130.81, 'sine', s(REVL + 200), s(REVL + 2700), 0.06, 0.42, D);
      this.osc(ctx, 164.81, 'sine', s(REVL + 300), s(REVL + 2550), 0.042, 0.42, D);
      this.osc(ctx, 32.7, 'sine', s(REVL + 100), s(REVL + 3150), 0.08, 0.52, D);
      [523.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((frequency, index) => {
        const at = REVL + 170 + index * 300;
        const duration = Math.max(200, 1350 - index * 80);
        this.osc(
          ctx,
          frequency,
          'sine',
          s(at),
          s(at + duration),
          Math.max(0.008, 0.036 - index * 0.004),
          0.012,
          D,
        );
      });
    } catch (e) {
      console.warn('[Luminae] First Resonance arrival audio failed', e);
    }
  }

  playArrivalCutscene(
    auraStyle = 'radiant',
    soundVariant: LuminaryArrivalSoundVariant = 'standard',
  ) {
    if (this.muted) return;
    if (soundVariant === 'first_resonance') {
      this.playFirstResonanceArrivalCutscene();
      return;
    }
    try {
      this.stopArrivalCutscene();
      const ctx = this.initCtx();
      const t = ctx.currentTime;

      // Shared compressor so simultaneous layers never clip.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 10;
      comp.ratio.value = 8;
      comp.attack.value = 0.002;
      comp.release.value = 0.18;

      // Master gain for the entire procedural synthesis chain — routed between
      // the compressor and ctx.destination so stopArrivalCutscene() can ramp
      // all oscillator/noise layers to silence in one operation.
      const masterGain = ctx.createGain();
      masterGain.gain.value = 1;
      comp.connect(masterGain);
      masterGain.connect(ctx.destination);
      this.arrivalBuses.set(masterGain, { compressor: comp, cleanupTimer: null });
      this.scheduleArrivalBusCleanup(masterGain, 13_000);

      const D = comp;

      // Convenience: AudioContext seconds from a ms offset.
      const s = (ms: number) => t + ms / 1000;

      // Phase start times (ms). Canvas arrival visuals import the same values so
      // crack, shatter, flash, and reveal land on the scheduled audio beats.
      const PAN = ARRIVAL_CUTSCENE_BEATS_MS.pan;
      const FOCUS = ARRIVAL_CUTSCENE_BEATS_MS.focus;
      const INTRO = ARRIVAL_CUTSCENE_BEATS_MS.intro;
      const PRES = ARRIVAL_CUTSCENE_BEATS_MS.pressure;
      const CRACK1 = ARRIVAL_CUTSCENE_BEATS_MS.firstCrack;
      const LEAK = ARRIVAL_CUTSCENE_BEATS_MS.leak;
      const CRACK2 = ARRIVAL_CUTSCENE_BEATS_MS.secondCrack;
      const CRACKS = ARRIVAL_CUTSCENE_BEATS_MS.cracking;
      const SHATT = ARRIVAL_CUTSCENE_BEATS_MS.shatter;
      const FLASH = ARRIVAL_CUTSCENE_BEATS_MS.flash;
      const REVL = ARRIVAL_CUTSCENE_BEATS_MS.reveal;
      const SWEEP = LUMINARY_SWEEP_IN_BEATS_MS.start;
      const auraGroup = this.auraStyleGroup(auraStyle);

      // Pull the score almost completely away just before the rupture. The
      // short quiet pocket makes the breakthrough feel larger without adding
      // more peak volume.
      this.duckMusic(0.06, 1.55, 0.32, 1.65, Math.max(0, SHATT / 1000 - 0.48));

      // ── establish (0–600 ms): anticipatory shimmer + sub foundation ─────
      this.noiseBlip(ctx, s(60), 0.5, 0.022, 4600, 2, D);
      this.osc(ctx, 55, 'sine', s(0), s(FOCUS + 200), 0.07, 0.45, D);

      // ── panning + focusing (520–1820 ms): deep whoosh + sub swell ───────
      this.noiseSweep(ctx, s(PAN), 1.1, 0.1, 55, 700, D);
      this.osc(ctx, 45, 'sine', s(PAN), s(FOCUS + 420), 0.1, 0.28, D);
      // Faint shimmer as camera locks in
      this.noiseBlip(ctx, s(FOCUS + 130), 0.5, 0.038, 3800, 3, D);
      this.osc(ctx, 1760, 'sine', s(FOCUS + 180), s(FOCUS + 600), 0.032, 0.06, D);

      // ── intro + zooming (1820–2540 ms): quiet tension build ─────────────
      this.osc(ctx, 110, 'sine', s(INTRO), s(PRES), 0.05, 0.3, D);
      this.risingTone(ctx, s(INTRO + 220), 720, 155, 215, 0.04, D);

      // ── pressure (2540–2580 ms): crystalline rattle + hum + warble ──────
      for (let i = 0; i < 5; i++) {
        const at = s(PRES + i * 82 + Math.random() * 16);
        // Q=9, 500-1400 Hz — physical crystalline stress, not a tonal ping
        this.noiseBlip(ctx, at, 0.034, 0.038 + Math.random() * 0.022, 500 + Math.random() * 900, 9, D);
      }
      this.osc(ctx, 82, 'sine', s(PRES), s(CRACK1), 0.08, 0.1, D);
      this.wobble(ctx, s(PRES), 490, 220, 9, 0.05, D);

      // ── firstcrack (2580–3200 ms): structural fracture — snap + crunch + bass ─
      // Main fracture body: low-mid broadband crack (the primary "crack" sound)
      this.noiseBlip(ctx, s(CRACK1), 0.09, 0.14, 420, 9, D);
      // Sharp brittle splinter riding on top
      this.noiseBlip(ctx, s(CRACK1 + 4), 0.038, 0.11, 1050, 11, D);
      // Deep structural crunch — the material giving way
      this.noiseBlip(ctx, s(CRACK1), 0.11, 0.1, 195, 6, D);
      // Stress creak sweep: the fracture front traveling through the panel
      this.noiseSweep(ctx, s(CRACK1 + 28), 0.22, 0.052, 90, 480, D);
      // Low impact weight — preserved from original
      this.osc(ctx, 60, 'sine', s(CRACK1), s(CRACK1 + 310), 0.15, 0.005, D);
      this.osc(ctx, 42, 'sine', s(CRACK1), s(CRACK1 + 470), 0.1, 0.008, D);
      this.osc(ctx, 110, 'sine', s(CRACK1), s(CRACK1 + 200), 0.08, 0.004, D);

      // ── leaking (3200–4020 ms): energy bleed + deep pressure stress ─────
      // Airy broad energy hiss (Q=2 — very broad, not tonal)
      this.noiseBlip(ctx, s(LEAK), 0.84, 0.048, 4300, 2.0, D);
      // Low-frequency pressure moan — the vessel under internal strain
      this.noiseBlip(ctx, s(LEAK + 40), 0.5, 0.046, 480, 5, D);
      // Deep pressure build rising through the low end
      this.noiseSweep(ctx, s(LEAK + 170), 0.65, 0.038, 75, 230, D);
      // Internal pressure tone: a glide, not a ping
      this.risingTone(ctx, s(LEAK), 850, 185, 365, 0.055, D);

      // ── secondcrack (3400–3820 ms): staggered brittle physical snaps ────
      [0, 110, 240, 370].forEach((off, i) => {
        // Crack body: low-mid, low-Q — physical snap, increasing intensity
        this.noiseBlip(ctx, s(CRACK2 + off), 0.05, 0.048 + i * 0.018, 270 + i * 105, 8, D);
        // Brittle splinter tail: mid-range but still broad — not tonal
        this.noiseBlip(ctx, s(CRACK2 + off + 7), 0.026, 0.032 + i * 0.013, 720 + i * 175, 10, D);
      });
      this.noiseSweep(ctx, s(CRACK2), 0.42, 0.088, 360, 3400, D);

      // ── cracking (3820–4780 ms): escalating fracture burst — physical, no pings ─
      [0, 88, 188, 305, 455, 675].forEach((off, i) => {
        const vol = 0.038 + i * 0.016;
        // Fracture body: low-mid, Q=7 — each crack heavier than the last
        const bodyFreq = 175 + i * 68 + Math.random() * 75;
        this.noiseBlip(ctx, s(CRACKS + off), 0.04, Math.min(vol, 0.12), bodyFreq, 7, D);
        // Brittle splinter: mid, Q=9 — the sharp leading edge of each crack
        const splintFreq = 530 + i * 125 + Math.random() * 150;
        this.noiseBlip(ctx, s(CRACKS + off + 9), 0.022, Math.min(vol * 0.58, 0.08), splintFreq, 9, D);
      });
      this.noiseSweep(ctx, s(CRACKS), 0.68, 0.1, 270, 5200, D);
      this.osc(ctx, 52, 'sine', s(CRACKS), s(SHATT - 320), 0.09, 0.2, D);

      // ── shattering (4860–5700 ms): rupture + shard spray + bass bloom ────
      this.noiseBlip(ctx, s(SHATT), 0.36, 0.13, 2900, 3.0, D);
      this.noiseBlip(ctx, s(SHATT + 18), 0.27, 0.1, 1550, 2.0, D);
      this.noiseBlip(ctx, s(SHATT + 42), 0.21, 0.07, 760, 1.5, D);
      for (let i = 0; i < 10; i++) {
        const at = s(SHATT + 32 + i * 68 + Math.random() * 32);
        // Q=4 (broad), 700-2500 Hz — broadband shard scatter, not narrow pings
        this.noiseBlip(ctx, at, 0.028, Math.max(0.008, 0.048 - i * 0.003), 700 + Math.random() * 1800, 4, D);
      }
      // Descending glass scatter sweeps — energy cascading down as the panel falls
      this.noiseSweep(ctx, s(SHATT + 12), 0.5, 0.062, 3800, 850, D);
      this.noiseSweep(ctx, s(SHATT + 50), 0.4, 0.046, 2600, 600, D);
      this.osc(ctx, 40, 'sine', s(SHATT), s(SHATT + 760), 0.14, 0.01, D);
      this.osc(ctx, 58, 'sine', s(SHATT), s(SHATT + 560), 0.08, 0.015, D);
      this.osc(ctx, 80, 'sine', s(SHATT + 18), s(SHATT + 400), 0.055, 0.02, D);
      this.osc(ctx, 185, 'triangle', s(SHATT), s(SHATT + 360), 0.052, 0.008, D);

      // Keep the physical motion audible beneath every arrival arrangement.
      // First Resonance gives this layer more room; the standard mix retains
      // its affinity-specific flash as the dominant reveal accent.
      this.luminarySweepIn(ctx, s(SWEEP), REVL - SWEEP, D, 0.82);

      // ── flashing (5700–6650 ms): aura-style specific reveal burst ──────────
      // The procedural sub-impact and deterministic shatter render provide the
      // physical shockwave; flashSynthForStyle() adds Luminary-specific color.
      this.flashSynthForStyle(ctx, s(FLASH), auraGroup, D);
      const auraTailFrequency: Record<string, number> = {
        fire: 659.25,
        storm: 880,
        tide: 392,
        void: 220,
        radiant: 1046.5,
        verdant: 587.33,
      };
      const auraTail = auraTailFrequency[auraGroup] ?? auraTailFrequency.radiant;
      this.osc(ctx, auraTail, 'sine', s(FLASH + 520), s(REVL + 1150), 0.034, 0.12, D);
      this.osc(ctx, auraTail * 0.5, 'triangle', s(FLASH + 620), s(REVL + 1350), 0.02, 0.16, D);

      // ── revealed (6650–10850 ms): cosmic hum + sub + bell overtones ──────
      // C2 G2 C3 E3 warm chord — slow attack, fades before done
      this.osc(ctx, 65.41, 'sine', s(REVL), s(REVL + 3800), 0.1, 0.38, D);
      this.osc(ctx, 98.0, 'sine', s(REVL + 100), s(REVL + 3600), 0.07, 0.42, D);
      this.osc(ctx, 130.81, 'sine', s(REVL + 200), s(REVL + 3400), 0.06, 0.42, D);
      this.osc(ctx, 164.81, 'sine', s(REVL + 300), s(REVL + 3200), 0.042, 0.42, D);
      // Sub foundation
      this.osc(ctx, 32.7, 'sine', s(REVL + 100), s(REVL + 3900), 0.08, 0.52, D);
      // Soft bell overtones — staggered entry, long decay
      [523.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
        const at = REVL + 170 + i * 340;
        const dur = Math.max(200, 1600 - i * 80);
        this.osc(ctx, f, 'sine', s(at), s(at + dur), Math.max(0.008, 0.036 - i * 0.004), 0.012, D);
      });

      // Reproducible physical-glass renders sit above the procedural pressure
      // bed. They share the arrival master so skipping still silences the full
      // sequence, including a decode that completes after the skip begins.
      void this.scheduleAudioAsset(LUMINARY_GLASS_SFX.firstCrack, s(CRACK1), 0.55, undefined, masterGain);
      void this.scheduleAudioAsset(LUMINARY_GLASS_SFX.branchingFracture, s(CRACK2), 0.48, undefined, masterGain);
      void this.scheduleAudioAsset(LUMINARY_GLASS_SFX.fullShatter, s(SHATT), 0.62, undefined, masterGain);
    } catch (e) {
      console.warn('[Luminae] Summon cutscene audio failed', e);
    }
  }

  /**
   * Fade out all arrival cutscene audio (~250 ms ramp) when the player skips
   * the visual overlay.  Ramps the shared master gain to 0, silencing both
   * the procedural synthesis chain (oscillators/noise) —
   * including any whose async decode completes after this call, since those
   * sources connect to the same master gain bus which is already at 0.
   * The timer chain still runs to completion; only the audio is silenced.
   * Safe to call if no cutscene is playing.
   */
  stopArrivalCutscene() {
    const ctx = this.ctx;
    if (!ctx || this.arrivalBuses.size === 0) return;
    const now = ctx.currentTime;
    for (const gain of [...this.arrivalBuses.keys()]) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.25);
      this.scheduleArrivalBusCleanup(gain, 320);
    }
    this.restoreMusic(0.3);
  }

  /**
   * Quiet authored accents for tutorial story and doctrine beats. Production
   * action SFX still own Forge, Harness, Cipher, and Luminary spectacle; these
   * cues make the connective teaching moments audible without constant noise.
   */
  playTutorialCue(
    cue: TutorialSoundCue,
    affinity: AffinityKey = 'radiance',
  ) {
    if (this.muted) return;

    const nowMs = typeof performance === 'undefined' ? Date.now() : performance.now();
    const cueKey = `${cue}:${affinity}`;
    const lastPlayed = this.tutorialCueLastPlayed.get(cueKey) ?? -Infinity;
    // React Strict Mode may mount a presentation twice in development. Keep
    // that from turning one authored accent into a flammed double hit.
    if (nowMs - lastPlayed < 90) return;
    this.tutorialCueLastPlayed.set(cueKey, nowMs);

    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.52, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 3_400);

      switch (cue) {
        case 'lumii-contact': {
          this.osc(ctx, 98, 'sine', t, t + 1.35, 0.035, 0.18, bus);
          [261.63, 392, 659.25].forEach((frequency, index) => {
            const at = t + 0.08 + index * 0.17;
            this.osc(ctx, frequency, 'sine', at, at + 0.72, 0.026 - index * 0.004, 0.045, bus);
          });
          this.noiseSweep(ctx, t + 0.02, 0.7, 0.012, 120, 780, bus);
          break;
        }
        case 'lumii-locate': {
          this.noiseBlip(ctx, t, 0.055, 0.026, 1_500, 9, bus);
          this.osc(ctx, 783.99, 'sine', t, t + 0.62, 0.036, 0.008, bus);
          this.osc(ctx, 1_046.5, 'sine', t + 0.055, t + 0.48, 0.022, 0.006, bus);
          this.osc(ctx, 130.81, 'sine', t, t + 0.72, 0.022, 0.06, bus);
          break;
        }
        case 'lumii-presence':
        case 'luminary-signal': {
          const notes = [261.63, 329.63, 392, 523.25, 659.25, 783.99];
          notes.forEach((frequency, index) => {
            const at = t + index * 0.055;
            this.osc(ctx, frequency, 'sine', at, at + 0.68, 0.027 - index * 0.0025, 0.014, bus);
          });
          if (cue === 'luminary-signal') {
            this.osc(ctx, 65.41, 'sine', t, t + 1.15, 0.035, 0.08, bus);
            this.noiseSweep(ctx, t + 0.05, 0.8, 0.012, 160, 1_250, bus);
          }
          break;
        }
        case 'interface-reveal': {
          this.duckMusic(0.72, 0.5, 0.08, 0.7);
          this.noiseSweep(ctx, t, 0.92, 0.022, 110, 1_700, bus);
          this.osc(ctx, 65.41, 'sine', t, t + 1.45, 0.052, 0.16, bus);
          [261.63, 392, 523.25].forEach((frequency, index) => {
            this.osc(ctx, frequency, 'sine', t + 0.12 + index * 0.055, t + 1.15, 0.026 - index * 0.004, 0.08, bus);
          });
          this.noiseBlip(ctx, t + 0.58, 0.12, 0.018, 2_300, 7, bus);
          break;
        }
        case 'archive-memory': {
          [293.66, 440, 659.25].forEach((frequency, index) => {
            const at = t + index * 0.18;
            this.osc(ctx, frequency, 'sine', at, at + 0.86, 0.024 - index * 0.003, 0.05, bus);
          });
          this.noiseSweep(ctx, t + 0.05, 0.9, 0.01, 920, 180, bus);
          this.osc(ctx, 73.42, 'sine', t, t + 1.25, 0.022, 0.18, bus);
          break;
        }
        case 'transmission-fault': {
          this.duckMusic(0.4, 0.82, 0.025, 0.42);
          this.staticInterference(ctx, t, 0.96, 0.13, bus);
          this.noiseBlip(ctx, t + 0.075, 0.045, 0.055, 3_800, 0.9, bus);
          this.noiseBlip(ctx, t + 0.33, 0.032, 0.05, 5_600, 0.8, bus);
          this.noiseBlip(ctx, t + 0.71, 0.055, 0.048, 2_900, 1.1, bus);
          break;
        }
        case 'affinity-introduction': {
          const affinities: AffinityKey[] = ['flare', 'radiance', 'verdance', 'continuum', 'abyss'];
          affinities.forEach((key, index) => {
            const frequency = AFFINITY_FREQUENCIES[key];
            const at = t + 0.08 + index * 0.105;
            this.osc(ctx, frequency, 'sine', at, at + 0.72, 0.022, 0.02, bus);
            this.osc(ctx, frequency * 0.5, 'sine', at, at + 0.82, 0.012, 0.025, bus);
          });
          this.noiseSweep(ctx, t, 0.78, 0.011, 180, 1_650, bus);
          break;
        }
        case 'affinity-reveal': {
          const frequency = AFFINITY_FREQUENCIES[affinity];
          const waveByAffinity: Partial<Record<AffinityKey, OscillatorType>> = {
            flare: 'triangle',
            radiance: 'sine',
            verdance: 'sine',
            continuum: 'triangle',
            abyss: 'sine',
          };
          const wave = waveByAffinity[affinity] ?? 'sine';
          this.osc(ctx, frequency * 0.25, 'sine', t, t + 1.05, affinity === 'abyss' ? 0.05 : 0.026, 0.08, bus);
          this.osc(ctx, frequency, wave, t + 0.025, t + 0.82, 0.048, 0.018, bus);
          this.osc(ctx, frequency * 1.5, 'sine', t + 0.1, t + 0.7, 0.022, 0.02, bus);
          this.osc(ctx, frequency * 2, 'sine', t + 0.18, t + 0.58, 0.012, 0.012, bus);
          this.noiseBlip(ctx, t + 0.02, 0.08, 0.018, Math.min(3_400, frequency * 2.4), 8, bus);
          break;
        }
        case 'simulation-open': {
          this.duckMusic(0.68, 1.15, 0.06, 0.75);
          this.osc(ctx, 73.42, 'sine', t, t + 1.85, 0.064, 0.08, bus);
          this.risingTone(ctx, t + 0.03, 1_080, 110, 523.25, 0.03, bus);
          this.noiseSweep(ctx, t, 0.92, 0.029, 130, 1_850, bus);
          [0.77, 0.89, 1.01, 1.13].forEach((offset, index) => {
            const frequency = 392 + index * 98;
            this.noiseBlip(ctx, t + offset, 0.055, 0.027, 920 + index * 330, 8, bus);
            this.osc(ctx, frequency, 'sine', t + offset, t + offset + 0.42, 0.027, 0.008, bus);
          });
          this.osc(ctx, 261.63, 'sine', t + 1.15, t + 1.82, 0.033, 0.018, bus);
          this.osc(ctx, 523.25, 'sine', t + 1.18, t + 1.76, 0.024, 0.012, bus);
          break;
        }
        case 'well-infusion': {
          this.duckMusic(0.64, 1.2, 0.05, 0.72);
          this.noiseSweep(ctx, t, 1.02, 0.028, 240, 1_900, bus);
          const affinities: AffinityKey[] = ['flare', 'radiance', 'verdance', 'continuum', 'abyss'];
          affinities.forEach((key, index) => {
            const frequency = AFFINITY_FREQUENCIES[key];
            const launchAt = t + index * 0.1;
            const landAt = t + 0.67 + index * 0.1;
            this.osc(ctx, frequency * 0.5, 'sine', launchAt, landAt + 0.2, 0.016, 0.045, bus);
            this.noiseBlip(ctx, landAt, 0.055, 0.026, Math.min(3_000, frequency * 2.2), 8, bus);
            this.osc(ctx, frequency, 'sine', landAt, landAt + 0.54, 0.043, 0.012, bus);
            this.osc(ctx, frequency * 2, 'sine', landAt + 0.025, landAt + 0.34, 0.017, 0.008, bus);
          });
          const settleAt = t + 1.16;
          [196, 293.66, 392].forEach((frequency, index) => {
            this.osc(ctx, frequency, 'sine', settleAt + index * 0.035, settleAt + 0.72, 0.025 - index * 0.003, 0.018, bus);
          });
          break;
        }
        case 'forge-reveal': {
          this.duckMusic(0.76, 0.36, 0.06, 0.58);
          this.osc(ctx, 73.42, 'sine', t, t + 1.05, 0.052, 0.055, bus);
          this.osc(ctx, 146.83, 'triangle', t + 0.025, t + 0.78, 0.026, 0.04, bus);
          this.noiseSweep(ctx, t, 0.52, 0.022, 170, 980, bus);
          this.noiseBlip(ctx, t + 0.46, 0.075, 0.028, 840, 4, bus);
          this.osc(ctx, 523.25, 'sine', t + 0.48, t + 1.0, 0.024, 0.008, bus);
          this.osc(ctx, 783.99, 'sine', t + 0.53, t + 0.92, 0.016, 0.006, bus);
          break;
        }
        case 'focus': {
          this.noiseBlip(ctx, t, 0.035, 0.018, 1_900, 11, bus);
          this.osc(ctx, 880, 'sine', t, t + 0.46, 0.03, 0.004, bus);
          this.osc(ctx, 1_320, 'sine', t + 0.09, t + 0.5, 0.016, 0.006, bus);
          break;
        }
        case 'permanent-capability': {
          const frequency = AFFINITY_FREQUENCIES[affinity];
          this.osc(ctx, 65.41, 'sine', t, t + 0.82, 0.034, 0.025, bus);
          this.noiseBlip(ctx, t, 0.07, 0.024, 520, 5, bus);
          [0.5, 1, 1.5, 2].forEach((multiple, index) => {
            const at = t + index * 0.07;
            this.osc(ctx, frequency * multiple, 'sine', at, at + 0.72, 0.028 - index * 0.004, 0.012, bus);
          });
          break;
        }
        case 'signature-imprint': {
          this.noiseBlip(ctx, t, 0.055, 0.028, 460, 5, bus);
          [220, 330, 495].forEach((frequency, index) => {
            const at = t + index * 0.12;
            this.osc(ctx, frequency, 'sine', at, at + 1.05 - index * 0.08, 0.03 - index * 0.004, 0.025, bus);
          });
          this.noiseSweep(ctx, t + 0.08, 0.92, 0.012, 1_200, 130, bus);
          break;
        }
        case 'signature-interference': {
          this.osc(ctx, 77.78, 'sine', t, t + 1.15, 0.036, 0.06, bus);
          this.osc(ctx, 311.13, 'sine', t + 0.03, t + 1.0, 0.03, 0.035, bus);
          this.osc(ctx, 316.5, 'sine', t + 0.03, t + 1.0, 0.026, 0.035, bus);
          this.noiseSweep(ctx, t + 0.1, 0.86, 0.014, 840, 95, bus);
          this.noiseBlip(ctx, t + 0.72, 0.1, 0.018, 240, 3, bus);
          break;
        }
        case 'encryption-principle': {
          this.noiseSweep(ctx, t, 0.58, 0.018, 260, 1_900, bus);
          [0.08, 0.17, 0.25, 0.32].forEach((offset, index) => {
            this.noiseBlip(ctx, t + offset, 0.028, 0.016, 900 + index * 360, 10, bus);
          });
          this.osc(ctx, 523.25, 'sine', t + 0.34, t + 0.94, 0.026, 0.012, bus);
          this.osc(ctx, 87.31, 'sine', t + 0.4, t + 0.95, 0.034, 0.012, bus);
          break;
        }
        case 'eminence-threshold': {
          this.duckMusic(0.78, 0.42, 0.06, 0.62);
          [261.63, 392, 523.25, 783.99].forEach((frequency, index) => {
            const at = t + index * 0.095;
            this.osc(ctx, frequency, 'sine', at, at + 0.82, 0.03 - index * 0.004, 0.012, bus);
          });
          this.osc(ctx, 65.41, 'sine', t, t + 1.2, 0.038, 0.08, bus);
          break;
        }
        case 'time-skip': {
          this.noiseSweep(ctx, t, 1.0, 0.023, 140, 2_200, bus);
          this.risingTone(ctx, t + 0.03, 920, 130.81, 659.25, 0.021, bus);
          [261.63, 392, 523.25].forEach((frequency, index) => {
            const at = t + 0.24 + index * 0.16;
            this.osc(ctx, frequency, 'sine', at, at + 0.6, 0.018, 0.025, bus);
          });
          break;
        }
        case 'choice-presented': {
          this.noiseBlip(ctx, t, 0.03, 0.012, 1_800, 10, bus);
          this.osc(ctx, 659.25, 'sine', t, t + 0.3, 0.02, 0.004, bus);
          this.osc(ctx, 783.99, 'sine', t + 0.075, t + 0.36, 0.016, 0.004, bus);
          break;
        }
      }
    } catch (error) {
      console.warn('Tutorial cue failed', error);
    }
  }

  /** Affinity paid into a Forge becomes addressable in the shared Well again. */
  playTutorialAffinityReturn(colors: readonly AffinityKey[]) {
    if (this.muted || colors.length === 0) return;
    const nowMs = typeof performance === 'undefined' ? Date.now() : performance.now();
    const cueKey = `affinity-return:${colors.join(',')}`;
    const lastPlayed = this.tutorialCueLastPlayed.get(cueKey) ?? -Infinity;
    if (nowMs - lastPlayed < 90) return;
    this.tutorialCueLastPlayed.set(cueKey, nowMs);

    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const bus = ctx.createGain();
      bus.gain.setValueAtTime(0.46, t);
      bus.connect(ctx.destination);
      this.registerTransientBus([bus], 2_200);

      const unique = Array.from(new Set(colors)).slice(0, 6).reverse();
      this.noiseSweep(ctx, t, 0.72, 0.018, 1_600, 190, bus);
      unique.forEach((color, index) => {
        const frequency = AFFINITY_FREQUENCIES[color];
        const at = t + 0.05 + index * 0.08;
        this.osc(ctx, frequency, 'sine', at, at + 0.48, 0.026, 0.012, bus);
        this.osc(ctx, frequency * 0.5, 'sine', at + 0.04, at + 0.62, 0.018, 0.02, bus);
      });
      const settleAt = t + 0.2 + unique.length * 0.08;
      this.osc(ctx, 196, 'sine', settleAt, settleAt + 0.66, 0.024, 0.015, bus);
      this.osc(ctx, 392, 'sine', settleAt + 0.04, settleAt + 0.58, 0.016, 0.012, bus);
    } catch (error) {
      console.warn('Tutorial Affinity return cue failed', error);
    }
  }

  /**
   * Tutorial fullscreen shatter — crack/shatter/flash sequence timed to the
   * FullscreenShatterOverlay visual phases.  Same sound layers as
   * playArrivalCutscene but starting at the pressure phase (no camera intro).
   *
   * Visual phase ms offsets from overlay mount:
   *   pressure=0  firstcrack=620  leaking=1140  secondcrack=1990
   *   cracking=2410  shattering=3510  flashing=4510
   */
  playTutorialShatter() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 10;
      comp.ratio.value = 8;
      comp.attack.value = 0.002;
      comp.release.value = 0.18;
      // Master gain: scales the entire procedural synthesis chain down for subtlety
      const master = ctx.createGain();
      master.gain.value = 0.24;
      comp.connect(master);
      master.connect(ctx.destination);
      this.registerTransientBus([comp, master], 8_000);
      const D = comp;

      const s = (ms: number) => t + ms / 1000;

      // Phase onsets (ms) — must match FS_DURS in TutorialDirector.tsx:
      //   pressure=620  firstcrack=520  leaking=850  secondcrack=420
      //   cracking=1100  shattering=1000  flashing=2800
      const CRACK1 = 600; // ≈ firstcrack phase onset  (620ms cumulative)
      const LEAK = 1120; // ≈ leaking phase onset     (1140ms cumulative)
      const CRACK2 = 1970; // ≈ secondcrack phase onset (1990ms cumulative)
      const CRACKS = 2390; // ≈ cracking phase onset    (2410ms cumulative)
      const SHATT = 3490; // ≈ shattering phase onset  (3510ms cumulative)
      const FLASH = 4490; // ≈ flashing phase onset    (4510ms cumulative)

      // ── pressure (0–90 ms): crystalline rattle + hum + warble ───────
      for (let i = 0; i < 5; i++) {
        const at = s(i * 16 + Math.random() * 8);
        this.noiseBlip(ctx, at, 0.034, 0.038 + Math.random() * 0.022, 500 + Math.random() * 900, 9, D);
      }
      this.osc(ctx, 82, 'sine', s(0), s(CRACK1), 0.08, 0.1, D);
      this.wobble(ctx, s(0), 90, 220, 9, 0.05, D);

      // ── firstcrack (40 ms): structural fracture snap + bass ─────────
      this.noiseBlip(ctx, s(CRACK1), 0.09, 0.14, 420, 9, D);
      this.noiseBlip(ctx, s(CRACK1 + 4), 0.038, 0.11, 1050, 11, D);
      this.noiseBlip(ctx, s(CRACK1), 0.11, 0.1, 195, 6, D);
      this.noiseSweep(ctx, s(CRACK1 + 28), 0.22, 0.052, 90, 480, D);
      this.osc(ctx, 60, 'sine', s(CRACK1), s(CRACK1 + 310), 0.15, 0.005, D);
      this.osc(ctx, 42, 'sine', s(CRACK1), s(CRACK1 + 470), 0.1, 0.008, D);
      this.osc(ctx, 110, 'sine', s(CRACK1), s(CRACK1 + 200), 0.08, 0.004, D);

      // ── leaking (660 ms): energy bleed + deep pressure stress ────────
      this.noiseBlip(ctx, s(LEAK), 0.84, 0.048, 4300, 2.0, D);
      this.noiseBlip(ctx, s(LEAK + 40), 0.5, 0.046, 480, 5, D);
      this.noiseSweep(ctx, s(LEAK + 170), 0.65, 0.038, 75, 230, D);
      this.risingTone(ctx, s(LEAK), 850, 185, 365, 0.055, D);

      // ── secondcrack (860 ms): staggered brittle physical snaps ───────
      [0, 110, 240, 370].forEach((off, i) => {
        this.noiseBlip(ctx, s(CRACK2 + off), 0.05, 0.048 + i * 0.018, 270 + i * 105, 8, D);
        this.noiseBlip(ctx, s(CRACK2 + off + 7), 0.026, 0.032 + i * 0.013, 720 + i * 175, 10, D);
      });
      this.noiseSweep(ctx, s(CRACK2), 0.42, 0.088, 360, 3400, D);

      // ── cracking (1280 ms): escalating fracture burst ─────────────────
      [0, 88, 188, 305, 455, 675, 900].forEach((off, i) => {
        const vol = 0.038 + i * 0.016;
        this.noiseBlip(ctx, s(CRACKS + off), 0.04, Math.min(vol, 0.12), 175 + i * 68, 7, D);
        this.noiseBlip(ctx, s(CRACKS + off + 9), 0.022, Math.min(vol * 0.58, 0.08), 530 + i * 125, 9, D);
      });
      this.noiseSweep(ctx, s(CRACKS), 1.1, 0.1, 270, 5200, D);
      this.osc(ctx, 52, 'sine', s(CRACKS), s(SHATT), 0.09, 0.2, D);

      // ── shattering (2320 ms): rupture + shard spray + bass bloom ─────
      this.noiseBlip(ctx, s(SHATT), 0.36, 0.13, 2900, 3.0, D);
      this.noiseBlip(ctx, s(SHATT + 18), 0.27, 0.1, 1550, 2.0, D);
      this.noiseBlip(ctx, s(SHATT + 42), 0.21, 0.07, 760, 1.5, D);
      for (let i = 0; i < 10; i++) {
        const at = s(SHATT + 32 + i * 68 + Math.random() * 32);
        this.noiseBlip(ctx, at, 0.028, Math.max(0.008, 0.048 - i * 0.003), 700 + Math.random() * 1800, 4, D);
      }
      this.noiseSweep(ctx, s(SHATT + 12), 0.5, 0.062, 3800, 850, D);
      this.noiseSweep(ctx, s(SHATT + 50), 0.4, 0.046, 2600, 600, D);
      this.osc(ctx, 40, 'sine', s(SHATT), s(SHATT + 760), 0.14, 0.01, D);
      this.osc(ctx, 58, 'sine', s(SHATT), s(SHATT + 560), 0.08, 0.015, D);
      this.osc(ctx, 80, 'sine', s(SHATT + 18), s(SHATT + 400), 0.055, 0.02, D);

      // ── flashing (3160 ms): bright swell ──
      this.noiseBlip(ctx, s(FLASH + 38), 0.6, 0.085, 5400, 2.0, D);
      this.noiseBlip(ctx, s(FLASH + 240), 0.5, 0.06, 6600, 2.5, D);

      // The tutorial keeps a calmer procedural bed while restoring clearly
      // physical crack and shatter transients at the exact visual phase beats.
      void this.scheduleAudioAsset(LUMINARY_GLASS_SFX.firstCrack, s(CRACK1), 0.22);
      void this.scheduleAudioAsset(LUMINARY_GLASS_SFX.branchingFracture, s(CRACK2), 0.2);
      void this.scheduleAudioAsset(LUMINARY_GLASS_SFX.fullShatter, s(SHATT), 0.24);
    } catch (e) {
      console.warn('[Luminae] Tutorial shatter audio failed', e);
    }
  }

  playBonusSound(color: AffinityKey) {
    switch (color) {
      case 'abyss':
        return this.playBonusAbyss();
      case 'flare':
        return this.playBonusFlare();
      case 'continuum':
        return this.playBonusContinuum();
      case 'verdance':
        return this.playBonusVerdance();
      case 'radiance':
        return this.playBonusRadiance();
      default:
        break;
    }
  }

  /** Crisp, lightweight selection click — first tap (mode engaged). */
  playButtonSelect() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      // Tactile click: tight bandpass noise pop
      this.noiseBlip(ctx, t, 0.045, 0.11, 1800, 9);
      // Crystalline high ping — "selection locked in"
      this.osc(ctx, 1047, 'sine', t, t + 0.13, 0.055, 0.002);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Heavier, more satisfying confirmation stamp — second tap (action committed). */
  playButtonConfirm() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      // Bass weight — sense of finality
      this.osc(ctx, 92, 'sine', t, t + 0.32, 0.16, 0.004);
      // Resonant mid ring
      this.osc(ctx, 440, 'sine', t + 0.01, t + 0.38, 0.07, 0.006);
      // Bright stamp noise burst
      this.noiseBlip(ctx, t, 0.06, 0.13, 2200, 6);
      // Quick ascending shimmer pair — C5 → E5
      this.osc(ctx, 523.25, 'sine', t + 0.05, t + 0.22, 0.05, 0.004);
      this.osc(ctx, 659.25, 'sine', t + 0.13, t + 0.3, 0.04, 0.003);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * Forge animation sound sequence — schedules all four phases at once using
   * the Web Audio clock so timing never drifts from the visual animation.
   *
   * Phase 1 (0 s)       Card lifts — soft upward whoosh + rising hum.
   * Phase 2 (0.18 s)    Streams arc in — crystalline energy build.
   * Phase 3 (0.60 s)    Stamp SLAMS — heavy metallic thud, the main hit.
   * Phase 4 (0.62 s)    Sparks explode — sizzle burst + multiple pops.
   * Phase 5 (0.80 s)    Card arcs away — descending whoosh + landing thud.
   *
   * Mirror the ForgeAnimation timing constants from game-forge-animation.tsx:
   *   LIFT_END=0.18, STREAMS_END=0.44, STAMP_HIT=0.60, STAMP_HOLD=0.80, ARC_END=1.15
   */
  playForgeAnimation() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      this.duckMusic(0.4, 0.52, 0.08, 0.82, 0.48);

      // ── Phase 1: Card lift (0 → 0.18 s) ────────────────────────────────
      // Soft upward air displacement — card detaching from board
      this.noiseSweep(ctx, t, 0.2, 0.05, 160, 480);
      // Subtle rising drone hum — anticipation
      this.osc(ctx, 196, 'sine', t + 0.02, t + 0.44, 0.03, 0.04);

      // ── Phase 2: Energy streams arc in (0.18 → 0.60 s) ─────────────────
      // Crystalline energy building — narrow bandpass sweep upward
      this.noiseSweep(ctx, t + 0.18, 0.36, 0.048, 320, 1100);
      // Two harmonic shimmer tones that swell toward impact
      this.osc(ctx, 440, 'sine', t + 0.22, t + 0.58, 0.028, 0.055);
      this.osc(ctx, 660, 'sine', t + 0.32, t + 0.58, 0.02, 0.04);
      // High sparkle at stream peak
      this.osc(ctx, 1320, 'sine', t + 0.5, t + 0.6, 0.022, 0.006);

      // ── Phase 3: Stamp IMPACT (0.60 s) — the main hit ───────────────────
      const hit = t + 0.6;
      // Cushion the metallic transient so repeated forges retain weight without
      // the authored hit and spark layers combining into a piercing peak.
      const impactFilter = ctx.createBiquadFilter();
      impactFilter.type = 'lowpass';
      impactFilter.frequency.value = 1900;
      impactFilter.Q.value = 0.42;
      const impactCompressor = ctx.createDynamicsCompressor();
      impactCompressor.threshold.value = -28;
      impactCompressor.knee.value = 24;
      impactCompressor.ratio.value = 6;
      impactCompressor.attack.value = 0.004;
      impactCompressor.release.value = 0.2;
      impactFilter.connect(impactCompressor);
      impactCompressor.connect(ctx.destination);
      this.registerTransientBus([impactFilter, impactCompressor], 3_000);

      // Sub-bass thud layers — the physical mass of the stamp
      this.osc(ctx, 52, 'sine', hit, hit + 0.6, 0.24, 0.004);
      this.osc(ctx, 38, 'sine', hit, hit + 0.75, 0.12, 0.007);
      this.osc(ctx, 105, 'sine', hit, hit + 0.32, 0.1, 0.003);
      this.osc(ctx, 185, 'triangle', hit, hit + 0.3, 0.048, 0.005, impactFilter);
      // Metallic ring — the bronze stamp head resonating
      this.osc(ctx, 370, 'sine', hit, hit + 0.48, 0.05, 0.008, impactFilter);
      this.osc(ctx, 680, 'sine', hit, hit + 0.28, 0.016, 0.008, impactFilter);
      // Authored stamp hit: a single, controlled material impact in place of
      // the old procedural noise layers.
      void this.scheduleAudioAsset(FORGE_STAMP_HIT_MP3, hit, 0.17, { afterSeconds: 0.28, durationSeconds: 0.26 }, impactFilter, 0.045, 0.025);

      // ── Phase 4: Spark explosion (0.62 → 0.80 s) ────────────────────────
      // A filtered amber release replaces the previous bright sizzle.
      this.noiseSweep(ctx, hit + 0.02, 0.17, 0.032, 1250, 2100, impactFilter);
      // Fewer, rounder sparks preserve the visual sync without needle-like pops.
      for (let i = 0; i < 4; i++) {
        const at = hit + 0.045 + i * 0.036;
        const vol = Math.max(0.01, 0.03 - i * 0.005);
        const frq = 1050 + i * 180;
        this.noiseBlip(ctx, at, 0.038, vol, frq, 5 + i, impactFilter);
      }
      // Trailing crackle (amber glow lingers)
      this.noiseBlip(ctx, hit + 0.16, 0.16, 0.016, 1700, 4, impactFilter);

      // ── Phase 5: Card arcs to destination (0.80 → 1.15 s) ───────────────
      const fly = t + 0.8;
      // Descending whoosh — card cutting through air
      this.noiseSweep(ctx, fly, 0.28, 0.06, 750, 180);
      // Soft landing thud
      this.osc(ctx, 88, 'sine', t + 1.12, t + 1.36, 0.055, 0.004);
      this.noiseBlip(ctx, t + 1.12, 0.07, 0.042, 580, 4);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * Ceremonial Eminence seal cue for victory-relevant forges.
   * Matches the visual seal path in ForgeAnimation:
   *   0.66 s seal appears, 0.94 s seal turns/launches, 1.52 s panel impact.
   */
  playEminenceSeal(
    amount = 1,
    eminenceAfter = 0,
    target: number = DEFAULT_VICTORY_REQUIREMENT,
  ) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const progress = target > 0 ? Math.max(0, Math.min(1, eminenceAfter / target)) : 0;
      const intensity = 0.85 + progress * 0.55 + Math.min(3, Math.max(1, amount)) * 0.04;
      this.duckMusic(
        progress >= 0.9 ? 0.18 : progress >= 0.75 ? 0.34 : 0.56,
        progress >= 0.9 ? 0.9 : 0.52,
        0.08,
        progress >= 0.9 ? 1.1 : 0.72,
        1.38,
      );

      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.knee.value = 8;
      comp.ratio.value = 5;
      comp.attack.value = 0.004;
      comp.release.value = 0.22;
      const master = ctx.createGain();
      master.gain.value = 0.34 * intensity;
      comp.connect(master);
      master.connect(ctx.destination);
      this.registerTransientBus([comp, master], 4_000);

      const emerge = t + 0.66;
      const launch = t + 0.94;
      const land = t + 1.52;

      // Seal appears: thin metal glint, distinct from the forge stamp.
      this.osc(ctx, 880, 'triangle', emerge, emerge + 0.34, 0.04, 0.01, comp);
      this.osc(ctx, 1320, 'sine', emerge + 0.035, emerge + 0.27, 0.026, 0.008, comp);
      this.noiseBlip(ctx, emerge + 0.02, 0.055, 0.036, 2600, 10, comp);

      // Flip/flight: soft ceremonial turn, not a coin pickup.
      this.noiseSweep(ctx, launch, 0.36, 0.044, 680, 1680, comp);
      this.osc(ctx, 440, 'sine', launch + 0.05, land + 0.04, 0.024, 0.07, comp);

      // Panel strike: low authority + luminous chord.
      this.osc(ctx, 72, 'sine', land, land + 0.62, 0.15, 0.004, comp);
      this.noiseBlip(ctx, land, 0.075, 0.08, 520, 5, comp);
      this.osc(ctx, 660, 'triangle', land + 0.015, land + 0.56, 0.055, 0.012, comp);
      this.osc(ctx, 990, 'sine', land + 0.035, land + 0.62, 0.036, 0.016, comp);
      this.osc(ctx, 1320, 'sine', land + 0.08, land + 0.52, 0.026, 0.014, comp);

      if (progress >= 0.75) {
        this.osc(ctx, 1760, 'sine', land + 0.15, land + 0.84, 0.026, 0.04, comp);
      }
      if (progress >= 0.9) {
        this.osc(ctx, 220, 'sine', land + 0.02, land + 0.9, 0.06, 0.03, comp);
        this.noiseSweep(ctx, land + 0.08, 0.62, 0.032, 1800, 4200, comp);
      }
      if (progress >= 1) {
        this.playBrandMotif(ctx, land + 0.08, 0.48, comp);
        this.osc(ctx, 1046.5, 'sine', land + 0.42, land + 1.18, 0.038, 0.028, comp);
      }
    } catch (e) {
      console.warn('Eminence SFX failed', e);
    }
  }

  // ── Ambient music ─────────────────────────────────────────────────────

  startMusic() {
    if (this.musicStarted) return;
    try {
      const ctx = this.initCtx();
      this.musicStarted = true;
      this.musicDuckUntil = 0;

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : this.getMusicGain();
      master.connect(ctx.destination);
      this.masterMusicGain = master;

      const ir = this.buildReverbIR(ctx, 4.5);
      const convolver = ctx.createConvolver();
      convolver.buffer = ir;
      const reverbOut = ctx.createGain();
      reverbOut.gain.value = 0.42;
      convolver.connect(reverbOut);
      reverbOut.connect(master);
      this.rememberMusic(master, convolver, reverbOut);

      const connect = (node: AudioNode, dry: number, wet: number) => {
        const dg = ctx.createGain();
        dg.gain.value = dry;
        const wg = ctx.createGain();
        wg.gain.value = wet;
        node.connect(dg);
        node.connect(wg);
        dg.connect(master);
        wg.connect(convolver);
        this.rememberMusic(dg, wg);
      };

      const drones = [
        { freq: 55.0, lfoHz: 0.042, vol: 0.18 },
        { freq: 82.5, lfoHz: 0.057, vol: 0.13 },
        { freq: 110.0, lfoHz: 0.033, vol: 0.1 },
        { freq: 69.3, lfoHz: 0.048, vol: 0.07 },
        { freq: 164.8, lfoHz: 0.027, vol: 0.06 },
      ];
      for (const { freq, lfoHz, vol } of drones) {
        const pair = ctx.createGain();
        pair.gain.value = vol;
        this.rememberMusic(pair);
        for (const d of [0, 4, -3]) {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = freq;
          o.detune.value = d;
          o.connect(pair);
          o.start();
          this.droneOscillators.push(o);
          this.rememberMusic(o);
        }
        const lfo = ctx.createOscillator();
        const lfoG = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = lfoHz;
        lfoG.gain.value = vol * 0.45;
        lfo.connect(lfoG);
        lfoG.connect(pair.gain);
        lfo.start();
        this.droneOscillators.push(lfo);
        this.rememberMusic(lfo, lfoG);
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 500;
        filt.Q.value = 0.5;
        pair.connect(filt);
        this.rememberMusic(filt);
        connect(filt, 0.6, 0.4);
      }

      const endgameGain = ctx.createGain();
      endgameGain.gain.value = Math.pow(this.endgameIntensity, 1.7) * 0.072;
      endgameGain.connect(master);
      this.endgameGain = endgameGain;

      const endgameFilter = ctx.createBiquadFilter();
      endgameFilter.type = 'bandpass';
      endgameFilter.frequency.value = 760 + this.endgameIntensity * 1900;
      endgameFilter.Q.value = 1.2 + this.endgameIntensity * 2.4;
      endgameFilter.connect(endgameGain);
      this.endgameFilter = endgameFilter;
      this.rememberMusic(endgameGain, endgameFilter);

      const pressureNotes = [220.0, 329.6, 440.0, 554.4];
      for (const [i, freq] of pressureNotes.entries()) {
        const o = ctx.createOscillator();
        o.type = i === 0 ? 'sine' : 'triangle';
        o.frequency.value = freq;
        o.detune.value = i % 2 === 0 ? -5 : 7;
        const g = ctx.createGain();
        g.gain.value = i === 0 ? 0.14 : 0.045;
        o.connect(g);
        g.connect(endgameFilter);
        o.start();
        this.endgameOscillators.push(o);
        this.rememberMusic(o, g);
      }

      const pulse = ctx.createOscillator();
      const pulseG = ctx.createGain();
      pulse.type = 'sine';
      pulse.frequency.value = 0.38;
      pulseG.gain.value = 0.004;
      pulse.connect(pulseG);
      pulseG.connect(endgameGain.gain);
      pulse.start();
      this.endgameOscillators.push(pulse);
      this.rememberMusic(pulse, pulseG);

      // Scenario layer: two quiet, filtered voices carrying Lumii's inverted
      // interval. It remains mounted at zero gain outside the Vault encounter.
      const lumiiGain = ctx.createGain();
      lumiiGain.gain.value = this.lumiiScenarioActive ? 0.018 : 0;
      lumiiGain.connect(master);
      this.lumiiScenarioGain = lumiiGain;
      const lumiiFilter = ctx.createBiquadFilter();
      lumiiFilter.type = 'bandpass';
      lumiiFilter.frequency.value = 330 + this.endgameIntensity * 420;
      lumiiFilter.Q.value = 1.7;
      lumiiFilter.connect(lumiiGain);
      this.lumiiScenarioFilter = lumiiFilter;
      for (const [frequency, type, volume] of [
        [92.5, 'sine', 0.22],
        [138.75, 'triangle', 0.07],
      ] as const) {
        const oscillator = ctx.createOscillator();
        const voiceGain = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        voiceGain.gain.value = volume;
        oscillator.connect(voiceGain);
        voiceGain.connect(lumiiFilter);
        oscillator.start();
        this.lumiiScenarioOscillators.push(oscillator);
        this.rememberMusic(oscillator, voiceGain);
      }
      this.rememberMusic(lumiiGain, lumiiFilter);

      const noiseBuf = this.buildNoiseBuffer(ctx, 8);
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuf;
      noise.loop = true;
      const noiseLP = ctx.createBiquadFilter();
      noiseLP.type = 'lowpass';
      noiseLP.frequency.value = 280;
      noiseLP.Q.value = 0.3;
      const noiseMod = ctx.createOscillator();
      const noiseModG = ctx.createGain();
      noiseMod.frequency.value = 0.02;
      noiseModG.gain.value = 0.006;
      noiseMod.connect(noiseModG);
      const noiseG = ctx.createGain();
      noiseG.gain.value = 0.018;
      noiseModG.connect(noiseG.gain);
      noise.connect(noiseLP);
      noiseLP.connect(noiseG);
      noiseMod.start();
      noise.start();
      this.noiseSource = noise;
      this.droneOscillators.push(noiseMod);
      this.rememberMusic(noise, noiseLP, noiseMod, noiseModG, noiseG);
      connect(noiseG, 0.5, 0.5);

      this.scheduleShimmer(ctx, convolver, master);
    } catch (e) {
      console.warn('Ambient music failed', e);
      this.musicStarted = false;
      for (const node of this.musicNodes) this.disconnect(node);
      this.musicNodes.clear();
    }
  }

  stopMusic() {
    if (!this.musicStarted) return;
    this.musicStarted = false;
    if (this.shimmerTimer !== null) {
      clearTimeout(this.shimmerTimer);
      this.shimmerTimer = null;
    }
    const masterToStop = this.masterMusicGain;
    const dronesToStop = this.droneOscillators;
    const endgameToStop = this.endgameOscillators;
    const lumiiScenarioToStop = this.lumiiScenarioOscillators;
    const noiseToStop = this.noiseSource;
    const musicNodesToDisconnect = [...this.musicNodes];
    this.masterMusicGain = null;
    this.droneOscillators = [];
    this.endgameOscillators = [];
    this.endgameGain = null;
    this.endgameFilter = null;
    this.lumiiScenarioGain = null;
    this.lumiiScenarioFilter = null;
    this.lumiiScenarioOscillators = [];
    this.noiseSource = null;
    this.musicNodes.clear();
    this.musicDuckUntil = 0;

    if (masterToStop && this.ctx) {
      masterToStop.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
    }
    setTimeout(() => {
      for (const o of dronesToStop) {
        try {
          o.stop();
        } catch {}
      }
      try {
        noiseToStop?.stop();
      } catch {}
      for (const o of endgameToStop) {
        try {
          o.stop();
        } catch {}
      }
      for (const oscillator of lumiiScenarioToStop) {
        try {
          oscillator.stop();
        } catch {}
      }
      for (const node of musicNodesToDisconnect) this.disconnect(node);
    }, 3000);
  }

  isMusicPlaying() {
    return this.musicStarted;
  }

  setEndgameIntensity(value: number) {
    const next = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
    if (Math.abs(next - this.endgameIntensity) < 0.01) return;
    this.endgameIntensity = next;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (now >= this.musicDuckUntil) {
      this.masterMusicGain?.gain.setTargetAtTime(this.muted ? 0 : this.getMusicGain(), now, 1.4);
    }
    this.endgameGain?.gain.setTargetAtTime(Math.pow(next, 1.7) * 0.072, now, 1.8);
    this.endgameFilter?.frequency.setTargetAtTime(760 + next * 1900, now, 2.2);
    this.endgameFilter?.Q.setTargetAtTime(1.2 + next * 2.4, now, 2.2);
    if (this.lumiiScenarioActive) {
      this.lumiiScenarioGain?.gain.setTargetAtTime(0.018 + next * 0.018, now, 2.4);
      this.lumiiScenarioFilter?.frequency.setTargetAtTime(330 + next * 420, now, 2.6);
    }
  }

  setLumiiScenarioActive(active: boolean) {
    this.lumiiScenarioActive = active;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const target = active ? 0.018 + this.endgameIntensity * 0.018 : 0;
    this.lumiiScenarioGain?.gain.setTargetAtTime(target, now, active ? 1.8 : 0.8);
  }

  private buildReverbIR(ctx: AudioContext, dur: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * dur);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) {
        const t = i / len;
        const early = i < ctx.sampleRate * 0.05 ? 1.4 : 1.0;
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 2.8) * early;
      }
    }
    return ir;
  }

  private buildNoiseBuffer(ctx: AudioContext, dur: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private scheduleShimmer(ctx: AudioContext, reverb: ConvolverNode, master: GainNode) {
    const freqs = [110.0, 130.8, 164.8, 196.0, 220.0, 261.6, 329.6, 392.0, 440.0, 523.3, 659.3, 783.9, 880.0, 1046.5];
    const play = () => {
      if (!this.musicStarted) return;
      if (!this.muted) {
        try {
          const freq = freqs[Math.floor(Math.random() * freqs.length)];
          const dur = 4 + Math.random() * 8;
          const peak = 0.022 + Math.random() * 0.018;
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = freq;
          const vib = ctx.createOscillator();
          const vibG = ctx.createGain();
          vib.frequency.value = 4.5 + Math.random() * 1.5;
          vibG.gain.value = freq * 0.003;
          vib.connect(vibG);
          vibG.connect(o.frequency);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, ctx.currentTime);
          g.gain.linearRampToValueAtTime(peak, ctx.currentTime + dur * 0.35);
          g.gain.linearRampToValueAtTime(0, ctx.currentTime + dur);
          const wet = ctx.createGain();
          wet.gain.value = 0.6;
          o.connect(g);
          g.connect(wet);
          wet.connect(reverb);
          g.connect(master);
          this.trackVoice(o, [g, wet]);
          this.trackVoice(vib, [vibG]);
          vib.start();
          o.start();
          o.stop(ctx.currentTime + dur + 0.2);
          vib.stop(ctx.currentTime + dur + 0.2);
        } catch {}
      }
      this.shimmerTimer = setTimeout(play, 5000 + Math.random() * 11000);
    };
    this.shimmerTimer = setTimeout(play, 2500);
  }
}

export const gameAudio = new GameAudio();
