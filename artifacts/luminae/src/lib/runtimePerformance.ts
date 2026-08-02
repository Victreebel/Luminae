import { useSyncExternalStore } from 'react';

export const MOBILE_RUNTIME_QUERY = '(max-width: 1024px) and (pointer: coarse)';

export interface RuntimePerformanceState {
  mobile: boolean;
  visible: boolean;
}

const SERVER_STATE: RuntimePerformanceState = { mobile: false, visible: true };
let state: RuntimePerformanceState = SERVER_STATE;
let installed = false;
const listeners = new Set<() => void>();

function readState(): RuntimePerformanceState {
  if (typeof window === 'undefined' || typeof document === 'undefined') return SERVER_STATE;
  return {
    mobile: typeof window.matchMedia === 'function'
      ? window.matchMedia(MOBILE_RUNTIME_QUERY).matches
      : window.innerWidth <= 1024,
    visible: !document.hidden,
  };
}

function publish(next: RuntimePerformanceState) {
  if (state.mobile === next.mobile && state.visible === next.visible) return;
  state = next;
  for (const listener of listeners) listener();
}

function applyDocumentPolicy(next: RuntimePerformanceState) {
  const root = document.documentElement;
  root.dataset.runtimeProfile = next.mobile ? 'mobile' : 'full';
  root.dataset.documentVisible = next.visible ? 'true' : 'false';
  if (!next.visible) {
    document.querySelectorAll<HTMLVideoElement>('video').forEach(video => video.pause());
  }
}

export function installRuntimePerformancePolicy() {
  if (installed || typeof window === 'undefined' || typeof document === 'undefined') return;
  installed = true;
  const media = typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_RUNTIME_QUERY)
    : null;
  const update = () => {
    const next = readState();
    applyDocumentPolicy(next);
    publish(next);
  };
  media?.addEventListener('change', update);
  document.addEventListener('visibilitychange', update);
  window.addEventListener('pageshow', update);
  update();
}

export function getRuntimePerformanceState() {
  if (!installed) installRuntimePerformancePolicy();
  return state;
}

export function useRuntimePerformanceState() {
  if (!installed) installRuntimePerformancePolicy();
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getRuntimePerformanceState,
    () => SERVER_STATE,
  );
}
