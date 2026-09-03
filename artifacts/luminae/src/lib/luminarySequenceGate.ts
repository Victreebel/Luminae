export type LuminaryActivationEffectType = 'summon' | 'end_of_turn' | 'start_of_turn' | string;

export interface LuminaryActivationLike {
  eventId: string;
  luminaryId: string;
  effectType: LuminaryActivationEffectType;
}

export interface DeferredBrandStrikeLike {
  srcMeta: { lumId: string } | null;
}

export interface DelayedLuminaryResultLike {
  luminaryId: string;
  activationEventId?: string;
}

export interface LuminarySequenceGateSnapshot {
  arrivalQueueLength: number;
  enqueuingCount: number;
  pendingSuppressCount: number;
  visualHoldCount: number;
  returningCount: number;
  pendingArrivalLuminaryIds: ReadonlySet<string>;
  summonActivationLockedLuminaryIds: ReadonlySet<string>;
}

export interface LuminaryActivationResolutionSnapshot {
  activationQueueLength: number;
  activationGateActive: boolean;
  activationAftermathActive: boolean;
  activeDelayedResult: boolean;
  delayedResultQueueLength: number;
  seedBoardEffectActive: boolean;
  brandStrikeCount: number;
  animationLockUntil: number;
}

export function reconcileDeferredLuminaryActivations<T extends LuminaryActivationLike>(
  deferred: readonly T[],
  authoritative: readonly T[],
  alreadyQueuedEventIds: ReadonlySet<string> = new Set(),
): T[] {
  const reconciled = new Map<string, T>();
  for (const event of [...deferred, ...authoritative]) {
    if (!alreadyQueuedEventIds.has(event.eventId)) {
      reconciled.set(event.eventId, event);
    }
  }
  return [...reconciled.values()];
}

export function partitionDeferredBrandStrikesByActivation<
  TStrike extends DeferredBrandStrikeLike,
  TActivation extends LuminaryActivationLike,
>(strikes: readonly TStrike[], activations: readonly TActivation[]) {
  const activationLuminaryIds = new Set(activations.map(event => event.luminaryId));
  return {
    owned: strikes.filter(strike => (
      strike.srcMeta && activationLuminaryIds.has(strike.srcMeta.lumId)
    )),
    unowned: strikes.filter(strike => (
      !strike.srcMeta || !activationLuminaryIds.has(strike.srcMeta.lumId)
    )),
  };
}

export interface LuminaryCameraLeaseSnapshot {
  presentationActive: boolean;
  authoritativeSequenceActive: boolean;
  seedBoardEffectActive: boolean;
  brandStrikeCount: number;
  devSequenceActive: boolean;
  devSequenceLaunchPending: boolean;
}

export type LuminaryActivationGateReason =
  | 'arrival-active'
  | 'summon-arrival-pending'
  | 'summon-returning'
  | 'ready';

export interface LuminaryActivationGateDecision {
  allowed: boolean;
  reason: LuminaryActivationGateReason;
}

export function isLuminaryArrivalSequenceActive(snapshot: Pick<
  LuminarySequenceGateSnapshot,
  'arrivalQueueLength' | 'visualHoldCount' | 'returningCount'
>): boolean {
  return (
    snapshot.arrivalQueueLength > 0 ||
    snapshot.visualHoldCount > 0 ||
    snapshot.returningCount > 0
  );
}

export function isLuminaryActivationGateActive(snapshot: LuminarySequenceGateSnapshot): boolean {
  return (
    isLuminaryArrivalSequenceActive(snapshot) ||
    snapshot.enqueuingCount > 0 ||
    snapshot.pendingSuppressCount > 0
  );
}

export function getLuminaryActivationGateDecision(
  event: LuminaryActivationLike,
  snapshot: LuminarySequenceGateSnapshot,
): LuminaryActivationGateDecision {
  if (isLuminaryActivationGateActive(snapshot)) {
    return { allowed: false, reason: 'arrival-active' };
  }

  if (event.effectType === 'summon' && snapshot.pendingArrivalLuminaryIds.has(event.luminaryId)) {
    return { allowed: false, reason: 'summon-arrival-pending' };
  }

  if (event.effectType === 'summon' && snapshot.summonActivationLockedLuminaryIds.has(event.luminaryId)) {
    return { allowed: false, reason: 'summon-returning' };
  }

  return { allowed: true, reason: 'ready' };
}

export function delayedResultBelongsToActivation(
  result: DelayedLuminaryResultLike | null | undefined,
  activation: LuminaryActivationLike | null | undefined,
): boolean {
  if (!result || !activation) return false;
  return result.activationEventId
    ? result.activationEventId === activation.eventId
    : result.luminaryId === activation.luminaryId;
}

export function isActivationAftermathInFlight(
  ownerEventId: string | null,
  animationLockUntil: number,
  now: number = Date.now(),
): boolean {
  return ownerEventId !== null && animationLockUntil > now;
}

export function isActivationAftermathBlockingHead(
  ownerEventId: string | null,
  headEventId: string | null,
  animationLockUntil: number,
  now: number = Date.now(),
): boolean {
  return !!(
    headEventId &&
    isActivationAftermathInFlight(ownerEventId, animationLockUntil, now) &&
    ownerEventId !== headEventId
  );
}

export function isLuminaryCameraLeaseRequested(
  snapshot: LuminaryCameraLeaseSnapshot,
): boolean {
  // Camera motion is downstream of this lease. Treating it as a request source
  // would let an unfinished local restore keep the sequence alive forever.
  return (
    snapshot.presentationActive ||
    snapshot.authoritativeSequenceActive ||
    snapshot.seedBoardEffectActive ||
    snapshot.brandStrikeCount > 0 ||
    snapshot.devSequenceActive ||
    snapshot.devSequenceLaunchPending
  );
}

export function canAcknowledgeLuminaryActivations(
  snapshot: LuminaryActivationResolutionSnapshot,
  now: number = Date.now(),
): boolean {
  return (
    snapshot.activationQueueLength === 0 &&
    !snapshot.activationGateActive &&
    !snapshot.activationAftermathActive &&
    !snapshot.activeDelayedResult &&
    snapshot.delayedResultQueueLength === 0 &&
    !snapshot.seedBoardEffectActive &&
    snapshot.brandStrikeCount === 0 &&
    snapshot.animationLockUntil <= now
  );
}
