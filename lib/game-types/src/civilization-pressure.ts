import type { ArtifactCivilizationCapabilityId } from './civilization-capabilities';
import type {
  CivilizationAffinityIdentity,
  CivilizationCapabilityId,
  CivilizationPressureTag,
  StandardAffinityKey,
} from './index';

export type CivilizationPressureCapabilityCoverage = 'none' | 'partial' | 'strong';

export interface CivilizationPressureAffinityEffect {
  aptitude: 0 | 1 | 2;
  risk: 0 | 1 | 2;
  aptitudeReason: string;
  riskReason: string;
}

export interface CivilizationPressureResponseProfile {
  pressureTag: CivilizationPressureTag;
  primaryCapabilityIds: readonly ArtifactCivilizationCapabilityId[];
  supportingCapabilityIds: readonly ArtifactCivilizationCapabilityId[];
  affinityEffects: Readonly<Record<StandardAffinityKey, CivilizationPressureAffinityEffect>>;
}

export interface CivilizationPressureAffinityContribution {
  affinity: StandardAffinityKey;
  weight: number;
  aptitude: number;
  risk: number;
  aptitudeReason: string;
  riskReason: string;
}

export interface CivilizationPressureResponseAssessment {
  pressureTag: CivilizationPressureTag;
  capabilityCoverage: CivilizationPressureCapabilityCoverage;
  activePrimaryCapabilityIds: ArtifactCivilizationCapabilityId[];
  activeSupportingCapabilityIds: ArtifactCivilizationCapabilityId[];
  aptitudeScore: number;
  riskScore: number;
  netExecutionFit: number;
  affinityContributions: CivilizationPressureAffinityContribution[];
  explanation: string[];
}

function effect(
  aptitude: 0 | 1 | 2,
  risk: 0 | 1 | 2,
  aptitudeReason: string,
  riskReason: string,
): CivilizationPressureAffinityEffect {
  return { aptitude, risk, aptitudeReason, riskReason };
}

/**
 * Canonical v1 pressure-response matrix.
 *
 * Capabilities remain the only source of concrete response options. Affinity
 * effects describe execution aptitude and characteristic failure risk; they do
 * not manufacture a capability that the civilization has not mastered.
 */
export const CIVILIZATION_PRESSURE_RESPONSE_PROFILES = {
  disruption: {
    pressureTag: 'disruption',
    primaryCapabilityIds: [
      'artifact:system_stabilization',
      'artifact:failure_isolation',
      'artifact:resilient_computation',
      'artifact:controlled_shutdown',
      'artifact:ecological_recovery',
    ],
    supportingCapabilityIds: [
      'artifact:hazard_detection',
      'artifact:hazard_containment',
      'artifact:memory_preservation',
      'artifact:distributed_coordination',
    ],
    affinityEffects: {
      flare: effect(1, 2, 'Flare mobilizes a decisive response.', 'Flare may escalate a disturbance faster than it can be bounded.'),
      radiance: effect(1, 1, 'Radiance coordinates a legible common response.', 'Radiance may over-centralize authority during disorder.'),
      continuum: effect(2, 1, 'Continuum preserves synchronization and service through interruption.', 'Continuum may preserve a failing system past its useful life.'),
      verdance: effect(2, 1, 'Verdance adapts and rebuilds around local failure.', 'Verdance may let emergency growth escape its intended bounds.'),
      abyss: effect(2, 1, 'Abyss isolates failure and shuts unsafe paths.', 'Abyss may turn emergency withdrawal into permanent separation.'),
    },
  },
  isolation: {
    pressureTag: 'isolation',
    primaryCapabilityIds: [
      'artifact:transit_navigation',
      'artifact:secure_communication',
      'artifact:distributed_coordination',
      'artifact:cross_ecology_mediation',
    ],
    supportingCapabilityIds: [
      'artifact:memory_preservation',
      'artifact:habitat_engineering',
      'artifact:signal_interpretation',
      'artifact:temporal_coordination',
    ],
    affinityEffects: {
      flare: effect(1, 1, 'Flare can force a rapid bridge across a broken connection.', 'Flare may overextend scarce routes and responders.'),
      radiance: effect(2, 1, 'Radiance restores shared legibility and coordinated access.', 'Radiance may demand one standard from communities that diverged while isolated.'),
      continuum: effect(2, 1, 'Continuum preserves memory, timing, and connection across separation.', 'Continuum may bind recovery to obsolete routes.'),
      verdance: effect(1, 1, 'Verdance supports distributed local survival until contact returns.', 'Verdance may allow isolated systems to diverge incompatibly.'),
      abyss: effect(1, 2, 'Abyss keeps compartments viable without unsafe contact.', 'Abyss may accept isolation as a permanent solution.'),
    },
  },
  proliferation: {
    pressureTag: 'proliferation',
    primaryCapabilityIds: [
      'artifact:hazard_containment',
      'artifact:ecological_shutdown',
      'artifact:failure_isolation',
      'artifact:controlled_shutdown',
      'artifact:predictive_modeling',
    ],
    supportingCapabilityIds: [
      'artifact:hazard_detection',
      'artifact:ecological_adaptation',
      'artifact:cross_ecology_mediation',
    ],
    affinityEffects: {
      flare: effect(1, 1, 'Flare can interrupt runaway growth decisively.', 'Flare may destroy viable systems together with the threat.'),
      radiance: effect(2, 1, 'Radiance imposes observable boundaries and accountable controls.', 'Radiance may turn containment into coercive standardization.'),
      continuum: effect(1, 1, 'Continuum traces propagation across time and connected systems.', 'Continuum may preserve harmful dependencies while seeking continuity.'),
      verdance: effect(1, 2, 'Verdance can redirect growth through adaptive competition.', 'Verdance is vulnerable to runaway replication and engulfing interdependence.'),
      abyss: effect(2, 1, 'Abyss contains, compartmentalizes, or shuts down spread.', 'Abyss may conceal losses and erase information needed for recovery.'),
    },
  },
  exposure: {
    pressureTag: 'exposure',
    primaryCapabilityIds: [
      'artifact:concealment',
      'artifact:secure_communication',
      'artifact:hazard_detection',
      'artifact:evidence_verification',
      'artifact:boundary_observation',
      'artifact:hazard_containment',
    ],
    supportingCapabilityIds: [
      'artifact:signal_interpretation',
      'artifact:predictive_modeling',
      'artifact:record_governance',
    ],
    affinityEffects: {
      flare: effect(1, 2, 'Flare responds before exposure can be exploited fully.', 'Flare may reveal more by reacting visibly or escalating contact.'),
      radiance: effect(2, 1, 'Radiance verifies what is exposed and coordinates a public response.', 'Radiance may normalize surveillance as protection.'),
      continuum: effect(1, 1, 'Continuum preserves trustworthy records when channels are compromised.', 'Continuum may refuse to relinquish an exposed system.'),
      verdance: effect(1, 1, 'Verdance distributes adaptation across many local nodes.', 'Verdance may increase the civilization\'s attack surface.'),
      abyss: effect(2, 1, 'Abyss conceals vulnerable sources and restores defensive boundaries.', 'Abyss may sacrifice legibility and shared knowledge for secrecy.'),
    },
  },
  attrition: {
    pressureTag: 'attrition',
    primaryCapabilityIds: [
      'artifact:resource_reclamation',
      'artifact:ecological_recovery',
      'artifact:resilient_computation',
      'artifact:material_engineering',
      'artifact:habitat_engineering',
      'artifact:memory_preservation',
    ],
    supportingCapabilityIds: [
      'artifact:energy_conversion',
      'artifact:resource_extraction',
      'artifact:thermal_management',
      'artifact:system_stabilization',
    ],
    affinityEffects: {
      flare: effect(1, 2, 'Flare concentrates resources for decisive recovery.', 'Flare may consume reserves faster than they can be restored.'),
      radiance: effect(1, 1, 'Radiance coordinates scarce resources across the civilization.', 'Radiance may impose rigid priorities that hide unequal losses.'),
      continuum: effect(2, 1, 'Continuum preserves service, memory, and synchronization over long strain.', 'Continuum may sustain systems whose cost has become ruinous.'),
      verdance: effect(2, 1, 'Verdance recovers, redistributes, and regenerates depleted capacity.', 'Verdance may create dependencies that consume what they repair.'),
      abyss: effect(1, 2, 'Abyss conserves resources through withdrawal and shutdown.', 'Abyss may make austerity and retreat permanent.'),
    },
  },
  coordination: {
    pressureTag: 'coordination',
    primaryCapabilityIds: [
      'artifact:distributed_coordination',
      'artifact:plural_governance',
      'artifact:evidence_verification',
      'artifact:record_governance',
      'artifact:secure_communication',
      'artifact:temporal_coordination',
    ],
    supportingCapabilityIds: [
      'artifact:signal_interpretation',
      'artifact:memory_preservation',
      'artifact:resilient_computation',
    ],
    affinityEffects: {
      flare: effect(1, 1, 'Flare mobilizes separated institutions toward a common objective.', 'Flare may destabilize deliberation in pursuit of speed.'),
      radiance: effect(2, 2, 'Radiance makes authority, evidence, and collective action legible.', 'Radiance may replace consent with coercive order.'),
      continuum: effect(2, 1, 'Continuum synchronizes institutions and preserves shared memory.', 'Continuum may ossify an arrangement that no longer serves its members.'),
      verdance: effect(1, 1, 'Verdance enables distributed, adaptive coordination.', 'Verdance may turn mutual support into engulfing interdependence.'),
      abyss: effect(1, 2, 'Abyss coordinates through bounded compartments and need-to-know channels.', 'Abyss may make authority opaque and communities mutually unreachable.'),
    },
  },
  transformation: {
    pressureTag: 'transformation',
    primaryCapabilityIds: [
      'artifact:controlled_energy',
      'artifact:precision_fabrication',
      'artifact:material_engineering',
      'artifact:ecological_adaptation',
      'artifact:transit_navigation',
      'artifact:energy_conversion',
    ],
    supportingCapabilityIds: [
      'artifact:predictive_modeling',
      'artifact:system_stabilization',
      'artifact:hazard_containment',
      'artifact:failure_isolation',
    ],
    affinityEffects: {
      flare: effect(2, 2, 'Flare makes decisive transformation culturally and operationally natural.', 'Flare may pursue change beyond necessity or safe limits.'),
      radiance: effect(1, 1, 'Radiance coordinates and governs a legible transition.', 'Radiance may impose one authorized form on plural futures.'),
      continuum: effect(1, 2, 'Continuum preserves identity and service through change.', 'Continuum may bind transformation to failing inherited systems.'),
      verdance: effect(2, 2, 'Verdance adapts structures and populations as conditions change.', 'Verdance may let transformation proliferate beyond consent or control.'),
      abyss: effect(1, 1, 'Abyss bounds transformation through enclosure and controlled relinquishment.', 'Abyss may turn a temporary chrysalis into permanent withdrawal.'),
    },
  },
} as const satisfies Record<CivilizationPressureTag, CivilizationPressureResponseProfile>;

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function affinityWeights(
  identity: CivilizationAffinityIdentity,
): Array<{ affinity: StandardAffinityKey; weight: number }> {
  const positive = identity.rankedAffinities.filter((entry) => entry.historicalWeight > 0);
  if (positive.length === 0) return [];

  let selected: Array<{ affinity: StandardAffinityKey; weight: number }>;
  if (identity.form === 'dyad') {
    selected = positive.slice(0, 2).map((entry) => ({ affinity: entry.affinity, weight: 1 }));
  } else if (identity.form === 'plural') {
    const highest = positive[0].historicalWeight;
    const tied = positive.filter((entry) => entry.historicalWeight === highest);
    selected = tied.map((entry) => ({ affinity: entry.affinity, weight: 1 / tied.length }));
  } else {
    const affinity = identity.dominantAffinity ?? positive[0].affinity;
    selected = [{ affinity, weight: 1 }];
  }

  if (
    identity.thirdAffinity &&
    !selected.some((entry) => entry.affinity === identity.thirdAffinity)
  ) {
    selected.push({ affinity: identity.thirdAffinity, weight: 0.5 });
  }
  return selected;
}

export function assessCivilizationPressureResponse(
  pressureTag: CivilizationPressureTag,
  activeCapabilityIds: readonly CivilizationCapabilityId[],
  identity: CivilizationAffinityIdentity,
): CivilizationPressureResponseAssessment {
  const profile = CIVILIZATION_PRESSURE_RESPONSE_PROFILES[pressureTag];
  const active = new Set(activeCapabilityIds);
  const activePrimaryCapabilityIds = profile.primaryCapabilityIds.filter((id) => active.has(id));
  const activeSupportingCapabilityIds = profile.supportingCapabilityIds.filter((id) => active.has(id));
  const capabilityCoverage: CivilizationPressureCapabilityCoverage =
    activePrimaryCapabilityIds.length > 0
      ? 'strong'
      : activeSupportingCapabilityIds.length > 0
        ? 'partial'
        : 'none';

  const weights = affinityWeights(identity);
  const totalWeight = weights.reduce((sum, entry) => sum + entry.weight, 0);
  const affinityContributions = weights.map(({ affinity, weight }) => {
    const affinityEffect = profile.affinityEffects[affinity];
    return {
      affinity,
      weight,
      aptitude: affinityEffect.aptitude,
      risk: affinityEffect.risk,
      aptitudeReason: affinityEffect.aptitudeReason,
      riskReason: affinityEffect.riskReason,
    };
  });
  let aptitudeScore = totalWeight > 0
    ? affinityContributions.reduce((sum, entry) => sum + entry.aptitude * entry.weight, 0) / totalWeight
    : 0;
  let riskScore = totalWeight > 0
    ? affinityContributions.reduce((sum, entry) => sum + entry.risk * entry.weight, 0) / totalWeight
    : 0;

  if (identity.form === 'dyad' && affinityContributions.length >= 2) {
    if (affinityContributions[0].aptitude > 0 && affinityContributions[1].aptitude > 0) {
      aptitudeScore += 0.25;
    }
    if (affinityContributions[0].risk === 2 && affinityContributions[1].risk === 2) {
      riskScore += 0.25;
    }
  }
  aptitudeScore = roundScore(Math.min(2.25, aptitudeScore));
  riskScore = roundScore(Math.min(2.25, riskScore));

  const coverageAdjustment = capabilityCoverage === 'strong'
    ? 1
    : capabilityCoverage === 'partial'
      ? 0.35
      : -1;
  const netExecutionFit = roundScore(coverageAdjustment + aptitudeScore - riskScore * 0.5);
  const explanation = [
    capabilityCoverage === 'strong'
      ? `${activePrimaryCapabilityIds.length} primary response capability${activePrimaryCapabilityIds.length === 1 ? '' : 'ies'} operational.`
      : capabilityCoverage === 'partial'
        ? `${activeSupportingCapabilityIds.length} supporting capability${activeSupportingCapabilityIds.length === 1 ? '' : 'ies'} operational; no primary response capability is active.`
        : 'No matching operational capability is available; Affinity cannot substitute for preparation.',
    identity.form === 'unformed'
      ? 'Affinity identity is not yet formed.'
      : `Affinity aptitude ${aptitudeScore.toFixed(2)}; characteristic risk ${riskScore.toFixed(2)}.`,
  ];

  return {
    pressureTag,
    capabilityCoverage,
    activePrimaryCapabilityIds: [...activePrimaryCapabilityIds],
    activeSupportingCapabilityIds: [...activeSupportingCapabilityIds],
    aptitudeScore,
    riskScore,
    netExecutionFit,
    affinityContributions,
    explanation,
  };
}

export function assessCivilizationPressureResponses(
  pressureTags: readonly CivilizationPressureTag[],
  activeCapabilityIds: readonly CivilizationCapabilityId[],
  identity: CivilizationAffinityIdentity,
): CivilizationPressureResponseAssessment[] {
  return [...new Set(pressureTags)].map((pressureTag) =>
    assessCivilizationPressureResponse(pressureTag, activeCapabilityIds, identity),
  );
}
