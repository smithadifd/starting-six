import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { getPlaythrough, getTeamMembers } from '@/lib/db/queries';
import { getDb } from '@/lib/db';
import { pokemon, abilities } from '@/lib/db/schema';
import { inArray } from 'drizzle-orm';
import { analyzeDefense } from '@/lib/analysis/defense';
import { analyzeOffense } from '@/lib/analysis/offense';
import { analyzeRoles } from '@/lib/analysis/roles';
import { analyzeAbilities } from '@/lib/analysis/abilities';
import { apiSuccess, apiNotFound, apiUnauthorized, apiError } from '@/lib/utils/api';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  const playthroughId = parseInt(id, 10);
  if (isNaN(playthroughId)) return apiNotFound('Playthrough');

  const run = getPlaythrough(playthroughId, userId);
  if (!run) return apiNotFound('Playthrough');

  const team = getTeamMembers(playthroughId, 'active');
  if (team.length === 0) {
    return apiError('Add at least one Pokémon to analyze', 400);
  }

  const db = getDb();

  // Batch fetch full pokemon data (for stats) and abilities (for isNotable)
  const pokemonIds = [...new Set(team.map((m) => m.pokemon.id))];
  const abilityIds = [...new Set(
    team.filter((m) => m.ability).map((m) => m.ability!.id),
  )];

  const pokeMap = new Map(
    db.select().from(pokemon).where(inArray(pokemon.id, pokemonIds)).all()
      .map((p) => [p.id, p]),
  );
  const abilMap = new Map(
    abilityIds.length > 0
      ? db.select().from(abilities).where(inArray(abilities.id, abilityIds)).all()
        .map((a) => [a.id, a])
      : [],
  );

  // Build defense input
  const defenseInput = team.map((m) => ({
    typeOne: m.pokemon.typeOne,
    typeTwo: m.pokemon.typeTwo,
  }));

  // Build offense input
  const offenseInput = team.map((m) => ({
    name: m.pokemon.name,
    moves: m.moves.map((mv) => ({
      type: mv.move.type,
      damageClass: mv.move.damageClass,
      power: mv.move.power,
    })),
  }));

  // Build roles input — need full stats from pokemon table
  const rolesInput = team.map((m) => {
    const poke = pokeMap.get(m.pokemon.id);
    return {
      name: m.pokemon.name,
      statHp: poke?.statHp ?? 0,
      statAtk: poke?.statAtk ?? 0,
      statDef: poke?.statDef ?? 0,
      statSpAtk: poke?.statSpAtk ?? 0,
      statSpDef: poke?.statSpDef ?? 0,
      statSpd: poke?.statSpd ?? 0,
      bst: poke?.bst ?? 0,
    };
  });

  // Build abilities input
  const abilitiesInput = team
    .filter((m) => m.ability)
    .map((m) => {
      const abil = abilMap.get(m.ability!.id);
      return {
        pokemonName: m.pokemon.name,
        name: m.ability!.name,
        slug: m.ability!.slug,
        effectShort: m.ability!.effectShort,
        isNotable: abil?.isNotable ?? false,
      };
    });

  const defense = analyzeDefense(defenseInput);
  const offense = analyzeOffense(offenseInput);
  const roles = analyzeRoles(rolesInput);
  const abilityHighlights = analyzeAbilities(abilitiesInput);

  return apiSuccess({
    defense,
    offense,
    roles,
    abilities: abilityHighlights,
    teamSize: team.length,
  });
}
