import { requireUserIdFromRequest } from '@/lib/auth-helpers';
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from '@/lib/utils/api';
import { getAllSettings, setSetting } from '@/lib/db/queries';
import { z } from 'zod';
import { formatZodError } from '@/lib/validations';

const ALLOWED_KEYS = ['current_game'];

const updateSettingSchema = z.object({
  key: z.enum(ALLOWED_KEYS as [string, ...string[]]),
  value: z.string().max(1000),
});

export async function GET(request: Request) {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  try {
    return apiSuccess(getAllSettings());
  } catch (err) {
    console.error('Failed to read settings:', err);
    return apiError('Failed to read settings');
  }
}

export async function PUT(request: Request) {
  try {
    await requireUserIdFromRequest(request);
  } catch {
    return apiUnauthorized();
  }

  const body = await request.json().catch(() => null);
  const parsed = updateSettingSchema.safeParse(body);
  if (!parsed.success) {
    return apiValidationError(formatZodError(parsed.error));
  }

  try {
    setSetting(parsed.data.key, parsed.data.value);
    return apiSuccess({ key: parsed.data.key, value: parsed.data.value });
  } catch (err) {
    console.error('Failed to save setting:', err);
    return apiError('Failed to save setting');
  }
}
