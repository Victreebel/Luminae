export type AntimatterCinematicPhase =
  | "RECOVERY"
  | "ASSEMBLY"
  | "CONTAINMENT"
  | "ANNIHILATION"
  | "MANIFESTED";

export const ANTIMATTER_CINEMATIC_TIMING = {
  duration: 8.2,
  reducedMotionStart: 6.55,
  phases: {
    assembly: 1.25,
    containment: 4.12,
    annihilation: 5.45,
    manifested: 6.35,
  },
  parts: {
    ignitionKernel: { entersAt: 0.55, locksAt: 3.05 },
    magneticBottle: { entersAt: 0.86, locksAt: 3.38 },
    causalSparkCoil: { entersAt: 1.15, locksAt: 3.68 },
    horizonExtractor: { entersAt: 1.45, locksAt: 4 },
  },
  deployments: {
    ignitionNetwork: { startsAt: 2.05, settlesAt: 2.9 },
    magneticCage: { startsAt: 2.37, settlesAt: 3.23 },
    causalCircumference: { startsAt: 2.77, settlesAt: 3.63 },
    horizonMirror: { startsAt: 2.98, settlesAt: 3.85 },
    horizonSpine: { startsAt: 3.12, settlesAt: 3.99 },
  },
  assemblyAudio: { entryStrokeDuration: 0.62 },
  containment: { startsAt: 4.08, stabilizesAt: 5.18 },
  ignition: { startsAt: 4.72, peaksAt: 5.72 },
  implosion: { startsAt: 5.45, pinchesAt: 5.82 },
  implosionWaves: [5.45, 5.58, 5.7],
  flash: { startsAt: 5.82, peaksAt: 5.88, endsAt: 6.08 },
  aftershock: { startsAt: 5.9, endsAt: 6.32 },
  reveal: { startsAt: 6.1, completesAt: 6.82 },
  livingDeviceStartsAt: 6.2,
  manifestedPulses: [6.42, 7.08, 7.82],
} as const;

export function getAntimatterCinematicPhase(
  time: number,
): AntimatterCinematicPhase {
  const { phases } = ANTIMATTER_CINEMATIC_TIMING;
  if (time < phases.assembly) return "RECOVERY";
  if (time < phases.containment) return "ASSEMBLY";
  if (time < phases.annihilation) return "CONTAINMENT";
  if (time < phases.manifested) return "ANNIHILATION";
  return "MANIFESTED";
}
