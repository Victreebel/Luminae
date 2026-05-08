#!/usr/bin/env tsx
/**
 * Headless AI-vs-AI game simulation for Luminae balance testing.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run simulate
 *   pnpm --filter @workspace/api-server run simulate -- --games 200 --difficulty hard
 *   pnpm --filter @workspace/api-server run simulate -- --games 200 --difficulty all
 *   pnpm --filter @workspace/api-server run simulate -- --games 200 --players all
 *   pnpm --filter @workspace/api-server run simulate -- --games 200 --players all --difficulty hard
 *   pnpm --filter @workspace/api-server run simulate -- --games 100 --output results.json
 *   pnpm --filter @workspace/api-server run simulate -- --games 1 --verbose
 *   pnpm --filter @workspace/api-server run simulate -- --probe lum_tide --games 100
 *   pnpm --filter @workspace/api-server run simulate -- --probe lum_null --games 200 --players 4
 *
 * Reports:
 *   - Per-Luminary claim rates across all games
 *   - Per-Luminary claim timing: median turn, p25/p75, early/mid/late histogram
 *   - Structural reachability: shortfall analysis for zero-claim Luminaries
 *   - Optional: --probe <lumId> forces one AI to pursue that Luminary single-mindedly
 *   - Mono vs dual vs triple tier claim distribution
 *   - Average turn counts and winner Eminence
 *   - AI action distribution breakdown
 *   - Side-by-side multi-difficulty comparison when --difficulty all is used
 *   - Side-by-side player-count comparison (2/3/4) when --players all is used,
 *     including per-Luminary median claim turn and cross-count claim warnings
 *
 * JSON export (--output / -o):
 *   Writes a machine-readable simulation-output.json consumable by the
 *   SimResults chart page in the mockup-sandbox artifact.
 */

import { writeFileSync } from "fs";
import {
  initializeGame,
  applyAction,
  LUMINARIES,
  LUMINARY_MAP,
  CARD_MAP,
  CRYSTAL_COLORS,
  effectiveBonuses,
  zeroCrystals,
  type GameStateData,
  type CrystalColor,
  type CrystalCounts,
  type ArtifactCard,
  type LuminaryDef,
  type ActionPayload,
} from "../lib/gameEngine.js";
import { chooseAiAction, type AiDifficulty } from "../lib/aiPlayer.js";

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs(): {
  games: number;
  difficulties: AiDifficulty[];
  playerCounts: number[];
  outputFile: string | null;
  verbose: boolean;
  probe: string | null;
} {
  const args = process.argv.slice(2);
  let games = 100;
  let diffArg = "hard";
  let playersArg = "4";
  let outputFile: string | null = null;
  let verbose = false;
  let probe: string | null = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--games" && args[i + 1]) games = parseInt(args[++i], 10);
    if (args[i] === "--difficulty" && args[i + 1]) diffArg = args[++i];
    if (args[i] === "--players" && args[i + 1]) playersArg = args[++i];
    if ((args[i] === "--output" || args[i] === "-o") && args[i + 1]) outputFile = args[++i];
    if (args[i] === "--verbose") verbose = true;
    if (args[i] === "--probe" && args[i + 1]) probe = args[++i];
  }
  const difficulties: AiDifficulty[] =
    diffArg === "all" ? ["easy", "medium", "hard"] : [diffArg as AiDifficulty];
  const playerCounts: number[] =
    playersArg === "all" ? [2, 3, 4] : [parseInt(playersArg, 10)];
  return { games, difficulties, playerCounts, outputFile, verbose, probe };
}

// ── Game simulation ───────────────────────────────────────────────────────────

interface GameResult {
  turnsTotal: number;
  winnerLumens: number;
  luminaryClaims: Record<string, string>; // luminaryId → claimerPlayerId
  claimedAtTurn: Record<string, number>;  // luminaryId → turnCount when claimed
  actionCounts: Record<string, number>;
  playerFinalLumens: number[];
  /** Max bonus any single player accumulated per color during this game. */
  maxBonusObserved: Record<CrystalColor, number>;
  /** Which Luminary IDs were in the active pool for this game. */
  activeLuminaryIds: string[];
}

const MAX_TURNS_PER_GAME = 400;

function runOneGame(playerCount: number, difficulty: AiDifficulty, verbose = false): GameResult {
  const playerDefs = Array.from({ length: playerCount }, (_, i) => ({
    id: `p${i + 1}`,
    name: `AI-${i + 1}`,
  }));

  const state: GameStateData = initializeGame(playerDefs, playerCount);
  const activeLuminaryIds = [...state.activeLuminaries];

  const actionCounts: Record<string, number> = {};
  const claimedAtTurn: Record<string, number> = {};
  const prevClaimed = new Set<string>();
  let turnsSinceLastProgress = 0;
  let lastTotalLumens = 0;

  function detectNewClaims(): void {
    for (const p of state.players) {
      for (const lumId of p.luminaries) {
        if (!prevClaimed.has(lumId)) {
          claimedAtTurn[lumId] = state.turnCount;
          prevClaimed.add(lumId);
        }
      }
    }
  }

  for (let turn = 0; turn < MAX_TURNS_PER_GAME; turn++) {
    if (state.phase === "finished") break;

    if (state.pendingSummonEvents && state.pendingSummonEvents.length > 0) {
      for (const evt of [...state.pendingSummonEvents]) {
        applyAction(state, state.players[0].playerId, {
          type: "resolve_summon",
          eventId: evt.eventId,
        });
      }
      detectNewClaims();
    }

    const currentPlayer = state.players[state.currentPlayerIndex];
    const action = chooseAiAction(state, currentPlayer.playerId, difficulty);
    const result = applyAction(state, currentPlayer.playerId, action);

    detectNewClaims();

    if (result.success) {
      actionCounts[action.type] = (actionCounts[action.type] ?? 0) + 1;
      if (verbose && action.type === "toggle_luminary_affinity") {
        const lumName = LUMINARY_MAP.get(action.luminaryId ?? "")?.name ?? action.luminaryId ?? "?";
        console.log(
          `  [turn ${state.turnCount}] ${currentPlayer.playerName} (${difficulty}) switched ${lumName} → ${action.affinity}`,
        );
      }
    } else {
      let recovered = false;
      for (const color of ["ruby", "sapphire", "emerald", "onyx", "pearl"] as const) {
        if (state.crystalBank[color] > 0) {
          const fb = applyAction(state, currentPlayer.playerId, {
            type: "take_three_crystals",
            crystals: { [color]: 1 },
          });
          if (fb.success) {
            detectNewClaims();
            actionCounts["take_three_crystals"] = (actionCounts["take_three_crystals"] ?? 0) + 1;
            recovered = true;
            break;
          }
        }
      }
      if (!recovered) break;
    }

    const totalLumens = state.players.reduce((s, p) => s + p.lumens, 0);
    if (totalLumens > lastTotalLumens) {
      lastTotalLumens = totalLumens;
      turnsSinceLastProgress = 0;
    } else {
      turnsSinceLastProgress++;
      if (turnsSinceLastProgress > 80) break;
    }
  }

  const luminaryClaims: Record<string, string> = {};
  for (const p of state.players) {
    for (const lumId of p.luminaries) {
      luminaryClaims[lumId] = p.playerId;
    }
  }

  const maxBonusObserved: Record<CrystalColor, number> = {
    ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0,
  };
  for (const p of state.players) {
    for (const color of CRYSTAL_COLORS) {
      if (p.bonuses[color] > maxBonusObserved[color]) {
        maxBonusObserved[color] = p.bonuses[color];
      }
    }
  }

  const winner = state.winnerId
    ? state.players.find((p) => p.playerId === state.winnerId) ?? state.players[0]
    : state.players.reduce((best, p) => (p.lumens > best.lumens ? p : best));

  return {
    turnsTotal: state.turnCount,
    winnerLumens: winner.lumens,
    luminaryClaims,
    claimedAtTurn,
    actionCounts,
    playerFinalLumens: state.players.map((p) => p.lumens),
    maxBonusObserved,
    activeLuminaryIds,
  };
}

// ── Statistics helpers ────────────────────────────────────────────────────────

function mean(arr: number[]): number {
  return arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
}

function pct(n: number, total: number): string {
  if (total === 0) return "0.0%";
  return ((n / total) * 100).toFixed(1) + "%";
}

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

function lumTier(lum: (typeof LUMINARIES)[0]): number {
  const colors = ["ruby", "sapphire", "emerald", "onyx", "pearl"] as const;
  const nonZero = colors.filter((c) => lum.requirements[c] > 0);
  if (nonZero.length === 1) return lum.lumens <= 1 ? 1 : 2;
  if (nonZero.length === 2) return 3;
  return 4;
}

function reqSummary(lum: (typeof LUMINARIES)[0]): string {
  const colors = ["ruby", "sapphire", "emerald", "onyx", "pearl"] as const;
  const labels: Record<string, string> = {
    ruby: "Flr", sapphire: "Con", emerald: "Vrd", onyx: "Aby", pearl: "Rad",
  };
  return colors
    .filter((c) => lum.requirements[c] > 0)
    .map((c) => `${lum.requirements[c]}${labels[c]}`)
    .join("+");
}

const COLOR_LABEL: Record<CrystalColor, string> = {
  ruby: "Flr", sapphire: "Con", emerald: "Vrd", onyx: "Aby", pearl: "Rad",
};

// ── Single-difficulty report ──────────────────────────────────────────────────

interface DifficultyStats {
  difficulty: AiDifficulty;
  playerCount: number;
  games: number;
  avgTurns: number;
  minTurns: number;
  maxTurns: number;
  avgWinLumens: number;
  claimedCount: Record<string, number>;
  totalClaims: number;
  avgClaimsPerGame: number;
  gamesWithClaims: number;
  tierGroups: Record<number, { claims: number; count: number }>;
  actionCounts: Record<string, number>;
  monoAvgRate: number;
  dualAvgRate: number;
  tripleAvgRate: number;
  warnings: string[];
  claimTurns: Record<string, number[]>;
  peakBonusObserved: Record<CrystalColor, number>;
  gamesActiveCount: Record<string, number>;
}

function runDifficulty(difficulty: AiDifficulty, games: number, players: number, verbose = false): DifficultyStats {
  console.log(`\n  Running ${games} games at difficulty=${difficulty} players=${players}...`);
  const results: GameResult[] = [];
  for (let i = 0; i < games; i++) {
    if (verbose) console.log(`\n── Game ${i + 1} ────────────────────────────────────────────────────`);
    results.push(runOneGame(players, difficulty, verbose));
    if (!verbose && (i + 1) % 50 === 0) process.stdout.write(`    Progress: ${i + 1}/${games}\r`);
  }
  if (games >= 50) process.stdout.write("\n");

  const turns = results.map((r) => r.turnsTotal);
  const winnerLumens = results.map((r) => r.winnerLumens);

  const claimedCount: Record<string, number> = {};
  const claimTurns: Record<string, number[]> = {};
  for (const lum of LUMINARIES) {
    claimedCount[lum.id] = 0;
    claimTurns[lum.id] = [];
  }

  let gamesWithClaims = 0;
  const claimsPerGame: number[] = [];
  const totalActionCounts: Record<string, number> = {};

  const peakBonusObserved: Record<CrystalColor, number> = {
    ruby: 0, sapphire: 0, emerald: 0, onyx: 0, pearl: 0,
  };
  const gamesActiveCount: Record<string, number> = {};
  for (const lum of LUMINARIES) gamesActiveCount[lum.id] = 0;

  for (const r of results) {
    const n = Object.keys(r.luminaryClaims).length;
    claimsPerGame.push(n);
    if (n > 0) gamesWithClaims++;
    for (const lumId of Object.keys(r.luminaryClaims)) {
      claimedCount[lumId] = (claimedCount[lumId] ?? 0) + 1;
      if (lumId in r.claimedAtTurn) {
        claimTurns[lumId] = claimTurns[lumId] ?? [];
        claimTurns[lumId].push(r.claimedAtTurn[lumId]);
      }
    }
    for (const [k, v] of Object.entries(r.actionCounts)) {
      totalActionCounts[k] = (totalActionCounts[k] ?? 0) + v;
    }
    for (const color of CRYSTAL_COLORS) {
      if (r.maxBonusObserved[color] > peakBonusObserved[color]) {
        peakBonusObserved[color] = r.maxBonusObserved[color];
      }
    }
    for (const lumId of r.activeLuminaryIds) {
      gamesActiveCount[lumId] = (gamesActiveCount[lumId] ?? 0) + 1;
    }
  }

  const totalClaims = Object.values(claimedCount).reduce((a, b) => a + b, 0);
  const tierGroups: Record<number, { claims: number; count: number }> = {};
  for (const lum of LUMINARIES) {
    const tier = lumTier(lum);
    if (!tierGroups[tier]) tierGroups[tier] = { claims: 0, count: 0 };
    tierGroups[tier].claims += claimedCount[lum.id] ?? 0;
    tierGroups[tier].count++;
  }

  const monoCount = (tierGroups[1]?.count ?? 0) + (tierGroups[2]?.count ?? 0);
  const monoClaims = (tierGroups[1]?.claims ?? 0) + (tierGroups[2]?.claims ?? 0);
  const dualClaims = tierGroups[3]?.claims ?? 0;
  const dualCount = tierGroups[3]?.count ?? 0;
  const tripleClaims = tierGroups[4]?.claims ?? 0;
  const tripleCount = tierGroups[4]?.count ?? 0;

  const monoAvgRate = monoCount > 0 ? monoClaims / monoCount / games : 0;
  const dualAvgRate = dualCount > 0 ? dualClaims / dualCount / games : 0;
  const tripleAvgRate = tripleCount > 0 ? tripleClaims / tripleCount / games : 0;

  const avgTurns = mean(turns);
  const avgWinLumens = mean(winnerLumens);

  const warnings: string[] = [];
  if (monoAvgRate < 0.03) warnings.push("Mono Luminaries rarely claimed (<3% per game)");
  if (monoAvgRate > dualAvgRate * 1.5) warnings.push("Mono claimed more often than duals despite lower reward");
  if (avgTurns > 200) warnings.push("Games running long (>200 turns avg)");
  if (avgTurns < 25) warnings.push("Games ending very quickly (<25 turns avg)");
  if (mean(claimsPerGame) < 0.5) warnings.push("Very few Luminaries claimed overall (<0.5/game)");

  const neverClaimed = LUMINARIES.filter((lum) => claimedCount[lum.id] === 0);
  if (neverClaimed.length > 0) {
    warnings.push(`Luminaries NEVER claimed in any game: ${neverClaimed.map((l) => l.name).join(", ")}`);
  }

  const lateThreshold = avgTurns * 0.9;
  const lateOnly = LUMINARIES.filter((lum) => {
    const times = claimTurns[lum.id];
    return times && times.length >= 3 && median(times) > lateThreshold;
  });
  if (lateOnly.length > 0) {
    warnings.push(`Luminaries claimed only very late (median >90% game length): ${lateOnly.map((l) => l.name).join(", ")}`);
  }

  return {
    difficulty, playerCount: players, games, avgTurns,
    minTurns: Math.min(...turns), maxTurns: Math.max(...turns),
    avgWinLumens, claimedCount, totalClaims, avgClaimsPerGame: mean(claimsPerGame),
    gamesWithClaims, tierGroups, actionCounts: totalActionCounts,
    monoAvgRate, dualAvgRate, tripleAvgRate, warnings, claimTurns,
    peakBonusObserved, gamesActiveCount,
  };
}

function printDifficultyReport(s: DifficultyStats): void {
  const tierLabel: Record<number, string> = {
    1: "mono-1L", 2: "mono-2L", 3: "dual-3L", 4: "triple-4L",
  };
  const tierNames: Record<number, string> = {
    1: "Mono-color  1L", 2: "Mono-color  2L", 3: "Dual-color  3L", 4: "Triple-color 4L",
  };

  console.log(`\n${"═".repeat(64)}`);
  console.log(`  difficulty=${s.difficulty}  players=${s.playerCount}  games=${s.games}`);
  console.log(`${"═".repeat(64)}`);

  console.log("\n── Game Pacing ──────────────────────────────────────────────────");
  console.log(`  Avg turns     : ${s.avgTurns.toFixed(1)}  (${s.minTurns}–${s.maxTurns})`);
  console.log(`  Avg win Emn.  : ${s.avgWinLumens.toFixed(1)}`);

  const totalActions = Object.values(s.actionCounts).reduce((a, b) => a + b, 0);
  console.log("\n── AI Action Distribution ───────────────────────────────────────");
  for (const [action, count] of Object.entries(s.actionCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${action.padEnd(22)}: ${count.toString().padStart(7)}  (${pct(count, totalActions)})`);
  }

  console.log(`\n── Luminary Claim Rates ─────────────────────────────────────────`);
  console.log(`  ${"Luminary".padEnd(28)} ${"Tier".padEnd(8)} ${"Req".padEnd(20)} ${"Claims".padEnd(8)} Rate`);
  console.log(`  ${"─".repeat(74)}`);
  const sorted = [...LUMINARIES].sort((a, b) => lumTier(a) - lumTier(b));
  for (const lum of sorted) {
    const tier = lumTier(lum);
    const claims = s.claimedCount[lum.id] ?? 0;
    console.log(
      `  ${lum.name.padEnd(28)} ${tierLabel[tier].padEnd(8)} ${reqSummary(lum).padEnd(20)} ${claims.toString().padStart(5)}   ${pct(claims, s.games)}`,
    );
  }

  console.log(`\n── Tier Claim Summary ───────────────────────────────────────────`);
  for (const [tier, data] of Object.entries(s.tierGroups).sort((a, b) => +a[0] - +b[0])) {
    const avgPerGame = (data.claims / s.games).toFixed(2);
    console.log(
      `  ${tierNames[+tier].padEnd(20)}: ${data.claims.toString().padStart(5)} total  (${pct(data.claims, s.totalClaims)} of all, ${avgPerGame} avg/game)`,
    );
  }

  printTimingReport(s);
  printStructuralReachability(s);

  console.log(`\n── Balance Verdict ──────────────────────────────────────────────`);
  console.log(`  Mono  avg rate/Lum/game : ${(s.monoAvgRate * 100).toFixed(1)}%`);
  console.log(`  Dual  avg rate/Lum/game : ${(s.dualAvgRate * 100).toFixed(1)}%`);
  console.log(`  Triple avg rate/Lum/game: ${(s.tripleAvgRate * 100).toFixed(1)}%`);
  console.log(`  Avg claims/game         : ${s.avgClaimsPerGame.toFixed(2)}`);
  console.log(`  Games with ≥1 claim     : ${pct(s.gamesWithClaims, s.games)}`);
  if (s.warnings.length === 0) {
    console.log("  ✓ PASS — no balance concerns detected");
  } else {
    for (const w of s.warnings) console.log(`  ⚠ WARN: ${w}`);
  }
}

function printTimingReport(s: DifficultyStats): void {
  console.log(`\n── Luminary Claim Timing ────────────────────────────────────────`);

  const earlyEdge = s.avgTurns / 3;
  const midEdge = (s.avgTurns * 2) / 3;

  const hdr = `  ${"Luminary".padEnd(28)} ${"Tier".padEnd(8)} ${"n".padStart(4)}  ${"Med".padStart(5)}  ${"p25".padStart(5)}–${"p75".padStart(5)}  Early  Mid   Late  Verdict`;
  console.log(hdr);
  console.log(`  ${"─".repeat(hdr.length - 2)}`);

  const tierLabel: Record<number, string> = {
    1: "mono-1L", 2: "mono-2L", 3: "dual-3L", 4: "triple-4L",
  };
  const sorted = [...LUMINARIES].sort((a, b) => lumTier(a) - lumTier(b));

  for (const lum of sorted) {
    const times = s.claimTurns[lum.id] ?? [];
    const tier = lumTier(lum);
    const claimCount = times.length;

    if (claimCount === 0) {
      console.log(
        `  ${lum.name.padEnd(28)} ${tierLabel[tier].padEnd(8)} ${"—".padStart(4)}  ${"—".padStart(5)}  ${"—".padStart(5)} ${"—".padStart(5)}  ${"—".padEnd(6)} ${"—".padEnd(5)} ${"—".padEnd(5)} never claimed`,
      );
      continue;
    }

    const med = median(times);
    const p25 = percentile(times, 25);
    const p75 = percentile(times, 75);
    const earlyN = times.filter((t) => t <= earlyEdge).length;
    const midN = times.filter((t) => t > earlyEdge && t <= midEdge).length;
    const lateN = times.filter((t) => t > midEdge).length;
    const earlyPct = ((earlyN / claimCount) * 100).toFixed(0) + "%";
    const midPct = ((midN / claimCount) * 100).toFixed(0) + "%";
    const latePct = ((lateN / claimCount) * 100).toFixed(0) + "%";

    const verdict =
      earlyN / claimCount >= 0.5
        ? "early/strat"
        : midN / claimCount >= 0.4
          ? "mid-game"
          : "late/incid.";

    console.log(
      `  ${lum.name.padEnd(28)} ${tierLabel[tier].padEnd(8)} ${claimCount.toString().padStart(4)}  ${med.toFixed(0).padStart(5)}  ${p25.toFixed(0).padStart(5)}–${p75.toFixed(0).padEnd(5)}  ${earlyPct.padEnd(6)} ${midPct.padEnd(5)} ${latePct.padEnd(5)} ${verdict}`,
    );
  }

  const claimedLums = sorted.filter((lum) => (s.claimTurns[lum.id]?.length ?? 0) >= 5);
  if (claimedLums.length > 0) {
    const bucketCount = 5;
    const bucketSize = Math.ceil(s.maxTurns / bucketCount);
    const bucketLabels = Array.from({ length: bucketCount }, (_, i) => {
      const lo = i * bucketSize + 1;
      const hi = (i + 1) * bucketSize;
      return `${lo}–${hi}`;
    });

    console.log(`\n── Claim Turn Histogram (per-Luminary, turns 1–${s.maxTurns}) ──────────────`);
    console.log(`  ${"Luminary".padEnd(28)} ${bucketLabels.map((l) => l.padEnd(9)).join("")}`);
    console.log(`  ${"─".repeat(28 + 2 + bucketCount * 9)}`);

    for (const lum of claimedLums) {
      const times = s.claimTurns[lum.id];
      const buckets = Array.from({ length: bucketCount }, (_, i) =>
        times.filter((t) => t > i * bucketSize && t <= (i + 1) * bucketSize).length,
      );
      const maxBucket = Math.max(...buckets, 1);
      const bars = buckets.map((b) => {
        const barLen = Math.round((b / maxBucket) * 6);
        const bar = "█".repeat(barLen).padEnd(6);
        const pctStr = ((b / times.length) * 100).toFixed(0) + "%";
        return `${bar}${pctStr.padStart(3)}`;
      });
      console.log(`  ${lum.name.padEnd(28)} ${bars.map((b) => b.padEnd(9)).join("")}`);
    }
  }
}

function printStructuralReachability(s: DifficultyStats): void {
  console.log(`\n── Structural Reachability ──────────────────────────────────────`);

  const zeroClaim = LUMINARIES.filter((lum) => (s.claimedCount[lum.id] ?? 0) === 0);

  if (zeroClaim.length === 0) {
    console.log("  ✓ All Luminaries were claimed in at least one game — no reachability concerns.");
    return;
  }

  console.log(`  ${zeroClaim.length} Luminary(ies) with zero claims across ${s.games} games:\n`);

  for (const lum of zeroClaim) {
    const gamesActive = s.gamesActiveCount[lum.id] ?? 0;
    const activeRate = s.games > 0 ? ((gamesActive / s.games) * 100).toFixed(0) : "0";

    console.log(`  ▸ ${lum.name}  [${reqSummary(lum)}]  [in pool ${gamesActive}/${s.games} games, ${activeRate}%]`);

    if (gamesActive === 0) {
      console.log(`      Verdict: NEVER IN ACTIVE POOL`);
      console.log(`      → This Luminary was not selected in any game at this player count.`);
      console.log(`      → Increase player count or shrink the pool to make it reachable.\n`);
      continue;
    }

    const reqColors = CRYSTAL_COLORS.filter((c) => lum.requirements[c] > 0);
    let anyShortfall = false;
    const shortfallLines: string[] = [];
    const metLines: string[] = [];

    for (const c of reqColors) {
      const need = lum.requirements[c];
      const peak = s.peakBonusObserved[c] ?? 0;
      const shortfall = Math.max(0, need - peak);
      if (shortfall > 0) {
        anyShortfall = true;
        shortfallLines.push(
          `      ${COLOR_LABEL[c].padEnd(4)} (${c}): max observed bonus ${peak}, needs ${need}  → shortfall ${shortfall}`,
        );
      } else {
        metLines.push(
          `      ${COLOR_LABEL[c].padEnd(4)} (${c}): ✓ peak ${peak} ≥ ${need} required`,
        );
      }
    }

    for (const line of [...metLines, ...shortfallLines]) console.log(line);

    if (anyShortfall) {
      console.log(`      Verdict: REQUIREMENT TOO HIGH`);
      console.log(`      → No player built a deep enough bonus stack in the required color(s).`);
      console.log(`      → Suggestion: lower the requirement or run --probe ${lum.id} to test.`);
    } else {
      console.log(`      Verdict: COLOR STACK INCOMPATIBLE WITH AI STRATEGY`);
      console.log(`      → Peak bonuses are theoretically sufficient, but the AI never combined`);
      console.log(`        these colors in the same game as this Luminary's active window.`);
      console.log(`      → Suggestion: run --probe ${lum.id} to measure focused-pursuit success rate.`);
    }
    console.log();
  }
}

// ── Multi-difficulty side-by-side comparison ──────────────────────────────────

function printComparisonTable(allStats: DifficultyStats[]): void {
  console.log(`\n${"═".repeat(64)}`);
  console.log("  Side-by-side Difficulty Comparison");
  console.log(`${"═".repeat(64)}`);

  const diffs = allStats.map((s) => s.difficulty);
  const hdr = `  ${"Metric".padEnd(32)} ${diffs.map((d) => d.padEnd(10)).join("")}`;
  console.log(hdr);
  console.log("  " + "─".repeat(hdr.length - 2));

  function row(label: string, vals: string[]): void {
    console.log(`  ${label.padEnd(32)} ${vals.map((v) => v.padEnd(10)).join("")}`);
  }

  row("Avg turns / game", allStats.map((s) => s.avgTurns.toFixed(1)));
  row("Turn range", allStats.map((s) => `${s.minTurns}–${s.maxTurns}`));
  row("Avg winner Eminence", allStats.map((s) => s.avgWinLumens.toFixed(1)));
  row("Avg Luminary claims / game", allStats.map((s) => s.avgClaimsPerGame.toFixed(2)));
  row("Games with ≥1 claim", allStats.map((s) => pct(s.gamesWithClaims, s.games)));
  row("Mono avg rate / Lum / game", allStats.map((s) => (s.monoAvgRate * 100).toFixed(1) + "%"));
  row("Dual avg rate / Lum / game", allStats.map((s) => (s.dualAvgRate * 100).toFixed(1) + "%"));
  row("Triple avg rate / Lum / game", allStats.map((s) => (s.tripleAvgRate * 100).toFixed(1) + "%"));
  row(
    "Purchase share",
    allStats.map((s) => {
      const total = Object.values(s.actionCounts).reduce((a, b) => a + b, 0);
      return pct(s.actionCounts["purchase_card"] ?? 0, total);
    }),
  );

  console.log("\n── Per-Luminary rate by difficulty ─────────────────────────────");
  const lumHdr = `  ${"Luminary".padEnd(26)} ${"Req".padEnd(15)} ${diffs.map((d) => d.padEnd(9)).join("")}`;
  console.log(lumHdr);
  console.log("  " + "─".repeat(lumHdr.length - 2));
  const sorted = [...LUMINARIES].sort((a, b) => lumTier(a) - lumTier(b));
  for (const lum of sorted) {
    const rates = allStats.map((s) => pct(s.claimedCount[lum.id] ?? 0, s.games));
    console.log(
      `  ${lum.name.padEnd(26)} ${reqSummary(lum).padEnd(15)} ${rates.map((r) => r.padEnd(9)).join("")}`,
    );
  }

  console.log("\n── Per-Luminary median claim turn by difficulty ─────────────────");
  const timHdr = `  ${"Luminary".padEnd(26)} ${"Req".padEnd(15)} ${diffs.map((d) => d.padEnd(9)).join("")}`;
  console.log(timHdr);
  console.log("  " + "─".repeat(timHdr.length - 2));
  for (const lum of sorted) {
    const medians = allStats.map((s) => {
      const times = s.claimTurns[lum.id] ?? [];
      if (times.length === 0) return "—";
      return `t${median(times).toFixed(0)}`;
    });
    console.log(
      `  ${lum.name.padEnd(26)} ${reqSummary(lum).padEnd(15)} ${medians.map((m) => m.padEnd(9)).join("")}`,
    );
  }

  console.log("\n── Overall verdicts ─────────────────────────────────────────────");
  for (const s of allStats) {
    const verdict = s.warnings.length === 0 ? "✓ PASS" : `⚠ ${s.warnings.length} warning(s)`;
    console.log(`  ${s.difficulty.padEnd(8)}: ${verdict}`);
  }
  console.log();
}

// ── Player-count side-by-side comparison ──────────────────────────────────────

function printPlayerCountComparison(allStats: DifficultyStats[]): void {
  const counts = allStats.map((s) => `${s.playerCount}p`);
  const difficulty = allStats[0].difficulty;

  console.log(`\n${"═".repeat(72)}`);
  console.log(`  Player-Count Comparison  (difficulty=${difficulty})`);
  console.log(`${"═".repeat(72)}`);

  const hdr = `  ${"Metric".padEnd(34)} ${counts.map((c) => c.padEnd(10)).join("")}`;
  console.log(hdr);
  console.log("  " + "─".repeat(hdr.length - 2));

  function row(label: string, vals: string[]): void {
    console.log(`  ${label.padEnd(34)} ${vals.map((v) => v.padEnd(10)).join("")}`);
  }

  row("Active Luminaries per game", allStats.map((s) => String(s.playerCount + 1)));
  row("Avg turns / game", allStats.map((s) => s.avgTurns.toFixed(1)));
  row("Turn range", allStats.map((s) => `${s.minTurns}–${s.maxTurns}`));
  row("Avg winner Eminence", allStats.map((s) => s.avgWinLumens.toFixed(1)));
  row("Avg Luminary claims / game", allStats.map((s) => s.avgClaimsPerGame.toFixed(2)));
  row("Games with ≥1 claim", allStats.map((s) => pct(s.gamesWithClaims, s.games)));
  row("Mono avg rate / Lum / game", allStats.map((s) => (s.monoAvgRate * 100).toFixed(1) + "%"));
  row("Dual avg rate / Lum / game", allStats.map((s) => (s.dualAvgRate * 100).toFixed(1) + "%"));
  row("Triple avg rate / Lum / game", allStats.map((s) => (s.tripleAvgRate * 100).toFixed(1) + "%"));
  row(
    "Purchase share",
    allStats.map((s) => {
      const total = Object.values(s.actionCounts).reduce((a, b) => a + b, 0);
      return pct(s.actionCounts["purchase_card"] ?? 0, total);
    }),
  );

  console.log(`\n── Per-Luminary claim rate by player count ──────────────────────────`);
  const lumHdr = `  ${"Luminary".padEnd(26)} ${"Req".padEnd(15)} ${counts.map((c) => c.padEnd(9)).join("")}`;
  console.log(lumHdr);
  console.log("  " + "─".repeat(lumHdr.length - 2));
  const sorted = [...LUMINARIES].sort((a, b) => lumTier(a) - lumTier(b));
  for (const lum of sorted) {
    const rates = allStats.map((s) => pct(s.claimedCount[lum.id] ?? 0, s.games));
    console.log(
      `  ${lum.name.padEnd(26)} ${reqSummary(lum).padEnd(15)} ${rates.map((r) => r.padEnd(9)).join("")}`,
    );
  }

  console.log(`\n── Per-Luminary median claim turn by player count ───────────────────`);
  const timHdr = `  ${"Luminary".padEnd(26)} ${"Req".padEnd(15)} ${counts.map((c) => c.padEnd(9)).join("")}`;
  console.log(timHdr);
  console.log("  " + "─".repeat(timHdr.length - 2));
  for (const lum of sorted) {
    const medians = allStats.map((s) => {
      const times = s.claimTurns[lum.id] ?? [];
      if (times.length === 0) return "—";
      return `t${median(times).toFixed(0)}`;
    });
    console.log(
      `  ${lum.name.padEnd(26)} ${reqSummary(lum).padEnd(15)} ${medians.map((m) => m.padEnd(9)).join("")}`,
    );
  }

  const REGULAR_THRESHOLD = 0.10;

  console.log(`\n── Cross-Count Warnings ─────────────────────────────────────────────`);
  const crossWarnings: string[] = [];
  const seen = new Set<string>();

  function addWarning(msg: string): void {
    if (!seen.has(msg)) { seen.add(msg); crossWarnings.push(msg); }
  }

  const pairs: Array<[DifficultyStats, DifficultyStats]> = [];
  for (let i = 0; i < allStats.length - 1; i++) {
    pairs.push([allStats[i], allStats[i + 1]]);
  }
  if (allStats.length > 2) {
    pairs.push([allStats[0], allStats[allStats.length - 1]]);
  }

  for (const [a, b] of pairs) {
    const aCount = a.playerCount;
    const bCount = b.playerCount;

    for (const lum of LUMINARIES) {
      const aRate = (a.claimedCount[lum.id] ?? 0) / a.games;
      const bRate = (b.claimedCount[lum.id] ?? 0) / b.games;

      if (aRate === 0 && bRate >= REGULAR_THRESHOLD) {
        addWarning(
          `${lum.name}: never claimed at ${aCount}p but claimed in ${pct(b.claimedCount[lum.id] ?? 0, b.games)} of ${bCount}p games`,
        );
      } else if (bRate === 0 && aRate >= REGULAR_THRESHOLD) {
        addWarning(
          `${lum.name}: never claimed at ${bCount}p but claimed in ${pct(a.claimedCount[lum.id] ?? 0, a.games)} of ${aCount}p games`,
        );
      } else if (aRate >= REGULAR_THRESHOLD && bRate >= REGULAR_THRESHOLD) {
        const ratio = bRate / aRate;
        if (ratio >= 3) {
          addWarning(
            `${lum.name}: claim rate ${(bRate * 100).toFixed(1)}% at ${bCount}p vs ${(aRate * 100).toFixed(1)}% at ${aCount}p (${ratio.toFixed(1)}× more likely at higher count)`,
          );
        } else if (ratio <= 1 / 3) {
          addWarning(
            `${lum.name}: claim rate ${(aRate * 100).toFixed(1)}% at ${aCount}p vs ${(bRate * 100).toFixed(1)}% at ${bCount}p (${(1 / ratio).toFixed(1)}× more likely at lower count)`,
          );
        }
      }

      const aTimes = a.claimTurns[lum.id] ?? [];
      const bTimes = b.claimTurns[lum.id] ?? [];
      if (aTimes.length >= 3 && bTimes.length >= 3) {
        const aMed = median(aTimes);
        const bMed = median(bTimes);
        const shift = Math.abs(bMed - aMed);
        const refLen = Math.max(a.avgTurns, b.avgTurns);
        if (shift / refLen >= 0.2) {
          const dir = bMed > aMed ? "later" : "earlier";
          addWarning(
            `${lum.name}: claim timing shifts ${dir} by ~${shift.toFixed(0)} turns (t${aMed.toFixed(0)} at ${aCount}p → t${bMed.toFixed(0)} at ${bCount}p)`,
          );
        }
      }
    }
  }

  if (crossWarnings.length === 0) {
    console.log("  ✓ No cross-count claim anomalies detected");
  } else {
    for (const w of crossWarnings) console.log(`  ⚠ ${w}`);
  }

  console.log(`\n── Player-count verdicts ────────────────────────────────────────────`);
  for (const s of allStats) {
    const verdict = s.warnings.length === 0 ? "✓ PASS" : `⚠ ${s.warnings.length} warning(s)`;
    console.log(`  ${String(s.playerCount + "p").padEnd(4)}: ${verdict}`);
  }
  console.log();
}

// ── Probe mode ────────────────────────────────────────────────────────────────

function probeScoreCard(
  card: ArtifactCard,
  player: { bonuses: CrystalCounts },
  targetLum: LuminaryDef,
): number {
  const need = targetLum.requirements[card.bonusColor as CrystalColor] ?? 0;
  if (need > 0) {
    const have = player.bonuses[card.bonusColor as CrystalColor] ?? 0;
    const stillNeeded = Math.max(0, need - have);
    return 200 + stillNeeded * 20 + card.lumens * 2 + card.tier;
  }
  return card.lumens;
}

function chooseProbeAction(
  state: GameStateData,
  playerId: string,
  targetLum: LuminaryDef,
): ActionPayload {
  const playerMaybe = state.players.find((p) => p.playerId === playerId);
  if (!playerMaybe) return { type: "take_three_crystals", crystals: {} };
  const player = playerMaybe;

  const reqColors = CRYSTAL_COLORS.filter((c) => targetLum.requirements[c] > 0);

  function effCost(card: ArtifactCard): CrystalCounts {
    const bonuses = effectiveBonuses(state, player);
    const result = zeroCrystals();
    for (const color of CRYSTAL_COLORS) {
      result[color] = Math.max(0, card.cost[color] - bonuses[color]);
    }
    return result;
  }

  function canAffordCard(card: ArtifactCard): boolean {
    const eff = effCost(card);
    let fluxNeeded = 0;
    for (const color of CRYSTAL_COLORS) {
      fluxNeeded += Math.max(0, eff[color] - player.crystals[color]);
    }
    return fluxNeeded <= player.crystals.flux;
  }

  const marketIds = [...state.marketTier1, ...state.marketTier2, ...state.marketTier3];
  const market = marketIds.map((id) => CARD_MAP.get(id)).filter(Boolean) as ArtifactCard[];
  const reserved = player.reservedCardIds
    .map((id) => CARD_MAP.get(id))
    .filter(Boolean) as ArtifactCard[];
  const allCards = [...market, ...reserved];

  const affordable = allCards
    .filter(canAffordCard)
    .sort((a, b) => probeScoreCard(b, player, targetLum) - probeScoreCard(a, player, targetLum));

  if (affordable.length > 0) {
    const card = affordable[0];
    const isReserved = player.reservedCardIds.includes(card.id);
    return { type: isReserved ? "purchase_reserved" : "purchase_card", cardId: card.id };
  }

  if (player.reservedCardIds.length < 3) {
    const bestUnaffordable = allCards
      .filter((c) => !canAffordCard(c) && !player.reservedCardIds.includes(c.id))
      .sort((a, b) => probeScoreCard(b, player, targetLum) - probeScoreCard(a, player, targetLum));
    if (bestUnaffordable.length > 0) {
      return { type: "reserve_card", cardId: bestUnaffordable[0].id };
    }
  }

  const totalHeld = CRYSTAL_COLORS.reduce((s, c) => s + player.crystals[c], 0) + player.crystals.flux;
  const remaining = 10 - totalHeld;
  if (remaining <= 0) {
    return chooseAiAction(state, playerId, "hard");
  }

  const available = CRYSTAL_COLORS.filter((c) => state.crystalBank[c] > 0);
  const prioritised = [
    ...reqColors.filter((c) => available.includes(c)),
    ...available.filter((c) => !reqColors.includes(c)),
  ];
  const pick = prioritised.slice(0, Math.min(3, remaining));

  if (pick.length > 0) {
    const crystals: Partial<CrystalCounts> = {};
    for (const c of pick) crystals[c] = 1;
    return { type: "take_three_crystals", crystals };
  }

  for (const c of reqColors) {
    if (state.crystalBank[c] >= 4 && remaining >= 2) {
      return { type: "take_two_crystals", crystal: c };
    }
  }

  return chooseAiAction(state, playerId, "hard");
}

interface ProbeGameResult {
  probeClaimed: boolean;
  claimedAtTurn: number | null;
  finalBonuses: CrystalCounts;
  turns: number;
}

function runProbeGame(playerCount: number, targetLum: LuminaryDef): ProbeGameResult {
  const playerDefs = Array.from({ length: playerCount }, (_, i) => ({
    id: `p${i + 1}`,
    name: i === 0 ? "PROBE" : `AI-${i + 1}`,
  }));

  const state: GameStateData = initializeGame(playerDefs, playerCount);
  const probeId = "p1";

  const claimedAtTurnMap: Record<string, number> = {};
  const claimedByMap: Record<string, string> = {};
  const prevClaimed = new Set<string>();
  let turnsSinceLastProgress = 0;
  let lastTotalLumens = 0;

  function detectNewClaims(): void {
    for (const p of state.players) {
      for (const lumId of p.luminaries) {
        if (!prevClaimed.has(lumId)) {
          claimedAtTurnMap[lumId] = state.turnCount;
          claimedByMap[lumId] = p.playerId;
          prevClaimed.add(lumId);
        }
      }
    }
  }

  for (let turn = 0; turn < MAX_TURNS_PER_GAME; turn++) {
    if (state.phase === "finished") break;

    if (state.pendingSummonEvents && state.pendingSummonEvents.length > 0) {
      for (const evt of [...state.pendingSummonEvents]) {
        applyAction(state, state.players[0].playerId, { type: "resolve_summon", eventId: evt.eventId });
      }
      detectNewClaims();
    }

    const currentPlayer = state.players[state.currentPlayerIndex];
    const isProbe = currentPlayer.playerId === probeId;
    const action = isProbe
      ? chooseProbeAction(state, currentPlayer.playerId, targetLum)
      : chooseAiAction(state, currentPlayer.playerId, "hard");

    const result = applyAction(state, currentPlayer.playerId, action);
    detectNewClaims();

    if (!result.success) {
      let recovered = false;
      for (const color of CRYSTAL_COLORS) {
        if (state.crystalBank[color] > 0) {
          const fb = applyAction(state, currentPlayer.playerId, {
            type: "take_three_crystals",
            crystals: { [color]: 1 },
          });
          if (fb.success) { detectNewClaims(); recovered = true; break; }
        }
      }
      if (!recovered) break;
    }

    const totalLumens = state.players.reduce((s, p) => s + p.lumens, 0);
    if (totalLumens > lastTotalLumens) {
      lastTotalLumens = totalLumens;
      turnsSinceLastProgress = 0;
    } else {
      turnsSinceLastProgress++;
      if (turnsSinceLastProgress > 80) break;
    }
  }

  const probePlayer = state.players.find((p) => p.playerId === probeId)!;
  const probeClaimed =
    targetLum.id in claimedByMap && claimedByMap[targetLum.id] === probeId;

  return {
    probeClaimed,
    claimedAtTurn: probeClaimed ? (claimedAtTurnMap[targetLum.id] ?? null) : null,
    finalBonuses: probePlayer.bonuses,
    turns: state.turnCount,
  };
}

function printProbeReport(
  targetLum: LuminaryDef,
  results: ProbeGameResult[],
  players: number,
): void {
  const claimed = results.filter((r) => r.probeClaimed);
  const missed = results.filter((r) => !r.probeClaimed);
  const games = results.length;
  const claimRate = claimed.length / games;
  const claimTurns = claimed.map((r) => r.claimedAtTurn!);
  const reqColors = CRYSTAL_COLORS.filter((c) => targetLum.requirements[c] > 0);

  console.log(`\n${"═".repeat(64)}`);
  console.log(`  Probe: Can ${targetLum.name} be reached?`);
  console.log(`  Requirement: ${reqSummary(targetLum)}  |  Reward: ${targetLum.lumens}L`);
  console.log(`  Strategy: P1 exclusively builds toward required colors`);
  console.log(`  Games: ${games}  |  Players: ${players}  |  Other AIs: hard`);
  console.log(`${"═".repeat(64)}`);

  console.log(`\n  Claim success rate  : ${claimed.length}/${games} (${(claimRate * 100).toFixed(1)}%)`);
  console.log(`  Avg game length     : ${mean(results.map((r) => r.turns)).toFixed(1)} turns`);

  if (claimTurns.length > 0) {
    const med = median(claimTurns);
    const p25 = percentile(claimTurns, 25);
    const p75 = percentile(claimTurns, 75);
    console.log(
      `  Median claim turn   : t${med.toFixed(0)}  (p25=t${p25.toFixed(0)}, p75=t${p75.toFixed(0)})`,
    );
  }

  console.log(`\n── Final bonus profile (probe player) ───────────────────────────`);

  if (claimed.length > 0) {
    console.log(`  When CLAIMED (n=${claimed.length}):`);
    for (const c of reqColors) {
      const avg = mean(claimed.map((r) => r.finalBonuses[c]));
      const need = targetLum.requirements[c];
      console.log(`    ${COLOR_LABEL[c].padEnd(4)} (${c}): avg ${avg.toFixed(1)} of ${need} required`);
    }
  }

  if (missed.length > 0) {
    console.log(`  When MISSED (n=${missed.length}):`);
    for (const c of reqColors) {
      const avg = mean(missed.map((r) => r.finalBonuses[c]));
      const need = targetLum.requirements[c];
      const shortfall = Math.max(0, need - avg);
      console.log(
        `    ${COLOR_LABEL[c].padEnd(4)} (${c}): avg ${avg.toFixed(1)} of ${need} required  ${shortfall > 0 ? `(avg shortfall ${shortfall.toFixed(1)})` : "✓ met"}`,
      );
    }
  }

  console.log(`\n── Probe Verdict ────────────────────────────────────────────────`);
  if (claimRate >= 0.5) {
    console.log(`  ✓ REACHABLE — claimed in ${(claimRate * 100).toFixed(0)}% of focused games`);
    console.log(`    → Naturally missed because standard AI doesn't focus on these colors.`);
    console.log(`    → Suggestion: strengthen AI color-commitment guidance for this Luminary.`);
  } else if (claimRate > 0) {
    console.log(`  ⚠ CONDITIONALLY REACHABLE — claimed in only ${(claimRate * 100).toFixed(0)}% of focused games`);
    console.log(`    → Even with dedicated pursuit, rarely achieved within typical game length.`);
    console.log(`    → Suggestion: consider lowering requirements by 1–2 per color.`);
  } else {
    console.log(`  ✗ STRUCTURALLY UNREACHABLE — never claimed even with dedicated pursuit`);
    console.log(`    → Requirements cannot be met within typical game length.`);
    console.log(`    → Suggestion: reduce requirements significantly or add more bonus sources.`);
  }
  console.log();
}

// ── JSON export schema ────────────────────────────────────────────────────────

export interface SimLuminaryEntry {
  id: string;
  name: string;
  tier: number;
  tierLabel: string;
  requirements: string;
  claimCount: number;
  claimRatePct: number;
  timing: {
    medianTurn: number | null;
    p25: number | null;
    p75: number | null;
    earlyPct: number | null;
    midPct: number | null;
    latePct: number | null;
    verdict: string;
  };
  histogram: Array<{ bucket: string; count: number; pct: number }>;
}

export interface SimDifficultyResult {
  difficulty: string;
  games: number;
  players: number;
  pacing: {
    avgTurns: number;
    minTurns: number;
    maxTurns: number;
    avgWinnerEminence: number;
    avgClaimsPerGame: number;
    gamesWithClaimsPct: number;
  };
  balance: {
    monoAvgRatePct: number;
    dualAvgRatePct: number;
    tripleAvgRatePct: number;
  };
  tierSummary: Array<{
    tier: number;
    tierLabel: string;
    luminaryCount: number;
    totalClaims: number;
    avgClaimsPerGame: number;
    claimSharePct: number;
  }>;
  luminaries: SimLuminaryEntry[];
  actionDistribution: Array<{ action: string; count: number; sharePct: number }>;
  warnings: string[];
}

export interface SimulationOutput {
  $schema: "luminae-simulation/v1";
  meta: {
    timestamp: string;
    games: number;
    playerCounts: number[];
    difficulties: string[];
  };
  results: SimDifficultyResult[];
}

const TIER_LABELS: Record<number, string> = {
  1: "mono-1L", 2: "mono-2L", 3: "dual-3L", 4: "triple-4L",
};

function buildSimulationJson(allStats: DifficultyStats[]): SimulationOutput {
  const results: SimDifficultyResult[] = allStats.map((s) => {
    const bucketCount = 5;
    const bucketSize = Math.max(1, Math.ceil(s.maxTurns / bucketCount));
    const bucketLabels = Array.from({ length: bucketCount }, (_, i) => {
      const lo = i * bucketSize + 1;
      const hi = (i + 1) * bucketSize;
      return `${lo}–${hi}`;
    });

    const earlyEdge = s.avgTurns / 3;
    const midEdge = (s.avgTurns * 2) / 3;

    const totalActions = Object.values(s.actionCounts).reduce((a, b) => a + b, 0);
    const actionDistribution = Object.entries(s.actionCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([action, count]) => ({
        action,
        count,
        sharePct: totalActions > 0 ? (count / totalActions) * 100 : 0,
      }));

    const sorted = [...LUMINARIES].sort((a, b) => lumTier(a) - lumTier(b));
    const luminaries: SimLuminaryEntry[] = sorted.map((lum) => {
      const tier = lumTier(lum);
      const times = s.claimTurns[lum.id] ?? [];
      const claimCount = times.length;

      let timing: SimLuminaryEntry["timing"];
      if (claimCount === 0) {
        timing = {
          medianTurn: null, p25: null, p75: null,
          earlyPct: null, midPct: null, latePct: null,
          verdict: "never claimed",
        };
      } else {
        const med = median(times);
        const p25v = percentile(times, 25);
        const p75v = percentile(times, 75);
        const earlyN = times.filter((t) => t <= earlyEdge).length;
        const midN = times.filter((t) => t > earlyEdge && t <= midEdge).length;
        const lateN = times.filter((t) => t > midEdge).length;
        timing = {
          medianTurn: med,
          p25: p25v,
          p75: p75v,
          earlyPct: (earlyN / claimCount) * 100,
          midPct: (midN / claimCount) * 100,
          latePct: (lateN / claimCount) * 100,
          verdict:
            earlyN / claimCount >= 0.5
              ? "early/strat"
              : midN / claimCount >= 0.4
                ? "mid-game"
                : "late/incid.",
        };
      }

      const histogram =
        claimCount === 0
          ? []
          : Array.from({ length: bucketCount }, (_, i) => {
              const count = times.filter(
                (t) => t > i * bucketSize && t <= (i + 1) * bucketSize,
              ).length;
              return {
                bucket: bucketLabels[i],
                count,
                pct: (count / claimCount) * 100,
              };
            });

      return {
        id: lum.id,
        name: lum.name,
        tier,
        tierLabel: TIER_LABELS[tier] ?? String(tier),
        requirements: reqSummary(lum),
        claimCount,
        claimRatePct: (claimCount / s.games) * 100,
        timing,
        histogram,
      };
    });

    const totalClaims = Object.values(s.claimedCount).reduce((a, b) => a + b, 0);
    const tierSummary = Object.entries(s.tierGroups)
      .sort((a, b) => +a[0] - +b[0])
      .map(([tier, data]) => ({
        tier: +tier,
        tierLabel: TIER_LABELS[+tier] ?? String(tier),
        luminaryCount: data.count,
        totalClaims: data.claims,
        avgClaimsPerGame: data.claims / s.games,
        claimSharePct: totalClaims > 0 ? (data.claims / totalClaims) * 100 : 0,
      }));

    return {
      difficulty: s.difficulty,
      games: s.games,
      players: s.playerCount,
      pacing: {
        avgTurns: s.avgTurns,
        minTurns: s.minTurns,
        maxTurns: s.maxTurns,
        avgWinnerEminence: s.avgWinLumens,
        avgClaimsPerGame: s.avgClaimsPerGame,
        gamesWithClaimsPct: s.games > 0 ? (s.gamesWithClaims / s.games) * 100 : 0,
      },
      balance: {
        monoAvgRatePct: s.monoAvgRate * 100,
        dualAvgRatePct: s.dualAvgRate * 100,
        tripleAvgRatePct: s.tripleAvgRate * 100,
      },
      tierSummary,
      luminaries,
      actionDistribution,
      warnings: s.warnings,
    };
  });

  return {
    $schema: "luminae-simulation/v1",
    meta: {
      timestamp: new Date().toISOString(),
      games: allStats[0]?.games ?? 0,
      playerCounts: [...new Set(allStats.map((s) => s.playerCount))],
      difficulties: [...new Set(allStats.map((s) => s.difficulty))],
    },
    results,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const { games, difficulties, playerCounts, outputFile, verbose, probe } = parseArgs();
  const playerCountSweep = playerCounts.length > 1;

  // ── Probe mode (highest priority) ─────────────────────────────────────────
  if (probe !== null) {
    const targetLum = LUMINARY_MAP.get(probe);
    if (!targetLum) {
      console.error(`\n  Error: Unknown Luminary ID "${probe}"`);
      console.error(`  Valid IDs: ${LUMINARIES.map((l) => l.id).join(", ")}\n`);
      process.exit(1);
    }

    console.log(`\n${"═".repeat(64)}`);
    console.log(`  Luminae Balance Simulation — Probe Mode`);
    console.log(`  Target  : ${targetLum.name} (${probe})`);
    console.log(`  Games   : ${games}  |  Players: ${playerCounts[0]}`);
    console.log(`${"═".repeat(64)}`);
    console.log(`\n  Running ${games} probe games...`);

    const probeResults: ProbeGameResult[] = [];
    for (let i = 0; i < games; i++) {
      probeResults.push(runProbeGame(playerCounts[0], targetLum));
      if ((i + 1) % 50 === 0) process.stdout.write(`    Progress: ${i + 1}/${games}\r`);
    }
    if (games >= 50) process.stdout.write("\n");

    printProbeReport(targetLum, probeResults, playerCounts[0]);
    return;
  }

  // ── Normal simulation mode ────────────────────────────────────────────────
  console.log(`\n${"═".repeat(64)}`);
  console.log(`  Luminae Balance Simulation`);
  console.log(`  Games: ${games} each  |  Difficulty: ${difficulties.join(", ")}  |  Players: ${playerCounts.join(", ")}${verbose ? "  |  verbose=on" : ""}`);
  console.log(`${"═".repeat(64)}`);

  let outputStats: DifficultyStats[] = [];

  if (playerCountSweep) {
    const difficulty = difficulties[0];
    if (difficulties.length > 1) {
      console.log(
        `\n  ⚠ Note: --difficulty all is ignored when --players all is active.`
        + ` Using difficulty=${difficulty}.`
        + ` To sweep difficulties, omit --players all.`,
      );
    }
    const sweepStats: DifficultyStats[] = [];
    for (const pc of playerCounts) {
      const stats = runDifficulty(difficulty, games, pc, verbose);
      printDifficultyReport(stats);
      sweepStats.push(stats);
    }
    printPlayerCountComparison(sweepStats);
    outputStats = sweepStats;
  } else {
    const players = playerCounts[0];
    const allStats: DifficultyStats[] = [];
    for (const difficulty of difficulties) {
      const stats = runDifficulty(difficulty, games, players, verbose);
      printDifficultyReport(stats);
      allStats.push(stats);
    }

    if (allStats.length > 1) {
      printComparisonTable(allStats);
    } else {
      console.log(`\n${"═".repeat(64)}\n`);
    }
    outputStats = allStats;
  }

  if (outputFile) {
    const output = buildSimulationJson(outputStats);
    writeFileSync(outputFile, JSON.stringify(output, null, 2), "utf8");
    console.log(`  ✓ JSON results written to: ${outputFile}\n`);
  }
}

main();
