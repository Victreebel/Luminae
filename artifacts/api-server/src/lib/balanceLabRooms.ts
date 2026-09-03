import { randomBytes, randomUUID } from "crypto";
import {
  getBalanceRulesetCandidate,
  setBalanceRuleset,
  type AiDifficulty,
  type BalanceRuleset,
  type GameStateData,
} from "./gameEngine";

/**
 * Developer balance-room configuration deliberately lives in process memory.
 * It is never written to the room or account schemas, and disappears whenever
 * the API server restarts.
 */
const balanceRoomCandidates = new Map<string, string>();

export interface BalanceLabMemoryPlayer {
  id: string;
  roomId: string;
  accountId: null;
  name: string;
  sessionToken: string;
  isHost: boolean;
  orderIndex: number;
  isConnected: boolean;
  isAi: boolean;
  aiDifficulty: AiDifficulty | null;
  avatarId: string | null;
}

export interface BalanceLabMemoryRoom {
  id: string;
  inviteCode: string;
  status: "lobby" | "playing" | "finished";
  maxPlayers: number;
  victoryRequirement: number;
  cinematicMode: "standard" | "epic";
  turnTimerSeconds: null;
  gameMode: "standard";
  scenarioId: null;
  blueprintPolicy: "none";
  hostPlayerId: string;
  candidateId: string;
  players: BalanceLabMemoryPlayer[];
  gameState?: GameStateData;
}

const balanceMemoryRooms = new Map<string, BalanceLabMemoryRoom>();

function assertDevelopmentBalanceLab(): void {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Balance laboratory rooms are available only in development");
  }
}

export function createBalanceLabMemoryRoom(input: {
  hostName: string;
  maxPlayers: number;
  victoryRequirement: number;
  cinematicMode: "standard" | "epic";
  avatarId: string | null;
  candidateId: string;
}): { room: BalanceLabMemoryRoom; player: BalanceLabMemoryPlayer; sessionToken: string } {
  assertDevelopmentBalanceLab();
  const ruleset = getBalanceRulesetCandidate(input.candidateId);
  if (!ruleset) throw new Error(`Unknown balance candidate: ${input.candidateId}`);

  const roomId = randomUUID();
  const playerId = randomUUID();
  const sessionToken = randomBytes(32).toString("hex");
  const player: BalanceLabMemoryPlayer = {
    id: playerId,
    roomId,
    accountId: null,
    name: input.hostName,
    sessionToken,
    isHost: true,
    orderIndex: 0,
    isConnected: false,
    isAi: false,
    aiDifficulty: null,
    avatarId: input.avatarId,
  };
  const room: BalanceLabMemoryRoom = {
    id: roomId,
    inviteCode: randomBytes(5).toString("hex").toUpperCase(),
    status: "lobby",
    maxPlayers: input.maxPlayers,
    victoryRequirement: input.victoryRequirement,
    cinematicMode: input.cinematicMode,
    turnTimerSeconds: null,
    gameMode: "standard",
    scenarioId: null,
    blueprintPolicy: "none",
    hostPlayerId: playerId,
    candidateId: ruleset.id,
    players: [player],
  };
  balanceMemoryRooms.set(roomId, room);
  balanceRoomCandidates.set(roomId, ruleset.id);
  return { room, player, sessionToken };
}

export function getBalanceLabMemoryRoom(roomId: string): BalanceLabMemoryRoom | null {
  return balanceMemoryRooms.get(roomId) ?? null;
}

export function getBalanceLabMemoryRoomByInvite(inviteCode: string): BalanceLabMemoryRoom | null {
  const normalized = inviteCode.toUpperCase();
  return [...balanceMemoryRooms.values()].find(
    (room) => room.inviteCode === normalized,
  ) ?? null;
}

export function getBalanceLabMemoryPlayerBySession(
  roomId: string,
  sessionToken: string,
): BalanceLabMemoryPlayer | null {
  return balanceMemoryRooms.get(roomId)?.players.find(
    (player) => player.sessionToken === sessionToken,
  ) ?? null;
}

export function getBalanceLabMemoryPlayer(
  roomId: string,
  playerId: string,
): BalanceLabMemoryPlayer | null {
  return balanceMemoryRooms.get(roomId)?.players.find(
    (player) => player.id === playerId,
  ) ?? null;
}

export function addBalanceLabMemoryAiPlayer(
  roomId: string,
  input: { name: string; avatarId: string; difficulty: AiDifficulty },
): BalanceLabMemoryPlayer {
  assertDevelopmentBalanceLab();
  const room = balanceMemoryRooms.get(roomId);
  if (!room) throw new Error("Balance room not found");
  if (room.status !== "lobby") throw new Error("Game already started");
  if (room.players.length >= room.maxPlayers) throw new Error("Room is full");
  const player: BalanceLabMemoryPlayer = {
    id: randomUUID(),
    roomId,
    accountId: null,
    name: input.name,
    sessionToken: `ai-${randomBytes(16).toString("hex")}`,
    isHost: false,
    orderIndex: room.players.length,
    isConnected: true,
    isAi: true,
    aiDifficulty: input.difficulty,
    avatarId: input.avatarId,
  };
  room.players.push(player);
  return player;
}

export function setBalanceLabMemoryPlayerConnected(
  roomId: string,
  playerId: string,
  isConnected: boolean,
): void {
  const player = getBalanceLabMemoryPlayer(roomId, playerId);
  if (player) player.isConnected = isConnected;
}

export function getBalanceLabMemoryStateSnapshot(roomId: string): GameStateData | null {
  const state = balanceMemoryRooms.get(roomId)?.gameState;
  return state ? structuredClone(state) : null;
}

export function saveBalanceLabMemoryState(
  roomId: string,
  state: GameStateData,
  expectedVersion?: number,
): boolean {
  const room = balanceMemoryRooms.get(roomId);
  if (!room) return false;
  if (expectedVersion !== undefined && room.gameState?.version !== expectedVersion) return false;
  room.gameState = structuredClone(state);
  if (state.phase === "finished") room.status = "finished";
  return true;
}

export function startBalanceLabMemoryRoom(roomId: string, state: GameStateData): boolean {
  const room = balanceMemoryRooms.get(roomId);
  if (!room || room.status !== "lobby") return false;
  room.status = "playing";
  room.gameState = structuredClone(state);
  return true;
}

export function finishBalanceLabMemoryRoom(roomId: string, state: GameStateData): boolean {
  const room = balanceMemoryRooms.get(roomId);
  if (!room) return false;
  room.status = "finished";
  room.gameState = structuredClone(state);
  return true;
}

export class BalanceLabConfigurationUnavailableError extends Error {
  constructor(roomId: string, candidateId: string) {
    super(
      `Balance laboratory candidate ${candidateId} for room ${roomId} is unavailable after the server restart; launch a new laboratory room`,
    );
    this.name = "BalanceLabConfigurationUnavailableError";
  }
}

export function configureBalanceLabRoom(roomId: string, candidateId: string): BalanceRuleset {
  assertDevelopmentBalanceLab();
  const ruleset = getBalanceRulesetCandidate(candidateId);
  if (!ruleset) throw new Error(`Unknown balance candidate: ${candidateId}`);
  balanceRoomCandidates.set(roomId, ruleset.id);
  const memoryRoom = balanceMemoryRooms.get(roomId);
  if (memoryRoom) memoryRoom.candidateId = ruleset.id;
  return { ...ruleset };
}

export function getBalanceLabRoomCandidate(roomId: string): string | null {
  return balanceRoomCandidates.get(roomId) ?? null;
}

/** Durable writers use this process-local marker as a second isolation guard. */
export function isBalanceLabRoom(roomId: string): boolean {
  return balanceRoomCandidates.has(roomId);
}

export function getBalanceLabRoomRuleset(roomId: string): BalanceRuleset | null {
  const candidateId = getBalanceLabRoomCandidate(roomId);
  if (!candidateId) return null;
  const ruleset = getBalanceRulesetCandidate(candidateId);
  return ruleset ? { ...ruleset } : null;
}

export function applyBalanceLabRoomRuleset(roomId: string, state: GameStateData): BalanceRuleset | null {
  const ruleset = getBalanceLabRoomRuleset(roomId);
  if (!ruleset) {
    const serializedCandidateId = state.experimentalBalanceState?.rulesetId;
    if (
      serializedCandidateId &&
      serializedCandidateId !== "control" &&
      getBalanceRulesetCandidate(serializedCandidateId)
    ) {
      throw new BalanceLabConfigurationUnavailableError(roomId, serializedCandidateId);
    }
    return null;
  }
  setBalanceRuleset(state, ruleset);
  return ruleset;
}

export function clearBalanceLabRoom(roomId: string): void {
  balanceRoomCandidates.delete(roomId);
  balanceMemoryRooms.delete(roomId);
}
