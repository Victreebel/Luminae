/**
 * @workspace/game-types
 *
 * Shared game constants and types used by both the frontend (luminae) and the
 * backend (api-server).  Keeping them here ensures a single source of truth:
 * adding a new aura style in this file immediately produces TypeScript errors
 * in both packages if the LUMINARIES array or LUMINARY_VISUALS map does not
 * include a matching value.
 */

/**
 * Canonical set of Luminary ID string literals.  This is the authoritative
 * list — both the backend LuminaryDef interface and the frontend
 * LUMINARY_VISUALS map type their `id` field (and map key) as `LuminaryId`, so
 * an ID that is not in this list is a compile-time error in both packages.
 *
 * When adding a new Luminary:
 *   1. Add its ID here.
 *   2. Add a matching entry to LUMINARIES in gameEngine.ts.
 *   3. Add a matching entry to LUMINARY_VISUALS in luminaryAssets.tsx.
 *   4. TypeScript will flag every incomplete usage automatically.
 *
 * The lint:summon-colors script remains a secondary safety net that checks
 * summonColor / summonSecondaryColor / auraStyle values match at runtime; the
 * primary guard for ID correctness is this compile-time union type.
 */
export const LUMINARY_IDS = [
  'lum_ember',
  'lum_tide',
  'lum_verdant',
  'lum_void',
  'lum_radiant',
  'lum_astral',
  'lum_bloom',
  'lum_forge',
  'lum_compass',
  'lum_seed',
  'lum_orchard',
  'lum_pale',
  'lum_hunger',
  'lum_moth',
  'lum_null',
  'lum_oracle',
] as const;

export type LuminaryId = (typeof LUMINARY_IDS)[number];

/**
 * Canonical set of aura animation style keys recognised by the frontend aura
 * renderer.  This is the authoritative list — both the backend LuminaryDef
 * interface and the frontend LUMINARY_VISUALS map type their `auraStyle` field
 * as `AuraStyle`, so an unknown value is a compile-time error in both packages.
 *
 * When adding a new animation variant:
 *   1. Add its key here.
 *   2. Add a matching case to the aura renderer in luminaryAssets.tsx
 *      (AURA_VARIANTS record).
 *   3. TypeScript will flag every incomplete usage automatically.
 */
export const KNOWN_AURA_STYLES = [
  'fire',
  'tide',
  'verdant',
  'void',
  'radiant',
  'astral',
  'storm',
  'pale',
  'bloom',
  'compass',
  'oracle',
  'null',
] as const;

export type AuraStyle = (typeof KNOWN_AURA_STYLES)[number];
