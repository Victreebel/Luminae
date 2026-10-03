import {
  AFFINITY_KEYS,
  ARTIFACT_CATALOG,
  ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID,
  CIVILIZATION_EVENT_CARD_DEFINITIONS,
  CIVILIZATION_STABILITY_IMPACT_MAGNITUDES,
  STANDARD_AFFINITY_KEYS,
  artifactHasEventFact,
  getArtifactEventFactEvidence,
  buildCivilizationResolutionSnapshot,
  resolveCivilizationEvent,
  type AffinityCounts,
  type ArtifactCivilizationCapabilityId,
  type ApplyCivilizationConsequencesOptions,
  type CivilizationConsequence,
  type CivilizationEventCardId,
  type CivilizationEventPlayerOutcome,
  type CivilizationEventTargetEvidence,
  type CivilizationEventTargetingRule,
  type CivilizationResolutionResult,
  type StandardAffinityKey,
} from "@workspace/game-types";
import type { GameStateData, PlayerGameState } from "./gameEngine.js";

const artifactIds = new Set<string>(ARTIFACT_CATALOG.map((artifact) => artifact.id));

export interface FrozenLoreEventPlayerPlan {
  playerId: string;
  resolution: CivilizationResolutionResult;
  outcome: CivilizationEventPlayerOutcome;
  options: ApplyCivilizationConsequencesOptions;
  grantedAffinity: StandardAffinityKey | null;
}

/** Server-only. Explicit consequences survive reconnects and catalog changes. */
export interface FrozenLoreEventPlan {
  schemaVersion: 1;
  rulesVersion: string;
  rulesText: string;
  eventId: string;
  definitionId: CivilizationEventCardId;
  triggerTurnCount: number;
  players: FrozenLoreEventPlayerPlan[];
}

function capabilities(artifactId: string): readonly ArtifactCivilizationCapabilityId[] {
  return ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID[
    artifactId as keyof typeof ARTIFACT_CIVILIZATION_CAPABILITIES_BY_ID
  ] ?? [];
}

/** A historical record or private Encrypted copy cannot become a public responder. */
function operationalForgedIds(player: PlayerGameState): string[] {
  const reserved = new Set(player.reservedArtifactIds);
  return [...new Set(player.forgedArtifactIds)].reverse().filter((id) => (
    artifactIds.has(id) && !reserved.has(id) &&
    player.civilization.artifacts[id]?.implementationState === "operational"
  ));
}

function matchesSelector(artifactId: string, rule: CivilizationEventTargetingRule): boolean {
  return rule.selector.kind === "capability"
    ? capabilities(artifactId).includes(rule.selector.id)
    : artifactHasEventFact(artifactId, rule.selector.id);
}

function reserveAffinity(player: PlayerGameState, well: AffinityCounts): StandardAffinityKey | null {
  if (AFFINITY_KEYS.reduce((total, key) => total + player.affinities[key], 0) >= 10) return null;
  const affinity = [...STANDARD_AFFINITY_KEYS]
    .filter((key) => well[key] > 0)
    .sort((a, b) => player.affinities[a] - player.affinities[b] ||
      STANDARD_AFFINITY_KEYS.indexOf(a) - STANDARD_AFFINITY_KEYS.indexOf(b))[0] ?? null;
  if (affinity) well[affinity]--;
  return affinity;
}

export function buildFrozenLoreEventPlan(
  state: GameStateData,
  eventId: string,
  definitionId: CivilizationEventCardId,
): FrozenLoreEventPlan | null {
  const definition = CIVILIZATION_EVENT_CARD_DEFINITIONS[definitionId];
  const rule: CivilizationEventTargetingRule | undefined = "targeting" in definition ? definition.targeting : undefined;
  if (!rule) return null;
  const source = { sourceType: "scenario" as const, sourceId: definitionId };
  const well = { ...state.affinityWell };
  const players: FrozenLoreEventPlayerPlan[] = [];

  // Allocate scarce gifts in fixed seating order. Every selector reads the same
  // pre-Event state; only this local supply ledger changes while planning.
  for (const player of state.players) {
    const matching = operationalForgedIds(player).filter((id) => matchesSelector(id, rule));
    const protection = rule.protectedByOwnCapability;
    const protectedIds = protection ? matching.filter((id) => capabilities(id).includes(protection)) : [];
    const selected = matching.filter((id) => !protectedIds.includes(id)).slice(0, rule.perPlayerLimit);
    const signal = definitionId === "event_planetary_signal_clarity";
    const damagedArtifactIds = signal ? [] : selected;
    const grantedAffinity = signal && selected.length > 0 ? reserveAffinity(player, well) : null;
    const targetEvidence: CivilizationEventTargetEvidence[] = selected.map((artifactId) => ({
      artifactId,
      match: { ...rule.selector },
      role: signal ? "responder" : "target",
      reason: signal
        ? "Its operational signal interpretation benefits from reduced interference within its established domain."
        : `${getArtifactEventFactEvidence(artifactId, "dependency:distributed_synchronization")?.reason ?? "Its operation depends on distributed synchronization."} No own resilient-computation capability protects this implementation; synchronization shear damages it.`,
    }));
    for (const artifactId of protectedIds) {
      targetEvidence.push({
        artifactId,
        match: { kind: "capability", id: protection! },
        role: "mitigator",
        reason: "Its own resilient computation maintains operation through synchronization shear. It does not protect other Artifacts.",
      });
    }
    const consequences: CivilizationConsequence[] = damagedArtifactIds.flatMap((artifactId) => [
      {
        type: "set_artifact_implementation" as const,
        artifactId,
        implementationState: "damaged" as const,
        turnCount: state.turnCount,
        source,
      },
      {
        type: "apply_condition" as const,
        condition: {
          id: `${eventId}:${player.playerId}:${artifactId}:damaged`,
          type: "damaged", coreType: "damaged" as const,
          target: { kind: "artifact_implementation" as const, id: artifactId },
          source, appliedTurnCount: state.turnCount, resolvedTurnCount: null,
          historyEvidence: "recorded" as const,
        },
      },
    ]);
    consequences.push({ type: "record_history", key: "rules_version", value: rule.rulesVersion });
    for (const evidence of targetEvidence) {
      consequences.push({ type: "record_history", key: `target_reason:${evidence.artifactId}`, value: evidence.reason });
    }
    if (grantedAffinity) {
      consequences.push({ type: "record_history", key: "gained_affinity", value: grantedAffinity });
    }
    const summary = signal
      ? selected.length === 0
        ? "No operational forged Artifact could interpret the clearer signals; no Affinity gained."
        : grantedAffinity
          ? `Operational signal interpretation gained 1 ${grantedAffinity} from the Well.`
          : "Operational signal interpretation responded; no Affinity gained because the hand is full or the standard Well is empty."
      : damagedArtifactIds.length > 0
        ? "Synchronization shear damaged 1 operational Artifact that depends on distributed synchronization. Queue its free repair in Civilization."
        : protectedIds.length > 0
          ? "Resilient computation protected every otherwise eligible synchronization-dependent Artifact."
          : "No unprotected operational forged Artifact depended on distributed synchronization; no damage occurred.";
    const outcome: CivilizationEventPlayerOutcome = {
      playerId: player.playerId,
      outcomeId: damagedArtifactIds.length > 0 ? "exposed" : "protected",
      capabilityCoverage: selected.length > 0 && signal || protectedIds.length > 0 ? "strong" : "none",
      respondingCapabilityIds: signal && selected.length > 0
        ? ["artifact:signal_interpretation"]
        : protectedIds.length > 0 ? [protection!] : [],
      respondingManifestations: (signal ? selected : protectedIds).map((sourceId) => ({
        sourceType: "artifact",
        sourceId,
        capabilityIds: signal ? ["artifact:signal_interpretation"] : [protection!],
      })),
      damagedArtifactIds,
      targetEvidence,
      appliedConditionType: damagedArtifactIds.length > 0 ? "damaged" : null,
      stabilityPressure: damagedArtifactIds.length * CIVILIZATION_STABILITY_IMPACT_MAGNITUDES.minor,
      summary,
    };
    const resolution = resolveCivilizationEvent({
      eventId, source, form: "automatic", timing: "trigger_window",
      pressureTags: [...definition.pressureTags],
      snapshot: buildCivilizationResolutionSnapshot(player.civilization),
      trajectories: [{
        id: outcome.outcomeId, label: definition.title, requirements: [], uncertainty: null,
        successConsequences: consequences, failureConsequences: [],
      }],
    });
    players.push({
      playerId: player.playerId, resolution, outcome, grantedAffinity,
      options: { adversity: damagedArtifactIds.length > 0 ? {
        evidenceId: `${eventId}:${player.playerId}:artifact_damage`,
        magnitude: "minor", label: definition.title, recoveryEligible: true,
      } : null },
    });
  }
  return {
    schemaVersion: 1, rulesVersion: rule.rulesVersion, rulesText: definition.rulesText, eventId, definitionId,
    triggerTurnCount: state.turnCount, players,
  };
}
