import type { PokemonType } from '@/types';
import { POKEMON_TYPES } from '@/types';
import { getEffectiveness } from './typeChart';

interface TeamMove {
  type: string;
  damageClass: string;
  power: number | null;
}

interface TeamPokemon {
  name: string;
  moves: TeamMove[];
}

export interface OffenseResult {
  /** Per defending type: can the team hit it super-effectively? */
  coverage: Record<PokemonType, { covered: boolean; coveredBy: string[] }>;
  /** Types the team cannot hit super-effectively */
  uncoveredTypes: PokemonType[];
  /** Fraction of 18 types covered (0-1) */
  coveragePercent: number;
}

/**
 * Analyze the team's offensive move coverage.
 * Only considers damaging moves (physical/special with power > 0).
 */
export function analyzeOffense(team: TeamPokemon[]): OffenseResult {
  const coverage: Record<string, { covered: boolean; coveredBy: string[] }> = {};

  for (const defType of POKEMON_TYPES) {
    coverage[defType] = { covered: false, coveredBy: [] };
  }

  for (const member of team) {
    const attackTypes = new Set<PokemonType>();

    for (const move of member.moves) {
      if (move.damageClass === 'status') continue;
      if (!move.power || move.power <= 0) continue;
      attackTypes.add(move.type as PokemonType);
    }

    for (const atkType of attackTypes) {
      for (const defType of POKEMON_TYPES) {
        const mult = getEffectiveness(atkType, defType);
        if (mult > 1) {
          coverage[defType].covered = true;
          if (!coverage[defType].coveredBy.includes(member.name)) {
            coverage[defType].coveredBy.push(member.name);
          }
        }
      }
    }
  }

  const uncoveredTypes = POKEMON_TYPES.filter((t) => !coverage[t].covered);
  const coveredCount = POKEMON_TYPES.length - uncoveredTypes.length;

  return {
    coverage: coverage as Record<PokemonType, { covered: boolean; coveredBy: string[] }>,
    uncoveredTypes,
    coveragePercent: coveredCount / POKEMON_TYPES.length,
  };
}
