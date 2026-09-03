import type { AffinityCounts, GamePlayerState } from '@workspace/api-client-react';

export function civilizationStateKey(player?: GamePlayerState | null): string {
  if (!player) return 'none';
  const artifactKey = (player.forgedArtifacts ?? [])
    .map((card) => {
      const cost = card.cost;
      const bonuses: Partial<AffinityCounts> = card.bonusesAtForge ?? {};
      return [
        card.id,
        card.tier,
        card.bonusAffinity,
        cost.flare ?? 0,
        cost.continuum ?? 0,
        cost.verdance ?? 0,
        cost.abyss ?? 0,
        cost.radiance ?? 0,
        bonuses.flare ?? 0,
        bonuses.continuum ?? 0,
        bonuses.verdance ?? 0,
        bonuses.abyss ?? 0,
        bonuses.radiance ?? 0,
      ].join(':');
    })
    .join('|');
  const discountedKey = [...(player.discountedForgeIds ?? [])].sort().join(',');
  const luminaryKey = [...(player.claimedLuminaryIds ?? [])].sort().join(',');
  const civilization = player.civilization;
  const civilizationKey = civilization
    ? [
        civilization.version,
        civilization.artifacts.map((artifact) => [
          artifact.artifactId,
          artifact.masteryCount,
          artifact.implementationState ?? 'unknown',
          artifact.implementationStateChangedTurnCount ?? 'unknown',
          artifact.historyEvidence,
        ].join(':')).join(','),
        civilization.scale.historicalMaturity,
        civilization.scale.currentReach,
        civilization.scale.currentReachCondition,
        civilization.stability.band,
        civilization.activeCapabilityIds.join(','),
        civilization.activeConditions.map((condition) => [
          condition.type,
          condition.targetKind,
          condition.appliedTurnCount ?? 'unknown',
        ].join(':')).join(','),
      ].join('|')
    : 'legacy';
  return `${artifactKey}::discounted=${discountedKey}::luminaries=${luminaryKey}::civilization=${civilizationKey}::civ=${player.civName ?? ''}`;
}
