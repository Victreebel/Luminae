#!/usr/bin/env tsx
/**
 * check-summon-colors.ts
 *
 * Asserts that every Luminary's summonColor / summonSecondaryColor / auraStyle
 * in LUMINARY_VISUALS (luminaryAssets.tsx) matches the corresponding entry in
 * the LUMINARIES array (gameEngine.ts).
 *
 * LUMINARY_VISUALS is the single source of truth for flash tints and aura
 * animation styles consumed by the frontend. gameEngine.ts drives the actual
 * summon effect broadcast to clients. If the two diverge, the in-game flash or
 * aura animation will differ from the spec.
 *
 * Run directly:
 *   pnpm --filter @workspace/scripts run lint:summon-colors
 *
 * Or via the root alias:
 *   pnpm run lint:summon-colors
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { fileURLToPath } from "url";

// ── Paths ───────────────────────────────────────────────────────────────────

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

// ── Types ───────────────────────────────────────────────────────────────────

export interface ColorEntry {
  summonColor: string;
  summonSecondaryColor: string;
  auraStyle: string;
}

export interface Mismatch {
  id: string;
  field: "summonColor" | "summonSecondaryColor" | "auraStyle";
  inEngine: string;
  inAssets: string;
}

export interface InvalidAuraStyle {
  id: string;
  /** Which file the bad value came from. */
  source: "engine" | "assets";
  value: string;
}

export interface CheckResult {
  mismatches: Mismatch[];
  /** IDs present in the engine but missing from LUMINARY_VISUALS. */
  missingFromAssets: string[];
  /** IDs present in LUMINARY_VISUALS but not yet in the engine (pre-release placeholders). */
  missingFromEngine: string[];
  /** Entries whose auraStyle is not in the valid styles set derived from KNOWN_AURA_STYLES. */
  invalidAuraStyles: InvalidAuraStyle[];
}

export interface AuraCheckResult {
  /** auraStyle values in LUMINARY_VISUALS that are not in KNOWN_AURA_STYLES. */
  unrecognised: Array<{ id: string; auraStyle: string }>;
  /** The set of recognised aura keys parsed from luminaryAssets.tsx. */
  knownStyles: ReadonlySet<string>;
}

// ── Parsers ─────────────────────────────────────────────────────────────────

/**
 * Parse the KNOWN_AURA_STYLES array from luminaryAssets.tsx.
 *
 * Strategy: locate the `export const KNOWN_AURA_STYLES` declaration, find the
 * bracketed array literal that follows it, and extract each quoted string entry.
 * Fails loudly if the declaration or any entries cannot be found, so a rename
 * or restructuring of the constant is caught immediately.
 */
export function parseKnownAuraStyles(src: string): ReadonlySet<string> {
  const declStart = src.indexOf("export const KNOWN_AURA_STYLES");
  if (declStart === -1) {
    throw new Error(
      "Could not find `export const KNOWN_AURA_STYLES` in luminaryAssets.tsx — " +
      "the constant may have been renamed or removed."
    );
  }

  // Find the `[` that opens the array literal
  const bracketOpen = src.indexOf("[", declStart);
  if (bracketOpen === -1) {
    throw new Error("Could not find `[` after KNOWN_AURA_STYLES declaration");
  }

  // Find the matching `]`
  let depth = 0;
  let bracketClose = -1;
  for (let i = bracketOpen; i < src.length; i++) {
    if (src[i] === "[") depth++;
    else if (src[i] === "]") {
      depth--;
      if (depth === 0) { bracketClose = i; break; }
    }
  }
  if (bracketClose === -1) {
    throw new Error("Unterminated KNOWN_AURA_STYLES array in luminaryAssets.tsx");
  }

  const arrayContent = src.slice(bracketOpen + 1, bracketClose);
  const entries = new Set<string>();
  const STRING_RE = /["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = STRING_RE.exec(arrayContent)) !== null) {
    entries.add(m[1]);
  }

  if (entries.size === 0) {
    throw new Error(
      "KNOWN_AURA_STYLES array parsed as empty — check the constant in luminaryAssets.tsx."
    );
  }

  return entries;
}

/**
 * Verify that every auraStyle value in the assets map is a member of the
 * known aura styles set.  Returns unrecognised entries so callers can report
 * them; an empty `unrecognised` array means all values are valid.
 */
export function checkAuraStyles(
  assetsColors: Map<string, ColorEntry>,
  knownStyles: ReadonlySet<string>
): AuraCheckResult {
  const unrecognised: Array<{ id: string; auraStyle: string }> = [];
  for (const [id, entry] of assetsColors) {
    if (!knownStyles.has(entry.auraStyle)) {
      unrecognised.push({ id, auraStyle: entry.auraStyle });
    }
  }
  return { unrecognised, knownStyles };
}

const ID_RE = /id:\s*["']([^"']+)["']/;
const COLOR_RE = /summonColor:\s*["']([^"']+)["']/;
const SECONDARY_RE = /summonSecondaryColor:\s*["']([^"']+)["']/;
const AURA_RE = /auraStyle:\s*["']([^"']+)["']/;

/**
 * Parse the LUMINARIES array from gameEngine.ts.
 *
 * Strategy: locate the `export const LUMINARIES` array literal, then
 * brace-match each top-level `{...}` entry within it and extract
 * id / summonColor / summonSecondaryColor / auraStyle via regex.
 */
export function parseEngineColors(src: string): Map<string, ColorEntry> {
  const result = new Map<string, ColorEntry>();

  const arrayStart = src.indexOf("export const LUMINARIES");
  if (arrayStart === -1) {
    throw new Error("Could not find `export const LUMINARIES` in gameEngine.ts");
  }

  // Skip past the `=` sign that introduces the array literal, so that the
  // `[]` in the type annotation `LuminaryDef[]` is not mistaken for the opening bracket.
  const equalsPos = src.indexOf("=", arrayStart);
  if (equalsPos === -1) {
    throw new Error("Could not find `=` after LUMINARIES declaration");
  }

  // Find the opening `[` of the array literal (comes after the `=`)
  const bracketOpen = src.indexOf("[", equalsPos);
  if (bracketOpen === -1) {
    throw new Error("Could not find `[` after LUMINARIES `=`");
  }

  // Find the matching closing `]`
  let bracketDepth = 0;
  let bracketClose = -1;
  for (let i = bracketOpen; i < src.length; i++) {
    if (src[i] === "[") bracketDepth++;
    else if (src[i] === "]") {
      bracketDepth--;
      if (bracketDepth === 0) {
        bracketClose = i;
        break;
      }
    }
  }
  if (bracketClose === -1) {
    throw new Error("Unterminated LUMINARIES array in gameEngine.ts");
  }

  const arrayContent = src.slice(bracketOpen + 1, bracketClose);

  // Walk through each `{...}` entry at depth 1 within the array
  let pos = 0;
  while (pos < arrayContent.length) {
    const braceOpen = arrayContent.indexOf("{", pos);
    if (braceOpen === -1) break;

    let depth = 0;
    let j = braceOpen;
    while (j < arrayContent.length) {
      if (arrayContent[j] === "{") depth++;
      else if (arrayContent[j] === "}") {
        depth--;
        if (depth === 0) break;
      }
      j++;
    }

    const chunk = arrayContent.slice(braceOpen, j + 1);
    const idMatch = ID_RE.exec(chunk);

    if (idMatch && idMatch[1].startsWith("lum_")) {
      const colorMatch = COLOR_RE.exec(chunk);
      const secondaryMatch = SECONDARY_RE.exec(chunk);
      const auraMatch = AURA_RE.exec(chunk);

      if (!colorMatch) {
        throw new Error(
          `LUMINARIES entry "${idMatch[1]}" has no summonColor in gameEngine.ts`
        );
      }
      if (!secondaryMatch) {
        throw new Error(
          `LUMINARIES entry "${idMatch[1]}" has no summonSecondaryColor in gameEngine.ts`
        );
      }
      if (!auraMatch) {
        throw new Error(
          `LUMINARIES entry "${idMatch[1]}" has no auraStyle in gameEngine.ts`
        );
      }

      result.set(idMatch[1], {
        summonColor: colorMatch[1].toLowerCase(),
        summonSecondaryColor: secondaryMatch[1].toLowerCase(),
        auraStyle: auraMatch[1],
      });
    }

    pos = j + 1;
  }

  if (result.size === 0) {
    throw new Error("No Luminary entries parsed from gameEngine.ts — check the parser.");
  }

  return result;
}

/**
 * Parse LUMINARY_VISUALS from luminaryAssets.tsx.
 *
 * Strategy: find the `LUMINARY_VISUALS` declaration, then scan line-by-line
 * for entries matching `lum_xxx: { id: '...', ..., summonColor: '...', ... }`.
 * Each entry is expected to fit on a single line (which is true in the current
 * source layout).
 */
export function parseAssetsColors(src: string): Map<string, ColorEntry> {
  const result = new Map<string, ColorEntry>();

  const lines = src.split("\n");
  const ENTRY_LINE_RE = /^\s*lum_\w+\s*:/;

  let inVisuals = false;
  for (const line of lines) {
    if (!inVisuals) {
      if (/LUMINARY_VISUALS/.test(line)) inVisuals = true;
      continue;
    }

    // Stop at the closing of the LUMINARY_VISUALS object (a lone `}` or `};`)
    if (/^\s*\}/.test(line) && !line.includes("{")) break;

    if (!ENTRY_LINE_RE.test(line)) continue;

    const idMatch = /id:\s*["']([^"']+)["']/.exec(line);
    const colorMatch = COLOR_RE.exec(line);
    const secondaryMatch = SECONDARY_RE.exec(line);
    const auraMatch = AURA_RE.exec(line);

    if (idMatch && colorMatch && secondaryMatch && auraMatch) {
      result.set(idMatch[1], {
        summonColor: colorMatch[1].toLowerCase(),
        summonSecondaryColor: secondaryMatch[1].toLowerCase(),
        auraStyle: auraMatch[1],
      });
    }
  }

  if (result.size === 0) {
    throw new Error(
      "No Luminary entries parsed from luminaryAssets.tsx — check the parser."
    );
  }

  return result;
}

// ── Comparison ───────────────────────────────────────────────────────────────

/**
 * Compare the two parsed maps and return all divergences.
 *
 * Only IDs present in the engine are checked — the assets file may contain
 * additional placeholder or unreleased entries which are fine to ignore.
 * IDs present in the engine but missing from LUMINARY_VISUALS are errors.
 *
 * Also validates that every auraStyle value (in both files) belongs to
 * validStyles (derived from KNOWN_AURA_STYLES in luminaryAssets.tsx) — this
 * catches typos and invented styles before they can silently fall through the
 * runtime animation switch statement.
 *
 * @param validStyles - The authoritative set of recognised aura style strings,
 *   obtained by calling parseKnownAuraStyles() on the luminaryAssets.tsx source.
 *   KNOWN_AURA_STYLES in luminaryAssets.tsx is the single source of truth.
 */
export function checkColors(
  engineColors: Map<string, ColorEntry>,
  assetsColors: Map<string, ColorEntry>,
  validStyles: ReadonlySet<string>
): CheckResult {
  const mismatches: Mismatch[] = [];
  const missingFromAssets: string[] = [];
  const invalidAuraStyles: InvalidAuraStyle[] = [];

  const validSet = validStyles;

  for (const [id, engineEntry] of engineColors) {
    // Validate engine auraStyle against the allowlist
    if (!validSet.has(engineEntry.auraStyle)) {
      invalidAuraStyles.push({ id, source: "engine", value: engineEntry.auraStyle });
    }

    if (!assetsColors.has(id)) {
      missingFromAssets.push(id);
      continue;
    }

    const assetsEntry = assetsColors.get(id)!;

    // Validate assets auraStyle against the allowlist
    if (!validSet.has(assetsEntry.auraStyle)) {
      invalidAuraStyles.push({ id, source: "assets", value: assetsEntry.auraStyle });
    }

    if (engineEntry.summonColor !== assetsEntry.summonColor) {
      mismatches.push({
        id,
        field: "summonColor",
        inEngine: engineEntry.summonColor,
        inAssets: assetsEntry.summonColor,
      });
    }

    if (engineEntry.summonSecondaryColor !== assetsEntry.summonSecondaryColor) {
      mismatches.push({
        id,
        field: "summonSecondaryColor",
        inEngine: engineEntry.summonSecondaryColor,
        inAssets: assetsEntry.summonSecondaryColor,
      });
    }

    if (engineEntry.auraStyle !== assetsEntry.auraStyle) {
      mismatches.push({
        id,
        field: "auraStyle",
        inEngine: engineEntry.auraStyle,
        inAssets: assetsEntry.auraStyle,
      });
    }
  }

  // Check assets-only entries (not in engine): collect missing-from-engine IDs
  // and validate their auraStyle values.
  const missingFromEngine: string[] = [];
  for (const [id, assetsEntry] of assetsColors) {
    if (!engineColors.has(id)) {
      missingFromEngine.push(id);
      if (!validSet.has(assetsEntry.auraStyle)) {
        invalidAuraStyles.push({ id, source: "assets", value: assetsEntry.auraStyle });
      }
    }
  }

  return { mismatches, missingFromAssets, missingFromEngine, invalidAuraStyles };
}

// ── CLI entrypoint ───────────────────────────────────────────────────────────

// Guard so this block only runs when the script is executed directly, not when
// the module is imported by a test file.
const isMain =
  process.argv[1] != null &&
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const engineSrc = readFileSync(ENGINE_PATH, "utf-8");
  const assetsSrc = readFileSync(ASSETS_PATH, "utf-8");

  const engineColors = parseEngineColors(engineSrc);
  const assetsColors = parseAssetsColors(assetsSrc);

  // KNOWN_AURA_STYLES in @workspace/game-types is the single source of truth.
  // Both gameEngine.ts and luminaryAssets.tsx re-export from there, so we parse
  // the shared lib file directly to validate against the authoritative list.
  const gameTypesSrc = readFileSync(GAME_TYPES_PATH, "utf-8");
  const knownStyles = parseKnownAuraStyles(gameTypesSrc);

  const { mismatches, missingFromAssets, missingFromEngine, invalidAuraStyles } = checkColors(engineColors, assetsColors, knownStyles);

  const hasErrors =
    mismatches.length > 0 ||
    missingFromAssets.length > 0 ||
    invalidAuraStyles.length > 0;

  if (hasErrors) {
    console.error(
      `check-summon-colors: FAIL — ${
        mismatches.length + missingFromAssets.length + invalidAuraStyles.length
      } issue(s) found between gameEngine.ts and luminaryAssets.tsx:\n`
    );

    if (mismatches.length > 0) {
      console.error("  Visual mismatches (engine ≠ assets):");
      for (const m of mismatches) {
        console.error(
          `    ${m.id}.${m.field}:  engine=${m.inEngine}  assets=${m.inAssets}`
        );
      }
      console.error("");
    }

    if (missingFromAssets.length > 0) {
      console.error(
        "  IDs present in LUMINARIES but missing from LUMINARY_VISUALS:"
      );
      for (const id of missingFromAssets) {
        console.error(`    ${id}`);
      }
      console.error("");
    }

    if (invalidAuraStyles.length > 0) {
      console.error(
        "  auraStyle values not in KNOWN_AURA_STYLES allowlist (silent fallback risk):"
      );
      for (const bad of invalidAuraStyles) {
        console.error(`    ${bad.id} [${bad.source}]: auraStyle="${bad.value}"`);
      }
      console.error(
        `  Valid values: ${[...knownStyles].map((s) => `"${s}"`).join(", ")}`
      );
      console.error(
        "  To add a new style: extend KNOWN_AURA_STYLES in luminaryAssets.tsx\n" +
        "  AND add a matching case to the frontend animation switch."
      );
      console.error("");
    }

    console.error(
      [
        "How to fix:",
        "  Summon-color mismatch — Update LUMINARY_VISUALS in luminaryAssets.tsx to match",
        "    gameEngine.ts, or vice versa.  LUMINARY_VISUALS is the canonical source of truth.",
        "  Unrecognised auraStyle — Either fix the typo in LUMINARY_VISUALS, or add the new",
        "    animation key to KNOWN_AURA_STYLES in luminaryAssets.tsx",
        "    (and implement the animation branch in the aura renderer).",
      ].join("\n")
    );

    process.exit(1);
  }

  // Report assets-only entries as info (not a hard failure — pre-release placeholders are allowed).
  if (missingFromEngine.length > 0) {
    console.warn(
      `check-summon-colors: INFO — ${missingFromEngine.length} LUMINARY_VISUALS entr${
        missingFromEngine.length === 1 ? "y" : "ies"
      } not yet wired into LUMINARIES (pre-release placeholder${missingFromEngine.length === 1 ? "" : "s"}):`
    );
    console.warn("  IDs in LUMINARY_VISUALS but not yet in LUMINARIES:");
    for (const id of missingFromEngine) {
      console.warn(`    ${id}`);
    }
    console.warn(
      "  These will be ignored at runtime until added to gameEngine.ts.\n"
    );
  }

  console.log(
    `check-summon-colors: OK — all ${engineColors.size} engine Luminar${
      engineColors.size === 1 ? "y" : "ies"
    } match LUMINARY_VISUALS; all auraStyle values are in the allowlist.`
  );
}
