import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Swords, Plus } from 'lucide-react';
import { requireUserId } from '@/lib/auth-helpers';
import { getPlaythroughs, getTeamMembers } from '@/lib/db/queries';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    redirect('/login');
  }

  const runs = getPlaythroughs(userId);

  // Fetch team sprites for each run (lightweight — just need sprites)
  const runTeams = new Map<number, Array<{ name: string; sprite: string | null }>>();
  for (const run of runs) {
    const team = getTeamMembers(run.id);
    runTeams.set(
      run.id,
      team.map((m) => ({ name: m.pokemon.name, sprite: m.pokemon.spriteDefault }))
    );
  }

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
          {runs.map((run) => {
            const team = runTeams.get(run.id) ?? [];
            return (
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

                {/* Team sprite row */}
                {team.length > 0 && (
                  <div className="flex items-center gap-0.5 mt-3 -ml-0.5">
                    {team.map((member, i) => (
                      <div key={i} className="relative w-8 h-8 shrink-0">
                        {member.sprite ? (
                          <Image
                            src={member.sprite}
                            alt={member.name}
                            fill
                            sizes="32px"
                            className="object-contain pixelated"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full rounded bg-secondary flex items-center justify-center text-[8px] text-muted-foreground">
                            ?
                          </div>
                        )}
                      </div>
                    ))}
                    {team.length < 6 && (
                      <span className="text-[10px] text-muted-foreground ml-1">
                        +{6 - team.length}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(run.createdAt).toLocaleDateString()}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
