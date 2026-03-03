interface TeamAbility {
  pokemonName: string;
  name: string;
  slug: string;
  effectShort: string | null;
  isNotable: boolean;
}

export interface AbilityHighlight {
  pokemonName: string;
  abilityName: string;
  effect: string;
}

/** Well-known notable ability slugs for team-relevant highlights */
const TEAM_NOTABLE_SLUGS = new Set([
  'intimidate', 'drought', 'drizzle', 'sand-stream', 'snow-warning',
  'levitate', 'magic-bounce', 'prankster', 'regenerator', 'multiscale',
  'sturdy', 'magic-guard', 'unaware', 'mold-breaker', 'adaptability',
  'protean', 'libero', 'huge-power', 'pure-power', 'speed-boost',
  'guts', 'technician', 'contrary', 'serene-grace', 'drought',
  'electric-surge', 'grassy-surge', 'misty-surge', 'psychic-surge',
]);

/**
 * Filter and return notable ability highlights from the team.
 * Returns abilities that are either DB-flagged as notable or in the curated list.
 */
export function analyzeAbilities(team: TeamAbility[]): AbilityHighlight[] {
  return team
    .filter((a) => a.isNotable || TEAM_NOTABLE_SLUGS.has(a.slug))
    .map((a) => ({
      pokemonName: a.pokemonName,
      abilityName: a.name,
      effect: a.effectShort || 'No description available',
    }));
}
