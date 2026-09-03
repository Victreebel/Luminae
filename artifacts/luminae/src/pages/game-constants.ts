import { AFFINITY_KEYS, type AffinityKey } from "@/lib/affinityMeta";
import cardTier1Bg from "@assets/generated_images/card_tier1.png";
import cardTier3Bg from "@assets/generated_images/card_tier3.png";
export { CARD_ART, CARD_RUNTIME_ART } from "@/lib/cardArtManifest";

export function hexRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

export const AFFINITIES: AffinityKey[] = [...AFFINITY_KEYS];

export const AFFINITY_LABEL_TO_KEY: Record<string, AffinityKey> = {
  Flare: "flare",
  Continuum: "continuum",
  Verdance: "verdance",
  Abyss: "abyss",
  Radiance: "radiance",
};

export const TIER_BACKDROPS: Record<number, string> = {
  1: cardTier1Bg,
  3: cardTier3Bg,
};

export const TIER_CIVILIZATION: Record<number, string> = {
  1: "Planetary",
  2: "Stellar",
  3: "Galactic",
};

export const AFFINITY_CARD_GRADIENTS: Record<string, string> = {
  flare:
    "linear-gradient(175deg, #1a0404 0%, #3d0808 35%, #220505 70%, #100202 100%)",
  continuum:
    "linear-gradient(175deg, #020510 0%, #071840 35%, #040a28 70%, #020510 100%)",
  verdance:
    "linear-gradient(175deg, #021005 0%, #063020 35%, #041a10 70%, #020c04 100%)",
  abyss:
    "linear-gradient(175deg, #060606 0%, #181818 35%, #0e0e0e 70%, #050505 100%)",
  radiance:
    "linear-gradient(175deg, #100c02 0%, #2a2008 35%, #1c1606 70%, #0c0a02 100%)",
  singularity:
    "linear-gradient(175deg, #08080f 0%, #141428 35%, #0e0e1e 70%, #08080f 100%)",
};

export const AFFINITY_KEY_TO_HEX: Record<string, string> = {
  flare: "#ff5a3c",
  continuum: "#60a5fa",
  verdance: "#2ecc71",
  abyss: "#0f172a",
  radiance: "#DFC878",
  singularity: "#E8E4FF",
};

export const opponentTurnVariants = {
  idle:   { scale: 1 },
  active: {
    scale: [1, 1.14, 1],
    transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] as const },
  },
};

export const localTurnVariants = {
  idle:   { scale: 1 },
  active: {
    scale: [1, 1.07, 1],
    transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] as const },
  },
};

/** Duration of the deal-from-deck (card fly + flip) animation in ms.
 *  Used by setAnimEndTime in both the initial guard and the deck-found branch
 *  so both call sites derive from the same source. */
export const DEAL_ANIM_MS = 1700;

/** Delay (ms) after a card begins its deal-from-deck flight before the
 *  Card draw.mp3 flip SFX fires. Times the sound to the visual edge-flip:
 *  the deal animation runs 1.5 s with rotateY hitting 90° at its midpoint
 *  (~750 ms), so a slight lead lands the flip sound on the card turning over. */
export const DEAL_FLIP_SOUND_MS = 600;

/** Brief animation lock fired on the initial turn announcement (ms). */
export const INITIAL_TURN_GUARD_MS = 1200;

/** Duration of the abridged forge shrink animation (ms).
 *  Abridged forge lock = ABRIDGED_SHRINK_MS + DEAL_ANIM_MS + ANIM_LOCK_BUFFER_MS. */
export const ABRIDGED_SHRINK_MS = 650;

/** Trailing buffer added after a deal animation in the abridged forge lock (ms). */
export const ANIM_LOCK_BUFFER_MS = 270;

/** Animation lock duration for simple abridged actions with no deal phase
 *  (reserved-card forge, deck reserve, local forge from hand) (ms). */
export const ABRIDGED_ACTION_MS = 780;

/** Full animation duration when forging a face-up Artifact.
 *  (stamp + fly + deal + settling buffer) (ms). */
export const FORGE_FULL_MS = 3000;

/** Full reserved-card forge animation duration — no replacement deal needed (ms). */
export const RESERVED_FORGE_FULL_MS = 1600;

/** Animation lock used when the DOM rect lookup fails and the card flips in place (ms). */
export const FALLBACK_FLIP_ANIM_MS = 5800;

/** Cleanup timer for the in-place fallback flip — fires 150 ms before the lock expires
 *  so the DOM state is cleared just before the lock releases. */
export const FALLBACK_FLIP_CLEANUP_MS = FALLBACK_FLIP_ANIM_MS - 150;

/** How long the encrypted-receipt label remains after arrival (ms). */
export const ARRIVAL_LABEL_LINGER_MS = 260;

/** Keeps deck encryption locked until the receipt label has faded completely. */
export const CIPHER_TAIL_BUFFER_MS = ARRIVAL_LABEL_LINGER_MS + 220;

/** Per-Affinity stagger interval in the causal Well-to-player trace (ms). */
export const AFFINITY_BURST_STAGGER_MS = 80;

/** Base travel duration for the final Affinity in a Harness trace (ms). */
export const AFFINITY_BURST_BASE_MS = 760;

/** Settling tail added after the final Affinity lands on the player chip (ms).
 *  Total burst lock = (affinities.length - 1) * AFFINITY_BURST_STAGGER_MS + AFFINITY_BURST_BASE_MS + AFFINITY_BURST_SETTLE_MS. */
export const AFFINITY_BURST_SETTLE_MS = 180;

/** Abridged forge animation lock when a replacement card is dealt from the deck (ms).
 *  Covers the card shrink, the deal-from-deck fly/flip, and the trailing settle buffer.
 *  = ABRIDGED_SHRINK_MS + DEAL_ANIM_MS + ANIM_LOCK_BUFFER_MS */
export const ABRIDGED_FORGE_LOCK_MS =
  ABRIDGED_SHRINK_MS + DEAL_ANIM_MS + ANIM_LOCK_BUFFER_MS;

/** All valid animation modes for CipherApertureAnimation.
 *  Adding a new mode here (and a matching entry in CIPHER_MODE_TOTAL_MS) is the only
 *  change required outside of CipherApertureAnimation.tsx itself — the module-level
 *  drift guard loop will automatically cover the new mode. */
export type CipherApertureMode = "tutorial" | "game";

/** Total duration of the CipherApertureAnimation in "game" mode (ms).
 *  Phase breakdown: release(160) + conceal(760) + lock(320) + transfer(500) + arrive(260) = 2000. */
export const CIPHER_GAME_TOTAL_MS = 2000;

/** Total duration of the CipherApertureAnimation in "tutorial" mode (ms).
 *  Phase breakdown: release(180) + conceal(820) + lock(360) + transfer(560) + arrive(300) = 2220. */
export const CIPHER_TUTORIAL_TOTAL_MS = 2220;

/** Expected phase-sum totals for every CipherApertureMode.
 *  Typed as Record<CipherApertureMode, number> so TypeScript enforces full coverage —
 *  adding a new mode to CipherApertureMode without adding an entry here is a compile error.
 *  The module-level drift guard in CipherApertureAnimation.tsx loops over this map so
 *  every mode is automatically protected without hand-writing a new assertion block. */
export const CIPHER_MODE_TOTAL_MS: Record<CipherApertureMode, number> = {
  game:     CIPHER_GAME_TOTAL_MS,
  tutorial: CIPHER_TUTORIAL_TOTAL_MS,
};

/** Delay before firing post-cipher deal/absorb callbacks (ms).
 *  Adds a 70 ms lead-in so the replacement slot appears just as the cipher animation fully
 *  clears, rather than at the exact moment the final phase completes.
 *  = CIPHER_GAME_TOTAL_MS + 70 */
export const CIPHER_DEAL_FIRE_DELAY_MS = CIPHER_GAME_TOTAL_MS + 70;

/** Duration of the LuminaryIdleOverlay return-flight animation — the entity
 *  flies from viewport centre back to its portal card ("shrink to vortex") over
 *  1200 ms before the idle loop begins.  Phase 2 (activation cinematic + brand
 *  strikes) is delayed by this amount so the two animations never overlap. */
export const RETURN_FLIGHT_MS = 1200;
