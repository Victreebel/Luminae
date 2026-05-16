const PROGRESS_KEY = "luminae_tutorial_progress";
const PROGRESS_ID_KEY = "luminae_tutorial_progress_id";
const SEEN_KEY = "luminae_tutorial_seen";
const COMPLETED_KEY = "luminae_tutorial_completed";
const INTRO_SEEN_KEY = "luminae_intro_seen_beat";

export function markTutorialSeen(): void {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
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
  } catch {
  }
}

export function loadTutorialProgress(): number | null {
  try {
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
  } catch {
  }
}

export function markTutorialComplete(): void {
  try {
    localStorage.setItem(COMPLETED_KEY, "1");
  } catch {
  }
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
