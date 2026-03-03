import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUserId } from '@/lib/auth-helpers';
import { getVersionGroups } from '@/lib/db/queries';
import { NewPlaythroughForm } from './NewPlaythroughForm';

export const dynamic = 'force-dynamic';

export default async function NewPlaythroughPage() {
  try {
    await requireUserId();
  } catch {
    redirect('/login');
  }

  const versionGroups = getVersionGroups();

  return (
    <div className="max-w-lg mx-auto">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Playthroughs
      </Link>

      <div className="rounded-lg border border-border bg-card p-6">
        <h1 className="text-2xl font-bold mb-6">New Playthrough</h1>
        <NewPlaythroughForm
          versionGroups={versionGroups.map((vg) => ({
            id: vg.id,
            name: vg.name,
            generation: vg.generation,
          }))}
        />
      </div>
    </div>
  );
}
