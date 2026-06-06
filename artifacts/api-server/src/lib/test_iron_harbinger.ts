import { initializeGame, applyAction, normalizeState, LUMINARY_MAP, CARD_MAP, CRYSTAL_COLORS } from "./gameEngine.js";
import type { GameStateData } from "./gameEngine.js";

function makeGame(): GameStateData {
  const raw = initializeGame([{ id: "p1", name: "Player 1" }, { id: "p2", name: "Player 2" }], 2);
  raw.currentPlayerIndex = 0;
  return normalizeState(raw);
}

function enrichPlayer(state: GameStateData, playerIdx: number) {
  const p = state.players[playerIdx];
  for (const c of CRYSTAL_COLORS) { p.crystals[c] = 10; state.crystalBank[c] = 20; }
  p.crystals.flux = 5; state.crystalBank.flux = 5;
}

function claimLuminary(state: GameStateData, lumId: string) {
  const lum = LUMINARY_MAP.get(lumId);
  if (!lum) throw new Error(`Unknown luminary: ${lumId}`);
  const player = state.players[state.currentPlayerIndex];
  for (const c of CRYSTAL_COLORS) player.bonuses[c] = lum.requirements[c];
  enrichPlayer(state, state.currentPlayerIndex);
  state.activeLuminaries = [lumId];
  const cardId = state.marketTier1[0];
  if (!cardId) throw new Error("No Tier 1 card in market");
  const r = applyAction(state, player.playerId, { type: "purchase_card", cardId });
  if (!r.success) throw new Error(`claimLuminary purchase failed: ${r.error}`);
}

// Test: Iron Harbinger on-summon effect
const state = makeGame();
const t3Before = [...state.marketTier3];
console.log("T3 before:", t3Before.length, "cards", t3Before);

claimLuminary(state, "lum_forge");

const t3After = [...state.marketTier3];
console.log("T3 after:", t3After.length, "cards", t3After);
console.log("Action log:", state.actionLog.slice(-3));
console.log("Pending summon events:", state.pendingSummonEvents);

// Check if any T3 cards were burned
const burned = t3Before.filter(id => !t3After.includes(id));
console.log("Burned:", burned);

if (burned.length > 0) {
  console.log("PASS: Iron Harbinger effect fired — burned", burned.length, "cards");
} else {
  console.log("FAIL: Iron Harbinger effect did NOT fire — no T3 cards burned");
}
