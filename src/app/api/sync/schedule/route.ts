import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from '@/lib/utils/api';
import { getSyncSchedule, setSyncSchedule } from '@/lib/db/queries';
import { updateSyncScheduleSchema, formatZodError } from '@/lib/validations';

export async function GET(request: Request) {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  try {
    return apiSuccess(getSyncSchedule());
  } catch (err) {
    console.error('Failed to read sync schedule:', err);
    return apiError('Failed to read sync schedule');
  }
}

export async function PUT(request: Request) {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSyncScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(formatZodError(parsed.error));
  }

  try {
    setSyncSchedule(parsed.data.enabled, parsed.data.frequency);
    return apiSuccess(getSyncSchedule());
  } catch (err) {
    console.error('Failed to save sync schedule:', err);
    return apiError('Failed to save sync schedule');
  }
}
