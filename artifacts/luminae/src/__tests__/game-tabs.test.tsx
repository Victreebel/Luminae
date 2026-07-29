import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AffinityCounts, GamePlayerState, GameState } from '@workspace/api-client-react';
import { LogTab, type LogTabScope } from '../pages/game-tabs';

const emptyAffinities = (): AffinityCounts => ({
  flare: 0,
  continuum: 0,
  verdance: 0,
  abyss: 0,
  radiance: 0,
  singularity: 0,
});

function player(playerId: string, playerName: string): GamePlayerState {
  return {
    playerId,
    playerName,
    avatarId: null,
    isAi: false,
    aiDifficulty: null,
    affinities: emptyAffinities(),
    bonuses: emptyAffinities(),
    eminence: 0,
    reservedArtifacts: [],
    forgedArtifactIds: [],
    discountedForgeIds: [],
    forgedArtifacts: [],
    isConnected: true,
    claimedLuminaryIds: [],
    plannedAction: null,
    plannedActionCancelReason: null,
    civName: null,
  };
}

function gameState(): GameState {
  const localPlayer = player('local', 'Local Player');
  const opponent = player('opponent', 'Aurin');
  return {
    roomId: 'room',
    status: 'playing',
    startedAt: 1,
    openingTurnOrder: null,
    canReplaySameBoard: false,
    currentPlayerIndex: 1,
    roundNumber: 1,
    turnCount: 1,
    victoryRequirement: 15,
    cinematicMode: 'standard',
    affinityWell: emptyAffinities(),
    forgeTier1: [],
    forgeTier2: [],
    forgeTier3: [],
    deckCounts: { tier1: 0, tier2: 0, tier3: 0 },
    luminaries: [],
    luminaryAffinities: [],
    players: [localPlayer, opponent],
    winnerId: null,
    winTriggerLuminaryId: null,
    lastAction: null,
    actionLog: [{ playerId: 'opponent', playerName: 'Aurin', summary: 'passed', turn: 1 }],
    turnTimerSeconds: null,
    turnDeadline: null,
    version: 1,
    pendingSummonEvents: [],
    pendingLuminaryActivationEvents: [],
  };
}

describe('LogTab', () => {
  it('renders typed activity data and submits chat through its boundary', () => {
    const handleSendChat = vi.fn();
    const scope: LogTabScope = {
      chatEndRef: React.createRef<HTMLDivElement>(),
      chatInput: 'Ready',
      chatMessages: [{
        playerId: 'opponent',
        playerName: 'Aurin',
        text: 'Your move.',
        timestamp: 1,
      }],
      expandedOpponents: new Set(),
      handleSendChat,
      openForgedCardSheet: vi.fn(),
      opponentData: {
        opponent: {
          totalAffinity: 0,
          cardCount: 0,
          reservedCount: 0,
          civPalette: { primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' },
          civName: 'Temporal Enclave',
        },
      },
      session: { playerId: 'local' },
      setChatInput: vi.fn(),
      setExpandedOpponents: vi.fn(),
      setShowAllLog: vi.fn(),
      showAllLog: false,
      state: gameState(),
    };

    render(<LogTab scope={scope} />);

    expect(screen.getByText('Temporal Enclave')).toBeInTheDocument();
    expect(screen.getByText('Your move.')).toBeInTheDocument();
    expect(screen.getByText(/passed/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Send message' }));
    expect(handleSendChat).toHaveBeenCalledTimes(1);
  });
});
