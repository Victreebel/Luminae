import { createHmac, randomBytes } from "node:crypto";

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
  name: string;
  flavor: string;
  bonusesAtForge?: AffinityCounts;
};

type ProjectedPlayer = {
  playerId: string;
  plannedAction: unknown;
  plannedActionCancelReason: unknown;
  reservedArtifacts: ProjectedArtifact[];
  privateReservedArtifactIds?: string[];
};

type ProjectableState = {
  players: ProjectedPlayer[];
  artifactMarkers?: Record<string, unknown>;
  avatarSeedDeckSeeds?: string[];
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
    const { privateReservedArtifactIds = [], ...publicPlayer } = player;
    if (player.playerId === viewerPlayerId) return publicPlayer;

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

  const avatarSeedDeckSeeds = state.avatarSeedDeckSeeds?.map((artifactId) =>
    concealedArtifactId(viewerPlayerId, "archive-seed", artifactId),
  );

  // Player spreads preserve all state-specific fields. The cast acknowledges
  // that concealed cards intentionally omit any future secret card extensions.
  return {
    ...state,
    players,
    ...(artifactMarkers === undefined ? {} : { artifactMarkers }),
    ...(avatarSeedDeckSeeds === undefined ? {} : { avatarSeedDeckSeeds }),
  } as T;
}
