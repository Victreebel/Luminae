import { createHmac, randomBytes } from "node:crypto";
import {
  type BlueprintArtifactSnapshot,
  type ScenarioProtocolEvent,
  type ScenarioProtocolPublicState,
} from "@workspace/game-types";

type ProjectedProject = {
  blueprintId: string;
  ownerPlayerId: string;
  slotIndex: number;
  state: string;
  covenantState?: "intact" | "broken";
  presentationVariant: string;
  foundryUses?: number;
  foundryOverdriveAvailable?: boolean;
  foundryRecoveredComponentCount?: number;
  ascensionDeferral?: number;
  ascensionLastCounterRound?: number | null;
  foundryTier2Ready?: boolean;
  foundryTier3Ready?: boolean;
};

type ProjectedManifestationEvent = {
  eventId: string;
  blueprintId: string;
  ownerPlayerId: string;
  slotIndex: number;
  presentationVariant?: string;
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
  presentationVariant?: string;
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
  manifestedBlueprintProjects?: ProjectedProject[];
  /** @deprecated Compatibility alias. */
  manifestedBlueprintDevices?: ProjectedProject[];
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

const concealmentKey = randomBytes(32);
const EMPTY_COST: AffinityCounts = {
  flare: 0,
  continuum: 0,
  verdance: 0,
  abyss: 0,
  radiance: 0,
  singularity: 0,
};

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

  const players = state.players.map((player) => {
    const {
      privateReservedArtifactIds = [],
      blueprintPrivateStates = [],
      blueprintPresentationVariants,
      tideArchiveTopCards,
      ...publicPlayer
    } = player;
    if (player.playerId === viewerPlayerId) {
      return {
        ...publicPlayer,
        blueprintPrivateStates,
        ...(
          blueprintPresentationVariants === undefined
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
      plannedAction: null,
      plannedActionCancelReason: null,
      reservedArtifacts: player.reservedArtifacts.map((card) =>
        privateIds.has(card.id)
          ? concealArtifact(card, viewerPlayerId, player.playerId)
          : card,
      ),
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
    ...(artifactMarkers === undefined ? {} : { artifactMarkers }),
  } as T;
}
