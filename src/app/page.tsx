import Link from 'next/link';
import Image from 'next/image';
import { BookOpen, Plus, Gamepad2 } from 'lucide-react';
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
    const team = getTeamMembers(run.id, 'active');
    runTeams.set(
      run.id,
      team.map((m) => ({ name: m.pokemon.name, sprite: m.pokemon.spriteDefault }))
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-end justify-between mb-10">
        <div>
          <h1 className="text-4xl md:text-5xl font-headline font-extrabold tracking-tighter">
            My Playthroughs
          </h1>
          <p className="text-base text-muted-foreground mt-2 font-body">
            Build and analyze your team for each game run
          </p>
        </div>
        <Link
          href="/playthroughs/new"
          className="flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-headline font-bold text-white hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]"
        >
          <Plus className="h-4 w-4" />
          New Run
        </Link>
      </div>

      {runs.length === 0 ? (
        <div className="rounded-2xl ghost-border bg-card p-16 text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-red-500/[0.04] blur-3xl" />
          <div className="relative">
            <div className="w-20 h-20 rounded-full bg-surface-bright mx-auto mb-6 flex items-center justify-center">
              <Gamepad2 className="h-10 w-10 text-muted-dim" />
            </div>
            <h2 className="text-2xl font-headline font-extrabold mb-3">No playthroughs yet</h2>
            <p className="text-muted-foreground mb-8 font-body max-w-sm mx-auto">
              Create your first run, pick your team, and see how your type coverage stacks up before you even start the game.
            </p>
            <Link
              href="/playthroughs/new"
              className="inline-flex items-center gap-2 rounded-full bg-red-500 px-6 py-3 text-sm font-headline font-bold text-white hover:bg-red-600 transition-all shadow-[0_0_20px_rgba(239,68,68,0.3)]"
            >
              <Plus className="h-4 w-4" />
              Create First Run
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {runs.map((run) => {
            const team = runTeams.get(run.id) ?? [];
            return (
              <Link
                key={run.id}
                href={`/playthroughs/${run.id}`}
                className="rounded-2xl ghost-border bg-card p-5 hover:bg-surface-high transition-all group type-glow"
                style={{ '--glow-color': 'rgba(239, 68, 68, 0.12)' } as React.CSSProperties}
              >
                <div className="flex items-start justify-between mb-3">
                  <BookOpen className="h-5 w-5 text-red-500" />
                  {run.isCompleted && (
                    <span className="text-xs font-label px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20">
                      Completed
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-headline font-extrabold group-hover:text-white transition-colors">
                  {run.name}
                </h3>
                {run.gameName && (
                  <p className="text-sm text-muted-foreground mt-1 font-body">{run.gameName}</p>
                )}

                {/* Team sprite row */}
                {team.length > 0 && (
                  <div className="flex items-center gap-0.5 mt-4 -ml-0.5">
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
                          <div className="w-full h-full rounded-lg bg-surface-bright flex items-center justify-center text-[8px] text-muted-dim">
                            ?
                          </div>
                        )}
                      </div>
                    ))}
                    {team.length < 6 && (
                      <span className="text-[10px] text-muted-dim font-label ml-1">
                        +{6 - team.length}
                      </span>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-dim font-label mt-3">
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
