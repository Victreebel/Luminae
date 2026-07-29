import type { GameState } from '@workspace/api-client-react';

export interface Accolade {
  label: string;
  icon: string;
}

/**
 * Derives a short list of cosmetic accolades for the winner based solely on
 * final GameState fields — no backend changes required.
 */
export function deriveAccolades(
  state: GameState,
  winnerId: string,
): Accolade[] {
  const winner = state.players.find((p) => p.playerId === winnerId);
  if (!winner) return [];

  const accolades: Accolade[] = [];

  const winnerForged = (winner.forgedArtifacts ?? []).length;
  const winnerClaimed = (winner.claimedLuminaryIds ?? []).length;

  const others = state.players.filter((p) => p.playerId !== winnerId);

  const maxOtherForged = others.reduce(
    (max, p) => Math.max(max, (p.forgedArtifacts ?? []).length),
    0,
  );
  const maxOtherClaimed = others.reduce(
    (max, p) => Math.max(max, (p.claimedLuminaryIds ?? []).length),
    0,
  );

  const winnerBonusTotal = Object.values(winner.bonuses ?? {}).reduce(
    (sum, v) => sum + (v as number),
    0,
  );
  const maxOtherBonusTotal = others.reduce((max, p) => {
    const t = Object.values(p.bonuses ?? {}).reduce(
      (s, v) => s + (v as number),
      0,
    );
    return Math.max(max, t);
  }, 0);

  const winnerTier3Count = (winner.forgedArtifacts ?? []).filter(
    (c) => c.tier === 3,
  ).length;
  const maxOtherTier3Count = others.reduce(
    (max, p) => Math.max(max, (p.forgedArtifacts ?? []).filter((c) => c.tier === 3).length),
    0,
  );

  const winnerBonusColors = Object.entries(winner.bonuses ?? {}).filter(
    ([, v]) => (v as number) > 0,
  ).length;
  const maxOtherBonusColors = others.reduce(
    (max, p) =>
      Math.max(
        max,
        Object.entries(p.bonuses ?? {}).filter(([, v]) => (v as number) > 0).length,
      ),
    0,
  );

  if (winnerForged > maxOtherForged) {
    accolades.push({ label: 'Most artifacts forged', icon: '⚒️' });
  }

  if (winnerClaimed > 0 && winnerClaimed > maxOtherClaimed) {
    accolades.push({ label: 'Most Luminaries claimed', icon: '✦' });
  } else if (winnerClaimed > 0 && winnerClaimed === maxOtherClaimed) {
    accolades.push({ label: 'Luminary steward', icon: '✦' });
  }

  if (winnerBonusTotal > maxOtherBonusTotal) {
    accolades.push({ label: 'Strongest affinity engine', icon: '◈' });
  }

  if (winnerTier3Count > 0 && winnerTier3Count > maxOtherTier3Count) {
    accolades.push({ label: 'Tier III pioneer', icon: '🌌' });
  }

  if (winnerBonusColors > maxOtherBonusColors && winnerBonusColors >= 3) {
    accolades.push({ label: 'Versatile engineer', icon: '◇' });
  }

  if (winner.eminence >= 20) {
    accolades.push({ label: `Ascended to ${winner.eminence} Eminence`, icon: '◆' });
  }

  return accolades.slice(0, 4);
}
