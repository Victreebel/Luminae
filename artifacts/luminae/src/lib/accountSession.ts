import type {
  BlueprintClearanceSummary,
  BlueprintChallengeSession,
  BlueprintChallengeWithdrawal,
  BlueprintDecryptionKeyUseResult,
  BlueprintId,
  BlueprintLoadout,
  BlueprintVaultState,
  BlueprintVaultThresholdResult,
  CampaignProgressProjection,
  CosmeticLoadoutItem,
  PlayerStats,
  EquippableStoreItemKind,
  StoreState,
  LumePackId,
  NativeLumePurchaseResult,
  NativeStoreProvider,
  LumiiThresholdDialogueChoiceId,
  LumiiThresholdApproach,
  RecurrenceChronicleSession,
  TraceChronicleSession,
  TriangulationChronicleSession,
} from "@workspace/game-types";
import { apiUrl } from "@/lib/network";

export type {
  AccountArchiveArtifact,
  AccountArchiveChronicle,
  AccountArchiveLuminary,
  AccountArchiveSummary,
  BlueprintChallengeSession,
  BlueprintVaultState,
  GameHistoryEntry,
  PlayerStats,
  StoreItem,
  EquippableStoreItemKind,
  StoreItemKind,
  StoreState,
} from "@workspace/game-types";

export interface AccountInfo {
  id: string;
  username: string;
  email?: string | null;
  createdAt?: string;
  clearance?: BlueprintClearanceSummary;
  cosmeticLoadout?: CosmeticLoadoutItem[];
}

export interface AccountSession {
  account: AccountInfo;
  token: string;
  expiresAt: string;
}

const ACCOUNT_SESSION_KEY = "luminae_account_session";

export function getAccountSession(): AccountSession | null {
  try {
    const data = localStorage.getItem(ACCOUNT_SESSION_KEY);
    if (!data) return null;
    const session: AccountSession = JSON.parse(data);
    if (new Date(session.expiresAt) <= new Date()) {
      localStorage.removeItem(ACCOUNT_SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveAccountSession(session: AccountSession): void {
  localStorage.setItem(ACCOUNT_SESSION_KEY, JSON.stringify(session));
}

export function clearAccountSession(): void {
  localStorage.removeItem(ACCOUNT_SESSION_KEY);
}

export function getAccountToken(): string | null {
  return getAccountSession()?.token ?? null;
}

export async function apiRegister(data: {
  username: string;
  password: string;
  email?: string;
}): Promise<AccountSession> {
  const res = await fetch(apiUrl("/auth/register"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Registration failed" }));
    throw new Error(err.error ?? "Registration failed");
  }
  return res.json();
}

export async function apiLogin(data: {
  username: string;
  password: string;
}): Promise<AccountSession> {
  const res = await fetch(apiUrl("/auth/login"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Login failed" }));
    throw new Error(err.error ?? "Login failed");
  }
  return res.json();
}

export async function apiLogout(token: string): Promise<void> {
  await fetch(apiUrl("/auth/logout"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function apiSetPlayerBlocked(input: {
  token: string;
  roomId: string;
  playerId: string;
  blocked: boolean;
}): Promise<void> {
  const res = await fetch(apiUrl("/moderation/block"), {
    method: "POST",
    headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not update block");
}

export async function apiReportPlayer(input: {
  token: string;
  roomId: string;
  playerId: string;
  evidenceText?: string;
  evidenceTimestamp?: string;
  category?: "harassment" | "hate" | "threat" | "privacy" | "spam" | "other";
}): Promise<void> {
  const res = await fetch(apiUrl("/moderation/report"), {
    method: "POST",
    headers: { Authorization: `Bearer ${input.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, category: input.category ?? "other" }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not submit report");
}

export async function apiRequestAccountDeletion(token: string, password: string): Promise<{ executeAfter: string }> {
  const res = await fetch(apiUrl("/auth/me"), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Could not schedule account deletion");
  return res.json();
}

export interface AccountMe extends AccountInfo {
  clearance: BlueprintClearanceSummary;
  cosmeticLoadout: CosmeticLoadoutItem[];
  activeRooms: Array<{
    roomId: string;
    inviteCode: string;
    status: string;
    sessionToken: string;
    playerId: string;
    isHost: boolean;
    gameMode: string;
    scenarioId: string | null;
  }>;
}

export async function apiGetMe(token: string): Promise<AccountMe> {
  const res = await fetch(apiUrl("/auth/me"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to refresh account");
  return res.json();
}

export async function apiForgotPassword(email: string): Promise<void> {
  const res = await fetch(apiUrl("/auth/forgot-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
}

export async function apiResetPassword(data: {
  token: string;
  newPassword: string;
}): Promise<void> {
  const res = await fetch(apiUrl("/auth/reset-password"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Reset failed" }));
    throw new Error(err.error ?? "Reset failed");
  }
}

export async function apiGetMyGames(token: string): Promise<ActiveGame[]> {
  const res = await fetch(apiUrl("/auth/me/games"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch games");
  const data = await res.json();
  return data.games;
}

export async function apiListFriends(token: string): Promise<Friend[]> {
  const res = await fetch(apiUrl("/friends"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch friends");
  const data = await res.json();
  return data.friends;
}

export async function apiListFriendRequests(token: string): Promise<FriendRequest[]> {
  const res = await fetch(apiUrl("/friends/requests"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch friend requests");
  const data = await res.json();
  return data.requests;
}

export async function apiSendFriendRequest(token: string, username: string): Promise<void> {
  const res = await fetch(apiUrl("/friends/requests"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ username }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to send request" }));
    throw new Error(err.error ?? "Failed to send request");
  }
}

export async function apiRespondFriendRequest(
  token: string,
  requestId: string,
  action: "accept" | "decline",
): Promise<void> {
  const res = await fetch(apiUrl(`/friends/requests/${requestId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) throw new Error("Failed to respond to friend request");
}

export async function apiRemoveFriend(token: string, friendshipId: string): Promise<void> {
  const res = await fetch(apiUrl(`/friends/${friendshipId}`), {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to remove friend");
}

export async function apiListChallenges(token: string): Promise<Challenge[]> {
  const res = await fetch(apiUrl("/challenges"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch challenges");
  const data = await res.json();
  return data.challenges;
}

export async function apiCreateChallenge(
  token: string,
  data: { challengedUsername: string; maxPlayers?: number; victoryRequirement?: 15 | 20 | 25; cinematicMode?: "standard" | "epic"; turnTimerSeconds?: number | null },
): Promise<ChallengeCreated> {
  const res = await fetch(apiUrl("/challenges"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to create challenge" }));
    throw new Error(err.error ?? "Failed to create challenge");
  }
  return res.json();
}

export async function apiRespondChallenge(
  token: string,
  challengeId: string,
  action: "accept" | "decline",
): Promise<ChallengeAccepted | { ok: boolean; resolution: string }> {
  const res = await fetch(apiUrl(`/challenges/${challengeId}`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to respond to challenge" }));
    throw new Error(err.error ?? "Failed to respond to challenge");
  }
  return res.json();
}

export async function apiGetMyStats(token: string): Promise<PlayerStats> {
  const res = await fetch(apiUrl("/auth/me/stats"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json();
}

export interface TestPurchaseResult {
  ok: boolean;
  itemId: string;
  alreadyOwned: boolean;
  receiptId: string;
}

export interface DailyClaimResult {
  ok: boolean;
  alreadyClaimed: boolean;
  rewardAmount: number;
  lumeBalance: number;
  dailyClaimStreak: number;
  lastDailyClaimDate: string | null;
}

export interface LumeUnlockResult extends TestPurchaseResult {
  lumeBalance: number;
}

export async function apiVerifyNativeLumePurchase(
  token: string,
  input: {
    provider: NativeStoreProvider;
    packId: LumePackId;
    productId: string;
    purchaseToken: string;
  },
): Promise<NativeLumePurchaseResult> {
  const res = await fetch(apiUrl("/store/lume/purchases/verify"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Purchase verification failed" }));
    throw new Error(err.error ?? "Purchase verification failed");
  }
  return res.json();
}

export interface EquipCosmeticResult {
  ok: boolean;
  equippedItemIds: Record<EquippableStoreItemKind, string | null>;
  equippedItems: CosmeticLoadoutItem[];
}

export async function apiGetStore(token: string): Promise<StoreState> {
  const res = await fetch(apiUrl("/store"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load the store");
  return res.json();
}

export async function apiTestPurchase(token: string, itemId: string): Promise<TestPurchaseResult> {
  const res = await fetch(apiUrl("/store/purchases/test"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ itemId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Purchase failed" }));
    throw new Error(err.error ?? "Purchase failed");
  }
  return res.json();
}

export async function apiUnlockWithLume(token: string, itemId: string): Promise<LumeUnlockResult> {
  const res = await fetch(apiUrl("/store/unlocks/lume"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ itemId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unlock failed" }));
    throw new Error(err.error ?? "Unlock failed");
  }
  return res.json();
}

export async function apiEquipCosmetic(
  token: string,
  slot: EquippableStoreItemKind,
  itemId: string | null,
  scopeKey = "global",
): Promise<EquipCosmeticResult> {
  const res = await fetch(apiUrl("/store/equip"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ slot, scopeKey, itemId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Loadout update failed" }));
    throw new Error(err.error ?? "Loadout update failed");
  }
  return res.json();
}

export async function apiGetBlueprintVault(token: string): Promise<BlueprintVaultState> {
  const res = await fetch(apiUrl("/blueprints/vault"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to read the Vault");
  return res.json();
}

export async function apiGetChronicleProgress(
  token: string,
): Promise<CampaignProgressProjection> {
  const res = await fetch(apiUrl("/chronicles/progress"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Chronicle record unavailable");
  return res.json();
}

export async function apiStartTraceChronicle(
  token: string,
): Promise<TraceChronicleSession> {
  const res = await fetch(apiUrl("/chronicles/trace/start"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "The Trace is unavailable" }));
    throw new Error(error.error ?? "The Trace is unavailable");
  }
  return res.json();
}

export async function apiStartRecurrenceChronicle(
  token: string,
): Promise<RecurrenceChronicleSession> {
  const res = await fetch(apiUrl("/chronicles/recurrence/start"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "The Recurrence is unavailable" }));
    throw new Error(error.error ?? "The Recurrence is unavailable");
  }
  return res.json();
}

export async function apiStartTriangulationChronicle(
  token: string,
): Promise<TriangulationChronicleSession> {
  const res = await fetch(apiUrl("/chronicles/triangulation/start"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "The Triangulation is unavailable" }));
    throw new Error(error.error ?? "The Triangulation is unavailable");
  }
  return res.json();
}

export async function apiUseBlueprintDecryptionKey(
  token: string,
): Promise<BlueprintDecryptionKeyUseResult> {
  const res = await fetch(apiUrl("/blueprints/vault/decryption-key"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "The key could not be used" }));
    throw new Error(err.error ?? "The key could not be used");
  }
  return res.json();
}

export async function apiStartBlueprintChallenge(
  token: string,
): Promise<BlueprintChallengeSession> {
  const res = await fetch(apiUrl("/blueprints/clearance-challenge"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Challenge unavailable" }));
    throw new Error(error.error ?? "Challenge unavailable");
  }
  return res.json();
}

export async function apiUpdateBlueprintVaultThreshold(
  token: string,
  action:
    | { action: "deactivate_cipher" }
    | { action: "choose_approach"; approach: LumiiThresholdApproach }
    | { action: "record_dialogue_path"; path: LumiiThresholdDialogueChoiceId[] }
    | { action: "resolve_dialogue"; resolution: "left" },
): Promise<BlueprintVaultThresholdResult> {
  const res = await fetch(apiUrl("/blueprints/vault/threshold"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(action),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Threshold update unavailable" }));
    throw new Error(error.error ?? "Threshold update unavailable");
  }
  return res.json();
}

export async function apiWithdrawBlueprintChallenge(
  token: string,
  roomId: string,
): Promise<BlueprintChallengeWithdrawal> {
  const res = await fetch(apiUrl("/blueprints/clearance-challenge/withdraw"), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ roomId }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Withdrawal unavailable" }));
    throw new Error(error.error ?? "Withdrawal unavailable");
  }
  return res.json();
}

export async function apiAcknowledgeBlueprintVaultReveal(token: string): Promise<void> {
  const res = await fetch(apiUrl("/blueprints/vault/reveal-ack"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Reveal acknowledgement failed" }));
    throw new Error(error.error ?? "Reveal acknowledgement failed");
  }
}

export async function apiUpdateBlueprintLoadout(
  token: string,
  mode: Exclude<BlueprintLoadout["mode"], "standard">,
  slots: Array<BlueprintId | null>,
): Promise<BlueprintLoadout> {
  const res = await fetch(apiUrl(`/blueprints/loadouts/${mode}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ slots }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Loadout update failed" }));
    throw new Error(error.error ?? "Loadout update failed");
  }
  return res.json();
}

export async function apiClaimDailyReward(token: string): Promise<DailyClaimResult> {
  const res = await fetch(apiUrl("/store/engagement/daily-claim"), {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Reward claim failed" }));
    throw new Error(err.error ?? "Reward claim failed");
  }
  return res.json();
}

export async function apiInviteFriendToRoom(
  token: string,
  roomId: string,
  sessionToken: string,
  friendUsername: string,
): Promise<{ ok: boolean; challengeId: string }> {
  const res = await fetch(apiUrl(`/rooms/${roomId}/invite-friend`), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionToken, friendUsername }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to invite friend" }));
    throw new Error(err.error ?? "Failed to invite friend");
  }
  return res.json();
}

export interface LobbyRoomSettingsUpdate {
  sessionToken: string;
  gameMode?: "standard" | "custom";
  blueprintPolicy?: "none" | "owned";
}

export async function apiUpdateRoomSettings(
  roomId: string,
  data: LobbyRoomSettingsUpdate,
): Promise<{
  id: string;
  inviteCode: string;
  status: string;
  maxPlayers: number;
  victoryRequirement: number;
  cinematicMode: string;
  turnTimerSeconds: number | null;
  gameMode: string;
  scenarioId: string | null;
  blueprintPolicy: string;
}> {
  const res = await fetch(apiUrl(`/rooms/${roomId}/settings`), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Could not update room settings" }));
    throw new Error(err.error ?? "Could not update room settings");
  }
  return res.json();
}

export async function apiQuitRoom(token: string, roomId: string, sessionToken: string): Promise<void> {
  const res = await fetch(apiUrl(`/rooms/${roomId}/quit`), {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ sessionToken }),
  });
  if (!res.ok) throw new Error("Failed to quit room");
}

export interface ActiveGame {
  roomId: string;
  inviteCode: string;
  status: string;
  maxPlayers: number;
  currentPlayers: number;
  humanPlayers: { name: string; avatarId: string | null }[];
  updatedAt: string;
  sessionToken: string;
  playerId: string;
  isHost: boolean;
  playerName: string;
  avatarId?: string | null;
}

export interface Friend {
  friendshipId: string;
  accountId: string;
  username: string;
  isOnline: boolean;
}

export interface FriendRequest {
  id: string;
  from: { accountId: string; username: string };
  createdAt: string;
}

export interface Challenge {
  id: string;
  challengerUsername: string;
  challengerAccountId: string;
  roomId: string;
  inviteCode: string;
  expiresAt: string;
}

interface ChallengeCreated {
  id: string;
  roomId: string;
  inviteCode: string;
  challengedUsername: string;
  expiresAt: string;
  sessionToken: string;
  playerId: string;
}

export interface ChallengeAccepted {
  ok: boolean;
  resolution: string;
  room: {
    id: string;
    inviteCode: string;
    status: string;
    maxPlayers: number;
    victoryRequirement: number;
    cinematicMode?: "standard" | "epic";
    turnTimerSeconds: number | null;
  };
  player: { id: string; name: string; isHost: boolean; avatarId?: string | null };
  sessionToken: string;
}
