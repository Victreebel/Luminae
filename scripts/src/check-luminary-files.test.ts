#!/usr/bin/env tsx
/**
 * check-luminary-files.test.ts
 *
 * Exercises parseIllustratedIds, parseSlotNames, parseLuminariesDir, and
 * checkLuminaryFiles with synthetic inputs so that the parser and file-check
 * logic can be validated in isolation (without touching real disk state or
 * real source files).
 *
 * Also runs the live check against the real luminaryAssets.tsx and the real
 * asset directory so that any newly added ILLUSTRATED_IDS entry without
 * corresponding files is caught immediately.
 *
 * Run directly:
 *   pnpm --filter @workspace/scripts run test:luminary-files
 *
 * Or via the root alias:
 *   pnpm run test:luminary-files
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  parseIllustratedIds,
  parseSlotNames,
  parseLuminariesDir,
  checkLuminaryFiles,
} from './check-luminary-files.js';

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

// ── Paths ─────────────────────────────────────────────────────────────────────

const SCRIPTS_DIR = resolve(fileURLToPath(import.meta.url), '../../');
const ASSETS_TSX = resolve(
  SCRIPTS_DIR,
  '../artifacts/luminae/src/lib/luminaryAssets.tsx',
);

// ── Unit tests: parseIllustratedIds ───────────────────────────────────────────

console.log('\n── parseIllustratedIds ──────────────────────────────────────────');

{
  const source = `
    const ILLUSTRATED_IDS = new Set<string>([
      'lum_ember',
      'lum_forge',
      'lum_verdant',
    ]);
  `;
  const ids = parseIllustratedIds(source);
  assert(ids.length === 3, `parses 3 IDs — got ${ids.length}`);
  assert(ids.includes('lum_ember'), 'includes lum_ember');
  assert(ids.includes('lum_forge'), 'includes lum_forge');
  assert(ids.includes('lum_verdant'), 'includes lum_verdant');
}

{
  let threw = false;
  try {
    parseIllustratedIds('const SOMETHING_ELSE = new Set<string>(["lum_x"]);');
  } catch {
    threw = true;
  }
  assert(threw, 'throws when ILLUSTRATED_IDS is not found');
}

{
  const source = `const ILLUSTRATED_IDS = new Set<string>([]);`;
  let threw = false;
  try {
    parseIllustratedIds(source);
  } catch {
    threw = true;
  }
  assert(threw, 'throws when ILLUSTRATED_IDS is empty');
}

// ── Unit tests: parseSlotNames ────────────────────────────────────────────────

console.log('\n── parseSlotNames ───────────────────────────────────────────────');

{
  const source = `function _getLuminaryImage(id: string, slot: 'panel' | 'entity' | 'aura'): string | null {`;
  const slots = parseSlotNames(source);
  assert(slots.length === 3, `parses 3 slots — got ${slots.length}`);
  assert(slots[0] === 'panel', `first slot is panel — got ${slots[0]}`);
  assert(slots[1] === 'entity', `second slot is entity — got ${slots[1]}`);
  assert(slots[2] === 'aura', `third slot is aura — got ${slots[2]}`);
}

{
  // Falls back gracefully when signature can't be found
  const slots = parseSlotNames('// no function here');
  assert(
    slots.length === 3,
    `falls back to canonical 3 slots — got ${slots.length}`,
  );
  assert(slots.includes('panel'), 'fallback includes panel');
  assert(slots.includes('entity'), 'fallback includes entity');
  assert(slots.includes('aura'), 'fallback includes aura');
}

// ── Unit tests: parseLuminariesDir ────────────────────────────────────────────

console.log('\n── parseLuminariesDir ───────────────────────────────────────────');

{
  const source = `const _luminaryImageModules = import.meta.glob<{ default: string }>(
  '../assets/luminaries/**/*.{webp,png,jpg}',
  { eager: true },
);`;
  const dir = parseLuminariesDir(source, ASSETS_TSX);
  assert(dir.endsWith('luminaries'), `resolves to luminaries dir — got ${dir}`);
  assert(!dir.includes('**'), 'strips glob wildcard from path');
}

{
  // Falls back to default when glob not found
  const dir = parseLuminariesDir('// no glob here', ASSETS_TSX);
  assert(dir.endsWith('luminaries'), `falls back to default dir — got ${dir}`);
}

// ── Unit tests: checkLuminaryFiles ────────────────────────────────────────────

console.log('\n── checkLuminaryFiles ───────────────────────────────────────────');

{
  const { missing, checkedIds } = checkLuminaryFiles([]);
  assert(missing.length === 0, 'empty ID list → no missing files');
  assert(checkedIds.length === 0, 'empty ID list → checkedIds is empty');
}

{
  // ID that does not exist on disk → all 3 slots reported as missing
  const { missing } = checkLuminaryFiles(['lum_does_not_exist_xyz']);
  assert(missing.length === 3, `nonexistent ID → 3 missing (all slots) — got ${missing.length}`);
  assert(missing[0].slot === 'panel', `first missing slot is panel — got ${missing[0].slot}`);
  assert(missing[1].slot === 'entity', `second missing slot is entity — got ${missing[1].slot}`);
  assert(missing[2].slot === 'aura', `third missing slot is aura — got ${missing[2].slot}`);
  assert(missing[0].checked.length === 3, 'checks 3 extensions per slot');
}

{
  // Custom slot list: only panel
  const { missing } = checkLuminaryFiles(['lum_does_not_exist_xyz'], ['panel']);
  assert(missing.length === 1, `single-slot check → 1 missing — got ${missing.length}`);
  assert(missing[0].slot === 'panel', 'missing slot is panel');
}

// ── Integration test: live source files ───────────────────────────────────────

console.log('\n── Live integration check ───────────────────────────────────────');

const assetsSrc = readFileSync(ASSETS_TSX, 'utf-8');
let illustratedIds: string[];

try {
  illustratedIds = parseIllustratedIds(assetsSrc);
  assert(
    illustratedIds.length > 0,
    `ILLUSTRATED_IDS has at least 1 entry — found ${illustratedIds.length}`,
  );
} catch (err) {
  console.error(`  FAIL: could not parse ILLUSTRATED_IDS — ${(err as Error).message}`);
  failures++;
  process.exit(1);
}

const allSlots = parseSlotNames(assetsSrc);
const luminariesDir = parseLuminariesDir(assetsSrc, ASSETS_TSX);

assert(
  allSlots.includes('panel') && allSlots.includes('entity') && allSlots.includes('aura'),
  `live slot list includes panel, entity, and aura — got [${allSlots.join(', ')}]`,
);

const { missing } = checkLuminaryFiles(illustratedIds, allSlots, luminariesDir);

for (const id of illustratedIds) {
  const missingForId = missing.filter((m) => m.id === id);
  if (missingForId.length === 0) {
    console.log(`  pass: ${id} — all slots present`);
  } else {
    for (const { slot, checked } of missingForId) {
      console.error(`  FAIL: ${id} — missing slot "${slot}"`);
      console.error(`        checked: ${checked.join(', ')}`);
      failures++;
    }
  }
}

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('');
if (failures > 0) {
  console.error(`✗ ${failures} assertion${failures === 1 ? '' : 's'} failed\n`);
  process.exit(1);
} else {
  console.log(`✓ All assertions passed\n`);
}
