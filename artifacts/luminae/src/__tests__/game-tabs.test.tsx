import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AffinityCounts, GamePlayerState, GameState } from '@workspace/api-client-react';
import {
  HandTab,
  LogTab,
  type HandTabScope,
  type LogTabScope,
} from '../pages/game-tabs';

vi.mock('../components/KardashevScene', () => ({
  KardashevScene: () => <div data-testid="kardashev-scene" />,
}));

vi.mock('../lib/luminaryAssets', () => ({
  getLuminaryVisuals: () => ({
    primaryColor: '#4ade80',
    secondaryColor: '#166534',
  }),
  LuminaryPanelArt: ({ luminaryId }: { luminaryId: string }) => (
    <span data-testid={`luminary-art-${luminaryId}`} />
  ),
}));

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

describe('HandTab taxonomy', () => {
  it('keeps Luminaries out of Forged Artifacts while preserving their effect details', () => {
    const state = gameState();
    const localPlayer = state.players[0]!;
    localPlayer.claimedLuminaryIds = ['lum_verdant'];
    localPlayer.bonuses.verdance = 1;
    state.turnCount = 2;
    state.luminaries = [{
      id: 'lum_verdant',
      name: 'The Verdant Oracle',
      domain: 'Verdance',
      eminence: 1,
      requirements: { ...emptyAffinities(), verdance: 3 },
      effectName: 'Early Bloom',
      effectDescription: 'Gain 1 Verdance from the Affinity Well.',
      summonColor: '#4ade80',
      summonSecondaryColor: '#166534',
    }] as GameState['luminaries'];
    state.luminaryAffinities = [{
      luminaryId: 'lum_verdant',
      ownerId: 'local',
      activeAffinity: 'verdance',
      summonedAtTurnCount: 1,
    }] as GameState['luminaryAffinities'];

    const scope: HandTabScope = {
      activationGateActive: false,
      activationQueue: [],
      brandDelayMap: new Map(),
      cardDetailDiscovered: true,
      civEditValue: '',
      civLabel: 'Green Horizon',
      civilizationProfile: {
        key: 'empty',
        seed: 1,
        artifactCount: 0,
        affinityCounts: { flare: 0, continuum: 0, verdance: 0, abyss: 0, radiance: 0 },
        traitCounts: {},
        traitWeights: {},
        dominantTraits: [],
        landmarks: [],
      } as HandTabScope['civilizationProfile'],
      computeCosts: vi.fn(),
      costMode: 'needed_now',
      expandedLumEffects: new Set(),
      forgedView: 'cards',
      handleCancelPlan: vi.fn(),
      handleCardTap: vi.fn(),
      isEditingCivName: false,
      isMyTurn: true,
      kardashevPalette: { primary: '#4ade80', secondary: '#166534', accent: '#bbf7d0' },
      kardashevProgressFraction: 0,
      kardashevTier: 1,
      me: localPlayer,
      myReservedCount: 0,
      newlyMarkedCardIds: new Set(),
      openForgedCardSheet: vi.fn(),
      pendingGameOver: false,
      plannedCardId: null,
      plannedCardLabel: '',
      safePlayers: state.players,
      selectedCard: null,
      session: { playerId: 'local' },
      setCivEditValue: vi.fn(),
      setCivLabel: vi.fn(),
      setExpandedLumEffects: vi.fn(),
      setForgedView: vi.fn(),
      setIsEditingCivName: vi.fn(),
      setShowActiveLuminaries: vi.fn(),
      setShowForgedArtifacts: vi.fn(),
      setTracedSourceLumId: vi.fn(),
      showActiveLuminaries: true,
      showCinematic: false,
      showForgedArtifacts: true,
      showWinOverlay: false,
      state,
      strikeAuraMap: new Map(),
      suppressedMarkerIds: new Set(),
      victoryRequirement: 15,
    };

    render(<HandTab scope={scope} />);

    const forgedSection = screen.getByRole('button', { name: /forged artifacts/i }).parentElement!;
    expect(within(forgedSection).queryByText('The Verdant Oracle')).toBeNull();
    expect(within(forgedSection).getByText('No Artifacts forged yet.')).toBeInTheDocument();
    expect(screen.getByText('The Verdant Oracle')).toBeInTheDocument();
    expect(screen.getByTitle(/including 1 from allied Luminaries/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show the verdant oracle effect/i })).toBeInTheDocument();
  });
});
