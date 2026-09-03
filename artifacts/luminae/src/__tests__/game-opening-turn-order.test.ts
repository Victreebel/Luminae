import { describe, expect, it } from 'vitest';
import {
  buildOpeningTurnOrderPlayers,
  getBalanceTelemetryActionId,
} from '../pages/game-opening-turn-order';

const openingEminence = [1, 2, 0, 1];
const players = Array.from({ length: 4 }, (_, index) => ({
  playerId: `p${index + 1}`,
  playerName: `Player ${index + 1}`,
  avatarId: null,
  eminence: openingEminence[index]!,
}));

describe('opening turn-order presentation', () => {
  it('rotates seats into action order and exposes the applied 20-point compensation', () => {
    const ordered = buildOpeningTurnOrderPlayers(players, 'p3', 20);

    expect(ordered.map((player) => player.playerId)).toEqual(['p3', 'p4', 'p1', 'p2']);
    expect(ordered.map((player) => player.openingPosition)).toEqual([0, 1, 2, 3]);
    expect(ordered.map((player) => player.eminenceBonus)).toEqual([0, 1, 1, 2]);
    expect(ordered[0]?.isFirst).toBe(true);
  });

  it('does not claim compensation when the authoritative state does not contain it', () => {
    const uncompensated = players.map((player) => ({ ...player, eminence: 0 }));
    const ordered = buildOpeningTurnOrderPlayers(uncompensated, 'p1', 15);

    expect(ordered.map((player) => player.eminenceBonus)).toEqual([0, 0, 0, 0]);
  });

  it('normalizes telemetry cohorts to supported match configurations', () => {
    expect(getBalanceTelemetryActionId(2, 15)).toBe('match_2p_v15');
    expect(getBalanceTelemetryActionId(4, 20)).toBe('match_4p_v20');
    expect(getBalanceTelemetryActionId(3, 25)).toBe('match_3p_v25');
    expect(getBalanceTelemetryActionId(9, 18)).toBe('match_4p_v15');
  });
});
