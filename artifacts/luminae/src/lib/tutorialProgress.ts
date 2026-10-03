import { apiUpdatePreferences } from "./cinematicPrefs";
import {
  clearLocalFirstContactStance,
  getLocalFirstContactStance,
  rememberLocalFirstContactStance,
} from "./firstContactMemory";
import { recordProgressionOnce } from "./telemetry";
import {
  FIRST_CONTACT_INVESTIGATION_ID,
  FIRST_CONTACT_INVESTIGATION_VERSION,
  isFirstContactRapport,
  isTutorialDiscoveryId,
  type ArchitectFirstContactStance,
  type FirstContactRapport,
  type TutorialDiscoveryId,
  type TutorialInvestigationProgress,
} from "@workspace/game-types";
import {
  apiCompleteTutorialInvestigation,
  apiGetTutorialInvestigation,
} from "./accountSession";
import { TUTORIAL_SEQUENCE_VERSION } from "./tutorialSequenceVersion";

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
const INVESTIGATION_KEY = "luminae_first_contact_investigation_v1";

interface LocalTutorialInvestigation {
  definitionVersion: number;
  completed: boolean;
  stance: ArchitectFirstContactStance | null;
  rapport: FirstContactRapport | null;
  discoveries: TutorialDiscoveryId[];
  pendingCompletion: boolean;
  serverProgress: TutorialInvestigationProgress | null;
}

function emptyLocalInvestigation(): LocalTutorialInvestigation {
  return {
    definitionVersion: FIRST_CONTACT_INVESTIGATION_VERSION,
    completed: false,
    stance: null,
    rapport: null,
    discoveries: [],
    pendingCompletion: false,
    serverProgress: null,
  };
}

function loadLocalInvestigation(): LocalTutorialInvestigation {
  try {
    const raw = localStorage.getItem(INVESTIGATION_KEY);
    if (!raw) {
      const completed = localStorage.getItem(COMPLETED_KEY) === "1";
      const stance = getLocalFirstContactStance();
      return {
        ...emptyLocalInvestigation(),
        completed,
        stance,
        pendingCompletion: completed && stance != null,
      };
    }
    const parsed = JSON.parse(raw) as Partial<LocalTutorialInvestigation>;
    const discoveries = Array.isArray(parsed.discoveries)
      ? parsed.discoveries.filter(isTutorialDiscoveryId)
      : [];
    const completed = parsed.completed === true || localStorage.getItem(COMPLETED_KEY) === "1";
    const stance = parsed.stance ?? getLocalFirstContactStance();
    const rapport = isFirstContactRapport(parsed.rapport) ? parsed.rapport : null;
    return {
      definitionVersion: FIRST_CONTACT_INVESTIGATION_VERSION,
      completed,
      stance,
      rapport,
      discoveries: Array.from(new Set(discoveries)),
      pendingCompletion: parsed.pendingCompletion ?? (
        completed && stance != null && parsed.serverProgress == null
      ),
      serverProgress: parsed.serverProgress ?? null,
    };
  } catch {
    return emptyLocalInvestigation();
  }
}

function saveLocalInvestigation(value: LocalTutorialInvestigation): void {
  try {
    localStorage.setItem(INVESTIGATION_KEY, JSON.stringify(value));
  } catch {
  }
}

function localProgress(value: LocalTutorialInvestigation): TutorialInvestigationProgress {
  return {
    investigationId: FIRST_CONTACT_INVESTIGATION_ID,
    definitionVersion: FIRST_CONTACT_INVESTIGATION_VERSION,
    completed: value.completed,
    completedAt: null,
    firstContactRapport: value.rapport,
    discoveries: value.discoveries,
    completionLumeAwarded: 0,
    lumeBalance: null,
  };
}

function mergeLocalDiscoveries(
  existing: readonly TutorialDiscoveryId[],
  incoming: readonly TutorialDiscoveryId[],
): TutorialDiscoveryId[] {
  const found = new Set([...existing, ...incoming]);
  return ["lumii_origin", "artifact_mastery", "encryption_authority"]
    .filter((id): id is TutorialDiscoveryId => found.has(id as TutorialDiscoveryId));
}

export function getAccumulatedTutorialDiscoveries(): TutorialDiscoveryId[] {
  return [...loadLocalInvestigation().discoveries];
}

export function hasPendingTutorialCompletion(): boolean {
  const pending = loadLocalInvestigation();
  return pending.completed && pending.stance != null && pending.pendingCompletion;
}

export async function loadAuthenticatedTutorialInvestigationProgress(
  token: string,
): Promise<TutorialInvestigationProgress> {
  const local = loadLocalInvestigation();
  const serverProgress = await apiGetTutorialInvestigation(token);
  if (!serverProgress.completed && !local.pendingCompletion) {
    clearLocalFirstContactStance();
    try {
      localStorage.removeItem(COMPLETED_KEY);
    } catch {
    }
    saveLocalInvestigation({
      ...emptyLocalInvestigation(),
      serverProgress,
    });
    return serverProgress;
  }
  saveLocalInvestigation({
    ...local,
    completed: local.completed || serverProgress.completed,
    rapport: serverProgress.firstContactRapport ?? local.rapport,
    discoveries: mergeLocalDiscoveries(local.discoveries, serverProgress.discoveries),
    serverProgress,
  });
  return serverProgress;
}

export async function loadTutorialInvestigationProgress(
  token: string | null = _token,
): Promise<TutorialInvestigationProgress> {
  const local = loadLocalInvestigation();
  if (!token) return localProgress(local);
  try {
    return await loadAuthenticatedTutorialInvestigationProgress(token);
  } catch {
    return localProgress(local);
  }
}

export async function completeTutorialRun(input: {
  stance: ArchitectFirstContactStance;
  rapport: FirstContactRapport | null;
  discoveries: readonly TutorialDiscoveryId[];
}): Promise<TutorialInvestigationProgress> {
  const current = loadLocalInvestigation();
  const next: LocalTutorialInvestigation = {
    ...current,
    completed: true,
    stance: input.stance,
    rapport: input.rapport ?? current.rapport,
    discoveries: mergeLocalDiscoveries(current.discoveries, input.discoveries),
    pendingCompletion: true,
    serverProgress: null,
  };
  rememberLocalFirstContactStance(input.stance);
  saveLocalInvestigation(next);
  markTutorialComplete();

  if (!_token) return localProgress(next);
  try {
    const serverProgress = await apiCompleteTutorialInvestigation(_token, {
      stance: input.stance,
      rapport: next.rapport,
      discoveries: next.discoveries,
    });
    saveLocalInvestigation({
      ...next,
      pendingCompletion: false,
      serverProgress,
    });
    return serverProgress;
  } catch {
    return localProgress(next);
  }
}

/** Claims guest completion before account preferences can overwrite local onboarding state. */
export async function claimPendingTutorialInvestigation(
  token: string,
): Promise<TutorialInvestigationProgress | null> {
  const pending = loadLocalInvestigation();
  if (!pending.completed || !pending.stance || !pending.pendingCompletion) {
    return null;
  }
  const serverProgress = await apiCompleteTutorialInvestigation(token, {
    stance: pending.stance,
    rapport: pending.rapport,
    discoveries: pending.discoveries,
  });
  saveLocalInvestigation({
    ...pending,
    pendingCompletion: false,
    serverProgress,
  });
  return serverProgress;
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

export function loadTutorialProgress(
  resolveBeatId?: (id: string) => number | undefined,
): number | null {
  try {
    const ver = localStorage.getItem(PROGRESS_VERSION_KEY);
    const parsedVersion = ver === null ? null : parseInt(ver, 10);
    let migratedBeat: number | null = null;
    const stableId = localStorage.getItem(PROGRESS_ID_KEY);
    if (
      parsedVersion != null
      && parsedVersion >= 12
      && parsedVersion < TUTORIAL_SEQUENCE_VERSION
      && stableId
    ) {
      const resolved = resolveBeatId?.(stableId);
      if (resolved == null) {
        clearTutorialProgress();
        return null;
      }
      migratedBeat = resolved;
      localStorage.setItem(PROGRESS_KEY, String(resolved));
      const rawState = localStorage.getItem(STATE_KEY);
      if (rawState) {
        try {
          const state = JSON.parse(rawState) as Record<string, unknown>;
          localStorage.setItem(STATE_KEY, JSON.stringify({ ...state, beat: resolved }));
        } catch {
          localStorage.removeItem(STATE_KEY);
        }
      }
      localStorage.setItem(PROGRESS_VERSION_KEY, String(TUTORIAL_SEQUENCE_VERSION));
    } else if (parsedVersion !== TUTORIAL_SEQUENCE_VERSION) {
      clearTutorialProgress();
      return null;
    }
    if (migratedBeat != null) return migratedBeat;
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
