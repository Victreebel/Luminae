import type { ArtifactCard, GamePlayerState, GameState } from '@workspace/api-client-react';
import { AFFINITY_META, type AffinityKey } from '@/lib/affinityMeta';
import { AFFINITIES } from './game-constants';

function isArtifactCard(card: ArtifactCard | null | undefined): card is ArtifactCard {
  return Boolean(card);
}

export function getPlannedActionSummary(
  action: Record<string, unknown>,
  state?: GameState | null,
  player?: GamePlayerState | null,
): string {
  if (!action) return '';

  const allCards = [
    ...(state?.forgeTier1 ?? []),
    ...(state?.forgeTier2 ?? []),
    ...(state?.forgeTier3 ?? []),
    ...(player?.reservedArtifacts ?? []),
    ...(player?.tideArchiveTopCards
      ? [
          player.tideArchiveTopCards.tier1,
          player.tideArchiveTopCards.tier2,
          player.tideArchiveTopCards.tier3,
        ]
      : []),
  ].filter(isArtifactCard);

  switch (action.type) {
    case 'forge_artifact':
    case 'forge_reserved_artifact': {
      const card = allCards.find((candidate) => candidate.id === action.cardId);
      const source = action.blueprintAction === 'foundry_overdrive'
        ? ' with Foundry Overdrive'
        : action.blueprintAction === 'foundry_sustainable'
          ? ' with Foundry Forge'
          : action.luminaryId === 'lum_tide'
            ? ' from Archive'
            : '';
      return card ? `Forge "${card.name}"${source}` : `Forge Artifact${source}`;
    }
    case 'reserve_artifact': {
      if (action.cardId) {
        const card = allCards.find((candidate) => candidate.id === action.cardId);
        return card ? `Encrypt "${card.name}"` : 'Encrypt Artifact';
      }
      return action.tier ? `Encrypt Tier ${action.tier}` : 'Encrypt Artifact';
    }
    case 'harness_three_affinities': {
      const affinities = (action.affinities ?? {}) as Record<string, number>;
      const parts = (AFFINITIES as string[])
        .filter((color) => color !== 'singularity' && (affinities[color] ?? 0) > 0)
        .map((color) => AFFINITY_META[color as AffinityKey]?.shortName ?? color);
      return parts.length > 0 ? `Harness ${parts.join(', ')}` : 'Harness Affinities';
    }
    case 'harness_two_affinities':
      return action.affinity
        ? `Harness 2 ${AFFINITY_META[action.affinity as AffinityKey]?.shortName ?? action.affinity}`
        : 'Harness 2 Affinities';
    case 'toggle_luminary_affinity':
      return 'Toggle Luminary affinity';
    default:
      return 'Pending action';
  }
}
