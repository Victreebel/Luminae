interface Session {
  roomId: string;
  inviteCode: string;
  playerId: string;
  sessionToken: string;
  playerName: string;
  isHost: boolean;
  avatarId?: string;
  isTutorial?: boolean;
}

const SESSION_KEY = "luminae_session";

export function getSession(): Session | null {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch (_e) {
    return null;
  }
}

export function saveSession(session: Session): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}
