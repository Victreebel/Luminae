import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GameState } from '@workspace/api-client-react';

const mocks = vi.hoisted(() => ({
  getGameState: vi.fn(),
  getSession: vi.fn(),
}));

vi.mock('@workspace/api-client-react', () => ({
  getGameState: mocks.getGameState,
}));

vi.mock('@/lib/session', () => ({
  getSession: mocks.getSession,
}));

import { BalanceLabOverlay } from '../BalanceLabOverlay';

function state(): GameState {
  return {
    roomId: 'room-logger',
    status: 'finished',
    scenarioId: null,
    finishReason: 'win',
    startedAt: Date.now() - 60_000,
    openingTurnOrder: {
      id: 'board-logger',
      startedAt: Date.now() - 60_000,
      firstPlayerId: 'creator',
      playerIds: ['creator', 'rival'],
    },
    turnCount: 18,
    roundNumber: 9,
    victoryRequirement: 20,
    players: [
      { playerId: 'creator', playerName: 'Creator', isAi: false, eminence: 21 },
      { playerId: 'rival', playerName: 'Rival', isAi: true, eminence: 17 },
    ],
    winnerId: 'creator',
  } as GameState;
}

describe('BalanceLabOverlay creator logger', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.getSession.mockReturnValue({
      roomId: 'room-logger',
      playerId: 'creator',
      sessionToken: 'session-token',
    });
    mocks.getGameState.mockResolvedValue(state());
    Object.assign(globalThis, {
      __LUMINAE_BUILD_LABEL__: 'web-build-test',
      __LUMINAE_BUILD_STAMP__: '2026-08-18T12:00:00.000Z',
    });
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/dev/balance/rooms/')) {
        return {
          ok: true,
          json: async () => ({ roomId: 'room-logger', candidateId: 'lineage_floor', persistent: false }),
        } as Response;
      }
      if (url === '/api/meta/build') {
        return {
          ok: true,
          json: async () => ({ buildLabel: 'api-build-test', startedAt: '2026-08-18T11:00:00.000Z' }),
        } as Response;
      }
      throw new Error(`Unexpected fetch ${url}`);
    }));
  });

  it('preserves match one, saves match two, then exports one explicit pair decision', async () => {
    localStorage.setItem('luminae_balance_playtests_v1', JSON.stringify([{
      schema: 'luminae-creator-playtest/v1',
      recordVersion: 2,
      sessionId: 'control-session',
      pairId: 'pair-01',
      pairOrder: 'control_first',
      pairedPreference: null,
      candidateId: 'control',
      valid: true,
    }]));
    render(<BalanceLabOverlay candidateId="lineage-floor" format="standard" playerCount={2} />);

    fireEvent.click(screen.getByRole('button', { name: /lineage floor · standard/i }));
    fireEvent.change(screen.getByLabelText('Pair ID'), { target: { value: 'pair-01' } });
    fireEvent.change(screen.getByLabelText('Counterbalanced order'), { target: { value: 'control_first' } });
    fireEvent.change(screen.getByLabelText('Pair decision preference'), { target: { value: 'candidate' } });
    fireEvent.change(screen.getByLabelText('Preferred version and why'), { target: { value: 'Clearer ending.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save complete session record' }));

    await waitFor(() => {
      expect(localStorage.getItem('luminae_balance_playtests_v1')).not.toBeNull();
    });
    let records = JSON.parse(localStorage.getItem('luminae_balance_playtests_v1') ?? '[]') as Array<Record<string, unknown>>;
    expect(records).toHaveLength(2);
    expect(records[0]).toMatchObject({
      sessionId: 'control-session',
      pairedPreference: null,
    });
    expect(records[1]).toMatchObject({
      schema: 'luminae-creator-playtest/v1',
      recordVersion: 2,
      candidateId: 'lineage_floor',
      rulesetVersion: 'lineage_floor@api-build-test',
      format: 'standard',
      targetEminence: 20,
      playerCount: 2,
      openingPosition: 1,
      score: 21,
      result: 'win',
      finishReason: 'win',
      turnCount: 18,
      boardId: 'board-logger',
      pairId: 'pair-01',
      pairOrder: 'control_first',
      pairedPreference: null,
      valid: true,
    });
    expect(records[1]?.finalScores).toEqual([
      { playerId: 'creator', playerName: 'Creator', openingPosition: 1, eminence: 21 },
      { playerId: 'rival', playerName: 'Rival', openingPosition: 2, eminence: 17 },
    ]);
    expect(records[1]?.notes).toMatchObject({ preferredVersion: 'Clearer ending.' });
    expect(mocks.getGameState).toHaveBeenCalledWith('room-logger', { sessionToken: 'session-token' });

    fireEvent.click(screen.getByRole('button', { name: 'Finalize pair decision after match two' }));
    await waitFor(() => {
      const next = JSON.parse(localStorage.getItem('luminae_balance_playtests_v1') ?? '[]') as unknown[];
      expect(next).toHaveLength(3);
    });
    records = JSON.parse(localStorage.getItem('luminae_balance_playtests_v1') ?? '[]') as Array<Record<string, unknown>>;
    expect(records[2]).toMatchObject({
      schema: 'luminae-creator-playtest-pair-decision/v1',
      pairId: 'pair-01',
      pairOrder: 'control_first',
      pairedPreference: 'candidate',
      preferenceReason: 'Clearer ending.',
      controlSessionId: 'control-session',
      candidateId: 'lineage_floor',
      valid: true,
    });
  });
});
