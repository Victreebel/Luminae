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
 *  affinities        — stable Affinity keys eligible for this Luminary
 *  primaryColor      — mirrors LUMINARY_VISUALS[id].summonColor (API contract; update both if changed)
 *  secondaryColor    — mirrors LUMINARY_VISUALS[id].summonSecondaryColor (API contract; update both if changed)
 *  animationArchetype — high-level animation identity category
 *  effectName        — in-game effect name, matches engine's effectName field
 *  procedureSteps    — typed canonical step template for the primary activation path;
 *                      targetIds/playerIds are empty — resolvers fill them from live GameState
 *  residueType       — persistent keyword marker placed on cards after the cinematic, if any
 *  flavorLine        — one or two atmospheric sentences
 *
 * Mechanics, costs, Eminence rules, and Artifact data are unchanged; this is UI-only metadata.
 */

import type { AnimationTimelineStep, KeywordMarker } from '@/lib/animationProcedure';

// ─── Archetype union ─────────────────────────────────────────────────────────

export type AnimationArchetype =
  | 'burn'             // one-shot or selective Burn of target Artifacts + Forge refresh
  | 'revealUntil'      // sequential reveal-until: one card at a time, resolve immediately
  | 'recurrence'       // Burned Artifacts return to their tier Archives
  | 'scry'             // deck scry + Forge reorder shimmer
  | 'passiveBoon'      // persistent passive bonus on owner (no card residue)
  | 'globalDisruption' // board-wide victory requirement or state pressure
  | 'thresholdPayoff'  // conditional owner eminenceChange when threshold or count met
  | 'forgeReset'       // all Forge Artifacts return, Archives randomize, rows redeal
  | 'suppression'      // Forgotten or Nullified residue on Forge Artifacts
  | 'seeded'           // Seeded residue deferred to deck; badge on Forge entry
  | 'replication'      // Artifact copy boon (no direct Eminence delta)
  | 'affinityReturn'    // compatibility step for returning Affinities above the limit
  | 'condemned'        // two-path: arrival → Condemned residue; end_of_turn → Burn
  | 'assimilate';      // pendingAction replaces core action for one turn

// ─── Config type ─────────────────────────────────────────────────────────────

export interface LuminaryAnimationConfig {
  luminaryId: string;
  displayName: string;
  /** Matches the `domain` field in the engine's LUMINARIES array. */
  domain: string;
  /** Stable Affinity keys eligible for this Luminary (for example, `flare` or `continuum`). */
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
    affinities: ['flare'],
    primaryColor: '#ef4444',
    secondaryColor: '#7f1d1d',
    animationArchetype: 'burn',
    effectName: 'Rupture of the Still',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_moth' },
      { type: 'targetClaim', targetIds: [], keyword: 'burn' },
      { type: 'keywordEvents', events: [{ keyword: 'burn', targetIds: [] }] },
      { type: 'forgeRefill', slotIds: [] },
    ],
    flavorLine: 'A red wing-shadow sweeps across Tier III before the rupture fires — Artifacts costing 4 or less Flare split along a fracture line, then their slots redraw.',
  },

  // 2. Tide Architect — The Observer Effect
  lum_tide: {
    luminaryId: 'lum_tide',
    displayName: 'Tide Architect',
    domain: 'Tides',
    affinities: ['continuum'],
    primaryColor: '#60a5fa',
    secondaryColor: '#e2e8f0',
    animationArchetype: 'scry',
    effectName: 'The Observer Effect',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_tide' },
      { type: 'deckScry', tierIds: ['tier2', 'tier3'], affinityBias: 'continuum' },
      { type: 'forgeRefill', slotIds: [] },
    ],
    flavorLine: 'Continuum-affinity Artifacts surface through pale blue-white shimmer as the tide looks ahead; The Forge reorders with quiet inevitability, unhurried.',
  },

  // 3. Verdant Oracle — Early Bloom
  lum_verdant: {
    luminaryId: 'lum_verdant',
    displayName: 'Verdant Oracle',
    domain: 'Verdance',
    affinities: ['verdance'],
    primaryColor: '#4ade80',
    secondaryColor: '#166534',
    animationArchetype: 'passiveBoon',
    effectName: 'Early Bloom',
    // luminaryPulse only — TargetBadge fallback shows "BOON · AFFINITIES · LINGERING"
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_verdant' },
    ],
    flavorLine: 'A living root-pulse extends quietly around forge affordances — patient and never explosive; the affinity bonus takes hold the following turn.',
  },

  // 4. Void Warden — Oblivion
  lum_void: {
    luminaryId: 'lum_void',
    displayName: 'Void Warden',
    domain: 'Void',
    affinities: ['abyss'],
    primaryColor: '#4c1d95',
    secondaryColor: '#0a0a14',
    animationArchetype: 'globalDisruption',
    effectName: 'Oblivion',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_void' },
      { type: 'targetClaim', targetIds: [] },
      { type: 'victoryRequirementChange', amount: 5 },
    ],
    flavorLine: 'A silent dark ripple spreads board-wide — the warden watches from a distance, and the victory line recedes into the emptiness between stars.',
  },

  // 5. Concordance Mandala — Perfect Coherence
  lum_radiant: {
    luminaryId: 'lum_radiant',
    displayName: 'Concordance Mandala',
    domain: 'Coherence',
    affinities: ['radiance'],
    primaryColor: '#fef9c3',
    secondaryColor: '#2ecc71',
    animationArchetype: 'thresholdPayoff',
    effectName: 'Perfect Coherence',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_radiant' },
      { type: 'targetClaim', targetIds: [] },
      { type: 'eminenceChange', playerIds: [], amount: 2 },
    ],
    flavorLine: 'Radiance artifacts briefly align into geometric mandala light before the coherence payoff resolves — the once-used marker appears small and elegant at the center.',
  },

  // 6. Phoenix Paradox — Eternal Recurrence
  lum_astral: {
    luminaryId: 'lum_astral',
    displayName: 'Phoenix Paradox',
    domain: 'Recurrence',
    affinities: ['flare', 'continuum'],
    primaryColor: '#f43f5e',
    secondaryColor: '#3d6bff',
    animationArchetype: 'recurrence',
    effectName: 'Eternal Recurrence',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_astral' },
      { type: 'archiveReturn', cardIds: [] },
      { type: 'forgeRefill', slotIds: [] },
    ],
    flavorLine: 'Flare consumes without erasing; Continuum bends the ashes backward. Burned Artifacts rise from the pile and stream into their corresponding Archive spires before the restored Forge positions awaken.',
  },

  // 7. Catalyst Bloom — Aftergrowth
  lum_bloom: {
    luminaryId: 'lum_bloom',
    displayName: 'Catalyst Bloom',
    domain: 'Aftergrowth',
    affinities: ['flare', 'verdance'],
    primaryColor: '#86efac',
    secondaryColor: '#7f1d1d',
    animationArchetype: 'thresholdPayoff',
    effectName: 'Aftergrowth',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_bloom' },
      { type: 'targetClaim', targetIds: [] },
      // amount is dynamic (the engine's Burn accumulator at payout time); the step is omitted
      // entirely when burnCount === 0 (see resolveBloom in luminaryAnimationProcedures.ts)
      // to avoid showing "+0 EMN" when no Burns were tracked.
      { type: 'eminenceChange', playerIds: [], amount: 0 },
    ],
    flavorLine: 'Prior burn cinders transform into green growth sparks — the owner gains Eminence from the tracked Burns without replaying them individually.',
  },

  // 8. Iron Harbinger — Impact Extinction
  lum_forge: {
    luminaryId: 'lum_forge',
    displayName: 'Iron Harbinger',
    domain: 'Ruin',
    affinities: ['flare', 'abyss'],
    primaryColor: '#f97316',
    secondaryColor: '#1c1917',
    animationArchetype: 'forgeReset',
    effectName: 'Impact Extinction',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_forge' },
      { type: 'targetClaim', targetIds: [] },
      { type: 'archiveReturn', cardIds: [] },
      { type: 'deckScry', tierIds: ['tier1', 'tier2', 'tier3'] },
      { type: 'forgeRefill', slotIds: [] },
    ],
    flavorLine: 'A central impact lifts the entire Forge from its molds. Every Artifact returns to its corresponding Archive, the spires randomize, and a new array manifests.',
  },

  // 9. ??? — The Forgotten Hour
  lum_compass: {
    luminaryId: 'lum_compass',
    displayName: '???',
    domain: 'Erasure',
    affinities: ['continuum', 'abyss'],
    primaryColor: '#2563eb',
    secondaryColor: '#0a0a14',
    animationArchetype: 'suppression',
    effectName: 'The Forgotten Hour',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_compass' },
      { type: 'deckScry', tierIds: ['tier1', 'tier2', 'tier3'] },
      { type: 'targetClaim', targetIds: [] },
      { type: 'residue', keyword: 'forgotten', targetIds: [], victoryRequirementChange: 1 },
    ],
    residueType: 'forgotten',
    flavorLine: 'The broken hour-ring descends with the Forgotten brand — the victory requirement rises by 1 as every face-up Artifact loses its Eminence.',
  },

  // 10. Seed Beyond Seasons — Avatar Seeds
  lum_seed: {
    luminaryId: 'lum_seed',
    displayName: 'Seed Beyond Seasons',
    domain: 'Propagation',
    affinities: ['continuum', 'verdance'],
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
    flavorLine: 'Blue-green seed glyphs settle into every Archive; when a seeded Artifact manifests in The Forge, the marker quietly wakes.',
  },

  // 11. Glass Orchard — Perfect Replication
  lum_orchard: {
    luminaryId: 'lum_orchard',
    displayName: 'Glass Orchard',
    domain: 'Replication',
    affinities: ['verdance', 'radiance'],
    primaryColor: '#4ade80',
    secondaryColor: '#fef9c3',
    animationArchetype: 'replication',
    effectName: 'Perfect Replication',
    // No eminenceChange — +0 EMN was misleading; CLAIM + boon ConsequenceSnap communicates the copy
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
    affinities: ['abyss', 'radiance'],
    primaryColor: '#cbd5e1',
    secondaryColor: '#0a0a14',
    animationArchetype: 'affinityReturn',
    effectName: 'Balance Due',
    procedureSteps: [
      { type: 'luminaryPulse', luminaryId: 'lum_pale' },
      { type: 'targetClaim', targetIds: [] },
      { type: 'affinityReturn', playerIds: [] },
    ],
    flavorLine: 'Pale scales briefly appear over overloaded Affinity channels; excess Affinity visibly returns to the Well — the debt is settled cleanly, without negotiation.',
  },

  // 13. Ember Sovereign — Cinder Mandate
  // Primary path (arrival): marks non-immune cards as Condemned.
  // Secondary path (end_of_turn): Condemned cards burn — handled by the resolver.
  lum_ember: {
    luminaryId: 'lum_ember',
    displayName: 'Ember Sovereign',
    domain: 'Flame',
    affinities: ['flare', 'abyss', 'radiance'],
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
    flavorLine: 'An ember mandate brands each Artifact whose forge cost lacks 3 or more Flare, Abyss, or Radiance — the Condemned mark pulses with deferred menace; at the end of the appointed turn, the sentence executes without appeal.',
  },

  // 14. Final Hunger — Assimilation
  lum_hunger: {
    luminaryId: 'lum_hunger',
    displayName: 'Final Hunger',
    domain: 'Assimilation',
    affinities: ['flare', 'verdance', 'radiance'],
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
    affinities: ['continuum', 'abyss', 'radiance'],
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
    flavorLine: 'Cold black-white domain seals descend onto Tier III Artifacts — Eminence icons feel silenced, not destroyed; the authority is absolute and arrives without ceremony.',
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
