import { auth } from './auth';
import { headers } from 'next/headers';

export async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function requireUserId(): Promise<string> {
  const session = await getSession();
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }
  return session.user.id;
}

export async function requireUserIdFromRequest(request: Request): Promise<string> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });
  if (!session?.user?.id) {
    throw new Error('Authentication required');
  }
  return session.user.id;
}