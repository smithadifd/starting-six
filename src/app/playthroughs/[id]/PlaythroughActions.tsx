'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, CheckCircle2, RotateCcw, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface PlaythroughActionsProps {
  playthroughId: number;
  isCompleted: boolean;
  currentName: string;
  currentNotes: string | null;
}

export function PlaythroughActions({ playthroughId, isCompleted, currentName, currentNotes }: PlaythroughActionsProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [name, setName] = useState(currentName);
  const [notes, setNotes] = useState(currentNotes ?? '');

  const toggleComplete = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/playthroughs/${playthroughId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      });
      if (!res.ok) throw new Error('Failed to update');
      toast.success(isCompleted ? 'Marked as in progress' : 'Marked as completed');
      router.refresh();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  }, [playthroughId, isCompleted, router]);

  const handleDelete = useCallback(async () => {
    if (!confirm('Delete this playthrough and its entire team?')) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/playthroughs/${playthroughId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      router.push('/');
    } catch {
      toast.error('Failed to delete');
      setSaving(false);
    }
  }, [playthroughId, router]);

  const openEdit = useCallback(() => {
    setName(currentName);
    setNotes(currentNotes ?? '');
    setEditOpen(true);
  }, [currentName, currentNotes]);

  const handleEdit = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/playthroughs/${playthroughId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setEditOpen(false);
      toast.success('Playthrough updated');
      router.refresh();
    } catch {
      toast.error('Failed to update');
    } finally {
      setSaving(false);
    }
  }, [playthroughId, name, notes, router]);

  return (
    <div className="flex items-center gap-2 shrink-0">
      <button
        onClick={toggleComplete}
        disabled={saving}
        className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border transition-colors ${
          isCompleted
            ? 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
            : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
        } disabled:opacity-50`}
        title={isCompleted ? 'Mark as in progress' : 'Mark as completed'}
      >
        {saving ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isCompleted ? (
          <RotateCcw className="h-3.5 w-3.5" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5" />
        )}
        {isCompleted ? 'Reopen' : 'Complete'}
      </button>

      <button
        onClick={openEdit}
        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        title="Edit"
      >
        <Pencil className="h-4 w-4" />
      </button>

      <button
        onClick={handleDelete}
        disabled={saving}
        className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
        title="Delete"
      >
        <Trash2 className="h-4 w-4" />
      </button>

      {/* Inline edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditOpen(false)} />
          <div className="relative w-full max-w-sm mx-4 rounded-lg border border-border bg-card p-6 shadow-xl">
            <h3 className="font-semibold mb-4">Edit Playthrough</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Run name"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditOpen(false)}
                  className="flex-1 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEdit}
                  disabled={saving || !name.trim()}
                  className="flex-1 rounded-xl bg-red-500 px-3 py-2 text-sm text-white hover:bg-red-500/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
