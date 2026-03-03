import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiValidationError } from '@/lib/utils/api';
import { updatePlaythroughSchema, formatZodError } from '@/lib/validations';
import { getPlaythrough, updatePlaythrough, deletePlaythrough, getTeamMembers } from '@/lib/db/queries';

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
    return apiSuccess({ ...run, team });
  } catch (err) {
    console.error('Failed to fetch playthrough:', err);
    return apiError('Failed to fetch playthrough');
  }
}

export async function PATCH(
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

  const parsed = updatePlaythroughSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(formatZodError(parsed.error));
  }

  try {
    const run = updatePlaythrough(playthroughId, userId, parsed.data);
    if (!run) return apiNotFound('Playthrough');
    return apiSuccess(run);
  } catch (err) {
    console.error('Failed to update playthrough:', err);
    return apiError('Failed to update playthrough');
  }
}

export async function DELETE(
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
    const existing = getPlaythrough(playthroughId, userId);
    if (!existing) return apiNotFound('Playthrough');

    deletePlaythrough(playthroughId, userId);
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error('Failed to delete playthrough:', err);
    return apiError('Failed to delete playthrough');
  }
}
