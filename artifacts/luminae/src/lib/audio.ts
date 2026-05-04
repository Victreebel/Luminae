// ─── Luminae Audio Engine ────────────────────────────────────────────────────
// Blend of cosmic (warm, ethereal) + satisfying UI (snappy pops, tings).
// Each interaction has a distinct sonic character:
//   crystalPicked  — gem-specific ting + tactile click
//   cardPurchased  — bass thud + chord + sparkle arpeggio (celebration!)
//   cardReserved   — mysterious rising swoosh + soft pad
//   turnStart      — cosmic bell (metallic, long decay)
//   win            — epic bass boom + triumphant arpeggio
// Ambient music layers run separately on masterMusicGain.

type GemKey = 'ruby'|'sapphire'|'emerald'|'onyx'|'pearl'|'flux';

// Pentatonic-adjacent frequencies per gem — each has its own "voice"
const GEM_FREQS: Record<GemKey, number> = {
  ruby:     659.25,  // E5 — bright, fiery
  sapphire: 523.25,  // C5 — clear, ordered
  emerald:  587.33,  // D5 — natural, growing
  onyx:     415.30,  // Ab4 — dark, deep
  pearl:    783.99,  // G5 — luminous, pure
  flux:     880.00,  // A5 — wild, special
};

class GameAudio {
  private ctx: AudioContext | null = null;
  private muted = false;

  // ── Music state ─────────────────────────────────────────────────────────
  private musicStarted = false;
  private masterMusicGain: GainNode | null = null;
  private droneOscillators: OscillatorNode[] = [];
  private noiseSource: AudioBufferSourceNode | null = null;
  private shimmerTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly MUSIC_GAIN = 0.32;

  constructor() {
    this.muted = localStorage.getItem('luminae_muted') === 'true';
  }

  isMuted()   { return this.muted; }

  toggleMute() {
    this.muted = !this.muted;
    localStorage.setItem('luminae_muted', String(this.muted));
    if (this.masterMusicGain && this.ctx) {
      this.masterMusicGain.gain.setTargetAtTime(
        this.muted ? 0 : this.MUSIC_GAIN, this.ctx.currentTime, 0.4,
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

  // ── SFX ─────────────────────────────────────────────────────────────────

  /** Crystalline ting at gem-specific pitch + tiny tactile click. */
  playCrystalPicked(color: GemKey = 'ruby') {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      const freq = GEM_FREQS[color];
      // Main ting: sine + quiet overtone
      this.osc(ctx, freq,        'sine',     t,        t + 0.5,  0.12, 0.003);
      this.osc(ctx, freq * 2,    'sine',     t,        t + 0.25, 0.04, 0.002);
      // Tactile click: short bandpass noise
      this.noiseBlip(ctx, t, 0.06, 0.08, freq * 0.8, 6);
    } catch (e) { console.warn('SFX failed', e); }
  }

  /** Big purchase celebration: bass thud + bright chord + sparkle arpeggio. */
  playCardPurchased() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;

      // Bass thud (cosmic depth)
      this.osc(ctx, 80,  'sine', t,        t + 0.5,  0.22, 0.005);
      this.osc(ctx, 55,  'sine', t,        t + 0.8,  0.10, 0.008);

      // Chord: C4 + E4 + G4 — major triad, warm
      this.osc(ctx, 261.6, 'sine', t + 0.04, t + 0.9, 0.10, 0.01);
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
    } catch (e) { console.warn('SFX failed', e); }
  }

  /** Mysterious swoop + soft pad — different from purchase. */
  playCardReserved() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;

      // Rising noise sweep — the "holding" sensation
      this.noiseSweep(ctx, t, 0.45, 0.10, 300, 1800);

      // Soft pad tone: A3 + E4 (fifth interval)
      this.osc(ctx, 220.0, 'sine', t + 0.05, t + 0.8, 0.07, 0.03);
      this.osc(ctx, 329.6, 'sine', t + 0.10, t + 0.7, 0.04, 0.04);

      // Gentle high ting to punctuate
      this.osc(ctx, 1318.5, 'sine', t + 0.38, t + 0.75, 0.035, 0.005);
    } catch (e) { console.warn('SFX failed', e); }
  }

  /** Cosmic bell — metallic tone with long decay. */
  playTurnStart() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;

      // Bell fundamental: 440 Hz with inharmonic partials
      this.osc(ctx, 440.0,  'sine',     t, t + 2.2, 0.14, 0.004);
      this.osc(ctx, 880.0,  'sine',     t, t + 1.2, 0.06, 0.003);
      this.osc(ctx, 1320.0, 'sine',     t, t + 0.8, 0.03, 0.003);
      this.osc(ctx, 2200.0, 'sine',     t, t + 0.5, 0.02, 0.002);

      // Warm upward sweep to signal "your turn"
      this.noiseSweep(ctx, t, 0.3, 0.05, 200, 800);
    } catch (e) { console.warn('SFX failed', e); }
  }

  /** Epic win: bass boom + triumphant arpeggio + high sparkles. */
  playWin() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;

      // Bass boom
      this.osc(ctx, 55,  'sine', t, t + 1.8, 0.25, 0.01);
      this.osc(ctx, 82.5,'sine', t, t + 1.5, 0.15, 0.01);

      // Pad chord: C3 + G3 + C4
      this.osc(ctx, 130.8, 'sine', t + 0.05, t + 2.5, 0.10, 0.04);
      this.osc(ctx, 196.0, 'sine', t + 0.05, t + 2.5, 0.08, 0.04);
      this.osc(ctx, 261.6, 'sine', t + 0.05, t + 2.5, 0.07, 0.04);

      // Triumphant arpeggio: C4 E4 G4 B4 C5 E5 G5
      const notes = [261.6, 329.6, 392.0, 493.9, 523.3, 659.3, 783.9];
      notes.forEach((f, i) => {
        const at = t + 0.12 + i * 0.09;
        this.osc(ctx, f, 'sine', at, at + 0.8, 0.09, 0.005);
      });

      // High sparkle shower
      const sparkFreqs = [1046.5, 1318.5, 1568, 2093, 1760, 2349];
      sparkFreqs.forEach((f, i) => {
        const at = t + 0.5 + i * 0.11;
        this.osc(ctx, f, 'sine', at, at + 0.5, 0.04, 0.003);
      });

      // Noise burst
      this.noiseBlip(ctx, t + 0.1, 0.4, 0.07, 2000, 3);
    } catch (e) { console.warn('SFX failed', e); }
  }

  // Kept for backward compat — maps to crystal ting on ruby
  playCrystalPickedLegacy() { this.playCrystalPicked('ruby'); }

  // ── Ambient music ─────────────────────────────────────────────────────

  startMusic() {
    if (this.musicStarted) return;
    try {
      const ctx = this.initCtx();
      this.musicStarted = true;

      const master = ctx.createGain();
      master.gain.value = this.muted ? 0 : this.MUSIC_GAIN;
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
        const dg = ctx.createGain(); dg.gain.value = dry;
        const wg = ctx.createGain(); wg.gain.value = wet;
        node.connect(dg); node.connect(wg);
        dg.connect(master); wg.connect(convolver);
      };

      const drones = [
        { freq: 55.00, lfoHz: 0.042, vol: 0.18 },
        { freq: 82.50, lfoHz: 0.057, vol: 0.13 },
        { freq: 110.0, lfoHz: 0.033, vol: 0.10 },
        { freq: 69.30, lfoHz: 0.048, vol: 0.07 },
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
    if (this.shimmerTimer !== null) { clearTimeout(this.shimmerTimer); this.shimmerTimer = null; }
    if (this.masterMusicGain && this.ctx) {
      this.masterMusicGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.6);
    }
    setTimeout(() => {
      for (const o of this.droneOscillators) { try { o.stop(); } catch {} }
      this.droneOscillators = [];
      try { this.noiseSource?.stop(); } catch {};
      this.noiseSource = null;
      this.masterMusicGain = null;
    }, 3000);
  }

  isMusicPlaying() { return this.musicStarted; }

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
    const freqs = [
      110.0, 130.8, 164.8, 196.0, 220.0,
      261.6, 329.6, 392.0, 440.0, 523.3,
      659.3, 783.9, 880.0, 1046.5,
    ];
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
          vib.start(); o.start();
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
