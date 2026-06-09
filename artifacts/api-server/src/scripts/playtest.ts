#!/usr/bin/env tsx
/**
 * Luminary Playtest Harness
 *
 * Extends the existing simulation with per-summon impact capture:
 *   - Summoner score before / after
 *   - All-player Eminence deltas
 *   - Market size change from summon effect
 *   - Cards burned per summon
 *   - Summoner position at claim time (ahead / even / behind)
 *   - Summoner win rate
 *
 * Usage:
 *   pnpm --filter @workspace/api-server tsx ./src/scripts/playtest.ts
 *   pnpm --filter @workspace/api-server tsx ./src/scripts/playtest.ts -- --games 150
 */

import {
  initializeGame,
  applyAction,
  LUMINARIES,
  LUMINARY_MAP,
  CRYSTAL_COLORS,
  type GameStateData,
  type PlayerGameState,
  type CrystalColor,
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

interface SummonRecord {
  gameId:             string;
  playerCount:        number;
  luminaryId:         string;
  summonerId:         string;
  /** turnCount at the moment of claim */
  turn:               number;
  roundNumber:        number;
  /** Summoner lumens immediately BEFORE the action that triggered the summon */
  emnBefore:          number;
  /** Summoner lumens AFTER the action (summon effect applied) */
  emnAfter:           number;
  /** Per-player Emn delta across the summon (includes summon award + effect) */
  emnDelta:           Record<string, number>;
  /** Was summoner ahead / tied / behind the field max before summon? */
  position:           "ahead" | "even" | "behind";
  /** Face-up market cards before the action */
  marketBefore:       number;
  /** Face-up market cards after the action */
  marketAfter:        number;
  /** Cards added to burn pile by this action */
  burnsThisAction:    number;
  /** Filled after game ends */
  summonerWon:        boolean;
  winnerEmn:          number;
  gameTurns:          number;
}

interface GameRecord {
  gameId:     string;
  players:    number;
  turns:      number;
  winnerId:   string;
  winnerEmn:  number;
  active:     string[];        // active luminary IDs
  summons:    SummonRecord[];
  abandoned:  boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function mktSize(s: GameStateData): number {
  return s.marketTier1.length + s.marketTier2.length + s.marketTier3.length;
}

function scoreMap(s: GameStateData): Record<string, number> {
  const m: Record<string, number> = {};
  for (const p of s.players) m[p.playerId] = p.lumens;
  return m;
}

function position(
  summonerId: string,
  before: Record<string, number>,
): "ahead" | "even" | "behind" {
  const mine = before[summonerId] ?? 0;
  const others = Object.entries(before)
    .filter(([id]) => id !== summonerId)
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
      order: ch.candidates,
    });
  }
  // Summon cutscene events
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

  const summons: SummonRecord[] = [];
  const knownSummons = new Set<string>();  // "lumId::ownerId"
  let turnsSinceProgress = 0;
  let lastTotalLumens = 0;
  let totalTurns = 0;
  let abandoned = false;

  for (let t = 0; t < MAX_TURNS; t++) {
    if (state.phase === "finished") break;

    drainEvents(state, state.players[state.currentPlayerIndex]?.playerId ?? "p0");
    if (state.phase === "finished") break;

    const cp = state.players[state.currentPlayerIndex];
    if (!cp) break;

    // ── Snapshot BEFORE action ──────────────────────────────────────────────
    const snapScores   = scoreMap(state);
    const snapMkt      = mktSize(state);
    const snapBurnLen  = (state.burnPile ?? []).length;
    const snapSummons  = new Set(knownSummons);

    // ── AI acts ─────────────────────────────────────────────────────────────
    const action = chooseAiAction(state, cp.playerId, "hard");
    const res    = applyAction(state, cp.playerId, action);

    if (!res.success) {
      // Fallback: harvest one crystal of whatever's available
      let recovered = false;
      for (const c of CRYSTAL_COLORS) {
        if (state.crystalBank[c] > 0) {
          const fb = applyAction(state, cp.playerId, {
            type: "take_three_crystals",
            crystals: { [c]: 1 },
          });
          if (fb.success) { recovered = true; break; }
        }
      }
      if (!recovered) break;
    }

    drainEvents(state, cp.playerId);
    totalTurns = state.turnCount;

    // ── Detect new Luminary summons ─────────────────────────────────────────
    // luminaryAffinities is the authoritative per-luminary-per-owner record
    for (const la of state.luminaryAffinities ?? []) {
      const key = `${la.luminaryId}::${la.ownerId}`;
      if (snapSummons.has(key)) continue;        // already known
      knownSummons.add(key);

      const lum = LUMINARY_MAP.get(la.luminaryId);
      if (!lum) continue;

      const afterScores = scoreMap(state);
      const delta: Record<string, number> = {};
      for (const p of state.players) {
        delta[p.playerId] = (afterScores[p.playerId] ?? 0) - (snapScores[p.playerId] ?? 0);
      }

      summons.push({
        gameId,
        playerCount,
        luminaryId:       la.luminaryId,
        summonerId:       la.ownerId,
        turn:             state.turnCount,
        roundNumber:      state.roundNumber,
        emnBefore:        snapScores[la.ownerId] ?? 0,
        emnAfter:         afterScores[la.ownerId] ?? 0,
        emnDelta:         delta,
        position:         position(la.ownerId, snapScores),
        marketBefore:     snapMkt,
        marketAfter:      mktSize(state),
        burnsThisAction:  Math.max(0, (state.burnPile ?? []).length - snapBurnLen),
        // filled post-game:
        summonerWon: false,
        winnerEmn:   0,
        gameTurns:   0,
      });
    }

    // ── Stall detector ──────────────────────────────────────────────────────
    const tot = state.players.reduce((s, p) => s + p.lumens, 0);
    if (tot > lastTotalLumens) { lastTotalLumens = tot; turnsSinceProgress = 0; }
    else if (++turnsSinceProgress > 80) { abandoned = true; break; }
  }

  // Determine winner
  const winner = state.winnerId
    ? state.players.find((p) => p.playerId === state.winnerId) ?? state.players[0]
    : state.players.reduce((b, p) =>
        p.lumens > b.lumens || (p.lumens === b.lumens && p.purchasedCardIds.length < b.purchasedCardIds.length)
          ? p : b);

  for (const s of summons) {
    s.summonerWon = s.summonerId === winner.playerId;
    s.winnerEmn   = winner.lumens;
    s.gameTurns   = totalTurns;
  }

  return {
    gameId,
    players: playerCount,
    turns: totalTurns,
    winnerId: winner.playerId,
    winnerEmn: winner.lumens,
    active: [...state.activeLuminaries],
    summons,
    abandoned,
  };
}

// ── Aggregate ─────────────────────────────────────────────────────────────────

interface LumStats {
  id:                  string;
  name:                string;
  emnAward:            number;   // lumens field from LUMINARY_MAP
  gamesActive:         number;
  summonCount:         number;
  summonRate:          number;
  avgTurn:             number;
  avgRound:            number;
  avgEmnBefore:        number;
  avgSummonerDelta:    number;   // summoner EMN change at summon (award + effect on self)
  avgOpponentDelta:    number;   // avg per-opponent EMN change (often negative for disruptive lums)
  avgMarketRemoved:    number;
  avgBurns:            number;
  posAhead:            number;
  posEven:             number;
  posBehind:           number;
  winnerWasSummoner:   number;
  summonerWinRate:     number;
  watchlist:           boolean;
}

function aggregate(games: GameRecord[]): LumStats[] {
  const active    = new Map<string, number>();
  const obsByLum  = new Map<string, SummonRecord[]>();

  for (const g of games) {
    for (const id of g.active) active.set(id, (active.get(id) ?? 0) + 1);
    for (const s of g.summons) {
      if (!obsByLum.has(s.luminaryId)) obsByLum.set(s.luminaryId, []);
      obsByLum.get(s.luminaryId)!.push(s);
    }
  }

  const stats: LumStats[] = [];

  for (const [lumId, gamesAct] of active) {
    const lum  = LUMINARY_MAP.get(lumId);
    if (!lum) continue;
    const obs  = obsByLum.get(lumId) ?? [];
    const n    = obs.length;
    const avg  = (fn: (o: SummonRecord) => number) =>
      n === 0 ? 0 : obs.reduce((s, o) => s + fn(o), 0) / n;

    const avgOpp = n === 0 ? 0 : obs.reduce((sum, o) => {
      const opps = Object.entries(o.emnDelta)
        .filter(([pid]) => pid !== o.summonerId)
        .map(([, d]) => d);
      return sum + (opps.length > 0 ? opps.reduce((a, b) => a + b, 0) / opps.length : 0);
    }, 0) / n;

    const posA  = obs.filter((o) => o.position === "ahead").length;
    const posE  = obs.filter((o) => o.position === "even").length;
    const posB  = obs.filter((o) => o.position === "behind").length;
    const wins  = obs.filter((o) => o.summonerWon).length;

    stats.push({
      id:                 lumId,
      name:               lum.name,
      emnAward:           lum.lumens,
      gamesActive:        gamesAct,
      summonCount:        n,
      summonRate:         gamesAct > 0 ? n / gamesAct : 0,
      avgTurn:            avg((o) => o.turn),
      avgRound:           avg((o) => o.roundNumber),
      avgEmnBefore:       avg((o) => o.emnBefore),
      avgSummonerDelta:   avg((o) => o.emnDelta[o.summonerId] ?? 0),
      avgOpponentDelta:   avgOpp,
      avgMarketRemoved:   avg((o) => o.marketBefore - o.marketAfter),
      avgBurns:           avg((o) => o.burnsThisAction),
      posAhead:           posA,
      posEven:            posE,
      posBehind:          posB,
      winnerWasSummoner:  wins,
      summonerWinRate:    n > 0 ? wins / n : 0,
      watchlist:          WATCHLIST.has(lumId),
    });
  }

  return stats.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Report ────────────────────────────────────────────────────────────────────

type Verdict   = "Too Weak" | "Fair" | "Strong" | "Very Strong" | "Swingy" | "No Data";
type FeelVerdict = "Yes" | "Some" | "Low" | "None";

function powerVerdict(s: LumStats): Verdict {
  if (s.summonCount < 3) return "No Data";
  const sd = s.avgSummonerDelta;
  const od = s.avgOpponentDelta;
  const wr = s.summonerWinRate;
  // Swing = big positive self AND big negative opponents
  if (sd >= 4 && od <= -2) return "Very Strong";
  if (sd >= 3 || (sd >= 2 && od <= -1.5)) return "Strong";
  if (sd <= 0.5 && od >= -0.5 && s.avgBurns < 0.5) return "Too Weak";
  if (sd <= 1 && s.avgBurns < 0.5 && s.avgMarketRemoved < 0.5) return "Too Weak";
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
  if (s.avgBurns >= 3 || s.avgMarketRemoved >= 3) return "Yes";
  if (s.avgOpponentDelta <= -2) return "Yes";
  if (s.avgBurns >= 1.5 || s.avgMarketRemoved >= 1.5) return "Some";
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
  if (s.summonCount < 3) return "Needs more data";
  if (s.id === "lum_hunger") return "Clarify wording";  // wrong description confirmed
  if (s.id === "lum_radiant" && s.summonRate < 0.05) return "Adjust number";
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
  const labels: Record<CrystalColor, string> = {
    ruby: "Fl", sapphire: "Co", emerald: "Ve", onyx: "Ab", pearl: "Ra",
  };
  for (const c of CRYSTAL_COLORS) if (r[c] > 0) parts.push(`${r[c]}${labels[c]}`);
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
  const totalSummons = allGames.reduce((s, g) => s + g.summons.length, 0);

  // ── Header ────────────────────────────────────────────────────────────────
  console.log();
  console.log("═".repeat(120));
  console.log("  LUMINAE LUMINARY PLAYTEST SIMULATION REPORT");
  console.log(`  ${total} games  ·  ${GAMES_EACH}×2p / ${GAMES_EACH}×3p / ${GAMES_EACH}×4p  ·  all AI hard`);
  console.log(`  ${totalSummons} total Luminary summon events recorded`);
  if (abandoned > 0) console.log(`  ⚠  ${abandoned} game(s) abandoned at ${MAX_TURNS}-turn safety limit`);
  console.log("═".repeat(120));

  // ── Game rhythm ───────────────────────────────────────────────────────────
  console.log("\n── GAME RHYTHM ───────────────────────────────────────────────────────────────────────────");
  console.log(pad("Players", 10) + pad("Avg turns", 12) + pad("Avg win EMN", 14) + "Avg summons/game");
  console.log("─".repeat(50));
  for (const pc of PLAYER_COUNTS) {
    const g = allGames.filter((x) => x.players === pc);
    if (g.length === 0) continue;
    const avgT  = g.reduce((s, x) => s + x.turns, 0) / g.length;
    const avgW  = g.reduce((s, x) => s + x.winnerEmn, 0) / g.length;
    const avgS  = g.reduce((s, x) => s + x.summons.length, 0) / g.length;
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
    const appeared = s.summonCount > 0
      ? `Yes (${s.summonCount}×, ${pctStr(s.summonRate)})`
      : `No (0/${s.gamesActive})`;

    let notes = "";
    if (s.summonCount === 0) {
      notes = `Never summoned in ${s.gamesActive} active games`;
    } else {
      const parts: string[] = [];
      parts.push(`avg rnd ${f1(s.avgRound)}`);
      parts.push(`Δself ${sign(s.avgSummonerDelta)}`);
      if (Math.abs(s.avgOpponentDelta) >= 0.1) parts.push(`Δopp ${sign(s.avgOpponentDelta)}`);
      if (s.avgBurns >= 0.3)         parts.push(`burns ${f1(s.avgBurns)}`);
      if (s.avgMarketRemoved >= 0.3) parts.push(`mkt−${f1(s.avgMarketRemoved)}`);
      parts.push(`win% ${pctStr(s.summonerWinRate)}`);
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
  const wl = stats.filter((s) => s.watchlist && s.summonCount > 0);
  if (wl.length > 0) {
    console.log("\n── WATCHLIST DEEP DIVE ───────────────────────────────────────────────────────────────────");
    for (const s of wl) {
      console.log(`\n  ★ ${s.name}  (${s.id})`);
      console.log(`    Summoned ${s.summonCount}× in ${s.gamesActive} active games  (${pctStr(s.summonRate)} claim rate)`);
      console.log(`    Avg round at summon    : ${f1(s.avgRound)}    Avg EMN before: ${f1(s.avgEmnBefore)}`);
      console.log(`    Summoner EMN delta     : ${sign(s.avgSummonerDelta)}   (raw award ${s.emnAward} EMN declared)`);
      console.log(`    Avg opponent EMN delta : ${sign(s.avgOpponentDelta)} per opponent`);
      console.log(`    Avg market cards removed: ${f2(s.avgMarketRemoved)}    Avg burns: ${f2(s.avgBurns)}`);
      console.log(`    Summoner position      : ${s.posAhead} ahead / ${s.posEven} even / ${s.posBehind} behind`);
      console.log(`    Summoner win rate      : ${pctStr(s.summonerWinRate)}  (${s.winnerWasSummoner}/${s.summonCount} games)`);
    }
  }

  // ── Void Warden by player count ───────────────────────────────────────────
  console.log("\n── VOID WARDEN BY PLAYER COUNT ──────────────────────────────────────────────────────────");
  for (const pc of PLAYER_COUNTS) {
    const voidObs = allGames
      .filter((g) => g.players === pc)
      .flatMap((g) => g.summons.filter((s) => s.luminaryId === "lum_void"));
    if (voidObs.length === 0) { console.log(`  ${pc}p: not summoned`); continue; }
    const avgSelf  = voidObs.reduce((s, o) => s + (o.emnDelta[o.summonerId] ?? 0), 0) / voidObs.length;
    const avgOppTotal = voidObs.reduce((sum, o) => {
      const opps = Object.entries(o.emnDelta)
        .filter(([pid]) => pid !== o.summonerId)
        .map(([, d]) => d);
      return sum + opps.reduce((a, b) => a + b, 0);
    }, 0) / voidObs.length;
    const netSwing = avgOppTotal - avgSelf;
    console.log(
      `  ${pc}p (${voidObs.length} summons)` +
      `  self Δ=${sign(avgSelf)}` +
      `  total opp Δ=${sign(avgOppTotal)}` +
      `  net relative swing vs leader=${sign(netSwing)}`
    );
  }

  // ── Burn leaders ──────────────────────────────────────────────────────────
  console.log("\n── BURN LEADERS (avg burns per summon, ranked) ──────────────────────────────────────────");
  const burners = stats
    .filter((s) => s.summonCount > 0 && s.avgBurns > 0)
    .sort((a, b) => b.avgBurns - a.avgBurns);
  for (const s of burners) {
    console.log(`  ${pad(s.name, 24)} ${f2(s.avgBurns)} burns/summon  market−${f2(s.avgMarketRemoved)}`);
  }

  // ── Summoner win rate ranked ──────────────────────────────────────────────
  console.log("\n── SUMMONER WIN RATE RANKED (min 5 summons) ─────────────────────────────────────────────");
  const winRanked = stats
    .filter((s) => s.summonCount >= 5)
    .sort((a, b) => b.summonerWinRate - a.summonerWinRate);
  for (const s of winRanked) {
    const bar = "█".repeat(Math.round(s.summonerWinRate * 20));
    console.log(
      `  ${pad(s.name, 24)} ${pctStr(s.summonerWinRate).padStart(5)}  ${bar}`
    );
  }

  // ── Never-summoned ────────────────────────────────────────────────────────
  const never = stats.filter((s) => s.summonCount === 0);
  if (never.length > 0) {
    console.log("\n── NEVER SUMMONED ───────────────────────────────────────────────────────────────────────");
    for (const s of never) {
      console.log(`  ${s.name}  (cost ${reqStr(s.id)}, ${s.emnAward} EMN)  active in ${s.gamesActive} games`);
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
    const appeared = s.summonCount > 0 ? "Yes" : "No";
    const star    = s.watchlist ? "★ " : "  ";

    let shortNotes = "";
    if (s.summonCount === 0) {
      shortNotes = `Not once in ${s.gamesActive} games`;
    } else {
      shortNotes = `Δself${sign(s.avgSummonerDelta)} Δopp${sign(s.avgOpponentDelta)} win${pctStr(s.summonerWinRate)} r${f1(s.avgRound)}`;
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
