import { describe, expect, it } from 'vitest';
import type {
  CivilizationPublicState,
  GamePlayerState,
} from '@workspace/api-client-react';
import {
  CIVILIZATION_STATE_VERSION,
  createCivilizationEnvironmentIdentity,
  createInitialCivilizationNestedIdentityState,
} from '@workspace/game-types';
import { civilizationStateKey } from '@/pages/game-civilization-utils';

function civilization(): CivilizationPublicState {
  return {
    version: CIVILIZATION_STATE_VERSION,
    environmentIdentity: createCivilizationEnvironmentIdentity('live-state-key'),
    artifacts: [],
    affinityIdentity: {
      policyId: 'provisional-ratio-v1',
      form: 'unformed',
      historicalCounts: { flare: 0, radiance: 0, verdance: 0, continuum: 0, abyss: 0 },
      operationalCounts: { flare: 0, radiance: 0, verdance: 0, continuum: 0, abyss: 0 },
      rankedAffinities: [],
      dominantAffinity: null,
      dominantDyad: null,
      foundingDyad: null,
      presentationDyad: null,
      identityEpochs: [],
      normalizedHistoricalShares: { flare: 0, radiance: 0, verdance: 0, continuum: 0, abyss: 0 },
      normalizedOperationalShares: { flare: 0, radiance: 0, verdance: 0, continuum: 0, abyss: 0 },
      thirdAffinity: null,
      dominantShare: 0,
      secondaryToPrimaryRatio: 0,
      thirdToPrimaryRatio: 0,
    },
    identityScales: createInitialCivilizationNestedIdentityState(),
    scale: {
      historicalMaturity: 'galactic',
      currentReach: 'galactic',
      currentReachCondition: 'intact',
      literalKardashevType: 3,
      literalKardashevEvidence: 'recorded',
    },
    stability: {
      band: 'stable',
      score: 80,
      calibrationId: 'civilization-stability-v1',
      contributors: [],
      calculatedTurnCount: 10,
      historyEvidence: 'recorded',
    },
    activeConditions: [],
    projects: [],
    activeCapabilityIds: [],
    manifestationAssignments: [],
    events: [],
    legacy: { completedTurnCount: null, historyEvidence: 'recorded' },
  };
}

function player(civilizationState: CivilizationPublicState): GamePlayerState {
  return {
    forgedArtifacts: [],
    discountedForgeIds: [],
    claimedLuminaryIds: [],
    civName: 'Continuity Test',
    civilization: civilizationState,
  } as GamePlayerState;
}

describe('civilizationStateKey', () => {
  it('invalidates the live portrait for independent identity and Legacy transitions', () => {
    const before = civilization();
    const after = structuredClone(before);
    after.identityScales.galaxy = {
      ...after.identityScales.galaxy,
      status: 'committed',
      candidateDyad: 'vortex',
      committedDyad: 'vortex',
      committedTurnCount: 18,
    };
    after.legacy = { completedTurnCount: 18, historyEvidence: 'recorded' };

    expect(civilizationStateKey(player(after))).not.toBe(civilizationStateKey(player(before)));
  });

  it('invalidates the live portrait for project state and environment changes', () => {
    const before = civilization();
    const withProject = structuredClone(before);
    withProject.projects = [{
      projectId: 'project:bp_antimatter_detonator:0',
      blueprintId: 'bp_antimatter_detonator',
      slotIndex: 0,
      status: 'manifested',
      deviceState: 'armed',
      presentationVariant: 'armored',
      manifestedTurnCount: 12,
      stateChangedTurnCount: 12,
      activeCapabilityIds: [],
      historyEvidence: 'recorded',
    }];
    const withEnvironment = structuredClone(before);
    withEnvironment.environmentIdentity = createCivilizationEnvironmentIdentity(
      'fresh-rematch',
      'obsidian_steppe',
    );

    const beforeKey = civilizationStateKey(player(before));
    expect(civilizationStateKey(player(withProject))).not.toBe(beforeKey);
    expect(civilizationStateKey(player(withEnvironment))).not.toBe(beforeKey);
  });
});
