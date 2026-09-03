import { beforeEach, describe, expect, it, vi } from 'vitest';
import { gameAudio } from '@/lib/audio';
import { LUMINARY_ANIMATION_CONFIG } from '@/lib/luminaryAnimationConfig';
import { playLuminaryEffectPhaseSound } from '@/lib/luminaryEffectSound';

vi.mock('@/lib/audio', () => ({
  gameAudio: {
    playLuminaryEffectBeat: vi.fn(),
  },
}));

describe('playLuminaryEffectPhaseSound', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserves Luminary identity on every configured audible phase', () => {
    for (const config of Object.values(LUMINARY_ANIMATION_CONFIG)) {
      playLuminaryEffectPhaseSound(config.luminaryId, 'resolve');

      expect(gameAudio.playLuminaryEffectBeat).toHaveBeenLastCalledWith(
        config.animationArchetype,
        'resolve',
        config.primaryColor,
        config.luminaryId,
      );
    }
  });

  it('does not emit a cue for non-audible sequence phases', () => {
    playLuminaryEffectPhaseSound('lum_tide', 'announce');
    playLuminaryEffectPhaseSound('lum_tide', 'frame');

    expect(gameAudio.playLuminaryEffectBeat).not.toHaveBeenCalled();
  });
});
