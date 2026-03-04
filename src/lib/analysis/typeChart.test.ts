import { describe, it, expect } from 'vitest';
import { getEffectiveness, getDefensiveProfile, TYPE_CHART } from './typeChart';
import { POKEMON_TYPES } from '@/types';

describe('TYPE_CHART', () => {
  it('has exactly 18 attacking types', () => {
    expect(Object.keys(TYPE_CHART)).toHaveLength(18);
  });

  it('has exactly 18 defending entries per attacking type', () => {
    for (const atk of POKEMON_TYPES) {
      expect(Object.keys(TYPE_CHART[atk])).toHaveLength(18);
    }
  });

  it('all values are 0, 0.5, 1, or 2', () => {
    const valid = new Set([0, 0.5, 1, 2]);
    for (const atk of POKEMON_TYPES) {
      for (const def of POKEMON_TYPES) {
        expect(valid.has(TYPE_CHART[atk][def])).toBe(true);
      }
    }
  });
});

describe('getEffectiveness', () => {
  it('returns 2 for super-effective (fire vs grass)', () => {
    expect(getEffectiveness('fire', 'grass')).toBe(2);
  });

  it('returns 0.5 for not-very-effective (fire vs water)', () => {
    expect(getEffectiveness('fire', 'water')).toBe(0.5);
  });

  it('returns 0 for immune (normal vs ghost)', () => {
    expect(getEffectiveness('normal', 'ghost')).toBe(0);
  });

  it('returns 1 for neutral (fire vs normal)', () => {
    expect(getEffectiveness('fire', 'normal')).toBe(1);
  });

  it('stacks dual-type weaknesses (ground vs fire/steel = 4)', () => {
    expect(getEffectiveness('ground', 'fire', 'steel')).toBe(4);
  });

  it('cancels dual-type (fire vs grass/water = 1)', () => {
    // grass is 2x weak, water is 0.5x resist → 2 * 0.5 = 1
    expect(getEffectiveness('fire', 'grass', 'water')).toBe(1);
  });

  it('immunity trumps weakness in dual type (ground vs flying/steel = 0)', () => {
    // ground vs flying = 0 (immune), ground vs steel = 2 → 0 * 2 = 0
    expect(getEffectiveness('ground', 'flying', 'steel')).toBe(0);
  });

  it('handles null second type as single type', () => {
    expect(getEffectiveness('fire', 'grass', null)).toBe(2);
  });

  it('handles undefined second type as single type', () => {
    expect(getEffectiveness('fire', 'grass', undefined)).toBe(2);
  });

  it('dual resist stacks (fire vs fire/water = 0.25)', () => {
    // fire vs fire = 0.5, fire vs water = 0.5 → 0.5 * 0.5 = 0.25
    expect(getEffectiveness('fire', 'fire', 'water')).toBe(0.25);
  });
});

describe('getDefensiveProfile', () => {
  it('returns all 18 type entries', () => {
    const profile = getDefensiveProfile('fire');
    expect(Object.keys(profile)).toHaveLength(18);
  });

  it('pure electric: weak to ground, resists flying/steel/electric', () => {
    const profile = getDefensiveProfile('electric');
    expect(profile.ground).toBe(2);
    expect(profile.flying).toBe(0.5);
    expect(profile.steel).toBe(0.5);
    expect(profile.electric).toBe(0.5);
    expect(profile.normal).toBe(1);
  });

  it('water/ground: 4x weak to grass, immune to electric', () => {
    const profile = getDefensiveProfile('water', 'ground');
    expect(profile.grass).toBe(4);
    expect(profile.electric).toBe(0);
  });

  it('steel/fairy: immune to dragon and poison', () => {
    const profile = getDefensiveProfile('steel', 'fairy');
    expect(profile.dragon).toBe(0);
    expect(profile.poison).toBe(0);
  });

  it('ghost/dark: immune to normal and fighting, weak to fairy', () => {
    const profile = getDefensiveProfile('ghost', 'dark');
    expect(profile.normal).toBe(0);
    expect(profile.fighting).toBe(0);
    expect(profile.fairy).toBe(2);
  });
});
