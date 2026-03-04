import { describe, it, expect } from 'vitest';
import { analyzeDefense } from './defense';
import { POKEMON_TYPES } from '@/types';

describe('analyzeDefense', () => {
  it('empty team: all types have zero counts', () => {
    const result = analyzeDefense([]);
    for (const t of POKEMON_TYPES) {
      expect(result.byType[t]).toEqual({ weak: 0, resist: 0, immune: 0 });
    }
  });

  it('empty team: no shared weaknesses', () => {
    const result = analyzeDefense([]);
    expect(result.sharedWeaknesses).toEqual([]);
  });

  it('empty team: all types are uncovered (no resists/immunities)', () => {
    const result = analyzeDefense([]);
    expect(result.uncoveredTypes).toEqual(POKEMON_TYPES);
  });

  it('single fire Pokemon: weak to water/ground/rock', () => {
    const result = analyzeDefense([{ typeOne: 'fire', typeTwo: null }]);
    expect(result.byType.water.weak).toBe(1);
    expect(result.byType.ground.weak).toBe(1);
    expect(result.byType.rock.weak).toBe(1);
  });

  it('single fire Pokemon: resists fire/grass/ice/bug/steel/fairy', () => {
    const result = analyzeDefense([{ typeOne: 'fire', typeTwo: null }]);
    expect(result.byType.fire.resist).toBe(1);
    expect(result.byType.grass.resist).toBe(1);
    expect(result.byType.ice.resist).toBe(1);
    expect(result.byType.bug.resist).toBe(1);
    expect(result.byType.steel.resist).toBe(1);
    expect(result.byType.fairy.resist).toBe(1);
  });

  it('ghost type: immune to normal and fighting', () => {
    const result = analyzeDefense([{ typeOne: 'ghost', typeTwo: null }]);
    expect(result.byType.normal.immune).toBe(1);
    expect(result.byType.fighting.immune).toBe(1);
  });

  it('3 grass types triggers shared weakness to fire', () => {
    const team = [
      { typeOne: 'grass', typeTwo: null },
      { typeOne: 'grass', typeTwo: null },
      { typeOne: 'grass', typeTwo: null },
    ];
    const result = analyzeDefense(team);
    expect(result.sharedWeaknesses).toContain('fire');
    expect(result.byType.fire.weak).toBe(3);
  });

  it('2 grass types does NOT trigger shared weakness', () => {
    const team = [
      { typeOne: 'grass', typeTwo: null },
      { typeOne: 'grass', typeTwo: null },
    ];
    const result = analyzeDefense(team);
    expect(result.sharedWeaknesses).not.toContain('fire');
  });

  it('uncoveredTypes excludes types where a team member resists', () => {
    // Fire resists grass → grass is not uncovered
    const result = analyzeDefense([{ typeOne: 'fire', typeTwo: null }]);
    expect(result.uncoveredTypes).not.toContain('grass');
  });

  it('uncoveredTypes excludes types where a team member is immune', () => {
    // Ghost is immune to normal → normal is not uncovered
    const result = analyzeDefense([{ typeOne: 'ghost', typeTwo: null }]);
    expect(result.uncoveredTypes).not.toContain('normal');
  });

  it('dual-type water/ground: 4x weak to grass counted as 1 weak', () => {
    const result = analyzeDefense([{ typeOne: 'water', typeTwo: 'ground' }]);
    // 4x is still > 1, so it counts as weak
    expect(result.byType.grass.weak).toBe(1);
  });

  it('dual-type water/ground: immune to electric', () => {
    const result = analyzeDefense([{ typeOne: 'water', typeTwo: 'ground' }]);
    expect(result.byType.electric.immune).toBe(1);
  });
});
