'use client';

import { useState } from 'react';
import { Database, Clock } from 'lucide-react';
import { SyncStatus } from '@/components/sync/SyncStatus';

interface SystemSettingsProps {
  counts: { pokemon: number; moves: number; abilities: number; versionGroups: number };
  recentLogs: {
    id: number;
    source: string;
    status: string;
    itemsProcessed: number | null;
    itemsAttempted: number | null;
    itemsFailed: number | null;
    errorMessage: string | null;
    startedAt: string;
    completedAt: string | null;
  }[];
}

function statusColor(status: string): string {
  switch (status) {
    case 'success': return 'text-green-400';
    case 'partial': return 'text-yellow-400';
    case 'error': return 'text-red-400';
    case 'running': return 'text-blue-400';
    default: return 'text-muted-foreground';
  }
}

export function SystemSettings({ counts: initialCounts, recentLogs }: SystemSettingsProps) {
  const [counts, setCounts] = useState(initialCounts);

  function handleSyncComplete() {
    // Refresh counts after sync completes
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data.checks?.synced) {
          setCounts({
            pokemon: data.checks.synced.pokemon ?? counts.pokemon,
            moves: data.checks.synced.moves ?? counts.moves,
            abilities: data.checks.synced.abilities ?? counts.abilities,
            versionGroups: data.checks.synced.versionGroups ?? counts.versionGroups,
          });
        }
      })
      .catch(() => {});
  }

  return (
    <div className="space-y-6">
      {/* Data Counts */}
      <div className="rounded-xl ghost-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Synced Data</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Pokémon', value: counts.pokemon },
            { label: 'Moves', value: counts.moves },
            { label: 'Abilities', value: counts.abilities },
            { label: 'Games', value: counts.versionGroups },
          ].map((item) => (
            <div key={item.label} className="text-center">
              <p className="text-2xl font-bold">{item.value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Sync trigger */}
      <SyncStatus onSyncComplete={handleSyncComplete} />

      {/* Sync history */}
      {recentLogs.length > 0 && (
        <div className="rounded-xl ghost-border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">Sync History</h3>
          </div>
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className={`font-medium ${statusColor(log.status)}`}>
                    {log.status}
                  </span>
                  <span className="text-muted-foreground">
                    {log.itemsProcessed?.toLocaleString() ?? 0} items
                    {(log.itemsFailed ?? 0) > 0 && (
                      <span className="text-yellow-400"> ({log.itemsFailed} failed)</span>
                    )}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground font-mono">
                  {new Date(log.startedAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
