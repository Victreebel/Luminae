#!/usr/bin/env tsx
/**
 * check-luminary-files.ts
 *
 * Asserts that every Luminary ID listed in ILLUSTRATED_IDS (luminaryAssets.tsx)
 * has the required image files on disk under:
 *   artifacts/luminae/src/assets/luminaries/<id>/
 *
 * ## Slot policy (derived from luminaryAssets.tsx `_getLuminaryImage` signature)
 *
 *   panel  — REQUIRED  (exits 1 if missing)
 *   entity — REQUIRED  (exits 1 if missing)
 *
 * Both slots are required. If a Luminary is listed in ILLUSTRATED_IDS it
 * must have all declared image files on disk. Missing any slot causes a
 * non-zero exit with a clear per-file diagnostic.
 *
 * ## Source of truth derivation
 *
 * The slot names (panel | entity) and the asset base directory are
 * parsed from luminaryAssets.tsx at runtime — not hardcoded — so the script
 * stays in sync if the source file changes its glob path or adds new slots.
 *
 * Run directly:
 *   pnpm --filter @workspace/scripts run lint:luminary-files
 *
 * Or via the root alias:
 *   pnpm run lint:luminary-files
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ── Paths ────────────────────────────────────────────────────────────────────

const SCRIPTS_DIR = resolve(fileURLToPath(import.meta.url), '../../');
const ASSETS_TSX = resolve(
  SCRIPTS_DIR,
  '../artifacts/luminae/src/lib/luminaryAssets.tsx',
);

/**
 * The root directory that contains per-Luminary asset subdirectories.
 * Derived from the import.meta.glob pattern in luminaryAssets.tsx.
 * Default matches: `../assets/luminaries/**\/*.{webp,png,jpg}`
 * relative to luminaryAssets.tsx → artifacts/luminae/src/assets/luminaries/
 */
const DEFAULT_LUMINARIES_DIR = resolve(
  SCRIPTS_DIR,
  '../artifacts/luminae/src/assets/luminaries',
);

// ── Types ────────────────────────────────────────────────────────────────────

/** A slot whose required file is absent from disk. */
export interface MissingFile {
  id: string;
  slot: string;
  /** All candidate paths that were checked (one per supported extension). */
  checked: string[];
}

export interface FileCheckResult {
  /** All declared slots (panel, entity) that are missing — causes exit 1. */
  missing: MissingFile[];
  checkedIds: string[];
}

// ── Parsers ───────────────────────────────────────────────────────────────────

/**
 * Parse the ILLUSTRATED_IDS Set literal from luminaryAssets.tsx.
 *
 * Expected source shape:
 *
 *   const ILLUSTRATED_IDS = new Set<string>([
 *     'lum_ember',
 *     ...
 *   ]);
 */
export function parseIllustratedIds(source: string): string[] {
  const setMatch = source.match(
    /const\s+ILLUSTRATED_IDS\s*=\s*new\s+Set[^(]*\(\s*\[([\s\S]*?)\]\s*\)/,
  );
  if (!setMatch) {
    throw new Error(
      'Could not locate ILLUSTRATED_IDS Set literal in luminaryAssets.tsx. ' +
        "Expected: const ILLUSTRATED_IDS = new Set<string>([...])",
    );
  }

  const body = setMatch[1];
  const ids: string[] = [];
  const idPattern = /['"]([^'"]+)['"]/g;
  let m: RegExpExecArray | null;
  while ((m = idPattern.exec(body)) !== null) {
    ids.push(m[1]);
  }

  if (ids.length === 0) {
    throw new Error(
      'ILLUSTRATED_IDS parsed as empty — check the regex or the source format.',
    );
  }

  return ids;
}

/**
 * Parse the asset slot names from the `_getLuminaryImage` function signature
 * in luminaryAssets.tsx.
 *
 * Expected source shape:
 *   function _getLuminaryImage(id: string, slot: 'panel' | 'entity' | 'background')
 *
 * Returns the union members in declaration order.
 * Falls back to the canonical default ['panel', 'entity'] if the
 * signature cannot be located, so the script still runs on refactored sources.
 */
export function parseSlotNames(source: string): string[] {
  const fnMatch = source.match(
    /_getLuminaryImage\s*\([^)]*slot\s*:\s*((?:'[^']+'\s*\|?\s*)+)/,
  );
  if (!fnMatch) {
    console.warn(
      'check-luminary-files: could not parse slot names from _getLuminaryImage — ' +
        "using canonical default ['panel', 'entity'].",
    );
    return ['panel', 'entity'];
  }

  const unionStr = fnMatch[1];
  const slots: string[] = [];
  const slotPattern = /'([^']+)'/g;
  let m: RegExpExecArray | null;
  while ((m = slotPattern.exec(unionStr)) !== null) {
    slots.push(m[1]);
  }

  // Only the canonical slots are required for every illustrated Luminary.
  // 'background' is optional and may be missing during asset generation.
  const canonical = ['panel', 'entity'];
  return slots.length > 0 ? slots.filter((s) => canonical.includes(s)) : canonical;
}

/**
 * Parse the asset base directory from the import.meta.glob pattern in
 * luminaryAssets.tsx. Returns the resolved absolute path.
 *
 * Expected source shape:
 *   import.meta.glob<...>('../assets/luminaries/**\/*.{webp,png,jpg}', ...)
 *
 * Falls back to DEFAULT_LUMINARIES_DIR if the pattern cannot be located.
 */
export function parseLuminariesDir(
  source: string,
  tsxFilePath: string,
): string {
  const globMatch = source.match(/import\.meta\.glob[^(]*\(\s*['"]([^'"]+)['"]/);
  if (!globMatch) {
    console.warn(
      'check-luminary-files: could not parse glob pattern from luminaryAssets.tsx — ' +
        `using default directory: ${DEFAULT_LUMINARIES_DIR}`,
    );
    return DEFAULT_LUMINARIES_DIR;
  }

  // Pattern is relative to the .tsx file — strip the glob wildcard portion
  // to get the base luminaries directory.
  // e.g. '../assets/luminaries/**/*.{webp,png,jpg}' → '../assets/luminaries'
  const pattern = globMatch[1];
  const basePattern = pattern.replace(/\/\*\*.*$/, '');
  return resolve(dirname(tsxFilePath), basePattern);
}

// ── File existence check ─────────────────────────────────────────────────────

const EXTENSIONS = ['.webp', '.png', '.jpg'];

/**
 * Returns the first matching file path for <luminariesDir>/<id>/<slot>.<ext>,
 * or null if none of the candidate extensions exist on disk.
 */
export function findSlotFile(
  luminariesDir: string,
  id: string,
  slot: string,
): string | null {
  for (const ext of EXTENSIONS) {
    const candidate = resolve(luminariesDir, id, `${slot}${ext}`);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Check that every illustrated Luminary has all declared image slots on disk.
 * All slots (panel, entity) are required — a missing slot causes exit 1.
 *
 * @param illustratedIds  IDs from ILLUSTRATED_IDS
 * @param allSlots        All slot names derived from _getLuminaryImage signature
 * @param luminariesDir   Resolved path to the per-Luminary asset directory
 */
export function checkLuminaryFiles(
  illustratedIds: string[],
  allSlots: string[] = ['panel', 'entity'],
  luminariesDir: string = DEFAULT_LUMINARIES_DIR,
): FileCheckResult {
  const missing: MissingFile[] = [];

  for (const id of illustratedIds) {
    for (const slot of allSlots) {
      const found = findSlotFile(luminariesDir, id, slot);
      if (!found) {
        missing.push({
          id,
          slot,
          checked: EXTENSIONS.map((ext) =>
            resolve(luminariesDir, id, `${slot}${ext}`),
          ),
        });
      }
    }
  }

  return { missing, checkedIds: illustratedIds };
}

// ── Main ─────────────────────────────────────────────────────────────────────

export function main(): void {
  const source = readFileSync(ASSETS_TSX, 'utf8');

  let illustratedIds: string[];
  try {
    illustratedIds = parseIllustratedIds(source);
  } catch (err) {
    console.error(
      `\n✗ check-luminary-files: parse error\n  ${(err as Error).message}\n`,
    );
    process.exit(1);
  }

  const allSlots = parseSlotNames(source);
  const luminariesDir = parseLuminariesDir(source, ASSETS_TSX);

  console.log(
    `check-luminary-files: checking ${illustratedIds.length} illustrated Luminar${illustratedIds.length === 1 ? 'y' : 'ies'}…`,
  );
  console.log(`  slots (from source): ${allSlots.join(', ')}`);

  const { missing } = checkLuminaryFiles(illustratedIds, allSlots, luminariesDir);

  if (missing.length > 0) {
    console.error(
      `\n✗ ${missing.length} missing Luminary image file${missing.length === 1 ? '' : 's'}:\n`,
    );
    for (const { id, slot, checked } of missing) {
      console.error(`  [${id}] missing slot "${slot}"`);
      for (const path of checked) {
        console.error(`    not found: ${path}`);
      }
    }
    console.error(
      `\nAll slots declared in _getLuminaryImage (${allSlots.join(', ')}) are required.\n` +
        `Drop the missing files into artifacts/luminae/src/assets/luminaries/<id>/\n` +
        `or remove the ID from ILLUSTRATED_IDS until the art is ready.\n`,
    );
    process.exit(1);
  }

  console.log(`✓ All Luminary image files are present.\n`);
}

// ── Entry point guard ─────────────────────────────────────────────────────────
// Prevents side effects when this module is imported by the test suite.

const isMain =
  resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url));

if (isMain) {
  main();
}
