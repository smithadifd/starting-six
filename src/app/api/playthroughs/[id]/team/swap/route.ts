import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiValidationError } from '@/lib/utils/api';
import { swapTeamMemberSchema, formatZodError } from '@/lib/validations';
import { getPlaythrough, swapTeamMember } from '@/lib/db/queries';

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

  const parsed = swapTeamMemberSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(formatZodError(parsed.error));
  }

  try {
    const run = getPlaythrough(playthroughId, userId);
    if (!run) return apiNotFound('Playthrough');

    swapTeamMember(playthroughId, parsed.data.benchMemberId, parsed.data.activeSlot);
    return apiSuccess({ swapped: true });
  } catch (err) {
    console.error('Failed to swap team member:', err);
    return apiError('Failed to swap team member');
  }
}
