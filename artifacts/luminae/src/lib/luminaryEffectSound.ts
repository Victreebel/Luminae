import { gameAudio, type LuminaryEffectSoundBeat } from '@/lib/audio';
import { LUMINARY_ANIMATION_CONFIG } from '@/lib/luminaryAnimationConfig';
import type { LuminaryEffectPhaseId } from '@/lib/luminaryEffectSequence';

const PHASE_BEATS: Partial<Record<LuminaryEffectPhaseId, LuminaryEffectSoundBeat>> = {
  target: 'target',
  resolve: 'resolve',
  aftermath: 'aftermath',
};

/** Keep every director on the same audible phase contract. */
export function playLuminaryEffectPhaseSound(
  luminaryId: string,
  phase: LuminaryEffectPhaseId,
  primaryColor?: string,
) {
  const beat = PHASE_BEATS[phase];
  const config = LUMINARY_ANIMATION_CONFIG[luminaryId];
  if (!beat || !config) return;

  gameAudio.playLuminaryEffectBeat(
    config.animationArchetype,
    beat,
    primaryColor ?? config.primaryColor,
    luminaryId,
  );
}
