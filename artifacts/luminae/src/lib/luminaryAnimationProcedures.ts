// Luminary animation procedures — UI-only, no game mechanic changes.
//
// Each Luminary activation resolves to an ordered AnimationProcedureStep[]
// driven by the current GameState at the time the cinematic plays.
// Target IDs come from live state — no engine changes required.
//
// Mechanics live exclusively in gameEngine.ts.

import type { GameState, ArtifactCard } from '@workspace/api-client-react';
import type { AnimationProcedureStep, KeywordMarker } from './animationProcedure';

// ── Helpers ────────────────────────────────────────────────────────────────────

function t3(s: GameState): ArtifactCard[] { return s.marketTier3 ?? []; }
function t2(s: GameState): ArtifactCard[] { return s.marketTier2 ?? []; }
function t1(s: GameState): ArtifactCard[] { return s.marketTier1 ?? []; }
function t3Ids(s: GameState): string[] { return t3(s).map(c => c.id); }
function t2Ids(s: GameState): string[] { return t2(s).map(c => c.id); }
function allMarket(s: GameState): ArtifactCard[] { return [...t3(s), ...t2(s), ...t1(s)]; }
function allMarketIds(s: GameState): string[] { return allMarket(s).map(c => c.id); }
function allPlayerIds(s: GameState): string[] { return (s.players ?? []).map(p => p.playerId); }
function markedIds(s: GameState, type: string): string[] {
  return Object.entries(s.marketMarkers ?? {})
    .filter(([, m]) => m.type === type)
    .map(([id]) => id);
}
function byBonus(cards: ArtifactCard[], colors: string[]): ArtifactCard[] {
  return cards.filter(c => colors.includes(c.bonusColor));
}
function excludeBonus(cards: ArtifactCard[], excluded: string[]): ArtifactCard[] {
  return cards.filter(c => !excluded.includes(c.bonusColor));
}
function pulse(luminaryId: string): AnimationProcedureStep {
  return { type: 'luminaryPulse', luminaryId };
}
function residue(keyword: KeywordMarker, targetIds: string[]): AnimationProcedureStep {
  return { type: 'residue', keyword, targetIds };
}

// ── Per-Luminary resolvers ─────────────────────────────────────────────────────

// 1. Red Moth / Rupture of the Still (lum_moth)
//    luminaryPulse → targetClaim Tier III+II → burn → marketRedraw
function resolveMoth(s: GameState): AnimationProcedureStep[] {
  const targets = [...t3Ids(s), ...t2Ids(s)];
  return [
    pulse('lum_moth'),
    { type: 'targetClaim', targetIds: targets },
    { type: 'keywordEvent', keyword: 'burn', targetIds: targets },
    { type: 'marketRedraw', slotIds: [] },
  ];
}

// 2. Tide Architect / The Observer Effect (lum_tide)
//    luminaryPulse → deckScry Tier II/III → marketRedraw
function resolveTide(): AnimationProcedureStep[] {
  return [
    pulse('lum_tide'),
    { type: 'deckScry', tierIds: ['tier2', 'tier3'] },
    { type: 'marketRedraw', slotIds: [] },
  ];
}

// 3. Verdant Oracle / Early Bloom (lum_verdant)
//    luminaryPulse only — TargetBadge fallback ("BOON · AFFINITIES · LINGERING")
//    is clearer for a living-affinity bonus than a bare ⬡ CLAIM [playerId] pill.
function resolveVerdant(_s: GameState, _ownerId: string): AnimationProcedureStep[] {
  return [
    pulse('lum_verdant'),
  ];
}

// 4. Void Warden / Oblivion (lum_void)
//    luminaryPulse → board-wide scoreChange all players −4
function resolveVoid(s: GameState): AnimationProcedureStep[] {
  return [
    pulse('lum_void'),
    { type: 'scoreChange', playerIds: allPlayerIds(s), amount: -4 },
  ];
}

// 5. Concordance Mandala / Perfect Coherence (lum_radiant)
//    luminaryPulse → Radiance (pearl) artifact targetClaim → scoreChange owner +2
function resolveRadiant(s: GameState, ownerId: string): AnimationProcedureStep[] {
  const pearlIds = byBonus(allMarket(s), ['pearl']).map(c => c.id);
  return [
    pulse('lum_radiant'),
    { type: 'targetClaim', targetIds: pearlIds },
    { type: 'scoreChange', playerIds: [ownerId], amount: 2 },
  ];
}

// 6. Phoenix Paradox / Ash-Seeking Recurrence (lum_astral)
//    luminaryPulse → targetClaim Tier III+II → burn non-Flare/Continuum → marketRedraw
function resolveAstral(s: GameState): AnimationProcedureStep[] {
  const combined = [...t3(s), ...t2(s)];
  const allIds = combined.map(c => c.id);
  const burnIds = excludeBonus(combined, ['ruby', 'sapphire']).map(c => c.id);
  return [
    pulse('lum_astral'),
    { type: 'targetClaim', targetIds: allIds },
    { type: 'keywordEvent', keyword: 'burn', targetIds: burnIds },
    { type: 'marketRedraw', slotIds: [] },
  ];
}

// 7. Catalyst Bloom / Aftergrowth (lum_bloom)
//    luminaryPulse → bloom pulse → scoreChange owner +(total burn count)
function resolveBloom(s: GameState, ownerId: string): AnimationProcedureStep[] {
  const burnCount = (s.burnEvents ?? []).length;
  return [
    pulse('lum_bloom'),
    { type: 'scoreChange', playerIds: [ownerId], amount: burnCount },
  ];
}

// 8. Iron Harbinger / Impact Extinction (lum_forge)
//    luminaryPulse → targetClaim all face-up Tier III → burn all → marketRedraw
function resolveForge(s: GameState): AnimationProcedureStep[] {
  const targets = t3Ids(s);
  return [
    pulse('lum_forge'),
    { type: 'targetClaim', targetIds: targets },
    { type: 'keywordEvent', keyword: 'burn', targetIds: targets },
    { type: 'marketRedraw', slotIds: [] },
  ];
}

// 9. lum_compass / The Forgotten Hour
//    luminaryPulse → targetClaim all face-up market → forgotten residue → Eminence muted
function resolveCompass(s: GameState): AnimationProcedureStep[] {
  const targets = allMarketIds(s);
  return [
    pulse('lum_compass'),
    { type: 'targetClaim', targetIds: targets },
    residue('forgotten', targets),
  ];
}

// 10. Seed Beyond Seasons / Avatar Seeds (lum_seed)
//     luminaryPulse → deckScry all tiers → seeded residue on top cards (appear on market entry)
function resolveSeed(): AnimationProcedureStep[] {
  return [
    pulse('lum_seed'),
    { type: 'deckScry', tierIds: ['tier1', 'tier2', 'tier3'], affinityBias: 'seeded' },
    residue('seeded', []),  // targetIds resolved when seeded cards appear in market
  ];
}

// 11. Glass Orchard / Perfect Replication (lum_orchard)
//     luminaryPulse → cheapest Tier I targetClaim → boon ConsequenceSnap
//     No scoreChange step — +0 EMN was actively misleading ("nothing happened").
//     The CLAIM pill + golden boon flash communicates "you received something good."
function resolveOrchard(s: GameState, _ownerId: string): AnimationProcedureStep[] {
  const tier1Cards = t1(s);
  const cheapest = tier1Cards.reduce<ArtifactCard | null>((min, c) => {
    if (!min) return c;
    const costOf = (card: ArtifactCard) =>
      Object.values(card.cost ?? {}).reduce<number>((a, v) => a + (v as number), 0);
    return costOf(c) < costOf(min) ? c : min;
  }, null);
  return [
    pulse('lum_orchard'),
    { type: 'targetClaim', targetIds: cheapest ? [cheapest.id] : [] },
  ];
}

// 12. Pale Merchant / Balance Due (lum_pale)
//     luminaryPulse → player crystal areas targetClaim → crystalReturn players above threshold
function resolvePale(s: GameState): AnimationProcedureStep[] {
  const playerIds = allPlayerIds(s);
  return [
    pulse('lum_pale'),
    { type: 'targetClaim', targetIds: playerIds },
    { type: 'crystalReturn', playerIds },
  ];
}

// 13. Ember Sovereign / Cinder Mandate (lum_ember)
//     On summon: luminaryPulse → targetClaim non-Flare/Abyss/Radiance → condemned residue
//     On start_of_turn: condemned cards flare → burn → marketRedraw
function resolveEmber(
  s: GameState,
  effectType: 'summon' | 'end_of_turn' | 'start_of_turn',
): AnimationProcedureStep[] {
  if (effectType === 'start_of_turn') {
    const condemnedIds = markedIds(s, 'condemned');
    return [
      pulse('lum_ember'),
      { type: 'targetClaim', targetIds: condemnedIds },
      { type: 'keywordEvent', keyword: 'burn', targetIds: condemnedIds },
      { type: 'marketRedraw', slotIds: [] },
    ];
  }
  // summon / end_of_turn: mark cards as condemned
  const affected = excludeBonus(allMarket(s), ['ruby', 'onyx', 'pearl']).map(c => c.id);
  return [
    pulse('lum_ember'),
    { type: 'targetClaim', targetIds: affected },
    residue('condemned', affected),
  ];
}

// 14. First Hunger / Assimilate (lum_hunger)
//     On summon: luminaryPulse → pendingAction assimilate appears as replacement core action
function resolveHunger(_s: GameState, ownerId: string): AnimationProcedureStep[] {
  return [
    pulse('lum_hunger'),
    { type: 'pendingAction', action: 'assimilate', ownerId },
  ];
}

// 15. Null Sovereign / Black Domain (lum_null)
//     luminaryPulse → targetClaim face-up Tier III → nullified residue → Eminence muted
function resolveNull(s: GameState): AnimationProcedureStep[] {
  const targets = t3Ids(s);
  return [
    pulse('lum_null'),
    { type: 'targetClaim', targetIds: targets },
    residue('nullified', targets),
  ];
}

// ── Master resolver ────────────────────────────────────────────────────────────

type EffectType = 'summon' | 'end_of_turn' | 'start_of_turn';

/**
 * Resolves the animation procedure for a Luminary activation.
 * Returns [] for unknown Luminaries or null state — never throws.
 * Procedures are UI-only: they describe the visual sequence without changing mechanics.
 */
export function resolveLuminaryProcedure(
  luminaryId: string,
  effectType: EffectType,
  state: GameState | null | undefined,
  ownerId: string,
): AnimationProcedureStep[] {
  if (!state) return [];
  try {
    switch (luminaryId) {
      case 'lum_moth':    return resolveMoth(state);
      case 'lum_tide':    return resolveTide();
      case 'lum_verdant': return resolveVerdant(state, ownerId);
      case 'lum_void':    return resolveVoid(state);
      case 'lum_radiant': return resolveRadiant(state, ownerId);
      case 'lum_astral':  return resolveAstral(state);
      case 'lum_bloom':   return resolveBloom(state, ownerId);
      case 'lum_forge':   return resolveForge(state);
      case 'lum_compass': return resolveCompass(state);
      case 'lum_seed':    return resolveSeed();
      case 'lum_orchard': return resolveOrchard(state, ownerId);
      case 'lum_pale':    return resolvePale(state);
      case 'lum_ember':   return resolveEmber(state, effectType);
      case 'lum_hunger':  return resolveHunger(state, ownerId);
      case 'lum_null':    return resolveNull(state);
      default:            return [];
    }
  } catch {
    return [];
  }
}
