import { apiUpdatePreferences } from "./cinematicPrefs";
import { apiClaimArchitectRecordOnboarding } from "./accountSession";
import { resolveTutorialBeatIndex } from "./tutorialData";
import type { FirstContactStance } from "@workspace/game-types";

// Module-level token set by AccountContext alongside setPreferencesSyncToken.
let _token: string | null = null;
export function setTutorialToken(token: string | null): void {
  _token = token;
}

const PROGRESS_KEY = "luminae_tutorial_progress";
const PROGRESS_ID_KEY = "luminae_tutorial_progress_id";
const PROGRESS_VERSION_KEY = "luminae_tutorial_progress_ver";
const STATE_KEY = "luminae_tutorial_state";
const SEEN_KEY = "luminae_tutorial_seen";
const COMPLETED_KEY = "luminae_tutorial_completed";
const INTRO_SEEN_KEY = "luminae_intro_seen_beat";
const STANCE_KEY = "luminae_first_contact_stance";
export const TUTORIAL_CLAIM_KEY = "luminae_tutorial_completion_claim";

interface PendingTutorialClaim {
  claimId: string;
  stance: FirstContactStance | null;
}

// Increment this whenever beat ordering or IDs change so that stale saved
// progress (which may point at the wrong beat) is silently discarded.
const TUTORIAL_SEQUENCE_VERSION = 10;
const MIGRATABLE_SEQUENCE_VERSIONS = new Set([5, 6, 7, 8, 9, TUTORIAL_SEQUENCE_VERSION]);

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
  }
  if (_token) {
    void apiUpdatePreferences(_token, { tutorialSeen: true }).catch(() => undefined);
  }
}

export function hasTutorialSeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveTutorialProgress(beat: number): void {
  try {
    localStorage.setItem(PROGRESS_KEY, String(beat));
    localStorage.setItem(PROGRESS_VERSION_KEY, String(TUTORIAL_SEQUENCE_VERSION));
  } catch {
  }
}

export function loadTutorialProgress(): number | null {
  try {
    const ver = localStorage.getItem(PROGRESS_VERSION_KEY);
    const version = ver === null ? null : parseInt(ver, 10);
    if (version === null || !MIGRATABLE_SEQUENCE_VERSIONS.has(version)) {
      clearTutorialProgress();
      return null;
    }
    if (version !== TUTORIAL_SEQUENCE_VERSION) {
      const migratedBeat = resolveTutorialBeatIndex(localStorage.getItem(PROGRESS_ID_KEY));
      if (migratedBeat === null) {
        clearTutorialProgress();
        return null;
      }
      localStorage.setItem(PROGRESS_KEY, String(migratedBeat));
      localStorage.setItem(PROGRESS_VERSION_KEY, String(TUTORIAL_SEQUENCE_VERSION));
      localStorage.removeItem(STATE_KEY);
      return migratedBeat;
    }
    const v = localStorage.getItem(PROGRESS_KEY);
    if (v === null) return null;
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

export function saveTutorialProgressId(id: string): void {
  try {
    localStorage.setItem(PROGRESS_ID_KEY, id);
  } catch {
  }
}

/** Saves the guided game's actual board state, not only its chapter number. */
export function saveTutorialState(state: unknown): void {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
  }
}

export function loadTutorialState<T>(): T | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return parsed && typeof parsed === "object" ? parsed as T : null;
  } catch {
    return null;
  }
}

export function loadTutorialProgressId(): string | null {
  try {
    return localStorage.getItem(PROGRESS_ID_KEY);
  } catch {
    return null;
  }
}

export function clearTutorialProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY);
    localStorage.removeItem(PROGRESS_ID_KEY);
    localStorage.removeItem(PROGRESS_VERSION_KEY);
    localStorage.removeItem(STATE_KEY);
  } catch {
  }
}

export function markTutorialComplete(
  stance: FirstContactStance | null,
  claimId: string,
): void {
  try {
    localStorage.setItem(COMPLETED_KEY, "1");
    localStorage.setItem(SEEN_KEY, "1");
    if (stance) localStorage.setItem(STANCE_KEY, stance);
    const pending: PendingTutorialClaim = { claimId, stance };
    localStorage.setItem(TUTORIAL_CLAIM_KEY, JSON.stringify(pending));
  } catch {
  }
  if (_token) {
    const token = _token;
    void claimPendingTutorialCompletion(token)
      .then(() => apiUpdatePreferences(token, { tutorialCompleted: true }))
      .catch(() => undefined);
  }
}

export function getSavedFirstContactStance(): FirstContactStance | null {
  try {
    const value = localStorage.getItem(STANCE_KEY);
    return value === "curious" || value === "guarded" || value === "resolute" ? value : null;
  } catch {
    return null;
  }
}

export function hasPendingTutorialCompletion(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_CLAIM_KEY) !== null;
  } catch {
    return false;
  }
}

export async function claimPendingTutorialCompletion(token: string): Promise<boolean> {
  let claim: PendingTutorialClaim | null = null;
  try {
    const raw = localStorage.getItem(TUTORIAL_CLAIM_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as Partial<PendingTutorialClaim>;
    const stance = parsed.stance;
    if (
      typeof parsed.claimId !== "string"
      || (stance !== null && stance !== "curious" && stance !== "guarded" && stance !== "resolute")
    ) return false;
    claim = { claimId: parsed.claimId, stance };
  } catch {
    return false;
  }
  await apiClaimArchitectRecordOnboarding(token, claim);
  try {
    const current = localStorage.getItem(TUTORIAL_CLAIM_KEY);
    if (current) {
      const parsed = JSON.parse(current) as Partial<PendingTutorialClaim>;
      if (parsed.claimId === claim.claimId) localStorage.removeItem(TUTORIAL_CLAIM_KEY);
    }
  } catch {
  }
  return true;
}

export function hasTutorialBeenCompleted(): boolean {
  try {
    return localStorage.getItem(COMPLETED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markIntroSeen(beatIndex: number): void {
  try {
    localStorage.setItem(INTRO_SEEN_KEY, String(beatIndex));
  } catch {
  }
}

export function getIntroSeenBeat(): number | null {
  try {
    const v = localStorage.getItem(INTRO_SEEN_KEY);
    if (v === null) return null;
    const n = parseInt(v, 10);
    return isNaN(n) ? null : n;
  } catch {
    return null;
  }
}

export function clearIntroSeen(): void {
  try {
    localStorage.removeItem(INTRO_SEEN_KEY);
  } catch {
  }
}
