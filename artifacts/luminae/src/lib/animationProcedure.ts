// Animation procedure type system — shared across Luminary visual procedures.
// Each Luminary activation can be described as an ordered sequence of these steps,
// letting the animation driver play keyword events (burn, forgotten, etc.) using
// the canonical shared animation for that keyword instead of bespoke per-Luminary code.

export type KeywordAnimationEvent =
  | 'burn'
  | 'forgotten'
  | 'nullified'
  | 'condemned'
  | 'seeded';

/** Persistent keyword states that sit on a card (as opposed to one-shot events like burn). */
export type KeywordMarker = Exclude<KeywordAnimationEvent, 'burn'>;

export type AnimationProcedureStep =
  | { type: 'luminaryPulse'; luminaryId: string }
  | { type: 'targetClaim'; targetIds: string[] }
  | { type: 'keywordEvent'; keyword: KeywordAnimationEvent; targetIds: string[] }
  | { type: 'marketRedraw'; slotIds: string[] }
  | { type: 'residue'; keyword: KeywordAnimationEvent; targetIds: string[] };

export type AnimationProcedure = AnimationProcedureStep[];
