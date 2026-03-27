import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Trophy } from 'lucide-react';
import { requireUserId } from '@/lib/auth-helpers';
import { getPlaythrough, getTeamMembers } from '@/lib/db/queries';
import { TeamGrid } from '@/components/team/TeamGrid';
import { TeamAnalysis } from '@/components/team/TeamAnalysis';
import { TeamExport } from '@/components/team/TeamExport';
import { PlaythroughActions } from './PlaythroughActions';

export const dynamic = 'force-dynamic';

export default async function PlaythroughPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let userId: string;
  try {
    userId = await requireUserId();
  } catch {
    redirect('/login');
  }

  const playthroughId = parseInt(id, 10);
  if (isNaN(playthroughId)) notFound();

  const run = getPlaythrough(playthroughId, userId);
  if (!run) notFound();

  const team = getTeamMembers(playthroughId);

  return (
    <div className="max-w-5xl mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 font-label"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Playthroughs
      </Link>

      {/* Header */}
      <div className="rounded-2xl ghost-border bg-card p-6 mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full bg-red-500/[0.03] blur-3xl" />
        <div className="flex items-start justify-between gap-4 relative">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-headline font-extrabold tracking-tighter truncate">{run.name}</h1>
              {run.isCompleted && (
                <span className="flex items-center gap-1 text-xs font-label px-2.5 py-0.5 rounded-full bg-green-500/15 text-green-400 border border-green-500/20 shrink-0">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </span>
              )}
            </div>
            {run.gameName && (
              <p className="text-sm text-muted-foreground mt-1 font-body">{run.gameName}</p>
            )}
            {run.notes && (
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line font-body">{run.notes}</p>
            )}
            <p className="text-xs text-muted-dim font-label mt-2">
              Created {new Date(run.createdAt).toLocaleDateString()}
            </p>
          </div>

          <PlaythroughActions playthroughId={playthroughId} isCompleted={run.isCompleted} currentName={run.name} currentNotes={run.notes} />
        </div>
      </div>

      {/* Team Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-5">
          <Trophy className="h-5 w-5 text-red-500" />
          <h2 className="text-xl font-headline font-extrabold">
            Adventure Team
          </h2>
          <span className="font-label text-red-500 bg-red-500/10 px-3 py-0.5 rounded-full text-sm tracking-wider">
            {team.length}/6
          </span>
          {team.length > 0 && <TeamExport team={team} playthroughName={run.name} />}
        </div>

        {/* Team slots progress bar */}
        <div className="h-1 bg-surface-bright rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-red-500 rounded-full transition-all"
            style={{
              width: `${(team.length / 6) * 100}%`,
              boxShadow: '0 0 10px rgba(239,68,68,0.5)',
            }}
          />
        </div>

        <TeamGrid
          playthroughId={playthroughId}
          versionGroupId={run.versionGroupId}
          initialTeam={team}
        />
      </div>

      {/* Analysis Section */}
      <div className="mb-8">
        <TeamAnalysis playthroughId={playthroughId} teamSize={team.length} />
      </div>
    </div>
  );
}
