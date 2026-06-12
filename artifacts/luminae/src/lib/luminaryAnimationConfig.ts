/**
 * Luminary Animation Config — canonical single-source animation identity.
 *
 * Stores static animation metadata for all 15 active Luminaries.
 * Used by animation procedures, burn pile UI, event log, and overlay consumers.
 * Animation procedures can reference this table for archetype, effectName, and step templates.
 *
 * Fields:
 *  luminaryId        — engine ID, matches LUMINARY_VISUALS and gameEngine.ts
 *  displayName       — human-readable Luminary name
 *  domain            — thematic domain, matches engine's LUMINARIES[].domain
 *  affinities        — CrystalColor keys for this Luminary's eligible affinities
 *  primaryColor      — mirrors LUMINARY_VISUALS[id].summonColor (API contract; update both if changed)
 *  secondaryColor    — mirrors LUMINARY_VISUALS[id].summonSecondaryColor (API contract; update both if changed)
 *  animationArchetype — high-level animation identity category
 *  effectName        — in-game effect name, matches engine's effectName field
 *  procedureSteps    — typed canonical step template for the primary activation path;
 *                      targetIds/playerIds are empty — resolvers fill them from live GameState
 *  residueType       — persistent keyword marker placed on cards after the cinematic, if any
 *  flavorLine        — one or two atmospheric sentences
 *
 * Mechanics, costs, scoring, card data: unchanged — this is UI-only metadata.
 */

import type { AnimationTimelineStep, KeywordMarker } from '@/lib/animationProcedure';

// ─── Archetype union ─────────────────────────────────────────────────────────

export type AnimationArchetype =
  | 'burn'             // one-shot or selective Burn of target cards + market refresh
  | 'revealUntil'      // sequential reveal-until: one card at a time, resolve immediately
  | 'scry'             // deck scry + market reorder shimmer
  | 'passiveBoon'      // persistent passive bonus on owner (no card residue)
  | 'globalDisruption' // board-wide negative scoreChange affecting all players
  | 'thresholdPayoff'  // conditional owner scoreChange when threshold or count met
  | 'suppression'      // Forgotten or Nullified residue on market cards
  | 'seeded'           // Seeded residue deferred to deck; badge on market entry
  | 'replication'      // card copy boon (no direct score delta)
  | 'crystalReturn'    // crystalReturn from players above threshold
  | 'condemned'        // two-path: arrival → Condemned residue; start_of_turn → Burn
  | 'assimilate';      // pendingAction replaces core action for one turn

// ─── Config type ─────────────────────────────────────────────────────────────

export interface LuminaryAnimationConfig {
  luminaryId: string;
  displayName: string;
  /** Matches the `domain` field in the engine's LUMINARIES array. */
  domain: string;
  /** CrystalColor keys for this Luminary's eligible affinities (e.g. 'ruby', 'sapphire'). */
  affinities: string[];
  /** Cinematic flash / glow primary color. Mirrors LUMINARY_VISUALS[id].summonColor (API contract). */
  primaryColor: string;
  /** Secondary flash / gradient color. Mirrors LUMINARY_VISUALS[id].summonSecondaryColor (API contract). */
  secondaryColor: string;
  animationArchetype: AnimationArchetype;
  /** In-game effect name; matches the engine's effectName field. */
  effectName: string;
  /**
   * Typed canonical step template for the primary activation path.
   * targetIds and playerIds are empty arrays — resolvers in luminaryAnimationProcedures.ts
   * fill them from live GameState at cinematic time.
   * For Luminaries with multiple paths (e.g. Ember Sovereign), this represents
   * the arrival path; the resolver handles per-effectType variations.
   */
  procedureSteps: AnimationTimelineStep[];
  /** Persistent keyword marker placed on cards after the cinematic, if any. */
  residueType?: KeywordMarker;
  /** Atmospheric flavor note (one or two sentences). */
  flavorLine: string;
}

// ─── Config table ─────────────────────────────────────────────────────────────

export const LUMINARY_ANIMATION_CONFIG: Record<string, LuminaryAnimationConfig> = {

  // 1. Red Moth — Rupture of the Still
  lum_moth: {
    luminaryId: 'lum_moth',
    displayName: 'Red Moth',
    domain: 'Rupture',
    affinities: ['ruby'],
    primaryColor: '#ef4444',
    secondaryColor: '#7f1d1d',
    animationArchetype: 'burn',
    effectName: 'Rupture of the Still',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_moth' },
      { type: 'targetClaim', targetIds: [], keyword: 'burn' },
      { type: 'keywordEvents', events: [{ keyword: 'burn', targetIds: [] }] },
      { type: 'marketRedraw', slotIds: [] },
    ],
    flavorLine: 'A red wing-shadow sweeps across Tier II and III before the rupture fires — targeted cards split along a fracture line, before and after the burn both briefly visible.',
  },

  // 2. Tide Architect — The Observer Effect
  lum_tide: {
    luminaryId: 'lum_tide',
    displayName: 'Tide Architect',
    domain: 'Tides',
    affinities: ['sapphire'],
    primaryColor: '#60a5fa',
    secondaryColor: '#e2e8f0',
    animationArchetype: 'scry',
    effectName: 'The Observer Effect',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_tide' },
      { type: 'deckScry', tierIds: ['tier2', 'tier3'], affinityBias: 'sapphire' },
      { type: 'marketRedraw', slotIds: [] },
    ],
    flavorLine: 'Continuum-affinity cards surface through pale blue-white shimmer as the tide looks ahead; the market reorders with quiet inevitability, unhurried.',
  },

  // 3. Verdant Oracle — Early Bloom
  lum_verdant: {
    luminaryId: 'lum_verdant',
    displayName: 'Verdant Oracle',
    domain: 'Verdance',
    affinities: ['emerald'],
    primaryColor: '#4ade80',
    secondaryColor: '#166534',
    animationArchetype: 'passiveBoon',
    effectName: 'Early Bloom',
    // luminaryPulse only — TargetBadge fallback shows "BOON · AFFINITIES · LINGERING"
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_verdant' },
    ],
    flavorLine: 'A living root-pulse extends quietly around purchase affordances — patient and never explosive; the affinity bonus takes hold the following turn.',
  },

  // 4. Void Warden — Oblivion
  lum_void: {
    luminaryId: 'lum_void',
    displayName: 'Void Warden',
    domain: 'Void',
    affinities: ['onyx'],
    primaryColor: '#4c1d95',
    secondaryColor: '#0a0a14',
    animationArchetype: 'globalDisruption',
    effectName: 'Oblivion',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_void' },
      { type: 'targetClaim', targetIds: [] },
      { type: 'scoreChange', playerIds: [], amount: -4 },
    ],
    flavorLine: 'A silent dark ripple spreads board-wide — the warden watches from a distance, and Eminence counters begin falling as if swallowed by the emptiness between stars.',
  },

  // 5. Concordance Mandala — Perfect Coherence
  lum_radiant: {
    luminaryId: 'lum_radiant',
    displayName: 'Concordance Mandala',
    domain: 'Coherence',
    affinities: ['pearl'],
    primaryColor: '#fef9c3',
    secondaryColor: '#2ecc71',
    animationArchetype: 'thresholdPayoff',
    effectName: 'Perfect Coherence',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_radiant' },
      { type: 'targetClaim', targetIds: [] },
      { type: 'scoreChange', playerIds: [], amount: 2 },
    ],
    flavorLine: 'Radiance artifacts briefly align into geometric mandala light before the coherence payoff resolves — the once-used marker appears small and elegant at the center.',
  },

  // 6. Phoenix Paradox — Ash-Seeking Recurrence
  lum_astral: {
    luminaryId: 'lum_astral',
    displayName: 'Phoenix Paradox',
    domain: 'Recurrence',
    affinities: ['ruby', 'sapphire'],
    primaryColor: '#f43f5e',
    secondaryColor: '#3d6bff',
    animationArchetype: 'revealUntil',
    effectName: 'Ash-Seeking Recurrence',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_astral' },
      // Sequential reveal-until: each non-matching card is revealed and burned
      // immediately, one by one, until a Flare/Continuum card is found.
      // The resolver emits [reveal, burn, reveal, burn, ...] pairs from live state.
      { type: 'reveal', cardIds: [], tier: 3, stopCondition: 'Flare or Continuum' },
      { type: 'keywordEvent', keyword: 'burn', targetIds: [] },
      { type: 'reveal', cardIds: [], tier: 2, stopCondition: 'Flare or Continuum' },
      { type: 'keywordEvent', keyword: 'burn', targetIds: [] },
      // Final survivor pulse: the matching card locks into place
      { type: 'targetClaim', targetIds: [] },
      { type: 'marketRedraw', slotIds: [] },
    ],
    flavorLine: 'Cards are revealed one by one from Tier III then Tier II. Each non-Flare/Continuum card burns immediately and the next is revealed. When a matching card appears, it pulses red-blue and locks into place — the suspense is in the one-by-one check, not the batch.',
  },

  // 7. Catalyst Bloom — Aftergrowth
  lum_bloom: {
    luminaryId: 'lum_bloom',
    displayName: 'Catalyst Bloom',
    domain: 'Aftergrowth',
    affinities: ['ruby', 'emerald'],
    primaryColor: '#86efac',
    secondaryColor: '#7f1d1d',
    animationArchetype: 'thresholdPayoff',
    effectName: 'Aftergrowth',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_bloom' },
      { type: 'targetClaim', targetIds: [] },
      // amount is dynamic (burnPile.length at payout time); scoreChange is omitted
      // entirely when burnCount === 0 (see resolveBloom in luminaryAnimationProcedures.ts)
      // to avoid showing "+0 EMN" when the Burn Pile is empty.
      { type: 'scoreChange', playerIds: [], amount: 0 },
    ],
    flavorLine: 'Prior burn cinders transform into green growth sparks — the owner gains Eminence proportional to the accumulated burn pile without replaying individual burns.',
  },

  // 8. Iron Harbinger — Impact Extinction
  lum_forge: {
    luminaryId: 'lum_forge',
    displayName: 'Iron Harbinger',
    domain: 'Ruin',
    affinities: ['ruby', 'onyx'],
    primaryColor: '#f97316',
    secondaryColor: '#1c1917',
    animationArchetype: 'burn',
    effectName: 'Impact Extinction',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_forge' },
      { type: 'targetClaim', targetIds: [], keyword: 'burn' },
      { type: 'keywordEvents', events: [{ keyword: 'burn', targetIds: [] }] },
      { type: 'marketRedraw', slotIds: [] },
    ],
    flavorLine: 'A hammer-shadow descends across the Tier III row before the Burn fires — every card falls in the same moment; the mass extinction is fast and unambiguous.',
  },

  // 9. The Hourless Compass — The Forgotten Hour
  lum_compass: {
    luminaryId: 'lum_compass',
    displayName: 'The Hourless Compass',
    domain: 'Erasure',
    affinities: ['sapphire', 'onyx'],
    primaryColor: '#38bdf8',
    secondaryColor: '#0a0a14',
    animationArchetype: 'suppression',
    effectName: 'The Forgotten Hour',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_compass' },
      { type: 'deckScry', tierIds: ['tier1', 'tier2', 'tier3'] },
      { type: 'targetClaim', targetIds: [] },
      { type: 'residue', keyword: 'forgotten', targetIds: [] },
    ],
    residueType: 'forgotten',
    flavorLine: 'A compass-needle sweep scans all tiers before the broken hour-ring descends — Eminence icons on every market card fade into blue-black haze, not destroyed, just lost in time.',
  },

  // 10. Seed Beyond Seasons — Avatar Seeds
  lum_seed: {
    luminaryId: 'lum_seed',
    displayName: 'Seed Beyond Seasons',
    domain: 'Propagation',
    affinities: ['sapphire', 'emerald'],
    primaryColor: '#38bdf8',
    secondaryColor: '#4ade80',
    animationArchetype: 'seeded',
    effectName: 'Avatar Seeds',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_seed' },
      { type: 'deckScry', tierIds: ['tier1', 'tier2', 'tier3'], affinityBias: 'seeded' },
      { type: 'residue', keyword: 'seeded', targetIds: [] },
    ],
    residueType: 'seeded',
    flavorLine: 'Blue-green seed glyphs plant silently onto deck tops across all tiers; when a seeded card surfaces into the market, the seed marker quietly wakes.',
  },

  // 11. Glass Orchard — Perfect Replication
  lum_orchard: {
    luminaryId: 'lum_orchard',
    displayName: 'Glass Orchard',
    domain: 'Replication',
    affinities: ['emerald', 'pearl'],
    primaryColor: '#4ade80',
    secondaryColor: '#fef9c3',
    animationArchetype: 'replication',
    effectName: 'Perfect Replication',
    // No scoreChange — +0 EMN was misleading; CLAIM + boon ConsequenceSnap communicates the copy
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_orchard' },
      { type: 'targetClaim', targetIds: [] },
    ],
    flavorLine: 'A glass-fruit refraction shimmer pulses over the copied Artifact before the copy enters the collection — the movement is clear and unhurried.',
  },

  // 12. Pale Merchant — Balance Due
  lum_pale: {
    luminaryId: 'lum_pale',
    displayName: 'Pale Merchant',
    domain: 'Balance',
    affinities: ['onyx', 'pearl'],
    primaryColor: '#cbd5e1',
    secondaryColor: '#0a0a14',
    animationArchetype: 'crystalReturn',
    effectName: 'Balance Due',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_pale' },
      { type: 'targetClaim', targetIds: [] },
      { type: 'crystalReturn', playerIds: [] },
    ],
    flavorLine: 'Pale scales briefly appear over overloaded crystal pools; excess crystals visibly return to the bank — the debt is settled cleanly, without negotiation.',
  },

  // 13. Ember Sovereign — Cinder Mandate
  // Primary path (arrival): marks non-immune cards as Condemned.
  // Secondary path (start_of_turn): Condemned cards burn — handled by the resolver.
  lum_ember: {
    luminaryId: 'lum_ember',
    displayName: 'Ember Sovereign',
    domain: 'Flame',
    affinities: ['ruby', 'onyx', 'pearl'],
    primaryColor: '#ff5a3c',
    secondaryColor: '#7b1fa2',
    animationArchetype: 'condemned',
    effectName: 'Cinder Mandate',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_ember' },
      { type: 'targetClaim', targetIds: [], keyword: 'condemned' },
      { type: 'residue', keyword: 'condemned', targetIds: [] },
    ],
    residueType: 'condemned',
    flavorLine: 'An ember mandate brands each Artifact whose forge cost lacks 3 or more Flare, Abyss, or Radiance — the Condemned mark pulses with deferred menace; at the start of the appointed turn, the sentence executes without appeal.',
  },

  // 14. First Hunger — Assimilation
  lum_hunger: {
    luminaryId: 'lum_hunger',
    displayName: 'First Hunger',
    domain: 'Assimilation',
    affinities: ['ruby', 'emerald', 'pearl'],
    primaryColor: '#fbbf24',
    secondaryColor: '#4ade80',
    animationArchetype: 'assimilate',
    effectName: 'Assimilation',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_hunger' },
      { type: 'targetClaim', targetIds: [] },
      { type: 'pendingAction', action: 'assimilate', ownerId: '' },
    ],
    flavorLine: 'The assimilate replacement feels predatory, not opportunistic — on use, the selected Artifact burns with hunger-colored accent fragments under the canonical Burn animation; the core action is consumed, not supplemented.',
  },

  // 15. Null Sovereign — Black Domain
  lum_null: {
    luminaryId: 'lum_null',
    displayName: 'Null Sovereign',
    domain: 'Transcendence',
    affinities: ['sapphire', 'onyx', 'pearl'],
    primaryColor: '#ffffff',
    secondaryColor: '#0a0a14',
    animationArchetype: 'suppression',
    effectName: 'Black Domain',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_null' },
      { type: 'targetClaim', targetIds: [] },
      { type: 'residue', keyword: 'nullified', targetIds: [] },
    ],
    residueType: 'nullified',
    flavorLine: 'Cold black-white domain seals descend onto Tier III cards — Eminence icons feel silenced, not destroyed; the authority is absolute and arrives without ceremony.',
  },

};

// ─── Lookup helper ────────────────────────────────────────────────────────────

/**
 * Returns the animation config for a Luminary ID, or null if not registered.
 * Unknown / inactive Luminaries (e.g. lum_scholar) intentionally return null.
 */
export function getLuminaryAnimationConfig(
  luminaryId: string,
): LuminaryAnimationConfig | null {
  return LUMINARY_ANIMATION_CONFIG[luminaryId] ?? null;
}
