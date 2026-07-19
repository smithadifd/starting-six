'use client';

import { useState } from 'react';
import { CalendarClock, CheckCircle } from 'lucide-react';

type SyncFrequency = 'weekly' | 'monthly';

interface ScheduleSettingsProps {
  initial: {
    enabled: boolean;
    frequency: SyncFrequency;
    lastAttemptAt: string | null;
    lastAttemptStatus: 'success' | 'failure' | null;
  };
}

export function ScheduleSettings({ initial }: ScheduleSettingsProps) {
  const [enabled, setEnabled] = useState(initial.enabled);
  const [frequency, setFrequency] = useState<SyncFrequency>(initial.frequency);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save(nextEnabled: boolean, nextFrequency: SyncFrequency) {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/sync/schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextEnabled, frequency: nextFrequency }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function handleToggle() {
    const next = !enabled;
    setEnabled(next);
    void save(next, frequency);
  }

  function handleFrequencyChange(next: SyncFrequency) {
    setFrequency(next);
    if (enabled) void save(enabled, next);
  }

  return (
    <div className="rounded-xl ghost-border bg-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <CalendarClock className="h-5 w-5 text-muted-foreground" />
        <h3 className="font-semibold">Scheduled Re-sync</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Automatically refresh PokéAPI data in the background — useful when a new game or DLC adds
        Pokémon. Off by default. Existing Pokémon, moves, and abilities are updated in place;
        nothing is ever deleted.
      </p>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <label className="flex items-center gap-3 text-sm font-medium cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={handleToggle}
            disabled={saving}
            className="h-4 w-4 rounded border-input accent-red-500"
          />
          Enable scheduled re-sync
        </label>

        <select
          value={frequency}
          onChange={(e) => handleFrequencyChange(e.target.value as SyncFrequency)}
          disabled={!enabled || saving}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-green-400 mt-3">
          <CheckCircle className="h-4 w-4" />
          Saved
        </div>
      )}

      {initial.lastAttemptAt && (
        <p className="text-xs text-muted-foreground mt-3">
          Last scheduled attempt: {new Date(initial.lastAttemptAt).toLocaleString()}
          {initial.lastAttemptStatus === 'failure' && (
            <span className="text-yellow-400"> (failed, will retry)</span>
          )}
        </p>
      )}
    </div>
  );
}
