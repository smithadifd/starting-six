import { redirect } from 'next/navigation';
import { requireUserId } from '@/lib/auth-helpers';
import { getSyncCounts, getRecentSyncLogs } from '@/lib/db/queries';
import { SystemSettings } from './SystemSettings';

export const dynamic = 'force-dynamic';

export default async function SystemSettingsPage() {
  try {
    await requireUserId();
  } catch {
    redirect('/login');
  }

  const counts = getSyncCounts();
  const recentLogs = getRecentSyncLogs(10);

  return <SystemSettings counts={counts} recentLogs={recentLogs} />;
}
