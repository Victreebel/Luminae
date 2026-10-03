import { gameAudio } from '@/lib/audio';
import type { CivilizationEventEffectProfile } from '@workspace/game-types';

export type CosmicEventEffectProfile = CivilizationEventEffectProfile;

export type CosmicEventSoundBeat = 'forecast' | 'tremble' | 'lift' | 'activation' | 'effect' | 'receipt';

/**
 * First-party synthesized voices. Bright overtones belong to opportunities;
 * adverse Events stay low through arrival, impact, effect, and resolution.
 * Filtering also softens the upper harmonics of fractured/noisy waveforms.
 */
export const COSMIC_EVENT_SOUND_PROFILES = {
  affinity_bloom: { mood: 'bright', lowpassHz: 2400, notes: [261.63, 329.63, 392, 523.25, 659.25], voice: 'sine', bass: 65.41, step: 0.64, decay: 2.1 },
  forge_drift: { mood: 'warm', lowpassHz: 650, notes: [110, 164.81, 196, 146.83, 110], voice: 'sine', bass: 55, step: 0.9, decay: 2.2 },
  // Descending pressure pulses: a containment boundary coming under strain.
  containment_cascade: { mood: 'ominous', lowpassHz: 280, notes: [98, 92.5, 82.41, 73.42, 65.41], voice: 'triangle', bass: 49, step: 0.86, decay: 2.5 },
  affinity_inversion: { mood: 'ominous', lowpassHz: 320, notes: [130.81, 98, 123.47, 92.5, 65.41], voice: 'sine', bass: 43.65, step: 0.92, decay: 2.4 },
  entropy_storm: { mood: 'ominous', lowpassHz: 240, notes: [73.42, 55, 82.41, 46.25, 36.71], voice: 'sawtooth', bass: 36.71, step: 0.98, decay: 2.6 },
  terminus_tide: { mood: 'warm', lowpassHz: 850, notes: [98, 146.83, 196, 246.94, 293.66], voice: 'sine', bass: 49, step: 0.94, decay: 2.5 },
  // Low impacts and broken, detuned pairs distinguish damage from opportunity.
  system_shock: { mood: 'ominous', lowpassHz: 340, notes: [110, 55, 82.41, 55, 41.2], voice: 'triangle', bass: 41.2, step: 0.96, decay: 1.5 },
  fracture_wave: { mood: 'ominous', lowpassHz: 260, notes: [82.41, 87.31, 65.41, 61.74, 41.2], voice: 'sawtooth', bass: 32.7, step: 1.05, decay: 2.3 },
  signal_clarity: { mood: 'warm', lowpassHz: 1000, notes: [196, 246.94, 293.66, 392, 493.88], voice: 'sine', bass: 65.41, step: 0.88, decay: 2.6 },
  synchronization_shear: { mood: 'ominous', lowpassHz: 300, notes: [98, 100.5, 73.42, 75, 49], voice: 'triangle', bass: 49, step: 1.08, decay: 2.1 },
} as const satisfies Record<CosmicEventEffectProfile, {
  mood: 'bright' | 'warm' | 'ominous';
  lowpassHz: number;
  notes: readonly number[];
  voice: OscillatorType;
  bass: number;
  step: number;
  decay: number;
}>;

export interface CosmicEventAudio {
  play: (beat: CosmicEventSoundBeat, durationMs?: number) => void;
  stop: () => void;
  dispose: () => void;
}

/** A short-lived bus owns every scheduled voice and cancels them on interruption. */
export function createCosmicEventAudio(profile: CosmicEventEffectProfile): CosmicEventAudio {
  let context: AudioContext | null = null;
  let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  const voices = new Set<OscillatorNode>();
  const nodes = new Set<AudioNode>();

  const stop = () => {
    if (cleanupTimer !== null) clearTimeout(cleanupTimer);
    cleanupTimer = null;
    for (const voice of voices) {
      try { voice.stop(); } catch { /* Already ended. */ }
    }
    for (const node of nodes) {
      try { node.disconnect(); } catch { /* Already disconnected. */ }
    }
    voices.clear();
    nodes.clear();
  };

  const onVisibilityChange = () => {
    if (document.hidden) stop();
  };
  document.addEventListener('visibilitychange', onVisibilityChange);

  const play = (beat: CosmicEventSoundBeat, durationMs = 6500) => {
    stop();
    if (disposed || document.hidden || gameAudio.isMuted()) return;
    const Constructor = window.AudioContext
      ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Constructor) return;
    try {
      context ??= new Constructor();
      const ctx = context;
      if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
      const master = ctx.createGain();
      master.gain.value = 0.34;
      master.connect(ctx.destination);
      nodes.add(master);
      const sound = COSMIC_EVENT_SOUND_PROFILES[profile];
      const ominous = sound.mood === 'ominous';
      const bright = sound.mood === 'bright';
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = sound.lowpassHz;
      filter.Q.value = 0.5;
      filter.connect(master);
      nodes.add(filter);
      let lifetime = 0;
      const tone = (
        frequency: number,
        delay: number,
        duration: number,
        volume: number,
        voice: OscillatorType = 'sine',
        destinationFrequency = frequency,
      ) => {
        const oscillator = ctx.createOscillator();
        const envelope = ctx.createGain();
        const start = ctx.currentTime + delay;
        oscillator.type = voice;
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(destinationFrequency, start + duration);
        envelope.gain.setValueAtTime(0, start);
        envelope.gain.linearRampToValueAtTime(volume, start + Math.min(0.22, duration * 0.2));
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(envelope);
        envelope.connect(filter);
        voices.add(oscillator);
        nodes.add(oscillator);
        nodes.add(envelope);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.03);
        lifetime = Math.max(lifetime, delay + duration + 0.05);
      };

      if (beat === 'forecast') {
        // A quiet, low two-note reminder; it does not imply which Event is next.
        tone(82.41, 0, 0.6, 0.085);
        tone(55, 0.22, 0.65, 0.065);
      } else if (beat === 'tremble') {
        [0, 0.36, 0.72].forEach((delay) => tone(sound.bass * 1.5, delay, 0.42, 0.11, 'triangle'));
      } else if (beat === 'lift') {
        // Adverse arrivals swell in weight without the previous high rising whistle.
        tone(sound.bass * 2, 0, 1.2, 0.1, 'sine', sound.bass * (ominous ? 1.2 : bright ? 8 : 3));
        tone(sound.bass * (ominous ? 2.02 : 3), 0.12, 1.1, 0.055, 'triangle', sound.bass * (ominous ? 1.8 : bright ? 12 : 4));
      } else if (beat === 'activation') {
        tone(sound.bass * (ominous ? 1.5 : 1), 0, 1.55, 0.3, 'sine', sound.bass);
        const root = ominous ? sound.bass : bright ? 196 : 110;
        [1, 1.5, 2].forEach((ratio) => tone(root * ratio, 0.16, 1.35, 0.08));
      } else if (beat === 'effect') {
        const stretch = Math.max(1, durationMs / 6500);
        tone(sound.bass, 0, 5.8 * stretch, 0.12, 'sine', sound.bass * (ominous ? 0.85 : 1.5));
        sound.notes.forEach((frequency, index) => {
          tone(frequency, index * sound.step * stretch, sound.decay * stretch, sound.voice === 'sawtooth' ? 0.055 : 0.14, sound.voice);
          const companion = ominous ? 0.501 : bright ? 2.003 : 1.5;
          tone(frequency * companion, index * sound.step * stretch + 0.15, sound.decay * 0.8 * stretch, ominous ? 0.045 : 0.027);
        });
      } else {
        tone(sound.notes[sound.notes.length - 1], 0, 1.5, 0.065);
        tone(sound.bass * (ominous ? 1.5 : bright ? 4 : 2), 0.18, 1.7, 0.05);
      }
      cleanupTimer = setTimeout(stop, Math.ceil(lifetime * 1000));
    } catch {
      // Audio availability never owns the presentation queue.
      stop();
    }
  };

  return {
    play,
    stop,
    dispose: () => {
      disposed = true;
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (context && context.state !== 'closed') void context.close().catch(() => undefined);
      context = null;
    },
  };
}
