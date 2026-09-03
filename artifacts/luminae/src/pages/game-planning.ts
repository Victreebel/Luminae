import type { GamePlayerState } from '@workspace/api-client-react';

export interface PlannedActionInfo {
  actionType?: string;
  cardId: string | null;
  deckTier: number | null;
  label: string;
}

export interface PlannedActionCommitContext {
  currentPlayerId?: string | null;
  sessionPlayerId?: string | null;
  turnCount?: number | null;
  plannedAction?: Record<string, unknown> | null;
  completedTurnPresentationKey?: string | null;
  turnPresentationPending: boolean;
  turnAnnouncementActive: boolean;
  turnOrderIntroActive: boolean;
  activationGateActive: boolean;
  activationQueueLength: number;
  pendingSummonCount: number;
}

export interface PlanningAvailabilityContext {
  gameStatus?: string | null;
  hasLocalPlayer: boolean;
  exclusivePresentationActive: boolean;
  arrivalGateActive: boolean;
  localArrivalSkipped: boolean;
}

export function canUsePlanningEngine({
  gameStatus,
  hasLocalPlayer,
  exclusivePresentationActive,
  arrivalGateActive,
  localArrivalSkipped,
}: PlanningAvailabilityContext): boolean {
  if (gameStatus !== 'playing' || !hasLocalPlayer || exclusivePresentationActive) return false;
  return !arrivalGateActive || localArrivalSkipped;
}

export function getTurnPresentationKey(playerId: string, turnCount: number): string {
  return `${playerId}:${turnCount}`;
}

export function canCommitPlannedAction({
  currentPlayerId,
  sessionPlayerId,
  turnCount,
  plannedAction,
  completedTurnPresentationKey,
  turnPresentationPending,
  turnAnnouncementActive,
  turnOrderIntroActive,
  activationGateActive,
  activationQueueLength,
  pendingSummonCount,
}: PlannedActionCommitContext): boolean {
  if (!currentPlayerId || !sessionPlayerId || currentPlayerId !== sessionPlayerId) return false;
  if (turnCount == null || !plannedAction) return false;
  if (completedTurnPresentationKey !== getTurnPresentationKey(currentPlayerId, turnCount)) return false;
  return !(
    turnPresentationPending ||
    turnAnnouncementActive ||
    turnOrderIntroActive ||
    activationGateActive ||
    activationQueueLength > 0 ||
    pendingSummonCount > 0
  );
}

export function canReserveMore(player: Pick<GamePlayerState, 'reservedArtifacts'>): boolean {
  return player.reservedArtifacts.length < 3;
}

export function getPlannedActionInfo(plannedAction?: Record<string, unknown> | null): PlannedActionInfo {
  const actionType = plannedAction?.type as string | undefined;
  const cardId = (plannedAction?.cardId as string | undefined) ?? null;
  const deckTier =
    (actionType === 'reserve_artifact' && !cardId) ||
    (actionType === 'forge_artifact' && plannedAction?.luminaryId === 'lum_tide')
      ? Number(
        (plannedAction?.tier as number | string | undefined) ??
        (plannedAction?._tier as number | string | undefined) ??
        0,
      ) || null
      : null;
  const label = actionType === 'reserve_artifact'
    ? 'Encrypt pending'
    : actionType === 'foundry_forge_artifact'
      ? 'Foundry Forge pending'
    : actionType === 'forge_artifact' && plannedAction?.luminaryId === 'lum_tide'
      ? 'Archive Forge pending'
    : actionType === 'forge_artifact' || actionType === 'forge_reserved_artifact'
      ? 'Forge pending'
      : 'Pending action';

  return {
    actionType,
    cardId,
    deckTier,
    label,
  };
}
