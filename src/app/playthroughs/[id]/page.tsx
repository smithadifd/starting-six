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
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Playthroughs
      </Link>

      {/* Header */}
      <div className="rounded-lg border border-border bg-card p-5 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold truncate">{run.name}</h1>
              {run.isCompleted && (
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 shrink-0">
                  <CheckCircle2 className="h-3 w-3" />
                  Completed
                </span>
              )}
            </div>
            {run.gameName && (
              <p className="text-sm text-muted-foreground mt-1">{run.gameName}</p>
            )}
            {run.notes && (
              <p className="text-sm text-muted-foreground mt-2 whitespace-pre-line">{run.notes}</p>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              Created {new Date(run.createdAt).toLocaleDateString()}
            </p>
          </div>

          <PlaythroughActions playthroughId={playthroughId} isCompleted={run.isCompleted} currentName={run.name} currentNotes={run.notes} />
        </div>
      </div>

      {/* Team Section */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold">
            Team
            <span className="text-sm font-normal text-muted-foreground ml-2">
              {team.length}/6
            </span>
          </h2>
          {team.length > 0 && <TeamExport team={team} playthroughName={run.name} />}
        </div>

        <TeamGrid
          playthroughId={playthroughId}
          versionGroupId={run.versionGroupId}
          initialTeam={team}
        />
      </div>

      {/* Analysis Section */}
      <div className="mb-6">
        <TeamAnalysis playthroughId={playthroughId} teamSize={team.length} />
      </div>
    </div>
  );
}
