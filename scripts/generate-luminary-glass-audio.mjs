import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const SAMPLE_RATE = 48_000;
const OUTPUT_DIRECTORY = join(
  process.cwd(),
  "artifacts/luminae/src/assets/audio/generated/luminary",
);

function mulberry32(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let result = value;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function createTrack(durationSeconds, seed) {
  const length = Math.ceil(durationSeconds * SAMPLE_RATE);
  return {
    durationSeconds,
    left: new Float64Array(length),
    right: new Float64Array(length),
    random: mulberry32(seed),
  };
}

function panGains(pan) {
  const angle = ((Math.max(-1, Math.min(1, pan)) + 1) * Math.PI) / 4;
  return [Math.cos(angle), Math.sin(angle)];
}

function mix(track, sampleIndex, value, pan) {
  if (sampleIndex < 0 || sampleIndex >= track.left.length) return;
  const [leftGain, rightGain] = panGains(pan);
  track.left[sampleIndex] += value * leftGain;
  track.right[sampleIndex] += value * rightGain;
}

function addNoiseBurst(track, {
  start,
  duration,
  amplitude,
  pan = 0,
  decay = duration * 0.25,
  brightness = 0.72,
  attack = 0.001,
}) {
  const startIndex = Math.floor(start * SAMPLE_RATE);
  const count = Math.floor(duration * SAMPLE_RATE);
  let low = 0;
  let previous = 0;
  let highState = 0;

  for (let index = 0; index < count; index += 1) {
    const time = index / SAMPLE_RATE;
    const white = track.random() * 2 - 1;
    low += (0.035 + brightness * 0.22) * (white - low);
    highState = white - previous + (0.72 + brightness * 0.19) * highState;
    previous = white;
    const texture = highState * (0.34 + brightness * 0.48) + low * (0.52 - brightness * 0.28);
    const envelope = Math.min(1, time / Math.max(0.0002, attack)) * Math.exp(-time / decay);
    mix(track, startIndex + index, texture * amplitude * envelope, pan);
  }
}

function addModalCluster(track, {
  start,
  duration,
  amplitude,
  pan = 0,
  count = 8,
  minimumFrequency = 1_650,
  maximumFrequency = 10_800,
  minimumDecay = 0.07,
  maximumDecay = 0.34,
}) {
  const startIndex = Math.floor(start * SAMPLE_RATE);
  const sampleCount = Math.floor(duration * SAMPLE_RATE);

  for (let mode = 0; mode < count; mode += 1) {
    const position = (mode + 0.35 + track.random() * 0.45) / count;
    const frequency = minimumFrequency * Math.pow(maximumFrequency / minimumFrequency, position);
    const decay = minimumDecay + track.random() * (maximumDecay - minimumDecay);
    const modeAmplitude = amplitude * (0.52 + track.random() * 0.48) / Math.pow(mode + 1, 0.42);
    const modePan = Math.max(-1, Math.min(1, pan + (track.random() - 0.5) * 0.32));
    const drift = 0.985 - track.random() * 0.025;
    let phase = track.random() * Math.PI * 2;

    for (let index = 0; index < sampleCount; index += 1) {
      const time = index / SAMPLE_RATE;
      const normalizedTime = time / duration;
      const currentFrequency = frequency * Math.pow(drift, normalizedTime);
      phase += (Math.PI * 2 * currentFrequency) / SAMPLE_RATE;
      const attack = Math.min(1, time / 0.0015);
      const envelope = attack * Math.exp(-time / decay);
      const roughness = 0.86 + 0.14 * Math.sin(time * (115 + mode * 23));
      mix(
        track,
        startIndex + index,
        Math.sin(phase) * modeAmplitude * envelope * roughness,
        modePan,
      );
    }
  }
}

function addStructuralPulse(track, {
  start,
  duration = 0.28,
  amplitude,
  pan = 0,
  frequency = 92,
}) {
  const startIndex = Math.floor(start * SAMPLE_RATE);
  const count = Math.floor(duration * SAMPLE_RATE);
  let phase = 0;

  for (let index = 0; index < count; index += 1) {
    const time = index / SAMPLE_RATE;
    const sweep = frequency * (1.18 - 0.32 * Math.min(1, time / duration));
    phase += (Math.PI * 2 * sweep) / SAMPLE_RATE;
    const envelope = Math.min(1, time / 0.002) * Math.exp(-time / (duration * 0.24));
    const value = (
      Math.sin(phase) +
      Math.sin(phase * 1.71 + 0.4) * 0.32 +
      Math.sin(phase * 2.37 + 1.2) * 0.13
    ) * amplitude * envelope;
    mix(track, startIndex + index, value, pan);
  }
}

function addCrack(track, {
  start,
  amplitude,
  pan = 0,
  width = 0.24,
  bodyFrequency = 108,
}) {
  addNoiseBurst(track, {
    start,
    duration: Math.min(0.15, width),
    amplitude: amplitude * 0.94,
    pan,
    decay: 0.018 + width * 0.035,
    brightness: 0.5,
    attack: 0.00035,
  });
  addNoiseBurst(track, {
    start: start + 0.003,
    duration: Math.min(0.24, width * 1.25),
    amplitude: amplitude * 0.28,
    pan: pan * 0.8,
    decay: 0.055 + width * 0.08,
    brightness: 0.78,
    attack: 0.0002,
  });
  addModalCluster(track, {
    start: start + 0.001,
    duration: Math.min(0.58, width * 2.5),
    amplitude: amplitude * 0.1,
    pan,
    count: 6,
    minimumFrequency: 1_250,
    maximumFrequency: 7_800,
    minimumDecay: 0.035,
    maximumDecay: 0.12 + width * 0.3,
  });
  addStructuralPulse(track, {
    start,
    duration: Math.min(0.4, width * 1.8),
    amplitude: amplitude * 0.48,
    pan: pan * 0.5,
    frequency: bodyFrequency,
  });
}

function addDebrisTail(track, {
  start,
  duration,
  amplitude,
  count,
}) {
  for (let index = 0; index < count; index += 1) {
    const progress = count <= 1 ? 0 : index / (count - 1);
    const at = start + Math.pow(progress, 1.42) * duration + track.random() * 0.018;
    const decay = 0.055 + track.random() * 0.2;
    const level = amplitude * (1 - progress * 0.78) * (0.58 + track.random() * 0.42);
    addNoiseBurst(track, {
      start: at,
      duration: Math.min(0.28, decay * 1.4),
      amplitude: level,
      pan: track.random() * 1.7 - 0.85,
      decay,
      brightness: 0.4 + track.random() * 0.34,
      attack: 0.00025,
    });
  }
}

function addShard(track, {
  start,
  amplitude,
  pan,
  duration,
  pitch,
}) {
  addNoiseBurst(track, {
    start,
    duration: Math.min(0.075, duration * 0.4),
    amplitude: amplitude * 0.42,
    pan,
    decay: 0.012 + duration * 0.025,
    brightness: 0.9,
    attack: 0.0002,
  });
  addModalCluster(track, {
    start,
    duration,
    amplitude,
    pan,
    count: 3 + Math.floor(track.random() * 3),
    minimumFrequency: pitch,
    maximumFrequency: Math.min(15_000, pitch * (1.7 + track.random() * 1.1)),
    minimumDecay: 0.035,
    maximumDecay: Math.max(0.06, duration * 0.72),
  });
}

function finishTrack(track, targetPeak) {
  const lowPassCoefficient = Math.exp((-2 * Math.PI * 10_800) / SAMPLE_RATE);
  const highPassCoefficient = Math.exp((-2 * Math.PI * 32) / SAMPLE_RATE);
  const channels = [track.left, track.right];
  let peak = 0;

  for (const channel of channels) {
    let lowPassState = 0;
    let previousInput = 0;
    let highPassState = 0;
    for (let index = 0; index < channel.length; index += 1) {
      const input = channel[index];
      lowPassState = (1 - lowPassCoefficient) * input + lowPassCoefficient * lowPassState;
      highPassState = lowPassState - previousInput + highPassCoefficient * highPassState;
      previousInput = lowPassState;
      const fadeIn = Math.min(1, index / (SAMPLE_RATE * 0.001));
      const remaining = channel.length - 1 - index;
      const fadeOut = Math.min(1, remaining / (SAMPLE_RATE * 0.07));
      const shaped = Math.tanh(highPassState * 1.18) * fadeIn * fadeOut;
      channel[index] = shaped;
      peak = Math.max(peak, Math.abs(shaped));
    }
  }

  const scale = peak > 0 ? targetPeak / peak : 1;
  for (const channel of channels) {
    for (let index = 0; index < channel.length; index += 1) {
      channel[index] *= scale;
    }
  }
}

function writeWave(path, track) {
  const channels = 2;
  const bytesPerSample = 2;
  const dataLength = track.left.length * channels * bytesPerSample;
  const buffer = Buffer.alloc(44 + dataLength);

  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(channels, 22);
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * channels * bytesPerSample, 28);
  buffer.writeUInt16LE(channels * bytesPerSample, 32);
  buffer.writeUInt16LE(bytesPerSample * 8, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataLength, 40);

  let offset = 44;
  for (let index = 0; index < track.left.length; index += 1) {
    const dither = (track.random() - track.random()) / 65_536;
    const left = Math.max(-1, Math.min(1, track.left[index] + dither));
    const right = Math.max(-1, Math.min(1, track.right[index] + dither));
    buffer.writeInt16LE(Math.round(left * 32_767), offset);
    buffer.writeInt16LE(Math.round(right * 32_767), offset + 2);
    offset += 4;
  }

  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, buffer);
}

function buildFirstCrack() {
  const track = createTrack(0.96, 0x13a77e1);
  addCrack(track, { start: 0.012, amplitude: 1.05, pan: 0, width: 0.22, bodyFrequency: 88 });
  addCrack(track, { start: 0.058, amplitude: 0.36, pan: -0.18, width: 0.14, bodyFrequency: 136 });
  addCrack(track, { start: 0.15, amplitude: 0.17, pan: 0.26, width: 0.12, bodyFrequency: 172 });
  addDebrisTail(track, { start: 0.12, duration: 0.55, amplitude: 0.09, count: 9 });
  finishTrack(track, 0.88);
  return track;
}

function buildBranchingFracture() {
  const track = createTrack(1.704, 0x5ec0ad2);
  [
    [0.012, 0.8, 0.08, 0.2, 104],
    [0.1, 0.46, -0.48, 0.16, 132],
    [0.24, 0.54, 0.54, 0.18, 118],
    [0.43, 0.4, -0.24, 0.17, 154],
    [0.66, 0.29, 0.38, 0.14, 178],
    [0.94, 0.18, -0.34, 0.12, 196],
  ].forEach(([start, amplitude, pan, width, bodyFrequency]) => {
    addCrack(track, { start, amplitude, pan, width, bodyFrequency });
  });
  addDebrisTail(track, { start: 0.16, duration: 1.16, amplitude: 0.1, count: 18 });
  finishTrack(track, 0.86);
  return track;
}

function buildFullShatter() {
  const track = createTrack(3.12, 0x9a77e4c);
  addCrack(track, { start: 0.008, amplitude: 1.12, pan: 0, width: 0.28, bodyFrequency: 68 });
  addStructuralPulse(track, { start: 0.012, duration: 0.82, amplitude: 0.76, pan: 0, frequency: 46 });
  addNoiseBurst(track, {
    start: 0.015,
    duration: 0.84,
    amplitude: 0.72,
    pan: 0,
    decay: 0.24,
    brightness: 0.62,
    attack: 0.0003,
  });

  for (let shard = 0; shard < 68; shard += 1) {
    const start = 0.045 + Math.pow(track.random(), 1.58) * 2.22;
    const amplitude = (0.05 + track.random() * 0.14) * Math.max(0.2, 1 - start * 0.3);
    const duration = 0.065 + track.random() * 0.28;
    const pitch = 1_500 + track.random() * 5_700;
    addShard(track, {
      start,
      amplitude,
      pan: track.random() * 1.8 - 0.9,
      duration,
      pitch,
    });
  }

  [
    [0.18, 0.34, -0.56, 0.2, 112],
    [0.37, 0.28, 0.62, 0.18, 148],
    [0.65, 0.2, -0.12, 0.15, 184],
    [1.02, 0.13, 0.4, 0.12, 216],
  ].forEach(([start, amplitude, pan, width, bodyFrequency]) => {
    addCrack(track, { start, amplitude, pan, width, bodyFrequency });
  });
  addDebrisTail(track, { start: 0.1, duration: 2.58, amplitude: 0.1, count: 36 });
  finishTrack(track, 0.9);
  return track;
}

const outputs = [
  ["luminary-first-crack-v2.wav", buildFirstCrack()],
  ["luminary-branching-fracture-v2.wav", buildBranchingFracture()],
  ["luminary-full-shatter-v2.wav", buildFullShatter()],
];

for (const [name, track] of outputs) {
  writeWave(join(OUTPUT_DIRECTORY, name), track);
}

console.log(`Generated ${outputs.length} deterministic Luminary glass cues in ${OUTPUT_DIRECTORY}.`);
