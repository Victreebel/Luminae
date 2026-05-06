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

// Luminary summon cutscene — pre-built MP3 assets, played at their phase beat times.
// Vite statically analyses new URL(literal, import.meta.url) and bundles each file.
const LUMINARY_SFX = {
  firstCrack:       new URL('../assets/audio/luminary/First Crackmp3.mp3',     import.meta.url).href,
  secondCrack:      new URL('../assets/audio/luminary/Second Crack.mp3',       import.meta.url).href,
  deepImpact:       new URL('../assets/audio/luminary/Deep Impact.mp3',        import.meta.url).href,
  glassShatter:     new URL('../assets/audio/luminary/Glass Shatter.mp3',      import.meta.url).href,
  cosmicPortalBoom: new URL('../assets/audio/luminary/Cosmic Portal Boom.mp3', import.meta.url).href,
};

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

  /** Metallic coin spin — rapid decelerating clicks + resonant ring. */
  playFluxCoin() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      // Rapid metallic clicks that decelerate like a real spinning coin
      let offset = 0;
      for (let i = 0; i < 11; i++) {
        const interval = 0.03 + i * 0.014;   // gaps widen as coin slows
        const vol = Math.max(0.015, 0.1 - i * 0.007);
        const freq = 2800 - i * 55;
        this.noiseBlip(ctx, t + offset, 0.035, vol, freq, 12);
        offset += interval;
      }
      // Final landing thud
      this.noiseBlip(ctx, t + offset, 0.09, 0.14, 1600, 5);
      // Resonant metallic ring that fades with the coin
      this.osc(ctx, 1760, 'sine', t, t + 0.85, 0.05, 0.003);
      this.osc(ctx, 2640, 'sine', t, t + 0.5,  0.03, 0.002);
      // Gold shimmer high tone
      this.osc(ctx, GEM_FREQS['flux'], 'sine', t + 0.04, t + 1.0, 0.04, 0.008);
    } catch (e) { console.warn('SFX failed', e); }
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

      this.noiseBlip(ctx, t + offset + 0.08, 0.1, 0.10, 1400, 4);

      this.osc(ctx, 440, 'sine', t + 0.02, t + 0.6, 0.04, 0.005);
      this.osc(ctx, 660, 'sine', t + 0.05, t + 0.4, 0.025, 0.004);
    } catch (e) { console.warn('SFX failed', e); }
  }

  playBonusOnyx() {
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
    } catch (e) { console.warn('SFX failed', e); }
  }

  playBonusRuby() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t = ctx.currentTime;
      this.osc(ctx, 880, 'sine', t, t + 0.6, 0.10, 0.003);
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
    } catch (e) { console.warn('SFX failed', e); }
  }

  playBonusSapphire() {
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
      g.gain.linearRampToValueAtTime(0.10, t + 0.4);
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
    } catch (e) { console.warn('SFX failed', e); }
  }

  playBonusEmerald() {
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
    } catch (e) { console.warn('SFX failed', e); }
  }

  playBonusPearl() {
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
    } catch (e) { console.warn('SFX failed', e); }
  }

  // ── Summon-cutscene helpers ──────────────────────────────────────────────

  /** Oscillator with an LFO applied to frequency — produces an organic warble. */
  private wobble(ctx: AudioContext, startTime: number, durationMs: number, freq: number, lfoHz: number, vol: number, dest?: AudioNode) {
    const dur = durationMs / 1000;
    const o   = ctx.createOscillator();
    const g   = ctx.createGain();
    const lfo = ctx.createOscillator();
    const lfg = ctx.createGain();
    o.type   = 'sine';
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
    lfo.start(startTime);  o.start(startTime);
    lfo.stop(startTime + dur + 0.05);  o.stop(startTime + dur + 0.05);
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
  private async scheduleMp3(url: string, scheduledTime: number, volume: number): Promise<void> {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const resp = await fetch(url);
      const arrayBuf = await resp.arrayBuffer();
      const audioBuf = await ctx.decodeAudioData(arrayBuf);
      if (this.muted) return; // re-check after async gap
      const now = ctx.currentTime;
      if (now > scheduledTime + 0.6) return; // missed the window; skip silently
      const src  = ctx.createBufferSource();
      const gain = ctx.createGain();
      src.buffer = audioBuf;
      gain.gain.value = volume;
      src.connect(gain);
      gain.connect(ctx.destination);
      src.start(Math.max(now, scheduledTime));
    } catch (e) {
      console.warn('[Luminae] MP3 schedule failed', e);
    }
  }

  // ── Luminary Summon Cutscene ─────────────────────────────────────────────
  // All sounds are pre-scheduled at AudioContext times matching the visual
  // phase durations in LuminarySummonCutscene.  Routed through a shared
  // DynamicsCompressor to prevent clipping when layers peak together.
  //
  // Phase offsets (ms from cutscene mount):
  //   establish:   0   (600 ms)
  //   panning:     600 (750 ms)  ← deep whoosh + sub swell
  //   focusing:    1350(600 ms)  ← shimmer
  //   intro:       1950(350 ms)  ← tension build
  //   zooming:     2300(650 ms)
  //   pressure:    2950(500 ms)  ← rattle + hum + warble
  //   firstcrack:  3450(750 ms)  ← snap + ping + bass thump
  //   leaking:     4200(850 ms)  ← airy shimmer + rising tone
  //   secondcrack: 5050(420 ms)  ← staggered pings + sweep
  //   cracking:    5470(1100 ms) ← escalating burst
  //   shattering:  6570(1000 ms) ← rupture + shards + bass bloom
  //   flashing:    7570(950 ms)  ← bright swell + chord + shimmer
  //   revealed:    8520(4200 ms) ← cosmic chord + sub + bell overtones
  playSummonCutscene() {
    if (this.muted) return;
    try {
      const ctx = this.initCtx();
      const t   = ctx.currentTime;

      // Shared compressor so simultaneous layers never clip.
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value      = 10;
      comp.ratio.value     = 8;
      comp.attack.value    = 0.002;
      comp.release.value   = 0.18;
      comp.connect(ctx.destination);
      const D = comp;

      // Convenience: AudioContext seconds from a ms offset.
      const s = (ms: number) => t + ms / 1000;

      const PAN    =  600;
      const FOCUS  = 1350;
      const INTRO  = 1950;
      const PRES   = 2950;
      const CRACK1 = 3450;
      const LEAK   = 4200;
      const CRACK2 = 5050;
      const CRACKS = 5470;
      const SHATT  = 6570;
      const FLASH  = 7570;
      const REVL   = 8520;

      // ── establish (0–600 ms): anticipatory shimmer + sub foundation ─────
      this.noiseBlip(ctx, s(60),  0.5, 0.022, 4600, 2, D);
      this.osc(ctx, 55, 'sine',   s(0), s(FOCUS + 200), 0.07, 0.45, D);

      // ── panning + focusing (600–1950 ms): deep whoosh + sub swell ───────
      this.noiseSweep(ctx, s(PAN), 1.1, 0.10, 55, 700, D);
      this.osc(ctx, 45, 'sine',   s(PAN), s(FOCUS + 420), 0.10, 0.28, D);
      // Faint shimmer as camera locks in
      this.noiseBlip(ctx, s(FOCUS + 130), 0.5, 0.038, 3800, 3, D);
      this.osc(ctx, 1760, 'sine', s(FOCUS + 180), s(FOCUS + 600), 0.032, 0.06, D);

      // ── intro + zooming (1950–2950 ms): quiet tension build ─────────────
      this.osc(ctx, 110, 'sine',  s(INTRO),       s(PRES),       0.05, 0.30, D);
      this.risingTone(ctx, s(INTRO + 220), 720, 155, 215, 0.04, D);

      // ── pressure (2950–3450 ms): crystalline rattle + hum + warble ──────
      for (let i = 0; i < 5; i++) {
        const at = s(PRES + i * 82 + Math.random() * 16);
        // Q=9, 500-1400 Hz — physical crystalline stress, not a tonal ping
        this.noiseBlip(ctx, at, 0.034, 0.038 + Math.random() * 0.022, 500 + Math.random() * 900, 9, D);
      }
      this.osc(ctx, 82, 'sine',   s(PRES), s(CRACK1), 0.08, 0.10, D);
      this.wobble(ctx, s(PRES),   490, 220, 9, 0.05, D);

      // ── firstcrack (3450–4200 ms): structural fracture — snap + crunch + bass ─
      // Main fracture body: low-mid broadband crack (the primary "crack" sound)
      this.noiseBlip(ctx, s(CRACK1),       0.090, 0.14,  420, 9, D);
      // Sharp brittle splinter riding on top
      this.noiseBlip(ctx, s(CRACK1 +  4),  0.038, 0.11, 1050, 11, D);
      // Deep structural crunch — the material giving way
      this.noiseBlip(ctx, s(CRACK1),       0.110, 0.10,  195, 6, D);
      // Stress creak sweep: the fracture front traveling through the panel
      this.noiseSweep(ctx, s(CRACK1 + 28), 0.22, 0.052, 90, 480, D);
      // Low impact weight — preserved from original
      this.osc(ctx, 60,  'sine', s(CRACK1), s(CRACK1 + 310), 0.15, 0.005, D);
      this.osc(ctx, 42,  'sine', s(CRACK1), s(CRACK1 + 470), 0.10, 0.008, D);
      this.osc(ctx, 110, 'sine', s(CRACK1), s(CRACK1 + 200), 0.08, 0.004, D);

      // ── leaking (4200–5050 ms): energy bleed + deep pressure stress ─────
      // Airy broad energy hiss (Q=2 — very broad, not tonal)
      this.noiseBlip(ctx, s(LEAK),        0.84, 0.048, 4300, 2.0, D);
      // Low-frequency pressure moan — the vessel under internal strain
      this.noiseBlip(ctx, s(LEAK +  40),  0.50, 0.046,  480, 5, D);
      // Deep pressure build rising through the low end
      this.noiseSweep(ctx, s(LEAK + 170), 0.65, 0.038,   75, 230, D);
      // Internal pressure tone: a glide, not a ping
      this.risingTone(ctx, s(LEAK), 850, 185, 365, 0.055, D);

      // ── secondcrack (5050–5470 ms): staggered brittle physical snaps ────
      [0, 110, 240, 370].forEach((off, i) => {
        // Crack body: low-mid, low-Q — physical snap, increasing intensity
        this.noiseBlip(ctx, s(CRACK2 + off),     0.050, 0.048 + i * 0.018, 270 + i * 105, 8, D);
        // Brittle splinter tail: mid-range but still broad — not tonal
        this.noiseBlip(ctx, s(CRACK2 + off + 7), 0.026, 0.032 + i * 0.013, 720 + i * 175, 10, D);
      });
      this.noiseSweep(ctx, s(CRACK2), 0.42, 0.088, 360, 3400, D);

      // ── cracking (5470–6570 ms): escalating fracture burst — physical, no pings ─
      [0, 88, 188, 305, 455, 675, 900].forEach((off, i) => {
        const vol = 0.038 + i * 0.016;
        // Fracture body: low-mid, Q=7 — each crack heavier than the last
        const bodyFreq   = 175 + i * 68 + Math.random() * 75;
        this.noiseBlip(ctx, s(CRACKS + off),     0.040, Math.min(vol, 0.12),        bodyFreq,   7, D);
        // Brittle splinter: mid, Q=9 — the sharp leading edge of each crack
        const splintFreq = 530 + i * 125 + Math.random() * 150;
        this.noiseBlip(ctx, s(CRACKS + off + 9), 0.022, Math.min(vol * 0.58, 0.08), splintFreq, 9, D);
      });
      this.noiseSweep(ctx, s(CRACKS), 1.10, 0.10, 270, 5200, D);
      this.osc(ctx, 52, 'sine', s(CRACKS), s(SHATT), 0.09, 0.20, D);

      // ── shattering (6570–7570 ms): rupture + shard spray + bass bloom ────
      this.noiseBlip(ctx, s(SHATT),       0.36, 0.13, 2900, 3.0, D);
      this.noiseBlip(ctx, s(SHATT +  18), 0.27, 0.10, 1550, 2.0, D);
      this.noiseBlip(ctx, s(SHATT +  42), 0.21, 0.07,  760, 1.5, D);
      for (let i = 0; i < 10; i++) {
        const at = s(SHATT + 32 + i * 68 + Math.random() * 32);
        // Q=4 (broad), 700-2500 Hz — broadband shard scatter, not narrow pings
        this.noiseBlip(ctx, at, 0.028, Math.max(0.008, 0.048 - i * 0.003),
                       700 + Math.random() * 1800, 4, D);
      }
      // Descending glass scatter sweeps — energy cascading down as the panel falls
      this.noiseSweep(ctx, s(SHATT +  12), 0.50, 0.062, 3800, 850, D);
      this.noiseSweep(ctx, s(SHATT +  50), 0.40, 0.046, 2600, 600, D);
      this.osc(ctx, 40, 'sine',  s(SHATT),       s(SHATT + 760), 0.14, 0.010, D);
      this.osc(ctx, 58, 'sine',  s(SHATT),       s(SHATT + 560), 0.08, 0.015, D);
      this.osc(ctx, 80, 'sine',  s(SHATT +  18), s(SHATT + 400), 0.055, 0.020, D);

      // ── flashing (7570–8520 ms): bright swell + celestial chord + shimmer ─
      this.osc(ctx, 880,  'sine', s(FLASH),      s(FLASH + 460), 0.11, 0.008, D);
      this.osc(ctx, 1320, 'sine', s(FLASH),      s(FLASH + 310), 0.055, 0.008, D);
      // Cmaj7 voiced: C5 E5 G5 B5
      [523.25, 659.25, 783.99, 987.77].forEach((f, i) => {
        this.osc(ctx, f, 'sine', s(FLASH + 22 + i * 16), s(FLASH + 910), 0.075, 0.012, D);
      });
      this.noiseBlip(ctx, s(FLASH +  38), 0.60, 0.085, 5400, 2.0, D);
      this.noiseBlip(ctx, s(FLASH + 240), 0.50, 0.060, 6600, 2.5, D);

      // ── revealed (8520–12720 ms): cosmic hum + sub + bell overtones ──────
      // C2 G2 C3 E3 warm chord — slow attack, fades before done
      this.osc(ctx, 65.41,  'sine', s(REVL),        s(REVL + 3800), 0.10, 0.38, D);
      this.osc(ctx, 98.00,  'sine', s(REVL +  100),  s(REVL + 3600), 0.07, 0.42, D);
      this.osc(ctx, 130.81, 'sine', s(REVL +  200),  s(REVL + 3400), 0.06, 0.42, D);
      this.osc(ctx, 164.81, 'sine', s(REVL +  300),  s(REVL + 3200), 0.042, 0.42, D);
      // Sub foundation
      this.osc(ctx, 32.7,   'sine', s(REVL +  100),  s(REVL + 3900), 0.08, 0.52, D);
      // Soft bell overtones — staggered entry, long decay
      [523.25, 783.99, 1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
        const at = REVL + 170 + i * 340;
        const dur = Math.max(200, 1600 - i * 80);
        this.osc(ctx, f, 'sine', s(at), s(at + dur), Math.max(0.008, 0.036 - i * 0.004), 0.012, D);
      });

      // ── MP3 sound effects — fired at their exact phase beat times ───────
      // Each file is fetched+decoded async and scheduled precisely on the
      // AudioContext timeline. Decode typically completes well within the
      // ~3.4 s gap before the first beat (CRACK1).
      void this.scheduleMp3(LUMINARY_SFX.firstCrack,       t + CRACK1 / 1000,        0.80);
      void this.scheduleMp3(LUMINARY_SFX.secondCrack,      t + CRACK2 / 1000,        0.76);
      void this.scheduleMp3(LUMINARY_SFX.deepImpact,       t + SHATT  / 1000,        0.90);
      void this.scheduleMp3(LUMINARY_SFX.glassShatter,     t + (SHATT + 80) / 1000,  0.82);
      void this.scheduleMp3(LUMINARY_SFX.cosmicPortalBoom, t + FLASH  / 1000,        0.88);

    } catch (e) {
      console.warn('[Luminae] Summon cutscene audio failed', e);
    }
  }

  playBonusSound(color: GemKey) {
    switch (color) {
      case 'onyx': return this.playBonusOnyx();
      case 'ruby': return this.playBonusRuby();
      case 'sapphire': return this.playBonusSapphire();
      case 'emerald': return this.playBonusEmerald();
      case 'pearl': return this.playBonusPearl();
      default: break;
    }
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
