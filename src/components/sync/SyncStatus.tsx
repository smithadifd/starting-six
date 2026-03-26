'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { SyncProgress } from '@/types';

interface SyncStatusProps {
  onSyncComplete?: () => void;
}

type SyncState = 'idle' | 'syncing' | 'complete' | 'error';

export function SyncStatus({ onSyncComplete }: SyncStatusProps) {
  const [state, setState] = useState<SyncState>('idle');
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{ totalProcessed: number; totalFailed: number } | null>(null);

  const startSync = useCallback(async () => {
    setState('syncing');
    setProgress(null);
    setError(null);
    setSummary(null);

    try {
      const res = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'pokeapi' }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Sync request failed' }));
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Parse SSE events from buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        let eventType = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            let data;
            try { data = JSON.parse(line.slice(6)); } catch { continue; }
            if (eventType === 'progress') {
              setProgress(data as SyncProgress);
            } else if (eventType === 'complete') {
              setSummary({ totalProcessed: data.totalProcessed, totalFailed: data.totalFailed });
              setState('complete');
              onSyncComplete?.();
            } else if (eventType === 'error') {
              setError(data.message);
              setState('error');
            }
          }
        }
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
    }
  }, [onSyncComplete]);

  const progressPercent = progress && progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">PokéAPI Sync</h3>
          <p className="text-sm text-muted-foreground">
            Import Pokémon data from PokéAPI (one-time, ~5-15 min)
          </p>
        </div>
        <button
          onClick={startSync}
          disabled={state === 'syncing'}
          className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-500/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {state === 'syncing' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          {state === 'syncing' ? 'Syncing...' : 'Start Sync'}
        </button>
      </div>

      {/* Progress bar */}
      {state === 'syncing' && progress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Stage {progress.stage}/6: {progress.stageName}
            </span>
            <span className="font-mono text-muted-foreground">
              {progress.processed}/{progress.total}
            </span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-red-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Syncing without progress yet */}
      {state === 'syncing' && !progress && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Starting sync...
        </div>
      )}

      {/* Complete */}
      {state === 'complete' && summary && (
        <div className="flex items-center gap-2 text-sm text-green-400">
          <CheckCircle className="h-4 w-4" />
          Sync complete — {summary.totalProcessed.toLocaleString()} items processed
          {summary.totalFailed > 0 && (
            <span className="text-yellow-400">({summary.totalFailed} failed)</span>
          )}
        </div>
      )}

      {/* Error */}
      {state === 'error' && error && (
        <div className="flex items-center gap-2 text-sm text-red-400">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}
