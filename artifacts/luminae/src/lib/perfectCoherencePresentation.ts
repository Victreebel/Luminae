export type PerfectCoherenceMilestoneState = {
  concordanceMandalaTriggered?: boolean;
  concordanceMandalaFinalTriggered?: boolean;
};

export type PerfectCoherenceBestowal = {
  id: string;
  luminaryId: 'lum_radiant';
  activationEventId?: string;
  amount: 2;
  color: '#d4af37';
  label: 'Eminence';
};

export function createPerfectCoherenceBestowals(
  previous: PerfectCoherenceMilestoneState,
  current: PerfectCoherenceMilestoneState,
  activationEventIds: string[],
  timestamp = Date.now(),
): PerfectCoherenceBestowal[] {
  const reachedMilestones = [
    !previous.concordanceMandalaTriggered && current.concordanceMandalaTriggered,
    !previous.concordanceMandalaFinalTriggered && current.concordanceMandalaFinalTriggered,
  ].filter(Boolean).length;

  const matchingEventIds = activationEventIds.slice(-reachedMilestones);
  return Array.from({ length: reachedMilestones }, (_, index) => ({
    id: `mandala-${timestamp}-${index}`,
    luminaryId: 'lum_radiant',
    activationEventId: matchingEventIds[index],
    amount: 2,
    color: '#d4af37',
    label: 'Eminence',
  }));
}
