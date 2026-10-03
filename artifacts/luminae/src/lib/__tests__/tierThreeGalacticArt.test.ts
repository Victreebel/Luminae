import { describe, expect, it } from 'vitest';
import { TIER_THREE_ARTIFACT_CANON, ARTIFACT_TECHNOLOGY_METADATA_BY_ID } from '@workspace/game-types';
import { CARD_ART, CARD_RUNTIME_ART } from '@/lib/cardArtManifest';
import { CARD_NAME_FALLBACK } from '@/lib/cardNameFallback';
import generation from '@/assets/cards/galactic-v3/generation-manifest.json';
import tierAuditGeneration from '@/assets/cards/tier-audit-v4/generation-manifest.json';

describe('Tier III galactic card integration', () => {
  it('uses twenty distinct reviewed achievements in production and animation snapshots', () => {
    const ids = Object.keys(TIER_THREE_ARTIFACT_CANON) as Array<keyof typeof TIER_THREE_ARTIFACT_CANON>;
    expect(ids).toHaveLength(20);
    expect(generation.entries.map(entry => entry.id).sort()).toEqual([...ids].sort());
    expect(new Set(ids.map(id => CARD_RUNTIME_ART[id])).size).toBe(20);
    for (const id of ids) {
      const generationDirectory = tierAuditGeneration.entries.some(entry => entry.id === id)
        ? 'tier-audit-v4' : 'galactic-v3';
      expect(CARD_RUNTIME_ART[id]).toContain(`/${generationDirectory}/${id}.webp`);
      expect(CARD_ART[id]).toBe(CARD_RUNTIME_ART[id]);
      expect(CARD_NAME_FALLBACK[id]).toBe(TIER_THREE_ARTIFACT_CANON[id].name);
      expect(ARTIFACT_TECHNOLOGY_METADATA_BY_ID[id].artStatus).toBe('current');
    }
  });

  it('routes every replacement illustration through the shared production and animation manifest', () => {
    expect(tierAuditGeneration.entries).toHaveLength(24);
    for (const entry of tierAuditGeneration.entries) {
      expect(CARD_RUNTIME_ART[entry.id]).toContain(`/tier-audit-v4/${entry.id}.webp`);
      expect(CARD_ART[entry.id]).toBe(CARD_RUNTIME_ART[entry.id]);
    }
  });
});
