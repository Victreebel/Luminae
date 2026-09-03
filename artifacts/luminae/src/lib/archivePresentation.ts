import { useSyncExternalStore } from "react";

export type ArchivePresentation = "crystal" | "cards";

export const DEFAULT_ARCHIVE_PRESENTATION: ArchivePresentation = "crystal";
export const ARCHIVE_PRESENTATION_STORAGE_KEY = "luminae_archive_presentation";

const ARCHIVE_PRESENTATION_EVENT = "luminae:archive-presentation-change";

export function getArchivePresentation(): ArchivePresentation {
  if (typeof window === "undefined") return DEFAULT_ARCHIVE_PRESENTATION;

  try {
    return window.localStorage.getItem(ARCHIVE_PRESENTATION_STORAGE_KEY) === "cards"
      ? "cards"
      : DEFAULT_ARCHIVE_PRESENTATION;
  } catch {
    return DEFAULT_ARCHIVE_PRESENTATION;
  }
}

export function setArchivePresentation(presentation: ArchivePresentation): void {
  if (typeof window === "undefined") return;

  try {
    if (presentation === DEFAULT_ARCHIVE_PRESENTATION) {
      window.localStorage.removeItem(ARCHIVE_PRESENTATION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(ARCHIVE_PRESENTATION_STORAGE_KEY, presentation);
    }
  } catch {
    // The in-memory UI still updates through the event when storage is unavailable.
  }

  window.dispatchEvent(new Event(ARCHIVE_PRESENTATION_EVENT));
}

function subscribeToArchivePresentation(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const handleStorage = (event: StorageEvent) => {
    if (event.key === ARCHIVE_PRESENTATION_STORAGE_KEY) onStoreChange();
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener(ARCHIVE_PRESENTATION_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(ARCHIVE_PRESENTATION_EVENT, onStoreChange);
  };
}

export function useArchivePresentation(): ArchivePresentation {
  return useSyncExternalStore(
    subscribeToArchivePresentation,
    getArchivePresentation,
    () => DEFAULT_ARCHIVE_PRESENTATION,
  );
}
