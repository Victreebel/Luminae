export const ANTIMATTER_DETONATION_TIMING = {
  duration: 3.3,
  target: {
    liftsAt: 0,
    locksAt: 0.34,
    darkensAt: 0.62,
    vanishesAt: 1.42,
  },
  device: {
    revealsAt: 0.18,
    armedAt: 0.58,
    vanishesAt: 1.5,
  },
  implosion: {
    startsAt: 0.58,
    pinchesAt: 1.38,
  },
  implosionWaves: [0.58, 0.76, 0.94],
  vacuum: {
    startsAt: 1.32,
    endsAt: 1.38,
  },
  flash: {
    startsAt: 1.38,
    peaksAt: 1.43,
    endsAt: 1.58,
  },
  aftershock: {
    startsAt: 1.46,
    endsAt: 2.16,
  },
  covenant: {
    artifactsAppearAt: 1.64,
    artifactsLockAt: 1.82,
    artifactsAnnihilateAt: 2.04,
    artifactsVanishAt: 2.24,
  },
  outcome: {
    startsAt: 1.7,
    endsAt: 3.18,
  },
  reward: {
    appearsAt: 2.28,
    impactsAt: 2.72,
    completesAt: 3.12,
  },
} as const;

export const ANTIMATTER_DETONATION_TARGET_TIER = 2 as const;
export const ANTIMATTER_DETONATION_EMINENCE_REWARD = 2 as const;
export const ANTIMATTER_DETONATION_TRIGGERS = ["forged", "encrypted"] as const;

export type AntimatterDetonationTrigger =
  (typeof ANTIMATTER_DETONATION_TRIGGERS)[number];

export const ANTIMATTER_DETONATION_VARIANTS = [
  "original",
  "asymmetric",
  "lattice",
  "armored",
] as const;

export type AntimatterDetonationVariant =
  (typeof ANTIMATTER_DETONATION_VARIANTS)[number];
