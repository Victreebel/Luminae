export interface AccountInfo {
  id: string;
  username: string;
  email?: string | null;
  createdAt?: string;
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

const BASE_URL = import.meta.env.BASE_URL ?? "/";

function apiUrl(path: string): string {
  const base = BASE_URL.replace(/\/$/, "");
  return `${base}/api${path}`;
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
  data: { challengedUsername: string; maxPlayers?: number; turnTimerSeconds?: number | null },
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

export interface GameHistoryEntry {
  roomId: string;
  inviteCode: string;
  finishedAt: string;
  result: "win" | "loss" | "tie";
  eminenceEarned: number;
  totalPlayers: number;
}

export interface PlayerStats {
  gamesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  avgEminence: number;
  recentGames: GameHistoryEntry[];
}

export async function apiGetMyStats(token: string): Promise<PlayerStats> {
  const res = await fetch(apiUrl("/auth/me/stats"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch stats");
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
    turnTimerSeconds: number | null;
  };
  player: { id: string; name: string; isHost: boolean };
  sessionToken: string;
}
