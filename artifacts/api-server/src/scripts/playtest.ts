#!/usr/bin/env tsx
/**
 * Luminary Playtest Harness
 *
 * Extends the existing simulation with per-arrival impact capture:
 *   - Claimer Eminence before / after
 *   - All-player Eminence deltas
 *   - Forge size change from arrival effect
 *   - Artifacts burned per arrival
 *   - Claimer position at claim time (ahead / even / behind)
 *   - Claimer win rate
 *
 * Usage:
 *   pnpm --filter @workspace/api-server tsx ./src/scripts/playtest.ts
 *   pnpm --filter @workspace/api-server tsx ./src/scripts/playtest.ts -- --games 150
 */

import {
  initializeGame,
  applyAction,
  LUMINARY_MAP,
  STANDARD_AFFINITY_KEYS,
  type GameStateData,
  type StandardAffinityKey,
} from "../lib/gameEngine.js";
import { chooseAiAction } from "../lib/aiPlayer.js";

// ── Config ────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const GAMES_EACH = parseInt(args.find((_, i) => args[i - 1] === "--games") ?? "80", 10);
const PLAYER_COUNTS = [2, 3, 4];
const MAX_TURNS = 400;
const PROGRESS_DOT_EVERY = 10;

/** Luminaries the audit flagged as watchlist-priority */
const WATCHLIST = new Set([
  "lum_void", "lum_forge", "lum_ember", "lum_seed", "lum_hunger", "lum_null",
]);

// ── Types ─────────────────────────────────────────────────────────────────────

interface ArrivalRecord {
  gameId:             string;
  playerCount:        number;
  luminaryId:         string;
  claimerId:          string;
  /** turnCount at the moment of claim */
  turn:               number;
  roundNumber:        number;
  /** Claimer Eminence immediately before the action that triggered the arrival. */
  eminenceBefore:          number;
  /** Claimer Eminence after the action and arrival effect. */
  eminenceAfter:           number;
  /** Per-player Eminence delta across the arrival, including its award and effect. */
  eminenceDelta:           Record<string, number>;
  /** Was claimer ahead / tied / behind the field max before arrival? */
  position:           "ahead" | "even" | "behind";
  /** Face-up Artifacts in the Forge before the action. */
  forgeBefore:       number;
  /** Face-up Artifacts in the Forge after the action. */
  forgeAfter:        number;
  /** Cards added to burn pile by this action */
  burnsThisAction:    number;
  /** Filled after game ends */
  claimerWon:         boolean;
  winnerEminence:          number;
  gameTurns:          number;
}

interface GameRecord {
  gameId:     string;
  players:    number;
  turns:      number;
  winnerId:   string;
  winnerEminence:  number;
  active:     string[];        // active luminary IDs
  arrivals:   ArrivalRecord[];
  abandoned:  boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function forgeSize(s: GameStateData): number {
  return s.forgeTier1.length + s.forgeTier2.length + s.forgeTier3.length;
}

function eminenceMap(s: GameStateData): Record<string, number> {
  const m: Record<string, number> = {};
  for (const p of s.players) m[p.playerId] = p.eminence;
  return m;
}

function position(
  claimerId: string,
  before: Record<string, number>,
): "ahead" | "even" | "behind" {
  const mine = before[claimerId] ?? 0;
  const others = Object.entries(before)
    .filter(([id]) => id !== claimerId)
    .map(([, v]) => v);
  const maxOther = others.length > 0 ? Math.max(...others) : 0;
  if (mine > maxOther) return "ahead";
  if (mine === maxOther) return "even";
  return "behind";
}

/** Auto-resolve all pending cutscene events. Safe to call repeatedly. */
function drainEvents(state: GameStateData, anyId: string): void {
  // Multi-luminary choice: pick candidates in existing order
  let safety = 0;
  while ((state as any).pendingLuminaryChoice && safety++ < 20) {
    const ch = (state as any).pendingLuminaryChoice as
      { playerId: string; candidates: string[] } | null;
    if (!ch) break;
    applyAction(state, ch.playerId, {
      type: "choose_luminary_order",
      orderedIds: ch.candidates,
    });
  }
  // Arrival cutscene events
  safety = 0;
  while ((state.pendingSummonEvents ?? []).length > 0 && safety++ < 40) {
    const evId = state.pendingSummonEvents[0]?.eventId;
    if (!evId) break;
    applyAction(state, anyId, { type: "resolve_summon", eventId: evId });
  }
  // Activation cinematics
  safety = 0;
  while ((state.pendingLuminaryActivationEvents ?? []).length > 0 && safety++ < 40) {
    const ev = state.pendingLuminaryActivationEvents[0];
    if (!ev?.eventId) break;
    applyAction(state, anyId, { type: "resolve_luminary_activation", eventId: ev.eventId });
  }
}

// ── Single-game runner ────────────────────────────────────────────────────────

function runGame(gameId: string, playerCount: number): GameRecord {
  const defs = Array.from({ length: playerCount }, (_, i) => ({
    id: `p${i}`,
    name: `AI${i + 1}`,
  }));
  const state = initializeGame(defs, playerCount);
  drainEvents(state, "p0");

  const arrivals: ArrivalRecord[] = [];
  const knownArrivals = new Set<string>();  // "lumId::ownerId"
  let turnsSinceProgress = 0;
  let lastTotalEminence = 0;
  let totalTurns = 0;
  let abandoned = false;

  for (let t = 0; t < MAX_TURNS; t++) {
    if (state.phase === "finished") break;

    drainEvents(state, state.players[state.currentPlayerIndex]?.playerId ?? "p0");
    if ((state.phase as string) === "finished") break;

    const cp = state.players[state.currentPlayerIndex];
    if (!cp) break;

    // ── Snapshot BEFORE action ──────────────────────────────────────────────
    const eminenceBefore = eminenceMap(state);
    const snapForgeSize      = forgeSize(state);
    const snapBurnLen  = (state.burnPile ?? []).length;
    const snapArrivals = new Set(knownArrivals);

    // ── AI acts ─────────────────────────────────────────────────────────────
    const action = chooseAiAction(state, cp.playerId, "hard");
    const res    = applyAction(state, cp.playerId, action);

    if (!res.success) {
      // Fallback: Harness one available Affinity.
      let recovered = false;
      for (const c of STANDARD_AFFINITY_KEYS) {
        if (state.affinityWell[c] > 0) {
          const fb = applyAction(state, cp.playerId, {
            type: "harness_three_affinities",
            affinities: { [c]: 1 },
          });
          if (fb.success) { recovered = true; break; }
        }
      }
      if (!recovered) break;
    }

    drainEvents(state, cp.playerId);
    totalTurns = state.turnCount;

    // ── Detect new Luminary arrivals ──────────────────────────────────────
    // luminaryAffinities is the authoritative per-luminary-per-owner record
    for (const la of state.luminaryAffinities ?? []) {
      const key = `${la.luminaryId}::${la.ownerId}`;
      if (snapArrivals.has(key)) continue;        // already known
      knownArrivals.add(key);

      const lum = LUMINARY_MAP.get(la.luminaryId);
      if (!lum) continue;

      const eminenceAfter = eminenceMap(state);
      const delta: Record<string, number> = {};
      for (const p of state.players) {
        delta[p.playerId] = (eminenceAfter[p.playerId] ?? 0) - (eminenceBefore[p.playerId] ?? 0);
      }

      arrivals.push({
        gameId,
        playerCount,
        luminaryId:       la.luminaryId,
        claimerId:        la.ownerId,
        turn:             state.turnCount,
        roundNumber:      state.roundNumber,
        eminenceBefore:        eminenceBefore[la.ownerId] ?? 0,
        eminenceAfter:         eminenceAfter[la.ownerId] ?? 0,
        eminenceDelta:         delta,
        position:         position(la.ownerId, eminenceBefore),
        forgeBefore:     snapForgeSize,
        forgeAfter:      forgeSize(state),
        burnsThisAction:  Math.max(0, (state.burnPile ?? []).length - snapBurnLen),
        // filled post-game:
        claimerWon: false,
        winnerEminence:  0,
        gameTurns:  0,
      });
    }

    // ── Stall detector ──────────────────────────────────────────────────────
    const tot = state.players.reduce((s, p) => s + p.eminence, 0);
    if (tot > lastTotalEminence) { lastTotalEminence = tot; turnsSinceProgress = 0; }
    else if (++turnsSinceProgress > 80) { abandoned = true; break; }
  }

  // Determine winner
  const winner = state.winnerId
    ? state.players.find((p) => p.playerId === state.winnerId) ?? state.players[0]
    : state.players.reduce((b, p) =>
        p.eminence > b.eminence || (p.eminence === b.eminence && p.forgedArtifactIds.length < b.forgedArtifactIds.length)
          ? p : b);

  for (const a of arrivals) {
    a.claimerWon = a.claimerId === winner.playerId;
    a.winnerEminence   = winner.eminence;
    a.gameTurns   = totalTurns;
  }

  return {
    gameId,
    players: playerCount,
    turns: totalTurns,
    winnerId: winner.playerId,
    winnerEminence: winner.eminence,
    active: [...state.activeLuminaries],
    arrivals,
    abandoned,
  };
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

interface LumStats {
  id:                  string;
  name:                string;
  eminenceAward:          number;   // Eminence awarded by the Luminary definition
  gamesActive:         number;
  arrivalCount:      number;
  arrivalRate:       number;
  avgTurn:           number;
  avgRound:          number;
  avgEminenceBefore:      number;
  avgClaimerDelta:   number;   // claimer Eminence change at arrival
  avgOpponentDelta:  number;   // average per-opponent Eminence change
  avgForgeRemoved:  number;
  avgBurns:          number;
  posAhead:          number;
  posEven:           number;
  posBehind:         number;
  winnerWasClaimer:  number;
  claimerWinRate:    number;
  watchlist:         boolean;
}

function aggregate(games: GameRecord[]): LumStats[] {
  const active    = new Map<string, number>();
  const obsByLum  = new Map<string, ArrivalRecord[]>();

  for (const g of games) {
    for (const id of g.active) active.set(id, (active.get(id) ?? 0) + 1);
    for (const a of g.arrivals) {
      if (!obsByLum.has(a.luminaryId)) obsByLum.set(a.luminaryId, []);
      obsByLum.get(a.luminaryId)!.push(a);
    }
  }

  const stats: LumStats[] = [];

  for (const [lumId, gamesAct] of active) {
    const lum  = LUMINARY_MAP.get(lumId);
    if (!lum) continue;
    const obs  = obsByLum.get(lumId) ?? [];
    const n    = obs.length;
    const avg  = (fn: (o: ArrivalRecord) => number) =>
      n === 0 ? 0 : obs.reduce((s, o) => s + fn(o), 0) / n;

    const avgOpp = n === 0 ? 0 : obs.reduce((sum, o) => {
      const opps = Object.entries(o.eminenceDelta)
        .filter(([pid]) => pid !== o.claimerId)
        .map(([, d]) => d);
      return sum + (opps.length > 0 ? opps.reduce((a, b) => a + b, 0) / opps.length : 0);
    }, 0) / n;

    const posA  = obs.filter((o) => o.position === "ahead").length;
    const posE  = obs.filter((o) => o.position === "even").length;
    const posB  = obs.filter((o) => o.position === "behind").length;
    const wins  = obs.filter((o) => o.claimerWon).length;

    stats.push({
      id:                lumId,
      name:              lum.name,
      eminenceAward:          lum.eminence,
      gamesActive:       gamesAct,
      arrivalCount:      n,
      arrivalRate:       gamesAct > 0 ? n / gamesAct : 0,
      avgTurn:           avg((o) => o.turn),
      avgRound:          avg((o) => o.roundNumber),
      avgEminenceBefore:      avg((o) => o.eminenceBefore),
      avgClaimerDelta:   avg((o) => o.eminenceDelta[o.claimerId] ?? 0),
      avgOpponentDelta:  avgOpp,
      avgForgeRemoved:  avg((o) => o.forgeBefore - o.forgeAfter),
      avgBurns:          avg((o) => o.burnsThisAction),
      posAhead:          posA,
      posEven:           posE,
      posBehind:         posB,
      winnerWasClaimer:  wins,
      claimerWinRate:    n > 0 ? wins / n : 0,
      watchlist:         WATCHLIST.has(lumId),
    });
  }

  return stats.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Report ────────────────────────────────────────────────────────────────────

type Verdict   = "Too Weak" | "Fair" | "Strong" | "Very Strong" | "Swingy" | "No Data";
type FeelVerdict = "Yes" | "Some" | "Low" | "None";

function powerVerdict(s: LumStats): Verdict {
  if (s.arrivalCount < 3) return "No Data";
  const sd = s.avgClaimerDelta;
  const od = s.avgOpponentDelta;
  // Swing = big positive self AND big negative opponents
  if (sd >= 4 && od <= -2) return "Very Strong";
  if (sd >= 3 || (sd >= 2 && od <= -1.5)) return "Strong";
  if (sd <= 0.5 && od >= -0.5 && s.avgBurns < 0.5) return "Too Weak";
  if (sd <= 1 && s.avgBurns < 0.5 && s.avgForgeRemoved < 0.5) return "Too Weak";
  return "Fair";
}

function confusionVerdict(s: LumStats): FeelVerdict {
  // Proxy: complex effects (multi-turn, hidden state) = higher confusion
  const id = s.id;
  if (["lum_seed", "lum_radiant", "lum_bloom"].includes(id)) return "Some";
  if (["lum_compass", "lum_ember", "lum_null"].includes(id)) return "Some";
  if (["lum_hunger"].includes(id)) return "Yes";  // wrong description
  return "Low";
}

function frustrationVerdict(s: LumStats): FeelVerdict {
  if (s.avgBurns >= 3 || s.avgForgeRemoved >= 3) return "Yes";
  if (s.avgOpponentDelta <= -2) return "Yes";
  if (s.avgBurns >= 1.5 || s.avgForgeRemoved >= 1.5) return "Some";
  if (s.avgOpponentDelta <= -1) return "Some";
  return "Low";
}

type Action =
  | "Leave unchanged"
  | "Clarify wording"
  | "Adjust number"
  | "Adjust duration"
  | "Redesign"
  | "Needs more data";

function actionVerdict(s: LumStats, power: Verdict): Action {
  if (s.arrivalCount < 3) return "Needs more data";
  if (s.id === "lum_hunger") return "Clarify wording";  // wrong description confirmed
  if (s.id === "lum_radiant" && s.arrivalRate < 0.05) return "Adjust number";
  if (s.id === "lum_tide" && power === "Too Weak") return "Adjust number";
  if (s.id === "lum_orchard" && power === "Too Weak") return "Adjust number";
  if (s.id === "lum_seed") return "Redesign";
  if (s.id === "lum_null" && power === "Too Weak") return "Adjust number";
  if (s.id === "lum_bloom") return "Adjust number";
  if (s.id === "lum_compass") return "Clarify wording";
  if (power === "Very Strong") return "Adjust number";
  if (power === "Too Weak") return "Adjust number";
  return "Leave unchanged";
}

function reqStr(id: string): string {
  const r = LUMINARY_MAP.get(id)?.requirements;
  if (!r) return "?";
  const parts: string[] = [];
  const labels: Record<StandardAffinityKey, string> = {
    flare: "Fl", continuum: "Co", verdance: "Ve", abyss: "Ab", radiance: "Ra",
  };
  for (const c of STANDARD_AFFINITY_KEYS) if (r[c] > 0) parts.push(`${r[c]}${labels[c]}`);
  return parts.join("+");
}

function f1(n: number): string { return n.toFixed(1); }
function f2(n: number): string { return n.toFixed(2); }
function pctStr(n: number): string { return `${(n * 100).toFixed(0)}%`; }
function sign(n: number): string { return (n >= 0 ? "+" : "") + f2(n); }

// Pad to exactly `len` chars for table alignment
function pad(s: string, len: number): string {
  return s.length >= len ? s.slice(0, len) : s + " ".repeat(len - s.length);
}

function printReport(allGames: GameRecord[]): void {
  const stats     = aggregate(allGames);
  const total     = allGames.length;
  const abandoned = allGames.filter((g) => g.abandoned).length;
  const totalArrivals = allGames.reduce((s, g) => s + g.arrivals.length, 0);

  // ── Header ────────────────────────────────────────────────────────────────
  console.log();
  console.log("═".repeat(120));
  console.log("  LUMINAE LUMINARY PLAYTEST SIMULATION REPORT");
  console.log(`  ${total} games  ·  ${GAMES_EACH}×2p / ${GAMES_EACH}×3p / ${GAMES_EACH}×4p  ·  all AI hard`);
  console.log(`  ${totalArrivals} total Luminary arrival events recorded`);
  if (abandoned > 0) console.log(`  ⚠  ${abandoned} game(s) abandoned at ${MAX_TURNS}-turn safety limit`);
  console.log("═".repeat(120));

  // ── Game rhythm ───────────────────────────────────────────────────────────
  console.log("\n── GAME RHYTHM ───────────────────────────────────────────────────────────────────────────");
  console.log(pad("Players", 10) + pad("Avg turns", 12) + pad("Avg win Eminence", 18) + "Avg arrivals/game");
  console.log("─".repeat(50));
  for (const pc of PLAYER_COUNTS) {
    const g = allGames.filter((x) => x.players === pc);
    if (g.length === 0) continue;
    const avgT  = g.reduce((s, x) => s + x.turns, 0) / g.length;
    const avgW  = g.reduce((s, x) => s + x.winnerEminence, 0) / g.length;
    const avgS  = g.reduce((s, x) => s + x.arrivals.length, 0) / g.length;
    console.log(pad(`${pc}p (${g.length} games)`, 10) + pad(f1(avgT), 12) + pad(f1(avgW), 14) + f1(avgS));
  }

  // ── Main table ────────────────────────────────────────────────────────────
  console.log("\n── LUMINARY PLAYTEST TABLE ───────────────────────────────────────────────────────────────");
  const H = [
    pad("Luminary", 22),
    pad("Cost", 10),
    pad("Appeared?", 11),
    pad("Felt (power)", 14),
    pad("Confusion?", 12),
    pad("Frustration?", 14),
    pad("Notes (key numbers)", 42),
    "Suggested action",
  ].join("");
  console.log(H);
  console.log("─".repeat(140));

  for (const s of stats) {
    const power   = powerVerdict(s);
    const conf    = confusionVerdict(s);
    const frust   = frustrationVerdict(s);
    const action  = actionVerdict(s, power);
    const appeared = s.arrivalCount > 0
      ? `Yes (${s.arrivalCount}×, ${pctStr(s.arrivalRate)})`
      : `No (0/${s.gamesActive})`;

    let notes = "";
    if (s.arrivalCount === 0) {
      notes = `Never arrived in ${s.gamesActive} active games`;
    } else {
      const parts: string[] = [];
      parts.push(`avg rnd ${f1(s.avgRound)}`);
      parts.push(`Δself ${sign(s.avgClaimerDelta)}`);
      if (Math.abs(s.avgOpponentDelta) >= 0.1) parts.push(`Δopp ${sign(s.avgOpponentDelta)}`);
      if (s.avgBurns >= 0.3)         parts.push(`burns ${f1(s.avgBurns)}`);
      if (s.avgForgeRemoved >= 0.3) parts.push(`Forge-${f1(s.avgForgeRemoved)}`);
      parts.push(`win% ${pctStr(s.claimerWinRate)}`);
      const posStr = `${s.posAhead}A/${s.posEven}E/${s.posBehind}B`;
      parts.push(`pos ${posStr}`);
      notes = parts.join("  ");
    }

    const star = s.watchlist ? "★ " : "  ";
    console.log([
      pad(star + s.name, 22),
      pad(reqStr(s.id), 10),
      pad(appeared, 11),
      pad(power, 14),
      pad(conf, 12),
      pad(frust, 14),
      pad(notes, 42),
      action,
    ].join(""));
  }

  // ── Watchlist deep dive ────────────────────────────────────────────────────
  const wl = stats.filter((s) => s.watchlist && s.arrivalCount > 0);
  if (wl.length > 0) {
    console.log("\n── WATCHLIST DEEP DIVE ───────────────────────────────────────────────────────────────────");
    for (const s of wl) {
      console.log(`\n  ★ ${s.name}  (${s.id})`);
      console.log(`    Arrived ${s.arrivalCount}× in ${s.gamesActive} active games  (${pctStr(s.arrivalRate)} claim rate)`);
      console.log(`    Avg round at arrival   : ${f1(s.avgRound)}    Avg Eminence before: ${f1(s.avgEminenceBefore)}`);
      console.log(`    Claimer Eminence delta : ${sign(s.avgClaimerDelta)}   (declared award ${s.eminenceAward})`);
      console.log(`    Avg opponent Eminence delta: ${sign(s.avgOpponentDelta)} per opponent`);
      console.log(`    Avg Forge Artifacts removed: ${f2(s.avgForgeRemoved)}    Avg burns: ${f2(s.avgBurns)}`);
      console.log(`    Claimer position      : ${s.posAhead} ahead / ${s.posEven} even / ${s.posBehind} behind`);
      console.log(`    Claimer win rate      : ${pctStr(s.claimerWinRate)}  (${s.winnerWasClaimer}/${s.arrivalCount} games)`);
    }
  }

  // ── Void Warden by player count ───────────────────────────────────────────
  console.log("\n── VOID WARDEN BY PLAYER COUNT ──────────────────────────────────────────────────────────");
  for (const pc of PLAYER_COUNTS) {
    const voidObs = allGames
      .filter((g) => g.players === pc)
      .flatMap((g) => g.arrivals.filter((a) => a.luminaryId === "lum_void"));
    if (voidObs.length === 0) { console.log(`  ${pc}p: not arrived`); continue; }
    const avgSelf  = voidObs.reduce((s, o) => s + (o.eminenceDelta[o.claimerId] ?? 0), 0) / voidObs.length;
    const avgOppTotal = voidObs.reduce((sum, o) => {
      const opps = Object.entries(o.eminenceDelta)
        .filter(([pid]) => pid !== o.claimerId)
        .map(([, d]) => d);
      return sum + opps.reduce((a, b) => a + b, 0);
    }, 0) / voidObs.length;
    const netSwing = avgOppTotal - avgSelf;
    console.log(
      `  ${pc}p (${voidObs.length} arrivals)` +
      `  self Δ=${sign(avgSelf)}` +
      `  total opp Δ=${sign(avgOppTotal)}` +
      `  net relative swing vs leader=${sign(netSwing)}`
    );
  }

  // ── Burn leaders ──────────────────────────────────────────────────────────
  console.log("\n── BURN LEADERS (avg burns per arrival, ranked) ──────────────────────────────────────────");
  const burners = stats
    .filter((s) => s.arrivalCount > 0 && s.avgBurns > 0)
    .sort((a, b) => b.avgBurns - a.avgBurns);
  for (const s of burners) {
    console.log(`  ${pad(s.name, 24)} ${f2(s.avgBurns)} burns/arrival  Forge-${f2(s.avgForgeRemoved)}`);
  }

  // ── Summoner win rate ranked ──────────────────────────────────────────────
  console.log("\n── CLAIMER WIN RATE RANKED (min 5 arrivals) ─────────────────────────────────────────────");
  const winRanked = stats
    .filter((s) => s.arrivalCount >= 5)
    .sort((a, b) => b.claimerWinRate - a.claimerWinRate);
  for (const s of winRanked) {
    const bar = "█".repeat(Math.round(s.claimerWinRate * 20));
    console.log(
      `  ${pad(s.name, 24)} ${pctStr(s.claimerWinRate).padStart(5)}  ${bar}`
    );
  }

  // ── Never-arrived ────────────────────────────────────────────────────────
  const never = stats.filter((s) => s.arrivalCount === 0);
  if (never.length > 0) {
    console.log("\n── NEVER ARRIVED ───────────────────────────────────────────────────────────────────────");
    for (const s of never) {
      console.log(`  ${s.name}  (cost ${reqStr(s.id)}, ${s.eminenceAward} Eminence)  active in ${s.gamesActive} games`);
    }
  }

  // ── Final verdict table ───────────────────────────────────────────────────
  console.log("\n── FINAL VERDICT TABLE ──────────────────────────────────────────────────────────────────");
  console.log(
    pad("Luminary", 24) +
    pad("Appeared?", 8) +
    pad("Too weak / Fair / Too strong", 30) +
    pad("Confusion?", 12) +
    pad("Frustration?", 14) +
    "Notes  |  Suggested action"
  );
  console.log("─".repeat(130));

  for (const s of stats) {
    const power   = powerVerdict(s);
    const conf    = confusionVerdict(s);
    const frust   = frustrationVerdict(s);
    const action  = actionVerdict(s, power);
    const appeared = s.arrivalCount > 0 ? "Yes" : "No";
    const star    = s.watchlist ? "★ " : "  ";

    let shortNotes = "";
    if (s.arrivalCount === 0) {
      shortNotes = `Not once in ${s.gamesActive} games`;
    } else {
      shortNotes = `Δself${sign(s.avgClaimerDelta)} Δopp${sign(s.avgOpponentDelta)} win${pctStr(s.claimerWinRate)} r${f1(s.avgRound)}`;
    }

    console.log([
      pad(star + s.name, 24),
      pad(appeared, 8),
      pad(power, 30),
      pad(conf, 12),
      pad(frust, 14),
      shortNotes.padEnd(42) + "  |  " + action,
    ].join(""));
  }

  console.log("\n" + "═".repeat(120) + "\n");
}

// ── Main ──────────────────────────────────────────────────────────────────────

function main(): void {
  const totalGames = GAMES_EACH * PLAYER_COUNTS.length;
  console.log(`\nLuminae Luminary Playtest Harness`);
  console.log(`Running ${totalGames} games (${GAMES_EACH} × ${PLAYER_COUNTS.join("p / ")}p)…\n`);

  const allGames: GameRecord[] = [];

  for (const pc of PLAYER_COUNTS) {
    process.stdout.write(`  ${pc}p: `);
    for (let i = 0; i < GAMES_EACH; i++) {
      const g = runGame(`${pc}p-${String(i + 1).padStart(3, "0")}`, pc);
      allGames.push(g);
      if ((i + 1) % PROGRESS_DOT_EVERY === 0) process.stdout.write("·");
    }
    process.stdout.write(` done (${GAMES_EACH} games)\n`);
  }

  printReport(allGames);
}

main();
