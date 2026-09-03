import type { NaturalAffinityKey } from "@workspace/game-types";

export type LumiiSignalMode = "guardian" | "hostile" | "yielding";

// Lumii embodies the five natural Affinities. Her central core is identity,
// not a sixth node; Singularity is created through Architect convergence.
export const LUMII_NATURAL_AFFINITIES = [
  "flare",
  "continuum",
  "verdance",
  "abyss",
  "radiance",
] as const satisfies readonly NaturalAffinityKey[];

export const LUMII_AFFINITY_NODE_COUNT = LUMII_NATURAL_AFFINITIES.length;

export const LUMII_NODE_COLORS: Readonly<Record<NaturalAffinityKey, string>> = {
  flare: "#FF5A3C",
  continuum: "#3D6BFF",
  verdance: "#2ECC71",
  abyss: "#A832D4",
  radiance: "#DFC878",
};

export const LUMII_SIGNAL_NOTES: Readonly<Record<LumiiSignalMode, readonly number[]>> = {
  guardian: [261.63, 329.63, 392, 523.25, 659.25],
  hostile: [783.99, 622.25, 466.16, 349.23, 277.18],
  yielding: [233.08, 293.66, 349.23, 440, 523.25],
};
