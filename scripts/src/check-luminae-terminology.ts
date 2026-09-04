#!/usr/bin/env tsx

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Rule {
  pattern: RegExp;
  replacement: string;
}

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), '../../../');
const SCAN_ROOTS = [
  'artifacts/luminae/src',
  'artifacts/api-server/src',
  'artifacts/mockup-sandbox/src',
  'lib/api-spec/openapi.yaml',
  'lib/game-types/src',
  'lib/api-client-react/src',
  'scripts/overlay-audit',
  'scripts/src',
] as const;

const CHECKER_PATH = 'scripts/src/check-luminae-terminology.ts';

const RULES: Rule[] = [
  { pattern: /@\/lib\/gemMeta\b/, replacement: 'import from @/lib/affinityMeta' },
  { pattern: /\bGemKey\b/, replacement: 'use AffinityKey' },
  { pattern: /\bGemMeta\b/, replacement: 'use AffinityMeta' },
  { pattern: /\bGEM_META\b/, replacement: 'use AFFINITY_META' },
  { pattern: /\bGEM_KEYS\b/, replacement: 'use AFFINITY_KEYS' },
  { pattern: /\bCrystalCounts\b/, replacement: 'use AffinityCounts' },
  { pattern: /\bCardMarker(?:Type)?\b/, replacement: 'use ArtifactMarker or ArtifactMarkerType' },
  // Flux is now the canonical Flare + Continuum Civilization dyad. Keep the
  // property/key checks below for legacy Affinity-count usage, but do not reject
  // the dyad's string ID wherever it is stored or asserted.
  { pattern: /['"](?:ruby|pearl|emerald|sapphire|onyx)['"]/, replacement: 'use canonical Affinity IDs' },
  { pattern: /\.(?:ruby|pearl|emerald|sapphire|onyx|flux)\b/, replacement: 'use canonical Affinity IDs' },
  { pattern: /\b(?:ruby|pearl|emerald|sapphire|onyx|flux)\s*:/, replacement: 'use canonical Affinity IDs' },
  { pattern: /\b(?:take_three_crystals|take_two_crystals|purchase_card|purchase_reserved|reserve_card)\b/, replacement: 'use canonical Luminae action discriminants' },
  { pattern: /\b(?:crystalBank|marketTier[123]|marketMarkers|purchasedCardIds|purchasedCardBonusSnapshots|purchasedCards|reservedCardIds|reservedCards|bonusColor|returnCrystals|marketRedraw|crystalReturn)\b/, replacement: 'use canonical Luminae state and procedure fields' },
  { pattern: /\b(?:crystals|lumens|prestige)\b/, replacement: 'use Affinities or Eminence for game-model fields' },
  { pattern: /\bgem_/, replacement: 'use the affinity_ asset prefix' },
  { pattern: /data-market-/, replacement: 'use data-forge-* selectors' },
  { pattern: /data-testid=.*gem-/, replacement: 'use affinity test selectors' },
  { pattern: /\bCrystalColor(?:WithFlux)?\b/, replacement: 'use AffinityKey or StandardAffinityKey' },
  { pattern: /\bCRYSTAL_COLORS\b/, replacement: 'use STANDARD_AFFINITY_KEYS' },
  { pattern: /\buseMarketKeyboardNav\b/, replacement: 'call useForgeKeyboardNav' },
  { pattern: /\bMarketGridNav\b/, replacement: 'use ForgeGridNav' },
  { pattern: /\bplayCardPurchased\s*\(/, replacement: 'use playArtifactForged' },
  { pattern: /\bplayCardReserved\s*\(/, replacement: 'use playArtifactReserved' },
  { pattern: /\bplayMarketRefill\s*\(/, replacement: 'use playForgeRefill' },
  { pattern: /\bTutorialMarketView\b/, replacement: 'use TutorialForgeView' },
  { pattern: /\bFORGE_MARKET\b/, replacement: 'use FORGE_ARTIFACT' },
  { pattern: /\bScriptedMarket\b/, replacement: 'use ScriptedForge' },
  { pattern: /\bMarketTabs\b/, replacement: 'use ForgeViewTabs' },
  { pattern: /\bpurchaseBurst\b/, replacement: 'use a Forge-specific animation name' },
  { pattern: /\b(?:isPurchaseOrReserve|myPurchasedCards|showPurchased|setShowPurchased|purchasedBefore)\b/, replacement: 'name internal forged Artifact concepts directly' },
  { pattern: /\b(?:lumLumens|playerLumens|prevLumensRef|currentLumens|maxLumens|tiedOnLumens|lumensDiff)\b/, replacement: 'use Eminence for internal score concepts' },
  { pattern: /\bpendingLumens\b/, replacement: 'use pendingEminence' },
  { pattern: /\bprestige\b/i, replacement: 'use Eminence' },
  { pattern: /\b(?:scoreAfter|displayScore|scoreMap|snapScores|afterScores)\b/, replacement: 'use Eminence-specific names for game result values' },
  { pattern: /\bmarketCompact\b/, replacement: 'use forgeCompact' },
  { pattern: /\bmarket_deal_flip\b/, replacement: 'use forge_refill_flip' },
  { pattern: /\b(?:stepsHaveMarketEffect|hasMarketEffect|MockMarketTile|MockMarketBoard|hasAnyMarketCards|marketArr|allMarket|allMarketIds)\b/, replacement: 'name internal Forge concepts directly' },
  { pattern: /\bMARKET_SLOTS\b/, replacement: 'use FORGE_SLOTS' },
  { pattern: /\b(?:let|const)\s+(?:marketMarkers|marketTier[123])\b/, replacement: 'use Forge names for locals' },
  { pattern: /\bselectedCrystals\b/, replacement: 'use selectedAffinities' },
  { pattern: /\b(?:new|added)Crystals\b/, replacement: 'name held Affinity state by its transition' },
  { pattern: /\bcrystalType\b/, replacement: 'use affinityType' },
  { pattern: /\bcrystalTotals\b/, replacement: 'name held Affinity totals explicitly' },
  { pattern: /actionType\s*:\s*['"]purchase['"]/, replacement: 'use Forge terminology for local action types' },
  { pattern: /\bpurchase-burst\b/, replacement: 'use forge-burst' },
  { pattern: /\bcrystal-queued-pulse\b/, replacement: 'use affinity-queued-pulse' },
  { pattern: /\bscoreChange\b/, replacement: 'use eminenceChange' },
  { pattern: /target\s*:\s*['"]score['"]/, replacement: 'use the Eminence effect target' },
  { pattern: /\bmarket (?:cards?|slots?)\b/i, replacement: 'describe Forge Artifacts or Forge slots' },
  { pattern: /\b(?:gem|crystal) (?:harvest|burst|buttons?)\b/i, replacement: 'use Affinity and Harness terminology' },
  { pattern: /\bharvest(?:ed|ing)? (?:gems?|crystals?|affinit(?:y|ies)|tokens?)\b/i, replacement: 'use Harness Affinities' },
  { pattern: /\bcard purchases?\b/i, replacement: 'describe forging an Artifact' },
  { pattern: /\b(?:bonus|seeded) cards?\b/i, replacement: 'describe the relevant Artifact directly' },
  { pattern: /\b(?:Card has been burned|Card not found|Card not in your reserved pile|Cannot reserve more than 3 cards)\b/i, replacement: 'use Artifact in runtime messages' },
  { pattern: /\bCosmic patron\b/i, replacement: 'use Luminary terminology' },
  { pattern: /\b(?:CrystalIcon|ForgeMarketCardSlot|ArrivalMarketOverlay)\b/, replacement: 'use the canonical component export' },
  { pattern: /\bSplendor\b/i, replacement: 'describe Luminae directly' },
];

function collectFiles(path: string): string[] {
  if (statSync(path).isFile()) return [path];

  return readdirSync(path, { withFileTypes: true }).flatMap((entry) => {
    const child = resolve(path, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'generated' || entry.name === 'node_modules') return [];
      return collectFiles(child);
    }
    return /\.(?:ts|tsx|js|cjs|mjs|py|css|ya?ml)$/.test(entry.name) ? [child] : [];
  });
}

const violations: string[] = [];

for (const root of SCAN_ROOTS) {
  for (const path of collectFiles(resolve(REPO_ROOT, root))) {
    const repoPath = relative(REPO_ROOT, path);
    if (repoPath === CHECKER_PATH) continue;

    const lines = readFileSync(path, 'utf8').split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        if (rule.pattern.test(line)) {
          violations.push(`${repoPath}:${index + 1}: ${rule.replacement}`);
        }
      }
    });
  }
}

if (violations.length > 0) {
  console.error('Active code contains retired game-model terminology:');
  for (const violation of violations) console.error(`  ${violation}`);
  process.exit(1);
}

console.log('Luminae terminology check passed.');
