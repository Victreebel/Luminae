import { useCallback, useEffect, useRef, useState } from 'react';

export type AuthoritativeStateSource = 'websocket' | 'rest' | 'polling';
export type AuthoritativeStateIngressResult = 'ignored' | 'processed' | 'queued';

interface VersionedState {
  version: number;
}

interface QueuedState<TState> {
  source: AuthoritativeStateSource;
  state: TState;
}

interface UseAuthoritativeStateIngressOptions<TState extends VersionedState> {
  blocked: boolean;
  getProcessedVersion: () => number | null | undefined;
  process: (state: TState, source: AuthoritativeStateSource) => void;
  blockedRetryMs?: number;
}

export interface AuthoritativeStateIngress<TState> {
  accept: (
    state: TState,
    source: AuthoritativeStateSource,
  ) => AuthoritativeStateIngressResult;
  clear: () => void;
  nudge: () => void;
  queuedCount: number;
}

/**
 * Owns the single ingress lane for every authoritative game-state transport.
 * Future versions wait behind the presentation lock and drain in version order.
 */
export function useAuthoritativeStateIngress<TState extends VersionedState>({
  blocked,
  getProcessedVersion,
  process,
  blockedRetryMs = 250,
}: UseAuthoritativeStateIngressOptions<TState>): AuthoritativeStateIngress<TState> {
  const queueRef = useRef<Array<QueuedState<TState>>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blockedRef = useRef(blocked);
  const getProcessedVersionRef = useRef(getProcessedVersion);
  const processRef = useRef(process);
  const drainRef = useRef<() => void>(() => {});
  const [queuedCount, setQueuedCount] = useState(0);

  blockedRef.current = blocked;
  getProcessedVersionRef.current = getProcessedVersion;
  processRef.current = process;

  const scheduleDrain = useCallback((delayMs = 0) => {
    if (timerRef.current || queueRef.current.length === 0) return;
    timerRef.current = setTimeout(() => drainRef.current(), delayMs);
  }, []);

  drainRef.current = () => {
    timerRef.current = null;
    if (queueRef.current.length === 0) return;
    if (blockedRef.current) {
      scheduleDrain(blockedRetryMs);
      return;
    }

    const processedVersion = getProcessedVersionRef.current();
    while (
      queueRef.current.length > 0 &&
      processedVersion != null &&
      queueRef.current[0].state.version <= processedVersion
    ) {
      queueRef.current.shift();
    }

    const next = queueRef.current.shift();
    setQueuedCount(queueRef.current.length);
    if (!next) return;

    processRef.current(next.state, next.source);
    if (queueRef.current.length > 0) scheduleDrain();
  };

  const accept = useCallback((
    state: TState,
    source: AuthoritativeStateSource,
  ): AuthoritativeStateIngressResult => {
    const processedVersion = getProcessedVersionRef.current();
    if (processedVersion != null && state.version <= processedVersion) {
      return 'ignored';
    }

    if (queueRef.current.some(entry => entry.state.version === state.version)) {
      return 'queued';
    }

    if (blockedRef.current || queueRef.current.length > 0 || timerRef.current !== null) {
      queueRef.current.push({ state, source });
      queueRef.current.sort((left, right) => left.state.version - right.state.version);
      setQueuedCount(queueRef.current.length);
      scheduleDrain(blockedRef.current ? blockedRetryMs : 0);
      return 'queued';
    }

    processRef.current(state, source);
    return 'processed';
  }, [blockedRetryMs, scheduleDrain]);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    queueRef.current = [];
    setQueuedCount(0);
  }, []);

  const nudge = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    scheduleDrain();
  }, [scheduleDrain]);

  useEffect(() => {
    if (!blocked) nudge();
  }, [blocked, nudge]);

  useEffect(() => clear, [clear]);

  return {
    accept,
    clear,
    nudge,
    queuedCount,
  };
}
