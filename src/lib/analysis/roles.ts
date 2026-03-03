interface PokemonStats {
  name: string;
  statHp: number;
  statAtk: number;
  statDef: number;
  statSpAtk: number;
  statSpDef: number;
  statSpd: number;
  bst: number;
}

export type Role =
  | 'Physical Sweeper'
  | 'Special Sweeper'
  | 'Mixed Attacker'
  | 'Physical Wall'
  | 'Special Wall'
  | 'Tank'
  | 'Support'
  | 'Glass Cannon'
  | 'Balanced';

export interface RoleResult {
  name: string;
  roles: Role[];
  bst: number;
}

/**
 * Classify a Pokémon's role(s) based on its base stats.
 * A Pokémon can have multiple roles.
 */
export function classifyRole(poke: PokemonStats): RoleResult {
  const roles: Role[] = [];
  const { statAtk, statSpAtk, statDef, statSpDef, statSpd, statHp } = poke;

  const highAtk = statAtk >= 100;
  const highSpAtk = statSpAtk >= 100;
  const highSpd = statSpd >= 90;
  const highDef = statDef >= 100;
  const highSpDef = statSpDef >= 100;
  const highHp = statHp >= 90;
  const lowDef = statDef < 70 && statSpDef < 70;

  if (highAtk && highSpd && !highSpAtk) roles.push('Physical Sweeper');
  if (highSpAtk && highSpd && !highAtk) roles.push('Special Sweeper');
  if (highAtk && highSpAtk) roles.push('Mixed Attacker');
  if (highDef && highHp && !highSpDef) roles.push('Physical Wall');
  if (highSpDef && highHp && !highDef) roles.push('Special Wall');
  if (highDef && highSpDef) roles.push('Tank');
  if ((highAtk || highSpAtk) && lowDef) roles.push('Glass Cannon');

  if (!highAtk && !highSpAtk && (highDef || highSpDef || highHp)) {
    roles.push('Support');
  }

  if (roles.length === 0) roles.push('Balanced');

  return { name: poke.name, roles, bst: poke.bst };
}

/** Classify roles for every Pokémon on the team. */
export function analyzeRoles(team: PokemonStats[]): RoleResult[] {
  return team.map(classifyRole);
}
