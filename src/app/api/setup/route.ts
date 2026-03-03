import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { setupSchema } from '@/lib/validations';
import { apiSuccess, apiError, apiValidationError } from '@/lib/utils/api';

export async function POST(request: NextRequest) {
  try {
    const db = getDb();
    const row = db.select({ count: sql<number>`count(*)` }).from(user).get();
    if ((row?.count ?? 0) > 0) {
      return apiError('Setup already completed. Please sign in.', 403);
    }

    const body = await request.json();
    const parsed = setupSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Invalid input';
      return apiValidationError(firstError);
    }

    const result = await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
      },
      headers: request.headers,
    });

    if (!result?.user?.id) {
      return apiError('Failed to create account');
    }

    return apiSuccess({ message: 'Account created successfully' });
  } catch (error) {
    console.error('[POST /api/setup]', error);
    return apiError('Failed to create account');
  }
}