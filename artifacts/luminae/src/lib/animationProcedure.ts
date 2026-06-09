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

/** Alias for use in the AnimationTimeline spec — identical to KeywordAnimationEvent. */
export type KeywordEventType = KeywordAnimationEvent;

/** Persistent keyword states that sit on a card (as opposed to one-shot events like burn). */
export type KeywordMarker = Exclude<KeywordAnimationEvent, 'burn'>;

/**
 * A single keyword event targeting one or more cards or entities.
 * Used inside `keywordEvents` batch steps so that multiple simultaneous burns,
 * condemns, etc. animate together (with stagger) before the driver advances.
 */
export type KeywordEvent = {
  keyword: KeywordEventType;
  targetIds: string[];
};

export type AnimationProcedureStep =
  | { type: 'luminaryPulse'; luminaryId: string }
  | {
      type: 'targetClaim';
      targetIds: string[];
      /**
       * Optional hint to the animation driver — tells it which keyword is about
       * to resolve so the claim highlight can pre-tint in the correct color
       * (e.g. red for burn, amber for condemned) before the keyword step fires.
       */
      keyword?: KeywordEventType;
    }
  | { type: 'keywordEvent'; keyword: KeywordAnimationEvent; targetIds: string[] }
  | {
      /**
       * Batch variant — preferred for new resolvers.
       * All events in the batch animate with a small stagger before the driver
       * advances to the next step, keeping multi-card burns legible without overlap.
       * Use multiple `keywordEvents` steps in sequence for distinct temporal moments
       * (e.g. Ember's condemned-flare then burn as two separate steps).
       */
      type: 'keywordEvents';
      events: KeywordEvent[];
    }
  | { type: 'marketRedraw'; slotIds: string[] }
  | { type: 'residue'; keyword: KeywordMarker; targetIds: string[] }
  | { type: 'scoreChange'; playerIds: string[]; amount: number }
  | { type: 'crystalReturn'; playerIds: string[]; crystalType?: string }
  | { type: 'deckScry'; tierIds: string[]; affinityBias?: string }
  | { type: 'pendingAction'; action: 'assimilate'; ownerId: string };

export type AnimationProcedure = AnimationProcedureStep[];

/**
 * Canonical alias for the animation timeline coordinator spec.
 * `AnimationTimelineStep` and `AnimationProcedureStep` are the same type;
 * prefer `AnimationTimelineStep` in new code.
 *
 * Timing contract enforced by callers:
 *   1. luminaryPulse   — always first
 *   2. targetClaim     — before any keyword resolution
 *   3. keywordEvents   — after targetClaim; staggered within the batch
 *   4. marketRedraw    — only after all keyword events are legible
 *   5. scoreChange / crystalReturn — after their causal keyword event
 */
export type AnimationTimelineStep = AnimationProcedureStep;
export type AnimationTimeline = AnimationTimelineStep[];
