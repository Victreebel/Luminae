export interface CosmicEventSequenceSnapshot {
  animationLockUntil: number;
  luminaryPresentationActive: boolean;
  activationGateActive: boolean;
  pendingSummonCount: number;
  pendingActivationCount: number;
  coreActionAnimationActive: boolean;
  boardEffectAnimationActive: boolean;
  cameraMotionActive: boolean;
  blueprintPresentationPending: boolean;
  chroniclePresentationActive: boolean;
  turnPresentationActive: boolean;
}

/**
 * An Event claims the visual lane only after prior work has fully settled.
 * Pending turn transitions and camera leases are intentionally absent: the
 * Event itself can hold those authoritative barriers until it is acknowledged.
 */
export function canStartCosmicEventPresentation(
  snapshot: CosmicEventSequenceSnapshot,
  now = Date.now(),
): boolean {
  return (
    snapshot.animationLockUntil <= now &&
    !snapshot.luminaryPresentationActive &&
    !snapshot.activationGateActive &&
    snapshot.pendingSummonCount === 0 &&
    snapshot.pendingActivationCount === 0 &&
    !snapshot.coreActionAnimationActive &&
    !snapshot.boardEffectAnimationActive &&
    !snapshot.cameraMotionActive &&
    !snapshot.blueprintPresentationPending &&
    !snapshot.chroniclePresentationActive &&
    !snapshot.turnPresentationActive
  );
}
