#!/usr/bin/env tsx
/**
 * check-summon-colors.test.ts
 *
 * Reads the live source files and asserts that every Luminary's
 * summonColor / summonSecondaryColor in LUMINARY_VISUALS (luminaryAssets.tsx)
 * matches the corresponding entry in the LUMINARIES array (gameEngine.ts).
 *
 * Each field mismatch or missing entry is its own failing assertion so the
 * output clearly shows which Luminary broke and which field diverged.
 *
 * Run directly:
 *   pnpm --filter @workspace/scripts run test:summon-colors
 *
 * Or via the root alias:
 *   pnpm run test:summon-colors
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";
import {
  parseEngineColors,
  parseAssetsColors,
  checkColors,
  parseKnownAuraStyles,
  checkAuraStyles,
} from "./check-summon-colors.js";

// ── Paths ─────────────────────────────────────────────────────────────────────

const SCRIPTS_DIR = resolve(fileURLToPath(import.meta.url), "../../");
const ASSETS_PATH = resolve(
  SCRIPTS_DIR,
  "../artifacts/luminae/src/lib/luminaryAssets.tsx"
);
const ENGINE_PATH = resolve(
  SCRIPTS_DIR,
  "../artifacts/api-server/src/lib/gameEngine.ts"
);
const GAME_TYPES_PATH = resolve(
  SCRIPTS_DIR,
  "../lib/game-types/src/index.ts"
);

// ── Tiny test harness ─────────────────────────────────────────────────────────

let failures = 0;

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    failures++;
  } else {
    console.log(`  pass: ${message}`);
  }
}

// ── Read live source files ────────────────────────────────────────────────────

const engineSrc = readFileSync(ENGINE_PATH, "utf-8");
const assetsSrc = readFileSync(ASSETS_PATH, "utf-8");
const gameTypesSrc = readFileSync(GAME_TYPES_PATH, "utf-8");

const engineColors = parseEngineColors(engineSrc);
const assetsColors = parseAssetsColors(assetsSrc);

// ── Per-Luminary assertions ───────────────────────────────────────────────────

console.log(
  `\n── Summon-color sync check (${engineColors.size} engine Luminaries) ──────────────────`
);

for (const [id, engineEntry] of engineColors) {
  if (!assetsColors.has(id)) {
    assert(false, `${id} — present in LUMINARIES but missing from LUMINARY_VISUALS`);
    continue;
  }

  const assetsEntry = assetsColors.get(id)!;

  assert(
    engineEntry.summonColor === assetsEntry.summonColor,
    `${id} summonColor — engine="${engineEntry.summonColor}" assets="${assetsEntry.summonColor}"`
  );

  assert(
    engineEntry.summonSecondaryColor === assetsEntry.summonSecondaryColor,
    `${id} summonSecondaryColor — engine="${engineEntry.summonSecondaryColor}" assets="${assetsEntry.summonSecondaryColor}"`
  );
}

// ── Structural sanity: checkColors agrees with the per-field loop ─────────────

console.log("\n── Structural sanity ────────────────────────────────────────────────");

const knownStylesForCheck = parseKnownAuraStyles(gameTypesSrc);
const { mismatches, missingFromAssets, missingFromEngine, invalidAuraStyles } = checkColors(engineColors, assetsColors, knownStylesForCheck);

assert(
  mismatches.length === 0,
  mismatches.length === 0
    ? "checkColors() reports no mismatches"
    : `checkColors() reports ${mismatches.length} mismatch(es): ${mismatches
        .map((m) => `${m.id}.${m.field}`)
        .join(", ")}`
);

assert(
  missingFromAssets.length === 0,
  missingFromAssets.length === 0
    ? "checkColors() reports no IDs missing from LUMINARY_VISUALS"
    : `checkColors() reports ${missingFromAssets.length} missing ID(s): ${missingFromAssets.join(", ")}`
);

// missingFromEngine is informational: placeholder entries are allowed, so this
// assertion only checks that the field is present and is an array — not that it
// is empty.  The actual IDs (if any) are reported below for visibility.
assert(
  Array.isArray(missingFromEngine),
  "checkColors() returns a missingFromEngine array"
);
if (missingFromEngine.length > 0) {
  console.log(
    `  info: ${missingFromEngine.length} LUMINARY_VISUALS ID(s) not yet in LUMINARIES (pre-release placeholders): ${missingFromEngine.join(", ")}`
  );
}

assert(
  invalidAuraStyles.length === 0,
  invalidAuraStyles.length === 0
    ? "checkColors() reports no invalid auraStyle values"
    : `checkColors() reports ${invalidAuraStyles.length} invalid auraStyle(s): ${invalidAuraStyles
        .map((b) => `${b.id}[${b.source}]="${b.value}"`)
        .join(", ")}`
);

// ── Aura style validation (KNOWN_AURA_STYLES from shared game types) ──────────

console.log("\n── Aura style validation ────────────────────────────────────────────");

const knownStyles = parseKnownAuraStyles(gameTypesSrc);

assert(
  knownStyles.size > 0,
  `parseKnownAuraStyles() returned ${knownStyles.size} known style(s) — expected at least 1`
);

const { unrecognised } = checkAuraStyles(assetsColors, knownStyles);

assert(
  unrecognised.length === 0,
  unrecognised.length === 0
    ? `all ${assetsColors.size} LUMINARY_VISUALS auraStyle values are in KNOWN_AURA_STYLES`
    : `${unrecognised.length} unrecognised auraStyle value(s): ${unrecognised
        .map(({ id, auraStyle }) => `${id}="${auraStyle}"`)
        .join(", ")}`
);

// Unit-test: checkAuraStyles catches an unknown key
{
  const fakeMap = new Map([
    ["lum_fake", { summonColor: "#ff0000", summonSecondaryColor: "#000000", auraStyle: "nonexistent_style" }],
  ]);
  const { unrecognised: fakeUnrecognised } = checkAuraStyles(fakeMap, knownStyles);
  assert(
    fakeUnrecognised.length === 1 && fakeUnrecognised[0].id === "lum_fake",
    "checkAuraStyles() correctly flags an unrecognised auraStyle value"
  );
}

// Unit-test: checkAuraStyles accepts a known key
{
  const fakeMap = new Map([
    ["lum_fake", { summonColor: "#ff0000", summonSecondaryColor: "#000000", auraStyle: "fire" }],
  ]);
  const { unrecognised: fakeUnrecognised } = checkAuraStyles(fakeMap, knownStyles);
  assert(
    fakeUnrecognised.length === 0,
    "checkAuraStyles() correctly accepts a recognised auraStyle value ('fire')"
  );
}

// Unit-test: parseKnownAuraStyles fails loudly when the constant is absent
{
  let threw = false;
  try {
    parseKnownAuraStyles("const foo = 'bar';");
  } catch {
    threw = true;
  }
  assert(threw, "parseKnownAuraStyles() throws when KNOWN_AURA_STYLES is missing from source");
}

// ── Per-Luminary auraStyle assertions ─────────────────────────────────────────

console.log(
  `\n── Per-Luminary auraStyle check (${assetsColors.size} LUMINARY_VISUALS entries) ──`
);

for (const [id, entry] of assetsColors) {
  assert(
    knownStyles.has(entry.auraStyle),
    knownStyles.has(entry.auraStyle)
      ? `${id} auraStyle="${entry.auraStyle}" — recognised`
      : `${id} auraStyle="${entry.auraStyle}" — NOT in KNOWN_AURA_STYLES`
  );
}

// ── KNOWN_AURA_STYLES allowlist unit tests ────────────────────────────────────

console.log("\n── auraStyle allowlist unit tests ───────────────────────────────────");

assert(knownStyles.size > 0, "KNOWN_AURA_STYLES (parsed from shared game types) is non-empty");

// A synthetic engine entry with a bad auraStyle must be flagged.
{
  const fakeEngine = new Map([
    ["lum_test", { summonColor: "#ff0000", summonSecondaryColor: "#000000", auraStyle: "solar" }],
  ]);
  const fakeAssets = new Map([
    ["lum_test", { summonColor: "#ff0000", summonSecondaryColor: "#000000", auraStyle: "solar" }],
  ]);
  const result = checkColors(fakeEngine, fakeAssets, knownStyles);
  assert(
    result.invalidAuraStyles.length === 2,
    `synthetic "solar" auraStyle flagged in both engine and assets (got ${result.invalidAuraStyles.length} violation(s))`
  );
}

// A synthetic entry whose assets auraStyle is valid but engine's is not must be flagged.
{
  const fakeEngine = new Map([
    ["lum_test2", { summonColor: "#ff0000", summonSecondaryColor: "#000000", auraStyle: "unknown_style" }],
  ]);
  const fakeAssets = new Map([
    ["lum_test2", { summonColor: "#ff0000", summonSecondaryColor: "#000000", auraStyle: "fire" }],
  ]);
  const result = checkColors(fakeEngine, fakeAssets, knownStyles);
  const engineViolations = result.invalidAuraStyles.filter((b) => b.source === "engine");
  const assetsViolations = result.invalidAuraStyles.filter((b) => b.source === "assets");
  assert(
    engineViolations.length === 1 && engineViolations[0].value === "unknown_style",
    `engine "unknown_style" flagged as invalid (source=engine)`
  );
  assert(
    assetsViolations.length === 0,
    `assets "fire" is valid — no assets violation reported`
  );
}

// A well-formed synthetic entry with a valid auraStyle must produce zero violations.
{
  const fakeEngine = new Map([
    ["lum_good", { summonColor: "#ff0000", summonSecondaryColor: "#000000", auraStyle: "fire" }],
  ]);
  const fakeAssets = new Map([
    ["lum_good", { summonColor: "#ff0000", summonSecondaryColor: "#000000", auraStyle: "fire" }],
  ]);
  const result = checkColors(fakeEngine, fakeAssets, knownStyles);
  assert(
    result.invalidAuraStyles.length === 0,
    `valid auraStyle "fire" produces no violations`
  );
}

// An assets-only entry (not yet in the engine) with an invalid auraStyle must be flagged.
{
  const fakeEngine = new Map<string, { summonColor: string; summonSecondaryColor: string; auraStyle: string }>();
  const fakeAssets = new Map([
    ["lum_future", { summonColor: "#aabbcc", summonSecondaryColor: "#001122", auraStyle: "placeholder_style" }],
  ]);
  const result = checkColors(fakeEngine, fakeAssets, knownStyles);
  const violation = result.invalidAuraStyles.find((b) => b.id === "lum_future");
  assert(
    violation !== undefined && violation.source === "assets" && violation.value === "placeholder_style",
    `assets-only entry "lum_future" with invalid auraStyle "placeholder_style" is flagged (source=assets)`
  );
}

// An assets-only entry with a valid auraStyle must produce no violation.
{
  const fakeEngine = new Map<string, { summonColor: string; summonSecondaryColor: string; auraStyle: string }>();
  const fakeAssets = new Map([
    ["lum_future_valid", { summonColor: "#aabbcc", summonSecondaryColor: "#001122", auraStyle: "tide" }],
  ]);
  const result = checkColors(fakeEngine, fakeAssets, knownStyles);
  assert(
    result.invalidAuraStyles.length === 0,
    `assets-only entry "lum_future_valid" with valid auraStyle "tide" produces no violation`
  );
}

// ── missingFromEngine unit tests ──────────────────────────────────────────────

console.log("\n── missingFromEngine unit tests ─────────────────────────────────────");

// An assets entry not present in the engine must appear in missingFromEngine.
{
  const fakeEngine = new Map<string, { summonColor: string; summonSecondaryColor: string; auraStyle: string }>();
  const fakeAssets = new Map([
    ["lum_prerelease", { summonColor: "#aabbcc", summonSecondaryColor: "#001122", auraStyle: "fire" }],
  ]);
  const result = checkColors(fakeEngine, fakeAssets, knownStyles);
  assert(
    result.missingFromEngine.length === 1 && result.missingFromEngine[0] === "lum_prerelease",
    `assets-only "lum_prerelease" appears in missingFromEngine (got [${result.missingFromEngine.join(", ")}])`
  );
}

// An entry present in both engine and assets must NOT appear in missingFromEngine.
{
  const shared = { summonColor: "#ff0000", summonSecondaryColor: "#000000", auraStyle: "fire" };
  const fakeEngine = new Map([["lum_live", shared]]);
  const fakeAssets = new Map([["lum_live", shared]]);
  const result = checkColors(fakeEngine, fakeAssets, knownStyles);
  assert(
    result.missingFromEngine.length === 0,
    `"lum_live" present in both engine and assets — missingFromEngine is empty`
  );
}

// Only the engine-missing ID is listed; engine-present IDs are not included.
{
  const shared = { summonColor: "#ff0000", summonSecondaryColor: "#000000", auraStyle: "fire" };
  const fakeEngine = new Map([["lum_live", shared]]);
  const fakeAssets = new Map([
    ["lum_live", shared],
    ["lum_wip", { summonColor: "#001122", summonSecondaryColor: "#334455", auraStyle: "tide" }],
  ]);
  const result = checkColors(fakeEngine, fakeAssets, knownStyles);
  assert(
    result.missingFromEngine.length === 1 && result.missingFromEngine[0] === "lum_wip",
    `only "lum_wip" (assets-only) appears in missingFromEngine, not "lum_live"`
  );
  assert(
    result.missingFromAssets.length === 0,
    `no engine IDs are missing from assets`
  );
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log("");
if (failures > 0) {
  console.error(
    `check-summon-colors.test: FAIL — ${failures} assertion(s) failed`
  );
  process.exit(1);
}
console.log(`check-summon-colors.test: OK — all assertions passed`);
