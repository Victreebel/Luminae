import { useCallback, useEffect, useReducer } from 'react';
import {
  INITIAL_LUMINARY_SEQUENCE_RUN_STATE,
  luminarySequenceObservationSignature,
  luminarySequenceRunReducer,
  type LuminarySequenceObservation,
} from '@/lib/luminarySequenceController';

const LAB_RUN_TIMEOUT_MS = 10 * 60_000;

export function useLuminarySequenceController(
  observation: LuminarySequenceObservation,
) {
  const [run, dispatch] = useReducer(
    luminarySequenceRunReducer,
    INITIAL_LUMINARY_SEQUENCE_RUN_STATE,
  );
  const signature = luminarySequenceObservationSignature(observation);

  useEffect(() => {
    dispatch({ type: 'observe', now: Date.now(), observation });
    // The signature captures every field that affects lifecycle progress.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, run.startedAt]);

  useEffect(() => {
    if (run.status !== 'running') return;
    const timer = setTimeout(() => {
      dispatch({
        type: 'fail',
        now: Date.now(),
        reason: 'Sequence did not release every server, visual, ingress, and camera lock.',
      });
    }, LAB_RUN_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [run.status, run.startedAt]);

  const beginLabRun = useCallback(() => {
    dispatch({ type: 'begin', now: Date.now() });
  }, []);
  const resetLabRun = useCallback(() => {
    dispatch({ type: 'reset' });
  }, []);

  return {
    ...observation.status,
    beginLabRun,
    resetLabRun,
    run,
  };
}
