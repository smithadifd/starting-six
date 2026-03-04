import { describe, it, expect } from 'vitest';
import { analyzeAbilities } from './abilities';

describe('analyzeAbilities', () => {
  it('returns empty array for empty team', () => {
    expect(analyzeAbilities([])).toEqual([]);
  });

  it('includes ability flagged as notable in DB (isNotable: true)', () => {
    const result = analyzeAbilities([{
      pokemonName: 'Alakazam',
      name: 'Magic Guard',
      slug: 'magic-guard',
      effectShort: 'Only takes damage from attacks.',
      isNotable: true,
    }]);
    expect(result).toHaveLength(1);
    expect(result[0].abilityName).toBe('Magic Guard');
  });

  it('includes ability in TEAM_NOTABLE_SLUGS even if isNotable is false', () => {
    const result = analyzeAbilities([{
      pokemonName: 'Arcanine',
      name: 'Intimidate',
      slug: 'intimidate',
      effectShort: 'Lowers foe Attack.',
      isNotable: false,
    }]);
    expect(result).toHaveLength(1);
    expect(result[0].abilityName).toBe('Intimidate');
  });

  it('excludes non-notable ability not in curated list', () => {
    const result = analyzeAbilities([{
      pokemonName: 'Pikachu',
      name: 'Static',
      slug: 'static',
      effectShort: 'May paralyze on contact.',
      isNotable: false,
    }]);
    expect(result).toEqual([]);
  });

  it('uses fallback text when effectShort is null', () => {
    const result = analyzeAbilities([{
      pokemonName: 'Test',
      name: 'Drought',
      slug: 'drought',
      effectShort: null,
      isNotable: true,
    }]);
    expect(result[0].effect).toBe('No description available');
  });

  it('returns correct output shape', () => {
    const result = analyzeAbilities([{
      pokemonName: 'Gyarados',
      name: 'Intimidate',
      slug: 'intimidate',
      effectShort: 'Lowers foe Attack on entry.',
      isNotable: false,
    }]);
    expect(result[0]).toEqual({
      pokemonName: 'Gyarados',
      abilityName: 'Intimidate',
      effect: 'Lowers foe Attack on entry.',
    });
  });

  it('mixed team: only notable entries returned', () => {
    const result = analyzeAbilities([
      { pokemonName: 'Gyarados', name: 'Intimidate', slug: 'intimidate', effectShort: 'Lowers Attack.', isNotable: false },
      { pokemonName: 'Pikachu', name: 'Static', slug: 'static', effectShort: 'May paralyze.', isNotable: false },
      { pokemonName: 'Ninetales', name: 'Drought', slug: 'drought', effectShort: 'Summons sun.', isNotable: true },
    ]);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.pokemonName)).toEqual(['Gyarados', 'Ninetales']);
  });
});
