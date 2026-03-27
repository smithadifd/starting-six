'use client';

import { useState } from 'react';
import { Save, CheckCircle } from 'lucide-react';

interface GeneralSettingsFormProps {
  currentGame: string | null;
  versionGroups: { id: number; name: string }[];
}

export function GeneralSettingsForm({ currentGame, versionGroups }: GeneralSettingsFormProps) {
  const [game, setGame] = useState(currentGame ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: 'current_game', value: game }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl ghost-border bg-card p-6">
        <h3 className="font-semibold mb-1">Preferred Game</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Set your current game to filter the Pokémon browser by default.
        </p>

        <div className="flex gap-3 items-end">
          <div className="flex-1">
            <select
              value={game}
              onChange={(e) => setGame(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">No preference (show all)</option>
              {versionGroups.map((vg) => (
                <option key={vg.id} value={String(vg.id)}>
                  {vg.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-500/90 transition-colors disabled:opacity-50"
          >
            {saved ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
