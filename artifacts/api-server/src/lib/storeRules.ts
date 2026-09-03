export function getDailyStarlightReward(streak: number): number {
  const normalizedStreak = Math.max(1, Math.floor(streak));
  return Math.min(25, 10 + Math.floor((normalizedStreak - 1) / 3) * 5);
}

export function isTestCheckoutEnabled(nodeEnv: string | undefined): boolean {
  return nodeEnv !== "production";
}
