import type { CivilizationEventEffectProfile } from '@workspace/game-types';
import affinityBloom from '@/assets/events/affinity-bloom-v1.webp';
import forgeDrift from '@/assets/events/forge-drift-v1.webp';
import containmentCascade from '@/assets/events/containment-cascade-v1.webp';
import affinityInversion from '@/assets/events/affinity-inversion-v1.webp';
import entropyStorm from '@/assets/events/entropy-storm-v1.webp';
import cosmicReflux from '@/assets/events/cosmic-reflux-v1.webp';
import systemShock from '@/assets/events/system-shock-v1.webp';
import fractureWave from '@/assets/events/fracture-wave-v1.webp';

/** Portrait art is shared by the Forge face and its foreground activation. */
export const COSMIC_EVENT_ART: Record<CivilizationEventEffectProfile, string> = {
  affinity_bloom: affinityBloom,
  forge_drift: forgeDrift,
  containment_cascade: containmentCascade,
  affinity_inversion: affinityInversion,
  entropy_storm: entropyStorm,
  terminus_tide: cosmicReflux,
  system_shock: systemShock,
  fracture_wave: fractureWave,
  // Unpublished lore pilots reuse thematic plates until their authored release.
  signal_clarity: cosmicReflux,
  synchronization_shear: systemShock,
};
