import { redirect } from 'next/navigation';
import { Swords } from 'lucide-react';
import { getDb } from '@/lib/db';
import { user } from '@/lib/db/schema';
import { sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth-helpers';
import { LoginForm } from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  try {
    const db = getDb();
    const row = db.select({ count: sql<number>`count(*)` }).from(user).get();
    if ((row?.count ?? 0) === 0) redirect('/setup');
  } catch {
    // DB not initialized
  }

  try {
    const session = await getSession();
    if (session?.user) redirect('/');
  } catch {
    // Not signed in
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="rounded-xl ghost-border bg-card p-6 shadow-lg">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Swords className="h-8 w-8 text-red-400" />
            <span className="text-2xl font-bold">Starting Six</span>
          </div>
          <div className="text-center mb-6">
            <h1 className="text-lg font-semibold">Sign In</h1>
            <p className="text-sm text-muted-foreground mt-1">Sign in to access your runs</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}