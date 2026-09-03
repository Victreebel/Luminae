import { LUMII_SIGNAL_NOTES, type LumiiSignalMode } from "./lumiiIdentity";

const VAULT_DOORS_HALT_WAV = new URL(
  "../assets/audio/Effects/Vault Doors Halt.wav",
  import.meta.url,
).href;
const CIPHER_GLASS_SHATTER_MP3 = new URL(
  "../assets/audio/luminary/Glass Shatter.mp3",
  import.meta.url,
).href;

export type OutOfGameSoundCue =
  | "control"
  | "navigate"
  | "primary"
  | "open"
  | "close"
  | "archive"
  | "store"
  | "settings"
  | "confirm"
  | "vault";
export type OutOfGameAmbientMood =
  | "menu"
  | "dashboard"
  | "archive"
  | "vault"
  | "store"
  | "settings"
  | "lobby";
export type LumiiCinematicCue =
  | "threshold-expand"
  | "cipher-surge"
  | "cipher-collapse"
  | "cipher-dismiss"
  | "architect-cipher-pressure"
  | "architect-cipher-fracture"
  | "architect-cipher-release"
  | "vault-doors-open"
  | "vault-doors-halt"
  | "covenant-break"
  | "board-entry"
  | "vault-release"
  | "reward-reveal";
export type LumiiThresholdScoreMood =
  | "awe"
  | "cipher"
  | "guardian"
  | "hostile"
  | "forecast"
  | "yielding"
  | "release"
  | "leaving";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

export class OutOfGameAudio {
  private ctx: AudioContext | null = null;
  private decodedAudio = new Map<string, Promise<AudioBuffer>>();
  private buses = new Map<
    AudioNode,
    { nodes: AudioNode[]; timer: ReturnType<typeof setTimeout> }
  >();
  private voices = new Map<AudioScheduledSourceNode, AudioNode[]>();
  private thresholdScore: {
    master: GainNode;
    tonalGain: GainNode;
    pressureGain: GainNode;
    shimmerGain: GainNode;
    filter: BiquadFilterNode;
    pressureFilter: BiquadFilterNode;
    nodes: AudioNode[];
    oscillators: OscillatorNode[];
    noise: AudioBufferSourceNode | null;
    mood: LumiiThresholdScoreMood;
  } | null = null;
  private outOfMatchAmbient: {
    master: GainNode;
    harmonicGain: GainNode;
    shimmerGain: GainNode;
    textureGain: GainNode;
    filter: BiquadFilterNode;
    shimmerFilter: BiquadFilterNode;
    nodes: AudioNode[];
    oscillators: OscillatorNode[];
    noise: AudioBufferSourceNode | null;
    mood: OutOfGameAmbientMood;
  } | null = null;
  private requestedOutOfMatchAmbientMood: OutOfGameAmbientMood | null = null;

  private isMuted() {
    try {
      return localStorage.getItem("luminae_muted") === "true";
    } catch {
      return false;
    }
  }

  setMuted(value: boolean) {
    try {
      localStorage.setItem("luminae_muted", String(value));
    } catch {
      /* Storage can be unavailable in privacy-restricted contexts. */
    }
    if (value) {
      this.stopOutOfMatchAmbient(0.18, true);
      this.stopLumiiThresholdScore(0.12);
      for (const root of [...this.buses.keys()]) this.disposeBus(root);
    } else if (this.requestedOutOfMatchAmbientMood) {
      this.startOutOfMatchAmbient(this.requestedOutOfMatchAmbientMood);
    }
  }

  private initContext() {
    if (!this.ctx) {
      const AudioContextClass =
        window.AudioContext ?? (window as AudioWindow).webkitAudioContext;
      if (!AudioContextClass) throw new Error("Web Audio is unavailable");
      this.ctx = new AudioContextClass();
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  private disconnect(node: AudioNode | null | undefined) {
    try {
      node?.disconnect();
    } catch {
      /* Already disconnected. */
    }
  }

  private trackVoice(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
    this.voices.set(source, nodes);
    source.addEventListener(
      "ended",
      () => {
        this.disconnect(source);
        for (const node of nodes) this.disconnect(node);
        this.voices.delete(source);
      },
      { once: true },
    );
  }

  private loadAudioAsset(url: string, ctx: AudioContext) {
    let audioPromise = this.decodedAudio.get(url);
    if (!audioPromise) {
      audioPromise = fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Unable to load audio asset: ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
        .catch((error) => {
          this.decodedAudio.delete(url);
          throw error;
        });
      this.decodedAudio.set(url, audioPromise);
    }
    return audioPromise;
  }

  private preloadAudioAsset(url: string, ctx: AudioContext) {
    if (typeof ctx.decodeAudioData !== "function") return;
    void this.loadAudioAsset(url, ctx).catch(() => undefined);
  }

  private async playAudioAsset(
    url: string,
    ctx: AudioContext,
    volume: number,
    destination: AudioNode,
    startsAt = ctx.currentTime,
  ) {
    const buffer = await this.loadAudioAsset(url, ctx);
    if (this.isMuted()) return;
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    const scheduledAt = Math.max(ctx.currentTime, startsAt);
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, scheduledAt);
    source.connect(gain);
    gain.connect(destination);
    this.trackVoice(source, [gain]);
    source.start(scheduledAt);
  }

  private registerBus(nodes: AudioNode[], lifetimeMs: number) {
    const root = nodes[0];
    if (!root) return;
    const timer = setTimeout(() => this.disposeBus(root), lifetimeMs);
    this.buses.set(root, { nodes, timer });
  }

  private buildNoiseBuffer(ctx: AudioContext, durationSeconds: number) {
    const length = Math.floor(ctx.sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < length; index += 1)
      data[index] = Math.random() * 2 - 1;
    return buffer;
  }

  private disposeThresholdScore(stopDelayMs: number) {
    const score = this.thresholdScore;
    if (!score) return;
    this.thresholdScore = null;
    window.setTimeout(
      () => {
        for (const oscillator of score.oscillators) {
          try {
            oscillator.stop();
          } catch {
            /* Already stopped. */
          }
        }
        try {
          score.noise?.stop();
        } catch {
          /* Already stopped. */
        }
        for (const node of score.nodes) this.disconnect(node);
      },
      Math.max(120, stopDelayMs),
    );
  }

  private disposeOutOfMatchAmbient(stopDelayMs: number) {
    const ambient = this.outOfMatchAmbient;
    if (!ambient) return;
    this.outOfMatchAmbient = null;
    window.setTimeout(
      () => {
        for (const oscillator of ambient.oscillators) {
          try {
            oscillator.stop();
          } catch {
            /* Already stopped. */
          }
        }
        try {
          ambient.noise?.stop();
        } catch {
          /* Already stopped. */
        }
        for (const node of ambient.nodes) this.disconnect(node);
      },
      Math.max(120, stopDelayMs),
    );
  }

  startOutOfMatchAmbient(mood: OutOfGameAmbientMood = "menu") {
    this.requestedOutOfMatchAmbientMood = mood;
    if (this.isMuted()) return false;
    try {
      if (this.outOfMatchAmbient) {
        this.setOutOfMatchAmbientMood(mood);
        return true;
      }

      const ctx = this.initContext();
      const now = ctx.currentTime;
      const master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      const harmonicGain = ctx.createGain();
      const shimmerGain = ctx.createGain();
      const textureGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const shimmerFilter = ctx.createBiquadFilter();
      const nodes: AudioNode[] = [
        master,
        compressor,
        harmonicGain,
        shimmerGain,
        textureGain,
        filter,
        shimmerFilter,
      ];
      const oscillators: OscillatorNode[] = [];

      compressor.threshold.value = -28;
      compressor.knee.value = 18;
      compressor.ratio.value = 3.5;
      compressor.attack.value = 0.02;
      compressor.release.value = 0.5;
      filter.type = "lowpass";
      filter.Q.value = 0.6;
      shimmerFilter.type = "highpass";
      shimmerFilter.Q.value = 0.5;
      master.gain.setValueAtTime(0.0001, now);
      harmonicGain.gain.value = 0.045;
      shimmerGain.gain.value = 0.012;
      textureGain.gain.value = 0.006;

      harmonicGain.connect(filter);
      filter.connect(master);
      shimmerGain.connect(shimmerFilter);
      shimmerFilter.connect(master);
      textureGain.connect(filter);
      master.connect(compressor);
      compressor.connect(ctx.destination);

      const addOscillator = (
        frequency: number,
        type: OscillatorType,
        gainValue: number,
        destination: AudioNode,
        detune = 0,
      ) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        oscillator.detune.value = detune;
        gain.gain.value = gainValue;
        oscillator.connect(gain);
        gain.connect(destination);
        oscillator.start(now);
        oscillators.push(oscillator);
        nodes.push(oscillator, gain);
      };

      [49, 73.42, 98].forEach((frequency, index) => {
        addOscillator(
          frequency,
          "sine",
          0.035 - index * 0.006,
          harmonicGain,
          index % 2 ? 5 : -5,
        );
      });
      [196, 293.66, 392, 587.33].forEach((frequency, index) => {
        addOscillator(
          frequency,
          index % 2 ? "triangle" : "sine",
          0.008,
          shimmerGain,
          index % 2 ? 8 : -8,
        );
      });

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.08;
      lfoGain.gain.value = 0.006;
      lfo.connect(lfoGain);
      lfoGain.connect(harmonicGain.gain);
      lfo.start(now);
      oscillators.push(lfo);
      nodes.push(lfo, lfoGain);

      const noise = ctx.createBufferSource();
      const noiseFilter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      noise.buffer = this.buildNoiseBuffer(ctx, 9);
      noise.loop = true;
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.value = 260;
      noiseFilter.Q.value = 0.35;
      noiseGain.gain.value = 0.006;
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(textureGain);
      noise.start(now);
      nodes.push(noise, noiseFilter, noiseGain);

      this.outOfMatchAmbient = {
        master,
        harmonicGain,
        shimmerGain,
        textureGain,
        filter,
        shimmerFilter,
        nodes,
        oscillators,
        noise,
        mood,
      };
      master.gain.linearRampToValueAtTime(0.045, now + 1.1);
      this.setOutOfMatchAmbientMood(mood);
      return true;
    } catch (error) {
      console.warn("[Luminae] Out-of-game ambience failed", error);
      this.stopOutOfMatchAmbient(0.1);
      return false;
    }
  }

  setOutOfMatchAmbientMood(mood: OutOfGameAmbientMood) {
    this.requestedOutOfMatchAmbientMood = mood;
    const ambient = this.outOfMatchAmbient;
    if (!ambient || !this.ctx) return false;
    ambient.mood = mood;
    const now = this.ctx.currentTime;
    const settings: Record<
      OutOfGameAmbientMood,
      {
        master: number;
        harmonic: number;
        shimmer: number;
        texture: number;
        filter: number;
        shimmerFilter: number;
        time: number;
      }
    > = {
      menu: {
        master: 0.04,
        harmonic: 0.04,
        shimmer: 0.01,
        texture: 0.004,
        filter: 680,
        shimmerFilter: 1_900,
        time: 1.2,
      },
      dashboard: {
        master: 0.045,
        harmonic: 0.042,
        shimmer: 0.012,
        texture: 0.005,
        filter: 760,
        shimmerFilter: 1_850,
        time: 1.1,
      },
      archive: {
        master: 0.052,
        harmonic: 0.036,
        shimmer: 0.022,
        texture: 0.006,
        filter: 980,
        shimmerFilter: 1_650,
        time: 0.9,
      },
      vault: {
        master: 0.066,
        harmonic: 0.05,
        shimmer: 0.014,
        texture: 0.012,
        filter: 520,
        shimmerFilter: 2_200,
        time: 1.0,
      },
      store: {
        master: 0.046,
        harmonic: 0.032,
        shimmer: 0.026,
        texture: 0.004,
        filter: 1_100,
        shimmerFilter: 1_450,
        time: 0.75,
      },
      settings: {
        master: 0.035,
        harmonic: 0.026,
        shimmer: 0.01,
        texture: 0.003,
        filter: 620,
        shimmerFilter: 2_100,
        time: 0.65,
      },
      lobby: {
        master: 0.048,
        harmonic: 0.048,
        shimmer: 0.012,
        texture: 0.006,
        filter: 620,
        shimmerFilter: 1_900,
        time: 1.1,
      },
    };
    const next = settings[mood];
    ambient.master.gain.setTargetAtTime(next.master, now, next.time);
    ambient.harmonicGain.gain.setTargetAtTime(next.harmonic, now, next.time);
    ambient.shimmerGain.gain.setTargetAtTime(next.shimmer, now, next.time);
    ambient.textureGain.gain.setTargetAtTime(next.texture, now, next.time);
    ambient.filter.frequency.setTargetAtTime(next.filter, now, next.time);
    ambient.shimmerFilter.frequency.setTargetAtTime(
      next.shimmerFilter,
      now,
      next.time,
    );
    return true;
  }

  stopOutOfMatchAmbient(releaseSeconds = 0.55, rememberRequestedMood = false) {
    if (!rememberRequestedMood) this.requestedOutOfMatchAmbientMood = null;
    const ambient = this.outOfMatchAmbient;
    if (!ambient || !this.ctx) return false;
    const now = this.ctx.currentTime;
    ambient.master.gain.cancelScheduledValues(now);
    ambient.master.gain.setValueAtTime(
      Math.max(0.0001, ambient.master.gain.value),
      now,
    );
    ambient.master.gain.exponentialRampToValueAtTime(
      0.0001,
      now + Math.max(0.08, releaseSeconds),
    );
    this.disposeOutOfMatchAmbient((releaseSeconds + 0.2) * 1000);
    return true;
  }

  resumeOutOfMatchAmbient() {
    if (!this.requestedOutOfMatchAmbientMood || this.isMuted()) return false;
    return this.startOutOfMatchAmbient(this.requestedOutOfMatchAmbientMood);
  }

  startLumiiThresholdScore(mood: LumiiThresholdScoreMood = "awe") {
    if (this.isMuted()) return false;
    try {
      if (this.thresholdScore) {
        this.setLumiiThresholdScoreMood(mood);
        return true;
      }

      const ctx = this.initContext();
      const now = ctx.currentTime;
      const master = ctx.createGain();
      const compressor = ctx.createDynamicsCompressor();
      const dry = ctx.createGain();
      const wet = ctx.createGain();
      const convolver = ctx.createConvolver();
      const tonalGain = ctx.createGain();
      const pressureGain = ctx.createGain();
      const shimmerGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const pressureFilter = ctx.createBiquadFilter();
      const nodes: AudioNode[] = [
        master,
        compressor,
        dry,
        wet,
        convolver,
        tonalGain,
        pressureGain,
        shimmerGain,
        filter,
        pressureFilter,
      ];
      const oscillators: OscillatorNode[] = [];

      const ir = ctx.createBuffer(
        2,
        Math.floor(ctx.sampleRate * 3.2),
        ctx.sampleRate,
      );
      for (let channel = 0; channel < ir.numberOfChannels; channel += 1) {
        const data = ir.getChannelData(channel);
        for (let index = 0; index < data.length; index += 1) {
          const t = index / data.length;
          data[index] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3.1);
        }
      }

      convolver.buffer = ir;
      compressor.threshold.value = -24;
      compressor.knee.value = 14;
      compressor.ratio.value = 4.5;
      compressor.attack.value = 0.01;
      compressor.release.value = 0.32;
      filter.type = "lowpass";
      filter.Q.value = 0.7;
      pressureFilter.type = "bandpass";
      pressureFilter.Q.value = 1.8;
      master.gain.setValueAtTime(0.0001, now);
      tonalGain.gain.value = 0.12;
      pressureGain.gain.value = 0.001;
      shimmerGain.gain.value = 0.028;
      dry.gain.value = 0.76;
      wet.gain.value = 0.28;

      tonalGain.connect(filter);
      filter.connect(dry);
      filter.connect(convolver);
      pressureGain.connect(pressureFilter);
      pressureFilter.connect(dry);
      pressureFilter.connect(convolver);
      shimmerGain.connect(dry);
      shimmerGain.connect(convolver);
      convolver.connect(wet);
      dry.connect(master);
      wet.connect(master);
      master.connect(compressor);
      compressor.connect(ctx.destination);

      const addOscillator = (
        frequency: number,
        type: OscillatorType,
        gainValue: number,
        destination: AudioNode,
        detune = 0,
      ) => {
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = type;
        oscillator.frequency.value = frequency;
        oscillator.detune.value = detune;
        gain.gain.value = gainValue;
        oscillator.connect(gain);
        gain.connect(destination);
        oscillator.start(now);
        oscillators.push(oscillator);
        nodes.push(oscillator, gain);
      };

      [55, 82.5, 110].forEach((frequency, index) => {
        addOscillator(
          frequency,
          "sine",
          0.22 - index * 0.045,
          tonalGain,
          index === 1 ? 5 : -4,
        );
      });
      [164.8, 196, 261.63, 392].forEach((frequency, index) => {
        addOscillator(
          frequency,
          index % 2 ? "triangle" : "sine",
          0.026,
          shimmerGain,
          index % 2 ? 7 : -7,
        );
      });
      [92.5, 138.75, 185, 277.18].forEach((frequency, index) => {
        addOscillator(
          frequency,
          index === 3 ? "sawtooth" : "triangle",
          0.075 - index * 0.01,
          pressureGain,
          index % 2 ? -10 : 8,
        );
      });

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = "sine";
      lfo.frequency.value = 0.22;
      lfoGain.gain.value = 0.018;
      lfo.connect(lfoGain);
      lfoGain.connect(pressureGain.gain);
      lfo.start(now);
      oscillators.push(lfo);
      nodes.push(lfo, lfoGain);

      const noise = ctx.createBufferSource();
      const noiseFilter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      noise.buffer = this.buildNoiseBuffer(ctx, 7);
      noise.loop = true;
      noiseFilter.type = "lowpass";
      noiseFilter.frequency.value = 420;
      noiseFilter.Q.value = 0.4;
      noiseGain.gain.value = 0.012;
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(pressureFilter);
      noise.start(now);
      nodes.push(noise, noiseFilter, noiseGain);

      this.thresholdScore = {
        master,
        tonalGain,
        pressureGain,
        shimmerGain,
        filter,
        pressureFilter,
        nodes,
        oscillators,
        noise,
        mood,
      };
      master.gain.linearRampToValueAtTime(0.18, now + 0.7);
      this.setLumiiThresholdScoreMood(mood);
      return true;
    } catch (error) {
      console.warn("[Luminae] Lumii Threshold score failed", error);
      this.stopLumiiThresholdScore(0.1);
      return false;
    }
  }

  setLumiiThresholdScoreMood(mood: LumiiThresholdScoreMood) {
    const score = this.thresholdScore;
    if (!score || !this.ctx) return false;
    score.mood = mood;
    const now = this.ctx.currentTime;
    const settings: Record<
      LumiiThresholdScoreMood,
      {
        master: number;
        tonal: number;
        pressure: number;
        shimmer: number;
        filter: number;
        pressureFilter: number;
        time: number;
      }
    > = {
      awe: {
        master: 0.18,
        tonal: 0.12,
        pressure: 0.002,
        shimmer: 0.028,
        filter: 1_050,
        pressureFilter: 280,
        time: 1.2,
      },
      cipher: {
        master: 0.22,
        tonal: 0.1,
        pressure: 0.018,
        shimmer: 0.052,
        filter: 1_800,
        pressureFilter: 620,
        time: 0.55,
      },
      guardian: {
        master: 0.2,
        tonal: 0.11,
        pressure: 0.01,
        shimmer: 0.04,
        filter: 1_420,
        pressureFilter: 390,
        time: 1.0,
      },
      hostile: {
        master: 0.28,
        tonal: 0.075,
        pressure: 0.075,
        shimmer: 0.018,
        filter: 860,
        pressureFilter: 860,
        time: 0.42,
      },
      forecast: {
        master: 0.24,
        tonal: 0.055,
        pressure: 0.052,
        shimmer: 0.012,
        filter: 620,
        pressureFilter: 520,
        time: 0.55,
      },
      yielding: {
        master: 0.17,
        tonal: 0.095,
        pressure: 0.012,
        shimmer: 0.055,
        filter: 1_650,
        pressureFilter: 340,
        time: 1.2,
      },
      release: {
        master: 0.2,
        tonal: 0.11,
        pressure: 0.001,
        shimmer: 0.07,
        filter: 2_600,
        pressureFilter: 260,
        time: 1.35,
      },
      leaving: {
        master: 0.09,
        tonal: 0.055,
        pressure: 0.001,
        shimmer: 0.014,
        filter: 700,
        pressureFilter: 240,
        time: 0.6,
      },
    };
    const next = settings[mood];
    score.master.gain.setTargetAtTime(next.master, now, next.time);
    score.tonalGain.gain.setTargetAtTime(next.tonal, now, next.time);
    score.pressureGain.gain.setTargetAtTime(
      next.pressure,
      now,
      next.time * 0.85,
    );
    score.shimmerGain.gain.setTargetAtTime(next.shimmer, now, next.time);
    score.filter.frequency.setTargetAtTime(next.filter, now, next.time);
    score.pressureFilter.frequency.setTargetAtTime(
      next.pressureFilter,
      now,
      next.time,
    );
    return true;
  }

  stopLumiiThresholdScore(releaseSeconds = 0.45) {
    const score = this.thresholdScore;
    if (!score || !this.ctx) return false;
    const now = this.ctx.currentTime;
    score.master.gain.cancelScheduledValues(now);
    score.master.gain.setValueAtTime(
      Math.max(0.0001, score.master.gain.value),
      now,
    );
    score.master.gain.exponentialRampToValueAtTime(
      0.0001,
      now + Math.max(0.08, releaseSeconds),
    );
    this.disposeThresholdScore((releaseSeconds + 0.2) * 1000);
    return true;
  }

  private disposeBus(root: AudioNode) {
    const bus = this.buses.get(root);
    if (!bus) return;
    clearTimeout(bus.timer);
    for (const node of bus.nodes) this.disconnect(node);
    this.buses.delete(root);
  }

  private oscillator(
    ctx: AudioContext,
    frequency: number,
    type: OscillatorType,
    startsAt: number,
    endsAt: number,
    volume: number,
    attack: number,
    destination: AudioNode,
  ) {
    const source = ctx.createOscillator();
    const gain = ctx.createGain();
    source.type = type;
    source.frequency.value = frequency;
    gain.gain.setValueAtTime(0.001, startsAt);
    gain.gain.linearRampToValueAtTime(volume, startsAt + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, endsAt);
    source.connect(gain);
    gain.connect(destination);
    this.trackVoice(source, [gain]);
    source.start(startsAt);
    source.stop(endsAt + 0.04);
    return source;
  }

  private noise(
    ctx: AudioContext,
    startsAt: number,
    duration: number,
    volume: number,
    frequencyStart: number,
    frequencyEnd: number,
    q: number,
    destination: AudioNode,
  ) {
    const frameCount = Math.ceil(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1)
      data[index] = Math.random() * 2 - 1;

    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    source.buffer = buffer;
    filter.type = "bandpass";
    filter.Q.value = q;
    filter.frequency.setValueAtTime(frequencyStart, startsAt);
    if (frequencyStart !== frequencyEnd) {
      filter.frequency.exponentialRampToValueAtTime(
        frequencyEnd,
        startsAt + duration,
      );
    }
    gain.gain.setValueAtTime(volume, startsAt);
    gain.gain.exponentialRampToValueAtTime(0.001, startsAt + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    this.trackVoice(source, [filter, gain]);
    source.start(startsAt);
    source.stop(startsAt + duration + 0.04);
  }

  private playVaultDoorsHaltFallback(
    ctx: AudioContext,
    startsAt: number,
    destination: AudioNode,
  ) {
    this.noise(ctx, startsAt, 0.13, 0.075, 390, 210, 2.2, destination);
    this.noise(ctx, startsAt + 0.045, 0.22, 0.03, 1_500, 430, 4.2, destination);
    this.oscillator(
      ctx,
      43,
      "sine",
      startsAt,
      startsAt + 0.42,
      0.105,
      0.004,
      destination,
    );
    [196, 294, 392, 588].forEach((frequency, index) => {
      const start = startsAt + index * 0.012;
      this.oscillator(
        ctx,
        frequency,
        "triangle",
        start,
        start + 0.24 + index * 0.025,
        0.034 - index * 0.004,
        0.003,
        destination,
      );
    });
  }

  play(cue: OutOfGameSoundCue) {
    if (this.isMuted()) return false;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      const tone = ctx.createBiquadFilter();
      tone.type = "lowpass";
      tone.frequency.value =
        cue === "vault"
          ? 2_600
          : cue === "archive"
            ? 3_200
            : cue === "store"
              ? 4_900
              : cue === "settings"
                ? 3_600
                : 4_200;
      tone.Q.value = 0.7;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -20;
      compressor.knee.value = 10;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.14;

      const master = ctx.createGain();
      master.gain.value =
        cue === "vault"
          ? 0.46
          : cue === "confirm"
            ? 0.38
            : cue === "primary"
              ? 0.4
              : cue === "archive" || cue === "store"
                ? 0.34
                : 0.32;
      tone.connect(compressor);
      compressor.connect(master);
      master.connect(ctx.destination);
      this.registerBus(
        [tone, compressor, master],
        cue === "vault"
          ? 1_250
          : cue === "archive" || cue === "store" || cue === "confirm"
            ? 950
            : 700,
      );

      switch (cue) {
        case "confirm":
          this.noise(ctx, now, 0.048, 0.056, 520, 520, 3.6, tone);
          this.oscillator(ctx, 73, "sine", now, now + 0.3, 0.11, 0.004, tone);
          [220, 330, 440].forEach((frequency, index) => {
            const start = now + 0.035 + index * 0.035;
            this.oscillator(
              ctx,
              frequency,
              "sine",
              start,
              start + 0.24,
              0.032 - index * 0.004,
              0.01,
              tone,
            );
          });
          break;
        case "primary":
          this.noise(ctx, now, 0.052, 0.07, 330, 330, 2.8, tone);
          this.oscillator(ctx, 68, "sine", now, now + 0.28, 0.13, 0.004, tone);
          this.oscillator(
            ctx,
            204,
            "triangle",
            now + 0.006,
            now + 0.18,
            0.05,
            0.004,
            tone,
          );
          this.oscillator(
            ctx,
            306,
            "triangle",
            now + 0.018,
            now + 0.13,
            0.026,
            0.003,
            tone,
          );
          break;
        case "archive":
          this.noise(ctx, now, 0.16, 0.026, 1_200, 420, 3.2, tone);
          this.oscillator(ctx, 98, "sine", now, now + 0.28, 0.052, 0.014, tone);
          [196, 293.66, 392].forEach((frequency, index) => {
            const start = now + 0.025 + index * 0.045;
            this.oscillator(
              ctx,
              frequency,
              "triangle",
              start,
              start + 0.22,
              0.027 - index * 0.004,
              0.008,
              tone,
            );
          });
          break;
        case "store":
          this.noise(ctx, now, 0.035, 0.034, 1_400, 1_400, 5, tone);
          [523.25, 659.25, 783.99].forEach((frequency, index) => {
            const start = now + index * 0.04;
            this.oscillator(
              ctx,
              frequency,
              "sine",
              start,
              start + 0.28,
              0.023 - index * 0.003,
              0.008,
              tone,
            );
          });
          this.oscillator(
            ctx,
            110,
            "triangle",
            now,
            now + 0.22,
            0.034,
            0.004,
            tone,
          );
          break;
        case "settings":
          this.noise(ctx, now, 0.02, 0.035, 920, 920, 5, tone);
          this.oscillator(
            ctx,
            246,
            "triangle",
            now,
            now + 0.09,
            0.034,
            0.002,
            tone,
          );
          this.oscillator(
            ctx,
            369.99,
            "triangle",
            now + 0.028,
            now + 0.11,
            0.022,
            0.002,
            tone,
          );
          break;
        case "navigate":
          this.noise(ctx, now, 0.032, 0.046, 820, 820, 6, tone);
          this.oscillator(
            ctx,
            164,
            "triangle",
            now,
            now + 0.11,
            0.042,
            0.003,
            tone,
          );
          this.oscillator(
            ctx,
            246,
            "triangle",
            now + 0.032,
            now + 0.12,
            0.024,
            0.003,
            tone,
          );
          break;
        case "open":
          this.noise(ctx, now, 0.13, 0.026, 980, 320, 3, tone);
          this.noise(ctx, now, 0.026, 0.04, 640, 640, 5, tone);
          this.oscillator(
            ctx,
            146,
            "triangle",
            now,
            now + 0.13,
            0.04,
            0.003,
            tone,
          );
          this.oscillator(
            ctx,
            220,
            "triangle",
            now + 0.052,
            now + 0.15,
            0.025,
            0.003,
            tone,
          );
          break;
        case "close": {
          this.noise(ctx, now, 0.04, 0.05, 430, 430, 4, tone);
          const closingVoice = this.oscillator(
            ctx,
            196,
            "triangle",
            now,
            now + 0.14,
            0.045,
            0.003,
            tone,
          );
          closingVoice.frequency.exponentialRampToValueAtTime(98, now + 0.13);
          this.oscillator(
            ctx,
            73,
            "sine",
            now + 0.028,
            now + 0.19,
            0.052,
            0.003,
            tone,
          );
          break;
        }
        case "vault": {
          this.noise(ctx, now, 0.09, 0.09, 155, 155, 1.6, tone);
          this.oscillator(ctx, 46, "sine", now, now + 0.52, 0.19, 0.006, tone);
          this.oscillator(
            ctx,
            92,
            "triangle",
            now + 0.012,
            now + 0.34,
            0.062,
            0.008,
            tone,
          );
          const sealVoice = this.oscillator(
            ctx,
            277,
            "triangle",
            now + 0.035,
            now + 0.46,
            0.04,
            0.012,
            tone,
          );
          sealVoice.frequency.exponentialRampToValueAtTime(110, now + 0.43);
          this.noise(ctx, now + 0.13, 0.055, 0.052, 460, 460, 5, tone);
          this.oscillator(
            ctx,
            41,
            "sine",
            now + 0.18,
            now + 0.62,
            0.085,
            0.01,
            tone,
          );
          break;
        }
        case "control":
        default:
          this.noise(ctx, now, 0.025, 0.04, 680, 680, 5, tone);
          this.oscillator(
            ctx,
            172,
            "triangle",
            now,
            now + 0.075,
            0.034,
            0.002,
            tone,
          );
          break;
      }
      return true;
    } catch (error) {
      console.warn("[Luminae] Out-of-game SFX failed", error);
      return false;
    }
  }

  playLumiiSignal(mode: LumiiSignalMode = "guardian") {
    if (this.isMuted()) return false;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const filter = ctx.createBiquadFilter();
      filter.type = mode === "hostile" ? "bandpass" : "lowpass";
      filter.frequency.value = mode === "hostile" ? 1_760 : 3_200;
      filter.Q.value = mode === "hostile" ? 2.2 : 0.8;
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      const master = ctx.createGain();
      master.gain.value = mode === "hostile" ? 0.22 : 0.18;
      filter.connect(compressor);
      compressor.connect(master);
      master.connect(ctx.destination);
      this.registerBus([filter, compressor, master], 1_900);

      const notes = LUMII_SIGNAL_NOTES[mode];
      notes.forEach((frequency, index) => {
        const start = now + index * (mode === "hostile" ? 0.042 : 0.055);
        const end = start + (mode === "hostile" ? 0.42 : 0.62);
        this.oscillator(
          ctx,
          frequency,
          mode === "hostile" && index % 2 === 0 ? "triangle" : "sine",
          start,
          end,
          Math.max(0.012, 0.035 - index * 0.0035),
          0.012,
          filter,
        );
      });
      if (mode === "hostile") {
        this.noise(ctx, now + 0.04, 0.32, 0.018, 1_800, 460, 3.5, filter);
      }
      return true;
    } catch (error) {
      console.warn("[Luminae] Lumii signal failed", error);
      return false;
    }
  }

  playLumiiCinematic(cue: LumiiCinematicCue) {
    if (this.isMuted()) return false;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;
      const filter = ctx.createBiquadFilter();
      const compressor = ctx.createDynamicsCompressor();
      const master = ctx.createGain();

      compressor.threshold.value = -24;
      compressor.knee.value = 14;
      compressor.ratio.value = 5;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.18;
      filter.connect(compressor);
      compressor.connect(master);
      master.connect(ctx.destination);
      this.registerBus(
        [filter, compressor, master],
        cue === "vault-doors-open"
          ? 3_600
          : cue === "architect-cipher-fracture"
            ? 5_400
            : 2_200,
      );

      switch (cue) {
        case "threshold-expand": {
          filter.type = "lowpass";
          filter.frequency.value = 1_800;
          filter.Q.value = 0.8;
          master.gain.value = 0.22;
          this.noise(ctx, now, 0.48, 0.028, 170, 760, 1.2, filter);
          const foundation = this.oscillator(
            ctx,
            42,
            "sine",
            now,
            now + 0.68,
            0.1,
            0.025,
            filter,
          );
          foundation.frequency.exponentialRampToValueAtTime(67, now + 0.62);
          const mechanism = this.oscillator(
            ctx,
            126,
            "triangle",
            now + 0.04,
            now + 0.5,
            0.024,
            0.02,
            filter,
          );
          mechanism.frequency.exponentialRampToValueAtTime(196, now + 0.46);
          break;
        }
        case "cipher-surge": {
          filter.type = "highpass";
          filter.frequency.value = 220;
          filter.Q.value = 0.7;
          master.gain.value = 0.18;
          this.noise(ctx, now, 0.4, 0.022, 420, 2_800, 3, filter);
          [392, 523.25, 659.25, 783.99, 987.77, 1_046.5].forEach(
            (frequency, index) => {
              const start = now + index * 0.055;
              this.oscillator(
                ctx,
                frequency,
                "sine",
                start,
                start + 0.3,
                0.025 - index * 0.002,
                0.012,
                filter,
              );
            },
          );
          this.oscillator(ctx, 58, "sine", now, now + 0.5, 0.055, 0.02, filter);
          break;
        }
        case "architect-cipher-pressure": {
          this.preloadAudioAsset(CIPHER_GLASS_SHATTER_MP3, ctx);
          filter.type = "lowpass";
          filter.frequency.value = 980;
          filter.Q.value = 1.35;
          master.gain.value = 0.18;
          this.noise(ctx, now, 1.34, 0.018, 120, 680, 1.4, filter);
          const foundation = this.oscillator(
            ctx,
            47,
            "sine",
            now,
            now + 1.42,
            0.09,
            0.016,
            filter,
          );
          foundation.frequency.exponentialRampToValueAtTime(34, now + 1.38);
          const strain = this.oscillator(
            ctx,
            112,
            "sawtooth",
            now + 0.08,
            now + 1.36,
            0.013,
            0.002,
            filter,
          );
          strain.frequency.exponentialRampToValueAtTime(168, now + 1.32);
          [0.38, 0.82, 1.14].forEach((offset, index) => {
            const knock = this.oscillator(
              ctx,
              82 - index * 8,
              "triangle",
              now + offset,
              now + offset + 0.18,
              0.024 + index * 0.004,
              0.003,
              filter,
            );
            knock.frequency.exponentialRampToValueAtTime(
              48 - index * 4,
              now + offset + 0.16,
            );
          });
          break;
        }
        case "cipher-collapse": {
          filter.type = "lowpass";
          filter.frequency.value = 2_400;
          filter.Q.value = 1.1;
          master.gain.value = 0.23;
          const collapse = this.oscillator(
            ctx,
            1_046.5,
            "triangle",
            now,
            now + 0.36,
            0.06,
            0.006,
            filter,
          );
          collapse.frequency.exponentialRampToValueAtTime(130, now + 0.33);
          this.noise(ctx, now, 0.3, 0.038, 2_200, 150, 2.4, filter);
          this.oscillator(
            ctx,
            47,
            "sine",
            now + 0.21,
            now + 0.48,
            0.09,
            0.004,
            filter,
          );
          break;
        }
        case "cipher-dismiss": {
          filter.type = "lowpass";
          filter.frequency.value = 2_900;
          filter.Q.value = 1.15;
          master.gain.value = 0.17;
          const dismissal = this.oscillator(
            ctx,
            880,
            "triangle",
            now,
            now + 0.46,
            0.044,
            0.008,
            filter,
          );
          dismissal.frequency.exponentialRampToValueAtTime(96, now + 0.43);
          this.noise(ctx, now, 0.48, 0.026, 2_300, 240, 2.8, filter);
          [659.25, 523.25, 392].forEach((frequency, index) => {
            const start = now + 0.04 + index * 0.055;
            this.oscillator(
              ctx,
              frequency,
              "sine",
              start,
              start + 0.24,
              0.018 - index * 0.003,
              0.008,
              filter,
            );
          });
          this.oscillator(
            ctx,
            52,
            "sine",
            now + 0.28,
            now + 0.54,
            0.052,
            0.008,
            filter,
          );
          break;
        }
        case "architect-cipher-fracture": {
          this.preloadAudioAsset(CIPHER_GLASS_SHATTER_MP3, ctx);
          filter.type = "lowpass";
          filter.frequency.value = 2_700;
          filter.Q.value = 1.05;
          master.gain.value = 0.19;

          const pressure = this.oscillator(
            ctx,
            58,
            "sine",
            now,
            now + 2.58,
            0.075,
            0.006,
            filter,
          );
          pressure.frequency.exponentialRampToValueAtTime(31, now + 2.54);

          const resistance = this.oscillator(
            ctx,
            118,
            "sawtooth",
            now + 0.08,
            now + 2.08,
            0.011,
            0.002,
            filter,
          );
          resistance.frequency.exponentialRampToValueAtTime(410, now + 2.04);

          [0.5, 1.16, 1.7].forEach((offset, index) => {
            const groan = this.oscillator(
              ctx,
              96 - index * 11,
              "triangle",
              now + offset,
              now + offset + 0.34,
              0.027 + index * 0.005,
              0.003,
              filter,
            );
            groan.frequency.exponentialRampToValueAtTime(
              52 - index * 5,
              now + offset + 0.31,
            );
            this.noise(ctx, now + offset, 0.18, 0.013, 1_500, 180, 1.8, filter);
          });

          const ruptureAt = now + 2.08;
          if (typeof ctx.decodeAudioData === "function") {
            void this.playAudioAsset(
              CIPHER_GLASS_SHATTER_MP3,
              ctx,
              0.28,
              filter,
              ruptureAt,
            ).catch(() => undefined);
          }
          this.noise(ctx, ruptureAt, 0.09, 0.082, 5_200, 680, 4.1, filter);
          this.noise(
            ctx,
            ruptureAt + 0.035,
            0.48,
            0.044,
            2_100,
            120,
            2.8,
            filter,
          );
          const impact = this.oscillator(
            ctx,
            44,
            "sine",
            ruptureAt,
            now + 2.6,
            0.12,
            0.004,
            filter,
          );
          impact.frequency.exponentialRampToValueAtTime(24, now + 2.56);
          break;
        }
        case "architect-cipher-release": {
          filter.type = "lowpass";
          filter.frequency.value = 840;
          filter.Q.value = 0.9;
          master.gain.value = 0.14;
          this.noise(ctx, now, 1.06, 0.026, 720, 70, 1.9, filter);
          const release = this.oscillator(
            ctx,
            76,
            "triangle",
            now,
            now + 1.08,
            0.04,
            0.006,
            filter,
          );
          release.frequency.exponentialRampToValueAtTime(32, now + 1.04);
          break;
        }
        case "vault-doors-open": {
          this.preloadAudioAsset(VAULT_DOORS_HALT_WAV, ctx);
          filter.type = "bandpass";
          filter.frequency.value = 620;
          filter.Q.value = 0.72;
          master.gain.value = 0.18;
          this.noise(ctx, now, 3.08, 0.052, 190, 720, 1.15, filter);
          const foundation = this.oscillator(
            ctx,
            48,
            "sine",
            now,
            now + 3.14,
            0.085,
            0.028,
            filter,
          );
          foundation.frequency.exponentialRampToValueAtTime(62, now + 3.06);
          const strain = this.oscillator(
            ctx,
            112,
            "triangle",
            now + 0.04,
            now + 3.02,
            0.03,
            0.035,
            filter,
          );
          strain.frequency.exponentialRampToValueAtTime(148, now + 2.96);
          [0.18, 0.66, 1.16, 1.7, 2.24, 2.72].forEach((offset, index) => {
            this.noise(
              ctx,
              now + offset,
              0.11,
              0.022,
              1_100 + index * 90,
              330,
              3.4,
              filter,
            );
            this.oscillator(
              ctx,
              246 + index * 31,
              "triangle",
              now + offset,
              now + offset + 0.16,
              0.012,
              0.006,
              filter,
            );
          });
          break;
        }
        case "vault-doors-halt": {
          filter.type = "lowpass";
          filter.frequency.value = 2_700;
          filter.Q.value = 0.7;
          master.gain.value = 0.2;
          if (typeof ctx.decodeAudioData === "function") {
            void this.playAudioAsset(
              VAULT_DOORS_HALT_WAV,
              ctx,
              0.42,
              filter,
            ).catch(() =>
              this.playVaultDoorsHaltFallback(ctx, ctx.currentTime, filter),
            );
          } else {
            this.playVaultDoorsHaltFallback(ctx, now, filter);
          }
          break;
        }
        case "covenant-break": {
          filter.type = "lowpass";
          filter.frequency.value = 1_700;
          filter.Q.value = 1.2;
          master.gain.value = 0.28;
          this.noise(ctx, now, 0.11, 0.08, 220, 220, 1.4, filter);
          this.oscillator(
            ctx,
            44,
            "sine",
            now,
            now + 0.78,
            0.13,
            0.006,
            filter,
          );
          const warning = this.oscillator(
            ctx,
            370,
            "triangle",
            now + 0.025,
            now + 0.62,
            0.05,
            0.008,
            filter,
          );
          warning.frequency.exponentialRampToValueAtTime(123, now + 0.58);
          const fracture = this.oscillator(
            ctx,
            185,
            "sawtooth",
            now + 0.08,
            now + 0.46,
            0.03,
            0.004,
            filter,
          );
          fracture.frequency.exponentialRampToValueAtTime(92, now + 0.42);
          break;
        }
        case "board-entry": {
          filter.type = "bandpass";
          filter.frequency.value = 580;
          filter.Q.value = 0.8;
          master.gain.value = 0.2;
          this.noise(ctx, now, 0.62, 0.035, 180, 1_600, 1.2, filter);
          const crossing = this.oscillator(
            ctx,
            55,
            "sine",
            now,
            now + 0.68,
            0.07,
            0.018,
            filter,
          );
          crossing.frequency.exponentialRampToValueAtTime(82, now + 0.62);
          this.oscillator(
            ctx,
            220,
            "sine",
            now + 0.28,
            now + 0.72,
            0.026,
            0.02,
            filter,
          );
          this.oscillator(
            ctx,
            330,
            "sine",
            now + 0.34,
            now + 0.78,
            0.018,
            0.02,
            filter,
          );
          break;
        }
        case "vault-release": {
          filter.type = "lowpass";
          filter.frequency.value = 3_200;
          filter.Q.value = 0.7;
          master.gain.value = 0.22;
          this.noise(ctx, now, 0.46, 0.03, 220, 1_200, 1.1, filter);
          const release = this.oscillator(
            ctx,
            55,
            "sine",
            now,
            now + 0.72,
            0.08,
            0.018,
            filter,
          );
          release.frequency.exponentialRampToValueAtTime(82, now + 0.66);
          [261.63, 392, 659.25].forEach((frequency, index) => {
            const start = now + 0.18 + index * 0.11;
            this.oscillator(
              ctx,
              frequency,
              "sine",
              start,
              start + 0.62,
              0.026 - index * 0.004,
              0.018,
              filter,
            );
          });
          break;
        }
        case "reward-reveal": {
          filter.type = "lowpass";
          filter.frequency.value = 4_200;
          filter.Q.value = 0.5;
          master.gain.value = 0.18;
          [293.66, 440, 587.33, 880].forEach((frequency, index) => {
            const start = now + index * 0.09;
            this.oscillator(
              ctx,
              frequency,
              "sine",
              start,
              start + 0.84,
              0.032 - index * 0.004,
              0.022,
              filter,
            );
          });
          this.noise(ctx, now + 0.12, 0.42, 0.012, 1_300, 3_200, 5, filter);
          break;
        }
      }
      return true;
    } catch (error) {
      console.warn("[Luminae] Lumii cinematic SFX failed", error);
      return false;
    }
  }

  getActiveResourceCounts() {
    return {
      buses: this.buses.size,
      voices: this.voices.size,
      ambient: this.outOfMatchAmbient !== null,
    };
  }
}

export const outOfGameAudio = new OutOfGameAudio();
