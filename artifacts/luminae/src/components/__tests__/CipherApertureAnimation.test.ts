import { describe, it, expect } from 'vitest';
import { CIPHER_MODE_TOTAL_MS, type CipherApertureMode } from '@/pages/game-constants';
import { PHASE_DUR } from '@/components/CipherApertureAnimation';

// ─── Tests ────────────────────────────────────────────────────────────────────
//
// Guards against a stale CIPHER_MODE_TOTAL_MS entry in game-constants.ts.
// When a developer edits phase timings in PHASE_DUR (inside
// CipherApertureAnimation.tsx) they must also update the corresponding
// CIPHER_MODE_TOTAL_MS entry so callers that schedule callbacks after the
// animation know the correct total duration.
//
// These tests catch that drift at CI time rather than at browser runtime.

describe('CipherApertureAnimation — PHASE_DUR vs CIPHER_MODE_TOTAL_MS consistency', () => {
  const modes = Object.keys(CIPHER_MODE_TOTAL_MS) as CipherApertureMode[];

  it('PHASE_DUR contains an entry for every CipherApertureMode', () => {
    for (const mode of modes) {
      expect(PHASE_DUR).toHaveProperty(mode);
    }
  });

  it.each(modes)(
    'PHASE_DUR["%s"] phase sum equals CIPHER_MODE_TOTAL_MS["%s"]',
    (mode) => {
      const phaseSum = Object.values(PHASE_DUR[mode]).reduce((acc, ms) => acc + ms, 0);
      expect(phaseSum).toBe(CIPHER_MODE_TOTAL_MS[mode]);
    },
  );
});
