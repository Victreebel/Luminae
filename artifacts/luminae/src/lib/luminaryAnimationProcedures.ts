// Luminary animation procedures — UI-only, no game mechanic changes.
//
// Each Luminary activation resolves to an ordered AnimationTimelineStep[]
// driven by the current GameState at the time the cinematic plays.
// Target IDs come from live state — no engine changes required.
//
// Mechanics live exclusively in gameEngine.ts.
//
// ─────────────────────────────────────────────────────────────────────────────
// ANIMATION COMPREHENSION AUDIT  (all 15 active Luminaries)
//
// Four pillars checked per Luminary:
//   Source  — Luminary entity/name visible before any consequence fires
//   Target  — Affected entity highlighted (targetClaim pill) before resolution
//   Result  — Keyword animation is visually distinct (not generic fade/shrink)
//   Marker  — Persistent keyword overlays (Condemned/Nullified/Forgotten/Seeded)
//             appear and clear with visible transitions
//
// Luminary              | Source | Target | Result | Marker | Issues found           | Fix applied
// ──────────────────────|────────|────────|────────|────────|────────────────────────|────────────
// Red Moth              |  ✓     |  ✓     |  ✓     |  —     | None                   | —
// Tide Architect        |  ✓     |  ✓     |  ✓     |  —     | None                   | —
// Verdant Oracle        |  ✓     |  ✓*    |  ✓     |  —     | *TargetBadge fallback  | —
// Void Warden           |  ✓     |  ✓     |  ✓     |  —     | None                   | —
// Concordance Mandala   |  ✓     |  ✓     |  ✓     |  —     | None                   | —
// Phoenix Paradox       |  ✓     |  ✓     |  ✓     |  —     | None                   | —
// Catalyst Bloom        |  ✓     |  ✗     |  ✗*    |  —     | No targetClaim; used   | Added
//                       |        |        |        |        | burnEvents.length      | targetClaim
//                       |        |        |        |        | (should be burnPile)   | + burnPile
// Iron Harbinger        |  ✓     |  ✓     |  ✓     |  —     | None                   | —
// ??? (lum_compass)     |  ✓     |  ✓     |  ✓     |  ✓     | None                   | —
// Seed Beyond Seasons   |  ✓     |  ✓     |  ✓     |  ✓     | residue targetIds []   | —
//                       |        |        |        |        | (resolved on entry)    |
// Glass Orchard         |  ✓     |  ✓     |  ✓     |  —     | None                   | —
// Pale Merchant         |  ✓     |  ✓     |  ✓     |  —     | None                   | —
// Ember Sovereign       |  ✓     |  ✓     |  ✓     |  ✓     | None                   | —
// First Hunger          |  ✓     |  ✗     |  ✓     |  ✓     | No targetClaim before  | Added
//                       |        |        |        |        | pendingAction; owner   | targetClaim
//                       |        |        |        |        | not highlighted        | (ownerId)
// Null Sovereign        |  ✓     |  ✓     |  ✓     |  ✓     | None                   | —
//
// Marker exit transition (CardMarkerBadge.exit): was using framer-motion default
//   (could be near-instant).  Pinned to 0.28s ease-out in game-luminary-effects.tsx.
//
// Forgotten vs Nullified distinction (confirmed adequate):
//   - Forgotten:  backdropFilter saturate(0.50) — partial desaturation; ◎ icon
//   - Nullified:  backdropFilter saturate(0) brightness(0.82) contrast(0.90) — full void; ⊘ icon
//
// Condemned deferred-threat reading (confirmed adequate):
//   - kw-overlay-condemned: ember-edge pulse animation (CSS @keyframes kw-overlay-condemned)
//   - kw-condemned badge: ⚑ decree-flag icon; ArmedSigil ⧖ on portal = "will fire later"
//
// Burn pile registration (confirmed adequate):
//   - BurnBadgeOverlay shows transient "Burned ✕" badge on slot (satisfies "register with")
//   - Burn pile counter chip increments at next state update
// ─────────────────────────────────────────────────────────────────────────────

import type { GameState, ArtifactCard } from '@workspace/api-client-react';
import type { AnimationTimelineStep, KeywordMarker } from './animationProcedure';

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
function pulse(luminaryId: string): AnimationTimelineStep {
  return { type: 'luminaryPulse', luminaryId };
}
function residue(keyword: KeywordMarker, targetIds: string[]): AnimationTimelineStep {
  return { type: 'residue', keyword, targetIds };
}

// ── Per-Luminary resolvers ─────────────────────────────────────────────────────

// 1. Red Moth / Rupture of the Still (lum_moth)
//    luminaryPulse → targetClaim Tier III+II → burn → marketRedraw
function resolveMoth(s: GameState): AnimationTimelineStep[] {
  const targets = [...t3Ids(s), ...t2Ids(s)];
  return [
    pulse('lum_moth'),
    { type: 'targetClaim', targetIds: targets, keyword: 'burn' },
    { type: 'keywordEvents', events: [{ keyword: 'burn', targetIds: targets }] },
    { type: 'marketRedraw', slotIds: [] },
  ];
}

// 2. Tide Architect / The Observer Effect (lum_tide)
//    luminaryPulse → deckScry Tier II/III (sapphire bias = Continuum cards shimmer first) → marketRedraw
function resolveTide(): AnimationTimelineStep[] {
  return [
    pulse('lum_tide'),
    { type: 'deckScry', tierIds: ['tier2', 'tier3'], affinityBias: 'sapphire' },
    { type: 'marketRedraw', slotIds: [] },
  ];
}

// 3. Verdant Oracle / Early Bloom (lum_verdant)
//    luminaryPulse only — TargetBadge fallback ("BOON · AFFINITIES · LINGERING")
//    is clearer for a living-affinity bonus than a bare ⬡ CLAIM [playerId] pill.
function resolveVerdant(_s: GameState, _ownerId: string): AnimationTimelineStep[] {
  return [
    pulse('lum_verdant'),
  ];
}

// 4. Void Warden / Oblivion (lum_void)
//    luminaryPulse → targetClaim all players (incl. claimer) → scoreChange all −4
//    targetClaim ensures every player panel — including the claimer — is visibly
//    highlighted before the Eminence drain resolves.
function resolveVoid(s: GameState): AnimationTimelineStep[] {
  const players = allPlayerIds(s);
  return [
    pulse('lum_void'),
    { type: 'targetClaim', targetIds: players },
    { type: 'scoreChange', playerIds: players, amount: -4 },
  ];
}

// 5. Concordance Mandala / Perfect Coherence (lum_radiant)
//    luminaryPulse → Radiance (pearl) artifact targetClaim → scoreChange owner +2
function resolveRadiant(s: GameState, ownerId: string): AnimationTimelineStep[] {
  const pearlIds = byBonus(allMarket(s), ['pearl']).map(c => c.id);
  return [
    pulse('lum_radiant'),
    { type: 'targetClaim', targetIds: pearlIds },
    { type: 'scoreChange', playerIds: [ownerId], amount: 2 },
  ];
}

// 6. Phoenix Paradox / Ash-Seeking Recurrence (lum_astral)
//    Sequential reveal-until: non-Flare/Continuum cards burn one by one
//    from Tier III then Tier II until a matching card is found.
//    The surviving card locks into place with a final targetClaim.
function resolveAstral(s: GameState): AnimationTimelineStep[] {
  const t3Cards = t3(s);
  const t2Cards = t2(s);

  // Build reveal-until sequences per tier from the live state.
  // The engine has already resolved the cascade; we reconstruct the per-card
  // sequence from the current market (post-cascade) + burnEvents.
  function buildTierSequence(cards: ArtifactCard[], tier: number): AnimationTimelineStep[] {
    const result: AnimationTimelineStep[] = [];
    const nonMatching = excludeBonus(cards, ['ruby', 'sapphire']);
    const matching = byBonus(cards, ['ruby', 'sapphire']);

    // Non-matching cards: each is revealed and burned immediately
    for (const card of nonMatching) {
      result.push({ type: 'reveal', cardIds: [card.id], tier, stopCondition: 'Flare or Continuum', revealType: 'sequential' });
      result.push({ type: 'keywordEvent', keyword: 'burn', targetIds: [card.id] });
    }

    // Matching card: revealed and locked in (no burn)
    if (matching.length > 0) {
      // Use the first matching card as the survivor
      result.push({ type: 'reveal', cardIds: [matching[0].id], tier, stopCondition: 'Flare or Continuum', revealType: 'sequential' });
    }

    return result;
  }

  const t3Sequence = buildTierSequence(t3Cards, 3);
  const t2Sequence = buildTierSequence(t2Cards, 2);

  // Survivor IDs for the final lock-in pulse
  const survivorIds = [...byBonus(t3Cards, ['ruby', 'sapphire']).map(c => c.id),
                       ...byBonus(t2Cards, ['ruby', 'sapphire']).map(c => c.id)];

  return [
    pulse('lum_astral'),
    ...t3Sequence,
    ...t2Sequence,
    // Final lock-in pulse for surviving cards
    ...(survivorIds.length > 0
      ? [{ type: 'targetClaim' as const, targetIds: survivorIds }]
      : []),
    { type: 'marketRedraw', slotIds: [] },
  ];
}

// 7. Catalyst Bloom / Aftergrowth (lum_bloom)
//    luminaryPulse → targetClaim owner → scoreChange owner +(total burned cards)
//    Uses burnPile.length (canonical deduplicated burn count) not burnEvents.length.
//    targetClaim added so the owner panel is highlighted before the gain resolves,
//    making the source of Eminence legible without replaying individual burn events.
//
//    Zero-burn guard: if burnPile is empty the scoreChange step is omitted entirely.
//    This prevents "+0 EMN" appearing in the ProcedureStrip, which implies something
//    happened when nothing did. The targetClaim still fires (owner panel is highlighted
//    so the player can see why the cinematic played at all).
function resolveBloom(s: GameState, ownerId: string): AnimationTimelineStep[] {
  const burnCount = (s.burnPile ?? []).length;
  return [
    pulse('lum_bloom'),
    { type: 'targetClaim', targetIds: [ownerId] },
    ...(burnCount > 0
      ? [{ type: 'scoreChange' as const, playerIds: [ownerId], amount: burnCount }]
      : []),
  ];
}

// 8. Iron Harbinger / Impact Extinction (lum_forge)
//    luminaryPulse → targetClaim all face-up Tier III (hammer-shadow, keyword: burn pre-tint)
//    → burn all → marketRedraw
//    The burn pre-tint on targetClaim produces the "hammer-shadow falls before the strike" beat.
function resolveForge(s: GameState): AnimationTimelineStep[] {
  const targets = t3Ids(s);
  return [
    pulse('lum_forge'),
    { type: 'targetClaim', targetIds: targets, keyword: 'burn' },
    { type: 'keywordEvents', events: [{ keyword: 'burn', targetIds: targets }] },
    { type: 'marketRedraw', slotIds: [] },
  ];
}

// 9. lum_compass / The Forgotten Hour
//    luminaryPulse → deckScry all tiers (compass-needle sweep, hour-ring visual)
//    → targetClaim all face-up market → forgotten residue → Eminence muted
//    The deckScry step gives the "needle spins / broken hour-ring passes over the market"
//    beat before the Forgotten residue lands, making the suppression feel earned.
function resolveCompass(s: GameState): AnimationTimelineStep[] {
  const targets = allMarketIds(s);
  return [
    pulse('lum_compass'),
    { type: 'deckScry', tierIds: ['tier1', 'tier2', 'tier3'] },
    { type: 'targetClaim', targetIds: targets },
    residue('forgotten', targets),
  ];
}

// 10. Seed Beyond Seasons / Avatar Seeds (lum_seed)
//     luminaryPulse → deckScry all tiers → seeded residue on top cards (appear on market entry)
function resolveSeed(): AnimationTimelineStep[] {
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
function resolveOrchard(s: GameState, _ownerId: string): AnimationTimelineStep[] {
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
function resolvePale(s: GameState): AnimationTimelineStep[] {
  const playerIds = allPlayerIds(s);
  return [
    pulse('lum_pale'),
    { type: 'targetClaim', targetIds: playerIds },
    { type: 'crystalReturn', playerIds },
  ];
}

// 13. Ember Sovereign / Cinder Mandate (lum_ember)
//     On arrival: luminaryPulse → targetClaim non-Flare/Abyss/Radiance → condemned residue
//     On end_of_turn: condemned cards flare → burn → marketRedraw
//
//     payloadIds: card IDs captured by the server BEFORE the burn loop cleared marketMarkers.
//     Without the payload the client cannot resolve targets — marketMarkers is already empty
//     by the time the activation event is consumed. Always prefer payloadIds over a live state
//     lookup for the end_of_turn path.
function resolveEmber(
  s: GameState,
  effectType: 'summon' | 'end_of_turn' | 'start_of_turn', // API enum kept ('summon' = arrival effect)
  payloadIds?: string[],
): AnimationTimelineStep[] {
  if (effectType === 'end_of_turn' || effectType === 'start_of_turn') {
    // end_of_turn is the canonical burn trigger. start_of_turn is a backward-compat
    // fallback for events queued in games that pre-date the end-of-turn change.
    // Use server-captured IDs when available; fall back to live state for abridged/test paths.
    const condemnedIds = (payloadIds && payloadIds.length > 0)
      ? payloadIds
      : markedIds(s, 'condemned');
    return [
      pulse('lum_ember'),
      { type: 'targetClaim', targetIds: condemnedIds, keyword: 'burn' },
      { type: 'keywordEvents', events: [{ keyword: 'burn', targetIds: condemnedIds }] },
      { type: 'marketRedraw', slotIds: [] },
    ];
  }
  // arrival / end_of_turn: mark cards as condemned.
  // Prefer server-captured payload IDs — the definitive condemned list captured at
  // mark-time. Fall back to a live-state derivation only for dev/test paths where
  // the payload hasn't been set (e.g. dev-rewind or direct state injection).
  const affected = (payloadIds && payloadIds.length > 0)
    ? payloadIds
    : excludeBonus(allMarket(s), ['ruby', 'onyx', 'pearl']).map(c => c.id);
  return [
    pulse('lum_ember'),
    { type: 'targetClaim', targetIds: affected },
    residue('condemned', affected),
  ];
}

// 14. First Hunger / Assimilate (lum_hunger)
//     On arrival: luminaryPulse → targetClaim owner → pendingAction assimilate
//     targetClaim highlights the owner panel so the player knows who receives
//     the assimilate replacement action before the ASSIMILATE pill appears.
function resolveHunger(_s: GameState, ownerId: string): AnimationTimelineStep[] {
  return [
    pulse('lum_hunger'),
    { type: 'targetClaim', targetIds: [ownerId] },
    { type: 'pendingAction', action: 'assimilate', ownerId },
  ];
}

// 15. Null Sovereign / Black Domain (lum_null)
//     luminaryPulse → targetClaim face-up Tier III → nullified residue → Eminence muted
function resolveNull(s: GameState): AnimationTimelineStep[] {
  const targets = t3Ids(s);
  return [
    pulse('lum_null'),
    { type: 'targetClaim', targetIds: targets },
    residue('nullified', targets),
  ];
}

// ── Master resolver ────────────────────────────────────────────────────────────

type EffectType = 'summon' | 'end_of_turn' | 'start_of_turn'; // API enum kept ('summon' = arrival effect)

/**
 * Resolves the animation procedure for a Luminary activation.
 * Returns [] for unknown Luminaries or null state — never throws.
 * Procedures are UI-only: they describe the visual sequence without changing mechanics.
 *
 * eventPayload: optional extra data from the PendingLuminaryActivationEvent (e.g.
 * targetCardIds captured server-side before state mutations cleared them).
 */
export function resolveLuminaryProcedure(
  luminaryId: string,
  effectType: EffectType,
  state: GameState | null | undefined,
  ownerId: string,
  eventPayload?: { targetCardIds?: string[] },
): AnimationTimelineStep[] {
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
      case 'lum_ember':   return resolveEmber(state, effectType, eventPayload?.targetCardIds);
      case 'lum_hunger':  return resolveHunger(state, ownerId);
      case 'lum_null':    return resolveNull(state);
      default:            return [];
    }
  } catch {
    return [];
  }
}
