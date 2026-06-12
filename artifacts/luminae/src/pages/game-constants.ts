import { GEM_KEYS, type GemKey } from '@/lib/gemMeta';
import cardTier1Bg from '@assets/generated_images/card_tier1.png';
import cardTier3Bg from '@assets/generated_images/card_tier3.png';

export function hexRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

const CARD_ART_MODULES = import.meta.glob(
  '../assets/cards/*.png',
  { eager: true, query: '?url', import: 'default' },
) as Record<string, string>;
export const CARD_ART: Record<string, string> = {};
for (const [path, url] of Object.entries(CARD_ART_MODULES)) {
  const id = path.split('/').pop()!.replace('.png', '');
  CARD_ART[id] = url;
}

export const CRYSTALS: GemKey[] = GEM_KEYS;

export const TIER_BACKDROPS: Record<number, string> = {
  1: cardTier1Bg,
  3: cardTier3Bg,
};

export const TIER_CIVILIZATION: Record<number, string> = {
  1: 'Planetary',
  2: 'Stellar',
  3: 'Galactic',
};

export const GEM_CARD_GRADIENTS: Record<string, string> = {
  ruby:     'linear-gradient(175deg, #1a0404 0%, #3d0808 35%, #220505 70%, #100202 100%)',
  sapphire: 'linear-gradient(175deg, #020510 0%, #071840 35%, #040a28 70%, #020510 100%)',
  emerald:  'linear-gradient(175deg, #021005 0%, #063020 35%, #041a10 70%, #020c04 100%)',
  onyx:     'linear-gradient(175deg, #060606 0%, #181818 35%, #0e0e0e 70%, #050505 100%)',
  pearl:    'linear-gradient(175deg, #100c02 0%, #2a2008 35%, #1c1606 70%, #0c0a02 100%)',
  flux:     'linear-gradient(175deg, #08080f 0%, #141428 35%, #0e0e1e 70%, #08080f 100%)',
};

export const GEM_KEY_TO_HEX: Record<string, string> = {
  ruby:     '#ff5a3c',
  sapphire: '#60a5fa',
  emerald:  '#2ecc71',
  onyx:     '#0f172a',
  pearl:    '#DFC878',
  flux:     '#E8E4FF',
};

export const opponentTurnVariants = {
  idle:   { scale: 1 },
  active: { scale: [1, 1.14, 1], transition: { duration: 0.45, ease: [0.34, 1.56, 0.64, 1] as const } },
};

export const localTurnVariants = {
  idle:   { scale: 1 },
  active: { scale: [1, 1.07, 1], transition: { duration: 0.4,  ease: [0.34, 1.56, 0.64, 1] as const } },
};

/** Duration of the deal-from-deck (card fly + flip) animation in ms.
 *  Used by setAnimEndTime in both the initial guard and the deck-found branch
 *  so both call sites derive from the same source. */
export const DEAL_ANIM_MS = 1700;

/** Delay (ms) after a card begins its deal-from-deck flight before the
 *  Card_Flip_Over.wav flip SFX fires. Times the sound to the visual edge-flip:
 *  the deal animation runs 1.5 s with rotateY hitting 90° at its midpoint
 *  (~750 ms), so a slight lead lands the flip sound on the card turning over. */
export const DEAL_FLIP_SOUND_MS = 600;

/** Brief animation lock fired on the initial turn announcement (ms). */
export const INITIAL_TURN_GUARD_MS = 1200;

/** Duration of the abridged forge shrink animation (ms).
 *  Abridged forge lock = ABRIDGED_SHRINK_MS + DEAL_ANIM_MS + ANIM_LOCK_BUFFER_MS. */
export const ABRIDGED_SHRINK_MS = 450;

/** Trailing buffer added after a deal animation in the abridged forge lock (ms). */
export const ANIM_LOCK_BUFFER_MS = 270;

/** Animation lock duration for simple abridged actions with no deal phase
 *  (reserved-card forge, deck reserve, local forge from hand) (ms). */
export const ABRIDGED_ACTION_MS = 550;

/** Full forge animation duration for market purchases
 *  (stamp + fly + deal + settling buffer) (ms). */
export const FORGE_FULL_MS = 3000;

/** Full reserved-card forge animation duration — no replacement deal needed (ms). */
export const RESERVED_FORGE_FULL_MS = 1600;

/** Animation lock used when the DOM rect lookup fails and the card flips in place (ms). */
export const FALLBACK_FLIP_ANIM_MS = 5800;

/** Cleanup timer for the in-place fallback flip — fires 150 ms before the lock expires
 *  so the DOM state is cleared just before the lock releases. */
export const FALLBACK_FLIP_CLEANUP_MS = FALLBACK_FLIP_ANIM_MS - 150;

/** Small tail buffer added to CIPHER_GAME_TOTAL_MS for the deck-reserve lock
 *  (no deal phase, so a tighter margin is acceptable) (ms). */
export const CIPHER_TAIL_BUFFER_MS = 100;

/** Per-gem stagger interval in the gem harvest burst animation (ms). */
export const GEM_BURST_STAGGER_MS = 780;

/** Base animation duration for the final gem in a harvest burst (ms). */
export const GEM_BURST_BASE_MS = 1250;

/** Settling tail added after the final gem animation in a harvest burst (ms).
 *  Total burst lock = (gems.length - 1) * GEM_BURST_STAGGER_MS + GEM_BURST_BASE_MS + GEM_BURST_SETTLE_MS. */
export const GEM_BURST_SETTLE_MS = 550;

/** Abridged forge animation lock when a replacement card is dealt from the deck (ms).
 *  Covers the card shrink, the deal-from-deck fly/flip, and the trailing settle buffer.
 *  = ABRIDGED_SHRINK_MS + DEAL_ANIM_MS + ANIM_LOCK_BUFFER_MS */
export const ABRIDGED_FORGE_LOCK_MS = ABRIDGED_SHRINK_MS + DEAL_ANIM_MS + ANIM_LOCK_BUFFER_MS;

/** All valid animation modes for CipherApertureAnimation.
 *  Adding a new mode here (and a matching entry in CIPHER_MODE_TOTAL_MS) is the only
 *  change required outside of CipherApertureAnimation.tsx itself — the module-level
 *  drift guard loop will automatically cover the new mode. */
export type CipherApertureMode = "tutorial" | "game";

/** Total duration of the CipherApertureAnimation in "game" mode (ms).
 *  Phase breakdown: forefront(180) + circuit(950) + compress(600) + travel(620) + arrive(330) = 2680. */
export const CIPHER_GAME_TOTAL_MS = 2680;

/** Total duration of the CipherApertureAnimation in "tutorial" mode (ms).
 *  Phase breakdown: forefront(180) + circuit(900) + compress(580) + travel(600) + arrive(350) = 2610. */
export const CIPHER_TUTORIAL_TOTAL_MS = 2610;

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

/** How long the arrival label lingers after the cipher animation completes before fading (ms). */
export const ARRIVAL_LABEL_LINGER_MS = 250;
