import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiValidationError } from '@/lib/utils/api';
import { getPokemonById, getPokemonMoves, getPokemonAbilities } from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  const { id } = await params;
  const pokemonId = parseInt(id, 10);
  if (isNaN(pokemonId)) return apiValidationError('Invalid Pokemon ID');

  try {
    const poke = getPokemonById(pokemonId);
    if (!poke) return apiNotFound('Pokemon');

    const { searchParams } = new URL(request.url);
    const include = searchParams.get('include');

    if (include === 'abilities') {
      const movesData = getPokemonMoves(pokemonId);
      const abilitiesData = getPokemonAbilities(pokemonId);
      return apiSuccess({
        moves: movesData.map((pm) => pm.move),
        abilities: abilitiesData.map((pa) => ({
          ...pa.ability,
          slot: pa.slot,
          isHidden: pa.isHidden,
        })),
      });
    }

    const movesData = getPokemonMoves(pokemonId);
    return apiSuccess(movesData.map((pm) => pm.move));
  } catch (err) {
    console.error('Failed to fetch pokemon moves:', err);
    return apiError('Failed to fetch moves');
  }
}
