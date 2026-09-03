export const ANTIMATTER_DETONATION_TIMING = {
  duration: 4.15,
  target: {
    liftsAt: 0,
    locksAt: 0.44,
    darkensAt: 0.9,
    vanishesAt: 1.92,
  },
  device: {
    revealsAt: 0.2,
    armedAt: 0.74,
    vanishesAt: 2.02,
  },
  implosion: {
    startsAt: 0.72,
    pinchesAt: 1.86,
  },
  implosionWaves: [0.72, 0.96, 1.2],
  vacuum: {
    startsAt: 1.8,
    endsAt: 1.86,
  },
  flash: {
    startsAt: 1.86,
    peaksAt: 1.93,
    endsAt: 2.16,
  },
  aftershock: {
    startsAt: 2.02,
    endsAt: 2.92,
  },
  covenant: {
    artifactsAppearAt: 2.22,
    artifactsLockAt: 2.52,
    artifactsAnnihilateAt: 2.88,
    artifactsVanishAt: 3.16,
  },
  outcome: {
    startsAt: 2.28,
    endsAt: 4.02,
  },
  reward: {
    appearsAt: 3.18,
    impactsAt: 3.62,
    completesAt: 4,
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
