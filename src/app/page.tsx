import Link from 'next/link';
import { BookOpen, Swords, Plus } from 'lucide-react';
import { requireUserId } from '@/lib/auth-helpers';
import { getDb } from '@/lib/db';
import { playthroughs, versionGroups } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    redirect('/login');
  }

  const db = getDb();
  const runs = db
    .select({
      id: playthroughs.id,
      name: playthroughs.name,
      isCompleted: playthroughs.isCompleted,
      createdAt: playthroughs.createdAt,
      gameName: versionGroups.name,
    })
    .from(playthroughs)
    .leftJoin(versionGroups, eq(playthroughs.versionGroupId, versionGroups.id))
    .where(eq(playthroughs.userId, userId))
    .orderBy(desc(playthroughs.createdAt))
    .all();

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Playthroughs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Build and analyze your team for each game run
          </p>
        </div>
        <Link
          href="/playthroughs/new"
          className="flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-500/90 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Run
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-lg font-semibold mb-2">No playthroughs yet</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Start a new run to build your first team.
          </p>
          <Link
            href="/playthroughs/new"
            className="inline-flex items-center gap-2 rounded-md bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-500/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create First Run
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {runs.map((run) => (
            <Link
              key={run.id}
              href={`/playthroughs/${run.id}`}
              className="rounded-lg border border-border bg-card p-4 hover:border-red-400/50 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <BookOpen className="h-5 w-5 text-red-400" />
                {run.isCompleted && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                    Completed
                  </span>
                )}
              </div>
              <h3 className="font-semibold group-hover:text-red-400 transition-colors">
                {run.name}
              </h3>
              {run.gameName && (
                <p className="text-sm text-muted-foreground mt-1">{run.gameName}</p>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(run.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}