const BASE_URL = import.meta.env.BASE_URL ?? "/";

function apiUrl(path: string): string {
  const base = BASE_URL.replace(/\/$/, "");
  return `${base}/api${path}`;
}

const GLOBAL_KEY = "luminae_skip_cinematics";

function accountKey(accountId: string): string {
  return `luminae_skip_cinematics_${accountId}`;
}

export function getSkipCinematics(accountId?: string): boolean {
  try {
    if (accountId) {
      const val = localStorage.getItem(accountKey(accountId));
      if (val !== null) return val === "1";
    }
    const val = localStorage.getItem(GLOBAL_KEY);
    return val === "1";
  } catch {
    return false;
  }
}

function writeSkipLocal(value: boolean, accountId?: string): void {
  try {
    if (accountId) {
      localStorage.setItem(accountKey(accountId), value ? "1" : "0");
    }
    localStorage.setItem(GLOBAL_KEY, value ? "1" : "0");
  } catch {
    // ignore storage errors
  }
}

export function setSkipCinematics(value: boolean, accountId?: string, token?: string): void {
  writeSkipLocal(value, accountId);
  if (token) {
    void apiUpdatePreferences(token, { skipCinematics: value }).catch(() => undefined);
  }
}

export interface AccountPreferences {
  skipCinematics: boolean;
  abridgedAnims: boolean;
  hintsEnabled: boolean;
  muted: boolean;
}

export async function apiGetPreferences(token: string): Promise<AccountPreferences> {
  const res = await fetch(apiUrl("/auth/me/preferences"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch preferences");
  return res.json() as Promise<AccountPreferences>;
}

export async function apiUpdatePreferences(
  token: string,
  prefs: Partial<AccountPreferences>,
): Promise<void> {
  const res = await fetch(apiUrl("/auth/me/preferences"), {
    method: "PATCH",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(prefs),
  });
  if (!res.ok) throw new Error("Failed to update preferences");
}

export async function syncSkipCinematics(token: string, accountId: string): Promise<boolean> {
  const prefs = await apiGetPreferences(token);
  writeSkipLocal(prefs.skipCinematics, accountId);
  return prefs.skipCinematics;
}

export async function syncAccountPreferences(
  token: string,
  accountId: string,
): Promise<AccountPreferences> {
  const prefs = await apiGetPreferences(token);
  try {
    writeSkipLocal(prefs.skipCinematics, accountId);
    localStorage.setItem("luminae_abridged_anims", prefs.abridgedAnims ? "1" : "0");
    localStorage.setItem("luminae_hints_enabled", prefs.hintsEnabled ? "1" : "0");
    localStorage.setItem("luminae_muted", String(prefs.muted));
  } catch {
    // ignore storage errors
  }
  return prefs;
}
