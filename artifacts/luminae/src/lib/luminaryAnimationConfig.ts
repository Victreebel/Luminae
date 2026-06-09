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
 *  primaryColor      — mirrors LUMINARY_VISUALS[id].summonColor (update both if changed)
 *  secondaryColor    — mirrors LUMINARY_VISUALS[id].summonSecondaryColor (update both if changed)
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
  | 'scry'             // deck scry + market reorder shimmer
  | 'passiveBoon'      // persistent passive bonus on owner (no card residue)
  | 'globalDisruption' // board-wide negative scoreChange affecting all players
  | 'thresholdPayoff'  // conditional owner scoreChange when threshold or count met
  | 'suppression'      // Forgotten or Nullified residue on market cards
  | 'seeded'           // Seeded residue deferred to deck; badge on market entry
  | 'replication'      // card copy boon (no direct score delta)
  | 'crystalReturn'    // crystalReturn from players above threshold
  | 'condemned'        // two-path: summon → Condemned residue; start_of_turn → Burn
  | 'assimilate';      // pendingAction replaces core action for one turn

// ─── Config type ─────────────────────────────────────────────────────────────

export interface LuminaryAnimationConfig {
  luminaryId: string;
  displayName: string;
  /** Matches the `domain` field in the engine's LUMINARIES array. */
  domain: string;
  /** CrystalColor keys for this Luminary's eligible affinities (e.g. 'ruby', 'sapphire'). */
  affinities: string[];
  /** Cinematic flash / glow primary color. Mirrors LUMINARY_VISUALS[id].summonColor. */
  primaryColor: string;
  /** Secondary flash / gradient color. Mirrors LUMINARY_VISUALS[id].summonSecondaryColor. */
  secondaryColor: string;
  animationArchetype: AnimationArchetype;
  /** In-game effect name; matches the engine's effectName field. */
  effectName: string;
  /**
   * Typed canonical step template for the primary activation path.
   * targetIds and playerIds are empty arrays — resolvers in luminaryAnimationProcedures.ts
   * fill them from live GameState at cinematic time.
   * For Luminaries with multiple paths (e.g. Ember Sovereign), this represents
   * the summon path; the resolver handles per-effectType variations.
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
    flavorLine: 'Affected cards split along a fracture line — before and after the rupture both briefly visible.',
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
      { type: 'deckScry', tierIds: ['tier2', 'tier3'] },
      { type: 'marketRedraw', slotIds: [] },
    ],
    flavorLine: 'Market reorders with quiet inevitability; the tide does not announce itself.',
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
    flavorLine: 'Roots quietly extend around purchase affordances; the bonus begins the following turn.',
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
    flavorLine: 'Eminence falls as if something vast and patient has noticed every counter at once.',
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
    flavorLine: 'Order finds its payoff — pattern resolves into coherence, and the owner gains the measure of it.',
  },

  // 6. Phoenix Paradox — Ash-Seeking Recurrence
  lum_astral: {
    luminaryId: 'lum_astral',
    displayName: 'Phoenix Paradox',
    domain: 'Recurrence',
    affinities: ['ruby', 'sapphire'],
    primaryColor: '#f43f5e',
    secondaryColor: '#3d6bff',
    animationArchetype: 'burn',
    effectName: 'Ash-Seeking Recurrence',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_astral' },
      { type: 'targetClaim', targetIds: [], keyword: 'burn' },
      { type: 'keywordEvents', events: [{ keyword: 'burn', targetIds: [] }] },
      { type: 'marketRedraw', slotIds: [] },
    ],
    flavorLine: 'Burned cards leave an afterimage; the surviving Flare or Continuum card locks into place last.',
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
      // amount is dynamic (burnPile.length at payout time); 0 is a template placeholder
      { type: 'scoreChange', playerIds: [], amount: 0 },
    ],
    flavorLine: 'Each prior burn pays out as growth; the bloom is proportional to the wreckage that preceded it.',
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
    flavorLine: 'The Tier III row falls silent under a single impact, then burns. No survivors.',
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
      { type: 'targetClaim', targetIds: [] },
      { type: 'residue', keyword: 'forgotten', targetIds: [] },
    ],
    residueType: 'forgotten',
    flavorLine: 'Eminence icons become hazy and unreadable — not destroyed, just misplaced in time.',
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
    flavorLine: "Tomorrow's cards are marked now; seeded badges appear when they surface into the market.",
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
    flavorLine: 'Glass fruit refracts the copied artifact; the copy enters the collection silently, without ceremony.',
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
    flavorLine: 'Scales appear over excess crystals, then the debt is paid back to the bank — cleanly, without negotiation.',
  },

  // 13. Ember Sovereign — Cinder Mandate
  // Primary path (summon): marks non-immune cards as Condemned.
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
    flavorLine: 'The mandate seal brands doomed cards at summon; on the appointed turn, the debt is collected without appeal.',
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
    flavorLine: 'Normal core actions recede — the hunger offers one replacement choice. Burn, take the Eminence, and the market refreshes.',
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
    flavorLine: 'Eminence icons fall silent — not burned, not forgotten, simply nullified under cold authority.',
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
