declare global {
  interface Window {
    __lumArrivalDedupSet?: Set<string>;
  }
}

if (import.meta.hot) {
  (import.meta.hot.data as Record<string, unknown>).handledArrivalEventIds
    ??= new Set<string>();
  window.__lumArrivalDedupSet
    ??= (import.meta.hot.data as Record<string, unknown>).handledArrivalEventIds as Set<string>;
} else {
  window.__lumArrivalDedupSet ??= new Set<string>();
}

export const handledArrivalEventIds: Set<string> = window.__lumArrivalDedupSet;
