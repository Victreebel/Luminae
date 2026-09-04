import { apiUrl } from "@/lib/network";
import {
  getLocalFirstContactStance,
  syncLocalFirstContactStance,
} from "@/lib/firstContactMemory";
import {
  isArchitectFirstContactStance,
  type ArchitectFirstContactStance,
} from "@workspace/game-types";

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
  hintsSeen: string[];
  tutorialSeen: boolean;
  tutorialCompleted: boolean;
  firstContactStance: ArchitectFirstContactStance | null;
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

export function getAbridgedAnims(): boolean {
  try {
    return localStorage.getItem("luminae_abridged_anims") === "1";
  } catch {
    return false;
  }
}

export function setAbridgedAnims(value: boolean, token?: string): void {
  try {
    localStorage.setItem("luminae_abridged_anims", value ? "1" : "0");
  } catch {
    // ignore storage errors
  }
  if (token) {
    void apiUpdatePreferences(token, { abridgedAnims: value }).catch(() => undefined);
  }
}

export function getHintsEnabled(): boolean {
  try {
    return localStorage.getItem("luminae_hints_enabled") !== "0";
  } catch {
    return true;
  }
}

export function setHintsEnabled(value: boolean, token?: string): void {
  try {
    localStorage.setItem("luminae_hints_enabled", value ? "1" : "0");
  } catch {
    // ignore storage errors
  }
  if (token) {
    void apiUpdatePreferences(token, { hintsEnabled: value }).catch(() => undefined);
  }
}

export function getMuted(): boolean {
  try {
    return localStorage.getItem("luminae_muted") === "true";
  } catch {
    return false;
  }
}

export function setMuted(value: boolean, token?: string): void {
  try {
    localStorage.setItem("luminae_muted", String(value));
  } catch {
    // ignore storage errors
  }
  if (token) {
    void apiUpdatePreferences(token, { muted: value }).catch(() => undefined);
  }
}

// ── Hint-seen sync ────────────────────────────────────────────────────────────

/**
 * All known dismissible hint keys. Any key listed here will be included in
 * the server-side hintsSeen array and restored to localStorage on login.
 */
export const HINT_KEYS = [
  "luminae_swipe_hint_seen",
  "luminae_undo_hint_seen",
  "luminae_reserve_hint_seen",
  "luminae_deck_reserve_hint_seen",
  "luminae_forge_hint_seen",
  "luminae_civilization_portrait_hint_seen",
  "luminae_civilization_scan_hint_seen",
] as const;

export type HintKey = (typeof HINT_KEYS)[number];

/** Module-level token set by AccountContext so hint helpers can sync without prop drilling. */
let _prefsToken: string | null = null;

export function setPreferencesSyncToken(token: string | null): void {
  _prefsToken = token;
}

/** Returns the subset of HINT_KEYS currently marked as seen in localStorage. */
function localSeenKeys(): string[] {
  try {
    return HINT_KEYS.filter((k) => localStorage.getItem(k) === "1");
  } catch {
    return [];
  }
}

/**
 * Mark a hint key as seen in localStorage and push the full seen-set to the
 * server (if a sync token is available).
 */
export function markHintSeen(key: string): void {
  try {
    localStorage.setItem(key, "1");
  } catch {
    // ignore storage errors
  }
  if (_prefsToken) {
    const seen = localSeenKeys();
    void apiUpdatePreferences(_prefsToken, { hintsSeen: seen }).catch(() => undefined);
  }
}

/**
 * Clear all known hint-seen flags from localStorage and push the empty array
 * to the server (if a token is provided). Also resets tutorial state locally
 * and server-side.
 */
export function clearHintsSeen(token?: string): void {
  try {
    HINT_KEYS.forEach((k) => localStorage.removeItem(k));
    localStorage.removeItem("luminae_tutorial_seen");
    localStorage.removeItem("luminae_tutorial_completed");
    localStorage.removeItem("luminae_tutorial_progress");
    localStorage.removeItem("luminae_tutorial_progress_id");
    localStorage.removeItem("luminae_tutorial_progress_ver");
    localStorage.removeItem("luminae_intro_seen_beat");
  } catch {
    // ignore storage errors
  }
  const tok = token ?? _prefsToken;
  if (tok) {
    void apiUpdatePreferences(tok, { hintsSeen: [], tutorialSeen: false, tutorialCompleted: false }).catch(() => undefined);
  }
}

export async function syncAccountPreferences(
  token: string,
  accountId: string,
): Promise<AccountPreferences> {
  const prefs = await apiGetPreferences(token);
  const serverStance = isArchitectFirstContactStance(prefs.firstContactStance)
    ? prefs.firstContactStance
    : null;
  const localStance = getLocalFirstContactStance();
  const firstContactStance = serverStance ?? localStance;
  if (!serverStance && localStance) {
    await apiUpdatePreferences(token, { firstContactStance: localStance }).catch(() => undefined);
  }
  try {
    writeSkipLocal(prefs.skipCinematics, accountId);
    localStorage.setItem("luminae_abridged_anims", prefs.abridgedAnims ? "1" : "0");
    localStorage.setItem("luminae_hints_enabled", prefs.hintsEnabled ? "1" : "0");
    localStorage.setItem("luminae_muted", String(prefs.muted));
    // Restore each hint key that the server reports as seen
    const seen = prefs.hintsSeen ?? [];
    for (const key of seen) {
      localStorage.setItem(key, "1");
    }
    // Restore tutorial flags — server is authoritative (remove local flags when server says false)
    if (prefs.tutorialSeen) {
      localStorage.setItem("luminae_tutorial_seen", "1");
    } else {
      localStorage.removeItem("luminae_tutorial_seen");
    }
    if (prefs.tutorialCompleted) {
      localStorage.setItem("luminae_tutorial_completed", "1");
    } else {
      localStorage.removeItem("luminae_tutorial_completed");
    }
    if (firstContactStance) syncLocalFirstContactStance(firstContactStance);
  } catch {
    // ignore storage errors
  }
  return { ...prefs, firstContactStance };
}
