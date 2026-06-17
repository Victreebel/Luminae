import { describe, it, expect } from 'vitest';
import { DIRECTOR_ROUTES, directorNeedsScrollLock } from '../ActivationDirectorRouter';

/**
 * These tests guard the scroll-lock predicate against future drift.
 *
 * Because `ActivationDirectorRouter` dispatches via `DIRECTOR_REGISTRY.find()`
 * and `directorNeedsScrollLock` queries the same registry, there are no
 * separate `if` branches that could drift.  Adding a new named director
 * requires adding one entry to DIRECTOR_REGISTRY; `DIRECTOR_ROUTES` is derived
 * from that same array, so the tests below automatically cover every entry
 * without manual updates.
 *
 * The snapshot assertions at the bottom document the current set of
 * rect-sensitive directors and catch any accidental removals or additions.
 */

// ─── Registry-derived contract ────────────────────────────────────────────────
//
// These tests walk DIRECTOR_ROUTES (the exported slice of DIRECTOR_REGISTRY)
// and assert the predicate for every entry.  When a new director is added,
// these tests cover it automatically.

describe('directorNeedsScrollLock — derived from DIRECTOR_REGISTRY', () => {
  it('returns true for every entry marked needsScrollLock:true', () => {
    const rectSensitive = DIRECTOR_ROUTES.filter(r => r.needsScrollLock);
    // The registry must always contain at least one rect-sensitive director
    expect(rectSensitive.length).toBeGreaterThan(0);

    for (const { luminaryId, effectType } of rectSensitive) {
      expect(
        directorNeedsScrollLock(luminaryId, effectType),
        `expected directorNeedsScrollLock('${luminaryId}', '${effectType}') to be true`,
      ).toBe(true);
    }
  });

  it('returns false for every entry marked needsScrollLock:false', () => {
    const notSensitive = DIRECTOR_ROUTES.filter(r => !r.needsScrollLock);

    for (const { luminaryId, effectType } of notSensitive) {
      expect(
        directorNeedsScrollLock(luminaryId, effectType),
        `expected directorNeedsScrollLock('${luminaryId}', '${effectType}') to be false`,
      ).toBe(false);
    }
  });

  it('returns false for pairs absent from the registry', () => {
    expect(directorNeedsScrollLock('lum_unknown', 'summon')).toBe(false);
    expect(directorNeedsScrollLock('lum_ember', 'start_of_turn')).toBe(false);
    expect(directorNeedsScrollLock('', '')).toBe(false);
  });

  it('DIRECTOR_ROUTES length matches the expected number of named directors', () => {
    // Update this count when new named directors are added.
    // It acts as a tripwire: adding a DIRECTOR_REGISTRY entry without
    // updating this assertion (and vice-versa) makes the test fail immediately.
    expect(DIRECTOR_ROUTES).toHaveLength(2);
  });
});

// ─── Snapshot of current registry ─────────────────────────────────────────────
//
// These assertions document the exact current state of the registry.
// They catch accidental removals or unexpected additions.

describe('DIRECTOR_ROUTES — registry snapshot', () => {
  it('lists the expected rect-sensitive directors', () => {
    const keys = DIRECTOR_ROUTES
      .filter(r => r.needsScrollLock)
      .map(r => `${r.luminaryId}:${r.effectType}`)
      .sort();

    expect(keys).toEqual([
      'lum_ember:summon', // CinderMandateBrandingDirector — reads card slot rects on mount
    ]);
  });

  it('lists the expected non-rect-sensitive named directors', () => {
    const keys = DIRECTOR_ROUTES
      .filter(r => !r.needsScrollLock)
      .map(r => `${r.luminaryId}:${r.effectType}`)
      .sort();

    expect(keys).toEqual([
      'lum_ember:end_of_turn', // CinderMandateBurnDirector — no rect capture
    ]);
  });

  it('every entry has the required fields with non-empty strings', () => {
    for (const route of DIRECTOR_ROUTES) {
      expect(typeof route.luminaryId).toBe('string');
      expect(route.luminaryId.length).toBeGreaterThan(0);
      expect(typeof route.effectType).toBe('string');
      expect(route.effectType.length).toBeGreaterThan(0);
      expect(typeof route.needsScrollLock).toBe('boolean');
    }
  });

  it('has no duplicate (luminaryId, effectType) keys', () => {
    // Duplicate keys would cause router `find` and predicate `some` to silently
    // disagree when one entry has needsScrollLock:true and the duplicate false.
    const keys = DIRECTOR_ROUTES.map(r => `${r.luminaryId}:${r.effectType}`);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});
