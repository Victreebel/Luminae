#!/usr/bin/env tsx
/**
 * check-version-stamps.ts
 *
 * Enforces the invariant:
 *   Every `state.version++` inside a `case` block of the `applyAction()`
 *   switch in gameEngine.ts must be preceded by at least one
 *   `state.lastAction =` assignment earlier in the same case block.
 *
 * This prevents the animation re-fire bug where a version bump arrives
 * at clients without a fresh action-type stamp, causing dedup guards to
 * produce a new key and re-trigger animations that already ran.
 *
 * Run directly:
 *   pnpm --filter @workspace/scripts run lint:version-stamps
 *
 * Or via the root alias:
 *   pnpm run lint:version-stamps
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface Violation {
  /** The string label of the case, e.g. "harness_three_affinities" */
  caseLabel: string;
  /** 1-indexed line number of the `case "..."` keyword in the source */
  caseStartLine: number;
  /** 1-indexed line number of the un-stamped `state.version++` */
  bumpLine: number;
}

// ── Core checker (exported for tests) ─────────────────────────────────────────

const VERSION_BUMP_RE = /state\.version\s*\+\+/;
const LAST_ACTION_RE = /state\.lastAction\s*=/;
const CASE_LABEL_RE = /^\s*case\s+"([^"]+)"\s*:/;
const APPLY_ACTION_FN_RE = /function\s+applyAction\s*\(/;
const ACTION_TYPE_SWITCH_RE = /switch\s*\(\s*action\.type\s*\)/;

/**
 * Count the net brace delta on a single line, ignoring content inside
 * string literals and // line comments.
 */
function braceDelta(line: string): number {
  let delta = 0;
  let i = 0;
  while (i < line.length) {
    const ch = line[i];
    if (ch === "/" && line[i + 1] === "/") break; // line comment
    if (ch === '"' || ch === "'") {
      const q = ch;
      i++;
      while (i < line.length && line[i] !== q) {
        if (line[i] === "\\") i++; // skip escape
        i++;
      }
    } else if (ch === "`") {
      i++;
      while (i < line.length && line[i] !== "`") {
        if (line[i] === "\\") i++;
        i++;
      }
    } else if (ch === "{") {
      delta++;
    } else if (ch === "}") {
      delta--;
    }
    i++;
  }
  return delta;
}

/**
 * Scan `src` for the `applyAction()` function, locate its
 * `switch (action.type)` block, extract each `case` block, and verify
 * that every `state.version++` within a case block is preceded by at
 * least one `state.lastAction =` earlier in that same block.
 *
 * Returns an array of violations (empty means all is well).
 */
export function checkSwitchBlocks(src: string): Violation[] {
  const lines = src.split("\n");

  // ── Step 1: locate applyAction, then the switch ───────────────────────────
  let applyActionLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (APPLY_ACTION_FN_RE.test(lines[i])) {
      applyActionLineIdx = i;
      break;
    }
  }
  if (applyActionLineIdx === -1) {
    throw new Error("Could not find `function applyAction(` in the source.");
  }

  let switchLineIdx = -1;
  for (let i = applyActionLineIdx; i < lines.length; i++) {
    if (ACTION_TYPE_SWITCH_RE.test(lines[i])) {
      switchLineIdx = i;
      break;
    }
  }
  if (switchLineIdx === -1) {
    throw new Error(
      "Could not find `switch (action.type)` after `applyAction` in the source."
    );
  }

  // ── Step 2: extract case blocks via brace-depth tracking ─────────────────
  //
  // We process lines from `switchLine` onward.  depth starts at 0.
  // `switch (...) {` increments depth to 1 — this is "switchDepth".
  // Each `case "..."` header appears at depth 1; after its opening brace,
  // depth becomes ≥2 for the block body.  When depth falls back to 1 we
  // are between cases.  When depth falls to 0 the switch is done.

  interface CaseBlock {
    label: string;
    /** 0-indexed line index of the `case "..."` header */
    headerLineIdx: number;
    /** 0-indexed line indices of the lines that make up the case body */
    bodyLineIdxs: number[];
  }

  const blocks: CaseBlock[] = [];
  let depth = 0;
  let switchDepth = -1;
  let current: CaseBlock | null = null;

  for (let i = switchLineIdx; i < lines.length; i++) {
    const line = lines[i];
    const caseMatch = CASE_LABEL_RE.exec(line);

    // Detect a new case header BEFORE updating depth, so the match fires
    // when depth is still at switchDepth (interior of the switch).
    if (switchDepth !== -1 && depth === switchDepth && caseMatch) {
      if (current) blocks.push(current);
      current = {
        label: caseMatch[1],
        headerLineIdx: i,
        bodyLineIdxs: [],
      };
    } else if (current && i > current.headerLineIdx) {
      current.bodyLineIdxs.push(i);
    }

    depth += braceDelta(line);

    if (switchDepth === -1 && depth > 0) {
      // Just entered the switch's opening brace
      switchDepth = depth;
    }

    if (switchDepth !== -1 && depth < switchDepth) {
      // Exited the switch block
      if (current) blocks.push(current);
      current = null;
      break;
    }
  }
  if (current) blocks.push(current);

  // ── Step 3: ordering check ────────────────────────────────────────────────
  //
  // For each case block, scan body lines in order.  Track whether a
  // `state.lastAction =` has been seen yet.  Flag any `state.version++`
  // that appears before any `state.lastAction =` in the same block.

  const violations: Violation[] = [];

  for (const block of blocks) {
    let lastActionSeen = false;

    for (const lineIdx of block.bodyLineIdxs) {
      const line = lines[lineIdx];
      if (LAST_ACTION_RE.test(line)) {
        lastActionSeen = true;
      }
      if (VERSION_BUMP_RE.test(line) && !lastActionSeen) {
        violations.push({
          caseLabel: block.label,
          caseStartLine: block.headerLineIdx + 1, // 1-indexed
          bumpLine: lineIdx + 1, // 1-indexed
        });
      }
    }
  }

  return violations;
}

// ── CLI entrypoint ─────────────────────────────────────────────────────────────

const SCRIPTS_DIR = resolve(fileURLToPath(import.meta.url), "../../");
const ENGINE_PATH = resolve(
  SCRIPTS_DIR,
  "../artifacts/api-server/src/lib/gameEngine.ts"
);

const src = readFileSync(ENGINE_PATH, "utf-8");
const violations = checkSwitchBlocks(src);

if (violations.length > 0) {
  console.error(
    `check-version-stamps: FAIL — ${violations.length} occurrence(s) of ` +
      `state.version++ not preceded by state.lastAction = in the same case block:\n`
  );
  for (const v of violations) {
    console.error(
      `  case "${v.caseLabel}" (line ${v.caseStartLine}) ` +
        `— state.version++ at line ${v.bumpLine} has no preceding state.lastAction =`
    );
  }
  console.error(
    [
      "",
      "How to fix:",
      '  Add  state.lastAction = { type: "<action_type>", playerId, ... };',
      "  before the state.version++ on the listed line(s).",
      "  See existing case blocks (e.g. toggle_luminary_affinity) for the pattern.",
    ].join("\n")
  );
  process.exit(1);
}

// Count stamped case blocks for the OK summary
const srcLines = src.split("\n");
let stampedCount = 0;
let inCase = false;
let hasVersion = false;
for (const line of srcLines) {
  if (CASE_LABEL_RE.test(line)) {
    if (inCase && hasVersion) stampedCount++;
    inCase = true;
    hasVersion = false;
  } else if (inCase && VERSION_BUMP_RE.test(line)) {
    hasVersion = true;
  }
}
if (inCase && hasVersion) stampedCount++;

console.log(
  `check-version-stamps: OK — all ${stampedCount} case block(s) with ` +
    `state.version++ carry a preceding state.lastAction = stamp.`
);
