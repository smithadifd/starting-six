import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth-helpers';
import { getSetting, getVersionGroups } from '@/lib/db/queries';
import { GeneralSettingsForm } from './GeneralSettingsForm';

export const dynamic = 'force-dynamic';

export default async function GeneralSettingsPage() {
  try {
    await requireUserId();
  } catch {
    redirect('/login');
  }

  const currentGame = getSetting('current_game');
  const versionGroups = getVersionGroups();

  return (
    <GeneralSettingsForm
      currentGame={currentGame}
      versionGroups={versionGroups.map((vg) => ({ id: vg.id, name: vg.name }))}
    />
  );
}
