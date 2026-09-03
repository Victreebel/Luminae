import type { NaturalAffinityKey } from "@workspace/game-types";
import type { AiStrategy } from "./aiPlayer";
import type { BalanceRuleset } from "./gameEngine";

export const BALANCE_FORMATS = {
  quick: 15,
  standard: 20,
  epic: 25,
} as const;

export type BalanceFormat = keyof typeof BALANCE_FORMATS;

export type BalanceFinishReason =
  | "eminence"
  | "frontier_exhaustion"
  | "max_turns"
  | "presentation_error"
  | "action_error"
  | "other";

export interface BalanceLuminaryMetric {
  claimsPerGame: number;
  ownerWinRate: number;
  openingPositionClaimShares: number[];
}

export interface BalanceScoreSourceBreakdown {
  artifact: number;
  luminaryArrival: number;
  startingCompensation: number;
  blueprintProject: number;
  /** Reconciliation residual for effect awards, score removal, and unattributable interactions. */
  other: number;
  total: number;
}

export interface BalanceTierThreeMilestones {
  /** Completed games grouped by the winner's distinct lifetime Tier III mastery count. */
  exactCountGames: Record<string, number>;
  exactCountRates: Record<string, number>;
  atLeastOneRate: number;
  atLeastTwoRate: number;
  requiredForFormat: 0 | 1 | 2;
  /** Null for Quick, whose format doctrine has no Tier III requirement. */
  requiredRate: number | null;
  /**
   * Timing evidence for the format's required milestone. "Near the ending" is
   * operationalized as first attainment during the final quarter of observed
   * decision turns. Quick has no required milestone, so its timing rates are
   * null.
   */
  timing: {
    requiredMilestone: 0 | 1 | 2;
    nearEndingWindowStart: 0.75;
    attainedGames: number;
    attainedNearEndingGames: number;
    attainedNearEndingRate: number | null;
    meanAttainmentTurnFraction: number | null;
    medianAttainmentTurnFraction: number | null;
    meanTurnsBeforeEnd: number | null;
  };
}

/** Common, safely comparable fields for every balance harness. */
export interface BalanceScenarioCoreV2 {
  candidateId: string;
  ruleset: BalanceRuleset;
  playerCount: number;
  format: BalanceFormat;
  victoryRequirement: number;
  policySeats: AiStrategy[];
  policyRotation: "cyclic_by_game";
  gamesRequested: number;
  gamesCompleted: number;
  completionRate: number;
  stalledGames: number;
  finishReasons: Record<BalanceFinishReason, number>;
  averageTurns: number;
  medianTurns: number;
  p90Turns: number;
  equalTurnViolations: number;
  seatWinRates: number[];
  openingPositionWinRates: number[];
  actionCounts: Record<string, number> | null;
  actionShares: Record<string, number> | null;
  limitations: string[];
}

/** Artifact-harness extension. Other harnesses may leave these unavailable. */
export interface BalanceScenarioV2 extends BalanceScenarioCoreV2 {
  /** Rejected policy submissions, grouped by action and authoritative engine error. */
  actionFailures: Record<string, number>;
  forgedByTier: number[];
  winnerForgedByTier: number[];
  /** Backward-compatible alias of winnerTier3Milestones.atLeastOneRate. */
  winnerTier3ReachRate: number;
  winnerTier3Milestones: BalanceTierThreeMilestones;
  scoreSources: {
    /** Per-civilization average across every player in completed games. */
    allPlayersAverage: BalanceScoreSourceBreakdown;
    /** Per-game average for the winning civilization. */
    winnerAverage: BalanceScoreSourceBreakdown;
  };
  zeroCostForges: {
    all: number;
    advanced: number;
    lineageEarned: number;
  };
  well: {
    anyColorEmptyTurnRate: number;
    fullyEmptyTurnRate: number;
    noLegalActionRecoveries: number;
  };
  encrypt: {
    attempts: number;
    successes: number;
    forgeConversions: number;
    conversionRate: number;
    meanTurnsToConversion: number | null;
    strandedAtEnd: number;
    rewardGenerated: number;
    rewardSpent: number;
    rewardUnused: number;
  };
  lead: {
    averageChanges: number;
    leaderAt5WinRate: number | null;
    leaderAt10WinRate: number | null;
    comebackWinRate: number;
  };
  luminaries: {
    claimsByOpeningPosition: number[];
    firstToLastAccessRatio: number | null;
    baseEminenceByOpeningPosition: number[];
    perId: Record<string, BalanceLuminaryMetric>;
  };
  market: {
    averageVisibleAge: number;
    p90VisibleAge: number;
  };
  policies: {
    games: Partial<Record<AiStrategy, number>>;
    wins: Partial<Record<AiStrategy, number>>;
    /** 100 is neutral after normalizing for player count. */
    normalizedWinRates: Partial<Record<AiStrategy, number>>;
  };
  allArtifactBonusShares: Record<NaturalAffinityKey, number>;
  winnerArtifactBonusShares: Record<NaturalAffinityKey, number>;
}

export interface BalanceReportV2 {
  schema: "luminae-balance-report/v2";
  generatedAt: string;
  seed: number;
  candidates: BalanceScenarioV2[];
}

export function rounded(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

export function percentage(count: number, total: number): number {
  return total > 0 ? rounded((count / total) * 100) : 0;
}

export function average(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function percentile(values: readonly number[], quantile: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(quantile * sorted.length) - 1));
  return sorted[index]!;
}
