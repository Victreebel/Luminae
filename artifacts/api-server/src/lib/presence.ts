const presenceMap = new Map<string, number>();

const ONLINE_THRESHOLD_MS = 3 * 60 * 1000;

export function touchPresence(accountId: string): void {
  presenceMap.set(accountId, Date.now());
}

export function getPresentIds(accountIds: string[]): Set<string> {
  const now = Date.now();
  return new Set(
    accountIds.filter((id) => {
      const last = presenceMap.get(id);
      return last !== undefined && now - last < ONLINE_THRESHOLD_MS;
    }),
  );
}

setInterval(() => {
  const cutoff = Date.now() - ONLINE_THRESHOLD_MS;
  for (const [id, ts] of presenceMap) {
    if (ts < cutoff) presenceMap.delete(id);
  }
}, 60_000);
