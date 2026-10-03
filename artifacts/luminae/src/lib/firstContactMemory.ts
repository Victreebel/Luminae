import {
  isArchitectFirstContactStance,
  type ArchitectFirstContactStance,
} from "@workspace/game-types";

const FIRST_CONTACT_STANCE_KEY = "luminae_first_contact_stance";

export function getLocalFirstContactStance(): ArchitectFirstContactStance | null {
  try {
    const value = localStorage.getItem(FIRST_CONTACT_STANCE_KEY);
    return isArchitectFirstContactStance(value) ? value : null;
  } catch {
    return null;
  }
}

export function rememberLocalFirstContactStance(
  stance: ArchitectFirstContactStance,
): ArchitectFirstContactStance {
  try {
    localStorage.setItem(FIRST_CONTACT_STANCE_KEY, stance);
  } catch {
    // A private or constrained browser may reject storage; the API write can still succeed.
  }
  return stance;
}

export function syncLocalFirstContactStance(
  stance: ArchitectFirstContactStance,
): void {
  try {
    localStorage.setItem(FIRST_CONTACT_STANCE_KEY, stance);
  } catch {
    // Preference synchronization remains best-effort locally.
  }
}

export function clearLocalFirstContactStance(): void {
  try {
    localStorage.removeItem(FIRST_CONTACT_STANCE_KEY);
  } catch {
    // Local account isolation remains best-effort in constrained storage.
  }
}
