import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from '@/lib/utils/api';
import { pokemonFiltersSchema, formatZodError } from '@/lib/validations';
import { getPokemon } from '@/lib/db/queries';

export async function GET(request: Request) {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  const { searchParams } = new URL(request.url);
  const parsed = pokemonFiltersSchema.safeParse({
    search: searchParams.get('search') || undefined,
    type: searchParams.get('type') || undefined,
    generation: searchParams.get('generation') || undefined,
    versionGroupId: searchParams.get('versionGroupId') || undefined,
    page: searchParams.get('page') || undefined,
    pageSize: searchParams.get('pageSize') || undefined,
  });

  if (!parsed.success) {
    return apiValidationError(formatZodError(parsed.error));
  }

  try {
    const { search, type, generation, versionGroupId, page, pageSize } = parsed.data;
    const result = getPokemon({
      search,
      typeFilter: type,
      generation,
      versionGroupId,
      page,
      pageSize,
    });

    return apiSuccess(result.pokemon, {
      page,
      pageSize,
      total: result.total,
      totalPages: Math.ceil(result.total / pageSize),
    });
  } catch (err) {
    console.error('Failed to query pokemon:', err);
    return apiError('Failed to fetch Pokémon data');
  }
}
