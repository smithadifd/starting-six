import type { PokemonType } from '@/types';
import { POKEMON_TYPES } from '@/types';
import { getDefensiveProfile } from './typeChart';

interface TeamPokemon {
  typeOne: string;
  typeTwo: string | null;
}

export interface DefenseResult {
  /** Per attacking type: how many team members are weak (2x+), resist (0.5x-), immune (0x) */
  byType: Record<PokemonType, { weak: number; resist: number; immune: number }>;
  /** Types where 3+ team members are weak — critical gaps */
  sharedWeaknesses: PokemonType[];
  /** Types where no team member resists — uncovered types */
  uncoveredTypes: PokemonType[];
}

/**
 * Analyze the team's defensive profile across all 18 types.
 * Returns weakness/resistance counts and identifies critical gaps.
 */
export function analyzeDefense(team: TeamPokemon[]): DefenseResult {
  const byType: Record<string, { weak: number; resist: number; immune: number }> = {};

  for (const atkType of POKEMON_TYPES) {
    byType[atkType] = { weak: 0, resist: 0, immune: 0 };
  }

  for (const member of team) {
    const profile = getDefensiveProfile(
      member.typeOne as PokemonType,
      member.typeTwo as PokemonType | null,
    );
    for (const atkType of POKEMON_TYPES) {
      const mult = profile[atkType];
      if (mult === 0) byType[atkType].immune++;
      else if (mult < 1) byType[atkType].resist++;
      else if (mult > 1) byType[atkType].weak++;
    }
  }

  const sharedWeaknesses = POKEMON_TYPES.filter((t) => byType[t].weak >= 3);
  const uncoveredTypes = POKEMON_TYPES.filter(
    (t) => byType[t].resist === 0 && byType[t].immune === 0,
  );

  return {
    byType: byType as Record<PokemonType, { weak: number; resist: number; immune: number }>,
    sharedWeaknesses,
    uncoveredTypes,
  };
}
