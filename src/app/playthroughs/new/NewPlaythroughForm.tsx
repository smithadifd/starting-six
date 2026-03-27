'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface VersionGroup {
  id: number;
  name: string;
  generation: number;
}

interface NewPlaythroughFormProps {
  versionGroups: VersionGroup[];
}

export function NewPlaythroughForm({ versionGroups }: NewPlaythroughFormProps) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [versionGroupId, setVersionGroupId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !versionGroupId) return;

    setSaving(true);
    setError('');

    try {
      const res = await fetch('/api/playthroughs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          versionGroupId: parseInt(versionGroupId, 10),
          notes: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || 'Failed to create playthrough');
      }

      const json = await res.json();
      router.push(`/playthroughs/${json.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setSaving(false);
    }
  }, [name, versionGroupId, notes, router]);

  // Group by generation
  const grouped = new Map<number, VersionGroup[]>();
  for (const vg of versionGroups) {
    const list = grouped.get(vg.generation) ?? [];
    list.push(vg);
    grouped.set(vg.generation, list);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium mb-1.5">
          Run Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Nuzlocke #3, First Playthrough"
          maxLength={100}
          required
          className="w-full rounded-xl border border-white/[0.08] bg-surface-bright px-3 py-2.5 text-sm font-body placeholder:text-muted-dim focus:outline-none focus:ring-2 focus:ring-red-500/50"
        />
      </div>

      <div>
        <label htmlFor="game" className="block text-sm font-medium mb-1.5">
          Game
        </label>
        <select
          id="game"
          value={versionGroupId}
          onChange={(e) => setVersionGroupId(e.target.value)}
          required
          className="w-full rounded-xl border border-white/[0.08] bg-surface-bright px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-red-500/50"
        >
          <option value="">Select a game...</option>
          {Array.from(grouped.entries())
            .sort(([a], [b]) => b - a)
            .map(([gen, games]) => (
              <optgroup key={gen} label={`Generation ${gen}`}>
                {games.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-1.5">
          Notes <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any rules, goals, or notes for this run..."
          maxLength={500}
          rows={3}
          className="w-full rounded-xl border border-white/[0.08] bg-surface-bright px-3 py-2.5 text-sm font-body placeholder:text-muted-dim focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={saving || !name.trim() || !versionGroupId}
        className="flex items-center justify-center gap-2 w-full rounded-xl bg-red-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saving ? 'Creating...' : 'Create Playthrough'}
      </button>
    </form>
  );
}
