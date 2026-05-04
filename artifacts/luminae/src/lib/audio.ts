// ─── Luminae Audio Engine ───────────────────────────────────────────────────
// Sound effects (SFX) + procedural ambient cosmic music using the Web Audio API.
// Music layers:
//   1. Drone pads  — pairs of detuned sines at A1/E2/A2, LFO-breathed volume
//   2. Space noise — white noise through a 300 Hz low-pass, very subtle
//   3. Shimmer     — random pentatonic sine tones with slow fade in/out
//   4. Convolution reverb — synthetic IR for hall ambience

class GameAudio {
  private ctx: AudioContext | null = null;
  private muted = false;

  // ── Music state ────────────────────────────────────────────────────────────
  private musicStarted = false;
  private masterMusicGain: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private noiseSource: AudioBufferSourceNode | null = null;
  private shimmerTimer: ReturnType<typeof setTimeout> | null = null;

  // Target gain for music (un-muted). SFX have their own vol per call.
  private readonly MUSIC_GAIN = 0.32;

  constructor() {
    this.muted = localStorage.getItem('luminae_muted') === 'true';
  }

  isMuted() { return this.muted; }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('luminae_muted', String(this.muted));
    // Smoothly fade music in/out
    if (this.masterMusicGain && this.ctx) {
      this.masterMusicGain.gain.setTargetAtTime(
        this.muted ? 0 : this.MUSIC_GAIN,
        this.ctx.currentTime,
        0.4,
      );
    }
    return this.muted;
  }

  private initCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // ── SFX helpers ────────────────────────────────────────────────────────────
  private playTone(freq: number, type: OscillatorType, duration: number, vol = 0.1) {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(vol, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  }

  playCrystalPicked()  { this.playTone(880, 'sine', 0.2, 0.05); }
  playCardPurchased()  {
    this.playTone(523.25, 'sine', 0.1, 0.05);
    setTimeout(() => this.playTone(659.25, 'sine', 0.3, 0.05), 50);
  }
  playTurnStart()      { this.playTone(440, 'triangle', 0.4, 0.05); }
  playWin() {
    if (this.muted) return;
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      setTimeout(() => this.playTone(f, 'square', 0.4, 0.1), i * 150);
    });
  }

  // ── Ambient music ──────────────────────────────────────────────────────────

  startMusic() {
    if (this.musicStarted) return;
    try {
      const ctx = this.initCtx();
      this.musicStarted = true;

      // Master bus for all music
      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : this.MUSIC_GAIN;
      master.connect(ctx.destination);
      this.masterMusicGain = master;

      // ── Convolution reverb (synthetic IR) ──────────────────────────────────
      // We build a large-hall impulse response by filling a buffer with
      // exponentially-decaying noise.  This sounds like a cathedral/void.
      const ir = this.buildReverbIR(ctx, 4.5);
      const convolver = ctx.createConvolver();
      convolver.buffer = ir;
      const reverbOut = ctx.createGain();
      reverbOut.gain.value = 0.42;
      convolver.connect(reverbOut);
      reverbOut.connect(master);

      // Helper: connect a node both dry and to the reverb bus
      const connect = (node: AudioNode, dryVol: number, wetVol: number) => {
        const dry = ctx.createGain();
        dry.gain.value = dryVol;
        const wet = ctx.createGain();
        wet.gain.value = wetVol;
        node.connect(dry);
        node.connect(wet);
        dry.connect(master);
        wet.connect(convolver);
      };

      // ── 1. Drone pads ──────────────────────────────────────────────────────
      // A1 (55), E2 (82.5), A2 (110), C#2 (69.3) — cosmic tonal anchor
      const droneConfigs = [
        { freq: 55.00, lfoHz: 0.042, vol: 0.18 },   // A1 — the deep root
        { freq: 82.50, lfoHz: 0.057, vol: 0.13 },   // E2 — perfect fifth
        { freq: 110.0, lfoHz: 0.033, vol: 0.10 },   // A2 — octave
        { freq: 69.30, lfoHz: 0.048, vol: 0.07 },   // C#2 — major third
        { freq: 164.8, lfoHz: 0.027, vol: 0.06 },   // E3 — high fifth sparkle
      ];

      for (const { freq, lfoHz, vol } of droneConfigs) {
        const pair = ctx.createGain();
        pair.gain.value = vol;

        // Twin oscillators detuned slightly for a lush chorus effect
        for (const detune of [0, 4, -3]) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.detune.value = detune;
          osc.connect(pair);
          osc.start();
          this.droneOscillators.push(osc);
        }

        // LFO: slow volume breathing (0.03–0.06 Hz = 17–33 s cycle)
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        lfo.type = 'sine';
        lfo.frequency.value = lfoHz;
        lfoGain.gain.value = vol * 0.45; // modulation depth
        lfo.connect(lfoGain);
        lfoGain.connect(pair.gain);
        lfo.start();
        this.droneOscillators.push(lfo);

        // Low-pass so the pad is warm, not harsh
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        filter.Q.value = 0.5;
        pair.connect(filter);
        connect(filter, 0.6, 0.4);
      }

      // ── 2. Space-wind noise ────────────────────────────────────────────────
      // 8 s of white noise, looped, through a very tight low-pass.
      // Gives the sensation of gentle cosmic wind / static ambience.
      const noiseBuffer = this.buildNoiseBuffer(ctx, 8);
      const noise = ctx.createBufferSource();
      noise.buffer = noiseBuffer;
      noise.loop = true;

      const noiseLP = ctx.createBiquadFilter();
      noiseLP.type = 'lowpass';
      noiseLP.frequency.value = 280;
      noiseLP.Q.value = 0.3;

      const noiseMod = ctx.createOscillator();   // very slow volume wobble
      const noiseModGain = ctx.createGain();
      noiseMod.frequency.value = 0.02;           // ~50 s cycle
      noiseModGain.gain.value = 0.006;
      noiseMod.connect(noiseModGain);

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.018;
      noiseModGain.connect(noiseGain.gain);
      noise.connect(noiseLP);
      noiseLP.connect(noiseGain);
      noiseMod.start();
      noise.start();
      this.noiseSource = noise;
      connect(noiseGain, 0.5, 0.5);

      // ── 3. Shimmer tones ───────────────────────────────────────────────────
      // Scheduled randomly at pentatonic pitches; fade in/out slowly.
      this.scheduleShimmer(ctx, convolver, master);

    } catch (e) {
      console.warn('Ambient music failed to start', e);
      this.musicStarted = false;
    }
  }

  stopMusic() {
    if (!this.musicStarted) return;
    this.musicStarted = false;

    if (this.shimmerTimer !== null) { clearTimeout(this.shimmerTimer); this.shimmerTimer = null; }

    // Fade master out, then disconnect everything
    if (this.masterMusicGain && this.ctx) {
      this.masterMusicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
    }
    setTimeout(() => {
      for (const osc of this.droneOscillators) { try { osc.stop(); } catch {} }
      this.droneOscillators = [];
      try { this.noiseSource?.stop(); } catch {}
      this.noiseSource = null;
      this.masterMusicGain = null;
    }, 3000);
  }

  isMusicPlaying() { return this.musicStarted; }

  // ── Private music helpers ──────────────────────────────────────────────────

  /** Build a synthetic large-hall reverb impulse response. */
  private buildReverbIR(ctx: AudioContext, durationSec: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * durationSec);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) {
        // Exponential decay envelope × noise; slight early-reflection bump
        const t = i / len;
        const decay = Math.pow(1 - t, 2.8);
        const earlyBoost = i < ctx.sampleRate * 0.05 ? 1.4 : 1.0;
        d[i] = (Math.random() * 2 - 1) * decay * earlyBoost;
      }
    }
    return ir;
  }

  /** Build a white-noise buffer. */
  private buildNoiseBuffer(ctx: AudioContext, durationSec: number): AudioBuffer {
    const len = Math.floor(ctx.sampleRate * durationSec);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  /** Schedule a random pentatonic shimmer tone and re-schedule itself. */
  private scheduleShimmer(ctx: AudioContext, reverb: ConvolverNode, master: GainNode) {
    // A pentatonic palette spanning 3 octaves for airy, spacious tones
    const freqs = [
      110.0, 130.8, 164.8, 196.0, 220.0,   // A2, C3, E3, G3, A3
      261.6, 329.6, 392.0, 440.0, 523.3,   // C4, E4, G4, A4, C5
      659.3, 783.9, 880.0, 1046.5,          // E5, G5, A5, C6
    ];

    const playShimmer = () => {
      if (!this.musicStarted) return;
      if (this.muted) {
        // Still schedule next event even if muted, so music resumes on unmute
        this.shimmerTimer = setTimeout(playShimmer, 6000 + Math.random() * 10000);
        return;
      }

      try {
        const freq = freqs[Math.floor(Math.random() * freqs.length)];
        const duration = 4 + Math.random() * 8;   // 4–12 s fade
        const peakVol = 0.022 + Math.random() * 0.018;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        // Tiny bit of vibrato for organic feel
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibrato.frequency.value = 4.5 + Math.random() * 1.5;
        vibratoGain.gain.value = freq * 0.003;
        vibrato.connect(vibratoGain);
        vibratoGain.connect(osc.frequency);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(peakVol, ctx.currentTime + duration * 0.35);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

        // Dry into master (soft) + wet into reverb
        const wet = ctx.createGain();
        wet.gain.value = 0.6;
        osc.connect(gain);
        gain.connect(wet);
        wet.connect(reverb);
        gain.connect(master);  // small direct signal

        vibrato.start();
        osc.start();
        osc.stop(ctx.currentTime + duration + 0.2);
        vibrato.stop(ctx.currentTime + duration + 0.2);
      } catch {}

      // Schedule next shimmer: 5–16 s gap
      this.shimmerTimer = setTimeout(playShimmer, 5000 + Math.random() * 11000);
    };

    // First shimmer after a short silence so the drones establish first
    this.shimmerTimer = setTimeout(playShimmer, 2500);
  }
}

export const gameAudio = new GameAudio();
