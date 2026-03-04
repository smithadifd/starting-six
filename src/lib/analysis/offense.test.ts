import { describe, it, expect } from 'vitest';
import { analyzeOffense } from './offense';

describe('analyzeOffense', () => {
  it('empty team: coveragePercent is 0', () => {
    const result = analyzeOffense([]);
    expect(result.coveragePercent).toBe(0);
  });

  it('empty team: all 18 types uncovered', () => {
    const result = analyzeOffense([]);
    expect(result.uncoveredTypes).toHaveLength(18);
  });

  it('Pokemon with no moves: no coverage', () => {
    const result = analyzeOffense([{ name: 'Magikarp', moves: [] }]);
    expect(result.coveragePercent).toBe(0);
  });

  it('status moves are ignored', () => {
    const result = analyzeOffense([{
      name: 'Pikachu',
      moves: [{ type: 'electric', damageClass: 'status', power: null }],
    }]);
    expect(result.coveragePercent).toBe(0);
  });

  it('moves with power 0 are ignored', () => {
    const result = analyzeOffense([{
      name: 'Pikachu',
      moves: [{ type: 'electric', damageClass: 'special', power: 0 }],
    }]);
    expect(result.coveragePercent).toBe(0);
  });

  it('moves with null power are ignored', () => {
    const result = analyzeOffense([{
      name: 'Pikachu',
      moves: [{ type: 'electric', damageClass: 'special', power: null }],
    }]);
    expect(result.coveragePercent).toBe(0);
  });

  it('fire move covers grass/ice/bug/steel super-effectively', () => {
    const result = analyzeOffense([{
      name: 'Charizard',
      moves: [{ type: 'fire', damageClass: 'special', power: 90 }],
    }]);
    expect(result.coverage.grass.covered).toBe(true);
    expect(result.coverage.ice.covered).toBe(true);
    expect(result.coverage.bug.covered).toBe(true);
    expect(result.coverage.steel.covered).toBe(true);
  });

  it('coveredBy includes Pokemon name', () => {
    const result = analyzeOffense([{
      name: 'Charizard',
      moves: [{ type: 'fire', damageClass: 'special', power: 90 }],
    }]);
    expect(result.coverage.grass.coveredBy).toContain('Charizard');
  });

  it('multiple Pokemon covering same type both listed in coveredBy', () => {
    const result = analyzeOffense([
      { name: 'Charizard', moves: [{ type: 'fire', damageClass: 'special', power: 90 }] },
      { name: 'Arcanine', moves: [{ type: 'fire', damageClass: 'physical', power: 80 }] },
    ]);
    expect(result.coverage.grass.coveredBy).toContain('Charizard');
    expect(result.coverage.grass.coveredBy).toContain('Arcanine');
  });

  it('coveragePercent is coveredCount / 18', () => {
    // Fire covers grass, ice, bug, steel = 4 types
    const result = analyzeOffense([{
      name: 'Charizard',
      moves: [{ type: 'fire', damageClass: 'special', power: 90 }],
    }]);
    expect(result.coveragePercent).toBeCloseTo(4 / 18);
  });

  it('uncoveredTypes does not include covered types', () => {
    const result = analyzeOffense([{
      name: 'Charizard',
      moves: [{ type: 'fire', damageClass: 'special', power: 90 }],
    }]);
    expect(result.uncoveredTypes).not.toContain('grass');
    expect(result.uncoveredTypes).toContain('water');
  });

  it('duplicate move types on same Pokemon only count once', () => {
    const result = analyzeOffense([{
      name: 'Charizard',
      moves: [
        { type: 'fire', damageClass: 'special', power: 90 },
        { type: 'fire', damageClass: 'physical', power: 75 },
      ],
    }]);
    // coveredBy should only list Charizard once
    expect(result.coverage.grass.coveredBy).toEqual(['Charizard']);
  });
});
