import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type AuthoritativeStateIngress,
  type AuthoritativeStateSource,
  useAuthoritativeStateIngress,
} from '@/hooks/use-authoritative-state-ingress';
import { useLuminarySequenceController } from '@/hooks/use-luminary-sequence-controller';
import {
  deriveLuminarySequenceStatus,
  type LuminarySequenceRunState,
  type LuminarySequenceSignals,
  type LuminarySequenceStatus,
} from '@/lib/luminarySequenceController';

interface VersionedState {
  version: number;
}

export type LuminaryPresentationRuntimeSignals = Omit<
  LuminarySequenceSignals,
  'devSequenceLaunchPending'
>;

interface UseLuminaryPresentationEngineOptions<TState extends VersionedState> {
  signals: LuminaryPresentationRuntimeSignals;
  getProcessedVersion: () => number | null | undefined;
  processAuthoritativeState: (
    state: TState,
    source: AuthoritativeStateSource,
  ) => void;
  beginCameraSequence: () => void;
  endCameraSequence: () => void;
}

export interface LuminaryPresentationEngine<TState extends VersionedState> {
  status: LuminarySequenceStatus;
  signals: LuminarySequenceSignals;
  ingress: AuthoritativeStateIngress<TState>;
  queuedStateCount: number;
  run: LuminarySequenceRunState;
  beginDevSequenceRun: () => void;
  resetDevSequenceRun: () => void;
}

/**
 * Owns the coordination boundary for a complete Luminary presentation.
 * Individual directors may move the camera, but only this engine opens and
 * releases the sequence lease or blocks authoritative state ingress.
 */
export function useLuminaryPresentationEngine<TState extends VersionedState>({
  signals: runtimeSignals,
  getProcessedVersion,
  processAuthoritativeState,
  beginCameraSequence,
  endCameraSequence,
}: UseLuminaryPresentationEngineOptions<TState>): LuminaryPresentationEngine<TState> {
  const [devSequenceLaunchPending, setDevSequenceLaunchPending] = useState(false);
  const signals: LuminarySequenceSignals = {
    ...runtimeSignals,
    devSequenceLaunchPending,
  };
  const status = deriveLuminarySequenceStatus(signals);
  const ingress = useAuthoritativeStateIngress<TState>({
    blocked: status.presentationActive,
    getProcessedVersion,
    process: processAuthoritativeState,
  });
  const controller = useLuminarySequenceController({
    status,
    signals,
    ingressQueuedCount: ingress.queuedCount,
  });
  const { beginLabRun, resetLabRun, run } = controller;
  const cameraLeaseRequestedRef = useRef(status.cameraLeaseRequested);
  cameraLeaseRequestedRef.current = status.cameraLeaseRequested;

  useEffect(() => {
    if (!devSequenceLaunchPending) return;

    if (
      runtimeSignals.devSequenceActive ||
      status.authoritativeSequenceActive ||
      status.presentationActive
    ) {
      setDevSequenceLaunchPending(false);
      return;
    }

    // A lab POST can resolve after its WebSocket state was already consumed.
    // Release an unclaimed launch lease instead of retaining the camera forever.
    const releaseTimer = setTimeout(
      () => setDevSequenceLaunchPending(false),
      3_000,
    );
    return () => clearTimeout(releaseTimer);
  }, [
    devSequenceLaunchPending,
    runtimeSignals.devSequenceActive,
    status.authoritativeSequenceActive,
    status.presentationActive,
  ]);

  useEffect(() => {
    if (status.cameraLeaseRequested) {
      beginCameraSequence();
      return;
    }

    // Confirm one idle frame before release so adjacent presentation phases
    // cannot restore the player's view between directors.
    const releaseFrame = requestAnimationFrame(() => {
      if (!cameraLeaseRequestedRef.current) endCameraSequence();
    });
    return () => cancelAnimationFrame(releaseFrame);
  }, [
    beginCameraSequence,
    endCameraSequence,
    status.cameraLeaseRequested,
  ]);

  const beginDevSequenceRun = useCallback(() => {
    beginLabRun();
    setDevSequenceLaunchPending(true);
  }, [beginLabRun]);

  const resetDevSequenceRun = useCallback(() => {
    resetLabRun();
    setDevSequenceLaunchPending(false);
  }, [resetLabRun]);

  return {
    status,
    signals,
    ingress,
    queuedStateCount: ingress.queuedCount,
    run,
    beginDevSequenceRun,
    resetDevSequenceRun,
  };
}
