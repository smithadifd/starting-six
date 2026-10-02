import { describe, it, expect } from 'vitest';
import { classifyRole, analyzeRoles } from './roles';

const basePoke = {
  name: 'Test',
  statHp: 80,
  statAtk: 80,
  statDef: 80,
  statSpAtk: 80,
  statSpDef: 80,
  statSpd: 80,
  bst: 480,
};

describe('classifyRole', () => {
  it.each([
    ['attack below', { statAtk: 99, statSpd: 90 }, ['Balanced']],
    ['attack at', { statAtk: 100, statSpd: 90 }, ['Physical Sweeper']],
    ['attack above', { statAtk: 101, statSpd: 90 }, ['Physical Sweeper']],
    ['special attack below', { statSpAtk: 99, statSpd: 90 }, ['Balanced']],
    ['special attack at', { statSpAtk: 100, statSpd: 90 }, ['Special Sweeper']],
    ['special attack above', { statSpAtk: 101, statSpd: 90 }, ['Special Sweeper']],
    ['speed below', { statAtk: 100, statSpd: 89 }, ['Balanced']],
    ['speed at', { statAtk: 100, statSpd: 90 }, ['Physical Sweeper']],
    ['speed above', { statAtk: 100, statSpd: 91 }, ['Physical Sweeper']],
    ['HP below', { statDef: 100, statHp: 89 }, ['Support']],
    ['HP at', { statDef: 100, statHp: 90 }, ['Physical Wall', 'Support']],
    ['HP above', { statDef: 100, statHp: 91 }, ['Physical Wall', 'Support']],
    ['defense below', { statDef: 99, statSpDef: 100 }, ['Support']],
    ['defense at', { statDef: 100, statSpDef: 100 }, ['Tank', 'Support']],
    ['defense above', { statDef: 101, statSpDef: 100 }, ['Tank', 'Support']],
    ['special defense below', { statDef: 100, statSpDef: 99 }, ['Support']],
    ['special defense at', { statDef: 100, statSpDef: 100 }, ['Tank', 'Support']],
    ['special defense above', { statDef: 100, statSpDef: 101 }, ['Tank', 'Support']],
    ['low defense below', { statAtk: 100, statDef: 69, statSpDef: 69 }, ['Glass Cannon']],
    ['low defense at', { statAtk: 100, statDef: 70, statSpDef: 69 }, ['Balanced']],
    ['low defense above', { statAtk: 100, statDef: 71, statSpDef: 69 }, ['Balanced']],
    ['low special defense below', { statAtk: 100, statDef: 69, statSpDef: 69 }, ['Glass Cannon']],
    ['low special defense at', { statAtk: 100, statDef: 69, statSpDef: 70 }, ['Balanced']],
    ['low special defense above', { statAtk: 100, statDef: 69, statSpDef: 71 }, ['Balanced']],
  ] as const)('%s threshold', (_name, stats, roles) => {
    expect(classifyRole({ ...basePoke, ...stats }).roles).toEqual(roles);
  });

  it('Physical Sweeper: high Atk + high Spd, not high SpAtk', () => {
    const result = classifyRole({ ...basePoke, statAtk: 120, statSpd: 95, statSpAtk: 60 });
    expect(result.roles).toContain('Physical Sweeper');
    expect(result.roles).not.toContain('Special Sweeper');
  });

  it('Special Sweeper: high SpAtk + high Spd, not high Atk', () => {
    const result = classifyRole({ ...basePoke, statSpAtk: 110, statSpd: 100, statAtk: 60 });
    expect(result.roles).toContain('Special Sweeper');
    expect(result.roles).not.toContain('Physical Sweeper');
  });

  it('Mixed Attacker: both Atk and SpAtk >= 100', () => {
    const result = classifyRole({ ...basePoke, statAtk: 110, statSpAtk: 105 });
    expect(result.roles).toContain('Mixed Attacker');
  });

  it('Physical Wall: high Def + high HP, not high SpDef', () => {
    const result = classifyRole({ ...basePoke, statDef: 120, statHp: 100, statSpDef: 60 });
    expect(result.roles).toContain('Physical Wall');
    expect(result.roles).not.toContain('Special Wall');
  });

  it('Special Wall: high SpDef + high HP, not high Def', () => {
    const result = classifyRole({ ...basePoke, statSpDef: 110, statHp: 95, statDef: 60 });
    expect(result.roles).toContain('Special Wall');
    expect(result.roles).not.toContain('Physical Wall');
  });

  it('Tank: both Def and SpDef >= 100', () => {
    const result = classifyRole({ ...basePoke, statDef: 110, statSpDef: 105 });
    expect(result.roles).toContain('Tank');
  });

  it('Glass Cannon: high offensive stat + low defenses', () => {
    const result = classifyRole({ ...basePoke, statAtk: 130, statDef: 50, statSpDef: 50 });
    expect(result.roles).toContain('Glass Cannon');
  });

  it('Support: not high offensive, but high defensive/HP', () => {
    const result = classifyRole({ ...basePoke, statAtk: 60, statSpAtk: 60, statDef: 110, statHp: 100, statSpDef: 60 });
    expect(result.roles).toContain('Support');
  });

  it('Balanced: no thresholds met', () => {
    const result = classifyRole(basePoke);
    expect(result.roles).toEqual(['Balanced']);
  });

  it('can have multiple roles', () => {
    // Mixed Attacker + Glass Cannon
    const result = classifyRole({ ...basePoke, statAtk: 120, statSpAtk: 110, statDef: 50, statSpDef: 50 });
    expect(result.roles).toContain('Mixed Attacker');
    expect(result.roles).toContain('Glass Cannon');
  });

  it('passes through name and bst', () => {
    const result = classifyRole({ ...basePoke, name: 'Garchomp', bst: 600 });
    expect(result.name).toBe('Garchomp');
    expect(result.bst).toBe(600);
  });
});

describe('analyzeRoles', () => {
  it('returns empty array for empty team', () => {
    expect(analyzeRoles([])).toEqual([]);
  });

  it('maps one result per team member', () => {
    const team = [
      { ...basePoke, name: 'A' },
      { ...basePoke, name: 'B' },
    ];
    const result = analyzeRoles(team);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('A');
    expect(result[1].name).toBe('B');
  });
});
