import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { apiSuccess, apiError, apiUnauthorized, apiNotFound, apiValidationError } from '@/lib/utils/api';
import { updateTeamMemberSchema, benchTeamMemberSchema, activateTeamMemberSchema, formatZodError } from '@/lib/validations';
import { getPlaythrough, updateTeamMember, removeTeamMember, getTeamMembers, benchTeamMember, activateTeamMember, getNextTeamSlot } from '@/lib/db/queries';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  const { id, memberId } = await params;
  const playthroughId = parseInt(id, 10);
  const teamMemberId = parseInt(memberId, 10);
  if (isNaN(playthroughId) || isNaN(teamMemberId)) {
    return apiValidationError('Invalid ID');
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiValidationError('Invalid JSON body');
  }

  // Check if this is a bench/activate action
  const benchParsed = benchTeamMemberSchema.safeParse(body);
  if (benchParsed.success) {
    try {
      const run = getPlaythrough(playthroughId, userId);
      if (!run) return apiNotFound('Playthrough');
      const team = getTeamMembers(playthroughId);
      const member = team.find((m) => m.id === teamMemberId);
      if (!member) return apiNotFound('Team member');
      benchTeamMember(teamMemberId, playthroughId);
      return apiSuccess({ benched: true });
    } catch (err) {
      console.error('Failed to bench team member:', err);
      return apiError('Failed to bench team member');
    }
  }

  const activateParsed = activateTeamMemberSchema.safeParse(body);
  if (activateParsed.success) {
    try {
      const run = getPlaythrough(playthroughId, userId);
      if (!run) return apiNotFound('Playthrough');
      const team = getTeamMembers(playthroughId);
      const member = team.find((m) => m.id === teamMemberId);
      if (!member) return apiNotFound('Team member');
      const slot = activateParsed.data.slot ?? getNextTeamSlot(playthroughId);
      if (slot === null) return apiValidationError('No available active slots');
      activateTeamMember(teamMemberId, playthroughId, slot);
      return apiSuccess({ activated: true, slot });
    } catch (err) {
      console.error('Failed to activate team member:', err);
      return apiError('Failed to activate team member');
    }
  }

  const parsed = updateTeamMemberSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(formatZodError(parsed.error));
  }

  try {
    const run = getPlaythrough(playthroughId, userId);
    if (!run) return apiNotFound('Playthrough');

    // Verify team member belongs to this playthrough
    const team = getTeamMembers(playthroughId);
    const member = team.find((m) => m.id === teamMemberId);
    if (!member) return apiNotFound('Team member');

    const updated = updateTeamMember(teamMemberId, parsed.data);
    return apiSuccess(updated);
  } catch (err) {
    console.error('Failed to update team member:', err);
    return apiError('Failed to update team member');
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  const { id, memberId } = await params;
  const playthroughId = parseInt(id, 10);
  const teamMemberId = parseInt(memberId, 10);
  if (isNaN(playthroughId) || isNaN(teamMemberId)) {
    return apiValidationError('Invalid ID');
  }

  try {
    const run = getPlaythrough(playthroughId, userId);
    if (!run) return apiNotFound('Playthrough');

    const team = getTeamMembers(playthroughId);
    const member = team.find((m) => m.id === teamMemberId);
    if (!member) return apiNotFound('Team member');

    removeTeamMember(teamMemberId);
    return apiSuccess({ deleted: true });
  } catch (err) {
    console.error('Failed to remove team member:', err);
    return apiError('Failed to remove team member');
  }
}
