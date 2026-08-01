// ─── Luminae Audio Engine ────────────────────────────────────────────────────
// Blend of cosmic (warm, ethereal) + satisfying UI (snappy pops, tings).
// Each interaction has a distinct sonic character:
//   affinitySelected — Affinity-specific ting + tactile click
//   artifactForged   — bass thud + chord + sparkle arpeggio
//   artifactReserved — mysterious rising swoosh + soft pad
//   turnStart      — cosmic bell (metallic, long decay)
//   win            — epic bass boom + triumphant arpeggio
// Ambient music layers run separately on masterMusicGain.

import type { AffinityKey } from '@workspace/game-types';

// Maps each Luminary's arrivalColor hex → its nearest AffinityKey affinity.
// Mirrors the ARRIVAL_COLOR_TO_AFFINITY table in gameEngine.ts.
const FANFARE_COLOR_MAP: Record<string, AffinityKey> = {
  '#ff5a3c': 'flare',
  '#f43f5e': 'flare',
  '#60a5fa': 'continuum',
  '#38bdf8': 'continuum',
  '#3d6bff': 'continuum',
  '#2563eb': 'continuum',
  '#2ecc71': 'verdance',
  '#4ade80': 'verdance',
  '#86efac': 'verdance',
  '#0f172a': 'abyss',
  '#4c1d95': 'abyss',
  '#7b1fa2': 'abyss',
  '#fef9c3': 'radiance',
  '#cbd5e1': 'radiance',
  '#a8b8e8': 'radiance',
  '#fbbf24': 'singularity',
};

// Card draw / flip — pre-built MP3 asset.
const CARD_DRAW_MP3 = new URL('../assets/audio/Effects/Card draw.mp3', import.meta.url).href;

// Impact Extinction — short intake cue for each Artifact entering an Archive.
const IMPACT_EXTINCTION_ARCHIVE_MP3 = new URL(
  '../assets/audio/Effects/Impact Extinction Archive.mp3',
  import.meta.url,
).href;

// Forge stamp impact — authored metal hit used at the artifact-sealing beat.
const FORGE_STAMP_HIT_MP3 = new URL('../assets/audio/Effects/Forge Stamp Hit.mp3', import.meta.url).href;

// Forge mold landing — pre-built MP3 asset.
// Luminary effect activation sting — pre-built WAV asset.
const EFFECT_WAV = new URL('../assets/audio/Effects/Effect.wav', import.meta.url).href;

// Burn mechanic — pre-built MP3 asset.
const BURN_MP3 = new URL('../assets/audio/Effects/Burn.mp3', import.meta.url).href;

// Forgotten forge cue — pre-built MP3 asset.
const FORGOTTEN_EFFECT_MP3 = new URL('../assets/audio/Effects/Forgotten Effect Activation.mp3', import.meta.url).href;

// The Forgotten Hour cue — pre-built MP3 asset for the ??? Luminary effect.
const FORGOTTEN_HOUR_MP3 = new URL('../assets/audio/Effects/Forgotten Hour Sound effect.mp3', import.meta.url).href;

// Arrival brand strike (Cinder Mandate, etc.) — plays when brand beams land on cards.
const SPELLBOUND_WAV = new URL('../assets/audio/Effects/Spellbound.wav', import.meta.url).href;

// Luminary arrival cutscene — pre-built MP3 assets, played at their phase beat times.
// Vite statically analyses new URL(literal, import.meta.url) and bundles each file.
const LUMINARY_SFX = {
  firstCrack: new URL('../assets/audio/luminary/First Crackmp3.mp3', import.meta.url).href,
  secondCrack: new URL('../assets/audio/luminary/Second Crack.mp3', import.meta.url).href,
  deepImpact: new URL('../assets/audio/luminary/Deep Impact.mp3', import.meta.url).href,
  glassShatter: new URL('../assets/audio/luminary/Glass Shatter.mp3', import.meta.url).href,
  cosmicPortalBoom: new URL('../assets/audio/luminary/Cosmic Portal Boom.mp3', import.meta.url).href,
  universeExpanding: new URL('../assets/audio/luminary/Universe_Expanding_Pad_Low_01.wav', import.meta.url).href,
};

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

// Pentatonic-adjacent frequencies per Affinity; each has its own voice.
const AFFINITY_FREQUENCIES: Record<AffinityKey, number> = {
  flare: 659.25, // E5 — bright, fiery
  continuum: 523.25, // C5 — clear, ordered
  verdance: 587.33, // D5 — natural, growing
  abyss: 415.3, // Ab4 — dark, deep
  radiance: 783.99, // G5 — luminous, pure
  singularity: 880.0, // A5 — wild, special
};

class GameAudio {
  private ctx: AudioContext | null = null;
  private muted = false;
  private decodedAudio = new Map<string, Promise<AudioBuffer>>();

  // ── Music state ─────────────────────────────────────────────────────────
  private musicStarted = false;
  private masterMusicGain: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private endgameOscillators: OscillatorNode[] = [];
  private endgameGain: GainNode | null = null;
  private endgameFilter: BiquadFilterNode | null = null;
  private noiseSource: AudioBufferSourceNode | null = null;
  private shimmerTimer: ReturnType<typeof setTimeout> | null = null;
  private endgameIntensity = 0;
  private musicDuckUntil = 0;
  private readonly MUSIC_GAIN = 0.32;

  // ── Arrival cutscene mute state ──────────────────────────────────────────
  private _arrivalMasterGain: GainNode | null = null;
  private _arrivalCtx: AudioContext | null = null;

  // ── Activation sting mute state ──────────────────────────────────────────
  private _activationGain: GainNode | null = null;
  private _activationCtx: AudioContext | null = null;

  constructor() {
    this.muted = localStorage.getItem('luminae_muted') === 'true';
  }

  isMuted() {
    return this.muted;
  }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('luminae_muted', String(this.muted));
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
    src.start(startTime);
    src.stop(startTime + duration + 0.05);
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
    src.start(startTime);
    src.stop(startTime + duration + 0.05);
  }

  /** A muted, low-register contact that makes a card feel seated in its mold. */
  private playMoldSettle(ctx: AudioContext, startTime: number, intensity = 1) {
    // The paired low tones preserve a physical metal-and-stone weight without
    // the abrasive high-frequency scrape in the previous sample.
    this.osc(ctx, 104, 'sine', startTime, startTime + 0.18, 0.058 * intensity, 0.006);
    this.osc(ctx, 208, 'triangle', startTime + 0.008, startTime + 0.15, 0.017 * intensity, 0.01);
    this.noiseBlip(ctx, startTime, 0.045, 0.012 * intensity, 260, 3);
    // A short delayed body note reads as the artifact settling into place.
    this.osc(ctx, 78, 'sine', startTime + 0.055, startTime + 0.19, 0.028 * intensity, 0.005);
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
  playCardDraw() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      // Play the real Card draw.mp3 asset as the core papery draw sound
      this.scheduleMp3(CARD_DRAW_MP3, t, 0.55);
      this.playMoldSettle(ctx, t + 0.3);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Impact Extinction — a distinct short cue for each Archive intake. */
  playImpactExtinctionArchive() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      void this.scheduleMp3(
        IMPACT_EXTINCTION_ARCHIVE_MP3,
        ctx.currentTime,
        0.5,
      );
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
   * Three distinct tonal characters, one per effect type:
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
   * each affinity has a distinct pitch center.  Falls back to neutral 523 Hz (C5)
   * when the color is not in the map.
   */
  playActivationSting(
    _effectType: 'summon' | 'end_of_turn' | 'start_of_turn',
    _primaryColor?: string,
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
      this._activationGain = ag;
      this._activationCtx = ctx;
      void this.scheduleMp3(EFFECT_WAV, t, 0.8, undefined, ag);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Immediately silence any in-progress activation sting (called on skip). */
  stopActivationSting() {
    if (this._activationGain && this._activationCtx) {
      try {
        const t = this._activationCtx.currentTime;
        this._activationGain.gain.cancelScheduledValues(t);
        this._activationGain.gain.setValueAtTime(this._activationGain.gain.value, t);
        this._activationGain.gain.linearRampToValueAtTime(0, t + 0.08);
      } catch {}
      this._activationGain = null;
      this._activationCtx = null;
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
    // Volume scale: each card in a cluster is slightly louder than the last.
    // index=0 → 1.0×, index=1 → 1.12×, index=2 → 1.24×, index≥5 → 1.5× (cap).
    // total=1 short-circuits to 1.0 so isolated burns are completely unchanged.
    const volScale = total > 1 ? Math.min(1 + index * 0.12, 1.5) : 1.0;
    const stagger = index * 0.08;
    const ctx = this.initCtx();
    const scheduledTime = ctx.currentTime + stagger;
    // Play the pre-built Burn.mp3 asset; falls back to procedural synthesis if the
    // file fails to load or decode.  Volume scales with cluster index.
    void this.scheduleMp3(BURN_MP3, scheduledTime, 0.28 * volScale);
  }

  /**
   * Plays Spellbound.wav when arrival brand-strike beams land on condemned/marked cards.
   * Called once per brand-strike batch regardless of how many cards are struck.
   */
  playBrandStrike() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      void this.scheduleMp3(SPELLBOUND_WAV, ctx.currentTime, 0.78);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  playForgottenForge() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      void this.scheduleMp3(FORGOTTEN_EFFECT_MP3, ctx.currentTime, 0.58);
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
      this._activationGain = ag;
      this._activationCtx = ctx;
      void this.scheduleMp3(FORGOTTEN_HOUR_MP3, t, 0.72, undefined, ag);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /**
   * Soft Forge-refill chime — plays at the moment a replacement card slides
   * into the burned slot (~1520 ms after burn detection).
   *
   * Sonic character: a quiet, low-register contact that confirms the new
   * artifact has settled into its mold without competing with the burn cue.
   *
   * Total audible duration ~0.55 s.
   */
  playForgeRefill() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;

      this.playMoldSettle(ctx, t, 0.85);
    } catch (e) {
      console.warn('SFX failed', e);
    }
  }

  /** Physical card flip — plays the Card draw.mp3 asset. */
  playCardFlip() {
    if (this.muted) return;
    const ctx = this.initCtx();
    this.scheduleMp3(CARD_DRAW_MP3, ctx.currentTime, 0.85);
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
    o.start(startTime);
    o.stop(startTime + dur + 0.05);
  }

  /**
   * Fetch, decode, and play an MP3 at an absolute AudioContext time.
   * Fire-and-forget: await not required at the call site.
   * Returns silently if the scheduled window has already passed or audio is muted.
   */
  private async scheduleMp3(url: string, scheduledTime: number, volume: number, fadeOut?: { afterSeconds: number; durationSeconds: number }, dest?: AudioNode, attackSeconds = 0, attackStartRatio = 0): Promise<void> {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
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
      const audioBuf = await audioPromise;
      if (this.muted) return; // re-check after async gap
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
      src.start(startAt);
    } catch (e) {
      console.warn('[Luminae] MP3 schedule failed', e);
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

  playArrivalCutscene(auraStyle = 'radiant') {
    if (this.muted) return;
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
      this._arrivalMasterGain = masterGain;
      this._arrivalCtx = ctx;

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

      // ── flashing (5700–6650 ms): aura-style specific reveal burst ──────────
      // cosmicPortalBoom MP3 (below) provides the shared physical shockwave;
      // flashSynthForStyle() layers the Luminary-specific harmonic character on top.
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

      // ── MP3 sound effects — fired at their exact phase beat times ───────
      // Each file is fetched+decoded async and scheduled precisely on the
      // AudioContext timeline. Decode typically completes well within the
      // ~3.0 s gap before the first beat (CRACK1).
      // Route all MP3 SFX through _arrivalMasterGain (same bus as the procedural
      // synthesis chain).  If stopArrivalCutscene() has already ramped the master
      // to 0 by the time a decode completes, the newly connected gain feeds into
      // a zero-output bus and stays silent — no separate per-source tracking needed.
      const mp3Bus = masterGain;
      void this.scheduleMp3(LUMINARY_SFX.firstCrack, t + CRACK1 / 1000, 0.8, undefined, mp3Bus);
      void this.scheduleMp3(
        LUMINARY_SFX.secondCrack,
        t + CRACK2 / 1000,
        0.76,
        { afterSeconds: 0.75, durationSeconds: 0.25 },
        mp3Bus,
      );
      void this.scheduleMp3(LUMINARY_SFX.deepImpact, t + SHATT / 1000, 0.9, undefined, mp3Bus);
      void this.scheduleMp3(LUMINARY_SFX.glassShatter, t + (SHATT + 80) / 1000, 0.82, undefined, mp3Bus);
      void this.scheduleMp3(LUMINARY_SFX.cosmicPortalBoom, t + FLASH / 1000, 0.88, undefined, mp3Bus);
    } catch (e) {
      console.warn('[Luminae] Summon cutscene audio failed', e);
    }
  }

  /**
   * Fade out all arrival cutscene audio (~250 ms ramp) when the player skips
   * the visual overlay.  Ramps the shared master gain to 0, silencing both
   * the procedural synthesis chain (oscillators/noise) and all MP3 SFX —
   * including any whose async decode completes after this call, since those
   * sources connect to the same master gain bus which is already at 0.
   * The timer chain still runs to completion; only the audio is silenced.
   * Safe to call if no cutscene is playing.
   */
  stopArrivalCutscene() {
    const ctx = this._arrivalCtx;
    const gain = this._arrivalMasterGain;
    if (!ctx || !gain) return;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + 0.25);
    this.restoreMusic(0.3);
  }

  /**
   * Tutorial fullscreen shatter — crack/shatter/flash sequence timed to the
   * FullscreenShatterOverlay visual phases.  Same sound layers as
   * playArrivalCutscene but starting at the pressure phase (no camera intro).
   *
   * Visual phase ms offsets from overlay mount:
   *   pressure=0  firstcrack=90  leaking=410  secondcrack=1260
   *   cracking=1620  shattering=2720  flashing=3720
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
      const D = comp;

      const s = (ms: number) => t + ms / 1000;

      // Phase onsets (ms) — must match FS_DURS in TutorialDirector.tsx:
      //   pressure=620  firstcrack=520  leaking=850  secondcrack=420
      //   cracking=1100  shattering=1000  flashing=950
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

      // ── MP3 assets — same SFX as arrival cutscene ─────────────────────
      void this.scheduleMp3(LUMINARY_SFX.firstCrack, t + CRACK1 / 1000, 0.2);
      void this.scheduleMp3(LUMINARY_SFX.secondCrack, t + CRACK2 / 1000, 0.18);
      void this.scheduleMp3(LUMINARY_SFX.universeExpanding, t + SHATT / 1000, 0.22, { afterSeconds: 1.0, durationSeconds: 1.6 }); // begin fading at the flash phase, gone by ~2.6s in
      void this.scheduleMp3(LUMINARY_SFX.glassShatter, t + (SHATT + 80) / 1000, 0.2);
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
      void this.scheduleMp3(FORGE_STAMP_HIT_MP3, hit, 0.17, { afterSeconds: 0.28, durationSeconds: 0.26 }, impactFilter, 0.045, 0.025);

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
  playEminenceSeal(amount = 1, eminenceAfter = 0, target = 15) {
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

      const connect = (node: AudioNode, dry: number, wet: number) => {
        const dg = ctx.createGain();
        dg.gain.value = dry;
        const wg = ctx.createGain();
        wg.gain.value = wet;
        node.connect(dg);
        node.connect(wg);
        dg.connect(master);
        wg.connect(convolver);
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
        for (const d of [0, 4, -3]) {
          const o = ctx.createOscillator();
          o.type = 'sine';
          o.frequency.value = freq;
          o.detune.value = d;
          o.connect(pair);
          o.start();
          this.droneOscillators.push(o);
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
        const filt = ctx.createBiquadFilter();
        filt.type = 'lowpass';
        filt.frequency.value = 500;
        filt.Q.value = 0.5;
        pair.connect(filt);
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
      connect(noiseG, 0.5, 0.5);

      this.scheduleShimmer(ctx, convolver, master);
    } catch (e) {
      console.warn('Ambient music failed', e);
      this.musicStarted = false;
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
    const noiseToStop = this.noiseSource;
    this.masterMusicGain = null;
    this.droneOscillators = [];
    this.endgameOscillators = [];
    this.endgameGain = null;
    this.endgameFilter = null;
    this.noiseSource = null;
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
