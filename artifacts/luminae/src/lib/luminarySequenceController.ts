import { isLuminaryCameraLeaseRequested } from './luminarySequenceGate';

export type LuminarySequencePhase =
  | 'idle'
  | 'arrival'
  | 'arrival-settle'
  | 'activation'
  | 'aftermath'
  | 'awaiting-state'
  | 'restoring';

export interface LuminarySequenceSignals {
  visibleArrivalActive: boolean;
  activationGateActive: boolean;
  activationQueueLength: number;
  activationAftermathActive: boolean;
  activeDelayedResult: boolean;
  delayedResultQueueLength: number;
  seedBoardEffectActive: boolean;
  brandStrikeCount: number;
  pendingTurnTransition: boolean;
  pendingSummonCount: number;
  pendingActivationCount: number;
  devSequenceActive: boolean;
  devSequenceLaunchPending: boolean;
  cameraSequenceActive: boolean;
  cameraMotionActive: boolean;
}

export interface LuminarySequenceStatus {
  phase: LuminarySequencePhase;
  presentationActive: boolean;
  authoritativeSequenceActive: boolean;
  cameraLeaseRequested: boolean;
  cameraControlled: boolean;
}

export interface LuminarySequenceTraceEntry {
  at: number;
  phase: LuminarySequencePhase;
  signature: string;
}

export type LuminarySequenceRunStatus = 'idle' | 'running' | 'passed' | 'failed';

export interface LuminarySequenceRunState {
  status: LuminarySequenceRunStatus;
  activityObserved: boolean;
  startedAt: number | null;
  completedAt: number | null;
  failure: string | null;
  trace: LuminarySequenceTraceEntry[];
}

export interface LuminarySequenceObservation {
  status: LuminarySequenceStatus;
  signals: LuminarySequenceSignals;
  ingressQueuedCount: number;
}

export type LuminarySequenceRunAction =
  | { type: 'begin'; now: number }
  | { type: 'observe'; now: number; observation: LuminarySequenceObservation }
  | { type: 'fail'; now: number; reason: string }
  | { type: 'reset' };

export const INITIAL_LUMINARY_SEQUENCE_RUN_STATE: LuminarySequenceRunState = {
  status: 'idle',
  activityObserved: false,
  startedAt: null,
  completedAt: null,
  failure: null,
  trace: [],
};

export function deriveLuminarySequenceStatus(
  signals: LuminarySequenceSignals,
): LuminarySequenceStatus {
  const presentationActive =
    signals.activationGateActive ||
    signals.activationQueueLength > 0 ||
    signals.activationAftermathActive ||
    signals.activeDelayedResult ||
    (signals.delayedResultQueueLength > 0 && signals.activationQueueLength === 0);
  const authoritativeSequenceActive =
    signals.pendingTurnTransition ||
    signals.pendingSummonCount > 0 ||
    signals.pendingActivationCount > 0;
  const cameraLeaseRequested = isLuminaryCameraLeaseRequested({
    presentationActive,
    authoritativeSequenceActive,
    seedBoardEffectActive: signals.seedBoardEffectActive,
    brandStrikeCount: signals.brandStrikeCount,
    devSequenceActive: signals.devSequenceActive,
    devSequenceLaunchPending: signals.devSequenceLaunchPending,
  });

  let phase: LuminarySequencePhase = 'idle';
  if (signals.visibleArrivalActive) {
    phase = 'arrival';
  } else if (signals.activationGateActive) {
    phase = 'arrival-settle';
  } else if (signals.activationQueueLength > 0) {
    phase = 'activation';
  } else if (
    signals.activationAftermathActive ||
    signals.activeDelayedResult ||
    signals.delayedResultQueueLength > 0 ||
    signals.seedBoardEffectActive ||
    signals.brandStrikeCount > 0
  ) {
    phase = 'aftermath';
  } else if (
    authoritativeSequenceActive ||
    signals.devSequenceActive ||
    signals.devSequenceLaunchPending
  ) {
    phase = 'awaiting-state';
  } else if (signals.cameraSequenceActive || signals.cameraMotionActive) {
    phase = 'restoring';
  }

  return {
    phase,
    presentationActive,
    authoritativeSequenceActive,
    cameraLeaseRequested,
    cameraControlled:
      cameraLeaseRequested ||
      signals.cameraSequenceActive ||
      signals.cameraMotionActive,
  };
}

export function luminarySequenceObservationSignature({
  status,
  signals,
  ingressQueuedCount,
}: LuminarySequenceObservation): string {
  return [
    status.phase,
    `server:${signals.pendingSummonCount}/${signals.pendingActivationCount}`,
    `local:${signals.activationQueueLength}/${signals.delayedResultQueueLength}`,
    `ingress:${ingressQueuedCount}`,
    `camera:${status.cameraControlled ? 'leased' : 'released'}`,
  ].join('|');
}

export function luminarySequenceIsFullyReleased({
  status,
  signals,
  ingressQueuedCount,
}: LuminarySequenceObservation): boolean {
  return (
    status.phase === 'idle' &&
    !status.cameraControlled &&
    !signals.pendingTurnTransition &&
    signals.pendingSummonCount === 0 &&
    signals.pendingActivationCount === 0 &&
    signals.activationQueueLength === 0 &&
    signals.delayedResultQueueLength === 0 &&
    ingressQueuedCount === 0
  );
}

export function luminarySequenceRunReducer(
  state: LuminarySequenceRunState,
  action: LuminarySequenceRunAction,
): LuminarySequenceRunState {
  if (action.type === 'reset') return INITIAL_LUMINARY_SEQUENCE_RUN_STATE;
  if (action.type === 'begin') {
    return {
      status: 'running',
      activityObserved: false,
      startedAt: action.now,
      completedAt: null,
      failure: null,
      trace: [],
    };
  }
  if (action.type === 'fail') {
    return {
      ...state,
      status: 'failed',
      completedAt: action.now,
      failure: action.reason,
    };
  }

  const signature = luminarySequenceObservationSignature(action.observation);
  const last = state.trace[state.trace.length - 1];
  const trace = last?.signature === signature
    ? state.trace
    : [...state.trace, {
        at: action.now,
        phase: action.observation.status.phase,
        signature,
      }].slice(-24);
  const activityObserved =
    state.activityObserved ||
    action.observation.status.cameraLeaseRequested ||
    !['idle', 'restoring'].includes(action.observation.status.phase);
  const completed =
    state.status === 'running' &&
    activityObserved &&
    luminarySequenceIsFullyReleased(action.observation);

  return {
    ...state,
    activityObserved,
    trace,
    status: completed ? 'passed' : state.status,
    completedAt: completed ? action.now : state.completedAt,
    failure: completed ? null : state.failure,
  };
}
