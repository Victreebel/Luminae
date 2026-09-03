import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { AffinityCounts, GamePlayerState, GameState } from '@workspace/api-client-react';
import { BLUEPRINT_DEFINITIONS, DEFAULT_VICTORY_REQUIREMENT } from '@workspace/game-types';
import {
  HandTab,
  LogTab,
  type HandTabScope,
  type LogTabScope,
} from '../pages/game-tabs';

vi.mock('../components/KardashevScene', () => ({
  KardashevScene: () => <div data-testid="kardashev-scene" />,
}));

vi.mock('@/hooks/use-mobile', () => ({
  useIsMobile: () => false,
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
    victoryRequirement: DEFAULT_VICTORY_REQUIREMENT,
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

function handTabScope(
  state: GameState,
  overrides: Partial<HandTabScope> = {},
): HandTabScope {
  return {
    activationGateActive: false,
    activationQueue: [],
    brandDelayMap: new Map(),
    cardDetailDiscovered: true,
    civEditValue: '',
    civLabel: 'Civilization',
    civilizationDeploymentSites: [],
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
    hintsEnabled: true,
    handleCancelPlan: vi.fn(),
    handleCardTap: vi.fn(),
    handleFoundryRecovery: vi.fn(),
    isEditingCivName: false,
    isMyTurn: true,
    kardashevPalette: { primary: '#4ade80', secondary: '#166534', accent: '#bbf7d0' },
    kardashevProgressFraction: 0,
    kardashevTier: 1,
    me: state.players[0],
    myReservedCount: 0,
    newlyMarkedCardIds: new Set(),
    openForgedCardSheet: vi.fn(),
    recentCivilizationSiteIds: [],
    acknowledgeRecentCivilizationSites: vi.fn(),
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
    victoryRequirement: DEFAULT_VICTORY_REQUIREMENT,
    ...overrides,
  };
}

describe('LogTab', () => {
  it('renders typed activity data and submits chat through its boundary', () => {
    const handleSendChat = vi.fn();
    const state = gameState();
    state.players[1]!.reservedArtifacts = [{
      id: 't1r07',
      name: 'Entropy Pyre Baffle',
      tier: 1,
      bonusAffinity: 'flare',
      eminence: 0,
      cost: emptyAffinities(),
      flavor: '',
    } as never];
    const scope: LogTabScope = {
      chatEndRef: React.createRef<HTMLDivElement>(),
      chatInput: 'Ready',
      chatMessages: [{
        playerId: 'opponent',
        playerName: 'Aurin',
        text: 'Your move.',
        timestamp: 1,
      }],
      expandedOpponents: new Set(['opponent']),
      handleSendChat,
      openForgedCardSheet: vi.fn(),
      opponentData: {
        opponent: {
          totalAffinity: 0,
          cardCount: 0,
          reservedCount: 1,
          civPalette: { primary: '#60a5fa', secondary: '#1a3a8f', accent: '#bfdbfe' },
          civName: 'Temporal Enclave',
        },
      },
      session: { playerId: 'local' },
      setChatInput: vi.fn(),
      setExpandedOpponents: vi.fn(),
      setShowAllLog: vi.fn(),
      showAllLog: false,
      state,
    };

    const { container } = render(<LogTab scope={scope} />);

    expect(screen.getByText('Temporal Enclave')).toBeInTheDocument();
    expect(screen.getByText('Your move.')).toBeInTheDocument();
    expect(screen.getByText(/passed/)).toBeInTheDocument();
    expect(container.querySelector('[data-reserved-card-id="t1r07"]')).toBeInTheDocument();
    expect(screen.queryByText('Entropy Pyre Baffle')).not.toBeInTheDocument();

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
    localPlayer.civilization = {
      version: 2,
      artifacts: [],
      affinityIdentity: {
        policyId: 'provisional-ratio-v1',
        form: 'unformed',
        historicalCounts: { flare: 0, radiance: 0, verdance: 0, continuum: 0, abyss: 0 },
        operationalCounts: { flare: 0, radiance: 0, verdance: 0, continuum: 0, abyss: 0 },
        rankedAffinities: [],
        dominantAffinity: null,
        dominantDyad: null,
        thirdAffinity: null,
        dominantShare: 0,
        secondaryToPrimaryRatio: 0,
        thirdToPrimaryRatio: 0,
      },
      scale: {
        historicalMaturity: 'planetary',
        currentReach: 'planetary',
        currentReachCondition: 'intact',
        literalKardashevType: 1,
        literalKardashevEvidence: 'recorded',
      },
      stability: {
        band: 'stable',
        score: 80,
        calibrationId: 'baseline-v1',
        contributors: [],
        calculatedTurnCount: 2,
        historyEvidence: 'recorded',
      },
      activeConditions: [],
      activeCapabilityIds: [],
      events: [{
        eventId: 'event:foundry',
        sourceType: 'blueprint',
        turnCount: 2,
        form: 'contextual',
        pressureTags: [],
        outcome: 'success',
        summary: 'Foundry completed a sustainable orbital fabrication',
        historyEvidence: 'recorded',
      }],
    };

    const recentCivilizationSite: HandTabScope['civilizationDeploymentSites'][number] = {
      id: 'artifact:t1s02',
      kind: 'artifact',
      scaleBand: 'planetary',
      trait: 'transit',
      artifactId: 't1s02',
      artifactTier: 1,
      artifactForm: 'Transit Coil',
      blueprintRole: 'orbital logistics',
      consequenceLabel: 'Orbital logistics',
      visualCue: 'freight lanes crossing the upper atmosphere',
      synergySummary: 'The new coil is integrating into planetary freight work.',
      supportingArtifactNames: [],
      engineeringScale: 'City-scale deployment',
      depictionScale: 'room',
      scalePresence: 'deployment_site',
      nativeArtworkLayer: 'surface',
      nativeArtworkLabel: 'City site',
      representationMode: 'civilization_infrastructure',
      sourceQuality: 'authored',
      affinity: 'continuum',
      anchor: { x: 46, y: 54 },
      priority: 100,
      title: 'Mantlelift Driver Coil Trace',
      summary: 'The room-scale coil registers through the routes it enables.',
      visibleAs: 'freight lanes crossing the upper atmosphere',
      laneLabel: 'Orbital logistics',
      relatedArtifactIds: ['t1s02'],
    };

    const scope = handTabScope(state, {
      civEditValue: '',
      civLabel: 'Green Horizon',
      civilizationDeploymentSites: [recentCivilizationSite],
      recentCivilizationSiteIds: ['artifact:t1s02'],
    });

    render(<HandTab scope={scope} />);

    const civilizationCommand = screen.getByTestId('civilization-command-card');
    expect(within(civilizationCommand).getByText('Civilization Record')).toBeInTheDocument();
    expect(within(civilizationCommand).getByText('Green Horizon')).toBeInTheDocument();
    expect(within(civilizationCommand).getByText('Planetary')).toBeInTheDocument();
    expect(civilizationCommand.querySelector('[data-civilization-record-metric="Maturity"]'))
      .toHaveTextContent('Planetary');
    expect(civilizationCommand.querySelector('[data-civilization-record-metric="Stability"]'))
      .toHaveTextContent('Stable');
    expect(civilizationCommand.querySelector('[data-civilization-record-metric="Events"]'))
      .toHaveTextContent('1');
    expect(screen.getByText('Recent Consequences')).toBeInTheDocument();
    expect(screen.getByText('Foundry completed a sustainable orbital fabrication')).toBeInTheDocument();
    expect(within(civilizationCommand).getByTestId('civilization-command-new-trace'))
      .toHaveTextContent('Mantlelift Driver Coil Trace');
    expect(within(civilizationCommand).getByText('Scan view is focusing this change')).toBeInTheDocument();
    const forgedSection = screen.getByRole('button', { name: /forged artifacts/i }).parentElement!;
    expect(within(forgedSection).queryByText('The Verdant Oracle')).toBeNull();
    expect(within(forgedSection).getByText('No Artifacts forged yet.')).toBeInTheDocument();
    expect(screen.getByText('The Verdant Oracle')).toBeInTheDocument();
    expect(screen.getByTitle(/including 1 from allied Luminaries/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /show the verdant oracle effect/i })).toBeInTheDocument();
  });

  it('separates Foundry-bound cards from the ordinary Encrypted capacity and hosts recovery there', () => {
    const state = gameState();
    const localPlayer = state.players[0]!;
    const ordinary = {
      id: 't1e01',
      name: 'Replication Spore',
      tier: 1,
      bonusAffinity: 'verdance',
      eminence: 0,
      cost: { ...emptyAffinities(), flare: 1, continuum: 1, radiance: 1 },
      flavor: '',
    } as never;
    const foundryComponent = {
      id: 't1r07',
      name: 'Entropy Pyre Baffle',
      tier: 1,
      bonusAffinity: 'flare',
      eminence: 0,
      cost: { ...emptyAffinities(), abyss: 1 },
      flavor: '',
    } as never;
    localPlayer.reservedArtifacts = [ordinary, foundryComponent];
    localPlayer.blueprintPrivateStates = [{
      blueprintId: 'bp_mantle_to_orbit_foundry',
      slotIndex: 0,
      matchedComponentIds: ['t1r07', 't1s02', 't1o05'],
      manifested: true,
      foundryStoredArtifactIds: ['t1r07'],
      foundryRecoveryArtifactIds: ['t1r07'],
    }];
    localPlayer.manifestedBlueprintDevices = [{
      blueprintId: 'bp_mantle_to_orbit_foundry',
      definition: BLUEPRINT_DEFINITIONS.bp_mantle_to_orbit_foundry as never,
      ownerPlayerId: 'local',
      slotIndex: 0,
      state: 'recovering',
      presentationVariant: 'armored',
      foundryUsesRemaining: 0,
    }];
    const handleFoundryRecovery = vi.fn();

    const { container } = render(<HandTab scope={handTabScope(state, {
      me: localPlayer,
      myReservedCount: 1,
      handleFoundryRecovery,
    })} />);

    expect(screen.getByText('(1/3)')).toBeInTheDocument();
    expect(screen.queryByText('(2/3)')).not.toBeInTheDocument();
    expect(screen.getByText('Foundry Components')).toBeInTheDocument();
    expect(container.querySelector('[data-foundry-component-id="t1r07"]')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Recover/i }));
    expect(handleFoundryRecovery).toHaveBeenCalledWith('t1r07');
  });

  it('keeps Intact-Covenant components in paid re-Forge storage without recovery controls', () => {
    const state = gameState();
    const localPlayer = state.players[0]!;
    const ordinaryCards = ['t1e01', 't1s01', 't1p01'].map((id, index) => ({
      id,
      name: `Ordinary ${index + 1}`,
      tier: 1,
      bonusAffinity: 'verdance',
      eminence: 0,
      cost: emptyAffinities(),
      flavor: '',
    })) as never[];
    const componentIds = ['t1r07', 't1s02', 't1o05'];
    const foundryCards = componentIds.map((id, index) => ({
      id,
      name: `Foundry ${index + 1}`,
      tier: 1,
      bonusAffinity: 'flare',
      eminence: 0,
      cost: emptyAffinities(),
      flavor: '',
    })) as never[];
    localPlayer.reservedArtifacts = [...ordinaryCards, ...foundryCards];
    localPlayer.blueprintPrivateStates = [{
      blueprintId: 'bp_mantle_to_orbit_foundry',
      slotIndex: 0,
      matchedComponentIds: componentIds,
      manifested: true,
      foundryStoredArtifactIds: componentIds,
    }];
    localPlayer.manifestedBlueprintDevices = [{
      blueprintId: 'bp_mantle_to_orbit_foundry',
      definition: BLUEPRINT_DEFINITIONS.bp_mantle_to_orbit_foundry as never,
      ownerPlayerId: 'local',
      slotIndex: 0,
      state: 'spent',
      presentationVariant: 'armored',
      foundryUsesRemaining: 0,
    }];

    const { container } = render(<HandTab scope={handTabScope(state, {
      me: localPlayer,
      myReservedCount: ordinaryCards.length,
    })} />);

    expect(container.querySelector('[data-encrypted-artifacts-group="true"]')).toHaveTextContent('(3/3)');
    expect(container.querySelector('[data-foundry-components-group="true"]')).toHaveTextContent('(3)');
    expect(screen.getAllByText('Paid re-Forge')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /Recover/i })).not.toBeInTheDocument();
    expect(screen.queryByText('(6/3)')).not.toBeInTheDocument();
  });
});
