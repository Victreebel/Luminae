#!/usr/bin/env tsx
/**
 * Headless AI-vs-AI game simulation for Luminae balance testing.
 *
 * Usage:
 *   pnpm --filter @workspace/api-server run simulate
 *   pnpm --filter @workspace/api-server run simulate -- --games 200 --difficulty hard
 *   pnpm --filter @workspace/api-server run simulate -- --games 200 --difficulty all
 *
 * Reports:
 *   - Per-Luminary claim rates across all games
 *   - Mono vs dual vs triple tier claim distribution
 *   - Average turn counts and winner Eminence
 *   - AI action distribution breakdown
 *   - Side-by-side multi-difficulty comparison when --difficulty all is used
 */

import {
  initializeGame,
  applyAction,
  LUMINARIES,
  LUMINARY_MAP,
  type GameStateData,
} from "../lib/gameEngine.js";
import { chooseAiAction, type AiDifficulty } from "../lib/aiPlayer.js";

// ── CLI args ──────────────────────────────────────────────────────────────────

function parseArgs(): { games: number; difficulties: AiDifficulty[]; players: number } {
  const args = process.argv.slice(2);
  let games = 100;
  let diffArg = "hard";
  let players = 4;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--games" && args[i + 1]) games = parseInt(args[++i], 10);
    if (args[i] === "--difficulty" && args[i + 1]) diffArg = args[++i];
    if (args[i] === "--players" && args[i + 1]) players = parseInt(args[++i], 10);
  }
  const difficulties: AiDifficulty[] =
    diffArg === "all" ? ["easy", "medium", "hard"] : [diffArg as AiDifficulty];
  return { games, difficulties, players };
}

// ── Game simulation ───────────────────────────────────────────────────────────

interface GameResult {
  turnsTotal: number;
  winnerLumens: number;
  luminaryClaims: Record<string, string>; // luminaryId → claimerPlayerId
  actionCounts: Record<string, number>;
  playerFinalLumens: number[];
}

const MAX_TURNS_PER_GAME = 400;

function runOneGame(playerCount: number, difficulty: AiDifficulty): GameResult {
  const playerDefs = Array.from({ length: playerCount }, (_, i) => ({
    id: `p${i + 1}`,
    name: `AI-${i + 1}`,
  }));

  const state: GameStateData = initializeGame(playerDefs, playerCount);

  const actionCounts: Record<string, number> = {};
  let turnsSinceLastProgress = 0;
  let lastTotalLumens = 0;

  for (let turn = 0; turn < MAX_TURNS_PER_GAME; turn++) {
    if (state.phase === "finished") break;

    // Auto-resolve any pending summon events (no client cutscene in simulation)
    if (state.pendingSummonEvents && state.pendingSummonEvents.length > 0) {
      for (const evt of [...state.pendingSummonEvents]) {
        applyAction(state, state.players[0].playerId, {
          type: "resolve_summon",
          eventId: evt.eventId,
        });
      }
    }

    const currentPlayer = state.players[state.currentPlayerIndex];
    const action = chooseAiAction(state, currentPlayer.playerId, difficulty);
    const result = applyAction(state, currentPlayer.playerId, action);

    if (result.success) {
      actionCounts[action.type] = (actionCounts[action.type] ?? 0) + 1;
    } else {
      // Fallback: take any single crystal
      let recovered = false;
      for (const color of ["ruby", "sapphire", "emerald", "onyx", "pearl"] as const) {
        if (state.crystalBank[color] > 0) {
          const fb = applyAction(state, currentPlayer.playerId, {
            type: "take_three_crystals",
            crystals: { [color]: 1 },
          });
          if (fb.success) {
            actionCounts["take_three_crystals"] = (actionCounts["take_three_crystals"] ?? 0) + 1;
            recovered = true;
            break;
          }
        }
      }
      if (!recovered) break;
    }

    // Stall detection: abort if no Eminence progress for 80 turns
    const totalLumens = state.players.reduce((s, p) => s + p.lumens, 0);
    if (totalLumens > lastTotalLumens) {
      lastTotalLumens = totalLumens;
      turnsSinceLastProgress = 0;
    } else {
      turnsSinceLastProgress++;
      if (turnsSinceLastProgress > 80) break;
    }
  }

  // Collect Luminary claims
  const luminaryClaims: Record<string, string> = {};
  for (const p of state.players) {
    for (const lumId of p.luminaries) {
      luminaryClaims[lumId] = p.playerId;
    }
  }

  const winner = state.winnerId
    ? state.players.find((p) => p.playerId === state.winnerId) ?? state.players[0]
    : state.players.reduce((best, p) => (p.lumens > best.lumens ? p : best));

  return {
    turnsTotal: state.turnCount,
    winnerLumens: winner.lumens,
    luminaryClaims,
    actionCounts,
    playerFinalLumens: state.players.map((p) => p.lumens),
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

// ── Single-difficulty report ──────────────────────────────────────────────────

interface DifficultyStats {
  difficulty: AiDifficulty;
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
}

function runDifficulty(difficulty: AiDifficulty, games: number, players: number): DifficultyStats {
  console.log(`\n  Running ${games} games at difficulty=${difficulty} players=${players}...`);
  const results: GameResult[] = [];
  for (let i = 0; i < games; i++) {
    results.push(runOneGame(players, difficulty));
    if ((i + 1) % 50 === 0) process.stdout.write(`    Progress: ${i + 1}/${games}\r`);
  }
  if (games >= 50) process.stdout.write("\n");

  const turns = results.map((r) => r.turnsTotal);
  const winnerLumens = results.map((r) => r.winnerLumens);

  const claimedCount: Record<string, number> = {};
  for (const lum of LUMINARIES) claimedCount[lum.id] = 0;

  let gamesWithClaims = 0;
  const claimsPerGame: number[] = [];
  const totalActionCounts: Record<string, number> = {};

  for (const r of results) {
    const n = Object.keys(r.luminaryClaims).length;
    claimsPerGame.push(n);
    if (n > 0) gamesWithClaims++;
    for (const lumId of Object.keys(r.luminaryClaims)) {
      claimedCount[lumId] = (claimedCount[lumId] ?? 0) + 1;
    }
    for (const [k, v] of Object.entries(r.actionCounts)) {
      totalActionCounts[k] = (totalActionCounts[k] ?? 0) + v;
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

  return {
    difficulty, games, avgTurns, minTurns: Math.min(...turns), maxTurns: Math.max(...turns),
    avgWinLumens, claimedCount, totalClaims, avgClaimsPerGame: mean(claimsPerGame),
    gamesWithClaims, tierGroups, actionCounts: totalActionCounts,
    monoAvgRate, dualAvgRate, tripleAvgRate, warnings,
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
  console.log(`  difficulty=${s.difficulty}  players=4  games=${s.games}`);
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

  console.log("\n── Overall verdicts ─────────────────────────────────────────────");
  for (const s of allStats) {
    const verdict = s.warnings.length === 0 ? "✓ PASS" : `⚠ ${s.warnings.length} warning(s)`;
    console.log(`  ${s.difficulty.padEnd(8)}: ${verdict}`);
  }
  console.log();
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main() {
  const { games, difficulties, players } = parseArgs();

  console.log(`\n${"═".repeat(64)}`);
  console.log(`  Luminae Balance Simulation`);
  console.log(`  Games: ${games} each  |  Difficulty: ${difficulties.join(", ")}  |  Players: ${players}`);
  console.log(`${"═".repeat(64)}`);

  const allStats: DifficultyStats[] = [];
  for (const difficulty of difficulties) {
    const stats = runDifficulty(difficulty, games, players);
    printDifficultyReport(stats);
    allStats.push(stats);
  }

  if (allStats.length > 1) {
    printComparisonTable(allStats);
  } else {
    console.log(`\n${"═".repeat(64)}\n`);
  }
}

main();
