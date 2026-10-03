import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export interface ChroniclePresentationGateProps {
  /** Controls entry only; an already-visible Chronicle keeps its lane. */
  presentationEnabled?: boolean;
  /** Includes the outgoing fade, so the next effect cannot begin underneath it. */
  onPresentationActiveChange?: (active: boolean) => void;
}

export function useChroniclePresentationGate({
  requested,
  presentationEnabled = true,
  onPresentationActiveChange,
}: ChroniclePresentationGateProps & { requested: boolean }) {
  const [claimed, setClaimed] = useState(requested && presentationEnabled);
  const requestedRef = useRef(requested);
  const callbackRef = useRef(onPresentationActiveChange);
  const soundHoldUntilRef = useRef(0);
  const releaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  requestedRef.current = requested;
  callbackRef.current = onPresentationActiveChange;

  useLayoutEffect(() => {
    if (requested && presentationEnabled) {
      if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
      setClaimed(true);
    }
  }, [requested, presentationEnabled]);

  useLayoutEffect(() => {
    callbackRef.current?.(claimed);
  }, [claimed]);

  useLayoutEffect(() => () => {
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    callbackRef.current?.(false);
  }, []);

  const completePresentationExit = useCallback(() => {
    if (requestedRef.current) return;
    const remainingSoundMs = soundHoldUntilRef.current - Date.now();
    if (remainingSoundMs <= 0) {
      setClaimed(false);
      return;
    }
    if (releaseTimerRef.current) clearTimeout(releaseTimerRef.current);
    releaseTimerRef.current = setTimeout(() => {
      releaseTimerRef.current = null;
      if (!requestedRef.current) setClaimed(false);
    }, remainingSoundMs);
  }, []);

  const holdPresentationForSound = useCallback((durationMs: number) => {
    soundHoldUntilRef.current = Math.max(soundHoldUntilRef.current, Date.now() + durationMs);
  }, []);

  return {
    presentationVisible: requested && claimed,
    completePresentationExit,
    holdPresentationForSound,
  };
}
