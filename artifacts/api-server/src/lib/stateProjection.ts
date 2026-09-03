import { createHmac, randomBytes } from "node:crypto";
import {
  BLUEPRINT_DEFINITIONS,
  buildCivilizationResolutionSnapshot,
  type BlueprintArtifactSnapshot,
  type BlueprintDeviceState,
  type BlueprintId,
  type CivilizationArtifactChangeSource,
  type CivilizationPublicState,
  type CivilizationState,
  type ManifestedDevicePublicState,
  type ScenarioProtocolEvent,
  type ScenarioProtocolId,
  type ScenarioProtocolPublicState,
} from "@workspace/game-types";

type ProjectedDevice = {
  blueprintId: string;
  ownerPlayerId: string;
  slotIndex: number;
  state: string;
  presentationVariant: string;
  foundryUsesRemaining?: number;
  ascensionDeferrals?: number;
  foundryTier2Ready?: boolean;
  foundryTier3Ready?: boolean;
};

type ProjectedManifestationEvent = {
  eventId: string;
  blueprintId: string;
  ownerPlayerId: string;
  slotIndex: number;
  createdAt: number;
};

type ProjectedDetonationEvent = {
  eventId: string;
  blueprintId: string;
  ownerPlayerId: string;
  triggeringPlayerId: string;
  targetCardId: string;
  trigger?: "forged" | "encrypted";
  hostileEffect?: "burn" | "annihilation" | "nullification" | "claim_cancellation";
  targetArtifact?: BlueprintArtifactSnapshot;
  collateralCardIds?: string[];
  collateralArtifacts?: BlueprintArtifactSnapshot[];
  interceptedByBlueprintId?: string;
  createdAt: number;
};

type AffinityCounts = {
  flare: number;
  continuum: number;
  verdance: number;
  abyss: number;
  radiance: number;
  singularity: number;
};

type ProjectedArtifact = {
  id: string;
  tier: number;
  bonusAffinity: "flare" | "continuum" | "verdance" | "abyss" | "radiance";
  eminence: number;
  cost: AffinityCounts;
  name?: string;
  flavor?: string;
  bonusesAtForge?: AffinityCounts;
};

type ProjectedPlayer = {
  playerId: string;
  isAi?: boolean;
  plannedAction: unknown;
  plannedActionCancelReason: unknown;
  reservedArtifacts: ProjectedArtifact[];
  privateReservedArtifactIds?: string[];
  blueprintPrivateStates?: unknown[];
  blueprintPresentationVariants?: Record<string, string>;
  manifestedBlueprintDevices?: ProjectedDevice[];
  civilization?: CivilizationState;
  tideArchiveTopCards?: {
    tier1: ProjectedArtifact | null;
    tier2: ProjectedArtifact | null;
    tier3: ProjectedArtifact | null;
  };
};

type ProjectableState = {
  players: ProjectedPlayer[];
  artifactMarkers?: Record<string, unknown>;
  scenarioId?: string | null;
  actionLog?: Array<{ summary: string }>;
  pendingBlueprintManifestationEvents?: ProjectedManifestationEvent[];
  pendingBlueprintDetonationEvents?: ProjectedDetonationEvent[];
  scenarioProtocols?: ScenarioProtocolPublicState[];
  pendingScenarioProtocolEvents?: ScenarioProtocolEvent[];
};

const LUMII_CLEARANCE_SCENARIO_ID = "blueprint_clearance_lumii";
const SCENARIO_PROTOCOL_SLOT: Record<BlueprintId, number> = {
  bp_antimatter_detonator: 0,
  bp_mantle_to_orbit_foundry: 1,
  bp_ascension_registry: 2,
  bp_worldshield_covenant: 2,
};

const concealmentKey = randomBytes(32);
const EMPTY_COST: AffinityCounts = {
  flare: 0,
  continuum: 0,
  verdance: 0,
  abyss: 0,
  radiance: 0,
  singularity: 0,
};

function revealBlueprintDefinition<T extends { blueprintId: string }>(value: T) {
  const definition = BLUEPRINT_DEFINITIONS[value.blueprintId as BlueprintId];
  return definition ? { ...value, definition } : value;
}

function concealedArtifactId(
  viewerPlayerId: string,
  ownerPlayerId: string,
  artifactId: string,
): string {
  const digest = createHmac("sha256", concealmentKey)
    .update(`${viewerPlayerId}:${ownerPlayerId}:${artifactId}`)
    .digest("base64url")
    .slice(0, 18);
  return `encrypted-${digest}`;
}

function concealArtifact(
  card: ProjectedArtifact,
  viewerPlayerId: string,
  ownerPlayerId: string,
): ProjectedArtifact {
  // Keep the existing ArtifactCard wire shape while transmitting only the tier.
  // The fixed values below are neutral placeholders, not gameplay data.
  return {
    id: concealedArtifactId(viewerPlayerId, ownerPlayerId, card.id),
    tier: card.tier,
    bonusAffinity: "radiance",
    eminence: 0,
    cost: { ...EMPTY_COST },
    name: "Encrypted Artifact",
    flavor: "",
  };
}

function protocolIdForSlot(slotIndex: number): ScenarioProtocolId {
  if (slotIndex === 1) return "sealed_protocol_02";
  if (slotIndex === 2) return "sealed_protocol_03";
  return "sealed_protocol_01";
}

function protocolLabel(slotIndex: number): string {
  return `SEALED PROTOCOL // ${String(slotIndex + 1).padStart(2, "0")}`;
}

function protocolSlotForBlueprint(
  players: ProjectedPlayer[],
  ownerPlayerId: string,
  blueprintId: string,
): number {
  const owner = players.find((player) => player.playerId === ownerPlayerId);
  return owner?.manifestedBlueprintDevices?.find(
    (device) => device.blueprintId === blueprintId,
  )?.slotIndex ?? 0;
}

function projectScenarioProtocolEvent(
  players: ProjectedPlayer[],
  event: ProjectedManifestationEvent | ProjectedDetonationEvent,
): ScenarioProtocolEvent {
  const manifestation = "slotIndex" in event;
  const slotIndex = manifestation
    ? event.slotIndex
    : protocolSlotForBlueprint(players, event.ownerPlayerId, event.blueprintId);
  const definition = BLUEPRINT_DEFINITIONS[event.blueprintId as BlueprintId];
  const publicEffect = definition?.publicEffect ?? "A sealed protocol altered the board state.";
  if (manifestation) {
    return {
      eventId: event.eventId,
      protocolId: protocolIdForSlot(slotIndex),
      ownerPlayerId: event.ownerPlayerId,
      slotIndex,
      kind: "manifestation",
      publicEffect,
      createdAt: event.createdAt,
    };
  }
  return {
    eventId: event.eventId,
    protocolId: protocolIdForSlot(slotIndex),
    ownerPlayerId: event.ownerPlayerId,
    slotIndex,
    kind: "effect",
    publicEffect,
    triggeringPlayerId: event.triggeringPlayerId,
    targetCardId: event.targetCardId,
    ...(event.trigger === undefined ? {} : { trigger: event.trigger }),
    ...(event.hostileEffect === undefined ? {} : { hostileEffect: event.hostileEffect }),
    ...(event.targetArtifact === undefined ? {} : { targetArtifact: event.targetArtifact }),
    ...(event.collateralCardIds === undefined ? {} : { collateralCardIds: event.collateralCardIds }),
    ...(event.collateralArtifacts === undefined ? {} : { collateralArtifacts: event.collateralArtifacts }),
    ...(event.interceptedByBlueprintId === undefined ? {} : { intercepted: true }),
    createdAt: event.createdAt,
  };
}

function scrubScenarioSummary(summary: string, players: ProjectedPlayer[]): string {
  let result = summary;
  for (const player of players) {
    for (const device of player.manifestedBlueprintDevices ?? []) {
      const name = BLUEPRINT_DEFINITIONS[device.blueprintId as BlueprintId]?.name;
      if (name) result = result.split(name).join(protocolLabel(device.slotIndex));
    }
  }
  for (const [blueprintId, definition] of Object.entries(BLUEPRINT_DEFINITIONS)) {
    const slotIndex = SCENARIO_PROTOCOL_SLOT[blueprintId as BlueprintId];
    result = result.split(definition.name).join(protocolLabel(slotIndex));
  }
  return result;
}

function isPublicBlueprintSource(
  source: CivilizationArtifactChangeSource,
  publicBlueprintIds: ReadonlySet<string>,
  redactScenarioProtocols: boolean,
): boolean {
  return source.sourceType !== "blueprint" || (
    !redactScenarioProtocols &&
    source.sourceId !== null &&
    publicBlueprintIds.has(source.sourceId)
  );
}

function projectPublicCivilization(
  civilization: CivilizationState,
  devices: readonly ProjectedDevice[],
  players: ProjectedPlayer[],
  redactScenarioProtocols: boolean,
): CivilizationPublicState {
  const publicBlueprintIds = new Set(devices.map((device) => device.blueprintId));
  const operationalDevices = redactScenarioProtocols
    ? []
    : devices as ManifestedDevicePublicState[];
  const activeCapabilityIds = buildCivilizationResolutionSnapshot(
    civilization,
    [],
    operationalDevices,
  ).activeCapabilityIds;

  return {
    version: civilization.version,
    artifacts: Object.values(civilization.artifacts)
      .map((artifact) => ({
        artifactId: artifact.artifactId,
        firstMasteredTurnCount: artifact.firstMasteredTurnCount,
        masteryCount: artifact.masteryCount,
        implementationState: artifact.implementationState,
        implementationStateChangedTurnCount: artifact.implementationStateChangedTurnCount,
        changeSourceType: artifact.implementationChangeSource?.sourceType ?? null,
        historyEvidence: artifact.historyEvidence,
      }))
      .sort((left, right) => left.artifactId.localeCompare(right.artifactId)),
    affinityIdentity: civilization.affinityIdentity,
    scale: {
      historicalMaturity: civilization.scale.historicalMaturity,
      currentReach: civilization.scale.currentReach,
      currentReachCondition: civilization.scale.currentReachCondition,
      literalKardashevType: civilization.scale.literalKardashevType,
      literalKardashevEvidence: civilization.scale.literalKardashevEvidence,
    },
    stability: {
      band: civilization.stability.band,
      score: civilization.stability.score,
      calibrationId: civilization.stability.calibrationId,
      contributors: civilization.stability.contributors.map((contributor) => {
        const sourceIsPublic = isPublicBlueprintSource(
          contributor.source,
          publicBlueprintIds,
          redactScenarioProtocols,
        );
        return {
          direction: contributor.direction,
          magnitude: contributor.magnitude,
          label: sourceIsPublic
            ? scrubScenarioSummary(contributor.label, players)
            : contributor.direction === "support"
              ? "Sealed Project support"
              : "Sealed Project pressure",
          sourceType: contributor.source.sourceType,
          targetKind: contributor.target?.kind ?? null,
          appliedTurnCount: contributor.appliedTurnCount,
          resolvedTurnCount: contributor.resolvedTurnCount,
          historyEvidence: contributor.historyEvidence,
        };
      }),
      calculatedTurnCount: civilization.stability.calculatedTurnCount,
      historyEvidence: civilization.stability.historyEvidence,
    },
    activeConditions: Object.values(civilization.conditions)
      .filter((condition) => condition.resolvedTurnCount === null)
      .map((condition) => ({
        type: isPublicBlueprintSource(condition.source, publicBlueprintIds, redactScenarioProtocols)
          ? condition.type
          : condition.coreType ?? "scenario:sealed",
        coreType: condition.coreType,
        targetKind: condition.target.kind,
        sourceType: condition.source.sourceType,
        appliedTurnCount: condition.appliedTurnCount,
        historyEvidence: condition.historyEvidence,
      })),
    activeCapabilityIds: [...activeCapabilityIds],
    events: civilization.events.slice(-8).map((event, index) => {
      const sourceIsPublic = isPublicBlueprintSource(
        event.source,
        publicBlueprintIds,
        redactScenarioProtocols,
      );
      return {
        eventId: sourceIsPublic ? event.eventId : `sealed-event-${index + 1}`,
        sourceType: event.source.sourceType,
        turnCount: event.turnCount,
        form: event.form,
        pressureTags: [...event.pressureTags],
        outcome: event.outcome,
        summary: sourceIsPublic
          ? scrubScenarioSummary(event.summary, players)
          : "Sealed Project consequence resolved",
        historyEvidence: event.historyEvidence,
      };
    }),
  };
}

/**
 * Produce the state a specific player is allowed to receive.
 *
 * Planned actions and encrypted Artifact identities are private. Opponents
 * receive stable opaque placeholders so card-back transitions remain coherent,
 * while the owner retains the complete cards needed to inspect their reserve.
 */
export function filterStateForPlayer<T extends ProjectableState>(
  state: T,
  viewerPlayerId: string,
): T {
  const concealedArtifactIds = new Set<string>();
  const redactScenarioProtocols = state.scenarioId === LUMII_CLEARANCE_SCENARIO_ID;
  const scenarioProtocols: ScenarioProtocolPublicState[] = redactScenarioProtocols
    ? state.players.flatMap((player) => (player.manifestedBlueprintDevices ?? []).map((device) => ({
        protocolId: protocolIdForSlot(device.slotIndex),
        ownerPlayerId: device.ownerPlayerId,
        slotIndex: device.slotIndex,
        state: device.state as BlueprintDeviceState,
        publicEffect: BLUEPRINT_DEFINITIONS[device.blueprintId as BlueprintId]?.publicEffect
          ?? "A sealed protocol altered the board state.",
        ...(device.foundryUsesRemaining === undefined ? {} : { foundryUsesRemaining: device.foundryUsesRemaining }),
        ...(device.ascensionDeferrals === undefined ? {} : { ascensionDeferrals: device.ascensionDeferrals }),
        ...(device.foundryTier2Ready === undefined ? {} : { foundryTier2Ready: device.foundryTier2Ready }),
        ...(device.foundryTier3Ready === undefined ? {} : { foundryTier3Ready: device.foundryTier3Ready }),
      })))
    : state.scenarioProtocols ?? [];
  const pendingScenarioProtocolEvents: ScenarioProtocolEvent[] = redactScenarioProtocols
    ? [
        ...(state.pendingBlueprintManifestationEvents ?? []),
        ...(state.pendingBlueprintDetonationEvents ?? []),
      ].map((event) => projectScenarioProtocolEvent(state.players, event))
    : state.pendingScenarioProtocolEvents ?? [];

  const players = state.players.map((player) => {
    const {
      privateReservedArtifactIds = [],
      blueprintPrivateStates = [],
      blueprintPresentationVariants,
      manifestedBlueprintDevices = [],
      tideArchiveTopCards,
      civilization,
      ...publicPlayer
    } = player;
    const publicCivilization = civilization
      ? projectPublicCivilization(
          civilization,
          player.manifestedBlueprintDevices ?? [],
          state.players,
          redactScenarioProtocols,
        )
      : undefined;
    const revealedDevices = redactScenarioProtocols
      ? []
      : manifestedBlueprintDevices.map(revealBlueprintDefinition);
    const revealedPrivateStates = blueprintPrivateStates.map((privateState) =>
      revealBlueprintDefinition(privateState as { blueprintId: string }),
    );
    if (player.playerId === viewerPlayerId) {
      return {
        ...publicPlayer,
        ...(publicCivilization === undefined ? {} : { civilization: publicCivilization }),
        manifestedBlueprintDevices: revealedDevices,
        ...(redactScenarioProtocols ? {} : { blueprintPrivateStates: revealedPrivateStates }),
        ...(
          redactScenarioProtocols || blueprintPresentationVariants === undefined
            ? {}
            : { blueprintPresentationVariants }
        ),
        ...(tideArchiveTopCards === undefined ? {} : { tideArchiveTopCards }),
      };
    }

    const privateIds = new Set(privateReservedArtifactIds);

    for (const card of player.reservedArtifacts) {
      if (privateIds.has(card.id)) concealedArtifactIds.add(card.id);
    }

    return {
      ...publicPlayer,
      ...(publicCivilization === undefined ? {} : { civilization: publicCivilization }),
      manifestedBlueprintDevices: revealedDevices,
      plannedAction: null,
      plannedActionCancelReason: null,
      reservedArtifacts: player.reservedArtifacts.map((card) =>
        privateIds.has(card.id)
          ? concealArtifact(card, viewerPlayerId, player.playerId)
          : card,
      ),
      ...(redactScenarioProtocols ? { manifestedBlueprintDevices: [] } : {}),
    };
  });

  const artifactMarkers =
    state.artifactMarkers === undefined
      ? undefined
      : Object.fromEntries(
          Object.entries(state.artifactMarkers).filter(
            ([artifactId]) => !concealedArtifactIds.has(artifactId),
          ),
        );

  // Player spreads preserve all state-specific fields. The cast acknowledges
  // that concealed cards intentionally omit any future secret card extensions.
  return {
    ...state,
    players,
    ...(redactScenarioProtocols
      ? {
          actionLog: (state.actionLog ?? []).map((entry) => ({
            ...entry,
            summary: scrubScenarioSummary(entry.summary, state.players),
          })),
          pendingBlueprintManifestationEvents: [],
          pendingBlueprintDetonationEvents: [],
          scenarioProtocols,
          pendingScenarioProtocolEvents,
        }
      : {
          ...(state.pendingBlueprintManifestationEvents === undefined
            ? {}
            : {
                pendingBlueprintManifestationEvents:
                  state.pendingBlueprintManifestationEvents.map(revealBlueprintDefinition),
              }),
          ...(state.pendingBlueprintDetonationEvents === undefined
            ? {}
            : {
                pendingBlueprintDetonationEvents:
                  state.pendingBlueprintDetonationEvents.map(revealBlueprintDefinition),
              }),
        }),
    ...(artifactMarkers === undefined ? {} : { artifactMarkers }),
  } as T;
}
