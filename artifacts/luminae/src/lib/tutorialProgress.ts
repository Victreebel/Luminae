const PROGRESS_KEY = "luminae_tutorial_progress";
const SEEN_KEY = "luminae_tutorial_seen";

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

export function clearTutorialProgress(): void {
  try {
    localStorage.removeItem(PROGRESS_KEY);
  } catch {
  }
}
