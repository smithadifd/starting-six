import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from '@/lib/utils/api';
import { createPlaythroughSchema, formatZodError } from '@/lib/validations';
import { getPlaythroughs, createPlaythrough } from '@/lib/db/queries';

export async function GET(request: Request) {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  try {
    const runs = getPlaythroughs(userId);
    return apiSuccess(runs);
  } catch (err) {
    console.error('Failed to fetch playthroughs:', err);
    return apiError('Failed to fetch playthroughs');
  }
}

export async function POST(request: Request) {
  let userId: string;
  try {
    userId = await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiValidationError('Invalid JSON body');
  }

  const parsed = createPlaythroughSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(formatZodError(parsed.error));
  }

  try {
    const run = createPlaythrough({ userId, ...parsed.data });
    return apiSuccess(run, { status: 201 });
  } catch (err) {
    console.error('Failed to create playthrough:', err);
    return apiError('Failed to create playthrough');
  }
}
