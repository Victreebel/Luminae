/**
 * Luminary Animation Config
 *
 * Single-source animation identity for all 15 active Luminaries.
 * Every entry uses only shared animation primitives — no bespoke systems.
 *
 * Fields:
 *  luminaryId          — engine ID, matches LUMINARY_VISUALS and gameEngine.ts
 *  displayName         — human-readable Luminary name
 *  primaryColor        — mirrors LUMINARY_VISUALS[id].summonColor (update both if changed)
 *  secondaryColor      — mirrors LUMINARY_VISUALS[id].summonSecondaryColor (update both if changed)
 *  animationArchetype  — high-level animation identity category
 *  procedureTemplate   — ordered primitive step sequence (template; actual steps require GameState)
 *  procedureTemplatePaths — per-effectType overrides when a Luminary has multiple activation paths
 *  residueType         — persistent keyword marker applied to cards/players after the cinematic, or null
 *  sourceMotion        — entity pulse / source animation feel description
 *  targetMotion        — targetClaim highlight feel description
 *  flavorFlourish      — atmospheric note, one or two sentences
 *
 * Mechanics, costs, scoring, card data: unchanged — this is UI-only metadata.
 */

import type { KeywordMarker } from '@/lib/animationProcedure';

// ─── Primitive step labels ────────────────────────────────────────────────────
// Each label maps to one shared animation primitive.

export type ProcedureStepLabel =
  | 'luminaryPulse'
  | 'targetClaim'
  | 'keywordEvent:burn'
  | 'residue:forgotten'
  | 'residue:nullified'
  | 'residue:condemned'
  | 'residue:seeded'
  | 'scoreChange'
  | 'scoreChange:all'
  | 'crystalReturn'
  | 'deckScry'
  | 'marketRedraw'
  | 'pendingAction:assimilate';

// ─── Archetypes ───────────────────────────────────────────────────────────────

export type AnimationArchetype =
  | 'burn_rupture'         // one-shot Burn of target cards + market refresh
  | 'scry_reorder'         // deck scry + market reorder shimmer
  | 'living_boon'          // persistent passive bonus on owner (no card residue)
  | 'global_disruption'    // board-wide negative scoreChange affecting all players
  | 'threshold_payoff'     // conditional owner scoreChange when threshold met
  | 'recursive_burn'       // selective Burn of non-matching affinities + reveal loop
  | 'ash_growth_payoff'    // owner scoreChange proportional to prior burn count
  | 'mass_burn'            // bulk Burn of entire tier + market refresh
  | 'forgotten_suppression'// Forgotten residue on all market cards
  | 'future_claim'         // Seeded residue deferred to deck; badge on market entry
  | 'replication_payoff'   // card copy (no direct score delta; boon ConsequenceSnap)
  | 'crystal_balance'      // crystalReturn from all players above threshold
  | 'condemned_burn'       // two-path: summon → Condemned residue; start_of_turn → Burn
  | 'assimilate_replace'   // pendingAction replaces core action for one turn
  | 'nullified_suppression';// Nullified residue on tier cards (colder, more final than Forgotten)

// ─── Config type ──────────────────────────────────────────────────────────────

export interface LuminaryAnimationConfig {
  luminaryId: string;
  displayName: string;
  /**
   * Cinematic flash / glow primary color.
   * Mirrors LUMINARY_VISUALS[id].summonColor — keep in sync.
   */
  primaryColor: string;
  /**
   * Secondary flash / gradient color.
   * Mirrors LUMINARY_VISUALS[id].summonSecondaryColor — keep in sync.
   */
  secondaryColor: string;
  animationArchetype: AnimationArchetype;
  /**
   * Default primitive step sequence (template — actual steps require GameState).
   * For Luminaries with multiple activation paths, see procedureTemplatePaths.
   */
  procedureTemplate: ProcedureStepLabel[];
  /**
   * Per-effectType step sequences for Luminaries with multiple activation paths.
   * When present, the matching key overrides procedureTemplate for that effectType.
   */
  procedureTemplatePaths?: Partial<Record<'summon' | 'end_of_turn' | 'start_of_turn', ProcedureStepLabel[]>>;
  /** Persistent keyword marker placed on cards/players after cinematic, or null. */
  residueType: KeywordMarker | null;
  /** Entity pulse and source animation feel. */
  sourceMotion: string;
  /** targetClaim highlight feel. */
  targetMotion: string;
  /** Atmospheric flavor note (one or two sentences). */
  flavorFlourish: string;
}

// ─── Config table ─────────────────────────────────────────────────────────────

export const LUMINARY_ANIMATION_CONFIG: Record<string, LuminaryAnimationConfig> = {

  // 1. Red Moth — Rupture of the Still
  lum_moth: {
    luminaryId: 'lum_moth',
    displayName: 'Red Moth',
    primaryColor: '#ef4444',
    secondaryColor: '#7f1d1d',
    animationArchetype: 'burn_rupture',
    procedureTemplate: [
      'luminaryPulse',
      'targetClaim',
      'keywordEvent:burn',
      'marketRedraw',
    ],
    residueType: null,
    sourceMotion: 'Crimson wing-shadow sweeps inward; entity flares scarlet then contracts.',
    targetMotion: 'Tier II and III cards shiver in place before the shared Burn fires.',
    flavorFlourish: 'Affected cards split along a fracture line — before and after the rupture both briefly visible.',
  },

  // 2. Tide Architect — The Observer Effect
  lum_tide: {
    luminaryId: 'lum_tide',
    displayName: 'Tide Architect',
    primaryColor: '#60a5fa',
    secondaryColor: '#e2e8f0',
    animationArchetype: 'scry_reorder',
    procedureTemplate: [
      'luminaryPulse',
      'deckScry',
      'marketRedraw',
    ],
    residueType: null,
    sourceMotion: 'Blue entity rises with tidal weight — smooth, inescapable, without urgency.',
    targetMotion: 'Deck tops ripple with pale blue light; Continuum-aligned cards surface through the shimmer.',
    flavorFlourish: 'Market reorders with quiet inevitability; the tide does not announce itself.',
  },

  // 3. Verdant Oracle — Early Bloom
  lum_verdant: {
    luminaryId: 'lum_verdant',
    displayName: 'Verdant Oracle',
    primaryColor: '#4ade80',
    secondaryColor: '#166534',
    animationArchetype: 'living_boon',
    // luminaryPulse only — TargetBadge fallback shows "BOON · AFFINITIES · LINGERING"
    procedureTemplate: [
      'luminaryPulse',
    ],
    residueType: null,
    sourceMotion: 'Green pulse expands softly outward — patient, organic, unhurried.',
    targetMotion: "Owner's affinity row brightens with a root-green glow; living-aura toggle appears.",
    flavorFlourish: 'Roots quietly extend around purchase affordances; the bonus begins the following turn.',
  },

  // 4. Void Warden — Oblivion
  lum_void: {
    luminaryId: 'lum_void',
    displayName: 'Void Warden',
    primaryColor: '#4c1d95',
    secondaryColor: '#0a0a14',
    animationArchetype: 'global_disruption',
    procedureTemplate: [
      'luminaryPulse',
      'scoreChange:all',
    ],
    residueType: null,
    sourceMotion: 'Deep violet breach opens behind entity; gravity-pull dimming spreads across screen.',
    targetMotion: 'ALL PLAYERS Eminence counters dim simultaneously — including the summoner.',
    flavorFlourish: 'Eminence falls as if something vast and patient has noticed every counter at once.',
  },

  // 5. Concordance Mandala — Perfect Coherence
  lum_radiant: {
    luminaryId: 'lum_radiant',
    displayName: 'Concordance Mandala',
    primaryColor: '#fef9c3',
    secondaryColor: '#2ecc71',
    animationArchetype: 'threshold_payoff',
    procedureTemplate: [
      'luminaryPulse',
      'targetClaim',
      'scoreChange',
    ],
    residueType: null,
    sourceMotion: 'Pearl-white coherence bloom; geometric mandala crown briefly resolves in the glow.',
    targetMotion: 'Radiance (pearl-bonus) artifacts align into a brief geometric formation.',
    flavorFlourish: 'Order finds its payoff — pattern resolves into coherence, and the owner gains the measure of it.',
  },

  // 6. Phoenix Paradox — Ash-Seeking Recurrence
  lum_astral: {
    luminaryId: 'lum_astral',
    displayName: 'Phoenix Paradox',
    primaryColor: '#f43f5e',
    secondaryColor: '#3d6bff',
    animationArchetype: 'recursive_burn',
    procedureTemplate: [
      'luminaryPulse',
      'targetClaim',
      'keywordEvent:burn',
      'marketRedraw',
    ],
    residueType: null,
    sourceMotion: 'Fire-ice split — ruby energy on the left flank, sapphire on the right; entity stabilizes at center.',
    targetMotion: 'Non-Flare/Continuum cards leave a blue-red afterimage before the shared Burn fires.',
    flavorFlourish: 'Burned cards leave an afterimage; the surviving Flare or Continuum card locks into place last.',
  },

  // 7. Catalyst Bloom — Aftergrowth
  lum_bloom: {
    luminaryId: 'lum_bloom',
    displayName: 'Catalyst Bloom',
    primaryColor: '#86efac',
    secondaryColor: '#7f1d1d',
    animationArchetype: 'ash_growth_payoff',
    procedureTemplate: [
      'luminaryPulse',
      'scoreChange',
    ],
    residueType: null,
    sourceMotion: 'Growth surge — green pulse expands from center; velocity scales with the current burn count.',
    targetMotion: 'Ash particles (representing prior burns) convert to green sparks traveling toward owner.',
    flavorFlourish: 'Each prior burn pays out as growth; the bloom is proportional to the wreckage that preceded it.',
  },

  // 8. Iron Harbinger — Impact Extinction
  lum_forge: {
    luminaryId: 'lum_forge',
    displayName: 'Iron Harbinger',
    primaryColor: '#f97316',
    secondaryColor: '#1c1917',
    animationArchetype: 'mass_burn',
    procedureTemplate: [
      'luminaryPulse',
      'targetClaim',
      'keywordEvent:burn',
      'marketRedraw',
    ],
    residueType: null,
    sourceMotion: 'Heavy orange impact — hammer-weight drop; brief pressure-crush feel before Burn fires.',
    targetMotion: 'Entire Tier III row compresses briefly under hammer-shadow before the shared Burn fires.',
    flavorFlourish: 'The Tier III row falls silent under a single impact, then burns. No survivors.',
  },

  // 9. lum_compass — The Forgotten Hour
  lum_compass: {
    luminaryId: 'lum_compass',
    displayName: 'The Forgotten Hour',
    primaryColor: '#38bdf8',
    secondaryColor: '#0a0a14',
    animationArchetype: 'forgotten_suppression',
    procedureTemplate: [
      'luminaryPulse',
      'targetClaim',
      'residue:forgotten',
    ],
    residueType: 'forgotten',
    sourceMotion: 'Ice-blue entity trails a missing-hour haze; distorted screen-blend gives a time-slip feel.',
    targetMotion: 'All face-up market cards acquire edge-gradient unfocus as Forgotten residue settles.',
    flavorFlourish: 'Eminence icons become hazy and unreadable — not destroyed, just misplaced in time.',
  },

  // 10. Seed Beyond Seasons — Avatar Seeds
  lum_seed: {
    luminaryId: 'lum_seed',
    displayName: 'Seed Beyond Seasons',
    primaryColor: '#38bdf8',
    secondaryColor: '#4ade80',
    animationArchetype: 'future_claim',
    procedureTemplate: [
      'luminaryPulse',
      'deckScry',
      'residue:seeded',
    ],
    residueType: 'seeded',
    sourceMotion: 'Blue-green entity ripples outward; seed arcs travel toward deck zones.',
    targetMotion: 'Deck-top zones briefly illuminate with seed-glow before deferred Seeded residue settles.',
    flavorFlourish: "Tomorrow's cards are marked now; seeded badges appear when they surface into the market.",
  },

  // 11. Glass Orchard — Perfect Replication
  lum_orchard: {
    luminaryId: 'lum_orchard',
    displayName: 'Glass Orchard',
    primaryColor: '#4ade80',
    secondaryColor: '#fef9c3',
    animationArchetype: 'replication_payoff',
    // No scoreChange step — +0 EMN was misleading. CLAIM + boon ConsequenceSnap communicates the copy.
    procedureTemplate: [
      'luminaryPulse',
      'targetClaim',
    ],
    residueType: null,
    sourceMotion: 'Glass-green entity refracts the background light — cool, precise, visually doubling.',
    targetMotion: 'Cheapest Tier I card briefly shows a doubled ghost behind it before settling.',
    flavorFlourish: 'Glass fruit refracts the copied artifact; the copy enters the collection silently, without ceremony.',
  },

  // 12. Pale Merchant — Balance Due
  lum_pale: {
    luminaryId: 'lum_pale',
    displayName: 'Pale Merchant',
    primaryColor: '#cbd5e1',
    secondaryColor: '#0a0a14',
    animationArchetype: 'crystal_balance',
    procedureTemplate: [
      'luminaryPulse',
      'targetClaim',
      'crystalReturn',
    ],
    residueType: null,
    sourceMotion: 'Pale silver entity; balance-scale motif materializes and tips as crystal pools are assessed.',
    targetMotion: 'Overloaded player crystal pools highlighted before crystalReturn fires for each affected player.',
    flavorFlourish: 'Scales appear over excess crystals, then the debt is paid back to the bank — cleanly, without negotiation.',
  },

  // 13. Ember Sovereign — Cinder Mandate
  // Two-path: summon marks cards as Condemned; start_of_turn burns them.
  lum_ember: {
    luminaryId: 'lum_ember',
    displayName: 'Ember Sovereign',
    primaryColor: '#ff5a3c',
    secondaryColor: '#7b1fa2',
    animationArchetype: 'condemned_burn',
    procedureTemplate: [
      'luminaryPulse',
      'targetClaim',
      'residue:condemned',
    ],
    procedureTemplatePaths: {
      summon: [
        'luminaryPulse',
        'targetClaim',
        'residue:condemned',
      ],
      start_of_turn: [
        'luminaryPulse',
        'targetClaim',
        'keywordEvent:burn',
        'marketRedraw',
      ],
    },
    residueType: 'condemned',
    sourceMotion: 'Summon: violet-orange mandate seal fans outward. Start-of-turn: condemned flares bloom into burn.',
    targetMotion: 'Summon: non-immune cards branded with ember-spike pulse before residue settles. Start-of-turn: condemned cards recognized then consumed by shared Burn.',
    flavorFlourish: 'The mandate seal brands doomed cards at summon; on the appointed turn, the debt is collected without appeal.',
  },

  // 14. First Hunger — Assimilate
  lum_hunger: {
    luminaryId: 'lum_hunger',
    displayName: 'First Hunger',
    primaryColor: '#fbbf24',
    secondaryColor: '#4ade80',
    animationArchetype: 'assimilate_replace',
    procedureTemplate: [
      'luminaryPulse',
      'pendingAction:assimilate',
    ],
    residueType: null,
    sourceMotion: 'Amber-green entity surges forward; normal core-action buttons dim as ASSIMILATE appears.',
    targetMotion: 'ASSIMILATE pill materializes in the action slot as a replacement for Forge, Reserve, and Harness.',
    flavorFlourish: 'Normal core actions recede — the hunger offers one replacement choice. Burn, take the Eminence, and the market refreshes.',
  },

  // 15. Null Sovereign — Black Domain
  lum_null: {
    luminaryId: 'lum_null',
    displayName: 'Null Sovereign',
    primaryColor: '#ffffff',
    secondaryColor: '#0a0a14',
    animationArchetype: 'nullified_suppression',
    procedureTemplate: [
      'luminaryPulse',
      'targetClaim',
      'residue:nullified',
    ],
    residueType: 'nullified',
    sourceMotion: 'Cold white-black entity; crystalline silence radiates outward — no flourish, no warmth.',
    targetMotion: 'Tier III cards fall into full desaturation under a black-white domain seal.',
    flavorFlourish: 'Eminence icons fall silent — not burned, not forgotten, simply nullified under cold authority.',
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
