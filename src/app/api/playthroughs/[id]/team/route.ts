import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiValidationError } from '@/lib/utils/api';
import { addTeamMemberSchema, formatZodError } from '@/lib/validations';
import {
  getPlaythrough,
  getTeamMembers,
  addTeamMember,
  getNextTeamSlot,
  getPokemonById,
} from '@/lib/db/queries';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  const { id } = await params;
  const playthroughId = parseInt(id, 10);
  if (isNaN(playthroughId)) return apiValidationError('Invalid playthrough ID');

  try {
    const run = getPlaythrough(playthroughId, userId);
    if (!run) return apiNotFound('Playthrough');

    const team = getTeamMembers(playthroughId);
    return apiSuccess(team);
  } catch (err) {
    console.error('Failed to fetch team:', err);
    return apiError('Failed to fetch team');
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  const { id } = await params;
  const playthroughId = parseInt(id, 10);
  if (isNaN(playthroughId)) return apiValidationError('Invalid playthrough ID');

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiValidationError('Invalid JSON body');
  }

  const parsed = addTeamMemberSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(formatZodError(parsed.error));
  }

  try {
    const run = getPlaythrough(playthroughId, userId);
    if (!run) return apiNotFound('Playthrough');

    // Verify pokemon exists
    const poke = getPokemonById(parsed.data.pokemonId);
    if (!poke) return apiValidationError('Pokemon not found');

    // Find next available active slot, or bench if full
    const slot = getNextTeamSlot(playthroughId);

    const member = addTeamMember({
      playthroughId,
      slot,
      pokemonId: parsed.data.pokemonId,
      nickname: parsed.data.nickname,
      abilityId: parsed.data.abilityId,
      teraType: parsed.data.teraType,
    });

    return apiSuccess({ ...member, benched: slot === null });
  } catch (err) {
    console.error('Failed to add team member:', err);
    return apiError('Failed to add team member');
  }
}
