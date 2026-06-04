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

const { mismatches, missingFromAssets } = checkColors(engineColors, assetsColors);

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

// ── Aura style validation ─────────────────────────────────────────────────────

console.log("\n── Aura style validation ────────────────────────────────────────────");

const knownStyles = parseKnownAuraStyles(assetsSrc);

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

// ── Summary ───────────────────────────────────────────────────────────────────

console.log("");
if (failures > 0) {
  console.error(
    `check-summon-colors.test: FAIL — ${failures} assertion(s) failed`
  );
  process.exit(1);
}
console.log(`check-summon-colors.test: OK — all assertions passed`);
