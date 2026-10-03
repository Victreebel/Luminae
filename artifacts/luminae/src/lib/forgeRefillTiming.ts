/** One timeline for the cosmic material, its audio, and gameplay locks. */
export const FORGE_REFILL_DURATION_MS = 1_500;
export const FORGE_REFILL_REDUCED_DURATION_MS = 420;
export const FORGE_REFILL_COMPLETION_BUFFER_MS = 120;
export const FORGE_REFILL_STAGGER_MS = 120;
// Match the original card-flip interaction lock, including its settling margin.
export const FORGE_REFILL_LOCK_MS = FORGE_REFILL_DURATION_MS + 200;

/** The face is present by 49%; at 55% the cosmic veil is beginning to clear.
 * Reduced motion uses an opacity fade from the start, so cue its first quarter.
 * Both the draw chime and Archive release use this beat, before interaction unlocks.
 */
export function getForgeRefillRevealMs(durationMs: number, reducedMotion = false): number {
  return Math.round(durationMs * (reducedMotion ? 0.25 : 0.55));
}
