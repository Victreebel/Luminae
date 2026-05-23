#!/usr/bin/env tsx
/**
 * check-version-stamps.test.ts
 *
 * Fixture-based tests for checkSwitchBlocks().
 * Runs inline synthetic source strings through the checker and asserts on
 * expected pass / fail outcomes.  Exits 0 on success, 1 on any failure.
 */

import { checkSwitchBlocks } from "./check-version-stamps.js";

// ── Tiny test harness ──────────────────────────────────────────────────────────

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failures++;
  } else {
    console.log(`  pass: ${message}`);
  }
}

// ── Fixture: well-formed — each case stamps lastAction before version++ ────────

const PASS_FIXTURE = `
export function applyAction(state, playerId, action) {
  switch (action.type) {
    case "do_thing": {
      state.lastAction = { type: "do_thing", playerId };
      state.version++;
      return { success: true };
    }
    case "other_thing": {
      // some work
      state.lastAction = { type: "other_thing", playerId };
      state.version++;
      // a second bump in the same block — lastAction was already set above
      state.version++;
      return { success: true };
    }
    default:
      return { success: false };
  }
}
`;

// ── Fixture: violating — case bumps version++ with NO preceding lastAction ─────

const FAIL_FIXTURE_NO_STAMP = `
export function applyAction(state, playerId, action) {
  switch (action.type) {
    case "missing_stamp": {
      state.version++;
      return { success: true };
    }
  }
}
`;

// ── Fixture: violating — lastAction appears AFTER version++ (wrong order) ──────

const FAIL_FIXTURE_WRONG_ORDER = `
export function applyAction(state, playerId, action) {
  switch (action.type) {
    case "wrong_order": {
      state.version++;
      state.lastAction = { type: "wrong_order", playerId };
      return { success: true };
    }
  }
}
`;

// ── Fixture: well-formed — version++ outside switch is not checked ─────────────

const PASS_FIXTURE_POST_SWITCH = `
export function applyAction(state, playerId, action) {
  switch (action.type) {
    case "normal": {
      state.lastAction = { type: "normal", playerId };
      state.version++;
      return { success: true };
    }
    default:
      return { success: false };
  }

  // This version++ is outside the switch — should not be flagged
  state.version++;
}
`;

// ── Fixture: deferred-plan pattern (mirrors resolve_summon / plan_action) ──────
// A case that has both a primary lastAction+version++ AND a secondary version++
// in a failure branch.  The secondary bump is AFTER the lastAction, so it passes.

const PASS_FIXTURE_DEFERRED_PLAN = `
export function applyAction(state, playerId, action) {
  switch (action.type) {
    case "resolve_summon": {
      state.lastAction = { type: "resolve_summon", playerId };
      state.version++;

      if (someCondition) {
        const result = inner();
        if (!result.success) {
          // secondary bump — lastAction was already set above, so this is fine
          state.version++;
        }
      }

      return { success: true };
    }
    default:
      return { success: false };
  }
}
`;

// ── Run tests ──────────────────────────────────────────────────────────────────

console.log("\n── PASS fixtures ────────────────────────────────────────────────");

{
  const v = checkSwitchBlocks(PASS_FIXTURE);
  assert(v.length === 0, "well-formed: no violations");
}

{
  const v = checkSwitchBlocks(PASS_FIXTURE_POST_SWITCH);
  assert(v.length === 0, "post-switch version++ not flagged");
}

{
  const v = checkSwitchBlocks(PASS_FIXTURE_DEFERRED_PLAN);
  assert(v.length === 0, "deferred-plan pattern (secondary bump after stamp) passes");
}

console.log("\n── FAIL fixtures ────────────────────────────────────────────────");

{
  const v = checkSwitchBlocks(FAIL_FIXTURE_NO_STAMP);
  assert(v.length === 1, "missing stamp: exactly 1 violation");
  assert(v[0]?.caseLabel === "missing_stamp", `violation labels 'missing_stamp' (got '${v[0]?.caseLabel}')`);
}

{
  const v = checkSwitchBlocks(FAIL_FIXTURE_WRONG_ORDER);
  assert(v.length === 1, "wrong order: exactly 1 violation");
  assert(v[0]?.caseLabel === "wrong_order", `violation labels 'wrong_order' (got '${v[0]?.caseLabel}')`);
}

// ── Summary ────────────────────────────────────────────────────────────────────

console.log("");
if (failures > 0) {
  console.error(`check-version-stamps.test: FAIL — ${failures} assertion(s) failed`);
  process.exit(1);
}
console.log(`check-version-stamps.test: OK — all assertions passed`);
