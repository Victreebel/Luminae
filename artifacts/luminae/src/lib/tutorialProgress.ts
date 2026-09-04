import { apiUpdatePreferences } from "./cinematicPrefs";
import {
  getLocalFirstContactStance,
  rememberLocalFirstContactStance,
} from "./firstContactMemory";
import { recordProgressionOnce } from "./telemetry";
import type { ArchitectFirstContactStance } from "@workspace/game-types";

// Module-level token set by AccountContext alongside setPreferencesSyncToken.
let _token: string | null = null;
export function setTutorialToken(token: string | null): void {
  _token = token;
  const stance = getLocalFirstContactStance();
  if (token && stance) {
    void apiUpdatePreferences(token, { firstContactStance: stance }).catch(() => undefined);
  }
}

const PROGRESS_KEY = "luminae_tutorial_progress";
const PROGRESS_ID_KEY = "luminae_tutorial_progress_id";
const PROGRESS_VERSION_KEY = "luminae_tutorial_progress_ver";
const STATE_KEY = "luminae_tutorial_state";
const SEEN_KEY = "luminae_tutorial_seen";
const COMPLETED_KEY = "luminae_tutorial_completed";
const INTRO_SEEN_KEY = "luminae_intro_seen_beat";

// Increment this whenever beat ordering or IDs change so that stale saved
// progress (which may point at the wrong beat) is silently discarded.
const TUTORIAL_SEQUENCE_VERSION = 12;

export function recordFirstContactStance(
  stance: ArchitectFirstContactStance,
): ArchitectFirstContactStance {
  const remembered = rememberLocalFirstContactStance(stance);
  if (_token) {
    void apiUpdatePreferences(_token, { firstContactStance: remembered }).catch(() => undefined);
  }
  return remembered;
}

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
    if (ver === null || parseInt(ver, 10) !== TUTORIAL_SEQUENCE_VERSION) {
      clearTutorialProgress();
      return null;
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

export function markTutorialComplete(): void {
  try {
    localStorage.setItem(COMPLETED_KEY, "1");
  } catch {
  }
  if (_token) {
    void apiUpdatePreferences(_token, {
      tutorialCompleted: true,
      firstContactStance: getLocalFirstContactStance() ?? undefined,
    }).catch(() => undefined);
  }
  recordProgressionOnce("tutorial_completed");
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
