import { describe, expect, it } from 'vitest';
import {
  DIRECTOR_ROUTES,
  activationDirectorForcesCamera,
} from '../ActivationDirectorRouter';

/**
 * Scroll ownership intentionally lives outside the director registry. These
 * tests guard only named routing; every route participates in the same
 * game-level Luminary presentation lease.
 */
describe('ActivationDirectorRouter registry', () => {
  it('lists the expected named directors', () => {
    const keys = DIRECTOR_ROUTES
      .map(route => `${route.luminaryId}:${route.effectType}`)
      .sort();

    expect(keys).toEqual([
      'lum_astral:start_of_turn',
      'lum_compass:end_of_turn',
      'lum_compass:summon',
      'lum_ember:end_of_turn',
      'lum_ember:summon',
      'lum_forge:summon',
      'lum_hunger:action',
      'lum_null:summon',
      'lum_pale:summon',
      'lum_seed:action',
      'lum_seed:end_of_turn',
      'lum_seed:summon',
      'lum_verdant:summon',
    ]);
  });

  it('has no duplicate route keys', () => {
    const keys = DIRECTOR_ROUTES.map(
      route => `${route.luminaryId}:${route.effectType}`,
    );

    expect(new Set(keys).size).toBe(keys.length);
  });

  it('contains only complete route keys', () => {
    for (const route of DIRECTOR_ROUTES) {
      expect(route.luminaryId.length).toBeGreaterThan(0);
      expect(route.effectType.length).toBeGreaterThan(0);
    }
  });

  it('marks effects that require a forced whole-board frame', () => {
    expect(activationDirectorForcesCamera('lum_ember', 'summon')).toBe(true);
    expect(activationDirectorForcesCamera('lum_ember', 'end_of_turn')).toBe(true);
    expect(activationDirectorForcesCamera('lum_compass', 'summon')).toBe(true);
    expect(activationDirectorForcesCamera('lum_compass', 'end_of_turn')).toBe(true);
    expect(activationDirectorForcesCamera('lum_forge', 'summon')).toBe(true);
    expect(activationDirectorForcesCamera('lum_null', 'summon')).toBe(true);
    expect(activationDirectorForcesCamera('lum_pale', 'summon')).toBe(true);
    expect(activationDirectorForcesCamera('lum_seed', 'summon')).toBe(true);
    expect(activationDirectorForcesCamera('lum_seed', 'end_of_turn')).toBe(true);
    expect(activationDirectorForcesCamera('lum_seed', 'action')).toBe(false);
    expect(activationDirectorForcesCamera('lum_verdant', 'summon')).toBe(false);
    expect(activationDirectorForcesCamera('lum_astral', 'start_of_turn')).toBe(true);
  });
});
