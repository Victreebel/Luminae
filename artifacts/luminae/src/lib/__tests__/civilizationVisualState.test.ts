import { describe, expect, it } from 'vitest';
import type { CivilizationPublicState } from '@workspace/api-client-react';
import {
  CIVILIZATION_DYAD_DEFINITIONS,
  CIVILIZATION_STATE_VERSION,
  createCivilizationEnvironmentIdentity,
  createInitialCivilizationDistrictIdentityState,
  createInitialCivilizationNestedIdentityState,
  type CivilizationDyadId,
  type CivilizationIdentityLayer,
  type StandardAffinityKey,
} from '@workspace/game-types';
import { buildCivilizationProfile } from '@/lib/civilizationProfile';
import {
  CIVILIZATION_DYAD_VISUALS,
  deriveCivilizationCityDevelopmentStage,
  deriveCivilizationVisualState,
} from '@/lib/civilizationVisualState';

const AFFINITIES: StandardAffinityKey[] = ['flare', 'radiance', 'verdance', 'continuum', 'abyss'];

const PROFILE = buildCivilizationProfile([]);

function civilizationForDyad(
  dyadId: CivilizationDyadId,
  overrides: Partial<CivilizationPublicState> = {},
): CivilizationPublicState {
  const definition = CIVILIZATION_DYAD_DEFINITIONS.find((entry) => entry.id === dyadId)!;
  const [primary, secondary] = definition.affinities;
  const historicalCounts = Object.fromEntries(AFFINITIES.map((affinity) => [
    affinity,
    affinity === primary ? 5 : affinity === secondary ? 4 : 0,
  ])) as Record<StandardAffinityKey, number>;
  const rankedAffinities = AFFINITIES
    .map((affinity) => ({
      affinity,
      historicalWeight: historicalCounts[affinity],
      operationalWeight: historicalCounts[affinity],
    }))
    .sort((left, right) => right.historicalWeight - left.historicalWeight);
  const normalizedShares = Object.fromEntries(AFFINITIES.map((affinity) => [
    affinity,
    historicalCounts[affinity] / 9,
  ])) as Record<StandardAffinityKey, number>;
  const identityScales = createInitialCivilizationNestedIdentityState();
  for (const layer of Object.keys(identityScales) as CivilizationIdentityLayer[]) {
    identityScales[layer] = {
      ...identityScales[layer],
      status: 'committed',
      affinityCounts: { ...historicalCounts },
      normalizedShares: { ...normalizedShares },
      rankedAffinities: rankedAffinities.map((entry) => ({
        affinity: entry.affinity,
        weight: entry.historicalWeight,
      })),
      dominantAffinity: primary,
      candidateDyad: dyadId,
      committedDyad: dyadId,
      committedTurnCount: 4,
    };
  }

  return {
    version: CIVILIZATION_STATE_VERSION,
    environmentIdentity: createCivilizationEnvironmentIdentity('visual-state-test'),
    artifacts: [],
    affinityIdentity: {
      policyId: 'provisional-ratio-v1',
      form: 'dyad',
      historicalCounts,
      operationalCounts: historicalCounts,
      rankedAffinities,
      dominantAffinity: primary,
      dominantDyad: dyadId,
      foundingDyad: dyadId,
      presentationDyad: dyadId,
      identityEpochs: [],
      normalizedHistoricalShares: normalizedShares,
      normalizedOperationalShares: normalizedShares,
      thirdAffinity: null,
      dominantShare: 5 / 9,
      secondaryToPrimaryRatio: 0.8,
      thirdToPrimaryRatio: 0,
    },
    districtIdentity: createInitialCivilizationDistrictIdentityState(),
    identityScales,
    scale: {
      historicalMaturity: 'planetary',
      currentReach: 'planetary',
      currentReachCondition: 'intact',
      literalKardashevType: 1,
      literalKardashevEvidence: 'recorded',
    },
    stability: {
      band: 'stable',
      score: 100,
      calibrationId: null,
      contributors: [],
      calculatedTurnCount: null,
      historyEvidence: 'recorded',
    },
    activeConditions: [],
    projects: [],
    activeCapabilityIds: [],
    manifestationAssignments: [],
    events: [],
    legacy: { completedTurnCount: null, historyEvidence: 'recorded' },
    ...overrides,
  };
}

describe('civilization visual state', () => {
  it('maps every canonical dyad to a unique morphology composition', () => {
    const compositions = new Set<string>();

    for (const definition of CIVILIZATION_DYAD_DEFINITIONS) {
      const visual = CIVILIZATION_DYAD_VISUALS[definition.id];
      expect(visual.affinities).toEqual(definition.affinities);
      expect(compositions.has(visual.composition)).toBe(false);
      compositions.add(visual.composition);

      const state = deriveCivilizationVisualState({
        civilization: civilizationForDyad(definition.id),
        deploymentSites: [],
        profile: PROFILE,
        fallbackTier: 1,
      });
      expect(state.identity.dyad).toBe(definition.id);
      expect(state.identity.morphologyId).toBe(definition.id);
      expect(state.identity.label).toBe(`${visual.label} Dyad`);
    }

    expect(compositions.size).toBe(CIVILIZATION_DYAD_DEFINITIONS.length);
  });

  it('advances every lower scale to Type III after galactic maturity', () => {
    const civilization = civilizationForDyad('flux', {
      artifacts: Array.from({ length: 18 }, (_, index) => ({
        artifactId: `artifact-${index}`,
        firstMasteredTurnCount: index + 1,
        masteryCount: 1,
        implementationState: 'operational',
        implementationStateChangedTurnCount: null,
        changeSourceType: 'artifact',
        historyEvidence: 'recorded',
      })),
      scale: {
        historicalMaturity: 'galactic',
        currentReach: 'galactic',
        currentReachCondition: 'intact',
        literalKardashevType: 3,
        literalKardashevEvidence: 'recorded',
      },
    });
    const state = deriveCivilizationVisualState({ civilization, deploymentSites: [], profile: PROFILE, fallbackTier: 3 });

    expect(state.globalComplexity).toBe(3);
    expect(state.globalComplexityLabel).toBe('Ascendant');
    expect(state.scenes.surface.stage).toBe(3);
    expect(state.scenes.orbit.stage).toBe(3);
    expect(state.scenes.stellar.stage).toBe(3);
    expect(state.scenes.galaxy.stage).toBe(2);
  });

  it('distinguishes wilderness, a one-Artifact nucleus, and a two-Artifact city', () => {
    const artifact = (artifactId: string, turn: number) => ({
      artifactId,
      firstMasteredTurnCount: turn,
      masteryCount: 1,
      implementationState: 'operational' as const,
      implementationStateChangedTurnCount: null,
      changeSourceType: 'artifact' as const,
      historyEvidence: 'recorded' as const,
    });
    const zero = deriveCivilizationVisualState({
      civilization: civilizationForDyad('bloom'),
      deploymentSites: [],
      profile: PROFILE,
      fallbackTier: 1,
    });
    const one = deriveCivilizationVisualState({
      civilization: civilizationForDyad('bloom', { artifacts: [artifact('first', 1)] }),
      deploymentSites: [],
      profile: PROFILE,
      fallbackTier: 1,
    });
    const two = deriveCivilizationVisualState({
      civilization: civilizationForDyad('bloom', { artifacts: [artifact('first', 1), artifact('second', 2)] }),
      deploymentSites: [],
      profile: PROFILE,
      fallbackTier: 1,
    });

    expect(zero.settlementPhase).toBe('wilderness');
    expect(zero.artifactCount).toBe(0);
    expect(zero.cityDevelopmentStage).toBe(0);
    expect(zero.cityDevelopmentLabel).toBe('Non-Artifact Landscape');
    expect(one.settlementPhase).toBe('nucleus');
    expect(one.scenes.surface.settlementPhase).toBe('nucleus');
    expect(one.cityDevelopmentStage).toBe(1);
    expect(one.cityDevelopmentLabel).toBe('First Civic Nucleus');
    expect(two.settlementPhase).toBe('city');
    expect(two.scenes.surface.artifactCount).toBe(2);
    expect(two.cityDevelopmentStage).toBe(2);
    expect(two.cityDevelopmentLabel).toBe('Young City');
  });

  it('tracks ten same-city eras without letting maturity skip infrastructure', () => {
    const artifacts = (count: number) => Array.from({ length: count }, (_, index) => ({
      artifactId: `artifact-${index}`,
      firstMasteredTurnCount: index + 1,
      masteryCount: 1,
      implementationState: 'operational' as const,
      implementationStateChangedTurnCount: null,
      changeSourceType: 'artifact' as const,
      historyEvidence: 'recorded' as const,
    }));
    const state = (count: number, maturity: 'planetary' | 'stellar' | 'galactic') => (
      deriveCivilizationVisualState({
        civilization: civilizationForDyad('chrysalis', {
          artifacts: artifacts(count),
          scale: {
            historicalMaturity: maturity,
            currentReach: maturity,
            currentReachCondition: 'intact',
            literalKardashevType: maturity === 'galactic' ? 3 : maturity === 'stellar' ? 2 : 1,
            literalKardashevEvidence: 'recorded',
          },
        }),
        deploymentSites: [],
        profile: PROFILE,
        fallbackTier: maturity === 'galactic' ? 3 : maturity === 'stellar' ? 2 : 1,
      })
    );

    expect(state(0, 'planetary').cityDevelopmentStage).toBe(0);
    expect(state(1, 'planetary').cityDevelopmentStage).toBe(1);
    expect(state(2, 'planetary').cityDevelopmentStage).toBe(2);
    expect(state(5, 'planetary').cityDevelopmentStage).toBe(3);
    expect(state(8, 'planetary').cityDevelopmentStage).toBe(4);
    expect(state(10, 'planetary').cityDevelopmentStage).toBe(5);
    expect(state(10, 'stellar').cityDevelopmentStage).toBe(5);
    expect(state(10, 'galactic').cityDevelopmentStage).toBe(5);

    expect(deriveCivilizationCityDevelopmentStage(11, 'stellar', {
      stellarArrivalArtifactCount: 10,
    })).toBe(6);
    expect(deriveCivilizationCityDevelopmentStage(12, 'stellar', {
      stellarArrivalArtifactCount: 10,
    })).toBe(7);
    expect(deriveCivilizationCityDevelopmentStage(12, 'galactic', {
      galacticArrivalArtifactCount: 12,
    })).toBe(7);
    expect(deriveCivilizationCityDevelopmentStage(13, 'galactic', {
      galacticArrivalArtifactCount: 12,
    })).toBe(8);
    expect(deriveCivilizationCityDevelopmentStage(14, 'galactic', {
      galacticArrivalArtifactCount: 12,
    })).toBe(9);
  });

  it('turns Legacy completion into an Ascendant Galactic settlement', () => {
    const civilization = civilizationForDyad('vortex', {
      scale: {
        historicalMaturity: 'galactic',
        currentReach: 'galactic',
        currentReachCondition: 'intact',
        literalKardashevType: 3,
        literalKardashevEvidence: 'recorded',
      },
      legacy: { completedTurnCount: 18, historyEvidence: 'recorded' },
    });

    const state = deriveCivilizationVisualState({
      civilization,
      deploymentSites: [],
      profile: PROFILE,
      fallbackTier: 3,
    });

    expect(state.scenes.galaxy.stage).toBe(3);
    expect(state.scenes.galaxy.label).toBe('Ascendant');
  });

  it('ignores legacy scale locks and routes the live civilization direction to every scene', () => {
    const civilization = civilizationForDyad('bloom');
    const layerDyads = {
      city: 'bloom',
      planet: 'echo',
      system: 'vortex',
      galaxy: 'lineage',
    } as const;
    for (const [layer, dyad] of Object.entries(layerDyads) as Array<[
      CivilizationIdentityLayer,
      CivilizationDyadId,
    ]>) {
      civilization.identityScales[layer] = {
        ...civilization.identityScales[layer],
        candidateDyad: dyad,
        committedDyad: dyad,
      };
    }
    const state = deriveCivilizationVisualState({
      civilization,
      deploymentSites: [],
      profile: PROFILE,
      fallbackTier: 3,
    });

    expect(state.identities.surface.dyad).toBe('bloom');
    expect(state.identities.orbit.dyad).toBe('bloom');
    expect(state.identities.stellar.dyad).toBe('bloom');
    expect(state.identities.galaxy.dyad).toBe('bloom');
  });

  it('distinguishes historical scale from degraded present Reach', () => {
    const civilization = civilizationForDyad('echo', {
      scale: {
        historicalMaturity: 'galactic',
        currentReach: 'planetary',
        currentReachCondition: 'degraded',
        literalKardashevType: 1,
        literalKardashevEvidence: 'recorded',
      },
    });
    const state = deriveCivilizationVisualState({ civilization, deploymentSites: [], profile: PROFILE, fallbackTier: 3 });

    expect(state.scenes.surface.reach).toBe('degraded');
    expect(state.scenes.orbit.reach).toBe('degraded');
    expect(state.scenes.stellar.reach).toBe('historical');
    expect(state.scenes.galaxy.reach).toBe('historical');
  });

  it('retains non-operational Artifacts in the historical milestone record', () => {
    const civilization = civilizationForDyad('canopy', {
      artifacts: [{
        artifactId: 'archived-work',
        firstMasteredTurnCount: 4,
        masteryCount: 1,
        implementationState: 'archived',
        implementationStateChangedTurnCount: 9,
        changeSourceType: 'system',
        historyEvidence: 'recorded',
      }],
    });
    const state = deriveCivilizationVisualState({ civilization, deploymentSites: [], profile: PROFILE, fallbackTier: 1 });

    expect(state.milestones).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'artifact:archived-work', detail: expect.stringContaining('retained in history') }),
    ]));
  });
});
